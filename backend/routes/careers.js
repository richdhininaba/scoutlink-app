'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../db/supabase');
const email = require('../services/email');
const config = require('../config');

const FALLBACK_ADMIN = 'richdhin@stratexanalytics.co.uk';
const FALLBACK_REPORTING_TO = {
  fullName: 'Richdhin Inaba',
  email: FALLBACK_ADMIN,
  jobTitle: 'Founder'
};
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('Please upload a PDF, DOC or DOCX CV under 5MB.'));
    cb(null, true);
  }
});

function brandBase() {
  return email.brandBase ? email.brandBase() : 'https://scoutlink.app';
}

function cleanText(value) {
  return String(value || '').trim();
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
}

function visibleJob(job) {
  if (!job) return false;
  const now = Date.now();
  const status = String(job.status || '').toLowerCase();
  const released = status === 'live' || (status === 'scheduled' && job.release_at && new Date(job.release_at).getTime() <= now);
  const notClosed = !job.closing_at || new Date(job.closing_at).getTime() >= now;
  return released && notClosed;
}

function publicJob(job) {
  return {
    id: job.id,
    slug: job.slug,
    jobTitle: job.job_title,
    department: job.department,
    location: job.location,
    workingType: job.working_type,
    employmentType: job.employment_type,
    contractType: job.contract_type,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salaryUnit: job.salary_unit,
    currency: job.currency,
    compensationType: job.compensation_type,
    compensationNotes: job.compensation_notes,
    positionsAvailable: job.positions_available,
    releaseAt: job.release_at,
    closingAt: job.closing_at,
    aboutCompany: job.about_company,
    roleOverview: job.role_overview,
    responsibilities: job.responsibilities,
    mustHaves: job.must_haves,
    niceToHaves: job.nice_to_haves,
    benefits: job.benefits,
    applicationInstructions: job.application_instructions,
    interviewStageCount: job.interview_stage_count,
    interviewProcess: job.interview_process,
    status: job.status
  };
}

function sourceMetadata(req) {
  const fields = ['source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const meta = { source: 'public_careers' };
  fields.forEach((field) => {
    const value = cleanText(req.body?.[field] || req.query?.[field]);
    if (value) meta[field] = value.slice(0, 200);
  });
  if (!meta.source) meta.source = 'public_careers';
  return meta;
}

function applicationRef() {
  return 'APP-' + new Date().getFullYear() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function salaryRange(job) {
  if (job.salary_unit === 'commission' || job.compensation_type === 'commission_based') return 'Commission';
  if (job.compensation_type === 'unpaid_internship') return 'Unpaid internship';
  const min = job.salary_min ? Number(job.salary_min) : null;
  const max = job.salary_max ? Number(job.salary_max) : null;
  const unit = job.salary_unit || 'annually';
  if (!min && !max) return '';
  const money = (n) => 'GBP ' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
  if (min && max) return money(min) + '-' + money(max) + ' ' + unit;
  return money(min || max) + ' ' + unit;
}

async function loadVisibleJobs() {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .in('status', ['live', 'scheduled'])
    .order('release_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw error;
  return (data || []).filter(visibleJob);
}

async function recipientsForJob(jobId) {
  const { data } = await supabase.from('job_post_notification_recipients').select('email').eq('job_post_id', jobId);
  const emails = (data || []).map(r => cleanText(r.email).toLowerCase()).filter(isEmail);
  return emails.length ? [...new Set(emails)] : [FALLBACK_ADMIN];
}

async function duplicateApplication(jobId, applicantEmail) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id,email')
    .eq('job_post_id', jobId)
    .limit(500);
  if (error) throw error;
  const target = cleanText(applicantEmail).toLowerCase();
  return (data || []).find(row => cleanText(row.email).toLowerCase() === target) || null;
}

async function resolveReportingTo(job) {
  const fallback = { ...FALLBACK_REPORTING_TO };
  if (!job) return fallback;
  if (job.reporting_to_id) {
    const { data } = await supabase
      .from('stratex')
      .select('first_name,last_name,email,job_title,admin_role,role,is_active')
      .eq('id', job.reporting_to_id)
      .maybeSingle();
    if (data && data.is_active !== false) {
      const fullName = [data.first_name, data.last_name].map(cleanText).filter(Boolean).join(' ');
      return {
        fullName: fullName || job.reporting_to_name || fallback.fullName,
        email: isEmail(data.email) ? cleanText(data.email).toLowerCase() : fallback.email,
        jobTitle: cleanText(data.job_title || data.admin_role || data.role) || fallback.jobTitle
      };
    }
  }
  return {
    fullName: cleanText(job.reporting_to_name) || fallback.fullName,
    email: fallback.email,
    jobTitle: fallback.jobTitle
  };
}

function nextInterviewSlots(sentAt) {
  const start = sentAt ? new Date(sentAt) : new Date();
  if (Number.isNaN(start.getTime())) start.setTime(Date.now());
  const now = new Date();
  const begin = start > now ? start : now;
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const slots = [];
  const hours = [9, 10.5, 12, 14, 15.5, 17];
  const day = new Date(begin);
  day.setHours(0, 0, 0, 0);
  while (day <= end) {
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) {
      hours.forEach((value) => {
        const slot = new Date(day);
        const hour = Math.floor(value);
        const minute = value % 1 ? 30 : 0;
        slot.setHours(hour, minute, 0, 0);
        if (slot > begin && slot <= end) {
          slots.push({
            start: slot.toISOString(),
            end: new Date(slot.getTime() + 30 * 60 * 1000).toISOString(),
            label: slot.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          });
        }
      });
    }
    day.setDate(day.getDate() + 1);
  }
  return slots;
}

async function loadAvailabilityToken(rawToken) {
  const hash = tokenHash(rawToken);
  const { data: token, error } = await supabase
    .from('job_interview_availability_tokens')
    .select('*, job_applications(*, job_posts(*))')
    .eq('token_hash', hash)
    .maybeSingle();
  if (error) throw error;
  if (!token) return null;
  if (new Date(token.expires_at).getTime() < Date.now()) return null;
  return token;
}

router.get('/', async (req, res) => {
  try {
    const jobs = await loadVisibleJobs();
    res.json({ data: jobs.map(publicJob) });
  } catch (err) {
    console.error('[Careers list]', err);
    res.status(500).json({ error: 'Could not load careers.' });
  }
});

router.get('/interview-availability', async (req, res) => {
  try {
    if (!config.supabase.serviceRoleKey) {
      return res.status(503).json({ error: 'Interview availability is temporarily unavailable. Please contact ScoutLink support.' });
    }
    const tokenValue = cleanText(req.query.token);
    if (!tokenValue) return res.status(400).json({ error: 'Availability link is missing a token.' });
    const token = await loadAvailabilityToken(tokenValue);
    if (!token) return res.status(404).json({ error: 'This availability link is invalid or has expired.' });
    const application = token.job_applications;
    const job = application?.job_posts || {};
    const { data: existingSlots } = await supabase
      .from('job_interview_availability_slots')
      .select('slot_start,slot_end,submitted_at')
      .eq('token_id', token.id)
      .order('slot_start', { ascending: true });
    res.json({
      data: {
        candidateName: [application?.first_name, application?.last_name].map(cleanText).filter(Boolean).join(' '),
        firstName: application?.first_name || '',
        jobTitle: job.job_title || '',
        applicationRef: application?.application_ref || '',
        sentAt: token.sent_at,
        expiresAt: token.expires_at,
        alreadySubmitted: !!token.used_at,
        submittedAt: token.used_at || null,
        slots: nextInterviewSlots(token.sent_at),
        selectedSlots: (existingSlots || []).map(s => ({
          start: s.slot_start,
          end: s.slot_end,
          submittedAt: s.submitted_at
        }))
      }
    });
  } catch (err) {
    console.error('[Careers availability get]', err);
    res.status(500).json({ error: 'Could not load interview availability.' });
  }
});

router.post('/interview-availability', async (req, res) => {
  try {
    if (!config.supabase.serviceRoleKey) {
      return res.status(503).json({ error: 'Interview availability is temporarily unavailable. Please contact ScoutLink support.' });
    }
    const tokenValue = cleanText(req.body.token);
    const requestedSlots = Array.isArray(req.body.slots) ? req.body.slots : [];
    if (!tokenValue) return res.status(400).json({ error: 'Availability link is missing a token.' });
    if (!requestedSlots.length) return res.status(400).json({ error: 'Please select at least one interview slot.' });
    const token = await loadAvailabilityToken(tokenValue);
    if (!token) return res.status(404).json({ error: 'This availability link is invalid or has expired.' });
    const allowed = new Set(nextInterviewSlots(token.sent_at).map(s => s.start));
    const cleanSlots = [...new Set(requestedSlots.map(cleanText))].filter(slot => allowed.has(slot));
    if (!cleanSlots.length) return res.status(400).json({ error: 'Please choose times from the available two-week window.' });
    const rows = cleanSlots.map(slot => ({
      application_id: token.application_id,
      token_id: token.id,
      slot_start: slot,
      slot_end: new Date(new Date(slot).getTime() + 30 * 60 * 1000).toISOString()
    }));
    await supabase.from('job_interview_availability_slots').delete().eq('token_id', token.id);
    const { error: slotErr } = await supabase.from('job_interview_availability_slots').insert(rows);
    if (slotErr) throw slotErr;
    const submittedAt = new Date().toISOString();
    const { error: tokenErr } = await supabase
      .from('job_interview_availability_tokens')
      .update({ used_at: submittedAt })
      .eq('id', token.id);
    if (tokenErr) throw tokenErr;
    const { error: appErr } = await supabase
      .from('job_applications')
      .update({ availability_submitted_at: submittedAt })
      .eq('id', token.application_id);
    if (appErr) throw appErr;

    const application = token.job_applications;
    const job = application?.job_posts || {};
    const reportingTo = await resolveReportingTo(job);
    const recipients = [...new Set([reportingTo.email, FALLBACK_ADMIN].map(v => cleanText(v).toLowerCase()).filter(isEmail))];
    const applicationUrl = brandBase() + '/stratex/hiring?applicationId=' + encodeURIComponent(application.id);
    const emailResult = await email.sendInterviewAvailabilitySubmittedAdminEmail({
      to: recipients,
      applicantName: [application.first_name, application.last_name].map(cleanText).filter(Boolean).join(' '),
      applicantEmail: application.email,
      jobTitle: job.job_title,
      applicationRef: application.application_ref,
      slots: cleanSlots,
      applicationUrl,
      reportingToFullName: reportingTo.fullName,
      submittedAt: email.prettyDate ? email.prettyDate(submittedAt) : submittedAt
    });
    if (!emailResult.success) {
      console.error('[Careers availability email]', emailResult.error || emailResult);
    }
    res.json({
      message: 'Availability submitted successfully.',
      emailStatus: emailResult.success ? 'sent' : 'pending'
    });
  } catch (err) {
    console.error('[Careers availability post]', err);
    res.status(500).json({ error: 'Could not submit interview availability.' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { data: job, error } = await supabase.from('job_posts').select('*').eq('slug', req.params.slug).maybeSingle();
    if (error) throw error;
    if (!job) return res.status(404).json({ error: 'Role not found.' });
    if (!visibleJob(job)) return res.status(404).json({ error: 'This role is no longer available.' });
    res.json({ data: publicJob(job) });
  } catch (err) {
    console.error('[Careers detail]', err);
    res.status(500).json({ error: 'Could not load this job.' });
  }
});

function cvUpload(req, res, next) {
  upload.single('cv')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Could not upload CV.' });
    next();
  });
}

router.post('/:slug/apply', cvUpload, async (req, res) => {
  let insertedApplication = null;
  let filePath = null;
  let shouldRollback = true;
  try {
    const { data: job, error } = await supabase.from('job_posts').select('*').eq('slug', req.params.slug).maybeSingle();
    if (error || !visibleJob(job)) return res.status(404).json({ error: 'Job not found.' });
    const firstName = cleanText(req.body.firstName);
    const lastName = cleanText(req.body.lastName);
    const applicantEmail = cleanText(req.body.email).toLowerCase();
    const phone = cleanText(req.body.phone);
    if (!firstName || !lastName || !isEmail(applicantEmail) || !phone) {
      return res.status(400).json({ error: 'First name, last name, valid email and phone number are required.' });
    }
    if (!req.file) return res.status(400).json({ error: 'CV upload is required.' });
    const originalExt = (path.extname(req.file.originalname || '') || '').toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(originalExt)) {
      return res.status(400).json({ error: 'Please upload a PDF, DOC or DOCX CV under 5MB.' });
    }
    if (!config.supabase.serviceRoleKey) {
      return res.status(503).json({
        error: 'CV uploads are temporarily unavailable. Please contact ScoutLink support.'
      });
    }
    const duplicate = await duplicateApplication(job.id, applicantEmail);
    if (duplicate) {
      return res.status(409).json({ error: 'You have already applied for this role.' });
    }

    const ref = applicationRef();
    const { data: app, error: appErr } = await supabase.from('job_applications').insert({
      application_ref: ref,
      job_post_id: job.id,
      first_name: firstName,
      last_name: lastName,
      email: applicantEmail,
      phone,
      metadata: sourceMetadata(req)
    }).select().single();
    if (appErr) throw appErr;
    insertedApplication = app;

    const ext = originalExt.replace(/[^a-z0-9.]/g, '') || '.pdf';
    filePath = [job.id, app.id, Date.now() + '-' + crypto.randomUUID() + ext].join('/');
    await supabase.storage.createBucket('job-cvs', {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: Array.from(ALLOWED_MIME)
    }).catch(() => {});

    const { error: uploadErr } = await supabase.storage.from('job-cvs').upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });
    if (uploadErr) throw uploadErr;

    const { data: fileRow, error: fileErr } = await supabase.from('job_application_files').insert({
      application_id: app.id,
      bucket: 'job-cvs',
      file_path: filePath,
      file_name: req.file.originalname || 'cv',
      mime_type: req.file.mimetype,
      file_size: req.file.size
    }).select().single();
    if (fileErr) throw fileErr;
    shouldRollback = false;

    const jobUrl = brandBase() + '/careers/' + job.slug;
    const applicationUrl = brandBase() + '/stratex/hiring?applicationId=' + encodeURIComponent(app.id);
    const submittedAt = email.prettyDate ? email.prettyDate(app.submitted_at) : new Date(app.submitted_at).toLocaleString('en-GB');
    const emailWarnings = [];

    const candidateEmail = await email.sendJobApplicationReceived({
      to: applicantEmail,
      firstName,
      jobTitle: job.job_title,
      department: job.department,
      applicationId: app.application_ref,
      submittedAt,
      jobUrl
    });
    if (!candidateEmail.success) {
      emailWarnings.push('candidate_confirmation');
      console.error('[Careers apply email] Candidate confirmation failed:', {
        error: candidateEmail.error || 'SendGrid rejected the candidate confirmation email.',
        template: candidateEmail.template
      });
    }

    const adminRecipients = await recipientsForJob(job.id);
    const adminEmail = await email.sendJobApplicationAlert({
      to: adminRecipients,
      firstName,
      lastName,
      email: applicantEmail,
      phone,
      jobTitle: job.job_title,
      department: job.department,
      location: job.location,
      workingType: job.working_type,
      employmentType: job.employment_type,
      salaryRange: salaryRange(job),
      submittedAt,
      applicationId: app.application_ref,
      jobId: job.id,
      cvFileName: fileRow.file_name,
      cvUrl: '',
      cvPath: filePath,
      applicationUrl,
      jobUrl
    });
    if (!adminEmail.success) {
      emailWarnings.push('admin_alert');
      console.error('[Careers apply email] Admin alert failed:', {
        error: adminEmail.error || 'SendGrid rejected the admin alert email.',
        template: adminEmail.template
      });
    }

    res.status(201).json({
      message: emailWarnings.length
        ? 'Application submitted successfully. Confirmation email delivery is pending.'
        : 'Application submitted successfully.',
      applicationId: app.application_ref,
      emailStatus: emailWarnings.length ? 'partial' : 'sent',
      emailWarnings
    });
  } catch (err) {
    console.error('[Careers apply]', { code: err && err.code, message: err && err.message });
    if (shouldRollback && filePath) {
      try { await supabase.storage.from('job-cvs').remove([filePath]); } catch (_) {}
    }
    if (shouldRollback && insertedApplication?.id) {
      try { await supabase.from('job_applications').delete().eq('id', insertedApplication.id); } catch (_) {}
    }
    res.status(500).json({ error: err.message || 'Could not submit application.' });
  }
});

module.exports = router;

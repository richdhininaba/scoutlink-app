'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../db/supabase');
const email = require('../services/email');

const FALLBACK_ADMIN = 'richdhin@stratexanalytics.co.uk';
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

function applicationRef() {
  return 'APP-' + new Date().getFullYear() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function salaryRange(job) {
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

router.get('/', async (req, res) => {
  try {
    const jobs = await loadVisibleJobs();
    res.json({ data: jobs.map(publicJob) });
  } catch (err) {
    console.error('[Careers list]', err);
    res.status(500).json({ error: 'Could not load careers.' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { data: job, error } = await supabase.from('job_posts').select('*').eq('slug', req.params.slug).maybeSingle();
    if (error || !visibleJob(job)) return res.status(404).json({ error: 'Job not found.' });
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

    const ref = applicationRef();
    const { data: app, error: appErr } = await supabase.from('job_applications').insert({
      application_ref: ref,
      job_post_id: job.id,
      first_name: firstName,
      last_name: lastName,
      email: applicantEmail,
      phone,
      metadata: { source: 'public_careers' }
    }).select().single();
    if (appErr) throw appErr;
    insertedApplication = app;

    const ext = (path.extname(req.file.originalname || '') || '.pdf').toLowerCase().replace(/[^a-z0-9.]/g, '');
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
    const { data: signedCv } = await supabase.storage.from('job-cvs').createSignedUrl(filePath, 60 * 60 * 24 * 7);
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
      console.error('[Careers apply email] Candidate confirmation failed:', candidateEmail.error || candidateEmail);
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
      cvUrl: signedCv?.signedUrl || '',
      applicationUrl,
      jobUrl
    });
    if (!adminEmail.success) {
      emailWarnings.push('admin_alert');
      console.error('[Careers apply email] Admin alert failed:', adminEmail.error || adminEmail);
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
    console.error('[Careers apply]', err);
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

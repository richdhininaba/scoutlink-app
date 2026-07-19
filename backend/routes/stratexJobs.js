'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const email = require('../services/email');
const config = require('../config');
const { duplicateMessage } = require('../utils/dbErrors');
const { hasPermission, loadCurrentStratexAdmin, normalizeRole } = require('../utils/stratexPermissions');

const JOB_STATUSES = ['draft', 'scheduled', 'live', 'closed', 'archived'];
const WORKING_TYPES = ['Remote', 'Hybrid', 'On-site'];
const SALARY_UNITS = ['hourly', 'daily', 'monthly', 'annually', 'commission'];
const COMPENSATION_TYPES = ['paid_role', 'unpaid_internship', 'paid_internship', 'commission_based'];
const MANAGE_JOB_ROLES = ['Management', 'Operations', 'Acquisition'];
const DUPLICATE_SLUG_MESSAGE = 'A job post with this title already exists. Open the existing job and edit it instead.';
const FALLBACK_REPORTING_TO = {
  fullName: 'Richdhin Inaba',
  email: 'richdhin@stratexanalytics.co.uk',
  jobTitle: 'Founder'
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function slugify(value) {
  const base = String(value || 'job').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'job';
}

async function currentAdmin(req) {
  return loadCurrentStratexAdmin(req);
}

function canManageJobs(admin, req) {
  if (!admin || admin.is_active === false) return false;
  const role = normalizeRole(admin.admin_role || admin.role || '');
  const legacyRole = admin.admin_role || admin.role || '';
  const perms = Array.isArray(admin.permissions) ? admin.permissions.map(item => String(item || '').toLowerCase()) : [];
  return MANAGE_JOB_ROLES.includes(legacyRole) ||
    ['management', 'operations', 'acquisition', 'super admin', 'founder'].includes(role) ||
    perms.includes('management') ||
    perms.includes('operations') ||
    perms.includes('acquisition') ||
    perms.includes('hiring') ||
    hasPermission(admin, 'hiring', req);
}

function requireServiceRole(res) {
  if (config.supabase.serviceRoleKey) return true;
  res.status(503).json({ error: 'Secure hiring administration is not configured. SUPABASE_SERVICE_ROLE_KEY is required on the server.' });
  return false;
}

async function requireJobManager(req, res) {
  const admin = await currentAdmin(req);
  if (!canManageJobs(admin, req)) {
    res.status(403).json({ error: 'Only Management, Operations or Acquisition admins can manage job posts.' });
    return null;
  }
  return admin;
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
        email: isValidEmail(data.email) ? cleanText(data.email).toLowerCase() : fallback.email,
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

function applicationSelect() {
  return '*, job_posts(*), job_application_files(id,bucket,file_name,mime_type,file_size,file_path,uploaded_at), job_interview_availability_slots(id,slot_start,slot_end,submitted_at), job_interview_availability_tokens(id,sent_at,expires_at,used_at)';
}

async function loadApplication(applicationId) {
  const { data, error } = await supabase
    .from('job_applications')
    .select(applicationSelect())
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function publicApplication(app) {
  if (!app) return null;
  const job = app.job_posts || {};
  const files = app.job_application_files || [];
  const slots = app.job_interview_availability_slots || [];
  const tokens = app.job_interview_availability_tokens || [];
  return {
    ...app,
    job_posts: job,
    job_application_files: files,
    job_interview_availability_slots: slots,
    job_interview_availability_tokens: tokens,
    availability: {
      submittedAt: app.availability_submitted_at || (slots[0] && slots[0].submitted_at) || null,
      slots: slots.map(s => ({
        id: s.id,
        start: s.slot_start,
        end: s.slot_end,
        submittedAt: s.submitted_at
      })),
      stageOneSentAt: app.stage_one_email_sent_at || null,
      latestToken: tokens[0] || null
    }
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function pickText(body, keys, fallback) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) return cleanText(body[key]);
  }
  return cleanText(fallback);
}

function cleanNumber(value, fallback) {
  if (value === undefined) return fallback ?? null;
  if (value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function requiredError(fields) {
  const err = new Error('Please complete: ' + fields.join(', ') + '.');
  err.code = 'VALIDATION_ERROR';
  return err;
}

function validationError(message) {
  const err = new Error(message);
  err.code = 'VALIDATION_ERROR';
  return err;
}

function isDuplicateSlugError(err) {
  return err && err.code === '23505' && [err.constraint, err.message, err.details, err.hint].filter(Boolean).join(' ').indexOf('job_posts_slug_key') !== -1;
}

function publicStatusOpen(job) {
  const status = String(job?.status || '').toLowerCase();
  if (status === 'live') return true;
  if (status !== 'scheduled') return false;
  const release = job.release_at ? new Date(job.release_at) : null;
  return !!release && !Number.isNaN(release.getTime()) && release <= new Date();
}

async function generateUniqueStratexLoginCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempts = 0; attempts < 20; attempts += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
    const [s, co, p, stx] = await Promise.all([
      supabase.from('scouts').select('id').eq('login_code', code).maybeSingle(),
      supabase.from('coaches').select('id').eq('login_code', code).maybeSingle(),
      supabase.from('players').select('id').eq('login_code', code).maybeSingle(),
      supabase.from('stratex').select('id').eq('login_code', code).maybeSingle()
    ]);
    if (!s.data && !co.data && !p.data && !stx.data) return code;
  }
  throw new Error('Could not generate unique login code');
}

function completeRegistrationLink(emailAddr, loginCode) {
  const baseUrl = String(config.brandUrl || 'https://scoutlink.app').replace(/\/+$/, '');
  return baseUrl + '/complete-registration?code=' + encodeURIComponent(loginCode) + '&email=' + encodeURIComponent(String(emailAddr || '').toLowerCase().trim()) + '&type=Stratex';
}

async function filledVacancyCount(job) {
  if (!job?.id) return 0;
  const { data, error } = await supabase
    .from('stratex')
    .select('id,job_title,manager_id,contract_data,is_active')
    .eq('is_active', true);
  if (error) throw error;
  const title = cleanText(job.job_title).toLowerCase();
  return (data || []).filter(row => {
    const meta = row.contract_data && typeof row.contract_data === 'object' ? row.contract_data : {};
    if (meta.vacancyJobId === job.id || meta.vacancy_job_id === job.id) return true;
    return row.manager_id === job.reporting_to_id && cleanText(row.job_title).toLowerCase() === title;
  }).length;
}

function cleanPositiveInt(value, fallback) {
  const raw = value === undefined ? fallback : value;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  const num = Number.parseInt(text, 10);
  return num >= 1 ? num : null;
}

function normalizeJobPayload(body, existing) {
  const title = cleanText(body.jobTitle || body.job_title || existing?.job_title);
  const status = cleanText(body.status || existing?.status || 'draft').toLowerCase();
  const workingType = body.workingType || body.working_type || existing?.working_type || 'Remote';
  const salaryUnit = body.salaryUnit || body.salary_unit || existing?.salary_unit || 'annually';
  const compensationType = cleanText(body.compensationType || body.compensation_type || existing?.compensation_type || 'paid_role');
  const employmentType = pickText(body, ['employmentType', 'employment_type'], existing?.employment_type);
  const roleOverview = pickText(body, ['roleOverview', 'role_overview'], existing?.role_overview);
  const responsibilities = pickText(body, ['responsibilities', 'whatYouWillBeDoing', 'what_you_will_be_doing'], existing?.responsibilities);
  const reportingToId = pickText(body, ['reportingToId', 'reporting_to_id'], existing?.reporting_to_id);
  const reportingToName = pickText(body, ['reportingToName', 'reporting_to_name'], existing?.reporting_to_name);
  const hasPositionsInput = Object.prototype.hasOwnProperty.call(body, 'positionsAvailable') || Object.prototype.hasOwnProperty.call(body, 'positions_available');
  const positionsAvailable = cleanPositiveInt(hasPositionsInput ? (body.positionsAvailable ?? body.positions_available) : undefined, existing?.positions_available);
  const stageCountRaw = body.interviewStageCount ?? body.interview_stage_count ?? existing?.interview_stage_count ?? 1;
  const interviewStageCount = Math.max(0, Number.parseInt(stageCountRaw, 10) || 0);
  const missing = [];
  if (!title) missing.push('Role title');
  if (!employmentType) missing.push('Employment type');
  if (!salaryUnit && !compensationType) missing.push('Pay type or pay frequency');
  if (!roleOverview && !responsibilities) missing.push('Role overview or job description');
  if (!reportingToId && !reportingToName) missing.push('Reporting to');
  if (!positionsAvailable) missing.push('Number of positions available');
  if (missing.length) throw requiredError(missing);
  if (!JOB_STATUSES.includes(status)) throw validationError('Invalid job status.');
  if (!WORKING_TYPES.includes(workingType)) throw validationError('Invalid working type.');
  if (!SALARY_UNITS.includes(salaryUnit)) throw validationError('Invalid pay frequency.');
  if (!COMPENSATION_TYPES.includes(compensationType)) throw validationError('Invalid compensation option.');
  return {
    job_title: title,
    slug: cleanText(body.slug || existing?.slug || slugify(title)),
    department: pickText(body, ['department'], existing?.department),
    location: pickText(body, ['location'], existing?.location),
    working_type: workingType,
    employment_type: employmentType,
    contract_type: pickText(body, ['contractType', 'contract_type'], existing?.contract_type),
    compensation_type: compensationType,
    compensation_notes: pickText(body, ['compensationNotes', 'compensation_notes'], existing?.compensation_notes),
    salary_min: cleanNumber(body.salaryMin, existing?.salary_min),
    salary_max: cleanNumber(body.salaryMax, existing?.salary_max),
    salary_unit: salaryUnit,
    currency: 'GBP',
    reporting_to_id: reportingToId || null,
    reporting_to_name: reportingToName || null,
    positions_available: positionsAvailable,
    release_at: body.releaseAt !== undefined || body.release_at !== undefined ? (body.releaseAt || body.release_at || null) : existing?.release_at || null,
    closing_at: body.closingAt !== undefined || body.closing_at !== undefined ? (body.closingAt || body.closing_at || null) : existing?.closing_at || null,
    about_company: pickText(body, ['aboutCompany', 'about_company'], existing?.about_company),
    role_overview: roleOverview,
    responsibilities,
    must_haves: pickText(body, ['mustHaves', 'must_haves'], existing?.must_haves),
    nice_to_haves: pickText(body, ['niceToHaves', 'nice_to_haves'], existing?.nice_to_haves),
    benefits: pickText(body, ['benefits'], existing?.benefits),
    application_instructions: pickText(body, ['applicationInstructions', 'application_instructions'], existing?.application_instructions),
    interview_stage_count: interviewStageCount,
    interview_process: pickText(body, ['interviewProcess', 'interview_process'], existing?.interview_process),
    status
  };
}

async function saveRecipients(jobId, recipients) {
  await supabase.from('job_post_notification_recipients').delete().eq('job_post_id', jobId);
  const rows = (recipients || [])
    .map(r => typeof r === 'string' ? { email: r } : r)
    .map(r => ({ job_post_id: jobId, stratex_id: r.stratexId || r.stratex_id || null, email: cleanText(r.email).toLowerCase() }))
    .filter(r => isValidEmail(r.email));
  if (rows.length) {
    const { error } = await supabase.from('job_post_notification_recipients').insert(rows);
    if (error) throw error;
  }
}

async function attachRecipients(jobs) {
  const rows = Array.isArray(jobs) ? jobs : [jobs];
  const ids = rows.map(j => j.id).filter(Boolean);
  if (!ids.length) return jobs;
  const { data } = await supabase.from('job_post_notification_recipients').select('*').in('job_post_id', ids);
  const byJob = {};
  (data || []).forEach(r => {
    if (!byJob[r.job_post_id]) byJob[r.job_post_id] = [];
    byJob[r.job_post_id].push(r);
  });
  rows.forEach(job => { job.notification_recipients = byJob[job.id] || []; });
  return Array.isArray(jobs) ? rows : rows[0];
}

router.get('/jobs', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('job_posts').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    res.json({ data: await attachRecipients(data || []) });
  } catch (err) {
    console.error('[Stratex jobs list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/jobs/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('job_posts').select('*').eq('id', req.params.id).maybeSingle();
    if (error || !data) return res.status(404).json({ error: 'Job not found' });
    res.json({ data: await attachRecipients(data) });
  } catch (err) {
    console.error('[Stratex job get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/jobs', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const payload = normalizeJobPayload(req.body || {});
    payload.created_by = req.user.id;
    payload.updated_by = req.user.id;
    const { data: existingSlug, error: slugCheckError } = await supabase
      .from('job_posts')
      .select('id,job_title,slug')
      .eq('slug', payload.slug)
      .maybeSingle();
    if (slugCheckError) throw slugCheckError;
    if (existingSlug) return res.status(409).json({ error: DUPLICATE_SLUG_MESSAGE, existingJobId: existingSlug.id });
    const { data, error } = await supabase.from('job_posts').insert(payload).select().single();
    if (error) throw error;
    await saveRecipients(data.id, req.body.notificationRecipients || req.body.notification_recipients || []);
    res.status(201).json({ message: 'Job post saved', data: await attachRecipients(data) });
  } catch (err) {
    console.error('[Stratex job create]', err);
    if (err.code === 'VALIDATION_ERROR') return res.status(400).json({ error: err.message });
    if (isDuplicateSlugError(err)) return res.status(409).json({ error: DUPLICATE_SLUG_MESSAGE });
    res.status(500).json({ error: 'Role could not be saved. Please check the required fields and try again.' });
  }
});

router.patch('/jobs/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const { data: existing, error: loadErr } = await supabase.from('job_posts').select('*').eq('id', req.params.id).maybeSingle();
    if (loadErr || !existing) return res.status(404).json({ error: 'Job not found' });
    const payload = normalizeJobPayload(req.body || {}, existing);
    payload.updated_by = req.user.id;
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('job_posts').update(payload).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (req.body.notificationRecipients !== undefined || req.body.notification_recipients !== undefined) {
      await saveRecipients(data.id, req.body.notificationRecipients || req.body.notification_recipients || []);
    }
    res.json({ message: 'Job post updated', data: await attachRecipients(data) });
  } catch (err) {
    console.error('[Stratex job update]', err);
    if (err.code === 'VALIDATION_ERROR') return res.status(400).json({ error: err.message });
    if (isDuplicateSlugError(err)) return res.status(409).json({ error: DUPLICATE_SLUG_MESSAGE });
    res.status(500).json({ error: 'Role could not be saved. Please check the required fields and try again.' });
  }
});

router.post('/jobs/:id/fill-vacancy', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const admin = await requireJobManager(req, res);
    if (!admin) return;

    const { data: job, error: jobErr } = await supabase
      .from('job_posts')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (jobErr) throw jobErr;
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (!publicStatusOpen(job)) return res.status(400).json({ error: 'This vacancy is not open.' });

    const positions = Math.max(1, Number.parseInt(job.positions_available, 10) || 1);
    const filled = await filledVacancyCount(job);
    if (filled >= positions) return res.status(409).json({ error: 'All positions for this vacancy have already been filled.' });

    const firstName = cleanText(req.body.firstName || req.body.first_name);
    const lastName = cleanText(req.body.lastName || req.body.last_name);
    const emailAddr = cleanText(req.body.email || req.body.emailAddr || req.body.email_addr).toLowerCase();
    const phone = cleanText(req.body.phone);
    const jobTitle = cleanText(req.body.jobTitle || req.body.job_title || job.job_title);
    const startDate = cleanText(req.body.startDate || req.body.start_date);
    if (!firstName || !lastName || !emailAddr) return res.status(400).json({ error: 'First name, last name and email are required.' });
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const duplicateChecks = await Promise.all([
      supabase.from('stratex').select('id').eq('email', emailAddr).maybeSingle(),
      supabase.from('coaches').select('id').eq('email', emailAddr).maybeSingle(),
      supabase.from('scouts').select('id').eq('email', emailAddr).maybeSingle(),
      supabase.from('players').select('id').eq('email', emailAddr).maybeSingle()
    ]);
    if (duplicateChecks[0].data) return res.status(409).json({ error: 'A Stratex user with this email already exists.' });
    if (duplicateChecks[1].data || duplicateChecks[2].data || duplicateChecks[3].data) return res.status(409).json({ error: 'This email is already registered on ScoutLink.' });

    const loginCode = await generateUniqueStratexLoginCode();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const contractData = {
      vacancyJobId: job.id,
      vacancyJobTitle: job.job_title,
      vacancyFilledAt: new Date().toISOString(),
      startDate: startDate || null,
      phone: phone || null,
      source: 'org_vacancy_fill'
    };
    const { data: newAdmin, error: insertErr } = await supabase
      .from('stratex')
      .insert({
        stratex_id: generateId('STX'),
        first_name: firstName,
        last_name: lastName,
        email: emailAddr,
        role: 'Read Only',
        admin_role: 'Read Only',
        job_title: jobTitle || job.job_title,
        manager_id: job.reporting_to_id || null,
        permissions: ['read_only'],
        annual_leave_days: 25,
        contract_data: contractData,
        is_active: true,
        login_code: loginCode,
        login_code_expires: expires,
        registration_complete: false
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    const completeLink = completeRegistrationLink(emailAddr, loginCode);
    const emailResult = await email.sendCompleteSignup({
      to: emailAddr,
      email: emailAddr,
      firstName,
      loginCode,
      accountType: 'Stratex',
      completeLink
    }).catch(e => ({ success: false, error: e.message, details: e.details }));
    if (!emailResult || !emailResult.success) {
      await supabase.from('stratex').delete().eq('id', newAdmin.id);
      return res.status(502).json({
        error: 'SendGrid did not accept the Stratex invite email. The vacancy was not filled.',
        details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error'
      });
    }

    res.status(201).json({
      message: 'Vacancy filled. Complete-registration email sent.',
      admin: newAdmin,
      vacancy: { jobId: job.id, positionsAvailable: positions, filled: filled + 1, open: Math.max(0, positions - filled - 1) },
      loginCode,
      completeLink,
      emailSent: true,
      emailTemplate: emailResult.template || null
    });
  } catch (err) {
    console.error('[Stratex fill vacancy]', err);
    const duplicate = duplicateMessage(err);
    if (duplicate) return res.status(409).json({ error: duplicate });
    res.status(500).json({ error: 'Vacancy could not be filled. Please check the details and try again.' });
  }
});

router.get('/job-applications', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!requireServiceRole(res)) return;
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const { jobId } = req.query;
    let q = supabase.from('job_applications').select(applicationSelect()).order('submitted_at', { ascending: false }).limit(250);
    if (jobId) q = q.eq('job_post_id', jobId);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: (data || []).map(publicApplication) });
  } catch (err) {
    console.error('[Stratex applications]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/job-applications/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!requireServiceRole(res)) return;
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const app = await loadApplication(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ data: publicApplication(app) });
  } catch (err) {
    console.error('[Stratex application get]', err);
    res.status(500).json({ error: 'Could not load application' });
  }
});

router.get('/job-applications/:id/cv-url', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!config.supabase.serviceRoleKey) {
      return res.status(503).json({ error: 'Secure CV access is not configured.' });
    }
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const { data: file, error } = await supabase.from('job_application_files').select('*').eq('application_id', req.params.id).maybeSingle();
    if (error || !file) return res.status(404).json({ error: 'CV file not found' });
    const { data, error: signedErr } = await supabase.storage.from(file.bucket || 'job-cvs').createSignedUrl(file.file_path, 60 * 10);
    if (signedErr) throw signedErr;
    res.json({ url: data.signedUrl, expiresIn: 600, fileName: file.file_name });
  } catch (err) {
    console.error('[Stratex application CV]', { code: err && err.code, message: err && err.message });
    res.status(500).json({ error: 'Could not create secure CV link' });
  }
});

router.delete('/job-applications/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!requireServiceRole(res)) return;
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const app = await loadApplication(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const files = app.job_application_files || [];
    const byBucket = {};
    files.forEach((file) => {
      const bucket = file.bucket || 'job-cvs';
      if (!byBucket[bucket]) byBucket[bucket] = [];
      if (file.file_path) byBucket[bucket].push(file.file_path);
    });
    for (const [bucket, paths] of Object.entries(byBucket)) {
      if (paths.length) {
        const { error: storageErr } = await supabase.storage.from(bucket).remove(paths);
        if (storageErr) console.error('[Stratex application delete storage]', storageErr);
      }
    }
    const { error } = await supabase.from('job_applications').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error('[Stratex application delete]', err);
    res.status(500).json({ error: 'Could not delete application' });
  }
});

router.post('/job-applications/:id/stage-one', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!requireServiceRole(res)) return;
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const app = await loadApplication(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const job = app.job_posts || {};
    const reportingTo = await resolveReportingTo(job);
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const sentAt = new Date();
    const expiresAt = new Date(sentAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('job_interview_availability_tokens')
      .insert({
        application_id: app.id,
        token_hash: tokenHash(rawToken),
        token_hint: rawToken.slice(0, 6),
        sent_at: sentAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        created_by: req.user.id
      })
      .select()
      .single();
    if (tokenErr) throw tokenErr;
    const interviewAvailabilityUrl = email.accountLink
      ? email.accountLink('/careers/interview-availability', { token: rawToken })
      : 'https://scoutlink.app/careers/interview-availability?token=' + encodeURIComponent(rawToken);
    const emailResult = await email.sendJobApplicationStageOneEmail({
      to: app.email,
      firstName: app.first_name,
      jobTitle: job.job_title,
      interviewAvailabilityUrl,
      reportingToFullName: reportingTo.fullName,
      reportingToJobTitle: reportingTo.jobTitle
    });
    if (!emailResult.success) {
      await supabase.from('job_interview_availability_tokens').delete().eq('id', tokenRow.id);
      return res.status(502).json({
        error: 'Stage One email could not be sent.',
        details: emailResult.error || emailResult.details || 'SendGrid rejected the email.'
      });
    }
    const { error: updateErr } = await supabase
      .from('job_applications')
      .update({ status: 'stage_one', stage_one_email_sent_at: sentAt.toISOString() })
      .eq('id', app.id);
    if (updateErr) throw updateErr;
    res.json({
      message: 'Candidate moved to Stage One and email sent.',
      emailTemplate: emailResult.templateId,
      interviewAvailabilityUrl
    });
  } catch (err) {
    console.error('[Stratex application stage one]', err);
    res.status(500).json({ error: 'Could not move application to Stage One' });
  }
});

router.post('/job-applications/:id/decline', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    if (!requireServiceRole(res)) return;
    const admin = await requireJobManager(req, res);
    if (!admin) return;
    const app = await loadApplication(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const job = app.job_posts || {};
    const reportingTo = await resolveReportingTo(job);
    const emailResult = await email.sendJobApplicationDeclineEmail({
      to: app.email,
      firstName: app.first_name,
      jobTitle: job.job_title,
      reportingToEmail: reportingTo.email,
      reportingToFullName: reportingTo.fullName,
      reportingToJobTitle: reportingTo.jobTitle
    });
    if (!emailResult.success) {
      return res.status(502).json({
        error: 'Decline email could not be sent.',
        details: emailResult.error || emailResult.details || 'SendGrid rejected the email.'
      });
    }
    const { error: updateErr } = await supabase
      .from('job_applications')
      .update({ status: 'declined', decline_email_sent_at: new Date().toISOString() })
      .eq('id', app.id);
    if (updateErr) throw updateErr;
    res.json({ message: 'Application declined and email sent.', emailTemplate: emailResult.templateId });
  } catch (err) {
    console.error('[Stratex application decline]', err);
    res.status(500).json({ error: 'Could not decline application' });
  }
});

module.exports = router;

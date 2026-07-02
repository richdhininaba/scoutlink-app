'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const JOB_STATUSES = ['draft', 'scheduled', 'live', 'closed', 'archived'];
const WORKING_TYPES = ['Remote', 'Hybrid', 'On-site'];
const SALARY_UNITS = ['hourly', 'daily', 'monthly', 'annually', 'commission'];
const COMPENSATION_TYPES = ['paid_role', 'unpaid_internship', 'paid_internship', 'commission_based'];
const MANAGE_JOB_ROLES = ['Management', 'Operations', 'Acquisition'];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function slugify(value) {
  const base = String(value || 'job').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'job';
}

async function currentAdmin(req) {
  const { data } = await supabase.from('stratex').select('id,email,admin_role,role,permissions,is_active').eq('id', req.user.id).maybeSingle();
  return data || null;
}

function canManageJobs(admin) {
  if (!admin || admin.is_active === false) return false;
  const role = admin.admin_role || admin.role || '';
  const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
  return MANAGE_JOB_ROLES.includes(role) || perms.includes('management') || perms.includes('operations') || perms.includes('acquisition');
}

async function requireJobManager(req, res) {
  const admin = await currentAdmin(req);
  if (!canManageJobs(admin)) {
    res.status(403).json({ error: 'Only Management, Operations or Acquisition admins can manage job posts.' });
    return null;
  }
  return admin;
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
    const { data, error } = await supabase.from('job_posts').insert(payload).select().single();
    if (error) throw error;
    await saveRecipients(data.id, req.body.notificationRecipients || req.body.notification_recipients || []);
    res.status(201).json({ message: 'Job post saved', data: await attachRecipients(data) });
  } catch (err) {
    console.error('[Stratex job create]', err);
    if (err.code === 'VALIDATION_ERROR') return res.status(400).json({ error: err.message });
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
    res.status(500).json({ error: 'Role could not be saved. Please check the required fields and try again.' });
  }
});

router.get('/job-applications', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { jobId } = req.query;
    let q = supabase.from('job_applications').select('*, job_posts(job_title,department,status), job_application_files(id,file_name,mime_type,file_size,file_path)').order('submitted_at', { ascending: false }).limit(250);
    if (jobId) q = q.eq('job_post_id', jobId);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[Stratex applications]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/job-applications/:id/cv-url', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data: file, error } = await supabase.from('job_application_files').select('*').eq('application_id', req.params.id).maybeSingle();
    if (error || !file) return res.status(404).json({ error: 'CV file not found' });
    const { data, error: signedErr } = await supabase.storage.from(file.bucket || 'job-cvs').createSignedUrl(file.file_path, 60 * 10);
    if (signedErr) throw signedErr;
    res.json({ url: data.signedUrl, expiresIn: 600, fileName: file.file_name });
  } catch (err) {
    console.error('[Stratex application CV]', err);
    res.status(500).json({ error: 'Could not create secure CV link' });
  }
});

module.exports = router;

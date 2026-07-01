'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const JOB_STATUSES = ['draft', 'scheduled', 'live', 'closed', 'archived'];
const WORKING_TYPES = ['Remote', 'Hybrid', 'On-site'];
const SALARY_UNITS = ['hourly', 'daily', 'monthly', 'annually'];
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

function normalizeJobPayload(body, existing) {
  const title = cleanText(body.jobTitle || body.job_title || existing?.job_title);
  const status = cleanText(body.status || existing?.status || 'draft').toLowerCase();
  const workingType = body.workingType || body.working_type || existing?.working_type || 'Remote';
  const salaryUnit = body.salaryUnit || body.salary_unit || existing?.salary_unit || 'annually';
  if (!title) throw new Error('Job title is required.');
  if (!JOB_STATUSES.includes(status)) throw new Error('Invalid job status.');
  if (!WORKING_TYPES.includes(workingType)) throw new Error('Invalid working type.');
  if (!SALARY_UNITS.includes(salaryUnit)) throw new Error('Invalid salary unit.');
  return {
    job_title: title,
    slug: cleanText(body.slug || existing?.slug || slugify(title)),
    department: cleanText(body.department || existing?.department),
    location: cleanText(body.location || existing?.location),
    working_type: workingType,
    employment_type: cleanText(body.employmentType || body.employment_type || existing?.employment_type),
    contract_type: cleanText(body.contractType || body.contract_type || existing?.contract_type),
    salary_min: body.salaryMin !== undefined ? Number(body.salaryMin) || null : existing?.salary_min || null,
    salary_max: body.salaryMax !== undefined ? Number(body.salaryMax) || null : existing?.salary_max || null,
    salary_unit: salaryUnit,
    currency: 'GBP',
    release_at: body.releaseAt !== undefined || body.release_at !== undefined ? (body.releaseAt || body.release_at || null) : existing?.release_at || null,
    closing_at: body.closingAt !== undefined || body.closing_at !== undefined ? (body.closingAt || body.closing_at || null) : existing?.closing_at || null,
    about_company: cleanText(body.aboutCompany || body.about_company || existing?.about_company),
    role_overview: cleanText(body.roleOverview || body.role_overview || existing?.role_overview),
    responsibilities: cleanText(body.responsibilities || body.whatYouWillBeDoing || body.what_you_will_be_doing || existing?.responsibilities),
    must_haves: cleanText(body.mustHaves || body.must_haves || existing?.must_haves),
    nice_to_haves: cleanText(body.niceToHaves || body.nice_to_haves || existing?.nice_to_haves),
    interview_stage_count: Number(body.interviewStageCount || body.interview_stage_count || existing?.interview_stage_count || 1) || 1,
    interview_process: cleanText(body.interviewProcess || body.interview_process || existing?.interview_process),
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
    res.status(400).json({ error: err.message || 'Could not save job post' });
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
    res.status(400).json({ error: err.message || 'Could not update job post' });
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

'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const email = require('../services/email');
const config = require('../config');
const { limitsForPlan } = require('../utils/scoutPlans');

const VERIFICATION_BUCKET = 'scout-verification-documents';
const verificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Upload PDF, JPG, PNG, DOC or DOCX files only.'));
    cb(null, true);
  }
});

const DECLINE_REASONS = [
  'Unable to verify football team','Unable to verify professional club affiliation',
  'Insufficient information provided','Cannot verify age eligibility',
  'Duplicate registration','Account suspended','Other'
  ];

function validateScoutSafeguardingReview(review) {
  review = review || {};
  const checklist = review.checklist || {};
  const required = ['identity','dbs','faCredentials','clubAssociation','contactDetails','noSafeguardingFlags','termsAccepted'];
  const missing = required.filter(k => checklist[k] !== true);
  const docs = Array.isArray(review.documents) ? review.documents : [];
  const dbsDate = review.dbsIssueDate ? new Date(review.dbsIssueDate) : null;
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
  if (missing.length) return { ok: false, error: 'Scout approval blocked. Complete every safeguarding gate: ' + missing.join(', ') };
  if (!review.dbsCertificateNumber) return { ok: false, error: 'DBS certificate number is required.' };
  if (!dbsDate || Number.isNaN(dbsDate.getTime())) return { ok: false, error: 'DBS issue date is required.' };
  if (dbsDate < threeYearsAgo) return { ok: false, error: 'Enhanced DBS issue date must be within the last three years.' };
  if (String(review.dbsLevel || '').toLowerCase() !== 'enhanced') return { ok: false, error: 'DBS level must be enhanced.' };
  if (!docs.length) return { ok: false, error: 'Attach at least one safeguarding document before approving a scout.' };
  return { ok: true };
}

// Helper: generate a login code unique across all user tables
async function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  while (attempts < 20) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random()*chars.length)];
    // Check all tables for this code
  const [s, c, p, stx] = await Promise.all([
    supabase.from('scouts').select('id').eq('login_code', code).maybeSingle(),
    supabase.from('coaches').select('id').eq('login_code', code).maybeSingle(),
    supabase.from('players').select('id').eq('login_code', code).maybeSingle(),
    supabase.from('stratex').select('id').eq('login_code', code).maybeSingle()
    ]);
    if (!s.data && !c.data && !p.data && !stx.data) return code;
    attempts++;
  }
  throw new Error('Could not generate unique login code after 20 attempts');
}

// Helper: check duplicate email/phone across all user tables
async function checkDuplicates(emailAddr, phone) {
  const em = emailAddr.toLowerCase().trim();
  const tables = ['scouts','coaches','players','stratex'];
  for (const t of tables) {
    const { data: eRow } = await supabase.from(t).select('id').eq('email', em).maybeSingle();
    if (eRow) return { duplicate: true, field: 'email', table: t };
  }
  if (phone && phone.trim()) {
    const ph = phone.trim();
    for (const t of ['scouts','coaches']) {
      const { data: pRow } = await supabase.from(t).select('id').eq('phone', ph).maybeSingle();
      if (pRow) return { duplicate: true, field: 'phone', table: t };
    }
  }
  return { duplicate: false };
}

// Also check duplicate in pending registration_requests
async function checkPendingDuplicate(emailAddr) {
  const em = emailAddr.toLowerCase().trim();
  const { data } = await supabase.from('registration_requests').select('id,status').eq('email', em).eq('status','pending').maybeSingle();
  if (data) return true;
  return false;
}

function titleCase(v) {
  return String(v || '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function isValidEmail(emailAddr) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

function stratexBase() {
  return String(process.env.STRATEX_URL || 'https://www.stratexanalytics.co.uk').replace(/\/+$/, '');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function verificationLink(token) {
  return stratexBase() + '/scout-verification?token=' + encodeURIComponent(token);
}

function sanitizeFileName(value) {
  return String(value || 'document').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'document';
}

function uploadedDocuments(row) {
  return Array.isArray(row && row.safeguarding_documents) ? row.safeguarding_documents : [];
}

function safeLog(label, err) {
  console.error(label, { code: err && err.code, message: err && err.message });
}

function normalizeDeclarations(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function validateCoachDeclarations(declarations) {
  const required = ['authorised', 'under18Permissions', 'disputeRemoval', 'mediaPermission'];
  return required.every(key => declarations[key] === true);
}

function validateScoutDeclarations(declarations) {
  return declarations.legitimateCapacity === true;
}

async function removeCreatedUser(accountType, id) {
  const table = accountType === 'Coach' ? 'coaches' : accountType === 'Scout' ? 'scouts' : null;
  if (table && id) await supabase.from(table).delete().eq('id', id);
}

async function removeRegistrationRequest(id) {
  if (id) await supabase.from('registration_requests').delete().eq('id', id);
}

async function sendRegistrationEmails({ accountType, request, alertPayload }) {
  const applicant = await email.sendRegistrationReceived({
    accountType,
    firstName: request.first_name,
    lastName: request.last_name,
    email: request.email,
    requestId: request.id
  }).catch(e => ({ success: false, error: e.message }));
  if (!applicant || !applicant.success) return { success: false, stage: 'applicant confirmation', result: applicant };

  let verification = null;
  if (accountType === 'Scout') {
    verification = await email.sendScoutVerificationRequired({
      to: request.email,
      firstName: request.first_name,
      verificationLink: request.verificationLink
    }).catch(e => ({ success: false, error: e.message }));
    if (!verification || !verification.success) return { success: false, stage: 'scout verification email', result: verification };
  }

  const admin = accountType === 'Coach'
    ? await email.sendCoachRegAlert(alertPayload).catch(e => ({ success: false, error: e.message }))
    : await email.sendScoutRegAlert(alertPayload).catch(e => ({ success: false, error: e.message }));
  if (!admin || !admin.success) return { success: false, stage: 'Stratex admin alert', result: admin };

  return { success: true, applicant, verification, admin };
}

// Public: coach registers
router.post('/coach', async (req, res) => {
  try {
    const { firstName, lastName, emailAddr, phone, teamName, county, league, roleAtClub, dataPolicyAgreed } = req.body;
    const declarations = normalizeDeclarations(req.body.declarations);
    if (!firstName||!lastName||!emailAddr||!teamName) return res.status(400).json({ error: 'firstName, lastName, email and teamName required' });
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!dataPolicyAgreed) return res.status(400).json({ error: 'Data policy agreement required' });
    if (!validateCoachDeclarations(declarations)) return res.status(400).json({ error: 'Coach declarations are required.' });
    const dup = await checkDuplicates(emailAddr, phone);
    if (dup.duplicate) return res.status(409).json({ error: dup.field === 'email' ? 'This email address is already registered on ScoutLink.' : 'This phone number is already registered on ScoutLink.' });
    if (await checkPendingDuplicate(emailAddr)) return res.status(409).json({ error: 'A registration request is already pending for this email.' });
    const { data: req2, error } = await supabase.from('registration_requests').insert({
      account_type: 'Coach', first_name: firstName.trim(), last_name: lastName.trim(),
      email: emailAddr.toLowerCase().trim(), phone: phone||null, team_name: teamName,
      team_county: county?titleCase(county):null, team_league: league||null, role_at_club: roleAtClub||'Coach',
      data_policy_agreed: true, data_policy_agreed_at: new Date(), status: 'pending',
      declaration_version: req.body.declarationVersion || 'coach-declarations-v1-2026-07',
      activity_notice_version: req.body.activityNoticeVersion || 'platform-activity-v1-2026-07',
      declarations
    }).select().single();
    if (error) throw error;
    const emailResult = await sendRegistrationEmails({
      accountType: 'Coach',
      request: req2,
      alertPayload: { firstName, lastName, email: emailAddr, teamName, county, league, roleAtClub, requestId: req2.id }
    });
    if (!emailResult.success) {
      await removeRegistrationRequest(req2.id);
      return res.status(502).json({ error: 'Registration email failed at ' + emailResult.stage + '. Please try again.', details: emailResult.result && (emailResult.result.error || emailResult.result.details) || 'Unknown email error' });
    }
    res.status(201).json({ message: 'Registration submitted. We have emailed you confirmation and will get back to you shortly. Please check junk if you do not see a response within 24 hours.', requestId: req2.id, emailSent: true });
  } catch(err) { safeLog('[Registration coach]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Public: scout registers
router.post('/scout', async (req, res) => {
  try {
    const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, dataPolicyAgreed } = req.body;
    const declarations = normalizeDeclarations(req.body.declarations);
    if (!firstName||!lastName||!emailAddr||!scoutClub) return res.status(400).json({ error: 'firstName, lastName, email and scoutClub required' });
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!dataPolicyAgreed) return res.status(400).json({ error: 'Data policy agreement required' });
    if (!validateScoutDeclarations(declarations)) return res.status(400).json({ error: 'Scout verification declaration is required.' });
    const dup = await checkDuplicates(emailAddr, phone);
    if (dup.duplicate) return res.status(409).json({ error: dup.field === 'email' ? 'This email address is already registered on ScoutLink.' : 'This phone number is already registered on ScoutLink.' });
    if (await checkPendingDuplicate(emailAddr)) return res.status(409).json({ error: 'A registration request is already pending for this email.' });
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { data: req2, error } = await supabase.from('registration_requests').insert({
      account_type: 'Scout', first_name: firstName.trim(), last_name: lastName.trim(),
      email: emailAddr.toLowerCase().trim(), phone: phone||null, scout_club: scoutClub, scout_league: scoutLeague||null,
      data_policy_agreed: true, data_policy_agreed_at: new Date(), status: 'pending',
      declaration_version: req.body.declarationVersion || 'scout-verification-v1-2026-07',
      activity_notice_version: req.body.activityNoticeVersion || 'platform-activity-v1-2026-07',
      declarations,
      verification_status: 'awaiting_documents',
      verification_token_hash: hashToken(token),
      verification_token_expires_at: expiresAt,
      verification_link_sent_at: new Date()
    }).select().single();
    if (error) throw error;
    req2.verificationLink = verificationLink(token);
    const emailResult = await sendRegistrationEmails({
      accountType: 'Scout',
      request: req2,
      alertPayload: { firstName, lastName, email: emailAddr, scoutClub, scoutLeague, requestId: req2.id }
    });
    if (!emailResult.success) {
      await removeRegistrationRequest(req2.id);
      return res.status(502).json({ error: 'Registration email failed at ' + emailResult.stage + '. Please try again.', details: emailResult.result && (emailResult.result.error || emailResult.result.details) || 'Unknown email error' });
    }
    res.status(201).json({ message: 'Registration submitted. We have emailed your verification link and will review your request after documents are uploaded. Please check junk if you do not see a response within 24 hours.', requestId: req2.id, emailSent: true });
  } catch(err) { safeLog('[Registration scout]', err); res.status(500).json({ error: 'Internal server error' }); }
});

async function requestByVerificationToken(token) {
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from('registration_requests')
    .select('*')
    .eq('account_type', 'Scout')
    .eq('verification_token_hash', tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: 'Invalid verification link' };
  if (data.status !== 'pending') return { error: 'This verification link is no longer active.' };
  if (data.verification_token_expires_at && new Date(data.verification_token_expires_at).getTime() < Date.now()) return { error: 'This verification link has expired. Please contact info@scoutlink.app.' };
  return { data };
}

router.get('/scout-verification/:token', async (req, res) => {
  try {
    const result = await requestByVerificationToken(req.params.token);
    if (result.error) return res.status(404).json({ error: result.error });
    const rq = result.data;
    res.json({
      firstName: rq.first_name,
      lastName: rq.last_name,
      scoutClub: rq.scout_club,
      verificationStatus: rq.verification_status || 'awaiting_documents',
      documentsUploaded: uploadedDocuments(rq).length,
      expiresAt: rq.verification_token_expires_at
    });
  } catch (err) {
    safeLog('[Scout verification lookup]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/scout-verification/:token', (req, res) => {
  verificationUpload.fields([
    { name: 'safeguardingEvidence', maxCount: 1 },
    { name: 'proofOfId', maxCount: 1 }
  ])(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    try {
      const result = await requestByVerificationToken(req.params.token);
      if (result.error) return res.status(404).json({ error: result.error });
      const rq = result.data;
      const files = {
        safeguardingEvidence: req.files && req.files.safeguardingEvidence && req.files.safeguardingEvidence[0],
        proofOfId: req.files && req.files.proofOfId && req.files.proofOfId[0]
      };
      if (!files.safeguardingEvidence || !files.proofOfId) return res.status(400).json({ error: 'Safeguarding evidence and proof of ID are required.' });
      const docs = [];
      for (const kind of Object.keys(files)) {
        const file = files[kind];
        const filePath = 'registration-requests/' + rq.id + '/' + kind + '-' + Date.now() + '-' + sanitizeFileName(file.originalname);
        const { error: uploadError } = await supabase.storage.from(VERIFICATION_BUCKET).upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (uploadError) throw uploadError;
        docs.push({
          kind,
          bucket: VERIFICATION_BUCKET,
          filePath,
          fileName: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }
      const merged = uploadedDocuments(rq).concat(docs);
      const { error: updateError } = await supabase.from('registration_requests').update({
        safeguarding_documents: merged,
        verification_uploaded_at: new Date(),
        verification_status: 'documents_submitted'
      }).eq('id', rq.id);
      if (updateError) throw updateError;
      res.json({ message: 'Verification documents received. Stratex will review them and email the next step.', documentsUploaded: merged.length });
    } catch (err) {
      safeLog('[Scout verification upload]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Stratex: list requests
router.get('/', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { status = 'pending', accountType, page = 1, limit = 50 } = req.query;
    let q = supabase.from('registration_requests').select('*', { count: 'exact' });
    if (status) q = q.eq('status', status);
    if (accountType) q = q.eq('account_type', accountType);
    const off = (Number(page)-1)*Number(limit);
    q = q.order('created_at', { ascending: false }).range(off, off+Number(limit)-1);
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data||[], total: count||0, page: Number(page), limit: Number(limit) });
  } catch(err) { safeLog('[Registration list]', err); res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

router.get('/:id/verification-documents', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data: rq, error } = await supabase.from('registration_requests').select('id,account_type,safeguarding_documents').eq('id', req.params.id).single();
    if (error || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.account_type !== 'Scout') return res.status(400).json({ error: 'Verification documents are only used for scout requests.' });
    const docs = uploadedDocuments(rq);
    const signed = [];
    for (const doc of docs) {
      if (!doc.filePath) continue;
      const { data, error: signedErr } = await supabase.storage.from(doc.bucket || VERIFICATION_BUCKET).createSignedUrl(doc.filePath, 60 * 10);
      if (signedErr) throw signedErr;
      signed.push({ ...doc, signedUrl: data && data.signedUrl });
    }
    res.json({ data: signed });
  } catch (err) {
    safeLog('[Scout verification documents]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stratex: approve
router.post('/:id/approve', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { subscriptionPlan, safeguardingReview, paymentLink } = req.body;
    const { data: rq, error: rqErr } = await supabase.from('registration_requests').select('*').eq('id', req.params.id).single();
    if (rqErr || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.status !== 'pending') return res.status(400).json({ error: 'Registration is not pending' });

  // Check duplicates before creating account
  const dup = await checkDuplicates(rq.email, rq.phone);
    if (dup.duplicate) return res.status(409).json({ error: 'An account with this ' + dup.field + ' already exists.' });

  const loginCode = await generateUniqueCode();
    const expires = new Date(Date.now() + 7*24*60*60*1000); // 7 days
  let newUser;

  if (rq.account_type === 'Coach') {
    const { data, error } = await supabase.from('coaches').insert({
      coach_id: generateId('CHC'), first_name: rq.first_name, last_name: rq.last_name,
      email: rq.email, phone: rq.phone||null, team_name: rq.team_name,
      role_at_club: rq.role_at_club||'Coach',
      team_county: rq.team_county||null, team_league: rq.team_league||null,
      data_policy_agreed: true, login_code: loginCode, login_code_expires: expires,
      is_active: true, is_super_user: false, registration_complete: false
    }).select().single();
    if (error) { safeLog('[Approve coach insert]', error); throw error; }
    newUser = data;
  } else if (rq.account_type === 'Scout') {
    const uploadedDocs = uploadedDocuments(rq);
    if ((rq.verification_status || '') !== 'documents_submitted') {
      return res.status(400).json({ error: 'Scout approval blocked. Verification documents must be uploaded before approval.' });
    }
    if (!paymentLink || !/^https?:\/\//i.test(String(paymentLink).trim())) {
      return res.status(400).json({ error: 'A valid payment link is required before sending the payment email.' });
    }
    const review = { ...(safeguardingReview || {}), documents: uploadedDocs };
    const reviewValidation = validateScoutSafeguardingReview(review);
    if (!reviewValidation.ok) return res.status(400).json({ error: reviewValidation.error });
    const plan = subscriptionPlan||'Core';
    const paymentResult = await email.sendScoutPaymentRequired({
      to: rq.email,
      firstName: rq.first_name,
      planName: plan,
      paymentLink: String(paymentLink).trim()
    }).catch(e => ({ success: false, error: e.message }));
    if (!paymentResult || !paymentResult.success) {
      return res.status(502).json({
        error: 'SendGrid did not accept the scout payment email. Registration is still awaiting approval.',
        details: paymentResult && (paymentResult.error || paymentResult.details) || 'Unknown email error'
      });
    }
    await supabase.from('registration_requests').update({
      verification_status: 'verified_awaiting_payment',
      payment_plan: plan,
      payment_link: String(paymentLink).trim(),
      payment_email_sent_at: new Date(),
      reviewed_by: req.user.email||'stratex',
      reviewed_at: new Date(),
      safeguarding_review: review,
      safeguarding_documents: uploadedDocs
    }).eq('id', req.params.id);
    await supabase.from('scout_verification_reviews').insert({
      registration_request_id: rq.id,
      scout_id: null,
      reviewed_by: req.user.id || null,
      checklist: review.checklist || {},
      documents: uploadedDocs,
      dbs_certificate_number: review.dbsCertificateNumber || null,
      dbs_issue_date: review.dbsIssueDate || null,
      dbs_level: review.dbsLevel || null,
      status: 'verified_awaiting_payment',
      notes: review.notes || null
    });
    return res.json({ message: 'Scout verified. Payment email sent.', paymentEmailSent: true, emailTemplate: paymentResult.template || null });
  } else {
    return res.status(400).json({ error: 'Unsupported account type: ' + rq.account_type });
  }

  // Build complete-registration link
  const baseUrl = config.brandUrl || 'https://scoutlink.app';
    const completeLink = baseUrl + '/complete-registration?code=' + loginCode + '&email=' + encodeURIComponent(rq.email) + '&type=' + rq.account_type;

  // Send approved email using the central Registration Approved template.
  const emailResult = await email.sendRegApproved({
    to: rq.email, firstName: rq.first_name, loginCode,
    accountType: rq.account_type, completeLink, email: rq.email
  }).catch(e => ({ success: false, error: e.message }));
  if (!emailResult || !emailResult.success) {
    await removeCreatedUser(rq.account_type, newUser && newUser.id);
    console.error('[Approve email failed; rolled back]', { error: emailResult && emailResult.error, template: emailResult && emailResult.template });
    return res.status(502).json({
      error: 'SendGrid did not accept the approval email. Registration is still pending.',
      details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error'
    });
  }

  await supabase.from('registration_requests').update({
    status: 'approved', login_code: loginCode,
    reviewed_by: req.user.email||'stratex', reviewed_at: new Date(),
    safeguarding_review: safeguardingReview || {},
    safeguarding_documents: safeguardingReview && safeguardingReview.documents ? safeguardingReview.documents : []
  }).eq('id', req.params.id);

  if (rq.account_type === 'Scout') {
    await supabase.from('scout_verification_reviews').insert({
      registration_request_id: rq.id,
      scout_id: newUser.id,
      reviewed_by: req.user.id || null,
      checklist: safeguardingReview.checklist || {},
      documents: safeguardingReview.documents || [],
      dbs_certificate_number: safeguardingReview.dbsCertificateNumber || null,
      dbs_issue_date: safeguardingReview.dbsIssueDate || null,
      dbs_level: safeguardingReview.dbsLevel || null,
      status: 'approved',
      notes: safeguardingReview.notes || null
    });
  }

  res.json({ message: 'Approved. Complete-registration email sent.', userId: newUser.id, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
  } catch(err) { safeLog('[Approve]', err); res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

router.post('/:id/payment-received', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data: rq, error: rqErr } = await supabase.from('registration_requests').select('*').eq('id', req.params.id).single();
    if (rqErr || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.account_type !== 'Scout') return res.status(400).json({ error: 'Payment activation is only used for scout registrations.' });
    if (rq.status !== 'pending') return res.status(400).json({ error: 'Registration is not pending activation.' });
    if ((rq.verification_status || '') !== 'verified_awaiting_payment') return res.status(400).json({ error: 'Scout must be verified and awaiting payment before activation.' });

    const dup = await checkDuplicates(rq.email, rq.phone);
    if (dup.duplicate) return res.status(409).json({ error: 'An account with this ' + dup.field + ' already exists.' });

    const plan = rq.payment_plan || req.body.subscriptionPlan || 'Core';
    const limits = limitsForPlan(plan);
    const loginCode = await generateUniqueCode();
    const expires = new Date(Date.now() + 7*24*60*60*1000);
    const { data: newUser, error: insertError } = await supabase.from('scouts').insert({
      scout_id: generateId('SCT'), first_name: rq.first_name, last_name: rq.last_name,
      email: rq.email, phone: rq.phone||null,
      club_name: rq.scout_club||null, club_league: rq.scout_league||null,
      login_code: loginCode, login_code_expires: expires, is_active: true,
      preferences_set: false, is_super_user: false, registration_complete: false,
      subscription_plan: plan, plan_start: new Date(),
      plan_end: new Date(Date.now()+365*24*60*60*1000),
      exports_remaining: limits.exports, predictions_remaining: limits.predictions,
      interests_remaining: limits.interests
    }).select().single();
    if (insertError) throw insertError;

    const baseUrl = config.brandUrl || 'https://scoutlink.app';
    const completeLink = baseUrl + '/complete-registration?code=' + loginCode + '&email=' + encodeURIComponent(rq.email) + '&type=Scout';
    const emailResult = await email.sendRegApproved({
      to: rq.email, firstName: rq.first_name, loginCode,
      accountType: 'Scout', completeLink, email: rq.email
    }).catch(e => ({ success: false, error: e.message }));
    if (!emailResult || !emailResult.success) {
      await removeCreatedUser('Scout', newUser && newUser.id);
      return res.status(502).json({
        error: 'SendGrid did not accept the login code email. Scout account was not activated.',
        details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error'
      });
    }

    await supabase.from('registration_requests').update({
      status: 'approved',
      verification_status: 'activated',
      login_code: loginCode,
      payment_received_at: new Date(),
      activated_at: new Date(),
      reviewed_by: req.user.email||'stratex',
      reviewed_at: new Date()
    }).eq('id', rq.id);

    await supabase.from('scout_verification_reviews').insert({
      registration_request_id: rq.id,
      scout_id: newUser.id,
      reviewed_by: req.user.id || null,
      checklist: (rq.safeguarding_review && rq.safeguarding_review.checklist) || {},
      documents: uploadedDocuments(rq),
      dbs_certificate_number: rq.safeguarding_review && rq.safeguarding_review.dbsCertificateNumber || null,
      dbs_issue_date: rq.safeguarding_review && rq.safeguarding_review.dbsIssueDate || null,
      dbs_level: rq.safeguarding_review && rq.safeguarding_review.dbsLevel || null,
      status: 'approved',
      notes: rq.safeguarding_review && rq.safeguarding_review.notes || null
    });

    res.json({ message: 'Payment confirmed. Scout login code sent.', userId: newUser.id, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
  } catch (err) {
    safeLog('[Scout payment received]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Stratex: decline
router.post('/:id/decline', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { declineReason, customReason } = req.body;
    if (!declineReason) return res.status(400).json({ error: 'declineReason required', validReasons: DECLINE_REASONS });
    const { data: rq, error: rqErr } = await supabase.from('registration_requests').select('*').eq('id', req.params.id).single();
    if (rqErr || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.status !== 'pending') return res.status(400).json({ error: 'Registration is not pending' });
    const finalReason = declineReason === 'Other' ? (customReason||'Other') : declineReason;
    await supabase.from('registration_requests').update({
      status: 'declined', decline_reason: finalReason,
      reviewed_by: req.user.email||'stratex', reviewed_at: new Date()
    }).eq('id', req.params.id);
    await email.sendRegDeclined({ to: rq.email, firstName: rq.first_name, declineReason: finalReason, accountType: rq.account_type })
    .catch(e => console.error('[Decline] email failed:', e.message));
    res.json({ message: 'Declined and email sent.' });
  } catch(err) { safeLog('[Decline]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/decline-reasons', (_, res) => res.json(DECLINE_REASONS));
module.exports = router;

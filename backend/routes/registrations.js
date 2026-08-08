'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');
const email = require('../services/email');
const config = require('../config');
const { limitsForPlan } = require('../utils/scoutPlans');

const VERIFICATION_BUCKET = 'scout-verification-documents';
const requireRegistrationsAdmin = requireStratexAdminPermission(
  'registrations',
  'Registration review is restricted to authorised Stratex admins.'
);

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
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Upload PDF, JPG, PNG, DOC or DOCX files only.'));
    }
    cb(null, true);
  }
});

const DECLINE_REASONS = [
  'Unable to verify football team',
  'Unable to verify professional club affiliation',
  'Insufficient information provided',
  'Cannot verify age eligibility',
  'Duplicate registration',
  'Account suspended',
  'Other'
];

function validateScoutSafeguardingReview(review) {
  review = review || {};
  const checklist = review.checklist || {};
  const required = [
    'identity',
    'dbs',
    'faCredentials',
    'clubAssociation',
    'contactDetails',
    'noSafeguardingFlags',
    'termsAccepted'
  ];
  const missing = required.filter(k => checklist[k] !== true);
  const docs = Array.isArray(review.documents) ? review.documents : [];
  const dbsDate = review.dbsIssueDate ? new Date(review.dbsIssueDate) : null;
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
  if (missing.length) return { ok:false, error:'Scout approval blocked. Complete every safeguarding gate: ' + missing.join(', ') };
  if (!review.dbsCertificateNumber) return { ok:false, error:'DBS certificate number is required.' };
  if (!dbsDate || Number.isNaN(dbsDate.getTime())) return { ok:false, error:'DBS issue date is required.' };
  if (dbsDate < threeYearsAgo) return { ok:false, error:'Enhanced DBS issue date must be within the last three years.' };
  if (String(review.dbsLevel || '').toLowerCase() !== 'enhanced') return { ok:false, error:'DBS level must be enhanced.' };
  if (!docs.length) return { ok:false, error:'Attach at least one safeguarding document before approving a scout.' };
  return { ok:true };
}

async function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  while (attempts < 20) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const [s,c,p,stx] = await Promise.all([
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

async function checkDuplicates(emailAddr, phone) {
  const em = String(emailAddr || '').toLowerCase().trim();
  const tables = ['scouts','coaches','players','stratex'];
  for (const t of tables) {
    const { data:eRow } = await supabase.from(t).select('id').eq('email', em).maybeSingle();
    if (eRow) return { duplicate:true, field:'email', table:t };
  }
  if (phone && String(phone).trim()) {
    const ph = String(phone).trim();
    for (const t of ['scouts','coaches']) {
      const { data:pRow } = await supabase.from(t).select('id').eq('phone', ph).maybeSingle();
      if (pRow) return { duplicate:true, field:'phone', table:t };
    }
  }
  return { duplicate:false };
}

async function checkPendingDuplicate(emailAddr) {
  const em = String(emailAddr || '').toLowerCase().trim();
  const { data } = await supabase.from('registration_requests')
    .select('id,status').eq('email', em).eq('status','pending').maybeSingle();
  return !!data;
}

function titleCase(value) {
  return String(value || '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function registrationNameParts(body) {
  const suppliedFirst = String(body.firstName || '').trim();
  const suppliedLast = String(body.lastName || '').trim();
  if (suppliedFirst && suppliedLast) return { firstName:suppliedFirst, lastName:suppliedLast };
  const parts = String(body.fullName || '').trim().split(/\s+/).filter(Boolean);
  return { firstName:parts.shift() || '', lastName:parts.join(' ') || '' };
}

function isValidEmail(emailAddr) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

function scoutLinkBase() {
  return String(
    process.env.SCOUTLINK_URL ||
    config.brandUrl ||
    'https://www.scoutlink.app'
  ).replace(/\/+$/, '');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function verificationLink(token) {
  return scoutLinkBase() + '/scout-verification?token=' + encodeURIComponent(token);
}

function sanitizeFileName(value) {
  return String(value || 'document')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'document';
}

function uploadedDocuments(row) {
  return Array.isArray(row && row.safeguarding_documents) ? row.safeguarding_documents : [];
}

function safeLog(label, err) {
  console.error(label, { code:err && err.code, message:err && err.message });
}

function normalizeDeclarations(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function validateCoachDeclarations(declarations) {
  const required = ['authorised','under18Permissions','disputeRemoval','mediaPermission'];
  return required.every(key => declarations[key] === true);
}

function validateScoutDeclarations(declarations) {
  return declarations.legitimateCapacity === true &&
    declarations.responsibleAccess === true;
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
    firstName:request.first_name,
    lastName:request.last_name,
    email:request.email,
    requestId:request.id
  }).catch(e => ({ success:false, error:e.message }));
  if (!applicant || !applicant.success) {
    return { success:false, stage:'applicant confirmation', result:applicant };
  }

  let verification = null;
  if (accountType === 'Scout') {
    verification = await email.sendScoutVerificationRequired({
      to:request.email,
      firstName:request.first_name,
      verificationLink:request.verificationLink
    }).catch(e => ({ success:false, error:e.message }));
    if (!verification || !verification.success) {
      return { success:false, stage:'scout verification email', result:verification };
    }
  }

  const admin = accountType === 'Coach'
    ? await email.sendCoachRegAlert(alertPayload).catch(e => ({ success:false, error:e.message }))
    : await email.sendScoutRegAlert(alertPayload).catch(e => ({ success:false, error:e.message }));
  if (!admin || !admin.success) {
    return { success:false, stage:'Stratex admin alert', result:admin };
  }
  return { success:true, applicant, verification, admin };
}

router.post('/coach', async (req, res) => {
  try {
    const names = registrationNameParts(req.body);
    const {
      emailAddr, phone, country, primaryRole, preferredContactMethod,
      teamName, teamType, league, primaryAgeGroup, county,
      averageClubSize, teamWebsite, numberOfTeams, dataPolicyAgreed
    } = req.body;
    const declarations = normalizeDeclarations(req.body.declarations);

    if (!names.firstName || !names.lastName || !emailAddr || !teamName) {
      return res.status(400).json({ error:'Full name, email address and club or team name are required.' });
    }
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error:'Please enter a valid email address.' });
    if (!dataPolicyAgreed) return res.status(400).json({ error:'Data policy agreement required' });
    if (!validateCoachDeclarations(declarations)) {
      return res.status(400).json({ error:'All Coach declarations are required.' });
    }

    const dup = await checkDuplicates(emailAddr, phone);
    if (dup.duplicate) {
      return res.status(409).json({
        error:dup.field === 'email'
          ? 'This email address is already registered on ScoutLink.'
          : 'This phone number is already registered on ScoutLink.'
      });
    }
    if (await checkPendingDuplicate(emailAddr)) {
      return res.status(409).json({ error:'A registration request is already pending for this email.' });
    }

    const { data:request, error } = await supabase.from('registration_requests').insert({
      account_type:'Coach',
      first_name:names.firstName,
      last_name:names.lastName,
      email:String(emailAddr).toLowerCase().trim(),
      phone:phone || null,
      country:country || null,
      preferred_contact_method:preferredContactMethod || 'Email',
      team_name:teamName,
      team_type:teamType || null,
      team_county:county ? titleCase(county) : null,
      team_league:league || null,
      primary_age_group:primaryAgeGroup || null,
      average_club_size:averageClubSize || null,
      team_website:teamWebsite || null,
      number_of_teams:numberOfTeams || null,
      role_at_club:primaryRole || 'Coach',
      data_policy_agreed:true,
      data_policy_agreed_at:new Date(),
      status:'pending',
      registration_version:'registration-v5',
      declaration_version:req.body.declarationVersion || 'coach-declarations-v2-2026-07',
      activity_notice_version:req.body.activityNoticeVersion || 'platform-activity-v1-2026-07',
      declarations
    }).select().single();
    if (error) throw error;

    const emailResult = await sendRegistrationEmails({
      accountType:'Coach',
      request,
      alertPayload:{
        firstName:names.firstName,
        lastName:names.lastName,
        email:emailAddr,
        teamName,
        county,
        league,
        roleAtClub:primaryRole,
        requestId:request.id
      }
    });

    if (!emailResult.success) {
      await removeRegistrationRequest(request.id);
      return res.status(502).json({
        error:'Registration email failed at ' + emailResult.stage + '. Please try again.',
        details:emailResult.result && (emailResult.result.error || emailResult.result.details) || 'Unknown email error'
      });
    }

    res.status(201).json({
      message:'Registration submitted. We have emailed confirmation and will review the Coach request shortly.',
      requestId:request.id,
      emailSent:true
    });
  } catch(err) {
    safeLog('[Registration coach]', err);
    res.status(500).json({ error:'Internal server error' });
  }
});

router.post('/scout', async (req, res) => {
  try {
    const names = registrationNameParts(req.body);
    const {
      emailAddr, phone, country, currentScoutingRole, preferredContactMethod,
      scoutClub, organisationType, scoutingTeamName, primaryScoutingRegion,
      organisationWebsite, expectedScoutUsers, preferredScoutPlan,
      expectedSearchActivity, dataPolicyAgreed
    } = req.body;
    const declarations = normalizeDeclarations(req.body.declarations);

    if (!names.firstName || !names.lastName || !emailAddr || !scoutClub) {
      return res.status(400).json({ error:'Full legal name, professional email and organisation are required.' });
    }
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error:'Please enter a valid email address.' });
    if (!dataPolicyAgreed) return res.status(400).json({ error:'Data policy agreement required' });
    if (!validateScoutDeclarations(declarations)) {
      return res.status(400).json({ error:'Both Scout declarations are required.' });
    }

    const dup = await checkDuplicates(emailAddr, phone);
    if (dup.duplicate) {
      return res.status(409).json({
        error:dup.field === 'email'
          ? 'This email address is already registered on ScoutLink.'
          : 'This phone number is already registered on ScoutLink.'
      });
    }
    if (await checkPendingDuplicate(emailAddr)) {
      return res.status(409).json({ error:'A registration request is already pending for this email.' });
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data:request, error } = await supabase.from('registration_requests').insert({
      account_type:'Scout',
      first_name:names.firstName,
      last_name:names.lastName,
      email:String(emailAddr).toLowerCase().trim(),
      phone:phone || null,
      country:country || null,
      preferred_contact_method:preferredContactMethod || 'Email',
      scout_club:scoutClub,
      organisation_type:organisationType || null,
      scouting_team_name:scoutingTeamName || null,
      primary_scouting_region:primaryScoutingRegion || null,
      organisation_website:organisationWebsite || null,
      expected_scout_users:expectedScoutUsers || null,
      preferred_scout_plan:preferredScoutPlan || 'Plus',
      expected_search_activity:expectedSearchActivity || null,
      current_scouting_role:currentScoutingRole || null,
      role_at_club:currentScoutingRole || 'Scout',
      data_policy_agreed:true,
      data_policy_agreed_at:new Date(),
      status:'pending',
      registration_version:'registration-v5',
      declaration_version:req.body.declarationVersion || 'scout-declarations-v2-2026-07',
      activity_notice_version:req.body.activityNoticeVersion || 'platform-activity-v1-2026-07',
      declarations,
      verification_status:'awaiting_documents',
      verification_token_hash:hashToken(token),
      verification_token_expires_at:expiresAt,
      verification_link_sent_at:new Date()
    }).select().single();
    if (error) throw error;

    request.verificationLink = verificationLink(token);

    const emailResult = await sendRegistrationEmails({
      accountType:'Scout',
      request,
      alertPayload:{
        firstName:names.firstName,
        lastName:names.lastName,
        email:emailAddr,
        scoutClub,
        scoutLeague:primaryScoutingRegion,
        preferredScoutPlan,
        requestId:request.id
      }
    });

    if (!emailResult.success) {
      await removeRegistrationRequest(request.id);
      return res.status(502).json({
        error:'Registration email failed at ' + emailResult.stage + '. Please try again.',
        details:emailResult.result && (emailResult.result.error || emailResult.result.details) || 'Unknown email error'
      });
    }

    res.status(201).json({
      message:'Scout access application submitted. We have emailed the secure verification link. No payment has started.',
      requestId:request.id,
      emailSent:true
    });
  } catch(err) {
    safeLog('[Registration scout]', err);
    res.status(500).json({ error:'Internal server error' });
  }
});

/*
 * Public V5 self-service verification reissue.
 * The response is deliberately generic so it does not disclose whether an
 * email address has a pending Scout application.
 */
router.post('/scout-verification/resend', async (req, res) => {
  const generic = {
    message:'If a pending Scout application exists for that email, a fresh verification link has been sent.'
  };
  try {
    const applicantEmail = String(req.body.email || '').toLowerCase().trim();
    if (!isValidEmail(applicantEmail)) return res.json(generic);

    const { data:rq, error } = await supabase.from('registration_requests')
      .select('*')
      .eq('account_type','Scout')
      .eq('email',applicantEmail)
      .eq('status','pending')
      .maybeSingle();
    if (error || !rq) return res.json(generic);

    const status = rq.verification_status || 'awaiting_documents';
    if (status !== 'awaiting_documents') return res.json(generic);

    const previous = {
      verification_token_hash:rq.verification_token_hash,
      verification_token_expires_at:rq.verification_token_expires_at,
      verification_link_sent_at:rq.verification_link_sent_at
    };
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error:updateError } = await supabase.from('registration_requests').update({
      verification_token_hash:hashToken(token),
      verification_token_expires_at:expiresAt,
      verification_link_sent_at:new Date(),
      verification_link_resent_at:new Date()
    }).eq('id',rq.id);
    if (updateError) throw updateError;

    const sent = await email.sendScoutVerificationRequired({
      to:rq.email,
      firstName:rq.first_name,
      verificationLink:verificationLink(token)
    }).catch(err => ({ success:false, error:err.message }));

    if (!sent || !sent.success) {
      await supabase.from('registration_requests').update(previous).eq('id',rq.id);
      safeLog('[Public Scout verification resend email]', new Error(sent && sent.error || 'Email not accepted'));
    }
    return res.json(generic);
  } catch(err) {
    safeLog('[Public Scout verification resend]', err);
    return res.json(generic);
  }
});

async function requestByVerificationToken(token) {
  const tokenHash = hashToken(token);
  const { data, error } = await supabase.from('registration_requests')
    .select('*')
    .eq('account_type','Scout')
    .eq('verification_token_hash',tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error:'Invalid verification link' };
  if (data.status !== 'pending') return { error:'This verification link is no longer active.' };
  if (data.verification_token_expires_at && new Date(data.verification_token_expires_at).getTime() < Date.now()) {
    return { error:'This verification link has expired.' };
  }
  return { data };
}

router.get('/scout-verification/:token', async (req, res) => {
  try {
    const result = await requestByVerificationToken(req.params.token);
    if (result.error) return res.status(404).json({ error:result.error });
    const rq = result.data;
    res.json({
      firstName:rq.first_name,
      lastName:rq.last_name,
      scoutClub:rq.scout_club,
      verificationStatus:rq.verification_status || 'awaiting_documents',
      documentsUploaded:uploadedDocuments(rq).length,
      expiresAt:rq.verification_token_expires_at
    });
  } catch(err) {
    safeLog('[Scout verification lookup]',err);
    res.status(500).json({ error:'Internal server error' });
  }
});

router.post('/scout-verification/:token', (req,res) => {
  verificationUpload.fields([
    { name:'safeguardingEvidence', maxCount:1 },
    { name:'proofOfId', maxCount:1 }
  ])(req,res,async uploadErr => {
    if (uploadErr) return res.status(400).json({ error:uploadErr.message });
    try {
      const result = await requestByVerificationToken(req.params.token);
      if (result.error) return res.status(404).json({ error:result.error });
      const rq = result.data;
      const files = {
        safeguardingEvidence:req.files && req.files.safeguardingEvidence && req.files.safeguardingEvidence[0],
        proofOfId:req.files && req.files.proofOfId && req.files.proofOfId[0]
      };
      if (!files.safeguardingEvidence || !files.proofOfId) {
        return res.status(400).json({ error:'Safeguarding evidence and proof of ID are required.' });
      }
      const docs = [];
      for (const kind of Object.keys(files)) {
        const file = files[kind];
        const filePath = 'registration-requests/' + rq.id + '/' + kind + '-' + Date.now() + '-' + sanitizeFileName(file.originalname);
        const { error:uploadError } = await supabase.storage.from(VERIFICATION_BUCKET).upload(filePath,file.buffer,{
          contentType:file.mimetype,
          upsert:false
        });
        if (uploadError) throw uploadError;
        docs.push({
          kind,
          bucket:VERIFICATION_BUCKET,
          filePath,
          fileName:file.originalname,
          contentType:file.mimetype,
          size:file.size,
          uploadedAt:new Date().toISOString()
        });
      }
      const merged = uploadedDocuments(rq).concat(docs);
      const { error:updateError } = await supabase.from('registration_requests').update({
        safeguarding_documents:merged,
        verification_uploaded_at:new Date(),
        verification_status:'documents_submitted'
      }).eq('id',rq.id);
      if (updateError) throw updateError;
      res.json({
        message:'Verification documents received. Stratex will review them and email the next step.',
        documentsUploaded:merged.length
      });
    } catch(err) {
      safeLog('[Scout verification upload]',err);
      res.status(500).json({ error:'Internal server error' });
    }
  });
});

router.get('/', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { status='pending', accountType, page=1, limit=50 } = req.query;
    let q = supabase.from('registration_requests').select('*',{ count:'exact' });
    if (status) q = q.eq('status',status);
    if (accountType) q = q.eq('account_type',accountType);
    const off=(Number(page)-1)*Number(limit);
    q=q.order('created_at',{ascending:false}).range(off,off+Number(limit)-1);
    const { data,error,count }=await q;
    if(error)throw error;
    res.json({ data:data||[], total:count||0, page:Number(page), limit:Number(limit) });
  } catch(err) {
    safeLog('[Registration list]',err);
    res.status(500).json({ error:'Internal server error', details:err.message });
  }
});

router.get('/:id/verification-documents', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { data:rq,error }=await supabase.from('registration_requests')
      .select('id,account_type,safeguarding_documents').eq('id',req.params.id).single();
    if(error||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.account_type!=='Scout')return res.status(400).json({ error:'Verification documents are only used for scout requests.' });
    const docs=uploadedDocuments(rq);
    const signed=[];
    for(const doc of docs){
      if(!doc.filePath)continue;
      const { data,error:signedErr }=await supabase.storage.from(doc.bucket||VERIFICATION_BUCKET).createSignedUrl(doc.filePath,60*10);
      if(signedErr)throw signedErr;
      signed.push({ ...doc, signedUrl:data&&data.signedUrl });
    }
    res.json({ data:signed });
  } catch(err) {
    safeLog('[Scout verification documents]',err);
    res.status(500).json({ error:'Internal server error' });
  }
});

router.post('/:id/request-information', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const message=String(req.body.message||'').trim();
    if(message.length<10||message.length>2000){
      return res.status(400).json({ error:'Enter a clear information request between 10 and 2,000 characters.' });
    }
    const { data:rq,error }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(error||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.status!=='pending')return res.status(400).json({ error:'Information can only be requested while the registration is pending.' });

    const emailResult=await email.sendNotification({
      to:rq.email,
      firstName:rq.first_name,
      notificationTitle:'More information is needed for your ScoutLink registration',
      notificationBody:message,
      notificationTypeLabel:'Registration update',
      actionLabel:'',
      actionUrl:''
    }).catch(err=>({success:false,error:err.message}));

    if(!emailResult||!emailResult.success){
      return res.status(502).json({
        error:'The information request email was not accepted.',
        details:emailResult&&(emailResult.error||emailResult.details)||'Unknown email error'
      });
    }

    const { error:updateError }=await supabase.from('registration_requests').update({
      information_request_message:message,
      information_requested_at:new Date(),
      information_requested_by:req.user.email||'stratex'
    }).eq('id',rq.id);
    if(updateError)throw updateError;
    res.json({ message:'Information request sent to the applicant.' });
  } catch(err) {
    safeLog('[Registration request information]',err);
    res.status(500).json({ error:'Internal server error',details:err.message });
  }
});

router.post('/:id/resend-verification', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { data:rq,error }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(error||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.account_type!=='Scout')return res.status(400).json({ error:'Verification links are only used for Scout registrations.' });
    if(rq.status!=='pending')return res.status(400).json({ error:'This Scout registration is no longer pending.' });
    if(!['awaiting_documents','documents_submitted'].includes(rq.verification_status||'awaiting_documents')){
      return res.status(400).json({ error:'A verification link is not required at the current Scout stage.' });
    }

    const previous={
      verification_token_hash:rq.verification_token_hash,
      verification_token_expires_at:rq.verification_token_expires_at,
      verification_link_sent_at:rq.verification_link_sent_at
    };
    const verificationToken=generateVerificationToken();
    const expiresAt=new Date(Date.now()+7*24*60*60*1000);
    const { error:tokenError }=await supabase.from('registration_requests').update({
      verification_token_hash:hashToken(verificationToken),
      verification_token_expires_at:expiresAt,
      verification_link_sent_at:new Date(),
      verification_link_resent_at:new Date()
    }).eq('id',rq.id);
    if(tokenError)throw tokenError;

    const emailResult=await email.sendScoutVerificationRequired({
      to:rq.email,
      firstName:rq.first_name,
      verificationLink:verificationLink(verificationToken)
    }).catch(err=>({success:false,error:err.message}));

    if(!emailResult||!emailResult.success){
      await supabase.from('registration_requests').update(previous).eq('id',rq.id);
      return res.status(502).json({
        error:'The verification email was not accepted.',
        details:emailResult&&(emailResult.error||emailResult.details)||'Unknown email error'
      });
    }
    res.json({ message:'A new Scout verification link has been sent.' });
  } catch(err) {
    safeLog('[Resend Scout verification]',err);
    res.status(500).json({ error:'Internal server error',details:err.message });
  }
});

router.post('/:id/resend-payment', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { data:rq,error }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(error||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.account_type!=='Scout')return res.status(400).json({ error:'Payment requests are only used for Scout registrations.' });
    if(rq.status!=='pending'||rq.verification_status!=='verified_awaiting_payment'){
      return res.status(400).json({ error:'The Scout must be verified and awaiting payment.' });
    }
    if(!rq.payment_link||!/^https?:\/\//i.test(rq.payment_link)){
      return res.status(400).json({ error:'The saved payment link is invalid.' });
    }

    const emailResult=await email.sendScoutPaymentRequired({
      to:rq.email,
      firstName:rq.first_name,
      planName:rq.payment_plan||'Core',
      paymentLink:rq.payment_link
    }).catch(err=>({success:false,error:err.message}));

    if(!emailResult||!emailResult.success){
      return res.status(502).json({
        error:'The payment email was not accepted.',
        details:emailResult&&(emailResult.error||emailResult.details)||'Unknown email error'
      });
    }

    const { error:updateError }=await supabase.from('registration_requests').update({
      payment_email_sent_at:new Date(),
      payment_email_resent_at:new Date(),
      reviewed_by:req.user.email||'stratex',
      reviewed_at:new Date()
    }).eq('id',rq.id);
    if(updateError)throw updateError;
    res.json({ message:'The Scout payment email has been sent again.' });
  } catch(err) {
    safeLog('[Resend Scout payment]',err);
    res.status(500).json({ error:'Internal server error',details:err.message });
  }
});

router.post('/:id/approve', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { subscriptionPlan,safeguardingReview,paymentLink }=req.body;
    const { data:request,error:requestError }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(requestError||!request)return res.status(404).json({ error:'Registration request not found' });
    if(request.status!=='pending')return res.status(400).json({ error:'Registration is not pending' });

    const dup=await checkDuplicates(request.email,request.phone);
    if(dup.duplicate)return res.status(409).json({ error:'An account with this '+dup.field+' already exists.' });

    if(request.account_type==='Coach'){
      const loginCode=await generateUniqueCode();
      const expires=new Date(Date.now()+7*24*60*60*1000);
      const { data:newUser,error:insertError }=await supabase.from('coaches').insert({
        coach_id:generateId('CHC'),
        first_name:request.first_name,
        last_name:request.last_name,
        email:request.email,
        phone:request.phone||null,
        team_name:request.team_name,
        role_at_club:request.role_at_club||'Coach',
        team_county:request.team_county||null,
        team_league:request.team_league||null,
        data_policy_agreed:true,
        login_code:loginCode,
        login_code_expires:expires,
        is_active:true,
        is_super_user:false,
        registration_complete:false
      }).select().single();
      if(insertError)throw insertError;

      const baseUrl=config.brandUrl||'https://scoutlink.app';
      const completeLink=baseUrl+'/complete-registration?code='+loginCode+'&email='+encodeURIComponent(request.email)+'&type=Coach';
      const emailResult=await email.sendRegApproved({
        to:request.email,
        firstName:request.first_name,
        loginCode,
        accountType:'Coach',
        completeLink,
        email:request.email
      }).catch(error=>({success:false,error:error.message}));

      if(!emailResult||!emailResult.success){
        await removeCreatedUser('Coach',newUser&&newUser.id);
        return res.status(502).json({
          error:'SendGrid did not accept the approval email. Registration is still pending.',
          details:emailResult&&(emailResult.error||emailResult.details)||'Unknown email error'
        });
      }

      const { error:updateError }=await supabase.from('registration_requests').update({
        status:'approved',
        verification_status:'activated',
        login_code:loginCode,
        activated_at:new Date(),
        linked_account_id:String(newUser.id),
        linked_account_type:'Coach',
        reviewed_by:req.user.email||'stratex',
        reviewed_at:new Date()
      }).eq('id',request.id);
      if(updateError)throw updateError;

      return res.json({
        message:'Coach approved. Complete-registration email sent.',
        userId:newUser.id,
        loginCode,
        completeLink,
        emailSent:true,
        emailTemplate:emailResult.template||null
      });
    }

    if(request.account_type!=='Scout'){
      return res.status(400).json({ error:'Unsupported account type: '+request.account_type });
    }
    if(request.verification_status!=='documents_submitted'){
      return res.status(400).json({ error:'Scout verification documents must be submitted before review.' });
    }
    if(!paymentLink||!/^https:\/\//i.test(String(paymentLink).trim())){
      return res.status(400).json({ error:'A secure payment link beginning with https:// is required.' });
    }

    const uploadedDocs=uploadedDocuments(request);
    const review={...(safeguardingReview||{}),documents:uploadedDocs};
    const validation=validateScoutSafeguardingReview(review);
    if(!validation.ok)return res.status(400).json({ error:validation.error });

    const plan=subscriptionPlan||request.preferred_scout_plan||'Core';
    const paymentResult=await email.sendScoutPaymentRequired({
      to:request.email,
      firstName:request.first_name,
      planName:plan,
      paymentLink:String(paymentLink).trim()
    }).catch(error=>({success:false,error:error.message}));

    if(!paymentResult||!paymentResult.success){
      return res.status(502).json({
        error:'SendGrid did not accept the Scout payment email. The registration remains ready for review.',
        details:paymentResult&&(paymentResult.error||paymentResult.details)||'Unknown email error'
      });
    }

    const { error:updateError }=await supabase.from('registration_requests').update({
      status:'pending',
      verification_status:'verified_awaiting_payment',
      payment_plan:plan,
      payment_link:String(paymentLink).trim(),
      payment_email_sent_at:new Date(),
      safeguarding_review:review,
      safeguarding_documents:uploadedDocs,
      reviewed_by:req.user.email||'stratex',
      reviewed_at:new Date()
    }).eq('id',request.id);
    if(updateError)throw updateError;

    await supabase.from('scout_verification_reviews').insert({
      registration_request_id:request.id,
      scout_id:null,
      reviewed_by:req.user.id||null,
      checklist:review.checklist||{},
      documents:uploadedDocs,
      dbs_certificate_number:review.dbsCertificateNumber||null,
      dbs_issue_date:review.dbsIssueDate||null,
      dbs_level:review.dbsLevel||null,
      status:'verified_awaiting_payment',
      notes:review.notes||null
    });

    return res.json({
      message:'Scout verified. Payment email sent. The Scout account will be created only after payment is confirmed.',
      paymentEmailSent:true,
      plan,
      emailTemplate:paymentResult.template||null
    });
  } catch(err) {
    safeLog('[Approve registration]',err);
    res.status(500).json({ error:'Internal server error',details:err.message });
  }
});

router.post('/:id/payment-received', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { data:rq,error:rqErr }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(rqErr||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.account_type!=='Scout')return res.status(400).json({ error:'Payment activation is only used for scout registrations.' });
    if(rq.status!=='pending')return res.status(400).json({ error:'Registration is not pending activation.' });
    if((rq.verification_status||'')!=='verified_awaiting_payment'){
      return res.status(400).json({ error:'Scout must be verified and awaiting payment before activation.' });
    }

    const dup=await checkDuplicates(rq.email,rq.phone);
    if(dup.duplicate)return res.status(409).json({ error:'An account with this '+dup.field+' already exists.' });

    const plan=rq.payment_plan||rq.preferred_scout_plan||req.body.subscriptionPlan||'Core';
    const limits=limitsForPlan(plan);
    const loginCode=await generateUniqueCode();
    const expires=new Date(Date.now()+7*24*60*60*1000);
    const { data:newUser,error:insertError }=await supabase.from('scouts').insert({
      scout_id:generateId('SCT'),
      first_name:rq.first_name,
      last_name:rq.last_name,
      email:rq.email,
      phone:rq.phone||null,
      club_name:rq.scout_club||null,
      club_league:rq.scout_league||null,
      login_code:loginCode,
      login_code_expires:expires,
      is_active:true,
      preferences_set:false,
      is_super_user:false,
      registration_complete:false,
      subscription_plan:plan,
      plan_start:new Date(),
      plan_end:new Date(Date.now()+365*24*60*60*1000),
      exports_remaining:limits.exports,
      predictions_remaining:limits.predictions,
      interests_remaining:limits.interests
    }).select().single();
    if(insertError)throw insertError;

    const baseUrl=config.brandUrl||'https://scoutlink.app';
    const completeLink=baseUrl+'/confirm-password?code='+encodeURIComponent(loginCode)+'&email='+encodeURIComponent(rq.email)+'&type=Scout';
    const emailResult=await email.sendRegApproved({
      to:rq.email,
      firstName:rq.first_name,
      loginCode,
      accountType:'Scout',
      completeLink,
      email:rq.email
    }).catch(e=>({success:false,error:e.message}));

    if(!emailResult||!emailResult.success){
      await removeCreatedUser('Scout',newUser&&newUser.id);
      return res.status(502).json({
        error:'SendGrid did not accept the login code email. Scout account was not activated.',
        details:emailResult&&(emailResult.error||emailResult.details)||'Unknown email error'
      });
    }

    await supabase.from('registration_requests').update({
      status:'approved',
      verification_status:'activated',
      login_code:loginCode,
      payment_received_at:new Date(),
      activated_at:new Date(),
      linked_account_id:String(newUser.id),
      linked_account_type:'Scout',
      reviewed_by:req.user.email||'stratex',
      reviewed_at:new Date()
    }).eq('id',rq.id);

    await supabase.from('scout_verification_reviews').insert({
      registration_request_id:rq.id,
      scout_id:newUser.id,
      reviewed_by:req.user.id||null,
      checklist:(rq.safeguarding_review&&rq.safeguarding_review.checklist)||{},
      documents:uploadedDocuments(rq),
      dbs_certificate_number:rq.safeguarding_review&&rq.safeguarding_review.dbsCertificateNumber||null,
      dbs_issue_date:rq.safeguarding_review&&rq.safeguarding_review.dbsIssueDate||null,
      dbs_level:rq.safeguarding_review&&rq.safeguarding_review.dbsLevel||null,
      status:'approved',
      notes:rq.safeguarding_review&&rq.safeguarding_review.notes||null
    });

    res.json({
      message:'Payment confirmed. Scout login code sent.',
      userId:newUser.id,
      loginCode,
      completeLink,
      emailSent:true,
      emailTemplate:emailResult.template||null
    });
  } catch(err) {
    safeLog('[Scout payment received]',err);
    res.status(500).json({ error:'Internal server error',details:err.message });
  }
});

router.post('/:id/decline', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req,res) => {
  try {
    const { declineReason,customReason }=req.body;
    if(!declineReason)return res.status(400).json({ error:'declineReason required',validReasons:DECLINE_REASONS });
    const { data:rq,error:rqErr }=await supabase.from('registration_requests').select('*').eq('id',req.params.id).single();
    if(rqErr||!rq)return res.status(404).json({ error:'Registration request not found' });
    if(rq.status!=='pending')return res.status(400).json({ error:'Registration is not pending' });
    const finalReason=declineReason==='Other'?(customReason||'Other'):declineReason;
    await supabase.from('registration_requests').update({
      status:'declined',
      decline_reason:finalReason,
      reviewed_by:req.user.email||'stratex',
      reviewed_at:new Date()
    }).eq('id',req.params.id);
    await email.sendRegDeclined({
      to:rq.email,
      firstName:rq.first_name,
      declineReason:finalReason,
      accountType:rq.account_type
    }).catch(e=>console.error('[Decline] email failed:',e.message));
    res.json({ message:'Declined and email sent.' });
  } catch(err) {
    safeLog('[Decline]',err);
    res.status(500).json({ error:'Internal server error' });
  }
});

router.get('/decline-reasons', (_,res) => res.json(DECLINE_REASONS));

module.exports = router;

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const email = require('../services/email');

function cleanText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function publicError(res, code, message) {
  return res.status(code).json({ error: message });
}

function sourcePage(req, fallback) {
  return cleanText(req.body.sourcePage || req.body.source_page || req.get('referer') || fallback, 600) || fallback;
}

function isSafeguardingFlag(value) {
  return /safeguard|minor|child|inappropriate|false identity|urgent/i.test(value || '');
}

function safeEmailError(err) {
  return cleanText(err && err.message ? err.message : err, 260) || 'Email confirmation failed';
}

function displaySubmissionType(value) {
  const map = {
    contact_message: 'Contact Us',
    safeguarding_concern: 'Report a Concern',
    privacy_request: 'Privacy Request',
    parent_guardian_concern: 'Parent/Guardian Concern'
  };
  return map[value] || cleanText(value, 80) || 'Contact Us';
}

function confirmationSenderFor(type) {
  return type === 'safeguarding_concern' || type === 'parent_guardian_concern'
    ? email.sendTrustConcernConfirmation
    : email.sendTrustContactConfirmation;
}

async function saveTrustSubmission(input) {
  const payload = {
    submission_type: input.submission_type,
    priority: input.priority || 'standard',
    concern_category: input.concern_category || null,
    name: input.name || null,
    email: input.email,
    phone: input.phone || null,
    role: input.role || null,
    organisation: input.organisation || null,
    player_or_team_mentioned: input.player_or_team_mentioned || null,
    message: input.message,
    safeguarding_flag: !!input.safeguarding_flag,
    source_page: input.source_page || null,
    status: 'new',
    email_alert_sent: false,
  };

  let storageTable = 'trust_submissions';
  let { data, error } = await supabase
    .from('trust_submissions')
    .insert(payload)
    .select('id, submitted_at, created_at')
    .single();
  if (error) {
    const fallback = await supabase
      .from('audit_logs')
      .insert({
        actor_role: 'public',
        action: 'public_trust_submission_received',
        affected_table: 'trust_submissions',
        metadata: {
          ...payload,
          trust_submissions_error_code: error.code || null,
          trust_submissions_error_safe: safeEmailError(error),
        },
      })
      .select('id, created_at')
      .single();
    if (fallback.error) throw error;
    storageTable = 'audit_logs';
    data = fallback.data;
  }

  const confirmationPayload = {
    ...payload,
    id: data.id,
    submitted_at: data.submitted_at || data.created_at,
    submissionType: displaySubmissionType(payload.submission_type),
    contactReason: payload.submission_type === 'contact_message' ? payload.concern_category : null,
  };

  let confirmationResult = { success: false, skipped: true, error: 'Email confirmation not attempted' };
  try {
    confirmationResult = await confirmationSenderFor(payload.submission_type)(confirmationPayload);
  } catch (err) {
    confirmationResult = { success: false, error: safeEmailError(err) };
  }

  const updatePayload = {
    user_confirmation_sent: !!confirmationResult.success,
    user_confirmation_sent_at: confirmationResult.success ? new Date().toISOString() : null,
    user_confirmation_error_safe: confirmationResult.success ? null : safeEmailError(confirmationResult.error),
  };
  if (storageTable === 'trust_submissions') {
    const { error: updateError } = await supabase.from('trust_submissions').update(updatePayload).eq('id', data.id);
    if (updateError) {
      console.error('[Trust confirmation status]', { code: updateError.code, message: updateError.message });
    }
  } else {
    await supabase.from('audit_logs').insert({
      actor_role: 'system',
      action: 'public_trust_submission_user_confirmation_status',
      affected_table: 'audit_logs',
      affected_record_id: data.id,
      metadata: updatePayload,
    });
  }

  return {
    id: data.id,
    submittedAt: data.submitted_at || data.created_at,
    userConfirmationSent: !!confirmationResult.success,
    userConfirmationSkipped: !!confirmationResult.skipped,
    storageTable,
  };
}

router.post('/contact', async (req, res) => {
  try {
    const category = cleanText(req.body.category || req.body.reason || req.body.contactReason, 140) || 'General enquiry';
    const email = cleanEmail(req.body.email || req.body.contactEmail);
    const message = cleanText(req.body.message || req.body.details, 6000);
    if (!email || !message) {
      return publicError(res, 400, 'A valid email address and message are required.');
    }
    const saved = await saveTrustSubmission({
      submission_type: 'contact_message',
      priority: 'standard',
      concern_category: category,
      name: cleanText(req.body.name || req.body.contactName, 180) || null,
      email,
      phone: cleanText(req.body.phone || req.body.contactPhone, 80) || null,
      role: cleanText(req.body.role, 120) || null,
      organisation: cleanText(req.body.organisation || req.body.organization || req.body.team, 220) || null,
      message,
      source_page: sourcePage(req, '/contact'),
      safeguarding_flag: isSafeguardingFlag(category + ' ' + message),
    });
    res.status(201).json({
      message: 'Message sent. We will review it and respond if a reply is needed.',
      submissionId: saved.id,
      submittedAt: saved.submittedAt,
      userConfirmationSent: saved.userConfirmationSent,
    });
  } catch (err) {
    console.error('[Trust contact]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not send the message right now.' });
  }
});

router.post('/safeguarding-concerns', async (req, res) => {
  try {
    const concernType = cleanText(req.body.concernType || req.body.concern_type, 120);
    const description = cleanText(req.body.description, 6000);
    const contactEmail = cleanEmail(req.body.contactEmail || req.body.contact_email);
    if (!concernType || !description || !contactEmail) {
      return publicError(res, 400, 'Concern type, description and a valid contact email are required.');
    }
    const payload = {
      concern_type: concernType,
      person_or_account: cleanText(req.body.personOrAccount || req.body.person_or_account, 500) || null,
      player_or_team: cleanText(req.body.playerOrTeam || req.body.player_or_team, 500) || null,
      description,
      urgency: cleanText(req.body.urgency, 80) || 'standard',
      contact_name: cleanText(req.body.contactName || req.body.contact_name, 180) || null,
      contact_email: contactEmail,
      contact_phone: cleanText(req.body.contactPhone || req.body.contact_phone, 80) || null,
      source: 'public_form',
      status: 'new'
    };
    const { data, error } = await supabase
      .from('safeguarding_concerns')
      .insert(payload)
      .select('id, created_at')
      .single();
    if (error) throw error;
    const saved = await saveTrustSubmission({
      submission_type: 'safeguarding_concern',
      priority: /urgent/i.test(payload.urgency) || isSafeguardingFlag(concernType) ? 'urgent' : 'standard',
      concern_category: concernType,
      name: payload.contact_name,
      email: payload.contact_email,
      phone: payload.contact_phone,
      role: cleanText(req.body.role, 120) || null,
      organisation: cleanText(req.body.organisation || req.body.organization, 220) || null,
      player_or_team_mentioned: payload.player_or_team,
      message: description,
      source_page: sourcePage(req, '/report-a-concern'),
      safeguarding_flag: isSafeguardingFlag(concernType + ' ' + description),
    });
    res.status(201).json({
      message: 'Concern submitted. A restricted Stratex reviewer will assess it.',
      concernId: data.id,
      submissionId: saved.id,
      submittedAt: data.created_at,
      userConfirmationSent: saved.userConfirmationSent
    });
  } catch (err) {
    console.error('[Trust safeguarding concern]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not submit the concern right now.' });
  }
});

router.post('/privacy-requests', async (req, res) => {
  try {
    const requestType = cleanText(req.body.requestType || req.body.request_type, 120);
    const email = cleanEmail(req.body.email);
    const details = cleanText(req.body.details, 6000);
    if (!requestType || !email || !details) {
      return publicError(res, 400, 'Request type, details and a valid email address are required.');
    }
    const payload = {
      request_type: requestType,
      first_name: cleanText(req.body.firstName || req.body.first_name, 120) || null,
      last_name: cleanText(req.body.lastName || req.body.last_name, 120) || null,
      email,
      relationship_to_data: cleanText(req.body.relationshipToData || req.body.relationship_to_data, 160) || null,
      details,
      status: 'new',
      source: 'public_form'
    };
    const { data, error } = await supabase
      .from('privacy_requests')
      .insert(payload)
      .select('id, created_at')
      .single();
    if (error) throw error;
    const saved = await saveTrustSubmission({
      submission_type: 'privacy_request',
      priority: 'standard',
      concern_category: requestType,
      name: [payload.first_name, payload.last_name].filter(Boolean).join(' ') || null,
      email,
      role: payload.relationship_to_data,
      message: details,
      source_page: sourcePage(req, '/privacy-request'),
      safeguarding_flag: /safeguard/i.test(requestType + ' ' + details),
    });
    res.status(201).json({
      message: 'Privacy request submitted. We will review it and respond to the contact email provided.',
      requestId: data.id,
      submissionId: saved.id,
      submittedAt: data.created_at,
      userConfirmationSent: saved.userConfirmationSent
    });
  } catch (err) {
    console.error('[Trust privacy request]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not submit the privacy request right now.' });
  }
});

const TRUST_STATUSES = [
  'new',
  'investigating',
  'awaiting_more_information',
  'outcome_being_prepared',
  'outcome_sent',
  'resolved',
  'closed'
];

router.get('/submissions', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10) || 100, 1), 300);
    let q = supabase
      .from('trust_submissions')
      .select('id,submission_type,priority,concern_category,name,email,phone,role,organisation,player_or_team_mentioned,message,safeguarding_flag,source_page,submitted_at,status,assigned_to,user_confirmation_sent,user_confirmation_sent_at,user_confirmation_error_safe,internal_notes,created_at,updated_at')
      .order('submitted_at', { ascending: false })
      .limit(limit);
    if (req.query.type) q = q.eq('submission_type', cleanText(req.query.type, 80));
    if (req.query.status) q = q.eq('status', cleanText(req.query.status, 80));
    if (req.query.priority) q = q.eq('priority', cleanText(req.query.priority, 80));
    if (req.query.safeguarding === 'true') q = q.eq('safeguarding_flag', true);
    if (req.query.safeguarding === 'false') q = q.eq('safeguarding_flag', false);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [], statuses: TRUST_STATUSES });
  } catch (err) {
    console.error('[Trust submissions list]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load reported concerns.' });
  }
});

router.patch('/submissions/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.status !== undefined) {
      const status = cleanText(req.body.status, 80);
      if (!TRUST_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
      patch.status = status;
    }
    if (req.body.internalNotes !== undefined || req.body.internal_notes !== undefined) {
      patch.internal_notes = cleanText(req.body.internalNotes || req.body.internal_notes, 5000) || null;
    }
    if (req.body.assignedTo !== undefined || req.body.assigned_to !== undefined) {
      patch.assigned_to = cleanText(req.body.assignedTo || req.body.assigned_to, 100) || null;
    }
    const { data, error } = await supabase
      .from('trust_submissions')
      .update(patch)
      .eq('id', req.params.id)
      .select('id,submission_type,priority,concern_category,name,email,phone,role,organisation,player_or_team_mentioned,message,safeguarding_flag,source_page,submitted_at,status,assigned_to,user_confirmation_sent,user_confirmation_sent_at,user_confirmation_error_safe,internal_notes,created_at,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Submission not found.' });
    res.json({ message: 'Submission updated.', data });
  } catch (err) {
    console.error('[Trust submission update]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not update this submission.' });
  }
});

module.exports = router;

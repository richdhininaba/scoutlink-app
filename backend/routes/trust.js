const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

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
    res.status(201).json({
      message: 'Concern submitted. A restricted Stratex reviewer will assess it.',
      concernId: data.id,
      submittedAt: data.created_at
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
    res.status(201).json({
      message: 'Privacy request submitted. We will review it and respond to the contact email provided.',
      requestId: data.id,
      submittedAt: data.created_at
    });
  } catch (err) {
    console.error('[Trust privacy request]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not submit the privacy request right now.' });
  }
});

module.exports = router;

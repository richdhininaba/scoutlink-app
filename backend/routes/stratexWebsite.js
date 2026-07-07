'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const XLSX = require('xlsx');

const CONSENT_VERSION = '2026-07-stratex-site-v1';

function text(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function email(value) {
  const cleaned = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : '';
}

function slugify(value) {
  return text(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'post';
}

function consentPayload(req) {
  return {
    consent_contact: !!req.body.consentContact || !!req.body.consent_contact,
    consent_marketing: !!req.body.consentMarketing || !!req.body.consent_marketing,
    consent_text: text(req.body.consentText || req.body.consent_text || 'I agree that Stratex Analytics may use these details to respond to this submission.', 1000),
    consent_version: text(req.body.consentVersion || req.body.consent_version || CONSENT_VERSION, 80)
  };
}

function source(req, fallback) {
  return text(req.body.sourcePage || req.body.source_page || req.get('referer') || fallback, 600) || fallback;
}

async function saveLead(req, type, extra) {
  const firstName = text(req.body.firstName || req.body.first_name, 120);
  const lastName = text(req.body.lastName || req.body.last_name, 120);
  const contactEmail = email(req.body.email || req.body.contactEmail || req.body.contact_email);
  const payload = {
    lead_type: type,
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: text(req.body.name || [firstName, lastName].filter(Boolean).join(' '), 260) || null,
    email: contactEmail,
    phone: text(req.body.phone || req.body.contactPhone || req.body.contact_phone, 80) || null,
    organisation: text(req.body.organisation || req.body.organization || req.body.team || req.body.club, 240) || null,
    role: text(req.body.role, 120) || null,
    reason: text(req.body.reason || req.body.category || type, 160) || type,
    message: text(req.body.message || req.body.description || req.body.details, 7000) || null,
    source_page: source(req, '/'),
    status: 'new',
    safe_metadata: extra || {},
    ...consentPayload(req)
  };

  if (!payload.email) {
    const err = new Error('A valid email address is required.');
    err.status = 400;
    throw err;
  }
  if (!payload.consent_contact) {
    const err = new Error('Consent to contact is required.');
    err.status = 400;
    throw err;
  }
  const { data, error } = await supabase
    .from('stratex_website_leads')
    .insert(payload)
    .select('id, created_at')
    .single();
  if (error) throw error;
  return { ...data, payload };
}

router.post('/contact', async (req, res) => {
  try {
    const message = text(req.body.message, 7000);
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    const saved = await saveLead(req, 'contact', {
      reason: text(req.body.reason, 160)
    });
    res.status(201).json({
      message: 'Thanks. Your enquiry has been received and will be reviewed by Stratex.',
      leadId: saved.id,
      submittedAt: saved.created_at
    });
  } catch (err) {
    console.error('[Stratex website contact]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save this enquiry right now.' });
  }
});

router.post('/demo-request', async (req, res) => {
  try {
    const saved = await saveLead(req, 'demo_request', {
      requested_product: 'ScoutLink',
      organisation_type: text(req.body.organisationType || req.body.organisation_type, 120) || null
    });
    res.status(201).json({
      message: 'Demo request received. Stratex will review it and contact you with next steps.',
      leadId: saved.id,
      submittedAt: saved.created_at
    });
  } catch (err) {
    console.error('[Stratex website demo request]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save this demo request right now.' });
  }
});

router.post('/newsletter', async (req, res) => {
  try {
    const contactEmail = email(req.body.email);
    if (!contactEmail) return res.status(400).json({ error: 'A valid email address is required.' });
    const payload = {
      email: contactEmail,
      first_name: text(req.body.firstName || req.body.first_name, 120) || null,
      last_name: text(req.body.lastName || req.body.last_name, 120) || null,
      source_page: source(req, '/'),
      consent_text: text(req.body.consentText || 'I agree to receive Stratex and ScoutLink updates.', 1000),
      consent_version: text(req.body.consentVersion || CONSENT_VERSION, 80),
      status: 'subscribed'
    };
    const { data, error } = await supabase
      .from('stratex_newsletter_signups')
      .upsert(payload, { onConflict: 'email' })
      .select('id, created_at, updated_at')
      .single();
    if (error) throw error;
    await supabase.from('stratex_website_leads').insert({
      lead_type: 'newsletter',
      first_name: payload.first_name,
      last_name: payload.last_name,
      full_name: [payload.first_name, payload.last_name].filter(Boolean).join(' ') || null,
      email: payload.email,
      source_page: payload.source_page,
      status: 'new',
      consent_contact: true,
      consent_marketing: true,
      consent_text: payload.consent_text,
      consent_version: payload.consent_version,
      safe_metadata: { newsletter_signup_id: data.id }
    });
    res.status(201).json({
      message: 'You have been added to the Stratex updates list.',
      signupId: data.id
    });
  } catch (err) {
    console.error('[Stratex newsletter]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not save this newsletter signup right now.' });
  }
});

router.post('/concern', async (req, res) => {
  try {
    const concernType = text(req.body.concernType || req.body.concern_type, 140);
    const description = text(req.body.description || req.body.message, 7000);
    if (!concernType || !description) return res.status(400).json({ error: 'Concern type and details are required.' });
    const saved = await saveLead(req, 'concern', {
      concern_type: concernType,
      urgency: text(req.body.urgency, 80) || 'standard',
      person_or_account: text(req.body.personOrAccount || req.body.person_or_account, 500) || null
    });
    const concernPayload = {
      concern_type: concernType,
      person_or_account: text(req.body.personOrAccount || req.body.person_or_account, 500) || null,
      player_or_team: text(req.body.playerOrTeam || req.body.player_or_team, 500) || null,
      description,
      urgency: text(req.body.urgency, 80) || 'standard',
      contact_name: text(req.body.contactName || saved.payload.full_name, 180) || null,
      contact_email: saved.payload.email,
      contact_phone: text(req.body.contactPhone || saved.payload.phone, 80) || null,
      source: 'stratex_parent_site',
      status: 'new'
    };
    let concernId = null;
    const concern = await supabase
      .from('safeguarding_concerns')
      .insert(concernPayload)
      .select('id, created_at')
      .single();
    if (!concern.error && concern.data) concernId = concern.data.id;
    if (concern.error) {
      console.error('[Stratex concern secondary save]', { code: concern.error.code, message: concern.error.message });
    }
    res.status(201).json({
      message: 'Concern submitted. A restricted Stratex reviewer will assess it.',
      leadId: saved.id,
      concernId,
      submittedAt: saved.created_at
    });
  } catch (err) {
    console.error('[Stratex website concern]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not submit this concern right now.' });
  }
});

router.get('/leadership', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex_leadership_members')
      .select('id,full_name,first_name,last_name,email,job_title,permission_role,bio,display_order,is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('full_name', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[Stratex leadership public]', { code: err.code, message: err.message });
    res.json({ data: [] });
  }
});

router.get('/blog', async (req, res) => {
  try {
    let q = supabase
      .from('stratex_learning_posts')
      .select('id,slug,title,excerpt,category,status,published_at,created_at,updated_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (String(req.query.published || '').toLowerCase() === 'true') q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[Stratex blog public]', { code: err.code, message: err.message });
    res.json({ data: [] });
  }
});

router.get('/blog/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex_learning_posts')
      .select('id,slug,title,excerpt,category,body,status,published_at,created_at,updated_at')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    res.json({ data });
  } catch (err) {
    console.error('[Stratex blog detail]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load this post.' });
  }
});

router.get('/leads', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10) || 200, 1), 500);
    let q = supabase
      .from('stratex_website_leads')
      .select('id,lead_type,first_name,last_name,full_name,email,phone,organisation,role,reason,message,source_page,status,safe_metadata,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (req.query.type) q = q.eq('lead_type', text(req.query.type, 80));
    if (req.query.status) q = q.eq('status', text(req.query.status, 80));
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[Stratex website leads admin]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load website leads.' });
  }
});

router.patch('/leads/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.status !== undefined) patch.status = text(req.body.status, 80) || 'new';
    if (req.body.notes !== undefined) patch.internal_notes = text(req.body.notes, 4000) || null;
    const { data, error } = await supabase
      .from('stratex_website_leads')
      .update(patch)
      .eq('id', req.params.id)
      .select('id,lead_type,status,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ message: 'Lead updated.', data });
  } catch (err) {
    console.error('[Stratex lead update]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not update this lead.' });
  }
});

async function loadCrmRows() {
    const [leadResult, coachResult, scoutResult] = await Promise.allSettled([
      supabase.from('stratex_website_leads').select('id,lead_type,full_name,email,phone,organisation,role,reason,status,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('coaches').select('id,first_name,last_name,email,phone,team_name,role_at_club,created_at,is_active').eq('is_demo', false).limit(500),
      supabase.from('scouts').select('id,first_name,last_name,email,phone,club_name,role,created_at,is_active').eq('is_demo', false).limit(500)
    ]);
    const rows = [];
    if (leadResult.status === 'fulfilled' && !leadResult.value.error) {
      (leadResult.value.data || []).forEach(row => rows.push({
        source: 'Stratex website',
        type: row.lead_type,
        name: row.full_name || '',
        email: row.email,
        phone: row.phone,
        organisation: row.organisation,
        role: row.role || row.reason,
        status: row.status,
        createdAt: row.created_at
      }));
    }
    if (coachResult.status === 'fulfilled' && !coachResult.value.error) {
      (coachResult.value.data || []).forEach(row => rows.push({
        source: 'ScoutLink coach',
        type: 'coach',
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        phone: row.phone,
        organisation: row.team_name,
        role: row.role_at_club || 'Coach',
        status: row.is_active === false ? 'inactive' : 'active',
        createdAt: row.created_at
      }));
    }
    if (scoutResult.status === 'fulfilled' && !scoutResult.value.error) {
      (scoutResult.value.data || []).forEach(row => rows.push({
        source: 'ScoutLink scout',
        type: 'scout',
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        phone: row.phone,
        organisation: row.club_name,
        role: row.role || 'Scout',
        status: row.is_active === false ? 'inactive' : 'active',
        createdAt: row.created_at
      }));
    }
    rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return rows;
}

router.get('/crm', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const rows = await loadCrmRows();
    res.json({ data: rows });
  } catch (err) {
    console.error('[Stratex CRM]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load CRM.' });
  }
});

router.get('/crm/export', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const rows = await loadCrmRows();
    const headers = ['Source', 'Type', 'Name', 'Email', 'Phone', 'Organisation', 'Role', 'Status', 'Created At'];
    const fields = ['source', 'type', 'name', 'email', 'phone', 'organisation', 'role', 'status', 'createdAt'];
    const sheetRows = [headers].concat(rows.map(row => fields.map(field => row[field] || '')));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet['!cols'] = headers.map(header => ({ wch: Math.max(header.length + 4, 18) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CRM');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    await supabase.from('stratex_crm_export_logs').insert({ exported_by: req.user.id, row_count: rows.length, export_type: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stratex-crm-export.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('[Stratex CRM export]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not export CRM.' });
  }
});

router.post('/blog', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const title = text(req.body.title, 180);
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const status = ['draft', 'published', 'archived'].includes(req.body.status) ? req.body.status : 'draft';
    const payload = {
      title,
      slug: slugify(req.body.slug || title),
      excerpt: text(req.body.excerpt, 500) || null,
      body: text(req.body.body, 20000) || '',
      category: text(req.body.category, 120) || 'Learning',
      status,
      author_id: req.user.id,
      published_at: status === 'published' ? new Date().toISOString() : null
    };
    const { data, error } = await supabase.from('stratex_learning_posts').insert(payload).select('*').single();
    if (error) throw error;
    res.status(201).json({ message: 'Post saved.', data });
  } catch (err) {
    console.error('[Stratex blog create]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not save this post.' });
  }
});

router.patch('/blog/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    ['title', 'excerpt', 'body', 'category', 'status'].forEach(field => {
      if (req.body[field] !== undefined) patch[field] = text(req.body[field], field === 'body' ? 20000 : 500);
    });
    if (req.body.slug !== undefined) patch.slug = slugify(req.body.slug);
    if (patch.status === 'published') patch.published_at = new Date().toISOString();
    const { data, error } = await supabase.from('stratex_learning_posts').update(patch).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    res.json({ message: 'Post updated.', data });
  } catch (err) {
    console.error('[Stratex blog update]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not update this post.' });
  }
});

router.post('/leadership', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const firstName = text(req.body.firstName || req.body.first_name, 120);
    const lastName = text(req.body.lastName || req.body.last_name, 120);
    const fullName = text(req.body.fullName || req.body.full_name || [firstName, lastName].filter(Boolean).join(' '), 240);
    if (!fullName) return res.status(400).json({ error: 'Name is required.' });
    const payload = {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName,
      email: email(req.body.email) || null,
      job_title: text(req.body.jobTitle || req.body.job_title, 180) || null,
      permission_role: text(req.body.permissionRole || req.body.permission_role, 120) || null,
      bio: text(req.body.bio, 3000) || null,
      display_order: Number(req.body.displayOrder || req.body.display_order) || 100,
      is_active: req.body.isActive !== false && req.body.is_active !== false
    };
    const { data, error } = await supabase.from('stratex_leadership_members').insert(payload).select('*').single();
    if (error) throw error;
    res.status(201).json({ message: 'Leadership member saved.', data });
  } catch (err) {
    console.error('[Stratex leadership create]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not save this leadership member.' });
  }
});

router.patch('/leadership/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.fullName !== undefined || req.body.full_name !== undefined) patch.full_name = text(req.body.fullName || req.body.full_name, 240);
    if (req.body.firstName !== undefined || req.body.first_name !== undefined) patch.first_name = text(req.body.firstName || req.body.first_name, 120) || null;
    if (req.body.lastName !== undefined || req.body.last_name !== undefined) patch.last_name = text(req.body.lastName || req.body.last_name, 120) || null;
    if (req.body.email !== undefined) patch.email = email(req.body.email) || null;
    if (req.body.jobTitle !== undefined || req.body.job_title !== undefined) patch.job_title = text(req.body.jobTitle || req.body.job_title, 180) || null;
    if (req.body.permissionRole !== undefined || req.body.permission_role !== undefined) patch.permission_role = text(req.body.permissionRole || req.body.permission_role, 120) || null;
    if (req.body.bio !== undefined) patch.bio = text(req.body.bio, 3000) || null;
    if (req.body.displayOrder !== undefined || req.body.display_order !== undefined) patch.display_order = Number(req.body.displayOrder || req.body.display_order) || 100;
    if (req.body.isActive !== undefined || req.body.is_active !== undefined) patch.is_active = req.body.isActive !== false && req.body.is_active !== false;
    const { data, error } = await supabase.from('stratex_leadership_members').update(patch).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Leadership member not found.' });
    res.json({ message: 'Leadership member updated.', data });
  } catch (err) {
    console.error('[Stratex leadership update]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not update this leadership member.' });
  }
});

module.exports = router;

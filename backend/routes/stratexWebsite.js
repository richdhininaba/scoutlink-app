'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const XLSX = require('xlsx');
const crypto = require('crypto');
const multer = require('multer');

const CONSENT_VERSION = '2026-07-stratex-site-v1';
const LEADERSHIP_ASSET_BUCKET = 'stratex-public-assets';
const LEADERSHIP_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const leadershipImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!LEADERSHIP_IMAGE_TYPES[file.mimetype]) return cb(new Error('Please upload a JPG, PNG or WEBP image under 4MB.'));
    cb(null, true);
  }
});

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

function parseCookies(header) {
  return String(header || '').split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index > 0) {
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (key) {
        try {
          acc[key] = decodeURIComponent(value || '');
        } catch (_) {
          acc[key] = value || '';
        }
      }
    }
    return acc;
  }, {});
}

function blogVisitor(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let id = cookies.stx_blog_visitor;
  if (!id || !/^[a-f0-9-]{20,80}$/i.test(id)) {
    id = crypto.randomUUID();
    res.cookie('stx_blog_visitor', id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });
  }
  return crypto.createHash('sha256').update('stratex-blog:' + id).digest('hex');
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

function normalizeAdminRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'productdemo') return 'product demo';
  if (raw === 'readonly') return 'read only';
  return raw;
}

function hasManagementPermission(admin, req) {
  const role = normalizeAdminRole((admin && (admin.admin_role || admin.role)) || (req.user && req.user.role));
  const perms = Array.isArray(admin && admin.permissions) ? admin.permissions.map(item => String(item || '').toLowerCase()) : [];
  const emailAddress = String((admin && admin.email) || (req.user && req.user.email) || '').toLowerCase();
  return emailAddress === 'richdhin@stratexanalytics.co.uk' ||
    role === 'management' ||
    role === 'super admin' ||
    role === 'founder' ||
    role === 'operations' ||
    role === 'acquisition' ||
    role === 'safeguarding reviewer' ||
    role === 'product demo' ||
    perms.includes('management') ||
    perms.includes('permissions') ||
    perms.includes('admin_users');
}

async function requireLeadershipManagement(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('stratex')
      .select('id,email,admin_role,role,permissions,is_active')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data && data.is_active === false) return res.status(403).json({ error: 'This admin account is inactive.' });
    if (!hasManagementPermission(data || {}, req)) return res.status(403).json({ error: 'Management permission is required for this Stratex admin action.' });
    next();
  } catch (err) {
    console.error('[Stratex leadership permission]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not verify admin permissions.' });
  }
}

async function saveLead(req, type, extra) {
  const firstName = text(req.body.firstName || req.body.first_name, 120);
  const lastName = text(req.body.lastName || req.body.last_name, 120);
  const contactEmail = email(req.body.email || req.body.contactEmail || req.body.contact_email);
  const payload = {
    lead_type: type,
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: text(req.body.name || req.body.contactName || req.body.contact_name || [firstName, lastName].filter(Boolean).join(' '), 260) || null,
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
    const relationship = text(req.body.relationshipToConcern || req.body.relationship_to_concern, 180);
    const immediateRisk = text(req.body.immediateRisk || req.body.immediate_risk, 20);
    const permissionToContact = !!req.body.consentContact || !!req.body.permissionToContact || !!req.body.permission_to_contact;
    const playerOrTeam = text(req.body.playerOrTeam || req.body.player_or_team || req.body.personOrAccount || req.body.person_or_account, 500) || null;
    const priority = /^yes$/i.test(immediateRisk) || /safeguard/i.test(concernType) ? 'urgent' : 'standard';
    const saved = await saveLead(req, 'concern', {
      concern_type: concernType,
      relationship_to_concern: relationship || null,
      immediate_risk: immediateRisk || null,
      permission_to_contact: permissionToContact,
      player_or_team: playerOrTeam,
      source_page: source(req, '/report-a-concern'),
      utm_source: text(req.body.utm_source, 160) || null,
      utm_medium: text(req.body.utm_medium, 160) || null,
      utm_campaign: text(req.body.utm_campaign, 160) || null
    });
    const concernPayload = {
      concern_type: concernType,
      person_or_account: playerOrTeam,
      player_or_team: playerOrTeam,
      description,
      urgency: priority,
      contact_name: text(req.body.contactName || saved.payload.full_name, 180) || null,
      contact_email: saved.payload.email,
      contact_phone: text(req.body.contactPhone || saved.payload.phone, 80) || null,
      source: 'stratex_parent_site',
      status: 'new'
    };
    let concernId = null;
    let trustSubmissionId = null;
    const trust = await supabase
      .from('trust_submissions')
      .insert({
        submission_type: 'safeguarding_concern',
        priority,
        concern_category: concernType,
        name: concernPayload.contact_name,
        email: concernPayload.contact_email,
        phone: concernPayload.contact_phone,
        role: relationship || null,
        organisation: null,
        player_or_team_mentioned: playerOrTeam,
        message: description,
        safeguarding_flag: priority === 'urgent',
        source_page: source(req, '/report-a-concern'),
        status: 'new'
      })
      .select('id, submitted_at')
      .single();
    if (!trust.error && trust.data) trustSubmissionId = trust.data.id;
    if (trust.error) {
      console.error('[Stratex concern trust save]', { code: trust.error.code, message: trust.error.message });
    }
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
      message: 'Thanks - we have received your report. Our team will review it and contact you if follow-up is needed. If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first.',
      leadId: saved.id,
      concernId,
      trustSubmissionId,
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
      .select('id,full_name,first_name,last_name,email,job_title,permission_role,bio,linkedin_url,image_url,focus_chip,summary,focus_areas,display_order,is_active')
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
      .select('id,slug,title,excerpt,category,status,published_at,created_at,updated_at,view_count,like_count')
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
      .select('id,slug,title,excerpt,category,body,status,published_at,created_at,updated_at,view_count,like_count')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    const nextViewCount = Number(data.view_count || 0) + 1;
    const visitorHash = blogVisitor(req, res);
    const event = await supabase
      .from('stratex_blog_engagement_events')
      .insert({ post_id: data.id, event_type: 'view', visitor_hash: visitorHash });
    if (!event.error) {
      supabase
        .from('stratex_learning_posts')
        .update({ view_count: nextViewCount, last_viewed_at: new Date().toISOString() })
        .eq('id', data.id)
        .then(({ error: updateError }) => {
          if (updateError) console.error('[Stratex blog view count]', { code: updateError.code, message: updateError.message });
        })
        .catch(updateError => console.error('[Stratex blog view count]', { code: updateError.code, message: updateError.message }));
      return res.json({ data: { ...data, view_count: nextViewCount } });
    }
    if (event.error.code !== '23505') {
      console.error('[Stratex blog view event]', { code: event.error.code, message: event.error.message });
    }
    res.json({ data });
  } catch (err) {
    console.error('[Stratex blog detail]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load this post.' });
  }
});

router.post('/blog/:slug/like', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex_learning_posts')
      .select('id,like_count')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    const nextLikeCount = Number(data.like_count || 0) + 1;
    const visitorHash = blogVisitor(req, res);
    const event = await supabase
      .from('stratex_blog_engagement_events')
      .insert({ post_id: data.id, event_type: 'like', visitor_hash: visitorHash });
    if (event.error && event.error.code === '23505') {
      return res.json({ message: 'Already liked.', alreadyLiked: true, likeCount: Number(data.like_count || 0) });
    }
    if (event.error) throw event.error;
    const { error: updateError } = await supabase
      .from('stratex_learning_posts')
      .update({ like_count: nextLikeCount, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (updateError) throw updateError;
    res.json({ message: 'Thanks for the feedback.', likeCount: nextLikeCount });
  } catch (err) {
    console.error('[Stratex blog like]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not save this like.' });
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
    const [leadResult, coachResult, scoutResult, applicationResult] = await Promise.allSettled([
      supabase.from('stratex_website_leads').select('id,lead_type,full_name,email,phone,organisation,role,reason,status,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('coaches').select('id,first_name,last_name,email,phone,team_name,role_at_club,created_at,is_active').eq('is_demo', false).limit(500),
      supabase.from('scouts').select('id,first_name,last_name,email,phone,club_name,role,created_at,is_active').eq('is_demo', false).limit(500),
      supabase.from('job_applications').select('id,application_ref,first_name,last_name,email,phone,status,submitted_at,job_posts(job_title,department)').order('submitted_at', { ascending: false }).limit(500)
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
    if (applicationResult.status === 'fulfilled' && !applicationResult.value.error) {
      (applicationResult.value.data || []).forEach(row => rows.push({
        source: 'Stratex careers',
        type: 'job_application',
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        phone: row.phone,
        organisation: row.job_posts && row.job_posts.department,
        role: row.job_posts && row.job_posts.job_title,
        status: row.status,
        createdAt: row.submitted_at
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

router.post('/blog', requireAuth, requireRole('Stratex'), requireLeadershipManagement, async (req, res) => {
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

router.patch('/blog/:id', requireAuth, requireRole('Stratex'), requireLeadershipManagement, async (req, res) => {
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

router.delete('/blog/:id', requireAuth, requireRole('Stratex'), requireLeadershipManagement, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex_learning_posts')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id,slug,title,status,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found.' });
    res.json({ message: 'Post archived.', data });
  } catch (err) {
    console.error('[Stratex blog archive]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not archive this post.' });
  }
});

router.post('/leadership/image', requireAuth, requireRole('Stratex'), requireLeadershipManagement, leadershipImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please choose an image to upload.' });
    try {
      await supabase.storage.createBucket(LEADERSHIP_ASSET_BUCKET, {
        public: true,
        fileSizeLimit: 4 * 1024 * 1024,
        allowedMimeTypes: Object.keys(LEADERSHIP_IMAGE_TYPES)
      });
    } catch (_) {}
    const ext = LEADERSHIP_IMAGE_TYPES[req.file.mimetype] || '.jpg';
    const cleanName = slugify(req.body.name || req.file.originalname.replace(/\.[^.]+$/, '')) || 'leadership-image';
    const filePath = 'leadership/' + cleanName + '-' + Date.now() + '-' + crypto.randomUUID() + ext;
    const { error } = await supabase.storage.from(LEADERSHIP_ASSET_BUCKET).upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
      metadata: { uploadedBy: req.user.id, source: 'stratex_leadership_admin' }
    });
    if (error) throw error;
    const { data } = supabase.storage.from(LEADERSHIP_ASSET_BUCKET).getPublicUrl(filePath);
    res.status(201).json({ url: data.publicUrl, bucket: LEADERSHIP_ASSET_BUCKET, path: filePath });
  } catch (err) {
    console.error('[Stratex leadership image upload]', { code: err.code, message: err.message });
    res.status(err && err.message && err.message.includes('JPG') ? 400 : 500).json({ error: err.message || 'Could not upload this image.' });
  }
});

router.post('/leadership', requireAuth, requireRole('Stratex'), requireLeadershipManagement, async (req, res) => {
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
      linkedin_url: text(req.body.linkedinUrl || req.body.linkedin_url, 600) || null,
      image_url: text(req.body.imageUrl || req.body.image_url, 600) || null,
      focus_chip: text(req.body.focusChip || req.body.focus_chip, 120) || null,
      summary: text(req.body.summary, 500) || null,
      focus_areas: Array.isArray(req.body.focusAreas || req.body.focus_areas) ? (req.body.focusAreas || req.body.focus_areas).map(item => text(item, 120)).filter(Boolean) : [],
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

router.patch('/leadership/:id', requireAuth, requireRole('Stratex'), requireLeadershipManagement, async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.fullName !== undefined || req.body.full_name !== undefined) patch.full_name = text(req.body.fullName || req.body.full_name, 240);
    if (req.body.firstName !== undefined || req.body.first_name !== undefined) patch.first_name = text(req.body.firstName || req.body.first_name, 120) || null;
    if (req.body.lastName !== undefined || req.body.last_name !== undefined) patch.last_name = text(req.body.lastName || req.body.last_name, 120) || null;
    if (req.body.email !== undefined) patch.email = email(req.body.email) || null;
    if (req.body.jobTitle !== undefined || req.body.job_title !== undefined) patch.job_title = text(req.body.jobTitle || req.body.job_title, 180) || null;
    if (req.body.permissionRole !== undefined || req.body.permission_role !== undefined) patch.permission_role = text(req.body.permissionRole || req.body.permission_role, 120) || null;
    if (req.body.bio !== undefined) patch.bio = text(req.body.bio, 3000) || null;
    if (req.body.linkedinUrl !== undefined || req.body.linkedin_url !== undefined) patch.linkedin_url = text(req.body.linkedinUrl || req.body.linkedin_url, 600) || null;
    if (req.body.imageUrl !== undefined || req.body.image_url !== undefined) patch.image_url = text(req.body.imageUrl || req.body.image_url, 600) || null;
    if (req.body.focusChip !== undefined || req.body.focus_chip !== undefined) patch.focus_chip = text(req.body.focusChip || req.body.focus_chip, 120) || null;
    if (req.body.summary !== undefined) patch.summary = text(req.body.summary, 500) || null;
    if (req.body.focusAreas !== undefined || req.body.focus_areas !== undefined) patch.focus_areas = Array.isArray(req.body.focusAreas || req.body.focus_areas) ? (req.body.focusAreas || req.body.focus_areas).map(item => text(item, 120)).filter(Boolean) : [];
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

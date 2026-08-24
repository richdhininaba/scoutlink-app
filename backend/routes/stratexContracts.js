'use strict';

const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const { supabase } = require('../db/supabase');
const { requireAuth } = require('../utils/auth');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');
const config = require('../config');

const router = express.Router();
const CONTRACT_BUCKET = 'stratex-contracts';
const ACCEPTANCE_TEXT = 'I have read the agreement and I agree to its terms. I intend this electronic action to constitute my signature and to be legally bound.';
const requireContractManager = requireStratexAdminPermission(
  'contracts',
  'Contracts permission is required for this action.'
);

const contractUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname || '')) {
      return cb(new Error('Contract must be a PDF file.'));
    }
    cb(null, true);
  }
});

function cleanText(value, max = 5000) {
  return String(value == null ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function tokenHash(value) {
  return sha256(String(value || ''));
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function ref(prefix) {
  return `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function receiptRef() {
  return `SIG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function normalizePdfText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLine(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`(?:^|\\n)${escaped}:\\s*([^\\n]+)`, 'i'));
  return match ? cleanText(match[1], 1000) : '';
}

function extractMatch(text, regex, group = 1) {
  const match = text.match(regex);
  return match ? cleanText(match[group], 1000) : '';
}

function field(key, label, group, value, options = {}) {
  return {
    key,
    label,
    group,
    value: cleanText(value, 1500),
    editable: options.editable !== false,
    required: options.required === true,
    multiline: options.multiline === true
  };
}

function detectFields(text) {
  const fields = [
    field('employer', 'Employer', 'Employer', extractLine(text, 'Employer'), { editable: false }),
    field('company_number', 'Company Number', 'Employer', extractLine(text, 'Company Number'), { editable: false }),
    field('employee_name', 'Employee', 'Employee', extractLine(text, 'Employee'), { required: true }),
    field('employee_email', 'Email', 'Employee', extractLine(text, 'Email'), { required: true }),
    field('start_date', 'Start Date', 'Employment', extractLine(text, 'Start Date'), { required: true }),
    field('employment_type', 'Employment Type', 'Employment', extractLine(text, 'Employment Type'), { required: true }),
    field('contract_type', 'Contract Type', 'Employment', extractLine(text, 'Contract Type'), { required: true }),
    field('expected_end_date', 'Expected End Date', 'Employment', extractLine(text, 'Expected End Date')),
    field('job_title', 'Job Title', 'Role & reporting', extractLine(text, 'Job Title'), { required: true }),
    field('department', 'Department', 'Role & reporting', extractLine(text, 'Department'), { required: true }),
    field('line_manager', 'Line Manager', 'Role & reporting', extractLine(text, 'Line Manager'), { required: true }),
    field('final_reporting_authority', 'Final Reporting Authority', 'Role & reporting', extractLine(text, 'Final Reporting Authority')),
    field('place_of_work', 'Normal place of work', 'Working pattern', extractMatch(text, /normal place of work is\s+([^\.]+)\./i), { required: true }),
    field('weekly_hours', 'Agreed Weekly Hours', 'Working pattern', extractLine(text, 'Agreed Weekly Hours'), { required: true }),
    field('schedule', 'Scheduled Working Days/Times', 'Working pattern', extractLine(text, 'Scheduled Working Days/Times'), { required: true, multiline: true }),
    field('hourly_rate', 'Hourly Rate', 'Pay & commission', extractLine(text, 'Hourly Rate'), { required: true }),
    field('pay_date', 'Pay Date', 'Pay & commission', extractLine(text, 'Pay Date'), { required: true }),
    field('payment_method', 'Payment Method', 'Pay & commission', extractLine(text, 'Payment Method'), { required: true }),
    field('club_commission', 'Qualified Onboarded Club Commission', 'Pay & commission', extractMatch(text, /Commission per Qualified Onboarded Club:\s*([^\n]+)/i), { multiline: true }),
    field('player_milestone_commission', 'Player Milestone Commission', 'Pay & commission', extractLine(text, 'Player Milestone Commission'), { multiline: true }),
    field('probation_period', 'Probation period', 'Probation & notice', extractMatch(text, /subject to a probation period of\s+([^\.]+)\./i)),
    field('probation_player_target', 'Probation player target', 'Probation & notice', extractMatch(text, /onboard either\s+([\d,]+)\s+players/i)),
    field('probation_qualified_percentage', 'Qualified profile percentage', 'Probation & notice', extractMatch(text, /at least\s+([\d.]+%)\s+of those profiles/i)),
    field('probation_team_target', 'Alternative team target', 'Probation & notice', extractMatch(text, /or onboard\s+([\d,]+)\s+separate teams/i)),
    field('probation_extension', 'Maximum probation extension', 'Probation & notice', extractMatch(text, /extend probation by up to\s+([^\.]+)\./i)),
    field('notice_during_probation', 'Notice during probation', 'Probation & notice', extractMatch(text, /During probation, either party may end employment by giving\s+([^\.]+)\./i)),
    field('notice_after_probation', 'Notice after probation', 'Probation & notice', extractMatch(text, /After probation, either party may end employment by giving\s+([^,\.]+)(?:,|\.)/i)),
    field('post_employment_restriction', 'Post-employment restriction period', 'Probation & notice', extractMatch(text, /For\s+([^\n\.]+)\s+after employment ends/i))
  ];
  return fields;
}

function parseSections(text) {
  const lines = normalizePdfText(text).split('\n').map((line) => line.trim());
  const sections = [];
  let current = { number: '', heading: 'Contract of Employment', body: [] };

  lines.forEach((line) => {
    if (!line) {
      if (current.body.length && current.body[current.body.length - 1] !== '') current.body.push('');
      return;
    }
    if (/^Contract of Employment$/i.test(line) && current.body.length === 0) return;
    const headingMatch = line.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/);
    if (headingMatch) {
      if (current.body.some(Boolean) || current.heading !== 'Contract of Employment') {
        sections.push({
          number: current.number,
          heading: current.heading,
          body: current.body.join('\n').trim()
        });
      }
      current = { number: headingMatch[1], heading: headingMatch[2], body: [] };
      return;
    }
    current.body.push(line);
  });

  if (current.body.some(Boolean) || current.heading) {
    sections.push({ number: current.number, heading: current.heading, body: current.body.join('\n').trim() });
  }

  return sections.filter((section) => section.body || section.heading);
}

const LABEL_KEYS = {
  employer: 'Employer',
  company_number: 'Company Number',
  employee_name: 'Employee',
  employee_email: 'Email',
  start_date: 'Start Date',
  employment_type: 'Employment Type',
  contract_type: 'Contract Type',
  expected_end_date: 'Expected End Date',
  job_title: 'Job Title',
  department: 'Department',
  line_manager: 'Line Manager',
  final_reporting_authority: 'Final Reporting Authority',
  weekly_hours: 'Agreed Weekly Hours',
  schedule: 'Scheduled Working Days/Times',
  hourly_rate: 'Hourly Rate',
  pay_date: 'Pay Date',
  payment_method: 'Payment Method',
  player_milestone_commission: 'Player Milestone Commission'
};

function replaceLabel(text, label, value) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(^|\\n)(${escaped}:)\\s*[^\\n]+`, 'im'), `$1$2 ${value}`);
}

function personalizeText(sourceText, values) {
  let text = normalizePdfText(sourceText);
  const value = (key) => cleanText(values && values[key], 2000);

  Object.keys(LABEL_KEYS).forEach((key) => {
    if (value(key)) text = replaceLabel(text, LABEL_KEYS[key], value(key));
  });

  if (value('place_of_work')) {
    text = text.replace(/(normal place of work is\s+)([^\.]+)(\.)/i, `$1${value('place_of_work')}$3`);
  }
  if (value('club_commission')) {
    text = text.replace(/(Commission per Qualified Onboarded Club:)\s*[^\n]+/i, `$1 ${value('club_commission')}`);
  }
  if (value('probation_period')) {
    text = text.replace(/(subject to a probation period of\s+)([^\.]+)(\.)/i, `$1${value('probation_period')}$3`);
  }
  if (value('probation_player_target')) {
    text = text.replace(/(onboard either\s+)([\d,]+)(\s+players)/i, `$1${value('probation_player_target')}$3`);
  }
  if (value('probation_qualified_percentage')) {
    text = text.replace(/(at least\s+)([\d.]+%)(\s+of those profiles)/i, `$1${value('probation_qualified_percentage')}$3`);
  }
  if (value('probation_team_target')) {
    text = text.replace(/(or onboard\s+)([\d,]+)(\s+separate teams)/i, `$1${value('probation_team_target')}$3`);
  }
  if (value('probation_extension')) {
    text = text.replace(/(extend probation by up to\s+)([^\.]+)(\.)/i, `$1${value('probation_extension')}$3`);
  }
  if (value('notice_during_probation')) {
    text = text.replace(/(During probation, either party may end employment by giving\s+)([^\.]+)(\.)/i, `$1${value('notice_during_probation')}$3`);
  }
  if (value('notice_after_probation')) {
    text = text.replace(/(After probation, either party may end employment by giving\s+)([^,\.]+)(,|\.)/i, `$1${value('notice_after_probation')}$3`);
  }
  if (value('post_employment_restriction')) {
    text = text.replace(/(For\s+)([^\n\.]+)(\s+after employment ends)/i, `$1${value('post_employment_restriction')}$3`);
  }

  return text;
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || null;
}

function formatLondon(value) {
  try {
    return new Date(value).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'long',
      timeStyle: 'short'
    });
  } catch (_) {
    return String(value || '');
  }
}

function pdfBuffer(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 56, right: 58, bottom: 58, left: 58 }, info: { Producer: 'Stratex Analytics Limited' } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    build(doc);
    doc.end();
  });
}

function drawBrand(doc) {
  doc.save();
  doc.fillColor('#075F48').roundedRect(58, 42, 20, 20, 5).fill();
  doc.fillColor('#04352A').font('Helvetica-Bold').fontSize(17).text('stratex', 88, 42, { continued: true });
  doc.fillColor('#71847A').font('Helvetica').fontSize(8).text('  analytics', { baseline: 'middle' });
  doc.restore();
  doc.moveDown(2.1);
}

function ensureRoom(doc, needed = 70) {
  if (doc.y + needed > doc.page.height - 58) {
    doc.addPage();
    drawBrand(doc);
  }
}

function renderParagraph(doc, paragraph) {
  const trimmed = String(paragraph || '').trim();
  if (!trimmed) {
    doc.moveDown(0.5);
    return;
  }
  if (trimmed.startsWith('•')) {
    doc.font('Helvetica').fontSize(9.4).fillColor('#40534A').text(trimmed, { indent: 12, paragraphGap: 3, lineGap: 2 });
    return;
  }
  const labelMatch = trimmed.match(/^([^:]{2,55}:)\s*(.+)$/);
  if (labelMatch && !/[.!?]$/.test(labelMatch[1])) {
    doc.font('Helvetica-Bold').fontSize(9.6).fillColor('#0C201A').text(labelMatch[1] + ' ', { continued: true });
    doc.font('Helvetica').fillColor('#40534A').text(labelMatch[2], { paragraphGap: 5, lineGap: 2 });
    return;
  }
  doc.font('Helvetica').fontSize(9.4).fillColor('#40534A').text(trimmed, { paragraphGap: 6, lineGap: 2 });
}

async function renderContractPdf(record, sections, signedMeta) {
  return pdfBuffer((doc) => {
    drawBrand(doc);
    doc.font('Helvetica-Bold').fontSize(17).fillColor('#0C201A').text(record.document_title || 'Contract of Employment', { align: 'center' });
    doc.moveDown(1.4);

    (sections || []).forEach((section, index) => {
      ensureRoom(doc, 85);
      if (index > 0 || section.number) {
        const heading = `${section.number ? section.number + '. ' : ''}${section.heading || ''}`.trim();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(10.4).fillColor('#0C201A').text(heading, { paragraphGap: 5 });
        doc.strokeColor('#D8E1DB').lineWidth(0.6).moveTo(58, doc.y).lineTo(doc.page.width - 58, doc.y).stroke();
        doc.moveDown(0.7);
      }
      String(section.body || '').split(/\n+/).forEach((paragraph) => {
        ensureRoom(doc, 45);
        renderParagraph(doc, paragraph);
      });
    });

    if (signedMeta) {
      doc.addPage();
      drawBrand(doc);
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0C201A').text('Electronic signature', { paragraphGap: 10 });
      doc.font('Helvetica').fontSize(10).fillColor('#40534A').text(ACCEPTANCE_TEXT, { lineGap: 3, paragraphGap: 16 });
      doc.roundedRect(58, doc.y, doc.page.width - 116, 132, 12).fillAndStroke('#F4F7F3', '#D8E1DB');
      const top = doc.y + 18;
      doc.fillColor('#71847A').font('Helvetica-Bold').fontSize(7.5).text('SIGNED BY', 76, top);
      doc.fillColor('#0C201A').font('Helvetica-Bold').fontSize(14).text(signedMeta.signatureName, 76, top + 16);
      doc.fillColor('#71847A').font('Helvetica').fontSize(8.5).text(`Method: ${signedMeta.signatureMethod === 'drawn' ? 'Drawn signature' : 'Typed signature'}`, 76, top + 42);
      doc.text(`Signed: ${formatLondon(signedMeta.signedAt)}`, 76, top + 57);
      doc.text(`Contract fingerprint: ${record.generated_pdf_sha256}`, 76, top + 72, { width: doc.page.width - 152 });
      doc.text(`Receipt: ${signedMeta.receiptReference}`, 76, top + 94);
      if (signedMeta.signatureMethod === 'typed') {
        doc.font('Times-Italic').fontSize(22).fillColor('#04352A').text(signedMeta.signatureName, doc.page.width - 260, top + 18, { width: 180, align: 'center' });
      } else if (signedMeta.signatureData && /^data:image\/png;base64,/i.test(signedMeta.signatureData)) {
        try {
          const image = Buffer.from(signedMeta.signatureData.replace(/^data:image\/png;base64,/i, ''), 'base64');
          doc.image(image, doc.page.width - 260, top + 12, { fit: [180, 70], align: 'center', valign: 'center' });
        } catch (_) {}
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A39B').text(
        `${record.contract_reference} · ${i + 1}/${range.count}`,
        58,
        doc.page.height - 40,
        { width: doc.page.width - 116, align: 'right' }
      );
    }
  });
}

async function renderReceiptPdf(record, signedMeta) {
  return pdfBuffer((doc) => {
    drawBrand(doc);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0C201A').text('Electronic signature receipt');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10).fillColor('#40534A').text('Evidence summary for the completed Stratex Analytics employment agreement.', { paragraphGap: 18 });
    const rows = [
      ['Contract', record.contract_reference],
      ['Signed by', signedMeta.signatureName],
      ['Recipient email', record.recipient_email],
      ['Contract version', record.document_version],
      ['Signature method', signedMeta.signatureMethod === 'drawn' ? 'Drawn signature' : 'Typed signature'],
      ['Signed at', formatLondon(signedMeta.signedAt)],
      ['Document fingerprint', record.generated_pdf_sha256],
      ['Receipt reference', signedMeta.receiptReference]
    ];
    rows.forEach(([label, value]) => {
      ensureRoom(doc, 48);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#71847A').text(label.toUpperCase());
      doc.font('Helvetica').fontSize(10).fillColor('#0C201A').text(String(value || '—'), { paragraphGap: 10 });
    });
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#71847A').text('ACCEPTANCE WORDING');
    doc.font('Helvetica').fontSize(9.5).fillColor('#40534A').text(ACCEPTANCE_TEXT, { lineGap: 3 });
  });
}

async function uploadPdf(path, buffer) {
  const { error } = await supabase.storage
    .from(CONTRACT_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
}

async function signedUrl(path, expiresIn = 300) {
  const { data, error } = await supabase.storage.from(CONTRACT_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data || !data.signedUrl) throw error || new Error('Could not create contract download link.');
  return data.signedUrl;
}

async function audit(recordId, eventType, req, metadata, actorId) {
  try {
    await supabase.from('stratex_contract_events').insert({
      contract_id: recordId,
      event_type: eventType,
      actor_stratex_id: actorId || null,
      ip_address: requestIp(req),
      user_agent: cleanText(req.headers['user-agent'], 1000) || null,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('[Contract audit]', error.message);
  }
}

async function contractByToken(token) {
  const hash = tokenHash(token);
  const { data, error } = await supabase
    .from('stratex_contract_documents')
    .select('*')
    .eq('secure_token_hash', hash)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function publicPayload(record) {
  const personalized = personalizeText(record.source_text, record.field_values || {});
  return {
    contractReference: record.contract_reference,
    title: record.document_title,
    version: record.document_version,
    recipientName: record.recipient_name,
    recipientEmail: record.recipient_email,
    status: record.status,
    signed: record.status === 'signed',
    signedAt: record.signed_at,
    receiptReference: record.signature_receipt_reference,
    fingerprint: record.generated_pdf_sha256,
    acceptanceText: ACCEPTANCE_TEXT,
    sections: parseSections(personalized)
  };
}

async function sendContractEmail(record, publicUrl) {
  if (!config.sendgrid || !config.sendgrid.apiKey || !record.recipient_email) return { success: false, skipped: true };
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(config.sendgrid.apiKey);
  await sgMail.send({
    to: record.recipient_email,
    from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName || 'Stratex Analytics' },
    subject: `Your Stratex Analytics employment agreement - ${record.contract_reference}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h2>Review and sign your agreement</h2><p>Hello ${cleanText(record.recipient_name, 200) || 'there'},</p><p>Stratex Analytics has prepared your employment agreement. Use the secure link below to review the exact contract version and sign it electronically.</p><p><a href="${publicUrl}" style="display:inline-block;background:#04352A;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Review and sign agreement</a></p><p style="color:#71847A;font-size:12px">Contract ${record.contract_reference}. Do not forward this secure link.</p></div>`
  });
  return { success: true };
}

router.post('/admin/analyse', requireAuth, requireContractManager, contractUpload.single('contract'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach the employment contract PDF first.' });
    const parsed = await pdfParse(req.file.buffer);
    const sourceText = normalizePdfText(parsed.text);
    if (!sourceText || sourceText.length < 250) {
      return res.status(400).json({ error: 'The PDF does not contain enough readable contract text.' });
    }

    const detectedFields = detectFields(sourceText);
    const employeeName = detectedFields.find((item) => item.key === 'employee_name')?.value || '';
    const employeeEmail = cleanEmail(detectedFields.find((item) => item.key === 'employee_email')?.value || '');
    const reference = ref('STX');
    const sourcePath = `drafts/${reference}/${Date.now()}-${crypto.randomUUID()}.pdf`;
    await uploadPdf(sourcePath, req.file.buffer);

    let employeeId = null;
    if (employeeEmail) {
      const { data: employee } = await supabase.from('stratex').select('id').ilike('email', employeeEmail).maybeSingle();
      employeeId = employee && employee.id ? employee.id : null;
    }

    const { data: record, error } = await supabase
      .from('stratex_contract_documents')
      .insert({
        created_by: req.user.id,
        employee_id: employeeId,
        contract_reference: reference,
        document_title: 'Contract of Employment',
        document_version: '1.0',
        status: 'draft',
        recipient_name: employeeName || null,
        recipient_email: employeeEmail || null,
        source_file_name: cleanText(req.file.originalname, 240),
        source_storage_path: sourcePath,
        source_sha256: sha256(req.file.buffer),
        source_text: sourceText,
        source_sections: parseSections(sourceText),
        detected_fields: detectedFields,
        field_values: detectedFields.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {})
      })
      .select('*')
      .single();
    if (error) throw error;

    await audit(record.id, 'template_uploaded_and_analysed', req, {
      fileName: record.source_file_name,
      pageCount: parsed.numpages || null,
      headings: (record.source_sections || []).map((section) => section.heading)
    }, req.user.id);

    res.json({
      data: {
        id: record.id,
        contractReference: record.contract_reference,
        sourceFileName: record.source_file_name,
        recipientName: record.recipient_name,
        recipientEmail: record.recipient_email,
        headings: (record.source_sections || []).map((section) => ({ number: section.number, heading: section.heading })),
        fields: detectedFields
      }
    });
  } catch (error) {
    console.error('[Contract analyse]', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not analyse the contract.' });
  }
});

router.get('/admin', requireAuth, requireContractManager, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex_contract_documents')
      .select('id,contract_reference,document_title,document_version,status,recipient_name,recipient_email,source_file_name,generated_at,first_viewed_at,signed_at,signature_receipt_reference,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/:id/generate', requireAuth, requireContractManager, async (req, res) => {
  try {
    const { data: record, error } = await supabase
      .from('stratex_contract_documents')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!record) return res.status(404).json({ error: 'Contract draft not found.' });
    if (record.status === 'signed') return res.status(409).json({ error: 'A signed contract cannot be regenerated.' });

    const detected = Array.isArray(record.detected_fields) ? record.detected_fields : [];
    const incoming = req.body && typeof req.body.fieldValues === 'object' ? req.body.fieldValues : {};
    const fieldValues = {};
    detected.forEach((item) => {
      fieldValues[item.key] = cleanText(incoming[item.key] !== undefined ? incoming[item.key] : item.value, 2000);
      if (item.required && !fieldValues[item.key]) {
        const err = new Error(`${item.label} is required before the signing link can be generated.`);
        err.status = 400;
        throw err;
      }
    });

    const recipientName = cleanText(req.body.recipientName || fieldValues.employee_name, 200);
    const recipientEmail = cleanEmail(req.body.recipientEmail || fieldValues.employee_email);
    if (!recipientName || !recipientEmail) {
      return res.status(400).json({ error: 'Recipient name and a valid recipient email are required.' });
    }
    fieldValues.employee_name = recipientName;
    fieldValues.employee_email = recipientEmail;

    const personalizedText = personalizeText(record.source_text, fieldValues);
    const sections = parseSections(personalizedText);
    const unsignedPdf = await renderContractPdf(record, sections, null);
    const pdfHash = sha256(unsignedPdf);
    const pdfPath = `generated/${record.contract_reference}/agreement.pdf`;
    await uploadPdf(pdfPath, unsignedPdf);

    const token = randomToken();
    const expiresDays = Math.max(1, Math.min(90, Number(req.body.expiresDays || 21)));
    const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

    let employeeId = record.employee_id || null;
    const { data: employee } = await supabase.from('stratex').select('id').ilike('email', recipientEmail).maybeSingle();
    if (employee && employee.id) employeeId = employee.id;

    const { data: updated, error: updateError } = await supabase
      .from('stratex_contract_documents')
      .update({
        employee_id: employeeId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        field_values: fieldValues,
        source_sections: sections,
        secure_token_hash: tokenHash(token),
        token_expires_at: expiresAt,
        generated_pdf_path: pdfPath,
        generated_pdf_sha256: pdfHash,
        generated_at: new Date().toISOString(),
        acceptance_text: ACCEPTANCE_TEXT,
        status: 'sent'
      })
      .eq('id', record.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    const site = String(process.env.STRATEX_URL || 'https://www.stratexanalytics.co.uk').replace(/\/+$/, '');
    const url = `${site}/contracts/${encodeURIComponent(token)}`;
    await audit(record.id, 'signing_link_generated', req, { expiresAt, recipientEmail }, req.user.id);

    let emailResult = { success: false, skipped: true };
    if (req.body.sendEmail === true) {
      try {
        emailResult = await sendContractEmail(updated, url);
        await audit(record.id, 'signing_link_emailed', req, { recipientEmail }, req.user.id);
      } catch (emailError) {
        emailResult = { success: false, error: emailError.message };
      }
    }

    res.json({
      data: {
        id: updated.id,
        contractReference: updated.contract_reference,
        url,
        expiresAt,
        fingerprint: updated.generated_pdf_sha256,
        email: emailResult
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Could not generate the contract link.' });
  }
});

router.post('/admin/:id/email', requireAuth, requireContractManager, async (req, res) => {
  try {
    const { data: record, error } = await supabase.from('stratex_contract_documents').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!record || !record.secure_token_hash) return res.status(404).json({ error: 'Generated contract not found.' });
    return res.status(400).json({ error: 'For security, resend by regenerating the secure link so a fresh token is issued.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/:id/revoke', requireAuth, requireContractManager, async (req, res) => {
  try {
    const { data: record, error } = await supabase.from('stratex_contract_documents').select('id,status').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!record) return res.status(404).json({ error: 'Contract not found.' });
    if (record.status === 'signed') return res.status(409).json({ error: 'A signed contract cannot be revoked.' });
    await supabase.from('stratex_contract_documents').update({ status: 'revoked', revoked_at: new Date().toISOString(), secure_token_hash: null }).eq('id', record.id);
    await audit(record.id, 'contract_revoked', req, {}, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/:token', async (req, res) => {
  try {
    const record = await contractByToken(req.params.token);
    if (!record) return res.status(404).json({ error: 'This contract link is invalid or has been replaced.' });
    if (record.status === 'revoked') return res.status(410).json({ error: 'This contract link has been revoked.' });
    if (record.token_expires_at && new Date(record.token_expires_at).getTime() < Date.now() && record.status !== 'signed') {
      await supabase.from('stratex_contract_documents').update({ status: 'expired' }).eq('id', record.id);
      return res.status(410).json({ error: 'This contract link has expired. Contact Stratex Analytics for a new link.' });
    }

    if (!record.first_viewed_at) {
      await supabase.from('stratex_contract_documents').update({ first_viewed_at: new Date().toISOString(), status: record.status === 'sent' ? 'viewed' : record.status }).eq('id', record.id);
      await audit(record.id, 'contract_opened', req, {}, null);
      record.first_viewed_at = new Date().toISOString();
      if (record.status === 'sent') record.status = 'viewed';
    }

    res.set('Cache-Control', 'no-store');
    res.json({ data: publicPayload(record) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/:token/pdf', async (req, res) => {
  try {
    const record = await contractByToken(req.params.token);
    if (!record) return res.status(404).send('Contract not found');
    const path = record.status === 'signed' && record.signed_pdf_path ? record.signed_pdf_path : record.generated_pdf_path;
    if (!path) return res.status(404).send('Contract PDF is not ready');
    await audit(record.id, 'contract_pdf_downloaded', req, { signed: record.status === 'signed' }, null);
    res.redirect(await signedUrl(path, 300));
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get('/public/:token/receipt', async (req, res) => {
  try {
    const record = await contractByToken(req.params.token);
    if (!record || record.status !== 'signed' || !record.receipt_pdf_path) return res.status(404).send('Signature receipt not found');
    await audit(record.id, 'signature_receipt_downloaded', req, {}, null);
    res.redirect(await signedUrl(record.receipt_pdf_path, 300));
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/public/:token/sign', async (req, res) => {
  try {
    const record = await contractByToken(req.params.token);
    if (!record) return res.status(404).json({ error: 'Contract not found.' });
    if (record.status === 'signed') return res.status(409).json({ error: 'This agreement has already been signed.' });
    if (record.status === 'revoked' || record.status === 'expired') return res.status(410).json({ error: 'This contract can no longer be signed.' });
    if (record.token_expires_at && new Date(record.token_expires_at).getTime() < Date.now()) return res.status(410).json({ error: 'This contract link has expired.' });
    if (req.body.accepted !== true) return res.status(400).json({ error: 'You must confirm that you have read and accept the agreement.' });

    const signatureMethod = req.body.signatureMethod === 'drawn' ? 'drawn' : 'typed';
    const signatureName = cleanText(req.body.signatureName, 200);
    if (!signatureName || signatureName.length < 2) return res.status(400).json({ error: 'Enter your full legal name.' });
    let signatureData = null;
    if (signatureMethod === 'drawn') {
      signatureData = cleanText(req.body.signatureData, 500000);
      if (!/^data:image\/png;base64,/i.test(signatureData)) return res.status(400).json({ error: 'Draw your signature before submitting.' });
    }

    const signedAt = new Date().toISOString();
    const receiptReference = receiptRef();
    const personalizedText = personalizeText(record.source_text, record.field_values || {});
    const sections = parseSections(personalizedText);
    const signedMeta = { signatureMethod, signatureName, signatureData, signedAt, receiptReference };
    const [signedPdf, receiptPdf] = await Promise.all([
      renderContractPdf(record, sections, signedMeta),
      renderReceiptPdf(record, signedMeta)
    ]);
    const signedPath = `signed/${record.contract_reference}/signed-agreement.pdf`;
    const receiptPath = `signed/${record.contract_reference}/signature-receipt.pdf`;
    await Promise.all([uploadPdf(signedPath, signedPdf), uploadPdf(receiptPath, receiptPdf)]);

    const { error: updateError } = await supabase
      .from('stratex_contract_documents')
      .update({
        status: 'signed',
        signature_method: signatureMethod,
        signature_name: signatureName,
        signature_data: signatureData,
        signature_ip: requestIp(req),
        signature_user_agent: cleanText(req.headers['user-agent'], 1000) || null,
        signed_pdf_path: signedPath,
        receipt_pdf_path: receiptPath,
        signature_receipt_reference: receiptReference,
        signed_at: signedAt
      })
      .eq('id', record.id);
    if (updateError) throw updateError;

    await audit(record.id, 'contract_signed', req, {
      signatureMethod,
      signatureName,
      receiptReference,
      acceptanceText: ACCEPTANCE_TEXT,
      fingerprint: record.generated_pdf_sha256
    }, null);

    res.json({
      data: {
        signed: true,
        signedAt,
        receiptReference,
        contractReference: record.contract_reference
      }
    });
  } catch (error) {
    console.error('[Contract sign]', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not sign the agreement.' });
  }
});

module.exports = router;

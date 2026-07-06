'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preserveLines(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function label(value) {
  return escapeHtml(value || 'Not provided');
}

function priorityFor(submission) {
  if (submission.safeguarding_flag || /urgent/i.test(submission.priority || '')) return 'Urgent';
  return submission.priority || 'Standard';
}

function subjectFor(submission) {
  const category = submission.concern_category || submission.submission_type || 'message';
  if (submission.safeguarding_flag) return 'URGENT ScoutLink safeguarding concern submitted';
  if (submission.submission_type === 'safeguarding_concern') return 'URGENT ScoutLink concern reported: ' + category;
  if (submission.submission_type === 'privacy_request') return 'ScoutLink privacy/data request submitted';
  if (submission.submission_type === 'parent_guardian_concern') return 'ScoutLink parent/guardian concern submitted';
  return 'New ScoutLink contact message: ' + category;
}

function buildHtml(submission) {
  const priority = priorityFor(submission);
  const urgencyColor = priority.toLowerCase().includes('urgent') ? '#dc2626' : '#0f9f75';
  const rows = [
    ['Submission type', submission.submission_type],
    ['Priority', priority],
    ['Submitted', submission.submitted_at || new Date().toISOString()],
    ['Source page', submission.source_page],
    ['Sender name', submission.name],
    ['Sender email', submission.email],
    ['Sender phone', submission.phone],
    ['Sender role', submission.role],
    ['Organisation/team', submission.organisation],
    ['Concern category', submission.concern_category],
    ['Player/team mentioned', submission.player_or_team_mentioned],
    ['Safeguarding flag', submission.safeguarding_flag ? 'Yes' : 'No'],
    ['Admin record', submission.admin_record_url],
  ];
  return '<!doctype html><html><body style="margin:0;background:#f6f8fa;font-family:Arial,sans-serif;color:#111827">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fa;padding:24px 0"><tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">'
    + '<tr><td style="background:#07111f;color:#fff;padding:22px 26px"><div style="font-size:24px;font-weight:800">Scout<span style="color:#16a979">Link</span></div><div style="margin-top:6px;color:#cbd5e1;font-size:13px">Trust and contact alert</div></td></tr>'
    + '<tr><td style="padding:24px 26px 8px"><div style="display:inline-block;border:1px solid ' + urgencyColor + ';color:' + urgencyColor + ';border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;text-transform:uppercase">' + escapeHtml(priority) + '</div>'
    + '<h1 style="font-size:24px;line-height:1.2;margin:16px 0 8px;color:#111827">' + escapeHtml(subjectFor(submission)) + '</h1>'
    + '<p style="margin:0;color:#475569;line-height:1.55">Please review this ScoutLink public submission and take the appropriate next action. User-submitted fields are escaped before rendering.</p></td></tr>'
    + '<tr><td style="padding:12px 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">'
    + rows.map(([key, value]) => '<tr><td style="width:190px;border-top:1px solid #e5e7eb;padding:11px 8px 11px 0;color:#64748b;font-size:13px;font-weight:700">' + escapeHtml(key) + '</td><td style="border-top:1px solid #e5e7eb;padding:11px 0;color:#111827;font-size:14px;font-weight:600">' + label(value) + '</td></tr>').join('')
    + '</table></td></tr>'
    + '<tr><td style="padding:8px 26px 26px"><h2 style="font-size:16px;margin:0 0 10px;color:#111827">Message body</h2><div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;color:#334155;line-height:1.6;font-size:14px">' + preserveLines(submission.message) + '</div></td></tr>'
    + '<tr><td style="padding:18px 26px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">Next action: triage the submission, record any action taken, and avoid forwarding sensitive concern details outside approved Stratex channels.</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function buildText(submission) {
  const rows = [
    'ScoutLink trust/contact alert',
    'Subject: ' + subjectFor(submission),
    'Submission type: ' + (submission.submission_type || 'Not provided'),
    'Priority: ' + priorityFor(submission),
    'Submitted: ' + (submission.submitted_at || new Date().toISOString()),
    'Source page: ' + (submission.source_page || 'Not provided'),
    'Sender: ' + (submission.name || 'Not provided') + ' <' + (submission.email || 'Not provided') + '>',
    'Phone: ' + (submission.phone || 'Not provided'),
    'Role: ' + (submission.role || 'Not provided'),
    'Organisation/team: ' + (submission.organisation || 'Not provided'),
    'Concern category: ' + (submission.concern_category || 'Not provided'),
    'Player/team mentioned: ' + (submission.player_or_team_mentioned || 'Not provided'),
    'Safeguarding flag: ' + (submission.safeguarding_flag ? 'Yes' : 'No'),
    '',
    'Message:',
    submission.message || 'Not provided',
  ];
  return rows.join('\n');
}

async function sendContactAlert(submission) {
  const smtp = config.contactAlerts.smtp;
  const recipients = config.contactAlerts.recipients;
  if (!recipients.length) {
    return { success: false, skipped: true, error: 'CONTACT_ALERT_RECIPIENTS is empty' };
  }
  if (!smtp.host || !smtp.user || !smtp.pass) {
    return { success: false, skipped: true, error: 'SMTP email credentials are not configured' };
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transporter.sendMail({
    to: recipients,
    from: '"' + smtp.fromName.replace(/"/g, '') + '" <' + smtp.fromEmail + '>',
    subject: subjectFor(submission),
    text: buildText(submission),
    html: buildHtml(submission),
  });
  return { success: true, recipients };
}

module.exports = {
  sendContactAlert,
  subjectFor,
  escapeHtml,
};

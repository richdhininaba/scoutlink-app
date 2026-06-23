'use strict';
const config = require('../config');

function brandBase() {
  return String(config.brandUrl || 'https://scoutlink.app').replace(/\/+$/, '');
}

function accountLink(path, params) {
  const qs = new URLSearchParams();
  Object.keys(params || {}).forEach(k => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.set(k, params[k]);
  });
  const q = qs.toString();
  return brandBase() + path + (q ? '?' + q : '');
}

function inviteData(d) {
  const accountType = d.accountType || 'account';
  const emailAddr = d.email || d.to || '';
  const loginCode = d.loginCode || d.resetCode || '';
  const firstName = d.firstName || d.first_name || d.playerFirstName || 'there';
  const completeLink = d.completeLink || accountLink('/complete-registration', { code: loginCode, email: emailAddr, type: accountType });
  const loginUrl = accountLink('/login', {});
  return {
    loginUrl,
    login_url: loginUrl,
    completeLink,
    complete_link: completeLink,
    accountType,
    account_type: accountType,
    firstName,
    first_name: firstName,
    loginCode,
    login_code: loginCode,
    code: loginCode,
    email: emailAddr,
    to: d.to || emailAddr,
    recipientEmail: emailAddr,
    recipient_email: emailAddr,
    ctaUrl: completeLink,
    cta_url: completeLink,
    ...d
  };
}

function resetData(d) {
  const accountType = d.accountType || 'Player';
  const emailAddr = d.email || d.to || '';
  const resetCode = d.resetCode || d.loginCode || '';
  const resetLink = d.resetLink || accountLink('/forgot-password', { code: resetCode, email: emailAddr, type: accountType });
  const loginUrl = accountLink('/login', {});
  return {
    resetLink,
    reset_link: resetLink,
    loginUrl,
    login_url: loginUrl,
    accountType,
    account_type: accountType,
    resetCode,
    reset_code: resetCode,
    email: emailAddr,
    ...d
  };
}

function notificationData(d) {
  d = d || {};
  const title = d.title || d.subject || 'ScoutLink notification';
  const body = d.body || d.message || '';
  const actionLink = d.actionLink || d.action_link || brandBase();
  const loginUrl = accountLink('/login', {});
  return {
    title,
    subject: title,
    notificationTitle: title,
    notification_title: title,
    body,
    message: body,
    notificationBody: body,
    notification_body: body,
    actionLink,
    action_link: actionLink,
    loginUrl,
    login_url: loginUrl,
    ...d
  };
}

function registrationAlertData(d, accountType) {
  d = d || {};
  const firstName = d.firstName || d.first_name || '';
  const lastName = d.lastName || d.last_name || '';
  const emailAddr = d.email || d.emailAddr || '';
  const reviewLink = d.reviewLink || accountLink('/stratex/registrations', {});
  return {
    accountType,
    account_type: accountType,
    firstName,
    first_name: firstName,
    lastName,
    last_name: lastName,
    fullName: (firstName + ' ' + lastName).trim(),
    full_name: (firstName + ' ' + lastName).trim(),
    email: emailAddr,
    emailAddr,
    email_addr: emailAddr,
    reviewLink,
    review_link: reviewLink,
    requestId: d.requestId || d.request_id || '',
    request_id: d.requestId || d.request_id || '',
    ...d
  };
}

function registrationReceivedData(d, accountType) {
  d = d || {};
  const firstName = d.firstName || d.first_name || 'there';
  return {
    ...registrationAlertData(d, accountType),
    firstName,
    first_name: firstName,
    title: 'We have received your ScoutLink registration',
    subject: 'We have received your ScoutLink registration',
    body: 'Thanks for registering with ScoutLink. The Stratex team has received your registration and will review it shortly. Please check your junk or spam folder if you do not see a response within 24 hours.'
  };
}

// Lazy-load SendGrid to avoid crash if SENDGRID_API_KEY not set
function getSgMail() {
  try {
    const sgMail = require('@sendgrid/mail');
    if (config.sendgrid.apiKey) {
      sgMail.setApiKey(config.sendgrid.apiKey);
      return sgMail;
    }
  } catch(e) {
    console.warn('[Email] @sendgrid/mail not available:', e.message);
  }
  return null;
}

async function send({ to, templateId, data }) {
  if (!config.sendgrid.apiKey) {
    console.warn('[Email] SENDGRID_API_KEY not configured - skipping email send');
    return { success: false, skipped: true };
  }
  if (!templateId) {
    console.warn('[Email] No templateId provided - skipping email send');
    return { success: false, skipped: true };
  }
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };

const toArr = Array.isArray(to) ? to : [to];
  const msgs = toArr.map(addr => ({
    to: addr,
    from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
    templateId,
    dynamicTemplateData: { brandUrl: config.brandUrl, year: new Date().getFullYear(), ...data }
  }));
  try {
    for (const m of msgs) await sgMail.send(m);
    console.log('[Email] Sent to', toArr.join(', '), 'template:', templateId);
    return { success: true };
  } catch(err) {
    console.error('[Email] Failed:', err?.response?.body || err.message);
    return { success: false, error: err.message, details: err?.response?.body || null };
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

async function sendPlain({ to, subject, text, html }) {
  if (!config.sendgrid.apiKey) {
    console.warn('[Email] SENDGRID_API_KEY not configured - skipping plain email send');
    return { success: false, skipped: true };
  }
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };
  const toArr = Array.isArray(to) ? to : [to];
  const safeText = String(text || '').trim();
  const msgHtml = html || '<div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">' +
    '<h2 style="margin:0 0 16px;color:#07111f">' + escapeHtml(subject || 'ScoutLink') + '</h2>' +
    '<p style="white-space:pre-line;margin:0 0 20px">' + escapeHtml(safeText) + '</p>' +
    '<p style="margin:0;color:#64748b;font-size:13px">ScoutLink by Stratex Analytics</p>' +
    '</div>';
  const msgs = toArr.map(addr => ({
    to: addr,
    from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
    subject: subject || 'ScoutLink',
    text: safeText || subject || 'ScoutLink notification',
    html: msgHtml
  }));
  try {
    for (const m of msgs) await sgMail.send(m);
    console.log('[Email] Sent plain email to', toArr.join(', '), 'subject:', subject || 'ScoutLink');
    return { success: true, template: 'plain' };
  } catch(err) {
    console.error('[Email] Plain send failed:', err?.response?.body || err.message);
    return { success: false, error: err.message, details: err?.response?.body || null };
  }
}

async function sendTemplateFallback({ to, templates, data }) {
  const options = (templates || []).filter(t => t && t.id);
  for (const t of options) {
    const result = await send({ to, templateId: t.id, data });
    if (result.success) return { ...result, template: t.name, templateId: t.id };
    console.error('[Email] Template send failed for', t.name, result.error || result.details || 'unknown error');
  }
  return { success: false, error: 'No SendGrid template accepted the email', details: options.map(t => t.name).join(', ') || 'No templates configured' };
}

module.exports = {
  // SENDGRID_TEMPLATE_COACH_REG_ALERT — sent to Stratex admin when a new coach registers
  sendCoachRegAlert: async (d) => {
    const data = registrationAlertData(d, 'Coach');
    const result = await send({ to: config.adminEmails, templateId: config.sendgrid.templates.coachRegAlert, data });
    if (result.success) return { ...result, template: 'coachRegAlert' };
    return sendPlain({
      to: config.adminEmails,
      subject: 'New coach registration: ' + (data.fullName || data.email),
      text: 'A new coach registration has been submitted.\n\nName: ' + data.fullName + '\nEmail: ' + data.email + '\nTeam: ' + (data.teamName || data.team_name || '') + '\nLeague: ' + (data.league || '') + '\n\nReview it here: ' + data.reviewLink
    });
  },

  // SENDGRID_TEMPLATE_SCOUT_REG_ALERT — sent to Stratex admin when a new scout registers
  sendScoutRegAlert: async (d) => {
    const data = registrationAlertData(d, 'Scout');
    const result = await send({ to: config.adminEmails, templateId: config.sendgrid.templates.scoutRegAlert, data });
    if (result.success) return { ...result, template: 'scoutRegAlert' };
    return sendPlain({
      to: config.adminEmails,
      subject: 'New scout registration: ' + (data.fullName || data.email),
      text: 'A new scout registration has been submitted.\n\nName: ' + data.fullName + '\nEmail: ' + data.email + '\nClub: ' + (data.scoutClub || data.scout_club || '') + '\nLeague: ' + (data.scoutLeague || data.scout_league || '') + '\n\nReview it here: ' + data.reviewLink
    });
  },

  sendRegistrationReceived: async (d) => {
    const accountType = d.accountType || d.account_type || 'Scout';
    const data = registrationReceivedData(d, accountType);
    return sendPlain({
      to: data.email,
      subject: 'We have received your ScoutLink registration',
      text: 'Hi ' + data.firstName + ',\n\nThanks for registering with ScoutLink. We have seen your registration and the Stratex team will review it shortly.\n\nPlease check your junk or spam folder if you do not see a response within 24 hours.\n\nScoutLink by Stratex Analytics'
    });
  },

  // SENDGRID_TEMPLATE_REG_APPROVED — sent to the applicant when their registration is approved
  sendRegApproved: (d) => {
    d = inviteData(d || {});
    return sendTemplateFallback({
      to: d.to,
      templates: [
        { name: 'regApproved', id: config.sendgrid.templates.regApproved },
        { name: 'completeSignup', id: config.sendgrid.templates.completeSignup }
      ],
      data: d
    });
  },

  // SENDGRID_TEMPLATE_REG_DECLINED — sent to the applicant when their registration is declined
  sendRegDeclined: (d) => send({ to: d.to, templateId: config.sendgrid.templates.regDeclined, data: inviteData(d || {}) }),

  // SENDGRID_TEMPLATE_SCOUT_INTEREST — sent to a coach when a scout registers interest in one of their players
  sendScoutInterest: (d) => send({ to: d.to, templateId: config.sendgrid.templates.scoutInterest, data: d }),

  // SENDGRID_TEMPLATE_NOTIFICATION — sent as a general notification email
  sendNotification: async (d) => {
    d = notificationData(d || {});
    const templateResult = await send({ to: d.to, templateId: config.sendgrid.templates.notification, data: d });
    if (templateResult.success) return { ...templateResult, template: 'notification' };
    return sendPlain({
      to: d.to,
      subject: d.title || 'ScoutLink notification',
      text: (d.body || d.message || 'You have a new ScoutLink notification.') + '\n\nOpen ScoutLink: ' + (d.actionLink || d.loginUrl || brandBase())
    });
  },

  // SENDGRID_TEMPLATE_COMPLETE_SIGNUP — sent to a user to complete their account setup
  // Also used by sendPlayerLoginCode when a coach adds a player
  sendCompleteSignup: async (d) => {
    d = inviteData(d || {});
    const accountType = String(d.accountType || d.account_type || '').toLowerCase();
    const primary = (accountType === 'player' || accountType === 'stratex')
      ? { name: 'completeSignup', id: config.sendgrid.templates.completeSignup }
      : { name: 'regApproved', id: config.sendgrid.templates.regApproved };
    const secondary = primary.name === 'completeSignup'
      ? { name: 'regApproved', id: config.sendgrid.templates.regApproved }
      : { name: 'completeSignup', id: config.sendgrid.templates.completeSignup };
    return sendTemplateFallback({
      to: d.to,
      templates: [
        primary,
        secondary
      ],
      data: d
    });
  },

  // SENDGRID_TEMPLATE_COMPLETE_SIGNUP — used when a coach adds a player
  sendPlayerLoginCode: async (d) => {
    d = inviteData({ ...(d || {}), accountType: 'Player', firstName: (d && d.playerFirstName) || (d && d.firstName) || 'Player' });
    if (!d.to) return { success: false, error: 'No recipient' };
    return sendTemplateFallback({
      to: d.to,
      templates: [
        { name: 'completeSignup', id: config.sendgrid.templates.completeSignup },
        { name: 'regApproved', id: config.sendgrid.templates.regApproved }
      ],
      data: d
    });
  },

  // SENDGRID_TEMPLATE_RESET_PASSWORD — sent when a user requests a password reset
  sendResetPassword: async (d) => {
    d = resetData(d || {});
    if (!d.to) return { success: false, error: 'No recipient' };
    const templateResult = await send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d });
    if (templateResult.success) return { ...templateResult, template: 'resetPassword' };
    return sendPlain({
      to: d.to,
      subject: 'Reset your ScoutLink password',
      text: 'Hi ' + (d.firstName || d.first_name || 'there') + ',\n\nYour ScoutLink reset code is: ' + d.resetCode + '\n\nUse it here: ' + d.resetLink + '\n\nThis code expires shortly.'
    });
  },
};

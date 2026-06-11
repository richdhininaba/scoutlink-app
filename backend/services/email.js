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
    email: emailAddr,
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
  sendCoachRegAlert: (d) => send({ to: config.adminEmails, templateId: config.sendgrid.templates.coachRegAlert, data: registrationAlertData(d, 'Coach') }),

  // SENDGRID_TEMPLATE_SCOUT_REG_ALERT — sent to Stratex admin when a new scout registers
  sendScoutRegAlert: (d) => send({ to: config.adminEmails, templateId: config.sendgrid.templates.scoutRegAlert, data: registrationAlertData(d, 'Scout') }),

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
  sendNotification: (d) => send({ to: d.to, templateId: config.sendgrid.templates.notification, data: notificationData(d) }),

  // SENDGRID_TEMPLATE_COMPLETE_SIGNUP — sent to a user to complete their account setup
  // Also used by sendPlayerLoginCode when a coach adds a player
  sendCompleteSignup: async (d) => {
    d = inviteData(d || {});
    return sendTemplateFallback({
      to: d.to,
      templates: [
        { name: 'completeSignup', id: config.sendgrid.templates.completeSignup },
        { name: 'regApproved', id: config.sendgrid.templates.regApproved }
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
    return send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d });
  },
};

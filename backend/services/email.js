'use strict';
const config = require('../config');

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
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendCoachRegAlert: (d) => send({ to: config.adminEmails, templateId: config.sendgrid.templates.coachRegAlert, data: d }),
  sendScoutRegAlert: (d) => send({ to: config.adminEmails, templateId: config.sendgrid.templates.scoutRegAlert, data: d }),
  sendRegApproved: (d) => send({ to: d.to, templateId: config.sendgrid.templates.regApproved, data: d }),
  sendRegDeclined: (d) => send({ to: d.to, templateId: config.sendgrid.templates.regDeclined, data: d }),
  sendScoutInterest: (d) => send({ to: d.to, templateId: config.sendgrid.templates.scoutInterest, data: d }),
  sendNotification: (d) => send({ to: d.to, templateId: config.sendgrid.templates.notification, data: d }),
  sendResetPassword: (d) => send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d }),
  sendCompleteSignup: (d) => send({ to: d.to, templateId: config.sendgrid.templates.completeSignup, data: d }),
};

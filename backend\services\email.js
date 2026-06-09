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
  sendPlayerLoginCode: async (d) => {
    if (!d.to) return { success: false, error: 'No recipient' };
    try {
      const config = require('../config');
      if (!config.sendgrid || !config.sendgrid.apiKey) return { success: false, error: 'No SendGrid key' };
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(config.sendgrid.apiKey);
      await sgMail.send({
        to: d.to,
        from: { email: config.sendgrid.fromEmail || 'noreply@scoutlink.app', name: 'ScoutLink' },
        subject: 'Your ScoutLink account is ready',
        html: '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0d1117;color:#fff"><h1 style="color:#1d9e75">Welcome to ScoutLink!</h1><p>Hi ' + (d.playerFirstName || 'Player') + ',</p><p>Your coach has added you to ScoutLink. Use the code below to access your profile:</p><div style="background:#161b22;border:2px solid #1d9e75;border-radius:12px;padding:24px;margin:20px 0;text-align:center"><h2 style="color:#1d9e75;font-size:32px;letter-spacing:8px;margin:0">' + (d.loginCode || '') + '</h2></div><p>Log in at: <a href="' + (d.loginUrl || 'https://scoutlink.app/frontend/pages/login.html') + '" style="color:#1d9e75">' + (d.loginUrl || 'https://scoutlink.app/frontend/pages/login.html') + '</a></p><p>Select <b>Player</b> as your account type and click <b>Login with Code</b>.</p><p style="color:#8b949e;margin-top:32px;font-size:12px">Stratex Analytics — ScoutLink Platform</p></div>'
      });
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },
  sendResetPassword: (d) => send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d }),
  sendCompleteSignup: (d) => send({ to: d.to, templateId: config.sendgrid.templates.completeSignup, data: d }),
};

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
  return {
    loginUrl: accountLink('/login', {}),
    completeLink: d.completeLink || accountLink('/complete-registration', { code: loginCode, email: emailAddr, type: accountType }),
    accountType,
    ...d
  };
}

function resetData(d) {
  const accountType = d.accountType || 'Player';
  const emailAddr = d.email || d.to || '';
  const resetCode = d.resetCode || d.loginCode || '';
  return {
    resetLink: d.resetLink || accountLink('/forgot-password', { code: resetCode, email: emailAddr, type: accountType }),
    loginUrl: accountLink('/login', {}),
    accountType,
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
    return { success: false, error: err.message };
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

async function sendCompleteSignupEmail(d) {
  d = inviteData(d || {});
  if (config.sendgrid.templates.completeSignup) {
    return send({ to: d.to, templateId: config.sendgrid.templates.completeSignup, data: d });
  }
  if (!d.to) return { success: false, error: 'No recipient' };
  if (!config.sendgrid.apiKey) {
    console.warn('[Email] SENDGRID_API_KEY not configured - skipping complete signup email');
    return { success: false, skipped: true };
  }
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };
  const link = d.completeLink || d.loginUrl || accountLink('/login', {});
  try {
    await sgMail.send({
      to: d.to,
      from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
      subject: 'Complete your ScoutLink ' + (d.accountType || 'account') + ' setup',
      html: '<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:28px;background:#0d1117;color:#e6edf3;border-radius:16px">' +
        '<div style="font-size:24px;font-weight:900;margin-bottom:20px">Scout<span style="color:#1d9e75">Link</span></div>' +
        '<h1 style="font-size:24px;margin:0 0 12px;color:#ffffff">Your account is ready</h1>' +
        '<p style="color:#b8c1cc;line-height:1.6">Hi ' + esc(d.firstName || 'there') + ', your ScoutLink ' + esc(d.accountType || 'account') + ' account has been created. Use the code below to complete registration.</p>' +
        '<div style="background:#101722;border:1px solid #1d9e75;border-radius:14px;padding:22px;text-align:center;margin:22px 0">' +
        '<div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Login code</div>' +
        '<div style="font-size:34px;letter-spacing:8px;font-weight:900;color:#1d9e75;margin-top:6px">' + esc(d.loginCode || '') + '</div>' +
        '</div>' +
        '<p style="margin:0 0 20px"><a href="' + esc(link) + '" style="display:inline-block;background:#1d9e75;color:#001b12;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:800">Complete registration</a></p>' +
        '<p style="font-size:12px;color:#8b949e;line-height:1.6">If the button does not work, open this link: <br><a href="' + esc(link) + '" style="color:#1d9e75">' + esc(link) + '</a></p>' +
        '<p style="font-size:12px;color:#6b7280;margin-top:28px">Stratex Analytics - ScoutLink Platform</p>' +
        '</div>'
    });
    return { success: true };
  } catch(err) {
    console.error('[Email] Complete signup fallback failed:', err?.response?.body || err.message);
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
    d = inviteData({ ...(d || {}), accountType: 'Player', firstName: (d && d.playerFirstName) || (d && d.firstName) || 'Player' });
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
        html: '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0d1117;color:#fff"><h1 style="color:#1d9e75">Welcome to ScoutLink!</h1><p>Hi ' + esc(d.playerFirstName || d.firstName || 'Player') + ',</p><p>Your coach has added you to ScoutLink. Use the code below to access your profile:</p><div style="background:#161b22;border:2px solid #1d9e75;border-radius:12px;padding:24px;margin:20px 0;text-align:center"><h2 style="color:#1d9e75;font-size:32px;letter-spacing:8px;margin:0">' + esc(d.loginCode || '') + '</h2></div><p><a href="' + esc(d.completeLink) + '" style="display:inline-block;background:#1d9e75;color:#001b12;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:800">Complete registration</a></p><p>Or log in at: <a href="' + esc(d.loginUrl) + '" style="color:#1d9e75">' + esc(d.loginUrl) + '</a></p><p>Select <b>Player</b> as your account type and click <b>Login with Code</b>.</p><p style="color:#8b949e;margin-top:32px;font-size:12px">Stratex Analytics - ScoutLink Platform</p></div>'
      });
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },
  sendResetPassword: async (d) => {
    d = resetData(d || {});
    if (config.sendgrid.templates.resetPassword) {
      return send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d });
    }
    if (!d.to) return { success: false, error: 'No recipient' };
    if (!config.sendgrid.apiKey) {
      console.warn('[Email] SENDGRID_API_KEY not configured - skipping reset password email');
      return { success: false, skipped: true };
    }
    const sgMail = getSgMail();
    if (!sgMail) return { success: false, error: 'SendGrid not available' };
    try {
      await sgMail.send({
        to: d.to,
        from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
        subject: 'Reset your ScoutLink password',
        html: '<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:28px;background:#0d1117;color:#e6edf3;border-radius:16px">' +
          '<div style="font-size:24px;font-weight:900;margin-bottom:20px">Scout<span style="color:#1d9e75">Link</span></div>' +
          '<h1 style="font-size:24px;margin:0 0 12px;color:#ffffff">Reset your password</h1>' +
          '<p style="color:#b8c1cc;line-height:1.6">Hi ' + esc(d.firstName || 'there') + ', use this reset code to set a new ScoutLink password.</p>' +
          '<div style="background:#101722;border:1px solid #1d9e75;border-radius:14px;padding:22px;text-align:center;margin:22px 0">' +
          '<div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Reset code</div>' +
          '<div style="font-size:34px;letter-spacing:8px;font-weight:900;color:#1d9e75;margin-top:6px">' + esc(d.resetCode || '') + '</div>' +
          '</div>' +
          '<p style="margin:0 0 20px"><a href="' + esc(d.resetLink) + '" style="display:inline-block;background:#1d9e75;color:#001b12;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:800">Open reset page</a></p>' +
          '<p style="font-size:12px;color:#8b949e;line-height:1.6">If the button does not work, open this link: <br><a href="' + esc(d.resetLink) + '" style="color:#1d9e75">' + esc(d.resetLink) + '</a></p>' +
          '<p style="font-size:12px;color:#6b7280;margin-top:28px">Stratex Analytics - ScoutLink Platform</p>' +
          '</div>'
      });
      return { success: true };
    } catch(err) {
      console.error('[Email] Reset password fallback failed:', err?.response?.body || err.message);
      return { success: false, error: err.message };
    }
  },
  sendCompleteSignup: sendCompleteSignupEmail,
};

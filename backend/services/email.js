'use strict';
const sgMail = require('@sendgrid/mail');
const config = require('./config');
sgMail.setApiKey(config.sendgrid.apiKey);

async function send({ to, templateId, data }) {
  const toArr = Array.isArray(to) ? to : [to];
  const msgs = toArr.map(addr => ({
    to: addr, from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
    templateId, dynamicTemplateData: { brandUrl: config.brandUrl, year: new Date().getFullYear(), ...data }
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
  sendRegApproved:   (d) => send({ to: d.to, templateId: config.sendgrid.templates.regApproved, data: d }),
  sendRegDeclined:   (d) => send({ to: d.to, templateId: config.sendgrid.templates.regDeclined, data: d }),
  sendScoutInterest: (d) => send({ to: d.to, templateId: config.sendgrid.templates.scoutInterest, data: d }),
  sendNotification:  (d) => send({ to: d.to, templateId: config.sendgrid.templates.notification, data: d }),
  sendResetPassword: (d) => send({ to: d.to, templateId: config.sendgrid.templates.resetPassword, data: d }),
  sendCompleteSignup:(d) => send({ to: d.to, templateId: config.sendgrid.templates.completeSignup, data: d }),
};
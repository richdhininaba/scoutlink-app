'use strict';

const config = require('../config');
const { templateByKey, missingRequired } = require('./emailTemplates');

function brandBase() {
  return String(config.brandUrl || 'https://scoutlink.app').replace(/\/+$/, '').replace('https://www.scoutlink.app', 'https://scoutlink.app');
}

function accountLink(path, params) {
  const qs = new URLSearchParams();
  Object.keys(params || {}).forEach(k => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.set(k, params[k]);
  });
  const query = qs.toString();
  return brandBase() + path + (query ? '?' + query : '');
}

function prettyDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function getSgMail() {
  try {
    const sgMail = require('@sendgrid/mail');
    if (config.sendgrid.apiKey) sgMail.setApiKey(config.sendgrid.apiKey);
    return sgMail;
  } catch (err) {
    console.warn('[Email] @sendgrid/mail not available:', err.message);
    return null;
  }
}

function withDefaults(data) {
  return {
    brandUrl: brandBase(),
    year: String(new Date().getFullYear()),
    ...(data || {})
  };
}

async function sendTemplate({ to, templateKey, data }) {
  const template = templateByKey(templateKey);
  if (!template) return { success: false, error: 'Unknown SendGrid template: ' + templateKey };
  const payload = withDefaults(data);
  const missing = missingRequired(templateKey, payload);
  if (missing.length) {
    const message = template.name + ' missing required template data: ' + missing.join(', ');
    console.warn('[Email]', message);
    return { success: false, error: message, missing, template: template.name, templateId: template.id };
  }
  if (!config.sendgrid.apiKey) {
    console.warn('[Email] SENDGRID_API_KEY not configured - cannot send', template.name);
    return { success: false, skipped: true, error: 'SENDGRID_API_KEY not configured', template: template.name, templateId: template.id };
  }
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available', template: template.name, templateId: template.id };
  const recipients = (Array.isArray(to) ? to : [to]).map(v => String(v || '').trim()).filter(Boolean);
  if (!recipients.length) return { success: false, error: 'No recipient', template: template.name, templateId: template.id };

  try {
    for (const addr of recipients) {
      await sgMail.send({
        to: addr,
        from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
        templateId: template.id,
        dynamicTemplateData: payload
      });
    }
    console.log('[Email] Sent', template.name, 'to', recipients.join(', '));
    return { success: true, template: template.name, templateId: template.id };
  } catch (err) {
    console.error('[Email] Failed', template.name + ':', err?.response?.body || err.message);
    return { success: false, error: err.message, details: err?.response?.body || null, template: template.name, templateId: template.id };
  }
}

function inviteData(d) {
  d = d || {};
  const accountType = d.accountType || d.account_type || 'Account';
  const emailAddr = d.email || d.to || '';
  const loginCode = d.loginCode || d.login_code || d.code || '';
  const firstName = d.firstName || d.first_name || d.playerFirstName || 'there';
  const completeLink = d.completeLink || accountLink('/complete-registration', { code: loginCode, email: emailAddr, type: accountType });
  return {
    ...d,
    firstName,
    email: emailAddr,
    accountType,
    loginCode,
    completeLink
  };
}

function registrationAlertData(d, accountType) {
  d = d || {};
  const firstName = d.firstName || d.first_name || '';
  const lastName = d.lastName || d.last_name || '';
  const emailAddr = d.email || d.emailAddr || d.email_addr || '';
  return {
    ...d,
    firstName,
    lastName,
    email: emailAddr,
    teamName: d.teamName || d.team_name || d.scoutClub || d.scout_club || d.clubName || d.club_name || 'Not provided',
    submittedAt: d.submittedAt || d.submitted_at || prettyDate(d.created_at || d.createdAt),
    brandUrl: brandBase(),
    registrationId: d.registrationId || d.registration_id || d.requestId || d.request_id || '',
    roleLabel: accountType
  };
}

function registrationReceivedData(d, accountType) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    roleLabel: String(accountType || d.accountType || d.account_type || 'account').toLowerCase(),
    teamName: d.teamName || d.team_name || '',
    clubName: d.clubName || d.club_name || d.scoutClub || d.scout_club || '',
    applicationReference: d.applicationReference || d.application_reference || d.requestId || d.request_id || ''
  };
}

function declinedData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    reason: d.reason || d.declineReason || d.decline_reason || d.customReason || ''
  };
}

function scoutInterestData(d) {
  d = d || {};
  return {
    ...d,
    playerFirstName: d.playerFirstName || d.player_first_name || '',
    playerLastName: d.playerLastName || d.player_last_name || '',
    scoutFirstName: d.scoutFirstName || d.scout_first_name || '',
    scoutLastName: d.scoutLastName || d.scout_last_name || '',
    scoutTeamName: d.scoutTeamName || d.scout_team_name || d.teamName || d.team_name || d.clubName || d.club_name || 'ScoutLink scout',
    profileUrl: d.profileUrl || d.profile_url || accountLink('/player/profile', { id: d.playerId || d.player_id || '' }),
    message: d.message || ''
  };
}

function jobApplicationReceivedData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    jobTitle: d.jobTitle || d.job_title || '',
    department: d.department || '',
    applicationId: d.applicationId || d.application_id || '',
    submittedAt: d.submittedAt || d.submitted_at || prettyDate(d.created_at || d.submittedAt),
    jobUrl: d.jobUrl || d.job_url || ''
  };
}

function jobApplicationAlertData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || '',
    lastName: d.lastName || d.last_name || '',
    email: d.email || '',
    phone: d.phone || '',
    jobTitle: d.jobTitle || d.job_title || '',
    applicationUrl: d.applicationUrl || d.application_url || '',
    department: d.department || '',
    location: d.location || '',
    workingType: d.workingType || d.working_type || '',
    employmentType: d.employmentType || d.employment_type || '',
    salaryRange: d.salaryRange || d.salary_range || '',
    submittedAt: d.submittedAt || d.submitted_at || prettyDate(d.created_at || d.submittedAt),
    applicationId: d.applicationId || d.application_id || '',
    jobId: d.jobId || d.job_id || '',
    cvFileName: d.cvFileName || d.cv_file_name || '',
    cvUrl: d.cvUrl || d.cv_url || '',
    jobUrl: d.jobUrl || d.job_url || ''
  };
}

async function sendResetPassword(d) {
  const templateId = config.sendgrid.templates.resetPassword;
  const payload = withDefaults({
    resetLink: d.resetLink || accountLink('/forgot-password', { code: d.resetCode || d.loginCode, email: d.email || d.to, type: d.accountType || 'Player' }),
    resetCode: d.resetCode || d.loginCode || '',
    firstName: d.firstName || d.first_name || 'there',
    email: d.email || d.to || '',
    accountType: d.accountType || 'Player',
    ...(d || {})
  });
  if (!templateId) return { success: false, error: 'SENDGRID_TEMPLATE_RESET_PASSWORD not configured' };
  if (!config.sendgrid.apiKey) return { success: false, skipped: true, error: 'SENDGRID_API_KEY not configured' };
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };
  try {
    await sgMail.send({
      to: d.to || d.email,
      from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
      templateId,
      dynamicTemplateData: payload
    });
    return { success: true, template: 'Reset Password', templateId };
  } catch (err) {
    return { success: false, error: err.message, details: err?.response?.body || null, templateId };
  }
}

async function sendNotification(d) {
  const templateId = config.sendgrid.templates.notification;
  if (!templateId) return { success: false, error: 'SENDGRID_TEMPLATE_NOTIFICATION not configured' };
  if (!config.sendgrid.apiKey) return { success: false, skipped: true, error: 'SENDGRID_API_KEY not configured' };
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };
  const payload = withDefaults({
    title: d.title || d.subject || 'ScoutLink notification',
    subject: d.title || d.subject || 'ScoutLink notification',
    body: d.body || d.message || '',
    message: d.body || d.message || '',
    actionLink: d.actionLink || d.action_link || brandBase(),
    ...(d || {})
  });
  try {
    await sgMail.send({
      to: d.to,
      from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
      templateId,
      dynamicTemplateData: payload
    });
    return { success: true, template: 'Notification', templateId };
  } catch (err) {
    return { success: false, error: err.message, details: err?.response?.body || null, templateId };
  }
}

module.exports = {
  sendTemplate,
  sendCoachRegAlert: (d) => sendTemplate({ to: config.adminEmails, templateKey: 'coachRegAlert', data: registrationAlertData(d, 'Coach') }),
  sendScoutRegAlert: (d) => sendTemplate({ to: config.adminEmails, templateKey: 'scoutRegAlert', data: registrationAlertData(d, 'Scout') }),
  sendRegistrationReceived: (d) => {
    const accountType = d.accountType || d.account_type || 'account';
    return sendTemplate({ to: d.to || d.email, templateKey: 'registrationReceived', data: registrationReceivedData(d, accountType) });
  },
  sendRegApproved: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'regApproved', data: inviteData(d) }),
  sendRegDeclined: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'regDeclined', data: declinedData(d) }),
  sendScoutInterest: (d) => sendTemplate({ to: d.to, templateKey: 'scoutInterest', data: scoutInterestData(d) }),
  sendCompleteSignup: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'completeSignup', data: inviteData(d) }),
  sendPlayerLoginCode: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'completeSignup', data: inviteData({ ...(d || {}), accountType: 'Player', firstName: (d && (d.playerFirstName || d.firstName)) || 'Player' }) }),
  sendJobApplicationReceived: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'jobApplicationReceived', data: jobApplicationReceivedData(d) }),
  sendJobApplicationAlert: (d) => sendTemplate({ to: d.to, templateKey: 'jobApplicationAlert', data: jobApplicationAlertData(d) }),
  sendNotification,
  sendResetPassword,
  brandBase,
  accountLink,
  prettyDate
};

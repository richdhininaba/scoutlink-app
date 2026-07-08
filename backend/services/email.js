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
    console.log('[Email] Sent', template.name, { recipientCount: recipients.length });
    return { success: true, template: template.name, templateId: template.id };
  } catch (err) {
    console.error('[Email] Failed', template.name + ':', err.message);
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

function scoutVerificationRequiredData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    verificationLink: d.verificationLink || d.verification_link || ''
  };
}

function scoutPaymentRequiredData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    planName: d.planName || d.plan_name || d.subscriptionPlan || d.subscription_plan || '',
    paymentLink: d.paymentLink || d.payment_link || ''
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
    cvPath: d.cvPath || d.cv_path || '',
    jobUrl: d.jobUrl || d.job_url || ''
  };
}

function jobApplicationStageOneData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    jobTitle: d.jobTitle || d.job_title || '',
    interviewAvailabilityUrl: d.interviewAvailabilityUrl || d.interview_availability_url || '',
    reportingToFullName: d.reportingToFullName || d.reporting_to_full_name || 'Richdhin Inaba',
    reportingToJobTitle: d.reportingToJobTitle || d.reporting_to_job_title || 'Founder'
  };
}

function jobApplicationDeclineData(d) {
  d = d || {};
  return {
    firstName: d.firstName || d.first_name || 'there',
    jobTitle: d.jobTitle || d.job_title || '',
    reportingToEmail: d.reportingToEmail || d.reporting_to_email || 'richdhin@stratexanalytics.co.uk',
    reportingToFullName: d.reportingToFullName || d.reporting_to_full_name || 'Richdhin Inaba',
    reportingToJobTitle: d.reportingToJobTitle || d.reporting_to_job_title || 'Founder'
  };
}

function interviewAvailabilitySubmittedData(d) {
  d = d || {};
  const slots = Array.isArray(d.slots) ? d.slots : [];
  const lines = slots.map((slot) => '• ' + prettyDate(slot)).join('\n');
  return {
    title: 'Interview availability submitted',
    subject: 'Interview availability submitted for ' + (d.jobTitle || d.job_title || 'a ScoutLink role'),
    body: [
      (d.applicantName || 'An applicant') + ' has submitted interview availability.',
      'Email: ' + (d.applicantEmail || d.applicant_email || ''),
      'Role: ' + (d.jobTitle || d.job_title || ''),
      d.applicationRef ? 'Application reference: ' + d.applicationRef : '',
      '',
      lines || 'No slots were supplied.'
    ].filter(line => line !== '').join('\n'),
    message: [
      (d.applicantName || 'An applicant') + ' has submitted interview availability.',
      'Email: ' + (d.applicantEmail || d.applicant_email || ''),
      'Role: ' + (d.jobTitle || d.job_title || ''),
      d.applicationRef ? 'Application reference: ' + d.applicationRef : '',
      '',
      lines || 'No slots were supplied.'
    ].filter(line => line !== '').join('\n'),
    actionLink: d.applicationUrl || d.application_url || brandBase() + '/stratex/hiring',
    applicantName: d.applicantName || d.applicant_name || '',
    applicantEmail: d.applicantEmail || d.applicant_email || '',
    jobTitle: d.jobTitle || d.job_title || '',
    applicationRef: d.applicationRef || d.application_ref || '',
    selectedSlots: lines,
    reportingToFullName: d.reportingToFullName || d.reporting_to_full_name || '',
    submittedAt: d.submittedAt || d.submitted_at || prettyDate()
  };
}

function safeTemplateText(value, max) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .slice(0, max || 4000)
    .trim();
}

function firstNameFrom(value) {
  const name = safeTemplateText(value, 180);
  if (!name) return 'there';
  return name.split(/\s+/)[0] || 'there';
}

function trustConfirmationData(d) {
  d = d || {};
  const submittedAt = d.submittedAt || d.submitted_at || d.created_at || new Date().toISOString();
  const submissionType = d.submissionType || d.submission_type || 'Contact Us';
  const category = d.concernCategory || d.concern_category || d.category || d.reason || '';
  return {
    firstName: firstNameFrom(d.firstName || d.first_name || d.name || d.fullName || d.full_name),
    submissionReference: safeTemplateText(d.submissionReference || d.submission_reference || d.id || '', 80),
    submittedAt: prettyDate(submittedAt),
    submissionType: safeTemplateText(submissionType, 120) || 'Contact Us',
    concernCategory: safeTemplateText(category || 'Not applicable', 160) || 'Not applicable',
    contactReason: safeTemplateText(d.contactReason || d.contact_reason || category || 'Not applicable', 160) || 'Not applicable',
    role: safeTemplateText(d.role || 'Not provided', 120) || 'Not provided',
    organisation: safeTemplateText(d.organisation || d.organization || 'Not provided', 220) || 'Not provided',
    playerOrTeamMentioned: safeTemplateText(d.playerOrTeamMentioned || d.player_or_team_mentioned || 'Not provided', 220) || 'Not provided',
    safeguardingFlag: d.safeguardingFlag === true || d.safeguarding_flag === true ? 'Yes' : 'No',
    message: safeTemplateText(d.message || 'No message supplied.', 1800) || 'No message supplied.'
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
  if (!templateId) return { success: false, error: 'SENDGRID_NOTIFICATION_TEMPLATE_ID not configured' };
  if (!config.sendgrid.apiKey) return { success: false, skipped: true, error: 'SENDGRID_API_KEY not configured' };
  const sgMail = getSgMail();
  if (!sgMail) return { success: false, error: 'SendGrid not available' };
  const notificationTitle = d.notificationTitle || d.title || d.subject || 'ScoutLink notification';
  const notificationBody = d.notificationBody || d.body || d.message || '';
  const actionUrl = d.actionUrl || d.actionLink || d.action_link || '';
  const payload = withDefaults({
    firstName: d.firstName || d.first_name || 'there',
    notificationTitle,
    notificationBody,
    notificationTypeLabel: d.notificationTypeLabel || d.typeLabel || d.notification_type_label || 'Notification',
    playerName: d.playerName || d.player_name || '',
    teamName: d.teamName || d.team_name || '',
    submittedAt: d.submittedAt || d.submitted_at || prettyDate(),
    actionLabel: d.actionLabel || d.action_label || (actionUrl ? 'Open ScoutLink' : ''),
    actionUrl,
    notification_id: d.notification_id || d.notificationId || '',
    notificationId: d.notificationId || d.notification_id || '',
    title: notificationTitle,
    subject: notificationTitle,
    body: notificationBody,
    message: notificationBody,
    actionLink: actionUrl,
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
  sendScoutVerificationRequired: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'scoutVerificationRequired', data: scoutVerificationRequiredData(d) }),
  sendScoutPaymentRequired: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'scoutPaymentRequired', data: scoutPaymentRequiredData(d) }),
  sendScoutInterest: (d) => sendTemplate({ to: d.to, templateKey: 'scoutInterest', data: scoutInterestData(d) }),
  sendCompleteSignup: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'completeSignup', data: inviteData(d) }),
  sendPlayerLoginCode: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'completeSignup', data: inviteData({ ...(d || {}), accountType: 'Player', firstName: (d && (d.playerFirstName || d.firstName)) || 'Player' }) }),
  sendJobApplicationReceived: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'jobApplicationReceived', data: jobApplicationReceivedData(d) }),
  sendJobApplicationAlert: (d) => sendTemplate({ to: d.to, templateKey: 'jobApplicationAlert', data: jobApplicationAlertData(d) }),
  sendJobApplicationStageOneEmail: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'jobApplicationStageOne', data: jobApplicationStageOneData(d) }),
  sendJobApplicationDeclineEmail: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'jobApplicationDecline', data: jobApplicationDeclineData(d) }),
  sendInterviewAvailabilitySubmittedAdminEmail: (d) => sendNotification({ ...(d || {}), ...interviewAvailabilitySubmittedData(d) }),
  sendTrustContactConfirmation: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'trustContactConfirmation', data: trustConfirmationData(d) }),
  sendTrustConcernConfirmation: (d) => sendTemplate({ to: d.to || d.email, templateKey: 'trustConcernConfirmation', data: trustConfirmationData(d) }),
  sendNotification,
  sendResetPassword,
  brandBase,
  accountLink,
  prettyDate
};

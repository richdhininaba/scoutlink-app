'use strict';

const TEMPLATES = {
  registrationReceived: {
    name: 'Registration Received',
    id: 'd-e3bf46f28b554020860c6ef05bb75688',
    required: ['firstName', 'roleLabel', 'year'],
    optional: ['teamName', 'clubName', 'applicationReference']
  },
  scoutInterest: {
    name: 'Scout Interest Notification',
    id: 'd-f36f982847a8411a9c75d5b1dbf472a1',
    required: ['playerFirstName', 'playerLastName', 'scoutFirstName', 'scoutLastName', 'scoutTeamName', 'profileUrl', 'year'],
    optional: ['message']
  },
  regDeclined: {
    name: 'Registration Declined',
    id: 'd-b4d16201fba14983bbf65d351339ad3a',
    required: ['firstName', 'year'],
    optional: ['reason']
  },
  regApproved: {
    name: 'Registration Approved',
    id: 'd-60159b8916c945bbb3edc69eb443a91d',
    required: ['firstName', 'email', 'accountType', 'loginCode', 'year'],
    optional: []
  },
  scoutRegAlert: {
    name: 'Scout Registration Alert',
    id: 'd-a855db27416d4ba19ac00cb19f144485',
    required: ['firstName', 'lastName', 'email', 'teamName', 'submittedAt', 'brandUrl', 'registrationId', 'year'],
    optional: []
  },
  coachRegAlert: {
    name: 'Coach Registration Alert',
    id: 'd-771875886548470d9b8af529a06a6d80',
    required: ['firstName', 'lastName', 'email', 'teamName', 'submittedAt', 'brandUrl', 'registrationId', 'year'],
    optional: []
  },
  completeSignup: {
    name: 'Complete Signup',
    id: 'd-01ecc68e72604f24bfff7cc40819ccc0',
    required: ['firstName', 'loginCode', 'accountType', 'completeLink', 'year'],
    optional: []
  },
  scoutVerificationRequired: {
    name: 'Scout Verification Required',
    id: 'd-d59661e28d7345649cc5ebfd2885a992',
    required: ['firstName', 'verificationLink', 'year'],
    optional: []
  },
  scoutPaymentRequired: {
    name: 'Verified / Payment Required',
    id: 'd-a495b3e7b51d49c59efe87e54d75981d',
    required: ['firstName', 'planName', 'paymentLink', 'year'],
    optional: []
  },
  jobApplicationReceived: {
    name: 'Job Application Received',
    id: 'd-a8e72760759d41338c9acc968e90fdd9',
    required: ['firstName', 'jobTitle', 'year'],
    optional: ['department', 'applicationId', 'submittedAt', 'jobUrl']
  },
  jobApplicationAlert: {
    name: 'Job Application Alert',
    id: 'd-9d826f9e9e724d7393807b5e031edce3',
    required: ['firstName', 'lastName', 'email', 'jobTitle', 'applicationUrl', 'year'],
    optional: ['phone', 'department', 'location', 'workingType', 'employmentType', 'salaryRange', 'submittedAt', 'applicationId', 'jobId', 'cvFileName', 'cvUrl', 'cvPath', 'jobUrl']
  },
  jobApplicationStageOne: {
    name: 'job application - normal interview',
    id: 'd-3cd4184f942a4d32a3c7e1bb26b2ce63',
    required: ['firstName', 'jobTitle', 'interviewAvailabilityUrl', 'reportingToFullName', 'reportingToJobTitle', 'year'],
    optional: []
  },
  jobApplicationDecline: {
    name: 'job application decline',
    id: 'd-c492ab3e8388462194c5363b9c3ef0c7',
    required: ['firstName', 'jobTitle', 'reportingToEmail', 'reportingToFullName', 'reportingToJobTitle', 'year'],
    optional: []
  },
  trustContactConfirmation: {
    name: 'Contact Form Received',
    id: process.env.SENDGRID_CONTACT_CONFIRMATION_TEMPLATE_ID || 'd-4c105e047fab49019f54864d740cba62',
    required: ['firstName', 'submissionReference', 'submittedAt', 'submissionType', 'concernCategory', 'contactReason', 'role', 'organisation', 'playerOrTeamMentioned', 'safeguardingFlag', 'message', 'year'],
    optional: []
  },
  trustConcernConfirmation: {
    name: 'Concern Reported',
    id: process.env.SENDGRID_CONCERN_CONFIRMATION_TEMPLATE_ID || 'd-1cd7761ae7684cb5b37e4230e905892e',
    required: ['firstName', 'submissionReference', 'submittedAt', 'submissionType', 'concernCategory', 'contactReason', 'role', 'organisation', 'playerOrTeamMentioned', 'safeguardingFlag', 'message', 'year'],
    optional: []
  },
  showcaseProfessionalConfirmation: {
    name: 'Showcase Coach or Scout Confirmation',
    id: 'd-01b0de87b8644e54aba0a44230441f69',
    required: ['firstName', 'role', 'teamName', 'year'],
    optional: []
  },
  showcasePlayerPersonalConfirmation: {
    name: 'Showcase Player Personal Confirmation',
    id: 'd-01b55cf4a1ce4241b5c58411c43bbb41',
    required: ['playerFirstName', 'year'],
    optional: []
  },
  showcaseGuardianConfirmation: {
    name: 'Showcase Parent or Guardian Confirmation',
    id: 'd-ad3c6d7caa634850b8babd59d55741d4',
    required: ['playerFirstName', 'playerLastName', 'year'],
    optional: []
  },
  showcaseInternalRegistrationAlert: {
    name: 'Internal Showcase Registration Alert',
    id: 'd-d7ed1217d67346709c3e26915f444800',
    required: ['registrationType', 'fullName', 'detailLabel', 'detailValue', 'teamOrOrganisation', 'submittedAt', 'year'],
    optional: []
  }
};

function templateByKey(key) {
  return TEMPLATES[key] || null;
}

function missingRequired(key, data) {
  const template = templateByKey(key);
  if (!template) return ['template'];
  const payload = data || {};
  return template.required.filter((field) => (
    payload[field] === undefined ||
    payload[field] === null ||
    payload[field] === ''
  ));
}

module.exports = {
  TEMPLATES,
  templateByKey,
  missingRequired
};


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
    optional: ['phone', 'department', 'location', 'workingType', 'employmentType', 'salaryRange', 'submittedAt', 'applicationId', 'jobId', 'cvFileName', 'cvUrl', 'jobUrl']
  }
};

function templateByKey(key) {
  return TEMPLATES[key] || null;
}

function missingRequired(key, data) {
  const template = templateByKey(key);
  if (!template) return ['template'];
  const payload = data || {};
  return template.required.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === '');
}

module.exports = { TEMPLATES, templateByKey, missingRequired };

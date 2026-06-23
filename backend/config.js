'use strict';
require('dotenv').config();
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  brandUrl: process.env.BRAND_URL || 'https://www.scoutlink.app',
  secretKey: process.env.SECRET_KEY,
  jwtSecret: process.env.JWT_SECRET,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // JWT secret from Supabase project settings -> API -> JWT Settings
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'info@scoutlink.app',
    fromName: process.env.SENDGRID_FROM_NAME || 'ScoutLink',
    templates: {
      coachRegAlert: process.env.SENDGRID_TEMPLATE_COACH_REG_ALERT || 'd-771875886548470d9b8af529a06a6d80',
      scoutRegAlert: process.env.SENDGRID_TEMPLATE_SCOUT_REG_ALERT || 'd-a855db27416d4ba19ac00cb19f144485',
      regApproved: process.env.SENDGRID_TEMPLATE_REG_APPROVED || 'd-60159b8916c945bbb3edc69eb443a91d',
      regDeclined: process.env.SENDGRID_TEMPLATE_REG_DECLINED || 'd-b4d16201fba14983bbf65d351339ad3a',
      notification: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
      resetPassword: process.env.SENDGRID_TEMPLATE_RESET_PASSWORD,
      completeSignup: process.env.SENDGRID_TEMPLATE_COMPLETE_SIGNUP || 'd-01ecc68e72604f24bfff7cc40819ccc0',
      scoutInterest: process.env.SENDGRID_TEMPLATE_SCOUT_INTEREST || 'd-f36f982847a8411a9c75d5b1dbf472a1',
    },
  },
  adminEmails: (process.env.ADMIN_EMAILS || 'richdhin@stratexanalytics.co.uk,lucy.ali@stratexanalytics.co.uk')
    .split(',').map(e => e.trim()).filter(Boolean),
};

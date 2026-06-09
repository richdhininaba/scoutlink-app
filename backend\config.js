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
      coachRegAlert: process.env.SENDGRID_TEMPLATE_COACH_REG_ALERT,
      scoutRegAlert: process.env.SENDGRID_TEMPLATE_SCOUT_REG_ALERT,
      regApproved: process.env.SENDGRID_TEMPLATE_REG_APPROVED,
      regDeclined: process.env.SENDGRID_TEMPLATE_REG_DECLINED,
      notification: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
      resetPassword: process.env.SENDGRID_TEMPLATE_RESET_PASSWORD,
      completeSignup: process.env.SENDGRID_TEMPLATE_COMPLETE_SIGNUP,
      scoutInterest: process.env.SENDGRID_TEMPLATE_SCOUT_INTEREST,
    },
  },
  adminEmails: (process.env.ADMIN_EMAILS || 'richdhin@stratexanalytics.co.uk,lucy.ali@stratexanalytics.co.uk')
    .split(',').map(e => e.trim()).filter(Boolean),
};

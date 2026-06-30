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
      notification: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
      resetPassword: process.env.SENDGRID_TEMPLATE_RESET_PASSWORD,
    },
  },
  adminEmails: (process.env.ADMIN_EMAILS || 'richdhin@stratexanalytics.co.uk,lucy.ali@stratexanalytics.co.uk')
    .split(',').map(e => e.trim()).filter(Boolean),
};

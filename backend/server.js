'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { supabase } = require('./db/supabase');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy:'cross-origin' },
  contentSecurityPolicy: {
    useDefaults:true,
    directives: {
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.eu.heap-api.com',
        'https://cdn.jsdelivr.net'
      ],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:'
      ],
      'connect-src': [
        "'self'",
        'https:',
        'wss:'
      ]
    }
  }
}));

app.use(cors({
  origin: [
    'https://scoutlink.app',
    'https://www.scoutlink.app',
    'https://stratexanalytics.co.uk',
    'https://www.stratexanalytics.co.uk',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials:true
}));

app.use(
  morgan(
    config.nodeEnv === 'production'
      ? 'combined'
      : 'dev'
  )
);

/*
 * Stripe must receive the exact raw request body for signature verification.
 * Keep this route before express.json() and before the general API limiter.
 */
app.post(
  '/api/stripe/webhook',
  express.raw({ type:'application/json', limit:'2mb' }),
  require('./routes/stripeWebhook')
);

app.use(express.json({ limit:'20mb' }));
app.use(express.urlencoded({
  extended:true,
  limit:'20mb'
}));

const limiter = rateLimit({
  windowMs:15 * 60 * 1000,
  max:300,
  message:{ error:'Too many requests' }
});

const authLimiter = rateLimit({
  windowMs:15 * 60 * 1000,
  max:30,
  message:{ error:'Too many auth attempts' }
});

const publicFormLimiter = rateLimit({
  windowMs:15 * 60 * 1000,
  max:60,
  message:{
    error:'Too many submissions. Please wait and try again.'
  }
});

app.use(limiter);

async function healthHandler(_, res) {
  const body = {
    status:'ok',
    version:'4.0.0',
    environment:config.nodeEnv,
    services:{
      api:'ok',
      supabase:'unknown',
      scoring:'v4.0.0'
    },
    timestamp:new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('stratex')
      .select('id', {
        head:true,
        count:'exact'
      })
      .limit(1);

    body.services.supabase =
      error
        ? 'degraded'
        : 'ok';

    if (error) body.status = 'degraded';
  } catch (_) {
    body.status = 'degraded';
    body.services.supabase = 'degraded';
  }

  res
    .status(body.status === 'ok' ? 200 : 503)
    .json(body);
}

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use(
  '/api/auth',
  authLimiter,
  require('./routes/auth')
);

/*
 * Public ScoutLink demo session issuer.
 * Only the fixed seeded Scout and Coach personas can be opened here.
 */
app.use(
  '/api/public-demo',
  authLimiter,
  require('./routes/publicDemoSession')
);

app.use(
  '/api/registrations',
  publicFormLimiter,
  require('./routes/registrations')
);

app.use(
  '/api/scoring',
  require('./routes/scoring')
);

app.use(
  '/api/players',
  require('./routes/playerRatingsSecure')
);

app.use(
  '/api/players',
  require('./routes/players')
);

app.use(
  '/api/match-facts',
  require('./routes/matchFacts')
);

app.use(
  '/api/predictions',
  require('./routes/predictions')
);

app.use(
  '/api/notifications',
  require('./routes/notifications')
);

app.use(
  '/api/stratex',
  require('./routes/stratex')
);

app.use(
  '/api/stratex',
  require('./routes/stratexJobs')
);

app.use(
  '/api/stratex-admin-centre',
  require('./routes/stratexAdminCentreV2')
);

app.use(
  '/api/scouts',
  require('./routes/scoutPipelineStable')
);

app.use(
  '/api/scout',
  require('./routes/scoutPipelineStable')
);

app.use(
  '/api/scouts',
  require('./routes/scouts')
);

app.use(
  '/api/scout',
  require('./routes/scouts')
);

app.use(
  '/api/coaches',
  require('./routes/coaches')
);

app.use(
  '/api/coach-experience',
  require('./routes/coachExperience')
);

app.use(
  '/api/videos',
  require('./routes/videos')
);

app.use(
  '/api/awards',
  require('./routes/awards')
);

app.use(
  '/api/scout-intelligence',
  require('./routes/scoutIntelligence')
);

app.use(
  '/api/scout-intelligence-v64',
  require('./routes/scoutIntelligenceV64')
);

/*
 * Existing Scout data facade. The frontend file name remains V9 so all
 * existing Scout pages continue to load one renderer, but its visual source
 * is replaced by the supplied V6 Desk/Field boards.
 */
app.use(
  '/api/scout-experience-v9',
  require('./routes/scoutExperienceV9')
);

/*
 * Stable functionality facade for the V6 Desk/Field Scout renderer.
 * This keeps the V6 visual source separate from older Scout route contracts
 * and exposes modern player attributes, compatibility explanations, pipeline
 * updates, fixtures, events, settings and personal Scout Setup.
 */
app.use(
  '/api/scout-v6',
  require('./routes/scoutV6Functional')
);

app.use(
  '/api/scout-workflow-actions',
  require('./routes/scoutWorkflowNotifications')
);

/*
 * New direct Stripe top-up API. The old usage-request API stays mounted for
 * historic/admin compatibility, but the new Scout UI does not use it.
 */
app.use(
  '/api/scout-usage',
  require('./routes/scoutUsageCheckout')
);

app.use(
  '/api/usage-requests',
  require('./routes/usageRequests')
);

app.use(
  '/api/exports',
  require('./routes/exports')
);

app.use(
  '/api/chat',
  require('./routes/chat')
);

app.use(
  '/api/season',
  require('./routes/season')
);

app.use(
  '/api/showcase',
  require('./routes/showcase')
);

app.use(
  '/api/fixtures',
  require('./routes/fixtures')
);

app.use(
  '/api/onboarding',
  require('./routes/onboarding')
);

app.use(
  '/api/careers',
  publicFormLimiter,
  require('./routes/careers')
);

app.use(
  '/api/trust',
  publicFormLimiter,
  require('./routes/trust')
);

app.use(
  '/api/stratex-website',
  publicFormLimiter,
  require('./routes/stratexWebsite')
);

app.use(
  '/api/stratex-publishing',
  publicFormLimiter,
  require('./routes/stratexPublishing')
);

app.use((req, res) => {
  res.status(404).json({
    error:'Not found',
    message:
      'This deployment serves the ScoutLink API only. ' +
      'Use the web projects for public and signed-in frontend pages.'
  });
});

app.use((error, req, res, next) => {
  console.error('[Unhandled]', error);

  if (res.headersSent) return next(error);

  res
    .status(error.status || 500)
    .json({
      error:
        config.nodeEnv === 'production'
          ? 'Internal server error'
          : error.message
    });
});

const port =
  config.port ||
  process.env.PORT ||
  3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(
      `ScoutLink API listening on ${port}`
    );
  });
}

module.exports = app;

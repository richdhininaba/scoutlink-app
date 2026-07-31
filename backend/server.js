'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { supabase } = require('./db/supabase');
const { renderStratexPage } = require('./utils/stratexPageRenderer');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy:'cross-origin' },
  contentSecurityPolicy: {
    useDefaults:true,
    directives: {
      'script-src': ["'self'","'unsafe-inline'",'https://fonts.googleapis.com','https://cdn.eu.heap-api.com','https://cdn.jsdelivr.net'],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
      'font-src': ["'self'",'https://fonts.gstatic.com','data:'],
      'img-src': ["'self'",'data:','blob:','https:'],
      'connect-src': ["'self'",'https:','wss:']
    }
  }
}));

app.use(cors({
  origin: [
    'https://scoutlink.app',
    'https://www.scoutlink.app',
    'https://stratexanalytics.co.uk',
    'https://www.stratexanalytics.co.uk',
    'https://richdhininaba.github.io',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials:true
}));

app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit:'20mb' }));
app.use(express.urlencoded({ extended:true, limit:'20mb' }));

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
  message:{ error:'Too many submissions. Please wait and try again.' }
});

app.use(limiter);

async function healthHandler(_, res) {
  const body = {
    status:'ok',
    version:'4.0.0',
    environment:config.nodeEnv,
    services:{ api:'ok', supabase:'unknown', scoring:'v4.0.0' },
    timestamp:new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('stratex')
      .select('id', { head:true, count:'exact' })
      .limit(1);
    body.services.supabase = error ? 'degraded' : 'ok';
    if (error) body.status = 'degraded';
  } catch (_) {
    body.status = 'degraded';
    body.services.supabase = 'degraded';
  }

  res.status(body.status === 'ok' ? 200 : 503).json(body);
}

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

/*
 * API routes.
 * Scoring is mounted before player, Match Facts and prediction routes so every
 * frontend can obtain the canonical safe position/attribute schema first.
 */
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/registrations', publicFormLimiter, require('./routes/registrations'));
app.use('/api/scoring', require('./routes/scoring'));
app.use('/api/players', require('./routes/players'));
app.use('/api/match-facts', require('./routes/matchFacts'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stratex', require('./routes/stratex'));
app.use('/api/stratex', require('./routes/stratexJobs'));
app.use('/api/scouts', require('./routes/scouts'));
app.use('/api/scout', require('./routes/scouts'));
app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/awards', require('./routes/awards'));
app.use('/api/scout-intelligence', require('./routes/scoutIntelligence'));
app.use('/api/scout-intelligence-v64', require('./routes/scoutIntelligenceV64'));
app.use('/api/scout-workflow-actions', require('./routes/scoutWorkflowNotifications'));
app.use('/api/usage-requests', require('./routes/usageRequests'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/season', require('./routes/season'));
app.use('/api/showcase', require('./routes/showcase'));
app.use('/api/fixtures', require('./routes/fixtures'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/careers', publicFormLimiter, require('./routes/careers'));
app.use('/api/trust', publicFormLimiter, require('./routes/trust'));
app.use('/api/stratex-website', publicFormLimiter, require('./routes/stratexWebsite'));
app.use('/api/stratex-publishing', publicFormLimiter, require('./routes/stratexPublishing'));

const frontendDir = [
  path.resolve(__dirname, 'frontend'),
  path.resolve(__dirname, '..', 'frontend')
].find(directory => fs.existsSync(path.join(directory, 'index.html')));

function sendFrontendFile(req, res, relativePath, statusCode) {
  if (!frontendDir) {
    return res.status(500).json({ error:'Frontend bundle is missing from this deployment' });
  }
  if (statusCode) res.status(statusCode);
  return res.sendFile(path.join(frontendDir, relativePath));
}

function sendStratexPage(req, res) {
  if (!frontendDir) {
    return res.status(500).json({ error:'Frontend bundle is missing from this deployment' });
  }
  try {
    return renderStratexPage(req, res, frontendDir);
  } catch (error) {
    console.error('[Stratex page render]', error);
    return sendFrontendFile(req, res, 'pages/404.html', 500);
  }
}

function isStratexHost(req) {
  return /(^|\.)stratexanalytics\.co\.uk$/i.test(req.hostname || req.get('host') || '');
}

const STRATEX_PUBLIC_ROUTES = [
  '/','/scoutlink','/about','/leadership','/trust','/careers',
  '/learning-centre','/contact','/report-a-concern','/privacy-policy',
  '/terms','/cookie-policy','/security','/accessibility',
  '/showcase-event','/award-ceremonies'
];

const STRATEX_SHOWCASE_REGISTRATION_ROUTES = [
  '/showcase-event/player-registration',
  '/showcase-event/player-registration/complete',
  '/showcase-event/coach-scout-registration',
  '/showcase-event/coach-scout-registration/complete',
  '/showcase-event/coach-scout-registration/sold-out'
];

const REMOVED_STRATEX_PUBLIC_ROUTES = new Set([
  '/compatibility-score','/pricing','/coaches','/scouts',
  '/grassroots-football-scouting-tools','/scoutlink/compatibility-score',
  '/scoutlink/pricing','/scoutlink/scouts','/scoutlink/coaches',
  '/scout-verification','/parent-guardian-notice',
  '/careers/interview-availability','/privacy','/cookies','/terms-of-use'
]);

function isRemovedStratexPublicPath(requestPath) {
  const cleanPath = String(requestPath || '/').replace(/\/+$/, '') || '/';
  return REMOVED_STRATEX_PUBLIC_ROUTES.has(cleanPath) ||
    cleanPath === '/company' ||
    (cleanPath.startsWith('/company/') && cleanPath !== '/company/admin');
}

function renderSitemapXml(origin, routes) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.map(route => `  <url><loc>${origin}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n';
}

app.get('/sitemap.xml', async (req, res, next) => {
  if (!isStratexHost(req)) return next();
  const routes = STRATEX_PUBLIC_ROUTES.slice();

  try {
    const [posts, jobs] = await Promise.all([
      supabase
        .from('stratex_learning_posts')
        .select('slug')
        .eq('status', 'published')
        .eq('index_when_published', true),
      supabase
        .from('job_posts')
        .select('slug,status')
        .in('status', ['published','open','live'])
    ]);
    if (!posts.error) {
      (posts.data || []).forEach(post => {
        if (post.slug) routes.push(`/learning-centre/${encodeURIComponent(post.slug)}`);
      });
    }
    if (!jobs.error) {
      (jobs.data || []).forEach(job => {
        if (job.slug) routes.push(`/careers/${encodeURIComponent(job.slug)}`);
      });
    }
  } catch (error) {
    console.error('[Stratex sitemap]', error);
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(renderSitemapXml(
    'https://www.stratexanalytics.co.uk',
    Array.from(new Set(routes))
  ));
});

app.get('/robots.txt', (req, res, next) => {
  if (!isStratexHost(req)) return next();
  res.type('text/plain').send([
    'User-agent: *','Allow: /','Disallow: /admin','Disallow: /company/admin',
    'Disallow: /api/','Disallow: /stratex/',
    'Disallow: /showcase-event/player-registration',
    'Disallow: /showcase-event/coach-scout-registration','',
    'Sitemap: https://www.stratexanalytics.co.uk/sitemap.xml',''
  ].join('\n'));
});

app.get('/llms.txt', (req, res, next) => {
  if (!isStratexHost(req)) return next();
  res.type('text/plain').send([
    '# Stratex Analytics','',
    'Stratex Analytics is a sports technology company building football intelligence products for overlooked grassroots talent. ScoutLink is its flagship platform.','',
    '## Public pages',
    ...STRATEX_PUBLIC_ROUTES.map(route => `- https://www.stratexanalytics.co.uk${route}`),
    '','Private admin, API and signed-in product routes must not be indexed.',''
  ].join('\n'));
});

const routeMap = {
  '/':'index.html',
  '/login':'pages/login.html',
  '/forgot-password':'pages/forgot-password.html',
  '/experience-select':'pages/experience-select.html',
  '/404':'pages/404.html',
  '/demo':'pages/demo.html',
  '/register':'pages/register.html',
  '/register/scout':'pages/register-scout.html',
  '/register/coach':'pages/register-coach.html',
  '/data-policy':'pages/data-policy.html',
  '/privacy-policy':'pages/privacy-policy.html',
  '/terms':'pages/terms.html',
  '/cookie-policy':'pages/cookie-policy.html',
  '/safeguarding':'pages/safeguarding.html',
  '/report-a-concern':'pages/report-concern.html',
  '/privacy-request':'pages/privacy-request.html',
  '/contact':'pages/contact.html',
  '/complete-registration':'pages/complete-registration.html',
  '/confirm-password':'pages/confirm-password.html',

  '/coach/dashboard':'pages/coach-dashboard.html',
  '/coach/onboarding':'pages/coach-onboarding.html',
  '/coach/my-players':'pages/coach-my-players.html',
  '/coach/add-player':'pages/add-player.html',
  '/coach/bulk-add-players':'pages/bulk-add-players.html',
  '/coach/match-facts':'pages/match-facts.html',
  '/coach/fixtures':'pages/coach-fixtures.html',
  '/coach/video-reels':'pages/coach-video-reels.html',
  '/coach/chat':'pages/coach-chat.html',
  '/coach/notifications':'pages/coach-notifications.html',
  '/coach/report-a-concern':'pages/coach-report-concern.html',
  '/coach/settings':'pages/coach-settings.html',
  '/coach/usage-requests':'pages/coach-usage-requests.html',

  '/scout/dashboard':'pages/scout-dashboard.html',
  '/scout/onboarding':'pages/scout-onboarding.html',
  '/scout/player-search':'pages/player-search.html',
  '/scout/pipeline':'pages/scout-pipeline.html',
  '/scout/rankings':'pages/scout-rankings.html',
  '/scout/fixtures':'pages/scout-fixtures.html',
  '/scout/predictions':'pages/scout-predictions.html',
  '/scout/exports':'pages/scout-exports.html',
  '/scout/compare-players':'pages/compare-players.html',
  '/scout/setup':'pages/scout-setup.html',
  '/scout/events':'pages/scout-events.html',
  '/scout/chat':'pages/scout-chat.html',
  '/scout/notifications':'pages/scout-notifications.html',
  '/scout/report-a-concern':'pages/scout-report-concern.html',
  '/scout/settings':'pages/scout-settings.html',
  '/scout/preferences':'pages/scout-preferences.html',
  '/scout/usage-requests':'pages/scout-usage-requests.html',

  '/player/dashboard':'pages/player-dashboard.html',
  '/player/profile':'pages/player-profile.html',
  '/player/edit-profile':'pages/player-profile-edit.html',
  '/player/video-reels':'pages/player-video-reels.html',
  '/player/notifications':'pages/player-notifications.html',
  '/player/settings':'pages/player-settings.html',

  '/stratex/dashboard':'pages/stratex-dashboard.html',
  '/stratex/company-site':'pages/stratex-company-admin.html',
  '/stratex/registrations':'pages/stratex-registrations.html',
  '/stratex/users':'pages/stratex-users.html',
  '/stratex/org':'pages/stratex-org.html',
  '/stratex/hiring':'pages/stratex-hiring.html',
  '/stratex/leave':'pages/stratex-leave.html',
  '/stratex/meetings':'pages/stratex-meetings.html',
  '/stratex/contracts-pay':'pages/stratex-contracts-pay.html',
  '/stratex/players':'pages/stratex-players.html',
  '/stratex/scouts':'pages/stratex-scouts.html',
  '/stratex/coaches':'pages/stratex-coaches.html',
  '/stratex/scout-teams':'pages/stratex-scout-teams.html',
  '/stratex/non-pro-academies':'pages/stratex-school-teams.html',
  '/stratex/award-nominations':'pages/stratex-award-nominations.html',
  '/stratex/showcase-events':'pages/stratex-showcase-events.html',
  '/stratex/notifications':'pages/stratex-notifications.html',
  '/stratex/concerns':'pages/stratex-concerns.html',
  '/stratex/settings':'pages/stratex-settings.html',
  '/stratex/usage-requests':'pages/stratex-usage-requests.html',

  '/showcase-event/player-registration':'pages/showcase-player-registration.html',
  '/showcase-event/player-registration/complete':'pages/showcase-player-registration-complete.html',
  '/showcase-event/coach-scout-registration':'pages/showcase-coach-scout-registration.html',
  '/showcase-event/coach-scout-registration/complete':'pages/showcase-coach-scout-registration-complete.html',
  '/showcase-event/coach-scout-registration/sold-out':'pages/showcase-coach-scout-registration-sold-out.html',
  '/admin/showcase-event':'pages/showcase-event-admin.html'
};

app.use(express.static(frontendDir || path.resolve(__dirname, 'frontend'), {
  index:false,
  etag:true,
  maxAge:config.nodeEnv === 'production' ? '5m' : 0
}));

Object.entries(routeMap).forEach(([route, file]) => {
  app.get(route, (req, res, next) => {
    if (isStratexHost(req) && STRATEX_PUBLIC_ROUTES.includes(route)) {
      return sendStratexPage(req, res);
    }
    return sendFrontendFile(req, res, file);
  });
});

app.get('*', (req, res) => {
  if (isStratexHost(req)) {
    if (isRemovedStratexPublicPath(req.path)) {
      return sendFrontendFile(req, res, 'pages/404.html', 404);
    }
    if (STRATEX_SHOWCASE_REGISTRATION_ROUTES.includes(req.path)) {
      return sendFrontendFile(req, res, routeMap[req.path] || 'pages/404.html');
    }
    return sendStratexPage(req, res);
  }
  return sendFrontendFile(req, res, 'pages/404.html', 404);
});

app.use((error, req, res, next) => {
  console.error('[Unhandled]', error);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({
    error:config.nodeEnv === 'production'
      ? 'Internal server error'
      : error.message
  });
});

const port = config.port || process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`ScoutLink API listening on ${port}`);
  });
}

module.exports = app;

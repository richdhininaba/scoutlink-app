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
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.eu.heap-api.com'],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'", 'https:', 'wss:']
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
  credentials: true
}));

app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many auth attempts' }
});
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many submissions. Please wait and try again.' }
});

app.use(limiter);

async function healthHandler(_, res) {
  const body = {
    status: 'ok',
    version: '2.3.0',
    environment: config.nodeEnv,
    services: { api: 'ok', supabase: 'unknown' },
    timestamp: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('stratex')
      .select('id', { head: true, count: 'exact' })
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

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/registrations', publicFormLimiter, require('./routes/registrations'));
app.use('/api/players', require('./routes/players'));
app.use('/api/match-facts', require('./routes/matchFacts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stratex', require('./routes/stratex'));
app.use('/api/stratex', require('./routes/stratexJobs'));
app.use('/api/scouts', require('./routes/scouts'));
app.use('/api/scout', require('./routes/scouts'));
app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/awards', require('./routes/awards'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/scout-intelligence', require('./routes/scoutIntelligence'));
app.use('/api/scout-intelligence-v64', require('./routes/scoutIntelligenceV64'));
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
].find((directory) => fs.existsSync(path.join(directory, 'index.html')));

function sendFrontendFile(req, res, relativePath, statusCode) {
  if (!frontendDir) {
    return res.status(500).json({ error: 'Frontend bundle is missing from this deployment' });
  }
  if (statusCode) res.status(statusCode);
  return res.sendFile(path.join(frontendDir, relativePath));
}

function sendStratexPage(req, res) {
  if (!frontendDir) {
    return res.status(500).json({ error: 'Frontend bundle is missing from this deployment' });
  }
  try {
    return renderStratexPage(req, res, frontendDir);
  } catch (error) {
    console.error('[Stratex page render]', {
      code: error && error.code,
      message: error && error.message
    });
    return sendFrontendFile(req, res, 'pages/404.html', 500);
  }
}

function isStratexHost(req) {
  return /(^|\.)stratexanalytics\.co\.uk$/i.test(
    req.hostname || req.get('host') || ''
  );
}

const STRATEX_PUBLIC_ROUTES = [
  '/',
  '/scoutlink',
  '/about',
  '/leadership',
  '/trust',
  '/careers',
  '/learning-centre',
  '/contact',
  '/report-a-concern',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
  '/security',
  '/accessibility',
  '/showcase-event',
  '/award-ceremonies'
];

const STRATEX_SHOWCASE_REGISTRATION_ROUTES = [
  '/showcase-event/player-registration',
  '/showcase-event/player-registration/complete',
  '/showcase-event/coach-scout-registration',
  '/showcase-event/coach-scout-registration/complete',
  '/showcase-event/coach-scout-registration/sold-out'
];

const REMOVED_STRATEX_PUBLIC_ROUTES = new Set([
  '/compatibility-score',
  '/pricing',
  '/coaches',
  '/scouts',
  '/grassroots-football-scouting-tools',
  '/scoutlink/compatibility-score',
  '/scoutlink/pricing',
  '/scoutlink/scouts',
  '/scoutlink/coaches',
  '/scout-verification',
  '/parent-guardian-notice',
  '/careers/interview-availability',
  '/privacy',
  '/cookies',
  '/terms-of-use'
]);

function isRemovedStratexPublicPath(requestPath) {
  const cleanPath = String(requestPath || '/').replace(/\/+$/, '') || '/';
  if (REMOVED_STRATEX_PUBLIC_ROUTES.has(cleanPath)) return true;
  return cleanPath === '/company' ||
    (cleanPath.indexOf('/company/') === 0 && cleanPath !== '/company/admin');
}

const STRATEX_SITEMAP_ROUTES = STRATEX_PUBLIC_ROUTES.slice();

function renderSitemapXml(origin, routes) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.map((route) => '  <url><loc>' + origin + route + '</loc></url>').join('\n') +
    '\n</urlset>\n';
}

app.get('/sitemap.xml', async (req, res, next) => {
  if (!isStratexHost(req)) return next();
  const routes = STRATEX_SITEMAP_ROUTES.slice();
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
        .in('status', ['published', 'open', 'live'])
    ]);
    if (!posts.error) {
      (posts.data || []).forEach((post) => {
        if (post.slug) routes.push('/learning-centre/' + encodeURIComponent(post.slug));
      });
    }
    if (!jobs.error) {
      (jobs.data || []).forEach((job) => {
        if (job.slug) routes.push('/careers/' + encodeURIComponent(job.slug));
      });
    }
  } catch (error) {
    console.error('[Stratex sitemap]', { message: error && error.message });
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(
    renderSitemapXml(
      'https://www.stratexanalytics.co.uk',
      Array.from(new Set(routes))
    )
  );
});

app.get('/robots.txt', (req, res, next) => {
  if (!isStratexHost(req)) return next();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /company/admin',
    'Disallow: /api/',
    'Disallow: /stratex/',
    'Disallow: /showcase-event/player-registration',
    'Disallow: /showcase-event/coach-scout-registration',
    '',
    'Sitemap: https://www.stratexanalytics.co.uk/sitemap.xml',
    ''
  ].join('\n'));
});

app.get('/llms.txt', (req, res, next) => {
  if (!isStratexHost(req)) return next();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send([
    '# Stratex Analytics',
    '',
    'Stratex Analytics is a sports technology company building football intelligence products for overlooked grassroots talent. ScoutLink is its flagship platform.',
    '',
    '## Public pages',
    '- Homepage: https://www.stratexanalytics.co.uk/',
    '- ScoutLink: https://www.stratexanalytics.co.uk/scoutlink',
    '- About: https://www.stratexanalytics.co.uk/about',
    '- Leadership: https://www.stratexanalytics.co.uk/leadership',
    '- Trust: https://www.stratexanalytics.co.uk/trust',
    '- Careers: https://www.stratexanalytics.co.uk/careers',
    '- Learning Centre: https://www.stratexanalytics.co.uk/learning-centre',
    '- Contact: https://www.stratexanalytics.co.uk/contact',
    '- Report a concern: https://www.stratexanalytics.co.uk/report-a-concern',
    '- Security: https://www.stratexanalytics.co.uk/security',
    '- Accessibility: https://www.stratexanalytics.co.uk/accessibility',
    '- Showcase events: https://www.stratexanalytics.co.uk/showcase-event',
    '- Award ceremonies: https://www.stratexanalytics.co.uk/award-ceremonies',
    '',
    '## Notes',
    'Removed legacy public routes should return 404 and must not be redirected.',
    'Showcase registration routes remain public but are excluded from indexing.',
    'Private admin, API and signed-in product routes must not be indexed.',
    ''
  ].join('\n'));
});

const routeMap = {
  '/': 'index.html',
  '/login': 'pages/login.html',
  '/forgot-password': 'pages/forgot-password.html',
  '/experience-select': 'pages/experience-select.html',
  '/404': 'pages/404.html',
  '/coaches': 'pages/coaches.html',
  '/scouts': 'pages/scouts.html',
  '/demo': 'pages/demo.html',
  '/scoutlink/pricing': 'pages/stratex-site.html',
  '/register': 'pages/register.html',
  '/register/scout': 'pages/register-scout.html',
  '/register/coach': 'pages/register-coach.html',
  '/data-policy': 'pages/data-policy.html',
  '/privacy-policy': 'pages/privacy-policy.html',
  '/privacy': 'pages/privacy-policy.html',
  '/terms': 'pages/terms.html',
  '/terms-of-use': 'pages/terms.html',
  '/cookie-policy': 'pages/cookie-policy.html',
  '/cookies': 'pages/cookie-policy.html',
  '/safeguarding': 'pages/safeguarding.html',
  '/report-a-concern': 'pages/report-concern.html',
  '/complete-registration': 'pages/complete-registration.html',
  '/confirm-password': 'pages/confirm-password.html',
  '/video-upload': 'pages/video-upload.html',

  '/company/admin': 'pages/stratex-company-admin.html',
  '/admin': 'pages/stratex-company-admin.html',
  '/admin/usage-requests': 'pages/stratex-company-admin.html',
  '/stratex/dashboard': 'pages/stratex-dashboard.html',
  '/stratex/company-site': 'pages/stratex-company-admin.html',
  '/stratex/registrations': 'pages/stratex-registrations.html',
  '/stratex/users': 'pages/stratex-users.html',
  '/stratex/org': 'pages/stratex-org.html',
  '/stratex/hiring': 'pages/stratex-hiring.html',
  '/stratex/leave': 'pages/stratex-leave.html',
  '/stratex/meetings': 'pages/stratex-meetings.html',
  '/stratex/contracts-pay': 'pages/stratex-contracts-pay.html',
  '/stratex/players': 'pages/stratex-players.html',
  '/stratex/scouts': 'pages/stratex-scouts.html',
  '/stratex/usage-requests': 'pages/stratex-usage-requests.html',
  '/stratex/coaches': 'pages/stratex-coaches.html',
  '/stratex/scout-teams': 'pages/stratex-scout-teams.html',
  '/stratex/school-teams': 'pages/stratex-school-teams.html',
  '/stratex/non-pro-academies': 'pages/stratex-school-teams.html',
  '/stratex/award-nominations': 'pages/stratex-award-nominations.html',
  '/stratex/showcase-events': 'pages/stratex-showcase-events.html',
  '/admin/showcase-event': 'pages/stratex-company-admin.html',
  '/stratex/notifications': 'pages/stratex-notifications.html',
  '/stratex/concerns': 'pages/stratex-concerns.html',
  '/stratex/settings': 'pages/stratex-settings.html',

  '/showcase-event/player-registration': 'pages/showcase-player-registration.html',
  '/showcase-event/player-registration/complete': 'pages/showcase-player-registration.html',
  '/showcase-event/coach-scout-registration': 'pages/showcase-professional-registration.html',
  '/showcase-event/coach-scout-registration/complete': 'pages/showcase-professional-registration.html',
  '/showcase-event/coach-scout-registration/sold-out': 'pages/showcase-professional-registration.html',

  '/coach/dashboard': 'pages/coach-dashboard.html',
  '/coach/onboarding': 'pages/coach-onboarding.html',
  '/coach/my-players': 'pages/coach-my-players.html',
  '/coach/usage-requests': 'pages/coach-usage-requests.html',
  '/coach/add-player': 'pages/add-player.html',
  '/coach/bulk-add-players': 'pages/bulk-add-players.html',
  '/coach/match-facts': 'pages/match-facts.html',
  '/coach/fixtures': 'pages/coach-fixtures.html',
  '/coach/video-reels': 'pages/coach-video-reels.html',
  '/coach/chat': 'pages/coach-chat.html',
  '/coach/notifications': 'pages/coach-notifications.html',
  '/coach/report-a-concern': 'pages/coach-report-concern.html',
  '/coach/settings': 'pages/coach-settings.html',

  '/scout/dashboard': 'pages/scout-dashboard.html',
  '/scout/onboarding': 'pages/scout-onboarding.html',
  '/scout/player-search': 'pages/player-search.html',
  '/scout/pipeline': 'pages/scout-pipeline.html',
  '/scout/rankings': 'pages/scout-rankings.html',
  '/scout/fixtures': 'pages/scout-fixtures.html',
  '/scout/predictions': 'pages/scout-predictions.html',
  '/scout/usage-requests': 'pages/scout-usage-requests.html',
  '/scout/exports': 'pages/scout-exports.html',
  '/scout/compare-players': 'pages/compare-players.html',
  '/scout/setup': 'pages/scout-setup.html',
  '/scout/events': 'pages/scout-events.html',
  '/scout/chat': 'pages/scout-chat.html',
  '/scout/notifications': 'pages/scout-notifications.html',
  '/scout/report-a-concern': 'pages/scout-report-concern.html',
  '/scout/settings': 'pages/scout-settings.html',
  '/scout/preferences': 'pages/scout-preferences.html',

  '/player/dashboard': 'pages/player-dashboard.html',
  '/player/profile': 'pages/player-profile.html',
  '/player/edit-profile': 'pages/player-profile-edit.html',
  '/player/video-reels': 'pages/player-video-reels.html',
  '/player/notifications': 'pages/player-notifications.html',
  '/player/settings': 'pages/player-settings.html'
};

function isStratexRetainedPath(requestPath) {
  const cleanPath = String(requestPath || '/').replace(/\/+$/, '') || '/';

  if (STRATEX_PUBLIC_ROUTES.includes(cleanPath)) return true;
  if (STRATEX_SHOWCASE_REGISTRATION_ROUTES.includes(cleanPath)) return true;
  if (/^\/careers\/[^/]+/.test(cleanPath)) return true;
  if (/^\/learning-centre\/[^/]+/.test(cleanPath)) return true;

  if (
    cleanPath === '/robots.txt' ||
    cleanPath === '/sitemap.xml' ||
    cleanPath === '/llms.txt' ||
    cleanPath === '/health' ||
    cleanPath === '/api/health'
  ) return true;

  if (
    cleanPath.indexOf('/api/') === 0 ||
    cleanPath.indexOf('/frontend/') === 0 ||
    cleanPath.indexOf('/css/') === 0 ||
    cleanPath.indexOf('/js/') === 0 ||
    cleanPath.indexOf('/assets/') === 0 ||
    cleanPath.indexOf('/images/') === 0 ||
    cleanPath.indexOf('/admin') === 0 ||
    cleanPath.indexOf('/company/admin') === 0 ||
    cleanPath.indexOf('/stratex/') === 0
  ) return true;

  return /\.[a-z0-9]{2,8}$/i.test(cleanPath);
}

if (frontendDir) {
  const staticOptions = {
    extensions: ['html'],
    maxAge: config.nodeEnv === 'production' ? '5m' : 0,
    index: false
  };

  app.use(express.static(frontendDir, staticOptions));
  app.use('/frontend', express.static(frontendDir, staticOptions));

  app.get('/award-ceremonies', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return sendFrontendFile(req, res, 'pages/stratex-public-v4.html');
  });

  STRATEX_PUBLIC_ROUTES.forEach((route) => {
    app.get(route, (req, res, next) => {
      if (!isStratexHost(req)) return next();
      return sendStratexPage(req, res);
    });
  });

  app.use((req, res, next) => {
    if (!isStratexHost(req) || !isRemovedStratexPublicPath(req.path)) return next();
    return sendFrontendFile(req, res, 'pages/stratex-public-v4.html', 404);
  });

  app.get('/careers/:slug', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return sendStratexPage(req, res);
  });

  app.get('/learning-centre/:slug', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return sendStratexPage(req, res);
  });

  app.use((req, res, next) => {
    if (!isStratexHost(req) || isStratexRetainedPath(req.path)) return next();
    return sendFrontendFile(req, res, 'pages/stratex-public-v4.html', 404);
  });

  app.get('/admin/:module', (req, res) =>
    sendFrontendFile(req, res, 'pages/stratex-company-admin.html')
  );

  Object.entries(routeMap).forEach(([route, file]) => {
    app.get(route, (req, res) => sendFrontendFile(req, res, file));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((error, req, res, next) => {
  console.error('[Server]', {
    code: error && error.code,
    message: error && error.message
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log('⚡ ScoutLink API v2.3 on http://localhost:' + config.port);
});

module.exports = app;

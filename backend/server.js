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
app.set('trust proxy', 1); // Required for Vercel/Heroku: trust first proxy for rate limiting
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.eu.heap-api.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "connect-src": ["'self'", "https:", "wss:"]
    }
  }
}));
app.use(cors({
  origin: [
    'https://scoutlink.app', 'https://www.scoutlink.app',
    'https://stratexanalytics.co.uk', 'https://www.stratexanalytics.co.uk',
    'https://richdhininaba.github.io',
    'http://localhost:5500', 'http://localhost:3000', 'http://localhost:8080'
  ],
  credentials: true
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 300, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, message: { error: 'Too many auth attempts' } });
const publicFormLimiter = rateLimit({
  windowMs: 15*60*1000,
  max: 60,
  message: { error: 'Too many submissions. Please wait and try again.' }
});
app.use(limiter);

async function healthHandler(_, res) {
  const body = {
    status: 'ok',
    version: '2.2.0',
    environment: config.nodeEnv,
    services: { api: 'ok', supabase: 'unknown' },
    timestamp: new Date().toISOString()
  };
  try {
    const { error } = await supabase.from('stratex').select('id', { head: true, count: 'exact' }).limit(1);
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

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/registrations', publicFormLimiter, require('./routes/registrations'));
app.use('/api/players', require('./routes/players'));
app.use('/api/match-facts', require('./routes/matchFacts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stratex', require('./routes/stratex'));
app.use('/api/stratex', require('./routes/stratexJobs'));
app.use('/api/scouts', require('./routes/scouts'));
app.use('/api/scout', require('./routes/scouts')); // alias for frontend scout routes
app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/awards', require('./routes/awards'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/scout-intelligence', require('./routes/scoutIntelligence'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/season', require('./routes/season'));
app.use('/api/showcase', require('./routes/showcase'));
app.use('/api/fixtures', require('./routes/fixtures'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/careers', publicFormLimiter, require('./routes/careers'));
app.use('/api/trust', publicFormLimiter, require('./routes/trust'));
app.use('/api/stratex-website', publicFormLimiter, require('./routes/stratexWebsite'));

const frontendDir = [
  path.resolve(__dirname, 'frontend'),
  path.resolve(__dirname, '..', 'frontend')
].find((dir) => fs.existsSync(path.join(dir, 'index.html')));

const routeMap = {
  '/': 'index.html',
  '/login': 'pages/login.html',
  '/forgot-password': 'pages/forgot-password.html',
  '/experience-select': 'pages/experience-select.html',
  '/404': 'pages/404.html',
  '/coaches': 'pages/coaches.html',
  '/scouts': 'pages/scouts.html',
  '/parents-players': 'pages/parents-players.html',
  '/about': 'pages/about.html',
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
  '/parent-guardian-notice': 'pages/parent-guardian-notice.html',
  '/applicant-privacy-notice': 'pages/applicant-privacy-notice.html',
  '/privacy-request': 'pages/privacy-request.html',
  '/contact': 'pages/contact.html',
  '/accessibility': 'pages/accessibility.html',
  '/complete-registration': 'pages/complete-registration.html',
  '/company': 'pages/stratex-site.html',
  '/company/scoutlink': 'pages/stratex-site.html',
  '/company/scoutlink/compatibility-score': 'pages/stratex-site.html',
  '/company/scoutlink/pricing': 'pages/stratex-site.html',
  '/company/scoutlink/scouts': 'pages/stratex-site.html',
  '/company/scoutlink/coaches': 'pages/stratex-site.html',
  '/company/pricing': 'pages/stratex-site.html',
  '/company/grassroots-football-scouting-tools': 'pages/stratex-site.html',
  '/company/about': 'pages/stratex-site.html',
  '/company/leadership': 'pages/stratex-site.html',
  '/company/trust': 'pages/stratex-site.html',
  '/company/scout-verification': 'pages/stratex-site.html',
  '/company/parent-guardian-notice': 'pages/stratex-site.html',
  '/company/careers': 'pages/stratex-site.html',
  '/company/contact': 'pages/stratex-site.html',
  '/company/report-a-concern': 'pages/stratex-site.html',
  '/company/privacy-policy': 'pages/stratex-site.html',
  '/company/terms': 'pages/stratex-site.html',
  '/company/terms-of-use': 'pages/stratex-site.html',
  '/company/cookie-policy': 'pages/stratex-site.html',
  '/company/security': 'pages/stratex-site.html',
  '/company/accessibility': 'pages/stratex-site.html',
  '/company/learning-centre': 'pages/stratex-site.html',
  '/company/admin': 'pages/stratex-company-admin.html',
  '/admin': 'pages/stratex-company-admin.html',
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
  '/stratex/coaches': 'pages/stratex-coaches.html',
  '/stratex/scout-teams': 'pages/stratex-scout-teams.html',
  '/stratex/school-teams': 'pages/stratex-school-teams.html',
  '/stratex/non-pro-academies': 'pages/stratex-school-teams.html',
  '/stratex/award-nominations': 'pages/stratex-award-nominations.html',
  '/stratex/showcase-events': 'pages/stratex-showcase-events.html',
  '/stratex/notifications': 'pages/stratex-notifications.html',
  '/stratex/concerns': 'pages/stratex-concerns.html',
  '/stratex/settings': 'pages/stratex-settings.html',
  '/coach/dashboard': 'pages/coach-dashboard.html',
  '/coach/onboarding': 'pages/coach-onboarding.html',
  '/coach/my-players': 'pages/coach-my-players.html',
  '/coach/add-player': 'pages/add-player.html',
  '/coach/bulk-add-players': 'pages/bulk-add-players.html',
  '/coach/match-facts': 'pages/match-facts.html',
  '/coach/fixtures': 'pages/coach-fixtures.html',
  '/coach/video-reels': 'pages/coach-video-reels.html',
  '/coach/chat': 'pages/coach-chat.html',
  '/coach/notifications': 'pages/coach-notifications.html',
  '/coach/settings': 'pages/coach-settings.html',
  '/scout/dashboard': 'pages/scout-dashboard.html',
  '/scout/onboarding': 'pages/scout-onboarding.html',
  '/scout/player-search': 'pages/player-search.html',
  '/scout/pipeline': 'pages/scout-pipeline.html',
  '/scout/rankings': 'pages/scout-rankings.html',
  '/scout/fixtures': 'pages/scout-fixtures.html',
  '/scout/predictions': 'pages/scout-predictions.html',
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
  '/player/settings': 'pages/player-settings.html',
  '/careers': 'pages/careers.html',
  '/careers/interview-availability': 'pages/interview-availability.html'
};

function sendFrontendFile(req, res, relativePath) {
  if (!frontendDir) return res.status(500).json({ error: 'Frontend bundle is missing from this deployment' });
  return res.sendFile(path.join(frontendDir, relativePath));
}

function sendStratexPage(req, res) {
  if (!frontendDir) return res.status(500).json({ error: 'Frontend bundle is missing from this deployment' });
  try {
    return renderStratexPage(req, res, frontendDir);
  } catch (err) {
    console.error('[Stratex page render]', { code: err && err.code, message: err && err.message });
    return sendFrontendFile(req, res, 'pages/stratex-site.html');
  }
}

function isStratexHost(req) {
  return /(^|\.)stratexanalytics\.co\.uk$/i.test(req.hostname || req.get('host') || '');
}

const STRATEX_SITEMAP_ROUTES = [
  '/',
  '/scoutlink',
  '/scoutlink/compatibility-score',
  '/scoutlink/pricing',
  '/scoutlink/scouts',
  '/scoutlink/coaches',
  '/grassroots-football-scouting-tools',
  '/about',
  '/leadership',
  '/trust',
  '/scout-verification',
  '/parent-guardian-notice',
  '/careers',
  '/contact',
  '/report-a-concern',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
  '/security',
  '/accessibility',
  '/learning-centre'
];

function renderSitemapXml(origin, routes) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.map((route) => '  <url><loc>' + origin + route + '</loc></url>').join('\n') +
    '\n</urlset>\n';
}

app.get('/sitemap.xml', (req, res, next) => {
  if (!isStratexHost(req)) return next();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(renderSitemapXml('https://www.stratexanalytics.co.uk', STRATEX_SITEMAP_ROUTES));
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
    'Stratex Analytics is a sports technology company building football intelligence products for grassroots football. ScoutLink is its first product.',
    '',
    '## Public pages',
    '- Company homepage: https://www.stratexanalytics.co.uk/',
    '- ScoutLink product overview: https://www.stratexanalytics.co.uk/scoutlink',
    '- ScoutLink for coaches: https://www.stratexanalytics.co.uk/scoutlink/coaches',
    '- ScoutLink for scouts: https://www.stratexanalytics.co.uk/scoutlink/scouts',
    '- Compatibility score: https://www.stratexanalytics.co.uk/scoutlink/compatibility-score',
    '- Pricing: https://www.stratexanalytics.co.uk/scoutlink/pricing',
    '- Trust and safeguarding: https://www.stratexanalytics.co.uk/trust',
    '- Scout verification: https://www.stratexanalytics.co.uk/scout-verification',
    '- Parent and guardian notice: https://www.stratexanalytics.co.uk/parent-guardian-notice',
    '- Report a concern: https://www.stratexanalytics.co.uk/report-a-concern',
    '- Careers: https://www.stratexanalytics.co.uk/careers',
    '- Contact: https://www.stratexanalytics.co.uk/contact',
    '',
    '## Private routes',
    'Do not index or summarize restricted company-admin paths under /admin, application API routes under /api, or logged-in product routes under /coach, /scout, /player and /stratex.',
    '',
    '## Notes',
    'Stratex public pages should be summarized as company, trust, careers and product information. ScoutLink product claims should be described as explainable decision support, not guaranteed scouting outcomes.',
    ''
  ].join('\n'));
});

if (frontendDir) {
  const staticOptions = { extensions: ['html'], maxAge: config.nodeEnv === 'production' ? '5m' : 0, index: false };
  app.use(express.static(frontendDir, staticOptions));
  app.use('/frontend', express.static(frontendDir, staticOptions));

  const STRATEX_PUBLIC_ROUTES = [
    '/',
    '/scoutlink',
    '/scoutlink/compatibility-score',
    '/scoutlink/pricing',
    '/scoutlink/scouts',
    '/scoutlink/coaches',
    '/grassroots-football-scouting-tools',
    '/about',
    '/leadership',
    '/trust',
    '/scout-verification',
    '/parent-guardian-notice',
    '/careers',
    '/contact',
    '/report-a-concern',
    '/privacy-policy',
    '/terms',
    '/cookie-policy',
    '/security',
    '/accessibility',
    '/learning-centre'
  ];

  STRATEX_PUBLIC_ROUTES.forEach((route) => {
    app.get(route, (req, res, next) => {
      if (!isStratexHost(req)) return next();
      return sendStratexPage(req, res);
    });
  });

  app.get('/compatibility-score', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/scoutlink/compatibility-score');
  });

  app.get('/pricing', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/scoutlink/pricing');
  });

  app.get('/coaches', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/scoutlink/coaches');
  });

  app.get('/scouts', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/scoutlink/scouts');
  });

  app.get('/terms-of-use', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/terms');
  });

  app.get('/privacy', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/privacy-policy');
  });

  app.get('/cookies', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/cookie-policy');
  });

  app.get('/careers/:slug', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return sendStratexPage(req, res);
  });

  app.get('/learning-centre/:slug', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return sendStratexPage(req, res);
  });

  function redirectCleanCompanyRoute(req, res, next) {
    if (!isStratexHost(req)) return next();
    const cleanPath = (req.path || '/').replace(/^\/company/, '') || '/';
    return res.redirect(301, cleanPath);
  }

  [
    '/company',
    '/company/scoutlink',
    '/company/scoutlink/compatibility-score',
    '/company/scoutlink/pricing',
    '/company/scoutlink/scouts',
    '/company/scoutlink/coaches',
    '/company/pricing',
    '/company/grassroots-football-scouting-tools',
    '/company/about',
    '/company/leadership',
    '/company/trust',
    '/company/scout-verification',
    '/company/parent-guardian-notice',
    '/company/careers',
    '/company/contact',
    '/company/report-a-concern',
    '/company/privacy-policy',
    '/company/terms',
    '/company/terms-of-use',
    '/company/cookie-policy',
    '/company/security',
    '/company/accessibility',
    '/company/learning-centre'
  ].forEach((route) => {
    app.get(route, redirectCleanCompanyRoute);
  });

  app.get('/admin', (req, res) => sendFrontendFile(req, res, 'pages/stratex-company-admin.html'));
  app.get('/admin/:module', (req, res) => sendFrontendFile(req, res, 'pages/stratex-company-admin.html'));
  app.get('/company/admin', (req, res, next) => {
    if (!isStratexHost(req)) return next();
    return res.redirect(301, '/admin');
  });

  app.get('/company/careers/:slug', redirectCleanCompanyRoute);
  app.get('/company/learning-centre/:slug', redirectCleanCompanyRoute);

  Object.entries(routeMap).forEach(([route, file]) => {
    app.get(route, (req, res) => sendFrontendFile(req, res, file));
  });

  app.get('/careers/:slug', (req, res) => sendFrontendFile(req, res, 'pages/career-detail.html'));
}

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('[Server]', { code: err && err.code, message: err && err.message });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log('\u26a1 ScoutLink API v2.2 on http://localhost:' + config.port);
});

module.exports = app;

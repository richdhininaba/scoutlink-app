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
app.use(limiter);

app.get('/health', (_, res) => res.json({ status: 'ok', version: '2.2.0', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/registrations', require('./routes/registrations'));
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
app.use('/api/exports', require('./routes/exports'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/season', require('./routes/season'));
app.use('/api/showcase', require('./routes/showcase'));
app.use('/api/fixtures', require('./routes/fixtures'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/careers', require('./routes/careers'));

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
  '/register': 'pages/register.html',
  '/register/scout': 'pages/register-scout.html',
  '/register/coach': 'pages/register-coach.html',
  '/data-policy': 'pages/data-policy.html',
  '/complete-registration': 'pages/complete-registration.html',
  '/stratex/dashboard': 'pages/stratex-dashboard.html',
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
  '/scout/settings': 'pages/scout-settings.html',
  '/scout/preferences': 'pages/scout-preferences.html',
  '/player/dashboard': 'pages/player-dashboard.html',
  '/player/profile': 'pages/player-profile.html',
  '/player/edit-profile': 'pages/player-profile-edit.html',
  '/player/video-reels': 'pages/player-video-reels.html',
  '/player/notifications': 'pages/player-notifications.html',
  '/player/settings': 'pages/player-settings.html',
  '/careers': 'pages/careers.html'
};

function sendFrontendFile(req, res, relativePath) {
  if (!frontendDir) return res.status(500).json({ error: 'Frontend bundle is missing from this deployment' });
  return res.sendFile(path.join(frontendDir, relativePath));
}

if (frontendDir) {
  app.use(express.static(frontendDir, { extensions: ['html'], maxAge: config.nodeEnv === 'production' ? '5m' : 0 }));
  app.use('/frontend', express.static(frontendDir, { extensions: ['html'], maxAge: config.nodeEnv === 'production' ? '5m' : 0 }));

  Object.entries(routeMap).forEach(([route, file]) => {
    app.get(route, (req, res) => sendFrontendFile(req, res, file));
  });

  app.get('/careers/:slug', (req, res) => sendFrontendFile(req, res, 'pages/career-detail.html'));
}

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error('[Server]', err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(config.port, () => {
  console.log('\u26a1 ScoutLink API v2.2 on http://localhost:' + config.port);
});

module.exports = app;

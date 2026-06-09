'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const app = express();
app.set('trust proxy', 1); // Required for Vercel/Heroku: trust first proxy for rate limiting
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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
app.use('/api/scouts', require('./routes/scouts'));
app.use('/api/scout', require('./routes/scouts')); // alias for frontend scout routes
app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/awards', require('./routes/awards'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/season', require('./routes/season'));
app.use('/api/showcase', require('./routes/showcase'));
app.use('/api/fixtures', require('./routes/fixtures'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error('[Server]', err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(config.port, () => {
  console.log('\u26a1 ScoutLink API v2.2 on http://localhost:' + config.port);
});

module.exports = app;

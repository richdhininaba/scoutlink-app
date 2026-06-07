'use strict';
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const config    = require('./config');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ['https://richdhininaba.github.io', 'http://localhost:5500', 'http://localhost:3000'], credentials: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 300, message: { error: 'Too many requests' } });
app.use(limiter);
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, message: { error: 'Too many auth attempts' } });

app.get('/health', (_, res) => res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }));

app.get('/debug-env', (_, res) => res.json({ hasSupabaseUrl: !!process.env.SUPABASE_URL, supabaseUrlPrefix: (process.env.SUPABASE_URL||'').substring(0,30), hasAnonKey: !!process.env.SUPABASE_ANON_KEY, anonKeyLength: (process.env.SUPABASE_ANON_KEY||'').length, anonKeyPrefix: (process.env.SUPABASE_ANON_KEY||'').substring(0,20), hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, serviceKeyLength: (process.env.SUPABASE_SERVICE_ROLE_KEY||'').length, serviceKeyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY||'').substring(0,20), nodeEnv: process.env.NODE_ENV }));

// Routes
app.use('/api/auth',          authLimiter, require('./routes/auth'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/players',       require('./routes/players'));
app.use('/api/match-facts',   require('./routes/matchFacts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stratex',       require('./routes/stratex'));
app.use('/api/scouts',        require('./routes/scouts'));
app.use('/api/coaches',       require('./routes/coaches'));
app.use('/api/videos',        require('./routes/videos'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error('[Server]', err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(config.port, () => {
  console.log('\u2705 ScoutLink API v2.0 on http://localhost:' + config.port);
});
module.exports = app;

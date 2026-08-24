'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');
const { isDemoSession } = require('../utils/demo');
const { renderPlayerProfilePdf, renderPredictionPdf } = require('../utils/scoutPdfExports');

const ALLOWED_SOURCES = new Set(['profile', 'prediction']);

function clean(value, max = 4000) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}

function playerName(player) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player';
}

function evidenceLabel(matches) {
  const count = (matches || []).length;
  return count >= 10 ? 'Strong' : count >= 5 ? 'Moderate' : count ? 'Limited' : 'Insufficient';
}

function safeFilename(value) {
  return clean(value, 180).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'scoutlink';
}

async function scoutContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!scout) {
    const issue = new Error('Scout account not found.');
    issue.status = 404;
    throw issue;
  }

  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }

  return { scout, team, prefs: scout.scout_preferences || {} };
}

async function exportAllowance(context) {
  const plan = context.team?.subscription_plan || context.scout.subscription_plan || 'Core';
  const limits = context.scout.scout_team_id
    ? effectiveLimits(plan, context.team?.limit_overrides || {})
    : limitsForPlan(plan);

  let query = supabase.from('scout_exports').select('id', { count:'exact', head:true });
  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('scout_id', context.scout.id);

  const { count, error } = await query;
  if (error) throw error;
  const used = count || 0;
  const limit = Number(limits.exports) || 0;
  return { plan, used, limit, remaining:Math.max(0, limit-used) };
}

async function ensureAllowance(context) {
  const allowance = await exportAllowance(context);
  if (allowance.remaining <= 0) {
    const issue = new Error('The export allowance has been used. Add more export usage before generating another PDF.');
    issue.status = 402;
    issue.allowance = allowance;
    throw issue;
  }
  return allowance;
}

async function teamVisibleNotes(context, playerId) {
  let query = supabase
    .from('scout_player_workflow_entries')
    .select('id,scout_id,scout_team_id,player_id,entry_type,content,metadata,shared_with,created_at,is_deleted')
    .eq('player_id', playerId)
    .eq('entry_type', 'note')
    .eq('is_deleted', false)
    .order('created_at', { ascending:false })
    .limit(100);

  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('scout_id', context.scout.id);

  const { data: rows, error } = await query;
  if (error) throw error;

  const visible = (rows || []).filter(row => {
    const visibility = String(row.metadata?.visibility || '').toLowerCase();
    if (!context.scout.scout_team_id) {
      return String(row.scout_id) === String(context.scout.id) && visibility === 'team';
    }
    return visibility === 'team';
  });

  const ids = [...new Set(visible.map(row => row.scout_id).filter(Boolean))];
  let scouts = [];
  if (ids.length) {
    const result = await supabase.from('scouts').select('id,first_name,last_name').in('id', ids);
    if (result.error) throw result.error;
    scouts = result.data || [];
  }
  const byId = Object.fromEntries(scouts.map(scout => [scout.id, scout]));

  return visible.map(row => ({
    ...row,
    authorName: [byId[row.scout_id]?.first_name, byId[row.scout_id]?.last_name].filter(Boolean).join(' ') || 'Scout'
  }));
}

async function playerBundle(req, context, playerId) {
  let playerQuery = supabase.from('players').select('*').eq('id', playerId).eq('is_active', true);
  playerQuery = isDemoSession(req) ? playerQuery.eq('is_demo', true) : playerQuery.eq('is_demo', false);
  const { data: player, error } = await playerQuery.maybeSingle();
  if (error) throw error;
  if (!player) {
    const issue = new Error('Player not found.');
    issue.status = 404;
    throw issue;
  }

  const matchResult = await supabase
    .from('match_facts')
    .select('*')
    .eq('player_id', playerId)
    .order('match_date', { ascending:false })
    .limit(100);
  if (matchResult.error) throw matchResult.error;
  const matches = matchResult.data || [];

  let team = null;
  if (player.team_id) {
    const result = await supabase
      .from('school_academy_teams')
      .select('id,team_name,city,county,country,address_line,postcode,league_name,league_fulltime_url,team_website_url')
      .eq('id', player.team_id)
      .maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }

  let pipelineQuery = supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('player_id', playerId)
    .eq('scout_id', context.scout.id)
    .eq('is_active', true)
    .order('updated_at', { ascending:false })
    .limit(1);
  if (context.scout.scout_team_id) pipelineQuery = pipelineQuery.eq('scout_team_id', context.scout.scout_team_id);
  const pipelineResult = await pipelineQuery;
  if (pipelineResult.error) throw pipelineResult.error;

  const notes = await teamVisibleNotes(context, playerId);
  const analysis = analysePlayer(player, context.team || {}, matches, context.prefs || {}) || {};

  return {
    player:{ ...player, team_name:player.team_name || team?.team_name || null },
    team,
    matches,
    pipeline:(pipelineResult.data || [])[0] || null,
    teamNotes:notes,
    analysis,
    evidenceLabel:evidenceLabel(matches)
  };
}

async function predictionLogForScout(scoutId, predictionLogId, playerId) {
  if (!predictionLogId) {
    const issue = new Error('predictionLogId is required for a prediction export.');
    issue.status = 400;
    throw issue;
  }
  const { data, error } = await supabase
    .from('predictions_log')
    .select('*')
    .eq('id', predictionLogId)
    .eq('scout_id', scoutId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const issue = new Error('Prediction not found.');
    issue.status = 404;
    throw issue;
  }
  if (playerId && String(data.player_id) !== String(playerId)) {
    const issue = new Error('The prediction does not belong to the selected player.');
    issue.status = 400;
    throw issue;
  }
  return data;
}

async function logExport(context, values) {
  const payload = {
    scout_id:context.scout.id,
    scout_team_id:context.scout.scout_team_id || null,
    player_id:values.playerId || null,
    prediction_log_id:values.predictionLogId || null,
    export_type:'PDF',
    source:values.source,
    file_name:values.filename,
    payload:{
      source:values.source,
      playerId:values.playerId || null,
      predictionLogId:values.predictionLogId || null,
      format:'PDF',
      designVersion:'pdf-export-design-v1'
    }
  };
  const { data, error } = await supabase.from('scout_exports').insert(payload).select().single();
  if (error) throw error;
  return data;
}

function sendFile(res, log, allowance, filename, buffer, historicalDownload = false) {
  return res.json({
    exportId:log?.id || null,
    filename,
    mime:'application/pdf',
    contentBase64:buffer.toString('base64'),
    historicalDownload,
    exportsRemaining:historicalDownload ? allowance?.remaining : Math.max(0, (allowance?.remaining || 0)-1),
    planLimit:allowance?.limit || null
  });
}

router.use(requireAuth, requireRole('Scout'));

router.post('/player', async (req, res) => {
  try {
    const playerId = clean(req.body.playerId, 120);
    const source = clean(req.body.source || (req.body.predictionLogId ? 'prediction' : 'profile'), 40).toLowerCase();
    if (!playerId) return res.status(400).json({ error:'playerId is required.' });
    if (!ALLOWED_SOURCES.has(source)) {
      return res.status(400).json({ error:'ScoutLink only exports Player Profile and Prediction PDFs.' });
    }
    if (req.body.format && String(req.body.format).toUpperCase() !== 'PDF') {
      return res.status(400).json({ error:'ScoutLink exports are PDF only.' });
    }

    const context = await scoutContext(req.user.id);
    const allowance = await ensureAllowance(context);
    const bundle = await playerBundle(req, context, playerId);

    let predictionLog = null;
    let buffer;
    let filename;
    if (source === 'prediction') {
      predictionLog = await predictionLogForScout(req.user.id, req.body.predictionLogId, playerId);
      buffer = await renderPredictionPdf({ context, bundle, log:predictionLog });
      filename = `${safeFilename(playerName(bundle.player))}-${safeFilename(predictionLog.prediction_type || 'prediction')}-${new Date().toISOString().slice(0,10)}.pdf`;
    } else {
      buffer = await renderPlayerProfilePdf({ context, bundle });
      filename = `${safeFilename(playerName(bundle.player))}-player-profile-${new Date().toISOString().slice(0,10)}.pdf`;
    }

    const log = await logExport(context, {
      playerId,
      predictionLogId:predictionLog?.id || null,
      source,
      filename
    });

    return sendFile(res, log, allowance, filename, buffer, false);
  } catch (error) {
    console.error('[Scout PDF export]', error);
    return res.status(error.status || 500).json({
      error:error.message || 'The PDF export could not be created.',
      allowance:error.allowance
    });
  }
});

router.post('/comparison', (req, res) => {
  return res.status(410).json({ error:'Comparison exports have been removed. ScoutLink only exports Player Profile and Prediction PDFs.' });
});

router.post('/pipeline', (req, res) => {
  return res.status(410).json({ error:'Pipeline exports have been removed. ScoutLink only exports Player Profile and Prediction PDFs.' });
});

router.post('/history/:id/download', async (req, res) => {
  try {
    const context = await scoutContext(req.user.id);
    const { data: log, error } = await supabase
      .from('scout_exports')
      .select('*')
      .eq('id', req.params.id)
      .eq('scout_id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!log) return res.status(404).json({ error:'Export history item not found.' });

    const source = clean(log.source, 40).toLowerCase();
    if (!ALLOWED_SOURCES.has(source)) {
      return res.status(410).json({ error:'This legacy export type is no longer available. ScoutLink only exports Player Profile and Prediction PDFs.' });
    }

    const payload = log.payload || {};
    const playerId = log.player_id || payload.playerId;
    const bundle = await playerBundle(req, context, playerId);
    let buffer;
    let filename;

    if (source === 'prediction') {
      const predictionLogId = log.prediction_log_id || payload.predictionLogId;
      const predictionLog = await predictionLogForScout(req.user.id, predictionLogId, playerId);
      buffer = await renderPredictionPdf({ context, bundle, log:predictionLog });
      filename = log.file_name && /\.pdf$/i.test(log.file_name)
        ? log.file_name
        : `${safeFilename(playerName(bundle.player))}-${safeFilename(predictionLog.prediction_type || 'prediction')}.pdf`;
    } else {
      buffer = await renderPlayerProfilePdf({ context, bundle });
      filename = log.file_name && /\.pdf$/i.test(log.file_name)
        ? log.file_name
        : `${safeFilename(playerName(bundle.player))}-player-profile.pdf`;
    }

    const allowance = await exportAllowance(context);
    return sendFile(res, log, allowance, filename, buffer, true);
  } catch (error) {
    console.error('[Scout historical PDF download]', error);
    return res.status(error.status || 500).json({ error:error.message || 'The saved PDF could not be downloaded.' });
  }
});

module.exports = router;

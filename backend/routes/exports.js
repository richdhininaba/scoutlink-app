'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');

const PLAN_LIMITS = {
  Core: { exports: 30 },
  Plus: { exports: 120 },
  Elite: { exports: 500 },
  Enterprise: { exports: 99999 }
};

function limitFor(plan) {
  return (PLAN_LIMITS[plan] || PLAN_LIMITS.Core).exports;
}

function clean(value) {
  return String(value == null ? '' : value).replace(/[<>]/g, '');
}

function money(value) {
  return 'GBP ' + Math.round(Number(value) || 0).toLocaleString('en-GB');
}

function playerName(player) {
  return [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Player';
}

function pdfEscape(value) {
  return clean(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(text, width) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    if ((line + ' ' + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function buildPdf(title, sections) {
  const ops = [];
  let y = 780;
  ops.push('BT /F1 18 Tf 48 ' + y + ' Td (' + pdfEscape(title) + ') Tj ET');
  y -= 26;
  sections.forEach(section => {
    if (y < 80) return;
    ops.push('BT /F1 13 Tf 48 ' + y + ' Td (' + pdfEscape(section.heading) + ') Tj ET');
    y -= 18;
    (section.lines || []).forEach(line => {
      wrap(line, 88).forEach(wrapped => {
        if (y < 60) return;
        ops.push('BT /F1 10 Tf 56 ' + y + ' Td (' + pdfEscape(wrapped) + ') Tj ET');
        y -= 14;
      });
    });
    y -= 8;
  });
  const content = ops.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '5 0 obj << /Length ' + Buffer.byteLength(content, 'utf8') + ' >> stream\n' + content + '\nendstream endobj'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach(obj => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj + '\n';
  });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer << /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return Buffer.from(pdf, 'utf8');
}

function buildExcelHtml(title, sections) {
  let html = '<html><head><meta charset="utf-8"></head><body>';
  html += '<h1>' + clean(title) + '</h1>';
  sections.forEach(section => {
    html += '<h2>' + clean(section.heading) + '</h2><table border="1" cellspacing="0" cellpadding="6">';
    (section.rows || []).forEach(row => {
      html += '<tr><th>' + clean(row[0]) + '</th><td>' + clean(row[1]) + '</td></tr>';
    });
    (section.lines || []).forEach(line => {
      html += '<tr><td colspan="2">' + clean(line) + '</td></tr>';
    });
    html += '</table>';
  });
  html += '</body></html>';
  return Buffer.from(html, 'utf8');
}

async function loadScout(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,scout_team_id,subscription_plan,exports_remaining,scout_preferences')
    .eq('id', userId)
    .single();
  if (error || !scout) {
    const e = new Error('Scout not found');
    e.status = 404;
    throw e;
  }
  return scout;
}

async function countTeamExports(scout) {
  let q = supabase.from('scout_exports').select('id', { count:'exact', head:true });
  if (scout.scout_team_id) q = q.eq('scout_team_id', scout.scout_team_id);
  else q = q.eq('scout_id', scout.id);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function updateRemaining(scout, remaining) {
  if (scout.scout_team_id) {
    await supabase.from('scouts').update({ exports_remaining: remaining }).eq('scout_team_id', scout.scout_team_id);
  } else {
    await supabase.from('scouts').update({ exports_remaining: remaining }).eq('id', scout.id);
  }
}

async function loadScoutTeam(scout) {
  if (!scout.scout_team_id) return { tier: 5 };
  const { data } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
  const prefs = scout.scout_preferences || {};
  const team = data || { tier: 5 };
  if (prefs.teamWeaknesses?.length) team.team_weaknesses = prefs.teamWeaknesses;
  if (prefs.roleExpectations?.length) team.role_expectations = prefs.roleExpectations;
  if (prefs.longTermGoals?.length) team.long_term_goals = prefs.longTermGoals;
  if (prefs.formation) team.formation = prefs.formation;
  if (prefs.playingStyle) team.playing_style = prefs.playingStyle;
  return team;
}

function profileSections(player, matches, analysis, prediction) {
  const name = playerName(player);
  const rows = [
    ['Name', name],
    ['Club', player.team_name || ''],
    ['Position', player.specific_position || player.primary_position || player.position_group || ''],
    ['Age group', player.age_group || ''],
    ['Foot', player.foot || ''],
    ['Nationality', player.nationality || ''],
    ['Overall rating', player.overall_rating || ''],
    ['Estimated transfer value', money(player.transfer_value)],
    ['Compatibility score', analysis ? analysis.compatibilityScore + '/100' : '']
  ];
  const matchLines = (matches || []).slice(0, 5).map(m => {
    const score = m.team_score != null && m.opponent_score != null ? m.team_score + '-' + m.opponent_score : 'Score not recorded';
    return [m.match_date, m.opponent, score, 'G ' + (m.goals || 0), 'A ' + (m.assists || 0), 'Cards ' + ((m.yellow_cards || 0) + (m.red_cards || 0))].filter(Boolean).join(' | ');
  });
  const sections = [
    { heading: 'Player Snapshot', rows, lines: rows.map(r => r[0] + ': ' + r[1]) },
    { heading: 'Coach Ratings', rows: ['pace','passing','dribbling','shooting','defending','vision','composure','stamina','strength'].map(k => [k, player[k] || '']) },
    { heading: 'Recent Match Facts', lines: matchLines.length ? matchLines : ['No recent match facts recorded.'] },
    { heading: 'Compatibility', lines: analysis ? [
      'Compatibility: ' + analysis.compatibilityScore + '/100',
      'Match performance: ' + (analysis.matchPerformanceRating || 'Not available'),
      'Data confidence: ' + (analysis.dataConfidence?.label || analysis.compatibilityBreakdown?.dataConfidence || 'Not available')
    ] : ['Compatibility was not calculated.'] }
  ];
  if (prediction) {
    sections.push({
      heading: 'Prediction',
      lines: [
        'Prediction type: ' + prediction.prediction_type,
        'Result: ' + JSON.stringify(prediction.result || {}).slice(0, 1200)
      ]
    });
  }
  return sections;
}

router.post('/player', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { playerId, format = 'PDF', source = 'profile', predictionLogId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const scout = await loadScout(req.user.id);
    const limit = limitFor(scout.subscription_plan || 'Core');
    const used = await countTeamExports(scout);
    const remaining = Math.max(0, limit - used);
    if (remaining <= 0) {
      return res.status(402).json({ error: 'You have reached your export cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.', exportsRemaining: 0, planLimit: limit });
    }

    const { data: player, error: playerErr } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (playerErr || !player) return res.status(404).json({ error: 'Player not found' });
    const { data: matches } = await supabase.from('match_facts').select('*').eq('player_id', playerId).order('match_date', { ascending: false }).limit(10);
    const team = await loadScoutTeam(scout);
    const analysis = analysePlayer(player, team, matches || [], scout.scout_preferences || {});
    let prediction = null;
    if (predictionLogId) {
      const { data } = await supabase.from('predictions_log').select('*').eq('id', predictionLogId).eq('scout_id', req.user.id).maybeSingle();
      prediction = data || null;
    }

    const title = 'ScoutLink ' + (source === 'prediction' ? 'Prediction Export' : 'Player Profile') + ' - ' + playerName(player);
    const sections = profileSections(player, matches || [], analysis, prediction);
    const isExcel = String(format).toUpperCase() === 'EXCEL' || String(format).toUpperCase() === 'XLS';
    const buffer = isExcel ? buildExcelHtml(title, sections) : buildPdf(title, sections);
    const extension = isExcel ? 'xls' : 'pdf';
    const filename = clean(playerName(player)).replace(/\s+/g, '-').toLowerCase() + '-' + source + '.' + extension;
    const mime = isExcel ? 'application/vnd.ms-excel' : 'application/pdf';

    const { data: log, error: logErr } = await supabase.from('scout_exports').insert({
      scout_id: req.user.id,
      scout_team_id: scout.scout_team_id || null,
      player_id: playerId,
      prediction_log_id: predictionLogId || null,
      export_type: isExcel ? 'Excel' : 'PDF',
      source,
      file_name: filename,
      payload: { title, player_id: playerId, source, prediction_log_id: predictionLogId || null }
    }).select().single();
    if (logErr) throw logErr;

    const remainingAfter = Math.max(0, remaining - 1);
    await updateRemaining(scout, remainingAfter);
    res.json({
      exportId: log?.id || null,
      filename,
      mime,
      contentBase64: buffer.toString('base64'),
      exportsRemaining: remainingAfter,
      planLimit: limit,
      teamUsed: used + 1
    });
  } catch(err) {
    console.error('[Exports]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

module.exports = router;

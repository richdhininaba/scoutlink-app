'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');
const { isDemoSession } = require('../utils/demo');

const ATTRIBUTES = [
  ['pace','Pace'],['agility','Agility'],['strength','Strength'],['stamina','Stamina'],
  ['jumping','Jumping'],['composure','Composure'],['shooting','Shooting'],['passing','Passing'],
  ['dribbling','Dribbling'],['defending','Defending'],['crossing','Crossing'],['vision','Vision'],
  ['positioning','Positioning'],['heading','Heading'],['tackling','Tackling'],
  ['gk_diving','GK diving'],['gk_handling','GK handling'],['gk_kicking','GK kicking'],
  ['gk_reflexes','GK reflexes'],['gk_positioning','GK positioning'],
  ['gk_distribution','GK distribution'],['gk_communication','GK communication'],['gk_sweeping','GK sweeping']
];

function clean(value) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim();
}
function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function score(value) {
  let n = number(value);
  if (n > 0 && n <= 10) n *= 10;
  return Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
}
function round(value, places = 2) {
  const p = Math.pow(10, places);
  return Math.round(number(value) * p) / p;
}
function money(value) {
  return '£' + Math.round(number(value)).toLocaleString('en-GB');
}
function dateTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? clean(value) : date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function dateOnly(value) {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? clean(value) : date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
function playerName(player) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player';
}
function playerPosition(player) {
  return player?.specific_position || player?.primary_position || player?.position_group || 'Not recorded';
}
function xml(value) {
  return clean(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function pdfEscape(value) {
  return clean(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[^\x20-\x7E]/g,' ');
}
function wrap(value, width = 86) {
  const words = clean(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const next = (line + ' ' + word).trim();
    if (line && next.length > width) { lines.push(line); line = word; }
    else line = next;
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

async function scoutContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts').select('id,scout_team_id,subscription_plan,scout_preferences')
    .eq('id', userId).single();
  if (error || !scout) {
    const e = new Error('Scout account not found.'); e.status = 404; throw e;
  }
  let team = {};
  if (scout.scout_team_id) {
    const result = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
    if (result.error) throw result.error;
    team = result.data || {};
  }
  return { scout, team, prefs: scout.scout_preferences || {} };
}

async function exportAllowance(context) {
  const plan = context.team.subscription_plan || context.scout.subscription_plan || 'Core';
  const limits = context.scout.scout_team_id
    ? effectiveLimits(plan, context.team.limit_overrides || {})
    : limitsForPlan(plan);
  let query = supabase.from('scout_exports').select('id', { count: 'exact', head: true });
  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('scout_id', context.scout.id);
  const { count, error } = await query;
  if (error) throw error;
  const used = count || 0;
  return { plan, used, limit: Number(limits.exports) || 0, remaining: Math.max(0, Number(limits.exports || 0) - used) };
}

async function ensureAllowance(context) {
  const allowance = await exportAllowance(context);
  if (allowance.remaining <= 0) {
    const e = new Error('The export allowance has been used. Submit an export request from Usage requests.');
    e.status = 402;
    e.allowance = allowance;
    throw e;
  }
  return allowance;
}

async function playerBundle(req, context, playerId) {
  const { data: player, error } = await supabase.from('players').select('*').eq('id', playerId).maybeSingle();
  if (error) throw error;
  if (!player || (!!player.is_demo !== !!isDemoSession(req))) {
    const e = new Error('Player not found.'); e.status = 404; throw e;
  }
  const [matchResult, videoResult] = await Promise.all([
    supabase.from('match_facts').select('*').eq('player_id', playerId).order('match_date', { ascending: false }).limit(100),
    supabase.from('player_videos').select('*').eq('player_id', playerId).order('created_at', { ascending: false }).limit(100)
  ]);
  if (matchResult.error) throw matchResult.error;
  if (videoResult.error) throw videoResult.error;
  let team = null;
  let fixtures = [];
  if (player.team_id) {
    const [teamResult, fixtureResult] = await Promise.all([
      supabase.from('school_academy_teams')
        .select('id,team_name,city,county,country,address_line,postcode,league_name,league_fulltime_url,team_website_url')
        .eq('id', player.team_id).maybeSingle(),
      supabase.from('fixtures').select('*').eq('team_id', player.team_id)
        .gte('fixture_date', new Date().toISOString().slice(0,10))
        .order('fixture_date', { ascending: true }).limit(50)
    ]);
    if (teamResult.error) throw teamResult.error;
    if (fixtureResult.error) throw fixtureResult.error;
    team = teamResult.data || null;
    fixtures = fixtureResult.data || [];
  }
  const matches = matchResult.data || [];
  const analysis = analysePlayer(player, context.team, matches, context.prefs);
  return { player, team, matches, videos: videoResult.data || [], fixtures, analysis };
}

function evidenceLabel(bundle) {
  const count = bundle.matches.length || number(bundle.player.appearances);
  return count >= 10 ? 'High' : count >= 5 ? 'Medium' : count ? 'Low' : 'Very low';
}
function detailedVerdict(bundle) {
  const p = bundle.player;
  const a = bundle.analysis || {};
  const compatibility = score(a.compatibilityScore);
  const overall = a.overallBreakdown || {};
  const readiness = score(overall.currentReadiness || overall.finalScore || p.overall_rating);
  const potential = score(overall.potentialRating || p.overall_rating);
  const position = a.positionRatings?.bestCurrentPosition || playerPosition(p);
  const strengths = ATTRIBUTES.filter(([key]) => number(p[key]) > 0)
    .map(([key,label]) => ({ label, value: score(p[key]) }))
    .sort((x,y) => y.value - x.value).slice(0,3);
  const gaps = ATTRIBUTES.filter(([key]) => number(p[key]) > 0)
    .map(([key,label]) => ({ label, value: score(p[key]) }))
    .sort((x,y) => x.value - y.value).slice(0,2);
  const label = compatibility >= 82 && readiness >= 72 ? 'Prioritise'
    : compatibility >= 70 || potential >= 78 ? 'Monitor closely' : 'Do not progress yet';
  return {
    label,
    paragraph: playerName(p) + ' is currently assessed as “' + label + '” for this recruitment brief. ' +
      'The compatibility score is ' + compatibility + '/100 and current readiness is ' + readiness + '/100, ' +
      'with ' + evidenceLabel(bundle).toLowerCase() + ' evidence confidence from ' + bundle.matches.length +
      ' recorded Match Facts. The strongest present role is ' + position + '. ' +
      (strengths.length ? 'The clearest strengths are ' + strengths.map(item => item.label + ' ' + item.value + '/100').join(', ') + '. ' : '') +
      (gaps.length ? 'The next review should test ' + gaps.map(item => item.label.toLowerCase()).join(' and ') + ' under live pressure. ' : '') +
      'This is decision support rather than a guarantee; the next action should be based on the evidence gap that could still change the recruitment decision.'
  };
}

function profileSections(bundle) {
  const p = bundle.player;
  const a = bundle.analysis || {};
  const verdict = detailedVerdict(bundle);
  const overall = a.overallBreakdown || {};
  const compatibility = a.compatibility || {};
  const sections = [
    { title: 'Player identity', rows: [
      ['Name', playerName(p)], ['Age group', p.age_group], ['Position', playerPosition(p)],
      ['Other positions', (p.positions || []).join(', ')], ['Team', p.team_name], ['Region', bundle.team?.city || bundle.team?.county],
      ['Preferred foot', p.foot], ['Exported', dateTime(new Date())]
    ]},
    { title: 'ScoutLink verdict', lines: [verdict.label, verdict.paragraph] },
    { title: 'Headline decision metrics', rows: [
      ['Overall rating', score(p.overall_rating)], ['Compatibility', score(a.compatibilityScore)],
      ['Current readiness', score(overall.currentReadiness || overall.finalScore || p.overall_rating)],
      ['Potential rating', score(overall.potentialRating || p.overall_rating)],
      ['Evidence confidence', evidenceLabel(bundle)], ['Estimated value', money(p.transfer_value)]
    ]},
    { title: 'Compatibility intelligence', rows: [
      ['Need fit', score(compatibility.needFit || a.compatibilityBreakdown?.weaknessFit)],
      ['Role fit', score(compatibility.roleFit || a.compatibilityBreakdown?.roleFit)],
      ['Tactical style', score(compatibility.tacticalStyleFit || a.compatibilityBreakdown?.styleFit)],
      ['Formation fit', score(compatibility.formationPositionFit || a.compatibilityBreakdown?.formationFit)],
      ['Development pathway', score(compatibility.developmentPathwayFit || a.compatibilityBreakdown?.goalsFit)],
      ['Financial fit', score(compatibility.financialFit)]
    ]},
    { title: 'Overall rating breakdown', rows: Object.entries(overall)
      .filter(([,value]) => typeof value === 'number')
      .map(([key,value]) => [key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()), score(value)]) },
    { title: 'All player attributes', rows: ATTRIBUTES
      .filter(([key]) => p[key] !== null && p[key] !== undefined)
      .map(([key,label]) => [label, number(p[key])]) },
    { title: 'Match statistics', rows: [
      ['Appearances', number(p.appearances)], ['Goals', number(p.goals)], ['Assists', number(p.assists)],
      ['Clean sheets', number(p.clean_sheets)], ['Yellow cards', number(p.yellow_cards)], ['Red cards', number(p.red_cards)],
      ['Goals per game', number(p.appearances) ? round(number(p.goals) / number(p.appearances), 2) : 0],
      ['Assists per game', number(p.appearances) ? round(number(p.assists) / number(p.appearances), 2) : 0]
    ]},
    { title: 'Physical profile', rows: [
      ['Height category', p.height_category], ['Height range', p.height_range_cm],
      ['Build category', p.build_category], ['Weight range', p.weight_range_kg], ['Work rate', p.work_rate]
    ]},
    { title: 'All recorded matches', rows: bundle.matches.map(match => [
      dateOnly(match.match_date), match.opponent_name || match.opponent || 'Opponent',
      match.position_played || playerPosition(p), number(match.performance_score),
      number(match.goals), number(match.assists), number(match.yellow_cards), number(match.red_cards)
    ]), columns: ['Date','Opponent','Position','Performance','Goals','Assists','YC','RC'] },
    { title: 'Upcoming fixtures', rows: bundle.fixtures.map(fixture => [
      dateOnly(fixture.fixture_date), fixture.fixture_time || '', fixture.opponent_name || fixture.opponent || 'Opponent',
      fixture.venue_name || fixture.venue || fixture.address || '', fixture.home_or_away || ''
    ]), columns: ['Date','Time','Opponent','Venue','Home/Away'] },
    { title: 'Video evidence index', rows: bundle.videos.map(video => [
      video.title || 'Video evidence', video.category || '', dateOnly(video.created_at),
      video.description || '', video.video_url || video.url || video.file_url ? 'Available' : 'Unavailable'
    ]), columns: ['Title','Category','Added','Description','Status'] },
    { title: 'Team and external football context', rows: [
      ['Team', bundle.team?.team_name || p.team_name],
      ['Training or match address', [bundle.team?.address_line,bundle.team?.city,bundle.team?.postcode].filter(Boolean).join(', ')],
      ['League', bundle.team?.league_name], ['League page', bundle.team?.league_fulltime_url || 'Not supplied'],
      ['Team website', bundle.team?.team_website_url || 'Not supplied']
    ]},
    { title: 'Decision-support notice', lines: [
      'This export deliberately excludes coach personal contact details.',
      'ScoutLink combines coach-managed ratings, player profile data, Match Facts, team context and the saved recruitment brief. It supports a football decision but does not replace live observation, safeguarding checks or club due diligence.'
    ]}
  ];
  return sections;
}

function predictionSections(bundle, log) {
  const result = log.result || {};
  const input = log.input_params || {};
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  return [
    { title: 'Prediction identity', rows: [
      ['Player', playerName(bundle.player)], ['Age group', bundle.player.age_group],
      ['Position', playerPosition(bundle.player)], ['Team', bundle.player.team_name],
      ['Prediction type', log.prediction_type], ['Run at', dateTime(log.run_at)], ['Exported', dateTime(new Date())]
    ]},
    { title: 'Prediction outcome', lines: [result.summary || result.recommendation || 'Prediction completed.', ...(result.paragraphs || [])] },
    { title: 'Inputs used', rows: Object.entries(input).map(([key,value]) => [key, Array.isArray(value) ? value.join(', ') : JSON.stringify(value)]) },
    { title: 'Metrics informing the prediction', rows: evidence.map(item => [item.attribute || item.label || 'Metric', item.score ?? item.value ?? '']) },
    { title: 'Key output metrics', rows: Object.entries(result)
      .filter(([key,value]) => typeof value === 'number' || typeof value === 'string')
      .filter(([key]) => !['summary','disclaimer','predictedBehaviour','tacticalNote'].includes(key))
      .map(([key,value]) => [key.replace(/([A-Z])/g,' $1'), value]) },
    { title: 'Confidence, risk and safeguards', rows: [
      ['Confidence', result.confidence?.label || result.confidence || evidenceLabel(bundle)],
      ['Risk', result.risk || 'Review the detailed result'],
      ['Recommendation', result.recommendation || 'Review alongside live evidence']
    ], lines: [result.tacticalNote || '', result.disclaimer || 'This is a deterministic decision-support estimate, not a guarantee.'] },
    ...profileSections(bundle)
  ];
}

function buildPdf(title, sections) {
  const pages = [];
  let ops = [];
  let y = 765;
  let pageNo = 0;
  const pageWidth = 595;
  const left = 42;
  const right = 553;
  const text = (value,x,yy,size=9,bold=false) => ops.push('BT /' + (bold?'F2':'F1') + ' ' + size + ' Tf ' + x + ' ' + yy + ' Td (' + pdfEscape(value) + ') Tj ET');
  const fill = (shade,x,yy,w,h) => ops.push(shade + ' g ' + x + ' ' + yy + ' ' + w + ' ' + h + ' re f 0 g');
  const line = (x1,y1,x2,y2) => ops.push('0.82 G ' + x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S 0 G');
  function startPage() {
    if (ops.length) pages.push(ops);
    ops = [];
    pageNo += 1;
    fill('0.04',0,724,pageWidth,68);
    fill('0.08',0,724,8,68);
    text('Scout',left,760,22,true); text('Link',101,760,22,true);
    text(title,left,739,12,true);
    text('Generated ' + dateTime(new Date()),right-150,739,7,false);
    y = 700;
  }
  function footer() {
    line(left,38,right,38);
    text('ScoutLink decision-support export. Personal coach contact details are excluded.',left,22,7,false);
    text('Page ' + pageNo,right-35,22,7,false);
  }
  function ensure(height) {
    if (y - height < 54) { footer(); startPage(); }
  }
  function sectionTitle(value) {
    ensure(42); fill('0.93',left,y-8,right-left,26); fill('0.08',left,y-8,4,26);
    text(value.toUpperCase(),left+12,y,10,true); y -= 36;
  }
  startPage();
  sections.forEach(section => {
    sectionTitle(section.title);
    (section.lines || []).filter(Boolean).forEach(paragraph => {
      const lines = wrap(paragraph, 92);
      ensure(lines.length * 13 + 16);
      lines.forEach(lineText => { text(lineText,left+8,y,8.5,false); y -= 13; });
      y -= 7;
    });
    if (section.rows && section.rows.length) {
      if (section.columns) {
        const cols = section.columns.length;
        const width = (right-left)/cols;
        ensure(28); fill('0.91',left,y-5,right-left,22);
        section.columns.forEach((column,index) => text(column,left+index*width+4,y,7,true)); y -= 24;
        section.rows.forEach(row => {
          const wrapped = row.map(cell => wrap(cell, Math.max(10,Math.floor(78/cols))).slice(0,2));
          const height = Math.max(22,Math.max(...wrapped.map(lines => lines.length))*10+6);
          ensure(height+4); line(left,y+5,right,y+5);
          wrapped.forEach((lines,index) => lines.forEach((value,lineIndex) => text(value,left+index*width+4,y-lineIndex*10,7,false)));
          y -= height;
        });
      } else {
        section.rows.forEach(row => {
          const label = row[0]; const value = row.slice(1).filter(v => v !== undefined && v !== null).join(' | ');
          const lines = wrap(value, 62);
          const height = Math.max(25, lines.length*11+8); ensure(height+2);
          fill('0.97',left,y-height+7,right-left,height);
          text(label,left+8,y,7,true);
          lines.forEach((lineText,index) => text(lineText,left+185,y-index*11,8,false));
          y -= height+3;
        });
      }
    }
    y -= 9;
  });
  footer(); pages.push(ops);

  const objects = [null,'<< /Type /Catalog /Pages 2 0 R >>',null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const kids = [];
  pages.forEach((pageOps,index) => {
    const pageId = 5 + index*2; const streamId = pageId+1; const stream = pageOps.join('\n');
    kids.push(pageId+' 0 R');
    objects[pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamId+' 0 R >>';
    objects[streamId] = '<< /Length '+Buffer.byteLength(stream,'utf8')+' >>\nstream\n'+stream+'\nendstream';
  });
  objects[2] = '<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let pdf = '%PDF-1.4\n'; const offsets=[0];
  for(let i=1;i<objects.length;i++){ offsets[i]=Buffer.byteLength(pdf,'utf8'); pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'; }
  const xref=Buffer.byteLength(pdf,'utf8'); pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objects.length;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer << /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return Buffer.from(pdf,'utf8');
}

function excelCell(value) {
  const raw = value == null ? '' : value;
  const numeric = typeof raw === 'number' || /^-?\d+(\.\d+)?$/.test(String(raw));
  return '<Cell><Data ss:Type="'+(numeric?'Number':'String')+'">'+xml(raw)+'</Data></Cell>';
}
function buildExcel(title, sections) {
  const sheets = sections.map((section,index) => {
    const name = clean(section.title || 'Sheet '+(index+1)).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31) || 'Sheet '+(index+1);
    const rows = [];
    rows.push('<Row>'+excelCell(title)+'</Row>');
    rows.push('<Row>'+excelCell('Exported')+excelCell(dateTime(new Date()))+'</Row>');
    if (section.columns) rows.push('<Row>'+section.columns.map(excelCell).join('')+'</Row>');
    (section.rows || []).forEach(row => rows.push('<Row>'+row.map(excelCell).join('')+'</Row>'));
    (section.lines || []).filter(Boolean).forEach(line => rows.push('<Row>'+excelCell(line)+'</Row>'));
    return '<Worksheet ss:Name="'+xml(name)+'"><Table>'+rows.join('')+'</Table></Worksheet>';
  });
  const content = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+sheets.join('')+'</Workbook>';
  return Buffer.from(content,'utf8');
}

async function logExport(context, values) {
  const payload = {
    scout_id: context.scout.id,
    scout_team_id: context.scout.scout_team_id || null,
    player_id: values.playerId || null,
    prediction_log_id: values.predictionLogId || null,
    export_type: values.format,
    source: values.source,
    file_name: values.filename,
    payload: values.payload || {}
  };
  const { data, error } = await supabase.from('scout_exports').insert(payload).select().single();
  if (error) throw error;
  return data;
}
function responseFile(res, log, allowance, filename, mime, buffer) {
  res.json({
    exportId: log.id, filename, mime, contentBase64: buffer.toString('base64'),
    exportsRemaining: Math.max(0, allowance.remaining - 1), planLimit: allowance.limit
  });
}

router.use(requireAuth, requireRole('Scout'));

router.post('/player', async (req,res) => {
  try {
    const playerId = req.body.playerId;
    const format = String(req.body.format || 'PDF').toUpperCase() === 'EXCEL' ? 'Excel' : 'PDF';
    if (!playerId) return res.status(400).json({ error: 'playerId is required.' });
    const context = await scoutContext(req.user.id);
    const allowance = await ensureAllowance(context);
    const bundle = await playerBundle(req, context, playerId);
    let sections = profileSections(bundle);
    let source = clean(req.body.source || 'profile');
    let predictionLogId = req.body.predictionLogId || null;
    if (source === 'prediction' || predictionLogId) {
      const { data: log, error } = await supabase.from('predictions_log').select('*')
        .eq('id', predictionLogId).eq('scout_id', req.user.id).maybeSingle();
      if (error) throw error;
      if (!log) return res.status(404).json({ error: 'Prediction not found.' });
      sections = predictionSections(bundle, log);
      source = 'prediction';
    }
    const base = playerName(bundle.player).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    const extension = format === 'Excel' ? 'xls' : 'pdf';
    const filename = base + '-' + source + '-' + new Date().toISOString().slice(0,10) + '.' + extension;
    const title = 'ScoutLink ' + (source === 'prediction' ? 'Prediction Export' : 'Player Intelligence Export') + ' — ' + playerName(bundle.player);
    const buffer = format === 'Excel' ? buildExcel(title, sections) : buildPdf(title, sections);
    const mime = format === 'Excel' ? 'application/vnd.ms-excel' : 'application/pdf';
    const log = await logExport(context, {
      playerId, predictionLogId, format, source, filename,
      payload: { playerId, predictionLogId, source, format, title }
    });
    responseFile(res, log, allowance, filename, mime, buffer);
  } catch(error) {
    console.error('[Player export]', error);
    res.status(error.status || 500).json({ error: error.message || 'The player export could not be created.', allowance: error.allowance });
  }
});

router.post('/comparison', async (req,res) => {
  try {
    const context = await scoutContext(req.user.id);
    const allowance = await ensureAllowance(context);
    const a = await playerBundle(req, context, req.body.playerAId);
    const b = await playerBundle(req, context, req.body.playerBId);
    const comparison = req.body.comparison || {};
    const categoryRows = (comparison.categories || []).map(row => [
      row.category || row.name || row.key, row.playerA ?? row.playerAScore ?? '',
      row.playerB ?? row.playerBScore ?? '', row.winner || '', row.margin ?? '', row.weight ?? ''
    ]);
    const sections = [
      { title: 'Comparison summary', rows: [
        ['Exported', dateTime(new Date())], ['Decision context', comparison.context?.label || req.body.contextLabel || 'Immediate starter'],
        ['Player A', playerName(a.player)], ['Player A decision score', comparison.playerA?.totalScore ?? ''],
        ['Player B', playerName(b.player)], ['Player B decision score', comparison.playerB?.totalScore ?? ''],
        ['Decision-score margin', comparison.decisionScoreMargin ?? ''], ['Recommendation', comparison.recommendation || '']
      ]},
      { title: 'Category comparison', columns: ['Category',playerName(a.player),playerName(b.player),'Winner','Margin','Weight'], rows: categoryRows },
      { title: 'Player A attributes', rows: ATTRIBUTES.map(([key,label]) => [label,number(a.player[key])]) },
      { title: 'Player B attributes', rows: ATTRIBUTES.map(([key,label]) => [label,number(b.player[key])]) },
      { title: 'Player A statistics', rows: profileSections(a).find(section=>section.title==='Match statistics').rows },
      { title: 'Player B statistics', rows: profileSections(b).find(section=>section.title==='Match statistics').rows },
      { title: 'Decision-support notice', lines: ['The comparison context changes category weights. This spreadsheet retains the selected context, raw category scores, weights, winner and exact decision-score margin.'] }
    ];
    const filename = 'scoutlink-comparison-' + new Date().toISOString().slice(0,10) + '.xls';
    const buffer = buildExcel('ScoutLink Player Comparison', sections);
    const log = await logExport(context, {
      format: 'Excel', source: 'comparison', filename,
      payload: { playerAId: a.player.id, playerBId: b.player.id, comparison, format: 'Excel', source: 'comparison' }
    });
    responseFile(res, log, allowance, filename, 'application/vnd.ms-excel', buffer);
  } catch(error) {
    console.error('[Comparison export]', error);
    res.status(error.status || 500).json({ error: error.message || 'The comparison export could not be created.', allowance: error.allowance });
  }
});

router.post('/pipeline', async (req,res) => {
  try {
    const context = await scoutContext(req.user.id);
    const allowance = await ensureAllowance(context);
    let query = supabase.from('recruitment_pipeline').select('*').eq('is_active', true).order('updated_at', { ascending: false });
    query = context.scout.scout_team_id ? query.eq('scout_team_id', context.scout.scout_team_id) : query.eq('scout_id', context.scout.id);
    const { data: pipeline, error } = await query;
    if (error) throw error;
    const bundles = [];
    for (const row of pipeline || []) bundles.push({ row, bundle: await playerBundle(req, context, row.player_id) });
    const rows = bundles.map(({row,bundle}) => [
      playerName(bundle.player), bundle.player.age_group, playerPosition(bundle.player), bundle.player.team_name,
      row.stage, row.interest_level || '', score(bundle.analysis.compatibilityScore), score(bundle.player.overall_rating),
      evidenceLabel(bundle), row.next_action || '', dateOnly(row.next_action_due_at), dateOnly(row.updated_at)
    ]);
    const sections = [{
      title: 'Recruitment pipeline',
      columns: ['Player','Age group','Position','Team','Stage','Interest','Compatibility','Overall','Evidence','Next action','Due','Updated'],
      rows
    }, { title: 'Export details', rows: [['Exported',dateTime(new Date())],['Active pipeline players',rows.length],['Export usage','1 export']] }];
    const format = String(req.body.format || 'Excel').toUpperCase() === 'PDF' ? 'PDF' : 'Excel';
    const filename = 'scoutlink-pipeline-' + new Date().toISOString().slice(0,10) + '.' + (format==='PDF'?'pdf':'xls');
    const buffer = format === 'PDF' ? buildPdf('ScoutLink Recruitment Pipeline', sections) : buildExcel('ScoutLink Recruitment Pipeline', sections);
    const mime = format === 'PDF' ? 'application/pdf' : 'application/vnd.ms-excel';
    const log = await logExport(context, { format, source:'pipeline', filename, payload:{source:'pipeline',format} });
    responseFile(res, log, allowance, filename, mime, buffer);
  } catch(error) {
    console.error('[Pipeline export]', error);
    res.status(error.status || 500).json({ error: error.message || 'The pipeline export could not be created.', allowance: error.allowance });
  }
});

router.post('/history/:id/download', async (req,res) => {
  try {
    const context = await scoutContext(req.user.id);
    let query = supabase.from('scout_exports').select('*').eq('id', req.params.id).eq('scout_id', req.user.id);
    const { data: log, error } = await query.maybeSingle();
    if (error) throw error;
    if (!log) return res.status(404).json({ error: 'Export history item not found.' });
    const payload = log.payload || {};
    if (log.source === 'comparison') {
      const a = await playerBundle(req, context, payload.playerAId);
      const b = await playerBundle(req, context, payload.playerBId);
      const comparison = payload.comparison || {};
      const categoryRows = (comparison.categories || []).map(row => [
        row.category || row.name || row.key, row.playerA ?? row.playerAScore ?? '',
        row.playerB ?? row.playerBScore ?? '', row.winner || '', row.margin ?? '', row.weight ?? ''
      ]);
      const sections = [
        { title: 'Comparison summary', rows: [
          ['Exported again', dateTime(new Date())], ['Original export', dateTime(log.created_at)],
          ['Decision context', comparison.context?.label || payload.contextLabel || 'Immediate starter'],
          ['Player A', playerName(a.player)], ['Player A decision score', comparison.playerA?.totalScore ?? comparison.playerATotal ?? ''],
          ['Player B', playerName(b.player)], ['Player B decision score', comparison.playerB?.totalScore ?? comparison.playerBTotal ?? ''],
          ['Decision-score margin', comparison.decisionScoreMargin ?? ''], ['Recommendation', comparison.recommendation || '']
        ]},
        { title: 'Category comparison', columns: ['Category',playerName(a.player),playerName(b.player),'Winner','Margin','Weight'], rows: categoryRows },
        { title: 'Player A attributes', rows: ATTRIBUTES.map(([key,label]) => [label,number(a.player[key])]) },
        { title: 'Player B attributes', rows: ATTRIBUTES.map(([key,label]) => [label,number(b.player[key])]) },
        { title: 'Player A statistics', rows: profileSections(a).find(section=>section.title==='Match statistics').rows },
        { title: 'Player B statistics', rows: profileSections(b).find(section=>section.title==='Match statistics').rows },
        { title: 'Decision-support notice', lines: ['This is a historical re-download. It does not consume another export. The comparison context, category weights and recorded decision-score margin are retained.'] }
      ];
      const buffer = buildExcel('ScoutLink Player Comparison', sections);
      return res.json({ filename: log.file_name || 'scoutlink-comparison.xls', mime:'application/vnd.ms-excel', contentBase64:buffer.toString('base64'), historicalDownload:true });
    }
    if (log.source === 'pipeline') {
      let pipelineQuery = supabase.from('recruitment_pipeline').select('*').eq('is_active', true).order('updated_at', { ascending: false });
      pipelineQuery = context.scout.scout_team_id ? pipelineQuery.eq('scout_team_id', context.scout.scout_team_id) : pipelineQuery.eq('scout_id', context.scout.id);
      const { data: pipeline, error: pipelineError } = await pipelineQuery;
      if (pipelineError) throw pipelineError;
      const rows = [];
      for (const row of pipeline || []) {
        const bundle = await playerBundle(req, context, row.player_id);
        rows.push([
          playerName(bundle.player), bundle.player.age_group, playerPosition(bundle.player), bundle.player.team_name,
          row.stage, row.interest_level || '', score(bundle.analysis.compatibilityScore), score(bundle.player.overall_rating),
          evidenceLabel(bundle), row.next_action || '', dateOnly(row.next_action_due_at), dateOnly(row.updated_at)
        ]);
      }
      const sections = [
        { title:'Recruitment pipeline', columns:['Player','Age group','Position','Team','Stage','Interest','Compatibility','Overall','Evidence','Next action','Due','Updated'], rows },
        { title:'Export details', rows:[['Re-downloaded',dateTime(new Date())],['Original export',dateTime(log.created_at)],['Active pipeline players',rows.length],['Additional export usage','0']] }
      ];
      const format = String(log.export_type || payload.format || 'Excel').toUpperCase().includes('PDF') ? 'PDF' : 'Excel';
      const buffer = format === 'PDF' ? buildPdf('ScoutLink Recruitment Pipeline', sections) : buildExcel('ScoutLink Recruitment Pipeline', sections);
      return res.json({ filename:log.file_name, mime:format==='PDF'?'application/pdf':'application/vnd.ms-excel', contentBase64:buffer.toString('base64'), historicalDownload:true });
    }
    const bundle = await playerBundle(req, context, log.player_id || payload.playerId);
    let sections = profileSections(bundle);
    if (log.source === 'prediction' && (log.prediction_log_id || payload.predictionLogId)) {
      const result = await supabase.from('predictions_log').select('*').eq('id', log.prediction_log_id || payload.predictionLogId).maybeSingle();
      if (result.error) throw result.error;
      if (result.data) sections = predictionSections(bundle, result.data);
    }
    const format = String(log.export_type || payload.format || 'PDF').toUpperCase().includes('EXCEL') ? 'Excel' : 'PDF';
    const title = 'ScoutLink ' + (log.source === 'prediction' ? 'Prediction Export' : 'Player Intelligence Export') + ' — ' + playerName(bundle.player);
    const buffer = format === 'Excel' ? buildExcel(title, sections) : buildPdf(title, sections);
    res.json({ filename: log.file_name, mime: format==='Excel'?'application/vnd.ms-excel':'application/pdf', contentBase64: buffer.toString('base64'), historicalDownload:true });
  } catch(error) {
    res.status(error.status || 500).json({ error: error.message || 'The saved export could not be downloaded.' });
  }
});

module.exports = router;

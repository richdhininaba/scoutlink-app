/* ScoutLink Scout Intelligence V4
   Additive functional layer for the Scout workspace.
   It preserves Scout Experience V3 and progressively enhances each route. */
(function () {
  'use strict';

  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var ROOT_ID = 'scoutIntelligenceV4';
  var state = {
    route:'',
    players:[],
    playerById:{},
    overview:null,
    activePrediction:null,
    activeComparison:null,
    activeProfile:null,
    savedSearches:[],
    reports:[],
    usage:null
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
      }[char];
    });
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp(value, min, max) {
    min = min == null ? 0 : min;
    max = max == null ? 100 : max;
    return Math.max(min, Math.min(max, num(value)));
  }

  function score(value, fallback) {
    var parsed = num(value, fallback == null ? 50 : fallback);
    return Math.round(clamp(parsed > 0 && parsed <= 10 ? parsed * 10 : parsed));
  }

  function money(value) {
    return 'GBP ' + Math.round(num(value)).toLocaleString('en-GB');
  }

  function dateText(value) {
    if (!value) return 'Not set';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
      day:'numeric', month:'short', year:'numeric'
    });
  }

  function dateTimeText(value) {
    if (!value) return 'Not set';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-GB', {
      day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  function initials(player) {
    return [player && player.first_name, player && player.last_name]
      .filter(Boolean).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'PL';
  }

  function playerName(player) {
    return [player && player.first_name, player && player.last_name]
      .filter(Boolean).join(' ') || 'Player';
  }

  function playerPosition(player) {
    return String(
      player && (player.specific_position || player.primary_position ||
      (Array.isArray(player.positions) && player.positions[0]) || player.position_group) || '—'
    ).toUpperCase();
  }

  function playerLine(player) {
    return [playerPosition(player), player && player.age_group, player && player.team_name]
      .filter(Boolean).join(' · ');
  }

  function apiBase() {
    return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, '');
  }

  function token() {
    return localStorage.getItem('sl_token') || '';
  }

  function currentUserId() {
    try {
      var user = JSON.parse(localStorage.getItem('sl_user') || '{}');
      return user.id || user.userId || user.user_id || null;
    } catch (_) {
      return null;
    }
  }

  function isPublicDemo() {
    return sessionStorage.getItem('sl_public_demo') === '1' ||
      localStorage.getItem('sl_token') === 'public-demo-session';
  }

  function legacyApi(method, path, body) {
    if (typeof window.api === 'function') {
      return window.api(method, path, body);
    }
    return request(method, path, body);
  }

  async function request(method, path, body) {
    var headers = { Accept:'application/json' };
    var authToken = token();
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + path, {
      method:method,
      headers:headers,
      body:body === undefined || body === null ? undefined : JSON.stringify(body),
      credentials:'include'
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function routeId() {
    var declared = document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    var map = {
      '/confirm-password':'confirm',
      '/scout/onboarding':'confirm',
      '/scout/dashboard':'dashboard',
      '/scout/player-search':'search',
      '/player/profile':'profile',
      '/scout/pipeline':'pipeline',
      '/scout/rankings':'rankings',
      '/scout/fixtures':'fixtures',
      '/scout/predictions':'predictions',
      '/scout/exports':'exports',
      '/scout/compare-players':'compare',
      '/scout/setup':'setup',
      '/scout/events':'events',
      '/scout/chat':'chat',
      '/scout/notifications':'notifications',
      '/scout/report-a-concern':'concern',
      '/scout/settings':'settings'
    };
    return map[path] || '';
  }

  function waitForWorkspace(callback) {
    var attempts = 0;
    function check() {
      attempts += 1;
      var app = document.getElementById('scoutExperienceApp');
      var content = app && app.querySelector('.content');
      if (app && content) {
        callback(app, content);
        return;
      }
      if (attempts < 160) window.setTimeout(check, 50);
    }
    check();
  }

  function toast(message, type) {
    document.querySelectorAll('.si4-toast').forEach(function (node) { node.remove(); });
    var node = document.createElement('div');
    node.className = 'si4-toast' + (type === 'error' ? ' error' : '');
    node.setAttribute('role', type === 'error' ? 'alert' : 'status');
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () { node.remove(); }, 4300);
  }

  function loading(copy) {
    return '<div class="si4-loading"><div class="si4-spinner" aria-hidden="true"></div>' +
      '<b>Loading ScoutLink intelligence</b><span>' + esc(copy || 'Preparing the decision-support view.') + '</span></div>';
  }

  function empty(title, copy, actionHtml) {
    return '<div class="si4-empty"><b>' + esc(title) + '</b><span>' + esc(copy) + '</span>' +
      (actionHtml ? '<div class="si4-actions" style="margin-top:10px">' + actionHtml + '</div>' : '') + '</div>';
  }

  function errorState(message) {
    return '<div class="si4-error"><b>Scout intelligence could not load</b><span>' + esc(message) + '</span>' +
      '<button class="si4-button small" type="button" data-si4-reload style="margin-top:10px">Try again</button></div>';
  }

  function shell(title, copy, actions, body) {
    return '<section class="si4-shell">' +
      '<header class="si4-head"><div class="si4-head-copy"><span class="si4-eyebrow">Scout intelligence</span>' +
      '<h2>' + esc(title) + '</h2><p>' + esc(copy) + '</p></div>' +
      '<div class="si4-head-actions">' + (actions || '') + '</div></header>' +
      '<div class="si4-body">' + body + '</div></section>';
  }

  function metric(label, value, copy, colour) {
    return '<article class="si4-card si4-metric"><small>' + esc(label) + '</small>' +
      '<strong class="' + esc(colour || '') + '">' + esc(value) + '</strong>' +
      '<span>' + esc(copy || '') + '</span></article>';
  }

  function pill(value, colour) {
    return '<span class="si4-pill ' + esc(colour || '') + '">' + esc(value) + '</span>';
  }

  function playerOption(player, extra) {
    return '<option value="' + esc(player.id) + '">' + esc(playerName(player) + ' · ' + playerLine(player) + (extra ? ' · ' + extra : '')) + '</option>';
  }

  function progressRow(label, value, colour) {
    var safe = score(value);
    return '<div class="si4-progress-row"><span>' + esc(label) + '</span>' +
      '<div class="si4-progress ' + esc(colour || '') + '"><span style="width:' + safe + '%"></span></div>' +
      '<b>' + safe + '</b></div>';
  }

  function tabs(items, active) {
    return '<div class="si4-tabs" role="tablist">' + items.map(function (item) {
      return '<button class="si4-tab ' + (item.id === active ? 'active' : '') + '" type="button" ' +
        'role="tab" aria-selected="' + (item.id === active ? 'true' : 'false') + '" data-si4-tab="' + esc(item.id) + '">' +
        esc(item.label) + '</button>';
    }).join('') + '</div>';
  }

  function bindTabs(root) {
    root.querySelectorAll('[data-si4-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-si4-tab');
        root.querySelectorAll('[data-si4-tab]').forEach(function (tab) {
          var selected = tab === button;
          tab.classList.toggle('active', selected);
          tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        root.querySelectorAll('[data-si4-panel]').forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-si4-panel') !== id;
        });
      });
    });
  }

  function dialog(title, body, onReady) {
    var backdrop = document.createElement('div');
    backdrop.className = 'si4-dialog-backdrop';
    backdrop.innerHTML = '<section class="si4-dialog" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<header class="si4-head"><div class="si4-head-copy"><span class="si4-eyebrow">ScoutLink</span><h3>' + esc(title) + '</h3></div>' +
      '<button class="si4-button small" type="button" data-si4-close>Close</button></header>' +
      '<div class="si4-body">' + body + '</div></section>';
    document.body.appendChild(backdrop);
    function close() { backdrop.remove(); }
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop || event.target.closest('[data-si4-close]')) close();
    });
    document.addEventListener('keydown', function handler(event) {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handler);
      }
    });
    if (typeof onReady === 'function') onReady(backdrop, close);
    return backdrop;
  }

  function mount(content, html, options) {
    options = options || {};
    var old = document.getElementById(ROOT_ID);
    if (old) old.remove();
    var root = document.createElement('section');
    root.id = ROOT_ID;
    root.className = 'scout-intelligence-v4';
    root.setAttribute('aria-label', 'ScoutLink intelligence workspace');
    root.innerHTML = html;

    var hero = content.querySelector('.page-hero');
    if (hero && hero.parentNode === content) hero.insertAdjacentElement('afterend', root);
    else content.insertBefore(root, content.firstChild);

    if (options.suppressLegacy) {
      Array.from(content.children).forEach(function (child) {
        if (child !== root && child !== hero) child.classList.add('si4-legacy-suppressed');
      });
    }
    root.querySelectorAll('[data-si4-reload]').forEach(function (button) {
      button.addEventListener('click', initRoute);
    });
    bindTabs(root);
    return root;
  }

  function demoPlayers() {
    try {
      if (typeof window.getDemoState === 'function') {
        return (window.getDemoState().players || []).slice();
      }
      var raw = sessionStorage.getItem('sl_public_demo_state');
      if (raw) return (JSON.parse(raw).players || []).slice();
    } catch (_) {}
    return [];
  }

  function localDemoAnalysis(player) {
    try {
      if (typeof window.demoAnalysis === 'function') {
        return window.demoAnalysis(player, typeof window.getDemoState === 'function' ? window.getDemoState() : {});
      }
    } catch (_) {}
    var overall = score(player.overall_rating, 68);
    var compatibility = score(player.compatibilityScore, Math.min(92, overall + 7));
    return {
      compatibilityScore:compatibility,
      overallBreakdown:{
        finalScore:overall,
        currentReadiness:overall,
        potentialRating:Math.min(95, overall + 7),
        technicalScore:score(player.passing, overall),
        tacticalIQScore:score(player.positioning, overall),
        physicalProfileScore:score(player.strength, overall),
        mentalCoachabilityScore:score(player.composure, overall),
        matchOutputScore:overall
      },
      positionRatings:{
        ratings:{},
        bestCurrentPosition:playerPosition(player),
        bestCurrentScore:overall,
        bestFuturePosition:playerPosition(player),
        bestFutureScore:Math.min(95, overall + 4),
        sorted:[{role:playerPosition(player),score:overall}]
      },
      compatibility:{
        needFit:compatibility,
        roleFit:Math.max(45, compatibility - 5),
        tacticalStyleFit:Math.max(45, compatibility - 3),
        formationPositionFit:Math.max(45, compatibility - 4),
        developmentPathwayFit:Math.max(45, compatibility - 2),
        financialFit:Math.max(45, compatibility - 6),
        risks:[]
      },
      valueAnalysis:{value:num(player.transfer_value)}
    };
  }

  function localEvidence(player) {
    var appearances = num(player.appearances);
    var attrs = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
    var rated = attrs.filter(function (key) { return num(player[key]) > 0; }).length;
    var completeness = Math.round(rated / attrs.length * 100);
    var value = Math.round(Math.min(100, appearances * 7) * .6 + completeness * .4);
    return {
      score:value,
      label:value >= 80 ? 'High' : value >= 60 ? 'Medium' : value >= 40 ? 'Low' : 'Very low',
      matchCount:appearances,
      attributeCompleteness:completeness,
      videoCount:0,
      missing:[].concat(appearances < 5 ? ['More recorded matches'] : [], completeness < 80 ? ['More complete coach ratings'] : [], ['Approved video evidence']),
      note:'Demo confidence is based on the player record currently loaded in this browser session.'
    };
  }

  function localPositionFit(player, analysis, target) {
    var ratings = analysis.positionRatings || {};
    var best = score(ratings.bestCurrentScore || player.overall_rating);
    var targetScore = target === (ratings.bestCurrentPosition || playerPosition(player))
      ? best : Math.max(45, best - 9);
    var gap = targetScore - best;
    var verdict = gap >= -2 ? 'Natural or near-natural fit' : gap >= -8 ? 'Convertible with a managed development plan' : 'High-friction conversion';
    var attrs = ['pace','stamina','positioning','composure','tackling'].map(function (key) {
      return { key:key, label:key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }), score:score(player[key], 55) };
    }).sort(function (a, b) { return b.score - a.score; });
    return {
      targetPosition:target,
      targetScore:targetScore,
      bestCurrentPosition:ratings.bestCurrentPosition || playerPosition(player),
      bestCurrentScore:best,
      bestFuturePosition:ratings.bestFuturePosition || playerPosition(player),
      bestFutureScore:score(ratings.bestFutureScore || best + 4),
      gapVsBest:gap,
      verdict:verdict,
      supportingAttributes:attrs.slice(0, 3),
      frictionAttributes:attrs.slice().reverse().slice(0, 3),
      alternatives:ratings.sorted || [],
      recommendation:verdict === 'High-friction conversion' ? 'Keep the player in the stronger role or test a closer conversion before recruitment.' : 'Validate the role through a live observation before progressing.'
    };
  }

  function localBundle(player) {
    var analysis = localDemoAnalysis(player);
    var evidence = localEvidence(player);
    var compatibility = score(analysis.compatibilityScore);
    var readiness = score(analysis.overallBreakdown && analysis.overallBreakdown.currentReadiness || player.overall_rating);
    var verdictLabel = compatibility >= 82 && evidence.score >= 60 ? 'Prioritise' : compatibility >= 70 ? 'Development target' : 'Monitor';
    return {
      player:player,
      facts:[],
      videos:[],
      analysis:analysis,
      evidence:evidence,
      verdict:{
        label:verdictLabel,
        action:verdictLabel === 'Prioritise' ? 'Prioritise a live observation and coach conversation.' : 'Keep the player under structured review.',
        compatibility:compatibility,
        readiness:readiness,
        potential:score(analysis.overallBreakdown && analysis.overallBreakdown.potentialRating || readiness + 5),
        evidenceConfidence:evidence.label,
        risks:(analysis.compatibility && analysis.compatibility.risks) || [],
        summary:playerName(player) + ' is a ' + verdictLabel.toLowerCase() + ' for the current demo recruitment brief.'
      },
      positionFit:localPositionFit(player, analysis, playerPosition(player)),
      timeline:[
        { type:'profile_update', at:player.updated_at || new Date().toISOString(), title:'Demo player profile loaded', body:'This sample player record is isolated from real ScoutLink records.' }
      ]
    };
  }

  async function loadPlayers() {
    if (state.players.length) return state.players;
    var response;
    if (isPublicDemo()) {
      state.players = demoPlayers();
    } else {
      response = await legacyApi('GET', '/api/players?limit=100&page=1');
      state.players = response.data || response.players || [];
    }
    state.playerById = {};
    state.players.forEach(function (player) { state.playerById[player.id] = player; });
    return state.players;
  }

  async function overview() {
    if (isPublicDemo()) {
      var players = await loadPlayers();
      return {
        brief:{
          formation:'4-3-3', playingStyle:'High press',
          weaknesses:['Tactical Awareness Gaps','Insufficient Game Pace and Speed'],
          roleExpectations:['Tactical Intelligence','Speed and Agility'],
          longTermGoals:['Financial Viability','Positional Depth Advantage']
        },
        usage:{
          plan:'Elite demo', resetAt:null,
          predictions:{used:4,limit:60,remaining:56},
          exports:{used:2,limit:300,remaining:298},
          interests:{used:Math.min(7, players.length),limit:300,remaining:293}
        },
        tasks:[], activity:[]
      };
    }
    if (!state.overview) state.overview = await request('GET', '/api/scout-intelligence/overview');
    return state.overview;
  }

  async function playerIntelligence(id) {
    if (isPublicDemo()) {
      var players = await loadPlayers();
      var found = players.find(function (player) { return String(player.id) === String(id); });
      if (!found) throw new Error('The demo player could not be found.');
      return localBundle(found);
    }
    return request('GET', '/api/scout-intelligence/players/' + encodeURIComponent(id));
  }

  function evidenceHtml(evidence) {
    evidence = evidence || {};
    return '<div class="si4-evidence-grid">' +
      '<div class="si4-evidence-item"><b>' + score(evidence.score) + '/100</b><span>Evidence confidence · ' + esc(evidence.label || 'Not assessed') + '</span></div>' +
      '<div class="si4-evidence-item"><b>' + num(evidence.matchCount) + '</b><span>Recorded matches supporting the profile</span></div>' +
      '<div class="si4-evidence-item"><b>' + num(evidence.attributeCompleteness) + '%</b><span>Coach attribute completeness</span></div>' +
      '<div class="si4-evidence-item"><b>' + num(evidence.videoCount) + '</b><span>Approved video evidence items</span></div>' +
      '</div>' +
      '<div class="si4-callout ' + (score(evidence.score) < 50 ? 'gold' : '') + '" style="margin-top:9px"><b>How much to trust this:</b> ' + esc(evidence.note || 'Use the evidence score alongside live scouting judgement.') + '</div>' +
      ((evidence.missing || []).length ? '<div class="si4-section"><div class="si4-section-head"><div><h3>Evidence still needed</h3><p>Close these gaps before a final decision.</p></div></div><div class="si4-pill-row">' +
      evidence.missing.map(function (item) { return pill(item, 'gold'); }).join('') + '</div></div>' : '');
  }

  function positionFitHtml(fit) {
    fit = fit || {};
    var verdictClass = /high-friction/i.test(fit.verdict || '') ? 'red' : /convertible/i.test(fit.verdict || '') ? 'gold' : 'green';
    var supports = fit.supportingAttributes || [];
    var friction = fit.frictionAttributes || [];
    return '<div class="si4-summary-bar"><div><b>' + esc(fit.verdict || 'Position fit not calculated') + '</b><br><span>' +
      esc((fit.targetPosition || 'Target') + ' scores ' + (fit.targetScore == null ? '—' : fit.targetScore + '/100') + ' versus the best role at ' + (fit.bestCurrentScore == null ? '—' : fit.bestCurrentScore + '/100')) +
      '</span></div>' + pill((fit.gapVsBest == null ? '—' : fit.gapVsBest) + ' gap', verdictClass) + '</div>' +
      '<div class="si4-grid four">' +
        metric('Best current role', fit.bestCurrentPosition || '—', (fit.bestCurrentScore || '—') + '/100') +
        metric('Best future role', fit.bestFuturePosition || '—', (fit.bestFutureScore || '—') + '/100') +
        metric('Target role', fit.targetPosition || '—', (fit.targetScore || '—') + '/100') +
        metric('Conversion verdict', fit.verdict || '—', fit.recommendation || '', /high-friction/i.test(fit.verdict || '') ? 'red' : 'green') +
      '</div>' +
      '<div class="si4-split-list si4-section">' +
        '<article class="si4-card green"><h3>What supports the role</h3><ul class="si4-strength-list">' +
          (supports.length ? supports.map(function (item) { return '<li><b>' + esc(item.label || item.key) + ' ' + score(item.score) + '/100</b> supports the target-role actions.</li>'; }).join('') : '<li>No role-specific strengths have been calculated yet.</li>') +
        '</ul></article>' +
        '<article class="si4-card red"><h3>Where friction comes from</h3><ul class="si4-risk-list">' +
          (friction.length ? friction.map(function (item) { return '<li><b>' + esc(item.label || item.key) + ' ' + score(item.score) + '/100</b> creates role-conversion risk.</li>'; }).join('') : '<li>No material role friction has been identified.</li>') +
        '</ul></article>' +
      '</div>' +
      '<div class="si4-callout ' + verdictClass + '" style="margin-top:10px"><b>Recruitment action:</b> ' + esc(fit.recommendation || 'Validate the result through live observation.') + '</div>';
  }

  function timelineHtml(rows) {
    rows = rows || [];
    if (!rows.length) return empty('No decision history yet', 'Changes, reports, observations and decisions will appear here.');
    return '<div class="si4-timeline">' + rows.map(function (row) {
      return '<article class="si4-timeline-item"><b>' + esc(row.title || row.event_type || 'ScoutLink activity') + '</b>' +
        '<span>' + esc(row.body || '') + '</span><time>' + esc(dateTimeText(row.at || row.created_at)) + '</time></article>';
    }).join('') + '</div>';
  }

  function briefHtml(brief) {
    brief = brief || {};
    return '<div class="si4-grid two">' +
      '<article class="si4-card"><h3>Team context</h3><div class="si4-pill-row">' +
        pill(brief.formation || 'Formation not set', 'blue') + pill(brief.playingStyle || 'Style not set', 'green') +
      '</div><p>These settings influence search ordering, compatibility, position fit and comparison recommendations.</p></article>' +
      '<article class="si4-card"><h3>What the team needs</h3><div class="si4-pill-row">' +
        (brief.weaknesses || []).concat(brief.roleExpectations || []).slice(0, 6).map(function (item) { return pill(item); }).join('') +
      '</div><p>The intelligence layer explains how each player addresses or fails to address this brief.</p></article>' +
    '</div>';
  }

  async function renderDashboard(content) {
    mount(content, shell('Decision centre', 'See the work that needs attention, the evidence that changed and the limits available to the scout team.', '', loading('Loading the recruitment brief, tasks and usage.')));
    try {
      var data = await overview();
      var usage = data.usage || {};
      state.usage = usage;
      var body = '<div class="si4-kpi-strip">' +
        metric('Predictions remaining', num(usage.predictions && usage.predictions.remaining), 'of ' + num(usage.predictions && usage.predictions.limit), 'green') +
        metric('Exports remaining', num(usage.exports && usage.exports.remaining), 'of ' + num(usage.exports && usage.exports.limit)) +
        metric('Pipeline capacity', num(usage.interests && usage.interests.remaining), 'places remaining') +
        metric('Current plan', usage.plan || 'Scout', usage.resetAt ? 'Resets ' + dateText(usage.resetAt) : 'Usage managed by the scout team') +
      '</div>' + briefHtml(data.brief) +
      '<div class="si4-grid two si4-section"><article class="si4-card"><div class="si4-section-head"><div><h3>Next actions</h3><p>Tasks and decisions that need an owner.</p></div></div>' +
      ((data.tasks || []).length ? (data.tasks || []).slice(0, 8).map(function (task) {
        return '<div class="si4-list-row"><div><h4>' + esc(task.title) + '</h4><p>' + esc(task.description || task.task_type || '') + (task.due_at ? ' · Due ' + dateText(task.due_at) : '') + '</p></div>' + pill(task.priority || 'normal', task.priority === 'urgent' ? 'red' : '') + '</div>';
      }).join('') : empty('No open tasks', 'Create tasks from players, comparisons, fixtures or pipeline decisions.')) +
      '</article><article class="si4-card"><div class="si4-section-head"><div><h3>Recent intelligence changes</h3><p>Only evidence and decisions that may change an action.</p></div></div>' +
      ((data.activity || []).length ? timelineHtml((data.activity || []).slice(0, 8)) : empty('No new intelligence changes', 'Saved searches, watches, observations and decisions will appear here.')) +
      '</article></div>';
      var root = mount(content, shell('Decision centre', 'See the work that needs attention, the evidence that changed and the limits available to the scout team.',
        '<a class="si4-button primary" href="/scout/player-search">Find players</a><a class="si4-button" href="/scout/pipeline">Open pipeline</a>', body));
      root.querySelectorAll('[data-si4-task]').forEach(function () {});
    } catch (error) {
      mount(content, shell('Decision centre', 'The recruitment brief and work queue could not be loaded.', '', errorState(error.message)));
    }
  }

  async function renderProfile(content) {
    var playerId = new URLSearchParams(window.location.search).get('id');
    if (!playerId) {
      mount(content, shell('Player intelligence', 'Open a player from search, rankings, fixtures or the pipeline.', '<a class="si4-button primary" href="/scout/player-search">Find a player</a>', empty('No player selected', 'Select a player before opening the intelligence view.')));
      return;
    }
    mount(content, shell('Player intelligence', 'A decision-ready summary of fit, evidence, role suitability, risk and next action.', '', loading('Loading the complete player decision record.')));
    try {
      var bundle = await playerIntelligence(playerId);
      state.activeProfile = bundle;
      var player = bundle.player || {};
      var verdict = bundle.verdict || {};
      var evidence = bundle.evidence || {};
      var body = '<div class="si4-verdict"><div class="si4-verdict-mark"><small>ScoutLink verdict</small><strong>' + esc(verdict.label || 'Monitor') + '</strong><span>' + esc(verdict.action || 'Review the complete evidence before progressing.') + '</span></div>' +
        '<div class="si4-verdict-copy"><div class="si4-player-head"><div class="si4-avatar">' + esc(initials(player)) + '</div><div><h3>' + esc(playerName(player)) + '</h3><p>' + esc(playerLine(player)) + '</p></div></div><p style="margin-top:10px">' + esc(verdict.summary || '') + '</p>' +
        '<div class="si4-pill-row">' + pill('Compatibility ' + score(verdict.compatibility || bundle.analysis && bundle.analysis.compatibilityScore) + '/100', 'green') + pill('Readiness ' + score(verdict.readiness || player.overall_rating) + '/100', 'blue') + pill('Potential ' + score(verdict.potential || player.potential_rating || player.overall_rating) + '/100') + pill('Evidence ' + (evidence.label || 'Not assessed'), evidence.score < 50 ? 'gold' : 'green') + '</div></div></div>' +
        tabs([
          {id:'verdict',label:'Verdict'}, {id:'evidence',label:'Evidence'}, {id:'position',label:'Position fit'}, {id:'timeline',label:'Timeline'}, {id:'actions',label:'Actions'}
        ], 'verdict') +
        '<section data-si4-panel="verdict"><div class="si4-grid two"><article class="si4-card green"><h3>Why this verdict</h3><p>' + esc(verdict.summary || '') + '</p><div class="si4-callout" style="margin-top:9px"><b>Next action:</b> ' + esc(verdict.action || '') + '</div></article>' +
        '<article class="si4-card red"><h3>Recruitment risks</h3><ul class="si4-risk-list">' +
          ((verdict.risks || []).length ? verdict.risks.map(function (risk) { return '<li>' + esc(typeof risk === 'string' ? risk : risk.label || risk.reason || JSON.stringify(risk)) + '</li>'; }).join('') : '<li>No specific model risk was returned. Evidence confidence and live observation still matter.</li>') +
        '</ul></article></div></section>' +
        '<section data-si4-panel="evidence" hidden>' + evidenceHtml(evidence) + '</section>' +
        '<section data-si4-panel="position" hidden>' + positionFitHtml(bundle.positionFit) + '</section>' +
        '<section data-si4-panel="timeline" hidden>' + timelineHtml(bundle.timeline) + '</section>' +
        '<section data-si4-panel="actions" hidden><div class="si4-grid two">' +
          '<article class="si4-card"><h3>Recruitment action</h3><p>Record the human decision and why it was made. The model snapshot is stored with it.</p><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-si4-record-decision type="button">Record decision</button><button class="si4-button" data-si4-watch-player type="button">Watch changes</button></div></article>' +
          '<article class="si4-card"><h3>Human evidence</h3><p>Create a live observation or a decision-ready report without losing the current intelligence context.</p><div class="si4-actions" style="margin-top:10px"><button class="si4-button" data-si4-observation type="button">Add observation</button><button class="si4-button" data-si4-report type="button">Create report</button><button class="si4-button" data-si4-shortlist-player type="button">Add to shortlist</button></div></article>' +
        '</div></section>';
      var root = mount(content, shell('Player intelligence', 'A decision-ready summary of fit, evidence, role suitability, risk and next action.',
        '<a class="si4-button" href="/scout/compare-players?playerA=' + encodeURIComponent(player.id) + '">Compare</a><a class="si4-button primary" href="/scout/predictions?player=' + encodeURIComponent(player.id) + '">Run prediction</a>', body));
      bindProfileActions(root, bundle);
    } catch (error) {
      mount(content, shell('Player intelligence', 'The complete player decision record could not be loaded.', '', errorState(error.message)));
    }
  }

  function bindProfileActions(root, bundle) {
    var player = bundle.player;
    root.querySelector('[data-si4-watch-player]')?.addEventListener('click', function () {
      if (isPublicDemo()) return toast('Player watch saved for this demo session.');
      dialog('Watch player changes', '<div class="si4-form-grid"><div class="si4-field full"><label>Reason for watching</label><textarea class="si4-textarea" id="si4WatchReason" placeholder="What change would make this player more relevant?"></textarea></div>' +
        '<div class="si4-field"><label>Overall alert threshold</label><input class="si4-input" id="si4WatchOverall" type="number" min="0" max="100" value="80"></div>' +
        '<div class="si4-field"><label>Evidence alert threshold</label><input class="si4-input" id="si4WatchEvidence" type="number" min="0" max="100" value="70"></div></div>' +
        '<div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-watch type="button">Save watch</button></div>', function (modal, close) {
          modal.querySelector('[data-save-watch]').addEventListener('click', async function () {
            try {
              await request('POST', '/api/scout-intelligence/watches', {
                playerId:player.id,
                reason:modal.querySelector('#si4WatchReason').value,
                thresholds:{
                  minOverall:num(modal.querySelector('#si4WatchOverall').value),
                  minEvidence:num(modal.querySelector('#si4WatchEvidence').value),
                  anyProfileUpdate:true
                }
              });
              close(); toast('Player watch saved.');
            } catch (error) { toast(error.message, 'error'); }
          });
        });
    });

    root.querySelector('[data-si4-record-decision]')?.addEventListener('click', function () {
      openDecisionDialog(player, {});
    });
    root.querySelector('[data-si4-observation]')?.addEventListener('click', function () {
      openObservationDialog(player, null);
    });
    root.querySelector('[data-si4-report]')?.addEventListener('click', function () {
      openReportDialog(player, null);
    });
    root.querySelector('[data-si4-shortlist-player]')?.addEventListener('click', function () {
      openAddToShortlistDialog(player);
    });
  }

  async function openAddToShortlistDialog(player) {
    if (isPublicDemo()) {
      toast('Player added to a demo shortlist for this session.');
      return;
    }
    try {
      var response = await request('GET', '/api/scout-intelligence/shortlists');
      var lists = response.data || [];
      if (!lists.length) {
        toast('Create a shared shortlist from Events or Chat first.', 'error');
        return;
      }
      dialog('Add player to shared shortlist', '<div class="si4-form-grid"><div class="si4-field full"><label>Shortlist</label><select class="si4-select" id="si4ShortlistSelect">' + lists.map(function (list) { return '<option value="' + esc(list.id) + '">' + esc(list.name) + '</option>'; }).join('') + '</select></div><div class="si4-field full"><label>Private shortlist note</label><textarea class="si4-textarea" id="si4ShortlistNote"></textarea></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-confirm-shortlist-player type="button">Add player</button></div>', function (modal, close) {
        modal.querySelector('[data-confirm-shortlist-player]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/shortlists/' + encodeURIComponent(modal.querySelector('#si4ShortlistSelect').value) + '/players', {
              playerId:player.id,
              note:modal.querySelector('#si4ShortlistNote').value
            });
            close();
            toast('Player added to the shared shortlist.');
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function openDecisionDialog(player, context) {
    context = context || {};
    if (isPublicDemo()) {
      toast('Decision recorded for this demo session.');
      return;
    }
    dialog('Record recruitment decision', '<div class="si4-form-grid"><div class="si4-field"><label>Decision</label><select class="si4-select" id="si4Decision"><option>Prioritise</option><option>Shortlist</option><option>Trial before deciding</option><option>Monitor</option><option>Do not progress</option></select></div>' +
      '<div class="si4-field"><label>Reason category</label><select class="si4-select" id="si4Reason"><option value="team_fit">Team fit</option><option value="position_fit">Position fit</option><option value="evidence">Evidence confidence</option><option value="financial">Financial fit</option><option value="risk">Recruitment risk</option></select></div>' +
      '<div class="si4-field full"><label>Rationale</label><textarea class="si4-textarea" id="si4Rationale" placeholder="Explain why this decision was made, including the evidence and trade-offs."></textarea></div>' +
      '<div class="si4-field"><label>Next action</label><input class="si4-input" id="si4NextAction" placeholder="Example: observe next fixture"></div>' +
      '<div class="si4-field"><label>Due date</label><input class="si4-input" id="si4Due" type="date"></div></div>' +
      '<div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-decision type="button">Save decision</button></div>', function (modal, close) {
        modal.querySelector('[data-save-decision]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/decisions', {
              playerId:player.id,
              decision:modal.querySelector('#si4Decision').value,
              reasonCode:modal.querySelector('#si4Reason').value,
              rationale:modal.querySelector('#si4Rationale').value,
              nextAction:modal.querySelector('#si4NextAction').value,
              dueAt:modal.querySelector('#si4Due').value || null,
              comparisonId:context.comparisonId || null,
              pipelineId:context.pipelineId || null,
              context:context
            });
            close(); toast('Recruitment decision saved with the current model snapshot.');
          } catch (error) { toast(error.message, 'error'); }
        });
      });
  }

  function openObservationDialog(player, fixture) {
    if (isPublicDemo()) {
      toast('Observation saved for this demo session.');
      return;
    }
    dialog('Live observation', '<div class="si4-form-grid three"><div class="si4-field"><label>Position observed</label><input class="si4-input" id="si4ObsPosition" value="' + esc(playerPosition(player)) + '"></div>' +
      '<div class="si4-field"><label>First-half rating</label><input class="si4-input" id="si4ObsFirst" type="number" min="0" max="100"></div>' +
      '<div class="si4-field"><label>Second-half rating</label><input class="si4-input" id="si4ObsSecond" type="number" min="0" max="100"></div>' +
      '<div class="si4-field full"><label>Technical observation</label><textarea class="si4-textarea" id="si4ObsTechnical"></textarea></div>' +
      '<div class="si4-field full"><label>Tactical observation</label><textarea class="si4-textarea" id="si4ObsTactical"></textarea></div>' +
      '<div class="si4-field full"><label>Physical and mental observation</label><textarea class="si4-textarea" id="si4ObsPhysical"></textarea></div>' +
      '<div class="si4-field"><label>Recommendation</label><select class="si4-select" id="si4ObsRecommendation"><option>Progress</option><option>Observe again</option><option>Monitor remotely</option><option>Do not progress</option></select></div>' +
      '<div class="si4-field"><label>Follow-up action</label><input class="si4-input" id="si4ObsFollow" placeholder="Example: compare with another target"></div></div>' +
      '<div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-observation type="button">Save observation</button></div>', function (modal, close) {
        modal.querySelector('[data-save-observation]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/observations', {
              playerId:player.id,
              fixtureId:fixture && fixture.id || null,
              positionObserved:modal.querySelector('#si4ObsPosition').value,
              firstHalfRating:num(modal.querySelector('#si4ObsFirst').value) || null,
              secondHalfRating:num(modal.querySelector('#si4ObsSecond').value) || null,
              technicalNotes:modal.querySelector('#si4ObsTechnical').value,
              tacticalNotes:modal.querySelector('#si4ObsTactical').value,
              physicalNotes:modal.querySelector('#si4ObsPhysical').value,
              mentalNotes:modal.querySelector('#si4ObsPhysical').value,
              recommendation:modal.querySelector('#si4ObsRecommendation').value,
              followUpAction:modal.querySelector('#si4ObsFollow').value
            });
            close(); toast('Observation saved and checked against the current model prediction.');
          } catch (error) { toast(error.message, 'error'); }
        });
      });
  }

  function openReportDialog(player, source) {
    if (isPublicDemo()) {
      toast('Demo report created for this browser session.');
      return;
    }
    dialog('Create decision-ready report', '<div class="si4-form-grid"><div class="si4-field"><label>Report type</label><select class="si4-select" id="si4ReportType"><option>Player intelligence report</option><option>Position-fit report</option><option>Scenario-prediction report</option><option>Development report</option><option>ROI report</option><option>Comparison report</option><option>Observation report</option></select></div>' +
      '<div class="si4-field"><label>Report title</label><input class="si4-input" id="si4ReportTitle" value="' + esc(playerName(player) + ' recruitment review') + '"></div>' +
      '<div class="si4-field full"><label>Decision summary</label><textarea class="si4-textarea" id="si4ReportSummary" placeholder="Summarise the verdict, evidence, risk and next action."></textarea></div></div>' +
      '<div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-report type="button">Create report record</button><button class="si4-button" data-export-profile type="button">Generate PDF dossier</button></div>', function (modal, close) {
        modal.querySelector('[data-save-report]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/reports', {
              reportType:modal.querySelector('#si4ReportType').value,
              subjectType:'player',
              subjectId:player.id,
              title:modal.querySelector('#si4ReportTitle').value,
              config:{ summary:modal.querySelector('#si4ReportSummary').value, source:source || {} }
            });
            close(); toast('Report record created.');
          } catch (error) { toast(error.message, 'error'); }
        });
        modal.querySelector('[data-export-profile]').addEventListener('click', async function () {
          try {
            var response = await legacyApi('POST', '/api/exports/player', {
              playerId:player.id, format:'PDF', source:'profile'
            });
            downloadBase64(response.filename, response.mime, response.contentBase64);
            toast('PDF dossier generated.');
          } catch (error) { toast(error.message, 'error'); }
        });
      });
  }

  function downloadBase64(filename, mime, content) {
    var binary = atob(content);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    var blob = new Blob([bytes], { type:mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'scoutlink-report';
    document.body.appendChild(anchor);
    anchor.click(); anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  async function renderSearch(content) {
    var players = await loadPlayers().catch(function () { return []; });
    var body = '<div class="si4-toolbar"><div class="si4-field" style="flex:3 1 340px"><label for="si4NaturalSearch">Describe the player you need</label><input class="si4-input" id="si4NaturalSearch" placeholder="Example: U16 central midfielders near London with high evidence confidence and strong development upside"></div>' +
      '<div class="si4-field"><label for="si4SearchContext">Decision context</label><select class="si4-select" id="si4SearchContext"><option value="immediate_starter">Immediate starter</option><option value="development_prospect">Development prospect</option><option value="tactical_role">Specific tactical role</option><option value="low_financial_risk">Low financial risk</option><option value="resale_upside">Resale upside</option><option value="squad_depth">Squad depth</option></select></div>' +
      '<button class="si4-button primary" type="button" data-si4-run-search>Run intelligent search</button><button class="si4-button" type="button" data-si4-save-search>Save search</button></div>' +
      '<div id="si4SearchChips" class="si4-pill-row" aria-live="polite"></div><div id="si4SearchResults" class="si4-section">' +
      empty('Describe the recruitment need', 'ScoutLink will explain why every result matches the team brief instead of returning an unexplained list.', players.length ? '<button class="si4-button small" data-si4-show-all type="button">Show all loaded players</button>' : '') + '</div>';
    var root = mount(content, shell('Intelligent player search', 'Search by football need, position, age, evidence confidence, value, readiness or development context. Every result includes the reason it matched.',
      '<button class="si4-button" type="button" data-si4-evaluate-alerts>Check alerts</button>', body), { suppressLegacy:true });

    root.querySelector('[data-si4-run-search]').addEventListener('click', function () { runIntelligentSearch(root); });
    root.querySelector('[data-si4-show-all]')?.addEventListener('click', function () { renderSearchResults(root, players.map(function (player) { var bundle = localBundle(player); return { player:player, compatibilityScore:score(bundle.analysis.compatibilityScore), evidence:bundle.evidence, verdict:bundle.verdict, positionFit:bundle.positionFit, reasons:['Loaded from the current ScoutLink player database.'] }; })); });
    root.querySelector('[data-si4-save-search]').addEventListener('click', function () { saveCurrentSearch(root); });
    root.querySelector('[data-si4-evaluate-alerts]').addEventListener('click', async function () {
      if (isPublicDemo()) return toast('No new demo alerts were found.');
      try { var response = await request('POST', '/api/scout-intelligence/alerts/evaluate', {}); toast(response.count ? response.count + ' meaningful alert(s) created.' : 'No meaningful new alerts.'); } catch (error) { toast(error.message, 'error'); }
    });
  }

  async function runIntelligentSearch(root) {
    var query = root.querySelector('#si4NaturalSearch').value.trim();
    var contextKey = root.querySelector('#si4SearchContext').value;
    var results = root.querySelector('#si4SearchResults');
    results.innerHTML = loading('Ranking players against the request and current recruitment brief.');
    try {
      var payload;
      if (isPublicDemo()) {
        var parsed = localParseQuery(query);
        parsed.criteria.contextKey = contextKey;
        var players = await loadPlayers();
        payload = { data:players.filter(function (player) { return localCriteriaMatch(player, parsed.criteria); }).map(function (player) {
          var bundle = localBundle(player);
          return { player:player, compatibilityScore:score(bundle.analysis.compatibilityScore), evidence:bundle.evidence, verdict:bundle.verdict, positionFit:localPositionFit(player, bundle.analysis, parsed.criteria.positions && parsed.criteria.positions[0] || playerPosition(player)), reasons:localMatchReasons(player, bundle, parsed.criteria) };
        }).sort(function (a, b) { return b.compatibilityScore - a.compatibilityScore; }), criteria:parsed.criteria, chips:parsed.chips };
      } else {
        var parsedResponse = await request('POST', '/api/scout-intelligence/search/parse', { query:query });
        parsedResponse.criteria.contextKey = contextKey;
        payload = await request('POST', '/api/scout-intelligence/search/run', { query:query, criteria:parsedResponse.criteria });
        payload.chips = parsedResponse.chips;
      }
      root.querySelector('#si4SearchChips').innerHTML = (payload.chips || Object.keys(payload.criteria || {})).map(function (chip) { return pill(chip); }).join('');
      renderSearchResults(root, payload.data || []);
      root.dataset.lastSearchQuery = query;
      root.dataset.lastSearchCriteria = JSON.stringify(payload.criteria || {});
    } catch (error) {
      results.innerHTML = errorState(error.message);
    }
  }

  function localParseQuery(query) {
    var lower = query.toLowerCase();
    var criteria = {};
    var chips = [];
    var age = query.match(/\bU([6-9]|1[0-8])\b/i);
    if (age) { criteria.ageGroup = 'U' + age[1]; chips.push(criteria.ageGroup); }
    var positions = ['GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B','CAM','LW','RW','CF','ST','SS'].filter(function (position) { return new RegExp('\\b' + position + '\\b', 'i').test(query); });
    if (positions.length) { criteria.positions = positions; chips.push(positions.join(', ')); }
    if (/high confidence|strong evidence/.test(lower)) { criteria.minEvidence = 70; chips.push('High evidence'); }
    if (/development|ceiling|potential/.test(lower)) { criteria.contextKey = 'development_prospect'; chips.push('Development prospect'); }
    if (/starter|ready now|immediate/.test(lower)) { criteria.contextKey = 'immediate_starter'; chips.push('Immediate starter'); }
    return { criteria:criteria, chips:chips };
  }

  function localCriteriaMatch(player, criteria) {
    if (criteria.ageGroup && player.age_group !== criteria.ageGroup) return false;
    if (criteria.positions && criteria.positions.length) {
      var positions = [player.specific_position, player.primary_position].concat(player.positions || []).filter(Boolean).map(function (value) { return String(value).toUpperCase(); });
      if (!criteria.positions.some(function (position) { return positions.includes(position); })) return false;
    }
    if (criteria.minEvidence && localEvidence(player).score < criteria.minEvidence) return false;
    return true;
  }

  function localMatchReasons(player, bundle, criteria) {
    var reasons = [];
    if (criteria.ageGroup) reasons.push('Matches the requested ' + criteria.ageGroup + ' age group.');
    if (criteria.positions && criteria.positions.length) reasons.push('Matches the requested position: ' + playerPosition(player) + '.');
    reasons.push('Compatibility is ' + score(bundle.analysis.compatibilityScore) + '/100.');
    reasons.push('Evidence confidence is ' + bundle.evidence.label + ' at ' + bundle.evidence.score + '/100.');
    return reasons;
  }

  function renderSearchResults(root, rows) {
    var target = root.querySelector('#si4SearchResults');
    if (!rows.length) {
      target.innerHTML = empty('No players match this request', 'Reduce one constraint or save the search and enable alerts for future matches.');
      return;
    }
    target.innerHTML = '<div class="si4-section-head"><div><h3>' + rows.length + ' explained result' + (rows.length === 1 ? '' : 's') + '</h3><p>Ordered by the selected recruitment context and current team fit.</p></div></div><div class="si4-grid two">' + rows.map(function (row) {
      var player = row.player || {};
      return '<article class="si4-card"><div class="si4-player-head"><div class="si4-avatar">' + esc(initials(player)) + '</div><div><h3>' + esc(playerName(player)) + '</h3><p>' + esc(playerLine(player)) + '</p></div><span class="si4-route-badge">' + score(row.compatibilityScore) + '% fit</span></div>' +
        '<div class="si4-pill-row">' + pill((row.verdict && row.verdict.label) || 'Monitor', 'green') + pill('Evidence ' + (row.evidence && row.evidence.label || '—'), row.evidence && row.evidence.score < 50 ? 'gold' : 'blue') + pill((row.positionFit && row.positionFit.verdict) || 'Role not tested', /high-friction/i.test(row.positionFit && row.positionFit.verdict || '') ? 'red' : '') + '</div>' +
        '<ul class="si4-strength-list">' + (row.reasons || []).slice(0, 4).map(function (reason) { return '<li>' + esc(reason) + '</li>'; }).join('') + '</ul>' +
        '<div class="si4-actions" style="margin-top:10px"><a class="si4-button small primary" href="/player/profile?id=' + encodeURIComponent(player.id) + '">Review intelligence</a><a class="si4-button small" href="/scout/compare-players?playerA=' + encodeURIComponent(player.id) + '">Compare</a></div></article>';
    }).join('') + '</div>';
  }

  function saveCurrentSearch(root) {
    var query = root.querySelector('#si4NaturalSearch').value.trim();
    if (!query) return toast('Enter a search request before saving it.', 'error');
    if (isPublicDemo()) return toast('Search saved for this demo session.');
    dialog('Save intelligent search', '<div class="si4-form-grid"><div class="si4-field full"><label>Search name</label><input class="si4-input" id="si4SearchName" value="' + esc(query.slice(0, 80)) + '"></div>' +
      '<label class="si4-checkbox"><input type="checkbox" id="si4SearchAlerts" checked> Alert me when new players match</label></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-confirm-save-search type="button">Save search</button></div>', function (modal, close) {
        modal.querySelector('[data-confirm-save-search]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/saved-searches', {
              name:modal.querySelector('#si4SearchName').value,
              query:query,
              criteria:JSON.parse(root.dataset.lastSearchCriteria || '{}'),
              alertsEnabled:modal.querySelector('#si4SearchAlerts').checked,
              alertRules:{ newMatches:true }
            });
            close(); toast('Search saved with alerts.');
          } catch (error) { toast(error.message, 'error'); }
        });
      });
  }

  async function renderPredictions(content) {
    var players = await loadPlayers();
    var selected = new URLSearchParams(window.location.search).get('player') || (players[0] && players[0].id) || '';
    var body = '<div class="si4-toolbar"><div class="si4-field" style="flex:2 1 300px"><label for="si4PredictionPlayer">Player</label><select class="si4-select" id="si4PredictionPlayer"><option value="">Choose a player</option>' + players.map(function (player) { return playerOption(player); }).join('') + '</select></div>' +
      '<div class="si4-field"><label for="si4PredictionType">Analysis</label><select class="si4-select" id="si4PredictionType"><option value="Position Fit Projection">Position fit</option><option value="Match Scenario Prediction">Match scenario</option><option value="Attribute Development">Development projection</option><option value="ROI Analysis">ROI and value</option></select></div>' +
      '<button class="si4-button primary" type="button" data-si4-run-prediction>Run analysis</button></div>' +
      '<div id="si4PredictionControls"></div><div id="si4PredictionResult" class="si4-section">' +
      empty('Choose the question the scout needs answered', 'The result will explain the verdict, supporting statistics, risk, confidence and recommended action.') + '</div>' +
      '<div id="si4PredictionHistory" class="si4-section"></div>';
    var root = mount(content, shell('Explainable predictions', 'Run position, tactical, development and financial scenarios. Every output shows why the result was reached and what the scout should do next.', '', body), { suppressLegacy:true });
    var select = root.querySelector('#si4PredictionPlayer');
    if (selected) select.value = selected;
    function controls() { renderPredictionControls(root, root.querySelector('#si4PredictionType').value); }
    root.querySelector('#si4PredictionType').addEventListener('change', controls);
    controls();
    root.querySelector('[data-si4-run-prediction]').addEventListener('click', function () { runPrediction(root); });
    loadPredictionHistory(root);
  }

  function renderPredictionControls(root, type) {
    var box = root.querySelector('#si4PredictionControls');
    var html = '';
    if (type === 'Position Fit Projection') {
      html = '<div class="si4-toolbar"><div class="si4-field"><label>Target position</label><select class="si4-select" id="si4TargetPosition">' + ['GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B','CAM','LW','RW','CF','ST','SS'].map(function (value) { return '<option>' + value + '</option>'; }).join('') + '</select></div><div class="si4-callout blue" style="flex:2 1 360px"><b>Question answered:</b> Is the player naturally suited to this role, convertible with a plan or a high-friction conversion?</div></div>';
    } else if (type === 'Match Scenario Prediction') {
      html = '<div class="si4-toolbar"><div class="si4-field" style="flex:2 1 330px"><label>Match scenario</label><select class="si4-select" id="si4Scenario">' + [
        ['protect_lead','Protecting a one-goal lead under pressure'],['chasing_game','Chasing the game with 15 minutes left'],['high_press','High press against a possession team'],['low_block','Breaking down a compact low block'],['wide_duel','Repeated wide 1v1 duels'],['aerial_battle','Direct opponent with heavy aerial pressure'],['counter_attack','Counter-attacking from deep'],['build_back','Building play from the back'],['set_piece_attack','Attacking set pieces late in the game'],['set_piece_defence','Defending set pieces against a taller team'],['fatigue_phase','Managing a high-tempo final 20 minutes'],['physical_midfield','Playing through a physical midfield battle'],['transition_defence','Defending fast transitions'],['creative_10','Operating as the main creative outlet'],['striker_isolated','Playing as an isolated striker']
      ].map(function (row) { return '<option value="' + row[0] + '">' + esc(row[1]) + '</option>'; }).join('') + '</select></div><div class="si4-callout blue" style="flex:2 1 360px"><b>Question answered:</b> Will the player flourish, need tactical protection or create repeated risk in this match situation?</div></div>';
    } else if (type === 'Attribute Development') {
      html = '<div class="si4-toolbar"><div class="si4-field"><label>Development focus</label><select class="si4-select" id="si4DevelopmentFocus"><option>Balanced Growth</option><option>Technical Possession</option><option>Athletic Transition</option><option>Defensive Intelligence</option><option>Final Third Output</option><option>Goalkeeper Command</option></select></div><div class="si4-callout blue" style="flex:2 1 360px"><b>Question answered:</b> Which attributes, overall rating and estimated value may change over five years, including training trade-offs?</div></div>';
    } else {
      html = '<div class="si4-toolbar"><div class="si4-field"><label>Financial goal</label><select class="si4-select" id="si4FinancialGoal"><option>Balanced value growth</option><option>First-team contribution</option><option>Low-cost high ceiling</option></select></div><div class="si4-field"><label>Acquisition cost</label><input class="si4-input" id="si4AcquisitionCost" type="number" min="0" placeholder="Optional"></div><div class="si4-field"><label>Annual development cost</label><input class="si4-input" id="si4DevelopmentCost" type="number" min="0" placeholder="Optional"></div></div>';
    }
    box.innerHTML = html;
  }

  function predictionInput(root, type) {
    if (type === 'Position Fit Projection') return { targetPosition:root.querySelector('#si4TargetPosition').value };
    if (type === 'Match Scenario Prediction') return { scenarioKey:root.querySelector('#si4Scenario').value };
    if (type === 'Attribute Development') return { focus:root.querySelector('#si4DevelopmentFocus').value };
    return {
      financialGoal:root.querySelector('#si4FinancialGoal').value,
      acquisitionCost:num(root.querySelector('#si4AcquisitionCost').value) || undefined,
      annualDevelopmentCost:num(root.querySelector('#si4DevelopmentCost').value) || undefined
    };
  }

  async function runPrediction(root) {
    var playerId = root.querySelector('#si4PredictionPlayer').value;
    var type = root.querySelector('#si4PredictionType').value;
    var resultBox = root.querySelector('#si4PredictionResult');
    if (!playerId) return toast('Choose a player first.', 'error');
    resultBox.innerHTML = loading('Running the selected deterministic analysis.');
    try {
      var response;
      if (isPublicDemo()) response = localPrediction(state.playerById[playerId], type, predictionInput(root, type));
      else response = await legacyApi('POST', '/api/predictions/run', { playerId:playerId, predictionType:type, inputParams:predictionInput(root, type) });
      state.activePrediction = { response:response, player:state.playerById[playerId], type:type };
      resultBox.innerHTML = predictionResultHtml(response.result || response, state.playerById[playerId]);
      bindPredictionResultActions(resultBox, response, state.playerById[playerId]);
      loadPredictionHistory(root);
    } catch (error) {
      resultBox.innerHTML = errorState(error.message);
    }
  }

  function localPrediction(player, type, input) {
    var bundle = localBundle(player);
    var overall = score(player.overall_rating);
    if (type === 'Position Fit Projection') {
      var fit = localPositionFit(player, bundle.analysis, input.targetPosition);
      return { result:Object.assign({ type:type, confidence:{score:bundle.evidence.score,label:bundle.evidence.label,note:bundle.evidence.note}, paragraphs:[fit.verdict + ' for ' + playerName(player) + ' at ' + fit.targetPosition + '.', fit.recommendation], summary:fit.verdict + ' at ' + fit.targetScore + '/100.', topRoles:fit.alternatives, conversionCandidates:fit.alternatives, disclaimer:'Demo decision-support output, not a guarantee.' }, fit), creditsRemaining:56 };
    }
    if (type === 'Match Scenario Prediction') {
      var relevant = ['pace','stamina','positioning','composure','tackling'].map(function (key) { return { attribute:key, score:score(player[key], overall) }; });
      var scenarioScore = Math.round(relevant.reduce(function (sum, row) { return sum + row.score; }, 0) / relevant.length);
      var rec = scenarioScore >= 78 ? 'Flourish' : scenarioScore >= 62 ? 'Usable with support' : 'Avoid as a repeated tactical demand';
      return { result:{ type:type, scenario:input.scenarioKey, scenarioScore:scenarioScore, rawScenarioFit:scenarioScore, risk:scenarioScore >= 75 ? 'Low' : scenarioScore >= 58 ? 'Medium' : 'High', recommendation:rec, confidence:{score:bundle.evidence.score,label:bundle.evidence.label,note:bundle.evidence.note}, evidence:relevant, tacticalNote:rec === 'Flourish' ? 'This profile fits the scenario well enough to trigger a positive live-scouting test.' : 'Protect the player from repeated exposure until the weaker actions improve.', paragraphs:[playerName(player) + ' is predicted to be ' + rec.toLowerCase() + ' in this demo scenario.'], summary:rec + ' with a scenario score of ' + scenarioScore + '/100.', disclaimer:'Demo decision-support output, not a guarantee.' }, creditsRemaining:56 };
    }
    if (type === 'Attribute Development') {
      var seasons = [1,2,3,4,5].map(function (year) { return { year:year, overall:Math.min(95, overall + year * 2), transferValue:num(player.transfer_value) * (1 + year * .12), transferValueFormatted:money(num(player.transfer_value) * (1 + year * .12)), rankingImpact:year >= 4 ? 'Strong regional academy range' : 'Developing grassroots range', attributes:{} }; });
      return { result:{ type:type, focus:input.focus, currentOverall:overall, currentTransferValue:{value:num(player.transfer_value),formatted:money(player.transfer_value)}, confidence:{score:bundle.evidence.score,label:bundle.evidence.label,note:bundle.evidence.note}, seasons:seasons, attributeEffects:[], tradeOffs:[], paragraphs:['The demo projection applies ' + input.focus + ' to the current player profile.', 'The projection remains dependent on development minutes, coaching quality and new match evidence.'], summary:'Five-year ' + input.focus + ' development projection.', disclaimer:'Demo decision-support output, not a guarantee.' }, creditsRemaining:56 };
    }
    var current = num(player.transfer_value);
    var projection = [1,2,3,4,5].map(function (year) { var value = current * (1 + .14 * year); var cost = current * .18 + 2500 * year + 750; return { horizon:'Year ' + year, year:year, projectedValue:value, projectedValueFormatted:money(value), totalCost:cost, totalCostFormatted:money(cost), roiPercent:Math.round((value - cost) / Math.max(1, cost) * 100) }; });
    return { result:{ type:type, financialGoal:input.financialGoal, currentTransferValue:{value:current,formatted:money(current)}, assumptions:{acquisitionCost:input.acquisitionCost || Math.round(current * .18), annualDevelopmentCost:input.annualDevelopmentCost || 2500, scoutingCost:750}, projection:projection, suitability:projection[4].roiPercent >= 80 ? 'Strong financial fit' : 'Monitor and negotiate carefully', confidence:{score:bundle.evidence.score,label:bundle.evidence.label,note:bundle.evidence.note}, recommendation:'Use the output to set a maximum entry cost and protect the downside case.', paragraphs:['This demo case projects value against acquisition, scouting and development costs.'], summary:'Demo financial-fit projection.', disclaimer:'Demo decision-support output, not a guarantee.' }, creditsRemaining:56 };
  }

  function predictionResultHtml(result, player) {
    result = result || {};
    var summary = result.summary || (result.paragraphs || [])[0] || 'Prediction completed.';
    var confidence = result.confidence || {};
    var body = '<div class="si4-verdict"><div class="si4-verdict-mark"><small>' + esc(result.type || 'Prediction') + '</small><strong>' + esc(result.targetVerdict || result.recommendation || result.suitability || 'Completed') + '</strong><span>' + esc(summary) + '</span></div>' +
      '<div class="si4-verdict-copy"><div class="si4-player-head"><div class="si4-avatar">' + esc(initials(player)) + '</div><div><h3>' + esc(playerName(player)) + '</h3><p>' + esc(playerLine(player)) + '</p></div></div>' +
      '<p style="margin-top:10px">' + esc((result.paragraphs || [summary])[0]) + '</p><div class="si4-pill-row">' + pill('Confidence ' + (confidence.label || 'Not assessed'), score(confidence.score) < 50 ? 'gold' : 'green') +
      (result.scenarioScore != null ? pill('Scenario ' + result.scenarioScore + '/100', 'blue') : '') +
      (result.targetScore != null ? pill('Target role ' + result.targetScore + '/100', 'blue') : '') +
      (result.creditsRemaining != null ? pill(result.creditsRemaining + ' credits left') : '') + '</div></div></div>';

    if (result.type === 'Position Fit Projection') body += positionFitHtml(result);
    else if (result.type === 'Match Scenario Prediction') body += scenarioResultHtml(result);
    else if (result.type === 'Attribute Development') body += developmentResultHtml(result);
    else if (result.type === 'ROI Analysis') body += roiResultHtml(result);
    else body += '<div class="si4-callout blue" style="margin-top:10px">' + esc(result.message || summary) + '</div>';

    body += '<div class="si4-actions" style="margin-top:12px"><button class="si4-button primary" data-si4-export-prediction type="button">Export prediction</button><button class="si4-button" data-si4-record-prediction-decision type="button">Record decision</button></div>' +
      '<div class="si4-callout" style="margin-top:10px"><b>Decision-support notice:</b> ' + esc(result.disclaimer || 'This output supports scouting judgement and is not a guarantee of future performance.') + '</div>';
    return body;
  }

  function scenarioResultHtml(result) {
    var evidence = result.evidence || [];
    return '<div class="si4-grid four si4-section">' +
      metric('Scenario score', (result.scenarioScore || '—') + '/100', result.scenario || '') +
      metric('Risk', result.risk || '—', 'Risk of repeated exposure', result.risk === 'High' ? 'red' : '') +
      metric('Recommendation', result.recommendation || '—', result.tacticalNote || '') +
      metric('Raw role fit', (result.rawScenarioFit || '—') + '/100', 'Before evidence-confidence adjustment') +
      '</div><div class="si4-grid two si4-section"><article class="si4-card"><h3>Statistics supporting the result</h3><div class="si4-progress-list" style="margin-top:9px">' + evidence.map(function (item, index) { return progressRow(String(item.attribute || '').replace(/_/g, ' '), item.score, index % 3 === 1 ? 'blue' : ''); }).join('') + '</div></article>' +
      '<article class="si4-card ' + (result.risk === 'High' ? 'red' : 'green') + '"><h3>Tactical action</h3><p>' + esc(result.predictedBehaviour || '') + '</p><div class="si4-callout ' + (result.risk === 'High' ? 'red' : '') + '" style="margin-top:9px"><b>Selection guidance:</b> ' + esc(result.tacticalNote || '') + '</div></article></div>';
  }

  function developmentResultHtml(result) {
    var seasons = result.seasons || [];
    return '<div class="si4-section"><div class="si4-section-head"><div><h3>Five-year projection</h3><p>Overall, estimated value and ranking range by year.</p></div></div><div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Year</th><th>Overall</th><th>Projected value</th><th>Ranking impact</th></tr></thead><tbody>' + seasons.map(function (season) { return '<tr><td><b>Year ' + esc(season.year) + '</b></td><td>' + esc(season.overall) + '/100</td><td>' + esc(season.transferValueFormatted || money(season.transferValue)) + '</td><td>' + esc(season.rankingImpact || '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="si4-grid two si4-section"><article class="si4-card green"><h3>Development gains</h3><ul class="si4-strength-list">' + ((result.attributeEffects || []).filter(function (item) { return num(item.deltaFiveYear) > 0; }).slice(0, 6).map(function (item) { return '<li>' + esc(item.attribute) + ' +' + esc(item.deltaFiveYear) + ' over five years. ' + esc(item.reason || '') + '</li>'; }).join('') || '<li>The yearly overall and value projection is shown above.</li>') + '</ul></article>' +
      '<article class="si4-card red"><h3>Training trade-offs</h3><ul class="si4-risk-list">' + ((result.tradeOffs || []).map(function (item) { return '<li>' + esc(item.attribute) + ': ' + esc(item.reason || 'May receive less development attention.') + '</li>'; }).join('') || '<li>No negative attribute trade-off was returned for this plan.</li>') + '</ul></article></div>';
  }

  function roiResultHtml(result) {
    var projection = result.projection || [];
    var assumptions = result.assumptions || {};
    return '<div class="si4-grid four si4-section">' +
      metric('Current value', result.currentTransferValue && (result.currentTransferValue.formatted || money(result.currentTransferValue.value)) || '—', 'Starting model estimate') +
      metric('Acquisition cost', assumptions.acquisitionCostFormatted || money(assumptions.acquisitionCost), 'Editable model assumption') +
      metric('Annual development', assumptions.annualDevelopmentCostFormatted || money(assumptions.annualDevelopmentCost), 'Editable model assumption') +
      metric('Financial verdict', result.suitability || '—', result.recommendation || '', /high-risk/i.test(result.suitability || '') ? 'red' : 'green') +
      '</div><div class="si4-section"><div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Horizon</th><th>Projected value</th><th>Total modelled cost</th><th>ROI</th></tr></thead><tbody>' + projection.map(function (row) { return '<tr><td><b>' + esc(row.horizon) + '</b></td><td>' + esc(row.projectedValueFormatted || money(row.projectedValue)) + '</td><td>' + esc(row.totalCostFormatted || money(row.totalCost)) + '</td><td><b>' + esc(row.roiPercent) + '%</b></td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="si4-callout gold" style="margin-top:10px"><b>Recruitment action:</b> ' + esc(result.recommendation || 'Set a maximum entry price and review the downside case.') + '</div>';
  }

  function bindPredictionResultActions(box, response, player) {
    box.querySelector('[data-si4-export-prediction]')?.addEventListener('click', async function () {
      if (isPublicDemo()) return toast('Demo prediction export created for this session.');
      try {
        var result = await legacyApi('POST', '/api/exports/player', {
          playerId:player.id, format:'PDF', source:'prediction', predictionLogId:response.logId || null
        });
        downloadBase64(result.filename, result.mime, result.contentBase64);
      } catch (error) { toast(error.message, 'error'); }
    });
    box.querySelector('[data-si4-record-prediction-decision]')?.addEventListener('click', function () {
      openDecisionDialog(player, { predictionLogId:response.logId || null, predictionType:response.result && response.result.type });
    });
  }

  async function loadPredictionHistory(root) {
    var box = root.querySelector('#si4PredictionHistory');
    if (!box) return;
    try {
      var response;
      if (isPublicDemo()) response = { data:state.activePrediction ? [{ id:'demo-log', player_id:state.activePrediction.player.id, prediction_type:state.activePrediction.type, result:state.activePrediction.response.result, run_at:new Date().toISOString(), players:state.activePrediction.player }] : [], remaining:56, planLimit:60 };
      else response = await legacyApi('GET', '/api/predictions');
      var rows = response.data || [];
      box.innerHTML = '<div class="si4-section-head"><div><h3>Prediction history</h3><p>' + num(response.remaining) + ' of ' + num(response.planLimit) + ' credits remain.</p></div></div>' +
        (rows.length ? '<div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Player</th><th>Analysis</th><th>Result</th><th>Run</th><th></th></tr></thead><tbody>' + rows.slice(0, 50).map(function (row) { var p = row.players || state.playerById[row.player_id] || {}; return '<tr><td><b>' + esc(playerName(p)) + '</b><br>' + esc(playerLine(p)) + '</td><td>' + esc(row.prediction_type) + '</td><td>' + esc(row.result && (row.result.summary || row.result.recommendation || row.result.targetVerdict) || 'Completed') + '</td><td>' + esc(dateText(row.run_at)) + '</td><td><a class="si4-button small" href="/player/profile?id=' + encodeURIComponent(row.player_id) + '">Player</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('No predictions yet', 'Run an analysis above to create the first explained prediction.'));
    } catch (error) {
      box.innerHTML = '<div class="si4-callout gold">Prediction history could not be loaded: ' + esc(error.message) + '</div>';
    }
  }

  async function renderCompare(content) {
    var players = await loadPlayers();
    var params = new URLSearchParams(window.location.search);
    var a = params.get('playerA') || players[0] && players[0].id || '';
    var b = params.get('playerB') || players[1] && players[1].id || '';
    var body = '<div class="si4-toolbar"><div class="si4-field" style="flex:2 1 260px"><label>Player A</label><select class="si4-select" id="si4CompareA"><option value="">Choose player</option>' + players.map(function (p) { return playerOption(p); }).join('') + '</select></div>' +
      '<div class="si4-field" style="flex:2 1 260px"><label>Player B</label><select class="si4-select" id="si4CompareB"><option value="">Choose player</option>' + players.map(function (p) { return playerOption(p); }).join('') + '</select></div>' +
      '<div class="si4-field"><label>Decision context</label><select class="si4-select" id="si4CompareContext"><option value="immediate_starter">Immediate starter</option><option value="development_prospect">Development prospect</option><option value="tactical_role">Specific tactical role</option><option value="low_financial_risk">Low financial risk</option><option value="resale_upside">Resale upside</option><option value="squad_depth">Squad depth</option></select></div>' +
      '<div class="si4-field"><label>Target position</label><select class="si4-select" id="si4ComparePosition"><option value="">Current roles</option>' + ['GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B','CAM','LW','RW','CF','ST','SS'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select></div>' +
      '<div class="si4-field"><label>Budget</label><input class="si4-input" id="si4CompareBudget" type="number" min="0" placeholder="Optional"></div>' +
      '<button class="si4-button primary" type="button" data-si4-compare>Compare and explain</button></div><div id="si4CompareResult">' + empty('Choose two players and a decision context', 'ScoutLink will identify the best immediate, tactical, development or value option and explain every material trade-off.') + '</div>';
    var root = mount(content, shell('Comparison decision engine', 'Compare players in the context of the actual recruitment question, not just a generic side-by-side table.', '', body), { suppressLegacy:true });
    root.querySelector('#si4CompareA').value = a;
    root.querySelector('#si4CompareB').value = b;
    root.querySelector('[data-si4-compare]').addEventListener('click', function () { runComparison(root); });
  }

  async function runComparison(root) {
    var playerAId = root.querySelector('#si4CompareA').value;
    var playerBId = root.querySelector('#si4CompareB').value;
    var contextKey = root.querySelector('#si4CompareContext').value;
    var targetPosition = root.querySelector('#si4ComparePosition').value || null;
    var budget = num(root.querySelector('#si4CompareBudget').value) || null;
    var box = root.querySelector('#si4CompareResult');
    if (!playerAId || !playerBId || playerAId === playerBId) return toast('Choose two different players.', 'error');
    box.innerHTML = loading('Calculating the context-specific recommendation and trade-offs.');
    try {
      var response;
      if (isPublicDemo()) response = { result:localComparison(state.playerById[playerAId], state.playerById[playerBId], contextKey, targetPosition, budget) };
      else response = await request('POST', '/api/scout-intelligence/compare', { playerAId:playerAId, playerBId:playerBId, contextKey:contextKey, targetPosition:targetPosition, budget:budget, save:true });
      state.activeComparison = response;
      box.innerHTML = comparisonHtml(response.result, response.comparison);
      bindComparisonActions(box, response);
    } catch (error) { box.innerHTML = errorState(error.message); }
  }

  function localComparison(a, b, contextKey, targetPosition, budget) {
    var bundleA = localBundle(a), bundleB = localBundle(b);
    function scores(bundle) {
      var analysis = bundle.analysis, overall = analysis.overallBreakdown || {}, comp = analysis.compatibility || {};
      return {
        technical:score(overall.technicalScore || bundle.player.passing),
        tactical:Math.round((score(comp.needFit) + score(comp.roleFit) + score(comp.tacticalStyleFit)) / 3),
        physical:score(overall.physicalProfileScore || bundle.player.strength),
        mental:score(overall.mentalCoachabilityScore || bundle.player.composure),
        matchOutput:score(overall.matchOutputScore || bundle.player.overall_rating),
        positionFit:localPositionFit(bundle.player, analysis, targetPosition || playerPosition(bundle.player)).targetScore,
        teamFit:score(analysis.compatibilityScore),
        development:score(overall.potentialRating || bundle.player.overall_rating),
        readiness:score(overall.currentReadiness || bundle.player.overall_rating),
        evidence:bundle.evidence.score,
        financial:Math.round(score(analysis.compatibilityScore) * .7 + (budget ? clamp(100 - Math.max(0, num(bundle.player.transfer_value) - budget) / Math.max(1, budget) * 100) : 70) * .3),
        risk:Math.round(bundle.evidence.score * .6 + score(analysis.compatibilityScore) * .4)
      };
    }
    var scoresA = scores(bundleA), scoresB = scores(bundleB);
    var weights = { immediate_starter:{readiness:.3,teamFit:.25,evidence:.15,tactical:.15,positionFit:.15}, development_prospect:{development:.35,evidence:.15,technical:.2,physical:.15,financial:.15}, tactical_role:{tactical:.35,positionFit:.3,teamFit:.2,evidence:.15}, low_financial_risk:{financial:.4,evidence:.25,readiness:.2,teamFit:.15}, resale_upside:{development:.35,financial:.35,technical:.15,evidence:.15}, squad_depth:{teamFit:.3,positionFit:.25,readiness:.25,financial:.2} }[contextKey] || {readiness:.3,teamFit:.25,evidence:.15,tactical:.15,positionFit:.15};
    function total(s) { return Object.keys(weights).reduce(function (sum, key) { return sum + score(s[key]) * weights[key]; }, 0); }
    var totalA = Math.round(total(scoresA) * 10) / 10, totalB = Math.round(total(scoresB) * 10) / 10;
    var winner = totalA >= totalB ? 'a' : 'b';
    var winnerPlayer = winner === 'a' ? a : b, loser = winner === 'a' ? b : a;
    var categories = Object.keys(scoresA).map(function (key) { return { key:key, playerA:scoresA[key], playerB:scoresB[key], winner:scoresA[key] === scoresB[key] ? 'tie' : scoresA[key] > scoresB[key] ? 'a' : 'b', margin:Math.abs(scoresA[key] - scoresB[key]) }; });
    return {
      context:{contextKey:contextKey,label:contextKey.replace(/_/g, ' '),targetPosition:targetPosition,budget:budget},
      playerA:{player:a,verdict:bundleA.verdict,evidence:bundleA.evidence,positionFit:localPositionFit(a,bundleA.analysis,targetPosition || playerPosition(a)),scores:scoresA,totalScore:totalA},
      playerB:{player:b,verdict:bundleB.verdict,evidence:bundleB.evidence,positionFit:localPositionFit(b,bundleB.analysis,targetPosition || playerPosition(b)),scores:scoresB,totalScore:totalB},
      winner:winner,winnerPlayerId:winnerPlayer.id,
      recommendation:playerName(winnerPlayer) + ' is the stronger option for this demo context because the weighted fit, readiness and evidence score is higher.',
      tradeOff:playerName(winnerPlayer) + ' is the safer current decision, while ' + playerName(loser) + ' may retain an advantage in individual categories shown below.',
      categories:categories,
      sensitivity:['The recommendation can change when the target position, budget or evidence confidence changes.'],
      nextActions:['Confirm the leading player through live observation.','Record the decision rationale before progressing.']
    };
  }

  function categoryLabel(key) {
    return ({technical:'Technical',tactical:'Tactical suitability',physical:'Physical profile',mental:'Mental and composure',matchOutput:'Match output',positionFit:'Position fit',teamFit:'Team-brief fit',development:'Development ceiling',readiness:'Immediate readiness',evidence:'Evidence confidence',financial:'Financial value',risk:'Recruitment confidence'})[key] || key;
  }

  function comparisonHtml(result, saved) {
    var a = result.playerA, b = result.playerB;
    var winner = result.winner === 'a' ? a : b;
    return '<div class="si4-verdict"><div class="si4-verdict-mark"><small>' + esc(result.context && result.context.label || 'Comparison') + '</small><strong>' + esc(playerName(winner.player)) + '</strong><span>' + esc(result.recommendation) + '</span></div>' +
      '<div class="si4-verdict-copy"><h3>Why this player leads</h3><p>' + esc(result.recommendation) + '</p><div class="si4-callout blue" style="margin-top:9px"><b>Trade-off:</b> ' + esc(result.tradeOff) + '</div></div></div>' +
      '<div class="si4-compare-head si4-section"><article class="si4-card"><div class="si4-player-head"><div class="si4-avatar">' + esc(initials(a.player)) + '</div><div><h3>' + esc(playerName(a.player)) + '</h3><p>' + esc(playerLine(a.player)) + '</p></div></div><div class="si4-pill-row">' + pill(a.totalScore + '/100 decision score', result.winner === 'a' ? 'green' : '') + pill('Evidence ' + a.evidence.label, a.evidence.score < 50 ? 'gold' : 'blue') + '</div></article>' +
      '<div class="si4-compare-score"><strong>' + esc(Math.abs(num(a.totalScore) - num(b.totalScore)).toFixed(1)) + '</strong><span>decision-score margin</span></div>' +
      '<article class="si4-card"><div class="si4-player-head"><div class="si4-avatar">' + esc(initials(b.player)) + '</div><div><h3>' + esc(playerName(b.player)) + '</h3><p>' + esc(playerLine(b.player)) + '</p></div></div><div class="si4-pill-row">' + pill(b.totalScore + '/100 decision score', result.winner === 'b' ? 'green' : '') + pill('Evidence ' + b.evidence.label, b.evidence.score < 50 ? 'gold' : 'blue') + '</div></article></div>' +
      '<div class="si4-section"><div class="si4-section-head"><div><h3>Category-by-category explanation</h3><p>Each margin shows who leads and why the difference matters in the selected context.</p></div></div><div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Category</th><th>' + esc(playerName(a.player)) + '</th><th>' + esc(playerName(b.player)) + '</th><th>Winner</th><th>Margin</th></tr></thead><tbody>' + (result.categories || []).map(function (row) { var winnerName = row.winner === 'a' ? playerName(a.player) : row.winner === 'b' ? playerName(b.player) : 'Tie'; return '<tr><td><b>' + esc(categoryLabel(row.key)) + '</b></td><td>' + esc(row.playerA) + '</td><td>' + esc(row.playerB) + '</td><td>' + esc(winnerName) + '</td><td>' + esc(row.margin) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="si4-grid two si4-section"><article class="si4-card gold"><h3>What could change the recommendation</h3><ul class="si4-risk-list">' + (result.sensitivity || []).map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul></article><article class="si4-card green"><h3>Recommended next actions</h3><ul class="si4-strength-list">' + (result.nextActions || []).map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul></article></div>' +
      '<div class="si4-actions" style="margin-top:12px"><button class="si4-button primary" data-si4-add-winner type="button">Add recommended player</button><button class="si4-button" data-si4-save-comparison type="button">' + (saved ? 'Comparison saved' : 'Save comparison') + '</button><button class="si4-button" data-si4-comparison-decision type="button">Record decision</button><button class="si4-button" data-si4-comparison-report type="button">Create report</button></div>';
  }

  function bindComparisonActions(box, response) {
    var result = response.result;
    var winner = result.winner === 'a' ? result.playerA : result.playerB;
    box.querySelector('[data-si4-add-winner]')?.addEventListener('click', async function () {
      try {
        await legacyApi('POST', '/api/players/' + encodeURIComponent(winner.player.id) + '/scout-interest', { interestLevel:8, notes:'Added from ScoutLink context-aware comparison.' });
        toast('Recommended player added to the recruitment pipeline.');
      } catch (error) { toast(error.message, 'error'); }
    });
    box.querySelector('[data-si4-save-comparison]')?.addEventListener('click', function () {
      if (response.comparison) return toast('Comparison is already saved.');
      toast('Run the comparison again to save it with the current context.');
    });
    box.querySelector('[data-si4-comparison-decision]')?.addEventListener('click', function () {
      openDecisionDialog(winner.player, { comparisonId:response.comparison && response.comparison.id || null, comparisonContext:result.context });
    });
    box.querySelector('[data-si4-comparison-report]')?.addEventListener('click', function () {
      openReportDialog(winner.player, { comparisonId:response.comparison && response.comparison.id || null, result:result });
    });
  }

  async function renderPipeline(content) {
    var body = '<div id="si4PipelineBody">' + loading('Loading pipeline decisions, tasks and next actions.') + '</div>';
    var root = mount(content, shell('Recruitment pipeline decisions', 'Move players through stages with a visible reason, owner, deadline, evidence confidence and next action.', '<a class="si4-button primary" href="/scout/player-search">Find players</a>', body));
    try {
      var response = await legacyApi('GET', '/api/scouts/pipeline');
      var rows = response.data || response.pipeline || [];
      var tasks = isPublicDemo() ? {data:[]} : await request('GET', '/api/scout-intelligence/tasks');
      root.querySelector('#si4PipelineBody').innerHTML = '<div class="si4-kpi-strip">' +
        metric('Active prospects', rows.length, 'Across the recruitment workflow', 'green') +
        metric('Open tasks', (tasks.data || []).filter(function (task) { return task.status !== 'completed'; }).length, 'Actions that still need an owner') +
        metric('Capacity remaining', response.interestsRemaining == null ? '—' : response.interestsRemaining, response.planLimit ? 'of ' + response.planLimit : 'Plan managed') +
        metric('Decision discipline', rows.filter(function (row) { return row.next_action || row.decision_reason; }).length + '/' + rows.length, 'Prospects with a recorded next action') + '</div>' +
        (rows.length ? '<div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Player</th><th>Stage</th><th>Evidence</th><th>Decision status</th><th>Next action</th><th>Due</th><th></th></tr></thead><tbody>' + rows.map(function (row) { var player = row.player || row.players || {}; return '<tr><td><b>' + esc(playerName(player)) + '</b><br>' + esc(playerLine(player)) + '</td><td>' + esc(row.stage || 'watching') + '</td><td>' + esc(row.evidence_confidence || 'Review') + '</td><td>' + esc(row.decision_reason || 'Not recorded') + '</td><td>' + esc(row.next_action || 'Set next action') + '</td><td>' + esc(row.next_action_due_at ? dateText(row.next_action_due_at) : '—') + '</td><td><button class="si4-button small" type="button" data-si4-pipeline-row="' + esc(row.id) + '">Manage</button></td></tr>'; }).join('') + '</tbody></table></div>' : empty('No players in the pipeline', 'Add a player from search, rankings, comparison or a player profile.'));
      root.querySelectorAll('[data-si4-pipeline-row]').forEach(function (button) {
        button.addEventListener('click', function () {
          var row = rows.find(function (item) { return String(item.id) === String(button.dataset.si4PipelineRow); });
          openPipelineDialog(row);
        });
      });
    } catch (error) { root.querySelector('#si4PipelineBody').innerHTML = errorState(error.message); }
  }

  function openPipelineDialog(row) {
    var player = row.player || row.players || {};
    if (isPublicDemo()) return toast('Pipeline action saved for this demo session.');
    dialog('Manage pipeline decision', '<div class="si4-player-head"><div class="si4-avatar">' + esc(initials(player)) + '</div><div><h3>' + esc(playerName(player)) + '</h3><p>' + esc(playerLine(player)) + '</p></div></div>' +
      '<div class="si4-form-grid" style="margin-top:12px"><div class="si4-field"><label>Stage</label><select class="si4-select" id="si4PipelineStage"><option>watching</option><option>shortlisted</option><option>approached</option><option>negotiating</option><option>trial</option><option>rejected</option><option>signed</option></select></div>' +
      '<div class="si4-field"><label>Decision status</label><select class="si4-select" id="si4PipelineDecision"><option>Pending evidence</option><option>Needs live observation</option><option>Ready for team review</option><option>Approved to progress</option><option>Do not progress</option></select></div>' +
      '<div class="si4-field full"><label>Next action</label><input class="si4-input" id="si4PipelineNext" value="' + esc(row.next_action || '') + '"></div>' +
      '<div class="si4-field"><label>Decision deadline</label><input class="si4-input" type="date" id="si4PipelineDue"></div><div class="si4-field"><label>Assigned scout</label><input class="si4-input" id="si4PipelineAssignee" placeholder="Optional user ID or leave blank"></div>' +
      '<div class="si4-field full"><label>Decision rationale</label><textarea class="si4-textarea" id="si4PipelineRationale">' + esc(row.decision_rationale || '') + '</textarea></div></div>' +
      '<div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-pipeline type="button">Save pipeline decision</button><button class="si4-button" data-create-pipeline-task type="button">Create task</button></div>', function (modal, close) {
        modal.querySelector('#si4PipelineStage').value = row.stage || 'watching';
        modal.querySelector('[data-save-pipeline]').addEventListener('click', async function () {
          try {
            await request('PATCH', '/api/scout-intelligence/pipeline/' + encodeURIComponent(row.id), {
              stage:modal.querySelector('#si4PipelineStage').value,
              decisionReason:modal.querySelector('#si4PipelineDecision').value,
              nextAction:modal.querySelector('#si4PipelineNext').value,
              nextActionDueAt:modal.querySelector('#si4PipelineDue').value || null,
              assignedScoutId:modal.querySelector('#si4PipelineAssignee').value || null,
              decisionRationale:modal.querySelector('#si4PipelineRationale').value
            });
            close(); toast('Pipeline decision saved.'); initRoute();
          } catch (error) { toast(error.message, 'error'); }
        });
        modal.querySelector('[data-create-pipeline-task]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/tasks', {
              playerId:player.id, pipelineId:row.id, title:modal.querySelector('#si4PipelineNext').value || 'Review ' + playerName(player), taskType:'pipeline_action', priority:'normal', dueAt:modal.querySelector('#si4PipelineDue').value || null
            });
            toast('Pipeline task created.');
          } catch (error) { toast(error.message, 'error'); }
        });
      });
  }

  async function renderRankings(content) {
    var body = '<div class="si4-toolbar"><div class="si4-field"><label>Ranking context</label><select class="si4-select" id="si4RankingContext"><option value="team_fit">Team fit</option><option value="readiness">Current readiness</option><option value="development">Development potential</option><option value="evidence">Evidence confidence</option><option value="value">Financial value</option></select></div><div class="si4-field"><label>Position</label><select class="si4-select" id="si4RankingPosition"><option value="">All positions</option>' + ['GK','CB','RB','LB','CDM','CM','CAM','LW','RW','ST'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select></div><button class="si4-button primary" data-si4-rank type="button">Explain rankings</button></div><div id="si4RankingBody">' + loading('Loading explainable rankings.') + '</div>';
    var root = mount(content, shell('Explainable player rankings', 'Rankings are discovery aids. Each row explains why the player is placed there, how strong the evidence is and what prevents a higher position.', '', body), { suppressLegacy:true });
    root.querySelector('[data-si4-rank]').addEventListener('click', function () { loadRankings(root); });
    loadRankings(root);
  }

  async function loadRankings(root) {
    var box = root.querySelector('#si4RankingBody');
    box.innerHTML = loading('Ranking players with evidence confidence and team context.');
    try {
      var context = root.querySelector('#si4RankingContext').value;
      var position = root.querySelector('#si4RankingPosition').value;
      var response;
      if (isPublicDemo()) {
        var players = await loadPlayers();
        response = { data:players.map(function (player) { var bundle = localBundle(player); var rankingScore = context === 'evidence' ? bundle.evidence.score : context === 'development' ? score(bundle.verdict.potential) : context === 'readiness' ? score(bundle.verdict.readiness) : score(bundle.analysis.compatibilityScore); return { player:player, rankScore:rankingScore, evidence:bundle.evidence, reason:'Ranked by ' + context.replace(/_/g, ' ') + ' with current demo evidence.', blockers:bundle.evidence.missing }; }).filter(function (row) { return !position || playerPosition(row.player) === position; }).sort(function (a, b) { return b.rankScore - a.rankScore; }) };
      } else {
        response = await request('GET', '/api/scout-intelligence/rankings?type=' + encodeURIComponent(context) + '&position=' + encodeURIComponent(position));
      }
      var rows = response.data || [];
      box.innerHTML = rows.length ? '<div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Rank</th><th>Player</th><th>Ranking score</th><th>Why ranked here</th><th>Evidence</th><th>What blocks a higher rank</th></tr></thead><tbody>' + rows.map(function (row, index) { var player = row.player || {}; return '<tr><td><b>#' + (index + 1) + '</b></td><td><b>' + esc(playerName(player)) + '</b><br>' + esc(playerLine(player)) + '</td><td><b>' + esc(row.rankingScore || row.rankScore || row.score || '—') + '/100</b></td><td>' + esc((row.rankingReasons || row.reasons || []).join(' · ') || row.reason || row.explanation || 'Ranked against the selected context.') + '</td><td>' + esc(row.evidence && (row.evidence.label + ' ' + row.evidence.score + '/100') || '—') + '</td><td>' + esc((row.blockers || row.missing || (row.evidence && row.evidence.missing) || []).join(' · ') || 'No material blocker returned') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('No ranking results', 'Change the ranking context or position filter.');
    } catch (error) { box.innerHTML = errorState(error.message); }
  }

  async function renderFixtures(content) {
    var body = '<div id="si4FixtureBody">' + loading('Prioritising fixtures for live scouting.') + '</div>';
    var root = mount(content, shell('Fixture and observation planning', 'Prioritise the matches most likely to change a recruitment decision, assign an owner and capture the observation objective before attending.', '', body));
    try {
      var response;
      if (isPublicDemo()) {
        var demo = typeof window.getDemoState === 'function' ? window.getDemoState() : {fixtures:[]};
        response = { data:(demo.fixtures || []).map(function (fixture, index) { return { fixture:fixture, priorityScore:88 - index * 8, reason:'Contains a monitored demo player and an unresolved recruitment decision.', players:(awaitPlayersSync()).slice(index, index + 1) }; }) };
      } else response = await request('GET', '/api/scout-intelligence/fixtures');
      var rows = response.data || response.fixtures || [];
      root.querySelector('#si4FixtureBody').innerHTML = rows.length ? '<div class="si4-grid two">' + rows.map(function (row) { var fixture = row.fixture || row; var players = row.players || row.pipelinePlayers || (row.player ? [row.player] : []); return '<article class="si4-card"><div class="si4-section-head"><div><h3>' + esc((fixture.home_or_away === 'Away' ? '@ ' : 'vs ') + (fixture.opponent_name || fixture.opponent || 'Opponent')) + '</h3><p>' + esc(dateText(fixture.fixture_date) + ' · ' + (fixture.fixture_time || '') + ' · ' + (fixture.venue || fixture.city || 'Venue not set')) + '</p></div>' + pill('Priority ' + (row.priority || row.priorityScore || row.priority_score || '—'), (row.priority || row.priorityScore || 0) >= 80 ? 'green' : 'gold') + '</div><div class="si4-callout blue"><b>Why attend:</b> ' + esc((row.reasons || []).join(' · ') || row.reason || row.priorityReason || 'A monitored player has an unresolved recruitment decision.') + '</div><div class="si4-pill-row">' + players.map(function (p) { return pill(playerName(p)); }).join('') + '</div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary small" data-si4-plan-fixture="' + esc(fixture.id) + '" type="button">Plan visit</button>' + (players[0] ? '<button class="si4-button small" data-si4-observe-player="' + esc(players[0].id) + '" data-fixture="' + esc(fixture.id) + '" type="button">Add observation</button>' : '') + '</div></article>'; }).join('') + '</div>' : empty('No priority fixtures', 'Add players to the pipeline or enable fixture alerts to build the live-scouting calendar.');
      root.querySelectorAll('[data-si4-plan-fixture]').forEach(function (button) { button.addEventListener('click', function () { openFixturePlanDialog(button.dataset.si4PlanFixture, rows); }); });
      root.querySelectorAll('[data-si4-observe-player]').forEach(function (button) { button.addEventListener('click', function () { var player = state.playerById[button.dataset.si4ObservePlayer]; var fixtureRow = rows.find(function (row) { return String((row.fixture || row).id) === String(button.dataset.fixture); }); openObservationDialog(player, fixtureRow && (fixtureRow.fixture || fixtureRow)); }); });
    } catch (error) { root.querySelector('#si4FixtureBody').innerHTML = errorState(error.message); }
  }

  function awaitPlayersSync() { return state.players || []; }

  function openFixturePlanDialog(fixtureId, rows) {
    if (isPublicDemo()) return toast('Fixture visit plan saved for this demo session.');
    var row = rows.find(function (item) { return String((item.fixture || item).id) === String(fixtureId); });
    var fixture = row && (row.fixture || row) || {};
    dialog('Plan live scouting visit', '<div class="si4-form-grid"><div class="si4-field full"><label>Observation objective</label><textarea class="si4-textarea" id="si4FixtureObjective" placeholder="What must this match confirm or challenge?"></textarea></div><div class="si4-field"><label>Priority</label><select class="si4-select" id="si4FixturePriority"><option>High</option><option>Medium</option><option>Low</option></select></div><div class="si4-field"><label>Assigned scout</label><input class="si4-input" id="si4FixtureScout" placeholder="Optional user ID"></div><div class="si4-field full"><label>Private preparation notes</label><textarea class="si4-textarea" id="si4FixtureNotes"></textarea></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-fixture-plan type="button">Save visit plan</button></div>', function (modal, close) {
      modal.querySelector('[data-save-fixture-plan]').addEventListener('click', async function () {
        try {
          await request('POST', '/api/scout-intelligence/fixture-plans', { fixtureId:fixture.id, playerId:row && row.player && row.player.id || null, objective:modal.querySelector('#si4FixtureObjective').value, priority:modal.querySelector('#si4FixturePriority').value === 'High' ? 90 : modal.querySelector('#si4FixturePriority').value === 'Medium' ? 60 : 30, assignedScoutId:modal.querySelector('#si4FixtureScout').value || null, travelNotes:modal.querySelector('#si4FixtureNotes').value });
          close(); toast('Fixture visit plan saved.');
        } catch (error) { toast(error.message, 'error'); }
      });
    });
  }

  async function renderExports(content) {
    var players = await loadPlayers();
    var body = '<div class="si4-grid aside"><article class="si4-card"><h3>Create a decision-ready report</h3><p>Reports preserve the verdict, supporting evidence, risks, confidence, scout notes and next action.</p><div class="si4-form-grid" style="margin-top:10px"><div class="si4-field"><label>Player</label><select class="si4-select" id="si4ExportPlayer"><option value="">Choose player</option>' + players.map(function (p) { return playerOption(p); }).join('') + '</select></div><div class="si4-field"><label>Report type</label><select class="si4-select" id="si4ExportType"><option>Player intelligence report</option><option>Position-fit report</option><option>Scenario-prediction report</option><option>Development report</option><option>ROI report</option><option>Comparison report</option><option>Pipeline review</option><option>Observation report</option></select></div><div class="si4-field"><label>Format</label><select class="si4-select" id="si4ExportFormat"><option>PDF</option><option>EXCEL</option></select></div><div class="si4-field"><label>Source</label><select class="si4-select" id="si4ExportSource"><option value="profile">Profile intelligence</option><option value="prediction">Latest prediction</option></select></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-si4-generate-export type="button">Generate report</button></div></article><aside class="si4-card soft"><h3>Every report includes</h3><ul class="si4-strength-list"><li>Verdict and recommended next action</li><li>Evidence confidence and missing evidence</li><li>Supporting statistics and role fit</li><li>Recruitment risks and decision-support notice</li><li>Time-stamped data version</li></ul></aside></div><div id="si4ReportHistory" class="si4-section">' + loading('Loading report and export history.') + '</div>';
    var root = mount(content, shell('Reports and exports', 'Create consistent internal reports for player review, comparison, predictions, observations and pipeline decisions.', '', body), { suppressLegacy:true });
    root.querySelector('[data-si4-generate-export]').addEventListener('click', async function () {
      var playerId = root.querySelector('#si4ExportPlayer').value;
      if (!playerId) return toast('Choose a player first.', 'error');
      if (isPublicDemo()) return toast('Demo report generated for this session.');
      try {
        var response = await legacyApi('POST', '/api/exports/player', { playerId:playerId, format:root.querySelector('#si4ExportFormat').value, source:root.querySelector('#si4ExportSource').value });
        downloadBase64(response.filename, response.mime, response.contentBase64);
        await request('POST', '/api/scout-intelligence/reports', { reportType:root.querySelector('#si4ExportType').value, subjectType:'player', subjectId:playerId, title:root.querySelector('#si4ExportType').value + ' · ' + playerName(state.playerById[playerId]), config:{ summary:'Generated from the Scout intelligence workspace.', exportId:response.exportId || null }, fileName:response.filename || null });
        toast('Report generated and recorded.'); loadReportHistory(root);
      } catch (error) { toast(error.message, 'error'); }
    });
    loadReportHistory(root);
  }

  async function loadReportHistory(root) {
    var box = root.querySelector('#si4ReportHistory');
    try {
      var response = isPublicDemo() ? {data:[]} : await request('GET', '/api/scout-intelligence/reports');
      var rows = response.data || [];
      box.innerHTML = '<div class="si4-section-head"><div><h3>Report history</h3><p>Decision-ready reports created by the scout team.</p></div></div>' + (rows.length ? '<div class="si4-table-wrap"><table class="si4-table"><thead><tr><th>Report</th><th>Player</th><th>Created</th><th>Status</th></tr></thead><tbody>' + rows.map(function (row) { return '<tr><td><b>' + esc(row.title || row.report_type) + '</b><br>' + esc(row.summary || '') + '</td><td>' + esc(playerName(row.player || {})) + '</td><td>' + esc(dateText(row.created_at)) + '</td><td>' + esc(row.status || 'created') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('No report records yet', 'Generate the first decision-ready report above.'));
    } catch (error) { box.innerHTML = errorState(error.message); }
  }

  async function renderSetup(content) {
    var data = await overview().catch(function () { return {brief:{}}; });
    var brief = data.brief || {};
    var body = briefHtml(brief) + '<div class="si4-grid three si4-section"><article class="si4-card"><h3>Search impact</h3><p>Players that address the selected weaknesses and role expectations are ranked higher and receive an explicit match reason.</p></article><article class="si4-card"><h3>Comparison impact</h3><p>The selected formation, style, budget and long-term goals change the comparison winner when the decision context changes.</p></article><article class="si4-card"><h3>Prediction impact</h3><p>Position, scenario, development and financial outputs use the player evidence while keeping the saved recruitment brief visible.</p></article></div><div class="si4-callout blue" style="margin-top:10px"><b>Usability rule:</b> Keep the recruitment brief concise. Select only the needs that should materially change a recruitment decision.</div>';
    mount(content, shell('Recruitment brief impact', 'See exactly how the saved Scout Setup changes search, compatibility, comparisons, predictions and recommendations.', '<a class="si4-button primary" href="#">Review existing setup below</a>', body));
  }

  async function renderNotifications(content) {
    var body = '<div class="si4-actions" style="margin-bottom:10px"><button class="si4-button primary" data-si4-check-alerts type="button">Check meaningful changes</button><a class="si4-button" href="/scout/player-search">Manage saved searches</a></div><div id="si4AlertBody">' + loading('Loading watched-player changes and decision activity.') + '</div>';
    var root = mount(content, shell('Intelligence alerts', 'Alerts are created only when a saved search gains new matches, a watched player crosses a threshold or evidence changes enough to affect a decision.', '', body));
    root.querySelector('[data-si4-check-alerts]').addEventListener('click', async function () {
      if (isPublicDemo()) return toast('No new meaningful demo changes were found.');
      try { var result = await request('POST', '/api/scout-intelligence/alerts/evaluate', {}); toast(result.count ? result.count + ' meaningful alert(s) created.' : 'No meaningful new changes.'); loadAlertHistory(root); } catch (error) { toast(error.message, 'error'); }
    });
    loadAlertHistory(root);
  }

  async function loadAlertHistory(root) {
    var box = root.querySelector('#si4AlertBody');
    try {
      var response = isPublicDemo() ? {decisions:[],activity:[]} : await request('GET', '/api/scout-intelligence/history');
      box.innerHTML = '<div class="si4-grid two"><article class="si4-card"><h3>Decision changes</h3>' + ((response.decisions || []).length ? timelineHtml((response.decisions || []).slice(0, 10).map(function (row) { return {title:(row.decision || 'Decision') + ' · ' + playerName(row.player || {}),body:row.rationale || row.next_action || '',at:row.created_at}; })) : empty('No recorded decisions', 'Decisions from profiles, comparisons and the pipeline will appear here.')) + '</article><article class="si4-card"><h3>Activity alerts</h3>' + ((response.activity || []).length ? timelineHtml((response.activity || []).slice(0, 10)) : empty('No intelligence alerts', 'Create a saved search or watch a player to receive meaningful change alerts.')) + '</article></div>';
    } catch (error) { box.innerHTML = errorState(error.message); }
  }

  async function renderSettings(content) {
    var data = await overview().catch(function () { return {usage:{}}; });
    var usage = data.usage || {};
    var body = '<div class="si4-kpi-strip">' + metric('Prediction usage', num(usage.predictions && usage.predictions.used) + ' / ' + num(usage.predictions && usage.predictions.limit), num(usage.predictions && usage.predictions.remaining) + ' remaining', 'green') + metric('Export usage', num(usage.exports && usage.exports.used) + ' / ' + num(usage.exports && usage.exports.limit), num(usage.exports && usage.exports.remaining) + ' remaining') + metric('Pipeline usage', num(usage.interests && usage.interests.used) + ' / ' + num(usage.interests && usage.interests.limit), num(usage.interests && usage.interests.remaining) + ' places remaining') + metric('Reset date', usage.resetAt ? dateText(usage.resetAt) : 'Managed by access date', 'Limits reset against the scout-team access period') + '</div>' +
      '<div class="si4-grid two"><article class="si4-card"><h3>Team permissions</h3><p>Only permissioned roles should change team limits, assignments, shared shortlists and decision approvals.</p><ul class="si4-strength-list"><li>View remaining limits by feature</li><li>Track usage by scout and team</li><li>Request a limit increase without changing the plan silently</li><li>Keep an audit record of reports, predictions and decisions</li></ul></article><article class="si4-card"><h3>Usage controls</h3><p>High usage should trigger a warning before a scout reaches a cap. Reaching a cap should never remove existing reports or decisions.</p><div class="si4-callout gold" style="margin-top:9px"><b>Plan:</b> ' + esc(usage.plan || 'Scout') + '. Contact the permissioned team administrator or Customer Operations to change limits.</div></article></div>';
    mount(content, shell('Usage and team controls', 'Make limits, reset dates and team permissions visible without adding friction to everyday scouting work.', '', body));
  }

  async function renderCollaboration(content, route) {
    var body = '<div class="si4-grid three"><article class="si4-card"><h3>Shared shortlists</h3><p>Create a shortlist for an event, role, team weakness or recruitment meeting. Team members can comment without changing the player record.</p><button class="si4-button small" type="button" data-si4-new-shortlist style="margin-top:9px">Create shortlist</button></article><article class="si4-card"><h3>Decision voting</h3><p>Record support, concern or abstention and keep conflicting opinions visible for the Head Scout.</p><button class="si4-button small" type="button" data-si4-vote style="margin-top:9px">Record team vote</button></article><article class="si4-card"><h3>Private team notes</h3><p>Comments remain inside the authorised scout team. Coach-mediated chat remains separate from internal recruitment notes.</p><button class="si4-button small" type="button" data-si4-add-comment style="margin-top:9px">Add internal note</button></article></div>';
    var root = mount(content, shell(route === 'events' ? 'Event shortlisting and collaboration' : 'Scout-team collaboration', 'Share evidence, preserve disagreement and keep a complete decision trail without exposing internal notes to coaches, players or families.', '', body));
    root.querySelector('[data-si4-new-shortlist]').addEventListener('click', function () { openShortlistDialog(); });
    root.querySelector('[data-si4-vote]').addEventListener('click', function () { openVoteDialog(); });
    root.querySelector('[data-si4-add-comment]').addEventListener('click', function () { openCommentDialog(); });
  }

  function openShortlistDialog() {
    if (isPublicDemo()) return toast('Demo shortlist created for this session.');
    dialog('Create shared shortlist', '<div class="si4-form-grid"><div class="si4-field full"><label>Name</label><input class="si4-input" id="si4ShortlistName" placeholder="Example: U16 high-press midfield targets"></div><div class="si4-field full"><label>Purpose</label><textarea class="si4-textarea" id="si4ShortlistPurpose"></textarea></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-shortlist type="button">Create shortlist</button></div>', function (modal, close) {
      modal.querySelector('[data-save-shortlist]').addEventListener('click', async function () {
        try { await request('POST', '/api/scout-intelligence/shortlists', { name:modal.querySelector('#si4ShortlistName').value, description:modal.querySelector('#si4ShortlistPurpose').value }); close(); toast('Shared shortlist created.'); } catch (error) { toast(error.message, 'error'); }
      });
    });
  }

  async function openVoteDialog() {
    if (isPublicDemo()) {
      toast('Demo team vote recorded for this session.');
      return;
    }
    try {
      var players = await loadPlayers();
      dialog('Record scout-team vote', '<div class="si4-form-grid"><div class="si4-field"><label>Player</label><select class="si4-select" id="si4VotePlayer">' + players.map(function (player) { return playerOption(player); }).join('') + '</select></div><div class="si4-field"><label>Vote</label><select class="si4-select" id="si4VoteValue"><option value="support">Support progression</option><option value="concern">Raise concern</option><option value="abstain">Abstain</option></select></div><div class="si4-field full"><label>Rationale</label><textarea class="si4-textarea" id="si4VoteRationale" placeholder="Explain the football or evidence reason for this vote."></textarea></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-vote type="button">Save vote</button></div>', function (modal, close) {
        modal.querySelector('[data-save-vote]').addEventListener('click', async function () {
          try {
            await request('POST', '/api/scout-intelligence/votes', {
              subjectType:'player',
              subjectId:modal.querySelector('#si4VotePlayer').value,
              vote:modal.querySelector('#si4VoteValue').value,
              rationale:modal.querySelector('#si4VoteRationale').value
            });
            close();
            toast('Scout-team vote saved. Conflicting opinions remain visible in the decision record.');
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function openCommentDialog() {
    if (isPublicDemo()) return toast('Internal note saved for this demo session.');
    dialog('Add private scout-team note', '<div class="si4-form-grid"><div class="si4-field full"><label>Note</label><textarea class="si4-textarea" id="si4CommentBody" placeholder="Record a private recruitment observation or disagreement."></textarea></div></div><div class="si4-actions" style="margin-top:10px"><button class="si4-button primary" data-save-comment type="button">Save internal note</button></div>', function (modal, close) {
      modal.querySelector('[data-save-comment]').addEventListener('click', async function () {
        try { await request('POST', '/api/scout-intelligence/comments', { subjectType:'workspace', subjectId:currentUserId(), body:modal.querySelector('#si4CommentBody').value }); close(); toast('Private scout-team note saved.'); } catch (error) { toast(error.message, 'error'); }
      });
    });
  }

  async function renderConcern(content) {
    var body = '<div class="si4-grid three"><article class="si4-card red"><h3>Adult-mediated contact</h3><p>ScoutLink does not use the intelligence layer to create unmanaged direct contact with children. Contact remains routed through authorised adults, teams and clubs.</p></article><article class="si4-card"><h3>Private recruitment notes</h3><p>Scout comments, votes, observations and decisions are separate from coach-visible communication and restricted to authorised team members.</p></article><article class="si4-card"><h3>Complete audit trail</h3><p>Reports, observations, decisions, pipeline changes and concern evidence are time-stamped so access and action can be reviewed.</p></article></div>';
    mount(content, shell('Safeguarding and controlled contact', 'The added intelligence functionality must strengthen decision quality without weakening safeguarding, privacy or access controls.', '', body));
  }

  async function renderConfirm(content) {
    var body = '<div class="si4-grid three"><article class="si4-card"><h3>Set only material team needs</h3><p>The brief should contain the weaknesses, roles and long-term goals that should genuinely change a recommendation.</p></article><article class="si4-card"><h3>Keep recommendations explainable</h3><p>Search, comparison and predictions will show which saved needs influenced the result without exposing proprietary weighting.</p></article><article class="si4-card"><h3>Review later</h3><p>The scout can update the brief in Scout Setup. Historical decisions keep the model snapshot used at the time.</p></article></div>';
    mount(content, shell('Recruitment intelligence setup', 'The first-access setup now feeds the complete decision-support workflow while staying short and easy to understand.', '', body));
  }

  async function initRoute() {
    state.route = routeId();
    if (!state.route) return;
    waitForWorkspace(function (app, content) {
      try {
        var renderers = {
          confirm:renderConfirm,
          dashboard:renderDashboard,
          search:renderSearch,
          profile:renderProfile,
          pipeline:renderPipeline,
          rankings:renderRankings,
          fixtures:renderFixtures,
          predictions:renderPredictions,
          exports:renderExports,
          compare:renderCompare,
          setup:renderSetup,
          events:function (c) { return renderCollaboration(c, 'events'); },
          chat:function (c) { return renderCollaboration(c, 'chat'); },
          notifications:renderNotifications,
          concern:renderConcern,
          settings:renderSettings
        };
        if (renderers[state.route]) renderers[state.route](content);
      } catch (error) {
        console.error('[Scout intelligence V4]', error);
        mount(content, shell('Scout intelligence', 'The functional layer encountered an error.', '', errorState(error.message)));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initRoute);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) initRoute();
  });
  window.ScoutIntelligenceV4 = {
    init:initRoute,
    state:state,
    openDecision:openDecisionDialog,
    openObservation:openObservationDialog
  };
})();

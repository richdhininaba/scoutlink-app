'use strict';

/*
 * ScoutLink Scout Dashboard + Player Search functional repairs.
 *
 * Scope is deliberately narrow:
 *   - Dashboard pipeline priorities and upcoming-fixture deep links.
 *   - Player Search filters, compatibility ordering and pipeline button state.
 *   - Fixture deep-link overlay used by Dashboard links.
 *
 * The Scout Desk/Field literal renderer remains the visual source of truth.
 * This file hydrates and repairs behaviour inside its Shadow DOM without
 * replacing the supplied desktop or mobile layouts.
 */
(function () {
  if (window.__SCOUT_DASHBOARD_SEARCH_V1__) return;
  window.__SCOUT_DASHBOARD_SEARCH_V1__ = true;

  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var SEARCH_KEY = 'sl_scout_search_filters_v1';
  var LEGACY_SEARCH_KEY = 'sl_scout_v9_search_filters';
  var DEMO_PIPELINE_KEY = 'sl_scout_v9_demo_pipeline';
  var STYLE_ID = 'slScoutDashboardSearchV1Style';

  var playersCache = null;
  var pipelineCache = null;
  var fixturesCache = null;
  var shadowObserver = null;
  var scheduled = false;
  var repairing = false;
  var lastFixtureModalId = '';

  var POSITION_GROUPS = {
    Goalkeeper: ['GK'],
    Defender: ['RB', 'CB', 'LB', 'RWB', 'LWB', 'RCB', 'LCB', 'SW'],
    Midfielder: ['DM', 'CM', 'AM', 'RM', 'LM', 'CDM', 'CAM', 'RCM', 'LCM', 'RDM', 'LDM', 'RAM', 'LAM'],
    Attacker: ['RW', 'LW', 'CF', 'ST', 'SS', 'LS', 'RS']
  };

  var POSITION_LABELS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function normal(value) {
    return text(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function token() {
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function apiBase() {
    try {
      return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, '');
    } catch (_) {
      return API_FALLBACK;
    }
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        token() === 'public-demo-session' ||
        location.pathname.indexOf('/public-demo/scout') === 0;
    } catch (_) {
      return location.pathname.indexOf('/public-demo/scout') === 0;
    }
  }

  function isDemo() {
    try {
      return isPublicDemo() || localStorage.getItem('sl_demo_mode') === '1';
    } catch (_) {
      return isPublicDemo();
    }
  }

  function route() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var pathname = String(location.pathname || '').replace(/\/+$/, '');
    if (/\/scout\/dashboard$/.test(pathname)) return 'dashboard';
    if (/\/scout\/player-search$/.test(pathname)) return 'search';
    if (/\/scout\/fixtures$/.test(pathname)) return 'fixtures';
    return '';
  }

  function relevantRoute() {
    return ['dashboard', 'search', 'fixtures'].indexOf(route()) >= 0;
  }

  async function request(method, pathname, body) {
    var headers = { Accept: 'application/json' };
    var accessToken = token();
    if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + pathname, {
      method: method,
      headers: headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined || body === null ? undefined : JSON.stringify(body)
    });

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function unwrapList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.players)) return payload.players;
    if (Array.isArray(payload.fixtures)) return payload.fixtures;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    return [];
  }

  function readJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function host() {
    return document.getElementById('scoutExperienceApp');
  }

  function shadow() {
    var app = host();
    return app && app.shadowRoot;
  }

  function copies(root) {
    root = root || shadow();
    if (!root) return [];
    var list = Array.prototype.slice.call(
      root.querySelectorAll('.slv8-desktop-copy,.slv8-mobile-copy,.slv9-desktop-copy,.slv9-mobile-copy')
    );
    return list.length ? list : [root];
  }

  function fieldByLabel(root, label) {
    var wanted = normal(label);
    var fields = Array.prototype.slice.call(root.querySelectorAll('.field'));
    return fields.find(function (field) {
      var lab = field.querySelector('label');
      return lab && normal(lab.textContent).indexOf(wanted) === 0;
    }) || null;
  }

  function cardByTitle(root, title) {
    var wanted = normal(title);
    var cards = Array.prototype.slice.call(root.querySelectorAll('.card'));
    return cards.find(function (card) {
      var heading = card.querySelector('.card-h h3,h3');
      return heading && normal(heading.textContent).indexOf(wanted) === 0;
    }) || null;
  }

  function findButton(root, labels) {
    labels = Array.isArray(labels) ? labels : [labels];
    var wanted = labels.map(normal);
    return Array.prototype.slice.call(root.querySelectorAll('button,a')).find(function (button) {
      return wanted.indexOf(normal(button.textContent)) >= 0;
    }) || null;
  }

  function playerId(player) {
    return player && (player.id || player.player_id || player.playerId) || '';
  }

  function playerName(player) {
    if (!player) return '';
    var joined = [player.first_name, player.last_name].filter(Boolean).join(' ').trim();
    return joined || text(player.name || player.full_name || player.display_name);
  }

  function canonicalPosition(value) {
    var raw = text(value).toUpperCase();
    var aliases = {
      CDM: 'DM', CAM: 'AM', RCM: 'CM', LCM: 'CM', RDM: 'DM', LDM: 'DM',
      RAM: 'AM', LAM: 'AM', RCB: 'CB', LCB: 'CB', SW: 'CB', SS: 'CF',
      LS: 'ST', RS: 'ST'
    };
    return aliases[raw] || raw;
  }

  function rawPlayerPositions(player) {
    var values = [];
    if (player && Array.isArray(player.positions)) values = values.concat(player.positions);
    if (player && player.specific_position) values.push(player.specific_position);
    if (player && player.primary_position) values.push(player.primary_position);
    if (player && player.position) values.push(player.position);
    return values.map(canonicalPosition).filter(Boolean);
  }

  function positionGroup(player) {
    var supplied = text(player && (player.position_group || player.positionGroup));
    if (POSITION_GROUPS[supplied]) return supplied;
    if (normal(supplied) === 'forward') return 'Attacker';

    var positions = rawPlayerPositions(player);
    var groups = Object.keys(POSITION_GROUPS);
    for (var i = 0; i < groups.length; i += 1) {
      if (positions.some(function (position) { return POSITION_GROUPS[groups[i]].indexOf(position) >= 0; })) {
        return groups[i];
      }
    }
    return supplied || 'Attacker';
  }

  function displayPosition(player) {
    return text(
      player && (
        player.specific_position ||
        player.primary_position ||
        player.position ||
        player.position_group
      )
    );
  }

  function ageGroup(player) {
    var value = text(player && (player.age_group || player.ageGroup));
    if (value) return value.toUpperCase();
    var age = number(player && player.age, NaN);
    return Number.isFinite(age) ? 'U' + Math.round(age) : '';
  }

  function teamName(player) {
    return text(
      player && (
        player.team_name ||
        player.teamName ||
        player.team && player.team.team_name
      )
    );
  }

  function teamCity(player) {
    return text(
      player && (
        player.team_city ||
        player.city ||
        player.team && player.team.city ||
        player.county ||
        player.region
      )
    );
  }

  function overall(player) {
    var value = number(player && (player.overall_rating != null ? player.overall_rating : player.overall), NaN);
    if (!Number.isFinite(value)) return 0;
    return value > 0 && value <= 10 ? value * 10 : Math.max(0, Math.min(100, value));
  }

  function compatibility(player) {
    var values = [
      player && player.compatibilityScore,
      player && player.compatibility_score,
      player && player.compatibility && player.compatibility.score,
      player && player._analysis && player._analysis.compatibilityScore
    ];
    for (var i = 0; i < values.length; i += 1) {
      var parsed = Number(values[i]);
      if (Number.isFinite(parsed)) {
        if (parsed > 0 && parsed <= 10) parsed *= 10;
        return Math.max(0, Math.min(100, parsed));
      }
    }
    return null;
  }

  function availability(player) {
    var raw = text(
      player && (
        player.availability ||
        player.recruitment_status ||
        player.transfer_status ||
        player.status
      )
    );
    if (!raw && player && player.is_active !== false) return 'Available';
    if (!raw) return 'Unavailable';
    var n = normal(raw);
    if (n === 'active' || n === 'open' || n === 'available') return 'Available';
    if (n.indexOf('unavailable') >= 0 || n.indexOf('injur') >= 0 || n === 'inactive') return 'Unavailable';
    return raw;
  }

  function foot(player) {
    var value = text(player && (player.foot || player.preferred_foot || player.preferredFoot));
    if (!value) return '';
    var n = normal(value);
    if (n.indexOf('left') >= 0) return 'Left';
    if (n.indexOf('right') >= 0) return 'Right';
    if (n.indexOf('both') >= 0 || n.indexOf('either') >= 0) return 'Both';
    return value;
  }

  function initials(name) {
    var bits = text(name).split(/\s+/).filter(Boolean);
    return ((bits[0] || '').charAt(0) + (bits[bits.length - 1] || '').charAt(0)).toUpperCase() || 'SL';
  }

  function safeDate(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return text(value) || 'TBC';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function safeDateTime(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return text(value) || 'TBC';
    return date.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  async function loadPlayers(force) {
    if (playersCache && !force) return playersCache;
    var endpoint = isPublicDemo() ? '/api/players/public-demo' : '/api/scout-intelligence-v64/players';
    var payload = await request('GET', endpoint);
    playersCache = unwrapList(payload).filter(Boolean);
    return playersCache;
  }

  function demoPipeline() {
    return readJson(sessionStorage, DEMO_PIPELINE_KEY, []) || [];
  }

  async function loadPipeline(force) {
    if (pipelineCache && !force) return pipelineCache;
    if (isDemo()) {
      pipelineCache = demoPipeline();
      return pipelineCache;
    }
    var payload = await request('GET', '/api/scouts/pipeline?limit=100');
    pipelineCache = unwrapList(payload);
    return pipelineCache;
  }

  async function loadFixtures(force) {
    if (fixturesCache && !force) return fixturesCache;
    try {
      var payload = await request('GET', '/api/scouts/fixtures');
      fixturesCache = unwrapList(payload);
    } catch (_) {
      fixturesCache = [];
    }
    return fixturesCache;
  }

  function ensureStyle(root) {
    if (!root || root.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.slds-multi{position:relative;width:100%}',
      '.slds-multi-trigger{width:100%;min-height:42px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;border:1px solid var(--line2,#DCE3DE);border-radius:10px;background:var(--paper,#fff);color:var(--ink,#0C201A);font:600 12px Archivo,Arial,sans-serif;cursor:pointer;text-align:left}',
      '.slds-multi-trigger:after{content:"⌄";font:700 13px Archivo,Arial,sans-serif;color:var(--muted,#7C8A82)}',
      '.slds-multi-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;padding:7px;border:1px solid var(--line2,#DCE3DE);border-radius:12px;background:var(--paper,#fff);box-shadow:0 16px 40px rgba(6,32,26,.15);max-height:250px;overflow:auto}',
      '.slds-multi.open .slds-multi-menu{display:block}',
      '.slds-multi-option{display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:8px;color:var(--ink,#0C201A);font:600 12px Archivo,Arial,sans-serif;cursor:pointer}',
      '.slds-multi-option:hover{background:var(--canvas,#FBFCFB)}',
      '.slds-multi-option input{width:16px;height:16px;margin:0;accent-color:var(--pitch,#075F48)}',
      '.slds-added{background:var(--ink,#06201A)!important;border-color:var(--ink,#06201A)!important;color:#fff!important;cursor:default!important;opacity:1!important}',
      '.slds-compat-chip small{display:block;font-size:8px!important;line-height:1.2;text-transform:uppercase;letter-spacing:.05em}',
      '.slds-fixture-overlay{position:fixed;inset:0;z-index:60000;display:grid;place-items:center;padding:18px;background:rgba(6,32,26,.64)}',
      '.slds-fixture-modal{width:min(680px,100%);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid var(--line2,#DCE3DE);border-radius:18px;background:var(--paper,#fff);box-shadow:0 26px 80px rgba(6,32,26,.28)}',
      '.slds-fixture-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line,#EBEFEC)}',
      '.slds-fixture-head h3{margin:0;font:400 20px var(--display,Anton,sans-serif);text-transform:uppercase;color:var(--ink,#0C201A)}',
      '.slds-fixture-head button{margin-left:auto}',
      '.slds-fixture-body{padding:18px}',
      '.slds-fixture-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.slds-fixture-fact{padding:12px;border:1px solid var(--line,#EBEFEC);border-radius:12px;background:var(--canvas,#FBFCFB)}',
      '.slds-fixture-fact span{display:block;margin-bottom:4px;font:700 9px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#7C8A82)}',
      '.slds-fixture-fact b{font:700 12px Archivo,Arial,sans-serif;color:var(--ink,#0C201A)}',
      '.slds-fixture-notes{margin-top:12px;padding:14px;border-left:3px solid var(--volt,#D8F547);background:var(--canvas,#FBFCFB);font:500 12px/1.55 Archivo,Arial,sans-serif;color:var(--ink,#0C201A)}',
      '@media(max-width:767px){.slds-multi-menu{position:static;margin-top:6px}.slds-fixture-overlay{padding:8px}.slds-fixture-grid{grid-template-columns:1fr}.slds-fixture-modal{max-height:calc(100dvh - 16px)}}'
    ].join('');
    root.appendChild(style);
  }

  function resolvePipelinePlayer(row, players) {
    var embedded = row && row.players;
    if (Array.isArray(embedded)) embedded = embedded[0] || null;
    if (embedded && playerName(embedded)) return embedded;
    var id = row && (row.player_id || row.playerId);
    return (players || []).find(function (player) {
      return String(playerId(player)) === String(id);
    }) || null;
  }

  function pipelinePriorityScore(row) {
    var stage = normal(row && row.stage);
    var stageWeight = {
      trial_pending: 100,
      shortlisted: 92,
      negotiating: 88,
      progressed: 84,
      approached: 78,
      interested: 72,
      watching: 0
    }[stage] || 0;
    var interest = Math.max(0, Math.min(10, number(row && row.interest_level, 0))) * 2;
    var hasAction = text(row && row.next_action) ? 10 : 0;
    return stageWeight + interest + hasAction;
  }

  function isPipelinePriority(row) {
    if (!row || row.is_active === false) return false;
    var stage = normal(row.stage);
    if (['interested', 'shortlisted', 'approached', 'trial_pending', 'negotiating', 'progressed'].indexOf(stage) >= 0) {
      return true;
    }
    return number(row.interest_level, 0) >= 7 || Boolean(text(row.next_action));
  }

  function stageLabel(value) {
    var stage = normal(value);
    return {
      watching: 'Watching',
      interested: 'Monitoring',
      shortlisted: 'Shortlisted',
      approached: 'Approached',
      trial_pending: 'Trial Pending',
      negotiating: 'Progressed',
      progressed: 'Progressed'
    }[stage] || text(value).replace(/_/g, ' ') || 'Priority';
  }

  function publicPrefix(pathname) {
    if (!isPublicDemo()) return pathname;
    if (pathname.indexOf('/scout/') === 0) return '/public-demo' + pathname;
    return pathname;
  }

  function playerProfileUrl(id) {
    if (isPublicDemo()) return '/public-demo/scout/player/profile?id=' + encodeURIComponent(id);
    return '/player/profile?id=' + encodeURIComponent(id);
  }

  function fixtureUrl(id) {
    return publicPrefix('/scout/fixtures') + '?fixture=' + encodeURIComponent(id);
  }

  function dashboardSignature(players, pipeline, fixtures) {
    return [
      (players || []).map(function (player) { return [playerId(player), playerName(player), displayPosition(player), ageGroup(player), teamName(player)].join(':'); }).join('|'),
      (pipeline || []).map(function (row) { return [row.id, row.player_id, row.stage, row.interest_level, row.updated_at].join(':'); }).join('|'),
      (fixtures || []).map(function (fixture) { return [fixture.id || fixture.fixture_id, fixture.fixture_date || fixture.date, fixture.fixture_time, fixture.status, fixture.priority].join(':'); }).join('|')
    ].join('||');
  }

  function renderDashboardPipeline(root, players, pipeline) {
    var card = cardByTitle(root, 'Pipeline priorities');
    if (!card) return;
    var body = card.querySelector('.card-b');
    if (!body) return;
    var sample = body.querySelector('.list-row');
    if (!sample) {
      body.innerHTML = '<div class="empty"><b>No priorities</b><p>Players with an active recruitment priority will appear here.</p></div>';
      return;
    }

    var template = sample.cloneNode(true);
    var rows = (pipeline || [])
      .map(function (row) {
        return { row: row, player: resolvePipelinePlayer(row, players) };
      })
      .filter(function (entry) {
        return entry.player && playerName(entry.player) && isPipelinePriority(entry.row);
      })
      .sort(function (a, b) {
        var diff = pipelinePriorityScore(b.row) - pipelinePriorityScore(a.row);
        if (diff) return diff;
        return new Date(b.row.updated_at || b.row.created_at || 0) - new Date(a.row.updated_at || a.row.created_at || 0);
      })
      .slice(0, 5);

    body.innerHTML = '';
    rows.forEach(function (entry) {
      var row = entry.row;
      var player = entry.player;
      var item = template.cloneNode(true);
      var id = playerId(player) || row.player_id;
      item.dataset.pipelineId = row.id || '';
      item.dataset.playerId = id || '';

      var avatar = item.querySelector('.avatar');
      if (avatar) avatar.textContent = initials(playerName(player));

      var who = item.querySelector('.who');
      if (who) {
        var name = who.querySelector('b');
        var detail = who.querySelector('span');
        if (name) name.textContent = playerName(player);
        if (detail) {
          detail.textContent = text(row.next_action || row.notes) ||
            [displayPosition(player), ageGroup(player), teamName(player)].filter(Boolean).join(' · ');
        }
      }

      var pill = item.querySelector('.pill');
      if (pill) {
        pill.textContent = stageLabel(row.stage);
        pill.className = 'pill ' + (normal(row.stage) === 'shortlisted' ? 'g' : 'n');
      }

      var stamp = item.querySelector('.time,.mut:last-child');
      if (stamp) stamp.textContent = safeDate(row.updated_at || row.created_at);

      item.style.cursor = 'pointer';
      item.onclick = function () {
        if (id) location.href = playerProfileUrl(id);
      };
      body.appendChild(item);
    });

    if (!rows.length) {
      body.innerHTML = '<div class="empty"><b>No priorities</b><p>Players with an active recruitment priority will appear here.</p></div>';
    }
  }

  function fixtureTimestamp(fixture) {
    var dateValue = fixture && (fixture.fixture_date || fixture.date || fixture.kickoff_at || fixture.start_at);
    var timeValue = text(fixture && fixture.fixture_time);
    var input = text(dateValue);
    if (input && /^\d{4}-\d{2}-\d{2}$/.test(input) && timeValue) input += 'T' + timeValue;
    var parsed = input ? new Date(input) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : NaN;
  }

  function upcomingFixtures(fixtures) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return (fixtures || [])
      .filter(function (fixture) {
        var timestamp = fixtureTimestamp(fixture);
        return !Number.isFinite(timestamp) || timestamp >= today.getTime();
      })
      .sort(function (a, b) {
        var at = fixtureTimestamp(a);
        var bt = fixtureTimestamp(b);
        if (!Number.isFinite(at) && !Number.isFinite(bt)) return 0;
        if (!Number.isFinite(at)) return 1;
        if (!Number.isFinite(bt)) return -1;
        return at - bt;
      });
  }

  function fixtureIsPriority(fixture) {
    if (!fixture) return false;
    if (fixture.is_priority === true || fixture.priority === true) return true;
    if (number(fixture.priority, 0) > 0 || number(fixture.plan_priority, 0) > 0) return true;
    var status = normal(fixture.plan_status || fixture.visit_status || fixture.status);
    return status.indexOf('priority') >= 0;
  }

  function fixtureTitle(fixture) {
    var team = text(fixture.team_name || fixture.home_team || fixture.home_team_name);
    var opponent = text(fixture.opponent_name || fixture.opponent || fixture.away_team || fixture.away_team_name);
    if (team && opponent) return team + ' vs ' + opponent;
    return opponent || team || 'Fixture';
  }

  function fixtureMeta(fixture) {
    return [
      safeDate(fixture.fixture_date || fixture.date || fixture.kickoff_at || fixture.start_at),
      text(fixture.fixture_time || fixture.time),
      text(fixture.venue_name || fixture.venue)
    ].filter(Boolean).join(' · ');
  }

  function renderDashboardFixtures(root, fixtures) {
    var card = cardByTitle(root, 'Upcoming fixtures');
    if (!card) return;
    var body = card.querySelector('.card-b');
    if (!body) return;
    var sample = body.querySelector('.list-row');
    var list = upcomingFixtures(fixtures).slice(0, 5);

    if (!sample) {
      if (!list.length) body.innerHTML = '<div class="empty"><b>No upcoming fixtures</b><p>Fixtures connected to your recruitment work will appear here.</p></div>';
      return;
    }

    var template = sample.cloneNode(true);
    body.innerHTML = '';
    list.forEach(function (fixture) {
      var row = template.cloneNode(true);
      var id = fixture.id || fixture.fixture_id || '';
      row.dataset.fixtureId = id;

      var who = row.querySelector('.who');
      if (who) {
        var title = who.querySelector('b');
        var detail = who.querySelector('span');
        if (title) title.textContent = fixtureTitle(fixture);
        if (detail) detail.textContent = fixtureMeta(fixture);
      }

      var pill = row.querySelector('.pill');
      if (pill) {
        pill.textContent = fixtureIsPriority(fixture) ? 'Priority' : 'Scheduled';
        pill.className = 'pill ' + (fixtureIsPriority(fixture) ? 'a' : 'n');
      }

      row.style.cursor = id ? 'pointer' : 'default';
      row.onclick = function () {
        if (id) location.href = fixtureUrl(id);
      };
      body.appendChild(row);
    });

    if (!list.length) {
      body.innerHTML = '<div class="empty"><b>No upcoming fixtures</b><p>Fixtures connected to your recruitment work will appear here.</p></div>';
    }
  }

  function defaultSearchState() {
    var legacy = readJson(sessionStorage, LEGACY_SEARCH_KEY, {}) || {};
    var position = text(legacy.position);
    var positionGroupValue = POSITION_LABELS.indexOf(position) >= 0 ? position : '';
    if (!positionGroupValue && position && normal(position).indexOf('any') !== 0) {
      positionGroupValue = positionGroup({ specific_position: position });
      if (POSITION_LABELS.indexOf(positionGroupValue) < 0) positionGroupValue = '';
    }
    var age = text(legacy['age group']);
    return {
      positions: positionGroupValue ? [positionGroupValue] : [],
      ageGroups: age && normal(age).indexOf('any') !== 0 ? [age.toUpperCase()] : [],
      region: text(legacy.region),
      availability: text(legacy.availability) || 'Any',
      foot: text(legacy.foot) || 'Any',
      minOverall: number(legacy['min. overall'], 0)
    };
  }

  function searchState() {
    var saved = readJson(sessionStorage, SEARCH_KEY, null);
    if (!saved) saved = defaultSearchState();
    saved.positions = Array.isArray(saved.positions) ? saved.positions.filter(function (value) { return POSITION_LABELS.indexOf(value) >= 0; }) : [];
    saved.ageGroups = Array.isArray(saved.ageGroups) ? saved.ageGroups.map(function (value) { return text(value).toUpperCase(); }).filter(Boolean) : [];
    saved.region = text(saved.region);
    saved.availability = text(saved.availability) || 'Any';
    saved.foot = text(saved.foot) || 'Any';
    saved.minOverall = number(saved.minOverall, 0);
    return saved;
  }

  function saveSearchState(state) {
    writeJson(sessionStorage, SEARCH_KEY, state);
  }

  function distinctCities(players) {
    var map = {};
    (players || []).forEach(function (player) {
      var city = teamCity(player);
      if (city) map[normal(city)] = city;
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return a.localeCompare(b, 'en-GB', { sensitivity: 'base' });
    });
  }

  function distinctAgeGroups(players) {
    var map = {};
    (players || []).forEach(function (player) {
      var age = ageGroup(player);
      if (age) map[age] = true;
    });
    var values = Object.keys(map);
    if (!values.length) {
      for (var i = 7; i <= 16; i += 1) values.push('U' + i);
    }
    return values.sort(function (a, b) {
      var an = number(String(a).replace(/\D/g, ''), 999);
      var bn = number(String(b).replace(/\D/g, ''), 999);
      return an - bn || a.localeCompare(b);
    });
  }

  function setSelectOptions(select, options, current) {
    if (!select) return;
    var signature = JSON.stringify(options);
    if (select.dataset.sldsOptions !== signature) {
      select.innerHTML = options.map(function (option) {
        return '<option value="' + esc(option.value) + '">' + esc(option.label) + '</option>';
      }).join('');
      select.dataset.sldsOptions = signature;
    }
    if (current != null && Array.prototype.some.call(select.options, function (option) { return String(option.value) === String(current); })) {
      select.value = current;
    }
  }

  function multiLabel(values, emptyLabel) {
    if (!values.length) return emptyLabel;
    if (values.length <= 2) return values.join(', ');
    return values.slice(0, 2).join(', ') + ' +' + (values.length - 2);
  }

  function installMultiSelect(field, type, options, selected, emptyLabel, onChange) {
    if (!field) return;
    var original = field.querySelector('select');
    if (original) {
      original.style.display = 'none';
      original.setAttribute('aria-hidden', 'true');
      original.tabIndex = -1;
    }

    var wrap = field.querySelector('.slds-multi[data-slds-type="' + type + '"]');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'slds-multi';
      wrap.dataset.sldsType = type;
      wrap.innerHTML = '<button type="button" class="slds-multi-trigger" aria-expanded="false"></button><div class="slds-multi-menu"></div>';
      field.appendChild(wrap);

      var trigger = wrap.querySelector('.slds-multi-trigger');
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var open = !wrap.classList.contains('open');
        field.getRootNode().querySelectorAll('.slds-multi.open').forEach(function (other) {
          if (other !== wrap) {
            other.classList.remove('open');
            var otherTrigger = other.querySelector('.slds-multi-trigger');
            if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          }
        });
        wrap.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    var currentSignature = JSON.stringify(options);
    var menu = wrap.querySelector('.slds-multi-menu');
    if (wrap.dataset.sldsOptions !== currentSignature) {
      menu.innerHTML = options.map(function (option) {
        return '<label class="slds-multi-option"><input type="checkbox" value="' + esc(option) + '"><span>' + esc(option) + '</span></label>';
      }).join('');
      wrap.dataset.sldsOptions = currentSignature;
      menu.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
          var values = Array.prototype.slice.call(menu.querySelectorAll('input:checked')).map(function (input) { return input.value; });
          onChange(values);
        });
      });
    }

    menu.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      checkbox.checked = selected.indexOf(checkbox.value) >= 0;
    });
    var triggerButton = wrap.querySelector('.slds-multi-trigger');
    triggerButton.textContent = multiLabel(selected, emptyLabel);
  }

  function syncSearchControls(root, players, state) {
    var positionField = fieldByLabel(root, 'Position');
    var ageField = fieldByLabel(root, 'Age group');
    var regionField = fieldByLabel(root, 'Region');
    var availabilityField = fieldByLabel(root, 'Availability');
    var footField = fieldByLabel(root, 'Foot');
    var minField = fieldByLabel(root, 'Min. overall');

    installMultiSelect(positionField, 'positions', POSITION_LABELS, state.positions, 'Any position', function (values) {
      var next = searchState();
      next.positions = values;
      saveSearchState(next);
      renderSearchAll(players, pipelineCache || []);
    });

    installMultiSelect(ageField, 'ages', distinctAgeGroups(players), state.ageGroups, 'Any age group', function (values) {
      var next = searchState();
      next.ageGroups = values;
      saveSearchState(next);
      renderSearchAll(players, pipelineCache || []);
    });

    var regionSelect = regionField && regionField.querySelector('select');
    if (regionSelect) {
      var cities = distinctCities(players);
      setSelectOptions(regionSelect, [{ value: '', label: 'Any region' }].concat(cities.map(function (city) {
        return { value: city, label: city };
      })), state.region);
      if (!regionSelect.dataset.sldsBound) {
        regionSelect.dataset.sldsBound = '1';
        regionSelect.addEventListener('change', function () {
          var next = searchState();
          next.region = regionSelect.value;
          saveSearchState(next);
          renderSearchAll(players, pipelineCache || []);
        });
      }
    }

    var availabilitySelect = availabilityField && availabilityField.querySelector('select');
    if (availabilitySelect) {
      var currentAvailability = state.availability;
      if (!Array.prototype.some.call(availabilitySelect.options, function (option) { return normal(option.value || option.textContent) === normal(currentAvailability); })) {
        setSelectOptions(availabilitySelect, [
          { value: 'Any', label: 'Any availability' },
          { value: 'Available', label: 'Available' },
          { value: 'Unavailable', label: 'Unavailable' }
        ], currentAvailability);
      } else {
        availabilitySelect.value = Array.prototype.find.call(availabilitySelect.options, function (option) {
          return normal(option.value || option.textContent) === normal(currentAvailability);
        }).value;
      }
      if (!availabilitySelect.dataset.sldsBound) {
        availabilitySelect.dataset.sldsBound = '1';
        availabilitySelect.addEventListener('change', function () {
          var next = searchState();
          next.availability = availabilitySelect.value;
          saveSearchState(next);
          renderSearchAll(players, pipelineCache || []);
        });
      }
    }

    var footSelect = footField && footField.querySelector('select');
    if (footSelect) {
      var desiredFoot = state.foot;
      var matchedFoot = Array.prototype.find.call(footSelect.options, function (option) {
        return normal(option.value || option.textContent) === normal(desiredFoot);
      });
      if (matchedFoot) footSelect.value = matchedFoot.value;
      if (!footSelect.dataset.sldsBound) {
        footSelect.dataset.sldsBound = '1';
        footSelect.addEventListener('change', function () {
          var next = searchState();
          next.foot = footSelect.value;
          saveSearchState(next);
          renderSearchAll(players, pipelineCache || []);
        });
      }
    }

    var minControl = minField && minField.querySelector('select,input');
    if (minControl) {
      var wantedMin = state.minOverall ? String(state.minOverall) : '';
      if (minControl.tagName === 'SELECT') {
        var matchedMin = Array.prototype.find.call(minControl.options, function (option) {
          return String(option.value) === wantedMin || normal(option.textContent).indexOf(wantedMin) === 0;
        });
        if (matchedMin) minControl.value = matchedMin.value;
        else if (!state.minOverall && minControl.options.length) minControl.selectedIndex = 0;
      } else {
        minControl.value = wantedMin;
      }
      if (!minControl.dataset.sldsBound) {
        minControl.dataset.sldsBound = '1';
        minControl.addEventListener('change', function () {
          var next = searchState();
          next.minOverall = number(minControl.value, 0);
          saveSearchState(next);
          renderSearchAll(players, pipelineCache || []);
        });
      }
    }

    var searchButton = findButton(root, 'Search');
    if (searchButton && !searchButton.dataset.sldsBound) {
      searchButton.dataset.sldsBound = '1';
      searchButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        renderSearchAll(playersCache || players, pipelineCache || []);
      }, true);
    }
  }

  function filterPlayers(players, state) {
    var list = (players || []).slice();

    if (state.positions.length) {
      list = list.filter(function (player) {
        return state.positions.indexOf(positionGroup(player)) >= 0;
      });
    }

    if (state.ageGroups.length) {
      list = list.filter(function (player) {
        return state.ageGroups.indexOf(ageGroup(player)) >= 0;
      });
    }

    if (state.region) {
      list = list.filter(function (player) {
        return normal(teamCity(player)) === normal(state.region);
      });
    }

    if (state.availability && normal(state.availability).indexOf('any') !== 0) {
      list = list.filter(function (player) {
        return normal(availability(player)) === normal(state.availability);
      });
    }

    if (state.foot && normal(state.foot) !== 'any') {
      list = list.filter(function (player) {
        return normal(foot(player)) === normal(state.foot);
      });
    }

    if (state.minOverall > 0) {
      list = list.filter(function (player) {
        return overall(player) >= state.minOverall;
      });
    }

    list.sort(function (a, b) {
      var ac = compatibility(a);
      var bc = compatibility(b);
      var aScore = ac == null ? -1 : ac;
      var bScore = bc == null ? -1 : bc;
      var diff = bScore - aScore;
      if (diff) return diff;
      diff = overall(b) - overall(a);
      if (diff) return diff;
      return playerName(a).localeCompare(playerName(b), 'en-GB', { sensitivity: 'base' });
    });

    return list;
  }

  function pipelinePlayerIds(pipeline) {
    var map = {};
    (pipeline || []).forEach(function (row) {
      var id = row && (row.player_id || row.playerId || row.players && row.players.id);
      if (id) map[String(id)] = true;
    });
    return map;
  }

  function searchResultsCard(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.card')).find(function (card) {
      var heading = card.querySelector('.card-h h3');
      return heading && /results/i.test(heading.textContent);
    }) || null;
  }

  function searchSignature(players, pipeline, state) {
    return JSON.stringify(state) + '||' +
      (players || []).map(function (player) {
        return [playerId(player), compatibility(player), overall(player), positionGroup(player), ageGroup(player), teamCity(player), availability(player), foot(player)].join(':');
      }).join('|') + '||' +
      (pipeline || []).map(function (row) { return [row.id, row.player_id, row.stage].join(':'); }).join('|');
  }

  function renderSearchRoot(root, players, pipeline) {
    var state = searchState();
    var signature = searchSignature(players, pipeline, state);
    if (root.dataset && root.dataset.sldsSearchSignature === signature) return;
    syncSearchControls(root, players, state);

    var card = searchResultsCard(root);
    if (!card) return;
    var body = card.querySelector('.card-b');
    if (!body) return;
    var sample = body.querySelector('.list-row');
    var list = filterPlayers(players, state);
    var inPipeline = pipelinePlayerIds(pipeline);

    var heading = card.querySelector('.card-h h3');
    if (heading) heading.textContent = list.length + ' results';

    if (!sample) {
      if (!list.length) body.innerHTML = '<div class="empty"><b>No players match those filters</b><p>Change one or more discovery filters and search again.</p></div>';
      return;
    }

    var template = sample.cloneNode(true);
    body.innerHTML = '';

    list.slice(0, 50).forEach(function (player) {
      var row = template.cloneNode(true);
      var id = playerId(player);
      row.dataset.playerId = id;
      row.dataset.sldsSearchResult = '1';

      var avatar = row.querySelector('.avatar');
      if (avatar) avatar.textContent = initials(playerName(player));

      var who = row.querySelector('.who');
      if (who) {
        var name = who.querySelector('b');
        var detail = who.querySelector('span');
        if (name) name.textContent = playerName(player) || 'Unnamed player';
        if (detail) {
          detail.textContent = [
            displayPosition(player),
            ageGroup(player),
            teamName(player),
            teamCity(player),
            availability(player)
          ].filter(Boolean).join(' · ');
        }
      }

      var chip = row.querySelector('.rate-chip');
      if (chip) {
        var score = compatibility(player);
        chip.classList.add('slds-compat-chip');
        chip.innerHTML = score == null
          ? '— <small>compatibility</small>'
          : Math.round(score) + ' <small>compatibility</small>';
        chip.setAttribute('aria-label', score == null ? 'Compatibility not available' : Math.round(score) + ' out of 100 compatibility');
      }

      var button = findButton(row, ['Add to pipeline', 'Added to pipeline']);
      if (button) {
        button.type = 'button';
        button.dataset.sldsPlayerId = id;
        if (inPipeline[String(id)]) {
          button.textContent = 'Added to pipeline';
          button.classList.add('slds-added');
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
        } else {
          button.textContent = 'Add to pipeline';
          button.classList.remove('slds-added');
          button.disabled = false;
          button.removeAttribute('aria-disabled');
          button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            addToPipeline(id, player);
          };
        }
      }

      row.style.cursor = 'pointer';
      row.onclick = function (event) {
        if (event.target.closest('button,a')) return;
        location.href = playerProfileUrl(id);
      };
      body.appendChild(row);
    });

    if (!list.length) {
      body.innerHTML = '<div class="empty"><b>No players match those filters</b><p>Change one or more discovery filters and search again.</p></div>';
    }
    if (root.dataset) root.dataset.sldsSearchSignature = signature;
  }

  function renderSearchAll(players, pipeline) {
    var root = shadow();
    if (!root || route() !== 'search') return;
    ensureStyle(root);
    copies(root).forEach(function (copy) {
      renderSearchRoot(copy, players || [], pipeline || []);
    });
  }

  async function addToPipeline(id, player) {
    if (!id) return;
    try {
      if (isDemo()) {
        var rows = demoPipeline();
        if (!rows.some(function (row) { return String(row.player_id) === String(id); })) {
          rows.unshift({
            id: 'demo-pipe-' + Date.now(),
            player_id: id,
            stage: 'watching',
            interest_level: 8,
            players: player,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          writeJson(sessionStorage, DEMO_PIPELINE_KEY, rows);
        }
        pipelineCache = rows;
      } else {
        await request('POST', '/api/scout-workflow-actions/interest', { playerId: id, interestLevel: 8 });
        pipelineCache = null;
        await loadPipeline(true);
      }
      renderSearchAll(playersCache || [], pipelineCache || []);
    } catch (error) {
      showToast(error.message || 'The player could not be added to your pipeline.', true);
    }
  }

  function showToast(message, isError) {
    var root = shadow();
    if (!root) return;
    var old = root.querySelector('.slds-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'slds-toast';
    node.setAttribute('role', isError ? 'alert' : 'status');
    node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:70000;max-width:min(420px,calc(100vw - 36px));padding:12px 14px;border-radius:12px;background:' + (isError ? '#96382D' : '#06201A') + ';color:#fff;font:700 12px Archivo,Arial,sans-serif;box-shadow:0 18px 45px rgba(6,32,26,.22)';
    node.textContent = message;
    root.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.remove(); }, 4000);
  }

  function fixtureById(fixtures, id) {
    return (fixtures || []).find(function (fixture) {
      return String(fixture.id || fixture.fixture_id) === String(id);
    }) || null;
  }

  function fixtureFact(label, value) {
    if (!text(value)) return '';
    return '<div class="slds-fixture-fact"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }

  function removeFixtureQuery() {
    try {
      var url = new URL(location.href);
      url.searchParams.delete('fixture');
      history.replaceState(history.state, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash);
    } catch (_) {}
  }

  function openFixtureModal(fixture) {
    var root = shadow();
    if (!root || !fixture) return;
    ensureStyle(root);
    var id = String(fixture.id || fixture.fixture_id || '');
    var existing = root.querySelector('.slds-fixture-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'slds-fixture-overlay';
    overlay.dataset.fixtureId = id;
    overlay.innerHTML =
      '<section class="slds-fixture-modal" role="dialog" aria-modal="true" aria-label="Fixture details">' +
        '<header class="slds-fixture-head">' +
          '<h3>' + esc(fixtureTitle(fixture)) + '</h3>' +
          '<button type="button" class="btn outline sm" data-slds-close-fixture>Close</button>' +
        '</header>' +
        '<div class="slds-fixture-body">' +
          '<div class="slds-fixture-grid">' +
            fixtureFact('Date', safeDate(fixture.fixture_date || fixture.date || fixture.kickoff_at || fixture.start_at)) +
            fixtureFact('Time', text(fixture.fixture_time || fixture.time)) +
            fixtureFact('Venue', text(fixture.venue_name || fixture.venue)) +
            fixtureFact('Competition', text(fixture.competition_name || fixture.competition || fixture.league_name)) +
            fixtureFact('Visit status', fixtureIsPriority(fixture) ? 'Priority visit' : text(fixture.visit_status || fixture.plan_status || fixture.status || 'Scheduled')) +
            fixtureFact('Fixture ID', id) +
          '</div>' +
          (text(fixture.objective || fixture.plan_notes || fixture.notes) ? '<div class="slds-fixture-notes"><b>Observation plan</b><br>' + esc(fixture.objective || fixture.plan_notes || fixture.notes) + '</div>' : '') +
        '</div>' +
      '</section>';

    root.appendChild(overlay);
    lastFixtureModalId = id;

    function close() {
      if (overlay.parentNode) overlay.remove();
      lastFixtureModalId = '';
      removeFixtureQuery();
    }

    overlay.querySelector('[data-slds-close-fixture]').onclick = close;
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
  }

  function bindFixtureRows(root, fixtures) {
    root.querySelectorAll('[data-fixture-id]').forEach(function (row) {
      var id = row.dataset.fixtureId;
      if (!id || row.dataset.sldsFixtureBound) return;
      row.dataset.sldsFixtureBound = '1';
      row.addEventListener('click', function (event) {
        if (event.target.closest('button,a')) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        var fixture = fixtureById(fixtures, id);
        if (!fixture) return;
        try {
          var url = new URL(location.href);
          url.searchParams.set('fixture', id);
          history.replaceState(history.state, '', url.pathname + '?' + url.searchParams.toString() + url.hash);
        } catch (_) {}
        openFixtureModal(fixture);
      }, true);
    });
  }

  function repairFixtureRoute(fixtures) {
    var root = shadow();
    if (!root || route() !== 'fixtures') return;
    ensureStyle(root);
    copies(root).forEach(function (copy) {
      bindFixtureRows(copy, fixtures);
    });

    var wanted = '';
    try { wanted = new URLSearchParams(location.search).get('fixture') || ''; } catch (_) {}
    if (!wanted || wanted === lastFixtureModalId) return;
    var fixture = fixtureById(fixtures, wanted);
    if (fixture) openFixtureModal(fixture);
  }

  async function repairDashboard() {
    var results = await Promise.all([
      loadPlayers().catch(function () { return []; }),
      loadPipeline().catch(function () { return []; }),
      loadFixtures().catch(function () { return []; })
    ]);
    var root = shadow();
    if (!root || route() !== 'dashboard') return;
    ensureStyle(root);
    var signature = dashboardSignature(results[0], results[1], results[2]);
    copies(root).forEach(function (copy) {
      if (copy.dataset && copy.dataset.sldsDashboardSignature === signature) return;
      renderDashboardPipeline(copy, results[0], results[1]);
      renderDashboardFixtures(copy, results[2]);
      if (copy.dataset) copy.dataset.sldsDashboardSignature = signature;
    });
  }

  async function repairSearch() {
    var results = await Promise.all([
      loadPlayers().catch(function () { return []; }),
      loadPipeline().catch(function () { return []; })
    ]);
    renderSearchAll(results[0], results[1]);
  }

  async function repairFixtures() {
    var fixtures = await loadFixtures().catch(function () { return []; });
    repairFixtureRoute(fixtures);
  }

  async function repair() {
    if (repairing || !relevantRoute()) return;
    var root = shadow();
    if (!root) return;
    repairing = true;
    try {
      ensureStyle(root);
      if (route() === 'dashboard') await repairDashboard();
      else if (route() === 'search') await repairSearch();
      else if (route() === 'fixtures') await repairFixtures();
    } finally {
      repairing = false;
    }
  }

  function scheduleRepair() {
    if (scheduled || repairing || !relevantRoute()) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      repair().catch(function (error) {
        if (window.console && console.warn) console.warn('[Scout dashboard/search repair]', error);
      });
    });
  }

  function attach() {
    if (!relevantRoute()) return;
    var root = shadow();
    if (!root) {
      setTimeout(attach, 60);
      return;
    }

    if (shadowObserver) shadowObserver.disconnect();
    shadowObserver = new MutationObserver(function () {
      scheduleRepair();
    });
    shadowObserver.observe(root, { childList: true, subtree: true });
    scheduleRepair();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
  window.addEventListener('pageshow', scheduleRepair);
}());

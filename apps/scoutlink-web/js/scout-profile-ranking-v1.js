'use strict';

/* Scout Player Profile + Rankings behaviour repair. Keeps Scout Desk/Field markup intact. */
(function () {
  if (window.__SCOUT_PROFILE_RANKING_V1__) return;
  window.__SCOUT_PROFILE_RANKING_V1__ = true;

  var VERSION = '20260822.1';
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var STYLE_ID = 'scoutProfileRankingV1Style';
  var MODAL_ID = 'scoutProfileRankingV1Modal';
  var NOTES_KEY = 'sl_demo_player_notes_v3';
  var playersCache = null;
  var profileCache = null;
  var rootObserver = null;
  var scheduled = false;
  var repairing = false;

  var POSITION_ALIASES = {
    CDM: 'DM', CAM: 'AM', RCM: 'CM', LCM: 'CM', RDM: 'DM', LDM: 'DM',
    RAM: 'AM', LAM: 'AM', LS: 'ST', RS: 'ST', SS: 'CF', B2B: 'CM',
    BPD: 'CB', RCB: 'CB', LCB: 'CB', SW: 'CB'
  };

  var POSITION_GROUPS = {
    Goalkeeper: ['GK'],
    Defender: ['RB', 'CB', 'LB', 'RWB', 'LWB'],
    Midfielder: ['DM', 'CM', 'AM', 'RM', 'LM'],
    Attacker: ['RW', 'LW', 'CF', 'ST']
  };

  var GENERAL_ATTRIBUTES = [
    'overall_rating',
    'first_touch',
    'passing',
    'dribbling',
    'weak_foot',
    'awareness',
    'decision_making',
    'pace',
    'agility_balance',
    'strength',
    'stamina',
    'composure',
    'coachability',
    'response_to_mistakes'
  ];

  var POSITION_ATTRIBUTES = {
    Goalkeeper: [
      'gk_positioning',
      'gk_shot_stopping',
      'gk_reflexes',
      'gk_handling',
      'gk_one_v_one',
      'gk_aerial_command',
      'gk_kicking',
      'gk_sweeping',
      'gk_distribution',
      'gk_communication',
      'gk_decision_making',
      'gk_composure',
      'gk_agility_explosiveness'
    ],
    Defender: [
      'one_v_one_defending',
      'tackling',
      'defending',
      'defensive_positioning',
      'marking_covering',
      'anticipation_interceptions',
      'aerial_defending',
      'heading',
      'recovery_defending',
      'pressing_defensive_transition',
      'communication_organisation',
      'progression_from_defence',
      'crossing_attacking_support',
      'crossing'
    ],
    Midfielder: [
      'receiving_under_pressure',
      'ball_retention',
      'progressive_passing',
      'passing',
      'long_passing_switching',
      'tempo_control',
      'chance_creation',
      'vision',
      'anticipation_interceptions',
      'defensive_positioning_covering',
      'pressing_counter_pressing',
      'off_ball_movement_box_arrivals',
      'positioning'
    ],
    Attacker: [
      'finishing',
      'shooting',
      'attacking_movement',
      'one_v_one_attacking',
      'runs_in_behind',
      'chance_creation',
      'crossing',
      'link_up_play',
      'hold_up_play',
      'aerial_ability',
      'heading',
      'pressing_from_front',
      'positioning'
    ]
  };

  var ATTRIBUTE_LABELS = {
    overall_rating: 'Overall rating',
    first_touch: 'First touch',
    passing: 'Passing',
    dribbling: 'Dribbling',
    weak_foot: 'Weak foot',
    awareness: 'Awareness',
    decision_making: 'Decision making',
    pace: 'Pace',
    agility_balance: 'Agility & balance',
    agility: 'Agility',
    strength: 'Strength',
    stamina: 'Stamina',
    composure: 'Composure',
    coachability: 'Coachability',
    response_to_mistakes: 'Response to mistakes',
    gk_positioning: 'Positioning',
    gk_shot_stopping: 'Shot stopping',
    gk_reflexes: 'Reflexes',
    gk_handling: 'Handling',
    gk_one_v_one: '1v1',
    gk_aerial_command: 'Aerial command',
    gk_kicking: 'Kicking',
    gk_sweeping: 'Sweeping',
    gk_distribution: 'Distribution',
    gk_communication: 'Communication',
    gk_decision_making: 'Decision making',
    gk_composure: 'Composure',
    gk_agility_explosiveness: 'Agility & explosiveness',
    one_v_one_defending: '1v1 defending',
    tackling: 'Tackling',
    defending: 'Defending',
    defensive_positioning: 'Defensive positioning',
    marking_covering: 'Marking & covering',
    anticipation_interceptions: 'Anticipation & interceptions',
    aerial_defending: 'Aerial defending',
    heading: 'Heading',
    recovery_defending: 'Recovery defending',
    pressing_defensive_transition: 'Pressing & defensive transition',
    communication_organisation: 'Communication & organisation',
    progression_from_defence: 'Progression from defence',
    crossing_attacking_support: 'Crossing & attacking support',
    receiving_under_pressure: 'Receiving under pressure',
    ball_retention: 'Ball retention',
    progressive_passing: 'Progressive passing',
    long_passing_switching: 'Long passing & switching',
    tempo_control: 'Tempo control',
    chance_creation: 'Chance creation',
    vision: 'Vision',
    defensive_positioning_covering: 'Defensive positioning & covering',
    pressing_counter_pressing: 'Pressing & counter-pressing',
    off_ball_movement_box_arrivals: 'Off-ball movement & box arrivals',
    finishing: 'Finishing',
    shooting: 'Shooting',
    attacking_movement: 'Attacking movement',
    one_v_one_attacking: '1v1 attacking',
    runs_in_behind: 'Runs in behind',
    crossing: 'Crossing',
    link_up_play: 'Link-up play',
    hold_up_play: 'Hold-up play',
    aerial_ability: 'Aerial ability',
    pressing_from_front: 'Pressing from front',
    positioning: 'Positioning'
  };

  var RANKING_METRICS = [
    'Overall rating',
    'Development potential',
    'Goals',
    'Goals per game',
    'Assists',
    'Assists per game',
    'Clean sheets',
    'Clean sheets per game',
    'Appearances',
    'Financial value'
  ];

  function normal(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, '&#96;');
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp100(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric >= 0 && numeric <= 10) numeric *= 10;
    return Math.max(0, Math.min(100, numeric));
  }

  function titleCaseKey(value) {
    if (ATTRIBUTE_LABELS[value]) return ATTRIBUTE_LABELS[value];
    return String(value || '')
      .replace(/^gk_/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function token() {
    try { return localStorage.getItem('sl_token') || ''; } catch (_) { return ''; }
  }

  function apiBase() {
    try {
      return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, '');
    } catch (_) { return API_FALLBACK; }
  }

  function role() {
    try {
      return normal(
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') ||
        sessionStorage.getItem('demoRole') ||
        localStorage.getItem('sl_type') ||
        (window.Auth && window.Auth.type) || ''
      );
    } catch (_) { return ''; }
  }

  function isDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        localStorage.getItem('sl_demo_mode') === '1' ||
        token() === 'public-demo-session';
    } catch (_) { return false; }
  }

  function pathName() {
    return String(location.pathname || '').toLowerCase();
  }

  function route() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return normal(declared);
    if (/\/player\/profile(?:\/|$)/.test(pathName()) || pathName().indexOf('player-profile') >= 0) return 'profile';
    if (/\/scout\/rankings(?:\/|$)/.test(pathName()) || pathName().indexOf('scout-rankings') >= 0) return 'rankings';
    return '';
  }

  function isScoutContext() {
    var activeRole = role();
    var path = pathName();
    return activeRole === 'scout' || path.indexOf('/scout') === 0 ||
      path.indexOf('/public-demo/scout') === 0 ||
      ((route() === 'profile') && activeRole !== 'coach' && activeRole !== 'player');
  }

  async function request(method, pathname, body, auth) {
    if (typeof window.api === 'function') {
      try { return await window.api(method, pathname, body); } catch (_) {}
    }

    var headers = { Accept: 'application/json' };
    var accessToken = token();
    if (auth !== false && accessToken) headers.Authorization = 'Bearer ' + accessToken;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + pathname, {
      method: method,
      headers: headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined || body === null ? undefined : JSON.stringify(body)
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || payload.message || 'Request failed.');
    return payload;
  }

  function appHost() {
    return document.getElementById('scoutExperienceApp') || document.getElementById('profileRouteRoot');
  }

  function shadow() {
    var host = appHost();
    return host && host.shadowRoot;
  }

  function q(root, selector) {
    return (root || shadow() || document).querySelector(selector);
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || shadow() || document).querySelectorAll(selector));
  }

  function visibleRoot(root) {
    root = root || shadow();
    if (!root) return null;
    var mobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var selectors = mobile
      ? ['.slv9-mobile-copy','.slv10-mobile-copy','.field-copy','[data-layout="mobile"]']
      : ['.slv9-desktop-copy','.slv10-desktop-copy','.desk-copy','[data-layout="desktop"]'];
    for (var i = 0; i < selectors.length; i += 1) {
      var exact = q(root, selectors[i]);
      if (exact) return exact;
    }
    return q(root, 'main,.page,.screen,.shell,.slv9-exact-root,.slv10-exact-root') || root;
  }

  function ensureStyles(root) {
    if (!root || q(root, '#' + STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '[data-spr-hidden="1"]{display:none!important}',
      '.spr-section{margin-top:16px;border:1px solid #DCE3DE;border-radius:16px;background:#fff;overflow:hidden}',
      '.spr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #EBEFEC}',
      '.spr-head h3{margin:0;font:800 15px Archivo,Arial,sans-serif;color:#0C201A}',
      '.spr-head span{font:600 10px "IBM Plex Mono",monospace;color:#7C8A82}',
      '.spr-body{padding:16px}',
      '.spr-sub{margin:0 0 10px;font:800 11px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:#617168}',
      '.spr-sub + .spr-row{border-top:0}',
      '.spr-row{display:grid;grid-template-columns:minmax(120px,1fr) minmax(120px,3fr) 42px;gap:12px;align-items:center;padding:9px 0;border-top:1px solid #EEF1EF}',
      '.spr-row:first-child{border-top:0}',
      '.spr-label{min-width:0;font:700 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.spr-label small{display:block;margin-top:3px;font:600 10px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.spr-track{height:7px;border-radius:99px;background:#E9EFEB;overflow:hidden}',
      '.spr-fill{height:100%;border-radius:99px;background:#075F48}',
      '.spr-score{font:700 10px "IBM Plex Mono",monospace;text-align:right;color:#0C201A}',
      '.spr-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.spr-btn{appearance:none;border:1px solid #D8E0DB;border-radius:10px;background:#fff;color:#0C201A;padding:9px 11px;font:800 11px Archivo,Arial,sans-serif;cursor:pointer;text-decoration:none}',
      '.spr-btn.primary{background:#075F48;border-color:#075F48;color:#fff}',
      '.spr-evidence{display:grid;gap:9px}',
      '.spr-evidence-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #E7ECE8;border-radius:12px;padding:12px}',
      '.spr-evidence-row b{display:block;font:800 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.spr-evidence-row span{display:block;margin-top:3px;font:500 11px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.spr-empty{font:600 12px/1.5 Archivo,Arial,sans-serif;color:#7C8A82;padding:4px 0}',
      '.spr-note-form{display:grid;gap:10px;margin-bottom:14px}',
      '.spr-note-form textarea{width:100%;min-height:104px;box-sizing:border-box;border:1px solid #D8E0DB;border-radius:10px;padding:11px 12px;font:500 13px/1.45 Archivo,Arial,sans-serif;color:#0C201A;resize:vertical;background:#fff}',
      '.spr-note-list{display:grid;gap:8px}',
      '.spr-note{border:1px solid #E7ECE8;border-radius:12px;padding:11px}',
      '.spr-note p{margin:0;font:500 12px/1.5 Archivo,Arial,sans-serif;color:#33443C}',
      '.spr-note small{display:block;margin-top:7px;font:600 9px "IBM Plex Mono",monospace;color:#89958E}',
      '.spr-team-link{display:inline-flex;align-items:center;gap:6px;margin-top:8px}',
      '.spr-ranking-empty{padding:18px 16px;font:600 12px Archivo,Arial,sans-serif;color:#7C8A82}',
      '@media(max-width:767px){.spr-row{grid-template-columns:minmax(105px,1.15fr) minmax(90px,2.25fr) 34px;gap:8px}.spr-body{padding:13px}.spr-actions{display:grid;grid-template-columns:1fr}.spr-btn{width:100%;box-sizing:border-box;text-align:center}}'
    ].join('');
    root.appendChild(style);
  }

  function ensureModalStyles() {
    if (document.getElementById(STYLE_ID + 'Modal')) return;
    var style = document.createElement('style');
    style.id = STYLE_ID + 'Modal';
    style.textContent = [
      '#'+MODAL_ID+'{position:fixed;inset:0;z-index:1000000;background:rgba(6,32,26,.66);display:grid;place-items:center;padding:18px;font-family:Archivo,Arial,sans-serif}',
      '#'+MODAL_ID+' .spr-modal{width:min(820px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.3)}',
      '#'+MODAL_ID+' .spr-modal-head{position:sticky;top:0;z-index:2;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #EBEFEC}',
      '#'+MODAL_ID+' .spr-modal-head h2{margin:0;font-size:16px;color:#0C201A}',
      '#'+MODAL_ID+' .spr-close{border:1px solid #D8E0DB;border-radius:9px;background:#fff;padding:8px 10px;font-weight:800;cursor:pointer}',
      '#'+MODAL_ID+' .spr-modal-body{padding:16px}',
      '#'+MODAL_ID+' .spr-modal-list{display:grid;gap:10px}',
      '#'+MODAL_ID+' .spr-modal-card{border:1px solid #E7ECE8;border-radius:13px;padding:13px;background:#fff}',
      '#'+MODAL_ID+' .spr-modal-card h3{margin:0;font-size:13px;color:#0C201A}',
      '#'+MODAL_ID+' .spr-modal-card p{margin:6px 0 0;font-size:12px;line-height:1.5;color:#536159}',
      '#'+MODAL_ID+' video{display:block;width:100%;max-height:500px;margin-top:10px;border-radius:11px;background:#000}',
      '#'+MODAL_ID+' .spr-watch{display:inline-block;margin-top:10px;border:1px solid #075F48;border-radius:9px;background:#075F48;color:#fff;padding:8px 10px;font-size:11px;font-weight:800;text-decoration:none}',
      '@media(max-width:767px){#'+MODAL_ID+'{padding:8px}#'+MODAL_ID+' .spr-modal{max-height:calc(100dvh - 16px);border-radius:14px}}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function openModal(title, bodyHtml) {
    ensureModalStyles();
    var old = document.getElementById(MODAL_ID);
    if (old) old.remove();
    var host = document.createElement('div');
    host.id = MODAL_ID;
    host.innerHTML = '<section class="spr-modal" role="dialog" aria-modal="true" aria-label="' + escAttr(title) + '">' +
      '<header class="spr-modal-head"><h2>' + esc(title) + '</h2><button class="spr-close" type="button" data-spr-close>Close</button></header>' +
      '<div class="spr-modal-body">' + bodyHtml + '</div></section>';
    document.body.appendChild(host);
    var close = host.querySelector('[data-spr-close]');
    if (close) close.onclick = function () { host.remove(); };
    host.addEventListener('click', function (event) { if (event.target === host) host.remove(); });
    return host;
  }

  function unwrapList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.players)) return payload.players;
    if (payload.data && Array.isArray(payload.data.players)) return payload.data.players;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    return [];
  }

  function playerId(player) {
    return player && (player.id || player.player_id || player.playerId) || '';
  }

  function playerName(player) {
    if (!player) return 'Player';
    return [player.first_name, player.last_name].filter(Boolean).join(' ') ||
      player.full_name || player.name || player.display_name || 'Player';
  }

  function canonicalPosition(value) {
    var position = String(value || '').trim().toUpperCase();
    return POSITION_ALIASES[position] || position;
  }

  function playerPosition(player) {
    if (!player) return '';
    return canonicalPosition(
      player.specific_position || player.primary_position || player.primaryPosition ||
      (Array.isArray(player.positions) && player.positions[0]) || player.position || ''
    );
  }

  function positionGroup(player) {
    var rawGroup = player && (player.position_group || player.positionGroup);
    if (rawGroup) {
      var normalizedRaw = normal(rawGroup);
      if (normalizedRaw.indexOf('goal') >= 0) return 'Goalkeeper';
      if (normalizedRaw.indexOf('def') >= 0) return 'Defender';
      if (normalizedRaw.indexOf('mid') >= 0) return 'Midfielder';
      if (normalizedRaw.indexOf('att') >= 0 || normalizedRaw.indexOf('forward') >= 0 || normalizedRaw.indexOf('striker') >= 0) return 'Attacker';
    }
    var position = playerPosition(player);
    var groups = Object.keys(POSITION_GROUPS);
    for (var i = 0; i < groups.length; i += 1) {
      if (POSITION_GROUPS[groups[i]].indexOf(position) >= 0) return groups[i];
    }
    return 'Attacker';
  }

  function normalisePlayerRow(row) {
    var player = row && row.player ? Object.assign({}, row.player, row) : Object.assign({}, row || {});
    if (row && row.player) delete player.player;
    if (player.compatibilityScore == null) {
      player.compatibilityScore = row && (
        row.compatibility_score != null ? row.compatibility_score :
        row.overall_score != null ? row.overall_score : null
      );
    }
    return player;
  }

  async function loadPlayers(force) {
    if (playersCache && !force) return playersCache;

    var endpoints = isDemo()
      ? ['/api/scout-intelligence-v64/public-demo/players','/api/players/public-demo']
      : ['/api/scout-intelligence-v64/players','/api/scout-intelligence-v64/compatibility?limit=300','/api/players?status=Active'];

    var lastError = null;
    for (var i = 0; i < endpoints.length; i += 1) {
      try {
        var payload = await request('GET', endpoints[i], null, !isDemo());
        var rows = unwrapList(payload).map(normalisePlayerRow).filter(function (player) { return !!playerId(player); });
        if (rows.length) {
          playersCache = rows;
          return rows;
        }
      } catch (error) { lastError = error; }
    }

    try {
      if (typeof window.getDemoState === 'function') {
        var demo = window.getDemoState() || {};
        var demoRows = (demo.players || []).map(normalisePlayerRow).filter(function (player) { return !!playerId(player); });
        if (demoRows.length) {
          playersCache = demoRows;
          return demoRows;
        }
      }
    } catch (_) {}

    if (lastError) throw lastError;
    playersCache = [];
    return playersCache;
  }

  function profileId() {
    var params = new URLSearchParams(location.search);
    return params.get('id') || params.get('playerId') || params.get('player') || '';
  }

  async function loadProfile(force) {
    var id = profileId();
    if (!id) throw new Error('Player ID is missing.');
    if (profileCache && !force && String(playerId(profileCache.player || profileCache)) === String(id)) return profileCache;

    var endpoint = isDemo()
      ? '/api/scout-intelligence-v64/public-demo/player/' + encodeURIComponent(id)
      : '/api/scout-intelligence-v64/player/' + encodeURIComponent(id);

    try {
      var payload = await request('GET', endpoint, null, !isDemo());
      profileCache = payload.data || payload;
      if (!profileCache.player) profileCache.player = profileCache;
      return profileCache;
    } catch (profileError) {
      var players = await loadPlayers(false);
      var fallback = players.find(function (player) { return String(playerId(player)) === String(id); });
      if (!fallback) throw profileError;
      profileCache = { player: fallback, recentMatches: fallback._facts || [], videos: fallback.player_videos || fallback.videos || [] };
      return profileCache;
    }
  }

  function valueFromContainers(player, key) {
    if (!player) return null;
    var aliases = {
      agility_balance: ['agility_balance','agility'],
      awareness: ['awareness','positioning'],
      decision_making: ['decision_making','decisionMaking'],
      gk_shot_stopping: ['gk_shot_stopping','gk_diving'],
      gk_one_v_one: ['gk_one_v_one','gk_reflexes'],
      gk_aerial_command: ['gk_aerial_command','gk_handling'],
      gk_agility_explosiveness: ['gk_agility_explosiveness','gk_reflexes'],
      defensive_positioning: ['defensive_positioning','positioning'],
      marking_covering: ['marking_covering','defending'],
      anticipation_interceptions: ['anticipation_interceptions','defending'],
      aerial_defending: ['aerial_defending','heading'],
      recovery_defending: ['recovery_defending','pace'],
      pressing_defensive_transition: ['pressing_defensive_transition','stamina'],
      communication_organisation: ['communication_organisation','composure'],
      progression_from_defence: ['progression_from_defence','passing'],
      crossing_attacking_support: ['crossing_attacking_support','crossing'],
      receiving_under_pressure: ['receiving_under_pressure','composure'],
      ball_retention: ['ball_retention','dribbling'],
      progressive_passing: ['progressive_passing','passing'],
      long_passing_switching: ['long_passing_switching','passing'],
      tempo_control: ['tempo_control','composure'],
      chance_creation: ['chance_creation','vision'],
      defensive_positioning_covering: ['defensive_positioning_covering','positioning'],
      pressing_counter_pressing: ['pressing_counter_pressing','stamina'],
      off_ball_movement_box_arrivals: ['off_ball_movement_box_arrivals','positioning'],
      finishing: ['finishing','shooting'],
      attacking_movement: ['attacking_movement','positioning'],
      one_v_one_attacking: ['one_v_one_attacking','dribbling'],
      runs_in_behind: ['runs_in_behind','pace'],
      link_up_play: ['link_up_play','passing'],
      hold_up_play: ['hold_up_play','strength'],
      aerial_ability: ['aerial_ability','heading'],
      pressing_from_front: ['pressing_from_front','stamina']
    };

    var keys = aliases[key] || [key];
    var containers = [
      player.attribute_ratings,
      player.attributeRatings,
      player.attributes,
      player.ratings,
      player.assessments,
      player
    ].filter(Boolean);

    for (var k = 0; k < keys.length; k += 1) {
      for (var c = 0; c < containers.length; c += 1) {
        var raw = containers[c][keys[k]];
        if (raw && typeof raw === 'object') {
          raw = raw.score != null ? raw.score : raw.rating != null ? raw.rating : raw.value != null ? raw.value : raw.overall;
        }
        var score = clamp100(raw);
        if (score != null) return score;
      }
    }
    return null;
  }

  function matchBand(score) {
    if (score == null) return 'Not available';
    if (score >= 85) return 'Strong match';
    if (score >= 72) return 'Good match';
    if (score >= 60) return 'Moderate match';
    if (score >= 45) return 'Weak match';
    return 'Poor match';
  }

  function meterRow(label, score, status) {
    var usable = score == null ? 0 : Math.max(0, Math.min(100, score));
    return '<div class="spr-row"><div class="spr-label">' + esc(label) +
      (status ? '<small>' + esc(status) + '</small>' : '') +
      '</div><div class="spr-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      esc(score == null ? '0' : Math.round(usable)) + '"><div class="spr-fill" style="width:' + usable + '%"></div></div>' +
      '<div class="spr-score">' + esc(score == null ? '—' : Math.round(score)) + '</div></div>';
  }

  function section(root, key, title, subtitle, bodyHtml) {
    var existing = q(root, '[data-spr-section="' + key + '"]');
    if (existing) existing.remove();
    var node = document.createElement('section');
    node.className = 'spr-section';
    node.setAttribute('data-spr-section', key);
    node.innerHTML = '<header class="spr-head"><h3>' + esc(title) + '</h3>' +
      (subtitle ? '<span>' + esc(subtitle) + '</span>' : '') +
      '</header><div class="spr-body">' + bodyHtml + '</div>';
    var target = qa(root, 'main,.main,.content,.page,.screen').find(function (candidate) {
      var copy = normal(candidate.textContent);
      return copy.indexOf('player') >= 0 || copy.indexOf('overall') >= 0;
    }) || root;
    target.appendChild(node);
    return node;
  }

  function hideLegacyRepairSections(root) {
    qa(root, '[data-slfr2-profile-section="attributes"],[data-slfr2-profile-section="evidence"],[data-slfr2-profile-section="notes"]').forEach(function (node) {
      node.setAttribute('data-spr-hidden', '1');
      node.setAttribute('aria-hidden', 'true');
    });

    qa(root, '.card,section').forEach(function (node) {
      if (node.hasAttribute('data-spr-section')) return;
      var heading = q(node, 'h1,h2,h3,h4,.card-h,.card-title');
      var copy = normal(heading ? heading.textContent : '');
      if (/^(goalkeeper|defender|midfielder|attacker) attributes$/.test(copy) || copy === 'attribute profile') {
        node.setAttribute('data-spr-hidden', '1');
        node.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function removeSpuriousNotFound(root) {
    var hasProfileContent = qa(root, 'h1,h2,h3,b,strong').some(function (node) {
      var copy = normal(node.textContent);
      return copy && copy !== 'not found' && (copy.indexOf('player') >= 0 || copy.indexOf('overall') >= 0 || copy.indexOf('compatibility') >= 0);
    });
    if (!hasProfileContent) return;

    qa(root, '[role="alert"],.alert,.error,.error-message,.state-message,.notice,.toast,p,span,div').forEach(function (node) {
      if (node.children && node.children.length > 2) return;
      var copy = normal(node.textContent).replace(/^\*+|\*+$/g, '').trim();
      if (copy === 'not found' || copy === 'player not found') {
        node.setAttribute('data-spr-hidden', '1');
        node.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function fixOverallSuffix(root, player) {
    var overall = Math.round(num(player.overall_rating != null ? player.overall_rating : player.overallRating, NaN));
    var smalls = qa(root, 'small,span');
    var fixed = false;

    smalls.forEach(function (node) {
      if (fixed || normal(node.textContent) !== '/100') return;
      var parent = node.parentElement;
      var parentCopy = normal(parent && parent.textContent);
      var cardCopy = normal((parent && parent.closest('.card,section,.hero,.profile-head,.topline'))?.textContent || '');
      var numberMatches = Number.isFinite(overall) && parentCopy.indexOf(String(overall)) >= 0;
      var overallContext = cardCopy.indexOf('overall') >= 0 && cardCopy.indexOf('compatibility breakdown') < 0;
      if (numberMatches || overallContext) {
        node.textContent = 'overall';
        fixed = true;
      }
    });

    if (!fixed && Number.isFinite(overall)) {
      qa(root, '.rate-chip,.score,.rating,.overall-score').some(function (node) {
        var copy = normal(node.textContent);
        if (copy.indexOf(String(overall)) >= 0 && copy.indexOf('/100') >= 0) {
          node.innerHTML = node.innerHTML.replace(/\/100/g, 'overall');
          fixed = true;
          return true;
        }
        return false;
      });
    }
  }

  function compatibilityItems(player, bundle) {
    var result = [];
    var seen = {};
    var overall = clamp100(
      player.compatibilityScore != null ? player.compatibilityScore :
      player.compatibility_score != null ? player.compatibility_score :
      bundle.compatibilityScore != null ? bundle.compatibilityScore : null
    );

    function add(label, value, status) {
      var score = clamp100(value);
      if (score == null) return;
      var key = normal(label);
      if (!key || seen[key]) return;
      seen[key] = true;
      result.push({ label: label, score: score, status: status || matchBand(score) });
    }

    add('Overall compatibility', overall, matchBand(overall));

    var sources = [
      player.compatibilityBreakdown,
      player.compatibility_breakdown,
      player.compatibility,
      player._analysis && player._analysis.compatibilityBreakdown,
      player._analysis && player._analysis.compatibility,
      bundle.compatibilityBreakdown,
      bundle.compatibility,
      bundle.analysis && bundle.analysis.compatibilityBreakdown
    ].filter(Boolean);

    var preferredLabels = {
      teamWeaknessFit: 'Team weakness fit', team_weakness_fit: 'Team weakness fit',
      roleFit: 'Role fit', role_fit: 'Role fit',
      tacticalStyleFit: 'Playing style fit', tactical_style_fit: 'Playing style fit',
      styleFit: 'Playing style fit', style_fit: 'Playing style fit',
      longTermFit: 'Long-term fit', long_term_fit: 'Long-term fit',
      developmentPathwayFit: 'Development pathway fit', development_pathway_fit: 'Development pathway fit',
      formationPositionFit: 'Formation fit', formation_position_fit: 'Formation fit',
      formationFit: 'Formation fit', formation_fit: 'Formation fit',
      positionFit: 'Position fit', position_fit: 'Position fit'
    };

    sources.forEach(function (source) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      Object.keys(source).forEach(function (key) {
        var raw = source[key];
        if (raw && typeof raw === 'object') {
          raw = raw.score != null ? raw.score : raw.value != null ? raw.value : raw.rating != null ? raw.rating : null;
        }
        if (!Number.isFinite(Number(raw))) return;
        if (/confidence|evidence|financial|weight|coverage/i.test(key)) return;
        add(preferredLabels[key] || titleCaseKey(key), raw);
      });
    });

    return result;
  }

  function renderCompatibility(root, player, bundle) {
    var items = compatibilityItems(player, bundle);
    if (!items.length) return;

    qa(root, '.card,section').forEach(function (node) {
      if (node.hasAttribute('data-spr-section')) return;
      var heading = q(node, 'h1,h2,h3,h4,.card-h,.card-title');
      var copy = normal(heading ? heading.textContent : '');
      if (copy.indexOf('compatibility breakdown') >= 0) {
        node.setAttribute('data-spr-hidden', '1');
        node.setAttribute('aria-hidden', 'true');
      }
    });

    section(
      root,
      'compatibility',
      'Compatibility breakdown',
      'Scored out of 100',
      items.map(function (item) { return meterRow(item.label, item.score, item.status); }).join('')
    );
  }

  function renderAttributes(root, player) {
    hideLegacyRepairSections(root);
    var group = positionGroup(player);
    var position = playerPosition(player);

    var generalRows = GENERAL_ATTRIBUTES.map(function (key) {
      return meterRow(titleCaseKey(key), valueFromContainers(player, key), '');
    }).join('');

    var positionRows = (POSITION_ATTRIBUTES[group] || []).map(function (key) {
      return meterRow(titleCaseKey(key), valueFromContainers(player, key), '');
    }).join('');

    section(
      root,
      'attributes',
      'Attribute profile',
      (position ? position + ' · ' : '') + group,
      '<h4 class="spr-sub">Overall attributes</h4>' + generalRows +
      '<h4 class="spr-sub" style="margin-top:20px">' + esc(group) + ' attributes</h4>' + positionRows
    );
  }

  function safeArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    if (typeof value === 'object') return Object.values(value).filter(Boolean);
    return [value];
  }

  function matchTitle(match, index) {
    var opponent = match.opponent_name || match.opponentName || match.opponent || match.opposition || '';
    var home = match.home_team_name || match.homeTeamName || match.home_team || match.homeTeam || '';
    var away = match.away_team_name || match.awayTeamName || match.away_team || match.awayTeam || '';
    if (home && away) return home + ' vs ' + away;
    if (opponent) return 'vs ' + opponent;
    return match.fixture_name || match.fixtureName || match.competition || ('Match ' + (index + 1));
  }

  function matchDetails(match) {
    var parts = [];
    var date = match.match_date || match.matchDate || match.date || match.played_at || match.playedAt;
    if (date) {
      var parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) parts.push(parsed.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}));
    }
    var score = match.score || match.result || match.final_score || match.finalScore;
    if (!score) {
      var homeGoals = match.home_goals != null ? match.home_goals : match.homeGoals;
      var awayGoals = match.away_goals != null ? match.away_goals : match.awayGoals;
      if (homeGoals != null && awayGoals != null) score = homeGoals + '–' + awayGoals;
    }
    if (score) parts.push(String(score));
    if (match.minutes != null || match.minutes_played != null) parts.push((match.minutes != null ? match.minutes : match.minutes_played) + ' mins');
    if (match.goals != null) parts.push(match.goals + ' goal' + (Number(match.goals) === 1 ? '' : 's'));
    if (match.assists != null) parts.push(match.assists + ' assist' + (Number(match.assists) === 1 ? '' : 's'));
    if (match.clean_sheet || match.cleanSheet) parts.push('Clean sheet');
    var rating = match.overall_rating != null ? match.overall_rating : match.overallRating;
    if (rating != null) {
      var normalized = clamp100(rating);
      if (normalized != null) parts.push(Math.round(normalized) + ' overall');
    }
    return parts.join(' · ');
  }

  function openMatches(matches) {
    var list = safeArray(matches);
    if (!list.length) {
      openModal('Match facts', '<div class="spr-empty">No match facts have been recorded for this player yet.</div>');
      return;
    }
    var html = '<div class="spr-modal-list">' + list.map(function (match, index) {
      var contribution = match.contribution || match.contributions || match.summary || match.notes || '';
      if (contribution && typeof contribution === 'object') contribution = JSON.stringify(contribution);
      return '<article class="spr-modal-card"><h3>' + esc(matchTitle(match, index)) + '</h3><p>' +
        esc(matchDetails(match) || 'Match recorded') +
        (contribution ? '<br>' + esc(String(contribution)) : '') +
        '</p></article>';
    }).join('') + '</div>';
    openModal('Match facts', html);
  }

  function videoUrl(video) {
    return video && (video.video_url || video.videoUrl || video.url || video.file_url || video.fileUrl || video.cloudinary_url || video.src) || '';
  }

  function videoTitle(video, index) {
    return video && (video.title || video.name || video.label || video.fixture_name || video.fixtureName) || ('Video ' + (index + 1));
  }

  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg)(?:\?|#|$)/i.test(url) || /^blob:/i.test(url) || /^data:video\//i.test(url);
  }

  function openVideos(videos) {
    var list = safeArray(videos);
    if (!list.length) {
      openModal('Video reels', '<div class="spr-empty">No video reels have been uploaded for this player yet.</div>');
      return;
    }
    var html = '<div class="spr-modal-list">' + list.map(function (video, index) {
      var url = videoUrl(video);
      var meta = [video.category, video.fixture_name || video.fixtureName, video.created_at || video.createdAt].filter(Boolean).join(' · ');
      var media = '';
      if (url && isDirectVideo(url)) {
        media = '<video controls playsinline preload="metadata" src="' + escAttr(url) + '"></video>';
      } else if (url) {
        media = '<a class="spr-watch" href="' + escAttr(url) + '" target="_blank" rel="noopener noreferrer">Watch video ↗</a>';
      }
      return '<article class="spr-modal-card"><h3>' + esc(videoTitle(video, index)) + '</h3>' +
        (meta ? '<p>' + esc(meta) + '</p>' : '') + media + '</article>';
    }).join('') + '</div>';
    openModal('Video reels', html);
  }

  async function loadExtraVideos(id, bundle, player) {
    var seeded = safeArray(bundle.videos || bundle.videoEvidence || bundle.video_evidence || player.player_videos || player.videos);
    if (seeded.length) return seeded;
    try {
      var payload = await request('GET', '/api/players/' + encodeURIComponent(id) + '/videos', null, !isDemo());
      return unwrapList(payload);
    } catch (_) { return seeded; }
  }

  function demoNotes(id) {
    try {
      var all = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') || {};
      return Array.isArray(all[id]) ? all[id] : [];
    } catch (_) { return []; }
  }

  function saveDemoNote(id, note) {
    try {
      var all = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') || {};
      all[id] = Array.isArray(all[id]) ? all[id] : [];
      all[id].unshift(note);
      localStorage.setItem(NOTES_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  async function loadNotes(id) {
    if (isDemo()) return demoNotes(id);
    var payload = await request('GET', '/api/scout-workflow-actions/players/' + encodeURIComponent(id) + '/workflow');
    var rows = payload.workflow || payload.data || [];
    return safeArray(rows).filter(function (row) {
      return normal(row.entry_type || row.entryType || 'note') === 'note';
    });
  }

  async function createNote(id, content) {
    if (isDemo()) {
      var row = { id: 'demo-note-' + Date.now(), entry_type: 'note', content: content, created_at: new Date().toISOString() };
      saveDemoNote(id, row);
      return row;
    }
    return request('POST', '/api/scout-workflow-actions/players/' + encodeURIComponent(id) + '/workflow', {
      entryType: 'note',
      content: content,
      metadata: { source: 'scout_player_profile' }
    });
  }

  function notesHtml(notes) {
    var list = safeArray(notes);
    if (!list.length) return '<div class="spr-empty">No Scout notes have been added yet.</div>';
    return '<div class="spr-note-list">' + list.map(function (note) {
      var created = note.created_at || note.createdAt;
      var when = '';
      if (created) {
        var date = new Date(created);
        if (!Number.isNaN(date.getTime())) when = date.toLocaleString('en-GB');
      }
      return '<article class="spr-note"><p>' + esc(note.content || note.note || note.body || '') + '</p>' +
        (when ? '<small>' + esc(when) + '</small>' : '') + '</article>';
    }).join('') + '</div>';
  }

  function evidenceSection(root, player, matches, videos, notes) {
    var node = section(
      root,
      'evidence',
      'Evidence',
      'Scout workspace',
      '<div class="spr-evidence">' +
        '<div class="spr-evidence-row"><div><b>Match facts</b><span>' + matches.length + ' recorded match' + (matches.length === 1 ? '' : 'es') + '</span></div><button class="spr-btn" type="button" data-spr-evidence="matches">Open</button></div>' +
        '<div class="spr-evidence-row"><div><b>Video reels</b><span>' + videos.length + ' available video' + (videos.length === 1 ? '' : 's') + '</span></div><button class="spr-btn" type="button" data-spr-evidence="videos">Watch</button></div>' +
        '<div class="spr-evidence-row"><div><b>Notes</b><span>' + notes.length + ' saved Scout note' + (notes.length === 1 ? '' : 's') + '</span></div><button class="spr-btn" type="button" data-spr-evidence="notes">Open notes</button></div>' +
      '</div>'
    );
    var matchButton = q(node, '[data-spr-evidence="matches"]');
    var videoButton = q(node, '[data-spr-evidence="videos"]');
    var noteButton = q(node, '[data-spr-evidence="notes"]');
    if (matchButton) matchButton.onclick = function () { openMatches(matches); };
    if (videoButton) videoButton.onclick = function () { openVideos(videos); };
    if (noteButton) noteButton.onclick = function () {
      var noteSection = q(root, '[data-spr-section="notes"]');
      if (noteSection) noteSection.scrollIntoView({behavior:'smooth',block:'start'});
    };
  }

  function notesSection(root, id, notes) {
    var node = section(
      root,
      'notes',
      'Scout notes',
      'Private to your scouting workspace',
      '<form class="spr-note-form" data-spr-note-form><textarea maxlength="2000" placeholder="Write a private note about this player" aria-label="Scout note"></textarea>' +
      '<div class="spr-actions"><button class="spr-btn primary" type="submit">Save note</button></div></form>' +
      '<div data-spr-note-list>' + notesHtml(notes) + '</div>'
    );
    var form = q(node, '[data-spr-note-form]');
    if (!form) return;
    form.onsubmit = async function (event) {
      event.preventDefault();
      event.stopPropagation();
      var textarea = q(form, 'textarea');
      var content = String(textarea && textarea.value || '').trim();
      if (!content) return;
      var button = q(form, 'button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await createNote(id, content);
        if (textarea) textarea.value = '';
        var updated = await loadNotes(id);
        var target = q(node, '[data-spr-note-list]');
        if (target) target.innerHTML = notesHtml(updated);
      } catch (error) {
        openModal('Note could not be saved', '<div class="spr-empty">' + esc(error.message || 'Please try again.') + '</div>');
      } finally {
        if (button) button.disabled = false;
      }
    };
  }

  function replacePipelineWidget(root, videos) {
    var candidate = qa(root, '.card,section').find(function (node) {
      if (node.hasAttribute('data-spr-section') || node.hasAttribute('data-slfr2-profile-section')) return false;
      var heading = q(node, 'h1,h2,h3,h4,.card-h,.card-title,b,strong');
      var copy = normal(heading ? heading.textContent : '');
      return copy === 'pipeline status' || copy === 'recruitment stage';
    });
    if (!candidate || candidate.dataset.sprVideoWidget === '1') return;
    candidate.dataset.sprVideoWidget = '1';
    var heading = q(candidate, 'h1,h2,h3,h4,.card-h,.card-title,b,strong');
    if (heading) heading.textContent = 'Video reels';
    var body = q(candidate, '.card-b,.body,.card-body') || candidate;
    var preservedHeading = heading && body.contains(heading) ? heading.outerHTML : '';
    body.innerHTML = preservedHeading + '<div style="padding:' + (body === candidate ? '12px 0 0' : '0') + '"><b style="font:800 13px Archivo,Arial,sans-serif;color:#0C201A">' +
      videos.length + ' video' + (videos.length === 1 ? '' : 's') + '</b><p style="margin:5px 0 10px;font:500 11px/1.45 Archivo,Arial,sans-serif;color:#7C8A82">Watch the player evidence without leaving the profile.</p>' +
      '<button class="spr-btn" type="button" data-spr-widget-video>Open video reels</button></div>';
    var button = q(body, '[data-spr-widget-video]');
    if (button) button.onclick = function () { openVideos(videos); };
  }

  function addTeamLink(root, player) {
    var url = player.team_website_url || player.teamWebsiteUrl || player.team_website || player.teamWebsite ||
      player.league_fulltime_url || player.leagueFulltimeUrl || '';
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + String(url).replace(/^\/+/, '');

    var existing = q(root, '[data-spr-team-link]');
    if (existing) {
      existing.href = url;
      return;
    }

    var identity = qa(root, '.card,section,.hero,.profile-head,.topline').find(function (node) {
      var copy = normal(node.textContent);
      return copy.indexOf(normal(playerName(player))) >= 0 || copy.indexOf('overall') >= 0;
    });
    if (!identity) identity = root;

    var link = document.createElement('a');
    link.className = 'spr-btn spr-team-link';
    link.setAttribute('data-spr-team-link', '1');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = (player.team_name || (player.team && player.team.team_name) || 'Team') + ' ↗';
    identity.appendChild(link);
  }

  async function repairProfile(root) {
    if (!isScoutContext()) return;
    ensureStyles(shadow() || root);

    var bundle;
    try { bundle = await loadProfile(false); }
    catch (_) { return; }

    var source = bundle.player || (bundle.data && bundle.data.player) || bundle;
    if (!source || !playerId(source)) return;
    var player = Object.assign({}, source);
    ['attribute_ratings','attributeRatings','attributes','ratings'].forEach(function (key) {
      if (!player[key] && bundle[key]) player[key] = bundle[key];
      if (!player[key] && bundle.data && bundle.data[key]) player[key] = bundle.data[key];
    });

    removeSpuriousNotFound(root);
    fixOverallSuffix(root, player);
    renderCompatibility(root, player, bundle);
    renderAttributes(root, player);

    var id = String(playerId(player));
    var matches = safeArray(
      bundle.recentMatches || bundle.recent_matches || bundle.matches || bundle.matchFacts || bundle.match_facts ||
      player._facts || player.match_facts || player.matches
    );
    var videos = await loadExtraVideos(id, bundle, player);
    var notes = [];
    try { notes = await loadNotes(id); } catch (_) {}

    hideLegacyRepairSections(root);
    evidenceSection(root, player, matches, videos, notes);
    notesSection(root, id, notes);
    replacePipelineWidget(root, videos);
    addTeamLink(root, player);
  }

  function labelledSelect(root, labelText) {
    var wanted = normal(labelText);
    var selects = qa(root, 'select');
    for (var i = 0; i < selects.length; i += 1) {
      var select = selects[i];
      var field = select.closest('label,.field,.form-field,.control,.filter,.select-wrap,.row,.toolbar') || select.parentElement;
      if (normal(field && field.textContent).indexOf(wanted) >= 0) return select;
    }
    return null;
  }

  function rankingValue(player, metric) {
    var matches = num(player.matches_played != null ? player.matches_played : player.appearances, 0);
    var goals = num(player.goals, 0);
    var assists = num(player.assists, 0);
    var cleanSheets = num(player.clean_sheets != null ? player.clean_sheets : player.cleanSheets, 0);

    if (metric === 'Overall rating') return num(player.overall_rating != null ? player.overall_rating : player.overallRating, 0);
    if (metric === 'Development potential') {
      var overall = player.overallBreakdown || player.overall_breakdown || (player._analysis && player._analysis.overallBreakdown) || {};
      return num(player.potential_rating != null ? player.potential_rating : player.potentialRating != null ? player.potentialRating : overall.potentialRating, num(player.overall_rating, 0));
    }
    if (metric === 'Goals') return goals;
    if (metric === 'Goals per game') return matches > 0 ? goals / matches : 0;
    if (metric === 'Assists') return assists;
    if (metric === 'Assists per game') return matches > 0 ? assists / matches : 0;
    if (metric === 'Clean sheets') return cleanSheets;
    if (metric === 'Clean sheets per game') return matches > 0 ? cleanSheets / matches : 0;
    if (metric === 'Appearances') return matches;
    if (metric === 'Financial value') {
      var finances = player.player_financials || player.playerFinancials || {};
      return num(player.transfer_value != null ? player.transfer_value : player.transferValue != null ? player.transferValue : finances.current_value != null ? finances.current_value : finances.market_value, 0);
    }
    return num(player.overall_rating, 0);
  }

  function rankingDisplay(player, metric) {
    var value = rankingValue(player, metric);
    if (metric === 'Overall rating' || metric === 'Development potential') return Math.round(value) + ' <small>/100</small>';
    if (/per game$/i.test(metric)) return value.toFixed(2);
    if (metric === 'Financial value') return '£' + Math.round(value).toLocaleString('en-GB');
    return Math.round(value).toLocaleString('en-GB');
  }

  function playerAge(player) {
    return player.age_group || player.ageGroup || (player.age != null ? 'U' + player.age : '');
  }

  function playerTeam(player) {
    return player.team_name || player.teamName || (player.team && (player.team.team_name || player.team.name)) || '';
  }

  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).map(function (part) { return part.charAt(0); }).join('').slice(0,2).toUpperCase() || 'SL';
  }

  function compatibilityScore(player) {
    return num(player.compatibilityScore != null ? player.compatibilityScore : player.compatibility_score, 0);
  }

  function cleanRankingDropdown(root) {
    var select = labelledSelect(root, 'Rank by');
    if (!select) return null;
    var previous = select.value;
    var validPrevious = RANKING_METRICS.indexOf(previous) >= 0 ? previous : 'Overall rating';

    var currentOptions = Array.prototype.slice.call(select.options || []);
    var signature = currentOptions.map(function (option) { return option.textContent; }).join('|');
    var needsReset = /Overall vs brief|Position fit/i.test(signature) || currentOptions.length !== RANKING_METRICS.length;

    if (needsReset) {
      select.innerHTML = RANKING_METRICS.map(function (metric) {
        return '<option value="' + escAttr(metric) + '">' + esc(metric) + '</option>';
      }).join('');
    }
    select.value = validPrevious;
    if (!select.value) select.value = 'Overall rating';
    return select;
  }

  function removeRankingArtifacts(root) {
    qa(root, 'button,.pill,.chip,.tag,.metric-label,.stat-label').forEach(function (node) {
      var copy = normal(node.textContent);
      if (copy === 'position fit' || copy === 'overall vs brief') {
        node.setAttribute('data-spr-hidden', '1');
        node.setAttribute('aria-hidden', 'true');
      }
    });
  }

  async function renderRankings(root) {
    var select = cleanRankingDropdown(root);
    if (!select) return;
    removeRankingArtifacts(root);

    var players;
    try { players = await loadPlayers(false); } catch (_) { return; }
    var list = players.slice();
    var ageSelect = labelledSelect(root, 'Age group');
    if (ageSelect && ageSelect.value && !/^all/i.test(ageSelect.value)) {
      list = list.filter(function (player) { return String(playerAge(player)) === String(ageSelect.value); });
    }

    var metric = RANKING_METRICS.indexOf(select.value) >= 0 ? select.value : 'Overall rating';
    list.sort(function (a, b) {
      var primary = rankingValue(b, metric) - rankingValue(a, metric);
      if (primary) return primary;
      var compat = compatibilityScore(b) - compatibilityScore(a);
      if (compat) return compat;
      var overall = num(b.overall_rating, 0) - num(a.overall_rating, 0);
      if (overall) return overall;
      return playerName(a).localeCompare(playerName(b));
    });

    var card = qa(root, '.card,section').find(function (node) { return !!q(node, '.rank-num'); });
    if (!card) return;
    var body = q(card, '.card-b,.card-body,.body') || card;
    var sample = q(body, '.list-row') || q(card, '.list-row');
    if (!sample) return;

    if (!card.__SPR_RANKING_TEMPLATE__) card.__SPR_RANKING_TEMPLATE__ = sample.cloneNode(true);
    var template = card.__SPR_RANKING_TEMPLATE__;
    qa(body, '.list-row').forEach(function (row) { row.remove(); });
    var oldEmpty = q(body, '.spr-ranking-empty');
    if (oldEmpty) oldEmpty.remove();

    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'spr-ranking-empty';
      empty.textContent = 'No players match the selected ranking filters.';
      body.appendChild(empty);
      return;
    }

    list.slice(0, 50).forEach(function (player, index) {
      var row = template.cloneNode(true);
      row.dataset.playerId = String(playerId(player));
      row.dataset.sprRankingRow = '1';
      var rank = q(row, '.rank-num');
      if (rank) rank.textContent = String(index + 1);
      var avatar = q(row, '.avatar');
      if (avatar) avatar.textContent = initials(playerName(player));
      var who = q(row, '.who');
      if (who) {
        var name = q(who, 'b,strong');
        var meta = q(who, 'span,small');
        if (name) name.textContent = playerName(player);
        if (meta) meta.textContent = [playerPosition(player), playerAge(player), playerTeam(player)].filter(Boolean).join(' · ');
      }
      var score = q(row, '.rate-chip') || row.lastElementChild;
      if (score) score.innerHTML = rankingDisplay(player, metric);
      row.onclick = function () {
        location.href = '/player/profile?id=' + encodeURIComponent(playerId(player));
      };
      body.appendChild(row);
    });
  }

  function bindRankingControls(root) {
    var rankSelect = cleanRankingDropdown(root);
    var ageSelect = labelledSelect(root, 'Age group');
    [rankSelect, ageSelect].filter(Boolean).forEach(function (select) {
      if (select.dataset.sprRankingBound === '1') return;
      select.dataset.sprRankingBound = '1';
      select.addEventListener('change', function (event) {
        event.stopImmediatePropagation();
        renderRankings(root);
      }, true);
    });
  }

  async function repairRankings(root) {
    ensureStyles(shadow() || root);
    cleanRankingDropdown(root);
    removeRankingArtifacts(root);
    bindRankingControls(root);
    await renderRankings(root);
  }

  async function run() {
    if (repairing) return;
    var activeRoute = route();
    if (activeRoute !== 'profile' && activeRoute !== 'rankings') return;
    var sh = shadow();
    if (!sh) return;
    var root = visibleRoot(sh);
    if (!root) return;

    repairing = true;
    try {
      ensureStyles(sh);
      if (activeRoute === 'profile') await repairProfile(root);
      if (activeRoute === 'rankings') await repairRankings(root);
    } catch (error) {
      console.error('[Scout profile/ranking repair]', error);
    } finally {
      repairing = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      run();
    });
  }

  function attach() {
    var host = appHost();
    if (!host) {
      setTimeout(attach, 40);
      return;
    }

    function watchShadow() {
      var sh = shadow();
      if (!sh) {
        setTimeout(watchShadow, 40);
        return;
      }
      ensureStyles(sh);
      if (rootObserver) rootObserver.disconnect();
      rootObserver = new MutationObserver(function (mutations) {
        var meaningful = mutations.some(function (mutation) {
          if (mutation.type === 'attributes') return true;
          return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
            return node.nodeType === 1 && !node.closest?.('[data-spr-section],[data-spr-ranking-row]');
          });
        });
        if (meaningful) schedule();
      });
      rootObserver.observe(sh, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','aria-busy'] });
      schedule();
      setTimeout(schedule, 350);
      setTimeout(schedule, 1000);
    }

    watchShadow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }

  window.addEventListener('popstate', schedule);
  window.addEventListener('resize', schedule);

  window.ScoutProfileRankingV1 = {
    version: VERSION,
    refresh: schedule,
    clearCaches: function () {
      playersCache = null;
      profileCache = null;
      schedule();
    }
  };
}());

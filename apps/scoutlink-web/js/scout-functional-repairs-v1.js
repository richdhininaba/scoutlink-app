'use strict';

(function () {
  if (window.__SCOUTLINK_FUNCTIONAL_REPAIRS_V2__) return;
  window.__SCOUTLINK_FUNCTIONAL_REPAIRS_V2__ = true;

  var VERSION = '20260821.2';
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var STYLE_ID = 'slScoutFunctionalRepairsV2Style';
  var COMPARE_KEY = 'sl_scout_compare_state_v2';
  var CHAT_KEY = 'sl_scout_chat_cache_v2';
  var USAGE_KEY = 'sl_demo_usage_requests_v2';
  var NOTES_KEY = 'sl_demo_player_notes_v2';
  var NOTIFICATION_TAB_KEY = 'sl_scout_notification_tab_v2';

  var observer = null;
  var scheduled = false;
  var playersCache = null;
  var profileCache = null;
  var notificationCache = null;
  var chatThreadCache = null;
  var activeChatId = '';
  var repairing = false;

  var POSITION_GROUPS = {
    Goalkeeper: ['GK'],
    Defender: ['RB', 'CB', 'LB', 'RWB', 'LWB'],
    Midfielder: ['DM', 'CM', 'AM', 'RM', 'LM'],
    Attacker: ['RW', 'LW', 'CF', 'ST']
  };

  var POSITION_ALIASES = {
    CDM: 'DM',
    CAM: 'AM',
    RCM: 'CM',
    LCM: 'CM',
    RDM: 'DM',
    LDM: 'DM',
    RAM: 'AM',
    LAM: 'AM',
    LS: 'ST',
    RS: 'ST',
    SS: 'CF',
    B2B: 'CM',
    BPD: 'CB',
    RCB: 'CB',
    LCB: 'CB',
    SW: 'CB'
  };

  var GENERAL_ATTRIBUTES = [
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
      'defensive_positioning',
      'marking_covering',
      'anticipation_interceptions',
      'aerial_defending',
      'recovery_defending',
      'pressing_defensive_transition',
      'communication_organisation',
      'progression_from_defence',
      'crossing_attacking_support'
    ],
    Midfielder: [
      'receiving_under_pressure',
      'ball_retention',
      'progressive_passing',
      'long_passing_switching',
      'tempo_control',
      'chance_creation',
      'anticipation_interceptions',
      'defensive_positioning_covering',
      'pressing_counter_pressing',
      'off_ball_movement_box_arrivals'
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
      'pressing_from_front'
    ]
  };

  var ATTRIBUTE_LABELS = {
    first_touch: 'First touch',
    passing: 'Passing',
    dribbling: 'Dribbling',
    weak_foot: 'Weak foot',
    awareness: 'Awareness',
    decision_making: 'Decision making',
    pace: 'Pace',
    agility_balance: 'Agility & balance',
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
    gk_sweeping: 'Sweeping',
    gk_distribution: 'Distribution',
    gk_communication: 'Communication',
    gk_decision_making: 'Decision making',
    gk_composure: 'Composure',
    gk_agility_explosiveness: 'Agility & explosiveness',
    one_v_one_defending: '1v1 defending',
    tackling: 'Tackling',
    defensive_positioning: 'Defensive positioning',
    marking_covering: 'Marking & covering',
    anticipation_interceptions: 'Anticipation & interceptions',
    aerial_defending: 'Aerial defending',
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
    pressing_from_front: 'Pressing from front'
  };

  function normal(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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

  function isDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        token() === 'public-demo-session' ||
        normal(sessionStorage.getItem('sl_public_demo_role')) === 'scout';
    } catch (_) {
      return token() === 'public-demo-session';
    }
  }

  async function request(method, pathname, body, auth) {
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
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function host() {
    return document.getElementById('scoutExperienceApp');
  }

  function shadow() {
    var app = host();
    return app && app.shadowRoot;
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || shadow() || document).querySelectorAll(selector));
  }

  function q(root, selector) {
    return (root || shadow() || document).querySelector(selector);
  }

  function visibleRoot(root) {
    root = root || shadow();
    if (!root) return null;

    var mobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var selectors = mobile
      ? ['.slv9-mobile-copy', '.slv10-mobile-copy', '.field-copy', '[data-layout="mobile"]']
      : ['.slv9-desktop-copy', '.slv10-desktop-copy', '.desk-copy', '[data-layout="desktop"]'];

    for (var index = 0; index < selectors.length; index += 1) {
      var match = q(root, selectors[index]);
      if (match) return match;
    }

    var candidates = qa(root, 'main, .screen, .page, .shell, .slv9-exact-root, .slv10-exact-root');
    for (var i = 0; i < candidates.length; i += 1) {
      var style = getComputedStyle(candidates[i]);
      if (style.display !== 'none' && style.visibility !== 'hidden') return candidates[i];
    }

    return root;
  }

  function route() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var pathname = String(location.pathname || '').replace(/\/+$/, '');
    if (/\/player\/profile$/.test(pathname)) return 'profile';
    if (/compare-players$/.test(pathname)) return 'compare';
    if (/predictions$/.test(pathname)) return 'predictions';
    if (/chat$/.test(pathname)) return 'chat';
    if (/notifications$/.test(pathname)) return 'notifications';
    if (/usage-requests$/.test(pathname)) return 'usage';
    return '';
  }

  function textOf(element) {
    return normal(element && element.textContent);
  }

  function closestField(element) {
    if (!element) return null;
    return element.closest('label, .field, .form-field, .control, .select-wrap, .input-wrap, .filter, .row, .card');
  }

  function labelledControl(root, names, selector) {
    names = Array.isArray(names) ? names : [names];
    var controls = qa(root, selector || 'select,input,textarea');
    var normalNames = names.map(normal);

    for (var i = 0; i < controls.length; i += 1) {
      var control = controls[i];
      var field = closestField(control);
      var labelText = textOf(field || control.parentElement);
      if (normalNames.some(function (name) { return labelText.indexOf(name) >= 0; })) {
        return control;
      }
    }
    return null;
  }

  function findButton(root, labels) {
    labels = Array.isArray(labels) ? labels : [labels];
    var wanted = labels.map(normal);
    return qa(root, 'button,a[role="button"],a.btn').find(function (element) {
      return wanted.indexOf(textOf(element)) >= 0;
    }) || null;
  }

  function toast(message, isError) {
    var root = shadow();
    if (!root) return;

    var old = q(root, '.slfr2-toast');
    if (old) old.remove();

    var node = document.createElement('div');
    node.className = 'slfr2-toast' + (isError ? ' error' : '');
    node.setAttribute('role', isError ? 'alert' : 'status');
    node.textContent = message;
    root.appendChild(node);

    window.setTimeout(function () {
      if (node.parentNode) node.remove();
    }, 4200);
  }

  function readJson(storage, key, fallback) {
    try {
      var value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function unwrapList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.players)) return payload.players;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    if (Array.isArray(payload.threads)) return payload.threads;
    if (Array.isArray(payload.messages)) return payload.messages;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    return [];
  }

  function canonicalPosition(value) {
    var position = String(value || '').trim().toUpperCase();
    return POSITION_ALIASES[position] || position;
  }

  function playerPosition(player) {
    return canonicalPosition(
      player && (
        player.specific_position ||
        player.primary_position ||
        player.position ||
        player.primaryPosition
      )
    );
  }

  function positionGroup(player) {
    var position = playerPosition(player);
    var groups = Object.keys(POSITION_GROUPS);
    for (var i = 0; i < groups.length; i += 1) {
      if (POSITION_GROUPS[groups[i]].indexOf(position) >= 0) return groups[i];
    }
    var raw = player && (player.position_group || player.positionGroup);
    if (raw && POSITION_ATTRIBUTES[raw]) return raw;
    return 'Attacker';
  }

  function playerName(player) {
    if (!player) return 'Player';
    return [player.first_name, player.last_name].filter(Boolean).join(' ') ||
      player.name ||
      player.full_name ||
      player.display_name ||
      'Player';
  }

  function playerId(player) {
    return player && (player.id || player.player_id || player.playerId);
  }

  function attributeValue(player, key) {
    if (!player) return null;

    var containers = [
      player.attribute_ratings,
      player.attributeRatings,
      player.attributes,
      player.ratings,
      player.assessments,
      player
    ].filter(Boolean);

    for (var i = 0; i < containers.length; i += 1) {
      var container = containers[i];
      var raw = container[key];

      if (raw && typeof raw === 'object') {
        raw = raw.rating !== undefined ? raw.rating :
          raw.value !== undefined ? raw.value :
          raw.score !== undefined ? raw.score :
          raw.overall !== undefined ? raw.overall : null;
      }

      var numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        if (numeric > 10 && numeric <= 100) numeric = numeric / 10;
        return Math.max(0, Math.min(10, numeric));
      }
    }

    return null;
  }

  function formatRating(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    var numeric = Number(value);
    return (Math.round(numeric * 10) / 10).toString();
  }

  function attributeLabel(key) {
    if (ATTRIBUTE_LABELS[key]) return ATTRIBUTE_LABELS[key];
    return String(key || '')
      .replace(/^gk_/, '')
      .split('_')
      .map(function (part, index) {
        return index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part;
      })
      .join(' ');
  }

  async function loadPlayers(force) {
    if (playersCache && !force) return playersCache;
    var endpoint = isDemo() ? '/api/players/public-demo' : '/api/scout-intelligence-v64/players';
    var payload = await request('GET', endpoint, null, !isDemo());
    playersCache = unwrapList(payload).filter(Boolean);
    return playersCache;
  }

  function playerFromCache(id) {
    return (playersCache || []).find(function (player) {
      return String(playerId(player)) === String(id);
    }) || null;
  }

  function ensureStyle(root) {
    if (!root || q(root, '#' + STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.slfr2-toast{position:fixed;right:20px;bottom:20px;z-index:999999;max-width:min(430px,calc(100vw - 40px));padding:12px 14px;border-radius:12px;background:#06201A;color:#fff;font:700 13px Archivo,Arial,sans-serif;box-shadow:0 18px 48px rgba(6,32,26,.22)}',
      '.slfr2-toast.error{background:#96382D}',
      '.slfr2-hidden{display:none!important}',
      '.slfr2-compare-attributes{display:grid;gap:16px;margin-top:18px}',
      '.slfr2-attribute-card{border:1px solid #DCE3DE;border-radius:16px;background:#fff;overflow:hidden}',
      '.slfr2-attribute-head{display:grid;grid-template-columns:minmax(0,1fr) 88px 88px;gap:12px;align-items:end;padding:15px 16px;border-bottom:1px solid #EBEFEC}',
      '.slfr2-attribute-head h3{margin:0;font:800 15px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slfr2-attribute-head span{font:700 10px "IBM Plex Mono",monospace;color:#7C8A82;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.slfr2-attribute-row{display:grid;grid-template-columns:minmax(120px,1fr) 88px 88px;gap:12px;align-items:center;padding:11px 16px;border-bottom:1px solid #EBEFEC}',
      '.slfr2-attribute-row:last-child{border-bottom:0}',
      '.slfr2-attribute-name{font:700 12px Archivo,Arial,sans-serif;color:#48584F}',
      '.slfr2-meter{display:grid;grid-template-columns:minmax(32px,1fr) 27px;gap:7px;align-items:center}',
      '.slfr2-track{height:5px;border-radius:99px;background:#EEF4F0;overflow:hidden}',
      '.slfr2-fill{height:100%;border-radius:99px;background:#075F48}',
      '.slfr2-value{font:700 10px "IBM Plex Mono",monospace;color:#0C201A;text-align:right}',
      '.slfr2-profile-section{margin-top:16px;border:1px solid #DCE3DE;border-radius:16px;background:#fff;overflow:hidden}',
      '.slfr2-profile-head{padding:16px;border-bottom:1px solid #EBEFEC;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.slfr2-profile-head h3{margin:0;font:800 15px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slfr2-profile-body{padding:16px}',
      '.slfr2-profile-attribute-row{display:grid;grid-template-columns:minmax(140px,1fr) minmax(90px,220px) 34px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #EBEFEC}',
      '.slfr2-profile-attribute-row:last-child{border-bottom:0}',
      '.slfr2-profile-attribute-row span{font:700 12px Archivo,Arial,sans-serif;color:#48584F}',
      '.slfr2-profile-attribute-row b{font:700 10px "IBM Plex Mono",monospace;color:#0C201A;text-align:right}',
      '.slfr2-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.slfr2-action{appearance:none;border:1px solid #DCE3DE;border-radius:10px;background:#fff;color:#0C201A;padding:10px 12px;font:800 11px Archivo,Arial,sans-serif;cursor:pointer}',
      '.slfr2-action.primary{background:#075F48;border-color:#075F48;color:#fff}',
      '.slfr2-list{display:grid;gap:9px}',
      '.slfr2-list-item{border:1px solid #EBEFEC;border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.slfr2-list-copy{min-width:0}',
      '.slfr2-list-copy b{display:block;font:800 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slfr2-list-copy span{display:block;margin-top:3px;font:500 11px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slfr2-empty{padding:10px 0;font:600 12px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slfr2-note-form{display:grid;gap:9px;margin-bottom:14px}',
      '.slfr2-note-form textarea{width:100%;min-height:88px;box-sizing:border-box;border:1px solid #DCE3DE;border-radius:10px;padding:11px;font:500 13px Archivo,Arial,sans-serif;resize:vertical}',
      '.slfr2-modal{position:fixed;inset:0;z-index:999998;background:rgba(6,32,26,.66);display:grid;place-items:center;padding:18px}',
      '.slfr2-modal-box{width:min(760px,100%);max-height:calc(100dvh - 36px);overflow:auto;border-radius:18px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.28)}',
      '.slfr2-modal-head{position:sticky;top:0;z-index:2;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #EBEFEC}',
      '.slfr2-modal-head h3{margin:0;font:800 16px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slfr2-modal-body{padding:16px}',
      '.slfr2-video{width:100%;border-radius:12px;background:#000;margin-top:10px}',
      '.slfr2-notification-tabs{display:flex;gap:8px;margin-bottom:14px}',
      '.slfr2-notification-tab{border:1px solid #DCE3DE;border-radius:999px;background:#fff;padding:8px 12px;font:800 11px Archivo,Arial,sans-serif;color:#48584F;cursor:pointer}',
      '.slfr2-notification-tab.on{background:#06201A;color:#fff;border-color:#06201A}',
      '.slfr2-demo-history{margin-top:16px;padding-top:16px;border-top:1px solid #EBEFEC}',
      '.slfr2-demo-history h3{margin:0 0 10px;font:800 14px Archivo,Arial,sans-serif;color:#0C201A}',
      '@media(max-width:767px){.slfr2-attribute-head,.slfr2-attribute-row{grid-template-columns:minmax(0,1fr) 72px 72px;padding-left:12px;padding-right:12px}.slfr2-meter{grid-template-columns:1fr 22px}.slfr2-profile-attribute-row{grid-template-columns:minmax(120px,1fr) minmax(60px,120px) 30px}.slfr2-actions{display:grid;grid-template-columns:1fr}.slfr2-action{width:100%}.slfr2-modal{padding:8px}}'
    ].join('');
    root.appendChild(style);
  }

  function removeUnsupportedAgainstFields(root) {
    qa(root, 'select').forEach(function (select) {
      var field = closestField(select);
      var copy = textOf(field || select.parentElement);
      var optionCopy = qa(select, 'option').map(function (option) { return normal(option.textContent); }).join(' | ');
      var unsupported = copy.indexOf('compare against') >= 0 ||
        copy.indexOf('predict against') >= 0 ||
        copy.indexOf('recruitment brief') >= 0 ||
        optionCopy.indexOf('position average') >= 0 ||
        optionCopy.indexOf('age group average') >= 0 ||
        optionCopy.indexOf('your recruitment brief') >= 0 ||
        optionCopy.indexOf('your scout setup') >= 0;

      if (unsupported) {
        (field || select).classList.add('slfr2-hidden');
        (field || select).setAttribute('aria-hidden', 'true');
      }
    });

    qa(root, 'label,span,p,div').forEach(function (node) {
      if (node.children && node.children.length > 3) return;
      var copy = textOf(node);
      if (copy === 'compare against' || copy === 'predict against') {
        var wrapper = closestField(node) || node;
        wrapper.classList.add('slfr2-hidden');
        wrapper.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function compareState() {
    return readJson(sessionStorage, COMPARE_KEY, { a: '', b: '' }) || { a: '', b: '' };
  }

  function saveCompareState(state) {
    writeJson(sessionStorage, COMPARE_KEY, {
      a: state.a || '',
      b: state.b || ''
    });
  }

  function compareControls(root) {
    var a = labelledControl(root, ['player 1', 'player a', 'first player'], 'select');
    var b = labelledControl(root, ['player 2', 'player b', 'second player'], 'select');
    var selects = qa(root, 'select').filter(function (select) {
      return !select.closest('.slfr2-hidden');
    });

    if (!a && selects.length) a = selects[0];
    if (!b && selects.length > 1) b = selects[1];

    return { a: a, b: b };
  }

  function setPlayerOptions(select, players, selectedId, otherSelectedId, placeholder) {
    if (!select) return;

    var previous = String(selectedId || select.value || '');
    var html = '<option value="">' + esc(placeholder || 'Choose player') + '</option>';

    players.forEach(function (player) {
      var id = String(playerId(player) || '');
      if (!id) return;
      var disabled = otherSelectedId && String(otherSelectedId) === id;
      html += '<option value="' + esc(id) + '"' +
        (id === previous ? ' selected' : '') +
        (disabled ? ' disabled' : '') +
        '>' + esc(playerName(player)) +
        (playerPosition(player) ? ' · ' + esc(playerPosition(player)) : '') +
        '</option>';
    });

    select.innerHTML = html;
    select.value = previous;
    select.dataset.slfr2CompareSelect = '1';
  }

  async function repairCompare(root) {
    removeUnsupportedAgainstFields(root);

    var players = await loadPlayers().catch(function (error) {
      toast(error.message || 'Players could not be loaded.', true);
      return [];
    });
    if (!players.length) return;

    var controls = compareControls(root);
    if (!controls.a || !controls.b) return;

    var state = compareState();

    if (controls.a.value && !state.a) state.a = controls.a.value;
    if (controls.b.value && !state.b) state.b = controls.b.value;

    setPlayerOptions(controls.a, players, state.a, state.b, 'Choose Player 1');
    setPlayerOptions(controls.b, players, state.b, state.a, 'Choose Player 2');

    controls.a.onchange = function () {
      var next = compareState();
      next.a = controls.a.value;
      if (next.a && next.a === next.b) next.b = '';
      saveCompareState(next);
      setPlayerOptions(controls.b, players, next.b, next.a, 'Choose Player 2');
      controls.b.value = next.b || '';
    };

    controls.b.onchange = function () {
      var next = compareState();
      next.b = controls.b.value;
      if (next.b && next.a === next.b) next.a = '';
      saveCompareState(next);
      setPlayerOptions(controls.a, players, next.a, next.b, 'Choose Player 1');
      controls.a.value = next.a || '';
    };

    var button = findButton(root, ['Compare']);
    if (button) button.dataset.slfr2CompareAction = '1';

    renderCompareAttributesIfResult(root, state);
  }

  function meter(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return '<div class="slfr2-meter"><div class="slfr2-track"><div class="slfr2-fill" style="width:0"></div></div><div class="slfr2-value">—</div></div>';
    }
    var numeric = Math.max(0, Math.min(10, Number(value)));
    return '<div class="slfr2-meter"><div class="slfr2-track"><div class="slfr2-fill" style="width:' +
      (numeric * 10) + '%"></div></div><div class="slfr2-value">' + esc(formatRating(numeric)) + '</div></div>';
  }

  function attributeSection(title, keys, playerA, playerB, applicableA, applicableB) {
    var nameA = playerName(playerA);
    var nameB = playerName(playerB);
    var html = '<section class="slfr2-attribute-card">' +
      '<header class="slfr2-attribute-head"><h3>' + esc(title) + '</h3><span>' +
      esc(nameA) + '</span><span>' + esc(nameB) + '</span></header>';

    keys.forEach(function (key) {
      var valueA = applicableA === false ? null : attributeValue(playerA, key);
      var valueB = applicableB === false ? null : attributeValue(playerB, key);
      html += '<div class="slfr2-attribute-row"><div class="slfr2-attribute-name">' +
        esc(attributeLabel(key)) + '</div>' + meter(valueA) + meter(valueB) + '</div>';
    });

    return html + '</section>';
  }

  function renderCompareAttributes(root, playerA, playerB) {
    if (!playerA || !playerB) return;

    var old = q(root, '.slfr2-compare-attributes');
    if (old) old.remove();

    var groupA = positionGroup(playerA);
    var groupB = positionGroup(playerB);
    var generalA = groupA !== 'Goalkeeper';
    var generalB = groupB !== 'Goalkeeper';

    var container = document.createElement('div');
    container.className = 'slfr2-compare-attributes';
    container.setAttribute('data-slfr2-owned', 'compare-attributes');

    container.innerHTML =
      attributeSection('General attributes', GENERAL_ATTRIBUTES, playerA, playerB, generalA, generalB) +
      attributeSection(playerName(playerA) + ' · ' + groupA + ' attributes', POSITION_ATTRIBUTES[groupA] || [], playerA, playerB, true, groupA === groupB) +
      attributeSection(playerName(playerB) + ' · ' + groupB + ' attributes', POSITION_ATTRIBUTES[groupB] || [], playerA, playerB, groupA === groupB, true);

    var anchor = qa(root, '.card,section').filter(function (card) {
      var copy = textOf(card);
      return copy.indexOf('recommendation') >= 0 ||
        copy.indexOf('compatibility') >= 0 ||
        copy.indexOf('overall') >= 0;
    }).pop();

    (anchor && anchor.parentNode ? anchor.parentNode : root).appendChild(container);
  }

  function comparisonResultData(response) {
    return response && (response.result || response.data || response.comparison || response) || {};
  }

  function firstValue(object, keys, fallback) {
    object = object || {};
    for (var i = 0; i < keys.length; i += 1) {
      var value = object[keys[i]];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function renderCompareResult(root, response, playerA, playerB) {
    var result = comparisonResultData(response);
    var old = q(root, '[data-slfr2-owned="compare-result"]');
    if (old) old.remove();

    var scoreA = firstValue(result, [
      'playerAScore', 'player_a_score', 'scoreA', 'score_a',
      'playerAOverall', 'player_a_overall'
    ], firstValue(playerA, ['overall_rating', 'overallRating'], null));

    var scoreB = firstValue(result, [
      'playerBScore', 'player_b_score', 'scoreB', 'score_b',
      'playerBOverall', 'player_b_overall'
    ], firstValue(playerB, ['overall_rating', 'overallRating'], null));

    function asTen(value) {
      var numeric = Number(value);
      if (!Number.isFinite(numeric)) return null;
      if (numeric > 10 && numeric <= 100) numeric = numeric / 10;
      return Math.max(0, Math.min(10, numeric));
    }

    var compatibilityA = firstValue(result, [
      'playerACompatibility', 'player_a_compatibility', 'compatibilityA',
      'playerACompatibilityScore'
    ], null);
    var compatibilityB = firstValue(result, [
      'playerBCompatibility', 'player_b_compatibility', 'compatibilityB',
      'playerBCompatibilityScore'
    ], null);

    var recommendation = firstValue(result, [
      'recommendation', 'overallRecommendation', 'overall_recommendation',
      'summary', 'verdict'
    ], '');

    if (recommendation && typeof recommendation === 'object') {
      recommendation = recommendation.summary ||
        recommendation.text ||
        recommendation.verdict ||
        JSON.stringify(recommendation);
    }

    var section = document.createElement('section');
    section.className = 'slfr2-profile-section';
    section.setAttribute('data-slfr2-owned', 'compare-result');
    section.innerHTML =
      '<header class="slfr2-profile-head"><h3>Comparison result</h3></header>' +
      '<div class="slfr2-profile-body">' +
        '<div class="slfr2-list">' +
          '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' + esc(playerName(playerA)) +
          '</b><span>Overall ' + esc(asTen(scoreA) == null ? '—' : formatRating(asTen(scoreA)) + '/10') +
          (compatibilityA != null ? ' · Compatibility ' + esc(String(compatibilityA)) : '') +
          '</span></div></div>' +
          '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' + esc(playerName(playerB)) +
          '</b><span>Overall ' + esc(asTen(scoreB) == null ? '—' : formatRating(asTen(scoreB)) + '/10') +
          (compatibilityB != null ? ' · Compatibility ' + esc(String(compatibilityB)) : '') +
          '</span></div></div>' +
        '</div>' +
        (recommendation
          ? '<div style="margin-top:14px"><b style="font:800 12px Archivo,Arial,sans-serif;color:#0C201A">Overall recommendation</b><p style="margin:6px 0 0;font:500 12px/1.55 Archivo,Arial,sans-serif;color:#48584F">' +
            esc(String(recommendation)) + '</p></div>'
          : '') +
      '</div>';

    var anchor = qa(root, '.card,section').filter(function (node) {
      var copy = textOf(node);
      return copy.indexOf('compare') >= 0 || copy.indexOf('player 1') >= 0 || copy.indexOf('player a') >= 0;
    })[0];

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(section, anchor.nextSibling);
    } else {
      root.appendChild(section);
    }
  }

  function renderCompareAttributesIfResult(root, state) {
    if (!state.a || !state.b) return;
    var playerA = playerFromCache(state.a);
    var playerB = playerFromCache(state.b);
    if (!playerA || !playerB) return;

    var copy = textOf(root);
    var likelyResult = copy.indexOf('recommendation') >= 0 ||
      copy.indexOf('compatibility') >= 0 ||
      copy.indexOf('comparison') >= 0;

    if (likelyResult) renderCompareAttributes(root, playerA, playerB);
  }

  async function runCompare(root) {
    var controls = compareControls(root);
    var state = compareState();

    state.a = controls.a ? controls.a.value : state.a;
    state.b = controls.b ? controls.b.value : state.b;
    saveCompareState(state);

    if (!state.a || !state.b) {
      toast('Choose two players before comparing.', true);
      return;
    }
    if (String(state.a) === String(state.b)) {
      toast('Choose two different players before comparing.', true);
      return;
    }

    var endpoint = isDemo()
      ? '/api/scout-intelligence-v64/public-demo/compare'
      : '/api/scout-intelligence-v64/compare';

    try {
      var response = await request('POST', endpoint, {
        playerAId: state.a,
        playerBId: state.b,
        contextKey: 'immediate_starter'
      }, !isDemo());

      try {
        sessionStorage.setItem('sl_scout_compare_result_v2', JSON.stringify(
          response.result || response.data || response
        ));
      } catch (_) {}

      var playerA = playerFromCache(state.a);
      var playerB = playerFromCache(state.b);
      renderCompareResult(root, response, playerA, playerB);
      renderCompareAttributes(root, playerA, playerB);
      removeUnsupportedAgainstFields(root);
      toast('Comparison updated.');
    } catch (error) {
      toast(error.message || 'Comparison could not be run.', true);
    }
  }

  function repairPredictions(root) {
    removeUnsupportedAgainstFields(root);

    qa(root, 'select').forEach(function (select) {
      var field = closestField(select);
      if (!field) return;
      var copy = textOf(field);
      if (copy.indexOf('compare against') >= 0 ||
          copy.indexOf('predict against') >= 0 ||
          copy.indexOf('scout setup') >= 0 ||
          copy.indexOf('recruitment brief') >= 0) {
        field.classList.add('slfr2-hidden');
      }
    });

    qa(root, 'option').forEach(function (option) {
      var copy = normal(option.textContent);
      if (copy === 'your recruitment brief' ||
          copy === 'your scout setup' ||
          copy === 'position average' ||
          copy === 'age group average') {
        option.remove();
      }
    });
  }

  function installPredictionRequestSanitizer() {
    if (window.__SLFR2_FETCH_SANITIZER__) return;
    window.__SLFR2_FETCH_SANITIZER__ = true;

    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : input && input.url;
        if (url && /\/api\/predictions\/run(?:\?|$)/.test(url) && init && typeof init.body === 'string') {
          var payload = JSON.parse(init.body);
          if (payload && payload.inputParams && typeof payload.inputParams === 'object') {
            delete payload.inputParams.compareAgainst;
            delete payload.inputParams.predictAgainst;
            delete payload.inputParams.recruitmentBrief;
            delete payload.inputParams.brief;
            init = Object.assign({}, init, { body: JSON.stringify(payload) });
          }
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
  }

  function demoUsageRequests() {
    return readJson(localStorage, USAGE_KEY, []) || [];
  }

  function saveDemoUsageRequest(requestRow) {
    var rows = demoUsageRequests();
    rows.unshift(requestRow);
    writeJson(localStorage, USAGE_KEY, rows.slice(0, 100));
  }

  function renderDemoUsageHistory(root) {
    if (!isDemo()) return;

    var rows = demoUsageRequests();
    var old = q(root, '.slfr2-demo-history');
    if (old) old.remove();

    var target = qa(root, '.card,section').find(function (node) {
      var copy = textOf(node);
      return copy.indexOf('usage') >= 0 ||
        copy.indexOf('allowance') >= 0 ||
        copy.indexOf('request') >= 0;
    }) || root;

    var wrapper = document.createElement('div');
    wrapper.className = 'slfr2-demo-history';
    wrapper.innerHTML = '<h3>Request history</h3>';

    if (!rows.length) {
      wrapper.innerHTML += '<div class="slfr2-empty">No additional usage requests have been submitted in this demo yet.</div>';
    } else {
      var list = '<div class="slfr2-list">';
      rows.forEach(function (row) {
        list += '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' +
          esc(row.allowanceLabel || row.allowanceType || 'Additional usage') +
          ' · +' + esc(row.quantity) +
          '</b><span>' + esc(row.reason || '') +
          (row.createdAt ? ' · ' + esc(new Date(row.createdAt).toLocaleString()) : '') +
          '</span></div><span class="pill n">' + esc(row.status || 'Pending') + '</span></div>';
      });
      wrapper.innerHTML += list + '</div>';
    }

    target.appendChild(wrapper);
  }

  function usageFormValues(root) {
    var type = labelledControl(root, ['allowance type'], 'select');
    var quantity = labelledControl(root, ['how many more'], 'input');
    var reason = labelledControl(root, ['why do you need'], 'textarea,input');

    return {
      type: type,
      quantity: quantity,
      reason: reason,
      allowanceType: type ? String(type.value || '').trim() : '',
      allowanceLabel: type && type.selectedOptions && type.selectedOptions[0]
        ? String(type.selectedOptions[0].textContent || '').trim()
        : '',
      amount: quantity ? Number(quantity.value) : 0,
      reasonValue: reason ? String(reason.value || '').trim() : ''
    };
  }

  function handleDemoUsageSubmit(root) {
    var values = usageFormValues(root);

    if (!values.allowanceType) {
      toast('Allowance type is required.', true);
      return;
    }
    if (!values.amount || values.amount < 1) {
      toast('How many more you need is required.', true);
      return;
    }
    if (!values.reasonValue) {
      toast('Please explain why you need the additional usage.', true);
      return;
    }

    saveDemoUsageRequest({
      id: 'demo-usage-' + Date.now(),
      allowanceType: values.allowanceType,
      allowanceLabel: values.allowanceLabel,
      quantity: values.amount,
      reason: values.reasonValue,
      status: 'Pending',
      createdAt: new Date().toISOString()
    });

    toast('Demo usage request saved.');
    renderDemoUsageHistory(root);

    if (values.quantity) values.quantity.value = '';
    if (values.reason) values.reason.value = '';
  }

  function repairUsage(root) {
    renderDemoUsageHistory(root);
    var send = findButton(root, ['Send request']);
    if (send && isDemo()) send.dataset.slfr2DemoUsage = '1';
  }

  function notificationTab() {
    try {
      return sessionStorage.getItem(NOTIFICATION_TAB_KEY) || 'new';
    } catch (_) {
      return 'new';
    }
  }

  function setNotificationTab(value) {
    try {
      sessionStorage.setItem(NOTIFICATION_TAB_KEY, value === 'old' ? 'old' : 'new');
    } catch (_) {}
  }

  async function loadNotifications(force) {
    if (notificationCache && !force) return notificationCache;
    var payload = await request('GET', '/api/notifications?limit=100');
    notificationCache = unwrapList(payload);
    return notificationCache;
  }

  function notificationRow(notification) {
    var title = notification.title || 'ScoutLink update';
    var body = notification.body || notification.message || '';
    var date = notification.created_at || notification.createdAt;
    var timestamp = date ? new Date(date).toLocaleString() : '';
    var status = notification.is_read ? 'Old' : 'New';

    return '<div class="slfr2-list-item" data-slfr2-notification="' + esc(notification.id || '') + '">' +
      '<div class="slfr2-list-copy"><b>' + esc(title) + '</b><span>' +
      esc([body, timestamp].filter(Boolean).join(' · ')) +
      '</span></div><span class="pill ' + (notification.is_read ? 'n' : 'g') + '">' +
      status + '</span></div>';
  }

  async function repairNotifications(root) {
    var notifications;
    try {
      notifications = await loadNotifications(false);
    } catch (error) {
      return;
    }

    var existingV9Tabs = q(root, '.slv9-notification-tabs');
    if (existingV9Tabs) existingV9Tabs.classList.add('slfr2-hidden');

    var card = qa(root, '.card,section').find(function (node) {
      return textOf(node).indexOf('notification') >= 0 || q(node, '.list-row');
    });
    if (!card) return;

    var body = q(card, '.card-b') || card;
    var oldTabs = q(body, '.slfr2-notification-tabs');
    if (oldTabs) oldTabs.remove();

    var tabs = document.createElement('div');
    tabs.className = 'slfr2-notification-tabs';
    tabs.innerHTML =
      '<button type="button" class="slfr2-notification-tab" data-slfr2-notification-tab="new">New</button>' +
      '<button type="button" class="slfr2-notification-tab" data-slfr2-notification-tab="old">Old</button>';
    body.insertBefore(tabs, body.firstChild);

    qa(body, '.list-row,.slfr2-notification-list').forEach(function (node) {
      node.remove();
    });

    var selected = notificationTab();
    qa(tabs, '[data-slfr2-notification-tab]').forEach(function (button) {
      button.classList.toggle('on', button.dataset.slfr2NotificationTab === selected);
    });

    var list = notifications.filter(function (notification) {
      return selected === 'new' ? !notification.is_read : !!notification.is_read;
    });

    var wrapper = document.createElement('div');
    wrapper.className = 'slfr2-notification-list slfr2-list';

    if (!list.length) {
      wrapper.innerHTML = '<div class="slfr2-empty">' +
        (selected === 'new' ? 'No new notifications.' : 'No old notifications.') +
        '</div>';
    } else {
      wrapper.innerHTML = list.slice(0, 100).map(notificationRow).join('');
    }

    body.appendChild(wrapper);
  }

  function threadId(thread) {
    return String(thread && (thread.id || thread.thread_id || thread.threadId || thread.conversation_id || '') || '');
  }

  function coachNameFromThread(thread) {
    if (!thread) return '';
    return thread.coach_name ||
      thread.coachName ||
      thread.contact_name ||
      thread.contactName ||
      thread.other_user_name ||
      thread.otherUserName ||
      (thread.coach && (thread.coach.name || [thread.coach.first_name, thread.coach.last_name].filter(Boolean).join(' '))) ||
      '';
  }

  async function loadChatThreads(force) {
    if (chatThreadCache && !force) return chatThreadCache;
    var payload = await request('GET', '/api/scout-intelligence-v64/chat/threads');
    chatThreadCache = unwrapList(payload);
    return chatThreadCache;
  }

  async function loadChatMessages(id) {
    if (!id) return [];
    if (isDemo()) {
      var cache = readJson(sessionStorage, CHAT_KEY, { threads: {} }) || { threads: {} };
      return cache.threads && cache.threads[id] && Array.isArray(cache.threads[id].messages)
        ? cache.threads[id].messages
        : [];
    }
    var payload = await request('GET', '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(id) + '/messages');
    return unwrapList(payload);
  }

  function chatCache() {
    return readJson(sessionStorage, CHAT_KEY, { activeId: '', threads: {} }) ||
      { activeId: '', threads: {} };
  }

  function saveChatSnapshot(id, coachName, messages) {
    if (!id) return;
    var cache = chatCache();
    cache.activeId = id;
    cache.threads = cache.threads || {};
    cache.threads[id] = {
      coachName: coachName || (cache.threads[id] && cache.threads[id].coachName) || 'Coach',
      messages: Array.isArray(messages) ? messages : (cache.threads[id] && cache.threads[id].messages) || [],
      updatedAt: new Date().toISOString()
    };
    writeJson(sessionStorage, CHAT_KEY, cache);
  }

  function messageAuthor(message) {
    return message.sender_name ||
      message.senderName ||
      message.author_name ||
      message.authorName ||
      message.from_name ||
      message.fromName ||
      message.sender_role ||
      message.senderRole ||
      '';
  }

  function messageBody(message) {
    return message.body || message.message || message.content || message.text || '';
  }

  function messageTime(message) {
    var raw = message.created_at || message.createdAt || message.sent_at || message.sentAt;
    if (!raw) return '';
    try { return new Date(raw).toLocaleString(); } catch (_) { return ''; }
  }

  function renderStableChatThread(root, id, coachName, messages) {
    var threadArea = qa(root, '.card,section,main,div').find(function (node) {
      var copy = textOf(node);
      return q(node, 'textarea') && (
        copy.indexOf('send') >= 0 ||
        copy.indexOf('message') >= 0 ||
        copy.indexOf('coach') >= 0
      );
    });

    if (!threadArea) return;

    var heading = qa(threadArea, 'h1,h2,h3,h4,b,strong').find(function (node) {
      var copy = textOf(node);
      return copy === 'coach' ||
        copy.indexOf('conversation') >= 0 ||
        copy.indexOf('chat with') >= 0 ||
        copy.indexOf('message coach') >= 0;
    });

    if (heading && coachName) heading.textContent = coachName;

    var existing = q(threadArea, '.slfr2-chat-stable-messages');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.className = 'slfr2-chat-stable-messages slfr2-list';
    container.setAttribute('data-thread-id', id);

    if (!messages.length) {
      container.innerHTML = '<div class="slfr2-empty">No messages in this conversation yet.</div>';
    } else {
      container.innerHTML = messages.map(function (message) {
        var author = messageAuthor(message) || coachName || 'ScoutLink';
        return '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' +
          esc(author) + '</b><span>' + esc(messageBody(message)) +
          (messageTime(message) ? ' · ' + esc(messageTime(message)) : '') +
          '</span></div></div>';
      }).join('');
    }

    var textarea = q(threadArea, 'textarea');
    if (textarea && textarea.parentNode) {
      textarea.parentNode.insertBefore(container, textarea);
    } else {
      threadArea.appendChild(container);
    }
  }

  async function repairChat(root) {
    var threads;
    try {
      threads = await loadChatThreads(false);
    } catch (_) {
      threads = [];
    }

    var cache = chatCache();
    var sessionActive = '';
    try { sessionActive = sessionStorage.getItem('sl_scout_v9_active_thread') || ''; } catch (_) {}
    var queryActive = new URLSearchParams(location.search).get('thread') || '';
    activeChatId = queryActive || sessionActive || cache.activeId || activeChatId;

    if (!activeChatId && threads.length === 1) activeChatId = threadId(threads[0]);
    if (!activeChatId) return;

    var thread = threads.find(function (item) {
      return threadId(item) === String(activeChatId);
    }) || null;
    var cachedThread = cache.threads && cache.threads[activeChatId];
    var coachName = coachNameFromThread(thread) || (cachedThread && cachedThread.coachName) || 'Coach';

    var messages;
    try {
      messages = await loadChatMessages(activeChatId);
    } catch (_) {
      messages = cachedThread && Array.isArray(cachedThread.messages) ? cachedThread.messages : [];
    }

    if (!messages.length && cachedThread && Array.isArray(cachedThread.messages) && cachedThread.messages.length) {
      messages = cachedThread.messages;
    }

    saveChatSnapshot(activeChatId, coachName, messages);
    renderStableChatThread(root, activeChatId, coachName, messages);
  }

  function playerProfileId() {
    var params = new URLSearchParams(location.search);
    return params.get('id') || params.get('player') || params.get('playerId') || '';
  }

  async function loadPlayerProfile(force) {
    var id = playerProfileId();
    if (!id) throw new Error('Player ID is missing.');
    if (profileCache && !force && String(playerId(profileCache.player || profileCache)) === String(id)) {
      return profileCache;
    }

    var endpoint = isDemo()
      ? '/api/scout-intelligence-v64/public-demo/player/' + encodeURIComponent(id)
      : '/api/scout-intelligence-v64/player/' + encodeURIComponent(id);

    var payload = await request('GET', endpoint, null, !isDemo());
    profileCache = payload.data || payload;
    if (!profileCache.player) profileCache.player = profileCache;
    return profileCache;
  }

  function removeWrongProfileSections(root) {
    qa(root, '.card,section').forEach(function (node) {
      var heading = q(node, 'h2,h3,h4,.card-h');
      var copy = textOf(heading || node);

      if (copy.indexOf('linked records') >= 0) {
        node.classList.add('slfr2-hidden');
        node.setAttribute('aria-hidden', 'true');
      }

      if (/^(midfielder|defender|attacker|goalkeeper) attributes/.test(copy)) {
        node.classList.add('slfr2-hidden');
        node.setAttribute('aria-hidden', 'true');
      }
    });

    qa(root, 'span,p,b,strong,h3,h4').forEach(function (node) {
      if (textOf(node) === 'pipeline status') {
        node.textContent = 'Recruitment stage';
      }
    });
  }

  function profileAttributeRows(player, keys) {
    if (!keys.length) return '<div class="slfr2-empty">No applicable attributes.</div>';

    return keys.map(function (key) {
      var value = attributeValue(player, key);
      var width = value == null ? 0 : Math.max(0, Math.min(100, Number(value) * 10));
      return '<div class="slfr2-profile-attribute-row"><span>' +
        esc(attributeLabel(key)) +
        '</span><div class="slfr2-track"><div class="slfr2-fill" style="width:' +
        width + '%"></div></div><b>' + esc(value == null ? '—' : formatRating(value) + '/10') +
        '</b></div>';
    }).join('');
  }

  function appendOrReplaceProfileSection(root, key, title, bodyHtml, actionsHtml) {
    var existing = q(root, '[data-slfr2-profile-section="' + key + '"]');
    if (existing) existing.remove();

    var section = document.createElement('section');
    section.className = 'slfr2-profile-section';
    section.setAttribute('data-slfr2-profile-section', key);
    section.innerHTML =
      '<header class="slfr2-profile-head"><h3>' + esc(title) + '</h3>' +
      (actionsHtml ? '<div class="slfr2-actions">' + actionsHtml + '</div>' : '') +
      '</header><div class="slfr2-profile-body">' + bodyHtml + '</div>';

    var profileBody = qa(root, 'main,.main,.content,.page,.screen').find(function (node) {
      return textOf(node).indexOf('player profile') >= 0 || textOf(node).indexOf('overall') >= 0;
    }) || root;

    profileBody.appendChild(section);
    return section;
  }

  function videoUrl(video) {
    return video.url || video.video_url || video.videoUrl || video.file_url || video.fileUrl || video.src || '';
  }

  function videoTitle(video, index) {
    return video.title || video.name || video.label || ('Video ' + (index + 1));
  }

  function matchTitle(match, index) {
    var opponent = match.opponent_name || match.opponentName || match.opponent || '';
    var competition = match.competition_name || match.competitionName || match.competition || '';
    return opponent ? 'vs ' + opponent : competition || ('Match ' + (index + 1));
  }

  function matchMeta(match) {
    var parts = [];
    var date = match.match_date || match.matchDate || match.date || match.played_at || match.playedAt;
    if (date) {
      try { parts.push(new Date(date).toLocaleDateString()); } catch (_) {}
    }
    if (match.score || match.result) parts.push(match.score || match.result);
    if (match.position || match.played_position) parts.push(match.position || match.played_position);
    if (match.overall_rating != null || match.overallRating != null) {
      var rating = match.overall_rating != null ? match.overall_rating : match.overallRating;
      if (Number(rating) > 10) rating = Number(rating) / 10;
      parts.push(formatRating(Number(rating)) + '/10');
    }
    return parts.join(' · ');
  }

  function openModal(title, html) {
    var root = shadow();
    if (!root) return null;
    var old = q(root, '.slfr2-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'slfr2-modal';
    overlay.innerHTML =
      '<section class="slfr2-modal-box" role="dialog" aria-modal="true">' +
      '<header class="slfr2-modal-head"><h3>' + esc(title) + '</h3>' +
      '<button class="slfr2-action" type="button" data-slfr2-close>Close</button></header>' +
      '<div class="slfr2-modal-body">' + html + '</div></section>';

    root.appendChild(overlay);
    q(overlay, '[data-slfr2-close]').onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) overlay.remove();
    });
    return overlay;
  }

  function openVideos(videos) {
    if (!videos.length) {
      toast('No video evidence is available for this player yet.');
      return;
    }

    var html = '<div class="slfr2-list">';
    videos.forEach(function (video, index) {
      var url = videoUrl(video);
      html += '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' +
        esc(videoTitle(video, index)) + '</b><span>' +
        esc([video.fixture_name, video.fixtureName, video.category, video.created_at || video.createdAt].filter(Boolean).join(' · ')) +
        '</span></div>' +
        (url ? '<button class="slfr2-action primary" type="button" data-slfr2-video="' + esc(url) + '">Watch</button>' : '') +
        '</div>';
    });
    html += '</div>';

    var modal = openModal('Video evidence', html);
    if (!modal) return;

    qa(modal, '[data-slfr2-video]').forEach(function (button) {
      button.onclick = function () {
        var url = button.dataset.slfr2Video;
        var body = q(modal, '.slfr2-modal-body');
        var oldVideo = q(body, 'video.slfr2-video');
        if (oldVideo) oldVideo.remove();

        if (/^(https?:|blob:|data:|\/)/i.test(url)) {
          var video = document.createElement('video');
          video.className = 'slfr2-video';
          video.controls = true;
          video.playsInline = true;
          video.src = url;
          body.insertBefore(video, body.firstChild);
          video.play().catch(function () {});
        } else {
          window.open(url, '_blank', 'noopener');
        }
      };
    });
  }

  function openMatches(matches) {
    if (!matches.length) {
      toast('No played matches are available for this player yet.');
      return;
    }

    var html = '<div class="slfr2-list">';
    matches.forEach(function (match, index) {
      html += '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>' +
        esc(matchTitle(match, index)) + '</b><span>' + esc(matchMeta(match)) +
        '</span></div></div>';
    });
    html += '</div>';
    openModal('All matches played', html);
  }

  function demoNotesForPlayer(id) {
    var all = readJson(localStorage, NOTES_KEY, {}) || {};
    return Array.isArray(all[id]) ? all[id] : [];
  }

  function saveDemoNote(id, row) {
    var all = readJson(localStorage, NOTES_KEY, {}) || {};
    all[id] = Array.isArray(all[id]) ? all[id] : [];
    all[id].unshift(row);
    writeJson(localStorage, NOTES_KEY, all);
  }

  async function loadNotes(id) {
    if (isDemo()) return demoNotesForPlayer(id);
    var payload = await request(
      'GET',
      '/api/scout-workflow-actions/players/' + encodeURIComponent(id) + '/workflow'
    );
    var rows = payload.workflow || payload.data || [];
    return Array.isArray(rows) ? rows.filter(function (row) {
      return normal(row.entry_type || row.entryType || 'note') === 'note';
    }) : [];
  }

  async function createNote(id, content) {
    if (isDemo()) {
      var demoRow = {
        id: 'demo-note-' + Date.now(),
        entry_type: 'note',
        content: content,
        created_at: new Date().toISOString()
      };
      saveDemoNote(id, demoRow);
      return demoRow;
    }

    return request(
      'POST',
      '/api/scout-workflow-actions/players/' + encodeURIComponent(id) + '/workflow',
      {
        entryType: 'note',
        content: content,
        metadata: { source: 'scout_player_profile' }
      }
    );
  }

  function notesHtml(notes) {
    if (!notes.length) return '<div class="slfr2-empty">No Scout notes have been added yet.</div>';
    return '<div class="slfr2-list">' + notes.map(function (note) {
      var created = note.created_at || note.createdAt;
      var when = created ? new Date(created).toLocaleString() : '';
      return '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>Scout note</b><span>' +
        esc(note.content || note.note || '') +
        (when ? ' · ' + esc(when) : '') +
        '</span></div></div>';
    }).join('') + '</div>';
  }

  async function addToPipeline(player) {
    var id = playerId(player);
    if (!id) throw new Error('Player ID is missing.');

    var endpoint = isDemo()
      ? '/api/scout-intelligence-v64/public-demo/interest'
      : '/api/scout-workflow-actions/interest';

    return request('POST', endpoint, {
      playerId: id,
      status: 'active'
    }, !isDemo());
  }

  async function repairProfile(root) {
    var bundle;
    try {
      bundle = await loadPlayerProfile(false);
    } catch (error) {
      toast(error.message || 'Player profile data could not be loaded.', true);
      return;
    }

    var sourcePlayer = bundle.player || bundle.data && bundle.data.player || bundle;
    if (!sourcePlayer) return;
    var player = Object.assign({}, sourcePlayer);
    player.attribute_ratings = player.attribute_ratings ||
      bundle.attribute_ratings ||
      bundle.attributeRatings ||
      (bundle.data && (bundle.data.attribute_ratings || bundle.data.attributeRatings)) ||
      player.attributeRatings;
    player.attributes = player.attributes ||
      bundle.attributes ||
      (bundle.data && bundle.data.attributes);
    player.ratings = player.ratings ||
      bundle.ratings ||
      (bundle.data && bundle.data.ratings);

    removeWrongProfileSections(root);

    var group = positionGroup(player);
    var position = playerPosition(player);
    var generalKeys = group === 'Goalkeeper' ? [] : GENERAL_ATTRIBUTES;
    var positionKeys = POSITION_ATTRIBUTES[group] || [];

    appendOrReplaceProfileSection(
      root,
      'attributes',
      'Player attributes',
      (group === 'Goalkeeper'
        ? '<div class="slfr2-empty">Goalkeepers use the goalkeeper assessment set rather than the outfield General attribute set.</div>'
        : '<h4 style="margin:0 0 10px;font:800 12px Archivo,Arial,sans-serif;color:#48584F">General attributes</h4>' +
          profileAttributeRows(player, generalKeys)) +
      '<h4 style="margin:18px 0 10px;font:800 12px Archivo,Arial,sans-serif;color:#48584F">' +
      esc((position || group) + ' · ' + group + ' attributes') +
      '</h4>' + profileAttributeRows(player, positionKeys),
      ''
    );

    var videos = bundle.videos || bundle.videoEvidence || bundle.video_evidence || player.videos || [];
    var matches = bundle.recentMatches || bundle.recent_matches || bundle.matches || player.recentMatches || player.matches || [];

    appendOrReplaceProfileSection(
      root,
      'evidence',
      'Evidence & matches',
      '<div class="slfr2-list">' +
      '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>Video evidence</b><span>' +
      esc(String(videos.length)) + ' video' + (videos.length === 1 ? '' : 's') +
      '</span></div><button class="slfr2-action" type="button" data-slfr2-watch-videos>Watch videos</button></div>' +
      '<div class="slfr2-list-item"><div class="slfr2-list-copy"><b>Matches played</b><span>' +
      esc(String(matches.length)) + ' match' + (matches.length === 1 ? '' : 'es') +
      '</span></div><button class="slfr2-action" type="button" data-slfr2-view-matches>View all matches</button></div>' +
      '</div>',
      ''
    );

    var evidenceSection = q(root, '[data-slfr2-profile-section="evidence"]');
    if (evidenceSection) {
      var watch = q(evidenceSection, '[data-slfr2-watch-videos]');
      var allMatches = q(evidenceSection, '[data-slfr2-view-matches]');
      if (watch) watch.onclick = function () { openVideos(videos); };
      if (allMatches) allMatches.onclick = function () { openMatches(matches); };
    }

    var notes = [];
    try { notes = await loadNotes(String(playerId(player))); } catch (_) {}

    appendOrReplaceProfileSection(
      root,
      'notes',
      'Notes',
      '<form class="slfr2-note-form" data-slfr2-note-form><textarea maxlength="2000" placeholder="Add a private Scout note about this player" aria-label="Scout note"></textarea>' +
      '<div class="slfr2-actions"><button class="slfr2-action primary" type="submit">Save note</button></div></form>' +
      '<div data-slfr2-note-list>' + notesHtml(notes) + '</div>',
      ''
    );

    var noteSection = q(root, '[data-slfr2-profile-section="notes"]');
    var noteForm = noteSection && q(noteSection, '[data-slfr2-note-form]');
    if (noteForm) {
      noteForm.onsubmit = async function (event) {
        event.preventDefault();
        event.stopPropagation();
        var textarea = q(noteForm, 'textarea');
        var content = textarea ? String(textarea.value || '').trim() : '';
        if (!content) {
          toast('Write a note before saving.', true);
          return;
        }

        try {
          await createNote(String(playerId(player)), content);
          textarea.value = '';
          var updated = await loadNotes(String(playerId(player)));
          q(noteSection, '[data-slfr2-note-list]').innerHTML = notesHtml(updated);
          toast('Note saved.');
        } catch (error) {
          toast(error.message || 'The note could not be saved.', true);
        }
      };
    }

    var pipelineButtons = qa(root, 'button,a[role="button"]').filter(function (button) {
      var copy = textOf(button);
      return copy === 'add to pipeline' || copy === 'added to pipeline';
    });

    pipelineButtons.forEach(function (button) {
      if (textOf(button) === 'added to pipeline') return;
      button.dataset.slfr2AddPipeline = String(playerId(player) || '');
    });
  }

  function installCaptureHandlers(root) {
    if (!root || root.__SLFR2_CAPTURE_BOUND__) return;
    root.__SLFR2_CAPTURE_BOUND__ = true;

    root.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('button,a,[role="button"]')
        : null;
      if (!target) return;

      var current = visibleRoot(root);
      if (!current || !current.contains(target)) return;

      var currentRoute = route();
      var label = textOf(target);

      if (currentRoute === 'compare' && label === 'compare') {
        if (target.dataset.slfr2AllowNativeOnce === '1') return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        runCompare(current);
        return;
      }

      if (currentRoute === 'usage' && isDemo() && label === 'send request') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleDemoUsageSubmit(current);
        return;
      }

      if (currentRoute === 'notifications' && target.dataset.slfr2NotificationTab) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setNotificationTab(target.dataset.slfr2NotificationTab);
        repairNotifications(current);
        return;
      }

      if (currentRoute === 'profile' && target.dataset.slfr2AddPipeline) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        var player = profileCache && (profileCache.player || profileCache);
        if (!player) return;

        target.disabled = true;
        addToPipeline(player).then(function () {
          target.textContent = 'Added to pipeline';
          target.removeAttribute('data-slfr2-add-pipeline');
          toast('Player added to pipeline.');
        }).catch(function (error) {
          target.disabled = false;
          toast(error.message || 'Player could not be added to pipeline.', true);
        });
        return;
      }

      if (currentRoute === 'chat') {
        var row = target.closest('[data-thread-id],[data-thread],[data-conversation-id],.list-row,.thread,.conversation');
        if (row) {
          var id = row.getAttribute('data-thread-id') ||
            row.getAttribute('data-thread') ||
            row.getAttribute('data-conversation-id') ||
            row.dataset.id ||
            '';
          if (id) {
            activeChatId = String(id);
            var cache = chatCache();
            cache.activeId = activeChatId;
            writeJson(sessionStorage, CHAT_KEY, cache);
          }
        }
      }
    }, true);
  }

  function scheduleRepair() {
    if (scheduled) return;
    scheduled = true;

    window.requestAnimationFrame(function () {
      scheduled = false;
      runRepairs();
    });
  }

  async function runRepairs() {
    if (repairing) return;
    var root = shadow();
    if (!root) return;

    repairing = true;
    if (observer) observer.disconnect();

    try {
      ensureStyle(root);
      installCaptureHandlers(root);

      var current = visibleRoot(root);
      if (!current) return;

      var currentRoute = route();

      if (currentRoute === 'compare') {
        await repairCompare(current);
      } else if (currentRoute === 'predictions') {
        repairPredictions(current);
      } else if (currentRoute === 'usage') {
        repairUsage(current);
      } else if (currentRoute === 'notifications') {
        await repairNotifications(current);
      } else if (currentRoute === 'chat') {
        await repairChat(current);
      } else if (currentRoute === 'profile') {
        await repairProfile(current);
      }
    } catch (error) {
      console.error('[Scout functional repairs V2]', error);
    } finally {
      repairing = false;
      if (observer && root) {
        observer.observe(root, { childList: true, subtree: true, characterData: true });
      }
    }
  }

  function attachObserver() {
    var app = host();
    if (!app) return;

    function watchShadow() {
      var root = shadow();
      if (!root) {
        window.setTimeout(watchShadow, 25);
        return;
      }

      ensureStyle(root);
      installCaptureHandlers(root);

      if (observer) observer.disconnect();
      observer = new MutationObserver(scheduleRepair);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      scheduleRepair();
    }

    watchShadow();
  }

  installPredictionRequestSanitizer();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
  } else {
    attachObserver();
  }

  window.addEventListener('resize', scheduleRepair);
  window.addEventListener('popstate', scheduleRepair);

  window.ScoutFunctionalRepairsV2 = {
    version: VERSION,
    refresh: scheduleRepair,
    clearCaches: function () {
      playersCache = null;
      profileCache = null;
      notificationCache = null;
      chatThreadCache = null;
      scheduleRepair();
    }
  };
}());

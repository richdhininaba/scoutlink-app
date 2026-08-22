'use strict';

(function () {
  if (window.__SCOUT_COMPARE_PREDICTIONS_V1__) return;
  window.__SCOUT_COMPARE_PREDICTIONS_V1__ = true;

  var VERSION = '20260822.1';
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var STYLE_ID = 'slComparePredictionsV1Style';
  var COMPARE_KEY = 'sl_scout_compare_state_v3';
  var observer = null;
  var scheduled = false;
  var repairing = false;
  var playersCache = null;
  var scenariosCache = null;

  var COMPARE_CONTEXTS = [
    {
      key: 'immediate_starter',
      label: 'Immediate starter',
      help: 'Prioritises readiness, compatibility and evidence for immediate contribution.'
    },
    {
      key: 'development_prospect',
      label: 'Development prospect',
      help: 'Prioritises potential, pathway fit and evidence for longer-term development.'
    },
    {
      key: 'high_press',
      label: 'High-press role',
      help: 'Prioritises pressing intensity, physical load and tactical fit.'
    },
    {
      key: 'possession',
      label: 'Possession role',
      help: 'Prioritises possession, creativity and tactical fit.'
    },
    {
      key: 'specific_tactical_role',
      label: 'Specific tactical role',
      help: 'Prioritises compatibility, tactical fit and evidence for a defined role.'
    },
    {
      key: 'resale_upside',
      label: 'Resale upside',
      help: 'Prioritises potential, resale upside and financial value.'
    },
    {
      key: 'low_financial_risk',
      label: 'Low financial risk',
      help: 'Prioritises affordability, evidence and readiness.'
    },
    {
      key: 'squad_depth',
      label: 'Squad depth',
      help: 'Balances compatibility, readiness, potential and affordability.'
    }
  ];

  var PREDICTION_TYPES = [
    { legacy: 'Position Fit', canonical: 'Position Fit Projection', key: 'position_fit' },
    { legacy: 'Development Trajectory', canonical: 'Attribute Development', key: 'attribute_development' },
    { legacy: 'Match Scenario', canonical: 'Match Scenario Prediction', key: 'match_scenario' },
    { legacy: 'Player Value', canonical: 'ROI Analysis', key: 'roi_analysis' }
  ];

  function normal(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
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
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : (fallback === undefined ? null : fallback);
  }

  function clamp(value, minimum, maximum) {
    var numeric = number(value, minimum);
    return Math.max(minimum, Math.min(maximum, numeric));
  }

  function titleCaseKey(value) {
    return String(value || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function token() {
    try { return localStorage.getItem('sl_token') || ''; } catch (_) { return ''; }
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
        normal(sessionStorage.getItem('sl_public_demo_role')) === 'scout' ||
        localStorage.getItem('sl_demo_mode') === '1';
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
      var error = new Error(payload.error || payload.message || 'The request could not be completed.');
      error.status = response.status;
      error.payload = payload;
      throw error;
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

  function q(root, selector) {
    return (root || shadow() || document).querySelector(selector);
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || shadow() || document).querySelectorAll(selector));
  }

  function route() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var path = String(location.pathname || '').toLowerCase().replace(/\/+$/, '');
    if (path.indexOf('compare-players') >= 0) return 'compare';
    if (path.indexOf('/predictions') >= 0) return 'predictions';
    return '';
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

    var candidates = qa(root, 'main,.screen,.page,.shell,.slv9-exact-root,.slv10-exact-root');
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        var style = getComputedStyle(candidates[i]);
        if (style.display !== 'none' && style.visibility !== 'hidden') return candidates[i];
      } catch (_) {}
    }
    return root;
  }

  function textOf(element) {
    return normal(element && element.textContent);
  }

  function closestField(element) {
    if (!element) return null;
    return element.closest('label,.field,.form-field,.control,.select-wrap,.input-wrap,.filter,.row,.form-row,.card');
  }

  function labelledControl(root, names, selector) {
    names = (Array.isArray(names) ? names : [names]).map(normal);
    var controls = qa(root, selector || 'select,input,textarea');
    for (var index = 0; index < controls.length; index += 1) {
      var field = closestField(controls[index]);
      var copy = textOf(field || controls[index].parentElement);
      if (names.some(function (name) { return copy.indexOf(name) >= 0; })) return controls[index];
    }
    return null;
  }

  function findButton(root, labels) {
    labels = (Array.isArray(labels) ? labels : [labels]).map(normal);
    return qa(root, 'button,a[role="button"],a.btn').find(function (button) {
      return labels.indexOf(textOf(button)) >= 0;
    }) || null;
  }

  function firstValue(object, keys, fallback) {
    object = object || {};
    for (var index = 0; index < keys.length; index += 1) {
      var value = object[keys[index]];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function listValue(value) {
    if (Array.isArray(value)) return value.filter(function (item) { return item !== null && item !== undefined && item !== ''; });
    if (value === null || value === undefined || value === '') return [];
    return [value];
  }

  function unwrapList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.players)) return payload.players;
    if (Array.isArray(payload.predictions)) return payload.predictions;
    if (Array.isArray(payload.history)) return payload.history;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    return [];
  }

  function playerId(player) {
    return player && (player.id || player.player_id || player.playerId);
  }

  function playerName(player) {
    if (!player) return 'Player';
    return [player.first_name, player.last_name].filter(Boolean).join(' ') ||
      player.name || player.full_name || player.display_name || 'Player';
  }

  function playerPosition(player) {
    return player && (player.specific_position || player.primary_position || player.position || player.position_group || '') || '';
  }

  function playerAge(player) {
    return player && (player.age_group || player.ageGroup || player.age || '') || '';
  }

  function playerTeam(player) {
    if (!player) return '';
    return player.team_name ||
      (player.team && (player.team.team_name || player.team.name)) ||
      '';
  }

  function money(value) {
    var numeric = number(value, null);
    if (numeric === null) return value == null || value === '' ? '—' : String(value);
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency', currency: 'GBP', maximumFractionDigits: 0
      }).format(numeric);
    } catch (_) {
      return '£' + Math.round(numeric).toLocaleString('en-GB');
    }
  }

  function formatNumber(value) {
    var numeric = number(value, null);
    if (numeric === null) return value == null || value === '' ? '—' : String(value);
    return Math.round(numeric * 10) / 10;
  }

  function scoreNumber(value) {
    var numeric = number(value, null);
    if (numeric === null) return null;
    if (numeric > 0 && numeric <= 10) numeric *= 10;
    return clamp(numeric, 0, 100);
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
    try { storage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function toast(message, isError) {
    var root = shadow();
    if (!root) return;
    var old = q(root, '.slcp-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'slcp-toast' + (isError ? ' error' : '');
    node.setAttribute('role', isError ? 'alert' : 'status');
    node.textContent = message;
    root.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.remove(); }, 4300);
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
      '.slcp-hidden{display:none!important}',
      '.slcp-toast{position:fixed;right:20px;bottom:20px;z-index:999999;max-width:min(430px,calc(100vw - 40px));padding:12px 14px;border-radius:12px;background:#06201A;color:#fff;font:700 13px Archivo,Arial,sans-serif;box-shadow:0 18px 48px rgba(6,32,26,.22)}',
      '.slcp-toast.error{background:#96382D}',
      '.slcp-helper{display:block;margin-top:7px;font:600 11px/1.45 Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slcp-result{margin-top:18px;border:1px solid #DCE3DE;border-radius:18px;background:#fff;overflow:hidden}',
      '.slcp-result-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:17px 18px;border-bottom:1px solid #EBEFEC}',
      '.slcp-result-head h2,.slcp-result-head h3{margin:0;font:800 17px/1.2 Archivo,Arial,sans-serif;color:#0C201A}',
      '.slcp-result-head p{margin:5px 0 0;font:600 11px/1.45 Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slcp-result-body{padding:18px}',
      '.slcp-score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.slcp-score-card{border:1px solid #EBEFEC;border-radius:14px;padding:14px;background:#FBFCFB}',
      '.slcp-score-card b{display:block;font:800 14px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slcp-score-card span{display:block;margin-top:4px;font:600 11px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slcp-score{margin-top:12px;font:800 28px/1 "IBM Plex Mono",monospace;color:#075F48}',
      '.slcp-section{margin-top:18px}',
      '.slcp-section:first-child{margin-top:0}',
      '.slcp-section-title{margin:0 0 10px;font:800 13px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slcp-copy{margin:0;font:500 12px/1.6 Archivo,Arial,sans-serif;color:#48584F}',
      '.slcp-category-list{display:grid;gap:10px}',
      '.slcp-category{border:1px solid #EBEFEC;border-radius:12px;padding:12px}',
      '.slcp-category-top{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.slcp-category-top b{font:800 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slcp-category-top span{font:700 10px "IBM Plex Mono",monospace;color:#48584F}',
      '.slcp-bar-pair{display:grid;gap:7px;margin-top:10px}',
      '.slcp-bar-row{display:grid;grid-template-columns:minmax(74px,110px) minmax(0,1fr) 34px;gap:8px;align-items:center}',
      '.slcp-bar-label{font:700 10px Archivo,Arial,sans-serif;color:#7C8A82;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.slcp-track{height:6px;background:#EEF4F0;border-radius:999px;overflow:hidden}',
      '.slcp-fill{height:100%;background:#075F48;border-radius:999px}',
      '.slcp-bar-value{font:700 10px "IBM Plex Mono",monospace;color:#0C201A;text-align:right}',
      '.slcp-list{display:grid;gap:8px}',
      '.slcp-list-item{border:1px solid #EBEFEC;border-radius:12px;padding:11px 12px;font:600 11px/1.5 Archivo,Arial,sans-serif;color:#48584F}',
      '.slcp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '.slcp-action{appearance:none;text-decoration:none;border:1px solid #DCE3DE;border-radius:10px;background:#fff;color:#0C201A;padding:9px 11px;font:800 11px Archivo,Arial,sans-serif;cursor:pointer}',
      '.slcp-action.primary{background:#075F48;border-color:#075F48;color:#fff}',
      '.slcp-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.slcp-metric{border:1px solid #EBEFEC;border-radius:12px;padding:12px;background:#FBFCFB}',
      '.slcp-metric span{display:block;font:700 10px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slcp-metric b{display:block;margin-top:7px;font:800 16px/1.2 "IBM Plex Mono",monospace;color:#0C201A;overflow-wrap:anywhere}',
      '.slcp-history{display:grid;gap:9px}',
      '.slcp-history-row{border:1px solid #EBEFEC;border-radius:12px;padding:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.slcp-history-row b{display:block;font:800 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.slcp-history-row span{display:block;margin-top:3px;font:600 10px/1.45 Archivo,Arial,sans-serif;color:#7C8A82}',
      '.slcp-history-score{flex:0 0 auto;font:800 11px "IBM Plex Mono",monospace;color:#075F48}',
      '.slcp-empty{padding:10px 0;font:600 12px Archivo,Arial,sans-serif;color:#7C8A82}',
      '@media(max-width:767px){.slcp-result-head{padding:14px}.slcp-result-body{padding:14px}.slcp-score-grid{grid-template-columns:1fr}.slcp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.slcp-bar-row{grid-template-columns:70px minmax(0,1fr) 30px}.slcp-actions{display:grid;grid-template-columns:1fr}.slcp-action{width:100%;box-sizing:border-box;text-align:center}}'
    ].join('');
    root.appendChild(style);
  }

  function setFieldLabel(field, oldNames, replacement) {
    if (!field) return;
    oldNames = (Array.isArray(oldNames) ? oldNames : [oldNames]).map(normal);
    var candidates = qa(field, 'label,span,b,strong,p,div').filter(function (node) {
      if (node === field || (node.children && node.children.length > 2)) return false;
      return oldNames.indexOf(textOf(node)) >= 0;
    });
    if (candidates.length) candidates[0].textContent = replacement;
  }

  function contextInfo(key) {
    return COMPARE_CONTEXTS.find(function (item) { return item.key === key; }) || COMPARE_CONTEXTS[0];
  }

  function compareState() {
    var state = readJson(sessionStorage, COMPARE_KEY, null) || {};
    return {
      a: state.a || '',
      b: state.b || '',
      contextKey: contextInfo(state.contextKey).key
    };
  }

  function saveCompareState(state) {
    writeJson(sessionStorage, COMPARE_KEY, {
      a: state.a || '',
      b: state.b || '',
      contextKey: contextInfo(state.contextKey).key
    });
  }

  function compareControls(root) {
    var a = labelledControl(root, ['player a', 'player 1', 'first player'], 'select');
    var b = labelledControl(root, ['player b', 'player 2', 'second player'], 'select');
    var context = labelledControl(root, ['decision context', 'compare against', 'context'], 'select');
    var selects = qa(root, 'select');
    if (!a && selects[0]) a = selects[0];
    if (!b && selects[1]) b = selects[1];
    if (!context && selects[2]) context = selects[2];
    return { a: a, b: b, context: context };
  }

  function playerOptionText(player) {
    return playerName(player) + [playerPosition(player), playerAge(player), playerTeam(player)]
      .filter(Boolean).map(function (part) { return ' · ' + part; }).join('');
  }

  function populatePlayerSelect(select, players, selectedId, otherId, placeholder) {
    if (!select) return;
    var current = String(selectedId || select.value || '');
    var html = '<option value="">' + esc(placeholder || 'Choose player') + '</option>';
    players.forEach(function (player) {
      var id = String(playerId(player) || '');
      if (!id) return;
      html += '<option value="' + esc(id) + '"' +
        (id === current ? ' selected' : '') +
        (otherId && id === String(otherId) ? ' disabled' : '') +
        '>' + esc(playerOptionText(player)) + '</option>';
    });
    select.innerHTML = html;
    if (current && qa(select, 'option').some(function (option) { return option.value === current && !option.disabled; })) {
      select.value = current;
    }
  }

  function populateContextSelect(select, selectedKey) {
    if (!select) return;
    var selected = contextInfo(selectedKey).key;
    select.innerHTML = COMPARE_CONTEXTS.map(function (item) {
      return '<option value="' + item.key + '"' + (item.key === selected ? ' selected' : '') + '>' + esc(item.label) + '</option>';
    }).join('');
    select.value = selected;
    var field = closestField(select) || select.parentElement;
    setFieldLabel(field, ['compare against', 'context', 'decision context'], 'Decision context');
    var helper = q(field, '.slcp-helper');
    if (!helper) {
      helper = document.createElement('span');
      helper.className = 'slcp-helper';
      field.appendChild(helper);
    }
    helper.textContent = contextInfo(select.value).help;
  }

  function hideOldCompareResults(root) {
    qa(root, '[data-slcp-owned="compare-result"],.slfr2-compare-attributes,[data-slfr2-owned="compare-result"]').forEach(function (node) {
      if (node.getAttribute('data-slcp-owned') === 'compare-result') node.remove();
      else node.classList.add('slcp-hidden');
    });

    qa(root, '.card,section').forEach(function (node) {
      if (node.getAttribute('data-slcp-owned')) return;
      var copy = textOf(node);
      var hasSelectors = q(node, 'select');
      if (!hasSelectors && (
        copy.indexOf('overall recommendation') >= 0 ||
        copy.indexOf('compatibility vs your setup') >= 0 ||
        copy.indexOf('comparison result') >= 0 ||
        copy.indexOf('player a score') >= 0 ||
        copy.indexOf('player b score') >= 0
      )) node.classList.add('slcp-hidden');
    });
  }

  function comparisonResult(payload) {
    return payload && (payload.result || payload.data || payload.comparison || payload) || {};
  }

  function comparisonScore(result, side) {
    var upper = side === 'a' ? 'A' : 'B';
    var lower = side;
    var nested = result && result['player' + upper];
    var nestedScore = nested && firstValue(nested, ['totalScore', 'total_score', 'score', 'weightedTotal'], null);
    if (nestedScore !== null && nestedScore !== undefined && nestedScore !== '') return scoreNumber(nestedScore);
    return scoreNumber(firstValue(result, [
      'weightedTotal' + upper,
      'weighted_total_' + lower,
      'total' + upper,
      'score' + upper,
      'player' + upper + 'Score',
      'player_' + lower + '_score',
      'player' + upper + 'Total'
    ], null));
  }

  function comparisonRecommendation(result) {
    var recommendation = firstValue(result, [
      'recommendation', 'overallRecommendation', 'overall_recommendation', 'summary', 'verdict'
    ], '');
    if (recommendation && typeof recommendation === 'object') {
      recommendation = recommendation.summary || recommendation.text || recommendation.verdict || recommendation.recommendation || '';
    }
    return String(recommendation || '');
  }

  function comparisonCategories(result) {
    var raw = firstValue(result, [
      'categories', 'categoryComparisons', 'category_comparisons', 'comparisons', 'breakdown', 'categoryBreakdown'
    ], []);
    var rows = [];

    if (Array.isArray(raw)) {
      raw.forEach(function (item, index) {
        if (!item) return;
        var label = firstValue(item, ['label', 'name', 'categoryLabel', 'category', 'key'], 'Category ' + (index + 1));
        var a = scoreNumber(firstValue(item, ['scoreA', 'playerAScore', 'playerA', 'a', 'valueA', 'left'], null));
        var b = scoreNumber(firstValue(item, ['scoreB', 'playerBScore', 'playerB', 'b', 'valueB', 'right'], null));
        if (a !== null || b !== null) rows.push({ label: label, a: a, b: b, note: firstValue(item, ['note', 'explanation', 'summary'], '') });
      });
    } else if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (key) {
        var item = raw[key];
        if (item && typeof item === 'object') {
          var a = scoreNumber(firstValue(item, ['scoreA', 'playerAScore', 'playerA', 'a', 'valueA', 'left'], null));
          var b = scoreNumber(firstValue(item, ['scoreB', 'playerBScore', 'playerB', 'b', 'valueB', 'right'], null));
          if (a !== null || b !== null) rows.push({ label: firstValue(item, ['label', 'name'], titleCaseKey(key)), a: a, b: b, note: firstValue(item, ['note', 'explanation', 'summary'], '') });
        }
      });
    }

    return rows;
  }

  function comparisonList(result, keys) {
    var raw = firstValue(result, keys, []);
    if (typeof raw === 'string') return raw ? [raw] : [];
    if (Array.isArray(raw)) return raw.map(function (item) {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return String(item || '');
      return item.text || item.label || item.summary || item.note || item.reason || item.factor || JSON.stringify(item);
    }).filter(Boolean);
    if (raw && typeof raw === 'object') {
      return Object.keys(raw).map(function (key) {
        var item = raw[key];
        return typeof item === 'string' ? item : titleCaseKey(key) + ': ' + String(item);
      });
    }
    return [];
  }

  function scoreCard(player, score) {
    return '<div class="slcp-score-card"><b>' + esc(playerName(player)) + '</b><span>' +
      esc([playerPosition(player), playerAge(player), playerTeam(player)].filter(Boolean).join(' · ')) +
      '</span><div class="slcp-score">' + (score === null ? '—' : esc(formatNumber(score)) + '<small style="font-size:11px"> /100</small>') +
      '</div></div>';
  }

  function categoryHtml(row, playerA, playerB) {
    function bar(label, score) {
      return '<div class="slcp-bar-row"><span class="slcp-bar-label">' + esc(label) + '</span>' +
        '<div class="slcp-track"><div class="slcp-fill" style="width:' + (score === null ? 0 : clamp(score, 0, 100)) + '%"></div></div>' +
        '<span class="slcp-bar-value">' + (score === null ? '—' : esc(formatNumber(score))) + '</span></div>';
    }
    return '<div class="slcp-category"><div class="slcp-category-top"><b>' + esc(row.label) + '</b>' +
      '<span>' + (row.a === null || row.b === null ? '' : esc(formatNumber(row.a - row.b > 0 ? row.a - row.b : row.b - row.a)) + ' pt gap') + '</span></div>' +
      '<div class="slcp-bar-pair">' + bar(playerName(playerA), row.a) + bar(playerName(playerB), row.b) + '</div>' +
      (row.note ? '<p class="slcp-copy" style="margin-top:8px">' + esc(row.note) + '</p>' : '') + '</div>';
  }

  function listSection(title, items) {
    if (!items.length) return '';
    return '<div class="slcp-section"><h3 class="slcp-section-title">' + esc(title) + '</h3><div class="slcp-list">' +
      items.map(function (item) { return '<div class="slcp-list-item">' + esc(item) + '</div>'; }).join('') +
      '</div></div>';
  }

  function renderCompareResult(root, payload, playerA, playerB, contextKey) {
    hideOldCompareResults(root);
    var result = comparisonResult(payload);
    var info = contextInfo(contextKey);
    var scoreA = comparisonScore(result, 'a');
    var scoreB = comparisonScore(result, 'b');
    var recommendation = comparisonRecommendation(result);
    var categories = comparisonCategories(result);
    var tradeoffs = comparisonList(result, ['biggestTradeOffs', 'biggest_trade_offs', 'tradeOffs', 'tradeoffs', 'tradeOff', 'keyTradeOffs']);
    var changeFactors = comparisonList(result, ['whatCouldChangeDecision', 'what_could_change_decision', 'factorsThatCouldChangeDecision', 'decisionFactors', 'changeFactors', 'conditions']);
    var confidence = firstValue(result, ['confidence', 'decisionConfidence', 'decision_confidence'], null);

    var section = document.createElement('section');
    section.className = 'slcp-result';
    section.setAttribute('data-slcp-owned', 'compare-result');
    section.innerHTML =
      '<header class="slcp-result-head"><div><h2>Comparison · ' + esc(info.label) + '</h2><p>' + esc(info.help) + '</p></div>' +
      (confidence !== null ? '<div style="font:700 10px \"IBM Plex Mono\",monospace;color:#7C8A82">Confidence ' + esc(typeof confidence === 'object' ? (confidence.label || confidence.score || '') : confidence) + '</div>' : '') +
      '</header><div class="slcp-result-body">' +
      '<div class="slcp-score-grid">' + scoreCard(playerA, scoreA) + scoreCard(playerB, scoreB) + '</div>' +
      (recommendation ? '<div class="slcp-section"><h3 class="slcp-section-title">Recommendation</h3><p class="slcp-copy">' + esc(recommendation) + '</p></div>' : '') +
      (categories.length ? '<div class="slcp-section"><h3 class="slcp-section-title">Decision categories</h3><div class="slcp-category-list">' +
        categories.map(function (row) { return categoryHtml(row, playerA, playerB); }).join('') + '</div></div>' : '') +
      listSection('Biggest trade-offs', tradeoffs) +
      listSection('What could change the decision', changeFactors) +
      '<div class="slcp-actions"><a class="slcp-action" href="/player/profile?id=' + encodeURIComponent(playerId(playerA)) + '">Open ' + esc(playerName(playerA)) + '</a>' +
      '<a class="slcp-action" href="/player/profile?id=' + encodeURIComponent(playerId(playerB)) + '">Open ' + esc(playerName(playerB)) + '</a></div>' +
      '</div>';

    var controls = compareControls(root);
    var anchor = controls.context && closestField(controls.context);
    var card = anchor && anchor.closest('.card,section');
    if (card && card.parentNode) card.parentNode.insertBefore(section, card.nextSibling);
    else root.appendChild(section);
  }

  async function runCompare(root) {
    var controls = compareControls(root);
    var state = compareState();
    state.a = controls.a ? controls.a.value : state.a;
    state.b = controls.b ? controls.b.value : state.b;
    state.contextKey = controls.context ? controls.context.value : state.contextKey;
    saveCompareState(state);

    if (!state.a || !state.b) {
      toast('Choose two players before running the comparison.', true);
      return;
    }
    if (String(state.a) === String(state.b)) {
      toast('Choose two different players.', true);
      return;
    }

    var button = q(root, '[data-slcp-compare]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Comparing…';
    }

    try {
      var endpoint = isDemo()
        ? '/api/scout-intelligence-v64/public-demo/compare'
        : '/api/scout-intelligence-v64/compare';
      var payload = await request('POST', endpoint, {
        playerAId: state.a,
        playerBId: state.b,
        contextKey: contextInfo(state.contextKey).key
      }, !isDemo());
      renderCompareResult(root, payload, playerFromCache(state.a), playerFromCache(state.b), state.contextKey);
      toast('Comparison updated for ' + contextInfo(state.contextKey).label + '.');
    } catch (error) {
      toast(error.message || 'The comparison could not be run.', true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Run comparison';
      }
    }
  }

  async function repairCompare(root) {
    var players;
    try { players = await loadPlayers(false); }
    catch (error) {
      toast(error.message || 'Players could not be loaded.', true);
      return;
    }
    if (!players.length) return;

    var controls = compareControls(root);
    if (!controls.a || !controls.b || !controls.context) return;
    var state = compareState();
    if (controls.a.value && !state.a) state.a = controls.a.value;
    if (controls.b.value && !state.b) state.b = controls.b.value;

    populatePlayerSelect(controls.a, players, state.a, state.b, 'Choose Player A');
    populatePlayerSelect(controls.b, players, state.b, state.a, 'Choose Player B');
    populateContextSelect(controls.context, state.contextKey);

    controls.a.onchange = function () {
      var next = compareState();
      next.a = controls.a.value;
      if (next.a && next.a === next.b) next.b = '';
      saveCompareState(next);
      populatePlayerSelect(controls.b, players, next.b, next.a, 'Choose Player B');
      removeOwnedCompareResult(root);
    };
    controls.b.onchange = function () {
      var next = compareState();
      next.b = controls.b.value;
      if (next.b && next.b === next.a) next.a = '';
      saveCompareState(next);
      populatePlayerSelect(controls.a, players, next.a, next.b, 'Choose Player A');
      removeOwnedCompareResult(root);
    };
    controls.context.onchange = function () {
      var next = compareState();
      next.contextKey = controls.context.value;
      saveCompareState(next);
      populateContextSelect(controls.context, next.contextKey);
      removeOwnedCompareResult(root);
    };

    var button = findButton(root, ['compare', 'run comparison', 'comparing…']);
    if (button) {
      button.textContent = 'Run comparison';
      button.dataset.slcpCompare = '1';
      button.removeAttribute('data-slfr2-compare-action');
    }

    hideOldCompareResults(root);
  }

  function removeOwnedCompareResult(root) {
    var owned = q(root, '[data-slcp-owned="compare-result"]');
    if (owned) owned.remove();
  }

  function canonicalPredictionType(value) {
    var copy = normal(value);
    var item = PREDICTION_TYPES.find(function (entry) {
      return copy === normal(entry.legacy) || copy === normal(entry.canonical) || copy === normal(entry.key);
    });
    return item || PREDICTION_TYPES[0];
  }

  function predictionControls(root) {
    var player = labelledControl(root, ['player'], 'select');
    var type = labelledControl(root, ['prediction type', 'prediction'], 'select');
    var selects = qa(root, 'select').filter(function (select) { return !select.closest('.slcp-hidden'); });
    if (!player && selects[0]) player = selects[0];
    if (!type) {
      type = selects.find(function (select) {
        return qa(select, 'option').some(function (option) {
          return PREDICTION_TYPES.some(function (entry) {
            return normal(option.textContent) === normal(entry.legacy) || normal(option.textContent) === normal(entry.canonical);
          });
        });
      }) || selects[1] || null;
    }
    return { player: player, type: type };
  }

  function populatePredictionTypes(select) {
    if (!select) return;
    var current = canonicalPredictionType(select.value);
    select.innerHTML = PREDICTION_TYPES.map(function (item) {
      return '<option value="' + esc(item.legacy) + '"' + (item.key === current.key ? ' selected' : '') + '>' + esc(item.canonical) + '</option>';
    }).join('');
    select.value = current.legacy;
  }

  function fieldContainsUnsupportedBenchmark(field) {
    if (!field) return false;
    var copy = textOf(field);
    var optionCopy = qa(field, 'option').map(function (option) { return normal(option.textContent); }).join(' | ');
    return copy.indexOf('compare against') >= 0 || copy.indexOf('predict against') >= 0 ||
      copy.indexOf('your scout setup') >= 0 || copy.indexOf('your recruitment brief') >= 0 ||
      optionCopy.indexOf('position average') >= 0 || optionCopy.indexOf('age group average') >= 0 ||
      optionCopy.indexOf('your scout setup') >= 0 || optionCopy.indexOf('your recruitment brief') >= 0;
  }

  function hideUnsupportedPredictionFields(root) {
    qa(root, 'select,input,textarea').forEach(function (control) {
      var field = closestField(control);
      if (fieldContainsUnsupportedBenchmark(field || control.parentElement)) {
        (field || control).classList.add('slcp-hidden');
        (field || control).setAttribute('aria-hidden', 'true');
      }
    });
  }

  function showRelevantPredictionFields(root, typeKey) {
    hideUnsupportedPredictionFields(root);
    qa(root, '.slcp-type-field').forEach(function (node) { node.remove(); });

    var controls = predictionControls(root);
    if (!controls.type) return;
    var typeField = closestField(controls.type);
    var parent = typeField && typeField.parentNode ? typeField.parentNode : root;

    if (typeKey === 'position_fit') {
      var target = labelledControl(root, ['target position', 'position to project', 'projected position'], 'select,input');
      if (!target) addPredictionOwnedField(parent, typeField, 'Target position', 'select', 'target-position');
    } else if (typeKey === 'attribute_development') {
      var focus = labelledControl(root, ['development focus', 'training focus', 'development plan'], 'select,input');
      if (!focus) addPredictionOwnedField(parent, typeField, 'Development focus', 'input', 'development-focus', 'Optional — leave blank to use the saved development context');
    } else if (typeKey === 'match_scenario') {
      var scenario = labelledControl(root, ['match scenario', 'scenario'], 'select');
      if (!scenario) addPredictionOwnedField(parent, typeField, 'Match scenario', 'select', 'match-scenario');
    }
  }

  function addPredictionOwnedField(parent, afterNode, label, kind, key, placeholder) {
    var wrapper = document.createElement('label');
    wrapper.className = 'slcp-type-field';
    wrapper.setAttribute('data-slcp-prediction-field', key);
    wrapper.style.cssText = 'display:grid;gap:7px;min-width:0';
    wrapper.innerHTML = '<span style="font:800 11px Archivo,Arial,sans-serif;color:#48584F">' + esc(label) + '</span>' +
      (kind === 'select'
        ? '<select style="width:100%;box-sizing:border-box"></select>'
        : '<input type="text" placeholder="' + esc(placeholder || '') + '" style="width:100%;box-sizing:border-box">');
    if (afterNode && afterNode.nextSibling) parent.insertBefore(wrapper, afterNode.nextSibling);
    else parent.appendChild(wrapper);
    return wrapper;
  }

  function targetPositionControl(root) {
    return labelledControl(root, ['target position', 'position to project', 'projected position'], 'select,input') ||
      q(root, '[data-slcp-prediction-field="target-position"] select');
  }

  function focusControl(root) {
    return labelledControl(root, ['development focus', 'training focus', 'development plan'], 'select,input') ||
      q(root, '[data-slcp-prediction-field="development-focus"] input');
  }

  function scenarioControl(root) {
    return labelledControl(root, ['match scenario', 'scenario'], 'select') ||
      q(root, '[data-slcp-prediction-field="match-scenario"] select');
  }

  function positionOptions(select) {
    if (!select || qa(select, 'option').length > 1) return;
    var positions = ['GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'];
    select.innerHTML = '<option value="">Choose target position</option>' + positions.map(function (position) {
      return '<option value="' + position + '">' + position + '</option>';
    }).join('');
  }

  async function loadScenarios(force) {
    if (scenariosCache && !force) return scenariosCache;
    if (isDemo()) return [];
    var payload = await request('GET', '/api/predictions/scenarios');
    scenariosCache = unwrapList(payload);
    return scenariosCache;
  }

  async function populateScenarioControl(root) {
    var select = scenarioControl(root);
    if (!select) return;
    if (isDemo()) return;
    var scenarios = [];
    try { scenarios = await loadScenarios(false); } catch (_) { scenarios = []; }
    if (!scenarios.length) return;
    var current = select.value;
    select.innerHTML = '<option value="">Choose scenario</option>' + scenarios.map(function (item) {
      var key = item.key || item.id || item.value || '';
      var label = item.label || item.name || titleCaseKey(key);
      return '<option value="' + esc(key) + '">' + esc(label) + (item.gk ? ' · GK' : '') + '</option>';
    }).join('');
    if (current && qa(select, 'option').some(function (option) { return option.value === current; })) select.value = current;
  }

  function predictionInput(root, typeKey) {
    var input = {};
    if (typeKey === 'position_fit') {
      var target = targetPositionControl(root);
      if (target && String(target.value || '').trim()) input.targetPosition = String(target.value).trim();
    } else if (typeKey === 'attribute_development') {
      var focus = focusControl(root);
      if (focus && String(focus.value || '').trim()) input.focus = String(focus.value).trim();
    } else if (typeKey === 'match_scenario') {
      var scenario = scenarioControl(root);
      if (scenario && String(scenario.value || '').trim()) input.scenarioKey = String(scenario.value).trim();
    } else if (typeKey === 'roi_analysis') {
      var plan = focusControl(root);
      if (plan && String(plan.value || '').trim()) input.developmentPlan = String(plan.value).trim();
    }
    return input;
  }

  function predictionOutput(payload) {
    var raw = payload && (payload.result || payload.prediction || payload.data || payload) || {};
    return raw.output_results || raw.outputResults || raw.result || raw.output || raw;
  }

  function formatMetricValue(key, value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      if (value.minimum !== undefined || value.maximum !== undefined) {
        return String(value.minimum == null ? '—' : value.minimum) + '–' + String(value.maximum == null ? '—' : value.maximum);
      }
      if (value.min !== undefined || value.max !== undefined) return String(value.min == null ? '—' : value.min) + '–' + String(value.max == null ? '—' : value.max);
      if (value.formatted !== undefined && value.formatted !== null) return String(value.formatted);
      if (value.label !== undefined) {
        return String(value.label) + (value.score !== undefined && value.score !== null ? ' · ' + formatNumber(value.score) + '/100' : '');
      }
      if (value.value !== undefined && value.value !== null) {
        return /(value|budget|cost|price|salary|financial|market)/.test(normal(key)) ? money(value.value) : String(formatNumber(value.value));
      }
      if (value.score !== undefined) return String(formatNumber(value.score));
      return '';
    }
    var lower = normal(key);
    if (/(value|budget|cost|price|salary|financial|market)/.test(lower) && typeof value === 'number') return money(value);
    if (typeof value === 'number') return String(formatNumber(value));
    return String(value);
  }

  function predictionMetricCandidates(typeKey, output) {
    var definitions = {
      position_fit: [
        ['Target position', ['targetPosition']],
        ['Target fit', ['targetScore', 'positionFitScore', 'score']],
        ['Verdict', ['targetVerdict', 'verdict', 'status']],
        ['Best current position', ['bestCurrentPosition']],
        ['Best current score', ['bestCurrentScore']],
        ['Best future position', ['bestFuturePosition']],
        ['Best future score', ['bestFutureScore']],
        ['Gap', ['targetGapVsBest', 'gap']],
        ['Evidence confidence', ['confidence', 'evidenceConfidence']]
      ],
      attribute_development: [
        ['Current overall', ['currentOverall', 'currentRating']],
        ['Potential overall', ['potentialOverall', 'projectedRating']],
        ['Trajectory', ['trajectory', 'status']],
        ['Development plan', ['developmentPlanLabel', 'developmentPlan']],
        ['Projected range', ['likelyRange', 'projectedRange']],
        ['Evidence confidence', ['confidence', 'evidenceConfidence']],
        ['Current transfer value', ['currentTransferValue']]
      ],
      match_scenario: [
        ['Scenario', ['scenario', 'scenarioLabel']],
        ['Scenario score', ['scenarioScore', 'score']],
        ['Status', ['status', 'verdict']],
        ['Evidence confidence', ['confidence', 'evidenceConfidence']],
        ['Likely range', ['likelyRange', 'range']],
        ['Risk', ['risk']]
      ],
      roi_analysis: [
        ['Current value', ['currentTransferValue', 'currentValue', 'transferValue', 'marketValue']],
        ['Projected value', ['projectedValue', 'futureValue']],
        ['Projected range', ['projectedRange', 'likelyRange', 'valueRange']],
        ['ROI', ['roi', 'roiPercent', 'returnOnInvestment']],
        ['Affordability', ['affordability', 'affordabilityScore']],
        ['Confidence', ['confidence', 'evidenceConfidence']],
        ['Suitability', ['suitability']]
      ]
    };
    var used = {};
    var metrics = [];
    (definitions[typeKey] || []).forEach(function (definition) {
      var value = firstValue(output, definition[1], undefined);
      if (value === undefined || value === null || value === '') return;
      definition[1].forEach(function (key) { used[key] = true; });
      metrics.push({ label: definition[0], key: definition[1][0], value: value });
    });

    Object.keys(output || {}).forEach(function (key) {
      if (used[key]) return;
      var value = output[key];
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object') return;
      if (['type','summary','recommendation','disclaimer'].indexOf(key) >= 0) return;
      if (typeof value === 'string' && value.length > 80) return;
      metrics.push({ label: titleCaseKey(key), key: key, value: value });
    });
    return metrics.slice(0, 12);
  }

  function outputObjectText(item) {
    if (!item || typeof item !== 'object') return String(item == null ? '' : item);
    var title = item.title || item.label || item.name || item.role || item.attribute || item.horizon ||
      (item.year !== undefined && item.year !== null ? 'Year ' + item.year : '') || '';
    var details = [];
    if (item.position) details.push(item.position);
    if (item.overall !== undefined && item.overall !== null) details.push('Overall ' + formatNumber(item.overall));
    if (item.score !== undefined && item.score !== null) details.push('Score ' + formatNumber(item.score));
    if (item.status) details.push(item.status);
    if (item.likelyRange) details.push('Range ' + formatMetricValue('range', item.likelyRange));
    if (item.projectedValueFormatted) details.push(item.projectedValueFormatted);
    else if (item.projectedValue !== undefined && item.projectedValue !== null) details.push(money(item.projectedValue));
    if (item.totalCostFormatted) details.push('Cost ' + item.totalCostFormatted);
    if (item.roiPercent !== undefined && item.roiPercent !== null) details.push('ROI ' + formatNumber(item.roiPercent) + '%');
    if (item.deltaFiveYear !== undefined && item.deltaFiveYear !== null) {
      details.push('5-year change ' + (Number(item.deltaFiveYear) > 0 ? '+' : '') + formatNumber(item.deltaFiveYear));
    }
    if (item.value !== undefined && item.value !== null && typeof item.value !== 'object') details.push(String(item.value));
    var note = item.note || item.text || item.summary || item.reason || item.recommendation || '';
    var combined = [title, details.join(' · '), note].filter(Boolean).join(title && details.length ? ' — ' : ': ');
    if (combined) return combined;
    var primitives = Object.keys(item).filter(function (key) {
      return item[key] !== null && item[key] !== undefined && typeof item[key] !== 'object';
    }).slice(0, 6).map(function (key) {
      return titleCaseKey(key) + ': ' + formatMetricValue(key, item[key]);
    });
    return primitives.join(' · ');
  }

  function collectOutputLists(output) {
    var keys = [
      ['Recommendation', ['recommendation']],
      ['Assumptions', ['assumptions']],
      ['Warnings', ['warnings', 'criticalIssues']],
      ['Drivers', ['drivers', 'keyDrivers', 'valueDrivers']],
      ['Development focus', ['focusAreas', 'developmentFocus']],
      ['Attribute effects', ['attributeEffects']],
      ['Season-by-season projection', ['seasons']],
      ['Position role fits', ['topRoles']],
      ['Conversion candidates', ['conversionCandidates']],
      ['Supporting indicators', ['supportingIndicators', 'indicators', 'evidence']],
      ['Predicted behaviour', ['predictedBehaviour']],
      ['Tactical note', ['tacticalNote']],
      ['Selection guidance', ['selectionGuidance']],
      ['Live proof to collect', ['liveProof', 'evidenceToCollect']],
      ['Financial projection', ['projection']],
      ['Trade-offs', ['tradeOffs']],
      ['Risks', ['risks', 'riskFactors']],
      ['Next steps', ['nextSteps', 'actions']]
    ];
    return keys.map(function (definition) {
      var raw = firstValue(output, definition[1], null);
      if (raw === null || raw === undefined || raw === '') return null;
      var items = listValue(raw).map(function (item) {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        return outputObjectText(item);
      }).filter(Boolean);
      if (!items.length && typeof raw === 'object' && !Array.isArray(raw)) {
        items = Object.keys(raw).map(function (key) {
          var value = raw[key];
          return titleCaseKey(key) + ': ' + (typeof value === 'object' ? outputObjectText(value) : formatMetricValue(key, value));
        }).filter(Boolean);
      }
      return items.length ? { title: definition[0], items: items } : null;
    }).filter(Boolean);
  }

  function renderPredictionResult(root, payload, player, typeItem) {
    var old = q(root, '[data-slcp-owned="prediction-result"]');
    if (old) old.remove();
    var output = predictionOutput(payload);
    var metrics = predictionMetricCandidates(typeItem.key, output);
    var lists = collectOutputLists(output);
    var summary = firstValue(output, ['summary', 'headline', 'paragraph'], '');
    var paragraphs = listValue(firstValue(output, ['paragraphs'], [])).filter(function (item) { return typeof item === 'string'; });
    var recommendation = firstValue(output, ['recommendation'], '');
    var disclaimer = firstValue(output, ['disclaimer'], '');
    var remaining = firstValue(payload, ['creditsRemaining', 'remaining'], null);
    var limit = firstValue(payload, ['planLimit'], null);

    var section = document.createElement('section');
    section.className = 'slcp-result';
    section.setAttribute('data-slcp-owned', 'prediction-result');
    section.innerHTML =
      '<header class="slcp-result-head"><div><h2>' + esc(typeItem.canonical) + '</h2><p>' + esc(playerName(player)) +
      (playerPosition(player) ? ' · ' + esc(playerPosition(player)) : '') + '</p></div>' +
      (remaining !== null ? '<div style="font:700 10px \"IBM Plex Mono\",monospace;color:#7C8A82">' + esc(remaining) +
        (limit !== null ? ' / ' + esc(limit) : '') + ' remaining</div>' : '') + '</header>' +
      '<div class="slcp-result-body">' +
      (summary ? '<div class="slcp-section"><h3 class="slcp-section-title">Prediction summary</h3><p class="slcp-copy">' + esc(summary) + '</p></div>' : '') +
      (metrics.length ? '<div class="slcp-section"><h3 class="slcp-section-title">Output</h3><div class="slcp-metrics">' +
        metrics.map(function (metric) { return '<div class="slcp-metric"><span>' + esc(metric.label) + '</span><b>' + esc(formatMetricValue(metric.key, metric.value)) + '</b></div>'; }).join('') + '</div></div>' : '') +
      (paragraphs.length ? '<div class="slcp-section"><h3 class="slcp-section-title">What the model is saying</h3>' +
        paragraphs.map(function (paragraph) { return '<p class="slcp-copy" style="margin-top:7px">' + esc(paragraph) + '</p>'; }).join('') + '</div>' : '') +
      (recommendation && !lists.some(function (group) { return group.title === 'Recommendation'; }) ? '<div class="slcp-section"><h3 class="slcp-section-title">Recommendation</h3><p class="slcp-copy">' + esc(typeof recommendation === 'object' ? JSON.stringify(recommendation) : recommendation) + '</p></div>' : '') +
      lists.map(function (group) { return listSection(group.title, group.items); }).join('') +
      (disclaimer ? '<div class="slcp-section"><p class="slcp-copy" style="font-size:10px;color:#7C8A82">' + esc(disclaimer) + '</p></div>' : '') +
      '<div class="slcp-actions"><a class="slcp-action" href="/player/profile?id=' + encodeURIComponent(playerId(player)) + '">Open player profile</a></div>' +
      '</div>';

    var controls = predictionControls(root);
    var card = controls.type && closestField(controls.type) && closestField(controls.type).closest('.card,section');
    if (card && card.parentNode) card.parentNode.insertBefore(section, card.nextSibling);
    else root.appendChild(section);
  }

  function historyTypeLabel(value) {
    var item = canonicalPredictionType(value);
    return item.canonical;
  }

  function historySummary(row) {
    var output = predictionOutput(row.result || row.output_results || row.outputResults || row);
    return firstValue(output, ['summary', 'targetVerdict', 'trajectory', 'scenario', 'recommendation'], 'Prediction saved');
  }

  function historyScore(row) {
    var output = predictionOutput(row.result || row.output_results || row.outputResults || row);
    var raw = firstValue(output, ['scenarioScore', 'targetScore', 'score', 'potentialOverall', 'projectedRating', 'roi'], null);
    if (raw && typeof raw === 'object') raw = raw.score || raw.value || raw.label || null;
    return raw === null ? '' : formatNumber(raw);
  }

  async function refreshPredictionHistory(root) {
    if (isDemo()) return;
    var payload;
    try { payload = await request('GET', '/api/predictions?limit=20'); }
    catch (_) { return; }
    var rows = unwrapList(payload);
    var card = qa(root, '.card,section').find(function (node) {
      var copy = textOf(node);
      return copy.indexOf('recent predictions') >= 0 || copy.indexOf('prediction history') >= 0;
    });
    if (!card) return;
    var body = q(card, '.card-b') || card;
    qa(body, '[data-slcp-history],.list-row').forEach(function (node) { node.remove(); });
    var wrapper = document.createElement('div');
    wrapper.className = 'slcp-history';
    wrapper.setAttribute('data-slcp-history', '1');
    if (!rows.length) {
      wrapper.innerHTML = '<div class="slcp-empty">No predictions have been run yet.</div>';
    } else {
      wrapper.innerHTML = rows.slice(0, 20).map(function (row) {
        var embedded = row.players || row.player || playerFromCache(row.player_id || row.playerId);
        var created = row.run_at || row.created_at || row.createdAt || '';
        var date = '';
        if (created) { try { date = new Date(created).toLocaleString(); } catch (_) {} }
        return '<div class="slcp-history-row"><div><b>' + esc(historyTypeLabel(row.prediction_type || row.predictionType || 'Prediction')) +
          (embedded ? ' · ' + esc(playerName(embedded)) : '') + '</b><span>' + esc(historySummary(row)) +
          (date ? ' · ' + esc(date) : '') + '</span></div><div class="slcp-history-score">' + esc(historyScore(row)) + '</div></div>';
      }).join('');
    }
    body.appendChild(wrapper);
  }

  async function runPrediction(root) {
    var controls = predictionControls(root);
    var playerIdValue = controls.player ? String(controls.player.value || '').trim() : '';
    var typeItem = canonicalPredictionType(controls.type ? controls.type.value : '');
    if (!playerIdValue) {
      toast('Choose a player before running a prediction.', true);
      return;
    }
    var input = predictionInput(root, typeItem.key);
    if (typeItem.key === 'position_fit' && !input.targetPosition) {
      toast('Choose a target position for the position-fit projection.', true);
      return;
    }
    if (typeItem.key === 'match_scenario' && !input.scenarioKey) {
      toast('Choose a match scenario.', true);
      return;
    }

    var button = q(root, '[data-slcp-prediction]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Running…';
    }
    try {
      var payload = await request('POST', '/api/predictions/run', {
        playerId: playerIdValue,
        predictionType: typeItem.canonical,
        inputParams: input
      });
      renderPredictionResult(root, payload, playerFromCache(playerIdValue), typeItem);
      await refreshPredictionHistory(root);
      toast(typeItem.canonical + ' completed.');
    } catch (error) {
      toast(error.message || 'The prediction could not be run.', true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Run prediction';
      }
    }
  }

  async function repairPredictions(root) {
    var players = [];
    try { players = await loadPlayers(false); } catch (_) {}
    var controls = predictionControls(root);
    if (!controls.type) return;
    populatePredictionTypes(controls.type);
    if (controls.player && players.length) {
      var currentPlayer = controls.player.value;
      populatePlayerSelect(controls.player, players, currentPlayer, '', 'Choose player');
    }

    var typeItem = canonicalPredictionType(controls.type.value);
    showRelevantPredictionFields(root, typeItem.key);
    if (typeItem.key === 'position_fit') positionOptions(targetPositionControl(root));
    if (typeItem.key === 'match_scenario') await populateScenarioControl(root);

    controls.type.onchange = function () {
      var next = canonicalPredictionType(controls.type.value);
      var result = q(root, '[data-slcp-owned="prediction-result"]');
      if (result) result.remove();
      scheduleRepair();
    };

    hideUnsupportedPredictionFields(root);

    var button = findButton(root, ['run prediction', 'run', 'generate prediction']);
    if (button && !isDemo()) button.dataset.slcpPrediction = '1';

    await refreshPredictionHistory(root);
  }

  function installCapture(root) {
    if (!root || root.__SLCP_CAPTURE__) return;
    root.__SLCP_CAPTURE__ = true;
    root.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('button,a,[role="button"]')
        : null;
      if (!target) return;
      var current = visibleRoot(root);
      if (!current || !current.contains(target)) return;

      if (target.dataset.slcpCompare === '1') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        runCompare(current);
        return;
      }

      if (target.dataset.slcpPrediction === '1' && !isDemo()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        runPrediction(current);
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
    var currentRoute = route();
    if (currentRoute !== 'compare' && currentRoute !== 'predictions') return;

    repairing = true;
    if (observer) observer.disconnect();
    try {
      ensureStyle(root);
      installCapture(root);
      var current = visibleRoot(root);
      if (!current) return;
      if (currentRoute === 'compare') await repairCompare(current);
      if (currentRoute === 'predictions') await repairPredictions(current);
    } catch (error) {
      console.error('[Scout Compare Predictions V1]', error);
    } finally {
      repairing = false;
      if (observer && root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    }
  }

  function attach() {
    var app = host();
    if (!app) return;
    function watch() {
      var root = shadow();
      if (!root) {
        window.setTimeout(watch, 30);
        return;
      }
      ensureStyle(root);
      installCapture(root);
      if (observer) observer.disconnect();
      observer = new MutationObserver(scheduleRepair);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      scheduleRepair();
    }
    watch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();

  window.addEventListener('resize', scheduleRepair);
  window.addEventListener('popstate', scheduleRepair);
  window.addEventListener('pageshow', scheduleRepair);

  window.ScoutComparePredictionsV1 = {
    version: VERSION,
    refresh: scheduleRepair,
    clearCaches: function () {
      playersCache = null;
      scenariosCache = null;
      scheduleRepair();
    }
  };
}());

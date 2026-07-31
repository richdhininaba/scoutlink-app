'use strict';

(function scoutWorkflowFixesBootstrap() {
  if (window.__scoutWorkflowFixesV1) return;
  window.__scoutWorkflowFixesV1 = true;

  const VERSION = '20260731.1';
  const ROLE_TEXT =
    'Centre Forward is the strongest current role. Movement, finishing and transitional output match the current brief. Left wing remains the strongest future alternative.';
  const CSS_URL =
    '/frontend/css/scout-workflow-fixes-v1.css?v=' +
    VERSION;
  const STAGES = [
    ['watching', 'Watching'],
    ['interested', 'Interested'],
    ['shortlisted', 'Shortlisted'],
    ['approached', 'Approached'],
    ['trial_pending', 'Trial pending'],
    ['negotiating', 'Negotiating'],
    ['signed', 'Signed'],
    ['rejected', 'Rejected'],
    ['closed', 'Closed']
  ];
  const PREDICTION_TYPES = [
    ['Position Fit Projection', 'Position fit'],
    ['Attribute Development', 'Development projection'],
    ['ROI Analysis', 'ROI and value'],
    ['Match Scenario Prediction', 'Match scenario']
  ];
  const DEVELOPMENT_FOCUSES = [
    'Balanced Growth',
    'Technical Possession',
    'Final Third Output',
    'Defensive Intelligence',
    'Physical Dominance',
    'Goalkeeper Command'
  ];
  const FINANCIAL_GOALS = [
    'Balanced value growth',
    'First-team contribution',
    'Low-cost high ceiling'
  ];
  const MATCH_SCENARIOS = [
    ['breaking_low_block', 'Breaking down a compact low block'],
    ['high_press', 'Playing through a high press'],
    ['defending_transition', 'Defending a fast transition'],
    ['protecting_lead', 'Protecting a narrow lead'],
    ['aerial_game', 'Repeated aerial and second-ball actions'],
    ['goalkeeper_command', 'Goalkeeper command under pressure']
  ];
  const FORMATIONS = [
    '4-3-3',
    '4-2-3-1',
    '4-4-2',
    '3-5-2',
    '3-4-3',
    '4-1-4-1',
    '4-4-1-1',
    '5-3-2'
  ];
  const PLAYING_STYLES = [
    'Possession-Based Play',
    'High Press',
    'Counter-Attacking',
    'Build-Up from the Back',
    'Direct Play',
    'Wing Play',
    'Compact Defence',
    'Vertical Play'
  ];
  const WEAKNESSES = [
    'Insufficient Game Pace and Speed',
    'Physical Fragility and Injury Risk',
    'Lack of Physical Presence',
    'Weak Defensive Base',
    'Poor Defensive Output',
    'Low Team Chemistry and Leadership',
    'Technical Deficiencies Under Pressure',
    'Tactical Awareness Gaps',
    'Poor Goal Output'
  ];
  const ROLE_EXPECTATIONS = [
    'Aerial Dominance',
    'Vision and Creativity',
    'Speed and Agility',
    'Tactical Intelligence',
    'Ball Retention Under Pressure',
    'Physical Resilience Work Rate',
    'Defensive Impact',
    'Offensive Impact',
    'Progression and Carrying',
    'Leadership and Communication'
  ];
  const LONG_TERM_GOALS = [
    'Physical Growth Potential',
    'Tactical Role Maturity',
    'Leadership and Coachability',
    'Injury Risk and Physical Resilience',
    'Positional Depth Advantage',
    'Goal Contribution Potential',
    'Financial Viability'
  ];

  let playerCache = null;
  let predictionHistoryCache = null;
  let profileContextCache = null;
  let scanTimer = null;
  let toastTimer = null;

  function role() {
    try {
      return (
        sessionStorage.getItem('sl_public_demo_role') ||
        localStorage.getItem('sl_type') ||
        (typeof Auth !== 'undefined' ? Auth.type : '') ||
        ''
      );
    } catch (_) {
      return '';
    }
  }

  function isScoutExperience() {
    return role() === 'Scout';
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) {
      return false;
    }
  }

  function pathName() {
    return String(window.location.pathname || '').toLowerCase();
  }

  function pageIs(name) {
    const path = pathName();
    const aliases = {
      predictions: ['/scout/predictions', 'scout-predictions'],
      pipeline: ['/scout/pipeline', 'scout-pipeline'],
      compare: ['/scout/compare-players', 'compare-players'],
      setup: ['/scout/setup', 'scout-setup', '/scout/onboarding'],
      profile: ['/player/profile', 'player-profile']
    };
    return (aliases[name] || []).some((part) => path.includes(part));
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, num(value)));
  }

  function safeArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === '') return [];
    return [value];
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMoney(value) {
    if (
      value &&
      typeof value === 'object' &&
      value.formatted
    ) {
      return value.formatted;
    }

    const amount =
      value && typeof value === 'object'
        ? num(value.value)
        : num(value);

    return 'GBP ' + Math.round(amount).toLocaleString('en-GB');
  }

  function playerName(player) {
    return [player?.first_name, player?.last_name]
      .filter(Boolean)
      .join(' ') || 'Player';
  }

  function playerPosition(player) {
    return String(
      player?.specific_position ||
      player?.primary_position ||
      (Array.isArray(player?.positions) && player.positions[0]) ||
      player?.position_group ||
      '—'
    ).toUpperCase();
  }

  function initials(player) {
    return [player?.first_name, player?.last_name]
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'SL';
  }

  function currentPlayerId() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('playerId') ||
      params.get('id') ||
      params.get('player') ||
      ''
    );
  }

  async function request(method, path, body) {
    if (typeof api === 'function') {
      return api(method, path, body);
    }

    const apiBase =
      window.API ||
      localStorage.getItem('sl_api_url') ||
      'https://scoutlink-api.vercel.app';

    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('sl_token');

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(apiBase + path, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed.');
    }

    return payload;
  }

  function installPublicDemoNotificationApi() {
    if (
      !isPublicDemo() ||
      window.__slwfDemoNotificationApiInstalled ||
      typeof window.api !== 'function'
    ) {
      return;
    }

    window.__slwfDemoNotificationApiInstalled = true;
    const originalApi = window.api;

    window.api = async function slwfDemoAwareApi(
      method,
      path,
      body
    ) {
      const url = new URL(
        path,
        'https://scoutlink.local'
      );
      const pathname = url.pathname;

      if (pathname === '/api/notifications') {
        const state =
          typeof getDemoState === 'function'
            ? getDemoState()
            : {};
        const activeRole =
          sessionStorage.getItem('sl_public_demo_role') ||
          'Scout';
        let rows = safeArray(state.notifications)
          .filter(
            (notification) =>
              !notification.recipient_type ||
              notification.recipient_type === activeRole
          )
          .sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt || 0) -
              new Date(a.created_at || a.createdAt || 0)
          );

        if (
          method === 'PATCH' &&
          (pathname.endsWith('/mark-all-read') ||
            pathname.endsWith('/read-all'))
        ) {
          rows.forEach((notification) => {
            notification.is_read = true;
            notification.isRead = true;
          });
          if (typeof setDemoState === 'function') {
            setDemoState(state);
          }
          return {
            message: 'All demo notifications marked as read.'
          };
        }

        if (method === 'GET') {
          const unreadOnly =
            url.searchParams.get('unreadOnly') === 'true';
          const filter =
            String(
              url.searchParams.get('filter') ||
              url.searchParams.get('type') ||
              'all'
            ).toLowerCase();
          const limit = Math.max(
            1,
            Math.min(
              100,
              num(url.searchParams.get('limit'), 50)
            )
          );
          const unreadCount = rows.filter(
            (notification) =>
              !notification.is_read &&
              !notification.isRead
          ).length;

          if (unreadOnly) {
            rows = rows.filter(
              (notification) =>
                !notification.is_read &&
                !notification.isRead
            );
          }

          if (filter !== 'all') {
            rows = rows.filter((notification) => {
              const group = String(
                notification.filterGroup ||
                notification.filter_group ||
                notification.notification_type ||
                ''
              ).toLowerCase();
              return group === filter;
            });
          }

          return {
            data: rows.slice(0, limit),
            total: rows.length,
            unreadCount,
            filters: [
              { key: 'all', label: 'All' },
              { key: 'messages', label: 'Messages' },
              { key: 'scout_interest', label: 'Scout interest' },
              { key: 'recruitment', label: 'Recruitment' },
              { key: 'fixtures_events', label: 'Fixtures and events' },
              { key: 'system', label: 'System' }
            ]
          };
        }
      }

      const readMatch =
        pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);

      if (method === 'PATCH' && readMatch) {
        const state =
          typeof getDemoState === 'function'
            ? getDemoState()
            : {};
        const notification = safeArray(
          state.notifications
        ).find((item) => item.id === readMatch[1]);

        if (notification) {
          notification.is_read = true;
          notification.isRead = true;
          if (typeof setDemoState === 'function') {
            setDemoState(state);
          }
        }

        return {
          message: 'Marked as read',
          data: notification || null
        };
      }

      if (
        method === 'PATCH' &&
        (pathname === '/api/notifications/mark-all-read' ||
          pathname === '/api/notifications/read-all')
      ) {
        const state =
          typeof getDemoState === 'function'
            ? getDemoState()
            : {};
        const activeRole =
          sessionStorage.getItem('sl_public_demo_role') ||
          'Scout';

        safeArray(state.notifications).forEach(
          (notification) => {
            if (
              !notification.recipient_type ||
              notification.recipient_type === activeRole
            ) {
              notification.is_read = true;
              notification.isRead = true;
            }
          }
        );

        if (typeof setDemoState === 'function') {
          setDemoState(state);
        }

        return {
          message: 'All demo notifications marked as read.'
        };
      }

      return originalApi(method, path, body);
    };
  }

  function roots() {
    const found = [document];
    const visited = new Set();

    function visit(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);

      const elements = root.querySelectorAll
        ? root.querySelectorAll('*')
        : [];

      elements.forEach((element) => {
        if (element.shadowRoot) {
          found.push(element.shadowRoot);
          visit(element.shadowRoot);
        }
      });
    }

    visit(document);
    return found;
  }

  function ensureShadowCss(root) {
    if (!root || root === document || !root.appendChild) return;
    if (root.querySelector('link[data-slwf-css]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    link.dataset.slwfCss = '1';
    root.appendChild(link);
  }

  function all(selector) {
    return roots().flatMap((root) =>
      Array.from(root.querySelectorAll(selector))
    );
  }

  function elementText(element) {
    return String(element?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clickElement(event) {
    const path =
      typeof event.composedPath === 'function'
        ? event.composedPath()
        : [event.target];

    return path.find(
      (node) =>
        node &&
        node.nodeType === 1 &&
        node.matches &&
        node.matches(
          'button,a,[role="button"],input[type="button"],input[type="submit"]'
        )
    ) || null;
  }

  function pageMountRoot() {
    for (const root of roots()) {
      const candidates = [
        '[data-scout-page-main]',
        '.workspace-main',
        '.page-content',
        '.content-area',
        '.main-content',
        'main'
      ];

      for (const selector of candidates) {
        const node = root.querySelector(selector);
        if (node) return node;
      }
    }

    for (const root of roots()) {
      const bodyLike = root.querySelector(
        '.workspace,.page,.dashboard-main,#scoutExperienceApp'
      );
      if (bodyLike) return bodyLike;
    }

    return document.body;
  }

  function insertRuntime(node) {
    const root = pageMountRoot();

    if (
      root.firstElementChild &&
      root.firstElementChild.classList?.contains('workspace-top')
    ) {
      root.insertBefore(node, root.firstElementChild.nextSibling);
    } else {
      root.insertBefore(node, root.firstChild);
    }
  }

  function toast(message, type) {
    let node = document.getElementById('slwfToast');

    if (!node) {
      node = document.createElement('div');
      node.id = 'slwfToast';
      node.className = 'slwf-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }

    node.className =
      'slwf-toast' +
      (type === 'error' ? ' slwf-toast-error' : '');
    node.textContent = message;
    window.clearTimeout(toastTimer);

    requestAnimationFrame(() => {
      node.classList.add('slwf-show');
    });

    toastTimer = window.setTimeout(() => {
      node.classList.remove('slwf-show');
    }, 5200);
  }

  function modal(id, title, bodyHtml, options) {
    let host = document.getElementById(id);

    if (!host) {
      host = document.createElement('div');
      host.id = id;
      host.className = 'slwf-modal';
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }

    const wide = options?.wide ? ' slwf-modal-wide' : '';

    host.innerHTML =
      '<section class="slwf-modal-card' +
      wide +
      '" role="dialog" aria-modal="true" aria-labelledby="' +
      id +
      'Title">' +
      '<header class="slwf-modal-head">' +
      '<h2 id="' +
      id +
      'Title">' +
      esc(title) +
      '</h2>' +
      '<button class="slwf-modal-close" type="button" data-slwf-close>Close</button>' +
      '</header>' +
      '<div class="slwf-modal-body">' +
      bodyHtml +
      '</div>' +
      '</section>';

    host.classList.add('slwf-open');
    host.setAttribute('aria-hidden', 'false');

    const close = () => {
      host.classList.remove('slwf-open');
      host.setAttribute('aria-hidden', 'true');
    };

    host.onclick = (event) => {
      if (
        event.target === host ||
        event.target.closest('[data-slwf-close]')
      ) {
        close();
      }
    };

    return {
      host,
      close,
      body: host.querySelector('.slwf-modal-body')
    };
  }

  function optionHtml(options, selected) {
    return options
      .map((option) => {
        const value = Array.isArray(option) ? option[0] : option;
        const label = Array.isArray(option) ? option[1] : option;

        return (
          '<option value="' +
          esc(value) +
          '"' +
          (String(value) === String(selected) ? ' selected' : '') +
          '>' +
          esc(label) +
          '</option>'
        );
      })
      .join('');
  }

  function checkboxGrid(name, options, selected) {
    const values = new Set(safeArray(selected));

    return (
      '<div class="slwf-share-list">' +
      options
        .map(
          (item) =>
            '<label class="slwf-check">' +
            '<input type="checkbox" name="' +
            esc(name) +
            '" value="' +
            esc(item.value || item) +
            '"' +
            (values.has(item.value || item) ? ' checked' : '') +
            '>' +
            '<span>' +
            esc(item.label || item) +
            '</span>' +
            '</label>'
        )
        .join('') +
      '</div>'
    );
  }

  async function loadPlayers(force) {
    if (playerCache && !force) {
      return playerCache;
    }

    let rows = [];

    try {
      const payload = await request(
        'GET',
        '/api/players?limit=300&sort=compatibility'
      );
      rows =
        payload.data ||
        payload.players ||
        [];
    } catch (_) {
      try {
        const payload = await request(
          'POST',
          '/api/scout-intelligence/search/run',
          {
            criteria: {
              limit: 300
            }
          }
        );
        rows = (payload.data || []).map(
          (item) => item.player || item
        );
      } catch (error) {
        console.warn('[Scout workflow players]', error);
      }
    }

    playerCache = rows
      .map((item) => item.player || item)
      .filter((player) => player && player.id)
      .sort((a, b) =>
        playerName(a).localeCompare(playerName(b))
      );

    return playerCache;
  }

  async function loadPredictionHistory(force) {
    if (predictionHistoryCache && !force) {
      return predictionHistoryCache;
    }

    const payload = await request('GET', '/api/predictions');
    predictionHistoryCache =
      payload.data ||
      payload.predictions ||
      [];

    predictionHistoryCache.__meta = {
      remaining:
        payload.remaining ??
        payload.predictionsRemaining ??
        payload.creditsRemaining ??
        null,
      limit:
        payload.planLimit ??
        payload.limit ??
        null,
      plan:
        payload.currentPlan ??
        payload.plan ??
        null
    };

    return predictionHistoryCache;
  }

  function normalisePredictionLog(log, fallbackPlayer) {
    return {
      id:
        log.id ||
        log.logId ||
        log.predictionLogId ||
        '',
      player_id:
        log.player_id ||
        log.playerId ||
        fallbackPlayer?.id ||
        '',
      player:
        log.player ||
        log.players ||
        fallbackPlayer ||
        null,
      prediction_type:
        log.prediction_type ||
        log.predictionType ||
        log.result?.type ||
        'Prediction analysis',
      result:
        log.result ||
        log.predictionResult ||
        {},
      input_params:
        log.input_params ||
        log.inputParams ||
        {},
      run_at:
        log.run_at ||
        log.created_at ||
        log.createdAt ||
        new Date().toISOString(),
      creditsRemaining:
        log.creditsRemaining ??
        log.remaining ??
        null
    };
  }

  function metric(label, value, hint) {
    return (
      '<article class="slwf-metric">' +
      '<small>' +
      esc(label) +
      '</small>' +
      '<strong>' +
      esc(value == null || value === '' ? '—' : value) +
      '</strong>' +
      '<span>' +
      esc(hint || '') +
      '</span>' +
      '</article>'
    );
  }

  function fact(label, value, hint) {
    return (
      '<div class="slwf-fact">' +
      '<small>' +
      esc(label) +
      '</small>' +
      '<b>' +
      esc(value == null || value === '' ? '—' : value) +
      '</b>' +
      (hint ? '<span>' + esc(hint) + '</span>' : '') +
      '</div>'
    );
  }

  function section(title, subtitle, body) {
    return (
      '<section class="slwf-result-section">' +
      '<header class="slwf-result-section-head"><div>' +
      '<h3>' +
      esc(title) +
      '</h3>' +
      (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') +
      '</div></header>' +
      '<div class="slwf-result-section-body">' +
      body +
      '</div>' +
      '</section>'
    );
  }

  function scoreRows(rows) {
    return rows
      .filter(Boolean)
      .map((row) => {
        const score = clamp(
          row.score ??
            row.value ??
            row.playerA ??
            0,
          0,
          100
        );

        return (
          '<div class="slwf-score-row">' +
          '<div><b>' +
          esc(row.label || row.role || row.attribute || row.key || 'Metric') +
          '</b>' +
          (row.note || row.reason
            ? '<small>' +
              esc(row.note || row.reason) +
              '</small>'
            : '') +
          '</div>' +
          '<div class="slwf-score-track"><i style="width:' +
          score +
          '%"></i></div>' +
          '<strong>' +
          esc(Math.round(score)) +
          '</strong>' +
          '</div>'
        );
      })
      .join('');
  }

  function resultTable(headers, rows) {
    return (
      '<table class="slwf-result-table">' +
      '<thead><tr>' +
      headers.map((header) => '<th>' + esc(header) + '</th>').join('') +
      '</tr></thead>' +
      '<tbody>' +
      rows
        .map(
          (row) =>
            '<tr>' +
            row.map((cell) => '<td>' + esc(cell) + '</td>').join('') +
            '</tr>'
        )
        .join('') +
      '</tbody></table>'
    );
  }

  function predictionBody(log) {
    const result = log.result || {};
    const type = String(
      result.type ||
      log.prediction_type ||
      ''
    ).toLowerCase();
    const input = log.input_params || {};
    const paragraphs = safeArray(result.paragraphs)
      .filter(Boolean)
      .map((paragraph) => '<p>' + esc(paragraph) + '</p>')
      .join('');

    if (type.includes('attribute') || type.includes('development')) {
      const seasons = safeArray(result.seasons);
      const finalSeason = seasons[seasons.length - 1] || {};
      const effects = safeArray(
        result.attributeEffects ||
        Object.values(result.attributeEffectsByKey || {})
      );
      const tradeOffs = safeArray(result.tradeOffs);

      return (
        '<section class="slwf-result-hero"><div>' +
        '<span class="slwf-kicker">Development summary</span>' +
        '<h2>' +
        esc(
          result.summary ||
          'Projected development movement across five seasons.'
        ) +
        '</h2>' +
        '<p>' +
        esc(
          safeArray(result.paragraphs)[0] ||
          'ScoutLink models every visible attribute so gains and trade-offs remain clear.'
        ) +
        '</p></div>' +
        '<div class="slwf-hero-score"><small>Year-five overall</small><strong>' +
        esc(finalSeason.overall ?? result.currentOverall ?? '—') +
        '</strong><span>/ 100</span></div></section>' +
        '<section class="slwf-metric-grid">' +
        metric('Development focus', result.focus, 'Selected plan') +
        metric('Current overall', result.currentOverall, 'Starting point') +
        metric(
          'Year-five overall',
          finalSeason.overall,
          'Projected rating'
        ) +
        metric(
          'Year-five value',
          finalSeason.transferValueFormatted ||
            formatMoney(finalSeason.transferValue),
          'Projected value'
        ) +
        '</section>' +
        section(
          'Inputs used',
          'The development question that was analysed',
          '<div class="slwf-fact-grid">' +
            fact('Development focus', result.focus || input.focus) +
            fact('Projection horizon', 'Five years') +
            fact(
              'Data confidence',
              result.confidence?.label || '—',
              result.confidence?.note
            ) +
            fact(
              'Current value',
              formatMoney(result.currentTransferValue)
            ) +
          '</div>'
        ) +
        section(
          'Season-by-season projection',
          'Overall and value remain visible for every horizon',
          resultTable(
            ['Horizon', 'Overall', 'Projected value', 'Ranking impact'],
            seasons.map((season) => [
              'Year ' + season.year,
              season.overall,
              season.transferValueFormatted ||
                formatMoney(season.transferValue),
              season.rankingImpact || ''
            ])
          )
        ) +
        '<div class="slwf-result-columns">' +
        section(
          'Five-year attribute movement',
          'Priority gains and visible trade-offs',
          scoreRows(
            effects.map((effect) => ({
              label:
                effect.attribute ||
                titleCase(effect.key),
              score:
                effect.projectedScore ||
                effect.finalScore ||
                clamp(
                  50 + num(effect.deltaFiveYear) * 20,
                  0,
                  100
                ),
              note:
                (effect.deltaFiveYear != null
                  ? (num(effect.deltaFiveYear) >= 0 ? '+' : '') +
                    num(effect.deltaFiveYear).toFixed(1) +
                    ' over five years. '
                  : '') +
                (effect.reason || '')
            }))
          )
        ) +
        section(
          'Trade-offs requiring attention',
          'Negative movement is not hidden',
          tradeOffs.length
            ? '<div class="slwf-grid slwf-grid-2">' +
              tradeOffs
                .map(
                  (item) =>
                    '<article class="slwf-workflow-entry" data-type="decision">' +
                    '<strong>' +
                    esc(titleCase(item.attribute)) +
                    '</strong><p>' +
                    esc(item.reason || 'Requires protected training load.') +
                    '</p></article>'
                )
                .join('') +
              '</div>'
            : '<div class="slwf-notice">No material negative movement was returned for this plan.</div>'
        ) +
        '</div>' +
        section(
          'ScoutLink explanation',
          'Plain-language result',
          '<div class="slwf-narrative">' +
            (paragraphs ||
              '<p>' +
                esc(result.summary || 'Development analysis complete.') +
              '</p>') +
          '</div>'
        )
      );
    }

    if (type.includes('roi')) {
      const projection = safeArray(result.projection);
      const final = projection[projection.length - 1] || {};
      const assumptions = result.assumptions || {};

      return (
        '<section class="slwf-result-hero"><div>' +
        '<span class="slwf-kicker">Financial summary</span>' +
        '<h2>' +
        esc(
          result.suitability ||
          result.summary ||
          'Financial fit analysed.'
        ) +
        '</h2>' +
        '<p>' +
        esc(
          safeArray(result.paragraphs)[1] ||
          result.recommendation ||
          'Use the output to support negotiation rather than replace financial due diligence.'
        ) +
        '</p></div>' +
        '<div class="slwf-hero-score"><small>Year-five ROI</small><strong>' +
        esc(
          final.roiPercent == null
            ? '—'
            : (num(final.roiPercent) >= 0 ? '+' : '') +
              Math.round(num(final.roiPercent)) +
              '%'
        ) +
        '</strong></div></section>' +
        '<section class="slwf-metric-grid">' +
        metric(
          'Current estimated value',
          formatMoney(result.currentTransferValue),
          'Starting value'
        ) +
        metric(
          'Year-five projected value',
          final.projectedValueFormatted ||
            formatMoney(final.projectedValue),
          'Projected value'
        ) +
        metric(
          'Year-five modelled cost',
          final.totalCostFormatted ||
            formatMoney(final.totalCost),
          'All supplied costs'
        ) +
        metric(
          'Year-five modelled ROI',
          final.roiPercent == null
            ? '—'
            : (num(final.roiPercent) >= 0 ? '+' : '') +
              Math.round(num(final.roiPercent)) +
              '%',
          result.suitability || ''
        ) +
        '</section>' +
        section(
          'Assumptions used',
          'Every financial input remains visible',
          '<div class="slwf-fact-grid">' +
            fact(
              'Financial goal',
              result.financialGoal || input.financialGoal
            ) +
            fact(
              'Acquisition cost',
              assumptions.acquisitionCostFormatted ||
                formatMoney(assumptions.acquisitionCost)
            ) +
            fact(
              'Annual development cost',
              assumptions.annualDevelopmentCostFormatted ||
                formatMoney(assumptions.annualDevelopmentCost)
            ) +
            fact(
              'Scouting cost',
              assumptions.scoutingCostFormatted ||
                formatMoney(assumptions.scoutingCost)
            ) +
          '</div>'
        ) +
        section(
          'Five-year financial projection',
          'Value, cost and ROI by horizon',
          resultTable(
            ['Horizon', 'Projected value', 'Total cost', 'Modelled ROI'],
            projection.map((row) => [
              row.horizon || 'Year ' + row.year,
              row.projectedValueFormatted ||
                formatMoney(row.projectedValue),
              row.totalCostFormatted ||
                formatMoney(row.totalCost),
              (num(row.roiPercent) >= 0 ? '+' : '') +
                Math.round(num(row.roiPercent)) +
                '%'
            ])
          )
        ) +
        section(
          'Suitability judgement',
          'The current financial decision',
          '<span class="slwf-status">' +
            esc(result.suitability || 'Review required') +
          '</span>' +
          '<div class="slwf-callout"><b>Recommendation</b><span>' +
            esc(result.recommendation || result.summary || '') +
          '</span></div>'
        ) +
        section(
          'ScoutLink explanation',
          'Plain-language result',
          '<div class="slwf-narrative">' +
            (paragraphs ||
              '<p>' +
                esc(result.summary || 'ROI analysis complete.') +
              '</p>') +
          '</div>'
        )
      );
    }

    if (type.includes('scenario')) {
      const evidence = safeArray(result.evidence);

      return (
        '<section class="slwf-result-hero"><div>' +
        '<span class="slwf-kicker">Tactical summary</span>' +
        '<h2>' +
        esc(
          result.summary ||
          'The tactical scenario has been analysed.'
        ) +
        '</h2>' +
        '<p>' +
        esc(
          result.predictedBehaviour ||
          safeArray(result.paragraphs)[0] ||
          ''
        ) +
        '</p></div>' +
        '<div class="slwf-hero-score"><small>Scenario score</small><strong>' +
        esc(result.scenarioScore ?? '—') +
        '</strong><span>/ 100</span></div></section>' +
        '<section class="slwf-metric-grid">' +
        metric('Scenario score', result.scenarioScore, 'Adjusted for evidence') +
        metric('Raw scenario fit', result.rawScenarioFit, 'Relevant attributes') +
        metric('Tactical risk', result.risk, 'Current evidence') +
        metric('Recommendation', result.recommendation, 'Selection trigger') +
        '</section>' +
        section(
          'Scenario analysed',
          'The exact tactical question',
          '<div class="slwf-callout"><b>Selected scenario</b><span>' +
            esc(result.scenario || input.scenario || input.scenarioKey || '—') +
          '</span></div>'
        ) +
        '<div class="slwf-result-columns">' +
        section(
          'Relevant evidence',
          'Attributes used for this scenario',
          scoreRows(
            evidence.map((item) => ({
              label: titleCase(item.attribute || item.label),
              score: item.score ?? item.value,
              note: item.reason || ''
            }))
          )
        ) +
        section(
          'Predicted behaviour',
          'What the player is expected to do',
          '<div class="slwf-narrative"><p>' +
            esc(result.predictedBehaviour || result.summary || '') +
          '</p></div>' +
          '<div class="slwf-callout"><b>Tactical note</b><span>' +
            esc(result.tacticalNote || '') +
          '</span></div>'
        ) +
        '</div>' +
        section(
          'ScoutLink explanation',
          'Plain-language result',
          '<div class="slwf-narrative">' +
            (paragraphs ||
              '<p>' +
                esc(result.summary || 'Scenario analysis complete.') +
              '</p>') +
          '</div>'
        )
      );
    }

    const roles = safeArray(
      result.topRoles ||
      result.roleScores ||
      result.alternatives
    );
    const overall = result.overallBreakdown || {};
    const conversion = safeArray(
      result.conversionCandidates ||
      result.nearbyConversionRoles ||
      []
    );

    return (
      '<section class="slwf-result-hero"><div>' +
      '<span class="slwf-kicker">Decision summary</span>' +
      '<h2>' +
      esc(
        result.summary ||
        'The target role has been compared with the player’s strongest current and future roles.'
      ) +
      '</h2>' +
      '<p>' +
      esc(
        safeArray(result.paragraphs)[0] ||
        result.recommendation ||
        ''
      ) +
      '</p></div>' +
      '<div class="slwf-hero-score"><small>Target fit</small><strong>' +
      esc(
        result.targetScore ??
        result.targetRoleScore ??
        result.bestCurrentScore ??
        '—'
      ) +
      '</strong><span>/ 100</span></div></section>' +
      '<section class="slwf-metric-grid">' +
      metric(
        'Target position',
        result.targetPosition || input.targetPosition,
        'Selected role'
      ) +
      metric(
        'Target-role score',
        result.targetScore,
        result.targetVerdict || ''
      ) +
      metric(
        'Best current role',
        (result.bestCurrentPosition || '—') +
          (result.bestCurrentScore != null
            ? ' · ' + result.bestCurrentScore
            : ''),
        'Current evidence'
      ) +
      metric(
        'Best future role',
        (result.bestFuturePosition || '—') +
          (result.bestFutureScore != null
            ? ' · ' + result.bestFutureScore
            : ''),
        'Development pathway'
      ) +
      '</section>' +
      section(
        'Inputs used',
        'The football question that was analysed',
        '<div class="slwf-fact-grid">' +
          fact(
            'Target position',
            result.targetPosition || input.targetPosition
          ) +
          fact(
            'Target verdict',
            result.targetVerdict || result.verdict
          ) +
          fact(
            'Gap versus best role',
            result.targetGapVsBest != null
              ? result.targetGapVsBest + ' points'
              : result.gapVsBest != null
                ? result.gapVsBest + ' points'
                : '—'
          ) +
          fact(
            'Data confidence',
            result.confidence?.label ||
              overall.dataConfidenceLabel ||
              '—',
            result.confidence?.note ||
              overall.dataConfidenceNote ||
              ''
          ) +
        '</div>'
      ) +
      '<div class="slwf-result-columns">' +
      section(
        'Role ranking',
        'The strongest roles returned by the position engine',
        scoreRows(
          roles.map((role) => ({
            label:
              role.role ||
              role.position ||
              role.label ||
              role.name,
            score:
              role.score ??
              role.value ??
              role.rating,
            note:
              role.note ||
              role.group ||
              role.reason ||
              ''
          }))
        )
      ) +
      section(
        'Target-role judgement',
        'Why the selected role is suitable or unsuitable',
        '<span class="slwf-status">' +
          esc(result.targetVerdict || result.verdict || 'Review required') +
        '</span>' +
        '<div class="slwf-callout"><b>Recommended football action</b><span>' +
          esc(
            result.recommendation ||
            safeArray(result.paragraphs)[1] ||
            'Confirm the model result through live observation.'
          ) +
        '</span></div>'
      ) +
      '</div>' +
      (conversion.length
        ? section(
            'Nearby conversion roles',
            'Roles close to the best current score',
            '<div class="slwf-grid slwf-grid-3">' +
              conversion
                .map(
                  (role, index) =>
                    '<article class="slwf-workflow-entry">' +
                    '<strong>' +
                    esc(
                      role.role ||
                      role.position ||
                      role.label ||
                      'Alternative ' + (index + 1)
                    ) +
                    '</strong><p>' +
                    esc(
                      (role.score != null
                        ? role.score + '/100. '
                        : '') +
                      (role.reason || role.note || '')
                    ) +
                    '</p></article>'
                )
                .join('') +
              '</div>'
          )
        : '') +
      section(
        'Overall evidence used',
        'The wider player model supporting the role result',
        scoreRows(
          Object.entries(overall)
            .filter(
              ([key, value]) =>
                typeof value === 'number' &&
                key.toLowerCase().includes('score')
            )
            .map(([key, value]) => ({
              label: titleCase(
                key.replace(/Score$/i, '')
              ),
              score: value
            }))
        )
      ) +
      section(
        'ScoutLink explanation',
        'Plain-language result',
        '<div class="slwf-narrative">' +
          (paragraphs ||
            '<p>' +
              esc(result.summary || 'Position-fit analysis complete.') +
            '</p>') +
        '</div>'
      )
    );
  }

  function ensurePredictionOverlay() {
    let overlay = document.getElementById('slwfPredictionOverlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'slwfPredictionOverlay';
      overlay.className = 'slwf-prediction-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }

    return overlay;
  }

  function closePredictionOverlay() {
    const overlay = document.getElementById('slwfPredictionOverlay');
    if (!overlay) return;
    overlay.classList.remove('slwf-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function openPredictionOverlay(rawLog, fallbackPlayer) {
    const log = normalisePredictionLog(rawLog, fallbackPlayer);
    const result = log.result || {};
    const player =
      log.player ||
      playerCache?.find((item) => item.id === log.player_id) ||
      {};
    const overlay = ensurePredictionOverlay();
    const confidence =
      result.confidence?.label ||
      result.overallBreakdown?.dataConfidenceLabel ||
      'Decision-support output';
    const status =
      result.targetVerdict ||
      result.suitability ||
      result.recommendation ||
      confidence;
    const remaining =
      log.creditsRemaining == null
        ? ''
        : '<span>' + esc(log.creditsRemaining) + ' prediction credits remaining</span>';

    overlay.innerHTML =
      '<article class="slwf-prediction-card" role="dialog" aria-modal="true" aria-labelledby="slwfPredictionTitle">' +
      '<header class="slwf-prediction-header">' +
      '<div class="slwf-prediction-topline">' +
      '<div class="slwf-prediction-brand"><span class="slwf-brand-mark">SL</span><b>Prediction analysis</b></div>' +
      '<button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button" data-slwf-close-prediction>Close</button>' +
      '</div>' +
      '<div class="slwf-prediction-heading">' +
      '<div><span class="slwf-kicker">' +
      esc(result.type || log.prediction_type) +
      '</span><h1 id="slwfPredictionTitle">' +
      esc(
        result.type === 'ROI Analysis'
          ? 'ROI and value result'
          : result.type === 'Attribute Development'
            ? 'Development projection'
            : result.type === 'Match Scenario Prediction'
              ? 'Match scenario result'
              : 'Position fit result'
      ) +
      '</h1><p>' +
      esc(
        result.summary ||
        'ScoutLink completed the detailed decision-support analysis.'
      ) +
      '</p></div>' +
      '<div class="slwf-prediction-meta"><span class="slwf-status">' +
      esc(status) +
      '</span><span>Saved to prediction history</span>' +
      remaining +
      '</div></div>' +
      '<div class="slwf-player-row">' +
      '<div class="slwf-player-context"><span class="slwf-avatar">' +
      esc(initials(player)) +
      '</span><div><b>' +
      esc(playerName(player)) +
      '</b><small>' +
      esc(
        [
          playerPosition(player),
          player.age_group,
          player.team_name
        ]
          .filter(Boolean)
          .join(' · ')
      ) +
      '</small></div></div>' +
      '<button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button" data-slwf-export-prediction>Export analysis</button>' +
      '</div></header>' +
      '<main class="slwf-prediction-body">' +
      predictionBody(log) +
      '<div class="slwf-disclaimer"><b>Decision-support notice</b><p>' +
      esc(
        result.disclaimer ||
        'ScoutLink predictions are deterministic estimates based on coach ratings, Match Facts, physical profile and current player data. They are decision-support outputs, not guarantees.'
      ) +
      '</p></div>' +
      '</main>' +
      '<footer class="slwf-prediction-footer">' +
      '<div><b>Analysis saved automatically</b><span>This result can be reopened from Prediction History.</span></div>' +
      '<div class="slwf-prediction-footer-actions">' +
      '<button class="slwf-btn slwf-btn-secondary" type="button" data-slwf-export-prediction>Export analysis</button>' +
      '<button class="slwf-btn" type="button" data-slwf-close-prediction>Close analysis</button>' +
      '</div></footer></article>';

    overlay.classList.add('slwf-open');
    overlay.setAttribute('aria-hidden', 'false');

    overlay.onclick = (event) => {
      if (
        event.target === overlay ||
        event.target.closest('[data-slwf-close-prediction]')
      ) {
        closePredictionOverlay();
        return;
      }

      if (event.target.closest('[data-slwf-export-prediction]')) {
        chooseExport(
          player,
          'prediction',
          log.id,
          log
        );
      }
    };
  }

  function exportLines(player, source, predictionLog) {
    const lines = [
      'SCOUTLINK ' +
        (source === 'prediction'
          ? 'PREDICTION ANALYSIS'
          : 'PLAYER INTELLIGENCE PROFILE'),
      '',
      'Player: ' + playerName(player),
      'Position: ' + playerPosition(player),
      'Age group: ' + (player.age_group || ''),
      'Team: ' + (player.team_name || ''),
      'Overall: ' + (player.overall_rating || ''),
      'Compatibility: ' + (player.compatibilityScore || ''),
      'Appearances: ' + (player.appearances || 0),
      'Goals: ' + (player.goals || 0),
      'Assists: ' + (player.assists || 0)
    ];

    if (source === 'prediction' && predictionLog) {
      const result = predictionLog.result || {};
      lines.push(
        '',
        'Prediction type: ' +
          (result.type || predictionLog.prediction_type || ''),
        'Summary: ' + (result.summary || '')
      );

      safeArray(result.paragraphs).forEach((paragraph) => {
        lines.push(paragraph);
      });

      Object.entries(result)
        .filter(
          ([key, value]) =>
            typeof value === 'number' ||
            (typeof value === 'string' &&
              !['summary', 'disclaimer'].includes(key))
        )
        .slice(0, 30)
        .forEach(([key, value]) => {
          lines.push(
            titleCase(key) + ': ' + value
          );
        });

      lines.push(
        '',
        result.disclaimer ||
          'Decision-support output, not a guarantee.'
      );
    } else {
      [
        'pace',
        'agility',
        'strength',
        'stamina',
        'composure',
        'shooting',
        'passing',
        'dribbling',
        'defending',
        'crossing',
        'vision',
        'positioning',
        'heading',
        'tackling'
      ].forEach((key) => {
        if (player[key] != null) {
          lines.push(titleCase(key) + ': ' + player[key]);
        }
      });
    }

    lines.push('', 'Generated: ' + formatDate(new Date()));
    return lines;
  }

  function pdfEscape(value) {
    return String(value)
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  function wrapText(value, max) {
    const words = String(value || '').split(/\s+/);
    const lines = [];
    let line = '';

    words.forEach((word) => {
      const next = line ? line + ' ' + word : word;

      if (next.length > max && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });

    if (line) lines.push(line);
    return lines;
  }

  function buildSimplePdf(title, lines) {
    const textLines = [];

    lines.forEach((line) => {
      wrapText(line, 88).forEach((wrapped) => {
        textLines.push(wrapped);
      });
    });

    const pageChunks = [];
    for (let i = 0; i < textLines.length; i += 48) {
      pageChunks.push(textLines.slice(i, i + 48));
    }
    if (!pageChunks.length) pageChunks.push([]);

    const objects = [null];
    const pageIds = [];
    const encoder = new TextEncoder();

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] =
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[4] =
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

    pageChunks.forEach((pageLines, index) => {
      const pageId = 5 + index * 2;
      const streamId = pageId + 1;
      pageIds.push(pageId + ' 0 R');

      const commands = [
        '0.03 g 0 724 595 68 re f',
        '0.05 0.45 0.35 rg 0 724 8 68 re f',
        '0 g',
        'BT /F2 20 Tf 42 758 Td (' +
          pdfEscape('ScoutLink') +
          ') Tj ET',
        'BT /F2 11 Tf 42 738 Td (' +
          pdfEscape(title) +
          ') Tj ET'
      ];

      let y = 700;
      pageLines.forEach((line) => {
        commands.push(
          'BT /F1 8.5 Tf 42 ' +
            y +
            ' Td (' +
            pdfEscape(line) +
            ') Tj ET'
        );
        y -= 13;
      });

      commands.push(
        'BT /F1 7 Tf 42 24 Td (' +
          pdfEscape(
            'ScoutLink decision-support export - Page ' +
              (index + 1)
          ) +
          ') Tj ET'
      );

      const stream = commands.join('\n');

      objects[pageId] =
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 792] ' +
        '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ' +
        '/Contents ' +
        streamId +
        ' 0 R >>';

      objects[streamId] =
        '<< /Length ' +
        encoder.encode(stream).length +
        ' >>\nstream\n' +
        stream +
        '\nendstream';
    });

    objects[2] =
      '<< /Type /Pages /Kids [' +
      pageIds.join(' ') +
      '] /Count ' +
      pageIds.length +
      ' >>';

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (let i = 1; i < objects.length; i += 1) {
      if (!objects[i]) continue;
      offsets[i] = encoder.encode(pdf).length;
      pdf += i + ' 0 obj\n' + objects[i] + '\nendobj\n';
    }

    const xref = encoder.encode(pdf).length;
    pdf +=
      'xref\n0 ' +
      objects.length +
      '\n0000000000 65535 f \n';

    for (let i = 1; i < objects.length; i += 1) {
      const offset = offsets[i] || 0;
      pdf +=
        String(offset).padStart(10, '0') +
        ' 00000 n \n';
    }

    pdf +=
      'trailer << /Size ' +
      objects.length +
      ' /Root 1 0 R >>\nstartxref\n' +
      xref +
      '\n%%EOF';

    return new Blob([pdf], {
      type: 'application/pdf'
    });
  }

  function buildSimpleExcel(title, lines) {
    const xmlEscape = (value) =>
      String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rows = [
      '<Row><Cell><Data ss:Type="String">' +
        xmlEscape(title) +
        '</Data></Cell></Row>'
    ].concat(
      lines.map(
        (line) =>
          '<Row><Cell><Data ss:Type="String">' +
          xmlEscape(line) +
          '</Data></Cell></Row>'
      )
    );

    const content =
      '<?xml version="1.0"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Worksheet ss:Name="ScoutLink Export"><Table>' +
      rows.join('') +
      '</Table></Worksheet></Workbook>';

    return new Blob([content], {
      type: 'application/vnd.ms-excel'
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadBase64(payload) {
    const binary = atob(payload.contentBase64 || '');
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    downloadBlob(
      new Blob([bytes], {
        type: payload.mime || 'application/octet-stream'
      }),
      payload.filename || 'scoutlink-export'
    );
  }

  async function performExport(
    player,
    format,
    source,
    predictionLogId,
    predictionLog
  ) {
    const extension = format === 'Excel' ? 'xls' : 'pdf';
    const base = playerName(player)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename =
      base +
      '-' +
      (source === 'prediction' ? 'prediction' : 'profile') +
      '.' +
      extension;

    if (isPublicDemo()) {
      const lines = exportLines(
        player,
        source,
        predictionLog
      );
      const blob =
        format === 'Excel'
          ? buildSimpleExcel('ScoutLink Export', lines)
          : buildSimplePdf('ScoutLink Export', lines);

      downloadBlob(blob, filename);

      try {
        const state =
          typeof getDemoState === 'function'
            ? getDemoState()
            : null;
        if (state) {
          state.usageExports =
            num(state.usageExports) + 1;
          if (typeof setDemoState === 'function') {
            setDemoState(state);
          }
        }
      } catch (_) {}

      toast(
        format +
          ' export created. One demo export was deducted for this session.'
      );
      return;
    }

    const payload = await request(
      'POST',
      '/api/exports/player',
      {
        playerId: player.id,
        format,
        source,
        predictionLogId:
          source === 'prediction'
            ? predictionLogId
            : null
      }
    );

    downloadBase64(payload);

    toast(
      format +
        ' export created. ' +
        (payload.exportsRemaining != null
          ? payload.exportsRemaining +
            ' exports remain.'
          : 'Export usage was deducted.')
    );
  }

  function chooseExport(
    player,
    source,
    predictionLogId,
    predictionLog
  ) {
    const dialog = modal(
      'slwfExportModal',
      source === 'prediction'
        ? 'Export prediction analysis'
        : 'Export player profile',
      '<p style="margin-top:0;color:#52675e;line-height:1.55">Choose a simple Excel workbook or a designed, easy-to-read PDF. Every export is counted against the export allowance.</p>' +
        '<div class="slwf-grid slwf-grid-2">' +
        '<button class="slwf-btn slwf-btn-secondary" type="button" data-slwf-format="Excel">Export simple Excel</button>' +
        '<button class="slwf-btn" type="button" data-slwf-format="PDF">Export designed PDF</button>' +
        '</div>'
    );

    dialog.body.onclick = async (event) => {
      const button = event.target.closest('[data-slwf-format]');
      if (!button) return;

      button.disabled = true;

      try {
        await performExport(
          player,
          button.dataset.slwfFormat,
          source,
          predictionLogId,
          predictionLog
        );
        dialog.close();
      } catch (error) {
        button.disabled = false;
        toast(error.message, 'error');
      }
    };
  }

  function dynamicPredictionFields(type) {
    if (type === 'Position Fit Projection') {
      return (
        '<div class="slwf-field"><label for="slwfTargetPosition">Target position</label>' +
        '<select id="slwfTargetPosition">' +
        optionHtml(
          [
            '',
            'GK',
            'CB',
            'BPD',
            'RB',
            'LB',
            'RWB',
            'LWB',
            'CDM',
            'CM',
            'B2B',
            'CAM',
            'LW',
            'RW',
            'CF',
            'ST',
            'SS'
          ],
          ''
        ) +
        '</select></div>'
      );
    }

    if (type === 'Attribute Development') {
      return (
        '<div class="slwf-field"><label for="slwfDevelopmentFocus">Development focus</label>' +
        '<select id="slwfDevelopmentFocus">' +
        optionHtml(DEVELOPMENT_FOCUSES, 'Balanced Growth') +
        '</select></div>'
      );
    }

    if (type === 'ROI Analysis') {
      return (
        '<div class="slwf-field"><label for="slwfFinancialGoal">Financial goal</label>' +
        '<select id="slwfFinancialGoal">' +
        optionHtml(FINANCIAL_GOALS, 'Balanced value growth') +
        '</select></div>' +
        '<div class="slwf-field"><label for="slwfAcquisitionCost">Acquisition cost</label><input id="slwfAcquisitionCost" type="number" min="0" step="100" placeholder="Optional"></div>' +
        '<div class="slwf-field"><label for="slwfDevelopmentCost">Annual development cost</label><input id="slwfDevelopmentCost" type="number" min="0" step="100" placeholder="Optional"></div>' +
        '<div class="slwf-field"><label for="slwfScoutingCost">Scouting cost</label><input id="slwfScoutingCost" type="number" min="0" step="50" placeholder="Optional"></div>'
      );
    }

    return (
      '<div class="slwf-field"><label for="slwfScenario">Match scenario</label>' +
      '<select id="slwfScenario">' +
      optionHtml(MATCH_SCENARIOS, MATCH_SCENARIOS[0][0]) +
      '</select></div>'
    );
  }

  function predictionInput(type) {
    if (type === 'Position Fit Projection') {
      return {
        targetPosition:
          document.getElementById('slwfTargetPosition')?.value ||
          ''
      };
    }

    if (type === 'Attribute Development') {
      return {
        focus:
          document.getElementById('slwfDevelopmentFocus')?.value ||
          'Balanced Growth'
      };
    }

    if (type === 'ROI Analysis') {
      return {
        financialGoal:
          document.getElementById('slwfFinancialGoal')?.value ||
          'Balanced value growth',
        acquisitionCost:
          num(document.getElementById('slwfAcquisitionCost')?.value) ||
          undefined,
        annualDevelopmentCost:
          num(document.getElementById('slwfDevelopmentCost')?.value) ||
          undefined,
        scoutingCost:
          num(document.getElementById('slwfScoutingCost')?.value) ||
          undefined
      };
    }

    return {
      scenarioKey:
        document.getElementById('slwfScenario')?.value ||
        MATCH_SCENARIOS[0][0]
    };
  }

  function renderPredictionHistory(container, history) {
    const rows = safeArray(history);

    if (!rows.length) {
      container.innerHTML =
        '<div class="slwf-empty">No saved predictions yet. Run an analysis and the detailed result will appear here automatically.</div>';
      return;
    }

    container.innerHTML =
      '<div class="slwf-history-list">' +
      rows
        .map((raw, index) => {
          const log = normalisePredictionLog(raw);
          const player =
            log.player ||
            playerCache?.find(
              (item) => item.id === log.player_id
            ) ||
            {};

          return (
            '<article class="slwf-history-card">' +
            '<div><h4>' +
            esc(log.prediction_type) +
            ' · ' +
            esc(playerName(player)) +
            '</h4><p>' +
            esc(
              log.result?.summary ||
              'Detailed prediction saved.'
            ) +
            '</p><time>' +
            esc(formatDate(log.run_at)) +
            '</time></div>' +
            '<div class="slwf-actions" style="margin-top:0">' +
            '<button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button" data-slwf-history-index="' +
            index +
            '">View detailed analysis</button>' +
            '</div></article>'
          );
        })
        .join('') +
      '</div>';

    container.onclick = (event) => {
      const button = event.target.closest(
        '[data-slwf-history-index]'
      );
      if (!button) return;
      const raw = rows[Number(button.dataset.slwfHistoryIndex)];
      openPredictionOverlay(raw);
    };
  }

  async function mountPredictions() {
    if (
      !pageIs('predictions') ||
      document.getElementById('slwfPredictionsRuntime')
    ) {
      return;
    }

    const runtime = document.createElement('section');
    runtime.id = 'slwfPredictionsRuntime';
    runtime.className = 'slwf-runtime';

    runtime.innerHTML =
      '<article class="slwf-runtime-card">' +
      '<header class="slwf-runtime-head"><div>' +
      '<span class="slwf-kicker">Prediction analysis</span>' +
      '<h2>Run and reopen detailed player predictions</h2>' +
      '<p>Every completed prediction is saved automatically and immediately opens as a detailed analysis overlay. Reopening a saved result does not use another prediction, while every new run does.</p>' +
      '</div><div class="slwf-usage"><small>Prediction usage</small><strong id="slwfPredictionUsage">Loading…</strong></div></header>' +
      '<div class="slwf-runtime-body">' +
      '<div class="slwf-grid slwf-grid-2">' +
      '<div class="slwf-field"><label for="slwfPredictionPlayer">Player</label><select id="slwfPredictionPlayer"><option value="">Loading players…</option></select></div>' +
      '<div class="slwf-field"><label for="slwfPredictionType">Analysis type</label><select id="slwfPredictionType">' +
      optionHtml(PREDICTION_TYPES, 'Position Fit Projection') +
      '</select></div>' +
      '</div>' +
      '<div id="slwfPredictionDynamic" class="slwf-grid slwf-grid-2" style="margin-top:14px">' +
      dynamicPredictionFields('Position Fit Projection') +
      '</div>' +
      '<div class="slwf-actions"><button class="slwf-btn" id="slwfRunPrediction" type="button">Run detailed prediction</button></div>' +
      '<div class="slwf-history"><h3 class="slwf-section-title">Prediction history</h3><div id="slwfPredictionHistory"><div class="slwf-empty">Loading prediction history…</div></div></div>' +
      '</div></article>';

    insertRuntime(runtime);

    const players = await loadPlayers();
    const playerSelect = runtime.querySelector(
      '#slwfPredictionPlayer'
    );
    const params = new URLSearchParams(window.location.search);
    const preselected =
      params.get('playerId') ||
      '';
    playerSelect.innerHTML =
      '<option value="">Choose a player</option>' +
      players
        .map(
          (player) =>
            '<option value="' +
            esc(player.id) +
            '"' +
            (player.id === preselected
              ? ' selected'
              : '') +
            '>' +
            esc(
              playerName(player) +
                ' · ' +
                playerPosition(player) +
                ' · ' +
                (player.team_name || 'No team')
            ) +
            '</option>'
        )
        .join('');

    const typeSelect = runtime.querySelector(
      '#slwfPredictionType'
    );
    const requestedType = params.get('type');
    if (
      requestedType &&
      PREDICTION_TYPES.some(
        ([value]) => value === requestedType
      )
    ) {
      typeSelect.value = requestedType;
    }

    const refreshDynamic = () => {
      runtime.querySelector(
        '#slwfPredictionDynamic'
      ).innerHTML = dynamicPredictionFields(
        typeSelect.value
      );
    };

    typeSelect.onchange = refreshDynamic;
    refreshDynamic();

    const history = await loadPredictionHistory(true);
    const meta = history.__meta || {};
    runtime.querySelector(
      '#slwfPredictionUsage'
    ).textContent =
      meta.remaining == null
        ? 'Tracked by plan'
        : meta.remaining +
          (meta.limit != null ? ' of ' + meta.limit + ' remaining' : ' remaining');

    renderPredictionHistory(
      runtime.querySelector('#slwfPredictionHistory'),
      history
    );

    runtime.querySelector(
      '#slwfRunPrediction'
    ).onclick = async (event) => {
      const button = event.currentTarget;
      const playerId = playerSelect.value;
      const predictionType = typeSelect.value;

      if (!playerId) {
        toast('Choose a player first.', 'error');
        playerSelect.focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Running analysis…';

      try {
        const payload = await request(
          'POST',
          '/api/predictions/run',
          {
            playerId,
            predictionType,
            inputParams: predictionInput(predictionType)
          }
        );
        const player = players.find(
          (item) => item.id === playerId
        );
        const log = normalisePredictionLog(
          {
            id: payload.logId,
            player_id: playerId,
            player,
            prediction_type: predictionType,
            result: payload.result,
            input_params: predictionInput(predictionType),
            run_at: new Date().toISOString(),
            creditsRemaining:
              payload.creditsRemaining ??
              payload.predictionsRemaining
          },
          player
        );

        openPredictionOverlay(log, player);
        predictionHistoryCache = null;
        const nextHistory =
          await loadPredictionHistory(true);
        renderPredictionHistory(
          runtime.querySelector('#slwfPredictionHistory'),
          nextHistory
        );
        const nextMeta = nextHistory.__meta || {};
        runtime.querySelector(
          '#slwfPredictionUsage'
        ).textContent =
          payload.creditsRemaining != null
            ? payload.creditsRemaining + ' remaining'
            : nextMeta.remaining != null
              ? nextMeta.remaining + ' remaining'
              : 'Usage deducted';

        toast(
          'Prediction saved and opened. One prediction was deducted.'
        );
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Run detailed prediction';
      }
    };
  }

  async function profileContext(force) {
    if (profileContextCache && !force) {
      return profileContextCache;
    }

    const playerId = currentPlayerId();
    if (!playerId) return null;

    if (isPublicDemo()) {
      const payload = await request(
        'GET',
        '/api/players/' + encodeURIComponent(playerId)
      );
      const state =
        typeof getDemoState === 'function'
          ? getDemoState()
          : {};
      const predictions = safeArray(state.predictions)
        .filter(
          (log) =>
            log.player_id === playerId &&
            String(
              log.prediction_type ||
              log.result?.type ||
              ''
            ).toLowerCase().includes('position')
        )
        .sort(
          (a, b) =>
            new Date(b.created_at || b.run_at || 0) -
            new Date(a.created_at || a.run_at || 0)
        );

      profileContextCache = {
        ...payload,
        workflow:
          safeArray(state.workflowEntries).filter(
            (entry) => entry.player_id === playerId
          ),
        teamScouts: [
          {
            id: 'demo-scout-noah',
            first_name: 'Noah',
            last_name: 'Patel'
          },
          {
            id: 'demo-scout-ella',
            first_name: 'Ella',
            last_name: 'Brooks'
          }
        ],
        latestPositionFit: predictions[0] || null,
        positionFitUnlocked: predictions.length > 0,
        pipeline:
          safeArray(state.pipeline).find(
            (row) => row.player_id === playerId
          ) || null
      };
      return profileContextCache;
    }

    profileContextCache = await request(
      'GET',
      '/api/scout-workflow-actions/players/' +
        encodeURIComponent(playerId) +
        '/context'
    );
    return profileContextCache;
  }

  function findCompactTextElement(needle) {
    const normalizedNeedle = String(needle)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    for (const root of roots()) {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
      );
      let node;

      while ((node = walker.nextNode())) {
        const value = String(node.nodeValue || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (!value || !value.includes(normalizedNeedle)) {
          continue;
        }

        let element = node.parentElement;

        while (
          element &&
          elementText(element).length > 800
        ) {
          element = element.parentElement;
        }

        if (element) return element;
      }
    }

    return null;
  }

  function patchRoleAnalysis(context) {
    const target =
      findCompactTextElement(ROLE_TEXT) ||
      findCompactTextElement(
        'Centre Forward is the strongest current role'
      );

    if (!target) return;

    let wrapper = target.parentElement;

    if (!wrapper?.classList.contains('slwf-role-lock-wrap')) {
      wrapper = document.createElement('div');
      wrapper.className = 'slwf-role-lock-wrap';
      target.parentNode.insertBefore(wrapper, target);
      wrapper.appendChild(target);
    }

    let action = wrapper.querySelector(
      '.slwf-role-lock-action'
    );

    if (!action) {
      action = document.createElement('div');
      action.className = 'slwf-role-lock-action';
      wrapper.appendChild(action);
    }

    if (context?.positionFitUnlocked) {
      target.classList.remove('slwf-role-locked');
      target.removeAttribute('aria-hidden');
      action.innerHTML =
        '<button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button">View Position Fit analysis</button>';
      action.querySelector('button').onclick = () => {
        openPredictionOverlay(
          context.latestPositionFit,
          context.player
        );
      };
    } else {
      target.classList.add('slwf-role-locked');
      target.setAttribute('aria-hidden', 'true');
      action.innerHTML =
        '<button class="slwf-btn slwf-btn-small" type="button">Run Position Fit prediction to reveal this analysis</button>';
      action.querySelector('button').onclick = () => {
        window.location.href =
          '/scout/predictions?playerId=' +
          encodeURIComponent(context?.player?.id || currentPlayerId()) +
          '&type=' +
          encodeURIComponent('Position Fit Projection');
      };
    }
  }

  function hideEmptyVideoSections(context) {
    const playable = safeArray(context?.videos).filter(
      (video) =>
        video &&
        (video.video_url ||
          video.url ||
          video.file_url)
    );

    if (playable.length) return;

    all('video,iframe[src*="video"],[class*="video-player"]').forEach(
      (node) => {
        const section =
          node.closest(
            'section,article,.card,.panel,[class*="section"]'
          ) || node;
        section.classList.add('slwf-hidden');
      }
    );

    all('h1,h2,h3,h4,h5,[class*="title"]').forEach(
      (heading) => {
        const label = elementText(heading).toLowerCase();

        if (
          label === 'video' ||
          label.includes('video evidence') ||
          label.includes('player video') ||
          label.includes('highlight reel')
        ) {
          const section =
            heading.closest(
              'section,article,.card,.panel,[class*="section"]'
            );
          if (section) section.classList.add('slwf-hidden');
        }
      }
    );
  }

  function findSectionByHeadings(labels) {
    const lowered = labels.map((label) =>
      label.toLowerCase()
    );

    for (const heading of all('h1,h2,h3,h4,h5,[role="heading"]')) {
      const value = elementText(heading).toLowerCase();

      if (
        lowered.some(
          (label) =>
            value === label ||
            value.includes(label)
        )
      ) {
        return (
          heading.closest(
            'section,article,.card,.panel,[class*="section"]'
          ) || heading
        );
      }
    }

    return null;
  }

  function scrollProfileSection(type) {
    const target =
      type === 'team'
        ? findSectionByHeadings([
            'team and external football context',
            'team context',
            'team and club',
            'club and team'
          ])
        : findSectionByHeadings([
            'match evidence',
            'recent matches',
            'match facts',
            'matches'
          ]);

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      return true;
    }

    return false;
  }

  function registerDemoInterest(playerId, interestLevel) {
    const state =
      typeof getDemoState === 'function'
        ? getDemoState()
        : {};
    const player = safeArray(state.players).find(
      (item) => item.id === playerId
    );

    if (!player) {
      return Promise.reject(
        new Error('The demo player could not be found.')
      );
    }

    state.pipeline = safeArray(state.pipeline);
    state.notifications = safeArray(state.notifications);
    state.demoUsage = {
      predictionsUsed: num(state.demoUsage?.predictionsUsed),
      exportsUsed: num(state.demoUsage?.exportsUsed),
      interestsUsed: num(
        state.demoUsage?.interestsUsed,
        state.pipeline.length
      )
    };

    const existing = state.pipeline.find(
      (row) => row.player_id === playerId
    );

    if (existing) {
      return Promise.resolve({
        alreadyRegistered: true,
        pipeline: existing,
        interestsRemaining: Math.max(
          0,
          300 - state.demoUsage.interestsUsed
        ),
        message:
          playerName(player) +
          ' is already in your demo pipeline. No additional interest usage was deducted.'
      });
    }

    const pipeline = {
      id: 'demo-pipeline-' + Date.now(),
      player_id: player.id,
      player,
      stage: 'interested',
      interest_level: interestLevel || 8,
      is_active: true,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      coach: {
        id: 'demo-coach-marcus',
        first_name: 'Marcus',
        last_name: 'Reed',
        email: 'marcus.reed@example.test'
      }
    };

    state.pipeline.unshift(pipeline);
    state.demoUsage.interestsUsed += 1;

    const timestamp = new Date().toISOString();
    state.notifications.unshift(
      {
        id: 'demo-notification-scout-' + Date.now(),
        recipient_id: 'demo-scout-noah',
        recipient_type: 'Scout',
        notification_type: 'recruitment',
        notificationType: 'recruitment',
        filterGroup: 'recruitment',
        typeLabel: 'Recruitment',
        title: 'Interest logged in your pipeline',
        body:
          playerName(player) +
          ' was added to your recruitment pipeline. The player’s coach has been notified.',
        data: {
          playerId: player.id,
          playerName: playerName(player),
          pipelineId: pipeline.id,
          actionUrl:
            '/scout/pipeline?pipelineId=' +
            encodeURIComponent(pipeline.id)
        },
        actionUrl:
          '/scout/pipeline?pipelineId=' +
          encodeURIComponent(pipeline.id),
        actionLabel: 'View pipeline',
        is_read: false,
        isRead: false,
        created_at: timestamp,
        createdAt: timestamp
      },
      {
        id: 'demo-notification-coach-' + Date.now(),
        recipient_id: 'demo-coach-marcus',
        recipient_type: 'Coach',
        notification_type: 'scout_interest',
        notificationType: 'scout_interest',
        filterGroup: 'scout_interest',
        typeLabel: 'Scout interest',
        title: 'A Scout has registered interest in a player',
        body:
          'Noah Patel from ScoutLink Demo FC registered interest in ' +
          playerName(player) +
          '. The interest has been logged in ScoutLink.',
        data: {
          playerId: player.id,
          playerName: playerName(player),
          pipelineId: pipeline.id,
          actionUrl:
            '/coach/my-players?playerId=' +
            encodeURIComponent(player.id)
        },
        actionUrl:
          '/coach/my-players?playerId=' +
          encodeURIComponent(player.id),
        actionLabel: 'View player interest',
        is_read: false,
        isRead: false,
        created_at: timestamp,
        createdAt: timestamp
      }
    );

    if (typeof setDemoState === 'function') {
      setDemoState(state);
    }

    return Promise.resolve({
      pipeline,
      interestsRemaining: Math.max(
        0,
        300 - state.demoUsage.interestsUsed
      ),
      coachNotifiedCount: 1,
      notificationsCreated: 2,
      message:
        playerName(player) +
        ' was added to your demo pipeline. The player’s coach has been notified, the Scout confirmation was created and one interest was deducted.'
    });
  }

  async function registerInterest(button) {
    const playerId = currentPlayerId();
    if (!playerId) {
      toast('Player ID is missing from this profile.', 'error');
      return;
    }

    button.disabled = true;
    const previous = elementText(button);
    button.textContent = 'Registering interest…';

    try {
      const payload = isPublicDemo()
        ? await registerDemoInterest(
            playerId,
            8
          )
        : await request(
            'POST',
            '/api/scout-workflow-actions/interest',
            {
              playerId,
              interestLevel: 8
            }
          );

      button.textContent = 'Interest registered';
      button.dataset.slwfInterestComplete = '1';
      profileContextCache = null;
      toast(
        payload.message ||
          'Interest registered. The player was added to the pipeline and the coach was notified.'
      );
    } catch (error) {
      button.disabled = false;
      button.textContent =
        previous || 'Register interest';
      toast(error.message, 'error');
    }
  }

  function demoWorkflowPayload(playerId) {
    const state =
      typeof getDemoState === 'function'
        ? getDemoState()
        : {};
    const player = safeArray(state.players).find(
      (item) => item.id === playerId
    );
    const pipeline = safeArray(state.pipeline).find(
      (item) => item.player_id === playerId
    );
    const entries = safeArray(state.workflowEntries)
      .filter((item) => item.player_id === playerId)
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      );

    return {
      state,
      player,
      pipeline,
      entries,
      teamScouts: [
        {
          id: 'demo-scout-noah',
          first_name: 'Noah',
          last_name: 'Patel'
        },
        {
          id: 'demo-scout-ella',
          first_name: 'Ella',
          last_name: 'Brooks'
        }
      ]
    };
  }

  async function workflowPayload(options) {
    if (isPublicDemo()) {
      return demoWorkflowPayload(options.playerId);
    }

    if (options.pipelineId) {
      return request(
        'GET',
        '/api/scout-workflow-actions/pipeline/' +
          encodeURIComponent(options.pipelineId) +
          '/workflow'
      );
    }

    return request(
      'GET',
      '/api/scout-workflow-actions/players/' +
        encodeURIComponent(options.playerId) +
        '/workflow'
    );
  }

  function workflowEntryHtml(entry, index) {
    const author =
      entry.author
        ? playerName(entry.author)
        : 'Scout';
    const sharedNames = safeArray(
      entry.sharedWithScouts
    )
      .map((scout) => playerName(scout))
      .join(', ');

    return (
      '<article class="slwf-workflow-entry" data-type="' +
      esc(entry.entry_type || 'note') +
      '">' +
      '<div class="slwf-workflow-entry-head"><strong>' +
      esc(
        entry.entry_type === 'decision'
          ? 'Decision' +
            (entry.decision_value
              ? ' · ' + titleCase(entry.decision_value)
              : '')
          : 'Note'
      ) +
      '</strong>' +
      (entry.canEdit !== false
        ? '<button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button" data-slwf-edit-entry="' +
          index +
          '">Edit</button>'
        : '') +
      '</div><p>' +
      esc(entry.content || '') +
      '</p><div class="slwf-workflow-meta">' +
      esc(author + ' · ' + formatDate(entry.updated_at || entry.created_at)) +
      (sharedNames
        ? '<br>Shared with ' + esc(sharedNames)
        : '') +
      '</div></article>'
    );
  }

  async function saveDemoWorkflow(options, formData, editing) {
    const data = demoWorkflowPayload(options.playerId);
    const state = data.state;
    state.workflowEntries =
      safeArray(state.workflowEntries);
    const sharedWith = safeArray(formData.sharedWith);

    if (editing) {
      const index = state.workflowEntries.findIndex(
        (entry) => entry.id === editing.id
      );
      if (index >= 0) {
        state.workflowEntries[index] = {
          ...state.workflowEntries[index],
          entry_type: formData.entryType,
          content: formData.content,
          decision_value: formData.decisionValue,
          shared_with: sharedWith,
          updated_at: new Date().toISOString()
        };
      }
    } else {
      state.workflowEntries.unshift({
        id: 'demo-workflow-' + Date.now(),
        scout_id: 'demo-scout-noah',
        player_id: options.playerId,
        pipeline_id:
          options.pipelineId ||
          data.pipeline?.id ||
          null,
        entry_type: formData.entryType,
        content: formData.content,
        decision_value: formData.decisionValue,
        shared_with: sharedWith,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
          id: 'demo-scout-noah',
          first_name: 'Noah',
          last_name: 'Patel'
        },
        sharedWithScouts:
          data.teamScouts.filter((scout) =>
            sharedWith.includes(scout.id)
          )
      });
    }

    if (typeof setDemoState === 'function') {
      setDemoState(state);
    }

    return {
      message:
        formData.entryType === 'decision'
          ? 'Demo decision saved and shared.'
          : 'Demo note saved and shared.'
    };
  }

  async function saveWorkflow(
    options,
    formData,
    editing
  ) {
    if (isPublicDemo()) {
      return saveDemoWorkflow(
        options,
        formData,
        editing
      );
    }

    if (editing) {
      return request(
        'PATCH',
        '/api/scout-workflow-actions/workflow/' +
          encodeURIComponent(editing.id),
        {
          content: formData.content,
          decisionValue: formData.decisionValue,
          sharedWith: formData.sharedWith
        }
      );
    }

    const basePath = options.pipelineId
      ? '/api/scout-workflow-actions/pipeline/' +
        encodeURIComponent(options.pipelineId) +
        '/workflow'
      : '/api/scout-workflow-actions/players/' +
        encodeURIComponent(options.playerId) +
        '/workflow';

    return request('POST', basePath, {
      entryType: formData.entryType,
      content: formData.content,
      decisionValue: formData.decisionValue,
      sharedWith: formData.sharedWith
    });
  }

  async function openWorkflowModal(options) {
    let payload;

    try {
      payload = await workflowPayload(options);
    } catch (error) {
      toast(error.message, 'error');
      return;
    }

    const player =
      payload.player ||
      playerCache?.find(
        (item) => item.id === options.playerId
      ) ||
      {};
    const entries = safeArray(payload.entries || payload.workflow);
    const teamScouts = safeArray(payload.teamScouts)
      .filter(
        (scout) =>
          scout.id !==
          (typeof Auth !== 'undefined'
            ? Auth.user?.id
            : localStorage.getItem('sl_user_id'))
      );

    const body =
      '<div id="slwfWorkflowList" class="slwf-workflow-list">' +
      (entries.length
        ? entries
            .map(workflowEntryHtml)
            .join('')
        : '<div class="slwf-empty">No notes or decisions have been recorded for this player yet.</div>') +
      '</div>' +
      '<form id="slwfWorkflowForm">' +
      '<input type="hidden" id="slwfWorkflowEntryId">' +
      '<div class="slwf-grid slwf-grid-2">' +
      '<div class="slwf-field"><label for="slwfWorkflowType">Entry type</label><select id="slwfWorkflowType">' +
      '<option value="note">Note</option><option value="decision">Decision</option>' +
      '</select></div>' +
      '<div class="slwf-field"><label for="slwfDecisionValue">Decision status</label><select id="slwfDecisionValue">' +
      '<option value="">Not applicable</option>' +
      '<option value="progress">Progress</option>' +
      '<option value="hold">Hold</option>' +
      '<option value="trial">Invite to trial</option>' +
      '<option value="approach">Approach coach</option>' +
      '<option value="decline">Decline</option>' +
      '</select></div>' +
      '<div class="slwf-field slwf-field-full"><label for="slwfWorkflowContent">Note or decision rationale</label><textarea id="slwfWorkflowContent" required></textarea></div>' +
      '</div>' +
      '<div class="slwf-field" style="margin-top:14px"><label>Share with other Scouts</label>' +
      checkboxGrid(
        'slwfSharedScout',
        teamScouts.map((scout) => ({
          value: scout.id,
          label: playerName(scout)
        })),
        []
      ) +
      '</div>' +
      '<div class="slwf-actions"><button class="slwf-btn" type="submit" id="slwfSaveWorkflow">Save note or decision</button><button class="slwf-btn slwf-btn-secondary" type="button" id="slwfCancelWorkflowEdit" hidden>Cancel edit</button></div>' +
      '</form>';

    const dialog = modal(
      'slwfWorkflowModal',
      'Notes and decisions · ' + playerName(player),
      body,
      { wide: true }
    );

    let editing = null;
    const form = dialog.body.querySelector(
      '#slwfWorkflowForm'
    );
    const typeSelect = dialog.body.querySelector(
      '#slwfWorkflowType'
    );
    const decisionSelect = dialog.body.querySelector(
      '#slwfDecisionValue'
    );
    const content = dialog.body.querySelector(
      '#slwfWorkflowContent'
    );
    const cancel = dialog.body.querySelector(
      '#slwfCancelWorkflowEdit'
    );

    function sharedValues() {
      return Array.from(
        dialog.body.querySelectorAll(
          'input[name="slwfSharedScout"]:checked'
        )
      ).map((input) => input.value);
    }

    function resetForm() {
      editing = null;
      form.reset();
      cancel.hidden = true;
      dialog.body.querySelector(
        '#slwfSaveWorkflow'
      ).textContent = 'Save note or decision';
    }

    cancel.onclick = resetForm;

    dialog.body
      .querySelector('#slwfWorkflowList')
      .onclick = (event) => {
      const button = event.target.closest(
        '[data-slwf-edit-entry]'
      );
      if (!button) return;

      editing = entries[
        Number(button.dataset.slwfEditEntry)
      ];
      typeSelect.value =
        editing.entry_type || 'note';
      decisionSelect.value =
        editing.decision_value || '';
      content.value =
        editing.content || '';

      const selected = new Set(
        editing.shared_with || []
      );
      dialog.body
        .querySelectorAll(
          'input[name="slwfSharedScout"]'
        )
        .forEach((input) => {
          input.checked = selected.has(input.value);
        });

      cancel.hidden = false;
      dialog.body.querySelector(
        '#slwfSaveWorkflow'
      ).textContent = 'Update note or decision';
      content.focus();
    };

    form.onsubmit = async (event) => {
      event.preventDefault();

      const saveButton = dialog.body.querySelector(
        '#slwfSaveWorkflow'
      );
      const value = content.value.trim();

      if (!value) {
        toast('Enter a note or decision rationale.', 'error');
        content.focus();
        return;
      }

      saveButton.disabled = true;

      try {
        const result = await saveWorkflow(
          options,
          {
            entryType: typeSelect.value,
            decisionValue: decisionSelect.value,
            content: value,
            sharedWith: sharedValues()
          },
          editing
        );

        toast(
          result.message ||
            'Note or decision saved.'
        );
        dialog.close();
        profileContextCache = null;
        await openWorkflowModal(options);

        if (pageIs('pipeline')) {
          await refreshPipelineRuntime();
        }
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        saveButton.disabled = false;
      }
    };
  }

  function mountProfileActions(context) {
    if (
      document.getElementById('slwfProfileActionsRuntime') ||
      !context?.player
    ) {
      return;
    }

    const runtime = document.createElement('section');
    runtime.id = 'slwfProfileActionsRuntime';
    runtime.className = 'slwf-runtime';
    runtime.innerHTML =
      '<article class="slwf-runtime-card">' +
      '<header class="slwf-runtime-head"><div>' +
      '<span class="slwf-kicker">Player actions</span>' +
      '<h2>' + esc(playerName(context.player)) + '</h2>' +
      '<p>Register interest, review the correct profile sections, manage recruitment notes and decisions, export the profile and reopen Position Fit reasoning.</p>' +
      '</div></header>' +
      '<div class="slwf-runtime-body">' +
      '<div class="slwf-actions" style="margin-top:0">' +
      '<button class="slwf-btn" type="button" id="slwfProfileInterest">' +
      (context.pipeline ? 'Already in pipeline' : 'Register interest') +
      '</button>' +
      '<button class="slwf-btn slwf-btn-secondary" type="button" id="slwfProfileTeam">Team</button>' +
      '<button class="slwf-btn slwf-btn-secondary" type="button" id="slwfProfileMatches">Matches</button>' +
      '<button class="slwf-btn slwf-btn-secondary" type="button" id="slwfProfileWorkflow">Notes and decisions</button>' +
      '<button class="slwf-btn slwf-btn-secondary" type="button" id="slwfProfileExport">Export profile</button>' +
      '<button class="slwf-btn slwf-btn-dark" type="button" id="slwfProfilePositionFit">' +
      (context.positionFitUnlocked
        ? 'View Position Fit analysis'
        : 'Run Position Fit prediction') +
      '</button>' +
      '</div>' +
      (context.pipeline
        ? '<div class="slwf-notice">This player is already logged in the recruitment pipeline. Registering interest again will not deduct a second interest.</div>'
        : '') +
      '</div></article>';

    insertRuntime(runtime);

    const interestButton = runtime.querySelector(
      '#slwfProfileInterest'
    );

    if (context.pipeline) {
      interestButton.disabled = true;
    } else {
      interestButton.onclick = () =>
        registerInterest(interestButton);
    }

    runtime.querySelector('#slwfProfileTeam').onclick = () => {
      if (!scrollProfileSection('team')) {
        toast(
          'The team context section could not be found on this profile.',
          'error'
        );
      }
    };

    runtime.querySelector('#slwfProfileMatches').onclick = () => {
      if (!scrollProfileSection('matches')) {
        toast(
          'The match evidence section could not be found on this profile.',
          'error'
        );
      }
    };

    runtime.querySelector('#slwfProfileWorkflow').onclick = () =>
      openWorkflowModal({
        playerId: context.player.id,
        pipelineId: context.pipeline?.id || null
      });

    runtime.querySelector('#slwfProfileExport').onclick = () =>
      chooseExport(
        context.player,
        'profile',
        null,
        null
      );

    runtime.querySelector('#slwfProfilePositionFit').onclick = () => {
      if (context.positionFitUnlocked) {
        openPredictionOverlay(
          context.latestPositionFit,
          context.player
        );
        return;
      }

      window.location.href =
        '/scout/predictions?playerId=' +
        encodeURIComponent(context.player.id) +
        '&type=' +
        encodeURIComponent('Position Fit Projection');
    };
  }

  async function mountProfile() {
    if (!pageIs('profile') || !currentPlayerId()) {
      return;
    }

    let context;

    try {
      context = await profileContext();
    } catch (error) {
      console.warn('[Scout workflow profile]', error);
      return;
    }

    if (!context) return;

    mountProfileActions(context);
    hideEmptyVideoSections(context);
    patchRoleAnalysis(context);
  }

  function patchProfileButtons(event) {
    if (!pageIs('profile')) return;

    const button = clickElement(event);
    if (!button) return;

    const label = elementText(button)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (
      label === 'register interest' ||
      label.includes('register interest')
    ) {
      if (button.dataset.slwfInterestComplete === '1') {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      registerInterest(button);
      return;
    }

    if (
      label === 'export profile' ||
      label.includes('export profile')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      profileContext()
        .then((context) =>
          chooseExport(
            context?.player || {},
            'profile',
            null,
            null
          )
        )
        .catch((error) =>
          toast(error.message, 'error')
        );
      return;
    }

    if (
      label === 'team' ||
      label === 'team details' ||
      label === 'view team'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!scrollProfileSection('team')) {
        toast(
          'The team context section could not be found on this profile.',
          'error'
        );
      }
      return;
    }

    if (
      label === 'matched' ||
      label === 'matches' ||
      label === 'match facts' ||
      label === 'view matches'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!scrollProfileSection('matches')) {
        toast(
          'The match evidence section could not be found on this profile.',
          'error'
        );
      }
      return;
    }

    if (
      label.includes('note') ||
      label.includes('decision')
    ) {
      if (
        label.includes('notes and decisions') ||
        label.includes('add note') ||
        label.includes('record decision')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openWorkflowModal({
          playerId: currentPlayerId()
        });
      }
    }
  }

  function pipelinePlayer(row) {
    return (
      row.players ||
      row.player ||
      row.player_data ||
      {}
    );
  }

  async function pipelineRows() {
    const payload = await request(
      'GET',
      '/api/scouts/pipeline?limit=200'
    );
    return safeArray(payload.data || payload.pipeline);
  }

  function removePipelineSettings() {
    all('button,a,[role="button"]').forEach((element) => {
      const label = elementText(element).toLowerCase();

      if (
        label.includes('pipeline setting') ||
        label === 'settings'
      ) {
        const context = element.closest(
          '#slwfPipelineRuntime,.slwf-runtime'
        );
        if (!context) {
          element.classList.add('slwf-hidden');
        }
      }
    });
  }

  async function changePipelineStage(row, stage, select) {
    select.disabled = true;

    try {
      const payload = isPublicDemo()
        ? await request(
            'PATCH',
            '/api/scouts/pipeline/' +
              encodeURIComponent(row.id),
            { stage }
          )
        : await request(
            'PATCH',
            '/api/scout-workflow-actions/pipeline/' +
              encodeURIComponent(row.id) +
              '/stage',
            { stage }
          );

      row.stage = stage;
      toast(
        payload.message ||
          'Pipeline stage updated.'
      );
    } catch (error) {
      select.value = row.stage || 'watching';
      toast(error.message, 'error');
    } finally {
      select.disabled = false;
    }
  }

  async function refreshPipelineRuntime() {
    const runtime = document.getElementById(
      'slwfPipelineRuntime'
    );
    if (!runtime) return;

    const body = runtime.querySelector(
      '#slwfPipelineRows'
    );

    body.innerHTML =
      '<tr><td colspan="4">Loading pipeline…</td></tr>';

    try {
      const rows = await pipelineRows();

      if (!rows.length) {
        body.innerHTML =
          '<tr><td colspan="4"><div class="slwf-empty">No active players are in the pipeline.</div></td></tr>';
        return;
      }

      body.innerHTML = rows
        .map((row, index) => {
          const player = pipelinePlayer(row);

          return (
            '<tr>' +
            '<td class="slwf-player-cell"><strong>' +
            esc(playerName(player)) +
            '</strong><span>' +
            esc(
              [
                playerPosition(player),
                player.age_group,
                player.team_name
              ]
                .filter(Boolean)
                .join(' · ')
            ) +
            '</span></td>' +
            '<td><select data-slwf-stage-index="' +
            index +
            '">' +
            optionHtml(
              STAGES,
              row.stage || 'watching'
            ) +
            '</select></td>' +
            '<td>' +
            esc(
              row.decision_summary ||
              row.notes ||
              'No note or decision recorded'
            ) +
            '</td>' +
            '<td><button class="slwf-btn slwf-btn-secondary slwf-btn-small" type="button" data-slwf-workflow-index="' +
            index +
            '">Notes and decisions</button></td>' +
            '</tr>'
          );
        })
        .join('');

      body.onclick = (event) => {
        const button = event.target.closest(
          '[data-slwf-workflow-index]'
        );
        if (!button) return;
        const row = rows[
          Number(button.dataset.slwfWorkflowIndex)
        ];
        openWorkflowModal({
          pipelineId: row.id,
          playerId: row.player_id
        });
      };

      body.onchange = (event) => {
        const select = event.target.closest(
          '[data-slwf-stage-index]'
        );
        if (!select) return;
        const row = rows[
          Number(select.dataset.slwfStageIndex)
        ];
        changePipelineStage(
          row,
          select.value,
          select
        );
      };
    } catch (error) {
      body.innerHTML =
        '<tr><td colspan="4"><div class="slwf-notice slwf-notice-danger">' +
        esc(error.message) +
        '</div></td></tr>';
    }
  }

  async function mountPipeline() {
    if (
      !pageIs('pipeline') ||
      document.getElementById('slwfPipelineRuntime')
    ) {
      return;
    }

    const runtime = document.createElement('section');
    runtime.id = 'slwfPipelineRuntime';
    runtime.className = 'slwf-runtime';
    runtime.innerHTML =
      '<article class="slwf-runtime-card">' +
      '<header class="slwf-runtime-head"><div>' +
      '<span class="slwf-kicker">Recruitment workflow</span>' +
      '<h2>Pipeline stages, notes and decisions</h2>' +
      '<p>Move players between stages, review every note and decision, edit existing entries and share selected information with other Scouts.</p>' +
      '</div></header>' +
      '<div class="slwf-runtime-body">' +
      '<div class="slwf-table-wrap"><table class="slwf-table">' +
      '<thead><tr><th>Player</th><th>Stage</th><th>Latest note or decision</th><th>Action</th></tr></thead>' +
      '<tbody id="slwfPipelineRows"><tr><td colspan="4">Loading pipeline…</td></tr></tbody>' +
      '</table></div></div></article>';

    insertRuntime(runtime);
    removePipelineSettings();
    await refreshPipelineRuntime();
  }

  function localDemoComparison(playerA, playerB) {
    const attr = (player, keys) =>
      Math.round(
        keys.reduce(
          (sum, key) =>
            sum +
            clamp(
              num(player[key], 5) <= 10
                ? num(player[key], 5) * 10
                : num(player[key], 50),
              0,
              100
            ),
          0
        ) / keys.length
      );

    const categories = [
      ['Technical', ['passing', 'dribbling', 'shooting', 'crossing']],
      ['Tactical', ['vision', 'positioning', 'composure']],
      ['Physical', ['pace', 'agility', 'strength', 'stamina']],
      ['Match output', ['overall_rating', 'goals', 'assists']],
      ['Compatibility', ['compatibilityScore']]
    ].map(([label, keys]) => ({
      key: label.toLowerCase().replace(/\s+/g, '_'),
      label,
      playerA: attr(playerA, keys),
      playerB: attr(playerB, keys)
    }));

    const scoreA = Math.round(
      categories.reduce((sum, row) => sum + row.playerA, 0) /
        categories.length
    );
    const scoreB = Math.round(
      categories.reduce((sum, row) => sum + row.playerB, 0) /
        categories.length
    );
    const winner = scoreA >= scoreB ? 'a' : 'b';
    const winnerPlayer = winner === 'a' ? playerA : playerB;

    return {
      result: {
        playerA: {
          player: playerA,
          totalScore: scoreA
        },
        playerB: {
          player: playerB,
          totalScore: scoreB
        },
        categories,
        winner,
        recommendation:
          playerName(winnerPlayer) +
          ' is the stronger demo option in the current Scout setup.',
        tradeOff:
          'Review the category margins and validate the leading player through live observation.'
      }
    };
  }

  function renderComparisonOutput(container, result) {
    const playerA = result.playerA?.player || {};
    const playerB = result.playerB?.player || {};
    const scoreA = Math.round(
      num(result.playerA?.totalScore)
    );
    const scoreB = Math.round(
      num(result.playerB?.totalScore)
    );

    container.hidden = false;
    container.innerHTML =
      '<div class="slwf-comparison-hero">' +
      '<div class="slwf-comparison-player"><small>Player A</small><strong>' +
      esc(playerName(playerA)) +
      '</strong></div>' +
      '<div class="slwf-comparison-score">' +
      esc(scoreA + '–' + scoreB) +
      '</div>' +
      '<div class="slwf-comparison-player"><small>Player B</small><strong>' +
      esc(playerName(playerB)) +
      '</strong></div></div>' +
      '<div class="slwf-notice"><strong>' +
      esc(result.recommendation || 'Comparison complete.') +
      '</strong><br>' +
      esc(result.tradeOff || '') +
      '</div>' +
      section(
        'Comparison categories',
        'The comparison appears only after two players have been selected',
        resultTable(
          ['Category', playerName(playerA), playerName(playerB), 'Leader'],
          safeArray(result.categories).map((row) => [
            row.label || titleCase(row.key),
            row.playerA,
            row.playerB,
            num(row.playerA) === num(row.playerB)
              ? 'Tie'
              : num(row.playerA) > num(row.playerB)
                ? playerName(playerA)
                : playerName(playerB)
          ])
        )
      );
  }

  async function mountCompare() {
    if (
      !pageIs('compare') ||
      document.getElementById('slwfCompareRuntime')
    ) {
      return;
    }

    [
      'sl_compare_player_a',
      'sl_compare_player_b',
      'comparePlayerA',
      'comparePlayerB',
      'selectedPlayerA',
      'selectedPlayerB'
    ].forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (_) {}
    });

    const runtime = document.createElement('section');
    runtime.id = 'slwfCompareRuntime';
    runtime.className = 'slwf-runtime';
    runtime.innerHTML =
      '<article class="slwf-runtime-card">' +
      '<header class="slwf-runtime-head"><div>' +
      '<span class="slwf-kicker">Player comparison</span>' +
      '<h2>Choose two players before comparing them</h2>' +
      '<p>No comparison statistics are shown until two different players are selected and the comparison button is pressed.</p>' +
      '</div></header>' +
      '<div class="slwf-runtime-body">' +
      '<div class="slwf-grid slwf-grid-2">' +
      '<div class="slwf-field"><label for="slwfCompareA">Player A</label><select id="slwfCompareA"><option value="">Choose player A</option></select></div>' +
      '<div class="slwf-field"><label for="slwfCompareB">Player B</label><select id="slwfCompareB"><option value="">Choose player B</option></select></div>' +
      '</div>' +
      '<div class="slwf-actions"><button class="slwf-btn" id="slwfCompareButton" type="button" disabled>Compare selected players</button></div>' +
      '<div id="slwfCompareOutput" class="slwf-compare-output" hidden></div>' +
      '</div></article>';

    insertRuntime(runtime);

    const players = await loadPlayers();
    const selectA = runtime.querySelector('#slwfCompareA');
    const selectB = runtime.querySelector('#slwfCompareB');
    const button = runtime.querySelector('#slwfCompareButton');
    const output = runtime.querySelector('#slwfCompareOutput');
    const params = new URLSearchParams(window.location.search);
    const explicitNextAction =
      params.get('source') === 'next-action' ||
      params.get('compare') === '1';

    const options =
      players
        .map(
          (player) =>
            '<option value="' +
            esc(player.id) +
            '">' +
            esc(
              playerName(player) +
                ' · ' +
                playerPosition(player) +
                ' · ' +
                (player.team_name || 'No team')
            ) +
            '</option>'
        )
        .join('');

    selectA.innerHTML =
      '<option value="">Choose player A</option>' +
      options;
    selectB.innerHTML =
      '<option value="">Choose player B</option>' +
      options;

    if (explicitNextAction) {
      selectA.value =
        params.get('playerA') || '';
      selectB.value =
        params.get('playerB') || '';
    }

    const update = () => {
      button.disabled =
        !selectA.value ||
        !selectB.value ||
        selectA.value === selectB.value;
      output.hidden = true;
      output.innerHTML = '';
    };

    selectA.onchange = update;
    selectB.onchange = update;
    update();

    button.onclick = async () => {
      if (button.disabled) return;

      button.disabled = true;
      button.textContent = 'Comparing…';

      try {
        const playerA = players.find(
          (player) => player.id === selectA.value
        );
        const playerB = players.find(
          (player) => player.id === selectB.value
        );
        const payload = isPublicDemo()
          ? localDemoComparison(playerA, playerB)
          : await request(
              'POST',
              '/api/scout-intelligence/compare',
              {
                playerAId: selectA.value,
                playerBId: selectB.value,
                contextKey: 'immediate_starter',
                save: false
              }
            );

        renderComparisonOutput(
          output,
          payload.result || payload
        );
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        button.textContent =
          'Compare selected players';
        button.disabled =
          !selectA.value ||
          !selectB.value ||
          selectA.value === selectB.value;
        output.hidden = !output.innerHTML;
      }
    };
  }

  function demoAttr(player, key) {
    const value = num(player[key], 5);
    return clamp(value <= 10 ? value * 10 : value, 0, 100);
  }

  function average(values) {
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) /
          values.length
      : 50;
  }

  function demoCompatibilityFromSetup(player, setup) {
    const weaknesses = safeArray(setup.teamWeaknesses);
    const roles = safeArray(setup.roleExpectations);
    const goals = safeArray(setup.longTermGoals);
    const style = setup.playingStyle || '';
    const formation = setup.formation || '';

    const weaknessMap = {
      'Insufficient Game Pace and Speed': ['pace', 'agility', 'stamina'],
      'Physical Fragility and Injury Risk': ['stamina', 'strength', 'composure'],
      'Lack of Physical Presence': ['strength', 'jumping', 'heading'],
      'Weak Defensive Base': ['defending', 'positioning', 'tackling'],
      'Poor Defensive Output': ['defending', 'tackling', 'positioning'],
      'Low Team Chemistry and Leadership': ['vision', 'passing', 'composure'],
      'Technical Deficiencies Under Pressure': ['composure', 'dribbling', 'passing'],
      'Tactical Awareness Gaps': ['positioning', 'composure', 'vision'],
      'Poor Goal Output': ['shooting', 'positioning', 'crossing']
    };
    const roleMap = {
      'Aerial Dominance': ['jumping', 'heading', 'strength'],
      'Vision and Creativity': ['vision', 'passing', 'dribbling'],
      'Speed and Agility': ['pace', 'agility', 'stamina'],
      'Tactical Intelligence': ['positioning', 'composure', 'vision'],
      'Ball Retention Under Pressure': ['composure', 'dribbling', 'passing'],
      'Physical Resilience Work Rate': ['stamina', 'strength', 'defending'],
      'Defensive Impact': ['defending', 'tackling', 'positioning'],
      'Offensive Impact': ['shooting', 'dribbling', 'pace', 'crossing'],
      'Progression and Carrying': ['dribbling', 'pace', 'agility'],
      'Leadership and Communication': ['vision', 'passing', 'composure']
    };
    const goalMap = {
      'Physical Growth Potential': ['strength', 'stamina', 'jumping'],
      'Tactical Role Maturity': ['positioning', 'composure', 'vision'],
      'Leadership and Coachability': ['composure', 'vision', 'passing'],
      'Injury Risk and Physical Resilience': ['stamina', 'strength'],
      'Positional Depth Advantage': ['positioning', 'stamina'],
      'Goal Contribution Potential': ['shooting', 'positioning', 'crossing', 'passing'],
      'Financial Viability': ['overall_rating', 'composure']
    };
    const styleMap = {
      'Possession-Based Play': ['passing', 'composure', 'vision', 'dribbling'],
      'High Press': ['stamina', 'pace', 'defending', 'composure'],
      'Counter-Attacking': ['pace', 'stamina', 'dribbling', 'composure'],
      'Build-Up from the Back': ['passing', 'composure', 'vision', 'defending'],
      'Direct Play': ['pace', 'strength', 'heading', 'shooting'],
      'Wing Play': ['pace', 'crossing', 'dribbling', 'agility'],
      'Compact Defence': ['defending', 'positioning', 'tackling'],
      'Vertical Play': ['pace', 'dribbling', 'shooting', 'stamina']
    };

    function scoreSelections(selected, map) {
      const scores = selected
        .map((label) => map[label])
        .filter(Boolean)
        .map((keys) =>
          average(keys.map((key) => demoAttr(player, key)))
        );

      return scores.length ? average(scores) : 50;
    }

    const weaknessFit = scoreSelections(
      weaknesses,
      weaknessMap
    );
    const roleFit = scoreSelections(roles, roleMap);
    const goalFit = scoreSelections(goals, goalMap);
    const styleFit = styleMap[style]
      ? average(
          styleMap[style].map((key) =>
            demoAttr(player, key)
          )
        )
      : 50;
    const positionGroup =
      String(player.position_group || '').toLowerCase();
    const formationBonuses = {
      '4-3-3': {
        goalkeeper: 55,
        defender: 65,
        midfielder: 68,
        forward: 76
      },
      '4-2-3-1': {
        goalkeeper: 55,
        defender: 66,
        midfielder: 80,
        forward: 62
      },
      '4-4-2': {
        goalkeeper: 55,
        defender: 70,
        midfielder: 70,
        forward: 68
      },
      '3-5-2': {
        goalkeeper: 55,
        defender: 62,
        midfielder: 80,
        forward: 66
      },
      '3-4-3': {
        goalkeeper: 55,
        defender: 58,
        midfielder: 70,
        forward: 76
      },
      '4-1-4-1': {
        goalkeeper: 55,
        defender: 66,
        midfielder: 80,
        forward: 58
      }
    };
    const formationFit =
      formationBonuses[formation]?.[positionGroup] ||
      60;
    const raw =
      weaknessFit * 0.4 +
      roleFit * 0.2 +
      styleFit * 0.2 +
      formationFit * 0.1 +
      goalFit * 0.1;
    const appearances = num(player.appearances);
    const confidence =
      appearances === 0
        ? 0.2
        : appearances <= 2
          ? 0.4
          : appearances <= 5
            ? 0.6
            : appearances <= 10
              ? 0.8
              : 1;

    return Math.round(
      clamp(
        raw * confidence +
          50 * (1 - confidence),
        0,
        100
      ) * 10
    ) / 10;
  }

  function applyDemoSetupCompatibility(setup) {
    if (
      !isPublicDemo() ||
      typeof getDemoState !== 'function'
    ) {
      return;
    }

    const state = getDemoState();

    state.players = safeArray(state.players).map(
      (player) => ({
        ...player,
        compatibilityScore:
          demoCompatibilityFromSetup(player, setup)
      })
    );

    state.pipeline = safeArray(state.pipeline).map(
      (row) => {
        const player = state.players.find(
          (item) => item.id === row.player_id
        );

        return {
          ...row,
          player: player || row.player
        };
      }
    );

    if (typeof setDemoState === 'function') {
      setDemoState(state);
    }

    playerCache = null;
  }

  function removeSearchPreferences() {
    all('h1,h2,h3,h4,h5,[role="heading"]').forEach(
      (heading) => {
        const label = elementText(heading).toLowerCase();

        if (
          label.includes('search preferences') ||
          label.includes('player search preferences')
        ) {
          const section =
            heading.closest(
              'section,article,.card,.panel,[class*="section"]'
            );

          if (
            section &&
            !section.closest('#slwfSetupRuntime')
          ) {
            section.classList.add('slwf-hidden');
          }
        }
      }
    );
  }

  async function mountSetup() {
    if (
      !pageIs('setup') ||
      document.getElementById('slwfSetupRuntime')
    ) {
      return;
    }

    removeSearchPreferences();

    let payload;

    try {
      payload = isPublicDemo()
        ? await request('GET', '/api/scouts/setup')
        : await request(
            'GET',
            '/api/scout-workflow-actions/setup'
          );
    } catch (error) {
      toast(error.message, 'error');
      return;
    }

    const prefs = payload.preferences || {};
    const runtime = document.createElement('section');
    runtime.id = 'slwfSetupRuntime';
    runtime.className = 'slwf-runtime';

    runtime.innerHTML =
      '<article class="slwf-runtime-card">' +
      '<header class="slwf-runtime-head"><div>' +
      '<span class="slwf-kicker">Scout setup</span>' +
      '<h2>Set the football brief that drives compatibility</h2>' +
      '<p>Search-only preferences have been removed. Formation, playing style, team weaknesses, role expectations and long-term goals are the setup fields that change compatibility.</p>' +
      '</div></header>' +
      '<form class="slwf-runtime-body" id="slwfSetupForm">' +
      '<div class="slwf-grid slwf-grid-2">' +
      '<div class="slwf-field"><label for="slwfSetupTeamName">Team name</label><input id="slwfSetupTeamName" value="' +
      esc(prefs.teamName || payload.scoutTeam?.team_name || '') +
      '"></div>' +
      '<div class="slwf-field"><label for="slwfSetupRegion">Scout region</label><input id="slwfSetupRegion" value="' +
      esc(prefs.scoutRegion || '') +
      '"></div>' +
      '<div class="slwf-field"><label for="slwfSetupFormation">Formation</label><select id="slwfSetupFormation">' +
      optionHtml(
        FORMATIONS,
        prefs.formation ||
          payload.scoutTeam?.formation ||
          '4-3-3'
      ) +
      '</select></div>' +
      '<div class="slwf-field"><label for="slwfSetupStyle">Playing style</label><select id="slwfSetupStyle">' +
      optionHtml(
        PLAYING_STYLES,
        prefs.playingStyle ||
          payload.scoutTeam?.playing_style ||
          'High Press'
      ) +
      '</select></div>' +
      '</div>' +
      '<div class="slwf-field" style="margin-top:18px"><label>Team weaknesses to solve</label>' +
      checkboxGrid(
        'slwfWeakness',
        WEAKNESSES,
        prefs.teamWeaknesses ||
          payload.scoutTeam?.team_weaknesses ||
          []
      ) +
      '</div>' +
      '<div class="slwf-field" style="margin-top:18px"><label>Role expectations</label>' +
      checkboxGrid(
        'slwfRoleExpectation',
        ROLE_EXPECTATIONS,
        prefs.roleExpectations ||
          payload.scoutTeam?.role_expectations ||
          []
      ) +
      '</div>' +
      '<div class="slwf-field" style="margin-top:18px"><label>Long-term goals</label>' +
      checkboxGrid(
        'slwfLongTermGoal',
        LONG_TERM_GOALS,
        prefs.longTermGoals ||
          payload.scoutTeam?.long_term_goals ||
          []
      ) +
      '</div>' +
      '<div class="slwf-actions"><button class="slwf-btn" type="submit" id="slwfSaveSetup">Save Scout setup and recalculate compatibility</button></div>' +
      '<div id="slwfSetupResult"></div>' +
      '</form></article>';

    insertRuntime(runtime);

    runtime.querySelector('#slwfSetupForm').onsubmit =
      async (event) => {
        event.preventDefault();

        const button = runtime.querySelector(
          '#slwfSaveSetup'
        );
        button.disabled = true;
        button.textContent = 'Saving setup…';

        const checked = (name) =>
          Array.from(
            runtime.querySelectorAll(
              'input[name="' + name + '"]:checked'
            )
          ).map((input) => input.value);

        const setup = {
          teamName:
            runtime.querySelector(
              '#slwfSetupTeamName'
            ).value.trim(),
          clubName:
            runtime.querySelector(
              '#slwfSetupTeamName'
            ).value.trim(),
          scoutRegion:
            runtime.querySelector(
              '#slwfSetupRegion'
            ).value.trim(),
          formation:
            runtime.querySelector(
              '#slwfSetupFormation'
            ).value,
          playingStyle:
            runtime.querySelector(
              '#slwfSetupStyle'
            ).value,
          teamWeaknesses: checked('slwfWeakness'),
          roleExpectations: checked(
            'slwfRoleExpectation'
          ),
          longTermGoals: checked('slwfLongTermGoal')
        };

        try {
          const response = isPublicDemo()
            ? await request(
                'POST',
                '/api/scouts/setup',
                setup
              )
            : await request(
                'POST',
                '/api/scout-workflow-actions/setup',
                setup
              );

          applyDemoSetupCompatibility(setup);
          runtime.querySelector(
            '#slwfSetupResult'
          ).innerHTML =
            '<div class="slwf-notice">' +
            esc(
              response.message ||
              'Scout setup saved. Compatibility now uses the updated brief.'
            ) +
            '</div>';

          toast(
            'Scout setup saved. Compatibility has been recalculated from the updated football brief.'
          );
        } catch (error) {
          toast(error.message, 'error');
        } finally {
          button.disabled = false;
          button.textContent =
            'Save Scout setup and recalculate compatibility';
        }
      };
  }

  function patchPipelineViewButtons(event) {
    if (!pageIs('pipeline')) return;

    const button = clickElement(event);
    if (!button) return;

    const label = elementText(button).toLowerCase();

    if (label === 'view') {
      const rowElement = button.closest(
        'tr,[class*="row"],article,.card'
      );

      if (!rowElement) return;

      const playerLabel = elementText(rowElement);
      pipelineRows()
        .then((rows) => {
          const row = rows.find((item) =>
            playerLabel.includes(
              playerName(pipelinePlayer(item))
            )
          );

          if (row) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openWorkflowModal({
              pipelineId: row.id,
              playerId: row.player_id
            });
          }
        })
        .catch(() => {});
    }
  }

  function semanticPatch() {
    roots().forEach(ensureShadowCss);

    if (pageIs('pipeline')) {
      removePipelineSettings();

      all('button,a,[role="button"]').forEach((element) => {
        if (
          elementText(element).trim().toLowerCase() ===
          'view'
        ) {
          element.textContent =
            'Notes and decisions';
        }
      });
    }

    if (pageIs('setup')) {
      removeSearchPreferences();
    }

    if (pageIs('profile')) {
      mountProfile();
    }
  }

  function globalClickHandler(event) {
    patchProfileButtons(event);
    patchPipelineViewButtons(event);
  }

  function startObservers() {
    window.addEventListener(
      'click',
      globalClickHandler,
      true
    );

    const observer = new MutationObserver(() => {
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(
        semanticPatch,
        80
      );
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.setInterval(semanticPatch, 1400);
  }

  async function init() {
    if (!isScoutExperience()) return;

    installPublicDemoNotificationApi();
    roots().forEach(ensureShadowCss);
    startObservers();

    await Promise.allSettled([
      mountPredictions(),
      mountPipeline(),
      mountCompare(),
      mountSetup(),
      mountProfile()
    ]);

    semanticPatch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePredictionOverlay();

      document
        .querySelectorAll('.slwf-modal.slwf-open')
        .forEach((node) => {
          node.classList.remove('slwf-open');
          node.setAttribute('aria-hidden', 'true');
        });
    }
  });
})();

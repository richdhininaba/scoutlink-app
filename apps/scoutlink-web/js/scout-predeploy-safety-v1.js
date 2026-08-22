'use strict';

/*
 * ScoutLink final pre-deploy safety layer.
 *
 * This file does not replace the Scout Desk/Field renderer. It only resolves
 * final integration contracts before the dedicated Scout repair modules run:
 * - safe Player Search data with real availability;
 * - rich Scout Player Profile detail without exposing unapproved videos;
 * - legacy/dead endpoint aliases used by the final profile repair;
 * - fixture, Compare and Predictions deep-link compatibility;
 * - Profile/Pipeline -> Chat deep links;
 * - individual notification read/open behaviour;
 * - emergency demo state restricted to the supported U7-U16 product scope.
 */
(function () {
  if (window.__SCOUT_PREDEPLOY_SAFETY_V1__) return;
  window.__SCOUT_PREDEPLOY_SAFETY_V1__ = true;

  var VERSION = '20260822.1';
  var originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  var originalApi = typeof window.api === 'function' ? window.api.bind(window) : null;
  var apiWrapped = false;
  var notificationMap = {};
  var chatResolving = false;
  var hydrateTimer = null;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function norm(value) {
    return text(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function pathName() {
    return String(window.location.pathname || '').toLowerCase();
  }

  function declaredRoute() {
    return document.body ? norm(document.body.getAttribute('data-scout-route')) : '';
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        sessionStorage.getItem('sl_public_demo_role') === 'Scout' ||
        sessionStorage.getItem('sl_public_demo_role') === 'scout' ||
        pathName().indexOf('/public-demo/scout') === 0;
    } catch (_) {
      return pathName().indexOf('/public-demo/scout') === 0;
    }
  }

  function isDemo() {
    try {
      return isPublicDemo() ||
        localStorage.getItem('sl_demo_mode') === '1' ||
        localStorage.getItem('sl_token') === 'public-demo-session';
    } catch (_) {
      return isPublicDemo();
    }
  }

  function isSearchRoute() {
    return declaredRoute() === 'search' ||
      /\/scout\/player-search(?:\/|$)/.test(pathName()) ||
      pathName().indexOf('/public-demo/scout/player-search') === 0;
  }

  function isFixtureRoute() {
    return declaredRoute() === 'fixtures' ||
      /\/scout\/fixtures(?:\/|$)/.test(pathName()) ||
      pathName().indexOf('/public-demo/scout/fixtures') === 0;
  }

  function isCompareRoute() {
    return declaredRoute() === 'compare' ||
      pathName().indexOf('compare-players') >= 0;
  }

  function isPredictionsRoute() {
    return declaredRoute() === 'predictions' ||
      /\/scout\/predictions(?:\/|$)/.test(pathName()) ||
      pathName().indexOf('/public-demo/scout/predictions') === 0;
  }

  function isChatRoute() {
    return declaredRoute() === 'chat' ||
      /\/scout\/chat(?:\/|$)/.test(pathName()) ||
      pathName().indexOf('/public-demo/scout/chat') === 0;
  }

  function isNotificationsRoute() {
    return declaredRoute() === 'notifications' ||
      /\/scout\/notifications(?:\/|$)/.test(pathName()) ||
      pathName().indexOf('/public-demo/scout/notifications') === 0;
  }

  function params() {
    return new URLSearchParams(window.location.search || '');
  }

  function safeUrl(input) {
    try {
      return new URL(
        typeof input === 'string' ? input : String(input),
        window.location.href
      );
    } catch (_) {
      return null;
    }
  }

  function rewriteFetchUrl(input) {
    if (!isSearchRoute()) return input;
    var url = safeUrl(input);
    if (!url) return input;

    if (url.pathname === '/api/scout-intelligence-v64/players') {
      url.pathname = '/api/players/scout-search';
      url.search = '';
      return url.toString();
    }

    if (isPublicDemo() && url.pathname === '/api/players/public-demo') {
      url.pathname = '/api/players/public-demo-scout-search';
      url.search = '';
      return url.toString();
    }

    if (isPublicDemo() && url.pathname === '/api/scout-intelligence-v64/public-demo/players') {
      url.pathname = '/api/players/public-demo-scout-search';
      url.search = '';
      return url.toString();
    }

    return input;
  }

  if (originalFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(rewriteFetchUrl(input), init);
      }
      return originalFetch(input, init);
    };
  }

  function demoState() {
    try {
      return typeof window.getDemoState === 'function'
        ? window.getDemoState()
        : JSON.parse(sessionStorage.getItem('sl_public_demo_state') || '{}');
    } catch (_) {
      return {};
    }
  }

  function normaliseDemoState() {
    if (!isDemo()) return;
    var state = demoState();
    if (!state || !Array.isArray(state.players)) return;

    var changed = false;
    state.players.forEach(function (player) {
      if (!player) return;

      var group = String(player.age_group || '').toUpperCase();
      var match = group.match(/^U(\d+)$/);
      if (match && Number(match[1]) > 16) {
        player.age_group = 'U16';
        if (Number(player.age) > 16) player.age = 16;
        changed = true;
      }

      if (norm(player.position_group) === 'forward') {
        player.position_group = 'Attacker';
        changed = true;
      }

      if (!text(player.availability)) {
        player.availability = 'Unknown';
        changed = true;
      }
    });

    if (!changed) return;

    try {
      if (typeof window.setDemoState === 'function') window.setDemoState(state);
      else sessionStorage.setItem('sl_public_demo_state', JSON.stringify(state));
    } catch (_) {}
  }

  function installApiWrapper() {
    if (apiWrapped) return true;
    if (typeof window.api !== 'function') return false;

    originalApi = window.api.bind(window);
    window.api = async function (method, path, body) {
      var verb = String(method || 'GET').toUpperCase();
      var pathname = String(path || '');

      if (
        isDemo() &&
        verb === 'GET' &&
        pathname === '/api/scout-intelligence-v64/public-demo/players'
      ) {
        return { data: (demoState().players || []).slice() };
      }

      var demoDetail = pathname.match(
        /^\/api\/scout-intelligence-v64\/public-demo\/player\/([^/?#]+)$/
      );
      if (isDemo() && verb === 'GET' && demoDetail) {
        return originalApi(
          'GET',
          '/api/players/' + encodeURIComponent(decodeURIComponent(demoDetail[1]))
        );
      }

      var liveDetail = pathname.match(
        /^\/api\/scout-intelligence-v64\/player\/([^/?#]+)$/
      );
      if (!isDemo() && verb === 'GET' && liveDetail) {
        return originalApi(
          'GET',
          '/api/players/scout-detail/' +
            encodeURIComponent(decodeURIComponent(liveDetail[1]))
        );
      }

      var legacyVideos = pathname.match(
        /^\/api\/players\/([^/?#]+)\/videos$/
      );
      if (verb === 'GET' && legacyVideos) {
        return originalApi(
          'GET',
          '/api/videos?playerId=' +
            encodeURIComponent(decodeURIComponent(legacyVideos[1]))
        );
      }

      if (
        isSearchRoute() &&
        verb === 'GET' &&
        pathname === '/api/scout-intelligence-v64/players'
      ) {
        return originalApi('GET', '/api/players/scout-search');
      }

      return originalApi(method, path, body);
    };

    apiWrapped = true;
    return true;
  }

  function aliasFixtureQuery() {
    if (!isFixtureRoute()) return;
    var query = params();
    var fixtureId = query.get('fixtureId');
    if (!fixtureId || query.get('fixture')) return;

    query.set('fixture', fixtureId);
    var next = window.location.pathname +
      '?' + query.toString() +
      (window.location.hash || '');
    window.history.replaceState(null, '', next);
  }

  function scoutRoot() {
    var host = document.getElementById('scoutExperienceApp');
    return host && host.shadowRoot ? host.shadowRoot : document;
  }

  function optionValue(select, wanted) {
    if (!select || !wanted) return '';
    var wantedNorm = norm(wanted);
    var options = Array.prototype.slice.call(select.options || []);
    var exact = options.find(function (option) {
      return String(option.value) === String(wanted);
    });
    if (exact) return exact.value;

    var byText = options.find(function (option) {
      return norm(option.textContent) === wantedNorm ||
        norm(option.value) === wantedNorm;
    });
    return byText ? byText.value : '';
  }

  function applySelect(select, value) {
    var resolved = optionValue(select, value);
    if (!resolved || select.value === resolved) return !!resolved;
    select.value = resolved;
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
  }

  function compareDeepLink() {
    if (!isCompareRoute()) return true;
    var query = params();
    var firstId = query.get('playerA') ||
      (query.get('source') === 'next-action' ? query.get('player') : '');
    var secondId = query.get('playerB') || '';
    if (!firstId && !secondId) return true;

    var root = scoutRoot();
    if (!root) return false;
    var selects = Array.prototype.slice.call(root.querySelectorAll('select'));
    var playerSelects = selects.filter(function (select) {
      return Array.prototype.slice.call(select.options || []).some(function (option) {
        return String(option.value) === String(firstId) ||
          (secondId && String(option.value) === String(secondId));
      });
    });

    if (!playerSelects.length) return false;

    var firstDone = !firstId || applySelect(playerSelects[0], firstId);
    var secondDone = !secondId;

    if (secondId) {
      var second = playerSelects.find(function (select) {
        return select !== playerSelects[0] && optionValue(select, secondId);
      });
      secondDone = !!second && applySelect(second, secondId);
    }

    return firstDone && secondDone;
  }

  function canonicalPredictionAliases(value) {
    var map = {
      'position fit projection': ['Position Fit Projection', 'Position Fit'],
      'position fit': ['Position Fit Projection', 'Position Fit'],
      'attribute development': ['Attribute Development', 'Development Trajectory'],
      'development trajectory': ['Attribute Development', 'Development Trajectory'],
      'match scenario prediction': ['Match Scenario Prediction', 'Match Scenario'],
      'match scenario': ['Match Scenario Prediction', 'Match Scenario'],
      'roi analysis': ['ROI Analysis', 'Player Value'],
      'player value': ['ROI Analysis', 'Player Value']
    };
    return map[norm(value)] || [value];
  }

  function predictionsDeepLink() {
    if (!isPredictionsRoute()) return true;
    var query = params();
    var playerId = query.get('playerId') || query.get('player') || '';
    var type = query.get('type') || '';
    if (!playerId && !type) return true;

    var root = scoutRoot();
    if (!root) return false;
    var selects = Array.prototype.slice.call(root.querySelectorAll('select'));

    var playerDone = !playerId;
    if (playerId) {
      var playerSelect = selects.find(function (select) {
        return !!optionValue(select, playerId);
      });
      playerDone = !!playerSelect && applySelect(playerSelect, playerId);
    }

    var typeDone = !type;
    if (type) {
      var aliases = canonicalPredictionAliases(type);
      var typeSelect = selects.find(function (select) {
        return aliases.some(function (alias) {
          return !!optionValue(select, alias);
        });
      });

      if (typeSelect) {
        var selectedAlias = aliases.find(function (alias) {
          return !!optionValue(typeSelect, alias);
        });
        typeDone = applySelect(typeSelect, selectedAlias);
      } else {
        var buttons = Array.prototype.slice.call(
          root.querySelectorAll('button,.prediction-type,[role="button"]')
        );
        var button = buttons.find(function (candidate) {
          return aliases.some(function (alias) {
            return norm(candidate.textContent) === norm(alias);
          });
        });
        if (button) {
          button.click();
          typeDone = true;
        }
      }
    }

    return playerDone && typeDone;
  }

  function startDeepLinkHydration() {
    if (!isCompareRoute() && !isPredictionsRoute()) return;
    if (hydrateTimer) return;

    var attempts = 0;
    hydrateTimer = window.setInterval(function () {
      attempts += 1;
      var done = compareDeepLink() && predictionsDeepLink();
      if (done || attempts >= 48) {
        window.clearInterval(hydrateTimer);
        hydrateTimer = null;
      }
    }, 250);
  }

  function notify(message, isError) {
    var node = document.createElement('div');
    node.setAttribute('role', isError ? 'alert' : 'status');
    node.textContent = message;
    node.style.cssText =
      'position:fixed;z-index:1000001;right:18px;bottom:18px;max-width:360px;' +
      'padding:12px 14px;border:1px solid #d9dfdb;border-radius:12px;' +
      'background:#fff;color:#24352c;box-shadow:0 12px 32px rgba(0,0,0,.12);' +
      'font:600 13px Archivo,Arial,sans-serif';
    document.body.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 3200);
  }

  function waitForThread(threadId) {
    if (!threadId) return;
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      var roots = [document];
      var host = document.getElementById('scoutExperienceApp');
      if (host && host.shadowRoot) roots.push(host.shadowRoot);

      var row = null;
      roots.some(function (root) {
        row = root.querySelector(
          '[data-scnc-thread-id="' +
          String(threadId).replace(/"/g, '\\"') +
          '"]'
        );
        return !!row;
      });

      if (row) {
        window.clearInterval(timer);
        row.click();
        return;
      }

      if (attempts >= 48) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  function chatDeepLink() {
    if (!isChatRoute() || chatResolving) return;
    var query = params();
    var threadId = query.get('thread') || query.get('threadId') || '';
    var playerId = query.get('player') || query.get('playerId') || '';

    if (threadId) {
      waitForThread(threadId);
      return;
    }

    if (!playerId) return;
    chatResolving = true;

    if (isDemo()) {
      var demoThread = 'demo-chat-1';
      query.delete('player');
      query.delete('playerId');
      query.set('thread', demoThread);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + '?' + query.toString()
      );
      chatResolving = false;
      waitForThread(demoThread);
      return;
    }

    if (!installApiWrapper()) {
      chatResolving = false;
      return;
    }

    window.api(
      'POST',
      '/api/scout-intelligence-v64/chat/threads',
      { playerId: playerId }
    ).then(function (payload) {
      var thread = payload && (payload.thread || payload.data || payload);
      var id = thread && (thread.id || thread.thread_id || thread.threadId);
      if (!id) throw new Error('The player conversation could not be opened.');

      query.delete('player');
      query.delete('playerId');
      query.delete('threadId');
      query.set('thread', id);
      window.location.replace(
        window.location.pathname +
        '?' + query.toString()
      );
    }).catch(function (error) {
      chatResolving = false;
      notify(
        error.message || 'The player conversation could not be opened.',
        true
      );
    });
  }

  function rawNotifications(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    return [];
  }

  function refreshNotificationMap() {
    if (!isNotificationsRoute() || isDemo() || !installApiWrapper()) {
      return Promise.resolve();
    }

    return window.api('GET', '/api/notifications?limit=100')
      .then(function (payload) {
        notificationMap = {};
        rawNotifications(payload).forEach(function (notification) {
          if (!notification || !notification.id) return;
          notificationMap[String(notification.id)] = notification;
        });
      })
      .catch(function () {});
  }

  function makeNotificationRowsInteractive() {
    if (!isNotificationsRoute()) return;
    var roots = [document];
    var host = document.getElementById('scoutExperienceApp');
    if (host && host.shadowRoot) roots.push(host.shadowRoot);

    roots.forEach(function (root) {
      Array.prototype.slice.call(
        root.querySelectorAll('.scnc-notification-row[data-scnc-notification-id]')
      ).forEach(function (row) {
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', 'Open notification');
        row.style.cursor = 'pointer';
      });
    });
  }

  function notificationAction(notification) {
    if (!notification) return '';
    if (notification.actionUrl) return notification.actionUrl;
    if (notification.action_url) return notification.action_url;
    if (notification.data && typeof notification.data.actionUrl === 'string') {
      return notification.data.actionUrl;
    }
    return '';
  }

  function openNotificationRow(row) {
    if (!row || row.getAttribute('data-spds-busy') === '1') return;
    var id = String(row.getAttribute('data-scnc-notification-id') || '');
    if (!id) return;

    row.setAttribute('data-spds-busy', '1');
    var notification = notificationMap[id] || null;
    var action = notificationAction(notification);

    if (isDemo()) {
      if (action && action.charAt(0) === '/') {
        window.location.assign(action);
      }
      return;
    }

    if (!installApiWrapper()) {
      row.removeAttribute('data-spds-busy');
      return;
    }

    window.api('PATCH', '/api/notifications/' + encodeURIComponent(id) + '/read', {})
      .then(function (payload) {
        var updated = payload && payload.data;
        if (updated) notificationMap[id] = updated;

        if (action && action.charAt(0) === '/') {
          window.location.assign(action);
          return;
        }

        window.location.reload();
      })
      .catch(function (error) {
        row.removeAttribute('data-spds-busy');
        notify(error.message || 'Notification could not be opened.', true);
      });
  }

  function notificationInteraction(event) {
    if (!isNotificationsRoute()) return;
    var row = event.target && event.target.closest
      ? event.target.closest('.scnc-notification-row[data-scnc-notification-id]')
      : null;
    if (!row) return;

    if (
      event.type === 'keydown' &&
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    openNotificationRow(row);
  }

  function periodicUiRepairs() {
    installApiWrapper();
    normaliseDemoState();
    aliasFixtureQuery();
    startDeepLinkHydration();
    chatDeepLink();

    if (isNotificationsRoute()) {
      makeNotificationRowsInteractive();
      refreshNotificationMap();
    }
  }

  document.addEventListener('click', notificationInteraction, true);
  document.addEventListener('keydown', notificationInteraction, true);
  document.addEventListener('DOMContentLoaded', periodicUiRepairs);
  window.addEventListener('pageshow', periodicUiRepairs);

  var observer = new MutationObserver(function () {
    if (isNotificationsRoute()) makeNotificationRowsInteractive();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  periodicUiRepairs();

  window.__SCOUT_PREDEPLOY_SAFETY_VERSION__ = VERSION;
}());

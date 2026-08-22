'use strict';

/* Final ScoutLink cleanup: Chat, Notifications and Preferences navigation. */
(function () {
  if (window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_V1__) return;
  window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_V1__ = true;

  var VERSION = '20260822.1';
  var DEMO_MESSAGE_KEY = 'sl_scout_chat_cleanup_demo_messages_v1';
  var activeThreadId = '';
  var activeNotificationTab = 'new';
  var chatThreads = [];
  var chatLoaded = false;
  var notifications = [];
  var notificationsLoaded = false;
  var chatBusy = false;
  var notificationBusy = false;
  var observer = null;
  var scheduled = null;

  var DEMO_THREAD = {
    id: 'demo-chat-1',
    scout_id: 'demo-scout-1',
    coach_id: 'demo-coach-1',
    player_id: 'demo-player-1',
    scout_name: 'Noah Patel',
    scout_role: 'Scout',
    coach_name: 'Marcus Reed',
    coach_role: 'Coach',
    organisation_name: 'Northgate United (Demo)',
    player_name: 'Ethan Cole',
    last_message: 'Thanks Noah — I’ll add the fixture context after Saturday.',
    unread_count: 1,
    updated_at: new Date().toISOString()
  };

  var DEMO_MESSAGES = [
    {
      id: 'demo-chat-message-1',
      thread_id: 'demo-chat-1',
      sender_id: 'demo-scout-1',
      sender_type: 'Scout',
      sender_name: 'Noah Patel',
      body: 'Hi Marcus — I’m reviewing Ethan Cole for an U13 midfield brief. Could you share anything I should know before Saturday?',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'demo-chat-message-2',
      thread_id: 'demo-chat-1',
      sender_id: 'demo-coach-1',
      sender_type: 'Coach',
      sender_name: 'Marcus Reed',
      body: 'Thanks Noah — I’ll add the fixture context after Saturday.',
      created_at: new Date(Date.now() - 3000000).toISOString()
    }
  ];

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function norm(value) {
    return text(value).toLowerCase();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function arr(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.threads)) return value.threads;
    if (Array.isArray(value.messages)) return value.messages;
    if (Array.isArray(value.notifications)) return value.notifications;
    if (value.data && Array.isArray(value.data.data)) return value.data.data;
    return [];
  }

  function first(value) {
    return Array.isArray(value) ? (value[0] || null) : (value || null);
  }

  function pick(object, keys) {
    for (var i = 0; object && i < keys.length; i += 1) {
      var value = object[keys[i]];
      if (value !== undefined && value !== null && text(value) !== '') return value;
    }
    return null;
  }

  function fullName(object) {
    if (!object) return '';
    var direct = pick(object, ['name', 'full_name', 'fullName', 'display_name', 'displayName']);
    if (direct) return text(direct);
    return text([pick(object, ['first_name', 'firstName']), pick(object, ['last_name', 'lastName'])].filter(Boolean).join(' '));
  }

  function initials(name) {
    var parts = text(name).split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function routePath() {
    return String(window.location.pathname || '').toLowerCase();
  }

  function declaredRoute() {
    return document.body ? String(document.body.getAttribute('data-scout-route') || '').toLowerCase() : '';
  }

  function isScoutContext() {
    var path = routePath();
    if (path.indexOf('/public-demo/scout') === 0 || path.indexOf('/scout') === 0) return true;
    if (document.body && document.body.classList.contains('scout-experience-body')) return true;
    try {
      var role = String(
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') ||
        sessionStorage.getItem('sl_preview_role') ||
        localStorage.getItem('sl_type') ||
        (window.Auth && window.Auth.type) || ''
      ).toLowerCase();
      return role === 'scout';
    } catch (_) {
      return false;
    }
  }

  function isDemo() {
    try {
      return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) ||
        (typeof window.isDemoMode === 'function' && window.isDemoMode()) ||
        sessionStorage.getItem('sl_public_demo') === '1' ||
        sessionStorage.getItem('sl_admin_demo_role') === 'scout' ||
        localStorage.getItem('sl_demo_mode') === '1';
    } catch (_) {
      return false;
    }
  }

  function isChatRoute() {
    return isScoutContext() && (declaredRoute() === 'chat' || /\/scout\/chat(?:\/|$)/.test(routePath()) || routePath().indexOf('/public-demo/scout/chat') === 0);
  }

  function isNotificationRoute() {
    return isScoutContext() && (declaredRoute() === 'notifications' || /\/scout\/notifications(?:\/|$)/.test(routePath()) || routePath().indexOf('/public-demo/scout/notifications') === 0);
  }

  function api(method, path, body) {
    if (typeof window.api === 'function') return window.api(method, path, body);
    var token = '';
    try { token = localStorage.getItem('sl_token') || ''; } catch (_) {}
    var headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) throw new Error(payload.error || payload.message || 'Request failed.');
        return payload;
      });
    });
  }

  function toast(message, error) {
    if (typeof window.showToast === 'function') {
      try { window.showToast(message, !!error); return; } catch (_) {}
    }
    var node = document.createElement('div');
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    node.style.cssText = 'position:fixed;z-index:99999;right:18px;bottom:18px;max-width:360px;padding:12px 14px;border:1px solid #d9dfdb;border-radius:12px;background:#fff;color:#24352c;box-shadow:0 12px 32px rgba(0,0,0,.12);font:600 13px Archivo,Arial,sans-serif';
    document.body.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 2600);
  }

  function injectStyles() {
    if (document.getElementById('scncFinalCleanupStyles')) return;
    var style = document.createElement('style');
    style.id = 'scncFinalCleanupStyles';
    style.textContent = [
      '[data-scnc-chat-container="1"] .thread-row:not([data-scnc-thread-id]){display:none!important}',
      '[data-scnc-chat-container="1"] .empty:not(.scnc-empty){display:none!important}',
      '[data-scnc-notifications-body="1"] .slfr2-notification-tabs,[data-scnc-notifications-body="1"] .slfr2-notification-list{display:none!important}',
      '[data-scnc-notifications-body="1"] .list-row:not(.scnc-notification-row){display:none!important}',
      '[data-scnc-notifications-body="1"] .empty:not(.scnc-empty){display:none!important}',
      '.scnc-player-context{margin-top:4px;font-size:12px;line-height:1.4;color:#66766d}',
      '.scnc-thread-panel{width:100%;box-sizing:border-box}',
      '.scnc-thread-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:18px}',
      '.scnc-back{flex:0 0 auto;border:1px solid #d9dfdb;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer;font:600 13px Archivo,Arial,sans-serif;color:#24352c}',
      '.scnc-thread-title{min-width:0}',
      '.scnc-thread-title h2{margin:0 0 4px;font:700 20px/1.2 Archivo,Arial,sans-serif;color:#17251e}',
      '.scnc-thread-meta{font:500 12px/1.45 Archivo,Arial,sans-serif;color:#66766d}',
      '.scnc-player-card{margin:0 0 16px;padding:10px 12px;border:1px solid #e2e7e4;border-radius:12px;background:#fafbfa;font:600 12px/1.4 Archivo,Arial,sans-serif;color:#405148}',
      '.scnc-messages{display:flex;flex-direction:column;gap:10px;margin:0 0 16px}',
      '.scnc-message{max-width:min(78%,680px);padding:10px 12px;border:1px solid #e1e6e3;border-radius:14px;background:#fff;color:#24352c}',
      '.scnc-message.scnc-mine{align-self:flex-end;background:#f3f7f4}',
      '.scnc-message-meta{margin-bottom:5px;font:700 11px/1.3 Archivo,Arial,sans-serif;color:#64746b}',
      '.scnc-message-body{white-space:pre-wrap;font:500 13px/1.5 Archivo,Arial,sans-serif}',
      '.scnc-compose{display:flex;gap:8px;align-items:flex-end}',
      '.scnc-compose textarea{flex:1;min-height:74px;box-sizing:border-box;resize:vertical;border:1px solid #ccd5d0;border-radius:12px;padding:10px 12px;font:500 13px/1.45 Archivo,Arial,sans-serif;color:#24352c;background:#fff}',
      '.scnc-compose button{border:0;border-radius:10px;padding:10px 15px;background:#163e2d;color:#fff;cursor:pointer;font:700 13px Archivo,Arial,sans-serif}',
      '.scnc-empty{padding:24px 8px;text-align:center;font:600 13px/1.5 Archivo,Arial,sans-serif;color:#66766d}',
      '.scnc-notification-list{display:flex;flex-direction:column;gap:10px}',
      '.scnc-notification-row{padding:14px;border:1px solid #e1e6e3;border-radius:12px;background:#fff}',
      '.scnc-notification-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.scnc-notification-title{font:700 13px/1.35 Archivo,Arial,sans-serif;color:#24352c}',
      '.scnc-notification-pill{flex:0 0 auto;border-radius:999px;padding:3px 8px;background:#f1f5f2;font:700 10px/1.3 Archivo,Arial,sans-serif;color:#4a5c52}',
      '.scnc-notification-body{margin-top:5px;font:500 12px/1.45 Archivo,Arial,sans-serif;color:#5f7067}',
      '.scnc-notification-time{margin-top:7px;font:500 11px/1.3 Archivo,Arial,sans-serif;color:#87948d}',
      '.scnc-notification-tabs{display:flex;gap:8px;margin-bottom:14px}',
      '.scnc-notification-tab{border:1px solid #d7ded9;border-radius:999px;padding:7px 11px;background:#fff;color:#46584e;cursor:pointer;font:700 12px Archivo,Arial,sans-serif}',
      '.scnc-notification-tab[aria-selected="true"]{background:#163e2d;color:#fff;border-color:#163e2d}',
      '@media (max-width:720px){.scnc-message{max-width:88%}.scnc-compose{flex-direction:column;align-items:stretch}.scnc-compose button{width:100%}}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function removePreferencesNav() {
    if (!isScoutContext()) return;
    var path = routePath();
    if (/\/scout\/preferences(?:\/|$)/.test(path) || path.indexOf('/public-demo/scout/preferences') === 0) {
      var prefix = path.indexOf('/public-demo/scout') === 0 ? '/public-demo/scout/settings' : '/scout/settings';
      window.location.replace(prefix + (window.location.search || '') + (window.location.hash || ''));
      return;
    }

    Array.prototype.slice.call(document.querySelectorAll('a[href],nav button,.sidebar button,.side button,.bottom-nav button,.mobile-nav button')).forEach(function (node) {
      var href = node.getAttribute && String(node.getAttribute('href') || '').toLowerCase().replace(/\/$/, '');
      var label = norm(node.textContent);
      var navLike = !!node.closest('nav,.sidebar,.side,.side-nav,.bottom-nav,.mobile-nav,.drawer,.rail,[role="navigation"]');
      if (href === '/scout/preferences' || href === '/public-demo/scout/preferences' || (navLike && label === 'preferences')) {
        node.remove();
      }
    });
  }

  function coachObject(thread) {
    return first(thread && (thread.coaches || thread.coach || thread.coach_profile || thread.coachProfile));
  }

  function playerObject(thread) {
    return first(thread && (thread.players || thread.player || thread.player_profile || thread.playerProfile));
  }

  function normalizeThread(thread) {
    thread = thread || {};
    var coach = coachObject(thread) || {};
    var player = playerObject(thread) || {};
    var coachName = fullName(coach) || text(pick(thread, ['coach_name', 'coachName', 'contact_name', 'contactName', 'name'])) || 'Coach';
    var playerName = fullName(player) || text(pick(thread, ['player_name', 'playerName'])) || '';
    var organisation = text(pick(coach, ['club_name', 'clubName', 'team_name', 'teamName', 'organisation_name', 'organisationName'])) ||
      text(pick(thread, ['organisation_name', 'organisationName', 'club_name', 'clubName', 'team_name', 'teamName'])) || '';
    return {
      raw: thread,
      id: String(pick(thread, ['id', 'thread_id', 'threadId']) || ''),
      scout_id: String(pick(thread, ['scout_id', 'scoutId']) || ''),
      coach_id: String(pick(thread, ['coach_id', 'coachId']) || pick(coach, ['id']) || ''),
      player_id: String(pick(thread, ['player_id', 'playerId']) || pick(player, ['id']) || ''),
      coach_name: coachName,
      organisation_name: organisation,
      player_name: playerName,
      last_message: text(pick(thread, ['last_message', 'lastMessage', 'preview', 'message_preview', 'messagePreview'])) || 'Open conversation',
      unread_count: Number(pick(thread, ['unread_count', 'unreadCount', 'unread']) || 0),
      updated_at: pick(thread, ['updated_at', 'updatedAt', 'last_message_at', 'lastMessageAt']) || null
    };
  }

  function authName() {
    var user = window.Auth && window.Auth.user;
    if (!user) {
      try { user = JSON.parse(localStorage.getItem('sl_user') || 'null'); } catch (_) { user = null; }
    }
    return fullName(user || {}) || text(pick(user || {}, ['email'])) || (isDemo() ? 'Noah Patel' : 'Scout');
  }

  function authId() {
    var user = window.Auth && window.Auth.user;
    if (!user) {
      try { user = JSON.parse(localStorage.getItem('sl_user') || 'null'); } catch (_) { user = null; }
    }
    return String(pick(user || {}, ['id', 'user_id', 'userId']) || (isDemo() ? 'demo-scout-1' : ''));
  }

  function demoExtraMessages() {
    try {
      var value = JSON.parse(localStorage.getItem(DEMO_MESSAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveDemoExtraMessages(messages) {
    try { localStorage.setItem(DEMO_MESSAGE_KEY, JSON.stringify(messages || [])); } catch (_) {}
  }

  function loadChat(force) {
    if (chatLoaded && !force) return Promise.resolve(chatThreads);
    if (chatBusy) return Promise.resolve(chatThreads);
    chatBusy = true;
    if (isDemo()) {
      chatThreads = [normalizeThread(DEMO_THREAD)];
      chatLoaded = true;
      chatBusy = false;
      return Promise.resolve(chatThreads);
    }
    return api('GET', '/api/scout-intelligence-v64/chat/threads').then(function (payload) {
      chatThreads = arr(payload).map(normalizeThread).filter(function (thread) { return !!thread.id; });
      chatLoaded = true;
      chatBusy = false;
      return chatThreads;
    }).catch(function (error) {
      chatBusy = false;
      chatLoaded = true;
      chatThreads = [];
      if (window.console && console.warn) console.warn('[Scout final chat] threads:', error.message || error);
      return chatThreads;
    });
  }

  function normalizeMessage(message, thread) {
    message = message || {};
    var senderId = String(pick(message, ['sender_id', 'senderId', 'author_id', 'authorId']) || '');
    var senderType = text(pick(message, ['sender_type', 'senderType', 'account_type', 'accountType', 'role']));
    var senderName = text(pick(message, ['sender_name', 'senderName', 'author_name', 'authorName', 'name']));
    var mine = false;
    var me = authId();
    if (senderId && me && senderId === me) mine = true;
    if (!mine && thread && senderId && thread.scout_id && senderId === thread.scout_id) mine = true;
    if (!senderType) {
      if (mine) senderType = 'Scout';
      else if (thread && senderId && thread.coach_id && senderId === thread.coach_id) senderType = 'Coach';
    }
    if (!senderName) senderName = mine ? authName() : (thread && thread.coach_name) || senderType || 'Message';
    return {
      id: String(pick(message, ['id', 'message_id', 'messageId']) || ''),
      sender_id: senderId,
      sender_type: senderType || (mine ? 'Scout' : 'Coach'),
      sender_name: senderName,
      body: text(pick(message, ['body', 'message_body', 'messageBody', 'message', 'content'])),
      created_at: pick(message, ['created_at', 'createdAt', 'sent_at', 'sentAt']) || null,
      mine: mine
    };
  }

  function loadMessages(thread) {
    if (!thread) return Promise.resolve([]);
    if (isDemo()) {
      return Promise.resolve(DEMO_MESSAGES.concat(demoExtraMessages()).map(function (message) { return normalizeMessage(message, thread); }));
    }
    return api('GET', '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(thread.id) + '/messages').then(function (payload) {
      return arr(payload).map(function (message) { return normalizeMessage(message, thread); });
    });
  }

  function findChatContainers() {
    var found = [];
    var seen = [];
    function add(node) {
      if (node && seen.indexOf(node) < 0) { seen.push(node); found.push(node); }
    }
    Array.prototype.slice.call(document.querySelectorAll('.thread-row')).forEach(function (row) { add(row.parentNode); });
    Array.prototype.slice.call(document.querySelectorAll('.empty,.slfr2-empty,.scnc-empty')).forEach(function (empty) {
      var value = norm(empty.textContent);
      if (value.indexOf('conversation') >= 0 || value.indexOf('chat') >= 0) add(empty.parentNode);
    });
    Array.prototype.slice.call(document.querySelectorAll('[data-scnc-chat-container="1"]')).forEach(add);
    return found;
  }

  function buildThreadRow(thread) {
    var row = document.createElement('div');
    row.className = 'thread-row';
    row.setAttribute('data-scnc-thread-id', thread.id);
    row.setAttribute('data-scnc-row-signature', [thread.id, thread.coach_name, thread.player_name, thread.last_message].join('|'));
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.innerHTML =
      '<div class="avatar">' + esc(initials(thread.coach_name)) + '</div>' +
      '<div class="tx">' +
        '<b>' + esc(thread.coach_name) + '</b>' +
        '<div class="org">' + esc(['Coach', thread.organisation_name].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="scnc-player-context">Player discussed: ' + esc(thread.player_name || 'Player') + '</div>' +
        '<div class="pv">' + esc(thread.last_message || 'Open conversation') + '</div>' +
      '</div>';
    return row;
  }

  function directHost(container, attribute) {
    var children = container ? container.children : [];
    for (var i = 0; i < children.length; i += 1) {
      if (children[i].hasAttribute && children[i].hasAttribute(attribute)) return children[i];
    }
    return null;
  }

  function chatHost(container) {
    var host = directHost(container, 'data-scnc-chat-host');
    if (host) return host;
    host = document.createElement('div');
    host.setAttribute('data-scnc-chat-host', '1');
    host.style.width = '100%';
    container.appendChild(host);
    return host;
  }

  function renderChatLists() {
    if (!isChatRoute() || activeThreadId) return;
    var containers = findChatContainers();
    if (!containers.length) return;
    var signature = 'list:' + chatThreads.map(function (thread) {
      return [thread.id, thread.coach_name, thread.player_name, thread.last_message, thread.unread_count].join('|');
    }).join('::');
    containers.forEach(function (container) {
      container.setAttribute('data-scnc-chat-container', '1');
      var host = chatHost(container);
      var currentRows = Array.prototype.slice.call(host.querySelectorAll('[data-scnc-thread-id]'));
      var rowStateMatches = currentRows.length === chatThreads.length && currentRows.every(function (row, index) {
        var thread = chatThreads[index];
        if (!thread) return false;
        var expected = [thread.id, thread.coach_name, thread.player_name, thread.last_message].join('|');
        var nameNode = row.querySelector('.tx b');
        var playerNode = row.querySelector('.scnc-player-context');
        var previewNode = row.querySelector('.pv');
        return row.getAttribute('data-scnc-row-signature') === expected &&
          text(nameNode && nameNode.textContent) === thread.coach_name &&
          norm(playerNode && playerNode.textContent) === norm('Player discussed: ' + (thread.player_name || 'Player')) &&
          text(previewNode && previewNode.textContent) === (thread.last_message || 'Open conversation');
      });
      var emptyStateMatches = !chatThreads.length && !!host.querySelector('.scnc-empty');
      if (host.getAttribute('data-scnc-signature') === signature && (rowStateMatches || emptyStateMatches)) return;
      host.setAttribute('data-scnc-signature', signature);
      host.innerHTML = '';
      if (!chatThreads.length) {
        var empty = document.createElement('div');
        empty.className = 'scnc-empty';
        empty.innerHTML = '<b>No permitted conversations yet</b><p>Add a player to your pipeline before opening a coach conversation.</p>';
        host.appendChild(empty);
        return;
      }
      chatThreads.slice(0, 30).forEach(function (thread) { host.appendChild(buildThreadRow(thread)); });
    });
    fixNoahRoleLabels();
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try { return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return date.toLocaleString(); }
  }

  function renderThreadPanel(thread, messages) {
    var containers = findChatContainers();
    if (!containers.length) return;
    var signature = 'thread:' + thread.id + ':' + messages.map(function (message) { return [message.id, message.body, message.sender_type].join('|'); }).join('::');
    containers.forEach(function (container) {
      container.setAttribute('data-scnc-chat-container', '1');
      var host = chatHost(container);
      if (host.getAttribute('data-scnc-signature') === signature) return;
      host.setAttribute('data-scnc-signature', signature);
      var panel = document.createElement('section');
      panel.className = 'scnc-thread-panel';
      panel.setAttribute('data-scnc-thread-panel', thread.id);
      var messageHtml = messages.length ? messages.map(function (message) {
        return '<div class="scnc-message' + (message.mine ? ' scnc-mine' : '') + '">' +
          '<div class="scnc-message-meta">' + esc(message.sender_name) + ' · ' + esc(message.sender_type) + (message.created_at ? ' · ' + esc(formatDate(message.created_at)) : '') + '</div>' +
          '<div class="scnc-message-body">' + esc(message.body) + '</div>' +
        '</div>';
      }).join('') : '<div class="scnc-empty">No messages in this conversation yet.</div>';
      panel.innerHTML =
        '<div class="scnc-thread-head">' +
          '<button type="button" class="scnc-back" data-scnc-chat-back="1" aria-label="Back to conversations">←</button>' +
          '<div class="scnc-thread-title"><h2>' + esc(thread.coach_name) + '</h2>' +
            '<div class="scnc-thread-meta">Coach' + (thread.organisation_name ? ' · ' + esc(thread.organisation_name) : '') + '</div></div>' +
        '</div>' +
        '<div class="scnc-player-card">Player discussed: ' + esc(thread.player_name || 'Player') + '</div>' +
        '<div class="scnc-messages" aria-live="polite">' + messageHtml + '</div>' +
        '<form class="scnc-compose" data-scnc-compose="' + esc(thread.id) + '">' +
          '<label style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" for="scncMessage-' + esc(thread.id) + '">Message</label>' +
          '<textarea id="scncMessage-' + esc(thread.id) + '" name="message" placeholder="Write a message" required></textarea>' +
          '<button type="submit">Send</button>' +
        '</form>';
      host.innerHTML = '';
      host.appendChild(panel);
    });
  }

  function openThread(threadId) {
    var thread = chatThreads.filter(function (item) { return item.id === threadId; })[0];
    if (!thread) return;
    activeThreadId = thread.id;
    loadMessages(thread).then(function (messages) {
      renderThreadPanel(thread, messages);
    }).catch(function (error) {
      toast(error.message || 'Conversation could not be loaded.', true);
      activeThreadId = '';
      renderChatLists();
    });
  }

  function closeThread() {
    activeThreadId = '';
    renderChatLists();
  }

  function sendMessage(threadId, body) {
    var thread = chatThreads.filter(function (item) { return item.id === threadId; })[0];
    if (!thread || !text(body)) return Promise.resolve();
    if (isDemo()) {
      var extra = demoExtraMessages();
      extra.push({
        id: 'demo-chat-message-' + Date.now(),
        thread_id: thread.id,
        sender_id: 'demo-scout-1',
        sender_type: 'Scout',
        sender_name: 'Noah Patel',
        body: text(body),
        created_at: new Date().toISOString()
      });
      saveDemoExtraMessages(extra);
      thread.last_message = text(body);
      return loadMessages(thread).then(function (messages) { renderThreadPanel(thread, messages); });
    }
    return api('POST', '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(thread.id) + '/messages', { body: text(body) }).then(function () {
      thread.last_message = text(body);
      return loadMessages(thread);
    }).then(function (messages) {
      renderThreadPanel(thread, messages);
    });
  }

  function fixNoahRoleLabels() {
    if (!isChatRoute() || !isDemo()) return;
    Array.prototype.slice.call(document.querySelectorAll('.main *,.device *')).forEach(function (node) {
      if (norm(node.textContent) !== 'coach') return;
      var scope = node.closest('.thread-row,.list-row,.card,.panel,.sheet,.modal') || node.parentNode;
      if (scope && norm(scope.textContent).indexOf('noah patel') >= 0) node.textContent = 'Scout';
    });
  }

  function notificationRead(notification) {
    return notification && (notification.is_read === true || notification.isRead === true || !!notification.read_at || !!notification.readAt);
  }

  function normalizeNotification(notification) {
    notification = notification || {};
    return {
      raw: notification,
      id: String(pick(notification, ['id', 'notification_id', 'notificationId']) || ''),
      title: text(pick(notification, ['title', 'heading'])) || 'ScoutLink update',
      body: text(pick(notification, ['body', 'message', 'description'])) || '',
      created_at: pick(notification, ['created_at', 'createdAt', 'sent_at', 'sentAt']) || null,
      is_read: notificationRead(notification)
    };
  }

  function loadNotifications(force) {
    if (notificationsLoaded && !force) return Promise.resolve(notifications);
    if (notificationBusy) return Promise.resolve(notifications);
    notificationBusy = true;
    return api('GET', '/api/notifications?limit=100').then(function (payload) {
      notifications = arr(payload).map(normalizeNotification);
      notificationsLoaded = true;
      notificationBusy = false;
      return notifications;
    }).catch(function (error) {
      notificationBusy = false;
      notificationsLoaded = true;
      notifications = [];
      if (window.console && console.warn) console.warn('[Scout final notifications]:', error.message || error);
      return notifications;
    });
  }

  function notificationBodies() {
    var bodies = [];
    var seen = [];
    function add(node) {
      if (node && seen.indexOf(node) < 0) { seen.push(node); bodies.push(node); }
    }
    Array.prototype.slice.call(document.querySelectorAll('[data-scnc-notifications-body="1"]')).forEach(add);
    if (bodies.length) return bodies;
    Array.prototype.slice.call(document.querySelectorAll('.slfr2-notification-list')).forEach(function (node) { add(node.parentNode); });
    if (bodies.length) return bodies;
    Array.prototype.slice.call(document.querySelectorAll('.main')).forEach(function (main) {
      var hasNotificationText = norm(main.textContent).indexOf('notification') >= 0;
      if (hasNotificationText && isNotificationRoute()) add(main);
    });
    return bodies;
  }

  function notificationHost(body) {
    var host = directHost(body, 'data-scnc-notification-host');
    if (host) return host;
    host = document.createElement('section');
    host.setAttribute('data-scnc-notification-host', '1');
    var first = body.firstChild;
    body.insertBefore(host, first);
    return host;
  }

  function renderNotifications() {
    if (!isNotificationRoute()) return;
    var bodies = notificationBodies();
    if (!bodies.length) return;
    var list = notifications.filter(function (notification) {
      return activeNotificationTab === 'new' ? !notification.is_read : notification.is_read;
    });
    var signature = activeNotificationTab + ':' + list.map(function (notification) {
      return [notification.id, notification.title, notification.body, notification.created_at, notification.is_read].join('|');
    }).join('::');
    bodies.forEach(function (body) {
      body.setAttribute('data-scnc-notifications-body', '1');
      var host = notificationHost(body);
      if (host.getAttribute('data-scnc-signature') === signature) return;
      host.setAttribute('data-scnc-signature', signature);

      var tabs = document.createElement('div');
      tabs.className = 'scnc-notification-tabs';
      tabs.setAttribute('role', 'tablist');
      tabs.innerHTML =
        '<button type="button" class="scnc-notification-tab" data-scnc-notification-tab="new" role="tab" aria-selected="' + (activeNotificationTab === 'new' ? 'true' : 'false') + '">New</button>' +
        '<button type="button" class="scnc-notification-tab" data-scnc-notification-tab="read" role="tab" aria-selected="' + (activeNotificationTab === 'read' ? 'true' : 'false') + '">Read</button>';

      var wrapper = document.createElement('div');
      wrapper.className = 'scnc-notification-list';
      wrapper.setAttribute('data-scnc-notification-list', activeNotificationTab);
      if (!list.length) {
        wrapper.innerHTML = '<div class="scnc-empty">' + (activeNotificationTab === 'new' ? 'No new notifications.' : 'No read notifications.') + '</div>';
      } else {
        wrapper.innerHTML = list.slice(0, 100).map(function (notification) {
          return '<article class="scnc-notification-row" data-scnc-notification-id="' + esc(notification.id) + '">' +
            '<div class="scnc-notification-top"><div class="scnc-notification-title">' + esc(notification.title) + '</div>' +
            '<span class="scnc-notification-pill">' + (notification.is_read ? 'Read' : 'New') + '</span></div>' +
            (notification.body ? '<div class="scnc-notification-body">' + esc(notification.body) + '</div>' : '') +
            (notification.created_at ? '<div class="scnc-notification-time">' + esc(formatDate(notification.created_at)) + '</div>' : '') +
          '</article>';
        }).join('');
      }

      host.innerHTML = '';
      host.appendChild(tabs);
      host.appendChild(wrapper);
    });
  }

  function markAllRead() {
    if (notificationBusy) return;
    notificationBusy = true;
    var action = isDemo() ? Promise.resolve({}) : api('PATCH', '/api/notifications/mark-all-read', {});
    action.then(function () {
      notifications.forEach(function (notification) { notification.is_read = true; });
      notificationsLoaded = isDemo();
      notificationBusy = false;
      activeNotificationTab = 'new';
      if (isDemo()) {
        renderNotifications();
        toast('Notifications marked as read.');
        return;
      }
      return loadNotifications(true).then(function () {
        renderNotifications();
        toast('Notifications marked as read.');
      });
    }).catch(function (error) {
      notificationBusy = false;
      toast(error.message || 'Notifications could not be marked as read.', true);
    });
  }

  function handleClick(event) {
    var threadRow = event.target.closest && event.target.closest('[data-scnc-thread-id]');
    if (threadRow) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openThread(String(threadRow.getAttribute('data-scnc-thread-id') || ''));
      return;
    }

    var back = event.target.closest && event.target.closest('[data-scnc-chat-back]');
    if (back) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      closeThread();
      return;
    }

    var tab = event.target.closest && event.target.closest('[data-scnc-notification-tab]');
    if (tab) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      activeNotificationTab = tab.getAttribute('data-scnc-notification-tab') === 'read' ? 'read' : 'new';
      renderNotifications();
      return;
    }

    var button = event.target.closest && event.target.closest('button,a');
    if (button && isNotificationRoute() && norm(button.textContent) === 'mark all as read') {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      markAllRead();
    }
  }

  function handleKeydown(event) {
    var row = event.target.closest && event.target.closest('[data-scnc-thread-id]');
    if (row && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openThread(String(row.getAttribute('data-scnc-thread-id') || ''));
    }
  }

  function handleSubmit(event) {
    var form = event.target.closest && event.target.closest('[data-scnc-compose]');
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    var threadId = String(form.getAttribute('data-scnc-compose') || '');
    var input = form.querySelector('textarea[name="message"],textarea');
    var body = text(input && input.value);
    if (!body) {
      toast('Write a message before sending.', true);
      return;
    }
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    sendMessage(threadId, body).then(function () {
      if (input) input.value = '';
      if (submit) submit.disabled = false;
      toast('Message sent.');
    }).catch(function (error) {
      if (submit) submit.disabled = false;
      toast(error.message || 'Message could not be sent.', true);
    });
  }

  function run() {
    injectStyles();
    removePreferencesNav();
    if (isChatRoute()) {
      loadChat(false).then(function () {
        if (activeThreadId) {
          var thread = chatThreads.filter(function (item) { return item.id === activeThreadId; })[0];
          var panelPresent = Array.prototype.slice.call(document.querySelectorAll('[data-scnc-thread-panel]')).some(function (panel) {
            return String(panel.getAttribute('data-scnc-thread-panel') || '') === thread.id;
          });
          if (thread && !panelPresent) {
            loadMessages(thread).then(function (messages) { renderThreadPanel(thread, messages); });
          }
        } else {
          renderChatLists();
        }
        fixNoahRoleLabels();
      });
    }
    if (isNotificationRoute()) {
      loadNotifications(false).then(renderNotifications);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = setTimeout(function () {
      scheduled = null;
      run();
    }, 70);
  }

  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('pageshow', run);

  if (document.documentElement) {
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_VERSION__ = VERSION;
  run();
}());

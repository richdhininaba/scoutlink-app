'use strict';

(function () {
  if (window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_V1__) return;
  window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_V1__ = true;

  var VERSION = '20260822.2';
  var activeThreadId = '';
  var threads = [];
  var notifications = [];
  var busy = false;
  var scheduled = false;
  var DEMO_MESSAGE_KEY = 'sl_scout_chat_cleanup_demo_messages_v2';

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function norm(value) {
    return text(value).toLowerCase();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function first(value) {
    return Array.isArray(value) ? (value[0] || null) : (value || null);
  }

  function fullName(object) {
    object = object || {};
    return text(
      object.name ||
      object.full_name ||
      object.fullName ||
      [
        object.first_name || object.firstName,
        object.last_name || object.lastName
      ].filter(Boolean).join(' ')
    );
  }

  function arr(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload) return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.threads)) return payload.threads;
    if (Array.isArray(payload.messages)) return payload.messages;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    return [];
  }

  function isDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        localStorage.getItem('sl_demo_mode') === '1' ||
        localStorage.getItem('sl_token') === 'public-demo-session';
    } catch (_) {
      return false;
    }
  }

  function route() {
    var declared = document.body &&
      document.body.getAttribute('data-scout-route');
    if (declared) return String(declared).toLowerCase();

    var path = String(location.pathname || '').toLowerCase();
    if (path.indexOf('/scout/chat') >= 0) return 'chat';
    if (path.indexOf('/scout/notifications') >= 0) return 'notifications';
    return '';
  }

  function app() {
    return document.getElementById('scoutExperienceApp');
  }

  function roots() {
    var result = [document];
    var host = app();
    if (host && host.shadowRoot) result.unshift(host.shadowRoot);
    return result;
  }

  function each(selector, callback) {
    var seen = [];
    roots().forEach(function (root) {
      Array.prototype.slice.call(root.querySelectorAll(selector)).forEach(function (node) {
        if (seen.indexOf(node) >= 0) return;
        seen.push(node);
        callback(node, root);
      });
    });
  }

  function api(method, path, body) {
    if (typeof window.api === 'function') {
      return window.api(method, path, body);
    }

    var token = '';
    try {
      token = localStorage.getItem('sl_token') || '';
    } catch (_) {}

    var headers = { Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(
      (window.API || 'https://scoutlink-api.vercel.app') + path,
      {
        method: method,
        headers: headers,
        credentials: 'include',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    ).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok) {
          throw new Error(
            payload.error ||
            payload.message ||
            'Request failed.'
          );
        }
        return payload;
      });
    });
  }

  function styleRoot() {
    var host = app();
    return host && host.shadowRoot ? host.shadowRoot : document.head;
  }

  function ensureStyles() {
    var root = styleRoot();
    if (!root || root.querySelector('#scncFinalStyles')) return;

    var style = document.createElement('style');
    style.id = 'scncFinalStyles';
    style.textContent = [
      '.scnc-thread-row{display:flex;align-items:center;gap:12px;padding:14px 10px;border-bottom:1px solid #EBEFEC;cursor:pointer}',
      '.scnc-thread-row:hover{background:#FBFCFB}',
      '.scnc-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#075F48;color:#D3FF2D;font:800 11px Archivo,Arial,sans-serif;flex:none}',
      '.scnc-thread-copy{min-width:0;flex:1}',
      '.scnc-thread-copy b{display:block;font:800 13px Archivo,Arial,sans-serif;color:#0C201A}',
      '.scnc-thread-copy span{display:block;margin-top:3px;font:500 11px/1.4 Archivo,Arial,sans-serif;color:#7C8A82}',
      '.scnc-panel{padding:22px;max-width:820px}',
      '.scnc-back{border:1px solid #DCE3DE;background:#fff;border-radius:9px;padding:8px 10px;font-weight:800;cursor:pointer}',
      '.scnc-messages{display:grid;gap:10px;margin:18px 0}',
      '.scnc-message{max-width:76%;border:1px solid #E7ECE8;border-radius:14px;padding:11px 12px;background:#fff}',
      '.scnc-message.mine{margin-left:auto;background:#F2F7F4}',
      '.scnc-message small{display:block;margin-bottom:5px;color:#7C8A82}',
      '.scnc-compose{display:flex;gap:8px}',
      '.scnc-compose textarea{flex:1;min-height:72px;border:1px solid #DCE3DE;border-radius:11px;padding:10px}',
      '.scnc-compose button{border:0;border-radius:10px;background:#075F48;color:#fff;padding:10px 14px;font-weight:800}',
      '.scnc-notification-feed{display:grid;gap:0}',
      '.scnc-notification{display:block;padding:16px 4px;border-bottom:1px solid #EBEFEC;cursor:pointer}',
      '.scnc-notification.unread{background:#FBFDFB}',
      '.scnc-notification b{display:block;font:800 13px Archivo,Arial,sans-serif;color:#0C201A}',
      '.scnc-notification p{margin:5px 0 0;font:500 12px/1.45 Archivo,Arial,sans-serif;color:#5D6D64}',
      '.scnc-notification small{display:block;margin-top:7px;color:#89958E}',
      '.scnc-empty{padding:24px 8px;text-align:center;color:#7C8A82;font:600 12px Archivo,Arial,sans-serif}',
      '@media(max-width:767px){.scnc-panel{padding:14px}.scnc-message{max-width:88%}.scnc-compose{display:grid}}'
    ].join('');

    root.appendChild(style);
  }

  function removePreferences() {
    each('a[href],button,[role="button"]', function (node) {
      var href = String(
        node.getAttribute &&
        node.getAttribute('href') ||
        ''
      ).toLowerCase().replace(/\/$/,'');

      var label = norm(node.textContent);
      var nav = node.closest &&
        node.closest(
          'nav,.sidebar,.side,.rail,.drawer,.bottom-nav,[role="navigation"]'
        );

      if (
        href === '/scout/preferences' ||
        href === '/public-demo/scout/preferences' ||
        (nav && label === 'preferences')
      ) {
        node.remove();
      }
    });
  }

  function demoState() {
    try {
      return typeof window.getDemoState === 'function'
        ? window.getDemoState()
        : JSON.parse(
            sessionStorage.getItem('sl_public_demo_state') ||
            '{}'
          );
    } catch (_) {
      return {};
    }
  }

  function demoMessages() {
    try {
      var rows = JSON.parse(
        localStorage.getItem(DEMO_MESSAGE_KEY) ||
        '[]'
      );
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function saveDemoMessages(rows) {
    try {
      localStorage.setItem(
        DEMO_MESSAGE_KEY,
        JSON.stringify(rows)
      );
    } catch (_) {}
  }

  function normaliseThread(row) {
    row = row || {};
    var coach = first(
      row.coach ||
      row.coaches ||
      row.coach_profile ||
      row.coachProfile
    ) || {};
    var player = first(
      row.player ||
      row.players ||
      row.player_profile ||
      row.playerProfile
    ) || {};

    return {
      raw: row,
      id: String(
        row.id ||
        row.thread_id ||
        row.threadId ||
        ''
      ),
      scout_id: String(
        row.scout_id ||
        row.scoutId ||
        ''
      ),
      coach_id: String(
        row.coach_id ||
        row.coachId ||
        coach.id ||
        ''
      ),
      player_id: String(
        row.player_id ||
        row.playerId ||
        player.id ||
        ''
      ),
      coach_name:
        fullName(coach) ||
        text(row.coach_name || row.coachName) ||
        'Coach',
      player_name:
        fullName(player) ||
        text(row.player_name || row.playerName) ||
        '',
      organisation: text(
        coach.team_name ||
        coach.club_name ||
        row.organisation_name ||
        row.team_name ||
        ''
      ),
      last_message: text(
        row.last_message ||
        row.lastMessage ||
        row.preview ||
        'Open conversation'
      ),
      unread_count: Number(
        row.unread_count ||
        row.unreadCount ||
        0
      )
    };
  }

  function seededDemoThreads() {
    var state = demoState();
    var source = Array.isArray(state.chats)
      ? state.chats
      : [];

    var rows = source
      .map(normaliseThread)
      .filter(function (thread) {
        return thread.id;
      });

    if (rows.length) return rows;

    return [{
      id: 'demo-chat-1',
      scout_id: 'demo-scout-noah',
      coach_id: 'demo-coach-marcus',
      player_id: 'demo-player-1',
      coach_name: 'Marcus Reed',
      player_name: 'Ethan Cole',
      organisation: 'Northgate United (Demo)',
      last_message:
        'Thanks Noah — I’ll add the fixture context after Saturday.',
      unread_count: 1
    }];
  }

  async function loadThreads() {
    if (isDemo()) {
      threads = seededDemoThreads();
      return threads;
    }

    var payload = await api(
      'GET',
      '/api/scout-intelligence-v64/chat/threads'
    );

    threads = arr(payload)
      .map(normaliseThread)
      .filter(function (thread) {
        return thread.id;
      });

    return threads;
  }

  function threadContainers() {
    var containers = [];
    var seen = [];

    each(
      '.thread-row,.chat-list,.threads,.conversation-list,.empty',
      function (node) {
        var candidate =
          node.classList.contains('thread-row')
            ? node.parentElement
            : node;

        if (!candidate || seen.indexOf(candidate) >= 0) return;

        var copy = norm(candidate.textContent);

        if (
          node.classList.contains('thread-row') ||
          copy.indexOf('conversation') >= 0 ||
          copy.indexOf('select a conversation') >= 0
        ) {
          seen.push(candidate);
          containers.push(candidate);
        }
      }
    );

    return containers;
  }

  function initials(name) {
    return text(name)
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0);
      })
      .join('')
      .slice(0,2)
      .toUpperCase() || 'C';
  }

  function renderThreadList() {
    var containers = threadContainers();
    if (!containers.length) return;

    containers.forEach(function (container) {
      if (container.getAttribute('data-scnc-owned') === 'messages') return;

      container.setAttribute(
        'data-scnc-owned',
        'thread-list'
      );

      container.innerHTML = '';

      if (!threads.length) {
        container.innerHTML =
          '<div class="scnc-empty">No permitted conversations yet.</div>';
        return;
      }

      threads.forEach(function (thread) {
        var row = document.createElement('div');
        row.className = 'scnc-thread-row';
        row.setAttribute(
          'data-scnc-thread-id',
          thread.id
        );
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');

        row.innerHTML =
          '<span class="scnc-avatar">' +
            esc(initials(thread.coach_name)) +
          '</span>' +
          '<span class="scnc-thread-copy">' +
            '<b>' + esc(thread.coach_name) + '</b>' +
            '<span>Coach' +
              (
                thread.organisation
                  ? ' · ' + esc(thread.organisation)
                  : ''
              ) +
            '</span>' +
            '<span>Player discussed: ' +
              esc(thread.player_name || 'Player') +
            '</span>' +
            '<span>' +
              esc(thread.last_message) +
            '</span>' +
          '</span>';

        container.appendChild(row);
      });
    });
  }

  async function loadMessages(thread) {
    if (isDemo()) {
      var state = demoState();
      var seeded =
        state.messages &&
        Array.isArray(state.messages[thread.id])
          ? state.messages[thread.id]
          : [
              {
                id:'demo-msg-1',
                sender_role:'Scout',
                sender_type:'Scout',
                sender_name:'Noah Patel',
                body:
                  'Hi Marcus — I’m reviewing Ethan Cole. ' +
                  'Could you share anything I should know before Saturday?',
                created_at:
                  new Date(
                    Date.now()-3600000
                  ).toISOString()
              },
              {
                id:'demo-msg-2',
                sender_role:'Coach',
                sender_type:'Coach',
                sender_name:thread.coach_name,
                body:
                  'Thanks Noah — I’ll add the fixture context after Saturday.',
                created_at:
                  new Date(
                    Date.now()-3000000
                  ).toISOString()
              }
            ];

      return seeded.concat(
        demoMessages().filter(function (row) {
          return String(row.thread_id) === String(thread.id);
        })
      );
    }

    var payload = await api(
      'GET',
      '/api/scout-intelligence-v64/chat/threads/' +
        encodeURIComponent(thread.id) +
        '/messages'
    );

    return arr(payload);
  }

  function messageSender(message, thread) {
    var role = text(
      message.sender_type ||
      message.sender_role ||
      message.role
    );

    var mine =
      norm(role) === 'scout' ||
      (
        message.sender_id &&
        String(message.sender_id) ===
          String(thread.scout_id)
      );

    var name = text(
      message.sender_name ||
      message.author_name
    );

    if (!name) {
      name = mine
        ? 'Noah Patel'
        : thread.coach_name;
    }

    return {
      mine: mine,
      role: mine ? 'Scout' : 'Coach',
      name: name
    };
  }

  async function openThread(id) {
    var thread = threads.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!thread) return;

    activeThreadId = thread.id;
    var messages = await loadMessages(thread);
    var containers = threadContainers();
    var container = containers[0];

    if (!container) return;

    container.setAttribute(
      'data-scnc-owned',
      'messages'
    );

    container.innerHTML =
      '<section class="scnc-panel">' +
        '<button type="button" class="scnc-back" data-scnc-back>← Conversations</button>' +
        '<h2 style="margin:18px 0 4px">' +
          esc(thread.coach_name) +
        '</h2>' +
        '<div style="color:#7C8A82;font-size:12px">' +
          'Coach' +
          (
            thread.organisation
              ? ' · ' + esc(thread.organisation)
              : ''
          ) +
          ' · Player discussed: ' +
          esc(thread.player_name || 'Player') +
        '</div>' +
        '<div class="scnc-messages">' +
          messages.map(function (message) {
            var sender = messageSender(
              message,
              thread
            );

            return (
              '<div class="scnc-message' +
                (sender.mine ? ' mine' : '') +
              '">' +
                '<small>' +
                  esc(sender.name) +
                  ' · ' +
                  esc(sender.role) +
                '</small>' +
                esc(
                  message.body ||
                  message.message ||
                  message.content ||
                  ''
                ) +
              '</div>'
            );
          }).join('') +
        '</div>' +
        '<form class="scnc-compose" data-scnc-compose="' +
          esc(thread.id) +
        '">' +
          '<textarea name="message" placeholder="Write a message" required></textarea>' +
          '<button type="submit">Send</button>' +
        '</form>' +
      '</section>';
  }

  async function sendMessage(threadId, body) {
    var thread = threads.find(function (item) {
      return String(item.id) ===
        String(threadId);
    });

    if (!thread || !text(body)) return;

    if (isDemo()) {
      var extra = demoMessages();
      extra.push({
        id:'demo-msg-' + Date.now(),
        thread_id:thread.id,
        sender_type:'Scout',
        sender_role:'Scout',
        sender_name:'Noah Patel',
        body:text(body),
        created_at:
          new Date().toISOString()
      });
      saveDemoMessages(extra);
    } else {
      await api(
        'POST',
        '/api/scout-intelligence-v64/chat/threads/' +
          encodeURIComponent(thread.id) +
          '/messages',
        { body:text(body) }
      );
    }

    await openThread(thread.id);
  }

  function normaliseNotification(row) {
    row = row || {};

    return {
      raw: row,
      id: String(row.id || ''),
      title: text(
        row.title ||
        'ScoutLink notification'
      ),
      body: text(
        row.body ||
        row.message ||
        ''
      ),
      created_at:
        row.created_at ||
        row.createdAt ||
        null,
      is_read:
        row.is_read === true ||
        row.isRead === true,
      action_url: text(
        row.actionUrl ||
        row.action_url ||
        (
          row.data &&
          row.data.actionUrl
        ) ||
        ''
      )
    };
  }

  async function loadNotifications() {
    var payload = await api(
      'GET',
      '/api/notifications?limit=100'
    );

    notifications = arr(payload)
      .map(normaliseNotification);

    return notifications;
  }

  function notificationContainer() {
    var result = null;

    each(
      '.notification-list,.notifications,.list,.main,.content',
      function (node) {
        if (result) return;

        var copy = norm(node.textContent);
        if (copy.indexOf('notification') >= 0) {
          result = node;
        }
      }
    );

    return result;
  }

  function formatDate(value) {
    if (!value) return '';

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(
      'en-GB',
      {
        day:'numeric',
        month:'short',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      }
    );
  }

  function renderNotifications() {
    var container = notificationContainer();
    if (!container) return;

    container.setAttribute(
      'data-scnc-notifications',
      '1'
    );

    var rows = notifications
      .slice()
      .sort(function (a,b) {
        return (
          new Date(
            b.created_at ||
            0
          ).getTime() -
          new Date(
            a.created_at ||
            0
          ).getTime()
        );
      });

    container.innerHTML =
      '<div class="scnc-notification-feed">' +
        (
          rows.length
            ? rows.map(function (notification) {
                return (
                  '<article class="scnc-notification' +
                    (
                      notification.is_read
                        ? ''
                        : ' unread'
                    ) +
                  '"' +
                    ' data-scnc-notification-id="' +
                    esc(notification.id) +
                    '" role="button" tabindex="0">' +
                    '<b>' +
                      esc(notification.title) +
                    '</b>' +
                    (
                      notification.body
                        ? '<p>' +
                            esc(notification.body) +
                          '</p>'
                        : ''
                    ) +
                    (
                      notification.created_at
                        ? '<small>' +
                            esc(
                              formatDate(
                                notification.created_at
                              )
                            ) +
                          '</small>'
                        : ''
                    ) +
                  '</article>'
                );
              }).join('')
            : '<div class="scnc-empty">No notifications yet.</div>'
        ) +
      '</div>';
  }

  async function openNotification(id) {
    var notification =
      notifications.find(function (item) {
        return String(item.id) ===
          String(id);
      });

    if (!notification) return;

    if (
      !notification.is_read &&
      !isDemo()
    ) {
      await api(
        'PATCH',
        '/api/notifications/' +
          encodeURIComponent(id) +
          '/read',
        {}
      );
      notification.is_read = true;
    }

    if (
      notification.action_url &&
      notification.action_url.charAt(0) === '/'
    ) {
      location.href =
        notification.action_url;
      return;
    }

    renderNotifications();
  }

  function bindEvents() {
    roots().forEach(function (root) {
      if (root.__SCNC_FINAL_BOUND__) return;
      root.__SCNC_FINAL_BOUND__ = true;

      root.addEventListener(
        'click',
        function (event) {
          var thread =
            event.target.closest &&
            event.target.closest(
              '[data-scnc-thread-id]'
            );

          if (thread) {
            event.preventDefault();
            openThread(
              thread.getAttribute(
                'data-scnc-thread-id'
              )
            );
            return;
          }

          var back =
            event.target.closest &&
            event.target.closest(
              '[data-scnc-back]'
            );

          if (back) {
            activeThreadId = '';
            renderThreadList();
            return;
          }

          var notification =
            event.target.closest &&
            event.target.closest(
              '[data-scnc-notification-id]'
            );

          if (notification) {
            event.preventDefault();
            openNotification(
              notification.getAttribute(
                'data-scnc-notification-id'
              )
            );
          }
        },
        true
      );

      root.addEventListener(
        'keydown',
        function (event) {
          if (
            event.key !== 'Enter' &&
            event.key !== ' '
          ) return;

          var target =
            event.target.closest &&
            event.target.closest(
              '[data-scnc-thread-id],' +
              '[data-scnc-notification-id]'
            );

          if (target) {
            event.preventDefault();
            target.click();
          }
        },
        true
      );

      root.addEventListener(
        'submit',
        function (event) {
          var form =
            event.target.closest &&
            event.target.closest(
              '[data-scnc-compose]'
            );

          if (!form) return;

          event.preventDefault();

          var textarea =
            form.querySelector(
              'textarea'
            );

          var body =
            text(
              textarea &&
              textarea.value
            );

          if (!body) return;

          sendMessage(
            form.getAttribute(
              'data-scnc-compose'
            ),
            body
          );
        },
        true
      );
    });
  }

  async function run() {
    ensureStyles();
    removePreferences();
    bindEvents();

    if (busy) return;
    busy = true;

    try {
      if (route() === 'chat') {
        await loadThreads();

        if (activeThreadId) {
          await openThread(activeThreadId);
        } else {
          renderThreadList();
        }
      }

      if (route() === 'notifications') {
        await loadNotifications();
        renderNotifications();
      }
    } catch (error) {
      console.error(
        '[Scout chat/notifications final]',
        error
      );
    } finally {
      busy = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    setTimeout(function () {
      scheduled = false;
      run();
    }, 100);
  }

  document.addEventListener(
    'DOMContentLoaded',
    run
  );

  window.addEventListener(
    'pageshow',
    run
  );

  var observer =
    new MutationObserver(
      function () {
        removePreferences();
        bindEvents();

        if (
          route() === 'chat' &&
          !activeThreadId
        ) {
          renderThreadList();
        }
      }
    );

  observer.observe(
    document.documentElement,
    {
      childList:true,
      subtree:true
    }
  );

  window.__SCOUT_CHAT_NOTIFICATIONS_CLEANUP_VERSION__ =
    VERSION;

  run();
}());

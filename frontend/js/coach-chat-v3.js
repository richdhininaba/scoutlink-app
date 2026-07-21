'use strict';

(function () {
  var state = {
    threads:[],
    messages:[],
    activeId:null,
    search:'',
    shareOptions:{
      player:[],
      fixture:[],
      prediction:[]
    },
    built:false,
    loadingThreads:false,
    loadingMessages:false
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g,function (char) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char];
    });
  }

  function authType() {
    try {
      return typeof Auth !== 'undefined' ? Auth.type : '';
    } catch (_) {
      return '';
    }
  }

  function authUser() {
    try {
      return typeof Auth !== 'undefined' ? (Auth.user || {}) : {};
    } catch (_) {
      return {};
    }
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function'
      ? window.cleanRouteFor(href)
      : href;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function isMobile() {
    return window.innerWidth <= 900;
  }

  function otherPerson(thread) {
    return authType() === 'Scout'
      ? (thread.coaches || {})
      : (thread.scouts || {});
  }

  function otherNameV3(thread) {
    var person = otherPerson(thread);
    return [person.first_name,person.last_name]
      .filter(Boolean).join(' ') ||
      (authType() === 'Scout' ? 'Coach' : 'Scout');
  }

  function otherRoleLabel() {
    return authType() === 'Scout'
      ? 'Coach'
      : 'Reviewed Scout';
  }

  function playerName(thread) {
    var player = thread && thread.players || {};
    return [player.first_name,player.last_name]
      .filter(Boolean).join(' ') || 'Player';
  }

  function clubName(thread) {
    var person = otherPerson(thread);
    return person.club_name ||
      person.team_name ||
      (thread.players && thread.players.team_name) ||
      '';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return (
      ((parts[0] || '')[0] || '') +
      ((parts[1] || '')[0] || '')
    ).toUpperCase() || 'SL';
  }

  function dateKey(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2,'0'),
      String(date.getDate()).padStart(2,'0')
    ].join('-');
  }

  function dayLabel(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    var now = new Date();
    var yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (dateKey(date) === dateKey(now)) return 'Today';
    if (dateKey(date) === dateKey(yesterday)) return 'Yesterday';

    return date.toLocaleDateString('en-GB',{
      weekday:'short',
      day:'2-digit',
      month:'short',
      year:date.getFullYear() === now.getFullYear()
        ? undefined
        : 'numeric'
    });
  }

  function timeLabel(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB',{
      hour:'2-digit',
      minute:'2-digit'
    });
  }

  function threadTime(thread) {
    var value = thread.lastMessageAt ||
      thread.last_message_at ||
      thread.updated_at ||
      thread.created_at;

    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    var now = new Date();
    if (dateKey(date) === dateKey(now)) return timeLabel(value);

    return date.toLocaleDateString('en-GB',{
      day:'2-digit',
      month:'short'
    });
  }

  function totalUnread() {
    return state.threads.reduce(function (sum,thread) {
      return sum + Number(thread.unreadCount || 0);
    },0);
  }

  function topbarActions() {
    var right = document.querySelector('.topbar-right');
    if (!right) return;

    right.innerHTML =
      '<span class="chatv3-top-pill">Coach-mediated conversations</span>' +
      '<a class="btn" href="/safeguarding">Safety guidance</a>' +
      '<button class="btn" type="button" id="chatv3SignOut">Sign out</button>';

    var signOut = el('chatv3SignOut');
    if (signOut) {
      signOut.addEventListener('click',function () {
        if (typeof window.logoutToLogin === 'function') {
          window.logoutToLogin();
        }
      });
    }
  }

  function buildPage() {
    document.body.classList.add('coach-chat-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Chat';

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Chat';

    topbarActions();

    var page = document.querySelector('.page-content');
    if (!page || page.dataset.chatv3Built === '1') return;

    var banner = page.querySelector('.public-demo-banner');
    if (banner) banner.remove();

    page.dataset.chatv3Built = '1';
    page.innerHTML =
      '<div class="chatv3-root">' +
        '<section class="chatv3-shell ' +
          (isMobile() ? 'is-list' : 'is-detail') +
          '" id="chatv3Shell">' +

          '<aside class="chatv3-conversations" aria-label="Conversations">' +
            '<header class="chatv3-conversation-head">' +
              '<div><h2>Conversations</h2>' +
                '<p id="chatv3ConversationSummary">Loading conversations…</p></div>' +
              '<button class="chatv3-btn is-small" type="button" id="refreshThreads">Refresh</button>' +
            '</header>' +
            '<div class="chatv3-search-wrap">' +
              '<input class="chatv3-search" id="chatv3Search" type="search" placeholder="Search conversations" aria-label="Search conversations">' +
            '</div>' +
            '<div class="chatv3-thread-list" id="threadList">' +
              '<div class="chatv3-loading"><div class="chatv3-spinner" aria-label="Loading conversations"></div></div>' +
            '</div>' +
          '</aside>' +

          '<section class="chatv3-thread" aria-label="Selected conversation">' +
            '<header class="chatv3-thread-head">' +
              '<div class="chatv3-thread-person">' +
                '<button class="chatv3-btn chatv3-back" type="button" id="chatv3Back" aria-label="Back to conversations">‹</button>' +
                '<div class="chatv3-avatar is-large" id="chatv3ActiveAvatar">SL</div>' +
                '<div class="chatv3-thread-copy">' +
                  '<b id="chatTitle">Select a conversation</b>' +
                  '<span id="chatMeta">Chats appear after a Scout adds a player to their pipeline.</span>' +
                '</div>' +
              '</div>' +
              '<div class="chatv3-thread-actions">' +
                '<span class="chatv3-pill is-green" id="chatv3RolePill">Controlled access</span>' +
                '<a class="chatv3-btn is-small" id="profileLink" href="#" hidden>View player</a>' +
              '</div>' +
            '</header>' +

            '<div class="chatv3-safety-note">' +
              '<span>Keep conversations focused on football evidence and use adult-led routes for all player follow-up.</span>' +
              '<a href="/safeguarding">Read safety guidance</a>' +
            '</div>' +

            '<div class="chatv3-share-bar" id="shareBar">' +
              '<select class="chatv3-select" id="shareType" aria-label="Item type to share">' +
                '<option value="player">Player</option>' +
                '<option value="fixture">Fixture</option>' +
                '<option value="prediction">Prediction</option>' +
              '</select>' +
              '<select class="chatv3-select" id="shareTarget" aria-label="Item to share">' +
                '<option value="">Loading…</option>' +
              '</select>' +
              '<button class="chatv3-btn is-small" id="shareBtn" type="button">Share</button>' +
              '<span class="chatv3-share-message" id="shareMsg" aria-live="polite"></span>' +
            '</div>' +

            '<div class="chatv3-messages" id="messages" aria-live="polite">' +
              emptyThreadMarkup() +
            '</div>' +

            '<div class="chatv3-composer">' +
              '<div class="chatv3-compose-wrap">' +
                '<textarea class="chatv3-textarea" id="messageBody" rows="1" placeholder="Write a message…" aria-label="Write a message"></textarea>' +
                '<div class="chatv3-compose-help">Enter to send · Shift and Enter for a new line</div>' +
              '</div>' +
              '<button class="chatv3-btn is-primary" id="sendBtn" type="button">Send</button>' +
            '</div>' +
          '</section>' +
        '</section>' +
      '</div>';

    if (banner) page.insertBefore(banner,page.firstChild);

    state.built = true;
    bindEvents();
    renderShareState();
    renderConversationSummary();
  }

  function bindEvents() {
    el('refreshThreads').addEventListener('click',function () {
      loadThreadsV3(true);
    });

    el('chatv3Search').addEventListener('input',function () {
      state.search = this.value;
      renderThreadsV3();
    });

    el('chatv3Back').addEventListener('click',function () {
      showList();
    });

    el('sendBtn').addEventListener('click',sendMessageV3);

    el('messageBody').addEventListener('keydown',function (event) {
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        sendMessageV3();
      }
    });

    el('messageBody').addEventListener('input',function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight,120) + 'px';
    });

    el('shareType').addEventListener('change',renderShareTargetV3);
    el('shareBtn').addEventListener('click',shareSelectedV3);

    el('threadList').addEventListener('click',function (event) {
      var button = event.target.closest('[data-chatv3-thread]');
      if (!button) return;
      selectThreadV3(button.getAttribute('data-chatv3-thread'));
    });
  }

  function emptyThreadMarkup() {
    return '<div class="chatv3-empty">' +
      '<div class="chatv3-empty-icon" aria-hidden="true">CH</div>' +
      '<h3>Select a conversation</h3>' +
      '<p>Choose a Scout or Coach conversation to review the player context and continue the discussion.</p>' +
    '</div>';
  }

  function roleEmptyMarkup() {
    if (authType() === 'Scout') {
      return '<div class="chatv3-empty">' +
        '<div class="chatv3-empty-icon" aria-hidden="true">SC</div>' +
        '<h3>No conversations yet</h3>' +
        '<p>Add a player to your recruitment pipeline, then start a conversation with their Coach from the player or pipeline page.</p>' +
        '<a class="chatv3-btn is-primary" href="' +
          esc(route('player-search.html')) +
          '">Find players</a></div>';
    }

    return '<div class="chatv3-empty">' +
      '<div class="chatv3-empty-icon" aria-hidden="true">CO</div>' +
      '<h3>No conversations yet</h3>' +
      '<p>A conversation will appear when a reviewed Scout adds one of your players to their pipeline and opens a player-related chat.</p>' +
      '<a class="chatv3-btn is-primary" href="' +
        esc(route('coach-my-players.html')) +
        '">View My Players</a></div>';
  }

  function filteredThreads() {
    var query = state.search.trim().toLowerCase();

    return state.threads.filter(function (thread) {
      if (!query) return true;

      var player = thread.players || {};
      var person = otherPerson(thread);
      var haystack = [
        otherNameV3(thread),
        player.first_name,
        player.last_name,
        player.team_name,
        person.club_name,
        person.team_name,
        thread.lastMessagePreview
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.indexOf(query) >= 0;
    });
  }

  function renderConversationSummary() {
    var summary = el('chatv3ConversationSummary');
    if (!summary) return;

    var unread = totalUnread();
    summary.textContent =
      state.threads.length + ' conversation' +
      (state.threads.length === 1 ? '' : 's') +
      (unread ? ' · ' + unread + ' unread' : ' · All caught up');
  }

  function renderThreadsV3() {
    if (!state.built || !el('threadList')) return;

    renderConversationSummary();

    if (!state.threads.length) {
      el('threadList').innerHTML = roleEmptyMarkup();
      return;
    }

    var threads = filteredThreads();
    if (!threads.length) {
      el('threadList').innerHTML =
        '<div class="chatv3-empty">' +
          '<div class="chatv3-empty-icon" aria-hidden="true">SR</div>' +
          '<h3>No matching conversations</h3>' +
          '<p>Try the Scout, Coach, player or team name.</p>' +
        '</div>';
      return;
    }

    el('threadList').innerHTML = threads.map(function (thread) {
      var name = otherNameV3(thread);
      var context = playerName(thread) +
        (thread.players && thread.players.team_name
          ? ' · ' + thread.players.team_name
          : '');

      var preview = thread.lastMessagePreview ||
        'Conversation about ' + playerName(thread);

      var active = String(state.activeId) === String(thread.id);

      return '<button class="chatv3-conversation' +
        (active ? ' is-active' : '') +
        '" type="button" data-chatv3-thread="' +
        esc(thread.id) + '" aria-pressed="' +
        (active ? 'true' : 'false') + '">' +
          '<span class="chatv3-avatar" aria-hidden="true">' +
            esc(initials(name)) + '</span>' +
          '<span class="chatv3-conversation-copy">' +
            '<b>' + esc(name) + '</b>' +
            '<span class="chatv3-preview">' + esc(preview) + '</span>' +
            '<span class="chatv3-context">' + esc(context) + '</span>' +
          '</span>' +
          '<span class="chatv3-conversation-side">' +
            '<span class="chatv3-conversation-time">' +
              esc(threadTime(thread)) + '</span>' +
            (Number(thread.unreadCount || 0)
              ? '<span class="chatv3-unread">' +
                esc(thread.unreadCount) + '</span>'
              : '<span aria-hidden="true">›</span>') +
          '</span>' +
        '</button>';
    }).join('');
  }

  function activeThread() {
    return state.threads.find(function (thread) {
      return String(thread.id) === String(state.activeId);
    }) || null;
  }

  function renderThreadHeader() {
    var thread = activeThread();
    var profile = el('profileLink');

    if (!thread) {
      el('chatTitle').textContent = 'Select a conversation';
      el('chatMeta').textContent =
        'Chats appear after a Scout adds a player to their pipeline.';
      el('chatv3ActiveAvatar').textContent = 'SL';
      el('chatv3RolePill').textContent = 'Controlled access';
      profile.hidden = true;
      return;
    }

    var name = otherNameV3(thread);
    var parts = [
      otherRoleLabel(),
      clubName(thread),
      'About ' + playerName(thread)
    ].filter(Boolean);

    el('chatTitle').textContent = name;
    el('chatMeta').textContent = parts.join(' · ');
    el('chatv3ActiveAvatar').textContent = initials(name);
    el('chatv3RolePill').textContent = otherRoleLabel();
    el('chatv3RolePill').className =
      'chatv3-pill ' + (authType() === 'Coach' ? 'is-green' : 'is-blue');

    profile.hidden = !thread.player_id;
    if (thread.player_id) {
      profile.href = route(
        'player-profile.html?id=' + encodeURIComponent(thread.player_id)
      );
    }
  }

  function renderShareState() {
    var bar = el('shareBar');
    if (!bar) return;

    var visible = authType() === 'Scout' && !!activeThread();
    bar.classList.toggle('is-visible',visible);

    if (visible) renderShareTargetV3();
  }

  async function loadThreadsV3(showLoading) {
    if (state.loadingThreads) return;
    state.loadingThreads = true;

    if (showLoading && state.built && el('threadList')) {
      el('threadList').innerHTML =
        '<div class="chatv3-loading"><div class="chatv3-spinner" aria-label="Loading conversations"></div></div>';
    }

    try {
      var response = await api('GET','/api/chat/threads');
      state.threads = response.data || [];
      window._threads = state.threads;

      var activeStillExists = state.threads.some(function (thread) {
        return String(thread.id) === String(state.activeId);
      });

      if (!activeStillExists) {
        state.activeId = null;
        state.messages = [];
      }

      renderThreadsV3();
      renderThreadHeader();
      renderShareState();

      if (
        !state.activeId &&
        state.threads[0] &&
        !isMobile()
      ) {
        await selectThreadV3(state.threads[0].id,false);
      } else if (!state.activeId && isMobile()) {
        showList();
      }
    } catch (error) {
      if (state.built && el('threadList')) {
        el('threadList').innerHTML =
          '<div class="chatv3-empty">' +
            '<div class="chatv3-empty-icon" aria-hidden="true">!</div>' +
            '<h3>Conversations could not load</h3>' +
            '<p>' + esc(error.message || 'Try refreshing the page.') + '</p>' +
          '</div>';
      }
    } finally {
      state.loadingThreads = false;
    }
  }

  async function selectThreadV3(id,moveToDetail) {
    var thread = state.threads.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!thread) return;

    state.activeId = thread.id;
    window._activeThread = thread;
    thread.unreadCount = 0;

    renderThreadsV3();
    renderThreadHeader();
    renderShareState();

    if (moveToDetail !== false && isMobile()) showDetail();

    state.loadingMessages = true;
    el('messages').innerHTML =
      '<div class="chatv3-loading"><div class="chatv3-spinner" aria-label="Loading messages"></div></div>';

    try {
      var response = await api(
        'GET',
        '/api/chat/threads/' +
        encodeURIComponent(thread.id) +
        '/messages'
      );

      state.messages = response.data || [];
      renderMessagesV3(state.messages);
      renderConversationSummary();
    } catch (error) {
      el('messages').innerHTML =
        '<div class="chatv3-empty">' +
          '<div class="chatv3-empty-icon" aria-hidden="true">!</div>' +
          '<h3>Messages could not load</h3>' +
          '<p>' + esc(error.message || 'Try the conversation again.') + '</p>' +
        '</div>';
    } finally {
      state.loadingMessages = false;
    }
  }

  function sharedCardMarkup(message) {
    var metadata = message.metadata || {};
    var type = String(message.reference_type || 'item');
    var title = metadata.playerName ||
      metadata.opponent ||
      metadata.predictionType ||
      'Shared item';

    var lines = [];

    if (type === 'player') {
      lines = [
        metadata.position,
        metadata.ageGroup,
        metadata.teamName,
        metadata.stage ? 'Stage: ' + metadata.stage : '',
        metadata.overall ? 'Overall: ' + metadata.overall : ''
      ].filter(Boolean);
    } else if (type === 'fixture') {
      lines = [
        metadata.fixtureDate,
        metadata.fixtureTime,
        metadata.homeOrAway,
        metadata.venue,
        metadata.city
      ].filter(Boolean);
    } else if (type === 'prediction') {
      lines = [
        metadata.playerName,
        metadata.runAt
          ? new Date(metadata.runAt).toLocaleDateString('en-GB')
          : '',
        metadata.summary
      ].filter(Boolean);
    }

    return '<div class="chatv3-shared-card">' +
      '<span class="chatv3-shared-type">Shared ' +
        esc(type) + '</span>' +
      '<b>' + esc(title) + '</b>' +
      (lines.length
        ? '<p>' + esc(lines.join(' · ')) + '</p>'
        : '') +
      (metadata.profileUrl
        ? '<a class="chatv3-btn is-small" href="' +
          esc(metadata.profileUrl) + '">Open profile</a>'
        : '') +
    '</div>';
  }

  function renderMessagesV3(messages) {
    if (!state.built || !el('messages')) return;

    if (!messages.length) {
      el('messages').innerHTML =
        '<div class="chatv3-empty">' +
          '<div class="chatv3-empty-icon" aria-hidden="true">MS</div>' +
          '<h3>No messages yet</h3>' +
          '<p>Start the conversation with a clear football-related question or update.</p>' +
        '</div>';
      return;
    }

    var currentDay = '';

    el('messages').innerHTML = messages.map(function (message) {
      var mine = String(message.sender_id) === String(authUser().id);
      var nextDay = dateKey(message.created_at);
      var divider = '';

      if (nextDay && nextDay !== currentDay) {
        currentDay = nextDay;
        divider =
          '<div class="chatv3-date">' +
          esc(dayLabel(message.created_at)) +
          '</div>';
      }

      return divider +
        '<article class="chatv3-message' +
          (mine ? ' is-mine' : '') + '">' +
          '<div class="chatv3-message-by">' +
            (mine ? 'You' : esc(message.sender_type || otherRoleLabel())) +
          '</div>' +
          '<div class="chatv3-message-body">' +
            esc(message.body || '') +
          '</div>' +
          (message.message_kind === 'share'
            ? sharedCardMarkup(message)
            : '') +
          '<div class="chatv3-message-time">' +
            esc(timeLabel(message.created_at)) +
          '</div>' +
        '</article>';
    }).join('');

    el('messages').scrollTop = el('messages').scrollHeight;
  }

  async function sendMessageV3() {
    var thread = activeThread();
    var textarea = el('messageBody');
    var button = el('sendBtn');
    var body = textarea.value.trim();

    if (!thread) {
      if (isMobile()) showList();
      return;
    }

    if (!body || button.disabled) return;

    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      var response = await api(
        'POST',
        '/api/chat/threads/' +
        encodeURIComponent(thread.id) +
        '/messages',
        {body:body}
      );

      textarea.value = '';
      textarea.style.height = 'auto';

      if (response.message) {
        state.messages.push(response.message);
        renderMessagesV3(state.messages);
      } else {
        await selectThreadV3(thread.id,false);
      }

      thread.lastMessagePreview = body;
      thread.lastMessageAt = new Date().toISOString();
      renderThreadsV3();

      loadThreadsV3(false);
    } catch (error) {
      window.alert(error.message || 'The message could not be sent.');
    } finally {
      button.disabled = false;
      button.textContent = 'Send';
      textarea.focus();
    }
  }

  function optionLabel(type,item) {
    if (type === 'player') {
      var player = item.players || {};
      return [
        [player.first_name,player.last_name].filter(Boolean).join(' '),
        player.specific_position || player.primary_position || '',
        String(item.stage || 'watching').replace(/_/g,' ')
      ].filter(Boolean).join(' · ');
    }

    if (type === 'fixture') {
      return [
        item.fixture_date || 'TBC',
        item.home_or_away === 'Away'
          ? '@ ' + (item.opponent || 'Fixture')
          : 'vs ' + (item.opponent || 'Fixture')
      ].join(' · ');
    }

    var predictionPlayer = item.players || {};
    return [
      item.prediction_type || 'Prediction',
      [predictionPlayer.first_name,predictionPlayer.last_name]
        .filter(Boolean).join(' ')
    ].filter(Boolean).join(' · ');
  }

  function optionId(type,item) {
    return type === 'player' ? item.player_id : item.id;
  }

  function renderShareTargetV3() {
    var typeSelect = el('shareType');
    var target = el('shareTarget');
    if (!typeSelect || !target) return;

    var type = typeSelect.value;
    var list = state.shareOptions[type] || [];

    if (!list.length) {
      target.innerHTML =
        '<option value="">No ' + esc(type) + ' items available</option>';
      return;
    }

    target.innerHTML =
      '<option value="">Select ' + esc(type) + '</option>' +
      list.map(function (item) {
        return '<option value="' +
          esc(optionId(type,item)) + '">' +
          esc(optionLabel(type,item)) +
        '</option>';
      }).join('');
  }

  async function loadShareOptionsV3() {
    if (authType() !== 'Scout') {
      renderShareState();
      return;
    }

    var responses = await Promise.all([
      api('GET','/api/scouts/pipeline?limit=100')
        .catch(function () { return {data:[]}; }),
      api('GET','/api/scouts/fixtures')
        .catch(function () { return {data:[]}; }),
      api('GET','/api/predictions')
        .catch(function () { return {data:[]}; })
    ]);

    state.shareOptions.player = responses[0].data || [];
    state.shareOptions.fixture = responses[1].data || [];
    state.shareOptions.prediction = responses[2].data || [];
    window._shareOptions = state.shareOptions;
    renderShareState();
  }

  async function shareSelectedV3() {
    var thread = activeThread();
    if (!thread) return;

    var type = el('shareType').value;
    var referenceId = el('shareTarget').value;
    var message = el('shareMsg');
    var button = el('shareBtn');

    message.className = 'chatv3-share-message';

    if (!referenceId) {
      message.textContent = 'Choose an item to share.';
      message.classList.add('is-error');
      return;
    }

    button.disabled = true;
    message.textContent = 'Sharing…';

    try {
      await api(
        'POST',
        '/api/chat/threads/' +
        encodeURIComponent(thread.id) +
        '/share',
        {
          type:type,
          referenceId:referenceId
        }
      );

      message.textContent = 'Shared in this conversation.';
      message.classList.add('is-success');
      el('shareTarget').value = '';

      await selectThreadV3(thread.id,false);
      loadThreadsV3(false);
    } catch (error) {
      message.textContent =
        error.message || 'The item could not be shared.';
      message.classList.add('is-error');
    } finally {
      button.disabled = false;
    }
  }

  function showList() {
    var shell = el('chatv3Shell');
    if (!shell) return;
    shell.classList.add('is-list');
    shell.classList.remove('is-detail');
  }

  function showDetail() {
    var shell = el('chatv3Shell');
    if (!shell) return;
    shell.classList.add('is-detail');
    shell.classList.remove('is-list');
  }

  function handleResize() {
    var shell = el('chatv3Shell');
    if (!shell) return;

    if (!isMobile()) {
      shell.classList.add('is-detail');
      shell.classList.remove('is-list');
    } else if (!state.activeId) {
      showList();
    }
  }

  window.renderThreads = renderThreadsV3;
  window.loadThreads = loadThreadsV3;
  window.selectThread = selectThreadV3;
  window.renderMessages = renderMessagesV3;
  window.sendMessage = sendMessageV3;
  window.renderShareTarget = renderShareTargetV3;
  window.loadShareOptions = loadShareOptionsV3;
  window.shareSelected = shareSelectedV3;
  window.updateShareState = renderShareState;
  window.setMobileChatMode = function (mode) {
    if (mode === 'conversation' || mode === 'detail') showDetail();
    else showList();
  };

  document.addEventListener('DOMContentLoaded',function () {
    buildPage();
    loadThreadsV3(true);
    loadShareOptionsV3();
    handleResize();
  });

  window.addEventListener('resize',handleResize);
})();

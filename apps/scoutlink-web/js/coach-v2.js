'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — V14 shared shell
 * Presentation/navigation only. Existing route scripts retain ownership of
 * API writes, validation, scoring, uploads, Match Facts, chat and settings.
 *
 * Coach usage/allowance limits are intentionally NOT part of this shell.
 */
(function () {
  if (window.__coachProductShellV14) return;
  window.__coachProductShellV14 = true;

  var ROUTES = {
    'Dashboard':'/coach/dashboard',
    'My Players':'/coach/my-players',
    'Add Player':'/coach/add-player',
    'Bulk Import':'/coach/bulk-add-players',
    'Fixtures':'/coach/fixtures',
    'Match Facts':'/coach/match-facts',
    'Video Reels':'/coach/video-reels',
    'Chat':'/coach/chat',
    'Notifications':'/coach/notifications',
    'Report a Concern':'/coach/report-a-concern',
    'Settings':'/coach/settings'
  };

  var NAV = [
    ['Overview',[['Dashboard']]],
    ['Squad',[['My Players'],['Add Player'],['Bulk Import']]],
    ['Matchday',[['Fixtures'],['Match Facts'],['Video Reels']]],
    ['Inbox',[['Chat'],['Notifications']]],
    ['Trust & Admin',[['Settings'],['Report a Concern']]]
  ];

  var FIELD_ICONS = {
    Today:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h5M8 17h3"/></svg>',
    Squad:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.7-3.5 2.7-5.3 5.5-5.3s4.8 1.8 5.5 5.3M14 15c2.9-.7 5.1.7 6.1 4"/></svg>',
    Match:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12.5" r="7.5"/><path d="M12 5v15M4.5 12.5h15"/><circle cx="12" cy="12.5" r="2.2"/></svg>',
    Inbox:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 3z"/><path d="M8 9h8M8 13h5"/></svg>',
    More:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>'
  };

  var unreadCount = 0;
  var searchCache = null;
  var searchLoading = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function clean(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function api(method, path, body) {
    if (typeof window.api === 'function') return window.api(method, path, body);
    return Promise.reject(new Error('ScoutLink API client is unavailable.'));
  }

  function isPublicDemo() {
    try {
      return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) ||
        sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) { return false; }
  }

  function currentUser() {
    return window.Auth && window.Auth.user ? window.Auth.user : {};
  }

  function fullName() {
    var u = currentUser();
    return [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ').trim() ||
      localStorage.getItem('sl_user_name') || 'Coach';
  }

  function firstName() {
    return fullName().split(/\s+/)[0] || 'Coach';
  }

  function initials(value) {
    var parts = String(value || fullName()).trim().split(/\s+/).filter(Boolean);
    var a = (parts[0] || 'C').charAt(0);
    var b = (parts[1] || parts[0] || 'O').charAt(0);
    return (a + b).toUpperCase();
  }

  function teamName() {
    var u = currentUser();
    return localStorage.getItem('sl_team_name') ||
      u.team_name || u.teamName || u.club_name || u.clubName || 'Your team';
  }

  function ageGroup() {
    var u = currentUser();
    return localStorage.getItem('sl_team_age_group') || u.age_group || u.ageGroup || '';
  }

  function allowedCoach() {
    if (isPublicDemo()) return true;
    var type = window.Auth && window.Auth.type;
    return type === 'Coach' || type === 'Stratex';
  }

  function listFrom(response, keys) {
    if (Array.isArray(response)) return response;
    for (var i = 0; i < keys.length; i++) {
      if (response && Array.isArray(response[keys[i]])) return response[keys[i]];
    }
    return [];
  }

  function navHtml(active) {
    var html = '';
    NAV.forEach(function (group) {
      html += '<div class="g nav-grp">' + esc(group[0]) + '</div>';
      group[1].forEach(function (item) {
        var label = item[0];
        var badge = label === 'Notifications' && unreadCount ?
          '<span class="bdg ct">' + unreadCount + '</span>' : '';
        html += '<a class="n nav-i' + (label === active ? ' on' : '') + '" href="' +
          esc(clean(ROUTES[label])) + '"><b>' + esc(label) + '</b>' + badge + '</a>';
      });
    });
    return html;
  }

  function topAction(shell, key, primary) {
    var label = shell.getAttribute(key);
    if (!label) return '';
    var prefix = primary ? 'data-tbx-spend' : 'data-tbx';
    var href = shell.getAttribute(prefix + '-href');
    var id = shell.getAttribute(prefix + '-id');
    var cls = 'btn sm' + (primary ? ' p spend' : '');
    if (href) {
      return '<a class="' + cls + '"' + (id ? ' id="' + esc(id) + '"' : '') +
        ' href="' + esc(clean(href)) + '">' + esc(label) + '</a>';
    }
    return '<button class="' + cls + '" type="button"' + (id ? ' id="' + esc(id) + '"' : '') +
      '>' + esc(label) + '</button>';
  }

  function deskSubtitle() {
    return [teamName(), ageGroup()].filter(Boolean).join(' · ');
  }

  function hydrateDeskShell(shell) {
    if (!shell || shell.dataset.coachShellMounted === '14') return;

    var active = shell.getAttribute('data-active') || '';
    var title = shell.getAttribute('data-title') || active || 'Coach';
    var crumb = shell.getAttribute('data-crumb') || '';
    var chip = shell.getAttribute('data-chip') || '';
    var cv = shell.querySelector('.cv');
    if (!cv) return;

    shell.dataset.coachShellMounted = '14';

    var sidebar = document.createElement('aside');
    sidebar.className = 'sb nav';
    sidebar.id = 'coachDeskSidebar';
    sidebar.innerHTML =
      '<div class="nav-logo" aria-label="ScoutLink"><i aria-hidden="true"></i></div>' +
      '<nav aria-label="Coach Desk">' + navHtml(active) + '</nav>' +
      '<div class="nav-you me">' +
        '<span class="av">' + esc(initials()) + '</span>' +
        '<div><u>' + esc(fullName()) + '</u><s>Coach · ' + esc(teamName()) + '</s>' +
        '<button type="button" data-coach-signout style="display:block;margin-top:5px;border:0;background:transparent;padding:0;color:var(--ink3);font-size:10.5px;text-decoration:underline">Sign out</button></div>' +
      '</div>';

    var main = document.createElement('div');
    main.className = 'coach-main main';

    var top = document.createElement('header');
    top.className = 'tb top';
    top.id = 'coachDeskTopbar';

    var subtitle = crumb || deskSubtitle();
    top.innerHTML =
      '<div><h1 class="t">' + esc(title) + '</h1>' +
        (subtitle ? '<div class="sub crumb">' + esc(subtitle) + '</div>' : '') +
      '</div>' +
      (chip ? '<span class="tag b" id="coachTopChip">' + esc(chip) + '</span>' : '') +
      '<span class="sp"></span>' +
      (isPublicDemo() ? '<button class="btn sm" type="button" data-coach-switch>Switch demo</button>' : '') +
      topAction(shell, 'data-tbx', false) +
      topAction(shell, 'data-tbx-spend', true) +
      '<div class="coach-search-wrap">' +
        '<label class="srch" aria-label="Search ScoutLink"><span aria-hidden="true">⌕</span>' +
          '<input id="coachGlobalSearch" type="search" autocomplete="off" placeholder="Search players, scouts, fixtures">' +
        '</label>' +
        '<div class="coach-search-results" id="coachSearchResults" role="listbox"></div>' +
      '</div>' +
      '<button class="bell" type="button" data-coach-notifications aria-label="Notifications">◉' +
        (unreadCount ? '<u>' + unreadCount + '</u>' : '') + '</button>' +
      '<span class="av" aria-label="' + esc(fullName()) + '">' + esc(initials()) + '</span>';

    cv.parentNode.insertBefore(sidebar, cv);
    cv.parentNode.insertBefore(main, cv);
    main.appendChild(top);
    main.appendChild(cv);

    bindSearch(top.querySelector('.coach-search-wrap'));
  }

  function activeFieldTab() {
    var p = String(location.pathname || '').replace(/\/+$/, '');
    if (/\/coach\/dashboard$/.test(p)) return 'Today';
    if (/\/coach\/my-players$/.test(p) || /\/player\/profile$/.test(p)) return 'Squad';
    if (/\/coach\/match-facts$/.test(p)) return 'Match';
    if (/\/coach\/(chat|notifications)$/.test(p)) return 'Inbox';
    return 'More';
  }

  function fieldTab(label, href, active, badge) {
    return '<a class="' + (active ? 'on' : '') + '" href="' + esc(clean(href)) + '">' +
      '<span class="b">' + FIELD_ICONS[label] + (badge ? '<u>' + badge + '</u>' : '') + '</span>' +
      esc(label) + '</a>';
  }

  function hydrateField() {
    document.querySelectorAll('.coach-field .scr').forEach(function (scr) {
      var tabs = scr.querySelector('.tabs');
      if (!tabs) {
        tabs = document.createElement('nav');
        tabs.className = 'tabs';
        scr.appendChild(tabs);
      }
      tabs.setAttribute('aria-label', 'Coach Field');
      var active = activeFieldTab();
      tabs.innerHTML =
        fieldTab('Today', '/coach/dashboard', active === 'Today', 0) +
        fieldTab('Squad', '/coach/my-players', active === 'Squad', 0) +
        fieldTab('Match', '/coach/match-facts', active === 'Match', 0) +
        fieldTab('Inbox', '/coach/chat', active === 'Inbox', unreadCount) +
        '<a class="' + (active === 'More' ? 'on' : '') + '" href="#" data-coach-more>' +
          '<span class="b">' + FIELD_ICONS.More + '</span>More</a>';
      scr.dataset.fieldMounted = '14';
    });
  }

  function closeOverlay() {
    document.querySelectorAll('[data-coach-overlay]').forEach(function (node) { node.remove(); });
  }

  function openMore() {
    closeOverlay();

    var backdrop = document.createElement('div');
    backdrop.className = 'coach-drawer-backdrop';
    backdrop.dataset.coachOverlay = '1';

    var sheet = document.createElement('section');
    sheet.className = 'sheet psheet';
    sheet.dataset.coachOverlay = '1';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'More');

    sheet.innerHTML =
      '<div class="grab gr"></div>' +
      '<div class="sh"><b>More</b><button class="btn q x" type="button" data-close-coach-overlay>Close</button></div>' +
      '<div class="stack" style="padding-top:8px">' +
        '<a class="rowline row" href="/coach/video-reels"><span class="icn b">▶</span><span class="who sp"><b>Video Reels</b><span>Review clips and upload links</span></span><span>›</span></a>' +
        '<a class="rowline row" href="/coach/fixtures"><span class="icn">FX</span><span class="who sp"><b>Fixtures</b><span>Agenda and Match Facts status</span></span><span>›</span></a>' +
        '<a class="rowline row" href="/coach/add-player"><span class="icn b">+</span><span class="who sp"><b>Add Player</b><span>Four-stage player wizard</span></span><span>›</span></a>' +
        '<a class="rowline row" href="/coach/settings"><span class="icn">⚙</span><span class="who sp"><b>Settings</b><span>Team, coaches, notifications and account</span></span><span>›</span></a>' +
        '<a class="rowline row" href="/coach/report-a-concern"><span class="icn r">!</span><span class="who sp"><b style="color:var(--red)">Report a Concern</b><span>Reviewed by the Stratex trust team</span></span><span>›</span></a>' +
        '<div class="callout"><b>Coach Desk:</b> Bulk Import, full squad table, CSV fixture tools, coach invites, password and account controls.</div>' +
        '<button class="bt blk" type="button" data-coach-signout>Sign out</button>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
  }

  function openOverlay(kind, options) {
    closeOverlay();
    options = options || {};

    var backdrop = document.createElement('div');
    backdrop.className = 'coach-drawer-backdrop';
    backdrop.dataset.coachOverlay = '1';

    var box = document.createElement('section');
    box.dataset.coachOverlay = '1';
    box.className = window.innerWidth <= 760 ? 'sheet psheet' : (kind === 'modal' ? 'modal' : 'drawer drw');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', options.title || 'Details');

    box.innerHTML =
      (window.innerWidth <= 760 ? '<div class="grab gr"></div>' : '') +
      '<div class="oh drw-h"><b>' + esc(options.title || 'Details') + '</b>' +
        '<button class="btn q x" type="button" data-close-coach-overlay>Close</button></div>' +
      '<div class="ob">' + (options.html || '') + '</div>' +
      (options.footer ? '<div class="of foot">' + options.footer + '</div>' : '');

    document.body.appendChild(backdrop);
    document.body.appendChild(box);
    return box;
  }

  function showToast(message, error) {
    var node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 3400);
  }

  function signOut() {
    if (isPublicDemo() && typeof window.exitPublicDemo === 'function') {
      window.exitPublicDemo();
      return;
    }
    if (window.Auth && typeof window.Auth.clear === 'function') window.Auth.clear();
    location.href = clean('/login?logout=1');
  }

  function switchDemo() {
    if (typeof window.openExperienceSelector === 'function') {
      window.openExperienceSelector();
      return;
    }
    location.href = clean('/experience-select');
  }

  function searchItems() {
    if (searchCache) return Promise.resolve(searchCache);
    if (searchLoading) return searchLoading;

    searchLoading = Promise.allSettled([
      api('GET', '/api/coaches/my-players'),
      api('GET', '/api/fixtures'),
      api('GET', '/api/videos?type=player')
    ]).then(function (results) {
      var players = results[0].status === 'fulfilled' ? listFrom(results[0].value, ['players','data']) : [];
      var fixtures = results[1].status === 'fulfilled' ? listFrom(results[1].value, ['fixtures','data']) : [];
      var videos = results[2].status === 'fulfilled' ? listFrom(results[2].value, ['videos','data']) : [];

      searchCache = players.map(function (p) {
        var n = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || 'Player';
        return {
          title:n,
          meta:[p.age_group, p.specific_position || p.primary_position].filter(Boolean).join(' · '),
          href:'/player/profile?id=' + encodeURIComponent(p.id || p.player_id || '')
        };
      }).concat(fixtures.map(function (f) {
        return {
          title:f.opponent || f.opponent_name || 'Fixture',
          meta:[f.fixture_date || f.date, f.venue_name || f.venue].filter(Boolean).join(' · '),
          href:'/coach/fixtures'
        };
      })).concat(videos.map(function (v) {
        return {
          title:v.title || v.player_name || 'Video',
          meta:'Video Reel',
          href:'/coach/video-reels'
        };
      }));

      return searchCache;
    }).finally(function () {
      searchLoading = null;
    });

    return searchLoading;
  }

  function renderSearch(wrap, query) {
    var panel = wrap && wrap.querySelector('.coach-search-results');
    if (!panel) return;
    var q = String(query || '').trim().toLowerCase();

    if (q.length < 2) {
      wrap.classList.remove('open');
      panel.innerHTML = '';
      return;
    }

    panel.innerHTML = '<div class="coach-search-row"><small>Searching…</small></div>';
    wrap.classList.add('open');

    searchItems().then(function (items) {
      var matches = items.filter(function (item) {
        return (item.title + ' ' + item.meta).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);

      panel.innerHTML = matches.length ? matches.map(function (item) {
        return '<a class="coach-search-row" href="' + esc(clean(item.href)) + '">' +
          '<b>' + esc(item.title) + '</b><small>' + esc(item.meta || '') + '</small></a>';
      }).join('') : '<div class="coach-search-row"><small>No matching players, fixtures or videos.</small></div>';
    }).catch(function () {
      panel.innerHTML = '<div class="coach-search-row"><small>Search is unavailable right now.</small></div>';
    });
  }

  function bindSearch(wrap) {
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    var input = wrap.querySelector('input[type="search"]');
    if (!input) return;

    input.addEventListener('input', function () { renderSearch(wrap, input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        wrap.classList.remove('open');
        input.blur();
      }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
      }
    });
  }

  function readUnread() {
    return api('GET', '/api/notifications?limit=1').then(function (response) {
      var notifications = listFrom(response, ['notifications','data']);
      var explicit = Number(response && (response.unreadCount != null ? response.unreadCount : response.unread_count));
      unreadCount = Number.isFinite(explicit) ? Math.max(0, explicit) :
        notifications.filter(function (n) { return !(n.isRead || n.is_read); }).length;
      return unreadCount;
    }).catch(function () {
      unreadCount = 0;
      return 0;
    });
  }

  function refreshBadges() {
    return readUnread().then(function () {
      document.querySelectorAll('.coach-desk .shell[data-coach-shell]').forEach(function (shell) {
        var active = shell.getAttribute('data-active') || '';
        var nav = document.querySelector('#coachDeskSidebar nav');
        if (nav) nav.innerHTML = navHtml(active);

        var bell = document.querySelector('#coachDeskTopbar .bell');
        if (bell) bell.innerHTML = '◉' + (unreadCount ? '<u>' + unreadCount + '</u>' : '');
      });
      hydrateField();
      return unreadCount;
    });
  }

  function removeCoachUsageSurfaces() {
    document.querySelectorAll('a[href*="/coach/usage-requests"],[data-coach-usage]').forEach(function (node) {
      node.remove();
    });
  }

  function loadV14Adapter() {
    if (document.getElementById('coachDesignV14Script')) return;
    var script = document.createElement('script');
    script.id = 'coachDesignV14Script';
    script.src = '/js/coach-design-v14.js?v=14.0.0';
    script.defer = true;
    document.head.appendChild(script);
  }

  function bindGlobalEvents() {
    document.addEventListener('click', function (e) {
      var target = e.target;

      if (target.closest('[data-coach-signout]')) {
        e.preventDefault();
        signOut();
        return;
      }
      if (target.closest('[data-coach-switch]')) {
        e.preventDefault();
        switchDemo();
        return;
      }
      if (target.closest('[data-coach-notifications]')) {
        e.preventDefault();
        location.href = clean('/coach/notifications');
        return;
      }
      if (target.closest('[data-coach-more]')) {
        e.preventDefault();
        openMore();
        return;
      }
      if (target.closest('[data-close-coach-overlay]') || (target.classList && target.classList.contains('coach-drawer-backdrop'))) {
        e.preventDefault();
        closeOverlay();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlay();
    });
  }

  function init() {
    if (!allowedCoach()) return;

    document.documentElement.classList.add('coach-v14');
    removeCoachUsageSurfaces();

    document.querySelectorAll('.coach-desk .shell[data-coach-shell]').forEach(hydrateDeskShell);
    hydrateField();
    bindGlobalEvents();
    loadV14Adapter();

    readUnread().then(function () {
      var shell = document.querySelector('.coach-desk .shell[data-coach-shell]');
      if (shell) {
        var nav = document.querySelector('#coachDeskSidebar nav');
        if (nav) nav.innerHTML = navHtml(shell.getAttribute('data-active') || '');
        var bell = document.querySelector('#coachDeskTopbar .bell');
        if (bell) bell.innerHTML = '◉' + (unreadCount ? '<u>' + unreadCount + '</u>' : '');
      }
      hydrateField();
    });

    var observer = new MutationObserver(function () {
      removeCoachUsageSurfaces();
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  window.CoachV2 = {
    esc:esc,
    clean:clean,
    api:api,
    openOverlay:openOverlay,
    closeOverlay:closeOverlay,
    showToast:showToast,
    teamName:teamName,
    ageGroup:ageGroup,
    fullName:fullName,
    firstName:firstName,
    initials:initials,
    refreshBadges:refreshBadges,
    isPublicDemo:isPublicDemo
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();

/* ScoutLink Coach Desk + Coach Field production runtime.
   Presentation/navigation layer only: route-specific scripts keep ownership of
   live data, API writes, validation and submission flows. */
'use strict';

(function () {
  var STYLE_ID = 'coachExperienceV10Style';
  var STYLE_URL = '/css/coach-experience-v9.css?v=10.0.0-desk-field';
  var OVERLAY_ID = 'coachOverlaysV2Script';
  var OVERLAY_URL = '/js/coach-overlays-v1.js?v=2.0.0-desk-field';
  var MOBILE_MAX = 760;
  var refreshQueued = false;
  var observer = null;
  var searchCache = null;
  var searchPromise = null;
  var lastMode = null;

  var ROUTES = {
    dashboard: '/coach/dashboard',
    onboarding: '/coach/onboarding',
    'my-players': '/coach/my-players',
    'add-player': '/coach/add-player',
    'bulk-add-players': '/coach/bulk-add-players',
    'match-facts': '/coach/match-facts',
    fixtures: '/coach/fixtures',
    'video-reels': '/coach/video-reels',
    chat: '/coach/chat',
    notifications: '/coach/notifications',
    'report-a-concern': '/coach/report-a-concern',
    settings: '/coach/settings',
    profile: '/player/profile'
  };

  var TITLES = {
    dashboard: 'Today',
    onboarding: 'Coach setup',
    'my-players': 'Squad',
    'add-player': 'Add player',
    'bulk-add-players': 'Bulk import',
    'match-facts': 'Match',
    fixtures: 'Fixtures',
    'video-reels': 'Video reels',
    chat: 'Inbox',
    notifications: 'Inbox',
    'report-a-concern': 'Report a concern',
    settings: 'More',
    profile: 'Player card'
  };

  var DESKTOP_NAV = [
    ['Overview', [['dashboard', 'Dashboard', 'DB']]],
    ['Squad', [
      ['my-players', 'My Players', 'PL'],
      ['add-player', 'Add Player', 'AP'],
      ['bulk-add-players', 'Bulk Import', 'BI']
    ]],
    ['Matchday', [
      ['fixtures', 'Fixtures', 'FX'],
      ['match-facts', 'Match Facts', 'MF'],
      ['video-reels', 'Video Reels', 'VR']
    ]],
    ['Inbox', [
      ['chat', 'Chat', 'CH'],
      ['notifications', 'Notifications', 'NT']
    ]],
    ['Trust & admin', [
      ['report-a-concern', 'Report a Concern', 'RC'],
      ['settings', 'Settings', 'ST']
    ]]
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function cleanPath() {
    return (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function fileName() {
    return cleanPath().split('/').pop() || '';
  }

  function query() {
    try { return new URLSearchParams(window.location.search || ''); }
    catch (_) { return { get: function () { return null; } }; }
  }

  function isCoachUser() {
    try {
      return (window.Auth && window.Auth.type === 'Coach') ||
        localStorage.getItem('sl_type') === 'Coach' ||
        String(sessionStorage.getItem('sl_public_demo_role') || '').toLowerCase() === 'coach' ||
        String(sessionStorage.getItem('demoRole') || '').toLowerCase() === 'coach';
    } catch (_) { return false; }
  }

  function pageKey() {
    var path = cleanPath().toLowerCase();
    var file = fileName().toLowerCase();
    if (path.indexOf('/coach/onboarding') === 0 || file === 'coach-onboarding.html') return 'onboarding';
    if (path.indexOf('/coach/dashboard') === 0 || file === 'coach-dashboard.html') return 'dashboard';
    if (path.indexOf('/coach/my-players') === 0 || file === 'coach-my-players.html') return 'my-players';
    if (path.indexOf('/coach/add-player') === 0 || file === 'add-player.html') return 'add-player';
    if (path.indexOf('/coach/bulk-add-players') === 0 || file === 'bulk-add-players.html') return 'bulk-add-players';
    if (path.indexOf('/coach/match-facts') === 0 || file === 'match-facts.html') return 'match-facts';
    if (path.indexOf('/coach/fixtures') === 0 || file === 'coach-fixtures.html') return 'fixtures';
    if (path.indexOf('/coach/video-reels') === 0 || file === 'coach-video-reels.html') return 'video-reels';
    if (path.indexOf('/coach/chat') === 0 || file === 'coach-chat.html') return 'chat';
    if (path.indexOf('/coach/notifications') === 0 || file === 'coach-notifications.html') return 'notifications';
    if (path.indexOf('/coach/report-a-concern') === 0 || file === 'coach-report-concern.html' || file === 'report-concern.html') return 'report-a-concern';
    if (path.indexOf('/coach/settings') === 0 || file === 'coach-settings.html') return 'settings';
    if ((path.indexOf('/player/profile') === 0 || file === 'player-profile.html') && isCoachUser()) return 'profile';
    return '';
  }

  function isCoachPage() { return !!pageKey(); }
  function routeFor(key) { return ROUTES[key] || '#'; }
  function isMobile() { return window.innerWidth <= MOBILE_MAX; }

  function currentUser() {
    try {
      return (window.Auth && window.Auth.user) || JSON.parse(localStorage.getItem('sl_user') || '{}') || {};
    } catch (_) { return {}; }
  }

  function fullName() {
    var user = currentUser();
    return [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || 'Coach';
  }

  function firstName() {
    var name = fullName().split(/\s+/).filter(Boolean);
    return name[0] || 'Coach';
  }

  function initials(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'C').charAt(0) + (parts[1] || parts[0] || 'O').charAt(0)).toUpperCase();
  }

  function teamName() {
    var user = currentUser();
    try {
      return localStorage.getItem('sl_team_name') || user.teamName || user.team_name ||
        sessionStorage.getItem('demoTeamName') || localStorage.getItem('demoTeamName') || 'Your team';
    } catch (_) { return user.teamName || user.team_name || 'Your team'; }
  }

  function ageGroup() {
    var user = currentUser();
    try {
      return localStorage.getItem('sl_age_group') || user.ageGroup || user.age_group || '';
    } catch (_) { return user.ageGroup || user.age_group || ''; }
  }

  function loadStylesheet() {
    var existing = document.getElementById(STYLE_ID) ||
      document.querySelector('link[href*="/css/coach-experience-v9.css"]');
    if (existing) {
      existing.id = STYLE_ID;
      if (existing.getAttribute('href') !== STYLE_URL) existing.setAttribute('href', STYLE_URL);
      return;
    }
    var old = document.getElementById('coachExperienceV9Style');
    if (old) old.remove();
    var link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = STYLE_URL;
    document.head.appendChild(link);
  }

  function loadOverlays() {
    if (window.CoachOverlays) return;
    if (document.getElementById(OVERLAY_ID)) return;
    var script = document.createElement('script');
    script.id = OVERLAY_ID;
    script.src = OVERLAY_URL;
    script.async = true;
    document.head.appendChild(script);
  }

  function setMode() {
    if (!document.body) return;
    var mobile = isMobile();
    document.body.classList.toggle('mobile-site', mobile);
    document.body.classList.toggle('desktop-site', !mobile);
    document.body.classList.add('coach-v10');
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    if (lastMode !== mobile) {
      lastMode = mobile;
      document.body.classList.remove('coach-field-more-open');
    }
  }

  function shellClasses() {
    var dashboard = document.querySelector('.dashboard');
    if (dashboard) dashboard.classList.add('coach-shell', 'coach-page');
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.add('coach-sidebar');
    var workspace = document.querySelector('.dashboard-main');
    if (workspace) workspace.classList.add('coach-workspace');
    var topbar = document.querySelector('.topbar');
    if (topbar) topbar.classList.add('coach-topbar');
    var content = document.querySelector('.page-content');
    if (content) content.classList.add('coach-content');
  }

  function activeDesktopNav() {
    return pageKey() === 'profile' ? 'my-players' : pageKey();
  }

  function desktopNavMarkup() {
    var active = activeDesktopNav();
    return DESKTOP_NAV.map(function (group) {
      return '<section class="coach-nav-group" data-coach-desk-nav>' +
        '<small class="coach-nav-label">' + esc(group[0]) + '</small>' +
        group[1].map(function (item) {
          return '<a class="nav-link nav-item side-link' + (active === item[0] ? ' active' : '') +
            '" href="' + esc(routeFor(item[0])) + '"' + (active === item[0] ? ' aria-current="page"' : '') + '>' +
            '<span class="nav-ico side-icon">' + esc(item[2]) + '</span><b>' + esc(item[1]) + '</b></a>';
        }).join('') + '</section>';
    }).join('');
  }

  function installDesktopSidebar() {
    var sidebar = document.querySelector('.sidebar, .coach-sidebar');
    if (!sidebar) return;
    sidebar.classList.add('coach-sidebar');

    var logo = sidebar.querySelector('.sidebar-logo');
    if (!logo) {
      logo = document.createElement('div');
      logo.className = 'sidebar-logo';
      sidebar.insertBefore(logo, sidebar.firstChild);
    }
    logo.innerHTML = '<a class="sl-logo" href="' + ROUTES.dashboard + '">Scout<span>Link</span></a>';

    var workspace = sidebar.querySelector('.coach-desk-workspace');
    if (!workspace) {
      workspace = document.createElement('div');
      workspace.className = 'coach-desk-workspace';
      logo.insertAdjacentElement('afterend', workspace);
    }
    workspace.innerHTML = '<b>' + esc(teamName()) + '</b><span>' + esc((ageGroup() ? ageGroup() + ' · ' : '') + 'Coach workspace') + '</span>';

    var nav = document.getElementById('sidebarNav') || sidebar.querySelector('.sidebar-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'sidebarNav';
      nav.className = 'sidebar-nav';
      sidebar.appendChild(nav);
    }
    var state = activeDesktopNav() + '|' + teamName();
    if (nav.dataset.coachDeskState !== state) {
      nav.dataset.coachDeskState = state;
      nav.innerHTML = desktopNavMarkup();
    }

    var user = document.getElementById('sidebarUser') || sidebar.querySelector('.sidebar-user');
    if (!user) {
      user = document.createElement('div');
      user.id = 'sidebarUser';
      user.className = 'sidebar-user';
      sidebar.appendChild(user);
    }
    user.innerHTML =
      '<div class="user-info"><span class="user-avatar avatar-square">' + esc(initials(fullName())) + '</span>' +
        '<div><b class="user-name">' + esc(fullName()) + '</b><small class="user-role">Coach · ' + esc(teamName()) + '</small></div></div>' +
      '<button class="coach-v9-signout" type="button" data-coach-signout>Sign out</button>';
  }

  function apiGet(path) {
    if (typeof window.api === 'function') return window.api('GET', path);
    var base = window.API || localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    var token = (window.Auth && window.Auth.token) || localStorage.getItem('sl_token');
    return fetch(String(base).replace(/\/+$/, '') + path, {
      credentials: 'include',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function listFrom(data, keys) {
    if (Array.isArray(data)) return data;
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function playerName(player) {
    return [player && (player.first_name || player.firstName), player && (player.last_name || player.lastName)].filter(Boolean).join(' ') || 'Player';
  }

  function loadSearchData() {
    if (searchCache) return Promise.resolve(searchCache);
    if (searchPromise) return searchPromise;
    searchPromise = Promise.allSettled([
      apiGet('/api/coaches/my-players'),
      apiGet('/api/fixtures'),
      apiGet('/api/videos')
    ]).then(function (results) {
      var players = results[0].status === 'fulfilled' ? listFrom(results[0].value, ['players','data','items']) : [];
      var fixtures = results[1].status === 'fulfilled' ? listFrom(results[1].value, ['fixtures','data','items']) : [];
      var videos = results[2].status === 'fulfilled' ? listFrom(results[2].value, ['videos','data','items']) : [];
      searchCache = [].concat(
        players.map(function (player) {
          return {
            kind: 'Player', code: initials(playerName(player)), title: playerName(player),
            meta: [player.age_group, player.specific_position || player.primary_position || player.position_group].filter(Boolean).join(' · '),
            href: player.id ? ROUTES.profile + '?id=' + encodeURIComponent(player.id) : ROUTES['my-players']
          };
        }),
        fixtures.map(function (fixture) {
          return {
            kind: 'Fixture', code: 'FX', title: fixture.opponent || fixture.opponent_name || 'Fixture',
            meta: [fixture.fixture_date || fixture.date, fixture.venue].filter(Boolean).join(' · '),
            href: ROUTES.fixtures + (fixture.id ? '?fixtureId=' + encodeURIComponent(fixture.id) : '')
          };
        }),
        videos.map(function (video) {
          return {
            kind: 'Video', code: 'VR', title: video.title || video.file_name || video.category || 'Video evidence',
            meta: [video.player_name || video.playerName, video.status || video.category].filter(Boolean).join(' · '),
            href: ROUTES['video-reels'] + (video.id ? '?videoId=' + encodeURIComponent(video.id) : '')
          };
        })
      );
      return searchCache;
    }).catch(function () { return []; }).finally(function () { searchPromise = null; });
    return searchPromise;
  }

  function bindGlobalSearch(wrap) {
    if (!wrap || wrap.dataset.coachSearchBound === '1') return;
    wrap.dataset.coachSearchBound = '1';
    var input = wrap.querySelector('input');
    var results = wrap.querySelector('.coach-v9-search-results');
    if (!input || !results) return;

    function render() {
      var term = String(input.value || '').trim().toLowerCase();
      if (!term) {
        wrap.classList.remove('is-open');
        results.innerHTML = '';
        return;
      }
      wrap.classList.add('is-open');
      results.innerHTML = '<div class="coach-v9-search-empty">Searching…</div>';
      loadSearchData().then(function (items) {
        var matches = items.filter(function (item) {
          return [item.title,item.meta,item.kind].join(' ').toLowerCase().indexOf(term) >= 0;
        }).slice(0,8);
        results.innerHTML = matches.length ? matches.map(function (item) {
          return '<a class="coach-v9-search-result" href="' + esc(item.href) + '"><span>' + esc(item.code) + '</span>' +
            '<div><b>' + esc(item.title) + '</b><small>' + esc(item.meta || item.kind) + '</small></div><em>' + esc(item.kind) + '</em></a>';
        }).join('') : '<div class="coach-v9-search-empty">No Coach results found.</div>';
      });
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { wrap.classList.remove('is-open'); input.blur(); }
      if (event.key === 'Enter') {
        var first = results.querySelector('a');
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    document.addEventListener('click', function (event) {
      if (!wrap.contains(event.target)) wrap.classList.remove('is-open');
    });
  }

  function installDesktopTopbar() {
    var topbar = document.querySelector('.topbar, .coach-topbar');
    if (!topbar) return;
    topbar.classList.add('coach-topbar');

    var title = topbar.querySelector('.topbar-title');
    if (!title) {
      title = document.createElement('span');
      title.className = 'topbar-title';
      topbar.insertBefore(title, topbar.firstChild);
    }
    title.textContent = pageKey() === 'dashboard' ? 'Dashboard' : (TITLES[pageKey()] || 'Coach');

    if (!title.closest('.coach-v8-topbar-copy')) {
      var copy = document.createElement('div');
      copy.className = 'coach-v8-topbar-copy';
      title.parentNode.insertBefore(copy, title);
      var label = document.createElement('span');
      label.className = 'route-label';
      label.textContent = 'Coach workspace';
      copy.appendChild(label);
      copy.appendChild(title);
    }

    var search = topbar.querySelector('.coach-v9-search-wrap');
    if (!search) {
      search = document.createElement('div');
      search.className = 'coach-v9-search-wrap';
      search.innerHTML = '<label class="sr-only" for="coachGlobalSearch">Search Coach workspace</label>' +
        '<input id="coachGlobalSearch" class="coach-v9-search" type="search" placeholder="Search players, fixtures, videos" autocomplete="off">' +
        '<span class="coach-v9-search-kbd">Ctrl K</span><div class="coach-v9-search-results" role="listbox"></div>';
      var copyHost = topbar.querySelector('.coach-v8-topbar-copy');
      copyHost.insertAdjacentElement('afterend', search);
    }
    bindGlobalSearch(search);

    var right = topbar.querySelector('.topbar-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'topbar-right';
      topbar.appendChild(right);
    }
    var notification = right.querySelector('.notif-btn, #notifToggleBtn');
    if (!notification) {
      notification = document.createElement('button');
      notification.type = 'button';
      notification.className = 'notif-btn';
      notification.setAttribute('aria-label','Open notifications');
      notification.innerHTML = 'NT<span class="notif-badge" id="notifBadge" style="display:none"></span>';
      right.insertBefore(notification,right.firstChild);
    }
    if (notification.dataset.coachRouteBound !== '1') {
      notification.dataset.coachRouteBound = '1';
      notification.addEventListener('click', function () { window.location.href = ROUTES.notifications; });
    }
    var team = right.querySelector('.team-pill');
    if (!team) { team = document.createElement('span'); team.className = 'team-pill'; right.appendChild(team); }
    team.textContent = teamName();

    var profile = right.querySelector('.profile-button');
    if (!profile) {
      profile = document.createElement('button');
      profile.type = 'button';
      profile.className = 'profile-button';
      right.appendChild(profile);
    }
    profile.innerHTML = '<span class="avatar-square small">' + esc(initials(fullName())) + '</span><b>' + esc(firstName()) + '</b>';
    if (profile.dataset.coachBound !== '1') {
      profile.dataset.coachBound = '1';
      profile.addEventListener('click', function () { window.location.href = ROUTES.settings; });
    }
  }

  function fieldActive(key) {
    var page = pageKey();
    if (key === 'today') return page === 'dashboard';
    if (key === 'squad') return page === 'my-players' || page === 'profile';
    if (key === 'match') return page === 'match-facts';
    if (key === 'inbox') return page === 'chat' || page === 'notifications';
    if (key === 'more') return ['add-player','bulk-add-players','fixtures','video-reels','report-a-concern','settings','onboarding'].indexOf(page) >= 0;
    return false;
  }

  function installFieldHeader() {
    var old = document.querySelector('.coach-field-header');
    if (!old) {
      old = document.createElement('header');
      old.className = 'coach-field-header';
      document.body.appendChild(old);
    }
    old.innerHTML = '<a class="coach-field-brand" href="' + ROUTES.dashboard + '">Scout<i>Link</i></a>' +
      '<div class="coach-field-title"><b>' + esc(TITLES[pageKey()] || 'Coach') + '</b><span>' +
        esc(teamName() + (ageGroup() ? ' · ' + ageGroup() : '')) + '</span></div>' +
      '<a class="coach-field-icon" href="' + ROUTES.notifications + '" aria-label="Notifications">NT</a>';
  }

  function installInboxSwitch() {
    var page = pageKey();
    var content = document.querySelector('.page-content');
    if (!content) return;
    var existing = content.querySelector('[data-coach-field-inbox-switch]');
    if (page !== 'chat' && page !== 'notifications') {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      existing = document.createElement('nav');
      existing.dataset.coachFieldInboxSwitch = '1';
      existing.className = 'coach-field-inbox-switch';
      var first = content.firstElementChild;
      content.insertBefore(existing, first || null);
    }
    existing.innerHTML = '<a class="' + (page === 'chat' ? 'active' : '') + '" href="' + ROUTES.chat + '">Chats</a>' +
      '<a class="' + (page === 'notifications' ? 'active' : '') + '" href="' + ROUTES.notifications + '">Notifications</a>';
  }

  function fieldTabsMarkup() {
    return [
      ['today','HM','Today',ROUTES.dashboard],
      ['squad','SQ','Squad',ROUTES['my-players']],
      ['match','MF','Match',ROUTES['match-facts'] + '?mode=live'],
      ['inbox','IN','Inbox',ROUTES.chat]
    ].map(function (item) {
      return '<a class="' + (fieldActive(item[0]) ? 'active' : '') + '" href="' + item[3] + '"' +
        (fieldActive(item[0]) ? ' aria-current="page"' : '') + '><span class="field-tab-icon">' + item[1] + '</span><b>' + item[2] + '</b></a>';
    }).join('') +
      '<button type="button" data-coach-field-more class="' + (fieldActive('more') ? 'active' : '') + '">' +
        '<span class="field-tab-icon">MR</span><b>More</b></button>';
  }

  function installFieldTabs() {
    var tabs = document.querySelector('.coach-field-tabs');
    if (!tabs) {
      tabs = document.createElement('nav');
      tabs.className = 'coach-field-tabs';
      tabs.setAttribute('aria-label','Coach Field navigation');
      document.body.appendChild(tabs);
    }
    tabs.innerHTML = fieldTabsMarkup();
  }

  function moreRow(label, copy, href, attrs) {
    if (href) {
      return '<a href="' + esc(href) + '" ' + (attrs || '') + '><span><b>' + esc(label) + '</b><small>' + esc(copy) + '</small></span><em>›</em></a>';
    }
    return '<button type="button" ' + (attrs || '') + '><span><b>' + esc(label) + '</b><small>' + esc(copy) + '</small></span><em>›</em></button>';
  }

  function installFieldMore() {
    var backdrop = document.querySelector('.coach-field-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'coach-field-backdrop';
      backdrop.setAttribute('aria-label','Close More');
      document.body.appendChild(backdrop);
    }
    var sheet = document.querySelector('.coach-field-more-sheet');
    if (!sheet) {
      sheet = document.createElement('section');
      sheet.className = 'coach-field-more-sheet';
      sheet.setAttribute('aria-label','More Coach Field actions');
      document.body.appendChild(sheet);
    }
    sheet.innerHTML = '<div class="coach-field-grab"></div><div class="coach-field-more-head"><b>More</b><button class="btn gh" type="button" data-coach-field-close>Close</button></div>' +
      '<div class="coach-field-more-group">' +
        moreRow('Video Reels','Review clips and generate upload links',ROUTES['video-reels']) +
        moreRow('Fixtures','Agenda, results and Match Facts status',ROUTES.fixtures) +
        moreRow('Add Player','Open the four-stage player wizard',ROUTES['add-player']) +
        moreRow('Bulk Import','Full review table is a Coach Desk task',null,'data-coach-desk-task="bulk"') +
      '</div>' +
      '<div class="coach-field-more-group">' +
        moreRow('Team & coaches','Manage team access and account settings',ROUTES.settings + '#teamCoaches') +
        moreRow('Notification preferences','Scout interest and Match Facts reminders',ROUTES.settings + '#notifications') +
        moreRow('Appearance','Light and dark preference',ROUTES.settings + '#appearance') +
      '</div>' +
      '<div class="coach-field-more-group">' +
        moreRow('Report a Concern','Reviewed by the Stratex trust team',ROUTES['report-a-concern']) +
        moreRow('Sign out','End this ScoutLink session',null,'data-coach-signout') +
      '</div>';
  }

  function closeFieldMore() {
    document.body.classList.remove('coach-field-more-open');
  }

  function showDeskTask(kind, trigger) {
    var config = {
      bulk: ['Bulk Import','Bulk squad review is designed for Coach Desk because it needs a wide review table. Your squad and existing data stay unchanged.','/coach/bulk-add-players'],
      'fixture-csv': ['Season CSV import','Season fixture CSV review is a Coach Desk task. You can still add or edit individual fixtures from Coach Field.','/coach/fixtures'],
      settings: ['Coach Desk settings','Deep account administration is easier on Coach Desk.','/coach/settings']
    }[kind] || ['Coach Desk','This job is designed for Coach Desk.','/coach/dashboard'];

    if (window.CoachOverlays && typeof window.CoachOverlays.openSheet === 'function') {
      var panel = window.CoachOverlays.openSheet({
        title: config[0], trigger: trigger,
        body: '<div class="coach-desk-only-note"><b>On Coach Desk</b><br>' + esc(config[1]) + '</div>' +
          '<p>You can open the same secure route here, or continue later from a larger screen. Nothing is lost.</p>',
        footer: '<button class="btn secondary" type="button" data-coach-overlay-close>Not now</button>' +
          '<a class="btn primary" href="' + config[2] + '">Open Desk route</a>'
      });
      var close = panel && panel.querySelector('[data-coach-overlay-close]');
      if (close) close.addEventListener('click', window.CoachOverlays.closeAll || window.CoachOverlays.closeDrawer);
      return;
    }
    window.location.href = config[2];
  }

  function signOut() {
    if (typeof window.logoutToLogin === 'function') { window.logoutToLogin(); return; }
    if (window.Auth && typeof window.Auth.clear === 'function') window.Auth.clear();
    else {
      ['sl_token','sl_user','sl_type','sl_session','sl_user_id','sl_user_email','sl_user_role','sl_user_data','sl_demo_mode','sl_admin_token','sl_admin_user','sl_admin_type','sl_experience_switcher'].forEach(function (key) {
        try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (_) {}
      });
    }
    window.location.href = '/login?logout=1';
  }

  function bindChrome() {
    if (!document.body || document.body.dataset.coachFieldChromeBound === '1') return;
    document.body.dataset.coachFieldChromeBound = '1';

    document.addEventListener('click', function (event) {
      var more = event.target.closest('[data-coach-field-more]');
      if (more) {
        event.preventDefault();
        document.body.classList.toggle('coach-field-more-open');
        return;
      }
      if (event.target.closest('[data-coach-field-close],.coach-field-backdrop')) {
        event.preventDefault(); closeFieldMore(); return;
      }
      var deskTask = event.target.closest('[data-coach-desk-task]');
      if (deskTask) {
        event.preventDefault(); closeFieldMore(); showDeskTask(deskTask.getAttribute('data-coach-desk-task'),deskTask); return;
      }
      if (event.target.closest('[data-coach-signout],#logoutBtn')) {
        event.preventDefault(); closeFieldMore(); signOut(); return;
      }
      if (event.target.closest('.coach-field-more-sheet a')) closeFieldMore();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeFieldMore();
      if ((event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k' && !isMobile()) {
        var input = document.querySelector('.coach-v9-search');
        if (input) { event.preventDefault(); input.focus(); input.select(); }
      }
    });
  }

  function installFieldShell() {
    installFieldHeader();
    installFieldTabs();
    installFieldMore();
    installInboxSwitch();
  }

  function bridgeHeroActions() {
    if (!isMobile()) return;
    if (pageKey() === 'dashboard') {
      document.querySelectorAll('a[href="/coach/match-facts"],a[href$="/coach/match-facts"]').forEach(function (link) {
        if (link.closest('.sidebar,.coach-field-more-sheet')) return;
        if (/record match facts|match facts/i.test(link.textContent || '')) {
          link.href = ROUTES['match-facts'] + '?mode=live';
          if (link.closest('.cv9-next-fixture,.cv9-dash-actions')) link.textContent = 'Open Matchday Log';
        }
      });
    }
  }

  function openRequestedLiveMode() {
    if (pageKey() !== 'match-facts') return;
    var requested = String(query().get('mode') || '').toLowerCase();
    if (requested !== 'live') return;
    if (document.body.dataset.coachLiveRequested === 'done') return;

    var attempts = Number(document.body.dataset.coachLiveAttempts || 0);
    var live = document.querySelector('.mode-card[data-mode="live"]');
    if (live) {
      document.body.dataset.coachLiveRequested = 'done';
      if (!live.classList.contains('sel') && live.getAttribute('aria-pressed') !== 'true') live.click();
      return;
    }
    if (attempts < 30) {
      document.body.dataset.coachLiveAttempts = String(attempts + 1);
      setTimeout(openRequestedLiveMode, 120);
    } else {
      document.body.dataset.coachLiveRequested = 'done';
      toast('The live Matchday Log could not open automatically. Match Facts is still available.');
    }
  }

  function markDeskOnlyControls() {
    if (!isMobile()) return;
    if (pageKey() === 'fixtures') {
      ['#cf3ImportFixtures','#cf3DownloadTemplate'].forEach(function (selector) {
        var node = document.querySelector(selector);
        if (node && !node.dataset.coachDeskTask) node.dataset.coachDeskTask = 'fixture-csv';
      });
    }
    if (pageKey() === 'bulk-add-players') {
      var content = document.querySelector('.page-content');
      if (content && !content.querySelector('.coach-desk-only-note')) {
        var note = document.createElement('div');
        note.className = 'coach-desk-only-note';
        note.innerHTML = '<b>Coach Desk task.</b> Bulk Import uses a wide review table. Your draft and imported rows stay in the same workspace.';
        content.insertBefore(note, content.firstElementChild || null);
      }
    }
  }

  function functionalFallbacks() {
    document.querySelectorAll('a[href="#"],a:not([href]),button[data-href]').forEach(function (node) {
      if (node.dataset.coachFunctionalFallback) return;
      var label = String(node.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
      var route = null;
      if (label.indexOf('add player') >= 0) route = ROUTES['add-player'];
      else if (label.indexOf('bulk') >= 0) route = ROUTES['bulk-add-players'];
      else if (label.indexOf('match fact') >= 0 || label === 'match') route = ROUTES['match-facts'];
      else if (label.indexOf('fixture') >= 0) route = ROUTES.fixtures;
      else if (label.indexOf('video') >= 0) route = ROUTES['video-reels'];
      else if (label.indexOf('chat') >= 0 || label.indexOf('reply') >= 0) route = ROUTES.chat;
      else if (label.indexOf('notification') >= 0) route = ROUTES.notifications;
      else if (label.indexOf('concern') >= 0) route = ROUTES['report-a-concern'];
      else if (label.indexOf('setting') >= 0) route = ROUTES.settings;
      else if (label.indexOf('squad') >= 0 || label === 'players') route = ROUTES['my-players'];
      if (!route) return;
      node.dataset.coachFunctionalFallback = '1';
      if (node.tagName === 'A') node.setAttribute('href', route);
      else node.addEventListener('click', function () { window.location.href = route; });
    });
  }

  function exportPlayersFromDom() {
    var rows = [];
    document.querySelectorAll('.coach-players-table tbody tr, .cv9-squad-panel table tbody tr').forEach(function (row) {
      var cells = Array.prototype.slice.call(row.querySelectorAll('td')).map(function (cell) {
        return String(cell.textContent || '').replace(/\s+/g,' ').trim();
      });
      if (cells.length) rows.push(cells);
    });
    if (!rows.length) {
      document.querySelectorAll('.coach-player-card').forEach(function (card) {
        var name = card.querySelector('h4,b');
        var copy = card.querySelector('p,.coach-player-copy p');
        if (name) rows.push([name.textContent.trim(), copy ? copy.textContent.trim() : '']);
      });
    }
    if (!rows.length) { toast('There are no visible players to export.'); return; }
    var max = Math.max.apply(null, rows.map(function (row) { return row.length; }));
    var header = Array.from({length:max},function(_,index){return index === 0 ? 'Player' : 'Field ' + (index + 1);});
    var csv = [header].concat(rows).map(function (row) {
      return row.map(function (cell) { return '"' + String(cell || '').replace(/"/g,'""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'scoutlink-squad-list.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},250);
  }

  function bindExportFallback() {
    if (pageKey() !== 'my-players') return;
    var button = document.getElementById('coachV8ExportPlayers');
    if (!button || button.dataset.coachExportBound === '1') return;
    button.dataset.coachExportBound = '1';
    button.addEventListener('click', function (event) {
      if (button.dataset.routeHandlerReady === '1') return;
      event.preventDefault(); exportPlayersFromDom();
    });
  }

  function stripSensitiveDisplay() {
    var banned = /\b(date of birth|\bdob\b|guardian email|guardian phone|parent email|parent phone)\b/i;
    document.querySelectorAll('th,td,label,dt').forEach(function (node) {
      var value = String(node.textContent || '').trim();
      if (!value || !banned.test(value)) return;
      var row = node.closest('tr,.form-group,.profile-row,.detail-row');
      if (row) row.classList.add('coach-v2-sensitive-hidden');
    });
  }

  function renderPlayerCard(player, options) {
    options = options || {};
    var name = playerName(player);
    var position = player && (player.specific_position || player.primary_position || player.position_group) || 'Position TBC';
    var rating = Number(player && player.overall_rating);
    rating = Number.isFinite(rating) && rating > 0 ? Math.round(rating > 10 ? rating : rating * 10) : '--';
    var url = options.url || ROUTES.profile + '?id=' + encodeURIComponent(player && player.id || '');
    return '<article class="coach-player-card" tabindex="0">' +
      '<div class="coach-player-top"><div class="coach-player-id"><div class="coach-player-copy"><h4>' + esc(name) + '</h4><p>' +
        esc(player && player.age_group || 'Age group TBC') + ' · ' + esc(position) + '</p></div></div>' +
        '<div class="coach-player-rating">' + esc(rating) + '</div></div>' +
      '<div class="coach-player-actions"><a class="btn primary" href="' + esc(url) + '">View profile</a></div></article>';
  }

  function toast(message, options) {
    if (window.CoachOverlays && typeof window.CoachOverlays.showCoachToast === 'function') {
      window.CoachOverlays.showCoachToast(message, options || {}); return;
    }
    var node = document.createElement('div');
    node.className = 'coach-overlay-toast'; node.setAttribute('role','status'); node.textContent = message;
    document.body.appendChild(node); setTimeout(function(){if(node.parentNode)node.remove();},3200);
  }

  function installPublicApi() {
    window.CoachV2 = {
      refresh: refresh,
      renderPlayerCard: renderPlayerCard,
      pageKey: pageKey,
      openDrawer: function (options) {
        return window.CoachOverlays && window.CoachOverlays.openDrawer ? window.CoachOverlays.openDrawer(options || {}) : null;
      },
      openSheet: function (options) {
        return window.CoachOverlays && window.CoachOverlays.openSheet ? window.CoachOverlays.openSheet(options || {}) : null;
      },
      closeDrawer: function () {
        if (window.CoachOverlays && window.CoachOverlays.closeAll) window.CoachOverlays.closeAll();
      },
      showToast: toast,
      signOut: signOut,
      openMatchdayLog: function () { window.location.href = ROUTES['match-facts'] + '?mode=live'; }
    };
    window.renderCoachMobilePlayerCard = function (player) { return renderPlayerCard(player); };
    window.renderCoachMyPlayerCard = function (player, options) { return renderPlayerCard(player, options); };
  }

  function refresh() {
    if (!document.body || !isCoachPage() || pageKey() === 'onboarding') return;
    var reconnect = !!observer;
    if (observer) observer.disconnect();
    try {
      loadStylesheet();
      loadOverlays();
      setMode();
      document.body.classList.add('coach-page-' + pageKey());
      shellClasses();
      installDesktopSidebar();
      installDesktopTopbar();
      installFieldShell();
      bindChrome();
      bridgeHeroActions();
      openRequestedLiveMode();
      markDeskOnlyControls();
      functionalFallbacks();
      bindExportFallback();
      stripSensitiveDisplay();
    } finally {
      if (reconnect && observer && document.body) observer.observe(document.body,{childList:true,subtree:true});
    }
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(function () { refreshQueued = false; refresh(); });
  }

  function observe() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function (mutations) {
      var structural = mutations.some(function (mutation) {
        return Array.prototype.some.call(mutation.addedNodes || [],function(node){return node && node.nodeType === 1;});
      });
      if (structural) queueRefresh();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function boot() {
    installPublicApi();
    refresh();
    observe();
    [120,400,900,1800,3200].forEach(function(delay){setTimeout(refresh,delay);});
  }

  installPublicApi();
  loadStylesheet();
  loadOverlays();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.addEventListener('resize', function () { setMode(); closeFieldMore(); queueRefresh(); });
  window.addEventListener('pageshow', queueRefresh);
}());

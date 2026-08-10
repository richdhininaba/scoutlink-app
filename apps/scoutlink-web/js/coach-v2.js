'use strict';

/*
  ScoutLink Coach Desk + Coach Field shared runtime.
  This file owns shell/navigation only. It does NOT rewrite page content.
  Route-specific scripts remain responsible for API reads/writes, validation,
  scoring, forms, uploads and submissions.
*/
(function () {
  if (window.__coachDeskFieldRuntimeV1) return;
  window.__coachDeskFieldRuntimeV1 = true;

  var MOBILE_MAX = 760;

  var ROUTES = {
    dashboard:'/coach/dashboard',
    onboarding:'/coach/onboarding',
    'my-players':'/coach/my-players',
    'add-player':'/coach/add-player',
    'bulk-add-players':'/coach/bulk-add-players',
    fixtures:'/coach/fixtures',
    'match-facts':'/coach/match-facts',
    'video-reels':'/coach/video-reels',
    chat:'/coach/chat',
    notifications:'/coach/notifications',
    'report-a-concern':'/coach/report-a-concern',
    settings:'/coach/settings',
    profile:'/player/profile'
  };

  var NAV = [
    ['Overview', [['dashboard','Dashboard','DB']]],
    ['Squad', [
      ['my-players','My players','PL'],
      ['add-player','Add player','AP'],
      ['bulk-add-players','Bulk import','BI']
    ]],
    ['Matchday', [
      ['fixtures','Fixtures','FX'],
      ['match-facts','Match Facts','MF'],
      ['video-reels','Video reels','VR']
    ]],
    ['Inbox', [
      ['chat','Chat','CH'],
      ['notifications','Notifications','NT']
    ]],
    ['Trust & admin', [
      ['report-a-concern','Report a concern','RC'],
      ['settings','Settings','ST']
    ]]
  ];

  var TITLES = {
    dashboard:['Dashboard','Today'],
    onboarding:['Coach setup','Setup'],
    'my-players':['My players','Squad'],
    'add-player':['Add player','Add player'],
    'bulk-add-players':['Bulk import','More'],
    fixtures:['Fixtures','More'],
    'match-facts':['Match Facts','Match'],
    'video-reels':['Video reels','More'],
    chat:['Chat','Inbox'],
    notifications:['Notifications','Inbox'],
    'report-a-concern':['Report a concern','More'],
    settings:['Settings','More'],
    profile:['Player profile','Squad']
  };

  var searchCache = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g,function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function cleanPath() {
    return String(window.location.pathname || '/').replace(/\/+$/,'') || '/';
  }

  function fileName() {
    return cleanPath().split('/').pop() || '';
  }

  function pageKey() {
    var path = cleanPath().toLowerCase();
    var file = fileName().toLowerCase();
    if (path.indexOf('/coach/onboarding') === 0 || file === 'coach-onboarding.html') return 'onboarding';
    if (path.indexOf('/coach/dashboard') === 0 || file === 'coach-dashboard.html') return 'dashboard';
    if (path.indexOf('/coach/my-players') === 0 || file === 'coach-my-players.html') return 'my-players';
    if (path.indexOf('/coach/add-player') === 0 || file === 'add-player.html') return 'add-player';
    if (path.indexOf('/coach/bulk-add-players') === 0 || file === 'bulk-add-players.html') return 'bulk-add-players';
    if (path.indexOf('/coach/fixtures') === 0 || file === 'coach-fixtures.html') return 'fixtures';
    if (path.indexOf('/coach/match-facts') === 0 || file === 'match-facts.html') return 'match-facts';
    if (path.indexOf('/coach/video-reels') === 0 || file === 'coach-video-reels.html') return 'video-reels';
    if (path.indexOf('/coach/chat') === 0 || file === 'coach-chat.html') return 'chat';
    if (path.indexOf('/coach/notifications') === 0 || file === 'coach-notifications.html') return 'notifications';
    if (path.indexOf('/coach/report-a-concern') === 0 || file === 'coach-report-concern.html' || file === 'report-concern.html') return 'report-a-concern';
    if (path.indexOf('/coach/settings') === 0 || file === 'coach-settings.html') return 'settings';
    if ((path.indexOf('/player/profile') === 0 || file === 'player-profile.html') && storedRole() === 'Coach') return 'profile';
    return '';
  }

  function storedRole() {
    try {
      return (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        sessionStorage.getItem('sl_public_demo_role') || '';
    } catch (_) { return ''; }
  }

  function user() {
    try {
      if (window.Auth && window.Auth.user) return window.Auth.user;
      return JSON.parse(localStorage.getItem('sl_user') || 'null') || {};
    } catch (_) { return {}; }
  }

  function fullName() {
    var current = user();
    return [
      current.firstName || current.first_name,
      current.lastName || current.last_name
    ].filter(Boolean).join(' ').trim() || 'Coach';
  }

  function firstName() {
    return fullName().split(/\s+/)[0] || 'Coach';
  }

  function teamName() {
    var current = user();
    try {
      return localStorage.getItem('sl_team_name') ||
        current.teamName || current.team_name ||
        current.clubName || current.club_name ||
        'Your team';
    } catch (_) {
      return current.teamName || current.team_name || 'Your team';
    }
  }

  function ageGroup() {
    var current = user();
    try {
      return localStorage.getItem('sl_team_age_group') ||
        current.ageGroup || current.age_group ||
        current.team_age_group || '';
    } catch (_) { return ''; }
  }

  function initials(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'C').charAt(0) + (parts[1] || parts[0] || 'O').charAt(0)).toUpperCase();
  }

  function currentTitle() {
    return TITLES[pageKey()] || ['Coach','Coach'];
  }

  function activeKey(key) {
    var page = pageKey();
    if (page === 'profile') return key === 'my-players';
    return page === key;
  }

  function navMarkup() {
    return NAV.map(function (group) {
      return '<section class="coach-nav-group"><small class="coach-nav-label">' + esc(group[0]) + '</small>' +
        group[1].map(function (item) {
          return '<a class="nav-link' + (activeKey(item[0]) ? ' active' : '') + '" href="' + esc(ROUTES[item[0]]) + '"' +
            (activeKey(item[0]) ? ' aria-current="page"' : '') + '><span class="nav-ico">' +
            esc(item[2]) + '</span><b>' + esc(item[1]) + '</b></a>';
        }).join('') + '</section>';
    }).join('');
  }

  function isPublicDemo() {
    try { return sessionStorage.getItem('sl_public_demo') === '1'; }
    catch (_) { return false; }
  }

  function isAdminDemo() {
    try { return localStorage.getItem('sl_demo_mode') === '1'; }
    catch (_) { return false; }
  }

  function switchExperience() {
    if (typeof window.openExperienceSelector === 'function') {
      window.openExperienceSelector();
      return;
    }
    if (isAdminDemo()) {
      var adminToken = localStorage.getItem('sl_admin_token');
      var adminUser = localStorage.getItem('sl_admin_user');
      if (adminToken && adminUser) {
        try {
          localStorage.setItem('sl_token',adminToken);
          localStorage.setItem('sl_user',adminUser);
          localStorage.setItem('sl_type',localStorage.getItem('sl_admin_type') || 'Stratex');
          localStorage.removeItem('sl_demo_mode');
        } catch (_) {}
      }
    }
    window.location.href = isPublicDemo() ? '/demo' : '/experience-select';
  }

  function signOut() {
    if (typeof window.logoutToLogin === 'function') {
      window.logoutToLogin();
      return;
    }
    if (window.Auth && typeof window.Auth.clear === 'function') window.Auth.clear();
    else {
      [
        'sl_token','sl_user','sl_type','sl_session','sl_user_id','sl_user_email',
        'sl_user_role','sl_user_data','sl_demo_mode','sl_admin_token',
        'sl_admin_user','sl_admin_type','sl_experience_switcher'
      ].forEach(function (key) {
        try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (_) {}
      });
    }
    window.location.href = '/login?logout=1';
  }

  function ensureStylesheet() {
    if (document.querySelector('link[href*="coach-desk-field-v1.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/coach-desk-field-v1.css?v=1.0.0';
    document.head.appendChild(link);
  }

  function installSidebar() {
    var sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    if (!sidebar) return;

    var logo = sidebar.querySelector('.sidebar-logo');
    if (!logo) {
      logo = document.createElement('div');
      logo.className = 'sidebar-logo';
      sidebar.insertBefore(logo, sidebar.firstChild);
    }
    logo.innerHTML = '<a class="sl-logo" href="/coach/dashboard">Scout<span>Link</span></a>';

    var workspace = sidebar.querySelector('.coach-workspace-card');
    if (!workspace) {
      workspace = document.createElement('div');
      workspace.className = 'coach-workspace-card';
      logo.insertAdjacentElement('afterend',workspace);
    }
    workspace.innerHTML = '<b>' + esc(teamName()) + '</b><span>' +
      esc((ageGroup() ? ageGroup() + ' · ' : '') + 'Coach workspace') + '</span>';

    var nav = document.getElementById('sidebarNav') || sidebar.querySelector('.sidebar-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'sidebarNav';
      nav.className = 'sidebar-nav';
      sidebar.appendChild(nav);
    }
    nav.innerHTML = navMarkup();

    var userHost = document.getElementById('sidebarUser') || sidebar.querySelector('.sidebar-user');
    if (!userHost) {
      userHost = document.createElement('div');
      userHost.id = 'sidebarUser';
      userHost.className = 'sidebar-user';
      sidebar.appendChild(userHost);
    }
    userHost.innerHTML =
      '<div class="coach-user-row"><span class="coach-user-avatar">' + esc(initials(fullName())) + '</span>' +
      '<div><b>' + esc(fullName()) + '</b><small>Coach · ' + esc(teamName()) + '</small></div></div>' +
      '<button class="coach-sidebar-signout" type="button" data-coach-signout>Sign out</button>';
  }

  function searchResult(item) {
    return '<a class="coach-search-result" href="' + esc(item.href) + '"><span>' + esc(item.icon) + '</span>' +
      '<div><b>' + esc(item.title) + '</b><small>' + esc(item.meta || item.type) + '</small></div><em>' + esc(item.type) + '</em></a>';
  }

  function listFrom(value, keys) {
    if (Array.isArray(value)) return value;
    for (var i = 0; i < keys.length; i += 1) {
      if (value && Array.isArray(value[keys[i]])) return value[keys[i]];
    }
    return [];
  }

  function apiGet(path) {
    if (typeof window.api === 'function') return window.api('GET',path);
    var base = window.API || localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    var token = (window.Auth && window.Auth.token) || localStorage.getItem('sl_token');
    return fetch(base + path,{headers:token ? {Authorization:'Bearer ' + token} : {}}).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function searchData() {
    if (searchCache) return Promise.resolve(searchCache);
    return Promise.allSettled([
      apiGet('/api/coaches/my-players'),
      apiGet('/api/fixtures'),
      apiGet('/api/videos')
    ]).then(function (results) {
      var players = results[0].status === 'fulfilled' ? listFrom(results[0].value,['players','data']) : [];
      var fixtures = results[1].status === 'fulfilled' ? listFrom(results[1].value,['fixtures','data']) : [];
      var videos = results[2].status === 'fulfilled' ? listFrom(results[2].value,['videos','data']) : [];
      searchCache = []
        .concat(players.map(function (p) {
          var name = [p.first_name,p.last_name].filter(Boolean).join(' ') || 'Player';
          return {type:'Player',icon:initials(name),title:name,meta:[p.age_group,p.specific_position || p.primary_position].filter(Boolean).join(' · '),href:'/player/profile?id=' + encodeURIComponent(p.id || '')};
        }))
        .concat(fixtures.map(function (f) {
          return {type:'Fixture',icon:'FX',title:f.opponent || f.opponent_name || 'Fixture',meta:[f.fixture_date,f.venue].filter(Boolean).join(' · '),href:'/coach/fixtures'};
        }))
        .concat(videos.map(function (v) {
          return {type:'Video',icon:'VR',title:v.title || v.file_name || 'Video evidence',meta:v.player_name || v.status || '',href:'/coach/video-reels'};
        }));
      return searchCache;
    });
  }

  function bindSearch(wrap) {
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';
    var input = wrap.querySelector('.coach-search');
    var results = wrap.querySelector('.coach-search-results');

    function render() {
      var q = String(input.value || '').trim().toLowerCase();
      if (!q) {
        wrap.classList.remove('open');
        results.innerHTML = '';
        return;
      }
      wrap.classList.add('open');
      results.innerHTML = '<div class="coach-search-result"><div></div><div><small>Searching…</small></div></div>';
      searchData().then(function (items) {
        var matches = items.filter(function (item) {
          return [item.title,item.meta,item.type].join(' ').toLowerCase().indexOf(q) >= 0;
        }).slice(0,8);
        results.innerHTML = matches.length ? matches.map(searchResult).join('') :
          '<div class="coach-search-result"><div></div><div><small>No Coach results found.</small></div></div>';
      });
    }

    input.addEventListener('input',render);
    input.addEventListener('focus',render);
    input.addEventListener('keydown',function (event) {
      if (event.key === 'Escape') {
        wrap.classList.remove('open');
        input.blur();
      }
      if (event.key === 'Enter') {
        var first = results.querySelector('a');
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    document.addEventListener('click',function (event) {
      if (!wrap.contains(event.target)) wrap.classList.remove('open');
    });
  }

  function installTopbar() {
    var topbar = document.querySelector('.topbar');
    if (!topbar) return;
    var title = currentTitle();

    topbar.innerHTML =
      '<div class="coach-topbar-copy"><span class="coach-route-label">Coach workspace</span>' +
      '<strong class="topbar-title">' + esc(title[0]) + '</strong></div>' +
      '<div class="coach-search-wrap"><label class="sr-only" for="coachGlobalSearch">Search Coach workspace</label>' +
      '<input class="coach-search" id="coachGlobalSearch" type="search" placeholder="Search players, fixtures, videos" autocomplete="off">' +
      '<span class="coach-search-kbd">Ctrl K</span><div class="coach-search-results"></div></div>' +
      '<div class="topbar-right">' +
        ((isAdminDemo() || isPublicDemo()) ? '<button class="coach-top-action" type="button" data-coach-switch>Switch demo</button>' : '') +
        '<button class="notif-btn" type="button" data-coach-notifications aria-label="Open notifications">NT</button>' +
        '<span class="coach-team-pill">' + esc(teamName()) + '</span>' +
        '<button class="profile-button" type="button" data-coach-settings><span class="avatar-square">' + esc(initials(fullName())) + '</span><b>' + esc(firstName()) + '</b></button>' +
      '</div>';

    bindSearch(topbar.querySelector('.coach-search-wrap'));
  }

  function fieldTitle() {
    var title = currentTitle();
    var page = pageKey();
    if (page === 'dashboard') return ['Morning, ' + firstName(), teamName() + (ageGroup() ? ' · ' + ageGroup() : '')];
    if (page === 'my-players') return ['Squad', teamName() + (ageGroup() ? ' · ' + ageGroup() : '')];
    return [title[1], teamName()];
  }

  function installFieldShell() {
    document.querySelectorAll('.coach-field-header,.coach-field-tabs,.coach-field-more,.coach-field-backdrop').forEach(function (node) { node.remove(); });

    var title = fieldTitle();
    var header = document.createElement('header');
    header.className = 'coach-field-header';
    header.innerHTML =
      '<a class="coach-field-brand" href="/coach/dashboard">Scout<i>Link</i></a>' +
      '<div class="coach-field-title"><b>' + esc(title[0]) + '</b><span>' + esc(title[1]) + '</span></div>' +
      '<button class="coach-field-icon" type="button" data-coach-notifications aria-label="Notifications">NT</button>' +
      '<button class="coach-field-icon" type="button" data-coach-field-more aria-label="More">•••</button>';
    document.body.appendChild(header);

    var tabs = document.createElement('nav');
    tabs.className = 'coach-field-tabs';
    tabs.setAttribute('aria-label','Coach Field navigation');
    var tabItems = [
      ['dashboard','TD','Today'],
      ['my-players','SQ','Squad'],
      ['match-facts','MT','Match'],
      ['chat','IN','Inbox']
    ];
    tabs.innerHTML = tabItems.map(function (item) {
      var active = item[0] === pageKey() || (item[0] === 'my-players' && pageKey() === 'profile') ||
        (item[0] === 'chat' && pageKey() === 'notifications');
      return '<a class="' + (active ? 'active' : '') + '" href="' + esc(ROUTES[item[0]]) + '"><span class="coach-field-tab-icon">' +
        esc(item[1]) + '</span><b>' + esc(item[2]) + '</b></a>';
    }).join('') +
      '<button class="' + (['add-player','bulk-add-players','fixtures','video-reels','report-a-concern','settings','onboarding'].indexOf(pageKey()) >= 0 ? 'active' : '') +
      '" type="button" data-coach-field-more><span class="coach-field-tab-icon">MR</span><b>More</b></button>';
    document.body.appendChild(tabs);

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'coach-field-backdrop';
    backdrop.setAttribute('aria-label','Close More');
    document.body.appendChild(backdrop);

    var more = document.createElement('section');
    more.className = 'coach-field-more';
    more.innerHTML =
      '<div class="coach-field-grab"></div><h2>More</h2>' +
      fieldRow('Video reels','Review clips and generate upload links',ROUTES['video-reels']) +
      fieldRow('Fixtures','Agenda and Match Facts status',ROUTES.fixtures) +
      fieldRow('Add player','Open the four-stage wizard',ROUTES['add-player']) +
      fieldRow('Bulk import','Full review table is a Coach Desk task',ROUTES['bulk-add-players']) +
      fieldRow('Team & coaches','Manage team access',ROUTES.settings + '#teamCoaches') +
      fieldRow('Notification preferences','Scout interest and reminders',ROUTES.settings + '#notifications') +
      fieldRow('Report a concern','Reviewed by the Stratex trust team',ROUTES['report-a-concern']) +
      '<button class="field-row" type="button" data-coach-switch><span><b>Switch demo</b><small>Return to workspace selection</small></span><em>›</em></button>' +
      '<button class="field-row" type="button" data-coach-signout><span><b>Sign out</b><small>End this ScoutLink session</small></span><em>›</em></button>';
    document.body.appendChild(more);
  }

  function fieldRow(label,copy,href) {
    return '<a class="field-row" href="' + esc(href) + '"><span><b>' + esc(label) + '</b><small>' + esc(copy) + '</small></span><em>›</em></a>';
  }

  function installFieldPositionSegment() {
    if (pageKey() !== 'my-players') return;
    var toolbar = document.querySelector('.coach-squad-toolbar');
    var select = document.getElementById('positionFilter');
    if (!toolbar || !select || toolbar.querySelector('.coach-field-position-seg')) return;

    var seg = document.createElement('div');
    seg.className = 'coach-field-position-seg';
    var options = [
      ['', 'All'],
      ['Goalkeeper','GK'],
      ['Defender','DEF'],
      ['Midfielder','MID'],
      ['Forward','ATT']
    ];
    seg.innerHTML = options.map(function (item) {
      return '<button type="button" data-position-value="' + esc(item[0]) + '"' + (!item[0] ? ' class="active"' : '') + '>' + esc(item[1]) + '</button>';
    }).join('');
    toolbar.appendChild(seg);

    seg.addEventListener('click',function (event) {
      var button = event.target.closest('[data-position-value]');
      if (!button) return;
      select.value = button.getAttribute('data-position-value') || '';
      select.dispatchEvent(new Event('change',{bubbles:true}));
      seg.querySelectorAll('button').forEach(function (node) { node.classList.toggle('active',node === button); });
    });
  }

  function closeFieldMore() {
    document.body.classList.remove('field-more-open');
  }

  function bindGlobal() {
    if (document.body.dataset.coachExactBound === '1') return;
    document.body.dataset.coachExactBound = '1';

    document.addEventListener('click',function (event) {
      if (event.target.closest('[data-coach-signout]')) {
        event.preventDefault(); signOut(); return;
      }
      if (event.target.closest('[data-coach-switch]')) {
        event.preventDefault(); closeFieldMore(); switchExperience(); return;
      }
      if (event.target.closest('[data-coach-notifications]')) {
        event.preventDefault(); window.location.href = ROUTES.notifications; return;
      }
      if (event.target.closest('[data-coach-settings]')) {
        event.preventDefault(); window.location.href = ROUTES.settings; return;
      }
      if (event.target.closest('[data-coach-field-more]')) {
        event.preventDefault(); document.body.classList.toggle('field-more-open'); return;
      }
      if (event.target.closest('.coach-field-backdrop')) {
        event.preventDefault(); closeFieldMore(); return;
      }
      if (event.target.closest('.coach-field-more a')) closeFieldMore();
    });

    document.addEventListener('keydown',function (event) {
      if (event.key === 'Escape') closeFieldMore();
      if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'k') {
        var search = document.querySelector('.coach-search');
        if (search && window.innerWidth > MOBILE_MAX) {
          event.preventDefault();
          search.focus();
          search.select();
        }
      }
    });
  }

  function toast(message,options) {
    if (window.CoachOverlays && typeof window.CoachOverlays.showCoachToast === 'function') {
      return window.CoachOverlays.showCoachToast(message,options || {});
    }
    var node = document.createElement('div');
    node.className = 'coach-overlay-toast';
    node.textContent = message || '';
    document.body.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.remove(); },3200);
    return node;
  }

  function refresh() {
    if (!document.body || !pageKey()) return;
    ensureStylesheet();
    document.body.classList.add('coach-exact');
    document.body.classList.remove('coach-v8','coach-v9','coach-v10','mobile-site','desktop-site');
    document.body.classList.toggle('coach-field-mode',window.innerWidth <= MOBILE_MAX);
    installSidebar();
    installTopbar();
    installFieldShell();
    installFieldPositionSegment();
  }

  window.CoachV2 = {
    refresh:refresh,
    pageKey:pageKey,
    showToast:toast,
    signOut:signOut,
    openDrawer:function (options) {
      return window.CoachOverlays && window.CoachOverlays.openDrawer ? window.CoachOverlays.openDrawer(options || {}) : null;
    },
    closeDrawer:function () {
      if (window.CoachOverlays && window.CoachOverlays.closeAll) window.CoachOverlays.closeAll();
    }
  };

  window.renderCoachMobilePlayerCard = window.renderCoachMobilePlayerCard || function () { return ''; };
  window.renderCoachMyPlayerCard = window.renderCoachMyPlayerCard || function () { return ''; };

  function boot() {
    refresh();
    bindGlobal();
    [120,450,1000,2200].forEach(function (delay) { setTimeout(refresh,delay); });
  }

  ensureStylesheet();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.addEventListener('resize',function () {
    closeFieldMore();
    refresh();
  });
  window.addEventListener('pageshow',refresh);
}());

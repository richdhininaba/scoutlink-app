'use strict';

(function () {
  var SCOUT_PAGE_FILES = {
    'scout-dashboard.html': 'dashboard',
    'player-search.html': 'player-search',
    'scout-pipeline.html': 'pipeline',
    'scout-rankings.html': 'rankings',
    'scout-fixtures.html': 'fixtures',
    'scout-predictions.html': 'predictions',
    'scout-exports.html': 'exports',
    'compare-players.html': 'compare-players',
    'scout-setup.html': 'setup',
    'scout-events.html': 'events',
    'scout-chat.html': 'chat',
    'scout-notifications.html': 'notifications',
    'scout-settings.html': 'settings',
    'report-concern.html': 'report-a-concern',
    'player-profile.html': 'profile'
  };

  function path() {
    return window.location.pathname.toLowerCase();
  }

  function fileName() {
    return path().split('/').pop() || '';
  }

  function isScoutUser() {
    try {
      return (window.Auth && window.Auth.type === 'Scout') ||
        localStorage.getItem('sl_type') === 'Scout' ||
        sessionStorage.getItem('demoRole') === 'scout';
    } catch (e) {
      return false;
    }
  }

  function isScoutRoute() {
    var p = path();
    if (p.indexOf('/scout/') === 0) return true;
    if (p.indexOf('/player/profile') === 0) return isScoutUser();
    if (fileName() === 'player-profile.html') return isScoutUser();
    return !!SCOUT_PAGE_FILES[fileName()] && fileName().indexOf('coach-') !== 0;
  }

  function pageKey() {
    var p = path();
    if (p.indexOf('/scout/dashboard') === 0) return 'dashboard';
    if (p.indexOf('/scout/player-search') === 0) return 'player-search';
    if (p.indexOf('/scout/pipeline') === 0) return 'pipeline';
    if (p.indexOf('/scout/rankings') === 0) return 'rankings';
    if (p.indexOf('/scout/fixtures') === 0) return 'fixtures';
    if (p.indexOf('/scout/predictions') === 0) return 'predictions';
    if (p.indexOf('/scout/exports') === 0) return 'exports';
    if (p.indexOf('/scout/compare-players') === 0) return 'compare-players';
    if (p.indexOf('/scout/setup') === 0) return 'setup';
    if (p.indexOf('/scout/events') === 0) return 'events';
    if (p.indexOf('/scout/chat') === 0) return 'chat';
    if (p.indexOf('/scout/notifications') === 0) return 'notifications';
    if (p.indexOf('/scout/report-a-concern') === 0 || p.indexOf('/scout/report-concern') === 0) return 'report-a-concern';
    if (p.indexOf('/scout/settings') === 0) return 'settings';
    if (p.indexOf('/player/profile') === 0 && isScoutUser()) return 'profile';
    if (fileName() === 'player-profile.html' && isScoutUser()) return 'profile';
    return SCOUT_PAGE_FILES[fileName()] || 'scout';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hrefFor(target) {
    target = String(target || '');
    if (!target || target.charAt(0) === '#' || target.charAt(0) === '/' || /^https?:/i.test(target)) return target;
    var parts = target.split('?');
    var base = parts[0];
    var query = parts.length > 1 ? '?' + parts.slice(1).join('?') : '';
    var map = {
      'scout-dashboard.html': '/scout/dashboard',
      'player-search.html': '/scout/player-search',
      'scout-pipeline.html': '/scout/pipeline',
      'scout-rankings.html': '/scout/rankings',
      'scout-fixtures.html': '/scout/fixtures',
      'scout-predictions.html': '/scout/predictions',
      'scout-exports.html': '/scout/exports',
      'compare-players.html': '/scout/compare-players',
      'scout-setup.html': '/scout/setup',
      'scout-events.html': '/scout/events',
      'scout-chat.html': '/scout/chat',
      'scout-notifications.html': '/scout/notifications',
      'scout-settings.html': '/scout/settings',
      'report-concern.html': '/scout/report-a-concern',
      'player-profile.html': '/player/profile'
    };
    return (map[base] || target) + (map[base] ? query : '');
  }

  function firstName() {
    try {
      return (window.Auth && window.Auth.user && window.Auth.user.firstName) || localStorage.getItem('sl_first_name') || '';
    } catch (e) {
      return '';
    }
  }

  function pageTitle() {
    var map = {
      dashboard: 'Dashboard',
      'player-search': 'Player database',
      pipeline: 'Pipeline',
      rankings: 'Rankings',
      fixtures: 'Fixtures',
      predictions: 'Predictions',
      exports: 'Exports',
      'compare-players': 'Compare players',
      setup: 'Scout setup',
      events: 'Events',
      chat: 'Chat',
      notifications: 'Notifications',
      'report-a-concern': 'Report a concern',
      settings: 'Settings',
      profile: 'Player profile'
    };
    return map[pageKey()] || 'Scout';
  }

  function enable() {
    if (!document.body || !isScoutRoute()) return;
    if (fileName() === 'player-profile.html' && !isScoutUser()) return;
    var key = pageKey();
    document.body.classList.add('scout-v1', 'scout-page-' + key);
    document.body.classList.remove('theme-dark', 'coach-v2');
    document.body.classList.add('theme-light');
  }

  function tidyNavGroups() {
    var nav = document.getElementById('sidebarNav');
    if (!nav || nav.dataset.scoutV1Grouped) return;
    nav.dataset.scoutV1Grouped = '1';
    var groups = [
      ['Overview', ['Dashboard']],
      ['Recruitment', ['Player search', 'My pipeline', 'Rankings', 'Compare players']],
      ['Analysis', ['Fixtures', 'Predictions', 'Exports']],
      ['Workspace', ['Scout setup', 'Events', 'Chat', 'Notifications', 'Settings', 'Report a Concern']]
    ];
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    if (!links.length) return;
    var html = '';
    groups.forEach(function (group) {
      var groupLinks = links.filter(function (link) {
        var text = (link.textContent || '').trim().toLowerCase();
        return group[1].some(function (label) { return text.indexOf(label.toLowerCase()) >= 0; });
      });
      if (!groupLinks.length) return;
      html += '<div class="scout-v1-nav-group"><span class="scout-v1-nav-label">' + esc(group[0]) + '</span>';
      groupLinks.forEach(function (link) { html += link.outerHTML; });
      html += '</div>';
    });
    if (html) nav.innerHTML = html;
  }

  function tidyTopbar() {
    var title = document.querySelector('.topbar-title');
    if (title && !title.dataset.scoutV1Title) {
      title.dataset.scoutV1Title = '1';
      title.textContent = pageTitle();
    }
    document.querySelectorAll('.topbar .btn[onclick*="logout"], .topbar button[onclick*="logout"], .topbar #logoutBtn').forEach(function (btn) {
      btn.classList.add('btn-outline');
      btn.textContent = 'Sign out';
    });
  }

  function heroCopy() {
    var name = firstName();
    var map = {
      dashboard: ['Find the right player' + (name ? ', ' + name : ''), 'Search, shortlist, compare and run predictions from a calmer scout workspace.'],
      'player-search': ['Player database.', 'Search by evidence, compatibility and location without squeezing a desktop table onto the page.'],
      pipeline: ['Your recruitment pipeline.', 'Track coach-mediated interest and keep every player stage clear.'],
      rankings: ['Rankings that stay usable.', 'Review top players with explainable performance and profile evidence.'],
      fixtures: ['Fixtures worth attending.', 'See scout-visible games and respond with a clear attendance status.'],
      predictions: ['Prediction history.', 'Review the analysis your team has run and return to the player profile when needed.'],
      exports: ['Export history.', 'Track profile and prediction exports without wasting limits on redownloads.'],
      'compare-players': ['Compare two players.', 'Select players, review strengths and make the recommendation easy to scan.'],
      setup: ['Scout setup.', 'Set your weaknesses, role expectations and long-term recruitment priorities.'],
      events: ['Showcase events.', 'Track invitations and scout responses in one view.'],
      chat: ['Coach conversations.', 'Message coaches only where player interest has been registered.'],
      notifications: ['Notifications.', 'Keep recruitment, fixture and message activity in one focused feed.'],
      'report-a-concern': ['Report a concern.', 'Tell Stratex about inappropriate contact, data misuse, inaccurate access or a product safety issue.'],
      settings: ['Settings.', 'Manage your profile, region, plan and preferences.']
    };
    return map[pageKey()] || ['Scout workspace.', 'ScoutLink tools for reviewed recruitment workflows.'];
  }

  function addHero() {
    var key = pageKey();
    if (key === 'profile') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.scout-v1-hero')) return;
    var copy = heroCopy();
    var actions = {
      dashboard: [['Player database', 'player-search.html', 'btn-primary'], ['Pipeline', 'scout-pipeline.html', 'btn-outline']],
      'player-search': [['Pipeline', 'scout-pipeline.html', 'btn-outline']],
      pipeline: [['Find players', 'player-search.html', 'btn-primary']],
      predictions: [['Find players', 'player-search.html', 'btn-primary']],
      exports: [['Find players', 'player-search.html', 'btn-primary']],
      'compare-players': [['Player database', 'player-search.html', 'btn-outline']],
      setup: [['Save setup', '#', 'btn-primary']]
    }[key] || [];
    var hero = document.createElement('section');
    hero.className = 'scout-v1-hero';
    hero.innerHTML = '<div><span class="scout-v1-chip">Scout workspace</span><h1>' + esc(copy[0]) + '</h1><p>' + esc(copy[1]) + '</p></div>' +
      (actions.length ? '<div class="scout-v1-hero-actions">' + actions.map(function (a) {
        return '<a class="btn ' + a[2] + '" href="' + esc(hrefFor(a[1])) + '">' + esc(a[0]) + '</a>';
      }).join('') + '</div>' : '');
    content.insertBefore(hero, content.firstChild);
  }

  function dashboardActions() {
    if (pageKey() !== 'dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.scout-v1-action-grid')) return;
    var grid = document.createElement('section');
    grid.className = 'scout-v1-action-grid';
    grid.innerHTML = [
      ['Player database', 'Search cards', 'player-search.html', 'DB'],
      ['Pipeline', 'Track interest', 'scout-pipeline.html', 'PL'],
      ['Compare players', 'Stacked review', 'compare-players.html', 'CP'],
      ['Predictions', 'Run analysis', 'scout-predictions.html', 'PR'],
      ['Fixtures', 'Attend games', 'scout-fixtures.html', 'FX'],
      ['Chat', 'Message coaches', 'scout-chat.html', 'CH'],
      ['Rankings', 'Top players', 'scout-rankings.html', 'RK'],
      ['Setup', 'Preferences', 'scout-setup.html', 'ST']
    ].map(function (item) {
      return '<a class="scout-v1-action-card" href="' + esc(hrefFor(item[2])) + '"><span class="scout-v1-action-icon">' + esc(item[3]) + '</span><span><h3>' + esc(item[0]) + '</h3><p>' + esc(item[1]) + '</p></span></a>';
    }).join('');
    var afterHero = content.querySelector('.scout-v1-hero');
    if (afterHero && afterHero.nextSibling) content.insertBefore(grid, afterHero.nextSibling);
    else content.insertBefore(grid, content.firstChild);
  }

  function addBottomNav() {
    if (document.querySelector('.scout-v1-bottom-nav')) return;
    var items = [
      ['Home', 'scout-dashboard.html', 'H', 'dashboard'],
      ['Search', 'player-search.html', 'S', 'player-search'],
      ['Pipeline', 'scout-pipeline.html', 'P', 'pipeline'],
      ['Compare', 'compare-players.html', 'C', 'compare-players'],
      ['More', 'scout-settings.html', 'M', 'settings']
    ];
    var key = pageKey();
    var nav = document.createElement('nav');
    nav.className = 'scout-v1-bottom-nav';
    nav.setAttribute('aria-label', 'Scout quick navigation');
    nav.innerHTML = items.map(function (item) {
      var active = key === item[3] || (item[3] === 'settings' && ['rankings', 'fixtures', 'predictions', 'exports', 'setup', 'events', 'chat', 'notifications', 'report-a-concern', 'settings'].indexOf(key) >= 0);
      return '<a class="' + (active ? 'active' : '') + '" href="' + esc(hrefFor(item[1])) + '"><span>' + esc(item[2]) + '</span>' + esc(item[0]) + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  function stripSensitiveDisplay() {
    if (!document.body || !document.body.classList.contains('scout-v1')) return;
    var banned = /\b(email|e-mail|date of birth|dob|guardian|parent)\b/i;
    document.querySelectorAll('th,td,label,dt,span,small,p,div').forEach(function (el) {
      if (!el || el.closest('script,style')) return;
      if (el.children && el.children.length > 1 && !/^(TH|TD|LABEL|DT)$/i.test(el.tagName || '')) return;
      var text = (el.textContent || '').trim();
      if (!text || text.length > 80 || !banned.test(text)) return;
      var row = el.closest('tr,.form-group,.profile-row,.detail-row,.value-factor-row,.scout-v1-review-card div');
      if (row && !row.dataset.scoutV1SensitiveHidden) {
        row.dataset.scoutV1SensitiveHidden = '1';
        row.classList.add('scout-v1-sensitive-hidden');
      }
    });
  }

  function bindHeroActions() {
    if (pageKey() !== 'setup') return;
    var heroBtn = document.querySelector('.scout-v1-hero a[href="#"]');
    if (!heroBtn || heroBtn.dataset.scoutV1Bound) return;
    heroBtn.dataset.scoutV1Bound = '1';
    heroBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var save = document.querySelector('button[type="submit"], #saveSetupBtn, .btn-primary');
      if (save && save !== heroBtn) save.click();
    });
  }

  function refresh() {
    enable();
    if (!document.body || !document.body.classList.contains('scout-v1')) return;
    tidyTopbar();
    tidyNavGroups();
    addHero();
    dashboardActions();
    stripSensitiveDisplay();
    addBottomNav();
    bindHeroActions();
  }

  window.ScoutV1 = { refresh: refresh, pageKey: pageKey };

  if (document.body) enable();
  document.addEventListener('DOMContentLoaded', function () {
    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 1200);
  });
  window.addEventListener('resize', refresh);
})();

(function () {
  'use strict';

  var ROUTES = {
    '/scout/dashboard': 'dashboard',
    '/scout/player-search': 'player-search',
    '/scout/pipeline': 'pipeline',
    '/scout/rankings': 'rankings',
    '/scout/fixtures': 'fixtures',
    '/scout/predictions': 'predictions',
    '/scout/exports': 'exports',
    '/scout/compare-players': 'compare-players',
    '/scout/setup': 'setup',
    '/scout/chat': 'chat',
    '/scout/notifications': 'notifications',
    '/scout/settings': 'settings',
    '/scout/events': 'events',
    '/player/profile': 'profile'
  };

  var FILES = {
    'scout-dashboard.html': 'dashboard',
    'player-search.html': 'player-search',
    'scout-pipeline.html': 'pipeline',
    'scout-rankings.html': 'rankings',
    'scout-fixtures.html': 'fixtures',
    'scout-predictions.html': 'predictions',
    'scout-exports.html': 'exports',
    'compare-players.html': 'compare-players',
    'scout-setup.html': 'setup',
    'scout-chat.html': 'chat',
    'scout-notifications.html': 'notifications',
    'scout-settings.html': 'settings',
    'scout-events.html': 'events',
    'player-profile.html': 'profile'
  };

  var NAV_GROUPS = [
    ['Overview', [['Dashboard', 'scout-dashboard.html', 'dashboard', 'DB']]],
    ['Recruitment', [
      ['Player database', 'player-search.html', 'player-search', 'PD'],
      ['My pipeline', 'scout-pipeline.html', 'pipeline', 'MP'],
      ['Rankings', 'scout-rankings.html', 'rankings', 'RK'],
      ['Fixtures', 'scout-fixtures.html', 'fixtures', 'FX']
    ]],
    ['Analysis', [
      ['Predictions', 'scout-predictions.html', 'predictions', 'PR'],
      ['Exports', 'scout-exports.html', 'exports', 'EX'],
      ['Compare players', 'compare-players.html', 'compare-players', 'CP'],
      ['Scout setup', 'scout-setup.html', 'setup', 'SS']
    ]],
    ['Communication', [
      ['Chat', 'scout-chat.html', 'chat', 'CH'],
      ['Notifications', 'scout-notifications.html', 'notifications', 'NT']
    ]]
  ];

  var COPY = {
    dashboard: ['Find the right player', 'Search, shortlist, compare and run predictions from one calm scout workspace.'],
    'player-search': ['Player database', 'Search by compatibility, age, position and location without fighting tables.'],
    pipeline: ['My recruitment pipeline', 'Track interest stages and coach conversations from one clean view.'],
    rankings: ['Rankings', 'Review leading players with evidence, confidence and position context.'],
    fixtures: ['Fixtures', 'Plan attendance around scout-visible upcoming matches.'],
    predictions: ['Predictions', 'Review analysis history and return to the relevant player profile fast.'],
    exports: ['Exports', 'Track profile and prediction exports without losing sight of limits.'],
    'compare-players': ['Compare players', 'Select two players and review the recommendation in stacked sections.'],
    setup: ['Scout setup', 'Set weaknesses, role expectations and long-term recruitment goals.'],
    chat: ['Chat', 'Message coaches after player interest is added to the pipeline.'],
    notifications: ['Notifications', 'Recruitment updates, fixtures and messages in one focused feed.'],
    settings: ['Settings', 'Manage account details, regions, preferences and support.'],
    events: ['Events', 'Review showcase invitations and attendance.'],
    profile: ['Player profile', 'Review performance, compatibility and evidence in a scout-first profile.']
  };

  function path() {
    return window.location.pathname.toLowerCase().replace(/\/$/, '');
  }

  function fileName() {
    return window.location.pathname.toLowerCase().split('/').pop() || '';
  }

  function storage(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function scoutUser() {
    try {
      return (window.Auth && window.Auth.type === 'Scout') || storage('sl_type') === 'Scout' || storage('demoRole') === 'scout';
    } catch (e) {
      return false;
    }
  }

  function routeKey() {
    var p = path();
    if (ROUTES[p]) return ROUTES[p];
    return FILES[fileName()] || '';
  }

  function isScoutPage() {
    var key = routeKey();
    if (!key) return false;
    if (key === 'profile') return scoutUser();
    return path().indexOf('/scout/') === 0 || fileName().indexOf('scout-') === 0 || fileName() === 'player-search.html' || fileName() === 'compare-players.html';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cleanHref(target) {
    var map = {
      'scout-dashboard.html': '/scout/dashboard',
      'player-search.html': '/scout/player-search',
      'scout-pipeline.html': '/scout/pipeline',
      'scout-rankings.html': '/scout/rankings',
      'scout-fixtures.html': '/scout/fixtures',
      'scout-predictions.html': '/scout/predictions',
      'scout-exports.html': '/scout/exports',
      'compare-players.html': '/scout/compare-players',
      'scout-setup.html': '/scout/setup',
      'scout-chat.html': '/scout/chat',
      'scout-notifications.html': '/scout/notifications',
      'scout-settings.html': '/scout/settings'
    };
    return map[target] || target;
  }

  function userName() {
    try {
      var u = window.Auth && window.Auth.user;
      var name = [u && u.firstName, u && u.lastName].filter(Boolean).join(' ');
      return name || [storage('sl_first_name'), storage('sl_last_name')].filter(Boolean).join(' ') || 'Scout';
    } catch (e) {
      return 'Scout';
    }
  }

  function initials(name) {
    return String(name || 'Scout').split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase() || 'SC';
  }

  function titleFor(key) {
    return (COPY[key] && COPY[key][0]) || 'Scout';
  }

  function ensureShell() {
    if (!isScoutPage()) return;
    var key = routeKey();
    document.body.classList.add('scout-v2', 'scout-page', 'scout-route-' + key);
    document.body.classList.remove('coach-v2', 'theme-dark');
    document.body.classList.add('theme-light');

    var main = document.querySelector('.dashboard-main');
    if (main) main.classList.add('workspace');
    var topbar = document.querySelector('.topbar');
    if (topbar) {
      topbar.classList.add('workspace-top');
      var title = topbar.querySelector('.topbar-title');
      if (title) title.textContent = titleFor(key);
      topbar.querySelectorAll('button[onclick*="logout"], #logoutBtn, .desktop-signout').forEach(function (btn) {
        btn.classList.add('scout-v2-desktop-signout');
        btn.textContent = 'Sign out';
      });
    }
    var content = document.querySelector('.page-content');
    if (content) content.classList.add('workspace-content');
  }

  function renderSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.dataset.scoutV2Done) return;
    var key = routeKey();
    var name = userName();
    sidebar.dataset.scoutV2Done = '1';
    sidebar.classList.add('scout-v2-sidebar');
    sidebar.innerHTML =
      '<div class="side-logo"><a class="logo" href="' + esc(cleanHref('scout-dashboard.html')) + '">Scout<span>Link</span></a></div>' +
      '<div class="side-nav">' + NAV_GROUPS.map(function (group) {
        return '<div class="side-group"><div class="nav-label">' + esc(group[0]) + '</div>' + group[1].map(function (item) {
          var active = key === item[2] ? ' active' : '';
          return '<a class="side-link' + active + '" href="' + esc(cleanHref(item[1])) + '"><span class="side-icon">' + esc(item[3]) + '</span><span>' + esc(item[0]) + '</span></a>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="side-user"><div class="user-avatar">' + esc(initials(name)) + '</div><div><b>' + esc(name) + '</b><span>Scout</span></div></div>';
  }

  function notificationButton() {
    return '<button class="scout-v2-bell" type="button" aria-label="Open notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span id="scoutV2NotifDot" aria-hidden="true"></span></button>';
  }

  function renderMobileChrome() {
    if (document.querySelector('.scout-v2-mobile-top')) return;
    var key = routeKey();
    var top = document.createElement('header');
    top.className = 'scout-v2-mobile-top';
    top.innerHTML = '<button class="scout-v2-menu-btn" type="button" aria-label="Open menu"><span></span><span></span><span></span></button><h1>' + esc(titleFor(key)) + '</h1>' + notificationButton();
    document.body.appendChild(top);

    var backdrop = document.createElement('div');
    backdrop.className = 'scout-v2-backdrop';
    document.body.appendChild(backdrop);

    var drawer = document.createElement('aside');
    drawer.className = 'scout-v2-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '<div class="drawer-head"><a class="logo" href="' + esc(cleanHref('scout-dashboard.html')) + '">Scout<span>Link</span></a><button type="button" class="drawer-close" aria-label="Close menu">Close</button></div><div class="drawer-user"><div class="user-avatar">' + esc(initials(userName())) + '</div><div><b>' + esc(userName()) + '</b><span>Scout</span></div></div><nav class="drawer-nav">' + NAV_GROUPS.map(function (group) {
      return '<div class="nav-label">' + esc(group[0]) + '</div>' + group[1].map(function (item) {
        return '<a class="side-link" href="' + esc(cleanHref(item[1])) + '"><span class="side-icon">' + esc(item[3]) + '</span><span>' + esc(item[0]) + '</span></a>';
      }).join('');
    }).join('') + '</nav><button type="button" class="drawer-signout">Sign out</button>';
    document.body.appendChild(drawer);

    function open() {
      document.body.classList.add('scout-v2-menu-open');
      drawer.setAttribute('aria-hidden', 'false');
    }
    function close() {
      document.body.classList.remove('scout-v2-menu-open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    top.querySelector('.scout-v2-menu-btn').addEventListener('click', open);
    backdrop.addEventListener('click', close);
    drawer.querySelector('.drawer-close').addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    drawer.querySelector('.drawer-signout').addEventListener('click', function () {
      close();
      if (typeof window.logoutToLogin === 'function') window.logoutToLogin();
      else if (typeof window.logout === 'function') window.logout();
      else window.location.href = '/login';
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) close();
    });
  }

  function renderHero() {
    var key = routeKey();
    if (key === 'profile') return;
    var content = document.querySelector('.page-content');
    if (!content) return;
    content.querySelectorAll('.scout-v1-hero').forEach(function (el) { el.remove(); });
    if (content.querySelector('.scout-v2-hero')) return;
    var copy = COPY[key] || COPY.dashboard;
    var actions = {
      dashboard: [['Player database', 'player-search.html', 'primary'], ['Pipeline', 'scout-pipeline.html', 'ghost']],
      'player-search': [['My pipeline', 'scout-pipeline.html', 'primary'], ['Compare players', 'compare-players.html', 'ghost']],
      pipeline: [['Find players', 'player-search.html', 'primary']],
      predictions: [['Find players', 'player-search.html', 'primary']],
      exports: [['Find players', 'player-search.html', 'primary']],
      'compare-players': [['Player database', 'player-search.html', 'ghost']],
      setup: [['Save setup', '#save', 'primary']]
    }[key] || [];
    var hero = document.createElement('section');
    hero.className = 'scout-v2-hero';
    hero.innerHTML = '<div><span class="pill green">Scout workspace</span><h2>' + esc(copy[0]) + '</h2><p>' + esc(copy[1]) + '</p></div>' +
      '<div class="hero-actions">' + actions.map(function (item) {
        return '<a class="scout-v2-btn ' + esc(item[2]) + '" href="' + esc(item[1] === '#save' ? '#' : cleanHref(item[1])) + '">' + esc(item[0]) + '</a>';
      }).join('') + '</div>';
    content.insertBefore(hero, content.firstElementChild || null);
    var save = hero.querySelector('a[href="#"]');
    if (save) {
      save.addEventListener('click', function (event) {
        event.preventDefault();
        var target = document.querySelector('button[type="submit"], #saveSetupBtn, .save-setup, .btn-primary');
        if (target && target !== save) target.click();
      });
    }
  }

  function dashboardActions() {
    if (routeKey() !== 'dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content) return;
    content.querySelectorAll('.scout-v1-action-grid').forEach(function (el) { el.remove(); });
    if (content.querySelector('.scout-v2-action-grid')) return;
    var items = [
      ['Player database', 'Search cards', 'player-search.html', 'PD'],
      ['Pipeline', 'Track interest', 'scout-pipeline.html', 'MP'],
      ['Compare players', 'Stacked review', 'compare-players.html', 'CP'],
      ['Predictions', 'Run analysis', 'scout-predictions.html', 'PR'],
      ['Fixtures', 'Attend games', 'scout-fixtures.html', 'FX'],
      ['Chat', 'Message coaches', 'scout-chat.html', 'CH'],
      ['Rankings', 'Top players', 'scout-rankings.html', 'RK'],
      ['Setup', 'Preferences', 'scout-setup.html', 'SS']
    ];
    var grid = document.createElement('section');
    grid.className = 'scout-v2-action-grid';
    grid.innerHTML = items.map(function (item) {
      return '<a class="scout-v2-action-card" href="' + esc(cleanHref(item[2])) + '"><span>' + esc(item[3]) + '</span><b>' + esc(item[0]) + '</b><small>' + esc(item[1]) + '</small></a>';
    }).join('');
    var hero = content.querySelector('.scout-v2-hero');
    if (hero && hero.nextSibling) content.insertBefore(grid, hero.nextSibling);
    else content.insertBefore(grid, content.firstChild);
  }

  function restyleContent() {
    document.querySelectorAll('.table-card, .kpi-card, .filter-card, .profile-card, .settings-card, .prediction-card, .export-card, .chat-shell').forEach(function (el) {
      el.classList.add('scout-v2-card');
    });
    document.querySelectorAll('table').forEach(function (table) {
      table.classList.add('scout-v2-table');
      var headers = Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function (th) {
        return (th.textContent || '').trim();
      });
      table.querySelectorAll('tbody tr').forEach(function (row) {
        Array.prototype.slice.call(row.children).forEach(function (cell, index) {
          if (!cell.getAttribute('data-label') && headers[index]) cell.setAttribute('data-label', headers[index]);
        });
      });
      if (!table.parentElement.classList.contains('scout-v2-table-wrap')) {
        var wrap = document.createElement('div');
        wrap.className = 'scout-v2-table-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
    });
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.classList.add('scout-v2-btn');
      if (btn.classList.contains('btn-primary')) btn.classList.add('primary');
      if (btn.classList.contains('btn-outline') || btn.classList.contains('btn-ghost')) btn.classList.add('ghost');
    });
  }

  function addBottomNav() {
    document.querySelectorAll('.scout-v1-bottom-nav').forEach(function (el) { el.remove(); });
    if (document.querySelector('.scout-v2-bottom-nav')) return;
    var key = routeKey();
    var items = [
      ['Home', 'scout-dashboard.html', 'dashboard', 'DB'],
      ['Search', 'player-search.html', 'player-search', 'PD'],
      ['Pipeline', 'scout-pipeline.html', 'pipeline', 'MP'],
      ['Compare', 'compare-players.html', 'compare-players', 'CP'],
      ['More', 'scout-settings.html', 'settings', 'ME']
    ];
    var nav = document.createElement('nav');
    nav.className = 'scout-v2-bottom-nav';
    nav.setAttribute('aria-label', 'Scout quick navigation');
    nav.innerHTML = items.map(function (item) {
      var active = key === item[2] || (item[2] === 'settings' && ['rankings', 'fixtures', 'predictions', 'exports', 'setup', 'chat', 'notifications', 'settings'].indexOf(key) >= 0);
      return '<a class="' + (active ? 'active' : '') + '" href="' + esc(cleanHref(item[1])) + '"><span>' + esc(item[3]) + '</span>' + esc(item[0]) + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  function apply() {
    if (!document.body || !isScoutPage()) return;
    ensureShell();
    renderSidebar();
    renderMobileChrome();
    renderHero();
    dashboardActions();
    restyleContent();
    addBottomNav();
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    setTimeout(apply, 250);
    setTimeout(apply, 1000);
    setTimeout(apply, 1800);
  });
  if (document.body) apply();
})();

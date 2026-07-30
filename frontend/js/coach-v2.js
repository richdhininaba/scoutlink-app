/* ScoutLink Coach Experience V8.2 clean-layout production runtime.
   This file changes presentation and navigation only.
   Existing route-specific data, API and submission scripts remain responsible
   for live behaviour. */
'use strict';

(function () {
  var STYLE_ID = 'coachExperienceV8Style';
  var STYLE_URL = '/frontend/css/coach-experience-v8.css?v=8.2.0-clean-layout';
  var MOBILE_MAX = 760;
  var refreshQueued = false;
  var observer = null;
  var dashboardMetricsLoaded = false;
  var playerPage = 1;
  var PLAYER_PAGE_SIZE = 8;
  var legacyActionBridge = {
    saveDraft: null,
    downloadTemplate: null,
    importFile: null
  };

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
    dashboard: 'Dashboard',
    onboarding: 'Coach setup',
    'my-players': 'My players',
    'add-player': 'Add player',
    'bulk-add-players': 'Bulk import',
    'match-facts': 'Match Facts',
    fixtures: 'Fixtures',
    'video-reels': 'Video reels',
    chat: 'Chat',
    notifications: 'Notifications',
    'report-a-concern': 'Report a concern',
    settings: 'Settings',
    profile: 'Player profile'
  };

  var HEROES = {
    dashboard: {
      tone: 'green',
      kicker: 'Coach workspace',
      title: 'Good morning, {first}.',
      copy: 'See what changed, what needs attention and where your squad evidence is strongest before the next match.',
      actions: [
        ['Add player', '/coach/add-player', 'white'],
        ['Log Match Facts', '/coach/match-facts', 'ghost']
      ]
    },
    'my-players': {
      tone: 'green',
      kicker: 'Squad management',
      title: 'Your squad, clearly organised.',
      copy: 'Search, filter, compare and update player records without fighting oversized cards or a crowded table.',
      actions: [
        ['Add player', '/coach/add-player', 'white'],
        ['Bulk import', '/coach/bulk-add-players', 'ghost']
      ]
    },
    'add-player': {
      tone: 'navy',
      kicker: 'Player creation',
      title: 'Add a player without turning it into a data-entry project.',
      copy: 'Start with the essential football identity, then add physical and attribute evidence only where you are confident.',
      actions: [['Save draft', '#legacy-save-draft', 'ghost']]
    },
    'bulk-add-players': {
      tone: 'navy',
      kicker: 'Squad setup',
      title: 'Import a full squad without losing control of the data.',
      copy: 'Start from the ScoutLink template or an Excel/CSV file, review every row and submit only when the required football fields are ready.',
      actions: [
        ['Download template', '#legacy-download-template', 'white'],
        ['Import Excel / CSV', '#legacy-import-file', 'ghost']
      ]
    },
    'match-facts': {
      tone: 'navy',
      kicker: 'Post-match evidence',
      title: 'Turn the match into evidence while it is still fresh.',
      copy: 'Move through setup, formation, events, player ratings and one final review before the record is submitted.',
      actions: [['Save draft', '#legacy-save-draft', 'ghost']]
    },
    fixtures: {
      tone: 'green',
      kicker: 'Match planning',
      title: 'Keep every evidence opportunity connected to the squad.',
      copy: 'Create upcoming fixtures, review completed matches and move directly into Match Facts when the game is finished.',
      actions: [['Add fixture', '#add-fixture', 'primary']]
    },
    'video-reels': {
      tone: 'green',
      kicker: 'Approved player evidence',
      title: 'Keep video attached to the right player and the right context.',
      copy: 'Generate controlled upload links, review submitted clips and connect approved evidence to the correct player profile.',
      actions: [['Upload video', '#video-upload', 'primary']]
    },
    chat: {
      tone: 'navy',
      kicker: 'Reviewed scout communication',
      title: 'Every conversation stays connected to one player.',
      copy: 'Keep reviewed scout messages, player context and responsible follow-up together in one controlled conversation.',
      actions: [['Refresh chats', '#refresh-chats', 'secondary']]
    },
    notifications: {
      tone: 'green',
      kicker: 'Coach activity',
      title: 'See what changed and act from the notification.',
      copy: 'Review player, fixture, scout and account updates without searching across the workspace.',
      actions: []
    },
    'report-a-concern': {
      tone: 'navy',
      kicker: 'Safeguarding and platform safety',
      title: 'Report a concern clearly and securely.',
      copy: 'Tell Stratex about inappropriate contact, suspected misuse, inaccurate access or another product safety issue.',
      actions: []
    },
    settings: {
      tone: 'green',
      kicker: 'Account and team control',
      title: 'Settings that stay out of the way until you need them.',
      copy: 'Manage your account, team coaches, notifications, privacy preferences and usage requests.',
      actions: []
    }
  };

  var NAV_GROUPS = [
    ['Overview', [
      ['dashboard', 'Dashboard', 'DB']
    ]],
    ['Players', [
      ['my-players', 'My players', 'PL'],
      ['add-player', 'Add player', 'AP'],
      ['bulk-add-players', 'Bulk import', 'BI']
    ]],
    ['Matchday', [
      ['match-facts', 'Match Facts', 'MF'],
      ['fixtures', 'Fixtures', 'FX'],
      ['video-reels', 'Video reels', 'VR']
    ]],
    ['Communication', [
      ['chat', 'Chat', 'CH'],
      ['notifications', 'Notifications', 'NT'],
      ['report-a-concern', 'Report a concern', 'RC']
    ]],
    ['Account', [
      ['settings', 'Settings', 'ST']
    ]]
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function cleanPath() {
    return (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function fileName() {
    return cleanPath().split('/').pop() || '';
  }

  function isCoachUser() {
    try {
      return (window.Auth && window.Auth.type === 'Coach') ||
        localStorage.getItem('sl_type') === 'Coach' ||
        sessionStorage.getItem('demoRole') === 'coach' ||
        sessionStorage.getItem('sl_public_demo_role') === 'Coach';
    } catch (_) {
      return false;
    }
  }

  function pageKey() {
    var path = cleanPath().toLowerCase();
    if (path.indexOf('/coach/onboarding') === 0 || fileName() === 'coach-onboarding.html') return 'onboarding';
    if (path.indexOf('/coach/dashboard') === 0 || fileName() === 'coach-dashboard.html') return 'dashboard';
    if (path.indexOf('/coach/my-players') === 0 || fileName() === 'coach-my-players.html') return 'my-players';
    if (path.indexOf('/coach/add-player') === 0 || fileName() === 'add-player.html') return 'add-player';
    if (path.indexOf('/coach/bulk-add-players') === 0 || fileName() === 'bulk-add-players.html') return 'bulk-add-players';
    if (path.indexOf('/coach/match-facts') === 0 || fileName() === 'match-facts.html') return 'match-facts';
    if (path.indexOf('/coach/fixtures') === 0 || fileName() === 'coach-fixtures.html') return 'fixtures';
    if (path.indexOf('/coach/video-reels') === 0 || fileName() === 'coach-video-reels.html') return 'video-reels';
    if (path.indexOf('/coach/chat') === 0 || fileName() === 'coach-chat.html') return 'chat';
    if (path.indexOf('/coach/notifications') === 0 || fileName() === 'coach-notifications.html') return 'notifications';
    if (path.indexOf('/coach/report-a-concern') === 0 ||
        fileName() === 'coach-report-concern.html' ||
        fileName() === 'report-concern.html') return 'report-a-concern';
    if (path.indexOf('/coach/settings') === 0 || fileName() === 'coach-settings.html') return 'settings';
    if ((path.indexOf('/player/profile') === 0 || fileName() === 'player-profile.html') && isCoachUser()) return 'profile';
    return '';
  }

  function isCoachPage() {
    return !!pageKey();
  }

  function routeFor(key) {
    return ROUTES[key] || '#';
  }

  function currentUser() {
    try {
      return (window.Auth && window.Auth.user) || {};
    } catch (_) {
      return {};
    }
  }

  function firstName() {
    var user = currentUser();
    try {
      return user.firstName || user.first_name || localStorage.getItem('sl_first_name') || 'Coach';
    } catch (_) {
      return user.firstName || user.first_name || 'Coach';
    }
  }

  function fullName() {
    var user = currentUser();
    var name = ((user.firstName || user.first_name || '') + ' ' +
      (user.lastName || user.last_name || '')).trim();
    if (name) return name;
    try {
      return ((localStorage.getItem('sl_first_name') || '') + ' ' +
        (localStorage.getItem('sl_last_name') || '')).trim() || 'Coach';
    } catch (_) {
      return 'Coach';
    }
  }

  function teamName() {
    var user = currentUser();
    try {
      return localStorage.getItem('sl_team_name') ||
        user.teamName || user.team_name ||
        localStorage.getItem('demoTeamName') ||
        sessionStorage.getItem('demoTeamName') ||
        'Your team';
    } catch (_) {
      return user.teamName || user.team_name || 'Your team';
    }
  }

  function initials(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'C').charAt(0) +
      (parts[1] || parts[0] || 'O').charAt(0)).toUpperCase();
  }

  function loadStylesheet() {
    if (document.getElementById(STYLE_ID)) return;
    var link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = STYLE_URL;
    document.head.appendChild(link);
  }

  function setMode() {
    if (!document.body) return;
    var mobile = window.innerWidth <= MOBILE_MAX;
    document.body.classList.toggle('mobile-site', mobile);
    document.body.classList.toggle('desktop-site', !mobile);
  }

  function activeNavKey() {
    var key = pageKey();
    return key === 'profile' ? 'my-players' : key;
  }

  function navMarkup() {
    var active = activeNavKey();
    return NAV_GROUPS.map(function (group) {
      return '<section class="nav-group coach-nav-group" data-coach-v8-nav>' +
        '<small class="coach-nav-label">' + esc(group[0]) + '</small>' +
        group[1].map(function (item) {
          return '<a class="nav-link nav-item side-link ' +
            (active === item[0] ? 'active' : '') +
            '" href="' + esc(routeFor(item[0])) + '"' +
            (active === item[0] ? ' aria-current="page"' : '') + '>' +
            '<span class="nav-ico side-icon">' + esc(item[2]) + '</span>' +
            '<b>' + esc(item[1]) + '</b></a>';
        }).join('') +
      '</section>';
    }).join('');
  }

  function userMarkup() {
    var name = fullName();
    return '<div class="user-info" data-coach-v8-user>' +
      '<span class="user-avatar avatar-square">' + esc(initials(name)) + '</span>' +
      '<div><b class="user-name">' + esc(name) + '</b>' +
      '<small class="user-role">Coach · ' + esc(teamName()) + '</small></div>' +
    '</div>';
  }

  function installSidebar() {
    var sidebar = document.querySelector('.sidebar, .coach-sidebar');
    if (!sidebar) return;
    sidebar.classList.add('coach-sidebar');

    var logo = sidebar.querySelector('.sidebar-logo');
    if (!logo) {
      logo = document.createElement('a');
      logo.className = 'sidebar-logo';
      sidebar.insertBefore(logo, sidebar.firstChild);
    }
    if (!logo.dataset.coachV8Ready) {
      logo.dataset.coachV8Ready = '1';
      logo.setAttribute('href', ROUTES.dashboard);
      logo.innerHTML = '<span class="sl-logo">Scout<span>Link</span></span>';
    }

    var nav = document.getElementById('sidebarNav') || sidebar.querySelector('.sidebar-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'sidebarNav';
      nav.className = 'sidebar-nav';
      sidebar.appendChild(nav);
    }
    nav.classList.add('sidebar-nav');
    if (!nav.querySelector('[data-coach-v8-nav]')) nav.innerHTML = navMarkup();

    var user = document.getElementById('sidebarUser') || sidebar.querySelector('.sidebar-user');
    if (!user) {
      user = document.createElement('div');
      user.id = 'sidebarUser';
      user.className = 'sidebar-user';
      sidebar.appendChild(user);
    }
    user.classList.add('sidebar-user');
    if (!user.children.length) user.innerHTML = userMarkup();
  }

  function titleForPage() {
    return TITLES[pageKey()] || 'Coach';
  }

  function installTopbar() {
    var topbar = document.querySelector('.topbar, .coach-topbar');
    if (!topbar) return;
    topbar.classList.add('coach-topbar');

    var title = topbar.querySelector('.topbar-title');
    if (!title) {
      title = document.createElement('span');
      title.className = 'topbar-title';
      title.textContent = titleForPage();
      topbar.insertBefore(title, topbar.firstChild);
    }

    if (!title.closest('.coach-v8-topbar-copy')) {
      var copy = document.createElement('div');
      copy.className = 'coach-v8-topbar-copy';
      var label = document.createElement('span');
      label.className = 'route-label';
      label.textContent = 'Coach workspace';
      title.parentNode.insertBefore(copy, title);
      copy.appendChild(label);
      copy.appendChild(title);
    }

    var right = topbar.querySelector('.topbar-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'topbar-right';
      topbar.appendChild(right);
    }

    var notification = right.querySelector('.notif-btn, #notifToggleBtn, #notifToggle');
    if (!notification) {
      notification = document.createElement('button');
      notification.type = 'button';
      notification.className = 'notif-btn icon-button';
      notification.id = 'coachV8NotificationButton';
      notification.setAttribute('aria-label', 'Open notifications');
      notification.innerHTML = 'NT<span class="notif-badge" id="notifBadge" style="display:none"></span>';
      notification.addEventListener('click', function () {
        window.location.href = ROUTES.notifications;
      });
      right.insertBefore(notification, right.firstChild);
    }

    if (!right.querySelector('.team-pill')) {
      var team = document.createElement('span');
      team.className = 'team-pill';
      team.textContent = teamName();
      right.appendChild(team);
    }

    if (!right.querySelector('.profile-button')) {
      var profile = document.createElement('button');
      profile.type = 'button';
      profile.className = 'profile-button';
      profile.innerHTML = '<span class="avatar-square small">' +
        esc(initials(fullName())) + '</span><b>' + esc(firstName()) + '</b>';
      profile.addEventListener('click', function () {
        window.location.href = ROUTES.settings;
      });
      right.appendChild(profile);
    }
  }

  function installMobileHeader() {
    var existing = document.querySelector('.coach-v2-mobile-top, .mobile-topbar, .mobile-top');
    if (!existing) {
      existing = document.createElement('header');
      document.body.insertBefore(existing, document.body.firstChild);
    }
    existing.className = 'mobile-topbar coach-v2-mobile-top';
    if (!existing.dataset.coachV8Ready) {
      existing.dataset.coachV8Ready = '1';
      existing.innerHTML =
        '<a class="coach-v8-mobile-logo" href="' + ROUTES.dashboard +
          '" aria-label="ScoutLink Coach dashboard">Scout<span>Link</span></a>' +
        '<strong class="coach-v8-mobile-title coach-v2-mobile-title">' +
          esc(titleForPage()) + '</strong>' +
        '<button class="coach-v2-menu-button" type="button" aria-label="Open Coach menu">Menu</button>';
    } else {
      var title = existing.querySelector('.coach-v2-mobile-title');
      if (title) title.textContent = titleForPage();
    }
  }

  function bottomItems() {
    return [
      ['dashboard', 'HM', 'Home'],
      ['my-players', 'PL', 'Players'],
      ['match-facts', 'MF', 'Match'],
      ['chat', 'CH', 'Chat'],
      ['more', 'MR', 'More']
    ];
  }

  function bottomActive(itemKey) {
    var key = pageKey();
    if (itemKey === 'more') {
      return ['add-player', 'bulk-add-players', 'fixtures', 'video-reels',
        'notifications', 'report-a-concern', 'settings', 'profile', 'onboarding'].indexOf(key) >= 0;
    }
    return key === itemKey;
  }

  function installBottomNav() {
    document.querySelectorAll('.coach-v2-bottom-nav, .mobile-bottom-nav, .mobile-bottom').forEach(function (old) {
      if (!old.dataset.coachV8Ready) old.remove();
    });

    var nav = document.querySelector('.coach-v8-bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'mobile-bottom-nav coach-v2-bottom-nav coach-v8-bottom-nav';
      nav.dataset.coachV8Ready = '1';
      nav.setAttribute('aria-label', 'Coach mobile navigation');
      document.body.appendChild(nav);
    }
    nav.innerHTML = bottomItems().map(function (item) {
      var href = item[0] === 'more' ? '#coach-more' : routeFor(item[0]);
      return '<a class="' + (bottomActive(item[0]) ? 'active' : '') +
        '" href="' + href + '"' + (bottomActive(item[0]) ? ' aria-current="page"' : '') +
        '><span>' + item[1] + '</span><b>' + item[2] + '</b></a>';
    }).join('');
  }

  function installMoreSheet() {
    var sheet = document.querySelector('.coach-v8-more-sheet');
    if (!sheet) {
      sheet = document.createElement('nav');
      sheet.className = 'coach-v8-more-sheet';
      sheet.setAttribute('aria-label', 'More Coach pages');
      sheet.innerHTML = [
        ['Add player', ROUTES['add-player']],
        ['Bulk import', ROUTES['bulk-add-players']],
        ['Fixtures', ROUTES.fixtures],
        ['Video reels', ROUTES['video-reels']],
        ['Notifications', ROUTES.notifications],
        ['Report a concern', ROUTES['report-a-concern']],
        ['Settings', ROUTES.settings]
      ].map(function (item) {
        return '<a href="' + item[1] + '"><span>' + esc(item[0]) + '</span><b>›</b></a>';
      }).join('');
      document.body.appendChild(sheet);
    }

    if (!document.querySelector('.coach-v8-mobile-backdrop')) {
      var backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'coach-v8-mobile-backdrop';
      backdrop.setAttribute('aria-label', 'Close Coach menu');
      document.body.appendChild(backdrop);
    }
  }

  function closeOverlays() {
    document.body.classList.remove('coach-v8-menu-open', 'coach-v2-menu-open', 'coach-v8-more-open');
  }

  function bindGlobalChrome() {
    if (document.body.dataset.coachV8ChromeBound === '1') return;
    document.body.dataset.coachV8ChromeBound = '1';

    document.addEventListener('click', function (event) {
      var menu = event.target.closest('.coach-v2-menu-button');
      if (menu) {
        event.preventDefault();
        document.body.classList.toggle('coach-v8-menu-open');
        document.body.classList.remove('coach-v8-more-open');
        return;
      }

      var more = event.target.closest('a[href="#coach-more"]');
      if (more) {
        event.preventDefault();
        document.body.classList.toggle('coach-v8-more-open');
        document.body.classList.remove('coach-v8-menu-open', 'coach-v2-menu-open');
        return;
      }

      if (event.target.closest('.coach-v8-mobile-backdrop')) {
        closeOverlays();
        return;
      }

      if (event.target.closest('.sidebar a, .coach-v8-more-sheet a')) closeOverlays();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeOverlays();
    });
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

  function heroActions(actions) {
    return (actions || []).map(function (action) {
      var label = action[0];
      var href = action[1];
      var tone = action[2] || 'primary';
      var className = 'btn ' + (
        tone === 'white' ? 'white' :
        tone === 'ghost' ? 'ghost' :
        tone === 'secondary' ? 'secondary' :
        'primary'
      );

      if (href.charAt(0) === '#') {
        return '<button type="button" class="' + className +
          '" data-coach-v8-scroll="' + esc(href) + '">' +
          esc(label) + '</button>';
      }

      return '<a class="' + className + '" href="' + esc(href) + '">' +
        esc(label) + '</a>';
    }).join('');
  }

  function heroMeta(key) {
    if (key === 'dashboard') return teamName() + ' · U16';
    if (key === 'add-player') {
      return 'Required information: name, age group and position group.';
    }
    if (key === 'match-facts') {
      return 'Match Facts is post-match only. Live Mode is not used.';
    }
    return '';
  }

  function removeRepeatedHeroText(content, config) {
    if (!content || !config || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
    var removals = [];
    var phrase = String(config.kicker || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var repeated = phrase ? new RegExp('^(?:' + phrase + '\\s*){2,}$', 'i') : null;
    var node;

    while ((node = walker.nextNode())) {
      var value = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!value) continue;
      if (
        (repeated && repeated.test(value)) ||
        /^(?:squad setup\s*){2,}$/i.test(value) ||
        /^(?:post-match evidence\s*){2,}$/i.test(value)
      ) {
        removals.push(node);
      }
    }

    removals.forEach(function (textNode) {
      if (textNode.parentNode) textNode.parentNode.removeChild(textNode);
    });
  }

  function bridgeCandidate(scope, selector, textPattern) {
    if (!scope || !scope.querySelector) return null;

    var direct = selector ? scope.querySelector(selector) : null;
    if (direct && !direct.closest('[data-coach-v8-exact-hero]')) return direct;

    if (!textPattern) return null;

    return Array.prototype.slice.call(
      scope.querySelectorAll('button,a,input[type="button"],input[type="submit"]')
    ).find(function (node) {
      if (node.closest('[data-coach-v8-exact-hero]')) return false;
      var value = String(node.textContent || node.value || '')
        .replace(/\s+/g, ' ')
        .trim();
      return textPattern.test(value);
    }) || null;
  }

  function captureLegacyActions(scope) {
    scope = scope || document;

    var save = bridgeCandidate(
      scope,
      '#saveDraftBtn,#saveDraft,#mf3SaveDraft,[data-save-draft]',
      /save\s+draft/i
    );
    var download = bridgeCandidate(
      scope,
      '#downloadTemplateBtn',
      /download\s+template/i
    );
    var importButton = bridgeCandidate(
      scope,
      '#importFileBtn,#bulkFileInput',
      /import\s+(excel|csv|file)|choose\s+file/i
    );

    if (save) legacyActionBridge.saveDraft = save;
    if (download) legacyActionBridge.downloadTemplate = download;
    if (importButton) legacyActionBridge.importFile = importButton;
  }

  function isLegacyHero(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.hasAttribute('data-coach-v8-exact-hero')) return false;

    return Array.prototype.some.call(node.classList || [], function (className) {
      return className === 'page-hero' || /-hero$/.test(className);
    });
  }

  function removeLegacyHeroes(content) {
    if (!content) return;

    Array.prototype.slice.call(content.querySelectorAll('*')).forEach(function (node) {
      if (!isLegacyHero(node)) return;
      captureLegacyActions(node);
      node.remove();
    });
  }

  function exactHeroAnchor(content) {
    var children = Array.prototype.slice.call(content.children || []);
    var banner = children.find(function (child) {
      return child.matches && child.matches(
        '.public-demo-banner,.demo-banner,.demo-mode-banner,[data-public-demo-banner]'
      );
    });

    return banner ? banner.nextElementSibling : content.firstElementChild;
  }

  function ensureHero() {
    var key = pageKey();
    var config = HEROES[key];
    var content = document.querySelector('.page-content');
    if (!content || !config || key === 'profile' || key === 'onboarding') return;

    captureLegacyActions(document);
    removeRepeatedHeroText(content, config);
    removeLegacyHeroes(content);

    var exactHeroes = Array.prototype.slice.call(
      content.querySelectorAll('[data-coach-v8-exact-hero]')
    );
    var exact = exactHeroes.shift() || null;

    exactHeroes.forEach(function (duplicate) {
      duplicate.remove();
    });

    if (!exact) {
      exact = document.createElement('section');
      exact.dataset.coachV8ExactHero = '1';
    }

    var anchor = exactHeroAnchor(content);
    if (anchor !== exact) {
      content.insertBefore(exact, anchor || null);
    }

    exact.className = 'page-hero coach-v8-exact-hero ' + config.tone;
    exact.setAttribute('aria-labelledby', 'coachV8ExactHeroTitle');

    var title = config.title.replace('{first}', firstName());
    var meta = heroMeta(key);
    exact.innerHTML =
      '<div class="coach-v8-exact-hero-copy">' +
        '<span>' + esc(config.kicker) + '</span>' +
        '<h2 id="coachV8ExactHeroTitle">' + esc(title) + '</h2>' +
        '<p>' + esc(config.copy) + '</p>' +
        (meta ? '<small class="hero-meta">' + esc(meta) + '</small>' : '') +
      '</div>' +
      (config.actions.length
        ? '<div class="button-row hero-actions">' +
            heroActions(config.actions) +
          '</div>'
        : '');
  }

  function bindScrollActions() {
    document.querySelectorAll('[data-coach-v8-scroll]').forEach(function (button) {
      if (button.dataset.coachV8Bound) return;
      button.dataset.coachV8Bound = '1';
      button.addEventListener('click', function () {
        var key = pageKey();
        var selector = button.getAttribute('data-coach-v8-scroll');

        if (selector === '#legacy-save-draft') {
          captureLegacyActions(document);
          var save = bridgeCandidate(
            document,
            '#saveDraftBtn,#saveDraft,#mf3SaveDraft,[data-save-draft]',
            /save\s+draft/i
          ) || legacyActionBridge.saveDraft;
          if (save) save.click();
          else toast('The draft action is not available on this step.');
          return;
        }

        if (selector === '#legacy-download-template') {
          captureLegacyActions(document);
          var download = document.getElementById('downloadTemplateBtn') ||
            legacyActionBridge.downloadTemplate;
          if (download) download.click();
          else toast('The template is not available yet.');
          return;
        }

        if (selector === '#legacy-import-file') {
          captureLegacyActions(document);
          var importButton = document.getElementById('importFileBtn') ||
            document.getElementById('bulkFileInput') ||
            legacyActionBridge.importFile;
          if (importButton) importButton.click();
          else toast('The file importer is not available yet.');
          return;
        }

        if (key === 'fixtures') {
          var fixture = document.getElementById('addFixtureCard') ||
            document.getElementById('fOpponent') ||
            document.querySelector('.fixture-add, form');
          if (fixture) {
            fixture.scrollIntoView({ behavior: 'smooth', block: 'start' });
            var opponent = document.getElementById('fOpponent');
            if (opponent) setTimeout(function () { opponent.focus(); }, 300);
          }
          return;
        }

        if (key === 'video-reels') {
          var upload = document.getElementById('uploadVideoBtn') ||
            document.querySelector('input[type="file"], .dropzone, .upload-zone');
          if (upload) upload.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        if (key === 'chat') {
          var refresh = document.getElementById('refreshThreads');
          if (refresh) refresh.click();
          return;
        }

        var target = selector && selector !== '#' ? document.querySelector(selector) : null;
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function sectionCard(title, copy, body, className) {
    return '<article class="section-card coach-dashboard-panel ' + (className || '') + '">' +
      '<header class="coach-dashboard-panel-head"><div><h2>' + esc(title) +
      '</h2><p>' + esc(copy) + '</p></div></header><div class="section-body coach-dashboard-panel-body">' +
      body + '</div></article>';
  }

  function needMarkup(key, title, copy, percentage) {
    return '<div class="coach-v8-need" data-need="' + key + '">' +
      '<div class="coach-v8-need-head"><div><b>' + esc(title) + '</b><span>' +
      esc(copy) + '</span></div><strong data-need-value>' + percentage + '%</strong></div>' +
      '<i class="coach-v8-track"><i data-need-track style="width:' + percentage + '%"></i></i></div>';
  }

  function enhanceDashboard() {
    if (pageKey() !== 'dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content) return;

    var statGrid = content.querySelector('.coach-dashboard-stat-grid, .kpi-grid');
    if (statGrid) statGrid.classList.add('kpi-strip');

    if (!content.querySelector('.dashboard-priority-grid')) {
      var mySquad = document.getElementById('myPlayers');
      var squadPanel = mySquad && mySquad.closest('.coach-dashboard-panel,section,article');
      var wrapper = document.createElement('section');
      wrapper.className = 'dashboard-priority-grid';
      wrapper.innerHTML =
        sectionCard('Next actions', 'The most valuable work to complete now.',
          '<div class="action-list">' +
            '<a class="coach-v8-priority-link" href="' + ROUTES['match-facts'] + '"><span>MF</span><div><b>Add recent Match Facts</b><p>Keep Saturday’s evidence connected to the correct players.</p></div><em>Start</em></a>' +
            '<a class="coach-v8-priority-link" href="' + ROUTES['video-reels'] + '"><span>VR</span><div><b>Review approved video</b><p>Generate an upload link or connect a submitted clip.</p></div><em>Open</em></a>' +
            '<a class="coach-v8-priority-link" href="' + ROUTES.chat + '"><span>CH</span><div><b>Reply to reviewed scouts</b><p>Keep each conversation connected to its player context.</p></div><em>Reply</em></a>' +
          '</div>', 'priority-card') +
        sectionCard('What the team needs', 'Evidence gaps across the current squad.',
          needMarkup('recent', 'Recent Match Facts', 'Players with recorded match evidence', 0) +
          needMarkup('video', 'Approved video', 'Players with connected video evidence', 0) +
          needMarkup('physical', 'Physical profile', 'Players with height and build context', 0) +
          '<div class="coach-v8-verdict"><span>Best next move</span><b data-team-verdict>Load the current squad to calculate the best next action.</b></div>',
          'needs-card');
      content.insertBefore(wrapper, squadPanel || (statGrid ? statGrid.nextSibling : content.firstChild));
    }

    if (!dashboardMetricsLoaded && typeof window.api === 'function') {
      dashboardMetricsLoaded = true;
      window.api('GET', '/api/coaches/my-players').then(function (response) {
        var players = response && (response.data || response.players) || [];
        updateDashboardNeeds(players);
      }).catch(function () {
        var verdict = document.querySelector('[data-team-verdict]');
        if (verdict) verdict.textContent = 'Review Match Facts, approved video and physical profile coverage from the squad pages.';
      });
    }
  }

  function hasVideo(player) {
    return !!(player && (
      player.video_url || player.videoUrl || player.highlight_url ||
      player.highlightUrl || Number(player.video_count) > 0 ||
      Number(player.videos_count) > 0 ||
      (Array.isArray(player.videos) && player.videos.length)
    ));
  }

  function percentage(players, predicate) {
    if (!players.length) return 0;
    return Math.round(players.filter(predicate).length / players.length * 100);
  }

  function updateNeed(key, value, detail) {
    var row = document.querySelector('[data-need="' + key + '"]');
    if (!row) return;
    var valueNode = row.querySelector('[data-need-value]');
    var track = row.querySelector('[data-need-track]');
    var copy = row.querySelector('.coach-v8-need-head span');
    if (valueNode) valueNode.textContent = value + '%';
    if (track) track.style.width = value + '%';
    if (copy && detail) copy.textContent = detail;
  }

  function updateDashboardNeeds(players) {
    var recent = percentage(players, function (player) {
      return Number(player.appearances) > 0 ||
        !!player.last_match_date || !!player.last_match_fact_at;
    });
    var video = percentage(players, hasVideo);
    var physical = percentage(players, function (player) {
      return !!(player.height_category && player.build_category);
    });

    updateNeed('recent', recent,
      (players.length - Math.round(recent / 100 * players.length)) + ' players need current match evidence');
    updateNeed('video', video,
      (players.length - Math.round(video / 100 * players.length)) + ' players have no connected video');
    updateNeed('physical', physical,
      (players.length - Math.round(physical / 100 * players.length)) + ' players need height or build context');

    var needs = [
      { label: 'Complete recent Match Facts before adding more profile detail.', value: recent },
      { label: 'Generate controlled video upload links for players without evidence.', value: video },
      { label: 'Complete missing height and build ranges.', value: physical }
    ].sort(function (a, b) { return a.value - b.value; });

    var verdict = document.querySelector('[data-team-verdict]');
    if (verdict) verdict.textContent = players.length ? needs[0].label : 'Add the first player to begin tracking squad evidence.';
  }

  function exportPlayersFromDom() {
    var rows = [];
    document.querySelectorAll('.coach-players-table tbody tr').forEach(function (row) {
      var cells = Array.prototype.slice.call(row.querySelectorAll('td')).map(function (cell) {
        return String(cell.textContent || '').replace(/\s+/g, ' ').trim();
      });
      if (cells.length) rows.push(cells);
    });

    if (!rows.length) {
      document.querySelectorAll('.coach-player-card').forEach(function (card) {
        var name = card.querySelector('h4');
        var copy = card.querySelector('.coach-player-copy p');
        var rating = card.querySelector('.coach-player-rating');
        if (name) rows.push([
          name.textContent.trim(),
          copy ? copy.textContent.trim() : '',
          rating ? rating.childNodes[0].textContent.trim() : ''
        ]);
      });
    }

    if (!rows.length) {
      toast('There are no visible players to export.');
      return;
    }

    var header = rows[0].length > 3
      ? ['Player','Age group','Position','Overall','Value','Apps','Goals','Assists','Evidence','Assigned coach','Action']
      : ['Player','Age and position','Overall'];

    var csv = [header].concat(rows).map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell || '').replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'scoutlink-squad-list.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 250);
  }

  function ensurePlayerExport() {
    if (pageKey() !== 'my-players') return;
    var filters = document.querySelector('.coach-players-filters');
    if (!filters || document.getElementById('coachV8ExportPlayers')) return;
    var button = document.createElement('button');
    button.id = 'coachV8ExportPlayers';
    button.type = 'button';
    button.className = 'btn btn-outline coach-v8-export';
    button.textContent = 'Export squad list';
    button.addEventListener('click', exportPlayersFromDom);
    filters.appendChild(button);
  }

  function forceDesktopPlayerTable() {
    if (pageKey() !== 'my-players' || window.innerWidth <= MOBILE_MAX) return;
    var tableButton = document.querySelector('[data-view="table"]');
    if (
      tableButton &&
      !tableButton.classList.contains('is-active') &&
      tableButton.getAttribute('aria-pressed') !== 'true'
    ) {
      tableButton.click();
    }
  }

  function playerCards() {
    return Array.prototype.slice.call(document.querySelectorAll('#playersContainer .coach-player-card'));
  }

  function installPlayerPagination() {
    if (pageKey() !== 'my-players') return;
    var host = document.getElementById('playersContainer');
    if (!host) return;

    if (window.innerWidth > MOBILE_MAX) {
      host.querySelectorAll('.coach-player-card').forEach(function (card) {
        card.hidden = false;
      });
      var desktopFooter = document.querySelector('.coach-v8-mobile-pagination');
      if (desktopFooter) desktopFooter.remove();
      return;
    }

    var cards = playerCards();
    if (!cards.length) return;
    var pageCount = Math.max(1, Math.ceil(cards.length / PLAYER_PAGE_SIZE));
    playerPage = Math.max(1, Math.min(playerPage, pageCount));

    cards.forEach(function (card, index) {
      card.hidden = index < (playerPage - 1) * PLAYER_PAGE_SIZE ||
        index >= playerPage * PLAYER_PAGE_SIZE;

      if (!card.dataset.coachV8Clickable) {
        card.dataset.coachV8Clickable = '1';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'link');
        var open = function (event) {
          if (event && event.target.closest('a,button,input,select,textarea')) return;
          var link = card.querySelector('a[href*="/player/profile"],a[href*="player-profile"]');
          if (link) window.location.href = link.href;
        };
        card.addEventListener('click', open);
        card.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
      }
    });

    var footer = document.querySelector('.coach-v8-mobile-pagination');
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'coach-v8-mobile-pagination';
      host.parentNode.insertBefore(footer, host.nextSibling);
    }
    var start = (playerPage - 1) * PLAYER_PAGE_SIZE + 1;
    var end = Math.min(playerPage * PLAYER_PAGE_SIZE, cards.length);
    footer.innerHTML =
      '<span>' + start + '–' + end + ' of ' + cards.length + '</span>' +
      '<div class="coach-v8-page-controls">' +
        '<button type="button" data-player-page="-1" aria-label="Previous page">‹</button>' +
        '<b>' + playerPage + ' / ' + pageCount + '</b>' +
        '<button type="button" data-player-page="1" aria-label="Next page">›</button>' +
      '</div>';

    footer.querySelectorAll('[data-player-page]').forEach(function (button) {
      var delta = Number(button.getAttribute('data-player-page'));
      button.disabled = (delta < 0 && playerPage === 1) ||
        (delta > 0 && playerPage === pageCount);
      button.addEventListener('click', function () {
        playerPage += delta;
        installPlayerPagination();
        host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function enhanceMyPlayers() {
    if (pageKey() !== 'my-players') return;
    ensurePlayerExport();
    forceDesktopPlayerTable();
    installPlayerPagination();
  }

  function pitchMarkings() {
    return '<div class="pitch-markings" aria-hidden="true">' +
      '<i class="pitch-halfway"></i><i class="pitch-centre-circle"></i><i class="pitch-centre-spot"></i>' +
      '<i class="pitch-penalty-area top"></i><i class="pitch-penalty-area bottom"></i>' +
      '<i class="pitch-goal-area top"></i><i class="pitch-goal-area bottom"></i>' +
      '<i class="pitch-goal top"></i><i class="pitch-goal bottom"></i>' +
      '<i class="pitch-penalty-spot top"></i><i class="pitch-penalty-spot bottom"></i>' +
      '<span class="pitch-direction">Attacking direction</span></div>';
  }

  function enhancePitch() {
    if (pageKey() !== 'match-facts') return;
    document.querySelectorAll('.pitch-svg-container, .pitch').forEach(function (pitch) {
      pitch.classList.add('correctly-oriented-pitch');
      if (!pitch.querySelector('.pitch-markings')) {
        pitch.insertAdjacentHTML('afterbegin', pitchMarkings());
      }
    });
  }

  function removeLiveMatchMode() {
    if (pageKey() !== 'match-facts') return;
    document.querySelectorAll('.mode-card[data-mode="live"]').forEach(function (node) {
      node.remove();
    });
    document.querySelectorAll('.mode-card[data-mode="post"]').forEach(function (node) {
      node.classList.add('sel');
      node.setAttribute('aria-pressed', 'true');
    });
  }

  function enhanceChat() {
    if (pageKey() !== 'chat') return;
    var chat = document.querySelector('.chatv3-shell, .chat-shell');
    if (chat) chat.classList.add('chat-shell');
  }

  function classifyCurrentComponents() {
    document.querySelectorAll('.coach-dashboard-panel').forEach(function (card) {
      card.classList.add('section-card');
    });
    document.querySelectorAll('.coach-dashboard-panel-head').forEach(function (head) {
      head.classList.add('card-head');
    });
    document.querySelectorAll('.coach-dashboard-stat-grid,.coach-players-stat-grid').forEach(function (grid) {
      grid.classList.add('kpi-strip');
    });
  }

  function stripSensitiveDisplay() {
    var banned = /\b(email|e-mail|date of birth|dob|guardian|parent)\b/i;
    document.querySelectorAll('th,td,label,dt,span,small,p,div').forEach(function (node) {
      if (!node || node.closest('script,style')) return;
      if (node.children && node.children.length > 1 &&
          !/^(TH|TD|LABEL|DT)$/i.test(node.tagName || '')) return;
      var value = String(node.textContent || '').trim();
      if (!value || value.length > 80 || !banned.test(value)) return;
      if (node.closest('.privacy-copy,.legal-copy,.registration-copy,.concern-form,.report-concern')) return;
      var row = node.closest('tr,.form-group,.physical-metric,.profile-row,.detail-row,.value-factor-row');
      if (row) row.classList.add('coach-v2-sensitive-hidden');
    });
  }

  function installFunctionalFallbacks() {
    document.querySelectorAll('a[href="#"],a:not([href])').forEach(function (link) {
      if (link.dataset.coachV8Fallback) return;
      var label = String(link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
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
      else if (label.indexOf('player') >= 0 || label.indexOf('squad') >= 0) route = ROUTES['my-players'];
      if (route) {
        link.dataset.coachV8Fallback = '1';
        link.setAttribute('href', route);
      }
    });
  }

  function toast(message) {
    var existing = document.querySelector('.coach-v8-toast');
    if (existing) existing.remove();
    var node = document.createElement('div');
    node.className = 'coach-v8-toast';
    node.setAttribute('role', 'status');
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.remove();
    }, 3200);
  }

  function renderPlayerCard(player, options) {
    options = options || {};
    var name = (((player && player.first_name) || '') + ' ' +
      ((player && player.last_name) || '')).trim() || 'Player';
    var position = player && (
      player.specific_position || player.primary_position ||
      player.position_group
    ) || 'Position TBC';
    var rating = Number(player && player.overall_rating);
    rating = Number.isFinite(rating) ? Math.round(rating > 10 ? rating : rating * 10) : '--';
    var url = options.url || ROUTES.profile + '?id=' +
      encodeURIComponent(player && player.id || '');

    return '<article class="coach-player-card">' +
      '<div class="coach-player-top"><div class="coach-player-id">' +
      '<div class="coach-player-avatar">' + esc(initials(name)) + '</div>' +
      '<div class="coach-player-copy"><h4>' + esc(name) + '</h4><p>' +
      esc(player && player.age_group || 'Age group TBC') + ' · ' +
      esc(position) + '</p></div></div>' +
      '<div class="coach-player-rating">' + esc(rating) + '</div></div>' +
      '<div class="coach-player-actions"><a class="btn btn-primary" href="' +
      esc(url) + '">View profile</a></div></article>';
  }

  function installPublicApi() {
    window.CoachV2 = {
      refresh: refresh,
      renderPlayerCard: renderPlayerCard,
      pageKey: pageKey
    };
    window.renderCoachMobilePlayerCard = function (player) {
      return renderPlayerCard(player);
    };
    window.renderCoachMyPlayerCard = function (player, options) {
      return renderPlayerCard(player, options);
    };
  }

  function refresh() {
    if (!document.body || !isCoachPage()) return;
    var reconnect = !!observer;
    if (observer) observer.disconnect();

    try {
      loadStylesheet();
      setMode();

      document.body.classList.add(
        'coach-v2',
        'coach-v8',
        'coach-page-' + pageKey()
      );
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');

      shellClasses();
      installSidebar();
      installTopbar();
      installMobileHeader();
      installBottomNav();
      installMoreSheet();
      bindGlobalChrome();
      ensureHero();
      bindScrollActions();
      classifyCurrentComponents();
      enhanceDashboard();
      enhanceMyPlayers();
      enhancePitch();
      removeLiveMatchMode();
      enhanceChat();
      installFunctionalFallbacks();
      stripSensitiveDisplay();
    } finally {
      if (reconnect && observer && document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(function () {
      refreshQueued = false;
      refresh();
    });
  }

  function observe() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function (mutations) {
      var structural = mutations.some(function (mutation) {
        return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
          return node && node.nodeType === 1;
        });
      });
      if (structural) queueRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    installPublicApi();
    refresh();
    observe();
    [100, 350, 900, 1800, 3200].forEach(function (delay) {
      setTimeout(refresh, delay);
    });
  }

  installPublicApi();
  loadStylesheet();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('resize', function () {
    setMode();
    closeOverlays();
    queueRefresh();
  });
})();

/* ScoutLink Scout Experience V8
   Responsive shell, accessibility and safe route interactions.
   Existing Scout Intelligence API workflows remain the source of truth. */
(function () {
  'use strict';

  var ROUTES = [
    ['dashboard', 'DB', 'Dashboard', '/scout/dashboard', 'Core'],
    ['search', 'PS', 'Player search', '/scout/player-search', 'Core'],
    ['pipeline', 'MP', 'My pipeline', '/scout/pipeline', 'Core'],
    ['rankings', 'RK', 'Rankings', '/scout/rankings', 'Core'],
    ['fixtures', 'FX', 'Fixtures', '/scout/fixtures', 'Scouting tools'],
    ['predictions', 'PR', 'Predictions', '/scout/predictions', 'Scouting tools'],
    ['exports', 'EX', 'Exports', '/scout/exports', 'Scouting tools'],
    ['compare', 'CP', 'Compare players', '/scout/compare-players', 'Scouting tools'],
    ['setup', 'SS', 'Scout setup', '/scout/setup', 'Scouting tools'],
    ['events', 'EV', 'Events', '/scout/events', 'Network'],
    ['chat', 'CH', 'Chat', '/scout/chat', 'Network'],
    ['notifications', 'NT', 'Notifications', '/scout/notifications', 'Network'],
    ['concern', 'RC', 'Report a concern', '/scout/report-a-concern', 'Network'],
    ['usage', 'UR', 'Usage requests', '/scout/usage-requests', 'Account'],
    ['settings', 'ST', 'Settings', '/scout/settings', 'Account']
  ];

  var PATH_TO_ROUTE = {
    '/scout/onboarding': 'confirm',
    '/scout/dashboard': 'dashboard',
    '/scout/player-search': 'search',
    '/player/profile': 'profile',
    '/scout/pipeline': 'pipeline',
    '/scout/rankings': 'rankings',
    '/scout/fixtures': 'fixtures',
    '/scout/predictions': 'predictions',
    '/scout/usage-requests': 'usage',
    '/scout/exports': 'exports',
    '/scout/compare-players': 'compare',
    '/scout/setup': 'setup',
    '/scout/events': 'events',
    '/scout/chat': 'chat',
    '/scout/notifications': 'notifications',
    '/scout/report-a-concern': 'concern',
    '/scout/settings': 'settings'
  };

  var ROUTE_TITLES = {
    confirm: 'Scout onboarding',
    dashboard: 'Dashboard',
    search: 'Player search',
    profile: 'Player profile',
    pipeline: 'My pipeline',
    rankings: 'Rankings',
    fixtures: 'Fixtures',
    predictions: 'Predictions',
    usage: 'Usage requests',
    exports: 'Exports',
    compare: 'Compare players',
    setup: 'Scout setup',
    events: 'Events',
    chat: 'Chat',
    notifications: 'Notifications',
    concern: 'Report a concern',
    settings: 'Settings'
  };

  var ROUTE_BUTTONS = {
    'review compatible players': '/scout/player-search',
    'review top matches': '/scout/player-search',
    'view all players': '/scout/player-search',
    'view all new players': '/scout/player-search',
    'find players': '/scout/player-search',
    'find a player': '/scout/player-search',
    'explore players': '/scout/player-search',
    'open fixtures': '/scout/fixtures',
    'open pipeline': '/scout/pipeline',
    'usage requests': '/scout/usage-requests',
    'open usage requests': '/scout/usage-requests',
    'pipeline settings': '/scout/setup',
    'edit scout setup': '/scout/setup',
    'compare players': '/scout/compare-players',
    'event notifications': '/scout/notifications',
    'turn on alerts': '/scout/notifications',
    'return to dashboard': '/scout/dashboard'
  };

  var scheduled = false;
  var observer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function cleanPath() {
    return String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function routeId() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    return PATH_TO_ROUTE[cleanPath()] || '';
  }

  function routeTitle() {
    return ROUTE_TITLES[routeId()] || 'Scout workspace';
  }

  function rootNode() {
    return document.getElementById('scoutExperienceApp') ||
      document.querySelector('.usage-shell') ||
      document.querySelector('.scout-page');
  }

  function isMobile() {
    return window.matchMedia('(max-width:767px)').matches;
  }

  function currentHref(route) {
    var match = ROUTES.find(function (item) { return item[0] === route; });
    return match ? match[3] : '/scout/dashboard';
  }

  function drawerMarkup() {
    var current = routeId() === 'profile' ? 'search' : routeId();
    var groups = [];
    ROUTES.forEach(function (route) {
      if (groups.indexOf(route[4]) < 0) groups.push(route[4]);
    });

    return '<aside class="slv8-drawer" id="slv8Drawer" aria-hidden="true">' +
      '<header class="slv8-drawer-head"><a class="logo" href="/scout/dashboard">Scout<span>Link</span></a>' +
      '<button class="slv8-drawer-close" type="button" aria-label="Close menu" data-slv8-close>×</button></header>' +
      '<nav aria-label="Scout workspace">' +
      groups.map(function (group) {
        return '<div class="nav-label">' + esc(group) + '</div>' +
          ROUTES.filter(function (route) { return route[4] === group; }).map(function (route) {
            return '<a class="' + (route[0] === current ? 'active' : '') + '" href="' + route[3] + '">' +
              '<span>' + route[1] + '</span>' + esc(route[2]) + '</a>';
          }).join('');
      }).join('') +
      '</nav></aside><button class="slv8-drawer-backdrop" type="button" aria-label="Close menu" data-slv8-close></button>';
  }

  function ensureDrawer() {
    if (!document.getElementById('slv8Drawer')) {
      document.body.insertAdjacentHTML('beforeend', drawerMarkup());
    }
  }

  function ensureUsageMobileHeader() {
    if (!isMobile()) return;
    if (document.querySelector('.mobile-top,.slv8-mobile-header')) return;
    var workspace = document.querySelector('.usage-page .workspace');
    if (!workspace) return;
    workspace.insertAdjacentHTML(
      'afterbegin',
      '<header class="slv8-mobile-header"><a class="logo" href="/scout/dashboard">Scout<span>Link</span></a>' +
      '<strong>' + esc(routeTitle()) + '</strong>' +
      '<button class="slv8-menu-trigger" type="button" data-global-menu aria-expanded="false" aria-controls="slv8Drawer">Menu</button></header>'
    );
  }

  function menuButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-global-menu],.slv8-menu-trigger,.mobile-top button')
    ).filter(function (button) {
      return /menu|more/i.test(String(button.textContent || '')) ||
        button.hasAttribute('data-global-menu') ||
        button.classList.contains('slv8-menu-trigger');
    });
  }

  function setMenu(open) {
    ensureDrawer();
    var drawer = document.getElementById('slv8Drawer');
    var backdrop = document.querySelector('.slv8-drawer-backdrop');
    if (!drawer || !backdrop) return;

    drawer.classList.toggle('open', !!open);
    backdrop.classList.toggle('open', !!open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('slv8-menu-open', !!open);

    menuButtons().forEach(function (button) {
      button.setAttribute('aria-expanded', String(!!open));
      button.setAttribute('aria-controls', 'slv8Drawer');
    });

    if (open) {
      var close = drawer.querySelector('[data-slv8-close]');
      if (close) close.focus();
    }
  }

  function bindMenu() {
    ensureDrawer();
    menuButtons().forEach(function (button) {
      if (button.dataset.slv8MenuBound === '1') return;
      button.dataset.slv8MenuBound = '1';
      button.setAttribute('type', 'button');
      button.setAttribute('aria-label', 'Open Scout navigation');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        var drawer = document.getElementById('slv8Drawer');
        setMenu(!(drawer && drawer.classList.contains('open')));
      });
    });

    document.querySelectorAll('[data-slv8-close]').forEach(function (button) {
      if (button.dataset.slv8CloseBound === '1') return;
      button.dataset.slv8CloseBound = '1';
      button.addEventListener('click', function () { setMenu(false); });
    });

    var drawer = document.getElementById('slv8Drawer');
    if (drawer && drawer.dataset.slv8LinksBound !== '1') {
      drawer.dataset.slv8LinksBound = '1';
      drawer.addEventListener('click', function (event) {
        if (event.target.closest('a')) setMenu(false);
      });
    }
  }

  function ensureMobileBottom() {
    if (!isMobile()) return;
    var root = rootNode();
    if (!root || root.querySelector('.mobile-bottom,.mobile-nav')) return;

    var current = routeId() === 'profile' ? 'search' : routeId();
    var links = [
      ['dashboard', 'HM', 'Home'],
      ['search', 'PS', 'Search'],
      ['pipeline', 'MP', 'Pipeline'],
      ['chat', 'CH', 'Chat'],
      ['more', 'MR', 'More']
    ];

    root.insertAdjacentHTML(
      'beforeend',
      '<nav class="mobile-bottom" aria-label="Scout mobile navigation">' +
      links.map(function (item) {
        if (item[0] === 'more') {
          return '<button class="bottom-link ' +
            (['rankings','fixtures','predictions','usage','exports','compare','setup','events','notifications','concern','settings'].indexOf(current) >= 0 ? 'active' : '') +
            '" type="button" data-global-menu><i>' + item[1] + '</i>' + item[2] + '</button>';
        }
        return '<a class="bottom-link ' + (item[0] === current ? 'active' : '') +
          '" href="' + currentHref(item[0]) + '"><i>' + item[1] + '</i>' + item[2] + '</a>';
      }).join('') +
      '</nav>'
    );
  }

  function decorateTables() {
    document.querySelectorAll('table').forEach(function (table) {
      var headings = Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function (heading) {
        return String(heading.textContent || '').trim();
      });
      table.querySelectorAll('tbody tr').forEach(function (row) {
        Array.prototype.slice.call(row.children).forEach(function (cell, index) {
          if (!cell.getAttribute('data-label')) {
            cell.setAttribute('data-label', headings[index] || 'Detail');
          }
        });
      });
    });
  }

  function ensureMobileFilters() {
    var route = routeId();
    if (route !== 'search' && route !== 'rankings') return;

    var workbench = document.querySelector('.search-workbench,.filter-workbench,.rank-filters');
    if (!workbench || workbench.querySelector('.slv8-mobile-filter-toggle')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn slv8-mobile-filter-toggle';
    button.textContent = 'Open football filters';
    button.setAttribute('aria-expanded', 'false');

    workbench.insertBefore(button, workbench.firstChild);
    if (isMobile()) workbench.classList.add('slv8-filters-collapsed');

    button.addEventListener('click', function () {
      var collapsed = workbench.classList.toggle('slv8-filters-collapsed');
      button.textContent = collapsed ? 'Open football filters' : 'Close football filters';
      button.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  function modal(title, copy) {
    var node = document.createElement('div');
    node.className = 'slv8-info-modal';
    node.innerHTML = '<article role="dialog" aria-modal="true" aria-labelledby="slv8InfoTitle">' +
      '<h2 id="slv8InfoTitle">' + esc(title) + '</h2><p>' + esc(copy) + '</p>' +
      '<button class="btn primary" type="button" data-slv8-modal-close>Close</button></article>';
    document.body.appendChild(node);

    function close() {
      node.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
    }

    node.addEventListener('click', function (event) {
      if (event.target === node || event.target.closest('[data-slv8-modal-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    var closeButton = node.querySelector('[data-slv8-modal-close]');
    if (closeButton) closeButton.focus();
  }

  function safeRouteButtons() {
    document.querySelectorAll('button').forEach(function (button) {
      var label = String(button.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (ROUTE_BUTTONS[label] && !button.dataset.slv8Route) {
        button.dataset.slv8Route = ROUTE_BUTTONS[label];
      }

      if (label === 'how predictions work' && button.dataset.slv8InfoBound !== '1') {
        button.dataset.slv8InfoBound = '1';
        button.addEventListener('click', function () {
          modal(
            'How ScoutLink predictions work',
            'Predictions use the selected player profile, available Match Facts and the inputs chosen by the Scout. They support a football decision but do not replace live observation, club judgement or safeguarding checks.'
          );
        });
      }
    });

    document.querySelectorAll('[data-slv8-route]').forEach(function (button) {
      if (button.dataset.slv8RouteBound === '1') return;
      button.dataset.slv8RouteBound = '1';
      button.addEventListener('click', function () {
        window.location.assign(button.dataset.slv8Route);
      });
    });
  }

  function decorateNavigation() {
    document.querySelectorAll('.logo,.side-logo .logo').forEach(function (logo) {
      if (logo.tagName.toLowerCase() === 'a' && !logo.getAttribute('href')) {
        logo.setAttribute('href', '/scout/dashboard');
      }
    });

    var usageLink = document.querySelector('.side-nav a[href="/scout/usage-requests"]');
    if (!usageLink) {
      var settings = document.querySelector('.side-nav a[href="/scout/settings"]');
      if (settings) {
        settings.insertAdjacentHTML(
          'beforebegin',
          '<a class="side-link ' + (routeId() === 'usage' ? 'active' : '') +
          '" href="/scout/usage-requests"><span class="side-icon">UR</span>Usage requests</a>'
        );
      }
    }
  }

  function decorate() {
    var root = rootNode();
    if (!root) return;

    document.body.classList.add('scout-v8-ready');
    root.classList.add('scout-v8');

    ensureUsageMobileHeader();
    ensureDrawer();
    ensureMobileBottom();
    bindMenu();
    decorateTables();
    ensureMobileFilters();
    decorateNavigation();
    safeRouteButtons();

    root.removeAttribute('aria-busy');
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      decorate();
    }, 50);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) setMenu(false);
    scheduleDecorate();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleDecorate);
  } else {
    scheduleDecorate();
  }

  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}());

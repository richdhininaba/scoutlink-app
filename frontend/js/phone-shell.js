'use strict';

(function () {
  var MOBILE_QUERY = '(max-width: 950px), ((hover: none) and (pointer: coarse) and (max-width: 1024px))';
  var COARSE_QUERY = '(hover: none) and (pointer: coarse)';
  var mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: window.innerWidth <= 950 };
  var coarseMq = window.matchMedia ? window.matchMedia(COARSE_QUERY) : { matches: false };
  var historyOpen = false;

  function isPhone() {
    return mq.matches || window.innerWidth <= 950 || (coarseMq.matches && window.innerWidth <= 1024);
  }

  function cleanHref(href) {
    if (typeof window.cleanRouteFor === 'function') return window.cleanRouteFor(href);
    return href;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getAuth() {
    var Auth = window.Auth || {};
    var user = Auth.user || null;
    var role = Auth.type || localStorage.getItem('sl_type') || roleFromPath();
    return { user: user, role: role };
  }

  function roleFromPath() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('/coach') > -1 || path.indexOf('coach-') > -1 || path.indexOf('add-player') > -1 || path.indexOf('bulk-add') > -1 || path.indexOf('match-facts') > -1) return 'Coach';
    if (path.indexOf('/scout') > -1 || path.indexOf('scout-') > -1 || path.indexOf('player-search') > -1 || path.indexOf('compare-players') > -1) return 'Scout';
    if (path.indexOf('/player') > -1 || path.indexOf('player-') > -1) return 'Player';
    if (path.indexOf('/stratex') > -1 || path.indexOf('stratex-') > -1 || path.indexOf('experience-select') > -1) return 'Stratex';
    return 'Coach';
  }

  function pageTitle() {
    var topbar = document.querySelector('.topbar-title');
    var raw = topbar && topbar.textContent ? topbar.textContent.trim() : '';
    if (!raw) raw = (document.title || 'ScoutLink').replace(/\s*-\s*ScoutLink.*/i, '').replace(/\s*-\s*Stratex.*/i, '');
    raw = raw.replace(/^Welcome back,\s*/i, '').replace(/^Welcome,\s*/i, '');
    raw = raw.replace(/dashboard/i, '').trim() || roleFromPath();
    if (raw.length > 22) raw = raw.slice(0, 21).trim() + '...';
    return raw;
  }

  function initials(user) {
    if (typeof window.initials === 'function') return window.initials(user && user.firstName, user && user.lastName) || 'SL';
    return (((user && user.firstName || '')[0] || 'S') + ((user && user.lastName || '')[0] || 'L')).toUpperCase();
  }

  function icon(name) {
    var paths = {
      grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
      users: '<path d="M16 20c0-3-2.7-5-6-5s-6 2-6 5"/><circle cx="10" cy="8" r="4"/><path d="M20 19c0-2.3-1.5-4-3.7-4.7"/><path d="M16 5.2a3.3 3.3 0 0 1 0 5.6"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
      clipboard: '<path d="M9 5h6"/><path d="M9 3h6v4H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/>',
      calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>',
      video: '<rect x="4" y="6" width="12" height="12" rx="2"/><path d="M16 10l4-2v8l-4-2"/>',
      message: '<path d="M5 19l3-2h9a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
      settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 .9-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
      heart: '<path d="M20 12l-8 8-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6z"/>',
      trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M5 8H3a2 2 0 0 0 0 4h2"/><path d="M19 8h2a2 2 0 0 1 0 4h-2"/>',
      chart: '<path d="M4 19h16"/><path d="M4 15l4-5 4 3 5-8 3 4"/>',
      download: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
      compare: '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>',
      target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>',
      flag: '<path d="M5 21V5"/><path d="M5 5c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
      file: '<path d="M14 3v5h5"/><path d="M6 3h8l5 5v13H6z"/>',
      box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/>',
      org: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="4" y="16" width="6" height="5" rx="1"/><rect x="14" y="16" width="6" height="5" rx="1"/><path d="M12 8v4"/><path d="M7 16v-4h10v4"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
      ball: '<circle cx="12" cy="12" r="9"/><path d="M8 5l4 3 4-3"/><path d="M8 19l4-3 4 3"/><path d="M5 10l4 2-1 5"/><path d="M19 10l-4 2 1 5"/>',
      coach: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2"/>',
      star: '<path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9z"/>',
      home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
      award: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '<circle cx="12" cy="12" r="8"/>') + '</svg>';
  }

  function navItems(role) {
    var routes = window.PhoneRoutes || {};
    var items = routes[role] || routes[roleFromPath()] || [];
    if (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) {
      return items.filter(function (item) {
        var label = String(item.label || '').toLowerCase();
        var href = String(item.href || '').toLowerCase();
        return label !== 'settings' && href.indexOf('settings') === -1;
      });
    }
    return items;
  }

  function activeHref(item) {
    var current = window.location.pathname.toLowerCase();
    var clean = cleanHref(item.href).toLowerCase();
    var file = item.href.toLowerCase();
    return current === clean || current.endsWith('/' + file) || current.indexOf(clean) === 0;
  }

  function buildHeader(auth) {
    var header = document.getElementById('phoneHeader');
    if (!header) {
      header = document.createElement('header');
      header.id = 'phoneHeader';
      document.body.insertBefore(header, document.body.firstChild);
    }
    header.innerHTML =
      '<button id="phoneMenuButton" class="phone-menu-button" type="button" aria-label="Open menu"><span></span><span></span><span></span></button>' +
      '<div class="phone-title" id="phonePageTitle">' + esc(pageTitle()) + '</div>' +
      '<button id="phoneNotifyButton" class="phone-notification-button" type="button" aria-label="Open notifications">' + icon('bell') + '<span class="phone-badge" id="phoneNotifBadge"></span></button>';
  }

  function buildMenu(auth) {
    var backdrop = document.getElementById('phoneBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'phoneBackdrop';
      backdrop.hidden = true;
      document.body.appendChild(backdrop);
    }
    var menu = document.getElementById('phoneMenu');
    if (!menu) {
      menu = document.createElement('aside');
      menu.id = 'phoneMenu';
      menu.hidden = true;
      document.body.appendChild(menu);
    }
    var user = auth.user || {};
    var role = auth.role || roleFromPath();
    var name = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || role + ' user';
    var demo = typeof window.isDemoMode === 'function' && window.isDemoMode();
    var publicDemo = typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
    var switchLabel = publicDemo ? 'Exit demo' : (demo ? 'Switch demo' : 'Switch experience');
    var nav = navItems(role).map(function (n) {
      return '<a class="' + (activeHref(n) ? 'active' : '') + '" href="' + esc(cleanHref(n.href)) + '"><span class="phone-nav-icon">' + icon(n.icon) + '</span><span>' + esc(n.label) + '</span></a>';
    }).join('');
    menu.innerHTML =
      '<div class="phone-menu-head"><div class="phone-brand">Scout<span>Link</span></div><button class="phone-menu-close" id="phoneMenuClose" type="button" aria-label="Close menu">&times;</button></div>' +
      '<div class="phone-user-card"><div class="phone-avatar">' + esc(initials(user)) + '</div><div><div class="phone-user-name">' + esc(name) + '</div><div class="phone-user-role">' + esc(role + (demo ? ' demo' : '')) + '</div></div></div>' +
      '<nav class="phone-nav" aria-label="Mobile navigation">' + nav + '</nav>' +
      '<div class="phone-menu-footer">' +
      '<button type="button" class="phone-menu-action phone-switch" id="phoneSwitchExperience">' + icon('box') + '<span>' + esc(switchLabel) + '</span></button>' +
      '<button type="button" class="phone-menu-action phone-signout" id="phoneSignOut">' + icon('settings') + '<span>' + (publicDemo ? 'Exit demo' : 'Sign out') + '</span></button>' +
      '</div>';
  }

  function openMenu() {
    var menu = document.getElementById('phoneMenu');
    var backdrop = document.getElementById('phoneBackdrop');
    if (!menu || !backdrop) return;
    menu.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      document.body.classList.add('phone-menu-open');
    });
    if (!historyOpen && isPhone()) {
      try {
        history.pushState({ phoneMenuOpen: true }, '');
        historyOpen = true;
      } catch (_) {}
    }
  }

  function closeMenu(skipHistory) {
    document.body.classList.remove('phone-menu-open');
    window.setTimeout(function () {
      if (!document.body.classList.contains('phone-menu-open')) {
        var menu = document.getElementById('phoneMenu');
        var backdrop = document.getElementById('phoneBackdrop');
        if (menu) menu.hidden = true;
        if (backdrop) backdrop.hidden = true;
      }
    }, 230);
    if (!skipHistory && historyOpen) {
      historyOpen = false;
      try { history.back(); } catch (_) {}
    } else if (skipHistory) {
      historyOpen = false;
    }
  }

  function wire(auth) {
    var menuButton = document.getElementById('phoneMenuButton');
    var notify = document.getElementById('phoneNotifyButton');
    var close = document.getElementById('phoneMenuClose');
    var backdrop = document.getElementById('phoneBackdrop');
    var switcher = document.getElementById('phoneSwitchExperience');
    var signOut = document.getElementById('phoneSignOut');
    if (menuButton) menuButton.addEventListener('click', openMenu);
    if (close) close.addEventListener('click', function () { closeMenu(); });
    if (backdrop) backdrop.addEventListener('click', function () { closeMenu(); });
    if (notify) notify.addEventListener('click', function () {
      var original = document.getElementById('notifToggleBtn') || document.querySelector('.notif-btn');
      if (original && original !== notify) original.click();
      else if (typeof window.toggleNotifPanel === 'function') window.toggleNotifPanel();
    });
    if (switcher) switcher.addEventListener('click', function () {
      closeMenu(true);
      if (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode() && typeof window.exitPublicDemo === 'function') {
        window.exitPublicDemo();
        return;
      }
      if (typeof window.openExperienceSelector === 'function') window.openExperienceSelector();
      else window.location.href = cleanHref('experience-select.html');
    });
    if (signOut) signOut.addEventListener('click', function () {
      closeMenu(true);
      if (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode() && typeof window.exitPublicDemo === 'function') {
        window.exitPublicDemo();
        return;
      }
      if (window.Auth && typeof window.Auth.clear === 'function') window.Auth.clear();
      window.location.href = cleanHref('login.html?logout=1');
    });
    document.querySelectorAll('#phoneMenu a[href]').forEach(function (a) {
      a.addEventListener('click', function () { closeMenu(true); });
    });
  }

  function syncBadge() {
    var desktop = document.getElementById('notifBadge');
    var phone = document.getElementById('phoneNotifBadge');
    if (!phone) return;
    var val = desktop ? String(desktop.textContent || '').trim() : '';
    phone.textContent = val || '';
    phone.style.display = val && val !== '0' ? 'flex' : 'none';
  }

  function mount() {
    var hasDashboard = !!document.querySelector('.dashboard');
    if (!hasDashboard) return;
    document.body.classList.add('phone-dashboard');
    var auth = getAuth();
    buildHeader(auth);
    buildMenu(auth);
    wire(auth);
    syncBadge();
    var observer = new MutationObserver(syncBadge);
    var badge = document.getElementById('notifBadge');
    if (badge) observer.observe(badge, { childList: true, subtree: true, attributes: true });
    if (window.PhonePages && typeof window.PhonePages.refresh === 'function') window.PhonePages.refresh();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('phone-menu-open')) closeMenu();
  });

  window.addEventListener('popstate', function () {
    if (document.body.classList.contains('phone-menu-open')) closeMenu(true);
  });

  window.addEventListener('resize', function () {
    if (!isPhone() && document.body.classList.contains('phone-menu-open')) closeMenu(true);
  });

  window.ScoutLinkPhoneShell = {
    mount: mount,
    openMenu: openMenu,
    closeMenu: closeMenu,
    isPhone: isPhone,
    icon: icon
  };

  document.addEventListener('DOMContentLoaded', mount);
})();

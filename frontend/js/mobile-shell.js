'use strict';

/* Deterministic ScoutLink phone shell. Mobile breakpoint: <=767px. */
(function () {
  var mounted = false;
  var menuReady = false;

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  }

  function loggedInPage() {
    return !!document.querySelector('.dashboard-main') && !!document.querySelector('.sidebar');
  }

  function text(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initialsFromUser(user) {
    user = user || {};
    var first = user.firstName || user.first_name || '';
    var last = user.lastName || user.last_name || '';
    var raw = (first.charAt(0) + last.charAt(0)) || 'SL';
    return raw.toUpperCase();
  }

  function role() {
    return window.MobileNavigation ? MobileNavigation.currentRole() : ((window.Auth && Auth.type) || localStorage.getItem('sl_type') || '');
  }

  function titleFromPage() {
    var top = document.querySelector('.topbar-title');
    var txt = top && top.textContent ? top.textContent.trim() : '';
    if (!txt) txt = (document.title || 'ScoutLink').replace(/\s*-\s*ScoutLink.*$/i, '').trim();
    return txt || 'ScoutLink';
  }

  function closeMenu() {
    var drawer = document.getElementById('mobileMenuDrawer');
    var backdrop = document.getElementById('mobileMenuBackdrop');
    var button = document.getElementById('mobileMenuButton');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    if (button) button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-menu-open');
  }

  function openMenu() {
    ensureMenu();
    var drawer = document.getElementById('mobileMenuDrawer');
    var backdrop = document.getElementById('mobileMenuBackdrop');
    var button = document.getElementById('mobileMenuButton');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    if (button) button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-menu-open');
  }

  function toggleMenu() {
    var drawer = document.getElementById('mobileMenuDrawer');
    if (drawer && drawer.classList.contains('active')) closeMenu();
    else openMenu();
  }

  function currentUser() {
    return (window.Auth && Auth.user) || {};
  }

  function userName(user) {
    user = user || {};
    return ([user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || user.email || 'ScoutLink user').trim();
  }

  function isActiveHref(href) {
    var clean = window.MobileNavigation ? MobileNavigation.routeFor(href) : href;
    var path = window.location.pathname.replace(/\/$/, '');
    return path === clean || path.endsWith('/' + clean.replace(/\.html$/, '').replace(/^.*\//, ''));
  }

  function menuLinks() {
    var r = role();
    var items = window.MobileNavigation ? MobileNavigation.navItems(r) : [];
    return items.map(function (item) {
      var href = MobileNavigation.routeFor(item.href);
      return '<a class="mobile-menu-link' + (isActiveHref(item.href) ? ' active' : '') + '" href="' + text(href) + '">' +
        '<span class="mobile-menu-link-icon" aria-hidden="true">' + text(item.icon) + '</span>' +
        '<span>' + text(item.label) + '</span>' +
        '</a>';
    }).join('');
  }

  function ensureMenu() {
    var user = currentUser();
    var r = role() || 'User';
    var demo = (typeof isDemoMode === 'function' && isDemoMode()) || localStorage.getItem('sl_demo_mode') === '1';

    var backdrop = document.getElementById('mobileMenuBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mobileMenuBackdrop';
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    var drawer = document.getElementById('mobileMenuDrawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'mobileMenuDrawer';
      drawer.className = 'mobile-menu-drawer';
      drawer.setAttribute('aria-label', 'Mobile navigation menu');
      document.body.appendChild(drawer);
    }

    var switchAction = '';
    if (r === 'Stratex' || demo || localStorage.getItem('sl_experience_switcher') === '1') {
      switchAction = '<button class="mobile-menu-action" id="mobileSwitchExperience" type="button">' + (demo ? 'Switch demo' : 'Switch experience') + '</button>';
    }

    drawer.innerHTML =
      '<div class="mobile-menu-head">' +
      '<a class="mobile-brand" href="/">Scout<span>Link</span></a>' +
      '<button class="mobile-menu-close" id="mobileMenuClose" type="button" aria-label="Close navigation menu">x</button>' +
      '</div>' +
      '<div class="mobile-user-card">' +
      '<div class="mobile-avatar">' + text(initialsFromUser(user)) + '</div>' +
      '<div><div class="mobile-user-name">' + text(userName(user)) + '</div>' +
      '<div class="mobile-user-role">' + text(r) + (demo ? ' - Demo' : '') + '</div></div>' +
      '</div>' +
      '<nav class="mobile-menu-nav">' + menuLinks() + '</nav>' +
      '<div class="mobile-menu-foot">' + switchAction +
      '<button class="mobile-menu-action mobile-menu-signout" id="mobileSignout" type="button">Sign out</button>' +
      '</div>';

    if (!menuReady) {
      menuReady = true;
      backdrop.addEventListener('click', closeMenu);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
      window.addEventListener('resize', function () {
        if (!isMobile()) closeMenu();
      });
    }

    drawer.querySelector('#mobileMenuClose').addEventListener('click', closeMenu);
    drawer.querySelectorAll('.mobile-menu-link').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    var signout = drawer.querySelector('#mobileSignout');
    if (signout) signout.addEventListener('click', function () {
      closeMenu();
      if (typeof logout === 'function') logout();
      else if (typeof logoutToLogin === 'function') logoutToLogin();
      else {
        if (window.Auth && Auth.clear) Auth.clear();
        window.location.href = '/login?logout=1';
      }
    });
    var sw = drawer.querySelector('#mobileSwitchExperience');
    if (sw) sw.addEventListener('click', function () {
      closeMenu();
      if (typeof openExperienceSelector === 'function') openExperienceSelector();
      else window.location.href = '/experience-select';
    });
  }

  function notificationHtml() {
    var hasPanel = typeof toggleNotifPanel === 'function' || document.getElementById('notifPanel');
    if (!hasPanel) return '<span></span>';
    return '<button class="mobile-header-action" id="mobileNotifButton" type="button" aria-label="Open notifications">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '<span class="notif-badge" id="mobileNotifBadge" style="display:none">0</span></button>';
  }

  function syncBadge() {
    var source = document.querySelector('.topbar .notif-badge, #notifBadge');
    var target = document.getElementById('mobileNotifBadge');
    if (!source || !target) return;
    target.textContent = source.textContent || '0';
    target.style.display = source.style.display === 'none' || !source.textContent ? 'none' : source.style.display || 'inline-flex';
  }

  function mountHeader() {
    if (!loggedInPage()) return false;
    var main = document.querySelector('.dashboard-main') || document.body;
    var header = document.getElementById('mobileHeader');
    if (!header) {
      header = document.createElement('header');
      header.id = 'mobileHeader';
      header.className = 'mobile-header';
      main.insertBefore(header, main.firstChild);
    }
    header.innerHTML =
      '<button class="mobile-menu-button" id="mobileMenuButton" type="button" aria-label="Open navigation menu" aria-expanded="false"><span></span></button>' +
      '<div class="mobile-title-wrap"><div class="mobile-page-title">' + text(titleFromPage()) + '</div><div class="mobile-page-subtitle">' + text(role()) + '</div></div>' +
      notificationHtml();

    header.querySelector('#mobileMenuButton').addEventListener('click', toggleMenu);
    var nb = header.querySelector('#mobileNotifButton');
    if (nb) nb.addEventListener('click', function () {
      if (typeof toggleNotifPanel === 'function') toggleNotifPanel();
      else {
        var panel = document.getElementById('notifPanel');
        if (panel) panel.classList.toggle('open');
      }
    });
    syncBadge();
    document.body.classList.add('has-mobile-shell');
    mounted = true;
    return true;
  }

  function hideMobileHeaderOnPublic() {
    if (!loggedInPage()) document.body.classList.remove('has-mobile-shell');
  }

  function init() {
    hideMobileHeaderOnPublic();
    if (!loggedInPage()) return;
    mountHeader();
    ensureMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 40); });
  } else {
    setTimeout(init, 40);
  }

  if (window.MutationObserver) {
    var obsTimer = null;
    new MutationObserver(function () {
      clearTimeout(obsTimer);
      obsTimer = setTimeout(function () {
        if (!mounted || isMobile()) init();
        syncBadge();
      }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  window.ScoutLinkMobileShell = {
    init: init,
    open: openMenu,
    close: closeMenu,
    isMobile: isMobile
  };
})();

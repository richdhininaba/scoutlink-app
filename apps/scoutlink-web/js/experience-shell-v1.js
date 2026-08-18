'use strict';

/*
 * ScoutLink shared experience shell.
 *
 * Coach keeps ownership of its Desk / Field geometry. This file only:
 * - applies the shared non-Coach experience body classes;
 * - keeps public-demo chrome consistent across Coach and Scout;
 * - loads the public-demo banner design layer when a public demo is active.
 */
(function () {
  if (window.__experienceShellNoCoachV2) return;
  window.__experienceShellNoCoachV2 = true;

  var DEMO_CSS_ID = 'publicDemoBannerV2Css';
  var DEMO_CSS_HREF = '/css/public-demo-banner-v2.css?v=20260818-1';
  var observedRoots = new WeakSet();
  var scanQueued = false;

  function role() {
    try {
      return String(
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') ||
        (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        ''
      ).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function path() {
    return String(window.location.pathname || '').toLowerCase();
  }

  function isPublicDemo() {
    try {
      return (
        (typeof window.isPublicDemoMode === 'function' &&
          window.isPublicDemoMode()) ||
        sessionStorage.getItem('sl_public_demo') === '1'
      );
    } catch (_) {
      return false;
    }
  }

  function roots() {
    var result = [document];
    var visited = new Set();

    function visit(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);

      var nodes = root.querySelectorAll
        ? root.querySelectorAll('*')
        : [];

      Array.prototype.forEach.call(nodes, function (node) {
        if (node.shadowRoot) {
          result.push(node.shadowRoot);
          visit(node.shadowRoot);
        }
      });
    }

    visit(document);
    return result;
  }

  function ensureDemoCss(root) {
    if (!isPublicDemo() || !root) return;

    if (root === document) {
      if (document.getElementById(DEMO_CSS_ID)) return;

      var link = document.createElement('link');
      link.id = DEMO_CSS_ID;
      link.rel = 'stylesheet';
      link.href = DEMO_CSS_HREF;
      (document.head || document.documentElement).appendChild(link);
      return;
    }

    if (
      root.querySelector &&
      root.querySelector('link[data-public-demo-banner-v2]')
    ) {
      return;
    }

    if (!root.appendChild) return;

    var shadowLink = document.createElement('link');
    shadowLink.rel = 'stylesheet';
    shadowLink.href = DEMO_CSS_HREF;
    shadowLink.setAttribute('data-public-demo-banner-v2', '1');
    root.appendChild(shadowLink);
  }

  function clearPublicDemoForRegistration() {
    try {
      if (
        window.ScoutLinkDemoSessionBoundary &&
        typeof window.ScoutLinkDemoSessionBoundary.clearDemo === 'function'
      ) {
        window.ScoutLinkDemoSessionBoundary.clearDemo();
        return;
      }
    } catch (_) {}

    try {
      [
        'sl_public_demo',
        'sl_public_demo_role',
        'sl_public_demo_state',
        'sl_public_demo_seed_players',
        'sl_public_demo_started_at',
        'sl_heap_demo_sid'
      ].forEach(function (key) {
        sessionStorage.removeItem(key);
      });
    } catch (_) {}

    try {
      localStorage.removeItem('sl_demo_mode');

      var token = localStorage.getItem('sl_token');
      var user = null;

      try {
        user = JSON.parse(localStorage.getItem('sl_user') || 'null');
      } catch (_) {}

      var userId =
        user &&
        (user.id || user.userId || user.user_id);

      var temporaryDemoIdentity =
        token === 'public-demo-session' ||
        /^demo-/i.test(String(userId || ''));

      if (temporaryDemoIdentity) {
        ['sl_token', 'sl_user', 'sl_type'].forEach(function (key) {
          localStorage.removeItem(key);
        });
      }
    } catch (_) {}
  }

  function bannerMarkup() {
    return (
      '<div class="public-demo-main">' +
        '<span class="public-demo-badge">Public demo</span>' +
        '<span class="public-demo-copy">' +
          'You are currently in a public demo. ' +
          'All players, teams and records shown here are fictional.' +
        '</span>' +
      '</div>' +
      '<div class="public-demo-cta">' +
        '<a class="public-demo-access" href="/register">Register</a>' +
        '<button type="button" class="public-demo-exit">Exit demo</button>' +
      '</div>'
    );
  }

  function wireBanner(banner) {
    if (!banner) return;

    var register = banner.querySelector('.public-demo-access');
    if (register) {
      register.setAttribute('href', '/register');
      register.addEventListener('click', function (event) {
        event.preventDefault();
        clearPublicDemoForRegistration();
        window.location.href = '/register';
      });
    }

    var exit = banner.querySelector('.public-demo-exit');
    if (exit) {
      exit.addEventListener('click', function (event) {
        event.preventDefault();

        if (typeof window.exitPublicDemo === 'function') {
          window.exitPublicDemo();
          return;
        }

        clearPublicDemoForRegistration();
        window.location.href = '/demo';
      });
    }
  }

  function normaliseBanner(banner) {
    if (!banner || !isPublicDemo()) return;
    if (banner.dataset.slpdBannerV2Ready === '1') return;

    banner.id = 'publicDemoBanner';
    banner.classList.add(
      'public-demo-banner',
      'slpd-banner-v2',
      'slwf-demo-banner'
    );
    banner.setAttribute('aria-label', 'Public demo notice');
    banner.setAttribute('role', 'region');
    banner.removeAttribute('data-slwf-demo-banner');
    banner.innerHTML = bannerMarkup();
    banner.dataset.slpdBannerV2Ready = '1';
    wireBanner(banner);
  }

  function createFallbackBanner() {
    if (!isPublicDemo()) return null;

    var existing = document.getElementById('publicDemoBanner');
    if (existing) return existing;

    var scoutRoot = document.getElementById('scoutExperienceApp');
    var scoutWorkspace =
      scoutRoot &&
      scoutRoot.querySelector('.workspace');

    if (
      (role() === 'scout' || path().indexOf('/scout') === 0) &&
      scoutRoot &&
      !scoutWorkspace
    ) {
      return null;
    }

    var host =
      scoutWorkspace ||
      document.querySelector('.dashboard-main') ||
      document.querySelector('.page-content') ||
      document.body;

    if (!host || !host.insertBefore) return null;

    var banner = document.createElement('aside');
    normaliseBanner(banner);

    var topbar =
      host.querySelector
        ? (
            host.querySelector('.workspace-top') ||
            host.querySelector('.topbar')
          )
        : null;

    if (topbar && topbar.parentNode === host) {
      host.insertBefore(banner, topbar.nextSibling);
    } else {
      host.insertBefore(banner, host.firstChild);
    }

    return banner;
  }

  function removeRetiredScoutDemoBanners(root) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll(
      '.slwf-demo-banner[data-slwf-demo-banner], ' +
      '[data-slwf-demo-banner]'
    ).forEach(function (banner) {
      if (
        banner.id === 'publicDemoBanner' ||
        banner.classList.contains('slpd-banner-v2')
      ) {
        return;
      }

      /*
       * Keep the node in place so the existing Scout runtime regards its
       * banner as mounted, but the V2 stylesheet suppresses it. This prevents
       * the Scout runtime from continuously recreating a second banner.
       */
      if (!banner.classList.contains('slpd-retired-demo-banner')) {
        banner.classList.add('slpd-retired-demo-banner');
        banner.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function normalisePublicDemoChrome() {
    if (!document.body) return;

    if (!isPublicDemo()) {
      document.body.classList.remove('public-demo-banner-v2-active');
      return;
    }

    document.body.classList.add('public-demo-banner-v2-active');

    var allRoots = roots();

    allRoots.forEach(function (root) {
      ensureDemoCss(root);
      removeRetiredScoutDemoBanners(root);

      if (!root.querySelectorAll) return;

      root.querySelectorAll('#publicDemoBanner').forEach(function (banner) {
        normaliseBanner(banner);
      });

      observeRoot(root);
    });

    if (!document.getElementById('publicDemoBanner')) {
      createFallbackBanner();
    }
  }

  function applyExperienceClass() {
    if (!document.body) return;

    document.body.classList.remove(
      'experience-shell-coach',
      'experience-shell-scout',
      'experience-shell-player',
      'experience-shell-stratex'
    );

    var currentPath = path();
    var currentRole = role();

    if (
      currentPath.indexOf('/coach') === 0 ||
      currentRole === 'coach'
    ) {
      /*
       * Intentionally do not apply shared shell geometry to Coach.
       * Coach Desk / Coach Field continue to own themselves.
       */
      normalisePublicDemoChrome();
      return;
    }

    if (
      currentPath.indexOf('/scout') === 0 ||
      currentRole === 'scout'
    ) {
      document.body.classList.add('experience-shell-scout');
    } else if (
      currentPath.indexOf('/player') === 0 ||
      currentRole === 'player'
    ) {
      document.body.classList.add('experience-shell-player');
    } else if (
      currentPath.indexOf('/stratex') === 0 ||
      currentPath.indexOf('/admin') === 0 ||
      currentRole === 'stratex'
    ) {
      document.body.classList.add('experience-shell-stratex');
    }

    normalisePublicDemoChrome();
  }

  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;

    window.requestAnimationFrame(function () {
      scanQueued = false;
      applyExperienceClass();
    });
  }

  function observeRoot(root) {
    if (
      !root ||
      observedRoots.has(root) ||
      typeof MutationObserver === 'undefined'
    ) {
      return;
    }

    observedRoots.add(root);

    var observer = new MutationObserver(function () {
      scheduleScan();
    });

    observer.observe(
      root === document ? document.documentElement : root,
      {
        childList: true,
        subtree: true
      }
    );
  }

  function start() {
    observeRoot(document);
    applyExperienceClass();

    /*
     * main.js and the Scout renderer mount after different stages on different
     * routes. These short retries remove timing dependence without changing
     * either product runtime.
     */
    [50, 180, 500, 1200].forEach(function (delay) {
      window.setTimeout(scheduleScan, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('pageshow', scheduleScan);
  window.addEventListener('popstate', scheduleScan);
  window.addEventListener('storage', scheduleScan);
}());

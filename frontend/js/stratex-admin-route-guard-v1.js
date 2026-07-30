'use strict';

/*
 * Stratex Admin route and loading guard.
 *
 * Keeps navigation inside the single Admin shell, normalises the historical
 * nested Add User URL, and replaces abandoned loaders with a branded retry
 * state instead of leaving an infinite ScoutLink-style loading screen.
 */
(function () {
  var LOADER_LIMIT_MS = 15000;
  var CHECK_INTERVAL_MS = 1000;
  var originalPushState = history.pushState.bind(history);
  var originalReplaceState = history.replaceState.bind(history);

  function isAdminPath(value) {
    try {
      var url = new URL(String(value || ''), window.location.href);
      return url.pathname.indexOf('/admin') === 0 ||
        url.pathname.indexOf('/company/admin') === 0;
    } catch (_) {
      return false;
    }
  }

  function normaliseAdminUrl(value) {
    if (value === undefined || value === null || value === '') return value;
    try {
      var url = new URL(String(value), window.location.href);
      if (url.pathname === '/admin/users/add') {
        url.pathname = '/admin/admin-users';
      }
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return value;
    }
  }

  history.pushState = function (state, title, url) {
    return originalPushState(state, title, normaliseAdminUrl(url));
  };

  history.replaceState = function (state, title, url) {
    return originalReplaceState(state, title, normaliseAdminUrl(url));
  };

  function clearStalePublicDemo() {
    if (!isAdminPath(window.location.href)) return;
    try {
      [
        'sl_public_demo',
        'sl_public_demo_role',
        'sl_public_demo_state',
        'sl_public_demo_seed_players',
        'sl_public_demo_started_at'
      ].forEach(function (key) {
        sessionStorage.removeItem(key);
      });
    } catch (_) {}
  }

  function normaliseLinks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-nav="add-user"]').forEach(function (link) {
      if (link.tagName === 'A') link.setAttribute('href', '/admin/admin-users');
    });
  }

  function showAdminToast(message) {
    var existing = document.getElementById('stxAdminRouteToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'stxAdminRouteToast';
    toast.setAttribute('role', 'alert');
    toast.style.cssText =
      'position:fixed;right:18px;bottom:18px;z-index:10000;' +
      'max-width:390px;padding:13px 15px;border:1px solid #d7e2dd;' +
      'border-left:4px solid #08745b;border-radius:9px;background:#fff;' +
      'color:#07150f;box-shadow:0 14px 40px rgba(6,22,37,.16);' +
      'font:700 12px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;';
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 6500);
  }

  function replaceExpiredLoader(loader) {
    if (!loader || loader.dataset.stxRouteExpired === '1') return;
    loader.dataset.stxRouteExpired = '1';
    loader.innerHTML =
      '<div style="max-width:520px;margin:0 auto;padding:25px;' +
      'border:1px solid #d7e2dd;border-radius:12px;background:#fff;' +
      'text-align:center;color:#07150f">' +
        '<span style="display:inline-grid;width:42px;height:42px;' +
        'place-items:center;border-radius:10px;background:#08745b;' +
        'color:#fff;font-weight:950">SA</span>' +
        '<h3 style="margin:13px 0 0;font-size:17px">This Stratex section took too long to load.</h3>' +
        '<p style="margin:7px 0 0;color:#536a61;font-size:12px;line-height:1.5">' +
          'The Admin Centre is still available. Retry this section without leaving the secure workspace.' +
        '</p>' +
        '<button type="button" data-stx-retry style="min-height:41px;margin-top:15px;' +
        'padding:0 15px;border:0;border-radius:7px;background:#08745b;' +
        'color:#fff;font-weight:900;cursor:pointer">Retry section</button>' +
      '</div>';

    var retry = loader.querySelector('[data-stx-retry]');
    if (retry) {
      retry.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  function monitorLoaders() {
    document.querySelectorAll('.stx5-loading').forEach(function (loader) {
      if (!loader.dataset.stxStartedAt) {
        loader.dataset.stxStartedAt = String(Date.now());
        return;
      }
      var age = Date.now() - Number(loader.dataset.stxStartedAt || Date.now());
      if (age >= LOADER_LIMIT_MS) replaceExpiredLoader(loader);
    });

    var boot = document.getElementById('stxAdminBoot');
    if (boot && !boot.dataset.stxStartedAt) {
      boot.dataset.stxStartedAt = String(Date.now());
    } else if (boot) {
      var bootAge = Date.now() - Number(boot.dataset.stxStartedAt || Date.now());
      if (bootAge >= LOADER_LIMIT_MS) {
        var heading = boot.querySelector('h1');
        var copy = boot.querySelector('p');
        if (heading) heading.textContent = 'Stratex Admin needs a retry';
        if (copy) copy.textContent =
          'The secure Admin runtime did not finish starting. Refresh this page to try again.';
      }
    }
  }

  function installNavigationGuard() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest(
        '.stx5-shell a[data-nav],.stx5-mobile-bottom a[data-nav]'
      );
      if (!link) return;

      /*
       * Prevent the anchor from performing a separate document navigation.
       * Do not stop propagation: stratex-admin-v5.js receives the same event
       * and renders the selected module inside the existing Admin shell.
       */
      event.preventDefault();
    }, true);
  }

  function start() {
    clearStalePublicDemo();
    normaliseLinks(document);
    installNavigationGuard();

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) normaliseLinks(node);
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.setInterval(monitorLoaders, CHECK_INTERVAL_MS);
    monitorLoaders();
  }

  window.addEventListener('error', function (event) {
    if (!isAdminPath(window.location.href)) return;
    showAdminToast(
      'A Stratex Admin component could not finish loading. The current page remains available.'
    );
    if (window.console && console.error) {
      console.error('[Stratex Admin route guard]', event.error || event.message);
    }
  });

  window.addEventListener('unhandledrejection', function (event) {
    if (!isAdminPath(window.location.href)) return;
    showAdminToast(
      'A Stratex Admin data request did not complete. Retry the section if its records remain unavailable.'
    );
    if (window.console && console.error) {
      console.error('[Stratex Admin route guard]', event.reason);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());

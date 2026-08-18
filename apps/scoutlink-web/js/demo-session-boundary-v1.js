'use strict';

/*
 * ScoutLink public-demo / real-auth boundary.
 *
 * The current demo runtime uses a temporary localStorage identity because the
 * signed-in product reads Auth from localStorage. This boundary keeps that
 * temporary identity isolated from the real sign-in page and preserves a real
 * signed-in session while the user explores the public demo.
 */
(function () {
  var DEMO_TOKEN = 'public-demo-session';
  var BACKUP_KEY = 'sl_real_auth_backup_v1';
  var DEMO_SESSION_KEYS = [
    'sl_public_demo',
    'sl_public_demo_role',
    'sl_public_demo_state',
    'sl_public_demo_seed_players',
    'sl_public_demo_started_at',
    'sl_heap_demo_sid'
  ];
  var AUTH_KEYS = ['sl_token', 'sl_user', 'sl_type'];
  var page = String(window.location.pathname || '/').replace(/\/+$/, '') || '/';

  function safeGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      if (value === null || value === undefined) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch (_) {}
  }

  function parseUser(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function isDemoUser(user) {
    var id = user && (user.id || user.userId || user.user_id);
    return /^demo-/i.test(String(id || ''));
  }

  function isTemporaryDemoIdentity() {
    var token = safeGet(localStorage, 'sl_token');
    var user = parseUser(safeGet(localStorage, 'sl_user'));
    return token === DEMO_TOKEN ||
      isDemoUser(user) ||
      safeGet(sessionStorage, 'sl_public_demo') === '1';
  }

  function clearDemoSessionFlags() {
    DEMO_SESSION_KEYS.forEach(function (key) {
      safeSet(sessionStorage, key, null);
    });
    safeSet(localStorage, 'sl_demo_mode', null);
  }

  function clearTemporaryDemoIdentity() {
    if (!isTemporaryDemoIdentity()) {
      clearDemoSessionFlags();
      return;
    }

    AUTH_KEYS.forEach(function (key) {
      safeSet(localStorage, key, null);
    });
    clearDemoSessionFlags();
  }

  function currentRealAuth() {
    var token = safeGet(localStorage, 'sl_token');
    var rawUser = safeGet(localStorage, 'sl_user');
    var type = safeGet(localStorage, 'sl_type');
    var user = parseUser(rawUser);

    if (!token || !rawUser || !type) return null;
    if (token === DEMO_TOKEN || isDemoUser(user)) return null;

    return {
      token: token,
      user: rawUser,
      type: type
    };
  }

  function backupRealAuth() {
    var auth = currentRealAuth();
    if (!auth) return;
    safeSet(sessionStorage, BACKUP_KEY, JSON.stringify(auth));
  }

  function restoreRealAuth() {
    var raw = safeGet(sessionStorage, BACKUP_KEY);
    if (!raw) return false;

    try {
      var auth = JSON.parse(raw);
      if (!auth || !auth.token || !auth.user || !auth.type) return false;
      safeSet(localStorage, 'sl_token', auth.token);
      safeSet(localStorage, 'sl_user', auth.user);
      safeSet(localStorage, 'sl_type', auth.type);
      safeSet(sessionStorage, BACKUP_KEY, null);
      return true;
    } catch (_) {
      safeSet(sessionStorage, BACKUP_KEY, null);
      return false;
    }
  }

  function demoRoleFromButton(button) {
    var label = String(button && button.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (
      label.indexOf('explore as coach') >= 0 ||
      label.indexOf('start coach demo') >= 0 ||
      label.indexOf('explore coach demo') >= 0
    ) return 'Coach';

    if (
      label.indexOf('explore as scout') >= 0 ||
      label.indexOf('start scout demo') >= 0 ||
      label.indexOf('explore scout demo') >= 0
    ) return 'Scout';

    return '';
  }

  function startIsolatedDemo(role, button) {
    backupRealAuth();
    clearTemporaryDemoIdentity();

    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = role === 'Scout'
        ? 'Opening Scout demo…'
        : 'Opening Coach demo…';
    }

    var attempts = 0;

    function run() {
      attempts += 1;

      if (typeof window.startPublicDemo === 'function') {
        Promise.resolve(window.startPublicDemo(role)).catch(function (error) {
          if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Try again';
          }
          window.alert(
            error && error.message
              ? error.message
              : 'The public demo could not be opened. Please try again.'
          );
        });
        return;
      }

      if (attempts < 30) {
        window.setTimeout(run, 100);
        return;
      }

      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Try again';
      }

      window.alert('The public demo could not be opened. Please refresh and try again.');
    }

    run();
  }

  function installDemoClickBoundary() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button || button.closest('form')) return;

      var role = demoRoleFromButton(button);
      if (!role) return;

      /*
       * Capture before public-core-runtime's bubble listener so only one demo
       * launcher writes state and navigates.
       */
      event.preventDefault();
      event.stopImmediatePropagation();
      startIsolatedDemo(role, button);
    }, true);
  }

  if (page === '/login') {
    /*
     * A public-demo token must never be treated as a real signed-in account.
     * Restore a genuine pre-demo session when one exists; otherwise show the
     * normal login form.
     */
    clearTemporaryDemoIdentity();
    restoreRealAuth();
  }

  if (page === '/demo' || page === '/public-demo') {
    /*
     * Both public-demo entry URLs are neutral landing points. A previous demo
     * identity is cleared, but any genuine pre-demo account remains safely
     * backed up until the user next chooses Sign in.
     */
    clearTemporaryDemoIdentity();
    installDemoClickBoundary();
  }

  window.ScoutLinkDemoSessionBoundary = {
    clearDemo: clearTemporaryDemoIdentity,
    restoreRealAuth: restoreRealAuth,
    backupRealAuth: backupRealAuth
  };
}());

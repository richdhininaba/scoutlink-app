'use strict';

/*
 * Keeps the shared player-profile router and the Scout intelligence renderer
 * on the same shell contract. The existing Scout design is reused; this file
 * only guarantees that the renderer always receives its required .content
 * workspace after the router has resolved the active experience.
 */
(function scoutProfileRuntimeV1() {
  if (window.__scoutProfileRuntimeV1) return;
  window.__scoutProfileRuntimeV1 = true;

  function storageValue(storage, key) {
    try { return storage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function normaliseRole(value) {
    const role = String(value || '').trim().toLowerCase();
    if (role === 'scout') return 'Scout';
    if (role === 'coach') return 'Coach';
    if (role === 'player') return 'Player';
    return '';
  }

  function activeRole() {
    const candidates = [
      storageValue(sessionStorage, 'sl_public_demo_role'),
      storageValue(sessionStorage, 'sl_admin_demo_role'),
      storageValue(sessionStorage, 'sl_preview_role'),
      storageValue(sessionStorage, 'demoRole'),
      storageValue(sessionStorage, 'sl_active_experience'),
      storageValue(localStorage, 'sl_demo_role'),
      window.Auth && window.Auth.type,
      storageValue(localStorage, 'sl_type')
    ];
    for (const candidate of candidates) {
      const role = normaliseRole(candidate);
      if (role) return role;
    }
    return '';
  }

  function isScoutProfile() {
    const path = String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
    return path === '/player/profile' && activeRole() === 'Scout';
  }

  function loadingContent() {
    return '<main class="content" aria-busy="true">' +
      '<div class="profile-route-loading"><div>' +
        '<strong>Loading player dossier</strong>' +
        '<span>Preparing the current player evidence.</span>' +
      '</div></div>' +
    '</main>';
  }

  function renderExistingScoutShell(app) {
    const mobile = window.innerWidth <= 760;
    try {
      if (typeof shell === 'function') {
        app.innerHTML = shell('profile', 'Player profile', loadingContent(), mobile);
        return true;
      }
    } catch (_) {}

    app.innerHTML = '<div class="scout-page"><section class="workspace">' +
      loadingContent() + '</section></div>';
    return true;
  }

  function ensureWorkspace() {
    if (!isScoutProfile()) return null;
    const app = document.getElementById('scoutExperienceApp');
    if (!app) return null;
    let content = app.querySelector('.content');
    if (!content) {
      renderExistingScoutShell(app);
      content = app.querySelector('.content');
    }
    if (content) {
      app.classList.add('is-loading');
      app.setAttribute('aria-busy', 'true');
    }
    return content;
  }

  function profileHasRendered(content) {
    return Boolean(content && (
      content.querySelector('.full-profile-head') ||
      content.querySelector('[data-player-attributes]') ||
      content.querySelector('#decisionSummary')
    ));
  }

  function signalProfileContext(content) {
    if (!content || !window._profilePlayer || !window._profilePlayer.id) return;
    document.dispatchEvent(new CustomEvent('scoutlink:profile-ready', {
      detail: {
        role: 'Scout',
        playerId: window._profilePlayer.id,
        demo: Boolean(
          storageValue(sessionStorage, 'sl_public_demo') === '1' ||
          storageValue(sessionStorage, 'sl_admin_demo_role')
        )
      }
    }));
  }

  function start() {
    if (!isScoutProfile()) return;
    let attempts = 0;
    const observer = new MutationObserver(function () {
      const content = ensureWorkspace();
      if (profileHasRendered(content)) {
        const app = document.getElementById('scoutExperienceApp');
        if (app) {
          app.classList.remove('is-loading');
          app.setAttribute('aria-busy', 'false');
        }
      }
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });

    const timer = window.setInterval(function () {
      attempts += 1;
      const content = ensureWorkspace();
      signalProfileContext(content);
      if (profileHasRendered(content) || attempts >= 240) {
        if (profileHasRendered(content)) {
          const app = document.getElementById('scoutExperienceApp');
          if (app) {
            app.classList.remove('is-loading');
            app.setAttribute('aria-busy', 'false');
          }
        }
        window.clearInterval(timer);
        if (attempts >= 240) observer.disconnect();
      }
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
}());

'use strict';

/*
 * Scout profile bridge V2.
 *
 * The profile router owns the light-DOM host and Scout Intelligence owns the
 * Shadow DOM profile. This bridge only observes those renderers. It never
 * replaces #scoutExperienceApp or creates a competing profile shell.
 */
(function scoutProfileRuntimeV2() {
  if (window.__scoutProfileRuntimeV2) return;
  window.__scoutProfileRuntimeV2 = true;

  var observer = null;
  var pollTimer = null;
  var stopped = false;

  function storageValue(storage, key) {
    try { return storage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function activeRole() {
    var candidates = [
      storageValue(sessionStorage, 'sl_public_demo_role'),
      storageValue(sessionStorage, 'sl_admin_demo_role'),
      storageValue(sessionStorage, 'sl_preview_role'),
      storageValue(sessionStorage, 'demoRole'),
      storageValue(sessionStorage, 'sl_active_experience'),
      storageValue(localStorage, 'sl_demo_role'),
      window.Auth && window.Auth.type,
      storageValue(localStorage, 'sl_type')
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var role = String(candidates[index] || '').trim().toLowerCase();
      if (role) return role;
    }
    return '';
  }

  function isScoutProfile() {
    var path = String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
    return path === '/player/profile' && (
      activeRole() === 'scout' ||
      (document.body && document.body.classList.contains('scout-profile-route'))
    );
  }

  function roots() {
    var found = [document];
    var visited = new Set();

    function visit(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);
      if (!root.querySelectorAll) return;

      root.querySelectorAll('*').forEach(function (element) {
        if (element.shadowRoot) {
          found.push(element.shadowRoot);
          visit(element.shadowRoot);
        }
      });
    }

    visit(document);
    return found;
  }

  function renderedProfile() {
    var available = roots();
    for (var index = 0; index < available.length; index += 1) {
      var root = available[index];
      var marker = root.querySelector && root.querySelector(
        '.full-profile-head,.profile-head,[data-player-attributes],#decisionSummary'
      );
      if (!marker) continue;

      var scope = root.querySelector('.slv10-exact-root,.slv6-approved') || marker;
      var text = String(scope.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!text || text.indexOf('loading player details') >= 0) continue;
      return marker;
    }
    return null;
  }

  function finish(marker) {
    if (stopped || !marker) return;
    stopped = true;

    var app = document.getElementById('scoutExperienceApp');
    if (app) {
      app.classList.remove('is-loading');
      app.setAttribute('aria-busy', 'false');
    }

    if (document.body) {
      document.body.dataset.scoutProfileReady = '1';
    }

    document.dispatchEvent(new CustomEvent('scoutlink:scout-profile-rendered', {
      detail: {
        role: 'Scout',
        playerId: window._profilePlayer && window._profilePlayer.id || null
      }
    }));

    if (observer) observer.disconnect();
    window.clearInterval(pollTimer);
  }

  function check() {
    if (stopped || !isScoutProfile()) return;
    var player = window._profilePlayer;
    if (!player || !player.id) return;
    finish(renderedProfile());
  }

  function start() {
    if (!isScoutProfile()) return;

    observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-busy']
    });

    pollTimer = window.setInterval(check, 100);
    check();
  }

  document.addEventListener('scoutlink:profile-ready', check);
  window.addEventListener('pageshow', check);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());

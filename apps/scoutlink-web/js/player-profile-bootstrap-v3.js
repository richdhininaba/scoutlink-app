'use strict';

(function () {
  if (window.__SCOUTLINK_PROFILE_BOOTSTRAP_V3__) return;
  window.__SCOUTLINK_PROFILE_BOOTSTRAP_V3__ = true;

  var root = document.getElementById('profileRouteRoot');
  var coachHydrationObserver = null;
  var coachLoadingTimer = null;

  function storage(storageObject, key) {
    try {
      return storageObject.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function normaliseRole(value) {
    var role = String(value || '').trim().toLowerCase();
    if (role === 'coach') return 'Coach';
    if (role === 'scout') return 'Scout';
    if (role === 'player') return 'Player';
    if (role === 'stratex' || role === 'admin') return 'Stratex';
    return '';
  }

  function role() {
    var candidates = [
      storage(sessionStorage, 'sl_public_demo_role'),
      storage(sessionStorage, 'sl_admin_demo_role'),
      storage(sessionStorage, 'sl_preview_role'),
      storage(sessionStorage, 'demoRole'),
      storage(sessionStorage, 'sl_active_experience'),
      storage(sessionStorage, 'selectedExperience'),
      storage(localStorage, 'sl_demo_role'),
      storage(localStorage, 'sl_active_experience'),
      storage(localStorage, 'selectedExperience'),
      storage(localStorage, 'sl_type')
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var resolved = normaliseRole(candidates[index]);
      if (resolved && resolved !== 'Stratex') return resolved;
    }

    return normaliseRole(storage(localStorage, 'sl_type')) || 'Player';
  }

  function addStyle(href, id) {
    if (id && document.getElementById(id)) return Promise.resolve();

    return new Promise(function (resolve) {
      var link = document.createElement('link');
      if (id) link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  function addScript(src, id) {
    if (id && document.getElementById(id)) return Promise.resolve();

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      if (id) script.id = id;
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Could not load ' + src));
      };
      document.body.appendChild(script);
    });
  }

  function removeCoachLoadingScreen() {
    if (coachHydrationObserver) {
      coachHydrationObserver.disconnect();
      coachHydrationObserver = null;
    }

    if (coachLoadingTimer) {
      clearTimeout(coachLoadingTimer);
      coachLoadingTimer = null;
    }

    var splash = document.getElementById('coachProfileLoadingSplash');
    if (splash) splash.remove();

    document.body.classList.remove('profile-route-booting');
  }

  function revealCoachProfile() {
    if (!root) return;

    removeCoachLoadingScreen();

    root.style.visibility = 'visible';
    root.removeAttribute('aria-busy');
    root.setAttribute('aria-live', 'polite');
  }

  function showCoachLoadingError(message) {
    var splash = document.getElementById('coachProfileLoadingSplash');
    if (!splash) return;

    var card = splash.querySelector('[data-profile-loading-card]');
    if (!card) return;

    card.innerHTML =
      '<div class="profile-boot-logo"><span>Scout</span>Link</div>' +
      '<div class="profile-boot-error-icon">!</div>' +
      '<h1>Player profile unavailable</h1>' +
      '<p>' + String(message || 'The player profile could not be loaded. Please refresh and try again.') + '</p>' +
      '<button type="button" class="profile-boot-retry" onclick="window.location.reload()">Try again</button>';
  }

  function installCoachLoadingScreen() {
    if (!root) return;

    root.style.visibility = 'hidden';
    root.setAttribute('aria-busy', 'true');

    document.body.classList.add('coach-product', 'profile-route-booting');

    if (!document.getElementById('coachProfileLoadingStyles')) {
      var style = document.createElement('style');
      style.id = 'coachProfileLoadingStyles';
      style.textContent =
        'body.profile-route-booting{margin:0;min-height:100vh;background:#FBFCFB;overflow-x:hidden}' +
        '#coachProfileLoadingSplash{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:28px;background:#FBFCFB;font-family:Archivo,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0C201A}' +
        '#coachProfileLoadingSplash .profile-boot-card{width:min(430px,100%);display:flex;flex-direction:column;align-items:center;text-align:center}' +
        '#coachProfileLoadingSplash .profile-boot-logo{font-size:23px;font-weight:900;letter-spacing:-.8px;color:#0C201A;margin-bottom:34px}' +
        '#coachProfileLoadingSplash .profile-boot-logo span{color:#075F48}' +
        '#coachProfileLoadingSplash .profile-boot-spinner{width:42px;height:42px;border:3px solid #E5EBE7;border-top-color:#075F48;border-radius:50%;animation:profileBootSpin .8s linear infinite}' +
        '#coachProfileLoadingSplash h1{margin:20px 0 7px;font-size:19px;line-height:1.25;font-weight:800;letter-spacing:-.2px}' +
        '#coachProfileLoadingSplash p{margin:0;max-width:330px;color:#7C8A82;font-size:13px;line-height:1.6}' +
        '#coachProfileLoadingSplash .profile-boot-error-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#F8E9E7;color:#96382D;font-size:20px;font-weight:900}' +
        '#coachProfileLoadingSplash .profile-boot-retry{margin-top:20px;min-height:42px;padding:0 18px;border:0;border-radius:999px;background:#0C201A;color:#fff;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer}' +
        '@keyframes profileBootSpin{to{transform:rotate(360deg)}}' +
        '@media(max-width:760px){#coachProfileLoadingSplash{padding:22px}#coachProfileLoadingSplash .profile-boot-logo{margin-bottom:28px}}';
      document.head.appendChild(style);
    }

    if (!document.getElementById('coachProfileLoadingSplash')) {
      var splash = document.createElement('div');
      splash.id = 'coachProfileLoadingSplash';
      splash.setAttribute('role', 'status');
      splash.setAttribute('aria-live', 'polite');
      splash.innerHTML =
        '<div class="profile-boot-card" data-profile-loading-card>' +
          '<div class="profile-boot-logo"><span>Scout</span>Link</div>' +
          '<div class="profile-boot-spinner" aria-hidden="true"></div>' +
          '<h1>Loading player profile</h1>' +
          '<p>Preparing the latest player record and Coach workspace.</p>' +
        '</div>';
      document.body.appendChild(splash);
    }

    coachLoadingTimer = setTimeout(function () {
      var splash = document.getElementById('coachProfileLoadingSplash');
      var paragraph = splash && splash.querySelector('p');
      if (paragraph) {
        paragraph.textContent = 'Still preparing the player record. This can take a little longer on a slower connection.';
      }
    }, 8000);
  }

  function watchCoachHydration() {
    if (!root || coachHydrationObserver) return;

    function isHydrated() {
      return !!(
        root.classList.contains('coach-profile-hydrated') &&
        document.body.classList.contains('coach-profile-ready') &&
        root.querySelector('.coach-desk') &&
        root.querySelector('.coach-field') &&
        root.querySelector('#coachDeskPage .card, #coachFieldPage .card')
      );
    }

    function hasRouteError() {
      return !!root.querySelector('.profile-route-error');
    }

    function inspect() {
      if (isHydrated()) {
        requestAnimationFrame(function () {
          requestAnimationFrame(revealCoachProfile);
        });
        return;
      }

      if (hasRouteError()) {
        var errorNode = root.querySelector('.profile-route-error p');
        showCoachLoadingError(
          errorNode && errorNode.textContent
            ? errorNode.textContent
            : 'The player profile could not be loaded. Please refresh and try again.'
        );
      }
    }

    coachHydrationObserver = new MutationObserver(inspect);
    coachHydrationObserver.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    });

    inspect();
  }

  function fail(message) {
    if (!root) return;

    removeCoachLoadingScreen();

    root.className = '';
    root.style.visibility = 'visible';
    root.removeAttribute('aria-busy');
    root.innerHTML =
      '<main style="max-width:760px;margin:80px auto;padding:24px;font-family:Archivo,Arial,sans-serif">' +
        '<section style="background:#fff;border:1px solid #DCE3DE;border-radius:16px;padding:24px">' +
          '<h1 style="margin:0 0 8px;font-size:24px">Player profile unavailable</h1>' +
          '<p style="margin:0;color:#48584F;line-height:1.55">' +
            String(message || 'The Player profile could not be started.') +
          '</p>' +
        '</section>' +
      '</main>';
  }

  function setupScoutHost() {
    document.body.className = 'scout-experience-body';
    document.body.setAttribute('data-scout-route', 'profile');

    if (root) {
      root.id = 'scoutExperienceApp';
      root.className = 'is-loading';
      root.setAttribute('aria-live', 'polite');
      root.setAttribute('aria-busy', 'true');
      root.style.visibility = 'hidden';
      root.innerHTML = '';
    }
  }

  async function startScout() {
    setupScoutHost();

    await addScript(
      '/js/scout-experience-v9.js?v=20260822-predeploy-safety-1',
      'scoutExperienceV9ProfileScript'
    );

    /*
     * scout-functional-repairs-v1.js is deliberately gone. The final repair
     * modules are loaded by heap-analytics.js and are the only repair owners.
     */
    addScript(
      '/js/heap-analytics.js?v=20260822-predeploy-safety-1',
      'heapAnalyticsProfileScript'
    ).catch(function () {});
  }

  async function startCoach() {
    installCoachLoadingScreen();
    watchCoachHydration();

    await Promise.all([
      addStyle(
        '/css/coach-desk-field-v1.css?v=20260821-v6-literal-1',
        'coachDeskFieldProfileCss'
      )
    ]);

    await addScript(
      '/js/coach-design-v6.js?v=20260821-v6-literal-1',
      'coachDesignV6ProfileScript'
    );
    await addScript(
      '/js/coach-v2.js?v=20260821-v6-literal-1',
      'coachV2ProfileScript'
    );
    await addScript(
      '/js/scoring-v4-client.js?v=20260821-1',
      'scoringV4ProfileScript'
    );
    await addScript(
      '/js/player-profile-router-v2.js?v=20260821-role-safe-1',
      'profileRouterV2RoleSafeScript'
    );
    await addScript(
      '/js/coach-player-profile-v4.js?v=20260821-profile-refresh-1',
      'coachPlayerProfileV4Script'
    );

    addScript(
      '/js/heap-analytics.js?v=20260822-predeploy-safety-1',
      'heapAnalyticsProfileScript'
    ).catch(function () {});
  }

  async function startPlayer() {
    document.body.className = '';

    await addScript(
      '/js/player-profile-router-v2.js?v=20260821-role-safe-1',
      'profileRouterV2RoleSafeScript'
    );

    addScript(
      '/js/heap-analytics.js?v=20260822-predeploy-safety-1',
      'heapAnalyticsProfileScript'
    ).catch(function () {});
  }

  async function start() {
    if (!root) return;

    try {
      var selectedRole = role();

      if (selectedRole === 'Scout') {
        await startScout();
        return;
      }

      if (selectedRole === 'Coach') {
        await startCoach();
        return;
      }

      await startPlayer();
    } catch (error) {
      console.error('[Player profile bootstrap V3]', error);
      fail(error && error.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());

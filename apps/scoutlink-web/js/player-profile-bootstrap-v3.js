'use strict';

(function () {
  if (window.__SCOUTLINK_PROFILE_BOOTSTRAP_V3__) return;
  window.__SCOUTLINK_PROFILE_BOOTSTRAP_V3__ = true;

  var root = document.getElementById('profileRouteRoot');

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

  function fail(message) {
    if (!root) return;
    root.className = '';
    root.style.visibility = 'visible';
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

    /*
     * The Scout profile has exactly one owner: Scout Desk/Field V9.
     * Do not load player-profile-router-v2, scout-v1, Scout V3/V4, the old
     * profile runtime, or Scout V8 here. Those competing runtimes were the
     * source of the profile render/fetch race.
     */
    await addScript(
      '/js/scout-experience-v9.js?v=20260821-placeholder-root-3',
      'scoutExperienceV9ProfileScript'
    );

    addScript(
      '/js/heap-analytics.js?v=20260821-placeholder-root-3',
      'heapAnalyticsProfileScript'
    ).catch(function () {});
  }

  async function startCoach() {
    document.body.className = '';

    await Promise.all([
      addStyle(
        '/css/coach-desk-field-v1.css?v=20260821-v6-literal-1',
        'coachDeskFieldProfileCss'
      )
    ]);

    /*
     * Coach keeps its approved V6 profile runtime. Only the Scout runtimes
     * are removed from the shared page.
     */
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
      '/js/heap-analytics.js?v=20260821-placeholder-root-3',
      'heapAnalyticsProfileScript'
    ).catch(function () {});
  }

  async function startPlayer() {
    document.body.className = '';

    /*
     * Player self-profile still uses the shared router, but none of the Scout
     * or Coach experience scripts need to be loaded around it.
     */
    await addScript(
      '/js/player-profile-router-v2.js?v=20260821-role-safe-1',
      'profileRouterV2RoleSafeScript'
    );

    addScript(
      '/js/heap-analytics.js?v=20260821-placeholder-root-3',
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

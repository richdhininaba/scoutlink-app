'use strict';

/*
 * ScoutLink shared experience shell.
 *
 * Shared responsibilities only:
 * - identify the current product experience;
 * - add the experience body class;
 * - remove Scout external demo banners;
 * - remove obsolete Coach avatar-builder UI.
 *
 * Coach geometry and visual design are owned exclusively by
 * /css/coach-desk-field-v1.css and /js/coach-v2.js.
 */
(function experienceShellBootstrap() {
  if (window.__scoutLinkExperienceShellV7) return;
  window.__scoutLinkExperienceShellV7 = true;

  var STYLE_ID = 'experienceShellV7Style';
  var observer = null;
  var timer = null;

  function path() {
    return String(window.location.pathname || '/').toLowerCase();
  }

  function storedRole() {
    try {
      if (sessionStorage.getItem('sl_public_demo') === '1') {
        return String(
          sessionStorage.getItem('sl_public_demo_role') ||
          localStorage.getItem('sl_type') ||
          ''
        ).toLowerCase();
      }

      return String(
        sessionStorage.getItem('sl_admin_demo_role') ||
        sessionStorage.getItem('sl_preview_role') ||
        sessionStorage.getItem('demoRole') ||
        (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        ''
      ).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function experience() {
    var currentPath = path();
    var role = storedRole();

    if (currentPath === '/player/profile' || currentPath.indexOf('player-profile') >= 0) {
      return role;
    }

    if (
      currentPath.indexOf('/admin') === 0 ||
      currentPath.indexOf('/company/admin') === 0 ||
      currentPath.indexOf('/stratex') === 0 ||
      currentPath.indexOf('stratex-') >= 0
    ) {
      if (role === 'coach' || role === 'scout' || role === 'player') return role;
      return 'stratex';
    }

    if (currentPath.indexOf('/coach') === 0 || currentPath.indexOf('coach-') >= 0) return 'coach';
    if (currentPath.indexOf('/scout') === 0 || currentPath.indexOf('scout-') >= 0) return 'scout';
    if (currentPath.indexOf('/player') === 0 || currentPath.indexOf('player-') >= 0) return 'player';

    return role;
  }

  function css() {
    return [
      '@media (min-width:761px){',
      'body.experience-shell-player .dashboard{display:block!important;position:relative!important;width:100%!important;min-height:100vh!important;margin:0!important;padding:0!important}',
      'body.experience-shell-player .sidebar{position:fixed!important;inset:0 auto 0 0!important;width:240px!important;height:100vh!important;margin:0!important;overflow-y:auto!important;overflow-x:hidden!important;z-index:220!important}',
      'body.experience-shell-player .dashboard-main{display:block!important;width:calc(100% - 240px)!important;min-width:0!important;min-height:100vh!important;margin:0 0 0 240px!important;padding:0!important}',
      'body.experience-shell-stratex .stx5-shell{display:block!important;position:relative!important;width:100%!important;min-height:100vh!important;margin:0!important;padding:0!important}',
      'body.experience-shell-stratex .stx5-sidebar{position:fixed!important;inset:0 auto 0 0!important;width:236px!important;height:100vh!important;margin:0!important;overflow-y:auto!important;overflow-x:hidden!important;z-index:220!important}',
      'body.experience-shell-stratex .stx5-workspace{display:block!important;width:calc(100% - 236px)!important;min-width:0!important;min-height:100vh!important;margin:0 0 0 236px!important;padding:0!important}',
      '}',
      'body.experience-shell-scout #publicDemoBanner,body.experience-shell-scout>.public-demo-banner,body.experience-shell-scout .public-demo-banner:not(.slwf-demo-banner){display:none!important}',
      'body.experience-shell-coach .ap3-avatar-layout,body.experience-shell-coach [data-avatar-builder],body.experience-shell-coach [data-player-avatar-builder]{display:none!important}'
    ].join('');
  }

  function ensureStyle() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css();
    document.head.appendChild(style);
  }

  function applyBodyClass() {
    if (!document.body) return;
    document.body.classList.remove(
      'experience-shell-coach',
      'experience-shell-scout',
      'experience-shell-player',
      'experience-shell-stratex'
    );

    var current = experience();
    if (current) document.body.classList.add('experience-shell-' + current);
  }

  function removeScoutExternalBanner() {
    if (experience() !== 'scout') return;
    document.querySelectorAll('#publicDemoBanner,.public-demo-banner').forEach(function (banner) {
      if (!banner.classList.contains('slwf-demo-banner')) banner.remove();
    });
  }

  function removeCoachAvatarBuilders() {
    if (experience() !== 'coach') return;
    document.querySelectorAll(
      '.ap3-avatar-layout,[data-avatar-builder],[data-player-avatar-builder]'
    ).forEach(function (node) {
      var section = node.closest('section,article,.panel,.card,[class*="section"]');
      (section || node).remove();
    });
  }

  function apply() {
    ensureStyle();
    applyBodyClass();
    removeScoutExternalBanner();
    removeCoachAvatarBuilders();
  }

  function observe() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply,50);
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  function init() {
    apply();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',init,{once:true});
  } else {
    init();
  }

  window.addEventListener('pageshow',apply);
  window.addEventListener('popstate',apply);
  window.addEventListener('storage',apply);
}());

'use strict';

/*
 * ScoutLink shared experience shell V6.
 *
 * This file identifies the active experience and handles shared cleanup only.
 * It deliberately does not control Coach geometry. Coach sidebar and workspace
 * positioning are owned by coach-layout-core-v1.css.
 *
 * Scout V10 owns its Shadow DOM geometry through scout-experience-core-v2.js.
 * Player and Stratex retain their existing fixed desktop shells here.
 */
(function experienceShellV6Bootstrap() {
  if (window.__scoutLinkExperienceShellV6) return;
  window.__scoutLinkExperienceShellV6 = true;

  const MOBILE_MAX = 760;
  const STYLE_ID = 'experienceShellV6Style';
  let observer = null;
  let timer = null;

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
    const currentPath = path();
    const role = storedRole();

    if (
      currentPath === '/player/profile' ||
      currentPath.includes('player-profile')
    ) {
      return role;
    }

    if (
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/company/admin') ||
      currentPath.startsWith('/stratex') ||
      currentPath.includes('stratex-')
    ) {
      if (role === 'coach' || role === 'scout' || role === 'player') {
        return role;
      }
      return 'stratex';
    }

    if (
      currentPath.startsWith('/coach') ||
      currentPath.includes('coach-')
    ) {
      return 'coach';
    }

    if (
      currentPath.startsWith('/scout') ||
      currentPath.includes('scout-')
    ) {
      return 'scout';
    }

    if (
      currentPath.startsWith('/player') ||
      currentPath.includes('player-')
    ) {
      return 'player';
    }

    return role;
  }

  function css() {
    return `
      @media (min-width:${MOBILE_MAX + 1}px) {
        body.experience-shell-player .dashboard {
          display:block!important;
          position:relative!important;
          width:100%!important;
          min-height:100vh!important;
          margin:0!important;
          padding:0!important;
        }

        body.experience-shell-player .sidebar {
          position:fixed!important;
          inset:0 auto 0 0!important;
          width:240px!important;
          height:100vh!important;
          height:100dvh!important;
          margin:0!important;
          overflow-y:auto!important;
          overflow-x:hidden!important;
          z-index:220!important;
        }

        body.experience-shell-player .dashboard-main {
          display:block!important;
          width:calc(100% - 240px)!important;
          min-width:0!important;
          min-height:100vh!important;
          margin:0 0 0 240px!important;
          padding:0!important;
        }

        body.experience-shell-stratex .stx5-shell {
          display:block!important;
          position:relative!important;
          width:100%!important;
          min-height:100vh!important;
          margin:0!important;
          padding:0!important;
        }

        body.experience-shell-stratex .stx5-sidebar {
          position:fixed!important;
          inset:0 auto 0 0!important;
          width:236px!important;
          height:100vh!important;
          height:100dvh!important;
          margin:0!important;
          overflow-y:auto!important;
          overflow-x:hidden!important;
          z-index:220!important;
        }

        body.experience-shell-stratex .stx5-workspace {
          display:block!important;
          width:calc(100% - 236px)!important;
          min-width:0!important;
          min-height:100vh!important;
          margin:0 0 0 236px!important;
          padding:0!important;
        }
      }

      body.experience-shell-scout #publicDemoBanner,
      body.experience-shell-scout > .public-demo-banner,
      body.experience-shell-scout .public-demo-banner:not(.slwf-demo-banner) {
        display:none!important;
      }

      body.experience-shell-coach .ap3-avatar-layout,
      body.experience-shell-coach [data-avatar-builder],
      body.experience-shell-coach [data-player-avatar-builder] {
        display:none!important;
      }
    `;
  }

  function ensureStyle() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
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

    const current = experience();

    if (current) {
      document.body.classList.add('experience-shell-' + current);
    }
  }

  function removeScoutExternalBanner() {
    if (experience() !== 'scout') return;

    document
      .querySelectorAll('#publicDemoBanner,.public-demo-banner')
      .forEach((banner) => {
        if (!banner.classList.contains('slwf-demo-banner')) {
          banner.remove();
        }
      });
  }

  function removeCoachAvatarBuilders() {
    if (experience() !== 'coach') return;

    document
      .querySelectorAll(
        '.ap3-avatar-layout,' +
        '[data-avatar-builder],' +
        '[data-player-avatar-builder]'
      )
      .forEach((node) => {
        const section =
          node.closest(
            'section,article,.panel,.card,[class*="section"]'
          );

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

    observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 50);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    apply();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.addEventListener('pageshow', apply);
  window.addEventListener('popstate', apply);
  window.addEventListener('storage', apply);
}());

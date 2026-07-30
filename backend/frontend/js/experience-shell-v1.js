'use strict';

(function () {
  var MOBILE_MAX = 760;
  var GLOBAL_STYLE_ID = 'experienceShellV1GlobalStyle';
  var SCOUT_STYLE_ID = 'experienceShellV1ScoutStyle';
  var observer = null;

  function cleanPath() {
    return String(window.location.pathname || '/').toLowerCase();
  }

  function storedRole() {
    try {
      return String(
        (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('demoRole') ||
        ''
      ).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function experience() {
    var path = cleanPath();
    var role = storedRole();

    if (
      path.indexOf('/coach') === 0 ||
      path.indexOf('coach-') >= 0 ||
      role === 'coach'
    ) return 'coach';

    if (
      path.indexOf('/scout') === 0 ||
      path.indexOf('scout-') >= 0 ||
      role === 'scout'
    ) return 'scout';

    if (
      path.indexOf('/player') === 0 ||
      path.indexOf('player-') >= 0 ||
      role === 'player'
    ) return 'player';

    if (
      path.indexOf('/admin') === 0 ||
      path.indexOf('/company/admin') === 0 ||
      path.indexOf('/stratex') === 0 ||
      path.indexOf('stratex-') >= 0 ||
      role === 'stratex'
    ) return 'stratex';

    return '';
  }

  function globalCss() {
    return [
      '@media (min-width:' + (MOBILE_MAX + 1) + 'px){',
      'body.experience-shell-coach .dashboard,',
      'body.experience-shell-coach .coach-shell{',
      'display:grid!important;',
      'grid-template-columns:230px minmax(0,1fr)!important;',
      'align-items:start!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-coach .sidebar,',
      'body.experience-shell-coach .coach-sidebar{',
      'position:sticky!important;',
      'top:0!important;',
      'left:auto!important;',
      'right:auto!important;',
      'bottom:auto!important;',
      'align-self:start!important;',
      'width:230px!important;',
      'height:100vh!important;',
      'height:100dvh!important;',
      'min-height:100vh!important;',
      'max-height:100dvh!important;',
      'margin:0!important;',
      'border-radius:0!important;',
      'box-shadow:none!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      'overscroll-behavior:contain!important;',
      '}',
      'body.experience-shell-coach .dashboard-main,',
      'body.experience-shell-coach .coach-workspace{',
      'width:100%!important;',
      'min-width:0!important;',
      'margin-left:0!important;',
      '}',
      'body.experience-shell-player .dashboard{',
      'display:grid!important;',
      'grid-template-columns:240px minmax(0,1fr)!important;',
      'align-items:start!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-player .sidebar{',
      'position:sticky!important;',
      'top:0!important;',
      'left:auto!important;',
      'right:auto!important;',
      'bottom:auto!important;',
      'align-self:start!important;',
      'width:240px!important;',
      'height:100vh!important;',
      'height:100dvh!important;',
      'min-height:100vh!important;',
      'max-height:100dvh!important;',
      'margin:0!important;',
      'border-radius:0!important;',
      'box-shadow:none!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      'overscroll-behavior:contain!important;',
      '}',
      'body.experience-shell-player .dashboard-main{',
      'width:100%!important;',
      'min-width:0!important;',
      'margin-left:0!important;',
      '}',
      'body.experience-shell-stratex .stx5-shell{',
      'display:grid!important;',
      'grid-template-columns:236px minmax(0,1fr)!important;',
      'align-items:start!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-stratex .stx5-sidebar{',
      'position:sticky!important;',
      'top:0!important;',
      'left:auto!important;',
      'right:auto!important;',
      'bottom:auto!important;',
      'align-self:start!important;',
      'width:236px!important;',
      'height:100vh!important;',
      'height:100dvh!important;',
      'min-height:100vh!important;',
      'max-height:100dvh!important;',
      'margin:0!important;',
      'border-radius:0!important;',
      'box-shadow:none!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      'overscroll-behavior:contain!important;',
      '}',
      'body.experience-shell-stratex .stx5-workspace{',
      'width:100%!important;',
      'min-width:0!important;',
      'margin-left:0!important;',
      '}',
      '}',
      'body.experience-shell-coach .coach-player-avatar{display:none!important;}',
      'body.experience-shell-coach .coach-player-id{min-width:0!important;}',
      'body.experience-shell-coach .coach-player-copy{min-width:0!important;}'
    ].join('');
  }

  function ensureGlobalStyle() {
    if (!document.head || document.getElementById(GLOBAL_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = GLOBAL_STYLE_ID;
    style.textContent = globalCss();
    document.head.appendChild(style);
  }

  function setBodyClass() {
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

  function removeCoachPlayerAvatars(root) {
    if (experience() !== 'coach') return;
    var scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.coach-player-avatar').forEach(function (avatar) {
      avatar.remove();
    });
  }

  function scoutShadowCss() {
    return [
      '@media (min-width:' + (MOBILE_MAX + 1) + 'px){',
      ':host{display:block!important;min-height:100vh!important;}',
      '.slv10-exact-root .scout-app{width:100%!important;min-height:100vh!important;}',
      '.slv10-exact-root .desktop-shell{',
      'display:grid!important;',
      'grid-template-columns:230px minmax(0,1fr)!important;',
      'align-items:start!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      '.slv10-exact-root .scout-sidebar{',
      'position:sticky!important;',
      'top:0!important;',
      'left:auto!important;',
      'right:auto!important;',
      'bottom:auto!important;',
      'align-self:start!important;',
      'width:230px!important;',
      'height:100vh!important;',
      'height:100dvh!important;',
      'min-height:100vh!important;',
      'max-height:100dvh!important;',
      'margin:0!important;',
      'border-radius:0!important;',
      'box-shadow:none!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      'overscroll-behavior:contain!important;',
      '}',
      '.slv10-exact-root .workspace{',
      'width:100%!important;',
      'min-width:0!important;',
      'margin-left:0!important;',
      '}',
      '}'
    ].join('');
  }

  function installScoutShadowStyle() {
    var host = document.getElementById('scoutExperienceApp');
    if (!host || !host.shadowRoot) return false;

    if (!host.shadowRoot.getElementById(SCOUT_STYLE_ID)) {
      var style = document.createElement('style');
      style.id = SCOUT_STYLE_ID;
      style.textContent = scoutShadowCss();
      host.shadowRoot.appendChild(style);
    }

    return true;
  }

  function apply() {
    ensureGlobalStyle();
    setBodyClass();
    removeCoachPlayerAvatars(document);
    installScoutShadowStyle();
  }

  function observe() {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) removeCoachPlayerAvatars(node);
        });
      });

      installScoutShadowStyle();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function start() {
    apply();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('pageshow', apply);
  window.addEventListener('popstate', apply);
})();

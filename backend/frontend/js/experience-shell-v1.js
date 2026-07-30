'use strict';

/*
 * ScoutLink shared signed-in shell fixes.
 *
 * Responsibilities:
 * - fixed, viewport-height desktop navigation for Coach, Scout, Player and
 *   Stratex Admin;
 * - remove the Coach-generated player avatar workflow;
 * - keep avatar configuration out of new Coach-created player requests;
 * - rebuild the public-demo notice as a clean two-action banner;
 * - leave all mobile drawers and bottom navigation unchanged.
 */
(function () {
  var MOBILE_MAX = 760;
  var GLOBAL_STYLE_ID = 'experienceShellV2GlobalStyle';
  var SCOUT_STYLE_ID = 'experienceShellV2ScoutStyle';
  var observer = null;
  var apiPoll = null;

  function path() {
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
    var currentPath = path();

    /* Route identity takes priority over stale stored demo roles. */
    if (
      currentPath.indexOf('/admin') === 0 ||
      currentPath.indexOf('/company/admin') === 0 ||
      currentPath.indexOf('/stratex') === 0 ||
      currentPath.indexOf('stratex-') >= 0
    ) return 'stratex';

    if (
      currentPath.indexOf('/coach') === 0 ||
      currentPath.indexOf('coach-') >= 0
    ) return 'coach';

    if (
      currentPath.indexOf('/scout') === 0 ||
      currentPath.indexOf('scout-') >= 0
    ) return 'scout';

    if (
      currentPath.indexOf('/player') === 0 ||
      currentPath.indexOf('player-') >= 0
    ) return 'player';

    var role = storedRole();
    if (role === 'stratex') return 'stratex';
    if (role === 'coach') return 'coach';
    if (role === 'scout') return 'scout';
    if (role === 'player') return 'player';
    return '';
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) {
      return false;
    }
  }

  function globalCss() {
    return [
      '@media (min-width:' + (MOBILE_MAX + 1) + 'px){',

      /* Coach */
      'body.experience-shell-coach .dashboard,',
      'body.experience-shell-coach .coach-shell{',
      'display:block!important;',
      'position:relative!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      'background:#f3f6f7!important;',
      '}',
      'body.experience-shell-coach .sidebar,',
      'body.experience-shell-coach .coach-sidebar{',
      'position:fixed!important;',
      'inset:0 auto 0 0!important;',
      'top:0!important;',
      'left:0!important;',
      'bottom:0!important;',
      'width:230px!important;',
      'height:100vh!important;',
      'height:100dvh!important;',
      'min-height:100vh!important;',
      'max-height:100dvh!important;',
      'margin:0!important;',
      'padding-bottom:18px!important;',
      'border-radius:0!important;',
      'box-shadow:none!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      'overscroll-behavior:contain!important;',
      'z-index:220!important;',
      '}',
      'body.experience-shell-coach .dashboard-main,',
      'body.experience-shell-coach .coach-workspace{',
      'display:block!important;',
      'width:calc(100% - 230px)!important;',
      'min-width:0!important;',
      'max-width:none!important;',
      'min-height:100vh!important;',
      'margin:0 0 0 230px!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-coach .page-content,',
      'body.experience-shell-coach .coach-content{',
      'width:100%!important;',
      'max-width:none!important;',
      'margin:0!important;',
      'padding-left:18px!important;',
      'padding-right:18px!important;',
      '}',

      /* Player */
      'body.experience-shell-player .dashboard{',
      'display:block!important;',
      'position:relative!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-player .sidebar{',
      'position:fixed!important;',
      'inset:0 auto 0 0!important;',
      'top:0!important;',
      'left:0!important;',
      'bottom:0!important;',
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
      'z-index:220!important;',
      '}',
      'body.experience-shell-player .dashboard-main{',
      'display:block!important;',
      'width:calc(100% - 240px)!important;',
      'min-width:0!important;',
      'max-width:none!important;',
      'min-height:100vh!important;',
      'margin:0 0 0 240px!important;',
      'padding:0!important;',
      '}',

      /* Stratex Admin */
      'body.experience-shell-stratex .stx5-shell{',
      'display:block!important;',
      'position:relative!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      'body.experience-shell-stratex .stx5-sidebar{',
      'position:fixed!important;',
      'inset:0 auto 0 0!important;',
      'top:0!important;',
      'left:0!important;',
      'bottom:0!important;',
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
      'z-index:220!important;',
      '}',
      'body.experience-shell-stratex .stx5-workspace{',
      'display:block!important;',
      'width:calc(100% - 236px)!important;',
      'min-width:0!important;',
      'max-width:none!important;',
      'min-height:100vh!important;',
      'margin:0 0 0 236px!important;',
      'padding:0!important;',
      '}',

      '}',

      /* Coach-created avatars are not part of the Coach workflow. */
      'body.experience-shell-coach .coach-player-avatar{display:none!important;}',
      'body.experience-shell-coach .coach-player-id{min-width:0!important;}',
      'body.experience-shell-coach .coach-player-copy{min-width:0!important;}',
      'body.experience-shell-coach .ap3-avatar-layout{display:none!important;}',

      /* Public demo banner */
      '.public-demo-banner.public-demo-banner-v2{',
      'width:100%!important;',
      'min-height:64px!important;',
      'margin:0!important;',
      'padding:11px 18px!important;',
      'border:0!important;',
      'border-bottom:1px solid #b9dfd1!important;',
      'background:linear-gradient(90deg,#effbf6,#f8fffc)!important;',
      'color:#073e31!important;',
      'display:flex!important;',
      'align-items:center!important;',
      'justify-content:space-between!important;',
      'gap:18px!important;',
      'box-shadow:none!important;',
      'position:relative!important;',
      'z-index:70!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-message{',
      'min-width:0!important;',
      'display:flex!important;',
      'align-items:center!important;',
      'gap:11px!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-badge{',
      'min-height:28px!important;',
      'padding:0 10px!important;',
      'border:1px solid #91d5bd!important;',
      'border-radius:999px!important;',
      'background:#dcf8ec!important;',
      'color:#07634b!important;',
      'display:inline-flex!important;',
      'align-items:center!important;',
      'justify-content:center!important;',
      'font-size:10px!important;',
      'font-weight:900!important;',
      'letter-spacing:.04em!important;',
      'text-transform:uppercase!important;',
      'white-space:nowrap!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-copy{min-width:0!important;}',
      '.public-demo-banner-v2 .public-demo-v2-copy b{',
      'display:block!important;',
      'margin:0!important;',
      'color:#073e31!important;',
      'font-size:12px!important;',
      'line-height:1.3!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-copy span{',
      'display:block!important;',
      'margin-top:3px!important;',
      'color:#486e60!important;',
      'font-size:10px!important;',
      'line-height:1.4!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-actions{',
      'display:flex!important;',
      'align-items:center!important;',
      'gap:8px!important;',
      'flex:0 0 auto!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-actions a{',
      'min-height:38px!important;',
      'padding:0 13px!important;',
      'border:1px solid #8fcbb6!important;',
      'border-radius:999px!important;',
      'background:#fff!important;',
      'color:#075f48!important;',
      'display:inline-flex!important;',
      'align-items:center!important;',
      'justify-content:center!important;',
      'font-size:10px!important;',
      'font-weight:900!important;',
      'line-height:1.2!important;',
      'text-align:center!important;',
      'white-space:nowrap!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-actions a.primary{',
      'border-color:#08775e!important;',
      'background:#08775e!important;',
      'color:#fff!important;',
      '}',

      '@media (max-width:' + MOBILE_MAX + 'px){',
      '.public-demo-banner.public-demo-banner-v2{',
      'width:auto!important;',
      'min-height:0!important;',
      'margin:10px 12px 0!important;',
      'padding:13px!important;',
      'border:1px solid #b9dfd1!important;',
      'border-radius:12px!important;',
      'display:grid!important;',
      'grid-template-columns:1fr!important;',
      'gap:12px!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-message{align-items:flex-start!important;}',
      '.public-demo-banner-v2 .public-demo-v2-badge{min-height:25px!important;padding:0 8px!important;font-size:8px!important;}',
      '.public-demo-banner-v2 .public-demo-v2-copy b{font-size:11px!important;}',
      '.public-demo-banner-v2 .public-demo-v2-copy span{font-size:9px!important;}',
      '.public-demo-banner-v2 .public-demo-v2-actions{',
      'width:100%!important;',
      'display:grid!important;',
      'grid-template-columns:1fr 1fr!important;',
      'gap:8px!important;',
      '}',
      '.public-demo-banner-v2 .public-demo-v2-actions a{',
      'width:100%!important;',
      'min-height:44px!important;',
      'padding:7px 9px!important;',
      'white-space:normal!important;',
      '}',
      '}'
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

  function setImportant(node, property, value) {
    if (!node || !node.style) return;
    node.style.setProperty(property, value, 'important');
  }

  function clearImportant(node, properties) {
    if (!node || !node.style) return;
    (properties || []).forEach(function (property) {
      node.style.removeProperty(property);
    });
  }

  function firstNode(selectors, root) {
    var scope = root && root.querySelector ? root : document;
    var list = String(selectors || '').split(',');
    for (var index = 0; index < list.length; index += 1) {
      var node = scope.querySelector(list[index].trim());
      if (node) return node;
    }
    return null;
  }

  function clearDesktopLayout() {
    var nodes = [
      firstNode('.dashboard,.coach-shell'),
      firstNode('.sidebar,.coach-sidebar'),
      firstNode('.dashboard-main,.coach-workspace'),
      firstNode('.page-content,.coach-content'),
      firstNode('.stx5-shell'),
      firstNode('.stx5-sidebar'),
      firstNode('.stx5-workspace')
    ];

    nodes.forEach(function (node) {
      clearImportant(node, [
        'display',
        'position',
        'inset',
        'top',
        'left',
        'right',
        'bottom',
        'width',
        'height',
        'min-height',
        'max-height',
        'min-width',
        'max-width',
        'margin',
        'margin-left',
        'padding',
        'padding-left',
        'padding-right',
        'box-sizing',
        'overflow-y',
        'overflow-x',
        'overscroll-behavior',
        'z-index'
      ]);
    });
  }

  function applyFixedLayout(root, sidebar, workspace, width) {
    if (!root || !sidebar || !workspace) return false;

    setImportant(root, 'display', 'block');
    setImportant(root, 'position', 'relative');
    setImportant(root, 'width', '100%');
    setImportant(root, 'min-height', '100vh');
    setImportant(root, 'margin', '0');
    setImportant(root, 'padding', '0');
    setImportant(root, 'box-sizing', 'border-box');

    setImportant(sidebar, 'position', 'fixed');
    setImportant(sidebar, 'inset', '0 auto 0 0');
    setImportant(sidebar, 'top', '0');
    setImportant(sidebar, 'left', '0');
    setImportant(sidebar, 'right', 'auto');
    setImportant(sidebar, 'bottom', '0');
    setImportant(sidebar, 'width', width + 'px');
    setImportant(sidebar, 'height', '100dvh');
    setImportant(sidebar, 'min-height', '100vh');
    setImportant(sidebar, 'max-height', '100dvh');
    setImportant(sidebar, 'margin', '0');
    setImportant(sidebar, 'overflow-y', 'auto');
    setImportant(sidebar, 'overflow-x', 'hidden');
    setImportant(sidebar, 'overscroll-behavior', 'contain');
    setImportant(sidebar, 'z-index', '220');

    /*
     * Use inline !important values because coach-v2 loads its V8 stylesheet
     * after this shared shell. That stylesheet otherwise resets the workspace
     * to width:100% and margin:0, placing it underneath the fixed sidebar.
     */
    setImportant(workspace, 'display', 'block');
    setImportant(workspace, 'position', 'relative');
    setImportant(workspace, 'width', 'calc(100% - ' + width + 'px)');
    setImportant(workspace, 'min-width', '0');
    setImportant(workspace, 'max-width', 'none');
    setImportant(workspace, 'min-height', '100vh');
    setImportant(workspace, 'margin', '0 0 0 ' + width + 'px');
    setImportant(workspace, 'padding', '0');
    setImportant(workspace, 'box-sizing', 'border-box');

    return true;
  }

  function applyDesktopLayout() {
    if (window.innerWidth <= MOBILE_MAX) {
      clearDesktopLayout();
      return;
    }

    var current = experience();

    if (current === 'coach') {
      var coachRoot = firstNode('.dashboard,.coach-shell');
      var coachSidebar = firstNode('.sidebar,.coach-sidebar', coachRoot || document);
      var coachWorkspace = firstNode(
        '.dashboard-main,.coach-workspace',
        coachRoot || document
      );

      if (applyFixedLayout(coachRoot, coachSidebar, coachWorkspace, 230)) {
        var coachContent = firstNode(
          '.page-content,.coach-content',
          coachWorkspace
        );
        if (coachContent) {
          setImportant(coachContent, 'width', '100%');
          setImportant(coachContent, 'max-width', 'none');
          setImportant(coachContent, 'margin', '0');
          setImportant(coachContent, 'padding-left', '18px');
          setImportant(coachContent, 'padding-right', '18px');
          setImportant(coachContent, 'box-sizing', 'border-box');
        }
      }
      return;
    }

    if (current === 'player') {
      applyFixedLayout(
        firstNode('.dashboard'),
        firstNode('.sidebar'),
        firstNode('.dashboard-main'),
        240
      );
      return;
    }

    if (current === 'stratex') {
      applyFixedLayout(
        firstNode('.stx5-shell'),
        firstNode('.stx5-sidebar'),
        firstNode('.stx5-workspace'),
        236
      );
    }
  }

  function removeCoachPlayerCardAvatars(root) {
    if (experience() !== 'coach') return;
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.coach-player-avatar').forEach(function (node) {
      node.remove();
    });
  }

  function hideAvatarReviewRow() {
    var review = document.getElementById('ap3ReviewAvatar');
    if (!review) return;
    var row = review.closest('.ap3-review-row') || review.parentElement;
    if (row) {
      row.hidden = true;
      row.setAttribute('aria-hidden', 'true');
    }
  }

  function removeCoachGeneratedAvatar(root) {
    if (experience() !== 'coach' || path().indexOf('/coach/add-player') !== 0) return;
    var scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.ap3-avatar-layout').forEach(function (layout) {
      var section = layout.closest('.ap3-section');
      if (section) section.remove();
      else layout.remove();
    });

    scope.querySelectorAll('.ap3-section-head h3').forEach(function (heading) {
      if (String(heading.textContent || '').trim().toLowerCase() !== 'generated player avatar') return;
      var section = heading.closest('.ap3-section');
      if (section) section.remove();
    });

    hideAvatarReviewRow();
  }

  function sanitiseStoredDraft() {
    if (path().indexOf('/coach/add-player') !== 0) return;
    try {
      var key = 'scoutlink.coach.addPlayer.v3';
      var raw = localStorage.getItem(key);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (draft && Object.prototype.hasOwnProperty.call(draft, 'avatar')) {
        delete draft.avatar;
        localStorage.setItem(key, JSON.stringify(draft));
      }
    } catch (_) {}
  }

  function installPlayerCreateSanitiser() {
    if (path().indexOf('/coach/add-player') !== 0) return false;
    if (typeof window.api !== 'function') return false;
    if (window.api.__withoutGeneratedAvatar === true) return true;

    var originalApi = window.api;
    var wrapped = function (method, requestPath, body) {
      var nextBody = body;
      if (
        String(method || '').toUpperCase() === 'POST' &&
        String(requestPath || '').replace(/\/+$/, '') === '/api/players' &&
        body &&
        typeof body === 'object' &&
        !Array.isArray(body)
      ) {
        nextBody = Object.assign({}, body);
        delete nextBody.avatarConfig;
        delete nextBody.avatar_config;
      }

      var args = Array.prototype.slice.call(arguments);
      args[2] = nextBody;
      return originalApi.apply(this, args);
    };

    wrapped.__withoutGeneratedAvatar = true;
    wrapped.__originalApi = originalApi;
    window.api = wrapped;
    return true;
  }

  function demoRole() {
    try {
      return String(
        sessionStorage.getItem('sl_public_demo_role') ||
        (window.Auth && window.Auth.type) ||
        'Coach'
      );
    } catch (_) {
      return 'Coach';
    }
  }

  function demoCta(role) {
    var normalised = String(role || '').toLowerCase();
    if (normalised === 'scout') {
      return {
        title: 'Scout public demo',
        label: 'Request Scout access',
        href: '/register/scout'
      };
    }
    if (normalised === 'player') {
      return {
        title: 'Player public demo',
        label: 'Create player access',
        href: '/register'
      };
    }
    return {
      title: 'Coach public demo',
      label: 'Register as Coach',
      href: '/register/coach'
    };
  }

  function decoratePublicDemoBanner() {
    if (!isPublicDemo()) return;
    var banner = document.getElementById('publicDemoBanner') ||
      document.querySelector('.public-demo-banner');
    if (!banner) return;

    var cta = demoCta(demoRole());
    if (
      banner.dataset.publicDemoV2 === cta.label &&
      banner.classList.contains('public-demo-banner-v2')
    ) return;

    banner.dataset.publicDemoV2 = cta.label;
    banner.classList.add('public-demo-banner-v2');
    banner.setAttribute('aria-label', cta.title + ' notice');
    banner.innerHTML =
      '<div class="public-demo-v2-message">' +
        '<span class="public-demo-v2-badge">Public demo</span>' +
        '<div class="public-demo-v2-copy">' +
          '<b>' + cta.title + '</b>' +
          '<span>Explore fictional sample data. Nothing shown here belongs to a real player, team, Coach or Scout.</span>' +
        '</div>' +
      '</div>' +
      '<div class="public-demo-v2-actions">' +
        '<a href="/">Back to homepage</a>' +
        '<a class="primary" href="' + cta.href + '">' + cta.label + '</a>' +
      '</div>';
  }

  function scoutShadowCss() {
    return [
      '@media (min-width:' + (MOBILE_MAX + 1) + 'px){',
      ':host{display:block!important;min-height:100vh!important;}',
      '.slv10-exact-root .scout-app{',
      'display:block!important;',
      'position:relative!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      '.slv10-exact-root .desktop-shell{',
      'display:block!important;',
      'position:relative!important;',
      'width:100%!important;',
      'min-height:100vh!important;',
      'margin:0!important;',
      'padding:0!important;',
      '}',
      '.slv10-exact-root .scout-sidebar{',
      'position:fixed!important;',
      'inset:0 auto 0 0!important;',
      'top:0!important;',
      'left:0!important;',
      'bottom:0!important;',
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
      'z-index:220!important;',
      '}',
      '.slv10-exact-root .workspace{',
      'display:block!important;',
      'width:calc(100% - 230px)!important;',
      'min-width:0!important;',
      'max-width:none!important;',
      'min-height:100vh!important;',
      'margin:0 0 0 230px!important;',
      'padding:0!important;',
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

  function resetDesktopSidebarScroll() {
    if (window.innerWidth <= MOBILE_MAX) return;
    var current = experience();
    var selector = current === 'stratex'
      ? '.stx5-sidebar'
      : current === 'scout'
        ? ''
        : '.sidebar,.coach-sidebar';

    if (!selector) return;
    var sidebar = document.querySelector(selector);
    if (sidebar && !sidebar.dataset.shellInitialScroll) {
      sidebar.dataset.shellInitialScroll = '1';
      sidebar.scrollTop = 0;
    }
  }

  function apply(root) {
    ensureGlobalStyle();
    setBodyClass();
    applyDesktopLayout();
    removeCoachPlayerCardAvatars(root || document);
    removeCoachGeneratedAvatar(root || document);
    sanitiseStoredDraft();
    installPlayerCreateSanitiser();
    installScoutShadowStyle();
    decoratePublicDemoBanner();
    resetDesktopSidebarScroll();
  }

  function observe() {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return;
          removeCoachPlayerCardAvatars(node);
          removeCoachGeneratedAvatar(node);
        });
      });

      setBodyClass();
      applyDesktopLayout();
      installPlayerCreateSanitiser();
      installScoutShadowStyle();
      decoratePublicDemoBanner();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function start() {
    apply(document);
    observe();

    /*
     * Reapply after the route-specific Coach design link has been appended and
     * loaded. Inline !important layout values remain authoritative afterwards.
     */
    [0, 100, 350, 900, 1800].forEach(function (delay) {
      window.setTimeout(function () {
        setBodyClass();
        applyDesktopLayout();
      }, delay);
    });

    var attempts = 0;
    apiPoll = window.setInterval(function () {
      attempts += 1;
      if (installPlayerCreateSanitiser() || attempts >= 20) {
        window.clearInterval(apiPoll);
        apiPoll = null;
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('pageshow', function () { apply(document); });
  window.addEventListener('popstate', function () { apply(document); });
  window.addEventListener('resize', function () {
    setBodyClass();
    applyDesktopLayout();
    installScoutShadowStyle();
  });
}());

/* ScoutLink shared Coach and Scout loading/accessibility runtime v1 */
(function () {
  'use strict';

  if (window.__scoutLinkWorkspaceLoadingV1) return;
  window.__scoutLinkWorkspaceLoadingV1 = true;

  var path = window.location.pathname.toLowerCase();
  var isWorkspace = /^\/(coach|scout|player)\//.test(path) || /(?:coach|scout|player)-/.test(path);
  if (!isWorkspace) return;

  var activeRequests = 0;
  var showTimer = null;
  var overlay = null;
  var originalFetch = window.fetch ? window.fetch.bind(window) : null;

  function style() {
    if (document.getElementById('slWorkspaceLoadingStyle')) return;
    var node = document.createElement('style');
    node.id = 'slWorkspaceLoadingStyle';
    node.textContent = [
      '.sl-workspace-loading{position:fixed;z-index:2147483000;inset:0;background:linear-gradient(180deg,#f8fafc,#eef3f6);display:flex;align-items:center;justify-content:center;padding:24px;color:#0b1728;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.sl-workspace-loading[hidden]{display:none}',
      '.sl-workspace-loading-card{width:min(520px,100%);padding:32px;border:1px solid #d5dfe7;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(7,18,31,.14);text-align:center}',
      '.sl-workspace-loading-brand{font-size:27px;font-weight:950;letter-spacing:-1px}.sl-workspace-loading-brand span{color:#0a7659}',
      '.sl-workspace-loading-spinner{position:relative;width:58px;height:58px;margin:18px auto;border:2px solid #d5dfe7;border-top-color:#0a7659;border-radius:50%;animation:slWorkspaceSpin .85s linear infinite}',
      '.sl-workspace-loading-spinner:after{content:"";position:absolute;inset:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0 10%,#0b1728 11% 21%,#fff 22% 34%,#0a7659 35% 48%,#fff 49% 61%,#0b1728 62% 75%,#fff 76%)}',
      '.sl-workspace-loading h2{margin:0;font-size:21px}.sl-workspace-loading p{margin:7px 0 0;color:#66798d;font-size:11px;line-height:1.5}',
      '.sl-workspace-loading-lines{display:grid;gap:8px;margin-top:18px}.sl-workspace-loading-lines i{height:8px;border-radius:99px;background:linear-gradient(90deg,#dfe8ee 20%,#fff 45%,#dfe8ee 70%);background-size:220% 100%;animation:slWorkspaceShimmer 1.2s infinite}.sl-workspace-loading-lines i:nth-child(2){width:82%;margin:auto}.sl-workspace-loading-lines i:nth-child(3){width:62%;margin:auto}',
      '.pub-skip-link,.si4-screen-reader-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
      '.pub-skip-link:focus,.si4-screen-reader-only:focus{position:fixed!important;z-index:2147483647!important;top:12px!important;left:12px!important;width:auto!important;height:auto!important;margin:0!important;padding:11px 14px!important;clip:auto!important;overflow:visible!important;background:#07182c!important;color:#fff!important;border-radius:8px!important;font-size:14px!important;font-weight:800!important}',
      '@keyframes slWorkspaceSpin{to{transform:rotate(360deg)}}@keyframes slWorkspaceShimmer{to{background-position:-220% 0}}',
      '@media(max-width:600px){.sl-workspace-loading-card{padding:25px 20px;border-radius:14px}.sl-workspace-loading h2{font-size:19px}}'
    ].join('');
    document.head.appendChild(node);
  }

  function createOverlay() {
    if (overlay) return overlay;
    style();
    overlay = document.createElement('div');
    overlay.className = 'sl-workspace-loading';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.hidden = true;
    overlay.innerHTML = '<section class="sl-workspace-loading-card">' +
      '<div class="sl-workspace-loading-brand">Scout<span>Link</span></div>' +
      '<div class="sl-workspace-loading-spinner" aria-hidden="true"></div>' +
      '<h2 data-loading-title>Loading workspace</h2>' +
      '<p data-loading-copy>Preparing the latest football records and actions.</p>' +
      '<div class="sl-workspace-loading-lines" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '</section>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function show(title, copy, immediate) {
    clearTimeout(showTimer);
    showTimer = setTimeout(function () {
      var node = createOverlay();
      node.querySelector('[data-loading-title]').textContent = title || 'Loading workspace';
      node.querySelector('[data-loading-copy]').textContent = copy || 'Preparing the latest football records and actions.';
      node.hidden = false;
      document.documentElement.setAttribute('aria-busy', 'true');
    }, immediate ? 0 : 140);
  }

  function hide() {
    clearTimeout(showTimer);
    if (overlay) overlay.hidden = true;
    document.documentElement.removeAttribute('aria-busy');
  }

  function describeRequest(url) {
    var value = String(url || '').toLowerCase();
    if (value.indexOf('players') >= 0) return ['Loading players', 'Preparing player records, ratings and evidence.'];
    if (value.indexOf('fixture') >= 0) return ['Loading fixtures', 'Preparing match and observation planning.'];
    if (value.indexOf('prediction') >= 0) return ['Loading predictions', 'Preparing prediction history and plan usage.'];
    if (value.indexOf('export') >= 0) return ['Preparing export', 'Building the requested ScoutLink file.'];
    if (value.indexOf('chat') >= 0) return ['Loading conversations', 'Preparing authorised recruitment messages.'];
    return ['Loading ScoutLink', 'Preparing the latest workspace records.'];
  }

  if (originalFetch) {
    window.fetch = function () {
      var args = arguments;
      var description = describeRequest(args[0]);
      activeRequests += 1;
      show(description[0], description[1], false);
      return originalFetch.apply(window, args).finally(function () {
        activeRequests = Math.max(0, activeRequests - 1);
        if (!activeRequests) hide();
      });
    };
  }

  function isInternalNavigation(anchor) {
    if (!anchor || !anchor.href || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    try { return new URL(anchor.href, location.href).origin === location.origin; }
    catch (_) { return false; }
  }

  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a');
    if (isInternalNavigation(anchor) && !event.defaultPrevented && !event.metaKey && !event.ctrlKey) {
      show('Opening ScoutLink page', 'Preparing the next workspace view.', true);
    }
  }, true);

  document.addEventListener('submit', function () {
    show('Saving your changes', 'Updating ScoutLink securely.', true);
  }, true);

  window.addEventListener('pageshow', hide);
  window.addEventListener('pagehide', function () {
    show('Opening ScoutLink page', 'Preparing the next workspace view.', true);
  });

  function enhanceAddresses() {
    var suggestions = [
      'The Hive London, Camrose Avenue, London HA8 6AG',
      'Crystal Palace National Sports Centre, Ledrington Road, London SE19 2BB',
      'Manchester Regional Arena, Gate 13 Rowsley Street, Etihad Campus, Manchester M11 3FF',
      'Platt Lane Sports Complex, Yew Tree Road, Fallowfield, Manchester M14 7UU',
      'Wythenshawe Park, Wythenshawe Road, Manchester M23 0AB'
    ];
    var list = document.getElementById('slWorkspaceAddressOptions');
    if (!list) {
      list = document.createElement('datalist');
      list.id = 'slWorkspaceAddressOptions';
      list.innerHTML = suggestions.map(function (value) {
        return '<option value="' + value.replace(/"/g, '&quot;') + '"></option>';
      }).join('');
      document.body.appendChild(list);
    }
    document.querySelectorAll('input').forEach(function (input) {
      var label = input.closest('label');
      var copy = ((label && label.textContent) || input.name || input.id || '').toLowerCase();
      if (/address|venue|ground/.test(copy)) {
        input.autocomplete = 'street-address';
        input.setAttribute('list', list.id);
      } else if (/city|town/.test(copy)) input.autocomplete = 'address-level2';
      else if (/postcode|postal/.test(copy)) input.autocomplete = 'postal-code';
    });
  }

  function controlExperienceSwitch() {
    var allowed = localStorage.getItem('sl_demo_mode') === '1' &&
      !!localStorage.getItem('sl_admin_token') &&
      localStorage.getItem('sl_experience_switcher') === '1';
    document.querySelectorAll('a,button').forEach(function (node) {
      if (/switch experience/i.test(node.textContent || '') && !allowed) node.remove();
    });
  }


  function addUsageRequestNavigation() {
    var role = path.indexOf('/coach/') === 0 ? 'coach' : path.indexOf('/scout/') === 0 ? 'scout' : '';
    if (!role) return;
    var href = '/' + role + '/usage-requests';
    document.querySelectorAll('.side-nav,.sidebar-nav,.coach-v2-nav,.nav-links').forEach(function (nav) {
      if (nav.querySelector('a[href="' + href + '"]')) return;
      var link = document.createElement('a');
      link.href = href;
      link.textContent = 'Usage requests';
      link.className = nav.classList.contains('side-nav') ? 'side-link' : '';
      var settings = Array.from(nav.querySelectorAll('a')).find(function (node) {
        return /^settings$/i.test((node.textContent || '').trim());
      });
      if (settings) nav.insertBefore(link, settings); else nav.appendChild(link);
    });
  }

  function removeDeprecatedControls() {
    var blocked = {
      'pipeline settings': true,
      'calendar settings': true,
      'check alerts': true,
      'export results': true
    };
    document.querySelectorAll('a,button').forEach(function (node) {
      var label = String(node.textContent || '').trim().toLowerCase();
      if (blocked[label]) node.remove();
      if (path.indexOf('/scout/chat') === 0 && (label === '+' || label === 'new chat')) node.remove();
    });
  }

  function maintainWorkspaceRules() {
    enhanceAddresses();
    controlExperienceSwitch();
    removeDeprecatedControls();
    addUsageRequestNavigation();
  }

  if (document.readyState === 'loading') {
    show('Loading workspace', 'Preparing the latest football records and actions.', true);
    document.addEventListener('DOMContentLoaded', function () {
      maintainWorkspaceRules();
      if (!activeRequests) hide();
    });
  } else {
    maintainWorkspaceRules();
    hide();
  }

  var rulesObserver = new MutationObserver(function () { maintainWorkspaceRules(); });
  rulesObserver.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(maintainWorkspaceRules,300);
  setTimeout(maintainWorkspaceRules,1200);

  window.ScoutLinkWorkspaceLoading = { show: show, hide: hide, refreshAddresses: enhanceAddresses };
})();

'use strict';

/*
 * ScoutLink Coach V14 design adapter.
 *
 * This file intentionally does NOT own business logic. It lets the existing
 * Coach route renderers keep all live data, API writes, validation, scoring,
 * upload, Match Facts, chat and safeguarding behaviour, then applies the new
 * Desk/Field presentation grammar around the resulting DOM.
 *
 * User override: Coach usage/allowance limits and usage requests are not part
 * of the Coach product.
 */
(function () {
  if (window.__coachDesignV14) return;
  window.__coachDesignV14 = true;

  var playerSummaryPromise = null;
  var queued = false;

  function page() {
    return document.body && document.body.getAttribute('data-coach-page') || '';
  }

  function api(method, path, body) {
    if (window.CoachV2 && window.CoachV2.api) return window.CoachV2.api(method, path, body);
    if (typeof window.api === 'function') return window.api(method, path, body);
    return Promise.reject(new Error('API unavailable'));
  }

  function list(response, keys) {
    if (Array.isArray(response)) return response;
    for (var i = 0; i < keys.length; i++) {
      if (response && Array.isArray(response[keys[i]])) return response[keys[i]];
    }
    return [];
  }

  function truthy(value) {
    if (value === true || value === 1) return true;
    var s = String(value == null ? '' : value).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }

  function playerSummary() {
    if (playerSummaryPromise) return playerSummaryPromise;
    playerSummaryPromise = api('GET', '/api/coaches/my-players').then(function (response) {
      var players = list(response, ['players','data']);
      var interest = players.filter(function (p) {
        return truthy(p.scout_interest) || truthy(p.has_scout_interest) ||
          truthy(p.scoutInterest) || Number(p.scout_interest_count || p.scoutInterestCount || 0) > 0;
      }).length;
      return {players:players.length, interest:interest};
    }).catch(function () {
      return {players:0, interest:0};
    });
    return playerSummaryPromise;
  }

  function removeUsage() {
    document.querySelectorAll(
      'a[href*="/coach/usage-requests"],' +
      '[data-coach-usage],.coach-usage-limit,.coach-usage-request'
    ).forEach(function (node) { node.remove(); });

    if (page() === 'settings') {
      document.querySelectorAll('#settingsRail button,[data-settings-pane],.settings-tab,.settings-nav-item').forEach(function (node) {
        var text = String(node.textContent || '').trim().toLowerCase();
        if (text === 'usage & limits' || text === 'usage and limits' || text === 'usage requests' || text === 'allowance tracking') {
          node.remove();
        }
      });
    }
  }

  function aliasDesk() {
    var root = document.querySelector('.coach-desk');
    if (!root) return;

    root.classList.add('v14-desk');

    root.querySelectorAll('.panel').forEach(function (node) { node.classList.add('card'); });
    root.querySelectorAll('.panel>.ph3:first-child').forEach(function (node) { node.classList.add('card-h'); });
    root.querySelectorAll('.field').forEach(function (node) { node.classList.add('fld'); });
    root.querySelectorAll('table.t').forEach(function (node) { node.classList.add('v14-table'); });
    root.querySelectorAll('.drawer').forEach(function (node) { node.classList.add('drw'); });
    root.querySelectorAll('.oh').forEach(function (node) { node.classList.add('drw-h'); });

    var cv = root.querySelector('.cv');
    if (cv) cv.classList.add('body', 'v14-body');
  }

  function aliasField() {
    var root = document.querySelector('.coach-field');
    if (!root) return;

    root.classList.add('v14-field');

    root.querySelectorAll('.body').forEach(function (node) { node.classList.add('pbody'); });
    root.querySelectorAll('.tabs').forEach(function (node) { node.classList.add('ptabs'); });
    root.querySelectorAll('.hd').forEach(function (node) { node.classList.add('ptop'); });
    root.querySelectorAll('.sheet').forEach(function (node) { node.classList.add('psheet'); });
    root.querySelectorAll('.seg').forEach(function (node) { node.classList.add('pseg'); });
    root.querySelectorAll('.card').forEach(function (node) { node.classList.add('v14-phone-card'); });
  }

  function addDashboardScoutKpi() {
    if (page() !== 'dashboard') return;

    var deskGrid = document.querySelector('.coach-desk .g4');
    var mobileStack = document.querySelector('.coach-field .stack');

    if ((!deskGrid || deskGrid.querySelector('[data-v14-scout-interest]')) &&
        (!mobileStack || mobileStack.querySelector('[data-v14-mobile-summary]'))) return;

    playerSummary().then(function (summary) {
      if (deskGrid && !deskGrid.querySelector('[data-v14-scout-interest]')) {
        deskGrid.classList.add('v14-five');

        var kpi = document.createElement('div');
        kpi.className = 'panel card kpi';
        kpi.dataset.v14ScoutInterest = '1';
        kpi.innerHTML =
          '<div class="k">Scout interest</div>' +
          '<div class="v">' + summary.interest + '</div>' +
          '<div class="d">players with reviewed scout activity</div>';

        var second = deskGrid.children[1] || null;
        deskGrid.insertBefore(kpi, second);
      }

      if (mobileStack && !mobileStack.querySelector('[data-v14-mobile-summary]')) {
        var summaryGrid = document.createElement('div');
        summaryGrid.className = 'pkpi';
        summaryGrid.dataset.v14MobileSummary = '1';
        summaryGrid.innerHTML =
          '<div class="kpi"><div class="k">Players</div><div class="v">' + summary.players + '</div></div>' +
          '<div class="kpi"><div class="k">Scout interest</div><div class="v">' + summary.interest + '</div></div>';

        mobileStack.insertBefore(summaryGrid, mobileStack.firstChild);
      }
    });
  }

  function settingsLabels() {
    if (page() !== 'settings') return;

    var map = {
      team:'Coaches & permissions',
      profile:'Team',
      notifications:'Notifications',
      privacy:'Privacy & safeguarding',
      password:'Account',
      appearance:'Appearance',
      danger:'Danger Zone'
    };

    document.querySelectorAll('#settingsRail [data-settings-pane]').forEach(function (button) {
      var key = button.getAttribute('data-settings-pane');
      var label = map[key];
      var span = button.querySelector('span');
      if (label && span && span.textContent !== label) span.textContent = label;
    });

    var settingsRail = document.getElementById('settingsRail');
    if (settingsRail) {
      settingsRail.setAttribute('aria-label', 'Coach settings');
      settingsRail.classList.add('v14-settings-rail');
    }
  }

  function routeClasses() {
    var p = page();
    if (!p) return;

    document.body.classList.add('coach-v14-route', 'coach-v14-' + p);

    if (p === 'my-players') document.body.classList.add('coach-v14-squad');
    if (p === 'fixtures') document.body.classList.add('coach-v14-fixtures');
    if (p === 'video-reels') document.body.classList.add('coach-v14-video');
    if (p === 'chat' || p === 'notifications') document.body.classList.add('coach-v14-inbox');
    if (p === 'report-a-concern') document.body.classList.add('coach-v14-trust');
  }

  function improveTables() {
    document.querySelectorAll('.coach-desk table').forEach(function (table) {
      if (table.parentElement && !table.parentElement.classList.contains('v14-table-scroll')) {
        var wrap = document.createElement('div');
        wrap.className = 'v14-table-scroll';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
    });
  }

  function improveSpecialFlows() {
    document.querySelectorAll('.wiz').forEach(function (node) {
      node.classList.add('v14-steps');
    });

    document.querySelectorAll(
      '.ap3-panel,.bi3-panel,.mf3-panel,.cf3-panel,.section-card,.table-card'
    ).forEach(function (node) {
      node.classList.add('v14-workflow-card');
    });

    document.querySelectorAll(
      '.ap3-hero,.bi3-hero,.mf3-hero,.cf3-hero,.page-hero'
    ).forEach(function (node) {
      node.classList.add('v14-workflow-hero');
    });
  }

  function addSafetyStylesOnce() {
    if (document.getElementById('coachV14AdapterStyle')) return;

    var style = document.createElement('style');
    style.id = 'coachV14AdapterStyle';
    style.textContent =
      '.v14-table-scroll{width:100%;overflow:auto;margin:0}' +
      '.coach-v14-settings .v14-settings-rail{position:sticky;top:88px}' +
      '.coach-v14-trust .coach-desk .cv>.panel{max-width:920px}' +
      '.coach-v14-squad .coach-desk table{min-width:760px}' +
      '.coach-v14-inbox .coach-desk .panel{min-width:0}' +
      '@media(max-width:760px){' +
        '.v14-table-scroll{overflow:visible}' +
        '.coach-v14-squad .coach-field table{display:none}' +
        '.coach-v14-settings .v14-settings-rail{position:static}' +
      '}';
    document.head.appendChild(style);
  }

  function apply() {
    queued = false;
    routeClasses();
    removeUsage();
    aliasDesk();
    aliasField();
    improveTables();
    improveSpecialFlows();
    settingsLabels();
    addDashboardScoutKpi();
    addSafetyStylesOnce();
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function start() {
    apply();

    var observer = new MutationObserver(queueApply);
    observer.observe(document.body, {childList:true, subtree:true});

    window.addEventListener('resize', queueApply);
    document.addEventListener('coach:rendered', queueApply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();

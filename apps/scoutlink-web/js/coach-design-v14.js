'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — source-faithful presentation adapter.
 *
 * This file is intentionally presentation-only. It does not own API calls,
 * form submission, scoring, Match Facts, video upload, chat, notifications,
 * player assignment, authentication or safeguarding writes.
 *
 * Its only jobs are:
 *   - keep route-specific classes stable,
 *   - map specialised workflow DOM to the shared Desk/Field design grammar,
 *   - make wide tables safely scrollable,
 *   - remove retired Coach usage/allowance surfaces,
 *   - re-apply those presentation rules after functional renderers update DOM.
 */
(function () {
  if (window.__coachDesignSourceFaithful) return;
  window.__coachDesignSourceFaithful = true;

  var queued = false;

  function page() {
    return document.body && document.body.getAttribute('data-coach-page') || '';
  }

  function removeUsageSurfaces() {
    document.querySelectorAll(
      'a[href*="/coach/usage-requests"],' +
      '[data-coach-usage],' +
      '.coach-usage-limit,' +
      '.coach-usage-request'
    ).forEach(function (node) {
      node.remove();
    });

    if (page() === 'settings') {
      document.querySelectorAll('#settingsRail button,[data-settings-pane],.settings-tab,.settings-nav-item').forEach(function (node) {
        var text = String(node.textContent || '').trim().toLowerCase();
        if (
          text === 'usage & limits' ||
          text === 'usage and limits' ||
          text === 'usage requests' ||
          text === 'allowance tracking'
        ) node.remove();
      });
    }
  }

  function routeClasses() {
    var p = page();
    if (!p) return;
    document.body.classList.add('coach-source-design', 'coach-source-' + p);
    if (p === 'my-players') document.body.classList.add('coach-source-squad');
    if (p === 'fixtures') document.body.classList.add('coach-source-fixtures');
    if (p === 'video-reels') document.body.classList.add('coach-source-video');
    if (p === 'chat' || p === 'notifications') document.body.classList.add('coach-source-inbox');
    if (p === 'report-a-concern') document.body.classList.add('coach-source-trust');
  }

  function improveTables() {
    document.querySelectorAll('.coach-desk table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('coach-table-scroll')) return;
      if (table.parentElement && table.parentElement.classList.contains('v14-table-scroll')) {
        table.parentElement.classList.add('coach-table-scroll');
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'coach-table-scroll';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function aliasSpecialisedWorkflows() {
    /* Existing route scripts keep their original class names. These aliases
       let the shared source stylesheet treat them as source-design surfaces. */
    document.querySelectorAll('.ap3-hero,.bi3-hero,.cf3-hero,.mf3-hero,.page-hero').forEach(function (node) {
      node.classList.add('coach-source-workflow-hero');
    });

    document.querySelectorAll(
      '.ap3-panel,.bi3-panel,.cf3-panel,.mf3-panel,.section-card,.table-card'
    ).forEach(function (node) {
      node.classList.add('coach-source-workflow-card');
    });

    document.querySelectorAll('.wiz').forEach(function (node) {
      node.classList.add('coach-source-steps');
    });

    document.querySelectorAll('.coach-field .seg').forEach(function (node) {
      node.classList.add('pseg');
    });

    document.querySelectorAll('.coach-field .card').forEach(function (node) {
      node.classList.add('coach-source-phone-card');
    });
  }

  function accessibilityPass() {
    var settingsRail = document.getElementById('settingsRail');
    if (settingsRail) settingsRail.setAttribute('aria-label', 'Coach settings');

    document.querySelectorAll('.coach-desk .coach-table-scroll').forEach(function (wrap) {
      if (!wrap.hasAttribute('tabindex')) wrap.setAttribute('tabindex', '0');
      if (!wrap.hasAttribute('aria-label')) wrap.setAttribute('aria-label', 'Scrollable table');
    });

    document.querySelectorAll('button[data-watch-video]').forEach(function (button) {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Open video');
    });
  }

  function apply() {
    queued = false;
    routeClasses();
    removeUsageSurfaces();
    improveTables();
    aliasSpecialisedWorkflows();
    accessibilityPass();
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

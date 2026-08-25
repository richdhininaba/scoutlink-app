(function () {
  'use strict';

  if (window.__STRATEX_ADMIN_V7_POLISH__) return;
  window.__STRATEX_ADMIN_V7_POLISH__ = true;

  function currentPath() {
    return (location.pathname || '/admin').replace(/\/+$/, '') || '/admin';
  }

  function removeScoutLinkLegacyWidgets() {
    if (currentPath() !== '/admin/scoutlink') return;

    var attention = document.getElementById('slfAttention');
    var actions = document.getElementById('slfActions');
    var anchor = attention || actions;
    if (!anchor) return;

    var pair = anchor.closest('.two-col');
    if (pair) {
      pair.classList.add('v7-legacy-overview-removed');
      pair.remove();
    }
  }

  function compactFilters() {
    document.querySelectorAll('.fidelity-filters').forEach(function (filter) {
      filter.classList.add('v7-slim-filter-bar');
      filter.removeAttribute('style');
    });
  }

  function compactTables() {
    document.querySelectorAll('.data-table').forEach(function (table) {
      table.classList.add('v7-slim-table');
      var wrapper = table.closest('.table-wrap');
      if (wrapper) wrapper.classList.add('v7-slim-table-wrap');
    });
  }

  function clearStuckDashboardLoading() {
    if (currentPath() !== '/admin') return;

    var attention = document.getElementById('v7Attention');
    var people = document.getElementById('v7People');
    var publishing = document.getElementById('v7Publishing');
    var pulse = document.getElementById('v7CompanyPulse');

    /*
     * The V7 renderer normally replaces these states almost instantly. If it
     * has already rendered an explicit API error, mirror that state to the
     * sibling dashboard panels instead of leaving "Loading team…" forever.
     */
    var explicitError = attention && attention.querySelector('.v7-empty') &&
      /not_found|could not|failed|request|error/i.test(attention.textContent || '');

    if (!explicitError) return;

    if (people && /loading team/i.test(people.textContent || '')) {
      people.innerHTML = '<div class="v7-empty">Live staff data could not be loaded.</div>';
    }

    if (publishing && /—/.test(publishing.textContent || '')) {
      publishing.innerHTML = '<div class="v7-empty">Live publishing data could not be loaded.</div>';
    }

    if (pulse) {
      pulse.querySelectorAll('.company-pulse strong').forEach(function (node) {
        if (String(node.textContent || '').trim() === '—') node.textContent = '—';
      });
    }
  }

  function apply() {
    if (window.__STRATEX_ADMIN_PHONE_BLOCKED__) return;
    removeScoutLinkLegacyWidgets();
    compactFilters();
    compactTables();
    clearStuckDashboardLoading();
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      apply();
    });
  }

  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', function () { setTimeout(schedule, 0); });
  document.addEventListener('click', function () { setTimeout(schedule, 0); }, true);

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true });

  setTimeout(schedule, 20);
  setTimeout(schedule, 150);
  setTimeout(schedule, 600);
}());

'use strict';

/*
 * Coach V6 fidelity adapter.
 * Keeps the established route renderers as the functional/data owners while
 * normalising their DOM into the exact Desk / Field component language.
 */
(function () {
  if (window.__scoutlinkCoachV6Adapter) return;
  window.__scoutlinkCoachV6Adapter = true;

  var page = document.body && document.body.getAttribute('data-coach-page') || '';
  var raf = 0;

  function each(root, selector, fn) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(selector), fn);
  }

  function add(root, selector, className) {
    each(root, selector, function (node) { className.split(/\s+/).filter(Boolean).forEach(function (c) { node.classList.add(c); }); });
  }

  function mapTone(node) {
    if (node.classList.contains('g')) node.classList.add('g');
    else if (node.classList.contains('a')) node.classList.add('a');
    else if (node.classList.contains('r')) node.classList.add('r');
    else if (node.classList.contains('b')) node.classList.add('g');
    else node.classList.add('n');
  }

  function normaliseButtons(root) {
    each(root, '.btn.p', function (node) { node.classList.add('volt'); });
    each(root, '.btn:not(.p):not(.volt):not(.pitch):not(.danger):not(.ghost)', function (node) { node.classList.add('outline'); });
  }

  function normaliseCards(root) {
    add(root, '.kpi', 'stat');
    add(root, '.inp', 'in');
    add(root, '.fld', 'field');
    add(root, '.av', 'avatar');
    add(root, '.tag', 'pill');
    each(root, '.tag', mapTone);
    normaliseButtons(root);
  }

  function dashboardMobile(root) {
    if (!root || page !== 'dashboard') return;
    var stats = root.querySelectorAll('.kpi,.stat');
    Array.prototype.forEach.call(stats, function (node, index) { if (index > 1) node.classList.add('v6-field-extra'); });
    var quick = root.querySelectorAll('.quick,.quicklink,.qlink,[data-quick-link]');
    Array.prototype.forEach.call(quick, function (node, index) { if (index > 3) node.classList.add('v6-field-extra'); });
    var activity = root.querySelectorAll('[data-activity-row],.activity .row,.recent-activity .row');
    Array.prototype.forEach.call(activity, function (node, index) { if (index > 2) node.classList.add('v6-field-extra'); });
  }

  function hideBulkOnField(root) {
    if (!root) return;
    each(root, 'a[href*="bulk-add-players"],button[data-method="bulk"],[data-action="bulk-import"]', function (node) {
      node.classList.add('v6-field-desktop-only');
    });
  }

  function tuneRows(root) {
    each(root, '.row', function (row) {
      if (row.closest('table')) return;
      row.classList.add('list-row');
    });
  }

  function tuneSteps(root) {
    each(root, '.steps', function (steps) { steps.classList.add('stepper'); });
    each(root, '.st', function (step) { step.classList.add('sp-i'); });
  }

  function tuneOverlays(root) {
    each(root, '.coach-overlay .row', function (row) { row.classList.add('list-row'); });
    each(root, '.coach-overlay .av', function (avatar) { avatar.classList.add('avatar'); });
  }

  function normaliseOverallDisplay(root) {
    /* Only explicit rating UI is converted. Counts, ages and other numerics are untouched. */
    each(root, '[data-overall-rating],.player-overall,.overall-rating,.rate-chip', function (node) {
      if (node.dataset.v6RatingNormalised === '1') return;
      var raw = node.getAttribute('data-overall-rating');
      if (raw == null) raw = (node.textContent || '').trim().match(/^\d+(?:\.\d+)?/)?.[0];
      var value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (value > 10) value = value / 10;
      if (value < 0 || value > 10) return;
      node.dataset.v6RatingNormalised = '1';
      if (node.classList.contains('rate-chip')) node.innerHTML = value.toFixed(1) + '<small>/10</small>';
      else if (/^\s*\d+(?:\.\d+)?\s*(?:\/\s*100)?\s*$/.test(node.textContent || '')) node.textContent = value.toFixed(1);
    });
  }

  function normaliseOverallColumns(root) {
    if (!root) return;
    each(root, 'table', function (table) {
      var heads = Array.prototype.slice.call(table.querySelectorAll('thead th'));
      var index = heads.findIndex(function (head) { return /^overall(?: rating)?$/i.test((head.textContent || '').trim()); });
      if (index < 0) return;
      each(table, 'tbody tr', function (row) {
        var cells = row.querySelectorAll('td');
        var cell = cells[index];
        if (!cell || cell.dataset.v6OverallCell === '1') return;
        var raw = (cell.textContent || '').trim();
        if (!/^\d+(?:\.\d+)?$/.test(raw)) return;
        var value = Number(raw);
        if (!Number.isFinite(value)) return;
        if (value > 10) value /= 10;
        if (value < 0 || value > 10) return;
        cell.dataset.v6OverallCell = '1';
        cell.innerHTML = '<span class="rate-chip">' + value.toFixed(1) + '<small>/10</small></span>';
      });
    });
  }

  function normaliseRatingRings(root) {
    if (!root) return;
    each(root, '.ring-wrap', function (ring) {
      if (ring.dataset.v6RingNormalised === '1') return;
      var number = ring.querySelector('.num b');
      var unit = ring.querySelector('.num small');
      if (!number || !unit || !/\/\s*100/.test(unit.textContent || '')) return;
      var value = Number((number.textContent || '').trim());
      if (!Number.isFinite(value)) return;
      if (value > 10) value /= 10;
      if (value < 0 || value > 10) return;
      ring.dataset.v6RingNormalised = '1';
      number.textContent = value.toFixed(1);
      unit.textContent = '/10';
    });
  }

  function enforceFieldFlowRules(root) {
    if (!root) return;
    if (page === 'bulk-add-players' && window.innerWidth <= 760 && !root.querySelector('[data-v6-bulk-desktop-only]')) {
      root.innerHTML = '<div data-v6-bulk-desktop-only class="empty" style="min-height:62dvh"><b>Bulk add is desktop-only</b><p>The V6 Field experience intentionally keeps bulk import off the phone. Open ScoutLink on a desktop to upload the spreadsheet, or add one player from your phone.</p><div class="flex" style="justify-content:center;margin-top:8px"><a class="btn volt" href="/coach/add-player">Add one player</a><a class="btn outline" href="/coach/my-players">Back to players</a></div></div>';
    }
  }

  function apply() {
    raf = 0;
    var desk = document.getElementById('coachDeskPage');
    var field = document.getElementById('coachFieldPage');
    [desk, field].forEach(function (root) {
      normaliseCards(root);
      tuneRows(root);
      tuneSteps(root);
      tuneOverlays(root);
      normaliseOverallDisplay(root);
      normaliseOverallColumns(root);
      normaliseRatingRings(root);
    });
    dashboardMobile(field);
    hideBulkOnField(field);
    enforceFieldFlowRules(field);

    if (page === 'bulk-add-players') document.body.classList.add('coach-v6-desktop-flow');
    if (['onboarding', 'add-player', 'bulk-add-players', 'match-facts'].indexOf(page) >= 0) document.body.classList.add('coach-v6-wizard');
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(apply);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', schedule, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true }); else schedule();
}());

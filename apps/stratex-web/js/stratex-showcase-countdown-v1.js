(function () {
  'use strict';

  function daysUntil(dateValue) {
    var parts = String(dateValue || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return null;

    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var target = Date.UTC(parts[0], parts[1] - 1, parts[2]);

    return Math.max(0, Math.ceil((target - today) / 86400000));
  }

  function updateCountdowns() {
    document.querySelectorAll('[data-showcase-countdown]').forEach(function (node) {
      var days = daysUntil(node.getAttribute('data-showcase-countdown'));
      if (days == null) return;
      node.textContent = String(days);
    });
  }

  updateCountdowns();

  var root = document.getElementById('stratexPublicRoot');
  if (root && window.MutationObserver) {
    new MutationObserver(updateCountdowns).observe(root, {
      childList: true,
      subtree: true
    });
  }
}());

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

      var nextValue = String(days);

      /*
       * Do not write the same text back into the DOM.
       * Replacing textContent creates a childList mutation, so writing on every
       * MutationObserver callback would create a self-sustaining observer loop.
       */
      if (node.textContent !== nextValue) {
        node.textContent = nextValue;
      }
    });
  }

  function nodeContainsCountdown(node) {
    if (!node || node.nodeType !== 1) return false;

    if (typeof node.matches === 'function' && node.matches('[data-showcase-countdown]')) {
      return true;
    }

    return typeof node.querySelector === 'function' &&
      !!node.querySelector('[data-showcase-countdown]');
  }

  updateCountdowns();

  var root = document.getElementById('stratexPublicRoot');

  if (root && window.MutationObserver) {
    new MutationObserver(function (mutations) {
      var countdownAdded = mutations.some(function (mutation) {
        return Array.prototype.some.call(mutation.addedNodes || [], nodeContainsCountdown);
      });

      if (countdownAdded) {
        updateCountdowns();
      }
    }).observe(root, {
      childList: true,
      subtree: true
    });
  }
}());

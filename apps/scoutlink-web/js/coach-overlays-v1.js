'use strict';

(function () {
  var root = null;
  var lastFocus = null;
  var toastRegion = null;
  var previousOverflow = '';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function ensureRoot() {
    if (root && root.parentNode) return root;
    root = document.createElement('div');
    root.className = 'coach-overlay-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
    return root;
  }

  function ensureToastRegion() {
    if (toastRegion && toastRegion.parentNode) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'coach-overlay-toast-region';
    toastRegion.setAttribute('aria-live', 'polite');
    toastRegion.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  function focusables(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll([
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(','))).filter(function (node) {
      return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    });
  }

  function lockBody() {
    if (document.body.dataset.coachOverlayLocked === '1') return;
    previousOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.body.dataset.coachOverlayLocked = '1';
  }

  function unlockBody() {
    if (document.body.dataset.coachOverlayLocked !== '1') return;
    document.body.style.overflow = previousOverflow;
    delete document.body.dataset.coachOverlayLocked;
  }

  function closeAll() {
    if (!root) return;
    root.className = 'coach-overlay-root';
    root.innerHTML = '';
    unlockBody();
    document.removeEventListener('keydown', onKeydown, true);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus({ preventScroll: true }); } catch (_) { lastFocus.focus(); }
    }
    lastFocus = null;
  }

  function onKeydown(event) {
    if (!root || !root.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAll();
      return;
    }
    if (event.key !== 'Tab') return;

    var panel = root.querySelector('[data-coach-overlay-panel]');
    if (!panel) return;
    var nodes = focusables(panel);
    if (!nodes.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function mount(kind, options) {
    options = options || {};
    closeAll();
    var host = ensureRoot();
    lastFocus = options.trigger || document.activeElement;
    var title = options.title || (kind === 'drawer' ? 'Coach panel' : 'Confirm action');
    var body = options.body || options.content || '';
    var footer = options.footer || '';
    var role = kind === 'drawer' ? 'dialog' : 'alertdialog';
    var panelClass = kind === 'drawer' ? 'coach-overlay-drawer' : 'coach-overlay-modal';

    host.className = 'coach-overlay-root is-open';
    host.innerHTML =
      '<button class="coach-overlay-scrim" type="button" data-coach-overlay-close aria-label="Close"></button>' +
      '<section class="' + panelClass + '" role="' + role + '" aria-modal="true" data-coach-overlay-panel tabindex="-1">' +
        '<header class="coach-overlay-head"><h2>' + esc(title) + '</h2>' +
        '<button class="coach-overlay-close" type="button" data-coach-overlay-close aria-label="Close">x</button></header>' +
        '<div class="coach-overlay-body">' + body + '</div>' +
        (footer ? '<footer class="coach-overlay-foot">' + footer + '</footer>' : '') +
      '</section>';

    var panel = host.querySelector('[data-coach-overlay-panel]');
    if (options.width && kind === 'drawer') panel.style.width = options.width;
    host.querySelectorAll('[data-coach-overlay-close]').forEach(function (button) {
      button.addEventListener('click', closeAll);
    });
    lockBody();
    document.addEventListener('keydown', onKeydown, true);
    window.requestAnimationFrame(function () {
      var nodes = focusables(panel);
      (nodes[0] || panel).focus();
    });
    return panel;
  }

  function openDrawer(options) {
    return mount('drawer', options || {});
  }

  function closeDrawer() {
    closeAll();
  }

  function openConfirmModal(options) {
    options = options || {};
    var confirmText = options.confirmText || 'Confirm';
    var cancelText = options.cancelText || 'Cancel';
    var footer =
      '<button class="btn secondary" type="button" data-coach-confirm-cancel>' + esc(cancelText) + '</button>' +
      '<button class="btn ' + (options.tone === 'danger' ? 'danger' : 'primary') +
      '" type="button" data-coach-confirm-action>' + esc(confirmText) + '</button>';
    var body = '<p>' + esc(options.message || 'Are you sure you want to continue?') + '</p>';
    var panel = mount('modal', {
      title: options.title || 'Confirm action',
      body: body,
      footer: footer,
      trigger: options.trigger
    });
    var cancel = panel.querySelector('[data-coach-confirm-cancel]');
    var confirm = panel.querySelector('[data-coach-confirm-action]');
    if (cancel) cancel.addEventListener('click', closeAll);
    if (confirm) confirm.addEventListener('click', function () {
      try {
        if (typeof options.onConfirm === 'function') options.onConfirm();
      } finally {
        closeAll();
      }
    });
    return panel;
  }

  function closeConfirmModal() {
    closeAll();
  }

  function showCoachToast(message, options) {
    options = options || {};
    var region = ensureToastRegion();
    var node = document.createElement('div');
    node.className = 'coach-overlay-toast';
    node.setAttribute('role', 'status');
    if (options.tone) node.dataset.tone = options.tone;
    var action = '';
    if (options.href && options.label) {
      action = '<a href="' + esc(options.href) + '">' + esc(options.label) + '</a>';
    } else if (options.label && typeof options.onAction === 'function') {
      action = '<button type="button" data-coach-toast-action>' + esc(options.label) + '</button>';
    }
    node.innerHTML = '<span>' + esc(message || '') + '</span>' + action;
    region.appendChild(node);
    var button = node.querySelector('[data-coach-toast-action]');
    if (button) {
      button.addEventListener('click', function () {
        options.onAction();
        node.remove();
      });
    }
    window.setTimeout(function () {
      if (node.parentNode) node.remove();
    }, options.duration || 4200);
    return node;
  }

  window.CoachOverlays = {
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    openConfirmModal: openConfirmModal,
    closeConfirmModal: closeConfirmModal,
    showCoachToast: showCoachToast
  };

  window.openDrawer = openDrawer;
  window.closeDrawer = closeDrawer;
  window.openConfirmModal = openConfirmModal;
  window.closeConfirmModal = closeConfirmModal;
  window.showCoachToast = showCoachToast;
}());

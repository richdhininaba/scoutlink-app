'use strict';

/* ScoutLink Coach Desk + Field overlay runtime.
   The public API is intentionally compatible with the existing Coach pages.
   Desktop renders drawers/modals; phone layouts turn the same actions into
   bottom sheets through coach-experience-v9.css. */
(function () {
  var root = null;
  var toastRegion = null;
  var lastFocus = null;
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

  function isPhone() {
    return document.body && document.body.classList.contains('mobile-site');
  }

  function ensureRoot() {
    if (root && root.parentNode) return root;
    root = document.createElement('div');
    root.className = 'coach-overlay-root';
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
    if (!scope) return [];
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
    if (!document.body || document.body.dataset.coachOverlayLocked === '1') return;
    previousOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.body.dataset.coachOverlayLocked = '1';
  }

  function unlockBody() {
    if (!document.body || document.body.dataset.coachOverlayLocked !== '1') return;
    document.body.style.overflow = previousOverflow;
    delete document.body.dataset.coachOverlayLocked;
  }

  function restoreFocus() {
    if (!lastFocus || typeof lastFocus.focus !== 'function') return;
    try { lastFocus.focus({ preventScroll: true }); }
    catch (_) { try { lastFocus.focus(); } catch (ignore) {} }
  }

  function closeAll() {
    if (!root) return;
    root.className = 'coach-overlay-root';
    root.innerHTML = '';
    unlockBody();
    document.removeEventListener('keydown', trapKeydown, true);
    restoreFocus();
    lastFocus = null;
  }

  function trapKeydown(event) {
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
    var role = kind === 'modal' ? 'alertdialog' : 'dialog';
    var panelClass = kind === 'modal' ? 'coach-overlay-modal' : 'coach-overlay-drawer';
    var phoneClass = isPhone() ? ' is-phone-sheet' : '';

    host.className = 'coach-overlay-root is-open ' + (isPhone() ? 'is-phone' : 'is-desktop');
    host.innerHTML =
      '<button class="coach-overlay-scrim" type="button" data-coach-overlay-close aria-label="Close"></button>' +
      '<section class="' + panelClass + phoneClass + '" role="' + role + '" aria-modal="true" data-coach-overlay-panel tabindex="-1">' +
        (isPhone() ? '<div class="coach-overlay-grab" aria-hidden="true"></div>' : '') +
        '<header class="coach-overlay-head"><h2>' + esc(title) + '</h2>' +
          '<button class="coach-overlay-close" type="button" data-coach-overlay-close aria-label="Close">&times;</button></header>' +
        '<div class="coach-overlay-body">' + body + '</div>' +
        (footer ? '<footer class="coach-overlay-foot">' + footer + '</footer>' : '') +
      '</section>';

    var panel = host.querySelector('[data-coach-overlay-panel]');
    if (options.width && !isPhone() && panel) panel.style.width = options.width;
    if (options.className && panel) panel.classList.add(options.className);

    host.querySelectorAll('[data-coach-overlay-close]').forEach(function (button) {
      button.addEventListener('click', closeAll);
    });

    lockBody();
    document.addEventListener('keydown', trapKeydown, true);
    window.requestAnimationFrame(function () {
      var nodes = focusables(panel);
      (nodes[0] || panel).focus();
    });
    return panel;
  }

  function openDrawer(options) {
    return mount('drawer', options || {});
  }

  function openSheet(options) {
    return mount('drawer', options || {});
  }

  function closeDrawer() {
    closeAll();
  }

  function openConfirmModal(options) {
    options = options || {};
    var confirmText = options.confirmText || 'Confirm';
    var cancelText = options.cancelText || 'Cancel';
    var toneClass = options.tone === 'danger' ? 'danger' : 'primary';
    var typed = String(options.requireText || '').trim();
    var body = '<p class="coach-overlay-message">' + esc(options.message || 'Are you sure you want to continue?') + '</p>';

    if (typed) {
      body += '<label class="coach-overlay-field"><span>Type <b>' + esc(typed) + '</b> to confirm</span>' +
        '<input type="text" data-coach-confirm-text autocomplete="off"></label>';
    }

    var footer =
      '<button class="btn secondary" type="button" data-coach-confirm-cancel>' + esc(cancelText) + '</button>' +
      '<button class="btn ' + toneClass + '" type="button" data-coach-confirm-action' + (typed ? ' disabled' : '') + '>' +
        esc(confirmText) + '</button>';

    var panel = mount('modal', {
      title: options.title || 'Confirm action',
      body: body,
      footer: footer,
      trigger: options.trigger,
      className: options.className
    });

    var cancel = panel.querySelector('[data-coach-confirm-cancel]');
    var confirm = panel.querySelector('[data-coach-confirm-action]');
    var typedInput = panel.querySelector('[data-coach-confirm-text]');

    if (cancel) cancel.addEventListener('click', closeAll);
    if (typedInput && confirm) {
      typedInput.addEventListener('input', function () {
        confirm.disabled = typedInput.value !== typed;
      });
    }
    if (confirm) {
      confirm.addEventListener('click', function () {
        if (confirm.disabled) return;
        var result;
        try {
          result = typeof options.onConfirm === 'function' ? options.onConfirm() : null;
        } catch (error) {
          showCoachToast(error.message || 'The action could not be completed.', { tone: 'danger' });
          return;
        }
        if (result && typeof result.then === 'function') {
          confirm.disabled = true;
          result.then(function () { closeAll(); }).catch(function (error) {
            confirm.disabled = false;
            showCoachToast(error && error.message ? error.message : 'The action could not be completed.', { tone: 'danger' });
          });
          return;
        }
        closeAll();
      });
    }
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
    node.setAttribute('role', options.tone === 'danger' ? 'alert' : 'status');
    if (options.tone) node.dataset.tone = options.tone;

    var action = '';
    if (options.href && options.label) {
      action = '<a href="' + esc(options.href) + '">' + esc(options.label) + '</a>';
    } else if (options.label && typeof options.onAction === 'function') {
      action = '<button type="button" data-coach-toast-action>' + esc(options.label) + '</button>';
    }

    node.innerHTML = '<span>' + esc(message || '') + '</span>' + action;
    region.appendChild(node);

    var actionButton = node.querySelector('[data-coach-toast-action]');
    if (actionButton) {
      actionButton.addEventListener('click', function () {
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
    openSheet: openSheet,
    closeDrawer: closeDrawer,
    closeAll: closeAll,
    openConfirmModal: openConfirmModal,
    closeConfirmModal: closeConfirmModal,
    showCoachToast: showCoachToast
  };

  window.openDrawer = openDrawer;
  window.openCoachSheet = openSheet;
  window.closeDrawer = closeDrawer;
  window.openConfirmModal = openConfirmModal;
  window.closeConfirmModal = closeConfirmModal;
  window.showCoachToast = showCoachToast;
}());

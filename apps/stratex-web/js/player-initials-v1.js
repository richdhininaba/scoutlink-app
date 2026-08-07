'use strict';

(function playerInitialsV1Bootstrap() {
  if (window.__scoutLinkPlayerInitialsV1) return;
  window.__scoutLinkPlayerInitialsV1 = true;

  const AVATAR_FIELDS = new Set([
    'avatar_config',
    'avatarConfig',
    'avatar_url',
    'avatarUrl',
    'avatar_seed',
    'avatarSeed',
    'avatar_style',
    'avatarStyle'
  ]);

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function playerName(player) {
    return [
      player?.first_name || player?.firstName,
      player?.last_name || player?.lastName
    ].filter(Boolean).join(' ') || 'Player';
  }

  function initials(player) {
    const parts = playerName(player).trim().split(/\s+/).filter(Boolean);
    return (
      (parts[0] || 'P').charAt(0) +
      (parts[1] || parts[0] || 'L').charAt(0)
    ).toUpperCase();
  }

  function playerInitialsMarkup(player, size) {
    const dimension = Math.max(24, Number(size) || 44);
    const name = playerName(player);
    return (
      '<span class="sl-player-initials" role="img" aria-label="' +
        esc(name) +
      '" style="--player-initial-size:' +
        dimension +
      'px">' +
        esc(initials(player)) +
      '</span>'
    );
  }

  function stripAvatarFields(value) {
    if (Array.isArray(value)) {
      return value.map(stripAvatarFields);
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    const clean = {};
    Object.keys(value).forEach((key) => {
      if (AVATAR_FIELDS.has(key)) return;
      clean[key] = stripAvatarFields(value[key]);
    });
    return clean;
  }

  function installApiBoundary() {
    if (
      typeof window.api !== 'function' ||
      window.api.__playerInitialsAvatarSafe
    ) {
      return false;
    }

    const original = window.api;
    const wrapped = function avatarSafeApi(method, path, body) {
      const args = Array.prototype.slice.call(arguments);
      if (args.length >= 3 && body && typeof body === 'object') {
        args[2] = stripAvatarFields(body);
      }
      return original.apply(this, args);
    };
    wrapped.__playerInitialsAvatarSafe = true;
    wrapped.__originalApi = original;
    window.api = wrapped;
    return true;
  }

  function replaceRenderedAvatar(node) {
    if (!node || node.dataset.playerInitialsReady === '1') return;

    let text =
      node.querySelector('strong')?.textContent ||
      node.getAttribute('data-initials') ||
      node.textContent ||
      'PL';
    text = String(text).replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || 'PL';

    node.dataset.playerInitialsReady = '1';
    node.classList.add('sl-player-initials');
    node.innerHTML = '<strong>' + esc(text) + '</strong>';
    node.removeAttribute('style');

    [
      '--avatar-skin',
      '--avatar-hair',
      '--avatar-kit'
    ].forEach((property) => node.style.removeProperty(property));
  }

  function removeAvatarBuilders(root) {
    const scope = root?.querySelectorAll ? root : document;

    scope.querySelectorAll(
      '.ap3-avatar-layout,' +
      '.generated-player-avatar,' +
      '[data-avatar-builder],' +
      '[data-player-avatar-builder]'
    ).forEach((node) => {
      const section =
        node.closest('section,article,.panel,.card,[class*="section"]');
      (section || node).remove();
    });

    scope.querySelectorAll('h1,h2,h3,h4,h5,legend,label').forEach((heading) => {
      const text = String(heading.textContent || '').trim().toLowerCase();
      if (
        text === 'generated player avatar' ||
        text === 'player avatar' ||
        text === 'avatar style'
      ) {
        const section =
          heading.closest('section,article,.panel,.card,[class*="section"],fieldset');
        (section || heading).remove();
      }
    });
  }

  function repair(root) {
    const scope = root?.querySelectorAll ? root : document;

    scope.querySelectorAll(
      '.sl-player-avatar,' +
      '.coach-player-avatar,' +
      '[data-player-avatar]'
    ).forEach(replaceRenderedAvatar);

    removeAvatarBuilders(scope);
  }

  function observeShadowRoots(root) {
    const scope = root?.querySelectorAll ? root : document;
    scope.querySelectorAll('*').forEach((element) => {
      if (!element.shadowRoot || element.shadowRoot.__playerInitialsObserved) {
        return;
      }

      element.shadowRoot.__playerInitialsObserved = true;
      repair(element.shadowRoot);
      new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              repair(node);
              observeShadowRoots(node);
            }
          });
        });
      }).observe(element.shadowRoot, {
        childList: true,
        subtree: true
      });
    });
  }

  function installStyle() {
    if (document.getElementById('playerInitialsV1Style')) return;

    const style = document.createElement('style');
    style.id = 'playerInitialsV1Style';
    style.textContent = `
      .sl-player-initials{
        width:var(--player-initial-size,44px)!important;
        height:var(--player-initial-size,44px)!important;
        min-width:var(--player-initial-size,44px)!important;
        min-height:var(--player-initial-size,44px)!important;
        border-radius:8px!important;
        background:#0a9a75!important;
        color:#fff!important;
        display:inline-grid!important;
        place-items:center!important;
        overflow:hidden!important;
        font:900 calc(var(--player-initial-size,44px) * .28)/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important;
        text-align:center!important;
        box-shadow:none!important;
      }
      .sl-player-initials::before,
      .sl-player-initials::after,
      .sl-player-initials .sl-avatar-face,
      .sl-player-initials .sl-avatar-hair,
      .sl-player-initials .sl-avatar-kit{
        display:none!important;
      }
      .sl-player-initials strong{
        position:static!important;
        margin:0!important;
        color:inherit!important;
        font:inherit!important;
        transform:none!important;
      }
      .ap3-avatar-layout,
      .generated-player-avatar,
      [data-avatar-builder],
      [data-player-avatar-builder]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    window.playerAvatarConfig = function () {
      return {};
    };
    window.playerAvatarMarkup = playerInitialsMarkup;
    window.playerInitialsMarkup = playerInitialsMarkup;
    window.stripPlayerAvatarFields = stripAvatarFields;

    installStyle();
    installApiBoundary();
    repair(document);
    observeShadowRoots(document);

    let apiAttempts = 0;
    const apiTimer = window.setInterval(() => {
      apiAttempts += 1;
      if (installApiBoundary() || apiAttempts >= 60) {
        window.clearInterval(apiTimer);
      }
    }, 100);

    new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          repair(node);
          observeShadowRoots(node);
        });
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());

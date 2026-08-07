'use strict';

/*
 * Prevents temporary/sample media from flashing while live records are being
 * loaded. Layout space is retained, so this does not redesign or shift pages.
 */
(function dataMediaGuardV1() {
  if (window.__scoutLinkDataMediaGuardV1) return;
  window.__scoutLinkDataMediaGuardV1 = true;

  var PLACEHOLDER_SOURCE = /(?:^|[\/_\-.])(placeholder|default[-_ ]?(?:avatar|player|image)|sample[-_ ]?(?:avatar|player|image)|dummy|mock[-_ ]?(?:avatar|player|image)|blank[-_ ]?(?:avatar|player|image)|loading[-_ ]?(?:avatar|player|image))(?:[\/_\-.]|$)/i;
  var PLACEHOLDER_CLASSES = [
    '[data-placeholder-image]',
    '[data-image-placeholder]',
    '.placeholder-image',
    '.image-placeholder',
    '.avatar-placeholder',
    '.player-placeholder',
    '.skeleton-image'
  ].join(',');

  function installStyles() {
    if (document.getElementById('scoutLinkDataMediaGuardV1Styles')) return;
    var style = document.createElement('style');
    style.id = 'scoutLinkDataMediaGuardV1Styles';
    style.textContent =
      'img[data-sl-media-state="pending"],img[data-sl-media-state="hidden"],' + PLACEHOLDER_CLASSES +
      '{visibility:hidden!important;opacity:0!important}' +
      'img[data-sl-media-state="ready"]{visibility:visible!important;opacity:1!important}' +
      'img[data-sl-media-state]{transition:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  function sourceFor(image) {
    return String(
      image.currentSrc ||
      image.getAttribute('src') ||
      image.getAttribute('data-src') ||
      image.getAttribute('data-lazy-src') ||
      ''
    ).trim();
  }

  function isPlaceholderSource(source) {
    if (!source) return true;
    if (/^(?:about:blank|#)$/i.test(source)) return true;
    return PLACEHOLDER_SOURCE.test(source);
  }

  function state(image, value) {
    image.setAttribute('data-sl-media-state', value);
    if (value === 'hidden') image.setAttribute('aria-hidden', 'true');
    else image.removeAttribute('aria-hidden');
  }

  function evaluate(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.hasAttribute('data-sl-media-guard-ignore')) {
      state(image, 'ready');
      return;
    }

    var source = sourceFor(image);
    if (isPlaceholderSource(source)) {
      state(image, 'hidden');
      return;
    }

    if (image.complete) {
      state(image, image.naturalWidth > 0 && image.naturalHeight > 0 ? 'ready' : 'hidden');
      return;
    }

    state(image, 'pending');
  }

  function bind(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (!image.__scoutLinkMediaGuardBound) {
      image.__scoutLinkMediaGuardBound = true;
      image.addEventListener('load', function () { evaluate(image); });
      image.addEventListener('error', function () { state(image, 'hidden'); });
    }
    evaluate(image);
  }

  function scan(root) {
    if (!root) return;
    if (root instanceof HTMLImageElement) bind(root);
    if (root.querySelectorAll) root.querySelectorAll('img').forEach(bind);

    if (root.querySelectorAll) {
      root.querySelectorAll('[style*="background-image"]').forEach(function (node) {
        var background = String(node.style.backgroundImage || '');
        if (PLACEHOLDER_SOURCE.test(background)) {
          node.style.backgroundImage = 'none';
          node.setAttribute('data-sl-placeholder-background-removed', 'true');
        }
      });
    }
  }

  installStyles();
  scan(document.documentElement);

  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === 'attributes') {
        bind(record.target);
        return;
      }
      record.addedNodes.forEach(scan);
    });
  });

  observer.observe(document.documentElement, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','srcset','data-src','data-lazy-src','style']
  });

  document.addEventListener('scoutlink:data-ready', function () {
    scan(document.documentElement);
  });
  window.addEventListener('pageshow', function () {
    scan(document.documentElement);
  });
}());

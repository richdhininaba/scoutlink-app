'use strict';

/**
 * Target path:
 * apps/scoutlink-web/js/scout-video-embed-v1.js
 *
 * Provider-aware playback for the existing ScoutLink V9 Video reel overlay.
 *
 * This file deliberately does not build or restyle the modal. It waits for
 * ScoutLink V9 to render the existing rounded dark-green reel surface and then
 * places the provider player inside that surface only after the scout presses
 * the existing play button.
 */

(function () {
  if (window.__SCOUTLINK_VIDEO_EMBED_V1__) return;
  window.__SCOUTLINK_VIDEO_EMBED_V1__ = true;

  var nativeFetch = window.fetch.bind(window);
  var profileVideos = [];
  var activeVideo = null;
  var shadowObserver = null;
  var refreshQueued = false;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function requestMethod(input, init) {
    return String(
      (init && init.method) ||
      (input && input.method) ||
      'GET'
    ).toUpperCase();
  }

  function isScoutProfileRequest(url, method) {
    return method === 'GET' &&
      /\/api\/scout-v6\/players\/[^/?]+(?:\?|$)/i.test(
        String(url || '')
      );
  }

  function unwrap(payload) {
    if (
      payload &&
      typeof payload === 'object' &&
      payload.data &&
      typeof payload.data === 'object' &&
      !Array.isArray(payload.data)
    ) {
      return payload.data;
    }

    return payload;
  }

  function videosFromPayload(payload) {
    var value = unwrap(payload);

    if (!value || typeof value !== 'object') return [];

    var candidates = [
      value.videos,
      value.player && value.player.videos,
      value.profile && value.profile.videos,
      payload && payload.videos,
      payload &&
        payload.data &&
        payload.data.videos
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      if (Array.isArray(candidates[index])) {
        return candidates[index].filter(Boolean);
      }
    }

    return [];
  }

  window.fetch = async function (input, init) {
    var url = requestUrl(input);
    var method = requestMethod(input, init);
    var response = await nativeFetch(input, init);

    if (
      response &&
      response.ok &&
      isScoutProfileRequest(url, method)
    ) {
      try {
        response
          .clone()
          .json()
          .then(function (payload) {
            var videos = videosFromPayload(payload);

            if (videos.length) {
              profileVideos = videos;
            }
          })
          .catch(function () {});
      } catch (_) {}
    }

    return response;
  };

  function host() {
    return document.getElementById('scoutExperienceApp');
  }

  function shadow() {
    var node = host();
    return node && node.shadowRoot ? node.shadowRoot : null;
  }

  function videoUrl(video) {
    if (!video || typeof video !== 'object') return '';

    return text(
      video.signed_url ||
      video.video_url ||
      video.url ||
      video.file_url ||
      ''
    );
  }

  function safeHttpsUrl(raw) {
    var value = text(raw);

    if (/^blob:/i.test(value) || /^data:video\//i.test(value)) {
      return value;
    }

    try {
      var parsed = new URL(value, window.location.href);

      if (parsed.protocol !== 'https:') return '';
      return parsed.toString();
    } catch (_) {
      return '';
    }
  }

  function isDirectVideo(raw) {
    var value = text(raw);

    return (
      /^blob:/i.test(value) ||
      /^data:video\//i.test(value) ||
      /\.(?:mp4|webm|ogg|ogv|m4v|mov)(?:[?#].*)?$/i.test(value)
    );
  }

  function youtubeId(parsed) {
    if (!parsed) return '';

    var hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      return text(
        parsed.pathname.split('/').filter(Boolean)[0]
      );
    }

    if (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtube-nocookie.com' ||
      hostname.endsWith('.youtube-nocookie.com')
    ) {
      var queryId = text(parsed.searchParams.get('v'));
      if (queryId) return queryId;

      var parts = parsed.pathname
        .split('/')
        .filter(Boolean);

      if (
        ['embed', 'shorts', 'live'].indexOf(parts[0]) !== -1 &&
        parts[1]
      ) {
        return text(parts[1]);
      }
    }

    return '';
  }

  function vimeoId(parsed) {
    if (!parsed) return '';

    var hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    if (
      hostname !== 'vimeo.com' &&
      !hostname.endsWith('.vimeo.com')
    ) {
      return '';
    }

    var parts = parsed.pathname
      .split('/')
      .filter(Boolean)
      .reverse();

    return parts.find(function (part) {
      return /^\d+$/.test(part);
    }) || '';
  }

  function driveId(parsed) {
    if (!parsed) return '';

    var hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    if (
      hostname !== 'drive.google.com' &&
      hostname !== 'docs.google.com'
    ) {
      return '';
    }

    var fileMatch = parsed.pathname.match(
      /\/file\/d\/([^/]+)/i
    );

    if (fileMatch && fileMatch[1]) {
      return text(fileMatch[1]);
    }

    var dMatch = parsed.pathname.match(
      /\/d\/([^/]+)/i
    );

    if (dMatch && dMatch[1]) {
      return text(dMatch[1]);
    }

    return text(parsed.searchParams.get('id'));
  }

  function provider(raw) {
    var clean = safeHttpsUrl(raw);

    if (!clean) {
      return {
        kind: 'invalid',
        sourceUrl: ''
      };
    }

    if (isDirectVideo(clean)) {
      return {
        kind: 'video',
        playerUrl: clean,
        sourceUrl: clean,
        label: 'Video'
      };
    }

    var parsed;

    try {
      parsed = new URL(clean);
    } catch (_) {
      return {
        kind: 'invalid',
        sourceUrl: clean
      };
    }

    var hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    var yt = youtubeId(parsed);

    if (yt) {
      return {
        kind: 'iframe',
        playerUrl:
          'https://www.youtube-nocookie.com/embed/' +
          encodeURIComponent(yt) +
          '?autoplay=1&rel=0&playsinline=1',
        sourceUrl: clean,
        label: 'YouTube'
      };
    }

    var vm = vimeoId(parsed);

    if (vm) {
      return {
        kind: 'iframe',
        playerUrl:
          'https://player.vimeo.com/video/' +
          encodeURIComponent(vm) +
          '?autoplay=1&title=0&byline=0&portrait=0',
        sourceUrl: clean,
        label: 'Vimeo'
      };
    }

    var drive = driveId(parsed);

    if (drive) {
      return {
        kind: 'iframe',
        playerUrl:
          'https://drive.google.com/file/d/' +
          encodeURIComponent(drive) +
          '/preview',
        sourceUrl: clean,
        label: 'Google Drive'
      };
    }

    if (
      hostname === 'dropbox.com' ||
      hostname.endsWith('.dropbox.com') ||
      hostname.endsWith('.dropboxusercontent.com')
    ) {
      var dropbox = new URL(clean);

      dropbox.searchParams.delete('dl');
      dropbox.searchParams.delete('raw');
      dropbox.searchParams.set('raw', '1');

      return {
        kind: 'video',
        playerUrl: dropbox.toString(),
        sourceUrl: clean,
        label: 'Dropbox'
      };
    }

    return {
      kind: 'external',
      sourceUrl: clean,
      label:
        hostname.indexOf('veo') !== -1
          ? 'Veo'
          : hostname.indexOf('wyscout') !== -1
            ? 'Wyscout'
            : hostname.indexOf('tonsser') !== -1
              ? 'Tonsser'
              : 'External video'
    };
  }

  function currentOverlay(root) {
    if (!root) return null;

    var candidates = Array.from(
      root.querySelectorAll(
        '.sl-overlay-runtime,.sl-overlay,[role="dialog"]'
      )
    );

    return candidates.find(function (overlay) {
      return Boolean(
        overlay.querySelector(
          '[data-action="video-download"]'
        )
      ) ||
      /video reel/i.test(
        overlay.textContent || ''
      );
    }) || null;
  }

  function isCloseButton(button) {
    if (!button) return false;

    var label = text(
      button.getAttribute('aria-label') ||
      button.getAttribute('title') ||
      button.textContent
    ).toLowerCase();

    return (
      label === 'close' ||
      label === 'x' ||
      label === '×'
    );
  }

  function isSourceButton(button) {
    if (!button) return false;

    return (
      button.getAttribute('data-action') ===
        'video-download' ||
      /download clip|open source/i.test(
        button.textContent || ''
      )
    );
  }

  function isPlayLike(button) {
    if (
      !button ||
      isCloseButton(button) ||
      isSourceButton(button)
    ) {
      return false;
    }

    var label = text(
      button.getAttribute('aria-label') ||
      button.getAttribute('title') ||
      button.textContent
    );

    if (/play/i.test(label)) return true;

    return /^[›>▶►→]$/.test(label);
  }

  function backgroundIsDark(node) {
    if (!node) return false;

    var color =
      window.getComputedStyle(node).backgroundColor;

    var match = color.match(
      /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i
    );

    if (!match) return false;

    var average =
      (
        Number(match[1]) +
        Number(match[2]) +
        Number(match[3])
      ) / 3;

    return average < 100;
  }

  function playButton(overlay) {
    if (!overlay) return null;

    return Array.from(
      overlay.querySelectorAll('button')
    ).find(isPlayLike) || null;
  }

  function frameFromButton(overlay, button) {
    if (!overlay || !button) return null;

    var overlayRect = overlay.getBoundingClientRect();
    var node = button.parentElement;
    var fallback = null;

    while (node && node !== overlay) {
      var rect = node.getBoundingClientRect();

      if (
        rect.width >= Math.min(
          280,
          overlayRect.width * 0.55
        ) &&
        rect.height >= 150
      ) {
        fallback = node;

        if (backgroundIsDark(node)) {
          return node;
        }
      }

      node = node.parentElement;
    }

    return fallback;
  }

  function findPlayerFrame(overlay) {
    var button = playButton(overlay);
    var fromButton = frameFromButton(
      overlay,
      button
    );

    if (fromButton) {
      return {
        frame: fromButton,
        button: button
      };
    }

    var overlayRect = overlay.getBoundingClientRect();

    var candidates = Array.from(
      overlay.querySelectorAll(
        'div,section,figure'
      )
    )
      .filter(function (node) {
        var rect = node.getBoundingClientRect();

        return (
          rect.width >= overlayRect.width * 0.6 &&
          rect.width < overlayRect.width * 0.99 &&
          rect.height >= 150 &&
          backgroundIsDark(node)
        );
      })
      .sort(function (a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();

        return (
          br.width * br.height -
          ar.width * ar.height
        );
      });

    return {
      frame: candidates[0] || null,
      button: button
    };
  }

  function ensureFrame(frame) {
    if (!frame) return;

    var computed = window.getComputedStyle(frame);

    if (computed.position === 'static') {
      frame.style.position = 'relative';
    }

    /*
     * No border radius is changed. This simply clips the provider player to
     * the existing ScoutLink rounded frame.
     */
    frame.style.overflow = 'hidden';
  }

  function removeExistingPlayer(frame) {
    if (!frame) return;

    Array.from(
      frame.querySelectorAll(
        '.sl-inline-video-player'
      )
    ).forEach(function (node) {
      node.remove();
    });
  }

  function createLayer(frame) {
    var layer = document.createElement('div');

    layer.className = 'sl-inline-video-player';
    layer.style.cssText = [
      'position:absolute',
      'inset:0',
      'z-index:20',
      'width:100%',
      'height:100%',
      'overflow:hidden',
      'border-radius:inherit',
      'background:#022e25'
    ].join(';');

    frame.appendChild(layer);

    return layer;
  }

  function iframePlayer(layer, result) {
    var iframe = document.createElement('iframe');

    iframe.src = result.playerUrl;
    iframe.title =
      (result.label || 'External') +
      ' football video';
    iframe.allow =
      'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute(
      'allowfullscreen',
      ''
    );
    iframe.setAttribute(
      'referrerpolicy',
      'strict-origin-when-cross-origin'
    );

    iframe.style.cssText = [
      'display:block',
      'width:100%',
      'height:100%',
      'border:0',
      'border-radius:inherit',
      'background:#022e25'
    ].join(';');

    layer.appendChild(iframe);
  }

  function nativePlayer(layer, result, frame) {
    var video = document.createElement('video');

    video.src = result.playerUrl;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.style.cssText = [
      'display:block',
      'width:100%',
      'height:100%',
      'object-fit:contain',
      'border:0',
      'border-radius:inherit',
      'background:#022e25'
    ].join(';');

    video.addEventListener(
      'error',
      function () {
        removeExistingPlayer(frame);

        if (result.sourceUrl) {
          window.open(
            result.sourceUrl,
            '_blank',
            'noopener,noreferrer'
          );
        }
      },
      { once: true }
    );

    layer.appendChild(video);

    var attempt = video.play();

    if (
      attempt &&
      typeof attempt.catch === 'function'
    ) {
      attempt.catch(function () {});
    }
  }

  function openSource(result) {
    if (!result || !result.sourceUrl) return;

    window.open(
      result.sourceUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function playSelectedVideo(overlay) {
    var url = videoUrl(activeVideo);

    if (!url) return;

    var result = provider(url);

    if (
      result.kind === 'invalid' ||
      result.kind === 'external'
    ) {
      openSource(result);
      return;
    }

    var player = findPlayerFrame(overlay);

    if (!player.frame) {
      openSource(result);
      return;
    }

    ensureFrame(player.frame);
    removeExistingPlayer(player.frame);

    var layer = createLayer(player.frame);

    if (result.kind === 'iframe') {
      iframePlayer(layer, result);
      return;
    }

    nativePlayer(
      layer,
      result,
      player.frame
    );
  }

  function bindOverlay(overlay) {
    if (!overlay) return;

    var player = findPlayerFrame(overlay);
    var button = player.button;

    if (
      !button ||
      button.dataset.inlineVideoBound === '1'
    ) {
      return;
    }

    button.dataset.inlineVideoBound = '1';

    button.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();

        playSelectedVideo(overlay);
      },
      true
    );
  }

  function selectedVideoFromButton(button) {
    var index = Number(
      button.getAttribute('data-index')
    );

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      profileVideos[index]
    ) {
      return profileVideos[index];
    }

    return null;
  }

  function installShadowEvents(root) {
    if (
      !root ||
      root.__scoutVideoEmbedEventsInstalled
    ) {
      return;
    }

    root.__scoutVideoEmbedEventsInstalled = true;

    root.addEventListener(
      'click',
      function (event) {
        var videoButton =
          event.target.closest &&
          event.target.closest(
            '[data-action="profile-video"]'
          );

        if (videoButton) {
          activeVideo =
            selectedVideoFromButton(
              videoButton
            );
          return;
        }

        var closeButton =
          event.target.closest &&
          event.target.closest(
            '[data-action="overlay-close"]'
          );

        if (
          closeButton ||
          isCloseButton(
            event.target.closest &&
            event.target.closest('button')
          )
        ) {
          activeVideo = null;
        }
      },
      true
    );
  }

  function refresh() {
    var root = shadow();
    if (!root) return;

    installShadowEvents(root);

    var overlay = currentOverlay(root);

    if (overlay) {
      bindOverlay(overlay);
    }
  }

  function scheduleRefresh() {
    if (refreshQueued) return;

    refreshQueued = true;

    queueMicrotask(function () {
      refreshQueued = false;
      refresh();
    });
  }

  function start() {
    var attempts = 0;

    var timer = setInterval(function () {
      attempts += 1;

      var root = shadow();

      if (!root) {
        if (attempts >= 300) {
          clearInterval(timer);
        }
        return;
      }

      clearInterval(timer);

      installShadowEvents(root);

      shadowObserver =
        new MutationObserver(function () {
          scheduleRefresh();
        });

      shadowObserver.observe(root, {
        childList: true,
        subtree: true
      });

      refresh();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();

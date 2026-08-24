'use strict';

/**
 * Target path:
 * apps/scoutlink-web/js/scout-video-embed-v1.js
 *
 * Adds provider-aware inline playback to the existing ScoutLink Video reel
 * overlay without replacing or redesigning the overlay.
 *
 * Supported inline sources:
 * - ScoutLink/direct video files
 * - YouTube / youtu.be
 * - Vimeo
 * - Google Drive preview links
 * - Dropbox shared files (converted to raw media)
 *
 * Providers that do not provide a reliable public embed route (for example
 * Veo, Wyscout or Tonsser links that block framing) retain the existing
 * ScoutLink play surface and open their source in a new tab.
 */

(function () {
  if (window.__SCOUTLINK_VIDEO_EMBED_V1__) return;
  window.__SCOUTLINK_VIDEO_EMBED_V1__ = true;

  var nativeFetch = window.fetch.bind(window);
  var cachedVideos = [];
  var activeVideo = null;
  var observer = null;
  var refreshQueued = false;

  function asText(value) {
    return String(value == null ? '' : value).trim();
  }

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isPlayerIntelligenceRequest(url) {
    return /\/api\/scout-intelligence\/player\/[^/?]+(?:\?|$)/i.test(
      String(url || '')
    );
  }

  function videosFromPayload(payload) {
    if (!payload || typeof payload !== 'object') return [];

    var candidates = [
      payload.videos,
      payload.data && payload.data.videos,
      payload.player && payload.player.videos,
      payload.data &&
        payload.data.player &&
        payload.data.player.videos,
      payload.profile && payload.profile.videos,
      payload.data &&
        payload.data.profile &&
        payload.data.profile.videos
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
    var response = await nativeFetch(input, init);

    if (
      response &&
      response.ok &&
      isPlayerIntelligenceRequest(url)
    ) {
      try {
        response.clone().json().then(function (payload) {
          var videos = videosFromPayload(payload);
          if (videos.length) cachedVideos = videos;
        }).catch(function () {});
      } catch (_) {}
    }

    return response;
  };

  function appShadow() {
    var host = document.getElementById('scoutExperienceApp');
    return host && host.shadowRoot ? host.shadowRoot : null;
  }

  function videoUrl(video) {
    if (!video || typeof video !== 'object') return '';

    return asText(
      video.signed_url ||
      video.video_url ||
      video.url ||
      ''
    );
  }

  function safeUrl(raw) {
    try {
      var parsed = new URL(asText(raw), window.location.href);
      return parsed.protocol === 'https:' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function directVideo(raw) {
    var value = asText(raw);

    return (
      /^blob:/i.test(value) ||
      /^data:video\//i.test(value) ||
      /\.(?:mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i.test(value)
    );
  }

  function youtubeId(parsed) {
    if (!parsed) return '';

    var host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      return asText(parsed.pathname.split('/').filter(Boolean)[0]);
    }

    if (
      host.endsWith('youtube.com') ||
      host.endsWith('youtube-nocookie.com')
    ) {
      var fromQuery = asText(parsed.searchParams.get('v'));
      if (fromQuery) return fromQuery;

      var parts = parsed.pathname.split('/').filter(Boolean);
      var marker = ['embed', 'shorts', 'live'].indexOf(parts[0]);

      if (marker !== -1 && parts[1]) {
        return asText(parts[1]);
      }
    }

    return '';
  }

  function vimeoId(parsed) {
    if (!parsed) return '';

    var host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!host.endsWith('vimeo.com')) return '';

    var parts = parsed.pathname.split('/').filter(Boolean);
    var numeric = parts.slice().reverse().find(function (part) {
      return /^\d+$/.test(part);
    });

    return numeric || '';
  }

  function driveFileId(parsed) {
    if (!parsed) return '';

    var host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (
      !host.endsWith('drive.google.com') &&
      !host.endsWith('docs.google.com')
    ) {
      return '';
    }

    var match = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (match && match[1]) return asText(match[1]);

    match = parsed.pathname.match(/\/d\/([^/]+)/i);
    if (match && match[1]) return asText(match[1]);

    return asText(parsed.searchParams.get('id'));
  }

  function providerFor(raw) {
    var parsed = safeUrl(raw);

    if (!parsed) {
      return {
        kind: 'unsupported',
        url: asText(raw),
        label: 'External video'
      };
    }

    if (directVideo(parsed.toString())) {
      return {
        kind: 'native',
        url: parsed.toString(),
        label: 'Video'
      };
    }

    var host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    var yt = youtubeId(parsed);

    if (yt) {
      return {
        kind: 'iframe',
        url:
          'https://www.youtube-nocookie.com/embed/' +
          encodeURIComponent(yt) +
          '?autoplay=1&rel=0&playsinline=1',
        sourceUrl: parsed.toString(),
        label: 'YouTube'
      };
    }

    var vm = vimeoId(parsed);

    if (vm) {
      return {
        kind: 'iframe',
        url:
          'https://player.vimeo.com/video/' +
          encodeURIComponent(vm) +
          '?autoplay=1&title=0&byline=0&portrait=0',
        sourceUrl: parsed.toString(),
        label: 'Vimeo'
      };
    }

    var driveId = driveFileId(parsed);

    if (driveId) {
      return {
        kind: 'iframe',
        url:
          'https://drive.google.com/file/d/' +
          encodeURIComponent(driveId) +
          '/preview',
        sourceUrl: parsed.toString(),
        label: 'Google Drive'
      };
    }

    if (
      host.endsWith('dropbox.com') ||
      host.endsWith('dropboxusercontent.com')
    ) {
      var dropbox = new URL(parsed.toString());
      dropbox.searchParams.delete('dl');
      dropbox.searchParams.set('raw', '1');

      return {
        kind: 'native',
        url: dropbox.toString(),
        sourceUrl: parsed.toString(),
        label: 'Dropbox'
      };
    }

    if (host.endsWith('veo.co') || host.endsWith('veo.live')) {
      return {
        kind: 'external',
        url: parsed.toString(),
        label: 'Veo'
      };
    }

    if (host.endsWith('wyscout.com')) {
      return {
        kind: 'external',
        url: parsed.toString(),
        label: 'Wyscout'
      };
    }

    if (host.endsWith('tonsser.com')) {
      return {
        kind: 'external',
        url: parsed.toString(),
        label: 'Tonsser'
      };
    }

    return {
      kind: 'external',
      url: parsed.toString(),
      label: 'External video'
    };
  }

  function overlay(shadow) {
    return shadow
      ? shadow.querySelector('.sl-overlay[aria-label="Video reel"]')
      : null;
  }

  function isCloseButton(button) {
    var label = asText(
      button &&
      (
        button.getAttribute('aria-label') ||
        button.getAttribute('title') ||
        button.textContent
      )
    ).toLowerCase();

    return (
      label === 'close' ||
      label === '×' ||
      label === 'x'
    );
  }

  function isDownloadButton(button) {
    if (!button) return false;

    return (
      button.getAttribute('data-action') === 'video-download' ||
      /download clip|open source/i.test(button.textContent || '')
    );
  }

  function looksLikePlayButton(button) {
    if (!button || isCloseButton(button) || isDownloadButton(button)) {
      return false;
    }

    var label = asText(
      button.getAttribute('aria-label') ||
      button.getAttribute('title') ||
      button.textContent
    );

    return (
      /play/i.test(label) ||
      /^[›>▶►→]$/.test(label)
    );
  }

  function playButton(modal) {
    if (!modal) return null;

    var buttons = Array.from(modal.querySelectorAll('button'));

    return buttons.find(looksLikePlayButton) || null;
  }

  function darkBackground(element) {
    if (!element) return false;

    var value = window.getComputedStyle(element).backgroundColor;
    var match = value.match(
      /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i
    );

    if (!match) return false;

    var r = Number(match[1]);
    var g = Number(match[2]);
    var b = Number(match[3]);

    return (r + g + b) / 3 < 90;
  }

  function frameFromPlayButton(modal, button) {
    if (!modal || !button) return null;

    var modalRect = modal.getBoundingClientRect();
    var node = button.parentElement;
    var best = null;

    while (node && node !== modal) {
      var rect = node.getBoundingClientRect();

      if (
        rect.width >= Math.min(280, modalRect.width * 0.58) &&
        rect.height >= 150
      ) {
        best = node;
        if (darkBackground(node)) return node;
      }

      node = node.parentElement;
    }

    return best;
  }

  function darkFrame(modal) {
    var button = playButton(modal);
    var fromButton = frameFromPlayButton(modal, button);

    if (fromButton) {
      return {
        frame: fromButton,
        playButton: button
      };
    }

    var modalRect = modal.getBoundingClientRect();

    var candidates = Array.from(
      modal.querySelectorAll('div,section,figure')
    ).filter(function (node) {
      var rect = node.getBoundingClientRect();

      return (
        rect.width >= modalRect.width * 0.65 &&
        rect.height >= 150 &&
        rect.width < modalRect.width * 0.99 &&
        darkBackground(node)
      );
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();

      return (
        (br.width * br.height) -
        (ar.width * ar.height)
      );
    });

    return {
      frame: candidates[0] || null,
      playButton: button
    };
  }

  function titleFromModal(modal) {
    if (!modal) return '';

    var candidates = Array.from(
      modal.querySelectorAll('h2,h3,h4,strong,b')
    )
      .map(function (node) {
        return asText(node.textContent);
      })
      .filter(function (value) {
        return (
          value &&
          !/^video reel$/i.test(value) &&
          !/^download clip$/i.test(value)
        );
      });

    return candidates[0] || '';
  }

  function videoFromTitle(modal) {
    var title = titleFromModal(modal).toLowerCase();
    if (!title) return null;

    return cachedVideos.find(function (video) {
      var candidate = asText(
        video.title ||
        video.category ||
        ''
      ).toLowerCase();

      return (
        candidate &&
        (
          title === candidate ||
          title.indexOf(candidate) !== -1 ||
          candidate.indexOf(title) !== -1
        )
      );
    }) || null;
  }

  function currentVideo(modal) {
    if (activeVideo && videoUrl(activeVideo)) {
      return activeVideo;
    }

    var matched = videoFromTitle(modal);
    if (matched) activeVideo = matched;

    return matched;
  }

  function sourceButton(modal) {
    return Array.from(modal.querySelectorAll('button')).find(
      isDownloadButton
    ) || null;
  }

  function preserveRoundedFrame(frame) {
    if (!frame) return;

    var computed = window.getComputedStyle(frame);

    if (computed.position === 'static') {
      frame.style.position = 'relative';
    }

    /*
     * The existing modal already owns its border radius. We deliberately do
     * not replace it. overflow:hidden simply ensures embedded media respects
     * those same soft edges.
     */
    frame.style.overflow = 'hidden';
  }

  function removeMediaLayer(frame) {
    if (!frame) return;

    Array.from(
      frame.querySelectorAll('.sl-video-embed-layer')
    ).forEach(function (node) {
      node.remove();
    });
  }

  function mediaLayer(frame) {
    var layer = document.createElement('div');

    layer.className = 'sl-video-embed-layer';
    layer.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'z-index:20',
      'overflow:hidden',
      'border-radius:inherit',
      'background:inherit'
    ].join(';');

    frame.appendChild(layer);
    return layer;
  }

  function nativePlayer(layer, provider, frame) {
    var video = document.createElement('video');

    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = provider.url;

    video.style.cssText = [
      'display:block',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'border:0',
      'border-radius:inherit',
      'background:#022e25'
    ].join(';');

    video.addEventListener(
      'error',
      function () {
        removeMediaLayer(frame);

        if (provider.sourceUrl) {
          window.open(
            provider.sourceUrl,
            '_blank',
            'noopener,noreferrer'
          );
        }
      },
      { once: true }
    );

    layer.appendChild(video);

    var playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(function () {
        /*
         * Browser autoplay policies may require another user press.
         * Controls remain visible, so the scout can start playback normally.
         */
      });
    }
  }

  function iframePlayer(layer, provider) {
    var iframe = document.createElement('iframe');

    iframe.src = provider.url;
    iframe.title = provider.label + ' video player';
    iframe.loading = 'eager';
    iframe.allow =
      'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

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

  function openExternally(provider) {
    if (!provider || !provider.url) return;

    window.open(
      provider.url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function playCurrent(modal) {
    var video = currentVideo(modal);
    var url = videoUrl(video);

    if (!url) return;

    var provider = providerFor(url);
    var frameInfo = darkFrame(modal);
    var frame = frameInfo.frame;

    if (!frame) {
      openExternally(provider);
      return;
    }

    if (
      provider.kind === 'external' ||
      provider.kind === 'unsupported'
    ) {
      openExternally(provider);
      return;
    }

    preserveRoundedFrame(frame);
    removeMediaLayer(frame);

    var layer = mediaLayer(frame);

    if (provider.kind === 'iframe') {
      iframePlayer(layer, provider);
      return;
    }

    if (provider.kind === 'native') {
      nativePlayer(layer, provider, frame);
    }
  }

  function bindModal(modal) {
    if (!modal) return;

    requestAnimationFrame(function () {
      var video = currentVideo(modal);
      if (!video) return;

      var frameInfo = darkFrame(modal);
      var frame = frameInfo.frame;
      var button = frameInfo.playButton;

      if (frame) preserveRoundedFrame(frame);

      if (button && !button.dataset.videoEmbedBound) {
        button.dataset.videoEmbedBound = 'true';

        button.addEventListener(
          'click',
          function (event) {
            event.preventDefault();
            event.stopPropagation();
            playCurrent(modal);
          },
          true
        );
      }

      /*
       * Keep the existing lower action and styling exactly as supplied by
       * ScoutLink. It remains a source/download fallback.
       */
      var lowerAction = sourceButton(modal);
      if (lowerAction) {
        lowerAction.dataset.videoEmbedSource = 'true';
      }
    });
  }

  function refresh() {
    var shadow = appShadow();
    if (!shadow) return;

    var modal = overlay(shadow);

    if (modal) {
      bindModal(modal);
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

  function installShadowEvents(shadow) {
    if (!shadow || shadow.__videoEmbedEventsInstalled) return;

    shadow.__videoEmbedEventsInstalled = true;

    shadow.addEventListener(
      'click',
      function (event) {
        var trigger = event.target.closest(
          '[data-action="profile-video"]'
        );

        if (trigger) {
          var index = Number(
            trigger.getAttribute('data-index')
          );

          if (
            Number.isInteger(index) &&
            index >= 0 &&
            cachedVideos[index]
          ) {
            activeVideo = cachedVideos[index];
          } else {
            activeVideo = null;
          }

          scheduleRefresh();
          return;
        }

        var close = event.target.closest(
          '[data-action="overlay-close"],[data-action="close-overlay"]'
        );

        if (close || isCloseButton(event.target.closest('button'))) {
          activeVideo = null;
        }
      },
      true
    );
  }

  function begin() {
    var host = document.getElementById('scoutExperienceApp');
    if (!host) return;

    observer = new MutationObserver(function () {
      scheduleRefresh();
    });

    observer.observe(host, {
      childList: true,
      subtree: true
    });

    var poll = setInterval(function () {
      var shadow = appShadow();
      if (!shadow) return;

      clearInterval(poll);

      installShadowEvents(shadow);

      observer.observe(shadow, {
        childList: true,
        subtree: true
      });

      refresh();
    }, 50);

    setTimeout(function () {
      clearInterval(poll);
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      begin,
      { once: true }
    );
  } else {
    begin();
  }
})();

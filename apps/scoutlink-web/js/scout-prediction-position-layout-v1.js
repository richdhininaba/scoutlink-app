'use strict';

/**
 * Target path:
 * apps/scoutlink-web/js/scout-prediction-position-layout-v1.js
 *
 * Position Fit result-only layout refinement.
 *
 * IMPORTANT:
 * This version is deliberately idempotent. The previous implementation
 * observed the prediction Shadow DOM and then used appendChild() on every
 * refresh. Those moves created fresh childList mutations, which invoked the
 * observer again and could trap the Position Fit result in a render loop.
 *
 * - Verdict becomes a full-width card beneath the green result hero.
 * - Best current position, target position and gap vs best stay beneath it.
 * - Top position role fits are capped at five and rendered using the same
 *   row structure/style as Position rating comparison.
 * - No scoring, prediction, AI, credit or API behaviour is changed.
 */

(function () {
  if (window.__SCOUTLINK_PREDICTION_POSITION_LAYOUT_V2__) return;
  window.__SCOUTLINK_PREDICTION_POSITION_LAYOUT_V2__ = true;

  var observer = null;
  var observedShadow = null;
  var refreshQueued = false;
  var refreshing = false;

  function appShadow() {
    var host = document.getElementById('scoutExperienceApp');
    return host && host.shadowRoot ? host.shadowRoot : null;
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function cardHeading(card) {
    var heading = card && card.querySelector('.card-h h3');
    return text(heading && heading.textContent);
  }

  function cardByHeading(shadow, matcher) {
    return Array.from(shadow.querySelectorAll('.card')).find(function (card) {
      return matcher.test(cardHeading(card));
    }) || null;
  }

  function isPositionResult(shadow) {
    var heroHeading = shadow.querySelector('.profile-hero h2');
    var heroText = text(heroHeading && heroHeading.textContent);

    return /conversion review/i.test(heroText) &&
      Boolean(
        cardByHeading(
          shadow,
          /^Position rating comparison$/i
        )
      );
  }

  function ensureStyles(shadow) {
    if (shadow.getElementById('slPredictionPositionLayoutV2Style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'slPredictionPositionLayoutV2Style';
    style.textContent = `
      .sl-position-verdict-wide{
        width:100%;
        box-sizing:border-box;
        margin-top:14px;
        min-height:132px;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }

      .sl-position-verdict-wide strong{
        max-width:100%;
        font-size:clamp(30px,4.2vw,48px)!important;
        line-height:.96!important;
        overflow-wrap:anywhere;
      }

      .bento.sl-position-metrics-grid{
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
      }

      .sl-position-role-fits-clean .card-b{
        padding-top:18px;
        padding-bottom:18px;
      }

      .sl-position-role-fits-clean .sl-position-role-row:last-child{
        margin-bottom:0!important;
      }

      @media (max-width:760px){
        .sl-position-verdict-wide{
          min-height:110px;
        }

        .sl-position-verdict-wide strong{
          font-size:30px!important;
        }

        .bento.sl-position-metrics-grid{
          grid-template-columns:1fr!important;
        }
      }
    `;

    shadow.appendChild(style);
  }

  function tileLabel(tile) {
    var label = tile && tile.querySelector('.lbl');
    return text(label && label.textContent).toLowerCase();
  }

  function findPositionMetricsGrid(shadow) {
    return Array.from(shadow.querySelectorAll('.bento')).find(function (grid) {
      var labels = Array.from(grid.children).map(tileLabel);

      return labels.indexOf('best current position') !== -1 &&
        labels.indexOf('target position') !== -1 &&
        labels.indexOf('gap vs best') !== -1 &&
        labels.indexOf('verdict') !== -1;
    }) || shadow.querySelector('.bento.sl-position-metrics-grid');
  }

  function indexInParent(node) {
    if (!node || !node.parentElement) return -1;
    return Array.prototype.indexOf.call(
      node.parentElement.children,
      node
    );
  }

  function placeBefore(node, reference) {
    if (
      !node ||
      !reference ||
      !reference.parentElement ||
      node === reference
    ) {
      return false;
    }

    if (
      node.parentElement === reference.parentElement &&
      node.nextElementSibling === reference
    ) {
      return false;
    }

    reference.parentElement.insertBefore(node, reference);
    return true;
  }

  function arrangeVerdictAndMetrics(shadow) {
    var grid = findPositionMetricsGrid(shadow);
    if (!grid) return false;

    var changed = false;

    if (!grid.classList.contains('sl-position-metrics-grid')) {
      grid.classList.add('sl-position-metrics-grid');
      changed = true;
    }

    var children = Array.from(grid.children);

    var best = children.find(function (tile) {
      return tileLabel(tile) === 'best current position';
    });

    var target = children.find(function (tile) {
      return tileLabel(tile) === 'target position';
    });

    var gap = children.find(function (tile) {
      return tileLabel(tile) === 'gap vs best';
    });

    var verdict = children.find(function (tile) {
      return tileLabel(tile) === 'verdict';
    }) || shadow.querySelector('.sl-position-verdict-wide');

    if (verdict) {
      if (!verdict.classList.contains('sl-position-verdict-wide')) {
        verdict.classList.add('sl-position-verdict-wide');
        changed = true;
      }

      if (verdict.parentElement === grid) {
        var hero = shadow.querySelector('.profile-hero');

        if (
          hero &&
          hero.parentElement &&
          grid.parentElement === hero.parentElement
        ) {
          /*
           * Only move the verdict when it is genuinely still inside the
           * metrics grid. Once outside, later refreshes leave it alone.
           */
          hero.parentElement.insertBefore(verdict, grid);
          changed = true;
        }
      }
    }

    /*
     * Keep the three metric tiles in a deterministic order without repeatedly
     * appendChild()-ing nodes that are already in that order.
     */
    var ordered = [best, target, gap].filter(Boolean);

    if (ordered.length) {
      var currentOrdered = Array.from(grid.children)
        .filter(function (tile) {
          var label = tileLabel(tile);
          return label === 'best current position' ||
            label === 'target position' ||
            label === 'gap vs best';
        });

      var sameOrder =
        currentOrdered.length === ordered.length &&
        currentOrdered.every(function (tile, index) {
          return tile === ordered[index];
        });

      if (!sameOrder) {
        ordered.forEach(function (tile) {
          grid.appendChild(tile);
        });
        changed = true;
      }
    }

    return changed;
  }

  function parseRoleRow(row) {
    if (!row) return null;

    var bold =
      row.querySelector('.who b') ||
      row.querySelector('b') ||
      row.querySelector('strong');

    var raw = text(bold && bold.textContent);
    if (!raw) return null;

    var match = raw.match(
      /^(.*?)(?:\s*[·•]\s*)(-?\d+(?:\.\d+)?)$/
    );

    if (match) {
      return {
        label: text(match[1]),
        score: text(match[2])
      };
    }

    var scoreNode =
      row.querySelector('strong') ||
      row.querySelector('[data-score]');

    var score = text(scoreNode && scoreNode.textContent);

    return {
      label: raw,
      score: score || '—'
    };
  }

  function roleRows(roleCard) {
    var body = roleCard && roleCard.querySelector('.card-b');
    if (!body) return [];

    return Array.from(body.children)
      .map(parseRoleRow)
      .filter(Boolean)
      .slice(0, 5);
  }

  function comparisonRowTemplate(shadow) {
    var comparisonCard = cardByHeading(
      shadow,
      /^Position rating comparison$/i
    );

    var body =
      comparisonCard &&
      comparisonCard.querySelector('.card-b');

    return body && body.firstElementChild
      ? body.firstElementChild
      : null;
  }

  function setRowContent(row, label, score) {
    var labelNode =
      row.querySelector('label') ||
      row.querySelector('.who b') ||
      row.querySelector('span');

    var scoreNode =
      row.querySelector('strong') ||
      row.querySelector('b:last-child');

    if (labelNode) labelNode.textContent = label;
    if (scoreNode) scoreNode.textContent = score;

    var bar = row.querySelector('.track i');
    var numericScore = Number(score);

    if (bar && Number.isFinite(numericScore)) {
      bar.style.width =
        Math.max(0, Math.min(100, numericScore)) + '%';
    }

    row.classList.add('sl-position-role-row');
    return row;
  }

  function cleanRoleFits(shadow) {
    var roleCard = Array.from(
      shadow.querySelectorAll('.card')
    ).find(function (card) {
      return /^Top .* role fits$/i.test(
        cardHeading(card)
      );
    });

    if (!roleCard) return false;

    if (
      roleCard.dataset.positionRoleLayout ===
      'clean-v2'
    ) {
      return false;
    }

    var roles = roleRows(roleCard);
    if (!roles.length) return false;

    var body = roleCard.querySelector('.card-b');
    if (!body) return false;

    var template = comparisonRowTemplate(shadow);

    /*
     * Build off-DOM first. This means the body is replaced once rather than
     * repeatedly mutating it while the observer is active.
     */
    var fragment = document.createDocumentFragment();

    roles.forEach(function (role) {
      var row;

      if (template) {
        row = template.cloneNode(true);
        row = setRowContent(
          row,
          role.label,
          role.score
        );
      } else {
        row = document.createElement('div');
        row.className =
          'sl-result-row sl-position-role-row';

        var left = document.createElement('span');
        left.textContent = role.label;

        var right = document.createElement('b');
        right.textContent = role.score;

        row.appendChild(left);
        row.appendChild(right);
      }

      fragment.appendChild(row);
    });

    body.replaceChildren(fragment);

    roleCard.classList.add(
      'sl-position-role-fits-clean'
    );
    roleCard.dataset.positionRoleLayout =
      'clean-v2';

    return true;
  }

  function observeShadow(shadow) {
    if (!observer || !shadow) return;

    if (observedShadow === shadow) return;

    observer.disconnect();
    observedShadow = shadow;

    observer.observe(shadow, {
      childList: true,
      subtree: true
    });
  }

  function refresh() {
    var shadow = appShadow();
    if (!shadow) return;

    observeShadow(shadow);

    if (!isPositionResult(shadow)) return;
    if (refreshing) return;

    refreshing = true;

    /*
     * Disconnect while we make our own layout mutations. This is the central
     * fix for the production blank/frozen result screen.
     */
    if (observer) observer.disconnect();

    try {
      ensureStyles(shadow);
      arrangeVerdictAndMetrics(shadow);
      cleanRoleFits(shadow);
    } catch (error) {
      /*
       * This script is visual enhancement only. A layout error must never
       * prevent the underlying prediction result from remaining usable.
       */
      console.warn(
        '[ScoutLink Position Fit layout]',
        error && error.message
          ? error.message
          : error
      );
    } finally {
      refreshing = false;
      observedShadow = null;
      observeShadow(shadow);
    }
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;

    requestAnimationFrame(function () {
      refreshQueued = false;
      refresh();
    });
  }

  function begin() {
    observer = new MutationObserver(function () {
      if (!refreshing) scheduleRefresh();
    });

    var startedAt = Date.now();

    var poll = setInterval(function () {
      var shadow = appShadow();

      if (shadow) {
        observeShadow(shadow);
        scheduleRefresh();
      }

      /*
       * The observer is sufficient once the Shadow DOM exists. The bounded
       * poll only covers late initialisation and never runs forever.
       */
      if (
        shadow ||
        Date.now() - startedAt > 15000
      ) {
        clearInterval(poll);
      }
    }, 100);

    scheduleRefresh();
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

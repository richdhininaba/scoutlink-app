'use strict';

/**
 * Target path:
 * apps/scoutlink-web/js/scout-prediction-position-layout-v1.js
 *
 * Position Fit result-only layout refinement.
 *
 * - Verdict becomes a full-width card beneath the green result hero.
 * - Best current position, target position and gap vs best stay beneath it.
 * - Top position role fits are capped at five and rendered using the same
 *   row structure/style as Position rating comparison.
 * - No scoring, prediction, AI, credit or API behaviour is changed.
 */

(function () {
  if (window.__SCOUTLINK_PREDICTION_POSITION_LAYOUT_V1__) return;
  window.__SCOUTLINK_PREDICTION_POSITION_LAYOUT_V1__ = true;

  var refreshQueued = false;
  var observer = new MutationObserver(function () {
    scheduleRefresh();
  });

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
      Boolean(cardByHeading(shadow, /^Position rating comparison$/i));
  }

  function ensureStyles(shadow) {
    if (shadow.getElementById('slPredictionPositionLayoutV1Style')) return;

    var style = document.createElement('style');
    style.id = 'slPredictionPositionLayoutV1Style';
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
    }) || null;
  }

  function arrangeVerdictAndMetrics(shadow) {
    var grid = findPositionMetricsGrid(shadow);

    if (!grid) {
      grid = shadow.querySelector('.bento.sl-position-metrics-grid');
    }
    if (!grid) return;

    grid.classList.add('sl-position-metrics-grid');

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
    });

    [best, target, gap].forEach(function (tile) {
      if (tile && tile.parentElement === grid) {
        grid.appendChild(tile);
      }
    });

    if (!verdict) {
      verdict = shadow.querySelector('.sl-position-verdict-wide');
    }

    if (verdict && verdict.parentElement === grid) {
      verdict.classList.add('sl-position-verdict-wide');

      var hero = shadow.querySelector('.profile-hero');
      if (hero && hero.parentElement) {
        hero.parentElement.insertBefore(verdict, grid);
      }
    } else if (verdict) {
      verdict.classList.add('sl-position-verdict-wide');
    }
  }

  function parseRoleRow(row) {
    if (!row) return null;

    var bold =
      row.querySelector('.who b') ||
      row.querySelector('b') ||
      row.querySelector('strong');

    var raw = text(bold && bold.textContent);
    if (!raw) return null;

    var match = raw.match(/^(.*?)(?:\s*[·•]\s*)(-?\d+(?:\.\d+)?)$/);

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

    var body = comparisonCard && comparisonCard.querySelector('.card-b');
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
    var roleCard = Array.from(shadow.querySelectorAll('.card')).find(
      function (card) {
        return /^Top .* role fits$/i.test(cardHeading(card));
      }
    );

    if (!roleCard) return;
    if (roleCard.dataset.positionRoleLayout === 'clean') return;

    var roles = roleRows(roleCard);
    if (!roles.length) return;

    var body = roleCard.querySelector('.card-b');
    if (!body) return;

    var template = comparisonRowTemplate(shadow);

    body.innerHTML = '';

    roles.forEach(function (role) {
      var row;

      if (template) {
        row = template.cloneNode(true);
        row = setRowContent(row, role.label, role.score);
      } else {
        row = document.createElement('div');
        row.className = 'sl-result-row sl-position-role-row';

        var left = document.createElement('span');
        left.textContent = role.label;

        var right = document.createElement('b');
        right.textContent = role.score;

        row.appendChild(left);
        row.appendChild(right);
      }

      body.appendChild(row);
    });

    roleCard.classList.add('sl-position-role-fits-clean');
    roleCard.dataset.positionRoleLayout = 'clean';
  }

  function refresh() {
    var shadow = appShadow();
    if (!shadow) return;
    if (!isPositionResult(shadow)) return;

    ensureStyles(shadow);
    arrangeVerdictAndMetrics(shadow);
    cleanRoleFits(shadow);
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;

    queueMicrotask(function () {
      refreshQueued = false;
      refresh();
    });
  }

  function begin() {
    var host = document.getElementById('scoutExperienceApp');
    if (!host) return;

    observer.observe(host, {
      childList: true,
      subtree: true
    });

    var poll = setInterval(function () {
      var shadow = appShadow();
      if (!shadow) return;

      clearInterval(poll);

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
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }
})();

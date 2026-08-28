'use strict';

/**
 * Target path: apps/scoutlink-web/js/scout-prediction-ai-v1.js
 *
 * Prediction mode, AI context and result-presentation layer.
 *
 * This version intentionally DOES NOT remove optional prediction inputs.
 * ROI cost assumptions are useful inputs and must reach the backend.
 * Long narrative values are removed from metric tiles and shown full-width.
 */

(function () {
  if (window.__SCOUTLINK_PREDICTION_AI_V2__) return;
  window.__SCOUTLINK_PREDICTION_AI_V2__ = true;

  var DATA_ONLY_COST = 1;
  var AI_COST = 8;
  var selectedMode = 'data';
  var creditsRemaining = null;
  var lastRunMeta = null;
  var latestPredictionRows = [];
  var nativeFetch = window.fetch.bind(window);
  var observer = null;
  var observedShadow = null;
  var refreshQueued = false;
  var refreshing = false;
  var analysisBrief = '';

  var ROI_FOCUS_OPTIONS = [
    'Evidence-led value review',
    'Long-term Football Value Index outlook',
    'Recruitment upside',
    'Development investment scenario',
    'Cost-to-upside scenario',
    'Retention / progression value',
    'Downside / risk review'
  ];

  var LONG_TILE_LABELS = new Set([
    'recommendation',
    'recruitment implication',
    'prediction',
    'prediction summary',
    'predicted behaviour',
    'tactical note',
    'value outlook',
    'role projection'
  ]);

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

  function isPredictionRun(url, method) {
    return method === 'POST' &&
      /\/api\/predictions\/run(?:\?|$)/.test(url);
  }

  function isPredictionList(url, method) {
    return method === 'GET' &&
      /\/api\/predictions(?:\?|$)/.test(url) &&
      !/\/run(?:\?|$)/.test(url);
  }

  function safeObject(value) {
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value)
        ? value
        : {};
  }

  function cleanText(value, max) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 1200);
  }

  function withModeInBody(bodyText) {
    if (!bodyText || typeof bodyText !== 'string') return bodyText;

    try {
      var body = JSON.parse(bodyText);
      var params = safeObject(body.inputParams);
      var brief = cleanText(params.analysisBrief || analysisBrief, 900);
      var type = String(body.predictionType || '');

      body.analysisMode = selectedMode === 'ai' ? 'ai' : 'data';

      /*
       * Keep every legitimate ScoutLink input. The previous runtime stripped
       * target-role and financial inputs before the request was sent, which
       * prevented ROI scenarios and reduced AI personalisation.
       */
      body.inputParams = Object.assign({}, params);

      if (brief) {
        body.inputParams.analysisBrief = brief;

        /*
         * The current predictions route already forwards `goal`/`financialGoal`
         * to the AI payload. Use that existing transport so the scout's open
         * question reaches AI without changing any deterministic calculation.
         */
        if (/ROI Analysis|Return on Investment|Value \/ ROI/i.test(type)) {
          var focus = cleanText(
            body.inputParams.financialGoal ||
            body.inputParams.goal ||
            'Evidence-led value review',
            220
          );

          body.inputParams.financialGoal =
            focus + ' | Scout question: ' + brief;
        } else {
          body.inputParams.goal = brief;
        }
      }

      return JSON.stringify(body);
    } catch (_) {
      return bodyText;
    }
  }

  async function interceptInput(input, init, url, method) {
    if (!isPredictionRun(url, method)) {
      return { input: input, init: init };
    }

    if (init && typeof init.body === 'string') {
      return {
        input: input,
        init: Object.assign({}, init, {
          body: withModeInBody(init.body)
        })
      };
    }

    if (
      typeof Request !== 'undefined' &&
      input instanceof Request
    ) {
      try {
        var bodyText = await input.clone().text();
        var nextRequest = new Request(input, {
          body: withModeInBody(bodyText)
        });
        return { input: nextRequest, init: init };
      } catch (_) {
        return { input: input, init: init };
      }
    }

    return { input: input, init: init };
  }

  function rememberPredictionList(payload) {
    if (!payload || typeof payload !== 'object') return;

    if (Number.isFinite(Number(payload.remaining))) {
      creditsRemaining = Number(payload.remaining);
    }

    if (payload.costs) {
      if (Number.isFinite(Number(payload.costs.dataOnly))) {
        DATA_ONLY_COST = Number(payload.costs.dataOnly);
      }
      if (Number.isFinite(Number(payload.costs.aiEnhanced))) {
        AI_COST = Number(payload.costs.aiEnhanced);
      }
    }

    latestPredictionRows = Array.isArray(payload.data)
      ? payload.data
      : latestPredictionRows;

    updateChooser();
  }

  function rememberPredictionRun(payload) {
    if (!payload || typeof payload !== 'object') return;

    if (Number.isFinite(Number(payload.creditsRemaining))) {
      creditsRemaining = Number(payload.creditsRemaining);
    }
    if (Number.isFinite(Number(payload.dataOnlyCost))) {
      DATA_ONLY_COST = Number(payload.dataOnlyCost);
    }
    if (Number.isFinite(Number(payload.aiCost))) {
      AI_COST = Number(payload.aiCost);
    }

    lastRunMeta = {
      logId: payload.logId || null,
      analysisMode:
        payload.analysisMode ||
        (payload.result && payload.result.analysisMode) ||
        'data',
      requestedAnalysisMode:
        payload.requestedAnalysisMode ||
        selectedMode,
      creditCost: Number(
        payload.creditCost ||
        (payload.result && payload.result.usageCredits) ||
        DATA_ONLY_COST
      ),
      fallback: Boolean(
        payload.aiFallback ||
        (payload.result && payload.result.aiStatus === 'fallback')
      ),
      fallbackReason:
        payload.result &&
        payload.result.aiFallbackReason ||
        '',
      result: payload.result || null
    };
  }

  window.fetch = async function (input, init) {
    var url = requestUrl(input);
    var method = requestMethod(input, init);
    var intercepted =
      await interceptInput(input, init, url, method);

    var response =
      await nativeFetch(intercepted.input, intercepted.init);

    if (
      response &&
      response.ok &&
      (isPredictionList(url, method) ||
       isPredictionRun(url, method))
    ) {
      try {
        response.clone().json().then(function (payload) {
          if (isPredictionList(url, method)) {
            rememberPredictionList(payload);
          }
          if (isPredictionRun(url, method)) {
            rememberPredictionRun(payload);
          }
          scheduleRefresh();
        }).catch(function () {});
      } catch (_) {}
    }

    return response;
  };

  function appShadow() {
    var host = document.getElementById('scoutExperienceApp');
    return host && host.shadowRoot
      ? host.shadowRoot
      : null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function runButton(shadow) {
    return shadow.querySelector(
      '[data-action="prediction-run"]'
    ) || Array.from(
      shadow.querySelectorAll('button')
    ).find(function (button) {
      return /run prediction/i.test(button.textContent || '');
    }) || null;
  }

  function currentPredictionType(shadow) {
    var heading = shadow.querySelector('.profile-hero .lbl');
    var heroType = String(heading && heading.textContent || '');
    if (/ROI Analysis/i.test(heroType)) return 'ROI Analysis';
    if (/Position Fit/i.test(heroType)) return 'Position Fit Projection';
    if (/Match Scenario/i.test(heroType)) return 'Match Scenario Prediction';
    if (/Attribute Development/i.test(heroType)) return 'Attribute Development';

    var roiField = shadow.querySelector('[data-pred-field="financialGoal"]');
    if (roiField) return 'ROI Analysis';

    return '';
  }

  function ensureStyles(shadow) {
    if (shadow.getElementById('slPredictionAiV2Styles')) return;

    var style = document.createElement('style');
    style.id = 'slPredictionAiV2Styles';
    style.textContent = `
      .sl-analysis-brief-wrap{
        margin-top:14px;
      }

      .sl-analysis-brief-wrap textarea{
        min-height:104px;
        resize:vertical;
        line-height:1.5;
      }

      .sl-long-output-zone{
        display:grid;
        grid-template-columns:1fr;
        gap:12px;
        margin-top:14px;
        width:100%;
      }

      .sl-long-output-card{
        width:100%;
        box-sizing:border-box;
        border:1px solid var(--line);
        background:#fff;
        border-radius:18px;
        padding:20px 22px;
        box-shadow:0 1px 0 rgba(6,32,26,.02);
      }

      .sl-long-output-card .lbl{
        display:block;
        margin-bottom:8px;
      }

      .sl-long-output-card strong{
        display:block;
        max-width:100%;
        font-family:var(--sans)!important;
        font-size:17px!important;
        font-weight:700!important;
        line-height:1.45!important;
        letter-spacing:0!important;
        text-transform:none!important;
        overflow-wrap:anywhere;
      }

      .bento.sl-compact-bento-3{
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
      }

      .bento.sl-compact-bento-2{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
      }

      .bento.sl-compact-bento-1{
        grid-template-columns:1fr!important;
      }

      .sl-ai-detail-card{
        margin-top:14px;
      }

      .sl-ai-detail-block + .sl-ai-detail-block{
        margin-top:18px;
        padding-top:18px;
        border-top:1px solid var(--line);
      }

      .sl-ai-detail-block h4{
        margin:0 0 7px;
        font:800 11px var(--sans);
        text-transform:uppercase;
        letter-spacing:.06em;
        color:var(--ink3);
      }

      .sl-ai-detail-block p{
        margin:0;
        font-size:14px;
        line-height:1.65;
        color:var(--ink);
      }

      .sl-ai-driver-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }

      .sl-ai-driver{
        border:1px solid var(--line);
        border-radius:14px;
        padding:14px;
        background:var(--paper,#fff);
      }

      .sl-ai-driver b{
        display:block;
        font-size:12px;
        margin-bottom:5px;
      }

      .sl-ai-driver span{
        display:block;
        font-size:12px;
        line-height:1.55;
        color:var(--ink2,var(--ink));
      }

      @media (max-width:760px){
        .bento.sl-compact-bento-3,
        .bento.sl-compact-bento-2{
          grid-template-columns:1fr!important;
        }

        .sl-ai-driver-grid{
          grid-template-columns:1fr;
        }

        .sl-long-output-card{
          padding:17px;
        }

        .sl-long-output-card strong{
          font-size:15px!important;
        }
      }
    `;

    shadow.appendChild(style);
  }

  function replaceRoiFocusInput(shadow) {
    var field = shadow.querySelector('[data-pred-field="financialGoal"]');
    if (!field || field.tagName === 'SELECT') return false;

    var current = cleanText(field.value, 220) || ROI_FOCUS_OPTIONS[0];
    var select = document.createElement('select');
    select.className = field.className || 'in';
    select.setAttribute('data-pred-field', 'financialGoal');

    var values = ROI_FOCUS_OPTIONS.slice();
    if (current && values.indexOf(current) === -1) {
      values.unshift(current);
    }

    values.forEach(function (value) {
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      if (value === current) option.selected = true;
      select.appendChild(option);
    });

    field.replaceWith(select);

    var container = select.closest('.field');
    var label = container && container.querySelector('label');
    if (label) label.textContent = 'Analysis focus';

    return true;
  }

  function ensureAnalysisBrief(shadow) {
    var stepField = shadow.querySelector('[data-pred-field]');
    if (!stepField) return false;

    var wizardBody =
      stepField.closest('.wizard-body > div') ||
      stepField.closest('.wizard-body') ||
      stepField.closest('.pbody');

    if (!wizardBody) return false;

    var existing = wizardBody.querySelector(
      '[data-pred-field="analysisBrief"]'
    );

    if (existing) {
      if (analysisBrief && existing.value !== analysisBrief) {
        existing.value = analysisBrief;
      }
      return false;
    }

    /* Do not add this to the player/model selection step. */
    var hasPredictionSpecificField = Array.from(
      wizardBody.querySelectorAll('[data-pred-field]')
    ).some(function (field) {
      var key = field.getAttribute('data-pred-field');
      return key && key !== 'playerId' && key !== 'predictionType';
    });

    if (!hasPredictionSpecificField) return false;

    var wrap = document.createElement('div');
    wrap.className = 'field sl-analysis-brief-wrap';
    wrap.innerHTML =
      '<label>Scout question / context <em>Optional</em></label>' +
      '<textarea class="in" data-pred-field="analysisBrief" ' +
      'placeholder="e.g. Is this player a realistic fit for how we play, and what should I verify live?">' +
      escapeHtml(analysisBrief) +
      '</textarea>' +
      '<small class="mut" style="display:block;margin-top:6px">AI enhanced uses this question together with the player profile, your selected prediction input and the Scout team setup.</small>';

    var grid = wizardBody.querySelector('.sl-pred-input-grid');
    if (grid && grid.parentElement) {
      grid.parentElement.insertBefore(wrap, grid.nextSibling);
    } else {
      var nav = runButton(shadow);
      var navigation = nav && (nav.closest('.flex') || nav.parentElement);
      if (navigation && navigation.parentElement === wizardBody) {
        wizardBody.insertBefore(wrap, navigation);
      } else {
        wizardBody.appendChild(wrap);
      }
    }

    return true;
  }

  function rememberBriefFromDom(shadow) {
    var field = shadow.querySelector('[data-pred-field="analysisBrief"]');
    if (!field) return;
    analysisBrief = cleanText(field.value, 900);
  }

  function chooserMarkup() {
    var aiUnavailable =
      creditsRemaining !== null &&
      creditsRemaining < AI_COST;

    var balance =
      creditsRemaining === null
        ? ''
        : '<span style="font:700 10px var(--mono);color:var(--ink3)">' +
          escapeHtml(creditsRemaining) +
          ' prediction credits remaining</span>';

    function option(mode, title, cost, description, disabled) {
      var on = selectedMode === mode;

      return (
        '<button type="button" ' +
          'data-prediction-analysis-choice="' + mode + '" ' +
          'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
          (disabled ? 'disabled aria-disabled="true" ' : '') +
          'style="' +
            'text-align:left;' +
            'width:100%;' +
            'padding:15px;' +
            'border-radius:14px;' +
            'border:' +
              (on ? '2px solid var(--pitch)' : '1px solid var(--line)') + ';' +
            'background:' +
              (on ? 'var(--mint)' : '#fff') + ';' +
            'color:var(--ink);' +
            'cursor:' +
              (disabled ? 'not-allowed' : 'pointer') + ';' +
            'opacity:' +
              (disabled ? '.55' : '1') +
          '">' +
          '<div style="display:flex;gap:10px;align-items:center">' +
            '<span style="width:18px;height:18px;border-radius:50%;border:2px solid var(--pitch);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">' +
              (on
                ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--pitch)"></span>'
                : '') +
            '</span>' +
            '<span style="min-width:0;flex:1">' +
              '<b style="display:block;font-size:13px">' +
                escapeHtml(title) +
              '</b>' +
              '<small style="display:block;color:var(--ink3);font-size:10.5px;line-height:1.45;margin-top:3px">' +
                escapeHtml(description) +
              '</small>' +
            '</span>' +
            '<span class="pill ' +
              (mode === 'ai' ? 'g' : '') +
              '" style="white-space:nowrap">' +
              escapeHtml(cost) +
              ' credit' +
              (cost === 1 ? '' : 's') +
            '</span>' +
          '</div>' +
        '</button>'
      );
    }

    return (
      '<div class="card sl-prediction-ai-choice" style="margin-top:16px">' +
        '<div class="card-h">' +
          '<h3>Choose prediction analysis</h3>' +
          '<span class="sp"></span>' +
          balance +
        '</div>' +
        '<div class="card-b">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">' +
            option(
              'data',
              'Data only',
              DATA_ONLY_COST,
              'ScoutLink calculations and data-model narrative. No OpenAI call is made.',
              false
            ) +
            option(
              'ai',
              'AI enhanced',
              AI_COST,
              aiUnavailable
                ? 'You need at least ' + AI_COST + ' prediction credits. Data only remains available.'
                : 'Uses the same fixed ScoutLink numbers, then writes a personalised football analysis around your team setup and the question you supplied.',
              aiUnavailable
            ) +
          '</div>' +
          '<div class="callout g" style="margin-top:12px">' +
            '<span><b>AI never changes the scores.</b> It changes the interpretation, recommendation, tactical context, risks and live checks. If AI cannot complete, ScoutLink returns the data-only report and charges only ' +
            escapeHtml(DATA_ONLY_COST) +
            ' credit.</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function installChooser(shadow) {
    var button = runButton(shadow);
    if (!button) return false;

    if (shadow.querySelector('.sl-prediction-ai-choice')) {
      return false;
    }

    var navigation = button.closest('.flex') || button.parentElement;
    var body =
      button.closest('.wizard-body > div') ||
      button.closest('.wizard-body') ||
      button.closest('.pbody');

    if (!body || !navigation) return false;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = chooserMarkup();
    var chooser = wrapper.firstElementChild;

    body.insertBefore(chooser, navigation);
    return true;
  }

  function updateChooser() {
    var shadow = appShadow();
    if (!shadow) return;

    var existing = shadow.querySelector('.sl-prediction-ai-choice');

    if (!existing) {
      installChooser(shadow);
      return;
    }

    var wrapper = document.createElement('div');
    wrapper.innerHTML = chooserMarkup();
    existing.replaceWith(wrapper.firstElementChild);
  }

  function findExecutiveSummaryCard(shadow) {
    return Array.from(shadow.querySelectorAll('.card')).find(function (card) {
      var heading = card.querySelector('.card-h h3');
      return heading &&
        /executive summary/i.test(heading.textContent || '');
    }) || null;
  }

  function currentResultFromHistory(shadow) {
    var card = findExecutiveSummaryCard(shadow);
    var para = card && card.querySelector('.sl-result-copy, p');
    var summary = cleanText(para && para.textContent, 2400);
    if (!summary) return null;

    var exact = latestPredictionRows.find(function (row) {
      return cleanText(row && row.result && row.result.summary, 2400) === summary;
    });

    return exact && exact.result || null;
  }

  function activeResult(shadow) {
    return lastRunMeta && lastRunMeta.result
      ? lastRunMeta.result
      : currentResultFromHistory(shadow);
  }

  function tileLabel(cell) {
    var label = cell && cell.querySelector('.lbl');
    return cleanText(label && label.textContent, 120).toLowerCase();
  }

  function tileValue(cell) {
    var strong = cell && cell.querySelector('strong');
    return cleanText(strong && strong.textContent, 2400);
  }

  function isPositionMetricsGrid(grid) {
    var labels = Array.from(grid.children).map(tileLabel);
    return labels.indexOf('best current position') !== -1 &&
      labels.indexOf('target position') !== -1 &&
      labels.indexOf('gap vs best') !== -1;
  }

  function longTile(cell) {
    var label = tileLabel(cell);
    var value = tileValue(cell);

    if (!value) return false;
    if (LONG_TILE_LABELS.has(label)) return true;

    /* Suitability/risks can be compact labels or prose. Only expand the prose. */
    return value.length > 62;
  }

  function createLongCard(cell) {
    var card = document.createElement('div');
    card.className = 'sl-long-output-card';

    var label = document.createElement('span');
    label.className = 'lbl';
    label.textContent =
      (cell.querySelector('.lbl') || {}).textContent || 'Analysis';

    var value = document.createElement('strong');
    value.textContent =
      (cell.querySelector('strong') || {}).textContent || '—';

    card.appendChild(label);
    card.appendChild(value);
    return card;
  }

  function updateCompactGridClass(grid) {
    grid.classList.remove(
      'sl-compact-bento-1',
      'sl-compact-bento-2',
      'sl-compact-bento-3'
    );

    var count = Array.from(grid.children).filter(function (node) {
      return node.classList && node.classList.contains('bento-cell');
    }).length;

    if (count <= 1) grid.classList.add('sl-compact-bento-1');
    else if (count === 2) grid.classList.add('sl-compact-bento-2');
    else if (count === 3) grid.classList.add('sl-compact-bento-3');
  }

  function normaliseLongBento(shadow) {
    var changed = false;

    Array.from(shadow.querySelectorAll('.bento')).forEach(function (grid) {
      if (isPositionMetricsGrid(grid)) return;

      var cells = Array.from(grid.children).filter(function (node) {
        return node.classList && node.classList.contains('bento-cell');
      });

      var toMove = cells.filter(longTile);
      if (!toMove.length) {
        updateCompactGridClass(grid);
        return;
      }

      var zone = grid.nextElementSibling;
      if (!zone || !zone.classList.contains('sl-long-output-zone')) {
        zone = document.createElement('div');
        zone.className = 'sl-long-output-zone';
        grid.parentElement.insertBefore(zone, grid.nextSibling);
        changed = true;
      }

      toMove.forEach(function (cell) {
        var key = tileLabel(cell) || 'analysis';
        var existing = Array.from(zone.children).find(function (card) {
          return card.getAttribute('data-long-output-key') === key;
        });

        if (existing) {
          var existingStrong = existing.querySelector('strong');
          if (existingStrong) existingStrong.textContent = tileValue(cell);
        } else {
          var card = createLongCard(cell);
          card.setAttribute('data-long-output-key', key);
          zone.appendChild(card);
        }

        cell.remove();
        changed = true;
      });

      updateCompactGridClass(grid);
    });

    return changed;
  }

  function aiDetailBlocks(result) {
    if (!result || result.analysisMode !== 'ai') return [];

    var ai = safeObject(result.aiAnalysis);
    var blocks = [];

    if (result.roleProjection) {
      blocks.push(['Role projection', result.roleProjection]);
    }

    if (result.predictedBehaviour) {
      blocks.push(['Predicted behaviour', result.predictedBehaviour]);
    }

    if (result.tacticalNote) {
      blocks.push(['Tactical interpretation', result.tacticalNote]);
    }

    if (result.aiValueOutlook || ai.valueOutlook) {
      blocks.push([
        'Value outlook',
        result.aiValueOutlook || ai.valueOutlook
      ]);
    }

    return blocks.filter(function (row) {
      return cleanText(row[1], 2400);
    });
  }

  function renderAiDetailCard(shadow) {
    var result = activeResult(shadow);
    if (!result || result.analysisMode !== 'ai') return false;

    var summaryCard = findExecutiveSummaryCard(shadow);
    if (!summaryCard || !summaryCard.parentElement) return false;

    var existing = shadow.querySelector('.sl-ai-detail-card');
    if (existing) return false;

    var ai = safeObject(result.aiAnalysis);
    var blocks = aiDetailBlocks(result);
    var drivers = Array.isArray(ai.keyDrivers) ? ai.keyDrivers.slice(0, 5) : [];
    var risks = Array.isArray(ai.risks) ? ai.risks.slice(0, 4) : [];
    var checks = Array.isArray(ai.liveChecks) ? ai.liveChecks.slice(0, 5) : [];

    if (!blocks.length && !drivers.length && !risks.length && !checks.length) {
      return false;
    }

    var card = document.createElement('div');
    card.className = 'card sl-result-section sl-ai-detail-card';

    var html =
      '<div class="card-h"><h3>AI football analysis</h3><span class="sp"></span><span class="pill g">Personalised</span></div>' +
      '<div class="card-b">';

    blocks.forEach(function (row) {
      html +=
        '<div class="sl-ai-detail-block">' +
          '<h4>' + escapeHtml(row[0]) + '</h4>' +
          '<p>' + escapeHtml(row[1]) + '</p>' +
        '</div>';
    });

    if (drivers.length) {
      html +=
        '<div class="sl-ai-detail-block">' +
          '<h4>Key personalised drivers</h4>' +
          '<div class="sl-ai-driver-grid">' +
            drivers.map(function (driver) {
              return (
                '<div class="sl-ai-driver">' +
                  '<b>' + escapeHtml(driver.title || 'Key driver') + '</b>' +
                  '<span>' + escapeHtml(driver.explanation || '') + '</span>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    }

    if (risks.length) {
      html +=
        '<div class="sl-ai-detail-block">' +
          '<h4>Risks / uncertainty</h4>' +
          '<p>' + escapeHtml(risks.join(' • ')) + '</p>' +
        '</div>';
    }

    if (checks.length) {
      html +=
        '<div class="sl-ai-detail-block">' +
          '<h4>What to verify live</h4>' +
          '<p>' + escapeHtml(checks.join(' • ')) + '</p>' +
        '</div>';
    }

    html += '</div>';
    card.innerHTML = html;

    summaryCard.parentElement.insertBefore(card, summaryCard.nextSibling);
    return true;
  }

  function decorateResultBadge(shadow) {
    if (!lastRunMeta) return false;

    var hero = shadow.querySelector('.profile-hero');
    if (!hero) return false;

    if (hero.querySelector('.sl-prediction-mode-badge')) {
      return false;
    }

    var label =
      lastRunMeta.fallback
        ? 'AI fallback · Data only · ' +
          lastRunMeta.creditCost +
          ' credit'
        : lastRunMeta.analysisMode === 'ai'
          ? 'AI enhanced · ' +
            lastRunMeta.creditCost +
            ' credits'
          : 'Data only · ' +
            lastRunMeta.creditCost +
            ' credit';

    var badge = document.createElement('div');
    badge.className = 'sl-prediction-mode-badge';
    badge.style.cssText =
      'display:inline-flex;' +
      'margin-top:10px;' +
      'padding:5px 9px;' +
      'border-radius:999px;' +
      'background:rgba(255,255,255,.12);' +
      'color:#fff;' +
      'font:700 9.5px var(--mono);' +
      'letter-spacing:.02em';
    badge.textContent = label;

    var content = hero.querySelector('div') || hero;
    content.appendChild(badge);

    if (lastRunMeta.fallback && lastRunMeta.fallbackReason) {
      var summaryCard = findExecutiveSummaryCard(shadow);
      var body =
        summaryCard &&
        (summaryCard.querySelector('.card-b') || summaryCard);

      if (body && !body.querySelector('.sl-ai-fallback-copy')) {
        var note = document.createElement('div');
        note.className = 'callout g sl-ai-fallback-copy';
        note.style.marginTop = '12px';
        note.innerHTML =
          '<span><b>AI fallback:</b> ' +
          escapeHtml(lastRunMeta.fallbackReason) +
          '</span>';
        body.appendChild(note);
      }
    }

    return true;
  }

  function installShadowEvents(shadow) {
    if (shadow.__predictionAiV2EventsInstalled) return;
    shadow.__predictionAiV2EventsInstalled = true;

    shadow.addEventListener('input', function (event) {
      var field = event.target.closest &&
        event.target.closest('[data-pred-field="analysisBrief"]');
      if (!field) return;
      analysisBrief = cleanText(field.value, 900);
    }, true);

    shadow.addEventListener('change', function (event) {
      var field = event.target.closest &&
        event.target.closest('[data-pred-field="analysisBrief"]');
      if (!field) return;
      analysisBrief = cleanText(field.value, 900);
    }, true);

    shadow.addEventListener('click', function (event) {
      var choice =
        event.target.closest &&
        event.target.closest('[data-prediction-analysis-choice]');

      if (choice) {
        event.preventDefault();
        if (choice.disabled) return;

        selectedMode =
          choice.getAttribute('data-prediction-analysis-choice') === 'ai'
            ? 'ai'
            : 'data';

        updateChooser();
        return;
      }

      var actionNode =
        event.target.closest &&
        event.target.closest('[data-action]');
      var action =
        actionNode &&
        actionNode.getAttribute('data-action');

      if (action === 'prediction-next-2' || action === 'prediction-run') {
        rememberBriefFromDom(shadow);
      }

      if (
        action === 'prediction-start' ||
        action === 'prediction-run-another'
      ) {
        selectedMode = 'data';
        lastRunMeta = null;
        analysisBrief = '';
      }
    }, true);
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
    if (!shadow || refreshing) return;

    refreshing = true;
    if (observer) observer.disconnect();

    try {
      ensureStyles(shadow);
      installShadowEvents(shadow);
      replaceRoiFocusInput(shadow);
      ensureAnalysisBrief(shadow);
      installChooser(shadow);
      normaliseLongBento(shadow);
      decorateResultBadge(shadow);
      renderAiDetailCard(shadow);
    } catch (error) {
      console.warn(
        '[ScoutLink prediction AI UI]',
        error && error.message ? error.message : error
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

    var host = document.getElementById('scoutExperienceApp');
    if (!host) return;

    observer.observe(host, {
      childList: true,
      subtree: true
    });

    var startedAt = Date.now();
    var shadowPoll = setInterval(function () {
      var shadow = appShadow();

      if (shadow) {
        observeShadow(shadow);
        scheduleRefresh();
      }

      if (shadow || Date.now() - startedAt > 15000) {
        clearInterval(shadowPoll);
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

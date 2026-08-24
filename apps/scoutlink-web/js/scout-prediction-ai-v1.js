'use strict';

/**
 * Target path: apps/scoutlink-web/js/scout-prediction-ai-v1.js
 * Prediction mode chooser for ScoutLink V9.
 *
 * Loaded before scout-experience-v9.js so it can add analysisMode to the
 * existing prediction request without duplicating or replacing the V9 runtime.
 */

(function () {
  if (window.__SCOUTLINK_PREDICTION_AI_V1__) return;
  window.__SCOUTLINK_PREDICTION_AI_V1__ = true;

  var DATA_ONLY_COST = 1;
  var AI_COST = 8;
  var selectedMode = 'data';
  var creditsRemaining = null;
  var lastRunMeta = null;
  var nativeFetch = window.fetch.bind(window);

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function requestMethod(input, init) {
    return String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  }

  function isPredictionRun(url, method) {
    return method === 'POST' && /\/api\/predictions\/run(?:\?|$)/.test(url);
  }

  function isPredictionList(url, method) {
    return method === 'GET' && /\/api\/predictions(?:\?|$)/.test(url) && !/\/run(?:\?|$)/.test(url);
  }

  function withModeInBody(bodyText) {
    if (!bodyText || typeof bodyText !== 'string') return bodyText;
    try {
      var body = JSON.parse(bodyText);
      body.analysisMode = selectedMode === 'ai' ? 'ai' : 'data';
      return JSON.stringify(body);
    } catch (_) {
      return bodyText;
    }
  }

  async function interceptInput(input, init, url, method) {
    if (!isPredictionRun(url, method)) return { input: input, init: init };

    if (init && typeof init.body === 'string') {
      return {
        input: input,
        init: Object.assign({}, init, { body: withModeInBody(init.body) })
      };
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      try {
        var bodyText = await input.clone().text();
        var nextRequest = new Request(input, { body: withModeInBody(bodyText) });
        return { input: nextRequest, init: init };
      } catch (_) {
        return { input: input, init: init };
      }
    }

    return { input: input, init: init };
  }

  function rememberPredictionList(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (Number.isFinite(Number(payload.remaining))) creditsRemaining = Number(payload.remaining);
    if (payload.costs) {
      if (Number.isFinite(Number(payload.costs.dataOnly))) DATA_ONLY_COST = Number(payload.costs.dataOnly);
      if (Number.isFinite(Number(payload.costs.aiEnhanced))) AI_COST = Number(payload.costs.aiEnhanced);
    }
    updateChooser();
  }

  function rememberPredictionRun(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (Number.isFinite(Number(payload.creditsRemaining))) creditsRemaining = Number(payload.creditsRemaining);
    if (Number.isFinite(Number(payload.dataOnlyCost))) DATA_ONLY_COST = Number(payload.dataOnlyCost);
    if (Number.isFinite(Number(payload.aiCost))) AI_COST = Number(payload.aiCost);
    lastRunMeta = {
      analysisMode: payload.analysisMode || (payload.result && payload.result.analysisMode) || 'data',
      requestedAnalysisMode: payload.requestedAnalysisMode || selectedMode,
      creditCost: Number(payload.creditCost || (payload.result && payload.result.usageCredits) || DATA_ONLY_COST),
      fallback: Boolean(payload.aiFallback || (payload.result && payload.result.aiStatus === 'fallback')),
      fallbackReason: payload.result && payload.result.aiFallbackReason || ''
    };
  }

  window.fetch = async function (input, init) {
    var url = requestUrl(input);
    var method = requestMethod(input, init);
    var intercepted = await interceptInput(input, init, url, method);
    var response = await nativeFetch(intercepted.input, intercepted.init);

    if (response && response.ok && (isPredictionList(url, method) || isPredictionRun(url, method))) {
      try {
        response.clone().json().then(function (payload) {
          if (isPredictionList(url, method)) rememberPredictionList(payload);
          if (isPredictionRun(url, method)) rememberPredictionRun(payload);
        }).catch(function () {});
      } catch (_) {}
    }

    return response;
  };

  function appShadow() {
    var host = document.getElementById('scoutExperienceApp');
    return host && host.shadowRoot ? host.shadowRoot : null;
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
    return shadow.querySelector('[data-action="prediction-run"]') ||
      Array.from(shadow.querySelectorAll('button')).find(function (button) {
        return /run prediction/i.test(button.textContent || '');
      }) || null;
  }

  function chooserMarkup() {
    var aiUnavailable = creditsRemaining !== null && creditsRemaining < AI_COST;
    var balance = creditsRemaining === null
      ? ''
      : '<span style="font:700 10px var(--mono);color:var(--ink3)">' + escapeHtml(creditsRemaining) + ' prediction credits remaining</span>';

    function option(mode, title, cost, description, disabled) {
      var on = selectedMode === mode;
      return '<button type="button" data-prediction-analysis-choice="' + mode + '" aria-pressed="' + (on ? 'true' : 'false') + '" ' + (disabled ? 'disabled aria-disabled="true"' : '') + ' style="text-align:left;width:100%;padding:15px;border-radius:14px;border:' + (on ? '2px solid var(--pitch)' : '1px solid var(--line)') + ';background:' + (on ? 'var(--mint)' : '#fff') + ';color:var(--ink);cursor:' + (disabled ? 'not-allowed' : 'pointer') + ';opacity:' + (disabled ? '.55' : '1') + '"><div style="display:flex;gap:10px;align-items:center"><span style="width:18px;height:18px;border-radius:50%;border:2px solid var(--pitch);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">' + (on ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--pitch)"></span>' : '') + '</span><span style="min-width:0;flex:1"><b style="display:block;font-size:13px">' + escapeHtml(title) + '</b><small style="display:block;color:var(--ink3);font-size:10.5px;line-height:1.45;margin-top:3px">' + escapeHtml(description) + '</small></span><span class="pill ' + (mode === 'ai' ? 'g' : '') + '" style="white-space:nowrap">' + escapeHtml(cost) + ' credit' + (cost === 1 ? '' : 's') + '</span></div></button>';
    }

    return '<div class="card sl-prediction-ai-choice" style="margin-top:16px"><div class="card-h"><h3>Choose prediction analysis</h3><span class="sp"></span>' + balance + '</div><div class="card-b"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">' +
      option('data', 'Data only', DATA_ONLY_COST, 'Enhanced ScoutLink calculations with a dynamic, paragraph-length executive summary. No OpenAI call is made.', false) +
      option('ai', 'AI enhanced', AI_COST, aiUnavailable ? 'You need at least ' + AI_COST + ' prediction credits. Data only remains available.' : 'Uses the same ScoutLink scores, then ChatGPT deeply enhances the executive summary, recruitment implication and football interpretation.', aiUnavailable) +
      '</div><div class="callout g" style="margin-top:12px"><span><b>Automatic fallback:</b> if the AI service is unavailable or cannot complete the analysis, ScoutLink returns the full data-only prediction and charges only ' + escapeHtml(DATA_ONLY_COST) + ' credit.</span></div></div></div>';
  }

  function installChooser() {
    var shadow = appShadow();
    if (!shadow) return;
    var button = runButton(shadow);
    if (!button) return;

    var existing = shadow.querySelector('.sl-prediction-ai-choice');
    if (existing) {
      updateChooser();
      return;
    }

    var navigation = button.closest('.flex') || button.parentElement;
    var body = button.closest('.wizard-body > div') || button.closest('.wizard-body') || button.closest('.pbody');
    if (!body || !navigation) return;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = chooserMarkup();
    var chooser = wrapper.firstElementChild;
    body.insertBefore(chooser, navigation);
  }

  function updateChooser() {
    var shadow = appShadow();
    if (!shadow) return;
    var existing = shadow.querySelector('.sl-prediction-ai-choice');
    if (!existing) return;
    var wrapper = document.createElement('div');
    wrapper.innerHTML = chooserMarkup();
    existing.replaceWith(wrapper.firstElementChild);
  }

  function decorateResult() {
    var shadow = appShadow();
    if (!shadow || !lastRunMeta) return;
    var hero = shadow.querySelector('.profile-hero');
    if (!hero) return;
    if (hero.querySelector('.sl-prediction-mode-badge')) return;

    var label = lastRunMeta.fallback
      ? 'AI fallback · Data only · ' + lastRunMeta.creditCost + ' credit'
      : lastRunMeta.analysisMode === 'ai'
        ? 'AI enhanced · ' + lastRunMeta.creditCost + ' credits'
        : 'Data only · ' + lastRunMeta.creditCost + ' credit';

    var badge = document.createElement('div');
    badge.className = 'sl-prediction-mode-badge';
    badge.style.cssText = 'display:inline-flex;margin-top:10px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font:700 9.5px var(--mono);letter-spacing:.02em';
    badge.textContent = label;
    var content = hero.querySelector('div') || hero;
    content.appendChild(badge);

    if (lastRunMeta.fallback && lastRunMeta.fallbackReason) {
      var summaryCard = Array.from(shadow.querySelectorAll('.card')).find(function (card) {
        var heading = card.querySelector('.card-h h3');
        return heading && /executive summary/i.test(heading.textContent || '');
      });
      var body = summaryCard && (summaryCard.querySelector('.card-b') || summaryCard);
      if (body && !body.querySelector('.sl-ai-fallback-copy')) {
        var note = document.createElement('div');
        note.className = 'callout g sl-ai-fallback-copy';
        note.style.marginTop = '12px';
        note.innerHTML = '<span><b>AI fallback:</b> ' + escapeHtml(lastRunMeta.fallbackReason) + '</span>';
        body.appendChild(note);
      }
    }
  }

  function installShadowEvents() {
    var shadow = appShadow();
    if (!shadow || shadow.__predictionAiEventsInstalled) return;
    shadow.__predictionAiEventsInstalled = true;

    shadow.addEventListener('click', function (event) {
      var choice = event.target.closest('[data-prediction-analysis-choice]');
      if (choice) {
        event.preventDefault();
        if (choice.disabled) return;
        selectedMode = choice.getAttribute('data-prediction-analysis-choice') === 'ai' ? 'ai' : 'data';
        updateChooser();
        return;
      }

      var actionNode = event.target.closest('[data-action]');
      var action = actionNode && actionNode.getAttribute('data-action');
      if (action === 'prediction-start' || action === 'prediction-run-another') {
        selectedMode = 'data';
        lastRunMeta = null;
      }
    }, true);
  }

  function refresh() {
    installShadowEvents();
    installChooser();
    decorateResult();
  }

  var observer = new MutationObserver(function () {
    refresh();
  });

  function begin() {
    var host = document.getElementById('scoutExperienceApp');
    if (!host) return;
    observer.observe(host, { childList: true, subtree: true });

    var shadowPoll = setInterval(function () {
      var shadow = appShadow();
      if (!shadow) return;
      clearInterval(shadowPoll);
      observer.observe(shadow, { childList: true, subtree: true });
      refresh();
    }, 50);

    setTimeout(function () {
      clearInterval(shadowPoll);
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }
})();

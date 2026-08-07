'use strict';

(function predictionOverlayV2Bootstrap() {
  if (window.ScoutPredictionOverlayV2) return;

  const state = {
    log: null,
    player: null,
    options: {},
    previousOverflow: '',
    escapeBound: false
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, number(value)));
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function first(source, paths, fallback = '') {
    for (const path of paths) {
      const parts = String(path).split('.');
      let value = source;
      for (const part of parts) {
        if (value == null) break;
        value = value[part];
      }
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return fallback;
  }

  function canonicalType(log) {
    const result = object(log?.result);
    const candidates = [
      log?.prediction_type,
      log?.predictionType,
      log?.input_params?.predictionType,
      log?.inputParams?.predictionType,
      result.type
    ];

    for (const candidate of candidates) {
      const value = String(candidate || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

      if (value.includes('roi') || value.includes('return on investment')) {
        return 'ROI Analysis';
      }
      if (value.includes('attribute') || value.includes('development')) {
        return 'Attribute Development';
      }
      if (value.includes('scenario')) {
        return 'Match Scenario Prediction';
      }
      if (value.includes('position') || value.includes('role fit')) {
        return 'Position Fit Projection';
      }
    }

    return 'Position Fit Projection';
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

  function position(player) {
    return (
      player?.specific_position ||
      player?.primary_position ||
      array(player?.positions)[0] ||
      player?.position_group ||
      ''
    );
  }

  function money(value) {
    if (value && typeof value === 'object') {
      const formatted =
        value.formatted ||
        value.valueFormatted ||
        value.transferValueFormatted;
      if (formatted) return String(formatted);
      value = value.value ?? value.amount;
    }

    const parsed = number(value, NaN);
    if (!Number.isFinite(parsed)) return '—';
    return 'GBP ' + Math.round(parsed).toLocaleString('en-GB');
  }

  function compactMoney(value) {
    const parsed = number(
      value && typeof value === 'object'
        ? value.value ?? value.amount
        : value,
      NaN
    );
    if (!Number.isFinite(parsed)) return money(value);
    if (Math.abs(parsed) >= 1000000) {
      return 'GBP ' + (parsed / 1000000).toFixed(1) + 'm';
    }
    if (Math.abs(parsed) >= 1000) {
      return 'GBP ' + Math.round(parsed / 1000) + 'k';
    }
    return money(parsed);
  }

  function percentage(value) {
    const parsed = number(value);
    return (parsed >= 0 ? '+' : '') + Math.round(parsed) + '%';
  }

  function confidence(result) {
    const value =
      result.confidence ||
      result.dataConfidence ||
      result.overallBreakdown?.dataConfidence ||
      {};
    if (typeof value === 'string') {
      return {
        score: number(
          result.confidenceScore ||
          result.overallBreakdown?.dataConfidenceScore,
          0
        ),
        label: value,
        note: ''
      };
    }
    return {
      score: number(
        value.score ??
        result.confidenceScore ??
        result.overallBreakdown?.dataConfidenceScore,
        0
      ),
      label:
        value.label ||
        result.overallBreakdown?.dataConfidenceLabel ||
        'Evidence review required',
      note:
        value.note ||
        result.overallBreakdown?.dataConfidenceNote ||
        ''
    };
  }

  function resultStatus(type, result) {
    if (type === 'ROI Analysis') {
      return result.suitability || result.recommendation || 'Financial review';
    }
    if (type === 'Attribute Development') {
      const seasons = array(result.seasons);
      const firstSeason = seasons[0] || {};
      const finalSeason = seasons[seasons.length - 1] || {};
      const movement =
        number(finalSeason.overall) - number(
          result.currentOverall ?? firstSeason.overall
        );
      return movement >= 0
        ? 'Positive five-year trajectory'
        : 'Development risk';
    }
    if (type === 'Match Scenario Prediction') {
      return result.recommendation || result.risk || 'Scenario reviewed';
    }
    return result.targetVerdict || result.verdict || 'Position fit reviewed';
  }

  function overlayTitle(type) {
    if (type === 'ROI Analysis') return 'ROI and value result';
    if (type === 'Attribute Development') return 'Development projection';
    if (type === 'Match Scenario Prediction') return 'Match scenario result';
    return 'Position fit result';
  }

  function overlayDescription(type) {
    if (type === 'ROI Analysis') {
      return 'ScoutLink compared projected player value against the acquisition, development and scouting assumptions supplied for this analysis.';
    }
    if (type === 'Attribute Development') {
      return 'ScoutLink modelled the player’s individual attributes, overall rating and estimated value across five seasons.';
    }
    if (type === 'Match Scenario Prediction') {
      return 'ScoutLink assessed the attributes and evidence required for the selected repeated tactical demand.';
    }
    return 'ScoutLink compared the selected target position with every supported role using the player’s current football evidence.';
  }

  function metric(label, value, hint) {
    return (
      '<article class="metric">' +
        '<small>' + esc(label) + '</small>' +
        '<strong>' + esc(value == null || value === '' ? '—' : value) + '</strong>' +
        '<span>' + esc(hint || '') + '</span>' +
      '</article>'
    );
  }

  function fact(label, value, hint) {
    return (
      '<div class="fact">' +
        '<small>' + esc(label) + '</small>' +
        '<b>' + esc(value == null || value === '' ? '—' : value) + '</b>' +
        (hint ? '<span>' + esc(hint) + '</span>' : '') +
      '</div>'
    );
  }

  function section(title, subtitle, body, extraClass = '') {
    return (
      '<section class="result-section ' + esc(extraClass) + '">' +
        '<header class="section-head"><div>' +
          '<h3>' + esc(title) + '</h3>' +
          (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') +
        '</div></header>' +
        '<div class="section-body">' + body + '</div>' +
      '</section>'
    );
  }

  function scoreRows(rows) {
    const valid = array(rows).filter(Boolean);
    if (!valid.length) {
      return '<div class="empty-state">No scored evidence was returned for this section.</div>';
    }

    return valid.map((row) => {
      const score = Math.round(clamp(
        row.score ??
        row.value ??
        row.rating ??
        row.projectedScore ??
        0
      ));
      return (
        '<div class="score-row">' +
          '<div class="score-label">' +
            '<b>' + esc(
              row.label ||
              row.role ||
              row.position ||
              row.attribute ||
              row.key ||
              'Metric'
            ) + '</b>' +
            (row.note || row.reason
              ? '<small>' + esc(row.note || row.reason) + '</small>'
              : '') +
          '</div>' +
          '<div class="score-track"><i style="width:' + score + '%"></i></div>' +
          '<strong>' + score + '</strong>' +
        '</div>'
      );
    }).join('');
  }

  function confidenceSection(result, heading, copy) {
    const item = confidence(result);
    return section(
      'Data confidence',
      heading || 'How much evidence supports the result',
      '<div class="confidence-layout">' +
        '<div class="confidence-score"><strong>' +
          esc(Math.round(item.score || 0)) +
        '</strong><span>' + esc(item.label || 'Evidence review') + '</span></div>' +
        '<div><h4>' + esc(copy || 'Use this alongside live observation') + '</h4>' +
        '<p>' + esc(
          item.note ||
          'The prediction uses current Coach ratings, Match Facts, physical profile and age-band context.'
        ) + '</p></div>' +
      '</div>'
    );
  }

  function narrativeSection(result) {
    const paragraphs = array(result.paragraphs);
    const body = paragraphs.length
      ? paragraphs.map((paragraph) => '<p>' + esc(paragraph) + '</p>').join('')
      : '<p>' + esc(result.summary || 'The analysis is complete.') + '</p>';

    return section(
      'ScoutLink explanation',
      'Plain-language result',
      '<div class="narrative">' + body + '</div>'
    );
  }

  function disclaimer(result, type) {
    const fallback =
      type === 'ROI Analysis'
        ? 'ScoutLink predictions are deterministic estimates based on Coach ratings, Match Facts, physical profile and current player data. They are decision-support outputs, not guarantees or financial advice.'
        : 'ScoutLink predictions are deterministic estimates based on Coach ratings, Match Facts, physical profile and current player data. They are decision-support outputs, not guarantees.';
    return (
      '<div class="disclaimer"><b>Decision-support notice</b><p>' +
        esc(result.disclaimer || fallback) +
      '</p></div>'
    );
  }

  function lineChart(seriesA, labels, options = {}) {
    const seriesB = array(options.seriesB);
    const values = array(seriesA).map(number);
    const second = seriesB.map(number);
    const combined = values.concat(second).filter(Number.isFinite);
    if (!combined.length) {
      return '<div class="empty-state">No trajectory values were returned.</div>';
    }

    const width = 760;
    const height = 230;
    const left = 58;
    const right = 20;
    const top = 24;
    const bottom = 42;
    let min = Math.min(...combined);
    let max = Math.max(...combined);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const padding = (max - min) * 0.12;
    min -= padding;
    max += padding;

    const xFor = (index, count) =>
      count <= 1
        ? left
        : left + (index / (count - 1)) * (width - left - right);
    const yFor = (value) =>
      top + ((max - value) / (max - min)) * (height - top - bottom);
    const points = values.map((value, index) =>
      xFor(index, values.length).toFixed(1) + ',' + yFor(value).toFixed(1)
    ).join(' ');
    const pointsB = second.map((value, index) =>
      xFor(index, second.length).toFixed(1) + ',' + yFor(value).toFixed(1)
    ).join(' ');
    const formatter = options.formatter || ((value) => Math.round(value));

    const grid = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const value = max - ratio * (max - min);
      const y = top + ratio * (height - top - bottom);
      return (
        '<line x1="' + left + '" y1="' + y.toFixed(1) +
        '" x2="' + (width - right) + '" y2="' + y.toFixed(1) +
        '" class="chart-grid"/>' +
        '<text x="4" y="' + (y + 3).toFixed(1) +
        '" class="chart-axis">' + esc(formatter(value)) + '</text>'
      );
    }).join('');

    const labelNodes = array(labels).map((label, index) =>
      '<text x="' + xFor(index, labels.length).toFixed(1) +
      '" y="' + (height - 10) +
      '" text-anchor="middle" class="chart-axis">' + esc(label) + '</text>'
    ).join('');

    const dots = values.map((value, index) =>
      '<circle cx="' + xFor(index, values.length).toFixed(1) +
      '" cy="' + yFor(value).toFixed(1) +
      '" r="4" class="chart-dot"/>'
    ).join('');
    const dotsB = second.map((value, index) =>
      '<circle cx="' + xFor(index, second.length).toFixed(1) +
      '" cy="' + yFor(value).toFixed(1) +
      '" r="4" class="chart-dot second"/>'
    ).join('');

    return (
      '<div class="chart-wrap"><svg viewBox="0 0 760 230" role="img">' +
        grid + labelNodes +
        '<polyline points="' + points + '" class="chart-line"/>' +
        dots +
        (second.length
          ? '<polyline points="' + pointsB + '" class="chart-line second"/>' + dotsB
          : '') +
      '</svg></div>' +
      '<div class="chart-legend">' +
        '<span><i></i>' + esc(options.labelA || 'Projected value') + '</span>' +
        (second.length
          ? '<span><i class="second"></i>' + esc(options.labelB || 'Modelled cost') + '</span>'
          : '') +
      '</div>'
    );
  }

  function positionBody(log, result, player) {
    const input = object(log.input_params);
    const roles = array(
      result.topRoles ||
      result.roleScores ||
      result.alternatives
    ).map((role) => ({
      label:
        role.role ||
        role.position ||
        role.label ||
        role.name,
      score:
        role.score ??
        role.value ??
        role.rating,
      note:
        role.note ||
        role.group ||
        role.reason ||
        ''
    }));
    const conversions = array(
      result.conversionCandidates ||
      result.nearbyConversionRoles
    );
    const overall = object(result.overallBreakdown);
    const evidence = Object.entries(overall)
      .filter(([key, value]) =>
        typeof value === 'number' &&
        key.toLowerCase().includes('score')
      )
      .map(([key, value]) => ({
        label: titleCase(key.replace(/Score$/i, '')),
        score: value
      }));
    const valueContext =
      object(result.valueContext).currentValueFormatted
        ? result.valueContext
        : object(result.valueAnalysis || result.currentValueContext);
    const currentValue =
      valueContext.currentValueFormatted ||
      valueContext.valueFormatted ||
      money(
        valueContext.currentValue ??
        valueContext.value ??
        result.currentTransferValue ??
        player.transfer_value
      );
    const targetPosition =
      result.targetPosition ||
      input.targetPosition ||
      position(player);
    const targetScore =
      result.targetScore ??
      result.targetRoleScore ??
      result.bestCurrentScore;
    const currentRole =
      result.bestCurrentPosition ||
      result.bestCurrentRole ||
      roles[0]?.label ||
      position(player);
    const futureRole =
      result.bestFuturePosition ||
      result.bestFutureRole ||
      roles[1]?.label ||
      currentRole;
    const currentScore =
      result.bestCurrentScore ??
      roles[0]?.score;
    const futureScore =
      result.bestFutureScore ??
      roles[1]?.score;
    const gap =
      result.targetGapVsBest ??
      result.gapVsBest ??
      Math.max(0, number(currentScore) - number(targetScore));
    const verdict =
      result.targetVerdict ||
      result.verdict ||
      'Position fit reviewed';

    return (
      '<section class="result-hero">' +
        '<div><span>Decision summary</span><h2>' +
          esc(
            result.summary ||
            'The selected role has been compared with the player’s strongest current and future positions.'
          ) +
        '</h2><p>' +
          esc(
            array(result.paragraphs)[0] ||
            result.recommendation ||
            'Use the role ranking and live observation together before progressing the player.'
          ) +
        '</p></div>' +
        '<div class="hero-score"><small>Target fit</small><strong>' +
          esc(targetScore ?? '—') +
        '</strong><span>/ 100</span></div>' +
      '</section>' +
      '<section class="metric-grid">' +
        metric('Target position', targetPosition, 'Selected role') +
        metric('Target-role score', targetScore == null ? '—' : targetScore + ' / 100', verdict) +
        metric('Best current role', currentRole + (currentScore != null ? ' · ' + currentScore : ''), 'Current evidence') +
        metric('Best future role', futureRole + (futureScore != null ? ' · ' + futureScore : ''), 'Development pathway') +
      '</section>' +
      section(
        'Inputs used',
        'The football question that was analysed',
        '<div class="input-summary">' +
          fact('Target position', targetPosition, 'Selected by Scout') +
          fact('Target verdict', verdict) +
          fact('Gap versus best role', Math.round(number(gap)) + ' points') +
          fact(
            'Data confidence',
            confidence(result).label,
            confidence(result).note
          ) +
        '</div>'
      ) +
      '<div class="two-column">' +
        section(
          'Role ranking',
          'The strongest roles returned by the position engine',
          scoreRows(roles)
        ) +
        section(
          'Target-role judgement',
          'Why the selected role is suitable or unsuitable',
          '<div class="verdict-panel">' +
            '<span class="status ' +
              (number(gap) <= 6 ? 'good' : 'watch') +
            '">' + esc(verdict) + '</span>' +
            '<h4>' +
              esc(
                number(gap) <= 2
                  ? 'No material conversion work is required.'
                  : number(gap) <= 6
                    ? 'The role is reachable with controlled conversion work.'
                    : 'The role requires a deliberate development plan.'
              ) +
            '</h4>' +
            '<p>The selected role is ' +
              esc(Math.round(number(gap))) +
              ' points from the strongest current-role score.</p>' +
            '<div class="callout"><b>Recommended football action</b><span>' +
              esc(
                result.recommendation ||
                array(result.paragraphs)[1] ||
                'Validate the role through live observation before progressing beyond the shortlist.'
              ) +
            '</span></div>' +
          '</div>'
        ) +
      '</div>' +
      (conversions.length
        ? section(
            'Nearby conversion roles',
            'Roles close to the strongest current score',
            '<div class="conversion-grid">' +
              conversions.slice(0, 3).map((role, index) =>
                '<article><span>0' + (index + 1) + '</span><div><b>' +
                  esc(
                    role.role ||
                    role.position ||
                    role.label ||
                    'Alternative role'
                  ) +
                '</b><strong>' +
                  esc(role.score ?? role.value ?? '—') +
                '</strong><p>' +
                  esc(role.reason || role.note || 'Related positional pathway.') +
                '</p></div></article>'
              ).join('') +
            '</div>'
          )
        : '') +
      '<div class="two-column">' +
        section(
          'Overall evidence used',
          'Position fit includes the wider player model',
          scoreRows(evidence)
        ) +
        section(
          'Current value context',
          'Financial context without exposing proprietary formula weights',
          '<div class="value-summary"><span>Estimated youth value</span><strong>' +
            esc(currentValue) +
          '</strong><p>' +
            esc(
              valueContext.budgetLabel ||
              valueContext.label ||
              'Decision-support value context'
            ) +
            (valueContext.riskLabel
              ? ' · ' + esc(valueContext.riskLabel)
              : '') +
          '</p></div>' +
          '<div class="driver-list">' +
            '<div><b>Age-band baseline</b><span>Included</span></div>' +
            '<div><b>Position and role context</b><span>Included</span></div>' +
            '<div><b>Overall and potential</b><span>Included</span></div>' +
            '<div><b>Match and confidence evidence</b><span>Included</span></div>' +
          '</div>'
        ) +
      '</div>' +
      confidenceSection(
        result,
        'How much evidence supports the result',
        confidence(result).score >= 70
          ? 'Suitable for deeper recruitment review'
          : 'Use as an early signal only'
      ) +
      narrativeSection(result)
    );
  }

  function developmentBody(log, result, player) {
    const input = object(log.input_params);
    const seasons = array(result.seasons);
    const finalSeason = seasons[seasons.length - 1] || {};
    const effects = array(
      result.attributeEffects ||
      Object.values(object(result.attributeEffectsByKey))
    );
    const tradeOffs = array(result.tradeOffs);
    const generatedByYear = object(result.generatedAttributes);
    const generated =
      object(generatedByYear[5]) ||
      object(generatedByYear['5']) ||
      object(result.generatedQualities);
    const labels = ['Current'].concat(
      seasons.map((season) => 'Year ' + (season.year || ''))
    );
    const currentOverall =
      result.currentOverall ??
      player.overall_rating;
    const currentValue =
      first(result, [
        'currentTransferValue.value',
        'currentTransferValue',
        'currentValue'
      ], player.transfer_value);
    const overallValues = [number(currentOverall)].concat(
      seasons.map((season) => number(season.overall))
    );
    const valueValues = [number(
      currentValue && typeof currentValue === 'object'
        ? currentValue.value
        : currentValue
    )].concat(
      seasons.map((season) =>
        number(
          season.transferValue ??
          season.projectedValue
        )
      )
    );

    return (
      '<section class="result-hero">' +
        '<div><span>Development summary</span><h2>' +
          esc(
            result.summary ||
            'The selected plan projects a clear five-year development trajectory.'
          ) +
        '</h2><p>' +
          esc(
            array(result.paragraphs)[0] ||
            'ScoutLink keeps priority gains and trade-offs visible across every season.'
          ) +
        '</p></div>' +
        '<div class="hero-score"><small>Year-five overall</small><strong>' +
          esc(finalSeason.overall ?? '—') +
        '</strong><span>/ 100</span></div>' +
      '</section>' +
      '<section class="metric-grid">' +
        metric('Development focus', result.focus || input.focus, 'Five-year plan') +
        metric('Current overall', currentOverall == null ? '—' : Math.round(number(currentOverall)) + ' / 100', 'Starting point') +
        metric(
          'Year-five overall',
          finalSeason.overall == null ? '—' : finalSeason.overall + ' / 100',
          finalSeason.overall == null
            ? ''
            : (number(finalSeason.overall) - number(currentOverall) >= 0 ? '+' : '') +
              Math.round(number(finalSeason.overall) - number(currentOverall)) +
              ' projected'
        ) +
        metric(
          'Year-five value',
          finalSeason.transferValueFormatted ||
          finalSeason.projectedValueFormatted ||
          compactMoney(
            finalSeason.transferValue ??
            finalSeason.projectedValue
          ),
          'Projected decision-support value'
        ) +
      '</section>' +
      section(
        'Inputs used',
        'The selected development question',
        '<div class="input-summary">' +
          fact('Development focus', result.focus || input.focus) +
          fact('Projection horizon', 'Five years') +
          fact('Current age band', player.age_group || '—') +
          fact(
            'Evidence confidence',
            confidence(result).label,
            confidence(result).note
          ) +
        '</div>'
      ) +
      '<div class="two-column charts">' +
        section(
          'Overall trajectory',
          'Projected headline rating by season',
          lineChart(overallValues, labels, {
            labelA: 'Projected overall'
          })
        ) +
        section(
          'Estimated value trajectory',
          'Decision-support value by season',
          lineChart(valueValues, labels, {
            formatter: (value) =>
              Number.isFinite(number(value))
                ? '£' + Math.round(number(value) / 1000) + 'k'
                : '—',
            labelA: 'Projected value'
          })
        ) +
      '</div>' +
      section(
        'Season-by-season projection',
        'Every season remains available for inspection',
        '<div class="season-table">' +
          '<div class="season-head"><span>Horizon</span><span>Overall</span><span>Projected value</span><span>Ranking impact</span></div>' +
          seasons.map((season) =>
            '<div><b>Year ' + esc(season.year) + '</b><strong>' +
              esc(season.overall ?? '—') +
            '</strong><span>' +
              esc(
                season.transferValueFormatted ||
                season.projectedValueFormatted ||
                money(
                  season.transferValue ??
                  season.projectedValue
                )
              ) +
            '</span><p>' +
              esc(season.rankingImpact || '') +
            '</p></div>'
          ).join('') +
        '</div>'
      ) +
      '<div class="two-column development-detail">' +
        section(
          'Five-year attribute movement',
          'Priority gains and visible trade-offs',
          scoreRows(
            effects.map((effect) => ({
              label:
                effect.attribute ||
                titleCase(effect.key),
              score:
                effect.projectedScore ??
                effect.finalScore ??
                clamp(
                  50 + number(effect.deltaFiveYear) * 20
                ),
              note:
                (effect.currentScore != null
                  ? effect.currentScore + ' → ' +
                    (effect.projectedScore ?? effect.finalScore ?? '—') +
                    ' · '
                  : '') +
                (effect.deltaFiveYear != null
                  ? (number(effect.deltaFiveYear) >= 0 ? '+' : '') +
                    number(effect.deltaFiveYear).toFixed(1) +
                    ' '
                  : '') +
                (effect.reason || '')
            }))
          )
        ) +
        section(
          'Generated football qualities',
          'Derived from the projected attributes',
          '<div class="generated-grid">' +
            Object.entries(generated).map(([key, value]) =>
              '<article><small>' + esc(titleCase(key)) +
              '</small><strong>' + esc(Math.round(number(value))) +
              '</strong><span>Year five</span></article>'
            ).join('') +
          '</div>' +
          (tradeOffs.length
            ? '<div class="callout warning"><b>Training-load warning</b><span>' +
                esc(
                  tradeOffs.slice(0, 5).map((item) =>
                    item.attribute || titleCase(item.key)
                  ).join(', ') +
                  ' require protected work outside the primary development focus.'
                ) +
              '</span></div>'
            : '')
        ) +
      '</div>' +
      (tradeOffs.length
        ? section(
            'Trade-offs requiring attention',
            'Negative movement is not hidden',
            '<div class="risk-list">' +
              tradeOffs.slice(0, 6).map((item) =>
                '<article><span>' +
                  esc(item.attribute || titleCase(item.key)) +
                '</span><b>' +
                  esc(
                    item.deltaFiveYear == null
                      ? 'Monitor'
                      : (number(item.deltaFiveYear) >= 0 ? '+' : '') +
                        number(item.deltaFiveYear).toFixed(1)
                  ) +
                '</b><p>' +
                  esc(item.reason || 'Requires protected training load.') +
                '</p></article>'
              ).join('') +
            '</div>'
          )
        : '') +
      confidenceSection(
        result,
        'How the projection should be used',
        confidence(result).score >= 70
          ? 'Strong enough for development planning'
          : 'Treat this as an indicative pathway'
      ) +
      narrativeSection(result)
    );
  }

  function roiBody(log, result, player) {
    const input = object(log.input_params);
    const projection = array(result.projection);
    const final = projection[projection.length - 1] || {};
    const assumptions = object(result.assumptions);
    const currentValue =
      first(result, [
        'currentTransferValue.value',
        'currentTransferValue',
        'currentValue'
      ], player.transfer_value);
    const labels = ['Current'].concat(
      projection.map((row) =>
        row.horizon || 'Year ' + row.year
      )
    );
    const valueValues = [number(
      currentValue && typeof currentValue === 'object'
        ? currentValue.value
        : currentValue
    )].concat(
      projection.map((row) => number(row.projectedValue))
    );
    const costValues = [0].concat(
      projection.map((row) => number(row.totalCost))
    );
    const risks = array(result.risks);
    const drivers = array(result.valueDrivers);

    return (
      '<section class="result-hero">' +
        '<div><span>Financial summary</span><h2>' +
          esc(
            result.summary ||
            result.suitability ||
            'The projected value and supplied costs have been compared.'
          ) +
        '</h2><p>' +
          esc(
            array(result.paragraphs)[1] ||
            result.recommendation ||
            'Use the result to support negotiation, not replace financial due diligence.'
          ) +
        '</p></div>' +
        '<div class="hero-score currency"><small>Year-five ROI</small><strong>' +
          esc(
            final.roiPercent == null
              ? '—'
              : percentage(final.roiPercent)
          ) +
        '</strong></div>' +
      '</section>' +
      '<section class="metric-grid">' +
        metric(
          'Current estimated value',
          compactMoney(currentValue),
          'Starting value'
        ) +
        metric(
          'Year-five projected value',
          final.projectedValueFormatted ||
          compactMoney(final.projectedValue),
          final.projectedValue == null
            ? ''
            : (number(final.projectedValue) - number(
                currentValue && typeof currentValue === 'object'
                  ? currentValue.value
                  : currentValue
              ) >= 0 ? '+' : '') +
              compactMoney(
                number(final.projectedValue) -
                number(
                  currentValue && typeof currentValue === 'object'
                    ? currentValue.value
                    : currentValue
                )
              )
        ) +
        metric(
          'Year-five modelled cost',
          final.totalCostFormatted ||
          compactMoney(final.totalCost),
          'All cost assumptions'
        ) +
        metric(
          'Year-five modelled ROI',
          final.roiPercent == null
            ? '—'
            : percentage(final.roiPercent),
          result.suitability || ''
        ) +
      '</section>' +
      section(
        'Assumptions used',
        'Every financial input remains visible',
        '<div class="input-summary">' +
          fact(
            'Financial goal',
            result.financialGoal ||
            input.financialGoal
          ) +
          fact(
            'Acquisition cost',
            assumptions.acquisitionCostFormatted ||
            money(assumptions.acquisitionCost)
          ) +
          fact(
            'Annual development cost',
            assumptions.annualDevelopmentCostFormatted ||
            money(assumptions.annualDevelopmentCost)
          ) +
          fact(
            'Scouting cost',
            assumptions.scoutingCostFormatted ||
            money(assumptions.scoutingCost)
          ) +
        '</div>'
      ) +
      section(
        'Value versus cost trajectory',
        'Projected value and cumulative modelled cost',
        lineChart(valueValues, labels, {
          seriesB: costValues,
          formatter: (value) =>
            '£' + Math.round(number(value) / 1000) + 'k',
          labelA: 'Projected value',
          labelB: 'Total modelled cost'
        })
      ) +
      section(
        'Five-year financial projection',
        'The ROI calculation for every horizon',
        '<div class="roi-table">' +
          '<div class="roi-head"><span>Horizon</span><span>Projected value</span><span>Total modelled cost</span><span>Modelled ROI</span></div>' +
          projection.map((row) =>
            '<div><b>' +
              esc(row.horizon || 'Year ' + row.year) +
            '</b><span>' +
              esc(
                row.projectedValueFormatted ||
                money(row.projectedValue)
              ) +
            '</span><span>' +
              esc(
                row.totalCostFormatted ||
                money(row.totalCost)
              ) +
            '</span><strong>' +
              esc(row.roiPercent == null ? '—' : percentage(row.roiPercent)) +
            '</strong></div>'
          ).join('') +
        '</div>'
      ) +
      '<div class="two-column">' +
        section(
          'Suitability judgement',
          'The current financial decision',
          '<div class="verdict-panel">' +
            '<span class="status ' +
              (number(final.roiPercent) >= 100 ? 'good' : 'watch') +
            '">' + esc(result.suitability || 'Review required') + '</span>' +
            '<h4>' +
              esc(
                number(final.roiPercent) >= 100
                  ? 'Worthwhile target at the modelled entry cost.'
                  : 'The entry cost and projected upside require further review.'
              ) +
            '</h4><p>' +
              esc(
                result.recommendation ||
                'Protect the acquisition cost and validate the development pathway.'
              ) +
            '</p><div class="callout"><b>Negotiation position</b><span>' +
              esc(
                result.negotiationPosition ||
                'Avoid paying in advance for the full projected upside.'
              ) +
            '</span></div>' +
          '</div>'
        ) +
        section(
          'Sensitivity and risks',
          'What could weaken the case',
          '<div class="risk-list vertical">' +
            (risks.length
              ? risks
              : [
                  {
                    label: 'Entry cost',
                    level: 'Highest sensitivity',
                    note: 'The margin reduces if acquisition cost rises.'
                  },
                  {
                    label: 'Development minutes',
                    level: 'Material dependency',
                    note: 'The value trajectory assumes continued match exposure.'
                  },
                  {
                    label: 'Evidence changes',
                    level: 'Monitor',
                    note: 'New Match Facts can change value and confidence.'
                  }
                ]
            ).map((risk) =>
              '<article><span>' +
                esc(risk.label || risk.name || 'Risk') +
              '</span><b>' +
                esc(risk.level || risk.value || 'Monitor') +
              '</b><p>' +
                esc(risk.note || risk.reason || '') +
              '</p></article>'
            ).join('') +
          '</div>'
        ) +
      '</div>' +
      section(
        'Value drivers',
        'Direction is explained without exposing proprietary weights',
        '<div class="driver-grid">' +
          (drivers.length
            ? drivers
            : [
                { label: 'Age-band baseline', value: 'Included', note: player.age_group || '' },
                { label: 'Position context', value: 'Included', note: position(player) },
                { label: 'Overall and potential', value: 'Included', note: player.overall_rating || '' },
                { label: 'Evidence confidence', value: confidence(result).label, note: confidence(result).note }
              ]
          ).map((driver) =>
            '<article><span>' +
              esc(driver.label || driver.name || 'Driver') +
            '</span><b>' +
              esc(driver.value || driver.direction || 'Included') +
            '</b><p>' +
              esc(driver.note || driver.reason || '') +
            '</p></article>'
          ).join('') +
        '</div>'
      ) +
      confidenceSection(
        result,
        'Strength of the evidence behind the projection',
        confidence(result).score >= 70
          ? 'Suitable for commercial review'
          : 'Use cautiously in commercial review'
      ) +
      narrativeSection(result)
    );
  }

  function scenarioBody(log, result) {
    const input = object(log.input_params);
    const evidence = array(result.evidence).map((item) => ({
      label:
        item.label ||
        titleCase(item.attribute),
      score:
        item.score ??
        item.value,
      note:
        item.reason ||
        ''
    }));
    const guidance = array(result.selectionGuidance);
    const liveProof = array(result.liveProof);
    const score = number(result.scenarioScore);
    const riskPosition =
      String(result.risk || '').toLowerCase() === 'low'
        ? 24
        : String(result.risk || '').toLowerCase() === 'medium'
          ? 52
          : 80;

    return (
      '<section class="result-hero">' +
        '<div><span>Tactical summary</span><h2>' +
          esc(
            result.summary ||
            'The player’s evidence has been assessed against the selected tactical demand.'
          ) +
        '</h2><p>' +
          esc(
            result.predictedBehaviour ||
            array(result.paragraphs)[0] ||
            ''
          ) +
        '</p></div>' +
        '<div class="hero-score"><small>Scenario score</small><strong>' +
          esc(Math.round(score)) +
        '</strong><span>/ 100</span></div>' +
      '</section>' +
      '<section class="metric-grid">' +
        metric('Scenario score', Math.round(score) + ' / 100', 'Adjusted for evidence') +
        metric('Raw scenario fit', Math.round(number(result.rawScenarioFit)) + ' / 100', 'Relevant attributes') +
        metric('Tactical risk', result.risk || '—', 'Current evidence') +
        metric('Recommendation', result.recommendation || '—', 'Selection trigger') +
      '</section>' +
      section(
        'Scenario analysed',
        'The exact tactical question',
        '<div class="scenario-question"><span>Selected scenario</span><h4>' +
          esc(
            result.scenario ||
            input.scenario ||
            input.scenarioKey ||
            'Scenario not returned'
          ) +
        '</h4><p>' +
          esc(
            result.scenarioDescription ||
            'The player was assessed against the repeated actions required by this match context.'
          ) +
        '</p></div>'
      ) +
      '<div class="two-column">' +
        section(
          'Relevant evidence',
          'The attributes used for this scenario',
          scoreRows(evidence)
        ) +
        section(
          'Predicted behaviour',
          'What the player is expected to do',
          '<div class="behaviour-card"><span>Expected contribution</span><h4>' +
            esc(
              result.behaviourHeadline ||
              result.recommendation ||
              'Use the player’s strongest evidence.'
            ) +
          '</h4><p>' +
            esc(
              result.predictedBehaviour ||
              result.summary ||
              ''
            ) +
          '</p><div class="callout"><b>Tactical note</b><span>' +
            esc(
              result.tacticalNote ||
              'Confirm the repeated behaviour through live observation.'
            ) +
          '</span></div></div>'
        ) +
      '</div>' +
      section(
        'Selection guidance',
        'How to use the result in a match plan',
        '<div class="guidance-grid">' +
          (guidance.length
            ? guidance
            : [
                {
                  title: 'Use the strongest evidence',
                  note: 'Build the role around the highest relevant attribute scores.'
                },
                {
                  title: 'Provide nearby support',
                  note: 'Give the player simple passing and cover options.'
                },
                {
                  title: 'Protect the weakest route',
                  note: 'Do not make the lowest evidence score the only route to success.'
                }
              ]
          ).slice(0, 3).map((item, index) =>
            '<article><span>0' + (index + 1) + '</span><h4>' +
              esc(item.title || item.label || 'Guidance') +
            '</h4><p>' +
              esc(item.note || item.body || item.reason || '') +
            '</p></article>'
          ).join('') +
        '</div>'
      ) +
      '<div class="two-column">' +
        section(
          'Risk assessment',
          'Why the tactical risk is ' + String(result.risk || 'under review').toLowerCase(),
          '<div class="risk-meter"><div><span>' +
            esc(result.risk || 'Review') +
          '</span><i style="left:' + riskPosition + '%"></i></div><p>' +
            esc(
              result.riskExplanation ||
              'Evidence confidence and the scenario score determine how much tactical exposure is appropriate.'
            ) +
          '</p></div>'
        ) +
        section(
          'What still needs live proof',
          'The analysis does not replace observation',
          '<div class="watch-list">' +
            (liveProof.length
              ? liveProof
              : [
                  'Decision speed under stronger pressure.',
                  'Movement after the first action.',
                  'Consistency when the demand repeats.'
                ]
            ).slice(0, 5).map((item, index) =>
              '<div><span>0' + (index + 1) + '</span><p>' +
                esc(
                  typeof item === 'string'
                    ? item
                    : item.note || item.body || item.label
                ) +
              '</p></div>'
            ).join('') +
          '</div>'
        ) +
      '</div>' +
      confidenceSection(
        result,
        'How strictly the result should be treated',
        confidence(result).score >= 70
          ? 'Strong enough to influence selection'
          : 'Use as a supporting signal only'
      ) +
      narrativeSection(result)
    );
  }

  function body(log, player) {
    const result = object(log.result);
    const type = canonicalType(log);

    if (type === 'ROI Analysis') {
      return roiBody(log, result, player);
    }
    if (type === 'Attribute Development') {
      return developmentBody(log, result, player);
    }
    if (type === 'Match Scenario Prediction') {
      return scenarioBody(log, result, player);
    }
    return positionBody(log, result, player);
  }

  function ensureHost() {
    let host = document.getElementById('slp2PredictionOverlay');
    if (host) return host;

    host = document.createElement('div');
    host.id = 'slp2PredictionOverlay';
    host.className = 'slp2-overlay';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    return host;
  }

  function close() {
    const host = document.getElementById('slp2PredictionOverlay');
    if (!host) return;
    host.classList.remove('open');
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '';
    document.body.style.overflow = state.previousOverflow;
    state.log = null;
    state.player = null;
    state.options = {};
  }

  function open(rawLog, fallbackPlayer, options = {}) {
    const log = {
      ...(rawLog || {}),
      result: {
        ...object(rawLog?.result)
      }
    };
    const type = canonicalType(log);
    log.prediction_type = type;
    log.result.type = type;
    const player =
      log.player ||
      fallbackPlayer ||
      {};
    state.log = log;
    state.player = player;
    state.options = options;
    state.previousOverflow = document.body.style.overflow;

    const result = log.result;
    const host = ensureHost();
    const remaining =
      options.creditsRemaining ??
      log.creditsRemaining ??
      log.remaining;
    const confidenceLabel = confidence(result).label;
    const status = resultStatus(type, result);

    host.innerHTML =
      '<div class="slp2-scrim" data-overlay-close></div>' +
      '<article class="prediction-overlay desktop-overlay" role="dialog" aria-modal="true" aria-labelledby="slp2OverlayTitle">' +
        '<header class="overlay-header">' +
          '<div class="overlay-topline"><div><span class="brand-mark">SL</span><b>Prediction analysis</b></div>' +
          '<button class="close-btn" type="button" data-overlay-close>Close</button></div>' +
          '<div class="overlay-heading">' +
            '<div><span class="engine-type">' + esc(type) + '</span>' +
              '<h1 id="slp2OverlayTitle">' + esc(overlayTitle(type)) + '</h1>' +
              '<p>' + esc(overlayDescription(type)) + '</p></div>' +
            '<div class="overlay-meta">' +
              '<span class="status ' +
                (/risk|review|required|watch/i.test(String(status)) ? 'watch' : 'good') +
              '">' + esc(status) + '</span>' +
              '<span>Saved to prediction history</span>' +
              (remaining == null
                ? ''
                : '<span>' + esc(remaining) + ' prediction credits remaining</span>') +
            '</div>' +
          '</div>' +
          '<div class="overlay-player-row">' +
            '<div class="player-context"><span class="avatar">' +
              esc(initials(player)) +
            '</span><div><b>' + esc(playerName(player)) + '</b><small>' +
              esc([
                position(player),
                player.age_group,
                player.team_name || player.team?.team_name
              ].filter(Boolean).join(' · ')) +
            '</small></div>' +
            (confidenceLabel
              ? '<span class="evidence-pill">' + esc(confidenceLabel) + '</span>'
              : '') +
            '</div>' +
            '<div class="header-actions"><button class="btn secondary" type="button" data-overlay-export>Export analysis</button></div>' +
          '</div>' +
        '</header>' +
        '<main class="overlay-body">' +
          body(log, player) +
          disclaimer(result, type) +
        '</main>' +
        '<footer class="overlay-footer">' +
          '<div><b>Analysis saved automatically</b><span>This result can be reopened from Prediction History.</span></div>' +
          '<div><button class="btn secondary" type="button" data-overlay-run-another>Run another analysis</button>' +
          '<button class="btn primary" type="button" data-overlay-close>Close analysis</button></div>' +
        '</footer>' +
      '</article>';

    host.classList.add('open');
    host.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    host.onclick = (event) => {
      if (event.target.closest('[data-overlay-close]')) {
        close();
        return;
      }
      if (event.target.closest('[data-overlay-export]')) {
        options.onExport?.(log, player);
        return;
      }
      if (event.target.closest('[data-overlay-run-another]')) {
        options.onRunAnother?.(log, player);
      }
    };

    if (!state.escapeBound) {
      state.escapeBound = true;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });
    }

    host.querySelector('[data-overlay-close]')?.focus();
  }

  window.ScoutPredictionOverlayV2 = {
    open,
    close,
    canonicalType
  };
}());

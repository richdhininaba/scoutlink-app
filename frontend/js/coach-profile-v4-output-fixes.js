'use strict';

/* Aligns the existing Coach V8 profile design with authoritative V4 outputs. */
(function () {
  var scheduled = false;

  function player() { return window._profilePlayer || {}; }
  function analysis() {
    var record = player();
    return window._profileAnalysis || record.analysis || record.scoring_result || {};
  }
  function finite(value) { return Number.isFinite(Number(value)); }
  function score(value) { return finite(value) ? Math.max(0, Math.min(100, Math.round(Number(value)))) : null; }
  function setText(element, value) { if (element) element.textContent = value; }
  function evidence() {
    var source = analysis().evidenceConfidence || player().evidence_confidence || {};
    return {
      label:source.status || source.label || 'Insufficient',
      score:score(source.score),
      completeness:score(source.attributeCompleteness),
      sample:source.effectiveMatchEquivalents,
      target:source.sampleTarget,
      warnings:source.warnings || []
    };
  }
  function positionRows() {
    var source = analysis().positionRatings || player().position_ratings || {};
    if (Array.isArray(source.sorted)) return source.sorted;
    var map = source.ratings || source.scores || {};
    return Object.keys(map).map(function (position) {
      var value = map[position];
      return {position:position,score:value && typeof value === 'object' ? value.score : value};
    }).filter(function (row) { return finite(row.score); }).sort(function (a,b) { return Number(b.score)-Number(a.score); });
  }
  function roleRows() {
    var prediction = analysis().predictionDetails || player().prediction_analysis || {};
    return Array.isArray(prediction.roleFits) ? prediction.roleFits.filter(function (row) { return finite(row.score); }) : [];
  }
  function completion() {
    var record = player();
    var coreKeys = ['first_name','last_name','age_group','position_group','specific_position','foot','height_category','build_category'];
    var core = coreKeys.filter(function (key) { return record[key] !== null && record[key] !== undefined && String(record[key]).trim() !== ''; }).length;
    var client = window.ScoutLinkScoringV4;
    var expected = client ? client.attributesForPosition(record.primary_position || record.specific_position) : [];
    var flat = client ? client.flattenRatings(record.attribute_ratings || {}) : {};
    var observed = expected.filter(function (row) { return finite(flat[row[0]]); }).length;
    var value = Math.round((core / coreKeys.length) * 55 + (observed / Math.max(1,expected.length)) * 30);
    if ((window._profileMatches || []).length) value += 10;
    if ((window._profileVideos || []).some(function (video) { return video && (video.video_url || video.url || video.playback_url || video.storage_url); })) value += 5;
    return Math.max(0,Math.min(100,value));
  }

  function repairValue() {
    var card = document.querySelector('.coach-profile-v8 .profile-value');
    if (!card) return;
    var source = analysis();
    var value = source.transferValueFormatted || source.valueAnalysis?.valueFormatted || player().transfer_value_formatted || null;
    if (!value && finite(source.transferValue) && Number(source.transferValue) > 0) {
      value = '£' + Math.round(Number(source.transferValue)).toLocaleString('en-GB');
    }
    setText(card.querySelector('strong'), value || 'Not estimated');
    setText(card.querySelector('span'), value ? 'Anchored transfer value' : 'Transfer value');
  }

  function repairOverview() {
    var overall = score(analysis().overallRating ?? player().overall_rating);
    var confidence = evidence();
    var cards = document.querySelectorAll('.coach-profile-v8 .profile-overview article');
    if (cards[0] && overall !== null) setText(cards[0].querySelector('strong'), overall + ' / 100');
    if (cards[1]) {
      setText(cards[1].querySelector('strong'), confidence.label);
      var detail = [];
      if (confidence.score !== null) detail.push(confidence.score + '/100 confidence');
      if (confidence.completeness !== null) detail.push(confidence.completeness + '% required attributes observed');
      setText(cards[1].querySelector('p'), detail.join(' · ') || 'Evidence confidence is not yet established.');
    }
    if (cards[3]) {
      var percent = completion();
      setText(cards[3].querySelector('strong'), percent + '%');
      setText(cards[3].querySelector('p'), percent >= 90 ? 'The profile is ready for regular review.' : 'Complete remaining evidence to strengthen the profile.');
    }
  }

  function repairSnapshot() {
    var source = analysis();
    var overall = score(source.overallRating ?? player().overall_rating);
    var breakdown = source.overallBreakdown || player().overall_breakdown || {};
    var prediction = source.predictionDetails || player().prediction_analysis || {};
    var confidence = evidence();
    var cards = document.querySelectorAll('.coach-profile-v8 .rating-snapshot article');
    if (cards[0]) setText(cards[0].querySelector('strong'), overall === null ? 'Not assessed' : overall + ' / 100');
    var readiness = score(breakdown.currentReadiness ?? breakdown.current_readiness);
    if (cards[1]) setText(cards[1].querySelector('strong'), readiness === null ? 'Not separately assessed' : readiness + ' / 100');
    var potential = score(prediction.potentialOverall ?? breakdown.potentialRating ?? breakdown.potential_rating);
    if (cards[2]) setText(cards[2].querySelector('strong'), potential === null ? 'Not assessed' : potential + ' / 100');
    if (cards[3]) setText(cards[3].querySelector('strong'), confidence.label);
  }

  function repairRoles() {
    var cards = document.querySelectorAll('.coach-profile-v8 .role-summary article');
    if (!cards.length) return;
    var roles = roleRows();
    var prediction = analysis().predictionDetails || player().prediction_analysis || {};
    var current = roles[0] || null;
    var future = (prediction.futurePositions || [])[0] || null;
    if (cards[0]) {
      setText(cards[0].querySelector('strong'), current ? (current.roleLabel || current.role || current.position || 'Assessed role') : 'Not assessed');
      setText(cards[0].querySelector('span'), current ? Math.round(Number(current.score)) + ' / 100 role fit' : 'Complete role evidence to calculate this');
    }
    if (cards[1]) {
      setText(cards[1].querySelector('strong'), future ? (future.positionLabel || future.position || prediction.bestProjectedFuturePosition || 'Projected position') : 'Not assessed');
      var futureScore = future && (future.projectedRating ?? future.score);
      setText(cards[1].querySelector('span'), finite(futureScore) ? Math.round(Number(futureScore)) + ' / 100 projected fit' : 'No supported future-role score yet');
    }
  }

  function repairPositionCards() {
    var grid = document.querySelector('.coach-profile-v8 .position-grid');
    if (!grid) return;
    var rows = positionRows().slice(0,4);
    if (!rows.length) {
      grid.innerHTML = '<article class="position-card"><small>Position ratings</small><strong>—</strong><span>Not assessed</span></article>';
      return;
    }
    grid.innerHTML = rows.map(function (row,index) {
      var code = row.position || row.role || '';
      var label = window.ScoutLinkScoringV4 ? window.ScoutLinkScoringV4.positionLabel(code) : code;
      return '<article class="position-card"><small>' + label + '</small><strong>' + Math.round(Number(row.score)) +
        '</strong><span>' + (index === 0 ? 'Best current' : 'Supported alternative') + '</span></article>';
    }).join('');
  }

  function repairAttributes() {
    document.querySelectorAll('.coach-profile-v8 .attribute-row b').forEach(function (node) {
      var match = String(node.textContent || '').match(/\d+(?:\.\d+)?/);
      if (!match) return;
      var value = Number(match[0]);
      if (value > 10) value /= 10;
      node.textContent = Math.max(1,Math.min(10,Math.round(value))) + '/10';
    });
  }

  function repairComponents() {
    var source = analysis().overallBreakdown || player().overall_breakdown || {};
    var categories = source.categories || source.categoryBreakdown || {};
    var values = [
      ['Technical',categories.technical],
      ['Tactical IQ',categories.tacticalCognitive ?? categories.tactical],
      ['Physical profile',categories.physical],
      ['Mental / coachability',categories.mentalDevelopmental ?? categories.mental]
    ].filter(function (row) { return finite(row[1]); });
    if (!values.length) return;
    var list = document.querySelector('.coach-profile-v8 .breakdown-list');
    if (!list) return;
    list.innerHTML = values.map(function (row) {
      var rating = score(row[1]);
      return '<div class="rating-bar"><span>' + row[0] + '</span><i><em style="width:' + rating + '%"></em></i><b>' + rating + '</b></div>';
    }).join('');
  }

  function repair() {
    scheduled = false;
    if (!document.querySelector('.coach-profile-v8')) return;
    repairValue();
    repairOverview();
    repairSnapshot();
    repairRoles();
    repairPositionCards();
    repairAttributes();
    repairComponents();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(repair,20);
  }

  document.addEventListener('scoutlink:profile-ready',schedule);
  document.addEventListener('scoutlink:demo-v4-authoritative-ready',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
}());

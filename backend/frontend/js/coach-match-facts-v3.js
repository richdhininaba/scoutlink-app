'use strict';

/*
 * Full V4 replacement for frontend/js/coach-match-facts-v3.js.
 *
 * The page keeps its existing five-step Match Facts workflow. This file owns
 * the V4 rating step and submission contract: whole-number overall performance,
 * position played, and the correct position-aware attribute snapshot.
 */
(function () {
  var draftKey = 'scoutlink.coach.matchFacts.v4';
  var options = null;
  var initAttempts = 0;

  function scoring() {
    return window.ScoutLinkScoringV4;
  }

  function playerById(id) {
    return (window.myPlayers || []).find(function (player) {
      return String(player.id) === String(id);
    }) || null;
  }

  function playerName(player) {
    return (((player && player.first_name) || '') + ' ' +
      ((player && player.last_name) || '')).trim() || 'Player';
  }

  function initials(player) {
    return (((player && player.first_name) || '?').charAt(0) +
      ((player && player.last_name) || '?').charAt(0)).toUpperCase();
  }

  function positionPlayed(player) {
    var slot = Object.keys(window.state.playerPositions || {}).find(function (key) {
      return String(window.state.playerPositions[key]) === String(player.id);
    });
    var fromSlot = slot ? slot.replace(/\d+$/g, '').replace(/^(LAM|RAM|CAM)$/g, 'AM') : '';
    return scoring().normalisePosition(fromSlot) ||
      scoring().normalisePosition(player.specific_position || player.primary_position) ||
      'CM';
  }

  function outputFor(playerId) {
    var goals = (window.state.goals || []).filter(function (event) {
      return String(event.player) === String(playerId);
    }).length;
    var assists = (window.state.goals || []).filter(function (event) {
      return String(event.assist) === String(playerId);
    }).length;
    var yellow = (window.state.yellowCards || []).filter(function (id) {
      return String(id) === String(playerId);
    }).length;
    var red = (window.state.redCards || []).filter(function (id) {
      return String(id) === String(playerId);
    }).length;
    var parts = [];
    if (goals) parts.push(goals + ' goal' + (goals === 1 ? '' : 's'));
    if (assists) parts.push(assists + ' assist' + (assists === 1 ? '' : 's'));
    if (yellow) parts.push('Yellow card');
    if (red) parts.push('Red card');
    return parts.join(' · ') || 'No recorded events';
  }

  function wholeOptions(value) {
    var selected = Number.isInteger(Number(value)) ? Number(value) : '';
    return '<option value="">Not observed</option>' +
      Array.from({ length:10 }, function (_, index) { return index + 1; })
        .map(function (rating) {
          return '<option value="' + rating + '"' +
            (rating === selected ? ' selected' : '') + '>' +
            rating + ' / 10</option>';
        }).join('');
  }

  function savedRatings(playerId) {
    window.state.attributeRatings = window.state.attributeRatings || {};
    return window.state.attributeRatings[playerId] || {};
  }

  function renderPlayerAssessment(player) {
    var position = positionPlayed(player);
    var overall = window.state.overallPerformance &&
      window.state.overallPerformance[player.id];
    overall = Number.isInteger(Number(overall)) ? Number(overall) : '';
    return '<article class="mf3-panel" data-v4-player-card="' + player.id + '" style="margin-bottom:14px">' +
      '<header class="mf3-panel-head">' +
        '<div class="mf3-rating-player">' +
          '<span class="mf3-rating-avatar">' + initials(player) + '</span>' +
          '<span><b>' + scoring().esc(playerName(player)) + '</b><span>' +
            scoring().esc(scoring().positionLabel(position, options)) + ' · ' +
            scoring().esc(outputFor(player.id)) +
          '</span></span>' +
        '</div>' +
        '<label class="v4-match-overall"><span>Overall match performance</span>' +
          '<select data-v4-overall="' + player.id + '">' + wholeOptions(overall) + '</select>' +
        '</label>' +
      '</header>' +
      '<div class="mf3-panel-body">' +
        '<div class="sl-v4-match-assessment" data-v4-assessment="' + player.id + '"></div>' +
      '</div>' +
    '</article>';
  }

  function captureRatings() {
    window.state.overallPerformance = window.state.overallPerformance || {};
    window.state.ratings = window.state.ratings || {};
    window.state.attributeRatings = window.state.attributeRatings || {};

    document.querySelectorAll('[data-v4-player-card]').forEach(function (card) {
      var playerId = card.getAttribute('data-v4-player-card');
      var player = playerById(playerId);
      if (!player) return;
      var position = positionPlayed(player);
      var overallSelect = card.querySelector('[data-v4-overall]');
      var overall = scoring().validateRating(overallSelect ? overallSelect.value : null);
      window.state.overallPerformance[playerId] = overall;
      window.state.attributeRatings[playerId] = scoring().collectAssessment(
        card.querySelector('[data-v4-assessment]'),
        position,
        options
      );
      window.state.ratings[playerId] = {
        overall_performance:overall,
        attribute_ratings:window.state.attributeRatings[playerId],
        position_played:position
      };
    });
  }

  function allPlayersRated() {
    var cards = Array.from(document.querySelectorAll('[data-v4-player-card]'));
    return cards.length > 0 && cards.every(function (card) {
      var select = card.querySelector('[data-v4-overall]');
      return select && select.value !== '';
    });
  }

  function installRatingStyles() {
    if (document.getElementById('matchFactsV4Styles')) return;
    var style = document.createElement('style');
    style.id = 'matchFactsV4Styles';
    style.textContent =
      '.v4-match-overall{display:grid;gap:5px;min-width:190px}' +
      '.v4-match-overall span{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase}' +
      '.v4-match-overall select{min-height:38px;padding:0 9px;border:1px solid #cbd5e1;background:#fff;color:#0f172a}' +
      '.mf3-v4-rating-intro{padding:13px 15px;margin-bottom:14px;border-left:4px solid #0f9f75;background:#eefbf7;color:#31534a;font-size:12px}' +
      '@media(max-width:760px){.v4-match-overall{width:100%;min-width:0}.mf3-panel-head{align-items:stretch;flex-direction:column}}';
    document.head.appendChild(style);
  }

  function saveDraft() {
    try {
      captureRatings();
      localStorage.setItem(draftKey, JSON.stringify({
        version:4,
        savedAt:new Date().toISOString(),
        state:window.state
      }));
    } catch (_) {}
  }

  function restoreDraft() {
    try {
      var parsed = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!parsed || parsed.version !== 4 || !parsed.state) return;
      window.state.attributeRatings = parsed.state.attributeRatings || window.state.attributeRatings || {};
    } catch (_) {}
  }

  function overrideRatingStep() {
    window.renderStep4 = function () {
      if (typeof window.setStep === 'function') window.setStep(4);
      window.state.attributeRatings = window.state.attributeRatings || {};
      window.state.overallPerformance = window.state.overallPerformance || {};

      var selected = (window.state.players || []).map(function (selectedPlayer) {
        return playerById(selectedPlayer.id) || selectedPlayer;
      }).filter(Boolean);

      var host = document.getElementById('stepContent');
      if (!host) return;
      if (!selected.length) {
        host.innerHTML = '<div class="table-card"><div style="padding:28px">No players were selected.</div></div>';
        return;
      }

      host.innerHTML =
        '<div class="mf3-shell">' +
          '<div class="mf3-v4-rating-intro"><b>Match-only assessment</b><br>' +
          'Rate the overall performance and only the attributes observed in this match. Every value is a whole number from 1 to 10; use Not observed rather than guessing.</div>' +
          selected.map(renderPlayerAssessment).join('') +
          '<section class="mf3-actionbar">' +
            '<div><b>Complete every overall match-performance rating</b><span>Attribute fields may remain Not observed.</span></div>' +
            '<div class="mf3-action-buttons">' +
              '<button class="mf3-btn" type="button" id="mf4BackEvents">Back</button>' +
              '<button class="mf3-btn is-primary" type="button" id="mf4NextReview">Next · Review match</button>' +
            '</div>' +
          '</section>' +
        '</div>';

      selected.forEach(function (player) {
        scoring().renderAssessment(
          host.querySelector('[data-v4-assessment="' + player.id + '"]'),
          positionPlayed(player),
          savedRatings(player.id),
          options
        );
      });

      host.querySelectorAll('select').forEach(function (select) {
        select.addEventListener('change', saveDraft);
      });

      document.getElementById('mf4BackEvents').addEventListener('click', function () {
        saveDraft();
        if (window.state.mode === 'live' && typeof window.renderStep3Live === 'function') {
          window.renderStep3Live();
        } else if (typeof window.renderStep3Post === 'function') {
          window.renderStep3Post();
        } else if (typeof window.renderStep2Post === 'function') {
          window.renderStep2Post();
        }
      });

      document.getElementById('mf4NextReview').addEventListener('click', function () {
        try {
          captureRatings();
          if (!allPlayersRated()) {
            window.alert('Add a whole-number overall match-performance rating for every selected player.');
            return;
          }
          if (typeof window.renderStep5 === 'function') window.renderStep5();
        } catch (error) {
          window.alert(error.message);
        }
      });
    };
  }

  function buildPlayerSubmission(player) {
    var id = player.id;
    var goals = (window.state.goals || []).filter(function (event) {
      return String(event.player) === String(id);
    }).length;
    var assists = (window.state.goals || []).filter(function (event) {
      return String(event.assist) === String(id);
    }).length;
    var yellowCards = (window.state.yellowCards || []).filter(function (value) {
      return String(value) === String(id);
    }).length;
    var redCards = (window.state.redCards || []).filter(function (value) {
      return String(value) === String(id);
    }).length;

    return {
      playerId:id,
      goals:goals,
      assists:assists,
      yellowCards:yellowCards,
      redCards:redCards,
      performanceScore:window.state.overallPerformance[id],
      overallPerformance:window.state.overallPerformance[id],
      positionPlayed:positionPlayed(player),
      attributeRatings:window.state.attributeRatings[id] || {},
      ratingScale:'ten',
      notes:window.state.coachNotes || ''
    };
  }

  function overrideSubmission() {
    window.submitMatchFacts = async function () {
      var button = document.getElementById('submitBtn') || document.getElementById('mf3SubmitMobile');
      var message = document.getElementById('submitMsg');
      if (button) {
        button.disabled = true;
        button.textContent = 'Submitting…';
      }

      try {
        captureRatings();
        if (!allPlayersRated()) {
          throw new Error('Every selected player needs an overall match-performance rating.');
        }

        var selected = (window.state.players || []).map(function (row) {
          return playerById(row.id) || row;
        }).filter(Boolean);

        var response = await window.api('POST', '/api/match-facts', {
          fixtureId:window.state.fixtureId || null,
          teamId:window.state.coachTeamId || null,
          matchDate:window.state.matchDate,
          opponent:window.state.opponent,
          homeScore:Number(window.state.homeScore) || 0,
          awayScore:Number(window.state.awayScore) || 0,
          format:window.state.format,
          matchFormat:String(window.state.format || '').replace(/\D/g, '') + 'v' +
            String(window.state.format || '').replace(/\D/g, ''),
          formation:window.state.formation,
          mode:window.state.mode || 'post',
          players:selected.map(buildPlayerSubmission),
          events:window.state.events || [],
          playerPositions:window.state.playerPositions || {},
          coachNotes:window.state.coachNotes || '',
          confirmed:true
        });

        localStorage.removeItem(draftKey);
        if (message) {
          message.textContent = response.message || 'Match Facts submitted.';
          message.style.color = '#08775e';
        }
        window.setTimeout(function () {
          window.location.href = '/coach/my-players';
        }, 700);
      } catch (error) {
        if (message) {
          message.textContent = error.message || 'The Match Facts could not be submitted.';
          message.style.color = '#b42335';
        } else {
          window.alert(error.message);
        }
        if (button) {
          button.disabled = false;
          button.textContent = 'Submit Match Facts';
        }
      }
    };
  }

  async function init() {
    if (!scoring()) {
      initAttempts += 1;
      if (initAttempts < 100) window.setTimeout(init, 50);
      return;
    }
    options = await scoring().loadOptions();
    installRatingStyles();
    restoreDraft();
    overrideRatingStep();
    overrideSubmission();

    /*
     * Replace the old group label anywhere the existing setup step renders it.
     * Exact positions continue to come from the formation slots.
     */
    var observer = new MutationObserver(function () {
      document.querySelectorAll('select').forEach(function (select) {
        Array.from(select.options).forEach(function (option) {
          if (option.value === 'Forward' || option.textContent.trim() === 'Forward') {
            option.value = 'Attacker';
            option.textContent = 'Attacker';
          }
        });
      });
      document.querySelectorAll('input[type="range"][step="0.5"]').forEach(function (input) {
        input.step = '1';
      });
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
}());

'use strict';

(function () {
  if (document.body) document.body.classList.add('coach-match-facts-v3');

  var DRAFT_KEY = 'scoutlink.coach.matchFacts.v3';
  var selectedPlayerIds = {};
  var playerSearch = '';
  var playerFilter = '';
  var draftLoaded = false;
  var saveTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function isPublicDemo() {
    return typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
  }

  function initialsFor(player) {
    return (((player && player.first_name) || '?').charAt(0) +
      ((player && player.last_name) || '?').charAt(0)).toUpperCase();
  }

  function fullName(player) {
    return (((player && player.first_name) || '') + ' ' +
      ((player && player.last_name) || '')).trim() || 'Player';
  }

  function selectedPlayers() {
    return (window.myPlayers || []).filter(function (player) {
      return !!selectedPlayerIds[String(player.id)];
    });
  }

  function playerById(id) {
    return (window.myPlayers || []).find(function (player) {
      return String(player.id) === String(id);
    }) || null;
  }

  function positionOf(player) {
    return player && (player.specific_position || player.primary_position || player.position_group) || 'Position TBC';
  }

  function slotsForFormation() {
    return (window.FORMATION_SLOTS && window.FORMATION_SLOTS[window.state.formation]) ||
      (window.FORMATION_SLOTS && window.FORMATION_SLOTS['4-4-2']) || [];
  }

  function requiredStarterCount() {
    return slotsForFormation().length;
  }

  function dateLabel(value) {
    if (!value) return 'Date TBC';
    var date = new Date(value + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function currentCoachId() {
    return window.Auth && window.Auth.user && window.Auth.user.id || 'coach';
  }

  function serialisableDraft() {
    var source = window.state || {};
    return {
      version: 3,
      coachId: currentCoachId(),
      savedAt: new Date().toISOString(),
      currentStep: window.currentStep || 1,
      selectedPlayerIds: selectedPlayerIds,
      state: {
        mode: 'post',
        opponent: source.opponent || '',
        matchDate: source.matchDate || '',
        format: source.format || '11',
        formation: source.formation || '4-4-2',
        myTeamName: source.myTeamName || 'My team',
        coachTeamId: source.coachTeamId || null,
        fixtureId: source.fixtureId || null,
        fixtures: source.fixtures || [],
        players: source.players || [],
        goals: source.goals || [],
        yellowCards: source.yellowCards || [],
        redCards: source.redCards || [],
        homeScore: Number(source.homeScore) || 0,
        awayScore: Number(source.awayScore) || 0,
        result: source.result || '',
        ratings: source.ratings || {},
        overallPerformance: source.overallPerformance || {},
        playerPositions: source.playerPositions || {},
        events: source.events || [],
        coachNotes: source.coachNotes || ''
      }
    };
  }

  function writeDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serialisableDraft()));
      updateAutosaveLabel('Draft saved just now');
    } catch (_) {}
  }

  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    updateAutosaveLabel('Saving draft…');
    saveTimer = setTimeout(writeDraft, 220);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  function loadDraft() {
    if (draftLoaded) return;
    draftLoaded = true;

    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (!draft || draft.version !== 3 || String(draft.coachId) !== String(currentCoachId())) return;

      var savedState = draft.state || {};
      Object.keys(savedState).forEach(function (key) {
        if (key === 'fixtures' && window.state.fixtures && window.state.fixtures.length) return;
        window.state[key] = savedState[key];
      });

      selectedPlayerIds = draft.selectedPlayerIds || {};
      window.currentStep = Math.max(1, Math.min(5, Number(draft.currentStep) || 1));
      updateAutosaveLabel('Draft restored');
    } catch (_) {}
  }

  function updateAutosaveLabel(text) {
    var label = document.getElementById('mf3AutosaveText');
    if (label) label.textContent = text;
  }

  function setupStepAttributes() {
    ['s1','s2','s3','s4','s5'].forEach(function (id, index) {
      var element = document.getElementById(id);
      if (element) element.setAttribute('data-step-number', String(index + 1));
    });
  }

  function updateHero(step) {
    var hero = document.getElementById('mf3Hero');
    if (!hero) return;

    var data = {
      1: {
        kicker: 'Coach workspace',
        title: 'Record Match Facts',
        copy: 'Build trustworthy player evidence from one completed match.',
        side: 'New post-match record',
        sub: 'No match submitted yet.'
      },
      2: {
        kicker: (window.state.opponent || 'Opponent') + ' · ' + dateLabel(window.state.matchDate),
        title: 'Set the formation',
        copy: 'Assign each starter to the position used in this Match Fact and keep unassigned selected players as substitutes.',
        side: window.state.formation + ' selected',
        sub: Object.keys(window.state.playerPositions || {}).filter(function (key) {
          return window.state.playerPositions[key];
        }).length + ' assigned · ' + selectedPlayers().length + ' selected'
      },
      3: {
        kicker: (window.state.myTeamName || 'My team') + ' vs ' + (window.state.opponent || 'Opponent'),
        title: 'Add the match events',
        copy: 'Record the final score, goals, assists and cards that update player profiles.',
        side: selectedPlayers().length + ' players involved',
        sub: window.state.formation + ' · Post-match evidence'
      },
      4: {
        kicker: (window.state.myTeamName || 'My team') + ' ' +
          (Number(window.state.homeScore) || 0) + '–' +
          (Number(window.state.awayScore) || 0) + ' ' +
          (window.state.opponent || 'Opponent'),
        title: 'Rate the players',
        copy: 'Rate each selected player’s performance in this match only.',
        side: Object.keys(window.state.overallPerformance || {}).length +
          ' of ' + selectedPlayers().length + ' rated',
        sub: '1 poor · 10 outstanding'
      },
      5: {
        kicker: 'Final evidence check',
        title: 'Review the Match Fact',
        copy: 'Confirm the evidence before player profiles, statistics and confidence update.',
        side: (window.state.myTeamName || 'My team') + ' ' +
          (Number(window.state.homeScore) || 0) + '–' +
          (Number(window.state.awayScore) || 0) + ' ' +
          (window.state.opponent || 'Opponent'),
        sub: selectedPlayers().length + ' players · ' +
          averageRating().toFixed(1) + ' average rating'
      }
    }[step] || {};

    hero.innerHTML =
      '<div><small>' + esc(data.kicker) + '</small><h1>' + esc(data.title) + '</h1><p>' +
      esc(data.copy) + '</p></div>' +
      '<aside class="mf3-hero-side"><b>' + esc(data.side) + '</b><span>' +
      esc(data.sub) + '</span><span class="mf3-autosave"><i></i><span id="mf3AutosaveText">Draft saved just now</span></span></aside>';
  }

  function installHero() {
    if (document.getElementById('mf3Hero')) return;
    var stepper = document.getElementById('stepIndicator');
    if (!stepper) return;

    var hero = document.createElement('section');
    hero.id = 'mf3Hero';
    hero.className = 'mf3-hero';
    stepper.parentNode.insertBefore(hero, stepper);
    updateHero(1);
  }

  function installTopbarActions() {
    var right = document.querySelector('.topbar-right');
    if (!right || document.getElementById('mf3SaveExit')) return;

    var button = document.createElement('button');
    button.id = 'mf3SaveExit';
    button.className = 'btn btn-sm btn-ghost';
    button.type = 'button';
    button.textContent = 'Save and exit';
    button.addEventListener('click', function () {
      captureVisibleStep();
      writeDraft();
      window.location.href = route('coach-dashboard.html');
    });

    right.insertBefore(button, right.firstChild);
  }

  window.setStep = function (number) {
    window.currentStep = number;
    ['s1','s2','s3','s4','s5'].forEach(function (id, index) {
      var element = document.getElementById(id);
      if (!element) return;
      element.className = 'step' +
        (index + 1 === number ? ' active' : index + 1 < number ? ' done' : '');
    });
    updateHero(number);
    scheduleDraftSave();
  };

  function formationOptions(format, selected) {
    var options = window.FORMATIONS && window.FORMATIONS[String(format)] ||
      window.FORMATIONS && window.FORMATIONS['11'] || ['4-4-2'];

    return options.map(function (formation) {
      return '<option value="' + esc(formation) + '"' +
        (String(formation) === String(selected) ? ' selected' : '') + '>' +
        esc(formation) + '</option>';
    }).join('');
  }

  function fixtureOptions() {
    return '<option value="">Enter match facts manually</option>' +
      (window.state.fixtures || []).map(function (fixture) {
        var selected = String(window.state.fixtureId || '') === String(fixture.id || '');
        var label = typeof window.fixtureLabel === 'function'
          ? window.fixtureLabel(fixture)
          : (fixture.fixture_date || '') + ' vs ' + (fixture.opponent || 'Opponent');
        return '<option value="' + esc(fixture.id) + '"' +
          (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('');
  }

  function syncSelectedFromState() {
    if (Object.keys(selectedPlayerIds).length) return;
    (window.state.players || []).forEach(function (player) {
      selectedPlayerIds[String(player.id)] = true;
    });
  }

  function playerCard(player) {
    var selected = !!selectedPlayerIds[String(player.id)];
    var status = player.is_active === false ? 'Draft' : 'Available';

    return '<button class="mf3-player' + (selected ? ' is-selected' : '') +
      '" type="button" data-player-card="' + esc(player.id) + '">' +
      '<span class="mf3-player-avatar" aria-hidden="true">' + esc(initialsFor(player)) + '</span>' +
      '<span class="mf3-player-copy"><b>' + esc(fullName(player)) + '</b><span>' +
      esc(positionOf(player)) + ' · ' + esc(player.age_group || 'Age TBC') + '</span></span>' +
      '<span class="mf3-player-check" aria-hidden="true">' + (selected ? '✓' : '') + '</span>' +
      '<span class="mf3-player-meta"><span class="mf3-pill ' +
      (status === 'Available' ? 'is-green' : 'is-orange') + '">' + status +
      '</span></span></button>';
  }

  function filteredPlayers() {
    var query = playerSearch.toLowerCase();
    return (window.myPlayers || []).filter(function (player) {
      var name = fullName(player).toLowerCase();
      var position = positionOf(player).toLowerCase();
      var matchesQuery = !query || name.indexOf(query) >= 0 || position.indexOf(query) >= 0;
      var matchesFilter = !playerFilter ||
        String(player.position_group || '').toLowerCase() === playerFilter.toLowerCase();
      return matchesQuery && matchesFilter;
    });
  }

  function drawPlayerGrid() {
    var grid = document.getElementById('mf3PlayerGrid');
    if (!grid) return;

    var players = filteredPlayers();
    grid.innerHTML = players.length
      ? players.map(playerCard).join('')
      : '<div class="mf3-empty" style="grid-column:1/-1">No players match this search.</div>';

    grid.querySelectorAll('[data-player-card]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = String(card.getAttribute('data-player-card'));
        selectedPlayerIds[id] = !selectedPlayerIds[id];
        if (!selectedPlayerIds[id]) delete selectedPlayerIds[id];
        drawPlayerGrid();
        updateSetupSummary();
        scheduleDraftSave();
      });
    });
  }

  function updateSetupSummary() {
    var selected = selectedPlayers();
    var count = selected.length;
    var required = requiredStarterCount();

    var countText = document.getElementById('mf3SelectedCount');
    var countSide = document.getElementById('mf3SelectedSide');
    var warning = document.getElementById('mf3SelectionWarning');
    var next = document.getElementById('mf3NextFormation');

    if (countText) countText.textContent = count + ' player' + (count === 1 ? '' : 's') + ' selected';
    if (countSide) countSide.textContent = String(count);
    if (warning) {
      warning.textContent = count < required
        ? 'A ' + window.state.format + '-a-side starting formation needs ' +
          required + ' selected players. Select at least ' + (required - count) + ' more.'
        : (count - required) + ' selected player' +
          (count - required === 1 ? '' : 's') + ' will begin as substitutes.';
      warning.className = 'mf3-notice' + (count < required ? ' is-warning' : ' is-success');
    }
    if (next) next.disabled = count < required;
  }

  window.renderStep1 = function () {
    window.setStep(1);
    syncSelectedFromState();

    var formationHtml = formationOptions(window.state.format, window.state.formation);
    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell">' +
        '<section class="mf3-layout">' +
          '<article class="mf3-panel">' +
            '<header class="mf3-panel-head"><div class="mf3-panel-title"><h2>Match setup</h2>' +
            '<p>Choose a scheduled fixture or enter the completed match manually.</p></div>' +
            '<span class="mf3-pill is-green">Post-match evidence</span></header>' +
            '<div class="mf3-panel-body">' +
              '<div class="mf3-form-grid">' +
                '<div class="mf3-field is-full"><label for="mfFixture">Use upcoming fixture</label>' +
                '<select class="mf3-select" id="mfFixture">' + fixtureOptions() + '</select>' +
                '<small>Choosing a fixture fills the opponent and date automatically.</small></div>' +
                '<div class="mf3-field"><label for="mfOpponent">Opponent</label>' +
                '<input class="mf3-input" id="mfOpponent" value="' + esc(window.state.opponent || '') +
                '" placeholder="Opponent name"></div>' +
                '<div class="mf3-field"><label for="mfDate">Match date</label>' +
                '<input class="mf3-input" id="mfDate" type="date" value="' +
                esc(window.state.matchDate || new Date().toISOString().slice(0,10)) + '"></div>' +
                '<div class="mf3-field"><label for="mfFormat">Match format</label>' +
                '<select class="mf3-select" id="mfFormat">' +
                  ['5','7','9','11'].map(function (format) {
                    return '<option value="' + format + '"' +
                      (String(window.state.format) === format ? ' selected' : '') + '>' +
                      format + '-a-side</option>';
                  }).join('') +
                '</select></div>' +
                '<div class="mf3-field"><label for="mfFormation">Formation</label>' +
                '<select class="mf3-select" id="mfFormation">' + formationHtml + '</select></div>' +
              '</div>' +

              '<div class="mf3-section-label">Select every starter and substitute who appeared</div>' +
              '<div class="mf3-player-tools">' +
                '<input class="mf3-input" id="mf3PlayerSearch" placeholder="Search squad" value="' +
                esc(playerSearch) + '">' +
                '<select class="mf3-select" id="mf3PositionFilter">' +
                  '<option value="">All positions</option>' +
                  ['Goalkeeper','Defender','Midfielder','Forward'].map(function (group) {
                    return '<option value="' + group + '"' +
                      (playerFilter === group ? ' selected' : '') + '>' + group + '</option>';
                  }).join('') +
                '</select>' +
                '<button class="mf3-btn" type="button" id="mf3SelectAll">Select all available</button>' +
              '</div>' +
              '<div class="mf3-players" id="mf3PlayerGrid"></div>' +
            '</div>' +
          '</article>' +

          '<aside>' +
            '<section class="mf3-sidecard"><h3>Match summary</h3>' +
              '<div class="mf3-summary-row"><span>Opponent</span><b id="mf3SummaryOpponent">' +
              esc(window.state.opponent || 'Not entered') + '</b></div>' +
              '<div class="mf3-summary-row"><span>Date</span><b id="mf3SummaryDate">' +
              esc(dateLabel(window.state.matchDate)) + '</b></div>' +
              '<div class="mf3-summary-row"><span>Formation</span><b id="mf3SummaryFormation">' +
              esc(window.state.formation) + '</b></div>' +
              '<div class="mf3-summary-row"><span>Selected</span><b id="mf3SelectedSide">0</b></div>' +
            '</section>' +
            '<section class="mf3-sidecard"><h3>Before you continue</h3>' +
              '<p>Select every player who appeared, including substitutes.</p>' +
              '<div class="mf3-notice is-warning" id="mf3SelectionWarning" style="margin-top:10px"></div>' +
            '</section>' +
          '</aside>' +
        '</section>' +

        '<section class="mf3-actionbar">' +
          '<div><b id="mf3SelectedCount">0 players selected</b>' +
          '<span>Selected starters are assigned next; remaining players stay on the bench.</span></div>' +
          '<div class="mf3-action-buttons">' +
            '<button class="mf3-btn" type="button" id="mf3SaveDraft">Save draft</button>' +
            '<button class="mf3-btn is-primary" type="button" id="mf3NextFormation">Next · Assign positions</button>' +
          '</div>' +
        '</section>' +
        mobileSticky('', 'Next · Positions', 'mf3NextFormationMobile') +
      '</div>';

    drawPlayerGrid();
    updateSetupSummary();

    var fixture = document.getElementById('mfFixture');
    fixture.addEventListener('change', function () {
      window.state.fixtureId = fixture.value || null;
      if (fixture.value && typeof window.applySelectedFixture === 'function') {
        window.applySelectedFixture(fixture.value);
      }
      updateSetupLiveSummary();
      scheduleDraftSave();
    });

    ['mfOpponent','mfDate','mfFormation'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        updateSetupLiveSummary();
        scheduleDraftSave();
      });
      document.getElementById(id).addEventListener('change', function () {
        updateSetupLiveSummary();
        scheduleDraftSave();
      });
    });

    document.getElementById('mfFormat').addEventListener('change', function () {
      var formation = document.getElementById('mfFormation');
      formation.innerHTML = formationOptions(this.value, '');
      window.state.format = this.value;
      window.state.formation = formation.value;
      window.state.playerPositions = {};
      updateSetupLiveSummary();
      updateSetupSummary();
      scheduleDraftSave();
    });

    document.getElementById('mf3PlayerSearch').addEventListener('input', function () {
      playerSearch = this.value;
      drawPlayerGrid();
    });

    document.getElementById('mf3PositionFilter').addEventListener('change', function () {
      playerFilter = this.value;
      drawPlayerGrid();
    });

    document.getElementById('mf3SelectAll').addEventListener('click', function () {
      filteredPlayers().forEach(function (player) {
        if (player.is_active !== false) selectedPlayerIds[String(player.id)] = true;
      });
      drawPlayerGrid();
      updateSetupSummary();
      scheduleDraftSave();
    });

    document.getElementById('mf3SaveDraft').addEventListener('click', function () {
      captureSetup();
      writeDraft();
    });

    bindForwardButton('mf3NextFormation', window.goToStep2);
    bindForwardButton('mf3NextFormationMobile', window.goToStep2);
  };

  function updateSetupLiveSummary() {
    var opponent = document.getElementById('mfOpponent');
    var date = document.getElementById('mfDate');
    var formation = document.getElementById('mfFormation');

    if (opponent) window.state.opponent = opponent.value.trim();
    if (date) window.state.matchDate = date.value;
    if (formation) window.state.formation = formation.value;

    var opponentSummary = document.getElementById('mf3SummaryOpponent');
    var dateSummary = document.getElementById('mf3SummaryDate');
    var formationSummary = document.getElementById('mf3SummaryFormation');

    if (opponentSummary) opponentSummary.textContent = window.state.opponent || 'Not entered';
    if (dateSummary) dateSummary.textContent = dateLabel(window.state.matchDate);
    if (formationSummary) formationSummary.textContent = window.state.formation || 'Not selected';
  }

  function captureSetup() {
    var fixture = document.getElementById('mfFixture');
    var opponent = document.getElementById('mfOpponent');
    var date = document.getElementById('mfDate');
    var format = document.getElementById('mfFormat');
    var formation = document.getElementById('mfFormation');

    if (fixture) window.state.fixtureId = fixture.value || null;
    if (opponent) window.state.opponent = opponent.value.trim();
    if (date) window.state.matchDate = date.value;
    if (format) window.state.format = format.value;
    if (formation) window.state.formation = formation.value;

    window.state.mode = 'post';
    window.state.players = selectedPlayers().map(function (player) {
      return {
        id: player.id,
        name: fullName(player),
        position: positionOf(player)
      };
    });
  }

  window.goToStep2 = function () {
    captureSetup();

    if (!window.state.opponent || !window.state.matchDate) {
      window.alert('Please add the opponent and match date.');
      return;
    }

    if (window.state.players.length < requiredStarterCount()) {
      window.alert('Select at least ' + requiredStarterCount() +
        ' players for this starting formation.');
      return;
    }

    window.renderStep2Post();
  };

  function autoAssign() {
    var slots = slotsForFormation();
    var players = selectedPlayers();
    var used = {};

    var priority = function (slot, player) {
      var slotGroup = typeof window.posGroupFromSlot === 'function'
        ? window.posGroupFromSlot(slot.key)
        : '';
      var playerGroup = String(player.position_group || '').toLowerCase();
      var playerPosition = String(positionOf(player) || '').toUpperCase();
      var score = 0;

      if (slotGroup && playerGroup === slotGroup.toLowerCase()) score += 20;
      if (playerPosition && (slot.key.indexOf(playerPosition) >= 0 ||
          playerPosition.indexOf(slot.label) >= 0)) score += 12;
      if (slot.label === 'GK' && playerPosition === 'GK') score += 50;
      return score;
    };

    var assignments = {};
    slots.forEach(function (slot) {
      var options = players.filter(function (player) {
        return !used[String(player.id)];
      }).sort(function (a, b) {
        return priority(slot, b) - priority(slot, a);
      });

      if (options.length) {
        assignments[slot.key] = options[0].id;
        used[String(options[0].id)] = true;
      }
    });

    window.state.playerPositions = assignments;
  }

  function assignmentCount() {
    return Object.keys(window.state.playerPositions || {}).filter(function (key) {
      return window.state.playerPositions[key];
    }).length;
  }

  function benchPlayers() {
    var assigned = Object.keys(window.state.playerPositions || {}).map(function (key) {
      return String(window.state.playerPositions[key] || '');
    }).filter(Boolean);

    return selectedPlayers().filter(function (player) {
      return assigned.indexOf(String(player.id)) < 0;
    });
  }

  function benchMarkup() {
    var bench = benchPlayers();
    if (!bench.length) {
      return '<div class="mf3-notice">Every selected player is currently assigned as a starter.</div>';
    }

    return '<div class="mf3-bench">' + bench.map(function (player) {
      return '<div class="mf3-bench-row">' +
        '<span class="mf3-bench-avatar">' + esc(initialsFor(player)) + '</span>' +
        '<span><b>' + esc(fullName(player)) + '</b><span>' +
        esc(positionOf(player)) + ' · Substitute</span></span>' +
        '<span class="mf3-pill is-blue">Bench</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function updateFormationSide() {
    var assigned = assignmentCount();
    var total = requiredStarterCount();
    var status = document.getElementById('assignStatus');
    var starters = document.getElementById('mf3AssignedCount');
    var subs = document.getElementById('mf3SubCount');
    var unassigned = document.getElementById('mf3UnassignedCount');
    var next = document.getElementById('mf3NextEvents');
    var nextMobile = document.getElementById('mf3NextEventsMobile');
    var bench = document.getElementById('mf3Bench');

    if (status) {
      status.innerHTML = assigned === total
        ? '<span class="mf3-pill is-green">Formation complete</span>'
        : '<span class="mf3-pill is-orange">' + assigned + ' of ' + total + ' assigned</span>';
    }
    if (starters) starters.textContent = assigned + ' of ' + total;
    if (subs) subs.textContent = String(benchPlayers().length);
    if (unassigned) unassigned.textContent = String(Math.max(0, total - assigned));
    if (next) next.disabled = assigned !== total;
    if (nextMobile) nextMobile.disabled = assigned !== total;
    if (bench) bench.innerHTML = benchMarkup();

    updateHero(2);
    scheduleDraftSave();
  }

  window.openAssignDropdown = function (slotKey, slots) {
    var panel = document.getElementById('playerDropdownPanel');
    if (!panel) return;

    var current = window.state.playerPositions[slotKey] || '';
    var assignedIds = Object.keys(window.state.playerPositions || {}).map(function (key) {
      return String(window.state.playerPositions[key] || '');
    });

    var options = selectedPlayers().map(function (player) {
      var taken = assignedIds.indexOf(String(player.id)) >= 0 &&
        String(player.id) !== String(current);
      return '<option value="' + esc(player.id) + '"' +
        (String(player.id) === String(current) ? ' selected' : '') +
        (taken ? ' disabled' : '') + '>' +
        esc(fullName(player)) + ' · ' + esc(positionOf(player)) +
        (taken ? ' · already assigned' : '') + '</option>';
    }).join('');

    panel.style.display = 'block';
    panel.innerHTML =
      '<div><div class="mf3-panel-title"><h3>Assign ' + esc(slotKey) +
      '</h3><p>Select the player who started in this position.</p></div>' +
      '<select class="mf3-select" id="assignSelect" style="margin-top:10px">' +
        '<option value="">Select player</option>' + options +
      '</select>' +
      '<div class="mf3-action-buttons" style="margin-top:9px">' +
        '<button class="mf3-btn is-primary is-small" id="confirmAssignBtn" type="button">Assign</button>' +
        (current ? '<button class="mf3-btn is-small" id="unassignBtn" type="button">Unassign</button>' : '') +
        '<button class="mf3-btn is-small" id="cancelAssignBtn" type="button">Cancel</button>' +
      '</div></div>';

    document.getElementById('confirmAssignBtn').addEventListener('click', function () {
      var value = document.getElementById('assignSelect').value;
      if (!value) {
        window.alert('Select a player.');
        return;
      }
      window.state.playerPositions[slotKey] = value;
      if (typeof window.refreshSlotUI === 'function') window.refreshSlotUI(slotKey);
      panel.style.display = 'none';
      updateFormationSide();
    });

    var unassign = document.getElementById('unassignBtn');
    if (unassign) {
      unassign.addEventListener('click', function () {
        delete window.state.playerPositions[slotKey];
        if (typeof window.refreshSlotUI === 'function') window.refreshSlotUI(slotKey);
        panel.style.display = 'none';
        updateFormationSide();
      });
    }

    document.getElementById('cancelAssignBtn').addEventListener('click', function () {
      panel.style.display = 'none';
    });
  };

  window.renderStep2Post = function () {
    window.setStep(2);
    var slots = slotsForFormation();
    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell">' +
        '<section class="mf3-formation-layout">' +
          '<article class="mf3-panel">' +
            '<header class="mf3-panel-head"><div class="mf3-panel-title"><h2>Starting formation</h2>' +
            '<p>Tap a pitch position to assign a selected player.</p></div>' +
            '<select class="mf3-select" id="mf3FormationSelect" style="width:130px;height:34px">' +
            formationOptions(window.state.format, window.state.formation) +
            '</select></header>' +
            '<div class="mf3-panel-body">' +
              '<div class="pitch-wrap" id="pitchWrap">' +
                window.buildPitchHtml(slots, true) +
              '</div>' +
              '<div id="playerDropdownPanel" style="display:none;margin-top:12px"></div>' +
            '</div>' +
          '</article>' +

          '<aside>' +
            '<section class="mf3-sidecard"><h3>Substitutes</h3>' +
              '<div id="mf3Bench">' + benchMarkup() + '</div>' +
            '</section>' +
            '<section class="mf3-sidecard"><h3>Formation check</h3>' +
              '<div class="mf3-summary-row"><span>Assigned starters</span><b id="mf3AssignedCount"></b></div>' +
              '<div class="mf3-summary-row"><span>Substitutes</span><b id="mf3SubCount"></b></div>' +
              '<div class="mf3-summary-row"><span>Unassigned positions</span><b id="mf3UnassignedCount"></b></div>' +
              '<div id="assignStatus" style="margin-top:10px"></div>' +
            '</section>' +
            '<section class="mf3-sidecard"><button class="mf3-btn is-block" id="mf3AutoAssign" type="button">Auto-assign best fit</button>' +
              '<div class="mf3-notice" style="margin-top:9px">These positions apply to this Match Fact and help calculate clean sheets correctly.</div>' +
            '</section>' +
          '</aside>' +
        '</section>' +

        '<section class="mf3-actionbar">' +
          '<div><b>Assign every starting position</b><span>Unassigned selected players remain substitutes.</span></div>' +
          '<div class="mf3-action-buttons">' +
            '<button class="mf3-btn" type="button" id="mf3BackSetup">Back</button>' +
            '<button class="mf3-btn is-primary" type="button" id="mf3NextEvents">Next · Add events</button>' +
          '</div>' +
        '</section>' +
        mobileSticky('Back', 'Next · Events', 'mf3NextEventsMobile', 'mf3BackSetupMobile') +
      '</div>';

    window.attachPitchSlotListeners(slots, true);
    updateFormationSide();

    document.getElementById('mf3FormationSelect').addEventListener('change', function () {
      window.state.formation = this.value;
      window.state.playerPositions = {};
      window.renderStep2Post();
    });

    document.getElementById('mf3AutoAssign').addEventListener('click', function () {
      autoAssign();
      window.renderStep2Post();
    });

    bindForwardButton('mf3BackSetup', window.renderStep1);
    bindForwardButton('mf3BackSetupMobile', window.renderStep1);
    bindForwardButton('mf3NextEvents', function () {
      if (assignmentCount() !== requiredStarterCount()) return;
      window.renderStep3Post();
    });
    bindForwardButton('mf3NextEventsMobile', function () {
      if (assignmentCount() !== requiredStarterCount()) return;
      window.renderStep3Post();
    });
  };

  function playerOptions(selected, optionalLabel) {
    return '<option value="">' + esc(optionalLabel || 'Select player') + '</option>' +
      selectedPlayers().map(function (player) {
        return '<option value="' + esc(player.id) + '"' +
          (String(player.id) === String(selected || '') ? ' selected' : '') + '>' +
          esc(fullName(player)) + '</option>';
      }).join('');
  }

  function goalRow(goal, index) {
    goal = goal || {};
    return '<div class="mf3-event-row" data-goal-row="' + index + '">' +
      '<b>Goal ' + (index + 1) + '</b>' +
      '<select class="mf3-select mf3-goal-scorer">' +
        playerOptions(goal.player, 'Select scorer') +
      '</select>' +
      '<select class="mf3-select mf3-goal-assist">' +
        playerOptions(goal.assist, 'No assist') +
      '</select>' +
      '<button class="mf3-btn is-danger is-small" type="button" data-remove-goal="' +
      index + '">Remove</button></div>';
  }

  function cardRow(playerId, type, index) {
    var label = type === 'yellow' ? 'Yellow' : 'Red';
    return '<div class="mf3-event-row is-card" data-card-row="' + type + '-' + index + '">' +
      '<b>' + label + ' card</b>' +
      '<select class="mf3-select mf3-' + type + '-player">' +
        playerOptions(playerId, 'Select player') +
      '</select>' +
      '<button class="mf3-btn is-danger is-small" type="button" data-remove-card="' +
      type + '-' + index + '">Remove</button></div>';
  }

  function captureEvents() {
    window.state.goals = Array.prototype.slice.call(
      document.querySelectorAll('[data-goal-row]')
    ).map(function (row) {
      return {
        player: row.querySelector('.mf3-goal-scorer').value,
        assist: row.querySelector('.mf3-goal-assist').value
      };
    }).filter(function (goal) {
      return goal.player;
    });

    window.state.yellowCards = Array.prototype.slice.call(
      document.querySelectorAll('.mf3-yellow-player')
    ).map(function (select) {
      return select.value;
    }).filter(Boolean);

    window.state.redCards = Array.prototype.slice.call(
      document.querySelectorAll('.mf3-red-player')
    ).map(function (select) {
      return select.value;
    }).filter(Boolean);

    var home = document.getElementById('mf3HomeScore');
    var away = document.getElementById('mf3AwayScore');
    var notes = document.getElementById('mf3CoachNotes');

    if (home) window.state.homeScore = Math.max(0, Number(home.value) || 0);
    if (away) window.state.awayScore = Math.max(0, Number(away.value) || 0);
    if (notes) window.state.coachNotes = notes.value.trim();

    window.state.result = window.state.homeScore > window.state.awayScore
      ? 'win'
      : window.state.homeScore < window.state.awayScore
        ? 'loss'
        : 'draw';
  }

  function eventsAgree() {
    captureEvents();
    return Number(window.state.homeScore) === window.state.goals.length;
  }

  function updateEventEvidence() {
    captureEvents();

    var goalCount = window.state.goals.length;
    var yellowCount = window.state.yellowCards.length;
    var redCount = window.state.redCards.length;
    var goalLabel = document.getElementById('mf3GoalCount');
    var yellowLabel = document.getElementById('mf3YellowCount');
    var redLabel = document.getElementById('mf3RedCount');
    var teamGoals = document.getElementById('mf3TeamGoals');
    var playerGoals = document.getElementById('mf3PlayerGoals');
    var difference = document.getElementById('mf3GoalDifference');
    var notice = document.getElementById('mf3GoalNotice');
    var next = document.getElementById('mf3NextRatings');
    var nextMobile = document.getElementById('mf3NextRatingsMobile');

    if (goalLabel) goalLabel.textContent = String(goalCount);
    if (yellowLabel) yellowLabel.textContent = String(yellowCount);
    if (redLabel) redLabel.textContent = String(redCount);
    if (teamGoals) teamGoals.textContent = String(window.state.homeScore);
    if (playerGoals) playerGoals.textContent = String(goalCount);
    if (difference) difference.textContent = String(window.state.homeScore - goalCount);

    var agree = eventsAgree();
    if (notice) {
      notice.textContent = agree
        ? 'The final score and player goals agree.'
        : 'The final score shows ' + window.state.homeScore +
          ' team goal' + (window.state.homeScore === 1 ? '' : 's') +
          ', but ' + goalCount + ' player goal' + (goalCount === 1 ? '' : 's') +
          ' are recorded.';
      notice.className = 'mf3-notice ' + (agree ? 'is-success' : 'is-warning');
    }
    if (next) next.disabled = !agree;
    if (nextMobile) nextMobile.disabled = !agree;

    scheduleDraftSave();
  }

  function redrawEventLists() {
    var goals = document.getElementById('mf3GoalsList');
    var yellows = document.getElementById('mf3YellowList');
    var reds = document.getElementById('mf3RedList');

    if (goals) {
      goals.innerHTML = (window.state.goals || []).map(goalRow).join('') ||
        '<div class="mf3-notice">No player goals recorded yet.</div>';
    }
    if (yellows) {
      yellows.innerHTML = (window.state.yellowCards || []).map(function (id, index) {
        return cardRow(id, 'yellow', index);
      }).join('') || '<div class="mf3-notice">No yellow cards recorded.</div>';
    }
    if (reds) {
      reds.innerHTML = (window.state.redCards || []).map(function (id, index) {
        return cardRow(id, 'red', index);
      }).join('') || '<div class="mf3-notice">No red cards recorded.</div>';
    }

    bindEventRows();
    updateEventEvidence();
  }

  function bindEventRows() {
    document.querySelectorAll('[data-goal-row] select,[data-card-row] select').forEach(function (select) {
      select.addEventListener('change', updateEventEvidence);
    });

    document.querySelectorAll('[data-remove-goal]').forEach(function (button) {
      button.addEventListener('click', function () {
        captureEvents();
        window.state.goals.splice(Number(button.getAttribute('data-remove-goal')), 1);
        redrawEventLists();
      });
    });

    document.querySelectorAll('[data-remove-card]').forEach(function (button) {
      button.addEventListener('click', function () {
        captureEvents();
        var bits = button.getAttribute('data-remove-card').split('-');
        var list = bits[0] === 'yellow' ? window.state.yellowCards : window.state.redCards;
        list.splice(Number(bits[1]), 1);
        redrawEventLists();
      });
    });
  }

  window.renderStep3Post = function () {
    window.setStep(3);
    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell">' +
        '<section class="mf3-layout">' +
          '<article class="mf3-panel">' +
            '<header class="mf3-panel-head"><div class="mf3-panel-title"><h2>Final score and player events</h2>' +
            '<p>The team score and player goals must agree before continuing.</p></div>' +
            '<span class="mf3-pill is-green">Post-match record</span></header>' +
            '<div class="mf3-panel-body">' +
              '<section class="mf3-scoreboard">' +
                '<div class="mf3-team"><b>' + esc(window.state.myTeamName || 'My team') +
                '</b><span>ScoutLink team</span></div>' +
                '<div class="mf3-score-controls">' +
                  '<button class="mf3-score-button" type="button" data-score-change="home:-1">−</button>' +
                  '<input class="mf3-score-input" id="mf3HomeScore" type="number" min="0" max="99" value="' +
                  (Number(window.state.homeScore) || 0) + '">' +
                  '<b>–</b>' +
                  '<input class="mf3-score-input" id="mf3AwayScore" type="number" min="0" max="99" value="' +
                  (Number(window.state.awayScore) || 0) + '">' +
                  '<button class="mf3-score-button" type="button" data-score-change="away:1">+</button>' +
                '</div>' +
                '<div class="mf3-team"><b>' + esc(window.state.opponent || 'Opponent') +
                '</b><span>Opponent</span></div>' +
              '</section>' +

              '<section class="mf3-event-types">' +
                '<article class="mf3-event-type"><b>Goals</b><p><span id="mf3GoalCount">0</span> recorded</p>' +
                '<button class="mf3-btn is-small is-block" type="button" id="mf3AddGoal">+ Add goal</button></article>' +
                '<article class="mf3-event-type"><b>Yellow cards</b><p><span id="mf3YellowCount">0</span> recorded</p>' +
                '<button class="mf3-btn is-small is-block" type="button" id="mf3AddYellow">+ Add yellow</button></article>' +
                '<article class="mf3-event-type"><b>Red cards</b><p><span id="mf3RedCount">0</span> recorded</p>' +
                '<button class="mf3-btn is-small is-block" type="button" id="mf3AddRed">+ Add red</button></article>' +
              '</section>' +

              '<div class="mf3-section-label">Goals and assists</div>' +
              '<div class="mf3-event-list" id="mf3GoalsList"></div>' +
              '<div class="mf3-section-label">Yellow cards</div>' +
              '<div class="mf3-event-list" id="mf3YellowList"></div>' +
              '<div class="mf3-section-label">Red cards</div>' +
              '<div class="mf3-event-list" id="mf3RedList"></div>' +
            '</div>' +
          '</article>' +

          '<aside>' +
            '<section class="mf3-sidecard"><h3>Evidence check</h3>' +
              '<div class="mf3-summary-row"><span>Team goals</span><b id="mf3TeamGoals">0</b></div>' +
              '<div class="mf3-summary-row"><span>Player goals</span><b id="mf3PlayerGoals">0</b></div>' +
              '<div class="mf3-summary-row"><span>Difference</span><b id="mf3GoalDifference">0</b></div>' +
              '<div class="mf3-notice" id="mf3GoalNotice" style="margin-top:10px"></div>' +
            '</section>' +
            '<section class="mf3-sidecard"><h3>Optional match context</h3>' +
              '<textarea class="mf3-textarea" id="mf3CoachNotes" placeholder="Add useful context for this match">' +
              esc(window.state.coachNotes || '') + '</textarea></section>' +
            '<section class="mf3-sidecard"><div class="mf3-notice">Player profiles update only after final confirmation and submission.</div></section>' +
          '</aside>' +
        '</section>' +

        '<section class="mf3-actionbar">' +
          '<div><b>Score and player goals must agree</b><span>Assists and cards remain optional.</span></div>' +
          '<div class="mf3-action-buttons">' +
            '<button class="mf3-btn" type="button" id="mf3BackFormation">Back</button>' +
            '<button class="mf3-btn is-primary" type="button" id="mf3NextRatings">Next · Rate players</button>' +
          '</div>' +
        '</section>' +
        mobileSticky('Back', 'Next · Ratings', 'mf3NextRatingsMobile', 'mf3BackFormationMobile') +
      '</div>';

    redrawEventLists();

    document.getElementById('mf3AddGoal').addEventListener('click', function () {
      captureEvents();
      window.state.goals.push({ player: '', assist: '' });
      redrawEventLists();
    });
    document.getElementById('mf3AddYellow').addEventListener('click', function () {
      captureEvents();
      window.state.yellowCards.push('');
      redrawEventLists();
    });
    document.getElementById('mf3AddRed').addEventListener('click', function () {
      captureEvents();
      window.state.redCards.push('');
      redrawEventLists();
    });

    document.querySelectorAll('[data-score-change]').forEach(function (button) {
      button.addEventListener('click', function () {
        var bits = button.getAttribute('data-score-change').split(':');
        var input = document.getElementById(bits[0] === 'home' ? 'mf3HomeScore' : 'mf3AwayScore');
        input.value = Math.max(0, Number(input.value) + Number(bits[1]));
        updateEventEvidence();
      });
    });

    ['mf3HomeScore','mf3AwayScore','mf3CoachNotes'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', updateEventEvidence);
    });

    bindForwardButton('mf3BackFormation', function () {
      captureEvents();
      window.renderStep2Post();
    });
    bindForwardButton('mf3BackFormationMobile', function () {
      captureEvents();
      window.renderStep2Post();
    });
    bindForwardButton('mf3NextRatings', function () {
      if (!eventsAgree()) return;
      window.renderStep4();
    });
    bindForwardButton('mf3NextRatingsMobile', function () {
      if (!eventsAgree()) return;
      window.renderStep4();
    });
  };

  function playerMatchOutput(playerId) {
    var goals = (window.state.goals || []).filter(function (goal) {
      return String(goal.player) === String(playerId);
    }).length;
    var assists = (window.state.goals || []).filter(function (goal) {
      return String(goal.assist) === String(playerId);
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

  function positionPlayed(playerId) {
    var key = Object.keys(window.state.playerPositions || {}).find(function (slot) {
      return String(window.state.playerPositions[slot]) === String(playerId);
    });
    return key || 'Substitute';
  }

  function ratingValue(playerId) {
    var value = window.state.overallPerformance &&
      window.state.overallPerformance[playerId];
    return value === undefined || value === null ? 5 : Number(value);
  }

  function ratingRow(player) {
    var value = ratingValue(player.id);
    var quick = [5,6,7,8,9,10].map(function (number) {
      return '<button class="mf3-quick-rating' +
        (Number(value) === number ? ' is-active' : '') +
        '" type="button" data-quick-player="' + esc(player.id) +
        '" data-quick-value="' + number + '">' + number + '</button>';
    }).join('');

    return '<article class="mf3-rating-row">' +
      '<div class="mf3-rating-player">' +
        '<span class="mf3-rating-avatar">' + esc(initialsFor(player)) + '</span>' +
        '<span><b>' + esc(fullName(player)) + '</b><span>' +
        esc(positionPlayed(player.id)) + ' · ' + esc(playerMatchOutput(player.id)) +
        '</span></span>' +
      '</div>' +
      '<div class="mf3-rating-scale">' +
        '<span>Poor</span>' +
        '<input class="mf3-range" type="range" min="1" max="10" step="0.5" value="' +
        value + '" data-rating-player="' + esc(player.id) + '">' +
        '<span data-rating-value="' + esc(player.id) + '">' + value + '</span>' +
      '</div>' +
      '<div class="mf3-quick-ratings">' + quick + '</div>' +
    '</article>';
  }

  function captureRatings() {
    window.state.overallPerformance = window.state.overallPerformance || {};
    document.querySelectorAll('[data-rating-player]').forEach(function (slider) {
      window.state.overallPerformance[slider.getAttribute('data-rating-player')] =
        Number(slider.value);
    });

    window.state.ratings = {};
    Object.keys(window.state.overallPerformance).forEach(function (playerId) {
      window.state.ratings[playerId] = {
        overall_performance: window.state.overallPerformance[playerId]
      };
    });
  }

  function averageRating() {
    var values = Object.keys(window.state.overallPerformance || {}).map(function (id) {
      return Number(window.state.overallPerformance[id]);
    }).filter(Number.isFinite);

    if (!values.length) return 0;
    return values.reduce(function (sum, value) {
      return sum + value;
    }, 0) / values.length;
  }

  window.renderStep4 = function () {
    window.setStep(4);
    window.state.overallPerformance = window.state.overallPerformance || {};

    selectedPlayers().forEach(function (player) {
      if (window.state.overallPerformance[player.id] === undefined) {
        window.state.overallPerformance[player.id] = 5;
      }
    });

    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell">' +
        '<article class="mf3-panel">' +
          '<header class="mf3-panel-head"><div class="mf3-panel-title"><h2>Overall match-performance ratings</h2>' +
          '<p>Rate this match only, not the player’s long-term ability or potential.</p></div>' +
          '<span class="mf3-pill is-green"><span id="mf3RatedCount">' +
          selectedPlayers().length + '</span> rated</span></header>' +
          '<div class="mf3-panel-body">' +
            '<div class="mf3-notice" style="margin-bottom:10px">Use the slider or a quick score. A neutral score of 5 is selected initially and can be changed.</div>' +
            selectedPlayers().map(ratingRow).join('') +
          '</div>' +
        '</article>' +

        '<section class="mf3-actionbar">' +
          '<div><b>Every selected player has a rating</b><span>Review each neutral score before continuing.</span></div>' +
          '<div class="mf3-action-buttons">' +
            '<button class="mf3-btn" type="button" id="mf3BackEvents">Back</button>' +
            '<button class="mf3-btn is-primary" type="button" id="mf3NextReview">Next · Review match</button>' +
          '</div>' +
        '</section>' +
        mobileSticky('Back', 'Next · Review', 'mf3NextReviewMobile', 'mf3BackEventsMobile') +
      '</div>';

    document.querySelectorAll('[data-rating-player]').forEach(function (slider) {
      slider.addEventListener('input', function () {
        var playerId = slider.getAttribute('data-rating-player');
        var output = document.querySelector('[data-rating-value="' + playerId + '"]');
        if (output) output.textContent = slider.value;
        captureRatings();
        window.renderStep4QuickState(playerId, Number(slider.value));
        updateHero(4);
        scheduleDraftSave();
      });
    });

    document.querySelectorAll('[data-quick-player]').forEach(function (button) {
      button.addEventListener('click', function () {
        var playerId = button.getAttribute('data-quick-player');
        var value = Number(button.getAttribute('data-quick-value'));
        var slider = document.querySelector('[data-rating-player="' + playerId + '"]');
        if (slider) {
          slider.value = value;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    bindForwardButton('mf3BackEvents', function () {
      captureRatings();
      window.renderStep3Post();
    });
    bindForwardButton('mf3BackEventsMobile', function () {
      captureRatings();
      window.renderStep3Post();
    });
    bindForwardButton('mf3NextReview', function () {
      captureRatings();
      window.renderStep5();
    });
    bindForwardButton('mf3NextReviewMobile', function () {
      captureRatings();
      window.renderStep5();
    });
  };

  window.renderStep4QuickState = function (playerId, value) {
    document.querySelectorAll('[data-quick-player="' + playerId + '"]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        Number(button.getAttribute('data-quick-value')) === Number(value)
      );
    });
  };

  function eventChips() {
    var chips = [];

    (window.state.goals || []).forEach(function (goal) {
      chips.push('<span class="mf3-pill is-green">' +
        esc(window.playerName(goal.player)) + ' · Goal</span>');
      if (goal.assist) {
        chips.push('<span class="mf3-pill is-blue">' +
          esc(window.playerName(goal.assist)) + ' · Assist</span>');
      }
    });

    (window.state.yellowCards || []).forEach(function (id) {
      chips.push('<span class="mf3-pill is-gold">' +
        esc(window.playerName(id)) + ' · Yellow</span>');
    });

    (window.state.redCards || []).forEach(function (id) {
      chips.push('<span class="mf3-pill is-red">' +
        esc(window.playerName(id)) + ' · Red</span>');
    });

    return chips.length
      ? chips.join('')
      : '<span class="mf3-pill">No player events recorded</span>';
  }

  function highestRated() {
    var bestId = '';
    var best = -1;

    Object.keys(window.state.overallPerformance || {}).forEach(function (id) {
      var value = Number(window.state.overallPerformance[id]);
      if (value > best) {
        best = value;
        bestId = id;
      }
    });

    return {
      name: bestId ? window.playerName(bestId) : 'Not rated',
      value: best < 0 ? 0 : best
    };
  }

  window.renderStep5 = function () {
    window.setStep(5);
    captureRatings();

    var best = highestRated();
    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell">' +
        '<section class="mf3-review-layout">' +
          '<article class="mf3-panel">' +
            '<header class="mf3-panel-head"><div class="mf3-panel-title"><h2>Match Fact summary</h2>' +
            '<p>This is the evidence that will be saved.</p></div>' +
            '<button class="mf3-btn is-small" type="button" id="mf3EditSetup">Edit setup</button></header>' +
            '<div class="mf3-panel-body">' +
              '<section class="mf3-review-box"><h3>Match details</h3>' +
                '<div class="mf3-review-row"><span>Fixture</span><b>' +
                esc(window.state.myTeamName || 'My team') + ' vs ' +
                esc(window.state.opponent || 'Opponent') + '</b></div>' +
                '<div class="mf3-review-row"><span>Date</span><b>' +
                esc(dateLabel(window.state.matchDate)) + '</b></div>' +
                '<div class="mf3-review-row"><span>Result</span><b>' +
                (Number(window.state.homeScore) || 0) + '–' +
                (Number(window.state.awayScore) || 0) + ' ' +
                esc(window.state.result || 'draw') + '</b></div>' +
                '<div class="mf3-review-row"><span>Formation</span><b>' +
                esc(window.state.formation) + '</b></div>' +
                '<div class="mf3-review-row"><span>Players</span><b>' +
                requiredStarterCount() + ' starters · ' + benchPlayers().length +
                ' substitutes</b></div>' +
              '</section>' +

              '<section class="mf3-review-box"><h3>Recorded events</h3>' +
                '<div class="mf3-chips">' + eventChips() + '</div>' +
              '</section>' +

              '<section class="mf3-review-box"><h3>Player ratings</h3>' +
                '<div class="mf3-review-row"><span>Highest rated</span><b>' +
                esc(best.name) + ' · ' + best.value.toFixed(1) + '</b></div>' +
                '<div class="mf3-review-row"><span>Average</span><b>' +
                averageRating().toFixed(1) + '</b></div>' +
                '<div class="mf3-review-row"><span>Completed</span><b>' +
                selectedPlayers().length + ' of ' + selectedPlayers().length + '</b></div>' +
              '</section>' +

              '<label class="mf3-confirm">' +
                '<input type="checkbox" id="confirmCheck">' +
                '<span><b>I confirm this Match Fact is accurate to the best of my knowledge.</b>' +
                '<p>Submitting updates the selected player profiles, statistics, evidence counts and confidence.</p></span>' +
              '</label>' +
              '<div class="mf3-submit-message" id="submitMsg" aria-live="polite"></div>' +
            '</div>' +
          '</article>' +

          '<aside>' +
            '<section class="mf3-success"><b>Ready to submit</b>' +
              '<p>The score, player goals, positions and ratings are complete.</p></section>' +
            '<section class="mf3-sidecard"><h3>What submission updates</h3>' +
              '<div class="mf3-summary-row"><span>Player profiles</span><b>' +
              selectedPlayers().length + '</b></div>' +
              '<div class="mf3-summary-row"><span>Appearances</span><b>' +
              selectedPlayers().length + ' added</b></div>' +
              '<div class="mf3-summary-row"><span>Goals</span><b>' +
              window.state.goals.length + ' added</b></div>' +
              '<div class="mf3-summary-row"><span>Assists</span><b>' +
              window.state.goals.filter(function (goal) { return goal.assist; }).length +
              ' added</b></div>' +
              '<div class="mf3-summary-row"><span>Evidence records</span><b>' +
              selectedPlayers().length + ' added</b></div>' +
            '</section>' +
            '<section class="mf3-sidecard"><h3>After submission</h3>' +
              '<p>The Match Fact becomes part of each player’s evidence history and audit record.</p></section>' +
          '</aside>' +
        '</section>' +

        '<section class="mf3-actionbar">' +
          '<div><b>One confirmation remains</b><span>Confirm accuracy before submission.</span></div>' +
          '<div class="mf3-action-buttons">' +
            '<button class="mf3-btn" type="button" id="mf3BackRatings">Back</button>' +
            '<button class="mf3-btn is-primary" type="button" id="submitBtn" disabled>Submit Match Fact</button>' +
          '</div>' +
        '</section>' +
        mobileSticky('Back', 'Submit Match Fact', 'mf3SubmitMobile', 'mf3BackRatingsMobile') +
      '</div>';

    document.getElementById('mf3EditSetup').addEventListener('click', window.renderStep1);
    bindForwardButton('mf3BackRatings', window.renderStep4);
    bindForwardButton('mf3BackRatingsMobile', window.renderStep4);

    document.getElementById('confirmCheck').addEventListener('change', function () {
      document.getElementById('submitBtn').disabled = !this.checked;
      document.getElementById('mf3SubmitMobile').disabled = !this.checked;
    });

    bindForwardButton('submitBtn', window.submitMatchFacts);
    bindForwardButton('mf3SubmitMobile', window.submitMatchFacts);
    document.getElementById('mf3SubmitMobile').disabled = true;
  };

  function buildSubmissionEvents() {
    var events = [];

    (window.state.goals || []).forEach(function (goal) {
      events.push({
        type: 'goal',
        playerId: goal.player,
        assistId: goal.assist || null
      });
      if (goal.assist) {
        events.push({
          type: 'assist',
          playerId: goal.assist,
          goalScorerId: goal.player
        });
      }
    });

    (window.state.yellowCards || []).forEach(function (id) {
      events.push({ type: 'yellow_card', playerId: id });
    });

    (window.state.redCards || []).forEach(function (id) {
      events.push({ type: 'red_card', playerId: id });
    });

    return events;
  }

  window.submitMatchFacts = function () {
    var submit = document.getElementById('submitBtn');
    var mobileSubmit = document.getElementById('mf3SubmitMobile');
    var message = document.getElementById('submitMsg');

    if (!document.getElementById('confirmCheck') ||
        !document.getElementById('confirmCheck').checked) {
      if (message) {
        message.textContent = 'Confirm the accuracy statement before submitting.';
        message.style.color = '#b42335';
      }
      return;
    }

    [submit, mobileSubmit].forEach(function (button) {
      if (!button) return;
      button.disabled = true;
      button.textContent = 'Submitting…';
    });

    var playersList = selectedPlayers().map(function (player) {
      var playerGoals = window.state.goals.filter(function (goal) {
        return String(goal.player) === String(player.id);
      }).length;
      var playerAssists = window.state.goals.filter(function (goal) {
        return String(goal.assist) === String(player.id);
      }).length;
      var yellowCards = window.state.yellowCards.filter(function (id) {
        return String(id) === String(player.id);
      }).length;
      var redCards = window.state.redCards.filter(function (id) {
        return String(id) === String(player.id);
      }).length;
      var performance = Number(window.state.overallPerformance[player.id]) || 5;

      return {
        playerId: player.id,
        goals: playerGoals,
        assists: playerAssists,
        yellowCards: yellowCards,
        redCards: redCards,
        overallPerformance: performance,
        overall_performance: performance,
        performanceScore: performance,
        notes: window.state.coachNotes || ''
      };
    });

    var payload = {
      fixtureId: window.state.fixtureId || null,
      teamId: window.state.coachTeamId || null,
      matchDate: window.state.matchDate,
      opponent: window.state.opponent,
      homeScore: Number(window.state.homeScore) || 0,
      awayScore: Number(window.state.awayScore) || 0,
      format: window.state.format,
      formation: window.state.formation,
      mode: 'post',
      players: playersList,
      events: buildSubmissionEvents(),
      playerPositions: window.state.playerPositions || {},
      coachNotes: window.state.coachNotes || '',
      confirmed: true
    };

    window.api('POST', '/api/match-facts', payload).then(function (response) {
      clearDraft();
      var count = response.matchFacts && response.matchFacts.length ||
        playersList.length;
      showSubmissionComplete(count, response.errors || []);
    }).catch(function (error) {
      if (message) {
        message.textContent = error.message || 'The Match Fact could not be submitted.';
        message.style.color = '#b42335';
      }

      [submit, mobileSubmit].forEach(function (button) {
        if (!button) return;
        button.disabled = false;
        button.textContent = button.id === 'submitBtn'
          ? 'Submit Match Fact'
          : 'Submit Match Fact';
      });
    });
  };

  function showSubmissionComplete(count, errors) {
    var content = document.getElementById('stepContent');
    if (!content) return;

    content.innerHTML =
      '<div class="mf3-shell"><section class="mf3-panel"><div class="mf3-complete">' +
        '<div class="mf3-complete-icon">✓</div>' +
        '<h2>Match Fact submitted</h2>' +
        '<p>' + count + ' player profile' + (count === 1 ? '' : 's') +
        ' received a new evidence record.' +
        (errors.length ? ' ' + errors.length + ' player record' +
          (errors.length === 1 ? '' : 's') + ' could not be updated.' : '') +
        '</p>' +
        '<div class="mf3-complete-actions">' +
          '<a class="mf3-btn" href="' + esc(route('coach-my-players.html')) + '">View players</a>' +
          '<button class="mf3-btn is-primary" type="button" id="mf3AnotherMatch">Record another match</button>' +
        '</div>' +
      '</div></section></div>';

    var stepper = document.getElementById('stepIndicator');
    if (stepper) stepper.style.display = 'none';

    document.getElementById('mf3AnotherMatch').addEventListener('click', function () {
      resetWorkflow();
      if (stepper) stepper.style.display = '';
      window.renderStep1();
    });
  }

  function resetWorkflow() {
    var preserved = {
      myTeamName: window.state.myTeamName,
      coachTeamId: window.state.coachTeamId,
      fixtures: window.state.fixtures || []
    };

    window.state = {
      mode: 'post',
      opponent: '',
      matchDate: '',
      format: '11',
      formation: '4-4-2',
      myTeamName: preserved.myTeamName,
      coachTeamId: preserved.coachTeamId,
      fixtureId: null,
      fixtures: preserved.fixtures,
      players: [],
      goals: [],
      yellowCards: [],
      redCards: [],
      homeScore: 0,
      awayScore: 0,
      result: '',
      ratings: {},
      overallPerformance: {},
      playerPositions: {},
      events: [],
      coachNotes: '',
      timerSeconds: 0,
      timerInterval: null,
      halfTimePaused: false,
      liveGoals: 0
    };

    selectedPlayerIds = {};
    playerSearch = '';
    playerFilter = '';
    clearDraft();
  }

  function captureVisibleStep() {
    if (window.currentStep === 1) captureSetup();
    if (window.currentStep === 3) captureEvents();
    if (window.currentStep === 4 || window.currentStep === 5) captureRatings();
  }

  function bindForwardButton(id, handler) {
    var button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', function () {
      captureVisibleStep();
      scheduleDraftSave();
      handler();
    });
  }

  function mobileSticky(backLabel, nextLabel, nextId, backId) {
    return '<div class="mf3-mobile-sticky">' +
      (backLabel
        ? '<button class="mf3-btn" type="button" id="' + esc(backId) + '">' +
          esc(backLabel) + '</button>'
        : '<button class="mf3-btn" type="button" id="mf3MobileExit">Exit</button>') +
      '<button class="mf3-btn is-primary" type="button" id="' +
      esc(nextId) + '">' + esc(nextLabel) + '</button></div>';
  }

  function bindMobileExit() {
    var exit = document.getElementById('mf3MobileExit');
    if (!exit) return;
    exit.addEventListener('click', function () {
      captureVisibleStep();
      writeDraft();
      window.location.href = route('coach-dashboard.html');
    });
  }

  function refreshChrome() {
    document.body.classList.add('coach-match-facts-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Match Facts';

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Match Facts';

    document.querySelectorAll('.coach-v2-hero').forEach(function (hero) {
      hero.setAttribute('aria-hidden', 'true');
    });
  }

  function pollForInitialRender() {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      setupStepAttributes();
      installHero();
      installTopbarActions();
      refreshChrome();
      bindMobileExit();

      if (window.myPlayers && document.getElementById('stepContent') &&
          document.getElementById('stepContent').children.length) {
        clearInterval(timer);

        if (!draftLoaded) {
          loadDraft();
          if (window.currentStep === 2) window.renderStep2Post();
          else if (window.currentStep === 3) window.renderStep3Post();
          else if (window.currentStep === 4) window.renderStep4();
          else if (window.currentStep === 5) window.renderStep5();
          else window.renderStep1();
        }
      }

      if (attempts > 80) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('coach-match-facts-v3');
    setupStepAttributes();
    installHero();
    installTopbarActions();
    refreshChrome();
    pollForInitialRender();

    document.addEventListener('input', function (event) {
      if (event.target.closest && event.target.closest('#stepContent')) {
        scheduleDraftSave();
      }
    });

    document.addEventListener('change', function (event) {
      if (event.target.closest && event.target.closest('#stepContent')) {
        scheduleDraftSave();
      }
    });
  });

  window.addEventListener('resize', refreshChrome);
})();

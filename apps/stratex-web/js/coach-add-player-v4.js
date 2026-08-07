'use strict';

/*
 * Coach Add Player V4.
 * Keeps the existing AP3 visual language and four-step page design while
 * replacing the football data contract with canonical V4 positions,
 * position-aware attributes and whole-number 1-10 assessments.
 */
(function () {
  var DRAFT_KEY = 'scoutlink.coach.addPlayer.v4';
  var currentStep = 1;
  var options = null;
  var createdPlayer = null;
  var pendingCoachId = '';
  var saveTimer = null;

  function el(id) { return document.getElementById(id); }
  function value(id) { var node = el(id); return node ? String(node.value || '') : ''; }
  function esc(input) {
    return String(input == null ? '' : input).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[character];
    });
  }
  function route(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }
  function isPublicDemo() {
    try {
      return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) ||
        sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) { return false; }
  }
  function demoRole() {
    try {
      return String(sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') || '').toLowerCase();
    } catch (_) { return ''; }
  }
  function allowedContext() {
    var role = window.Auth && window.Auth.type;
    return role === 'Coach' || role === 'Stratex' ||
      (isPublicDemo() && (!demoRole() || demoRole() === 'coach'));
  }
  function initials() {
    var first = value('firstName').trim().charAt(0);
    var last = value('lastName').trim().charAt(0);
    return (first + last).toUpperCase() || 'PL';
  }

  function stepButton(number, title, copy) {
    return '<button class="ap3-step" type="button" data-ap3-step="' + number + '">' +
      '<span class="ap3-step-number">' + number + '</span>' +
      '<span><b>' + esc(title) + '</b><span>' + esc(copy) + '</span></span>' +
    '</button>';
  }

  function panelStart(step, title, copy, badge) {
    return '<section class="ap3-view" id="ap3Step' + step + '" data-step-panel="' + step + '">' +
      '<article class="ap3-panel"><header class="ap3-panel-head">' +
        '<div class="ap3-panel-title"><h2>' + esc(title) + '</h2><p>' + esc(copy) +
        '</p></div><span class="ap3-pill ' + (step === 4 ? 'is-green' : '') + '">' +
        esc(badge) + '</span></header><div class="ap3-panel-body">';
  }
  function panelEnd() { return '</div></article></section>'; }
  function reviewRow(label, id) {
    return '<div class="ap3-review-row"><span>' + esc(label) + '</span><b id="' + id + '">—</b></div>';
  }
  function rangeChoice(group, valueKey, label, range, active) {
    return '<button class="ap3-choice range-option' + (active ? ' active' : '') +
      '" type="button" data-range-target="' + group + '" data-value="' + valueKey +
      '"><b>' + esc(label) + '</b><span>' + esc(range) + '</span></button>';
  }

  function personalStep() {
    return panelStart(1, 'Personal details', 'Add the player identity and supported ScoutLink age group.', 'Step 1 of 4') +
      '<div class="ap3-form-grid">' +
        '<div class="ap3-field"><label for="firstName">First name <span class="ap3-required">*</span></label>' +
          '<input class="ap3-input" id="firstName" autocomplete="given-name" placeholder="Player first name"></div>' +
        '<div class="ap3-field"><label for="lastName">Last name <span class="ap3-required">*</span></label>' +
          '<input class="ap3-input" id="lastName" autocomplete="family-name" placeholder="Player last name"></div>' +
        '<div class="ap3-field is-full"><label for="ageGroup">Age group <span class="ap3-required">*</span></label>' +
          '<select class="ap3-select" id="ageGroup"><option value="">Select age group</option>' +
            options.ageGroups.map(function (group) { return '<option>' + esc(group) + '</option>'; }).join('') +
          '</select><small>ScoutLink currently supports U7 to U16 player profiles.</small></div>' +
      '</div>' +
      '<div class="ap3-section"><div class="ap3-section-head"><div><h3>Team assignment</h3>' +
        '<p>The player is automatically added to the signed-in Coach team.</p></div></div>' +
        '<div class="ap3-context-card" id="teamAssignmentInfo"><span class="ap3-context-icon">TM</span>' +
          '<span>Loading team assignment…</span></div></div>' +
      '<div class="ap3-section" id="coachAssignmentCard" style="display:none"><div class="ap3-section-head"><div>' +
        '<h3>Assigned Coach</h3><p>Super users can choose another active Coach from the same team.</p></div>' +
        '<a class="ap3-btn is-small" href="' + esc(route('/coach/settings#teamCoaches')) + '">Manage Coaches</a></div>' +
        '<div class="ap3-field"><label for="assignedCoachId">Profile owner</label>' +
          '<select class="ap3-select" id="assignedCoachId"><option value="">Loading Coaches…</option></select></div></div>' +
      '<div class="ap3-actions"><span class="ap3-secondary-copy">Required fields are marked with an asterisk.</span>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="2">Continue to football profile</button></div>' +
    panelEnd();
  }

  function footballStep() {
    return panelStart(2, 'Football profile', 'Choose the exact position and preferred foot that best describe the player.', 'Step 2 of 4') +
      '<div class="ap3-form-grid is-three">' +
        '<div class="ap3-field"><label for="positionGroup">Position group <span class="ap3-required">*</span></label>' +
          '<select class="ap3-select" id="positionGroup"></select></div>' +
        '<div class="ap3-field"><label for="specificPosition">Specific position <span class="ap3-required">*</span></label>' +
          '<select class="ap3-select" id="specificPosition" disabled><option value="">Select position group first</option></select></div>' +
        '<div class="ap3-field"><label for="foot">Preferred foot</label><select class="ap3-select" id="foot">' +
          '<option>Right</option><option>Left</option><option>Both</option></select></div>' +
      '</div>' +
      '<div class="ap3-section"><div class="ap3-section-head"><div><h3>How ScoutLink uses this</h3>' +
        '<p>The exact position controls the assessment, overall rating, role analysis and position ratings.</p></div></div>' +
        '<div class="ap3-context-card"><span class="ap3-context-icon">FT</span><span>' +
          'Goalkeepers complete goalkeeper attributes only. Outfield players complete General attributes plus their position-group attributes.' +
        '</span></div></div>' +
      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="1">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="3">Continue to physical profile</button></div>' +
    panelEnd();
  }

  function physicalStep() {
    return panelStart(3, 'Physical profile and attributes', 'Use the existing profile ranges and whole-number 1–10 ratings.', 'Step 3 of 4') +
      '<div class="ap3-section"><div class="ap3-section-head"><div><h3>Height range</h3><p>Select the closest current range.</p></div></div>' +
        '<div class="ap3-choice-grid" data-range-group="heightCategory">' +
          rangeChoice('heightCategory','very_short','Very short','155–163 cm') +
          rangeChoice('heightCategory','short','Short','163–170 cm') +
          rangeChoice('heightCategory','average','Average','170–178 cm',true) +
          rangeChoice('heightCategory','tall','Tall','178–185 cm') +
          rangeChoice('heightCategory','very_tall','Very tall','185+ cm') +
        '</div><input type="hidden" id="heightCategory" value="average"></div>' +
      '<div class="ap3-section"><div class="ap3-section-head"><div><h3>Build range</h3><p>Select the closest current range.</p></div></div>' +
        '<div class="ap3-choice-grid is-build" data-range-group="buildCategory">' +
          rangeChoice('buildCategory','very_slight','Very slight','50–58 kg') +
          rangeChoice('buildCategory','slight','Slight','58–65 kg') +
          rangeChoice('buildCategory','lean','Lean','65–72 kg') +
          rangeChoice('buildCategory','athletic','Athletic','72–80 kg',true) +
          rangeChoice('buildCategory','stocky','Stocky','80–88 kg') +
          rangeChoice('buildCategory','powerful','Powerful','88–96 kg') +
          rangeChoice('buildCategory','very_powerful','Very powerful','96+ kg') +
        '</div><input type="hidden" id="buildCategory" value="athletic"></div>' +
      '<div id="ap4AttributeSections"><div class="ap3-section"><div class="ap3-section-head"><div>' +
        '<h3>Position-specific assessment</h3><p>Select the exact position first. Use Not observed rather than guessing.</p>' +
        '</div></div><div class="ap3-context-card"><span class="ap3-context-icon">10</span>' +
        '<span>Every observed attribute must be a whole number from 1 to 10.</span></div></div></div>' +
      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="2">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="4">Review player</button></div>' +
    panelEnd();
  }

  function reviewStep() {
    return panelStart(4, 'Review and create', 'Check the profile before creating the player and calculating the ScoutLink rating.', 'Step 4 of 4') +
      '<div class="ap3-review-grid"><div class="ap3-review-card"><h3>Player profile</h3><div class="ap3-review-list">' +
        reviewRow('Name','ap3ReviewName') + reviewRow('Age group','ap3ReviewAge') +
        reviewRow('Position','ap3ReviewPosition') + reviewRow('Preferred foot','ap3ReviewFoot') +
        reviewRow('Team','ap3ReviewTeam') + reviewRow('Assigned Coach','ap3ReviewCoach') +
      '</div></div><div class="ap3-review-card"><h3>Profile evidence</h3><div class="ap3-review-list">' +
        reviewRow('Height range','ap3ReviewHeight') + reviewRow('Build range','ap3ReviewBuild') +
        reviewRow('Ratings entered','ap3ReviewRatings') + reviewRow('Player identity','ap3ReviewIdentity') +
      '</div></div></div>' +
      '<label class="ap3-confirm"><input type="checkbox" id="ap3Confirm"><span>' +
        'I confirm the player information is accurate and that the correct permissions or notices are in place.</span></label>' +
      '<div class="ap3-created" id="ap3Created"><h3 id="ap3CreatedTitle">Player created</h3>' +
        '<p id="ap3CreatedCopy"></p><div class="ap3-created-actions">' +
          '<button class="ap3-btn is-primary" type="button" id="ap3AddAnother">Add another player</button>' +
          '<button class="ap3-btn" type="button" id="ap3ViewSquad">View My Players</button>' +
        '</div></div>' +
      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="3">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" id="submitBtn">Create player profile</button></div>' +
    panelEnd();
  }

  function installStyles() {
    if (el('ap4Styles')) return;
    var style = document.createElement('style');
    style.id = 'ap4Styles';
    style.textContent = 'body.coach-add-player-v3 .ap3-rating select{width:100%;height:34px;margin-top:6px;padding:0 9px;border:1px solid var(--ap3-line);border-radius:9px;background:#fff;color:#17273a;font:inherit;font-size:8px;outline:none}' +
      'body.coach-add-player-v3 .ap3-rating select:focus{border-color:var(--ap3-green);box-shadow:0 0 0 3px rgba(15,163,127,.12)}';
    document.head.appendChild(style);
  }

  function buildPage() {
    document.body.classList.add('coach-add-player-v3');
    installStyles();
    var page = document.querySelector('.page-content');
    if (!page) return;
    var banner = page.querySelector('.public-demo-banner');
    page.innerHTML = '<div class="ap3-root" id="ap3Root">' +
      '<section class="ap3-hero"><div><span class="ap3-pill is-green">Coach workspace</span>' +
        '<h1>Add a player profile.</h1><p>Create one complete player record using ScoutLink’s position-aware V4 assessment.</p></div>' +
        '<div class="ap3-hero-actions"><button class="ap3-btn" type="button" id="ap3SaveDraftTop">Save draft</button>' +
          '<button class="ap3-btn is-primary" type="button" id="ap3CreateTop">Review player</button></div></section>' +
      '<nav class="ap3-stepper" aria-label="Add player progress">' +
        stepButton(1,'Personal details','Identity and age group') +
        stepButton(2,'Football profile','Position and team') +
        stepButton(3,'Physical and attributes','Profile and ratings') +
        stepButton(4,'Review','Confirm and create') +
      '</nav><div class="ap3-message is-error" id="formError" role="alert"></div>' +
      '<div class="ap3-message is-success" id="formSuccess" aria-live="polite"></div>' +
      personalStep() + footballStep() + physicalStep() + reviewStep() + '</div>';
    if (banner) page.insertBefore(banner, page.firstChild);

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Add player';
    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Add player';

    window.ScoutLinkScoringV4.renderGroupOptions(el('positionGroup'), '');
    bindEvents();
    loadCoachContext();
    restoreDraft();
    renderAssessment();
    showStep(currentStep, false);
    refreshReview();
  }

  function renderRatingField(row, current) {
    var selected = current == null ? '' : String(current);
    return '<div class="ap3-rating"><label for="ap4-' + esc(row[0]) + '"><span>' + esc(row[1]) +
      '</span><span>/ 10</span></label><select id="ap4-' + esc(row[0]) +
      '" data-v4-rating="' + esc(row[0]) + '"><option value="">Not observed</option>' +
      options.ratingOptions.filter(function (option) { return option.value !== null; }).map(function (option) {
        return '<option value="' + option.value + '"' + (String(option.value) === selected ? ' selected' : '') +
          '>' + esc(option.label) + '</option>';
      }).join('') + '</select></div>';
  }

  function renderAssessment(currentRatings) {
    var host = el('ap4AttributeSections');
    if (!host) return;
    var position = value('specificPosition');
    var group = window.ScoutLinkScoringV4.groupForPosition(position);
    if (!position || !group) {
      host.innerHTML = '<div class="ap3-section"><div class="ap3-section-head"><div><h3>Position-specific assessment</h3>' +
        '<p>Select the exact position first. Use Not observed rather than guessing.</p></div></div>' +
        '<div class="ap3-context-card"><span class="ap3-context-icon">10</span>' +
        '<span>Every observed attribute must be a whole number from 1 to 10.</span></div></div>';
      refreshReview();
      return;
    }
    var flat = window.ScoutLinkScoringV4.flattenRatings(currentRatings || {});
    var sections = group === 'Goalkeeper'
      ? [{label:'Goalkeeper attributes', rows:options.attributes.goalkeeper}]
      : [
          {label:'General attributes', rows:options.attributes.general},
          {label:group + ' attributes', rows:options.attributes[group.toLowerCase()] || []}
        ];
    host.innerHTML = sections.map(function (section) {
      return '<div class="ap3-section"><div class="ap3-section-head"><div><h3>' + esc(section.label) +
        '</h3><p>Whole numbers from 1 to 10. Leave Not observed where evidence is unavailable.</p></div></div>' +
        '<div class="ap3-rating-grid">' + section.rows.map(function (row) {
          return renderRatingField(row, flat[row[0]]);
        }).join('') + '</div></div>';
    }).join('');
    host.querySelectorAll('select').forEach(function (select) {
      select.addEventListener('change', function () { scheduleDraftSave(); refreshReview(); });
    });
    refreshReview();
  }

  function collectRatings() {
    return window.ScoutLinkScoringV4.collectAssessment(
      el('ap4AttributeSections'), value('specificPosition'), options
    );
  }

  function bindEvents() {
    document.querySelectorAll('[data-ap3-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = Number(button.dataset.ap3Step);
        if (target > currentStep && !validateThrough(target - 1)) return;
        showStep(target, true);
      });
    });
    document.querySelectorAll('[data-next-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = Number(button.dataset.nextStep);
        if (!validateThrough(target - 1)) return;
        showStep(target, true);
      });
    });
    document.querySelectorAll('[data-prev-step]').forEach(function (button) {
      button.addEventListener('click', function () { showStep(Number(button.dataset.prevStep), true); });
    });
    document.querySelectorAll('[data-range-target]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.dataset.rangeTarget;
        document.querySelectorAll('[data-range-target="' + target + '"]').forEach(function (choice) {
          choice.classList.toggle('active', choice === button);
        });
        el(target).value = button.dataset.value;
        scheduleDraftSave();
        refreshReview();
      });
    });
    el('positionGroup').addEventListener('change', function () {
      window.ScoutLinkScoringV4.renderPositionOptions(el('specificPosition'), value('positionGroup'), '', options);
      el('specificPosition').disabled = !value('positionGroup');
      renderAssessment();
      scheduleDraftSave();
    });
    el('specificPosition').addEventListener('change', function () {
      renderAssessment();
      scheduleDraftSave();
    });
    document.querySelectorAll('#ap3Root input,#ap3Root select').forEach(function (node) {
      node.addEventListener('input', function () { scheduleDraftSave(); refreshReview(); });
      node.addEventListener('change', function () { scheduleDraftSave(); refreshReview(); });
    });
    el('ap3SaveDraftTop').addEventListener('click', function () { saveDraft(true); });
    el('ap3CreateTop').addEventListener('click', function () {
      if (validateThrough(3)) showStep(4, true);
    });
    el('submitBtn').addEventListener('click', submitPlayer);
    el('ap3AddAnother').addEventListener('click', resetForAnother);
    el('ap3ViewSquad').addEventListener('click', function () { window.location.href = route('/coach/my-players'); });
  }

  function showStep(step, scroll) {
    currentStep = Math.max(1, Math.min(4, Number(step) || 1));
    document.querySelectorAll('[data-step-panel]').forEach(function (panel) {
      panel.classList.toggle('is-active', Number(panel.dataset.stepPanel) === currentStep);
    });
    document.querySelectorAll('[data-ap3-step]').forEach(function (button) {
      var number = Number(button.dataset.ap3Step);
      button.classList.toggle('is-active', number === currentStep);
      button.classList.toggle('is-done', number < currentStep);
      button.setAttribute('aria-current', number === currentStep ? 'step' : 'false');
    });
    if (currentStep === 4) refreshReview();
    if (scroll && el('ap3Root')) el('ap3Root').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function clearMessages() {
    if (el('formError')) { el('formError').textContent = ''; el('formError').className = 'ap3-message is-error'; }
    if (el('formSuccess')) { el('formSuccess').textContent = ''; el('formSuccess').className = 'ap3-message is-success'; }
  }
  function showError(message) {
    clearMessages();
    el('formError').textContent = message;
    el('formError').className = 'ap3-message is-error show';
  }
  function showSuccess(message) {
    clearMessages();
    el('formSuccess').textContent = message;
    el('formSuccess').className = 'ap3-message is-success show';
  }

  function validateThrough(step) {
    clearMessages();
    if (step >= 1 && (!value('firstName').trim() || !value('lastName').trim())) {
      showError('Enter the player first name and last name.'); showStep(1, true); return false;
    }
    if (step >= 1 && !value('ageGroup')) {
      showError('Select an age group from U7 to U16.'); showStep(1, true); return false;
    }
    if (step >= 2 && (!value('positionGroup') || !value('specificPosition'))) {
      showError('Select the player position group and exact position.'); showStep(2, true); return false;
    }
    if (step >= 3) {
      try { collectRatings(); } catch (error) {
        showError(error.message); showStep(3, true); return false;
      }
    }
    return true;
  }

  function teamLabel() {
    var node = el('teamAssignmentInfo');
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : 'Assigned Coach team';
  }
  function coachLabel() {
    var select = el('assignedCoachId');
    if (select && select.value && select.options[select.selectedIndex]) return select.options[select.selectedIndex].textContent;
    var user = window.Auth && window.Auth.user;
    return user ? [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') : 'Signed-in Coach';
  }
  function displayRange(group, key) {
    var button = document.querySelector('[data-range-target="' + group + '"][data-value="' + key + '"]');
    if (!button) return key || 'Not selected';
    return Array.from(button.querySelectorAll('b,span')).map(function (part) { return part.textContent; }).join(' · ');
  }

  function refreshReview() {
    if (!el('ap3ReviewName')) return;
    el('ap3ReviewName').textContent = [value('firstName').trim(), value('lastName').trim()].filter(Boolean).join(' ') || 'Not entered';
    el('ap3ReviewAge').textContent = value('ageGroup') || 'Not selected';
    var position = value('specificPosition');
    el('ap3ReviewPosition').textContent = position
      ? window.ScoutLinkScoringV4.positionLabel(position, options) + ' (' + position + ')'
      : 'Not selected';
    el('ap3ReviewFoot').textContent = value('foot') || 'Right';
    el('ap3ReviewTeam').textContent = teamLabel();
    el('ap3ReviewCoach').textContent = coachLabel();
    el('ap3ReviewHeight').textContent = displayRange('heightCategory', value('heightCategory'));
    el('ap3ReviewBuild').textContent = displayRange('buildCategory', value('buildCategory'));
    var fields = el('ap4AttributeSections') ? el('ap4AttributeSections').querySelectorAll('[data-v4-rating]') : [];
    var rated = Array.from(fields).filter(function (field) { return field.value !== ''; }).length;
    el('ap3ReviewRatings').textContent = rated + ' of ' + fields.length + ' observed ratings';
    el('ap3ReviewIdentity').textContent = initials() + ' initials';
  }

  function payload() {
    return {
      firstName:value('firstName').trim(),
      lastName:value('lastName').trim(),
      ageGroup:value('ageGroup'),
      positionGroup:value('positionGroup'),
      specificPosition:value('specificPosition'),
      primaryPosition:value('specificPosition'),
      positions:[value('specificPosition')],
      foot:value('foot') || 'Right',
      heightCategory:value('heightCategory') || 'average',
      buildCategory:value('buildCategory') || 'athletic',
      assignedCoachId:value('assignedCoachId') || null,
      attributeRatings:collectRatings(),
      attribute_rating_scale:'ten'
    };
  }

  function resultCopy(response) {
    var player = response.player || {};
    var analysis = response.analysis || player.analysis || player.scoring_result || {};
    var parts = [];
    if (player.age_group || value('ageGroup')) parts.push('Age group ' + (player.age_group || value('ageGroup')));
    if (Number.isFinite(Number(analysis.overallRating ?? player.overall_rating))) {
      parts.push('Overall ' + Math.round(Number(analysis.overallRating ?? player.overall_rating)) + '/100');
    }
    var evidence = analysis.evidenceConfidence || player.evidence_confidence || {};
    if (evidence.label || evidence.status) parts.push('Evidence ' + (evidence.label || evidence.status));
    if (Number.isFinite(Number(analysis.footballValueIndex))) {
      parts.push('Football value index ' + Math.round(Number(analysis.footballValueIndex)) + '/100');
    }
    if (analysis.transferValueFormatted || player.transfer_value_formatted) {
      parts.push('Anchored value ' + (analysis.transferValueFormatted || player.transfer_value_formatted));
    }
    return parts.join(' · ') + '.';
  }

  async function submitPlayer() {
    if (!validateThrough(3)) return;
    showStep(4, false);
    if (!el('ap3Confirm').checked) {
      showError('Confirm that the player information is accurate before creating the profile.');
      el('ap3Confirm').focus();
      return;
    }
    var button = el('submitBtn');
    button.disabled = true;
    button.textContent = 'Creating player…';
    try {
      var response = await window.api('POST', '/api/players', payload());
      createdPlayer = response.player || null;
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      var name = createdPlayer
        ? [createdPlayer.first_name, createdPlayer.last_name].filter(Boolean).join(' ')
        : [value('firstName'), value('lastName')].join(' ');
      el('ap3CreatedTitle').textContent = name + ' has been added.';
      el('ap3CreatedCopy').textContent = resultCopy(response);
      el('ap3Created').classList.add('is-visible');
      showSuccess('Player profile created successfully.');
      button.textContent = 'Player created';
      window.scrollTo({top:0, behavior:'smooth'});
    } catch (error) {
      showError(error.message || 'The player could not be created.');
      button.disabled = false;
      button.textContent = 'Create player profile';
    }
  }

  function draftData() {
    var fields = ['firstName','lastName','ageGroup','positionGroup','specificPosition','foot','heightCategory','buildCategory','assignedCoachId'];
    var values = {};
    fields.forEach(function (id) { values[id] = value(id); });
    var ratings = {};
    if (el('ap4AttributeSections')) {
      el('ap4AttributeSections').querySelectorAll('[data-v4-rating]').forEach(function (field) {
        if (field.value !== '') ratings[field.dataset.v4Rating] = Number(field.value);
      });
    }
    return {version:4,currentStep:currentStep,values:values,ratings:ratings,savedAt:new Date().toISOString()};
  }
  function saveDraft(showMessage) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData())); } catch (_) {}
    if (showMessage) showSuccess('Player draft saved on this device.');
  }
  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveDraft(false); }, 250);
  }
  function restoreDraft() {
    try {
      var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!draft || draft.version !== 4) return;
      Object.keys(draft.values || {}).forEach(function (id) {
        if (el(id) && id !== 'specificPosition') el(id).value = draft.values[id] || '';
      });
      if (value('positionGroup')) {
        window.ScoutLinkScoringV4.renderPositionOptions(el('specificPosition'), value('positionGroup'), draft.values.specificPosition, options);
        el('specificPosition').disabled = false;
      }
      var draftGroup = window.ScoutLinkScoringV4.groupForPosition(draft.values.specificPosition);
      renderAssessment(draftGroup
        ? window.ScoutLinkScoringV4.nestRatings(draft.ratings || {}, draftGroup, options)
        : {});
      currentStep = Math.max(1, Math.min(4, Number(draft.currentStep) || 1));
      pendingCoachId = draft.values.assignedCoachId || '';
      setRangeVisual('heightCategory', value('heightCategory') || 'average');
      setRangeVisual('buildCategory', value('buildCategory') || 'athletic');
      showSuccess('Your saved player draft has been restored.');
    } catch (_) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    }
  }
  function setRangeVisual(target, key) {
    document.querySelectorAll('[data-range-target="' + target + '"]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.value === key);
    });
  }

  function resetForAnother() {
    createdPlayer = null;
    clearMessages();
    el('ap3Created').classList.remove('is-visible');
    el('ap3Confirm').checked = false;
    ['firstName','lastName'].forEach(function (id) { el(id).value = ''; });
    el('ageGroup').value = '';
    el('positionGroup').value = '';
    el('specificPosition').innerHTML = '<option value="">Select position group first</option>';
    el('specificPosition').disabled = true;
    el('foot').value = 'Right';
    el('heightCategory').value = 'average';
    el('buildCategory').value = 'athletic';
    setRangeVisual('heightCategory','average');
    setRangeVisual('buildCategory','athletic');
    renderAssessment();
    var button = el('submitBtn');
    button.disabled = false;
    button.textContent = 'Create player profile';
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    showStep(1, true);
    el('firstName').focus();
  }

  async function loadCoachContext() {
    if (isPublicDemo()) {
      el('teamAssignmentInfo').innerHTML = '<span class="ap3-context-icon">TM</span><span>Players added in the public demo stay in this browser session.</span>';
      return;
    }
    if (!window.Auth || window.Auth.type !== 'Coach') {
      el('teamAssignmentInfo').innerHTML = '<span class="ap3-context-icon">TM</span><span>Select the team when creating the player as Stratex.</span>';
      return;
    }
    try {
      var profile = await window.api('GET','/api/coaches/profile');
      var coach = profile.coach || {};
      el('teamAssignmentInfo').innerHTML = '<span class="ap3-context-icon">TM</span><span>Players you add will be assigned to <b>' +
        esc(coach.team_name || 'your team') + '</b>.</span>';
      if (coach.is_super_user) {
        var teamResponse = await window.api('GET','/api/coaches/team-coaches');
        var coaches = [coach].concat(teamResponse.coaches || teamResponse.data || []).filter(function (row, index, all) {
          return row && row.id && all.findIndex(function (other) { return other && other.id === row.id; }) === index;
        });
        el('assignedCoachId').innerHTML = coaches.map(function (row) {
          return '<option value="' + esc(row.id) + '">' + esc([row.first_name,row.last_name].filter(Boolean).join(' ')) +
            (row.is_super_user ? ' (Super user)' : '') + '</option>';
        }).join('');
        if (pendingCoachId && coaches.some(function (row) { return String(row.id) === String(pendingCoachId); })) {
          el('assignedCoachId').value = pendingCoachId;
        }
        el('coachAssignmentCard').style.display = '';
      }
    } catch (error) {
      el('teamAssignmentInfo').innerHTML = '<span class="ap3-context-icon">TM</span><span>Team assignment could not be loaded: ' + esc(error.message) + '</span>';
    }
    refreshReview();
  }

  async function init() {
    if (!allowedContext()) {
      window.location.href = '/login';
      return;
    }
    if (!window.ScoutLinkScoringV4) {
      setTimeout(init, 40);
      return;
    }
    options = await window.ScoutLinkScoringV4.loadOptions();
    if (typeof window.buildScoutNav === 'function') window.buildScoutNav('sidebarNav', 'Coach');
    buildPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
}());

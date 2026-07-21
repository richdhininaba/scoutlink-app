'use strict';

(function () {
  var DRAFT_KEY = 'scoutlink.coach.addPlayer.v3';
  var currentStep = 1;
  var createdPlayer = null;
  var saveTimer = null;
  var pendingCoachId = '';
  var avatar = {
    skinTone:'medium',
    hairStyle:'short',
    kitColor:'green'
  };

  var RATING_IDS = [
    'pace','agility','strength','stamina','jumping','composure',
    'shooting','passing','dribbling','defending','crossing','vision',
    'positioning','heading','tackling',
    'gkDiving','gkReflexes','gkHandling','gkKicking',
    'gkPositioning','gkDistribution','gkCommunication','gkSweeping'
  ];

  var OUT_FIELD_IDS = [
    'shooting','passing','dribbling','defending','crossing',
    'vision','positioning','heading','tackling'
  ];

  var GK_IDS = [
    'gkDiving','gkReflexes','gkHandling','gkKicking',
    'gkPositioning','gkDistribution','gkCommunication','gkSweeping'
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char];
    });
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function'
      ? window.cleanRouteFor(href)
      : href;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    var node = el(id);
    return node ? String(node.value || '') : '';
  }

  function numberValue(id) {
    var raw = value(id);
    return raw === '' ? null : Number(raw);
  }

  function initials() {
    var first = value('firstName').trim().charAt(0);
    var last = value('lastName').trim().charAt(0);
    return (first + last).toUpperCase() || 'PL';
  }

  function ratingField(id,label) {
    return '<div class="ap3-rating"><label for="' + id + '"><span>' +
      esc(label) + '</span><span>/ 10</span></label>' +
      '<input type="number" id="' + id +
      '" min="1" max="10" step="0.5" placeholder="—"></div>';
  }

  function buildPage() {
    document.body.classList.add('coach-add-player-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Add player';

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Add player';

    var page = document.querySelector('.page-content');
    if (!page || page.dataset.ap3Built === '1') return;

    var banner = page.querySelector('.public-demo-banner');
    if (banner) banner.remove();

    page.dataset.ap3Built = '1';
    page.innerHTML =
      '<div class="ap3-root" id="ap3Root">' +
        '<section class="ap3-hero">' +
          '<div><span class="ap3-pill is-green">Coach workspace</span>' +
            '<h1>Add a player profile.</h1>' +
            '<p>Create one complete player record using the existing ScoutLink fields, ratings, team assignment and eligibility checks.</p>' +
          '</div>' +
          '<div class="ap3-hero-actions">' +
            '<button class="ap3-btn" type="button" id="ap3SaveDraftTop">Save draft</button>' +
            '<button class="ap3-btn is-primary" type="button" id="ap3CreateTop">Review player</button>' +
          '</div>' +
        '</section>' +

        '<nav class="ap3-stepper" aria-label="Add player progress">' +
          stepButton(1,'Personal details','Identity and age group') +
          stepButton(2,'Football profile','Position and team') +
          stepButton(3,'Physical and attributes','Profile and ratings') +
          stepButton(4,'Review','Confirm and create') +
        '</nav>' +

        '<div class="ap3-message is-error" id="formError" role="alert"></div>' +
        '<div class="ap3-message is-success" id="formSuccess" aria-live="polite"></div>' +

        personalStep() +
        footballStep() +
        physicalStep() +
        reviewStep() +
      '</div>';

    if (banner) page.insertBefore(banner,page.firstChild);

    bindEvents();
    restoreDraft();
    syncPositionFields();
    renderAvatar();
    showStep(currentStep,false);
    refreshReview();

    if (typeof window.loadCoachContext === 'function') {
      Promise.resolve(window.loadCoachContext()).then(function () {
        applyPendingCoach();
        refreshReview();
      });
    }
  }

  function stepButton(number,title,copy) {
    return '<button class="ap3-step" type="button" data-ap3-step="' + number + '">' +
      '<span class="ap3-step-number">' + number + '</span>' +
      '<span><b>' + esc(title) + '</b><span>' + esc(copy) + '</span></span>' +
    '</button>';
  }

  function panelStart(step,title,copy,badge) {
    return '<section class="ap3-view" id="ap3Step' + step + '" data-step-panel="' + step + '">' +
      '<article class="ap3-panel"><header class="ap3-panel-head">' +
        '<div class="ap3-panel-title"><h2>' + esc(title) + '</h2><p>' +
        esc(copy) + '</p></div><span class="ap3-pill ' +
        (step === 4 ? 'is-green' : '') + '">' + esc(badge) + '</span>' +
      '</header><div class="ap3-panel-body">';
  }

  function panelEnd() {
    return '</div></article></section>';
  }

  function personalStep() {
    return panelStart(
      1,
      'Personal details',
      'Add the player identity and supported ScoutLink age group.',
      'Step 1 of 4'
    ) +
      '<div class="ap3-form-grid">' +
        '<div class="ap3-field"><label for="firstName">First name <span class="ap3-required">*</span></label>' +
          '<input class="ap3-input" type="text" id="firstName" autocomplete="given-name" placeholder="Player first name"></div>' +
        '<div class="ap3-field"><label for="lastName">Last name <span class="ap3-required">*</span></label>' +
          '<input class="ap3-input" type="text" id="lastName" autocomplete="family-name" placeholder="Player last name"></div>' +
        '<div class="ap3-field"><label for="dateOfBirth">Date of birth</label>' +
          '<input class="ap3-input" type="date" id="dateOfBirth"><small>Optional supporting information.</small></div>' +
        '<div class="ap3-field"><label for="ageGroup">Age group <span class="ap3-required">*</span></label>' +
          '<select class="ap3-select" id="ageGroup"><option value="">Select age group</option>' +
          ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'].map(function (group) {
            return '<option>' + group + '</option>';
          }).join('') +
          '</select><small>ScoutLink currently supports U7 to U16 player profiles.</small></div>' +
      '</div>' +

      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>Team assignment</h3>' +
        '<p>The player is automatically added to the signed-in Coach team.</p></div></div>' +
        '<div class="ap3-context-card" id="teamAssignmentInfo">' +
          '<span class="ap3-context-icon">TM</span><span>Loading team assignment…</span>' +
        '</div>' +
      '</div>' +

      '<div class="ap3-section" id="coachAssignmentCard" style="display:none">' +
        '<div class="ap3-section-head"><div><h3>Assigned Coach</h3>' +
        '<p>Super users can choose another active Coach from the same team.</p></div>' +
        '<a class="ap3-btn is-small" href="' + esc(route('coach-settings.html#teamCoaches')) + '">Manage Coaches</a></div>' +
        '<div class="ap3-field"><label for="assignedCoachId">Profile owner</label>' +
          '<select class="ap3-select" id="assignedCoachId"><option value="">Loading Coaches…</option></select></div>' +
      '</div>' +

      '<div class="ap3-actions"><span class="ap3-secondary-copy">Required fields are marked with an asterisk.</span>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="2">Continue to football profile</button></div>' +
    panelEnd();
  }

  function footballStep() {
    return panelStart(
      2,
      'Football profile',
      'Choose the role and preferred foot that best describe the player.',
      'Step 2 of 4'
    ) +
      '<div class="ap3-form-grid is-three">' +
        '<div class="ap3-field"><label for="positionGroup">Position group <span class="ap3-required">*</span></label>' +
          '<select class="ap3-select" id="positionGroup">' +
            '<option value="">Select group</option><option>Goalkeeper</option><option>Defender</option><option>Midfielder</option><option>Forward</option>' +
          '</select></div>' +
        '<div class="ap3-field"><label for="specificPosition">Specific position</label>' +
          '<select class="ap3-select" id="specificPosition"><option value="">Select position group first</option></select></div>' +
        '<div class="ap3-field"><label for="foot">Preferred foot</label>' +
          '<select class="ap3-select" id="foot"><option>Right</option><option>Left</option><option>Both</option></select></div>' +
      '</div>' +

      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>How ScoutLink uses this</h3>' +
          '<p>The position group controls which rating fields are shown and how the player rating is calculated.</p></div></div>' +
        '<div class="ap3-context-card"><span class="ap3-context-icon">FT</span>' +
          '<span>Goalkeepers receive dedicated goalkeeper attributes. Outfield players receive shooting, passing, dribbling, defending and positional attributes.</span></div>' +
      '</div>' +

      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="1">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="3">Continue to physical profile</button></div>' +
    panelEnd();
  }

  function physicalStep() {
    return panelStart(
      3,
      'Physical profile and attributes',
      'Use the current ScoutLink ranges and optional 1–10 ratings.',
      'Step 3 of 4'
    ) +
      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>Height range</h3>' +
          '<p>Select the closest current range.</p></div></div>' +
        '<div class="ap3-choice-grid" data-range-group="heightCategory">' +
          rangeChoice('heightCategory','very_short','Very short','155–163 cm') +
          rangeChoice('heightCategory','short','Short','163–170 cm') +
          rangeChoice('heightCategory','average','Average','170–178 cm',true) +
          rangeChoice('heightCategory','tall','Tall','178–185 cm') +
          rangeChoice('heightCategory','very_tall','Very tall','185+ cm') +
        '</div><input type="hidden" id="heightCategory" value="average">' +
      '</div>' +

      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>Build range</h3>' +
          '<p>Select the closest current range.</p></div></div>' +
        '<div class="ap3-choice-grid is-build" data-range-group="buildCategory">' +
          rangeChoice('buildCategory','very_slight','Very slight','50–58 kg') +
          rangeChoice('buildCategory','slight','Slight','58–65 kg') +
          rangeChoice('buildCategory','lean','Lean','65–72 kg') +
          rangeChoice('buildCategory','athletic','Athletic','72–80 kg',true) +
          rangeChoice('buildCategory','stocky','Stocky','80–88 kg') +
          rangeChoice('buildCategory','powerful','Powerful','88–96 kg') +
          rangeChoice('buildCategory','very_powerful','Very powerful','96+ kg') +
        '</div><input type="hidden" id="buildCategory" value="athletic">' +
      '</div>' +

      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>Generated player avatar</h3>' +
          '<p>A generated avatar is saved with the profile and can be personalised later.</p></div>' +
          '<span class="ap3-pill is-blue">Saved to profile</span></div>' +
        '<div class="ap3-avatar-layout">' +
          '<div class="ap3-avatar-preview"><div class="ap3-avatar" aria-hidden="true">' +
            '<div class="ap3-avatar-hair" id="ap3AvatarHair"></div>' +
            '<div class="ap3-avatar-head" id="ap3AvatarHead"></div>' +
            '<div class="ap3-avatar-kit" id="ap3AvatarKit"></div>' +
            '<div class="ap3-avatar-initials" id="ap3AvatarInitials">PL</div>' +
          '</div><b id="ap3AvatarName">Player avatar</b><span>Generated until the player personalises it</span></div>' +
          '<div class="ap3-avatar-controls">' +
            avatarGroup('Skin tone','skinTone',[
              ['light','Light','#f1c9a5'],['medium','Medium','#b8784b'],['deep','Deep','#704126']
            ]) +
            avatarGroup('Hair','hairStyle',[
              ['short','Short','#1d2630'],['fade','Fade','#263443'],['curly','Curly','#111827'],['shaved','Shaved','#6b4b3b']
            ]) +
            avatarGroup('Kit colour','kitColor',[
              ['green','Green','#0fa37f'],['blue','Blue','#2563eb'],['red','Red','#dc4b58'],['black','Black','#111827']
            ]) +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="ap3-section">' +
        '<div class="ap3-section-head"><div><h3>Universal attributes</h3>' +
          '<p>Optional ratings from 1 to 10. Leave blank where evidence is not available.</p></div></div>' +
        '<div class="ap3-rating-grid" id="universalMetrics">' +
          ratingField('pace','Pace') + ratingField('agility','Agility') +
          ratingField('strength','Strength') + ratingField('stamina','Stamina') +
          ratingField('jumping','Jumping') + ratingField('composure','Composure') +
        '</div>' +
      '</div>' +

      '<div class="ap3-section" id="outfieldMetrics">' +
        '<div class="ap3-section-head"><div><h3>Outfield attributes</h3>' +
          '<p>Shown for Defender, Midfielder and Forward profiles.</p></div></div>' +
        '<div class="ap3-rating-grid">' +
          ratingField('shooting','Shooting') + ratingField('passing','Passing') +
          ratingField('dribbling','Dribbling') + ratingField('defending','Defending') +
          ratingField('crossing','Crossing') + ratingField('vision','Vision') +
          ratingField('positioning','Positioning') + ratingField('heading','Heading') +
          ratingField('tackling','Tackling') +
        '</div>' +
      '</div>' +

      '<div class="ap3-section" id="gkMetrics" style="display:none">' +
        '<div class="ap3-section-head"><div><h3>Goalkeeper attributes</h3>' +
          '<p>Shown when Goalkeeper is selected.</p></div></div>' +
        '<div class="ap3-rating-grid">' +
          ratingField('gkDiving','Diving') + ratingField('gkReflexes','Reflexes') +
          ratingField('gkHandling','Handling') + ratingField('gkKicking','Kicking') +
          ratingField('gkPositioning','GK positioning') + ratingField('gkDistribution','Distribution') +
          ratingField('gkCommunication','Communication') + ratingField('gkSweeping','Sweeping') +
        '</div>' +
      '</div>' +

      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="2">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" data-next-step="4">Review player</button></div>' +
    panelEnd();
  }

  function reviewStep() {
    return panelStart(
      4,
      'Review and create',
      'Check the profile before creating the player and calculating the ScoutLink rating.',
      'Step 4 of 4'
    ) +
      '<div class="ap3-review-grid">' +
        '<div class="ap3-review-card"><h3>Player profile</h3><div class="ap3-review-list">' +
          reviewRow('Name','ap3ReviewName') +
          reviewRow('Age group','ap3ReviewAge') +
          reviewRow('Date of birth','ap3ReviewDob') +
          reviewRow('Position','ap3ReviewPosition') +
          reviewRow('Preferred foot','ap3ReviewFoot') +
          reviewRow('Team','ap3ReviewTeam') +
          reviewRow('Assigned Coach','ap3ReviewCoach') +
        '</div></div>' +
        '<div class="ap3-review-card"><h3>Profile evidence</h3><div class="ap3-review-list">' +
          reviewRow('Height range','ap3ReviewHeight') +
          reviewRow('Build range','ap3ReviewBuild') +
          reviewRow('Ratings entered','ap3ReviewRatings') +
          reviewRow('Avatar','ap3ReviewAvatar') +
        '</div></div>' +
      '</div>' +

      '<label class="ap3-confirm"><input type="checkbox" id="ap3Confirm">' +
        '<span>I confirm the player information is accurate and that the correct permissions or notices are in place.</span></label>' +

      '<div class="ap3-created" id="ap3Created">' +
        '<h3 id="ap3CreatedTitle">Player created</h3>' +
        '<p id="ap3CreatedCopy"></p>' +
        '<div class="ap3-created-actions">' +
          '<button class="ap3-btn is-primary" type="button" id="ap3AddAnother">Add another player</button>' +
          '<button class="ap3-btn" type="button" id="ap3ViewSquad">View My Players</button>' +
        '</div>' +
      '</div>' +

      '<div class="ap3-actions"><button class="ap3-btn" type="button" data-prev-step="3">Back</button>' +
        '<button class="ap3-btn is-primary" type="button" id="submitBtn">Create player profile</button></div>' +
    panelEnd();
  }

  function rangeChoice(group,valueKey,label,range,isActive) {
    return '<button class="ap3-choice range-option' + (isActive ? ' active' : '') +
      '" type="button" data-range-target="' + group + '" data-value="' +
      valueKey + '"><b>' + esc(label) + '</b><span>' + esc(range) + '</span></button>';
  }

  function avatarGroup(label,key,items) {
    return '<div class="ap3-avatar-group"><label>' + esc(label) + '</label><div class="ap3-chip-row">' +
      items.map(function (item,index) {
        return '<button class="ap3-chip' +
          ((key === 'skinTone' && item[0] === 'medium') ||
           (key === 'hairStyle' && item[0] === 'short') ||
           (key === 'kitColor' && item[0] === 'green') ? ' is-active' : '') +
          '" type="button" data-avatar-key="' + key + '" data-avatar-value="' +
          item[0] + '"><span class="ap3-colour-dot" style="background:' +
          item[2] + '"></span>' + esc(item[1]) + '</button>';
      }).join('') +
    '</div></div>';
  }

  function reviewRow(label,id) {
    return '<div class="ap3-review-row"><span>' + esc(label) +
      '</span><b id="' + id + '">—</b></div>';
  }

  function bindEvents() {
    document.querySelectorAll('[data-ap3-step]').forEach(function (button) {
      button.addEventListener('click',function () {
        var target = Number(button.getAttribute('data-ap3-step'));
        if (target > currentStep && !validateThrough(target - 1)) return;
        showStep(target,true);
      });
    });

    document.querySelectorAll('[data-next-step]').forEach(function (button) {
      button.addEventListener('click',function () {
        var target = Number(button.getAttribute('data-next-step'));
        if (!validateThrough(target - 1)) return;
        showStep(target,true);
      });
    });

    document.querySelectorAll('[data-prev-step]').forEach(function (button) {
      button.addEventListener('click',function () {
        showStep(Number(button.getAttribute('data-prev-step')),true);
      });
    });

    document.querySelectorAll('[data-range-target]').forEach(function (button) {
      button.addEventListener('click',function () {
        var target = button.getAttribute('data-range-target');
        document.querySelectorAll('[data-range-target="' + target + '"]').forEach(function (choice) {
          choice.classList.remove('active');
        });
        button.classList.add('active');
        el(target).value = button.getAttribute('data-value');
        scheduleDraftSave();
        refreshReview();
      });
    });

    document.querySelectorAll('[data-avatar-key]').forEach(function (button) {
      button.addEventListener('click',function () {
        var key = button.getAttribute('data-avatar-key');
        var next = button.getAttribute('data-avatar-value');
        avatar[key] = next;
        document.querySelectorAll('[data-avatar-key="' + key + '"]').forEach(function (option) {
          option.classList.toggle(
            'is-active',
            option.getAttribute('data-avatar-value') === next
          );
        });
        renderAvatar();
        scheduleDraftSave();
        refreshReview();
      });
    });

    el('positionGroup').addEventListener('change',function () {
      syncPositionFields();
      scheduleDraftSave();
      refreshReview();
    });

    document.querySelectorAll(
      '#ap3Root input,#ap3Root select,#ap3Root textarea'
    ).forEach(function (node) {
      node.addEventListener('input',function () {
        if (node.id === 'firstName' || node.id === 'lastName') renderAvatar();
        scheduleDraftSave();
        refreshReview();
      });
      node.addEventListener('change',function () {
        scheduleDraftSave();
        refreshReview();
      });
    });

    el('ap3SaveDraftTop').addEventListener('click',function () {
      saveDraft(true);
    });

    el('ap3CreateTop').addEventListener('click',function () {
      if (!validateThrough(3)) return;
      showStep(4,true);
    });

    el('submitBtn').addEventListener('click',submitPlayerV3);
    el('ap3AddAnother').addEventListener('click',resetForAnother);
    el('ap3ViewSquad').addEventListener('click',function () {
      window.location.href = route('coach-my-players.html');
    });
  }

  function syncPositionFields() {
    var group = value('positionGroup');
    var specific = el('specificPosition');
    var current = specific.value;

    if (typeof window.POS_BY_GROUP === 'object') {
      specific.innerHTML = '<option value="">Select specific position</option>' +
        ((window.POS_BY_GROUP[group] || []).map(function (position) {
          return '<option value="' + esc(position) + '">' +
            esc(position) + '</option>';
        }).join(''));
    } else if (typeof window.updateSpecPos === 'function') {
      window.updateSpecPos();
    }

    if ([].slice.call(specific.options).some(function (option) {
      return option.value === current;
    })) {
      specific.value = current;
    }

    if (el('gkMetrics')) {
      el('gkMetrics').style.display = group === 'Goalkeeper' ? 'block' : 'none';
    }
    if (el('outfieldMetrics')) {
      el('outfieldMetrics').style.display = group === 'Goalkeeper' ? 'none' : 'block';
    }
  }

  function showStep(step,scroll) {
    currentStep = Math.max(1,Math.min(4,Number(step) || 1));

    document.querySelectorAll('[data-step-panel]').forEach(function (panel) {
      panel.classList.toggle(
        'is-active',
        Number(panel.getAttribute('data-step-panel')) === currentStep
      );
    });

    document.querySelectorAll('[data-ap3-step]').forEach(function (button) {
      var number = Number(button.getAttribute('data-ap3-step'));
      button.classList.toggle('is-active',number === currentStep);
      button.classList.toggle('is-done',number < currentStep);
      button.setAttribute('aria-current',number === currentStep ? 'step' : 'false');
    });

    if (currentStep === 4) refreshReview();
    if (scroll) saveDraft(false);

    if (scroll) {
      var root = el('ap3Root');
      if (root) root.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }

  function validateThrough(step) {
    clearMessages();

    if (step >= 1) {
      if (!value('firstName').trim() || !value('lastName').trim()) {
        showError('Enter the player first name and last name.');
        showStep(1,true);
        return false;
      }
      if (!value('ageGroup')) {
        showError('Select an age group from U7 to U16.');
        showStep(1,true);
        return false;
      }
    }

    if (step >= 2 && !value('positionGroup')) {
      showError('Select the player position group.');
      showStep(2,true);
      return false;
    }

    if (step >= 3) {
      var invalid = RATING_IDS.find(function (id) {
        var raw = value(id);
        if (raw === '') return false;
        var numeric = Number(raw);
        return !Number.isFinite(numeric) || numeric < 1 || numeric > 10;
      });
      if (invalid) {
        showError('Every rating must be between 1 and 10.');
        showStep(3,true);
        if (el(invalid)) el(invalid).focus();
        return false;
      }
    }

    return true;
  }

  function showError(message) {
    var error = el('formError');
    if (!error) return;
    error.textContent = message;
    error.className = 'ap3-message is-error show';
    var success = el('formSuccess');
    if (success) success.className = 'ap3-message is-success';
  }

  function showSuccess(message) {
    var success = el('formSuccess');
    if (!success) return;
    success.textContent = message;
    success.className = 'ap3-message is-success show';
    var error = el('formError');
    if (error) error.className = 'ap3-message is-error';
  }

  function clearMessages() {
    var error = el('formError');
    var success = el('formSuccess');
    if (error) {
      error.textContent = '';
      error.className = 'ap3-message is-error';
    }
    if (success) {
      success.textContent = '';
      success.className = 'ap3-message is-success';
    }
  }

  function displayRange(group,valueKey) {
    var button = document.querySelector(
      '[data-range-target="' + group + '"][data-value="' + valueKey + '"]'
    );
    if (!button) return valueKey || '—';
    var parts = button.querySelectorAll('b,span');
    return [].slice.call(parts).map(function (part) {
      return part.textContent;
    }).join(' · ');
  }

  function selectedCoachLabel() {
    var select = el('assignedCoachId');
    if (!select || select.offsetParent === null || !select.value) {
      var user = window.Auth && window.Auth.user;
      return user
        ? [user.firstName,user.lastName].filter(Boolean).join(' ') || 'Signed-in Coach'
        : 'Signed-in Coach';
    }
    var option = select.options[select.selectedIndex];
    return option ? option.textContent : 'Signed-in Coach';
  }

  function teamLabel() {
    var context = el('teamAssignmentInfo');
    if (!context) return 'Assigned Coach team';
    return context.textContent.replace(/\s+/g,' ').trim() || 'Assigned Coach team';
  }

  function refreshReview() {
    if (!el('ap3ReviewName')) return;

    el('ap3ReviewName').textContent =
      [value('firstName').trim(),value('lastName').trim()].filter(Boolean).join(' ') || 'Not entered';
    el('ap3ReviewAge').textContent = value('ageGroup') || 'Not selected';
    el('ap3ReviewDob').textContent = value('dateOfBirth') || 'Not added';

    var position = [value('positionGroup'),value('specificPosition')]
      .filter(Boolean).join(' · ');
    el('ap3ReviewPosition').textContent = position || 'Not selected';
    el('ap3ReviewFoot').textContent = value('foot') || 'Right';
    el('ap3ReviewTeam').textContent = teamLabel();
    el('ap3ReviewCoach').textContent = selectedCoachLabel();
    el('ap3ReviewHeight').textContent =
      displayRange('heightCategory',value('heightCategory'));
    el('ap3ReviewBuild').textContent =
      displayRange('buildCategory',value('buildCategory'));

    var positionGroup = value('positionGroup');
    var relevant = ['pace','agility','strength','stamina','jumping','composure']
      .concat(positionGroup === 'Goalkeeper' ? GK_IDS : OUT_FIELD_IDS);
    var rated = relevant.filter(function (id) {
      return value(id) !== '';
    }).length;
    el('ap3ReviewRatings').textContent =
      rated + ' of ' + relevant.length + ' optional ratings';

    el('ap3ReviewAvatar').textContent =
      titleCase(avatar.skinTone) + ' skin · ' +
      titleCase(avatar.hairStyle) + ' hair · ' +
      titleCase(avatar.kitColor) + ' kit';
  }

  function titleCase(valueText) {
    var text = String(valueText || '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  function renderAvatar() {
    if (!el('ap3AvatarHead')) return;

    var skinColours = {
      light:'#f1c9a5',
      medium:'#b8784b',
      deep:'#704126'
    };
    var hairColours = {
      short:'#1d2630',
      fade:'#263443',
      curly:'#111827',
      shaved:'#6b4b3b'
    };
    var kitColours = {
      green:'#0fa37f',
      blue:'#2563eb',
      red:'#dc4b58',
      black:'#111827'
    };

    el('ap3AvatarHead').style.background =
      skinColours[avatar.skinTone] || skinColours.medium;
    el('ap3AvatarHair').style.background =
      hairColours[avatar.hairStyle] || hairColours.short;
    el('ap3AvatarKit').style.background =
      kitColours[avatar.kitColor] || kitColours.green;

    var hair = el('ap3AvatarHair');
    hair.style.height = avatar.hairStyle === 'shaved' ? '13px' :
      avatar.hairStyle === 'curly' ? '29px' : '24px';
    hair.style.borderRadius = avatar.hairStyle === 'fade'
      ? '22px 22px 7px 7px'
      : avatar.hairStyle === 'curly'
        ? '50%'
        : '22px 22px 12px 12px';

    el('ap3AvatarInitials').textContent = initials();
    el('ap3AvatarName').textContent =
      [value('firstName').trim(),value('lastName').trim()]
        .filter(Boolean).join(' ') || 'Player avatar';
  }

  function draftData() {
    var fields = [
      'firstName','lastName','dateOfBirth','ageGroup',
      'positionGroup','specificPosition','foot',
      'heightCategory','buildCategory','assignedCoachId'
    ].concat(RATING_IDS);

    var values = {};
    fields.forEach(function (id) {
      values[id] = value(id);
    });

    return {
      version:3,
      savedAt:new Date().toISOString(),
      currentStep:currentStep,
      values:values,
      avatar:avatar
    };
  }

  function saveDraft(showNotice) {
    try {
      localStorage.setItem(DRAFT_KEY,JSON.stringify(draftData()));
      if (showNotice) showSuccess('Player draft saved on this device.');
    } catch (_) {
      if (showNotice) showError('The draft could not be saved on this device.');
    }
  }

  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveDraft(false);
    },350);
  }

  function restoreDraft() {
    var raw = null;
    try {
      raw = localStorage.getItem(DRAFT_KEY);
    } catch (_) {}

    if (!raw) return;

    try {
      var draft = JSON.parse(raw);
      var values = draft.values || {};
      pendingCoachId = values.assignedCoachId || '';

      [
        'firstName','lastName','dateOfBirth','ageGroup',
        'positionGroup','foot','heightCategory','buildCategory'
      ].concat(RATING_IDS).forEach(function (id) {
        if (el(id) && values[id] != null) el(id).value = values[id];
      });

      syncPositionFields();
      if (el('specificPosition')) {
        el('specificPosition').value = values.specificPosition || '';
      }

      if (draft.avatar) {
        avatar = Object.assign({},avatar,draft.avatar);
      }

      setRangeVisual('heightCategory',value('heightCategory') || 'average');
      setRangeVisual('buildCategory',value('buildCategory') || 'athletic');
      setAvatarVisuals();

      currentStep = Math.max(1,Math.min(4,Number(draft.currentStep) || 1));
      showSuccess('Your saved player draft has been restored.');
    } catch (_) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    }
  }

  function setRangeVisual(target,valueKey) {
    document.querySelectorAll('[data-range-target="' + target + '"]').forEach(function (button) {
      button.classList.toggle(
        'active',
        button.getAttribute('data-value') === valueKey
      );
    });
  }

  function setAvatarVisuals() {
    Object.keys(avatar).forEach(function (key) {
      document.querySelectorAll('[data-avatar-key="' + key + '"]').forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button.getAttribute('data-avatar-value') === avatar[key]
        );
      });
    });
  }

  function applyPendingCoach() {
    if (!pendingCoachId || !el('assignedCoachId')) return;
    var select = el('assignedCoachId');
    var hasOption = [].slice.call(select.options).some(function (option) {
      return String(option.value) === String(pendingCoachId);
    });
    if (hasOption) select.value = pendingCoachId;
    refreshReview();
  }

  function payload() {
    var positionGroup = value('positionGroup');
    var specificPosition = value('specificPosition') || null;
    var body = {
      firstName:value('firstName').trim(),
      lastName:value('lastName').trim(),
      dateOfBirth:value('dateOfBirth') || null,
      ageGroup:value('ageGroup'),
      positionGroup:positionGroup,
      specificPosition:specificPosition,
      positions:specificPosition ? [specificPosition] : [],
      foot:value('foot') || 'Right',
      heightCategory:value('heightCategory') || 'average',
      buildCategory:value('buildCategory') || 'athletic',
      assignedCoachId:value('assignedCoachId') || null,
      pace:numberValue('pace'),
      agility:numberValue('agility'),
      strength:numberValue('strength'),
      stamina:numberValue('stamina'),
      jumping:numberValue('jumping'),
      composure:numberValue('composure'),
      avatarConfig:{
        version:1,
        source:'coach-created',
        skinTone:avatar.skinTone,
        hairStyle:avatar.hairStyle,
        kitColor:avatar.kitColor,
        initials:initials()
      }
    };

    if (positionGroup === 'Goalkeeper') {
      body.gkDiving = numberValue('gkDiving');
      body.gkReflexes = numberValue('gkReflexes');
      body.gkHandling = numberValue('gkHandling');
      body.gkKicking = numberValue('gkKicking');
      body.gkPositioning = numberValue('gkPositioning');
      body.gkDistribution = numberValue('gkDistribution');
      body.gkCommunication = numberValue('gkCommunication');
      body.gkSweeping = numberValue('gkSweeping');
    } else {
      body.shooting = numberValue('shooting');
      body.passing = numberValue('passing');
      body.dribbling = numberValue('dribbling');
      body.defending = numberValue('defending');
      body.crossing = numberValue('crossing');
      body.vision = numberValue('vision');
      body.positioning = numberValue('positioning');
      body.heading = numberValue('heading');
      body.tackling = numberValue('tackling');
    }

    return body;
  }

  async function submitPlayerV3() {
    clearMessages();

    if (!validateThrough(3)) return;
    showStep(4,false);

    if (!el('ap3Confirm').checked) {
      showError('Confirm that the player information is accurate before creating the profile.');
      el('ap3Confirm').focus();
      return;
    }

    var button = el('submitBtn');
    button.disabled = true;
    button.textContent = 'Creating player…';

    try {
      var response = await window.api('POST','/api/players',payload());
      createdPlayer = response.player || null;

      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}

      var name = createdPlayer
        ? [createdPlayer.first_name,createdPlayer.last_name].filter(Boolean).join(' ')
        : [value('firstName'),value('lastName')].join(' ');
      var overall = createdPlayer && createdPlayer.overall_rating != null
        ? (typeof window.ratingDisplay === 'function'
          ? window.ratingDisplay(createdPlayer.overall_rating)
          : Math.round(Number(createdPlayer.overall_rating)))
        : 'Calculated';
      var playerValue = createdPlayer && createdPlayer.transfer_value != null
        ? (typeof window.formatValue === 'function'
          ? window.formatValue(createdPlayer.transfer_value)
          : '£' + Number(createdPlayer.transfer_value).toLocaleString('en-GB'))
        : 'Calculated';

      el('ap3CreatedTitle').textContent = name + ' has been added.';
      el('ap3CreatedCopy').textContent =
        'Age group ' + value('ageGroup') +
        ' · Overall ' + overall +
        ' · Estimated value ' + playerValue + '.';
      el('ap3Created').classList.add('is-visible');

      showSuccess('Player profile created successfully.');
      button.textContent = 'Player created';
      window.scrollTo({top:0,behavior:'smooth'});
    } catch (error) {
      showError(error.message || 'The player could not be created.');
      button.disabled = false;
      button.textContent = 'Create player profile';
    }
  }

  function resetForAnother() {
    createdPlayer = null;
    clearMessages();
    el('ap3Created').classList.remove('is-visible');
    el('ap3Confirm').checked = false;

    document.querySelectorAll(
      '#ap3Root input[type="text"],#ap3Root input[type="date"],#ap3Root input[type="number"]'
    ).forEach(function (input) {
      input.value = '';
    });

    el('ageGroup').value = '';
    el('positionGroup').value = '';
    el('specificPosition').innerHTML =
      '<option value="">Select position group first</option>';
    el('foot').value = 'Right';
    el('heightCategory').value = 'average';
    el('buildCategory').value = 'athletic';

    setRangeVisual('heightCategory','average');
    setRangeVisual('buildCategory','athletic');

    avatar = {skinTone:'medium',hairStyle:'short',kitColor:'green'};
    setAvatarVisuals();
    renderAvatar();
    syncPositionFields();

    var button = el('submitBtn');
    button.disabled = false;
    button.textContent = 'Create player profile';

    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    showStep(1,true);
    el('firstName').focus();
  }

  window.submitPlayer = submitPlayerV3;

  document.addEventListener('DOMContentLoaded',function () {
    document.body.classList.add('coach-add-player-v3');
    buildPage();
  });
})();

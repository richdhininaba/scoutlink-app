(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_player_registration_v1';
  var POSITIONS = [
    'Goalkeeper',
    'Right back',
    'Centre back',
    'Left back',
    'Defensive midfield',
    'Central midfield',
    'Attacking midfield',
    'Right wing',
    'Left wing',
    'Striker'
  ];

  var root = document.getElementById('showcaseApp');
  var state = {
    step: 0,
    status: '',
    event: null,
    submitting: false,
    data: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      ageOnEventDate: null,
      guardianEmail: '',
      guardianPhone: '',
      playerEmail: '',
      playerPhone: '',
      currentlyPlaysForTeam: false,
      teamType: '',
      teamName: '',
      coachName: '',
      positions: [],
      canPlayGoalkeeper: false,
      preferredFoot: '',
      highlightVideo: null,
      highlightFileName: '',
      travelConfirmed: false,
      guardianAware: false
    },
    result: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function saveState() {
    try {
      var safe = JSON.parse(JSON.stringify(state));
      safe.data.highlightVideo = null;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (_) {
      // Session persistence is helpful but must not block registration.
    }
  }

  function restoreState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.data) {
        state.step = Number(saved.step) || 0;
        state.status = saved.status || '';
        state.data = Object.assign(state.data, saved.data);
        state.result = saved.result || null;
      }
    } catch (_) {
      // Ignore invalid browser state.
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Ignore browser storage errors.
    }
  }

  function queryStep() {
    var params = new URLSearchParams(window.location.search);
    if (window.location.pathname.indexOf('/complete') >= 0) return 'complete';
    if (params.get('status') === 'ineligible') return 'ineligible';
    var step = Number(params.get('step'));
    return [1, 2, 3].includes(step) ? step : 0;
  }

  function updateUrl(value) {
    var base = '/showcase-event/player-registration';
    if (value === 'complete') {
      history.pushState({}, '', base + '/complete');
      return;
    }
    if (value === 'ineligible') {
      history.pushState({}, '', base + '?status=ineligible');
      return;
    }
    history.pushState({}, '', value ? base + '?step=' + value : base);
  }

  function eventDateValue() {
    return state.event && state.event.eventDate
      ? state.event.eventDate
      : '2026-09-12';
  }

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    var birth = new Date(dateOfBirth + 'T00:00:00Z');
    var eventDate = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(birth.getTime()) || Number.isNaN(eventDate.getTime())) return null;
    var age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
    var monthDifference = eventDate.getUTCMonth() - birth.getUTCMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && eventDate.getUTCDate() < birth.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

  function eventDateLabel() {
    var date = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(date.getTime())) return 'Saturday 12 September 2026';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function formatTime(value, fallback) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return fallback;
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var displayHour = hour % 12 || 12;
    return displayHour + ':' + match[2] + ' ' + suffix;
  }

  function playerArrivalLabel() {
    return formatTime(state.event && state.event.playerArrivalTime, '12:00 PM');
  }

  function eventMinAge() {
    return Number(state.event && state.event.playerMinAge) || 12;
  }

  function eventMaxAge() {
    return Number(state.event && state.event.playerMaxAge) || 16;
  }

  function eligibleDateRangeLabel() {
    var eventDate = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(eventDate.getTime())) {
      return '13 September 2009 to 12 September 2014';
    }
    var oldest = new Date(eventDate);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - eventMaxAge() - 1);
    oldest.setUTCDate(oldest.getUTCDate() + 1);
    var youngest = new Date(eventDate);
    youngest.setUTCFullYear(youngest.getUTCFullYear() - eventMinAge());
    var options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
    return oldest.toLocaleDateString('en-GB', options) + ' to ' + youngest.toLocaleDateString('en-GB', options);
  }

  function eventVenue() {
    return state.event ? state.event.venueName : 'Ballerz Air Dome, Bluewater';
  }

  function eventAddress() {
    return state.event
      ? state.event.venueAddress
      : 'Ballerz Air Dome, Bluewater Event Space, Upper Blue Car Park, Upper Plaza, Bluewater, Greenhithe, Kent, DA9 9RL';
  }

  function publicHeader() {
    return '<header class="public-header">' +
      '<a class="brand" href="/">Stratex<span>Analytics</span></a>' +
      '<nav>' +
        '<a href="/scoutlink">ScoutLink</a>' +
        '<a href="/about">About</a>' +
        '<a href="/trust">Trust</a>' +
        '<a href="/learning-centre">Learning Centre</a>' +
        '<a href="/contact">Contact</a>' +
      '</nav>' +
      '<a class="header-link" href="/admin">Sign in</a>' +
    '</header>';
  }

  function mobileHeader() {
    return '<header class="mobile-public-header">' +
      '<a class="brand" href="/">Stratex<span>Analytics</span></a>' +
      '<button type="button" data-mobile-menu aria-label="Open menu" aria-expanded="false">☰</button>' +
    '</header>' +
    '<nav class="mobile-menu-panel" data-mobile-menu-panel>' +
      '<a href="/scoutlink">ScoutLink</a>' +
      '<a href="/about">About</a>' +
      '<a href="/trust">Trust</a>' +
      '<a href="/learning-centre">Learning Centre</a>' +
      '<a href="/contact">Contact</a>' +
    '</nav>';
  }

  function campaignPanel(title, subtitle) {
    return '<aside class="campaign-panel">' +
      '<div class="campaign-copy">' +
        '<span class="free-badge">100% free to attend</span>' +
        '<p class="campaign-kicker">ScoutLink Showcase Event</p>' +
        '<h1>' + escapeHtml(title) + '</h1>' +
        '<p class="campaign-subtitle">' + escapeHtml(subtitle) + '</p>' +
      '</div>' +
      '<section class="event-meta">' +
        '<div><small>Date</small><b>' + eventDateLabel() + '</b></div>' +
        '<div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div>' +
      '</section>' +
      '<div class="venue-panel">' +
        '<span class="venue-pin">⌖</span>' +
        '<div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' + escapeHtml(eventAddress()) + '</p></div>' +
      '</div>' +
      '<div class="campaign-proof">' +
        '<span>✓ Free registration</span>' +
        '<span>✓ Live football showcase</span>' +
        '<span>✓ Responsible scout access</span>' +
      '</div>' +
    '</aside>';
  }

  function mobileCampaign(title, subtitle) {
    return '<section class="mobile-campaign-hero">' +
      '<span class="free-badge">100% free to attend</span>' +
      '<p class="campaign-kicker">ScoutLink Showcase Event</p>' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      '<p>' + escapeHtml(subtitle) + '</p>' +
      '<section class="event-meta mobile">' +
        '<div><small>Date</small><b>' + eventDateLabel() + '</b></div>' +
        '<div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div>' +
      '</section>' +
    '</section>';
  }

  function publicFooter() {
    return '<footer class="public-footer">' +
      '<div><div class="brand small">Stratex<span>Analytics</span></div><p>Data, evidence and responsible visibility for grassroots football.</p></div>' +
      '<div><b>Showcase</b><a href="/showcase-event/player-registration">Player registration</a><a href="/showcase-event/coach-scout-registration">Coach and scout registration</a></div>' +
      '<div><b>Trust</b><a href="/safeguarding">Safeguarding</a><a href="/privacy-policy">Privacy</a><a href="/contact">Contact</a></div>' +
    '</footer>';
  }

  function progress(step) {
    var labels = [
      ['Your details', 'Step 1 of 3'],
      ['Football information', 'Step 2 of 3'],
      ['Attendance', 'Step 3 of 3']
    ];
    return '<section class="progress-bar">' + labels.map(function (item, index) {
      var number = index + 1;
      var className = number < step ? 'complete' : number === step ? 'active' : '';
      return '<article class="progress-item ' + className + '">' +
        '<span>' + (number < step ? '✓' : number) + '</span>' +
        '<div><b>' + item[0] + '</b><small>' + item[1] + '</small></div>' +
      '</article>';
    }).join('') + '</section>';
  }

  function field(label, name, type, value, required, help) {
    return '<label class="field">' +
      '<span class="field-label">' + escapeHtml(label) + (required ? '<em>Required</em>' : '') + '</span>' +
      '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '" ' + (required ? 'required' : '') + '>' +
      (help ? '<small class="field-help">' + escapeHtml(help) + '</small>' : '') +
    '</label>';
  }

  function choiceCard(name, value, shortLabel, title, copy, selected) {
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '">' +
      '<input type="radio" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected ? 'checked' : '') + '>' +
      '<span>' + escapeHtml(shortLabel) + '</span>' +
      '<div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(copy) + '</small></div>' +
    '</label>';
  }

  function landingContent() {
    return '<header class="registration-intro">' +
      '<span class="section-kicker">Player registration</span>' +
      '<h2>Show us what you can do</h2>' +
      '<p>Register for the free ScoutLink showcase and put your football in front of coaches and scouts watching live.</p>' +
    '</header>' +
    '<section class="journey-preview">' +
      '<article><span>1</span><div><b>Tell us who you are</b><small>Age and contact details</small></div></article>' +
      '<article><span>2</span><div><b>Tell us about your football</b><small>Team, positions and optional highlights</small></div></article>' +
      '<article><span>3</span><div><b>Confirm you can attend</b><small>Travel and parental awareness where required</small></div></article>' +
    '</section>' +
    '<section class="eligibility-note"><b>Age requirement</b><p>You must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + eventDateLabel() + '. Your date of birth is checked before you can continue.</p></section>' +
    '<div class="primary-cta-block"><button class="btn primary large" type="button" data-action="start">Start player registration</button><small>Takes around 4 minutes. No payment required.</small></div>';
  }

  function detailsContent() {
    var age = state.data.ageOnEventDate;
    var eligible = age !== null && age >= 12 && age <= 16;
    var young = eligible && age <= 14;
    var contactPanel = '';
    if (eligible && young) {
      contactPanel = '<section class="conditional-panel">' +
        '<header><span>Parent or guardian contact required</span><p>Because you will be aged 12–14, your parent or guardian must know about the registration.</p></header>' +
        '<div class="two-col">' +
          field('Parent or guardian email', 'guardianEmail', 'email', state.data.guardianEmail, true) +
          field('Parent or guardian phone number', 'guardianPhone', 'tel', state.data.guardianPhone, true) +
        '</div>' +
      '</section>';
    } else if (eligible) {
      contactPanel = '<section class="conditional-panel">' +
        '<header><span>Your contact details</span><p>Because you will be aged 15–16, you can provide your own email and phone number.</p></header>' +
        '<div class="two-col">' +
          field('Email address', 'playerEmail', 'email', state.data.playerEmail, true) +
          field('Phone number', 'playerPhone', 'tel', state.data.playerPhone, true) +
        '</div>' +
      '</section>';
    }

    return progress(1) +
      '<header class="form-heading"><span class="section-kicker">Step 1</span><h2>Your details</h2><p>We use your date of birth to show the correct contact and consent fields.</p></header>' +
      '<form data-step-form="details">' +
        '<div class="two-col">' +
          field('First name', 'firstName', 'text', state.data.firstName, true) +
          field('Last name', 'lastName', 'text', state.data.lastName, true) +
        '</div>' +
        field('Date of birth', 'dateOfBirth', 'date', state.data.dateOfBirth, true, 'You must be aged ' + eventMinAge() + '–' + eventMaxAge() + ' on ' + eventDateLabel() + '.') +
        (eligible ? '<section class="validation-success"><span>✓</span><div><b>Eligible to register</b><p>You will be ' + age + ' on the event date.</p></div></section>' : '') +
        contactPanel +
        '<p class="privacy-copy">These details are stored securely and used only for this showcase event, safeguarding and event communication.</p>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function footballContent() {
    var positions = state.data.positions;
    var teamFields = state.data.currentlyPlaysForTeam
      ? '<div class="team-type-row"><div class="choice-grid">' +
          choiceCard('teamType', 'non_professional', 'NP', 'Non-professional team', 'Grassroots, school, college or independent academy', state.data.teamType === 'non_professional') +
          choiceCard('teamType', 'professional', 'PRO', 'Professional team', 'Professional club academy or development programme', state.data.teamType === 'professional') +
        '</div></div>' +
        '<div class="two-col">' +
          field('Academy or team name', 'teamName', 'text', state.data.teamName, true) +
          field('Coach name', 'coachName', 'text', state.data.coachName, true) +
        '</div>'
      : '';

    return progress(2) +
      '<header class="form-heading"><span class="section-kicker">Step 2</span><h2>Your football</h2><p>Tell us where and how you play. You can select up to three positions.</p></header>' +
      '<form data-step-form="football">' +
        '<section class="form-section"><span class="section-label">Current team</span>' +
          '<label class="check-row"><input type="checkbox" name="currentlyPlaysForTeam" ' + (state.data.currentlyPlaysForTeam ? 'checked' : '') + '><span><b>I currently play for a team</b><small>This can be a professional academy or a non-professional team.</small></span></label>' +
          teamFields +
        '</section>' +
        '<section class="form-section"><div class="section-label-row"><span class="section-label">Positions</span><small>' + positions.length + ' of 3 selected</small></div>' +
          '<div class="position-grid">' + POSITIONS.map(function (position) {
            return '<button class="position-button ' + (positions.includes(position) ? 'selected' : '') + '" type="button" data-position="' + escapeHtml(position) + '">' + escapeHtml(position) + '</button>';
          }).join('') + '</div>' +
          '<label class="check-row"><input type="checkbox" name="canPlayGoalkeeper" ' + (state.data.canPlayGoalkeeper ? 'checked' : '') + '><span><b>I can also play goalkeeper</b><small>Select this even if goalkeeper is not one of your three main positions.</small></span></label>' +
        '</section>' +
        '<section class="form-section"><span class="section-label">Preferred foot</span><div class="choice-grid">' +
          choiceCard('preferredFoot', 'left', 'L', 'Left', 'Mainly left foot', state.data.preferredFoot === 'left') +
          choiceCard('preferredFoot', 'right', 'R', 'Right', 'Mainly right foot', state.data.preferredFoot === 'right') +
          choiceCard('preferredFoot', 'both', 'B', 'Both', 'Comfortable with both', state.data.preferredFoot === 'both') +
        '</div></section>' +
        '<section class="form-section"><span class="section-label">Highlight video <small>(Totally fine if you do not have one — leave this empty)</small></span>' +
          '<label class="field"><span class="field-label">Upload your highlights</span><label class="upload-control"><input type="file" name="highlightVideo" accept="video/mp4,video/quicktime,video/webm"><span>Choose a video</span><small>MP4, MOV or WEBM · Maximum 100 MB</small></label>' +
          (state.data.highlightFileName ? '<span class="upload-file-name">' + escapeHtml(state.data.highlightFileName) + '</span>' : '') + '</label>' +
        '</section>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function attendanceContent() {
    var young = state.data.ageOnEventDate >= 12 && state.data.ageOnEventDate <= 14;
    return progress(3) +
      '<header class="form-heading"><span class="section-kicker">Final step</span><h2>Confirm you can attend</h2><p>Please only submit if the travel and time work for you.</p></header>' +
      '<form data-step-form="attendance">' +
        '<section class="attendance-card"><div class="date-block"><b>12</b><span>SEP</span></div><div><small>Player arrival</small><h3>' + escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(playerArrivalLabel()) + '</h3><p>' + escapeHtml(eventAddress()) + '</p></div></section>' +
        '<section class="confirmation-list">' +
          '<label class="check-row"><input type="checkbox" name="travelConfirmed" ' + (state.data.travelConfirmed ? 'checked' : '') + '><span><b>I am sure I can travel to Ballerz Air Dome for ' + escapeHtml(playerArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Check the full address and travel time before confirming.</small></span></label>' +
          (young ? '<label class="check-row"><input type="checkbox" name="guardianAware" ' + (state.data.guardianAware ? 'checked' : '') + '><span><b>My parent or guardian knows I am registering and is aware of the event details.</b><small>Required because you will be aged 12–14 on the event date.</small></span></label>' : '') +
        '</section>' +
        '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit-details">Edit</button></header><dl>' +
          '<div><dt>Player</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + ' · Age ' + state.data.ageOnEventDate + '</dd></div>' +
          '<div><dt>Team</dt><dd>' + escapeHtml(state.data.teamName || 'No team provided') + '</dd></div>' +
          '<div><dt>Positions</dt><dd>' + escapeHtml(state.data.positions.join(', ')) + '</dd></div>' +
          '<div><dt>Contact</dt><dd>' + (young ? 'Parent or guardian contact supplied' : 'Player contact supplied') + '</dd></div>' +
        '</dl></section>' +
        '<p class="privacy-copy">Submitting stores this registration securely in Supabase and makes it available only to authorised Stratex Admin users. The registration will be reviewed before any player is chosen.</p>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function ineligibleContent() {
    return '<header class="registration-intro"><span class="section-kicker danger">Age check</span><h2>You are not eligible for this event</h2><p>Players must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + escapeHtml(eventDateLabel()) + '.</p></header>' +
      '<section class="eligibility-range"><small>Eligible date-of-birth range</small><b>' + escapeHtml(eligibleDateRangeLabel()) + '</b></section>' +
      '<section class="support-panel"><b>Think the date was entered incorrectly?</b><p>Go back and check it before leaving the registration.</p></section>' +
      '<button class="btn primary large" type="button" data-action="change-dob">Change date of birth</button>' +
      '<a class="text-link" href="/showcase-event/player-registration">Return to the showcase page</a>';
  }

  function successContent() {
    var result = state.result || {};
    var player = result.player || {};
    return '<section class="success-mark">✓</section>' +
      '<header class="registration-intro centred"><span class="section-kicker">Registration received</span><h2>Your football profile will now be reviewed</h2><p>You will receive an email and a phone call confirming whether you have been successfully chosen for the showcase.</p></header>' +
      '<section class="ticket-panel">' +
        '<div><small>Player</small><b>' + escapeHtml((player.firstName || state.data.firstName) + ' ' + (player.lastName || state.data.lastName)) + '</b></div>' +
        '<div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div>' +
        '<div><small>Event</small><b>ScoutLink Showcase Event</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
      '</section>' +
      '<section class="next-steps"><b>What happens next</b><ol><li>Check the confirmation email sent to the contact supplied.</li><li>Stratex will review the football profile and registration.</li><li>Successful players will receive an email and a phone call.</li></ol></section>' +
      '<a class="btn primary large" href="/">Return to Stratex Analytics</a>';
  }

  function currentContent() {
    if (state.status === 'ineligible') return ineligibleContent();
    if (state.status === 'complete') return successContent();
    if (state.step === 1) return detailsContent();
    if (state.step === 2) return footballContent();
    if (state.step === 3) return attendanceContent();
    return landingContent();
  }

  function titles() {
    if (state.status === 'ineligible') return ['Player age check', 'This showcase is for players aged 12–16.'];
    if (state.status === 'complete') return ['Your opportunity starts here.', 'Registration completed free of charge.'];
    if (state.step === 2) return ['Show us your football.', 'Give coaches and scouts the football context they need before the event.'];
    if (state.step === 3) return ['One final check.', 'Make sure the venue, date and arrival time work before submitting.'];
    return ['This could be your chance to go pro.', 'One free showcase. Live football. Coaches and scouts watching from the touchline.'];
  }

  function actionFooter() {
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) return back + '<button class="btn primary" type="button" data-action="continue-details">Continue to football info</button>';
    if (state.step === 2) return back + '<button class="btn primary" type="button" data-action="continue-football">Continue to attendance</button>';
    return back + '<button class="btn primary" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' + (state.submitting ? 'Submitting…' : 'Submit free registration') + '</button>';
  }

  function render() {
    var titlePair = titles();
    var content = currentContent();
    root.innerHTML =
      '<section class="showcase-desktop-only public-page desktop">' +
        publicHeader() +
        '<main class="public-main">' +
          campaignPanel(titlePair[0], titlePair[1]) +
          '<section class="registration-panel ' + ((state.step === 0 || state.status) ? 'compact' : '') + '">' + content +
            (actionFooter() ? '<footer class="form-actions">' + actionFooter() + '</footer>' : '') +
          '</section>' +
        '</main>' +
        publicFooter() +
      '</section>' +
      '<section class="showcase-mobile-only public-page mobile">' +
        mobileHeader() +
        '<main class="mobile-public-main">' +
          mobileCampaign(titlePair[0], state.step ? 'Step ' + state.step + ' of 3' : titlePair[1]) +
          '<section class="mobile-registration-content">' + content + '</section>' +
        '</main>' +
        (state.step === 0 && !state.status
          ? '<footer class="mobile-sticky-actions"><button class="btn primary" type="button" data-action="start">Start registration</button></footer>'
          : actionFooter()
            ? '<footer class="mobile-sticky-actions">' + actionFooter() + '</footer>'
            : '') +
      '</section>';
    bindEvents();
  }

  function setMessage(message, success) {
    document.querySelectorAll('[data-form-message]').forEach(function (node) {
      node.hidden = !message;
      node.textContent = message || '';
      node.classList.toggle('success', !!success);
    });
  }

  function collectNamedInputs() {
    document.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'file') return;
      if (input.type === 'checkbox') {
        state.data[input.name] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) state.data[input.name] = input.value;
      } else {
        state.data[input.name] = input.value;
      }
    });
    if (state.data.dateOfBirth) {
      state.data.ageOnEventDate = calculateAge(state.data.dateOfBirth);
    }
    saveState();
  }

  function validateDetails() {
    collectNamedInputs();
    if (!state.data.firstName || !state.data.lastName || !state.data.dateOfBirth) {
      return 'Complete the first name, last name and date of birth.';
    }
    var age = state.data.ageOnEventDate;
    if (age === null || age < eventMinAge() || age > eventMaxAge()) {
      state.status = 'ineligible';
      updateUrl('ineligible');
      saveState();
      render();
      return '';
    }
    if (age <= 14 && (!state.data.guardianEmail || !state.data.guardianPhone)) {
      return 'Enter the parent or guardian email and phone number.';
    }
    if (age >= 15 && (!state.data.playerEmail || !state.data.playerPhone)) {
      return 'Enter the player email and phone number.';
    }
    return '';
  }

  function validateFootball() {
    collectNamedInputs();
    if (state.data.currentlyPlaysForTeam && (!state.data.teamType || !state.data.teamName || !state.data.coachName)) {
      return 'Complete the team type, academy or team name and coach name.';
    }
    if (!state.data.positions.length) return 'Choose at least one position.';
    if (state.data.positions.length > 3) return 'Choose no more than three positions.';
    if (!state.data.preferredFoot) return 'Choose Left, Right or Both as the preferred foot.';
    return '';
  }

  function validateAttendance() {
    collectNamedInputs();
    if (!state.data.travelConfirmed) return 'Confirm that you can travel to the event for ' + playerArrivalLabel() + '.';
    if (state.data.ageOnEventDate <= 14 && !state.data.guardianAware) {
      return 'Confirm that the parent or guardian is aware of the event.';
    }
    return '';
  }

  async function submitRegistration() {
    var validationError = validateAttendance();
    if (validationError) {
      setMessage(validationError, false);
      return;
    }
    state.submitting = true;
    render();
    try {
      var formData = new FormData();
      Object.keys(state.data).forEach(function (key) {
        if (key === 'highlightVideo' || key === 'positions' || key === 'ageOnEventDate' || key === 'highlightFileName') return;
        var value = state.data[key];
        if (value !== null && value !== undefined) formData.append(key, String(value));
      });
      state.data.positions.forEach(function (position) {
        formData.append('positions', position);
      });
      if (state.data.highlightVideo) {
        formData.append('highlightVideo', state.data.highlightVideo);
      }
      var response = await fetch(API + '/api/showcase/registrations/player', {
        method: 'POST',
        body: formData
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'The registration could not be submitted.');
      state.result = payload;
      state.status = 'complete';
      state.step = 0;
      state.submitting = false;
      saveState();
      updateUrl('complete');
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'The registration could not be submitted.', false);
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-mobile-menu]').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = button.closest('.public-page').querySelector('[data-mobile-menu-panel]');
        var open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    document.querySelectorAll('[name="dateOfBirth"]').forEach(function (input) {
      input.addEventListener('change', function () {
        state.data.dateOfBirth = input.value;
        state.data.ageOnEventDate = calculateAge(input.value);
        saveState();
        render();
      });
    });

    document.querySelectorAll('[name="currentlyPlaysForTeam"]').forEach(function (input) {
      input.addEventListener('change', function () {
        state.data.currentlyPlaysForTeam = input.checked;
        if (!input.checked) {
          state.data.teamType = '';
          state.data.teamName = '';
          state.data.coachName = '';
        }
        saveState();
        render();
      });
    });

    document.querySelectorAll('[data-position]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = button.dataset.position;
        var index = state.data.positions.indexOf(position);
        if (index >= 0) {
          state.data.positions.splice(index, 1);
        } else if (state.data.positions.length < 3) {
          state.data.positions.push(position);
        } else {
          setMessage('You can select a maximum of three positions.', false);
          return;
        }
        saveState();
        render();
      });
    });

    document.querySelectorAll('input[type="radio"],input[type="checkbox"],input[type="text"],input[type="email"],input[type="tel"]').forEach(function (input) {
      input.addEventListener('change', collectNamedInputs);
      input.addEventListener('input', collectNamedInputs);
    });

    document.querySelectorAll('[name="highlightVideo"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file && file.size > 100 * 1024 * 1024) {
          input.value = '';
          setMessage('The highlight video must be 100 MB or smaller.', false);
          return;
        }
        state.data.highlightVideo = file || null;
        state.data.highlightFileName = file ? file.name : '';
        saveState();
        render();
      });
    });

    document.querySelectorAll('[data-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.dataset.action;
        setMessage('', false);
        if (action === 'start') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'back') {
          state.step = Math.max(0, state.step - 1);
          updateUrl(state.step);
          saveState();
          render();
        } else if (action === 'continue-details') {
          var detailsError = validateDetails();
          if (detailsError) return setMessage(detailsError, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render();
        } else if (action === 'continue-football') {
          var footballError = validateFootball();
          if (footballError) return setMessage(footballError, false);
          state.step = 3;
          updateUrl(3);
          saveState();
          render();
        } else if (action === 'edit-details' || action === 'change-dob') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'submit') {
          submitRegistration();
        }
      });
    });
  }

  async function loadConfig() {
    root.innerHTML = '<div class="admin-loading">Loading showcase registration…</div>';
    try {
      var response = await fetch(API + '/api/showcase/registrations/config');
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'The showcase event could not be loaded.');
      state.event = payload.event;
      var pathState = queryStep();
      if (pathState === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (pathState === 'ineligible') {
        state.status = 'ineligible';
        state.step = 0;
      } else {
        state.status = '';
        state.step = Number(pathState) || state.step || 0;
      }
      render();
    } catch (error) {
      root.innerHTML = '<section class="support-panel" style="margin:30px"><b>Registration could not load</b><p>' + escapeHtml(error.message) + ' Contact people@stratexanalytics.co.uk if the problem continues.</p></section>';
    }
  }

  restoreState();
  window.addEventListener('popstate', function () {
    var value = queryStep();
    state.status = value === 'complete' || value === 'ineligible' ? value : '';
    state.step = typeof value === 'number' ? value : 0;
    render();
  });
  loadConfig();
}());

FILE: backend/frontend/js/showcase-player-registration-v1.js
============================================================
(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_player_registration_v1';
  var POSITIONS = [
    'Goalkeeper',
    'Right back',
    'Centre back',
    'Left back',
    'Defensive midfield',
    'Central midfield',
    'Attacking midfield',
    'Right wing',
    'Left wing',
    'Striker'
  ];

  var root = document.getElementById('showcaseApp');
  var state = {
    step: 0,
    status: '',
    event: null,
    submitting: false,
    data: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      ageOnEventDate: null,
      guardianEmail: '',
      guardianPhone: '',
      playerEmail: '',
      playerPhone: '',
      currentlyPlaysForTeam: false,
      teamType: '',
      teamName: '',
      coachName: '',
      positions: [],
      canPlayGoalkeeper: false,
      preferredFoot: '',
      highlightVideo: null,
      highlightFileName: '',
      travelConfirmed: false,
      guardianAware: false
    },
    result: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function saveState() {
    try {
      var safe = JSON.parse(JSON.stringify(state));
      safe.data.highlightVideo = null;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (_) {
      // Session persistence is helpful but must not block registration.
    }
  }

  function restoreState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.data) {
        state.step = Number(saved.step) || 0;
        state.status = saved.status || '';
        state.data = Object.assign(state.data, saved.data);
        state.result = saved.result || null;
      }
    } catch (_) {
      // Ignore invalid browser state.
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Ignore browser storage errors.
    }
  }

  function queryStep() {
    var params = new URLSearchParams(window.location.search);
    if (window.location.pathname.indexOf('/complete') >= 0) return 'complete';
    if (params.get('status') === 'ineligible') return 'ineligible';
    var step = Number(params.get('step'));
    return [1, 2, 3].includes(step) ? step : 0;
  }

  function updateUrl(value) {
    var base = '/showcase-event/player-registration';
    if (value === 'complete') {
      history.pushState({}, '', base + '/complete');
      return;
    }
    if (value === 'ineligible') {
      history.pushState({}, '', base + '?status=ineligible');
      return;
    }
    history.pushState({}, '', value ? base + '?step=' + value : base);
  }

  function eventDateValue() {
    return state.event && state.event.eventDate
      ? state.event.eventDate
      : '2026-09-12';
  }

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    var birth = new Date(dateOfBirth + 'T00:00:00Z');
    var eventDate = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(birth.getTime()) || Number.isNaN(eventDate.getTime())) return null;
    var age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
    var monthDifference = eventDate.getUTCMonth() - birth.getUTCMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && eventDate.getUTCDate() < birth.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

  function eventDateLabel() {
    var date = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(date.getTime())) return 'Saturday 12 September 2026';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function formatTime(value, fallback) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return fallback;
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var displayHour = hour % 12 || 12;
    return displayHour + ':' + match[2] + ' ' + suffix;
  }

  function playerArrivalLabel() {
    return formatTime(state.event && state.event.playerArrivalTime, '12:00 PM');
  }

  function eventMinAge() {
    return Number(state.event && state.event.playerMinAge) || 12;
  }

  function eventMaxAge() {
    return Number(state.event && state.event.playerMaxAge) || 16;
  }

  function eligibleDateRangeLabel() {
    var eventDate = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(eventDate.getTime())) {
      return '13 September 2009 to 12 September 2014';
    }
    var oldest = new Date(eventDate);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - eventMaxAge() - 1);
    oldest.setUTCDate(oldest.getUTCDate() + 1);
    var youngest = new Date(eventDate);
    youngest.setUTCFullYear(youngest.getUTCFullYear() - eventMinAge());
    var options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
    return oldest.toLocaleDateString('en-GB', options) + ' to ' + youngest.toLocaleDateString('en-GB', options);
  }

  function eventVenue() {
    return state.event ? state.event.venueName : 'Ballerz Air Dome, Bluewater';
  }

  function eventAddress() {
    return state.event
      ? state.event.venueAddress
      : 'Ballerz Air Dome, Bluewater Event Space, Upper Blue Car Park, Upper Plaza, Bluewater, Greenhithe, Kent, DA9 9RL';
  }

  function publicHeader() {
    return '<header class="public-header">' +
      '<a class="brand" href="/">Stratex<span>Analytics</span></a>' +
      '<nav>' +
        '<a href="/scoutlink">ScoutLink</a>' +
        '<a href="/about">About</a>' +
        '<a href="/trust">Trust</a>' +
        '<a href="/learning-centre">Learning Centre</a>' +
        '<a href="/contact">Contact</a>' +
      '</nav>' +
      '<a class="header-link" href="/admin">Sign in</a>' +
    '</header>';
  }

  function mobileHeader() {
    return '<header class="mobile-public-header">' +
      '<a class="brand" href="/">Stratex<span>Analytics</span></a>' +
      '<button type="button" data-mobile-menu aria-label="Open menu" aria-expanded="false">☰</button>' +
    '</header>' +
    '<nav class="mobile-menu-panel" data-mobile-menu-panel>' +
      '<a href="/scoutlink">ScoutLink</a>' +
      '<a href="/about">About</a>' +
      '<a href="/trust">Trust</a>' +
      '<a href="/learning-centre">Learning Centre</a>' +
      '<a href="/contact">Contact</a>' +
    '</nav>';
  }

  function campaignPanel(title, subtitle) {
    return '<aside class="campaign-panel">' +
      '<div class="campaign-copy">' +
        '<span class="free-badge">100% free to attend</span>' +
        '<p class="campaign-kicker">ScoutLink Showcase Event</p>' +
        '<h1>' + escapeHtml(title) + '</h1>' +
        '<p class="campaign-subtitle">' + escapeHtml(subtitle) + '</p>' +
      '</div>' +
      '<section class="event-meta">' +
        '<div><small>Date</small><b>' + eventDateLabel() + '</b></div>' +
        '<div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div>' +
      '</section>' +
      '<div class="venue-panel">' +
        '<span class="venue-pin">⌖</span>' +
        '<div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' + escapeHtml(eventAddress()) + '</p></div>' +
      '</div>' +
      '<div class="campaign-proof">' +
        '<span>✓ Free registration</span>' +
        '<span>✓ Live football showcase</span>' +
        '<span>✓ Responsible scout access</span>' +
      '</div>' +
    '</aside>';
  }

  function mobileCampaign(title, subtitle) {
    return '<section class="mobile-campaign-hero">' +
      '<span class="free-badge">100% free to attend</span>' +
      '<p class="campaign-kicker">ScoutLink Showcase Event</p>' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      '<p>' + escapeHtml(subtitle) + '</p>' +
      '<section class="event-meta mobile">' +
        '<div><small>Date</small><b>' + eventDateLabel() + '</b></div>' +
        '<div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div>' +
      '</section>' +
    '</section>';
  }

  function publicFooter() {
    return '<footer class="public-footer">' +
      '<div><div class="brand small">Stratex<span>Analytics</span></div><p>Data, evidence and responsible visibility for grassroots football.</p></div>' +
      '<div><b>Showcase</b><a href="/showcase-event/player-registration">Player registration</a><a href="/showcase-event/coach-scout-registration">Coach and scout registration</a></div>' +
      '<div><b>Trust</b><a href="/safeguarding">Safeguarding</a><a href="/privacy-policy">Privacy</a><a href="/contact">Contact</a></div>' +
    '</footer>';
  }

  function progress(step) {
    var labels = [
      ['Your details', 'Step 1 of 3'],
      ['Football information', 'Step 2 of 3'],
      ['Attendance', 'Step 3 of 3']
    ];
    return '<section class="progress-bar">' + labels.map(function (item, index) {
      var number = index + 1;
      var className = number < step ? 'complete' : number === step ? 'active' : '';
      return '<article class="progress-item ' + className + '">' +
        '<span>' + (number < step ? '✓' : number) + '</span>' +
        '<div><b>' + item[0] + '</b><small>' + item[1] + '</small></div>' +
      '</article>';
    }).join('') + '</section>';
  }

  function field(label, name, type, value, required, help) {
    return '<label class="field">' +
      '<span class="field-label">' + escapeHtml(label) + (required ? '<em>Required</em>' : '') + '</span>' +
      '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '" ' + (required ? 'required' : '') + '>' +
      (help ? '<small class="field-help">' + escapeHtml(help) + '</small>' : '') +
    '</label>';
  }

  function choiceCard(name, value, shortLabel, title, copy, selected) {
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '">' +
      '<input type="radio" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected ? 'checked' : '') + '>' +
      '<span>' + escapeHtml(shortLabel) + '</span>' +
      '<div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(copy) + '</small></div>' +
    '</label>';
  }

  function landingContent() {
    return '<header class="registration-intro">' +
      '<span class="section-kicker">Player registration</span>' +
      '<h2>Show us what you can do</h2>' +
      '<p>Register for the free ScoutLink showcase and put your football in front of coaches and scouts watching live.</p>' +
    '</header>' +
    '<section class="journey-preview">' +
      '<article><span>1</span><div><b>Tell us who you are</b><small>Age and contact details</small></div></article>' +
      '<article><span>2</span><div><b>Tell us about your football</b><small>Team, positions and optional highlights</small></div></article>' +
      '<article><span>3</span><div><b>Confirm you can attend</b><small>Travel and parental awareness where required</small></div></article>' +
    '</section>' +
    '<section class="eligibility-note"><b>Age requirement</b><p>You must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + eventDateLabel() + '. Your date of birth is checked before you can continue.</p></section>' +
    '<div class="primary-cta-block"><button class="btn primary large" type="button" data-action="start">Start player registration</button><small>Takes around 4 minutes. No payment required.</small></div>';
  }

  function detailsContent() {
    var age = state.data.ageOnEventDate;
    var eligible = age !== null && age >= 12 && age <= 16;
    var young = eligible && age <= 14;
    var contactPanel = '';
    if (eligible && young) {
      contactPanel = '<section class="conditional-panel">' +
        '<header><span>Parent or guardian contact required</span><p>Because you will be aged 12–14, your parent or guardian must know about the registration.</p></header>' +
        '<div class="two-col">' +
          field('Parent or guardian email', 'guardianEmail', 'email', state.data.guardianEmail, true) +
          field('Parent or guardian phone number', 'guardianPhone', 'tel', state.data.guardianPhone, true) +
        '</div>' +
      '</section>';
    } else if (eligible) {
      contactPanel = '<section class="conditional-panel">' +
        '<header><span>Your contact details</span><p>Because you will be aged 15–16, you can provide your own email and phone number.</p></header>' +
        '<div class="two-col">' +
          field('Email address', 'playerEmail', 'email', state.data.playerEmail, true) +
          field('Phone number', 'playerPhone', 'tel', state.data.playerPhone, true) +
        '</div>' +
      '</section>';
    }

    return progress(1) +
      '<header class="form-heading"><span class="section-kicker">Step 1</span><h2>Your details</h2><p>We use your date of birth to show the correct contact and consent fields.</p></header>' +
      '<form data-step-form="details">' +
        '<div class="two-col">' +
          field('First name', 'firstName', 'text', state.data.firstName, true) +
          field('Last name', 'lastName', 'text', state.data.lastName, true) +
        '</div>' +
        field('Date of birth', 'dateOfBirth', 'date', state.data.dateOfBirth, true, 'You must be aged ' + eventMinAge() + '–' + eventMaxAge() + ' on ' + eventDateLabel() + '.') +
        (eligible ? '<section class="validation-success"><span>✓</span><div><b>Eligible to register</b><p>You will be ' + age + ' on the event date.</p></div></section>' : '') +
        contactPanel +
        '<p class="privacy-copy">These details are stored securely and used only for this showcase event, safeguarding and event communication.</p>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function footballContent() {
    var positions = state.data.positions;
    var teamFields = state.data.currentlyPlaysForTeam
      ? '<div class="team-type-row"><div class="choice-grid">' +
          choiceCard('teamType', 'non_professional', 'NP', 'Non-professional team', 'Grassroots, school, college or independent academy', state.data.teamType === 'non_professional') +
          choiceCard('teamType', 'professional', 'PRO', 'Professional team', 'Professional club academy or development programme', state.data.teamType === 'professional') +
        '</div></div>' +
        '<div class="two-col">' +
          field('Academy or team name', 'teamName', 'text', state.data.teamName, true) +
          field('Coach name', 'coachName', 'text', state.data.coachName, true) +
        '</div>'
      : '';

    return progress(2) +
      '<header class="form-heading"><span class="section-kicker">Step 2</span><h2>Your football</h2><p>Tell us where and how you play. You can select up to three positions.</p></header>' +
      '<form data-step-form="football">' +
        '<section class="form-section"><span class="section-label">Current team</span>' +
          '<label class="check-row"><input type="checkbox" name="currentlyPlaysForTeam" ' + (state.data.currentlyPlaysForTeam ? 'checked' : '') + '><span><b>I currently play for a team</b><small>This can be a professional academy or a non-professional team.</small></span></label>' +
          teamFields +
        '</section>' +
        '<section class="form-section"><div class="section-label-row"><span class="section-label">Positions</span><small>' + positions.length + ' of 3 selected</small></div>' +
          '<div class="position-grid">' + POSITIONS.map(function (position) {
            return '<button class="position-button ' + (positions.includes(position) ? 'selected' : '') + '" type="button" data-position="' + escapeHtml(position) + '">' + escapeHtml(position) + '</button>';
          }).join('') + '</div>' +
          '<label class="check-row"><input type="checkbox" name="canPlayGoalkeeper" ' + (state.data.canPlayGoalkeeper ? 'checked' : '') + '><span><b>I can also play goalkeeper</b><small>Select this even if goalkeeper is not one of your three main positions.</small></span></label>' +
        '</section>' +
        '<section class="form-section"><span class="section-label">Preferred foot</span><div class="choice-grid">' +
          choiceCard('preferredFoot', 'left', 'L', 'Left', 'Mainly left foot', state.data.preferredFoot === 'left') +
          choiceCard('preferredFoot', 'right', 'R', 'Right', 'Mainly right foot', state.data.preferredFoot === 'right') +
          choiceCard('preferredFoot', 'both', 'B', 'Both', 'Comfortable with both', state.data.preferredFoot === 'both') +
        '</div></section>' +
        '<section class="form-section"><span class="section-label">Highlight video <small>(Totally fine if you do not have one — leave this empty)</small></span>' +
          '<label class="field"><span class="field-label">Upload your highlights</span><label class="upload-control"><input type="file" name="highlightVideo" accept="video/mp4,video/quicktime,video/webm"><span>Choose a video</span><small>MP4, MOV or WEBM · Maximum 100 MB</small></label>' +
          (state.data.highlightFileName ? '<span class="upload-file-name">' + escapeHtml(state.data.highlightFileName) + '</span>' : '') + '</label>' +
        '</section>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function attendanceContent() {
    var young = state.data.ageOnEventDate >= 12 && state.data.ageOnEventDate <= 14;
    return progress(3) +
      '<header class="form-heading"><span class="section-kicker">Final step</span><h2>Confirm you can attend</h2><p>Please only submit if the travel and time work for you.</p></header>' +
      '<form data-step-form="attendance">' +
        '<section class="attendance-card"><div class="date-block"><b>12</b><span>SEP</span></div><div><small>Player arrival</small><h3>' + escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(playerArrivalLabel()) + '</h3><p>' + escapeHtml(eventAddress()) + '</p></div></section>' +
        '<section class="confirmation-list">' +
          '<label class="check-row"><input type="checkbox" name="travelConfirmed" ' + (state.data.travelConfirmed ? 'checked' : '') + '><span><b>I am sure I can travel to Ballerz Air Dome for ' + escapeHtml(playerArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Check the full address and travel time before confirming.</small></span></label>' +
          (young ? '<label class="check-row"><input type="checkbox" name="guardianAware" ' + (state.data.guardianAware ? 'checked' : '') + '><span><b>My parent or guardian knows I am registering and is aware of the event details.</b><small>Required because you will be aged 12–14 on the event date.</small></span></label>' : '') +
        '</section>' +
        '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit-details">Edit</button></header><dl>' +
          '<div><dt>Player</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + ' · Age ' + state.data.ageOnEventDate + '</dd></div>' +
          '<div><dt>Team</dt><dd>' + escapeHtml(state.data.teamName || 'No team provided') + '</dd></div>' +
          '<div><dt>Positions</dt><dd>' + escapeHtml(state.data.positions.join(', ')) + '</dd></div>' +
          '<div><dt>Contact</dt><dd>' + (young ? 'Parent or guardian contact supplied' : 'Player contact supplied') + '</dd></div>' +
        '</dl></section>' +
        '<p class="privacy-copy">Submitting stores this registration securely in Supabase and makes it available only to authorised Stratex Admin users. The registration will be reviewed before any player is chosen.</p>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function ineligibleContent() {
    return '<header class="registration-intro"><span class="section-kicker danger">Age check</span><h2>You are not eligible for this event</h2><p>Players must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + escapeHtml(eventDateLabel()) + '.</p></header>' +
      '<section class="eligibility-range"><small>Eligible date-of-birth range</small><b>' + escapeHtml(eligibleDateRangeLabel()) + '</b></section>' +
      '<section class="support-panel"><b>Think the date was entered incorrectly?</b><p>Go back and check it before leaving the registration.</p></section>' +
      '<button class="btn primary large" type="button" data-action="change-dob">Change date of birth</button>' +
      '<a class="text-link" href="/showcase-event/player-registration">Return to the showcase page</a>';
  }

  function successContent() {
    var result = state.result || {};
    var player = result.player || {};
    return '<section class="success-mark">✓</section>' +
      '<header class="registration-intro centred"><span class="section-kicker">Registration received</span><h2>Your football profile will now be reviewed</h2><p>You will receive an email and a phone call confirming whether you have been successfully chosen for the showcase.</p></header>' +
      '<section class="ticket-panel">' +
        '<div><small>Player</small><b>' + escapeHtml((player.firstName || state.data.firstName) + ' ' + (player.lastName || state.data.lastName)) + '</b></div>' +
        '<div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div>' +
        '<div><small>Event</small><b>ScoutLink Showcase Event</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
      '</section>' +
      '<section class="next-steps"><b>What happens next</b><ol><li>Check the confirmation email sent to the contact supplied.</li><li>Stratex will review the football profile and registration.</li><li>Successful players will receive an email and a phone call.</li></ol></section>' +
      '<a class="btn primary large" href="/">Return to Stratex Analytics</a>';
  }

  function currentContent() {
    if (state.status === 'ineligible') return ineligibleContent();
    if (state.status === 'complete') return successContent();
    if (state.step === 1) return detailsContent();
    if (state.step === 2) return footballContent();
    if (state.step === 3) return attendanceContent();
    return landingContent();
  }

  function titles() {
    if (state.status === 'ineligible') return ['Player age check', 'This showcase is for players aged 12–16.'];
    if (state.status === 'complete') return ['Your opportunity starts here.', 'Registration completed free of charge.'];
    if (state.step === 2) return ['Show us your football.', 'Give coaches and scouts the football context they need before the event.'];
    if (state.step === 3) return ['One final check.', 'Make sure the venue, date and arrival time work before submitting.'];
    return ['This could be your chance to go pro.', 'One free showcase. Live football. Coaches and scouts watching from the touchline.'];
  }

  function actionFooter() {
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) return back + '<button class="btn primary" type="button" data-action="continue-details">Continue to football info</button>';
    if (state.step === 2) return back + '<button class="btn primary" type="button" data-action="continue-football">Continue to attendance</button>';
    return back + '<button class="btn primary" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' + (state.submitting ? 'Submitting…' : 'Submit free registration') + '</button>';
  }

  function render() {
    var titlePair = titles();
    var content = currentContent();
    root.innerHTML =
      '<section class="showcase-desktop-only public-page desktop">' +
        publicHeader() +
        '<main class="public-main">' +
          campaignPanel(titlePair[0], titlePair[1]) +
          '<section class="registration-panel ' + ((state.step === 0 || state.status) ? 'compact' : '') + '">' + content +
            (actionFooter() ? '<footer class="form-actions">' + actionFooter() + '</footer>' : '') +
          '</section>' +
        '</main>' +
        publicFooter() +
      '</section>' +
      '<section class="showcase-mobile-only public-page mobile">' +
        mobileHeader() +
        '<main class="mobile-public-main">' +
          mobileCampaign(titlePair[0], state.step ? 'Step ' + state.step + ' of 3' : titlePair[1]) +
          '<section class="mobile-registration-content">' + content + '</section>' +
        '</main>' +
        (state.step === 0 && !state.status
          ? '<footer class="mobile-sticky-actions"><button class="btn primary" type="button" data-action="start">Start registration</button></footer>'
          : actionFooter()
            ? '<footer class="mobile-sticky-actions">' + actionFooter() + '</footer>'
            : '') +
      '</section>';
    bindEvents();
  }

  function setMessage(message, success) {
    document.querySelectorAll('[data-form-message]').forEach(function (node) {
      node.hidden = !message;
      node.textContent = message || '';
      node.classList.toggle('success', !!success);
    });
  }

  function collectNamedInputs() {
    document.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'file') return;
      if (input.type === 'checkbox') {
        state.data[input.name] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) state.data[input.name] = input.value;
      } else {
        state.data[input.name] = input.value;
      }
    });
    if (state.data.dateOfBirth) {
      state.data.ageOnEventDate = calculateAge(state.data.dateOfBirth);
    }
    saveState();
  }

  function validateDetails() {
    collectNamedInputs();
    if (!state.data.firstName || !state.data.lastName || !state.data.dateOfBirth) {
      return 'Complete the first name, last name and date of birth.';
    }
    var age = state.data.ageOnEventDate;
    if (age === null || age < eventMinAge() || age > eventMaxAge()) {
      state.status = 'ineligible';
      updateUrl('ineligible');
      saveState();
      render();
      return '';
    }
    if (age <= 14 && (!state.data.guardianEmail || !state.data.guardianPhone)) {
      return 'Enter the parent or guardian email and phone number.';
    }
    if (age >= 15 && (!state.data.playerEmail || !state.data.playerPhone)) {
      return 'Enter the player email and phone number.';
    }
    return '';
  }

  function validateFootball() {
    collectNamedInputs();
    if (state.data.currentlyPlaysForTeam && (!state.data.teamType || !state.data.teamName || !state.data.coachName)) {
      return 'Complete the team type, academy or team name and coach name.';
    }
    if (!state.data.positions.length) return 'Choose at least one position.';
    if (state.data.positions.length > 3) return 'Choose no more than three positions.';
    if (!state.data.preferredFoot) return 'Choose Left, Right or Both as the preferred foot.';
    return '';
  }

  function validateAttendance() {
    collectNamedInputs();
    if (!state.data.travelConfirmed) return 'Confirm that you can travel to the event for ' + playerArrivalLabel() + '.';
    if (state.data.ageOnEventDate <= 14 && !state.data.guardianAware) {
      return 'Confirm that the parent or guardian is aware of the event.';
    }
    return '';
  }

  async function submitRegistration() {
    var validationError = validateAttendance();
    if (validationError) {
      setMessage(validationError, false);
      return;
    }
    state.submitting = true;
    render();
    try {
      var formData = new FormData();
      Object.keys(state.data).forEach(function (key) {
        if (key === 'highlightVideo' || key === 'positions' || key === 'ageOnEventDate' || key === 'highlightFileName') return;
        var value = state.data[key];
        if (value !== null && value !== undefined) formData.append(key, String(value));
      });
      state.data.positions.forEach(function (position) {
        formData.append('positions', position);
      });
      if (state.data.highlightVideo) {
        formData.append('highlightVideo', state.data.highlightVideo);
      }
      var response = await fetch(API + '/api/showcase/registrations/player', {
        method: 'POST',
        body: formData
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'The registration could not be submitted.');
      state.result = payload;
      state.status = 'complete';
      state.step = 0;
      state.submitting = false;
      saveState();
      updateUrl('complete');
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'The registration could not be submitted.', false);
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-mobile-menu]').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = button.closest('.public-page').querySelector('[data-mobile-menu-panel]');
        var open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    document.querySelectorAll('[name="dateOfBirth"]').forEach(function (input) {
      input.addEventListener('change', function () {
        state.data.dateOfBirth = input.value;
        state.data.ageOnEventDate = calculateAge(input.value);
        saveState();
        render();
      });
    });

    document.querySelectorAll('[name="currentlyPlaysForTeam"]').forEach(function (input) {
      input.addEventListener('change', function () {
        state.data.currentlyPlaysForTeam = input.checked;
        if (!input.checked) {
          state.data.teamType = '';
          state.data.teamName = '';
          state.data.coachName = '';
        }
        saveState();
        render();
      });
    });

    document.querySelectorAll('[data-position]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = button.dataset.position;
        var index = state.data.positions.indexOf(position);
        if (index >= 0) {
          state.data.positions.splice(index, 1);
        } else if (state.data.positions.length < 3) {
          state.data.positions.push(position);
        } else {
          setMessage('You can select a maximum of three positions.', false);
          return;
        }
        saveState();
        render();
      });
    });

    document.querySelectorAll('input[type="radio"],input[type="checkbox"],input[type="text"],input[type="email"],input[type="tel"]').forEach(function (input) {
      input.addEventListener('change', collectNamedInputs);
      input.addEventListener('input', collectNamedInputs);
    });

    document.querySelectorAll('[name="highlightVideo"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file && file.size > 100 * 1024 * 1024) {
          input.value = '';
          setMessage('The highlight video must be 100 MB or smaller.', false);
          return;
        }
        state.data.highlightVideo = file || null;
        state.data.highlightFileName = file ? file.name : '';
        saveState();
        render();
      });
    });

    document.querySelectorAll('[data-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.dataset.action;
        setMessage('', false);
        if (action === 'start') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'back') {
          state.step = Math.max(0, state.step - 1);
          updateUrl(state.step);
          saveState();
          render();
        } else if (action === 'continue-details') {
          var detailsError = validateDetails();
          if (detailsError) return setMessage(detailsError, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render();
        } else if (action === 'continue-football') {
          var footballError = validateFootball();
          if (footballError) return setMessage(footballError, false);
          state.step = 3;
          updateUrl(3);
          saveState();
          render();
        } else if (action === 'edit-details' || action === 'change-dob') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'submit') {
          submitRegistration();
        }
      });
    });
  }

  async function loadConfig() {
    root.innerHTML = '<div class="admin-loading">Loading showcase registration…</div>';
    try {
      var response = await fetch(API + '/api/showcase/registrations/config');
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'The showcase event could not be loaded.');
      state.event = payload.event;
      var pathState = queryStep();
      if (pathState === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (pathState === 'ineligible') {
        state.status = 'ineligible';
        state.step = 0;
      } else {
        state.status = '';
        state.step = Number(pathState) || state.step || 0;
      }
      render();
    } catch (error) {
      root.innerHTML = '<section class="support-panel" style="margin:30px"><b>Registration could not load</b><p>' + escapeHtml(error.message) + ' Contact people@stratexanalytics.co.uk if the problem continues.</p></section>';
    }
  }

  restoreState();
  window.addEventListener('popstate', function () {
    var value = queryStep();
    state.status = value === 'complete' || value === 'ineligible' ? value : '';
    state.step = typeof value === 'number' ? value : 0;
    render();
  });
  loadConfig();
}());

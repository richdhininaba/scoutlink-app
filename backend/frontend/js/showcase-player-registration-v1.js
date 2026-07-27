(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_player_registration_v2';
  var MOBILE_BREAKPOINT = 760;
  var HIGHLIGHT_BUCKET = 'showcase-player-highlights';
  var MAX_HIGHLIGHT_SIZE = 100 * 1024 * 1024;
  var ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
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
  var lastMobile = window.matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches;
  var resizeTimer = null;
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

  function serialisableState() {
    return {
      step: state.step,
      status: state.status,
      event: state.event,
      submitting: false,
      data: {
        firstName: state.data.firstName,
        lastName: state.data.lastName,
        dateOfBirth: state.data.dateOfBirth,
        ageOnEventDate: state.data.ageOnEventDate,
        guardianEmail: state.data.guardianEmail,
        guardianPhone: state.data.guardianPhone,
        playerEmail: state.data.playerEmail,
        playerPhone: state.data.playerPhone,
        currentlyPlaysForTeam: state.data.currentlyPlaysForTeam,
        teamType: state.data.teamType,
        teamName: state.data.teamName,
        coachName: state.data.coachName,
        positions: state.data.positions.slice(),
        canPlayGoalkeeper: state.data.canPlayGoalkeeper,
        preferredFoot: state.data.preferredFoot,
        highlightFileName: state.data.highlightFileName,
        travelConfirmed: state.data.travelConfirmed,
        guardianAware: state.data.guardianAware
      },
      result: state.result
    };
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serialisableState()));
    } catch (_) {
      // Registration must continue when browser storage is unavailable.
    }
  }

  function restoreState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !saved.data) return;
      state.step = Number(saved.step) || 0;
      state.status = saved.status || '';
      state.event = saved.event || null;
      state.data = Object.assign(state.data, saved.data);
      state.data.positions = Array.isArray(saved.data.positions) ? saved.data.positions.slice(0, 3) : [];
      state.data.highlightVideo = null;
      state.data.highlightFileName = '';
      state.result = saved.result || null;
    } catch (_) {
      // Ignore invalid saved browser state.
    }
  }

  function queryStep() {
    var params = new URLSearchParams(window.location.search);
    if (window.location.pathname.indexOf('/complete') >= 0) return 'complete';
    if (params.get('status') === 'ineligible') return 'ineligible';
    var step = Number(params.get('step'));
    return [1, 2, 3].indexOf(step) >= 0 ? step : 0;
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
    return state.event && state.event.eventDate ? state.event.eventDate : '2026-09-12';
  }

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    var birth = new Date(dateOfBirth + 'T00:00:00Z');
    var eventDate = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(birth.getTime()) || Number.isNaN(eventDate.getTime())) return null;
    var age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
    var monthDifference = eventDate.getUTCMonth() - birth.getUTCMonth();
    if (monthDifference < 0 || (monthDifference === 0 && eventDate.getUTCDate() < birth.getUTCDate())) age -= 1;
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
    return (hour % 12 || 12) + ':' + match[2] + ' ' + (hour >= 12 ? 'PM' : 'AM');
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
    if (Number.isNaN(eventDate.getTime())) return '13 September 2009 to 12 September 2014';
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
      '<nav><a href="/scoutlink">ScoutLink</a><a href="/about">About</a><a href="/trust">Trust</a><a href="/learning-centre">Learning Centre</a><a href="/contact">Contact</a></nav>' +
      '<a class="header-link" href="/admin">Sign in</a>' +
    '</header>';
  }

  function mobileHeader() {
    return '<header class="mobile-public-header">' +
      '<a class="brand" href="/">Stratex<span>Analytics</span></a>' +
      '<button type="button" data-mobile-menu aria-label="Open menu" aria-expanded="false">☰</button>' +
    '</header>' +
    '<nav class="mobile-menu-panel" data-mobile-menu-panel>' +
      '<a href="/scoutlink">ScoutLink</a><a href="/about">About</a><a href="/trust">Trust</a><a href="/learning-centre">Learning Centre</a><a href="/contact">Contact</a>' +
    '</nav>';
  }

  function campaignPanel(title, subtitle) {
    return '<aside class="campaign-panel">' +
      '<div class="campaign-copy"><span class="free-badge">100% free to attend</span><p class="campaign-kicker">ScoutLink Showcase Event</p><h1>' + escapeHtml(title) + '</h1><p class="campaign-subtitle">' + escapeHtml(subtitle) + '</p></div>' +
      '<section class="event-meta"><div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div><div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div><div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div><div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div></section>' +
      '<div class="venue-panel"><span class="venue-pin">⌖</span><div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' + escapeHtml(eventAddress()) + '</p></div></div>' +
      '<div class="campaign-proof"><span>✓ Free registration</span><span>✓ Live football showcase</span><span>✓ Responsible scout access</span></div>' +
    '</aside>';
  }

  function mobileCampaign(title, subtitle) {
    return '<section class="mobile-campaign-hero">' +
      '<span class="free-badge">100% free to attend</span><p class="campaign-kicker">ScoutLink Showcase Event</p><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(subtitle) + '</p>' +
      '<section class="event-meta mobile"><div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div><div><small>Arrival time</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div><div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div><div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div></section>' +
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
      return '<article class="progress-item ' + className + '"><span>' + (number < step ? '✓' : number) + '</span><div><b>' + item[0] + '</b><small>' + item[1] + '</small></div></article>';
    }).join('') + '</section>';
  }

  function field(label, name, type, value, required, help) {
    return '<label class="field"><span class="field-label">' + escapeHtml(label) + (required ? '<em>Required</em>' : '') + '</span>' +
      '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '" ' + (required ? 'required' : '') + '>' +
      (help ? '<small class="field-help">' + escapeHtml(help) + '</small>' : '') + '</label>';
  }

  function choiceCard(name, value, shortLabel, title, copy, selected) {
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '"><input type="radio" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected ? 'checked' : '') + '><span>' + escapeHtml(shortLabel) + '</span><div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(copy) + '</small></div></label>';
  }

  function landingContent() {
    return '<header class="registration-intro"><span class="section-kicker">Player registration</span><h2>Show us what you can do</h2><p>Register for the free ScoutLink showcase and put your football in front of coaches and scouts watching live.</p></header>' +
      '<section class="journey-preview"><article><span>1</span><div><b>Tell us who you are</b><small>Age and contact details</small></div></article><article><span>2</span><div><b>Tell us about your football</b><small>Team, positions and optional highlights</small></div></article><article><span>3</span><div><b>Confirm you can attend</b><small>Travel and parental awareness where required</small></div></article></section>' +
      '<section class="eligibility-note"><b>Age requirement</b><p>You must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + eventDateLabel() + '. Your date of birth is checked before you can continue.</p></section>' +
      '<div class="primary-cta-block"><button class="btn primary large" type="button" data-action="start">Start player registration</button><small>Takes around 4 minutes. No payment required.</small></div>';
  }

  function detailsContent() {
    return progress(1) +
      '<header class="form-heading"><span class="section-kicker">Step 1</span><h2>Your details</h2><p>We use your date of birth to show the correct contact and consent fields.</p></header>' +
      '<form data-step-form="details" novalidate>' +
        '<div class="two-col">' + field('First name', 'firstName', 'text', state.data.firstName, true) + field('Last name', 'lastName', 'text', state.data.lastName, true) + '</div>' +
        field('Date of birth', 'dateOfBirth', 'date', state.data.dateOfBirth, true, 'You must be aged ' + eventMinAge() + '–' + eventMaxAge() + ' on ' + eventDateLabel() + '.') +
        '<section class="validation-success" data-age-success hidden><span>✓</span><div><b>Eligible to register</b><p data-age-success-copy></p></div></section>' +
        '<section class="conditional-panel" data-contact-guardian hidden><header><span>Parent or guardian contact required</span><p>Because you will be aged 12–14, your parent or guardian must know about the registration.</p></header><div class="two-col">' +
          field('Parent or guardian email', 'guardianEmail', 'email', state.data.guardianEmail, true) + field('Parent or guardian phone number', 'guardianPhone', 'tel', state.data.guardianPhone, true) +
        '</div></section>' +
        '<section class="conditional-panel" data-contact-player hidden><header><span>Your contact details</span><p>Because you will be aged 15–16, you can provide your own email and phone number.</p></header><div class="two-col">' +
          field('Email address', 'playerEmail', 'email', state.data.playerEmail, true) + field('Phone number', 'playerPhone', 'tel', state.data.playerPhone, true) +
        '</div></section>' +
        '<p class="privacy-copy">These details are stored securely and used only for this showcase event, safeguarding and event communication.</p><div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function footballContent() {
    var positions = state.data.positions;
    return progress(2) +
      '<header class="form-heading"><span class="section-kicker">Step 2</span><h2>Your football</h2><p>Tell us where and how you play. You can select up to three positions.</p></header>' +
      '<form data-step-form="football" novalidate>' +
        '<section class="form-section"><span class="section-label">Current team</span>' +
          '<label class="check-row"><input type="checkbox" name="currentlyPlaysForTeam" ' + (state.data.currentlyPlaysForTeam ? 'checked' : '') + '><span><b>I currently play for a team</b><small>This can be a professional academy or a non-professional team.</small></span></label>' +
          '<div data-team-fields ' + (state.data.currentlyPlaysForTeam ? '' : 'hidden') + '>' +
            '<div class="team-type-row"><div class="choice-grid">' +
              choiceCard('teamType', 'non_professional', 'NP', 'Non-professional team', 'Grassroots, school, college or independent academy', state.data.teamType === 'non_professional') +
              choiceCard('teamType', 'professional', 'PRO', 'Professional team', 'Professional club academy or development programme', state.data.teamType === 'professional') +
            '</div></div>' +
            '<div class="two-col">' + field('Academy or team name', 'teamName', 'text', state.data.teamName, true) + field('Coach name', 'coachName', 'text', state.data.coachName, true) + '</div>' +
          '</div>' +
        '</section>' +
        '<section class="form-section"><div class="section-label-row"><span class="section-label">Positions</span><small data-position-count>' + positions.length + ' of 3 selected</small></div>' +
          '<div class="position-grid">' + POSITIONS.map(function (position) { return '<button class="position-button ' + (positions.indexOf(position) >= 0 ? 'selected' : '') + '" type="button" data-position="' + escapeHtml(position) + '">' + escapeHtml(position) + '</button>'; }).join('') + '</div>' +
          '<label class="check-row"><input type="checkbox" name="canPlayGoalkeeper" ' + (state.data.canPlayGoalkeeper ? 'checked' : '') + '><span><b>I can also play goalkeeper</b><small>Select this even if goalkeeper is not one of your three main positions.</small></span></label>' +
        '</section>' +
        '<section class="form-section"><span class="section-label">Preferred foot</span><div class="choice-grid">' +
          choiceCard('preferredFoot', 'left', 'L', 'Left', 'Mainly left foot', state.data.preferredFoot === 'left') +
          choiceCard('preferredFoot', 'right', 'R', 'Right', 'Mainly right foot', state.data.preferredFoot === 'right') +
          choiceCard('preferredFoot', 'both', 'B', 'Both', 'Comfortable with both', state.data.preferredFoot === 'both') +
        '</div></section>' +
        '<section class="form-section"><span class="section-label">Highlight video <small>(Totally fine if you do not have one — leave this empty)</small></span>' +
          '<label class="field"><span class="field-label">Upload your highlights</span><label class="upload-control"><input type="file" name="highlightVideo" accept="video/mp4,video/quicktime,video/webm"><span>Choose a video</span><small>MP4, MOV or WEBM · Maximum 100 MB</small></label><span class="upload-file-name" data-upload-file-name ' + (state.data.highlightFileName ? '' : 'hidden') + '>' + escapeHtml(state.data.highlightFileName) + '</span></label>' +
        '</section>' +
        '<div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function attendanceContent() {
    var young = state.data.ageOnEventDate >= 12 && state.data.ageOnEventDate <= 14;
    return progress(3) +
      '<header class="form-heading"><span class="section-kicker">Final step</span><h2>Confirm you can attend</h2><p>Please only submit if the travel and time work for you.</p></header>' +
      '<form data-step-form="attendance" novalidate>' +
        '<section class="attendance-card"><div class="date-block"><b>12</b><span>SEP</span></div><div><small>Player arrival</small><h3>' + escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(playerArrivalLabel()) + '</h3><p>' + escapeHtml(eventAddress()) + '</p></div></section>' +
        '<section class="confirmation-list"><label class="check-row"><input type="checkbox" name="travelConfirmed" ' + (state.data.travelConfirmed ? 'checked' : '') + '><span><b>I am sure I can travel to Ballerz Air Dome for ' + escapeHtml(playerArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Check the full address and travel time before confirming.</small></span></label>' +
          (young ? '<label class="check-row"><input type="checkbox" name="guardianAware" ' + (state.data.guardianAware ? 'checked' : '') + '><span><b>My parent or guardian knows I am registering and is aware of the event details.</b><small>Required because you will be aged 12–14 on the event date.</small></span></label>' : '') +
        '</section>' +
        '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit-details">Edit</button></header><dl>' +
          '<div><dt>Player</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + ' · Age ' + escapeHtml(state.data.ageOnEventDate) + '</dd></div>' +
          '<div><dt>Team</dt><dd>' + escapeHtml(state.data.teamName || 'No team provided') + '</dd></div>' +
          '<div><dt>Positions</dt><dd>' + escapeHtml(state.data.positions.join(', ')) + '</dd></div>' +
          '<div><dt>Contact</dt><dd>' + (young ? 'Parent or guardian contact supplied' : 'Player contact supplied') + '</dd></div>' +
        '</dl></section>' +
        '<p class="privacy-copy">Submitting stores this registration securely and makes it available only to authorised Stratex Admin users. The registration will be reviewed before any player is chosen.</p><div class="form-message" data-form-message hidden></div>' +
      '</form>';
  }

  function ineligibleContent() {
    return '<header class="registration-intro"><span class="section-kicker danger">Age check</span><h2>You are not eligible for this event</h2><p>Players must be aged ' + eventMinAge() + ' to ' + eventMaxAge() + ' on ' + escapeHtml(eventDateLabel()) + '.</p></header>' +
      '<section class="eligibility-range"><small>Eligible date-of-birth range</small><b>' + escapeHtml(eligibleDateRangeLabel()) + '</b></section>' +
      '<section class="support-panel"><b>Think the date was entered incorrectly?</b><p>Go back and check it before leaving the registration.</p></section>' +
      '<button class="btn primary large" type="button" data-action="change-dob">Change date of birth</button><a class="text-link" href="/showcase-event/player-registration">Return to the showcase page</a>';
  }

  function successContent() {
    var result = state.result || {};
    var player = result.player || {};
    return '<section class="success-mark">✓</section>' +
      '<header class="registration-intro centred"><span class="section-kicker">Registration received</span><h2>Your football profile will now be reviewed</h2><p>You will receive an email and a phone call confirming whether you have been successfully chosen for the showcase.</p></header>' +
      (result.videoWarning ? '<section class="support-panel" style="border-left-color:#d79b16;background:#fff9e9"><b>Registration saved, but the optional video did not finish uploading</b><p>' + escapeHtml(result.videoWarning) + ' Your registration is still complete and will be reviewed.</p></section>' : '') +
      '<section class="ticket-panel"><div><small>Player</small><b>' + escapeHtml((player.firstName || state.data.firstName) + ' ' + (player.lastName || state.data.lastName)) + '</b></div><div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div><div><small>Event</small><b>ScoutLink Showcase Event</b></div><div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div></section>' +
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

  function render(options) {
    options = options || {};
    var titlePair = titles();
    var content = currentContent();
    var desktopFooter = actionFooter();
    root.innerHTML =
      '<section class="showcase-desktop-only public-page desktop">' + publicHeader() + '<main class="public-main">' + campaignPanel(titlePair[0], titlePair[1]) + '<section class="registration-panel ' + ((state.step === 0 || state.status) ? 'compact' : '') + '">' + content + (desktopFooter ? '<footer class="form-actions">' + desktopFooter + '</footer>' : '') + '</section></main>' + publicFooter() + '</section>' +
      '<section class="showcase-mobile-only public-page mobile">' + mobileHeader() + '<main class="mobile-public-main">' + mobileCampaign(titlePair[0], state.step ? 'Step ' + state.step + ' of 3' : titlePair[1]) + '<section class="mobile-registration-content">' + content + '</section></main>' +
        (state.step === 0 && !state.status ? '<footer class="mobile-sticky-actions"><button class="btn primary" type="button" data-action="start">Start registration</button></footer>' : desktopFooter ? '<footer class="mobile-sticky-actions">' + desktopFooter + '</footer>' : '') +
      '</section>';
    bindEvents();
    syncConditionalUi();
    if (options.top) scrollCurrentContainerToTop();
  }

  function activePage() {
    var selector = window.matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches ? '.showcase-mobile-only' : '.showcase-desktop-only';
    return root.querySelector(selector) || root;
  }

  function activeForm() {
    var page = activePage();
    return page.querySelector('form') || page;
  }

  function scrollCurrentContainerToTop() {
    var page = activePage();
    var scroller = page.querySelector('.mobile-public-main') || page.querySelector('.registration-panel');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setMessage(message, success) {
    var page = activePage();
    var node = page.querySelector('[data-form-message]');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
    node.classList.toggle('success', !!success);
    if (message) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function collectActiveInputs() {
    var scope = activeForm();
    scope.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'file') return;
      if (input.type === 'checkbox') {
        state.data[input.name] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) state.data[input.name] = input.value;
      } else {
        state.data[input.name] = input.value;
      }
    });
    state.data.ageOnEventDate = state.data.dateOfBirth ? calculateAge(state.data.dateOfBirth) : null;
    saveState();
  }

  function syncConditionalUi() {
    var age = state.data.ageOnEventDate;
    var eligible = age !== null && age >= eventMinAge() && age <= eventMaxAge();
    root.querySelectorAll('[data-age-success]').forEach(function (node) {
      node.hidden = !eligible;
      var copy = node.querySelector('[data-age-success-copy]');
      if (copy) copy.textContent = eligible ? 'You will be ' + age + ' on the event date.' : '';
    });
    root.querySelectorAll('[data-contact-guardian]').forEach(function (node) {
      node.hidden = !(eligible && age <= 14);
    });
    root.querySelectorAll('[data-contact-player]').forEach(function (node) {
      node.hidden = !(eligible && age >= 15);
    });
    root.querySelectorAll('[data-team-fields]').forEach(function (node) {
      node.hidden = !state.data.currentlyPlaysForTeam;
    });
  }

  function syncChoice(name) {
    var page = activePage();
    page.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function (input) {
      var card = input.closest('.choice-card');
      if (card) card.classList.toggle('selected', input.checked);
    });
  }

  function syncPositions() {
    var page = activePage();
    page.querySelectorAll('[data-position]').forEach(function (button) {
      button.classList.toggle('selected', state.data.positions.indexOf(button.getAttribute('data-position')) >= 0);
    });
    var count = page.querySelector('[data-position-count]');
    if (count) count.textContent = state.data.positions.length + ' of 3 selected';
  }

  function syncUploadName() {
    var page = activePage();
    var node = page.querySelector('[data-upload-file-name]');
    if (!node) return;
    node.hidden = !state.data.highlightFileName;
    node.textContent = state.data.highlightFileName || '';
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validateDetails() {
    collectActiveInputs();
    if (!String(state.data.firstName || '').trim() || !String(state.data.lastName || '').trim() || !state.data.dateOfBirth) {
      return 'Complete the first name, last name and date of birth.';
    }
    var age = state.data.ageOnEventDate;
    if (age === null || age < eventMinAge() || age > eventMaxAge()) {
      state.status = 'ineligible';
      state.step = 0;
      updateUrl('ineligible');
      saveState();
      render({ top: true });
      return '';
    }
    if (age <= 14) {
      if (!validateEmail(state.data.guardianEmail) || !String(state.data.guardianPhone || '').trim()) return 'Enter a valid parent or guardian email and phone number.';
    } else if (!validateEmail(state.data.playerEmail) || !String(state.data.playerPhone || '').trim()) {
      return 'Enter a valid player email and phone number.';
    }
    return '';
  }

  function validateFootball() {
    collectActiveInputs();
    if (state.data.currentlyPlaysForTeam && (!state.data.teamType || !String(state.data.teamName || '').trim() || !String(state.data.coachName || '').trim())) {
      return 'Complete the team type, academy or team name and coach name.';
    }
    if (!state.data.positions.length) return 'Choose at least one position.';
    if (state.data.positions.length > 3) return 'Choose no more than three positions.';
    if (!state.data.preferredFoot) return 'Choose Left, Right or Both as the preferred foot.';
    return '';
  }

  function validateAttendance() {
    collectActiveInputs();
    if (!state.data.travelConfirmed) return 'Confirm that you can travel to the event for ' + playerArrivalLabel() + '.';
    if (state.data.ageOnEventDate <= 14 && !state.data.guardianAware) return 'Confirm that the parent or guardian is aware of the event.';
    return '';
  }

  async function fetchJson(url, options, fallbackMessage) {
    var response;
    try {
      response = await fetch(url, options || {});
    } catch (_) {
      throw new Error(fallbackMessage || 'The registration service could not be reached. Check your connection and try again.');
    }
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || payload.message || fallbackMessage || 'The request could not be completed.');
    return payload;
  }

  function registrationPayload() {
    return {
      firstName: String(state.data.firstName || '').trim(),
      lastName: String(state.data.lastName || '').trim(),
      dateOfBirth: state.data.dateOfBirth,
      guardianEmail: String(state.data.guardianEmail || '').trim(),
      guardianPhone: String(state.data.guardianPhone || '').trim(),
      playerEmail: String(state.data.playerEmail || '').trim(),
      playerPhone: String(state.data.playerPhone || '').trim(),
      currentlyPlaysForTeam: !!state.data.currentlyPlaysForTeam,
      teamType: state.data.currentlyPlaysForTeam ? state.data.teamType : '',
      teamName: state.data.currentlyPlaysForTeam ? String(state.data.teamName || '').trim() : '',
      coachName: state.data.currentlyPlaysForTeam ? String(state.data.coachName || '').trim() : '',
      positions: state.data.positions.slice(),
      canPlayGoalkeeper: !!state.data.canPlayGoalkeeper,
      preferredFoot: state.data.preferredFoot,
      travelConfirmed: !!state.data.travelConfirmed,
      guardianAware: !!state.data.guardianAware
    };
  }

  function publicSupabaseConfig() {
    var config = window.SL_CONFIG || {};
    return {
      url: String(config.SUPABASE_URL || '').replace(/\/$/, ''),
      key: String(config.SUPABASE_ANON_KEY || '')
    };
  }

  function fileExtension(file) {
    var byType = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm'
    };
    return byType[file.type] || String(file.name || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  }

  function randomToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID().replace(/-/g, '');
    return String(Date.now()) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }

  async function uploadHighlight(registrationReference, file) {
    if (!file) return null;
    var config = publicSupabaseConfig();
    if (!config.url || !config.key) throw new Error('The optional video upload service is not configured.');
    if (ALLOWED_VIDEO_TYPES.indexOf(file.type) < 0) throw new Error('The optional video must be MP4, MOV or WEBM.');
    if (file.size > MAX_HIGHLIGHT_SIZE) throw new Error('The optional video must be 100 MB or smaller.');

    var folder = String(registrationReference || '').toLowerCase();
    var path = folder + '/' + randomToken().slice(0, 32) + '.' + fileExtension(file);
    var encodedPath = path.split('/').map(encodeURIComponent).join('/');
    var uploadUrl = config.url + '/storage/v1/object/' + HIGHLIGHT_BUCKET + '/' + encodedPath;
    var uploadResponse;
    try {
      uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: config.key,
          Authorization: 'Bearer ' + config.key,
          'Content-Type': file.type,
          'x-upsert': 'false'
        },
        body: file
      });
    } catch (_) {
      throw new Error('The registration was saved, but the optional video upload lost its connection.');
    }
    if (!uploadResponse.ok) {
      var uploadPayload = await uploadResponse.json().catch(function () { return {}; });
      throw new Error(uploadPayload.message || uploadPayload.error || 'The registration was saved, but the optional video could not be uploaded.');
    }

    await fetchJson(config.url + '/rest/v1/rpc/attach_showcase_player_highlight', {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: 'Bearer ' + config.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_registration_reference: registrationReference,
        p_storage_path: path,
        p_file_name: file.name,
        p_mime_type: file.type,
        p_size_bytes: file.size
      })
    }, 'The registration was saved, but the optional video could not be linked to it.');

    return path;
  }

  async function submitRegistration() {
    var detailError = validateDetails();
    if (state.status === 'ineligible') return;
    if (detailError) {
      state.step = 1;
      updateUrl(1);
      render({ top: true });
      setMessage(detailError, false);
      return;
    }
    var footballError = validateFootball();
    if (footballError) {
      state.step = 2;
      updateUrl(2);
      render({ top: true });
      setMessage(footballError, false);
      return;
    }
    var attendanceError = validateAttendance();
    if (attendanceError) {
      setMessage(attendanceError, false);
      return;
    }

    var selectedVideo = state.data.highlightVideo;
    state.submitting = true;
    render();
    try {
      var payload = await fetchJson(API + '/api/showcase/registrations/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload())
      }, 'The registration service could not be reached. Check your connection and try again.');

      var videoWarning = '';
      if (selectedVideo) {
        try {
          await uploadHighlight(payload.registrationReference, selectedVideo);
        } catch (videoError) {
          videoWarning = videoError.message || 'The optional video could not be uploaded.';
        }
      }

      payload.videoWarning = videoWarning;
      state.result = payload;
      state.status = 'complete';
      state.step = 0;
      state.submitting = false;
      saveState();
      updateUrl('complete');
      render({ top: true });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'The player registration could not be submitted. Please try again.', false);
    }
  }

  function bindEvents() {
    root.querySelectorAll('[data-mobile-menu]').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = button.closest('.public-page').querySelector('[data-mobile-menu-panel]');
        var open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    var page = activePage();

    page.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', collectActiveInputs);
      input.addEventListener('change', collectActiveInputs);
    });

    page.querySelectorAll('[name="dateOfBirth"]').forEach(function (input) {
      input.addEventListener('input', function () {
        collectActiveInputs();
        syncConditionalUi();
      });
      input.addEventListener('change', function () {
        collectActiveInputs();
        syncConditionalUi();
      });
    });

    page.querySelectorAll('[name="currentlyPlaysForTeam"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectActiveInputs();
        if (!state.data.currentlyPlaysForTeam) {
          state.data.teamType = '';
          state.data.teamName = '';
          state.data.coachName = '';
        }
        syncConditionalUi();
        saveState();
      });
    });

    page.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectActiveInputs();
        syncChoice(input.name);
      });
    });

    page.querySelectorAll('input[type="checkbox"]:not([name="currentlyPlaysForTeam"])').forEach(function (input) {
      input.addEventListener('change', collectActiveInputs);
    });

    page.querySelectorAll('[data-position]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = button.getAttribute('data-position');
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
        setMessage('', false);
        syncPositions();
      });
    });

    page.querySelectorAll('[name="highlightVideo"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file && ALLOWED_VIDEO_TYPES.indexOf(file.type) < 0) {
          input.value = '';
          state.data.highlightVideo = null;
          state.data.highlightFileName = '';
          syncUploadName();
          setMessage('Choose an MP4, MOV or WEBM video.', false);
          return;
        }
        if (file && file.size > MAX_HIGHLIGHT_SIZE) {
          input.value = '';
          state.data.highlightVideo = null;
          state.data.highlightFileName = '';
          syncUploadName();
          setMessage('The highlight video must be 100 MB or smaller.', false);
          return;
        }
        state.data.highlightVideo = file || null;
        state.data.highlightFileName = file ? file.name : '';
        saveState();
        setMessage('', false);
        syncUploadName();
      });
    });

    root.querySelectorAll('[data-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.getAttribute('data-action');
        setMessage('', false);
        if (action === 'start') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render({ top: true });
        } else if (action === 'back') {
          collectActiveInputs();
          state.step = Math.max(0, state.step - 1);
          updateUrl(state.step);
          saveState();
          render({ top: true });
        } else if (action === 'continue-details') {
          var detailsError = validateDetails();
          if (state.status === 'ineligible') return;
          if (detailsError) return setMessage(detailsError, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render({ top: true });
        } else if (action === 'continue-football') {
          var footballError = validateFootball();
          if (footballError) return setMessage(footballError, false);
          state.step = 3;
          updateUrl(3);
          saveState();
          render({ top: true });
        } else if (action === 'edit-details' || action === 'change-dob') {
          state.status = '';
          state.step = 1;
          updateUrl(1);
          saveState();
          render({ top: true });
        } else if (action === 'submit') {
          submitRegistration();
        }
      });
    });
  }

  async function loadConfig() {
    root.innerHTML = '<div class="admin-loading">Loading showcase registration…</div>';
    try {
      var payload = await fetchJson(API + '/api/showcase/registrations/config', {}, 'The showcase event could not be loaded.');
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
      saveState();
      render();
    } catch (error) {
      root.innerHTML = '<section class="support-panel" style="margin:30px"><b>Registration could not load</b><p>' + escapeHtml(error.message || 'The showcase event could not be loaded.') + ' Contact people@stratexanalytics.co.uk if the problem continues.</p></section>';
    }
  }

  restoreState();

  window.addEventListener('popstate', function () {
    var value = queryStep();
    state.status = value === 'complete' || value === 'ineligible' ? value : '';
    state.step = typeof value === 'number' ? value : 0;
    render({ top: true });
  });

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var mobile = window.matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches;
      if (mobile !== lastMobile) {
        collectActiveInputs();
        lastMobile = mobile;
        render();
      }
    }, 180);
  });

  loadConfig();
}());

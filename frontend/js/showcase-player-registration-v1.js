(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_player_registration_v3';
  var HIGHLIGHT_BUCKET = 'showcase-player-highlights';
  var MAX_HIGHLIGHT_SIZE = 500 * 1024 * 1024;
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

  function publicSupabaseConfig() {
    var config = window.SL_CONFIG || {};
    return {
      url: String(config.SUPABASE_URL || '').replace(/\/$/, ''),
      key: String(config.SUPABASE_ANON_KEY || '')
    };
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
      // Registration remains usable if browser storage is unavailable.
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
      // Ignore invalid browser state.
    }
  }

  function routeState() {
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
    } else if (value === 'ineligible') {
      history.pushState({}, '', base + '?status=ineligible');
    } else {
      history.pushState({}, '', value ? base + '?step=' + value : base);
    }
  }

  function eventDateValue() {
    return state.event && state.event.eventDate ? state.event.eventDate : '2026-09-12';
  }

  function eventDateObject() {
    return new Date(eventDateValue() + 'T12:00:00Z');
  }

  function eventDateLabel() {
    var date = eventDateObject();
    if (Number.isNaN(date.getTime())) return 'Saturday 12 September 2026';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function eventDateShort() {
    var date = eventDateObject();
    if (Number.isNaN(date.getTime())) return '12 Sep 2026';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function eventDay() {
    var date = eventDateObject();
    return Number.isNaN(date.getTime()) ? '12' : String(date.getUTCDate());
  }

  function eventMonth() {
    var date = eventDateObject();
    return Number.isNaN(date.getTime())
      ? 'SEP'
      : date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
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

  function eventVenue() {
    return state.event && state.event.venueName
      ? state.event.venueName
      : 'Ballerz Air Dome, Bluewater';
  }

  function eventAddress() {
    return state.event && state.event.venueAddress
      ? state.event.venueAddress
      : 'Ballerz Air Dome, Bluewater Event Space, Upper Blue Car Park, Upper Plaza, Bluewater, Greenhithe, Kent, DA9 9RL';
  }

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    var birth = new Date(dateOfBirth + 'T00:00:00Z');
    var eventDate = eventDateObject();
    if (Number.isNaN(birth.getTime()) || Number.isNaN(eventDate.getTime())) return null;
    var age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
    var monthDifference = eventDate.getUTCMonth() - birth.getUTCMonth();
    if (monthDifference < 0 || (monthDifference === 0 && eventDate.getUTCDate() < birth.getUTCDate())) age -= 1;
    return age;
  }

  function eligibleDateRangeLabel() {
    var eventDate = eventDateObject();
    if (Number.isNaN(eventDate.getTime())) return '13 September 2009 to 12 September 2014';
    var oldest = new Date(eventDate);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - eventMaxAge() - 1);
    oldest.setUTCDate(oldest.getUTCDate() + 1);
    var youngest = new Date(eventDate);
    youngest.setUTCFullYear(youngest.getUTCFullYear() - eventMinAge());
    var options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
    return oldest.toLocaleDateString('en-GB', options) + ' to ' + youngest.toLocaleDateString('en-GB', options);
  }

  function header() {
    return '<header class="showcase-header"><div class="showcase-shell showcase-header-inner">' +
      '<a class="showcase-brand" href="/">Stratex<span>Analytics</span></a>' +
      '<a class="showcase-help" href="/contact">Need help?</a>' +
    '</div></header>';
  }

  function footer() {
    return '<footer class="showcase-footer"><div class="showcase-shell showcase-footer-inner">' +
      '<span>© 2026 Stratex Analytics Limited</span>' +
      '<nav aria-label="Footer"><a href="/privacy-policy">Privacy</a><a href="/trust">Trust</a><a href="/contact">Contact</a></nav>' +
    '</div></footer>';
  }

  function sideCopy() {
    if (state.status === 'ineligible') {
      return ['Player age check', 'This showcase is for players aged 12–16.'];
    }
    if (state.status === 'complete') {
      return ['Your opportunity starts here.', 'Registration completed free of charge.'];
    }
    if (state.step === 2) {
      return ['Show us your football.', 'Give coaches and scouts the football context they need before the event.'];
    }
    if (state.step === 3) {
      return ['One final check.', 'Make sure the venue, date and arrival time work before submitting.'];
    }
    return ['This could be your chance to go pro.', 'One free showcase. Live football. Coaches and scouts watching from the touchline.'];
  }

  function sidePanel() {
    var copy = sideCopy();
    return '<aside class="showcase-side">' +
      '<div><span class="free-badge">100% free to attend</span><p class="showcase-eyebrow">ScoutLink Showcase Event</p>' +
      '<h1>' + escapeHtml(copy[0]) + '</h1><p class="showcase-side-copy">' + escapeHtml(copy[1]) + '</p></div>' +
      '<div class="event-meta">' +
        '<div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div>' +
        '<div><small>Arrival</small><b>' + escapeHtml(playerArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</b></div>' +
      '</div>' +
      '<div class="venue-card"><span class="venue-icon" aria-hidden="true">⌖</span><div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' + escapeHtml(eventAddress()) + '</p></div></div>' +
      '<div class="proof-row"><span>✓ Free registration</span><span>✓ Live football</span><span>✓ Responsible access</span></div>' +
    '</aside>';
  }

  function mobileMeta() {
    return '<section class="mobile-event-meta" aria-label="Event details">' +
      '<div><b>' + escapeHtml(eventDateShort()) + '</b><span>' + escapeHtml(playerArrivalLabel()) + ' arrival</span></div>' +
      '<div><b>' + escapeHtml(eventVenue()) + '</b><span>Bluewater, Kent</span></div>' +
      '<div><b>Free</b><span>Players aged ' + eventMinAge() + '–' + eventMaxAge() + '</span></div>' +
    '</section>';
  }

  function progress(step) {
    var labels = [
      ['Your details', 'Step 1 of 3'],
      ['Football information', 'Step 2 of 3'],
      ['Attendance', 'Step 3 of 3']
    ];
    return '<section class="progress-bar" aria-label="Registration progress">' + labels.map(function (item, index) {
      var number = index + 1;
      var className = number < step ? 'complete' : number === step ? 'active' : '';
      return '<article class="progress-item ' + className + '"><span>' + (number < step ? '✓' : number) +
        '</span><div><b>' + item[0] + '</b><small>' + item[1] + '</small></div></article>';
    }).join('') + '</section>';
  }

  function field(label, name, type, value, required, help, autocomplete) {
    return '<label class="field"><span class="field-label">' + escapeHtml(label) +
      (required ? '<em>Required</em>' : '') + '</span><input name="' + escapeHtml(name) +
      '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') +
      '" ' + (required ? 'required ' : '') + (autocomplete ? 'autocomplete="' + escapeHtml(autocomplete) + '" ' : '') +
      '><small class="field-help" ' + (help ? '' : 'hidden') + '>' + escapeHtml(help || '') + '</small></label>';
  }

  function choiceCard(name, value, shortLabel, title, copy, selected) {
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '"><input type="radio" name="' +
      escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected ? 'checked' : '') +
      '><span>' + escapeHtml(shortLabel) + '</span><div><b>' + escapeHtml(title) +
      '</b><small>' + escapeHtml(copy) + '</small></div></label>';
  }

  function landingContent() {
    return '<header class="registration-intro"><span>Player registration</span><h2>Show us what you can do</h2>' +
      '<p>Register for the free ScoutLink showcase and put your football in front of coaches and scouts watching live.</p></header>' +
      '<section class="journey-list">' +
        '<article><span>1</span><div><b>Tell us who you are</b><small>Age and the right contact details</small></div></article>' +
        '<article><span>2</span><div><b>Tell us about your football</b><small>Team, positions and optional highlights</small></div></article>' +
        '<article><span>3</span><div><b>Confirm you can attend</b><small>Travel and parent or guardian awareness where required</small></div></article>' +
      '</section>' +
      '<section class="notice"><b>Age requirement</b><p>You must be aged ' + eventMinAge() + ' to ' + eventMaxAge() +
      ' on ' + escapeHtml(eventDateLabel()) + '. Your date of birth is checked before you can continue.</p></section>' +
      '<div class="primary-cta-block"><button class="btn" type="button" data-action="start">Start player registration</button>' +
      '<small>Takes around 4 minutes. No payment required.</small></div>';
  }

  function detailsContent() {
    return progress(1) +
      '<header class="form-heading"><span>Step 1</span><h2>Your details</h2><p>Your date of birth decides which contact and consent fields are shown.</p></header>' +
      '<form class="registration-form" data-step-form="details" novalidate>' +
        '<div class="two-col">' +
          field('First name', 'firstName', 'text', state.data.firstName, true, '', 'given-name') +
          field('Last name', 'lastName', 'text', state.data.lastName, true, '', 'family-name') +
        '</div>' +
        field('Date of birth', 'dateOfBirth', 'date', state.data.dateOfBirth, true,
          'You must be aged ' + eventMinAge() + '–' + eventMaxAge() + ' on the event date.', 'bday') +
        '<section class="validation-success" data-age-success hidden><span>✓</span><div><b>Eligible to register</b><p data-age-success-copy></p></div></section>' +
        '<section class="conditional-panel" data-contact-guardian hidden><header><span>Parent or guardian contact required</span>' +
          '<p>Because the player will be aged 12–14, their parent or guardian must know about the registration.</p></header>' +
          '<div class="two-col">' +
            field('Parent or guardian email', 'guardianEmail', 'email', state.data.guardianEmail, true, '', 'email') +
            field('Parent or guardian phone number', 'guardianPhone', 'tel', state.data.guardianPhone, true, '', 'tel') +
          '</div></section>' +
        '<section class="conditional-panel" data-contact-player hidden><header><span>Your contact details</span>' +
          '<p>Because the player will be aged 15–16, they can provide their own email and phone number.</p></header>' +
          '<div class="two-col">' +
            field('Email address', 'playerEmail', 'email', state.data.playerEmail, true, '', 'email') +
            field('Phone number', 'playerPhone', 'tel', state.data.playerPhone, true, '', 'tel') +
          '</div></section>' +
        '<p class="privacy-copy">These details are stored securely and used only for this showcase event, safeguarding and event communication.</p>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function footballContent() {
    var positions = state.data.positions;
    return progress(2) +
      '<header class="form-heading"><span>Step 2</span><h2>Your football</h2><p>Tell us where and how you play. You can select up to three positions.</p></header>' +
      '<form class="registration-form" data-step-form="football" novalidate>' +
        '<section class="form-section"><span class="section-label">Current team</span>' +
          '<label class="check-row strong"><input type="checkbox" name="currentlyPlaysForTeam" ' +
            (state.data.currentlyPlaysForTeam ? 'checked' : '') +
            '><span><b>I currently play for a team</b><small>This can be a professional academy or a non-professional team.</small></span></label>' +
          '<div data-team-fields ' + (state.data.currentlyPlaysForTeam ? '' : 'hidden') + '>' +
            '<div class="choice-grid two">' +
              choiceCard('teamType', 'non_professional', 'NP', 'Non-professional team',
                'Grassroots, school, college or independent academy', state.data.teamType === 'non_professional') +
              choiceCard('teamType', 'professional', 'PRO', 'Professional team',
                'Professional club academy or development programme', state.data.teamType === 'professional') +
            '</div>' +
            '<div class="two-col">' +
              field('Academy or team name', 'teamName', 'text', state.data.teamName, true, '', 'organization') +
              field('Coach name', 'coachName', 'text', state.data.coachName, true, '', 'name') +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="form-section"><div class="section-label-row"><span class="section-label">Positions</span>' +
          '<small data-position-count>' + positions.length + ' of 3 selected</small></div>' +
          '<div class="position-grid">' + POSITIONS.map(function (position) {
            return '<button class="position-button ' + (positions.indexOf(position) >= 0 ? 'selected' : '') +
              '" type="button" data-position="' + escapeHtml(position) + '" aria-pressed="' +
              (positions.indexOf(position) >= 0 ? 'true' : 'false') + '">' + escapeHtml(position) + '</button>';
          }).join('') + '</div>' +
          '<label class="check-row"><input type="checkbox" name="canPlayGoalkeeper" ' +
            (state.data.canPlayGoalkeeper ? 'checked' : '') +
            '><span><b>I can also play goalkeeper</b><small>Select this even if goalkeeper is not one of your three main positions.</small></span></label>' +
        '</section>' +
        '<section class="form-section"><span class="section-label">Preferred foot</span><div class="choice-grid">' +
          choiceCard('preferredFoot', 'left', 'L', 'Left', 'Mainly left foot', state.data.preferredFoot === 'left') +
          choiceCard('preferredFoot', 'right', 'R', 'Right', 'Mainly right foot', state.data.preferredFoot === 'right') +
          choiceCard('preferredFoot', 'both', 'B', 'Both', 'Comfortable with both', state.data.preferredFoot === 'both') +
        '</div></section>' +
        '<section class="form-section"><span class="section-label">Highlight video</span>' +
          '<div class="upload-control"><div class="upload-copy"><b>Upload your highlights</b>' +
            '<small>Optional · MP4, MOV or WEBM · Maximum 500 MB</small></div>' +
            '<label class="btn secondary file-input-button">Choose a video<input type="file" name="highlightVideo" accept="video/mp4,video/quicktime,video/webm"></label>' +
          '</div><span class="upload-file-name" data-upload-file-name ' +
            (state.data.highlightFileName ? '' : 'hidden') + '>' + escapeHtml(state.data.highlightFileName) + '</span>' +
        '</section>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function attendanceContent() {
    var young = state.data.ageOnEventDate >= 12 && state.data.ageOnEventDate <= 14;
    return progress(3) +
      '<header class="form-heading"><span>Final step</span><h2>Confirm you can attend</h2><p>Please only submit if the travel and time work for you.</p></header>' +
      '<form class="registration-form" data-step-form="attendance" novalidate>' +
        '<section class="attendance-card"><div class="date-block"><b>' + escapeHtml(eventDay()) + '</b><span>' +
          escapeHtml(eventMonth()) + '</span></div><div><small>Player arrival</small><h3>' +
          escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(playerArrivalLabel()) + '</h3><p>' +
          escapeHtml(eventAddress()) + '</p></div></section>' +
        '<label class="check-row strong"><input type="checkbox" name="travelConfirmed" ' +
          (state.data.travelConfirmed ? 'checked' : '') +
          '><span><b>I am sure I can travel to Ballerz Air Dome for ' + escapeHtml(playerArrivalLabel()) +
          ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Check the full address and travel time before confirming.</small></span></label>' +
        (young ? '<label class="check-row strong"><input type="checkbox" name="guardianAware" ' +
          (state.data.guardianAware ? 'checked' : '') +
          '><span><b>My parent or guardian knows I am registering and is aware of the event details.</b>' +
          '<small>Required because the player will be aged 12–14 on the event date.</small></span></label>' : '') +
        '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit-details">Edit</button></header><dl>' +
          '<div><dt>Player</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) +
          ' · Age ' + escapeHtml(state.data.ageOnEventDate) + '</dd></div>' +
          '<div><dt>Team</dt><dd>' + escapeHtml(state.data.teamName || 'No team provided') + '</dd></div>' +
          '<div><dt>Positions</dt><dd>' + escapeHtml(state.data.positions.join(', ')) + '</dd></div>' +
          '<div><dt>Contact</dt><dd>' + (young ? 'Parent or guardian contact supplied' : 'Player contact supplied') + '</dd></div>' +
        '</dl></section>' +
        '<p class="privacy-copy">Submitting stores this registration securely and makes it available only to authorised Stratex Admin users. The registration will be reviewed before any player is chosen.</p>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function ineligibleContent() {
    return '<main class="state-wrap"><section class="state-card">' +
      '<div class="state-icon danger">!</div><span>Age check</span>' +
      '<h1>This showcase is for players aged ' + eventMinAge() + '–' + eventMaxAge() + '.</h1>' +
      '<p>The date of birth entered does not meet the age requirement for ' + escapeHtml(eventDateLabel()) + '.</p>' +
      '<div class="eligible-range"><small>Eligible date-of-birth range</small><b>' +
        escapeHtml(eligibleDateRangeLabel()) + '</b></div>' +
      '<div class="notice"><b>Think the date was entered incorrectly?</b><p>Go back and check it before leaving the registration.</p></div>' +
      '<div class="state-actions"><button class="btn" type="button" data-action="change-dob">Change date of birth</button>' +
        '<a class="btn secondary" href="/showcase-event">Return to event page</a></div>' +
    '</section></main>';
  }

  function successContent() {
    var result = state.result || {};
    var player = result.player || {};
    var fullName = (player.firstName || state.data.firstName) + ' ' + (player.lastName || state.data.lastName);
    return '<main class="state-wrap"><section class="state-card">' +
      '<div class="state-icon">✓</div><span>Registration received</span>' +
      '<h1>Your football profile will now be reviewed.</h1>' +
      '<p>You will receive an email and a phone call confirming whether you have been successfully chosen for the showcase.</p>' +
      (result.videoWarning ? '<div class="notice warning"><b>Registration saved, but the optional video did not finish uploading</b><p>' +
        escapeHtml(result.videoWarning) + ' Your registration is still complete and will be reviewed.</p></div>' : '') +
      '<div class="ticket-panel">' +
        '<div><small>Player</small><b>' + escapeHtml(fullName.trim()) + '</b></div>' +
        '<div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div>' +
        '<div><small>Event</small><b>ScoutLink Showcase Event</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
      '</div>' +
      '<div class="next-steps"><span>What happens next</span><ol>' +
        '<li>Check the confirmation email sent to the contact supplied.</li>' +
        '<li>Stratex will review the football profile and registration.</li>' +
        '<li>Successful players will receive an email and a phone call.</li>' +
      '</ol></div>' +
      '<div class="state-actions"><a class="btn" href="/">Return to Stratex Analytics</a></div>' +
      '<span class="support-copy">Questions: people@stratexanalytics.co.uk</span>' +
    '</section></main>';
  }

  function actionFooter() {
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) return '<footer class="form-actions">' + back +
      '<button class="btn" type="button" data-action="continue-details">Continue to football info</button></footer>';
    if (state.step === 2) return '<footer class="form-actions">' + back +
      '<button class="btn" type="button" data-action="continue-football">Continue to attendance</button></footer>';
    return '<footer class="form-actions">' + back +
      '<button class="btn" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' +
      (state.submitting ? 'Submitting…' : 'Submit free registration') + '</button></footer>';
  }

  function standardContent() {
    var content = state.step === 1
      ? detailsContent()
      : state.step === 2
        ? footballContent()
        : state.step === 3
          ? attendanceContent()
          : landingContent();
    return '<main class="showcase-shell showcase-layout">' + sidePanel() + mobileMeta() +
      '<section class="showcase-panel ' + (state.step === 0 ? 'compact' : '') + '">' +
      content + actionFooter() + '</section></main>';
  }

  function render(options) {
    options = options || {};
    root.innerHTML = '<section class="showcase-page">' + header() +
      (state.status === 'ineligible' ? ineligibleContent() :
        state.status === 'complete' ? successContent() : standardContent()) +
      footer() + '</section>';
    bindEvents();
    syncConditionalUi();
    if (options.top) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function activeForm() {
    return root.querySelector('form') || root;
  }

  function collectInputs() {
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
      if (copy) copy.textContent = eligible ? 'The player will be ' + age + ' on the event date.' : '';
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
    root.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function (input) {
      var card = input.closest('.choice-card');
      if (card) card.classList.toggle('selected', input.checked);
    });
  }

  function syncPositions() {
    root.querySelectorAll('[data-position]').forEach(function (button) {
      var selected = state.data.positions.indexOf(button.getAttribute('data-position')) >= 0;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    var count = root.querySelector('[data-position-count]');
    if (count) count.textContent = state.data.positions.length + ' of 3 selected';
  }

  function syncUploadName() {
    var node = root.querySelector('[data-upload-file-name]');
    if (!node) return;
    node.hidden = !state.data.highlightFileName;
    node.textContent = state.data.highlightFileName || '';
  }

  function setMessage(message, success) {
    var node = root.querySelector('[data-form-message]');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
    node.className = 'form-message ' + (success ? 'success' : 'error');
    if (message) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validatePhone(value) {
    return /^[+()\d\s-]{7,40}$/.test(String(value || '').trim());
  }

  function validateDetails() {
    collectInputs();
    if (!String(state.data.firstName || '').trim() ||
        !String(state.data.lastName || '').trim() ||
        !state.data.dateOfBirth) {
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
      if (!validateEmail(state.data.guardianEmail) || !validatePhone(state.data.guardianPhone)) {
        return 'Enter a valid parent or guardian email and phone number.';
      }
    } else if (!validateEmail(state.data.playerEmail) || !validatePhone(state.data.playerPhone)) {
      return 'Enter a valid player email and phone number.';
    }
    return '';
  }

  function validateFootball() {
    collectInputs();
    if (state.data.currentlyPlaysForTeam &&
        (!state.data.teamType ||
         !String(state.data.teamName || '').trim() ||
         !String(state.data.coachName || '').trim())) {
      return 'Complete the team type, academy or team name and coach name.';
    }
    if (!state.data.positions.length) return 'Choose at least one position.';
    if (state.data.positions.length > 3) return 'Choose no more than three positions.';
    if (!state.data.preferredFoot) return 'Choose Left, Right or Both as the preferred foot.';
    return '';
  }

  function validateAttendance() {
    collectInputs();
    if (!state.data.travelConfirmed) {
      return 'Confirm that you can travel to the event for ' + playerArrivalLabel() + '.';
    }
    if (state.data.ageOnEventDate <= 14 && !state.data.guardianAware) {
      return 'Confirm that the parent or guardian is aware of the event.';
    }
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
    if (!response.ok) {
      throw new Error(payload.error || payload.message || fallbackMessage || 'The request could not be completed.');
    }
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

  function fileExtension(file) {
    var byType = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm'
    };
    return byType[file.type] ||
      String(file.name || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') ||
      'mp4';
  }

  function randomToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID().replace(/-/g, '');
    }
    return String(Date.now()) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }

  async function uploadHighlight(registrationReference, file) {
    if (!file) return null;
    var config = publicSupabaseConfig();
    if (!config.url || !config.key) throw new Error('The optional video upload service is not configured.');
    if (ALLOWED_VIDEO_TYPES.indexOf(file.type) < 0) {
      throw new Error('The optional video must be MP4, MOV or WEBM.');
    }
    if (file.size > MAX_HIGHLIGHT_SIZE) {
      throw new Error('The optional video must be 500 MB or smaller.');
    }

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
      throw new Error(
        uploadPayload.message ||
        uploadPayload.error ||
        'The registration was saved, but the optional video could not be uploaded.'
      );
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
    var detailsError = validateDetails();
    if (state.status === 'ineligible') return;
    if (detailsError) {
      state.step = 1;
      updateUrl(1);
      render({ top: true });
      setMessage(detailsError, false);
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
    var form = activeForm();

    form.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', collectInputs);
      input.addEventListener('change', collectInputs);
    });

    form.querySelectorAll('[name="dateOfBirth"]').forEach(function (input) {
      input.addEventListener('input', function () {
        collectInputs();
        syncConditionalUi();
      });
      input.addEventListener('change', function () {
        collectInputs();
        syncConditionalUi();
      });
    });

    form.querySelectorAll('[name="currentlyPlaysForTeam"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectInputs();
        if (!state.data.currentlyPlaysForTeam) {
          state.data.teamType = '';
          state.data.teamName = '';
          state.data.coachName = '';
        }
        syncConditionalUi();
        saveState();
      });
    });

    form.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectInputs();
        syncChoice(input.name);
      });
    });

    form.querySelectorAll('input[type="checkbox"]:not([name="currentlyPlaysForTeam"])').forEach(function (input) {
      input.addEventListener('change', collectInputs);
    });

    root.querySelectorAll('[data-position]').forEach(function (button) {
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

    form.querySelectorAll('[name="highlightVideo"]').forEach(function (input) {
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
          setMessage('The highlight video must be 500 MB or smaller.', false);
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
          collectInputs();
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
    root.innerHTML = '<div class="loading-card">Loading showcase registration…</div>';
    try {
      var payload = await fetchJson(
        API + '/api/showcase/registrations/config',
        {},
        'The showcase event could not be loaded.'
      );
      state.event = payload.event;
      var current = routeState();

      if (current === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (current === 'ineligible') {
        state.status = 'ineligible';
        state.step = 0;
      } else {
        state.status = '';
        state.step = Number(current) || state.step || 0;
      }

      saveState();
      render();
    } catch (error) {
      root.innerHTML = '<div class="loading-card"><b>Registration could not load</b><p>' +
        escapeHtml(error.message || 'The showcase event could not be loaded.') +
        '</p><p>Contact people@stratexanalytics.co.uk if the problem continues.</p></div>';
    }
  }

  restoreState();

  window.addEventListener('popstate', function () {
    var value = routeState();
    state.status = value === 'complete' || value === 'ineligible' ? value : '';
    state.step = typeof value === 'number' ? value : 0;
    render({ top: true });
  });

  loadConfig();
}());

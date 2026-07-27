(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_professional_registration_v1';
  var root = document.getElementById('showcaseApp');
  var state = {
    step: 0,
    status: '',
    event: null,
    capacity: null,
    submitting: false,
    data: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      teamName: '',
      role: '',
      attendanceConfirmed: false
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Browser storage is optional.
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

  function routeState() {
    var path = window.location.pathname;
    if (path.indexOf('/complete') >= 0) return 'complete';
    if (path.indexOf('/sold-out') >= 0) return 'sold-out';
    var step = Number(new URLSearchParams(window.location.search).get('step'));
    return [1, 2].includes(step) ? step : 0;
  }

  function updateUrl(value) {
    var base = '/showcase-event/coach-scout-registration';
    if (value === 'complete') return history.pushState({}, '', base + '/complete');
    if (value === 'sold-out') return history.pushState({}, '', base + '/sold-out');
    history.pushState({}, '', value ? base + '?step=' + value : base);
  }

  function roleDisplay(value) {
    return {
      coach: 'Coach',
      scout: 'Scout',
      both: 'Coach and Scout'
    }[value] || 'Coach or Scout';
  }

  function eventVenue() {
    return state.event ? state.event.venueName : 'Ballerz Air Dome, Bluewater';
  }

  function eventAddress() {
    return state.event
      ? state.event.venueAddress
      : 'Ballerz Air Dome, Bluewater Event Space, Upper Blue Car Park, Upper Plaza, Bluewater, Greenhithe, Kent, DA9 9RL';
  }

  function eventDateValue() {
    return state.event && state.event.eventDate
      ? state.event.eventDate
      : '2026-09-12';
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

  function eventDateShortLabel() {
    var date = new Date(eventDateValue() + 'T12:00:00Z');
    if (Number.isNaN(date.getTime())) return '12 September 2026';
    return date.toLocaleDateString('en-GB', {
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
    return (hour % 12 || 12) + ':' + match[2] + ' ' + suffix;
  }

  function professionalArrivalLabel() {
    return formatTime(state.event && state.event.professionalArrivalTime, '12:30 PM');
  }

  function professionalCapacity() {
    return Number(state.capacity && state.capacity.limit) ||
      Number(state.event && state.event.professionalCapacity) ||
      30;
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

  function publicFooter() {
    return '<footer class="public-footer">' +
      '<div><div class="brand small">Stratex<span>Analytics</span></div><p>Data, evidence and responsible visibility for grassroots football.</p></div>' +
      '<div><b>Showcase</b><a href="/showcase-event/player-registration">Player registration</a><a href="/showcase-event/coach-scout-registration">Coach and scout registration</a></div>' +
      '<div><b>Trust</b><a href="/safeguarding">Safeguarding</a><a href="/privacy-policy">Privacy</a><a href="/contact">Contact</a></div>' +
    '</footer>';
  }

  function campaignPanel(title, subtitle) {
    return '<aside class="campaign-panel">' +
      '<div class="campaign-copy"><span class="free-badge">100% free to attend</span><p class="campaign-kicker">ScoutLink Showcase Event</p><h1>' + escapeHtml(title) + '</h1><p class="campaign-subtitle">' + escapeHtml(subtitle) + '</p></div>' +
      '<section class="event-meta"><div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div><div><small>Arrival time</small><b>' + escapeHtml(professionalArrivalLabel()) + '</b></div><div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div><div><small>For</small><b>Coaches and scouts</b></div></section>' +
      '<div class="venue-panel"><span class="venue-pin">⌖</span><div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' + escapeHtml(eventAddress()) + '</p></div></div>' +
      '<div class="campaign-proof"><span>✓ Free registration</span><span>✓ Live football showcase</span><span>✓ Responsible scout access</span></div>' +
    '</aside>';
  }

  function mobileCampaign(title, subtitle) {
    return '<section class="mobile-campaign-hero">' +
      '<span class="free-badge">100% free to attend</span><p class="campaign-kicker">ScoutLink Showcase Event</p><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(subtitle) + '</p>' +
      '<section class="event-meta mobile"><div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div><div><small>Arrival time</small><b>' + escapeHtml(professionalArrivalLabel()) + '</b></div><div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div><div><small>For</small><b>Coaches and scouts</b></div></section>' +
    '</section>';
  }

  function progress(step) {
    return '<section class="progress-bar">' +
      '<article class="progress-item ' + (step > 1 ? 'complete' : 'active') + '"><span>' + (step > 1 ? '✓' : '1') + '</span><div><b>Your details</b><small>Step 1 of 2</small></div></article>' +
      '<article class="progress-item ' + (step === 2 ? 'active' : '') + '"><span>2</span><div><b>Attendance</b><small>Step 2 of 2</small></div></article>' +
    '</section>';
  }

  function field(label, name, type, value) {
    return '<label class="field"><span class="field-label">' + escapeHtml(label) + '<em>Required</em></span><input name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '" required></label>';
  }

  function choiceCard(value, shortLabel, title, copy) {
    var selected = state.data.role === value;
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '"><input type="radio" name="role" value="' + value + '" ' + (selected ? 'checked' : '') + '><span>' + shortLabel + '</span><div><b>' + title + '</b><small>' + copy + '</small></div></label>';
  }

  function landingContent() {
    var count = state.capacity ? state.capacity.confirmed : 0;
    var limit = professionalCapacity();
    return '<header class="registration-intro"><span class="section-kicker">Coach and scout registration</span><h2>Find top talent live</h2><p>Watch players in person, meet grassroots coaches and discover players with structured ScoutLink context.</p></header>' +
      '<section class="professional-value"><article><span>01</span><div><b>Watch live</b><small>See players perform beyond a profile.</small></div></article><article><span>02</span><div><b>Meet coaches</b><small>Build direct grassroots relationships.</small></div></article><article><span>03</span><div><b>Register free</b><small>No ticket or platform payment required.</small></div></article></section>' +
      '<section class="capacity-warning"><div><small>Professional capacity</small><b>' + count + ' of ' + limit + ' coach and scout spaces used</b></div><span>Limited</span></section>' +
      '<div class="primary-cta-block"><button class="btn primary large" type="button" data-action="start">Register as a coach or scout</button><small>Please register only if you are confident you can attend.</small></div>';
  }

  function detailsContent() {
    return progress(1) +
      '<header class="form-heading"><span class="section-kicker">Step 1</span><h2>Your professional details</h2><p>Tell us who you are and which team or organisation you represent.</p></header>' +
      '<form data-professional-form="details"><div class="two-col">' +
        field('First name', 'firstName', 'text', state.data.firstName) +
        field('Last name', 'lastName', 'text', state.data.lastName) +
        field('Email address', 'email', 'email', state.data.email) +
        field('Phone number', 'phone', 'tel', state.data.phone) +
      '</div>' +
      field('Team or organisation name', 'teamName', 'text', state.data.teamName) +
      '<section class="form-section"><span class="section-label">Your role</span><div class="choice-grid">' +
        choiceCard('coach', 'C', 'Coach', 'Attending primarily as a coach') +
        choiceCard('scout', 'S', 'Scout', 'Attending primarily as a scout') +
        choiceCard('both', 'B', 'Both', 'You work across both roles') +
      '</div></section>' +
      '<p class="privacy-copy">Your registration is stored securely in Supabase and used for event communication and attendance management.</p><div class="form-message" data-form-message hidden></div></form>';
  }

  function attendanceContent() {
    return progress(2) +
      '<header class="form-heading"><span class="section-kicker">Final step</span><h2>Confirm your attendance</h2><p>There are only ' + professionalCapacity() + ' combined spaces for coaches and scouts.</p></header>' +
      '<form data-professional-form="attendance"><section class="attendance-card professional"><div class="date-block"><b>12</b><span>SEP</span></div><div><small>Coach and scout arrival</small><h3>' + escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(professionalArrivalLabel()) + '</h3><p>' + escapeHtml(eventAddress()) + '</p></div></section>' +
      '<section class="limited-space-message"><span>Limited spaces</span><p>Please only confirm if you are 100% sure you can attend. Once ' + professionalCapacity() + ' places are taken, new registrations move to the sold-out waitlist.</p></section>' +
      '<section class="confirmation-list"><label class="check-row"><input type="checkbox" name="attendanceConfirmed" ' + (state.data.attendanceConfirmed ? 'checked' : '') + '><span><b>I am 100% sure I can attend Ballerz Air Dome at ' + escapeHtml(professionalArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Please check your travel before submitting.</small></span></label></section>' +
      '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit">Edit</button></header><dl><div><dt>Name</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + '</dd></div><div><dt>Organisation</dt><dd>' + escapeHtml(state.data.teamName) + '</dd></div><div><dt>Role</dt><dd>' + escapeHtml(roleDisplay(state.data.role)) + '</dd></div><div><dt>Cost</dt><dd>Free</dd></div></dl></section><div class="form-message" data-form-message hidden></div></form>';
  }

  function soldOutContent() {
    var count = state.capacity ? state.capacity.confirmed : 30;
    var limit = professionalCapacity();
    return '<header class="registration-intro"><span class="section-kicker danger">Professional spaces full</span><h2>This event is sold out</h2><p>All ' + limit + ' coach and scout spaces have been taken. Join the waitlist and we will contact you if a place opens or when the next showcase is available.</p></header>' +
      '<section class="sold-out-count"><div><small>Current professional capacity</small><b>' + count + ' / ' + limit + '</b></div><span>Sold out</span></section>' +
      '<form data-professional-form="waitlist"><section class="form-section"><span class="section-label">Join the waitlist</span><div class="two-col">' +
        field('First name', 'firstName', 'text', state.data.firstName) +
        field('Last name', 'lastName', 'text', state.data.lastName) +
        field('Email address', 'email', 'email', state.data.email) +
        field('Phone number', 'phone', 'tel', state.data.phone) +
      '</div>' +
      field('Team or organisation name', 'teamName', 'text', state.data.teamName) +
      '<span class="section-label">Primary role</span><div class="choice-grid">' +
        choiceCard('coach', 'C', 'Coach', 'Join the coach waitlist') +
        choiceCard('scout', 'S', 'Scout', 'Join the scout waitlist') +
        choiceCard('both', 'B', 'Both', 'You work across both roles') +
      '</div></section><div class="form-message" data-form-message hidden></div></form>' +
      '<button class="btn primary large" type="button" data-action="join-waitlist">Join the waitlist</button><small class="centred-note">Joining the waitlist is free and does not guarantee a place.</small>';
  }

  function successContent() {
    var result = state.result || {};
    var attendee = result.attendee || {};
    if (result.status === 'waitlisted') {
      return '<section class="success-mark">✓</section><header class="registration-intro centred"><span class="section-kicker">Waitlist received</span><h2>You are on the professional waitlist</h2><p>We will contact you if a place becomes available or when the next showcase opens.</p></header><section class="ticket-panel"><div><small>Attendee</small><b>' + escapeHtml((attendee.firstName || state.data.firstName) + ' ' + (attendee.lastName || state.data.lastName)) + '</b></div><div><small>Role</small><b>' + escapeHtml(attendee.role || roleDisplay(state.data.role)) + '</b></div><div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div><div><small>Status</small><b>Waitlisted</b></div></section><a class="btn primary large" href="/">Return to Stratex Analytics</a>';
    }
    return '<section class="success-mark">✓</section><header class="registration-intro centred"><span class="section-kicker">Registration received</span><h2>Your showcase place is recorded</h2><p>We have emailed your event details. Please tell us quickly if your availability changes.</p></header>' +
      '<section class="ticket-panel"><div><small>Attendee</small><b>' + escapeHtml((attendee.firstName || state.data.firstName) + ' ' + (attendee.lastName || state.data.lastName) + ' · ' + (attendee.role || roleDisplay(state.data.role))) + '</b></div><div><small>Organisation</small><b>' + escapeHtml(attendee.teamName || state.data.teamName) + '</b></div><div><small>Arrival</small><b>' + escapeHtml(eventDateShortLabel()) + ' · ' + escapeHtml(professionalArrivalLabel()) + '</b></div><div><small>Cost</small><b>Free</b></div></section>' +
      '<section class="next-steps"><b>Before the event</b><ol><li>Save the venue address.</li><li>Bring professional identification where appropriate.</li><li>Look out for event updates by email.</li></ol></section><a class="btn primary large" href="/">Return to Stratex Analytics</a>';
  }

  function content() {
    if (state.status === 'complete') return successContent();
    if (state.status === 'sold-out') return soldOutContent();
    if (state.step === 1) return detailsContent();
    if (state.step === 2) return attendanceContent();
    return landingContent();
  }

  function titlePair() {
    if (state.status === 'sold-out') return ['Still looking for players?', 'Join the waitlist for this showcase and the next available event.'];
    if (state.status === 'complete') return ['See the talent live.', 'Your free registration has been received.'];
    if (state.step === 2) return ['Find top talent live.', 'Please confirm only if the date, time and travel work for you.'];
    return ['Looking for players?', 'Find top talent live at a free ScoutLink showcase built for coaches and scouts.'];
  }

  function actionFooter() {
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) return back + '<button class="btn primary" type="button" data-action="continue">Continue to attendance</button>';
    return back + '<button class="btn primary" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' + (state.submitting ? 'Submitting…' : 'Submit free registration') + '</button>';
  }

  function render() {
    var pair = titlePair();
    var pageContent = content();
    root.innerHTML = '<section class="showcase-desktop-only public-page desktop">' + publicHeader() + '<main class="public-main">' + campaignPanel(pair[0], pair[1]) + '<section class="registration-panel ' + ((state.step === 0 || state.status) ? 'compact' : '') + '">' + pageContent + (actionFooter() ? '<footer class="form-actions">' + actionFooter() + '</footer>' : '') + '</section></main>' + publicFooter() + '</section>' +
      '<section class="showcase-mobile-only public-page mobile">' + mobileHeader() + '<main class="mobile-public-main">' + mobileCampaign(pair[0], state.step ? 'Step ' + state.step + ' of 2' : pair[1]) + '<section class="mobile-registration-content">' + pageContent + '</section></main>' +
      (state.step === 0 && !state.status ? '<footer class="mobile-sticky-actions"><button class="btn primary" type="button" data-action="start">Register free</button></footer>' : actionFooter() ? '<footer class="mobile-sticky-actions">' + actionFooter() + '</footer>' : '') + '</section>';
    bindEvents();
  }

  function collect() {
    document.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'checkbox') state.data[input.name] = input.checked;
      else if (input.type === 'radio') {
        if (input.checked) state.data[input.name] = input.value;
      } else state.data[input.name] = input.value;
    });
    saveState();
  }

  function setMessage(message, success) {
    document.querySelectorAll('[data-form-message]').forEach(function (node) {
      node.hidden = !message;
      node.textContent = message || '';
      node.classList.toggle('success', !!success);
    });
  }

  function validateDetails() {
    collect();
    if (!state.data.firstName || !state.data.lastName || !state.data.email || !state.data.phone || !state.data.teamName) return 'Complete every professional registration field.';
    if (!state.data.role) return 'Choose Coach, Scout or Both.';
    return '';
  }

  async function submit() {
    collect();
    if (!state.data.attendanceConfirmed) return setMessage('Only register if you are 100% sure you can attend at ' + professionalArrivalLabel() + '.', false);
    state.submitting = true;
    render();
    try {
      var response = await fetch(API + '/api/showcase/registrations/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.data)
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
      setMessage(error.message, false);
    }
  }

  async function joinWaitlist() {
    var validationError = validateDetails();
    if (validationError) return setMessage(validationError, false);
    state.data.attendanceConfirmed = true;
    await submit();
  }

  function bindEvents() {
    document.querySelectorAll('[data-mobile-menu]').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = button.closest('.public-page').querySelector('[data-mobile-menu-panel]');
        var open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    document.querySelectorAll('[name]').forEach(function (input) {
      input.addEventListener('input', collect);
      input.addEventListener('change', function () {
        collect();
        if (input.type === 'radio') render();
      });
    });

    document.querySelectorAll('[data-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.dataset.action;
        setMessage('', false);
        if (action === 'start') {
          state.step = 1;
          state.status = '';
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'back') {
          state.step = Math.max(0, state.step - 1);
          updateUrl(state.step);
          saveState();
          render();
        } else if (action === 'continue') {
          var error = validateDetails();
          if (error) return setMessage(error, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render();
        } else if (action === 'edit') {
          state.step = 1;
          updateUrl(1);
          saveState();
          render();
        } else if (action === 'submit') {
          submit();
        } else if (action === 'join-waitlist') {
          joinWaitlist();
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
      state.capacity = payload.capacity;
      var route = routeState();
      if (route === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (payload.capacity.soldOut) {
        state.status = 'sold-out';
        state.step = 0;
        if (route !== 'sold-out') updateUrl('sold-out');
      } else {
        state.status = '';
        state.step = typeof route === 'number' ? route : 0;
        if (route === 'sold-out') updateUrl(0);
      }
      render();
    } catch (error) {
      root.innerHTML = '<section class="support-panel" style="margin:30px"><b>Registration could not load</b><p>' + escapeHtml(error.message) + ' Contact people@stratexanalytics.co.uk if the problem continues.</p></section>';
    }
  }

  restoreState();
  window.addEventListener('popstate', function () {
    var route = routeState();
    state.status = typeof route === 'string' ? route : '';
    state.step = typeof route === 'number' ? route : 0;
    render();
  });
  loadConfig();
}());

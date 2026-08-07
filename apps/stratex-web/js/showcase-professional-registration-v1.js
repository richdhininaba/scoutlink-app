(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var STORAGE_KEY = 'stratex_showcase_professional_registration_v3';
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

  function publicSupabaseConfig() {
    var config = window.SL_CONFIG || {};
    return {
      url: String(config.SUPABASE_URL || '').replace(/\/$/, ''),
      key: String(config.SUPABASE_ANON_KEY || '')
    };
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: state.step,
        status: state.status,
        event: state.event,
        capacity: state.capacity,
        data: state.data,
        result: state.result
      }));
    } catch (_) {
      // Registration remains usable without browser storage.
    }
  }

  function restoreState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !saved.data) return;
      state.step = Number(saved.step) || 0;
      state.status = saved.status || '';
      state.event = saved.event || null;
      state.capacity = saved.capacity || null;
      state.data = Object.assign(state.data, saved.data);
      state.result = saved.result || null;
    } catch (_) {
      // Ignore invalid browser state.
    }
  }

  function routeState() {
    var path = window.location.pathname;
    if (path.indexOf('/complete') >= 0) return 'complete';
    if (path.indexOf('/sold-out') >= 0) return 'sold-out';
    var step = Number(new URLSearchParams(window.location.search).get('step'));
    return [1, 2].indexOf(step) >= 0 ? step : 0;
  }

  function updateUrl(value) {
    var base = '/showcase-event/coach-scout-registration';
    if (value === 'complete') {
      history.pushState({}, '', base + '/complete');
    } else if (value === 'sold-out') {
      history.pushState({}, '', base + '/sold-out');
    } else {
      history.pushState({}, '', value ? base + '?step=' + value : base);
    }
  }

  function roleDisplay(value) {
    return {
      coach: 'Coach',
      scout: 'Scout',
      both: 'Coach and Scout'
    }[value] || 'Coach or Scout';
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

  function professionalArrivalLabel() {
    return formatTime(state.event && state.event.professionalArrivalTime, '12:30 PM');
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
    if (state.status === 'sold-out-form') {
      return ['This showcase is full.', 'Leave your details and our team will contact you about more ScoutLink showcase events.'];
    }
    if (state.status === 'complete') {
      return ['Be there when talent gets noticed.', 'Your free Coach or Scout registration is confirmed.'];
    }
    if (state.step === 2) {
      return ['One final confirmation.', 'Check the date, time and venue before submitting.'];
    }
    return ['Be there when talent gets noticed.', 'Watch live football, meet coaches and discover players with more context.'];
  }

  function sidePanel() {
    var copy = sideCopy();
    return '<aside class="showcase-side">' +
      '<div><span class="free-badge">100% free to attend</span><p class="showcase-eyebrow">ScoutLink Showcase Event</p>' +
      '<h1>' + escapeHtml(copy[0]) + '</h1><p class="showcase-side-copy">' + escapeHtml(copy[1]) + '</p></div>' +
      '<div class="event-meta">' +
        '<div><small>Date</small><b>' + escapeHtml(eventDateLabel()) + '</b></div>' +
        '<div><small>Arrival</small><b>' + escapeHtml(professionalArrivalLabel()) + '</b></div>' +
        '<div><small>Venue</small><b>' + escapeHtml(eventVenue()) + '</b></div>' +
        '<div><small>For</small><b>Coaches and scouts</b></div>' +
      '</div>' +
      '<div class="venue-card"><span class="venue-icon" aria-hidden="true">⌖</span><div><small>Full venue address</small><b>Ballerz Air Dome</b><p>' +
        escapeHtml(eventAddress()) + '</p></div></div>' +
      '<div class="proof-row"><span>✓ Free registration</span><span>✓ Live football</span><span>✓ Responsible access</span></div>' +
    '</aside>';
  }

  function mobileMeta() {
    return '<section class="mobile-event-meta" aria-label="Event details">' +
      '<div><b>' + escapeHtml(eventDateShort()) + '</b><span>' + escapeHtml(professionalArrivalLabel()) + ' arrival</span></div>' +
      '<div><b>' + escapeHtml(eventVenue()) + '</b><span>Bluewater, Kent</span></div>' +
      '<div><b>Free</b><span>Coaches and scouts</span></div>' +
    '</section>';
  }

  function progress(step) {
    return '<section class="progress-bar" aria-label="Registration progress">' +
      '<article class="progress-item ' + (step > 1 ? 'complete' : 'active') + '"><span>' +
        (step > 1 ? '✓' : '1') + '</span><div><b>Your details</b><small>Step 1 of 2</small></div></article>' +
      '<article class="progress-item ' + (step === 2 ? 'active' : '') + '"><span>2</span><div><b>Attendance</b><small>Step 2 of 2</small></div></article>' +
    '</section>';
  }

  function field(label, name, type, value, autocomplete) {
    return '<label class="field"><span class="field-label">' + escapeHtml(label) +
      '<em>Required</em></span><input name="' + escapeHtml(name) + '" type="' +
      escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') +
      '" required ' + (autocomplete ? 'autocomplete="' + escapeHtml(autocomplete) + '"' : '') + '></label>';
  }

  function roleCard(value, shortLabel, title, copy) {
    var selected = state.data.role === value;
    return '<label class="choice-card ' + (selected ? 'selected' : '') + '"><input type="radio" name="role" value="' +
      value + '" ' + (selected ? 'checked' : '') + '><span>' + shortLabel + '</span><div><b>' +
      title + '</b><small>' + copy + '</small></div></label>';
  }

  function landingContent() {
    return '<header class="registration-intro"><span>Coach and scout registration</span><h2>Find top talent live</h2>' +
      '<p>Watch players in person, meet grassroots coaches and discover players with structured ScoutLink context.</p></header>' +
      '<section class="journey-list">' +
        '<article><span>01</span><div><b>Watch live</b><small>See players perform beyond a profile.</small></div></article>' +
        '<article><span>02</span><div><b>Meet coaches</b><small>Build direct grassroots relationships.</small></div></article>' +
        '<article><span>03</span><div><b>Register free</b><small>No ticket or platform payment required.</small></div></article>' +
      '</section>' +
      '<section class="capacity-warning"><div><small>Professional capacity</small><b>Coach and Scout spaces are almost at capacity</b></div><span>Limited</span></section>' +
      '<div class="primary-cta-block"><button class="btn" type="button" data-action="start">Register as a Coach or Scout</button>' +
        '<small>Please register only if you are confident you can attend.</small></div>';
  }

  function detailsContent() {
    return progress(1) +
      '<header class="form-heading"><span>Step 1</span><h2>Your professional details</h2><p>Tell us who you are and which team or organisation you represent.</p></header>' +
      '<form class="registration-form" data-professional-form="details" novalidate>' +
        '<div class="two-col">' +
          field('First name', 'firstName', 'text', state.data.firstName, 'given-name') +
          field('Last name', 'lastName', 'text', state.data.lastName, 'family-name') +
          field('Email address', 'email', 'email', state.data.email, 'email') +
          field('Phone number', 'phone', 'tel', state.data.phone, 'tel') +
        '</div>' +
        field('Team or organisation name', 'teamName', 'text', state.data.teamName, 'organization') +
        '<section class="form-section"><span class="section-label">Your role</span><div class="choice-grid">' +
          roleCard('coach', 'C', 'Coach', 'Attending primarily as a Coach') +
          roleCard('scout', 'S', 'Scout', 'Attending primarily as a Scout') +
          roleCard('both', 'B', 'Both', 'You work across both roles') +
        '</div></section>' +
        '<p class="privacy-copy">Your registration is stored securely and used for event communication and attendance management.</p>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function attendanceContent() {
    return progress(2) +
      '<header class="form-heading"><span>Final step</span><h2>Confirm your attendance</h2>' +
        '<p>Coach and Scout spaces are almost at capacity, so please only confirm if you can attend.</p></header>' +
      '<form class="registration-form" data-professional-form="attendance" novalidate>' +
        '<section class="attendance-card"><div class="date-block"><b>' + escapeHtml(eventDay()) +
          '</b><span>' + escapeHtml(eventMonth()) + '</span></div><div><small>Coach and scout arrival</small><h3>' +
          escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(professionalArrivalLabel()) + '</h3><p>' +
          escapeHtml(eventAddress()) + '</p></div></section>' +
        '<div class="notice warning"><b>Limited spaces</b><p>Please only confirm if you are 100% sure you can attend. Once the available places are taken, new registrations move to the contact list.</p></div>' +
        '<label class="check-row strong"><input type="checkbox" name="attendanceConfirmed" ' +
          (state.data.attendanceConfirmed ? 'checked' : '') +
          '><span><b>I am 100% sure I can attend Ballerz Air Dome at ' +
          escapeHtml(professionalArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) +
          '.</b><small>Please check your travel before submitting.</small></span></label>' +
        '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit">Edit</button></header><dl>' +
          '<div><dt>Name</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + '</dd></div>' +
          '<div><dt>Role</dt><dd>' + escapeHtml(roleDisplay(state.data.role)) + '</dd></div>' +
          '<div><dt>Team or organisation</dt><dd>' + escapeHtml(state.data.teamName) + '</dd></div>' +
          '<div><dt>Email</dt><dd>' + escapeHtml(state.data.email) + '</dd></div>' +
        '</dl></section>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function soldOutFormContent() {
    return '<header class="registration-intro"><span>This showcase is full</span>' +
      '<h2>Stay connected to future showcase opportunities</h2>' +
      '<p>Leave your contact details and a member of the Stratex team will contact you by email or phone about more ScoutLink showcase events.</p></header>' +
      '<form class="registration-form" data-professional-form="sold-out" novalidate>' +
        '<div class="two-col">' +
          field('First name', 'firstName', 'text', state.data.firstName, 'given-name') +
          field('Last name', 'lastName', 'text', state.data.lastName, 'family-name') +
          field('Email address', 'email', 'email', state.data.email, 'email') +
          field('Phone number', 'phone', 'tel', state.data.phone, 'tel') +
        '</div>' +
        '<div class="notice warning"><b>Future showcase access</b><p>This form does not confirm a place at the current event. Our team will contact you about future showcase viewing opportunities and other ways to see ScoutLink talent live.</p></div>' +
        '<p class="privacy-copy">Your details are stored securely and used only to contact you about ScoutLink showcase opportunities.</p>' +
        '<div class="form-message error" data-form-message hidden></div>' +
      '</form>';
  }

  function completeContent() {
    var result = state.result || {};
    var attendee = result.attendee || {};
    return '<main class="state-wrap"><section class="state-card">' +
      '<div class="state-icon">✓</div><span>Registration confirmed</span>' +
      '<h1>You are registered for the ScoutLink showcase.</h1>' +
      '<p>Keep the event details below and check your email for confirmation.</p>' +
      '<div class="ticket-panel">' +
        '<div><small>Attendee</small><b>' + escapeHtml((attendee.firstName || state.data.firstName) + ' ' + (attendee.lastName || state.data.lastName)) + '</b></div>' +
        '<div><small>Role</small><b>' + escapeHtml(attendee.role || roleDisplay(state.data.role)) + '</b></div>' +
        '<div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div>' +
        '<div><small>Arrival</small><b>' + escapeHtml(professionalArrivalLabel()) + '</b></div>' +
      '</div>' +
      '<div class="next-steps"><span>Before the event</span><ol>' +
        '<li>Save the venue address and arrival time.</li>' +
        '<li>Bring identification connected to your registration.</li>' +
        '<li>Contact Stratex if your attendance changes.</li>' +
      '</ol></div>' +
      '<div class="state-actions"><a class="btn" href="/">Return to Stratex Analytics</a></div>' +
    '</section></main>';
  }

  function soldOutCompleteContent() {
    var result = state.result || {};
    return '<main class="state-wrap"><section class="state-card">' +
      '<div class="state-icon">✓</div><span>Details received</span>' +
      '<h1>Our team will contact you.</h1>' +
      '<p>A member of the Stratex team will contact you by email or phone about more ScoutLink showcase events.</p>' +
      '<div class="ticket-panel">' +
        '<div><small>Name</small><b>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + '</b></div>' +
        '<div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div>' +
        '<div><small>Email</small><b>' + escapeHtml(state.data.email) + '</b></div>' +
        '<div><small>Phone</small><b>' + escapeHtml(state.data.phone) + '</b></div>' +
      '</div>' +
      '<div class="notice warning"><b>This is not a confirmed place at the current event</b>' +
        '<p>Please wait for our team to contact you before travelling to any showcase.</p></div>' +
      '<div class="state-actions"><a class="btn" href="/">Return to Stratex Analytics</a></div>' +
    '</section></main>';
  }

  function actionFooter() {
    if (state.status === 'sold-out-form') {
      return '<footer class="form-actions"><a class="btn secondary" href="/showcase-event">Return to event page</a>' +
        '<button class="btn" type="button" data-action="submit-sold-out" ' + (state.submitting ? 'disabled' : '') + '>' +
        (state.submitting ? 'Sending…' : 'Ask the team to contact me') + '</button></footer>';
    }
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) {
      return '<footer class="form-actions">' + back +
        '<button class="btn" type="button" data-action="continue">Continue to attendance</button></footer>';
    }
    return '<footer class="form-actions">' + back +
      '<button class="btn" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' +
      (state.submitting ? 'Submitting…' : 'Confirm free registration') + '</button></footer>';
  }

  function standardContent() {
    var content = state.status === 'sold-out-form'
      ? soldOutFormContent()
      : state.step === 1
        ? detailsContent()
        : state.step === 2
          ? attendanceContent()
          : landingContent();

    return '<main class="showcase-shell showcase-layout">' + sidePanel() + mobileMeta() +
      '<section class="showcase-panel ' + ((state.step === 0 || state.status === 'sold-out-form') ? 'compact' : '') + '">' +
      content + actionFooter() + '</section></main>';
  }

  function render(options) {
    options = options || {};
    root.innerHTML = '<section class="showcase-page professional">' + header() +
      (state.status === 'complete' ? completeContent() :
        state.status === 'sold-out-complete' ? soldOutCompleteContent() :
        standardContent()) +
      footer() + '</section>';
    bindEvents();
    if (options.top) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function activeForm() {
    return root.querySelector('form') || root;
  }

  function collectInputs() {
    var scope = activeForm();
    scope.querySelectorAll('[name]').forEach(function (input) {
      if (input.type === 'checkbox') {
        state.data[input.name] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) state.data[input.name] = input.value;
      } else {
        state.data[input.name] = input.value;
      }
    });
    saveState();
  }

  function syncRoleCards() {
    root.querySelectorAll('[name="role"]').forEach(function (input) {
      var card = input.closest('.choice-card');
      if (card) card.classList.toggle('selected', input.checked);
    });
  }

  function setMessage(message, success) {
    var node = root.querySelector('[data-form-message]');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
    node.className = 'form-message ' + (success ? 'success' : 'error');
    if (message) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validPhone(value) {
    return /^[+()\d\s-]{7,40}$/.test(String(value || '').trim());
  }

  function validateContactFields(requireTeamAndRole) {
    collectInputs();
    if (!String(state.data.firstName || '').trim() || !String(state.data.lastName || '').trim()) {
      return 'Enter the first name and last name.';
    }
    if (!validEmail(state.data.email)) return 'Enter a valid email address.';
    if (!validPhone(state.data.phone)) return 'Enter a valid phone number.';
    if (requireTeamAndRole) {
      if (!String(state.data.teamName || '').trim()) return 'Enter the team or organisation name.';
      if (['coach', 'scout', 'both'].indexOf(state.data.role) < 0) return 'Choose Coach, Scout or Both.';
    }
    return '';
  }

  function validateAttendance() {
    collectInputs();
    if (!state.data.attendanceConfirmed) {
      return 'Confirm that you are 100% sure you can attend at ' + professionalArrivalLabel() + '.';
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

  async function submitRegistration() {
    var detailsError = validateContactFields(true);
    if (detailsError) {
      state.step = 1;
      updateUrl(1);
      render({ top: true });
      setMessage(detailsError, false);
      return;
    }

    var attendanceError = validateAttendance();
    if (attendanceError) {
      setMessage(attendanceError, false);
      return;
    }

    state.submitting = true;
    render();

    try {
      var payload = await fetchJson(API + '/api/showcase/registrations/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: String(state.data.firstName || '').trim(),
          lastName: String(state.data.lastName || '').trim(),
          email: String(state.data.email || '').trim(),
          phone: String(state.data.phone || '').trim(),
          teamName: String(state.data.teamName || '').trim(),
          role: state.data.role,
          attendanceConfirmed: true
        })
      }, 'The registration service could not be reached. Check your connection and try again.');

      state.result = payload;
      state.submitting = false;
      state.step = 0;
      state.status = payload.status === 'waitlisted' ? 'sold-out-complete' : 'complete';
      updateUrl(payload.status === 'waitlisted' ? 'sold-out' : 'complete');
      saveState();
      render({ top: true });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'The registration could not be saved. Please try again.', false);
    }
  }

  async function submitSoldOutInterest() {
    var contactError = validateContactFields(false);
    if (contactError) return setMessage(contactError, false);

    var config = publicSupabaseConfig();
    if (!config.url || !config.key) {
      return setMessage('The contact service is not configured. Please email people@stratexanalytics.co.uk.', false);
    }

    state.submitting = true;
    render();

    try {
      var payload = await fetchJson(config.url + '/rest/v1/rpc/register_showcase_sold_out_interest', {
        method: 'POST',
        headers: {
          apikey: config.key,
          Authorization: 'Bearer ' + config.key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_event_key: state.event && state.event.eventKey ? state.event.eventKey : 'bluewater-2026-09-12',
          p_first_name: String(state.data.firstName || '').trim(),
          p_last_name: String(state.data.lastName || '').trim(),
          p_email: String(state.data.email || '').trim(),
          p_phone: String(state.data.phone || '').trim()
        })
      }, 'The contact request could not be saved. Please try again.');

      state.result = payload;
      state.submitting = false;
      state.status = 'sold-out-complete';
      state.step = 0;
      updateUrl('sold-out');
      saveState();
      render({ top: true });
    } catch (error) {
      state.submitting = false;
      state.status = 'sold-out-form';
      render();
      setMessage(error.message || 'The contact request could not be saved. Please try again.', false);
    }
  }

  function bindEvents() {
    var form = activeForm();

    form.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', collectInputs);
      input.addEventListener('change', collectInputs);
    });

    form.querySelectorAll('[name="role"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectInputs();
        syncRoleCards();
      });
    });

    form.querySelectorAll('[name="attendanceConfirmed"]').forEach(function (input) {
      input.addEventListener('change', collectInputs);
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
        } else if (action === 'continue') {
          var error = validateContactFields(true);
          if (error) return setMessage(error, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render({ top: true });
        } else if (action === 'edit') {
          collectInputs();
          state.step = 1;
          updateUrl(1);
          saveState();
          render({ top: true });
        } else if (action === 'submit') {
          submitRegistration();
        } else if (action === 'submit-sold-out') {
          submitSoldOutInterest();
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
      state.capacity = payload.capacity || payload.professionalCapacity || null;

      var route = routeState();
      if (route === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (route === 'sold-out') {
        state.status = state.result && state.result.registrationReference
          ? 'sold-out-complete'
          : 'sold-out-form';
        state.step = 0;
      } else if (state.capacity && state.capacity.soldOut && route === 0) {
        state.status = 'sold-out-form';
        state.step = 0;
        updateUrl('sold-out');
      } else {
        state.status = '';
        state.step = Number(route) || state.step || 0;
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
    var route = routeState();
    if (route === 'complete') {
      state.status = state.result ? 'complete' : '';
      state.step = 0;
    } else if (route === 'sold-out') {
      state.status = state.result && state.result.registrationReference
        ? 'sold-out-complete'
        : 'sold-out-form';
      state.step = 0;
    } else {
      state.status = '';
      state.step = typeof route === 'number' ? route : 0;
    }
    render({ top: true });
  });

  loadConfig();
}());

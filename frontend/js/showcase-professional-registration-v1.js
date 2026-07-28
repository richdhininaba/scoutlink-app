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
  var MOBILE_BREAKPOINT = 760;
  var root = document.getElementById('showcaseApp');
  var lastMobile = window.matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches;
  var resizeTimer = null;
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: state.step,
        status: state.status,
        event: state.event,
        capacity: state.capacity,
        data: state.data,
        result: state.result
      }));
    } catch (_) {
      // Registration continues when browser storage is unavailable.
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
      // Ignore invalid saved browser state.
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
      return;
    }
    if (value === 'sold-out') {
      history.pushState({}, '', base + '/sold-out');
      return;
    }
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
    return state.event && state.event.eventDate ? state.event.eventDate : '2026-09-12';
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

  function professionalArrivalLabel() {
    return formatTime(state.event && state.event.professionalArrivalTime, '12:30 PM');
  }

  function professionalCapacity() {
    return Number(state.capacity && state.capacity.limit) || Number(state.event && state.event.professionalCapacity) || 30;
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
    return '<header class="registration-intro"><span class="section-kicker">Coach and scout registration</span><h2>Find top talent live</h2><p>Watch players in person, meet grassroots coaches and discover players with structured ScoutLink context.</p></header>' +
      '<section class="professional-value"><article><span>01</span><div><b>Watch live</b><small>See players perform beyond a profile.</small></div></article><article><span>02</span><div><b>Meet coaches</b><small>Build direct grassroots relationships.</small></div></article><article><span>03</span><div><b>Register free</b><small>No ticket or platform payment required.</small></div></article></section>' +
      '<section class="capacity-warning"><div><small>Professional capacity</small><b>Coach and Scout spaces are almost at capacity</b></div><span>Limited</span></section>' +
      '<div class="primary-cta-block"><button class="btn primary large" type="button" data-action="start">Register as a coach or scout</button><small>Please register only if you are confident you can attend.</small></div>';
  }

  function detailsContent() {
    return progress(1) +
      '<header class="form-heading"><span class="section-kicker">Step 1</span><h2>Your professional details</h2><p>Tell us who you are and which team or organisation you represent.</p></header>' +
      '<form data-professional-form="details" novalidate><div class="two-col">' +
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
      '<header class="form-heading"><span class="section-kicker">Final step</span><h2>Confirm your attendance</h2><p>Coach and Scout spaces are almost at capacity, so please only confirm if you can attend.</p></header>' +
      '<form data-professional-form="attendance" novalidate><section class="attendance-card professional"><div class="date-block"><b>12</b><span>SEP</span></div><div><small>Coach and scout arrival</small><h3>' + escapeHtml(eventDateLabel()) + ' · ' + escapeHtml(professionalArrivalLabel()) + '</h3><p>' + escapeHtml(eventAddress()) + '</p></div></section>' +
      '<section class="limited-space-message"><span>Limited spaces</span><p>Please only confirm if you are 100% sure you can attend. Once the available places are taken, new registrations move to the waitlist.</p></section>' +
      '<section class="confirmation-list"><label class="check-row"><input type="checkbox" name="attendanceConfirmed" ' + (state.data.attendanceConfirmed ? 'checked' : '') + '><span><b>I am 100% sure I can attend Ballerz Air Dome at ' + escapeHtml(professionalArrivalLabel()) + ' on ' + escapeHtml(eventDateLabel()) + '.</b><small>Please check your travel before submitting.</small></span></label></section>' +
      '<section class="review-summary"><header><span>Registration summary</span><button type="button" data-action="edit">Edit</button></header><dl><div><dt>Name</dt><dd>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + '</dd></div><div><dt>Role</dt><dd>' + escapeHtml(roleDisplay(state.data.role)) + '</dd></div><div><dt>Team or organisation</dt><dd>' + escapeHtml(state.data.teamName) + '</dd></div><div><dt>Email</dt><dd>' + escapeHtml(state.data.email) + '</dd></div></dl></section>' +
      '<div class="form-message" data-form-message hidden></div></form>';
  }

  function completeContent() {
    var result = state.result || {};
    var attendee = result.attendee || {};
    return '<section class="success-mark">✓</section>' +
      '<header class="registration-intro centred"><span class="section-kicker">Registration confirmed</span><h2>You are registered for the ScoutLink showcase</h2><p>Keep the event details below and check your email for confirmation.</p></header>' +
      '<section class="ticket-panel"><div><small>Attendee</small><b>' + escapeHtml((attendee.firstName || state.data.firstName) + ' ' + (attendee.lastName || state.data.lastName)) + '</b></div><div><small>Role</small><b>' + escapeHtml(attendee.role || roleDisplay(state.data.role)) + '</b></div><div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div><div><small>Arrival</small><b>' + escapeHtml(professionalArrivalLabel()) + '</b></div></section>' +
      '<section class="next-steps"><b>Before the event</b><ol><li>Save the venue address and arrival time.</li><li>Bring identification connected to your registration.</li><li>Contact Stratex if your attendance changes.</li></ol></section>' +
      '<a class="btn primary large" href="/">Return to Stratex Analytics</a>';
  }

  function soldOutFormContent() {
    return '<header class="registration-intro"><span class="section-kicker danger">This showcase is full</span><h2>Stay connected to future showcase opportunities</h2><p>Leave your contact details and a member of the Stratex team will contact you by email or phone to arrange a way for you to see more ScoutLink showcase events.</p></header>' +
      '<form data-professional-form="sold-out" novalidate><div class="two-col">' +
        field('First name', 'firstName', 'text', state.data.firstName) +
        field('Last name', 'lastName', 'text', state.data.lastName) +
        field('Email address', 'email', 'email', state.data.email) +
        field('Phone number', 'phone', 'tel', state.data.phone) +
      '</div>' +
      '<section class="limited-space-message"><span>Future showcase access</span><p>This form does not confirm a place at the current event. Our team will contact you about future showcase viewing opportunities and other ways to see ScoutLink talent live.</p></section>' +
      '<p class="privacy-copy">Your details are stored securely and used only to contact you about ScoutLink showcase opportunities.</p><div class="form-message" data-form-message hidden></div></form>';
  }

  function waitlistCompleteContent() {
    var result = state.result || {};
    return '<section class="success-mark">✓</section>' +
      '<header class="registration-intro centred"><span class="section-kicker">Details received</span><h2>Our team will contact you</h2><p>A member of the Stratex team will contact you by email or phone to arrange a way for you to see more ScoutLink showcase events.</p></header>' +
      '<section class="ticket-panel"><div><small>Name</small><b>' + escapeHtml(state.data.firstName + ' ' + state.data.lastName) + '</b></div><div><small>Reference</small><b>' + escapeHtml(result.registrationReference || 'Saved') + '</b></div><div><small>Email</small><b>' + escapeHtml(state.data.email) + '</b></div><div><small>Phone</small><b>' + escapeHtml(state.data.phone) + '</b></div></section>' +
      '<section class="support-panel"><b>This is not a confirmed place at the current event</b><p>Please wait for our team to contact you before travelling to any showcase.</p></section>' +
      '<a class="btn primary large" href="/">Return to Stratex Analytics</a>';
  }

  function currentContent() {
    if (state.status === 'complete') return completeContent();
    if (state.status === 'waitlist-complete') return waitlistCompleteContent();
    if (state.status === 'sold-out') return soldOutFormContent();
    if (state.step === 1) return detailsContent();
    if (state.step === 2) return attendanceContent();
    return landingContent();
  }

  function titles() {
    if (state.status === 'complete') return ['See the next generation live.', 'Your free coach or scout registration is confirmed.'];
    if (state.status === 'waitlist-complete') return ['Stay close to the action.', 'Your contact details have been received by Stratex.'];
    if (state.status === 'sold-out') return ['This showcase is full.', 'Leave your details and our team will contact you about more ScoutLink showcase events.'];
    if (state.step === 2) return ['One final confirmation.', 'Check the date, time and venue before submitting.'];
    return ['Be there when talent gets noticed.', 'Watch live football, meet coaches and discover players with more context.'];
  }

  function actions() {
    if (state.status === 'sold-out') {
      return '<button class="btn primary" type="button" data-action="submit-sold-out" ' + (state.submitting ? 'disabled' : '') + '>' + (state.submitting ? 'Saving details…' : 'Ask the team to contact me') + '</button>';
    }
    if (state.status || state.step === 0) return '';
    var back = '<button class="btn secondary" type="button" data-action="back">Back</button>';
    if (state.step === 1) return back + '<button class="btn primary" type="button" data-action="continue">Continue to attendance</button>';
    return back + '<button class="btn primary" type="button" data-action="submit" ' + (state.submitting ? 'disabled' : '') + '>' + (state.submitting ? 'Submitting…' : 'Confirm free registration') + '</button>';
  }

  function render(options) {
    options = options || {};
    var titlePair = titles();
    var content = currentContent();
    var footerActions = actions();
    root.innerHTML =
      '<section class="showcase-desktop-only public-page desktop">' + publicHeader() + '<main class="public-main">' + campaignPanel(titlePair[0], titlePair[1]) + '<section class="registration-panel ' + ((state.step === 0 || state.status) ? 'compact' : '') + '">' + content + (footerActions ? '<footer class="form-actions">' + footerActions + '</footer>' : '') + '</section></main>' + publicFooter() + '</section>' +
      '<section class="showcase-mobile-only public-page mobile">' + mobileHeader() + '<main class="mobile-public-main">' + mobileCampaign(titlePair[0], state.step ? 'Step ' + state.step + ' of 2' : titlePair[1]) + '<section class="mobile-registration-content">' + content + '</section></main>' +
        (state.step === 0 && !state.status ? '<footer class="mobile-sticky-actions"><button class="btn primary" type="button" data-action="start">Start registration</button></footer>' : footerActions ? '<footer class="mobile-sticky-actions">' + footerActions + '</footer>' : '') +
      '</section>';
    bindEvents();
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

  function collectActiveInputs() {
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
    var page = activePage();
    page.querySelectorAll('[name="role"]').forEach(function (input) {
      var card = input.closest('.choice-card');
      if (card) card.classList.toggle('selected', input.checked);
    });
  }

  function scrollCurrentContainerToTop() {
    var page = activePage();
    var scroller = page.querySelector('.mobile-public-main') || page.querySelector('.registration-panel');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setMessage(message, success) {
    var node = activePage().querySelector('[data-form-message]');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
    node.classList.toggle('success', !!success);
    if (message) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function publicSupabaseConfig() {
    var config = window.SL_CONFIG || {};
    return {
      url: String(config.SUPABASE_URL || '').replace(/\/$/, ''),
      key: String(config.SUPABASE_ANON_KEY || '')
    };
  }

  function validateSoldOutDetails() {
    collectActiveInputs();
    if (!String(state.data.firstName || '').trim() || !String(state.data.lastName || '').trim()) return 'Enter the first name and last name.';
    if (!validEmail(state.data.email)) return 'Enter a valid email address.';
    if (!String(state.data.phone || '').trim()) return 'Enter a phone number.';
    return '';
  }

  function validateDetails() {
    collectActiveInputs();
    if (!String(state.data.firstName || '').trim() || !String(state.data.lastName || '').trim()) return 'Enter the first name and last name.';
    if (!validEmail(state.data.email)) return 'Enter a valid email address.';
    if (!String(state.data.phone || '').trim()) return 'Enter a phone number.';
    if (!String(state.data.teamName || '').trim()) return 'Enter the team or organisation name.';
    if (['coach', 'scout', 'both'].indexOf(state.data.role) < 0) return 'Choose Coach, Scout or Both.';
    return '';
  }

  function validateAttendance() {
    collectActiveInputs();
    if (!state.data.attendanceConfirmed) return 'Confirm that you are 100% sure you can attend at ' + professionalArrivalLabel() + '.';
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

  async function submitSoldOutInterest() {
    var validationError = validateSoldOutDetails();
    if (validationError) {
      setMessage(validationError, false);
      return;
    }

    var config = publicSupabaseConfig();
    if (!config.url || !config.key) {
      setMessage('The contact form is not configured. Please email people@stratexanalytics.co.uk.', false);
      return;
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
          p_event_key: 'bluewater-2026-09-12',
          p_first_name: String(state.data.firstName || '').trim(),
          p_last_name: String(state.data.lastName || '').trim(),
          p_email: String(state.data.email || '').trim(),
          p_phone: String(state.data.phone || '').trim()
        })
      }, 'Your details could not be saved. Check your connection and try again.');

      state.result = payload || {};
      state.submitting = false;
      state.step = 0;
      state.status = 'waitlist-complete';
      updateUrl('sold-out');
      saveState();
      render({ top: true });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'Your details could not be saved. Please try again.', false);
    }
  }

  async function submitRegistration() {
    var detailsError = validateDetails();
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
      state.status = payload.status === 'waitlisted' ? 'waitlist-complete' : 'complete';
      updateUrl(state.status === 'waitlist-complete' ? 'sold-out' : 'complete');
      saveState();
      render({ top: true });
    } catch (error) {
      state.submitting = false;
      render();
      setMessage(error.message || 'The registration could not be saved. Please try again.', false);
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
    page.querySelectorAll('[name="role"]').forEach(function (input) {
      input.addEventListener('change', function () {
        collectActiveInputs();
        syncRoleCards();
      });
    });
    page.querySelectorAll('[name="attendanceConfirmed"]').forEach(function (input) {
      input.addEventListener('change', collectActiveInputs);
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
        } else if (action === 'continue') {
          var error = validateDetails();
          if (error) return setMessage(error, false);
          state.step = 2;
          updateUrl(2);
          saveState();
          render({ top: true });
        } else if (action === 'edit') {
          collectActiveInputs();
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
    root.innerHTML = '<div class="admin-loading">Loading showcase registration…</div>';
    try {
      var payload = await fetchJson(API + '/api/showcase/registrations/config', {}, 'The showcase event could not be loaded.');
      state.event = payload.event;
      state.capacity = payload.professionalCapacity || payload.capacity || null;
      var route = routeState();
      if (route === 'complete' && state.result) {
        state.status = 'complete';
        state.step = 0;
      } else if (route === 'sold-out') {
        state.status = state.status === 'waitlist-complete' && state.result
          ? 'waitlist-complete'
          : 'sold-out';
        state.step = 0;
      } else {
        state.status = '';
        state.step = Number(route) || state.step || 0;
      }
      saveState();
      render();
    } catch (error) {
      root.innerHTML = '<section class="support-panel" style="margin:30px"><b>Registration could not load</b><p>' + escapeHtml(error.message || 'The showcase event could not be loaded.') + ' Contact people@stratexanalytics.co.uk if the problem continues.</p></section>';
    }
  }

  restoreState();

  window.addEventListener('popstate', function () {
    var route = routeState();
    if (route === 'complete') {
      state.status = state.result ? 'complete' : '';
      state.step = 0;
    } else if (route === 'sold-out') {
      state.status = state.status === 'waitlist-complete' && state.result
        ? 'waitlist-complete'
        : 'sold-out';
      state.step = 0;
    } else {
      state.status = '';
      state.step = typeof route === 'number' ? route : 0;
    }
    render({ top: true });
  });

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var mobile = window.matchMedia('(max-width:' + MOBILE_BREAKPOINT + 'px)').matches;
      if (mobile !== lastMobile) {
        lastMobile = mobile;
        render();
      }
    }, 180);
  });

  loadConfig();
}());

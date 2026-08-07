(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var root = document.getElementById('showcaseAdminApp');
  var state = {
    tab: 'players',
    query: '',
    age: '',
    position: '',
    overview: null,
    selected: null,
    selectedType: '',
    loading: false
  };

  function auth() {
    try {
      return typeof Auth !== 'undefined' ? Auth : null;
    } catch (_) {
      return null;
    }
  }

  function token() {
    var account = auth();
    if (account && account.token) return account.token;
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function accountType() {
    var account = auth();
    if (account && account.type) return account.type;
    try {
      return localStorage.getItem('sl_type') || '';
    } catch (_) {
      return '';
    }
  }

  function user() {
    var account = auth();
    if (account && account.user) return account.user;
    try {
      return JSON.parse(localStorage.getItem('sl_user') || '{}');
    } catch (_) {
      return {};
    }
  }

  function isLoggedIn() {
    var account = auth();
    return !!(
      token() &&
      String(accountType()).toLowerCase() === 'stratex' &&
      (!account || !account.isLoggedIn || account.isLoggedIn())
    );
  }

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

  function fullName(record) {
    record = record || {};
    return [record.first_name || record.firstName, record.last_name || record.lastName]
      .filter(Boolean)
      .join(' ') || record.name || record.email || 'Registrant';
  }

  function initials(record) {
    return fullName(record)
      .split(/\s+/)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';
  }

  function dateLabel(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function roleDisplay(value) {
    return {
      coach: 'Coach',
      scout: 'Scout',
      both: 'Coach and Scout'
    }[value] || String(value || '—');
  }

  function footDisplay(value) {
    return {
      left: 'Left',
      right: 'Right',
      both: 'Both'
    }[value] || String(value || '—');
  }

  function eventRecord() {
    return state.overview && state.overview.event
      ? state.overview.event
      : {};
  }

  function formatTime(value, fallback) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return fallback;
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? 'PM' : 'AM';
    return (hour % 12 || 12) + ':' + match[2] + ' ' + suffix;
  }

  function eventDateLabel() {
    var value = eventRecord().event_date || '2026-09-12';
    var date = new Date(value + 'T12:00:00Z');
    if (Number.isNaN(date.getTime())) return '12 September 2026';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function playerArrivalLabel() {
    return formatTime(eventRecord().player_arrival_time, '12:00 PM');
  }

  function professionalArrivalLabel() {
    return formatTime(eventRecord().professional_arrival_time, '12:30 PM');
  }

  function venueName() {
    return eventRecord().venue_name || 'Ballerz Air Dome, Bluewater';
  }

  function statusClass(value) {
    var text = String(value || '').toLowerCase();
    if (/selected|confirmed|registered|promoted/.test(text)) return 'confirmed';
    if (/contacted/.test(text)) return 'contacted';
    if (/new|waiting/.test(text)) return 'new';
    return 'no';
  }

  async function api(method, path, body) {
    var options = {
      method: method,
      headers: {
        Authorization: 'Bearer ' + token()
      },
      credentials: 'include'
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    var response = await fetch(API + path, options);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
    return payload;
  }

  function adminMenu() {
    return '<aside class="admin-sidebar">' +
      '<a class="admin-brand" href="/admin"><span>SA</span><div><b>Stratex Admin</b><small>Internal operations</small></div></a>' +
      '<nav>' +
        '<a href="/admin">Dashboard</a>' +
        '<a href="/admin/registrations">Registrations</a>' +
        '<a href="/admin/contact-forms">Contact Forms</a>' +
        '<a href="/admin/crm">CRM</a>' +
        '<a href="/admin/website-activity">Website Activity</a>' +
        '<a href="/admin/blog">Blog / Learning Centre</a>' +
        '<a href="/admin/leadership">Leadership</a>' +
        '<a href="/admin/org-charts">Org Charts</a>' +
        '<a href="/admin/my-profile">My Profile</a>' +
        '<a href="/admin/contracts-pay">Contracts &amp; Pay</a>' +
        '<a href="/admin/hiring">Hiring</a>' +
        '<a href="/admin/trust-concerns">Trust &amp; Concerns</a>' +
        '<a href="/admin/settings">Settings</a>' +
        '<a class="active" href="/admin/showcase-event">Showcase Event</a>' +
        '<a href="/admin/award-ceremonies">Award Ceremonies</a>' +
      '</nav>' +
      '<div class="admin-user"><span>' + escapeHtml(initials(user())) + '</span><div><b>' + escapeHtml(fullName(user())) + '</b><small>' + escapeHtml(user().job_title || user().admin_role || 'Stratex Admin') + '</small></div></div>' +
    '</aside>';
  }

  function mobileBottom() {
    return '<nav class="mobile-admin-bottom">' +
      '<a href="/admin">Home</a>' +
      '<a href="/admin/registrations">Registrations</a>' +
      '<a class="active" href="/admin/showcase-event">Showcase</a>' +
      '<a href="/admin/trust-concerns">Concerns</a>' +
      '<a href="/admin/settings">Settings</a>' +
    '</nav>';
  }

  function shell(content, title) {
    root.innerHTML = '<section class="admin-page desktop">' +
      adminMenu() +
      '<main class="admin-main">' +
        '<header class="admin-topbar"><div><small>/admin/showcase-event</small><h1>' + escapeHtml(title || 'Showcase Event') + '</h1></div><div><button type="button" data-refresh>Refresh</button><button type="button">' + escapeHtml(fullName(user())) + '</button></div></header>' +
        '<section class="admin-content">' + content + '</section>' +
      '</main>' +
    '</section>' + mobileBottom() + '<div data-modal-root></div>';
    bindCommon();
  }

  function metric(label, value, copy) {
    return '<article><small>' + escapeHtml(label) + '</small><b>' + escapeHtml(value) + '</b><span>' + escapeHtml(copy) + '</span></article>';
  }

  function overviewPage() {
    if (!state.overview) return '<div class="admin-loading">Loading showcase registrations…</div>';
    var metrics = state.overview.metrics;
    var percentage = metrics.professionalCapacity
      ? Math.min(100, Math.round((metrics.professionalRegistrations / metrics.professionalCapacity) * 100))
      : 0;
    var rows = filteredRows();
    return '<section class="admin-hero"><div><span>Event operations</span><h2>' + escapeHtml(eventRecord().event_name || 'ScoutLink Showcase Event') + '</h2><p>Manage player applications, professional attendance and the sold-out waitlist from one workspace.</p></div><button class="btn primary" type="button" data-refresh>Refresh registrations</button></section>' +
      '<section class="admin-metrics">' +
        metric('Player registrations', metrics.playerRegistrations, 'All player ages') +
        metric('Coach and scout places', metrics.professionalRegistrations + ' / ' + metrics.professionalCapacity, metrics.professionalRemaining + ' places remaining') +
        metric('Waitlist', metrics.waitlist, 'Opens automatically at ' + metrics.professionalCapacity) +
        metric('Highlight videos', metrics.highlightVideos, 'Private uploads') +
      '</section>' +
      '<section class="capacity-control"><div><small>Professional registration status</small><b>' + (metrics.professionalRemaining > 0 ? 'Open' : 'Sold out') + '</b><p>The public page changes to sold out automatically when ' + metrics.professionalCapacity + ' combined coach and scout places are reached.</p></div><div class="capacity-meter"><span style="width:' + percentage + '%"></span></div><strong>' + metrics.professionalRegistrations + ' of ' + metrics.professionalCapacity + '</strong></section>' +
      '<section class="admin-tabs">' +
        '<button class="' + (state.tab === 'players' ? 'active' : '') + '" type="button" data-tab="players">Players <span>' + metrics.playerRegistrations + '</span></button>' +
        '<button class="' + (state.tab === 'professionals' ? 'active' : '') + '" type="button" data-tab="professionals">Coaches and scouts <span>' + metrics.professionalRegistrations + '</span></button>' +
        '<button class="' + (state.tab === 'waitlist' ? 'active' : '') + '" type="button" data-tab="waitlist">Waitlist <span>' + metrics.waitlist + '</span></button>' +
      '</section>' +
      toolbar() +
      '<section class="admin-table"><header><span>' + tabTitle() + '</span><small>Click any row to open the full registration profile.</small></header>' + desktopTable(rows) + mobileList(rows) + '</section>';
  }

  function toolbar() {
    var playerFilters = state.tab === 'players'
      ? '<label><span>Age</span><select data-filter-age><option value="">All ages</option>' + [12, 13, 14, 15, 16].map(function (age) {
        return '<option value="' + age + '" ' + (String(state.age) === String(age) ? 'selected' : '') + '>' + age + '</option>';
      }).join('') + '</select></label>' +
      '<label><span>Position</span><select data-filter-position><option value="">All positions</option>' + [
        'Goalkeeper',
        'Defender',
        'Midfielder',
        'Forward'
      ].map(function (position) {
        return '<option value="' + position + '" ' + (state.position === position ? 'selected' : '') + '>' + position + '</option>';
      }).join('') + '</select></label>'
      : '<label><span>Role</span><select data-filter-position><option value="">All roles</option><option value="coach">Coach</option><option value="scout">Scout</option><option value="both">Both</option></select></label><span></span>';
    return '<section class="admin-toolbar"><label><span>Search</span><input data-search value="' + escapeHtml(state.query) + '" placeholder="Name, team, coach or email"></label>' + playerFilters + '<button class="btn primary" type="button" data-apply-filters>Apply filters</button></section>';
  }

  function tabTitle() {
    if (state.tab === 'professionals') return 'Coaches and scouts';
    if (state.tab === 'waitlist') return 'Professional waitlist';
    return 'Players';
  }

  function positionGroupMatch(positions, filter) {
    if (!filter) return true;
    var values = positions || [];
    if (filter === 'Goalkeeper') return values.includes('Goalkeeper');
    if (filter === 'Defender') return values.some(function (value) { return /back|defensive/i.test(value); });
    if (filter === 'Midfielder') return values.some(function (value) { return /midfield|wing/i.test(value); });
    if (filter === 'Forward') return values.some(function (value) { return /striker|wing/i.test(value); });
    return true;
  }

  function filteredRows() {
    if (!state.overview) return [];
    var source = state.tab === 'players'
      ? state.overview.players
      : state.tab === 'professionals'
        ? state.overview.professionals
        : state.overview.waitlist;
    var query = state.query.toLowerCase().trim();
    return (source || []).filter(function (row) {
      var searchable = [
        fullName(row),
        row.email,
        row.player_email,
        row.guardian_email,
        row.team_name,
        row.coach_name,
        row.phone,
        row.player_phone,
        row.guardian_phone,
        row.role
      ].filter(Boolean).join(' ').toLowerCase();
      if (query && searchable.indexOf(query) < 0) return false;
      if (state.tab === 'players') {
        if (state.age && String(row.age_on_event_date) !== String(state.age)) return false;
        if (!positionGroupMatch(row.positions, state.position)) return false;
      } else if (state.position && row.role !== state.position) {
        return false;
      }
      return true;
    });
  }

  function desktopTable(rows) {
    if (!rows.length) return '<div class="admin-empty">No registrations match the current filters.</div>';
    if (state.tab === 'players') {
      return '<table><thead><tr><th>Player</th><th>Age</th><th>Team</th><th>Positions</th><th>Contact</th><th>Video</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (row) {
        return '<tr data-open-type="player" data-open-id="' + escapeHtml(row.id) + '"><td><b>' + escapeHtml(fullName(row)) + '</b><small>Registered ' + escapeHtml(dateLabel(row.submitted_at)) + '</small></td><td>' + escapeHtml(row.age_on_event_date) + '</td><td>' + escapeHtml(row.team_name || 'No team provided') + '</td><td>' + escapeHtml((row.positions || []).join(', ')) + '</td><td>' + (row.contact_type === 'guardian' ? 'Guardian' : 'Player') + '</td><td><span class="pill ' + (row.highlight_storage_path ? 'yes' : 'no') + '">' + (row.highlight_storage_path ? 'Uploaded' : 'None') + '</span></td><td><span class="pill ' + statusClass(row.status) + '">' + escapeHtml(row.status || 'New') + '</span></td><td><button type="button">Open profile</button></td></tr>';
      }).join('') + '</tbody></table>';
    }
    return '<table><thead><tr><th>Registrant</th><th>Organisation</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>' + rows.map(function (row) {
      var type = state.tab === 'waitlist' ? 'waitlist' : 'professional';
      return '<tr data-open-type="' + type + '" data-open-id="' + escapeHtml(row.id) + '"><td><b>' + escapeHtml(fullName(row)) + '</b></td><td>' + escapeHtml(row.team_name) + '</td><td>' + escapeHtml(roleDisplay(row.role)) + '</td><td>' + escapeHtml(row.email) + '</td><td>' + escapeHtml(row.phone) + '</td><td><span class="pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td><td>' + escapeHtml(dateLabel(row.submitted_at)) + '</td><td><button type="button">Open profile</button></td></tr>';
    }).join('') + '</tbody></table>';
  }

  function mobileList(rows) {
    if (!rows.length) return '';
    return '<section class="mobile-admin-list-live">' + rows.map(function (row) {
      var type = state.tab === 'players' ? 'player' : state.tab === 'waitlist' ? 'waitlist' : 'professional';
      var meta = state.tab === 'players'
        ? 'Age ' + row.age_on_event_date + ' · ' + (row.team_name || 'No team')
        : roleDisplay(row.role) + ' · ' + row.team_name;
      var copy = state.tab === 'players'
        ? (row.positions || []).join(', ') + ' · ' + (row.contact_type === 'guardian' ? 'Guardian contact' : 'Player contact')
        : row.email;
      return '<article data-open-type="' + type + '" data-open-id="' + escapeHtml(row.id) + '"><div><span class="avatar">' + escapeHtml(initials(row)) + '</span><div><b>' + escapeHtml(fullName(row)) + '</b><small>' + escapeHtml(meta) + '</small><p>' + escapeHtml(copy) + '</p></div></div><span class="pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></article>';
    }).join('') + '</section>';
  }

  function detailItems(items) {
    return '<dl>' + items.map(function (item) {
      return '<div><dt>' + escapeHtml(item[0]) + '</dt><dd>' + escapeHtml(item[1] == null || item[1] === '' ? '—' : item[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function playerProfile(row) {
    var assigned = row.assignedCoach || null;
    var contactEmail = row.contact_type === 'guardian' ? row.guardian_email : row.player_email;
    var contactPhone = row.contact_type === 'guardian' ? row.guardian_phone : row.player_phone;
    return '<header class="profile-page-header"><button class="back-link" type="button" data-back>← Back to players</button><div><span class="avatar large">' + escapeHtml(initials(row)) + '</span><div><small>Player registration</small><h2>' + escapeHtml(fullName(row)) + '</h2><p>Age ' + escapeHtml(row.age_on_event_date) + ' on event date · Registered ' + escapeHtml(dateLabel(row.submitted_at)) + '</p></div></div><div class="profile-actions"><button class="btn" type="button" data-mark-contacted>Mark contacted</button><button class="btn primary" type="button" data-select-player>' + (row.selected_for_showcase ? 'Change assigned coach' : 'Confirm place') + '</button></div></header>' +
      '<section class="profile-status-line"><span class="pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span><p>' + (row.contact_type === 'guardian' ? 'Guardian contact required because the player will be aged 12–14 on ' + escapeHtml(eventDateLabel()) + '.' : 'The player supplied their own contact information because they will be aged 15–16.') + '</p></section>' +
      (row.selected_for_showcase ? '<section class="professional-capacity-profile"><div><small>Showcase selection</small><b>Player selected</b><p>Assigned event coach: ' + escapeHtml(assigned ? fullName(assigned) : 'Not assigned') + '</p></div><span class="pill confirmed">Selected</span></section>' : '') +
      '<section class="profile-grid"><article class="profile-section"><header><span>Personal details</span></header>' + detailItems([
        ['First name', row.first_name],
        ['Last name', row.last_name],
        ['Date of birth', row.date_of_birth],
        ['Age on event date', row.age_on_event_date],
        [row.contact_type === 'guardian' ? 'Guardian email' : 'Player email', contactEmail],
        [row.contact_type === 'guardian' ? 'Guardian phone' : 'Player phone', contactPhone]
      ]) + '</article>' +
      '<article class="profile-section"><header><span>Football information</span></header>' + detailItems([
        ['Currently plays for a team', row.currently_plays_for_team ? 'Yes' : 'No'],
        ['Team type', row.team_type ? row.team_type.replace('_', '-') : 'No team'],
        ['Team', row.team_name || 'No team provided'],
        ['Coach', row.coach_name || 'No coach provided'],
        ['Positions', (row.positions || []).join(', ')],
        ['Can play goalkeeper', row.can_play_goalkeeper ? 'Yes' : 'No'],
        ['Preferred foot', footDisplay(row.preferred_foot)]
      ]) + '</article>' +
      '<article class="profile-section video-section"><header><span>Highlight video</span>' + (row.highlight_storage_path ? '<button type="button" data-open-highlight>Open private file</button>' : '') + '</header><div class="video-preview"><span>' + (row.highlight_storage_path ? '▶' : '—') + '</span><div><b>' + escapeHtml(row.highlight_file_name || 'No highlight video supplied') + '</b><small>' + (row.highlight_storage_path ? 'Private Supabase Storage file' : 'The upload was optional') + '</small></div></div></article>' +
      '<article class="profile-section"><header><span>Attendance and consent</span></header><ul class="confirmation-evidence"><li><span>✓</span><div><b>Travel confirmed</b><small>Can attend ' + escapeHtml(venueName()) + ' for ' + escapeHtml(playerArrivalLabel()) + '.</small></div></li>' + (row.contact_type === 'guardian' ? '<li><span>✓</span><div><b>Parent or guardian aware</b><small>Confirmed during registration.</small></div></li>' : '') + '</ul></article>' +
      '<article class="profile-section"><header><span>Internal notes</span></header><textarea data-notes placeholder="Add a note visible only to authorised Stratex Admin users.">' + escapeHtml(row.internal_notes || '') + '</textarea><div style="padding:0 11px 11px"><button class="btn primary" type="button" data-save-notes>Save note</button><div data-profile-message></div></div></article></section>';
  }

  function professionalProfile(row, isWaitlist) {
    var statusCopy = isWaitlist
      ? 'This registration is on the sold-out waitlist and does not occupy a professional place.'
      : 'This registration occupies one combined coach and scout place unless cancelled or declined.';
    return '<header class="profile-page-header"><button class="back-link" type="button" data-back>← Back to ' + (isWaitlist ? 'waitlist' : 'coaches and scouts') + '</button><div><span class="avatar large dark">' + escapeHtml(initials(row)) + '</span><div><small>' + (isWaitlist ? 'Professional waitlist' : 'Coach and scout registration') + '</small><h2>' + escapeHtml(fullName(row)) + '</h2><p>' + escapeHtml(roleDisplay(row.role)) + ' · ' + escapeHtml(row.team_name) + ' · Registered ' + escapeHtml(dateLabel(row.submitted_at)) + '</p></div></div><div class="profile-actions"><button class="btn" type="button" data-mark-contacted>Mark contacted</button>' + (!isWaitlist ? '<button class="btn primary" type="button" data-confirm-professional>Confirm attendance</button>' : '') + '</div></header>' +
      '<section class="professional-capacity-profile"><div><small>' + (isWaitlist ? 'Waitlist status' : 'Professional place') + '</small><b>' + escapeHtml(row.status) + '</b><p>' + escapeHtml(statusCopy) + '</p></div><span class="pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></section>' +
      '<section class="profile-grid professional"><article class="profile-section"><header><span>Contact details</span></header>' + detailItems([
        ['First name', row.first_name],
        ['Last name', row.last_name],
        ['Email', row.email],
        ['Phone', row.phone],
        ['Team or organisation', row.team_name],
        ['Role', roleDisplay(row.role)]
      ]) + '</article><article class="profile-section"><header><span>Attendance verification</span></header><ul class="confirmation-evidence"><li><span>✓</span><div><b>100% attendance confirmation</b><small>Confirmed attendance for ' + escapeHtml(professionalArrivalLabel()) + ' at ' + escapeHtml(venueName()) + '.</small></div></li><li><span>✓</span><div><b>Free registration</b><small>No payment was requested or taken.</small></div></li></ul></article>' +
      '<article class="profile-section full-width"><header><span>Internal notes</span></header><textarea data-notes placeholder="Add professional attendance notes or contact history.">' + escapeHtml(row.internal_notes || '') + '</textarea><div style="padding:0 11px 11px"><button class="btn primary" type="button" data-save-notes>Save note</button><div data-profile-message></div></div></article></section>';
  }

  function renderProfile() {
    var content = state.selectedType === 'player'
      ? playerProfile(state.selected)
      : professionalProfile(state.selected, state.selectedType === 'waitlist');
    shell(content, state.selectedType === 'player' ? 'Player Registration' : 'Professional Registration');
    bindProfile();
  }

  function profileMessage(message, error) {
    var node = document.querySelector('[data-profile-message]');
    if (!node) return;
    node.className = 'admin-message' + (error ? ' error' : '');
    node.textContent = message;
  }

  async function openProfile(type, id) {
    state.loading = true;
    shell('<div class="admin-loading">Loading registration profile…</div>', 'Showcase Registration');
    try {
      var response = await api('GET', '/api/showcase/registrations/admin/' + type + '/' + encodeURIComponent(id));
      state.selected = response.data;
      state.selectedType = type;
      renderProfile();
    } catch (error) {
      shell('<div class="admin-message error">' + escapeHtml(error.message) + '</div>', 'Showcase Registration');
    } finally {
      state.loading = false;
    }
  }

  function coachOptions() {
    var professionals = state.overview ? state.overview.professionals || [] : [];
    return professionals.filter(function (row) {
      return ['coach', 'both'].includes(row.role) && !['cancelled', 'declined'].includes(row.status);
    });
  }

  function openCoachModal() {
    var coaches = coachOptions();
    var current = state.selected.assigned_event_coach_id || '';
    var modalRoot = document.querySelector('[data-modal-root]');
    modalRoot.innerHTML = '<div class="admin-modal-host"><section class="admin-modal" role="dialog" aria-modal="true"><header><h2>Confirm player and assign event coach</h2><button class="admin-modal-close" type="button" data-close-modal>×</button></header><div class="admin-modal-body"><p>The coach assignment applies only to this showcase event.</p><label class="admin-select-coach"><span>Assigned event coach</span><select data-assigned-coach><option value="">Choose a coach</option>' + coaches.map(function (coach) {
      return '<option value="' + escapeHtml(coach.id) + '" ' + (String(current) === String(coach.id) ? 'selected' : '') + '>' + escapeHtml(fullName(coach) + ' · ' + roleDisplay(coach.role) + ' · ' + coach.team_name) + '</option>';
    }).join('') + '</select></label><div data-modal-message></div></div><footer class="admin-modal-actions"><button class="btn" type="button" data-close-modal>Cancel</button><button class="btn primary" type="button" data-confirm-selection>Confirm player</button></footer></section></div>';
    modalRoot.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () { modalRoot.innerHTML = ''; });
    });
    modalRoot.querySelector('[data-confirm-selection]').addEventListener('click', async function () {
      var assignedCoachId = modalRoot.querySelector('[data-assigned-coach]').value;
      var message = modalRoot.querySelector('[data-modal-message]');
      if (!assignedCoachId) {
        message.className = 'admin-message error';
        message.textContent = 'Choose an event coach.';
        return;
      }
      try {
        await api('PATCH', '/api/showcase/registrations/admin/player/' + encodeURIComponent(state.selected.id) + '/selection', {
          selected: true,
          assignedCoachId: assignedCoachId
        });
        modalRoot.innerHTML = '';
        await loadOverview();
        await openProfile('player', state.selected.id);
      } catch (error) {
        message.className = 'admin-message error';
        message.textContent = error.message;
      }
    });
  }

  function bindProfile() {
    var back = document.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () {
      state.selected = null;
      state.selectedType = '';
      renderOverview();
    });
    var contacted = document.querySelector('[data-mark-contacted]');
    if (contacted) contacted.addEventListener('click', async function () {
      try {
        await api('PATCH', '/api/showcase/registrations/admin/' + state.selectedType + '/' + encodeURIComponent(state.selected.id), {
          status: 'contacted'
        });
        await loadOverview();
        await openProfile(state.selectedType, state.selected.id);
      } catch (error) {
        profileMessage(error.message, true);
      }
    });
    var selectPlayer = document.querySelector('[data-select-player]');
    if (selectPlayer) selectPlayer.addEventListener('click', openCoachModal);
    var confirmProfessional = document.querySelector('[data-confirm-professional]');
    if (confirmProfessional) confirmProfessional.addEventListener('click', async function () {
      try {
        await api('PATCH', '/api/showcase/registrations/admin/professional/' + encodeURIComponent(state.selected.id), {
          status: 'confirmed'
        });
        await loadOverview();
        await openProfile('professional', state.selected.id);
      } catch (error) {
        profileMessage(error.message, true);
      }
    });
    var notesButton = document.querySelector('[data-save-notes]');
    if (notesButton) notesButton.addEventListener('click', async function () {
      var notes = document.querySelector('[data-notes]').value;
      try {
        await api('PATCH', '/api/showcase/registrations/admin/' + state.selectedType + '/' + encodeURIComponent(state.selected.id), {
          internalNotes: notes
        });
        state.selected.internal_notes = notes;
        profileMessage('Internal note saved.', false);
        await loadOverview(false);
      } catch (error) {
        profileMessage(error.message, true);
      }
    });
    var highlight = document.querySelector('[data-open-highlight]');
    if (highlight) highlight.addEventListener('click', async function () {
      try {
        var response = await api('GET', '/api/showcase/registrations/admin/player/' + encodeURIComponent(state.selected.id) + '/highlight');
        window.open(response.url, '_blank', 'noopener');
      } catch (error) {
        profileMessage(error.message, true);
      }
    });
  }

  function bindCommon() {
    document.querySelectorAll('[data-refresh]').forEach(function (button) {
      button.addEventListener('click', function () { loadOverview(); });
    });
  }

  function bindOverview() {
    document.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.tab = button.dataset.tab;
        state.age = '';
        state.position = '';
        renderOverview();
      });
    });
    var search = document.querySelector('[data-search]');
    if (search) search.addEventListener('input', function () {
      state.query = search.value;
    });
    var age = document.querySelector('[data-filter-age]');
    if (age) age.addEventListener('change', function () { state.age = age.value; });
    var position = document.querySelector('[data-filter-position]');
    if (position) position.addEventListener('change', function () { state.position = position.value; });
    var apply = document.querySelector('[data-apply-filters]');
    if (apply) apply.addEventListener('click', renderOverview);
    document.querySelectorAll('[data-open-type][data-open-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        openProfile(row.dataset.openType, row.dataset.openId);
      });
    });
  }

  function renderOverview() {
    shell(overviewPage(), 'Showcase Event');
    bindOverview();
  }

  async function loadOverview(renderAfter) {
    if (renderAfter !== false) {
      shell('<div class="admin-loading">Loading showcase registrations…</div>', 'Showcase Event');
    }
    try {
      state.overview = await api('GET', '/api/showcase/registrations/admin/overview');
      if (renderAfter !== false) renderOverview();
    } catch (error) {
      shell('<div class="admin-message error">' + escapeHtml(error.message) + '</div>', 'Showcase Event');
    }
  }

  function start() {
    if (!isLoggedIn()) {
      window.location.replace('/admin?return=' + encodeURIComponent('/admin/showcase-event'));
      return;
    }
    loadOverview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());

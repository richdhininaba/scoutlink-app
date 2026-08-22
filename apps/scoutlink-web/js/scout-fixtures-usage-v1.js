


'use strict';

(function () {
  if (window.__SCOUTLINK_FIXTURES_USAGE_V1__) return;
  window.__SCOUTLINK_FIXTURES_USAGE_V1__ = true;

  var VERSION = '20260822.1';
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var STYLE_ID = 'slScoutFixturesUsageV1Style';
  var DEMO_USAGE_KEY = 'sl_demo_usage_requests_v2';
  var observer = null;
  var scheduled = false;
  var repairing = false;
  var fixturesCache = null;
  var usageCache = null;
  var fixturesPromise = null;
  var usagePromise = null;
  var pipelineCache = null;

  function normal(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function esc(value) {
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

  function token() {
    try { return localStorage.getItem('sl_token') || ''; } catch (_) { return ''; }
  }

  function apiBase() {
    try {
      return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, '');
    } catch (_) {
      return API_FALLBACK;
    }
  }

  function isDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        sessionStorage.getItem('sl_admin_demo') === '1' ||
        localStorage.getItem('sl_demo_mode') === '1' ||
        token() === 'public-demo-session';
    } catch (_) {
      return token() === 'public-demo-session';
    }
  }

  async function request(method, pathname, body, auth) {
    var headers = { Accept: 'application/json' };
    var accessToken = token();
    if (auth !== false && accessToken) headers.Authorization = 'Bearer ' + accessToken;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + pathname, {
      method: method,
      headers: headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined || body === null ? undefined : JSON.stringify(body)
    });

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function host() {
    return document.getElementById('scoutExperienceApp');
  }

  function shadow() {
    var app = host();
    return app && app.shadowRoot;
  }

  function q(root, selector) {
    return (root || shadow() || document).querySelector(selector);
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || shadow() || document).querySelectorAll(selector));
  }

  function route() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var pathname = String(location.pathname || '').toLowerCase().replace(/\/+$/, '');
    if (pathname.indexOf('/scout/fixtures') >= 0) return 'fixtures';
    if (pathname.indexOf('usage-requests') >= 0) return 'usage';
    return '';
  }

  function visibleRoot(root) {
    root = root || shadow();
    if (!root) return null;
    var mobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var selectors = mobile
      ? ['.slv9-mobile-copy', '.slv10-mobile-copy', '.field-copy', '[data-layout="mobile"]']
      : ['.slv9-desktop-copy', '.slv10-desktop-copy', '.desk-copy', '[data-layout="desktop"]'];

    for (var i = 0; i < selectors.length; i += 1) {
      var match = q(root, selectors[i]);
      if (match) return match;
    }
    return root;
  }

  function textOf(node) {
    return normal(node && node.textContent);
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (character) { return character.toUpperCase(); });
  }

  function readJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function ensureStyle(root) {
    if (!root || q(root, '#' + STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.sfu-empty{padding:14px 0;font:600 12px Archivo,Arial,sans-serif;color:#7C8A82}',
      '.sfu-booked-list,.sfu-history-list{display:grid;gap:9px}',
      '.sfu-booked-row,.sfu-history-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid #EBEFEC}',
      '.sfu-booked-row:last-child,.sfu-history-row:last-child{border-bottom:0}',
      '.sfu-copy{min-width:0;flex:1}',
      '.sfu-copy b{display:block;font:800 12px Archivo,Arial,sans-serif;color:#0C201A}',
      '.sfu-copy span{display:block;margin-top:4px;font:500 11px/1.45 Archivo,Arial,sans-serif;color:#7C8A82}',
      '.sfu-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}',
      '.sfu-action{appearance:none;border:1px solid #DCE3DE;border-radius:9px;background:#fff;color:#0C201A;padding:8px 10px;font:800 10px Archivo,Arial,sans-serif;cursor:pointer;text-decoration:none;white-space:nowrap}',
      '.sfu-action:hover{border-color:#9EB5AA}',
      '.sfu-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;background:#EEF4F0;color:#075F48;font:800 9px Archivo,Arial,sans-serif;white-space:nowrap}',
      '.sfu-status.pending{background:#FFF6DF;color:#87620A}',
      '.sfu-status.declined{background:#FAECE9;color:#96382D}',
      '.sfu-status.approved_free,.sfu-status.paid_and_applied{background:#EAF6F0;color:#075F48}',
      '.sfu-status.payment_link_sent{background:#EDF2FA;color:#2C5E9E}',
      '.sfu-calendar-highlight{outline:3px solid rgba(7,95,72,.22)!important;outline-offset:3px!important;border-radius:10px!important}',
      '.sfu-toast{position:fixed;right:20px;bottom:20px;z-index:999999;max-width:min(430px,calc(100vw - 40px));padding:12px 14px;border-radius:12px;background:#06201A;color:#fff;font:700 13px Archivo,Arial,sans-serif;box-shadow:0 18px 48px rgba(6,32,26,.22)}',
      '.sfu-toast.error{background:#96382D}',
      '@media(max-width:767px){.sfu-booked-row,.sfu-history-row{align-items:flex-start;flex-direction:column}.sfu-actions{width:100%}.sfu-action{flex:1;text-align:center}}'
    ].join('');
    root.appendChild(style);
  }

  function toast(message, isError) {
    var root = shadow();
    if (!root) return;
    var old = q(root, '.sfu-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'sfu-toast' + (isError ? ' error' : '');
    node.setAttribute('role', isError ? 'alert' : 'status');
    node.textContent = message;
    root.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.remove(); }, 3800);
  }

  function unwrapFixtures(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.fixtures)) return payload.fixtures;
    return [];
  }

  async function loadFixtures(force) {
    if (fixturesCache && !force) return fixturesCache;
    if (fixturesPromise && !force) return fixturesPromise;
    fixturesPromise = request('GET', '/api/scouts/fixtures').then(function (payload) {
      fixturesCache = unwrapFixtures(payload);
      fixturesPromise = null;
      return fixturesCache;
    }).catch(function (error) {
      fixturesPromise = null;
      if (isDemo()) return fixturesCache || [];
      throw error;
    });
    return fixturesPromise;
  }

  async function loadPipeline(force) {
    if (pipelineCache && !force) return pipelineCache;

    if (isDemo()) {
      try {
        var state = typeof window.getDemoState === 'function'
          ? window.getDemoState()
          : JSON.parse(sessionStorage.getItem('sl_public_demo_state') || '{}');
        pipelineCache = Array.isArray(state.pipeline) ? state.pipeline : [];
      } catch (_) {
        pipelineCache = [];
      }
      return pipelineCache;
    }

    var payload = await request('GET', '/api/scouts/pipeline?limit=100');
    pipelineCache = unwrapFixtures(payload);
    return pipelineCache;
  }


  function fixtureId(fixture) {
    return String(fixture && (fixture.id || fixture.fixture_id || fixture.fixtureId) || '');
  }

  function fixtureAttendance(fixture) {
    return fixture && (fixture.attendance || fixture.scout_attendance || fixture.scoutAttendance) || null;
  }

  function attendanceStatus(fixture) {
    var attendance = fixtureAttendance(fixture);
    return normal(attendance && (attendance.status || attendance.attendance_status || attendance.plan_status));
  }

  function isBookedFixture(fixture) {
    var status = attendanceStatus(fixture);
    return ['attending', 'confirmed', 'booked', 'accepted'].indexOf(status) >= 0;
  }

  function fixtureDateValue(fixture) {
    var raw = fixture && (
      fixture.kickoff_at || fixture.kickoffAt || fixture.fixture_datetime || fixture.fixtureDateTime ||
      fixture.fixture_date || fixture.fixtureDate || fixture.match_date || fixture.matchDate || fixture.date || fixture.start_time
    );
    if (!raw) return null;
    var timestamp = new Date(raw).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function fixtureTitle(fixture) {
    if (!fixture) return 'Fixture';
    if (fixture.fixture_name || fixture.fixtureName || fixture.name || fixture.title) {
      return fixture.fixture_name || fixture.fixtureName || fixture.name || fixture.title;
    }
    var home = fixture.home_team_name || fixture.homeTeamName || fixture.home_team || fixture.homeTeam;
    var away = fixture.away_team_name || fixture.awayTeamName || fixture.away_team || fixture.awayTeam;
    if (home && away) return home + ' vs ' + away;
    var team = fixture.team_name || fixture.teamName || '';
    var opponent = fixture.opponent_name || fixture.opponentName || fixture.opponent || '';
    if (team && opponent) return team + ' vs ' + opponent;
    if (opponent) return 'vs ' + opponent;
    return team || 'Fixture';
  }

  function formatFixtureDate(fixture) {
    var timestamp = fixtureDateValue(fixture);
    if (timestamp == null) return '';
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (_) { return ''; }
  }

  function formatFixtureTime(fixture) {
    var explicit = fixture && (fixture.fixture_time || fixture.fixtureTime || fixture.kickoff_time || fixture.kickoffTime || fixture.time);
    if (explicit) return String(explicit).slice(0, 5);
    var timestamp = fixtureDateValue(fixture);
    if (timestamp == null) return '';
    var date = new Date(timestamp);
    if (date.getHours() === 0 && date.getMinutes() === 0) return '';
    try {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }

  function fixtureMeta(fixture) {
    var venue = fixture && (fixture.venue_name || fixture.venueName || fixture.venue || fixture.location || fixture.ground_name || fixture.groundName);
    return [formatFixtureDate(fixture), formatFixtureTime(fixture), venue].filter(Boolean).join(' · ');
  }

  function findCard(root, names) {
    names = names.map(normal);
    var cards = qa(root, '.card,section');
    return cards.find(function (card) {
      var heading = q(card, 'h1,h2,h3,h4,.card-h,.card-title,.section-title');
      var copy = textOf(heading || card);
      return names.some(function (name) { return copy.indexOf(name) >= 0; });
    }) || null;
  }

  function renameCard(card, title) {
    if (!card) return;
    var heading = q(card, 'h1,h2,h3,h4,.card-title,.section-title');
    if (heading) {
      heading.textContent = title;
      return;
    }
    var cardHead = q(card, '.card-h');
    if (cardHead && cardHead.childNodes.length === 1) cardHead.textContent = title;
  }

  function cardBody(card) {
    return card && (q(card, '.card-b,.card-body,.section-body') || card);
  }

  function upcomingFixtures(fixtures) {
    var seen = {};
    var today = new Date();
    today.setHours(0,0,0,0);

    return (fixtures || []).filter(function (fixture) {
      var id = fixtureId(fixture);
      var when = fixtureDateValue(fixture);
      if (!id || seen[id]) return false;
      if (when != null && when < today.getTime()) return false;
      seen[id] = true;
      return true;
    }).sort(function (a, b) {
      var ad = fixtureDateValue(a);
      var bd = fixtureDateValue(b);
      if (ad == null && bd == null) return fixtureTitle(a).localeCompare(fixtureTitle(b));
      if (ad == null) return 1;
      if (bd == null) return -1;
      return ad - bd;
    });
  }

  function calendarCandidates(root) {
    return qa(root, '[data-fixture-id],.cal-event,.calendar-event,.fixture-event');
  }

  function markCalendarEvents(root, fixtures) {
    var events = calendarCandidates(root);
    events.forEach(function (event) {
      if (event.dataset.fixtureId) return;
      var copy = textOf(event);
      var match = (fixtures || []).find(function (fixture) {
        var title = normal(fixtureTitle(fixture));
        var opponent = normal(fixture.opponent_name || fixture.opponentName || fixture.opponent || '');
        return (title && copy.indexOf(title) >= 0) || (opponent && copy.indexOf(opponent) >= 0);
      });
      if (match) event.dataset.fixtureId = fixtureId(match);
    });
  }

  function showOnCalendar(root, fixture) {
    var id = fixtureId(fixture);
    markCalendarEvents(root, fixturesCache || []);
    var event = id ? q(root, '[data-fixture-id="' + CSS.escape(id) + '"]') : null;
    if (!event) {
      var opponent = normal(fixture.opponent_name || fixture.opponentName || fixture.opponent || '');
      var title = normal(fixtureTitle(fixture));
      event = calendarCandidates(root).find(function (candidate) {
        var copy = textOf(candidate);
        return (title && copy.indexOf(title) >= 0) || (opponent && copy.indexOf(opponent) >= 0);
      }) || null;
    }

    if (!event) {
      toast('This booked visit is outside the calendar currently shown. Open the fixture to view its details.');
      return;
    }

    event.classList.add('sfu-calendar-highlight');
    event.setAttribute('tabindex', '-1');
    try { event.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (_) { event.scrollIntoView(); }
    try { event.focus({ preventScroll: true }); } catch (_) {}
    setTimeout(function () { event.classList.remove('sfu-calendar-highlight'); }, 3200);
  }

  function renderUpcomingFixtures(root, fixtures, pipeline) {
    var card = findCard(
      root,
      ['Priority visits','Priority this week','Booked visits','Upcoming fixtures']
    );
    if (!card) return;

    renameCard(card, 'Upcoming fixtures');
    var body = cardBody(card);
    if (!body) return;

    var upcoming = upcomingFixtures(fixtures);
    body.innerHTML = '';

    if (!(pipeline || []).length) {
      body.innerHTML =
        '<div class="sfu-empty">Add a player to your pipeline to see upcoming fixtures.</div>';
      return;
    }

    if (!upcoming.length) {
      body.innerHTML =
        '<div class="sfu-empty">No upcoming fixtures for your pipeline teams.</div>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'sfu-booked-list';

    upcoming.slice(0,20).forEach(function (fixture) {
      var status = attendanceStatus(fixture);
      var row = document.createElement('div');
      row.className = 'list-row sfu-booked-row';
      row.dataset.sfuFixtureId = fixtureId(fixture);
      row.innerHTML =
        '<div class="sfu-copy"><b>' + esc(fixtureTitle(fixture)) + '</b><span>' +
          esc(fixtureMeta(fixture) || 'Fixture details available') +
        '</span></div>' +
        '<div class="sfu-actions">' +
          (status ? '<span class="sfu-status">' + esc(titleCase(status)) + '</span>' : '') +
          '<button type="button" class="sfu-action" data-sfu-calendar>See on calendar</button>' +
          '<a class="sfu-action" href="/scout/fixtures?fixture=' +
            encodeURIComponent(fixtureId(fixture)) +
          '">Open fixture</a>' +
        '</div>';

      var calendarButton = q(row, '[data-sfu-calendar]');
      if (calendarButton) {
        calendarButton.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          showOnCalendar(root, fixture);
        };
      }

      list.appendChild(row);
    });

    body.appendChild(list);
  }

  async function setAttendance(fixture, status) {
    if (isDemo()) {
      fixture.attendance = { status: status };
      return fixture.attendance;
    }

    var payload = await request(
      'POST',
      '/api/scouts/fixtures/' + encodeURIComponent(fixtureId(fixture)) + '/attendance',
      { status: status }
    );

    fixture.attendance = payload.attendance || payload.data || { status: status };
    return fixture.attendance;
  }

  function enhanceFixtureOverlay(root, fixtures) {
    qa(root, '.modal,.overlay,.sheet,[role="dialog"]').forEach(function (overlay) {
      if (overlay.querySelector('[data-sfu-attendance-controls]')) return;

      var copy = textOf(overlay);
      if (
        copy.indexOf('fixture') < 0 &&
        copy.indexOf('venue') < 0 &&
        copy.indexOf('visit status') < 0
      ) return;

      var fixture = (fixtures || []).find(function (candidate) {
        var id = normal(fixtureId(candidate));
        var title = normal(fixtureTitle(candidate));
        var opponent = normal(
          candidate.opponent_name ||
          candidate.opponentName ||
          candidate.opponent ||
          ''
        );

        return (id && copy.indexOf(id) >= 0) ||
          (title && copy.indexOf(title) >= 0) ||
          (opponent && copy.indexOf(opponent) >= 0);
      });

      if (!fixture) return;

      var controls = document.createElement('div');
      controls.setAttribute('data-sfu-attendance-controls', '1');
      controls.style.cssText =
        'display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;' +
        'padding-top:14px;border-top:1px solid #EBEFEC';
      controls.innerHTML =
        '<button type="button" class="sfu-action" data-sfu-attendance="attending">I’m attending</button>' +
        '<button type="button" class="sfu-action" data-sfu-attendance="maybe">Maybe</button>' +
        '<button type="button" class="sfu-action" data-sfu-attendance="not_attending">Not attending</button>';

      qa(controls, '[data-sfu-attendance]').forEach(function (button) {
        button.onclick = async function () {
          var status = button.getAttribute('data-sfu-attendance');
          button.disabled = true;
          try {
            await setAttendance(fixture, status);
            toast(status === 'attending' ? 'Attendance booked.' : 'Attendance updated.');
            scheduleRepair(false);
          } catch (error) {
            toast(error.message || 'Attendance could not be updated.', true);
          } finally {
            button.disabled = false;
          }
        };
      });

      overlay.appendChild(controls);
    });
  }

  async function repairFixtures(root) {
    var fixtures;
    var pipeline;

    try {
      fixtures = await loadFixtures(false);
      pipeline = await loadPipeline(false);
    } catch (error) {
      toast(error.message || 'Fixtures could not be loaded.', true);
      return;
    }

    markCalendarEvents(root, fixtures);
    renderUpcomingFixtures(root, fixtures, pipeline);
    enhanceFixtureOverlay(root, fixtures);
  }

  function unwrapUsage(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.requests)) return payload.requests;
    return [];
  }

  function demoUsageRequests() {
    var rows = readJson(localStorage, DEMO_USAGE_KEY, []) || [];
    return Array.isArray(rows) ? rows : [];
  }

  async function loadUsageHistory(force) {
    if (isDemo()) {
      usageCache = demoUsageRequests();
      return usageCache;
    }
    if (usageCache && !force) return usageCache;
    if (usagePromise && !force) return usagePromise;
    usagePromise = request('GET', '/api/usage-requests').then(function (payload) {
      usageCache = unwrapUsage(payload);
      usagePromise = null;
      return usageCache;
    }).catch(function (error) {
      usagePromise = null;
      throw error;
    });
    return usagePromise;
  }

  function usageValue(row, keys, fallback) {
    for (var i = 0; row && i < keys.length; i += 1) {
      var value = row[keys[i]];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function usageDate(row) {
    var raw = usageValue(row, ['created_at', 'createdAt', 'submitted_at', 'submittedAt'], '');
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return ''; }
  }

  function usageStatus(row) {
    return normal(usageValue(row, ['status'], 'pending')).replace(/\s+/g, '_');
  }

  function usageStatusLabel(row) {
    var status = usageStatus(row);
    return {
      pending: 'Pending review',
      approved_free: 'Approved free',
      payment_link_sent: 'Payment link sent',
      paid_and_applied: 'Paid and applied',
      declined: 'Declined'
    }[status] || titleCase(status);
  }

  function usageTypeLabel(row) {
    var type = usageValue(row, ['allowance_type', 'allowanceType'], 'Usage');
    return titleCase(type);
  }

  function usageQuantity(row) {
    return Number(usageValue(row, ['quantity_requested', 'quantity', 'quantityRequested'], 0)) || 0;
  }

  function usageCode(row) {
    return usageValue(row, ['request_code', 'requestCode'], '');
  }

  function usageReason(row) {
    return usageValue(row, ['reason'], '');
  }

  function findHistoryCard(root) {
    return findCard(root, ['Request history', 'Usage request history', 'Requests']);
  }

  function renderUsageHistory(root, rows) {
    var card = findHistoryCard(root);
    if (!card) {
      var anchor = findCard(root, ['Usage', 'Allowance', 'Additional usage']);
      if (!anchor || !anchor.parentNode) return;
      card = document.createElement('section');
      card.className = 'card';
      card.setAttribute('data-sfu-created-history', '1');
      card.innerHTML = '<div class="card-h"><h3>Request history</h3></div><div class="card-b"></div>';
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
    }

    renameCard(card, 'Request history');
    var body = cardBody(card);
    if (!body) return;
    var sorted = (rows || []).slice().sort(function (a, b) {
      var ad = new Date(usageValue(a, ['created_at', 'createdAt'], 0)).getTime() || 0;
      var bd = new Date(usageValue(b, ['created_at', 'createdAt'], 0)).getTime() || 0;
      return bd - ad;
    });
    var signature = sorted.map(function (row) {
      return [usageValue(row, ['id'], ''), usageStatus(row), usageQuantity(row), usageCode(row)].join(':');
    }).join('|');
    if (body.dataset.sfuHistorySignature === signature) return;
    body.dataset.sfuHistorySignature = signature;
    body.innerHTML = '';

    if (!sorted.length) {
      body.innerHTML = '<div class="sfu-empty">No usage requests submitted yet.</div>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'sfu-history-list';
    sorted.slice(0, 100).forEach(function (row) {
      var status = usageStatus(row);
      var code = usageCode(row);
      var quantity = usageQuantity(row);
      var meta = [
        code,
        usageDate(row),
        usageReason(row)
      ].filter(Boolean).join(' · ');
      var item = document.createElement('div');
      item.className = 'list-row sfu-history-row';
      item.innerHTML =
        '<div class="sfu-copy"><b>' + esc(usageTypeLabel(row)) +
          (quantity ? ' · +' + esc(quantity) : '') +
        '</b><span>' + esc(meta || 'Request submitted') + '</span></div>' +
        '<span class="sfu-status ' + esc(status) + '">' + esc(usageStatusLabel(row)) + '</span>';
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  async function repairUsage(root, force) {
    var rows;
    try {
      rows = await loadUsageHistory(!!force);
    } catch (error) {
      toast(error.message || 'Request history could not be loaded.', true);
      return;
    }
    renderUsageHistory(root, rows);
  }

  function closestField(control) {
    return control && control.closest('label,.field,.form-field,.control,.input-wrap,.select-wrap,.row,.card');
  }

  function labelledControl(root, label, selector) {
    var wanted = normal(label);
    var controls = qa(root, selector || 'select,input,textarea');
    return controls.find(function (control) {
      var wrapper = closestField(control) || control.parentElement;
      return textOf(wrapper).indexOf(wanted) >= 0;
    }) || null;
  }

  function isSendRequestTarget(target) {
    return target && normal(target.textContent) === 'send request';
  }

  async function submitUsageRequest(root, button) {
    var type = labelledControl(root, 'Allowance type', 'select');
    var quantity = labelledControl(root, 'How many more', 'input');
    var reason = labelledControl(root, 'Why do you need', 'textarea,input');
    var body = {
      allowanceType: normal(type && type.value),
      quantity: Number(quantity && quantity.value) || 0,
      reason: String(reason && reason.value || '').trim()
    };

    if (!body.allowanceType) {
      toast('Allowance type is required.', true);
      return;
    }
    if (['interests', 'predictions', 'exports'].indexOf(body.allowanceType) < 0) {
      toast('Choose interests, predictions or exports.', true);
      return;
    }
    if (!body.quantity || body.quantity < 1) {
      toast('Enter how many more you need.', true);
      return;
    }
    if (!body.reason) {
      toast('Explain why the extra allowance is required.', true);
      return;
    }

    var originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      var response;

      if (isDemo()) {
        var demoRow = {
          id: 'demo-usage-' + Date.now(),
          request_code: 'DEMO-' + String(Date.now()).slice(-6),
          allowance_type: body.allowanceType,
          quantity_requested: body.quantity,
          reason: body.reason,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        var demoRows = demoUsageRequests();
        demoRows.unshift(demoRow);
        try {
          localStorage.setItem(DEMO_USAGE_KEY, JSON.stringify(demoRows));
        } catch (_) {}

        response = { request: demoRow };
        usageCache = demoRows;
      } else {
        response = await request('POST', '/api/usage-requests', body);
        var created = response && (response.request || response.data);
        usageCache = null;

        var refreshed = await loadUsageHistory(true);
        if (
          created &&
          !refreshed.some(function (row) {
            return String(row.id) === String(created.id);
          })
        ) {
          refreshed.unshift(created);
        }
        usageCache = refreshed;
      }
      if (quantity) quantity.value = '';
      if (reason) reason.value = '';
      toast('Usage request sent.');

      var current = visibleRoot(shadow());
      if (current) renderUsageHistory(current, usageCache || []);

      return response;
    } catch (error) {
      button.disabled = false;
      button.textContent = originalText;
      toast(error.message || 'The usage request could not be submitted.', true);
      throw error;
    }
  }

  function installCaptureHandlers(root) {
    if (!root || root.__SFU_CAPTURE_BOUND__) return;
    root.__SFU_CAPTURE_BOUND__ = true;

    root.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('button,a,[role="button"]')
        : null;
      if (!target) return;
      var current = visibleRoot(root);
      if (!current || !current.contains(target)) return;

      if (route() === 'usage' && isSendRequestTarget(target)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        submitUsageRequest(current, target).catch(function () {});
      }
    }, true);
  }

  function scheduleRepair(forceUsage) {
    if (forceUsage) usageCache = null;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      runRepairs(forceUsage);
    });
  }

  async function runRepairs(forceUsage) {
    if (repairing) return;
    var root = shadow();
    if (!root) return;
    var currentRoute = route();
    if (currentRoute !== 'fixtures' && currentRoute !== 'usage') return;

    repairing = true;
    if (observer) observer.disconnect();
    try {
      ensureStyle(root);
      installCaptureHandlers(root);
      var current = visibleRoot(root);
      if (!current) return;
      if (currentRoute === 'fixtures') await repairFixtures(current);
      if (currentRoute === 'usage') await repairUsage(current, forceUsage);
    } catch (error) {
      console.error('[Scout fixtures + usage repairs]', error);
    } finally {
      repairing = false;
      if (observer && root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    }
  }

  function attach() {
    var app = host();
    if (!app) return;

    function watchShadow() {
      var root = shadow();
      if (!root) {
        setTimeout(watchShadow, 30);
        return;
      }
      ensureStyle(root);
      installCaptureHandlers(root);
      if (observer) observer.disconnect();
      observer = new MutationObserver(function () { scheduleRepair(false); });
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      scheduleRepair(false);
    }
    watchShadow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }

  window.addEventListener('pageshow', function () { scheduleRepair(true); });
  window.addEventListener('popstate', function () { scheduleRepair(false); });
  window.addEventListener('resize', function () { scheduleRepair(false); });

  window.ScoutFixturesUsageV1 = {
    version: VERSION,
    refresh: function () { scheduleRepair(true); },
    clearCaches: function () {
      fixturesCache = null;
      usageCache = null;
      scheduleRepair(true);
    }
  };
}());

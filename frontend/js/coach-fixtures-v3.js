'use strict';

(function () {
  if (document.body) document.body.classList.add('coach-fixtures-v3');

  var state = {
    upcoming: [],
    past: [],
    matchFacts: [],
    search: '',
    venueFilter: '',
    statusFilter: '',
    showAllUpcoming: false,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    editingId: null,
    detailFixture: null,
    importRows: [],
    loadPromise: null,
    ready: false
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function allFixtures() {
    return state.upcoming.concat(state.past);
  }

  function fixtureById(id) {
    return allFixtures().find(function (fixture) {
      return String(fixture.id) === String(id);
    }) || null;
  }

  function parseDate(value) {
    if (!value) return null;
    var date = new Date(String(value).slice(0,10) + 'T12:00:00');
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(value) {
    return String(value || '').slice(0,10);
  }

  function formatDate(value, options) {
    var date = parseDate(value);
    if (!date) return 'Date TBC';
    return date.toLocaleDateString('en-GB', options || {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatLongDate(value) {
    return formatDate(value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatTime(value) {
    if (!value) return 'Time TBC';
    return String(value).slice(0,5);
  }

  function monthLabel(date) {
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    });
  }

  function homeAwayClass(value) {
    if (value === 'Away') return 'is-blue';
    if (value === 'Neutral') return 'is-orange';
    return 'is-green';
  }

  function firstFactForFixture(fixture) {
    var direct = state.matchFacts.find(function (fact) {
      return fact.fixture_id && String(fact.fixture_id) === String(fixture.id);
    });
    if (direct) return direct;

    return state.matchFacts.find(function (fact) {
      return dateKey(fact.match_date) === dateKey(fixture.fixture_date) &&
        String(fact.opponent || '').trim().toLowerCase() ===
        String(fixture.opponent || '').trim().toLowerCase();
    }) || null;
  }

  function resultLabel(fact) {
    if (!fact) return 'Missing';
    if (fact.result) {
      return fact.result.charAt(0).toUpperCase() + fact.result.slice(1);
    }
    var home = Number(fact.home_score);
    var away = Number(fact.away_score);
    if (!Number.isFinite(home) || !Number.isFinite(away)) return 'Recorded';
    return home > away ? 'Win' : home < away ? 'Loss' : 'Draw';
  }

  function resultClass(fact) {
    var result = resultLabel(fact).toLowerCase();
    if (result === 'win') return 'cf3-result-win';
    if (result === 'loss') return 'cf3-result-loss';
    return 'cf3-result-draw';
  }

  function scoreLabel(fact) {
    if (!fact || fact.home_score == null || fact.away_score == null) return '—';
    return Number(fact.home_score) + '–' + Number(fact.away_score);
  }

  function fixtureMatchFactCount(fixture) {
    return state.matchFacts.filter(function (fact) {
      if (fact.fixture_id) return String(fact.fixture_id) === String(fixture.id);
      return dateKey(fact.match_date) === dateKey(fixture.fixture_date) &&
        String(fact.opponent || '').trim().toLowerCase() ===
        String(fixture.opponent || '').trim().toLowerCase();
    }).length;
  }

  function filteredFixtures(fixtures) {
    var query = state.search.trim().toLowerCase();

    return fixtures.filter(function (fixture) {
      var text = [
        fixture.opponent,
        fixture.venue,
        fixture.city,
        fixture.country,
        fixture.notes
      ].join(' ').toLowerCase();

      var matchesSearch = !query || text.indexOf(query) >= 0;
      var matchesVenue = !state.venueFilter ||
        String(fixture.home_or_away || '') === state.venueFilter;
      var fact = firstFactForFixture(fixture);
      var complete = !!fact;
      var matchesStatus = !state.statusFilter ||
        (state.statusFilter === 'complete' && complete) ||
        (state.statusFilter === 'missing' && !complete);

      return matchesSearch && matchesVenue && matchesStatus;
    });
  }

  function buildPage() {
    var page = document.querySelector('.page-content');
    if (!page) return;

    var banner = page.querySelector('.public-demo-banner');
    if (banner) banner.remove();

    page.innerHTML =
      '<div class="cf3-root" id="cf3Root">' +
        '<section class="cf3-hero">' +
          '<div><span class="cf3-pill is-green">Coach workspace</span>' +
            '<h1>Fixtures and match schedule.</h1>' +
            '<p>Create upcoming fixtures, review completed results and keep Match Facts preparation in one place.</p>' +
          '</div>' +
          '<div class="cf3-hero-actions">' +
            '<button class="cf3-btn" type="button" id="cf3ImportFixtures">Import fixtures</button>' +
            '<button class="cf3-btn is-primary" type="button" id="cf3AddFixture">Add fixture</button>' +
          '</div>' +
        '</section>' +

        '<section class="cf3-stats">' +
          '<article class="cf3-stat"><small>Upcoming fixtures</small><strong class="is-green" id="cf3UpcomingStat">0</strong><span>Next scheduled matches</span></article>' +
          '<article class="cf3-stat"><small>Completed</small><strong id="cf3CompletedStat">0</strong><span>Past fixtures recorded</span></article>' +
          '<article class="cf3-stat"><small>Home fixtures</small><strong id="cf3HomeStat">0</strong><span>Across all fixture records</span></article>' +
          '<article class="cf3-stat"><small>Match Facts complete</small><strong id="cf3FactsStat">0%</strong><span id="cf3FactsSub">0 of 0 completed</span></article>' +
        '</section>' +

        '<section class="cf3-toolbar" aria-label="Fixture filters">' +
          '<input class="cf3-control" id="cf3Search" placeholder="Search opponent, venue or location">' +
          '<select class="cf3-control" id="cf3VenueFilter">' +
            '<option value="">All venues</option>' +
            '<option value="Home">Home</option>' +
            '<option value="Away">Away</option>' +
            '<option value="Neutral">Neutral</option>' +
          '</select>' +
          '<select class="cf3-control" id="cf3StatusFilter">' +
            '<option value="">All Match Facts statuses</option>' +
            '<option value="complete">Complete</option>' +
            '<option value="missing">Missing</option>' +
          '</select>' +
          '<button class="cf3-btn" type="button" id="cf3ClearFilters">Clear filters</button>' +
        '</section>' +

        '<section class="cf3-grid">' +
          '<article class="cf3-panel">' +
            '<header class="cf3-panel-head">' +
              '<div class="cf3-panel-title"><h2 id="cf3MonthLabel">Calendar</h2><p>Select a match date to open its fixture details.</p></div>' +
              '<div class="cf3-panel-actions">' +
                '<button class="cf3-btn is-small" type="button" id="cf3PrevMonth" aria-label="Previous month">‹</button>' +
                '<button class="cf3-btn is-small" type="button" id="cf3Today">Today</button>' +
                '<button class="cf3-btn is-small" type="button" id="cf3NextMonth" aria-label="Next month">›</button>' +
              '</div>' +
            '</header>' +
            '<div class="cf3-panel-body">' +
              '<div class="cf3-calendar-week" aria-hidden="true">' +
                '<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>' +
              '</div>' +
              '<div class="cf3-calendar" id="cf3Calendar"></div>' +
            '</div>' +
          '</article>' +

          '<article class="cf3-panel">' +
            '<header class="cf3-panel-head">' +
              '<div class="cf3-panel-title"><h2>Upcoming</h2><p>Your nearest scheduled matches.</p></div>' +
              '<button class="cf3-btn is-small" type="button" id="cf3ViewAllUpcoming">View all</button>' +
            '</header>' +
            '<div class="cf3-panel-body"><div class="cf3-fixture-list" id="cf3UpcomingList"></div></div>' +
          '</article>' +
        '</section>' +

        '<section class="cf3-panel cf3-results">' +
          '<header class="cf3-panel-head">' +
            '<div class="cf3-panel-title"><h2>Recent results</h2><p>Past fixtures joined to submitted Match Facts.</p></div>' +
            '<button class="cf3-btn is-small" type="button" id="cf3ExportFixtures">Export</button>' +
          '</header>' +
          '<div class="cf3-table-wrap" id="cf3Results"></div>' +
        '</section>' +

        fixtureModalMarkup() +
        importModalMarkup() +
        detailModalMarkup() +
      '</div>';

    if (banner) page.insertBefore(banner, page.firstChild);
    state.ready = true;
    initialiseCountryAndCity();
    bindStaticEvents();
    renderAll();
  }

  function fixtureModalMarkup() {
    return '<section class="cf3-modal" id="cf3FixtureModal" role="dialog" aria-modal="true" aria-labelledby="cf3FixtureModalTitle">' +
      '<div class="cf3-modal-card">' +
        '<header class="cf3-modal-head">' +
          '<div><h2 id="cf3FixtureModalTitle">Add fixture</h2><p id="cf3FixtureModalCopy">Create an upcoming match for your team.</p></div>' +
          '<button class="cf3-btn is-small" type="button" data-close-modal="cf3FixtureModal">Close</button>' +
        '</header>' +
        '<div class="cf3-modal-body">' +
          '<form id="cf3FixtureForm">' +
            '<div class="cf3-form-grid">' +
              '<div class="cf3-field"><label for="fOpponent">Opponent *</label><input class="cf3-input" id="fOpponent" required placeholder="e.g. Arsenal FC Academy"></div>' +
              '<div class="cf3-field"><label for="fDate">Date *</label><input class="cf3-input" id="fDate" type="date" required></div>' +
              '<div class="cf3-field"><label for="fTime">Time</label><input class="cf3-input" id="fTime" type="time"></div>' +
              '<div class="cf3-field"><label for="fVenue">Venue name</label><input class="cf3-input" id="fVenue" placeholder="e.g. Riverside Park"></div>' +
              '<div class="cf3-field"><label for="fVenueAddress">Venue address</label><input class="cf3-input" id="fVenueAddress" autocomplete="street-address" placeholder="Full address"></div>' +
              '<div class="cf3-field"><label for="fVenuePostcode">Postcode</label><input class="cf3-input" id="fVenuePostcode" autocomplete="postal-code" placeholder="e.g. SW1A 1AA"></div>' +
              '<div class="cf3-field"><label for="fCountry">Country</label><select class="cf3-select" id="fCountry"></select></div>' +
              '<div class="cf3-field"><label for="fCity">City</label><input class="cf3-input" id="fCity" list="fixtureCityOptions" autocomplete="address-level2" placeholder="Select city"><datalist id="fixtureCityOptions"></datalist></div>' +
              '<div class="cf3-field"><label for="fHomeAway">Home / away</label><select class="cf3-select" id="fHomeAway"><option>Home</option><option>Away</option><option>Neutral</option></select></div>' +
              '<div class="cf3-field"><label for="fFormat">Format</label><select class="cf3-select" id="fFormat"><option value="5">5-a-side</option><option value="7">7-a-side</option><option value="9">9-a-side</option><option value="11" selected>11-a-side</option></select></div>' +
              '<div class="cf3-field is-full"><label for="fNotes">Notes</label><textarea class="cf3-textarea" id="fNotes" placeholder="Optional match information"></textarea></div>' +
            '</div>' +
            '<div class="cf3-modal-actions">' +
              '<span class="cf3-message" id="fixMsg" aria-live="polite"></span>' +
              '<button class="cf3-btn" type="button" data-close-modal="cf3FixtureModal">Cancel</button>' +
              '<button class="cf3-btn is-primary" type="submit" id="saveFixtureBtn">Save fixture</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function importModalMarkup() {
    return '<section class="cf3-modal" id="cf3ImportModal" role="dialog" aria-modal="true" aria-labelledby="cf3ImportTitle">' +
      '<div class="cf3-modal-card">' +
        '<header class="cf3-modal-head">' +
          '<div><h2 id="cf3ImportTitle">Import fixtures</h2><p>Upload the ScoutLink fixture CSV template.</p></div>' +
          '<button class="cf3-btn is-small" type="button" data-close-modal="cf3ImportModal">Close</button>' +
        '</header>' +
        '<div class="cf3-modal-body">' +
          '<div class="cf3-import-zone" id="cf3ImportZone">' +
            '<b>Choose a completed fixture CSV</b>' +
            '<p>Required columns are opponent and fixture_date. Optional columns include time, venue, address, postcode, city, country, home_or_away, format and notes.</p>' +
            '<div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap;justify-content:center">' +
              '<button class="cf3-btn is-primary is-small" type="button" id="cf3ChooseCsv">Choose CSV</button>' +
              '<button class="cf3-btn is-small" type="button" id="cf3DownloadTemplate">Download template</button>' +
            '</div>' +
            '<input id="cf3CsvInput" type="file" accept=".csv,text/csv" hidden>' +
          '</div>' +
          '<div id="cf3ImportPreview"></div>' +
          '<div class="cf3-modal-actions">' +
            '<span class="cf3-message" id="cf3ImportMessage" aria-live="polite"></span>' +
            '<button class="cf3-btn" type="button" data-close-modal="cf3ImportModal">Cancel</button>' +
            '<button class="cf3-btn is-primary" type="button" id="cf3RunImport" disabled>Import ready fixtures</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function detailModalMarkup() {
    return '<section class="cf3-modal" id="cf3DetailModal" role="dialog" aria-modal="true" aria-labelledby="cf3DetailTitle">' +
      '<div class="cf3-modal-card is-small">' +
        '<header class="cf3-modal-head">' +
          '<div><h2 id="cf3DetailTitle">Fixture details</h2><p id="cf3DetailSubtitle"></p></div>' +
          '<button class="cf3-btn is-small" type="button" data-close-modal="cf3DetailModal">Close</button>' +
        '</header>' +
        '<div class="cf3-modal-body" id="cf3DetailBody"></div>' +
      '</div>' +
    '</section>';
  }

  function initialiseCountryAndCity() {
    try {
      if (typeof window.fillCountrySelect === 'function') {
        window.fillCountrySelect('fCountry','England');
      }
      if (typeof window.attachCityAutocomplete === 'function') {
        window.attachCityAutocomplete('fCity','fixtureCityOptions','fCountry');
      }
    } catch (_) {}
  }

  function bindStaticEvents() {
    document.getElementById('cf3AddFixture').addEventListener('click', function () {
      openFixtureModal();
    });

    document.getElementById('cf3ImportFixtures').addEventListener('click', function () {
      openModal('cf3ImportModal');
    });

    document.getElementById('cf3FixtureForm').addEventListener('submit', function (event) {
      event.preventDefault();
      saveFixture();
    });

    document.getElementById('cf3Search').addEventListener('input', function () {
      state.search = this.value;
      renderUpcoming();
      renderResults();
    });

    document.getElementById('cf3VenueFilter').addEventListener('change', function () {
      state.venueFilter = this.value;
      renderUpcoming();
      renderResults();
    });

    document.getElementById('cf3StatusFilter').addEventListener('change', function () {
      state.statusFilter = this.value;
      renderUpcoming();
      renderResults();
    });

    document.getElementById('cf3ClearFilters').addEventListener('click', function () {
      state.search = '';
      state.venueFilter = '';
      state.statusFilter = '';
      document.getElementById('cf3Search').value = '';
      document.getElementById('cf3VenueFilter').value = '';
      document.getElementById('cf3StatusFilter').value = '';
      renderUpcoming();
      renderResults();
    });

    document.getElementById('cf3PrevMonth').addEventListener('click', function () {
      state.calendarMonth = new Date(
        state.calendarMonth.getFullYear(),
        state.calendarMonth.getMonth() - 1,
        1
      );
      renderCalendar();
    });

    document.getElementById('cf3NextMonth').addEventListener('click', function () {
      state.calendarMonth = new Date(
        state.calendarMonth.getFullYear(),
        state.calendarMonth.getMonth() + 1,
        1
      );
      renderCalendar();
    });

    document.getElementById('cf3Today').addEventListener('click', function () {
      var now = new Date();
      state.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      renderCalendar();
    });

    document.getElementById('cf3ViewAllUpcoming').addEventListener('click', function () {
      state.showAllUpcoming = !state.showAllUpcoming;
      renderUpcoming();
    });

    document.getElementById('cf3ExportFixtures').addEventListener('click', exportFixtures);
    document.getElementById('cf3ChooseCsv').addEventListener('click', function () {
      document.getElementById('cf3CsvInput').click();
    });
    document.getElementById('cf3DownloadTemplate').addEventListener('click', downloadTemplate);
    document.getElementById('cf3CsvInput').addEventListener('change', handleCsvFile);
    document.getElementById('cf3RunImport').addEventListener('click', runImport);

    document.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeModal(button.getAttribute('data-close-modal'));
      });
    });

    document.querySelectorAll('.cf3-modal').forEach(function (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal(modal.id);
      });
    });

    document.getElementById('cf3Root').addEventListener('click', function (event) {
      var action = event.target.closest('[data-cf3-action]');
      if (!action) return;
      var fixture = fixtureById(action.getAttribute('data-fixture-id'));
      if (!fixture) return;

      var type = action.getAttribute('data-cf3-action');
      if (type === 'view') openDetails(fixture);
      if (type === 'edit') openFixtureModal(fixture);
      if (type === 'delete') deleteFixture(fixture);
      if (type === 'match-facts') prepareMatchFacts(fixture);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.cf3-modal.is-open').forEach(function (modal) {
        closeModal(modal.id);
      });
    });
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var focusable = modal.querySelector('button,input,select,textarea');
    if (focusable) setTimeout(function () { focusable.focus(); }, 0);
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('is-open');
    if (!document.querySelector('.cf3-modal.is-open')) document.body.style.overflow = '';
  }

  function openFixtureModal(fixture) {
    state.editingId = fixture ? fixture.id : null;
    document.getElementById('cf3FixtureModalTitle').textContent =
      fixture ? 'Edit fixture' : 'Add fixture';
    document.getElementById('cf3FixtureModalCopy').textContent =
      fixture ? 'Update the scheduled match information.' : 'Create an upcoming match for your team.';
    document.getElementById('saveFixtureBtn').textContent =
      fixture ? 'Save changes' : 'Save fixture';
    document.getElementById('fixMsg').textContent = '';

    var values = fixture || {};
    document.getElementById('fOpponent').value = values.opponent || '';
    document.getElementById('fDate').value =
      dateKey(values.fixture_date) || new Date().toISOString().slice(0,10);
    document.getElementById('fTime').value = values.fixture_time ?
      String(values.fixture_time).slice(0,5) : '';
    document.getElementById('fVenue').value = values.venue || '';
    document.getElementById('fVenueAddress').value = values.venue_address || '';
    document.getElementById('fVenuePostcode').value = values.venue_postcode || '';
    document.getElementById('fCity').value = values.city || '';
    document.getElementById('fHomeAway').value = values.home_or_away || 'Home';
    document.getElementById('fFormat').value = String(values.format || '11');
    document.getElementById('fNotes').value = values.notes || '';

    var country = document.getElementById('fCountry');
    if (country) country.value = values.country || 'England';

    openModal('cf3FixtureModal');
  }

  function formPayload() {
    var city = document.getElementById('fCity').value.trim();
    var country = document.getElementById('fCountry').value || 'England';

    if (typeof window.canonicalChoice === 'function' &&
        window.SL_COUNTRY_CITIES && window.SL_COUNTRY_CITIES[country]) {
      city = window.canonicalChoice(city, window.SL_COUNTRY_CITIES[country]) || city;
    }

    return {
      opponent: document.getElementById('fOpponent').value.trim(),
      fixtureDate: document.getElementById('fDate').value,
      fixtureTime: document.getElementById('fTime').value || null,
      venue: document.getElementById('fVenue').value.trim() || null,
      venueAddress: document.getElementById('fVenueAddress').value.trim() || null,
      venuePostcode: document.getElementById('fVenuePostcode').value.trim() || null,
      city: city || null,
      country: country,
      homeOrAway: document.getElementById('fHomeAway').value,
      format: document.getElementById('fFormat').value,
      notes: document.getElementById('fNotes').value.trim() || null
    };
  }

  function saveFixture() {
    var payload = formPayload();
    var message = document.getElementById('fixMsg');
    var button = document.getElementById('saveFixtureBtn');

    if (!payload.opponent || !payload.fixtureDate) {
      message.textContent = 'Opponent and date are required.';
      message.style.color = '#b42335';
      return;
    }

    button.disabled = true;
    button.textContent = state.editingId ? 'Saving changes…' : 'Saving fixture…';
    message.textContent = '';
    var method = state.editingId ? 'PUT' : 'POST';
    var url = state.editingId ? '/api/fixtures/' + state.editingId : '/api/fixtures';

    window.api(method, url, payload).then(function () {
      message.textContent = state.editingId ? 'Fixture updated.' : 'Fixture created.';
      message.style.color = '#087a61';
      return loadFixtures(true);
    }).then(function () {
      setTimeout(function () {
        closeModal('cf3FixtureModal');
      }, 350);
    }).catch(function (error) {
      message.textContent = error.message || 'The fixture could not be saved.';
      message.style.color = '#b42335';
    }).finally(function () {
      button.disabled = false;
      button.textContent = state.editingId ? 'Save changes' : 'Save fixture';
    });
  }

  window.addFixture = saveFixture;

  function deleteFixture(fixture) {
    if (!window.confirm('Delete the fixture against ' + fixture.opponent + '?')) return;

    window.api('DELETE','/api/fixtures/' + fixture.id,{}).then(function () {
      closeModal('cf3DetailModal');
      return loadFixtures(true);
    }).catch(function (error) {
      window.alert(error.message || 'The fixture could not be deleted.');
    });
  }

  function prepareMatchFacts(fixture) {
    var existing = null;
    try { existing = localStorage.getItem('scoutlink.coach.matchFacts.v3'); } catch (_) {}

    if (existing && !window.confirm(
      'Starting Match Facts from this fixture will replace the current unsent Match Facts draft. Continue?'
    )) return;

    var formationByFormat = {
      '5':'2-1-1',
      '7':'3-2-1',
      '9':'3-3-2',
      '11':'4-4-2'
    };

    try {
      localStorage.setItem('scoutlink.coach.matchFacts.v3', JSON.stringify({
        version:3,
        coachId:window.Auth && window.Auth.user && window.Auth.user.id || 'coach',
        savedAt:new Date().toISOString(),
        currentStep:1,
        selectedPlayerIds:{},
        state:{
          mode:'post',
          opponent:fixture.opponent || '',
          matchDate:dateKey(fixture.fixture_date),
          format:String(fixture.format || '11'),
          formation:formationByFormat[String(fixture.format || '11')] || '4-4-2',
          myTeamName:'My team',
          coachTeamId:fixture.team_id || null,
          fixtureId:fixture.id,
          fixtures:[],
          players:[],
          goals:[],
          yellowCards:[],
          redCards:[],
          homeScore:0,
          awayScore:0,
          result:'',
          ratings:{},
          overallPerformance:{},
          playerPositions:{},
          events:[],
          coachNotes:''
        }
      }));
    } catch (_) {}

    var destination = route('match-facts.html');
    window.location.href = destination +
      (destination.indexOf('?') >= 0 ? '&' : '?') +
      'fixtureId=' + encodeURIComponent(fixture.id);
  }

  function openDetails(fixture) {
    state.detailFixture = fixture;
    var fact = firstFactForFixture(fixture);
    document.getElementById('cf3DetailTitle').textContent = fixture.opponent || 'Fixture';
    document.getElementById('cf3DetailSubtitle').textContent =
      formatLongDate(fixture.fixture_date) + ' · ' +
      (fixture.home_or_away || 'Home');

    document.getElementById('cf3DetailBody').innerHTML =
      '<div class="cf3-detail-grid">' +
        detail('Date', formatLongDate(fixture.fixture_date)) +
        detail('Time', formatTime(fixture.fixture_time)) +
        detail('Venue', fixture.venue || 'Not added') +
        detail('Location', [fixture.city,fixture.country].filter(Boolean).join(', ') || 'Not added') +
        detail('Home / away', fixture.home_or_away || 'Home') +
        detail('Format', (fixture.format || '11') + '-a-side') +
        detail('Score', scoreLabel(fact)) +
        detail('Match Facts', fact ? fixtureMatchFactCount(fixture) + ' player records' : 'Missing') +
      '</div>' +
      (fixture.venue_address || fixture.venue_postcode
        ? '<div class="cf3-notice" style="margin-top:10px"><b>Address</b><br>' +
          esc([fixture.venue_address,fixture.venue_postcode].filter(Boolean).join(', ')) + '</div>'
        : '') +
      (fixture.notes
        ? '<div class="cf3-notice" style="margin-top:10px"><b>Notes</b><br>' +
          esc(fixture.notes) + '</div>'
        : '') +
      '<div class="cf3-modal-actions">' +
        '<button class="cf3-btn is-danger" type="button" data-cf3-action="delete" data-fixture-id="' +
        esc(fixture.id) + '">Delete</button>' +
        '<button class="cf3-btn" type="button" data-cf3-action="edit" data-fixture-id="' +
        esc(fixture.id) + '">Edit fixture</button>' +
        '<button class="cf3-btn is-primary" type="button" data-cf3-action="match-facts" data-fixture-id="' +
        esc(fixture.id) + '">' + (fact ? 'Open Match Facts' : 'Prepare Match Facts') + '</button>' +
      '</div>';

    openModal('cf3DetailModal');
  }

  function detail(label, value) {
    return '<div class="cf3-detail"><small>' + esc(label) + '</small><b>' +
      esc(value) + '</b></div>';
  }

  function loadFixtures(force) {
    if (state.loadPromise && !force) return state.loadPromise;

    showLoading();

    state.loadPromise = Promise.all([
      window.api('GET','/api/fixtures?upcoming=true').catch(function () {
        return { data:[] };
      }),
      window.api('GET','/api/fixtures?past=true').catch(function () {
        return { data:[] };
      }),
      window.api('GET','/api/match-facts?limit=100').catch(function () {
        return { data:[] };
      })
    ]).then(function (responses) {
      state.upcoming = (responses[0].data || []).slice().sort(function (a,b) {
        return dateKey(a.fixture_date).localeCompare(dateKey(b.fixture_date));
      });

      state.past = (responses[1].data || []).slice().sort(function (a,b) {
        return dateKey(b.fixture_date).localeCompare(dateKey(a.fixture_date));
      });

      state.matchFacts = responses[2].data || [];

      if (state.upcoming.length && !state.ready) {
        var nearest = parseDate(state.upcoming[0].fixture_date);
        if (nearest) state.calendarMonth = new Date(nearest.getFullYear(),nearest.getMonth(),1);
      }

      renderAll();
      return state;
    }).finally(function () {
      state.loadPromise = null;
    });

    return state.loadPromise;
  }

  window.loadFixtures = loadFixtures;

  function showLoading() {
    if (!state.ready) return;
    var loading = '<div class="cf3-loading"><div class="cf3-spinner" aria-label="Loading"></div></div>';
    document.getElementById('cf3UpcomingList').innerHTML = loading;
    document.getElementById('cf3Results').innerHTML = loading;
  }

  function renderAll() {
    if (!state.ready || !document.getElementById('cf3Root')) return;
    renderStats();
    renderCalendar();
    renderUpcoming();
    renderResults();
  }

  function renderStats() {
    var pastCount = state.past.length;
    var factsComplete = state.past.filter(function (fixture) {
      return !!firstFactForFixture(fixture);
    }).length;
    var percentage = pastCount ? Math.round((factsComplete / pastCount) * 100) : 0;
    var homeCount = allFixtures().filter(function (fixture) {
      return fixture.home_or_away === 'Home';
    }).length;

    document.getElementById('cf3UpcomingStat').textContent = String(state.upcoming.length);
    document.getElementById('cf3CompletedStat').textContent = String(pastCount);
    document.getElementById('cf3HomeStat').textContent = String(homeCount);
    document.getElementById('cf3FactsStat').textContent = percentage + '%';
    document.getElementById('cf3FactsSub').textContent =
      factsComplete + ' of ' + pastCount + ' completed';
  }

  function renderCalendar() {
    var calendar = document.getElementById('cf3Calendar');
    if (!calendar) return;

    var year = state.calendarMonth.getFullYear();
    var month = state.calendarMonth.getMonth();
    var first = new Date(year,month,1);
    var startOffset = (first.getDay() + 6) % 7;
    var gridStart = new Date(year,month,1 - startOffset);
    var today = new Date();
    var todayKey = [
      today.getFullYear(),
      String(today.getMonth()+1).padStart(2,'0'),
      String(today.getDate()).padStart(2,'0')
    ].join('-');

    document.getElementById('cf3MonthLabel').textContent = monthLabel(state.calendarMonth);

    var cells = [];
    for (var index = 0; index < 42; index += 1) {
      var date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );
      var key = [
        date.getFullYear(),
        String(date.getMonth()+1).padStart(2,'0'),
        String(date.getDate()).padStart(2,'0')
      ].join('-');

      var fixtures = allFixtures().filter(function (fixture) {
        return dateKey(fixture.fixture_date) === key;
      });

      var outside = date.getMonth() !== month;
      var classes = 'cf3-day' +
        (outside ? ' is-outside' : '') +
        (key === todayKey ? ' is-today' : '') +
        (fixtures.length ? ' has-event' : '');

      var content =
        '<strong>' + date.getDate() + '</strong>' +
        (fixtures.length
          ? '<span class="cf3-day-count">' + fixtures.length + '</span><em>' +
            esc(fixtures[0].opponent) + '</em>'
          : '');

      cells.push(fixtures.length
        ? '<button class="' + classes + '" type="button" data-calendar-fixture="' +
          esc(fixtures[0].id) + '" aria-label="' + esc(
            formatLongDate(key) + ': ' + fixtures.map(function (fixture) {
              return fixture.opponent;
            }).join(', ')
          ) + '">' + content + '</button>'
        : '<div class="' + classes + '">' + content + '</div>');
    }

    calendar.innerHTML = cells.join('');
    calendar.querySelectorAll('[data-calendar-fixture]').forEach(function (button) {
      button.addEventListener('click', function () {
        var fixture = fixtureById(button.getAttribute('data-calendar-fixture'));
        if (fixture) openDetails(fixture);
      });
    });
  }

  function upcomingCard(fixture) {
    var fact = firstFactForFixture(fixture);
    return '<article class="cf3-fixture-card">' +
      '<div class="cf3-fixture-head">' +
        '<div><span class="cf3-pill ' + homeAwayClass(fixture.home_or_away) + '">' +
        esc(fixture.home_or_away || 'Home') + '</span>' +
        (fixture.format
          ? ' <span class="cf3-pill">' + esc(fixture.format) + '-a-side</span>'
          : '') + '</div>' +
        '<button class="cf3-btn is-small" type="button" data-cf3-action="view" data-fixture-id="' +
        esc(fixture.id) + '">Details</button>' +
      '</div>' +
      '<h3>' + esc(fixture.opponent || 'Opponent') + '</h3>' +
      '<p>' + esc(formatLongDate(fixture.fixture_date)) + ' · ' +
      esc(formatTime(fixture.fixture_time)) +
      (fixture.venue ? ' · ' + esc(fixture.venue) : '') + '</p>' +
      (fixture.notes ? '<div class="cf3-fixture-note">' + esc(fixture.notes) + '</div>' : '') +
      '<div class="cf3-card-actions">' +
        '<button class="cf3-btn is-primary is-small" type="button" data-cf3-action="match-facts" data-fixture-id="' +
        esc(fixture.id) + '">' + (fact ? 'Open Match Facts' : 'Prepare Match Facts') + '</button>' +
        '<button class="cf3-btn is-small" type="button" data-cf3-action="edit" data-fixture-id="' +
        esc(fixture.id) + '">Edit</button>' +
      '</div>' +
    '</article>';
  }

  function renderUpcoming() {
    var container = document.getElementById('cf3UpcomingList');
    if (!container) return;

    var fixtures = filteredFixtures(state.upcoming);
    var shown = state.showAllUpcoming ? fixtures : fixtures.slice(0,3);
    document.getElementById('cf3ViewAllUpcoming').textContent =
      state.showAllUpcoming ? 'Show nearest' : 'View all';

    container.innerHTML = shown.length
      ? shown.map(upcomingCard).join('')
      : '<div class="cf3-empty">No upcoming fixtures match these filters.</div>';
  }

  function renderResults() {
    var container = document.getElementById('cf3Results');
    if (!container) return;

    var fixtures = filteredFixtures(state.past);
    if (!fixtures.length) {
      container.innerHTML =
        '<div class="cf3-empty">No completed fixtures match these filters.</div>';
      return;
    }

    container.innerHTML =
      '<table class="cf3-table">' +
        '<thead><tr><th>Date</th><th>Opponent</th><th>Venue</th><th>Score</th><th>Result</th><th>Match Facts</th><th></th></tr></thead>' +
        '<tbody>' + fixtures.map(function (fixture) {
          var fact = firstFactForFixture(fixture);
          return '<tr>' +
            '<td>' + esc(formatDate(fixture.fixture_date)) + '</td>' +
            '<td><b>' + esc(fixture.opponent || 'Opponent') + '</b></td>' +
            '<td>' + esc(fixture.home_or_away || 'Home') + '</td>' +
            '<td>' + esc(scoreLabel(fact)) + '</td>' +
            '<td><span class="' + resultClass(fact) + '">' + esc(resultLabel(fact)) + '</span></td>' +
            '<td><span class="cf3-pill ' + (fact ? 'is-green' : 'is-orange') + '">' +
              (fact ? 'Complete' : 'Missing') + '</span></td>' +
            '<td><button class="cf3-btn is-small" type="button" data-cf3-action="view" data-fixture-id="' +
              esc(fixture.id) + '">View</button></td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>';
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g,'""') + '"' : text;
  }

  function exportFixtures() {
    var rows = [[
      'opponent','fixture_date','fixture_time','venue','venue_address',
      'venue_postcode','city','country','home_or_away','format','notes',
      'home_score','away_score','result','match_facts_status'
    ]];

    allFixtures().forEach(function (fixture) {
      var fact = firstFactForFixture(fixture);
      rows.push([
        fixture.opponent,
        dateKey(fixture.fixture_date),
        fixture.fixture_time || '',
        fixture.venue || '',
        fixture.venue_address || '',
        fixture.venue_postcode || '',
        fixture.city || '',
        fixture.country || '',
        fixture.home_or_away || '',
        fixture.format || '',
        fixture.notes || '',
        fact && fact.home_score != null ? fact.home_score : '',
        fact && fact.away_score != null ? fact.away_score : '',
        fact ? resultLabel(fact) : '',
        fact ? 'Complete' : 'Missing'
      ]);
    });

    downloadText(
      'scoutlink-fixtures-' + new Date().toISOString().slice(0,10) + '.csv',
      rows.map(function (row) { return row.map(csvCell).join(','); }).join('\n'),
      'text/csv;charset=utf-8'
    );
  }

  function downloadTemplate() {
    var rows = [
      [
        'opponent','fixture_date','fixture_time','venue','venue_address',
        'venue_postcode','city','country','home_or_away','format','notes'
      ],
      [
        'Westhaven Development XI','2026-07-25','10:30',
        'Northgate United Training Ground','1 Training Ground Way',
        'N1 1AA','London','England','Home','11','League match'
      ]
    ];

    downloadText(
      'scoutlink-fixture-import-template.csv',
      rows.map(function (row) { return row.map(csvCell).join(','); }).join('\n'),
      'text/csv;charset=utf-8'
    );
  }

  function downloadText(filename, content, type) {
    var blob = new Blob([content], { type:type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;

    for (var index = 0; index < text.length; index += 1) {
      var char = text[index];
      var next = text[index + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell);
        if (row.some(function (value) { return String(value).trim() !== ''; })) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some(function (value) { return String(value).trim() !== ''; })) rows.push(row);
    return rows;
  }

  function normaliseHeader(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/\s+/g,'_')
      .replace(/[^a-z0-9_]/g,'');
  }

  function normaliseCsvDate(value) {
    var text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    var match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!match) return '';
    return [
      match[3],
      String(match[2]).padStart(2,'0'),
      String(match[1]).padStart(2,'0')
    ].join('-');
  }

  function handleCsvFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      var parsed = parseCsv(String(reader.result || ''));
      if (parsed.length < 2) {
        showImportError('The CSV does not contain any fixture rows.');
        return;
      }

      var headers = parsed[0].map(normaliseHeader);
      state.importRows = parsed.slice(1).map(function (values, rowIndex) {
        var source = {};
        headers.forEach(function (header, index) {
          source[header] = String(values[index] || '').trim();
        });

        var opponent = source.opponent || '';
        var fixtureDate = normaliseCsvDate(
          source.fixture_date || source.date || source.fixturedate
        );

        var homeOrAway = source.home_or_away || source.homeaway || source.venue_type || 'Home';
        homeOrAway = homeOrAway.charAt(0).toUpperCase() +
          homeOrAway.slice(1).toLowerCase();
        if (['Home','Away','Neutral'].indexOf(homeOrAway) < 0) homeOrAway = 'Home';

        var format = String(source.format || '11').replace(/[^0-9]/g,'') || '11';
        if (['5','7','9','11'].indexOf(format) < 0) format = '11';

        return {
          rowNumber:rowIndex + 2,
          valid:!!opponent && !!fixtureDate,
          error:!opponent ? 'Opponent is missing' : !fixtureDate ? 'Fixture date is invalid' : '',
          payload:{
            opponent:opponent,
            fixtureDate:fixtureDate,
            fixtureTime:source.fixture_time || source.time || null,
            venue:source.venue || null,
            venueAddress:source.venue_address || source.address || null,
            venuePostcode:source.venue_postcode || source.postcode || null,
            city:source.city || null,
            country:source.country || 'England',
            homeOrAway:homeOrAway,
            format:format,
            notes:source.notes || null
          }
        };
      });

      renderImportPreview();
    };

    reader.onerror = function () {
      showImportError('The CSV could not be read.');
    };
    reader.readAsText(file);
  }

  function showImportError(message) {
    state.importRows = [];
    document.getElementById('cf3ImportPreview').innerHTML =
      '<div class="cf3-notice is-warning" style="margin-top:12px">' + esc(message) + '</div>';
    document.getElementById('cf3RunImport').disabled = true;
  }

  function renderImportPreview() {
    var ready = state.importRows.filter(function (row) { return row.valid; });
    var invalid = state.importRows.filter(function (row) { return !row.valid; });
    var preview = document.getElementById('cf3ImportPreview');

    preview.innerHTML =
      '<div class="cf3-import-preview"><div class="cf3-table-wrap">' +
      '<table class="cf3-table"><thead><tr><th>Row</th><th>Opponent</th><th>Date</th><th>Venue</th><th>Status</th></tr></thead><tbody>' +
      state.importRows.slice(0,25).map(function (row) {
        return '<tr><td>' + row.rowNumber + '</td><td><b>' +
          esc(row.payload.opponent || 'Missing') + '</b></td><td>' +
          esc(row.payload.fixtureDate || 'Invalid') + '</td><td>' +
          esc(row.payload.homeOrAway) + '</td><td><span class="cf3-pill ' +
          (row.valid ? 'is-green' : 'is-orange') + '">' +
          (row.valid ? 'Ready' : esc(row.error)) + '</span></td></tr>';
      }).join('') +
      '</tbody></table></div></div>' +
      '<div class="cf3-notice ' + (invalid.length ? 'is-warning' : 'is-success') +
      '" style="margin-top:10px">' + ready.length + ' ready · ' +
      invalid.length + ' need review.</div>';

    document.getElementById('cf3RunImport').disabled = !ready.length;
    document.getElementById('cf3RunImport').textContent =
      'Import ' + ready.length + ' ready fixture' + (ready.length === 1 ? '' : 's');
  }

  function runImport() {
    var rows = state.importRows.filter(function (row) { return row.valid; });
    if (!rows.length) return;

    var button = document.getElementById('cf3RunImport');
    var message = document.getElementById('cf3ImportMessage');
    var completed = 0;
    var failures = 0;

    button.disabled = true;
    button.textContent = 'Importing…';
    message.textContent = '0 of ' + rows.length + ' imported';

    var chain = Promise.resolve();
    rows.forEach(function (row) {
      chain = chain.then(function () {
        return window.api('POST','/api/fixtures',row.payload).then(function () {
          completed += 1;
          message.textContent = completed + ' of ' + rows.length + ' imported';
        }).catch(function () {
          failures += 1;
        });
      });
    });

    chain.then(function () {
      message.textContent = completed + ' imported' +
        (failures ? ' · ' + failures + ' failed' : '');
      message.style.color = failures ? '#8a4b0a' : '#087a61';
      return loadFixtures(true);
    }).then(function () {
      state.importRows = [];
      document.getElementById('cf3ImportPreview').innerHTML = '';
      document.getElementById('cf3CsvInput').value = '';
      setTimeout(function () {
        if (!failures) closeModal('cf3ImportModal');
      }, 500);
    }).finally(function () {
      button.disabled = false;
      button.textContent = 'Import ready fixtures';
    });
  }

  function refreshChrome() {
    document.body.classList.add('coach-fixtures-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Fixtures';

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Fixtures';

    document.querySelectorAll('.coach-v2-hero').forEach(function (hero) {
      hero.setAttribute('aria-hidden','true');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('coach-fixtures-v3');
    refreshChrome();
    buildPage();
    loadFixtures();
  });

  window.addEventListener('resize', refreshChrome);
})();

'use strict';

(function () {
  var MAX_SQUAD_ROWS = 7;
  var dashboardState = {
    players: [],
    stats: {},
    fixtures: [],
    activity: [],
    archives: [],
    profile: null
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

  function firstName() {
    var user = window.Auth && window.Auth.user;
    return (user && (user.firstName || user.first_name)) || 'Coach';
  }

  function fullName() {
    var user = window.Auth && window.Auth.user;
    if (!user) return 'Coach';
    return ((user.firstName || user.first_name || '') + ' ' + (user.lastName || user.last_name || '')).trim() || 'Coach';
  }

  function initialsFromName(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'C').charAt(0) + (parts[1] || parts[0] || 'O').charAt(0)).toUpperCase();
  }

  function nameOf(player) {
    return (((player && player.first_name) || '') + ' ' + ((player && player.last_name) || '')).trim() || 'Player';
  }

  function overall100(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number > 10 ? number : number * 10);
  }

  function ratingColour(value) {
    var number = overall100(value);
    if (number >= 80) return '#0fa37f';
    if (number >= 65) return '#d99f00';
    if (number >= 50) return '#f97316';
    return '#dc4b58';
  }

  function money(value) {
    var number = Number(value) || 0;
    if (!number) return '\u00a30';
    return '\u00a3' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function shortMoney(value) {
    var number = Number(value) || 0;
    if (!number) return '\u00a30';
    if (number >= 1000000) {
      return '\u00a3' + (number / 1000000).toFixed(number >= 10000000 ? 1 : 2).replace(/\.0+$/, '') + 'M';
    }
    if (number >= 1000) return '\u00a3' + Math.round(number / 1000) + 'K';
    return money(number);
  }

  function dateOnly(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function parseDate(value, time) {
    if (!value) return null;
    var datePart = dateOnly(value);
    var timePart = String(time || '').trim();
    var stamp = datePart + (timePart ? 'T' + timePart.slice(0, 5) + ':00' : 'T12:00:00');
    var date = new Date(stamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function fixtureDate(fixture) {
    var date = parseDate(fixture.fixture_date || fixture.fixtureDate || fixture.date, fixture.fixture_time || fixture.fixtureTime);
    if (!date) return 'Date to be confirmed';
    var formatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    var time = fixture.fixture_time || fixture.fixtureTime;
    return formatted + (time ? ' \u00b7 ' + String(time).slice(0, 5) : '');
  }

  function relativeTime(value) {
    if (!value) return '';
    var stamp = new Date(value).getTime();
    if (!Number.isFinite(stamp)) return '';
    var seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' day' + (Math.floor(seconds / 86400) === 1 ? '' : 's') + ' ago';
    return new Date(stamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? '' : String(value);
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function publicDemo() {
    return typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
  }

  function anyDemo() {
    return typeof window.isDemoMode === 'function' && window.isDemoMode();
  }

  function isoDateFromNow(days) {
    var date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function preparePublicDemoDashboardState() {
    if (!publicDemo() || typeof window.getDemoState !== 'function' || typeof window.setDemoState !== 'function') return;
    try {
      var state = window.getDemoState();
      if (!state || state.coachDashboardV3Prepared) return;
      state.fixtures = [
        {
          id: 'demo-fixture-dashboard-1',
          opponent: 'Westhaven Development XI',
          opponent_name: 'Westhaven Development XI',
          fixture_date: isoDateFromNow(5),
          fixture_time: '10:30',
          home_or_away: 'Home',
          format: '11-a-side',
          venue: 'Northgate United Training Ground',
          venue_name: 'Northgate United Training Ground',
          city: 'London'
        },
        {
          id: 'demo-fixture-dashboard-2',
          opponent: 'Brookfield Athletic',
          opponent_name: 'Brookfield Athletic',
          fixture_date: isoDateFromNow(12),
          fixture_time: '11:00',
          home_or_away: 'Away',
          format: '11-a-side',
          venue: 'Brookfield Sports Park',
          venue_name: 'Brookfield Sports Park',
          city: 'London'
        }
      ];
      state.coachDashboardV3Prepared = true;
      window.setDemoState(state);
    } catch (_) {}
  }

  function demoActivity() {
    if (!publicDemo() || typeof window.getDemoState !== 'function') return [];
    try {
      var state = window.getDemoState();
      var pipeline = (state && state.pipeline) || [];
      return pipeline.slice(0, 2).map(function (item, index) {
        var player = item.player || ((state.players || []).find(function (row) { return row.id === item.player_id; })) || {};
        var playerName = nameOf(player);
        var stage = String(item.stage || 'interested').replace(/_/g, ' ');
        return {
          id: item.id || 'demo-activity-' + index,
          title: index === 0
            ? 'Noah Patel added ' + playerName + ' to the pipeline'
            : playerName + ' moved to ' + stage,
          body: index === 0 ? 'Scout demo activity' : 'Recruitment stage updated',
          createdAt: item.created_at || new Date(Date.now() - index * 86400000).toISOString(),
          actionUrl: route('coach-chat.html'),
          notificationType: 'scout_interest'
        };
      });
    } catch (_) {
      return [];
    }
  }

  function normaliseFixtures(response) {
    var rows = response && (response.data || response.fixtures || response.upcomingFixtures) || [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return rows.filter(function (fixture) {
      var date = parseDate(fixture.fixture_date || fixture.fixtureDate || fixture.date, fixture.fixture_time || fixture.fixtureTime);
      return !date || date.getTime() >= today.getTime();
    }).sort(function (a, b) {
      var aDate = parseDate(a.fixture_date || a.fixtureDate || a.date, a.fixture_time || a.fixtureTime);
      var bDate = parseDate(b.fixture_date || b.fixtureDate || b.date, b.fixture_time || b.fixtureTime);
      return (aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER) - (bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER);
    }).slice(0, 2);
  }

  function normaliseActivity(response) {
    return (response && response.data || []).filter(function (item) {
      var group = String(item.filterGroup || item.filter_group || '').toLowerCase();
      var type = String(item.notificationType || item.notification_type || item.type || '').toLowerCase();
      return group === 'scout_interest' || type === 'scout_interest' || group === 'recruitment' || type === 'recruitment';
    }).slice(0, 2);
  }

  function updateIdentity(profile, playersResponse, stats) {
    var teamName =
      profile && profile.team_name ||
      playersResponse && playersResponse.teamName ||
      stats && stats.teamName ||
      (window.Auth && window.Auth.user && (window.Auth.user.teamName || window.Auth.user.team_name)) ||
      localStorage.getItem('sl_team_name') ||
      '';

    if (teamName) localStorage.setItem('sl_team_name', teamName);

    var welcome = 'Welcome, ' + firstName();
    setText('coachTitle', welcome);
    setText('dashboardHeroTitle', welcome);
    setText('mobileDashboardTitle', 'Dashboard');

    var sideUser = document.getElementById('sidebarUser');
    if (sideUser) {
      sideUser.innerHTML =
        '<div class="user-info">' +
          '<div class="user-avatar">' + esc(initialsFromName(fullName())) + '</div>' +
          '<div><div class="user-name">' + esc(fullName()) + '</div>' +
          '<div class="user-role">Coach' + (teamName ? ' \u00b7 ' + esc(teamName) : '') + '</div></div>' +
        '</div>';
    }

    if (window.CoachV2 && typeof window.CoachV2.refresh === 'function' && teamName) {
      setTimeout(function () { window.CoachV2.refresh(); }, 0);
    }
  }

  function renderStats(players, stats, activity) {
    var totalPlayers = players.length;
    var totalValue = players.reduce(function (sum, player) {
      return sum + (Number(player.transfer_value) || 0);
    }, 0);
    var top = players.slice().sort(function (a, b) {
      return overall100(b.overall_rating) - overall100(a.overall_rating);
    })[0] || null;

    var interested = Number(stats.scoutsInterested);
    if (!Number.isFinite(interested)) interested = 0;

    var newInterestCount = Number(stats.newInterestCount);
    if (!Number.isFinite(newInterestCount)) {
      var weekAgo = Date.now() - 7 * 86400000;
      newInterestCount = activity.filter(function (item) {
        var created = new Date(item.createdAt || item.created_at || 0).getTime();
        return Number.isFinite(created) && created >= weekAgo;
      }).length;
    }

    setText('kpiPlayers', totalPlayers);
    setText('kpiPlayersSub', totalPlayers ? totalPlayers + ' active profile' + (totalPlayers === 1 ? '' : 's') : 'Add your first player');
    setText('kpiInterest', interested);
    setText('kpiInterestSub', newInterestCount ? newInterestCount + ' new this week' : 'No new interest this week');
    setText('kpiValue', shortMoney(totalValue));
    setText('kpiValueSub', 'Estimated player value');

    var topLink = document.getElementById('kpiTop');
    var topSub = document.getElementById('kpiTopSub');
    if (top) {
      topLink.textContent = nameOf(top);
      topLink.href = route('player-profile.html?id=' + encodeURIComponent(top.id || ''));
      topLink.removeAttribute('aria-disabled');
      if (topSub) topSub.textContent = overall100(top.overall_rating) + ' overall';
    } else {
      topLink.textContent = 'No players yet';
      topLink.removeAttribute('href');
      topLink.setAttribute('aria-disabled', 'true');
      if (topSub) topSub.textContent = 'Add a player to begin';
    }
  }

  function renderSquad(players) {
    var host = document.getElementById('myPlayers');
    if (!host) return;

    if (!players.length) {
      host.innerHTML =
        '<div class="coach-dashboard-empty">' +
          '<div><p>No players in your squad yet.</p>' +
          '<a href="' + esc(route('add-player.html')) + '" class="btn btn-primary">Add your first player</a></div>' +
        '</div>';
      return;
    }

    var rows = players.slice(0, MAX_SQUAD_ROWS).map(function (player) {
      var profileUrl = route('player-profile.html?id=' + encodeURIComponent(player.id || ''));
      var position = player.specific_position || player.primary_position || player.position_group || '--';
      var rating = overall100(player.overall_rating);
      return '<tr data-profile-url="' + esc(profileUrl) + '">' +
        '<td><a class="coach-dashboard-player-link" href="' + esc(profileUrl) + '">' + esc(nameOf(player)) + '</a></td>' +
        '<td>' + esc(player.age_group || '--') + '</td>' +
        '<td>' + esc(position) + '</td>' +
        '<td><span class="coach-dashboard-rating" style="color:' + ratingColour(player.overall_rating) + '">' + esc(rating || '--') + '</span></td>' +
        '<td><span class="coach-dashboard-value">' + esc(money(player.transfer_value)) + '</span></td>' +
        '<td>' + esc(player.appearances || 0) + '</td>' +
        '<td>' + esc(player.goals || 0) + '</td>' +
        '<td>' + esc(player.assists || 0) + '</td>' +
      '</tr>';
    }).join('');

    host.innerHTML =
      '<div class="coach-dashboard-table-wrap" tabindex="0" aria-label="Coach squad table. Swipe horizontally on a phone to see every column.">' +
        '<table class="coach-dashboard-table">' +
          '<thead><tr><th>Player</th><th>Age group</th><th>Position</th><th>Overall</th><th>Value</th><th>Apps</th><th>Goals</th><th>Assists</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';

    host.querySelectorAll('tr[data-profile-url]').forEach(function (row) {
      row.addEventListener('click', function (event) {
        if (event.target.closest('a,button')) return;
        window.location.href = row.getAttribute('data-profile-url');
      });
    });
  }

  function renderFixtures(fixtures) {
    var host = document.getElementById('upcomingFixtures');
    if (!host) return;

    if (!fixtures.length) {
      host.innerHTML =
        '<div class="coach-dashboard-inline-empty">No upcoming fixtures yet.<br>' +
        '<a href="' + esc(route('coach-fixtures.html')) + '">Add your first fixture</a>.</div>';
      return;
    }

    host.innerHTML = '<div class="coach-dashboard-fixture-list">' + fixtures.map(function (fixture) {
      var opponent = fixture.opponent_name || fixture.opponent || 'Opponent to be confirmed';
      var venue = fixture.venue_name || fixture.venue || fixture.city || '';
      var homeAway = fixture.home_or_away || fixture.homeOrAway || 'Home';
      return '<article class="coach-dashboard-fixture">' +
        '<div><b>' + esc(opponent) + '</b><p>' + esc(fixtureDate(fixture)) +
          (venue ? ' \u00b7 ' + esc(venue) : '') + '</p></div>' +
        '<span class="coach-dashboard-fixture-badge ' + (String(homeAway).toLowerCase() === 'away' ? 'is-away' : '') + '">' + esc(homeAway) + '</span>' +
      '</article>';
    }).join('') + '</div>';
  }

  function activityIcon(item) {
    var type = String(item.notificationType || item.notification_type || item.type || '').toLowerCase();
    return type === 'recruitment' ? '\u2605' : 'SC';
  }

  function renderActivity(activity) {
    var host = document.getElementById('recentScoutActivity');
    if (!host) return;

    if (!activity.length) {
      host.innerHTML =
        '<div class="coach-dashboard-inline-empty">No recent scout interest yet.<br>New activity will appear here.</div>';
      return;
    }

    host.innerHTML = '<div class="coach-dashboard-activity-list">' + activity.map(function (item) {
      var title = item.title || 'Scout activity';
      var body = item.body || item.message || item.typeLabel || 'ScoutLink update';
      var created = item.createdAt || item.created_at;
      var url = item.actionUrl || route('coach-chat.html');
      return '<a class="coach-dashboard-activity" href="' + esc(url) + '">' +
        '<span class="coach-dashboard-activity-icon">' + esc(activityIcon(item)) + '</span>' +
        '<span><b>' + esc(title) + '</b><p>' + esc(body) + (created ? ' \u00b7 ' + esc(relativeTime(created)) : '') + '</p></span>' +
      '</a>';
    }).join('') + '</div>';
  }

  function renderLoadError(error) {
    var message = error && error.message ? error.message : 'The dashboard could not be loaded.';
    setHtml('myPlayers',
      '<div class="coach-dashboard-error">' + esc(message) +
      '<br><button type="button" class="btn btn-primary" id="retryDashboardBtn">Try again</button></div>');
    setHtml('upcomingFixtures', '<div class="coach-dashboard-error">Fixtures are unavailable.</div>');
    setHtml('recentScoutActivity', '<div class="coach-dashboard-error">Scout activity is unavailable.</div>');
    var retry = document.getElementById('retryDashboardBtn');
    if (retry) retry.addEventListener('click', loadDashboard);
  }

  async function loadDashboard() {
    setHtml('myPlayers', '<div class="coach-dashboard-panel-body"><div class="coach-dashboard-loading" aria-label="Loading squad"></div></div>');
    setHtml('upcomingFixtures', '<div class="coach-dashboard-loading" aria-label="Loading fixtures"></div>');
    setHtml('recentScoutActivity', '<div class="coach-dashboard-loading" aria-label="Loading scout activity"></div>');

    try {
      preparePublicDemoDashboardState();

      var results = await Promise.allSettled([
        window.api('GET', '/api/coaches/my-players'),
        window.api('GET', '/api/coaches/dashboard'),
        window.api('GET', '/api/fixtures?upcoming=true'),
        window.api('GET', '/api/notifications?limit=10'),
        window.api('GET', '/api/coaches/profile')
      ]);

      if (results[0].status === 'rejected') throw results[0].reason;

      var playersResponse = results[0].value || {};
      var players = playersResponse.data || playersResponse.players || [];
      var stats = results[1].status === 'fulfilled' ? results[1].value || {} : {};
      var fixtures = results[2].status === 'fulfilled' ? normaliseFixtures(results[2].value) : [];
      var activity = results[3].status === 'fulfilled' ? normaliseActivity(results[3].value) : [];
      var profileResponse = results[4].status === 'fulfilled' ? results[4].value || {} : {};
      var profile = profileResponse.coach || profileResponse.data || null;

      if (publicDemo()) {
        if (!fixtures.length && typeof window.getDemoState === 'function') {
          fixtures = normaliseFixtures({ data: window.getDemoState().fixtures || [] });
        }
        if (!activity.length) activity = demoActivity();
        if (!Number.isFinite(Number(stats.scoutsInterested)) && typeof window.getDemoState === 'function') {
          stats.scoutsInterested = (window.getDemoState().pipeline || []).length;
        }
      }

      dashboardState.players = players;
      dashboardState.stats = stats;
      dashboardState.fixtures = fixtures;
      dashboardState.activity = activity;
      dashboardState.profile = profile;

      updateIdentity(profile, playersResponse, stats);
      renderStats(players, stats, activity);
      renderSquad(players);
      renderFixtures(fixtures);
      renderActivity(activity);

      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    } catch (error) {
      console.error('[CoachDashboardV3]', error);
      renderLoadError(error);
    }
  }

  async function loadPreviousSeasons() {
    try {
      var result = await window.api('GET', '/api/season/archives');
      var archives = result.data || [];
      dashboardState.archives = archives;
      if (!archives.length) return;

      var card = document.getElementById('prevSeasonsCard');
      if (card) card.style.display = 'block';
      setHtml('prevSeasonsList', archives.map(function (archive) {
        var count = archive.player_summaries ? Object.keys(archive.player_summaries).length : 0;
        return '<article class="season-archive-card">' +
          '<div><b>Season ' + esc(archive.season_label || '--') + '</b>' +
          '<p style="margin:3px 0 0;color:#607189;font-size:10px">' + count + ' players \u00b7 Archived ' + esc(relativeTime(archive.archived_at)) + '</p></div>' +
          '<button type="button" class="btn btn-sm btn-outline" data-archive-id="' + esc(archive.id) + '">View summary</button>' +
        '</article>';
      }).join(''));

      var host = document.getElementById('prevSeasonsList');
      if (host && !host.dataset.bound) {
        host.dataset.bound = '1';
        host.addEventListener('click', function (event) {
          var button = event.target.closest('[data-archive-id]');
          if (!button) return;
          showSeasonSummary(button.getAttribute('data-archive-id'));
        });
      }
    } catch (_) {}
  }

  function showSeasonSummary(id) {
    var archive = dashboardState.archives.find(function (row) { return String(row.id) === String(id); });
    if (!archive) return;

    setText('summaryTitle', 'Season ' + (archive.season_label || '') + ' summary');
    var rows = Object.values(archive.player_summaries || {});
    setHtml('summaryContent', rows.length
      ? '<div class="coach-dashboard-table-wrap"><table class="coach-dashboard-table"><thead><tr><th>Player</th><th>Apps</th><th>Goals</th><th>Assists</th><th>Clean sheets</th><th>Yellow</th><th>Red</th></tr></thead><tbody>' +
        rows.map(function (player) {
          return '<tr><td><b>' + esc(player.name || player.player_name || '--') + '</b></td><td>' + esc(player.appearances || 0) + '</td><td>' + esc(player.goals || 0) + '</td><td>' + esc(player.assists || 0) + '</td><td>' + esc(player.clean_sheets || 0) + '</td><td>' + esc(player.yellow_cards || 0) + '</td><td>' + esc(player.red_cards || 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<p>No player data was recorded for this season.</p>');
    openModal('seasonSummaryModal');
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    var focus = modal.querySelector('button,[href],input,select,textarea');
    if (focus) focus.focus();
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
  }

  function bindInteractions() {
    var logout = document.getElementById('logoutBtn');
    if (logout && !logout.dataset.bound) {
      logout.dataset.bound = '1';
      logout.addEventListener('click', function () {
        if (publicDemo() && typeof window.exitPublicDemo === 'function') {
          window.exitPublicDemo();
          return;
        }
        if (window.Auth) window.Auth.clear();
        window.location.href = route('login.html?logout=1');
      });
    }

    var notification = document.getElementById('notifToggleBtn');
    if (notification && !notification.dataset.bound) {
      notification.dataset.bound = '1';
      notification.addEventListener('click', function () {
        if (typeof window.toggleNotifPanel === 'function') window.toggleNotifPanel();
        else window.location.href = route('coach-notifications.html');
      });
    }

    var menu = document.querySelector('.coach-v2-menu-button');
    if (menu && !menu.dataset.dashboardBound) {
      menu.dataset.dashboardBound = '1';
      menu.addEventListener('click', function () {
        document.body.classList.add('coach-v2-menu-open');
      });
    }

    document.querySelectorAll('[data-close-dashboard-modal]').forEach(function (button) {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        closeModal(button.getAttribute('data-close-dashboard-modal'));
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.coach-dashboard-modal[aria-hidden="false"]').forEach(function (modal) {
        modal.setAttribute('aria-hidden', 'true');
      });
    });
  }

  function ensureCoachNavigation() {
    if (!window.Auth || !window.Auth.isLoggedIn() || window.Auth.type !== 'Coach') {
      window.location.href = route('login.html');
      return false;
    }

    if (typeof window.buildScoutNav === 'function') {
      window.buildScoutNav('sidebarNav', 'Coach');
    }
    return true;
  }

  function init() {
    if (!ensureCoachNavigation()) return;
    bindInteractions();
    setText('coachTitle', 'Welcome, ' + firstName());
    setText('dashboardHeroTitle', 'Welcome, ' + firstName());

    loadDashboard();
    loadPreviousSeasons();

    // Main.js adds the correct Switch demo / Switch experience action after auth is resolved.
    if (typeof window.maybeShowExperienceSwitcher === 'function') {
      window.maybeShowExperienceSwitcher();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

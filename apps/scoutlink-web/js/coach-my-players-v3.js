'use strict';

(function () {
  var state = {
    players: [],
    profile: null,
    teamCoaches: [],
    isSuperUser: false,
    sort: 'overall',
    view: 'grid'
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

  function publicDemo() {
    return typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
  }

  function fullName(user) {
    user = user || (window.Auth && window.Auth.user) || {};
    return ((user.firstName || user.first_name || '') + ' ' + (user.lastName || user.last_name || '')).trim() || 'Coach';
  }

  function initials(value) {
    var parts = String(value || 'Player').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'P').charAt(0) + (parts[1] || parts[0] || 'L').charAt(0)).toUpperCase();
  }

  function playerName(player) {
    return (((player && player.first_name) || '') + ' ' + ((player && player.last_name) || '')).trim() || 'Player';
  }

  function positionOf(player) {
    return player.specific_position || player.primary_position || player.position_group || 'Position TBC';
  }

  function overall100(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number > 10 ? number : number * 10);
  }

  function money(value) {
    var number = Number(value) || 0;
    if (!number) return '\u00a30';
    if (number >= 1000000) {
      return '\u00a3' + (number / 1000000).toFixed(number >= 10000000 ? 1 : 2).replace(/\.0+$/, '') + 'M';
    }
    if (number >= 1000) return '\u00a3' + Math.round(number / 1000) + 'K';
    return '\u00a3' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function fullMoney(value) {
    return '\u00a3' + (Number(value) || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function completion(player) {
    var keys = [
      'first_name', 'last_name', 'age_group', 'specific_position',
      'overall_rating', 'transfer_value', 'height_category',
      'build_category', 'foot'
    ];
    var done = keys.filter(function (key) {
      return player && player[key] !== null && player[key] !== undefined && String(player[key]).trim() !== '';
    }).length;
    if (Number(player && player.appearances) > 0) done++;
    if (Number(player && player.goals) > 0 || Number(player && player.assists) > 0) done++;
    return Math.min(100, Math.round(done / 11 * 100));
  }

  function evidence(player) {
    var profileCompletion = completion(player);
    var appearances = Number(player.appearances) || 0;

    if (profileCompletion >= 90 && appearances >= 3) {
      return { key: 'strong', label: 'Strong evidence', className: 'is-strong' };
    }
    if (profileCompletion >= 70 || appearances > 0) {
      return { key: 'growing', label: 'Growing evidence', className: 'is-growing' };
    }
    return { key: 'needs', label: 'Needs evidence', className: 'is-needs' };
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value == null ? '' : String(value);
  }

  function profileUrl(player) {
    return route('player-profile.html?id=' + encodeURIComponent(player.id || ''));
  }

  function updateIdentity(teamName) {
    if (teamName) localStorage.setItem('sl_team_name', teamName);
    var user = (window.Auth && window.Auth.user) || {};
    var name = fullName(user);
    var sidebar = document.getElementById('sidebarUser');

    if (sidebar) {
      sidebar.innerHTML =
        '<div class="user-info">' +
          '<div class="user-avatar">' + esc(initials(name)) + '</div>' +
          '<div><div class="user-name">' + esc(name) + '</div>' +
          '<div class="user-role">Coach' + (teamName ? ' \u00b7 ' + esc(teamName) : '') + '</div></div>' +
        '</div>';
    }

    if (window.CoachV2 && typeof window.CoachV2.refresh === 'function') {
      setTimeout(function () { window.CoachV2.refresh(); }, 0);
    }
  }

  function coachOptions(selectedId) {
    if (!state.teamCoaches.length) return '<option value="">No team coaches found</option>';
    return state.teamCoaches.map(function (coach) {
      var name = ((coach.first_name || '') + ' ' + (coach.last_name || '')).trim() || 'Coach';
      return '<option value="' + esc(coach.id) + '"' +
        (String(selectedId || '') === String(coach.id || '') ? ' selected' : '') +
        '>' + esc(name) + (coach.is_super_user ? ' (Super user)' : '') + '</option>';
    }).join('');
  }

  function assignedCoachName(player) {
    var match = state.teamCoaches.find(function (coach) {
      return String(coach.id || '') === String(player.assigned_coach_id || '');
    });
    return match ? ((match.first_name || '') + ' ' + (match.last_name || '')).trim() : '';
  }

  function assignmentMarkup(player) {
    if (!state.isSuperUser) {
      return '<span class="coach-player-pill" title="This player is managed by a Coach account">Coach managed</span>';
    }

    var label = assignedCoachName(player);
    return '<button type="button" class="coach-player-pill" data-assignment-toggle="' + esc(player.id) + '"' +
      ' aria-expanded="false" title="' + esc(label ? 'Managed by ' + label : 'Choose assigned coach') + '">Coach managed</button>';
  }

  function assignmentPanel(player) {
    if (!state.isSuperUser) return '';
    return '<div class="coach-player-assignment" id="assignment-' + esc(player.id) + '" hidden>' +
      '<label for="coach-' + esc(player.id) + '">Assigned coach</label>' +
      '<select id="coach-' + esc(player.id) + '" data-assign-player="' + esc(player.id) + '">' +
        coachOptions(player.assigned_coach_id) +
      '</select>' +
    '</div>';
  }

  function cardMarkup(player) {
    var profileCompletion = completion(player);
    var evidenceState = evidence(player);
    var name = playerName(player);
    var viewUrl = profileUrl(player, false);
    var editUrl = profileUrl(player, true);

    return '<article class="coach-player-card">' +
      '<div class="coach-player-top">' +
        '<div class="coach-player-id">' +
          '<div class="coach-player-avatar" aria-hidden="true">' + esc(initials(name)) + '</div>' +
          '<div class="coach-player-copy"><h4>' + esc(name) + '</h4>' +
            '<p>' + esc(player.age_group || 'Age group TBC') + ' \u00b7 ' + esc(positionOf(player)) + '</p></div>' +
        '</div>' +
        '<div class="coach-player-rating" aria-label="Overall rating ' + esc(overall100(player.overall_rating) || 'not available') + '">' +
          esc(overall100(player.overall_rating) || '--') +
        '</div>' +
      '</div>' +
      '<div class="coach-player-evidence-row">' +
        '<div class="coach-player-evidence-box"><b>' + esc(money(player.transfer_value)) + '</b><span>Value</span></div>' +
        '<div class="coach-player-evidence-box"><b>' + esc(player.appearances || 0) + '</b><span>Apps</span></div>' +
        '<div class="coach-player-evidence-box"><b>' + esc(player.goals || 0) + '</b><span>Goals</span></div>' +
      '</div>' +
      '<div class="coach-player-progress-label"><span>Profile completion</span><b>' + profileCompletion + '%</b></div>' +
      '<div class="coach-player-progress" aria-label="Profile completion ' + profileCompletion + ' percent"><span style="width:' + profileCompletion + '%"></span></div>' +
      '<div class="coach-player-tags">' +
        '<span class="coach-player-pill ' + evidenceState.className + '">' + esc(evidenceState.label) + '</span>' +
        assignmentMarkup(player) +
      '</div>' +
      assignmentPanel(player) +
      '<div class="coach-player-actions">' +
        '<a class="btn btn-outline" href="' + esc(viewUrl) + '">View profile</a>' +
        '<a class="btn btn-primary" href="' + esc(editUrl) + '">Edit</a>' +
      '</div>' +
    '</article>';
  }

  function tableMarkup(players) {
    return '<div class="coach-players-table-wrap" tabindex="0" aria-label="Player table. Scroll horizontally to see all columns.">' +
      '<table class="coach-players-table">' +
        '<thead><tr>' +
          '<th>Player</th><th>Age group</th><th>Position</th><th>Overall</th>' +
          '<th>Value</th><th>Apps</th><th>Goals</th><th>Assists</th><th>Evidence</th>' +
          (state.isSuperUser ? '<th>Assigned coach</th>' : '') +
          '<th></th>' +
        '</tr></thead>' +
        '<tbody>' +
          players.map(function (player) {
            var ev = evidence(player);
            return '<tr>' +
              '<td><a class="coach-players-table-name" href="' + esc(profileUrl(player, false)) + '">' + esc(playerName(player)) + '</a></td>' +
              '<td>' + esc(player.age_group || '--') + '</td>' +
              '<td>' + esc(positionOf(player)) + '</td>' +
              '<td><b style="color:#d99f00">' + esc(overall100(player.overall_rating) || '--') + '</b></td>' +
              '<td><b style="color:#087a61">' + esc(fullMoney(player.transfer_value)) + '</b></td>' +
              '<td>' + esc(player.appearances || 0) + '</td>' +
              '<td>' + esc(player.goals || 0) + '</td>' +
              '<td>' + esc(player.assists || 0) + '</td>' +
              '<td><span class="coach-player-pill ' + ev.className + '">' + esc(ev.label) + '</span></td>' +
              (state.isSuperUser
                ? '<td><select class="coach-players-table-coach" data-assign-player="' + esc(player.id) + '">' + coachOptions(player.assigned_coach_id) + '</select></td>'
                : '') +
              '<td><a class="btn btn-sm btn-outline" href="' + esc(profileUrl(player, false)) + '">View</a></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  function filteredPlayers() {
    var search = String(document.getElementById('searchInput').value || '').trim().toLowerCase();
    var position = document.getElementById('positionFilter').value;
    var evidenceFilter = document.getElementById('evidenceFilter').value;

    var list = state.players.filter(function (player) {
      var matchesName = !search || playerName(player).toLowerCase().indexOf(search) >= 0;
      var matchesPosition = !position || player.position_group === position;
      var matchesEvidence = !evidenceFilter || evidence(player).key === evidenceFilter;
      return matchesName && matchesPosition && matchesEvidence;
    });

    list.sort(function (a, b) {
      if (state.sort === 'name') return playerName(a).localeCompare(playerName(b));
      if (state.sort === 'value') return (Number(b.transfer_value) || 0) - (Number(a.transfer_value) || 0);
      if (state.sort === 'appearances') return (Number(b.appearances) || 0) - (Number(a.appearances) || 0);
      if (state.sort === 'goals') return (Number(b.goals) || 0) - (Number(a.goals) || 0);
      return overall100(b.overall_rating) - overall100(a.overall_rating);
    });

    return list;
  }

  function render() {
    var host = document.getElementById('playersContainer');
    if (!host) return;
    var players = filteredPlayers();

    if (!players.length) {
      host.innerHTML =
        '<div class="coach-players-empty"><div><p>No players match these filters.</p>' +
        '<button type="button" class="btn btn-outline" id="clearPlayerFilters">Clear filters</button></div></div>';
      var clear = document.getElementById('clearPlayerFilters');
      if (clear) clear.addEventListener('click', clearFilters);
      return;
    }

    if (state.view === 'table' && window.innerWidth > 950) {
      host.innerHTML = tableMarkup(players);
    } else {
      state.view = 'grid';
      host.innerHTML = '<section class="coach-players-grid" aria-label="Player cards">' +
        players.map(cardMarkup).join('') +
      '</section>';
    }

    updateMenuStates();
  }

  function renderStats() {
    var players = state.players;
    var total = players.length;
    var average = total
      ? Math.round(players.reduce(function (sum, player) {
          return sum + overall100(player.overall_rating);
        }, 0) / total)
      : 0;
    var top = players.slice().sort(function (a, b) {
      return overall100(b.overall_rating) - overall100(a.overall_rating);
    })[0] || null;
    var totalValue = players.reduce(function (sum, player) {
      return sum + (Number(player.transfer_value) || 0);
    }, 0);

    setText('kpiTotal', total);
    setText('kpiTotalSub', total ? total + ' active profile' + (total === 1 ? '' : 's') : 'Add your first player');
    setText('kpiAverage', total ? average : '--');
    setText('kpiAverageSub', total ? 'Across active squad' : 'No ratings yet');
    setText('kpiValue', money(totalValue));
    setText('kpiValueSub', 'Estimated value');

    var topLink = document.getElementById('kpiTop');
    var topSub = document.getElementById('kpiTopSub');
    if (top) {
      topLink.textContent = playerName(top);
      topLink.href = profileUrl(top, false);
      topLink.removeAttribute('aria-disabled');
      topSub.textContent = overall100(top.overall_rating) + ' overall';
    } else {
      topLink.textContent = 'No players yet';
      topLink.removeAttribute('href');
      topLink.setAttribute('aria-disabled', 'true');
      topSub.textContent = 'Add a player to begin';
    }
  }

  function loadingMarkup() {
    return '<div class="coach-players-loading-grid" aria-label="Loading players">' +
      [0, 1, 2, 3, 4, 5, 6, 7].map(function () {
        return '<div class="coach-players-skeleton"></div>';
      }).join('') +
    '</div>';
  }

  async function loadTeamCoaches(profile) {
    if (!state.isSuperUser) return;
    try {
      var result = await window.api('GET', '/api/coaches/team-coaches');
      var seen = {};
      state.teamCoaches = [profile].concat(result.data || result.coaches || []).filter(function (coach) {
        if (!coach || !coach.id || seen[coach.id]) return false;
        seen[coach.id] = true;
        return true;
      });
    } catch (_) {
      state.teamCoaches = profile && profile.id ? [profile] : [];
    }
  }

  async function loadPlayers() {
    var host = document.getElementById('playersContainer');
    if (host) host.innerHTML = loadingMarkup();

    try {
      var results = await Promise.allSettled([
        window.api('GET', '/api/coaches/my-players'),
        window.api('GET', '/api/coaches/profile')
      ]);

      if (results[0].status === 'rejected') throw results[0].reason;

      var response = results[0].value || {};
      var profileResponse = results[1].status === 'fulfilled' ? results[1].value || {} : {};
      var profile = profileResponse.coach || profileResponse.data || {};
      var players = response.data || response.players || [];

      state.players = players;
      state.profile = profile;
      state.isSuperUser = response.isSuperUser !== undefined
        ? !!response.isSuperUser
        : !!profile.is_super_user;

      await loadTeamCoaches(profile);

      var teamName = response.teamName || profile.team_name ||
        ((window.Auth && window.Auth.user && (window.Auth.user.teamName || window.Auth.user.team_name)) || '');

      updateIdentity(teamName);
      renderStats();
      render();

      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    } catch (error) {
      console.error('[CoachMyPlayersV3]', error);
      if (host) {
        host.innerHTML =
          '<div class="coach-players-error"><div><p>' +
          esc(error && error.message ? error.message : 'The player list could not be loaded.') +
          '</p><button type="button" class="btn btn-primary" id="retryPlayersBtn">Try again</button></div></div>';
      }
      var retry = document.getElementById('retryPlayersBtn');
      if (retry) retry.addEventListener('click', loadPlayers);
    }
  }

  async function assignCoach(playerId, coachId, select) {
    if (!playerId || !coachId) return;
    select.disabled = true;

    try {
      await window.api('POST', '/api/coaches/assign-player/' + encodeURIComponent(playerId), {
        coachId: coachId
      });

      state.players = state.players.map(function (player) {
        if (String(player.id) === String(playerId)) player.assigned_coach_id = coachId;
        return player;
      });

      render();
    } catch (error) {
      window.alert('Could not reassign player: ' + (error.message || 'Unknown error'));
      select.disabled = false;
    }
  }

  function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('positionFilter').value = '';
    document.getElementById('evidenceFilter').value = '';
    render();
  }

  function sortLabel() {
    return {
      overall: 'Overall',
      name: 'Name',
      value: 'Value',
      appearances: 'Appearances',
      goals: 'Goals'
    }[state.sort] || 'Overall';
  }

  function updateMenuStates() {
    setText('sortButtonLabel', 'Sort: ' + sortLabel());

    document.querySelectorAll('[data-sort]').forEach(function (button) {
      var active = button.getAttribute('data-sort') === state.sort;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-view]').forEach(function (button) {
      var active = button.getAttribute('data-view') === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function toggleSortMenu(forceOpen) {
    var menu = document.getElementById('sortMenu');
    var button = document.getElementById('sortButton');
    if (!menu || !button) return;

    var open = forceOpen !== undefined ? !!forceOpen : menu.hasAttribute('hidden');
    if (open) menu.removeAttribute('hidden');
    else menu.setAttribute('hidden', '');

    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function bindEvents() {
    ['searchInput', 'positionFilter', 'evidenceFilter'].forEach(function (id) {
      var control = document.getElementById(id);
      if (!control) return;
      control.addEventListener(id === 'searchInput' ? 'input' : 'change', render);
    });

    var sortButton = document.getElementById('sortButton');
    if (sortButton) sortButton.addEventListener('click', function () {
      toggleSortMenu();
    });

    var sortMenu = document.getElementById('sortMenu');
    if (sortMenu) {
      sortMenu.addEventListener('click', function (event) {
        var sortOption = event.target.closest('[data-sort]');
        var viewOption = event.target.closest('[data-view]');

        if (sortOption) {
          state.sort = sortOption.getAttribute('data-sort') || 'overall';
          toggleSortMenu(false);
          render();
        }

        if (viewOption) {
          state.view = viewOption.getAttribute('data-view') || 'grid';
          toggleSortMenu(false);
          render();
        }
      });
    }

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.coach-players-sort-wrap')) toggleSortMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') toggleSortMenu(false);
    });

    var container = document.getElementById('playersContainer');
    if (container) {
      container.addEventListener('click', function (event) {
        var toggle = event.target.closest('[data-assignment-toggle]');
        if (!toggle) return;

        var id = toggle.getAttribute('data-assignment-toggle');
        var panel = document.getElementById('assignment-' + id);
        if (!panel) return;

        var opening = panel.hasAttribute('hidden');
        if (opening) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');

        toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });

      container.addEventListener('change', function (event) {
        var select = event.target.closest('[data-assign-player]');
        if (!select) return;
        assignCoach(select.getAttribute('data-assign-player'), select.value, select);
      });
    }

    var logout = document.getElementById('logoutBtn');
    if (logout) {
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
    if (notification) {
      notification.addEventListener('click', function () {
        if (typeof window.toggleNotifPanel === 'function') window.toggleNotifPanel();
        else window.location.href = route('coach-notifications.html');
      });
    }
  }

  function ensureCoach() {
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
    if (!ensureCoach()) return;
    bindEvents();
    updateMenuStates();
    loadPlayers();

    if (typeof window.maybeShowExperienceSwitcher === 'function') {
      window.maybeShowExperienceSwitcher();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

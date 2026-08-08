'use strict';

(function () {
  var state = {
    players: [],
    profile: null,
    teamCoaches: [],
    isSuperUser: false,
    sort: 'overall',
    page: 1,
    pageSize: 14,
    activeMenuId: null
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

  function toast(message, tone) {
    if (window.CoachOverlays && typeof window.CoachOverlays.showCoachToast === 'function') {
      window.CoachOverlays.showCoachToast(message, { tone: tone || 'info' });
      return;
    }
    window.alert(message);
  }

  function fullName(user) {
    user = user || (window.Auth && window.Auth.user) || {};
    return ((user.firstName || user.first_name || '') + ' ' + (user.lastName || user.last_name || '')).trim() || 'Coach';
  }

  function initials(value) {
    var parts = String(value || 'Player').trim().split(/\s+/).filter(Boolean);
    var first = (parts[0] || 'P').charAt(0);
    var second = (parts[1] || parts[0] || 'L').charAt(0);
    return (first + second).toUpperCase();
  }

  function playerName(player) {
    return (((player && player.first_name) || '') + ' ' + ((player && player.last_name) || '')).trim() || 'Player';
  }

  function positionOf(player) {
    return player.specific_position || player.primary_position || player.position_group || 'Position TBC';
  }

  function overall100(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.min(100, Math.round(number > 10 ? number : number * 10));
  }

  function money(value) {
    var number = Number(value) || 0;
    if (!number) return 'Not set';
    if (number >= 1000000) {
      return 'GBP ' + (number / 1000000).toFixed(number >= 10000000 ? 1 : 2).replace(/\.0+$/, '') + 'M';
    }
    if (number >= 1000) return 'GBP ' + Math.round(number / 1000) + 'K';
    return 'GBP ' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function fullMoney(value) {
    var number = Number(value) || 0;
    return number ? 'GBP ' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : 'Not set';
  }

  function numberText(value) {
    var number = Number(value) || 0;
    return number.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function profileCompletion(player) {
    var keys = [
      'first_name',
      'last_name',
      'age_group',
      'position_group',
      'specific_position',
      'overall_rating',
      'transfer_value',
      'height_category',
      'build_category',
      'foot'
    ];
    var done = keys.filter(function (key) {
      var value = player && player[key];
      return value !== null && value !== undefined && String(value).trim() !== '';
    }).length;
    if (Number(player && player.appearances) > 0) done += 1;
    if (Number(player && player.goals) > 0 || Number(player && player.assists) > 0 || Number(player && player.clean_sheets) > 0) {
      done += 1;
    }
    return Math.min(100, Math.round(done / 12 * 100));
  }

  function evidenceState(player) {
    var completion = profileCompletion(player);
    var apps = Number(player && player.appearances) || 0;
    if (completion >= 88 && apps >= 3) return { key: 'strong', label: 'Strong evidence', className: 'is-strong' };
    if (completion >= 68 || apps > 0) return { key: 'growing', label: 'Growing evidence', className: 'is-growing' };
    return { key: 'needs', label: 'Needs evidence', className: 'is-needs' };
  }

  function statusFor(player) {
    var rating = overall100(player && player.overall_rating);
    var apps = Number(player && player.appearances) || 0;
    var completion = profileCompletion(player);
    if (!rating) return { label: 'Attributes unrated', className: 'is-needs' };
    if (!player.height_category || !player.build_category) return { label: 'Missing physical context', className: 'is-needs' };
    if (player.has_scout_interest || Number(player.scout_interest_count) > 0 || Number(player.scouts_interested) > 0) {
      return { label: 'Scout interest', className: 'is-strong' };
    }
    if (!apps) return { label: 'Match Facts needed', className: 'is-growing' };
    if (completion >= 86) return { label: 'Match-ready', className: 'is-strong' };
    return { label: 'Evidence growing', className: 'is-growing' };
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value == null ? '' : String(value);
  }

  function profileUrl(player, edit) {
    var id = encodeURIComponent(player && player.id || '');
    return route('/player/profile?id=' + id + (edit ? '&edit=1' : ''));
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
          '<div><b>' + esc(name) + '</b><small>Coach' + (teamName ? ' - ' + esc(teamName) : '') + '</small></div>' +
        '</div>';
    }

    if (window.CoachV2 && typeof window.CoachV2.refresh === 'function') {
      setTimeout(function () { window.CoachV2.refresh(); }, 0);
    }
  }

  function coachNameById(id) {
    var coach = state.teamCoaches.find(function (item) {
      return String(item.id || '') === String(id || '');
    });
    if (!coach) return '';
    return ((coach.first_name || '') + ' ' + (coach.last_name || '')).trim() || 'Coach';
  }

  function coachOptions(selectedId) {
    if (!state.teamCoaches.length) return '<option value="">No team coaches found</option>';
    return state.teamCoaches.map(function (coach) {
      var name = ((coach.first_name || '') + ' ' + (coach.last_name || '')).trim() || 'Coach';
      var selected = String(selectedId || '') === String(coach.id || '') ? ' selected' : '';
      return '<option value="' + esc(coach.id) + '"' + selected + '>' + esc(name) + (coach.is_super_user ? ' (Super user)' : '') + '</option>';
    }).join('');
  }

  function fieldValue(id) {
    var element = document.getElementById(id);
    return element ? element.value : '';
  }

  function filteredPlayers() {
    var search = String(fieldValue('searchInput') || '').trim().toLowerCase();
    var position = fieldValue('positionFilter');
    var evidence = fieldValue('evidenceFilter');

    var list = state.players.filter(function (player) {
      var text = [
        playerName(player),
        positionOf(player),
        player.age_group,
        coachNameById(player.assigned_coach_id)
      ].join(' ').toLowerCase();
      var positionMatch = !position || player.position_group === position || player.primary_position === position || player.specific_position === position;
      var evidenceMatch = !evidence || evidenceState(player).key === evidence;
      return (!search || text.indexOf(search) >= 0) && positionMatch && evidenceMatch;
    });

    list.sort(function (a, b) {
      if (state.sort === 'name') return playerName(a).localeCompare(playerName(b));
      if (state.sort === 'value') return (Number(b.transfer_value) || 0) - (Number(a.transfer_value) || 0);
      if (state.sort === 'appearances') return (Number(b.appearances) || 0) - (Number(a.appearances) || 0);
      if (state.sort === 'goals') return (Number(b.goals) || 0) - (Number(a.goals) || 0);
      if (state.sort === 'evidence') return profileCompletion(b) - profileCompletion(a);
      return overall100(b.overall_rating) - overall100(a.overall_rating);
    });

    return list;
  }

  function visiblePlayers() {
    var list = filteredPlayers();
    var start = (state.page - 1) * state.pageSize;
    return list.slice(start, start + state.pageSize);
  }

  function evidenceMarkup(player) {
    var value = profileCompletion(player);
    return '<div class="cv9-evidence-meter" aria-label="Evidence completion ' + value + ' percent">' +
      '<i><span style="width:' + value + '%"></span></i><b>' + value + '%</b></div>';
  }

  function selectCell(player) {
    if (!state.isSuperUser) {
      return '<span class="cv9-muted-text">' + esc(coachNameById(player.assigned_coach_id) || 'Coach managed') + '</span>';
    }
    return '<select class="cv9-inline-select" data-assign-player="' + esc(player.id) + '">' + coachOptions(player.assigned_coach_id) + '</select>';
  }

  function actionsMarkup(player) {
    var open = state.activeMenuId && String(state.activeMenuId) === String(player.id);
    return '<div class="cv9-row-actions">' +
      '<button class="btn btn-sm btn-outline" type="button" data-action-menu="' + esc(player.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">Actions</button>' +
      '<div class="cv9-action-menu"' + (open ? '' : ' hidden') + '>' +
        '<a href="' + esc(profileUrl(player, false)) + '">View profile</a>' +
        '<a href="' + esc(profileUrl(player, true)) + '">Edit profile</a>' +
        '<button type="button" data-video-link="' + esc(player.id) + '">Generate video link</button>' +
      '</div>' +
    '</div>';
  }

  function rowMarkup(player) {
    var name = playerName(player);
    var rating = overall100(player.overall_rating) || '--';
    var ev = evidenceState(player);
    var status = statusFor(player);

    return '<tr data-player-row="' + esc(player.id) + '">' +
      '<td><a class="cv9-player-link" href="' + esc(profileUrl(player, false)) + '">' +
        '<span class="cv9-player-initials">' + esc(initials(name)) + '</span>' +
        '<span><b>' + esc(name) + '</b><small>' + esc(player.team_name || 'Squad player') + '</small></span></a></td>' +
      '<td>' + esc(positionOf(player)) + '</td>' +
      '<td>' + esc(player.age_group || 'TBC') + '</td>' +
      '<td>' + numberText(player.appearances) + '</td>' +
      '<td>' + numberText(player.goals) + '</td>' +
      '<td>' + numberText(player.assists) + '</td>' +
      '<td><strong class="cv9-rating">' + esc(rating) + '</strong></td>' +
      '<td>' + evidenceMarkup(player) + '<span class="cv9-badge ' + ev.className + '">' + esc(ev.label) + '</span></td>' +
      '<td><strong>' + esc(fullMoney(player.transfer_value)) + '</strong></td>' +
      (state.isSuperUser ? '<td>' + selectCell(player) + '</td>' : '') +
      '<td><span class="cv9-badge ' + status.className + '">' + esc(status.label) + '</span></td>' +
      '<td>' + actionsMarkup(player) + '</td>' +
    '</tr>';
  }

  function cardMarkup(player) {
    var name = playerName(player);
    var ev = evidenceState(player);
    var status = statusFor(player);
    return '<article class="cv9-player-card" data-card-player="' + esc(player.id) + '">' +
      '<a class="cv9-player-card-main" href="' + esc(profileUrl(player, false)) + '">' +
        '<span class="cv9-player-initials">' + esc(initials(name)) + '</span>' +
        '<span><b>' + esc(name) + '</b><small>' + esc(player.age_group || 'Age group TBC') + ' - ' + esc(positionOf(player)) + '</small></span>' +
        '<strong>' + esc(overall100(player.overall_rating) || '--') + '</strong>' +
      '</a>' +
      '<div class="cv9-card-stat-grid">' +
        '<span><b>' + esc(money(player.transfer_value)) + '</b><small>Value</small></span>' +
        '<span><b>' + numberText(player.appearances) + '</b><small>Apps</small></span>' +
        '<span><b>' + numberText(player.goals) + '</b><small>Goals</small></span>' +
      '</div>' +
      evidenceMarkup(player) +
      '<div class="cv9-card-tags">' +
        '<span class="cv9-badge ' + ev.className + '">' + esc(ev.label) + '</span>' +
        '<span class="cv9-badge ' + status.className + '">' + esc(status.label) + '</span>' +
      '</div>' +
      '<div class="cv9-card-actions">' +
        '<a class="btn btn-outline" href="' + esc(profileUrl(player, true)) + '">Edit profile</a>' +
        '<button class="btn btn-primary" type="button" data-video-link="' + esc(player.id) + '">Video link</button>' +
      '</div>' +
    '</article>';
  }

  function paginationMarkup(total) {
    var pages = Math.max(1, Math.ceil(total / state.pageSize));
    if (pages <= 1) return '';
    return '<nav class="cv9-pagination" aria-label="Player pages">' +
      '<button type="button" data-page-move="-1"' + (state.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
      '<span>Page ' + state.page + ' of ' + pages + '</span>' +
      '<button type="button" data-page-move="1"' + (state.page >= pages ? ' disabled' : '') + '>Next</button>' +
    '</nav>';
  }

  function tableMarkup(players, total) {
    return '<div class="cv9-table-scroll" tabindex="0">' +
      '<table class="cv9-player-table">' +
        '<thead><tr>' +
          '<th>Player</th><th>Position</th><th>Age group</th><th>Apps</th><th>Goals</th><th>Assists</th>' +
          '<th>Overall</th><th>Evidence</th><th>Value</th>' +
          (state.isSuperUser ? '<th>Assigned coach</th>' : '') +
          '<th>Status</th><th>Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + players.map(rowMarkup).join('') + '</tbody>' +
      '</table>' +
      '</div>' +
      '<section class="cv9-mobile-player-list">' + players.map(cardMarkup).join('') + '</section>' +
      paginationMarkup(total);
  }

  function emptyMarkup(hasPlayers) {
    if (hasPlayers) {
      return '<div class="cv9-empty-state">' +
        '<h3>No players match these filters.</h3>' +
        '<p>Clear the filters to return to your full squad list.</p>' +
        '<button class="btn btn-outline" type="button" id="clearPlayerFilters">Clear filters</button>' +
      '</div>';
    }
    return '<div class="cv9-empty-state">' +
      '<h3>No players in your squad yet.</h3>' +
      '<p>Add one player now, or use desktop bulk import when you need to review multiple rows properly.</p>' +
      '<div class="cv9-empty-actions">' +
        '<a class="btn btn-primary" href="/coach/add-player">Add first player</a>' +
        '<a class="btn btn-outline" href="/coach/bulk-add-players">Bulk import</a>' +
      '</div>' +
    '</div>';
  }

  function renderStats() {
    var players = state.players;
    var total = players.length;
    var rated = players.filter(function (player) { return overall100(player.overall_rating) > 0; });
    var average = rated.length ? Math.round(rated.reduce(function (sum, player) {
      return sum + overall100(player.overall_rating);
    }, 0) / rated.length) : 0;
    var averageEvidence = total ? Math.round(players.reduce(function (sum, player) {
      return sum + profileCompletion(player);
    }, 0) / total) : 0;
    var totalValue = players.reduce(function (sum, player) {
      return sum + (Number(player.transfer_value) || 0);
    }, 0);

    setText('kpiTotal', total || '--');
    setText('kpiTotalSub', total ? total + ' active profile' + (total === 1 ? '' : 's') : 'Add your first player');
    setText('kpiAverage', average || '--');
    setText('kpiAverageSub', rated.length ? rated.length + ' rated player' + (rated.length === 1 ? '' : 's') : 'Ratings not complete');
    setText('kpiEvidence', total ? averageEvidence + '%' : '--');
    setText('kpiEvidenceSub', total ? 'Average profile evidence' : 'No evidence yet');
    setText('kpiValue', money(totalValue));
    setText('kpiValueSub', totalValue ? 'Estimated squad value' : 'Value not set');
  }

  function render() {
    var host = document.getElementById('playersContainer');
    if (!host) return;
    var all = filteredPlayers();
    var pages = Math.max(1, Math.ceil(all.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    var players = visiblePlayers();

    setText('playersListTitle', all.length + ' player' + (all.length === 1 ? '' : 's') + ' shown');
    setText('playersListMeta', state.players.length + ' total players. Table on desktop, compact records on phone.');

    if (!players.length) {
      host.innerHTML = emptyMarkup(state.players.length > 0);
      var clear = document.getElementById('clearPlayerFilters');
      if (clear) clear.addEventListener('click', clearFilters);
      return;
    }

    host.innerHTML = tableMarkup(players, all.length);
  }

  function loadingMarkup() {
    return '<div class="cv9-loading-grid" aria-label="Loading players">' +
      '<div></div><div></div><div></div><div></div><div></div><div></div>' +
    '</div>';
  }

  async function loadTeamCoaches(profile) {
    if (!state.isSuperUser) return;
    try {
      var result = await window.api('GET', '/api/coaches/team-coaches');
      var list = result.data || result.coaches || [];
      var seen = {};
      state.teamCoaches = [profile].concat(list).filter(function (coach) {
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

      var playerResponse = results[0].value || {};
      var profileResponse = results[1].status === 'fulfilled' ? results[1].value || {} : {};
      var profile = profileResponse.coach || profileResponse.data || {};
      state.players = playerResponse.data || playerResponse.players || [];
      state.profile = profile;
      state.isSuperUser = playerResponse.isSuperUser !== undefined ? !!playerResponse.isSuperUser : !!profile.is_super_user;

      await loadTeamCoaches(profile);
      updateIdentity(playerResponse.teamName || profile.team_name || '');
      renderStats();
      render();

      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    } catch (error) {
      console.error('[CoachMyPlayersV3]', error);
      if (host) {
        host.innerHTML = '<div class="cv9-empty-state is-error">' +
          '<h3>Player list could not be loaded.</h3>' +
          '<p>' + esc(error && error.message ? error.message : 'Please try again.') + '</p>' +
          '<button class="btn btn-primary" type="button" id="retryPlayersBtn">Try again</button>' +
        '</div>';
      }
      var retry = document.getElementById('retryPlayersBtn');
      if (retry) retry.addEventListener('click', loadPlayers);
    }
  }

  async function assignCoach(playerId, coachId, select) {
    if (!playerId || !coachId) return;
    select.disabled = true;
    try {
      await window.api('POST', '/api/coaches/assign-player/' + encodeURIComponent(playerId), { coachId: coachId });
      state.players = state.players.map(function (player) {
        if (String(player.id) === String(playerId)) player.assigned_coach_id = coachId;
        return player;
      });
      toast('Player assignment updated.', 'success');
      render();
    } catch (error) {
      select.disabled = false;
      toast('Could not update assignment: ' + (error.message || 'Unknown error'), 'danger');
    }
  }

  function videoLinkBody(url, player) {
    return '<div class="cv9-link-result">' +
      '<p>Share this private upload link with the player or parent. It opens the secure video upload page.</p>' +
      '<input type="text" readonly value="' + esc(url) + '" data-generated-video-url>' +
      '<div class="cv9-empty-actions">' +
        '<button class="btn btn-primary" type="button" data-copy-video-url>Copy link</button>' +
        '<a class="btn btn-outline" href="' + esc(url) + '" target="_blank" rel="noopener">Open link</a>' +
      '</div>' +
      '<small>Player: ' + esc(playerName(player)) + '</small>' +
    '</div>';
  }

  async function generateVideoLink(playerId, trigger) {
    var player = state.players.find(function (item) { return String(item.id) === String(playerId); }) || {};
    try {
      var url = '';
      if (publicDemo()) {
        url = window.location.origin + '/video-upload?demo=1&playerId=' + encodeURIComponent(playerId);
      } else {
        var result = await window.api('POST', '/api/videos/upload-link', { playerId: playerId });
        url = result.uploadUrl || result.cleanUploadUrl || result.staticUploadUrl || '';
      }
      if (!url) throw new Error('No upload link was returned.');

      if (window.CoachOverlays && typeof window.CoachOverlays.openDrawer === 'function') {
        var panel = window.CoachOverlays.openDrawer({
          title: 'Video upload link',
          body: videoLinkBody(url, player),
          trigger: trigger
        });
        var copy = panel.querySelector('[data-copy-video-url]');
        var input = panel.querySelector('[data-generated-video-url]');
        if (copy && input) {
          copy.addEventListener('click', function () {
            input.select();
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(input.value).then(function () {
                toast('Upload link copied.', 'success');
              }).catch(function () {
                document.execCommand('copy');
                toast('Upload link copied.', 'success');
              });
            } else {
              document.execCommand('copy');
              toast('Upload link copied.', 'success');
            }
          });
        }
      } else {
        window.prompt('Video upload link', url);
      }
    } catch (error) {
      toast('Could not generate video link: ' + (error.message || 'Unknown error'), 'danger');
    }
  }

  function clearFilters() {
    var search = document.getElementById('searchInput');
    var position = document.getElementById('positionFilter');
    var evidence = document.getElementById('evidenceFilter');
    var sort = document.getElementById('sortSelect');
    if (search) search.value = '';
    if (position) position.value = '';
    if (evidence) evidence.value = '';
    if (sort) sort.value = 'overall';
    state.sort = 'overall';
    state.page = 1;
    render();
  }

  function exportCsv() {
    var rows = filteredPlayers();
    if (!rows.length) {
      toast('There are no players to export.', 'info');
      return;
    }
    var headers = ['Player', 'Position', 'Age group', 'Apps', 'Goals', 'Assists', 'Overall', 'Evidence', 'Value', 'Assigned coach', 'Status'];
    var lines = [headers].concat(rows.map(function (player) {
      return [
        playerName(player),
        positionOf(player),
        player.age_group || '',
        Number(player.appearances) || 0,
        Number(player.goals) || 0,
        Number(player.assists) || 0,
        overall100(player.overall_rating) || '',
        profileCompletion(player) + '%',
        fullMoney(player.transfer_value),
        coachNameById(player.assigned_coach_id) || '',
        statusFor(player).label
      ];
    })).map(function (row) {
      return row.map(function (value) {
        return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');

    var blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'scoutlink-squad.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function bindEvents() {
    ['searchInput', 'positionFilter', 'evidenceFilter'].forEach(function (id) {
      var control = document.getElementById(id);
      if (!control) return;
      control.addEventListener(id === 'searchInput' ? 'input' : 'change', function () {
        state.page = 1;
        render();
      });
    });

    var sort = document.getElementById('sortSelect');
    if (sort) {
      sort.addEventListener('change', function () {
        state.sort = sort.value || 'overall';
        state.page = 1;
        render();
      });
    }

    var exportButton = document.getElementById('coachV8ExportPlayers');
    if (exportButton) exportButton.addEventListener('click', exportCsv);

    var host = document.getElementById('playersContainer');
    if (host) {
      host.addEventListener('click', function (event) {
        var menuButton = event.target.closest('[data-action-menu]');
        if (menuButton) {
          event.preventDefault();
          var id = menuButton.getAttribute('data-action-menu');
          state.activeMenuId = String(state.activeMenuId || '') === String(id) ? null : id;
          render();
          return;
        }

        var video = event.target.closest('[data-video-link]');
        if (video) {
          event.preventDefault();
          generateVideoLink(video.getAttribute('data-video-link'), video);
          return;
        }

        var pageMove = event.target.closest('[data-page-move]');
        if (pageMove) {
          event.preventDefault();
          state.page += Number(pageMove.getAttribute('data-page-move')) || 0;
          render();
          host.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      });

      host.addEventListener('change', function (event) {
        var select = event.target.closest('[data-assign-player]');
        if (!select) return;
        assignCoach(select.getAttribute('data-assign-player'), select.value, select);
      });
    }

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-action-menu], .cv9-action-menu')) return;
      if (!state.activeMenuId) return;
      state.activeMenuId = null;
      render();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !state.activeMenuId) return;
      state.activeMenuId = null;
      render();
    });

    var logout = document.getElementById('logoutBtn');
    if (logout) {
      logout.addEventListener('click', function () {
        if (publicDemo() && typeof window.exitPublicDemo === 'function') {
          window.exitPublicDemo();
          return;
        }
        if (window.Auth) window.Auth.clear();
        window.location.href = route('/login?logout=1');
      });
    }

    var notification = document.getElementById('notifToggleBtn');
    if (notification) {
      notification.addEventListener('click', function () {
        if (typeof window.toggleNotifPanel === 'function') window.toggleNotifPanel();
        else window.location.href = route('/coach/notifications');
      });
    }
  }

  function ensureCoach() {
    if (!window.Auth || !window.Auth.isLoggedIn() || window.Auth.type !== 'Coach') {
      window.location.href = route('/login');
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
    loadPlayers();
    if (typeof window.maybeShowExperienceSwitcher === 'function') {
      window.maybeShowExperienceSwitcher();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());

'use strict';

/*
 * Shared /player/profile router V2.
 *
 * Resolves the active public demo or Stratex Admin preview before the real
 * account role, then creates the correct Coach, Scout or Player shell.
 */
(function () {
  var root = null;
  var modal = null;
  var MOBILE_MAX = 760;

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

  function storageValue(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function normaliseRole(value) {
    var role = String(value || '').trim().toLowerCase();
    if (role === 'coach') return 'Coach';
    if (role === 'scout') return 'Scout';
    if (role === 'player') return 'Player';
    if (role === 'stratex' || role === 'admin') return 'Stratex';
    return '';
  }

  function publicDemo() {
    return storageValue(sessionStorage, 'sl_public_demo') === '1';
  }

  function adminPreview() {
    return !!(
      storageValue(sessionStorage, 'sl_admin_demo_role') ||
      storageValue(sessionStorage, 'sl_preview_role') ||
      storageValue(sessionStorage, 'demoRole') ||
      storageValue(localStorage, 'sl_demo_mode') === '1'
    );
  }

  function role() {
    var candidates = [
      storageValue(sessionStorage, 'sl_public_demo_role'),
      storageValue(sessionStorage, 'sl_admin_demo_role'),
      storageValue(sessionStorage, 'sl_preview_role'),
      storageValue(sessionStorage, 'demoRole'),
      storageValue(sessionStorage, 'sl_active_experience'),
      storageValue(sessionStorage, 'selectedExperience'),
      storageValue(localStorage, 'sl_demo_role'),
      storageValue(localStorage, 'sl_active_experience'),
      storageValue(localStorage, 'selectedExperience'),
      window.Auth && window.Auth.type,
      storageValue(localStorage, 'sl_type')
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      var resolved = normaliseRole(candidates[index]);
      if (resolved && resolved !== 'Stratex') return resolved;
    }
    return normaliseRole(window.Auth && window.Auth.type) || 'Coach';
  }

  function profileId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id') || '';
    var currentRole = role();
    var user = (window.Auth && window.Auth.user) || {};

    if (!id && currentRole === 'Player') {
      id = user.playerId || user.player_id || user.linkedPlayerId ||
        user.linked_player_id || user.id || '';
    }

    if (!id && (publicDemo() || adminPreview()) && typeof window.getDemoState === 'function') {
      try {
        var demoState = window.getDemoState();
        id = demoState.selectedPlayerId ||
          ((demoState.players || [])[0] && demoState.players[0].id) || '';
      } catch (_) {}
    }

    return String(id || '');
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function'
      ? window.cleanRouteFor(href)
      : href;
  }

  function showError(title, message, href, label) {
    root.className = '';
    root.innerHTML = '<section class="profile-route-error"><h2>' + esc(title) +
      '</h2><p>' + esc(message) + '</p>' +
      (href ? '<p style="margin-top:14px"><a href="' + esc(href) +
        '" style="font-weight:900;color:#08775e">' + esc(label || 'Continue') +
        '</a></p>' : '') + '</section>';
  }

  function installMode() {
    if (!document.body) return;
    var mobile = window.innerWidth <= MOBILE_MAX;
    document.body.classList.toggle('mobile-site', mobile);
    document.body.classList.toggle('desktop-site', !mobile);
  }

  function currentUserName() {
    var user = (window.Auth && window.Auth.user) || {};
    var name = ((user.firstName || user.first_name || '') + ' ' +
      (user.lastName || user.last_name || '')).trim();
    if (name) return name;
    return publicDemo() || adminPreview() ? 'Marcus Reed' : 'Coach';
  }

  function firstName() {
    return currentUserName().split(/\s+/)[0] || 'Coach';
  }

  function initials(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'C').charAt(0) +
      (parts[1] || parts[0] || 'O').charAt(0)).toUpperCase();
  }

  function teamName() {
    var user = (window.Auth && window.Auth.user) || {};
    return storageValue(localStorage, 'sl_team_name') ||
      storageValue(sessionStorage, 'demoTeamName') ||
      storageValue(localStorage, 'demoTeamName') ||
      user.teamName || user.team_name ||
      (publicDemo() || adminPreview() ? 'Northgate United' : 'Your team');
  }

  function coachNav() {
    var groups = [
      ['Overview', [['Dashboard', '/coach/dashboard', 'DB']]],
      ['Players', [
        ['My players', '/coach/my-players', 'PL'],
        ['Add player', '/coach/add-player', 'AP'],
        ['Bulk import', '/coach/bulk-add-players', 'BI']
      ]],
      ['Matchday', [
        ['Match Facts', '/coach/match-facts', 'MF'],
        ['Fixtures', '/coach/fixtures', 'FX'],
        ['Video reels', '/coach/video-reels', 'VR']
      ]],
      ['Communication', [
        ['Chat', '/coach/chat', 'CH'],
        ['Notifications', '/coach/notifications', 'NT'],
        ['Report a concern', '/coach/report-a-concern', 'RC']
      ]],
      ['Account', [['Settings', '/coach/settings', 'ST']]]
    ];

    return groups.map(function (group) {
      return '<section class="nav-group"><small>' + esc(group[0]) + '</small>' +
        group[1].map(function (item) {
          return '<a class="nav-link' + (item[0] === 'My players' ? ' active' : '') +
            '" href="' + esc(route(item[1])) + '"><span>' + esc(item[2]) +
            '</span><b>' + esc(item[0]) + '</b></a>';
        }).join('') + '</section>';
    }).join('');
  }

  function coachShell() {
    var name = currentUserName();
    document.body.className = 'coach-player-profile-v8';
    installMode();
    root.className = '';
    root.innerHTML =
      '<div class="coach-page profile-page">' +
        '<header class="mobile-topbar"><a href="' + esc(route('/coach/dashboard')) +
          '"><span class="sl-logo">Scout<span>Link</span></span></a>' +
          '<strong>Player profile</strong><button id="coachProfileMenuButton" type="button">Menu</button></header>' +
        '<div class="coach-shell dashboard">' +
          '<aside class="coach-sidebar sidebar" id="sidebar">' +
            '<a class="sidebar-logo" href="' + esc(route('/coach/dashboard')) +
              '"><span class="sl-logo">Scout<span>Link</span></span></a>' +
            '<nav class="sidebar-nav" id="sidebarNav">' + coachNav() + '</nav>' +
            '<div class="sidebar-user" id="sidebarUser"><span class="avatar-square">' +
              esc(initials(name)) + '</span><div><b>' + esc(name) +
              '</b><small>Coach · ' + esc(teamName()) + '</small></div></div>' +
          '</aside>' +
          '<section class="coach-workspace dashboard-main">' +
            '<header class="coach-topbar topbar">' +
              '<div class="coach-v8-topbar-copy"><span class="route-label">Coach workspace</span>' +
                '<h1 class="topbar-title">Player profile</h1></div>' +
              '<div class="top-actions topbar-right">' +
                '<button aria-label="Notifications" class="icon-button notif-btn" type="button" ' +
                  'onclick="window.location.href=\'' + esc(route('/coach/notifications')) + '\'">NT' +
                  '<span class="notif-badge" id="notifBadge" style="display:none"></span></button>' +
                '<span class="team-pill">' + esc(teamName()) + '</span>' +
                '<button class="profile-button" type="button" onclick="window.location.href=\'' +
                  esc(route('/coach/settings')) + '\'"><span class="avatar-square small">' +
                  esc(initials(name)) + '</span><b>' + esc(firstName()) + '</b></button>' +
              '</div>' +
            '</header>' +
            '<main class="coach-content page-content">' +
              '<div id="profileContent" class="profile-route-loading"><div>' +
                '<strong>Loading player profile</strong><span>Preparing the Coach profile.</span>' +
              '</div></div>' +
            '</main>' +
          '</section>' +
        '</div>' +
        '<nav class="mobile-bottom-nav" aria-label="Coach mobile navigation">' +
          '<a href="' + esc(route('/coach/dashboard')) + '"><span>HM</span><b>Home</b></a>' +
          '<a class="active" href="' + esc(route('/coach/my-players')) + '"><span>PL</span><b>Players</b></a>' +
          '<a href="' + esc(route('/coach/match-facts')) + '"><span>MF</span><b>Match</b></a>' +
          '<a href="' + esc(route('/coach/chat')) + '"><span>CH</span><b>Chat</b></a>' +
          '<a href="' + esc(route('/coach/settings')) + '"><span>MR</span><b>More</b></a>' +
        '</nav>' +
      '</div>';

    var menu = document.getElementById('coachProfileMenuButton');
    if (menu) {
      menu.addEventListener('click', function () {
        document.body.classList.toggle('coach-v8-menu-open');
      });
    }
  }

  function scoutShell() {
    document.body.className = 'scout-profile-route';
    root.className = '';
    root.innerHTML = '<div id="scoutExperienceApp"><div class="profile-route-loading"><div>' +
      '<strong>Loading player dossier</strong><span>Preparing the Scout experience.</span>' +
      '</div></div></div>';
  }

  function playerShell() {
    document.body.className = 'player-own-profile';
    root.className = '';
    root.innerHTML = '<main class="player-own-shell"><header class="player-own-topbar">' +
      '<div class="player-own-brand">Scout<span>Link</span></div><div class="player-own-actions">' +
      '<a href="/player/dashboard">Dashboard</a><a href="/player/edit-profile">Edit profile</a>' +
      '</div></header><section id="playerOwnProfileContent" class="profile-route-loading">' +
      '<div><strong>Loading your profile</strong><span>Preparing your player record.</span></div>' +
      '</section></main>';
  }

  function unpack(response) {
    if (!response) return {};
    return response.data && typeof response.data === 'object' ? response.data : response;
  }

  function demoData(id) {
    if (typeof window.getDemoState !== 'function') return null;
    try {
      var demoState = window.getDemoState();
      var selected = (demoState.players || []).find(function (row) {
        return String(row.id) === String(id);
      });
      if (!selected) return null;
      var allMatches = demoState.matches || demoState.matchFacts || [];
      return {
        player: selected,
        matches: allMatches.filter(function (row) {
          return String(row.player_id || row.playerId || '') === String(id);
        }),
        fixtures: (demoState.fixtures || []).filter(function (row) {
          return !row.player_id || String(row.player_id) === String(id);
        }),
        videos: (demoState.videos || []).filter(function (row) {
          return String(row.player_id || row.playerId || '') === String(id);
        }),
        analysis: selected.analysis || demoState.analysis || {}
      };
    } catch (_) {
      return null;
    }
  }

  async function fetchProfile(id) {
    var response = await window.api('GET', '/api/players/' + encodeURIComponent(id));
    var body = unpack(response);
    var record = body.player || body.data || body;
    if (!record || !record.id) throw new Error('The player profile was not returned.');

    return {
      player: record,
      matches: body.recentMatches || body.matches || body.matchFacts ||
        record.recentMatches || record.matches || record.matchFacts || [],
      fixtures: body.upcomingFixtures || body.fixtures ||
        record.upcomingFixtures || record.fixtures || [],
      videos: body.videos || record.videos || [],
      analysis: body.analysis || record.analysis || {}
    };
  }

  function setProfileGlobals(data) {
    window._profilePlayer = data.player;
    window._profileMatches = Array.isArray(data.matches) ? data.matches : [];
    window._profileFixtures = Array.isArray(data.fixtures) ? data.fixtures : [];
    window._profileVideos = Array.isArray(data.videos) ? data.videos : [];
    window._profileAnalysis = data.analysis || {};
  }

  function openModal(title, html) {
    if (!modal) return;
    var titleNode = document.getElementById('profileSimpleModalTitle');
    var bodyNode = document.getElementById('profileSimpleModalBody');
    if (titleNode) titleNode.textContent = title || 'Details';
    if (bodyNode) bodyNode.innerHTML = html || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function installHelpers() {
    window.openMatchDetail = function (index) {
      var match = (window._profileMatches || [])[index];
      if (!match) return;
      openModal('Match detail',
        '<p><b>Opponent:</b> ' + esc(match.opponent_name || match.opponent || 'Not recorded') + '</p>' +
        '<p><b>Date:</b> ' + esc(match.match_date || match.date || 'Not recorded') + '</p>' +
        '<p><b>Score:</b> ' + esc(match.home_score == null || match.away_score == null
          ? 'Not recorded' : match.home_score + '–' + match.away_score) + '</p>' +
        '<p><b>Coach notes:</b> ' + esc(match.coach_notes || match.notes || 'No notes recorded') + '</p>');
    };

    window.openFixtureDetail = function (index) {
      var fixture = (window._profileFixtures || [])[index];
      if (!fixture) return;
      openModal('Fixture detail',
        '<p><b>Opponent:</b> ' + esc(fixture.opponent || fixture.opposition || 'Not recorded') + '</p>' +
        '<p><b>Date:</b> ' + esc(fixture.fixture_date || fixture.date || 'Not recorded') + '</p>' +
        '<p><b>Venue:</b> ' + esc(fixture.venue_name || fixture.venue ||
          fixture.venue_address || 'Not recorded') + '</p>');
    };

    window.openProfileVideo = function (index) {
      var video = (window._profileVideos || [])[index];
      if (!video) return;
      var url = video.video_url || video.url || video.playback_url || video.storage_url || '';
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        openModal('Video reel', '<p>This record does not currently contain a playable video URL.</p>');
      }
    };

    document.querySelectorAll('[data-close-simple-modal]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
      });
    }
  }

  async function loadCoach(id) {
    coachShell();
    try {
      var data = null;
      if (publicDemo() || adminPreview()) data = demoData(id);
      if (!data) data = await fetchProfile(id);
      setProfileGlobals(data);
      window.__SCOUTLINK_PROFILE_CONTEXT__ = {
        role: 'Coach',
        demo: publicDemo() || adminPreview(),
        playerId: id
      };
      document.title = playerNameForTitle(data.player) + ' | ScoutLink';
      document.dispatchEvent(new CustomEvent('scoutlink:profile-ready', {
        detail: { role: 'Coach', playerId: id, demo: publicDemo() || adminPreview() }
      }));
    } catch (error) {
      var host = document.getElementById('profileContent');
      if (host) host.innerHTML = '<section class="profile-route-error"><h2>Player profile unavailable</h2><p>' +
        esc(error && error.message ? error.message : 'The player profile could not be loaded.') +
        '</p></section>';
    }
  }

  function playerNameForTitle(record) {
    return (((record && record.first_name) || '') + ' ' +
      ((record && record.last_name) || '')).trim() || 'Player profile';
  }

  async function loadScout(id) {
    scoutShell();
    try {
      var data = null;
      if (publicDemo() || adminPreview()) data = demoData(id);
      if (!data) data = await fetchProfile(id);
      setProfileGlobals(data);
      window.__SCOUTLINK_PROFILE_CONTEXT__ = {
        role: 'Scout',
        demo: publicDemo() || adminPreview(),
        playerId: id
      };
      document.dispatchEvent(new CustomEvent('scoutlink:profile-ready', {
        detail: { role: 'Scout', playerId: id, demo: publicDemo() || adminPreview() }
      }));
    } catch (error) {
      showError('Player dossier unavailable',
        error && error.message ? error.message : 'The player could not be loaded.',
        '/scout/player-search', 'Back to player search');
    }
  }

  function ownProfileMarkup(record) {
    var name = playerNameForTitle(record);
    var attributes = ['pace', 'agility', 'strength', 'stamina', 'shooting',
      'passing', 'dribbling', 'defending', 'composure', 'vision'];
    return '<article style="border:1px solid #dce5ee;background:#fff;overflow:hidden">' +
      '<header style="padding:24px;background:#071d2d;color:#fff"><small>Player profile</small>' +
      '<h1 style="margin:7px 0 0">' + esc(name) + '</h1><p style="margin:7px 0 0;color:#cbd9d4">' +
      esc(record.age_group || '') + ' · ' +
      esc(record.specific_position || record.primary_position || record.position_group || '') +
      '</p></header><section style="padding:20px"><h2 style="margin:0 0 14px">Your attributes</h2>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">' +
      attributes.map(function (key) {
        var raw = Number(record[key]);
        var value = Number.isFinite(raw) ? (raw > 10 ? raw / 10 : raw) : 0;
        return '<div style="padding:13px;border:1px solid #dce5ee"><b>' +
          esc(key.replace(/_/g, ' ')) + '</b><span style="display:block;margin-top:5px;color:#08745b;font-weight:900">' +
          esc(value.toFixed(1)) + '/10</span></div>';
      }).join('') + '</div></section></article>';
  }

  async function loadPlayer(id) {
    playerShell();
    try {
      var data = await fetchProfile(id);
      setProfileGlobals(data);
      var host = document.getElementById('playerOwnProfileContent');
      if (host) host.innerHTML = ownProfileMarkup(data.player);
    } catch (error) {
      showError('Your profile is unavailable',
        error && error.message ? error.message : 'The player profile could not be loaded.',
        '/player/dashboard', 'Back to dashboard');
    }
  }

  function waitForApi(callback, attempts) {
    if (typeof window.api === 'function') {
      callback();
      return;
    }
    if (attempts <= 0) {
      showError('ScoutLink could not start',
        'The profile service did not become available. Refresh the page and try again.');
      return;
    }
    setTimeout(function () { waitForApi(callback, attempts - 1); }, 100);
  }

  function start() {
    root = document.getElementById('profileRouteRoot');
    modal = document.getElementById('profileSimpleModal');
    if (!root) return;
    installMode();
    window.addEventListener('resize', installMode);
    installHelpers();

    var currentRole = role();
    var id = profileId();

    if (!id) {
      var back = currentRole === 'Scout' ? '/scout/player-search'
        : currentRole === 'Player' ? '/player/dashboard'
          : '/coach/my-players';
      showError('No player selected',
        'Return to the relevant player list and choose the profile you want to open.',
        back, 'Go back');
      return;
    }

    waitForApi(function () {
      if (currentRole === 'Scout') {
        loadScout(id);
      } else if (currentRole === 'Player') {
        loadPlayer(id);
      } else {
        loadCoach(id);
      }
    }, 60);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());

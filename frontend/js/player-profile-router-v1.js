'use strict';

/*
 * Role-aware /player/profile router.
 *
 * One shell is used by the backend bundle, frontend bundle and clean static
 * route. Coach public demo, real Coach, Scout and Player accounts therefore
 * resolve the same profile implementation on desktop and mobile.
 */
(function () {
  var root = document.getElementById('profileRouteRoot');
  var simpleModal = document.getElementById('profileSimpleModal');

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

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) {
      return false;
    }
  }

  function role() {
    try {
      if (isPublicDemo()) {
        return String(sessionStorage.getItem('sl_public_demo_role') || '');
      }

      if (window.Auth && window.Auth.type) {
        return String(window.Auth.type);
      }

      return String(localStorage.getItem('sl_type') || '');
    } catch (_) {
      return '';
    }
  }

  function allowedSession() {
    if (isPublicDemo()) {
      return ['Coach', 'Scout'].indexOf(role()) >= 0;
    }

    try {
      return !!(
        window.Auth &&
        window.Auth.isLoggedIn &&
        window.Auth.isLoggedIn()
      );
    } catch (_) {
      return false;
    }
  }

  function profileId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id') || '';
    var user = (window.Auth && window.Auth.user) || {};

    if (!id && role() === 'Player') {
      id =
        user.playerId ||
        user.player_id ||
        user.linkedPlayerId ||
        user.linked_player_id ||
        user.id ||
        '';
    }

    if (!id && role() === 'Player') {
      try {
        var stored = JSON.parse(localStorage.getItem('sl_user') || '{}');
        id =
          stored.playerId ||
          stored.player_id ||
          stored.linkedPlayerId ||
          stored.linked_player_id ||
          stored.id ||
          '';
      } catch (_) {}
    }

    return String(id || '');
  }

  function cleanRoute(href) {
    return typeof window.cleanRouteFor === 'function'
      ? window.cleanRouteFor(href)
      : href;
  }

  function showError(title, message, href, label) {
    root.className = '';
    root.innerHTML =
      '<section class="profile-route-error">' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(message) + '</p>' +
        (href
          ? '<p style="margin-top:14px"><a href="' + esc(href) +
            '" style="font-weight:900;color:#08775e">' +
            esc(label || 'Continue') + '</a></p>'
          : '') +
      '</section>';
  }

  function openSimpleModal(title, html) {
    if (!simpleModal) return;
    var titleNode = document.getElementById('profileSimpleModalTitle');
    var bodyNode = document.getElementById('profileSimpleModalBody');
    if (titleNode) titleNode.textContent = title || 'Details';
    if (bodyNode) bodyNode.innerHTML = html || '';
    simpleModal.classList.add('open');
    simpleModal.setAttribute('aria-hidden', 'false');
  }

  function closeSimpleModal() {
    if (!simpleModal) return;
    simpleModal.classList.remove('open');
    simpleModal.setAttribute('aria-hidden', 'true');
    var bodyNode = document.getElementById('profileSimpleModalBody');
    if (bodyNode) bodyNode.innerHTML = '';
  }

  function installModalEvents() {
    document.querySelectorAll('[data-close-simple-modal]').forEach(function (button) {
      button.addEventListener('click', closeSimpleModal);
    });

    if (simpleModal) {
      simpleModal.addEventListener('click', function (event) {
        if (event.target === simpleModal) closeSimpleModal();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSimpleModal();
    });
  }

  window.attrLabel = window.attrLabel || function (key) {
    var labels = {
      pace: 'Pace',
      agility: 'Agility',
      strength: 'Strength',
      stamina: 'Stamina',
      shooting: 'Shooting',
      passing: 'Passing',
      dribbling: 'Dribbling',
      defending: 'Defending',
      composure: 'Composure',
      crossing: 'Crossing',
      vision: 'Vision',
      positioning: 'Positioning',
      heading: 'Heading',
      tackling: 'Tackling',
      jumping: 'Jumping',
      gk_diving: 'Diving',
      gk_reflexes: 'Reflexes',
      gk_handling: 'Handling',
      gk_positioning: 'GK Positioning',
      gk_kicking: 'Kicking',
      gk_distribution: 'Distribution',
      gk_communication: 'Communication',
      gk_sweeping: 'Sweeping'
    };

    return labels[key] ||
      String(key || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (character) {
          return character.toUpperCase();
        });
  };

  window.cmRangeToFeet = window.cmRangeToFeet || function (range) {
    var values = String(range || '').match(/\d+/g) || [];
    if (values.length < 2) return 'Not recorded';

    function convert(cm) {
      var inches = Number(cm) / 2.54;
      var feet = Math.floor(inches / 12);
      var remaining = Math.round(inches - feet * 12);
      if (remaining === 12) {
        feet += 1;
        remaining = 0;
      }
      return feet + "'" + remaining + '"';
    }

    return convert(values[0]) + ' - ' + convert(values[1]);
  };

  window.logout = window.logout || function () {
    if (isPublicDemo() && typeof window.exitPublicDemo === 'function') {
      window.exitPublicDemo();
      return;
    }

    if (typeof window.logoutToLogin === 'function') {
      window.logoutToLogin();
      return;
    }

    try {
      if (window.Auth && window.Auth.clear) window.Auth.clear();
    } catch (_) {}

    window.location.href = '/login';
  };

  window.toggleNotifPanel = window.toggleNotifPanel || function () {
    var panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('open');
  };

  window.openMatchDetail = window.openMatchDetail || function (index) {
    var match = (window._profileMatches || [])[index];
    if (!match) return;

    openSimpleModal(
      'Match detail',
      '<p><b>Opponent:</b> ' +
        esc(match.opponent_name || match.opponent || 'Opponent not recorded') +
      '</p><p><b>Date:</b> ' +
        esc(match.match_date || match.date || 'Not recorded') +
      '</p><p><b>Score:</b> ' +
        esc(
          match.home_score == null || match.away_score == null
            ? 'Not recorded'
            : match.home_score + ' - ' + match.away_score
        ) +
      '</p><p><b>Coach notes:</b> ' +
        esc(match.coach_notes || match.notes || 'No notes recorded') +
      '</p>'
    );
  };

  window.openFixtureDetail = window.openFixtureDetail || function (index) {
    var fixture = (window._profileFixtures || [])[index];
    if (!fixture) return;

    openSimpleModal(
      'Fixture detail',
      '<p><b>Opponent:</b> ' +
        esc(fixture.opponent || fixture.opposition || 'Opponent not recorded') +
      '</p><p><b>Date:</b> ' +
        esc(fixture.fixture_date || fixture.date || 'Not recorded') +
      '</p><p><b>Venue:</b> ' +
        esc(
          fixture.venue_name ||
          fixture.venue ||
          fixture.venue_address ||
          'Not recorded'
        ) +
      '</p>'
    );
  };

  window.openProfileVideo = window.openProfileVideo || function (index) {
    var video = (window._profileVideos || [])[index];
    if (!video) return;

    var url = video.video_url || video.url || '';
    if (url) {
      window.open(url, '_blank', 'noopener');
      return;
    }

    openSimpleModal(
      'Video reel',
      '<p>This video does not currently have a playable URL.</p>'
    );
  };

  window.generateVideoUploadLink =
    window.generateVideoUploadLink ||
    async function (playerId) {
      var button = document.getElementById('btnGenerateVideoUploadLink');
      var output = document.getElementById('videoUploadLinkResult');
      if (!button || !output) return;

      var original = button.textContent;
      button.disabled = true;
      button.textContent = 'Generating…';

      try {
        var response = await window.api(
          'POST',
          '/api/videos/upload-link',
          { playerId: playerId }
        );
        var payload = response && response.data ? response.data : response;
        var url = payload.uploadUrl || payload.url || '';
        if (!url) throw new Error('The upload link was not returned.');

        output.style.display = 'block';
        output.innerHTML =
          '<label style="display:block;margin-bottom:6px;font-size:10px;' +
          'font-weight:900;color:#637487">Private upload link</label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<input id="generatedVideoUploadUrl" value="' + esc(url) +
            '" readonly style="flex:1;min-width:220px;padding:10px;' +
            'border:1px solid #dce5ee;border-radius:9px">' +
            '<button class="cp3-btn is-primary" type="button" ' +
            'data-copy-generated-upload>Copy link</button>' +
          '</div>';

        var copy = output.querySelector('[data-copy-generated-upload]');
        if (copy) {
          copy.addEventListener('click', async function () {
            try {
              await navigator.clipboard.writeText(url);
            } catch (_) {
              var input = document.getElementById('generatedVideoUploadUrl');
              if (input) {
                input.select();
                document.execCommand('copy');
              }
            }
            copy.textContent = 'Copied';
          });
        }
      } catch (error) {
        output.style.display = 'block';
        output.innerHTML =
          '<div style="color:#d94a5b;font-weight:800">' +
          esc(
            error && error.message
              ? error.message
              : 'The upload link could not be generated.'
          ) +
          '</div>';
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    };

  function coachShell() {
    document.body.className = 'coach-v2 coach-page-profile';
    document.body.setAttribute('data-profile-experience', 'Coach');
    root.className = '';

    root.innerHTML =
      '<div class="dashboard">' +
        '<nav class="sidebar" id="sidebar">' +
          '<div class="sidebar-logo">' +
            '<a href="/coach/dashboard" style="font-size:20px;font-weight:900">' +
              'Scout<span style="color:#1d9e75">Link</span>' +
            '</a>' +
          '</div>' +
          '<div class="sidebar-nav" id="sidebarNav"></div>' +
          '<div class="sidebar-user" id="sidebarUser"></div>' +
        '</nav>' +
        '<div class="dashboard-main">' +
          '<div class="topbar">' +
            '<span class="topbar-title">Player profile</span>' +
            '<div class="topbar-right">' +
              '<a href="/coach/my-players" ' +
                'class="btn btn-sm btn-outline action-btn">← Back</a>' +
              '<button class="btn btn-sm btn-ghost desktop-signout" ' +
                'type="button" onclick="logout()">' +
                (isPublicDemo() ? 'Exit demo' : 'Sign out') +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="coach-v2-mobile-title">Player profile</div>' +
          '<main class="page-content" id="profileContent">' +
            '<div class="profile-route-loading">' +
              '<div><strong>Loading player profile</strong>' +
              '<span>Preparing the redesigned Coach view.</span></div>' +
            '</div>' +
          '</main>' +
        '</div>' +
      '</div>' +
      '<nav class="coach-v2-bottom-nav" ' +
        'aria-label="Coach mobile navigation"></nav>';

    try {
      if (typeof window.buildScoutNav === 'function') {
        window.buildScoutNav('sidebarNav', 'Coach');
      }

      var user = (window.Auth && window.Auth.user) || {};
      if (isPublicDemo()) {
        user = {
          firstName: 'Marcus',
          lastName: 'Reed'
        };
      }

      var name =
        ((user.firstName || user.first_name || '') + ' ' +
        (user.lastName || user.last_name || '')).trim() ||
        'Coach';

      var initials = name
        .split(/\s+/)
        .map(function (part) {
          return part.charAt(0);
        })
        .slice(0, 2)
        .join('')
        .toUpperCase();

      var userBox = document.getElementById('sidebarUser');
      if (userBox) {
        userBox.innerHTML =
          '<div class="user-info">' +
            '<div class="user-avatar" ' +
              'style="background:#1d9e75;color:#fff">' +
              esc(initials) +
            '</div>' +
            '<div><div class="user-name">' + esc(name) + '</div>' +
            '<div class="user-role">Coach</div></div>' +
          '</div>';
      }
    } catch (_) {}
  }

  async function loadCoachProfile() {
    var id = profileId();

    if (!id) {
      showError(
        'No player selected',
        'Return to My Players and choose the player profile you want to open.',
        '/coach/my-players',
        'Open My Players'
      );
      return;
    }

    try {
      var data = await window.api(
        'GET',
        '/api/players/' + encodeURIComponent(id)
      );

      if (!data || !data.player) {
        throw new Error('The player could not be found.');
      }

      window._profilePlayer = data.player;
      window._profileMatches = Array.isArray(data.recentMatches)
        ? data.recentMatches
        : [];
      window._profileFixtures = Array.isArray(data.upcomingFixtures)
        ? data.upcomingFixtures
        : [];
      window._profileVideos = Array.isArray(data.videos)
        ? data.videos
        : [];
      window._profileAnalysis = data.analysis || null;

      document.title =
        ((data.player.first_name || '') + ' ' +
        (data.player.last_name || '')).trim() +
        ' | ScoutLink';

      document.dispatchEvent(
        new CustomEvent('scoutlink:profile-ready', {
          detail: {
            playerId: id,
            role: 'Coach',
            publicDemo: isPublicDemo()
          }
        })
      );
    } catch (error) {
      var host = document.getElementById('profileContent');
      if (host) {
        host.innerHTML =
          '<section class="profile-route-error">' +
            '<h2>Player profile could not load</h2>' +
            '<p>' +
              esc(error && error.message ? error.message : 'Please try again.') +
            '</p>' +
          '</section>';
      }
    }
  }

  function scoutShell() {
    document.body.className = 'scout-experience-body';
    document.body.setAttribute('data-scout-route', 'profile');
    document.body.setAttribute('data-profile-experience', 'Scout');

    root.id = 'scoutExperienceApp';
    root.className = '';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = '';
  }

  function ownSection(title, html) {
    return (
      '<section class="profile-section" style="padding:16px">' +
        '<header class="subsection-heading"><h3>' +
          esc(title) +
        '</h3></header>' +
        html +
      '</section>'
    );
  }

  function renderPlayerOwnProfile(data) {
    var player = data.player || {};
    var matches = Array.isArray(data.recentMatches)
      ? data.recentMatches
      : [];
    var fixtures = Array.isArray(data.upcomingFixtures)
      ? data.upcomingFixtures
      : [];
    var videos = Array.isArray(data.videos)
      ? data.videos
      : [];

    var name =
      ((player.first_name || '') + ' ' + (player.last_name || '')).trim() ||
      'Player';

    var initials = name
      .split(/\s+/)
      .map(function (part) {
        return part.charAt(0);
      })
      .slice(0, 2)
      .join('')
      .toUpperCase();

    var overallNumber = Number(player.overall_rating);
    var overall = Number.isFinite(overallNumber)
      ? Math.round(overallNumber > 10 ? overallNumber : overallNumber * 10)
      : 0;

    var stats = [
      ['Appearances', Number(player.appearances) || 0],
      ['Goals', Number(player.goals) || 0],
      ['Assists', Number(player.assists) || 0],
      ['Clean sheets', Number(player.clean_sheets) || 0],
      ['Yellow cards', Number(player.yellow_cards) || 0],
      ['Red cards', Number(player.red_cards) || 0]
    ];

    document.body.className =
      'player-own-profile coach-player-profile-v3';
    document.body.setAttribute('data-profile-experience', 'Player');
    root.className = 'player-own-shell';

    root.innerHTML =
      '<header class="player-own-topbar">' +
        '<a class="player-own-brand" href="/player/dashboard">' +
          'Scout<span>Link</span>' +
        '</a>' +
        '<div class="player-own-actions">' +
          '<a href="/player/dashboard">Dashboard</a>' +
          '<a href="/player/edit-profile">Edit profile</a>' +
          '<button type="button" onclick="logout()">Sign out</button>' +
        '</div>' +
      '</header>' +
      '<article class="profile-page coach-profile-redesign">' +
        '<section class="player-hero">' +
          '<div class="player-identity">' +
            '<div class="player-avatar">' + esc(initials) + '</div>' +
            '<div class="identity-copy">' +
              '<h1>' + esc(name) + '</h1>' +
              '<p>' +
                esc([
                  player.specific_position ||
                    player.primary_position ||
                    player.position_group ||
                    'Position TBC',
                  player.age_group || 'Age group TBC',
                  player.team_name || 'Team TBC'
                ].join(' - ')) +
              '</p>' +
              '<div class="identity-tags">' +
                '<span>Overall: ' + overall + '/100</span>' +
                '<span>' + esc(player.foot || 'Foot TBC') + ' foot</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="transfer-value">' +
            '<strong>£' +
              (Number(player.transfer_value) || 0).toLocaleString('en-GB') +
            '</strong>' +
            '<span>Est. transfer value</span>' +
          '</div>' +
        '</section>' +
        '<section class="profile-section overview-section">' +
          '<div class="overview-grid">' +
            '<article class="headline-score">' +
              '<small>Overall match performance rating</small>' +
              '<div><strong>' + overall + '</strong><span>/100</span></div>' +
            '</article>' +
            '<article class="confidence-summary">' +
              '<small>Match evidence</small>' +
              '<strong>' + matches.length + '</strong>' +
              '<p>Recorded Match Facts.</p>' +
            '</article>' +
            '<article class="evidence-summary">' +
              '<small>Upcoming fixtures</small>' +
              '<strong>' + fixtures.length + '</strong>' +
              '<p>Fixtures currently connected.</p>' +
            '</article>' +
          '</div>' +
        '</section>' +
        ownSection(
          'Match statistics',
          '<div class="stat-grid">' +
            stats.map(function (stat) {
              return (
                '<div><strong>' + esc(stat[1]) + '</strong>' +
                '<span>' + esc(stat[0]) + '</span></div>'
              );
            }).join('') +
          '</div>'
        ) +
        ownSection(
          'Recent Match Facts',
          matches.length
            ? '<div class="match-list">' +
              matches.slice(0, 5).map(function (match, index) {
                return (
                  '<button class="match-row" type="button" ' +
                    'onclick="openMatchDetail(' + index + ')">' +
                    '<div class="match-main"><strong>' +
                      esc(match.opponent_name || match.opponent || 'Opponent') +
                    '</strong><small>' +
                      esc(match.match_date || match.date || 'Date not recorded') +
                    '</small></div>' +
                  '</button>'
                );
              }).join('') +
              '</div>'
            : '<div class="empty-video-state">No Match Facts recorded yet.</div>'
        ) +
        ownSection(
          'Upcoming fixtures',
          fixtures.length
            ? '<div class="match-list">' +
              fixtures.slice(0, 5).map(function (fixture, index) {
                return (
                  '<button class="fixture-row" type="button" ' +
                    'onclick="openFixtureDetail(' + index + ')">' +
                    '<strong>' +
                      esc(fixture.opponent || fixture.opposition || 'Opponent') +
                    '</strong><small>' +
                      esc(fixture.fixture_date || fixture.date || 'Date not recorded') +
                    '</small>' +
                  '</button>'
                );
              }).join('') +
              '</div>'
            : '<div class="empty-video-state">No upcoming fixtures connected yet.</div>'
        ) +
        ownSection(
          'Video reels',
          videos.length
            ? '<div class="video-grid">' +
              videos.map(function (video, index) {
                return (
                  '<article class="video-card"><div><strong>' +
                    esc(video.title || 'Video reel') +
                  '</strong><p>' +
                    esc(video.category || 'Highlight') +
                  '</p></div><button class="cp3-btn is-small" type="button" ' +
                    'onclick="openProfileVideo(' + index + ')">Watch</button>' +
                  '</article>'
                );
              }).join('') +
              '</div>'
            : '<div class="empty-video-state">No video reels uploaded yet.</div>'
        ) +
      '</article>';
  }

  async function loadPlayerOwnProfile() {
    var id = profileId();

    if (!id) {
      showError(
        'Player account is not linked',
        'ScoutLink could not find the player profile connected to this account. Please contact your coach or support.',
        '/player/dashboard',
        'Return to dashboard'
      );
      return;
    }

    try {
      var data = await window.api(
        'GET',
        '/api/players/' + encodeURIComponent(id)
      );

      if (!data || !data.player) {
        throw new Error('The player could not be found.');
      }

      window._profilePlayer = data.player;
      window._profileMatches = data.recentMatches || [];
      window._profileFixtures = data.upcomingFixtures || [];
      window._profileVideos = data.videos || [];

      renderPlayerOwnProfile(data);
    } catch (error) {
      showError(
        'Player profile could not load',
        error && error.message ? error.message : 'Please try again.',
        '/player/dashboard',
        'Return to dashboard'
      );
    }
  }

  function boot() {
    installModalEvents();

    if (!allowedSession()) {
      window.location.replace(
        '/login?next=' +
        encodeURIComponent(
          window.location.pathname + window.location.search
        )
      );
      return;
    }

    var currentRole = role();

    if (currentRole === 'Coach') {
      coachShell();
      loadCoachProfile();
      return;
    }

    if (currentRole === 'Scout') {
      scoutShell();
      return;
    }

    if (currentRole === 'Player') {
      loadPlayerOwnProfile();
      return;
    }

    showError(
      'This account cannot open a player profile',
      'Choose the Coach, Scout or Player experience before opening this page.',
      '/experience-select',
      'Choose an experience'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}());

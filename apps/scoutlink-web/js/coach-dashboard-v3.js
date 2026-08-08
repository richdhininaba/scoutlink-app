'use strict';

(function () {
  var dashboardState = {
    players: [],
    fixtures: [],
    activity: [],
    archives: [],
    profile: null,
    stats: {}
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

  function clean(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function route(path) {
    if (!path) return clean('/coach/dashboard');
    if (/^https?:\/\//.test(path)) return path;
    return clean(path.charAt(0) === '/' ? path : '/' + path);
  }

  function apiGet(path) {
    if (typeof window.api !== 'function') return Promise.reject(new Error('API client is not available.'));
    return window.api('GET', path);
  }

  function getUser() {
    return window.Auth && window.Auth.user ? window.Auth.user : {};
  }

  function firstName() {
    var user = getUser();
    return user.firstName || user.first_name || localStorage.getItem('sl_first_name') || 'Coach';
  }

  function fullName() {
    var user = getUser();
    var joined = [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ').trim();
    return joined || localStorage.getItem('sl_user_name') || firstName();
  }

  function initialsFromName(value) {
    var parts = String(value || 'Coach').trim().split(/\s+/).filter(Boolean);
    var first = (parts[0] || 'C').charAt(0);
    var second = (parts[1] || parts[0] || 'O').charAt(0);
    return (first + second).toUpperCase();
  }

  function nameOf(player) {
    return [player && (player.first_name || player.firstName), player && (player.last_name || player.lastName)]
      .filter(Boolean)
      .join(' ')
      .trim() || (player && (player.name || player.player_name)) || 'Player';
  }

  function playerId(player) {
    return player && (player.id || player.player_id || player.playerId || player.uuid);
  }

  function valueAt(object, keys) {
    if (!object) return undefined;
    for (var index = 0; index < keys.length; index += 1) {
      if (object[keys[index]] != null && object[keys[index]] !== '') return object[keys[index]];
    }
    return undefined;
  }

  function listFrom(response, keys) {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== 'object') return [];
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(response[keys[index]])) return response[keys[index]];
    }
    if (Array.isArray(response.data)) return response.data;
    return [];
  }

  function isPublicDemo() {
    return typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
  }

  function teamNameFrom(profile, playersResponse, stats, players) {
    var user = getUser();
    var fromPlayer = players.find(function (player) {
      return player && (player.team_name || player.teamName || player.club || player.club_name);
    }) || {};
    return valueAt(profile, ['team_name', 'teamName', 'club_name', 'clubName']) ||
      valueAt(playersResponse, ['teamName', 'team_name', 'clubName', 'club_name']) ||
      valueAt(stats, ['teamName', 'team_name', 'clubName', 'club_name']) ||
      valueAt(user, ['teamName', 'team_name', 'clubName', 'club_name']) ||
      valueAt(fromPlayer, ['team_name', 'teamName', 'club', 'club_name']) ||
      localStorage.getItem('sl_team_name') ||
      '';
  }

  function parseDate(value, time) {
    if (!value) return null;
    var raw = String(value);
    var datePart = raw.slice(0, 10);
    var timePart = String(time || '').trim().slice(0, 5);
    var stamp = datePart + 'T' + (timePart || '12:00') + ':00';
    var date = new Date(stamp);
    if (Number.isNaN(date.getTime())) {
      var fallback = new Date(raw);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    return date;
  }

  function fixtureTime(fixture) {
    return valueAt(fixture, ['fixture_time', 'fixtureTime', 'time', 'kickoff_time', 'kickoffTime']);
  }

  function fixtureDateValue(fixture) {
    return parseDate(valueAt(fixture, ['fixture_date', 'fixtureDate', 'date', 'kickoff_at', 'kickoffAt']), fixtureTime(fixture));
  }

  function fixtureDateLabel(fixture) {
    var date = fixtureDateValue(fixture);
    if (!date) return 'Date to be confirmed';
    var label = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    var time = fixtureTime(fixture);
    return label + (time ? ' at ' + String(time).slice(0, 5) : '');
  }

  function fixtureOpponent(fixture) {
    return valueAt(fixture, ['opponent_name', 'opponentName', 'opponent', 'team_name', 'teamName']) || 'Opponent to be confirmed';
  }

  function fixtureVenue(fixture) {
    return valueAt(fixture, ['venue_name', 'venueName', 'venue', 'city', 'location']) || '';
  }

  function fixtureId(fixture) {
    return valueAt(fixture, ['id', 'fixture_id', 'fixtureId']);
  }

  function relativeFuture(date) {
    if (!date) return '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var target = new Date(date.getTime());
    target.setHours(0, 0, 0, 0);
    var days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return 'In ' + days + ' days';
    return 'Completed';
  }

  function relativePast(value) {
    if (!value) return '';
    var stamp = new Date(value).getTime();
    if (!Number.isFinite(stamp)) return '';
    var seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
    if (seconds < 604800) {
      var days = Math.floor(seconds / 86400);
      return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    }
    return new Date(stamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function statusDateFor(item) {
    return valueAt(item, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'date']);
  }

  function normalisePlayers(response) {
    return listFrom(response, ['players', 'squad', 'data']).filter(Boolean);
  }

  function normaliseFixtures(response) {
    return listFrom(response, ['fixtures', 'upcomingFixtures', 'items', 'data'])
      .filter(Boolean)
      .sort(function (a, b) {
        var aDate = fixtureDateValue(a);
        var bDate = fixtureDateValue(b);
        return (aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER) - (bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER);
      });
  }

  function normaliseActivity(response) {
    return listFrom(response, ['notifications', 'activity', 'items', 'data']).filter(function (item) {
      var group = String(valueAt(item, ['filterGroup', 'filter_group', 'group']) || '').toLowerCase();
      var type = String(valueAt(item, ['notificationType', 'notification_type', 'type']) || '').toLowerCase();
      var title = String(valueAt(item, ['title', 'subject']) || '').toLowerCase();
      return group.indexOf('scout') !== -1 ||
        group.indexOf('recruit') !== -1 ||
        type.indexOf('scout') !== -1 ||
        type.indexOf('recruit') !== -1 ||
        title.indexOf('scout') !== -1;
    });
  }

  function responseObject(settled) {
    return settled && settled.status === 'fulfilled' ? settled.value || {} : {};
  }

  function isoDateFromNow(days) {
    var date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function preparePublicDemoDashboardState() {
    if (!isPublicDemo() || typeof window.getDemoState !== 'function' || typeof window.setDemoState !== 'function') return;
    try {
      var state = window.getDemoState() || {};
      if (!Array.isArray(state.fixtures) || !state.fixtures.length) {
        state.fixtures = [
          {
            id: 'demo-fixture-dashboard-1',
            opponent: 'Westhaven Development XI',
            fixture_date: isoDateFromNow(5),
            fixture_time: '10:30',
            home_or_away: 'Home',
            format: '11-a-side',
            venue_name: 'Northgate United Training Ground'
          },
          {
            id: 'demo-fixture-dashboard-2',
            opponent: 'Brookfield Athletic',
            fixture_date: isoDateFromNow(12),
            fixture_time: '11:00',
            home_or_away: 'Away',
            format: '11-a-side',
            venue_name: 'Brookfield Sports Park'
          }
        ];
      }
      state.coachDashboardV9Prepared = true;
      window.setDemoState(state);
    } catch (_) {}
  }

  function demoPlayers() {
    if (!isPublicDemo() || typeof window.getDemoState !== 'function') return [];
    try {
      var state = window.getDemoState() || {};
      return Array.isArray(state.players) ? state.players : [];
    } catch (_) {
      return [];
    }
  }

  function demoActivity() {
    if (!isPublicDemo() || typeof window.getDemoState !== 'function') return [];
    try {
      var state = window.getDemoState() || {};
      var pipeline = Array.isArray(state.pipeline) ? state.pipeline : [];
      var players = Array.isArray(state.players) ? state.players : [];
      return pipeline.slice(0, 3).map(function (item, index) {
        var player = item.player || players.find(function (row) {
          return String(playerId(row)) === String(item.player_id || item.playerId);
        }) || {};
        return {
          id: item.id || 'demo-scout-activity-' + index,
          title: 'Scout interest logged',
          body: nameOf(player) + ' is in the demo pipeline',
          created_at: item.created_at || new Date(Date.now() - index * 86400000).toISOString(),
          actionUrl: '/coach/chat',
          notification_type: 'scout_interest'
        };
      });
    } catch (_) {
      return [];
    }
  }

  function nowSplit() {
    var hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value == null ? '' : String(value);
  }

  function setHtml(id, html) {
    var element = document.getElementById(id);
    if (element) element.innerHTML = html;
  }

  function percentText(value) {
    return Number.isFinite(value) ? Math.round(value) + '%' : '--';
  }

  function numberValue(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalRating(value) {
    var number = numberValue(value);
    if (number == null) return null;
    return Math.round(number > 10 ? number : number * 10);
  }

  function completionForPlayer(player) {
    var explicit = numberValue(valueAt(player, [
      'profile_completion',
      'profileCompletion',
      'completion',
      'completion_percent',
      'profile_completion_percentage',
      'evidence_completion'
    ]));
    if (explicit != null) return Math.max(0, Math.min(100, Math.round(explicit > 1 ? explicit : explicit * 100)));

    var checks = [
      Boolean(nameOf(player) && nameOf(player) !== 'Player'),
      Boolean(valueAt(player, ['age_group', 'ageGroup', 'age'])),
      Boolean(valueAt(player, ['specific_position', 'primary_position', 'position_group', 'position'])),
      normalRating(valueAt(player, ['overall_rating', 'overallRating', 'overall'])) != null,
      numberValue(valueAt(player, ['transfer_value', 'estimated_value', 'estimatedValue', 'value'])) != null,
      Boolean(valueAt(player, ['height', 'height_cm', 'heightCm'])),
      Boolean(valueAt(player, ['preferred_foot', 'preferredFoot', 'foot'])),
      Boolean(valueAt(player, ['appearances', 'apps', 'match_facts_count', 'matchFactsCount'])),
      hasVideoSignal(player) && videoCount(player) > 0
    ];
    var possible = checks.length;
    var complete = checks.filter(Boolean).length;
    return Math.round((complete / possible) * 100);
  }

  function averageCompletion(players) {
    if (!players.length) return null;
    var total = players.reduce(function (sum, player) {
      return sum + completionForPlayer(player);
    }, 0);
    return Math.round(total / players.length);
  }

  function hasVideoSignal(player) {
    return ['approved_video_count', 'approvedVideoCount', 'video_count', 'videoCount', 'videos_count', 'videosCount', 'videos', 'approved_videos', 'approvedVideos']
      .some(function (key) { return player && Object.prototype.hasOwnProperty.call(player, key); });
  }

  function videoCount(player) {
    var list = valueAt(player, ['approved_videos', 'approvedVideos', 'videos']);
    if (Array.isArray(list)) return list.length;
    var count = numberValue(valueAt(player, ['approved_video_count', 'approvedVideoCount', 'video_count', 'videoCount', 'videos_count', 'videosCount']));
    return count == null ? 0 : count;
  }

  function completedFixtures(fixtures) {
    var now = Date.now();
    return fixtures.filter(function (fixture) {
      var explicit = String(valueAt(fixture, ['status', 'state']) || '').toLowerCase();
      if (explicit === 'completed' || explicit === 'played' || explicit === 'finished') return true;
      var date = fixtureDateValue(fixture);
      return date ? date.getTime() < now : false;
    });
  }

  function factsSignal(fixture) {
    var keys = ['match_facts_submitted', 'matchFactsSubmitted', 'has_match_facts', 'hasMatchFacts', 'match_facts_id', 'matchFactsId', 'facts_submitted', 'factsSubmitted'];
    var hasSignal = keys.some(function (key) {
      return Object.prototype.hasOwnProperty.call(fixture || {}, key);
    });
    if (!hasSignal) return null;
    return Boolean(valueAt(fixture, keys));
  }

  function coverageState(fixtures) {
    var completed = completedFixtures(fixtures);
    if (!completed.length) {
      return { percent: null, submitted: 0, completed: 0, message: 'No completed fixtures yet' };
    }
    var withSignals = completed.filter(function (fixture) { return factsSignal(fixture) !== null; });
    if (!withSignals.length) {
      return { percent: null, submitted: 0, completed: completed.length, message: 'Fixture data does not include Match Facts status yet' };
    }
    var submitted = withSignals.filter(function (fixture) { return factsSignal(fixture) === true; }).length;
    return {
      percent: Math.round((submitted / completed.length) * 100),
      submitted: submitted,
      completed: completed.length,
      message: submitted + ' of ' + completed.length + ' completed fixture' + (completed.length === 1 ? '' : 's') + ' logged'
    };
  }

  function currentValue(player) {
    return numberValue(valueAt(player, ['transfer_value', 'estimated_value', 'estimatedValue', 'value']));
  }

  function previousValue(player) {
    return numberValue(valueAt(player, [
      'previous_transfer_value',
      'previous_estimated_value',
      'previousEstimatedValue',
      'prior_value',
      'priorValue',
      'last_transfer_value',
      'lastTransferValue'
    ]));
  }

  function valueSignal(players) {
    var comparable = players.map(function (player) {
      return { current: currentValue(player), previous: previousValue(player) };
    }).filter(function (row) {
      return row.current != null && row.previous != null && row.previous > 0;
    });

    if (!comparable.length) return { label: 'Not enough evidence', detail: 'Needs prior comparable values' };

    var rising = comparable.filter(function (row) { return row.current > row.previous * 1.03; }).length;
    var falling = comparable.filter(function (row) { return row.current < row.previous * 0.97; }).length;
    var stable = comparable.length - rising - falling;
    if (rising && !falling) return { label: 'Rising', detail: rising + ' player signal' + (rising === 1 ? '' : 's') + ' up' };
    if (falling && !rising) return { label: 'Mixed', detail: falling + ' player signal' + (falling === 1 ? '' : 's') + ' down' };
    if (stable === comparable.length) return { label: 'Stable', detail: 'Comparable values are steady' };
    return { label: 'Mixed', detail: 'Different player signals across the squad' };
  }

  function upcomingFixtures(fixtures) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return fixtures.filter(function (fixture) {
      var date = fixtureDateValue(fixture);
      return !date || date.getTime() >= now.getTime();
    }).sort(function (a, b) {
      var aDate = fixtureDateValue(a);
      var bDate = fixtureDateValue(b);
      return (aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER) - (bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER);
    });
  }

  function renderIdentity(profile, playersResponse, stats, players) {
    var team = teamNameFrom(profile, playersResponse, stats, players);
    if (team) localStorage.setItem('sl_team_name', team);

    setText('coachTitle', 'Dashboard');
    setText('mobileDashboardTitle', 'Dashboard');
    setText('dashboardTeamMeta', team || 'Team not set');
    setText('dashboardDateMeta', new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }));

    var sideUser = document.getElementById('sidebarUser');
    if (sideUser) {
      sideUser.innerHTML =
        '<div class="user-info">' +
          '<div class="user-avatar">' + esc(initialsFromName(fullName())) + '</div>' +
          '<div><b>' + esc(fullName()) + '</b><small>Coach' + (team ? ' - ' + esc(team) : '') + '</small></div>' +
        '</div>';
    }
  }

  function renderTopBand(players, fixtures, team) {
    var greeting = document.querySelector('[data-dashboard-greeting]');
    if (!greeting) return;

    var next = upcomingFixtures(fixtures)[0] || null;
    var date = next ? fixtureDateValue(next) : null;
    var title = nowSplit() + ', ' + firstName();
    var intro = players.length
      ? 'Your squad evidence, fixtures and Scout signals are organised for the next useful action.'
      : 'Start with your first player profile, then add fixture and Match Facts evidence.';
    var fixtureHtml = '';

    if (next) {
      fixtureHtml =
        '<span class="cv9-panel-eyebrow">Next fixture - ' + esc(relativeFuture(date)) + '</span>' +
        '<strong>' + esc(fixtureOpponent(next)) + '</strong>' +
        '<p>' + esc(fixtureDateLabel(next)) + (fixtureVenue(next) ? ' - ' + esc(fixtureVenue(next)) : '') + '</p>' +
        '<div class="cv9-dash-actions">' +
          '<a class="btn btn-primary" href="' + esc(route('/coach/add-player')) + '">Add player</a>' +
          '<a class="btn btn-outline" href="' + esc(route('/coach/match-facts')) + '">Record Match Facts</a>' +
        '</div>';
    } else {
      fixtureHtml =
        '<span class="cv9-panel-eyebrow">Next fixture</span>' +
        '<strong>No upcoming fixture</strong>' +
        '<p>Add the next fixture so Match Facts and scout-visible venue context stay current.</p>' +
        '<div class="cv9-dash-actions">' +
          '<a class="btn btn-primary" href="' + esc(route('/coach/fixtures')) + '">Add fixture</a>' +
          '<a class="btn btn-outline" href="' + esc(route('/coach/add-player')) + '">Add player</a>' +
        '</div>';
    }

    greeting.innerHTML =
      '<div>' +
        '<span class="cv9-chip">Coach workspace</span>' +
        '<h1>' + esc(title) + '</h1>' +
        '<p>' + esc(intro) + '</p>' +
        '<div class="cv9-dash-meta"><span>' + esc(team || 'Team not set') + '</span><span>' +
          esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })) +
        '</span></div>' +
      '</div>' +
      '<aside class="cv9-next-fixture" id="dashboardNextFixture">' + fixtureHtml + '</aside>';
  }

  function renderKpis(players, fixtures) {
    var average = averageCompletion(players);
    var coverage = coverageState(fixtures);
    var signal = valueSignal(players);

    setText('kpiPlayers', players.length);
    setText('kpiPlayersSub', players.length ? players.length + ' accessible player profile' + (players.length === 1 ? '' : 's') : 'Add your first player');
    setText('kpiEvidence', average == null ? '--' : average + '%');
    setText('kpiEvidenceSub', average == null ? 'No player evidence yet' : 'Average profile completion');
    setText('kpiCoverage', coverage.percent == null ? '--' : coverage.percent + '%');
    setText('kpiCoverageSub', coverage.message);
    setText('kpiValueSignal', signal.label);
    setText('kpiValueSignalSub', signal.detail);
  }

  function attentionFromData(players, fixtures, activity) {
    var items = [];
    var coverageMissing = completedFixtures(fixtures).filter(function (fixture) {
      return factsSignal(fixture) === false;
    }).slice(0, 2);

    coverageMissing.forEach(function (fixture) {
      var id = fixtureId(fixture);
      items.push({
        tone: 'match',
        title: 'Match Facts missing',
        body: fixtureOpponent(fixture) + ' was completed without logged Match Facts.',
        href: route('/coach/match-facts' + (id ? '?fixtureId=' + encodeURIComponent(id) : '')),
        label: 'Record now'
      });
    });

    players.slice().sort(function (a, b) {
      return completionForPlayer(a) - completionForPlayer(b);
    }).filter(function (player) {
      return completionForPlayer(player) < 75;
    }).slice(0, 2).forEach(function (player) {
      var id = playerId(player);
      items.push({
        tone: 'profile',
        title: 'Profile needs evidence',
        body: nameOf(player) + ' is ' + completionForPlayer(player) + '% complete.',
        href: route('/player/profile' + (id ? '?id=' + encodeURIComponent(id) : '')),
        label: 'Open profile'
      });
    });

    players.filter(function (player) {
      return hasVideoSignal(player) && videoCount(player) === 0;
    }).slice(0, 1).forEach(function (player) {
      var id = playerId(player);
      items.push({
        tone: 'video',
        title: 'No approved video evidence',
        body: nameOf(player) + ' has no playable evidence clip yet.',
        href: route('/coach/video-reels' + (id ? '?playerId=' + encodeURIComponent(id) : '')),
        label: 'Open video reels'
      });
    });

    activity.filter(function (item) {
      var read = valueAt(item, ['read', 'is_read', 'isRead', 'seen']);
      var hasThread = valueAt(item, ['thread_id', 'threadId', 'conversation_id', 'conversationId']);
      return (read === false || read === 0 || read === 'false' || hasThread) && String(valueAt(item, ['notificationType', 'notification_type', 'type', 'title']) || '').toLowerCase().indexOf('scout') !== -1;
    }).slice(0, 1).forEach(function (item) {
      var thread = valueAt(item, ['thread_id', 'threadId', 'conversation_id', 'conversationId']);
      items.push({
        tone: 'chat',
        title: valueAt(item, ['title', 'subject']) || 'Scout message waiting',
        body: valueAt(item, ['body', 'message']) || 'Open the conversation and reply from Chat.',
        href: route('/coach/chat' + (thread ? '?threadId=' + encodeURIComponent(thread) : '')),
        label: 'Open chat'
      });
    });

    return items.slice(0, 4);
  }

  function renderAttention(players, fixtures, activity) {
    var host = document.getElementById('attentionQueue');
    if (!host) return;
    var items = attentionFromData(players, fixtures, activity);
    if (!items.length) {
      host.innerHTML =
        '<div class="cv9-empty">' +
          '<strong>Nothing urgent from the data available right now.</strong>' +
          '<p>New Match Facts gaps, profile evidence gaps and scout replies will appear here.</p>' +
        '</div>';
      return;
    }
    host.innerHTML = '<div class="cv9-attention-list">' + items.map(function (item) {
      return '<a class="cv9-attention-item is-' + esc(item.tone) + '" href="' + esc(item.href) + '">' +
        '<span class="cv9-attention-dot"></span>' +
        '<span><b>' + esc(item.title) + '</b><small>' + esc(item.body) + '</small></span>' +
        '<em>' + esc(item.label) + '</em>' +
      '</a>';
    }).join('') + '</div>';
  }

  function renderFixtures(fixtures) {
    var host = document.getElementById('upcomingFixtures');
    if (!host) return;
    var rows = upcomingFixtures(fixtures).slice(0, 4);
    if (!rows.length) {
      host.innerHTML =
        '<div class="cv9-empty">' +
          '<strong>No upcoming fixture.</strong>' +
          '<p>Add the next match so player evidence has real context.</p>' +
          '<a class="btn btn-primary" href="' + esc(route('/coach/fixtures')) + '">Add a fixture</a>' +
        '</div>';
      return;
    }
    host.innerHTML = '<div class="cv9-fixture-list">' + rows.map(function (fixture) {
      var homeAway = valueAt(fixture, ['home_or_away', 'homeOrAway']) || 'Home';
      return '<article class="cv9-fixture-card">' +
        '<div><b>' + esc(fixtureOpponent(fixture)) + '</b><p>' + esc(fixtureDateLabel(fixture)) +
          (fixtureVenue(fixture) ? ' - ' + esc(fixtureVenue(fixture)) : '') + '</p></div>' +
        '<span>' + esc(homeAway) + '</span>' +
      '</article>';
    }).join('') + '</div>';
  }

  function renderActivity(activity) {
    var host = document.getElementById('recentScoutActivity');
    if (!host) return;
    if (!activity.length) {
      host.innerHTML =
        '<div class="cv9-empty">' +
          '<strong>No new scout activity this week.</strong>' +
          '<p>Scout interest, messages and recruitment updates will appear here.</p>' +
        '</div>';
      return;
    }
    host.innerHTML = '<div class="cv9-activity-list">' + activity.slice(0, 5).map(function (item) {
      var title = valueAt(item, ['title', 'subject']) || 'Scout activity';
      var body = valueAt(item, ['body', 'message', 'description']) || 'ScoutLink update';
      var href = valueAt(item, ['actionUrl', 'action_url', 'url']) || '/coach/chat';
      return '<a class="cv9-activity-item" href="' + esc(route(href)) + '">' +
        '<span>SC</span><span><b>' + esc(title) + '</b><small>' + esc(body) +
        (statusDateFor(item) ? ' - ' + esc(relativePast(statusDateFor(item))) : '') +
        '</small></span></a>';
    }).join('') + '</div>';
  }

  function renderSeasonSummary(fixtures, archives) {
    var host = document.getElementById('seasonSummaryCurrent');
    if (!host) return;
    var completed = completedFixtures(fixtures);
    var coverage = coverageState(fixtures);
    host.innerHTML =
      '<div class="cv9-season-grid">' +
        '<div><span>Completed fixtures</span><strong>' + esc(completed.length) + '</strong></div>' +
        '<div><span>Match Facts logged</span><strong>' + esc(coverage.submitted) + '</strong></div>' +
        '<div><span>Archived seasons</span><strong>' + esc(archives.length) + '</strong></div>' +
      '</div>' +
      '<p class="cv9-season-note">' + esc(coverage.message) + '</p>';
  }

  function renderEvidenceByPlayer(players) {
    var host = document.getElementById('evidenceByPlayer');
    if (!host) return;
    if (!players.length) {
      host.innerHTML =
        '<div class="cv9-empty">' +
          '<strong>No players yet.</strong>' +
          '<p>Start with a profile, then add fixtures, Match Facts and approved video evidence.</p>' +
          '<div class="cv9-checklist">' +
            '<span>1. Add your first player</span>' +
            '<span>2. Add a fixture</span>' +
            '<span>3. Record Match Facts</span>' +
          '</div>' +
          '<a class="btn btn-primary" href="' + esc(route('/coach/add-player')) + '">Add your first player</a>' +
        '</div>';
      return;
    }
    host.innerHTML = '<div class="cv9-evidence-list">' + players.slice().sort(function (a, b) {
      return completionForPlayer(a) - completionForPlayer(b);
    }).slice(0, 6).map(function (player) {
      var percent = completionForPlayer(player);
      var id = playerId(player);
      return '<a class="cv9-evidence-row" href="' + esc(route('/player/profile' + (id ? '?id=' + encodeURIComponent(id) : ''))) + '">' +
        '<span><b>' + esc(nameOf(player)) + '</b><small>' + esc(valueAt(player, ['specific_position', 'primary_position', 'position_group', 'position']) || 'Position not set') + '</small></span>' +
        '<em>' + esc(percent) + '%</em>' +
        '<i><span style="width:' + esc(percent) + '%"></span></i>' +
      '</a>';
    }).join('') + '</div>';
  }

  function renderArchives(archives) {
    var card = document.getElementById('prevSeasonsCard');
    var host = document.getElementById('prevSeasonsList');
    if (!card || !host) return;
    if (!archives.length) {
      host.innerHTML = '<div class="cv9-empty"><strong>No archived seasons yet.</strong><p>Previous season summaries will appear once a season is archived.</p></div>';
      return;
    }
    host.innerHTML = '<div class="cv9-archive-list">' + archives.map(function (archive) {
      var count = archive.player_summaries ? Object.keys(archive.player_summaries).length : 0;
      return '<article class="season-archive-card">' +
        '<div><b>Season ' + esc(archive.season_label || '--') + '</b><p>' + count + ' players - archived ' + esc(relativePast(archive.archived_at)) + '</p></div>' +
        '<button type="button" class="btn btn-sm btn-outline" data-archive-id="' + esc(archive.id) + '">View summary</button>' +
      '</article>';
    }).join('') + '</div>';
  }

  function showSeasonSummary(id) {
    var archive = dashboardState.archives.find(function (row) {
      return String(row.id) === String(id);
    });
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
    if (modal) modal.setAttribute('aria-hidden', 'true');
  }

  function renderError(error) {
    var message = error && error.message ? error.message : 'The dashboard could not be loaded.';
    setHtml('attentionQueue',
      '<div class="cv9-empty is-error"><strong>Dashboard unavailable.</strong><p>' + esc(message) + '</p>' +
      '<button type="button" class="btn btn-primary" id="retryDashboardBtn">Try again</button></div>');
    setHtml('upcomingFixtures', '<div class="cv9-empty"><strong>Fixtures unavailable.</strong><p>Try again in a moment.</p></div>');
    setHtml('recentScoutActivity', '<div class="cv9-empty"><strong>Scout activity unavailable.</strong><p>Try again in a moment.</p></div>');
    var retry = document.getElementById('retryDashboardBtn');
    if (retry) retry.addEventListener('click', loadDashboard);
  }

  function renderAll(playersResponse, stats, fixtures, activity, profile, archives) {
    var players = normalisePlayers(playersResponse);
    if (isPublicDemo() && !players.length) players = demoPlayers();
    if (isPublicDemo() && !activity.length) activity = demoActivity();

    var team = teamNameFrom(profile, playersResponse, stats, players);
    dashboardState.players = players;
    dashboardState.fixtures = fixtures;
    dashboardState.activity = activity;
    dashboardState.archives = archives;
    dashboardState.profile = profile;
    dashboardState.stats = stats;

    renderIdentity(profile, playersResponse, stats, players);
    renderTopBand(players, fixtures, team);
    renderKpis(players, fixtures);
    renderAttention(players, fixtures, activity);
    renderFixtures(fixtures);
    renderActivity(activity);
    renderSeasonSummary(fixtures, archives);
    renderEvidenceByPlayer(players);
    renderArchives(archives);

    if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    if (window.CoachV2 && typeof window.CoachV2.refresh === 'function') {
      window.setTimeout(function () { window.CoachV2.refresh(); }, 0);
    }
  }

  async function loadDashboard() {
    setHtml('attentionQueue', '<div class="cv9-loading">Loading attention queue</div>');
    setHtml('upcomingFixtures', '<div class="cv9-loading">Loading fixtures</div>');
    setHtml('recentScoutActivity', '<div class="cv9-loading">Loading scout activity</div>');
    setHtml('seasonSummaryCurrent', '<div class="cv9-loading">Loading season picture</div>');
    setHtml('evidenceByPlayer', '<div class="cv9-loading">Loading player evidence</div>');
    setHtml('prevSeasonsList', '<div class="cv9-loading">Loading archives</div>');

    try {
      preparePublicDemoDashboardState();
      var results = await Promise.allSettled([
        apiGet('/api/coaches/my-players'),
        apiGet('/api/coaches/dashboard'),
        apiGet('/api/fixtures'),
        apiGet('/api/notifications?limit=20'),
        apiGet('/api/coaches/profile'),
        apiGet('/api/season/archives')
      ]);

      if (results[0].status === 'rejected' && !isPublicDemo()) throw results[0].reason;

      var playersResponse = responseObject(results[0]);
      var stats = responseObject(results[1]);
      var fixtureResponse = responseObject(results[2]);
      var activityResponse = responseObject(results[3]);
      var profileResponse = responseObject(results[4]);
      var archivesResponse = responseObject(results[5]);

      var fixtures = normaliseFixtures(fixtureResponse);
      if (isPublicDemo() && !fixtures.length && typeof window.getDemoState === 'function') {
        try {
          fixtures = normaliseFixtures({ data: (window.getDemoState() || {}).fixtures || [] });
        } catch (_) {}
      }

      var activity = normaliseActivity(activityResponse);
      var profile = profileResponse.coach || profileResponse.profile || profileResponse.data || profileResponse;
      var archives = listFrom(archivesResponse, ['archives', 'seasons', 'data']);

      renderAll(playersResponse, stats, fixtures, activity, profile, archives);
    } catch (error) {
      console.error('[CoachDashboardV9]', error);
      renderError(error);
    }
  }

  function bindInteractions() {
    var logout = document.getElementById('logoutBtn');
    if (logout && !logout.dataset.bound) {
      logout.dataset.bound = '1';
      logout.addEventListener('click', function () {
        if (isPublicDemo() && typeof window.exitPublicDemo === 'function') {
          window.exitPublicDemo();
          return;
        }
        if (window.Auth) window.Auth.clear();
        window.location.href = route('/login?logout=1');
      });
    }

    var notification = document.getElementById('notifToggleBtn');
    if (notification && !notification.dataset.bound) {
      notification.dataset.bound = '1';
      notification.addEventListener('click', function () {
        if (typeof window.toggleNotifPanel === 'function') window.toggleNotifPanel();
        else window.location.href = route('/coach/notifications');
      });
    }

    var menu = document.querySelector('.coach-v2-menu-button');
    if (menu && !menu.dataset.dashboardBound) {
      menu.dataset.dashboardBound = '1';
      menu.addEventListener('click', function () {
        document.body.classList.add('coach-v2-menu-open');
      });
    }

    document.addEventListener('click', function (event) {
      var archiveButton = event.target.closest('[data-archive-id]');
      if (archiveButton) {
        showSeasonSummary(archiveButton.getAttribute('data-archive-id'));
        return;
      }
      var closeButton = event.target.closest('[data-close-dashboard-modal]');
      if (closeButton) {
        closeModal(closeButton.getAttribute('data-close-dashboard-modal'));
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.coach-dashboard-modal[aria-hidden="false"]').forEach(function (modal) {
        modal.setAttribute('aria-hidden', 'true');
      });
    });
  }

  function ensureCoachNavigation() {
    if (isPublicDemo()) return true;
    if (!window.Auth || !window.Auth.isLoggedIn() || window.Auth.type !== 'Coach') {
      window.location.href = route('/login');
      return false;
    }
    return true;
  }

  function init() {
    if (!ensureCoachNavigation()) return;
    if (typeof window.buildScoutNav === 'function') window.buildScoutNav('sidebarNav', 'Coach');
    bindInteractions();
    loadDashboard();
    if (typeof window.maybeShowExperienceSwitcher === 'function') {
      window.maybeShowExperienceSwitcher();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

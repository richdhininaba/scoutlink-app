'use strict';

/* Shared phone navigation. Keep hrefs as existing page files; cleanRouteFor translates them. */
(function () {
  var ICONS = {
    dashboard: 'D',
    players: 'P',
    add: '+',
    bulk: '#',
    match: 'M',
    fixtures: 'F',
    video: 'V',
    chat: 'C',
    notifications: '!',
    settings: 'S',
    search: '?',
    pipeline: 'L',
    rankings: 'R',
    predictions: 'A',
    exports: 'E',
    compare: '=',
    setup: 'O',
    events: 'EV',
    users: 'U',
    org: 'OR',
    hiring: 'H'
  };

  var NAV = {
    Coach: [
      ['Dashboard', 'coach-dashboard.html', 'dashboard'],
      ['My players', 'coach-my-players.html', 'players'],
      ['Add player', 'add-player.html', 'add'],
      ['Bulk import', 'bulk-add-players.html', 'bulk'],
      ['Match facts', 'match-facts.html', 'match'],
      ['Fixtures', 'coach-fixtures.html', 'fixtures'],
      ['Video reels', 'coach-video-reels.html', 'video'],
      ['Chat', 'coach-chat.html', 'chat'],
      ['Notifications', 'coach-notifications.html', 'notifications'],
      ['Settings', 'coach-settings.html', 'settings']
    ],
    Scout: [
      ['Dashboard', 'scout-dashboard.html', 'dashboard'],
      ['Player database', 'player-search.html', 'search'],
      ['My pipeline', 'scout-pipeline.html', 'pipeline'],
      ['Rankings', 'scout-rankings.html', 'rankings'],
      ['Fixtures', 'scout-fixtures.html', 'fixtures'],
      ['Predictions', 'scout-predictions.html', 'predictions'],
      ['Exports', 'scout-exports.html', 'exports'],
      ['Compare players', 'compare-players.html', 'compare'],
      ['Scout setup', 'scout-setup.html', 'setup'],
      ['Events', 'scout-events.html', 'events'],
      ['Chat', 'scout-chat.html', 'chat'],
      ['Notifications', 'scout-notifications.html', 'notifications'],
      ['Settings', 'scout-settings.html', 'settings']
    ],
    Player: [
      ['Dashboard', 'player-dashboard.html', 'dashboard'],
      ['My profile', 'player-profile-edit.html', 'players'],
      ['Video reels', 'player-video-reels.html', 'video'],
      ['Notifications', 'player-notifications.html', 'notifications'],
      ['Settings', 'player-settings.html', 'settings']
    ],
    Stratex: [
      ['Dashboard', 'stratex-dashboard.html', 'dashboard'],
      ['Product demo', 'experience-select.html', 'events'],
      ['Registrations', 'stratex-registrations.html', 'match'],
      ['Users', 'stratex-users.html', 'users'],
      ['Org view', 'stratex-org.html', 'org'],
      ['Hiring', 'stratex-hiring.html', 'hiring'],
      ['Leave / Sick Leave', 'stratex-leave.html', 'fixtures'],
      ['Meetings', 'stratex-meetings.html', 'chat'],
      ['Contracts & Pay', 'stratex-contracts-pay.html', 'exports'],
      ['Players', 'stratex-players.html', 'players'],
      ['Scouts', 'stratex-scouts.html', 'search'],
      ['Coaches', 'stratex-coaches.html', 'setup'],
      ['Scout teams', 'stratex-scout-teams.html', 'rankings'],
      ['Non Pro academies', 'stratex-school-teams.html', 'dashboard'],
      ['Award nominations', 'stratex-award-nominations.html', 'rankings'],
      ['Showcase events', 'stratex-showcase-events.html', 'events'],
      ['Notifications', 'stratex-notifications.html', 'notifications'],
      ['Settings', 'stratex-settings.html', 'settings']
    ]
  };

  function roleFromPath() {
    var p = window.location.pathname;
    if (p.indexOf('/coach/') === 0 || /coach-|add-player|bulk-add|match-facts/.test(p)) return 'Coach';
    if (p.indexOf('/scout/') === 0 || /scout-|player-search|compare-players/.test(p)) return 'Scout';
    if (p.indexOf('/player/') === 0 || /player-/.test(p)) return 'Player';
    if (p.indexOf('/stratex/') === 0 || /stratex-/.test(p)) return 'Stratex';
    return '';
  }

  function normalizeRole(value) {
    value = String(value || '');
    if (/stratex/i.test(value)) return 'Stratex';
    if (/coach/i.test(value)) return 'Coach';
    if (/scout/i.test(value)) return 'Scout';
    if (/player/i.test(value)) return 'Player';
    return value;
  }

  function currentRole() {
    if (window.Auth && Auth.type) return normalizeRole(Auth.type);
    return normalizeRole(localStorage.getItem('sl_type') || roleFromPath());
  }

  function routeFor(href) {
    if (typeof cleanRouteFor === 'function') return cleanRouteFor(href);
    if (/^https?:|^\//.test(href)) return href;
    var map = {
      'coach-dashboard.html': '/coach/dashboard',
      'coach-my-players.html': '/coach/my-players',
      'add-player.html': '/coach/add-player',
      'bulk-add-players.html': '/coach/bulk-add-players',
      'match-facts.html': '/coach/match-facts',
      'coach-fixtures.html': '/coach/fixtures',
      'coach-video-reels.html': '/coach/video-reels',
      'coach-chat.html': '/coach/chat',
      'coach-notifications.html': '/coach/notifications',
      'coach-settings.html': '/coach/settings',
      'scout-dashboard.html': '/scout/dashboard',
      'player-search.html': '/scout/player-search',
      'scout-pipeline.html': '/scout/pipeline',
      'scout-rankings.html': '/scout/rankings',
      'scout-fixtures.html': '/scout/fixtures',
      'scout-predictions.html': '/scout/predictions',
      'scout-exports.html': '/scout/exports',
      'compare-players.html': '/scout/compare-players',
      'scout-setup.html': '/scout/setup',
      'scout-events.html': '/scout/events',
      'scout-chat.html': '/scout/chat',
      'scout-notifications.html': '/scout/notifications',
      'scout-settings.html': '/scout/settings',
      'player-dashboard.html': '/player/dashboard',
      'player-profile-edit.html': '/player/edit-profile',
      'player-profile.html': '/player/profile',
      'player-video-reels.html': '/player/video-reels',
      'player-notifications.html': '/player/notifications',
      'player-settings.html': '/player/settings',
      'stratex-dashboard.html': '/stratex/dashboard',
      'experience-select.html': '/experience-select',
      'stratex-registrations.html': '/stratex/registrations',
      'stratex-users.html': '/stratex/users',
      'stratex-org.html': '/stratex/org',
      'stratex-hiring.html': '/stratex/hiring',
      'stratex-leave.html': '/stratex/leave',
      'stratex-meetings.html': '/stratex/meetings',
      'stratex-contracts-pay.html': '/stratex/contracts-pay',
      'stratex-players.html': '/stratex/players',
      'stratex-scouts.html': '/stratex/scouts',
      'stratex-coaches.html': '/stratex/coaches',
      'stratex-scout-teams.html': '/stratex/scout-teams',
      'stratex-school-teams.html': '/stratex/non-pro-academies',
      'stratex-award-nominations.html': '/stratex/award-nominations',
      'stratex-showcase-events.html': '/stratex/showcase-events',
      'stratex-notifications.html': '/stratex/notifications',
      'stratex-settings.html': '/stratex/settings'
    };
    return map[href] || href;
  }

  function navItems(role) {
    return (NAV[role] || []).map(function (row) {
      return { label: row[0], href: row[1], icon: ICONS[row[2]] || '-' };
    });
  }

  window.MobileNavigation = {
    currentRole: currentRole,
    navItems: navItems,
    routeFor: routeFor
  };
})();

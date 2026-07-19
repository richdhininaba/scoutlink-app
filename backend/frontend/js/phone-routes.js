'use strict';

(function () {
  function item(label, href, icon) {
    return { label: label, href: href, icon: icon || 'circle' };
  }

  var coach = [
    item('Dashboard', 'coach-dashboard.html', 'grid'),
    item('My players', 'coach-my-players.html', 'user'),
    item('Add player', 'add-player.html', 'plus'),    item('Match facts', 'match-facts.html', 'clipboard'),
    item('Fixtures', 'coach-fixtures.html', 'calendar'),
    item('Video reels', 'coach-video-reels.html', 'video'),
    item('Chat', 'coach-chat.html', 'message'),
    item('Notifications', 'coach-notifications.html', 'bell'),
item('Report a Concern', '/coach/report-a-concern', 'flag'),
    item('Settings', 'coach-settings.html', 'settings')
  ];

  var scout = [
    item('Dashboard', 'scout-dashboard.html', 'grid'),
    item('Player database', 'player-search.html', 'search'),
    item('Pipeline', 'scout-pipeline.html', 'heart'),
    item('Rankings', 'scout-rankings.html', 'trophy'),
    item('Fixtures', 'scout-fixtures.html', 'calendar'),
    item('Predictions', 'scout-predictions.html', 'chart'),
    item('Exports', 'scout-exports.html', 'download'),
    item('Compare players', 'compare-players.html', 'compare'),
    item('Scout setup', 'scout-setup.html', 'target'),
    item('Events', 'scout-events.html', 'flag'),
    item('Chat', 'scout-chat.html', 'message'),
    item('Notifications', 'scout-notifications.html', 'bell'),
    item('Report a Concern', '/report-a-concern', 'flag'),
    item('Settings', 'scout-settings.html', 'settings')
  ];

  var player = [
    item('Dashboard', 'player-dashboard.html', 'grid'),
    item('My profile', 'player-profile.html', 'user'),
    item('Video reels', 'player-video-reels.html', 'video'),
    item('Notifications', 'player-notifications.html', 'bell'),
    item('Report a Concern', '/report-a-concern', 'flag'),
    item('Settings', 'player-settings.html', 'settings')
  ];

  var stratex = [
    item('Dashboard', '/stratex/dashboard', 'grid'),
    item('Scout and Coach Registrations', '/stratex/registrations', 'file'),
    item('Coaches', '/stratex/coaches', 'coach'),
    item('Players', '/stratex/players', 'ball'),
    item('Scouts', '/stratex/scouts', 'search'),
    item('Users', '/stratex/users', 'users'),
    item('Chat', '/stratex/messages', 'message'),
    item('Notifications', '/stratex/notifications', 'bell'),
    item('Settings', '/stratex/settings', 'settings'),
    item('Product demo', '/experience-select', 'box'),
    item('Scout teams', '/stratex/scout-teams', 'star'),
    item('Non Pro academies', '/stratex/non-pro-academies', 'home')
  ];

  window.PhoneRoutes = {
    Coach: coach,
    Scout: scout,
    Player: player,
    Stratex: stratex
  };
})();


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
    item('Settings', 'scout-settings.html', 'settings')
  ];

  var player = [
    item('Dashboard', 'player-dashboard.html', 'grid'),
    item('My profile', 'player-profile.html', 'user'),
    item('Video reels', 'player-video-reels.html', 'video'),
    item('Notifications', 'player-notifications.html', 'bell'),
    item('Settings', 'player-settings.html', 'settings')
  ];

  var stratex = [
    item('Dashboard', 'stratex-dashboard.html', 'grid'),
    item('Product demo', 'experience-select.html', 'box'),
    item('Registrations', 'stratex-registrations.html', 'file'),
    item('Users', 'stratex-users.html', 'users'),
    item('Org view', 'stratex-org.html', 'org'),
    item('Hiring', 'stratex-hiring.html', 'briefcase'),
    item('Leave / Sick Leave', 'stratex-leave.html', 'calendar'),
    item('Meetings', 'stratex-meetings.html', 'users'),
    item('Contracts & Pay', 'stratex-contracts-pay.html', 'file'),
    item('Players', 'stratex-players.html', 'ball'),
    item('Scouts', 'stratex-scouts.html', 'search'),
    item('Coaches', 'stratex-coaches.html', 'coach'),
    item('Scout teams', 'stratex-scout-teams.html', 'star'),
    item('Non Pro academies', 'stratex-school-teams.html', 'home'),
    item('Award nominations', 'stratex-award-nominations.html', 'award'),
    item('Showcase events', 'stratex-showcase-events.html', 'calendar'),
    item('Notifications', 'stratex-notifications.html', 'bell'),
    item('Settings', 'stratex-settings.html', 'settings')
  ];

  window.PhoneRoutes = {
    Coach: coach,
    Scout: scout,
    Player: player,
    Stratex: stratex
  };
})();


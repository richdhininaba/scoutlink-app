(function () {
  'use strict';

  var routes = {
    '/login': '/frontend/pages/login.html',
    '/forgot-password': '/frontend/pages/forgot-password.html',
    '/experience-select': '/frontend/pages/experience-select.html',
    '/demo': '/frontend/pages/demo.html',
    '/coaches': '/frontend/pages/coaches.html',
    '/scouts': '/frontend/pages/scouts.html',
    '/register': '/frontend/pages/register.html',
    '/register/scout': '/frontend/pages/register-scout.html',
    '/register/coach': '/frontend/pages/register-coach.html',
    '/data-policy': '/frontend/pages/data-policy.html',
    '/privacy-policy': '/frontend/pages/privacy-policy.html',
    '/terms': '/frontend/pages/terms.html',
    '/cookie-policy': '/frontend/pages/cookie-policy.html',
    '/safeguarding': '/frontend/pages/safeguarding.html',
    '/report-a-concern': '/frontend/pages/report-concern.html',
    '/complete-registration': '/frontend/pages/complete-registration.html',
    '/confirm-password': '/frontend/pages/confirm-password.html',
    '/video-upload': '/frontend/pages/video-upload.html',
    '/scoutlink/pricing': '/frontend/pages/stratex-site.html',
    '/404': '/frontend/pages/404.html',

    '/company/admin': '/frontend/pages/stratex-company-admin.html',
    '/admin': '/frontend/pages/stratex-company-admin.html',
    '/admin/usage-requests': '/frontend/pages/stratex-usage-requests.html',
    '/admin/showcase-event': '/frontend/pages/stratex-showcase-events.html',

    '/stratex/dashboard': '/frontend/pages/stratex-dashboard.html',
    '/stratex/company-site': '/frontend/pages/stratex-company-admin.html',
    '/stratex/registrations': '/frontend/pages/stratex-registrations.html',
    '/stratex/users': '/frontend/pages/stratex-users.html',
    '/stratex/org': '/frontend/pages/stratex-org.html',
    '/stratex/hiring': '/frontend/pages/stratex-hiring.html',
    '/stratex/leave': '/frontend/pages/stratex-leave.html',
    '/stratex/meetings': '/frontend/pages/stratex-meetings.html',
    '/stratex/contracts-pay': '/frontend/pages/stratex-contracts-pay.html',
    '/stratex/players': '/frontend/pages/stratex-players.html',
    '/stratex/scouts': '/frontend/pages/stratex-scouts.html',
    '/stratex/coaches': '/frontend/pages/stratex-coaches.html',
    '/stratex/messages': '/frontend/pages/stratex-messages.html',
    '/stratex/scout-teams': '/frontend/pages/stratex-scout-teams.html',
    '/stratex/school-teams': '/frontend/pages/stratex-school-teams.html',
    '/stratex/non-pro-academies': '/frontend/pages/stratex-school-teams.html',
    '/stratex/award-nominations': '/frontend/pages/stratex-award-nominations.html',
    '/stratex/showcase-events': '/frontend/pages/stratex-showcase-events.html',
    '/stratex/notifications': '/frontend/pages/stratex-notifications.html',
    '/stratex/concerns': '/frontend/pages/stratex-concerns.html',
    '/stratex/settings': '/frontend/pages/stratex-settings.html',
    '/stratex/usage-requests': '/frontend/pages/stratex-usage-requests.html',

    '/coach/dashboard': '/frontend/pages/coach-dashboard.html',
    '/coach/onboarding': '/frontend/pages/coach-onboarding.html',
    '/coach/my-players': '/frontend/pages/coach-my-players.html',
    '/coach/usage-requests': '/frontend/pages/coach-usage-requests.html',
    '/coach/add-player': '/frontend/pages/add-player.html',
    '/coach/bulk-add-players': '/frontend/pages/bulk-add-players.html',
    '/coach/match-facts': '/frontend/pages/match-facts.html',
    '/coach/fixtures': '/frontend/pages/coach-fixtures.html',
    '/coach/video-reels': '/frontend/pages/coach-video-reels.html',
    '/coach/chat': '/frontend/pages/coach-chat.html',
    '/coach/notifications': '/frontend/pages/coach-notifications.html',
    '/coach/report-a-concern': '/frontend/pages/coach-report-concern.html',
    '/coach/settings': '/frontend/pages/coach-settings.html',

    '/scout/dashboard': '/frontend/pages/scout-dashboard.html',
    '/scout/onboarding': '/frontend/pages/scout-onboarding.html',
    '/scout/player-search': '/frontend/pages/player-search.html',
    '/scout/pipeline': '/frontend/pages/scout-pipeline.html',
    '/scout/rankings': '/frontend/pages/scout-rankings.html',
    '/scout/fixtures': '/frontend/pages/scout-fixtures.html',
    '/scout/predictions': '/frontend/pages/scout-predictions.html',
    '/scout/exports': '/frontend/pages/scout-exports.html',
    '/scout/compare-players': '/frontend/pages/compare-players.html',
    '/scout/setup': '/frontend/pages/scout-setup.html',
    '/scout/events': '/frontend/pages/scout-events.html',
    '/scout/chat': '/frontend/pages/scout-chat.html',
    '/scout/notifications': '/frontend/pages/scout-notifications.html',
    '/scout/report-a-concern': '/frontend/pages/scout-report-concern.html',
    '/scout/settings': '/frontend/pages/scout-settings.html',
    '/scout/usage-requests': '/frontend/pages/scout-usage-requests.html',
    '/scout/preferences': '/frontend/pages/scout-preferences.html',

    '/player/dashboard': '/frontend/pages/player-dashboard.html',
    '/player/profile': '/frontend/pages/player-profile.html',
    '/player/edit-profile': '/frontend/pages/player-profile-edit.html',
    '/player/video-reels': '/frontend/pages/player-video-reels.html',
    '/player/notifications': '/frontend/pages/player-notifications.html',
    '/player/settings': '/frontend/pages/player-settings.html'
  };

  var currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  var target = routes[currentPath];

  if (!target && currentPath.indexOf('/admin/') === 0) {
    target = '/frontend/pages/stratex-company-admin.html';
  }

  if (target) {
    window.location.replace(
      target + window.location.search + window.location.hash
    );
  }
}());

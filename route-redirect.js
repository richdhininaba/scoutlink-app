(function () {
  var routes = {
    '/login': '/frontend/pages/login.html',
    '/forgot-password': '/frontend/pages/forgot-password.html',
    '/experience-select': '/frontend/pages/experience-select.html',
    '/demo': '/frontend/pages/demo.html',
    '/coaches': '/frontend/pages/coaches.html',
    '/scouts': '/frontend/pages/scouts.html',
    '/parents-players': '/frontend/pages/parents-players.html',
    '/parents-and-players': '/frontend/pages/parents-players.html',
    '/about': '/frontend/pages/about.html',
    '/register': '/frontend/pages/register.html',
    '/register/scout': '/frontend/pages/register-scout.html',
    '/register/coach': '/frontend/pages/register-coach.html',
    '/data-policy': '/frontend/pages/data-policy.html',
    '/privacy-policy': '/frontend/pages/privacy-policy.html',
    '/privacy': '/frontend/pages/privacy-policy.html',
    '/terms': '/frontend/pages/terms.html',
    '/terms-of-use': '/frontend/pages/terms.html',
    '/cookie-policy': '/frontend/pages/cookie-policy.html',
    '/cookies': '/frontend/pages/cookie-policy.html',
    '/safeguarding': '/frontend/pages/safeguarding.html',
    '/report-a-concern': '/frontend/pages/report-concern.html',
    '/parent-guardian-notice': '/frontend/pages/parent-guardian-notice.html',
    '/applicant-privacy-notice': '/frontend/pages/applicant-privacy-notice.html',
    '/privacy-request': '/frontend/pages/privacy-request.html',
    '/contact': '/frontend/pages/contact.html',
    '/accessibility': '/frontend/pages/accessibility.html',
    '/complete-registration': '/frontend/pages/complete-registration.html',
    '/video-upload': '/frontend/pages/video-upload.html',
    '/company': '/frontend/pages/stratex-site.html',
    '/company/scoutlink': '/frontend/pages/stratex-site.html',
    '/scoutlink': '/frontend/pages/stratex-site.html',
    '/scoutlink/compatibility-score': '/frontend/pages/stratex-site.html',
    '/scoutlink/pricing': '/frontend/pages/stratex-site.html',
    '/scoutlink/scouts': '/frontend/pages/stratex-site.html',
    '/scoutlink/coaches': '/frontend/pages/stratex-site.html',
    '/grassroots-football-scouting-tools': '/frontend/pages/stratex-site.html',
    '/company/about': '/frontend/pages/stratex-site.html',
    '/company/leadership': '/frontend/pages/stratex-site.html',
    '/company/trust': '/frontend/pages/stratex-site.html',
    '/company/scout-verification': '/frontend/pages/stratex-site.html',
    '/company/parent-guardian-notice': '/frontend/pages/stratex-site.html',
    '/company/careers': '/frontend/pages/stratex-site.html',
    '/company/contact': '/frontend/pages/stratex-site.html',
    '/company/report-a-concern': '/frontend/pages/stratex-site.html',
    '/company/privacy-policy': '/frontend/pages/stratex-site.html',
    '/company/terms': '/frontend/pages/stratex-site.html',
    '/company/terms-of-use': '/frontend/pages/stratex-site.html',
    '/company/cookie-policy': '/frontend/pages/stratex-site.html',
    '/company/security': '/frontend/pages/stratex-site.html',
    '/company/accessibility': '/frontend/pages/stratex-site.html',
    '/company/learning-centre': '/frontend/pages/stratex-site.html',
    '/company/admin': '/frontend/pages/stratex-company-admin.html',
    '/admin': '/frontend/pages/stratex-company-admin.html',
    '/404': '/frontend/pages/404.html',
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
    '/coach/dashboard': '/frontend/pages/coach-dashboard.html',
    '/coach/onboarding': '/frontend/pages/coach-onboarding.html',
    '/coach/my-players': '/frontend/pages/coach-my-players.html',
    '/coach/add-player': '/frontend/pages/add-player.html',
    '/coach/bulk-add-players': '/frontend/pages/bulk-add-players.html',
    '/coach/match-facts': '/frontend/pages/match-facts.html',
    '/coach/fixtures': '/frontend/pages/coach-fixtures.html',
    '/coach/video-reels': '/frontend/pages/coach-video-reels.html',
    '/coach/chat': '/frontend/pages/coach-chat.html',
    '/coach/notifications': '/frontend/pages/coach-notifications.html',
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
    '/scout/settings': '/frontend/pages/scout-settings.html',
    '/scout/preferences': '/frontend/pages/scout-preferences.html',
    '/player/dashboard': '/frontend/pages/player-dashboard.html',
    '/player/profile': '/frontend/pages/player-profile.html',
    '/player/edit-profile': '/frontend/pages/player-profile-edit.html',
    '/player/video-reels': '/frontend/pages/player-video-reels.html',
    '/player/notifications': '/frontend/pages/player-notifications.html',
    '/player/settings': '/frontend/pages/player-settings.html',
    '/careers': '/frontend/pages/careers.html',
    '/careers/interview-availability': '/frontend/pages/interview-availability.html'
  };
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/pricing') {
    window.location.replace('/scoutlink/pricing' + window.location.search + window.location.hash);
    return;
  }
  if (path === '/compatibility-score') {
    window.location.replace('/scoutlink/compatibility-score' + window.location.search + window.location.hash);
    return;
  }
  if ((window.location.hostname === 'www.stratexanalytics.co.uk' || window.location.hostname === 'stratexanalytics.co.uk') && path === '/coaches') {
    window.location.replace('/scoutlink/coaches' + window.location.search + window.location.hash);
    return;
  }
  if ((window.location.hostname === 'www.stratexanalytics.co.uk' || window.location.hostname === 'stratexanalytics.co.uk') && path === '/scouts') {
    window.location.replace('/scoutlink/scouts' + window.location.search + window.location.hash);
    return;
  }
  if (path === '/company' || path.indexOf('/company/') === 0) {
    var cleanPath = path.replace(/^\/company/, '') || '/';
    window.location.replace(cleanPath + window.location.search + window.location.hash);
    return;
  }
  var target = routes[path];
  if (!target && path.indexOf('/admin/') === 0) {
    target = '/frontend/pages/stratex-company-admin.html';
  }
  if (!target && path.indexOf('/careers/') === 0) {
    var slug = path.split('/').filter(Boolean).slice(1).join('/');
    if (slug) {
      target = '/frontend/pages/career-detail.html';
      var params = new URLSearchParams(window.location.search);
      if (!params.get('slug')) params.set('slug', slug);
      window.location.replace(target + '?' + params.toString() + window.location.hash);
      return;
    }
  }
  if (!target && (path.indexOf('/company/careers/') === 0 || path.indexOf('/company/learning-centre/') === 0)) {
    target = '/frontend/pages/stratex-site.html';
  }
  if (target) window.location.replace(target + window.location.search + window.location.hash);
})();

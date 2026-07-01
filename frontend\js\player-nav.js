'use strict';
// Player sidebar navigation
function buildPlayerNav(navId, activeLabel) {
  var nav = document.getElementById(navId || 'sidebarNav');
  if (!nav) return;
  var cur = window.location.pathname.split('/').pop();
  var items = [
    { label: 'Dashboard', href: 'player-dashboard.html', icon: 'layout-dashboard' },
    { label: 'My profile', href: 'player-profile-edit.html', icon: 'user' },
    { label: 'Video reels', href: 'player-video-reels.html', icon: 'video' },
    { label: 'Notifications', href: 'player-notifications.html', icon: 'bell' },
    { label: 'Settings', href: 'player-settings.html', icon: 'adjustments-horizontal' }
  ];
  var iconSvgs = {
    'layout-dashboard': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    'user': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    'video': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    'bell': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    'adjustments-horizontal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></svg>'
  };
  nav.innerHTML = items.map(function(item) {
    var isActive = cur === item.href || (activeLabel && item.label.toLowerCase() === activeLabel.toLowerCase());
    return '<a class="nav-item' + (isActive ? ' active' : '') + '" href="' + item.href + '">' +
      (iconSvgs[item.icon] || '') +
      '<span>' + item.label + '</span>' +
      '</a>';
  }).join('');
}

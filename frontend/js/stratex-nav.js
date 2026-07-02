/* ScoutLink Stratex admin shared navigation builder */
'use strict';

var STRATEX_NAV_ITEMS = [
  {label:'Dashboard', href:'stratex-dashboard.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'},
  {label:'Product demo', href:'experience-select.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/></svg>'},
  {label:'Registrations', href:'stratex-registrations.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'},
  {label:'Users', href:'stratex-users.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'},
  {label:'Org view', href:'stratex-org.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="8" y="14" width="8" height="7"/><path d="M7 10v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/></svg>'},
  {label:'Hiring', href:'/stratex/hiring', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/></svg>'},
  {label:'Leave / Sick Leave', href:'stratex-leave.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>'},
  {label:'Meetings', href:'stratex-meetings.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 11l-3-3 3-3"/><path d="M18 8h-5"/></svg>'},
  {label:'Contracts & Pay', href:'stratex-contracts-pay.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>'},
  {label:'Players', href:'stratex-players.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>'},
  {label:'Scouts', href:'stratex-scouts.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'},
  {label:'Coaches', href:'stratex-coaches.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="2"/></svg>'},
  {label:'Scout teams', href:'stratex-scout-teams.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'},
  {label:'Non Pro academies', href:'stratex-school-teams.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'},
  {label:'Award nominations', href:'stratex-award-nominations.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>'},
  {label:'Showcase events', href:'stratex-showcase-events.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'},
  {label:'Notifications', href:'stratex-notifications.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'},
  {label:'Settings', href:'stratex-settings.html', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'}
];

function buildStratexNav(navElId, userObj) {
  var nav = document.getElementById(navElId || 'sidebarNav');
  if (!nav) return;
  var cur = window.location.pathname.split('/').pop();
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  nav.innerHTML = STRATEX_NAV_ITEMS.map(function(item) {
    var active = (cur === item.href || path === item.href) ? ' active' : '';
    return '<a class="nav-item' + active + '" href="' + item.href + '" style="display:flex;align-items:center;gap:10px">' +
      item.icon + '<span>' + item.label + '</span></a>';
  }).join('');
  var uel = document.getElementById('sidebarUser');
  if (uel && userObj) {
    var ini = ((userObj.firstName||'?')[0] + (userObj.lastName||'?')[0]).toUpperCase();
    uel.innerHTML = '<div class="user-info">' +
      '<div class="user-avatar" style="background:#FF5722;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">' + ini + '</div>' +
      '<div><div class="user-name">' + (userObj.firstName||'') + ' ' + (userObj.lastName||'') + '</div>' +
      '<div class="user-role" style="color:var(--text-secondary,#8b949e);font-size:12px">Stratex admin</div></div></div>';
  }
}

function initStratexPage() {
  if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || Auth.type !== 'Stratex') {
    if (typeof navigateClean === 'function') navigateClean('login.html');
    else window.location.href = '/login';
    return false;
  }
  buildStratexNav('sidebarNav', Auth.user);
  ensureStratexNotificationPanel();
  if (typeof updateNotifBadge === 'function') updateNotifBadge();
  return true;
}

function ensureStratexNotificationPanel() {
  if (document.getElementById('notifPanel')) return;
  var panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.id = 'notifPanel';
  panel.innerHTML =
    '<div class="notif-panel-header"><h3>Notifications</h3>' +
    '<button type="button" aria-label="Close notifications" onclick="toggleNotifPanel()" style="background:none;border:none;color:#B0BEC5;font-size:20px;cursor:pointer;line-height:1">&times;</button></div>' +
    '<div class="notif-list" id="notifList"><div style="padding:18px;color:#8b949e">Loading notifications...</div></div>' +
    '<div style="padding:12px 16px;border-top:1px solid var(--border,#30363d)"><a class="btn btn-sm btn-outline" href="stratex-notifications.html" style="width:100%;justify-content:center">View all notifications</a></div>';
  document.body.appendChild(panel);
}

function notificationTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  var diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

function renderStratexNotification(n) {
  return '<div style="padding:14px 16px;border-bottom:1px solid var(--border,#30363d);background:' + (n.is_read ? 'transparent' : 'rgba(29,158,117,.06)') + '">' +
    '<div style="display:flex;gap:10px;align-items:flex-start">' +
    '<span style="width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;background:' + (n.is_read ? '#30363d' : 'var(--accent,#1d9e75)') + '"></span>' +
    '<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:3px">' + (n.title || 'Notification') + '</div>' +
    '<div style="font-size:12px;line-height:1.4;color:#8b949e">' + (n.body || '') + '</div>' +
    '<div style="font-size:11px;color:#6e7681;margin-top:6px">' + notificationTime(n.created_at) + '</div></div></div></div>';
}

async function loadStratexNotificationPanel() {
  var list = document.getElementById('notifList');
  if (!list || typeof api !== 'function') return;
  list.innerHTML = '<div style="padding:18px;color:#8b949e">Loading notifications...</div>';
  try {
    var d = await api('GET', '/api/notifications?limit=8');
    var rows = d.data || [];
    list.innerHTML = rows.length ? rows.map(renderStratexNotification).join('') :
      '<div style="padding:24px;color:#8b949e;text-align:center">No notifications yet.</div>';
  } catch (e) {
    list.innerHTML = '<div style="padding:18px;color:#f44336">Could not load notifications.</div>';
  }
}

function toggleNotifPanel() {
  ensureStratexNotificationPanel();
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) loadStratexNotificationPanel();
}

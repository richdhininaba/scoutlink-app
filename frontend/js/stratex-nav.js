/* ScoutLink product-admin shared navigation builder */
'use strict';

var STRATEX_ADMIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';

var STRATEX_NAV_ITEMS = [
  {label:'Dashboard', copy:'ScoutLink overview', href:'/stratex/dashboard', icon:STRATEX_ADMIN_ICON},
  {label:'Scout and Coach Registrations', copy:'Access requests', href:'/stratex/registrations', icon:STRATEX_ADMIN_ICON},
  {label:'Coaches', copy:'Coach accounts', href:'/stratex/coaches', icon:STRATEX_ADMIN_ICON},
  {label:'Players', copy:'Player records', href:'/stratex/players', icon:STRATEX_ADMIN_ICON},
  {label:'Scouts', copy:'Scout accounts', href:'/stratex/scouts', icon:STRATEX_ADMIN_ICON},
  {label:'Users', copy:'Admin and account access', href:'/stratex/users', icon:STRATEX_ADMIN_ICON},
  {label:'Chat', copy:'Coach and scout messages', href:'/stratex/messages', icon:STRATEX_ADMIN_ICON},
  {label:'Notifications', copy:'Product notifications', href:'/stratex/notifications', icon:STRATEX_ADMIN_ICON},
  {label:'Settings', copy:'ScoutLink settings', href:'/stratex/settings', icon:STRATEX_ADMIN_ICON},
  {label:'Product Demo', copy:'Demo mode', href:'/experience-select', icon:STRATEX_ADMIN_ICON},
  {label:'Scout Teams', copy:'Scout organisations', href:'/stratex/scout-teams', icon:STRATEX_ADMIN_ICON},
  {label:'Non Pro Academies', copy:'Coach teams', href:'/stratex/non-pro-academies', icon:STRATEX_ADMIN_ICON}
];

function buildStratexNav(navElId, userObj) {
  var nav = document.getElementById(navElId || 'sidebarNav');
  if (!nav) return;
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  nav.innerHTML = STRATEX_NAV_ITEMS.map(function(item) {
    var active = path === item.href ? ' active' : '';
    return '<a class="nav-item' + active + '" href="' + item.href + '" style="display:flex;align-items:center;gap:10px">' +
      item.icon + '<span style="display:grid;gap:2px"><b>' + item.label + '</b>' + (item.copy ? '<small style="color:var(--text-secondary,#667085);font-size:11px;line-height:1.25">' + item.copy + '</small>' : '') + '</span></a>';
  }).join('');
  var uel = document.getElementById('sidebarUser');
  if (uel && userObj) {
    var ini = ((userObj.firstName||'?')[0] + (userObj.lastName||'?')[0]).toUpperCase();
    uel.innerHTML = '<div class="user-info">' +
      '<div class="user-avatar" style="background:#FF5722;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">' + ini + '</div>' +
      '<div><div class="user-name">' + (userObj.firstName||'') + ' ' + (userObj.lastName||'') + '</div>' +
      '<div class="user-role" style="color:var(--text-secondary,#8b949e);font-size:12px">ScoutLink product admin</div></div></div>';
  }
}

function initStratexPage() {
  if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || Auth.type !== 'Stratex') {
    if (window.location.pathname.replace(/\/$/, '') === '/admin') {
      renderRestrictedStratexAdmin();
      return false;
    }
    if (typeof navigateClean === 'function') navigateClean('login.html');
    else window.location.href = '/login';
    return false;
  }
  buildStratexNav('sidebarNav', Auth.user);
  ensureStratexNotificationPanel();
  if (typeof updateNotifBadge === 'function') updateNotifBadge();
  return true;
}

function renderRestrictedStratexAdmin() {
  document.body.className = 'theme-light';
  document.body.innerHTML =
    '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f3f6fa;color:#101828;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif">' +
      '<section style="width:min(560px,100%);padding:34px;border:1px solid #dde5ee;border-radius:28px;background:#fff;box-shadow:0 22px 70px rgba(15,23,42,.1)">' +
        '<a href="/" style="display:inline-flex;margin-bottom:22px;color:#101828;text-decoration:none;font-size:24px;font-weight:950;letter-spacing:-.04em">Stratex<span style="color:#087a61">Analytics</span></a>' +
        '<p style="display:inline-flex;min-height:30px;align-items:center;padding:0 12px;border-radius:999px;background:#ecfdf5;color:#087a61;font-size:12px;font-weight:950;letter-spacing:.07em;text-transform:uppercase">Restricted access</p>' +
        '<h1 style="margin:16px 0 10px;font-size:clamp(34px,6vw,52px);line-height:1.02;letter-spacing:-.05em">Stratex Admin Centre</h1>' +
        '<p style="margin:0 0 24px;color:#526174;font-size:17px;line-height:1.55">The Stratex Admin Centre is for authorised Stratex team members only. Sign in with your shared ScoutLink/Stratex account to continue.</p>' +
        '<a href="/login?return=/admin" style="min-height:46px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border-radius:15px;background:#0fa37f;color:#fff;text-decoration:none;font-weight:900">Sign in</a>' +
      '</section>' +
    '</main>';
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

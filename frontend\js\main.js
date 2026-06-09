'use strict';
// ScoutLink Frontend v2.2 - All experiences complete
const API = localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';

// Auth
const Auth = {
  get token() { return localStorage.getItem('sl_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('sl_user')); } catch { return null; } },
  get type() { return localStorage.getItem('sl_type'); },
  set(token, user, type) {
    localStorage.setItem('sl_token', token);
    localStorage.setItem('sl_user', JSON.stringify(user));
    localStorage.setItem('sl_type', type);
  },
  clear() { ['sl_token','sl_user','sl_type','sl_session','sl_user_id','sl_user_email','sl_user_role','sl_user_data'].forEach(k => localStorage.removeItem(k)); },
  isLoggedIn() { return !!this.token && !!this.user; },
  redirectToDashboard() {
    const map = { Player:'player-dashboard.html', Coach:'coach-dashboard.html',
      Scout:'scout-dashboard.html', Stratex:'stratex-dashboard.html' };
    const dest = map[this.type] || 'login.html';
    window.location.href = dest;
  }
};

// API helper - handles 401 by clearing auth and redirecting to login
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 401) {
    // Token expired or invalid - clear and redirect to login
    Auth.clear();
    window.location.href = 'login.html?expired=1';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Navbar scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
}

// Mobile menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('nav-open'));
}

// Range picker
function initRangePicker(containerClass, hiddenInputName) {
  const containers = document.querySelectorAll('.' + containerClass);
  containers.forEach(c => {
    const opts = c.querySelectorAll('.range-option');
    const hidden = document.querySelector('[name="' + hiddenInputName + '"]');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (hidden) hidden.value = opt.dataset.value;
      });
    });
    if (opts.length) { opts[0].classList.add('active'); if (hidden) hidden.value = opts[0].dataset.value; }
  });
}

// Notification badge updater
async function updateNotifBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const d = await api('GET', '/api/notifications?unreadOnly=true&limit=1');
    const badge = document.getElementById('notifBadge');
    if (badge) { badge.textContent = d.unreadCount||''; badge.style.display = d.unreadCount ? 'flex' : 'none'; }
  } catch {}
}

// Format helpers
function formatValue(v) { return v >= 1000000 ? '£'+(v/1000000).toFixed(2)+'M' : v >= 1000 ? '£'+(v/1000).toFixed(0)+'K' : '£'+v; }
function formatSalary(v) { return v >= 1000 ? '£'+(v/1000).toFixed(1)+'K/wk' : '£'+v+'/wk'; }
function relTime(dateStr) {
  const d = (Date.now()-new Date(dateStr).getTime())/1000;
  if (d<60) return 'just now'; if (d<3600) return Math.floor(d/60)+'m ago';
  if (d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago';
}
function initials(first,last) { return ((first||'')[0]||'').toUpperCase()+''+((last||'')[0]||'').toUpperCase(); }
function posGroupColor(g) { return {Goalkeeper:'#FFC107',Defender:'#2979FF',Midfielder:'#00BCD4',Forward:'#FF5722'}[g]||'#00E676'; }
// Rating color - works for both 0-10 and 0-100 scale
function ratingColor(r) {
  // Normalise to 0-100 if value looks like 0-10 scale
  const v = r <= 10 ? r * 10 : r;
  return v>=80?'#00E676':v>=65?'#FFC107':v>=50?'#FF9800':'#f44336';
}
// Display a rating value on the public 0-100 scale.
function ratingDisplay(r) {
  if (r === null || r === undefined) return '--';
  const n = Number(r);
  if (Number.isNaN(n)) return '--';
  const v = n <= 10 ? n * 10 : n;
  return String(Math.round(v));
}

window.Auth = Auth; window.api = api; window.formatValue = formatValue;
window.formatSalary = formatSalary; window.relTime = relTime;
window.initials = initials; window.posGroupColor = posGroupColor; window.ratingColor = ratingColor;
window.ratingDisplay = ratingDisplay;
window.updateNotifBadge = updateNotifBadge; window.initRangePicker = initRangePicker;

document.addEventListener('DOMContentLoaded', () => {
  // Check for session expired param
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired') === '1') {
    const msg = document.getElementById('loginMsg') || document.getElementById('loginError');
    if (msg) { msg.textContent = 'Your session has expired. Please log in again.'; msg.style.display = 'block'; }
  }
  // Check for logout param
  if (params.get('logout') === '1') {
    Auth.clear();
  }
  updateNotifBadge();
  // Auto-redirect if already logged in and on index
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    if (Auth.isLoggedIn()) Auth.redirectToDashboard();
  }
});

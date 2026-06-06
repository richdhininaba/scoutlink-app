'use strict';
// ScoutLink Frontend v2.0
// API base - update this to your deployed backend URL
const API = localStorage.getItem('sl_api_url') || 'http://localhost:3000';

// ── Auth ───────────────────────────────────────────────────────────────────
const Auth = {
  get token() { return localStorage.getItem('sl_token'); },
  get user()  { try { return JSON.parse(localStorage.getItem('sl_user')); } catch { return null; } },
  get type()  { return localStorage.getItem('sl_type'); },
  set(token, user, type) {
    localStorage.setItem('sl_token', token);
    localStorage.setItem('sl_user', JSON.stringify(user));
    localStorage.setItem('sl_type', type);
  },
  clear() { ['sl_token','sl_user','sl_type'].forEach(k => localStorage.removeItem(k)); },
  isLoggedIn() { return !!this.token && !!this.user; },
  redirectToDashboard() {
    const map = { Player:'pages/player-dashboard.html', Coach:'pages/coach-dashboard.html',
      Scout:'pages/scout-dashboard.html', Stratex:'pages/stratex-dashboard.html' };
    const dest = map[this.type] || 'pages/login.html';
    window.location.href = dest;
  }
};

// ── API helper ─────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Navbar scroll ──────────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
}

// ── Mobile menu ────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('nav-open'));
}

// ── Range picker ───────────────────────────────────────────────────────────
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
    // Set first as default
    if (opts.length) { opts[0].classList.add('active'); if (hidden) hidden.value = opts[0].dataset.value; }
  });
}

// ── Avatar builder ─────────────────────────────────────────────────────────
const AvatarBuilder = {
  config: { skin:'#FDBCB4', hair:'#2C1810', hairStyle:'short', eyeColor:'#4A3728' },
  skinTones: ['#FDBCB4','#E8A887','#C68642','#8D5524','#4A2912','#FFDFC4'],
  hairColors: ['#2C1810','#5C3317','#C4A35A','#E8D5B0','#FF6B35','#1A1A1A','#E0E0E0'],
  hairStyles: ['Buzz Cut','Short','Medium','Long','Curly','Afro','Braids'],
  init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.render();
  },
  render() {
    if (!this.ctx) return;
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Background
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0,0,w,h);
    // Neck
    ctx.fillStyle = this.config.skin; ctx.fillRect(w/2-12,h*0.62,24,h*0.22);
    // Head
    ctx.beginPath(); ctx.ellipse(w/2,h*0.42,w*0.28,h*0.3,0,0,Math.PI*2);
    ctx.fillStyle = this.config.skin; ctx.fill();
    // Hair
    ctx.fillStyle = this.config.hair;
    ctx.beginPath(); ctx.ellipse(w/2,h*0.28,w*0.29,h*0.16,0,Math.PI,Math.PI*2);
    ctx.fill();
    if (this.config.hairStyle === 'Long' || this.config.hairStyle === 'Curly') {
      ctx.fillRect(w/2-w*0.28,h*0.28,10,h*0.18);
      ctx.fillRect(w/2+w*0.28-10,h*0.28,10,h*0.18);
    }
    // Eyes
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(w/2-14,h*0.41,6,4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2+14,h*0.41,6,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = this.config.eyeColor; ctx.beginPath(); ctx.arc(w/2-14,h*0.41,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2+14,h*0.41,3.5,0,Math.PI*2); ctx.fill();
    // Smile
    ctx.strokeStyle = '#8B5E52'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(w/2,h*0.51,10,0.2,Math.PI-0.2); ctx.stroke();
  },
  getConfig() { return { ...this.config }; }
};
window.AvatarBuilder = AvatarBuilder;

// ── Notification badge updater ─────────────────────────────────────────────
async function updateNotifBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const d = await api('GET', '/api/notifications?unreadOnly=true&limit=1');
    const badge = document.getElementById('notifBadge');
    if (badge) { badge.textContent = d.unreadCount||''; badge.style.display = d.unreadCount ? 'flex' : 'none'; }
  } catch {}
}

// ── Format helpers ─────────────────────────────────────────────────────────
function formatValue(v) { return v >= 1000000 ? '£'+(v/1000000).toFixed(2)+'M' : v >= 1000 ? '£'+(v/1000).toFixed(0)+'K' : '£'+v; }
function formatSalary(v) { return v >= 1000 ? '£'+(v/1000).toFixed(1)+'K/wk' : '£'+v+'/wk'; }
function relTime(dateStr) {
  const d = (Date.now()-new Date(dateStr).getTime())/1000;
  if (d<60) return 'just now'; if (d<3600) return Math.floor(d/60)+'m ago';
  if (d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago';
}
function initials(first,last) { return ((first||'')[0]||'')+''+((last||'')[0]||'').toUpperCase(); }
function posGroupColor(g) { return {Goalkeeper:'#FFC107',Defender:'#2979FF',Midfielder:'#00BCD4',Forward:'#FF5722'}[g]||'#00E676'; }
function ratingColor(r) { return r>=80?'#00E676':r>=65?'#FFC107':r>=50?'#FF9800':'#f44336'; }

window.Auth = Auth; window.api = api; window.formatValue = formatValue;
window.formatSalary = formatSalary; window.relTime = relTime;
window.initials = initials; window.posGroupColor = posGroupColor; window.ratingColor = ratingColor;
window.updateNotifBadge = updateNotifBadge; window.initRangePicker = initRangePicker;

document.addEventListener('DOMContentLoaded', () => {
  updateNotifBadge();
  // Auto-redirect if already logged in and on index
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    if (Auth.isLoggedIn()) Auth.redirectToDashboard();
  }
});
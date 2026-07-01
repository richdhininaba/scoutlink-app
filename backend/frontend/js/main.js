'use strict';
// ScoutLink Frontend v2.2 - All experiences complete
const API = localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';

const CLEAN_ROUTES = {
  'index.html':'/',
  'login.html':'/login',
  'forgot-password.html':'/forgot-password',
  'experience-select.html':'/experience-select',
  'register.html':'/register',
  'register-scout.html':'/register/scout',
  'register-coach.html':'/register/coach',
  'data-policy.html':'/data-policy',
  'complete-registration.html':'/complete-registration',
  'stratex-dashboard.html':'/stratex/dashboard',
  'stratex-registrations.html':'/stratex/registrations',
  'stratex-users.html':'/stratex/users',
  'stratex-org.html':'/stratex/org',
  'stratex-hiring.html':'/stratex/hiring',
  'stratex-leave.html':'/stratex/leave',
  'stratex-meetings.html':'/stratex/meetings',
  'stratex-contracts-pay.html':'/stratex/contracts-pay',
  'stratex-players.html':'/stratex/players',
  'stratex-scouts.html':'/stratex/scouts',
  'stratex-coaches.html':'/stratex/coaches',
  'stratex-scout-teams.html':'/stratex/scout-teams',
  'stratex-school-teams.html':'/stratex/non-pro-academies',
  'stratex-award-nominations.html':'/stratex/award-nominations',
  'stratex-showcase-events.html':'/stratex/showcase-events',
  'stratex-notifications.html':'/stratex/notifications',
  'stratex-settings.html':'/stratex/settings',
  'coach-dashboard.html':'/coach/dashboard',
  'coach-onboarding.html':'/coach/onboarding',
  'coach-my-players.html':'/coach/my-players',
  'add-player.html':'/coach/add-player',
  'bulk-add-players.html':'/coach/bulk-add-players',
  'match-facts.html':'/coach/match-facts',
  'coach-fixtures.html':'/coach/fixtures',
  'coach-video-reels.html':'/coach/video-reels',
  'coach-chat.html':'/coach/chat',
  'coach-notifications.html':'/coach/notifications',
  'coach-settings.html':'/coach/settings',
  'scout-dashboard.html':'/scout/dashboard',
  'scout-onboarding.html':'/scout/onboarding',
  'player-search.html':'/scout/player-search',
  'scout-pipeline.html':'/scout/pipeline',
  'scout-rankings.html':'/scout/rankings',
  'scout-fixtures.html':'/scout/fixtures',
  'scout-predictions.html':'/scout/predictions',
  'scout-exports.html':'/scout/exports',
  'compare-players.html':'/scout/compare-players',
  'scout-setup.html':'/scout/setup',
  'scout-events.html':'/scout/events',
  'scout-chat.html':'/scout/chat',
  'scout-notifications.html':'/scout/notifications',
  'scout-settings.html':'/scout/settings',
  'scout-preferences.html':'/scout/preferences',
  'player-dashboard.html':'/player/dashboard',
  'player-profile.html':'/player/profile',
  'player-profile-edit.html':'/player/edit-profile',
  'player-video-reels.html':'/player/video-reels',
  'player-notifications.html':'/player/notifications',
  'player-settings.html':'/player/settings',
  'careers.html':'/careers',
  'career-detail.html':'/careers'
};

function cleanRouteFor(href) {
  if (!href || href.indexOf('#') === 0) return href;
  const url = new URL(href, window.location.href);
  const page = url.pathname.split('/').pop();
  const route = CLEAN_ROUTES[page];
  if (!route) return href;
  return route + url.search + url.hash;
}

function applyCleanUrl() {
  const page = window.location.pathname.split('/').pop();
  const route = CLEAN_ROUTES[page];
  if (route && window.history && window.location.protocol.indexOf('http') === 0) {
    window.history.replaceState(null, '', route + window.location.search + window.location.hash);
  }
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-light', next === 'light');
  document.body.classList.toggle('theme-dark', next === 'dark');
  localStorage.setItem('sl_theme', next);
}

function navigateClean(href) {
  window.location.href = cleanRouteFor(href);
}

function logoutToLogin() {
  Auth.clear();
  navigateClean('login.html?logout=1');
}

applyCleanUrl();
document.addEventListener('DOMContentLoaded', function(){ applyTheme(localStorage.getItem('sl_theme') || 'light'); });

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
  clear() { ['sl_token','sl_user','sl_type','sl_session','sl_user_id','sl_user_email','sl_user_role','sl_user_data','sl_demo_mode','sl_demo_tour','sl_admin_token','sl_admin_user','sl_admin_type','sl_experience_switcher','sl_force_tour'].forEach(k => localStorage.removeItem(k)); },
  isLoggedIn() { return !!this.token && !!this.user; },
  redirectToDashboard() {
    const map = { Player:'player-dashboard.html', Coach:'coach-dashboard.html',
      Scout:'scout-dashboard.html', Stratex:'experience-select.html' };
    const dest = map[this.type] || 'login.html';
    window.location.href = cleanRouteFor(dest);
  }
};

function isDemoMode() {
  return localStorage.getItem('sl_demo_mode') === '1';
}

function restoreAdminSessionForSelector() {
  var token = localStorage.getItem('sl_admin_token');
  var rawUser = localStorage.getItem('sl_admin_user');
  if (!token || !rawUser) return false;
  try {
    var user = JSON.parse(rawUser);
    Auth.set(token, user, localStorage.getItem('sl_admin_type') || 'Stratex');
    localStorage.removeItem('sl_demo_mode');
    localStorage.removeItem('sl_demo_tour');
    return true;
  } catch(e) {
    return false;
  }
}

function openExperienceSelector() {
  if (isDemoMode()) restoreAdminSessionForSelector();
  navigateClean('experience-select.html');
}

async function maybeShowExperienceSwitcher() {
  if (!Auth.isLoggedIn()) return;
  var shouldShow = isDemoMode() || Auth.type === 'Stratex' || localStorage.getItem('sl_experience_switcher') === '1';
  if (!shouldShow) {
    try {
      var d = await api('GET', '/api/auth/experiences');
      shouldShow = !!d.showSwitcher;
      localStorage.setItem('sl_experience_switcher', shouldShow ? '1' : '0');
    } catch(e) {}
  }
  if (!shouldShow || document.getElementById('experienceSwitchBtn')) return;
  var right = document.querySelector('.topbar-right');
  if (!right) return;
  var btn = document.createElement('button');
  btn.id = 'experienceSwitchBtn';
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-outline experience-switch-btn';
  btn.textContent = isDemoMode() ? 'Switch demo' : 'Switch experience';
  btn.addEventListener('click', openExperienceSelector);
  right.insertBefore(btn, right.firstChild);
}

// API helper - handles 401 by clearing auth and redirecting to login
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 401) {
    // Token expired or invalid - clear and redirect to login
    Auth.clear();
    window.location.href = '/login?expired=1';
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
function formatValue(v) { return v >= 1000000 ? '\u00a3'+(v/1000000).toFixed(2)+'M' : v >= 1000 ? '\u00a3'+(v/1000).toFixed(0)+'K' : '\u00a3'+v; }
function formatSalary(v) { return v >= 1000 ? '\u00a3'+(v/1000).toFixed(1)+'K/wk' : '\u00a3'+v+'/wk'; }
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

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateEmailInput(input) {
  if (!input) return true;
  const value = input.value.trim();
  const ok = !value || isValidEmailAddress(value);
  input.classList.toggle('field-invalid', !ok);
  input.setAttribute('aria-invalid', ok ? 'false' : 'true');
  if (!ok) input.setCustomValidity('Please enter a valid email address.');
  else input.setCustomValidity('');
  return ok;
}

const SL_COUNTRY_CITIES = {
  England:['London','Manchester','Liverpool','Birmingham','Leeds','Bristol','Sheffield','Nottingham','Southampton','Newcastle','Leicester','Coventry','Derby','Reading','Oxford','Cambridge','Brighton','Portsmouth','Plymouth','Norwich','York'],
  Scotland:['Glasgow','Edinburgh','Aberdeen','Dundee','Inverness','Stirling'],
  Wales:['Cardiff','Swansea','Newport','Wrexham'],
  'Northern Ireland':['Belfast','Derry/Londonderry','Lisburn','Newry'],
  Ireland:['Dublin','Cork','Galway','Limerick'],
  'United States':['New York','Los Angeles','Chicago','Dallas','Miami','Atlanta'],
  France:['Paris','Lyon','Marseille','Lille','Nice'],
  Spain:['Madrid','Barcelona','Valencia','Seville','Bilbao'],
  Germany:['Berlin','Munich','Hamburg','Dortmund','Frankfurt'],
  Netherlands:['Amsterdam','Rotterdam','Eindhoven','Utrecht'],
  Portugal:['Lisbon','Porto','Braga','Faro']
};
function canonicalChoice(value, choices) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hit = (choices || []).find(x => x.toLowerCase() === raw.toLowerCase());
  if (hit) return hit;
  return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function fillCountrySelect(selectId, selected) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const countries = Object.keys(SL_COUNTRY_CITIES);
  el.innerHTML = countries.map(c => '<option value="'+c+'">'+c+'</option>').join('');
  el.value = selected && countries.includes(selected) ? selected : 'England';
}
function attachCityAutocomplete(inputId, datalistId, countryId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let list = document.getElementById(datalistId);
  if (!list) {
    list = document.createElement('datalist');
    list.id = datalistId;
    document.body.appendChild(list);
  }
  input.setAttribute('list', datalistId);
  function cities() {
    const countryEl = countryId ? document.getElementById(countryId) : null;
    return SL_COUNTRY_CITIES[(countryEl && countryEl.value) || 'England'] || [];
  }
  function render() {
    list.innerHTML = cities().map(c => '<option value="'+c+'"></option>').join('');
    input.value = canonicalChoice(input.value, cities());
  }
  input.addEventListener('blur', render);
  if (countryId) {
    const countryEl = document.getElementById(countryId);
    if (countryEl) countryEl.addEventListener('change', render);
  }
  render();
}

window.Auth = Auth; window.api = api; window.formatValue = formatValue;
window.formatSalary = formatSalary; window.relTime = relTime;
window.initials = initials; window.posGroupColor = posGroupColor; window.ratingColor = ratingColor;
window.ratingDisplay = ratingDisplay;
window.isValidEmailAddress = isValidEmailAddress; window.validateEmailInput = validateEmailInput;
window.updateNotifBadge = updateNotifBadge; window.initRangePicker = initRangePicker;
window.applyTheme = applyTheme; window.cleanRouteFor = cleanRouteFor;
window.navigateClean = navigateClean; window.logoutToLogin = logoutToLogin;
window.isDemoMode = isDemoMode; window.openExperienceSelector = openExperienceSelector;
window.restoreAdminSessionForSelector = restoreAdminSessionForSelector;
window.SL_COUNTRY_CITIES = SL_COUNTRY_CITIES; window.fillCountrySelect = fillCountrySelect;
window.attachCityAutocomplete = attachCityAutocomplete; window.canonicalChoice = canonicalChoice;

document.addEventListener('DOMContentLoaded', () => {
  maybeShowExperienceSwitcher();
  document.querySelectorAll('input[type="email"]').forEach(input => {
    input.addEventListener('input', () => validateEmailInput(input));
    input.addEventListener('blur', () => validateEmailInput(input));
  });
  document.addEventListener('click', function(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.indexOf('http') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('#') === 0) return;
    const clean = cleanRouteFor(href);
    if (clean !== href && window.location.protocol.indexOf('http') === 0) {
      e.preventDefault();
      window.location.href = clean;
    }
  });
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


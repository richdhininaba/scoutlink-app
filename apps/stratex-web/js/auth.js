// ScoutLink Auth & API Helper
// Uses Supabase REST API directly from the browser (no backend needed for static site)

// Detect the correct base path for redirects
// On scoutlink.app the path is /pages/
// On GitHub Pages (richdhininaba.github.io) the path is /scoutlink-app/pages/
function getBase() {
  var host = window.location.hostname;
  if (host === 'scoutlink.app' || host === 'www.scoutlink.app') {
    return '/';
  }
  return '/scoutlink-app/pages/';
}

function cleanAuthRoute(file) {
  if (typeof cleanRouteFor === 'function') return cleanRouteFor(file);
  var map = {
    'login.html': '/login',
    'scout-dashboard.html': '/scout/dashboard',
    'scout-preferences.html': '/scout/preferences',
    'coach-dashboard.html': '/coach/dashboard',
    'player-dashboard.html': '/player/dashboard',
    'stratex-dashboard.html': '/stratex/dashboard'
  };
  var host = window.location.hostname;
  if ((host === 'scoutlink.app' || host === 'www.scoutlink.app') && map[file]) return map[file];
  return getBase() + file;
}

const SL = {
  url: window.SL_CONFIG?.SUPABASE_URL || 'https://fwxnggklfsgrydcoeiuh.supabase.co',
  key: window.SL_CONFIG?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eG5nZ2tsZnNncnlkY29laXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDgwOTMsImV4cCI6MjA5NjMyNDA5M30.lV6TCjabEHevU5woLHLa0cCwBvm-0dFpce09ialfpKw',

  headers() {
    const session = SL.getSession();
    return {
      'apikey': SL.key,
      'Authorization': 'Bearer ' + (session?.access_token || SL.key),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  // --- AUTH ---
  async signUp(email, password) {
    const r = await fetch(SL.url + '/auth/v1/signup', {
      method: 'POST',
      headers: { apikey: SL.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return r.json();
  },

  async signIn(email, password) {
    const r = await fetch(SL.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SL.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (data.access_token) {
      localStorage.setItem('sl_session', JSON.stringify(data));
      localStorage.setItem('sl_user_id', data.user?.id);
      localStorage.setItem('sl_user_email', data.user?.email);
    }
    return data;
  },

  async signOut() {
    const session = SL.getSession();
    if (session?.access_token) {
      await fetch(SL.url + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: SL.key, Authorization: 'Bearer ' + session.access_token }
      });
    }
    localStorage.removeItem('sl_session');
    localStorage.removeItem('sl_user_id');
    localStorage.removeItem('sl_user_email');
    localStorage.removeItem('sl_user_role');
    localStorage.removeItem('sl_user_data');
    window.location.href = cleanAuthRoute('login.html');
  },

  async resetPassword(email) {
    const r = await fetch(SL.url + '/auth/v1/recover', {
      method: 'POST',
      headers: { apikey: SL.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return r.json();
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem('sl_session')); } catch { return null; }
  },

  isLoggedIn() {
    const s = SL.getSession();
    if (!s?.access_token || !s?.expires_at) return false;
    return Date.now() / 1000 < s.expires_at;
  },

  // --- DATABASE ---
  async query(table, params = '') {
    const r = await fetch(SL.url + '/rest/v1/' + table + '?' + params, { headers: SL.headers() });
    return r.json();
  },

  async insert(table, data) {
    const r = await fetch(SL.url + '/rest/v1/' + table, {
      method: 'POST', headers: SL.headers(), body: JSON.stringify(data)
    });
    return r.json();
  },

  async update(table, matchCol, matchVal, data) {
    const r = await fetch(SL.url + '/rest/v1/' + table + '?' + matchCol + '=eq.' + matchVal, {
      method: 'PATCH', headers: SL.headers(), body: JSON.stringify(data)
    });
    return r.json();
  },

  async delete(table, matchCol, matchVal) {
    const r = await fetch(SL.url + '/rest/v1/' + table + '?' + matchCol + '=eq.' + matchVal, {
      method: 'DELETE', headers: SL.headers()
    });
    return r.ok;
  },

  // --- USER PROFILE ---
  async getProfile(email) {
    // Check each role table
    const tables = ['scouts', 'coaches', 'players', 'stratex'];
    for (const t of tables) {
      const data = await SL.query(t, 'email=eq.' + encodeURIComponent(email) + '&select=*');
      if (Array.isArray(data) && data.length > 0) {
        return { role: t === 'stratex' ? 'stratex' : t.slice(0,-1), table: t, data: data[0] };
      }
    }
    return null;
  },

  // --- LOGIN FLOW ---
  async login(email, password) {
    const authData = await SL.signIn(email, password);
    if (authData.error || !authData.access_token) {
      throw new Error(authData.error_description || authData.msg || 'Login failed');
    }
    const profile = await SL.getProfile(email);
    if (!profile) throw new Error('Account not found. Please register first.');
    localStorage.setItem('sl_user_role', profile.role);
    localStorage.setItem('sl_user_data', JSON.stringify(profile.data));
    return profile;
  },

  // --- REDIRECT AFTER LOGIN ---
  redirectByRole(role, userData) {
    if (role === 'scout') {
      const hasPrefs = userData?.preferences_set;
      window.location.href = cleanAuthRoute(hasPrefs ? 'scout-dashboard.html' : 'scout-preferences.html');
    } else if (role === 'coach') {
      window.location.href = cleanAuthRoute('coach-dashboard.html');
    } else if (role === 'player') {
      window.location.href = cleanAuthRoute('player-dashboard.html');
    } else if (role === 'stratex') {
      window.location.href = cleanAuthRoute('stratex-dashboard.html');
    } else {
      window.location.href = cleanAuthRoute('login.html');
    }
  },

  // Guard: redirect to login if not authenticated
  requireAuth() {
    if (!SL.isLoggedIn()) {
      window.location.href = cleanAuthRoute('login.html');
      return false;
    }
    return true;
  }
};

window.SL = SL;
window.getBase = getBase;

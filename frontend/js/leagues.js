'use strict';
/* Shared JSON-backed league picker for Stratex admin flows. */
(function(){
  var cache = null;

  function safe(v){ return String(v || '').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function norm(v){ return String(v || '').trim().replace(/\s+/g, ' '); }
  function validUrl(v){ return !v || /^https?:\/\//i.test(String(v).trim()); }
  function isFullTime(v){ return !v || /fulltime\.thefa\.com/i.test(String(v).trim()); }

  function dataUrls(){
    return [
      '../data/scoutlink_leagues_fulltime_urls.json',
      '/frontend/data/scoutlink_leagues_fulltime_urls.json',
      'frontend/data/scoutlink_leagues_fulltime_urls.json',
      '/data/scoutlink_leagues_fulltime_urls.json'
    ];
  }

  async function fetchLeagueJson(){
    var urls = dataUrls();
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { cache: 'no-store' });
        if (!res.ok) continue;
        var json = await res.json();
        return Array.isArray(json.leagues) ? json.leagues : [];
      } catch (_) {}
    }
    return [];
  }

  async function fetchApiLeagues(){
    if (typeof api !== 'function') return [];
    try {
      var d = await api('GET', '/api/stratex/leagues');
      return (d.data || []).map(function(x){
        return {
          name: x.name || x.league_name || x.league,
          fulltime_url: x.fulltime_url || x.league_fulltime_url || null,
          url_status: x.url_status || null,
          admin_editable: true,
          team_website_url: x.team_website_url || null,
          team_website_admin_editable: true,
          notes: x.notes || null
        };
      }).filter(function(x){ return x.name; });
    } catch(_) {
      return [];
    }
  }

  function mergeRecords(primary, fallback){
    var seen = {};
    var out = [];
    (primary || []).concat(fallback || []).forEach(function(x){
      var name = norm(x && x.name);
      if (!name || seen[name.toLowerCase()]) return;
      seen[name.toLowerCase()] = true;
      out.push({
        name: name,
        fulltime_url: x.fulltime_url || null,
        url_status: x.url_status || null,
        admin_editable: x.admin_editable !== false,
        team_website_url: x.team_website_url || null,
        team_website_admin_editable: x.team_website_admin_editable !== false,
        notes: x.notes || null
      });
    });
    return out.sort(function(a,b){ return a.name.localeCompare(b.name); });
  }

  async function loadLeagues() {
    if (cache) return cache;
    var fromJson = await fetchLeagueJson();
    var fromApi = await fetchApiLeagues();
    cache = mergeRecords(fromJson, fromApi);
    window.SL_LEAGUES = cache;
    return cache;
  }

  function datalistId(inputId) { return inputId + 'LeagueOptions'; }

  function findLeague(name) {
    var key = norm(name).toLowerCase();
    if (!key) return null;
    return (cache || window.SL_LEAGUES || []).find(function(x){ return norm(x.name).toLowerCase() === key; }) || null;
  }

  function setWarning(opts, message) {
    if (!opts || !opts.warningId) return;
    var el = document.getElementById(opts.warningId);
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  }

  function syncUrlFields(input, opts, force) {
    opts = opts || {};
    var record = findLeague(input.value);
    var fulltime = opts.fulltimeInputId ? document.getElementById(opts.fulltimeInputId) : null;
    var website = opts.websiteInputId ? document.getElementById(opts.websiteInputId) : null;
    if (record && fulltime && (force || !fulltime.value.trim())) fulltime.value = record.fulltime_url || '';
    if (record && website && (force || !website.value.trim())) website.value = record.team_website_url || '';
    validateLeagueUrls(opts);
  }

  function validateLeagueUrls(opts) {
    opts = opts || {};
    var fulltime = opts.fulltimeInputId ? document.getElementById(opts.fulltimeInputId) : null;
    var website = opts.websiteInputId ? document.getElementById(opts.websiteInputId) : null;
    if (fulltime && !validUrl(fulltime.value)) {
      setWarning(opts, 'FA Full-Time URL must start with http:// or https://.');
      return false;
    }
    if (website && !validUrl(website.value)) {
      setWarning(opts, 'Team website URL must start with http:// or https://.');
      return false;
    }
    if (fulltime && fulltime.value.trim() && !isFullTime(fulltime.value)) {
      setWarning(opts, 'This does not look like an FA Full-Time URL. You can still save it if it is the right league link.');
      return true;
    }
    setWarning(opts, '');
    return true;
  }

  async function bindLeagueInput(inputId, addButtonId, opts) {
    opts = opts || {};
    var input = document.getElementById(inputId);
    if (!input || input.dataset.leagueBound) return;
    input.dataset.leagueBound = '1';
    var listId = datalistId(inputId);
    var dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      input.parentNode.insertBefore(dl, input.nextSibling);
    }
    input.setAttribute('list', listId);
    var leagues = await loadLeagues();
    dl.innerHTML = leagues.map(function(item){ return '<option value="' + safe(item.name) + '"></option>'; }).join('');
    input.addEventListener('change', function(){ syncUrlFields(input, opts, true); });
    input.addEventListener('blur', function(){ syncUrlFields(input, opts, false); });
    [opts.fulltimeInputId, opts.websiteInputId].forEach(function(id){
      var el = id ? document.getElementById(id) : null;
      if (el && !el.dataset.urlValidateBound) {
        el.dataset.urlValidateBound = '1';
        el.addEventListener('input', function(){ validateLeagueUrls(opts); });
        el.addEventListener('blur', function(){ validateLeagueUrls(opts); });
      }
    });
    if (addButtonId) {
      var btn = document.getElementById(addButtonId);
      if (btn && !btn.dataset.leagueBound) {
        btn.dataset.leagueBound = '1';
        btn.addEventListener('click', async function(){
          var name = norm(input.value);
          if (!name) return;
          if (!validateLeagueUrls(opts)) return;
          btn.disabled = true;
          try {
            var payload = {
              name: name,
              fulltime_url: opts.fulltimeInputId ? document.getElementById(opts.fulltimeInputId).value.trim() : null,
              team_website_url: opts.websiteInputId ? document.getElementById(opts.websiteInputId).value.trim() : null
            };
            if (typeof api === 'function') {
              var d = await api('POST', '/api/stratex/leagues', payload);
              cache = null;
              leagues = await loadLeagues();
              dl.innerHTML = leagues.map(function(n){ return '<option value="' + safe(n.name) + '"></option>'; }).join('');
              input.value = d.data && d.data.name ? d.data.name : name;
            }
          } catch(e) {
            alert(e.message || 'Could not save league.');
          } finally {
            btn.disabled = false;
          }
        });
      }
    }
  }

  window.loadLeagueOptions = async function(){ return (await loadLeagues()).map(function(x){ return x.name; }); };
  window.loadLeagueRecords = loadLeagues;
  window.findLeagueRecord = findLeague;
  window.bindLeagueInput = bindLeagueInput;
  window.validateLeagueUrls = validateLeagueUrls;
})();

'use strict';
(function(){
  var index = 0;
  var started = false;
  var renderToken = 0;
  var tours = {
    Coach: [
      { route: '/coach/dashboard', selector: '.phone-hub,[data-kind="coach-dashboard"],.kpi-grid', title: 'Dashboard', body: 'Start here for your squad summary and the most common coach actions.', placement: 'bottom' },
      { route: '/coach/my-players', selector: '.coach-squad-mobile,.player-grid,#playersGrid,#playersList,.table-card', title: 'My players', body: 'Review your squad as compact cards and open each profile when you need to update details.', placement: 'top' },
      { route: '/coach/add-player', selector: '.phone-wizard,.table-card,#playerForm', title: 'Add player', body: 'Create a player profile with identity, position, physical profile and attributes.', placement: 'bottom' },
      { route: '/coach/match-facts', selector: '#stepContent,.step-indicator', title: 'Match facts', body: 'Add match evidence so player ratings, value and confidence improve over time.', placement: 'bottom' },
      { route: '/coach/fixtures', selector: '#addFixtureCard,#upcomingList', title: 'Fixtures', body: 'Publish upcoming games so scouts can plan attendance and coaches can link match facts.', placement: 'top' },
      { route: '/coach/video-reels', selector: '.upload-zone,#videoList,.table-card', title: 'Video reels', body: 'Upload file-backed videos and assign them to player profiles.', placement: 'top' },
      { route: '/coach/chat', selector: '.chat-shell,.thread-list', title: 'Chat', body: 'Conversations with scouts appear after a scout adds one of your players to their pipeline.', placement: 'top' }
    ],
    Scout: [
      { route: '/scout/dashboard', selector: '.phone-hub,[data-kind="scout-dashboard"],.dashboard-two-col', title: 'Scout dashboard', body: 'Use this hub to jump into search, pipeline, predictions and comparisons.', placement: 'bottom' },
      { route: '/scout/player-search', selector: '.filter-card,.filter-bar,.player-grid,#playersGrid,.table-card', title: 'Player database', body: 'Search and filter players by position, age, location, rating and compatibility.', placement: 'bottom' },
      { route: '/scout/pipeline', selector: '.phone-pipeline-cards,#pipelineContent,.sl-table', title: 'Pipeline', body: 'Track interest, move players through stages and open coach conversations.', placement: 'top' },
      { route: '/scout/compare-players', selector: '.comparison-section,.compare-section,.table-card', title: 'Compare players', body: 'Compare two players using stacked sections and recommendation evidence.', placement: 'top' },
      { route: '/scout/predictions', selector: '#predictionHistory,.prediction-card,.table-card', title: 'Predictions', body: 'Run development, ROI, scenario and position-fit predictions, then revisit the history.', placement: 'top' },
      { route: '/scout/setup', selector: '.table-card,.phone-wizard,.setup-card', title: 'Scout setup', body: 'Your weaknesses, role expectations and preferences drive compatibility scoring.', placement: 'bottom' },
      { route: '/scout/chat', selector: '.chat-shell,.thread-list', title: 'Chat', body: 'Message coaches from active pipeline relationships.', placement: 'top' }
    ],
    Stratex: [
      { route: '/stratex/dashboard', selector: '.phone-hub,[data-kind="stratex-dashboard"],.kpi-grid', title: 'Admin dashboard', body: 'Use this page as the platform control centre.', placement: 'bottom' },
      { route: '/stratex/registrations', selector: '.table-card,#registrationsTable,#registrationList', title: 'Registration review', body: 'Review coach and scout registrations before approval emails are sent.', placement: 'bottom' },
      { route: '/stratex/users', selector: '.table-card,#usersTable,#adminList', title: 'User management', body: 'Manage users, admins, super-user access and reporting lines.', placement: 'top' },
      { route: '/stratex/org', selector: '.org-board,.org-tree', title: 'Org view', body: 'See Stratex reporting lines and manage admin permissions.', placement: 'top' },
      { route: '/stratex/hiring', selector: '.hiring-grid,#jobList,.recipient-box', title: 'Hiring', body: 'Create jobs, publish careers pages and choose application alert recipients.', placement: 'top' },
      { route: '/stratex/showcase-events', selector: '#eventsList,.event-card,#createEventBtn', title: 'Showcase events', body: 'Create, confirm, cancel and manage showcase event attendance.', placement: 'top' }
    ],
    Player: [
      { route: '/player/profile', selector: '.phone-player-options,#profileContent,.profile-card', title: 'Player profile', body: 'View your player evidence, stats, fixtures and profile status.', placement: 'bottom' },
      { route: '/player/video-reels', selector: '.player-upload-card,#videoContent,.video-grid', title: 'Video reels', body: 'Upload your own clips for your profile and review videos added by coaches.', placement: 'top' },
      { route: '/player/notifications', selector: '.table-card,#notifList,.notification-card', title: 'Notifications', body: 'See important profile, interest and platform updates.', placement: 'top' },
      { route: '/player/settings', selector: '.settings-shell,.table-card', title: 'Settings', body: 'Manage account preferences and support options.', placement: 'top' }
    ]
  };

  function role(){ return (window.Auth && Auth.type) || localStorage.getItem('sl_type'); }
  function tourScope(){
    var mode = (typeof isDemoMode === 'function' && isDemoMode()) ? 'demo' : 'real';
    var userId = (window.Auth && Auth.user && Auth.user.id) || localStorage.getItem('sl_user_id') || 'anon';
    return role() + '_' + mode + '_' + userId;
  }
  function key(name){ return 'sl_tour_' + name + '_' + tourScope(); }
  function legacyKey(name){ return 'sl_tour_' + name + '_' + role(); }
  function seenKey(){ return key('seen'); }
  function esc(value){ return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function cleanRoute(href){ return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href; }
  function shouldRun(){
    var r = role();
    if (!tours[r]) return false;
    var qs = new URLSearchParams(window.location.search);
    if (sessionStorage.getItem('sl_force_tour_' + r) === '1') return true;
    return qs.get('tour') === '1';
  }
  async function saveTourStatus(status){
    var r = role();
    if (typeof api !== 'function' || !tours[r]) return;
    var payload = { status: status, stepIndex: index, checkpoints: (tours[r] || []).map(function(x){ return x.title; }) };
    try { await api('POST','/api/onboarding/tour', payload); } catch(e) {}
  }
  function currentPath(){ return window.location.pathname.replace(/\/index\.html$/,'').replace(/\/$/,'') || '/'; }
  function goToStepRoute(step){
    if (!step || !step.route) return false;
    var target = step.route.replace(/\/$/,'');
    if (currentPath() === target) return false;
    sessionStorage.setItem(key('index'), String(index));
    sessionStorage.setItem('sl_force_tour_' + role(), '1');
    window.location.href = cleanRoute(target);
    return true;
  }
  function waitForSelector(selector, timeoutMs){
    timeoutMs = timeoutMs || 4000;
    var start = Date.now();
    return new Promise(function(resolve){
      function tick(){
        var el = selector ? document.querySelector(selector) : null;
        if (el) return resolve(el);
        if (Date.now() - start > timeoutMs) return resolve(null);
        setTimeout(tick, 120);
      }
      tick();
    });
  }
  function removeHighlight(){
    var h = document.getElementById('slTourHighlight');
    if (h) h.remove();
    document.querySelectorAll('.sl-tour-target').forEach(function(el){ el.classList.remove('sl-tour-target'); });
  }
  function highlight(el){
    removeHighlight();
    if (!el) return;
    el.classList.add('sl-tour-target');
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setTimeout(function(){
      var rect = el.getBoundingClientRect();
      var h = document.createElement('div');
      h.id = 'slTourHighlight';
      h.style.cssText = 'position:fixed;z-index:2398;pointer-events:none;border:3px solid #0f9f75;border-radius:18px;box-shadow:0 0 0 9999px rgba(15,23,42,.36),0 0 0 8px rgba(15,159,117,.14);transition:all .18s ease';
      h.style.left = Math.max(8, rect.left - 6) + 'px';
      h.style.top = Math.max(66, rect.top - 6) + 'px';
      h.style.width = Math.min(window.innerWidth - 16, rect.width + 12) + 'px';
      h.style.height = Math.min(window.innerHeight - 84, rect.height + 12) + 'px';
      document.body.appendChild(h);
    }, 260);
  }
  function ensureStyles(){
    if (document.getElementById('slProductTourStyles')) return;
    var s = document.createElement('style');
    s.id = 'slProductTourStyles';
    s.textContent = '#slProductTour{position:fixed;inset:0;z-index:2400;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;padding:18px}#slProductTour .tour-card{pointer-events:auto;width:min(560px,100%);background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:20px;padding:18px;box-shadow:0 24px 80px rgba(15,23,42,.24)}#slProductTour .tour-step{color:#047857;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:.04em}#slProductTour h3{margin:8px 0;color:#111827;font-size:18px}#slProductTour p{color:#64748b;line-height:1.55;margin:0 0 16px;font-size:14px}#slProductTour .tour-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (min-width:951px){#slProductTour{align-items:flex-start;justify-content:flex-end;padding:86px 28px 28px}}';
    document.head.appendChild(s);
  }
  async function render(){
    var r = role(), steps = tours[r];
    if (!steps) return;
    var saved = parseInt(sessionStorage.getItem(key('index')) || '0', 10);
    if (!Number.isNaN(saved) && saved >= 0 && saved < steps.length) index = saved;
    var step = steps[index];
    if (!step || !step.route) {
      sessionStorage.removeItem(key('index'));
      sessionStorage.removeItem('sl_force_tour_' + r);
      index = 0;
      step = steps[index];
      if (!step || !step.route) return;
    }
    if (goToStepRoute(step)) return;
    var token = ++renderToken;
    ensureStyles();
    var el = await waitForSelector(step.selector);
    if (token !== renderToken) return;
    if (!el) console.warn('[ScoutLink tour] Missing selector:', step.selector, step.route);
    highlight(el);
    var existing = document.getElementById('slProductTour');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'slProductTour';
      document.body.appendChild(existing);
    }
    if (!started) { started = true; saveTourStatus('started'); }
    existing.innerHTML = '<div class="tour-card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span class="tour-step">Step '+(index+1)+' of '+steps.length+'</span><button class="btn btn-sm btn-ghost" onclick="window.finishProductTour(true)">Skip</button></div><h3>'+esc(step.title)+'</h3><p>'+esc(step.body)+(el?'':' This widget could not be highlighted on this page, but you can continue the tour.')+'</p><div class="tour-actions"><button class="btn btn-outline" onclick="window.prevProductTour()" '+(index===0?'disabled':'')+'>Back</button><button class="btn btn-primary" onclick="window.nextProductTour()">'+(index===steps.length-1?'Finish':'Next')+'</button></div></div>';
  }
  window.prevProductTour = function(){ index = Math.max(0, index - 1); sessionStorage.setItem(key('index'), String(index)); render(); };
  window.nextProductTour = function(){ var r = role(), steps = tours[r] || []; if (index >= steps.length - 1) return window.finishProductTour(false); index++; sessionStorage.setItem(key('index'), String(index)); render(); };
  window.finishProductTour = async function(skipped){
    var r = role();
    sessionStorage.removeItem('sl_force_tour_' + r);
    sessionStorage.removeItem(key('index'));
    var status = skipped ? 'dismissed' : 'completed';
    if (skipped) sessionStorage.setItem(key('dismissed'), '1');
    localStorage.setItem(seenKey(), status);
    removeHighlight();
    var el = document.getElementById('slProductTour');
    if (el) el.remove();
    await saveTourStatus(status);
  };
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ if (shouldRun()) render(); }, 350); });
  window.addEventListener('resize', function(){ if (document.getElementById('slProductTour')) render(); });
})();

'use strict';
(function () {
  var CANONICAL_API = 'https://scoutlink-api.vercel.app';

  function shouldUseSameOriginApi() {
    var host = String(window.location.hostname || '').toLowerCase();
    return host === 'scoutlink.app' ||
      host === 'www.scoutlink.app' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.app.github.dev');
  }

  var API = (function () {
    /*
     * The experience selector sits immediately after login and is responsible
     * for loading /api/auth/experiences and switching between real/demo
     * workspaces. Keep those requests on the ScoutLink web origin whenever its
     * Vercel /api proxy is available.
     *
     * Persist the web origin as sl_api_url too. Shared signed-in ScoutLink pages
     * still read that key, so this keeps Coach/Scout requests on the same
     * proxy after the user leaves the selector.
     */
    if (shouldUseSameOriginApi()) {
      try { localStorage.setItem('sl_api_url', window.location.origin); } catch (_) {}
      return '';
    }

    try { return localStorage.getItem('sl_api_url') || CANONICAL_API; }
    catch (_) { return CANONICAL_API; }
  }()).replace(/\/+$/, '');

  var list = [];
  var busy = false;
  var token = '';

  function byId(id){return document.getElementById(id);}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function restoreAdminSessionForSelector() {
    var demoMode = localStorage.getItem('sl_demo_mode') === '1';
    if(!demoMode) return false;

    var adminToken = localStorage.getItem('sl_admin_token') || '';
    var rawUser = localStorage.getItem('sl_admin_user') || '';
    var adminType = localStorage.getItem('sl_admin_type') || 'Stratex';
    if(!adminToken || !rawUser || adminType !== 'Stratex') return false;

    try {
      var user = JSON.parse(rawUser);
      localStorage.setItem('sl_token',adminToken);
      localStorage.setItem('sl_type','Stratex');
      localStorage.setItem('sl_user',rawUser);
      localStorage.setItem('sl_user_id',user&&user.id?user.id:'');
      localStorage.setItem('sl_user_email',user&&user.email?user.email:'');
      localStorage.removeItem('sl_demo_mode');
      localStorage.setItem('sl_experience_switcher','1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function storeAdminSessionIfNeeded() {
    var currentType = localStorage.getItem('sl_type') || '';
    var currentDemoMode = localStorage.getItem('sl_demo_mode') === '1';
    if(currentType !== 'Stratex' || currentDemoMode) return;

    var currentToken = localStorage.getItem('sl_token') || token || '';
    var rawUser = localStorage.getItem('sl_user') || '';
    if(!currentToken || !rawUser) return;

    try {
      JSON.parse(rawUser);
      localStorage.setItem('sl_admin_token',currentToken);
      localStorage.setItem('sl_admin_user',rawUser);
      localStorage.setItem('sl_admin_type','Stratex');
    } catch (_) {}
  }

  function resetInteractivity() {
    busy=false;
    document.querySelectorAll('.experience-choice[data-enter]').forEach(function(row){
      row.removeAttribute('aria-disabled');
    });
  }

  restoreAdminSessionForSelector();
  token = localStorage.getItem('sl_token') || '';

  function clearSession() {
    [
      'sl_token','sl_type','sl_user','sl_user_id','sl_user_email','sl_demo_mode',
      'sl_admin_token','sl_admin_user','sl_admin_type','sl_experience_switcher'
    ].forEach(function (key) { localStorage.removeItem(key); });
    ['sl_public_demo','sl_public_demo_role','sl_public_demo_state','sl_public_demo_seed_players','sl_public_demo_started_at']
      .forEach(function (key) { sessionStorage.removeItem(key); });
  }

  function homeFor(type) {
    return {Stratex:'/stratex/dashboard',Coach:'/coach/dashboard',Scout:'/scout/dashboard'}[type] || '/login';
  }

  async function api(path, options) {
    options=options||{};
    options.headers=Object.assign({},options.headers||{},token?{Authorization:'Bearer '+token}:{});
    options.credentials='include';

    var response;
    try {
      response=await fetch(API+path,options);
    } catch (error) {
      console.error('[ScoutLink experiences] API request failed', error);
      throw new Error('ScoutLink could not load your approved workspaces. Please refresh and try again.');
    }

    var json=await response.json().catch(function(){return {};});
    if(!response.ok) throw new Error(json.error||'Could not load this workspace.');
    return json;
  }

  function nameFor(exp) {
    if(exp.admin||exp.accountType==='Stratex') return 'Stratex operations';
    if(exp.demo) return exp.accountType+' demo';
    return exp.label||exp.accountType+' workspace';
  }

  function descriptionFor(exp) {
    return exp.description ||
      (exp.accountType==='Coach'?'Squads, fixtures, Match Facts and video':
      exp.accountType==='Scout'?'Player search, comparison and pipeline':
      'Internal administration');
  }

  function shortType(exp) {
    return exp.accountType==='Stratex'?'SA':String(exp.accountType||'SL').toUpperCase().slice(0,6);
  }

  function userSelect(exp,index) {
    if(!exp.demo||!Array.isArray(exp.demoUsers)||!exp.demoUsers.length) return '';
    return '<select data-demo-user="'+index+'" aria-label="Demo identity">' +
      exp.demoUsers.map(function(user){
        return '<option value="'+esc(user.id)+'">'+esc(user.label||user.email||'Demo user')+
          (user.teamName?' · '+esc(user.teamName):'')+'</option>';
      }).join('')+'</select>';
  }

  function render() {
    byId('experienceLoading').hidden=true;
    var root=byId('experienceList');
    if(!list.length){
      byId('experienceRoot').querySelector('.door-h').textContent='Checking your access.';
      byId('experienceIntro').textContent='This account has no approved workspace.';
      root.innerHTML='<div class="dmsg err"><b>No workspace available.</b> Contact Stratex support if you expected access.</div>'+
        '<div class="door-links" style="justify-content:flex-start"><a href="/register/coach">Register as a coach</a><span>·</span><a href="https://www.stratexanalytics.co.uk/contact">Contact support</a></div>';
      return;
    }
    byId('experienceRoot').querySelector('.door-h').textContent='Where to?';
    byId('experienceIntro').textContent='Approved workspaces for this account.';
    root.innerHTML=list.map(function(exp,index){
      return '<article class="experience-choice roleline'+(exp.current&&!exp.demo?' on':'')+'" data-enter="'+index+'" role="button" tabindex="0" aria-label="Open '+esc(nameFor(exp))+'">'+
        '<span class="k">'+esc(shortType(exp))+'</span><div style="min-width:0;flex:1"><h4>'+esc(nameFor(exp))+'</h4>'+
        '<p>'+esc(descriptionFor(exp))+'</p>'+userSelect(exp,index)+'</div>'+
        '<span class="go" aria-hidden="true">→</span></article>';
    }).join('');
    bindRows();
    resetInteractivity();
  }

  function eventStartedInsideDropdown(event) {
    var target=event.target;
    return !!(target&&target.closest&&target.closest('select'));
  }

  function bindRows() {
    document.querySelectorAll('.experience-choice[data-enter]').forEach(function(row){
      row.addEventListener('click',function(event){
        if(eventStartedInsideDropdown(event)) return;
        enter(Number(row.getAttribute('data-enter')));
      });
      row.addEventListener('keydown',function(event){
        if(eventStartedInsideDropdown(event)) return;
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          enter(Number(row.getAttribute('data-enter')));
        }
      });
    });
  }

  function store(data) {
    localStorage.setItem('sl_token',data.token||'');
    localStorage.setItem('sl_type',data.accountType||'');
    localStorage.setItem('sl_user',JSON.stringify(data.user||{}));
    localStorage.setItem('sl_user_id',data.user&&data.user.id?data.user.id:'');
    localStorage.setItem('sl_user_email',data.user&&data.user.email?data.user.email:'');
    localStorage.setItem('sl_experience_switcher','1');
    if(data.demoMode) localStorage.setItem('sl_demo_mode','1'); else localStorage.removeItem('sl_demo_mode');
  }

  async function enter(index) {
    if(busy||!list[index]) return;
    busy=true;
    var exp=list[index];
    document.querySelectorAll('.experience-choice[data-enter]').forEach(function(row){row.setAttribute('aria-disabled','true');});
    try{
      storeAdminSessionIfNeeded();

      if(exp.current&&!exp.demo){
        location.href=homeFor(exp.accountType);
        return;
      }
      var select=document.querySelector('[data-demo-user="'+index+'"]');
      var body={accountType:exp.accountType,demo:!!exp.demo};
      if(select&&select.value) body.demoUserId=select.value;
      var data=await api('/api/auth/switch-experience',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
      });
      store(data);
      location.href=homeFor(data.accountType||exp.accountType);
    }catch(error){
      var msg=byId('experienceError');msg.textContent=error.message;msg.classList.add('show');
      resetInteractivity();
    }
  }

  async function load() {
    restoreAdminSessionForSelector();
    token=localStorage.getItem('sl_token')||'';
    if(!token){location.replace('/login');return;}
    try{
      var data=await api('/api/auth/experiences');
      list=(Array.isArray(data.data)?data.data:[]).filter(function(exp){
        return exp&&exp.accountType!=='Player';
      });
      var real=list.filter(function(exp){return !exp.demo;});
      if(list.length===1&&real.length===1){
        location.replace(homeFor(real[0].accountType));
        return;
      }
      render();
    }catch(error){
      if(/token|auth|unauthor/i.test(error.message)){clearSession();location.replace('/login');return;}
      byId('experienceLoading').hidden=true;
      var msg=byId('experienceError');msg.textContent=error.message;msg.classList.add('show');
      resetInteractivity();
    }
  }

  window.addEventListener('pageshow',function(){
    if(restoreAdminSessionForSelector()){
      token=localStorage.getItem('sl_token')||token;
    }
    resetInteractivity();
  });

  byId('experienceSignOut').addEventListener('click',function(){clearSession();location.href='/login?logout=1';});
  load();
}());

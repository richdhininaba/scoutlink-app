'use strict';
(function(){
  var API=(function(){try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return'https://scoutlink-api.vercel.app';}})().replace(/\/+$/,'');
  var token='',accountType='',user=null,pendingRoles=null;
  var params=new URLSearchParams(location.search);

  function byId(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(id,text){var el=byId(id);if(!el)return;el.textContent=text||'';el.classList.toggle('show',!!text);}
  function clearMsg(){msg('activationError','');msg('activationOk','');}
  function busy(id,on){var b=byId(id);if(!b)return;b.disabled=!!on;b.classList.toggle('busy',!!on);}
  function show(name){document.querySelectorAll('[data-activation-step]').forEach(function(s){s.classList.toggle('active',s.getAttribute('data-activation-step')===name);});clearMsg();window.scrollTo(0,0);}

  async function post(path,body,bearer){
    var headers={'Content-Type':'application/json'};if(bearer)headers.Authorization='Bearer '+bearer;
    var r=await fetch(API+path,{method:'POST',headers:headers,credentials:'include',body:JSON.stringify(body||{})});
    var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'The request could not be completed.');return d;
  }
  async function get(path,bearer){
    var r=await fetch(API+path,{headers:bearer?{Authorization:'Bearer '+bearer}:{},credentials:'include'});
    var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'The request could not be completed.');return d;
  }

  function store(data){
    token=data.token||token;accountType=data.accountType||accountType;user=data.user||user;
    localStorage.setItem('sl_token',token);localStorage.setItem('sl_type',accountType);
    localStorage.setItem('sl_user',JSON.stringify(user||{}));
    if(user&&user.id)localStorage.setItem('sl_user_id',user.id);
    if(user&&user.email)localStorage.setItem('sl_user_email',user.email);
  }

  function verifyWithRole(role){
    return post('/api/auth/login',{email:byId('activationEmail').value.trim(),loginCode:byId('activationCode').value.trim().toUpperCase(),accountType:role});
  }

  function renderRoles(roles){
    pendingRoles=roles||[];
    var root=byId('activationRoleOptions');root.innerHTML='';root.hidden=false;
    pendingRoles.forEach(function(role,index){
      var button=document.createElement('button');button.type='button';button.className='roleline'+(index===0?' on':'');
      button.innerHTML='<span class="k">'+esc(role.accountType||'SL')+'</span><div><h4>'+esc(role.label||role.accountType||'Workspace')+'</h4><p>Activate this approved workspace</p></div><span class="go">→</span>';
      button.addEventListener('click',async function(){
        clearMsg();
        try{var data=await verifyWithRole(role.accountType);store(data);show('password');}
        catch(error){msg('activationError',error.message);}
      });root.appendChild(button);
    });
  }

  byId('activationVerifyForm').addEventListener('submit',async function(e){
    e.preventDefault();clearMsg();
    var email=byId('activationEmail').value.trim(),code=byId('activationCode').value.trim().toUpperCase();
    if(!email||!code){msg('activationError','Enter the email and six-character code.');return;}
    busy('activationVerifyBtn',true);
    try{
      var data=await post('/api/auth/login',{email:email,loginCode:code});
      if(data.requiresRoleSelection){renderRoles(data.roles);msg('activationOk','Choose the approved workspace you are activating.');return;}
      store(data);show('password');
    }catch(error){msg('activationError',error.message);}
    finally{busy('activationVerifyBtn',false);}
  });

  byId('activationPasswordForm').addEventListener('submit',async function(e){
    e.preventDefault();clearMsg();
    var p=byId('activationPassword').value,c=byId('activationConfirm').value;
    if(p.length<8){msg('activationError','Password must be at least eight characters.');return;}
    if(p!==c){msg('activationError','Passwords do not match.');return;}
    busy('activationPasswordBtn',true);
    try{
      await post('/api/auth/complete-registration',{newPassword:p,accountType:accountType},token);
      renderFinish();
    }catch(error){msg('activationError',error.message);}
    finally{busy('activationPasswordBtn',false);}
  });

  function renderFinish(){
    show('finish');
    var body=byId('finishBody');
    if(accountType==='Coach'){
      byId('finishHeading').textContent='Your coach workspace is ready.';
      byId('finishCopy').textContent='Add the first player now, or enter the workspace and finish later.';
      body.innerHTML='<div class="door-links" style="margin-top:20px"><a class="sl-btn chalk" href="/coach/add-player">Add players now</a><a class="sl-btn ghostw" href="/coach/dashboard">Skip for now</a></div>';
      body.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){renderDone(accountType,a.getAttribute('href'));});});
      return;
    }
    if(accountType==='Scout'){
      byId('finishHeading').textContent='Set the first recruitment context.';
      byId('finishCopy').textContent='Choose up to three weaknesses. You can refine the full brief later in Scout Setup.';
      var weaknesses=['poor_set_pieces','weak_left_flank','weak_right_flank','high_defensive_line','pace_exploitable','poor_second_ball','poor_aerial','weak_pressing','slow_build_up','poor_transitions','direct_play_only','poor_wide_play'];
      body.innerHTML='<div class="activation-options" id="weaknessOptions">'+weaknesses.map(function(w){return'<button class="activation-option" type="button" data-weakness="'+esc(w)+'">'+esc(w.replace(/_/g,' '))+'</button>';}).join('')+'</div><button class="sl-btn chalk full" id="saveScoutPrefs" type="button" style="margin-top:16px">Save and open ScoutLink</button>';
      body.querySelectorAll('[data-weakness]').forEach(function(b){b.addEventListener('click',function(){var chosen=body.querySelectorAll('[data-weakness].selected');if(!b.classList.contains('selected')&&chosen.length>=3)return;b.classList.toggle('selected');});});
      byId('saveScoutPrefs').addEventListener('click',saveScoutPrefs);return;
    }
    if(accountType==='Player'){
      byId('finishHeading').textContent='Create your player avatar.';
      byId('finishCopy').textContent='Choose simple avatar details for the player-facing profile.';
      body.innerHTML='<div class="sl-field"><label class="sl-lab">Skin tone</label><select class="sl-in" id="avatarSkin"><option>light</option><option>medium</option><option>dark</option><option>tan</option></select></div><div class="sl-field"><label class="sl-lab">Hair style</label><select class="sl-in" id="avatarHair"><option>short</option><option>curly</option><option>cap</option><option>bald</option></select></div><div class="sl-field"><label class="sl-lab">Kit colour</label><select class="sl-in" id="avatarKit"><option>blue</option><option>red</option><option>black</option><option>green</option></select></div><button class="sl-btn chalk full" id="saveAvatar" type="button">Save avatar and open dashboard</button>';
      byId('saveAvatar').addEventListener('click',saveAvatar);return;
    }
    renderDone(accountType,homeFor(accountType));
  }

  async function saveScoutPrefs(){
    var values=Array.prototype.map.call(document.querySelectorAll('[data-weakness].selected'),function(b){return b.getAttribute('data-weakness');});
    var button=byId('saveScoutPrefs');button.disabled=true;
    try{
      await post('/api/onboarding/scout-wizard',{
        teamWeaknesses:values,
        preferredPositions:[],
        ageGroups:[],
        scoutCountry:'',
        scoutRegion:'',
        alertPreference:'weekly_digest',
        setupSummary:'Initial Scout activation preferences'
      },token);
      renderDone('Scout','/scout/dashboard');
    } catch(error){msg('activationError',error.message);button.disabled=false;}
  }

  async function saveAvatar(){
    var id=user&&user.id;if(!id){msg('activationError','Player account details are unavailable.');return;}
    var button=byId('saveAvatar');button.disabled=true;
    try{
      var r=await fetch(API+'/api/players/'+encodeURIComponent(id)+'/avatar',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({avatar_config:{skin:byId('avatarSkin').value,hair:byId('avatarHair').value,kit:byId('avatarKit').value}})});
      var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'Avatar could not be saved.');
      renderDone('Player','/player/dashboard');
    }catch(error){msg('activationError',error.message);button.disabled=false;}
  }

  function homeFor(type){return{Coach:'/coach/dashboard',Scout:'/scout/dashboard',Player:'/player/dashboard',Stratex:'/stratex/dashboard'}[type]||'/login';}

  function renderDone(type,href){
    show('done');href=href||homeFor(type);
    var first=user&&(user.firstName||user.first_name)||'';
    byId('doneHeading').textContent=first?'Welcome in, '+first+'.':'Welcome in.';
    byId('doneCopy').textContent='Your '+String(type||'ScoutLink').toLowerCase()+' account is active.';
    byId('doneTicket').innerHTML='<div><small>Workspace</small><b>'+esc(type||'ScoutLink')+'</b></div><div><small>Status</small><b>Active</b></div>'+
      '<div><small>Email</small><b>'+esc(user&&user.email||byId('activationEmail').value)+'</b></div><div><small>Next</small><b>Open workspace</b></div>';
    byId('doneAction').href=href;
  }

  document.querySelectorAll('[data-toggle-password]').forEach(function(button){button.addEventListener('click',function(){var input=byId(button.getAttribute('data-toggle-password'));if(!input)return;var hidden=input.type==='password';input.type=hidden?'text':'password';button.textContent=hidden?'Hide':'Show';});});
  byId('activationCode').addEventListener('input',function(){this.value=this.value.toUpperCase();});

  if(params.get('email'))byId('activationEmail').value=params.get('email');
  if(params.get('code'))byId('activationCode').value=params.get('code').toUpperCase();
  if(params.get('token')){
    token=params.get('token');accountType=params.get('type')||localStorage.getItem('sl_type')||'';
    try{user=JSON.parse(localStorage.getItem('sl_user')||'null');}catch(_){user=null;}
    if(token&&accountType){localStorage.setItem('sl_token',token);localStorage.setItem('sl_type',accountType);show('password');}
  }
}());

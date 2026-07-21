'use strict';
(function(){
  var API=(function(){try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return'https://scoutlink-api.vercel.app';}})();
  var RICHDHIN='richdhin@stratexanalytics.co.uk';
  var ROUTES=[
    ['dashboard','/admin','Dashboard','Overview','DB'],
    ['registrations','/admin/registrations','Registrations','Operations','RG'],
    ['contact','/admin/contact-forms','Contact Forms','Operations','CF'],
    ['crm','/admin/crm','CRM','Operations','CR'],
    ['activity','/admin/website-activity','Website Activity','Analytics','WA'],
    ['blog','/admin/blog','Blog / Learning Centre','Content','BL'],
    ['leadership','/admin/leadership','Leadership','Content','LD'],
    ['org','/admin/org-charts','Org Charts','People','OC'],
    ['add-user','/admin/users/add','Add Stratex User','People','AU'],
    ['permissions','/admin/permissions','Permissions','People','PM'],
    ['profile','/admin/my-profile','My Profile','People','MP'],
    ['contracts','/admin/contracts-pay','Contracts & Pay','People','CP'],
    ['hiring','/admin/hiring','Hiring','People','HR'],
    ['trust','/admin/trust-concerns','Trust & Concerns','Trust','TC'],
    ['showcase','/admin/showcase-event','Showcase Event','Events','SE'],
    ['awards','/admin/award-ceremonies','Award Ceremonies','Events','AC'],
    ['settings','/admin/settings','Settings','Company','ST']
  ];
  var ROUTE_BY_ID={},ID_BY_PATH={};
  ROUTES.forEach(function(r){ROUTE_BY_ID[r[0]]=r;ID_BY_PATH[r[1]]=r[0];});
  ID_BY_PATH['/admin/login']='login';
  ID_BY_PATH['/admin/admin-users']='add-user';
  ID_BY_PATH['/admin/users']='add-user';
  var state={route:'dashboard',data:{},selected:{},modalReturn:null};
  function auth(){try{return typeof Auth!=='undefined'?Auth:null;}catch(_){return null;}}
  function user(){var a=auth();return a&&a.user?a.user:{};}
  function token(){var a=auth();if(a&&a.token)return a.token;try{return localStorage.getItem('sl_token')||'';}catch(_){return'';}}
  function accountType(){var a=auth();return a&&a.type?a.type:(localStorage.getItem('sl_type')||'');}
  function loggedIn(){var a=auth();return !!(a&&a.isLoggedIn&&a.isLoggedIn()&&accountType()==='Stratex');}
  function userEmail(){return String(user().email||'').trim().toLowerCase();}
  function isRichdhin(){return userEmail()===RICHDHIN;}
  function fullName(row){row=row||{};return [row.first_name||row.firstName,row.last_name||row.lastName].filter(Boolean).join(' ')||row.full_name||row.fullName||row.name||row.email||'Stratex user';}
  function initials(row){return fullName(row||user()).split(/\s+/).map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase()||'SA';}
  function roleLabel(row){row=row||user();if(String(row.email||'').toLowerCase()===RICHDHIN)return'Founder & Super Admin';var raw=String(row.job_title||row.jobTitle||row.admin_role||row.adminRole||row.role||'Employee');return /super\s*admin|founder/i.test(raw)?'Management':raw;}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function cleanPath(){return (window.location.pathname||'/admin').replace(/\/+$/,'')||'/admin';}
  function routeFromPath(){return ID_BY_PATH[cleanPath()]||'dashboard';}
  function route(id){return ROUTE_BY_ID[id]||ROUTE_BY_ID.dashboard;}
  function date(v,withTime){if(!v)return'—';var d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleString('en-GB',withTime?{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short',year:'numeric'});}
  function num(v){return Number(v||0).toLocaleString('en-GB');}
  function slug(v){return String(v||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  async function api(method,path,body,isForm){
    var opts={method:method,headers:{Authorization:'Bearer '+token()},credentials:'include'};
    if(body!==undefined&&body!==null){if(isForm){opts.body=body;}else{opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}}
    var res=await fetch(API+path,opts);var data=await res.json().catch(function(){return{};});
    if(!res.ok)throw new Error(data.error||data.message||'The request could not be completed.');
    return data;
  }
  async function apiBlob(path){
    var res=await fetch(API+path,{headers:{Authorization:'Bearer '+token()},credentials:'include'});
    if(!res.ok){var data=await res.json().catch(function(){return{};});throw new Error(data.error||'Download failed.');}
    return res.blob();
  }
  function setSession(data){var a=auth();if(!data||!data.token||!data.user||(data.accountType||'Stratex')!=='Stratex')throw new Error('The Stratex sign-in response was incomplete.');if(a&&a.set)a.set(data.token,data.user,'Stratex');else{localStorage.setItem('sl_token',data.token);localStorage.setItem('sl_user',JSON.stringify(data.user));localStorage.setItem('sl_type','Stratex');}}
  function clearSession(){var a=auth();if(a&&a.clear)a.clear();['sl_token','sl_user','sl_type','sl_user_id','sl_user_email'].forEach(function(k){localStorage.removeItem(k);});}
  function btn(label,cls,attrs){attrs=attrs||'';var type=/\btype=/.test(attrs)?'':'type="button" ';return'<button class="stxv4-btn '+(cls||'')+'" '+type+attrs+'>'+esc(label)+'</button>';}
  function status(text,color){return'<span class="stxv4-status '+(color||'grey')+'">'+esc(text||'—')+'</span>';}
  function statusColor(value){var s=String(value||'').toLowerCase();if(/active|approved|accepted|published|live|confirmed|completed|resolved|public/.test(s))return'green';if(/pending|review|submitted|scheduled|contacted|planning/.test(s))return'gold';if(/declined|closed|cancelled|urgent|high|inactive|withdrawn|not a fit/.test(s))return'red';if(/management|super|private/.test(s))return'purple';return'blue';}
  function metric(label,value,note,color,id){return'<div class="stxv4-metric '+(color||'')+'"><small>'+esc(label)+'</small><b'+(id?' id="'+esc(id)+'"':'')+'>'+esc(value)+'</b><span>'+esc(note)+'</span></div>';}
  function pageHead(title,copy,actions){return'<div class="stxv4-pagehead"><div><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p></div><div class="stxv4-pageactions">'+(actions||'')+'</div></div>';}
  function cardHead(title,side){return'<div class="stxv4-cardhead"><h3>'+esc(title)+'</h3><span>'+(side||'')+'</span></div>';}
  function note(color,title,copy){return'<div class="stxv4-note '+(color||'')+'"><b>'+esc(title)+'</b><br>'+esc(copy)+'</div>';}
  function loading(){return'<div class="stxv4-empty"><div class="stxv4-spinner" aria-label="Loading"></div></div>';}
  function empty(copy){return'<div class="stxv4-empty">'+esc(copy||'No records yet.')+'</div>';}
  function field(label,name,type,value,full,help,options){
    var control='';
    if(type==='textarea')control='<textarea class="stxv4-textarea" name="'+esc(name)+'">'+esc(value||'')+'</textarea>';
    else if(type==='select')control='<select class="stxv4-select" name="'+esc(name)+'">'+(options||[]).map(function(o){var pair=Array.isArray(o)?o:[o,o];return'<option value="'+esc(pair[0])+'"'+(String(pair[0])===String(value)?' selected':'')+'>'+esc(pair[1])+'</option>';}).join('')+'</select>';
    else control='<input class="stxv4-input" name="'+esc(name)+'" type="'+esc(type||'text')+'" value="'+esc(value||'')+'">';
    return'<label class="stxv4-field '+(full?'full':'')+'"><span>'+esc(label)+'</span>'+control+(help?'<small>'+esc(help)+'</small>':'')+'</label>';
  }
  function toggle(title,copy,on,key){return'<div class="stxv4-toggle"><div><b>'+esc(title)+'</b><span>'+esc(copy)+'</span></div><button class="stxv4-switch '+(on?'on':'')+'" type="button" data-toggle="'+esc(key||title)+'" aria-pressed="'+(on?'true':'false')+'"><i></i></button></div>';}
  function table(headers,rows){
    if(!rows||!rows.length)return empty('No records yet.');
    return'<div class="stxv4-table-wrap"><table class="stxv4-table"><thead><tr>'+headers.map(function(h){return'<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }
  function detail(title,subtitle,items,actions,extra){
    return'<section class="stxv4-detail" id="stxv4InlineDetail"><div class="stxv4-detailtop"><div><h3>'+esc(title)+'</h3><p>'+esc(subtitle||'')+'</p></div><div class="stxv4-actions">'+(actions||'')+'</div></div><div class="stxv4-detailgrid">'+(items||[]).map(function(x){return'<div class="stxv4-detailitem"><span>'+esc(x[0])+'</span><b>'+(x[2]?String(x[1]||'—'):esc(x[1]||'—'))+'</b></div>';}).join('')+'</div>'+(extra?'<div class="stxv4-detail-extra">'+extra+'</div>':'')+'</section>';
  }
  function showMessage(id,text,ok){var n=document.getElementById(id);if(!n)return;n.textContent=text||'';n.className='stxv4-message show '+(ok?'success':'error');}
  function downloadBlob(blob,name){var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
  function navMarkup(){
    var groups=['Overview','Operations','Analytics','Content','People','Trust','Events','Company'];
    return groups.map(function(g){var items=ROUTES.filter(function(r){return r[3]===g&&(r[0]!=='add-user'||isRichdhin())&&(r[0]!=='permissions'||isRichdhin());});if(!items.length)return'';return'<div class="stxv4-navgroup"><div class="stxv4-navtitle">'+esc(g)+'</div>'+items.map(function(r){return'<button class="stxv4-nav" type="button" data-nav="'+esc(r[0])+'"><em>'+esc(r[4])+'</em>'+esc(r[2])+'</button>';}).join('')+'</div>';}).join('');
  }

  function renderLogin(){
    document.body.className='stxv4-admin';
    var params=new URLSearchParams(window.location.search);var mode=params.get('code')?'code':'password';
    document.body.innerHTML='<main class="stxv4-login"><section class="stxv4-login-story">'+
      '<a class="stxv4-brand" href="/"><div class="stxv4-logo">SA</div><span><b>Stratex Admin</b><span>Internal staff access</span></span></a>'+
      '<h1>Run the company from one secure workspace.</h1>'+
      '<p>Stratex Admin is for authorised internal staff managing company operations, people, content, trust, events and public website activity. ScoutLink product access remains separate.</p>'+
      '<div class="stxv4-storypoints"><div class="stxv4-storypoint"><b>Separate from ScoutLink</b><span>Internal Stratex authentication and permissions do not reuse the ScoutLink login.</span></div>'+
      '<div class="stxv4-storypoint"><b>Role-based access</b><span>Staff see only the records and areas permitted by their role and reporting line.</span></div>'+
      '<div class="stxv4-storypoint"><b>Richdhin as Super Admin</b><span>Richdhin Inaba controls initial access, user permissions and company-wide administration.</span></div></div>'+
      '<footer>Stratex Analytics internal system · Authorised staff only</footer></section>'+
      '<section class="stxv4-loginright"><div class="stxv4-logincard"><small style="color:#08745b;font-weight:900;text-transform:uppercase">Internal staff sign in</small>'+
      '<h2>Sign in to Stratex Admin</h2><p>Use your Stratex Admin password or the one-time login code sent to your approved staff email.</p>'+
      '<div class="stxv4-tabs" role="tablist"><button class="stxv4-tab '+(mode==='password'?'active':'')+'" type="button" data-login-tab="password" aria-selected="'+(mode==='password')+'">Email and password</button>'+
      '<button class="stxv4-tab '+(mode==='code'?'active':'')+'" type="button" data-login-tab="code" aria-selected="'+(mode==='code')+'">Login code</button></div>'+
      '<form id="stxv4LoginForm" data-mode="'+mode+'">'+
      field('Stratex work email','email','email',params.get('email')||'',false,'','')+
      '<label class="stxv4-field" id="stxv4PasswordField" '+(mode==='code'?'hidden':'')+'><span>Password</span><input class="stxv4-input" name="password" type="password" autocomplete="current-password"></label>'+
      '<label class="stxv4-field" id="stxv4CodeField" '+(mode==='password'?'hidden':'')+'><span>One-time login code</span><input class="stxv4-input" name="loginCode" value="'+esc(params.get('code')||'')+'" autocomplete="one-time-code" style="letter-spacing:5px;text-transform:uppercase;font-weight:900"></label>'+
      '<div class="stxv4-message" id="stxv4LoginMessage" role="alert"></div>'+
      '<button class="stxv4-btn primary" id="stxv4LoginSubmit" style="width:100%;margin-top:13px" type="submit">'+(mode==='code'?'Verify code securely':'Sign in securely')+'</button></form>'+
      note('green','First-time access','New users verify the code in their Stratex invitation email, then set their own password before entering the workspace.')+
      '<div style="display:flex;justify-content:space-between;margin-top:13px;font-size:9px"><a href="/forgot-password?type=Stratex">Forgot password</a><a href="/login">ScoutLink login</a></div>'+
      '</div></section></main>';
    bindLogin();
  }
  function bindLogin(){
    var form=document.getElementById('stxv4LoginForm');
    document.querySelectorAll('[data-login-tab]').forEach(function(tab){tab.addEventListener('click',function(){var mode=tab.dataset.loginTab;form.dataset.mode=mode;document.querySelectorAll('[data-login-tab]').forEach(function(x){var on=x===tab;x.classList.toggle('active',on);x.setAttribute('aria-selected',String(on));});document.getElementById('stxv4PasswordField').hidden=mode!=='password';document.getElementById('stxv4CodeField').hidden=mode!=='code';document.getElementById('stxv4LoginSubmit').textContent=mode==='code'?'Verify code securely':'Sign in securely';});});
    form.addEventListener('submit',async function(e){e.preventDefault();var data=new FormData(form);var mode=form.dataset.mode;var email=String(data.get('email')||'').trim().toLowerCase();var password=String(data.get('password')||'');var code=String(data.get('loginCode')||'').trim().toUpperCase();var submit=document.getElementById('stxv4LoginSubmit');if(!email||email.indexOf('@')<1){showMessage('stxv4LoginMessage','Enter a valid approved Stratex email.',false);return;}if(mode==='password'&&!password){showMessage('stxv4LoginMessage','Enter your Stratex Admin password.',false);return;}if(mode==='code'&&!code){showMessage('stxv4LoginMessage','Enter the code from your invitation email.',false);return;}submit.disabled=true;submit.textContent=mode==='code'?'Verifying…':'Signing in…';try{var res=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:mode==='password'?password:undefined,loginCode:mode==='code'?code:undefined,accountType:'Stratex'})});var json=await res.json().catch(function(){return{};});if(!res.ok)throw new Error(json.error||'The Stratex credentials were not accepted.');setSession(json);if(mode==='code'&&json.needsRegistration){renderPasswordSetup();return;}window.location.replace('/admin');}catch(err){showMessage('stxv4LoginMessage',err.message||'Sign-in failed.',false);submit.disabled=false;submit.textContent=mode==='code'?'Verify code securely':'Sign in securely';}});
  }
  function renderPasswordSetup(){
    document.body.innerHTML='<main class="stxv4-login"><section class="stxv4-login-story"><a class="stxv4-brand" href="/"><div class="stxv4-logo">SA</div><span><b>Stratex Admin</b><span>Internal staff setup</span></span></a><h1>Finish your secure Stratex Admin setup.</h1><p>Your invitation code has been confirmed. Create a private password for the internal parent-company workspace.</p></section><section class="stxv4-loginright"><div class="stxv4-logincard"><small style="color:#08745b;font-weight:900;text-transform:uppercase">Password setup</small><h2>Create your Stratex password</h2><p>Use at least eight characters.</p><form id="stxv4SetupForm">'+field('New password','password','password','',false)+field('Confirm new password','confirm','password','',false)+'<div class="stxv4-message" id="stxv4SetupMessage"></div><button class="stxv4-btn primary" type="submit" style="width:100%;margin-top:13px">Create password and continue</button></form></div></section></main>';
    document.getElementById('stxv4SetupForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),p=String(fd.get('password')||''),c=String(fd.get('confirm')||'');if(p.length<8){showMessage('stxv4SetupMessage','Password must contain at least eight characters.',false);return;}if(p!==c){showMessage('stxv4SetupMessage','The passwords do not match.',false);return;}try{await api('POST','/api/auth/complete-registration',{newPassword:p,accountType:'Stratex'});window.location.replace('/admin');}catch(err){showMessage('stxv4SetupMessage',err.message,false);}});
  }
  function renderShell(){
    document.body.className='stxv4-admin';
    document.body.innerHTML='<div class="stxv4-shell">'+
      '<aside class="stxv4-sidebar" id="stxv4Sidebar"><a class="stxv4-brand" href="/admin"><div class="stxv4-logo">SA</div><span><b>Stratex Admin</b><span>Internal company operations</span></span></a>'+
      navMarkup()+'<div class="stxv4-userbox"><div class="stxv4-avatar">'+esc(initials())+'</div><div><b>'+esc(fullName(user()))+'</b><span>'+esc(roleLabel(user()))+'</span></div></div></aside>'+
      '<main class="stxv4-main"><header class="stxv4-top"><div style="display:flex;gap:10px;align-items:center"><button class="stxv4-btn stxv4-mobile-menu" id="stxv4Menu" aria-label="Open admin menu" aria-expanded="false">☰</button><div><h1 id="stxv4TopTitle">Dashboard</h1><p id="stxv4TopRoute">/admin · Stratex internal administration</p></div></div><div class="stxv4-top-actions">'+btn('Search','','id="stxv4Search"')+btn('My Profile','','data-nav="profile"')+btn('Sign out','','id="stxv4SignOut"')+'</div></header><div class="stxv4-content" id="stxv4Page"></div></main>'+
      '<div class="stxv4-mobile-backdrop" id="stxv4MobileBackdrop" hidden></div><div id="stxv4ModalRoot"></div></div>';
    bindShell();navigate(routeFromPath(),false);
  }
  function bindShell(){
    document.querySelectorAll('[data-nav]').forEach(function(b){b.addEventListener('click',function(){navigate(b.dataset.nav,true);closeMenu();});});
    document.getElementById('stxv4SignOut').addEventListener('click',function(){clearSession();window.location.href='/admin/login';});
    document.getElementById('stxv4Search').addEventListener('click',openCommand);
    document.getElementById('stxv4Menu').addEventListener('click',function(){var open=!document.body.classList.contains('stxv4-menu-open');document.body.classList.toggle('stxv4-menu-open',open);this.setAttribute('aria-expanded',String(open));document.getElementById('stxv4MobileBackdrop').hidden=!open;});
    document.getElementById('stxv4MobileBackdrop').addEventListener('click',closeMenu);
    window.addEventListener('popstate',function(){navigate(routeFromPath(),false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeMenu();closeModal();}});
  }
  function closeMenu(){document.body.classList.remove('stxv4-menu-open');var b=document.getElementById('stxv4Menu');if(b)b.setAttribute('aria-expanded','false');var d=document.getElementById('stxv4MobileBackdrop');if(d)d.hidden=true;}
  function navigate(id,push){if(!ROUTE_BY_ID[id])id='dashboard';state.route=id;var r=route(id);if(push&&cleanPath()!==r[1])history.pushState({},'',r[1]);document.getElementById('stxv4TopTitle').textContent=r[2];document.getElementById('stxv4TopRoute').textContent=r[1]+' · Stratex internal administration';document.querySelectorAll('.stxv4-nav').forEach(function(n){var on=n.dataset.nav===id;n.classList.toggle('active',on);if(on)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});renderPage(id);window.scrollTo({top:0,behavior:'auto'});}
  function openCommand(){
    var items=ROUTES.filter(function(r){return(r[0]!=='add-user'&&r[0]!=='permissions')||isRichdhin();});
    openModal('Search Stratex Admin','<input class="stxv4-input" id="stxv4CommandSearch" type="search" placeholder="Search admin pages and actions" aria-label="Search admin pages"><div class="stxv4-command-list" id="stxv4CommandList">'+items.map(function(r){return'<button class="stxv4-command-item" type="button" data-command="'+esc(r[0])+'"><b>'+esc(r[2])+'</b><span>'+esc(r[1])+'</span></button>';}).join('')+'</div>','stxv4-command');
    var input=document.getElementById('stxv4CommandSearch');input.focus();input.addEventListener('input',function(){var q=input.value.toLowerCase();document.querySelectorAll('[data-command]').forEach(function(x){x.hidden=x.textContent.toLowerCase().indexOf(q)<0;});});document.querySelectorAll('[data-command]').forEach(function(x){x.addEventListener('click',function(){var id=x.dataset.command;closeModal();navigate(id,true);});});
  }
  function openModal(title,body,extraClass){closeModal(false);state.modalReturn=document.activeElement;var root=document.getElementById('stxv4ModalRoot');root.innerHTML='<div class="stxv4-modalhost"><div class="stxv4-modalbackdrop" data-close-modal></div><section class="stxv4-modal '+(extraClass||'')+'" role="dialog" aria-modal="true" aria-labelledby="stxv4ModalTitle"><div class="stxv4-modalhead"><h2 id="stxv4ModalTitle">'+esc(title)+'</h2>'+btn('Close','small','data-close-modal')+'</div><div class="stxv4-modalbody">'+body+'</div></section></div>';document.body.classList.add('stxv4-modal-open');root.querySelectorAll('[data-close-modal]').forEach(function(x){x.addEventListener('click',function(){closeModal();});});var first=root.querySelector('input,select,textarea,button,a[href]');if(first)first.focus();}
  function closeModal(restore){var root=document.getElementById('stxv4ModalRoot');if(root)root.innerHTML='';document.body.classList.remove('stxv4-modal-open');if(restore!==false&&state.modalReturn&&state.modalReturn.focus)state.modalReturn.focus();state.modalReturn=null;}

  function renderPage(id){
    var root=document.getElementById('stxv4Page');if(!root)return;
    var pages={
      dashboard:pageDashboard,registrations:pageRegistrations,contact:pageContact,crm:pageCrm,activity:pageActivity,
      blog:pageBlog,leadership:pageLeadership,org:pageOrg,'add-user':pageAddUser,permissions:pagePermissions,
      profile:pageProfile,contracts:pageContracts,hiring:pageHiring,trust:pageTrust,settings:pageSettings,
      showcase:pageShowcase,awards:pageAwards
    };
    root.innerHTML=(pages[id]||pageDashboard)();
    bindCommonPage();
    var loaders={
      dashboard:loadDashboard,registrations:loadRegistrations,contact:loadContact,crm:loadCrm,activity:loadActivity,
      blog:loadBlog,leadership:loadLeadership,org:loadOrg,'add-user':loadAddUser,permissions:loadPermissions,
      profile:loadProfile,contracts:loadContracts,hiring:loadHiring,trust:loadTrust,settings:loadSettings,
      showcase:loadShowcase,awards:loadAwards
    };
    if(loaders[id])loaders[id]();
  }
  function bindCommonPage(){
    document.querySelectorAll('[data-toggle]').forEach(function(b){b.addEventListener('click',function(){b.classList.toggle('on');b.setAttribute('aria-pressed',String(b.classList.contains('on')));});});
    document.querySelectorAll('[data-page-nav]').forEach(function(b){b.addEventListener('click',function(){navigate(b.dataset.pageNav,true);});});
  }
  function pageDashboard(){
    var cards=[
      ['registrations','RG','Registrations','Review product registrations.'],['contact','CF','Contact Forms','Triage public submissions.'],
      ['crm','CR','CRM','Manage contacts and activity.'],['activity','WA','Website Activity','See public-site performance.'],
      ['blog','BL','Blog / Learning','Write and publish articles.'],['leadership','LD','Leadership','Manage public leadership profiles.'],
      ['org','OC','Org Charts','View reporting lines.'],['profile','MP','My Profile','See your internal profile.'],
      ['contracts','CP','Contracts & Pay','Private people records.'],['hiring','HR','Hiring','Roles first, then applicants.'],
      ['trust','TC','Trust & Concerns','Private reports and actions.'],['settings','ST','Settings','Company settings only.'],
      ['showcase','SE','Showcase Event','Manage showcase events.'],['awards','AC','Award Ceremonies','Manage awards and notices.']
    ];
    return pageHead('Company administration','A clean Stratex company overview. ScoutLink product-admin areas remain connected through Stratex parent-company records.',isRichdhin()?btn('Add Stratex User','primary','data-page-nav="add-user"'):'')+
      '<div class="stxv4-metrics">'+metric('Open registrations','—','Awaiting decision','', 'stxv4DashRegistrations')+metric('New forms','—','Assigned and unassigned','blue','stxv4DashForms')+metric('Open roles','—','Live vacancies','gold','stxv4DashRoles')+metric('Urgent concerns','—','High-priority cases','red','stxv4DashConcerns')+'</div>'+
      '<div class="stxv4-dashboard">'+cards.map(function(c){return'<button class="stxv4-dash" type="button" data-page-nav="'+c[0]+'"><i>'+c[1]+'</i><h3>'+esc(c[2])+'</h3><p>'+esc(c[3])+'</p><span>Open area →</span></button>';}).join('')+'</div>';
  }
  async function loadDashboard(){
    try{
      var results=await Promise.allSettled([
        api('GET','/api/stratex/dashboard'),
        api('GET','/api/stratex-website/leads?limit=500'),
        api('GET','/api/stratex/jobs'),
        api('GET','/api/stratex-website/leads?type=concern&limit=500')
      ]);
      var dash=results[0].status==='fulfilled'?results[0].value:{};
      var leads=results[1].status==='fulfilled'?(results[1].value.data||[]):[];
      var jobs=results[2].status==='fulfilled'?(results[2].value.data||[]):[];
      var concerns=results[3].status==='fulfilled'?(results[3].value.data||[]):leads.filter(function(x){return /concern/i.test(String(x.lead_type||''));});
      document.getElementById('stxv4DashRegistrations').textContent=num(dash.pendingReqs);
      document.getElementById('stxv4DashForms').textContent=num(leads.filter(function(x){return /new|open/i.test(String(x.status||'new'));}).length);
      document.getElementById('stxv4DashRoles').textContent=num(jobs.filter(function(x){return /live|scheduled|open|published/i.test(String(x.status||''));}).length);
      document.getElementById('stxv4DashConcerns').textContent=num(concerns.filter(function(x){var meta=x.safe_metadata||{};return /urgent|high/i.test(String(x.priority||x.severity||meta.priority||''))&&!/closed|resolved/i.test(String(x.status||''));}).length);
    }catch(_){}
  }
  function pageRegistrations(){
  return pageHead(
    'Registrations',
    'Review and complete Coach and Scout registrations directly inside Stratex Admin.',
    btn('Refresh','','id="stxv4RefreshRegistrations"')
  )+
    '<div class="stxv4-metrics stxreg-metrics">'+
      metric('All registrations','—','Every ScoutLink request','','stxregMetricAll')+
      metric('Needs admin action','—','Review, documents or payment','gold','stxregMetricAction')+
      metric('Awaiting documents','—','Scout verification outstanding','blue','stxregMetricDocuments')+
      metric('Awaiting payment','—','Verified Scout requests','red','stxregMetricPayment')+
    '</div>'+
    '<div class="stxv4-filters stxreg-filters">'+
      '<input class="stxv4-input" id="stxv4RegistrationSearch" placeholder="Search name, email or organisation" aria-label="Search registrations">'+
      '<select class="stxv4-select" id="stxv4RegistrationType" aria-label="Registration type">'+
        '<option value="">Coach and Scout</option>'+
        '<option value="coach">Coach</option>'+
        '<option value="scout">Scout</option>'+
      '</select>'+
      '<select class="stxv4-select" id="stxv4RegistrationStatus" aria-label="Registration decision status">'+
        '<option value="">All decisions</option>'+
        '<option value="pending">Pending</option>'+
        '<option value="approved">Approved</option>'+
        '<option value="declined">Declined</option>'+
      '</select>'+
      '<select class="stxv4-select" id="stxregWorkflowFilter" aria-label="Registration workflow stage">'+
        '<option value="">All workflow stages</option>'+
        '<option value="admin_review">Coach admin review</option>'+
        '<option value="awaiting_documents">Scout awaiting documents</option>'+
        '<option value="documents_ready">Scout documents ready</option>'+
        '<option value="awaiting_payment">Scout awaiting payment</option>'+
        '<option value="account_created">Account created</option>'+
        '<option value="declined">Declined</option>'+
      '</select>'+
      btn('Filter','primary','id="stxv4ApplyRegistrationFilters"')+
    '</div>'+
    '<section class="stxv4-card">'+
      cardHead(
        'Registration records',
        'Select a request to complete its workflow without leaving this page'
      )+
      '<div class="stxv4-cardbody" id="stxv4RegistrationRows">'+
        loading()+
      '</div>'+
    '</section>'+
    '<div id="stxv4RegistrationDetail"></div>';
}

function normalizeRegistration(row){
  row=row||{};
  var type=String(
    row.account_type||
    row.accountType||
    row.type||
    'Registration'
  );

  return{
    id:row.id,
    source:'ScoutLink registration',
    product:'ScoutLink',
    type:type,
    name:[
      row.first_name,
      row.last_name
    ].filter(Boolean).join(' ')||
      row.full_name||
      row.name||
      '',
    email:row.email||'',
    phone:row.phone||'',
    organisation:
      row.team_name||
      row.scout_club||
      row.organisation||
      row.club_name||
      '',
    role:
      row.role_at_club||
      row.role||
      row.scout_league||
      '',
    status:row.status||'pending',
    verificationStatus:
      row.verification_status||
      (type.toLowerCase()==='scout'
        ?'awaiting_documents'
        :'not_required'),
    createdAt:
      row.created_at||
      row.submitted_at||
      row.updated_at,
    raw:row
  };
}

function registrationStage(registration){
  var type=String(registration.type||'').toLowerCase();
  var statusValue=String(registration.status||'').toLowerCase();
  var verification=String(
    registration.verificationStatus||''
  ).toLowerCase();

  if(statusValue==='declined')return'declined';
  if(statusValue==='approved')return'account_created';

  if(type==='coach')return'admin_review';

  if(verification==='verified_awaiting_payment'){
    return'awaiting_payment';
  }

  if(verification==='documents_submitted'){
    return'documents_ready';
  }

  if(verification==='activated'){
    return'account_created';
  }

  return'awaiting_documents';
}

function registrationStageLabel(registration){
  var labels={
    admin_review:'Admin review',
    awaiting_documents:'Awaiting documents',
    documents_ready:'Documents ready',
    awaiting_payment:'Awaiting payment',
    account_created:'Account created',
    declined:'Declined'
  };

  return labels[registrationStage(registration)]||
    'Registration review';
}

function registrationStep(label,stateValue,copy){
  return'<div class="stxreg-step '+esc(stateValue)+'">'+
    '<i aria-hidden="true"></i>'+
    '<div><b>'+esc(label)+'</b><span>'+esc(copy)+'</span></div>'+
  '</div>';
}

function coachWorkflowSteps(registration){
  var stage=registrationStage(registration);

  return'<div class="stxreg-steps" aria-label="Coach registration workflow">'+
    registrationStep(
      '1. Registration submitted',
      'complete',
      'Coach details and required declarations received.'
    )+
    registrationStep(
      '2. Stratex admin review',
      stage==='admin_review'
        ?'current'
        :stage==='declined'
          ?'declined'
          :'complete',
      stage==='declined'
        ?'The request was declined.'
        :'Review the club, role and declarations.'
    )+
    registrationStep(
      '3. Coach account and login code',
      stage==='account_created'
        ?'complete'
        :'waiting',
      stage==='account_created'
        ?'The Coach account has been created.'
        :'Created automatically after approval.'
    )+
  '</div>';
}

function scoutWorkflowSteps(registration){
  var stage=registrationStage(registration);
  var order=[
    'awaiting_documents',
    'documents_ready',
    'awaiting_payment',
    'account_created'
  ];
  var index=order.indexOf(stage);

  function stateFor(stepIndex){
    if(stage==='declined')return stepIndex===0?'complete':'declined';
    if(index>stepIndex)return'complete';
    if(index===stepIndex)return'current';
    return'waiting';
  }

  return'<div class="stxreg-steps" aria-label="Scout registration workflow">'+
    registrationStep(
      '1. Registration submitted',
      'complete',
      'Scout identity, club and declaration received.'
    )+
    registrationStep(
      '2. Verification documents',
      stateFor(0),
      stage==='awaiting_documents'
        ?'Waiting for DBS or safeguarding evidence and proof of ID.'
        :'Required files have been submitted.'
    )+
    registrationStep(
      '3. Safeguarding review',
      stateFor(1),
      stage==='documents_ready'
        ?'Complete every review gate and verify the Enhanced DBS details.'
        :'Stratex reviews identity, DBS, credentials and club association.'
    )+
    registrationStep(
      '4. Payment',
      stateFor(2),
      stage==='awaiting_payment'
        ?'Payment request sent. Confirm payment when received.'
        :'Payment is requested only after verification.'
    )+
    registrationStep(
      '5. Scout account activated',
      stateFor(3),
      stage==='account_created'
        ?'The Scout account and login code have been created.'
        :'Created automatically after payment confirmation.'
    )+
  '</div>';
}

function registrationDeclaration(
  label,
  value
){
  return'<span class="stxreg-declaration '+(value?'yes':'no')+'">'+
    esc(label)+': '+(value?'Confirmed':'Not confirmed')+
  '</span>';
}

function coachDeclarations(registration){
  var declarations=
    registration.raw.declarations&&
    typeof registration.raw.declarations==='object'
      ?registration.raw.declarations
      :{};

  return'<div class="stxreg-declarations">'+
    registrationDeclaration(
      'Authorised club representative',
      declarations.authorised===true
    )+
    registrationDeclaration(
      'Under-18 permissions',
      declarations.under18Permissions===true
    )+
    registrationDeclaration(
      'Dispute and removal process',
      declarations.disputeRemoval===true
    )+
    registrationDeclaration(
      'Media permission responsibility',
      declarations.mediaPermission===true
    )+
    registrationDeclaration(
      'Data policy',
      registration.raw.data_policy_agreed===true
    )+
  '</div>';
}

function scoutDeclarations(registration){
  var declarations=
    registration.raw.declarations&&
    typeof registration.raw.declarations==='object'
      ?registration.raw.declarations
      :{};

  return'<div class="stxreg-declarations">'+
    registrationDeclaration(
      'Legitimate scouting capacity',
      declarations.legitimateCapacity===true
    )+
    registrationDeclaration(
      'Data policy',
      registration.raw.data_policy_agreed===true
    )+
  '</div>';
}

function requestInformationForm(registration){
  if(String(registration.status).toLowerCase()!=='pending'){
    return'';
  }

  return'<section class="stxreg-action-card">'+
    '<h4>Request more information</h4>'+
    '<p>Send the applicant a registration update without leaving Stratex Admin.</p>'+
    '<form id="stxregRequestInfoForm">'+
      '<label class="stxv4-field full">'+
        '<span>Message to applicant</span>'+
        '<textarea class="stxv4-textarea" name="message" required '+
          'placeholder="Explain exactly what information or evidence is required."></textarea>'+
      '</label>'+
      '<div class="stxv4-actions">'+
        btn(
          'Send information request',
          '',
          'type="submit"'
        )+
      '</div>'+
    '</form>'+
  '</section>';
}

function declineRegistrationForm(registration){
  if(String(registration.status).toLowerCase()!=='pending'){
    return'';
  }

  return'<section class="stxreg-action-card danger">'+
    '<h4>Decline registration</h4>'+
    '<p>The applicant receives the selected reason by email.</p>'+
    '<form id="stxregDeclineForm">'+
      '<div class="stxv4-formgrid">'+
        field(
          'Decline reason',
          'declineReason',
          'select',
          '',
          false,
          '',
          [
            ['','Select a reason'],
            ['Unable to verify football team','Unable to verify football team'],
            ['Unable to verify professional club affiliation','Unable to verify professional club affiliation'],
            ['Insufficient information provided','Insufficient information provided'],
            ['Cannot verify age eligibility','Cannot verify age eligibility'],
            ['Duplicate registration','Duplicate registration'],
            ['Account suspended','Account suspended'],
            ['Other','Other']
          ]
        )+
        field(
          'Custom reason when Other is selected',
          'customReason',
          'textarea',
          '',
          true
        )+
      '</div>'+
      '<div class="stxv4-actions">'+
        btn(
          'Decline and email applicant',
          'red',
          'type="submit"'
        )+
      '</div>'+
    '</form>'+
  '</section>';
}

function coachReviewActions(registration){
  if(registrationStage(registration)!=='admin_review'){
    return'';
  }

  return'<section class="stxreg-action-card primary">'+
    '<h4>Approve Coach registration</h4>'+
    '<p>Approval creates the Coach account immediately and emails the secure completion code.</p>'+
    '<div class="stxv4-actions">'+
      btn(
        'Approve Coach and create account',
        'primary',
        'id="stxregApproveCoach"'
      )+
    '</div>'+
  '</section>';
}

function scoutAwaitingDocumentsActions(registration){
  if(registrationStage(registration)!=='awaiting_documents'){
    return'';
  }

  return'<section class="stxreg-action-card waiting">'+
    '<h4>Verification documents outstanding</h4>'+
    '<p>The Scout must upload safeguarding or DBS evidence and proof of ID before review.</p>'+
    '<div class="stxv4-actions">'+
      btn(
        'Resend verification link',
        'primary',
        'id="stxregResendVerification"'
      )+
    '</div>'+
  '</section>';
}

function scoutVerificationForm(registration){
  if(registrationStage(registration)!=='documents_ready'){
    return'';
  }

  var review=
    registration.raw.safeguarding_review&&
    typeof registration.raw.safeguarding_review==='object'
      ?registration.raw.safeguarding_review
      :{};

  var checklist=review.checklist||{};

  function check(name,label){
    return'<label class="stxreg-check">'+
      '<input type="checkbox" name="'+esc(name)+'" '+
        (checklist[name]===true?'checked':'')+'>'+
      '<span>'+esc(label)+'</span>'+
    '</label>';
  }

  return'<section class="stxreg-action-card primary">'+
    '<h4>Complete Scout safeguarding review</h4>'+
    '<p>Every gate is required before a payment request can be sent.</p>'+
    '<div id="stxregVerificationDocuments">'+
      loading()+
    '</div>'+
    '<form id="stxregScoutVerificationForm">'+
      '<div class="stxreg-checklist">'+
        check('identity','Identity matches the applicant')+
        check('dbs','Enhanced DBS evidence reviewed')+
        check('faCredentials','Football or FA credentials reviewed')+
        check('clubAssociation','Professional club association verified')+
        check('contactDetails','Contact details verified')+
        check('noSafeguardingFlags','No unresolved safeguarding flags')+
        check('termsAccepted','Required declarations and terms accepted')+
      '</div>'+
      '<div class="stxv4-formgrid">'+
        field(
          'Enhanced DBS certificate number',
          'dbsCertificateNumber',
          'text',
          review.dbsCertificateNumber||'',
          false
        )+
        field(
          'DBS issue date',
          'dbsIssueDate',
          'date',
          review.dbsIssueDate||'',
          false
        )+
        field(
          'DBS level',
          'dbsLevel',
          'select',
          String(review.dbsLevel||'Enhanced'),
          false,
          '',
          [['Enhanced','Enhanced']]
        )+
        field(
          'Scout subscription plan',
          'subscriptionPlan',
          'select',
          registration.raw.payment_plan||'Core',
          false,
          '',
          [
            ['Core','Core'],
            ['Plus','Plus'],
            ['Elite','Elite']
          ]
        )+
        field(
          'Secure payment link',
          'paymentLink',
          'url',
          registration.raw.payment_link||'',
          true,
          'Must begin with https://'
        )+
        field(
          'Internal safeguarding notes',
          'notes',
          'textarea',
          review.notes||'',
          true
        )+
      '</div>'+
      '<div class="stxv4-actions">'+
        btn(
          'Verify Scout and send payment request',
          'primary',
          'type="submit"'
        )+
      '</div>'+
    '</form>'+
  '</section>';
}

function scoutPaymentActions(registration){
  if(registrationStage(registration)!=='awaiting_payment'){
    return'';
  }

  return'<section class="stxreg-action-card payment">'+
    '<h4>Scout verified and awaiting payment</h4>'+
    '<p>Plan: <strong>'+
      esc(registration.raw.payment_plan||'Core')+
      '</strong>. Confirm only after the payment has been received.</p>'+
    '<div class="stxv4-actions">'+
      btn(
        'Resend payment email',
        '',
        'id="stxregResendPayment"'
      )+
      btn(
        'Mark payment received and create Scout account',
        'primary',
        'id="stxregPaymentReceived"'
      )+
    '</div>'+
  '</section>';
}

function completedRegistrationPanel(registration){
  var stage=registrationStage(registration);

  if(stage==='account_created'){
    return'<section class="stxreg-action-card complete">'+
      '<h4>Registration completed</h4>'+
      '<p>The '+esc(registration.type)+' account is active and the completion code has been emailed.</p>'+
      '<div class="stxreg-completion-grid">'+
        '<div><span>Linked account ID</span><b>'+
          esc(
            registration.raw.linked_account_id||
            registration.raw.linkedAccountId||
            'Created before linked-ID tracking'
          )+
        '</b></div>'+
        '<div><span>Activated</span><b>'+
          esc(
            date(
              registration.raw.activated_at||
              registration.raw.reviewed_at||
              registration.raw.updated_at
            )
          )+
        '</b></div>'+
      '</div>'+
    '</section>';
  }

  if(stage==='declined'){
    return'<section class="stxreg-action-card danger">'+
      '<h4>Registration declined</h4>'+
      '<p>'+esc(
        registration.raw.decline_reason||
        'No decline reason was stored.'
      )+'</p>'+
    '</section>';
  }

  return'';
}

async function loadRegistrations(reopenId){
  var root=document.getElementById('stxv4RegistrationRows');
  if(!root)return;

  root.innerHTML=loading();

  try{
    var statusNode=document.getElementById(
      'stxv4RegistrationStatus'
    );

    var statusValue=statusNode
      ?String(statusNode.value||'')
      :'';

    /*
    An explicit empty status prevents the existing backend default
    from limiting the parent-company page to pending records only.
    */
    var query=
      '?limit=250&status='+
      encodeURIComponent(statusValue);

    var data=await api(
      'GET',
      '/api/registrations'+query
    );

    state.data.registrations=(data.data||[])
      .map(normalizeRegistration);

    renderRegistrationRows();

    var selectedId=
      reopenId||
      (
        state.selected.registration&&
        state.selected.registration.id
      );

    if(
      selectedId&&
      state.data.registrations.some(function(item){
        return String(item.id)===String(selectedId);
      })
    ){
      await openRegistration(selectedId);
    }
  }catch(err){
    root.innerHTML=empty(
      err.message||
      'Could not load registration records.'
    );
  }
}

function filteredRegistrations(){
  var searchNode=document.getElementById(
    'stxv4RegistrationSearch'
  );

  var typeNode=document.getElementById(
    'stxv4RegistrationType'
  );

  var statusNode=document.getElementById(
    'stxv4RegistrationStatus'
  );

  var workflowNode=document.getElementById(
    'stxregWorkflowFilter'
  );

  var query=String(
    searchNode&&searchNode.value||''
  ).toLowerCase();

  var typeValue=String(
    typeNode&&typeNode.value||''
  ).toLowerCase();

  var statusValue=String(
    statusNode&&statusNode.value||''
  ).toLowerCase();

  var workflowValue=String(
    workflowNode&&workflowNode.value||''
  ).toLowerCase();

  return(state.data.registrations||[])
    .filter(function(registration){
      var text=[
        registration.name,
        registration.email,
        registration.organisation,
        registration.role,
        registration.type,
        registration.status,
        registration.verificationStatus
      ].join(' ').toLowerCase();

      return(
        !query||
        text.indexOf(query)>=0
      )&&(
        !typeValue||
        String(registration.type).toLowerCase()===typeValue
      )&&(
        !statusValue||
        String(registration.status).toLowerCase()===statusValue
      )&&(
        !workflowValue||
        registrationStage(registration)===workflowValue
      );
    });
}

function updateRegistrationMetrics(){
  var registrations=state.data.registrations||[];

  var actionCount=registrations.filter(function(item){
    return[
      'admin_review',
      'documents_ready',
      'awaiting_payment'
    ].indexOf(registrationStage(item))>=0;
  }).length;

  var documentsCount=registrations.filter(function(item){
    return registrationStage(item)==='awaiting_documents';
  }).length;

  var paymentCount=registrations.filter(function(item){
    return registrationStage(item)==='awaiting_payment';
  }).length;

  var values={
    stxregMetricAll:registrations.length,
    stxregMetricAction:actionCount,
    stxregMetricDocuments:documentsCount,
    stxregMetricPayment:paymentCount
  };

  Object.keys(values).forEach(function(id){
    var node=document.getElementById(id);
    if(node)node.textContent=num(values[id]);
  });
}

function renderRegistrationRows(){
  var registrations=filteredRegistrations();
  var root=document.getElementById(
    'stxv4RegistrationRows'
  );

  if(!root)return;

  updateRegistrationMetrics();

  root.innerHTML=table(
    [
      'Product',
      'Applicant',
      'Organisation',
      'Type',
      'Workflow stage',
      'Decision',
      'Submitted',
      'Action'
    ],
    registrations.map(function(registration){
      var actionLabel=
        registrationStage(registration)==='account_created'||
        registrationStage(registration)==='declined'
          ?'View'
          :'Review';

      return'<tr data-registration-id="'+
        esc(registration.id)+'">'+
        '<td>'+
          status('ScoutLink','green')+
        '</td>'+
        '<td>'+
          '<span class="stxv4-rowtitle">'+
            esc(registration.name||'—')+
          '</span>'+
          '<span class="stxv4-rowsub">'+
            esc(registration.email)+
          '</span>'+
        '</td>'+
        '<td>'+
          esc(registration.organisation||'—')+
        '</td>'+
        '<td>'+
          status(
            registration.type,
            String(registration.type).toLowerCase()==='scout'
              ?'blue'
              :'grey'
          )+
        '</td>'+
        '<td>'+
          status(
            registrationStageLabel(registration),
            statusColor(
              registrationStage(registration)
            )
          )+
        '</td>'+
        '<td>'+
          status(
            registration.status,
            statusColor(registration.status)
          )+
        '</td>'+
        '<td>'+
          esc(date(registration.createdAt))+
        '</td>'+
        '<td>'+
          btn(
            actionLabel,
            registrationStage(registration)==='account_created'
              ?'small'
              :'small primary',
            'data-open-registration="'+
              esc(registration.id)+'"'
          )+
        '</td>'+
      '</tr>';
    })
  );

  root.querySelectorAll(
    '[data-open-registration]'
  ).forEach(function(button){
    button.addEventListener('click',function(event){
      event.stopPropagation();
      openRegistration(
        button.dataset.openRegistration
      );
    });
  });

  root.querySelectorAll(
    'tr[data-registration-id]'
  ).forEach(function(row){
    row.addEventListener('click',function(event){
      if(event.target.closest('button,a,input,select')){
        return;
      }

      openRegistration(
        row.dataset.registrationId
      );
    });
  });
}

function registrationCommonItems(registration){
  return[
    ['Product','ScoutLink'],
    ['Registration type',registration.type],
    ['Organisation',registration.organisation],
    ['Role or league',registration.role],
    ['Email',registration.email],
    ['Phone',registration.phone],
    ['Decision status',registration.status],
    ['Verification status',registration.verificationStatus],
    ['Submitted',date(registration.createdAt)],
    ['Registration ID',registration.id]
  ];
}

function renderRegistrationWorkflow(registration){
  var type=String(registration.type||'').toLowerCase();

  var steps=type==='scout'
    ?scoutWorkflowSteps(registration)
    :coachWorkflowSteps(registration);

  var declarations=type==='scout'
    ?scoutDeclarations(registration)
    :coachDeclarations(registration);

  var actions='';

  if(type==='coach'){
    actions+=coachReviewActions(registration);
  }else{
    actions+=scoutAwaitingDocumentsActions(registration);
    actions+=scoutVerificationForm(registration);
    actions+=scoutPaymentActions(registration);
  }

  actions+=requestInformationForm(registration);
  actions+=declineRegistrationForm(registration);
  actions+=completedRegistrationPanel(registration);

  return steps+
    '<section class="stxreg-summary">'+
      '<h4>Applicant confirmations</h4>'+
      declarations+
    '</section>'+
    '<div class="stxv4-message" id="stxregWorkflowMessage" role="status"></div>'+
    '<div class="stxreg-actions-grid">'+
      actions+
    '</div>';
}

async function openRegistration(id){
  var registration=(state.data.registrations||[])
    .find(function(item){
      return String(item.id)===String(id);
    });

  if(!registration)return;

  state.selected.registration=registration;

  var root=document.getElementById(
    'stxv4RegistrationDetail'
  );

  root.innerHTML=detail(
    registration.name,
    registration.type+
      ' registration · '+
      registrationStageLabel(registration),
    registrationCommonItems(registration),
    registration.email
      ?'<a class="stxv4-btn small" href="mailto:'+
        esc(registration.email)+
        '">Email applicant</a>'
      :'',
    renderRegistrationWorkflow(registration)
  );

  bindRegistrationWorkflow(registration);

  root.scrollIntoView({
    behavior:'smooth',
    block:'start'
  });

  if(
    String(registration.type).toLowerCase()==='scout'&&
    registrationStage(registration)==='documents_ready'
  ){
    await loadScoutVerificationDocuments(
      registration
    );
  }
}

async function loadScoutVerificationDocuments(registration){
  var root=document.getElementById(
    'stxregVerificationDocuments'
  );

  if(!root)return;

  root.innerHTML=loading();

  try{
    var response=await api(
      'GET',
      '/api/registrations/'+
        encodeURIComponent(registration.id)+
        '/verification-documents'
    );

    var documents=response.data||[];

    if(!documents.length){
      root.innerHTML=note(
        'red',
        'Documents missing',
        'The Scout cannot be verified until both required documents are available.'
      );
      return;
    }

    root.innerHTML=
      '<div class="stxreg-documents">'+
        documents.map(function(documentRow,index){
          return'<article class="stxreg-document">'+
            '<div>'+
              '<b>'+
                esc(
                  documentRow.kind||
                  'Verification document'
                )+
              '</b>'+
              '<span>'+
                esc(
                  documentRow.fileName||
                  'Document '+(index+1)
                )+
              '</span>'+
            '</div>'+
            (
              documentRow.signedUrl
                ?'<a class="stxv4-btn small" '+
                  'href="'+
                  esc(documentRow.signedUrl)+
                  '" target="_blank" rel="noopener">'+
                  'Open secure document</a>'
                :''
            )+
          '</article>';
        }).join('')+
      '</div>';
  }catch(err){
    root.innerHTML=note(
      'red',
      'Documents could not be loaded',
      err.message||
      'Refresh the registration and try again.'
    );
  }
}

async function performRegistrationAction(
  registration,
  button,
  path,
  body,
  pendingLabel,
  successMessage
){
  var original=button.textContent;

  button.disabled=true;
  button.textContent=pendingLabel;

  try{
    var response=await api(
      'POST',
      '/api/registrations/'+
        encodeURIComponent(registration.id)+
        path,
      body||{}
    );

    showMessage(
      'stxregWorkflowMessage',
      response.message||
        successMessage,
      true
    );

    await loadRegistrations(
      registration.id
    );
  }catch(err){
    showMessage(
      'stxregWorkflowMessage',
      err.message||
        'The registration action could not be completed.',
      false
    );
  }finally{
    button.disabled=false;
    button.textContent=original;
  }
}

function bindRegistrationWorkflow(registration){
  var approveCoach=document.getElementById(
    'stxregApproveCoach'
  );

  if(approveCoach){
    approveCoach.addEventListener(
      'click',
      function(){
        if(!window.confirm(
          'Approve this Coach registration and create the Coach account now?'
        )){
          return;
        }

        performRegistrationAction(
          registration,
          approveCoach,
          '/approve',
          {},
          'Creating Coach account…',
          'Coach approved and account created.'
        );
      }
    );
  }

  var resendVerification=document.getElementById(
    'stxregResendVerification'
  );

  if(resendVerification){
    resendVerification.addEventListener(
      'click',
      function(){
        performRegistrationAction(
          registration,
          resendVerification,
          '/resend-verification',
          {},
          'Sending verification link…',
          'Verification link sent.'
        );
      }
    );
  }

  var requestInfoForm=document.getElementById(
    'stxregRequestInfoForm'
  );

  if(requestInfoForm){
    requestInfoForm.addEventListener(
      'submit',
      function(event){
        event.preventDefault();

        var messageValue=String(
          new FormData(requestInfoForm).get('message')||
          ''
        ).trim();

        if(messageValue.length<10){
          showMessage(
            'stxregWorkflowMessage',
            'Explain what information is required.',
            false
          );
          return;
        }

        var submit=requestInfoForm.querySelector(
          'button[type="submit"]'
        );

        performRegistrationAction(
          registration,
          submit,
          '/request-information',
          {message:messageValue},
          'Sending request…',
          'Information request sent.'
        );
      }
    );
  }

  var declineForm=document.getElementById(
    'stxregDeclineForm'
  );

  if(declineForm){
    declineForm.addEventListener(
      'submit',
      function(event){
        event.preventDefault();

        var formData=new FormData(declineForm);
        var declineReason=String(
          formData.get('declineReason')||
          ''
        );

        var customReason=String(
          formData.get('customReason')||
          ''
        ).trim();

        if(!declineReason){
          showMessage(
            'stxregWorkflowMessage',
            'Select a decline reason.',
            false
          );
          return;
        }

        if(
          declineReason==='Other'&&
          !customReason
        ){
          showMessage(
            'stxregWorkflowMessage',
            'Enter the custom decline reason.',
            false
          );
          return;
        }

        if(!window.confirm(
          'Decline this registration and email the applicant?'
        )){
          return;
        }

        var submit=declineForm.querySelector(
          'button[type="submit"]'
        );

        performRegistrationAction(
          registration,
          submit,
          '/decline',
          {
            declineReason:declineReason,
            customReason:customReason
          },
          'Declining registration…',
          'Registration declined.'
        );
      }
    );
  }

  var verificationForm=document.getElementById(
    'stxregScoutVerificationForm'
  );

  if(verificationForm){
    verificationForm.addEventListener(
      'submit',
      function(event){
        event.preventDefault();

        var formData=new FormData(
          verificationForm
        );

        var checklist={};
        [
          'identity',
          'dbs',
          'faCredentials',
          'clubAssociation',
          'contactDetails',
          'noSafeguardingFlags',
          'termsAccepted'
        ].forEach(function(key){
          checklist[key]=formData.get(key)==='on';
        });

        var allComplete=Object.keys(checklist)
          .every(function(key){
            return checklist[key]===true;
          });

        if(!allComplete){
          showMessage(
            'stxregWorkflowMessage',
            'Complete every safeguarding review gate before continuing.',
            false
          );
          return;
        }

        var paymentLink=String(
          formData.get('paymentLink')||
          ''
        ).trim();

        if(!/^https:\/\//i.test(paymentLink)){
          showMessage(
            'stxregWorkflowMessage',
            'Enter a secure payment link beginning with https://',
            false
          );
          return;
        }

        var submit=verificationForm.querySelector(
          'button[type="submit"]'
        );

        performRegistrationAction(
          registration,
          submit,
          '/approve',
          {
            subscriptionPlan:
              formData.get('subscriptionPlan'),
            paymentLink:paymentLink,
            safeguardingReview:{
              checklist:checklist,
              dbsCertificateNumber:
                formData.get('dbsCertificateNumber'),
              dbsIssueDate:
                formData.get('dbsIssueDate'),
              dbsLevel:
                formData.get('dbsLevel'),
              notes:
                formData.get('notes')
            }
          },
          'Verifying and sending payment request…',
          'Scout verified and payment request sent.'
        );
      }
    );
  }

  var resendPayment=document.getElementById(
    'stxregResendPayment'
  );

  if(resendPayment){
    resendPayment.addEventListener(
      'click',
      function(){
        performRegistrationAction(
          registration,
          resendPayment,
          '/resend-payment',
          {},
          'Resending payment email…',
          'Payment email sent again.'
        );
      }
    );
  }

  var paymentReceived=document.getElementById(
    'stxregPaymentReceived'
  );

  if(paymentReceived){
    paymentReceived.addEventListener(
      'click',
      function(){
        if(!window.confirm(
          'Confirm that payment has been received and create the Scout account now?'
        )){
          return;
        }

        performRegistrationAction(
          registration,
          paymentReceived,
          '/payment-received',
          {
            subscriptionPlan:
              registration.raw.payment_plan||
              'Core'
          },
          'Creating Scout account…',
          'Payment confirmed and Scout account created.'
        );
      }
    );
  }
}
  function pageContact(){
    return pageHead('Contact Forms','All website contact, demo, lead and public form submissions in one queue.',btn('Refresh','','id="stxv4RefreshContact"'))+
      '<section class="stxv4-card">'+cardHead('Recent website submissions','Stratex and ScoutLink public forms')+'<div class="stxv4-cardbody" id="stxv4ContactRows">'+loading()+'</div></section><div id="stxv4ContactDetail"></div>';
  }
  async function loadContact(){
    var root=document.getElementById('stxv4ContactRows');try{var data=await api('GET','/api/stratex-website/leads?limit=500');state.data.contacts=data.data||[];renderContactRows();}catch(err){root.innerHTML=empty(err.message);}
  }
  function renderContactRows(){
    var root=document.getElementById('stxv4ContactRows'),rows=state.data.contacts||[];
    root.innerHTML=table(['Form / Source','Name','Organisation','Email','Status','Submitted','Action'],rows.map(function(r,i){return'<tr data-row="'+i+'" data-contact-id="'+esc(r.id)+'"><td><span class="stxv4-rowtitle">'+esc(String(r.lead_type||'contact').replace(/_/g,' '))+'</span><span class="stxv4-rowsub">'+esc(r.source_page||'Public website')+'</span></td><td>'+esc(r.full_name||[r.first_name,r.last_name].filter(Boolean).join(' ')||'—')+'</td><td>'+esc(r.organisation||'—')+'</td><td>'+esc(r.email||'—')+'</td><td>'+status(r.status||'new',statusColor(r.status||'new'))+'</td><td>'+esc(date(r.created_at))+'</td><td>'+(r.email?'<a class="stxv4-btn small primary" href="mailto:'+esc(r.email)+'">Email</a>':btn('Open','small','data-open-contact="'+esc(r.id)+'"'))+'</td></tr>'; }));
    root.querySelectorAll('tr[data-contact-id]').forEach(function(tr){tr.addEventListener('click',function(e){if(e.target.closest('a,button'))return;openContact(tr.dataset.contactId);});});
  }
  function openContact(id){
    var r=(state.data.contacts||[]).find(function(x){return String(x.id)===String(id);});if(!r)return;state.selected.contact=r;
    var name=r.full_name||[r.first_name,r.last_name].filter(Boolean).join(' ')||r.email||'Website submission';
    var extra='<form id="stxv4ContactNoteForm"><div class="stxv4-formgrid">'+field('Status','status','select',r.status||'new',false,'',[['new','New'],['open','Open'],['contacted','Contacted'],['reviewed','Reviewed'],['closed','Closed']])+field('Internal note','notes','textarea','',true,'Stored on the restricted lead record.')+'</div><div class="stxv4-message" id="stxv4ContactNoteMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save note','primary','type="submit"')+'</div></form>';
    document.getElementById('stxv4ContactDetail').innerHTML=detail(name,String(r.lead_type||'contact').replace(/_/g,' '),[['Reason',r.reason],['Email',r.email],['Phone',r.phone],['Organisation',r.organisation],['Source',r.source_page],['Status',r.status],['Submitted',date(r.created_at)],['Message',r.message]],r.email?'<a class="stxv4-btn small primary" href="mailto:'+esc(r.email)+'">Email contact</a>':'',extra);
    document.getElementById('stxv4ContactNoteForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget);try{await api('PATCH','/api/stratex-website/leads/'+encodeURIComponent(r.id),{status:fd.get('status'),notes:fd.get('notes')});showMessage('stxv4ContactNoteMessage','Lead note and status saved.',true);await loadContact();}catch(err){showMessage('stxv4ContactNoteMessage',err.message,false);}});
  }
  function pageCrm(){
    return pageHead('CRM','Stratex and product contacts with forms, registrations, notes and linked activity.',btn('Export CRM','','id="stxv4ExportCrm"')+btn('Add contact','primary','id="stxv4AddContact"'))+
      '<div class="stxv4-metrics">'+metric('Contacts','—','All contact types','','stxv4CrmContacts')+metric('Warm leads','—','Need next action','gold','stxv4CrmWarm')+metric('Active customers','—','ScoutLink organisations','blue','stxv4CrmActive')+metric('Unassigned','—','New records','red','stxv4CrmUnassigned')+'</div>'+
      '<section class="stxv4-card">'+cardHead('CRM records','Parent-company view')+'<div class="stxv4-cardbody" id="stxv4CrmRows">'+loading()+'</div></section><div id="stxv4CrmDetail"></div>';
  }
  async function loadCrm(){
    var root=document.getElementById('stxv4CrmRows');try{var data=await api('GET','/api/stratex-website/crm');state.data.crm=data.data||[];renderCrmRows();var rows=state.data.crm;document.getElementById('stxv4CrmContacts').textContent=num(rows.length);document.getElementById('stxv4CrmWarm').textContent=num(rows.filter(function(x){return /warm|contacted|follow/i.test(String(x.status||''));}).length);document.getElementById('stxv4CrmActive').textContent=num(rows.filter(function(x){return /active|approved/i.test(String(x.status||''))&&/scoutlink/i.test(String(x.product||x.source||''));}).length);document.getElementById('stxv4CrmUnassigned').textContent=num(rows.filter(function(x){return !x.owner&&!x.assignedTo&&/new|pending/i.test(String(x.status||'new'));}).length);}catch(err){root.innerHTML=empty(err.message);}
  }
  function renderCrmRows(){
    var root=document.getElementById('stxv4CrmRows'),rows=state.data.crm||[];
    root.innerHTML=table(['Name / Email','Organisation','Type','Product','Status','Last activity','Action'],rows.map(function(r,i){return'<tr data-row="'+i+'" data-crm-id="'+esc(r.recordId||i)+'"><td><span class="stxv4-rowtitle">'+esc(r.name||'—')+'</span><span class="stxv4-rowsub">'+esc(r.email||'—')+'</span></td><td>'+esc(r.organisation||'—')+'</td><td>'+esc(String(r.type||'').replace(/_/g,' '))+'</td><td>'+status(r.product||(/scoutlink/i.test(r.source||'')?'ScoutLink':'Stratex Analytics'),/scoutlink/i.test(String(r.product||r.source||''))?'green':'blue')+'</td><td>'+status(r.status||'new',statusColor(r.status||'new'))+'</td><td>'+esc(date(r.createdAt))+'</td><td>'+btn('Open','small','data-open-crm="'+i+'"')+'</td></tr>'; }));
    root.querySelectorAll('[data-open-crm]').forEach(function(b){b.addEventListener('click',function(){openCrm(Number(b.dataset.openCrm));});});
    root.querySelectorAll('tr[data-crm-id]').forEach(function(tr){tr.addEventListener('click',function(e){if(e.target.closest('button,a'))return;openCrm(Number(tr.dataset.row));});});
  }
  function openCrm(index){
    var r=(state.data.crm||[])[index];if(!r)return;
    document.getElementById('stxv4CrmDetail').innerHTML=detail(r.name,[r.source,r.type].filter(Boolean).join(' · '),[['Primary email',r.email],['Phone',r.phone],['Organisation',r.organisation],['Product',r.product],['Status',r.status],['Linked lead',r.linkedLeadId],['Linked registration',r.linkedRegistrationId],['Linked account',r.linkedAccountId],['Account type',r.linkedAccountType],['Application ref',r.applicationRef],['Created',date(r.createdAt)]],r.email?'<a class="stxv4-btn small primary" href="mailto:'+esc(r.email)+'">Email contact</a>':'',note('green','Stratex parent-company link','ScoutLink registrations and product accounts remain connected to the central Stratex CRM.'));
  }
  function openAddContact(){
    openModal('Add CRM contact','<form id="stxv4AddContactForm"><div class="stxv4-formgrid">'+field('First name','firstName','text','',false)+field('Last name','lastName','text','',false)+field('Email','email','email','',false)+field('Phone','phone','tel','',false)+field('Organisation','organisation','text','',true)+field('Message / next action','message','textarea','Added internally through Stratex CRM.',true)+'</div><div class="stxv4-message" id="stxv4AddContactMessage"></div><div class="stxv4-actions" style="margin-top:11px">'+btn('Save contact','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4AddContactForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget);try{await api('POST','/api/stratex-website/contact',{firstName:fd.get('firstName'),lastName:fd.get('lastName'),email:fd.get('email'),phone:fd.get('phone'),organisation:fd.get('organisation'),reason:'Internal CRM contact',message:fd.get('message'),sourcePage:'/admin/crm',consentContact:true,consentText:'Internal Stratex CRM record created by an authorised administrator.',consentVersion:'2026-07-stratex-admin-v1'});showMessage('stxv4AddContactMessage','Contact saved to the Stratex CRM.',true);setTimeout(function(){closeModal();loadCrm();},500);}catch(err){showMessage('stxv4AddContactMessage',err.message,false);}});
  }
  function pageActivity(){
    return pageHead('Website Activity','Headline metrics for the public Stratex website only.',btn('Refresh','','id="stxv4RefreshActivity"'))+
      '<div class="stxv4-metrics">'+metric('Page views','—','Public pages','','stxv4ActivityViews')+metric('Sessions','—','All sources','blue','stxv4ActivitySessions')+metric('Unique visitors','—','Deduplicated','gold','stxv4ActivityVisitors')+'</div>'+
      '<section class="stxv4-card" style="margin-bottom:11px">'+cardHead('Traffic trend','Last 30 days')+'<div class="stxv4-cardbody" id="stxv4ActivityChart">'+loading()+'</div></section>'+
      '<section class="stxv4-card">'+cardHead('Page performance','Public Stratex routes')+'<div class="stxv4-cardbody" id="stxv4ActivityRows">'+loading()+'</div></section><div id="stxv4ActivityDetail"></div>';
  }
  async function loadActivity(){
    try{var data=await api('GET','/api/stratex-website/activity?range=30');state.data.activity=data.pages||[];state.data.activityDaily=data.daily||[];document.getElementById('stxv4ActivityViews').textContent=num(data.summary&&data.summary.pageViews);document.getElementById('stxv4ActivitySessions').textContent=num(data.summary&&data.summary.sessions);document.getElementById('stxv4ActivityVisitors').textContent=num(data.summary&&data.summary.visitors);renderActivityChart();renderActivityRows();}catch(err){document.getElementById('stxv4ActivityRows').innerHTML=empty(err.message);document.getElementById('stxv4ActivityChart').innerHTML=empty('Traffic trend unavailable.');}
  }
  function renderActivityChart(){
    var rows=(state.data.activityDaily&&state.data.activityDaily.length?state.data.activityDaily:state.data.activity||[]).slice(-14),values=rows.map(function(x){return Number(x.views||0);});if(!values.length){document.getElementById('stxv4ActivityChart').innerHTML=empty('No public website activity in this period.');return;}var max=Math.max.apply(Math,values.concat([1]));var points=values.map(function(v,i){var x=25+(710*(i/(Math.max(values.length-1,1))));var y=145-(110*(v/max));return x.toFixed(1)+','+y.toFixed(1);}).join(' ');document.getElementById('stxv4ActivityChart').innerHTML='<svg viewBox="0 0 760 170" width="100%" height="170" role="img" aria-label="Public website traffic trend"><line x1="25" y1="145" x2="735" y2="145" stroke="#dbe4ed"/><line x1="25" y1="95" x2="735" y2="95" stroke="#edf1f4"/><line x1="25" y1="45" x2="735" y2="45" stroke="#edf1f4"/><polyline fill="none" stroke="#0e9f78" stroke-width="4" points="'+points+'"/></svg>';
  }
  function renderActivityRows(){
    var root=document.getElementById('stxv4ActivityRows'),rows=state.data.activity||[];root.innerHTML=table(['Page','Path','Page views','Sessions','Unique visitors','Last seen'],rows.map(function(r,i){return'<tr data-row="'+i+'" data-activity-index="'+i+'"><td><span class="stxv4-rowtitle">'+esc(r.pageTitle||r.page||'Page')+'</span></td><td>'+esc(r.page||'—')+'</td><td>'+num(r.views)+'</td><td>'+num(r.sessions)+'</td><td>'+num(r.visitors)+'</td><td>'+esc(date(r.lastSeen))+'</td></tr>'; }));root.querySelectorAll('[data-activity-index]').forEach(function(tr){tr.addEventListener('click',function(){var r=rows[Number(tr.dataset.activityIndex)];document.getElementById('stxv4ActivityDetail').innerHTML=detail(r.pageTitle||r.page,r.page,[['Page views',num(r.views)],['Sessions',num(r.sessions)],['Unique visitors',num(r.visitors)],['Last seen',date(r.lastSeen)],['Top referrer',r.topReferrer||'Direct / unknown']],'<a class="stxv4-btn small primary" href="'+esc(r.page||'/')+'" target="_blank" rel="noopener">Open public page</a>');});});
  }

  function pageBlog(){
    return pageHead('Blog / Learning Centre','Write, upload the article image and preview the exact public /learning-centre/:slug presentation.',btn('Save draft','','id="stxv4SaveDraft"')+btn('Publish article','primary','id="stxv4PublishArticle"'))+
      '<div class="stxv4-editor"><form class="stxv4-card" id="stxv4BlogForm">'+cardHead('Write a Learning Centre article','Draft')+'<div class="stxv4-cardbody"><div class="stxv4-formgrid">'+
      field('Title','title','text','',true)+field('Slug','slug','text','',true,'Public URL: /learning-centre/:slug')+
      field('Category','category','select','For coaches',false,'',[['For coaches','For coaches'],['For scouts','For scouts'],['For families','For families'],['Product guide','Product guide'],['Safeguarding','Safeguarding']])+
      field('Author','author','text',fullName(user()),false)+field('Excerpt','excerpt','textarea','',true,'Shown on article cards and search previews.')+
      '<label class="stxv4-field full"><span>Featured image</span><div class="stxv4-upload"><div class="stxv4-uploadicon">↑</div><strong id="stxv4BlogImageName">Upload article image</strong><span>JPG, PNG or WebP · 1600 × 900 recommended</span><input id="stxv4BlogImage" name="image" type="file" accept="image/jpeg,image/png,image/webp" style="margin-top:8px"></div></label>'+
      field('Image alt text','imageAlt','text','',true,'Required for accessibility.')+
      '<label class="stxv4-field full"><span>Article body</span><div class="stxv4-toolbar">'+['H2','B','I','•','1.','↗'].map(function(x,i){return'<button class="stxv4-tool" type="button" data-editor="'+['heading','bold','italic','bullet','number','link'][i]+'">'+x+'</button>';}).join('')+'</div><textarea class="stxv4-textarea" id="stxv4BlogBody" name="body" style="min-height:235px;border-radius:0 0 7px 7px"></textarea></label>'+
      field('SEO title','seoTitle','text','',true)+field('Meta description','metaDescription','textarea','',true)+field('Canonical URL','canonicalUrl','url','',true,'Generated from the slug unless changed.')+
      field('Indexing','indexing','select','index',false,'',[['index','Index when published'],['noindex','Keep noindex']])+
      '<input type="hidden" name="featuredImageUrl"><input type="hidden" name="status" value="draft"></div><div class="stxv4-message" id="stxv4BlogMessage"></div></div></form>'+
      '<aside class="stxv4-grid"><section class="stxv4-preview"><div class="stxv4-previewimage" id="stxv4BlogPreviewImage"><div><small id="stxv4BlogPreviewCategory">Learning Centre</small><h3 id="stxv4BlogPreviewTitle">Article title preview</h3></div></div><div class="stxv4-previewbody"><p id="stxv4BlogPreviewExcerpt">The article excerpt will appear here.</p></div></section>'+
      '<section class="stxv4-card">'+cardHead('Publishing checks','')+'<div class="stxv4-cardbody">'+toggle('Featured image added','Used on card and article hero.',false,'blog-image')+toggle('Slug available','Checked when the post saves.',true,'blog-slug')+toggle('SEO metadata complete','Ready for search preview.',false,'blog-seo')+toggle('Include in sitemap','Only when published.',true,'blog-sitemap')+'</div></section></aside></div>'+
      '<section class="stxv4-card" style="margin-top:11px">'+cardHead('Previous posts','Published, draft and archived')+'<div class="stxv4-cardbody" id="stxv4BlogRows">'+loading()+'</div></section><div id="stxv4BlogDetail"></div>';
  }
  async function loadBlog(){
    bindBlogForm();
    var root=document.getElementById('stxv4BlogRows');try{var data=await api('GET','/api/stratex-website/blog');state.data.blog=data.data||[];renderBlogRows();}catch(err){root.innerHTML=empty(err.message);}
  }
  function bindBlogForm(){
    var form=document.getElementById('stxv4BlogForm');
    if(!form||form.dataset.bound==='1')return;
    form.dataset.bound='1';
    var title=form.querySelector('[name="title"]'),slugNode=form.querySelector('[name="slug"]'),category=form.querySelector('[name="category"]'),excerpt=form.querySelector('[name="excerpt"]'),image=form.querySelector('#stxv4BlogImage');
    function preview(){if(!slugNode.value)slugNode.value=slug(title.value);document.getElementById('stxv4BlogPreviewTitle').textContent=title.value||'Article title preview';document.getElementById('stxv4BlogPreviewCategory').textContent=(category.value||'Learning')+' · Learning Centre';document.getElementById('stxv4BlogPreviewExcerpt').textContent=excerpt.value||'The article excerpt will appear here.';form.querySelector('[name="canonicalUrl"]').value='https://www.stratexanalytics.co.uk/learning-centre/'+slugNode.value;}
    [title,slugNode,category,excerpt].forEach(function(n){n.addEventListener('input',preview);});
    image.addEventListener('change',function(){var file=image.files&&image.files[0];if(!file)return;document.getElementById('stxv4BlogImageName').textContent=file.name;var reader=new FileReader();reader.onload=function(){document.getElementById('stxv4BlogPreviewImage').style.backgroundImage='linear-gradient(rgba(7,17,31,.15),rgba(7,17,31,.15)),url("'+reader.result+'")';};reader.readAsDataURL(file);});
    document.querySelectorAll('[data-editor]').forEach(function(b){b.addEventListener('click',function(){var ta=document.getElementById('stxv4BlogBody'),start=ta.selectionStart||0,end=ta.selectionEnd||0,sel=ta.value.slice(start,end)||'text',cmd=b.dataset.editor,next=sel;if(cmd==='heading')next='## '+sel.replace(/^#+\s*/,'');if(cmd==='bold')next='**'+sel+'**';if(cmd==='italic')next='*'+sel+'*';if(cmd==='bullet')next=sel.split(/\n/).map(function(x){return'- '+x;}).join('\n');if(cmd==='number')next=sel.split(/\n/).map(function(x,i){return(i+1)+'. '+x;}).join('\n');if(cmd==='link')next='['+sel+'](https://)';ta.value=ta.value.slice(0,start)+next+ta.value.slice(end);ta.focus();});});
    document.getElementById('stxv4SaveDraft').addEventListener('click',function(){saveBlog('draft');});
    document.getElementById('stxv4PublishArticle').addEventListener('click',function(){saveBlog('published');});
    preview();
  }
  async function uploadBlogImage(file){
    if(!file)return'';var fd=new FormData();fd.append('image',file);var res=await fetch(API+'/api/stratex-website/blog/image',{method:'POST',headers:{Authorization:'Bearer '+token()},body:fd});var data=await res.json().catch(function(){return{};});if(!res.ok)throw new Error(data.error||'Could not upload article image.');return data.url||'';
  }
  async function saveBlog(statusValue){
    var form=document.getElementById('stxv4BlogForm'),fd=new FormData(form),button=statusValue==='published'?document.getElementById('stxv4PublishArticle'):document.getElementById('stxv4SaveDraft');button.disabled=true;
    try{var file=form.querySelector('[name="image"]').files[0];if(file)fd.set('featuredImageUrl',await uploadBlogImage(file));var payload={title:fd.get('title'),slug:fd.get('slug')||slug(fd.get('title')),category:fd.get('category'),excerpt:fd.get('excerpt'),body:fd.get('body'),status:statusValue,featuredImageUrl:fd.get('featuredImageUrl'),imageAlt:fd.get('imageAlt'),seoTitle:fd.get('seoTitle'),metaDescription:fd.get('metaDescription'),canonicalUrl:fd.get('canonicalUrl'),indexWhenPublished:fd.get('indexing')==='index'};var id=state.selected.blogId;if(id)await api('PATCH','/api/stratex-website/blog/'+encodeURIComponent(id),payload);else{var saved=await api('POST','/api/stratex-website/blog',payload);state.selected.blogId=saved.data&&saved.data.id;}showMessage('stxv4BlogMessage',statusValue==='published'?'Article published.':'Draft saved.',true);await loadBlog();}catch(err){showMessage('stxv4BlogMessage',err.message,false);}finally{button.disabled=false;}
  }
  function renderBlogRows(){
    var rows=state.data.blog||[],root=document.getElementById('stxv4BlogRows');root.innerHTML=table(['Title / URL','Category','Status','Views','Likes','Updated','Actions'],rows.map(function(r,i){return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(r.title)+'</span><span class="stxv4-rowsub">/learning-centre/'+esc(r.slug)+'</span></td><td>'+esc(r.category||'Learning')+'</td><td>'+status(r.status,statusColor(r.status))+'</td><td>'+num(r.view_count)+'</td><td>'+num(r.like_count)+'</td><td>'+esc(date(r.updated_at||r.published_at||r.created_at))+'</td><td><div class="stxv4-actions"><a class="stxv4-btn small" href="/learning-centre/'+encodeURIComponent(r.slug||'')+'" target="_blank" rel="noopener">View</a>'+btn('Edit','small primary','data-edit-blog="'+i+'"')+btn('Archive','small red','data-archive-blog="'+esc(r.id)+'"')+'</div></td></tr>'; }));root.querySelectorAll('[data-edit-blog]').forEach(function(b){b.addEventListener('click',function(){editBlog(rows[Number(b.dataset.editBlog)]);});});root.querySelectorAll('[data-archive-blog]').forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Archive this post and remove it from public listings?'))return;try{await api('DELETE','/api/stratex-website/blog/'+encodeURIComponent(b.dataset.archiveBlog));await loadBlog();}catch(err){alert(err.message);}});});
  }
  async function editBlog(row){
    state.selected.blogId=row.id;var form=document.getElementById('stxv4BlogForm');var full=row;try{var adminPost=await api('GET','/api/stratex-website/blog/admin/'+encodeURIComponent(row.id));full=Object.assign({},row,adminPost.data||{});}catch(_){}
    ['title','slug','category','excerpt','body'].forEach(function(k){var n=form.querySelector('[name="'+k+'"]');if(n)n.value=full[k]||'';});
    [['featuredImageUrl','featured_image_url'],['imageAlt','image_alt'],['seoTitle','seo_title'],['metaDescription','meta_description'],['canonicalUrl','canonical_url']].forEach(function(p){var n=form.querySelector('[name="'+p[0]+'"]');if(n)n.value=full[p[1]]||'';});
    document.getElementById('stxv4BlogPreviewTitle').textContent=full.title||'';document.getElementById('stxv4BlogPreviewExcerpt').textContent=full.excerpt||'';document.getElementById('stxv4BlogPreviewCategory').textContent=(full.category||'Learning')+' · Learning Centre';if(full.featured_image_url)document.getElementById('stxv4BlogPreviewImage').style.backgroundImage='linear-gradient(rgba(7,17,31,.15),rgba(7,17,31,.15)),url("'+full.featured_image_url+'")';form.scrollIntoView({behavior:'smooth'});
  }
  function pageLeadership(){
    return pageHead('Leadership','Manage the public leadership profiles, images and ordering.',btn('Add profile','primary','id="stxv4AddLeadership"'))+
      '<section class="stxv4-card">'+cardHead('Leadership profiles','<a class="stxv4-btn small" href="/leadership" target="_blank" rel="noopener">Public Leadership</a>')+'<div class="stxv4-cardbody" id="stxv4LeadershipRows">'+loading()+'</div></section><div id="stxv4LeadershipDetail"></div>';
  }
  async function loadLeadership(){
    var add=document.getElementById('stxv4AddLeadership');if(add&&add.dataset.bound!=='1'){add.dataset.bound='1';add.addEventListener('click',function(){openLeadershipForm(null);});}
    try{var data=await api('GET','/api/stratex-website/leadership');state.data.leadership=data.data||[];renderLeadershipRows();}catch(err){document.getElementById('stxv4LeadershipRows').innerHTML=empty(err.message);}
  }
  function renderLeadershipRows(){
    var rows=state.data.leadership||[],root=document.getElementById('stxv4LeadershipRows');root.innerHTML=table(['Image','Name / Role','Department','Email action','Visibility','Order','Action'],rows.map(function(r,i){return'<tr data-row="'+i+'"><td>'+(r.image_url?'<img src="'+esc(r.image_url)+'" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover">':'')+'</td><td><span class="stxv4-rowtitle">'+esc(r.full_name)+'</span><span class="stxv4-rowsub">'+esc(r.job_title||'')+'</span></td><td>'+esc(r.focus_chip||r.permission_role||'Leadership')+'</td><td>'+esc(r.email||'—')+'</td><td>'+status(r.is_active===false?'Hidden':'Public',r.is_active===false?'grey':'green')+'</td><td>'+esc(r.display_order||'—')+'</td><td>'+btn('Edit','small primary','data-edit-leader="'+i+'"')+'</td></tr>'; }));root.querySelectorAll('[data-edit-leader]').forEach(function(b){b.addEventListener('click',function(){openLeadershipForm(rows[Number(b.dataset.editLeader)]);});});
  }
  function openLeadershipForm(row){
    row=row||{};var title=row.id?'Edit '+(row.full_name||'leadership member'):'Add leadership profile';
    var body='<form id="stxv4LeadershipForm"><div class="stxv4-formgrid">'+field('Full name','fullName','text',row.full_name||'',false)+field('Public role','jobTitle','text',row.job_title||'',false)+field('Department / profile chip','focusChip','text',row.focus_chip||'',false)+field('Profile order','displayOrder','number',row.display_order||100,false)+field('Short description','summary','textarea',row.summary||'',true)+field('Full biography','bio','textarea',row.bio||'',true)+
      '<label class="stxv4-field"><span>Profile image</span><input class="stxv4-input" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>'+
      field('Image URL','imageUrl','url',row.image_url||'',false)+field('Email action','email','email',row.email||'',false)+field('LinkedIn URL','linkedinUrl','url',row.linkedin_url||'',false)+
      field('Visibility','isActive','select',row.is_active===false?'false':'true',false,'',[['true','Public'],['false','Hidden']])+'</div><div class="stxv4-message" id="stxv4LeadershipMessage"></div><div class="stxv4-actions" style="margin-top:11px">'+btn('Save profile','primary','type="submit"')+'</div></form>';
    openModal(title,body);document.getElementById('stxv4LeadershipForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),imageUrl=fd.get('imageUrl'),file=fd.get('imageFile');try{if(file&&file.name){var upload=new FormData();upload.append('image',file);upload.append('name',fd.get('fullName'));var res=await fetch(API+'/api/stratex-website/leadership/image',{method:'POST',headers:{Authorization:'Bearer '+token()},body:upload});var json=await res.json().catch(function(){return{};});if(!res.ok)throw new Error(json.error||'Could not upload image.');imageUrl=json.url;}var payload={fullName:fd.get('fullName'),jobTitle:fd.get('jobTitle'),focusChip:fd.get('focusChip'),displayOrder:Number(fd.get('displayOrder')||100),summary:fd.get('summary'),bio:fd.get('bio'),imageUrl:imageUrl,email:fd.get('email'),linkedinUrl:fd.get('linkedinUrl'),permissionRole:'Management',isActive:fd.get('isActive')==='true'};if(row.id)await api('PATCH','/api/stratex-website/leadership/'+encodeURIComponent(row.id),payload);else await api('POST','/api/stratex-website/leadership',payload);showMessage('stxv4LeadershipMessage','Leadership profile saved.',true);setTimeout(function(){closeModal();loadLeadership();},400);}catch(err){showMessage('stxv4LeadershipMessage',err.message,false);}});
  }
  function pageOrg(){
    return pageHead('Org Charts','A hierarchy based on reporting managers, not access levels.',isRichdhin()?btn('Add Stratex User','primary','data-page-nav="add-user"'):'')+
      '<section class="stxv4-card">'+cardHead('Stratex Analytics organisation','Reporting lines')+'<div class="stxv4-org" id="stxv4OrgRows">'+loading()+'</div></section>';
  }
  async function fetchOrg(){var data=await api('GET','/api/stratex/org');state.data.org=data;return data;}
  async function loadOrg(){try{var data=await fetchOrg();renderOrg(data.admins||[]);}catch(err){document.getElementById('stxv4OrgRows').innerHTML=empty(err.message);}}
  function personCard(r){return'<div class="stxv4-person"><b>'+esc(fullName(r))+'</b><span>'+esc(r.job_title||r.admin_role||r.role||'Stratex Analytics')+'</span><span>'+esc(r.email||'')+'</span></div>';}
  function renderOrg(admins){
    var by={};admins.forEach(function(a){var key=a.manager_id||'root';(by[key]=by[key]||[]).push(a);});var roots=admins.filter(function(a){return !a.manager_id;});
    function branch(r){var children=by[r.id]||[];return'<div class="stxv4-branch">'+personCard(r)+(children.length?'<div class="stxv4-orgline"></div><div class="stxv4-subs">'+children.map(branch).join('')+'</div>':'')+'</div>';}
    document.getElementById('stxv4OrgRows').innerHTML=roots.length?'<div class="stxv4-reports" style="display:block">'+roots.map(branch).join('')+'</div>':empty('No organisation records yet.');
  }

  function pageAddUser(){
    if(!isRichdhin())return pageHead('Add Stratex User','Only Richdhin Inaba can create internal Stratex users.')+note('red','Access restricted','The authenticated account is not the fixed Stratex Super Admin.');
    return pageHead('Add Stratex User','Create the internal account, set the reporting manager and update the organisation hierarchy immediately.',btn('Create user and send login code','primary','id="stxv4CreateUserTop"'))+
      '<div class="stxv4-grid two"><section class="stxv4-card">'+cardHead('User and reporting details','Internal Stratex staff only')+'<div class="stxv4-cardbody"><form id="stxv4AddUserForm"><div class="stxv4-formgrid">'+
      field('First name','firstName','text','',false)+field('Last name','lastName','text','',false)+field('Stratex email','emailAddr','email','',true)+field('Job title','jobTitle','text','',false)+
      field('Department','department','select','Customer Operations',false,'',[['Customer Operations','Customer Operations'],['Football Strategy & Growth','Football Strategy & Growth'],['Product','Product'],['Executive','Executive'],['Finance','Finance'],['Legal & Compliance','Legal & Compliance']])+
      field('Reporting manager','managerId','select','',false,'This controls the Org Chart position.',[['','No manager']])+field('Access level','adminRole','select','Employee',false,'',[['Employee','Standard Admin'],['Management','Manager Admin']])+
      field('Start date','startDate','date','',false)+field('Employment status','employmentStatus','select','Employee',false,'',[['Intern','Intern'],['Employee','Employee'],['Contractor','Contractor'],['Advisor','Advisor']])+
      field('Welcome note','welcomeNote','textarea','Welcome to Stratex Analytics. Use the secure login code to complete your Stratex Admin account.',true,'Included in the invitation email.')+'</div>'+
      toggle('Send Stratex Admin login-code email','Send immediately after the user is created.',true,'invite-email')+
      toggle('Require password setup','The user must set a password after verifying the code.',true,'invite-password')+
      toggle('Add to Org Chart immediately','Place the user beneath the selected reporting manager.',true,'invite-org')+
      '<div class="stxv4-message" id="stxv4AddUserMessage"></div><button class="stxv4-btn primary" type="submit" style="width:100%;margin-top:13px">Create user and send login code</button></form></div></section>'+
      '<aside class="stxv4-grid"><section class="stxv4-card">'+cardHead('Hierarchy impact','Updates from the reporting manager')+'<div class="stxv4-cardbody"><div id="stxv4HierarchyPreview">'+empty('Select a reporting manager to preview the hierarchy position.')+'</div></div></section>'+
      '<section class="stxv4-card">'+cardHead('Invitation email preview','Stratex Admin template')+'<div class="stxv4-cardbody"><div style="padding:17px;background:#07111f;color:#fff"><b style="font-size:8px">STRATEX ADMIN</b><h3 style="font-size:17px;margin:18px 0 7px">Your internal account is ready.</h3><p style="font-size:9px;color:#c6d5e2;line-height:1.5">The new user receives a one-time code and must set a private Stratex Admin password.</p><div style="margin:16px 0;padding:12px;background:#fff;color:#07111f;text-align:center;font-size:22px;font-weight:950;letter-spacing:6px">482 916</div><div class="stxv4-btn primary" style="width:100%">Complete Stratex Admin setup</div><p style="font-size:8px;color:#90a7b9">ScoutLink login details are not used.</p></div></div></section></aside></div>';
  }
  async function loadAddUser(){
    if(!isRichdhin())return;
    try{var data=await fetchOrg();var select=document.querySelector('#stxv4AddUserForm [name="managerId"]');select.innerHTML='<option value="">No manager</option>'+(data.admins||[]).filter(function(a){return a.is_active!==false;}).map(function(a){return'<option value="'+esc(a.id)+'">'+esc(fullName(a)+' · '+(a.job_title||a.admin_role||a.role||''))+'</option>';}).join('');select.addEventListener('change',renderHierarchyPreview);renderHierarchyPreview();}catch(_){}
    var form=document.getElementById('stxv4AddUserForm');document.getElementById('stxv4CreateUserTop').addEventListener('click',function(){form.requestSubmit();});
    form.addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(form);var payload={firstName:fd.get('firstName'),lastName:fd.get('lastName'),emailAddr:fd.get('emailAddr'),jobTitle:fd.get('jobTitle'),managerId:fd.get('managerId')||null,adminRole:fd.get('adminRole')};try{var result=await api('POST','/api/stratex/admins',payload);showMessage('stxv4AddUserMessage',(result.message||'Stratex Admin user created and invitation sent.')+(result.loginCode?' Login code: '+result.loginCode:''),true);await fetchOrg();renderHierarchyPreview();}catch(err){showMessage('stxv4AddUserMessage',err.message,false);}});
  }
  function renderHierarchyPreview(){
    var form=document.getElementById('stxv4AddUserForm'),root=document.getElementById('stxv4HierarchyPreview');if(!form||!root)return;var fd=new FormData(form),manager=(state.data.org&&state.data.org.admins||[]).find(function(a){return String(a.id)===String(fd.get('managerId'));});var name=[fd.get('firstName'),fd.get('lastName')].filter(Boolean).join(' ')||'New Stratex user';root.innerHTML='<div style="text-align:center">'+(manager?personCard(manager)+'<div class="stxv4-orgline"></div>':'')+'<div class="stxv4-person"><b>'+esc(name)+'</b><span>'+esc(fd.get('jobTitle')||'New role')+'</span></div></div>';
  }
  function pagePermissions(){
    if(!isRichdhin())return pageHead('Permissions','Only Richdhin Inaba can edit Stratex Admin permissions.')+note('red','Permission editing locked','Only the fixed Super Admin can change access levels or section permissions.');
    return pageHead('Permissions','Only Richdhin Inaba can edit Stratex Admin permissions. Other admins can view their effective access.',btn('Save permission changes','primary','id="stxv4SavePermissions"'))+
      note('green','Super Admin access confirmed','You are signed in as richdhin@stratexanalytics.co.uk. Changes are enforced by the backend and recorded in the audit log.')+
      '<section class="stxv4-card" style="margin-top:11px">'+cardHead('Permission matrix','View, Create, Edit and Delete')+'<div class="stxv4-cardbody"><div class="stxv4-formgrid" style="margin-bottom:11px">'+field('User being edited','permissionUser','select','',false,'',[['','Loading users…']])+field('Access level','permissionRole','select','Employee',false,'',[['Employee','Standard Admin'],['Management','Manager Admin']])+'</div><div id="stxv4PermissionMatrix">'+loading()+'</div><div class="stxv4-message" id="stxv4PermissionMessage"></div></div></section>';
  }
  var PERM_AREAS=[
    ['dashboard','Dashboard'],['registrations','Registrations'],['contact_forms','Contact Forms'],['crm','CRM'],['website_activity','Website Activity'],
    ['content','Blog / Learning Centre'],['leadership','Leadership'],['org','Org Charts'],['contracts','Contracts & Pay'],['hiring','Hiring'],
    ['trust','Trust & Concerns'],['settings','Settings'],['showcase','Showcase Event'],['awards','Award Ceremonies']
  ];
  async function loadPermissions(){
    if(!isRichdhin())return;
    try{var data=await fetchOrg();state.data.permissionAdmins=data.admins||[];var select=document.querySelector('[name="permissionUser"]');var candidates=state.data.permissionAdmins.filter(function(a){return String(a.email||'').toLowerCase()!==RICHDHIN;});select.innerHTML=candidates.map(function(a){return'<option value="'+esc(a.id)+'">'+esc(fullName(a)+' · '+(a.job_title||a.admin_role||a.role||''))+'</option>';}).join('')||'<option value="">No editable users</option>';select.addEventListener('change',renderPermissionMatrix);document.querySelector('[name="permissionRole"]').addEventListener('change',function(){state.selected.permissionRole=this.value;});document.getElementById('stxv4SavePermissions').addEventListener('click',savePermissions);renderPermissionMatrix();}catch(err){document.getElementById('stxv4PermissionMatrix').innerHTML=empty(err.message);}
  }
  function permissionAdmin(){var id=document.querySelector('[name="permissionUser"]')&&document.querySelector('[name="permissionUser"]').value;return(state.data.permissionAdmins||[]).find(function(a){return String(a.id)===String(id);});}
  function renderPermissionMatrix(){
    var admin=permissionAdmin();if(!admin){document.getElementById('stxv4PermissionMatrix').innerHTML=empty('No editable users.');return;}var perms=Array.isArray(admin.permissions)?admin.permissions.map(function(x){return String(x).toLowerCase();}):[];state.selected.permissions=perms.slice();state.selected.permissionRole=/management/i.test(String(admin.admin_role||admin.role||''))?'Management':'Employee';document.querySelector('[name="permissionRole"]').value=state.selected.permissionRole;
    var rows=PERM_AREAS.map(function(a){var on=perms.indexOf(a[0])>=0||a[0]==='dashboard';return'<tr><td><span class="stxv4-rowtitle">'+esc(a[1])+'</span></td>'+['view','create','edit','delete'].map(function(kind){var enabled=kind==='view'?on:(on&&state.selected.permissionRole==='Management'&&!['dashboard','website_activity'].includes(a[0]));var locked=a[0]==='dashboard'&&kind==='view';return'<td><button class="stxv4-check '+(enabled?'on ':'')+(locked?'locked':'')+'" type="button" data-permission="'+esc(a[0])+'" data-kind="'+kind+'" '+(locked?'disabled':'')+'>'+(enabled?'✓':'')+'</button></td>';}).join('')+'</tr>';});
    document.getElementById('stxv4PermissionMatrix').innerHTML=table(['Admin area','View','Create','Edit','Delete'],rows).replace('class="stxv4-table"','class="stxv4-table stxv4-perm"');
    document.querySelectorAll('[data-permission]').forEach(function(b){b.addEventListener('click',function(){var key=b.dataset.permission;var on=b.classList.toggle('on');b.textContent=on?'✓':'';if(b.dataset.kind==='view'){var i=state.selected.permissions.indexOf(key);if(on&&i<0)state.selected.permissions.push(key);if(!on&&i>=0)state.selected.permissions.splice(i,1);document.querySelectorAll('[data-permission="'+CSS.escape(key)+'"]:not([data-kind="view"])').forEach(function(x){x.classList.toggle('on',on&&state.selected.permissionRole==='Management');x.textContent=x.classList.contains('on')?'✓':'';});}});});
  }
  async function savePermissions(){
    var admin=permissionAdmin();if(!admin){showMessage('stxv4PermissionMessage','Choose a Stratex user.',false);return;}try{await api('PATCH','/api/stratex/admins/'+encodeURIComponent(admin.id)+'/permissions',{adminRole:document.querySelector('[name="permissionRole"]').value,permissions:state.selected.permissions||[]});showMessage('stxv4PermissionMessage','Permissions updated successfully.',true);var refreshed=await fetchOrg();state.data.permissionAdmins=refreshed.admins||[];renderPermissionMatrix();}catch(err){showMessage('stxv4PermissionMessage',err.message,false);}
  }
  function pageProfile(){
    return pageHead('My Profile','Your Stratex role, reporting lines and internal access information.',btn('Change password','','id="stxv4ChangePassword"')+btn('Edit profile','primary','id="stxv4EditProfile"'))+
      '<div class="stxv4-grid two"><section class="stxv4-card">'+cardHead('Stratex profile','Internal record')+'<div class="stxv4-cardbody" id="stxv4ProfileRecord">'+loading()+'</div></section><section class="stxv4-card">'+cardHead('Related records','Reporting and private records')+'<div class="stxv4-cardbody" id="stxv4ProfileRelated">'+loading()+'</div></section></div>';
  }
  async function loadProfile(){
    var passwordButton=document.getElementById('stxv4ChangePassword');if(passwordButton&&passwordButton.dataset.bound!=='1'){passwordButton.dataset.bound='1';passwordButton.addEventListener('click',openPasswordModal);}
    try{var data=await fetchOrg(),admins=data.admins||[],self=admins.find(function(a){return String(a.id)===String(user().id);})||data.currentAdmin||user(),manager=admins.find(function(a){return String(a.id)===String(self.manager_id);}),reports=admins.filter(function(a){return String(a.manager_id)===String(self.id);});state.selected.profile=self;
      document.getElementById('stxv4ProfileRecord').innerHTML='<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><div class="stxv4-avatar" style="width:50px;height:50px;font-size:12px">'+esc(initials(self))+'</div><div><h3 style="margin:0;font-size:14px">'+esc(fullName(self))+'</h3><p style="margin:4px 0;color:var(--stxv4-muted);font-size:9px">'+esc(self.job_title||self.admin_role||self.role||'Stratex Analytics')+'</p>'+status(roleLabel(self),isRichdhin()?'purple':'blue')+' '+status(self.is_active===false?'Inactive':'Active',self.is_active===false?'red':'green')+'</div></div>'+
      '<div class="stxv4-detailgrid" style="padding:0;grid-template-columns:1fr 1fr">'+[['Email',self.email],['Department',self.department||'—'],['Reports to',manager?fullName(manager):'No manager'],['Direct reports',reports.length?reports.map(fullName).join(', '):'None'],['Admin access',roleLabel(self)],['ScoutLink profile','Separate']].map(function(x){return'<div class="stxv4-detailitem"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';}).join('')+'</div>';
      document.getElementById('stxv4ProfileRelated').innerHTML='<div class="stxv4-card" style="box-shadow:none;margin-bottom:9px">'+cardHead('Contract and pay',btn('Open','small','data-page-nav="contracts"'))+'<div class="stxv4-cardbody" style="font-size:9px;color:var(--stxv4-muted)">Open your private contract and pay record.</div></div><div class="stxv4-card" style="box-shadow:none">'+cardHead('Direct reports',btn('Open','small','data-page-nav="org"'))+'<div class="stxv4-cardbody" style="font-size:9px;color:var(--stxv4-muted)">'+esc(reports.length?reports.map(fullName).join(', '):'No direct reports')+'</div></div>';bindCommonPage();
      var editButton=document.getElementById('stxv4EditProfile');if(editButton&&editButton.dataset.bound!=='1'){editButton.dataset.bound='1';editButton.addEventListener('click',function(){if(isRichdhin())openEditProfile(state.selected.profile,state.data.org&&state.data.org.admins||admins);else navigate('settings',true);});}
    }catch(err){document.getElementById('stxv4ProfileRecord').innerHTML=empty(err.message);}
  }
  function openPasswordModal(){
    openModal('Change Stratex Admin password','<form id="stxv4PasswordForm"><div class="stxv4-formgrid">'+field('New password','password','password','',true)+field('Confirm new password','confirm','password','',true)+'</div><div class="stxv4-message" id="stxv4PasswordMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save password','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4PasswordForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),p=String(fd.get('password')||''),c=String(fd.get('confirm')||'');if(p.length<8){showMessage('stxv4PasswordMessage','Password must be at least eight characters.',false);return;}if(p!==c){showMessage('stxv4PasswordMessage','Passwords do not match.',false);return;}try{await api('POST','/api/auth/change-password',{password:p});showMessage('stxv4PasswordMessage','Password updated.',true);}catch(err){showMessage('stxv4PasswordMessage',err.message,false);}});
  }
  function openEditProfile(self,admins){
    openModal('Edit Stratex profile','<form id="stxv4ProfileEditForm"><div class="stxv4-formgrid">'+field('Job title','jobTitle','text',self.job_title||'',true)+field('Reporting manager','managerId','select',self.manager_id||'',true,'',[['','No manager']].concat(admins.filter(function(a){return a.id!==self.id;}).map(function(a){return[a.id,fullName(a)];})))+'</div><div class="stxv4-message" id="stxv4ProfileEditMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save profile','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4ProfileEditForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget);try{await api('PATCH','/api/stratex/admins/'+encodeURIComponent(self.id),{jobTitle:fd.get('jobTitle'),managerId:fd.get('managerId')||null});showMessage('stxv4ProfileEditMessage','Profile updated.',true);setTimeout(function(){closeModal();loadProfile();},400);}catch(err){showMessage('stxv4ProfileEditMessage',err.message,false);}});
  }
  function pageContracts(){
    return pageHead('Contracts & Pay','Private records controlled by reporting-line permissions.',btn('Upload contract','primary','id="stxv4UploadContractTop"'))+
      note('gold','Permission model','Richdhin can view leadership and both reporting lines. Directors can view themselves and their own reporting line.')+
      '<section class="stxv4-card" style="margin-top:11px">'+cardHead('Contracts and pay','Private files use short-lived secure links')+'<div class="stxv4-cardbody" id="stxv4ContractRows">'+loading()+'</div></section><div id="stxv4ContractDetail"></div>';
  }
  async function loadContracts(){
    try{var data=await api('GET','/api/stratex/contracts-pay');state.data.contracts=data.data||[];state.data.contractCanEdit=!!data.canEdit;renderContractRows();var upload=document.getElementById('stxv4UploadContractTop');if(upload&&upload.dataset.bound!=='1'){upload.dataset.bound='1';upload.addEventListener('click',function(){var first=state.data.contracts[0];if(first)openContract(first);else alert('No contract records are available.');});}}catch(err){document.getElementById('stxv4ContractRows').innerHTML=empty(err.message);}
  }
  function contractMeta(r){return r&&r.contract_data&&typeof r.contract_data==='object'?r.contract_data:{};}
  function renderContractRows(){
    var rows=state.data.contracts||[],root=document.getElementById('stxv4ContractRows');root.innerHTML=table(['Person / Role','Department','Contract','Pay','Status','Access','Action'],rows.map(function(r,i){var c=contractMeta(r);return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(fullName(r))+'</span><span class="stxv4-rowsub">'+esc(r.job_title||r.admin_role||r.role||'')+'</span></td><td>'+esc(r.department||'—')+'</td><td>'+esc(c.contractType||c.contract_type||(c.contractPath?'Uploaded':'Not uploaded'))+'</td><td>'+esc(c.payAmount?'£'+Number(c.payAmount).toLocaleString('en-GB')+(c.payFrequency?' / '+c.payFrequency:''):'Not set')+'</td><td>'+status(c.payStatus||c.status||'Active',statusColor(c.payStatus||c.status||'Active'))+'</td><td>'+status('Private','purple')+'</td><td>'+btn(state.data.contractCanEdit?'Manage':'Open','small primary','data-contract="'+i+'"')+'</td></tr>'; }));root.querySelectorAll('[data-contract]').forEach(function(b){b.addEventListener('click',function(){openContract(rows[Number(b.dataset.contract)]);});});
  }
  function openContract(r){
    var c=contractMeta(r);var actions=(c.contractPath?btn('Download private file','small','data-download-contract="'+esc(r.id)+'"'):'')+(state.data.contractCanEdit?btn('Edit pay','small primary','data-edit-contract="'+esc(r.id)+'"'):'');
    var extra=state.data.contractCanEdit?'<form id="stxv4ContractForm"><div class="stxv4-formgrid">'+field('Pay amount','payAmount','number',c.payAmount||'',false)+field('Pay frequency','payFrequency','select',c.payFrequency||'',false,'',[['','Select frequency'],['Hourly','Hourly'],['Daily','Daily'],['Weekly','Weekly'],['Monthly','Monthly'],['Annually','Annually']])+field('Status','status','select',c.payStatus||c.status||'Active',false,'',[['Active','Active'],['Draft','Draft'],['Pending review','Pending review'],['Archived','Archived']])+'<label class="stxv4-field full"><span>Upload contract PDF</span><input class="stxv4-input" name="contract" type="file" accept="application/pdf"></label></div><div class="stxv4-message" id="stxv4ContractMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save HR record','primary','type="submit"')+'</div></form>':'';
    document.getElementById('stxv4ContractDetail').innerHTML=detail(fullName(r),[r.job_title||r.admin_role||r.role,r.email].filter(Boolean).join(' · '),[['Reports to',r.manager_name||'—'],['Contract type',c.contractType||c.contract_type||'—'],['Start date',date(c.startDate||c.start_date)],['End date',date(c.endDate||c.end_date)],['Pay',c.payAmount?'£'+c.payAmount:'Not set'],['Contract file',c.contractFileName||c.fileName||(c.contractPath?'Uploaded':'Not uploaded')],['File access','Signed private URL'],['Status',c.payStatus||c.status||'Active']],actions,extra);
    var dl=document.querySelector('[data-download-contract]');if(dl)dl.addEventListener('click',async function(){try{var data=await api('GET','/api/stratex/contracts-pay/'+encodeURIComponent(r.id)+'/contract-url');if(data.url)window.open(data.url,'_blank','noopener');}catch(err){alert(err.message);}});
    var form=document.getElementById('stxv4ContractForm');if(form)form.addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(form);try{await api('PATCH','/api/stratex/contracts-pay/'+encodeURIComponent(r.id)+'/pay',{payAmount:fd.get('payAmount'),payFrequency:fd.get('payFrequency'),status:fd.get('status')});var file=fd.get('contract');if(file&&file.name){var upload=new FormData();upload.append('contract',file);await api('POST','/api/stratex/contracts-pay/'+encodeURIComponent(r.id)+'/contract',upload,true);}showMessage('stxv4ContractMessage','Contract and pay record saved.',true);await loadContracts();}catch(err){showMessage('stxv4ContractMessage',err.message,false);}});
  }

  function pageHiring(){
    return pageHead('Hiring','Roles first, then applicants inside the selected role.',btn('Add role','primary','id="stxv4AddRole"'))+
      '<section class="stxv4-card">'+cardHead('Roles','Open, draft and closed')+'<div class="stxv4-cardbody" id="stxv4HiringRows">'+loading()+'</div></section>'+
      '<section class="stxv4-card" style="margin-top:11px">'+cardHead('Applications','Select a role or applicant')+'<div class="stxv4-cardbody" id="stxv4ApplicationRows">'+loading()+'</div></section><div id="stxv4HiringDetail"></div>';
  }
  async function loadHiring(){
    var add=document.getElementById('stxv4AddRole');if(add&&add.dataset.bound!=='1'){add.dataset.bound='1';add.addEventListener('click',function(){openJobForm(null);});}
    try{var results=await Promise.allSettled([api('GET','/api/stratex/jobs'),api('GET','/api/stratex/job-applications')]);state.data.jobs=results[0].status==='fulfilled'?(results[0].value.data||[]):[];state.data.applications=results[1].status==='fulfilled'?(results[1].value.data||[]):[];renderHiringRows();}catch(err){document.getElementById('stxv4HiringRows').innerHTML=empty(err.message);}
  }
  function linkedApps(job){return(state.data.applications||[]).filter(function(a){var j=a.job_posts||{};return String(a.job_id||j.id||j.slug||j.job_title||'')===String(job.id||job.slug||job.job_title||'');});}
  function renderHiringRows(){
    var jobs=state.data.jobs||[],apps=state.data.applications||[];
    document.getElementById('stxv4HiringRows').innerHTML=table(['Role / Department','Status','Applicants','Positions','Updated','Actions'],jobs.map(function(j,i){var count=linkedApps(j).length;return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(j.job_title||'Untitled role')+'</span><span class="stxv4-rowsub">'+esc(j.department||'—')+'</span></td><td>'+status(j.status||'draft',statusColor(j.status))+'</td><td>'+num(count)+'</td><td>'+num(j.positions_available||1)+'</td><td>'+esc(date(j.updated_at||j.release_at||j.created_at))+'</td><td><div class="stxv4-actions">'+btn('Applicants','small primary','data-job-apps="'+i+'"')+btn('Edit','small','data-edit-job="'+i+'"')+'</div></td></tr>'; }));
    document.getElementById('stxv4ApplicationRows').innerHTML=table(['Applicant','Decision','Stage','Role','Private CV','Action'],apps.map(function(a,i){var j=a.job_posts||{};return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(fullName(a))+'</span><span class="stxv4-rowsub">'+esc(a.email||'')+'</span></td><td>'+status(a.status||'Submitted',statusColor(a.status||'Submitted'))+'</td><td>'+esc(a.stage||a.application_stage||'CV sift')+'</td><td>'+esc(j.job_title||'—')+'</td><td>'+status(a.job_application_files&&a.job_application_files.length?'Stored privately':'No CV',a.job_application_files&&a.job_application_files.length?'green':'grey')+'</td><td>'+btn('Open','small','data-applicant="'+i+'"')+'</td></tr>'; }));
    document.querySelectorAll('[data-job-apps]').forEach(function(b){b.addEventListener('click',function(){openJobApplicants(jobs[Number(b.dataset.jobApps)]);});});
    document.querySelectorAll('[data-edit-job]').forEach(function(b){b.addEventListener('click',function(){openJobForm(jobs[Number(b.dataset.editJob)]);});});
    document.querySelectorAll('[data-applicant]').forEach(function(b){b.addEventListener('click',function(){openApplicant(apps[Number(b.dataset.applicant)]);});});
  }
  function jobFormFields(job){
    job=job||{};return'<div class="stxv4-formgrid">'+field('Role title','jobTitle','text',job.job_title||'',true)+field('Department','department','text',job.department||'',false)+field('Location','location','text',job.location||'United Kingdom',false)+field('Working type','workingType','select',job.working_type||'Remote',false,'',[['Remote','Remote'],['Hybrid','Hybrid'],['On-site','On-site']])+field('Employment type','employmentType','text',job.employment_type||'Internship',false)+field('Contract type','contractType','text',job.contract_type||'',false)+field('Compensation type','compensationType','select',job.compensation_type||'paid_role',false,'',[['paid_role','Paid role'],['paid_internship','Paid internship'],['unpaid_internship','Unpaid internship'],['commission_based','Commission based']])+field('Pay frequency','salaryUnit','select',job.salary_unit||'annually',false,'',[['hourly','Hourly'],['daily','Daily'],['monthly','Monthly'],['annually','Annually'],['commission','Commission']])+field('Positions available','positionsAvailable','number',job.positions_available||1,false)+field('Reporting to','reportingToName','text',job.reporting_to_name||fullName(user()),false)+field('Status','status','select',job.status||'draft',false,'',[['draft','Draft'],['scheduled','Scheduled'],['live','Live'],['closed','Closed'],['archived','Archived']])+field('Role overview','roleOverview','textarea',job.role_overview||'',true)+field('Responsibilities','responsibilities','textarea',job.responsibilities||'',true)+field('Must haves','mustHaves','textarea',job.must_haves||'',true)+field('Nice to haves','niceToHaves','textarea',job.nice_to_haves||'',true)+field('Benefits','benefits','textarea',job.benefits||'',true)+'</div>';
  }
  function openJobForm(job){
    job=job||null;openModal(job?'Edit role':'Add role','<form id="stxv4JobForm">'+jobFormFields(job)+'<div class="stxv4-message" id="stxv4JobMessage"></div><div class="stxv4-actions" style="margin-top:11px">'+btn(job?'Save role':'Create role','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4JobForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={};fd.forEach(function(v,k){payload[k]=v;});payload.positionsAvailable=Number(payload.positionsAvailable||1);try{if(job&&job.id)await api('PATCH','/api/stratex/jobs/'+encodeURIComponent(job.id),payload);else await api('POST','/api/stratex/jobs',payload);showMessage('stxv4JobMessage','Role saved.',true);setTimeout(function(){closeModal();loadHiring();},400);}catch(err){showMessage('stxv4JobMessage',err.message,false);}});
  }
  function openJobApplicants(job){
    var apps=linkedApps(job);document.getElementById('stxv4HiringDetail').innerHTML=detail(job.job_title,[job.department,job.location,job.status].filter(Boolean).join(' · '),[['Department',job.department],['Location',job.location],['Working type',job.working_type],['Employment',job.employment_type],['Status',job.status],['Positions',job.positions_available||1],['Applicants',apps.length],['Closing date',date(job.closing_at)]],btn('Edit role','small primary','data-inline-edit-job'),apps.length?table(['Applicant','Decision','Stage','Email','Action'],apps.map(function(a,i){return'<tr><td>'+esc(fullName(a))+'</td><td>'+status(a.status||'Submitted',statusColor(a.status))+'</td><td>'+esc(a.stage||'CV sift')+'</td><td>'+esc(a.email||'')+'</td><td>'+btn('Open','small','data-inline-app="'+i+'"')+'</td></tr>'; })):empty('No applicants for this role yet.'));
    var edit=document.querySelector('[data-inline-edit-job]');if(edit)edit.addEventListener('click',function(){openJobForm(job);});document.querySelectorAll('[data-inline-app]').forEach(function(b){b.addEventListener('click',function(){openApplicant(apps[Number(b.dataset.inlineApp)]);});});
  }
  function openApplicant(app){
    var job=app.job_posts||{};var actions=(app.job_application_files&&app.job_application_files.length?btn('Download CV','small primary','data-cv="'+esc(app.id)+'"'):'')+(app.email?'<a class="stxv4-btn small" href="mailto:'+esc(app.email)+'">Email applicant</a>':'');
    document.getElementById('stxv4HiringDetail').innerHTML=detail(fullName(app),job.job_title||'Job application',[['Email',app.email],['Phone',app.phone],['Role',job.job_title],['Decision',app.status||'Submitted'],['Stage',app.stage||app.application_stage||'CV sift'],['Submitted',date(app.submitted_at)],['Application ref',app.application_ref],['CV',app.job_application_files&&app.job_application_files.length?'Stored privately':'No CV record']],actions);
    var cv=document.querySelector('[data-cv]');if(cv)cv.addEventListener('click',async function(){try{var data=await api('GET','/api/stratex/job-applications/'+encodeURIComponent(app.id)+'/cv-url');if(data.url)window.open(data.url,'_blank','noopener');}catch(err){alert(err.message);}});
  }
  function pageTrust(){
    return pageHead('Trust & Concerns','Sensitive safeguarding, access, privacy and conduct reports.',btn('Create internal report','primary','id="stxv4CreateConcern"'))+
      '<div class="stxv4-metrics">'+metric('Open reports','—','All types','red','stxv4ConcernOpen')+metric('High severity','—','Urgent review','red','stxv4ConcernHigh')+metric('Assigned','—','Named owners','blue','stxv4ConcernAssigned')+metric('Closed this month','—','Completed','','stxv4ConcernClosed')+'</div>'+
      note('red','Sensitive and private','Concern data and evidence must never be public, crawlable or available through unsigned URLs.')+
      '<section class="stxv4-card" style="margin-top:11px">'+cardHead('Concern queue','Restricted Stratex and ScoutLink records')+'<div class="stxv4-cardbody" id="stxv4ConcernRows">'+loading()+'</div></section><div id="stxv4ConcernDetail"></div>';
  }
  async function loadTrust(){
    var create=document.getElementById('stxv4CreateConcern');if(create&&create.dataset.bound!=='1'){create.dataset.bound='1';create.addEventListener('click',openInternalConcern);}
    try{var data=await api('GET','/api/stratex-website/leads?limit=500');state.data.concerns=(data.data||[]).filter(function(r){return /concern/i.test(String(r.lead_type||r.type||''))||r.concern_type;});renderConcernRows();var rows=state.data.concerns;document.getElementById('stxv4ConcernOpen').textContent=num(rows.filter(function(r){return !/closed|resolved/i.test(String(r.status||''));}).length);document.getElementById('stxv4ConcernHigh').textContent=num(rows.filter(function(r){var m=r.safe_metadata||{};return /urgent|high/i.test(String(r.priority||m.priority||m.immediate_risk||''));}).length);document.getElementById('stxv4ConcernAssigned').textContent=num(rows.filter(function(r){return !!(r.owner||r.assigned_to||(r.safe_metadata||{}).assigned_to);}).length);document.getElementById('stxv4ConcernClosed').textContent=num(rows.filter(function(r){return /closed|resolved/i.test(String(r.status||''));}).length);}catch(err){document.getElementById('stxv4ConcernRows').innerHTML=empty(err.message);}
  }
  function renderConcernRows(){
    var rows=state.data.concerns||[],root=document.getElementById('stxv4ConcernRows');root.innerHTML=table(['Type','Report','Severity','Status','Owner','Received','Action'],rows.map(function(r,i){var m=r.safe_metadata||{},severity=r.priority||m.priority||(/yes/i.test(String(m.immediate_risk||''))?'High':'Standard'),name=r.concern_type||m.concern_type||r.reason||'Concern report';return'<tr data-row="'+i+'"><td>'+status(String(name).split(' ')[0],/safeguard/i.test(name)?'red':'gold')+'</td><td><span class="stxv4-rowtitle">'+esc(name)+'</span><span class="stxv4-rowsub">'+esc(r.full_name||r.email||'Reporter identity permissioned')+'</span></td><td>'+esc(severity)+'</td><td>'+status(r.status||'new',statusColor(r.status||'new'))+'</td><td>'+esc(r.owner||m.assigned_to||'Unassigned')+'</td><td>'+esc(date(r.created_at))+'</td><td>'+btn('Open securely','small primary','data-concern="'+i+'"')+'</td></tr>'; }));root.querySelectorAll('[data-concern]').forEach(function(b){b.addEventListener('click',function(){openConcern(rows[Number(b.dataset.concern)]);});});
  }
  function openConcern(r){
    var m=r.safe_metadata||{},name=r.concern_type||m.concern_type||r.reason||'Concern report';var extra='<form id="stxv4ConcernActionForm"><div class="stxv4-formgrid">'+field('Status','status','select',r.status||'new',false,'',[['new','New'],['open','Open'],['reviewing','Reviewing'],['access_restricted','Access restricted'],['resolved','Resolved'],['closed','Closed']])+field('Internal action note','notes','textarea','',true,'Stored on the restricted Stratex record.')+'</div><div class="stxv4-message" id="stxv4ConcernActionMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Record action','primary','type="submit"')+'</div></form>';
    document.getElementById('stxv4ConcernDetail').innerHTML=detail(name,'Private concern record',[['Report type',r.lead_type],['Reporter',r.full_name||'Permissioned'],['Email',r.email],['Phone',r.phone],['Person / team',m.player_or_team||r.organisation],['Severity',r.priority||m.priority||'Standard'],['Status',r.status],['Received',date(r.created_at)],['Message',r.message]],(r.email?'<a class="stxv4-btn small" href="mailto:'+esc(r.email)+'">Contact reporter</a>':'')+btn('Restrict access','small red','id="stxv4RestrictConcern"'),extra);
    document.getElementById('stxv4RestrictConcern').addEventListener('click',async function(){if(!confirm('Record an access restriction against this concern?'))return;try{await api('PATCH','/api/stratex-website/leads/'+encodeURIComponent(r.id),{status:'access_restricted',notes:'Access restriction recorded from Stratex Admin.'});await loadTrust();}catch(err){alert(err.message);}});
    document.getElementById('stxv4ConcernActionForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget);try{await api('PATCH','/api/stratex-website/leads/'+encodeURIComponent(r.id),{status:fd.get('status'),notes:fd.get('notes')});showMessage('stxv4ConcernActionMessage','Concern action saved.',true);await loadTrust();}catch(err){showMessage('stxv4ConcernActionMessage',err.message,false);}});
  }
  function openInternalConcern(){
    openModal('Create internal concern report','<form id="stxv4InternalConcernForm"><div class="stxv4-formgrid">'+field('Contact name','contactName','text',fullName(user()),false)+field('Contact email','contactEmail','email',userEmail(),false)+field('Relationship','relationshipToConcern','text','Stratex administrator',true)+field('Concern type','concernType','select','Platform misuse',false,'',[['Safeguarding','Safeguarding'],['Scout conduct','Scout conduct'],['Coach conduct','Coach conduct'],['Player information','Player information'],['Data/privacy','Data/privacy'],['Platform misuse','Platform misuse'],['Other','Other']])+field('Immediate risk','immediateRisk','select','No',false,'',[['No','No'],['Yes','Yes']])+field('Player, team or account','playerOrTeam','text','',true)+field('Details','description','textarea','',true)+'</div><div class="stxv4-message" id="stxv4InternalConcernMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Submit internal report','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4InternalConcernForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={};fd.forEach(function(v,k){payload[k]=v;});payload.consentContact=true;payload.consentText='Internal Stratex concern report created by an authorised administrator.';payload.sourcePage='/admin/trust-concerns';try{await api('POST','/api/stratex-website/concern',payload);showMessage('stxv4InternalConcernMessage','Internal concern report saved.',true);setTimeout(function(){closeModal();loadTrust();},400);}catch(err){showMessage('stxv4InternalConcernMessage',err.message,false);}});
  }

  function pageSettings(){
    return pageHead('Settings','Stratex company settings only. ScoutLink product settings remain separate.',btn('Save settings','primary','id="stxv4SaveSettings"'))+
      '<div class="stxv4-grid two"><section class="stxv4-card">'+cardHead('Company profile','')+'<div class="stxv4-cardbody"><div class="stxv4-formgrid">'+field('Company name','companyName','text','Stratex Analytics Limited',true)+field('Primary email','primaryEmail','email','info@stratexanalytics.co.uk',true)+field('Country','country','text','United Kingdom',false)+field('Website','website','url','https://www.stratexanalytics.co.uk',false)+'</div></div></section>'+
      '<section class="stxv4-card">'+cardHead('Website settings','')+'<div class="stxv4-cardbody">'+toggle('Public website enabled','Serve production pages.',true,'publicWebsite')+toggle('Automatic sitemap updates','Add published pages and posts.',true,'sitemap')+toggle('Global favicon enabled','Use on every route.',true,'favicon')+'</div></section>'+
      '<section class="stxv4-card">'+cardHead('Contact and CRM routing','')+'<div class="stxv4-cardbody"><div class="stxv4-formgrid">'+field('Coach enquiries','coachOwner','select','Lucy Ali',false,'',[['Lucy Ali','Lucy Ali'],['Richdhin Inaba','Richdhin Inaba']])+field('Scout access','scoutOwner','select','Richdhin Inaba',false,'',[['Richdhin Inaba','Richdhin Inaba'],['Lucy Ali','Lucy Ali']])+field('Partnerships','partnershipOwner','select','Alexandro Ilioaie',false,'',[['Alexandro Ilioaie','Alexandro Ilioaie'],['Richdhin Inaba','Richdhin Inaba']])+field('Trust concerns','trustOwner','select','Lucy Ali',false,'',[['Lucy Ali','Lucy Ali'],['Richdhin Inaba','Richdhin Inaba']])+'</div></div></section>'+
      '<section class="stxv4-card">'+cardHead('Admin access',btn('Change password','small','id="stxv4SettingsPassword"'))+'<div class="stxv4-cardbody">'+toggle('Separate Stratex authentication','Do not reuse ScoutLink credentials.',true,'separateAuth')+toggle('Login-code invitations','Use for new staff.',true,'loginCodes')+toggle('Richdhin-only permissions','Only the Super Admin edits access.',true,'richdhinOnly')+'</div></section>'+
      '<section class="stxv4-card">'+cardHead('Blog / Learning Centre','')+'<div class="stxv4-cardbody">'+toggle('Require featured image','For every published article.',true,'requireImage')+toggle('Generate canonical URL','Use the approved slug.',true,'canonical')+toggle('Noindex drafts and archives','Keep unpublished content out of search.',true,'noindexDrafts')+'</div></section>'+
      '<section class="stxv4-card">'+cardHead('Hiring and trust','')+'<div class="stxv4-cardbody">'+toggle('Private applicant files','Signed or authenticated access.',true,'privateApplicants')+toggle('Private concern files','Never public.',true,'privateConcerns')+toggle('Audit sensitive actions','Record access and edits.',true,'auditActions')+'</div></section></div><div class="stxv4-message" id="stxv4SettingsMessage"></div>';
  }
  function loadSettings(){
    var saved={};try{saved=JSON.parse(localStorage.getItem('stratexAdminV4Settings')||'{}');}catch(_){}
    document.querySelectorAll('.stxv4-field [name]').forEach(function(n){if(saved.fields&&Object.prototype.hasOwnProperty.call(saved.fields,n.name))n.value=saved.fields[n.name];});
    document.querySelectorAll('[data-toggle]').forEach(function(b){if(saved.toggles&&Object.prototype.hasOwnProperty.call(saved.toggles,b.dataset.toggle)){var on=!!saved.toggles[b.dataset.toggle];b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));}});
    document.getElementById('stxv4SaveSettings').addEventListener('click',function(){var fields={},toggles={};document.querySelectorAll('.stxv4-field [name]').forEach(function(n){fields[n.name]=n.value;});document.querySelectorAll('[data-toggle]').forEach(function(b){toggles[b.dataset.toggle]=b.classList.contains('on');});try{localStorage.setItem('stratexAdminV4Settings',JSON.stringify({fields:fields,toggles:toggles,savedAt:new Date().toISOString()}));showMessage('stxv4SettingsMessage','Stratex Admin settings saved for this browser.',true);}catch(_){showMessage('stxv4SettingsMessage','Settings could not be saved in this browser.',false);}});
    document.getElementById('stxv4SettingsPassword').addEventListener('click',openPasswordModal);
  }
  function pageShowcase(){
    return pageHead('Showcase Event','Manage showcase events while preserving ScoutLink notifications.',btn('Create showcase event','primary','id="stxv4CreateShowcase"'))+
      '<section class="stxv4-card">'+cardHead('Showcase events','ScoutLink notification logic remains active')+'<div class="stxv4-cardbody" id="stxv4ShowcaseRows">'+loading()+'</div></section><div id="stxv4ShowcaseDetail"></div>';
  }
  async function loadShowcase(){
    var create=document.getElementById('stxv4CreateShowcase');if(create&&create.dataset.bound!=='1'){create.dataset.bound='1';create.addEventListener('click',function(){openShowcaseForm(null);});}
    try{var data=await api('GET','/api/showcase');state.data.showcase=data.data||[];renderShowcaseRows();}catch(err){document.getElementById('stxv4ShowcaseRows').innerHTML=empty(err.message);}
  }
  function renderShowcaseRows(){
    var rows=state.data.showcase||[],root=document.getElementById('stxv4ShowcaseRows');root.innerHTML=table(['Event','Date','Venue','Status','Scout responses','Actions'],rows.map(function(r,i){var st=r.status||(r.confirmed?'confirmed':'draft');return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(r.event_name||'Showcase event')+'</span><span class="stxv4-rowsub">'+esc(r.description||'ScoutLink showcase')+'</span></td><td>'+esc(date(r.event_date))+'</td><td>'+esc(r.venue_name||'—')+'</td><td>'+status(st,statusColor(st))+'</td><td>'+num(r.confirmedCount)+' accepted / '+num(r.waitlistedCount)+' waitlisted</td><td><div class="stxv4-actions">'+btn('Open','small','data-showcase="'+i+'"')+btn('Confirm','small primary','data-showcase-confirm="'+esc(r.id)+'"')+btn('Cancel','small red','data-showcase-cancel="'+esc(r.id)+'"')+'</div></td></tr>'; }));root.querySelectorAll('[data-showcase]').forEach(function(b){b.addEventListener('click',function(){openShowcase(rows[Number(b.dataset.showcase)]);});});bindShowcaseActions();
  }
  function showcaseFields(r){r=r||{};return'<div class="stxv4-formgrid">'+field('Event name','eventName','text',r.event_name||'',true)+field('Status','status','select',r.status||'draft',false,'',[['draft','Draft'],['published','Published'],['confirmed','Confirmed'],['cancelled','Cancelled']])+field('Event date and time','eventDate','datetime-local',r.event_date?new Date(r.event_date).toISOString().slice(0,16):'',false)+field('Max scouts','maxScouts','number',r.max_scouts||20,false)+field('Venue name','venueName','text',r.venue_name||'',false)+field('Venue address','venueAddress','text',r.venue_address||'',false)+field('Description','description','textarea',r.description||'',true)+'</div>';}
  function openShowcaseForm(r){
    openModal(r?'Edit showcase event':'Create showcase event','<form id="stxv4ShowcaseForm">'+showcaseFields(r)+'<div class="stxv4-message" id="stxv4ShowcaseMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn(r?'Save changes':'Create event','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4ShowcaseForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={};fd.forEach(function(v,k){payload[k]=v;});payload.maxScouts=Number(payload.maxScouts||20);try{if(r)await api('PATCH','/api/showcase/'+encodeURIComponent(r.id),payload);else await api('POST','/api/showcase',payload);showMessage('stxv4ShowcaseMessage','Showcase event saved.',true);setTimeout(function(){closeModal();loadShowcase();},400);}catch(err){showMessage('stxv4ShowcaseMessage',err.message,false);}});
  }
  function openShowcase(r){
    var extra='<form id="stxv4InlineShowcaseForm">'+showcaseFields(r)+'<div class="stxv4-message" id="stxv4InlineShowcaseMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save changes','primary','type="submit"')+btn('View scout responses','','data-inline-responses="'+esc(r.id)+'"')+'</div></form><div id="stxv4ShowcaseResponses"></div>';
    document.getElementById('stxv4ShowcaseDetail').innerHTML=detail(r.event_name,'Changes can notify the correct ScoutLink coaches and scouts.',[['Date',date(r.event_date)],['Venue',r.venue_name],['Address',r.venue_address],['Status',r.status],['Max scouts',r.max_scouts||20],['Accepted',r.confirmedCount||0],['Waitlisted',r.waitlistedCount||0],['Notification logic','Active']],status('Notification logic active','green'),extra);
    document.getElementById('stxv4InlineShowcaseForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={};fd.forEach(function(v,k){payload[k]=v;});payload.maxScouts=Number(payload.maxScouts||20);try{await api('PATCH','/api/showcase/'+encodeURIComponent(r.id),payload);showMessage('stxv4InlineShowcaseMessage','Showcase event updated.',true);await loadShowcase();}catch(err){showMessage('stxv4InlineShowcaseMessage',err.message,false);}});
    document.querySelector('[data-inline-responses]').addEventListener('click',function(){loadShowcaseResponses(r.id);});
  }
  function bindShowcaseActions(){
    document.querySelectorAll('[data-showcase-confirm]').forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Confirm this showcase event and notify active scouts?'))return;try{await api('POST','/api/showcase/'+encodeURIComponent(b.dataset.showcaseConfirm)+'/confirm',{});await loadShowcase();}catch(err){alert(err.message);}});});
    document.querySelectorAll('[data-showcase-cancel]').forEach(function(b){b.addEventListener('click',async function(){var reason=prompt('Reason for cancellation (optional)');if(reason===null)return;try{await api('POST','/api/showcase/'+encodeURIComponent(b.dataset.showcaseCancel)+'/cancel',{reason:reason});await loadShowcase();}catch(err){alert(err.message);}});});
  }
  async function loadShowcaseResponses(id){
    var root=document.getElementById('stxv4ShowcaseResponses');root.innerHTML=loading();try{var data=await api('GET','/api/showcase/'+encodeURIComponent(id)+'/attendees');var rows=data.scouts||[];root.innerHTML='<div class="stxv4-metrics" style="margin-top:11px">'+metric('Invited',data.total||rows.length,'Scouts')+metric('Accepted',(data.confirmed||[]).length,'Confirmed','blue')+metric('No response',(data.notResponded||[]).length,'Awaiting response','gold')+'</div>'+table(['Scout','Email','Club / team','Response','Responded'],rows.map(function(r){var s=r.scouts||{};return'<tr><td>'+esc(fullName(s))+'</td><td>'+esc(s.email||'')+'</td><td>'+esc(s.club_name||s.scout_team_id||'')+'</td><td>'+status(String(r.display_status||r.status||'not_responded').replace(/_/g,' '),statusColor(r.display_status||r.status))+'</td><td>'+esc(date(r.confirmed_at))+'</td></tr>'; }));}catch(err){root.innerHTML=empty(err.message);}
  }
  function pageAwards(){
    return pageHead('Award Ceremonies','Manage ceremonies, categories and ScoutLink notification audiences.',btn('Create award ceremony','primary','id="stxv4CreateCeremony"'))+
      '<section class="stxv4-card">'+cardHead('Award ceremonies','Annual and scheduled events')+'<div class="stxv4-cardbody" id="stxv4CeremonyRows">'+loading()+'</div></section><div id="stxv4CeremonyDetail"></div>';
  }
  async function loadAwards(){
    var create=document.getElementById('stxv4CreateCeremony');if(create&&create.dataset.bound!=='1'){create.dataset.bound='1';create.addEventListener('click',function(){openCeremonyForm(null);});}
    try{var data=await api('GET','/api/awards/ceremonies');state.data.ceremonies=data.data||[];renderCeremonyRows();}catch(err){document.getElementById('stxv4CeremonyRows').innerHTML=note('gold','Ceremony storage requires the included backend patch',err.message||'The ceremony endpoint is not available yet.');}
  }
  function renderCeremonyRows(){
    var rows=state.data.ceremonies||[],root=document.getElementById('stxv4CeremonyRows');root.innerHTML=table(['Ceremony','Date','Location','Status','Categories','Action'],rows.map(function(r,i){return'<tr data-row="'+i+'"><td><span class="stxv4-rowtitle">'+esc(r.name||r.ceremony_name||'Award ceremony')+'</span><span class="stxv4-rowsub">'+esc(r.description||'Stratex football awards')+'</span></td><td>'+esc(date(r.event_date))+'</td><td>'+esc(r.location||'—')+'</td><td>'+status(r.status||'planning',statusColor(r.status))+'</td><td>'+num(Array.isArray(r.categories)?r.categories.length:r.category_count||0)+'</td><td>'+btn('Edit','small primary','data-ceremony="'+i+'"')+'</td></tr>'; }));root.querySelectorAll('[data-ceremony]').forEach(function(b){b.addEventListener('click',function(){openCeremony(rows[Number(b.dataset.ceremony)]);});});
  }
  function ceremonyFields(r){r=r||{};return'<div class="stxv4-formgrid">'+field('Ceremony name','name','text',r.name||r.ceremony_name||'',true)+field('Status','status','select',r.status||'planning',false,'',[['planning','Planning'],['published','Published'],['completed','Completed'],['cancelled','Cancelled']])+field('Date and time','eventDate','datetime-local',r.event_date?new Date(r.event_date).toISOString().slice(0,16):'',false)+field('Location','location','text',r.location||'',false)+field('Categories','categories','textarea',Array.isArray(r.categories)?r.categories.join('\n'):(r.categories||''),true,'One category per line.')+field('Notification audience','audience','textarea',Array.isArray(r.audience)?r.audience.join('\n'):(r.audience||'Coaches\nScouts\nPlayers'),true,'One audience per line.')+field('Description','description','textarea',r.description||'',true)+'</div>';}
  function openCeremonyForm(r){
    openModal(r?'Edit award ceremony':'Create award ceremony','<form id="stxv4CeremonyForm">'+ceremonyFields(r)+'<div class="stxv4-message" id="stxv4CeremonyMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn(r?'Save changes':'Create ceremony','primary','type="submit"')+'</div></form>');
    document.getElementById('stxv4CeremonyForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={name:fd.get('name'),status:fd.get('status'),eventDate:fd.get('eventDate'),location:fd.get('location'),categories:String(fd.get('categories')||'').split(/\n/).map(function(x){return x.trim();}).filter(Boolean),audience:String(fd.get('audience')||'').split(/\n/).map(function(x){return x.trim();}).filter(Boolean),description:fd.get('description')};try{if(r)await api('PATCH','/api/awards/ceremonies/'+encodeURIComponent(r.id),payload);else await api('POST','/api/awards/ceremonies',payload);showMessage('stxv4CeremonyMessage','Award ceremony saved.',true);setTimeout(function(){closeModal();loadAwards();},400);}catch(err){showMessage('stxv4CeremonyMessage',err.message,false);}});
  }
  function openCeremony(r){
    var extra='<form id="stxv4InlineCeremonyForm">'+ceremonyFields(r)+'<div class="stxv4-message" id="stxv4InlineCeremonyMessage"></div><div class="stxv4-actions" style="margin-top:10px">'+btn('Save changes','primary','type="submit"')+'</div></form>';
    document.getElementById('stxv4CeremonyDetail').innerHTML=detail(r.name||r.ceremony_name,'Annual celebration of grassroots players, coaches and scouts.',[['Date',date(r.event_date)],['Location',r.location],['Status',r.status],['Categories',Array.isArray(r.categories)?r.categories.length:r.category_count||0],['Audience',Array.isArray(r.audience)?r.audience.join(', '):r.audience],['Created',date(r.created_at)],['Updated',date(r.updated_at)],['Notifications','Configured from audience']],status('Notification logic active','green'),extra);
    document.getElementById('stxv4InlineCeremonyForm').addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(e.currentTarget),payload={name:fd.get('name'),status:fd.get('status'),eventDate:fd.get('eventDate'),location:fd.get('location'),categories:String(fd.get('categories')||'').split(/\n/).map(function(x){return x.trim();}).filter(Boolean),audience:String(fd.get('audience')||'').split(/\n/).map(function(x){return x.trim();}).filter(Boolean),description:fd.get('description')};try{await api('PATCH','/api/awards/ceremonies/'+encodeURIComponent(r.id),payload);showMessage('stxv4InlineCeremonyMessage','Award ceremony updated.',true);await loadAwards();}catch(err){showMessage('stxv4InlineCeremonyMessage',err.message,false);}});
  }
  function bindPageSpecific(){
    var map={
      stxv4RefreshRegistrations:loadRegistrations,stxv4ApplyRegistrationFilters:renderRegistrationRows,stxv4RefreshContact:loadContact,
      stxv4ExportCrm:async function(){try{downloadBlob(await apiBlob('/api/stratex-website/crm/export'),'stratex-crm-export.xlsx');}catch(err){alert(err.message);}},
      stxv4AddContact:openAddContact,stxv4RefreshActivity:loadActivity
    };
    Object.keys(map).forEach(function(id){var n=document.getElementById(id);if(n)n.addEventListener('click',map[id]);});
    ['stxv4RegistrationSearch','stxv4RegistrationProduct','stxv4RegistrationType'].forEach(function(id){var n=document.getElementById(id);if(n)n.addEventListener(id==='stxv4RegistrationSearch'?'input':'change',renderRegistrationRows);});
  }
  var originalRenderPage=renderPage;
  renderPage=function(id){originalRenderPage(id);bindPageSpecific();};
  function start(){
    document.body.classList.add('stxv4-admin');
    var launch=function(){if(loggedIn())renderShell();else renderLogin();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(launch,0);});else setTimeout(launch,0);
  }
  start();
})();


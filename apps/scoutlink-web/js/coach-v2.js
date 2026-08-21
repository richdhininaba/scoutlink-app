'use strict';

(function () {
  if (window.__scoutlinkCoachV6ExactShell) return;
  window.__scoutlinkCoachV6ExactShell = true;

  var ROUTES = {
    Dashboard:'/coach/dashboard',
    'My Players':'/coach/my-players',
    Fixtures:'/coach/fixtures',
    'Match Facts':'/coach/match-facts',
    'Video Reels':'/coach/video-reels',
    Chat:'/coach/chat',
    Notifications:'/coach/notifications',
    Settings:'/coach/settings',
    'Report a Concern':'/coach/report-a-concern'
  };
  var DESK_NAV = [
    ['Overview',['Dashboard']],
    ['Squad',['My Players']],
    ['Matches',['Fixtures','Match Facts']],
    ['Evidence',['Video Reels']],
    ['Messages',['Chat','Notifications']],
    ['Team',['Settings']],
    ['Support',['Report a Concern']]
  ];
  var FIELD_NAV = [
    ['Home','/coach/dashboard','home'],
    ['Players','/coach/my-players','players'],
    ['Fixtures','/coach/fixtures','fixtures'],
    ['Chat','/coach/chat','chat'],
    ['More','#','more']
  ];
  var WIZARDS = {onboarding:1,'add-player':1,'bulk-add-players':1,'match-facts':1};
  var counts={notifications:0,chat:0,players:0,videos:0};
  var titleOverride='',subtitleOverride='',fieldTitleOverride=null,fieldSubtitleOverride=null,fieldLeftOverride=null,fieldRightOverride=null;
  var demoCache=null,demoPromise=null,searchCache=null,searchPromise=null;

  var ICON = {
    home:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
    players:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.6.5 4.5 2.3 4.5 5.4"/></svg>',
    fixtures:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="15.5" rx="2.5"/><path d="M3.2 9.3h17.6M8 3v4M16 3v4"/></svg>',
    facts:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="4" width="13" height="17" rx="2.3"/><path d="M9 4V3.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4"/></svg>',
    video:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M8 4.5v15M16 4.5v15M3 9.8h5M16 9.8h5M3 15h5M16 15h5"/></svg>',
    chat:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5l-5 3.8V6.5a1 1 0 0 1 1-1Z"/></svg>',
    bell:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 9a5.8 5.8 0 1 1 11.6 0c0 4 1.9 4.8 1.9 5.7H4.3c0-.9 1.9-1.7 1.9-5.7Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>',
    settings:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M12 2.5v2.8M12 18.7v2.8M4.6 4.6l2 2M17.4 17.4l2 2M2.5 12h2.8M18.7 12h2.8M4.6 19.4l2-2M17.4 6.6l2-2"/></svg>',
    shield:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19.5 6v6.2c0 4.6-3.2 7.4-7.5 8.6-4.3-1.2-7.5-4-7.5-8.6V6L12 3.2Z"/></svg>',
    more:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    search:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="M20 20l-3.6-3.6"/></svg>',
    close:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19.5 12h-15M11 18l-6-6 6-6"/></svg>'
  };

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clean(p){return typeof window.cleanRouteFor==='function'?window.cleanRouteFor(p):p;}
  function page(){return document.body&&document.body.getAttribute('data-coach-page')||'';}
  function wizard(){return !!WIZARDS[page()];}
  function isDemo(){try{return (typeof window.isPublicDemoMode==='function'&&window.isPublicDemoMode())||sessionStorage.getItem('sl_public_demo')==='1';}catch(_){return false;}}
  function apiBase(){try{return window.API||localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return window.API||'https://scoutlink-api.vercel.app';}}
  function arr(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
  function user(){return window.Auth&&window.Auth.user?window.Auth.user:{};}
  function fullName(){var u=user(),x=[u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ').trim();try{return x||localStorage.getItem('sl_user_name')||'Coach';}catch(_){return x||'Coach';}}
  function firstName(){return fullName().split(/\s+/)[0]||'Coach';}
  function initials(v){var p=String(v||fullName()).trim().split(/\s+/).filter(Boolean);return(((p[0]||'C')[0]||'C')+((p[1]||p[0]||'O')[0]||'O')).toUpperCase();}
  function teamName(){var u=user();try{return localStorage.getItem('sl_team_name')||u.team_name||u.teamName||u.club_name||u.clubName||'Your team';}catch(_){return u.team_name||u.teamName||'Your team';}}
  function ageGroup(){var u=user();try{return localStorage.getItem('sl_team_age_group')||u.age_group||u.ageGroup||'';}catch(_){return u.age_group||u.ageGroup||'';}}

  function fetchDemo(force){
    if(!force&&demoCache)return Promise.resolve(demoCache);
    if(!force&&demoPromise)return demoPromise;
    demoPromise=fetch(apiBase()+'/api/coach-experience/public-demo',{headers:{Accept:'application/json'},cache:'no-store'})
      .then(function(r){return r.json().catch(function(){return{};}).then(function(d){if(!r.ok)throw new Error(d.error||'Demo data could not be loaded.');return d.data||d;});})
      .then(function(d){demoCache=d||{};return demoCache;})
      .finally(function(){demoPromise=null;});
    return demoPromise;
  }
  function demoRead(path){
    var u=new URL(path,'https://scoutlink.local'),p=u.pathname;
    return fetchDemo(false).then(function(o){
      var players=arr(o,['players']),fixtures=arr(o,['fixtures']),videos=arr(o,['videos']),facts=arr(o,['matchFacts']),notifications=arr(o,['notifications']),threads=arr(o,['threads']),messages=arr(o,['chatMessages']);
      if(p==='/api/coach-experience/overview')return o;
      if(p==='/api/coaches/profile')return{coach:o.coach||null};
      if(p==='/api/coaches/my-players')return{players:players,data:players};
      if(p==='/api/coaches/team-coaches')return{coaches:arr(o,['teamCoaches']),data:arr(o,['teamCoaches'])};
      if(p==='/api/fixtures')return{fixtures:fixtures,data:fixtures};
      if(p==='/api/videos')return{videos:videos,data:videos};
      if(p==='/api/match-facts')return{matchFacts:facts,data:facts};
      if(p==='/api/notifications')return{notifications:notifications,data:notifications,unreadCount:notifications.filter(function(x){return!x.is_read;}).length};
      if(p==='/api/chat/threads')return{threads:threads,data:threads};
      if(p==='/api/coach-experience/notification-preferences')return{preferences:o.notificationPreferences||{}};
      var m=p.match(/^\/api\/chat\/threads\/([^/]+)\/messages$/);
      if(m){var id=decodeURIComponent(m[1]);var ms=messages.filter(function(x){return String(x.thread_id)===String(id);});return{messages:ms,data:ms};}
      return o;
    });
  }
  function api(method,path,body){
    if(isDemo()&&String(method||'GET').toUpperCase()==='GET')return demoRead(path);
    if(typeof window.api==='function')return window.api(method,path,body);
    return Promise.reject(new Error('ScoutLink API client is unavailable.'));
  }

  function iconFor(label){return label==='Dashboard'?ICON.home:label==='My Players'?ICON.players:label==='Fixtures'?ICON.fixtures:label==='Match Facts'?ICON.facts:label==='Video Reels'?ICON.video:label==='Chat'?ICON.chat:label==='Notifications'?ICON.bell:label==='Settings'?ICON.settings:ICON.shield;}
  function activeLabel(){var p=page();return p==='dashboard'?'Dashboard':p==='my-players'?'My Players':p==='fixtures'?'Fixtures':p==='match-facts'?'Match Facts':p==='video-reels'?'Video Reels':p==='chat'?'Chat':p==='notifications'?'Notifications':p==='settings'?'Settings':p==='report-a-concern'?'Report a Concern':'Dashboard';}
  function badge(label){var n=label==='My Players'?counts.players:label==='Video Reels'?counts.videos:label==='Chat'?counts.chat:label==='Notifications'?counts.notifications:0;return n?'<span class="badge">'+n+'</span>':'';}
  function navHtml(){
    var active=activeLabel();
    return DESK_NAV.map(function(g){return'<div class="rail-grp">'+esc(g[0])+'</div>'+g[1].map(function(label){return'<a class="rail-item'+(label===active?' on':'')+'" href="'+esc(clean(ROUTES[label]))+'">'+iconFor(label)+'<span>'+esc(label)+'</span>'+badge(label)+'</a>';}).join('');}).join('');
  }
  function searchHtml(){return'<div class="rail-search coach-v6-search" style="position:relative">'+ICON.search+'<input type="search" aria-label="Search players and fixtures" placeholder="Search players, fixtures..."><div class="coach-search-results"></div></div>';}

  function desiredTitle(){return titleOverride||({dashboard:'Dashboard','my-players':'My Players',fixtures:'Fixtures','video-reels':'Video Reels',chat:'Chat',notifications:'Notifications',settings:'Settings','report-a-concern':'Report a Concern','add-player':'Add Player','bulk-add-players':'Bulk Add Players','match-facts':'Match Facts',onboarding:'Coach setup'}[page()]||'Coach');}
  function greeting(){return subtitleOverride||('Good morning, '+firstName());}
  function topHtml(){return'<div class="eyebrow">'+esc(greeting())+'</div><h1>'+esc(desiredTitle())+'</h1><div class="sp"></div><button class="icon-btn" type="button" data-coach-notifications>'+ICON.bell+(counts.notifications?'<u>'+counts.notifications+'</u>':'')+'</button>';}

  function mountDesk(){
    var shell=document.querySelector('.coach-desk [data-coach-shell]'),cv=document.getElementById('coachDeskPage');if(!shell||!cv)return;
    var screen=shell.closest('.screen')||shell.parentNode;screen.classList.add('app-shell');
    if(wizard()){
      document.body.classList.add('coach-v6-wizard');
      shell.className='v6-wizard-shell';
      if(!shell.querySelector('.v6-wizard-top')){
        var head=document.createElement('div');head.className='v6-wizard-top';head.style.cssText='display:flex;align-items:center;gap:16px;padding:20px 36px;background:var(--paper);border-bottom:1px solid var(--line)';
        head.innerHTML='<div class="sl-logo-mark colour" style="width:108px;height:35px"></div><div style="padding-left:16px;border-left:1px solid var(--line);min-width:0"><div style="font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--pitch);font-weight:600">ScoutLink Wizard</div><div data-wizard-title style="font-weight:800;font-size:15px;margin-top:2px">'+esc(desiredTitle())+'</div></div><span class="sp" style="flex:1"></span><button class="btn outline sm" type="button" data-wizard-exit>'+ICON.close+' Exit</button>';
        var wrap=document.createElement('div');wrap.style.cssText='background:var(--canvas);min-height:900px;display:flex;flex-direction:column';wrap.appendChild(head);
        var content=document.createElement('div');content.className='v6-wizard-content';content.style.cssText='flex:1;padding:40px;display:flex;justify-content:center';cv.className='';cv.style.cssText='max-width:1180px;width:100%';content.appendChild(cv);wrap.appendChild(content);shell.innerHTML='';shell.appendChild(wrap);
      }
      return;
    }
    if(shell.dataset.exactMounted!=='1'){
      shell.dataset.exactMounted='1';shell.className='app rel';
      var nav=document.createElement('nav');nav.className='rail-nav';nav.innerHTML='<div class="rail-brand"><div class="sl-logo-mark colour" style="width:128px;height:41px"></div></div>'+searchHtml()+'<div class="rail-scroll">'+navHtml()+'</div><button class="rail-foot" type="button" data-coach-account style="border:0;border-top:1px solid var(--line);width:100%;background:transparent;text-align:left"><span class="avatar">'+esc(initials())+'</span><span class="txt"><b>'+esc(fullName())+'</b><span class="role-txt">'+esc((user().role_at_club||'Head Coach')+' · '+teamName())+'</span></span></button>';
      var main=document.createElement('div');main.className='main';var top=document.createElement('header');top.className='top';top.id='coachDeskTop';main.appendChild(top);cv.className='body';main.appendChild(cv);shell.innerHTML='';shell.appendChild(nav);shell.appendChild(main);
    }
    refreshChrome();bindSearch();
  }

  function fieldActive(label){var p=location.pathname;return /\/coach\/dashboard/.test(p)?label==='Home':(/\/coach\/(my-players|add-player|bulk-add-players)/.test(p)||/\/player\/profile/.test(p))?label==='Players':/\/coach\/(fixtures|match-facts)/.test(p)?label==='Fixtures':/\/coach\/chat/.test(p)?label==='Chat':label==='More';}
  function fieldTabs(){return FIELD_NAV.map(function(x){var icon=x[2]==='home'?ICON.home:x[2]==='players'?ICON.players:x[2]==='fixtures'?ICON.fixtures:x[2]==='chat'?ICON.chat:ICON.more;return'<a class="'+(fieldActive(x[0])?'on':'')+'" href="'+(x[1]==='#'?'#':esc(clean(x[1])))+'"'+(x[0]==='More'?' data-coach-more':'')+'>'+icon+esc(x[0])+(x[0]==='Chat'&&counts.chat?'<span class="bdg">'+counts.chat+'</span>':'')+'</a>';}).join('');}
  function mountField(){
    var root=document.querySelector('.coach-field .scr'),body=document.getElementById('coachFieldPage');if(!root||!body)return;root.classList.add('rel');body.className='pbody';
    var top=root.querySelector('.ptop');if(!top){top=document.createElement('header');top.className='ptop';root.insertBefore(top,body);}
    var title=fieldTitleOverride!==null?fieldTitleOverride:desiredTitle();
    var left=fieldLeftOverride!==null?fieldLeftOverride:(wizard()?'<button class="icon-btn" style="width:34px;height:34px" type="button" data-field-back>'+ICON.back+'</button><span style="width:26px;height:26px;flex:0 0 26px"><span class="sl-logo-mark colour" style="width:26px;height:8px"></span></span>':'');
    var right=fieldRightOverride!==null?fieldRightOverride:(wizard()?'<button class="icon-btn" style="width:34px;height:34px" type="button" data-wizard-exit>'+ICON.close+'</button>':'<button class="icon-btn" style="width:38px;height:38px" type="button" data-coach-notifications>'+ICON.bell+(counts.notifications?'<u style="font-size:8px;min-width:14px;height:14px">'+counts.notifications+'</u>':'')+'</button>');
    top.innerHTML=left+'<h1>'+esc(title)+'</h1><span class="sp"></span>'+right;
    var old=root.querySelector('.tabs');if(old)old.remove();var home=root.querySelector('.homebar');if(home)home.remove();var tabs=root.querySelector('.ptabs');
    if(wizard()){if(tabs)tabs.remove();}else{if(!tabs){tabs=document.createElement('nav');tabs.className='ptabs';root.appendChild(tabs);}tabs.innerHTML=fieldTabs();}
  }

  function refreshChrome(){var top=document.getElementById('coachDeskTop');if(top)top.innerHTML=topHtml();var scroll=document.querySelector('.rail-nav .rail-scroll');if(scroll)scroll.innerHTML=navHtml();bindGlobal();}
  function closeAll(){document.querySelectorAll('[data-coach-overlay]').forEach(function(n){n.remove();});}
  function overlay(kind,opt){opt=opt||{};closeAll();var back=document.createElement('div');back.className='coach-overlay-backdrop';back.dataset.coachOverlay='1';var box=document.createElement('section');box.dataset.coachOverlay='1';var mobile=innerWidth<=760;box.className='coach-overlay '+(mobile?'sheet':kind==='modal'?'modal':'drawer');box.innerHTML=(mobile?'<div class="sheet-grip"></div>':'')+'<div class="coach-overlay-h"><h3 style="margin:0;font-size:17px">'+esc(opt.title||'Details')+'</h3><span class="sp"></span><button class="icon-btn" style="width:38px;height:38px" type="button" data-close-coach-overlay>'+ICON.close+'</button></div><div class="coach-overlay-b">'+(opt.html||'')+'</div>'+(opt.footer?'<div class="coach-overlay-f">'+opt.footer+'</div>':'');document.body.appendChild(back);document.body.appendChild(box);bindGlobal();return box;}
  function showToast(msg,error){var n=document.createElement('div');n.className='toast';n.setAttribute('role',error?'alert':'status');n.textContent=msg;document.body.appendChild(n);setTimeout(function(){n.remove();},3200);}
  function openMore(){overlay('sheet',{title:'More',html:'<div class="list"><a class="list-row" href="'+esc(clean('/coach/match-facts'))+'"><span class="who"><b>Match Facts</b><span>Record post-match evidence</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/video-reels'))+'"><span class="who"><b>Video Reels</b><span>Review and manage evidence</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/notifications'))+'"><span class="who"><b>Notifications</b><span>'+counts.notifications+' unread</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/settings'))+'"><span class="who"><b>Settings</b><span>Team and account</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/report-a-concern'))+'"><span class="who"><b>Report a Concern</b><span>Safeguarding</span></span><span class="chev">›</span></a></div>'});}
  function openAccount(){overlay('sheet',{title:'Account',html:'<div class="flex" style="margin-bottom:18px"><span class="avatar lg">'+esc(initials())+'</span><div><b>'+esc(fullName())+'</b><span class="mut" style="display:block;margin-top:4px">'+esc(teamName())+'</span></div></div><div class="list"><a class="list-row" href="'+esc(clean('/experience-select'))+'"><span class="who"><b>Switch workspace</b></span></a><button class="list-row" type="button" data-coach-signout style="width:100%;border:0;background:transparent;text-align:left"><span class="who"><b>Sign out</b></span></button></div>'});}
  function signOut(){if(isDemo()&&typeof window.exitPublicDemo==='function'){window.exitPublicDemo();return;}if(window.Auth&&typeof window.Auth.clear==='function')window.Auth.clear();location.href=clean('/login?logout=1');}
  function bindGlobal(){
    document.querySelectorAll('[data-close-coach-overlay]').forEach(function(b){b.onclick=closeAll;});
    document.querySelectorAll('.coach-overlay-backdrop').forEach(function(b){b.onclick=closeAll;});
    document.querySelectorAll('[data-coach-more]').forEach(function(b){b.onclick=function(e){e.preventDefault();openMore();};});
    document.querySelectorAll('[data-coach-account]').forEach(function(b){b.onclick=openAccount;});
    document.querySelectorAll('[data-coach-signout]').forEach(function(b){b.onclick=signOut;});
    document.querySelectorAll('[data-coach-notifications]').forEach(function(b){b.onclick=function(){location.href=clean('/coach/notifications');};});
    document.querySelectorAll('[data-wizard-exit]').forEach(function(b){b.onclick=function(){location.href=clean('/coach/dashboard');};});
  }
  function bindSearch(){
    var box=document.querySelector('.coach-v6-search'),input=box&&box.querySelector('input'),results=box&&box.querySelector('.coach-search-results');if(!input||!results||input.dataset.bound==='1')return;input.dataset.bound='1';
    input.oninput=function(){var q=input.value.trim().toLowerCase();if(!q){results.innerHTML='';return;}searchData().then(function(o){var ps=arr(o,['players']).filter(function(p){return([p.first_name,p.last_name,p.primary_position,p.specific_position,p.age_group].filter(Boolean).join(' ').toLowerCase().indexOf(q)>=0);}).slice(0,6),fs=arr(o,['fixtures']).filter(function(f){return String(f.opponent||'').toLowerCase().indexOf(q)>=0;}).slice(0,4);results.innerHTML=ps.map(function(p){return'<a class="coach-search-result" href="'+esc(clean('/player/profile?id='+encodeURIComponent(p.id)))+'"><b>'+esc([p.first_name,p.last_name].filter(Boolean).join(' '))+'</b><span>'+esc((p.primary_position||p.specific_position||'')+' · '+(p.age_group||''))+'</span></a>';}).join('')+fs.map(function(f){return'<a class="coach-search-result" href="'+esc(clean('/coach/fixtures?fixtureId='+encodeURIComponent(f.id)))+'"><b>vs '+esc(f.opponent||'Fixture')+'</b><span>'+esc(f.fixture_date||'')+'</span></a>';}).join('');});};
  }
  function searchData(){if(searchCache)return Promise.resolve(searchCache);if(searchPromise)return searchPromise;searchPromise=api('GET','/api/coach-experience/overview').then(function(r){searchCache=r.data||r;return searchCache;}).finally(function(){searchPromise=null;});return searchPromise;}
  function refreshBadges(){return api('GET','/api/coach-experience/overview').then(function(r){var o=r.data||r;counts.players=arr(o,['players']).length;counts.videos=arr(o,['videos']).filter(function(v){return String(v.moderation_status||'').toLowerCase()==='pending';}).length;counts.notifications=arr(o,['notifications']).filter(function(n){return!n.is_read;}).length;counts.chat=arr(o,['threads']).filter(function(t){return Number(t.unread_count||0)>0;}).reduce(function(a,t){return a+Number(t.unread_count||0);},0);refreshChrome();mountField();return counts;}).catch(function(){return counts;});}
  function setTitle(t,s){titleOverride=t||'';subtitleOverride=s||'';refreshChrome();}
  function setFieldHeader(t,s,r,l){fieldTitleOverride=t==null?null:t;fieldSubtitleOverride=s==null?null:s;fieldRightOverride=r==null?null:r;fieldLeftOverride=l==null?null:l;mountField();}
  function setRouteActions(){/* V6 source places route actions inside page bodies, never in the shared top bar. */}
  function refresh(){mountDesk();mountField();bindGlobal();refreshBadges();}

  window.CoachV2={
    esc:esc,clean:clean,api:api,fullName:fullName,firstName:firstName,initials:initials,teamName:teamName,ageGroup:ageGroup,
    setTitle:setTitle,setFieldHeader:setFieldHeader,setRouteActions:setRouteActions,
    openDrawer:function(o){return overlay('drawer',o);},openModal:function(o){return overlay('modal',o);},openSheet:function(o){return overlay('sheet',o);},
    closeAll:closeAll,showToast:showToast,refresh:refresh,refreshBadges:refreshBadges,isPublicDemo:isDemo,fetchDemo:fetchDemo
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  window.addEventListener('resize',function(){mountField();});
}());

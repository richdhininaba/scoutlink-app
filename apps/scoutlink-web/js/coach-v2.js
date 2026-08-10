'use strict';

(function () {
  if (window.__coachExactRuntime12) return;
  window.__coachExactRuntime12 = true;

  var MOBILE_MAX = 760;
  var LEGACY_CSS = [
    'coach-v2.css','coach-experience-v8.css','coach-experience-v9.css',
    'coach-layout-core-v1.css','coach-mobile-targeted-fixes-v1.css',
    'coach-dashboard-v3.css','coach-my-players-v3.css','coach-add-player-v3.css',
    'coach-bulk-import-v3.css','coach-match-facts-v3.css','coach-fixtures-v3.css',
    'coach-chat-v3.css'
  ];

  var ROUTES = {
    dashboard:'/coach/dashboard',
    'my-players':'/coach/my-players',
    'add-player':'/coach/add-player',
    'bulk-add-players':'/coach/bulk-add-players',
    fixtures:'/coach/fixtures',
    'match-facts':'/coach/match-facts',
    'video-reels':'/coach/video-reels',
    chat:'/coach/chat',
    notifications:'/coach/notifications',
    'report-a-concern':'/coach/report-a-concern',
    settings:'/coach/settings'
  };

  var NAV = [
    ['Overview',[['dashboard','Dashboard']]],
    ['Squad',[['my-players','My Players'],['add-player','Add Player'],['bulk-add-players','Bulk Import']]],
    ['Matchday',[['fixtures','Fixtures'],['match-facts','Match Facts'],['video-reels','Video Reels']]],
    ['Inbox',[['chat','Chat'],['notifications','Notifications']]],
    ['Trust & admin',[['report-a-concern','Report a Concern'],['settings','Settings']]]
  ];

  var ICONS = {
    Today:'<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4z"/><path d="M8 3v6M16 3v6M4 10h16"/></svg>',
    Squad:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 20c.8-4 3-6 6-6s5.2 2 6 6"/></svg>',
    Match:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><line x1="12" y1="13.5" x2="12" y2="9"/><line x1="9.5" y1="3.5" x2="14.5" y2="3.5"/></svg>',
    Inbox:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11h-10l-4.5 3.6V16H4z"/></svg>',
    More:'<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>'
  };

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function path(){return String(location.pathname||'').toLowerCase();}
  function key(){
    var p=path();
    if(p.indexOf('/coach/dashboard')===0)return'dashboard';
    if(p.indexOf('/coach/my-players')===0)return'my-players';
    if(p.indexOf('/coach/add-player')===0)return'add-player';
    if(p.indexOf('/coach/bulk-add-players')===0)return'bulk-add-players';
    if(p.indexOf('/coach/fixtures')===0)return'fixtures';
    if(p.indexOf('/coach/match-facts')===0)return'match-facts';
    if(p.indexOf('/coach/video-reels')===0)return'video-reels';
    if(p.indexOf('/coach/chat')===0)return'chat';
    if(p.indexOf('/coach/notifications')===0)return'notifications';
    if(p.indexOf('/coach/report-a-concern')===0)return'report-a-concern';
    if(p.indexOf('/coach/settings')===0)return'settings';
    if(p.indexOf('/player/profile')===0)return'profile';
    return '';
  }
  function user(){try{return (window.Auth&&window.Auth.user)||JSON.parse(localStorage.getItem('sl_user')||'{}')||{};}catch(_){return {};}}
  function name(){var u=user();return [u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ')||'Coach';}
  function first(){return name().split(/\s+/)[0]||'Coach';}
  function initials(){var a=name().split(/\s+/);return ((a[0]||'C')[0]+((a[1]||a[0]||'O')[0])).toUpperCase();}
  function team(){var u=user();try{return localStorage.getItem('sl_team_name')||u.teamName||u.team_name||u.clubName||u.club_name||'Your team';}catch(_){return u.teamName||u.team_name||'Your team';}}
  function age(){var u=user();try{return localStorage.getItem('sl_team_age_group')||u.ageGroup||u.age_group||u.team_age_group||'';}catch(_){return'';}}
  function title(){
    return {dashboard:'Dashboard','my-players':'My Players','add-player':'Add Player','bulk-add-players':'Bulk Import',fixtures:'Fixtures','match-facts':'Match Facts','video-reels':'Video Reels',chat:'Chat',notifications:'Notifications','report-a-concern':'Report a Concern',settings:'Settings',profile:'Player Profile'}[key()]||'Coach';
  }
  function demo(){try{return localStorage.getItem('sl_demo_mode')==='1'||sessionStorage.getItem('sl_public_demo')==='1';}catch(_){return false;}}
  function unread(){var n=document.getElementById('notifBadge');var v=n&&parseInt(n.textContent,10);return isFinite(v)?v:0;}

  function removeLegacyCss(){
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){
      var href=String(link.getAttribute('href')||'');
      if(LEGACY_CSS.some(function(x){return href.indexOf(x)>=0;}))link.remove();
    });
    document.querySelectorAll('style[data-coach-legacy-inline]').forEach(function(n){n.remove();});
  }
  function ensureCss(){
    if(document.querySelector('link[href*="coach-desk-field-v1.css"]'))return;
    var l=document.createElement('link');l.rel='stylesheet';l.href='/css/coach-desk-field-v1.css?v=12.0.0';document.head.appendChild(l);
  }

  function nav(){
    var active=key()==='profile'?'my-players':key();
    return NAV.map(function(g){
      return '<div class="coach-desk-group">'+g[0]+'</div>'+g[1].map(function(i){
        var badge=(i[0]==='notifications'&&unread())?'<span class="bdg">'+unread()+'</span>':'';
        return '<a class="coach-desk-nav '+(active===i[0]?'on':'')+'" href="'+ROUTES[i[0]]+'"><span>'+i[1]+'</span>'+badge+'</a>';
      }).join('');
    }).join('');
  }
  function crest(){
    return '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3.5"><rect x="3" y="3" width="34" height="34"/><line x1="3" y1="20" x2="37" y2="20"/><circle cx="20" cy="20" r="6.5"/></svg>';
  }

  function signOut(){
    if(window.logoutToLogin){window.logoutToLogin();return;}
    if(window.Auth&&window.Auth.clear)window.Auth.clear();
    ['sl_token','sl_type','sl_user','sl_user_id','sl_user_email','sl_demo_mode'].forEach(function(k){try{localStorage.removeItem(k);}catch(_){}});
    location.href='/login?logout=1';
  }
  function switchDemo(){
    if(window.openExperienceSelector){window.openExperienceSelector();return;}
    location.href=demo()?'/experience-select':'/experience-select';
  }

  function searchApi(pathname){
    if(window.api)return window.api('GET',pathname);
    var base=window.API||localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';
    var tok=(window.Auth&&window.Auth.token)||localStorage.getItem('sl_token')||'';
    return fetch(base+pathname,{headers:tok?{Authorization:'Bearer '+tok}:{}}).then(function(r){return r.json();});
  }
  var searchCache=null;
  function loadSearch(){
    if(searchCache)return Promise.resolve(searchCache);
    return Promise.allSettled([searchApi('/api/coaches/my-players'),searchApi('/api/fixtures'),searchApi('/api/videos')]).then(function(rs){
      function arr(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
      var p=rs[0].status==='fulfilled'?arr(rs[0].value,['players','data']):[];
      var f=rs[1].status==='fulfilled'?arr(rs[1].value,['fixtures','data']):[];
      var v=rs[2].status==='fulfilled'?arr(rs[2].value,['videos','data']):[];
      searchCache=p.map(function(x){var n=[x.first_name,x.last_name].filter(Boolean).join(' ')||'Player';return{t:n,m:[x.age_group,x.specific_position||x.primary_position].filter(Boolean).join(' · '),h:'/player/profile?id='+encodeURIComponent(x.id||'')};})
        .concat(f.map(function(x){return{t:x.opponent||'Fixture',m:[x.fixture_date,x.venue].filter(Boolean).join(' · '),h:'/coach/fixtures'};}))
        .concat(v.map(function(x){return{t:x.title||x.file_name||'Video',m:x.player_name||'',h:'/coach/video-reels'};}));
      return searchCache;
    });
  }
  function bindSearch(root){
    var input=root.querySelector('input'),box=root.querySelector('.coach-desk-search-results');
    if(!input||!box)return;
    input.addEventListener('input',function(){
      var q=input.value.trim().toLowerCase();
      if(!q){root.classList.remove('open');box.innerHTML='';return;}
      root.classList.add('open');box.innerHTML='<div class="coach-search-row"><small>Searching…</small></div>';
      loadSearch().then(function(items){
        var m=items.filter(function(x){return(x.t+' '+x.m).toLowerCase().indexOf(q)>=0;}).slice(0,8);
        box.innerHTML=m.length?m.map(function(x){return'<a class="coach-search-row" href="'+esc(x.h)+'"><div><b>'+esc(x.t)+'</b><small>'+esc(x.m)+'</small></div></a>';}).join(''):'<div class="coach-search-row"><small>No results</small></div>';
      });
    });
  }

  function deskShell(content){
    return '<div class="coach-desk-screen"><div class="coach-desk-shell">'+
      '<aside class="coach-desk-sb"><div class="coach-desk-brand">'+crest()+'<div><b>Scout<i>Link</i></b><span>by Stratex Analytics</span></div></div>'+
      '<div class="coach-desk-ws"><b>'+esc(team())+'</b><span>'+esc((age()?age()+' · ':'')+'Coach workspace')+'</span></div>'+nav()+
      '<div class="coach-desk-me"><span class="av">'+esc(initials())+'</span><div class="me-copy"><b>'+esc(name())+'</b><span class="meta">Coach · '+esc(team())+'</span><button type="button" data-coach-signout>Sign out</button></div></div></aside>'+
      '<div class="coach-desk-main"><div class="coach-desk-tb"><span class="t">'+esc(title())+'</span><span class="sp"></span>'+
      (demo()?'<button class="btn sm gh" type="button" data-coach-switch>Switch demo</button>':'')+
      '<div class="coach-desk-search"><div class="coach-desk-srch"><input type="search" placeholder="Search players, fixtures, videos…"><kbd>⌘K</kbd></div><div class="coach-desk-search-results"></div></div>'+
      '<button class="coach-desk-bell" type="button" data-coach-notifications>🔔'+(unread()?'<u>'+unread()+'</u>':'')+'</button><span class="av">'+esc(initials())+'</span></div>'+
      '<main class="coach-desk-cv" id="coachExactDeskBody"></main></div></div></div>';
  }

  function fieldTab(t,href,on,badge){
    return '<a class="'+(on?'on':'')+'" href="'+href+'"><span class="b">'+ICONS[t]+(badge?'<u>'+badge+'</u>':'')+'</span>'+t+'</a>';
  }
  function fieldShell(){
    var k=key(), on=k==='dashboard'?'Today':(k==='my-players'||k==='profile'?'Squad':k==='match-facts'?'Match':(k==='chat'||k==='notifications'?'Inbox':'More'));
    return '<div class="coach-field-shell"><div class="coach-field-body" id="coachExactFieldBody"></div><nav class="field-tabs">'+
      fieldTab('Today','/coach/dashboard',on==='Today',0)+fieldTab('Squad','/coach/my-players',on==='Squad',0)+fieldTab('Match','/coach/match-facts',on==='Match',0)+fieldTab('Inbox','/coach/chat',on==='Inbox',unread())+
      '<button class="'+(on==='More'?'on':'')+'" type="button" data-coach-more><span class="b">'+ICONS.More+'</span>More</button></nav></div>';
  }

  function install(){
    if(!key())return;
    removeLegacyCss();ensureCss();document.body.classList.add('coach-product');

    var existing=document.querySelector('.page-content')||document.querySelector('#coachDashboardApp')||document.querySelector('#coachMyPlayersApp');
    if(!existing)return;

    var holder=document.createElement('div');
    while(existing.firstChild)holder.appendChild(existing.firstChild);

    document.body.innerHTML=deskShell()+fieldShell();
    var desk=document.getElementById('coachExactDeskBody');
    while(holder.firstChild)desk.appendChild(holder.firstChild);

    /* On phone the route adapter renders an intentional Field body. */
    if(window.CoachExactRoutes&&window.CoachExactRoutes.render)window.CoachExactRoutes.render();
    bindSearch(document.querySelector('.coach-desk-search'));

    document.addEventListener('click',function(e){
      if(e.target.closest('[data-coach-signout]')){e.preventDefault();signOut();}
      if(e.target.closest('[data-coach-switch]')){e.preventDefault();switchDemo();}
      if(e.target.closest('[data-coach-notifications]')){e.preventDefault();location.href='/coach/notifications';}
      if(e.target.closest('[data-coach-more]')){e.preventDefault();if(window.CoachExactRoutes&&window.CoachExactRoutes.openMore)window.CoachExactRoutes.openMore();}
    });
  }

  function loadAdapter(cb){
    if(window.CoachExactRoutes){cb();return;}
    var s=document.createElement('script');s.src='/js/coach-exact-routes-v1.js?v=1.0.0';s.onload=cb;document.head.appendChild(s);
  }

  function boot(){loadAdapter(function(){setTimeout(install,0);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());

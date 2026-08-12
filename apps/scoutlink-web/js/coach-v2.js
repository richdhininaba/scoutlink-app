'use strict';

/*
 * ScoutLink Coach Desk / Coach Field shell.
 * Exact production shell for the supplied Coach Desk (desktop) and Coach Field (phone) designs.
 * Route renderers own data and business actions; this file owns shared chrome/navigation/overlays.
 */
(function(){
  if(window.__scoutlinkCoachExactShell) return;
  window.__scoutlinkCoachExactShell=true;

  var ROUTES={
    'Dashboard':'/coach/dashboard',
    'My Players':'/coach/my-players',
    'Add Player':'/coach/add-player',
    'Bulk Import':'/coach/bulk-add-players',
    'Fixtures':'/coach/fixtures',
    'Match Facts':'/coach/match-facts',
    'Video Reels':'/coach/video-reels',
    'Chat':'/coach/chat',
    'Notifications':'/coach/notifications',
    'Settings':'/coach/settings',
    'Report a Concern':'/coach/report-a-concern'
  };
  var NAV=[
    ['Overview',['Dashboard']],
    ['Squad',['My Players','Add Player','Bulk Import']],
    ['Matchday',['Fixtures','Match Facts','Video Reels']],
    ['Inbox',['Chat','Notifications']],
    ['Trust & Admin',['Settings','Report a Concern']]
  ];
  var FIELD=[
    ['Dashboard','/coach/dashboard','today'],
    ['Players','/coach/my-players','squad'],
    ['Matchday','/coach/match-facts','match'],
    ['Inbox','/coach/chat','inbox'],
    ['More','#','more']
  ];
  var ICONS={
    today:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h5M8 17h3"/></svg>',
    squad:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.7-3.5 2.7-5.3 5.5-5.3s4.8 1.8 5.5 5.3M14 15c2.9-.7 5.1.7 6.1 4"/></svg>',
    match:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="2.2"/></svg>',
    inbox:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 3z"/><path d="M8 9h8M8 13h5"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>'
  };
  var unread=0;
  var playerCount=0;
  var matchFactsOpen=0;
  var videoPending=0;
  var unreadChat=0;
  var searchCache=null,searchLoading=null;
  var titleOverride='',subtitleOverride='',fieldTitleOverride=null,fieldSubtitleOverride=null,fieldRightOverride=null,fieldLeftOverride=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clean(href){return typeof window.cleanRouteFor==='function'?window.cleanRouteFor(href):href;}
  function api(method,path,body){
    if(typeof window.api==='function') return window.api(method,path,body);
    return Promise.reject(new Error('ScoutLink API client is unavailable.'));
  }
  function list(r,keys){
    if(Array.isArray(r)) return r;
    for(var i=0;i<keys.length;i++) if(r&&Array.isArray(r[keys[i]])) return r[keys[i]];
    return [];
  }
  function isPublicDemo(){try{return (typeof window.isPublicDemoMode==='function'&&window.isPublicDemoMode())||sessionStorage.getItem('sl_public_demo')==='1';}catch(_){return false;}}
  function user(){return window.Auth&&window.Auth.user?window.Auth.user:{};}
  function fullName(){
    var u=user(),n=[u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ').trim();
    try{return n||localStorage.getItem('sl_user_name')||'Coach';}catch(_){return n||'Coach';}
  }
  function firstName(){return fullName().split(/\s+/)[0]||'Coach';}
  function initials(value){
    var p=String(value||fullName()).trim().split(/\s+/).filter(Boolean);
    return (((p[0]||'C')[0]||'C')+((p[1]||p[0]||'O')[0]||'O')).toUpperCase();
  }
  function teamName(){
    var u=user();
    try{return localStorage.getItem('sl_team_name')||u.team_name||u.teamName||u.club_name||u.clubName||'Your team';}
    catch(_){return u.team_name||u.teamName||'Your team';}
  }
  function ageGroup(){
    var u=user();
    try{return localStorage.getItem('sl_team_age_group')||u.age_group||u.ageGroup||'';}
    catch(_){return u.age_group||u.ageGroup||'';}
  }
  function allowedCoach(){
    if(isPublicDemo()) return true;
    var t=window.Auth&&window.Auth.type;
    return t==='Coach'||t==='Stratex'||t==='Stratex Admin';
  }
  function activeLabel(){
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    return shell&&shell.getAttribute('data-active')||'Dashboard';
  }
  function pageTitle(){
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    return titleOverride||(shell&&shell.getAttribute('data-title'))||activeLabel()||'Coach';
  }
  function pageSubtitle(){
    if(subtitleOverride) return subtitleOverride;
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    var crumb=shell&&shell.getAttribute('data-crumb');
    if(crumb) return crumb;
    return [teamName(),ageGroup()].filter(Boolean).join(' · ');
  }
  function badge(label){
    if(label==='My Players'&&playerCount) return '<span class="ct q">'+playerCount+'</span>';
    if(label==='Match Facts'&&matchFactsOpen) return '<span class="ct">'+matchFactsOpen+'</span>';
    if(label==='Video Reels'&&videoPending) return '<span class="ct">'+videoPending+'</span>';
    if(label==='Chat'&&unreadChat) return '<span class="ct">'+unreadChat+'</span>';
    if(label==='Notifications'&&unread) return '<span class="ct">'+unread+'</span>';
    return '';
  }
  function navHtml(active){
    return NAV.map(function(g){
      return '<div class="nav-grp">'+esc(g[0])+'</div>'+g[1].map(function(label){
        return '<a class="nav-i'+(label===active?' on':'')+'" href="'+esc(clean(ROUTES[label]))+'"><b>'+esc(label)+'</b>'+badge(label)+'</a>';
      }).join('');
    }).join('');
  }
  function actionHtml(shell,primary){
    var key=primary?'data-tbx-spend':'data-tbx';
    var label=shell&&shell.getAttribute(key);
    if(!label) return '';
    var href=shell.getAttribute(key+'-href'),id=shell.getAttribute(key+'-id');
    var cls='btn'+(primary?' p':'');
    if(href) return '<a class="'+cls+'" '+(id?'id="'+esc(id)+'" ':'')+'href="'+esc(clean(href))+'">'+esc(label)+'</a>';
    return '<button type="button" class="'+cls+'" '+(id?'id="'+esc(id)+'" ':'')+'>'+esc(label)+'</button>';
  }
  function hydrateDesk(){
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    if(!shell) return;
    var cv=shell.querySelector('.cv');
    if(!cv) return;
    var active=shell.getAttribute('data-active')||'';
    if(shell.dataset.exactMounted==='1'){
      refreshChrome();
      return;
    }
    shell.dataset.exactMounted='1';
    shell.classList.add('app','rel');
    cv.classList.add('body');
    cv.id=cv.id||'coachDeskPage';

    var nav=document.createElement('aside');
    nav.className='nav';
    nav.id='coachDeskNav';
    nav.innerHTML='<div class="nav-logo"><i></i></div><nav aria-label="Coach Desk">'+navHtml(active)+'</nav>'+
      '<div class="nav-you" tabindex="0" role="button" aria-haspopup="menu" data-coach-account>'+
        '<div class="av">'+esc(initials())+'</div><div><u>'+esc(fullName())+'</u><s>'+esc((user().role_at_club||'Head Coach')+' · '+teamName())+'</s></div>'+
      '</div>';

    var main=document.createElement('div');
    main.className='main';
    var top=document.createElement('header');
    top.className='top';
    top.id='coachDeskTop';
    main.appendChild(top);

    var parent=cv.parentNode;
    parent.insertBefore(nav,cv);
    parent.insertBefore(main,cv);
    main.appendChild(cv);
    refreshChrome();
  }
  function refreshChrome(){
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    var nav=document.getElementById('coachDeskNav');
    var top=document.getElementById('coachDeskTop');
    if(nav){
      var n=nav.querySelector('nav');
      if(n) n.innerHTML=navHtml(shell&&shell.getAttribute('data-active')||'');
      var footer=nav.querySelector('.nav-you');
      if(footer) footer.innerHTML='<div class="av">'+esc(initials())+'</div><div><u>'+esc(fullName())+'</u><s>'+esc((user().role_at_club||'Head Coach')+' · '+teamName())+'</s></div>';
    }
    if(top&&shell){
      var subtitle=pageSubtitle();
      top.innerHTML='<div><h1>'+esc(pageTitle())+'</h1>'+(subtitle?'<div class="sub">'+esc(subtitle)+'</div>':'')+'</div>'+
        '<div class="sp"></div>'+actionHtml(shell,false)+actionHtml(shell,true)+
        '<div class="coach-search-wrap"><label class="srch"><input id="coachGlobalSearch" type="search" autocomplete="off" placeholder="Search players, scouts, fixtures" aria-label="Search players, scouts, fixtures"></label><div class="coach-search-results" id="coachSearchResults"></div></div>'+
        '<button class="bell" type="button" data-coach-notifications aria-label="Notifications">☼'+(unread?'<u>'+unread+'</u>':'')+'</button>'+
        '<button type="button" class="av" data-coach-account aria-label="Coach account">'+esc(initials())+'</button>';
      bindSearch(top.querySelector('.coach-search-wrap'));
    }
  }
  function fieldActive(){
    var p=String(location.pathname||'').replace(/\/+$/,'');
    if(/\/coach\/dashboard$/.test(p)) return 'today';
    if(/\/coach\/my-players$/.test(p)||/\/player\/profile$/.test(p)) return 'squad';
    if(/\/coach\/match-facts$/.test(p)) return 'match';
    if(/\/coach\/(chat|notifications)$/.test(p)) return 'inbox';
    return 'more';
  }
  function fieldTabs(){
    var active=fieldActive();
    return FIELD.map(function(x){
      var label=x[0],href=x[1],key=x[2],b=(key==='inbox'?(unreadChat||unread):0);
      return '<a class="'+(key===active?'on':'')+'" href="'+(href==='#'?'#':esc(clean(href)))+'" '+(key==='more'?'data-coach-more':'')+'>'+
        '<span class="b">'+ICONS[key]+(b?'<u>'+b+'</u>':'')+'</span>'+label+'</a>';
    }).join('');
  }
  function hydrateField(){
    document.querySelectorAll('.coach-field .scr').forEach(function(scr){
      var body=scr.querySelector('.body,#coachFieldPage');
      if(!body) return;
      body.classList.remove('body');
      body.classList.add('pbody');
      body.id='coachFieldPage';
      if(!scr.querySelector('.sbar')){
        var sbar=document.createElement('div');sbar.className='sbar';
        var now=new Date(),hh=String(now.getHours()).padStart(2,'0'),mm=String(now.getMinutes()).padStart(2,'0');
        sbar.innerHTML='<u>'+hh+':'+mm+'</u><u>●●●&nbsp;&nbsp;▮▮▮</u>';
        scr.insertBefore(sbar,body);
      }
      var ptop=scr.querySelector('.ptop');
      if(!ptop){
        ptop=document.createElement('header');ptop.className='ptop';ptop.id='coachFieldTop';
        scr.insertBefore(ptop,body);
      }
      var fieldTitle=fieldTitleOverride!==null?fieldTitleOverride:pageTitle(),fieldSub=fieldSubtitleOverride!==null?fieldSubtitleOverride:pageSubtitle();
      var defaultFieldRight='<button class="ic" type="button" data-coach-notifications aria-label="Notifications">☼'+(unread?'<u>'+unread+'</u>':'')+'</button><button class="av" type="button" data-coach-account aria-label="Coach account">'+esc(initials())+'</button>';
      var fieldRight=fieldRightOverride!==null?fieldRightOverride:defaultFieldRight;
      var fieldLeft=fieldLeftOverride==='back'?'<button class="bk" type="button" data-field-back aria-label="Back">‹</button>':(fieldLeftOverride?fieldLeftOverride:'<div class="mk"></div>');
      var fieldMarkup=fieldLeft+'<div><h1>'+esc(fieldTitle)+'</h1>'+(fieldSub?'<div class="mut" style="font-size:10.5px">'+esc(fieldSub)+'</div>':'')+'</div><div class="sp"></div>'+fieldRight;
      if(ptop.dataset.coachMarkup!==fieldMarkup){ptop.innerHTML=fieldMarkup;ptop.dataset.coachMarkup=fieldMarkup;}
      var tabs=scr.querySelector('.tabs,.ptabs');
      if(!tabs){tabs=document.createElement('nav');scr.appendChild(tabs);}
      tabs.className='ptabs';tabs.setAttribute('aria-label','Coach Field');tabs.innerHTML=fieldTabs();
      var home=scr.querySelector('.homebar');if(home)home.remove();
    });
  }
  function setTitle(title,subtitle){
    titleOverride=title||'';
    if(arguments.length>1) subtitleOverride=subtitle||'';
    refreshChrome();hydrateField();
  }
  function setSubtitle(v){subtitleOverride=v||'';refreshChrome();hydrateField();}
  function setFieldHeader(title,subtitle,rightHtml,leftHtml){fieldTitleOverride=arguments.length>0?String(title||''):null;fieldSubtitleOverride=arguments.length>1?String(subtitle||''):null;fieldRightOverride=arguments.length>2?String(rightHtml||''):null;fieldLeftOverride=arguments.length>3?String(leftHtml||''):null;hydrateField();}
  function setTopChip(){/* source design has no global chip; kept for compatibility */}
  function closeAll(){document.querySelectorAll('[data-coach-overlay]').forEach(function(n){n.remove();});}
  function openOverlay(kind,opt){
    opt=opt||{};closeAll();
    var bg=document.createElement('div');bg.className='coach-drawer-backdrop';bg.dataset.coachOverlay='1';
    var box=document.createElement('section');box.dataset.coachOverlay='1';box.className='coach-overlay '+(innerWidth<=760?'psheet':kind==='modal'?'modal':'drw');
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',opt.title||'Details');
    box.innerHTML=(innerWidth<=760?'<div class="gr"></div>':'')+
      '<div class="'+(innerWidth<=760?'sh':'drw-h')+'"><h3 style="margin:0">'+esc(opt.title||'Details')+'</h3><div class="sp"></div><button type="button" class="btn q" data-close-coach-overlay>Close</button></div>'+
      '<div class="ob">'+(opt.html||'')+'</div>'+(opt.footer?'<div class="of">'+opt.footer+'</div>':'');
    document.body.appendChild(bg);document.body.appendChild(box);return box;
  }
  function openDrawer(opt){return openOverlay('drawer',opt);}
  function openModal(opt){return openOverlay('modal',opt);}
  function openSheet(opt){return openOverlay('sheet',opt);}
  function showToast(message,error){
    var t=document.createElement('div');t.className='toast';t.setAttribute('role',error?'alert':'status');t.textContent=message;
    document.body.appendChild(t);setTimeout(function(){t.remove();},3400);
  }
  function openAccount(){
    closeAll();
    if(innerWidth<=760){
      openSheet({title:fullName(),html:'<div class="row"><div class="av">'+esc(initials())+'</div><div class="sp"><b class="rt">'+esc(fullName())+'</b><s class="rs">'+esc(teamName())+'</s></div></div><a class="row" href="/experience-select" style="text-decoration:none"><div class="sp"><b class="rt">Switch workspace</b></div><span>›</span></a>',footer:'<button class="btn" type="button" data-coach-signout>Sign out</button>'});
      return;
    }
    var nav=document.getElementById('coachDeskNav');if(!nav)return;
    var menu=document.createElement('div');menu.className='nav-menu';menu.dataset.coachOverlay='1';
    menu.innerHTML='<button type="button" data-coach-switch>Switch workspace</button><button type="button" data-coach-signout>Sign out</button>';
    nav.appendChild(menu);
  }
  function openMore(){
    openSheet({title:'More',html:
      '<a class="row" href="/coach/fixtures" style="text-decoration:none"><span class="icn">FX</span><span class="sp"><b class="rt">Fixtures</b><s class="rs">Schedule, attendance and Match Facts</s></span><span>›</span></a>'+
      '<a class="row" href="/coach/video-reels" style="text-decoration:none"><span class="icn b">▶</span><span class="sp"><b class="rt">Video Reels</b><s class="rs">Coverage and review queue</s></span><span>›</span></a>'+
      '<a class="row" href="/coach/add-player" style="text-decoration:none"><span class="icn b">+</span><span class="sp"><b class="rt">Add Player</b><s class="rs">Four-stage player setup</s></span><span>›</span></a>'+
      '<a class="row" href="/coach/settings" style="text-decoration:none"><span class="icn">⚙</span><span class="sp"><b class="rt">Settings</b><s class="rs">Team, coaches, notifications and account</s></span><span>›</span></a>'+
      '<a class="row" href="/coach/report-a-concern" style="text-decoration:none"><span class="icn r">!</span><span class="sp"><b class="rt" style="color:var(--red)">Report a Concern</b><s class="rs">Safeguarding and trust</s></span><span>›</span></a>',
      footer:'<button class="btn" type="button" data-coach-signout>Sign out</button>'
    });
  }
  function signOut(){
    if(isPublicDemo()&&typeof window.exitPublicDemo==='function'){window.exitPublicDemo();return;}
    if(window.Auth&&typeof window.Auth.clear==='function') window.Auth.clear();
    location.href=clean('/login?logout=1');
  }
  function switchWorkspace(){
    if(typeof window.openExperienceSelector==='function'){window.openExperienceSelector();return;}
    location.href=clean('/experience-select');
  }
  function searchItems(){
    if(searchCache) return Promise.resolve(searchCache);
    if(searchLoading) return searchLoading;
    searchLoading=Promise.allSettled([api('GET','/api/coaches/my-players'),api('GET','/api/fixtures')]).then(function(rs){
      var ps=rs[0].status==='fulfilled'?list(rs[0].value,['data','players']):[];
      var fs=rs[1].status==='fulfilled'?list(rs[1].value,['data','fixtures']):[];
      searchCache=ps.map(function(p){return{title:[p.first_name,p.last_name].filter(Boolean).join(' ')||'Player',meta:[p.age_group,p.specific_position||p.primary_position].filter(Boolean).join(' · '),href:'/player/profile?id='+encodeURIComponent(p.id)};})
        .concat(fs.map(function(f){return{title:'vs '+(f.opponent||'Opponent'),meta:[f.fixture_date,f.venue].filter(Boolean).join(' · '),href:'/coach/fixtures?fixtureId='+encodeURIComponent(f.id)};}));
      return searchCache;
    }).finally(function(){searchLoading=null;});
    return searchLoading;
  }
  function bindSearch(wrap){
    if(!wrap||wrap.dataset.bound==='1') return;wrap.dataset.bound='1';
    var input=wrap.querySelector('input'),panel=wrap.querySelector('.coach-search-results');if(!input||!panel)return;
    panel.style.cssText='display:none;position:absolute;right:0;top:36px;width:360px;max-height:380px;overflow:auto;background:var(--paper);border:1px solid var(--line2);z-index:920;padding:4px';
    input.oninput=function(){
      var q=input.value.trim().toLowerCase();if(q.length<2){panel.style.display='none';return;}
      panel.style.display='block';panel.innerHTML='<div class="row"><span class="mut">Searching…</span></div>';
      searchItems().then(function(items){
        var m=items.filter(function(x){return(x.title+' '+x.meta).toLowerCase().indexOf(q)>=0;}).slice(0,10);
        panel.innerHTML=m.length?m.map(function(x){return'<a class="row" href="'+esc(clean(x.href))+'" style="text-decoration:none"><div class="sp"><b class="rt">'+esc(x.title)+'</b><s class="rs">'+esc(x.meta)+'</s></div></a>';}).join(''):'<div class="row"><span class="mut">No matches.</span></div>';
      });
    };
  }
  function refreshBadges(){
    return Promise.allSettled([
      api('GET','/api/notifications?limit=100'),
      api('GET','/api/coaches/my-players'),
      api('GET','/api/chat/threads'),
      api('GET','/api/videos?type=player'),
      api('GET','/api/match-facts?limit=100')
    ]).then(function(rs){
      if(rs[0].status==='fulfilled'){var r=rs[0].value,a=list(r,['data','notifications']);var ex=Number(r.unreadCount!=null?r.unreadCount:r.unread_count);unread=Number.isFinite(ex)?ex:a.filter(function(n){return !(n.is_read||n.isRead);}).length;}
      if(rs[1].status==='fulfilled') playerCount=list(rs[1].value,['data','players']).length;
      if(rs[2].status==='fulfilled') unreadChat=list(rs[2].value,['data','threads']).filter(function(t){return Number(t.unread_count||t.unreadCount||0)>0;}).length;
      if(rs[3].status==='fulfilled') videoPending=list(rs[3].value,['data','videos']).filter(function(v){return String(v.moderation_status||v.status||'approved').toLowerCase()==='pending';}).length;
      if(rs[4].status==='fulfilled') matchFactsOpen=list(rs[4].value,['data','matchFacts','matches']).filter(function(m){return m.confirmed===false||String(m.status||'').toLowerCase()==='draft';}).length;
      refreshChrome();hydrateField();
      return unread;
    }).catch(function(){refreshChrome();hydrateField();});
  }
  function setRouteActions(secondaryLabel,secondaryHref,primaryLabel,primaryHref){
    if(secondaryLabel&&typeof secondaryLabel==='object'){
      var config=secondaryLabel||{},secondary=config.secondary||null,primary=config.primary||null;
      secondaryLabel=secondary&&secondary.label||'';
      secondaryHref=secondary&&secondary.href||'';
      primaryLabel=primary&&primary.label||'';
      primaryHref=primary&&primary.href||'';
    }
    var shell=document.querySelector('.coach-desk [data-coach-shell]');
    if(!shell) return;
    function set(labelKey,hrefKey,label,href){
      if(label) shell.setAttribute(labelKey,label); else shell.removeAttribute(labelKey);
      shell.removeAttribute(labelKey+'-id');
      if(href) shell.setAttribute(hrefKey,href); else shell.removeAttribute(hrefKey);
    }
    set('data-tbx','data-tbx-href',secondaryLabel,secondaryHref);
    set('data-tbx-spend','data-tbx-spend-href',primaryLabel,primaryHref);
    refreshChrome();
  }
  function refresh(){hydrateDesk();hydrateField();}
  function init(){
    if(!allowedCoach()) return;
    document.body.classList.add('coach-product');
    hydrateDesk();hydrateField();refreshBadges();
    document.addEventListener('click',function(e){
      var t=e.target;
      if(t.closest('[data-field-back]')){e.preventDefault();history.back();return;}
      if(t.closest('[data-coach-notifications]')){e.preventDefault();location.href=clean('/coach/notifications');return;}
      if(t.closest('[data-coach-more]')){e.preventDefault();openMore();return;}
      if(t.closest('[data-coach-account]')){e.preventDefault();openAccount();return;}
      if(t.closest('[data-coach-signout]')){e.preventDefault();signOut();return;}
      if(t.closest('[data-coach-switch]')){e.preventDefault();switchWorkspace();return;}
      if(t.closest('[data-close-coach-overlay]')||t.classList&&t.classList.contains('coach-drawer-backdrop')){e.preventDefault();closeAll();return;}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll();});
  }

  window.CoachV2={
    esc:esc,clean:clean,api:api,refresh:refresh,refreshBadges:refreshBadges,
    openDrawer:openDrawer,openModal:openModal,openSheet:openSheet,openOverlay:openOverlay,
    closeAll:closeAll,closeOverlay:closeAll,showToast:showToast,
    teamName:teamName,ageGroup:ageGroup,fullName:fullName,firstName:firstName,initials:initials,
    isPublicDemo:isPublicDemo,allowedCoach:allowedCoach,signOut:signOut,
    setTopChip:setTopChip,setTitle:setTitle,setSubtitle:setSubtitle,setFieldHeader:setFieldHeader,setRouteActions:setRouteActions
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
}());

'use strict';

/* ScoutLink Coach Desk / Coach Field shell. Presentation only: route scripts own page bodies. */
(function () {
  if (window.__coachProductShellV13) return;
  window.__coachProductShellV13 = true;

  var ROUTES = {
    'Dashboard':'/coach/dashboard','My Players':'/coach/my-players','Add Player':'/coach/add-player',
    'Bulk Import':'/coach/bulk-add-players','Fixtures':'/coach/fixtures','Match Facts':'/coach/match-facts',
    'Video Reels':'/coach/video-reels','Chat':'/coach/chat','Notifications':'/coach/notifications',
    'Report a Concern':'/coach/report-a-concern','Settings':'/coach/settings'
  };
  var NAV = [
    ['Overview',[['Dashboard']]],
    ['Squad',[['My Players'],['Add Player'],['Bulk Import']]],
    ['Matchday',[['Fixtures'],['Match Facts'],['Video Reels']]],
    ['Inbox',[['Chat'],['Notifications']]],
    ['Trust & admin',[['Report a Concern'],['Settings']]]
  ];
  var FIELD_ICONS = {
    Today:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></svg>',
    Squad:'<svg viewBox="0 0 24 24"><path d="M8 4l-4.5 2.5L5 10l2-.7V20h10V9.3l2 .7 1.5-3.5L16 4l-2 2h-4z"/></svg>',
    Match:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><line x1="12" y1="13.5" x2="12" y2="9"/><line x1="9.5" y1="3.5" x2="14.5" y2="3.5"/></svg>',
    Inbox:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11h-10l-4.5 3.6V16H4z"/></svg>',
    More:'<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>'
  };
  var searchCache = null;
  var unreadCount = 0;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function clean(href) { return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href; }
  function api(method,path,body) {
    if (typeof window.api === 'function') return window.api(method,path,body);
    return Promise.reject(new Error('ScoutLink API client is unavailable.'));
  }
  function isPublicDemo() {
    try { return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) || sessionStorage.getItem('sl_public_demo') === '1'; }
    catch (_) { return false; }
  }
  function currentUser() { return window.Auth && window.Auth.user ? window.Auth.user : {}; }
  function name() {
    var u=currentUser();
    return [u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ').trim() || localStorage.getItem('sl_user_name') || 'Coach';
  }
  function firstName(){ return name().split(/\s+/)[0] || 'Coach'; }
  function initials(value){ var p=String(value||name()).trim().split(/\s+/).filter(Boolean); return ((p[0]||'C')[0]+(p[1]||p[0]||'O')[0]).toUpperCase(); }
  function teamName(){
    var u=currentUser();
    return localStorage.getItem('sl_team_name') || u.team_name || u.teamName || u.club_name || u.clubName || 'Your team';
  }
  function ageGroup(){ var u=currentUser(); return localStorage.getItem('sl_team_age_group') || u.age_group || u.ageGroup || ''; }
  function crest(){ return '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3.5"><rect x="3" y="3" width="34" height="34"/><line x1="3" y1="20" x2="37" y2="20"/><circle cx="20" cy="20" r="6.5"/></svg>'; }

  function allowedCoach() {
    if (isPublicDemo()) return true;
    var type = window.Auth && window.Auth.type;
    return type === 'Coach' || type === 'Stratex';
  }

  function navHtml(active) {
    var html='';
    NAV.forEach(function(group){
      html += '<div class="g">'+esc(group[0])+'</div>';
      group[1].forEach(function(item){
        var label=item[0], badge=(label==='Notifications'&&unreadCount)?'<span class="bdg">'+unreadCount+'</span>':'';
        html += '<a class="n'+(label===active?' on':'')+'" href="'+esc(clean(ROUTES[label]))+'"><span>'+esc(label)+'</span>'+badge+'</a>';
      });
    });
    return html;
  }

  function topAction(shell, key, spend) {
    var label=shell.getAttribute(key); if(!label) return '';
    var prefix=spend?'data-tbx-spend':'data-tbx';
    var href=shell.getAttribute(prefix+'-href');
    var id=shell.getAttribute(prefix+'-id');
    var cls='btn sm'+(spend?' spend':'');
    if(href) return '<a class="'+cls+'"'+(id?' id="'+esc(id)+'"':'')+' href="'+esc(clean(href))+'">'+esc(label)+'</a>';
    return '<button class="'+cls+'" type="button"'+(id?' id="'+esc(id)+'"':'')+'>'+esc(label)+'</button>';
  }

  function hydrateDeskShell(shell) {
    if (!shell || shell.dataset.coachShellMounted === '1') return;
    shell.dataset.coachShellMounted='1';
    var active=shell.getAttribute('data-active')||'';
    var title=shell.getAttribute('data-title')||active;
    var crumb=shell.getAttribute('data-crumb')||'';
    var chip=shell.getAttribute('data-chip')||'';
    var cv=shell.querySelector('.cv');
    if(!cv) return;

    var sb=document.createElement('aside'); sb.className='sb'; sb.id='coachDeskSidebar';
    sb.innerHTML='<div class="brand">'+crest()+'<div><b>Scout<i>Link</i></b><span>by Stratex Analytics</span></div></div>'+
      '<div class="ws"><b>'+esc(teamName())+'</b><span>'+esc((ageGroup()?ageGroup()+' · ':'')+'Coach workspace')+'</span></div>'+
      '<nav aria-label="Coach Desk">'+navHtml(active)+'</nav>'+
      '<div class="me"><span class="av">'+esc(initials())+'</span><span><b style="display:block;color:var(--ink)">'+esc(name())+'</b><span style="font:7.5px var(--mono)">Coach · '+esc(teamName())+'</span><br><button type="button" data-coach-signout style="border:0;background:transparent;padding:0;color:var(--mut);font-size:8px;text-decoration:underline">Sign out</button></span></div>';

    var main=document.createElement('div'); main.className='coach-main';
    var tb=document.createElement('header'); tb.className='tb'; tb.id='coachDeskTopbar';
    tb.innerHTML=(title?'<span class="t">'+esc(title)+'</span>':'')+
      (crumb?'<span class="crumb">'+esc(crumb)+'</span>':'')+
      (chip?'<span class="stg watch" id="coachTopChip">'+esc(chip)+'</span>':'')+
      '<span class="sp"></span>'+
      (isPublicDemo()?'<button class="btn sm gh" type="button" data-coach-switch>Switch demo</button>':'')+
      topAction(shell,'data-tbx',false)+topAction(shell,'data-tbx-spend',true)+
      '<div class="coach-search-wrap"><label class="srch"><input id="coachGlobalSearch" type="search" placeholder="Search players, fixtures, videos…" style="border:0;background:transparent;outline:0;min-width:210px"><kbd>⌘K</kbd></label><div class="coach-search-results" id="coachSearchResults"></div></div>'+
      '<button class="bell" type="button" data-coach-notifications aria-label="Notifications" style="border:0;background:transparent">🔔'+(unreadCount?'<u>'+unreadCount+'</u>':'')+'</button><span class="av">'+esc(initials())+'</span>';

    cv.parentNode.insertBefore(sb,cv);
    cv.parentNode.insertBefore(main,cv);
    main.appendChild(tb); main.appendChild(cv);
    bindSearch(tb.querySelector('.coach-search-wrap'));
  }

  function activeFieldTab(){
    var p=location.pathname;
    if(/\/coach\/dashboard/.test(p)) return 'Today';
    if(/\/coach\/my-players/.test(p)||/\/player\/profile/.test(p)) return 'Squad';
    if(/\/coach\/match-facts/.test(p)) return 'Match';
    if(/\/coach\/(chat|notifications)/.test(p)) return 'Inbox';
    return 'More';
  }
  function fieldTab(label,href,on,badge){ return '<a class="'+(on?'on':'')+'" href="'+clean(href)+'"><span class="b">'+FIELD_ICONS[label]+(badge?'<u>'+badge+'</u>':'')+'</span>'+label+'</a>'; }
  function hydrateField() {
    document.querySelectorAll('.coach-field .scr').forEach(function(scr){
      if(scr.dataset.fieldMounted==='1') return; scr.dataset.fieldMounted='1';
      var tabs=scr.querySelector('.tabs'); if(!tabs){tabs=document.createElement('nav');tabs.className='tabs';scr.appendChild(tabs);}
      var on=activeFieldTab();
      tabs.innerHTML=fieldTab('Today','/coach/dashboard',on==='Today',0)+fieldTab('Squad','/coach/my-players',on==='Squad',0)+fieldTab('Match','/coach/match-facts',on==='Match',0)+fieldTab('Inbox','/coach/chat',on==='Inbox',unreadCount)+
        '<a class="'+(on==='More'?'on':'')+'" href="#" data-coach-more><span class="b">'+FIELD_ICONS.More+'</span>More</a>';
    });
  }

  function openMore() {
    closeOverlay();
    var backdrop=document.createElement('div'); backdrop.className='coach-drawer-backdrop'; backdrop.dataset.coachOverlay='1';
    var sheet=document.createElement('section'); sheet.className='sheet'; sheet.dataset.coachOverlay='1';
    sheet.innerHTML='<div class="grab"></div><div class="sh"><b>More</b><span class="x" data-close-coach-overlay>✕</span></div><div class="stack">'+
      '<a class="rowline" href="/coach/video-reels" style="padding:7px 0;border-bottom:1px solid var(--ln);text-decoration:none"><span class="who"><b>Video Reels</b><span>Review clips and upload links</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/fixtures" style="padding:7px 0;border-bottom:1px solid var(--ln);text-decoration:none"><span class="who"><b>Fixtures</b><span>Agenda and Match Facts status</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/add-player" style="padding:7px 0;border-bottom:1px solid var(--ln);text-decoration:none"><span class="who"><b>Add Player</b><span>The four-stage wizard</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/settings" style="padding:7px 0;border-bottom:1px solid var(--ln);text-decoration:none"><span class="who"><b>Team & coaches</b><span>Deep settings continue on Coach Desk</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/report-a-concern" style="padding:7px 0;text-decoration:none"><span class="who"><b style="color:var(--rd)">Report a Concern</b><span>Reviewed by the Stratex trust team</span></span><span>›</span></a>'+
      '<div class="callout"><b>On Coach Desk:</b> Bulk Import · CSV fixtures · full My Players table · coach invites · Change Password · the Danger Zone.</div>'+
      '<button class="bt gh blk" type="button" data-coach-signout>Sign out</button></div>';
    document.body.appendChild(backdrop); document.body.appendChild(sheet);
  }
  function closeOverlay(){ document.querySelectorAll('[data-coach-overlay]').forEach(function(n){n.remove();}); }
  function openOverlay(kind,options){
    closeOverlay(); options=options||{};
    var backdrop=document.createElement('div');backdrop.className='coach-drawer-backdrop';backdrop.dataset.coachOverlay='1';
    var box=document.createElement('section');box.dataset.coachOverlay='1';box.className=(window.innerWidth<=760?'sheet':(kind==='modal'?'modal':'drawer'));
    box.innerHTML=(window.innerWidth<=760?'<div class="grab"></div>':'')+'<div class="oh"><b>'+esc(options.title||'Details')+'</b><span class="x" data-close-coach-overlay>ESC ✕</span></div><div class="ob">'+(options.html||'')+'</div>'+(options.footer?'<div class="of">'+options.footer+'</div>':'');
    document.body.appendChild(backdrop);document.body.appendChild(box); return box;
  }
  function toast(message){ var n=document.createElement('div');n.className=window.innerWidth<=760?'toastm':'toast';n.style.cssText='position:fixed;right:16px;bottom:'+(window.innerWidth<=760?'82px':'16px')+';z-index:1000';n.innerHTML='<i>✓</i>'+esc(message);document.body.appendChild(n);setTimeout(function(){n.remove();},3200); }

  function signOut(){
    if(isPublicDemo()&&typeof window.exitPublicDemo==='function'){window.exitPublicDemo();return;}
    if(window.Auth&&window.Auth.clear)window.Auth.clear();
    location.href=clean('/login?logout=1');
  }
  function switchDemo(){ if(typeof window.openExperienceSelector==='function'){window.openExperienceSelector();return;} location.href=clean('/experience-select'); }

  function listFrom(r,keys){if(Array.isArray(r))return r;for(var i=0;i<keys.length;i++)if(r&&Array.isArray(r[keys[i]]))return r[keys[i]];return[];}
  function loadSearch(){
    if(searchCache)return Promise.resolve(searchCache);
    return Promise.allSettled([api('GET','/api/coaches/my-players'),api('GET','/api/fixtures'),api('GET','/api/videos?type=player')]).then(function(rs){
      var players=rs[0].status==='fulfilled'?listFrom(rs[0].value,['players','data']):[];
      var fixtures=rs[1].status==='fulfilled'?listFrom(rs[1].value,['fixtures','data']):[];
      var videos=rs[2].status==='fulfilled'?listFrom(rs[2].value,['videos','data']):[];
      searchCache=players.map(function(p){var n=[p.first_name,p.last_name].filter(Boolean).join(' ')||'Player';return{title:n,meta:[p.age_group,p.specific_position||p.primary_position].filter(Boolean).join(' · '),href:'/player/profile?id='+encodeURIComponent(p.id||'')};})
        .concat(fixtures.map(function(f){return{title:f.opponent||f.opponent_name||'Fixture',meta:[f.fixture_date,f.venue_name||f.venue].filter(Boolean).join(' · '),href:'/coach/fixtures'};}))
        .concat(videos.map(function(v){return{title:v.title||'Video',meta:v.player_name||v.category||'',href:'/coach/video-reels'};}));
      return searchCache;
    });
  }
  function bindSearch(wrap){
    if(!wrap||wrap.dataset.bound)return;wrap.dataset.bound='1';var input=wrap.querySelector('input'),result=wrap.querySelector('.coach-search-results');
    input.addEventListener('input',function(){var q=input.value.trim().toLowerCase();if(!q){wrap.classList.remove('open');result.innerHTML='';return;}wrap.classList.add('open');result.innerHTML='<div class="coach-search-result"><small>Searching…</small></div>';loadSearch().then(function(items){var m=items.filter(function(i){return(i.title+' '+i.meta).toLowerCase().indexOf(q)>=0;}).slice(0,8);result.innerHTML=m.length?m.map(function(i){return'<a class="coach-search-result" href="'+esc(clean(i.href))+'"><b>'+esc(i.title)+'</b><small>'+esc(i.meta)+'</small></a>';}).join(''):'<div class="coach-search-result"><small>No results</small></div>';});});
  }

  function paintBadges(){
    document.querySelectorAll('.sb .n').forEach(function(link){
      var label=(link.textContent||'').replace(/\d+$/,'').trim();
      var existing=link.querySelector('.bdg');
      if(label==='Notifications'&&unreadCount){
        if(!existing){existing=document.createElement('span');existing.className='bdg';link.appendChild(existing);}
        existing.textContent=String(unreadCount);
      }else if(existing){existing.remove();}
    });
    document.querySelectorAll('.bell').forEach(function(bell){
      var existing=bell.querySelector('u');
      if(unreadCount){
        if(!existing){existing=document.createElement('u');bell.appendChild(existing);}
        existing.textContent=String(unreadCount);
      }else if(existing){existing.remove();}
    });
    document.querySelectorAll('.coach-field .scr').forEach(function(scr){scr.dataset.fieldMounted='';});
    hydrateField();
  }
  function refreshBadges(){
    return api('GET','/api/notifications?limit=1').then(function(r){
      unreadCount=Number(r.unreadCount||r.unread_count||0)||0;
      paintBadges();
      return unreadCount;
    }).catch(function(){paintBadges();return unreadCount;});
  }
  function setTopChip(text){var chip=document.getElementById('coachTopChip');if(chip)chip.textContent=text||'';}
  function refresh(){document.querySelectorAll('[data-coach-shell]').forEach(hydrateDeskShell);hydrateField();}

  document.addEventListener('click',function(e){
    if(e.target.closest('[data-coach-signout]')){e.preventDefault();signOut();return;}
    if(e.target.closest('[data-coach-switch]')){e.preventDefault();switchDemo();return;}
    if(e.target.closest('[data-coach-notifications]')){e.preventDefault();location.href=clean('/coach/notifications');return;}
    if(e.target.closest('[data-coach-more]')){e.preventDefault();openMore();return;}
    if(e.target.closest('[data-close-coach-overlay]')||e.target.classList.contains('coach-drawer-backdrop')){e.preventDefault();closeOverlay();}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeOverlay();if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){var s=document.getElementById('coachGlobalSearch');if(s){e.preventDefault();s.focus();}}});

  window.CoachV2={refresh:refresh,openDrawer:function(o){return openOverlay('drawer',o);},openModal:function(o){return openOverlay('modal',o);},openSheet:function(o){return openOverlay('sheet',o);},closeAll:closeOverlay,showToast:toast,signOut:signOut,setTopChip:setTopChip,teamName:teamName,ageGroup:ageGroup,fullName:name,firstName:firstName,initials:initials,esc:esc,clean:clean,allowedCoach:allowedCoach,refreshBadges:refreshBadges};

  function boot(){ if(!allowedCoach() && /^\/coach\//.test(location.pathname)){location.href=clean('/login');return;} refresh(); refreshBadges(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());

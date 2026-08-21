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
  var demoStatePromise=null;
  var DEMO_STATE_KEY='scoutlink.coach.publicDemo.v6.functional';
  var permissionCoach=null;
  var duplicateSyncing=false;
  var deepLinkDone={fixture:false,video:false,profile:false};
  var nativeFetch=window.fetch ? window.fetch.bind(window) : null;
  var nativeApi=typeof window.api==='function' ? window.api.bind(window) : null;
  var nativeGetById=document.getElementById.bind(document);

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
  function clone(v){return JSON.parse(JSON.stringify(v||{}));}
  function user(){return window.Auth&&window.Auth.user?window.Auth.user:{};}
  function fullName(){var u=user(),x=[u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ').trim();try{return x||localStorage.getItem('sl_user_name')||'Coach';}catch(_){return x||'Coach';}}
  function firstName(){return fullName().split(/\s+/)[0]||'Coach';}
  function initials(v){var p=String(v||fullName()).trim().split(/\s+/).filter(Boolean);return(((p[0]||'C')[0]||'C')+((p[1]||p[0]||'O')[0]||'O')).toUpperCase();}
  function teamName(){var u=user();try{return localStorage.getItem('sl_team_name')||u.team_name||u.teamName||u.club_name||u.clubName||'Your team';}catch(_){return u.team_name||u.teamName||'Your team';}}
  function ageGroup(){var u=user();try{return localStorage.getItem('sl_team_age_group')||u.age_group||u.ageGroup||'';}catch(_){return u.age_group||u.ageGroup||'';}}
  function now(){return new Date().toISOString();}
  function uid(prefix){return (prefix||'demo')+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);}
  function unwrap(v){return v&&v.data&&typeof v.data==='object'?v.data:v;}
  function demoPositionGroup(code){
    code=String(code||'').toUpperCase();
    if(code==='GK')return'Goalkeeper';
    if(['CB','LB','RB','LWB','RWB'].indexOf(code)>=0)return'Defender';
    if(['DM','CM','AM','LM','RM'].indexOf(code)>=0)return'Midfielder';
    return'Attacker';
  }
  function demoOverallFromRatings(ratings){
    var values=[];
    (function walk(value){
      if(!value||typeof value!=='object'||Array.isArray(value))return;
      Object.keys(value).forEach(function(key){
        var child=value[key];
        if(child&&typeof child==='object'&&!Array.isArray(child))walk(child);
        else{
          var n=Number(child);
          if(Number.isInteger(n)&&n>=1&&n<=10)values.push(n);
        }
      });
    }(ratings||{}));
    if(!values.length)return 0;
    return Math.round(values.reduce(function(a,b){return a+b;},0)/values.length*10);
  }

  function fetchDemo(force){
    if(!force&&demoCache)return Promise.resolve(demoCache);
    if(!force&&demoPromise)return demoPromise;
    if(!nativeFetch)return Promise.reject(new Error('Demo data could not be loaded.'));
    demoPromise=nativeFetch(apiBase()+'/api/coach-experience/public-demo',{headers:{Accept:'application/json'},cache:'no-store'})
      .then(function(r){return r.json().catch(function(){return{};}).then(function(d){if(!r.ok)throw new Error(d.error||'Demo data could not be loaded.');return d.data||d;});})
      .then(function(d){demoCache=d||{};return demoCache;})
      .finally(function(){demoPromise=null;});
    return demoPromise;
  }

  function currentDemoStart(){
    try{return sessionStorage.getItem('sl_public_demo_started_at')||'';}catch(_){return'';}
  }
  function getStoredDemoState(){
    try{
      var raw=sessionStorage.getItem(DEMO_STATE_KEY);
      if(raw){
        var parsed=JSON.parse(raw);
        if(
          parsed&&
          parsed.coach&&
          Array.isArray(parsed.players)&&
          String(parsed._publicDemoStartedAt||'')===String(currentDemoStart())
        )return parsed;
      }
    }catch(_){}
    return null;
  }
  function saveDemoState(state){
    state._publicDemoStartedAt=currentDemoStart();
    demoCache=state;
    try{sessionStorage.setItem(DEMO_STATE_KEY,JSON.stringify(state));}catch(_){}
    return state;
  }
  function ensureDemoState(force){
    if(!force){
      var stored=getStoredDemoState();
      if(stored)return Promise.resolve(stored);
    }
    if(demoStatePromise)return demoStatePromise;
    demoStatePromise=fetchDemo(!!force).then(function(seed){
      var state=clone(seed);
      state.players=arr(state,['players']);
      state.fixtures=arr(state,['fixtures']);
      state.videos=arr(state,['videos']);
      state.matchFacts=arr(state,['matchFacts']);
      state.notifications=arr(state,['notifications']);
      state.threads=arr(state,['threads']);
      state.chatMessages=arr(state,['chatMessages']);
      state.teamCoaches=arr(state,['teamCoaches']);
      state.interest=arr(state,['interest']);
      state.attendance=arr(state,['attendance']);
      if(state.coach&&!state.teamCoaches.some(function(c){return String(c.id)===String(state.coach.id);})){
        state.teamCoaches.unshift(clone(state.coach));
      }
      return saveDemoState(state);
    }).finally(function(){demoStatePromise=null;});
    return demoStatePromise;
  }

  function uiPrefsFromCanonical(raw){
    raw=raw||{};
    if(raw.scout_activity||raw.messages||raw.evidence_review||raw.weekly_summary)return raw;
    return {
      scout_activity:{inApp:!((raw.scout_interest&&raw.scout_interest.in_app===false)||(raw.fixture_attendance&&raw.fixture_attendance.in_app===false))},
      messages:{inApp:!(raw.scout_message&&raw.scout_message.in_app===false)},
      evidence_review:{inApp:!(raw.video_upload&&raw.video_upload.in_app===false)},
      weekly_summary:{email:!!(raw.product_updates&&raw.product_updates.email)}
    };
  }

  function demoRead(path){
    var u=new URL(path,'https://scoutlink.local'),p=u.pathname;
    return ensureDemoState(false).then(function(o){
      var players=o.players||[],fixtures=o.fixtures||[],videos=o.videos||[],facts=o.matchFacts||[],notifications=o.notifications||[],threads=o.threads||[],messages=o.chatMessages||[];
      if(p==='/api/coach-experience/overview')return o;
      if(p==='/api/coaches/profile')return{coach:o.coach||null};
      if(p==='/api/coaches/my-players')return{players:players,data:players};
      if(p==='/api/coaches/team-coaches')return{coaches:o.teamCoaches||[],data:o.teamCoaches||[]};
      if(p==='/api/fixtures'){
        var past=u.searchParams.get('past')==='true',upcoming=u.searchParams.get('upcoming')==='true';
        var today=new Date().toISOString().slice(0,10);
        var list=fixtures.filter(function(f){var d=String(f.fixture_date||'').slice(0,10);return past?d<today:upcoming?d>=today:true;});
        return{fixtures:list,data:list,total:list.length};
      }
      if(p==='/api/videos')return{videos:videos,data:videos};
      if(p==='/api/match-facts'){
        var playerId=u.searchParams.get('playerId'),fixtureId=u.searchParams.get('fixtureId');
        var fs=facts.filter(function(x){return(!playerId||String(x.player_id)===String(playerId))&&(!fixtureId||String(x.fixture_id)===String(fixtureId));});
        return{matchFacts:fs,data:fs,total:fs.length};
      }
      if(p==='/api/notifications')return{notifications:notifications,data:notifications,unreadCount:notifications.filter(function(x){return!x.is_read;}).length};
      if(p==='/api/chat/threads')return{threads:threads,data:threads};
      if(p==='/api/coach-experience/notification-preferences')return{preferences:uiPrefsFromCanonical(o.notificationPreferences||{})};
      if(p==='/api/coach-experience/last-lineup'){
        var sorted=facts.slice().sort(function(a,b){return new Date(b.match_date||0)-new Date(a.match_date||0);});
        return{match:sorted[0]||null};
      }
      var playerDetail=p.match(/^\/api\/players\/([^/]+)$/);
      if(playerDetail){
        var detailId=decodeURIComponent(playerDetail[1]);
        var player=players.find(function(x){return String(x.id)===String(detailId);});
        if(!player)throw new Error('Demo player not found.');
        var playerFacts=facts.filter(function(x){return String(x.player_id)===String(detailId);});
        var playerVideos=videos.filter(function(x){return String(x.player_id)===String(detailId);});
        return{
          player:player,
          recentMatches:playerFacts,
          matches:playerFacts,
          matchFacts:playerFacts,
          videos:playerVideos,
          upcomingFixtures:fixtures,
          fixtures:fixtures,
          analysis:player.analysis||player.scoring_result||{}
        };
      }
      var activity=p.match(/^\/api\/coach-experience\/players\/([^/]+)\/activity$/);
      if(activity){
        var pid=decodeURIComponent(activity[1]);
        return{
          player:players.find(function(x){return String(x.id)===String(pid);})||null,
          interest:(o.interest||[]).filter(function(x){return String(x.player_id)===String(pid);}),
          threads:threads.filter(function(x){return String(x.player_id)===String(pid);}),
          videos:videos.filter(function(x){return String(x.player_id)===String(pid);}),
          scouts:o.scouts||{}
        };
      }
      var m=p.match(/^\/api\/chat\/threads\/([^/]+)\/messages$/);
      if(m){var id=decodeURIComponent(m[1]);var ms=messages.filter(function(x){return String(x.thread_id)===String(id);});return{messages:ms,data:ms};}
      return o;
    });
  }

  function demoWrite(method,path,body){
    method=String(method||'GET').toUpperCase();
    body=body||{};
    var u=new URL(path,'https://scoutlink.local'),p=u.pathname;
    return ensureDemoState(false).then(function(s){
      var result=null;
      if(method==='POST'&&p==='/api/coaches/add-coach'){
        var c={id:uid('demo-coach'),first_name:body.firstName||'Demo',last_name:body.lastName||'Coach',email:body.emailAddr||'',role_at_club:'Coach',is_super_user:!!body.isSuperUser,registration_complete:false,team_id:s.coach&&s.coach.team_id,team_name:s.coach&&s.coach.team_name,is_demo:true};
        s.teamCoaches=s.teamCoaches||[];s.teamCoaches.push(c);
        result={message:'Demo coach added for this session.',coachId:c.id,coach:c,emailSent:false,demo:true};
      }else if(method==='POST'&&/^\/api\/coaches\/assign-player\//.test(p)){
        var assignId=decodeURIComponent(p.split('/').pop()),ap=(s.players||[]).find(function(x){return String(x.id)===String(assignId);});
        if(!ap)throw new Error('Demo player not found.');
        ap.assigned_coach_id=body.coachId||s.coach.id;result={message:'Demo coach assignment updated.'};
      }else if(method==='POST'&&p==='/api/players'){
        var primary=body.primaryPosition||body.primary_position||'CM',demoRatings=body.attributeRatings||{};
        var np={id:uid('demo-player'),player_id:uid('PLY'),first_name:body.firstName||body.first_name||'Demo',last_name:body.lastName||body.last_name||'Player',age_group:body.ageGroup||body.age_group||'U16',primary_position:primary,specific_position:primary,positions:[primary],alternative_positions:[],position_group:body.positionGroup||demoPositionGroup(primary),foot:body.foot||'Right',height_category:body.heightCategory||'average',build_category:body.buildCategory||'athletic',attribute_ratings:demoRatings,assigned_coach_id:body.assignedCoachId||s.coach.id,team_id:s.coach.team_id,team_name:s.coach.team_name,availability:'Available',overall_rating:demoOverallFromRatings(demoRatings),is_active:true,is_demo:true,created_at:now()};
        s.players.unshift(np);result={player:np,message:'Demo player added for this session.'};
      }else if(method==='POST'&&p==='/api/players/bulk'){
        var created=(body.players||[]).map(function(row){var primary=row.primaryPosition||'CM',demoRatings=row.attributeRatings||{};var np={id:uid('demo-player'),player_id:uid('PLY'),first_name:row.firstName||'',last_name:row.lastName||'',age_group:row.ageGroup||'U16',primary_position:primary,specific_position:primary,positions:[primary],alternative_positions:row.alternativePositions||[],position_group:demoPositionGroup(primary),foot:row.foot||'Right',height_category:row.heightCategory||'average',build_category:row.buildCategory||'athletic',attribute_ratings:demoRatings,assigned_coach_id:row.assignedCoachId||s.coach.id,team_id:s.coach.team_id,team_name:s.coach.team_name,availability:'Available',overall_rating:demoOverallFromRatings(demoRatings),is_active:true,is_demo:true,created_at:now()};s.players.unshift(np);return np;});
        result={created:created,errors:[],message:created.length+' demo players imported.'};
      }else if(method==='PUT'&&/^\/api\/players\/[^/]+$/.test(p)){
        var pid=decodeURIComponent(p.split('/').pop()),pp=(s.players||[]).find(function(x){return String(x.id)===String(pid);});
        if(!pp)throw new Error('Demo player not found.');
        if(body.firstName!==undefined)pp.first_name=body.firstName;
        if(body.lastName!==undefined)pp.last_name=body.lastName;
        if(body.ageGroup!==undefined)pp.age_group=body.ageGroup;
        if(body.primaryPosition!==undefined){pp.primary_position=body.primaryPosition;pp.specific_position=body.primaryPosition;}
        if(body.attributeRatings!==undefined){pp.attribute_ratings=clone(body.attributeRatings);pp.overall_rating=demoOverallFromRatings(pp.attribute_ratings);}
        if(body.primaryPosition!==undefined)pp.position_group=demoPositionGroup(body.primaryPosition);
        if(body.assignedCoachId!==undefined)pp.assigned_coach_id=body.assignedCoachId;
        result={player:pp,analysis:{}};
      }else if(method==='POST'&&p==='/api/fixtures'){
        var fx={id:uid('demo-fixture'),team_id:s.coach.team_id,coach_id:s.coach.id,opponent:body.opponent||'Opponent',fixture_date:body.fixtureDate||body.fixture_date,fixture_time:body.fixtureTime||body.fixture_time||null,venue:body.venue||null,home_or_away:body.homeOrAway||body.home_or_away||'Home',format:body.format||'11',notes:body.notes||null,created_at:now()};
        s.fixtures.unshift(fx);result={fixture:fx,message:'Demo fixture added.'};
      }else if(method==='PUT'&&/^\/api\/fixtures\//.test(p)){
        var fid=decodeURIComponent(p.split('/').pop()),fxu=(s.fixtures||[]).find(function(x){return String(x.id)===String(fid);});
        if(!fxu)throw new Error('Demo fixture not found.');
        var fmap={opponent:'opponent',fixtureDate:'fixture_date',fixtureTime:'fixture_time',venue:'venue',homeOrAway:'home_or_away',format:'format',notes:'notes'};
        Object.keys(fmap).forEach(function(k){if(body[k]!==undefined)fxu[fmap[k]]=body[k]||null;});
        result={fixture:fxu,message:'Demo fixture updated.'};
      }else if(method==='DELETE'&&/^\/api\/fixtures\//.test(p)){
        var fdel=decodeURIComponent(p.split('/').pop());s.fixtures=(s.fixtures||[]).filter(function(x){return String(x.id)!==String(fdel);});s.matchFacts=(s.matchFacts||[]).filter(function(x){return String(x.fixture_id)!==String(fdel);});result={message:'Demo fixture deleted.'};
      }else if(method==='POST'&&p==='/api/match-facts'){
        var saved=[],players=Array.isArray(body.players)?body.players:[];
        players.forEach(function(row){
          var existing=(s.matchFacts||[]).find(function(x){return body.fixtureId&&String(x.fixture_id)===String(body.fixtureId)&&String(x.player_id)===String(row.playerId);});
          var fact=existing||{id:uid('demo-match-fact'),created_at:now()};
          Object.assign(fact,{player_id:row.playerId,fixture_id:body.fixtureId||null,team_id:s.coach.team_id,coach_id:s.coach.id,match_date:body.matchDate,opponent:body.opponent,format:body.format,formation:body.formation||null,home_score:body.homeScore,away_score:body.awayScore,goals:Number(row.goals)||0,assists:Number(row.assists)||0,yellow_cards:Number(row.yellowCards)||0,red_cards:Number(row.redCards)||0,minutes_played:row.minutesPlayed==null?null:Number(row.minutesPlayed),performance_score:row.performanceScore==null?null:Number(row.performanceScore),position_played:row.positionPlayed||null,events:clone(body.events||[]),player_positions:clone(body.playerPositions||{}),attribute_ratings:{},ratings:{},confirmed:true});
          if(!existing)s.matchFacts.unshift(fact);saved.push(fact);
        });
        result={message:'Demo Match Facts saved.',matchFacts:saved,errors:[]};
      }else if(method==='PUT'&&p==='/api/coach-experience/team-settings'){
        if(!s.coach.is_super_user)throw new Error('Only the Head Coach can change team settings.');
        if(body.teamName){s.coach.team_name=body.teamName;(s.teamCoaches||[]).forEach(function(c){c.team_name=body.teamName;});}
        s.coach.team_age_groups=body.teamAgeGroups||s.coach.team_age_groups||[];
        s.coach.team_league=body.teamLeague||null;s.coach.team_county=body.teamCounty||null;s.coach.team_home_venue=body.teamHomeVenue||null;s.coach.team_website=body.teamWebsite||null;s.coach.team_contact_email=body.teamContactEmail||null;
        result={coach:s.coach};
      }else if(method==='PUT'&&p==='/api/coach-experience/notification-preferences'){
        s.notificationPreferences=clone(body.preferences||{});result={preferences:s.notificationPreferences};
      }else if(method==='POST'&&p==='/api/coach-experience/players/bulk-availability'){
        (s.players||[]).forEach(function(x){if((body.playerIds||[]).some(function(id){return String(id)===String(x.id);}))x.availability=body.availability;});result={updated:(body.playerIds||[]).length,availability:body.availability};
      }else if(method==='POST'&&p==='/api/coach-experience/players/bulk-archive'){
        (s.players||[]).forEach(function(x){if((body.playerIds||[]).some(function(id){return String(id)===String(x.id);}))x.is_active=false;});s.players=(s.players||[]).filter(function(x){return x.is_active!==false;});result={archived:(body.playerIds||[]).length};
      }else if(method==='PATCH'&&/^\/api\/videos\/[^/]+\/moderation$/.test(p)){
        var parts=p.split('/'),vid=decodeURIComponent(parts[3]),v=(s.videos||[]).find(function(x){return String(x.id)===String(vid);});if(!v)throw new Error('Demo video not found.');v.moderation_status=body.status;v.moderated_at=now();result={video:v,message:body.status==='approved'?'Demo video approved.':'Demo video rejected.'};
      }else if(method==='POST'&&p==='/api/videos/upload-link'){
        result={uploadUrl:'https://scoutlink.app/video-upload?token=demo-session-'+encodeURIComponent(body.playerId||''),demo:true};
      }else if(method==='POST'&&/^\/api\/chat\/threads\/[^/]+\/messages$/.test(p)){
        var tid=decodeURIComponent(p.split('/')[4]),message={id:uid('demo-message'),thread_id:tid,sender_id:s.coach.id,sender_type:'Coach',body:String(body.body||''),is_read:true,created_at:now()};s.chatMessages.push(message);result={message:message,success:true};
      }else if(method==='PATCH'&&/^\/api\/notifications\/[^/]+\/read$/.test(p)){
        var nid=decodeURIComponent(p.split('/')[3]),note=(s.notifications||[]).find(function(x){return String(x.id)===String(nid);});if(note)note.is_read=true;result={success:true};
      }else if(method==='PATCH'&&p==='/api/notifications/mark-all-read'){
        (s.notifications||[]).forEach(function(x){x.is_read=true;});result={success:true};
      }
      if(result===null)throw new Error('This action is not available in the public demo.');
      saveDemoState(s);
      return result;
    });
  }

  function api(method,path,body){
    method=String(method||'GET').toUpperCase();
    if(isDemo())return method==='GET'?demoRead(path):demoWrite(method,path,body);
    if(typeof nativeApi!=='function')return Promise.reject(new Error('ScoutLink API client is unavailable.'));
    return nativeApi(method,path,body).then(function(response){
      var data=unwrap(response);
      if(path==='/api/coach-experience/overview'&&data&&data.coach)permissionCoach=data.coach;
      if(path==='/api/coaches/profile'&&data&&data.coach)permissionCoach=data.coach;
      if(path==='/api/coaches/team-coaches'){
        var list=arr(data,['data','coaches']);
        var me=permissionCoach;
        if(me&&!list.some(function(c){return String(c.id)===String(me.id);}))list.unshift(me);
        if(response&&Array.isArray(response.data))response.data=list;
        else if(response&&response.data&&typeof response.data==='object')response.data.data=list;
        else if(response)response.data=list;
      }
      return response;
    }).catch(function(error){
      if(/^\/api\/chat\/threads\/[^/]+\/messages$/.test(path)&&body&&body.body){
        requestAnimationFrame(function(){
          var input=visibleById(innerWidth<=760?'fieldChatInput':'deskChatInput')||visibleById('fieldChatInput')||visibleById('deskChatInput');
          if(input&&!input.value)input.value=body.body;
        });
      }
      throw error;
    });
  }

  function iconFor(label){return label==='Dashboard'?ICON.home:label==='My Players'?ICON.players:label==='Fixtures'?ICON.fixtures:label==='Match Facts'?ICON.facts:label==='Video Reels'?ICON.video:label==='Chat'?ICON.chat:label==='Notifications'?ICON.bell:label==='Settings'?ICON.settings:ICON.shield;}
  function activeLabel(){var p=page();return p==='dashboard'?'Dashboard':p==='my-players'?'My Players':p==='fixtures'?'Fixtures':p==='match-facts'?'Match Facts':p==='video-reels'?'Video Reels':p==='chat'?'Chat':p==='notifications'?'Notifications':p==='settings'?'Settings':p==='report-a-concern'?'Report a Concern':'Dashboard';}
  function badge(label){var n=label==='My Players'?counts.players:label==='Video Reels'?counts.videos:label==='Chat'?counts.chat:label==='Notifications'?counts.notifications:0;return n?'<span class="badge">'+n+'</span>':'';}
  function navHtml(){var active=activeLabel();return DESK_NAV.map(function(g){return'<div class="rail-grp">'+esc(g[0])+'</div>'+g[1].map(function(label){return'<a class="rail-item'+(label===active?' on':'')+'" href="'+esc(clean(ROUTES[label]))+'">'+iconFor(label)+'<span>'+esc(label)+'</span>'+badge(label)+'</a>';}).join('');}).join('');}
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
    syncDuplicateIds();
  }

  function refreshChrome(){var top=document.getElementById('coachDeskTop');if(top)top.innerHTML=topHtml();var scroll=document.querySelector('.rail-nav .rail-scroll');if(scroll)scroll.innerHTML=navHtml();syncDuplicateIds();}
  function closeAll(){document.querySelectorAll('[data-coach-overlay]').forEach(function(n){n.remove();});}
  function overlay(kind,opt){opt=opt||{};closeAll();var back=document.createElement('div');back.className='coach-overlay-backdrop';back.dataset.coachOverlay='1';var box=document.createElement('section');box.dataset.coachOverlay='1';var mobile=innerWidth<=760;box.className='coach-overlay '+(mobile?'sheet':kind==='modal'?'modal':'drawer');box.innerHTML=(mobile?'<div class="sheet-grip"></div>':'')+'<div class="coach-overlay-h"><h3 style="margin:0;font-size:17px">'+esc(opt.title||'Details')+'</h3><span class="sp"></span><button class="icon-btn" style="width:38px;height:38px" type="button" data-close-coach-overlay>'+ICON.close+'</button></div><div class="coach-overlay-b">'+(opt.html||'')+'</div>'+(opt.footer?'<div class="coach-overlay-f">'+opt.footer+'</div>':'');document.body.appendChild(back);document.body.appendChild(box);syncDuplicateIds();return box;}
  function showToast(msg,error){var n=document.createElement('div');n.className='toast';n.setAttribute('role',error?'alert':'status');n.textContent=msg;document.body.appendChild(n);setTimeout(function(){n.remove();},3200);}
  function openMore(){overlay('sheet',{title:'More',html:'<div class="list"><a class="list-row" href="'+esc(clean('/coach/match-facts'))+'"><span class="who"><b>Match Facts</b><span>Record post-match evidence</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/video-reels'))+'"><span class="who"><b>Video Reels</b><span>Review and manage evidence</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/notifications'))+'"><span class="who"><b>Notifications</b><span>'+counts.notifications+' unread</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/settings'))+'"><span class="who"><b>Settings</b><span>Team and account</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/coach/report-a-concern'))+'"><span class="who"><b>Report a Concern</b><span>Safeguarding</span></span><span class="chev">›</span></a></div>'});}
  function openAccount(){overlay('sheet',{title:'Account',html:'<div class="flex" style="margin-bottom:18px"><span class="avatar lg">'+esc(initials())+'</span><div><b>'+esc(fullName())+'</b><span class="mut" style="display:block;margin-top:4px">'+esc(teamName())+'</span></div></div><div class="list"><a class="list-row" href="'+esc(clean('/experience-select'))+'"><span class="who"><b>Switch workspace</b></span></a><button class="list-row" type="button" data-coach-signout style="width:100%;border:0;background:transparent;text-align:left"><span class="who"><b>Sign out</b></span></button></div>'});}
  function signOut(){if(isDemo()&&typeof window.exitPublicDemo==='function'){window.exitPublicDemo();return;}if(window.Auth&&typeof window.Auth.clear==='function')window.Auth.clear();location.href=clean('/login?logout=1');}

  function visibleRoot(){return innerWidth<=760?document.querySelector('.coach-field'):document.querySelector('.coach-desk');}
  function visibleById(id){
    var selector='#'+CSS.escape(id),root=visibleRoot();
    var visible=root&&root.querySelector(selector);
    if(visible)return visible;
    var overlay=document.querySelector('[data-coach-overlay] '+selector);
    return overlay||nativeGetById(id);
  }
  function syncDuplicateIds(){
    if(duplicateSyncing)return;
    duplicateSyncing=true;
    try{
      document.querySelectorAll('[data-coach-original-id]').forEach(function(node){node.id=node.dataset.coachOriginalId;delete node.dataset.coachOriginalId;});
      var shown=visibleRoot(),hidden=innerWidth<=760?document.querySelector('.coach-desk'):document.querySelector('.coach-field');
      if(!shown||!hidden)return;
      hidden.querySelectorAll('[id]').forEach(function(node){
        var original=node.id;
        if(shown.querySelector('#'+CSS.escape(original))){
          node.dataset.coachOriginalId=original;
          node.id='coach-hidden-'+original;
        }
      });
    }finally{duplicateSyncing=false;}
  }

  function isHeadCoach(){return !permissionCoach||permissionCoach.is_super_user!==false;}
  function applyPermissionUi(){
    if(isHeadCoach())return;
    var invite=document.getElementById('inviteCoach');if(invite)invite.style.display='none';
    document.querySelectorAll('[data-action-assign],[data-action-archive]').forEach(function(x){x.style.display='none';});
    document.querySelectorAll('#teamSettingsForm').forEach(function(form){
      form.querySelectorAll('input,select,textarea').forEach(function(x){x.disabled=true;});
      form.querySelectorAll('button[type="submit"]').forEach(function(x){x.style.display='none';});
    });
    document.querySelectorAll('[data-age-setting]').forEach(function(x){x.style.pointerEvents='none';x.setAttribute('aria-disabled','true');});
  }

  function enhanceExternalVideos(){
    document.querySelectorAll('.coach-overlay video[src]').forEach(function(video){
      if(video.dataset.coachChecked==='1')return;
      video.dataset.coachChecked='1';
      var src=String(video.getAttribute('src')||'');
      if(!/^https?:/i.test(src))return;
      var path='';
      try{path=new URL(src).pathname.toLowerCase();}catch(_){}
      if(/\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(path))return;
      var a=document.createElement('a');a.className='btn outline full';a.target='_blank';a.rel='noopener';a.href=src;a.textContent='Open video in its provider';
      video.replaceWith(a);
    });
  }

  function applyDeepLinks(){
    var params=new URLSearchParams(location.search);
    if(page()==='fixtures'&&params.get('fixtureId')&&innerWidth>760&&!deepLinkDone.fixture){
      var row=document.querySelector('[data-fixture-open="'+CSS.escape(params.get('fixtureId'))+'"]');
      if(row){deepLinkDone.fixture=true;row.click();}
    }
    if(page()==='video-reels'&&params.get('playerId')&&!deepLinkDone.video){
      var trigger=document.querySelector('[data-generate-link]');
      if(trigger){
        deepLinkDone.video=true;trigger.click();
        setTimeout(function(){var select=visibleById('linkPlayer')||document.getElementById('linkPlayer');if(select)select.value=params.get('playerId');},30);
      }
    }
  }

  function handleProfileAction(){
    if(deepLinkDone.profile)return;
    var action=new URLSearchParams(location.search).get('action');
    if(action!=='ratings'&&action!=='info')return;
    var tries=0;
    (function clickWhenReady(){
      var target=document.querySelector(action==='ratings'?'[data-edit-ratings]':'[data-edit-info]');
      if(target){deepLinkDone.profile=true;target.click();return;}
      if(tries++<20)setTimeout(clickWhenReady,100);
    }());
  }

  function delegatedClick(event){
    var target=event.target&&event.target.closest?event.target.closest('a,button,[data-wizard-exit],[data-close-coach-overlay],[data-coach-more],[data-coach-account],[data-coach-signout],[data-coach-notifications],[data-notif]'):null;
    if(!target)return;

    if(target.matches('[data-close-coach-overlay]')){event.preventDefault();event.stopPropagation();closeAll();return;}
    if(target.classList&&target.classList.contains('coach-overlay-backdrop')){event.preventDefault();closeAll();return;}
    if(target.matches('[data-coach-more]')){event.preventDefault();event.stopPropagation();openMore();return;}
    if(target.matches('[data-coach-account]')){event.preventDefault();event.stopPropagation();openAccount();return;}
    if(target.matches('[data-coach-signout]')){event.preventDefault();event.stopPropagation();signOut();return;}
    if(target.matches('[data-coach-notifications]')){event.preventDefault();event.stopPropagation();location.href=clean('/coach/notifications');return;}
    if(target.matches('[data-wizard-exit]')){event.preventDefault();event.stopPropagation();location.href=clean('/coach/dashboard');return;}

    if(target.matches('[data-notif]')&&target.tagName==='A'){
      event.preventDefault();event.stopPropagation();
      var href=target.href,id=target.dataset.notif;
      api('PATCH','/api/notifications/'+encodeURIComponent(id)+'/read',{}).catch(function(){}).finally(function(){location.href=href;});
      return;
    }

    if(target.tagName==='A'){
      var href=target.getAttribute('href')||'';
      if(/\/player\/profile\/edit-ratings/.test(href)){
        event.preventDefault();
        var u=new URL(href,location.origin),id=u.searchParams.get('id');
        location.href=clean('/player/profile?id='+encodeURIComponent(id||'')+'&action=ratings');
        return;
      }
      if(/\/player\/profile/.test(href)&&/[?&]edit=1/.test(href)){
        event.preventDefault();
        var u2=new URL(href,location.origin),id2=u2.searchParams.get('id');
        location.href=clean('/player/profile?id='+encodeURIComponent(id2||'')+'&action=info');
      }
    }
  }

  function rememberSearchFocus(event){
    var input=event.target;
    if(!input||['deskPlayerSearch','fieldPlayerSearch'].indexOf(input.id)<0)return;
    var id=input.id,start=input.selectionStart,end=input.selectionEnd;
    requestAnimationFrame(function(){
      var next=document.getElementById(id);
      if(next){next.focus();try{next.setSelectionRange(start,end);}catch(_){}}
    });
  }

  function bindSearch(){
    var box=document.querySelector('.coach-v6-search'),input=box&&box.querySelector('input'),results=box&&box.querySelector('.coach-search-results');if(!input||!results||input.dataset.bound==='1')return;input.dataset.bound='1';
    input.oninput=function(){var q=input.value.trim().toLowerCase();if(!q){results.innerHTML='';return;}searchData().then(function(o){var ps=arr(o,['players']).filter(function(p){return([p.first_name,p.last_name,p.primary_position,p.specific_position,p.age_group].filter(Boolean).join(' ').toLowerCase().indexOf(q)>=0);}).slice(0,6),fs=arr(o,['fixtures']).filter(function(f){return String(f.opponent||'').toLowerCase().indexOf(q)>=0;}).slice(0,4);results.innerHTML=ps.map(function(p){return'<a class="coach-search-result" href="'+esc(clean('/player/profile?id='+encodeURIComponent(p.id)))+'"><b>'+esc([p.first_name,p.last_name].filter(Boolean).join(' '))+'</b><span>'+esc((p.primary_position||p.specific_position||'')+' · '+(p.age_group||''))+'</span></a>';}).join('')+fs.map(function(f){return'<a class="coach-search-result" href="'+esc(clean('/coach/fixtures?fixtureId='+encodeURIComponent(f.id)))+'"><b>vs '+esc(f.opponent||'Fixture')+'</b><span>'+esc(f.fixture_date||'')+'</span></a>';}).join('');});};
  }
  function searchData(){if(searchCache)return Promise.resolve(searchCache);if(searchPromise)return searchPromise;searchPromise=api('GET','/api/coach-experience/overview').then(function(r){searchCache=r.data||r;return searchCache;}).finally(function(){searchPromise=null;});return searchPromise;}
  function refreshBadges(){return api('GET','/api/coach-experience/overview').then(function(r){var o=r.data||r;permissionCoach=o.coach||permissionCoach;counts.players=arr(o,['players']).length;counts.videos=arr(o,['videos']).filter(function(v){return String(v.moderation_status||'').toLowerCase()==='pending';}).length;counts.notifications=arr(o,['notifications']).filter(function(n){return!n.is_read;}).length;counts.chat=arr(o,['threads']).filter(function(t){return Number(t.unread_count||0)>0;}).reduce(function(a,t){return a+Number(t.unread_count||0);},0);refreshChrome();mountField();applyPermissionUi();return counts;}).catch(function(){return counts;});}
  function setTitle(t,s){titleOverride=t||'';subtitleOverride=s||'';refreshChrome();}
  function setFieldHeader(t,s,r,l){fieldTitleOverride=t==null?null:t;fieldSubtitleOverride=s==null?null:s;fieldRightOverride=r==null?null:r;fieldLeftOverride=l==null?null:l;mountField();syncDuplicateIds();}
  function setRouteActions(){}
  function refresh(){mountDesk();mountField();syncDuplicateIds();refreshBadges();}

  function activeRole(){
    try{return String((window.Auth&&window.Auth.type)||localStorage.getItem('sl_type')||'').toLowerCase();}catch(_){return'';}
  }
  function coachDemoApiPath(path){
    var p='';
    try{p=new URL(path,'https://scoutlink.local').pathname;}catch(_){p=String(path||'');}
    return (
      p==='/api/coach-experience/overview' ||
      p==='/api/coaches/profile' ||
      p==='/api/coaches/my-players' ||
      p==='/api/coaches/team-coaches' ||
      p==='/api/fixtures' ||
      p==='/api/match-facts' ||
      p==='/api/notifications' ||
      p==='/api/chat/threads' ||
      p==='/api/coach-experience/notification-preferences' ||
      p==='/api/coach-experience/last-lineup' ||
      /^\/api\/players\/[^/]+$/.test(p) ||
      /^\/api\/coach-experience\/players\/[^/]+\/activity$/.test(p) ||
      /^\/api\/chat\/threads\/[^/]+\/messages$/.test(p)
    );
  }

  /*
   * Player Profile still calls the shared main.js API client directly. In a
   * Coach public-demo session route those Coach/profile reads through the same
   * Coach demo state as the V6 pages, so a player added or edited in the demo
   * remains the same player when their profile opens.
   */
  if(nativeApi){
    window.api=function(method,path,body){
      if(
        isDemo() &&
        activeRole()==='coach' &&
        coachDemoApiPath(path)
      ){
        method=String(method||'GET').toUpperCase();
        return method==='GET'
          ? demoRead(path)
          : demoWrite(method,path,body);
      }
      return nativeApi(method,path,body);
    };
  }

  if(nativeFetch){
    window.fetch=function(input,init){
      var url=typeof input==='string'?input:(input&&input.url)||'';
      if(isDemo()&&/\/api\/trust\/safeguarding-concerns(?:\?|$)/.test(url)){
        var ref='DEMO-CONCERN-'+String(Date.now()).slice(-6);
        return Promise.resolve(new Response(JSON.stringify({concernId:ref,submissionId:ref,demo:true}),{status:201,headers:{'Content-Type':'application/json'}}));
      }
      return nativeFetch(input,init);
    };
  }

  /*
   * Coach Desk and Coach Field deliberately render the same page at once.
   * Page-specific scripts historically used global getElementById(), which
   * can otherwise resolve the hidden Desk control while a Coach is using
   * Field. From this point onward Coach scripts resolve IDs from the visible
   * experience first, then overlays, then the native document lookup.
   */
  document.getElementById=function(id){return visibleById(String(id));};

  document.addEventListener('click',delegatedClick,true);
  document.addEventListener('input',rememberSearchFocus,true);
  document.addEventListener('coach:rendered',function(){setTimeout(function(){syncDuplicateIds();applyPermissionUi();enhanceExternalVideos();applyDeepLinks();},0);});
  document.addEventListener('scoutlink:profile-ready',function(e){if(e.detail&&e.detail.role==='Coach')setTimeout(handleProfileAction,0);});

  var observer=new MutationObserver(function(){if(duplicateSyncing)return;requestAnimationFrame(function(){syncDuplicateIds();applyPermissionUi();enhanceExternalVideos();applyDeepLinks();});});
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});

  window.CoachV2={
    esc:esc,clean:clean,api:api,fullName:fullName,firstName:firstName,initials:initials,teamName:teamName,ageGroup:ageGroup,
    setTitle:setTitle,setFieldHeader:setFieldHeader,setRouteActions:setRouteActions,
    openDrawer:function(o){return overlay('drawer',o);},openModal:function(o){return overlay('modal',o);},openSheet:function(o){return overlay('sheet',o);},
    closeAll:closeAll,showToast:showToast,refresh:refresh,refreshBadges:refreshBadges,isPublicDemo:isDemo,fetchDemo:fetchDemo,
    visibleById:visibleById,syncDuplicateIds:syncDuplicateIds,isHeadCoach:isHeadCoach
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  window.addEventListener('resize',function(){mountField();syncDuplicateIds();applyDeepLinks();});
}());

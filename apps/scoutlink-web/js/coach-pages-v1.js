'use strict';

(function () {
  var page=document.body&&document.body.getAttribute('data-coach-page');
  if(['dashboard','my-players','fixtures','video-reels','chat','notifications','settings','report-a-concern'].indexOf(page)<0)return;

  var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage');
  var S={overview:null,coaches:[],playerFilter:'all',playerSearch:'',activeFixtureId:'',activeThreadId:'',threads:[],messages:[],settingsView:'team',prefs:null,concernRef:''};

  var I={
    plus:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="15.5" rx="2.5"/><path d="M3.2 9.3h17.6M8 3v4M16 3v4"/></svg>',
    dots:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.5 15.5 12 9 18.5"/></svg>',
    players:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.6.5 4.5 2.3 4.5 5.4"/></svg>',
    facts:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="4" width="13" height="17" rx="2.3"/><path d="M9 4V3.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4"/></svg>',
    video:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M8 4.5v15M16 4.5v15M3 9.8h5M16 9.8h5M3 15h5M16 15h5"/></svg>',
    chat:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5l-5 3.8V6.5a1 1 0 0 1 1-1Z"/></svg>',
    bell:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 9a5.8 5.8 0 1 1 11.6 0c0 4 1.9 4.8 1.9 5.7H4.3c0-.9 1.9-1.7 1.9-5.7Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>',
    shield:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19.5 6v6.2c0 4.6-3.2 7.4-7.5 8.6-4.3-1.2-7.5-4-7.5-8.6V6L12 3.2Z"/></svg>'
  };

  function esc(v){return window.CoachV2?window.CoachV2.esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function api(m,p,b){return window.CoachV2.api(m,p,b);}
  function clean(p){return window.CoachV2.clean(p);}
  function arr(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
  function n(v,d){v=Number(v);return Number.isFinite(v)?v:(d==null?0:d);}
  function text(o,keys,d){for(var i=0;i<keys.length;i++)if(o&&o[keys[i]]!=null&&o[keys[i]]!=='')return o[keys[i]];return d;}
  function name(p){return[p&&p.first_name,p&&p.last_name].filter(Boolean).join(' ')||text(p,['name','player_name'],'Player');}
  function initials(v){return window.CoachV2.initials(typeof v==='string'?v:name(v));}
  function team(){return text(S.overview&&S.overview.coach,['team_name'],window.CoachV2.teamName());}
  function pos(p){return text(p,['primary_position','specific_position','position'],'—');}
  function fmtDate(v,withYear){if(!v)return'—';var d=new Date(String(v).slice(0,10)+'T12:00:00');if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:withYear?'numeric':undefined});}
  function fmtTime(v){return v?String(v).slice(0,5):'';}
  function ago(v){var t=new Date(v||0).getTime();if(!t)return'';var m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<60)return m+' min ago';var h=Math.round(m/60);if(h<24)return h+' hour'+(h===1?'':'s')+' ago';var d=Math.round(h/24);return d===1?'Yesterday':d+' days ago';}
  function status(v){return String(v||'').toLowerCase();}
  function facts(){return arr(S.overview||{},['matchFacts']);}
  function players(){return arr(S.overview||{},['players']);}
  function fixtures(){return arr(S.overview||{},['fixtures']);}
  function videos(){return arr(S.overview||{},['videos']);}
  function interests(){return arr(S.overview||{},['interest']);}
  function notifications(){return arr(S.overview||{},['notifications']);}
  function attendance(fid){return arr(S.overview||{},['attendance']).filter(function(x){return String(x.fixture_id)===String(fid)&&status(x.status)!=='cancelled';});}
  function factsForFixture(fid){return facts().filter(function(x){return String(x.fixture_id)===String(fid);});}
  function playerById(id){return players().find(function(p){return String(p.id)===String(id);})||{};}
  function scoutById(id){return(S.overview&&S.overview.scouts&&S.overview.scouts[id])||{};}
  function scoutName(id){var s=scoutById(id);return[s.first_name,s.last_name].filter(Boolean).join(' ')||'Verified scout';}
  function scoutOrg(id){var s=scoutById(id);return s.club_name||s.organisation||s.organization||'';}
  function completion(p){
    var flat={};(function walk(o){if(!o||typeof o!=='object')return;Object.keys(o).forEach(function(k){var v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))walk(v);else if(v!==null&&v!==undefined&&v!=='')flat[k]=v;});})(p.attribute_ratings||{});
    var expected=/^GK$/i.test(pos(p))?12:24;return Math.min(100,Math.round(Object.keys(flat).length/Math.max(1,expected)*100));
  }
  function overall(p){var v=n(p.overall_rating,0);return Math.max(0,Math.min(100,Math.round(v)));}
  function ratingTone(pct){return pct>=90?'var(--pitch)':pct>=65?'var(--amber)':'var(--red)';}
  function unreadNotes(){return notifications().filter(function(x){return !x.is_read;}).length;}
  function pendingVideos(){return videos().filter(function(v){return status(v.moderation_status)==='pending';});}
  function upcoming(){var now=new Date();now.setHours(0,0,0,0);return fixtures().filter(function(f){return new Date(String(f.fixture_date).slice(0,10)+'T12:00:00')>=now;}).sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date);});}
  function cardStat(label,value,detail){return'<div class="stat"><div class="k">'+esc(label)+'</div><div class="v">'+value+'</div><div class="d">'+detail+'</div></div>';}
  function pill(label,tone){return'<span class="pill '+(tone||'n')+'">'+esc(label)+'</span>';}
  function msg(t,e){return'<div class="coach-route-message'+(e?' error':'')+'">'+esc(t)+'</div>';}

  async function loadOverview(force){
    if(S.overview&&!force)return S.overview;
    var r=await api('GET','/api/coach-experience/overview');S.overview=r.data||r;
    S.threads=arr(S.overview,['threads']);
    try{var cr=await api('GET','/api/coaches/team-coaches');S.coaches=arr(cr,['data','coaches']);}catch(_){S.coaches=[];}
    if(!S.coaches.length&&S.overview.coach)S.coaches=[S.overview.coach];
    return S.overview;
  }
  function rendered(){document.dispatchEvent(new CustomEvent('coach:rendered'));if(window.CoachV2)window.CoachV2.refreshBadges();}

  function readiness(){
    var ps=players(),full=ps.filter(function(p){return completion(p)>=100;}).length,partial=Math.max(0,ps.length-full);
    var pc=ps.length?Math.round(full/ps.length*100):0;
    return'<div class="bar-track"><i style="width:'+pc+'%;background:var(--pitch)"></i><i style="width:'+(100-pc)+'%;background:var(--amber)"></i></div><div class="legend"><span><i style="background:var(--pitch)"></i>Fully assessed</span><span><i style="background:var(--amber)"></i>Partially assessed</span></div>';
  }
  function topPlayer(){
    var p=players().slice().sort(function(a,b){return overall(b)-overall(a);})[0]||{};
    var score=overall(p),r=46,c=2*Math.PI*r,dash=(score/100*c).toFixed(1);
    return'<div class="flex" style="gap:18px;align-items:center"><div class="ring-wrap" style="width:110px;height:110px"><svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="'+r+'" fill="none" stroke="var(--mist)" stroke-width="9"/><circle cx="55" cy="55" r="'+r+'" fill="none" stroke="var(--pitch)" stroke-width="9" stroke-linecap="round" transform="rotate(-90 55 55)" stroke-dasharray="'+dash+' '+c.toFixed(1)+'"/></svg><div class="num"><b style="font-size:29px">'+score+'</b><small>/100</small></div></div><div><b style="font-size:14px">'+esc(name(p))+'</b><span class="mut" style="display:block;margin-top:4px">'+esc(pos(p)+' · '+(p.age_group||''))+'</span></div></div>';
  }
  function quick(label,sub,go,href,icon){
    return'<a class="qlink" href="'+esc(clean(href))+'"><span class="ic">'+icon+'</span><b>'+esc(label)+'</b><small>'+esc(sub)+'</small><span class="go">'+esc(go)+' →</span></a>';
  }
  function fixtureRowDashboard(f){
    return'<div class="list-row" style="cursor:default"><span class="who"><b>'+esc(team()+' vs '+(f.opponent||'Opponent'))+'</b><span>'+esc(fmtDate(f.fixture_date,true)+(fmtTime(f.fixture_time)?', '+fmtTime(f.fixture_time):'')+(f.venue?' · '+f.venue:''))+'</span></span>'+pill(attendance(f.id).length+' scouts',attendance(f.id).length?'g':'n')+'</div>';
  }
  function activityRows(limit){
    var out=[];
    interests().forEach(function(x){var p=playerById(x.player_id);out.push({t:new Date(x.updated_at||x.created_at||0).getTime(),title:scoutName(x.scout_id)+' ('+(scoutOrg(x.scout_id)||'Scout')+') '+(String(x.stage||'').toLowerCase()==='shortlist'?'shortlisted ':'started reviewing ')+name(p)+'.',sub:'Scout activity · '+ago(x.updated_at||x.created_at)});});
    pendingVideos().forEach(function(v){out.push({t:new Date(v.created_at||0).getTime(),title:'A parent uploaded '+String(v.category||v.title||'a video').toLowerCase()+' for '+name(playerById(v.player_id))+' — needs moderation.',sub:'Evidence · '+ago(v.created_at)});});
    S.threads.forEach(function(t){if(t.last_message_at)out.push({t:new Date(t.last_message_at).getTime(),title:'New message from '+scoutName(t.scout_id)+' about '+name(playerById(t.player_id))+'.',sub:'Messages · '+ago(t.last_message_at)});});
    return out.sort(function(a,b){return b.t-a.t;}).slice(0,limit||5);
  }
  function dashboardDesk(){
    var ps=players(),interestPlayers=ps.filter(function(p){return interests().some(function(i){return String(i.player_id)===String(p.id);});}),up=upcoming(),pending=pendingVideos(),full=ps.filter(function(p){return completion(p)>=100;}).length;
    return'<div class="bento">'+cardStat('Squad size',ps.length,'<span>'+full+' assessed at 100%</span>')+cardStat('Scout interest',interestPlayers.length,'players with active interest')+cardStat('Upcoming fixtures',up.length,up[0]?'next: '+esc(up[0].opponent)+', '+esc(fmtDate(up[0].fixture_date,true)):'No upcoming fixtures')+cardStat('Evidence to review',pending.length,'parent uploads awaiting moderation')+'</div>'+
      '<div class="quicklinks" style="margin-top:16px">'+
      quick('My Players',ps.length+' in squad','Manage','/coach/my-players',I.players)+
      quick('Add Player','New assessment','Add','/coach/add-player',I.plus)+
      quick('Fixtures',up.length+' upcoming','View','/coach/fixtures',I.cal)+
      quick('Match Facts','Record evidence','Open','/coach/match-facts',I.facts)+
      quick('Video Reels',pending.length+' to review','Review','/coach/video-reels',I.video)+
      quick('Chat',S.threads.filter(function(t){return n(t.unread_count,0)>0;}).length+' unread','Open','/coach/chat',I.chat)+
      quick('Notifications',unreadNotes()+' unread','Open','/coach/notifications',I.bell)+
      quick('Report a Concern','Safeguarding','Open','/coach/report-a-concern',I.shield)+'</div>'+
      '<div class="two" style="margin-top:18px"><div class="card"><div class="card-h"><h3>Squad readiness</h3><span class="sp"></span><span class="hint">Attribute assessment completeness across the squad</span></div><div class="card-b">'+readiness()+'</div></div><div class="card"><div class="card-h"><h3>Top player</h3><span class="sp"></span></div><div class="card-b">'+topPlayer()+'</div></div></div>'+
      '<div class="two" style="margin-top:18px"><div class="card"><div class="card-h"><h3>Upcoming fixtures</h3><span class="sp"></span></div><div class="card-b">'+(up.length?up.slice(0,2).map(fixtureRowDashboard).join(''):'<div class="empty"><b>No upcoming fixtures</b></div>')+'</div></div><div class="card"><div class="card-h"><h3>Recent activity</h3><span class="sp"></span></div><div class="card-b">'+(activityRows(5).map(function(a){return'<div class="list-row" style="cursor:default"><span class="who"><b>'+esc(a.title)+'</b><span>'+esc(a.sub)+'</span></span></div>';}).join('')||'<div class="empty"><b>No recent activity</b></div>')+'</div></div></div>'+
      (ps.length-full?'<div style="margin-top:18px"><div class="callout a"><span>'+(ps.length-full)+' player(s) have an incomplete attribute assessment: '+esc(ps.filter(function(p){return completion(p)<100;}).slice(0,4).map(name).join(', '))+'.</span></div></div>':'');
  }
  function dashboardField(){
    var ps=players(),interestPlayers=ps.filter(function(p){return interests().some(function(i){return String(i.player_id)===String(p.id);});}),up=upcoming(),pending=pendingVideos();
    return'<div class="bento">'+cardStat('Scout interest',interestPlayers.length,'players with active interest')+cardStat('Evidence to review',pending.length,'parent uploads awaiting moderation')+'</div>'+
      '<div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Squad readiness</h3><span class="sp"></span></div><div class="card-b">'+readiness()+'</div></div></div>'+
      '<div class="quicklinks" style="margin-top:14px">'+quick('Add Player','New assessment','Add','/coach/add-player',I.plus)+quick('Match Facts','Record evidence','Open','/coach/match-facts',I.facts)+quick('Video Reels',pending.length+' to review','Review','/coach/video-reels',I.video)+quick('Report a Concern','Safeguarding','Open','/coach/report-a-concern',I.shield)+'</div>'+
      '<div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Upcoming fixtures</h3><span class="sp"></span></div><div class="card-b">'+(up.length?up.slice(0,2).map(fixtureRowDashboard).join(''):'<div class="empty"><b>No upcoming fixtures</b></div>')+'</div></div></div>'+
      '<div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Recent activity</h3><span class="sp"></span></div><div class="card-b">'+(activityRows(3).map(function(a){return'<div class="list-row" style="cursor:default"><span class="who"><b>'+esc(a.title)+'</b><span>'+esc(a.sub)+'</span></span></div>';}).join('')||'<div class="empty"><b>No recent activity</b></div>')+'</div></div></div>';
  }
  function renderDashboard(){window.CoachV2.setTitle('Dashboard','Good morning, '+window.CoachV2.firstName());window.CoachV2.setFieldHeader('Dashboard');desk.innerHTML=dashboardDesk();field.innerHTML=dashboardField();rendered();}

  function filteredPlayers(){
    var q=S.playerSearch.toLowerCase(),list=players().filter(function(p){if(q&&([name(p),pos(p),p.age_group].join(' ').toLowerCase().indexOf(q)<0))return false;if(S.playerFilter==='incomplete'&&completion(p)>=100)return false;if(S.playerFilter==='injured'&&status(p.availability)!=='injured')return false;return true;});
    return list;
  }
  function playerRow(p){
    var c=completion(p),r=overall(p);
    return'<div class="list-row" data-player-row="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(pos(p)+' · '+(p.age_group||''))+'</span></span><div style="text-align:right"><div class="rate-chip" style="justify-content:flex-end">'+r+'<small>/100</small></div><div class="bar-track" style="width:64px;margin-top:6px"><i style="width:'+c+'%;background:'+ratingTone(c)+'"></i></div></div><button class="icon-btn" style="width:38px;height:38px" type="button" title="Edit / actions" data-player-actions="'+esc(p.id)+'">'+I.dots+'</button><span class="chev">'+I.chev+'</span></div>';
  }
  function playersBase(mobile){
    var all=players(),incomplete=all.filter(function(p){return completion(p)<100;}).length,injured=all.filter(function(p){return status(p.availability)==='injured';}).length,list=filteredPlayers();
    return(!mobile?'<div class="flex" style="justify-content:space-between;margin-bottom:16px"><h2 style="margin:0;font-size:17px">My Players · '+all.length+' active</h2><div class="flex"><a class="btn outline" href="'+esc(clean('/coach/bulk-add-players'))+'">Bulk add players</a><a class="btn volt" href="'+esc(clean('/coach/add-player'))+'">'+I.plus+' Add player</a></div></div>':'')+
      '<label class="in" style="display:flex;align-items:center;gap:10px;color:var(--ink4);margin-bottom:14px"><span style="font-size:15px">⌕</span><input id="'+(mobile?'fieldPlayerSearch':'deskPlayerSearch')+'" value="'+esc(S.playerSearch)+'" placeholder="Search squad by name or position..." style="width:100%;border:0;outline:0;background:transparent;font:inherit"></label>'+
      '<div class="seg" style="margin-bottom:16px"><a class="'+(S.playerFilter==='all'?'on':'')+'" href="#" data-player-filter="all">All '+all.length+'</a><a class="'+(S.playerFilter==='incomplete'?'on':'')+'" href="#" data-player-filter="incomplete">Incomplete '+incomplete+'</a><a class="'+(S.playerFilter==='injured'?'on':'')+'" href="#" data-player-filter="injured">Injured '+injured+'</a></div>'+
      '<div class="card"><div class="card-b">'+(list.length?list.map(playerRow).join(''):'<div class="empty"><b>No players match</b><p>Try another search or filter.</p></div>')+'</div></div>'+
      (mobile?'<div class="actbar"><a class="btn volt full" href="'+esc(clean('/coach/add-player'))+'">'+I.plus+' Add player</a></div>':'');
  }
  function playerActions(id){
    var p=playerById(id),coaches=S.coaches;
    window.CoachV2.openSheet({title:name(p),html:'<div class="v6-actions-sheet"><div class="flex" style="margin-bottom:18px"><span class="avatar lg">'+esc(initials(p))+'</span><div><b style="font-size:15px">'+esc(name(p))+'</b><span class="mut" style="display:block;margin-top:4px">'+esc(pos(p)+' · '+(p.age_group||''))+'</span></div></div><div class="list"><a class="list-row" href="'+esc(clean('/player/profile?id='+id+'&edit=1'))+'"><span class="who"><b>Edit info</b><span>Identity, physical context and team details</span></span><span class="chev">›</span></a><a class="list-row" href="'+esc(clean('/player/profile/edit-ratings?id='+id))+'"><span class="who"><b>Edit ratings</b><span>Attribute assessment</span></span><span class="chev">›</span></a><button class="list-row" type="button" data-action-assign="'+esc(id)+'"><span class="who"><b>Assign coach</b><span>Change the coach responsible for this player</span></span><span class="chev">›</span></button><button class="list-row" type="button" data-action-availability="'+esc(id)+'"><span class="who"><b>Set availability</b><span>'+esc(p.availability||'Available')+'</span></span><span class="chev">›</span></button><button class="list-row" type="button" data-action-archive="'+esc(id)+'"><span class="who"><b>Archive player</b><span>Remove from the active season</span></span><span class="chev">›</span></button></div></div>'});bindPlayerActions();
  }
  function bindPlayerActions(){
    document.querySelectorAll('[data-action-assign]').forEach(function(b){b.onclick=function(){var id=b.dataset.actionAssign;window.CoachV2.openSheet({title:'Assign coach',html:'<div class="field"><label>Assigned coach</label><select class="in" id="assignCoach">'+S.coaches.map(function(c){return'<option value="'+esc(c.id)+'">'+esc([c.first_name,c.last_name].filter(Boolean).join(' ')||'Coach')+'</option>';}).join('')+'</select></div>',footer:'<button class="btn volt" id="saveAssign">Save</button>'});setTimeout(function(){document.getElementById('saveAssign').onclick=function(){api('POST','/api/coaches/assign-player/'+encodeURIComponent(id),{coachId:document.getElementById('assignCoach').value}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Coach assigned.');return loadOverview(true);}).then(renderPlayers).catch(function(e){alert(e.message);});};},0);};});
    document.querySelectorAll('[data-action-availability]').forEach(function(b){b.onclick=function(){var id=b.dataset.actionAvailability;window.CoachV2.openSheet({title:'Set availability',html:'<div class="field"><label>Availability</label><select class="in" id="availability"><option>Available</option><option>Injured</option><option>Unavailable</option></select></div>',footer:'<button class="btn volt" id="saveAvailability">Save</button>'});setTimeout(function(){document.getElementById('saveAvailability').onclick=function(){api('POST','/api/coach-experience/players/bulk-availability',{playerIds:[id],availability:document.getElementById('availability').value}).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderPlayers).catch(function(e){alert(e.message);});};},0);};});
    document.querySelectorAll('[data-action-archive]').forEach(function(b){b.onclick=function(){var id=b.dataset.actionArchive;if(!confirm('Archive this player from the active season?'))return;api('POST','/api/coach-experience/players/bulk-archive',{playerIds:[id],reason:'Season archive'}).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderPlayers).catch(function(e){alert(e.message);});};});
  }
  function bindPlayers(){
    ['deskPlayerSearch','fieldPlayerSearch'].forEach(function(id){var x=document.getElementById(id);if(x)x.oninput=function(){S.playerSearch=x.value;renderPlayers();};});
    document.querySelectorAll('[data-player-filter]').forEach(function(a){a.onclick=function(e){e.preventDefault();S.playerFilter=a.dataset.playerFilter;renderPlayers();};});
    document.querySelectorAll('[data-player-row]').forEach(function(r){r.onclick=function(e){if(e.target.closest('[data-player-actions]'))return;location.href=clean('/player/profile?id='+encodeURIComponent(r.dataset.playerRow));};});
    document.querySelectorAll('[data-player-actions]').forEach(function(b){b.onclick=function(e){e.stopPropagation();playerActions(b.dataset.playerActions);};});
  }
  function renderPlayers(){window.CoachV2.setTitle('My Players',team());window.CoachV2.setFieldHeader('My Players');desk.innerHTML=playersBase(false);field.innerHTML=playersBase(true);bindPlayers();rendered();}

  function fixtureResult(f){
    var m=factsForFixture(f.id)[0];if(!m||m.home_score==null||m.away_score==null)return null;
    var hs=n(m.home_score),as=n(m.away_score),home=String(f.home_or_away||'Home').toLowerCase()!=='away',ours=home?hs:as,theirs=home?as:hs,letter=ours>theirs?'W':ours<theirs?'L':'D';return{label:letter+' '+ours+'-'+theirs,tone:letter==='W'?'g':letter==='L'?'r':'a'};
  }
  function fixtureTitle(f){return String(f.home_or_away||'Home').toLowerCase()==='away'?(f.opponent+' vs '+team()):(team()+' vs '+f.opponent);}
  function fixtureListRow(f,mobile){
    var res=fixtureResult(f),future=new Date(String(f.fixture_date).slice(0,10)+'T12:00:00')>=new Date(new Date().setHours(0,0,0,0)),a=attendance(f.id).length,d=new Date(String(f.fixture_date).slice(0,10)+'T12:00:00');
    if(mobile)return'<div class="list-row" data-fixture-open="'+esc(f.id)+'"><div class="dateplate '+(res&&res.tone==='g'?'g':'')+'"><b>'+d.getDate()+'</b><span>'+esc(d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase())+'</span></div><span class="who"><b>'+esc(f.opponent||'Opponent')+'</b><span>'+esc((f.venue||'Venue TBC')+(fmtTime(f.fixture_time)?' · '+fmtTime(f.fixture_time):''))+'</span></span>'+pill(res?res.label:'Upcoming',res?res.tone:'n')+'</div>';
    return'<div class="list-row" data-fixture-open="'+esc(f.id)+'"><span class="icon-btn" style="width:42px;height:42px">'+I.cal+'</span><span class="who"><b>'+esc(fixtureTitle(f))+'</b><span>'+esc(fmtDate(f.fixture_date,true)+(fmtTime(f.fixture_time)?', '+fmtTime(f.fixture_time):'')+(f.venue?' · '+f.venue:''))+'</span></span><div class="flex">'+pill(res?res.label:'Upcoming',res?res.tone:'n')+(a?pill(a+' scouts','g'):'')+'</div></div>';
  }
  function fixturesBase(mobile){
    var fs=fixtures().slice().sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date);});
    return(!mobile?'<div class="flex" style="justify-content:space-between;margin-bottom:16px"><h2 style="margin:0;font-size:17px">Fixtures · '+fs.length+' total</h2><button class="btn volt" type="button" data-add-fixture>'+I.plus+' Add fixture</button></div>':'')+'<div class="card"><div class="card-b">'+(fs.length?fs.map(function(f){return fixtureListRow(f,mobile);}).join(''):'<div class="empty"><b>No fixtures yet</b></div>')+'</div></div>'+(mobile?'<div class="actbar"><button class="btn volt full" type="button" data-add-fixture>'+I.plus+' Add fixture</button></div>':'');
  }
  function fixtureForm(f){
    f=f||{};window.CoachV2.openSheet({title:f.id?'Edit fixture':'Add fixture',html:'<form id="fixtureForm"><div class="field"><label>Opponent</label><input class="in" name="opponent" value="'+esc(f.opponent||'')+'" required></div><div class="two"><div class="field"><label>Date</label><input class="in" type="date" name="fixtureDate" value="'+esc(f.fixture_date||'')+'" required></div><div class="field"><label>Time</label><input class="in" type="time" name="fixtureTime" value="'+esc(fmtTime(f.fixture_time))+'"></div></div><div class="two"><div class="field"><label>Home / away</label><select class="in" name="homeOrAway"><option'+((f.home_or_away||'Home')==='Home'?' selected':'')+'>Home</option><option'+(f.home_or_away==='Away'?' selected':'')+'>Away</option><option'+(f.home_or_away==='Neutral'?' selected':'')+'>Neutral</option></select></div><div class="field"><label>Format</label><select class="in" name="format">'+['5','7','9','11'].map(function(x){return'<option'+(String(f.format||'11').indexOf(x)===0?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div><div class="field"><label>Venue</label><input class="in" name="venue" value="'+esc(f.venue||'')+'"></div><div class="field"><label>Notes <em>Optional</em></label><textarea class="in" name="notes">'+esc(f.notes||'')+'</textarea></div><div id="fixtureMsg"></div></form>',footer:(f.id?'<button class="btn danger" id="deleteFixture">Delete</button>':'')+'<button class="btn volt" id="saveFixture">'+(f.id?'Save fixture':'Add fixture')+'</button>'});
    setTimeout(function(){var save=document.getElementById('saveFixture');if(save)save.onclick=function(){var form=document.getElementById('fixtureForm'),fd=new FormData(form),body={};fd.forEach(function(v,k){body[k]=v});api(f.id?'PUT':'POST',f.id?'/api/fixtures/'+encodeURIComponent(f.id):'/api/fixtures',body).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderFixtures).catch(function(e){document.getElementById('fixtureMsg').innerHTML=msg(e.message,true);});};var del=document.getElementById('deleteFixture');if(del)del.onclick=function(){if(confirm('Delete this fixture?'))api('DELETE','/api/fixtures/'+encodeURIComponent(f.id)).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderFixtures);};},0);
  }
  function fixtureDetail(f){
    var att=attendance(f.id),mf=factsForFixture(f.id),vid=videos().filter(function(v){return String(v.fixture_id)===String(f.id);}),res=fixtureResult(f);
    var attendanceHtml=att.length?att.map(function(a){return'<div class="list-row" style="cursor:default"><span class="who"><b>'+esc(scoutName(a.scout_id))+'</b><span>'+esc(scoutOrg(a.scout_id))+'</span></span>'+pill(a.status||'Confirmed','g')+'</div>';}).join(''):'<div class="empty"><b>No scout attendance</b></div>';
    var evidence='<div class="list-row" style="cursor:default"><span class="who"><b>Match Facts</b><span>'+esc(mf.length?'Recorded for this fixture':'Not recorded yet')+'</span></span>'+pill(mf.length?'Complete':'Missing',mf.length?'g':'a')+'</div><div class="list-row" style="cursor:default"><span class="who"><b>Video clips</b><span>'+vid.length+' clips uploaded</span></span>'+pill(vid.length+' clips','n')+'</div>';
    var linked=att.slice(0,2).map(function(a){return'<div class="linked-chip"><b>'+esc(scoutName(a.scout_id))+'</b><span>'+esc(scoutOrg(a.scout_id))+'</span><span class="go">Message →</span></div>';}).join('');
    var html='<div class="flex" style="justify-content:space-between;align-items:flex-start;margin-bottom:18px"><div><h2 style="margin:0;font-size:19px">'+esc(fixtureTitle(f))+'</h2><p class="mut" style="margin:6px 0 0">'+esc(fmtDate(f.fixture_date,true)+(fmtTime(f.fixture_time)?', '+fmtTime(f.fixture_time):'')+(f.venue?' · '+f.venue:''))+' · '+(res?pill(res.label,res.tone):pill('Upcoming','n'))+'</p></div><a class="btn volt" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id))+'">'+I.facts+' '+(mf.length?'View Match Facts':'Record Match Facts')+'</a></div><div class="two"><div class="card"><div class="card-h"><h3>Scout attendance ('+att.length+')</h3><span class="sp"></span></div><div class="card-b">'+attendanceHtml+'</div></div><div class="card"><div class="card-h"><h3>Evidence logged</h3><span class="sp"></span></div><div class="card-b">'+evidence+'</div></div></div>'+(linked?'<div style="margin-top:16px"><div class="linked"><b>Linked records</b><div class="linked-row">'+linked+'</div></div></div>':'');
    return html;
  }
  function openFixture(id){
    var f=fixtures().find(function(x){return String(x.id)===String(id);});if(!f)return;
    if(innerWidth<=760){S.activeFixtureId=id;renderFixtures();return;}
    window.CoachV2.openDrawer({title:'Fixture detail',html:fixtureDetail(f),footer:'<button class="btn outline" id="editFixture">Edit fixture</button><a class="btn volt" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id))+'">Record Match Facts</a>'});setTimeout(function(){var e=document.getElementById('editFixture');if(e)e.onclick=function(){window.CoachV2.closeAll();fixtureForm(f);};},0);
  }
  function bindFixtures(){document.querySelectorAll('[data-add-fixture]').forEach(function(b){b.onclick=function(){fixtureForm();};});document.querySelectorAll('[data-fixture-open]').forEach(function(r){r.onclick=function(){openFixture(r.dataset.fixtureOpen);};});var back=document.getElementById('fieldFixtureBack');if(back)back.onclick=function(){S.activeFixtureId='';renderFixtures();};var edit=document.getElementById('fieldEditFixture');if(edit)edit.onclick=function(){var f=fixtures().find(function(x){return String(x.id)===String(S.activeFixtureId);});fixtureForm(f);};}
  function renderFixtures(){
    window.CoachV2.setTitle('Fixtures',team());
    if(S.activeFixtureId&&innerWidth<=760){var f=fixtures().find(function(x){return String(x.id)===String(S.activeFixtureId);});window.CoachV2.setFieldHeader(f?f.opponent:'Fixture','',null,'<button class="icon-btn" id="fieldFixtureBack" style="width:38px;height:38px">←</button>');field.innerHTML=f?fixtureDetail(f)+'<div class="actbar"><button class="btn outline" id="fieldEditFixture" style="flex:1">Edit</button><a class="btn volt" style="flex:1" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id))+'">Match Facts</a></div>':'';}else{window.CoachV2.setFieldHeader('Fixtures');field.innerHTML=fixturesBase(true);}
    desk.innerHTML=fixturesBase(false);bindFixtures();rendered();
  }

  function videoRow(v,moderation){
    var p=playerById(v.player_id);return'<div class="list-row" data-video-review="'+esc(v.id)+'"><span class="icon-btn" style="width:42px;height:42px">'+I.video+'</span><span class="who"><b>'+esc(v.title||'Player video')+'</b><span>'+esc(name(p)+' · '+(v.category||v.video_type||'Video')+(v.duration?' · '+v.duration:''))+'</span></span>'+pill(moderation?'Needs review':'Approved',moderation?'a':'g')+(moderation?'<button class="btn outline sm" type="button">Review</button>':'<button class="btn outline sm" type="button">Review</button>')+'</div>';
  }
  function videosBase(mobile){
    var pending=pendingVideos(),approved=videos().filter(function(v){return status(v.moderation_status)==='approved';});
    return(!mobile?'<div class="flex" style="justify-content:space-between;margin-bottom:16px"><h2 style="margin:0;font-size:17px">Video Reels</h2><button class="btn volt" type="button" data-generate-link>Generate upload link</button></div>':'')+
      '<div class="card"><div class="card-h"><h3>Needs moderation ('+pending.length+')</h3><span class="sp"></span></div><div class="card-b">'+(pending.length?pending.map(function(v){return videoRow(v,true);}).join(''):'<div class="empty"><b>Nothing waiting for review</b></div>')+'</div></div>'+
      '<div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Approved evidence ('+approved.length+')</h3><span class="sp"></span></div><div class="card-b">'+(approved.length?approved.map(function(v){return videoRow(v,false);}).join(''):'<div class="empty"><b>No approved clips yet</b></div>')+'</div></div></div>'+
      (mobile?'<div class="actbar"><button class="btn volt full" type="button" data-generate-link>Generate upload link</button></div>':'');
  }
  function videoUrl(v){return String(v.video_url||v.url||v.signed_url||'');}
  function reviewVideo(id){
    var v=videos().find(function(x){return String(x.id)===String(id);});if(!v)return;var p=playerById(v.player_id),url=videoUrl(v);
    var media=url?'<video controls style="width:100%;border-radius:var(--r-md);background:#000" src="'+esc(url)+'"></video>':'<div class="empty"><b>Preview unavailable</b></div>';
    window.CoachV2.openSheet({title:v.title||'Review video',html:media+'<div class="flex" style="margin-top:16px"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc((v.category||v.video_type||'Video')+' · uploaded '+ago(v.created_at))+'</span></span></div>'+(status(v.moderation_status)==='pending'?'<div class="callout a" style="margin-top:16px">Approving makes this clip available as player evidence. Rejecting keeps it out of the Scout-facing profile.</div>':''),footer:status(v.moderation_status)==='pending'?'<button class="btn danger" data-moderate="'+esc(v.id)+'" data-decision="rejected">Reject</button><button class="btn volt" data-moderate="'+esc(v.id)+'" data-decision="approved">Approve</button>':'<button class="btn outline" data-close-coach-overlay>Close</button>'});setTimeout(bindVideos,0);
  }
  function generateLink(){
    var ps=players();window.CoachV2.openSheet({title:'Generate upload link',html:'<div class="callout">Choose the player. The safeguarded link lets a parent or guardian upload evidence into the Coach moderation queue.</div><div class="field" style="margin-top:16px"><label>Player</label><select class="in" id="linkPlayer">'+ps.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><div id="uploadLinkResult"></div>',footer:'<button class="btn volt" id="makeUploadLink">Generate link</button>'});setTimeout(function(){document.getElementById('makeUploadLink').onclick=function(){api('POST','/api/videos/upload-link',{playerId:document.getElementById('linkPlayer').value}).then(function(r){var d=r.data||r,url=d.uploadUrl||d.url||'';document.getElementById('uploadLinkResult').innerHTML='<div class="field"><label>Secure link</label><input class="in" value="'+esc(url)+'" readonly></div><button class="btn outline sm" id="copyUploadLink">Copy link</button>';document.getElementById('copyUploadLink').onclick=function(){navigator.clipboard.writeText(url);window.CoachV2.showToast('Link copied.');};}).catch(function(e){document.getElementById('uploadLinkResult').innerHTML=msg(e.message,true);});};},0);
  }
  function bindVideos(){document.querySelectorAll('[data-generate-link]').forEach(function(b){b.onclick=generateLink;});document.querySelectorAll('[data-video-review]').forEach(function(r){r.onclick=function(){reviewVideo(r.dataset.videoReview);};});document.querySelectorAll('[data-moderate]').forEach(function(b){b.onclick=function(){api('PATCH','/api/videos/'+encodeURIComponent(b.dataset.moderate)+'/moderation',{status:b.dataset.decision}).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderVideos).catch(function(e){alert(e.message);});};});}
  function renderVideos(){window.CoachV2.setTitle('Video Reels',team());window.CoachV2.setFieldHeader('Video Reels');desk.innerHTML=videosBase(false);field.innerHTML=videosBase(true);bindVideos();rendered();}

  function threadId(t){return t.id||t.thread_id;}
  function activeThread(){return S.threads.find(function(t){return String(threadId(t))===String(S.activeThreadId);})||null;}
  function threadScout(t){return scoutName(t.scout_id);}
  function threadPlayer(t){return name(playerById(t.player_id));}
  function threadRow(t){
    var unread=n(t.unread_count,0);return'<div class="thread-row '+(String(threadId(t))===String(S.activeThreadId)?'on':'')+'" data-thread="'+esc(threadId(t))+'"><span class="avatar">'+esc(initials(threadScout(t)))+'</span><span class="tx"><b>'+esc(threadScout(t))+'</b><span class="org">'+esc(scoutOrg(t.scout_id))+'</span><span class="pv">'+esc(t.last_message_preview||t.preview||('Regarding '+threadPlayer(t)))+'</span></span><span class="tm">'+esc(t.last_message_at?ago(t.last_message_at):'')+(unread?'<span class="pill r" style="margin-top:6px">'+unread+' new</span>':'')+'</span></div>';
  }
  function messagesHtml(){
    var u=(window.Auth&&window.Auth.user)||{};return S.messages.map(function(m){var mine=String(m.sender_id||'')===String(u.id||'')||String(m.sender_type||'').toLowerCase()==='coach';return'<div class="msg-bubble '+(mine?'out':'in')+'">'+esc(m.body||m.message||'')+'<div class="mt">'+esc(m.created_at?ago(m.created_at):'')+'</div></div>';}).join('');
  }
  function chatDesk(){
    var t=activeThread();return'<div class="flex" style="align-items:flex-start;gap:16px"><div class="card" style="width:330px;flex:0 0 330px"><div class="card-h"><h3>Conversations</h3><span class="sp"></span></div><div class="card-b">'+S.threads.map(threadRow).join('')+'</div></div><div class="card" style="flex:1;min-width:0;min-height:620px">'+(t?'<div class="card-h"><span class="avatar">'+esc(initials(threadScout(t)))+'</span><div><h3>'+esc(threadScout(t))+'</h3><span class="mut" style="font-size:11.5px">'+esc(scoutOrg(t.scout_id)+' · re: '+threadPlayer(t))+'</span></div><span class="sp"></span><a class="btn outline sm" href="'+esc(clean('/player/profile?id='+encodeURIComponent(t.player_id)))+'">View player</a><a class="btn danger sm" href="'+esc(clean('/coach/report-a-concern'))+'">Report concern</a></div><div class="card-b" id="deskMessages" style="display:flex;flex-direction:column;gap:10px;min-height:430px">'+messagesHtml()+'</div><form id="deskChatForm" style="padding:18px 26px;border-top:1px solid var(--line);display:flex;gap:10px"><textarea class="in" id="deskChatInput" placeholder="Write a reply" style="min-height:48px"></textarea><button class="btn volt" type="submit">Send</button></form>':'<div class="empty" style="min-height:620px"><b>Select a conversation</b><p>Pick a thread on the left to open it.</p></div>')+'</div></div>';
  }
  function chatField(){
    var t=activeThread();if(!t)return'<div class="card"><div class="card-b">'+S.threads.map(threadRow).join('')+'</div></div>';
    return'<div class="flex" style="margin-bottom:14px"><span class="avatar">'+esc(initials(threadScout(t)))+'</span><div><b>'+esc(threadScout(t))+'</b><span class="mut" style="display:block;margin-top:3px">'+esc(scoutOrg(t.scout_id)+' · re: '+threadPlayer(t))+'</span></div></div><div class="card"><div class="card-b" id="fieldMessages" style="display:flex;flex-direction:column;gap:10px;min-height:430px">'+messagesHtml()+'</div></div><form id="fieldChatForm" style="display:flex;gap:8px;margin-top:12px"><textarea class="in" id="fieldChatInput" placeholder="Write a reply" style="min-height:48px"></textarea><button class="btn volt" type="submit">Send</button></form><a class="btn ghost full" href="'+esc(clean('/coach/report-a-concern'))+'" style="margin-top:10px">Report a concern about this conversation</a>';
  }
  async function loadThread(id){S.activeThreadId=id;var r=await api('GET','/api/chat/threads/'+encodeURIComponent(id)+'/messages');S.messages=arr(r,['messages','data']);renderChat();}
  async function sendMessage(v){v=String(v||'').trim();if(!v||!S.activeThreadId)return;await api('POST','/api/chat/threads/'+encodeURIComponent(S.activeThreadId)+'/messages',{body:v});await loadThread(S.activeThreadId);}
  function bindChat(){document.querySelectorAll('[data-thread]').forEach(function(r){r.onclick=function(){loadThread(r.dataset.thread);};});[['deskChatForm','deskChatInput'],['fieldChatForm','fieldChatInput']].forEach(function(x){var f=document.getElementById(x[0]);if(f)f.onsubmit=function(e){e.preventDefault();var i=document.getElementById(x[1]),v=i.value;i.value='';sendMessage(v);};});}
  function renderChat(){window.CoachV2.setTitle('Chat',team());window.CoachV2.setFieldHeader(activeThread()?threadScout(activeThread()):'Chat','',null,activeThread()?'<button class="icon-btn" id="fieldBackThreads" style="width:38px;height:38px">←</button>':null);desk.innerHTML=chatDesk();field.innerHTML=chatField();bindChat();var b=document.getElementById('fieldBackThreads');if(b)b.onclick=function(){S.activeThreadId='';S.messages=[];renderChat();};rendered();}
  async function initChat(){await loadOverview();var r=await api('GET','/api/chat/threads');S.threads=arr(r,['threads','data']);var q=new URLSearchParams(location.search).get('threadId');if(q)await loadThread(q);else renderChat();}

  function groupNotification(x){var t=String((x.notification_type||x.type||'')+' '+(x.title||'')+' '+(x.body||'')).toLowerCase();if(/scout|interest|shortlist|compare|attendance/.test(t))return'Scout activity';if(/message|chat/.test(t))return'Messages';if(/video|evidence|upload/.test(t))return'Evidence';return'System';}
  function notifHref(x){var d=x.data||{};if(d.playerId||d.player_id)return'/player/profile?id='+encodeURIComponent(d.playerId||d.player_id);if(/message|chat/i.test(String(x.notification_type||'')))return'/coach/chat';if(/video|evidence/i.test(String(x.notification_type||'')))return'/coach/video-reels';return'/coach/notifications';}
  function notificationsBase(){
    var ns=notifications();return'<div class="flex" style="justify-content:space-between;margin-bottom:16px"><h2 style="margin:0;font-size:17px">Notifications</h2><button class="btn outline" type="button" data-mark-all>Mark all as read</button></div>'+['Scout activity','Messages','Evidence','System'].map(function(g){var list=ns.filter(function(x){return groupNotification(x)===g;});if(!list.length)return'';return'<div style="margin-top:16px"><div class="lbl" style="margin-bottom:8px">'+g+'</div><div class="card"><div class="card-b">'+list.map(function(x){return'<a class="list-row" data-notif="'+esc(x.id)+'" href="'+esc(clean(notifHref(x)))+'"><span class="who"><b>'+esc(x.title||g)+'</b><span>'+esc(x.body||'')+'</span></span><span class="mut">'+esc(ago(x.created_at))+'</span>'+(!x.is_read?pill('New','g'):'')+'</a>';}).join('')+'</div></div></div>';}).join('');
  }
  function bindNotifications(){document.querySelectorAll('[data-notif]').forEach(function(a){a.onclick=function(){api('PATCH','/api/notifications/'+encodeURIComponent(a.dataset.notif)+'/read',{}).catch(function(){});};});document.querySelectorAll('[data-mark-all]').forEach(function(b){b.onclick=function(){api('PATCH','/api/notifications/mark-all-read',{}).then(function(){return loadOverview(true);}).then(renderNotifications);};});}
  function renderNotifications(){window.CoachV2.setTitle('Notifications',team());window.CoachV2.setFieldHeader('Notifications');var html=notificationsBase();desk.innerHTML=html;field.innerHTML=html;bindNotifications();rendered();}

  function prefsDefault(){return{scout_activity:{inApp:true},messages:{inApp:true},evidence_review:{inApp:true},weekly_summary:{email:false}};}
  function prefState(key){var p=S.prefs||prefsDefault(),v=p[key];if(v==null)return key!=='weekly_summary';if(typeof v==='boolean')return v;return v.inApp!==false&&v.email!==false;}
  function settingToggle(key,label,copy){return'<div class="list-row" style="cursor:default"><span class="who"><b>'+esc(label)+'</b><span>'+esc(copy)+'</span></span><button class="btn '+(prefState(key)?'pitch':'outline')+' sm" type="button" data-pref="'+esc(key)+'">'+(prefState(key)?'On':'Off')+'</button></div>';}
  function teamSettings(){
    var c=S.overview.coach||{};return'<div><div class="card"><div class="card-h"><h3>Team settings</h3><span class="sp"></span></div><div class="card-b"><form id="teamSettingsForm"><div class="field"><label>Team name <em>Optional</em></label><input class="in" name="teamName" value="'+esc(c.team_name||'')+'"></div><div class="field"><label>Primary age group <em>Optional</em></label><div class="seg">'+['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'].map(function(a){return'<a href="#" class="'+((c.team_age_groups||[]).indexOf(a)>=0?'on':'')+'" data-age-setting="'+a+'">'+a+'</a>';}).join('')+'</div><input type="hidden" name="teamAgeGroups" id="teamAgeGroups" value="'+esc((c.team_age_groups||[]).join(','))+'"></div><div class="two"><div class="field"><label>County <em>Optional</em></label><input class="in" name="teamCounty" value="'+esc(c.team_county||'')+'"></div><div class="field"><label>League <em>Optional</em></label><input class="in" name="teamLeague" value="'+esc(c.team_league||'')+'"></div></div><button class="btn volt" type="submit">Save team settings</button></form></div></div><div class="card" style="margin-top:16px"><div class="card-h"><h3>Coaches on this team</h3><span class="sp"></span><button class="btn outline sm" id="inviteCoach">Invite coach</button></div><div class="card-b">'+S.coaches.map(function(c2){return'<div class="list-row" style="cursor:default"><span class="avatar">'+esc(initials([c2.first_name,c2.last_name].filter(Boolean).join(' ')))+'</span><span class="who"><b>'+esc([c2.first_name,c2.last_name].filter(Boolean).join(' ')+(String(c2.id)===String(c.id)?' (you)':''))+'</b><span>'+esc(c2.role_at_club||'Coach')+'</span></span>'+pill(c2.is_super_user?'Head Coach':'Assistant Coach',c2.is_super_user?'g':'n')+'</div>';}).join('')+'</div></div><div class="card" style="margin-top:16px"><div class="card-h"><h3>Password</h3><span class="sp"></span></div><div class="card-b"><div class="two"><div class="field"><label>Current password <em>Optional</em></label><input class="in" type="password" id="currentPassword"></div><div class="field"><label>New password <em>Optional</em></label><input class="in" type="password" id="newPassword"></div></div><button class="btn outline" id="changePassword" type="button">Update password</button></div></div></div>';
  }
  function preferenceSettings(){return'<div><div class="card"><div class="card-h"><h3>Notification preferences</h3><span class="sp"></span></div><div class="card-b">'+settingToggle('scout_activity','Scout activity','Shortlists, comparisons and interest on your players')+settingToggle('messages','Messages','New chat messages from scouts')+settingToggle('evidence_review','Evidence needs review','Parent video uploads awaiting moderation')+settingToggle('weekly_summary','Weekly summary','A digest of squad activity every Monday')+'</div></div><div class="flex" style="justify-content:flex-end;margin-top:16px"><button class="btn volt" id="savePrefs" type="button">Save preferences</button></div></div>';
  }
  function settingsNav(){return'<div class="seg" style="margin-bottom:16px"><a href="#" class="'+(S.settingsView==='team'?'on':'')+'" data-settings-view="team">Team & password</a><a href="#" class="'+(S.settingsView==='notifications'?'on':'')+'" data-settings-view="notifications">Notifications</a></div>';}
  function inviteCoach(){window.CoachV2.openSheet({title:'Invite coach',html:'<form id="inviteCoachForm"><div class="two"><div class="field"><label>First name</label><input class="in" name="firstName" required></div><div class="field"><label>Last name</label><input class="in" name="lastName" required></div></div><div class="field"><label>Email</label><input class="in" type="email" name="emailAddr" required></div><div class="field"><label>Permission</label><select class="in" name="coachRole"><option value="assistant">Assistant Coach</option><option value="head">Head Coach</option></select></div></form>',footer:'<button class="btn volt" id="sendCoachInvite">Invite coach</button>'});setTimeout(function(){document.getElementById('sendCoachInvite').onclick=function(){var f=document.getElementById('inviteCoachForm'),fd=new FormData(f);api('POST','/api/coaches/add-coach',{firstName:fd.get('firstName'),lastName:fd.get('lastName'),emailAddr:fd.get('emailAddr'),isSuperUser:fd.get('coachRole')==='head'}).then(function(){window.CoachV2.closeAll();return loadOverview(true);}).then(renderSettings).catch(function(e){alert(e.message);});};},0);}
  function bindSettings(){
    document.querySelectorAll('[data-settings-view]').forEach(function(a){a.onclick=function(e){e.preventDefault();S.settingsView=a.dataset.settingsView;renderSettings();};});
    document.querySelectorAll('[data-age-setting]').forEach(function(a){a.onclick=function(e){e.preventDefault();var hidden=document.getElementById('teamAgeGroups'),xs=hidden.value?hidden.value.split(',').filter(Boolean):[],v=a.dataset.ageSetting,ix=xs.indexOf(v);if(ix>=0)xs.splice(ix,1);else xs.push(v);hidden.value=xs.join(',');a.classList.toggle('on');};});
    var f=document.getElementById('teamSettingsForm');if(f)f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f),body={};fd.forEach(function(v,k){body[k]=v;});body.teamAgeGroups=String(body.teamAgeGroups||'').split(',').filter(Boolean);api('PUT','/api/coach-experience/team-settings',body).then(function(){window.CoachV2.showToast('Team settings saved.');return loadOverview(true);}).then(renderSettings).catch(function(e2){alert(e2.message);});};
    var inv=document.getElementById('inviteCoach');if(inv)inv.onclick=inviteCoach;
    var cp=document.getElementById('changePassword');if(cp)cp.onclick=function(){var p=document.getElementById('newPassword').value;if(p.length<8)return alert('Password must be at least 8 characters.');api('POST','/api/auth/change-password',{password:p}).then(function(){window.CoachV2.showToast('Password updated.');document.getElementById('newPassword').value='';}).catch(function(e){alert(e.message);});};
    document.querySelectorAll('[data-pref]').forEach(function(b){b.onclick=function(){var key=b.dataset.pref,now=prefState(key);if(!S.prefs)S.prefs=prefsDefault();if(!S.prefs[key]||typeof S.prefs[key]!=='object')S.prefs[key]={};S.prefs[key].inApp=!now;renderSettings();};});
    var sp=document.getElementById('savePrefs');if(sp)sp.onclick=function(){api('PUT','/api/coach-experience/notification-preferences',{preferences:S.prefs}).then(function(r){S.prefs=(r.data||r).preferences||S.prefs;window.CoachV2.showToast('Preferences saved.');});};
  }
  function renderSettings(){window.CoachV2.setTitle('Settings',team());window.CoachV2.setFieldHeader('Settings');var html=settingsNav()+(S.settingsView==='notifications'?preferenceSettings():teamSettings());desk.innerHTML=html;field.innerHTML=(innerWidth<=760&&S.settingsView==='team'?'<div class="card"><div class="card-b flex" style="gap:14px"><span class="avatar">'+esc(window.CoachV2.initials())+'</span><div><b>'+esc(window.CoachV2.fullName())+'</b><span class="mut" style="display:block">Head Coach</span></div></div></div><div style="margin-top:14px">'+html+'</div>':html);bindSettings();rendered();}
  async function initSettings(){await loadOverview();try{var r=await api('GET','/api/coach-experience/notification-preferences');S.prefs=(r.data||r).preferences||prefsDefault();}catch(_){S.prefs=prefsDefault();}renderSettings();}

  function concernForm(){
    var ps=players();return'<div class="callout a">This goes straight to Stratex\'s Trust & Concerns team, not to anyone at your club. Use it for anything safeguarding-related, even if you\'re not certain it\'s serious.</div><form id="concernForm" style="margin-top:18px"><div class="field"><label>This concerns</label><select class="in" name="concernType" required><option>A player</option><option>A parent or guardian</option><option>A scout</option><option>Another coach</option><option>Something else</option></select></div><div class="field"><label>Player or person involved (if applicable) <em>Optional</em></label><select class="in" name="personOrAccount"><option value="">Not applicable</option>'+ps.map(function(p){return'<option>'+esc(name(p))+'</option>';}).join('')+'</select></div><div class="field"><label>What happened <em>Be as specific as you can. There\'s no minimum length.</em></label><textarea class="in" name="description" required></textarea></div><div class="field"><label>How urgent is this</label><select class="in" name="urgency"><option>Needs attention today</option><option>This week</option><option>No immediate risk</option></select></div><div id="concernMsg"></div><div class="flex" style="margin-top:20px;justify-content:flex-end"><a class="btn outline" href="'+esc(clean('/coach/dashboard'))+'">Cancel</a><button class="btn danger" type="submit">Submit report</button></div></form>';
  }
  function submitConcern(f){var fd=new FormData(f),body={sourcePage:'/coach/report-a-concern',contactName:window.CoachV2.fullName(),contactEmail:text(S.overview&&S.overview.coach,['email'],'')};fd.forEach(function(v,k){body[k]=v;});fetch((window.API||'')+'/api/trust/safeguarding-concerns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Could not submit report');return d;});}).then(function(d){S.concernRef=d.concernId||d.submissionId||'Submitted';renderConcern();}).catch(function(e){document.getElementById('concernMsg').innerHTML=msg(e.message,true);});}
  function renderConcern(){window.CoachV2.setTitle('Report a Concern',team());window.CoachV2.setFieldHeader('Report a Concern');var html=S.concernRef?'<div class="card"><div class="card-b" style="text-align:center;padding:42px"><h2>Concern submitted</h2><p class="mut">Your report has been sent privately to the Stratex Trust & Concerns team.</p><div class="lbl">Reference</div><div style="font-family:var(--display);font-size:30px;margin-top:8px">'+esc(S.concernRef)+'</div><a class="btn volt" href="'+esc(clean('/coach/dashboard'))+'" style="margin-top:18px">Back to dashboard</a></div></div>':concernForm();desk.innerHTML=html;field.innerHTML=html;var f=document.getElementById('concernForm');if(f)f.onsubmit=function(e){e.preventDefault();submitConcern(f);};rendered();}

  async function boot(){
    try{
      if(page==='chat'){await initChat();return;}
      if(page==='settings'){await initSettings();return;}
      await loadOverview();
      if(page==='dashboard')renderDashboard();
      else if(page==='my-players')renderPlayers();
      else if(page==='fixtures'){var q=new URLSearchParams(location.search).get('fixtureId');if(q)S.activeFixtureId=q;renderFixtures();}
      else if(page==='video-reels')renderVideos();
      else if(page==='notifications')renderNotifications();
      else if(page==='report-a-concern')renderConcern();
    }catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=msg(e.message,true);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());

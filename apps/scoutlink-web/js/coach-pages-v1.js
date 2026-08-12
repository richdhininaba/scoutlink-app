'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — exact everyday route renderer.
 *
 * The supplied Coach Desk and Coach Field HTML are the visual source of truth.
 * All cards, rails, tables, grouped notifications, video moderation, chat,
 * fixtures and settings below are hydrated from live ScoutLink APIs.
 */
(function(){
  var page=document.body&&document.body.getAttribute('data-coach-page');
  if(!page)return;
  var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage');
  var S={overview:null,coaches:[],filters:{search:'',ages:{},group:'',coach:'',evidence:'',interest:'',sort:'overall',rating:'60-85',availability:{Available:true,Injured:false,Unavailable:false}},playerPage:1,selectedPlayers:[],fixtureTab:'upcoming',activeFixtureId:'',activeThread:'',threads:[],messages:[],settingsPane:'team',prefs:null,concernRef:'',chatFilter:'all'};

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function api(m,p,b){return window.CoachV2&&window.CoachV2.api?window.CoachV2.api(m,p,b):window.api(m,p,b);}
  function clean(p){return window.CoachV2?window.CoachV2.clean(p):p;}
  function rows(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
  function val(o,keys,d){for(var i=0;i<keys.length;i++)if(o&&o[keys[i]]!=null&&o[keys[i]]!=='')return o[keys[i]];return d;}
  function n(v,d){v=Number(v);return Number.isFinite(v)?v:(d==null?0:d);}
  function bool(v){return v===true||v===1||/^(true|1|yes)$/i.test(String(v||''));}
  function name(p){return[p&&p.first_name,p&&p.last_name].filter(Boolean).join(' ')||val(p,['name','player_name'],'Player');}
  function initials(x){return window.CoachV2?window.CoachV2.initials(typeof x==='string'?x:name(x)):'PL';}
  function team(){return window.CoachV2?window.CoachV2.teamName():'Your team';}
  function ageGroup(){return window.CoachV2?window.CoachV2.ageGroup():'';}
  function position(p){return val(p,['primary_position','specific_position','position'],'—');}
  function posGroup(p){var x=String(position(p)).toUpperCase();if(/GK/.test(x))return'GK';if(/RB|LB|CB|RWB|LWB/.test(x))return'DEF';if(/DM|CM|AM|RM|LM/.test(x))return'MID';return'ATT';}
  function fmtDate(v,tm){if(!v)return'—';var d=new Date(String(v).length<=10?v+'T12:00:00':v);if(Number.isNaN(d.getTime()))return String(v);var s=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});if(tm)s+=' · '+String(tm).slice(0,5);return s;}
  function fmtMoney(v){v=Number(v);if(!Number.isFinite(v)||v<=0)return'—';if(v>=1000000)return'£'+(v/1000000).toFixed(v>=10000000?0:1)+'m';if(v>=1000)return'£'+Math.round(v/1000)+'k';return'£'+Math.round(v);}
  function safeStatus(v){return String(v||'pending').toLowerCase();}
  function msg(t,e){return'<div class="coach-route-message'+(e?' error':'')+'">'+esc(t)+'</div>';}
  function fieldHeader(title,sub,right,left){if(window.CoachV2&&window.CoachV2.setFieldHeader)window.CoachV2.setFieldHeader(title,sub||'',right||'',left||'');return'';}
  function metric(label,value,detail){return'<div class="kpi"><div class="k">'+esc(label)+'</div><div class="v">'+value+'</div>'+(detail?'<div class="d">'+detail+'</div>':'')+'</div>';}
  function completion(p){
    var attrs=p.attribute_ratings||{},flat={};(function f(o){if(!o||typeof o!=='object')return;Object.keys(o).forEach(function(k){var v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))f(v);else if(v!==null&&v!==undefined&&v!=='')flat[k]=v;});})(attrs);
    var attrCount=Object.keys(flat).length;
    var total=/^GK$/i.test(position(p))?12:(posGroup(p)==='DEF'?24:posGroup(p)==='MID'?23:24);
    var pc=total?Math.round(Math.min(1,attrCount/total)*70):0;
    pc+=(p.height_category||p.height_range_cm)?5:0;pc+=(p.build_category||p.weight_range_kg)?5:0;
    var facts=matchFactsForPlayer(p.id);if(facts.length)pc+=10;
    var vids=videosForPlayer(p.id).filter(function(v){return safeStatus(v.moderation_status)==='approved';});if(vids.length)pc+=10;
    return Math.min(100,pc);
  }
  function matchFactsForPlayer(pid){var o=S.overview||{};return rows(o,['matchFacts']).filter(function(m){return String(m.player_id||'')===String(pid);});}
  function videosForPlayer(pid){return rows(S.overview||{},['videos']).filter(function(v){return String(v.player_id||'')===String(pid);});}
  function interestsForPlayer(pid){return rows(S.overview||{},['interest']).filter(function(x){return String(x.player_id||'')===String(pid);});}
  function scoutsMap(){return(S.overview&&S.overview.scouts)||{};}
  function attendanceFor(fixtureId){return rows(S.overview||{},['attendance']).filter(function(a){return String(a.fixture_id)===String(fixtureId)&&safeStatus(a.status)!=='cancelled';});}
  function factsForFixture(fid){return rows(S.overview||{},['matchFacts']).filter(function(m){return String(m.fixture_id||'')===String(fid);});}
  function coachName(id){var c=S.coaches.find(function(x){return String(x.id)===String(id);});return c?[c.first_name,c.last_name].filter(Boolean).join(' '):((S.overview&&S.overview.coach&&String(S.overview.coach.id)===String(id))?[S.overview.coach.first_name,S.overview.coach.last_name].filter(Boolean).join(' '):'Coach');}
  function scoutLabel(id){var s=scoutsMap()[id];return s?(s.club_name||[s.first_name,s.last_name].filter(Boolean).join(' ')||'Reviewed scout'):'Reviewed scout';}
  function daysAgo(v){var d=new Date(v||0),ms=Date.now()-d.getTime();if(!Number.isFinite(ms))return'';var days=Math.floor(ms/86400000);return days<=0?'today':days===1?'1 day ago':days+' days ago';}
  function setActions(leftLabel,leftHref,rightLabel,rightHref){
    if(!window.CoachV2||!window.CoachV2.setRouteActions)return;
    window.CoachV2.setRouteActions({secondary:leftLabel?{label:leftLabel,href:leftHref}:null,primary:rightLabel?{label:rightLabel,href:rightHref}:null});
  }
  async function loadOverview(force){
    if(S.overview&&!force)return S.overview;
    var r=await api('GET','/api/coach-experience/overview');S.overview=r.data||r;
    var c=S.overview.coach||{};
    S.coaches=[c];
    if(c.is_super_user){
      try{var cr=await api('GET','/api/coaches/team-coaches');S.coaches=S.coaches.concat(rows(cr,['data','coaches']));}catch(_){}
    }
    S.coaches=S.coaches.filter(function(x,i,a){return x&&x.id&&a.findIndex(function(y){return y&&String(y.id)===String(x.id);})===i;});
    return S.overview;
  }

  /* ---------- SVG charts copied from the source design grammar ---------- */
  function lineChart(values){
    values=values&&values.length?values:[0];var min=5,max=10,pts=values.map(function(v,i){var x=22+(values.length===1?0:i/(values.length-1)*650),y=148-(Math.max(min,Math.min(max,n(v,min)))-min)/(max-min)*110;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    return'<svg viewBox="0 0 700 180" width="100%" height="180" style="display:block"><rect x="22" y="38" width="650" height="44" fill="var(--green-t)"></rect><rect x="22" y="82" width="650" height="66" fill="var(--blue-t)"></rect>'+[5,6,7,8,9,10].map(function(v){var y=148-(v-min)/(max-min)*110;return'<line x1="22" x2="672" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="2" y="'+(y+3)+'" font-size="9" fill="var(--ink3)">'+v+'</text>';}).join('')+'<polyline points="'+pts+'" fill="none" stroke="var(--blue)" stroke-width="2"/>'+values.map(function(v,i){var x=22+(values.length===1?0:i/(values.length-1)*650),y=148-(Math.max(min,Math.min(max,n(v,min)))-min)/(max-min)*110;return'<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="#fff" stroke="var(--blue)" stroke-width="2"/>';}).join('')+'</svg>';
  }
  function bars(values){
    values=values&&values.length?values:[0,0,0,0,0,0,0,0];var mx=Math.max.apply(null,values.concat([1]));
    return'<svg viewBox="0 0 700 180" width="100%" height="180" style="display:block">'+values.map(function(v,i){var w=44,gap=34,x=30+i*(w+gap),h=Math.max(0,v/mx*118),y=148-h;return'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="var(--blue)"/><text x="'+(x+w/2)+'" y="'+(y-5)+'" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink2)">'+v+'</text><text x="'+(x+w/2)+'" y="164" text-anchor="middle" font-size="9" fill="var(--ink4)">w'+(i+1)+'</text>';}).join('')+'</svg>';
  }
  function spark(values){values=values&&values.length?values:[0,0,0,0,0];var mx=Math.max.apply(null,values.concat([1])),mn=Math.min.apply(null,values.concat([0])),r=Math.max(1,mx-mn),pts=values.map(function(v,i){return(i/(values.length-1)*90+5)+','+(28-(v-mn)/r*20);}).join(' ');return'<svg viewBox="0 0 100 34" width="90" height="32"><polyline points="'+pts+'" fill="none" stroke="var(--blue)" stroke-width="2"/></svg>';}
  function phoneLineChart(values){
    values=values&&values.length?values:[0];var min=5,max=10,w=330,h=150,left=24,right=12,top=16,bottom=24,plotW=w-left-right,plotH=h-top-bottom;
    var pts=values.map(function(v,i){var x=left+(values.length===1?0:i/(values.length-1)*plotW),y=top+(max-Math.max(min,Math.min(max,n(v,min))))/(max-min)*plotH;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    var y7=top+(max-7)/(max-min)*plotH,y9=top+(max-9)/(max-min)*plotH;
    return'<svg viewBox="0 0 330 150" width="100%" height="150" style="display:block"><rect x="'+left+'" y="'+y9+'" width="'+plotW+'" height="'+(y7-y9)+'" fill="var(--green-t)"/><rect x="'+left+'" y="'+y7+'" width="'+plotW+'" height="'+(top+plotH-y7)+'" fill="var(--blue-t)"/>'+[5,7,9].map(function(v){var y=top+(max-v)/(max-min)*plotH;return'<line x1="'+left+'" x2="'+(left+plotW)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="3" y="'+(y+3)+'" font-size="8" fill="var(--ink3)">'+v+'</text>';}).join('')+'<polyline points="'+pts+'" fill="none" stroke="var(--blue)" stroke-width="2"/>'+values.map(function(v,i){var x=left+(values.length===1?0:i/(values.length-1)*plotW),y=top+(max-Math.max(min,Math.min(max,n(v,min))))/(max-min)*plotH;return'<circle cx="'+x+'" cy="'+y+'" r="3" fill="#fff" stroke="var(--blue)" stroke-width="2"/>';}).join('')+'</svg>';
  }
  function phoneBars(values){
    values=values&&values.length?values:[0,0,0,0,0,0,0,0];var mx=Math.max.apply(null,values.concat([1])),w=330,h=150,left=18,right=10,top=18,bottom=26,plotW=w-left-right,gap=8,bw=(plotW-gap*(values.length-1))/values.length;
    return'<svg viewBox="0 0 330 150" width="100%" height="150" style="display:block">'+values.map(function(v,i){var bh=Math.max(0,v/mx*(h-top-bottom)),x=left+i*(bw+gap),y=h-bottom-bh;return'<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" fill="var(--blue)"/><text x="'+(x+bw/2)+'" y="'+(y-4)+'" text-anchor="middle" font-size="8" font-weight="700" fill="var(--ink2)">'+v+'</text><text x="'+(x+bw/2)+'" y="139" text-anchor="middle" font-size="8" fill="var(--ink4)">w'+(i+1)+'</text>';}).join('')+'</svg>';
  }

  /* ================= Dashboard ================= */
  function weeklyInterest(){
    var rowsI=rows(S.overview||{},['interest']),out=[],now=Date.now();
    for(var w=7;w>=0;w--){var a=now-(w+1)*7*86400000,b=now-w*7*86400000;out.push(rowsI.filter(function(x){var t=new Date(x.created_at||x.interest_registered_at||0).getTime();return t>=a&&t<b;}).length);}
    return out;
  }
  function matchTrend(){
    var facts=rows(S.overview||{},['matchFacts']),by={};facts.forEach(function(f){var k=f.fixture_id||f.match_date;if(!k||!Number.isFinite(Number(f.performance_score)))return;(by[k]||(by[k]=[])).push(Number(f.performance_score));});
    return Object.keys(by).slice(-8).map(function(k){var a=by[k];return a.reduce(function(x,y){return x+y},0)/a.length;});
  }
  function dashboardActions(){
    var o=S.overview,actions=[];
    var old=rows(o,['fixtures']).filter(function(f){return new Date(f.fixture_date+'T12:00:00')<new Date()&&!factsForFixture(f.id).length;}).slice(-1);
    if(old[0])actions.push({tone:'a',title:'Record Match Facts',sub:'vs '+old[0].opponent+' · played '+fmtDate(old[0].fixture_date),label:'Record now',href:'/coach/match-facts?fixtureId='+old[0].id});
    var pending=rows(o,['videos']).filter(function(v){return safeStatus(v.moderation_status)==='pending';});
    if(pending.length)actions.push({tone:'b',title:'Review '+pending.length+' uploaded video'+(pending.length===1?'':'s'),sub:'Awaiting coach approval',label:'Review',href:'/coach/video-reels'});
    var low=rows(o,['players']).slice().sort(function(a,b){return completion(a)-completion(b);}).find(function(p){return completion(p)<80;});
    if(low)actions.push({tone:'',title:'Complete '+name(low)+"'s assessment",sub:completion(low)+'% profile readiness',label:'Update profile',href:'/player/profile?id='+low.id});
    var next=rows(o,['fixtures']).find(function(f){return new Date(f.fixture_date+'T12:00:00')>=new Date()&&attendanceFor(f.id).length;});
    if(next)actions.push({tone:'g',title:attendanceFor(next.id).length+' scouts attending '+fmtDate(next.fixture_date),sub:'vs '+next.opponent,label:'View fixture',href:'/coach/fixtures?fixtureId='+next.id});
    if(!actions.length)actions.push({tone:'g',title:'Your coach workspace is up to date',sub:'No urgent actions are waiting.',label:'View squad',href:'/coach/my-players'});
    return actions.slice(0,5);
  }
  function dashboardDesk(){
    var o=S.overview,players=rows(o,['players']),ints=rows(o,['interest']),threads=S.threads||[],unreadMsgs=threads.reduce(function(a,t){return a+n(t.unread_count||t.unreadCount,0)},0);
    var uniqueScouts={};ints.forEach(function(x){if(x.scout_id)uniqueScouts[x.scout_id]=1;});
    var valueTotal=players.reduce(function(a,p){return a+n(p.transfer_value,0)},0),ready=players.length?Math.round(players.reduce(function(a,p){return a+completion(p)},0)/players.length):0;
    var next=rows(o,['fixtures']).filter(function(f){return new Date(f.fixture_date+'T12:00:00')>=new Date();}).sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date);}).slice(0,3);
    var shape={GK:0,DEF:0,MID:0,ATT:0};players.forEach(function(p){shape[posGroup(p)]++;});
    var actions=dashboardActions(),interestPlayers=players.filter(function(p){return interestsForPlayer(p.id).length;}).sort(function(a,b){return interestsForPlayer(b.id).length-interestsForPlayer(a.id).length;}).slice(0,6);
    return'<div class="g" style="grid-template-columns:repeat(5,1fr);margin-bottom:14px">'+
      metric('Players',players.length,'Visible in this coach workspace')+
      metric('Scout interest',Object.keys(uniqueScouts).length+' <small>scouts</small>',ints.length+' explicit interest events')+
      metric('Unread messages',unreadMsgs,'Reviewed scout conversations')+
      metric('Estimated squad value',fmtMoney(valueTotal),players.filter(function(p){return n(p.transfer_value)>0}).length+' of '+players.length+' players valued')+
      metric('Profile readiness',ready+'<small>%</small>','Squad average across '+players.length+' profiles')+'</div>'+
      '<div class="g" style="grid-template-columns:minmax(0,1fr) 336px;align-items:start"><div class="g">'+
        '<div class="card"><div class="card-h"><h3>Next actions</h3><div class="sp"></div><span class="hint">'+actions.length+' open · every item deep-links to the work</span><a class="btn q sm" href="'+esc(clean('/coach/notifications'))+'">View all</a></div>'+actions.map(function(a){return'<div class="row"><span class="icn '+(a.tone||'')+'">●</span><span class="sp"><b class="rt">'+esc(a.title)+'</b><s class="rs">'+esc(a.sub)+'</s></span><a class="btn sm" href="'+esc(clean(a.href))+'">'+esc(a.label)+'</a></div>';}).join('')+'</div>'+
        '<div class="g" style="grid-template-columns:1fr 1fr"><div class="card"><div class="card-h"><h3>Squad performance trend</h3><div class="sp"></div><span class="hint">Last 8 matches</span></div><div class="card-b">'+lineChart(matchTrend())+'<div class="lgd"><span><i style="background:var(--blue)"></i>Average Match Facts rating</span><span><i style="background:var(--green-t);border:1px solid var(--line)"></i>Target band 7.0–9.0</span></div></div></div>'+
        '<div class="card"><div class="card-h"><h3>New scout interest</h3><div class="sp"></div><span class="hint">Last 8 weeks</span></div><div class="card-b">'+bars(weeklyInterest())+'<div class="lgd"><span><i style="background:var(--blue)"></i>Interest events per week</span></div></div></div></div>'+
        '<div class="card"><div class="card-h"><h3>Players receiving scout interest</h3><div class="sp"></div><span class="hint">Explicit interest only · scout notes are never shown to coaches</span></div><div class="card-b">'+(interestPlayers.length?interestPlayers.map(function(p){var c=interestsForPlayer(p.id).length;return'<div class="at"><div class="an"><a href="'+esc(clean('/player/profile?id='+p.id))+'"><b>'+esc(name(p))+'</b></a> <span class="mut">'+esc(position(p)+' · '+(p.age_group||''))+'</span></div><div class="track"><u style="width:'+Math.min(100,c*25)+'%"></u></div><div class="atv">'+c+'</div></div>';}).join(''):'<div class="mut">No explicit scout interest yet.</div>')+'</div></div>'+
      '</div><div class="g">'+
        '<div class="card"><div class="card-h"><h3>Upcoming fixtures</h3><div class="sp"></div><a class="btn q sm" href="'+esc(clean('/coach/fixtures'))+'">Fixtures</a></div>'+(next.length?next.map(function(f){var a=attendanceFor(f.id).length;return'<div class="row"><span class="sp"><b class="rt">vs '+esc(f.opponent)+'</b><s class="rs">'+esc(fmtDate(f.fixture_date,f.fixture_time)+' · '+(f.home_or_away||'')+' · '+(f.format||''))+'</s></span><span class="tag '+(a?'g':'')+'">'+(a?a+' scouts attending':'No attendance yet')+'</span></div>';}).join(''):'<div class="card-b mut">No upcoming fixtures.</div>')+'</div>'+
        '<div class="card"><div class="card-h"><h3>Scout activity</h3><div class="sp"></div><span class="hint">Last 30 days</span></div><div class="card-b"><div class="g" style="grid-template-columns:1fr 1fr">'+metricMini('Scouts',Object.keys(uniqueScouts).length)+metricMini('Players',interestPlayers.length)+metricMini('New conversations',threads.filter(function(t){return Date.now()-new Date(t.created_at||0).getTime()<30*86400000;}).length)+metricMini('Fixtures watched',new Set(rows(o,['attendance']).map(function(a){return a.fixture_id;})).size)+'</div></div></div>'+
        '<div class="card"><div class="card-h"><h3>Squad shape</h3></div><div class="card-b">'+['GK','DEF','MID','ATT'].map(function(k){return'<div class="at"><div class="an" style="width:30px;flex:0 0 30px">'+k+'</div><div class="track"><u style="width:'+(players.length?shape[k]/players.length*100:0)+'%"></u></div><div class="atv">'+shape[k]+'</div></div>';}).join('')+'</div></div>'+
        '<div class="card"><div class="card-h"><h3>Profile readiness</h3></div><div class="card-b">'+readinessBar(players)+'</div></div>'+
      '</div></div>';
  }
  function metricMini(k,v){return'<div><div class="lbl">'+esc(k)+'</div><div class="num" style="font-size:23px;font-weight:700;margin-top:4px">'+esc(v)+'</div></div>';}
  function readinessBar(players){
    var complete=players.filter(function(p){return completion(p)>=80}).length,work=players.filter(function(p){var c=completion(p);return c>=50&&c<80}).length,low=players.filter(function(p){return completion(p)<50}).length,total=Math.max(1,players.length);
    return'<div class="coach-stacked">'+(complete?'<span style="width:'+complete/total*100+'%;background:var(--blue)">'+complete+'</span>':'')+(work?'<span style="width:'+work/total*100+'%;background:var(--amber)">'+work+'</span>':'')+(low?'<span style="width:'+low/total*100+'%;background:var(--grey)">'+low+'</span>':'')+'</div><div class="lgd" style="margin-top:12px"><span><i style="background:var(--blue)"></i>Complete '+complete+'</span><span><i style="background:var(--amber)"></i>Needs work '+work+'</span><span><i style="background:var(--grey)"></i>Not started '+low+'</span></div>';
  }
  function dashboardPhone(){
    var o=S.overview,players=rows(o,['players']),ints=rows(o,['interest']),unique={};ints.forEach(function(x){if(x.scout_id)unique[x.scout_id]=1;});
    var total=players.reduce(function(a,p){return a+n(p.transfer_value,0)},0),actions=dashboardActions(),next=rows(o,['fixtures']).filter(function(f){return new Date(f.fixture_date+'T12:00:00')>=new Date()}).sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date)})[0];
    var shape={GK:0,DEF:0,MID:0,ATT:0};players.forEach(function(p){shape[posGroup(p)]++;});
    var interestPlayers=players.filter(function(p){return interestsForPlayer(p.id).length;}).sort(function(a,b){return interestsForPlayer(b.id).length-interestsForPlayer(a.id).length;}).slice(0,5);
    return fieldHeader('Dashboard',team()+' · '+players.length+' players')+'<div class="pkpi">'+metric('Players',players.length,'')+metric('Scout interest',Object.keys(unique).length,'')+metric('Messages',(S.threads||[]).reduce(function(a,t){return a+n(t.unread_count,0)},0),'')+metric('Readiness',(players.length?Math.round(players.reduce(function(a,p){return a+completion(p)},0)/players.length):0)+'%','')+'</div>'+
      '<div class="kpi" style="margin-top:8px"><div class="k">Estimated squad value</div><div class="v">'+fmtMoney(total)+'</div></div>'+
      '<div class="pcap">Next actions <span>'+actions.length+'</span></div><div class="card">'+actions.map(function(a){return'<a class="rowline" href="'+esc(clean(a.href))+'"><span class="icn '+a.tone+'">●</span><span class="who"><b>'+esc(a.title)+'</b><span>'+esc(a.sub)+'</span></span><span>›</span></a>';}).join('')+'</div>'+
      '<div class="pcap">Squad performance <span>last matches</span></div><div class="card"><div class="card-b">'+phoneLineChart(matchTrend())+'</div></div>'+
      '<div class="pcap">Scout interest <span>8 weeks</span></div><div class="card"><div class="card-b">'+phoneBars(weeklyInterest())+'</div></div>'+
      (next?'<div class="pcap">Next fixture</div><div class="card"><a class="rowline" href="'+esc(clean('/coach/fixtures?fixtureId='+next.id))+'"><span class="who"><b>vs '+esc(next.opponent)+'</b><span>'+esc(fmtDate(next.fixture_date,next.fixture_time)+' · '+(next.home_or_away||''))+'</span></span><span class="tag '+(attendanceFor(next.id).length?'g':'')+'">'+attendanceFor(next.id).length+' scouts</span></a></div>':'')+
      '<div class="pcap">Squad shape</div><div class="card"><div class="card-b">'+['GK','DEF','MID','ATT'].map(function(k){return'<div class="at"><div class="an" style="width:30px;flex:0 0 30px">'+k+'</div><div class="track"><u style="width:'+(players.length?shape[k]/players.length*100:0)+'%"></u></div><div class="atv">'+shape[k]+'</div></div>';}).join('')+'</div></div>'+
      '<div class="pcap">Profile readiness</div><div class="card"><div class="card-b">'+readinessBar(players)+'</div></div>'+
      '<div class="pcap">Players with scout interest <span>'+interestPlayers.length+'</span></div><div class="card">'+(interestPlayers.length?interestPlayers.map(function(p){var c=interestsForPlayer(p.id).length;return'<a class="rowline" href="'+esc(clean('/player/profile?id='+p.id))+'"><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(position(p)+' · '+(p.age_group||''))+'</span></span><span class="tag b">'+c+' scout'+(c===1?'':'s')+'</span></a>';}).join(''):'<div class="card-b mut">No explicit scout interest yet.</div>')+'</div>';
  }
  async function initDashboard(){
    setActions('Export squad','#','Record Match Facts','/coach/match-facts');
    try{await loadOverview();var tr=await api('GET','/api/chat/threads').catch(function(){return{data:[]}});S.threads=rows(tr,['threads','data']);desk.innerHTML=dashboardDesk();field.innerHTML=dashboardPhone();bindDashboard();}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}
  }
  function bindDashboard(){
    var ex=document.querySelector('[data-coach-route-action="secondary"]');if(ex)ex.onclick=function(e){e.preventDefault();exportSquad(rows(S.overview,['players']));};
  }

  /* ================= My Players ================= */
  function playerInterestCount(p){return interestsForPlayer(p.id).length;}
  function assignedCounts(){var out={};rows(S.overview||{},['players']).forEach(function(p){var id=p.assigned_coach_id||'';out[id]=(out[id]||0)+1;});return out;}
  function filteredPlayers(){
    var f=S.filters,q=String(f.search||'').toLowerCase(),listp=rows(S.overview||{},['players']).filter(function(p){
      if(q&&name(p).toLowerCase().indexOf(q)<0)return false;
      if(Object.keys(f.ages).some(function(k){return f.ages[k]})&&!f.ages[p.age_group])return false;
      if(f.group&&posGroup(p)!==f.group)return false;
      if(f.coach&&String(p.assigned_coach_id)!==String(f.coach))return false;
      if(f.evidence==='work'&&completion(p)>=80)return false;
      if(f.evidence==='novideo'&&videosForPlayer(p.id).some(function(v){return safeStatus(v.moderation_status)==='approved'}))return false;
      if(f.interest==='yes'&&!playerInterestCount(p))return false;
      if(f.interest==='no'&&playerInterestCount(p))return false;
      var rating=n(p.overall_rating,-1);
      if(f.rating==='60-85'&&rating>=0&&(rating<60||rating>85))return false;
      var av=p.availability||'Available',activeAvailability=Object.keys(f.availability||{}).filter(function(k){return f.availability[k]});
      if(activeAvailability.length&&activeAvailability.indexOf(av)<0)return false;
      return true;
    });
    if(f.sort==='overall')listp.sort(function(a,b){return n(b.overall_rating)-n(a.overall_rating)});
    else if(f.sort==='name')listp.sort(function(a,b){return name(a).localeCompare(name(b));});
    else if(f.sort==='value')listp.sort(function(a,b){return n(b.transfer_value)-n(a.transfer_value);});
    return listp;
  }
  function playerStatus(p){
    var availability=p.availability||'Available';
    if(availability==='Injured')return'<span class="tag a"><i></i>Injured</span>';
    if(availability==='Unavailable')return'<span class="tag r"><i></i>Unavailable</span>';
    if(playerInterestCount(p))return'<span class="tag g"><i></i>Scout interest</span>';
    var pc=completion(p);if(pc<70)return'<span class="tag a"><i></i>Evidence incomplete</span>';
    if(!videosForPlayer(p.id).some(function(v){return safeStatus(v.moderation_status)==='approved'}))return'<span class="tag">No video</span>';
    return'<span class="tag b"><i></i>Match-ready</span>';
  }
  function rail(){
    var all=rows(S.overview||{},['players']),ages={};all.forEach(function(p){ages[p.age_group]=(ages[p.age_group]||0)+1;});var counts=assignedCounts();
    var availabilityCounts={Available:0,Injured:0,Unavailable:0};all.forEach(function(p){var a=p.availability||'Available';if(availabilityCounts[a]!=null)availabilityCounts[a]++;});
    function option(type,nameAttr,dataAttr,value,label,count,checked){
      return'<label class="ri"><input type="'+type+'" '+(nameAttr?'name="'+nameAttr+'" ':'')+dataAttr+'="'+esc(value)+'" '+(checked?'checked':'')+'><span class="rit">'+esc(label)+'</span><span class="n">'+count+'</span></label>';
    }
    return'<aside class="rail"><div class="rail-h">Filters<button class="btn q sm" id="resetPlayers">Reset</button></div>'+
      '<div class="rsec"><div class="rh">Search</div><input class="inp" id="playerSearch" placeholder="Player name" value="'+esc(S.filters.search)+'"></div>'+
      '<div class="rsec"><div class="rh">Age group <span>'+Object.keys(ages).length+' of 10</span></div>'+Object.keys(ages).sort().map(function(a){return option('checkbox','', 'data-filter-age',a,a,ages[a],S.filters.ages[a]);}).join('')+'</div>'+
      '<div class="rsec"><div class="rh">Position</div>'+[['','All positions'],['GK','Goalkeeper'],['DEF','Defender'],['MID','Midfielder'],['ATT','Attacker']].map(function(x){var count=x[0]?all.filter(function(p){return posGroup(p)===x[0]}).length:all.length;return option('radio','pg','data-filter-group',x[0],x[1],count,S.filters.group===x[0]);}).join('')+'<div class="sel" style="margin-top:8px">Exact position — any</div></div>'+
      (S.coaches.length>1?'<div class="rsec"><div class="rh">Assigned coach</div>'+S.coaches.map(function(c){return option('radio','coach','data-filter-coach',c.id,[c.first_name,c.last_name].filter(Boolean).join(' '),counts[c.id]||0,String(S.filters.coach)===String(c.id));}).join('')+'</div>':'')+
      '<div class="rsec"><div class="rh">Evidence</div>'+[['','All'],['work','Profile needs work'],['novideo','No video']].map(function(x){var count=x[0]==='work'?all.filter(function(p){return completion(p)<80}).length:x[0]==='novideo'?all.filter(function(p){return!videosForPlayer(p.id).some(function(v){return safeStatus(v.moderation_status)==='approved'})}).length:all.length;return option('radio','ev','data-filter-evidence',x[0],x[1],count,S.filters.evidence===x[0]);}).join('')+'</div>'+
      '<div class="rsec"><div class="rh">Scout interest</div>'+[['','Any'],['yes','Has interest'],['no','No interest']].map(function(x){var count=x[0]==='yes'?all.filter(playerInterestCount).length:x[0]==='no'?all.filter(function(p){return !playerInterestCount(p)}).length:all.length;return option('radio','si','data-filter-interest',x[0],x[1],count,S.filters.interest===x[0]);}).join('')+'</div>'+
      '<div class="rsec"><div class="rh">Overall rating</div><select class="inp" id="filterRating"><option value=""'+(!S.filters.rating?' selected':'')+'>Any rating</option><option value="60-85"'+(S.filters.rating==='60-85'?' selected':'')+'>60 to 85</option></select></div>'+
      '<div class="rsec"><div class="rh">Availability</div>'+['Available','Injured','Unavailable'].map(function(a){return option('checkbox','','data-filter-availability',a,a,availabilityCounts[a],S.filters.availability[a]);}).join('')+'</div></aside>';
  }
  function selectedSet(){var out={};(S.selectedPlayers||[]).forEach(function(id){out[String(id)]=1;});return out;}
  function playersDesk(){
    var all=filteredPlayers(),per=20,pages=Math.max(1,Math.ceil(all.length/per));S.playerPage=Math.min(S.playerPage,pages);var listp=all.slice((S.playerPage-1)*per,S.playerPage*per),selected=selectedSet(),selectedCount=S.selectedPlayers.length;
    var toolbar=selectedCount?
      '<div class="card-h" style="background:var(--blue-t)"><h3>'+selectedCount+' player'+(selectedCount===1?'':'s')+' selected</h3><div class="sp"></div><button class="btn sm" id="bulkAssignCoach">Assign coach</button><button class="btn sm" id="bulkGenerateLinks">Generate upload links</button><button class="btn sm" id="bulkAvailability">Set availability</button><button class="btn sm" id="bulkExport">Export</button><button class="btn sm dgr" id="bulkArchive">Archive to season</button><button class="btn q sm" id="bulkClear">Clear</button></div>':
      '<div class="card-h"><h3>Squad</h3><span class="hint">'+all.length+' players · showing '+(all.length?((S.playerPage-1)*per+1):0)+'–'+Math.min(S.playerPage*per,all.length)+'</span><div class="sp"></div><select class="tag" id="playerSort"><option value="overall"'+(S.filters.sort==='overall'?' selected':'')+'>Sort: Overall rating</option><option value="name"'+(S.filters.sort==='name'?' selected':'')+'>Sort: Name</option><option value="value"'+(S.filters.sort==='value'?' selected':'')+'>Sort: Value</option></select><button class="btn sm" id="playerColumns">Columns</button><button class="btn sm" id="playersExport">Export</button></div>';
    return'<div style="display:flex;gap:14px;align-items:flex-start">'+rail()+'<div class="card" style="flex:1;min-width:0">'+toolbar+'<table><thead><tr><th style="width:28px"><input type="checkbox" id="selectPagePlayers" aria-label="Select visible players" '+(listp.length&&listp.every(function(p){return selected[String(p.id)]})?'checked':'')+'></th><th>Player</th><th class="r">Apps</th><th class="r">G</th><th class="r">A</th><th class="r">OVR</th><th class="r">Last</th><th>Form</th><th class="r">Value</th><th>Profile</th><th class="r">Scouts</th><th>Status</th></tr></thead><tbody>'+listp.map(function(p){var pc=completion(p),facts=matchFactsForPlayer(p.id),vals=facts.slice(0,5).map(function(x){return n(x.performance_score,0)}).reverse();return'<tr data-player-row="'+esc(p.id)+'"><td><input type="checkbox" data-player-select="'+esc(p.id)+'" aria-label="Select '+esc(name(p))+'" '+(selected[String(p.id)]?'checked':'')+'></td><td><a class="who" href="'+esc(clean('/player/profile?id='+p.id))+'">'+avatar(p)+'<span><b>'+esc(name(p))+'</b><s>'+esc(position(p)+' · '+(p.age_group||'—')+' · '+coachName(p.assigned_coach_id))+'</s></span></a></td><td class="r">'+n(p.appearances)+'</td><td class="r">'+n(p.goals)+'</td><td class="r">'+n(p.assists)+'</td><td class="r"><b>'+esc(p.overall_rating==null?'—':Math.round(n(p.overall_rating)))+'</b></td><td class="r">'+(facts[0]&&Number.isFinite(Number(facts[0].performance_score))?Number(facts[0].performance_score).toFixed(1):'—')+'</td><td>'+spark(vals)+'</td><td class="r">'+fmtMoney(p.transfer_value)+'</td><td><div class="ebar '+(pc<50?'low':pc<80?'mid':'')+'"><span class="tr"><i style="width:'+pc+'%"></i></span><b>'+pc+'%</b></div></td><td class="r">'+(playerInterestCount(p)||'—')+'</td><td>'+playerStatus(p)+'</td></tr>';}).join('')+'</tbody></table><div class="foot"><span class="mut">Rows link to the player profile. Filters and sort persist per coach.</span><div class="sp"></div><button class="btn sm" data-player-page="'+Math.max(1,S.playerPage-1)+'">Previous</button>'+Array.from({length:Math.min(3,pages)},function(_,i){var x=i+1;return'<button class="btn sm '+(x===S.playerPage?'p':'')+'" data-player-page="'+x+'">'+x+'</button>';}).join('')+'<button class="btn sm" data-player-page="'+Math.min(pages,S.playerPage+1)+'">Next</button></div></div></div>';
  }
  function avatar(p){return'<span class="av">'+esc(initials(p))+'</span>';}
  function playersPhone(){
    var all=filteredPlayers(),listp=all.slice(0,20);
    return fieldHeader('My Players',all.length+' players','<button class="icb" id="phonePlayerFilter" aria-label="Filter players">☰</button><a class="icb" href="'+esc(clean('/coach/add-player'))+'" aria-label="Add player">+</a>')+
      '<div class="field player-phone-search"><input class="in" id="phonePlayerSearch" placeholder="Search players" value="'+esc(S.filters.search)+'"></div>'+
      '<div class="player-phone-list">'+listp.map(function(p){var pc=completion(p),facts=matchFactsForPlayer(p.id),vals=facts.slice(0,5).map(function(x){return n(x.performance_score,0)}).reverse();return'<a class="player-phone-row" href="'+esc(clean('/player/profile?id='+p.id))+'">'+
        '<div class="player-phone-main"><span class="avm">'+esc(initials(p))+'</span><span class="player-phone-who"><b>'+esc(name(p))+'</b><span>'+esc(position(p)+' · '+(p.age_group||'—')+' · '+coachName(p.assigned_coach_id))+'</span></span><span class="player-phone-overall"><b>'+esc(p.overall_rating==null?'—':Math.round(n(p.overall_rating)))+'</b><small>overall</small></span></div>'+
        '<div class="player-phone-evidence"><span class="player-ready-bar"><i style="width:'+pc+'%"></i></span><b>'+pc+'%</b><span class="player-phone-form">'+spark(vals)+'</span>'+playerStatus(p)+(playerInterestCount(p)?'<span class="tag b">'+playerInterestCount(p)+' scout'+(playerInterestCount(p)===1?'':'s')+'</span>':'')+'</div>'+
      '</a>';}).join('')+(all.length>20?'<div class="player-phone-more">'+(all.length-20)+' more players · use filters to narrow the squad</div>':'')+'</div>';
  }
  function playerFilterSheet(){
    window.CoachV2.openSheet({title:'Filter squad',html:'<div class="field"><label>Position group</label><select class="in" id="sheetGroup"><option value="">All positions</option><option value="GK">Goalkeeper</option><option value="DEF">Defender</option><option value="MID">Midfielder</option><option value="ATT">Attacker</option></select></div><div class="field"><label>Scout interest</label><select class="in" id="sheetInterest"><option value="">Any</option><option value="yes">Has interest</option><option value="no">No interest</option></select></div><div class="field"><label>Evidence</label><select class="in" id="sheetEvidence"><option value="">All</option><option value="work">Profile needs work</option><option value="novideo">No video</option></select></div>',footer:'<button class="btn p" id="applyPhoneFilters">Apply filters</button>'});
    setTimeout(function(){document.getElementById('sheetGroup').value=S.filters.group;document.getElementById('sheetInterest').value=S.filters.interest;document.getElementById('sheetEvidence').value=S.filters.evidence;document.getElementById('applyPhoneFilters').onclick=function(){S.filters.group=document.getElementById('sheetGroup').value;S.filters.interest=document.getElementById('sheetInterest').value;S.filters.evidence=document.getElementById('sheetEvidence').value;window.CoachV2.closeAll();renderPlayers();};},0);
  }
  function toggleSelected(id,on){
    var key=String(id),set=selectedSet();
    if(on)set[key]=1;else delete set[key];
    S.selectedPlayers=Object.keys(set);
  }
  function assignSelected(){
    if(!S.selectedPlayers.length)return;
    var options=S.coaches.map(function(c){return'<option value="'+esc(c.id)+'">'+esc([c.first_name,c.last_name].filter(Boolean).join(' '))+'</option>';}).join('');
    window.CoachV2.openDrawer({title:'Assign '+S.selectedPlayers.length+' players',html:'<div class="field"><label>Assigned coach</label><select class="in" id="bulkCoachSelect">'+options+'</select></div><div class="callout">Only coaches in this team can be assigned.</div><div id="bulkCoachMsg"></div>',footer:'<button class="btn p" id="bulkCoachSave">Assign coach</button>'});
    setTimeout(function(){document.getElementById('bulkCoachSave').onclick=function(){var coachId=document.getElementById('bulkCoachSelect').value,ids=S.selectedPlayers.slice();ids.reduce(function(chain,id){return chain.then(function(){return api('POST','/api/coaches/assign-player/'+encodeURIComponent(id),{coachId:coachId})});},Promise.resolve()).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Players assigned.');S.selectedPlayers=[];return loadOverview(true)}).then(renderPlayers).catch(function(e){document.getElementById('bulkCoachMsg').innerHTML=msg(e.message,true);});};},0);
  }
  function generateSelectedLinks(){
    var ids=S.selectedPlayers.slice();if(!ids.length)return;
    window.CoachV2.openDrawer({title:'Safeguarded upload links',html:'<div class="callout"><b>One link per selected player.</b> Uploads enter the coach review queue and stay hidden from scouts until approved.</div><div id="bulkLinkResults" class="stack"><div class="mut">Generating '+ids.length+' secure links…</div></div>',footer:'<button class="btn" id="copyBulkLinks" disabled>Copy all links</button>'});
    Promise.all(ids.map(function(id){return api('POST','/api/videos/upload-link',{playerId:id}).then(function(r){var d=r.data||r;return{id:id,url:d.uploadUrl||d.url||''}})})).then(function(items){var out=document.getElementById('bulkLinkResults'),urls=items.map(function(x){return x.url}).filter(Boolean),map={};rows(S.overview||{},['players']).forEach(function(p){map[String(p.id)]=p});out.innerHTML=items.map(function(x){return'<div class="card"><div class="card-b"><b>'+esc(name(map[String(x.id)]||{}))+'</b><div class="linkbox">'+esc(x.url||'Link unavailable')+'</div></div></div>';}).join('');var copy=document.getElementById('copyBulkLinks');copy.disabled=!urls.length;copy.onclick=function(){navigator.clipboard.writeText(urls.join('\n')).then(function(){window.CoachV2.showToast('Upload links copied.');});};}).catch(function(e){document.getElementById('bulkLinkResults').innerHTML=msg(e.message,true);});
  }
  function availabilitySelected(){
    if(!S.selectedPlayers.length)return;
    window.CoachV2.openDrawer({title:'Set availability',html:'<div class="field"><label>Availability</label><select class="in" id="bulkAvailabilityValue"><option>Available</option><option>Injured</option><option>Unavailable</option></select></div><div id="bulkAvailabilityMsg"></div>',footer:'<button class="btn p" id="bulkAvailabilitySave">Update '+S.selectedPlayers.length+' players</button>'});
    setTimeout(function(){document.getElementById('bulkAvailabilitySave').onclick=function(){api('POST','/api/coach-experience/players/bulk-availability',{playerIds:S.selectedPlayers,availability:document.getElementById('bulkAvailabilityValue').value}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Availability updated.');S.selectedPlayers=[];return loadOverview(true)}).then(renderPlayers).catch(function(e){document.getElementById('bulkAvailabilityMsg').innerHTML=msg(e.message,true);});};},0);
  }
  function archiveSelected(){
    if(!S.selectedPlayers.length)return;
    if(!confirm('Archive '+S.selectedPlayers.length+' selected player'+(S.selectedPlayers.length===1?'':'s')+' from the active season? Their historical records remain intact.'))return;
    api('POST','/api/coach-experience/players/bulk-archive',{playerIds:S.selectedPlayers,reason:'Season archive'}).then(function(){window.CoachV2.showToast('Players archived.');S.selectedPlayers=[];return loadOverview(true)}).then(renderPlayers).catch(function(e){alert(e.message);});
  }
  function bindPlayers(){
    var q=document.getElementById('playerSearch');if(q)q.oninput=function(){S.filters.search=q.value;S.playerPage=1;renderPlayers();};
    var qp=document.getElementById('phonePlayerSearch');if(qp)qp.oninput=function(){S.filters.search=qp.value;renderPlayers();};
    document.querySelectorAll('[data-filter-age]').forEach(function(x){x.onchange=function(){S.filters.ages[x.dataset.filterAge]=x.checked;S.playerPage=1;renderPlayers();};});
    document.querySelectorAll('[data-filter-group]').forEach(function(x){x.onchange=function(){S.filters.group=x.dataset.filterGroup;renderPlayers();};});
    document.querySelectorAll('[data-filter-coach]').forEach(function(x){x.onchange=function(){S.filters.coach=x.dataset.filterCoach;renderPlayers();};});
    document.querySelectorAll('[data-filter-evidence]').forEach(function(x){x.onchange=function(){S.filters.evidence=x.dataset.filterEvidence;renderPlayers();};});
    document.querySelectorAll('[data-filter-interest]').forEach(function(x){x.onchange=function(){S.filters.interest=x.dataset.filterInterest;renderPlayers();};});
    document.querySelectorAll('[data-filter-availability]').forEach(function(x){x.onchange=function(){S.filters.availability[x.dataset.filterAvailability]=x.checked;S.playerPage=1;renderPlayers();};});
    var fr=document.getElementById('filterRating');if(fr)fr.onchange=function(){S.filters.rating=fr.value;S.playerPage=1;renderPlayers();};
    document.querySelectorAll('[data-player-select]').forEach(function(x){x.onchange=function(){toggleSelected(x.dataset.playerSelect,x.checked);renderPlayers();};});
    var allBox=document.getElementById('selectPagePlayers');if(allBox)allBox.onchange=function(){var pageIds=Array.from(document.querySelectorAll('[data-player-select]')).map(function(x){return x.dataset.playerSelect});pageIds.forEach(function(id){toggleSelected(id,allBox.checked)});renderPlayers();};
    document.querySelectorAll('[data-player-page]').forEach(function(x){x.onclick=function(){S.playerPage=Number(x.dataset.playerPage);renderPlayers();};});
    var srt=document.getElementById('playerSort');if(srt)srt.onchange=function(){S.filters.sort=srt.value;renderPlayers();};
    var reset=document.getElementById('resetPlayers');if(reset)reset.onclick=function(){S.filters={search:'',ages:{},group:'',coach:'',evidence:'',interest:'',sort:'overall',rating:'60-85',availability:{Available:true,Injured:false,Unavailable:false}};S.playerPage=1;S.selectedPlayers=[];renderPlayers();};
    var exp=document.getElementById('playersExport');if(exp)exp.onclick=function(){exportSquad(filteredPlayers());};
    var be=document.getElementById('bulkExport');if(be)be.onclick=function(){var set=selectedSet();exportSquad(rows(S.overview||{},['players']).filter(function(p){return set[String(p.id)]}));};
    var clear=document.getElementById('bulkClear');if(clear)clear.onclick=function(){S.selectedPlayers=[];renderPlayers();};
    var assign=document.getElementById('bulkAssignCoach');if(assign)assign.onclick=assignSelected;
    var links=document.getElementById('bulkGenerateLinks');if(links)links.onclick=generateSelectedLinks;
    var avail=document.getElementById('bulkAvailability');if(avail)avail.onclick=availabilitySelected;
    var archive=document.getElementById('bulkArchive');if(archive)archive.onclick=archiveSelected;
    var filter=document.getElementById('phonePlayerFilter');if(filter)filter.onclick=playerFilterSheet;
  }
  function exportSquad(players){
    var headers=['first_name','last_name','age_group','primary_position','appearances','goals','assists','overall_rating','estimated_value','profile_readiness','scout_interest'];
    var csv=[headers.join(',')].concat(players.map(function(p){return[p.first_name,p.last_name,p.age_group,position(p),p.appearances||0,p.goals||0,p.assists||0,p.overall_rating||'',p.transfer_value||'',completion(p),playerInterestCount(p)].map(function(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"'}).join(',')})).join('\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='scoutlink-squad.csv';a.click();URL.revokeObjectURL(a.href);
  }
  function renderPlayers(){desk.innerHTML=playersDesk();field.innerHTML=playersPhone();bindPlayers();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function initPlayers(){setActions('Bulk import','/coach/bulk-add-players','Add player','/coach/add-player');try{await loadOverview();renderPlayers();}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}}

  /* ================= Fixtures ================= */
  function isFuture(f){return new Date(f.fixture_date+'T12:00:00')>=new Date(new Date().setHours(0,0,0,0));}
  function fixtureCardRow(f){
    var fact=factsForFixture(f.id)[0],a=attendanceFor(f.id).length;
    return'<div class="row"><div class="plate '+(fact?'g':'')+'"><b>'+esc(new Date(f.fixture_date+'T12:00:00').getDate())+'</b><span>'+esc(new Date(f.fixture_date+'T12:00:00').toLocaleDateString('en-GB',{month:'short'}))+'</span></div><span class="sp"><b class="rt">vs '+esc(f.opponent)+'</b><s class="rs">'+esc(fmtDate(f.fixture_date,f.fixture_time)+' · '+(f.home_or_away||'')+' · '+(f.format||'')+(f.venue?' · '+f.venue:''))+'</s></span>'+(a?'<span class="tag g"><i></i>'+a+' scouts attending</span>':'<span class="tag">No scout attendance</span>')+'<span class="tag '+(fact?'g':'a')+'">'+(fact?'Match Facts recorded':'Match Facts missing')+'</span><button class="btn sm" data-fixture-open="'+esc(f.id)+'">View</button></div>';
  }
  function fixturesDesk(){
    var fixtures=rows(S.overview||{},['fixtures']).slice().sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date)}),up=fixtures.filter(isFuture),past=fixtures.filter(function(f){return!isFuture(f)}).reverse(),coverage=fixtures.length?Math.round(fixtures.filter(function(f){return factsForFixture(f.id).length}).length/fixtures.length*100):0;
    var run=past.slice(0,6).map(function(f){var mf=factsForFixture(f.id)[0];return mf&&mf.home_score!=null&&mf.away_score!=null?(mf.home_score+'–'+mf.away_score):'—';});
    return'<div class="g" style="grid-template-columns:minmax(0,1fr) 320px"><div class="g"><div class="card"><div class="card-h"><h3>Upcoming</h3><div class="sp"></div><span class="hint">'+up.length+' fixtures</span></div>'+(up.length?up.map(fixtureCardRow).join(''):'<div class="card-b mut">No upcoming fixtures.</div>')+'</div><div class="card"><div class="card-h"><h3>Played</h3><div class="sp"></div><span class="hint">'+past.length+' fixtures</span></div>'+(past.length?past.slice(0,8).map(fixtureCardRow).join(''):'<div class="card-b mut">No played fixtures yet.</div>')+'</div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Match Facts coverage</h3></div><div class="card-b"><div class="num" style="font-size:34px;font-weight:700">'+coverage+'%</div><div class="meter"><span class="bar"><i style="width:'+coverage+'%"></i></span></div><div class="mut" style="margin-top:8px">Recorded fixtures strengthen every player’s evidence trail.</div></div></div><div class="card"><div class="card-h"><h3>Results run</h3></div><div class="card-b"><div class="chips">'+run.map(function(x){return'<span class="chip">'+esc(x)+'</span>';}).join('')+'</div></div></div><div class="card"><div class="card-h"><h3>Scouts attending soon</h3></div>'+up.filter(function(f){return attendanceFor(f.id).length}).slice(0,4).map(function(f){return'<div class="row"><span class="sp"><b class="rt">vs '+esc(f.opponent)+'</b><s class="rs">'+esc(fmtDate(f.fixture_date))+'</s></span><span class="tag g">'+attendanceFor(f.id).length+' scouts</span></div>';}).join('')+'</div></div></div>';
  }
  function fixtureCoverage(fixtures){
    var played=fixtures.filter(function(f){return !isFuture(f)}),recorded=0,drafts=0,missing=0;
    played.forEach(function(f){var facts=factsForFixture(f.id);if(facts.some(function(x){return x.confirmed!==false}))recorded++;else if(facts.length)drafts++;else missing++;});
    return{played:played.length,recorded:recorded,drafts:drafts,missing:missing};
  }
  function fixturePhoneDetail(f){
    var att=attendanceFor(f.id),facts=factsForFixture(f.id),players=rows(S.overview||{},['players']),videos=rows(S.overview||{},['videos']).filter(function(v){return String(v.fixture_id||'')===String(f.id)}),address=[f.venue_address||f.venue,f.city,f.venue_postcode,f.country].filter(Boolean).join(', '),availability={Available:0,Injured:0,Unavailable:0};
    players.forEach(function(p){var a=p.availability||'Available';availability[a]=(availability[a]||0)+1;});
    var previous=rows(S.overview||{},['fixtures']).filter(function(x){return String(x.id)!==String(f.id)&&String(x.opponent||'').toLowerCase()===String(f.opponent||'').toLowerCase()&&!isFuture(x)}).sort(function(a,b){return new Date(b.fixture_date)-new Date(a.fixture_date)}).slice(0,3);
    function threadForScout(sid){return(S.threads||rows(S.overview||{},['threads'])).find(function(t){return String(t.scout_id||'')===String(sid)});}
    return fieldHeader('vs '+(f.opponent||'Opponent'),fmtDate(f.fixture_date,f.fixture_time),'<button class="ic" aria-label="Fixture actions">⋯</button>','<button class="bk" id="fixturePhoneBack">‹</button>')+
      '<div class="stack">'+
        '<div class="card"><div class="ck" style="margin-bottom:8px">Fixture detail</div><div class="kv"><span>Home / away</span><b>'+esc(f.home_or_away||'—')+'</b></div><div class="kv"><span>Format</span><b>'+esc((f.format||'—')+(String(f.format||'').indexOf('v')<0&&f.format?'v'+f.format:''))+'</b></div><div class="kv"><span>Venue</span><b>'+esc(f.venue||'—')+'</b></div>'+(address?'<div class="kv"><span>Address</span><b style="text-align:right">'+esc(address)+'</b></div><a class="bt blk" style="margin-top:10px" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)+'">Directions</a>':'')+'</div>'+
        '<div class="pkpi"><div class="kpi"><div class="k">Scouts attending</div><div class="v">'+att.length+'</div></div><div class="kpi"><div class="k">Available</div><div class="v">'+availability.Available+'</div></div></div>'+
        '<div class="card"><div class="ck" style="margin-bottom:6px">Scout attendance</div>'+(att.length?att.map(function(a){var t=threadForScout(a.scout_id);return'<div class="rowline"><span class="who"><b>'+esc(scoutLabel(a.scout_id))+'</b><span>'+esc(a.status||'Attending')+'</span></span>'+(t?'<a class="bt sm" href="'+esc(clean('/coach/chat?threadId='+threadId(t)))+'">Chat</a>':'')+'</div>';}).join(''):'<div class="mut">No scout attendance yet.</div>')+'</div>'+
        '<div class="card"><div class="ck" style="margin-bottom:6px">Squad availability</div><div class="kv"><span>Available</span><b>'+availability.Available+'</b></div><div class="kv"><span>Injured</span><b>'+availability.Injured+'</b></div><div class="kv"><span>Unavailable</span><b>'+availability.Unavailable+'</b></div></div>'+
        '<div class="card"><div class="ck" style="margin-bottom:6px">Previous meetings</div>'+(previous.length?previous.map(function(x){var mf=factsForFixture(x.id)[0];return'<div class="rowline"><span class="who"><b>'+esc(fmtDate(x.fixture_date))+'</b><span>'+esc(mf&&mf.home_score!=null&&mf.away_score!=null?mf.home_score+'–'+mf.away_score:'Result not recorded')+'</span></span></div>';}).join(''):'<div class="mut">No previous meetings recorded.</div>')+'</div>'+
        '<div class="card"><div class="ck" style="margin-bottom:6px">Video</div>'+(videos.length?videos.map(function(v){return'<div class="rowline"><span class="icn '+(safeStatus(v.moderation_status)==='approved'?'g':'a')+'">▶</span><span class="who"><b>'+esc(v.title||'Fixture video')+'</b><span>'+esc(safeStatus(v.moderation_status))+'</span></span><a class="bt sm" href="'+esc(clean('/coach/video-reels'))+'">Open</a></div>';}).join(''):'<div class="mut">No video is linked to this fixture.</div>')+'<a class="bt blk" style="margin-top:10px" href="'+esc(clean('/coach/video-reels?fixtureId='+f.id))+'">Attach video</a></div>'+
      '</div><div class="actbar"><button class="bt gh" id="phoneEditFixture" style="flex:1">Edit</button><a class="bt gh" style="flex:1" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id+'&mode=matchday'))+'">Matchday mode</a><a class="bt spend" style="flex:1" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id))+'">'+(facts.length?'Match Facts':'Record facts')+'</a></div>';
  }
  function fixturesPhone(){
    var fixtures=rows(S.overview||{},['fixtures']).slice().sort(function(a,b){return new Date(a.fixture_date)-new Date(b.fixture_date)});
    if(S.activeFixtureId){var active=fixtures.find(function(f){return String(f.id)===String(S.activeFixtureId)});if(active)return fixturePhoneDetail(active);}
    var up=fixtures.filter(isFuture),past=fixtures.filter(function(f){return!isFuture(f)}).reverse(),coverage=fixtureCoverage(fixtures),attendance=rows(S.overview||{},['attendance']),missing=past.find(function(f){return!factsForFixture(f.id).length}),recordedPct=coverage.played?Math.round(coverage.recorded/coverage.played*100):0,draftPct=coverage.played?Math.round(coverage.drafts/coverage.played*100):0,missingPct=Math.max(0,100-recordedPct-draftPct);
    var visible=S.fixtureTab==='played'?past:up;
    return fieldHeader('Fixtures','Schedule & Match Facts','<button class="icb" id="phoneAddFixture">+</button>')+
      '<div class="seg"><a href="#" data-fixture-tab="upcoming" class="'+(S.fixtureTab==='upcoming'?'on':'')+'">Upcoming</a><a href="#" data-fixture-tab="played" class="'+(S.fixtureTab==='played'?'on':'')+'">Played</a></div>'+
      '<div class="pkpi" style="margin-top:10px"><div class="kpi"><div class="k">Recorded</div><div class="v">'+coverage.recorded+' <small>of '+coverage.played+'</small></div></div><div class="kpi"><div class="k">Scout attendance</div><div class="v">'+attendance.length+'</div></div></div>'+
      '<div class="card" style="margin-top:10px"><div class="ck">Match Facts coverage</div><div style="height:10px;display:flex;margin-top:10px;background:var(--canvas2);overflow:hidden"><i style="width:'+recordedPct+'%;background:var(--green)"></i><i style="width:'+draftPct+'%;background:var(--blue)"></i><i style="width:'+missingPct+'%;background:var(--amber)"></i></div><div class="lgd" style="margin-top:8px"><span><i style="background:var(--green)"></i>Recorded '+coverage.recorded+'</span><span><i style="background:var(--blue)"></i>Draft '+coverage.drafts+'</span><span><i style="background:var(--amber)"></i>Missing '+coverage.missing+'</span></div></div>'+
      (S.fixtureTab==='upcoming'&&missing?'<div class="pcap">Needs recording</div><div class="card" style="border-left:3px solid var(--amber)!important"><div class="rowline"><span class="dateplate"><b>'+new Date(missing.fixture_date+'T12:00:00').getDate()+'</b><span>'+new Date(missing.fixture_date+'T12:00:00').toLocaleDateString('en-GB',{month:'short'})+'</span></span><span class="who"><b>vs '+esc(missing.opponent)+'</b><span>'+esc(fmtDate(missing.fixture_date)+' · Match Facts missing')+'</span></span><a class="bt sm spend" href="'+esc(clean('/coach/match-facts?fixtureId='+missing.id))+'">Record</a></div></div>':'')+
      '<div class="pcap">'+(S.fixtureTab==='played'?'Recently played':'Upcoming')+' <span>'+visible.length+'</span></div><div class="stack">'+(visible.length?visible.map(function(f){var fact=factsForFixture(f.id)[0],a=attendanceFor(f.id).length;return'<div class="card"><div class="rowline" style="border-bottom:0"><span class="dateplate '+(fact?'g':'')+'"><b>'+new Date(f.fixture_date+'T12:00:00').getDate()+'</b><span>'+new Date(f.fixture_date+'T12:00:00').toLocaleDateString('en-GB',{month:'short'})+'</span></span><span class="who"><b>vs '+esc(f.opponent)+'</b><span>'+esc((f.fixture_time||'').slice(0,5)+' · '+(f.home_or_away||'')+' · '+(f.format||''))+'</span></span></div><div class="flex" style="margin-top:8px"><span class="tag '+(a?'g':'')+'">'+a+' scouts</span><span class="tag '+(fact?'g':'a')+'">'+(fact?'Match Facts recorded':(isFuture(f)?'Match Facts upcoming':'Needs recording'))+'</span><span class="right"></span><button class="bt sm" data-fixture-open="'+esc(f.id)+'">View</button><a class="bt sm '+(isFuture(f)?'spend':'')+'" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id+(isFuture(f)?'&mode=matchday':'')))+'">'+(isFuture(f)?'Matchday mode':(fact?'Open facts':'Record'))+'</a></div></div>';}).join(''):'<div class="card"><div class="mut">No fixtures in this view.</div></div>')+'</div>';
  }
  function fixtureDrawer(id){
    var f=rows(S.overview||{},['fixtures']).find(function(x){return String(x.id)===String(id)});if(!f)return;
    var att=attendanceFor(f.id),facts=factsForFixture(f.id);
    window.CoachV2.openDrawer({title:'Fixture · vs '+f.opponent,html:'<div class="card"><div class="card-b"><div class="g" style="grid-template-columns:repeat(2,1fr)">'+metricMini('Date',fmtDate(f.fixture_date,f.fixture_time))+metricMini('Home / away',f.home_or_away||'—')+metricMini('Format',f.format||'—')+metricMini('Venue',f.venue||'—')+'</div></div></div><div class="card" style="margin-top:12px"><div class="card-h"><h3>Scout attendance</h3></div>'+(att.length?att.map(function(a){return'<div class="row"><span class="sp"><b class="rt">'+esc(scoutLabel(a.scout_id))+'</b><s class="rs">'+esc(a.status||'Attending')+'</s></span></div>';}).join(''):'<div class="card-b mut">No scout attendance yet.</div>')+'</div>',footer:'<button class="btn dgr" id="deleteFixture">Delete</button><button class="btn" id="editFixture">Edit</button><a class="btn p" href="'+esc(clean('/coach/match-facts?fixtureId='+f.id))+'">'+(facts.length?'View / amend Match Facts':'Record Match Facts')+'</a>'});
    setTimeout(function(){var ed=document.getElementById('editFixture');if(ed)ed.onclick=function(){window.CoachV2.closeAll();fixtureForm(f);};var del=document.getElementById('deleteFixture');if(del)del.onclick=function(){if(confirm('Delete this fixture?'))api('DELETE','/api/fixtures/'+encodeURIComponent(f.id)).then(function(){window.CoachV2.closeAll();loadFixtures();}).catch(function(e){alert(e.message);});};},0);
  }
  function fixtureForm(f){
    f=f||{};window.CoachV2.openDrawer({title:f.id?'Edit fixture':'Add fixture',html:'<form id="fixtureForm"><div class="field"><label>Opponent</label><input class="in" name="opponent" value="'+esc(f.opponent||'')+'" required></div><div class="two"><div class="field"><label>Date</label><input class="in" type="date" name="fixtureDate" value="'+esc(f.fixture_date||'')+'" required></div><div class="field"><label>Time</label><input class="in" type="time" name="fixtureTime" value="'+esc((f.fixture_time||'').slice(0,5))+'"></div></div><div class="two"><div class="field"><label>Home / away</label><select class="in" name="homeOrAway"><option'+((f.home_or_away||'Home')==='Home'?' selected':'')+'>Home</option><option'+(f.home_or_away==='Away'?' selected':'')+'>Away</option><option'+(f.home_or_away==='Neutral'?' selected':'')+'>Neutral</option></select></div><div class="field"><label>Format</label><select class="in" name="format">'+['5','7','9','11'].map(function(x){return'<option'+(String(f.format||'11').indexOf(x)===0?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div><div class="field"><label>Venue</label><input class="in" name="venue" value="'+esc(f.venue||'')+'"></div><div class="field"><label>Notes</label><textarea class="in ta" name="notes">'+esc(f.notes||'')+'</textarea></div><div id="fixtureMsg"></div><button class="btn p" type="submit">'+(f.id?'Save fixture':'Add fixture')+'</button></form>'});
    setTimeout(function(){var form=document.getElementById('fixtureForm');if(form)form.onsubmit=function(e){e.preventDefault();var fd=new FormData(form),body={};fd.forEach(function(v,k){body[k]=v});api(f.id?'PUT':'POST',f.id?'/api/fixtures/'+encodeURIComponent(f.id):'/api/fixtures',body).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Fixture saved.');loadFixtures();}).catch(function(err){document.getElementById('fixtureMsg').innerHTML=msg(err.message,true);});};},0);
  }
  function bindFixtures(){
    document.querySelectorAll('[data-fixture-open]').forEach(function(b){b.onclick=function(){if(window.innerWidth<=760){S.activeFixtureId=b.dataset.fixtureOpen;renderFixtures();window.scrollTo(0,0);}else fixtureDrawer(b.dataset.fixtureOpen);};});
    document.querySelectorAll('[data-fixture-tab]').forEach(function(b){b.onclick=function(e){e.preventDefault();S.fixtureTab=b.dataset.fixtureTab;renderFixtures();};});
    var back=document.getElementById('fixturePhoneBack');if(back)back.onclick=function(){S.activeFixtureId='';renderFixtures();};
    var edit=document.getElementById('phoneEditFixture');if(edit)edit.onclick=function(){var f=rows(S.overview||{},['fixtures']).find(function(x){return String(x.id)===String(S.activeFixtureId)});if(f)fixtureForm(f);};
    ['coachAddFixtureExact','phoneAddFixture'].forEach(function(id){var b=document.getElementById(id);if(b)b.onclick=function(){fixtureForm();};});
  }
  async function loadFixtures(){await loadOverview(true);renderFixtures();}
  function renderFixtures(){desk.innerHTML=fixturesDesk();field.innerHTML=fixturesPhone();bindFixtures();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function initFixtures(){
    setActions('Import CSV','#','Add fixture','#');
    try{await loadOverview();renderFixtures();setTimeout(function(){var acts=document.querySelectorAll('[data-coach-route-action]');acts.forEach(function(a){if(a.textContent==='Add fixture')a.onclick=function(e){e.preventDefault();fixtureForm();};if(a.textContent==='Import CSV')a.onclick=function(e){e.preventDefault();fixtureCsv();};});},0);}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}
  }
  function fixtureCsv(){window.CoachV2.openSheet({title:'Import fixture CSV',html:'<div class="callout"><b>Columns:</b> opponent, fixtureDate, fixtureTime, venue, homeOrAway, format, notes.</div><div class="field"><label>CSV file</label><input class="in" id="fixtureCsvFile" type="file" accept=".csv,text/csv"></div><div id="fixtureCsvMsg"></div>',footer:'<button class="btn p" id="fixtureCsvGo">Import CSV</button>'});setTimeout(function(){document.getElementById('fixtureCsvGo').onclick=function(){var file=document.getElementById('fixtureCsvFile').files[0];if(!file)return;file.text().then(function(text){var lines=text.trim().split(/\r?\n/),headers=lines.shift().split(',').map(function(x){return x.trim()});var rowsx=lines.map(function(line){var vals=line.split(',');var o={};headers.forEach(function(h,i){o[h]=vals[i]&&vals[i].trim()});return o;});return rowsx.reduce(function(p,r){return p.then(function(){return api('POST','/api/fixtures',r)});},Promise.resolve());}).then(function(){window.CoachV2.closeAll();loadFixtures();}).catch(function(e){document.getElementById('fixtureCsvMsg').innerHTML=msg(e.message,true);});};},0);}

  /* ================= Video Reels ================= */
  function pendingVideos(){return rows(S.overview||{},['videos']).filter(function(v){return safeStatus(v.moderation_status)==='pending'});}
  function approvedVideos(){return rows(S.overview||{},['videos']).filter(function(v){return safeStatus(v.moderation_status)==='approved'});}
  function playerById(id){return rows(S.overview||{},['players']).find(function(p){return String(p.id)===String(id)})||{};}
  function externalVideo(v){var u=String(v&&((v.signed_url||v.video_url||v.url))||'');return /^https?:\/\//i.test(u)&&!v.file_path;}
  function resolvedUploadUrl(d){d=d||{};if(d.uploadPath)return location.origin.replace(/\/$/,'')+d.uploadPath;return d.uploadUrl||d.cleanUploadUrl||d.url||'';}
  function videoDesk(){
    var pending=pendingVideos(),players=rows(S.overview||{},['players']),approved=approvedVideos(),withVid=players.filter(function(p){return approved.some(function(v){return String(v.player_id)===String(p.id)})}),without=players.filter(function(p){return !approved.some(function(v){return String(v.player_id)===String(p.id)})});
    return'<div class="g" style="grid-template-columns:minmax(0,1fr) 320px"><div class="g"><div class="card"><div class="card-h"><h3>Pending review</h3><div class="sp"></div><span class="hint">'+pending.length+' waiting</span></div>'+(pending.length?pending.map(function(v){var p=playerById(v.player_id);return'<div class="row"><span class="icn a">▶</span><span class="sp"><b class="rt">'+esc(v.title||'Video')+'</b><s class="rs">'+esc(name(p)+' · '+(v.category||v.video_type||'Highlight')+' · '+fmtDate(v.created_at)+(v.fixture_id?' · linked fixture':''))+'</s></span><button class="btn sm" data-video-preview="'+esc(v.id)+'">Preview</button><button class="btn dgr sm" data-video-moderate="'+esc(v.id)+'" data-decision="rejected">Reject</button><button class="btn p sm" data-video-moderate="'+esc(v.id)+'" data-decision="approved">Approve</button></div>';}).join(''):'<div class="card-b mut">No videos are waiting for review.</div>')+'</div>'+
      '<div class="card"><div class="card-h"><h3>Player coverage</h3><div class="sp"></div><span class="hint">'+withVid.length+' of '+players.length+' with approved video</span></div>'+players.slice(0,12).map(function(p){var vids=approved.filter(function(v){return String(v.player_id)===String(p.id)});return'<div class="row"><span class="sp"><b class="rt">'+esc(name(p))+'</b><s class="rs">'+esc(position(p)+' · '+(p.age_group||'—'))+'</s></span><span class="tag '+(vids.length?'g':'a')+'">'+(vids.length?vids.length+' approved':'No approved video')+'</span><a class="btn sm" href="'+esc(clean('/player/profile?id='+p.id))+'">Manage</a></div>';}).join('')+'</div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Coverage</h3></div><div class="card-b"><div class="num" style="font-size:34px;font-weight:700">'+(players.length?Math.round(withVid.length/players.length*100):0)+'%</div><div class="meter"><span class="bar"><i style="width:'+(players.length?withVid.length/players.length*100:0)+'%"></i></span></div><div class="mut" style="margin-top:8px">'+without.length+' players still need approved video evidence.</div></div></div>'+
      '<div class="card"><div class="card-h"><h3>Upload a video</h3></div><div class="card-b"><button class="btn p" id="uploadCoachVideo">Upload</button></div></div>'+
      '<div class="card"><div class="card-h"><h3>Safeguarded upload links</h3></div><div class="card-b"><div class="mut" style="line-height:1.7;margin-bottom:10px">Generate a token-protected link for a parent or trusted adult. The upload enters this review queue and stays hidden from scouts until approved.</div><button class="btn" id="generatePlayerLink">Generate upload link</button></div></div></div></div>';
  }
  function videoPhone(){
    var pending=pendingVideos(),players=rows(S.overview||{},['players']),approved=approvedVideos(),withVid=players.filter(function(p){return approved.some(function(v){return String(v.player_id)===String(p.id)})}),without=players.filter(function(p){return !approved.some(function(v){return String(v.player_id)===String(p.id)})}),coverage=players.length?Math.round(withVid.length/players.length*100):0;
    return fieldHeader('Video Reels',pending.length+' pending review','<button class="icb" id="phoneUploadVideo">+</button>')+
      '<div class="pkpi"><div class="kpi"><div class="k">With video</div><div class="v">'+withVid.length+' <small>of '+players.length+'</small></div></div><div class="kpi"><div class="k">Pending</div><div class="v">'+pending.length+'</div></div></div>'+
      '<div class="card" style="margin-top:10px"><div class="flex"><div><div class="ck">Approved video coverage</div><div class="fitn">'+coverage+'%</div></div><div class="right" style="width:74px;height:74px;border-radius:50%;background:conic-gradient(var(--blue) '+coverage+'%,var(--canvas2) 0);display:grid;place-items:center"><span style="width:54px;height:54px;background:var(--paper);border-radius:50%;display:grid;place-items:center;font-weight:700">'+coverage+'%</span></div></div><div class="mut">'+without.length+' players still need approved video evidence.</div></div>'+
      '<div class="pcap">Pending review <span>'+pending.length+'</span></div><div class="stack">'+(pending.length?pending.map(function(v){var p=playerById(v.player_id);return'<div class="card"><div class="rowline" style="border-bottom:0"><span class="icn a">▶</span><span class="who"><b>'+esc(v.title||'Video')+'</b><span>'+esc(name(p)+' · '+(v.category||v.video_type||'Highlight')+' · '+fmtDate(v.created_at))+'</span></span></div><div class="flex" style="margin-top:8px"><button class="bt sm" data-video-preview="'+esc(v.id)+'">Preview</button><button class="bt sm dgr" data-video-moderate="'+esc(v.id)+'" data-decision="rejected">Reject</button><button class="bt sm spend right" data-video-moderate="'+esc(v.id)+'" data-decision="approved">Approve</button></div></div>';}).join(''):'<div class="card"><div class="mut">No videos are waiting for review.</div></div>')+'</div>'+
      '<div class="pcap">No approved video <span>'+without.length+'</span></div><div class="card">'+without.slice(0,10).map(function(p){return'<div class="rowline"><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(position(p)+' · '+(p.age_group||''))+'</span></span><button class="bt sm" data-generate-link-player="'+esc(p.id)+'">Generate link</button></div>';}).join('')+(without.length?'':'<div class="mut">Every player has approved video.</div>')+'</div>'+
      '<button class="bt spend blk" id="phoneGenerateLink" style="margin-top:10px">Generate upload links</button>';
  }
  function videoById(id){return rows(S.overview||{},['videos']).find(function(v){return String(v.id)===String(id)});}
  function reviewVideo(id){
    var v=videoById(id);if(!v)return;var url=v.signed_url||v.video_url||v.url||'',isExternal=externalVideo(v);
    window.CoachV2.openDrawer({title:'Review video',html:'<div class="card"><div class="card-b"><b>'+esc(v.title||'Video')+'</b><div class="mut">'+esc(name(playerById(v.player_id))+' · '+(v.category||v.video_type||'Highlight'))+'</div>'+
      (url?(isExternal?'<a class="btn p" style="margin-top:12px" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open external video</a><div class="mut" style="margin-top:8px">This link opens on the provider website. Access still follows that provider sharing permissions.</div>':'<video controls style="width:100%;margin-top:10px" src="'+esc(url)+'"></video>'):'<div class="mut" style="margin-top:12px">Preview is not available.</div>')+
      '</div></div>',footer:'<button class="btn dgr" data-video-moderate="'+esc(v.id)+'" data-decision="rejected">Reject</button><button class="btn p" data-video-moderate="'+esc(v.id)+'" data-decision="approved">Approve</button>'});setTimeout(bindVideos,0);
  }
  function moderateVideo(id,decision){api('PATCH','/api/videos/'+encodeURIComponent(id)+'/moderation',{status:decision}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video '+decision+'.');loadVideos();}).catch(function(e){window.CoachV2.showToast(e.message,true);});}
  function uploadVideo(){
    var players=rows(S.overview||{},['players']),fixtures=rows(S.overview||{},['fixtures']);
    window.CoachV2.openDrawer({title:'Add player video',html:'<form id="coachVideoForm"><div class="field"><label>Player</label><select class="in" name="playerId">'+players.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><div class="field"><label>Fixture link · optional</label><select class="in" name="fixtureId"><option value="">No linked fixture</option>'+fixtures.map(function(f){return'<option value="'+esc(f.id)+'">vs '+esc(f.opponent)+' · '+esc(fmtDate(f.fixture_date))+'</option>';}).join('')+'</select></div><div class="field"><label>Title</label><input class="in" name="title" required></div><div class="field"><label>Category</label><select class="in" name="category"><option>Highlight</option><option>Match</option><option>Training</option><option>Skills</option></select></div>'+
      '<div class="pseg video-source-tabs"><u class="on" data-video-source="file">Upload file</u><u data-video-source="link">Paste video link</u></div>'+
      '<div data-video-source-panel="file" class="field" style="margin-top:12px"><label>Video file</label><input class="in" type="file" name="file" accept="video/*"></div>'+
      '<div data-video-source-panel="link" hidden style="margin-top:12px"><div class="field"><label>Video URL</label><input class="in" type="url" name="videoUrl" placeholder="https://youtube.com/…"></div><div class="help">YouTube, Google Drive, Dropbox, Veo and other HTTPS share links are accepted. The viewer must still have permission on the provider.</div></div>'+
      '<div id="coachVideoMsg"></div><button class="btn p" type="submit">Add video</button></form>'});
    setTimeout(function(){
      var mode='file',f=document.getElementById('coachVideoForm');if(!f)return;
      document.querySelectorAll('[data-video-source]').forEach(function(tab){tab.onclick=function(){mode=tab.dataset.videoSource;document.querySelectorAll('[data-video-source]').forEach(function(x){x.classList.toggle('on',x===tab)});document.querySelectorAll('[data-video-source-panel]').forEach(function(x){x.hidden=x.dataset.videoSourcePanel!==mode;});};});
      f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f),playerId=fd.get('playerId'),title=fd.get('title'),category=fd.get('category'),fixtureId=fd.get('fixtureId')||null;
        if(mode==='link'){var url=String(fd.get('videoUrl')||'').trim();if(!url)return document.getElementById('coachVideoMsg').innerHTML=msg('Paste a video URL first.',true);api('POST','/api/videos/link',{playerId:playerId,title:title,category:category,fixtureId:fixtureId,videoUrl:url}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video link added.');loadVideos();}).catch(function(e2){document.getElementById('coachVideoMsg').innerHTML=msg(e2.message,true);});return;}
        var file=fd.get('file');if(!file||!file.size)return document.getElementById('coachVideoMsg').innerHTML=msg('Choose a video file first.',true);var body=new FormData();['playerId','fixtureId','title','category'].forEach(function(k){body.append(k,fd.get(k)||'')});body.append('file',file);fetch((window.API||'')+'/api/videos/upload',{method:'POST',headers:{Authorization:'Bearer '+((window.Auth&&window.Auth.token)||'')},body:body}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Upload failed');return d})}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video uploaded for review.');loadVideos();}).catch(function(e2){document.getElementById('coachVideoMsg').innerHTML=msg(e2.message,true);});
      };
    },0);
  }
  function generateLinkFor(playerId){
    var p=playerById(playerId);
    window.CoachV2.openSheet({title:'Safeguarded upload link',html:'<div class="callout"><b>Uploads wait for coach approval.</b> They are never shown to scouts automatically.</div><div class="field"><label>Player</label><div class="in">'+esc(name(p))+'</div></div><div id="linkResult"><div class="mut">Generating secure link…</div></div>'});
    api('POST','/api/videos/upload-link',{playerId:playerId}).then(function(r){var d=r.data||r,url=resolvedUploadUrl(d);document.getElementById('linkResult').innerHTML='<div class="linkbox">'+esc(url||'')+'</div><button class="btn sm" id="copyLink">Copy link</button>';document.getElementById('copyLink').onclick=function(){navigator.clipboard.writeText(url);window.CoachV2.showToast('Link copied.');};}).catch(function(e){document.getElementById('linkResult').innerHTML=msg(e.message,true);});
  }
  function generateLink(){
    var players=rows(S.overview||{},['players']);
    window.CoachV2.openSheet({title:'Safeguarded upload link',html:'<div class="callout"><b>Uploads wait for coach approval.</b> They are never shown to scouts automatically.</div><div class="field"><label>Player</label><select class="in" id="linkPlayer">'+players.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><div id="linkResult"></div>',footer:'<button class="btn p" id="makeLink">Generate link</button>'});setTimeout(function(){document.getElementById('makeLink').onclick=function(){api('POST','/api/videos/upload-link',{playerId:document.getElementById('linkPlayer').value}).then(function(r){var d=r.data||r,url=resolvedUploadUrl(d);document.getElementById('linkResult').innerHTML='<div class="linkbox">'+esc(url||'')+'</div><button class="btn sm" id="copyLink">Copy</button>';document.getElementById('copyLink').onclick=function(){navigator.clipboard.writeText(url);window.CoachV2.showToast('Link copied.');};}).catch(function(e){document.getElementById('linkResult').innerHTML=msg(e.message,true);});};},0);
  }
  function bindVideos(){
    document.querySelectorAll('[data-video-preview]').forEach(function(b){b.onclick=function(){reviewVideo(b.dataset.videoPreview)};});
    document.querySelectorAll('[data-video-moderate]').forEach(function(b){b.onclick=function(){moderateVideo(b.dataset.videoModerate,b.dataset.decision)};});
    document.querySelectorAll('[data-generate-link-player]').forEach(function(b){b.onclick=function(){generateLinkFor(b.dataset.generateLinkPlayer)};});
    ['uploadCoachVideo','phoneUploadVideo'].forEach(function(id){var b=document.getElementById(id);if(b)b.onclick=uploadVideo;});
    ['generatePlayerLink','phoneGenerateLink'].forEach(function(id){var b=document.getElementById(id);if(b)b.onclick=generateLink;});
  }
  async function loadVideos(){await loadOverview(true);renderVideos();}
  function renderVideos(){desk.innerHTML=videoDesk();field.innerHTML=videoPhone();bindVideos();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function initVideos(){setActions(null,null,'Upload video','#');try{await loadOverview();renderVideos();setTimeout(function(){document.querySelectorAll('[data-coach-route-action]').forEach(function(a){a.onclick=function(e){e.preventDefault();uploadVideo();};});},0);}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}}

  /* ================= Chat ================= */
  function threadId(t){return t.id||t.thread_id||t.threadId;}
  function threadScout(t){return t.scout_name||t.scoutName||scoutLabel(t.scout_id)||'Reviewed scout';}
  function threadPlayer(t){var p=playerById(t.player_id||t.playerId);return p.id?name(p):(t.player_name||'Player');}
  function threadList(){
    var list=S.threads.slice();
    if(S.chatFilter==='unread')list=list.filter(function(t){return n(t.unread_count||t.unreadCount,0)>0;});
    if(!list.length)return'<div class="card-b mut">No conversations in this view.</div>';
    return list.map(function(t){var active=String(threadId(t))===String(S.activeThread),unread=n(t.unread_count||t.unreadCount,0);return'<button class="thr '+(active?'on':'')+'" data-chat-thread="'+esc(threadId(t))+'"><span class="av">'+esc(initials(threadScout(t)))+'</span><span class="sp"><b>'+esc(threadScout(t))+'</b><span class="re">'+esc(threadPlayer(t))+'</span><span class="pv">'+esc(t.last_message||t.preview||'Open conversation')+'</span></span><span class="tm">'+esc(daysAgo(t.last_message_at||t.created_at))+(unread?'<u>'+unread+'</u>':'')+'</span></button>';}).join('');
  }
  function activeThread(){return S.threads.find(function(t){return String(threadId(t))===String(S.activeThread)})||null;}
  function chatDesk(){
    var t=activeThread(),p=t&&playerById(t.player_id||t.playerId),unread=S.threads.filter(function(x){return n(x.unread_count||x.unreadCount,0)>0}).length;
    return'<div class="chat-desk-shell"><aside class="chat-desk-list"><div class="card-h"><h3>Conversations</h3><div class="sp"></div><span class="hint">'+unread+' unread</span></div>'+
      '<div class="chat-list-tools"><input class="inp" id="chatThreadSearch" placeholder="Search scouts, clubs or players"><div class="chips"><button class="chip '+(S.chatFilter==='all'?'on':'')+'" data-chat-filter="all">All</button><button class="chip '+(S.chatFilter==='unread'?'on':'')+'" data-chat-filter="unread">Unread</button><button class="chip '+(S.chatFilter==='player'?'on':'')+'" data-chat-filter="player">By player</button></div></div>'+
      '<div id="chatThreadList">'+threadList()+'</div></aside><section class="chat-desk-canvas">'+
      (t?'<header class="chat-context"><div><b>'+esc(threadScout(t))+'</b><span>Regarding '+esc((p&&p.id?name(p):threadPlayer(t))+(p&&p.id?' · '+position(p)+' · '+(p.age_group||''):'') )+'</span></div><div class="sp"></div>'+(p&&p.id?'<a class="btn sm" href="'+esc(clean('/player/profile?id='+p.id))+'">View player</a>':'')+'<button class="btn sm" id="shareProfile">Share profile</button><a class="btn dgr sm" href="'+esc(clean('/coach/report-a-concern'))+'">Report concern</a></header>'+
      '<div id="chatMessages" class="chat-message-canvas">'+renderMessages()+'</div>'+
      '<form class="chat-compose" id="chatCompose"><textarea class="inp" id="chatMessage" placeholder="Write a reply"></textarea><div class="chat-compose-actions"><span class="mut">Only approved items can be shared</span><div class="sp"></div><button class="btn sm" type="button">Share profile</button><button class="btn p" type="submit">Send</button></div></form>':'<div class="chat-empty mut">Choose a conversation.</div>')+
      '</section></div>';
  }
  function renderMessages(){
    return(S.messages||[]).map(function(m){var mine=String(m.sender_type||'').toLowerCase()==='coach'||String(m.sender_id||'')===String(window.Auth&&window.Auth.user&&window.Auth.user.id);return'<div class="msg '+(mine?'out':'in')+'" style="margin-bottom:10px">'+esc(m.body||m.message||'')+'<div class="mt">'+esc(fmtDate(m.created_at))+'</div></div>';}).join('')||'<div class="mut">No messages yet.</div>';
  }
  function chatPhone(){
    var t=activeThread(),unread=S.threads.filter(function(x){return n(x.unread_count||x.unreadCount,0)>0}).length;
    if(!t)return fieldHeader('Chat',unread+' unread')+
      '<div class="field"><input class="in" id="chatThreadSearch" placeholder="Search scouts, clubs or players"></div>'+
      '<div class="pseg" style="margin-bottom:10px"><u class="'+(S.chatFilter==='all'?'on':'')+'" data-chat-filter="all">All</u><u class="'+(S.chatFilter==='unread'?'on':'')+'" data-chat-filter="unread">Unread</u><u class="'+(S.chatFilter==='player'?'on':'')+'" data-chat-filter="player">By player</u></div>'+
      '<div class="card chat-phone-list" id="chatThreadList">'+threadList()+'</div>';
    return fieldHeader(threadScout(t),threadPlayer(t),'<button class="ic" aria-label="Conversation actions">⋯</button>','<button class="bk" id="backThreads">‹</button>')+
      '<div class="chat-phone-context"><span class="avm">'+esc(initials(threadScout(t)))+'</span><div><b>'+esc(threadScout(t))+'</b><span>Regarding '+esc(threadPlayer(t))+'</span></div></div>'+
      '<div class="chat-phone-messages">'+renderMessages()+'</div>'+
      '<form class="chat-phone-compose" id="fieldChatCompose"><textarea class="inp" id="fieldChatMessage" placeholder="Write a reply"></textarea><button class="bt spend" type="submit">Send</button></form>'+
      '<a class="chat-report-link" href="'+esc(clean('/coach/report-a-concern'))+'">Report a concern about this conversation</a>';
  }
  async function loadThread(id){S.activeThread=id;var r=await api('GET','/api/chat/threads/'+encodeURIComponent(id)+'/messages');S.messages=rows(r,['messages','data']);renderChat();}
  async function sendChat(text){var body=String(text||'').trim();if(!body||!S.activeThread)return;await api('POST','/api/chat/threads/'+encodeURIComponent(S.activeThread)+'/messages',{body:body});await loadThread(S.activeThread);}
  function bindChat(){
    document.querySelectorAll('[data-chat-thread]').forEach(function(b){b.onclick=function(){S.activeThread=b.dataset.chatThread;loadThread(S.activeThread);};});
    document.querySelectorAll('[data-chat-filter]').forEach(function(b){b.onclick=function(e){e.preventDefault();S.chatFilter=b.dataset.chatFilter||'all';renderChat();};});
    var search=document.getElementById('chatThreadSearch');if(search)search.oninput=function(){var q=search.value.trim().toLowerCase();document.querySelectorAll('#chatThreadList .thr').forEach(function(x){x.style.display=!q||x.textContent.toLowerCase().indexOf(q)>=0?'':'none';});};
    var f=document.getElementById('chatCompose');if(f)f.onsubmit=function(e){e.preventDefault();var t=document.getElementById('chatMessage');sendChat(t.value).then(function(){t.value='';});};
    var ff=document.getElementById('fieldChatCompose');if(ff)ff.onsubmit=function(e){e.preventDefault();var t=document.getElementById('fieldChatMessage');sendChat(t.value).then(function(){t.value='';});};
    var back=document.getElementById('backThreads');if(back)back.onclick=function(){S.activeThread='';S.messages=[];renderChat();};
  }
  function renderChat(){desk.innerHTML=chatDesk();field.innerHTML=chatPhone();bindChat();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function initChat(){try{await loadOverview();var r=await api('GET','/api/chat/threads');S.threads=rows(r,['threads','data']).filter(function(t){return t.player_id||t.playerId||t.player});var req=new URLSearchParams(location.search).get('threadId');var id=req||threadId(S.threads[0]);if(id)await loadThread(id);else renderChat();}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}}

  /* ================= Notifications ================= */
  function notifGroup(x){
    var t=String((x.notification_type||x.type||'')+' '+(x.title||'')+' '+(x.body||'')).toLowerCase();
    if(/scout|interest|recruit|attendance/.test(t))return'Scout activity';
    if(/message|chat|reply/.test(t))return'Messages';
    if(/match.?facts|rating|observation/.test(t))return'Match Facts';
    if(/video|upload/.test(t))return'Video';
    if(/fixture|matchday/.test(t))return'Fixtures';
    return'Account and system';
  }
  function notifHref(x){
    var d=x.data||{},pid=d.playerId||d.player_id,fixture=d.fixtureId||d.fixture_id,thread=d.threadId||d.thread_id;
    var g=notifGroup(x);if(thread)return'/coach/chat?threadId='+thread;if(pid)return'/player/profile?id='+pid;if(fixture)return'/coach/fixtures?fixtureId='+fixture;if(g==='Messages')return'/coach/chat';if(g==='Match Facts')return'/coach/match-facts';if(g==='Video')return'/coach/video-reels';if(g==='Fixtures')return'/coach/fixtures';return'/coach/settings';
  }
  function notifDesk(){
    var notes=rows(S.overview||{},['notifications']),groups=['Scout activity','Messages','Match Facts','Video','Fixtures','Account and system'];
    return'<div class="g">'+groups.map(function(g){var listn=notes.filter(function(x){return notifGroup(x)===g});return'<div class="card"><div class="card-h"><h3>'+g+'</h3><div class="sp"></div><span class="hint">'+listn.length+'</span></div>'+(listn.length?listn.map(function(x){return'<a class="row '+(!bool(x.is_read)?'zz':'')+'" data-notif-id="'+esc(x.id)+'" href="'+esc(clean(notifHref(x)))+'"><span class="icn '+(g==='Scout activity'?'g':g==='Video'?'a':'b')+'">●</span><span class="sp"><b class="rt">'+esc(x.title||g)+'</b><s class="rs">'+esc(x.body||'')+'</s></span><span class="mut">'+esc(daysAgo(x.created_at))+'</span><span class="btn sm">'+esc(g==='Messages'?'Reply':g==='Video'?'Review video':'View')+'</span></a>';}).join(''):'<div class="card-b mut">No notifications in this group.</div>')+'</div>';}).join('')+'</div>';
  }
  function notifPhone(){
    var notes=rows(S.overview||{},['notifications']);
    return fieldHeader('Notifications',notes.filter(function(x){return!bool(x.is_read)}).length+' unread','<button class="icb" id="fieldMarkAll">✓</button>')+['Scout activity','Messages','Match Facts','Video','Fixtures','Account and system'].map(function(g){var listn=notes.filter(function(x){return notifGroup(x)===g});return listn.length?'<div class="pcap">'+g+' <span>'+listn.length+'</span></div><div class="card">'+listn.map(function(x){return'<a class="rowline" data-notif-id="'+esc(x.id)+'" href="'+esc(clean(notifHref(x)))+'"><span class="icn '+(g==='Scout activity'?'g':g==='Video'?'a':'b')+'">●</span><span class="who"><b>'+esc(x.title||g)+'</b><span>'+esc(x.body||'')+'</span></span><span>›</span></a>';}).join('')+'</div>':'';}).join('');
  }
  function bindNotifs(){
    document.querySelectorAll('[data-notif-id]').forEach(function(a){a.addEventListener('click',function(){api('PATCH','/api/notifications/'+encodeURIComponent(a.dataset.notifId)+'/read',{}).catch(function(){});});});
    function mark(){api('PATCH','/api/notifications/mark-all-read',{}).then(loadNotifications).catch(function(e){alert(e.message)});}
    var f=document.getElementById('fieldMarkAll');if(f)f.onclick=mark;
    document.querySelectorAll('[data-coach-route-action]').forEach(function(a){if(a.textContent==='Mark all read')a.onclick=function(e){e.preventDefault();mark();};});
  }
  function renderNotifications(){desk.innerHTML=notifDesk();field.innerHTML=notifPhone();bindNotifs();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function loadNotifications(){await loadOverview(true);renderNotifications();if(window.CoachV2)window.CoachV2.refreshBadges();}
  async function initNotifications(){setActions('Mark all read','#',null,null);try{await loadOverview();renderNotifications();}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}}

  /* ================= Settings ================= */
  function settingsTabs(){
    return'<div class="settings-tabs" style="display:flex;border-bottom:1px solid var(--line);background:var(--paper);margin-bottom:14px">'+[
      ['team','Team'],['coaches','Coaches & permissions'],['notifications','Notifications'],['privacy','Privacy & safeguarding'],['season','Season'],['account','Account']
    ].map(function(x){return'<button class="'+(S.settingsPane===x[0]?'on':'')+'" data-settings-pane="'+x[0]+'" style="padding:11px 14px;border:0;border-bottom:2px solid '+(S.settingsPane===x[0]?'var(--blue)':'transparent')+';background:transparent;color:'+(S.settingsPane===x[0]?'var(--blue)':'var(--ink3)')+';font-weight:'+(S.settingsPane===x[0]?'700':'500')+'">'+x[1]+'</button>';}).join('')+'</div>';
  }
  function teamSettings(){
    var c=S.overview.coach||{};
    return'<div class="g" style="grid-template-columns:minmax(0,1fr) 320px"><div class="card"><div class="card-h"><h3>Team</h3></div><form class="card-b" id="teamSettingsForm"><div class="two"><div class="field"><label>Team name</label><input class="in" name="teamName" value="'+esc(c.team_name||'')+'"></div><div class="field"><label>Age groups</label><input class="in" name="teamAgeGroups" placeholder="U14, U15, U16" value="'+esc((c.team_age_groups||[]).join?c.team_age_groups.join(', '):(c.team_age_groups||''))+'"></div><div class="field"><label>League</label><input class="in" name="teamLeague" value="'+esc(c.team_league||'')+'"></div><div class="field"><label>County FA</label><input class="in" name="teamCounty" value="'+esc(c.team_county||'')+'"></div><div class="field"><label>Home venue</label><input class="in" name="teamHomeVenue" value="'+esc(c.team_home_venue||'')+'"></div><div class="field"><label>Team website <i>Optional</i></label><input class="in" name="teamWebsite" value="'+esc(c.team_website||'')+'"></div></div><div class="field"><label>Team contact email</label><input class="in" type="email" name="teamContactEmail" value="'+esc(c.team_contact_email||c.email||'')+'"></div><div class="foot" style="margin:0 -16px -16px"><div class="sp"></div><button class="btn" type="reset">Discard</button><button class="btn p" type="submit">Save team</button></div></form></div><div class="card"><div class="card-h"><h3>Where this appears</h3></div><div class="card-b mut" style="line-height:1.8">Team name, age group and league appear on player profiles a scout can see. Venue is used on fixtures and scout attendance. Contact details are limited to appropriate verified-scout workflows.</div></div></div>';
  }
  function coachesSettings(){
    var counts=assignedCounts();
    return'<div class="g"><div class="card"><div class="card-h"><h3>Coaches</h3><div class="sp"></div><span class="hint">'+S.coaches.filter(function(c){return c.registration_complete!==false}).length+' active</span></div><table><thead><tr><th>Coach</th><th>Role</th><th class="r">Assigned players</th><th>Status</th><th></th></tr></thead><tbody>'+S.coaches.map(function(c){return'<tr><td><div class="who"><span class="av">'+esc(initials([c.first_name,c.last_name].join(' ')))+'</span><span><b>'+esc([c.first_name,c.last_name].filter(Boolean).join(' '))+'</b><s>'+esc(c.email||'')+'</s></span></div></td><td>'+esc((c.role_at_club||'Coach')+(c.is_super_user?' · Super User':''))+'</td><td class="r">'+(counts[c.id]||0)+'</td><td><span class="tag '+(c.registration_complete===false?'a':'g')+'">'+(c.registration_complete===false?'Invitation pending':'Active')+'</span></td><td><button class="btn sm" data-manage-coach="'+esc(c.id)+'">'+(c.registration_complete===false?'Resend':'Manage')+'</button></td></tr>';}).join('')+'</tbody></table><div class="foot"><button class="btn p" id="inviteCoach">Invite coach</button><span class="mut">Invitations expire after 7 days under the current API.</span></div></div>'+
      '<div class="g" style="grid-template-columns:1fr 1fr"><div class="card"><div class="card-h"><h3>Permissions</h3></div><table><thead><tr><th>Capability</th><th>Head Coach</th><th>Assistant</th></tr></thead><tbody>'+[
        ['View all squad players','✓','✓'],['Edit assigned players','✓','✓'],['Edit any player','✓','—'],['Record Match Facts','✓','✓'],['Approve videos','✓','✓'],['Reply to scouts','✓','✓'],['Assign players to coaches','✓','—'],['Invite coaches','✓','—']
      ].map(function(x){return'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>';}).join('')+'</tbody></table></div><div class="card"><div class="card-h"><h3>Reassign players</h3><div class="sp"></div><span class="hint">'+rows(S.overview,['players']).length+' players</span></div><div class="card-b">'+S.coaches.map(function(c){var count=counts[c.id]||0;return'<div class="at"><div class="an">'+esc(c.first_name||'Coach')+'</div><div class="track"><u style="width:'+(rows(S.overview,['players']).length?count/rows(S.overview,['players']).length*100:0)+'%"></u></div><div class="atv">'+count+'</div></div>';}).join('')+'<div class="callout" style="margin-top:12px">Reassign players before deactivating a coach so every player keeps a responsible adult.</div><button class="btn" id="reassignPlayers" style="margin-top:10px">Reassign players</button></div></div></div></div>';
  }
  function defaultPrefs(){
    return{
      scout_interest:{in_app:true,email:true,urgent_only:false},
      scout_message:{in_app:true,email:true,urgent_only:false},
      fixture_attendance:{in_app:true,email:true,urgent_only:false},
      match_facts_reminder:{in_app:true,email:false,urgent_only:false},
      video_upload:{in_app:true,email:true,urgent_only:false},
      safeguarding:{in_app:true,email:true,always_on:true},
      product_updates:{in_app:true,email:false,urgent_only:false},
      account_system:{in_app:true,email:true,always_on:true}
    };
  }
  function notifSettings(){
    var p=S.prefs||defaultPrefs(),defs=[
      ['scout_interest','Scout registers interest','In a player assigned to you'],
      ['scout_message','New message from a scout',''],
      ['fixture_attendance','Scout confirms fixture attendance',''],
      ['match_facts_reminder','Match Facts reminder','Sent the evening after an unrecorded fixture'],
      ['video_upload','Player video upload',''],
      ['safeguarding','Safeguarding and trust updates','Always on'],
      ['product_updates','ScoutLink product updates','']
    ];
    return'<div class="g" style="grid-template-columns:minmax(0,1fr) 336px"><div class="card"><div class="card-h"><h3>Notification preferences</h3><div class="sp"></div><span class="hint">Per event, per channel</span></div><table><thead><tr><th>Event</th><th class="c">In app</th><th class="c">Email</th><th class="c">Urgent only</th></tr></thead><tbody>'+defs.map(function(x){var v=p[x[0]]||{},locked=x[0]==='safeguarding';return'<tr><td><b>'+esc(x[1])+'</b>'+(x[2]?'<s class="mut" style="display:block;font-size:11px">'+esc(x[2])+'</s>':'')+'</td><td class="c"><input type="checkbox" data-pref-event="'+x[0]+'" data-pref-channel="in_app" '+((locked||v.in_app!==false)?'checked':'')+' '+(locked?'disabled':'')+'></td><td class="c"><input type="checkbox" data-pref-event="'+x[0]+'" data-pref-channel="email" '+((locked||v.email===true)?'checked':'')+' '+(locked?'disabled':'')+'></td><td class="c">'+(locked?'<span class="mut" style="font-size:11px">Always on</span>':'<input type="radio" data-pref-event="'+x[0]+'" data-pref-channel="urgent_only" '+(v.urgent_only?'checked':'')+'>')+'</td></tr>';}).join('')+'</tbody></table><div class="foot"><span class="mut">Saved to your coach profile, not to this browser</span><div class="sp"></div><button class="btn p" id="savePrefs">Save preferences</button></div></div><div class="card"><div class="card-h"><h3>What changes here</h3></div><div class="card-b"><div class="mut" style="line-height:1.8">These choices persist against the coach record so they follow the coach to a new device.</div><hr class="sep"><div class="lbl">Cannot be disabled</div><div class="mut" style="font-size:11.5px;margin-top:6px">Safeguarding and trust notifications, and anything Stratex must tell you about your account.</div></div></div></div>';
  }
  function privacySettings(){
    return'<div class="card settings-clean-card"><div class="card-h"><h3>Privacy & safeguarding</h3></div><div class="card-b"><div class="callout"><b>Coach boundary.</b> Scout reports, recruitment scores, private notes and decision rationale are never exposed in the Coach product.</div>'+
      '<div class="settings-clean-row"><div><b>What verified scouts can see</b><span>Player profiles, approved videos and published fixtures</span></div><strong>Approved content only</strong></div>'+
      '<div class="settings-clean-row"><div><b>Player safeguarding information</b><span>Private details stay restricted to authorised roles</span></div><strong>Restricted</strong></div>'+
      '<div class="settings-clean-row"><div><b>Contact permissions</b><span>Coach contact is available only through verified ScoutLink workflows</span></div><strong>Verified scouts</strong></div>'+
      '<div class="settings-clean-row"><div><b>Safeguarding notifications</b><span>Trust and safety messages cannot be disabled</span></div><strong>Always on</strong></div>'+
      '<div class="settings-clean-actions"><a class="btn dgr" href="'+esc(clean('/coach/report-a-concern'))+'">Report a concern</a></div></div></div>';
  }
  function seasonSettings(){
    var year=new Date().getFullYear(),season=year+'/'+String(year+1).slice(-2),players=rows(S.overview||{},['players']).length,fixtures=rows(S.overview||{},['fixtures']).length;
    return'<div class="card settings-clean-card"><div class="card-h"><h3>Season</h3></div><div class="card-b">'+
      '<div class="settings-clean-row"><div><b>Current season</b><span>'+esc(season)+' · '+players+' players · '+fixtures+' fixtures</span></div><span class="tag g">Active</span></div>'+
      '<div class="settings-clean-row"><div><b>Player age groups</b><span>Annual age-group rollover is handled by ScoutLink</span></div><strong>Automatic</strong></div>'+
      '<div class="settings-clean-row"><div><b>Archive this season</b><span>Preserves historic player and fixture records instead of rewriting them</span></div><button class="btn sm" id="archiveSeasonInfo" type="button">How archiving works</button></div>'+
      '<div class="callout" style="margin-top:14px">Archiving is intentionally non-destructive. A full season archive action is only shown when the backend workflow is available.</div>'+
      '</div></div>';
  }
  function accountSettings(){var c=S.overview.coach||{};return'<div class="g" style="grid-template-columns:1fr 1fr"><div class="card"><div class="card-h"><h3>Account</h3></div><div class="card-b"><div class="field"><label>Name</label><div class="in">'+esc([c.first_name,c.last_name].filter(Boolean).join(' '))+'</div></div><div class="field"><label>Email</label><div class="in">'+esc(c.email||'')+'</div></div><button class="btn" data-coach-signout>Sign out</button></div></div><div class="card"><div class="card-h"><h3>Change password</h3></div><div class="card-b"><div class="field"><label>New password</label><input class="in" type="password" id="newPassword"></div><div class="field"><label>Confirm password</label><input class="in" type="password" id="confirmPassword"></div><button class="btn p" id="changePassword">Update password</button></div></div></div>';}
  function settingsDesk(){
    var body=S.settingsPane==='team'?teamSettings():S.settingsPane==='coaches'?coachesSettings():S.settingsPane==='notifications'?notifSettings():S.settingsPane==='privacy'?privacySettings():S.settingsPane==='season'?seasonSettings():accountSettings();
    return settingsTabs()+body;
  }
  function settingsPhone(){
    var c=S.overview&&S.overview.coach||{},players=rows(S.overview||{},['players']).length,fixtures=rows(S.overview||{},['fixtures']).length,p=S.prefs||defaultPrefs(),year=new Date().getFullYear(),season=year+'/'+String(year+1).slice(-2);
    function prefLabel(key){var x=p[key]||{};return x.email?'In app and email':x.in_app!==false?'In app only':'Off';}
    return fieldHeader('Settings','', '', 'back')+
      '<div class="settings-phone-profile"><span class="avm">'+esc(initials([c.first_name,c.last_name].filter(Boolean).join(' ')))+'</span><div><b>'+esc([c.first_name,c.last_name].filter(Boolean).join(' ')||'Coach')+'</b><span>'+esc((c.role_at_club||'Coach')+' · '+team())+'</span></div><button class="bt sm" data-settings-pane="team">Edit</button></div>'+
      '<div class="pcap">Team</div><div class="card settings-phone-card">'+
        '<button class="settings-phone-row" data-settings-pane="team"><span><b>Team details</b><small>'+esc(team()+' · '+((c.team_age_groups||[]).join?c.team_age_groups.join(' to '):''))+'</small></span><i>›</i></button>'+
        '<button class="settings-phone-row" data-settings-pane="team"><span><b>Home venue</b><small>'+esc(c.team_home_venue||'Add home venue')+'</small></span><i>›</i></button>'+
        '<button class="settings-phone-row" data-settings-pane="coaches"><span><b>Coaches & permissions</b><small>'+S.coaches.length+' coaches in this workspace</small></span><i>›</i></button></div>'+
      '<div class="pcap">Notifications</div><div class="card settings-phone-card">'+
        [['Scout interest','scout_interest'],['Messages','scout_message'],['Fixture attendance','fixture_attendance'],['Match Facts reminders','match_facts_reminder'],['Video uploads','video_upload']].map(function(x){return'<button class="settings-phone-row" data-settings-pane="notifications"><span><b>'+x[0]+'</b><small>'+prefLabel(x[1])+'</small></span><strong>On</strong></button>';}).join('')+
        '<div class="settings-phone-row locked"><span><b>Safeguarding updates</b><small>Cannot be turned off</small></span><strong>Always</strong></div></div>'+
      '<div class="pcap">Privacy & safeguarding</div><div class="card settings-phone-card"><button class="settings-phone-row" data-settings-pane="privacy"><span><b>What scouts can see</b><small>Profiles, approved video, fixtures</small></span><i>›</i></button><a class="settings-phone-row" href="'+esc(clean('/coach/report-a-concern'))+'"><span><b>Report a concern</b><small>Safeguarding and trust</small></span><i>›</i></a></div>'+
      '<div class="pcap">Season</div><div class="card settings-phone-card"><button class="settings-phone-row" data-settings-pane="season"><span><b>Current season</b><small>'+esc(season+' · '+players+' players · '+fixtures+' fixtures')+'</small></span><span class="tag g">Active</span></button></div>'+
      '<div class="pcap">Account</div><div class="card settings-phone-card"><button class="settings-phone-row" data-settings-pane="account"><span><b>Change password</b><small>Account security</small></span><i>›</i></button><button class="settings-phone-row" data-coach-signout><span><b>Sign out</b><small>On this device</small></span><i>›</i></button></div>';
  }
  function settingsSectionPhone(title,html){return'<details '+(title==='Team'?'open':'')+'><summary style="font-weight:700;padding:4px 0">'+esc(title)+'</summary><div class="settings-mobile-inner">'+html+'</div></details>';}
  function renderSettings(){desk.innerHTML=settingsDesk();field.innerHTML=settingsPhone();bindSettings();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  function inviteCoach(){
    window.CoachV2.openDrawer({title:'Invite coach',html:'<form id="inviteCoachForm"><div class="two"><div class="field"><label>First name</label><input class="in" name="firstName" required></div><div class="field"><label>Last name</label><input class="in" name="lastName" required></div></div><div class="field"><label>Email</label><input class="in" type="email" name="emailAddr" required></div><div class="field"><label>Phone <i>Optional</i></label><input class="in" name="phone"></div>'+
      '<div class="field"><label>Permission level</label><div class="coach-role-options"><label class="coach-role-option"><input type="radio" name="coachRole" value="assistant" checked><span><b>Assistant Coach</b><small>Can manage assigned players, record Match Facts, approve video and reply to scouts.</small></span></label><label class="coach-role-option"><input type="radio" name="coachRole" value="head"><span><b>Head Coach</b><small>Full squad permissions, including assigning players and inviting other coaches.</small></span></label></div></div>'+
      '<div id="inviteCoachMsg"></div><div class="settings-clean-actions"><button class="btn p" type="submit">Invite coach</button></div></form>'});
    setTimeout(function(){var f=document.getElementById('inviteCoachForm');if(f)f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f);api('POST','/api/coaches/add-coach',{firstName:fd.get('firstName'),lastName:fd.get('lastName'),emailAddr:fd.get('emailAddr'),phone:fd.get('phone')||null,isSuperUser:fd.get('coachRole')==='head'}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Coach invited.');loadSettings();}).catch(function(er){document.getElementById('inviteCoachMsg').innerHTML=msg(er.message,true);});};},0);
  }
  function reassignSheet(){
    var players=rows(S.overview||{},['players']);
    window.CoachV2.openDrawer({title:'Reassign players',html:'<div class="callout">Choose a coach for each player that needs to move. This does not alter player evidence.</div>'+players.map(function(p){return'<div class="row"><span class="sp"><b class="rt">'+esc(name(p))+'</b><s class="rs">'+esc(position(p)+' · currently '+coachName(p.assigned_coach_id))+'</s></span><select class="inp" style="width:180px" data-reassign-player="'+esc(p.id)+'">'+S.coaches.map(function(c){return'<option value="'+esc(c.id)+'"'+(String(c.id)===String(p.assigned_coach_id)?' selected':'')+'>'+esc([c.first_name,c.last_name].filter(Boolean).join(' '))+'</option>';}).join('')+'</select></div>';}).join(''),footer:'<button class="btn p" id="saveReassign">Save reassignments</button>'});setTimeout(function(){document.getElementById('saveReassign').onclick=async function(){var changes=[];document.querySelectorAll('[data-reassign-player]').forEach(function(s){var p=players.find(function(x){return String(x.id)===String(s.dataset.reassignPlayer)});if(p&&String(p.assigned_coach_id)!==String(s.value))changes.push({p:p.id,c:s.value});});try{for(var i=0;i<changes.length;i++)await api('POST','/api/coaches/assign-player/'+encodeURIComponent(changes[i].p),{coachId:changes[i].c});window.CoachV2.closeAll();window.CoachV2.showToast('Players reassigned.');loadSettings();}catch(e){alert(e.message);}};},0);
  }
  function bindSettings(){
    document.querySelectorAll('[data-settings-pane]').forEach(function(b){b.onclick=function(){S.settingsPane=b.dataset.settingsPane;renderSettings();};});
    document.querySelectorAll('#inviteCoach').forEach(function(b){b.onclick=inviteCoach;});
    document.querySelectorAll('#reassignPlayers').forEach(function(b){b.onclick=reassignSheet;});
    document.querySelectorAll('[data-pref-event]').forEach(function(x){x.onchange=function(){var p=S.prefs||(S.prefs=defaultPrefs()),ev=x.dataset.prefEvent,ch=x.dataset.prefChannel;if(!p[ev])p[ev]={};p[ev][ch]=x.checked;};});
    document.querySelectorAll('#savePrefs').forEach(function(b){b.onclick=function(){api('PUT','/api/coach-experience/notification-preferences',{preferences:S.prefs}).then(function(r){S.prefs=(r.data||r).preferences||S.prefs;window.CoachV2.showToast('Preferences saved.');}).catch(function(e){alert(e.message);});};});
    document.querySelectorAll('#teamSettingsForm').forEach(function(f){f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f),body={};fd.forEach(function(v,k){body[k]=v});body.teamAgeGroups=String(body.teamAgeGroups||'').split(',').map(function(x){return x.trim()}).filter(Boolean);api('PUT','/api/coach-experience/team-settings',body).then(function(r){S.overview.coach=(r.data||r).coach||S.overview.coach;window.CoachV2.showToast('Team settings saved.');renderSettings();}).catch(function(er){alert(er.message);});};});
    document.querySelectorAll('#changePassword').forEach(function(b){b.onclick=function(){var np=document.querySelector('#newPassword').value,cp=document.querySelector('#confirmPassword').value;if(np.length<8)return alert('Password must be at least 8 characters.');if(np!==cp)return alert('Passwords do not match.');api('POST','/api/auth/change-password',{password:np}).then(function(){window.CoachV2.showToast('Password updated.');}).catch(function(e){alert(e.message);});};});
  }
  async function loadSettings(){await loadOverview(true);try{var pr=await api('GET','/api/coach-experience/notification-preferences');S.prefs=(pr.data||pr).preferences||defaultPrefs();}catch(_){S.prefs=defaultPrefs();}renderSettings();}
  async function initSettings(){try{await loadSettings();}catch(e){desk.innerHTML=msg(e.message,true);field.innerHTML=desk.innerHTML;}}

  /* ================= Report concern ================= */
  function concernForm(id){
    var c=S.overview&&S.overview.coach||{},email=c.email||(window.Auth&&window.Auth.user&&window.Auth.user.email)||'';
    return'<form id="'+id+'"><div class="field"><label>Category · required</label><select class="in" name="concernType" required><option value="">Select category</option><option>Inappropriate contact</option><option>Suspected misuse</option><option>Incorrect access</option><option>Safeguarding issue</option><option>Another platform-safety concern</option></select></div><div class="field"><label>Who or what does this concern? <i>Optional</i></label><input class="in" name="personOrAccount"></div><div class="field"><label>What happened · required</label><textarea class="in ta" name="description" required placeholder="Describe what you saw, when, and anyone involved."></textarea></div><div class="field"><label>Urgency</label><select class="in" name="urgency"><option>Standard review</option><option>Urgent review</option></select></div><input type="hidden" name="contactEmail" value="'+esc(email)+'"><input type="hidden" name="contactName" value="'+esc(window.CoachV2?window.CoachV2.fullName():'Coach')+'"><div class="concern-msg"></div><div class="flex" style="justify-content:flex-end"><a class="btn" href="'+esc(clean('/coach/dashboard'))+'">Cancel</a><button class="btn p" type="submit">Submit concern</button></div></form>';
  }
  function concernDesk(){
    if(S.concernRef)return'<div class="card"><div class="card-b" style="padding:40px;text-align:center"><div class="icn g" style="width:42px;height:42px;margin:0 auto 14px">✓</div><h2>Concern submitted</h2><p class="mut">Your report has been sent privately to the Stratex trust team.</p><div class="lbl">Reference</div><div class="num" style="font-size:24px;font-weight:700;margin:6px">'+esc(S.concernRef)+'</div><a class="btn p" href="'+esc(clean('/coach/dashboard'))+'">Back to dashboard</a></div></div>';
    return'<div class="g" style="grid-template-columns:minmax(0,1fr) 330px"><div class="card"><div class="card-h"><h3>Report a concern</h3></div><div class="card-b">'+concernForm('concernDeskForm')+'</div></div><div class="g"><div class="card"><div class="card-h"><h3>If a child is at immediate risk</h3></div><div class="card-b"><div class="callout r"><b>Use emergency services or your club safeguarding procedure first.</b> ScoutLink reporting is not an emergency response service.</div></div></div><div class="card"><div class="card-h"><h3>What happens next</h3></div><div class="card-b mut" style="line-height:1.8">The Stratex trust team receives the report privately, reviews account and platform evidence available to them, and follows the appropriate safeguarding or platform-safety process. Your report is not shown to the person you report.</div></div><div class="card"><div class="card-h"><h3>Your reports</h3></div><div class="card-b mut">Submitted references appear here when available. Keep your reference if you need to follow up.</div></div></div></div>';
  }
  function concernPhone(){
    if(S.concernRef)return fieldHeader('Report a Concern','Submitted')+'<div class="card"><div class="card-b" style="text-align:center"><h2>Concern submitted</h2><p class="mut">Reference</p><div class="num" style="font-size:24px;font-weight:700">'+esc(S.concernRef)+'</div><a class="bt spend blk" href="'+esc(clean('/coach/dashboard'))+'" style="margin-top:12px">Back to Today</a></div></div>';
    return fieldHeader('Report a Concern','Private safeguarding & platform-safety report')+'<div class="card" style="margin-bottom:10px"><div class="callout r"><b>If a child is at immediate risk,</b> use emergency services or your club safeguarding process first.</div></div><div class="card">'+concernForm('concernPhoneForm')+'</div><div class="pcap">What happens next</div><div class="card"><div class="card-b mut">Your report is reviewed privately by the Stratex trust team and is not shown to the person reported.</div></div>';
  }
  function submitConcern(form){
    var fd=new FormData(form),body={sourcePage:'/coach/report-a-concern'};fd.forEach(function(v,k){body[k]=v});var m=form.querySelector('.concern-msg'),btn=form.querySelector('button[type=submit]');if(!body.concernType||!String(body.description||'').trim()){m.innerHTML=msg('Complete category and description.',true);return;}btn.disabled=true;fetch((window.API||'')+'/api/trust/safeguarding-concerns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Could not submit concern');return d})}).then(function(d){S.concernRef=d.concernId||d.submissionId||'Submitted';renderConcern();}).catch(function(e){m.innerHTML=msg(e.message,true);}).finally(function(){btn.disabled=false;});
  }
  function bindConcern(){document.querySelectorAll('#concernDeskForm,#concernPhoneForm').forEach(function(f){f.onsubmit=function(e){e.preventDefault();submitConcern(f);};});}
  function renderConcern(){desk.innerHTML=concernDesk();field.innerHTML=concernPhone();bindConcern();document.dispatchEvent(new CustomEvent('coach:rendered'));}
  async function initConcern(){try{await loadOverview();renderConcern();}catch(e){S.overview={coach:{}};renderConcern();}}

  function boot(){
    if(page==='dashboard')initDashboard();
    else if(page==='my-players')initPlayers();
    else if(page==='fixtures')initFixtures();
    else if(page==='video-reels')initVideos();
    else if(page==='chat')initChat();
    else if(page==='notifications')initNotifications();
    else if(page==='settings')initSettings();
    else if(page==='report-a-concern')initConcern();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());

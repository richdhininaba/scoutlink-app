'use strict';

/*
 * ScoutLink Match Facts — exact Coach Desk / Coach Field renderer.
 * Five-stage source design with real ScoutLink writes. Draft state is local
 * until the coach submits the review stage.
 */
(function(){
  var DRAFT='scoutlink.coach.matchFacts.exact.v1';
  var queryAtLoad=new URLSearchParams(location.search),matchdayMode=queryAtLoad.get('mode')==='matchday',matchdayStartedAt=Date.now(),matchdayTimer=null;
  var S={
    step:1, fixtureId:'', source:'fixture', fixture:null, fixtures:[], players:[], attendance:[], scouts:{}, options:null,
    selected:{}, starter:{}, playedPosition:{}, homeScore:'', awayScore:'', format:'11v11', formation:'4-3-3',
    matchLength:'2 × 40 minutes', opponent:'', matchDate:'', events:[], ratings:{}, notes:{}, advanced:{}, saved:null
  };
  var desk=document.getElementById('coachDeskPage'), field=document.getElementById('coachFieldPage');
  if(!desk||!field)return;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function api(m,p,b){return window.CoachV2&&window.CoachV2.api?window.CoachV2.api(m,p,b):window.api(m,p,b);}
  function clean(p){return window.CoachV2?window.CoachV2.clean(p):p;}
  function list(r,keys){if(Array.isArray(r))return r;for(var i=0;i<keys.length;i++)if(r&&Array.isArray(r[keys[i]]))return r[keys[i]];return[];}
  function name(p){return[p&&p.first_name,p&&p.last_name].filter(Boolean).join(' ')||'Player';}
  function initials(p){return window.CoachV2?window.CoachV2.initials(name(p)):name(p).split(/\s+/).map(function(x){return x[0]}).slice(0,2).join('').toUpperCase();}
  function pos(p){return p.primary_position||p.specific_position||'—';}
  function n(v,d){v=Number(v);return Number.isFinite(v)?v:(d==null?0:d);}
  function fmtDate(v){if(!v)return'—';var d=new Date(String(v).length<=10?v+'T12:00:00':v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
  function fixtureLabel(f){return'vs '+esc(f.opponent||'Opponent')+' · '+esc(fmtDate(f.fixture_date))+(f.fixture_time?' · '+esc(String(f.fixture_time).slice(0,5)):'')+(f.home_or_away?' · '+esc(f.home_or_away):'');}
  function selectedPlayers(){return S.players.filter(function(p){return !!S.selected[p.id];});}
  function starters(){return selectedPlayers().filter(function(p){return S.starter[p.id]!==false;});}
  function bench(){return selectedPlayers().filter(function(p){return S.starter[p.id]===false;});}
  function playerState(pid){if(!S.ratings[pid])S.ratings[pid]={performance:'',attributes:{},minutes:'',goals:0,assists:0,yellowCards:0,redCards:0};return S.ratings[pid];}
  function groupFor(position){return window.ScoutLinkScoringV4?window.ScoutLinkScoringV4.groupForPosition(position):'Attacker';}
  function attrsFor(position){return window.ScoutLinkScoringV4?window.ScoutLinkScoringV4.attributesForPosition(position,S.options):[];}
  function saveDraft(){try{localStorage.setItem(DRAFT,JSON.stringify({version:1,state:S,savedAt:new Date().toISOString()}));if(window.CoachV2)window.CoachV2.setTopChip('Draft saved');}catch(_){}}
  function restore(){try{var d=JSON.parse(localStorage.getItem(DRAFT)||'null');if(d&&d.state)S=Object.assign(S,d.state,{fixtures:[],players:[],attendance:[],scouts:{},options:null,saved:null});}catch(_){}}
  function setStep(x){S.step=Math.max(1,Math.min(5,Number(x)||1));saveDraft();render();window.scrollTo(0,0);}
  function steps(){
    var names=['Setup & players','Positions','Events','Ratings','Review'];
    return'<div class="steps" style="margin-bottom:16px">'+names.map(function(t,i){var x=i+1;return'<button type="button" class="st '+(x<S.step?'dn':x===S.step?'on':'')+'" data-mf-goto="'+x+'" '+(x>S.step?'disabled':'')+'><u>'+(x<S.step?'✓':x)+'</u><b>'+t+'</b></button>';}).join('')+'</div>';
  }
  function footer(back,next,label){
    return'<div class="card" style="margin-top:14px"><div class="foot" style="border-top:0"><span class="mut" style="font-size:11.5px">Step '+S.step+' of 5 · draft saved</span><div class="sp"></div>'+(back?'<button class="btn" data-mf-goto="'+back+'">Back</button>':'<button class="btn" id="mfCancel">Cancel</button>')+(next?'<button class="btn p" data-mf-goto="'+next+'">'+esc(label)+'</button>':'')+'</div></div>';
  }
  function currentFixture(){
    return S.fixtures.find(function(f){return String(f.id)===String(S.fixtureId);})||S.fixture||null;
  }
  function applyFixture(f){
    if(!f)return;
    S.fixture=f;S.fixtureId=f.id||S.fixtureId;S.opponent=f.opponent||S.opponent;S.matchDate=f.fixture_date||S.matchDate;S.format=normaliseFormat(f.format||S.format);
  }
  function normaliseFormat(v){var x=String(v||'11v11').match(/(5|7|9|11)/);return x?x[1]+'v'+x[1]:'11v11';}
  function formatOptions(){return['5v5','7v7','9v9','11v11'];}
  function formationOptions(){return['4-3-3','4-2-3-1','4-4-2','3-5-2','3-4-3'];}
  function scoutAtFixture(){
    return S.attendance.filter(function(a){return String(a.fixture_id)===String(S.fixtureId)&&String(a.status||'').toLowerCase()!=='cancelled';});
  }
  function scoutName(id){
    var x=S.scouts&&S.scouts[id]; if(!x)return'Reviewed scout';
    return x.club_name||[x.first_name,x.last_name].filter(Boolean).join(' ')||'Reviewed scout';
  }

  function stage1(){
    var f=currentFixture(), selected=selectedPlayers();
    return steps()+'<div class="g" style="grid-template-columns:1fr 340px">'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Match</h3><div class="sp"></div></div><div class="card-b">'+
        '<div class="fld"><span class="fl">Source</span><div class="chips"><button class="chip '+(S.source==='fixture'?'on':'')+'" data-mf-source="fixture">Existing fixture</button><button class="chip '+(S.source==='standalone'?'on':'')+'" data-mf-source="standalone">Standalone match</button></div></div>'+
        (S.source==='fixture'?'<div class="fld"><span class="fl">Fixture</span><select class="inp" id="mfFixture"><option value="">Choose fixture…</option>'+S.fixtures.map(function(x){return'<option value="'+esc(x.id)+'"'+(String(x.id)===String(S.fixtureId)?' selected':'')+'>'+fixtureLabel(x).replace(/&amp;/g,'&')+'</option>';}).join('')+'</select></div>':'<div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><span class="fl">Opponent</span><input class="inp" id="mfOpponent" value="'+esc(S.opponent)+'"></div><div class="fld"><span class="fl">Match date</span><input class="inp" type="date" id="mfDate" value="'+esc(S.matchDate)+'"></div></div>')+
        (f?'<div class="row" style="border:1px solid var(--blue-t2);background:var(--blue-t);padding:12px 14px"><div class="sp"><b class="rt">'+fixtureLabel(f).split(' · ')[0]+'</b><s class="rs">'+esc(fmtDate(f.fixture_date)+(f.fixture_time?' · '+String(f.fixture_time).slice(0,5):'')+(f.venue?' · '+f.venue:'')+' · '+(f.format||S.format))+'</s></div><span class="tag a"><i></i>Match Facts missing</span></div>':'')+
        '<div class="g" style="grid-template-columns:repeat(4,1fr);margin-top:14px"><div class="fld" style="margin:0"><span class="fl">Our score</span><input class="inp" id="mfHome" type="number" min="0" value="'+esc(S.homeScore)+'"></div><div class="fld" style="margin:0"><span class="fl">Their score</span><input class="inp" id="mfAway" type="number" min="0" value="'+esc(S.awayScore)+'"></div><div class="fld" style="margin:0"><span class="fl">Format</span><select class="inp" id="mfFormat">'+formatOptions().map(function(x){return'<option'+(x===S.format?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div><div class="fld" style="margin:0"><span class="fl">Formation</span><select class="inp" id="mfFormation">'+formationOptions().map(function(x){return'<option'+(x===S.formation?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div>'+
      '</div></div>'+
      '<div class="card"><div class="card-h"><h3>Squad</h3><div class="sp"></div><span class="hint">'+selected.length+' of '+S.players.length+' selected · '+starters().length+' starting, '+bench().length+' bench</span><button class="btn sm" id="mfLastLineup">Load last line-up</button></div><table><thead><tr><th style="width:26px"></th><th>Player</th><th class="c">Selected as</th><th class="r">Apps</th><th class="r">Overall</th></tr></thead><tbody>'+S.players.map(function(p){var on=!!S.selected[p.id],st=S.starter[p.id]!==false;return'<tr><td><button class="ck '+(on?'on':'')+'" data-mf-select="'+esc(p.id)+'"></button></td><td><div class="who"><div class="av">'+esc(initials(p))+'</div><div><b>'+esc(name(p))+'</b><s>'+esc(pos(p)+' · '+(p.age_group||'—'))+'</s></div></div></td><td class="c">'+(on?'<button class="tag '+(st?'b':'')+'" data-mf-starter="'+esc(p.id)+'">'+(st?'Starting':'Bench')+'</button>':'<span class="tag">Not selected</span>')+'</td><td class="r num">'+n(p.appearances,0)+'</td><td class="r num">'+(p.overall_rating==null?'—':Math.round(n(p.overall_rating)))+'</td></tr>';}).join('')+'</tbody></table></div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Attribute observations</h3></div><div class="card-b"><div class="mut" style="font-size:11.5px;line-height:1.8">Each selected player is assessed on the attributes for <b>the position they played today</b>, not their profile position. Changing the played position changes that match assessment set.</div></div></div>'+
      '<div class="card"><div class="card-h"><h3>Scouts at this fixture</h3></div>'+(scoutAtFixture().length?scoutAtFixture().map(function(a){return'<div class="row"><div class="sp"><b class="rt">'+esc(scoutName(a.scout_id))+'</b><s class="rs">'+esc((a.status||'Attending')+' · confirmed '+fmtDate(a.created_at))+'</s></div></div>';}).join(''):'<div class="card-b mut">No confirmed scout attendance is recorded.</div>')+'</div></div></div>'+footer(null,2,'Continue to positions');
  }

  function formationSlots(){
    var st=starters(), names={
      '4-3-3':['GK','RB','CB','CB','LB','DM','CM','AM','RW','LW','ST'],
      '4-2-3-1':['GK','RB','CB','CB','LB','DM','CM','RW','AM','LW','ST'],
      '4-4-2':['GK','RB','CB','CB','LB','RM','CM','CM','LM','ST','ST'],
      '3-5-2':['GK','CB','CB','CB','RWB','CM','DM','CM','LWB','ST','ST'],
      '3-4-3':['GK','CB','CB','CB','RM','CM','CM','LM','RW','ST','LW']
    };
    var posns=names[S.formation]||names['4-3-3'];
    return st.map(function(p,i){return{p:p,position:S.playedPosition[p.id]||posns[i]||pos(p)};});
  }
  function pitch(slots){
    var coords=[[65,210],[190,65],[180,150],[180,270],[190,355],[350,210],[395,115],[395,310],[570,80],[570,345],[620,210]];
    return'<svg style="display:block" viewBox="0 0 760 430" width="100%"><rect fill="var(--canvas)" width="760" height="430"/><rect x="10" y="10" width="740" height="410" fill="none" stroke="var(--line2)"/><line x1="380" x2="380" y1="10" y2="420" stroke="var(--line2)"/><circle cx="380" cy="215" r="69" fill="none" stroke="var(--line2)"/><rect x="10" y="103" width="84" height="224" fill="none" stroke="var(--line2)"/><rect x="666" y="103" width="84" height="224" fill="none" stroke="var(--line2)"/>'+slots.slice(0,11).map(function(x,i){var c=coords[i]||[380,215],last=name(x.p).split(/\s+/).slice(-1)[0];return'<g data-pitch-player="'+esc(x.p.id)+'" tabindex="0"><circle cx="'+c[0]+'" cy="'+c[1]+'" r="15" fill="var(--blue)"/><text x="'+c[0]+'" y="'+(c[1]+4)+'" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">'+esc(x.position)+'</text><text x="'+c[0]+'" y="'+(c[1]+29)+'" text-anchor="middle" fill="var(--ink2)" font-size="9.5" font-weight="600">'+esc(last)+'</text></g>';}).join('')+'</svg>';
  }
  function assessmentSummary(slots){
    var grouped={};
    slots.forEach(function(x){var g=groupFor(x.position)||'Attacker';if(!grouped[g])grouped[g]=[];grouped[g].push(name(x.p));});
    return Object.keys(grouped).map(function(g){var count=attrsFor((slots.find(function(x){return groupFor(x.position)===g;})||{}).position).length;return'<tr><td><b>'+esc(grouped[g].join(', '))+'</b><s class="mut" style="display:block;font-size:11px">'+esc(g)+'</s></td><td class="r mut" style="font-size:11.5px">'+(g==='Goalkeeper'?'Goalkeeper '+count:'General 13 + '+g+' '+Math.max(0,count-13))+'</td></tr>';}).join('');
  }
  function stage2(){
    var slots=formationSlots();
    return steps()+'<div class="g" style="grid-template-columns:1fr 340px"><div class="card"><div class="card-h"><h3>Positions played</h3><div class="sp"></div><span class="hint">'+esc(S.formation)+' · '+slots.length+' starting</span><select class="tag b" id="mfFormation2">'+formationOptions().map(function(x){return'<option'+(x===S.formation?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div><div class="card-b">'+pitch(slots)+'<div class="mut" style="font-size:11.5px;margin-top:6px">Click a player on the pitch to change the position they played. The attribute set for the post-match assessment follows this position.</div></div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Assessment sets for this match</h3><div class="sp"></div><span class="hint">Derived from the pitch</span></div><div class="card-b"><table><tbody>'+assessmentSummary(slots)+'</tbody></table></div></div><div class="card"><div class="card-h"><h3>Bench</h3></div>'+(bench().length?bench().map(function(p){return'<div class="row"><div class="sp"><b class="rt">'+esc(name(p))+'</b><s class="rs">'+esc(pos(p)+' · available from kick-off')+'</s></div><span class="tag">Bench</span></div>';}).join(''):'<div class="card-b mut">No bench players selected.</div>')+'</div></div></div>'+footer(1,3,'Continue to events');
  }

  function eventLabel(e){var p=S.players.find(function(x){return String(x.id)===String(e.playerId);});return(e.minute?e.minute+"' ":'')+(e.type||'Event')+(p?' · '+name(p):'')+(e.note?' · '+e.note:'');}
  function stage3(){
    var goals=S.events.filter(function(e){return e.type==='Goal';}), conceded=S.events.filter(function(e){return e.type==='Goal conceded';}), cards=S.events.filter(function(e){return/Yellow|Red/.test(e.type||'');});
    return steps()+'<div class="g" style="grid-template-columns:minmax(0,1fr) 320px"><div class="g"><div class="card"><div class="card-h"><h3>Add event</h3><div class="sp"></div></div><div class="card-b"><div class="g" style="grid-template-columns:120px 1fr 1fr 1fr"><div class="fld"><span class="fl">Minute</span><input class="inp" id="mfEventMinute" type="number" min="0"></div><div class="fld"><span class="fl">Event</span><select class="inp" id="mfEventType"><option>Goal</option><option>Assist</option><option>Goal conceded</option><option>Yellow card</option><option>Red card</option><option>Substitution</option><option>Clean sheet</option></select></div><div class="fld"><span class="fl">Player</span><select class="inp" id="mfEventPlayer"><option value="">—</option>'+selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p)+' · '+(S.playedPosition[p.id]||pos(p)))+'</option>';}).join('')+'</select></div><div class="fld"><span class="fl">Note / assisted by</span><input class="inp" id="mfEventNote"></div></div><button class="btn p" id="mfAddEvent">Add event</button></div></div>'+
      '<div class="card"><div class="card-h"><h3>Match events</h3><div class="sp"></div><span class="hint">'+S.events.length+' events · '+esc((S.homeScore||0)+'–'+(S.awayScore||0))+'</span></div>'+(S.events.length?S.events.map(function(e,i){return'<div class="row"><span class="icn '+(e.type==='Goal'?'g':/card/i.test(e.type)?'a':e.type==='Goal conceded'?'r':'b')+'">'+esc((e.minute||'')+"'")+'</span><span class="sp"><b class="rt">'+esc(e.type)+'</b><s class="rs">'+esc(eventLabel(e))+'</s></span><button class="btn q sm" data-mf-remove-event="'+i+'">Remove</button></div>';}).join(''):'<div class="card-b mut">No events added.</div>')+'</div>'+
      '<div class="card"><div class="card-h"><h3>Advanced match statistics</h3><div class="sp"></div><span class="tag">Collapsed</span></div><div class="card-b"><div class="mut">Optional detailed metrics: passes, progressive passes, line-breaking passes, carries, chances, take-ons, duels, pressures, recoveries, blocks, clearances and box entries. Per player, per match.</div><button class="btn sm" id="mfAdvanced" style="margin-top:10px">Open</button><div class="help">Collapsed by default. Grassroots coaches are never required to enter these to complete Match Facts.</div></div></div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Running score</h3></div><div class="card-b"><div class="num" style="font-size:34px;font-weight:700">'+esc((S.homeScore||0)+' – '+(S.awayScore||0))+'</div><div class="mut">'+esc((window.CoachV2?window.CoachV2.teamName():'Your team')+' vs '+(S.opponent||'Opponent'))+'</div><hr class="sep"><div class="g" style="grid-template-columns:repeat(3,1fr)">'+metricK('Goals',goals.length)+metricK('Events',S.events.length)+metricK('Cards',cards.length)+'</div></div></div><div class="card"><div class="card-h"><h3>Scorers</h3></div><div class="card-b">'+(goals.length?goals.map(function(e){return'<div class="row" style="padding-left:0;padding-right:0"><span class="sp"><b class="rt">'+esc(eventLabel(e))+'</b></span></div>';}).join(''):'<div class="mut">No goals recorded.</div>')+'</div></div></div></div>'+footer(2,4,'Continue to ratings');
  }
  function metricK(k,v){return'<div><div class="lbl">'+esc(k)+'</div><div class="num" style="font-size:22px;font-weight:700">'+esc(v)+'</div></div>';}

  function ratingButtons(pid,key,val,min){
    min=min||1;return'<div class="scale">'+Array.from({length:11-min},function(_,i){var x=i+min;return'<button type="button" data-mf-rate="'+esc(pid)+'" data-mf-key="'+esc(key)+'" data-mf-value="'+x+'" class="'+(Number(val)===x?'on':'')+'">'+x+'</button>';}).join('')+(key!=='performance'?'<button type="button" class="na '+(val==null||val===''?'on':'')+'" data-mf-rate="'+esc(pid)+'" data-mf-key="'+esc(key)+'" data-mf-value="">Not observed</button>':'')+'</div>';
  }
  function observationCount(p){var st=playerState(p.id),attrs=attrsFor(S.playedPosition[p.id]||pos(p));return attrs.filter(function(x){return st.attributes[x[0]]!==''&&st.attributes[x[0]]!=null;}).length+'/'+attrs.length;}
  function ratingDrawer(p){
    var st=playerState(p.id),played=S.playedPosition[p.id]||pos(p),attrs=attrsFor(played);
    return'<div class="mut" style="margin-bottom:10px">Match observation, not profile edit · played '+esc(played)+' today</div><div class="fld"><span class="fl">Overall performance</span>'+ratingButtons(p.id,'performance',st.performance,5)+'</div><div class="callout"><b>Attribute set for today:</b> '+esc(groupFor(played)==='Goalkeeper'?'Goalkeeper '+attrs.length:'General 13 + '+groupFor(played)+' '+Math.max(0,attrs.length-13))+' · '+observationCount(p)+' observed</div>'+attrs.map(function(row){return'<div class="profile-scale-row"><b>'+esc(row[1])+'</b>'+ratingButtons(p.id,row[0],st.attributes[row[0]])+'</div>';}).join('');
  }
  function stage4(){
    var players=selectedPlayers(),avgVals=players.map(function(p){return n(playerState(p.id).performance,NaN);}).filter(Number.isFinite),avg=avgVals.length?(avgVals.reduce(function(a,b){return a+b},0)/avgVals.length).toFixed(1):'—';
    return steps()+'<div class="g" style="grid-template-columns:minmax(0,1fr) 370px"><div class="card"><div class="card-h"><h3>Performance ratings</h3><div class="sp"></div><span class="hint">'+players.length+' players</span><button class="btn sm" id="mfApply7">Apply 7 to all unrated</button></div><table><thead><tr><th>Player</th><th class="r">G</th><th class="r">A</th><th>Overall out of 10</th><th>Observations</th></tr></thead><tbody>'+players.map(function(p){var st=playerState(p.id);return'<tr><td><div class="who"><div class="av">'+esc(initials(p))+'</div><div><b>'+esc(name(p))+'</b><s>Played '+esc(S.playedPosition[p.id]||pos(p))+' · '+esc(st.minutes||'—')+"'"+'</s></div></div></td><td class="r">'+n(st.goals,0)+'</td><td class="r">'+n(st.assists,0)+'</td><td>'+ratingButtons(p.id,'performance',st.performance,5)+'</td><td><button class="btn '+(observationCount(p).split('/')[0]!=='0'?'p':'')+' sm" data-mf-open-ratings="'+esc(p.id)+'">'+esc(observationCount(p))+' · Open</button></td></tr>';}).join('')+'</tbody></table></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>Rating spread</h3></div><div class="card-b"><div class="num" style="font-size:28px;font-weight:700">'+avg+'</div><div class="mut">Team average · current match</div></div></div><div class="card"><div class="card-h"><h3>Why this matters</h3></div><div class="card-b"><div class="mut" style="line-height:1.8">Match observations build the longitudinal record. The standing profile assessment stays separate, so one good or bad match never redefines the player profile. Repeated differences can prompt a fresh assessment.</div></div></div></div></div>'+footer(3,5,'Continue to review');
  }

  function stage5(){
    var ps=selectedPlayers(), events=S.events, rated=ps.filter(function(p){return Number.isFinite(n(playerState(p.id).performance,NaN));}),obs=ps.reduce(function(sum,p){return sum+Number(observationCount(p).split('/')[0]);},0);
    return steps()+'<div class="g" style="grid-template-columns:minmax(0,1fr) 340px"><div class="g"><div class="card"><div class="card-h"><h3>Match summary</h3></div><div class="card-b"><div class="num" style="font-size:34px;font-weight:700">'+esc((S.homeScore||0)+' – '+(S.awayScore||0))+'</div><b>'+esc('vs '+(S.opponent||'Opponent'))+'</b><div class="mut">'+esc(fmtDate(S.matchDate)+' · '+S.format+' · '+S.formation+' · '+S.matchLength)+'</div><div style="margin-top:8px"><span class="tag b">'+scoutAtFixture().length+' scouts attended</span></div></div></div>'+
      '<div class="card"><div class="card-h"><h3>Events</h3><div class="sp"></div><span class="hint">'+events.length+'</span></div><div class="card-b"><div class="chips">'+(events.length?events.map(function(e){return'<span class="chip">'+esc(eventLabel(e))+'</span>';}).join(''):'<span class="mut">No events</span>')+'</div></div></div>'+
      '<div class="card"><div class="card-h"><h3>Ratings</h3></div><div class="card-b"><div class="chips">'+rated.map(function(p){return'<span class="chip">'+esc(name(p).split(/\s+/).slice(-1)[0])+' <b>'+esc(playerState(p.id).performance)+'</b></span>';}).join('')+'</div><div class="help">'+rated.length+' of '+ps.length+' performance ratings completed.</div></div></div></div>'+
      '<div class="g"><div class="card"><div class="card-h"><h3>What will be written</h3></div><div class="card-b">'+kv('Players updated',ps.length)+kv('Performance ratings',rated.length)+kv('Attribute observations',obs)+kv('Events',events.length)+kv('Profiles recalculated',ps.length)+kv('Fixture status','Recorded')+'</div></div>'+
      '<div class="card"><div class="card-h"><h3>Before you submit</h3></div><div class="card-b"><div class="callout"><b>Submitting recalculates player scoring outputs</b> from the new Match Facts evidence and marks this record confirmed.</div><div class="mut" style="margin-top:10px">Players who did not feature are untouched.</div></div></div></div></div>'+
      '<div class="card" style="margin-top:14px"><div class="foot" style="border-top:0"><span class="mut">Step 5 of 5 · '+ps.length+' players</span><div class="sp"></div><button class="btn" data-mf-goto="4">Back</button><button class="btn" id="mfSaveDraft">Save draft</button><button class="btn p" id="mfSubmit">Submit Match Facts</button></div></div>';
  }
  function kv(k,v){return'<div class="row" style="padding-left:0;padding-right:0"><span class="sp">'+esc(k)+'</span><b>'+esc(v)+'</b></div>';}

  function saved(){
    return'<div class="card"><div class="card-b" style="padding:42px;text-align:center"><div class="icn g" style="margin:0 auto 14px;width:42px;height:42px;font-size:20px">✓</div><h2 style="margin:0 0 8px">Match Facts saved</h2><p class="mut">Player records have been updated and scoring recalculation has been requested for the submitted squad.</p><div class="flex" style="justify-content:center;margin-top:18px"><a class="btn" href="'+esc(clean('/coach/fixtures'))+'">View fixture</a><a class="btn" href="'+esc(clean('/coach/my-players'))+'">View squad changes</a><a class="btn p" href="'+esc(clean('/coach/dashboard'))+'">Back to dashboard</a></div></div></div>';
  }

  function matchMinute(){
    return Math.max(1,Math.floor((Date.now()-matchdayStartedAt)/60000)+1);
  }
  function matchdaySummary(p){
    var es=S.events.filter(function(e){return String(e.playerId||'')===String(p.id)}),parts=[];
    var goals=es.filter(function(e){return e.type==='Goal'}).length,assists=es.filter(function(e){return e.type==='Assist'}).length,yellow=es.filter(function(e){return e.type==='Yellow card'}).length;
    if(goals)parts.push(goals+' goal'+(goals===1?'':'s'));if(assists)parts.push(assists+' assist'+(assists===1?'':'s'));if(yellow)parts.push('yellow');
    var subs=es.filter(function(e){return e.type==='Substitution'});if(subs.length)parts.push(subs[subs.length-1].note||'substitution');
    return parts.join(' · ')||'Tap an event, then this player';
  }
  function matchdayPhone(){
    var ps=starters(),events=S.events.slice().sort(function(a,b){return n(b.minute)-n(a.minute)});
    if(window.CoachV2&&window.CoachV2.setFieldHeader)window.CoachV2.setFieldHeader('Matchday','vs '+(S.opponent||((currentFixture()||{}).opponent)||'Opponent'),'<span class="tag g"><i></i>Live</span>','back');
    return
      '<div class="card" style="margin-bottom:10px"><div class="flex"><div><div class="lbl">Match clock</div><div id="matchdayClock" class="num" style="font-size:27px;font-weight:700">00:00</div></div><div class="right" style="text-align:right"><div class="lbl">Score</div><div class="num" style="font-size:27px;font-weight:700">'+esc((S.homeScore||0)+' – '+(S.awayScore||0))+'</div></div></div></div>'+
      '<div class="g" style="grid-template-columns:repeat(3,1fr);margin-bottom:8px">'+
        '<button class="btn p" style="height:46px;justify-content:center" data-matchday-event="Goal">Goal</button>'+
        '<button class="btn" style="height:46px;justify-content:center" data-matchday-event="Assist">Assist</button>'+
        '<button class="btn" style="height:46px;justify-content:center" data-matchday-event="Conceded">Conceded</button>'+
        '<button class="btn" style="height:46px;justify-content:center" data-matchday-event="Yellow card">Yellow</button>'+
        '<button class="btn" style="height:46px;justify-content:center" data-matchday-event="Substitution">Substitution</button>'+
        '<button class="btn" style="height:46px;justify-content:center" data-matchday-event="Note">Note</button></div>'+
      '<div class="help">Tap an event, then a player. Nothing else is asked for during the match.</div>'+
      '<div class="pcap">On the pitch <span>Tap to log</span></div><div class="card">'+ps.slice(0,6).map(function(p,i){return'<div class="row" style="padding:9px 4px"><div class="av">'+(i+1)+'</div><div class="sp" style="margin-left:8px"><b class="rt">'+esc(name(p))+'</b><s class="rs">'+esc((S.playedPosition[p.id]||pos(p))+' · '+matchdaySummary(p))+'</s></div>'+(matchdaySummary(p).indexOf('Tap an event')<0?'<span class="tag g">'+esc(matchdaySummary(p))+'</span>':'')+'</div>';}).join('')+(ps.length>6?'<div class="mut" style="font-size:11px;padding:6px 4px">'+(ps.length-6)+' more on the pitch · '+bench().length+' on the bench</div>':'')+'</div>'+
      '<div class="pcap">Timeline</div><div class="card">'+(events.length?events.map(function(e){var p=S.players.find(function(x){return String(x.id)===String(e.playerId)});return'<div class="row" style="padding:10px 12px"><b class="num" style="width:34px;font-size:12px">'+esc((e.minute||'—')+"'")+'</b><div class="sp"><b class="rt">'+esc(p&&p.id?name(p):(e.type==='Conceded'?'Opponent':e.type))+'</b><s class="rs">'+esc(e.note||e.type)+'</s></div><span class="tag '+(e.type==='Goal'||e.type==='Assist'?'g':e.type==='Yellow card'?'a':'')+'">'+esc(e.type==='Yellow card'?'Yellow':e.type)+'</span></div>';}).join(''):'<div class="card-b mut">No events logged yet.</div>')+'</div>'+
      '<div class="mut" style="font-size:10.5px;padding:12px 0;text-align:center">Ratings and attribute observations come after the whistle, not during the match.</div>'+
      '<button class="btn p" style="width:100%;justify-content:center" id="matchdayEnd">End match and rate players</button>';
  }
  function chooseMatchdayPlayer(type){
    var ps=selectedPlayers();
    window.CoachV2.openSheet({title:type,html:'<div class="mut" style="margin-bottom:10px">Minute '+matchMinute()+" · choose the player involved.</div>"+'<div class="card">'+ps.map(function(p){return'<button class="rowline" data-matchday-player="'+esc(p.id)+'"><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(S.playedPosition[p.id]||pos(p))+'</span></span></button>';}).join('')+'</div>'});
    setTimeout(function(){document.querySelectorAll('[data-matchday-player]').forEach(function(b){b.onclick=function(){addEvent(matchMinute(),type,b.dataset.matchdayPlayer,'');window.CoachV2.closeAll();};});},0);
  }
  function substitutionMatchday(){
    var ps=selectedPlayers();
    window.CoachV2.openSheet({title:'Substitution',html:'<div class="two"><div class="field"><label>Player off</label><select class="in" id="matchdayOff">'+ps.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><div class="field"><label>Player on</label><select class="in" id="matchdayOn">'+bench().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div></div>',footer:'<button class="btn p" id="matchdaySubSave">Log substitution</button>'});
    setTimeout(function(){var b=document.getElementById('matchdaySubSave');if(b)b.onclick=function(){var off=document.getElementById('matchdayOff').value,on=document.getElementById('matchdayOn').value,offP=S.players.find(function(p){return String(p.id)===String(off)}),onP=S.players.find(function(p){return String(p.id)===String(on)});if(on){S.starter[off]=false;S.starter[on]=true;}addEvent(matchMinute(),'Substitution',on||off,(onP?name(onP):'Player')+' on · '+(offP?name(offP):'Player')+' off');window.CoachV2.closeAll();};},0);
  }
  function bindMatchday(){
    document.querySelectorAll('[data-matchday-event]').forEach(function(b){b.onclick=function(){var type=b.dataset.matchdayEvent;if(type==='Conceded'){S.awayScore=n(S.awayScore)+1;addEvent(matchMinute(),'Conceded','',"Opponent goal");return;}if(type==='Substitution'){substitutionMatchday();return;}if(type==='Note'){var note=prompt('Quick match note');if(note)addEvent(matchMinute(),'Note','',note);return;}if(type==='Goal')S.homeScore=n(S.homeScore)+1;chooseMatchdayPlayer(type);};});
    var end=document.getElementById('matchdayEnd');if(end)end.onclick=function(){matchdayMode=false;S.step=4;saveDraft();try{history.replaceState(null,'',location.pathname+(S.fixtureId?'?fixtureId='+encodeURIComponent(S.fixtureId):''));}catch(_){}render();window.scrollTo(0,0);};
    clearInterval(matchdayTimer);matchdayTimer=setInterval(function(){var el=document.getElementById('matchdayClock');if(el){var sec=Math.floor((Date.now()-matchdayStartedAt)/1000),m=Math.floor(sec/60),ss=sec%60;el.textContent=String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');}},1000);
  }

  function phoneHeader(){
    if(window.CoachV2&&window.CoachV2.setFieldHeader)window.CoachV2.setFieldHeader('Match Facts','','<span class="btn q">Draft</span>','back');
    var names=['Setup & players','Positions','Events','Ratings','Review'];
    return'<div style="margin-bottom:14px"><div style="display:flex;gap:4px;margin-bottom:8px">'+[1,2,3,4,5].map(function(x){return'<u style="display:block;height:3px;flex:1;background:'+(x<=S.step?'var(--blue)':'var(--canvas2)')+'"></u>';}).join('')+'</div><div style="display:flex;align-items:baseline"><b style="font-size:13px">'+esc(names[S.step-1])+'</b><span class="mut" style="font-size:11px;margin-left:auto">Step '+S.step+' of 5</span></div></div>';
  }
  function phone(){
    if(S.saved)return phoneHeader()+'<div class="card"><div class="card-b" style="text-align:center;padding:26px"><h2>Match Facts saved</h2><p class="mut">Player records were updated.</p><a class="bt spend blk" href="'+esc(clean('/coach/dashboard'))+'">Back to Today</a></div></div>';
    if(S.step===1)return phoneHeader()+'<div class="stack"><div class="card"><div class="ck" style="margin-bottom:8px">Match</div><div class="field"><label>Fixture</label><select class="in" id="mfPhoneFixture"><option value="">Standalone match</option>'+S.fixtures.map(function(f){return'<option value="'+esc(f.id)+'"'+(String(f.id)===String(S.fixtureId)?' selected':'')+'>'+fixtureLabel(f).replace(/&amp;/g,'&')+'</option>';}).join('')+'</select></div><div class="two"><div class="field"><label>Our score</label><input class="in" id="mfPhoneHome" type="number" min="0" value="'+esc(S.homeScore)+'"></div><div class="field"><label>Their score</label><input class="in" id="mfPhoneAway" type="number" min="0" value="'+esc(S.awayScore)+'"></div></div><div class="field"><label>Formation</label><select class="in" id="mfPhoneFormation">'+formationOptions().map(function(x){return'<option'+(x===S.formation?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div><div class="pcap">Squad <span>'+selectedPlayers().length+' selected</span></div><div class="card">'+S.players.map(function(p){return'<div class="rowline"><button class="ck '+(S.selected[p.id]?'on':'')+'" data-mf-select="'+esc(p.id)+'"></button><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(pos(p)+' · '+(p.age_group||'—'))+'</span></span>'+(S.selected[p.id]?'<button class="tag '+(S.starter[p.id]!==false?'b':'')+'" data-mf-starter="'+esc(p.id)+'">'+(S.starter[p.id]!==false?'Starting':'Bench')+'</button>':'')+'</div>';}).join('')+'</div><button class="bt spend blk" data-mf-goto="2">Continue to positions</button></div>';
    if(S.step===2)return phoneHeader()+'<div class="stack"><div class="card"><div class="ck" style="margin-bottom:8px">Positions played · '+esc(S.formation)+'</div>'+formationSlots().map(function(x){return'<div class="rowline"><span class="who"><b>'+esc(name(x.p))+'</b><span>Profile '+esc(pos(x.p))+'</span></span><button class="tag b" data-phone-position="'+esc(x.p.id)+'">'+esc(x.position)+' ▾</button></div>';}).join('')+'</div><div class="card"><div class="ck">Bench</div>'+bench().map(function(p){return'<div class="rowline"><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(pos(p))+'</span></span><span class="tag">Bench</span></div>';}).join('')+'</div><button class="bt spend blk" data-mf-goto="3">Continue to events</button><button class="bt gh blk" data-mf-goto="1">Back</button></div>';
    if(S.step===3)return phoneHeader()+'<div class="stack"><div class="card"><div class="two"><div class="field"><label>Minute</label><input class="in" id="mfPhoneEventMinute" type="number"></div><div class="field"><label>Event</label><select class="in" id="mfPhoneEventType"><option>Goal</option><option>Goal conceded</option><option>Yellow card</option><option>Red card</option><option>Substitution</option></select></div></div><div class="field"><label>Player</label><select class="in" id="mfPhoneEventPlayer"><option value="">—</option>'+selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><button class="bt spend blk" id="mfPhoneAddEvent">Add event</button></div><div class="pcap">Matchday log <span>'+S.events.length+'</span></div><div class="card">'+S.events.map(function(e,i){return'<div class="rowline"><span class="who"><b>'+esc(e.type)+'</b><span>'+esc(eventLabel(e))+'</span></span><button class="bt sm gh" data-mf-remove-event="'+i+'">Remove</button></div>';}).join('')+'</div><button class="bt spend blk" data-mf-goto="4">Continue to ratings</button><button class="bt gh blk" data-mf-goto="2">Back</button></div>';
    if(S.step===4)return phoneHeader()+'<div class="stack"><div class="card">'+selectedPlayers().map(function(p){var st=playerState(p.id);return'<div class="rowline"><span class="who"><b>'+esc(name(p))+'</b><span>Played '+esc(S.playedPosition[p.id]||pos(p))+' · '+observationCount(p)+' observed</span></span><span class="ratem '+(st.performance?'set':'')+'">'+esc(st.performance||'—')+'</span><button class="bt sm gh" data-mf-open-ratings="'+esc(p.id)+'">Rate</button></div>';}).join('')+'</div><button class="bt spend blk" data-mf-goto="5">Continue to review</button><button class="bt gh blk" data-mf-goto="3">Back</button></div>';
    return phoneHeader()+'<div class="stack"><div class="card hero"><div class="num" style="font-size:34px;font-weight:700">'+esc((S.homeScore||0)+' – '+(S.awayScore||0))+'</div><b>vs '+esc(S.opponent||'Opponent')+'</b><div class="mut">'+esc(fmtDate(S.matchDate)+' · '+S.format+' · '+S.formation)+'</div></div><div class="card">'+kv('Players updated',selectedPlayers().length)+kv('Events',S.events.length)+kv('Attribute observations',selectedPlayers().reduce(function(sum,p){return sum+Number(observationCount(p).split('/')[0]);},0))+'</div><button class="bt spend blk" id="mfPhoneSubmit">Submit Match Facts</button><button class="bt gh blk" data-mf-goto="4">Back</button></div>';
  }

  function render(){
    if(S.saved){desk.innerHTML=saved();field.innerHTML=phone();return;}
    desk.innerHTML=S.step===1?stage1():S.step===2?stage2():S.step===3?stage3():S.step===4?stage4():stage5();
    field.innerHTML=matchdayMode?matchdayPhone():phone();bind();if(matchdayMode)bindMatchday();document.dispatchEvent(new CustomEvent('coach:rendered'));
  }

  function syncInputs(){
    [['mfHome','homeScore'],['mfPhoneHome','homeScore'],['mfAway','awayScore'],['mfPhoneAway','awayScore'],['mfOpponent','opponent'],['mfDate','matchDate']].forEach(function(x){var el=document.getElementById(x[0]);if(el)el.oninput=function(){S[x[1]]=el.value;saveDraft();};});
    [['mfFormat','format'],['mfFormation','formation'],['mfPhoneFormation','formation'],['mfFormation2','formation']].forEach(function(x){var el=document.getElementById(x[0]);if(el)el.onchange=function(){S[x[1]]=el.value;saveDraft();render();};});
    ['mfFixture','mfPhoneFixture'].forEach(function(id){var el=document.getElementById(id);if(el)el.onchange=function(){S.fixtureId=el.value;S.source=el.value?'fixture':'standalone';applyFixture(currentFixture());saveDraft();render();};});
  }
  function positionSheet(pid){
    var p=S.players.find(function(x){return String(x.id)===String(pid);});if(!p)return;
    var opts=S.options&&Array.isArray(S.options.positions)?S.options.positions:[];
    window.CoachV2.openSheet({title:'Position played · '+name(p),html:'<div class="chips">'+opts.map(function(x){var code=x.code||x.value||x[0],label=x.label||x[1]||code;return'<button class="chip '+((S.playedPosition[p.id]||pos(p))===code?'on':'')+'" data-set-position="'+esc(code)+'">'+esc(code+' · '+label)+'</button>';}).join('')+'</div><div class="help">This changes only the match assessment set. It does not overwrite the profile position.</div>'});
    setTimeout(function(){document.querySelectorAll('[data-set-position]').forEach(function(b){b.onclick=function(){S.playedPosition[p.id]=b.dataset.setPosition;saveDraft();window.CoachV2.closeAll();render();};});},0);
  }
  function ratingsSheet(pid){
    var p=S.players.find(function(x){return String(x.id)===String(pid);});if(!p)return;
    var box=window.CoachV2.openDrawer({title:name(p)+' · played '+(S.playedPosition[p.id]||pos(p))+' today',html:ratingDrawer(p),footer:'<button class="btn p" data-close-coach-overlay>Done</button>'});
    if(!box)return;bindRatings(box);
  }
  function bindRatings(box){
    box.querySelectorAll('[data-mf-rate]').forEach(function(b){b.onclick=function(){
      var st=playerState(b.dataset.mfRate),key=b.dataset.mfKey,val=b.dataset.mfValue===''?null:Number(b.dataset.mfValue);
      if(key==='performance')st.performance=val==null?'':val;else if(val==null)delete st.attributes[key];else st.attributes[key]=val;
      saveDraft();ratingsSheetRefresh(box,b.dataset.mfRate);
    };});
  }
  function ratingsSheetRefresh(box,pid){
    var p=S.players.find(function(x){return String(x.id)===String(pid);});if(!p)return;
    var host=box.querySelector('.ob');if(host){host.innerHTML=ratingDrawer(p);bindRatings(box);}
  }
  function advancedSheet(){
    var fields=['passes_attempted','passes_completed','progressive_passes','line_breaking_passes','progressive_carries','chances_created','take_ons_attempted','take_ons_completed','duels_attempted','duels_won','pressures','successful_pressures','recoveries','blocks','clearances','box_entries','box_touches'];
    window.CoachV2.openDrawer({title:'Advanced match statistics',html:'<div class="callout"><b>Optional.</b> These detailed grassroots metrics are never required to complete Match Facts.</div><div class="field"><label>Player</label><select class="in" id="mfAdvancedPlayer">'+selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('')+'</select></div><div id="mfAdvancedFields"></div>'});
    setTimeout(function(){var sel=document.getElementById('mfAdvancedPlayer');function draw(){var pid=sel.value;if(!S.advanced[pid])S.advanced[pid]={};document.getElementById('mfAdvancedFields').innerHTML='<div class="two">'+fields.map(function(k){return'<div class="field"><label>'+esc(k.replace(/_/g,' '))+'</label><input class="in" type="number" min="0" data-adv-key="'+k+'" value="'+esc(S.advanced[pid][k]||'')+'"></div>';}).join('')+'</div>';document.querySelectorAll('[data-adv-key]').forEach(function(i){i.oninput=function(){S.advanced[pid][i.dataset.advKey]=i.value===''?null:Number(i.value);saveDraft();};});}sel.onchange=draw;draw();},0);
  }

  function bind(){
    document.querySelectorAll('[data-mf-goto]').forEach(function(b){b.onclick=function(){if(!b.disabled)setStep(b.dataset.mfGoto);};});
    document.querySelectorAll('[data-mf-source]').forEach(function(b){b.onclick=function(){S.source=b.dataset.mfSource;if(S.source==='standalone')S.fixtureId='';saveDraft();render();};});
    document.querySelectorAll('[data-mf-select]').forEach(function(b){b.onclick=function(){var id=b.dataset.mfSelect;S.selected[id]=!S.selected[id];if(S.selected[id]&&S.starter[id]==null)S.starter[id]=starters().length<11;saveDraft();render();};});
    document.querySelectorAll('[data-mf-starter]').forEach(function(b){b.onclick=function(){S.starter[b.dataset.mfStarter]=!S.starter[b.dataset.mfStarter];saveDraft();render();};});
    document.querySelectorAll('[data-pitch-player],[data-phone-position]').forEach(function(b){b.onclick=function(){positionSheet(b.dataset.pitchPlayer||b.dataset.phonePosition);};});
    document.querySelectorAll('[data-mf-remove-event]').forEach(function(b){b.onclick=function(){S.events.splice(Number(b.dataset.mfRemoveEvent),1);saveDraft();render();};});
    document.querySelectorAll('[data-mf-open-ratings]').forEach(function(b){b.onclick=function(){ratingsSheet(b.dataset.mfOpenRatings);};});
    syncInputs();
    var last=document.getElementById('mfLastLineup');if(last)last.onclick=loadLast;
    var add=document.getElementById('mfAddEvent');if(add)add.onclick=addEventDesk;
    var addp=document.getElementById('mfPhoneAddEvent');if(addp)addp.onclick=addEventPhone;
    var adv=document.getElementById('mfAdvanced');if(adv)adv.onclick=advancedSheet;
    var apply=document.getElementById('mfApply7');if(apply)apply.onclick=function(){selectedPlayers().forEach(function(p){var st=playerState(p.id);if(!st.performance)st.performance=7;});saveDraft();render();};
    var save=document.getElementById('mfSaveDraft');if(save)save.onclick=function(){saveDraft();window.CoachV2.showToast('Draft saved.');};
    ['mfSubmit','mfPhoneSubmit'].forEach(function(id){var b=document.getElementById(id);if(b)b.onclick=submit;});
    var cancel=document.getElementById('mfCancel');if(cancel)cancel.onclick=function(){if(confirm('Leave Match Facts? Your local draft will stay saved.'))location.href=clean('/coach/dashboard');};
  }
  function addEvent(minute,type,pid,note){
    var e={minute:minute===''?null:Number(minute),type:type,playerId:pid||null,note:note||''};S.events.push(e);
    var st=pid?playerState(pid):null;if(st){if(type==='Goal')st.goals=n(st.goals)+1;if(type==='Assist')st.assists=n(st.assists)+1;if(type==='Yellow card')st.yellowCards=n(st.yellowCards)+1;if(type==='Red card')st.redCards=n(st.redCards)+1;}
    saveDraft();render();
  }
  function addEventDesk(){addEvent(document.getElementById('mfEventMinute').value,document.getElementById('mfEventType').value,document.getElementById('mfEventPlayer').value,document.getElementById('mfEventNote').value);}
  function addEventPhone(){addEvent(document.getElementById('mfPhoneEventMinute').value,document.getElementById('mfPhoneEventType').value,document.getElementById('mfPhoneEventPlayer').value,'');}
  async function loadLast(){
    try{var r=await api('GET','/api/coach-experience/last-lineup'),m=r.match||(r.data&&r.data.match);if(!m||!m.player_positions)throw new Error('No previous line-up is available.');var ids=Object.values(m.player_positions);S.players.forEach(function(p){S.selected[p.id]=ids.indexOf(p.id)>=0;});Object.keys(m.player_positions).forEach(function(slot){var id=m.player_positions[slot],code=String(slot).replace(/\d+$/,'').toUpperCase();S.playedPosition[id]=code;S.starter[id]=true;});S.formation=m.formation||S.formation;saveDraft();render();}catch(e){window.CoachV2.showToast(e.message||'Could not load last line-up.',true);}
  }
  function payload(){
    var ps=selectedPlayers().map(function(p){var st=playerState(p.id),adv=S.advanced[p.id]||{};return Object.assign({
      playerId:p.id,positionPlayed:S.playedPosition[p.id]||pos(p),minutesPlayed:st.minutes||null,
      goals:n(st.goals),assists:n(st.assists),yellowCards:n(st.yellowCards),redCards:n(st.redCards),
      performanceScore:st.performance||null,attributeRatings:st.attributes||{}
    },adv);});
    var positions={};starters().forEach(function(p,i){positions[(S.playedPosition[p.id]||pos(p))+(i+1)]=p.id;});
    return{fixtureId:S.fixtureId||null,matchDate:S.matchDate||new Date().toISOString().slice(0,10),opponent:S.opponent||((currentFixture()||{}).opponent)||null,format:S.format,formation:S.formation,homeScore:S.homeScore===''?null:Number(S.homeScore),awayScore:S.awayScore===''?null:Number(S.awayScore),events:S.events,playerPositions:positions,players:ps,confirmed:true};
  }
  async function submit(){
    var ps=selectedPlayers();if(!ps.length)return window.CoachV2.showToast('Select at least one player.',true);
    if(!S.opponent&&!currentFixture())return window.CoachV2.showToast('Choose a fixture or enter an opponent.',true);
    try{var r=await api('POST','/api/match-facts',payload());S.saved=r;localStorage.removeItem(DRAFT);render();}catch(e){window.CoachV2.showToast(e.message||'Could not save Match Facts.',true);}
  }

  async function init(){
    restore();
    var q=new URLSearchParams(location.search),fixtureId=q.get('fixtureId');if(fixtureId)S.fixtureId=fixtureId;
    try{
      var rs=await Promise.all([api('GET','/api/coach-experience/overview'),window.ScoutLinkScoringV4?window.ScoutLinkScoringV4.loadOptions():api('GET','/api/scoring/options')]);
      var o=rs[0].data||rs[0];S.players=list(o,['players']);S.fixtures=list(o,['fixtures']);S.attendance=list(o,['attendance']);S.scouts=o.scouts||{};S.options=rs[1].data||rs[1];
      if(S.fixtureId)applyFixture(currentFixture());
      if(!S.matchDate)S.matchDate=(currentFixture()||{}).fixture_date||new Date().toISOString().slice(0,10);
      if(!S.opponent)S.opponent=(currentFixture()||{}).opponent||'';
      /* A clean first visit preselects up to 12 visible players, matching the source screen. */
      if(!Object.keys(S.selected||{}).length){S.players.slice(0,12).forEach(function(p,i){S.selected[p.id]=true;S.starter[p.id]=i<11;S.playedPosition[p.id]=pos(p);});}
      render();
    }catch(e){desk.innerHTML='<div class="coach-route-message error">'+esc(e.message||'Match Facts could not load.')+'</div>';field.innerHTML=desk.innerHTML;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

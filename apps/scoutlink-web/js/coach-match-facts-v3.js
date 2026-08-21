'use strict';

(function(){
  if(document.body.getAttribute('data-coach-page')!=='match-facts')return;

  var desk=document.getElementById('coachDeskPage');
  var field=document.getElementById('coachFieldPage');
  var KEY_PREFIX='scoutlink.coach.matchFacts.v6.exact.';
  var S={
    step:1,mobilePhase:'select',ratingPlayer:'',source:'fixture',fixtureId:'',fixture:null,
    fixtures:[],players:[],selected:{},starterIds:[],positions:{},stats:{},ratings:{},
    substitutions:[],homeScore:'',awayScore:'',opponent:'',matchDate:'',venue:'',
    homeOrAway:'Home',format:'9',formation:'',saving:false,saved:null,editMode:false
  };
  var POSITION_OPTIONS={GK:['GK'],DEF:['CB','LB','RB','LWB','RWB'],MID:['DM','CM','AM','LM','RM'],ATT:['LW','RW','ST','CF']};
  var FORMATIONS={
    '5':{
      '1-2-1':[['CB'],['CM','CM'],['ST']],
      '2-1-1':[['CB','CB'],['CM'],['ST']],
      '1-1-2':[['CB'],['CM'],['ST','ST']]
    },
    '6':{
      '2-2-1':[['CB','CB'],['CM','CM'],['ST']],
      '1-3-1':[['CB'],['LM','CM','RM'],['ST']],
      '2-1-2':[['CB','CB'],['CM'],['ST','ST']]
    },
    '7':{
      '2-3-1':[['CB','CB'],['LM','CM','RM'],['ST']],
      '3-2-1':[['LB','CB','RB'],['CM','CM'],['ST']],
      '2-2-2':[['CB','CB'],['CM','CM'],['ST','ST']]
    },
    '8':{
      '3-3-1':[['LB','CB','RB'],['CM','CM','CM'],['ST']],
      '2-3-2':[['CB','CB'],['LM','CM','RM'],['ST','ST']],
      '3-2-2':[['LB','CB','RB'],['CM','CM'],['ST','ST']]
    },
    '9':{
      '3-3-2':[['LB','CB','RB'],['CM','CM','CM'],['ST','ST']],
      '3-2-3':[['LB','CB','RB'],['CM','CM'],['LW','ST','RW']],
      '4-3-1':[['LB','CB','CB','RB'],['CM','CM','CM'],['ST']]
    },
    '10':{
      '3-4-2':[['LB','CB','RB'],['LM','CM','CM','RM'],['ST','ST']],
      '4-3-2':[['LB','CB','CB','RB'],['CM','CM','CM'],['ST','ST']],
      '4-4-1':[['LB','CB','CB','RB'],['LM','CM','CM','RM'],['ST']]
    },
    '11':{
      '4-3-3':[['LB','CB','CB','RB'],['CM','CM','CM'],['LW','ST','RW']],
      '4-2-3-1':[['LB','CB','CB','RB'],['DM','DM'],['LM','AM','RM'],['ST']],
      '4-4-2':[['LB','CB','CB','RB'],['LM','CM','CM','RM'],['ST','ST']],
      '3-5-2':[['CB','CB','CB'],['LWB','CM','CM','CM','RWB'],['ST','ST']],
      '3-4-3':[['CB','CB','CB'],['LM','CM','CM','RM'],['LW','ST','RW']]
    }
  };

  function esc(v){return window.CoachV2.esc(v);}
  function api(m,p,b){return window.CoachV2.api(m,p,b);}
  function clean(p){return window.CoachV2.clean(p);}
  function byId(id){return window.CoachV2.visibleById?window.CoachV2.visibleById(id):document.getElementById(id);}
  function arr(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
  function name(p){return[p&&p.first_name,p&&p.last_name].filter(Boolean).join(' ')||p&&p.name||'Player';}
  function initials(p){return window.CoachV2.initials(name(p));}
  function usual(p){return p.primary_position||p.specific_position||p.position||'CM';}
  function grp(code){code=String(code||'').toUpperCase();if(code==='GK')return'GK';if(['CB','LB','RB','LWB','RWB'].indexOf(code)>=0)return'DEF';if(['DM','CM','AM','LM','RM'].indexOf(code)>=0)return'MID';return'ATT';}
  function posOptions(p){return POSITION_OPTIONS[grp(S.positions[p.id]||usual(p))]||[usual(p)];}
  function playerById(id){return S.players.find(function(p){return String(p.id)===String(id);})||null;}
  function selectedPlayers(){return S.players.filter(function(p){return !!S.selected[p.id];});}
  function formatOptions(){return[5,6,7,8,9,10,11];}
  function formationOptions(){
    var group=FORMATIONS[String(S.format)]||FORMATIONS['9'];
    return Object.keys(group);
  }
  function ensureFormation(){
    if(!FORMATIONS[String(S.format)])S.format='9';
    var choices=formationOptions();
    if(choices.indexOf(S.formation)<0)S.formation=choices[0]||'';
  }
  function xPositions(count){
    if(count===1)return[210];
    if(count===2)return[135,285];
    if(count===3)return[90,210,330];
    if(count===4)return[60,160,260,360];
    if(count===5)return[46,128,210,292,374];
    var out=[],gap=330/Math.max(1,count-1);
    for(var i=0;i<count;i++)out.push(45+(gap*i));
    return out;
  }
  function formationSlots(){
    ensureFormation();
    var lines=(FORMATIONS[String(S.format)]&&FORMATIONS[String(S.format)][S.formation])||[];
    var counts={},slots=[{key:'GK1',position:'GK',x:210,y:515,line:-1}];
    lines.forEach(function(line,lineIndex){
      var y=lines.length===1?270:440-(lineIndex*(335/Math.max(1,lines.length-1)));
      var xs=xPositions(line.length);
      line.forEach(function(position,i){
        counts[position]=(counts[position]||0)+1;
        slots.push({key:position+counts[position],position:position,x:xs[i],y:y,line:lineIndex});
      });
    });
    return slots;
  }
  function starterLimit(){return formationSlots().length;}
  function reconcileStarters(){
    ensureFormation();
    var slots=formationSlots(),selectedIds=selectedPlayers().map(function(p){return String(p.id);});
    var old=Array.isArray(S.starterIds)?S.starterIds.slice(0,slots.length):[];
    while(old.length<slots.length)old.push('');
    var used={};
    old=old.map(function(id){
      id=String(id||'');
      if(!id||selectedIds.indexOf(id)<0||used[id])return'';
      used[id]=true;
      return id;
    });
    selectedIds.forEach(function(id){
      if(used[id])return;
      var empty=old.indexOf('');
      if(empty>=0){old[empty]=id;used[id]=true;}
    });
    S.starterIds=old;
    slots.forEach(function(slot,i){
      var id=old[i];
      if(id)S.positions[id]=slot.position;
    });
  }
  function starters(){reconcileStarters();return S.starterIds.map(playerById).filter(Boolean);}
  function bench(){reconcileStarters();var ss=new Set(S.starterIds.filter(Boolean).map(String));return selectedPlayers().filter(function(p){return !ss.has(String(p.id));});}
  function starterIndex(id){reconcileStarters();return S.starterIds.findIndex(function(x){return String(x||'')===String(id);});}
  function stat(id){if(!S.stats[id])S.stats[id]={goals:0,assists:0,yellowCards:0,redCards:0,minutes:''};return S.stats[id];}
  function rating(id){var v=S.ratings[id];return v===undefined||v===null?'':v;}
  function draftKey(){return KEY_PREFIX+(S.fixtureId?String(S.fixtureId):'new');}
  function serialisableState(){
    return {
      step:S.step,mobilePhase:S.mobilePhase,source:S.source,fixtureId:S.fixtureId,
      selected:S.selected,starterIds:S.starterIds,positions:S.positions,stats:S.stats,ratings:S.ratings,
      substitutions:S.substitutions,homeScore:S.homeScore,awayScore:S.awayScore,opponent:S.opponent,
      matchDate:S.matchDate,venue:S.venue,homeOrAway:S.homeOrAway,format:S.format,formation:S.formation
    };
  }
  function saveDraft(){try{localStorage.setItem(draftKey(),JSON.stringify(serialisableState()));}catch(_){}}
  function restoreForCurrentKey(){
    try{
      var raw=localStorage.getItem(draftKey());
      var x=raw?JSON.parse(raw):null;
      if(x)S=Object.assign(S,x,{fixtures:S.fixtures,players:S.players,saved:null,saving:false,editMode:S.editMode});
    }catch(_){}
    reconcileStarters();
  }
  function clearDraft(){try{localStorage.removeItem(draftKey());}catch(_){}}

  function stepper(n){
    var l=['Match details','Build lineup','Score & events','Rate performances','Review & save'];
    return'<div class="stepper">'+l.map(function(x,i){var k=i+1,cl=k<n?' dn':k===n?' on':'';return'<div class="sp-i'+cl+'"><b>'+(k<n?'✓':k)+'</b><span>'+esc(x)+'</span></div>'+(k<5?'<div class="ln'+(k<n?' dn':'')+'"></div>':'');}).join('')+'</div>';
  }
  function heading(t,s){return'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">'+esc(t)+'</h1><p class="mut" style="margin:0 0 20px">'+esc(s)+'</p>';}
  function footer(back,next,label){return'<div class="flex" style="margin-top:22px;justify-content:flex-end">'+(back?'<button class="btn outline" type="button" data-mf-go="'+back+'">Back</button>':'<a class="btn outline" href="'+esc(clean('/coach/dashboard'))+'">Cancel</a>')+'<button class="btn volt" type="button" data-mf-go="'+next+'">'+esc(label||'Continue')+'</button></div>';}

  function applyFixture(f){
    if(!f)return;
    S.source='fixture';S.fixtureId=f.id;S.fixture=f;S.opponent=f.opponent||'';
    S.matchDate=String(f.fixture_date||'').slice(0,10);S.venue=f.venue||'';
    S.homeOrAway=f.home_or_away||'Home';
    S.format=String(f.format||'9').replace(/[^\d]/g,'')||'9';
    ensureFormation();reconcileStarters();
  }

  function resetMatchState(){
    S.step=1;S.mobilePhase='select';S.ratingPlayer='';
    S.selected={};S.starterIds=[];S.positions={};S.stats={};S.ratings={};
    S.substitutions=[];S.homeScore='';S.awayScore='';S.formation='';
    S.saved=null;S.saving=false;S.editMode=false;
  }

  function matchShape(){
    ensureFormation();
    return'<div class="card" style="margin-top:16px"><div class="card-h"><h3>Match shape</h3><span class="sp"></span><span class="hint">This controls the pitch in step 2</span></div><div class="card-b"><div class="two"><div class="field"><label>Format</label><select class="in" id="mfFormat">'+formatOptions().map(function(x){return'<option value="'+x+'"'+(String(S.format)===String(x)?' selected':'')+'>'+x+'-a-side</option>';}).join('')+'</select></div><div class="field"><label>Formation</label><select class="in" id="mfFormation">'+formationOptions().map(function(x){return'<option value="'+esc(x)+'"'+(S.formation===x?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></div></div><div class="help">Formation numbers are the outfield lines; the goalkeeper is added automatically.</div></div></div>';
  }
  function step1(){
    ensureFormation();
    var newMatch=S.source==='new';
    var existing='<div class="card"><div class="card-b">'+(S.fixtures.length?S.fixtures.map(function(f){return'<div class="list-row" data-fixture="'+esc(f.id)+'"><span class="who"><b>'+esc(f.opponent||'Opponent')+'</b><span>'+esc(String(f.fixture_date||'')+(f.venue?' · '+f.venue:''))+'</span></span><span class="pill '+(String(S.fixtureId)===String(f.id)?'g':'n')+'">'+(String(S.fixtureId)===String(f.id)?'Selected':'Choose')+'</span></div>';}).join(''):'<div class="empty"><b>No fixtures available</b></div>')+'</div></div>';
    var manual='<div class="callout g">Not every match is on the fixture list — a friendly, a tournament game, a rearranged date. Enter it here and it\'s saved as a fixture automatically.</div><div style="margin-top:16px"><div class="two"><div class="field"><label>Opponent</label><input class="in" id="mfOpponent" value="'+esc(S.opponent)+'" placeholder="e.g. Burnage Bulldogs"></div><div class="field"><label>Match date</label><input class="in" id="mfDate" type="date" value="'+esc(S.matchDate)+'"></div></div><div class="two"><div class="field"><label>Home or away <em>Optional</em></label><select class="in" id="mfHomeAway"><option'+(S.homeOrAway==='Home'?' selected':'')+'>Home</option><option'+(S.homeOrAway==='Away'?' selected':'')+'>Away</option></select></div><div class="field"><label>Venue <em>Optional</em></label><input class="in" id="mfVenue" value="'+esc(S.venue)+'" placeholder="e.g. Chorlton Park 3G"></div></div></div>';
    return stepper(1)+heading('Match details',S.editMode?'You are editing the saved Match Facts for this fixture. Saving updates the existing player records instead of creating duplicates.':'Pick a fixture already on your calendar, or enter a match that isn\'t. Then choose the match format and formation before building the lineup.')+'<div class="seg" style="max-width:420px;margin-bottom:18px"><a class="'+(!newMatch?'on':'')+'" href="#" data-mf-source="fixture">Pick an existing fixture</a><a class="'+(newMatch?'on':'')+'" href="#" data-mf-source="new">Enter a new match</a></div>'+(newMatch?manual:existing)+matchShape()+footer('',2,'Continue');
  }

  function playerSelectRow(p){
    return'<div class="list-row" data-squad-player data-search-text="'+esc((name(p)+' '+usual(p)+' '+(p.age_group||'')).toLowerCase())+'" data-mf-select="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||''))+'</span></span><span class="pill '+(S.selected[p.id]?'g':'n')+'">'+(S.selected[p.id]?'Selected':'Did not play')+'</span></div>';
  }
  function positionBlock(p){
    var idx=starterIndex(p.id),slots=formationSlots(),slot=idx>=0?slots[idx]:null,cur=S.positions[p.id]||usual(p);
    if(slot){
      return'<div class="list-row" data-squad-player data-search-text="'+esc((name(p)+' '+usual(p)+' '+(p.age_group||'')+' '+slot.position).toLowerCase())+'" style="cursor:default"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||''))+'</span><label style="display:block;margin-top:10px;font-family:var(--mono);font-size:9.5px;color:var(--ink3)">Formation position</label><div class="flex" style="margin-top:7px;gap:7px"><span class="pill g">'+esc(slot.position)+'</span><button class="btn sm outline" type="button" data-move-player="'+esc(p.id)+'">Move on pitch</button><button class="btn sm outline" type="button" data-mf-select="'+esc(p.id)+'">Did not play</button></div></span></div>';
    }
    return'<div class="list-row" data-squad-player data-search-text="'+esc((name(p)+' '+usual(p)+' '+(p.age_group||'')).toLowerCase())+'" style="cursor:default"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||'')+' · substitute')+'</span><label style="display:block;margin-top:10px;font-family:var(--mono);font-size:9.5px;color:var(--ink3)">Position played <em>Optional</em></label><div class="flex" style="margin-top:7px;gap:7px">'+posOptions(p).map(function(code){return'<button class="btn sm '+(cur===code?'pitch':'outline')+'" data-mf-position="'+esc(p.id)+'" data-position="'+code+'">'+code+'</button>';}).join('')+'<button class="btn sm outline" type="button" data-move-player="'+esc(p.id)+'">Place on pitch</button><button class="btn sm outline" data-mf-select="'+esc(p.id)+'">Did not play</button></div></span></div>';
  }
  function pitch(){
    reconcileStarters();
    var slots=formationSlots();
    var playersSvg=slots.map(function(slot,i){
      var p=playerById(S.starterIds[i]),assigned=!!p;
      return'<g data-mf-slot="'+i+'" style="cursor:pointer"><circle cx="'+slot.x+'" cy="'+slot.y+'" r="23" fill="'+(assigned?'#F7F6F0':'rgba(247,246,240,.15)')+'" stroke="'+(assigned?'#D8F547':'rgba(255,255,255,.7)')+'" stroke-width="2.5"'+(assigned?'':' stroke-dasharray="5 4"')+'/><text x="'+slot.x+'" y="'+(slot.y+4)+'" text-anchor="middle" font-family="var(--mono)" font-size="'+(assigned?'10':'17')+'" font-weight="700" fill="'+(assigned?'#0C201A':'#fff')+'">'+(assigned?esc(initials(p)):'+')+'</text><rect x="'+(slot.x-31)+'" y="'+(slot.y+29)+'" width="62" height="18" rx="9" fill="rgba(6,32,26,.82)"/><text x="'+slot.x+'" y="'+(slot.y+41)+'" text-anchor="middle" font-family="var(--mono)" font-size="8.5" font-weight="700" fill="#fff">'+esc(slot.position)+'</text></g>';
    }).join('');
    return'<svg viewBox="0 0 420 580" width="100%" style="max-width:420px;display:block;margin:0 auto;background:var(--pitch);border-radius:var(--r-md)" aria-label="'+esc(S.format+'-a-side '+S.formation+' formation')+'"><rect x="18" y="18" width="384" height="544" rx="8" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="2"/><line x1="18" y1="290" x2="402" y2="290" stroke="rgba(255,255,255,.72)" stroke-width="2"/><circle cx="210" cy="290" r="58" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="2"/><rect x="120" y="18" width="180" height="66" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><rect x="120" y="496" width="180" height="66" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>'+playersSvg+'</svg>';
  }
  function squadSearchInput(id,placeholder){
    return'<label class="in" style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span>⌕</span><input id="'+id+'" placeholder="'+esc(placeholder)+'" style="border:0;outline:0;background:transparent;width:100%;font:inherit"></label>';
  }
  function step2Desk(){
    reconcileStarters();
    return stepper(2)+heading('Build your lineup','Your '+S.format+'-a-side '+S.formation+' formation is shown on the pitch. Tap a pitch position to choose exactly who played there.')+'<div class="callout g">'+selectedPlayers().length+' of '+S.players.length+' selected · '+starters().length+' of '+starterLimit()+' formation positions filled. Extra selected players stay on the bench.</div><div class="two" style="margin-top:16px;align-items:flex-start"><div class="card"><div class="card-h"><h3>Lineup on the pitch</h3><span class="sp"></span><span class="hint">'+esc(S.formation+' · '+S.format+'-a-side')+'</span></div><div class="card-b">'+pitch()+'<div class="help" style="text-align:center;margin-top:12px">Tap any pitch position to assign or change the player in that role.</div></div></div><div class="card"><div class="card-h"><h3>Squad ('+S.players.length+')</h3><span class="sp"></span></div><div class="card-b">'+squadSearchInput('deskMfSearch','Search squad by name or position...')+S.players.map(function(p){return S.selected[p.id]?positionBlock(p):playerSelectRow(p);}).join('')+'</div></div></div>'+footer(1,3,'Continue');
  }
  function step2Field(){
    reconcileStarters();
    if(S.mobilePhase==='positions'){
      return heading('Set positions','Step 2 of 5 · '+S.format+'-a-side · '+S.formation)+'<div class="card"><div class="card-h"><h3>Lineup on the pitch</h3><span class="sp"></span><span class="hint">'+starters().length+' / '+starterLimit()+'</span></div><div class="card-b">'+pitch()+'<div class="help" style="text-align:center;margin-top:10px">Tap a pitch position to choose the player who played there.</div></div></div><div class="card" style="margin-top:14px"><div class="card-b">'+selectedPlayers().map(positionBlock).join('')+'</div></div>'+footer('select',3,'Continue');
    }
    return heading('Who played?','Step 2 of 5 · tap each player who featured')+squadSearchInput('fieldMfSearch','Search squad...')+'<div class="card" style="margin-bottom:12px"><div class="card-b"><b>'+selectedPlayers().length+' of '+S.players.length+' selected</b><span class="mut" style="display:block;margin-top:4px">'+esc(S.format+'-a-side · '+S.formation)+'</span></div></div><div class="card"><div class="card-b">'+S.players.map(playerSelectRow).join('')+'</div></div>'+footer(1,'positions','Set positions');
  }
  function assignPlayerToSlot(slotIndex,playerId){
    reconcileStarters();
    var slots=formationSlots(),slot=slots[slotIndex],id=String(playerId||'');
    if(!slot||!id)return;
    for(var i=0;i<S.starterIds.length;i++){
      if(String(S.starterIds[i]||'')===id)S.starterIds[i]='';
    }
    S.selected[id]=true;
    S.starterIds[slotIndex]=id;
    S.positions[id]=slot.position;
    reconcileStarters();
    saveDraft();
  }
  function slotChooser(slotIndex){
    reconcileStarters();
    var slots=formationSlots(),slot=slots[slotIndex];
    if(!slot)return;
    var current=S.starterIds[slotIndex]||'';
    var box=window.CoachV2.openSheet({
      title:'Choose '+slot.position,
      html:'<div class="callout g">Assign the player who played '+esc(slot.position)+' in the '+esc(S.formation)+' formation.</div><div class="card" style="margin-top:14px"><div class="card-b">'+S.players.map(function(p){return'<button class="list-row" type="button" data-assign-slot="'+slotIndex+'" data-slot-player="'+esc(p.id)+'" style="width:100%;border:0;background:transparent;text-align:left"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||''))+'</span></span><span class="pill '+(String(current)===String(p.id)?'g':'n')+'">'+(String(current)===String(p.id)?'Selected':'Choose')+'</span></button>';}).join('')+'</div></div>',
      footer:(current?'<button class="btn outline" type="button" data-clear-slot="'+slotIndex+'">Clear position</button>':'')+'<button class="btn outline" type="button" data-close-coach-overlay>Cancel</button>'
    });
    setTimeout(bind,0);
    return box;
  }
  function movePlayer(playerId){
    reconcileStarters();
    var slots=formationSlots();
    window.CoachV2.openSheet({
      title:'Move on pitch',
      html:'<div class="callout g">Choose the position '+esc(name(playerById(playerId)||{}))+' played in the '+esc(S.formation)+' formation.</div><div class="card" style="margin-top:14px"><div class="card-b">'+slots.map(function(slot,i){var occupant=playerById(S.starterIds[i]);return'<button class="list-row" type="button" data-move-to-slot="'+i+'" data-moving-player="'+esc(playerId)+'" style="width:100%;border:0;background:transparent;text-align:left"><span class="who"><b>'+esc(slot.position)+'</b><span>'+esc(occupant?name(occupant):'Empty position')+'</span></span><span class="chev">›</span></button>';}).join('')+'</div></div>',
      footer:'<button class="btn outline" type="button" data-close-coach-overlay>Cancel</button>'
    });
    setTimeout(bind,0);
  }
  function applySquadSearch(input){
    var q=String(input.value||'').trim().toLowerCase(),root=input.closest('.card')||document;
    root.querySelectorAll('[data-squad-player]').forEach(function(row){
      row.style.display=!q||String(row.dataset.searchText||'').indexOf(q)>=0?'':'none';
    });
  }

  function numberField(id,key,label){var x=stat(id);return'<div class="field" style="margin:0"><label>'+esc(label)+' <em>Optional</em></label><input class="in" type="number" min="0" data-stat-player="'+esc(id)+'" data-stat="'+key+'" value="'+esc(x[key])+'"></div>';}
  function playerStatsBlock(p,kind){
    var fields=kind==='ga'?numberField(p.id,'goals','Goals')+numberField(p.id,'assists','Assists'):numberField(p.id,'yellowCards','Yellow')+numberField(p.id,'redCards','Red card');
    return'<div class="list-row" style="cursor:default;align-items:flex-start"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><div class="two" style="margin-top:10px">'+fields+'</div></span></div>';
  }
  function scoreCard(){
    return'<div class="card"><div class="card-h"><h3>Final score</h3><span class="sp"></span><span class="hint">'+esc(window.CoachV2.teamName())+' – '+esc(S.opponent||'Opponent')+'</span></div><div class="card-b"><div class="two"><div class="field"><label>'+esc(window.CoachV2.teamName())+'</label><input class="in" id="mfHomeScore" type="number" min="0" value="'+esc(S.homeScore)+'"></div><div class="field"><label>'+esc(S.opponent||'Opponent')+'</label><input class="in" id="mfAwayScore" type="number" min="0" value="'+esc(S.awayScore)+'"></div></div></div></div>';
  }
  function substitutions(){
    return'<div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Substitutions</h3><span class="sp"></span><span class="hint">Who came off, who came on</span></div><div class="card-b">'+S.substitutions.map(function(s){return'<div class="list-row"><span class="who"><b>'+esc(s.offName)+' → '+esc(s.onName)+'</b><span>'+esc(s.minute?s.minute+' min':'Minute not set')+'</span></span></div>';}).join('')+'<button class="btn outline" type="button" data-add-sub>Add another substitution</button></div></div></div>';
  }
  function step3(){
    var ps=selectedPlayers();
    return stepper(3)+heading('Score & events','The headline score, plus everything that happened — goals, assists, cards and subs. Ratings come next.')+scoreCard()+'<div class="two" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Goals & assists</h3><span class="sp"></span><span class="hint">Who scored, and who set it up</span></div><div class="card-b">'+ps.map(function(p){return playerStatsBlock(p,'ga');}).join('')+'</div></div><div class="card"><div class="card-h"><h3>Cards</h3><span class="sp"></span><span class="hint">Yellow and red, per player</span></div><div class="card-b">'+ps.map(function(p){return playerStatsBlock(p,'cards');}).join('')+'</div></div></div>'+substitutions()+footer(2,4,'Continue');
  }

  function minuteText(p){var x=stat(p.id);return x.minutes===''?'Minutes not recorded':String(x.minutes)+' min';}
  function rateScale(p){
    var v=rating(p.id);return'<div class="rate-row"><div class="rr-top"><b>Overall rating</b><span class="cur '+(v===''?'off':'')+'">'+(v===''?'Not observed':Number(v).toFixed(1))+'</span></div><div class="rscale">'+[1,2,3,4,5,6,7,8,9,10].map(function(x){return'<u class="'+(Number(v)===x?'on':'')+'" data-rating-player="'+esc(p.id)+'" data-rating="'+x+'">'+x+'</u>';}).join('')+'<u class="na '+(v===''?'on':'')+'" data-rating-player="'+esc(p.id)+'" data-rating="">Not observed</u></div></div>';
  }
  function ratingPlayer(p){return'<div style="padding:18px 0;border-bottom:1px solid var(--line)"><div class="flex" style="margin-bottom:12px"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc((S.positions[p.id]||usual(p))+' · '+minuteText(p))+'</span></span></div>'+rateScale(p)+'</div>';}
  function step4Desk(){
    return stepper(4)+heading('Rate performances','One overall rating per player, out of 10.')+'<div class="callout g">Goals, assists and cards were captured in the last step — this is just your judgement call on each performance, out of 10. No individual attribute ratings are collected after a match.</div><div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Players who featured ('+selectedPlayers().length+')</h3><span class="sp"></span></div><div class="card-b">'+selectedPlayers().map(ratingPlayer).join('')+'</div></div></div>'+footer(3,5,'Continue');
  }
  function ratingListRow(p){var v=rating(p.id);return'<div class="list-row" data-open-rating="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc((S.positions[p.id]||usual(p))+' · '+minuteText(p))+'</span></span>'+(v===''?'<span class="pill a">Not rated</span>':'<span class="rate-chip">'+Number(v).toFixed(1)+'<small>/10</small></span>')+'</div>';}
  function step4Field(){
    return heading('Rate performances','Step 4 of 5 · one player at a time')+'<div class="callout g">Goals, assists and cards were captured in the last step. Tap a player to give one overall rating out of 10.</div><div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Players who featured ('+selectedPlayers().length+')</h3><span class="sp"></span></div><div class="card-b">'+selectedPlayers().map(ratingListRow).join('')+'</div></div></div>'+footer(3,5,'Review');
  }
  function ratingSheet(p){
    window.CoachV2.openSheet({title:'Rate this performance',html:'<div class="flex" style="margin-bottom:16px"><span class="avatar">'+esc(initials(p))+'</span><div><b style="font-size:14px">'+esc(name(p))+'</b><span class="mut" style="font-size:11.5px;display:block">'+esc((S.positions[p.id]||usual(p))+' · '+minuteText(p)+' vs '+(S.opponent||'Opponent'))+'</span></div></div>'+rateScale(p),footer:'<button class="btn outline" data-close-coach-overlay>Cancel</button><button class="btn volt" data-save-rating>Save</button>'});
    setTimeout(bind,0);
  }

  function eventCounts(){var o={goals:0,assists:0,yellow:0,red:0};selectedPlayers().forEach(function(p){var x=stat(p.id);o.goals+=Number(x.goals)||0;o.assists+=Number(x.assists)||0;o.yellow+=Number(x.yellowCards)||0;o.red+=Number(x.redCards)||0;});return o;}
  function review(){
    var e=eventCounts(),rated=selectedPlayers().filter(function(p){return rating(p.id)!=='';}).length,hs=Number(S.homeScore)||0,as=Number(S.awayScore)||0,w=hs>as?'W':hs<as?'L':'D';
    return stepper(5)+'<div class="card" style="text-align:center"><div class="card-b"><div class="mut" style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em">Final score</div><div style="font-family:var(--display);font-weight:400;font-size:42px;margin-top:10px">'+w+' '+hs+'-'+as+'</div><div style="font-weight:700;margin-top:8px">'+esc(window.CoachV2.teamName()+' vs '+(S.opponent||'Opponent'))+'</div><p class="mut" style="margin:6px 0 0">'+esc((S.matchDate||'')+(S.venue?' · '+S.venue:''))+'</p></div></div><div style="margin-top:16px"><div class="callout g">'+rated+' of '+selectedPlayers().length+' players rated. '+e.goals+' goal'+(e.goals===1?'':'s')+', '+e.assists+' assist'+(e.assists===1?'':'s')+', '+S.substitutions.length+' substitution'+(S.substitutions.length===1?'':'s')+' and '+e.yellow+' yellow card'+(e.yellow===1?'':'s')+' logged. Saving '+(S.editMode?'updates the existing fixture records.':'creates the fixture Match Facts.')+'</div></div><div class="flex" style="margin-top:20px;justify-content:flex-end"><button class="btn outline" data-mf-go="4">Back</button><button class="btn volt" data-save-match '+(S.saving?'disabled':'')+'>'+(S.saving?'Saving…':S.editMode?'Update Match Facts':'Finish & save')+'</button></div>';
  }

  function sync(){
    var x=byId('mfOpponent');if(x)S.opponent=x.value.trim();
    x=byId('mfDate');if(x)S.matchDate=x.value;
    x=byId('mfVenue');if(x)S.venue=x.value.trim();
    x=byId('mfHomeAway');if(x)S.homeOrAway=x.value;
    x=byId('mfFormat');if(x)S.format=x.value;
    x=byId('mfFormation');if(x)S.formation=x.value;
    ensureFormation();reconcileStarters();
    x=byId('mfHomeScore');if(x)S.homeScore=x.value;
    x=byId('mfAwayScore');if(x)S.awayScore=x.value;
  }
  function validate(next){
    sync();
    if(Number(next)>=2){
      if(S.source==='fixture'&&!S.fixtureId)return'Choose an existing fixture or enter a new match.';
      if(S.source==='new'&&(!S.opponent||!S.matchDate))return'Opponent and match date are required.';
      if(!FORMATIONS[String(S.format)])return'Choose a supported match format.';
      if(formationOptions().indexOf(S.formation)<0)return'Choose a formation for this match format.';
    }
    if(Number(next)>=3&&!selectedPlayers().length)return'Select at least one player.';
    if(Number(next)>=4&&(S.homeScore===''||S.awayScore===''))return'Enter the final score.';
    return'';
  }
  function go(next){
    sync();
    if(next==='positions'){S.mobilePhase='positions';saveDraft();render();return;}
    if(next==='select'){S.mobilePhase='select';saveDraft();render();return;}
    var e=validate(next);if(e)return window.CoachV2.showToast(e,true);
    S.step=Math.max(1,Math.min(5,Number(next)));S.mobilePhase='select';saveDraft();render();window.scrollTo(0,0);
  }

  function addSub(){
    var opts=selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('');
    var box=window.CoachV2.openSheet({title:'Add substitution',html:'<div class="field"><label>Player off</label><select class="in" id="subOff">'+opts+'</select></div><div class="field"><label>Player on</label><select class="in" id="subOn">'+opts+'</select></div><div class="field"><label>Minute <em>Optional</em></label><input class="in" id="subMin" type="number" min="0" max="180"></div>',footer:'<button class="btn volt" id="saveSub">Save substitution</button>'});
    setTimeout(function(){
      var save=box.querySelector('#saveSub');
      if(!save)return;
      save.onclick=function(){
        var off=box.querySelector('#subOff').value,on=box.querySelector('#subOn').value;
        if(!off||!on||off===on)return window.CoachV2.showToast('Choose two different players.',true);
        S.substitutions.push({off:off,on:on,offName:name(playerById(off)||{}),onName:name(playerById(on)||{}),minute:box.querySelector('#subMin').value});
        window.CoachV2.closeAll();saveDraft();render();
      };
    },0);
  }

  async function ensureFixture(){
    if(S.fixtureId)return S.fixtureId;
    if(S.source!=='new')return null;
    var r=await api('POST','/api/fixtures',{opponent:S.opponent,fixtureDate:S.matchDate,venue:S.venue||null,homeOrAway:S.homeOrAway,format:S.format,notes:'Created from Match Facts'});
    var f=r.fixture||r.data||r||{};
    if(!f.id)throw new Error('The new fixture could not be created.');
    try{localStorage.removeItem(KEY_PREFIX+'new');}catch(_){}
    S.fixtureId=f.id;S.fixture=f;saveDraft();return f.id;
  }
  async function persistFixtureFormat(fid){
    if(!fid||!S.fixture||S.source!=='fixture')return;
    var current=String(S.fixture.format||'').replace(/[^\d]/g,'');
    if(current===String(S.format))return;
    var r=await api('PUT','/api/fixtures/'+encodeURIComponent(fid),{format:String(S.format)});
    var updated=r.fixture||r.data||r||{};
    if(updated&&updated.id)S.fixture=updated;
  }

  async function saveMatch(){
    if(S.saving)return;
    var e=validate(5);if(e)return window.CoachV2.showToast(e,true);
    S.saving=true;render();
    try{
      var fid=await ensureFixture(),events=[];
      await persistFixtureFormat(fid);
      selectedPlayers().forEach(function(p){
        var x=stat(p.id),i;
        for(i=0;i<Number(x.goals||0);i++)events.push({type:'goal',playerId:p.id,playerName:name(p)});
        for(i=0;i<Number(x.assists||0);i++)events.push({type:'assist',playerId:p.id,playerName:name(p)});
        for(i=0;i<Number(x.yellowCards||0);i++)events.push({type:'yellow_card',playerId:p.id,playerName:name(p)});
        for(i=0;i<Number(x.redCards||0);i++)events.push({type:'red_card',playerId:p.id,playerName:name(p)});
      });
      S.substitutions.forEach(function(s){events.push({type:'substitution',playerOffId:s.off,playerOnId:s.on,minute:s.minute?Number(s.minute):null});});
      var payload={
        fixtureId:fid||null,matchDate:S.matchDate,opponent:S.opponent,format:S.format,formation:S.formation||null,
        homeScore:Number(S.homeScore),awayScore:Number(S.awayScore),events:events,playerPositions:{},confirmed:true,
        players:selectedPlayers().map(function(p){var x=stat(p.id),r=rating(p.id);return{
          playerId:p.id,positionPlayed:S.positions[p.id]||usual(p),
          minutesPlayed:x.minutes===''?null:Number(x.minutes),goals:Number(x.goals)||0,assists:Number(x.assists)||0,
          yellowCards:Number(x.yellowCards)||0,redCards:Number(x.redCards)||0,
          performanceScore:r===''?null:Number(r)
        };})
      };
      var slots=formationSlots();
      reconcileStarters();
      slots.forEach(function(slot,i){if(S.starterIds[i])payload.playerPositions[slot.key]=S.starterIds[i];});
      /* Intentionally no attributeRatings: post-match Coach assessment is overall /10 only. */
      S.saved=await api('POST','/api/match-facts',payload);
      S.saving=false;clearDraft();render();
    }catch(err){
      S.saving=false;render();window.CoachV2.showToast(err.message||'Could not save Match Facts.',true);
    }
  }

  function bind(){
    document.querySelectorAll('[data-mf-source]').forEach(function(a){a.onclick=function(e){e.preventDefault();sync();S.source=a.dataset.mfSource;if(S.source==='new'){S.fixtureId='';S.fixture=null;S.editMode=false;}saveDraft();render();};});
    document.querySelectorAll('[data-fixture]').forEach(function(r){r.onclick=async function(){
      var f=S.fixtures.find(function(x){return String(x.id)===String(r.dataset.fixture);});
      if(!f)return;
      if(String(S.fixtureId||'')!==String(f.id)){resetMatchState();}
      applyFixture(f);
      try{
        var existing=await api('GET','/api/match-facts?fixtureId='+encodeURIComponent(f.id)+'&limit=100');
        hydrateExisting(arr(existing,['data','matchFacts']));
      }catch(error){
        window.CoachV2.showToast(error.message||'Could not load existing Match Facts.',true);
        return;
      }
      restoreForCurrentKey();
      saveDraft();
      render();
    };});
    document.querySelectorAll('[data-mf-go]').forEach(function(b){b.onclick=function(){go(b.dataset.mfGo);};});
    var fmt=byId('mfFormat');if(fmt)fmt.onchange=function(){sync();ensureFormation();reconcileStarters();saveDraft();render();};
    var formation=byId('mfFormation');if(formation)formation.onchange=function(){S.formation=formation.value;reconcileStarters();saveDraft();render();};
    document.querySelectorAll('[data-mf-slot]').forEach(function(g){g.onclick=function(){slotChooser(Number(g.dataset.mfSlot));};});
    document.querySelectorAll('[data-assign-slot]').forEach(function(b){b.onclick=function(){assignPlayerToSlot(Number(b.dataset.assignSlot),b.dataset.slotPlayer);window.CoachV2.closeAll();render();};});
    document.querySelectorAll('[data-clear-slot]').forEach(function(b){b.onclick=function(){reconcileStarters();S.starterIds[Number(b.dataset.clearSlot)]='';window.CoachV2.closeAll();saveDraft();render();};});
    document.querySelectorAll('[data-move-player]').forEach(function(b){b.onclick=function(){movePlayer(b.dataset.movePlayer);};});
    document.querySelectorAll('[data-move-to-slot]').forEach(function(b){b.onclick=function(){assignPlayerToSlot(Number(b.dataset.moveToSlot),b.dataset.movingPlayer);window.CoachV2.closeAll();render();};});
    ['deskMfSearch','fieldMfSearch'].forEach(function(id){var input=byId(id);if(input)input.oninput=function(){applySquadSearch(input);};});
    document.querySelectorAll('[data-mf-select]').forEach(function(r){r.onclick=function(){
      var id=r.dataset.mfSelect;
      S.selected[id]=!S.selected[id];
      if(S.selected[id]){
        S.positions[id]=S.positions[id]||usual(playerById(id)||{});
      }else{
        delete S.positions[id];delete S.ratings[id];delete S.stats[id];
        S.starterIds=(S.starterIds||[]).map(function(x){return String(x||'')===String(id)?'':x;});
      }
      reconcileStarters();saveDraft();render();
    };});
    document.querySelectorAll('[data-mf-position]').forEach(function(b){b.onclick=function(){S.positions[b.dataset.mfPosition]=b.dataset.position;saveDraft();render();};});
    document.querySelectorAll('[data-stat-player]').forEach(function(x){x.oninput=function(){stat(x.dataset.statPlayer)[x.dataset.stat]=x.value;saveDraft();};});
    document.querySelectorAll('[data-add-sub]').forEach(function(b){b.onclick=addSub;});
    document.querySelectorAll('[data-rating-player]').forEach(function(u){u.onclick=function(){S.ratings[u.dataset.ratingPlayer]=u.dataset.rating===''?'':Number(u.dataset.rating);saveDraft();if(innerWidth<=760&&S.ratingPlayer)return;render();};});
    document.querySelectorAll('[data-open-rating]').forEach(function(r){r.onclick=function(){S.ratingPlayer=r.dataset.openRating;ratingSheet(playerById(S.ratingPlayer)||{});};});
    document.querySelectorAll('[data-save-rating]').forEach(function(b){b.onclick=function(){S.ratingPlayer='';window.CoachV2.closeAll();saveDraft();render();};});
    document.querySelectorAll('[data-save-match]').forEach(function(b){b.onclick=saveMatch;});
  }

  function render(){
    ensureFormation();reconcileStarters();
    window.CoachV2.setTitle('Match Facts','');
    window.CoachV2.setFieldHeader('Match Facts');
    if(S.saved){
      var done='<div class="empty" style="min-height:420px"><b>Match Facts saved</b><p>'+(S.editMode?'The existing match records were updated.':'The match record has been saved.')+'</p><a class="btn volt" href="'+esc(clean('/coach/fixtures?fixtureId='+(S.fixtureId||'')))+'">Back to fixture</a></div>';
      desk.innerHTML=done;field.innerHTML=done;return;
    }
    if(S.step===1){desk.innerHTML=step1();field.innerHTML=step1();}
    else if(S.step===2){desk.innerHTML=step2Desk();field.innerHTML=step2Field();}
    else if(S.step===3){desk.innerHTML=step3();field.innerHTML=step3().replace(stepper(3),'').replace(heading('Score & events','The headline score, plus everything that happened — goals, assists, cards and subs. Ratings come next.'),heading('Score & events','Step 3 of 5 · score, goals, cards and subs'));}
    else if(S.step===4){desk.innerHTML=step4Desk();field.innerHTML=step4Field();}
    else{desk.innerHTML=review();field.innerHTML=review().replace(stepper(5),'').replace('<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">','<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:22px;margin:8px 0 4px">');}
    bind();
    if(window.CoachV2.syncDuplicateIds)window.CoachV2.syncDuplicateIds();
    document.dispatchEvent(new CustomEvent('coach:rendered'));
  }

  function hydrateExisting(facts){
    if(!Array.isArray(facts)||!facts.length)return;
    S.editMode=true;
    var first=facts[0];
    if(first.home_score!=null)S.homeScore=String(first.home_score);
    if(first.away_score!=null)S.awayScore=String(first.away_score);
    if(first.formation)S.formation=first.formation;
    ensureFormation();
    var ordered=[],pp=first.player_positions&&typeof first.player_positions==='object'?first.player_positions:{};
    var slots=formationSlots(),semantic=slots.some(function(slot){return !!pp[slot.key];});
    if(semantic){
      S.starterIds=slots.map(function(slot){return pp[slot.key]?String(pp[slot.key]):'';});
      S.starterIds.forEach(function(id){if(id)ordered.push(id);});
    }else{
      Object.keys(pp).filter(function(k){return /^P\d+$/i.test(k);}).sort(function(a,b){
        return (Number(String(a).replace(/\D/g,''))||0)-(Number(String(b).replace(/\D/g,''))||0);
      }).forEach(function(k){if(pp[k])ordered.push(String(pp[k]));});
      S.starterIds=slots.map(function(_,i){return ordered[i]||'';});
    }
    facts.forEach(function(f){
      S.selected[f.player_id]=true;
      S.positions[f.player_id]=f.position_played||usual(playerById(f.player_id)||{});
      S.stats[f.player_id]={
        goals:Number(f.goals)||0,assists:Number(f.assists)||0,
        yellowCards:Number(f.yellow_cards)||0,redCards:Number(f.red_cards)||0,
        minutes:f.minutes_played==null?'':String(f.minutes_played)
      };
      S.ratings[f.player_id]=f.performance_score==null?'':Number(f.performance_score);
      if(ordered.indexOf(String(f.player_id))<0)ordered.push(String(f.player_id));
    });
    var events=Array.isArray(first.events)?first.events:[];
    S.substitutions=events.filter(function(event){return event&&event.type==='substitution';}).map(function(event){
      var off=event.playerOffId||event.player_off_id||'';
      var on=event.playerOnId||event.player_on_id||'';
      return{
        off:String(off),on:String(on),
        offName:name(playerById(off)||{}),
        onName:name(playerById(on)||{}),
        minute:event.minute==null?'':String(event.minute)
      };
    });
    reconcileStarters();
  }

  async function init(){
    try{
      var r=await api('GET','/api/coach-experience/overview'),o=r.data||r;
      S.fixtures=arr(o,['fixtures']);S.players=arr(o,['players']);
      var q=new URLSearchParams(location.search).get('fixtureId');
      if(q){
        var f=S.fixtures.find(function(x){return String(x.id)===String(q);});
        if(f)applyFixture(f);
        try{
          var existing=await api('GET','/api/match-facts?fixtureId='+encodeURIComponent(q)+'&limit=100');
          hydrateExisting(arr(existing,['data','matchFacts']));
        }catch(_){}
        /* A newer local draft wins over the last saved database state. */
        restoreForCurrentKey();
      }else{
        restoreForCurrentKey();
      }
      render();
    }catch(e){
      desk.innerHTML='<div class="coach-route-message error">'+esc(e.message)+'</div>';
      field.innerHTML=desk.innerHTML;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

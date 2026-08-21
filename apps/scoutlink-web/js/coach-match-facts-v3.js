'use strict';

(function(){
  if(document.body.getAttribute('data-coach-page')!=='match-facts')return;
  var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage');
  var KEY='scoutlink.coach.matchFacts.v6.exact';
  var S={step:1,mobilePhase:'select',ratingPlayer:'',source:'fixture',fixtureId:'',fixture:null,fixtures:[],players:[],selected:{},positions:{},stats:{},ratings:{},substitutions:[],homeScore:'',awayScore:'',opponent:'',matchDate:'',venue:'',homeOrAway:'Home',format:'9',formation:'',saving:false,saved:null};
  var POSITION_OPTIONS={GK:['GK'],DEF:['CB','LB','RB','LWB','RWB'],MID:['DM','CM','AM','LM','RM'],ATT:['LW','RW','ST','CF']};

  function esc(v){return window.CoachV2.esc(v);} function api(m,p,b){return window.CoachV2.api(m,p,b);} function clean(p){return window.CoachV2.clean(p);}
  function arr(v,keys){if(Array.isArray(v))return v;for(var i=0;i<keys.length;i++)if(v&&Array.isArray(v[keys[i]]))return v[keys[i]];return[];}
  function name(p){return[p&&p.first_name,p&&p.last_name].filter(Boolean).join(' ')||p&&p.name||'Player';}
  function initials(p){return window.CoachV2.initials(name(p));}
  function usual(p){return p.primary_position||p.specific_position||p.position||'CM';}
  function grp(code){code=String(code||'').toUpperCase();if(code==='GK')return'GK';if(['CB','LB','RB','LWB','RWB'].indexOf(code)>=0)return'DEF';if(['DM','CM','AM','LM','RM'].indexOf(code)>=0)return'MID';return'ATT';}
  function posOptions(p){return POSITION_OPTIONS[grp(S.positions[p.id]||usual(p))]||[usual(p)];}
  function selectedPlayers(){return S.players.filter(function(p){return !!S.selected[p.id];});}
  function starterLimit(){return Math.max(1,Number(S.format)||9);}
  function starters(){return selectedPlayers().slice(0,starterLimit());}
  function bench(){return selectedPlayers().slice(starterLimit());}
  function stat(id){if(!S.stats[id])S.stats[id]={goals:0,assists:0,yellowCards:0,redCards:0,minutes:''};return S.stats[id];}
  function rating(id){var v=S.ratings[id];return v===undefined||v===null?'':v;}
  function saveDraft(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(_){}}
  function restore(){try{var x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)S=Object.assign(S,x,{fixtures:[],players:[],saved:null,saving:false});}catch(_){}}
  function clearDraft(){try{localStorage.removeItem(KEY);}catch(_){}}
  function stepper(n){
    var l=['Match details','Build lineup','Score & events','Rate performances','Review & save'];
    return'<div class="stepper">'+l.map(function(x,i){var k=i+1,cl=k<n?' dn':k===n?' on':'';return'<div class="sp-i'+cl+'"><b>'+(k<n?'✓':k)+'</b><span>'+esc(x)+'</span></div>'+(k<5?'<div class="ln'+(k<n?' dn':'')+'"></div>':'');}).join('')+'</div>';
  }
  function heading(t,s){return'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">'+esc(t)+'</h1><p class="mut" style="margin:0 0 20px">'+esc(s)+'</p>';}
  function footer(back,next,label){return'<div class="flex" style="margin-top:22px;justify-content:flex-end">'+(back?'<button class="btn outline" type="button" data-mf-go="'+back+'">Back</button>':'<a class="btn outline" href="'+esc(clean('/coach/dashboard'))+'">Cancel</a>')+'<button class="btn volt" type="button" data-mf-go="'+next+'">'+esc(label||'Continue')+'</button></div>';}
  function fixtureLabel(f){return'vs '+(f.opponent||'Opponent')+' · '+String(f.fixture_date||'')+(f.venue?' · '+f.venue:'');}
  function step1(){
    var newMatch=S.source==='new';
    var existing='<div class="card"><div class="card-b">'+(S.fixtures.length?S.fixtures.map(function(f){return'<div class="list-row" data-fixture="'+esc(f.id)+'"><span class="who"><b>'+esc(f.opponent||'Opponent')+'</b><span>'+esc(String(f.fixture_date||'')+(f.venue?' · '+f.venue:''))+'</span></span><span class="pill '+(String(S.fixtureId)===String(f.id)?'g':'n')+'">'+(String(S.fixtureId)===String(f.id)?'Selected':'Choose')+'</span></div>';}).join(''):'<div class="empty"><b>No fixtures available</b></div>')+'</div></div>';
    var manual='<div class="callout g">Not every match is on the fixture list — a friendly, a tournament game, a rearranged date. Enter it here and it\'s saved as a fixture automatically.</div><div style="margin-top:16px"><div class="two"><div class="field"><label>Opponent</label><input class="in" id="mfOpponent" value="'+esc(S.opponent)+'" placeholder="e.g. Burnage Bulldogs"></div><div class="field"><label>Match date</label><input class="in" id="mfDate" type="date" value="'+esc(S.matchDate)+'"></div></div><div class="two"><div class="field"><label>Home or away <em>Optional</em></label><select class="in" id="mfHomeAway"><option'+(S.homeOrAway==='Home'?' selected':'')+'>Home</option><option'+(S.homeOrAway==='Away'?' selected':'')+'>Away</option></select></div><div class="field"><label>Format <em>Optional</em></label><select class="in" id="mfFormat">'+[5,7,9,11].map(function(x){return'<option value="'+x+'"'+(String(S.format)===String(x)?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div><div class="field"><label>Venue <em>Optional</em></label><input class="in" id="mfVenue" value="'+esc(S.venue)+'" placeholder="e.g. Chorlton Park 3G"></div></div>';
    return stepper(1)+heading('Match details','Pick a fixture already on your calendar, or enter a match that isn\'t. The score and match events come next.')+'<div class="seg" style="max-width:420px;margin-bottom:18px"><a class="'+(!newMatch?'on':'')+'" href="#" data-mf-source="fixture">Pick an existing fixture</a><a class="'+(newMatch?'on':'')+'" href="#" data-mf-source="new">Enter a new match</a></div>'+(newMatch?manual:existing)+footer('',2,'Continue');
  }
  function playerSelectRow(p){
    return'<div class="list-row" data-mf-select="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||''))+'</span></span><span class="pill '+(S.selected[p.id]?'g':'n')+'">'+(S.selected[p.id]?'Selected':'Did not play')+'</span></div>';
  }
  function positionBlock(p){
    var cur=S.positions[p.id]||usual(p);return'<div class="list-row" style="cursor:default"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usual(p)+' · '+(p.age_group||''))+'</span><label style="display:block;margin-top:10px;font-family:var(--mono);font-size:9.5px;color:var(--ink3)">Position played <em>Optional</em></label><div class="flex" style="margin-top:7px;gap:7px">'+posOptions(p).map(function(code){return'<button class="btn sm '+(cur===code?'pitch':'outline')+'" data-mf-position="'+esc(p.id)+'" data-position="'+code+'">'+code+'</button>';}).join('')+'<button class="btn sm outline" data-mf-select="'+esc(p.id)+'">Did not play</button></div></span></div>';
  }
  function pitch(){
    var ps=starters();return'<svg viewBox="0 0 420 580" width="100%" style="max-width:420px;display:block;margin:0 auto;background:var(--pitch);border-radius:var(--r-md)"><rect x="18" y="18" width="384" height="544" rx="8" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="2"/><line x1="18" y1="290" x2="402" y2="290" stroke="rgba(255,255,255,.72)" stroke-width="2"/><circle cx="210" cy="290" r="58" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="2"/>'+ps.map(function(p,i){var cols=3,row=Math.floor(i/cols),col=i%cols,x=100+col*110,y=490-row*90;return'<g><circle cx="'+x+'" cy="'+y+'" r="24" fill="var(--paper)"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-family="var(--mono)" font-size="10" font-weight="700" fill="var(--ink)">'+esc(initials(p))+'</text><text x="'+x+'" y="'+(y+40)+'" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="#fff">'+esc(S.positions[p.id]||usual(p))+'</text></g>';}).join('')+'</svg>';
  }
  function step2Desk(){
    return stepper(2)+heading('Build your lineup','Select who played and confirm the position for each — see it take shape on the pitch as you go.')+'<div class="callout g">'+selectedPlayers().length+' of '+S.players.length+' selected. Tap a player to add them to the lineup, then confirm their position — it defaults to their usual spot, and the pitch updates to match.</div><div class="two" style="margin-top:16px;align-items:flex-start"><div class="card"><div class="card-h"><h3>Lineup on the pitch</h3><span class="sp"></span><span class="hint">'+starters().length+' of '+starterLimit()+' placed</span></div><div class="card-b">'+pitch()+'</div></div><div class="card"><div class="card-h"><h3>Squad ('+S.players.length+')</h3><span class="sp"></span></div><div class="card-b"><div class="in" style="display:flex;align-items:center;color:var(--ink4);margin-bottom:12px">Search squad by name or position...</div>'+S.players.map(function(p){return S.selected[p.id]?positionBlock(p):playerSelectRow(p);}).join('')+'</div></div></div>'+footer(1,3,'Continue');
  }
  function step2Field(){
    if(S.mobilePhase==='positions')return heading('Set positions','Step 2 of 5 · defaults to their usual position')+'<div class="card"><div class="card-b">'+selectedPlayers().map(positionBlock).join('')+'</div></div>'+footer('select',3,'Continue');
    return heading('Who played?','Step 2 of 5 · tap each player who featured')+'<div class="in" style="display:flex;align-items:center;color:var(--ink4);margin-bottom:14px">Search squad...</div><div class="card" style="margin-bottom:12px"><div class="card-b"><b>'+selectedPlayers().length+' of '+S.players.length+' selected</b></div></div><div class="card"><div class="card-b">'+S.players.map(playerSelectRow).join('')+'</div></div>'+footer(1,'positions','Set positions');
  }
  function numberField(id,key,label){
    var x=stat(id);return'<div class="field" style="margin:0"><label>'+esc(label)+' <em>Optional</em></label><input class="in" type="number" min="0" data-stat-player="'+esc(id)+'" data-stat="'+key+'" value="'+esc(x[key])+'"></div>';
  }
  function playerStatsBlock(p,kind){
    var fields=kind==='ga'?numberField(p.id,'goals','Goals')+numberField(p.id,'assists','Assists'):numberField(p.id,'yellowCards','Yellow')+numberField(p.id,'redCards','Red card');
    return'<div class="list-row" style="cursor:default;align-items:flex-start"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><div class="two" style="margin-top:10px">'+fields+'</div></span></div>';
  }
  function scoreCard(){
    return'<div class="card"><div class="card-h"><h3>Final score</h3><span class="sp"></span><span class="hint">'+esc(window.CoachV2.teamName())+' – '+esc(S.opponent||'Opponent')+'</span></div><div class="card-b"><div class="two"><div class="field"><label>'+esc(window.CoachV2.teamName())+'</label><input class="in" id="mfHomeScore" type="number" min="0" value="'+esc(S.homeScore)+'"></div><div class="field"><label>'+esc(S.opponent||'Opponent')+'</label><input class="in" id="mfAwayScore" type="number" min="0" value="'+esc(S.awayScore)+'"></div></div></div></div>';
  }
  function substitutions(){
    var all=selectedPlayers();return'<div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Substitutions</h3><span class="sp"></span><span class="hint">Who came off, who came on</span></div><div class="card-b">'+S.substitutions.map(function(s){return'<div class="list-row"><span class="who"><b>'+esc(s.offName)+' → '+esc(s.onName)+'</b><span>'+esc(s.minute?s.minute+' min':'Minute not set')+'</span></span></div>';}).join('')+'<button class="btn outline" type="button" data-add-sub>Add another substitution</button></div></div></div>';
  }
  function step3(){
    var ps=starters();return stepper(3)+heading('Score & events','The headline score, plus everything that happened — goals, assists, cards and subs. Ratings come next.')+scoreCard()+'<div class="two" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Goals & assists</h3><span class="sp"></span><span class="hint">Who scored, and who set it up</span></div><div class="card-b">'+ps.map(function(p){return playerStatsBlock(p,'ga');}).join('')+'</div></div><div class="card"><div class="card-h"><h3>Cards</h3><span class="sp"></span><span class="hint">Yellow and red, per player</span></div><div class="card-b">'+ps.map(function(p){return playerStatsBlock(p,'cards');}).join('')+'</div></div></div>'+substitutions()+footer(2,4,'Continue');
  }
  function rateScale(p){
    var v=rating(p.id);return'<div class="rate-row"><div class="rr-top"><b>Overall rating</b><span class="cur '+(v===''?'off':'')+'">'+(v===''?'Not observed':Number(v).toFixed(1))+'</span></div><div class="rscale">'+[1,2,3,4,5,6,7,8,9,10].map(function(x){return'<u class="'+(Number(v)===x?'on':'')+'" data-rating-player="'+esc(p.id)+'" data-rating="'+x+'">'+x+'</u>';}).join('')+'<u class="na '+(v===''?'on':'')+'" data-rating-player="'+esc(p.id)+'" data-rating="">Not observed</u></div></div>';
  }
  function ratingPlayer(p){
    var x=stat(p.id);return'<div style="padding:18px 0;border-bottom:1px solid var(--line)"><div class="flex" style="margin-bottom:12px"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc((S.positions[p.id]||usual(p))+' · '+(x.minutes||'70')+' min')+'</span></span></div>'+rateScale(p)+'</div>';
  }
  function step4Desk(){
    return stepper(4)+heading('Rate performances','One overall rating per player, out of 10.')+'<div class="callout g">Goals, assists and cards were captured in the last step — this is just your judgement call on each performance, out of 10.</div><div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Starting lineup ('+starters().length+')</h3><span class="sp"></span></div><div class="card-b">'+starters().map(ratingPlayer).join('')+'</div></div></div>'+footer(3,5,'Continue');
  }
  function ratingListRow(p){
    var v=rating(p.id),x=stat(p.id);return'<div class="list-row" data-open-rating="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc((S.positions[p.id]||usual(p))+' · '+(x.minutes||'70')+' min')+'</span></span>'+(v===''?'<span class="pill a">Not rated</span>':'<span class="rate-chip">'+Number(v).toFixed(1)+'<small>/10</small></span>')+'</div>';
  }
  function step4Field(){
    return heading('Rate performances','Step 4 of 5 · one player at a time')+'<div class="callout g">Goals, assists and cards were captured in the last step. Tap a player to give their overall rating out of 10.</div><div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Starting lineup ('+starters().length+')</h3><span class="sp"></span></div><div class="card-b">'+starters().map(ratingListRow).join('')+'</div></div></div>'+footer(3,5,'Review');
  }
  function ratingSheet(p){
    var x=stat(p.id);window.CoachV2.openSheet({title:'Rate this performance',html:'<div class="flex" style="margin-bottom:16px"><span class="avatar">'+esc(initials(p))+'</span><div><b style="font-size:14px">'+esc(name(p))+'</b><span class="mut" style="font-size:11.5px;display:block">'+esc((S.positions[p.id]||usual(p))+' · '+(x.minutes||'70')+' min vs '+(S.opponent||'Opponent'))+'</span></div></div>'+rateScale(p),footer:'<button class="btn outline" data-close-coach-overlay>Cancel</button><button class="btn volt" data-save-rating>Save</button>'});setTimeout(bind,0);
  }
  function eventCounts(){var o={goals:0,assists:0,yellow:0,red:0};selectedPlayers().forEach(function(p){var x=stat(p.id);o.goals+=Number(x.goals)||0;o.assists+=Number(x.assists)||0;o.yellow+=Number(x.yellowCards)||0;o.red+=Number(x.redCards)||0;});return o;}
  function review(){
    var e=eventCounts(),rated=starters().filter(function(p){return rating(p.id)!=='';}).length,hs=Number(S.homeScore)||0,as=Number(S.awayScore)||0,w=hs>as?'W':hs<as?'L':'D';
    return stepper(5)+'<div class="card" style="text-align:center"><div class="card-b"><div class="mut" style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em">Final score</div><div style="font-family:var(--display);font-weight:400;font-size:42px;margin-top:10px">'+w+' '+hs+'-'+as+'</div><div style="font-weight:700;margin-top:8px">'+esc(window.CoachV2.teamName()+' vs '+(S.opponent||'Opponent'))+'</div><p class="mut" style="margin:6px 0 0">'+esc((S.matchDate||'')+(S.venue?' · '+S.venue:''))+'</p></div></div><div style="margin-top:16px"><div class="callout g">'+rated+' of '+starters().length+' starters rated. '+e.goals+' goal'+(e.goals===1?'':'s')+', '+e.assists+' assist'+(e.assists===1?'':'s')+', '+S.substitutions.length+' substitution'+(S.substitutions.length===1?'':'s')+' and '+e.yellow+' yellow card'+(e.yellow===1?'':'s')+' logged. You can complete the rest later — Match Facts save incrementally.</div></div><div class="flex" style="margin-top:20px;justify-content:flex-end"><button class="btn outline" data-mf-go="4">Back</button><button class="btn volt" data-save-match '+(S.saving?'disabled':'')+'>'+(S.saving?'Saving…':'Finish & save')+'</button></div>';
  }
  function sync(){
    var x=document.getElementById('mfOpponent');if(x)S.opponent=x.value.trim();x=document.getElementById('mfDate');if(x)S.matchDate=x.value;x=document.getElementById('mfVenue');if(x)S.venue=x.value.trim();x=document.getElementById('mfHomeAway');if(x)S.homeOrAway=x.value;x=document.getElementById('mfFormat');if(x)S.format=x.value;x=document.getElementById('mfHomeScore');if(x)S.homeScore=x.value;x=document.getElementById('mfAwayScore');if(x)S.awayScore=x.value;
  }
  function validate(next){
    sync();if(Number(next)>=2){if(S.source==='fixture'&&!S.fixtureId)return'Choose an existing fixture or enter a new match.';if(S.source==='new'&&(!S.opponent||!S.matchDate))return'Opponent and match date are required.';}if(Number(next)>=3&&!selectedPlayers().length)return'Select at least one player.';if(Number(next)>=4&&(S.homeScore===''||S.awayScore===''))return'Enter the final score.';return'';
  }
  function go(next){
    sync();if(next==='positions'){S.mobilePhase='positions';saveDraft();render();return;}if(next==='select'){S.mobilePhase='select';saveDraft();render();return;}var e=validate(next);if(e)return window.CoachV2.showToast(e,true);S.step=Math.max(1,Math.min(5,Number(next)));S.mobilePhase='select';saveDraft();render();window.scrollTo(0,0);
  }
  function addSub(){
    var opts=selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('');
    var box=window.CoachV2.openSheet({title:'Add substitution',html:'<div class="field"><label>Player off <em>Optional</em></label><select class="in" id="subOff">'+opts+'</select></div><div class="field"><label>Player on <em>Optional</em></label><select class="in" id="subOn">'+opts+'</select></div><div class="field"><label>Minute <em>Optional</em></label><input class="in" id="subMin" type="number" min="0" max="180"></div>',footer:'<button class="btn volt" id="saveSub">Save substitution</button>'});
    setTimeout(function(){document.getElementById('saveSub').onclick=function(){var off=document.getElementById('subOff').value,on=document.getElementById('subOn').value;if(!off||!on||off===on)return window.CoachV2.showToast('Choose two different players.',true);S.substitutions.push({off:off,on:on,offName:name(S.players.find(function(p){return String(p.id)===String(off);})||{}),onName:name(S.players.find(function(p){return String(p.id)===String(on);})||{}),minute:document.getElementById('subMin').value});window.CoachV2.closeAll();saveDraft();render();};},0);
  }
  async function ensureFixture(){
    if(S.fixtureId)return S.fixtureId;if(S.source!=='new')return null;
    var r=await api('POST','/api/fixtures',{opponent:S.opponent,fixtureDate:S.matchDate,venue:S.venue||null,homeOrAway:S.homeOrAway,format:S.format,notes:'Created from Match Facts'}),f=r.fixture||r.data||r||{};if(!f.id)throw new Error('The new fixture could not be created.');S.fixtureId=f.id;return f.id;
  }
  async function saveMatch(){
    if(S.saving)return;var e=validate(5);if(e)return window.CoachV2.showToast(e,true);S.saving=true;render();
    try{
      var fid=await ensureFixture(),events=[];
      selectedPlayers().forEach(function(p){var x=stat(p.id),i;for(i=0;i<Number(x.goals||0);i++)events.push({type:'goal',playerId:p.id,playerName:name(p)});for(i=0;i<Number(x.assists||0);i++)events.push({type:'assist',playerId:p.id,playerName:name(p)});for(i=0;i<Number(x.yellowCards||0);i++)events.push({type:'yellow_card',playerId:p.id,playerName:name(p)});for(i=0;i<Number(x.redCards||0);i++)events.push({type:'red_card',playerId:p.id,playerName:name(p)});});
      S.substitutions.forEach(function(s){events.push({type:'substitution',playerOffId:s.off,playerOnId:s.on,minute:s.minute?Number(s.minute):null});});
      var payload={fixtureId:fid||null,matchDate:S.matchDate,opponent:S.opponent,format:S.format,formation:S.formation||null,homeScore:Number(S.homeScore),awayScore:Number(S.awayScore),events:events,playerPositions:{},confirmed:true,players:selectedPlayers().map(function(p){var x=stat(p.id),r=rating(p.id);return{playerId:p.id,positionPlayed:S.positions[p.id]||usual(p),minutesPlayed:x.minutes===''?null:Number(x.minutes),goals:Number(x.goals)||0,assists:Number(x.assists)||0,yellowCards:Number(x.yellowCards)||0,redCards:Number(x.redCards)||0,performanceScore:r===''?null:Number(r)};})};
      selectedPlayers().forEach(function(p,i){payload.playerPositions['P'+(i+1)]=p.id;});
      /* No attributeRatings are submitted here. Match Facts contains one overall performanceScore only. */
      S.saved=await api('POST','/api/match-facts',payload);S.saving=false;clearDraft();render();
    }catch(err){S.saving=false;render();window.CoachV2.showToast(err.message||'Could not save Match Facts.',true);}
  }
  function bind(){
    document.querySelectorAll('[data-mf-source]').forEach(function(a){a.onclick=function(e){e.preventDefault();sync();S.source=a.dataset.mfSource;saveDraft();render();};});
    document.querySelectorAll('[data-fixture]').forEach(function(r){r.onclick=function(){var f=S.fixtures.find(function(x){return String(x.id)===String(r.dataset.fixture);});S.fixtureId=f.id;S.fixture=f;S.opponent=f.opponent||'';S.matchDate=String(f.fixture_date||'').slice(0,10);S.venue=f.venue||'';S.homeOrAway=f.home_or_away||'Home';S.format=String(f.format||'9').replace(/[^\d]/g,'')||'9';saveDraft();render();};});
    document.querySelectorAll('[data-mf-go]').forEach(function(b){b.onclick=function(){go(b.dataset.mfGo);};});
    document.querySelectorAll('[data-mf-select]').forEach(function(r){r.onclick=function(){var id=r.dataset.mfSelect;S.selected[id]=!S.selected[id];if(S.selected[id])S.positions[id]=S.positions[id]||usual(S.players.find(function(p){return String(p.id)===String(id);})||{});else{delete S.positions[id];delete S.ratings[id];delete S.stats[id];}saveDraft();render();};});
    document.querySelectorAll('[data-mf-position]').forEach(function(b){b.onclick=function(){S.positions[b.dataset.mfPosition]=b.dataset.position;saveDraft();render();};});
    document.querySelectorAll('[data-stat-player]').forEach(function(x){x.oninput=function(){stat(x.dataset.statPlayer)[x.dataset.stat]=x.value;saveDraft();};});
    document.querySelectorAll('[data-add-sub]').forEach(function(b){b.onclick=addSub;});
    document.querySelectorAll('[data-rating-player]').forEach(function(u){u.onclick=function(){S.ratings[u.dataset.ratingPlayer]=u.dataset.rating===''?'':Number(u.dataset.rating);saveDraft();if(innerWidth<=760&&S.ratingPlayer){return;}render();};});
    document.querySelectorAll('[data-open-rating]').forEach(function(r){r.onclick=function(){S.ratingPlayer=r.dataset.openRating;ratingSheet(S.players.find(function(p){return String(p.id)===String(S.ratingPlayer);})||{});};});
    document.querySelectorAll('[data-save-rating]').forEach(function(b){b.onclick=function(){S.ratingPlayer='';window.CoachV2.closeAll();saveDraft();render();};});
    document.querySelectorAll('[data-save-match]').forEach(function(b){b.onclick=saveMatch;});
  }
  function render(){
    window.CoachV2.setTitle('Match Facts','');window.CoachV2.setFieldHeader('Match Facts');
    if(S.saved){var done='<div class="empty" style="min-height:420px"><b>Match Facts saved</b><p>The match record has been saved.</p><a class="btn volt" href="'+esc(clean('/coach/fixtures'))+'">Back to fixtures</a></div>';desk.innerHTML=done;field.innerHTML=done;return;}
    if(S.step===1){desk.innerHTML=step1();field.innerHTML=step1();}
    else if(S.step===2){desk.innerHTML=step2Desk();field.innerHTML=step2Field();}
    else if(S.step===3){desk.innerHTML=step3();field.innerHTML=step3().replace(stepper(3),'').replace(heading('Score & events','The headline score, plus everything that happened — goals, assists, cards and subs. Ratings come next.'),heading('Score & events','Step 3 of 5 · score, goals, cards and subs'));}
    else if(S.step===4){desk.innerHTML=step4Desk();field.innerHTML=step4Field();}
    else{desk.innerHTML=review();field.innerHTML=review().replace(stepper(5),'').replace('<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">','<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:22px;margin:8px 0 4px">');}
    bind();document.dispatchEvent(new CustomEvent('coach:rendered'));
  }
  async function init(){
    try{
      restore();var r=await api('GET','/api/coach-experience/overview'),o=r.data||r;S.fixtures=arr(o,['fixtures']);S.players=arr(o,['players']);
      var q=new URLSearchParams(location.search).get('fixtureId');if(q){var f=S.fixtures.find(function(x){return String(x.id)===String(q);});if(f){S.source='fixture';S.fixtureId=f.id;S.fixture=f;S.opponent=f.opponent||'';S.matchDate=String(f.fixture_date||'').slice(0,10);S.venue=f.venue||'';S.homeOrAway=f.home_or_away||'Home';S.format=String(f.format||'9').replace(/[^\d]/g,'')||'9';}}
      render();
    }catch(e){desk.innerHTML='<div class="coach-route-message error">'+esc(e.message)+'</div>';field.innerHTML=desk.innerHTML;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

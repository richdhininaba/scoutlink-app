'use strict';

/*
 * ScoutLink Match Facts V6 — Desk / Field exact flow.
 * IMPORTANT: post-match assessment is ONE overall rating per player (1–10 or
 * Not observed). Goals, assists, cards, positions and substitutions remain
 * match facts. No per-attribute match ratings are collected or submitted.
 */
(function () {
  var DRAFT_KEY = 'scoutlink.coach.matchFacts.v6';
  var desk = document.getElementById('coachDeskPage');
  var field = document.getElementById('coachFieldPage');
  if (!desk || !field) return;

  var S = {
    step: 1,
    mobileLineupPhase: 'select',
    mobileRatingPlayerId: '',
    source: 'fixture',
    fixtureId: '',
    fixture: null,
    fixtures: [],
    players: [],
    selected: {},
    starter: {},
    positions: {},
    stats: {},
    ratings: {},
    substitutions: [],
    homeScore: '',
    awayScore: '',
    opponent: '',
    matchDate: '',
    venue: '',
    format: '11v11',
    formation: '4-3-3',
    matchLength: '80',
    saving: false,
    saved: null
  };

  var POSITIONS = ['GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'];
  var FORMATIONS = {
    '5v5': ['1-2-1','2-1-1','1-1-2'],
    '7v7': ['2-3-1','3-2-1','2-2-2'],
    '9v9': ['3-3-2','3-2-3','4-3-1'],
    '11v11': ['4-3-3','4-2-3-1','4-4-2','3-5-2','3-4-3']
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function api(m, p, b) { return window.CoachV2 && window.CoachV2.api ? window.CoachV2.api(m, p, b) : window.api(m, p, b); }
  function clean(p) { return window.CoachV2 ? window.CoachV2.clean(p) : p; }
  function rows(v, keys) { if (Array.isArray(v)) return v; for (var i=0;i<keys.length;i+=1) if (v && Array.isArray(v[keys[i]])) return v[keys[i]]; return []; }
  function name(p) { return [p && p.first_name, p && p.last_name].filter(Boolean).join(' ') || p && p.name || 'Player'; }
  function initials(p) { return window.CoachV2 ? window.CoachV2.initials(name(p)) : name(p).split(/\s+/).map(function(x){return x[0];}).slice(0,2).join('').toUpperCase(); }
  function usualPosition(p) { return p.primary_position || p.specific_position || p.position || 'CM'; }
  function teamName() { return window.CoachV2 ? window.CoachV2.teamName() : 'Your team'; }
  function number(v, d) { var x=Number(v); return Number.isFinite(x) ? x : (d == null ? 0 : d); }
  function normaliseFormat(v) { var m=String(v || '').match(/(5|7|9|11)/); return m ? m[1]+'v'+m[1] : '11v11'; }
  function starterLimit() { return Number((S.format.match(/\d+/) || ['11'])[0]); }
  function formations() { return FORMATIONS[S.format] || FORMATIONS['11v11']; }
  function selectedPlayers() { return S.players.filter(function(p){ return !!S.selected[p.id]; }); }
  function starters() { return selectedPlayers().filter(function(p){ return !!S.starter[p.id]; }); }
  function bench() { return selectedPlayers().filter(function(p){ return !S.starter[p.id]; }); }
  function stat(pid) { if (!S.stats[pid]) S.stats[pid]={goals:0,assists:0,yellowCards:0,redCards:0,minutes:''}; return S.stats[pid]; }
  function rating(pid) { return Object.prototype.hasOwnProperty.call(S.ratings,pid) ? S.ratings[pid] : ''; }
  function fmtDate(v) { if(!v) return '—'; var d=new Date(String(v).length<=10?v+'T12:00:00':v); return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  function currentFixture() { return S.fixtures.find(function(f){ return String(f.id)===String(S.fixtureId); }) || S.fixture; }

  function saveDraft() {
    try {
      var copy = Object.assign({}, S, { fixtures: [], players: [], fixture: null, saving: false, saved: null });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 6, state: copy, savedAt: new Date().toISOString() }));
    } catch (_) {}
  }
  function restoreDraft() {
    try {
      var d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if(d && d.version===6 && d.state) S=Object.assign(S,d.state,{fixtures:[],players:[],fixture:null,saving:false,saved:null});
    } catch (_) {}
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} }

  function applyFixture(f) {
    if (!f) return;
    S.fixture=f; S.fixtureId=f.id || S.fixtureId;
    S.opponent=f.opponent || S.opponent;
    S.matchDate=f.fixture_date || S.matchDate;
    S.venue=f.venue || S.venue;
    S.format=normaliseFormat(f.format || S.format);
    if (formations().indexOf(S.formation)<0) S.formation=formations()[0];
  }

  function stepper(active) {
    var names=['Match details','Build lineup','Score & events','Rate performances','Review & save'];
    return '<div class="stepper">'+names.map(function(label,index){
      var x=index+1, state=x<active?'dn':x===active?'on':'';
      return '<div class="sp-i '+state+'"><b>'+(x<active?'✓':x)+'</b><span>'+esc(label)+'</span></div>'+(x<5?'<div class="ln '+(x<active?'dn':'')+'"></div>':'');
    }).join('')+'</div>';
  }

  function deskTitle(title, copy) {
    return stepper(S.step)+'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">'+esc(title)+'</h1><p class="mut" style="margin:0 0 20px">'+copy+'</p>';
  }
  function fieldTitle(title, copy) {
    return '<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:22px;margin:8px 0 4px">'+esc(title)+'</h1><p class="mut" style="margin:0 0 16px;font-size:12.5px">'+copy+'</p>';
  }

  function footer(back, next, nextLabel) {
    return '<div class="flex" style="margin-top:20px;justify-content:flex-end">'+
      (back?'<button class="btn outline" type="button" data-mf-back="'+back+'">← Back</button>':'')+
      (next?'<button class="btn volt" type="button" data-mf-next="'+next+'">'+esc(nextLabel||'Continue')+' →</button>':'')+
      '</div>';
  }

  function matchDetailsFields(mobile) {
    var fx=currentFixture();
    return '<div class="card"><div class="card-b">'+
      '<div class="field"><label>Source</label><div class="flex"><button type="button" class="btn sm '+(S.source==='fixture'?'pitch':'outline')+'" data-mf-source="fixture">Existing fixture</button><button type="button" class="btn sm '+(S.source==='standalone'?'pitch':'outline')+'" data-mf-source="standalone">New / unscheduled match</button></div></div>'+
      (S.source==='fixture'?'<div class="field"><label>Fixture</label><select class="in" id="mfFixture"><option value="">Choose fixture…</option>'+S.fixtures.map(function(f){return '<option value="'+esc(f.id)+'"'+(String(f.id)===String(S.fixtureId)?' selected':'')+'>vs '+esc(f.opponent||'Opponent')+' · '+esc(fmtDate(f.fixture_date))+(f.fixture_time?' · '+esc(String(f.fixture_time).slice(0,5)):'')+'</option>';}).join('')+'</select></div>':'<div class="two"><div class="field"><label>Opponent</label><input class="in" id="mfOpponent" value="'+esc(S.opponent)+'"></div><div class="field"><label>Match date</label><input class="in" type="date" id="mfDate" value="'+esc(S.matchDate)+'"></div></div>')+
      '<div class="two"><div class="field"><label>Format</label><select class="in" id="mfFormat">'+['5v5','7v7','9v9','11v11'].map(function(x){return'<option'+(x===S.format?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div><div class="field"><label>Formation</label><select class="in" id="mfFormation">'+formations().map(function(x){return'<option'+(x===S.formation?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div></div>'+
      '<div class="two"><div class="field"><label>Match length<em>Minutes</em></label><input class="in" type="number" min="1" max="180" id="mfLength" value="'+esc(S.matchLength)+'"></div><div class="field"><label>Venue<em>Optional</em></label><input class="in" id="mfVenue" value="'+esc(S.venue||fx&&fx.venue||'')+'"></div></div>'+
      '<div class="callout g"><span>Match Facts can be recorded for a saved fixture or an unscheduled match. Ratings are deliberately kept out of this first step.</span></div>'+
      '</div></div>';
  }

  function renderStep1() {
    desk.innerHTML=deskTitle('Match details','Choose the fixture, or record a match that was not already on ScoutLink.')+matchDetailsFields(false)+footer(null,2,'Continue to lineup');
    field.innerHTML=fieldTitle('Match details','Step 1 of 5 · fixture and match setup')+matchDetailsFields(true)+footer(null,2,'Continue');
  }

  function searchBox() { return '<div class="in" style="display:flex;align-items:center;gap:10px;color:var(--ink4);margin-bottom:12px"><span>⌕</span><input id="mfPlayerSearch" placeholder="Search squad..." style="border:0;outline:0;background:transparent;width:100%;font:inherit"></div>'; }

  function playerSelectorRow(p, mobile) {
    var on=!!S.selected[p.id], st=!!S.starter[p.id], played=S.positions[p.id]||usualPosition(p);
    return '<div class="list-row mf-player-row" data-player-name="'+esc(name(p).toLowerCase())+'">'+
      '<button type="button" class="opt-dot" data-mf-select="'+esc(p.id)+'" aria-label="'+(on?'Remove ':'Include ')+esc(name(p))+'" style="border-radius:5px;'+(on?'border:6px solid var(--ink)':'')+'"></button>'+
      '<span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(usualPosition(p)+' · '+(p.age_group||'—'))+'</span></span>'+
      (!mobile && on?'<select class="in" data-mf-position="'+esc(p.id)+'" style="width:90px;min-height:38px">'+POSITIONS.map(function(x){return'<option'+(x===played?' selected':'')+'>'+x+'</option>';}).join('')+'</select><button type="button" class="btn sm '+(st?'pitch':'outline')+'" data-mf-starter="'+esc(p.id)+'">'+(st?'Starter':'Bench')+'</button>':'')+
      '</div>';
  }

  function pitchSvg() {
    var ps=starters();
    if(!ps.length) return '<div class="empty" style="min-height:420px"><b>Build your starting lineup</b><p>Select players from the squad and mark starters. The pitch updates here.</p></div>';
    var coords=[[210,522],[90,410],[170,410],[250,410],[330,410],[100,285],[210,285],[320,285],[90,140],[210,85],[330,140]];
    return '<svg viewBox="0 0 420 580" width="100%" style="display:block;margin:0 auto"><rect x="0" y="0" width="420" height="580" rx="18" fill="#0B6B4F"/><rect x="14" y="14" width="392" height="552" rx="6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><line x1="14" x2="406" y1="290" y2="290" stroke="rgba(255,255,255,.55)" stroke-width="2"/><circle cx="210" cy="290" r="52" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>'+ps.slice(0,11).map(function(p,i){var c=coords[i]||coords[coords.length-1];return'<g><circle cx="'+c[0]+'" cy="'+c[1]+'" r="21" fill="#075F48" stroke="#D8F547" stroke-width="2.5"/><text x="'+c[0]+'" y="'+(c[1]+4)+'" text-anchor="middle" fill="#D8F547" font-family="IBM Plex Mono,monospace" font-size="11" font-weight="700">'+esc(initials(p))+'</text><rect x="'+(c[0]-44)+'" y="'+(c[1]+27)+'" width="88" height="20" rx="10" fill="rgba(6,32,26,.85)"/><text x="'+c[0]+'" y="'+(c[1]+41)+'" text-anchor="middle" fill="#fff" font-family="Archivo,sans-serif" font-size="9" font-weight="700">'+esc(name(p).slice(0,16))+'</text></g>';}).join('')+'</svg>';
  }

  function renderStep2Desk() {
    var selected=selectedPlayers();
    desk.innerHTML=deskTitle('Build lineup','Select who featured, set the position they actually played and mark starters. The squad search remains usable with 50 players.')+
      '<div class="two" style="grid-template-columns:440px 1fr;align-items:start"><div class="card"><div class="card-b">'+pitchSvg()+'</div></div><div><div class="card"><div class="card-h"><h3>Squad</h3><span class="sp"></span><span class="hint">'+selected.length+' selected · '+starters().length+'/'+starterLimit()+' starters</span></div><div class="card-b">'+searchBox()+'<div id="mfDeskSquad">'+S.players.map(function(p){return playerSelectorRow(p,false);}).join('')+'</div></div></div><div class="callout g" style="margin-top:14px"><span>Position played is match-specific. It does not overwrite the player’s normal profile position.</span></div></div></div>'+footer(1,3,'Continue to score & events');
  }

  function renderStep2FieldSelect() {
    var selected=selectedPlayers();
    field.innerHTML=fieldTitle('Who played?','Step 2 of 5 · tap each player who featured')+searchBox()+'<div class="card" style="position:sticky;top:0;z-index:5;margin-bottom:14px"><div class="card-b" style="padding:14px 20px;text-align:center"><b style="font-family:var(--display);font-size:22px">'+selected.length+'</b> <span class="mut" style="font-size:12px">of '+S.players.length+' selected</span></div></div><div class="card"><div class="card-b" id="mfFieldSquad">'+S.players.map(function(p){return playerSelectorRow(p,true);}).join('')+'</div></div>'+footer(1,'positions','Set positions');
  }

  function renderStep2FieldPositions() {
    field.innerHTML=fieldTitle('Set positions','Step 2 of 5 · defaults to their usual position')+'<div class="card"><div class="card-b">'+selectedPlayers().map(function(p){
      var played=S.positions[p.id]||usualPosition(p), st=!!S.starter[p.id];
      return '<div style="padding:16px 0;border-bottom:1px solid var(--line)"><div class="flex"><span class="avatar">'+esc(initials(p))+'</span><b style="font-size:13.5px">'+esc(name(p))+'</b><span class="sp"></span><button class="btn sm '+(st?'pitch':'outline')+'" type="button" data-mf-starter="'+esc(p.id)+'">'+(st?'Started':'Bench')+'</button></div><div style="margin-top:10px"><div class="field"><label>Position played<em>Optional</em></label><select class="in" data-mf-position="'+esc(p.id)+'">'+POSITIONS.map(function(x){return'<option'+(x===played?' selected':'')+'>'+x+'</option>';}).join('')+'<option value="">Did not play</option></select></div></div></div>';
    }).join('')+'</div></div>'+footer('select',3,'Continue to score & events');
  }

  function renderStep2() {
    renderStep2Desk();
    if(S.mobileLineupPhase==='positions') renderStep2FieldPositions(); else renderStep2FieldSelect();
  }

  function statsRows(kind) {
    return selectedPlayers().map(function(p){var x=stat(p.id);return '<div style="padding:16px 0;border-bottom:1px solid var(--line)"><div class="flex" style="margin-bottom:12px"><span class="avatar">'+esc(initials(p))+'</span><b style="font-size:13px">'+esc(name(p))+'</b></div><div class="two">'+(kind==='ga'?'<div class="field"><label>Goals<em>Optional</em></label><input class="in" type="number" min="0" data-mf-stat="goals" data-mf-player="'+esc(p.id)+'" value="'+number(x.goals,0)+'"></div><div class="field"><label>Assists<em>Optional</em></label><input class="in" type="number" min="0" data-mf-stat="assists" data-mf-player="'+esc(p.id)+'" value="'+number(x.assists,0)+'"></div>':'<div class="field"><label>Yellow<em>Optional</em></label><input class="in" type="number" min="0" data-mf-stat="yellowCards" data-mf-player="'+esc(p.id)+'" value="'+number(x.yellowCards,0)+'"></div><div class="field"><label>Red card<em>Optional</em></label><input class="in" type="number" min="0" data-mf-stat="redCards" data-mf-player="'+esc(p.id)+'" value="'+number(x.redCards,0)+'"></div>')+'</div></div>';}).join('');
  }

  function substitutionsCard() {
    return '<div class="card"><div class="card-h"><h3>Substitutions</h3><span class="sp"></span><button class="btn sm outline" type="button" id="mfAddSub">+ Add</button></div><div class="card-b">'+(S.substitutions.length?S.substitutions.map(function(s,i){return'<div class="list-row"><span class="who"><b>'+esc((s.offName||'Player')+' → '+(s.onName||'Player'))+'</b><span>'+esc(s.minute||'—')+' min</span></span><button class="btn sm outline" type="button" data-mf-remove-sub="'+i+'">Remove</button></div>';}).join(''):'<div class="empty"><b>No substitutions logged</b><p>Add them only if useful for the match record.</p></div>')+'</div></div>';
  }

  function scoreCard() {
    return '<div class="card"><div class="card-b" style="text-align:center;padding:28px 20px"><div class="lbl">Final score</div><div class="flex" style="justify-content:center;align-items:center;gap:22px;margin-top:14px"><div style="text-align:right;min-width:140px"><b style="font-size:15px;font-weight:800">'+esc(teamName())+'</b></div><input class="in" id="mfHomeScore" style="width:76px;text-align:center;font-family:var(--display);font-size:26px;height:60px" type="number" min="0" value="'+esc(S.homeScore)+'"><span style="font-family:var(--display);font-size:22px;color:var(--ink3)">–</span><input class="in" id="mfAwayScore" style="width:76px;text-align:center;font-family:var(--display);font-size:26px;height:60px" type="number" min="0" value="'+esc(S.awayScore)+'"><div style="text-align:left;min-width:140px"><b style="font-size:15px;font-weight:800">'+esc(S.opponent||'Opponent')+'</b></div></div></div></div>';
  }

  function renderStep3() {
    var content=scoreCard()+'<div class="two" style="margin-top:16px;align-items:flex-start"><div class="card"><div class="card-h"><h3>Goals & assists</h3><span class="sp"></span><span class="hint">Who scored, and who set it up</span></div><div class="card-b">'+statsRows('ga')+'</div></div><div><div class="card"><div class="card-h"><h3>Cards</h3><span class="sp"></span><span class="hint">Yellow and red, per player</span></div><div class="card-b">'+statsRows('cards')+'</div></div><div style="margin-top:16px">'+substitutionsCard()+'</div></div></div>';
    desk.innerHTML=deskTitle('Score & events','The headline score, plus everything that happened — goals, assists, cards and subs. Ratings come next.')+content+footer(2,4,'Continue to ratings');
    field.innerHTML=fieldTitle('Score & events','Step 3 of 5 · score, goals, cards and subs')+content+footer(2,4,'Continue to ratings');
  }

  function ratingScale(pid) {
    var current=rating(pid);
    return '<div class="rate-row"><div class="rr-top"><b>Overall rating</b><span class="cur '+(current===''?'off':'')+'">'+(current===''?'Not observed':number(current).toFixed(1))+'</span></div><div class="rscale">'+[1,2,3,4,5,6,7,8,9,10].map(function(v){return'<u class="'+(Number(current)===v?'on':'')+'" data-mf-rating="'+v+'" data-mf-player="'+esc(pid)+'">'+v+'</u>';}).join('')+'<u class="na '+(current===''?'on':'')+'" data-mf-rating="na" data-mf-player="'+esc(pid)+'">Not observed</u></div></div>';
  }

  function playerRatingBlock(p) {
    var x=stat(p.id), pos=S.positions[p.id]||usualPosition(p);
    return '<div style="padding:18px 0;border-bottom:1px solid var(--line)"><div class="flex" style="margin-bottom:12px"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(pos)+' · '+esc(x.minutes||S.matchLength||'—')+' min</span></span></div>'+ratingScale(p.id)+'</div>';
  }

  function renderStep4Desk() {
    desk.innerHTML=deskTitle('Rate performances','One overall rating per player, out of 10.')+'<div class="callout g"><span>Goals, assists and cards were captured in the last step — this is just your judgement call on each performance, out of 10.</span></div><div style="margin-top:16px"><div class="card"><div class="card-h"><h3>Starting lineup ('+starters().length+')</h3><span class="sp"></span></div><div class="card-b">'+starters().map(playerRatingBlock).join('')+'</div></div>'+(bench().length?'<div class="card" style="margin-top:14px"><div class="card-h"><h3>Bench / substitutes ('+bench().length+')</h3><span class="sp"></span></div><div class="card-b">'+bench().map(playerRatingBlock).join('')+'</div></div>':'')+'</div>'+footer(3,5,'Review & save');
  }

  function ratingListRow(p) {
    var r=rating(p.id), x=stat(p.id), pos=S.positions[p.id]||usualPosition(p);
    return '<div class="list-row" data-mf-open-rating="'+esc(p.id)+'"><span class="avatar">'+esc(initials(p))+'</span><span class="who"><b>'+esc(name(p))+'</b><span>'+esc(pos)+' · '+esc(x.minutes||S.matchLength||'—')+' min</span></span>'+(r===''?'<span class="pill a">Not rated</span>':'<span class="rate-chip">'+number(r).toFixed(1)+'<small>/10</small></span>')+'</div>';
  }

  function ratingSheet(p) {
    if(!p) return '';
    return '<div class="scrim" style="position:fixed;z-index:900" data-mf-close-rating></div><div class="sheet-ov" style="position:fixed;z-index:901"><div class="sheet-grip"></div><div class="sheet-h"><h3>Rate this performance</h3><span class="sp"></span><button class="icon-btn" style="width:34px;height:34px" type="button" data-mf-close-rating>×</button></div><div class="sheet-b"><div class="flex" style="margin-bottom:16px"><span class="avatar">'+esc(initials(p))+'</span><div><b style="font-size:14px">'+esc(name(p))+'</b><span class="mut" style="font-size:11.5px;display:block">'+esc((S.positions[p.id]||usualPosition(p))+' · '+(stat(p.id).minutes||S.matchLength||'—')+' min vs '+(S.opponent||'Opponent'))+'</span></div></div>'+ratingScale(p.id)+'<div class="flex" style="margin-top:16px;justify-content:flex-end"><button class="btn outline" type="button" data-mf-close-rating>Cancel</button><button class="btn volt" type="button" data-mf-close-rating>Save</button></div></div></div>';
  }

  function renderStep4Field() {
    var all=starters().concat(bench());
    var active=all.find(function(p){return String(p.id)===String(S.mobileRatingPlayerId);});
    field.innerHTML=fieldTitle('Rate performances','Step 4 of 5 · one player at a time')+'<div class="callout g"><span>Goals, assists and cards were captured in the last step. Tap a player to give their overall rating out of 10.</span></div><div style="margin-top:14px"><div class="card"><div class="card-h"><h3>Starting lineup ('+starters().length+')</h3><span class="sp"></span></div><div class="card-b">'+starters().map(ratingListRow).join('')+'</div></div>'+(bench().length?'<div class="card" style="margin-top:14px"><div class="card-h"><h3>Bench / substitutes ('+bench().length+')</h3><span class="sp"></span></div><div class="card-b">'+bench().map(ratingListRow).join('')+'</div></div>':'')+'</div>'+footer(3,5,'Review & save')+(active?ratingSheet(active):'');
  }

  function renderStep4() { renderStep4Desk(); renderStep4Field(); }

  function eventSummary() {
    var goals=0,assists=0,yellows=0,reds=0;
    selectedPlayers().forEach(function(p){var x=stat(p.id);goals+=number(x.goals);assists+=number(x.assists);yellows+=number(x.yellowCards);reds+=number(x.redCards);});
    return {goals:goals,assists:assists,yellows:yellows,reds:reds,subs:S.substitutions.length};
  }
  function resultLabel() {
    var a=Number(S.homeScore),b=Number(S.awayScore); if(!Number.isFinite(a)||!Number.isFinite(b)) return '—'; return (a>b?'W ':a<b?'L ':'D ')+a+'-'+b;
  }
  function reviewContent() {
    var rated=selectedPlayers().filter(function(p){return rating(p.id)!=='';}).length, e=eventSummary();
    return '<div class="card" style="text-align:center"><div class="card-b"><div class="mut" style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em">Final score</div><div style="font-family:var(--display);font-weight:400;font-size:42px;margin-top:10px">'+esc(resultLabel())+'</div><div style="font-weight:700;margin-top:8px">'+esc(teamName()+' vs '+(S.opponent||'Opponent'))+'</div><p class="mut" style="margin:6px 0 0">'+esc(fmtDate(S.matchDate)+(S.venue?' · '+S.venue:''))+'</p></div></div><div style="margin-top:16px"><div class="callout g"><span>'+rated+' of '+selectedPlayers().length+' players rated. '+e.goals+' goal'+(e.goals===1?'':'s')+', '+e.assists+' assist'+(e.assists===1?'':'s')+', '+e.subs+' substitution'+(e.subs===1?'':'s')+', '+e.yellows+' yellow and '+e.reds+' red card'+(e.reds===1?'':'s')+' logged. Unrated players save as Not observed.</span></div></div>';
  }

  function renderStep5() {
    desk.innerHTML=stepper(5)+'<div style="max-width:560px;margin:0 auto">'+reviewContent()+'<div class="flex" style="margin-top:20px;justify-content:flex-end"><button class="btn outline" data-mf-back="4">← Back</button><button class="btn volt" id="mfSave" '+(S.saving?'disabled':'')+'>✓ '+(S.saving?'Saving…':'Finish & save')+'</button></div></div>';
    field.innerHTML=fieldTitle('Review & save','Step 5 of 5')+reviewContent()+'<div class="flex" style="margin-top:20px;justify-content:flex-end"><button class="btn outline" data-mf-back="4">← Back</button><button class="btn volt" id="mfSaveMobile" '+(S.saving?'disabled':'')+'>✓ '+(S.saving?'Saving…':'Finish & save')+'</button></div>';
  }

  function renderSaved() {
    var html='<div class="empty" style="min-height:420px"><b>Match Facts saved</b><p>'+esc((S.saved&&S.saved.message)||'The match record has been saved.')+'</p><a class="btn volt" href="'+esc(clean('/coach/fixtures'))+'">Back to fixtures</a></div>';
    desk.innerHTML=html; field.innerHTML=html;
  }

  function render() {
    if(S.saved){renderSaved();return;}
    if(window.CoachV2){window.CoachV2.setTitle('Match Facts','ScoutLink Wizard');window.CoachV2.setFieldHeader('Match Facts');}
    if(S.step===1) renderStep1();
    else if(S.step===2) renderStep2();
    else if(S.step===3) renderStep3();
    else if(S.step===4) renderStep4();
    else renderStep5();
  }

  function syncMatchFields() {
    var el=document.getElementById('mfOpponent'); if(el) S.opponent=el.value.trim();
    el=document.getElementById('mfDate'); if(el) S.matchDate=el.value;
    el=document.getElementById('mfVenue'); if(el) S.venue=el.value.trim();
    el=document.getElementById('mfLength'); if(el) S.matchLength=el.value;
    el=document.getElementById('mfHomeScore'); if(el) S.homeScore=el.value;
    el=document.getElementById('mfAwayScore'); if(el) S.awayScore=el.value;
  }

  function validate(next) {
    syncMatchFields();
    if(next>=2){ if(S.source==='fixture'&&!S.fixtureId) return 'Choose a fixture, or switch to New / unscheduled match.'; if(S.source==='standalone'&&(!S.opponent||!S.matchDate)) return 'Opponent and match date are required.'; }
    if(next>=3 && !selectedPlayers().length) return 'Select at least one player who featured.';
    if(next>=3 && !selectedPlayers().every(function(p){return !!S.positions[p.id];})) return 'Set the position played for every selected player.';
    if(next>=4 && (S.homeScore===''||S.awayScore==='')) return 'Enter the final score before continuing.';
    return '';
  }

  function go(next) {
    syncMatchFields();
    if(next==='positions'){S.mobileLineupPhase='positions';saveDraft();render();return;}
    if(next==='select'){S.mobileLineupPhase='select';saveDraft();render();return;}
    next=Number(next);
    var error=validate(next);
    if(error){if(window.CoachV2)window.CoachV2.showToast(error,true);return;}
    S.step=Math.max(1,Math.min(5,next));
    if(S.step!==2)S.mobileLineupPhase='select';
    S.mobileRatingPlayerId='';saveDraft();render();window.scrollTo(0,0);
  }

  function addSubstitution() {
    var opts=selectedPlayers().map(function(p){return'<option value="'+esc(p.id)+'">'+esc(name(p))+'</option>';}).join('');
    var box=window.CoachV2.openModal({title:'Add substitution',html:'<div class="field"><label>Player off</label><select class="in" id="subOff">'+opts+'</select></div><div class="field"><label>Player on</label><select class="in" id="subOn">'+opts+'</select></div><div class="field"><label>Minute</label><input class="in" id="subMinute" type="number" min="0" max="180"></div>',footer:'<button class="btn outline" data-close-coach-overlay>Cancel</button><button class="btn volt" id="saveSub">Save substitution</button>'});
    box.querySelector('#saveSub').onclick=function(){var off=box.querySelector('#subOff').value,on=box.querySelector('#subOn').value,minute=box.querySelector('#subMinute').value;if(!off||!on||off===on){window.CoachV2.showToast('Choose two different players.',true);return;}var op=S.players.find(function(p){return String(p.id)===String(off);}),np=S.players.find(function(p){return String(p.id)===String(on);});S.substitutions.push({off:off,on:on,offName:name(op),onName:name(np),minute:minute});window.CoachV2.closeAll();saveDraft();render();};
  }

  function buildEvents() {
    var events=[];
    selectedPlayers().forEach(function(p){var x=stat(p.id),i;
      for(i=0;i<number(x.goals);i+=1)events.push({type:'goal',playerId:p.id,playerName:name(p)});
      for(i=0;i<number(x.assists);i+=1)events.push({type:'assist',playerId:p.id,playerName:name(p)});
      for(i=0;i<number(x.yellowCards);i+=1)events.push({type:'yellow_card',playerId:p.id,playerName:name(p)});
      for(i=0;i<number(x.redCards);i+=1)events.push({type:'red_card',playerId:p.id,playerName:name(p)});
    });
    S.substitutions.forEach(function(s){events.push({type:'substitution',playerOffId:s.off,playerOnId:s.on,minute:number(s.minute,null)});});
    return events;
  }

  async function ensureFixtureForStandalone() {
    if(S.fixtureId || S.source!=='standalone') return S.fixtureId || null;
    var created=await api('POST','/api/fixtures',{
      opponent:S.opponent,
      fixtureDate:S.matchDate,
      venue:S.venue||null,
      homeOrAway:'Home',
      format:S.format,
      notes:'Created from Match Facts'
    });
    var fixture=created&&created.fixture||created&&created.data||created||{};
    if(!fixture.id) throw new Error('The new fixture could not be created.');
    S.fixtureId=fixture.id;S.fixture=fixture;saveDraft();
    return fixture.id;
  }

  async function save() {
    if(S.saving)return;
    var err=validate(5);if(err){window.CoachV2.showToast(err,true);return;}
    S.saving=true;render();
    try {
      var fixtureId=await ensureFixtureForStandalone();
      var payload={
        fixtureId:fixtureId||null,
        matchDate:S.matchDate,
        opponent:S.opponent,
        format:S.format,
        formation:S.formation,
        homeScore:Number(S.homeScore),
        awayScore:Number(S.awayScore),
        events:buildEvents(),
        playerPositions:{},
        confirmed:true,
        players:selectedPlayers().map(function(p){
          var x=stat(p.id), r=rating(p.id);
          return {
            playerId:p.id,
            positionPlayed:S.positions[p.id]||usualPosition(p),
            minutesPlayed:x.minutes===''?number(S.matchLength,null):number(x.minutes,null),
            goals:number(x.goals),assists:number(x.assists),yellowCards:number(x.yellowCards),redCards:number(x.redCards),
            performanceScore:r===''?null:Number(r)
            /* Intentionally NO attributeRatings / ratings object here. */
          };
        })
      };
      selectedPlayers().forEach(function(p,index){payload.playerPositions['P'+(index+1)]=p.id;});
      var r=await api('POST','/api/match-facts',payload);
      S.saving=false;S.saved=r||{message:'Match Facts saved.'};clearDraft();render();if(window.CoachV2)window.CoachV2.refreshBadges();
    } catch(error) {
      S.saving=false;render();window.CoachV2.showToast(error&&error.message||'Could not save Match Facts.',true);
    }
  }

  function handleClick(event) {
    var t=event.target;
    var n=t.closest('[data-mf-next]');if(n){go(n.getAttribute('data-mf-next'));return;}
    n=t.closest('[data-mf-back]');if(n){go(n.getAttribute('data-mf-back'));return;}
    n=t.closest('[data-mf-source]');if(n){S.source=n.getAttribute('data-mf-source');saveDraft();render();return;}
    n=t.closest('[data-mf-select]');if(n){var pid=n.getAttribute('data-mf-select');S.selected[pid]=!S.selected[pid];if(S.selected[pid]){S.positions[pid]=S.positions[pid]||usualPosition(S.players.find(function(p){return String(p.id)===String(pid);})||{});S.starter[pid]=false;}else{delete S.starter[pid];delete S.positions[pid];delete S.ratings[pid];delete S.stats[pid];}saveDraft();render();return;}
    n=t.closest('[data-mf-starter]');if(n){var spid=n.getAttribute('data-mf-starter');if(!S.starter[spid]&&starters().length>=starterLimit()){window.CoachV2.showToast('This format allows '+starterLimit()+' starters.',true);return;}S.starter[spid]=!S.starter[spid];saveDraft();render();return;}
    n=t.closest('[data-mf-rating]');if(n){var rpid=n.getAttribute('data-mf-player'),rv=n.getAttribute('data-mf-rating');S.ratings[rpid]=rv==='na'?'':Number(rv);saveDraft();render();return;}
    n=t.closest('[data-mf-open-rating]');if(n){S.mobileRatingPlayerId=n.getAttribute('data-mf-open-rating');render();return;}
    if(t.closest('[data-mf-close-rating]')){S.mobileRatingPlayerId='';render();return;}
    if(t.closest('#mfAddSub')){addSubstitution();return;}
    n=t.closest('[data-mf-remove-sub]');if(n){S.substitutions.splice(Number(n.getAttribute('data-mf-remove-sub')),1);saveDraft();render();return;}
    if(t.closest('#mfSave')||t.closest('#mfSaveMobile')){save();}
  }

  function handleChange(event) {
    var t=event.target;
    if(t.id==='mfFixture'){S.fixtureId=t.value;applyFixture(S.fixtures.find(function(f){return String(f.id)===String(t.value);})||null);saveDraft();render();return;}
    if(t.id==='mfFormat'){S.format=normaliseFormat(t.value);if(formations().indexOf(S.formation)<0)S.formation=formations()[0];saveDraft();render();return;}
    if(t.id==='mfFormation'){S.formation=t.value;saveDraft();return;}
    if(t.matches('[data-mf-position]')){S.positions[t.getAttribute('data-mf-position')]=t.value;saveDraft();return;}
    if(t.matches('[data-mf-stat]')){var p=t.getAttribute('data-mf-player'),key=t.getAttribute('data-mf-stat');stat(p)[key]=Math.max(0,number(t.value));saveDraft();return;}
    syncMatchFields();saveDraft();
  }

  function handleInput(event) {
    var t=event.target;
    if(t.id==='mfPlayerSearch'){var q=t.value.trim().toLowerCase();document.querySelectorAll('.mf-player-row').forEach(function(row){row.style.display=!q||row.getAttribute('data-player-name').indexOf(q)>=0?'':'none';});return;}
    if(t.matches('[data-mf-stat]')){var p=t.getAttribute('data-mf-player'),key=t.getAttribute('data-mf-stat');stat(p)[key]=Math.max(0,number(t.value));}
    syncMatchFields();
  }

  async function load() {
    restoreDraft();
    var q=new URLSearchParams(location.search);if(q.get('fixtureId'))S.fixtureId=q.get('fixtureId');
    try {
      var results=await Promise.all([api('GET','/api/fixtures'),api('GET','/api/coaches/my-players')]);
      S.fixtures=rows(results[0],['data','fixtures']);S.players=rows(results[1],['data','players']);
      if(S.fixtureId)applyFixture(S.fixtures.find(function(f){return String(f.id)===String(S.fixtureId);})||null);
      if(!S.matchDate)S.matchDate=new Date().toISOString().slice(0,10);
      render();
    } catch(error) {
      var msg='<div class="empty"><b>Match Facts unavailable</b><p>'+esc(error&&error.message||'Could not load match data.')+'</p></div>';desk.innerHTML=msg;field.innerHTML=msg;
    }
  }

  document.addEventListener('click',handleClick);
  document.addEventListener('change',handleChange);
  document.addEventListener('input',handleInput);
  load();
}());

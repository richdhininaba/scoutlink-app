'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — Add Player.
 * The DOM follows the supplied desktop and phone design specification. The
 * existing V4 scoring client and /api/players contract remain the source of
 * truth for valid positions, attributes and writes.
 */
(function(){
  if(document.body.getAttribute('data-coach-page')!=='add-player') return;

  var desk=document.getElementById('coachDeskPage');
  var field=document.getElementById('coachFieldPage');
  var DRAFT_KEY='scoutlink.coach.addPlayer.exact.v1';
  var saveTimer=null,options=null;
  var S={
    step:1,firstName:'',lastName:'',ageGroup:'',positionGroup:'',primaryPosition:'',
    alternativePositions:[],foot:'Right',heightCategory:'average',buildCategory:'lean',
    ratings:{},assignedCoachId:'',coaches:[],profile:{},created:null,savedAt:null
  };

  function esc(v){return window.CoachV2?window.CoachV2.esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function api(m,p,b){return window.CoachV2?window.CoachV2.api(m,p,b):window.api(m,p,b);}
  function clean(p){return window.CoachV2?window.CoachV2.clean(p):p;}
  function list(r,keys){if(Array.isArray(r))return r;for(var i=0;i<keys.length;i++)if(r&&Array.isArray(r[keys[i]]))return r[keys[i]];return[];}
  function group(){return S.primaryPosition&&window.ScoutLinkScoringV4?window.ScoutLinkScoringV4.groupForPosition(S.primaryPosition):S.positionGroup||'';}
  function groupKey(){return String(group()||'').toLowerCase();}
  function allPositions(){return options&&Array.isArray(options.positions)?options.positions:[];}
  function positionsForGroup(g){return allPositions().filter(function(p){return p.group===g;});}
  function positionLabel(code){var p=allPositions().find(function(x){return x.code===code;});return p?p.label:code||'Not selected';}
  function ratingSections(){
    if(!options||!S.primaryPosition)return[];
    var g=group();
    if(g==='Goalkeeper') return [{key:'goalkeeper',label:'Goalkeeper attributes',hint:'12 · goalkeeper only',rows:options.attributes.goalkeeper||[]}];
    return [
      {key:'general',label:'General attributes',hint:(options.attributes.general||[]).length+' · required set for every outfield player',rows:options.attributes.general||[]},
      {key:groupKey(),label:g+' attributes',hint:((options.attributes[groupKey()]||[]).length)+' · '+positionsForGroup(g).map(function(x){return x.code;}).join(', '),rows:options.attributes[groupKey()]||[]}
    ];
  }
  function applicableCount(){return ratingSections().reduce(function(n,s){return n+s.rows.length;},0);}
  function ratedCount(rows){rows=rows||ratingSections().reduce(function(a,s){return a.concat(s.rows);},[]);return rows.filter(function(r){return S.ratings[r[0]]!==''&&S.ratings[r[0]]!=null;}).length;}
  function notObservedCount(){return Math.max(0,applicableCount()-ratedCount());}
  function profileReadiness(){
    var base=[S.firstName,S.lastName,S.ageGroup,S.primaryPosition,S.foot,S.heightCategory,S.buildCategory].filter(Boolean).length/7;
    var attr=applicableCount()?ratedCount()/applicableCount():0;
    return Math.max(0,Math.min(99,Math.round(base*35+attr*44)));
  }
  function teamName(){return S.profile.team_name||(window.CoachV2&&window.CoachV2.teamName())||'Your team';}
  function season(){var d=new Date(),y=d.getMonth()>=6?d.getFullYear():d.getFullYear()-1;return y+'/'+String((y+1)%100).padStart(2,'0')+' — current';}
  function coachName(c){return[c&&c.first_name,c&&c.last_name].filter(Boolean).join(' ')||'Coach';}
  function selectedCoach(){return S.coaches.find(function(c){return String(c.id)===String(S.assignedCoachId);})||S.profile||{};}
  function initials(){return((S.firstName||'P').charAt(0)+(S.lastName||'L').charAt(0)).toUpperCase();}
  function heightOptions(){return[
    ['very_short','155–163cm'],['short','163–170cm'],['average','170–178cm'],['tall','178–185cm'],['very_tall','185cm+']
  ];}
  function buildOptions(){return[
    ['very_slight','Very slight'],['slight','Slight'],['lean','Lean'],['athletic','Athletic'],['stocky','Stocky'],['powerful','Powerful'],['very_powerful','Very powerful']
  ];}
  function optionLabel(items,value){var x=items.find(function(i){return i[0]===value;});return x?x[1]:value||'—';}
  function saveDraft(){
    try{S.savedAt=new Date().toISOString();localStorage.setItem(DRAFT_KEY,JSON.stringify({version:1,state:S}));}catch(_){}
  }
  function scheduleDraft(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveDraft();render();},350);}
  function restore(){
    try{var d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(d&&d.state){S=Object.assign(S,d.state,{coaches:[],profile:{},created:null});}}catch(_){}
  }
  function clearDraft(){try{localStorage.removeItem(DRAFT_KEY);}catch(_){} S.savedAt=null;}

  function stepper(step){
    var labels=['Identity','Physical & attributes','Team assignment','Review'];
    return '<div class="steps" style="margin-bottom:16px">'+labels.map(function(label,i){var n=i+1,cls=n<step?' dn':n===step?' on':'';return'<button type="button" class="st'+cls+'" data-go-step="'+n+'" style="border:0;text-align:left"><u>'+(n<step?'✓':n)+'</u><b>'+esc(label)+'</b></button>';}).join('')+'</div>';
  }
  function chip(label,on,attrs){return'<button type="button" class="chip'+(on?' on':'')+'" '+(attrs||'')+'>'+esc(label)+'</button>';}
  function inputField(label,html){return'<div class="fld"><span class="fl">'+esc(label)+'</span>'+html+'</div>';}
  function shellTitle(){if(window.CoachV2)window.CoachV2.setTitle('Add player','Step '+S.step+' of 4 · '+(['Identity','Physical & attributes','Team assignment','Review'][S.step-1]));}
  function footer(nextLabel){
    var back=S.step>1?'<button class="btn" type="button" data-prev>Back</button>':'';
    var cancel=S.step===1?'<a class="btn" href="'+clean('/coach/my-players')+'">Cancel</a>':'';
    var primary=S.step<4?'<button class="btn p" type="button" data-next>'+esc(nextLabel)+'</button>':'<button class="btn p" type="button" data-submit>Add player to squad</button>';
    return '<div class="card" style="margin-top:14px"><div class="foot" style="border-top:0"><span class="mut" style="font-size:11.5px">Step '+S.step+' of 4'+(S.step===2?' · '+ratedCount()+' of '+applicableCount()+' rated':S.step===4?' · '+ratedCount()+' of '+applicableCount()+' rated, '+notObservedCount()+' Not observed':'')+'</span><div class="sp"></div>'+cancel+back+(S.step===4?'<button class="btn" type="button" data-save-draft>Save as draft</button>':'')+primary+'</div></div>';
  }
  function applicableCard(){
    var g=group(),sections=ratingSections(),count=applicableCount();
    if(!S.primaryPosition)return'<div class="card"><div class="card-h"><h3>Applicable attributes</h3></div><div class="card-b mut">Choose a primary position to derive the V4 assessment.</div></div>';
    var bars=sections.map(function(sec,i){var w=count?sec.rows.length/count*100:0;return'<span style="display:block;width:'+w+'%;background:'+(i?'var(--slate)':'var(--blue)')+';height:14px;color:#fff;text-align:center;font-size:10.5px;font-weight:700">'+sec.rows.length+'</span>';}).join('');
    return'<div class="card"><div class="card-h"><h3>Applicable attributes</h3><div class="sp"></div></div><div class="card-b"><div style="font-size:13px;font-weight:700">'+esc(S.primaryPosition)+' → '+count+' attributes</div><div class="mut" style="font-size:11.5px;margin:6px 0 12px">'+sections.map(function(s){return s.label.replace(' attributes','')+' '+s.rows.length;}).join(' + ')+'</div><div style="display:flex;width:100%;height:14px">'+bars+'</div><div class="lgd" style="margin-top:8px">'+sections.map(function(s,i){return'<span><i style="background:'+(i?'var(--slate)':'var(--blue)')+'"></i>'+esc(s.label.replace(' attributes',''))+' '+s.rows.length+'</span>';}).join('')+'</div><hr class="sep"><div class="mut" style="font-size:11.5px">Goalkeepers use the 12 goalkeeper attributes and do not complete General.</div></div></div>';
  }
  function draftCard(){return'<div class="card"><div class="card-h"><h3>Draft saved</h3><div class="sp"></div></div><div class="card-b"><div class="mut" style="font-size:11.5px">'+(S.savedAt?'Saved locally. You can leave this page and resume without losing the assessment.':'Changes save locally as you work.')+'</div><div style="margin-top:10px"><button class="btn sm" type="button" data-discard-draft>Discard draft</button></div></div></div>';}
  function relatedAltPositions(){
    var map={Goalkeeper:['GK'],Defender:['RB','CB','LB','RWB','LWB','DM'],Midfielder:['DM','CM','AM','RM','LM','RW','LW'],Attacker:['AM','RW','LW','CF','ST','RM','LM']};
    return (map[group()]||allPositions().map(function(p){return p.code;})).filter(function(x){return x!==S.primaryPosition;});
  }
  function deskIdentity(){
    var ages=(options&&options.ageGroups)||['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'];
    var groups=['Goalkeeper','Defender','Midfielder','Attacker'];
    return stepper(1)+'<div class="g" style="grid-template-columns:1fr 316px"><div class="card"><div class="card-h"><h3>Identity</h3><div class="sp"></div></div><div class="card-b">'+
      '<div class="g" style="grid-template-columns:1fr 1fr">'+inputField('First name','<input class="inp" data-field="firstName" value="'+esc(S.firstName)+'" autocomplete="given-name">')+inputField('Last name','<input class="inp" data-field="lastName" value="'+esc(S.lastName)+'" autocomplete="family-name">')+'</div>'+
      inputField('Age group','<div class="chips">'+ages.map(function(x){return chip(x,S.ageGroup===x,'data-age="'+x+'"');}).join('')+'</div>')+'<hr class="sep">'+
      inputField('Position group','<div class="chips">'+groups.map(function(x){return chip(x,S.positionGroup===x,'data-group="'+x+'"');}).join('')+'</div>')+
      inputField('Primary position','<div class="chips">'+positionsForGroup(S.positionGroup).map(function(p){return chip(p.code+' — '+p.label,S.primaryPosition===p.code,'data-primary="'+p.code+'"');}).join('')+'</div><div class="help">The attribute assessment on the next step is derived from the primary position.</div>')+
      inputField('Alternative positions — optional, up to 2','<div class="chips">'+relatedAltPositions().map(function(code){var p=allPositions().find(function(x){return x.code===code;});return chip(code+(p?' — '+p.label:''),S.alternativePositions.indexOf(code)>=0,'data-alt="'+code+'"');}).join('')+'</div>')+
      inputField('Preferred foot','<div class="chips">'+['Right','Left','Both'].map(function(x){return chip(x,S.foot===x,'data-foot="'+x+'"');}).join('')+'</div>')+
      '</div></div><div class="g">'+applicableCard()+draftCard()+'</div></div>'+footer('Continue to attributes');
  }
  function ratingScale(row){
    var key=row[0],label=row[1],v=S.ratings[key];
    return'<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div style="display:flex;align-items:center;margin-bottom:7px"><span style="font-size:12px;font-weight:600">'+esc(label)+'</span><div style="flex:1"></div><span class="mut" style="font-size:11px">'+(v?esc(v+'/10'):'Not observed')+'</span></div><div class="scale">'+Array.from({length:10},function(_,i){var n=i+1;return'<button type="button" data-rating="'+esc(key)+'" data-value="'+n+'" class="'+(Number(v)===n?'on':'')+'">'+n+'</button>';}).join('')+'<button type="button" data-rating="'+esc(key)+'" data-value="" class="na '+(!v?'on':'')+'">Not observed</button></div></div>';
  }
  function progressRing(){
    var total=applicableCount(),rated=ratedCount(),ratio=total?rated/total:0,c=2*Math.PI*46,d=(ratio*c).toFixed(1);
    return'<svg width="110" height="110" viewBox="0 0 120 120" style="display:block;margin:0 auto"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--canvas2)" stroke-width="11"></circle><circle cx="60" cy="60" r="46" fill="none" stroke="var(--blue)" stroke-width="11" stroke-linecap="butt" transform="rotate(-90 60 60)" stroke-dasharray="'+d+' '+c.toFixed(1)+'"></circle><text x="60" y="58" text-anchor="middle" font-size="23" font-weight="700" fill="var(--ink)">'+rated+'/'+total+'</text><text x="60" y="76" text-anchor="middle" font-size="9" fill="var(--ink3)">rated</text></svg>';
  }
  function deskPhysical(){
    var secs=ratingSections();
    return stepper(2)+'<div class="g" style="grid-template-columns:1fr 316px"><div class="g"><div class="card"><div class="card-h"><h3>Physical context</h3><div class="sp"></div></div><div class="card-b g" style="grid-template-columns:1fr 1fr"><div class="fld" style="margin:0"><span class="fl">Height range</span><div class="chips">'+heightOptions().map(function(x){return chip(x[1],S.heightCategory===x[0],'data-height="'+x[0]+'"');}).join('')+'</div></div><div class="fld" style="margin:0"><span class="fl">Build</span><div class="chips">'+buildOptions().map(function(x){return chip(x[1],S.buildCategory===x[0],'data-build="'+x[0]+'"');}).join('')+'</div></div></div></div>'+
      secs.map(function(sec){return'<div class="card"><div class="card-h"><h3>'+esc(sec.label)+'</h3><div class="sp"></div><span class="hint">'+esc(sec.hint)+'</span><span class="tag '+(ratedCount(sec.rows)?'b':'')+'">'+ratedCount(sec.rows)+' of '+sec.rows.length+' rated</span></div><div class="card-b" style="padding-top:6px">'+sec.rows.map(ratingScale).join('')+'</div></div>';}).join('')+'</div><div class="g"><div class="card"><div class="card-h"><h3>Assessment progress</h3><div class="sp"></div></div><div class="card-b" style="text-align:center">'+progressRing()+'<div class="mut" style="font-size:11.5px;margin-top:8px">You can save a partial assessment. Blank means Not observed, never zero.</div></div></div><div class="card"><div class="card-h"><h3>How this scores</h3></div><div class="card-b"><div class="mut" style="font-size:11.5px">Ratings run 1–10 on a single scale across every attribute. ScoutLink weights them by position, so a winger\'s Finishing and a centre-back\'s Aerial defending are not compared like for like. Unrated attributes lower profile readiness but never lower the overall rating.</div></div></div></div></div>'+footer('Continue to team assignment');
  }
  function loadBars(){
    var coaches=S.coaches.length?S.coaches:[S.profile],counts={};
    // This screen is a visual load indicator; exact counts are populated from the live squad when available.
    (S._players||[]).forEach(function(p){var id=String(p.assigned_coach_id||'');counts[id]=(counts[id]||0)+1;});
    var max=Math.max.apply(null,coaches.map(function(c){return counts[String(c.id)]||0;}).concat([1]));
    return coaches.map(function(c){var n=counts[String(c.id)]||0;return'<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px"><span style="width:74px;font-size:11.5px">'+esc((coachName(c).split(' ')[0]||'Coach'))+'</span><span style="flex:1;height:7px;background:var(--canvas2);position:relative"><u style="position:absolute;left:0;top:0;bottom:0;width:'+(n/max*100)+'%;background:var(--slate)"></u></span><b class="num" style="width:28px;text-align:right;font-size:11.5px">'+n+'</b></div>';}).join('');
  }
  function deskTeam(){
    var coaches=S.coaches.length?S.coaches:[S.profile];
    return stepper(3)+'<div class="g" style="grid-template-columns:1fr 316px"><div class="card"><div class="card-h"><h3>Team assignment</h3><div class="sp"></div></div><div class="card-b">'+
      inputField('Squad','<div class="inp dd">'+esc(teamName()+(S.ageGroup?' '+S.ageGroup:''))+'</div>')+
      inputField('Assigned coach','<div class="chips">'+coaches.map(function(c){var count=(S._players||[]).filter(function(p){return String(p.assigned_coach_id||'')===String(c.id);}).length;return chip(coachName(c)+' · '+count+' players',String(S.assignedCoachId||S.profile.id)===String(c.id),'data-coach="'+esc(c.id)+'"');}).join('')+'</div><div class="help">The assigned coach receives scout interest notifications and appears on the player profile.</div>')+'<hr class="sep">'+
      inputField('Season','<div class="inp dd">'+esc(season())+'</div><div class="help">Players are archived per season, so last season\'s record stays intact.</div>')+
      '</div></div><div class="card"><div class="card-h"><h3>Squad load</h3><div class="sp"></div><span class="hint">Players per coach</span></div><div class="card-b">'+loadBars()+'<div class="mut" style="font-size:11.5px">Assigning this player updates the selected coach\'s squad load.</div></div></div></div>'+footer('Continue to review');
  }
  function shortRatingRows(rows,max){return rows.slice(0,max).map(function(r){var v=S.ratings[r[0]];return'<div class="at"><span class="an">'+esc(r[1])+'</span><span class="track"><u style="width:'+(v?Number(v)*10:0)+'%"></u></span><span class="atv '+(!v?'no':'')+'">'+(v?esc(v+'/10'):'Not observed')+'</span></div>';}).join('')+(rows.length>max?'<div class="mut" style="font-size:11.5px;padding-top:8px">'+(rows.length-max)+' more rows</div>':'');}
  function reviewReadyCard(){var r=profileReadiness();return'<div class="card"><div class="card-h"><h3>Profile readiness preview</h3></div><div class="card-b" style="text-align:center">'+progressDonut(r)+'<div class="mut" style="font-size:11.5px;text-align:left;margin-top:12px">Reaches 100% with:</div><div style="text-align:left;font-size:11.5px;color:var(--ink3)"><div>● '+notObservedCount()+' remaining attributes rated</div><div>● 1 approved video</div><div>● 1 Match Facts record</div></div></div></div>';}
  function progressDonut(pc){var c=2*Math.PI*46,d=(pc/100*c).toFixed(1);return'<svg width="118" height="118" viewBox="0 0 120 120" style="display:block;margin:0 auto"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--canvas2)" stroke-width="11"></circle><circle cx="60" cy="60" r="46" fill="none" stroke="var(--blue)" stroke-width="11" transform="rotate(-90 60 60)" stroke-dasharray="'+d+' '+c.toFixed(1)+'"></circle><text x="60" y="58" text-anchor="middle" font-size="23" font-weight="700">'+pc+'%</text><text x="60" y="76" text-anchor="middle" font-size="9" fill="var(--ink3)">on creation</text></svg>';}
  function deskReview(){
    var secs=ratingSections();
    return stepper(4)+'<div class="g" style="grid-template-columns:1fr 316px"><div class="g"><div class="card"><div class="card-h"><h3>Player</h3></div><div class="card-b"><div style="display:flex;align-items:center;gap:16px"><div class="av" style="width:54px;height:54px;border-radius:3px;font-size:16px">'+esc(initials())+'</div><div class="sp"><b style="font-size:18px">'+esc((S.firstName+' '+S.lastName).trim()||'Player')+'</b><div class="mut">'+esc(S.primaryPosition+' — '+positionLabel(S.primaryPosition)+' · '+(S.alternativePositions.length?'also '+S.alternativePositions.join(', ')+' · ':'')+S.ageGroup+' · '+S.foot+' footed · '+optionLabel(heightOptions(),S.heightCategory)+' · '+optionLabel(buildOptions(),S.buildCategory)+' · '+teamName()+' · '+coachName(selectedCoach()))+'</div></div><button class="btn" type="button" data-go-step="1">Edit identity</button></div></div></div>'+
      '<div class="g" style="grid-template-columns:1fr 1fr">'+secs.map(function(sec,i){return'<div class="card"><div class="card-h"><h3>'+esc(sec.label.replace(' attributes','')+' — '+sec.rows.length)+'</h3><div class="sp"></div><button class="btn q" type="button" data-go-step="2">Edit</button></div><div class="card-b">'+shortRatingRows(sec.rows,7)+'</div></div>';}).join('')+'</div></div><div class="g">'+reviewReadyCard()+'<div class="card"><div class="card-h"><h3>On creation</h3></div><div class="card-b" style="font-size:11.5px;color:var(--ink3)"><div>● Player added to '+esc(teamName()+(S.ageGroup?' '+S.ageGroup:''))+'</div><div>● '+ratedCount()+' attribute ratings stored, '+notObservedCount()+' as Not observed</div><div>● Overall rating and best role calculated</div><div>● Estimated value calculated when evidence supports it</div><div>● Video visibility follows coach moderation</div></div></div></div></div>'+footer('');
  }

  function phoneHeader(){
    if(window.CoachV2&&window.CoachV2.setFieldHeader)window.CoachV2.setFieldHeader('Add player','','<a class="btn q" href="'+esc(clean('/coach/my-players'))+'">Cancel</a>','back');
    var names=['Identity','Physical & attributes','Team assignment','Review'];
    return'<div style="margin-bottom:14px"><div style="display:flex;gap:4px;margin-bottom:8px">'+[1,2,3,4].map(function(n){return'<u style="display:block;height:3px;flex:1;background:'+(n<=S.step?'var(--blue)':'var(--canvas2)')+'"></u>';}).join('')+'</div><div style="display:flex;align-items:baseline"><b style="font-size:13px">'+esc(names[S.step-1])+'</b><span class="mut" style="font-size:11px;margin-left:auto">Step '+S.step+' of 4</span></div></div>';
  }
  function phoneIdentity(){
    return phoneHeader()+'<div class="card"><div class="card-b">'+inputField('First name','<input class="inp" data-field="firstName" value="'+esc(S.firstName)+'">')+inputField('Last name','<input class="inp" data-field="lastName" value="'+esc(S.lastName)+'">')+inputField('Age group','<div class="chips">'+((options&&options.ageGroups)||[]).map(function(x){return chip(x,S.ageGroup===x,'data-age="'+x+'"');}).join('')+'</div>')+inputField('Position group','<div class="chips">'+['Goalkeeper','Defender','Midfielder','Attacker'].map(function(x){return chip(x,S.positionGroup===x,'data-group="'+x+'"');}).join('')+'</div>')+inputField('Primary position','<div class="chips">'+positionsForGroup(S.positionGroup).map(function(p){return chip(p.code,S.primaryPosition===p.code,'data-primary="'+p.code+'"');}).join('')+'</div>')+inputField('Alternative positions · max 2','<div class="chips">'+relatedAltPositions().map(function(x){return chip(x,S.alternativePositions.indexOf(x)>=0,'data-alt="'+x+'"');}).join('')+'</div>')+inputField('Preferred foot','<div class="chips">'+['Right','Left','Both'].map(function(x){return chip(x,S.foot===x,'data-foot="'+x+'"');}).join('')+'</div>')+'</div></div>'+phoneFooter('Continue to attributes');
  }
  function phonePhysical(){
    return phoneHeader()+'<div class="card" style="margin-bottom:10px"><div class="card-b"><div class="fld"><span class="fl">Height range</span><div class="chips">'+heightOptions().map(function(x){return chip(x[1],S.heightCategory===x[0],'data-height="'+x[0]+'"');}).join('')+'</div></div><div class="fld"><span class="fl">Build</span><div class="chips">'+buildOptions().map(function(x){return chip(x[1],S.buildCategory===x[0],'data-build="'+x[0]+'"');}).join('')+'</div></div></div></div>'+ratingSections().map(function(sec){return'<div class="pcap">'+esc(sec.label)+' <span>'+ratedCount(sec.rows)+'/'+sec.rows.length+'</span></div><div class="card"><div class="card-b" style="padding-top:3px">'+sec.rows.map(function(row){var v=S.ratings[row[0]];return'<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div style="display:flex;margin-bottom:6px"><b style="font-size:11.5px">'+esc(row[1])+'</b><div class="sp"></div><span class="mut">'+(v?v+'/10':'Not observed')+'</span></div><div class="rating-scale scale">'+Array.from({length:10},function(_,i){var n=i+1;return'<button type="button" data-rating="'+esc(row[0])+'" data-value="'+n+'" class="'+(Number(v)===n?'on':'')+'">'+n+'</button>';}).join('')+'<button type="button" class="na '+(!v?'on':'')+'" data-rating="'+esc(row[0])+'" data-value="">Not observed</button></div></div>';}).join('')+'</div></div>';}).join('')+phoneFooter('Continue to team');
  }
  function phoneTeam(){
    var coaches=S.coaches.length?S.coaches:[S.profile];
    return phoneHeader()+'<div class="card"><div class="card-b">'+inputField('Squad','<div class="inp">'+esc(teamName()+(S.ageGroup?' '+S.ageGroup:''))+'</div>')+inputField('Assigned coach','<div class="chips">'+coaches.map(function(c){return chip(coachName(c),String(S.assignedCoachId||S.profile.id)===String(c.id),'data-coach="'+esc(c.id)+'"');}).join('')+'</div>')+inputField('Season','<div class="inp">'+esc(season())+'</div>')+'</div></div>'+phoneFooter('Continue to review');
  }
  function phoneReview(){
    return phoneHeader()+'<div class="card"><div class="card-b"><div style="display:flex;align-items:center;gap:10px"><div class="av" style="width:42px;height:42px;border-radius:3px">'+esc(initials())+'</div><div class="sp"><b style="font-size:15px">'+esc((S.firstName+' '+S.lastName).trim())+'</b><div class="mut" style="font-size:10.5px">'+esc(S.primaryPosition+' · '+S.ageGroup+' · '+S.foot+' foot · '+teamName())+'</div></div><button class="btn q sm" data-go-step="1">Edit</button></div></div></div><div class="pcap">Assessment <span>'+ratedCount()+'/'+applicableCount()+'</span></div>'+ratingSections().map(function(sec){return'<div class="card" style="margin-bottom:8px"><div class="card-h"><h3>'+esc(sec.label)+'</h3><div class="sp"></div><button class="btn q sm" data-go-step="2">Edit</button></div><div class="card-b">'+shortRatingRows(sec.rows,4)+'</div></div>';}).join('')+'<div class="pcap">Profile readiness</div>'+reviewReadyCard()+phoneFooter('');
  }
  function phoneFooter(label){
    return'<div class="card" style="margin-top:12px"><div class="foot" style="border-top:0;padding:12px"><span class="mut">Step '+S.step+' of 4</span><div class="sp"></div>'+(S.step>1?'<button class="btn" type="button" data-prev>Back</button>':'')+(S.step<4?'<button class="btn p" type="button" data-next>'+esc(label)+'</button>':'<button class="btn p" type="button" data-submit>Add player</button>')+'</div></div>';
  }

  function render(){
    shellTitle();
    if(!desk||!field)return;
    desk.innerHTML=S.step===1?deskIdentity():S.step===2?deskPhysical():S.step===3?deskTeam():deskReview();
    field.innerHTML=S.step===1?phoneIdentity():S.step===2?phonePhysical():S.step===3?phoneTeam():phoneReview();
    bind();
  }
  function validateStep(){
    if(S.step===1){if(!S.firstName.trim()||!S.lastName.trim())return'First name and last name are required.';if(!S.ageGroup)return'Choose an age group.';if(!S.primaryPosition)return'Choose a primary position.';}
    if(S.step===3&&!S.assignedCoachId&&S.profile.id)S.assignedCoachId=S.profile.id;
    return'';
  }
  function setStep(n){var err=validateStep();if(n>S.step&&err){alert(err);return;}S.step=Math.max(1,Math.min(4,n));saveDraft();render();window.scrollTo({top:0,behavior:'smooth'});}
  function chooseAlt(code){var i=S.alternativePositions.indexOf(code);if(i>=0)S.alternativePositions.splice(i,1);else if(S.alternativePositions.length<2)S.alternativePositions.push(code);else alert('Choose up to two alternative positions.');scheduleDraft();}
  function bind(){
    document.querySelectorAll('[data-field]').forEach(function(el){el.addEventListener('input',function(){S[el.dataset.field]=el.value;scheduleDraft();});});
    document.querySelectorAll('[data-age]').forEach(function(b){b.onclick=function(){S.ageGroup=b.dataset.age;scheduleDraft();};});
    document.querySelectorAll('[data-group]').forEach(function(b){b.onclick=function(){S.positionGroup=b.dataset.group;if(group()!==S.positionGroup){S.primaryPosition='';S.alternativePositions=[];S.ratings={};}scheduleDraft();};});
    document.querySelectorAll('[data-primary]').forEach(function(b){b.onclick=function(){var old=S.primaryPosition;S.primaryPosition=b.dataset.primary;S.positionGroup=window.ScoutLinkScoringV4.groupForPosition(S.primaryPosition);if(old!==S.primaryPosition){S.alternativePositions=S.alternativePositions.filter(function(x){return x!==S.primaryPosition;});var allowed=(window.ScoutLinkScoringV4.attributesForPosition(S.primaryPosition,options)||[]).map(function(x){return x[0];});Object.keys(S.ratings).forEach(function(k){if(allowed.indexOf(k)<0)delete S.ratings[k];});}scheduleDraft();};});
    document.querySelectorAll('[data-alt]').forEach(function(b){b.onclick=function(){chooseAlt(b.dataset.alt);};});
    document.querySelectorAll('[data-foot]').forEach(function(b){b.onclick=function(){S.foot=b.dataset.foot;scheduleDraft();};});
    document.querySelectorAll('[data-height]').forEach(function(b){b.onclick=function(){S.heightCategory=b.dataset.height;scheduleDraft();};});
    document.querySelectorAll('[data-build]').forEach(function(b){b.onclick=function(){S.buildCategory=b.dataset.build;scheduleDraft();};});
    document.querySelectorAll('[data-coach]').forEach(function(b){b.onclick=function(){S.assignedCoachId=b.dataset.coach;scheduleDraft();};});
    document.querySelectorAll('[data-rating]').forEach(function(b){b.onclick=function(){var v=b.dataset.value;S.ratings[b.dataset.rating]=v===''?null:Number(v);scheduleDraft();};});
    document.querySelectorAll('[data-next]').forEach(function(b){b.onclick=function(){setStep(S.step+1);};});
    document.querySelectorAll('[data-prev]').forEach(function(b){b.onclick=function(){setStep(S.step-1);};});
    document.querySelectorAll('[data-go-step]').forEach(function(b){b.onclick=function(){var n=Number(b.dataset.goStep)||1;if(n<=S.step)setStep(n);};});
    document.querySelectorAll('[data-discard-draft]').forEach(function(b){b.onclick=function(){if(confirm('Discard this player draft?')){clearDraft();S=Object.assign(S,{step:1,firstName:'',lastName:'',ageGroup:'',positionGroup:'',primaryPosition:'',alternativePositions:[],foot:'Right',heightCategory:'average',buildCategory:'lean',ratings:{},created:null});render();}};});
    document.querySelectorAll('[data-save-draft]').forEach(function(b){b.onclick=function(){saveDraft();if(window.CoachV2)window.CoachV2.showToast('Draft saved.');};});
    document.querySelectorAll('[data-submit]').forEach(function(b){b.onclick=submit;});
  }
  function submit(e){
    var err=validateStep();if(err){alert(err);return;}
    var btn=e&&e.currentTarget;if(btn){btn.disabled=true;btn.textContent='Adding…';}
    var body={firstName:S.firstName.trim(),lastName:S.lastName.trim(),ageGroup:S.ageGroup,primaryPosition:S.primaryPosition,positions:[S.primaryPosition].concat(S.alternativePositions),alternativePositions:S.alternativePositions,foot:S.foot,heightCategory:S.heightCategory,buildCategory:S.buildCategory,assignedCoachId:S.assignedCoachId||S.profile.id||null,attributeRatings:S.ratings};
    api('POST','/api/players',body).then(function(r){var p=r.player||r.data||r;S.created=p;clearDraft();if(window.CoachV2)window.CoachV2.showToast('Player added to squad.');location.href=clean('/player/profile?id='+encodeURIComponent(p.id||p.player_id||''));}).catch(function(x){alert(x.message||'Could not add player.');if(btn){btn.disabled=false;btn.textContent='Add player to squad';}});
  }
  async function init(){
    try{
      restore();
      options=await window.ScoutLinkScoringV4.loadOptions();
      var rs=await Promise.allSettled([api('GET','/api/coaches/profile'),api('GET','/api/coaches/my-players')]);
      S.profile=rs[0].status==='fulfilled'?(rs[0].value.coach||rs[0].value.profile||rs[0].value||{}):{};
      S._players=rs[1].status==='fulfilled'?list(rs[1].value,['data','players']):[];
      S.assignedCoachId=S.assignedCoachId||S.profile.id||'';
      S.coaches=[S.profile];
      if(S.profile&&S.profile.is_super_user){var cr=await api('GET','/api/coaches/team-coaches').catch(function(){return{data:[]};});S.coaches=S.coaches.concat(list(cr,['data','coaches']));}
      S.coaches=S.coaches.filter(function(c,i,a){return c&&c.id&&a.findIndex(function(x){return x&&String(x.id)===String(c.id);})===i;});
      render();
    }catch(e){var msg='<div class="card"><div class="card-b"><b>Add Player could not load.</b><div class="mut">'+esc(e.message||'Unknown error')+'</div></div></div>';if(desk)desk.innerHTML=msg;if(field)field.innerHTML=msg;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

'use strict';

(function(){
  if(document.body.getAttribute('data-coach-page')!=='add-player')return;
  var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage'),options=null;
  var S={step:1,firstName:'',lastName:'',ageGroup:'U12',positionGroup:'Midfielder',primaryPosition:'CM',foot:'Right',heightCategory:'average',buildCategory:'athletic',ratings:{},profile:{}};
  var DRAFT='scoutlink.coach.add-player.v6.exact';

  function esc(v){return window.CoachV2.esc(v);}
  function api(m,p,b){return window.CoachV2.api(m,p,b);}
  function clean(p){return window.CoachV2.clean(p);}
  function save(){try{localStorage.setItem(DRAFT,JSON.stringify(S));}catch(_){}}
  function restore(){try{var x=JSON.parse(localStorage.getItem(DRAFT)||'null');if(x)S=Object.assign(S,x,{profile:{}});}catch(_){}}
  function positions(){return options&&Array.isArray(options.positions)?options.positions:[];}
  function groupFor(code){var p=positions().find(function(x){return x.code===code;});return p?p.group:S.positionGroup;}
  function label(code){var p=positions().find(function(x){return x.code===code;});return p?p.label:code||'—';}
  function posForGroup(){return positions().filter(function(p){return p.group===S.positionGroup;});}
  function sections(){
    if(!options||!S.primaryPosition)return[];
    var g=groupFor(S.primaryPosition),key=String(g||'').toLowerCase();
    if(g==='Goalkeeper')return[{label:'Goalkeeper attributes',rows:options.attributes.goalkeeper||[]}];
    return[{label:'General attributes',rows:options.attributes.general||[]},{label:g+' attributes',rows:options.attributes[key]||[]}];
  }
  function allRows(){return sections().reduce(function(a,s){return a.concat(s.rows);},[]);}
  function rated(){return allRows().filter(function(r){return S.ratings[r[0]]!==''&&S.ratings[r[0]]!=null;}).length;}
  function total(){return allRows().length;}
  function stepper(){
    var labels=['Player details','Attribute assessment','Review & save'];
    return'<div class="stepper">'+labels.map(function(x,i){var n=i+1,cls=n<S.step?' dn':n===S.step?' on':'';return'<div class="sp-i'+cls+'"><b>'+(n<S.step?'✓':n)+'</b><span>'+esc(x)+'</span></div>'+(n<3?'<div class="ln'+(n<S.step?' dn':'')+'"></div>':'');}).join('')+'</div>';
  }
  function fieldWrap(label,html,opt){return'<div class="field"><label>'+esc(label)+(opt?'<em>Optional</em>':'')+'</label>'+html+'</div>';}
  function chips(items,current,attr){return'<div class="flex" style="gap:8px">'+items.map(function(x){var value=Array.isArray(x)?x[0]:x,lab=Array.isArray(x)?x[1]:x;return'<button class="btn sm '+(String(current)===String(value)?'pitch':'outline')+'" type="button" '+attr+'="'+esc(value)+'">'+esc(lab)+'</button>';}).join('')+'</div>';}
  function physicalLabels(){
    var hm={very_short:'Very Short',short:'Short',average:'Average (170–178 cm)',tall:'Tall',very_tall:'Very Tall'};
    var bm={very_slight:'Very Slight',slight:'Slight',lean:'Lean',athletic:'Athletic (72–80 kg)',stocky:'Stocky',powerful:'Powerful',very_powerful:'Very Powerful'};
    return[(hm[S.heightCategory]||S.heightCategory),(bm[S.buildCategory]||S.buildCategory)];
  }
  function ratingRow(row){
    var key=row[0],lab=row[1],v=S.ratings[key];
    return'<div class="rate-row"><div class="rr-top"><b>'+esc(lab)+'</b><span class="cur '+(v==null||v===''?'off':'')+'">'+(v==null||v===''?'Not observed':Number(v).toFixed(1))+'</span></div><div class="rscale">'+[1,2,3,4,5,6,7,8,9,10].map(function(n){return'<u class="'+(Number(v)===n?'on':'')+'" data-rate-key="'+esc(key)+'" data-rate="'+n+'">'+n+'</u>';}).join('')+'<u class="na '+(v==null||v===''?'on':'')+'" data-rate-key="'+esc(key)+'" data-rate="">Not observed</u></div></div>';
  }
  function details(){
    var ages=(options&&options.ageGroups)||['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'];
    return stepper()+'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">Player details</h1><p class="mut" style="margin:0 0 20px">Identity and physical profile. Position determines which attributes you\'ll rate next.</p>'+
      '<div class="two">'+fieldWrap('First name','<input class="in" data-v6-field="firstName" value="'+esc(S.firstName)+'">')+fieldWrap('Last name','<input class="in" data-v6-field="lastName" value="'+esc(S.lastName)+'">')+'</div>'+
      '<div class="two">'+fieldWrap('Age group',chips(ages,S.ageGroup,'data-age'))+fieldWrap('Position group',chips(['Goalkeeper','Defender','Midfielder','Attacker'],S.positionGroup,'data-group'))+'</div>'+
      fieldWrap('Specific position','<select class="in" data-v6-field="primaryPosition">'+posForGroup().map(function(p){return'<option value="'+esc(p.code)+'"'+(p.code===S.primaryPosition?' selected':'')+'>'+esc(p.code+' — '+p.label)+'</option>';}).join('')+'</select><div class="help">Options change to match the position group above.</div>')+
      '<div class="two">'+fieldWrap('Height category',chips([['very_short','Very Short'],['short','Short'],['average','Average'],['tall','Tall'],['very_tall','Very Tall']],S.heightCategory,'data-height'),true)+fieldWrap('Build category',chips([['very_slight','Very Slight'],['slight','Slight'],['lean','Lean'],['athletic','Athletic'],['stocky','Stocky'],['powerful','Powerful'],['very_powerful','Very Powerful']],S.buildCategory,'data-build'),true)+'</div>'+
      fieldWrap('Preferred foot',chips(['Right','Left','Both'],S.foot,'data-foot'),true)+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end"><a class="btn outline" href="'+esc(clean('/coach/my-players'))+'">Cancel</a><button class="btn volt" type="button" data-next>Continue</button></div>';
  }
  function attributes(){
    var g=groupFor(S.primaryPosition),secs=sections();
    return stepper()+'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">Attribute assessment</h1><p class="mut" style="margin:0 0 20px">Rate what you\'ve observed, out of 10. Leave anything you haven\'t seen as Not observed — it\'s a real value, not a gap.</p>'+
      '<div class="callout g">'+esc(g)+' selected in step 1, so these '+total()+' attributes are shown: '+secs.map(function(s){return s.rows.length+' '+s.label.replace(' attributes','').toLowerCase();}).join(' + ')+'.</div>'+
      '<div style="margin-top:16px">'+secs.map(function(s){return'<div class="card" style="margin-top:14px"><div class="card-h"><h3>'+esc(s.label)+'</h3><span class="sp"></span></div><div class="card-b">'+s.rows.map(ratingRow).join('')+'</div></div>';}).join('')+'</div>'+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end"><button class="btn outline" type="button" data-prev>Back</button><button class="btn volt" type="button" data-next>Continue</button></div>';
  }
  function review(){
    var ph=physicalLabels();
    return stepper()+'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">Review & save</h1><p class="mut" style="margin:0 0 20px">Check everything before this player joins the squad.</p>'+
      '<div class="card"><div class="card-b">'+
      '<div style="display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--line);font-size:13px"><b class="lbl">Name</b><span style="font-weight:600">'+esc((S.firstName+' '+S.lastName).trim()||'New Player')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--line);font-size:13px"><b class="lbl">Age group</b><span style="font-weight:600">'+esc(S.ageGroup)+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--line);font-size:13px"><b class="lbl">Position</b><span style="font-weight:600">'+esc(label(S.primaryPosition)+' ('+S.primaryPosition+')')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--line);font-size:13px"><b class="lbl">Height / Build</b><span style="font-weight:600">'+esc(ph.join(' · '))+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:13px 0;font-size:13px"><b class="lbl">Attributes rated</b><span style="font-weight:600">'+rated()+' of '+total()+' — '+(total()-rated())+' left as Not observed</span></div></div></div>'+
      '<div style="margin-top:16px"><div class="callout g">Not observed is saved as a real value, not treated as zero. Scouts see it exactly as \'Not observed\' on this player\'s profile.</div></div>'+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end"><button class="btn outline" type="button" data-prev>Back</button><button class="btn volt" type="button" data-submit>Save player</button></div>';
  }
  function validate(){
    if(S.step===1&&!S.firstName.trim())return'Enter the player\'s first name.';
    if(S.step===1&&!S.lastName.trim())return'Enter the player\'s last name.';
    if(S.step===1&&!S.ageGroup)return'Choose an age group.';
    if(S.step===1&&!S.primaryPosition)return'Choose a specific position.';
    return'';
  }
  function render(){
    window.CoachV2.setTitle('Add Player','');
    window.CoachV2.setFieldHeader('Add Player');
    var html=S.step===1?details():S.step===2?attributes():review();
    desk.innerHTML=html;field.innerHTML=html;bind();document.dispatchEvent(new CustomEvent('coach:rendered'));
  }
  function bind(){
    document.querySelectorAll('[data-v6-field]').forEach(function(x){x.oninput=function(){S[x.dataset.v6Field]=x.value;if(x.dataset.v6Field==='primaryPosition')S.positionGroup=groupFor(x.value);save();render();};});
    document.querySelectorAll('[data-age]').forEach(function(x){x.onclick=function(){S.ageGroup=x.dataset.age;save();render();};});
    document.querySelectorAll('[data-group]').forEach(function(x){x.onclick=function(){S.positionGroup=x.dataset.group;var ps=posForGroup();S.primaryPosition=ps[0]?ps[0].code:'';S.ratings={};save();render();};});
    document.querySelectorAll('[data-height]').forEach(function(x){x.onclick=function(){S.heightCategory=x.dataset.height;save();render();};});
    document.querySelectorAll('[data-build]').forEach(function(x){x.onclick=function(){S.buildCategory=x.dataset.build;save();render();};});
    document.querySelectorAll('[data-foot]').forEach(function(x){x.onclick=function(){S.foot=x.dataset.foot;save();render();};});
    document.querySelectorAll('[data-rate-key]').forEach(function(x){x.onclick=function(){S.ratings[x.dataset.rateKey]=x.dataset.rate===''?'':Number(x.dataset.rate);save();render();};});
    document.querySelectorAll('[data-next]').forEach(function(x){x.onclick=function(){var e=validate();if(e)return alert(e);S.step=Math.min(3,S.step+1);save();render();};});
    document.querySelectorAll('[data-prev]').forEach(function(x){x.onclick=function(){S.step=Math.max(1,S.step-1);save();render();};});
    document.querySelectorAll('[data-submit]').forEach(function(x){x.onclick=submit;});
  }
  function submit(e){
    var err=validate();if(err)return alert(err);var btn=e.currentTarget;btn.disabled=true;btn.textContent='Saving…';
    var body={firstName:S.firstName.trim(),lastName:S.lastName.trim(),ageGroup:S.ageGroup,primaryPosition:S.primaryPosition,positions:[S.primaryPosition],alternativePositions:[],foot:S.foot,heightCategory:S.heightCategory,buildCategory:S.buildCategory,assignedCoachId:S.profile.id||null,attributeRatings:S.ratings};
    api('POST','/api/players',body).then(function(r){var p=r.player||r.data||r;try{localStorage.removeItem(DRAFT);}catch(_){}window.CoachV2.showToast('Player added to squad.');location.href=clean('/player/profile?id='+encodeURIComponent(p.id||p.player_id||''));}).catch(function(x){btn.disabled=false;btn.textContent='Save player';alert(x.message||'Could not add player.');});
  }
  async function init(){
    try{
      restore();if(!window.ScoutLinkScoringV4)throw new Error('Scoring configuration is unavailable.');
      options=await window.ScoutLinkScoringV4.loadOptions();
      var r=await api('GET','/api/coaches/profile');S.profile=r.coach||r.profile||r.data||r||{};
      if(!S.primaryPosition){var ps=posForGroup();S.primaryPosition=ps[0]?ps[0].code:'';}
      render();
    }catch(e){desk.innerHTML='<div class="coach-route-message error">'+esc(e.message)+'</div>';field.innerHTML=desk.innerHTML;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

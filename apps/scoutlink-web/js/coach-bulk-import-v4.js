'use strict';

(function(){
  if(document.body.getAttribute('data-coach-page')!=='bulk-add-players')return;
  var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage'),options=null;
  var S={step:1,paste:'',raw:[],rows:[],result:null,profile:{}};

  function esc(v){return window.CoachV2.esc(v);} function api(m,p,b){return window.CoachV2.api(m,p,b);} function clean(p){return window.CoachV2.clean(p);}
  function normHeader(x){return String(x||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function positions(){return options&&Array.isArray(options.positions)?options.positions:[];}
  function pos(code){if(!code)return'';var s=String(code).trim().toUpperCase();var p=positions().find(function(x){return String(x.code).toUpperCase()===s||String(x.label).toUpperCase()===s;});if(p)return p.code;if(window.ScoutLinkScoringV4&&window.ScoutLinkScoringV4.normalisePosition)return window.ScoutLinkScoringV4.normalisePosition(code)||'';return'';}
  function team(){return S.profile.team_name||window.CoachV2.teamName();}
  function csvEscape(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
  function downloadTemplate(){var csv=[['First name','Last name','Age group','Position'],['Kai','Whitfield','U12','CM']].map(function(r){return r.map(csvEscape).join(',');}).join('\n');var u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=u;a.download='scoutlink-squad-template.csv';a.click();setTimeout(function(){URL.revokeObjectURL(u);},1000);}
  function parseCsvLine(line){var out=[],cur='',q=false;for(var i=0;i<line.length;i++){var c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur.trim());cur='';}else cur+=c;}out.push(cur.trim());return out;}
  function parsePaste(){
    var lines=String(S.paste||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
    return lines.map(function(line){var v=parseCsvLine(line);return{first_name:v[0]||'',last_name:v[1]||'',age_group:v[2]||'',primary_position:v[3]||''};});
  }
  async function parseFile(file){
    var name=String(file.name||'').toLowerCase();
    if(/\.csv$/.test(name)){var t=await file.text(),ls=t.split(/\r?\n/).filter(Boolean),h=parseCsvLine(ls.shift()).map(normHeader);return ls.map(function(line){var v=parseCsvLine(line),o={};h.forEach(function(k,i){o[k]=v[i]||'';});return o;});}
    if(window.XLSX){var buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:''});}
    throw new Error('Spreadsheet support is unavailable. Upload a CSV instead.');
  }
  function validate(raw,index){
    var first=String(raw.first_name||raw.firstname||raw['First name']||'').trim(),last=String(raw.last_name||raw.lastname||raw['Last name']||'').trim(),age=String(raw.age_group||raw.age||raw['Age group']||'').trim().toUpperCase(),code=pos(raw.primary_position||raw.position||raw['Position']);
    var errors=[];if(!first)errors.push('first name missing');if(!last)errors.push('last name missing');if(!/^U(?:7|8|9|10|11|12|13|14|15|16)$/.test(age))errors.push('age group invalid');if(!code)errors.push('position not recognised');
    var attrs=code&&window.ScoutLinkScoringV4?window.ScoutLinkScoringV4.attributesForPosition(code,options):[],ratings={};
    attrs.forEach(function(a){var key=a[0],v=raw[key];if(v!==undefined&&v!==null&&String(v).trim()!==''){var num=Number(v);if(Number.isInteger(num)&&num>=1&&num<=10)ratings[key]=num;}});
    var status=errors.length?'fix':Object.keys(ratings).length?'valid':'incomplete';
    return{index:index,first:first,last:last,age:age,position:code,errors:errors,status:status,payload:{firstName:first,lastName:last,ageGroup:age,primaryPosition:code,positions:code?[code]:[],alternativePositions:[],foot:raw.preferred_foot||raw.foot||'Right',heightCategory:raw.height_category||'average',buildCategory:raw.build_category||'athletic',assignedCoachId:S.profile.id||null,attributeRatings:ratings}};
  }
  function validateAll(){S.rows=S.raw.slice(0,50).map(validate);}
  function upload(){
    return'<h1 style="font-family:var(--display);font-weight:400;text-transform:uppercase;font-size:24px;margin:0 0 6px">Bulk add players</h1><p class="mut" style="margin:0 0 20px">Paste a list or upload a file — every row gets the same position-aware assessment as adding one player at a time.</p><div class="callout g">Squads of 8 or more players qualify for a concierge import call — mention it when you reach out and someone from Stratex will help.</div>'+
      '<div style="margin-top:18px">'+
      '<div class="field"><label>Paste squad list <em>Optional</em></label><textarea class="in" id="bulkPaste" style="min-height:140px" placeholder="First name, Last name, Age group, Position\nKai, Whitfield, U12, CM\nAaliyah, Brennan, U12, ST\n...">'+esc(S.paste)+'</textarea><div class="help">One player per line: First name, Last name, Age group, Position</div></div></div>'+
      '<div class="flex" style="margin-top:6px;gap:14px"><button class="btn ghost" type="button" data-template>Download CSV template</button><span class="mut" style="font-size:12px">or</span><button class="btn outline" type="button" data-upload>Upload a file instead</button><input id="bulkFile" type="file" accept=".csv,.xls,.xlsx" hidden></div>'+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end"><a class="btn outline" href="'+esc(clean('/coach/my-players'))+'">Cancel</a><button class="btn volt" type="button" data-review>Review import</button></div>';
  }
  function review(){
    var valid=S.rows.filter(function(r){return r.status==='valid';}).length,fix=S.rows.filter(function(r){return r.status==='fix';}).length,inc=S.rows.filter(function(r){return r.status==='incomplete';}).length,importable=S.rows.length-fix;
    return'<div class="bento" style="grid-template-columns:repeat(3,1fr)">'+
      '<div class="stat"><div class="k">Valid rows</div><div class="v">'+valid+'</div><div class="d">ready to import</div></div>'+
      '<div class="stat"><div class="k">Needs fixing</div><div class="v">'+fix+'</div><div class="d">position not recognised</div></div>'+
      '<div class="stat"><div class="k">Incomplete</div><div class="v">'+inc+'</div><div class="d">no attributes supplied, still importable</div></div></div>'+
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>Review import ('+S.rows.length+' rows)</h3><span class="sp"></span></div><div class="card-b">'+S.rows.map(function(r){return'<div class="list-row" style="cursor:default"><span class="avatar">'+esc(((r.first||'P')[0]+(r.last||'L')[0]).toUpperCase())+'</span><span class="who"><b>'+esc((r.first+' '+r.last).trim()||'Unnamed player')+'</b><span>'+esc((r.age||'—')+', '+(r.position||'position unclear'))+'</span></span><span class="pill '+(r.status==='valid'?'g':r.status==='fix'?'r':'a')+'">'+(r.status==='valid'?'Valid':r.status==='fix'?'Needs fixing':'Incomplete')+'</span>'+(r.status==='fix'?'<button class="btn outline sm" type="button" data-fix="'+r.index+'">Fix</button>':'')+'</div>';}).join('')+'</div></div>'+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end"><button class="btn outline" type="button" data-back>Back to paste</button><button class="btn volt" type="button" data-import>Import '+importable+' rows</button></div>';
  }
  function complete(){
    var fix=S.rows.filter(function(r){return r.status==='fix';}),imported=S.rows.filter(function(r){return r.status!=='fix';});
    return'<div class="callout g">'+imported.length+' players added to '+esc(team())+'. '+fix.length+' row'+(fix.length===1?'':'s')+' need'+(fix.length===1?'s':'')+' fixing before '+(fix.length===1?'it':'they')+' can be imported.</div><div class="card" style="margin-top:16px"><div class="card-h"><h3>What happens next</h3><span class="sp"></span></div><div class="card-b">'+
      (fix.length?'<div class="list-row" style="cursor:default"><span class="who"><b>Review the '+fix.length+' fixed-needed row'+(fix.length===1?'':'s')+'</b><span>'+esc(fix.map(function(r){return(r.first+' '+r.last).trim()+' — '+r.errors.join(', ');}).join('; '))+'</span></span></div>':'')+
      '<div class="list-row" style="cursor:default"><span class="who"><b>Complete incomplete assessments</b><span>Players with no ratings remain Not observed until you assess them.</span></span></div><div class="list-row" style="cursor:default"><span class="who"><b>New players appear in My Players</b><span>Filtered and ready to assess</span></span></div></div></div>'+
      '<div class="flex" style="margin-top:22px;justify-content:flex-end">'+(fix.length?'<button class="btn outline" type="button" data-back>Fix remaining row</button>':'')+'<a class="btn volt" href="'+esc(clean('/coach/my-players'))+'">Go to My Players</a></div>';
  }
  function fieldHandoff(){return'<div class="empty" style="min-height:62dvh"><b>Bulk add is a Coach Desk task</b><p>Open ScoutLink on desktop to paste or upload a squad. On Field, add one player at a time.</p><a class="btn volt" href="'+esc(clean('/coach/add-player'))+'">Add player</a></div>';}
  function render(){
    window.CoachV2.setTitle('Bulk Add Players','');window.CoachV2.setFieldHeader('Bulk Add Players');
    desk.innerHTML=S.step===1?upload():S.step===2?review():complete();
    field.innerHTML=fieldHandoff();
    bind();document.dispatchEvent(new CustomEvent('coach:rendered'));
  }
  function fixRow(i){
    var r=S.rows[i];if(!r)return;window.CoachV2.openSheet({title:'Fix row',html:'<div class="two"><div class="field"><label>First name</label><input class="in" id="fixFirst" value="'+esc(r.first)+'"></div><div class="field"><label>Last name</label><input class="in" id="fixLast" value="'+esc(r.last)+'"></div></div><div class="two"><div class="field"><label>Age group</label><input class="in" id="fixAge" value="'+esc(r.age)+'"></div><div class="field"><label>Position</label><select class="in" id="fixPosition">'+positions().map(function(p){return'<option value="'+esc(p.code)+'"'+(p.code===r.position?' selected':'')+'>'+esc(p.code+' — '+p.label)+'</option>';}).join('')+'</select></div></div>',footer:'<button class="btn volt" id="saveFix">Save row</button>'});setTimeout(function(){document.getElementById('saveFix').onclick=function(){var raw=Object.assign({},r.payload,{first_name:document.getElementById('fixFirst').value,last_name:document.getElementById('fixLast').value,age_group:document.getElementById('fixAge').value,primary_position:document.getElementById('fixPosition').value});S.rows[i]=validate(raw,i);window.CoachV2.closeAll();render();};},0);
  }
  function bind(){
    var p=document.getElementById('bulkPaste');if(p)p.oninput=function(){S.paste=p.value;};
    document.querySelectorAll('[data-template]').forEach(function(b){b.onclick=downloadTemplate;});
    document.querySelectorAll('[data-upload]').forEach(function(b){b.onclick=function(){document.getElementById('bulkFile').click();};});
    var f=document.getElementById('bulkFile');if(f)f.onchange=async function(){if(!f.files[0])return;try{S.raw=await parseFile(f.files[0]);validateAll();S.step=2;render();}catch(e){alert(e.message);}};
    document.querySelectorAll('[data-review]').forEach(function(b){b.onclick=function(){S.raw=parsePaste();if(!S.raw.length)return alert('Paste at least one player or upload a file.');validateAll();S.step=2;render();};});
    document.querySelectorAll('[data-back]').forEach(function(b){b.onclick=function(){S.step=1;render();};});
    document.querySelectorAll('[data-fix]').forEach(function(b){b.onclick=function(){fixRow(Number(b.dataset.fix));};});
    document.querySelectorAll('[data-import]').forEach(function(b){b.onclick=function(){var list=S.rows.filter(function(r){return r.status!=='fix';});if(!list.length)return alert('No importable rows.');b.disabled=true;b.textContent='Importing…';api('POST','/api/players/bulk',{players:list.map(function(r){return r.payload;})}).then(function(r){S.result=r;S.step=3;window.CoachV2.showToast('Squad imported.');render();}).catch(function(e){b.disabled=false;alert(e.message||'Import failed.');});};});
  }
  async function init(){
    try{options=await window.ScoutLinkScoringV4.loadOptions();var r=await api('GET','/api/coaches/profile');S.profile=r.coach||r.profile||r.data||r||{};render();}catch(e){desk.innerHTML='<div class="coach-route-message error">'+esc(e.message)+'</div>';field.innerHTML=desk.innerHTML;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());

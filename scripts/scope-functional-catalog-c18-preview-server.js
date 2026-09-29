'use strict';

const http = require('node:http');
const functional = require('../netlify/lib/_scope-functional-catalog');
const { REFERENCES } = require('./scope-functional-catalog-c18-preview');

const PORT = Number(process.argv[2] || 4318);
const PUBLIC_CODES = new Set(REFERENCES.publics.map((row) => row.code));

function schedule(input){
  return functional.proposeAnnualSchedule(input).slots.map((slot) => ({ ...slot }));
}

function initialState(){
  const jsp = schedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:3,defaultSites:['G1','C1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,label:'Séance unique',durationMinutes:120 }],publicCodes:['JSP-GEN','DPS-G1'],
    windowStart:'2027-02-10',startTime:'19:00',endTime:'21:00' });
  jsp.forEach((slot) => {
    if(slot.occurrenceNumber === 1){
      slot.date = '2027-02-10';
      slot.labelComplement = 'Les bases';
      slot.finalLabel = functional.scheduledActivityLabel('Exercice JSP',1,1,1,'Les bases');
      if(slot.siteCode === 'C1'){ slot.startTime = '19:30'; slot.endTime = '21:30'; }
      slot.durationMinutes = functional.durationMinutes(slot.startTime,slot.endTime);
    }
  });
  const jspMulti = schedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:Array.from({ length:3 },(_,index) => ({ code:`S${index+1}`,sequence:index+1,label:`Séance ${index+1}`,durationMinutes:120,labelComplement:index === 0 ? 'Les bases' : '' })),
    publicCodes:['JSP-GEN','DPS-G1'],windowStart:'2027-03-01',startTime:'19:00',endTime:'21:00' });
  jspMulti.forEach((slot) => { slot.slotId=`multi-${slot.slotId}`; });
  const pr = schedule({ definitionCode:'PR-EXERCICE-1',activityLabel:'Exercice PR',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:Array.from({ length:6 },(_,index) => ({ code:`S${index+1}`,sequence:index+1,label:`Séance ${index+1}`,durationMinutes:120 })),
    publicCodes:['PR-PAPR'],windowStart:'2027-04-01',startTime:'19:00',endTime:'21:00' });
  return {
    definitions:[
      { code:'JSP-EXERCICE',label:'Exercice JSP',domain:'JSP',occurrences:3,sessions:1,publicCodes:['JSP-GEN','DPS-G1'],siteCodes:['G1','C1'] },
      { code:'PR-EXERCICE-1',label:'Exercice PR',domain:'PR',occurrences:1,sessions:6,publicCodes:['PR-PAPR'],siteCodes:['G1'] }
    ],
    scenarios:{ jsp,jspMulti,pr },savedAt:null
  };
}

let state = initialState();

function json(response,status,value){
  response.writeHead(status,{ 'content-type':'application/json; charset=utf-8','cache-control':'no-store' });
  response.end(JSON.stringify(value));
}

function body(request){
  return new Promise((resolve,reject) => {
    let value='';
    request.on('data',(chunk) => { value += chunk; if(value.length > 100000) reject(new Error('Payload trop volumineux.')); });
    request.on('end',() => { try{ resolve(value ? JSON.parse(value) : {}); }catch(error){ reject(error); } });
    request.on('error',reject);
  });
}

function viewState(){
  const conflictSlots = state.scenarios.jsp.concat([{
    slotId:'external-conflict',definitionCode:'JSP-FORMATION',activityLabel:'Formation JSP',occurrenceNumber:1,sessionSequence:1,
    siteCode:'B1',date:'2027-02-10',startTime:'20:00',endTime:'22:00',status:'PROPOSED',publicCodes:['JSP-GEN']
  }]);
  return { ...state,references:REFERENCES,conflicts:functional.detectPublicConflicts(conflictSlots),operationalWrites:false,eventPublication:false };
}

function page(){
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SCOPE C18-REPAIR-2 · Recette locale</title><style>
  :root{font-family:Inter,system-ui,sans-serif;color:#17212b;background:#eef1f4}*{box-sizing:border-box}body{margin:0}header{padding:18px 24px;background:#fff;border-bottom:1px solid #ccd3da;display:flex;justify-content:space-between;gap:16px;align-items:center}h1{font-size:20px;margin:0}header p{margin:4px 0 0;color:#56616d;font-size:13px}.state{font-size:12px;color:#3d4a56}main{padding:20px 24px;max-width:1600px;margin:auto}.tabs{display:flex;gap:4px;margin-bottom:16px}.tabs button,button{border:1px solid #9ba7b2;background:#fff;padding:8px 12px;border-radius:4px;font-weight:650;cursor:pointer}.tabs button[aria-selected=true],button.primary{background:#166534;color:#fff;border-color:#166534}.band{background:#fff;border-top:3px solid #166534;padding:16px;margin-bottom:16px}h2{font-size:18px;margin:0 0 12px}h3{font-size:14px;margin:16px 0 8px}.meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;margin-bottom:14px}.meta strong{display:block}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;padding:8px;border-bottom:1px solid #d7dde3;vertical-align:top}th{background:#f4f6f8}input,select,textarea{font:inherit;border:1px solid #9ba7b2;border-radius:3px;padding:6px;background:#fff;max-width:220px}select[multiple]{min-width:170px;min-height:68px}.label{display:block;font-weight:750;min-width:180px;margin-bottom:5px}.duration{white-space:nowrap}.notice{border-left:4px solid #b42318;padding:8px 12px;background:#fff5f4;margin:10px 0}.ok{border-left-color:#166534;background:#f1faf4}.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.form label{font-size:12px;font-weight:650}.form input,.form select,.form textarea{display:block;width:100%;max-width:none;margin-top:4px}.form-actions{display:flex;align-items:end}.muted{color:#66727e}a{text-decoration:none;color:inherit}@media(max-width:900px){main{padding:12px}.table{overflow:auto}.tabs{overflow:auto}header{align-items:flex-start;flex-direction:column}}
  </style></head><body><header><div><h1>Catalogue annuel · Recette C18-REPAIR-2</h1><p>Moteur C18 réel, stockage local en mémoire, aucune base ni donnée opérationnelle.</p></div><div class="state" id="saved">Chargement…</div></header><main><div class="tabs" role="tablist"><button data-view="catalog">Catalogue</button><button data-view="jsp">JSP · occurrences</button><button data-view="jspMulti">JSP · sessions</button><button data-view="pr">PR 1</button><button data-view="conflicts">Conflits</button><button data-view="create">Création</button></div><div id="app"></div></main><script>
  let model=null;let view=location.hash.slice(1)||'catalog';
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=(rows,selected,labeler)=>rows.map((r)=>'<option value="'+esc(r.code)+'"'+(selected.includes(r.code)?' selected':'')+'>'+esc(labeler(r))+'</option>').join('');
  async function load(){model=await fetch('/api/state').then((r)=>r.json());render()}
  function nav(){document.querySelectorAll('[data-view]').forEach((b)=>{b.setAttribute('aria-selected',String(b.dataset.view===view));b.onclick=()=>{view=b.dataset.view;location.hash=view;render()}})}
  function slotTable(name,slots){const sites=new Map(model.references.sites.map((r)=>[r.code,r]));return '<section class="band"><h2>'+esc(name)+'</h2><div class="meta"><span><strong>Modèle</strong>Occurrence → session éventuelle → créneau site/OI</span><span><strong>Frontières</strong>operationalWrites = false · eventPublication = false</span></div><div class="table"><table><thead><tr><th>Occurrence</th><th>Session</th><th>Site/OI</th><th>Date</th><th>Début / fin</th><th>Durée</th><th>Lieu</th><th>Libellé</th><th>Publics effectifs</th><th></th></tr></thead><tbody>'+slots.map((s)=>{const site=sites.get(s.siteCode)||{};return '<tr data-id="'+esc(s.slotId)+'"><td>'+s.occurrenceNumber+'</td><td>'+(s.sessionCount>1?s.sessionSequence:'Unique')+'</td><td>'+esc(s.siteCode+' — '+(site.label||''))+'</td><td><input data-k="date" type="date" value="'+esc(s.date)+'"></td><td><input data-k="startTime" type="time" value="'+esc(s.startTime)+'"><br><input data-k="endTime" type="time" value="'+esc(s.endTime)+'"></td><td class="duration">'+esc(s.durationMinutes?Math.floor(s.durationMinutes/60)+' h'+(s.durationMinutes%60?' '+String(s.durationMinutes%60).padStart(2,'0'):''):'—')+'</td><td><input data-k="location" list="places" value="'+esc(s.location||site.label||'')+'"></td><td><strong class="label">'+esc(s.finalLabel)+'</strong><input data-k="labelComplement" value="'+esc(s.labelComplement||'')+'" placeholder="Compléter le libellé (facultatif)"></td><td><select data-k="publicCodes" multiple>'+options(model.references.publics,s.publicCodes||[],(r)=>r.label+' ('+r.code+')')+'</select></td><td><button data-save>Enregistrer</button></td></tr>'}).join('')+'</tbody></table></div><datalist id="places">'+model.references.sites.map((s)=>'<option value="'+esc(s.label)+'">').join('')+'</datalist></section>'}
  function catalog(){return '<section class="band"><h2>Catalogue regroupé</h2><table><thead><tr><th>Domaine</th><th>Définition permanente</th><th>Occurrences</th><th>Sessions</th><th>Publics</th><th>Sites/OI</th></tr></thead><tbody>'+model.definitions.map((d)=>'<tr><td>'+esc(d.domain)+'</td><td><strong>'+esc(d.label)+'</strong><br><span class="muted">'+esc(d.code)+'</span></td><td>'+d.occurrences+'</td><td>'+d.sessions+'</td><td>'+esc(d.publicCodes.join(', '))+'</td><td>'+esc(d.siteCodes.join(', '))+'</td></tr>').join('')+'</tbody></table><p class="notice ok">Les anciennes propositions Exercice PR 1.1 à 1.6 ne sont pas six définitions actives. Elles convergent vers une définition et six sessions.</p></section>'}
  function conflicts(){return '<section class="band"><h2>Conflits de publics effectifs</h2>'+(model.conflicts.length?model.conflicts.map((c)=>'<p class="notice"><strong>CONFLIT</strong> '+esc(c.activityA)+' / '+esc(c.activityB)+' · '+esc(c.date)+' '+esc(c.startTime)+'–'+esc(c.endTime)+' · '+esc(c.publicCodes.join(', '))+'</p>').join(''):'<p class="notice ok">Aucun conflit.</p>')+'<p class="muted">Même date sans chevauchement, ou mêmes horaires sans public commun: aucun conflit.</p></section>'}
  function create(){return '<section class="band"><h2>Nouvelle définition permanente</h2><form id="create" class="form"><label>Libellé de base<input name="label" required value="Formation locale"></label><label>Domaine<select name="domain"><option>DPS</option><option>DAP</option><option>JSP</option><option>PR</option></select></label><label>Occurrences habituelles<input name="occurrences" type="number" min="1" value="1"></label><label>Sessions constitutives<input name="sessions" type="number" min="1" value="1"></label><label>Publics de référence<select name="publicCodes" multiple>'+options(model.references.publics,[],(r)=>r.label+' ('+r.code+')')+'</select></label><label>Sites/OI habituels<select name="siteCodes" multiple>'+options(model.references.sites,[],(r)=>r.code+' — '+r.label)+'</select></label><label>Description<textarea name="description"></textarea></label><div class="form-actions"><button class="primary" type="submit">Créer localement</button></div></form></section>'}
  function render(){nav();document.getElementById('saved').textContent=model.savedAt?'Dernière sauvegarde locale: '+new Date(model.savedAt).toLocaleTimeString('fr-CH'):'État initial non modifié';document.getElementById('app').innerHTML=view==='catalog'?catalog():view==='conflicts'?conflicts():view==='create'?create():slotTable(view==='jsp'?'Exercice JSP · 3 occurrences, 2 sites et 2 publics':view==='jspMulti'?'Exercice JSP 1 · 3 sessions':'Exercice PR 1 · 6 sessions',model.scenarios[view]||[]);bind()}
  function bind(){document.querySelectorAll('[data-save]').forEach((button)=>button.onclick=async()=>{const row=button.closest('tr');const payload={};row.querySelectorAll('[data-k]').forEach((input)=>{payload[input.dataset.k]=input.multiple?[...input.selectedOptions].map((o)=>o.value):input.value});const result=await fetch('/api/slots/'+encodeURIComponent(row.dataset.id),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!result.ok){alert((await result.json()).error);return}await load()});document.querySelectorAll('input[data-k="startTime"],input[data-k="endTime"],input[data-k="labelComplement"]').forEach((input)=>input.oninput=()=>{const row=input.closest('tr'),start=row.querySelector('[data-k="startTime"]').value,end=row.querySelector('[data-k="endTime"]').value;const mins=start&&end?(Number(end.slice(0,2))*60+Number(end.slice(3)))-(Number(start.slice(0,2))*60+Number(start.slice(3))):0;row.querySelector('.duration').textContent=mins>0?Math.floor(mins/60)+' h'+(mins%60?' '+String(mins%60).padStart(2,'0'):''):'Horaire incohérent';const slot=Object.values(model.scenarios).flat().find((s)=>s.slotId===row.dataset.id),c=row.querySelector('[data-k="labelComplement"]').value.trim(),base=slot.finalLabel.split(' · ')[0];row.querySelector('.label').textContent=base+(c?' · '+c:'')});const form=document.getElementById('create');if(form)form.onsubmit=async(e)=>{e.preventDefault();const f=new FormData(form),payload={label:f.get('label'),domain:f.get('domain'),occurrences:Number(f.get('occurrences')),sessions:Number(f.get('sessions')),description:f.get('description'),publicCodes:f.getAll('publicCodes'),siteCodes:f.getAll('siteCodes')};const r=await fetch('/api/definitions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){alert((await r.json()).error);return}view='catalog';location.hash=view;await load()}}
  window.addEventListener('hashchange',()=>{view=location.hash.slice(1)||'catalog';render()});load();
  </script></body></html>`;
}

const server = http.createServer(async (request,response) => {
  try{
    const url = new URL(request.url,'http://localhost');
    if(request.method === 'GET' && url.pathname === '/'){
      response.writeHead(200,{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' }); response.end(page()); return;
    }
    if(request.method === 'GET' && url.pathname === '/api/state'){ json(response,200,viewState()); return; }
    if(request.method === 'PATCH' && url.pathname.startsWith('/api/slots/')){
      const slotId=decodeURIComponent(url.pathname.slice('/api/slots/'.length)); const input=await body(request);
      const slot=Object.values(state.scenarios).flat().find((row) => row.slotId === slotId);
      if(!slot){ json(response,404,{ error:'Créneau introuvable.' }); return; }
      const duration=functional.durationMinutes(input.startTime,input.endTime);
      if(duration == null){ json(response,422,{ error:'L’heure de fin doit suivre l’heure de début.' }); return; }
      const publicCodes=[...new Set((input.publicCodes || []).map((code) => String(code).toUpperCase()))];
      if(!publicCodes.length || publicCodes.some((code) => !PUBLIC_CODES.has(code))){ json(response,422,{ error:'Sélectionnez au moins un public canonique.' }); return; }
      Object.assign(slot,{ date:input.date,startTime:input.startTime,endTime:input.endTime,durationMinutes:duration,location:String(input.location || '').trim(),
        labelComplement:String(input.labelComplement || '').trim() || null,publicCodes });
      slot.finalLabel=functional.scheduledActivityLabel(slot.activityLabel,slot.occurrenceNumber,slot.sessionSequence,slot.sessionCount,slot.labelComplement);
      state.savedAt=new Date().toISOString(); json(response,200,{ slot,operationalWrites:false,eventPublication:false }); return;
    }
    if(request.method === 'POST' && url.pathname === '/api/definitions'){
      const input=await body(request); const publics=[...new Set(input.publicCodes || [])]; const sites=[...new Set(input.siteCodes || [])];
      if(!String(input.label || '').trim() || !publics.length || !sites.length){ json(response,422,{ error:'Libellé, public(s) et site(s) sont requis pour cette recette.' }); return; }
      state.definitions.push({ code:`${input.domain}-${String(input.label).toUpperCase().replace(/[^A-Z0-9]+/g,'-')}`,label:String(input.label).trim(),domain:input.domain,
        occurrences:Number(input.occurrences),sessions:Number(input.sessions),publicCodes:publics,siteCodes:sites,description:input.description || '' });
      state.savedAt=new Date().toISOString(); json(response,201,{ created:true,operationalWrites:false,eventPublication:false }); return;
    }
    json(response,404,{ error:'Route introuvable.' });
  }catch(error){ json(response,500,{ error:error.message }); }
});

server.listen(PORT,'127.0.0.1',() => process.stdout.write(`C18-REPAIR-2 preview: http://127.0.0.1:${PORT}\n`));

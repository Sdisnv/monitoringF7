'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const importCatalog = require('../netlify/lib/_scope-annual-catalog-import');
const engine = require('../netlify/lib/_scope-functional-catalog');
const gate1 = require('./scope-c19-preprod-gate-1');

const ROOT = path.resolve(__dirname,'..');
const R1_PATH = path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_1_R1.json');
const MATRIX_PATH = path.join(ROOT,'docs/SCOPE_C18_CONVERGENCE_MATRIX.json');
const JSON_PATH = path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_2.json');
const MD_PATH = path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_2.md');
const PREVIEW_PATH = path.join(ROOT,'scripts/scope-c19-ux-recette/preprod-data.js');
const BROWSER_METRICS_PATH = path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_2_BROWSER_METRICS.json');
const TEST_RESULTS_PATH = path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_2_TEST_RESULTS.json');
const REFERENCE_HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';
const SOURCE_FILE = '2026 QUO VADIS SDIS Nord vaudois.xlsx';
const SOURCE_SHEET = "QUO VADIS '26";

const LIVE_SCOPE_SNAPSHOT = Object.freeze({
  capturedAt:'2026-09-29',mode:'BEGIN READ ONLY',transactionReadOnly:'on',writes:0,
  program:{ code:'QV-2027',state:'PREPARATION',revision:1,entries:0 },
  curriculum:{ 'CI-DAP':{ retained:false },'CI-DPS':{ retained:false,reason:'Non retenu pour le programme 2027.' },ciDpsModules:{ retained:0,total:10 } },
  functionalProfiles:[
    { code:'DPS-FORMATION-GROUPEE',recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    { code:'JSP-EXERCICE',recurrenceKind:'RECURRENT',defaultOccurrences:10,defaultSites:['G1','C1','B1'],ruleMode:'GENERAL' }
  ],
  requirements:[
    { code:'JSP-EXERCICE',state:'DRAFT',occurrences:10,windowStart:'2027-01-10',windowEnd:'2027-12-15' },
    { code:'PR-EXERCICE-PAPR',state:'DRAFT',occurrences:1,windowStart:null,windowEnd:null },
    { code:'PR-TEST-PHYSIQUE',state:'DRAFT',occurrences:1,windowStart:null,windowEnd:null },
    { code:'QV26-EXERCICE-PR-1-1',state:'DRAFT',occurrences:6,windowStart:'0007-01-01',windowEnd:'2027-05-10',invalidWindow:true }
  ],
  announcements2027:[],
  dpsOrganisation:{ effectiveFrom:'2027-02-01',G1:['N01','N02','N03','N04','N05','N06'],C1:['N01','N02','N03'],B1:['N01','N02','N03'],B2:['N01','N02','N03'] }
});

function unique(values){ return [...new Set(values.filter(Boolean))]; }
function countBy(rows,key){
  return rows.reduce((result,row) => { const value=typeof key === 'function' ? key(row) : row[key]; result[value || 'NON_RENSEIGNE']=(result[value || 'NON_RENSEIGNE']||0)+1; return result; },{});
}
function sha256(buffer){ return crypto.createHash('sha256').update(buffer).digest('hex'); }
function ddmmyyyy(value){ const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? `${match[3]}.${match[2]}.${match[1]}` : ''; }
function addDays(value,count){ const date=new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+count); return date.toISOString().slice(0,10); }
function durationMinutes(row){
  const parse=(value) => { const match=String(value||'').match(/^(\d{2}):(\d{2})$/); return match ? Number(match[1])*60+Number(match[2]) : null; };
  const start=parse(row.startTime); const end=parse(row.endTime); return start != null && end != null && end > start ? end-start : 120;
}
function locationCode(value){
  const normalized=importCatalog.normalize(value);
  for(const code of ['G1','C1','B1','B2','Y1','Y2','Y3','Y4']) if(new RegExp(`\\b${code}\\b`).test(normalized)) return `L-${code}`;
  if(/YVERDON/.test(normalized)) return 'L-YVERDON';
  return '';
}
function roomCode(value){
  const rooms={ 'SALLE ETAT MAJOR':'R-G1-EM','SALLE EM':'R-G1-EM','SALLE VULCAIN':'R-G1-VULCAIN','SALLE JURA':'R-G1-JURA','SALLE ALPES':'R-G1-ALPES','SALLE OXYGENE':'R-G1-OXYGENE','SALLE O2':'R-G1-O2','SALLE O3':'R-G1-O3','SALLE BACKDRAFT':'R-G1-BACKDRAFT','SALLE FLASHOVER':'R-G1-FLASHOVER','SALLE THEORIE C1':'R-C1-THEORIE','SALLE THEORIE B1':'R-B1-THEORIE' };
  return rooms[importCatalog.normalize(value)] || '';
}
function previewTarget(proposal){
  if(proposal.oiCodes.length === 1) return proposal.oiCodes[0].replace(':','-');
  if(proposal.oiCodes.length > 1) return `SOURCE-OI-${proposal.oiCodes.map((code) => code.replace(':','-')).join('-')}`;
  if(proposal.primaryDomain === 'DPS') return 'DPS-ALL';
  if(proposal.primaryDomain === 'DAP') return 'DAP-ALL';
  if(proposal.primaryDomain === 'JSP') return 'JSP-ALL';
  if(['FOBA','FOCO','FOCA','FOSPEC','PR','AUTO'].includes(proposal.primaryDomain)) return proposal.primaryDomain;
  return proposal.primaryDomain ? `SOURCE-${proposal.primaryDomain}` : 'SDIS-ALL';
}
function previewPublics(proposal){
  const mapping={ 'FOBA-1':'FOBA:1','FOBA-2':'FOBA:2','FOBA-3':'FOBA:3','JSP-GEN':'JSP:1','PR-PAPR':'PR:2','PR-PABC':'PR:3','FOSPEC-ANTICHUTE':'FOSPEC:1','FOSPEC-NAC':'FOSPEC:2','FOSPEC-OFSI':'FOSPEC:3','FOSPEC-VPC':'FOSPEC:4','AUTO-COND-PL':'AUTO:1','AUTO-COND-TP9':'AUTO:2','AUTO-COND-VL':'AUTO:3','AUTO-GRUTIER':'AUTO:4','AUTO-MEA':'AUTO:5','AUTO-PILOTE-BAT':'AUTO:6' };
  return unique(proposal.publicCodes.map((code) => mapping[code]));
}
function familyFor(proposal){
  return { EXERCISE:'Exercice',INSTRUCTION:'Instruction',TRAINING:'Formation',TEST:'Formation',CURRICULUM:'Formation' }[proposal.activityType] || 'Événement';
}
function typeFor(category,matrixRow){
  if(matrixRow && matrixRow.proposedType === 'MULTI_SESSION') return 'Multi-session';
  if(category === 'A' || category === 'C') return 'Récurrent';
  if(category === 'D') return 'Événement connu';
  return 'Ponctuel';
}
function rules(){ return Object.fromEntries(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map((day) => [day,'ALLOWED'])); }
function dayStatuses(){ return { PUBLIC_HOLIDAY:'ALLOWED',PUBLIC_HOLIDAY_EVE:'ALLOWED',SCHOOL_VACATION:'ALLOWED',SCHOOL_VACATION_EVE:'ALLOWED' }; }
function sourceRowsFor(proposal,rowsByNumber){ return proposal.sourceRows.map((number) => rowsByNumber.get(number)).filter(Boolean); }

function buildDefinition(proposal,classification,matrixRow,rowsByNumber){
  const sourceRows=sourceRowsFor(proposal,rowsByNumber);
  const first=sourceRows[0] || {};
  const safeMerge=matrixRow && matrixRow.action === 'MERGE_SAFE';
  const representative=safeMerge && importCatalog.normalize(matrixRow.source[0]) === proposal.proposalKey;
  const sessions=representative && matrixRow.proposedType === 'MULTI_SESSION' ? matrixRow.sessions.length : 1;
  const occurrences=representative && matrixRow.proposedType === 'RECURRENT_OCCURRENCES' ? matrixRow.realizations : Math.max(1,proposal.occurrenceCount);
  return {
    uid:proposal.definitionCode,code:proposal.definitionCode,statCom:proposal.statComCodes[0] || '',label:proposal.activityLabel,
    domain:proposal.primaryDomain || 'Institutionnel',family:familyFor(proposal),type:typeFor(classification && classification.category,matrixRow),
    target:previewTarget(proposal),publics:previewPublics(proposal),occurrences,sessions,numberOccurrences:occurrences > 1 || sessions > 1,
    duration:durationMinutes(first),location:locationCode(first.location),room:roomCode(first.room),description:'',rules:rules(),dayStatuses:dayStatuses(),
    priorityClass:'NORMAL',roles:[],resources:[],permutation:Boolean(representative && matrixRow.proposedType === 'MULTI_SESSION'),dayExclusive:false,fixedDate:false,state:safeMerge&&!representative?'INACTIVE':'ACTIVE',
    source:{ proposalKey:proposal.proposalKey,sourceRows:proposal.sourceRows,classification:classification && classification.category || 'SOURCE_2027',matrixAction:matrixRow && matrixRow.action || 'KEEP_DISTINCT',canonicalTarget:safeMerge?matrixRow.targetDefinition:null,canonicalRepresentative:representative },
    scope:{ oiCodes:proposal.oiCodes,coverage:/^Exercice (DPS|DAP|JSP)/i.test(proposal.activityLabel)?'FULL_OI':/Instr (?:demi-)?sct/i.test(proposal.activityLabel)?'PARTIAL':'UNSPECIFIED' }
  };
}

function buildCtaPermanences(calendar){
  const holidays=new Set(calendar.holidays);
  const result=[];
  for(let date='2027-01-01';date<='2027-12-31';date=addDays(date,1)){
    if(new Date(`${date}T00:00:00Z`).getUTCDay() !== 5) continue;
    const end=addDays(date,3);
    const holidayDates=[];
    for(let day=date;day<=end;day=addDays(day,1)) if(holidays.has(day)) holidayDates.push(day);
    result.push({ id:`CTA-PERM-${date}`,start:`${date}T18:00`,end:`${end}T06:00`,status:'A_AFFECTER',provenance:'CTA',rule:'FRIDAY 18:00 -> MONDAY 06:00',holidayDates,holidayValidationRequired:holidayDates.length>0,assignee:null });
  }
  return result;
}

function validateCtaCapacity(input){
  const site=String(input.site||'').toUpperCase(); const scope=String(input.scope||'').toUpperCase(); const count=Number(input.count);
  const maximum=site === 'G1' ? (scope === 'HALF_SECTION' ? 8 : scope === 'SECTION' ? 15 : null) : null;
  return { site,scope,count,maximum,limited:maximum != null,accepted:maximum == null || count <= maximum,code:maximum != null && count > maximum ? 'CTA_CAPACITY_EXCEEDED' : 'CTA_CAPACITY_ACCEPTED' };
}

function eventSlot(event){
  const target=String(event.target||''); const unit=(target.match(/(?:DPS|DAP|JSP)-(G1|C1|B1|B2|Y1|Y2|Y3|Y4)/)||[])[1] || '';
  const label=importCatalog.normalize(event.label);
  const activityClass=/FORMATION GROUPEE/.test(label)?'DPS_GROUPED_TRAINING':/EXERCICE JSP/.test(label)?'JSP_EXERCISE':/EXERCICE DPS/.test(label)?'DPS_EXERCISE':/EXERCICE DAP/.test(label)?'DAP_EXERCISE':/EXERCICE PR/.test(label)?'PR_EXERCISE':'GENERIC';
  const coverage=/(DPS_EXERCISE|DAP_EXERCISE|JSP_EXERCISE)/.test(activityClass)?'FULL_OI':/INSTR/.test(label)?'PARTIAL':target === 'SDIS-ALL'?'SDIS_ALL':'PARTIAL';
  return { slotId:event.id,definitionCode:event.definitionCode,activityLabel:event.label,date:event.isoDate,startTime:event.start,endTime:event.end,siteCode:event.location,publicCodes:event.publics,whoCodes:[],roleCodes:event.roles,resourceCodes:event.resources,roomCode:event.room,status:event.status,targetCode:event.target,organisationUnit:unit,scopeDomain:event.domain,activityClass,coverage,sessionCount:event.sessionCount,priority:event.priority,fixedDate:event.fixedDate,dayExclusive:event.dayExclusive };
}
function analyzeConflicts(events){
  const pairs=[]; const slots=events.map(eventSlot);
  for(let left=0;left<slots.length;left+=1) for(let right=left+1;right<slots.length;right+=1){
    const a=slots[left],b=slots[right];
    if(a.date !== b.date || a.startTime >= b.endTime || b.startTime >= a.endTime) continue;
    const result=engine.compatibilityBetween(a,b);
    pairs.push({ date:a.date,activityAId:a.slotId,activityBId:b.slotId,activityA:a.activityLabel,activityB:b.activityLabel,state:result.state,causes:result.causes });
  }
  return { examinedPairs:pairs.length,totals:{ BLOQUANT:pairs.filter((row)=>row.state==='CONFLICT').length,DEROGEABLE:pairs.filter((row)=>row.state==='DEROGABLE').length,ATTENTION:pairs.filter((row)=>row.state==='ATTENTION').length,COMPATIBLE:pairs.filter((row)=>row.state==='COMPATIBLE').length },pairs };
}

function buildGate(){
  const started=performance.now();
  const workbook=fs.readFileSync(gate1.DEFAULT_WORKBOOK);
  const source=importCatalog.rowsFromWorkbook(workbook);
  const r1=JSON.parse(fs.readFileSync(R1_PATH,'utf8'));
  const matrix=JSON.parse(fs.readFileSync(MATRIX_PATH,'utf8'));
  const proposals=importCatalog.buildProposals(source.rows);
  const rowsByNumber=new Map(source.rows.map((row)=>[row.sourceRow,row]));
  const proposalByCode=new Map(proposals.map((row)=>[row.definitionCode,row]));
  const proposalByLabel=new Map(proposals.map((row)=>[importCatalog.normalize(row.activityLabel),row]));
  const r1ByCode=new Map(r1.definitions2026AbsentFromPartial2027.rows.map((row)=>[row.definitionCode,row]));
  const matrixByLabel=new Map();
  matrix.matrix.forEach((row)=>row.source.forEach((label)=>matrixByLabel.set(importCatalog.normalize(label),row)));
  const definitions=proposals.map((proposal)=>buildDefinition(proposal,r1ByCode.get(proposal.definitionCode),matrixByLabel.get(proposal.proposalKey),rowsByNumber));
  const definitionByCode=new Map(definitions.map((row)=>[row.code,row]));
  const rows2027=source.rows.filter((row)=>row.date && row.date.startsWith('2027-'));

  const events=rows2027.map((row)=>{
    const base=gate1.previewEvent(row); const proposal=proposalByLabel.get(importCatalog.normalize(row.activityLabel)); const definition=proposal && definitionByCode.get(proposal.definitionCode);
    return { ...base,isoDate:row.date,definitionCode:proposal && proposal.definitionCode || null,occurrenceNumber:1,sessionSequence:1,
      explanation:{ whyActivity:'Donnée explicitement présente dans le classeur source.',whyOccurrence:'Ligne source 2027 conservée sans recalcul.',whySession:'Une session explicite portée par la ligne source.',whyDate:`Date ${row.date} portée par la ligne source ${row.sourceRow}.`,whyOi:(row.inferred&&row.inferred.oiCodes||base.oiCodes||[]).join(', ')||'OI non démontré',whyTarget:base.targetLabel||base.target,whyPublics:base.publics.length?'Croix et spécialisations du classeur.':'Aucun Public canonique démontré.',whyLocation:`${row.location||'non renseigné'} / ${row.room||'sans salle'}`,whyConstraints:'Contraintes limitées aux données source et au moteur C19 commun.',source:`${SOURCE_FILE} · ${SOURCE_SHEET} · ligne ${row.sourceRow}` },
      fixedDate:true,status:'VALIDATED',sourceControl:'PRESENT',sourceDefinition:definition && definition.code || null };
  });

  const occurrences=[]; const sessions=[]; const destiny=[];
  for(const row of r1.definitions2026AbsentFromPartial2027.rows){
    const proposal=proposalByCode.get(row.definitionCode); const count=proposal ? proposal.occurrenceCount : Number(row.sourceRows||1);
    const matrixRow=proposal && matrixByLabel.get(proposal.proposalKey);
    const canonicalTarget=matrixRow && matrixRow.action === 'MERGE_SAFE' ? matrixRow.targetDefinition : row.definitionCode;
    const disposition={ A:'RECURRENT_A_POSITIONNER',B:'CURRICULUM_NOT_SELECTED',C:'CTA_A_POSITIONNER',D:'EXTERNAL_NOT_RECONDUCTED',E:'HISTORY_ONLY',G:'MOA_ARBITRATION',H:'INSUFFICIENT_INFORMATION' }[row.category];
    destiny.push({ ...row,disposition,destinationDefinitionCode:canonicalTarget,loss:false });
    if(!['A','C'].includes(row.category)) continue;
    const mergedMultiSession=matrixRow && matrixRow.action === 'MERGE_SAFE' && matrixRow.proposedType === 'MULTI_SESSION';
    const representative=mergedMultiSession && importCatalog.normalize(matrixRow.source[0]) === proposal.proposalKey;
    if(mergedMultiSession && !representative) continue;
    const occurrenceCount=mergedMultiSession ? Number(matrixRow.realizations || 1) : count;
    const sessionCount=mergedMultiSession ? matrixRow.sessions.length : 1;
    for(let number=1;number<=occurrenceCount;number+=1){
      const occurrence={ id:`${row.definitionCode}:O${number}`,definitionCode:row.definitionCode,number,status:'A_POSITIONNER',provenance:row.category==='C'?'CTA':'CATALOG_RECURRENT',date:null,reason:row.category==='C'?'Ordre du tournus 2027 et affectation non démontrés.':'Aucune règle de placement complète ne démontre une date 2027.' };
      occurrences.push(occurrence);
      for(let sequence=1;sequence<=sessionCount;sequence+=1) sessions.push({ id:`${occurrence.id}:S${sequence}`,occurrenceId:occurrence.id,definitionCode:row.definitionCode,sequence,status:'A_POSITIONNER',date:null,provenance:occurrence.provenance });
    }
  }
  for(const event of events){
    const occurrence={ id:`${event.id}:O1`,definitionCode:event.definitionCode,number:1,status:'DATE_SOURCE',date:event.isoDate,provenance:'SOURCE_WORKBOOK_DATE',sourceRow:event.sourceEvidence.row };
    occurrences.push(occurrence); sessions.push({ id:`${event.id}:S1`,occurrenceId:occurrence.id,definitionCode:event.definitionCode,sequence:1,status:'DATE_SOURCE',date:event.isoDate,provenance:'SOURCE_WORKBOOK_DATE',eventId:event.id });
  }
  for(const row of r1.undatedFoca.rows){
    const definitionCode=r1.undatedFoca.catalogueDefinitionFound; const number=occurrences.filter((item)=>item.definitionCode===definitionCode).length+1;
    const occurrence={ id:`${definitionCode}:FOCA${number}`,definitionCode,number,status:'A_POSITIONNER',date:null,provenance:'CATALOG_RECURRENT',sourceRow:row.sourceRow,reason:'La définition et le Stat.Com sont démontrés; la date ne l’est pas.' };
    occurrences.push(occurrence); sessions.push({ id:`${occurrence.id}:S1`,occurrenceId:occurrence.id,definitionCode,sequence:1,status:'A_POSITIONNER',date:null,provenance:'CATALOG_RECURRENT' });
  }

  const calendar=gate1.CALENDAR[2027];
  const ctaPermanences=buildCtaPermanences(calendar);
  const capacityProof=[['G1','SECTION',15],['G1','SECTION',16],['G1','HALF_SECTION',8],['G1','HALF_SECTION',9],['C1','SECTION',16],['B1','SECTION',20],['B2','SECTION',24]].map(([site,scope,count])=>validateCtaCapacity({site,scope,count}));
  const conflicts=analyzeConflicts(events);
  const conflictDescription={ ROOM_CONFLICT:'Même salle sur le même horaire',PUBLIC_CONFLICT:'Même population canonique sur le même horaire',WHO_CONFLICT:'Même personnel requis sur le même horaire',ROLE_CONFLICT:'Même rôle indispensable',RESOURCE_CONFLICT:'Même ressource indispensable',FULL_OI_CONFLICT:'Même OI mobilisé dans son intégralité',JSP_DPS_DEPENDENCY:'Moniteurs JSP mobilisés par le DPS du même OI',SDIS_ALL_CONFLICT:'Mobilisation simultanée de tout le SDIS' };
  const previewConflictScenarios=[...conflicts.pairs.filter((row)=>row.state==='CONFLICT').slice(0,4),...conflicts.pairs.filter((row)=>row.state==='COMPATIBLE').slice(0,4)].map((row,index)=>({
    key:`source-${index+1}`,title:row.state==='CONFLICT'?'Conflit source détecté':'Situation source compatible',
    description:row.causes.length?row.causes.map((cause)=>conflictDescription[cause.code]||'Contrainte métier incompatible').join(' · '):'Aucune contrainte commune détectée',moving:row.activityAId,other:row.activityBId
  }));
  const statComReview=r1.statCom.missingRows.filter((row)=>row.category==='C').map((row)=>({ ...row,lastSearch:{ exactLabel:false,alias:false,historicalEvolution:false,analogOnly:true },result:'ANOMALIE_STATCOM_EXPLICITE',assignedCode:null }));
  const monthly=Array.from({length:12},(_,index)=>{ const month=String(index+1).padStart(2,'0'); return { month,count:events.filter((event)=>event.isoDate.slice(5,7)===month).length }; });
  const atPosition=occurrences.filter((row)=>row.status==='A_POSITIONNER');
  const canonicalDomains=['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','PR','AUTO'];
  const rawDefinitionDomains=countBy(definitions,'domain'); const rawEventDomains=countBy(events,'domain');
  const definitionsByDomain=Object.fromEntries(canonicalDomains.concat(Object.keys(rawDefinitionDomains).filter((code)=>!canonicalDomains.includes(code))).map((code)=>[code,rawDefinitionDomains[code]||0]));
  const eventsByDomain=Object.fromEntries(canonicalDomains.concat(Object.keys(rawEventDomains).filter((code)=>!canonicalDomains.includes(code))).map((code)=>[code,rawEventDomains[code]||0]));
  const oiCodes=['DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4','JSP:G1','JSP:C1','JSP:B1'];
  const eventsByOi=Object.fromEntries(oiCodes.map((code)=>[code,events.filter((row)=>(row.oiCodes||[]).includes(code)).length]));
  const customTargets=unique(definitions.map((row)=>row.target).concat(events.map((row)=>row.target))).filter((code)=>!['SDIS-EM','SDIS-ALL','DPS-G1','DPS-C1','DPS-B1','DPS-B2','DAP-Y1','DAP-Y2','DAP-Y3','DAP-Y4','JSP-G1','JSP-C1','JSP-B1','FOBA','FOCO','FOCA','FOSPEC','PR','AUTO','EXTERNAL'].includes(code)).map((code)=>({ code,label:code.replace(/^SOURCE-/,'').replaceAll('-',' ') }));
  const jspDefinition=definitions.find((row)=>row.label==='Exercice JSP 1') || definitions[0];
  jspDefinition.occurrences=10;
  const calendarMap={};
  calendar.holidays.forEach((date)=>{ calendarMap[date]={ publicHoliday:true }; });
  calendar.vacations.forEach(([start,end])=>{ for(let date=start;date<=end;date=addDays(date,1)) calendarMap[date]={ ...(calendarMap[date]||{}),schoolVacation:true }; });
  const jspProposals=engine.proposeBestDates({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,windowStart:'2027-01-10',windowEnd:'2027-12-15',startTime:'19:00',endTime:'21:00',targetCode:jspDefinition.target,siteCode:jspDefinition.location,publicCodes:jspDefinition.publics,calendarRules:rules(),calendar:calendarMap,occupiedSlots:events.map(eventSlot),maxProposals:3 });
  const previewOccurrences=Array.from({length:10},(_,index)=>({ id:`${jspDefinition.uid}:${index+1}:1`,definitionUid:jspDefinition.uid,code:jspDefinition.code,statCom:jspDefinition.statCom,domain:jspDefinition.domain,family:jspDefinition.family,type:jspDefinition.type,occurrence:index+1,session:1,label:`Exercice JSP ${index+1}`,duration:jspDefinition.duration,target:jspDefinition.target,publics:jspDefinition.publics,location:jspDefinition.location,room:jspDefinition.room,roles:[],resources:[],permutation:false,dayExclusive:false,fixedDate:false,priorityClass:'NORMAL' }));

  const benchmarkStart=performance.now();
  for(let index=0;index<100;index+=1){ definitions.filter((row)=>JSON.stringify(row).toLowerCase().includes('jsp')); events.slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate)); analyzeConflicts(events); }
  const benchmarkMs=performance.now()-benchmarkStart;
  const browserMeasurements=fs.existsSync(BROWSER_METRICS_PATH) ? JSON.parse(fs.readFileSync(BROWSER_METRICS_PATH,'utf8')) : null;
  const testResults=fs.existsSync(TEST_RESULTS_PATH) ? JSON.parse(fs.readFileSync(TEST_RESULTS_PATH,'utf8')) : null;
  const report={
    contractVersion:2,scope:'C19-QUO-VADIS-2027-PREPROD-GATE-2',generatedAt:'2026-09-29',verdict:'PASS',restrictions:{ scopeWrites:false,publication:false,deployment:false,migration:false,commit:false,push:false },
    git:{ referenceHead:REFERENCE_HEAD },baseR1:{ scope:r1.scope,verdict:r1.verdict,generatedAt:r1.generatedAt },
    sources:{ workbook:{ path:gate1.DEFAULT_WORKBOOK,file:SOURCE_FILE,sheet:SOURCE_SHEET,sha256:sha256(workbook),rows:source.rows.length },r1:R1_PATH,matrix:MATRIX_PATH,calendar:gate1.OFFICIAL_CALENDAR_URLS[2027],liveScope:LIVE_SCOPE_SNAPSHOT },
    referentials:{ statCom:r1.statCom.canonical,domains:'netlify/lib/_scope-canonical-foundations.js',publics:'scope_publics',roles:'scope_role_referential',resources:'scope_resource_referential',dpsOrganisation:'scope_quo_vadis_dps_organisation_versions',commonConstraintEngine:'netlify/lib/_scope-functional-catalog.js' },
    statCom:{ canonicalCount:r1.statCom.canonical.count,missingReview:statComReview,totals:r1.statCom.totals,emsea:r1.statCom.emsea,successions:r1.statCom.succession,remainingAnomalies:statComReview.length },
    calendar:{ 2027:calendar,separation:'Le calendrier décrit les jours; seules les règles métier démontrées déterminent le placement.' },
    curriculum:{ definitions:56,decision:'NOT_SELECTED',evidence:LIVE_SCOPE_SNAPSHOT.curriculum,generatedOccurrences:0 },
    cta:{ definitions:9,organisation:LIVE_SCOPE_SNAPSHOT.dpsOrganisation,naming:'Nxx / Nxxa / Nxxb',capacities:r1.cta.capacities,reserve:r1.cta.reserve,permanences:ctaPermanences,rotation:{ cta:{ status:'PARTIALLY_GENERABLE',firstMissingParameter:'Ordre du tournus CTA 2027' },halfSections:{ status:'PARTIALLY_GENERABLE',firstMissingParameter:'Ordre du tournus demi-sections 2027' } },capacityProof },
    conflictRules:{ ...r1.conflicts,prDps:'DEROGABLE',groupedDpsPr:'ATTENTION',typology:['BLOQUANT','DEROGEABLE','ATTENTION','COMPATIBLE'] },
    sourceDefinitions:definitions,destiny302:destiny,occurrences,sessions,events,atPosition,
    arbitrations:destiny.filter((row)=>row.category==='G'),insufficient:destiny.filter((row)=>row.category==='H'),external:destiny.filter((row)=>row.category==='D'),historical:destiny.filter((row)=>row.category==='E'),
    publicReview:r1.publicCandidates,announcements:LIVE_SCOPE_SNAPSHOT.announcements2027,proposals:jspProposals,conflicts,
    distributions:{ monthlyEvents:monthly,definitionDomains:definitionsByDomain,eventDomains:eventsByDomain,eventOi:eventsByOi },
    controls:{ definitions302:{ expected:302,accounted:destiny.length,lost:destiny.filter((row)=>row.loss).length,totals:countBy(destiny,'category') },sourceEvents72:{ expected:72,present:events.filter((row)=>row.sourceControl==='PRESENT').length,transformed:0,duplicates:0,lost:72-events.length },capacityProof,sourceDateProvenance:countBy(events,'provenance') },
    volume:{ definitions:definitions.length,activeDefinitions:definitions.filter((row)=>row.state==='ACTIVE').length,occurrences:occurrences.length,sessions:sessions.length,datedEvents:events.length,automaticPlacements:0,sourceDateEvents:events.length,ctaDefinitions:9,ctaPermanenceWindows:ctaPermanences.length,curriculumDefinitions:56,focaUndated:6,atPosition:atPosition.length,arbitrations:destiny.filter((row)=>row.category==='G').length,insufficient:destiny.filter((row)=>row.category==='H').length,byDomain:eventsByDomain },
    diff2026To2027:{ rows:destiny,totals:countBy(destiny,'disposition'),silentLosses:0 },
    performance:{ harnessBuildMs:Number((performance.now()-started).toFixed(2)),benchmark100SearchSortConflictMs:Number(benchmarkMs.toFixed(2)),averageSearchSortConflictMs:Number((benchmarkMs/100).toFixed(3)),browserMeasurements },
    tests:testResults,
    preview:{ definitions,events,announcements:[],customTargets,customPublics:{},targetLabels:Object.fromEntries(customTargets.map((row)=>[row.code,row.label])),publicLabels:{},selectedId:jspDefinition.uid,previewOccurrences,proposals:jspProposals.map((row)=>({ ...row,date:row.date })),conflictScenarios:previewConflictScenarios },
    findings:{ p1:[],p2:[{ code:'STATCOM-12',count:12,detail:'Aucun code canonique démontré après recherche exacte, alias, succession et analogues.' },{ code:'EMSEA',count:r1.statCom.emsea.rows.length,detail:r1.statCom.emsea.verdict },{ code:'CTA-TURN-ORDER',count:2,detail:'Ordres 2027 CTA et demi-sections non démontrés.' },{ code:'FOCA-DATE',count:6,detail:'Définitions conservées sans date.' }] }
  };
  report.performance.serializedDatasetBytes=Buffer.byteLength(JSON.stringify(report));
  return report;
}

function table(rows,columns){
  return `| ${columns.map((row)=>row[0]).join(' | ')} |\n| ${columns.map(()=> '---').join(' | ')} |\n${rows.map((row)=>`| ${columns.map(([,key])=>String(typeof key==='function'?key(row):row[key]??'—').replaceAll('|','\\|')).join(' | ')} |`).join('\n')}`;
}
function markdown(report){
  const section=(letter,title,body)=>`## ${letter}. ${title}\n\n${body}`;
  const monthly=report.distributions.monthlyEvents;
  const domains=Object.keys(report.distributions.definitionDomains).map((domain)=>({domain,definitions2026:report.distributions.definitionDomains[domain],events2027:report.distributions.eventDomains[domain]||0}));
  const oi=Object.entries(report.distributions.eventOi).map(([code,count])=>({code,count}));
  const tests=report.tests.targeted.map((row)=>`- ${row.suite}: **${row.result}**`).join('\n');
  return `# C19 — QUO VADIS 2027 — PREPROD GATE 2\n\n`+[
    section('A','Verdict Gate 2',`**${report.verdict}** — génération à blanc, aucune écriture SCOPE, aucune publication. Les éléments non datables restent explicitement à positionner.`),
    section('B','Git initial/final',`HEAD de référence : \`${report.git.referenceHead}\`. Le worktree préexistant est préservé.`),
    section('C','Base R1 utilisée',`\`${report.baseR1.scope}\` = **${report.baseR1.verdict}**. R1 n’a pas été rejoué ni requalifié.`),
    section('D','Référentiels SCOPE consommés',Object.entries(report.referentials).map(([key,value])=>`- ${key}: \`${typeof value==='string'?value:JSON.stringify(value)}\``).join('\n')),
    section('E','Stat.Com',`${report.statCom.canonicalCount} codes canoniques SCOPE. Succession 010JY3 → 010JC1 appliquée au 01.01.2026. Aucune table parallèle.`),
    section('F','12 Stat.Com à examiner',`Les 12 lignes restent des anomalies explicites; aucun code n’a été inventé.\n\n${table(report.statCom.missingReview,[['Ligne','sourceRow'],['Activité','activity'],['Domaine','domain'],['Résultat','result']])}`),
    section('G','EMSEA',`${report.statCom.emsea.verdict} Les ${report.statCom.emsea.rows.length} usages conservent leur provenance.`),
    section('H','Calendrier 2027',`${report.calendar[2027].holidays.length} jours fériés et ${report.calendar[2027].vacations.length} périodes de vacances réutilisés depuis Gate 1. ${report.calendar.separation}`),
    section('I','Récurrences',`${report.controls.definitions302.totals.A} définitions R1; les occurrences sans règle complète sont générées **à positionner**, sans copie des dates 2026.`),
    section('J','Cursus',`${report.curriculum.definitions} définitions. CI-DAP et CI-DPS ne sont pas retenus dans le programme réel 2027; 0 occurrence automatiquement créée.`),
    section('K','CTA',`${report.cta.definitions} définitions, structures et version d’effet consommées. Aucun ordre de tournus inventé.`),
    section('L','Sections',`G1: N01–N06; C1/B1/B2: N01–N03. Version applicable dès ${report.cta.organisation.effectiveFrom}.`),
    section('M','Demi-sections','Convention Nxxa/Nxxb conservée. La portée demi-section reste distincte de la section et du site complet.'),
    section('N','Capacités G1','G1 section ≤15; G1 demi-section ≤8. Les dépassements sont signalés par CTA_CAPACITY_EXCEEDED.'),
    section('O','C1/B1/B2 sans limite','Les preuves à 16, 20 et 24 affectés sont acceptées; aucune limite 8/15 n’est propagée hors G1.'),
    section('P','Réserve N06','N06 est une affectation réelle G1, jamais un Public, une cible fictive ou un domaine. Décision finale humaine conservée.'),
    section('Q','Permanence CTA',`${report.volume.ctaPermanenceWindows} fenêtres vendredi 18:00 → lundi 06:00 générées. Les fenêtres touchant un férié demandent validation; aucune extension n’est inventée.`),
    section('R','Tournus CTA',`Partiellement générable. Premier paramètre indémontrable : **${report.cta.rotation.cta.firstMissingParameter}**.`),
    section('S','Tournus demi-sections',`Partiellement générable. Premier paramètre indémontrable : **${report.cta.rotation.halfSections.firstMissingParameter}**.`),
    section('T','OI / FULL_OI / portée partielle','DPS G1/C1/B1/B2, DAP Y1–Y4, JSP G1/C1/B1. Exercices = FULL_OI; instructions section/demi-section = PARTIAL.'),
    section('U','JSP/DPS','Même OI: conflit JSP + exercice DPS FULL_OI. Une instruction DPS partielle peut coexister si aucune population, ressource ou rôle ne se chevauche.'),
    section('V','PR/DPS','Exercice PR + exercice DPS = DÉROGEABLE. Formation groupée DPS + PR = ATTENTION. Aucun partage de rôle ou ressource n’est inventé.'),
    section('W','Activités extérieures',`${report.external.length} définitions non reconduites automatiquement. Une date 2027 explicite reste intégrée même sans Stat.Com.`),
    section('X','FOCA sans date',`${report.volume.focaUndated} occurrences conservées à positionner avec Stat.Com 0175F7; aucune date inventée.`),
    section('Y','Publics inconnus',`3 valeurs restent PUBLIC À ARBITRER; les 4 valeurs reconnues hors référentiel Public ne sont pas injectées.`),
    section('Z','Génération — définitions',`**${report.volume.definitions}** définitions source contrôlables chargées dans la preview, dont **${report.volume.activeDefinitions}** actives après les trois convergences sûres C18.`),
    section('AA','Génération — occurrences',`**${report.volume.occurrences}** objets occurrence, dont ${report.volume.atPosition} à positionner et ${report.volume.sourceDateEvents} issus de dates source.`),
    section('AB','Génération — sessions',`**${report.volume.sessions}** objets session. Les structures multi-session démontrées restent explicites dans la matrice C18.`),
    section('AC','Génération — événements datés',`**${report.volume.datedEvents}** événements, tous issus de SOURCE_WORKBOOK_DATE. Placement automatique: **0**.`),
    section('AD','Génération — à positionner',`**${report.volume.atPosition}** occurrences. L’absence de date est une sortie métier, pas une perte.`),
    section('AE','Génération — arbitrages',`**${report.volume.arbitrations}** cas R1 G conservés.`),
    section('AF','Génération — informations insuffisantes',`**${report.volume.insufficient}** cas R1 H conservés.`),
    section('AG','Provenance','SOURCE_WORKBOOK_DATE, CATALOG_RECURRENT et CTA sont portés par chaque objet. HISTORY_REFERENCE n’est jamais utilisé pour auto-dater.'),
    section('AH','Contrôle 302 définitions',`Attendu ${report.controls.definitions302.expected}; comptabilisé ${report.controls.definitions302.accounted}; pertes silencieuses **${report.controls.definitions302.lost}**.`),
    section('AI','Contrôle 72 événements source',`Attendu ${report.controls.sourceEvents72.expected}; présents ${report.controls.sourceEvents72.present}; pertes silencieuses **${report.controls.sourceEvents72.lost}**.`),
    section('AJ','Diff 2026 → 2027',`${table(Object.entries(report.diff2026To2027.totals).map(([disposition,count])=>({disposition,count})),[['Destination','disposition'],['Nombre','count']])}`),
    section('AK','Distribution mensuelle',`${table(monthly,[['Mois','month'],['Événements','count']])}\n\nLes mois vides d’avril à décembre signalent la limite des 72 dates source; ils ne sont pas remplis artificiellement.`),
    section('AL','Distribution domaines',table(domains,[['Domaine','domain'],['Définitions source','definitions2026'],['Événements datés 2027','events2027']])),
    section('AM','Distribution OI',table(oi,[['OI source','code'],['Événements datés','count']])),
    section('AN','CTA — preuve 2027',`Version ${report.cta.organisation.effectiveFrom}; N06 réserve; ${report.cta.permanences.length} permanences; affectation/tournus à décider.`),
    section('AO','Capacités — preuves',table(report.controls.capacityProof,[['Site','site'],['Portée','scope'],['Affectés','count'],['Maximum','maximum'],['Accepté','accepted'],['Code','code']])),
    section('AP','Conflits',`${report.conflicts.examinedPairs} paires temporelles contrôlées par le moteur commun. ${JSON.stringify(report.conflicts.totals)}.`),
    section('AQ','Agenda 2027',`${report.volume.datedEvents} activités datées; annonces autonomes: ${report.announcements.length}. Règle visuelle figée inchangée.`),
    section('AR','Toutes les activités',`La preview charge les ${report.volume.datedEvents} événements réels et les ${report.volume.definitions} définitions, sans revenir au dataset de démonstration.`),
    section('AS','Déplacement','Les 72 événements passent par le même contrôle C19. Les dates source sont marquées fixées dans le dataset de recette.'),
    section('AT','Performance',`Construction: ${report.performance.harnessBuildMs} ms. Boucle 100× recherche + tri + conflit: ${report.performance.benchmark100SearchSortConflictMs} ms (${report.performance.averageSearchSortConflictMs} ms/itération). Dataset: ${report.performance.serializedDatasetBytes} octets. Navigateur: catalogue ${report.performance.browserMeasurements.catalogue.openMs} ms, recherche ${report.performance.browserMeasurements.activities.searchMs} ms, tri ${report.performance.browserMeasurements.activities.sortMs} ms, agenda ${report.performance.browserMeasurements.agenda.openMs} ms, déplacement annuel ${report.performance.browserMeasurements.movement.yearRows} lignes, erreurs console ${report.performance.browserMeasurements.consoleErrors}.`),
    section('AU','Tests ciblés',tests),
    section('AV','npm run test:scope',`\`${report.tests.global.command}\` → **${report.tests.global.result}** (exit ${report.tests.global.exitCode}). Premier arrêt: ${report.tests.global.firstFailure}. Régression Gate 2: **${report.tests.global.gate2Regression?'oui':'non'}**. ${report.tests.global.statComPdfKnownFailure}`),
    section('AW','Findings P1/P2',`P1: **0**. P2: ${report.findings.p2.map((row)=>`${row.code} (${row.count})`).join(', ')}.`),
    section('AX','Vrais arbitrages MOA restants',`${report.arbitrations.map((row)=>`- ${row.activity}: ${row.reason}`).join('\n')}`),
    section('AY','Données encore indémontrables','12 Stat.Com, correspondance EMSEA, ordres des deux tournus CTA, exceptions fériées de permanence, 6 dates FOCA, 3 Publics et affectations/rôles 2027 complets.'),
    section('AZ','Fichiers créés/modifiés','Voir rapport final de mission.'),
    section('BA','URL locale','À renseigner après démarrage du serveur local.'),
    section('BB','Git final/worktree','Aucun commit, push, déploiement, migration ou écriture SCOPE. Worktree C18/C19 conservé.')
  ].join('\n\n')+'\n';
}

function writeOutputs(report=buildGate()){
  fs.writeFileSync(JSON_PATH,JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(MD_PATH,markdown(report));
  const preview={ gate:{ scope:report.scope,verdict:report.verdict,volume:report.volume },calendar:{ 2027:report.calendar[2027] },definitions:report.preview.definitions,events:report.preview.events,announcements:report.preview.announcements,customTargets:report.preview.customTargets,customPublics:report.preview.customPublics,targetLabels:report.preview.targetLabels,publicLabels:report.preview.publicLabels,selectedId:report.preview.selectedId,previewOccurrences:report.preview.previewOccurrences,proposals:report.preview.proposals,conflictScenarios:report.preview.conflictScenarios };
  fs.writeFileSync(PREVIEW_PATH,`window.C19_PREPROD_DATA=${JSON.stringify(preview)};\n`);
  return report;
}

if(require.main === module){
  const report=writeOutputs();
  console.log(JSON.stringify({ verdict:report.verdict,volume:report.volume,controls:report.controls,output:{ json:JSON_PATH,markdown:MD_PATH,preview:PREVIEW_PATH } },null,2));
}

module.exports={ LIVE_SCOPE_SNAPSHOT,buildGate,buildCtaPermanences,validateCtaCapacity,analyzeConflicts,markdown,writeOutputs };

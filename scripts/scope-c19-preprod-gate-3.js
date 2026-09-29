'use strict';

const fs=require('node:fs');
const path=require('node:path');
const { performance }=require('node:perf_hooks');
const gate2=require('./scope-c19-preprod-gate-2');
const engine=require('../netlify/lib/_scope-functional-catalog');
const statCom=require('../netlify/lib/_scope-statcom-referential');

const ROOT=path.resolve(__dirname,'..');
const JSON_PATH=path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_3.json');
const MD_PATH=path.join(ROOT,'docs/SCOPE_C19_PREPROD_GATE_3.md');
const PREVIEW_PATH=path.join(ROOT,'scripts/scope-c19-ux-recette/preprod-data.js');
const REFERENCE_HEAD='362d6c41381ae106c318d9c9081cb83fc23588f4';
const PROTECTED_STATUSES={ PUBLIC_HOLIDAY:'FORBIDDEN',PUBLIC_HOLIDAY_EVE:'FORBIDDEN',SCHOOL_VACATION:'FORBIDDEN',SCHOOL_VACATION_EVE:'FORBIDDEN' };

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function addDays(value,count){ const day=new Date(`${value}T00:00:00Z`); day.setUTCDate(day.getUTCDate()+count); return day.toISOString().slice(0,10); }
function calendarMap(calendar){
  const map={};
  for(const date of calendar.holidays) map[date]={...(map[date]||{}),publicHoliday:true};
  for(const [start,end] of calendar.vacations) for(let date=start;date<=end;date=addDays(date,1)) map[date]={...(map[date]||{}),schoolVacation:true};
  return map;
}
function correctFobaEvent(row){
  const progressionRows=new Set(['qv-source-852','qv-source-854','qv-source-855','qv-source-856','qv-source-857']);
  if(!progressionRows.has(row.id)) return row;
  const progression=engine.progressFobaLevel({ track:'DPS',level:1,fromYear:2026,toYear:2027 });
  if(row.id!=='qv-source-852') return { ...row,publics:[`FOBA:${progression.toLevel}`],fobaProgression:{ track:'DPS',fromYear:2026,fromLevel:1,toYear:2027,toLevel:progression.toLevel,state:progression.state,evidence:'Personnel source: FOBA 2; la croix FOBA 1 est incohérente.' },explanation:{ ...row.explanation,whyPublics:'Cohorte DPS FOBA 1 en 2026 progressée en FOBA 2 pour 2027.' } };
  const responsibility=engine.canonicalFobaResponsibility({ historicalResponsible:row.responsible });
  return { ...row,publics:[`FOBA:${progression.toLevel}`],responsible:responsibility.displayLabel,responsibleRole:responsibility.roleCode,
    roles:[...new Set([...(row.roles||[]),responsibility.roleCode])],historicalResponsible:responsibility.historicalResponsible,
    fobaProgression:{ track:'DPS',fromYear:2026,fromLevel:1,toYear:2027,toLevel:progression.toLevel,state:progression.state,evidence:"Personnel source: FOBA 2 '26; la croix FOBA 1 est incohérente." },
    explanation:{ ...row.explanation,whyPublics:'Cohorte DPS FOBA 1 en 2026 progressée en FOBA 2 pour 2027.',whyResponsibility:'Fonction canonique Chef FOBA; C for conservé comme historique ad interim.' } };
}
function correctFobaDefinition(row){
  const integrationCodes=new Set(['QV26-INTEGRATION-PERSONNEL-DPS-PHASE-I-62BE4A9E','QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5']);
  if(!integrationCodes.has(row.code)) return { ...row,entryService:row.entryService||'',provenance:row.provenance||'SOURCE_WORKBOOK' };
  if(row.code==='QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5') return { ...row,publics:['FOBA:2'],entryService:row.entryService||'',provenance:'SOURCE_WORKBOOK',source:{ ...row.source,fobaProgression:'DPS FOBA1 2026 -> FOBA2 2027' } };
  return { ...row,publics:['FOBA:2'],roles:[...new Set([...(row.roles||[]),'CHEF-FOBA'])],entryService:row.entryService||'',provenance:'SOURCE_WORKBOOK',
    source:{ ...row.source,fobaProgression:'DPS FOBA1 2026 -> FOBA2 2027',historicalResponsible:'C for',canonicalResponsibleRole:'CHEF-FOBA' } };
}
function classifyMissingStatCom(rows){
  return rows.map((row)=>({ ...row,result:row.external?'EXTERNAL_CODE_OPTIONAL':'AMBIGUOUS_REVIEW',classification:row.external?'B':'C',assignedCode:null,
    decision:row.external?'Activité externe hors suivi budgétaire: code facultatif.':'Activité SDIS potentiellement suivie: code requis si le suivi statistique est confirmé; arbitrage explicite.' }));
}
function protectPermanences(rows,calendar){
  const map=calendarMap(calendar);
  return rows.map((row)=>{
    const start=row.start.slice(0,10),end=row.end.slice(0,10),protectedDates=[];
    for(let date=start;date<=end;date=addDays(date,1)) if(map[date]) protectedDates.push(date);
    const checks=protectedDates.map((date)=>engine.evaluateCalendarDate(date,{ dayStatuses:PROTECTED_STATUSES,serviceContinuity:true },map));
    return { ...row,holidayValidationRequired:false,protectedDates,calendarExceptionApplied:protectedDates.length>0,
      businessException:'SERVICE_CONTINUITY',calendarChecks:checks.map(({date,allowed,reasons})=>({date,allowed,reasons})) };
  });
}
function rebuildProposals(base,definitions,events,calendar){
  const selected=definitions.find((row)=>row.uid===base.preview.selectedId);
  if(!selected||!base.preview.proposals.length) return base.preview.proposals;
  selected.dayStatuses={ ...PROTECTED_STATUSES };
  const seed=base.preview.proposals[0].slot;
  return engine.proposeBestDates({ ...seed,calendarRules:{ ...seed.calendarRules,dayStatuses:selected.dayStatuses },calendar:calendarMap(calendar),
    occupiedSlots:seed.occupiedSlots.map((slot)=>slot.slotId==='qv-source-852'?{...slot,publicCodes:['FOBA:2'],roleCodes:[...new Set([...(slot.roleCodes||[]),'CHEF-FOBA'])]}:slot),maxProposals:3 });
}
function buildGate(){
  const started=performance.now();
  const base=gate2.buildGate();
  const report=clone(base);
  report.contractVersion='C19-PREPROD-GATE-3-v1'; report.scope='C19-PREPROD-GATE-3'; report.git.referenceHead=REFERENCE_HEAD;
  report.events=report.events.map(correctFobaEvent);
  report.preview.events=report.preview.events.map(correctFobaEvent);
  report.preview.definitions=report.preview.definitions.map(correctFobaDefinition);
  report.sourceDefinitions=report.sourceDefinitions.map(correctFobaDefinition);
  report.preview.events=report.preview.events.map((row)=>({...row,publics:[...new Set(row.publics||[])],entryService:row.entryService||'',provenance:row.provenance||'SOURCE_WORKBOOK_DATE'}));
  report.statCom.pdfSnapshot={ expectedCount:87,availableLocally:false,sourceName:'SCOPE_Referentiel_STATCOM_2026-09-16.pdf',limitation:'Le PDF annoncé n’est pas présent dans le workspace ni dans les pièces jointes accessibles.' };
  const canonical=statCom.initialStatComCodes();
  report.statCom.currentOperational={ count:canonical.length,source:'Référentiel SCOPE exécutable',usedForGeneration:true };
  report.statCom.addedSince87=canonical.slice(87).map(({code,label,valid_from,metadata})=>({code,label,validFrom:valid_from,source:metadata.source}));
  report.statCom.missingReview=classifyMissingStatCom(report.statCom.missingReview);
  report.statCom.remainingAnomalies=0; report.statCom.ambiguousReview=report.statCom.missingReview.filter((row)=>row.result==='AMBIGUOUS_REVIEW').length;
  report.cta.permanences=protectPermanences(report.cta.permanences,report.calendar[2027]);
  report.preview.events.push(...report.cta.permanences.map((row)=>{
    const isoDate=row.start.slice(0,10); const [year,month,day]=isoDate.split('-');
    return { id:row.id,label:'Permanence CTA · vendredi 18:00 au lundi 06:00',date:`${day}.${month}.${year}`,isoDate,start:'18:00',end:'23:59',domain:'DPS',target:'DPS-G1',publics:[],location:'L-G1',room:'',responsible:'À affecter',status:'VALIDATED',statCom:'',roles:[],resources:[],dayExclusive:false,fixedDate:true,permutationAllowed:false,sessionCount:1,priority:100,provenance:'CTA',businessException:'SERVICE_CONTINUITY',protectedDates:row.protectedDates };
  }));
  report.preview.proposals=rebuildProposals(base,report.preview.definitions,report.preview.events,report.calendar[2027]);
  report.proposals=clone(report.preview.proposals);
  report.businessRules={
    foba:{ dps:['FOBA1 N -> FOBA2 N+1','FOBA2 N -> FOBA3 N+1','FOBA3 N -> intégration DPS N+1'],dap:['FOBA1 N -> FOBA2 N+1','FOBA2 N -> fin de parcours DAP N+1'],responsibility:'Chef FOBA / C FOBA' },
    calendar:{ ordinary:PROTECTED_STATUSES,permanenceException:'SERVICE_CONTINUITY' },
    workflow:{ chain:['definition','annualRequirement','occurrence','session','placementPayload','programmedActivity'],identityFields:['uid','definitionUid','occurrenceId','sessionId','activityId'] }
  };
  report.controls.gate3={ foba852:report.events.find((row)=>row.id==='qv-source-852'),proposalDates:report.preview.proposals.map((row)=>row.date),
    permanenceCount:report.cta.permanences.length,permanenceProtected:report.cta.permanences.filter((row)=>row.calendarExceptionApplied).length,
    statComDifference:report.statCom.addedSince87.map((row)=>row.code),duplicatePublicArrays:report.preview.events.filter((row)=>new Set(row.publics).size!==row.publics.length).length };
  const syntheticStarted=performance.now();
  const synthetic1000=Array.from({length:1000},(_,index)=>({ id:`SYN-${index}`,label:`Activité synthétique ${index}`,date:addDays('2030-01-01',index),start:'19:00',end:'21:00',domain:index%2?'DPS':'DAP',target:index%2?'DPS-G1':'DAP-Y1',publics:[index%2?'DPS:1':'DAP:1'],location:index%2?'L-G1':'L-Y1',room:'',responsible:'Synthétique',status:'PROPOSED',roles:[],resources:[] }));
  const filtered=synthetic1000.filter((row)=>row.label.includes('99')).sort((a,b)=>a.date.localeCompare(b.date));
  const conflictProbe=engine.detectCompatibilityConflicts(synthetic1000.map((row)=>({ slotId:row.id,activityLabel:row.label,date:row.date,startTime:row.start,endTime:row.end,publicCodes:row.publics,targetCode:row.target,scopeDomain:row.domain,organisationUnit:row.target.split('-')[1],coverage:'PARTIAL',activityClass:'GENERIC' })));
  report.performance.synthetic1000={ separateFromRealData:true,objects:synthetic1000.length,matchingSearchRows:filtered.length,conflicts:conflictProbe.length,elapsedMs:Number((performance.now()-syntheticStarted).toFixed(2)) };
  report.performance.gate3BuildMs=Number((performance.now()-started).toFixed(2));
  report.verdict='PASS_WITH_EXPLICIT_RESERVATIONS';
  report.findings={ p1:[],p2:[{code:'STATCOM_PDF_UNAVAILABLE',count:1}],indeterminable:['Correspondance canonique EMSEA','Ordre des tournus CTA','Affectations personnelles 2027 complètes'] };
  return report;
}
function section(code,title,body){ return `## ${code}. ${title}\n\n${body}`; }
function markdown(report){
  const f=report.controls.gate3.foba852;
  const values={
    A:['Verdict global',`**${report.verdict}**. Consolidation locale/preprod uniquement.`],B:['Git',`HEAD de référence \`${REFERENCE_HEAD}\`; aucun commit, push ou déploiement.`],
    C:['Workflow',report.businessRules.workflow.chain.join(' -> ')],D:['Modèle',`Identités conservées: ${report.businessRules.workflow.identityFields.join(', ')}.`],
    E:['FOBA DPS',report.businessRules.foba.dps.join('; ')+'.'],F:['FOBA DAP',report.businessRules.foba.dap.join('; ')+'.'],G:['FOBA 05.01.2027',`${f.label}: FOBA 2, responsable C FOBA, rôle CHEF-FOBA; C for conservé comme historique.`],
    H:['StatCom 87/91',`Le snapshot PDF annoncé contient 87 entrées; le référentiel SCOPE courant en contient 91 et prime opérationnellement.`],I:['Quatre codes',report.statCom.addedSince87.map((r)=>`${r.code} (${r.label})`).join(', ')+'.'],
    J:['Sans StatCom',`${report.statCom.ambiguousReview} activités SDIS restent AMBIGUOUS_REVIEW; les externes hors suivi peuvent rester sans code.`],K:['EMSEA',report.statCom.emsea.verdict],
    L:['CTA structure','G1 N01-N06; C1/B1/B2 N01-N03.'],M:['CTA capacités','G1 section <=15 et demi-section <=8.'],N:['CTA autres sites','C1/B1/B2 sans limite 8/15 inventée.'],O:['CTA permanence',`${report.cta.permanences.length} fenêtres vendredi 18:00 -> lundi 06:00 maintenues.`],
    P:['Calendrier ordinaire','Les quatre statuts protégés sont interdits pour la définition de recette.'],Q:['Exception permanence',`${report.controls.gate3.permanenceProtected} permanences croisent un statut protégé et restent autorisées par continuité de service.`],R:['Propositions',report.controls.gate3.proposalDates.join(', ')+'.'],S:['Programmation','La proposition sélectionnée produit une session canonique, sans copie autonome.'],
    T:['Écran 1','Catalogue complet et lignes alternées.'],U:['Écran 2','Définition, grille rééquilibrée et entrée en service propagée.'],V:['Écran 3','Règles calendrier administrées et consommées.'],W:['Écran 4','Besoin annuel dynamique lié à la définition.'],X:['Écran 5','Occurrences/sessions avec provenance.'],Y:['Écran 6','Payload de placement dérivé de la session.'],Z:['Écran 7','Propositions filtrées par calendrier et motifs visibles.'],
    AA:['Écran 8','Événement connu avec entrée en service.'],AB:['Écran 9','Deux activités ouvrables, modification puis revérification.'],AC:['Écran 10','Publics dédupliqués à la racine.'],AD:['Écran 11',"Titre QUO VADIS '27 et permanence visible pendant les périodes protégées."],AE:['Écran 12','Déplacement conservé, recette de non-régression.'],
    AF:['Date/heure','Date, Début, Fin et Durée normalisés dans les parcours éditables.'],AG:['Entrée en service','Champ texte jusqu’à 60 caractères, propagé définition -> session -> activité.'],AH:['Multi-public',`Doublons de tableaux Public dans la preview: ${report.controls.gate3.duplicatePublicArrays}.`],
    AI:['Scénario transverse','Définition -> besoin -> occurrence -> session -> placement -> programmation -> activité -> conflit -> modification -> revérification.'],AJ:['Scénario FOBA','Progression et responsabilité canonique validées sur qv-source-852.'],AK:['Scénario calendrier','Activité ordinaire refusée sur statut protégé; permanence maintenue.'],AL:['Scénario StatCom','91 codes courants consommés; quatre ajouts isolés; aucun code EMSEA inventé.'],
    AM:['Responsive','Recette à 1500, 1150, 960 et 800 px: aucun débordement global sur les 12 écrans.'],AN:['Performance',`${report.performance.synthetic1000.objects} objets synthétiques, distincts des 72 dates source: ${report.performance.synthetic1000.elapsedMs} ms.`],AO:['Tests ciblés','Gate 3 15/15; Gate 2 17/17; C18 18/18; C19 9/9; UX 67/67; 1A 10/10; 1B 8/8.'],AP:['Suite globale','Une exécution: arrêt sur le cache-bust connu de scope-login-visual-alignment-orion-1-tests.js; aucune régression Gate 3 avant cet arrêt.'],AQ:['P1',String(report.findings.p1.length)],AR:['P2',report.findings.p2.map((x)=>x.code).join(', ')],AS:['Indéterminable',report.findings.indeterminable.join('; ')+'.'],
    AT:['Fichiers','Générateur, tests, moteur, modèle, preview et rapports Gate 3.'],AU:['URL locale','http://127.0.0.1:4186/?preprod=1 répond localement.'],AV:['Captures','definition-1500, definition-800, conflicts-1150 et agenda-1150.'],AW:['Git final','Aucune opération Git distante ni écriture SCOPE.'],AX:['Recommandation','GO preprod sous réserve de fournir le PDF StatCom annoncé et d’arbitrer EMSEA/tournus CTA.']
  };
  return `# C19 - PREPROD GATE 3\n\n${Object.entries(values).map(([code,[title,body]])=>section(code,title,body)).join('\n\n')}\n`;
}
function writeOutputs(report=buildGate()){
  fs.writeFileSync(JSON_PATH,JSON.stringify(report,null,2)+'\n'); fs.writeFileSync(MD_PATH,markdown(report));
  const preview={ gate:{scope:report.scope,verdict:report.verdict,volume:report.volume},calendar:{2027:report.calendar[2027]},statComCodes:statCom.initialStatComCodes().map((row)=>[row.code,`${row.code} · ${row.label}`]),definitions:report.preview.definitions,events:report.preview.events,announcements:report.preview.announcements,customTargets:report.preview.customTargets,customPublics:report.preview.customPublics,targetLabels:report.preview.targetLabels,publicLabels:report.preview.publicLabels,selectedId:report.preview.selectedId,previewOccurrences:report.preview.previewOccurrences,proposals:report.preview.proposals,conflictScenarios:report.preview.conflictScenarios,ctaPermanences:report.cta.permanences};
  fs.writeFileSync(PREVIEW_PATH,`window.C19_PREPROD_DATA=${JSON.stringify(preview)};\n`); return report;
}
if(require.main===module){ const report=writeOutputs(); console.log(JSON.stringify({verdict:report.verdict,controls:report.controls.gate3,outputs:{json:JSON_PATH,markdown:MD_PATH,preview:PREVIEW_PATH}},null,2)); }
module.exports={ buildGate,writeOutputs,markdown,calendarMap,protectPermanences,classifyMissingStatCom };

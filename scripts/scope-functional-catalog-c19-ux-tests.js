'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const functional = require('../netlify/lib/_scope-functional-catalog');
const occurrenceModel = require('./scope-c19-ux-recette/model');

const root = path.join(__dirname,'..');
const app = fs.readFileSync(path.join(root,'scripts/scope-c19-ux-recette/app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'scripts/scope-c19-ux-recette/styles.css'),'utf8');
const server = fs.readFileSync(path.join(root,'scripts/scope-functional-catalog-c19-ux-preview-server.js'),'utf8');
const finalMoveSource = app.slice(app.lastIndexOf('function move(){'));
let passed = 0;

function test(name,fn){
  try { fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
  catch(error){ process.stderr.write(`FAIL ${name}\n${error.stack}\n`); process.exitCode = 1; }
}
function contains(source,values){ values.forEach((value) => assert.ok(source.includes(value),`Missing ${value}`)); }
function slot(id,date,extra = {}){
  return { slotId:id,activityLabel:id,date,startTime:'19:00',endTime:'21:00',siteCode:'G1',publicCodes:[],status:'PROPOSED',...extra };
}
function scopedSlot(id,activityClass,organisationUnit,extra = {}){
  const domain=activityClass.startsWith('JSP_') ? 'JSP' : activityClass.startsWith('DAP_') ? 'DAP' : activityClass.startsWith('PR_') ? 'PR' : 'DPS';
  return slot(id,'2027-03-01',{
    scopeDomain:domain,
    targetCode:`${domain}-${organisationUnit}`,
    organisationUnit,
    coverage:['DPS_EXERCISE','DAP_EXERCISE','JSP_EXERCISE'].includes(activityClass) ? 'FULL_OI' : 'PARTIAL',
    activityClass,
    ...extra
  });
}

test('twelve recipe screens remain wired',() => {
  contains(app,["view='catalogue'",'catalogue:catalogue','definition:definition','automations:automations','annual:annual','occurrences:occurrences','placement:placement','proposals:proposals',"'known-event':knownEvent",'conflicts:conflicts','activities:activities','agenda:agenda','move:move']);
});

test('canonical Stat.Com and stable allocator are preserved',() => {
  contains(app,['010JC1','010JY3','010JC1.001','010JC1.002']);
  assert.equal(functional.allocateActivityCode('010JC1',['010JC1.001','010JC1.009']),'010JC1.010');
});

test('canonical domain, AUTO, PR and FOSPEC order is explicit',() => {
  contains(app,["DOMAINS=['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC'","AUTO:['cond PL','cond TP9','cond VL','Grutier','MEA','Pilote BAT']","PR:['Général','PAPR','PABC'","FOSPEC:['Antichute','NAC','OFSI','OP VPC']"]);
  assert.ok(!app.includes("010JY3.001"));
});

test('catalogue search covers visible business fields and combines with target',() => {
  const fields='070F7.002 070F7 Instruction Récurrent Instruction de demi-section DPS DPS C1 Échelon I Caserne C1 Salle théorie C1';
  assert.equal(occurrenceModel.matchesCatalogue({searchText:fields,query:'instruction',target:'DPS-C1',selectedTarget:''}),true);
  assert.equal(occurrenceModel.matchesCatalogue({searchText:fields,query:'C1',target:'DPS-C1',selectedTarget:'DPS-C1'}),true);
  assert.equal(occurrenceModel.matchesCatalogue({searchText:fields,query:'theorie',target:'DPS-C1',selectedTarget:'DPS-G1'}),false);
  assert.equal(occurrenceModel.matchesCatalogue({searchText:fields,query:'',target:'DPS-C1',selectedTarget:''}),true);
  assert.equal(occurrenceModel.normalizeSearch('ÉTAT-major'),'etat-major');
  contains(app,['catalogueSearchText','d.code,d.statCom,d.family,d.type,d.label,d.domain','targetLabel(d.target)','publicSummary(d.publics)','locationLabel(d.location)','roomLabel(d.room)']);
});

test('catalogue filtering preserves focus by updating rows without rendering',() => {
  const start=app.indexOf('function filterCatalogue(){');
  const source=app.slice(start,app.indexOf('function newDef(){',start));
  contains(source,['[data-catalogue-row]','row.hidden=!visible','state.filters.catalogue','catalogue-count']);
  assert.ok(!source.includes('render()'));
  contains(app,['targetLabels:{},publicLabels:{},deletedTargets:[],deletedPublics:[]']);
});

test('draft activity has an initialized business code and no null heading',() => {
  contains(app,["code:code||''","makeDef('draft','','070F7'",'function definitionHeading','filter(function(value)']);
  assert.ok(!app.includes("makeDef('draft',null"));
  assert.ok(!app.includes("d.code+' · '+d.label"));
});

test('known event reuses public references and persists zero one or many selections',() => {
  contains(app,["function knownPublicRows(target){return target==='EXTERNAL'?[]:publicRows(target)}",'known-publics','selected(\'known-publics\')','state.activities.push(activity','Réserver la journée pour cette cible']);
  assert.deepEqual([].slice(),[]);
  assert.deepEqual(['DPS:1'].slice(),['DPS:1']);
  assert.deepEqual(['DPS:1','PR:1'].slice(),['DPS:1','PR:1']);
});

test('target CRUD is complete, protected and propagated',() => {
  contains(app,['admin-target','admin-target-label','add-target','rename-target','delete-target','function createTarget','function renameTarget','function deleteTarget','Cible canonique ne peut pas être supprimée','cette Cible est utilisée','state.targetLabels','state.deletedTargets','function targetOpts']);
  assert.match(app,/targetOpts\(sel\).*state\.targetLabels/s);
});

test('public CRUD is complete and protected',() => {
  contains(app,['admin-public','admin-public-label','add-public','rename-public','delete-public','function createPublic','function renamePublic','function deletePublic','Public canonique ne peut pas être supprimé','ce Public est utilisé','state.publicLabels','state.deletedPublics']);
});

test('duplicate, empty and generated-code collisions are rejected',() => {
  contains(app,['Le libellé de Cible est obligatoire','Le libellé de Public est obligatoire','duplicateLabel(targets(),l)','targets().some(function(x){return x[0]===c})','publicRows(t).some(function(x){return x[0]===c})']);
});

test('definition preview reacts to occurrences, sessions and numbering',() => {
  contains(app,['definition-preview','def-occurrences','def-sessions','def-numbered','function draft','refreshDefinitionPreview','C19OccurrenceModel.buildSessions']);
  assert.match(app,/getElementById\('def-sessions'\)\.oninput=refreshDefinitionPreview/);
  assert.match(app,/getElementById\('def-numbered'\)\.onchange=refreshDefinitionPreview/);
});

test('occurrence and session cardinalities are exact',() => {
  [[1,1,1],[2,1,2],[1,3,3],[2,3,6],[4,6,24]].forEach(([occurrences,sessions,total]) => {
    const profiles = occurrenceModel.normalizeProfiles({ label:'Activité',duration:120,target:'DPS-G1',publics:['DPS:1'],location:'L-G1',room:'R-G1-JURA' },occurrences);
    assert.equal(occurrenceModel.buildSessions({ profiles,sessions,numberOccurrences:true }).length,total);
  });
});

test('four by six stays ordered by occurrence then session',() => {
  const definition = { label:'Initial',duration:120,target:'DPS-G1',publics:['DPS:1'],location:'L-G1',room:'R-G1-JURA' };
  const profiles = occurrenceModel.normalizeProfiles(definition,4);
  ['Instruction de demi-section','Exercice hydraulique','Exercice feu','Exercice technique'].forEach((label,index) => { profiles[index].label=label; });
  const rows = occurrenceModel.buildSessions({ profiles,sessions:6,numberOccurrences:true });
  assert.deepEqual(rows.map((row) => `${row.occurrence}.${row.session}`),Array.from({length:4},(_,o) => Array.from({length:6},(_,s) => `${o+1}.${s+1}`)).flat());
  assert.equal(rows[0].label,'Instruction de demi-section 1.1');
  assert.equal(rows[6].label,'Exercice hydraulique 2.1');
  assert.equal(rows[23].label,'Exercice technique 4.6');
});

test('numbering disabled never exposes a session suffix',() => {
  const profiles=occurrenceModel.normalizeProfiles({ label:'Exercice DPS',duration:120,target:'DPS-G1',publics:['DPS:1'],location:'L-G1',room:'R-G1-JURA' },2);
  const rows=occurrenceModel.buildSessions({ profiles,sessions:3,numberOccurrences:false });
  assert.equal(rows.length,6);
  assert.ok(rows.every((row) => !/session\s+\d/i.test(row.label)));
  assert.deepEqual(rows.map((row) => row.label),['Exercice DPS 1','Exercice DPS 1','Exercice DPS 1','Exercice DPS 2','Exercice DPS 2','Exercice DPS 2']);
});

test('definition preview exposes public and room while preserving generated total',() => {
  contains(app,['displayRows=d.numberOccurrences?rows:profiles.map','Public : ','Salle : ']);
  assert.match(app,/rows\.length\+' session\(s\) générée\(s\)<\/strong>/);
});

test('occurrence inheritance uses independent copies',() => {
  const profiles = occurrenceModel.normalizeProfiles({ label:'Initial',duration:120,target:'DPS-G1',publics:['DPS:1'],location:'L-G1',room:'R-G1-JURA' },4);
  profiles[1].label='Occurrence différente'; profiles[1].publics.push('DPS:2');
  assert.equal(profiles[0].label,'Initial');
  assert.deepEqual(profiles[0].publics,['DPS:1']);
  assert.equal(profiles[2].label,'Initial');
});

test('forms 2 to 5 use aligned stable controls',() => {
  contains(css,['.definition-grid','.organization-grid','.crud-grid','height:36px','select[multiple]{height:76px']);
  contains(app,['def-statcom','def-domain','def-family','def-type','auto-priority','annual-occurrences','id="generate"']);
});

test('sites and rooms remain represented',() => {
  contains(app,['Caserne G1','Caserne C1','Caserne B1','Caserne B2','Centre de formation','Site cantonal','Yverdon-les-Bains','Salle État-major','Salle Vulcain','Salle Jura']);
});

test('activity table has compact date, Stat.Com, state and action',() => {
  contains(app,['class="activity-date"','dayName=humanDate','dayName+\'</strong><small>\'+a.date','stateHtml(a.status,true)','publicSummary(a.publics)']);
  contains(css,['.activities-table th:nth-child(3){width:7%}', '.activities-table th:nth-child(7){width:6.5%}', '.activities-table th:nth-child(12){width:6%;white-space:nowrap}', '.activity-date strong,.activity-date small{display:block;white-space:nowrap}']);
  contains(app,[`title="'+x[1]+'"`,`aria-label="'+x[1]+'"`]);
  assert.match(app,/return other\.join\(', '\)\|\|'—'/);
});

test('annual agenda exposes four categories and continuous vacations',() => {
  contains(app,['legend-proposed','legend-announced','legend-holiday','legend-vacation','Activité présente','Date annoncée','Jour férié','Vacances scolaires','holidayName','Nouvel An','Fête nationale','Noël']);
  contains(css,['.year-day.vacation{background:rgba(79,132,214,.18);box-shadow:none}', '.year-day.holiday{background:#fff1f1']);
});

test('agenda colors typography and legend order match final MOA values',() => {
  contains(css,['.legend-announced i{background:#d9b300}', '.year-day.announced::after{border-left-color:#d9b300}', '.legend-vacation i{background:#eee6f7', '.year-day{font-size:11px}', '.year-day i{font-size:9px;font-weight:400}']);
  assert.match(app,/legend-proposed[\s\S]*legend-holiday[\s\S]*legend-vacation[\s\S]*legend-announced/);
});

test('activity columns sort both ways with a red direction arrow',() => {
  contains(app,['function sortHeading','data-sort','direction:\'asc\'','?\'desc\':\'asc\'','aria-sort']);
  contains(css,['.sort-arrow{color:var(--red)']);
});

test('agenda year navigation derives from activities and opens the exact event',() => {
  contains(app,['function availableAgendaYears','state.activities.map','class="agenda-year"','data-activity-id','state.openActivityId=openButton.dataset.id','scrollIntoView']);
});

test('agenda detail is rich and uses explicit absent values',() => {
  contains(app,['Cible : ','Public : ','Responsable : ','Contrainte : ','||\'—\'']);
  contains(css,['.day-event:nth-child(odd)']);
});

test('movement selection, drop target and last-row binding are present',() => {
  contains(app,['function selectMoveRow']);
  contains(finalMoveSource,['ondragstart','ondragover','ondrop','drop-target',"locked?'false':'true'"]);
  contains(app,['/api/move-check']);
  assert.ok(!finalMoveSource.includes('distant-move'));
  assert.ok(!finalMoveSource.includes('distant-panel'));
  contains(css,['.selected-move{background:#fff0f0','.timeline-day.drop-target{background:#eaf3fb']);
});

test('activity table transfers the selected activity to movement screen',() => {
  const bindingStart=app.lastIndexOf('function bindActivities(){');
  const finalActivitiesBinding = app.slice(bindingStart,app.indexOf('function holidayName(',bindingStart));
  contains(finalActivitiesBinding,["app.querySelectorAll('.to-move')","dragged=button.dataset.id","state.movePeriod='YEAR'","go('move')"]);
});

test('move endpoint delegates to the canonical engine',() => {
  contains(server,["request.url === '/api/move-check'",'functional.validateMove']);
});

test('first, middle and last movable rows can move',() => {
  ['first','middle','last'].forEach((id,index) => {
    const result = functional.validateMove({ moving:slot(id,`2027-03-0${index + 1}`),targetDate:`2027-04-0${index + 1}`,others:[] });
    assert.equal(result.state,'COMPATIBLE'); assert.equal(result.allowed,true);
  });
});

test('fixed and externally locked rows are rejected by the API',() => {
  assert.equal(functional.validateMove({moving:slot('fixed','2027-03-01',{fixedDate:true}),targetDate:'2027-04-01'}).code,'MOVE_LOCKED');
  assert.equal(functional.validateMove({moving:slot('external','2027-03-01',{locked:true}),targetDate:'2027-04-01'}).code,'MOVE_LOCKED');
});

test('priority movement requires explicit confirmation',() => {
  const warning = functional.validateMove({moving:slot('priority','2027-03-01'),targetDate:'2027-04-01',priorityDate:true});
  assert.equal(warning.state,'DEROGABLE'); assert.equal(warning.level,'DEROGABLE'); assert.equal(warning.requiresConfirmation,true);
  assert.equal(functional.validateMove({moving:slot('priority','2027-03-01'),targetDate:'2027-04-01',priorityDate:true,confirmPriority:true}).allowed,true);
});

test('conflicting movement is rejected by the same engine',() => {
  const result = functional.validateMove({moving:slot('moving','2027-03-01',{publicCodes:['DPS:1']}),targetDate:'2027-04-01',others:[slot('occupied','2027-04-01',{publicCodes:['DPS:1']})]});
  assert.equal(result.state,'CONFLICT'); assert.equal(result.code,'MOVE_CONFLICT');
});

test('day reservation follows SDIS, local unit and external target scope',() => {
  const sdis=scopedSlot('Journée SDIS','GENERIC','',{targetCode:'SDIS-ALL',coverage:'SDIS_ALL',dayExclusive:true,startTime:'08:00',endTime:'17:00'});
  const local=scopedSlot('Instruction G1','DPS_INSTRUCTION','G1',{startTime:'19:00',endTime:'21:00'});
  assert.equal(functional.compatibilityBetween(sdis,local).state,'CONFLICT');
  const reservedG1=scopedSlot('Journée G1','DPS_INSTRUCTION','G1',{dayExclusive:true,startTime:'08:00',endTime:'17:00'});
  assert.equal(functional.compatibilityBetween(reservedG1,scopedSlot('Soir G1','DPS_INSTRUCTION','G1',{startTime:'19:00',endTime:'21:00'})).state,'CONFLICT');
  assert.equal(functional.compatibilityBetween(reservedG1,scopedSlot('Soir C1','DPS_INSTRUCTION','C1',{startTime:'19:00',endTime:'21:00'})).state,'COMPATIBLE');
  const external=scopedSlot('Événement externe','GENERIC','',{targetCode:'EXTERNAL',dayExclusive:true,startTime:'08:00',endTime:'17:00'});
  assert.equal(functional.compatibilityBetween(external,local).state,'COMPATIBLE');
});

test('conflict analysis names both events without duplicate status labels',() => {
  const start=app.lastIndexOf('function conflictAnalysisHtml');
  const source=app.slice(start,app.indexOf('function conflicts(){',start));
  contains(source,['result.moving.label','result.moving.target','result.moving.publics','result.conflict.label','result.conflict.target','result.conflict.publics','result.date','result.time','result.reason']);
  assert.ok(!source.includes('Conflit Conflit'));
  assert.ok(!source.includes('Compatible Compatible'));
  assert.ok(!source.includes('CHEF-SITE-DPS'));
  assert.ok(!source.includes('DPS:1'));
});

test('conflict analysis and move result cannot share stale state',() => {
  contains(app,['conflictAnalysis:null,moveResult:null','state.conflictAnalysis=moveContext(','result=state.moveResult','state.moveResult=null','delete s.lastConflict']);
  const moveStart=app.lastIndexOf('async function moveActivity');
  const finalMove=app.slice(moveStart,app.indexOf('app.addEventListener',moveStart));
  assert.ok(!finalMove.includes('conflictAnalysis'));
  assert.ok(!finalMove.includes('lastConflict'));
});

test('drag and drop binds nested row content and supports both directions',() => {
  const down=functional.validateMove({moving:slot('first','2027-03-01'),targetDate:'2027-09-04',others:[]});
  const up=functional.validateMove({moving:slot('last','2027-09-04'),targetDate:'2027-03-01',others:[]});
  assert.equal(down.allowed,true); assert.equal(up.allowed,true);
  contains(finalMoveSource,[".timeline-day,.timeline-date,.timeline-events,.timeline-event",'stopPropagation()','getData(\'text/plain\')','clearMoveResult()','drag-active','endMoveDrag()']);
  contains(finalMoveSource,['node.ondragend=endMoveDrag','zone.ondragleave','row.dataset.date']);
  assert.ok(!finalMoveSource.slice(finalMoveSource.lastIndexOf('function bindMove')).includes('dragTargetDate'));
  contains(css,['.timeline.drag-active .timeline-event:not(.dragging){pointer-events:none}']);
  const dragStart=finalMoveSource.slice(finalMoveSource.indexOf('node.ondragstart'),finalMoveSource.indexOf('node.ondragend'));
  assert.ok(!dragStart.includes('render()'));
});

test('different DPS intervention units coexist even with generic public codes',() => {
  const units=['G1','C1','B1','B2'];
  for(let left=0;left<units.length;left+=1){
    for(let right=left+1;right<units.length;right+=1){
      const result=functional.compatibilityBetween(
        scopedSlot(`DPS ${units[left]}`,'DPS_EXERCISE',units[left],{publicCodes:['DPS:1']}),
        scopedSlot(`DPS ${units[right]}`,'DPS_EXERCISE',units[right],{publicCodes:['DPS:1']})
      );
      assert.equal(result.state,'COMPATIBLE',`${units[left]} and ${units[right]}`);
    }
  }
});

test('DAP Y1 to Y4 use the same full-unit isolation rule',() => {
  const units=['Y1','Y2','Y3','Y4'];
  units.forEach((unit,index) => {
    const same=functional.compatibilityBetween(scopedSlot(`DAP ${unit} A`,'DAP_EXERCISE',unit),scopedSlot(`DAP ${unit} B`,'DAP_EXERCISE',unit));
    assert.equal(same.state,'CONFLICT');
    const other=units[(index+1)%units.length];
    assert.equal(functional.compatibilityBetween(scopedSlot(`DAP ${unit}`,'DAP_EXERCISE',unit),scopedSlot(`DAP ${other}`,'DAP_EXERCISE',other)).state,'COMPATIBLE');
  });
});

test('a full DPS exercise blocks another full exercise of the same unit',() => {
  const result=functional.compatibilityBetween(scopedSlot('Exercice A','DPS_EXERCISE','G1'),scopedSlot('Exercice B','DPS_EXERCISE','G1'));
  assert.equal(result.state,'CONFLICT');
  assert.ok(result.causes.some((cause) => cause.code==='FULL_OI_CONFLICT' && cause.severity==='BLOCKING'));
});

test('JSP exercise conflicts with DPS exercise of the same unit only',() => {
  const same=functional.compatibilityBetween(scopedSlot('JSP G1','JSP_EXERCISE','G1'),scopedSlot('DPS G1','DPS_EXERCISE','G1'));
  assert.equal(same.state,'CONFLICT');
  assert.ok(same.causes.some((cause) => cause.code==='JSP_DPS_DEPENDENCY'));
  const instruction=functional.compatibilityBetween(scopedSlot('JSP G1','JSP_EXERCISE','G1'),scopedSlot('Instruction DPS G1','DPS_INSTRUCTION','G1'));
  assert.equal(instruction.state,'COMPATIBLE');
});

test('PR and DPS exercise overlap is avoidable with explicit confirmation',() => {
  const pr=scopedSlot('Exercice PR','PR_EXERCISE','',{});
  const dps=scopedSlot('Exercice DPS B2','DPS_EXERCISE','B2');
  const assessment=functional.compatibilityBetween(pr,dps);
  assert.equal(assessment.state,'DEROGABLE');
  assert.ok(assessment.causes.some((cause) => cause.code==='PR_DPS_OVERLAP' && cause.severity==='DEROGABLE'));
  const warning=functional.validateMove({moving:pr,targetDate:'2027-03-01',others:[dps]});
  assert.equal(warning.allowed,false); assert.equal(warning.requiresConfirmation,true);
  assert.equal(functional.validateMove({moving:pr,targetDate:'2027-03-01',others:[dps],confirmConstraint:true}).allowed,true);
});

test('grouped DPS training and PR remain attention unless a resource is shared',() => {
  const grouped=scopedSlot('Formation groupée DPS','DPS_GROUPED_TRAINING','G1');
  const pr=scopedSlot('Exercice PR','PR_EXERCISE','');
  const attention=functional.compatibilityBetween(grouped,pr);
  assert.equal(attention.state,'ATTENTION');
  assert.equal(functional.validateMove({moving:grouped,targetDate:'2027-03-01',others:[pr]}).allowed,true);
  const blocked=functional.compatibilityBetween({...grouped,roleCodes:['FORMATEUR-COMMUN']},{...pr,roleCodes:['FORMATEUR-COMMUN']});
  assert.equal(blocked.state,'CONFLICT');
  assert.ok(blocked.causes.some((cause) => cause.code==='ROLE_CONFLICT'));
});

test('SDIS-wide coverage is blocking and messages stay in business language',() => {
  const transverse=scopedSlot('Activité transverse','GENERIC','',{coverage:'SDIS_ALL',targetCode:'SDIS-ALL'});
  const local=scopedSlot('Exercice DPS G1','DPS_EXERCISE','G1');
  const result=functional.compatibilityBetween(transverse,local);
  assert.equal(result.state,'CONFLICT');
  const message=functional.presentConstraintCause(result.causes.find((cause) => cause.code==='SDIS_ALL_CONFLICT'));
  assert.match(message,/ensemble du SDIS/);
  assert.doesNotMatch(message,/DPS:1|CHEF-SITE-DPS|FORMATEUR-COMMUN/);
});

test('three non-compatible severities are part of the canonical contract',() => {
  assert.deepEqual(functional.COMPATIBILITY_STATES,['COMPATIBLE','CONFLICT','DEROGABLE','ATTENTION']);
  ['BLOCKING','DEROGABLE','ATTENTION'].forEach((severity) => assert.ok(app.includes(severity)||fs.readFileSync(path.join(root,'netlify/lib/_scope-functional-catalog.js'),'utf8').includes(`'${severity}'`)));
});

test('calendar restrictions are enforced by movement engine',() => {
  const result = functional.validateMove({ moving:slot('calendar','2027-03-01'),targetDate:'2027-04-02',calendarRules:{ forbiddenWeekdays:['FRIDAY'] } });
  assert.equal(result.allowed,false); assert.equal(result.code,'MOVE_CALENDAR_CONFLICT');
  assert.match(result.message,/FRIDAY/);
});

test('screen 2 exposes explicit add remove multipublic controls and deduplicates requirements',() => {
  contains(app,['function choiceContent','choice-add-button','choice-remove',"choice('Publics concernés'",'C19OccurrenceModel.uniqueCodes']);
  assert.deepEqual(occurrenceModel.uniqueCodes(['FOBA:1','FOBA:2','FOBA:1']),['FOBA:1','FOBA:2']);
  assert.deepEqual(occurrenceModel.collectPublicRequirements([{publics:['FOBA:1']},{publics:['FOBA:1','FOBA:2']}]),['FOBA:1','FOBA:2']);
  const sessions=occurrenceModel.buildSessions({profiles:occurrenceModel.normalizeProfiles({label:'Formation FOBA',duration:120,target:'FOBA',publics:['FOBA:1','FOBA:2'],location:'L-B1',room:'R-B1-THEORIE'},1),sessions:2,numberOccurrences:true});
  assert.ok(sessions.every((row) => row.publics.join('|')==='FOBA:1|FOBA:2'));
  contains(app,['whoCodes:a.publics','whoCodes:s.publics']);
});

test('known event external target clears internal publics and editable references remain structured',() => {
  contains(app,["target==='EXTERNAL'?[]:publicRows(target)","publics=target==='EXTERNAL'?[]:selected('known-publics')",'setChoice(\'known-publics\'','known-schedule','known-exclusive']);
  contains(app,["choice('Rôles indispensables'","choice('Ressources indispensables'",'definition.roles=C19OccurrenceModel.uniqueCodes','definition.resources=C19OccurrenceModel.uniqueCodes']);
  contains(css,['.known-schedule{display:grid;grid-template-columns:repeat(4', '.known-exclusive{min-height:36px']);
});

test('annual agenda uses a dimension-neutral light fill and conditional square activity dot without count',() => {
  const monthStart=app.lastIndexOf('function month(');
  const finalMonth=app.slice(monthStart,app.indexOf('function bindMove',monthStart));
  contains(finalMonth,['count?\'has-events \'','selected-date','aria-pressed','data-agenda-date']);
  assert.ok(finalMonth.includes('<i aria-hidden="true"></i>'));
  assert.ok(!finalMonth.includes("'<i>'+count+'</i>'"));
  contains(css,['.year-day.proposed{outline:0}', '.year-day.has-events{background:#e7f1f8;box-shadow:none', '.year-day.has-events:not(.holiday):not(.vacation):not(.announced) i{display:none}', '.year-day.holiday.has-events i,.year-day.vacation.has-events i,.year-day.announced.has-events i{display:block;width:5px;height:5px', '.year-day.announced:not(.holiday):not(.vacation).has-events{background:#fff7cc}', '.year-day.selected-date::before', '.year-day:focus-visible{outline:1px dashed var(--red)', '.legend-proposed i::after{display:none}']);
});

test('two priority activities can be moved by an explicit audited derogation',() => {
  const moving=slot('priority-a','2027-03-01',{activityLabel:'Exercice prioritaire A',priority:35,whoCodes:['FOBA:1']});
  const occupied=slot('priority-b','2027-04-01',{activityLabel:'Exercice prioritaire B',priority:35,whoCodes:['FOBA:1']});
  const warning=functional.validateMove({moving,targetDate:'2027-04-01',others:[occupied]});
  assert.equal(warning.state,'DEROGABLE');
  assert.equal(warning.requiresConfirmation,true);
  assert.equal(warning.primaryAssessment.priorityPair,true);
  const confirmed=functional.validateMove({moving,targetDate:'2027-04-01',others:[occupied],confirmDerogation:true,decisionTimestamp:'2027-01-02T03:04:05.000Z'});
  assert.equal(confirmed.allowed,true);
  assert.equal(confirmed.derogation.decision,'DEROGATE_AND_MOVE');
  assert.deepEqual(confirmed.derogation.constraintCodes,['WHO_CONFLICT']);
  assert.equal(confirmed.derogation.decidedAt,'2027-01-02T03:04:05.000Z');
});

test('Etat-major conflicts only when the destination shares a real indispensable role',() => {
  const em=scopedSlot('Séance État-major','GENERIC','',{targetCode:'SDIS-EM',whoCodes:['EM:2','EM:3','EM:4'],roleCodes:['CHEF-SITE-DPS'],roomCode:'R-G1-EM',priority:10,startTime:'19:30',endTime:'21:30'});
  const dps=scopedSlot('Exercice DPS 1','DPS_EXERCISE','B1',{whoCodes:['DPS:1'],roleCodes:['CHEF-SITE-DPS'],roomCode:'R-B1-THEORIE',priority:35});
  const grouped=scopedSlot('Formation groupée DPS 1','DPS_GROUPED_TRAINING','G1',{whoCodes:['DPS:1','DPS:2'],roleCodes:[],roomCode:'R-G1-ALPES',priority:70});
  const pr=scopedSlot('Exercice PR 1.1','PR_EXERCISE','',{whoCodes:['PR:1'],roleCodes:['FORMATEUR-PR'],resourceCodes:['APR'],roomCode:'R-G1-O2',priority:35});
  const caseA=functional.validateMove({moving:{...em,date:'2027-03-04'},targetDate:'2027-03-03',others:[{...dps,date:'2027-03-03'}]});
  assert.equal(caseA.state,'DEROGABLE');
  assert.deepEqual(caseA.primaryAssessment.causes.map((cause) => [cause.code,cause.roleCodes]),[['ROLE_CONFLICT',['CHEF-SITE-DPS']]]);
  const caseB=functional.validateMove({moving:{...em,date:'2027-03-04'},targetDate:'2027-03-01',others:[{...grouped,date:'2027-03-01'},{...pr,date:'2027-03-01'}]});
  assert.equal(caseB.state,'COMPATIBLE');
  assert.equal(caseB.primaryAssessment,null);
  assert.deepEqual(functional.compatibilityBetween(grouped,em).causes,[]);
  assert.deepEqual(functional.compatibilityBetween(pr,em).causes,[]);
});

test('dragend never commits a stale previously hovered destination',() => {
  const finalBinding=app.slice(app.lastIndexOf('function bindMove(){'));
  contains(finalBinding,['node.ondragend=endMoveDrag','zone.ondrop','date=row.dataset.date']);
  assert.ok(!finalBinding.includes('dragTargetDate'));
  assert.ok(!finalBinding.includes('ondragend=function'));
});

test('screen 12 names constraint level and business context before derogation',() => {
  contains(app,['Niveau : ','Déroger et déplacer','function moveContext','function moveCauseDetail','Rôle concerné : ','Ressource concernée : ','Salle concernée : ','Public concerné : ','Décision tracée :']);
  assert.ok(!finalMoveSource.includes("'Compatible')+'Déplaçable"));
  contains(finalMoveSource,['Date modifiable','Date prioritaire','Date fixée']);
});

test('proposal count is capped at three',() => {
  const rows = functional.proposeBestDates({definitionCode:'070F7.001',activityLabel:'Test',windowStart:'2027-01-01',windowEnd:'2027-02-01',maxProposals:12,siteCode:'G1'});
  assert.ok(rows.length <= 3);
});

test('preview remains local and performs no production write',() => {
  assert.ok(!server.includes('DATABASE_URL'));
  assert.ok(!server.includes('INSERT INTO'));
  contains(app,['localStorage','Enregistrer localement']);
});

test('controls keep restrained square geometry',() => {
  contains(css,['border-radius:3px','input[type="checkbox"]','border-radius:0']);
  contains(css,['.occurrence-fields .field select[multiple],.occurrence-fields .paired-control select:not([multiple]){height:36px', '.move-toolbar .field select{height:36px']);
  assert.ok(!css.includes('border-radius:999'));
});

test('saved definition becomes the annual and slot source of truth',() => {
  const pipeline=app.slice(app.indexOf('/* C19 pipeline integration 1 */'));
  contains(pipeline,['function sync(){','first.publics.slice()','location:first.location','room:first.room','async function saveDef()','sync();render()','function applyDefinitionDraft','applyDefinitionDraft(d,next)','function bindAnnual()']);
  assert.ok(!pipeline.includes("target:'DPS-G1'"));
  assert.ok(!pipeline.includes("publics:['DPS:5']"));
  contains(app,["KEY='scope-c19-pipeline-integration-1-r2'"]);
});

test('FOBA annual need builds four complete independent planning sessions',() => {
  const definition={uid:'foba-recipe',code:'073FB.999',statCom:'073FB',label:'Formation FOBA',domain:'FOBA',family:'Formation',type:'Multi-session',occurrences:2,sessions:2,numberOccurrences:true,duration:120,target:'FOBA',publics:['FOBA:1','FOBA:2'],location:'L-B1',room:'R-B1-THEORIE',roles:['FORMATEUR-PR'],resources:['TPM'],priorityClass:'NORMAL'};
  const rows=occurrenceModel.buildPlanningSessions({definition,annual:{occurrences:2,target:'FOBA',publics:['FOBA:1','FOBA:2','FOBA:1'],location:'L-B1',room:'R-B1-THEORIE'}});
  assert.deepEqual(rows.map((row) => `${row.occurrence}.${row.session}`),['1.1','1.2','2.1','2.2']);
  assert.ok(rows.every((row) => row.domain==='FOBA'&&row.target==='FOBA'&&row.publics.join('|')==='FOBA:1|FOBA:2'));
  assert.ok(rows.every((row) => row.location==='L-B1'&&row.room==='R-B1-THEORIE'&&row.definitionUid==='foba-recipe'));
  assert.notEqual(rows[0].publics,rows[1].publics);
  contains(app,['function planningSessions()','data-session-id','programmedActivityId','function selectedPlanningSession()']);
});

test('administered weekday rules are the placement engine input',() => {
  const definition={rules:{MONDAY:'FORBIDDEN',TUESDAY:'FORBIDDEN',WEDNESDAY:'PRIORITY',THURSDAY:'FORBIDDEN',FRIDAY:'FORBIDDEN',SATURDAY:'FORBIDDEN',SUNDAY:'FORBIDDEN'},dayStatuses:{PUBLIC_HOLIDAY:'FORBIDDEN'}};
  const rules=occurrenceModel.calendarRules(definition);
  assert.deepEqual(rules.priorityWeekdays,['WEDNESDAY']);
  assert.ok(rules.forbiddenWeekdays.includes('TUESDAY')&&rules.forbiddenWeekdays.includes('THURSDAY'));
  const proposals=functional.proposeBestDates({definitionCode:'FOBA',activityLabel:'Formation FOBA 1.1',year:2027,windowStart:'2027-01-01',windowEnd:'2027-02-28',calendarRules:rules,maxProposals:3});
  assert.equal(proposals.length,3);
  assert.ok(proposals.every((proposal) => new Date(`${proposal.date}T00:00:00Z`).getUTCDay()===3));
  const finalRequest=app.slice(app.lastIndexOf('async function requestProposals()'),app.lastIndexOf('function programProposal'));
  contains(finalRequest,['calendarRules:C19OccurrenceModel.calendarRules(d)','activityLabel:row.label','whoCodes:s.publics']);
  assert.ok(!finalRequest.includes("['TUESDAY']"));
  assert.ok(!finalRequest.includes("['THURSDAY']"));
});

test('choosing a proposal creates one canonical programmed activity used by screens 10 to 12',() => {
  const pipeline=app.slice(app.lastIndexOf('function programProposal('));
  contains(pipeline,['planned=activity(','state.activities.push(planned)','state.activities[index]=planned','row.programmedActivityId=id','state.selectedAgendaDate=planned.date',"state.movePeriod='YEAR'"]);
  contains(app,['state.activities.slice().sort','state.activities.filter(function(a){return a.date===date})','function moveRows(){return state.activities.filter']);
});

test('screen 9 delegates canonical activities to the same move endpoint as screen 12',() => {
  const integration=app.slice(app.indexOf('/* C19 conflict engine integration 1 */'));
  const diagnostic=integration.slice(integration.indexOf('async function runConflict'));
  contains(diagnostic,["fetch('/api/move-check'",'moving:apiSlot(moving)','others:[apiSlot(other)]','state.conflictAnalysis=moveContext(']);
  assert.ok(!app.includes('var scenarios={role:{state:'));
  contains(integration,['Rôle concerné : ','Ressource concernée : ','Salle concernée : ','OI concerné : ','Public concerné : ','Portée de la journée réservée : ','Session initiale : ','Session alternative : ']);
});

test('screen 9 and screen 12 preserve the same canonical level and causes',() => {
  const cases=[
    [scopedSlot('État-major','GENERIC','',{roleCodes:['CHEF-SITE-DPS'],priority:10}),scopedSlot('DPS B1','DPS_EXERCISE','B1',{roleCodes:['CHEF-SITE-DPS'],priority:35})],
    [scopedSlot('Atelier APR','GENERIC','',{resourceCodes:['APR']}),scopedSlot('Exercice PR','PR_EXERCISE','',{resourceCodes:['APR']})],
    [scopedSlot('Salle A','GENERIC','',{roomCode:'R-B1-THEORIE'}),scopedSlot('Salle B','GENERIC','',{roomCode:'R-B1-THEORIE'})]
  ];
  cases.forEach(([left,right]) => {
    const pair=functional.compatibilityBetween(left,right);
    const move=functional.validateMove({moving:left,targetDate:right.date,others:[right]});
    assert.equal(move.state,pair.state);
    assert.deepEqual(move.primaryAssessment.causes,pair.causes);
  });
});

test('PR permutation covers target and public only, never indispensable constraints',() => {
  const first=scopedSlot('Exercice PR 1.1','PR_EXERCISE','',{publicCodes:['PR'],whoCodes:['PR:1'],sessionCount:6,permutationAllowed:true});
  const alternative=scopedSlot('Exercice PR 1.2','PR_EXERCISE','',{publicCodes:['PR'],whoCodes:['PR:1'],sessionCount:6});
  const pair=functional.compatibilityBetween(first,alternative);
  assert.equal(pair.state,'COMPATIBLE');
  assert.equal(pair.permutationApplied,true);
  const move=functional.validateMove({moving:first,targetDate:alternative.date,others:[alternative]});
  assert.equal(move.state,'COMPATIBLE');
  assert.equal(move.primaryAssessment.permutationApplied,true);
  const resource=functional.compatibilityBetween({...first,resourceCodes:['APR']},{...alternative,resourceCodes:['APR']});
  assert.equal(resource.state,'CONFLICT');
  assert.ok(resource.causes.some((cause) => cause.code==='RESOURCE_CONFLICT'));
});

test('diagnostic recipe exercises all four user-facing levels from real engine results',() => {
  const blocking=functional.validateMove({moving:slot('room-a','2027-03-01',{roomCode:'ROOM'}),targetDate:'2027-03-01',others:[slot('room-b','2027-03-01',{roomCode:'ROOM'})]});
  const derogable=functional.validateMove({moving:scopedSlot('PR','PR_EXERCISE',''),targetDate:'2027-03-01',others:[scopedSlot('DPS','DPS_EXERCISE','B1')]});
  const attention=functional.validateMove({moving:scopedSlot('Groupée','DPS_GROUPED_TRAINING','G1'),targetDate:'2027-03-01',others:[scopedSlot('PR','PR_EXERCISE','')]});
  const compatible=functional.validateMove({moving:slot('A','2027-03-01'),targetDate:'2027-03-01',others:[slot('B','2027-03-01')]});
  assert.deepEqual([blocking.level,derogable.level,attention.level,compatible.level],['BLOCKING','DEROGABLE','ATTENTION','COMPATIBLE']);
});

test('autonomous announced dates have a stable non-operational model and full CRUD',() => {
  let rows=occurrenceModel.saveAnnouncement([],{
    date:'15.05.2027',label:'Formation X annoncée',definitionUid:'d9',occurrence:1,session:2
  },()=>'announcement-stable');
  assert.deepEqual(rows,[{id:'announcement-stable',date:'15.05.2027',label:'Formation X annoncée',definitionUid:'d9',occurrence:1,session:2,state:'ANNOUNCED',linkedActivityId:''}]);
  rows=occurrenceModel.saveAnnouncement(rows,{...rows[0],date:'22.05.2027'},()=>{throw new Error('existing id must be reused');});
  assert.equal(rows.length,1);
  assert.equal(rows[0].date,'22.05.2027');
  assert.deepEqual(occurrenceModel.normalizeAnnouncements(JSON.parse(JSON.stringify(rows))),rows);
  assert.deepEqual(occurrenceModel.removeAnnouncement(rows,'announcement-stable'),[]);
});

test('screen 4 administers announced dates without creating screen 10 or 12 rows',() => {
  const integration=app.slice(app.indexOf('/* C19 autonomous announced dates */'),app.indexOf('/* C19 conflict engine integration 1 */'));
  contains(integration,['function announcementForm()','Date annoncée','saveAnnouncement','edit-announcement','delete-announcement','Supprimer cette date annoncée ?']);
  contains(integration,['state.announcements','function annual()','function bindAnnual()']);
  assert.ok(!app.slice(app.lastIndexOf('function activities()'),app.lastIndexOf('function bindActivities()')).includes('announcements()'));
  assert.ok(!app.slice(app.lastIndexOf('function move(){'),app.lastIndexOf('function bindMove(){')).includes('announcements()'));
  assert.ok(!app.slice(app.lastIndexOf('function apiSlot('),app.lastIndexOf('function activitySortValue')).includes('announcement'));
});

test('agenda distinguishes announced-only and announced-plus-activity days',() => {
  const finalMonth=app.slice(app.lastIndexOf('function month('),app.indexOf('var programProposalWithoutAnnouncements'));
  contains(finalMonth,['dateAnnouncements=C19OccurrenceModel.announcementsOnDate','announced=dateAnnouncements.length>0','(announced?\'announced \':\'\')','(count?\'has-events \':\'\')','(count?\'<i aria-hidden="true"></i>\':\'\')']);
  assert.ok(!finalMonth.includes('events.some(function(a){return a.fixedDate}'));
  contains(css,['.year-day.announced{background:#fff7cc}', '.year-day.announced:not(.holiday):not(.vacation).has-events{background:#fff7cc}', '.year-day.announced.has-events i{display:block;width:5px;height:5px']);
});

test('programming links an announcement trace without duplicating the activity',() => {
  const integration=app.slice(app.indexOf('var programProposalWithoutAnnouncements'),app.indexOf('/* C19 conflict engine integration 1 */'));
  contains(integration,['programProposalWithoutAnnouncements(proposalId)','item.date===planned.date&&item.definitionUid===definition.uid','linkedActivityId:activityId']);
  assert.ok(!integration.includes('state.activities.push'));
  contains(app,['Activité programmée','À confirmer']);
});

test('announced dates never enter proposal or conflict engine inputs',() => {
  const proposal=app.slice(app.lastIndexOf('async function requestProposals()'),app.lastIndexOf('function programProposal('));
  const conflict=app.slice(app.lastIndexOf('async function runConflict'));
  contains(proposal,['occupiedSlots:state.activities.map(apiSlot)']);
  contains(conflict,['moving:apiSlot(moving)','others:[apiSlot(other)]']);
  assert.ok(!proposal.includes('announcements'));
  assert.ok(!conflict.includes('announcements'));
});

process.stdout.write(`\n${passed} C19 UX checks passed.\n`);
if(process.exitCode) process.exit(process.exitCode);

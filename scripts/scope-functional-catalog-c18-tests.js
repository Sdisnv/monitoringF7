'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const functional = require('../netlify/lib/_scope-functional-catalog');

const ROOT = path.resolve(__dirname,'..');
const read = (file) => fs.readFileSync(path.join(ROOT,file),'utf8');
const preview = JSON.parse(read('docs/SCOPE_C15_QUO_VADIS_2026_PREVIEW.json'));

test('1 Exercice JSP converge vers une définition, dix réalisations et trois sites',() => {
  const matrix = functional.buildConvergenceMatrix(preview.proposals);
  const jsp = matrix.find((row) => row.targetDefinition === 'JSP-EXERCICE');
  assert.equal(jsp.action,'MERGE_SAFE');
  assert.equal(jsp.source.length,10);
  assert.equal(jsp.realizations,10);
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:10,defaultSites:['G1','C1','B1'],ruleMode:'GENERAL' },sessions:[{ code:'S1',sequence:1,durationMinutes:120 }],
    publicCodes:['JSP-GEN'],windowStart:'2027-01-11' });
  assert.equal(schedule.valid,true);
  assert.equal(schedule.slots.length,30);
  assert.deepEqual([...new Set(schedule.slots.map((row) => row.siteCode))],['B1','C1','G1']);
  assert.equal(new Set(schedule.slots.filter((row) => row.occurrenceNumber === 1).map((row) => row.date)).size,1);
  assert.equal(schedule.slots[0].finalLabel,'Exercice JSP 1');
});

test('2 la série Formation groupée 1.1 à 1.6 devient une activité multi-séances liée',() => {
  const group = functional.buildConvergenceMatrix(preview.proposals).find((row) => row.targetDefinition === 'DPS-FORMATION-GROUPEE');
  assert.equal(group.action,'MERGE_SAFE');
  assert.equal(group.proposedType,'MULTI_SESSION');
  assert.deepEqual(group.sessions,['1.1','1.2','1.3','1.4','1.5','1.6']);
  assert.equal(group.realizations,1);
  const schedule = functional.proposeAnnualSchedule({ definitionCode:group.targetDefinition,activityLabel:'Formation groupée',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:group.sessions.map((code,index) => ({ code,sequence:index+1,durationMinutes:120 })),publicCodes:['DPS-G1'],windowStart:'2027-02-01' });
  assert.equal(new Set(schedule.slots.map((row) => row.date)).size,6);
});

test('3 la série Exercice PR 1.1 à 1.6 devient une activité PR 1 multi-séances liée',() => {
  const group = functional.buildConvergenceMatrix(preview.proposals).find((row) => row.targetDefinition === 'PR-EXERCICE-1');
  assert.equal(group.action,'MERGE_SAFE');
  assert.equal(group.proposedType,'MULTI_SESSION');
  assert.deepEqual(group.sessions,['1.1','1.2','1.3','1.4','1.5','1.6']);
  assert.equal(group.realizations,1);
  const schedule = functional.proposeAnnualSchedule({ definitionCode:group.targetDefinition,activityLabel:'Exercice PR',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:group.sessions.map((code,index) => ({ code,sequence:index+1,durationMinutes:120 })),publicCodes:['PR-PAPR','DPS-GEN'],windowStart:'2027-02-01' });
  assert.equal(schedule.slots.length,6);
  assert.deepEqual([...new Set(schedule.slots.map((row) => row.sessionCode))],['1.1','1.2','1.3','1.4','1.5','1.6']);
  assert.deepEqual(schedule.slots.map((row) => row.finalLabel),['Exercice PR 1.1','Exercice PR 1.2','Exercice PR 1.3','Exercice PR 1.4','Exercice PR 1.5','Exercice PR 1.6']);
});

test('4 une activité non récurrente peut être ajoutée comme extraordinaire annuelle',() => {
  const result = functional.annualConfiguration({ recurrenceKind:'NON_RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    { state:'ACTIVE',occurrences:1,sites:['G1'],extraordinary:true });
  assert.equal(result.valid,true);
  assert.equal(result.value.extraordinary,true);
  assert.equal(result.value.state,'ACTIVE');
});

test('5 la modification Catalogue crée une version et retire seulement la version active précédente',() => {
  const source = read('netlify/lib/_scope-annual-catalog-service.js');
  assert.match(source,/insert into scope_event_definition_versions[\s\S]*values \(\$1,\$2,'DRAFT'/);
  assert.match(source,/status='RETIRED'[\s\S]*where definition_version_id=\$1 and status='ACTIVE'/);
  assert.match(source,/status='ACTIVE'[\s\S]*where definition_version_id=\$1 and status='DRAFT'/);
  assert.doesNotMatch(source,/update scope_event_definition_versions set description=/i);
});

test('6 un override annuel ne modifie pas le profil permanent',() => {
  const profile = Object.freeze({ recurrenceKind:'RECURRENT',defaultOccurrences:10,defaultSites:Object.freeze(['G1','C1','B1']),ruleMode:'GENERAL' });
  const result = functional.annualConfiguration(profile,{ occurrences:9,sites:['G1','C1'],state:'ACTIVE' });
  assert.equal(result.value.occurrences,9);
  assert.deepEqual(result.value.sites,['C1','G1']);
  assert.equal(profile.defaultOccurrences,10);
  assert.deepEqual(profile.defaultSites,['G1','C1','B1']);
});

test('7 horaire, durée et complément construisent un libellé final sans thème obligatoire',() => {
  assert.equal(functional.durationMinutes('19:30','22:00'),150);
  assert.equal(functional.durationLabel(150),'2 h 30');
  assert.equal(functional.finalActivityLabel('Exercice JSP',''),'Exercice JSP');
  assert.equal(functional.finalActivityLabel('Exercice JSP','Manœuvre hydraulique'),'Exercice JSP · Manœuvre hydraulique');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,''),'Exercice JSP 1');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,'Les bases'),'Exercice JSP 1 · Les bases');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,3,''),'Exercice JSP 1.1');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,3,'Les bases'),'Exercice JSP 1.1 · Les bases');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',2,3,3,''),'Exercice JSP 2.3');
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,durationMinutes:150,labelComplement:'Manœuvre hydraulique' }],publicCodes:['JSP-GEN'],windowStart:'2027-03-01',
    startTime:'19:30',endTime:'22:00' });
  assert.equal(schedule.slots[0].durationMinutes,150);
  assert.equal(schedule.slots[0].durationLabel,'2 h 30');
  assert.equal(schedule.slots[0].finalLabel,'Exercice JSP 1 · Manœuvre hydraulique');
});

test('8 un chevauchement réel de public canonique produit un conflit déterministe',() => {
  const conflicts = functional.detectPublicConflicts([
    { slotId:'a',definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',occurrenceNumber:1,siteCode:'G1',date:'2027-03-02',startTime:'19:30',endTime:'21:30',publicCodes:['JSP-GEN'] },
    { slotId:'b',definitionCode:'JSP-FORMATION',activityLabel:'Formation JSP',occurrenceNumber:1,siteCode:'C1',date:'2027-03-02',startTime:'20:00',endTime:'22:00',publicCodes:['JSP-GEN'] }
  ]);
  assert.equal(conflicts.length,1);
  assert.deepEqual(conflicts[0].publicCodes,['JSP-GEN']);
  assert.equal(conflicts[0].code,'PUBLIC_CONFLICT');
});

test('9 deux activités du même jour sans chevauchement horaire ne sont pas en conflit',() => {
  const conflicts = functional.detectPublicConflicts([
    { slotId:'a',definitionCode:'A',activityLabel:'A',occurrenceNumber:1,siteCode:'G1',date:'2027-03-02',startTime:'18:00',endTime:'19:00',publicCodes:['JSP-GEN'] },
    { slotId:'b',definitionCode:'B',activityLabel:'B',occurrenceNumber:1,siteCode:'G1',date:'2027-03-02',startTime:'20:00',endTime:'22:00',publicCodes:['JSP-GEN'] }
  ]);
  assert.equal(conflicts.length,0);
});

test('10 C18 ne publie aucun événement ni donnée opérationnelle',() => {
  const source = [read('netlify/lib/_scope-functional-catalog.js'),read('netlify/lib/_scope-annual-catalog-service.js'),read('database/migrations/20260925_scope_functional_catalog_c18.sql')].join('\n');
  for(const table of ['scope_evenements','scope_attendus','scope_participations','scope_presences','scope_population_figee']){
    assert.doesNotMatch(source,new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+${table}\\b`,'i'));
  }
  assert.match(source,/operationalWrites:false/);
  assert.match(source,/eventPublication:false/);
});

test('11 la convergence SQL est transactionnelle, idempotente et limitée aux groupes démontrés',() => {
  const sql = read('database/migrations/20260925_scope_functional_catalog_c18.sql');
  assert.match(sql,/^begin;/m);
  assert.match(sql,/commit;\s*$/);
  assert.match(sql,/create table if not exists scope_catalog_convergence_links/);
  assert.match(sql,/on conflict \(source_definition_id\) do nothing/g);
  assert.match(sql,/on conflict \(version\) do nothing/);
  assert.match(sql,/source_version\.metadata->>'sourceSha256'/);
  assert.match(sql,/Exercice JSP \(\[1-9\]\|10\)/);
  assert.match(sql,/Formation groupée 1\\\.\[1-6\]/);
  assert.match(sql,/Exercice PR 1\\\.\[1-6\]/);
  assert.match(sql,/PR-EXERCICE-1/);
  assert.match(sql,/label_complement text/);
  assert.match(sql,/final_label text/);
  assert.doesNotMatch(sql,/label\s+~\s*'\^\.\*/i);
  assert.doesNotMatch(sql,/label\s+~\s*'[^']*\(\?:Formation\|Exercice\)[^']*'/i);
});

test('12 des horaires identiques sans public commun ne créent aucun conflit public',() => {
  const conflicts = functional.detectPublicConflicts([
    { slotId:'a',definitionCode:'A',occurrenceNumber:1,sessionSequence:1,siteCode:'G1',date:'2027-03-02',startTime:'19:00',endTime:'21:00',publicCodes:['JSP-GEN'] },
    { slotId:'b',definitionCode:'B',occurrenceNumber:1,sessionSequence:1,siteCode:'C1',date:'2027-03-02',startTime:'19:00',endTime:'21:00',publicCodes:['DPS-G1'] }
  ]);
  assert.equal(conflicts.length,0);
});

test('13 la multi-sélection de publics est structurée, canonisée et sans doublon',() => {
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,durationMinutes:120 }],publicCodes:['jsp-gen','FLM-1','JSP-GEN'],windowStart:'2027-02-10',startTime:'19:00',endTime:'21:00' });
  assert.deepEqual(schedule.slots[0].publicCodes,['FLM-1','JSP-GEN']);
});

test('14 deux sites produisent deux créneaux liés à la même occurrence',() => {
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1','C1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,durationMinutes:120 }],publicCodes:['JSP-GEN'],windowStart:'2027-02-10',startTime:'19:00',endTime:'21:00' });
  assert.equal(schedule.slots.length,2);
  assert.deepEqual([...new Set(schedule.slots.map((row) => row.occurrenceNumber))],[1]);
  assert.deepEqual([...new Set(schedule.slots.map((row) => row.siteCode))],['C1','G1']);
  assert.equal(functional.detectPublicConflicts(schedule.slots).length,0);
});

test('15 la durée est recalculée exclusivement depuis le début et la fin',() => {
  assert.equal(functional.durationMinutes('19:00','21:00'),120);
  assert.equal(functional.durationMinutes('19:00','21:30'),150);
  assert.equal(functional.durationMinutes('21:00','19:00'),null);
});

test('16 un complément vide ou retiré ne laisse aucun séparateur parasite',() => {
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,'   '),'Exercice JSP 1');
  const withComplement = functional.scheduledActivityLabel('Exercice JSP',1,1,1,'Les bases');
  assert.equal(withComplement,'Exercice JSP 1 · Les bases');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,''),'Exercice JSP 1');
});

test('17 l’UI et le service persistent les références structurées puis les relisent',() => {
  const ui = read('assets/js/scope-ui.js');
  const service = read('netlify/lib/_scope-annual-catalog-service.js');
  assert.match(ui,/annual-activity-publics[^>]*multiple/);
  assert.match(ui,/annual-activity-sites[^>]*multiple/);
  assert.match(ui,/data-annual-slot-publics[^>]*multiple/);
  assert.doesNotMatch(ui,/id="annual-activity-publics"\s+placeholder=/);
  assert.match(service,/public_codes=\$10::text\[\]/);
  assert.match(service,/effective_public_codes/);
  assert.match(service,/scheduledActivityLabel/);
});

test('18 PR 1.1 à 1.6 est une seule définition active et six sessions générées',() => {
  const sql = read('database/migrations/20260925_scope_functional_catalog_c18.sql');
  assert.match(sql,/values \('PR-EXERCICE-1','Exercice PR'/);
  assert.match(sql,/cross join generate_series\(1,6\) sequence/);
  assert.match(sql,/label ~ '\^Exercice PR 1\\\.\[1-6\]\$'/);
  assert.match(sql,/set status='ARCHIVE'[\s\S]*targetCode":"PR-EXERCICE-1/);
});

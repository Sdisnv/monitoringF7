'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const L = require('../assets/js/scope-ui-logic');
const refs = require('../netlify/lib/_scope-quo-vadis-referentials');
const planner = require('../netlify/lib/_scope-qv-publication-plan');

function row(overrides = {}) {
  return { id: 'CODIR:1', definitionId: 'CODIR', label: 'Seance Codir', domain: 'CMDT',
    statCom: '070F1', ecawinActivityCode: 'EXERCI', responsible: 'Presidente Codir',
    publics: ['CMDT:CODIR'], ois: ['SDIS'], startsAt: '2027-02-01T18:00',
    endsAt: '2027-02-01T20:00', ...overrides };
}

test('publics permanents exacts et tries; codes historiques conserves', () => {
  const groups = L.qvProgrammePublicCatalogue();
  const labels = group => groups.find(item => item.group === group).items.map(item => item[1]);
  for (const label of ['CDT', 'C op', 'C log', 'C for', 'QM']) assert.ok(labels('Commandement').includes(label));
  for (const label of ['C PR', 'Formateur PR']) assert.ok(labels('PR').includes(label));
  for (const label of ['Of auto', 'Formateur C1/118', 'Moniteur conduite']) assert.ok(labels('AUTO').includes(label));
  for (const group of groups) assert.deepEqual(group.items.map(item => item[1]), group.items.map(item => item[1]).sort((a,b) => a.localeCompare(b,'fr')));
  const codes = groups.flatMap(group => group.items.map(item => item[0]));
  assert.equal(codes.length, new Set(codes).size);
  for (const code of ['PR:FORMATEURS', 'AUTO:FORM-C1', 'AUTO:MONITEURS', 'CMDT:CODIR']) assert.ok(codes.includes(code));
  assert.equal(L.qvProgrammePublicLabel('PR:FORMATEURS'), 'Formateurs PR');
});

test('C scrt reste le code historique; C sct est le libelle propose', () => {
  assert.ok(refs.RESPONSIBLE_FUNCTIONS.includes('C scrt'));
  assert.ok(!refs.RESPONSIBLE_FUNCTIONS.includes('C sct'));
  assert.equal(refs.responsibleFunctionLabel('C scrt'), 'C sct');
  assert.equal(refs.responsibleFunctionLabel('Presidente Codir'), 'Presidente Codir');
  assert.equal(refs.responsibleFunctionLabel('Pr\u00e9sidente Codir'), 'Pr\u00e9sidentE Codir');
  assert.equal(L.qvResponsableCanonique('C scrt'), 'C sct');
  assert.equal(L.qvResponsableCanonique('C scrt', {domain:'DPS'}), 'Chef section DPS');
});

test('exports exacts avec theme et suffixe sans mutation', () => {
  const source = { activite: 'Exercice PR 1.1', themes: ['Base', '', '   '], code:'011PR.001',statCom:'011PR' };
  const before = JSON.stringify(source);
  assert.equal(L.qvProgrammeExportActivity(source,'pdf'), 'Exercice PR 1.1\nBase');
  assert.equal(L.qvProgrammeExportActivity(source,'excel'), 'Exercice PR 1.1 - Base');
  assert.equal(L.qvProgrammeExportActivity({...source,themes:[]},'pdf'), 'Exercice PR 1.1');
  assert.equal(L.qvProgrammeExportActivity({...source,themes:[]},'excel'), 'Exercice PR 1.1');
  assert.equal(L.qvProgrammeExportActivity({eventDisplayLabel:'Seance Codir.2',label:'Seance Codir',themes:['Budget']},'excel'), 'Seance Codir.2 - Budget');
  assert.equal(L.qvProgrammeExportActivity({...source,themes:['Base','Consolidation']},'excel'), 'Exercice PR 1.1 - Base · Consolidation');
  assert.equal(L.qvProgrammeExportActivity({...source,themes:['Base','Consolidation']},'pdf'), 'Exercice PR 1.1\nBase · Consolidation');
  assert.equal(JSON.stringify(source),before);
});

test('contrat UI defaults/prefill, consensus, copies editables et provenance', () => {
  const qv = { canonicalProgramme:{rows:[row(),row({id:'CODIR:2', startsAt:'2028-01-28T19:00'})]},
    responsableFonctions:[{code:'Presidente Codir',libelle:'PresidentE Codir'}] };
  const before=JSON.stringify(qv);
  const [type]=L.qvProgrammeActivityTypes(qv);
  assert.equal(type.id,'CODIR');
  assert.equal(type.defaults.activityLabel,'Seance Codir');
  assert.equal(type.defaults.domain,'F1');
  assert.deepEqual(type.defaults.responsibleSelections,[{kind:'REFERENCE',code:'Presidente Codir',label:'PresidentE Codir'}]);
  assert.deepEqual(type.prefill,type.defaults);
  assert.deepEqual(type.provenance.statCom.sourceIds,['CODIR:1','CODIR:2']);
  for (const field of ['date','startsAt','endsAt','businessCode','code','occurrenceId','nip']) assert.ok(!(field in type.defaults));
  type.defaults.publicCodes.push('FREE-EDIT');
  assert.deepEqual(type.prefill.publicCodes,['CMDT:CODIR']);
  assert.equal(JSON.stringify(qv),before);
});

test('variantes DPS conservees par site et Stat.Com; ordre stable et pas de duplication', () => {
  const rows=['G1','C1','B1','B2'].map(site => row({id:`DPS:${site}`,definitionId:'DPS-EX',label:'Exercice DPS',
    domain:'DPS',programmeDomain:'F7',ois:[site],statCom:`012${site}`,responsible:'C scrt',publics:['N01']}));
  const qv={canonicalProgramme:{rows},responsableFonctions:[{code:'C scrt',libelle:'C sct'}]};
  const types=L.qvProgrammeActivityTypes(qv);
  assert.equal(types.length,4);
  for (const type of types) {
    assert.equal(type.defaults.statCom,`012${type.site}`);
    assert.equal(type.defaults.domain,'F7');
    assert.equal(type.group,'DPS');
    assert.equal(type.siteCode,type.site);
    assert.deepEqual(type.defaults.oiCodes,[`DPS:${type.site}`]);
    assert.deepEqual(type.defaults.responsibleSelections,[{kind:'REFERENCE',code:'C scrt',label:'C sct'}]);
    assert.equal(type.siteVariants.length,4);
  }
  assert.deepEqual(L.qvProgrammeActivityTypes({...qv,canonicalProgramme:{rows:rows.slice().reverse()}}),types);
});

test('champs divergents ou absents omis; aucune union des publics et OI', () => {
  const [type]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[row(),row({id:'CODIR:2',statCom:'OTHER',publics:['CMDT:CDT'],ecawinActivityCode:''})]}});
  assert.ok(type.ambiguity.includes('statCom'));
  assert.ok(type.ambiguity.includes('publicCodes'));
  assert.ok(type.missing.includes('ecawinActivityCode'));
  for (const field of ['statCom','publicCodes','ecawinActivityCode']) assert.ok(!(field in type.defaults));
  const [unknown]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[row({ois:['INCONNU']})]}});
  assert.ok(unknown.missing.includes('oiCodes'));
});

test('les creations manuelles ne creent pas de type et ne changent aucun consensus canonique', () => {
  const qv={canonicalProgramme:{rows:[row()]}};
  const expected=L.qvProgrammeActivityTypes(qv);
  for (const manual of [
    row({id:'MANUAL:1',manualCreation:true,label:'Human override',statCom:'OTHER',publics:['PR:2'],ois:['DPS:B2']}),
    row({id:'MANUAL:2',provenance:'MANUAL_2027',definitionId:'ADHOC',label:'Type libre',statCom:'OTHER'})
  ]) assert.deepEqual(L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[...qv.canonicalProgramme.rows,manual]}}),expected);
});

test('domaine fonctionnel historique ou canonique uniquement, variantes independantes de F7', () => {
  const source=row({domain:'PR',statCom:'011PR',historicalProposal:{sourceLine:241}});
  const [historical]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[source]},historicalAgenda2026:{references:[{sourceLine:241,domainF7:'F7'}]}});
  assert.equal(historical.defaults.domain,'F7');
  assert.equal(historical.group,'PR');
  const [canonical]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[source]},types:[{definitionId:'CODIR',metadata:{canonicalRule:{businessDomain:'F3'}}}]});
  assert.equal(canonical.defaults.domain,'F3');
  const [unknown]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[source]}});
  assert.ok(!Object.prototype.hasOwnProperty.call(unknown.defaults,'domain'));
  assert.ok(unknown.missing.includes('domain'));
});

test('types canoniques existants, references ECAWIN et responsables multiples/libres', () => {
  const selections=[{kind:'REFERENCE',code:'C scrt',label:'Ancien libelle conserve'},{kind:'FREE',label:'Responsable historique'}];
  const [type]=L.qvProgrammeActivityTypes({catalogue:[{definitionId:'CODIR',label:'Seance canonique'}],
    canonicalProgramme:{rows:[row({responsibleSelections:selections,ecawinActivityCode:undefined})]}});
  assert.equal(type.defaults.activityLabel,'Seance canonique');
  assert.deepEqual(type.defaults.responsibleSelections,selections);
  const source=row(); delete source.ecawinActivityCode;
  const [mapped]=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[source]},ecawinReferential:{associations:[{statCom:'070F1',activityCode:'EXERCI'}]}});
  assert.equal(mapped.defaults.ecawinActivityCode,'EXERCI');
  assert.deepEqual(L.qvProgrammeActivityTypes({canonicalProgramme:{rows:[row({external:true})]}}),[]);
});

test('planner: toutes les fonctions descriptives exclues des relations de population', () => {
  const descriptive=L.qvProgrammeDescriptivePublics();
  const item={year:2027,status:'VALIDATED',referencesValidated:true,label:'Exercice PR',
    source:{definitionId:'PR',occurrenceId:'PR:1',sessionId:'PR:1:1'},schedule:{startsAt:'2027-03-01T18:00',endsAt:'2027-03-01T21:00'},
    business:{statComCode:'011PR',businessCode:'011PR.001'},classification:{primaryDomain:'PR',publicCodes:[...Object.keys(descriptive),'PR:2'],oiCodes:[]}};
  const plan=planner.buildPublicationPlan({year:2027,programme:[item],referentials:{domains:['PR'],publics:['PR:2'],statComCodes:['011PR']},targetSnapshot:[]});
  const entry=plan.decisions[0];
  assert.equal(entry.action,'CREATE');
  assert.deepEqual(entry.target.relations.publicCodes,['PR:2']);
  assert.equal(entry.target.event.descriptivePublics.length,Object.keys(descriptive).length);
});

test('UMD navigateur expose les deux APIs sans module CommonJS', () => {
  const context={};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../assets/js/scope-ui-logic'),'utf8'),context);
  assert.equal(typeof context.ScopeUiLogic.qvProgrammeActivityTypes,'function');
  assert.equal(context.ScopeUiLogic.qvProgrammeExportActivity({activite:'Seance.2',themes:['Theme']},'pdf'),'Seance.2\nTheme');
});

test('planner: externe historique hors SCOPE ne cree aucun evenement ni population', () => {
  const item={year:2027,externalHistorical:true,externalActivity:true,status:'VALIDATED',referencesValidated:true,
    business:{},classification:{primaryDomain:'F7',publicCodes:['GEN:SAPEUR']}};
  const plan=planner.buildPublicationPlan({year:2027,programme:[item],targetSnapshot:[]});
  assert.equal(plan.decisions[0].action,'NOT_PUBLISHED');
  assert.equal(plan.decisions[0].target,null);
});

test('planner: activite SCOPE non evaluee reste publiable avec flag false', () => {
  const item={year:2027,status:'VALIDATED',referencesValidated:true,participationEvaluation:false,label:'Exercice',
    source:{definitionId:'PR',occurrenceId:'PR:1',sessionId:'PR:1:1'},schedule:{startsAt:'2027-03-01T18:00',endsAt:'2027-03-01T21:00'},
    business:{statComCode:'011PR',businessCode:'011PR.001'},classification:{primaryDomain:'F7',publicCodes:['PR:2']}};
  const plan=planner.buildPublicationPlan({year:2027,programme:[item],referentials:{domains:['F7'],publics:['PR:2'],statComCodes:['011PR']},targetSnapshot:[]});
  assert.equal(plan.decisions[0].action,'CREATE');
  assert.equal(plan.decisions[0].target.event.participationEvaluation,false);
  assert.deepEqual(plan.decisions[0].target.relations.publicCodes,['PR:2']);
});

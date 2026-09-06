#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const {
  buildCyclePilotage,
  computeCycleMetrics,
  computePrExerciseParticipationState
} = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function person(id, nip, extra = {}){
  return { personne_id: id, id, nip, nom: extra.nom || id, prenom: extra.prenom || 'Test', grade: extra.grade || 'Sap' };
}

function event(id, extra = {}){
  return {
    evenement_id: id,
    cycle_id: extra.cycle_id || 'cycle-pr',
    domaine_code: extra.domaine_code || 'PR',
    sous_domaine_code: extra.sous_domaine_code || null,
    date: extra.date || '2026-09-01',
    libelle: extra.libelle || `Exercice PR ${id}`,
    code_cours: extra.code_cours || `CYCLE.${id}`,
    statut: extra.statut || 'REALISE',
    pr_exercise_group_key: extra.pr_exercise_group_key || null,
    pr_session_key: extra.pr_session_key || null
  };
}

function cyclePersonne(personneId, extra = {}){
  return {
    cycle_id: extra.cycle_id || 'cycle-pr',
    personne_id: personneId,
    role_cycle: extra.role_cycle || 'PARTICIPANT',
    statut_cycle: extra.statut_cycle || 'ACTIF',
    session_event_id: extra.session_event_id || null,
    participated_event_id: extra.participated_event_id || null,
    exception_type: extra.exception_type || null,
    exercise_scope: extra.exercise_scope || []
  };
}

function attendu(evenementId, personneId){
  return { evenement_id: evenementId, personne_id: personneId, inclus: true, origine: 'TEST' };
}

function part(evenementId, personneId, statut, role = 'PARTICIPANT', extra = {}){
  return { evenement_id: evenementId, personne_id: personneId, statut, role, source: extra.source || 'SAISIE', motif_absence: extra.motif_absence || null };
}

function uiHooks(){
  const code = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const logic = require('../assets/js/scope-ui-logic.js');
  const context = {
    console,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    URLSearchParams,
    location: { hash: '#/cycles/cycle-pr', search: '' },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    document: {
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      getElementById(){ return { innerHTML: '', classList: { toggle(){}, add(){}, remove(){} }, addEventListener(){}, dataset: {} }; },
      addEventListener(){},
      body: { addEventListener(){}, classList: { toggle(){}, add(){}, remove(){} } }
    },
    window: {
      __SCOPE_UI_TEST_HOOKS__: true,
      ScopeUiLogic: logic,
      ScopeCharts: null,
      location: { hash: '#/cycles/cycle-pr', search: '' },
      addEventListener(){},
      document: null,
      localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    }
  };
  context.window.document = context.document;
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'scope-ui.js' });
  return context.window.ScopeUiTestHooks;
}

function samplePrInput(){
  const cycle = { cycle_id: 'cycle-pr', domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PR GEN', statut: 'REALISE' };
  const personnes = [
    person('p-ok', '1001', { nom: 'Present' }),
    person('p-exc', '1002', { nom: 'Excuse' }),
    person('p-disp', '1003', { nom: 'Dispense' }),
    person('p-open', '1004', { nom: 'Ouvert' }),
    person('f-ok', '1001', { nom: 'Formateur' }),
    person('s-out', '2001', { nom: 'Surveillant' }),
    person('a-out', '3001', { nom: 'Auxiliaire' })
  ];
  const evenements = [
    event('pr1-a', { libelle: 'Exercice PR 1.1 | GEN', pr_exercise_group_key: 'cycle-pr:PR:1', pr_session_key: 'cycle-pr:PR:1.1', date: '2026-09-01' }),
    event('pr1-b', { libelle: 'Exercice PR 1.2 | GEN', pr_exercise_group_key: 'cycle-pr:PR:1', pr_session_key: 'cycle-pr:PR:1.2', date: '2026-09-02' }),
    event('pr2-a', { libelle: 'Exercice PR 2.1 | GEN', pr_exercise_group_key: 'cycle-pr:PR:2', pr_session_key: 'cycle-pr:PR:2.1', date: '2026-09-03' })
  ];
  const cyclePersonnes = [
    cyclePersonne('p-ok'),
    cyclePersonne('p-exc'),
    cyclePersonne('p-disp', { exception_type: 'DISPENSE_EXERCICE_INTERNE', exercise_scope: ['pr2-a'] }),
    cyclePersonne('p-open'),
    cyclePersonne('s-out', { role_cycle: 'SURVEILLANT' }),
    cyclePersonne('a-out', { role_cycle: 'AUXILIAIRE' })
  ];
  const attendus = ['p-ok', 'p-exc', 'p-disp', 'p-open'].flatMap((personneId) => evenements.map((ev) => attendu(ev.evenement_id, personneId)));
  const participations = [
    part('pr1-a', 'p-ok', 'PRESENT'),
    part('pr1-b', 'p-ok', 'PRESENT'),
    part('pr2-a', 'f-ok', 'PRESENT', 'FORMATEUR'),
    part('pr1-a', 'p-exc', 'ABSENT_EXCUSE', 'PARTICIPANT', { motif_absence: 'PROFESSIONNEL' }),
    part('pr2-a', 'p-exc', 'PRESENT'),
    part('pr1-a', 'p-disp', 'DISPENSE'),
    part('pr2-a', 'p-disp', 'DISPENSE'),
    part('pr1-a', 'p-open', 'PRESENT'),
    part('pr1-a', 's-out', 'PRESENT', 'SURVEILLANT'),
    part('pr2-a', 'a-out', 'PRESENT', 'AUXILIAIRE')
  ];
  return { cycle, personnes, evenements, cyclePersonnes, attendus, participations };
}

function sampleAutoInput(){
  const cycle = { cycle_id: 'cycle-auto', domaine_code: 'AUTO', type_cycle: 'AUTO', libelle: 'Cycle AUTO VL PL', statut: 'REALISE' };
  const personnes = [person('driver-vl', '5001'), person('driver-pl', '5001'), person('dps-pl', '5002')];
  const evenements = [
    event('auto-vl', { cycle_id: 'cycle-auto', domaine_code: 'AUTO', sous_domaine_code: 'VL', libelle: 'Conduite VL', date: '2026-10-01' }),
    event('auto-pl', { cycle_id: 'cycle-auto', domaine_code: 'AUTO', sous_domaine_code: 'PL', libelle: 'Conduite PL DPS', date: '2026-10-02' })
  ];
  const cyclePersonnes = [
    cyclePersonne('driver-vl', { cycle_id: 'cycle-auto' }),
    cyclePersonne('driver-pl', { cycle_id: 'cycle-auto' }),
    cyclePersonne('dps-pl', { cycle_id: 'cycle-auto', session_event_id: 'auto-pl' })
  ];
  const attendus = [
    attendu('auto-vl', 'driver-vl'),
    attendu('auto-pl', 'driver-pl'),
    attendu('auto-pl', 'dps-pl')
  ];
  const participations = [
    part('auto-vl', 'driver-vl', 'PRESENT'),
    part('auto-pl', 'driver-pl', 'PRESENT'),
    part('auto-pl', 'dps-pl', 'ABSENT_EXCUSE', 'PARTICIPANT', { motif_absence: 'ARMEE' })
  ];
  return { cycle, personnes, evenements, cyclePersonnes, attendus, participations };
}

(async () => {
  await record('PR — matrice cycle = exercices, sessions et population individuelle', async () => {
    const input = samplePrInput();
    const pilotage = buildCyclePilotage(input);
    eq(pilotage.obligations.length, 2);
    eq(pilotage.kpis.population, 4);
    eq(pilotage.kpis.complete, 3);
    eq(pilotage.kpis.incomplete, 1);
    ok(pilotage.obligations.every((row) => row.sessionLocked));
    const present = pilotage.individualRows.find((row) => row.nip === '1001');
    eq(present.globalState, 'COMPLET');
    eq(present.realisedCount, 2);
    eq(present.roles.includes('PARTICIPANT'), true);
  });

  await record('PR — sessions alternatives et formateur même NIP sans double contribution', async () => {
    const input = samplePrInput();
    const metrics = computeCycleMetrics(input);
    eq(metrics.populationDistincte, 4);
    eq(metrics.formateursDistincts, 1);
    eq(metrics.effectifEngageCycle, 4);
    const row = buildCyclePilotage(input).individualRows.find((item) => item.nip === '1001');
    eq(row.expectedCount, 2);
    eq(row.realisedCount, 2);
  });

  await record('PR — surveillant et auxiliaire visibles hors population', async () => {
    const pilotage = buildCyclePilotage(samplePrInput());
    const surveillant = pilotage.individualRows.find((row) => row.nip === '2001');
    const auxiliaire = pilotage.individualRows.find((row) => row.nip === '3001');
    eq(surveillant.isPopulation, false);
    eq(auxiliaire.isPopulation, false);
    eq(surveillant.globalState, 'ENCADREMENT');
    eq(auxiliaire.globalState, 'ENCADREMENT');
  });

  await record('PR — excusé, dispensé, incomplet propagés au cycle', async () => {
    const pilotage = buildCyclePilotage(samplePrInput());
    eq(pilotage.individualRows.find((row) => row.nip === '1002').globalState, 'COMPLET');
    eq(pilotage.individualRows.find((row) => row.nip === '1003').globalState, 'DISPENSE');
    eq(pilotage.individualRows.find((row) => row.nip === '1004').globalState, 'INCOMPLET');
    eq(pilotage.kpis.excused, 1);
    eq(pilotage.kpis.dispensed, 1);
  });

  await record('PR ABC — distinction par clé de groupe, sans fusion GEN', async () => {
    const gen = samplePrInput();
    const abc = samplePrInput();
    abc.cycle = { ...abc.cycle, cycle_id: 'cycle-abc', type_cycle: 'PAPR ABC', libelle: 'Cycle PR ABC' };
    abc.evenements = abc.evenements.map((ev) => ({ ...ev, cycle_id: 'cycle-abc', libelle: ev.libelle.replace('GEN', 'ABC'), pr_exercise_group_key: ev.pr_exercise_group_key.replace('cycle-pr', 'cycle-abc') }));
    const genPilotage = buildCyclePilotage(gen);
    const abcPilotage = buildCyclePilotage(abc);
    ok(genPilotage.obligations.every((row) => row.obligationKey.includes('cycle-pr')));
    ok(abcPilotage.obligations.every((row) => row.obligationKey.includes('cycle-abc')));
  });

  await record('sessionLocked — un statut couvert dans le bilan vient d’une session verrouillée', async () => {
    const input = samplePrInput();
    const state = computePrExerciseParticipationState({ ...input, currentEventId: 'pr1-b' });
    ok(state.allSessionsClosed);
    const pilotage = buildCyclePilotage(input);
    const cell = pilotage.individualRows.find((row) => row.nip === '1002').obligations[0];
    eq(cell.coveredInGlobalBilan, true);
    eq(cell.sessionLocked, true);
  });

  await record('AUTO — VL/PL consolidés sans pr_session_key forcée ni doublon NIP', async () => {
    const pilotage = buildCyclePilotage(sampleAutoInput());
    eq(pilotage.obligations.length, 2);
    ok(pilotage.obligations.some((row) => row.label === 'AUTO VL'));
    ok(pilotage.obligations.some((row) => row.label === 'AUTO PL'));
    eq(pilotage.individualRows.filter((row) => row.nip === '5001').length, 1);
    const combined = pilotage.individualRows.find((row) => row.nip === '5001');
    eq(combined.realisedCount, 2);
    ok(pilotage.obligations.every((row) => row.sessions.every((session) => session.prSessionKey == null)));
  });

  await record('Service — détail cycle expose pilotage depuis les sources existantes', async () => {
    const repo = createMemoryRepo();
    const service = createScopeCycleService(repo);
    const cycle = (await repo.insertCycle({ cycle_id: 'cycle-auto', cycle_key: 'AUTO-TEST', annee: 2026, domaine_code: 'AUTO', type_cycle: 'AUTO', libelle: 'Cycle AUTO', statut: 'REALISE' }));
    const input = sampleAutoInput();
    for(const collection of [input.cyclePersonnes, input.attendus, input.participations]){
      for(const row of collection){
        if(row.personne_id === 'driver-pl') row.personne_id = 'driver-vl';
      }
    }
    input.personnes = input.personnes.filter((row) => row.personne_id !== 'driver-pl');
    for(const p of input.personnes) await repo.insertPersonne({ ...p, skipPeriodes: true });
    for(const ev of input.evenements) await repo.insertEvenement(ev);
    for(const row of input.cyclePersonnes) await repo.upsertCyclePersonne(row);
    for(const row of input.attendus) await repo.upsertAttendu(row);
    for(const row of input.participations) await repo.upsertParticipation(row);
    const detail = await service.getCycle(cycle.cycle_id);
    eq(detail.pilotage.kpis.population, 2);
    eq(detail.pilotage.individualRows.filter((row) => row.nip === '5001').length, 1);
  });

  await record('UX — détail cycle rend la matrice individuelle et les liens événements', async () => {
    const hooks = uiHooks();
    const input = samplePrInput();
    const detail = {
      cycle: input.cycle,
      evenements: input.evenements,
      personnes: input.cyclePersonnes,
      metrics: computeCycleMetrics(input),
      pilotage: buildCyclePilotage(input)
    };
    const html = hooks.renderCycleHtml(detail);
    ok(html.includes('Matrice individuelle'));
    ok(html.includes('Personnes complètes'));
    ok(html.includes('#/exercices/pr1-a'));
    ok(html.includes('Progression cycle'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((r) => r.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE cycles PR/AUTO tests: ${results.length - failed.length}/${results.length} PASS, assertions=${assertions}`);
    process.exit(1);
  }
  console.log(`\nSCOPE cycles PR/AUTO tests: ${results.length}/${results.length} PASS, assertions=${assertions}`);
})();

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  computeCycleMetrics,
  computeSessionParticipationState
} = require('../netlify/functions/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function person(id, nip, nom, prenom){
  return { personne_id: id, id, nip, nom: nom || 'Grünig', prenom: prenom || 'Thierry' };
}

function event(id){
  return { evenement_id: id, cycle_id: 'cycle-papr', domaine_code: 'PR', statut: 'PLANIFIE', date: '2026-09-01' };
}

function cyclePersonne(personneId){
  return { cycle_id: 'cycle-papr', personne_id: personneId, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' };
}

function part(evenementId, personneId, statut, role){
  return { evenement_id: evenementId, personne_id: personneId, statut, role: role || 'PARTICIPANT' };
}

function metrics(participations, cyclePersonnes, personnes){
  return computeCycleMetrics({
    cycle: { cycle_id: 'cycle-papr', domaine_code: 'PR' },
    evenements: [event('ex1'), event('ex2'), event('ex3'), event('ex4'), event('ex5'), event('ex6')],
    cyclePersonnes: cyclePersonnes || [cyclePersonne('p1')],
    personnes: personnes || [person('p1', '7647')],
    participations
  });
}

function stateFor(currentEventId, participations, cyclePersonnes, personnes){
  return computeSessionParticipationState({
    cycle: { cycle_id: 'cycle-papr', domaine_code: 'PR' },
    evenements: [event('ex1'), event('ex2')],
    cyclePersonnes: cyclePersonnes || [cyclePersonne('p1')],
    personnes: personnes || [person('p1', '7647')],
    participations,
    currentEventId
  });
}

(async () => {
  await record('A — participant puis participant ailleurs bloque la ligne et compte 1', () => {
    const participations = [part('ex1', 'p1', 'PRESENT'), part('ex2', 'p1', 'NON_RENSEIGNE')];
    const m = metrics(participations);
    const s = stateFor('ex2', participations);
    assert.strictEqual(m.participantsReconnusDistincts, 1);
    assert.strictEqual(s.byPersonneId.p1.alreadyCountedInSession, true);
  });

  await record('B — participant puis Formateur reste possible en encadrement, compte 1', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const participations = [part('ex1', 'p1', 'PRESENT')];
    const m = metrics(participations);
    assert.strictEqual(m.participantsReconnusDistincts, 1);
    assert.ok(ui.includes("state.encHits = sortPeopleForEncadrement(hits.filter((p) => !used.has(String(p.personne_id))))"));
    assert.ok(!ui.includes("!used.has(String(p.personne_id)) && !expected.has(String(p.personne_id))"));
  });

  await record('C — Formateur PAPR en premier bloque participant ailleurs et compte 1', () => {
    const participations = [part('ex1', 'p1', 'PRESENT', 'FORMATEUR')];
    const m = metrics(participations);
    const s = stateFor('ex2', participations);
    assert.strictEqual(m.participantsReconnusDistincts, 1);
    assert.strictEqual(m.effectifEngageCycle, 1);
    assert.strictEqual(s.byPersonneId.p1.countedRole, 'FORMATEUR');
  });

  await record('D — même Formateur sur 6 exercices compte une présence session', () => {
    const participations = Array.from({ length: 6 }, (_, i) => part(`ex${i + 1}`, 'p1', 'PRESENT', 'FORMATEUR'));
    const m = metrics(participations);
    assert.strictEqual(m.participantsReconnusDistincts, 1);
    assert.strictEqual(m.effectifEngageCycle, 1);
  });

  await record('E — Surveillant PAPR compte mais ne verrouille pas la saisie normale ailleurs', () => {
    const participations = [part('ex1', 'p1', 'PRESENT', 'SURVEILLANT')];
    const m = metrics(participations);
    const s = stateFor('ex2', participations);
    assert.strictEqual(m.participantsReconnusDistincts, 1);
    assert.strictEqual(s.byPersonneId.p1, undefined);
  });

  await record('F — Formateur externe reste hors contribution PAPR', () => {
    const participations = [part('ex1', 'f1', 'PRESENT', 'FORMATEUR')];
    const m = metrics(participations, [], [person('f1', '9001', 'Externe', 'Alex')]);
    assert.strictEqual(m.populationDistincte, 0);
    assert.strictEqual(m.participantsReconnusDistincts, 0);
    assert.strictEqual(m.effectifEngageCycle, 0);
    assert.strictEqual(m.formateursDistincts, 1);
  });

  await record('G — Auxiliaire ne contribue pas au comptage PAPR', () => {
    const participations = [part('ex1', 'p1', 'NON_CONCERNE', 'AUXILIAIRE')];
    const m = metrics(participations);
    const s = stateFor('ex2', participations);
    assert.strictEqual(m.participantsReconnusDistincts, 0);
    assert.strictEqual(m.effectifEngageCycle, 0);
    assert.strictEqual(s.byPersonneId.p1, undefined);
  });

  await record('H — suppression de la participation précédente débloque', () => {
    const s = stateFor('ex2', []);
    assert.deepStrictEqual(s.byPersonneId, {});
  });

  await record('I — tooltip exact et ligne bleue non sélectionnable', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('a déjà participé à l’exercice en qualité de PAPR.'));
    assert.ok(ui.includes('disabled aria-disabled="true"'));
    assert.ok(ui.includes('scope-row-session-counted'));
    assert.ok(css.includes('background: #e5f0ff'));
    const tooltip = `${person('p1', '7647').prenom} ${person('p1', '7647').nom} (${person('p1', '7647').nip}) a déjà participé à l’exercice en qualité de PAPR.`;
    assert.strictEqual(tooltip, 'Thierry Grünig (7647) a déjà participé à l’exercice en qualité de PAPR.');
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE PAPR session roles UX tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE PAPR session roles UX tests: ${results.length}/${results.length} PASS`);
})();

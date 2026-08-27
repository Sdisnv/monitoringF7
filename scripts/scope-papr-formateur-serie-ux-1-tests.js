#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function setupPr(count = 4){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-ux',
    cycle_key: 'PAPR-UX',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR UX'
  });
  const person = await repo.insertPersonne({ personne_id: 'p-formateur', nip: '1506', nom: 'Cerqueira', prenom: 'Marco', grade: 'Sgt', skipPeriodes: true });
  for(let i = 1; i <= count; i += 1){
    const ev = await repo.insertEvenement({
      evenement_id: `pr-ux-${i}`,
      cycle_id: 'cycle-pr-ux',
      domaine_code: 'PR',
      date: `2026-10-0${i}`,
      libelle: `Exercice PR 2.${i}`,
      code_cours: `PAPR.PR2.${i}`,
      mode_suivi: 'NOMINATIF',
      statut: 'PLANIFIE',
      population_figee: true,
      pr_exercise_group_key: 'cycle-pr-ux:PR:2',
      pr_session_key: `cycle-pr-ux:PR:2.${i}`,
      pr_session_label: `2.${i}`
    });
    await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-ux', personne_id: person.personne_id, role_cycle: 'PARTICIPANT' });
    await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: person.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
  }
  return { repo, service };
}

(async () => {
  await record('A — switch UX remplace la grosse checkbox', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('Formateur pour toute la série'));
    assert.ok(!ui.includes('Fait toute la série'));
    assert.ok(!ui.includes('class="scope-inline-check"'));
    assert.ok(!ui.includes('id="enc-serie-complete" type="checkbox"'));
    assert.ok(ui.includes('role="switch"'));
    assert.ok(ui.includes('aria-checked="${state.encSerieComplete ? \'true\' : \'false\'}"'));
    assert.ok(css.includes('.scope-serie-toggle'));
    assert.ok(css.includes('.scope-switch-track'));
    assert.ok(css.includes('.scope-switch-thumb'));
  });

  await record('B — descriptif et portée dynamique visibles en ON', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Ajoute automatiquement ce formateur à toutes les sessions de cette série PR.'));
    assert.ok(ui.includes('Toute la série — sessions PR ${formatted}'));
    assert.ok(ui.includes('prSeriesScopeText(fiche)'));
    assert.ok(!ui.includes('1.1 à 1.6'));
  });

  await record('C — affichage limité à Formateur et première session x.1', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes("state.encRole === 'FORMATEUR' && isFirstPrSession(fiche)"));
    assert.ok(ui.includes("if (state.encRole !== 'FORMATEUR') state.encSerieComplete = false;"));
  });

  await record('D — OFF/ON transmet serieComplete false/true sans nouveau backend', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes("const serieComplete = role === 'FORMATEUR' && state.encSerieComplete && isFirstPrSession(state.fiche);"));
    assert.ok(ui.includes('await client.ajouterEncadrement(id, { personneId, role, serieComplete }, state.fiche.evenement.version);'));
    assert.ok(!ui.includes('client.ajouterEncadrementSerie'));
  });

  await record('E — portée série réelle exposée depuis les sessions PR', async () => {
    const ctx = await setupPr(4);
    const detail = await ctx.service.lireEvenement('pr-ux-1');
    assert.deepStrictEqual(detail.prExerciseParticipation.sessionLabels, ['2.1', '2.2', '2.3', '2.4']);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE-PAPR-FORMATEUR-SERIE-UX-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PAPR-FORMATEUR-SERIE-UX-1 tests: ${results.length}/${results.length} PASS`);
})();

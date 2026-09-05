#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { computeCycleMetrics } = require('../netlify/lib/_scope-cycle-rules');
const { computeTaux } = require('../netlify/lib/_scope-rules');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function person(id, nip){
  return { id, personne_id: id, nip, nom: `Nom${id}`, prenom: `Prenom${id}` };
}

function event(id, extra){
  return Object.assign({ evenement_id: id, cycle_id: 'cycle-1', domaine_code: 'PR', date: '2026-09-01', code_cours: `PAPR.${id}`, statut: 'PLANIFIE' }, extra || {});
}

function cyclePersonne(personneId, role, extra){
  return Object.assign({ cycle_id: 'cycle-1', personne_id: personneId, role_cycle: role || 'PARTICIPANT', statut_cycle: 'ACTIF' }, extra || {});
}

function part(evenementId, personneId, statut, role){
  return { evenement_id: evenementId, personne_id: personneId, statut, role: role || 'PARTICIPANT' };
}

function tauxRows(prefix, count, statut){
  return Array.from({ length: count }, (_, i) => ({ personne_id: `${prefix}${i + 1}`, statut: statut || 'NON_RENSEIGNE', role: 'PARTICIPANT' }));
}

async function expectHttpError(fn, status, error){
  try{
    await fn();
    assert.fail(`Erreur ${status}/${error} attendue`);
  }catch(err){
    assert.strictEqual(err.status, status);
    assert.strictEqual(err.error, error);
  }
}

(async () => {
  await record('API — cycles exposés sous /api/scope sans accès PostgreSQL frontend direct', async () => {
    const scope = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(scope.includes("path === '/cycles'"));
    assert.ok(scope.includes("path === '/cycles/proposer'"));
    assert.ok(scope.includes("match(path, '/cycles/:id')"));
    assert.ok(scope.includes("match(path, '/cycles/:id/personnes')"));
    for(const method of ['listCycles', 'getCycle', 'createCycle', 'patchCycle', 'attachCycleEvent', 'detachCycleEvent', 'upsertCyclePersonne', 'removeCyclePersonne', 'proposeCycle']){
      assert.ok(api.includes(`${method}(`), method);
    }
    assert.ok(ui.includes('renderCycles()'));
    assert.ok(ui.includes('renderCycle()'));
    assert.ok(!/new\s+Client\(|postgres:\/\/|SCOPE_DATABASE_URL/.test(ui));
  });

  await record('UX — navigation et routes cycles intégrées', async () => {
    const logic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    assert.ok(logic.includes("id: 'cycles'"));
    assert.ok(logic.includes("screen: 'cycles'"));
    assert.ok(logic.includes("screen: 'cycle'"));
  });

  await record('Service — créer, lister, rattacher et relire un cycle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeCycleService(repo);
    const cycleDetail = await service.createCycle({ cycleKey: 'PAPR-2026-A', annee: 2026, domaineCode: 'PAPR', typeCycle: 'PAPR', libelle: 'PAPR annuel', statCom: '01522F7', qui: 'PR' });
    const cycle = cycleDetail.cycle;
    const ev = await repo.insertEvenement({ evenement_id: 'ev-papr-1', date: '2026-09-01', domaine_code: 'PR', libelle: 'PAPR session 1', code_cours: '01522F7PAPR.241', mode_suivi: 'NOMINATIF' });
    await service.attachEvent(cycle.cycle_id, { evenementId: ev.evenement_id });
    const list = await service.listCycles({ annee: 2026, domaine: 'PR' });
    assert.strictEqual(list.cycles.length, 1);
    assert.strictEqual(list.cycles[0].eventCount, 1);
    const reread = await service.getCycle(cycle.cycle_id);
    assert.strictEqual(reread.evenements[0].cycle_id, cycle.cycle_id);
  });

  await record('Service — erreurs explicites et pas de création Personne par cycle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeCycleService(repo);
    await expectHttpError(() => service.createCycle({ domaineCode: 'DPS', libelle: 'DPS interdit' }), 400, 'domaine_cycle_invalide');
    const created = await service.createCycle({ cycleKey: 'AUTO-2026', annee: 2026, domaineCode: 'AUTO', libelle: 'Conduite VL DPS' });
    await expectHttpError(() => service.createCycle({ cycleKey: 'AUTO-2026', annee: 2026, domaineCode: 'AUTO', libelle: 'Doublon' }), 409, 'cycle_deja_existant');
    await expectHttpError(() => service.attachEvent(created.cycle.cycle_id, { evenementId: 'missing' }), 404, 'evenement_introuvable');
    await expectHttpError(() => service.upsertPersonne(created.cycle.cycle_id, { nip: '999999', roleCycle: 'PARTICIPANT' }), 404, 'personne_introuvable');
  });

  await record('A — JSP 10 jeunes, 2 moniteurs visibles hors effectif et taux', async () => {
    const attendus = tauxRows('j', 10).map((row) => ({ personne_id: row.personne_id, inclus: true }));
    const participations = tauxRows('j', 8, 'PRESENT')
      .concat([{ personne_id: 'j9', statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT' }, { personne_id: 'j10', statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT' }])
      .concat([part('jsp1', 'm1', 'NON_CONCERNE', 'MONITEUR'), part('jsp1', 'm2', 'NON_CONCERNE', 'MONITEUR')]);
    const taux = computeTaux(participations, attendus);
    assert.strictEqual(taux.denominator, 10);
    assert.strictEqual(taux.numerator, 8);
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-jsp', domaine_code: 'JSP' },
      personnes: [person('m1', 'M1'), person('m2', 'M2')],
      evenements: [event('jsp1', { cycle_id: 'cycle-jsp', domaine_code: 'JSP' })],
      cyclePersonnes: [cyclePersonne('m1', 'MONITEUR', { cycle_id: 'cycle-jsp' }), cyclePersonne('m2', 'MONITEUR', { cycle_id: 'cycle-jsp' })],
      participations: [part('jsp1', 'm1', 'NON_CONCERNE', 'MONITEUR'), part('jsp1', 'm2', 'NON_CONCERNE', 'MONITEUR')]
    });
    assert.strictEqual(metrics.moniteursDistincts, 2);
    assert.strictEqual(metrics.effectifEngageCycle, 0);
  });

  await record('B — PAPR surveillant présent déjà participant = une personne, jamais deux', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-1', domaine_code: 'PR' },
      personnes: [person('p1', '1001'), person('s1', '1001')],
      evenements: [event('s1')],
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's1' })],
      participations: [part('s1', 'p1', 'PRESENT'), part('s1', 's1', 'NON_CONCERNE', 'SURVEILLANT')]
    });
    assert.strictEqual(metrics.surveillantsDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('C — auxiliaire visible hors comptage', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-1', domaine_code: 'PR' },
      personnes: Array.from({ length: 10 }, (_, i) => person(`p${i}`, `20${i}`)).concat([person('a1', 'AUX-1')]),
      evenements: [event('s1')],
      cyclePersonnes: Array.from({ length: 10 }, (_, i) => cyclePersonne(`p${i}`, 'PARTICIPANT', { session_event_id: 's1' })),
      participations: Array.from({ length: 10 }, (_, i) => part('s1', `p${i}`, 'PRESENT')).concat([part('s1', 'a1', 'NON_CONCERNE', 'AUXILIAIRE')])
    });
    assert.strictEqual(metrics.populationDistincte, 10);
    assert.strictEqual(metrics.participantsReconnusDistincts, 10);
    assert.strictEqual(metrics.auxiliairesDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 10);
  });

  await record('D — même formateur PAPR sur 6 exercices dédupliqué par NIP', async () => {
    const events = Array.from({ length: 6 }, (_, i) => event(`s${i + 1}`, { date: `2026-09-0${i + 1}` }));
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-1', domaine_code: 'PR' },
      personnes: [person('f1', '3001')],
      evenements: events,
      cyclePersonnes: [cyclePersonne('f1', 'PARTICIPANT')],
      participations: events.map((ev) => part(ev.evenement_id, 'f1', 'NON_CONCERNE', 'FORMATEUR'))
    });
    assert.strictEqual(metrics.formateursDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('E — formateur externe visible hors population spécialisée', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-1', domaine_code: 'PR' },
      personnes: [person('f1', '4001')],
      evenements: [event('s1')],
      cyclePersonnes: [],
      participations: [part('s1', 'f1', 'NON_CONCERNE', 'FORMATEUR')]
    });
    assert.strictEqual(metrics.formateursDistincts, 1);
    assert.strictEqual(metrics.populationDistincte, 0);
    assert.strictEqual(metrics.effectifEngageCycle, 0);
  });

  await record('F — dispense PR interne pas comptée absente', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-1', domaine_code: 'PR' },
      personnes: [person('p1', '5001')],
      evenements: [event('s1'), event('s2')],
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's1', exception_type: 'DISPENSE_EXERCICE_INTERNE', exercise_scope: ['s2'] })],
      participations: [part('s1', 'p1', 'PRESENT'), part('s2', 'p1', 'ABSENT_EXCUSE')]
    });
    assert.strictEqual(metrics.dispensesInternesDistinctes, 1);
    assert.strictEqual(metrics.absencesQualifieesDistinctes, 0);
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
  });

  await record('G — rattachement par NIP réutilise la Personne existante', async () => {
    const repo = createMemoryRepo();
    const service = createScopeCycleService(repo);
    const existing = await repo.insertPersonne({ nip: '777777', nom: 'Dupont', prenom: 'Alex', grade: 'Sdt' });
    const before = (await repo.listPersonnes()).length;
    const cycle = (await service.createCycle({ cycleKey: 'PAPR-G', annee: 2026, domaineCode: 'PR', libelle: 'PAPR G' })).cycle;
    const detail = await service.upsertPersonne(cycle.cycle_id, { nip: '777777', roleCycle: 'PARTICIPANT' });
    const after = (await repo.listPersonnes()).length;
    assert.strictEqual(after, before);
    assert.strictEqual(detail.personnes[0].personne_id, existing.personne_id);
    assert.strictEqual(detail.personnes[0].nip, '777777');
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((r) => r.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE specialisation cycles UX/API tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE specialisation cycles UX/API tests: ${results.length}/${results.length} PASS`);
})();

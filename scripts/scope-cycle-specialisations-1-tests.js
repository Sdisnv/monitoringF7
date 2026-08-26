#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  sameTechnicalCycle,
  proposeCycleLink,
  computeCycleMetrics,
  computeStandardEventMetricsUnchanged
} = require('../netlify/functions/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function person(id, nip){
  return { id, personne_id: id, nip };
}

function event(id, extra){
  return Object.assign({ evenement_id: id, cycle_id: 'cycle-papr-2026', domaine_code: 'PR', code_cours: `PAPR.${id}`, date: '2026-09-01' }, extra || {});
}

function cyclePersonne(personneId, role, extra){
  return Object.assign({
    cycle_id: 'cycle-papr-2026',
    personne_id: personneId,
    role_cycle: role || 'PARTICIPANT',
    statut_cycle: 'ACTIF'
  }, extra || {});
}

function part(evenementId, personneId, statut, role){
  return { evenement_id: evenementId, personne_id: personneId, statut, role: role || 'PARTICIPANT' };
}

function sixPaprEvents(){
  return [1, 2, 3, 4, 5, 6].map((n) => event(`s${n}`, {
    code_cours: `01522F7PAPR.${240 + n}`,
    date: `2026-09-${String(n).padStart(2, '0')}`
  }));
}

(async () => {
  await record('AG — migration cycle additive, idempotente, nullable, sans backfill', async () => {
    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260826_scope_specialisation_cycles_arch_1.sql'), 'utf8');
    assert.ok(sql.includes('create table if not exists scope_cycles'));
    assert.ok(sql.includes('cycle_id uuid primary key default gen_random_uuid()'));
    assert.ok(sql.includes('cycle_key text'));
    assert.ok(sql.includes('add column if not exists cycle_id uuid references scope_cycles(cycle_id) on delete set null'));
    assert.ok(sql.includes('create table if not exists scope_cycle_personnes'));
    assert.ok(sql.includes("'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE'"));
    assert.ok(sql.includes('session_event_id uuid references scope_evenements(evenement_id) on delete set null'));
    assert.ok(sql.includes('participated_event_id uuid references scope_evenements(evenement_id) on delete set null'));
    assert.ok(!/\bscope_sessions\b/.test(sql));
    assert.ok(!/\bsession_id\b/.test(sql));
    assert.ok(!/\bdrop\s+(table|column)\b/i.test(sql));
    assert.ok(!/\bdelete\s+from\b/i.test(sql));
    assert.ok(!/\btruncate\b/i.test(sql));
    assert.ok(!/\bupdate\s+scope_evenements\b/i.test(sql));
  });

  await record('AG — runtime bootstrap cycle cohérent', async () => {
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-schema.js'), 'utf8');
    assert.ok(schema.includes('async function migrateSpecialisationCyclesArch1()'));
    assert.ok(schema.includes("values ('scope-specialisation-cycles-arch-1')"));
    assert.ok(schema.includes('scope_cycles'));
    assert.ok(schema.includes('scope_cycle_personnes'));
    assert.ok(schema.includes("'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE'"));
    assert.ok(schema.includes('cycle_id uuid references scope_cycles(cycle_id) on delete set null'));
  });

  await record('AF1 — cycle PAPR avec 6 sessions', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      evenements: sixPaprEvents()
    });
    assert.strictEqual(metrics.sessionCounts.length, 6);
  });

  await record('AF2/AF3 — PAPR X assigné Session 3 et présent => participation reconnue cycle', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '1001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's3' })],
      participations: [part('s3', 'p1', 'PRESENT')]
    });
    assert.strictEqual(metrics.populationDistincte, 1);
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
    assert.deepStrictEqual(metrics.distributionSessions[0], {
      personKey: 'NIP:1001',
      assignedEventId: 's3',
      participatedEventId: 's3'
    });
  });

  await record('AF4 — X non absent des sessions alternatives 1/2/4/5/6', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '1001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's3' })],
      participations: [
        part('s1', 'p1', 'ABSENT_EXCUSE'),
        part('s3', 'p1', 'PRESENT'),
        part('s5', 'p1', 'ABSENT_NON_EXCUSE')
      ]
    });
    assert.strictEqual(metrics.absencesQualifieesDistinctes, 0);
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
  });

  await record('AF5 — changement Session 3 vers Session 5 => toujours 1 personne', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '1001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's3', participated_event_id: 's5' })],
      participations: [part('s5', 'p1', 'PRESENT')]
    });
    assert.strictEqual(metrics.populationDistincte, 1);
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
    assert.strictEqual(metrics.distributionSessions[0].assignedEventId, 's3');
    assert.strictEqual(metrics.distributionSessions[0].participatedEventId, 's5');
  });

  await record('AF6 — formateur X sur 6 sessions => 1 formateur cycle', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('f1', '2001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('f1', 'PARTICIPANT')],
      participations: sixPaprEvents().map((e) => part(e.evenement_id, 'f1', 'NON_CONCERNE', 'FORMATEUR'))
    });
    assert.strictEqual(metrics.formateursDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('AF7 — surveillant X déjà participant => +0 personne', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '3001'), person('s1', '3001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's2' })],
      participations: [part('s2', 'p1', 'PRESENT'), part('s2', 's1', 'NON_CONCERNE', 'SURVEILLANT')]
    });
    assert.strictEqual(metrics.surveillantsDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('AF8 — surveillants différents par session => aucun ajout artificiel', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '4001'), person('s1', '4002'), person('s2', '4003')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's1' })],
      participations: [part('s1', 'p1', 'PRESENT'), part('s1', 's1', 'NON_CONCERNE', 'SURVEILLANT'), part('s2', 's2', 'NON_CONCERNE', 'SURVEILLANT')]
    });
    assert.strictEqual(metrics.surveillantsDistincts, 2);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('AF9/AF10 — auxiliaire sur 6 sessions, civil inclus => 0 contribution', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('a1', 'CIVIL-1')],
      evenements: sixPaprEvents(),
      participations: sixPaprEvents().map((e) => part(e.evenement_id, 'a1', 'NON_CONCERNE', 'AUXILIAIRE'))
    });
    assert.strictEqual(metrics.auxiliairesDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 0);
  });

  await record('AF11/AF12 — plusieurs CODE COURS et dates dans un cycle', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      evenements: sixPaprEvents()
    });
    assert.strictEqual(new Set(metrics.sessionCounts.map((row) => row.codeCours)).size, 6);
    assert.strictEqual(new Set(metrics.sessionCounts.map((row) => row.date)).size, 6);
  });

  await record('AF13 — même STAT.COM mais deux cycles UUID différents => jamais fusionnés', async () => {
    assert.strictEqual(sameTechnicalCycle({ cycle_id: 'c1', stat_com: '01522F7' }, { cycle_id: 'c2', stat_com: '01522F7' }), false);
  });

  await record('AF14 — AUTO multi-session alternatif => même socle cycle', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-auto-truck', domaine_code: 'AUTO' },
      personnes: [person('p1', '5001')],
      evenements: [event('t1', { cycle_id: 'cycle-auto-truck', domaine_code: 'AUTO' }), event('t2', { cycle_id: 'cycle-auto-truck', domaine_code: 'AUTO' })],
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { cycle_id: 'cycle-auto-truck', session_event_id: 't1' })],
      participations: [part('t2', 'p1', 'PRESENT')]
    });
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
    assert.strictEqual(metrics.tauxParticipationCycle.numerator, 1);
  });

  await record('AF15-AF19 — événements standards sans cycle inchangés', async () => {
    for(const domaine of ['AUTO', 'DPS', 'DAP', 'JSP', 'FOBA']){
      const result = computeStandardEventMetricsUnchanged({ event: { evenement_id: `${domaine}-1`, domaine_code: domaine } });
      assert.strictEqual(result.standard, true);
      assert.strictEqual(result.cycleId, null);
    }
  });

  await record('AF20 — NIP participant + formateur => 1 personne effectif', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-auto-truck', domaine_code: 'AUTO' },
      personnes: [person('p1', '6001'), person('f1', '6001')],
      evenements: [event('t1', { cycle_id: 'cycle-auto-truck', domaine_code: 'AUTO' })],
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { cycle_id: 'cycle-auto-truck', session_event_id: 't1' })],
      participations: [part('t1', 'p1', 'PRESENT'), part('t1', 'f1', 'NON_CONCERNE', 'FORMATEUR')]
    });
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
    assert.strictEqual(metrics.formateursDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('AF21 — NIP participant + surveillant => 1', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '7001'), person('s1', '7001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's1' })],
      participations: [part('s1', 'p1', 'PRESENT'), part('s1', 's1', 'NON_CONCERNE', 'SURVEILLANT')]
    });
    assert.strictEqual(metrics.surveillantsDistincts, 1);
    assert.strictEqual(metrics.effectifEngageCycle, 1);
  });

  await record('AF22 — population figée historique inchangée', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '8001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', { session_event_id: 's4' })],
      participations: [part('s4', 'p1', 'PRESENT')]
    });
    assert.deepStrictEqual(metrics.details.population, ['NIP:8001']);
  });

  await record('AF23 — aucun rattachement automatique ambigu', async () => {
    const result = proposeCycleLink([
      { domaine: 'PR', statCom: '01522F7', qui: 'PR', familleLibelle: 'PAPR A' },
      { domaine: 'PR', statCom: '01522F7', qui: 'PR', familleLibelle: 'PAPR B' }
    ]);
    assert.strictEqual(result.automatic, false);
    assert.strictEqual(result.action, 'REVIEW_REQUIRED');
  });

  await record('AF24 — cycle proposition forte = PROPOSED_MATCH seulement', async () => {
    const result = proposeCycleLink([
      { domaine: 'PR', statCom: '01522F7', qui: 'PR', familleLibelle: 'PAPR annuel', annee: 2026 },
      { domaine: 'PR', statCom: '01522F7', qui: 'PR', familleLibelle: 'PAPR annuel', annee: 2026 }
    ]);
    assert.strictEqual(result.action, 'PROPOSED_MATCH');
    assert.strictEqual(result.automatic, false);
  });

  await record('Q — dispense interne PAPR distincte des sessions alternatives', async () => {
    const metrics = computeCycleMetrics({
      cycle: { cycle_id: 'cycle-papr-2026', domaine_code: 'PR' },
      personnes: [person('p1', '9001')],
      evenements: sixPaprEvents(),
      cyclePersonnes: [cyclePersonne('p1', 'PARTICIPANT', {
        session_event_id: 's3',
        exception_type: 'DISPENSE_EXERCICE_INTERNE',
        exercise_scope: ['ex3']
      })],
      participations: [part('s3', 'p1', 'PRESENT')]
    });
    assert.strictEqual(metrics.dispensesInternesDistinctes, 1);
    assert.strictEqual(metrics.participantsReconnusDistincts, 1);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((r) => r.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE cycle specialisations tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE cycle specialisations tests: ${results.length}/${results.length} PASS`);
})();

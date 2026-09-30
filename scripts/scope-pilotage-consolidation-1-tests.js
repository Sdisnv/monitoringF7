#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  CONSOLIDATED_STATE,
  consolidatePilotage
} = require('../netlify/lib/_scope-obligation-consolidation');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message){ assertions += 1; assert.ok(value, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function event(id, extra = {}){
  return { evenement_id: id, domaine_code: 'DPS', libelle: id, ...extra };
}

function part(eventId, personId, statut, extra = {}){
  return { evenement_id: eventId, personne_id: personId, statut, role: 'PARTICIPANT', source: 'SAISIE', ...extra };
}

function pilotage(obligations, people = ['p1']){
  return {
    obligations,
    individualRows: people.map((personneId) => ({
      personneId,
      personKey: `ID:${personneId}`,
      nip: personneId,
      isPopulation: true,
      isEncadrement: false,
      obligations: obligations.map((obligation) => ({
        obligationKey: obligation.obligationKey,
        label: obligation.label,
        expected: true,
        status: 'A_RENSEIGNER',
        eventId: obligation.eventIds[0]
      }))
    })),
    kpis: { population: people.length }
  };
}

function consolidate({ obligations, events, participations = [], permutations = [], people }){
  return consolidatePilotage(pilotage(obligations, people), {
    evenements: events,
    participations,
    permutations
  });
}

(async () => {
  await record('01 - présence participant satisfait une obligation simple', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['e1'] }],
      events: [event('e1')],
      participations: [part('e1', 'p1', 'PRESENT')]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.SATISFIED);
    eq(result.kpis.obligationsSatisfaites, 1);
  });

  await record('02 - absence excusée ne satisfait pas une obligation', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['e1'] }],
      events: [event('e1')],
      participations: [part('e1', 'p1', 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' })]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.TODO);
    eq(result.kpis.obligationsSatisfaites, 0);
    eq(result.kpis.resteATraiter, 1);
  });

  await record('03 - multi-session obligatoire reste en cours après une seule session', () => {
    const events = [event('m1', { exercice_id: 'x1', consolidation_active: true, nombre_sessions_attendu: 2 }), event('m2', { exercice_id: 'x1', consolidation_active: true, nombre_sessions_attendu: 2 })];
    const result = consolidate({
      obligations: [{ obligationKey: 'EXERCISE:x1', label: 'Formation complète', eventIds: ['m1', 'm2'] }],
      events,
      participations: [part('m1', 'p1', 'PRESENT')]
    });
    const row = result.individualRows[0];
    eq(row.consolidatedState, CONSOLIDATED_STATE.IN_PROGRESS);
    eq(row.obligations[0].completedSessions, 1);
    eq(row.obligations[0].requiredSessions, 2);
  });

  await record('04 - multi-session obligatoire est satisfaite après toutes les sessions', () => {
    const events = [event('m1', { consolidation_active: true, nombre_sessions_attendu: 2 }), event('m2', { consolidation_active: true, nombre_sessions_attendu: 2 })];
    const result = consolidate({
      obligations: [{ obligationKey: 'MULTI:1', label: 'Formation complète', eventIds: ['m1', 'm2'] }],
      events,
      participations: [part('m1', 'p1', 'PRESENT'), part('m2', 'p1', 'PRESENT')]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.SATISFIED);
  });

  await record('05 - permutation seule exige un rattrapage', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DAP:EX1', label: 'Exercice DAP 1', eventIds: ['src'] }],
      events: [event('src', { domaine_code: 'DAP', exercise_equivalence_key: 'DAP_EX1' })],
      participations: [part('src', 'p1', 'PERMUTATION')],
      permutations: [{ permutation_id: 'perm1', personne_id: 'p1', source_evenement_id: 'src', source_exercise_key: 'DAP_EX1', statut: 'A_RATTRAPER' }]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.CATCHUP_REQUIRED);
  });

  await record('06 - rattrapage compatible satisfait la source sans double comptage', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DAP:EX1', label: 'Exercice DAP 1', eventIds: ['src'] }],
      events: [event('src', { domaine_code: 'DAP', exercise_equivalence_key: 'DAP_EX1' }), event('dst', { domaine_code: 'DAP', exercise_equivalence_key: 'DAP_EX1' })],
      participations: [part('src', 'p1', 'PERMUTATION'), part('dst', 'p1', 'PRESENT')],
      permutations: [{ permutation_id: 'perm1', personne_id: 'p1', source_evenement_id: 'src', source_exercise_key: 'DAP_EX1', rattrapage_evenement_id: 'dst', statut: 'RATTRAPPE' }]
    });
    const row = result.individualRows[0];
    eq(row.consolidatedState, CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP);
    eq(row.obligationSatisfiedCount, 1);
    eq(row.obligations[0].provenance.length, 2);
  });

  await record('07 - rattrapage incohérent demande un contrôle humain', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DAP:EX1', label: 'Exercice DAP 1', eventIds: ['src'] }],
      events: [event('src', { exercise_equivalence_key: 'DAP_EX1' }), event('dst', { exercise_equivalence_key: 'DAP_EX2' })],
      participations: [part('dst', 'p1', 'PRESENT')],
      permutations: [{ personne_id: 'p1', source_evenement_id: 'src', source_exercise_key: 'DAP_EX1', rattrapage_evenement_id: 'dst', statut: 'RATTRAPPE' }]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.REVIEW);
  });

  await record('08 - encadrement ne satisfait pas une obligation personnelle', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['e1'] }],
      events: [event('e1')],
      participations: [part('e1', 'p1', 'PRESENT', { role: 'FORMATEUR' })]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.TODO);
  });

  await record('08b - règle cycle existante conserve la contribution du formateur attendu', () => {
    const base = pilotage([{ obligationKey: 'PR:1', label: 'PR 1', eventIds: ['pr1'] }]);
    base.individualRows[0].obligations[0].status = 'REALISE';
    base.individualRows[0].obligations[0].role = 'FORMATEUR';
    const result = consolidatePilotage(base, {
      evenements: [event('pr1', { domaine_code: 'PR' })],
      participations: [part('pr1', 'p1', 'PRESENT', { role: 'FORMATEUR' })]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.SATISFIED);
    eq(result.individualRows[0].obligations[0].consolidationReason, 'REGLE_CYCLE_ENCADREMENT_EXISTANTE');
  });

  await record('09 - PAPR et PABC restent deux obligations distinctes', () => {
    const result = consolidate({
      obligations: [
        { obligationKey: 'PR:PAPR', label: 'PAPR', eventIds: ['papr'] },
        { obligationKey: 'PR:PABC', label: 'PABC', eventIds: ['pabc'] }
      ],
      events: [event('papr', { domaine_code: 'PR' }), event('pabc', { domaine_code: 'PR' })],
      participations: [part('papr', 'p1', 'PRESENT')]
    });
    const row = result.individualRows[0];
    eq(row.consolidatedState, CONSOLIDATED_STATE.IN_PROGRESS);
    deep(row.obligations.map((cell) => cell.consolidatedState), [CONSOLIDATED_STATE.SATISFIED, CONSOLIDATED_STATE.TODO]);
  });

  await record('10 - FOBA multi-OI produit une seule satisfaction', () => {
    const ids = ['foba-b1', 'foba-b2', 'foba-c1', 'foba-g1'];
    const result = consolidate({
      obligations: [{ obligationKey: 'QV:FOBA:070F1.005', label: 'Exercice FOBA 1', eventIds: ids }],
      events: ids.map((id) => event(id, { domaine_code: 'FOBA', exercise_equivalence_key: '070F1.005', statcom_code: '070F1' })),
      participations: [part('foba-b1', 'p1', 'PRESENT'), part('foba-c1', 'p1', 'PRESENT')]
    });
    eq(result.individualRows[0].obligationSatisfiedCount, 1);
    eq(result.kpis.obligationsSatisfaites, 1);
  });

  await record('11 - décision NON_CONCERNE contradictoire reste à contrôler', () => {
    const result = consolidate({
      obligations: [{ obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['e1'] }],
      events: [event('e1')],
      participations: [part('e1', 'p1', 'NON_CONCERNE'), part('e1', 'p1', 'PRESENT')]
    });
    eq(result.individualRows[0].consolidatedState, CONSOLIDATED_STATE.REVIEW);
  });

  await record('12 - recalcul idempotent', () => {
    const input = {
      obligations: [{ obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['e1'] }],
      events: [event('e1')],
      participations: [part('e1', 'p1', 'PRESENT')]
    };
    deep(consolidate(input), consolidate(input));
  });

  await record('13 - intégration Pilotage, sécurité et absence de migration', () => {
    const service = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-service.js'), 'utf8');
    const route = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    const migrationNames = fs.readdirSync(path.join(ROOT, 'database/migrations')).filter((name) => /pilotage_consolidation/i.test(name));
    ok(service.includes('consolidatePilotage'), 'Pilotage raccordé au consolidateur');
    ok(route.includes("path === '/cycles'"), 'route cycles existante conservée');
    eq(migrationNames.length, 0, 'aucune migration nécessaire');
  });

  await record('14 - service Cycles expose la vérité consolidée sans écriture', async () => {
    const repo = createMemoryRepo();
    await repo.upsertPersonne({ personne_id: 'svc-p1', nip: '92001', nom: 'Service', prenom: 'Test' });
    await repo.insertEvenement({ evenement_id: 'svc-e1', date: '2026-10-01', domaine_code: 'PR', libelle: 'Exercice PR 1.1', pr_exercise_group_key: 'SVC:PR:1', pr_session_key: 'SVC:PR:1.1', statut: 'REALISE' });
    await repo.insertEvenement({ evenement_id: 'svc-e2', date: '2026-10-08', domaine_code: 'PR', libelle: 'Exercice PR 1.2', pr_exercise_group_key: 'SVC:PR:1', pr_session_key: 'SVC:PR:1.2', statut: 'REALISE' });
    await repo.upsertAttendu({ evenement_id: 'svc-e1', personne_id: 'svc-p1', inclus: true, origine: 'TEST' });
    await repo.upsertAttendu({ evenement_id: 'svc-e2', personne_id: 'svc-p1', inclus: true, origine: 'TEST' });
    await repo.upsertParticipation(part('svc-e1', 'svc-p1', 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' }));
    const cycles = await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' });
    const detail = await createScopeCycleService(repo).getCycle(cycles.cycles[0].cycle_id);
    eq(detail.pilotage.individualRows[0].consolidatedState, CONSOLIDATED_STATE.TODO);
    eq(detail.pilotage.kpis.obligationsSatisfaites, 0);
    eq((await repo.listParticipations('svc-e1')).length, 1, 'lecture sans mutation');
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => console.log(`${row.status} ${row.name}${row.proof ? `\n${row.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

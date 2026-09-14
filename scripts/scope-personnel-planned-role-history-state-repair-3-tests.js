#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-PLANNED-ROLE-HISTORY-STATE-REPAIR-3 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const display = require('../assets/js/scope-personnel-display.js');

const TOKEN = 'scope-personnel-planned-role-history-state-repair-3';
const PERIOD = { from: '2026-03-01', to: '2026-12-31', preset: 'CUSTOM' };
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};

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

async function person(repo, id, nip, cibleId){
  const row = await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  });
  await repo.insertAffectation({ personne_id: row.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return row;
}

async function groupedEvent(repo, id, date, domaine, groupKey, sessionIndex, cibleId, extra = {}){
  const event = await repo.insertEvenement(Object.assign({
    evenement_id: id,
    date,
    domaine_code: domaine,
    libelle: extra.libelle || `${domaine} séance ${sessionIndex}`,
    code_cours: id,
    statut: extra.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    pr_exercise_group_key: groupKey,
    pr_session_key: `${groupKey}.${sessionIndex}`,
    cible_ids: [cibleId]
  }, extra.patch || {}));
  await repo.setEventCibles(event.evenement_id, [cibleId]);
  return event;
}

async function expectPerson(repo, eventId, personneId){
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personneId, inclus: true, origine: 'REGLE' });
}

async function participate(repo, eventId, personneId, statut, extra = {}){
  await repo.upsertParticipation(Object.assign({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: extra.role || 'PARTICIPANT',
    source: extra.source || 'SAISIE'
  }, extra.patch || {}));
}

function realizedRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'presents'));
}

function toutRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'tout'));
}

(async () => {
  await record('CAS A — formateur PLANIFIÉ PRESENT : Tout / Planifié, pas Réalisés, KPI 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const a = await person(repo, 'planned-formateur-a', '26001', cible.cible_id);
    const b = await person(repo, 'planned-formateur-b', '26002', cible.cible_id);
    for(const who of [a, b]){
      const event = await groupedEvent(repo, `plan-form-${who.nip}`, '2026-10-06', 'PR', `NO_CYCLE:PR:PLAN-${who.nip}`, 1, cible.cible_id, {
        statut: 'PLANIFIE',
        libelle: `Séance planifiée ${who.nip}`
      });
      await expectPerson(repo, event.evenement_id, who.personne_id);
      await participate(repo, event.evenement_id, who.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
      const persons = createScopePersonService(repo);
      const fiche = await persons.fiche(who.personne_id, PERIOD);
      const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(event.evenement_id));
      ok(row, `trace visible ${who.nip}`);
      ok(row.planned);
      eq(row.statutEvenement, 'PLANIFIE');
      eq(row.roleParticipation, 'FORMATEUR');
      eq(row.eventCountContribution, 0);
      eq(row.numerator, 0);
      eq(row.denominator, 0);
      eq(display.ficheEventStatutLabel(row), 'Planifié');
      eq(display.ficheEventInformations(row), 'Formateur');
      eq(toutRows(fiche.evenements).length, 1);
      eq(realizedRows(fiche.evenements).length, 0);
      eq(fiche.kpi.eventCount, 0);
      eq(fiche.kpi.numerator, 0);
    }
  });

  await record('CAS B — participant PLANIFIÉ PRESENT pré-renseigné : jamais réalisé statistiquement', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'planned-part', '26003', cible.cible_id);
    const event = await repo.insertEvenement({
      evenement_id: 'dps-planned-present',
      date: '2026-11-02',
      domaine_code: 'DPS',
      libelle: 'DPS planifié pré-saisi',
      code_cours: 'dps-planned-present',
      statut: 'PLANIFIE',
      mode_suivi: 'NOMINATIF',
      cible_ids: [cible.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [cible.cible_id]);
    await expectPerson(repo, event.evenement_id, p.personne_id);
    await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    const row = fiche.evenements[0];
    eq(display.ficheEventStatutLabel(row), 'Planifié');
    eq(realizedRows(fiche.evenements).length, 0);
    eq(fiche.kpi.eventCount, 0);
    const evaluated = await analytics.evaluate(Object.assign({ personneId: p.personne_id }, PERIOD));
    eq(evaluated.officiel.eventCount, 0);
  });

  await record('CAS C — après REALISE, la pré-saisie PRESENT devient exploitable', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'planned-then-closed', '26004', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-09-08',
      domaineCode: 'DPS',
      libelle: 'DPS préparé puis clôturé',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [p.personne_id],
      baseVersion: created.version
    }, ACTOR);
    let ficheEvent = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: ficheEvent.version,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const before = await persons.fiche(p.personne_id, PERIOD);
    const beforeRow = before.evenements.find((row) => String(row.evenementId) === String(created.evenement.evenement_id));
    eq(display.ficheEventStatutLabel(beforeRow), 'Planifié');
    eq(realizedRows(before.evenements).length, 0);
    eq(before.kpi.eventCount, 0);
    ficheEvent = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: ficheEvent.version }, ACTOR);
    const after = await persons.fiche(p.personne_id, PERIOD);
    const afterRow = after.evenements.find((row) => String(row.evenementId) === String(created.evenement.evenement_id));
    eq(display.ficheEventStatutLabel(afterRow), 'Présent');
    eq(realizedRows(after.evenements).length, 1);
    eq(after.kpi.eventCount, 1);
    eq(after.kpi.numerator, 1);
  });

  await record('CAS D — 2 REALISE + 1 PLANIFIE : 3 dans Tout, 2 dans Réalisés, 1 KPI session', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'planned-abc', '26005', cible.cible_id);
    const groupKey = 'EXERCICE:dddddddd-dddd-dddd-dddd-dddddddddddd';
    const specs = [
      { id: 'abc-r3-s1', date: '2026-04-21', statut: 'REALISE' },
      { id: 'abc-r3-s2', date: '2026-06-10', statut: 'REALISE' },
      { id: 'abc-r3-s3', date: '2026-10-06', statut: 'PLANIFIE' }
    ];
    for(let i = 0; i < specs.length; i += 1){
      const spec = specs[i];
      const event = await groupedEvent(repo, spec.id, spec.date, 'PR', groupKey, i + 1, cible.cible_id, {
        statut: spec.statut,
        libelle: 'Exercice groupé | Refresh'
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    }
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    eq(toutRows(fiche.evenements).length, 3);
    eq(realizedRows(fiche.evenements).length, 2);
    ok(realizedRows(fiche.evenements).every((row) => display.ficheEventStatutLabel(row) === 'Réalisé'));
    const planned = fiche.evenements.find((row) => row.planned);
    eq(display.ficheEventStatutLabel(planned), 'Planifié');
    eq(display.ficheEventInformations(planned), 'Formateur');
    eq(fiche.kpi.eventCount, 1);
    eq(fiche.kpi.numerator, 1);
  });

  await record('CAS E — auxiliaire / moniteur / surveillant planifiés : rôle conservé, pas réalisé', async () => {
    const repo = createMemoryRepo();
    const pr = await repo.findCible('PR', 'GEN');
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const aux = await person(repo, 'planned-aux', '26006', pr.cible_id);
    const surv = await person(repo, 'planned-surv', '26007', pr.cible_id);
    const mon = await person(repo, 'planned-mon', '26008', jsp.cible_id);
    await repo.insertAffectation({ personne_id: mon.personne_id, cible_id: dps.cible_id, date_debut: '2026-01-01' });
    const cases = [
      { who: aux, role: 'AUXILIAIRE', domaine: 'PR', cibleId: pr.cible_id, info: 'Auxiliaire' },
      { who: surv, role: 'SURVEILLANT', domaine: 'PR', cibleId: pr.cible_id, info: 'Surveillant' },
      { who: mon, role: 'MONITEUR', domaine: 'JSP', cibleId: jsp.cible_id, info: 'Moniteur' }
    ];
    const persons = createScopePersonService(repo);
    for(const item of cases){
      const event = await groupedEvent(repo, `plan-role-${item.who.nip}`, '2026-11-12', item.domaine, `GROUP:${item.who.nip}`, 1, item.cibleId, {
        statut: 'PLANIFIE',
        libelle: `Encadrement planifié ${item.role}`
      });
      await expectPerson(repo, event.evenement_id, item.who.personne_id);
      await participate(repo, event.evenement_id, item.who.personne_id, 'PRESENT', { role: item.role, source: 'ENCADREMENT' });
      const fiche = await persons.fiche(item.who.personne_id, PERIOD);
      const row = fiche.evenements.find((entry) => String(entry.evenementId) === String(event.evenement_id));
      eq(display.ficheEventStatutLabel(row), 'Planifié', item.role);
      eq(display.ficheEventInformations(row), item.info);
      eq(realizedRows(fiche.evenements).length, 0, item.role);
      eq(fiche.kpi.eventCount, 0, item.role);
    }
  });

  await record('CAS F — non-régression PR 1 parasites / PR 2 traces individuelles', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'planned-pr1', '26009', cible.cible_id);
    const pr1 = 'NO_CYCLE:PR:1';
    for(let i = 1; i <= 6; i += 1){
      const event = await groupedEvent(repo, `r3-pr1-s${i}`, `2026-03-${String(i).padStart(2, '0')}`, 'PR', pr1, i, cible.cible_id, {
        libelle: `Exercice PR 1.${i} | Base`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      if(i === 2) await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
      else await participate(repo, event.evenement_id, trainer.personne_id, 'NON_RENSEIGNE', { role: 'PARTICIPANT' });
    }
    const pr2 = 'NO_CYCLE:PR:2';
    for(let i = 1; i <= 2; i += 1){
      const event = await groupedEvent(repo, `r3-pr2-s${i}`, `2026-04-1${i}`, 'PR', pr2, i, cible.cible_id, {
        libelle: `Exercice PR 2.${i} | Base`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    }
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    const realized = realizedRows(fiche.evenements);
    eq(realized.filter((row) => String(row.libelle).includes('PR 1.')).length, 1);
    eq(realized.find((row) => String(row.libelle).includes('PR 1.2')).roleParticipation, 'FORMATEUR');
    eq(realized.filter((row) => String(row.libelle).includes('PR 2.')).length, 2);
    ok(!fiche.evenements.some((row) => row.statutParticipation === 'NON_RENSEIGNE' && String(row.libelle).includes('PR 1.')));
    eq(fiche.kpi.eventCount, 2);
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - failed.length}/${results.length} tests PASS — ${assertions} assertions`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

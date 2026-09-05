#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const {
  normalizeTargetCode,
  matchesAssignmentToEventTarget,
  pgCibleJoinCondition
} = require('../netlify/lib/_scope-target-resolution');

const ACTOR = { sub: 'scope-foba-fix-4-test', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function legacyRepo(base, legacyAssignments){
  async function matchingAffectations(cibleIds, date){
    const cibles = await base.listCibles();
    const wanted = new Set((cibleIds || []).map(String));
    const targets = cibles.filter((row) => wanted.has(String(row.cible_id)));
    return legacyAssignments
      .filter((aff) => {
        const day = String(date);
        if(aff.date_actif > day) return false;
        if(aff.date_inactif && aff.date_inactif < day) return false;
        return targets.some((target) => matchesAssignmentToEventTarget(aff, target));
      })
      .map((aff) => {
        const target = targets.find((row) => matchesAssignmentToEventTarget(aff, row));
        return {
          affectation_id: aff.affectation_id,
          personne_id: aff.personne_id,
          cible_id: target.cible_id,
          categorie: aff.categorie,
          domaine: aff.domaine,
          cible: aff.cible,
          role_domaine: aff.role_domaine || null,
          domaine_code: aff.domaine,
          niveau_code: aff.cible,
          date_debut: aff.date_actif,
          date_fin: aff.date_inactif || null,
          date_actif: aff.date_actif,
          date_inactif: aff.date_inactif || null,
          source: 'LEGACY_TEST'
        };
      });
  }
  return {
    ...base,
    async withTransaction(fn){
      if(!base.withTransaction) return fn(this);
      return base.withTransaction((tx) => fn(legacyRepo(tx, legacyAssignments)));
    },
    updateLegacyAssignment(id, patch){
      const row = legacyAssignments.find((aff) => aff.affectation_id === id);
      if(row) Object.assign(row, patch || {});
      return row || null;
    },
    async listAffectations({ personneId, date } = {}){
      const rows = legacyAssignments.filter((aff) => {
        if(personneId && String(aff.personne_id) !== String(personneId)) return false;
        if(date){
          const day = String(date);
          if(aff.date_actif > day) return false;
          if(aff.date_inactif && aff.date_inactif < day) return false;
        }
        return true;
      });
      const cibles = await base.listCibles();
      return rows.map((aff) => {
        const target = cibles.find((row) => matchesAssignmentToEventTarget(aff, row));
        return {
          affectation_id: aff.affectation_id,
          personne_id: aff.personne_id,
          cible_id: target && target.cible_id,
          categorie: aff.categorie,
          domaine: aff.domaine,
          cible: aff.cible,
          role_domaine: aff.role_domaine || null,
          domaine_code: aff.domaine,
          niveau_code: aff.cible,
          date_debut: aff.date_actif,
          date_fin: aff.date_inactif || null,
          date_actif: aff.date_actif,
          date_inactif: aff.date_inactif || null,
          source: 'LEGACY_TEST'
        };
      });
    },
    async listAffectationsForCibles(cibleIds, date){
      return matchingAffectations(cibleIds, date);
    }
  };
}

async function seedPerson(repo, spec){
  return repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: '2026-01-01'
  });
}

async function frozenEvent(service, cibles, date, libelle){
  const rows = Array.isArray(cibles) ? cibles : [cibles];
  const created = await service.createEvenement({
    date,
    domaineCode: rows[0].domaine_code,
    libelle,
    cibleIds: rows.map((row) => row.cible_id)
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return service.lireEvenement(created.evenement.evenement_id);
}

function attenduFor(fiche, personneId){
  return (fiche.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

function excludedFor(fiche, personneId){
  return (fiche.attendusExclus || fiche.attendus_exclus || []).find((row) => String(row.personne_id) === String(personneId));
}

function participationFor(fiche, personneId){
  return (fiche.participations || []).find((row) => String(row.personne_id) === String(personneId));
}

async function setupLegacyFoba({ dateActif = '2026-01-01', dateInactif = null, includeFoba2 = true } = {}){
  const base = createMemoryRepo();
  const foba1 = await base.findCible('FOBA', '1');
  const foba2 = await base.findCible('FOBA', '2');
  const y2 = await base.findCible('DAP', 'Y2');
  const person = await seedPerson(base, { nip: '48359-LIKE', nom: 'Buffat', prenom: 'Noémie' });
  const baseService = createScopeService(base);
  const event = await frozenEvent(baseService, includeFoba2 ? [foba1, foba2] : [foba1], '2026-03-25', 'Exercice FOBA 1 + FOBA 2');
  const assignments = [
    { affectation_id: 'aff-dap-y2', personne_id: person.personne_id, categorie: 'OI', domaine: 'DAP', cible: 'Y2', role_domaine: 'PRINCIPAL', date_actif: '2026-01-01', date_inactif: null },
    { affectation_id: 'aff-foba-1', personne_id: person.personne_id, categorie: 'SPECIALISATION', domaine: 'FOBA', cible: 'FOBA 1', role_domaine: null, date_actif: dateActif, date_inactif: dateInactif }
  ];
  const repo = legacyRepo(base, assignments);
  const service = createScopeService(repo);
  return { base, repo, service, person, foba1, foba2, y2, event };
}

(async () => {
  await record('A — Noémie type FOBA 1 réelle incluse une fois dans FOBA 1 + FOBA 2', async () => {
    const { service, person, event } = await setupLegacyFoba();
    let fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.strictEqual(attenduFor(fiche, person.personne_id), undefined);
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(sync.eventsRecalculated, 1);
    assert.strictEqual(sync.attendusAdded, 1);
    fiche = await service.lireEvenement(event.evenement.evenement_id);
    const attendu = attenduFor(fiche, person.personne_id);
    assert.ok(attendu);
    assert.strictEqual(attendu.origine, 'REGLE');
    assert.match(String(attendu.motif_inclusion || ''), /FOBA_1/);
    assert.ok(!String(attendu.motif_inclusion || '').includes('FOBA_2'));
  });

  await record('B — FOBA 1 avant dateActif absent', async () => {
    const { service, person, event } = await setupLegacyFoba({ dateActif: '2026-04-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(sync.eventsRecalculated, 0);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.strictEqual(attenduFor(fiche, person.personne_id), undefined);
  });

  await record('C — FOBA 1 dateActif égale date événement présent', async () => {
    const { service, person, event } = await setupLegacyFoba({ dateActif: '2026-03-25' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(sync.attendusAdded, 1);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.ok(attenduFor(fiche, person.personne_id));
  });

  await record('D — dateInactif strictement avant absent, égale date événement présent', async () => {
    const before = await setupLegacyFoba({ dateInactif: '2026-03-24' });
    const syncBefore = await before.service.syncExpectedPopulationForPersonnes([before.person.personne_id], ACTOR);
    assert.strictEqual(syncBefore.eventsRecalculated, 0);
    assert.strictEqual(attenduFor(await before.service.lireEvenement(before.event.evenement.evenement_id), before.person.personne_id), undefined);

    const sameDay = await setupLegacyFoba({ dateInactif: '2026-03-25' });
    const syncSameDay = await sameDay.service.syncExpectedPopulationForPersonnes([sameDay.person.personne_id], ACTOR);
    assert.strictEqual(syncSameDay.attendusAdded, 1);
    assert.ok(attenduFor(await sameDay.service.lireEvenement(sameDay.event.evenement.evenement_id), sameDay.person.personne_id));
  });

  await record('E — multi-cibles FOBA ne mélange pas FOBA 1 avec FOBA 2', async () => {
    const { service, person, event } = await setupLegacyFoba();
    await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.strictEqual((await service.previewAttendus(event.evenement.evenement_id)).personnes.filter((row) => String(row.personneId) === String(person.personne_id)).length, 1);
    assert.match(String(attenduFor(fiche, person.personne_id).motif_inclusion || ''), /FOBA_1/);
    assert.ok(!String(attenduFor(fiche, person.personne_id).motif_inclusion || '').includes('FOBA_2'));
  });

  await record('F — sync idempotente sans doublon', async () => {
    const { repo, service, person, event } = await setupLegacyFoba();
    await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    const second = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(second.eventsRecalculated, 0);
    assert.strictEqual((await repo.listAttendus(event.evenement.evenement_id)).filter((row) => String(row.personne_id) === String(person.personne_id)).length, 1);
  });

  await record('G — participation historique préservée et REALISE non reconstruit', async () => {
    const { repo, service, person, event } = await setupLegacyFoba();
    await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    let fiche = await service.lireEvenement(event.evenement.evenement_id);
    await service.enregistrerParticipations(event.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', commentaire: 'historique' }]
    }, ACTOR);
    repo.updateLegacyAssignment('aff-foba-1', { date_actif: '2026-04-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(sync.attendusRemoved, 1);
    fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.ok(excludedFor(fiche, person.personne_id));
    assert.strictEqual(participationFor(fiche, person.personne_id).commentaire, 'historique');

    const realised = await setupLegacyFoba({ dateActif: '2026-04-01' });
    const realisedUpdated = await realised.repo.updateEventIfVersion(realised.event.evenement.evenement_id, realised.event.evenement.version, { statut: 'REALISE' });
    assert.ok(realisedUpdated);
    const frozen = await realised.service.syncExpectedPopulationForPersonnes([realised.person.personne_id], ACTOR);
    assert.strictEqual(frozen.eventsRecalculated, 0);
    assert.strictEqual(attenduFor(await realised.service.lireEvenement(realised.event.evenement.evenement_id), realised.person.personne_id), undefined);
  });

  await record('H — ajout manuel utilise la même résolution et reste REGLE', async () => {
    const { service, person, event } = await setupLegacyFoba();
    const added = await service.ajouterException(event.evenement.evenement_id, {
      baseVersion: event.evenement.version,
      personneId: person.personne_id,
      role: 'PARTICIPANT'
    }, ACTOR);
    assert.ok(added.version);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    const attendu = attenduFor(fiche, person.personne_id);
    assert.ok(attendu);
    assert.strictEqual(attendu.origine, 'REGLE');
    assert.match(String(attendu.motif_inclusion || ''), /FOBA_1/);
  });

  await record('Résolution canonique — formes FOBA/AUTO/PR/DPS/DAP/JSP', async () => {
    assert.strictEqual(normalizeTargetCode('FOBA', 'FOBA 1'), '1');
    assert.strictEqual(normalizeTargetCode('FOBA', 'FOBA/2'), '2');
    assert.strictEqual(normalizeTargetCode('FOBA', 'FOBA_3'), '3');
    assert.strictEqual(normalizeTargetCode('FOBA', '3'), '3');
    assert.ok(matchesAssignmentToEventTarget(
      { domaine: 'FOBA', cible: 'FOBA_3' },
      { domaine_code: 'FOBA', niveau_code: '3' }
    ));
    assert.ok(!matchesAssignmentToEventTarget(
      { domaine: 'FOBA', cible: '2' },
      { domaine_code: 'FOBA', niveau_code: '3' }
    ));
    assert.strictEqual(normalizeTargetCode('AUTO', 'Cond PL'), 'PL');
    assert.strictEqual(normalizeTargetCode('AUTO', 'Cond VL DPS'), 'VL');
    assert.strictEqual(normalizeTargetCode('PR', 'PAPR G1'), 'G1');
    assert.strictEqual(normalizeTargetCode('DPS', 'DPS B1'), 'B1');
    assert.strictEqual(normalizeTargetCode('DAP', 'DAP Y2'), 'Y2');
    assert.strictEqual(normalizeTargetCode('JSP', 'JSP C1'), 'C1');
  });

  await record('PostgreSQL join cible utilise la normalisation canonique', async () => {
    const sql = pgCibleJoinCondition('a');
    assert.ok(sql.includes('upper(c.libelle) = upper(a.cible)'));
    assert.ok(sql.includes('regexp_replace'));
    assert.ok(sql.includes("upper(c.niveau_code)"));
    assert.ok(sql.includes('([123])'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-FOBA-TARGET-RESOLUTION-FIX-4: PASS');
})();

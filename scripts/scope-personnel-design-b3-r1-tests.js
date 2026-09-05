#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { TYPES_PERIODE, MOTIFS_INDISPONIBLE } = require('../netlify/lib/_scope-personnel');
const { isAffectationValide } = require('../netlify/lib/_scope-rules');
const temporal = require('../assets/js/scope-personnel-temporal.js');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const inactivate = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-inactivate.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');

const results = [];
const NIP = '36581';

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function saisieNips(fiche){
  return logic.saisieAttendusFromFiche(fiche).map((row) => {
    const person = (fiche.personnes && (fiche.personnes[row.personne_id] || fiche.personnes[String(row.personne_id)])) || {};
    return person.nip || row.nip;
  });
}

async function seedPersonne(repo, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade || 'Sap',
    date_entree: spec.date_entree || '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: spec.cibleId,
    date_debut: spec.affDebut || '2020-01-01'
  });
  return personne;
}

async function freezeEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'b3-r1' });
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'b3-r1' });
  return service.lireEvenement(created.evenement.evenement_id);
}

(async () => {
  await record('01 — Sauser 13.01 absent de la LISTE DE SAISIE après congé + sync', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const sauser = await seedPersonne(repo, {
      nip: NIP, nom: 'Sauser', prenom: 'Raphaël', cibleId: jspB1.cible_id
    });
    const frozen = await freezeEvent(service, jspB1, '2026-01-13', 'Exercice JSP 1');
    assert.ok(saisieNips(frozen).includes(NIP), 'précondition : présent avant congé');

    await repo.insertPeriode({
      personne_id: sauser.personne_id,
      type: TYPES_PERIODE.INDISPONIBLE,
      motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
      date_debut: '2026-01-01',
      date_fin: '2026-06-30'
    });
    const sync = await service.syncExpectedPopulationForPersonnes(
      [sauser.personne_id],
      { sub: 'b3-r1' },
      { reason: 'PERSONNEL_SABBATICAL_CREATE', from: '2026-01-01', to: '2026-06-30' }
    );
    assert.ok(sync.eventsRecalculated >= 1);

    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.ok(!saisieNips(fiche).includes(NIP));
    assert.ok(!fiche.attendus.some((row) => row.personne_id === sauser.personne_id && row.inclus !== false));
    assert.ok(!['ABSENT_NON_EXCUSE', 'ABSENT_EXCUSE', 'DISPENSE'].includes(
      ((fiche.participations || []).find((row) => row.personne_id === sauser.personne_id) || {}).statut
    ));
    assert.ok(ui.includes('saisieAttendusFromFiche'));
    assert.ok(ui.includes('function buildSaisieFromFiche'));
  });

  await record('02 — saisie exclut le congé même si la population figée n’a pas encore été sync', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const sauser = await seedPersonne(repo, {
      nip: NIP, nom: 'Sauser', prenom: 'Raphaël', cibleId: jspB1.cible_id
    });
    const frozen = await freezeEvent(service, jspB1, '2026-01-13', 'Exercice JSP 1 stale');
    await repo.insertPeriode({
      personne_id: sauser.personne_id,
      type: TYPES_PERIODE.INDISPONIBLE,
      motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
      date_debut: '2026-01-01',
      date_fin: '2026-06-30'
    });
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.ok(!saisieNips(fiche).includes(NIP));
  });

  await record('03 — 01.07 : Sauser de nouveau dans la population attendue / saisie', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const sauser = await seedPersonne(repo, {
      nip: NIP, nom: 'Sauser', prenom: 'Raphaël', cibleId: jspB1.cible_id
    });
    await repo.insertPeriode({
      personne_id: sauser.personne_id,
      type: TYPES_PERIODE.INDISPONIBLE,
      motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
      date_debut: '2026-01-01',
      date_fin: '2026-06-30'
    });
    const july = await freezeEvent(service, jspB1, '2026-07-01', 'Exercice JSP après congé');
    assert.ok(saisieNips(july).includes(NIP));
  });

  await record('04 — analytics pendant congé : hors dénominateur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const people = [];
    for(let i = 1; i <= 10; i += 1){
      people.push(await seedPersonne(repo, {
        nip: i === 1 ? NIP : `B3R1${i}`,
        nom: i === 1 ? 'Sauser' : `Nom${i}`,
        prenom: i === 1 ? 'Raphaël' : `Prenom${i}`,
        cibleId: jspB1.cible_id
      }));
    }
    const created = await service.createEvenement({
      date: '2026-01-13', domaineCode: 'JSP', libelle: 'Analytics R1', cibleIds: [jspB1.cible_id]
    }, { sub: 'b3-r1' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'b3-r1' });
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'b3-r1' });
    const saved = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: saved.evenement.version }, { sub: 'b3-r1' });
    await repo.insertPeriode({
      personne_id: people[0].personne_id,
      type: TYPES_PERIODE.INDISPONIBLE,
      motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
      date_debut: '2026-01-01',
      date_fin: '2026-06-30'
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-06-30', domaineCode: 'JSP' });
    assert.strictEqual(summary.officiel.denominator, 9);
  });

  await record('05 — clôture FOBA 3 01.01 → 01.01 : éligible le 01.01, plus le 02.01', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba3 = await repo.findCible('FOBA', '3');
    const person = await seedPersonne(repo, {
      nip: 'FOBA301', nom: 'Test', prenom: 'Foba', cibleId: foba3.cible_id, affDebut: '2026-01-01'
    });
    const affs = await repo.listAffectations({ personneId: person.personne_id });
    const aff = affs[0];
    const dayOne = await freezeEvent(service, foba3, '2026-01-01', 'FOBA 3 jour unique');
    const dayTwo = await freezeEvent(service, foba3, '2026-01-02', 'FOBA 3 lendemain');
    assert.ok(saisieNips(dayOne).includes('FOBA301'));
    assert.ok(saisieNips(dayTwo).includes('FOBA301'));

    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-01-01' });
    assert.ok(isAffectationValide(await repo.listAffectations({ personneId: person.personne_id }).then((rows) => rows[0]), '2026-01-01'));
    assert.ok(!isAffectationValide((await repo.listAffectations({ personneId: person.personne_id }))[0], '2026-01-02'));

    const sync = await service.syncExpectedPopulationForPersonnes(
      [person.personne_id],
      { sub: 'b3-r1' },
      { reason: 'CLOTURER_AFFECTATION', from: '2026-01-02' }
    );
    assert.ok(sync.eventsScanned >= 1);
    const afterOne = await service.lireEvenement(dayOne.evenement.evenement_id);
    const afterTwo = await service.lireEvenement(dayTwo.evenement.evenement_id);
    assert.ok(saisieNips(afterOne).includes('FOBA301'));
    assert.ok(!saisieNips(afterTwo).includes('FOBA301'));
    const plan = temporal.planSingleAssignmentClosure({
      dateActif: '2026-01-01', dateInactif: ''
    }, '2026-01-02');
    assert.ok(plan.canProceed);
    assert.strictEqual(plan.close[0].dateInactif, '2026-01-01');
  });

  await record('06 — clôture normale + 2027 bornée + réalisé intact + pas de timeout UI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPersonne(repo, {
      nip: 'NORM01', nom: 'Normale', prenom: 'Cloture', cibleId: foba1.cible_id, affDebut: '2026-01-01'
    });
    const planned = await freezeEvent(service, foba1, '2026-03-15', 'FOBA planifié');
    const realised = await freezeEvent(service, foba1, '2026-02-01', 'FOBA réalisé');
    await service.enregistrerParticipations(realised.evenement.evenement_id, {
      baseVersion: realised.evenement.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, { sub: 'b3-r1' });
    const afterSave = await service.lireEvenement(realised.evenement.evenement_id);
    await service.cloturer(realised.evenement.evenement_id, { baseVersion: afterSave.evenement.version }, { sub: 'b3-r1' });

    const aff = (await repo.listAffectations({ personneId: person.personne_id }))[0];
    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-03-01' });
    const sync = await service.syncExpectedPopulationForPersonnes(
      [person.personne_id],
      { sub: 'b3-r1' },
      { reason: 'CLOTURER_AFFECTATION', from: '2026-03-02' }
    );
    const plannedAfter = await service.lireEvenement(planned.evenement.evenement_id);
    const realisedAfter = await service.lireEvenement(realised.evenement.evenement_id);
    assert.ok(!saisieNips(plannedAfter).includes('NORM01'));
    assert.ok(realisedAfter.attendus.some((row) => row.personne_id === person.personne_id && row.inclus !== false));
    assert.strictEqual(realisedAfter.participations.find((row) => row.personne_id === person.personne_id).statut, 'PRESENT');

    const future = await freezeEvent(service, foba1, '2026-06-01', 'FOBA 2026 distant');
    const sync2027 = await service.syncExpectedPopulationForPersonnes(
      [person.personne_id],
      { sub: 'b3-r1' },
      { from: '2027-01-01' }
    );
    assert.strictEqual(sync2027.eventsScanned, 0);
    assert.ok(future.evenement);

    assert.ok(inactivate.includes("isAssignmentClose"));
    assert.ok(inactivate.includes('{ from: dateFin }'));
    assert.ok(serviceSrc.includes('evaluatePersonExpectedForEvent'));
    assert.ok(serviceSrc.includes("reason || '') === 'PERSONNEL_SABBATICAL_CREATE'"));
    const timeoutInfo = logic.personnelMutationError({ status: 504, message: 'Timeout' });
    assert.ok(!/délai d’exécution dépassé/i.test(timeoutInfo.message));
    assert.ok(!/timeout/i.test(timeoutInfo.message));
    assert.ok(!/netlify/i.test(timeoutInfo.message));
    const metier = logic.personnelMutationError({ status: 422, message: 'Cette affectation est déjà clôturée.' });
    assert.strictEqual(metier.message, 'Cette affectation est déjà clôturée.');
    const submitFn = ui.slice(ui.indexOf('async function submitPersonnelAssignmentModal'), ui.indexOf('function renderPersonneActivityCard'));
    assert.ok(submitFn.includes('personnelMutationError'));
    assert.ok(!submitFn.includes('ScopeFeedback.error'));
    assert.ok(html.includes('scope-personnel-design-b3-r1') || html.includes('scope-personnel-design-b3-r2') || html.includes('scope-personnel-design-b4') || html.includes('scope-events-multisession-1'));
    assert.ok(sync.eventsRecalculated >= 1);
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`SCOPE-PERSONNEL-DESIGN-B3-R1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PERSONNEL-DESIGN-B3-R1: ${results.length} PASS`);
})();

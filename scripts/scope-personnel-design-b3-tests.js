#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { evaluateEligibility, TYPES_PERIODE, MOTIFS_INDISPONIBLE } = require('../netlify/lib/_scope-personnel');
const display = require('../assets/js/scope-personnel-display.js');
const temporal = require('../assets/js/scope-personnel-temporal.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const inactivate = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-inactivate.js'), 'utf8');
const detail = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-detail.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const personnelSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-service.js'), 'utf8');

const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
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
  if(spec.cibleId){
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: spec.cibleId,
      date_debut: spec.affDebut || '2020-01-01'
    });
  }
  return personne;
}

async function openSabbatical(repo, personneId, from, to){
  return repo.insertPeriode({
    personne_id: personneId,
    type: TYPES_PERIODE.INDISPONIBLE,
    motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
    date_debut: from,
    date_fin: to,
    source: 'MANUEL'
  });
}

async function createFrozenEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'b3' });
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'b3' });
  return service.lireEvenement(created.evenement.evenement_id);
}

function sauserBundle(periodes){
  return {
    nom: 'Sauser',
    prenom: 'Raphaël',
    affectations: [{
      categorie: 'OI',
      domaine: 'JSP',
      cible: 'B1',
      roleDomaine: 'PRINCIPAL',
      dateActif: '2020-01-01',
      dateInactif: ''
    }],
    periodes: periodes || [{
      type: 'INDISPONIBLE',
      motif: 'CONGE_SABBATIQUE',
      date_debut: '2026-01-01',
      date_fin: '2026-06-30'
    }]
  };
}

(async () => {
  await record('01 — Sauser Raphaël hors population le 13.01, éligible le 01.07', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    assert.ok(jspB1, 'cible JSP B1 absente');
    const sauser = await seedPersonne(repo, {
      nip: 'SAUSER-B3',
      nom: 'Sauser',
      prenom: 'Raphaël',
      cibleId: jspB1.cible_id
    });
    await openSabbatical(repo, sauser.personne_id, '2026-01-01', '2026-06-30');
    const periodes = await repo.listPersonnesPeriodes(sauser.personne_id);
    assert.strictEqual(evaluateEligibility(sauser, periodes, '2026-01-13').eligible, false);
    assert.strictEqual(evaluateEligibility(sauser, periodes, '2026-01-13').reason, 'indisponible');
    assert.strictEqual(evaluateEligibility(sauser, periodes, '2026-06-30').eligible, false);
    assert.strictEqual(evaluateEligibility(sauser, periodes, '2026-07-01').eligible, true);

    const jan = await createFrozenEvent(service, jspB1, '2026-01-13', 'JSP B1 pendant congé');
    assert.strictEqual(jan.attendus.some((row) => row.personne_id === sauser.personne_id), false);
    assert.ok(!jan.participations.some((row) => row.personne_id === sauser.personne_id && row.statut !== 'NON_CONCERNE'));

    const jul = await createFrozenEvent(service, jspB1, '2026-07-01', 'JSP B1 après congé');
    const attenduJul = jul.attendus.find((row) => row.personne_id === sauser.personne_id);
    assert.ok(attenduJul);
    assert.strictEqual(attenduJul.inclus, true);
  });

  await record('02 — population figée resynchronisée après congé rétroactif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const sauser = await seedPersonne(repo, {
      nip: 'SAUSER-FIGE',
      nom: 'Sauser',
      prenom: 'Raphaël',
      cibleId: jspB1.cible_id
    });
    const frozen = await createFrozenEvent(service, jspB1, '2026-01-13', 'JSP figé avant congé');
    assert.ok(frozen.attendus.some((row) => row.personne_id === sauser.personne_id));

    await openSabbatical(repo, sauser.personne_id, '2026-01-01', '2026-06-30');
    const sync = await service.syncExpectedPopulationForPersonnes(
      [sauser.personne_id],
      { sub: 'b3' },
      { reason: 'PERSONNEL_SABBATICAL_CREATE', from: '2026-01-01', to: '2026-06-30' }
    );
    assert.ok(sync.eventsRecalculated >= 1);
    const after = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.strictEqual(after.attendus.some((row) => row.personne_id === sauser.personne_id), false);
    assert.ok(after.attendusExclus.some((row) => row.personne_id === sauser.personne_id && row.inclus === false));
  });

  await record('03 — analytics : 10 affectés, 1 en congé → dénominateur 9', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const jspB1 = await repo.findCible('JSP', 'B1');
    const people = [];
    for(let i = 1; i <= 10; i += 1){
      people.push(await seedPersonne(repo, {
        nip: `B3A${String(i).padStart(2, '0')}`,
        nom: `Nom${i}`,
        prenom: `Prenom${i}`,
        cibleId: jspB1.cible_id
      }));
    }
    const created = await service.createEvenement({
      date: '2026-01-13',
      domaineCode: 'JSP',
      libelle: 'Analytics congé',
      cibleIds: [jspB1.cible_id]
    }, { sub: 'b3' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'b3' });
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'b3' });
    const afterSave = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.evenement.version }, { sub: 'b3' });

    await openSabbatical(repo, people[0].personne_id, '2026-01-01', '2026-06-30');
    const summaryLeave = await analytics.summary({ from: '2026-01-01', to: '2026-06-30', domaineCode: 'JSP' });
    assert.strictEqual(summaryLeave.officiel.denominator, 9);
    assert.strictEqual(summaryLeave.officiel.numerator, 9);
    assert.strictEqual(summaryLeave.officiel.volumes.nonExcuses || 0, 0);

    const ratesPayload = await analytics.directoryRates({ from: '2026-01-01', to: '2026-06-30', domaineCode: 'JSP' });
    const leaveRate = (ratesPayload.rates || {})[people[0].personne_id];
    assert.ok(!leaveRate || Number(leaveRate.denominator || 0) === 0);

    const createdAfter = await service.createEvenement({
      date: '2026-07-01',
      domaineCode: 'JSP',
      libelle: 'Analytics après congé',
      cibleIds: [jspB1.cible_id]
    }, { sub: 'b3' });
    await service.figerPopulation(createdAfter.evenement.evenement_id, { baseVersion: createdAfter.evenement.version }, { sub: 'b3' });
    const july = await service.lireEvenement(createdAfter.evenement.evenement_id);
    assert.strictEqual(july.attendus.filter((row) => row.inclus !== false).length, 10);
    await service.enregistrerParticipations(createdAfter.evenement.evenement_id, {
      baseVersion: july.evenement.version,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'b3' });
    const julySaved = await service.lireEvenement(createdAfter.evenement.evenement_id);
    await service.cloturer(createdAfter.evenement.evenement_id, { baseVersion: julySaved.evenement.version }, { sub: 'b3' });
    const summaryAfter = await analytics.summary({ from: '2026-07-01', to: '2026-07-01', domaineCode: 'JSP' });
    assert.strictEqual(summaryAfter.officiel.denominator, 10);
  });

  await record('04 — liste Personnel : Actif sur l’année, Congé à la date, colonne CONGÉ', async () => {
    const person = sauserBundle();
    const year = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
    assert.strictEqual(temporal.evaluateStatus(person, year), 'actif');
    assert.strictEqual(display.sabbaticalColumnLabel(person, year), '01.01.2026 → 30.06.2026');
    assert.strictEqual(temporal.evaluateStatus(person, year, '2026-03-15'), 'conge_sabbatique');
    assert.strictEqual(temporal.evaluateStatus(person, year, '2026-07-01'), 'actif');
    assert.ok(ui.includes('CONGÉ SABBATIQUE'));
    assert.ok(ui.includes("personnelSortHeader('sabbatical', 'CONGÉ SABBATIQUE')"));
  });

  await record('05 — recherche GRU / Grünig et champ vide sans ENTER', async () => {
    const grunig = { nip: '100', nom: 'Grünig', prenom: 'Thierry', affectationsOuvertes: [], affectations: [] };
    const other = { nip: '101', nom: 'Martin', prenom: 'Léo', affectationsOuvertes: [], affectations: [] };
    const rows = [grunig, other];
    assert.strictEqual(display.filterPersonnelRows(rows, { q: 'GRU' }).map((r) => r.nip).join(','), '100');
    assert.strictEqual(display.filterPersonnelRows(rows, { q: 'GR' }).map((r) => r.nip).join(','), '100');
    assert.strictEqual(display.filterPersonnelRows(rows, { q: 'G' }).map((r) => r.nip).join(','), '100');
    assert.strictEqual(display.filterPersonnelRows(rows, { q: '' }).map((r) => r.nip).join(','), '100,101');
    const searchFn = ui.slice(ui.indexOf('const personnelSearch'), ui.indexOf('document.getElementById(\'personnel-oi\')'));
    assert.ok(searchFn.includes("if (!String(el.value || '').trim())"));
    assert.ok(searchFn.includes('applyPersonnelSearch'));
    assert.ok(!searchFn.includes('loadPersonnelDirectory'));
    const loadFn = ui.slice(ui.indexOf('async function loadPersonnelDirectory'), ui.indexOf('async function loadPersonneFiche'));
    assert.ok(!loadFn.includes('q:'));
    assert.ok(!loadFn.includes('query:'));
  });

  await record('06 — fenêtre de sync 2027 n’inclut pas un événement 2026', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPersonne(repo, { nip: 'PAPR2027', nom: 'Future', prenom: 'Papr', cibleId: foba1.cible_id });
    await createFrozenEvent(service, foba1, '2026-03-01', 'FOBA 2026');
    const sync2027 = await service.syncExpectedPopulationForPersonnes(
      [person.personne_id],
      { sub: 'b3' },
      { from: '2027-01-01' }
    );
    assert.strictEqual(sync2027.eventsScanned, 0);
    assert.strictEqual(sync2027.eventsRecalculated, 0);
    const sync2026 = await service.syncExpectedPopulationForPersonnes(
      [person.personne_id],
      { sub: 'b3' },
      { from: '2026-01-01', to: '2026-12-31' }
    );
    assert.ok(sync2026.eventsScanned >= 1);
  });

  await record('07 — identité PAPR canonique (pas de faux doublon FOBA vs PAPR)', async () => {
    assert.strictEqual(display.specializationCode({ domaine: 'PR', cible: 'PR' }), 'PAPR');
    assert.strictEqual(display.specializationCode({ domaine: 'PAPR', cible: 'PAPR' }), 'PAPR');
    assert.strictEqual(display.specializationCode('PAPR'), 'PAPR');
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: '1' }), 'FOBA_1');
    assert.notStrictEqual(display.specializationCode('PAPR'), display.specializationCode({ domaine: 'FOBA', cible: '1' }));
    assert.ok(personnelSrc.includes('function assignmentIdentityKey'));
    assert.ok(personnelSrc.includes('SPEC:${code}'));
  });

  await record('08 — Gérer les affectations / clôture / UX / erreurs uniques', async () => {
    assert.ok(ui.includes('Gérer les affectations'));
    assert.ok(ui.includes('Clôturer une affectation'));
    assert.ok(ui.includes('Ajouter l’affectation') || ui.includes("Ajouter l’affectation"));
    assert.ok(ui.includes('Clôturer l’affectation') || ui.includes("Clôturer l’affectation"));
    assert.ok(ui.includes('DERNIER JOUR ACTIF'));
    assert.ok(ui.includes("action: 'close_assignment'"));
    const submitFn = ui.slice(ui.indexOf('async function submitPersonnelAssignmentModal'), ui.indexOf('function renderPersonneActivityCard'));
    assert.ok(submitFn.includes('state.personnelAssignment'));
    assert.ok(submitFn.includes('error:'));
    assert.ok(!submitFn.includes('ScopeFeedback.error'));
    assert.ok(inactivate.includes('PERSONNEL_SABBATICAL_CREATE'));
    assert.ok(inactivate.includes('{ from: dateFin }'));
    assert.ok(detail.includes('from: body.dateActif'));
    assert.ok(serviceSrc.includes('function eventDateInSyncWindow'));
    assert.ok(html.includes('scope-personnel-design-b3') || html.includes('scope-personnel-design-b4') || html.includes('scope-events-multisession-1'));
    assert.ok(!ui.includes('if sabbatical => display:none'));
    assert.ok(!ui.includes('display:none') || !/sabbatical[\s\S]{0,80}display:\s*none/.test(ui));
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
    console.error(`SCOPE-PERSONNEL-DESIGN-B3: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PERSONNEL-DESIGN-B3: ${results.length} PASS`);
})();

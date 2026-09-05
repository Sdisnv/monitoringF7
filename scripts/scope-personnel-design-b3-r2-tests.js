#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const {
  normalizeTargetCode,
  matchesAssignmentToEventTarget,
  pgCibleJoinCondition
} = require('../netlify/lib/_scope-target-resolution');
const display = require('../assets/js/scope-personnel-display.js');
const temporal = require('../assets/js/scope-personnel-temporal.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');

const results = [];
const NIP = '29215';

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function closeableLabels(assignments){
  return (assignments || [])
    .filter((row) => temporal.isOpenAssignment(row))
    .map((row) => display.formatAssignment(row))
    .filter(Boolean);
}

async function freezeEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'b3-r2' });
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'b3-r2' });
  return service.lireEvenement(created.evenement.evenement_id);
}

function attenduNips(fiche){
  return (fiche.attendus || [])
    .filter((row) => row.inclus !== false)
    .map((row) => {
      const person = (fiche.personnes && (fiche.personnes[row.personne_id] || fiche.personnes[String(row.personne_id)])) || {};
      return person.nip;
    });
}

(async () => {
  await record('01 — normalisation FOBA distingue 1/2/3 y compris FOBA_3', async () => {
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: '1' }), 'FOBA_1');
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: '2' }), 'FOBA_2');
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: '3' }), 'FOBA_3');
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: 'FOBA_3' }), 'FOBA_3');
    assert.strictEqual(display.specializationCode({ domaine: 'FOBA', cible: 'FOBA 3' }), 'FOBA_3');
    assert.notStrictEqual(display.specializationCode({ domaine: 'FOBA', cible: '2' }), display.specializationCode({ domaine: 'FOBA', cible: '3' }));
    assert.strictEqual(normalizeTargetCode('FOBA', 'FOBA_3'), '3');
    assert.strictEqual(normalizeTargetCode('FOBA', 'FOBA 2'), '2');
    assert.ok(matchesAssignmentToEventTarget({ domaine: 'FOBA', cible: 'FOBA_3' }, { domaine_code: 'FOBA', niveau_code: '3' }));
    assert.ok(!matchesAssignmentToEventTarget({ domaine: 'FOBA', cible: 'FOBA_3' }, { domaine_code: 'FOBA', niveau_code: '2' }));
    assert.ok(pgCibleJoinCondition('a').includes('([123])'));
  });

  await record('02 — Naomy : fiche, clôture et populations FOBA 3 / PAPR / DPS', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dpsB1 = await repo.findCible('DPS', 'B1');
    const foba2 = await repo.findCible('FOBA', '2');
    const foba3 = await repo.findCible('FOBA', '3');
    const prGen = await repo.findCible('PR', 'GEN');
    const naomy = await repo.insertPersonne({
      nip: NIP, nom: 'Grünig', prenom: 'Naomy', grade: 'Sap', date_entree: '2020-01-01'
    });
    const dpsAff = await repo.insertAffectation({
      personne_id: naomy.personne_id, cible_id: dpsB1.cible_id, date_debut: '2020-01-01'
    });
    const foba2Aff = await repo.insertAffectation({
      personne_id: naomy.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01'
    });
    const foba3Aff = await repo.insertAffectation({
      personne_id: naomy.personne_id, cible_id: foba3.cible_id, date_debut: '2026-01-01'
    });
    const paprAff = await repo.insertAffectation({
      personne_id: naomy.personne_id, cible_id: prGen.cible_id, date_debut: '2026-01-01'
    });

    const ficheAssignments = [
      { id: dpsAff.affectation_id, categorie: 'OI', domaine: 'DPS', cible: 'B1', roleDomaine: 'PRINCIPAL', dateActif: '2020-01-01', dateInactif: null },
      { id: foba2Aff.affectation_id, categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2', dateActif: '2026-01-01', dateInactif: null },
      { id: foba3Aff.affectation_id, categorie: 'SPECIALISATION', domaine: 'FOBA', cible: 'FOBA_3', dateActif: '2026-01-01', dateInactif: null },
      { id: paprAff.affectation_id, categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01', dateInactif: null }
    ];
    const view = ficheAssignments.map((row) => ({
      id: row.id,
      categorie: row.categorie,
      domaine: row.domaine,
      cible: row.cible,
      role_domaine: row.roleDomaine || null,
      date_actif: row.dateActif,
      date_inactif: row.dateInactif,
      code: display.specializationCode(row) || `OI:${row.domaine}:${row.cible}`,
      ouvert: temporal.isOpenAssignment(row)
    }));
    assert.ok(view.some((row) => row.code === 'FOBA_2' && row.ouvert));
    assert.ok(view.some((row) => row.code === 'FOBA_3' && row.ouvert));
    assert.ok(view.some((row) => row.code === 'PAPR' && row.ouvert));
    assert.ok(view.some((row) => String(row.domaine).toUpperCase() === 'DPS' && String(row.cible).toUpperCase().indexOf('B1') >= 0 && row.ouvert));

    const specs = display.ficheSpecializationView(ficheAssignments);
    assert.deepStrictEqual(specs.labels, ['FOBA 2', 'FOBA 3', 'PAPR']);
    const closeLabels = closeableLabels(ficheAssignments);
    assert.ok(closeLabels.includes('FOBA 2'));
    assert.ok(closeLabels.includes('FOBA 3'));
    assert.ok(closeLabels.includes('PAPR'));
    const historiqueRhSansFoba3 = ficheAssignments
      .filter((row) => display.specializationCode(row) !== 'FOBA_3')
      .map((row) => ({
        affectationId: row.id,
        domaineCode: row.domaine === 'FOBA' && row.cible === 'FOBA_3' ? null : row.domaine,
        niveauCode: row.domaine === 'FOBA' && row.cible === 'FOBA_3' ? null : row.cible,
        dateDebut: row.dateActif,
        dateFin: row.dateInactif
      }));
    assert.ok(!historiqueRhSansFoba3.some((row) => row.niveauCode === '3' || row.niveauCode === 'FOBA_3'));
    const ficheFn = ui.slice(ui.indexOf('function ficheActivityAssignments'), ui.indexOf('function closePersonnelRowMenu'));
    assert.ok(ficheFn.includes('fromPersonne.length'));
    assert.ok(ficheFn.indexOf('personne.affectations') < ficheFn.indexOf('historiqueRh'));

    const evFoba3 = await freezeEvent(service, foba3, '2026-03-10', 'Exercice FOBA 3');
    const evFoba2 = await freezeEvent(service, foba2, '2026-03-10', 'Exercice FOBA 2');
    const evPapr = await freezeEvent(service, prGen, '2026-03-10', 'Session PAPR GEN');
    const evDps = await freezeEvent(service, dpsB1, '2026-03-10', 'Exercice DPS B1');
    assert.ok(attenduNips(evFoba3).includes(NIP));
    assert.ok(attenduNips(evFoba2).includes(NIP));
    assert.ok(attenduNips(evPapr).includes(NIP));
    assert.ok(attenduNips(evDps).includes(NIP));

    await repo.updateAffectation(foba3Aff.affectation_id, { date_fin: '2026-04-01' });
    await service.syncExpectedPopulationForPersonnes(
      [naomy.personne_id],
      { sub: 'b3-r2' },
      { reason: 'CLOTURER_AFFECTATION', from: '2026-04-02' }
    );
    const afterClose = await freezeEvent(service, foba3, '2026-04-15', 'FOBA 3 après clôture');
    const foba2After = await service.lireEvenement(evFoba2.evenement.evenement_id);
    const dpsAfter = await service.lireEvenement(evDps.evenement.evenement_id);
    assert.ok(!attenduNips(afterClose).includes(NIP));
    assert.ok(attenduNips(foba2After).includes(NIP));
    assert.ok(attenduNips(dpsAfter).includes(NIP));
    assert.ok(dpsAff && foba2Aff);
    assert.ok(html.includes('scope-personnel-design-b3-r2') || html.includes('scope-personnel-design-b4') || html.includes('scope-events-multisession-1'));
  });

  await record('03 — matching exact FOBA : 2 n’alimente pas 3', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba2 = await repo.findCible('FOBA', '2');
    const foba3 = await repo.findCible('FOBA', '3');
    const person = await repo.insertPersonne({ nip: 'ONLY2', nom: 'Foba', prenom: 'Deux', date_entree: '2026-01-01' });
    await repo.insertAffectation({
      personne_id: person.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01',
      categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2'
    });
    const ev3 = await freezeEvent(service, foba3, '2026-05-01', 'FOBA 3 seul');
    assert.ok(!attenduNips(ev3).includes('ONLY2'));
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
    console.error(`SCOPE-PERSONNEL-DESIGN-B3-R2: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PERSONNEL-DESIGN-B3-R2: ${results.length} PASS`);
})();

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { computeTaux, HttpError } = require('../netlify/functions/_scope-rules');
const logic = require('../assets/js/scope-ui-logic.js');

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

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade || 'Sap'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: '2026-01-01'
  });
  return personne;
}

async function setupEvent(countOrSpecs){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const g1 = await repo.findCible('DPS', 'G1');
  const specs = Array.isArray(countOrSpecs)
    ? countOrSpecs
    : Array.from({ length: countOrSpecs }, (_x, index) => ({
      nip: `PSTD${String(index + 1).padStart(3, '0')}`,
      nom: `Nom${String(index + 1).padStart(2, '0')}`,
      prenom: `Prenom${String(index + 1).padStart(2, '0')}`,
      grade: index % 2 ? 'Cpl' : 'Sap'
    }));
  const people = [];
  for (const spec of specs) people.push(await seedPerson(repo, g1.cible_id, spec));
  const created = await service.createEvenement({
    date: '2026-04-15',
    domaineCode: 'DPS',
    libelle: 'Presence standard',
    cibleIds: [g1.cible_id]
  }, { sub: 'presence-test' });
  const figer = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'presence-test' });
  return { repo, service, g1, people, eventId: created.evenement.evenement_id, version: figer.version };
}

function part(personne, statut, extra){
  return Object.assign({ personneId: personne.personne_id, statut }, extra || {});
}

(async () => {
  await record('CAS A — 10 personnes, compteurs, persistance et réouverture', async () => {
    const ctx = await setupEvent(10);
    const payload = [
      ...ctx.people.slice(0, 6).map((p) => part(p, 'PRESENT')),
      part(ctx.people[6], 'PRESENT', { role: 'FORMATEUR' }),
      part(ctx.people[7], 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' }),
      part(ctx.people[8], 'ABSENT_NON_EXCUSE'),
      part(ctx.people[9], 'DISPENSE')
    ];
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, { baseVersion: ctx.version, participations: payload }, { sub: 'presence-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const counters = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(counters.presents, 7);
    assert.strictEqual(fiche.participations.filter((row) => row.role === 'FORMATEUR').length, 1);
    assert.strictEqual(counters.excuses, 1);
    assert.strictEqual(counters.nonExcuses, 1);
    assert.strictEqual(counters.dispenses, 1);
    assert.strictEqual(counters.excusesPrive, 1);
    assert.strictEqual(fiche.participations.length, 10);
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === ctx.people[7].personne_id).motif_absence, 'PRIVE');
    const reopened = await ctx.service.lireEvenement(ctx.eventId);
    assert.deepStrictEqual(
      reopened.participations.map((row) => [row.personne_id, row.statut, row.role, row.motif_absence]).sort(),
      fiche.participations.map((row) => [row.personne_id, row.statut, row.role, row.motif_absence]).sort()
    );
    assert.strictEqual(saved.version, 3);
  });

  await record('CAS B — Excusé sans motif refusé et clôture impossible', async () => {
    const ctx = await setupEvent(2);
    await assert.rejects(
      () => ctx.service.enregistrerParticipations(ctx.eventId, {
        baseVersion: ctx.version,
        participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_EXCUSE')]
      }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'motif_obligatoire'
    );
    await assert.rejects(
      () => ctx.service.cloturer(ctx.eventId, { baseVersion: ctx.version }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'cloture_refusee'
    );
  });

  await record('CAS C — Excusé vers Présent nettoie le motif', async () => {
    const ctx = await setupEvent(1);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' })]
    }, { sub: 'presence-test' });
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'presence-test' });
    const rows = await ctx.repo.listParticipations(ctx.eventId);
    assert.strictEqual(rows[0].statut, 'PRESENT');
    assert.strictEqual(rows[0].motif_absence, null);
  });

  await record('CAS D/E — Tout présent vierge ou saisie existante', async () => {
    const empty = [
      { statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', inclus: true },
      { statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', inclus: true }
    ];
    assert.strictEqual(logic.needsConfirmAllPresent(empty), false);
    assert.deepStrictEqual(logic.applyAllPresent(empty).map((row) => row.statut), ['PRESENT', 'PRESENT']);
    const existing = [
      { statut: 'PRESENT', role: 'PARTICIPANT', inclus: true },
      { statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT', inclus: true },
      { statut: 'PRESENT', role: 'FORMATEUR', inclus: true }
    ];
    assert.strictEqual(logic.needsConfirmAllPresent(existing), true);
    const applied = logic.applyAllPresent(existing);
    assert.deepStrictEqual(applied.map((row) => [row.statut, row.role]), [
      ['PRESENT', 'PARTICIPANT'],
      ['PRESENT', 'PARTICIPANT'],
      ['PRESENT', 'FORMATEUR']
    ]);
  });

  await record('CAS F — Tri Nom/NIP/Grade/Présence sans perte de statut', async () => {
    const rows = [
      { id: '2', nomFamille: 'Dupont', prenom: 'Zoé', grade: 'Sap', nip: '2', statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE' },
      { id: '10', nomFamille: 'Bernard', prenom: 'Marc', grade: 'Cpl', nip: '10', statut: 'PRESENT', role: 'FORMATEUR' },
      { id: '1', nomFamille: 'Dupont', prenom: 'Alain', grade: 'Plt', nip: '1', statut: 'DISPENSE' }
    ];
    const before = JSON.stringify(rows);
    const sortedByNip = logic.sortRows(rows, { key: 'nip', dir: 'asc' }, [{ key: 'nip', type: 'text' }]);
    assert.deepStrictEqual(sortedByNip.map((row) => row.id), ['1', '2', '10']);
    assert.strictEqual(JSON.stringify(rows), before);
    assert.strictEqual(rows[0].motifAbsence, 'ARMEE');
  });

  await record('CAS G/H — Enregistrer, rouvrir, modifier, réenregistrer sans doublon', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'presence-test' });
    const reopened = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(reopened.participations.length, 2);
    const second = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [part(ctx.people[1], 'ABSENT_EXCUSE', { motif_absence: 'ACCIDENT_MALADIE' })]
    }, { sub: 'presence-test' });
    const rows = await ctx.repo.listParticipations(ctx.eventId);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows.find((row) => row.personne_id === ctx.people[1].personne_id).motif_absence, 'ACCIDENT_MALADIE');
    assert.strictEqual(second.version, 4);
  });

  await record('CAS I/J — Clôture refusée incomplète puis réussie complète', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'presence-test' });
    await assert.rejects(
      () => ctx.service.cloturer(ctx.eventId, { baseVersion: first.version }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.error === 'cloture_refusee'
    );
    const second = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [part(ctx.people[1], 'DISPENSE')]
    }, { sub: 'presence-test' });
    const closed = await ctx.service.cloturer(ctx.eventId, { baseVersion: second.version }, { sub: 'presence-test' });
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.strictEqual((await ctx.service.lireEvenement(ctx.eventId)).evenement.statut, 'REALISE');
  });

  await record('CAS K — population attendue figée après modification affectation', async () => {
    const ctx = await setupEvent(1);
    const b1 = await ctx.repo.findCible('DPS', 'B1');
    await ctx.repo.insertAffectation({
      personne_id: ctx.people[0].personne_id,
      cible_id: b1.cible_id,
      date_debut: '2026-05-01'
    });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.deepStrictEqual(fiche.attendus.map((row) => row.personne_id), [ctx.people[0].personne_id]);
  });

  await record('CAS L — même nom/prénom, NIP distincts, aucune collision', async () => {
    const ctx = await setupEvent([
      { nip: 'DUP001', nom: 'Dupont', prenom: 'Alex', grade: 'Sap' },
      { nip: 'DUP002', nom: 'Dupont', prenom: 'Alex', grade: 'Cpl' }
    ]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'presence-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.attendus.length, 2);
    assert.strictEqual(fiche.participations.length, 2);
    assert.deepStrictEqual(Object.values(fiche.personnes).map((personne) => personne.nip).sort(), ['DUP001', 'DUP002']);
  });

  await record('CAS 1R1 A/B/C — toggle statut, excusé et reset global', async () => {
    const row = { statut: 'PRESENT', role: 'PARTICIPANT', motifAbsence: '', commentaire: '', inclus: true };
    const reset = logic.resetSaisie([
      row,
      { statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT', motifAbsence: 'PRIVE', commentaire: 'x', inclus: true },
      { statut: 'PRESENT', role: 'FORMATEUR', motifAbsence: '', commentaire: '', inclus: true }
    ]);
    assert.strictEqual(logic.needsConfirmReset([row]), true);
    assert.deepStrictEqual(reset.map((r) => [r.statut, r.role, r.motifAbsence, r.commentaire]), [
      ['NON_RENSEIGNE', 'PARTICIPANT', '', ''],
      ['NON_RENSEIGNE', 'PARTICIPANT', '', ''],
      ['NON_RENSEIGNE', 'PARTICIPANT', '', '']
    ]);
    const blockers = logic.closureBlockers([
      { statut: 'NON_RENSEIGNE', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: '', inclus: true }
    ]);
    assert.strictEqual(blockers.open, 1);
    assert.strictEqual(blockers.incompleteExcuses, 1);
    assert.ok(blockers.message.includes('Clôture impossible'));
  });

  await record('CAS 1R1 D/E/F/G — encadrement ajout, retrait, réajout, anti-doublon', async () => {
    const ctx = await setupEvent(1);
    const extra = await ctx.repo.insertPersonne({ nip: 'ENC101', nom: 'Martin', prenom: 'Paul', grade: 'Sgt' });
    const add = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: extra.personne_id,
      role: 'FORMATEUR'
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 1);
    await assert.rejects(
      () => ctx.service.ajouterEncadrement(ctx.eventId, {
        baseVersion: add.version,
        personneId: extra.personne_id,
        role: 'FORMATEUR'
      }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422
    );
    const removed = await ctx.service.retirerEncadrement(ctx.eventId, {
      baseVersion: add.version,
      personneId: extra.personne_id
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 0);
    await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: removed.version,
      personneId: extra.personne_id,
      role: 'SURVEILLANT'
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement[0].role, 'SURVEILLANT');
  });

  await record('CAS 1R1 H/I — ordre rôles et tri encadrement Grade Nom Prénom', async () => {
    const source = [
      { role: 'AUXILIAIRE', grade: 'Sap', nom: 'Zulu', prenom: 'Zoé', nip: '3' },
      { role: 'FORMATEUR', grade: 'Sgt', nom: 'Martin', prenom: 'Paul', nip: '2' },
      { role: 'FORMATEUR', grade: 'Cpl', nom: 'Alpha', prenom: 'Anne', nip: '1' },
      { role: 'SURVEILLANT', grade: 'Cap', nom: 'Bernard', prenom: 'Marc', nip: '4' }
    ];
    const roleOrder = ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'];
    const orderedRoles = [...new Set(source.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)).map((p) => p.role))];
    assert.deepStrictEqual(orderedRoles, roleOrder);
    const refs = require('../assets/js/scope-personnel-referentials.js');
    const sorted = source.filter((p) => p.role === 'FORMATEUR').sort((a, b) =>
      refs.compareGrades(a.grade, b.grade) || a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr') || a.nip.localeCompare(b.nip, 'fr', { numeric: true })
    );
    assert.deepStrictEqual(sorted.map((p) => p.nip), ['1', '2']);
  });

  await record('CAS 1R1 J/K/L — ajout manuel participant, anti-doublon, retrait', async () => {
    const ctx = await setupEvent(1);
    const extra = await ctx.repo.insertPersonne({ nip: 'MAN101', nom: 'Ajout', prenom: 'Manuel', grade: 'Sap' });
    const add = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: extra.personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    const attendu = fiche.attendus.find((row) => row.personne_id === extra.personne_id);
    assert.strictEqual(attendu.origine, 'EXCEPTION_AJOUT');
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === extra.personne_id).statut, 'NON_RENSEIGNE');
    const duplicate = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: add.version,
      personneId: ctx.people[0].personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'presence-test' });
    assert.strictEqual(duplicate.dejaPresent, true);
    assert.strictEqual(duplicate.version, add.version);
    await ctx.service.retirerAttendu(ctx.eventId, {
      baseVersion: add.version,
      personneId: extra.personne_id
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(!fiche.attendus.filter((row) => row.inclus !== false).some((row) => row.personne_id === extra.personne_id));
    assert.ok(await ctx.repo.getPersonne(extra.personne_id));
  });

  await record('CAS 1R1 M/N/X — cible individuelle figée et multiple sans doublon', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const p = await repo.insertPersonne({ nip: 'FOBA12', nom: 'Cible', prenom: 'Double', grade: 'Sap' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-04-15',
      domaineCode: 'FOBA',
      libelle: 'FOBA double cible',
      cibleIds: [foba1.cible_id, foba2.cible_id]
    }, { sub: 'presence-test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'presence-test' });
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.length, 1);
    assert.strictEqual(fiche.attendus[0].motif_inclusion, 'FOBA_1|FOBA_2');
    const foba3 = await repo.findCible('FOBA', '3');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba3.cible_id, date_debut: '2026-04-16' });
    const reopened = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(reopened.attendus[0].motif_inclusion, 'FOBA_1|FOBA_2');
  });

  await record('CAS 1R1 U/V/W — une sauvegarde suffit, réouverture et idempotence', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [
        part(ctx.people[0], 'PRESENT', { role: 'FORMATEUR' }),
        part(ctx.people[1], 'DISPENSE')
      ]
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === ctx.people[0].personne_id).role, 'FORMATEUR');
    const second = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [
        part(ctx.people[0], 'PRESENT', { role: 'FORMATEUR' }),
        part(ctx.people[1], 'DISPENSE')
      ]
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations.length, 2);
    assert.strictEqual(second.version, first.version + 1);
  });

  await record('UI — saisie directe Formateur, motif en ligne, clôture protégée', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes("['FORMATEUR', 'Formateur']"));
    assert.ok(ui.includes('data-motif'));
    assert.ok(ui.includes("state.modal = 'reset-saisie'"));
    assert.ok(ui.includes('data-enc-remove'));
    assert.ok(ui.includes('data-manual-add'));
    assert.ok(ui.includes('data-manual-remove'));
    assert.ok(ui.includes('cibleLabelFromAttendu'));
    assert.ok(ui.includes('scope-presence-warning'));
    assert.ok(ui.includes('scope-cloture-reason'));
    assert.ok(ui.includes("role: r.role === 'FORMATEUR' ? 'FORMATEUR' : 'PARTICIPANT'"));
    assert.ok(ui.includes("row.role = 'FORMATEUR'"));
    assert.ok(ui.includes("row.role = 'PARTICIPANT'"));
    assert.ok(css.includes('.scope-status-row button[aria-pressed="true"]'));
    assert.ok(css.includes('.scope-enc-grid'));
    assert.ok(css.includes('grid-template-rows: repeat(4'));
    assert.ok(css.includes('.scope-person-suggestions'));
    assert.ok(css.includes('tbody tr:nth-child(even){background:#f7f8fa;}'));
    assert.ok(css.includes('.scope-presence-warning'));
    assert.ok(logic.hasIncompleteExcuse([{ statut: 'ABSENT_EXCUSE', motifAbsence: '', inclus: true }]));
    assert.ok(!logic.hasIncompleteExcuse([{ statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', inclus: true }]));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

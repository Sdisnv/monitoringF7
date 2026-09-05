#!/usr/bin/env node
'use strict';

/** SCOPE-PERSONNEL-SYNC-1 — synchronisation comparative CSV, NIP, OI temporel. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { previewPersonnelSync, STATUTS, parseCsv } = require('../netlify/lib/_scope-personnel-sync-contract');
const { hasPermission } = require('../netlify/lib/_rbac');
const { canPhysicallyDeletePersonne } = require('../netlify/lib/_scope-model');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'tests/fixtures/personnel-dap-y4-anonymized.csv');
const ACTOR = { sub: 'test-sync', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function expectHttp(fn, status, code){
  try {
    await fn();
    throw new Error(`attendu HTTP ${status}${code ? `/${code}` : ''}`);
  } catch (error) {
    assert.strictEqual(error.status, status, `status ${error.status} ≠ ${status} (${error && error.error || error})`);
    if(code) assert.strictEqual(error.error, code, `code ${error.error} ≠ ${code}`);
    return error;
  }
}

async function seedOnCible(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: spec.dateEntree || '2026-01-01',
    date_sortie: spec.dateSortie || null,
    actif: spec.actif,
    statut_rh: spec.statut_rh
  });
  if(cibleId){
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: spec.affDebut || spec.dateEntree || '2026-01-01',
      date_fin: spec.affFin || spec.dateSortie || null
    });
  }
  return personne;
}

function csv(lines){
  return ['NIP;Grade;Nom;Prénom;OI'].concat(lines).join('\n');
}

async function closePresent(service, eventId, people){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  await service.enregistrerParticipations(eventId, {
    baseVersion: version,
    participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
  }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

(async () => {
  const fixtureCsv = fs.readFileSync(CSV_PATH, 'utf8');

  await record('1 — CSV fixture anonymisé parse', async () => {
    const parsed = parseCsv(fixtureCsv);
    assert.strictEqual(parsed.rows.length, 16);
    assert.ok(parsed.headers.includes('nip'));
    assert.ok(parsed.headers.includes('oi'));
  });

  await record('2 — BOM', async () => {
    const parsed = parseCsv(`\uFEFFNIP;Grade;Nom;Prénom;OI\n99001;Sap;Bom;Test;DAP Y4`);
    assert.strictEqual(parsed.headers[0], 'nip');
    assert.strictEqual(parsed.rows[0].fields.nip, '99001');
  });

  await record('3 — séparateur ;', async () => {
    const parsed = parseCsv(fixtureCsv);
    assert.strictEqual(parsed.separator, ';');
  });

  await record('4 — NIP unique fichier', async () => {
    const parsed = parseCsv(fixtureCsv);
    const nips = parsed.rows.map((r) => r.fields.nip);
    assert.strictEqual(nips.length, new Set(nips).size);
  });

  await record('5 — nouveau', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99001;Sap;Nouveau;Test;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.NOUVEAU);
    const report = await service.commitPersonnelSync({
      csvText: csv(['99001;Sap;Nouveau;Test;DAP Y4']),
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20',
      decisions: [{ rowId: preview.lignes[0].rowId, nip: '99001', decision: 'CREER' }]
    }, ACTOR);
    assert.strictEqual(report.summary.creations, 1);
    const saved = await repo.getPersonneByNip('99001');
    assert.ok(saved);
    const aff = await repo.listAffectations({ personneId: saved.personne_id });
    const y4 = await repo.findCible('DAP', 'Y4');
    assert.ok(aff.some((a) => a.cible_id === y4.cible_id && !a.date_fin));
  });

  await record('6 — inchangé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99002', nom: 'Idem', prenom: 'Potent', grade: 'Sap' });
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99002;Sap;Idem;Potent;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.INCHANGE);
    assert.strictEqual(preview.summary.INCHANGE, 1);
  });

  await record('7 — changement grade', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99003', nom: 'Grade', prenom: 'Change', grade: 'Sap' });
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99003;Sgt;Grade;Change;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.CHANGEMENT_GRADE);
    await service.commitPersonnelSync({
      csvText: csv(['99003;Sgt;Grade;Change;DAP Y4']),
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20'
    }, ACTOR);
    const saved = await repo.getPersonneByNip('99003');
    assert.strictEqual(saved.grade, 'Sgt');
  });

  await record('8-10 — changement OI clôture ancienne / ouvre nouvelle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const person = await seedOnCible(repo, y4.cible_id, { nip: '99004', nom: 'Oi', prenom: 'Move', grade: 'Sap' });
    const text = csv(['99004;Sap;Oi;Move;DAP Y3']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-07-01' });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.CHANGEMENT_OI);
    await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-07-01'
    }, ACTOR);
    const aff = await repo.listAffectations({ personneId: person.personne_id });
    const old = aff.find((a) => a.cible_id === y4.cible_id);
    const now = aff.find((a) => a.cible_id === y3.cible_id && !a.date_fin);
    assert.strictEqual(old.date_fin, '2026-06-30');
    assert.ok(now);
    assert.strictEqual(now.date_debut, '2026-07-01');
  });

  await record('11 — multi-domaine préservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedOnCible(repo, y4.cible_id, { nip: '99005', nom: 'Multi', prenom: 'Dom', grade: 'Sap' });
    await repo.insertAffectation({
      personne_id: person.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-01-01'
    });
    const text = csv(['99005;Sap;Multi;Dom;DAP Y3']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-07-01' });
    await service.commitPersonnelSync({ csvText: text, fingerprint: preview.fingerprint, dateEffetGlobale: '2026-07-01' }, ACTOR);
    const aff = await repo.listAffectations({ personneId: person.personne_id });
    assert.ok(aff.some((a) => a.cible_id === jsp.cible_id && !a.date_fin));
    assert.ok(aff.some((a) => a.cible_id === y3.cible_id && !a.date_fin));
  });

  await record('12 — absent fichier ≠ démission', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99006', nom: 'Keep', prenom: 'In' });
    await seedOnCible(repo, y4.cible_id, { nip: '99007', nom: 'Gone', prenom: 'Out' });
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99006;Sap;Keep;In;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.strictEqual(preview.absents.length, 1);
    assert.strictEqual(preview.absents[0].nip, '99007');
    assert.strictEqual(preview.absents[0].statut, STATUTS.ABSENT_DU_FICHIER);
    assert.notStrictEqual(preview.absents[0].decision, 'ARCHIVER_DEMISSIONNAIRE');
    await service.commitPersonnelSync({
      csvText: csv(['99006;Sap;Keep;In;DAP Y4']),
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20'
    }, ACTOR);
    const gone = await repo.getPersonneByNip('99007');
    assert.notStrictEqual(gone.statut_rh, 'DEMISSIONNAIRE');
    assert.notStrictEqual(gone.actif, false);
  });

  await record('13-16 — archive retrouvé / réactivation même personne NIP / historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const created = await seedOnCible(repo, y4.cible_id, { nip: '99008', nom: 'Arch', prenom: 'Ive', dateEntree: '2024-01-01' });
    await service.archiverPersonne(created.personne_id, { date: '2025-06-01', type: 'DEMISSIONNAIRE' }, { sub: 'test' });
    const periodesAvant = await repo.listPersonnesPeriodes(created.personne_id);
    const text = csv(['99008;Sap;Arch;Ive;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-01' });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.ARCHIVE_RETROUVE);
    assert.strictEqual(preview.lignes[0].proposition, STATUTS.REACTIVATION_PROPOSEE);
    assert.strictEqual(preview.lignes[0].personneId, created.personne_id);
    const report = await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-01',
      decisions: [{ rowId: preview.lignes[0].rowId, nip: '99008', decision: 'REACTIVER', dateEffet: '2026-08-01' }]
    }, ACTOR);
    assert.strictEqual(report.summary.reactivations, 1);
    const again = await repo.getPersonneByNip('99008');
    assert.strictEqual(again.personne_id, created.personne_id);
    assert.strictEqual(again.nip, '99008');
    const periodes = await repo.listPersonnesPeriodes(created.personne_id);
    assert.ok(periodes.some((p) => p.type === 'DEMISSIONNAIRE'));
    assert.strictEqual(periodes.filter((p) => p.type === 'ACTIF' && !p.date_fin).length, 1);
    assert.ok(periodesAvant.length <= periodes.length);
  });

  await record('17-18 — congé sabbatique / fin congé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const person = await seedOnCible(repo, y4.cible_id, { nip: '99009', nom: 'Conge', prenom: 'Sabb' });
    const start = csv(['99009;Sap;Conge;Sabb;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: start, dateEffetGlobale: '2026-04-01' });
    const absent = preview.absents[0] ? null : preview.lignes[0];
    await service.commitPersonnelSync({
      csvText: 'NIP;Grade;Nom;Prénom;OI\n',
      dateEffetGlobale: '2026-04-01',
      decisions: [{ rowId: `absent:${person.nip}`, nip: '99009', decision: 'DEBUT_CONGE', dateEffet: '2026-04-01' }]
    }, ACTOR);
    const mid = await repo.getPersonne(person.personne_id);
    assert.ok(mid.statut_rh === 'INACTIF' || mid.actif === true);
    const periodes = await repo.listPersonnesPeriodes(person.personne_id);
    assert.ok(periodes.some((p) => p.type === 'INDISPONIBLE' && p.motif === 'CONGE_SABBATIQUE' && !p.date_fin));
    const previewFin = await service.previewPersonnelSync({ csvText: start, dateEffetGlobale: '2026-09-01' });
    assert.strictEqual(previewFin.lignes[0].statut, STATUTS.FIN_CONGE);
    await service.commitPersonnelSync({
      csvText: start,
      fingerprint: previewFin.fingerprint,
      dateEffetGlobale: '2026-09-01',
      decisions: [{ rowId: previewFin.lignes[0].rowId, nip: '99009', decision: 'FIN_CONGE' }]
    }, ACTOR);
    const after = await repo.listPersonnesPeriodes(person.personne_id);
    assert.ok(after.some((p) => p.type === 'INDISPONIBLE' && p.date_fin));
    assert.ok(after.some((p) => p.type === 'ACTIF' && !p.date_fin));
    void absent;
  });

  await record('19 — conflit identité', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99010', nom: 'Alpha', prenom: 'Beta' });
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99010;Sap;Gamma;Delta;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.strictEqual(preview.lignes[0].statut, STATUTS.CONFLIT);
    assert.strictEqual(preview.canCommit, false);
  });

  await record('20 — date effet obligatoire si absente', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const preview = await service.previewPersonnelSync({ csvText: csv(['99011;Sap;Sans;Date;DAP Y4']) });
    assert.strictEqual(preview.lignes[0].dateEffetRequise, true);
    assert.strictEqual(preview.canCommit, false);
    await expectHttp(
      () => service.commitPersonnelSync({ csvText: csv(['99011;Sap;Sans;Date;DAP Y4']) }, ACTOR),
      422,
      'commit_refuse'
    );
  });

  await record('21 — idempotence preview', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99012', nom: 'Idem', prenom: 'Deux', grade: 'Sap' });
    const text = csv(['99012;Sap;Idem;Deux;DAP Y4']);
    const a = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-20' });
    const b = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-20' });
    assert.strictEqual(a.lignes[0].statut, STATUTS.INCHANGE);
    assert.strictEqual(b.lignes[0].statut, STATUTS.INCHANGE);
    assert.strictEqual(a.fingerprint, b.fingerprint);
  });

  await record('22 — idempotence commit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv(['99013;Sap;Once;Only;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-20' });
    const first = await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20',
      idempotencyKey: 'sync-once-99013'
    }, ACTOR);
    const second = await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20',
      idempotencyKey: 'sync-once-99013'
    }, ACTOR);
    assert.strictEqual(second.idempotent, true);
    assert.strictEqual((await repo.listPersonnes({})).filter((p) => p.nip === '99013').length, 1);
    const periodes = await repo.listPersonnesPeriodes(first.applied[0].personneId);
    assert.strictEqual(periodes.filter((p) => p.type === 'ACTIF' && !p.date_fin).length, 1);
  });

  await record('23 — concurrence preview/commit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const person = await seedOnCible(repo, y4.cible_id, { nip: '99014', nom: 'Race', prenom: 'One', grade: 'Sap' });
    const text = csv(['99014;Sgt;Race;One;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-20' });
    await repo.updatePersonne(person.personne_id, { grade: 'Cpl' });
    await expectHttp(
      () => service.commitPersonnelSync({
        csvText: text,
        fingerprint: preview.fingerprint,
        dateEffetGlobale: '2026-08-20'
      }, ACTOR),
      409,
      'preview_obsolete'
    );
  });

  await record('24 — transaction rollback erreur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const original = repo.insertPersonne;
    let n = 0;
    repo.insertPersonne = async function(row){
      n += 1;
      if(n === 2) throw new Error('forced-sync-failure');
      return original.call(this, row);
    };
    const text = csv(['99015;Sap;Roll;A;DAP Y4', '99016;Sap;Roll;B;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-08-20' });
    await assert.rejects(
      () => service.commitPersonnelSync({ csvText: text, fingerprint: preview.fingerprint, dateEffetGlobale: '2026-08-20' }, ACTOR),
      (error) => String(error.message).includes('forced-sync-failure')
    );
    assert.strictEqual(await repo.getPersonneByNip('99015'), null);
    assert.strictEqual(await repo.getPersonneByNip('99016'), null);
  });

  await record('25-26 — population figée immuable / futur nouvelle affectation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const person = await seedOnCible(repo, y4.cible_id, { nip: '99017', nom: 'Fige', prenom: 'Pop' });
    const past = await service.createEvenement({
      date: '2026-03-15', domaineCode: 'DAP', libelle: 'TEST SYNC fige',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(past.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const attendusAvant = await repo.listAttendus(past.evenement.evenement_id);
    const text = csv(['99017;Sap;Fige;Pop;DAP Y3']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-07-01' });
    await service.commitPersonnelSync({ csvText: text, fingerprint: preview.fingerprint, dateEffetGlobale: '2026-07-01' }, ACTOR);
    const attendusApres = await repo.listAttendus(past.evenement.evenement_id);
    assert.deepStrictEqual(attendusApres.map((a) => a.personne_id).sort(), attendusAvant.map((a) => a.personne_id).sort());
    const photo = await service.previewAttendus(past.evenement.evenement_id);
    assert.strictEqual(photo.photographie, true);
    assert.ok(photo.personnes.some((p) => p.personneId === person.personne_id));
    const futurY3 = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST SYNC futur Y3',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const previewFutur = await service.previewAttendus(futurY3.evenement.evenement_id);
    assert.ok(previewFutur.personnes.some((p) => p.personneId === person.personne_id));
  });

  await record('27 — KPI non rétroactif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const a = await seedOnCible(repo, y4.cible_id, { nip: '99018', nom: 'Kpi', prenom: 'A' });
    const b = await seedOnCible(repo, y4.cible_id, { nip: '99019', nom: 'Kpi', prenom: 'B' });
    const mai = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST SYNC kpi mai',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, mai.evenement.evenement_id, [a, b]);
    const text = csv(['99018;Sap;Kpi;A;DAP Y3', '99019;Sap;Kpi;B;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-07-01' });
    await service.commitPersonnelSync({ csvText: text, fingerprint: preview.fingerprint, dateEffetGlobale: '2026-07-01' }, ACTOR);
    const sept = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST SYNC kpi sept',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, sept.evenement.evenement_id, [a]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 2);
    assert.strictEqual(summary.officiel.denominator, 3);
    assert.notStrictEqual(summary.officiel.denominator, 2 * 1);
  });

  await record('28 — journal', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const csvText = csv(['99020;Sap;Journal;Ligne;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText, dateEffetGlobale: '2026-08-20' });
    const report = await service.commitPersonnelSync({
      csvText,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20',
      idempotencyKey: 'journal-99020'
    }, ACTOR);
    const rows = await repo.listJournal('import_personnel', 'journal-99020');
    assert.ok(rows.some((r) => r.action === 'IMPORT_PERSONNEL'));
    const personne = await repo.getPersonneByNip('99020');
    const personJournal = await repo.listJournal('personne', personne.personne_id);
    assert.ok(personJournal.some((r) => r.action === 'CREER_PERSONNE'));
  });

  await record('29 — RBAC', async () => {
    assert.ok(hasPermission({ roles: ['ADMINISTRATEUR'] }, 'personnel:manage'));
    assert.ok(hasPermission({ roles: ['GESTIONNAIRE'] }, 'personnel:manage'));
    assert.ok(!hasPermission({ roles: ['UTILISATEUR'] }, 'personnel:manage'));
    assert.ok(hasPermission({ roles: ['sdis-admin'] }, 'personnel:manage'));
    assert.ok(hasPermission({ roles: ['sdis-commandement'] }, 'personnel:manage'));
    const rbac = fs.readFileSync(path.join(ROOT, 'netlify/lib/_rbac.js'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/rbac.js'), 'utf8');
    const scopeUi = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(rbac.includes('personnel:manage') && scopeUi.includes('personnel:manage'));
    assert.ok(ui.includes('CurrentPermissions') && !ui.includes('ROLE_PERMISSIONS'));
  });

  await record('30 — pas suppression réelle automatique', async () => {
    const sync = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-sync.js'), 'utf8');
    assert.ok(!/deletePersonne|DELETE FROM scope_personnes|delete from scope_personnes/i.test(sync));
    assert.strictEqual(canPhysicallyDeletePersonne({ attendusCount: 1, participationsCount: 0, journalCount: 0 }), false);
  });

  await record('31 — aucune implication FOBA/PR/AUTO', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: '99021', nom: 'Hors', prenom: 'Perim', grade: 'Sap' });
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99021;Sap;Hors;Perim;FOBA 1']),
      dateEffetGlobale: '2026-08-20'
    });
    assert.ok((preview.warnings || []).some((w) => w.code === 'oi_hors_perimetre'));
    const aff = await repo.listAffectations({ personneId: (await repo.getPersonneByNip('99021')).personne_id });
    const foba = await repo.findCible('FOBA', '1');
    assert.ok(!aff.some((a) => a.cible_id === foba.cible_id));
  });

  await record('32 — 16 DAP/Y4 préservés (contrat CSV)', async () => {
    const map = require('../assets/js/scope-oi-map.js');
    const parsed = map.parsePersonnelCsv(fixtureCsv);
    const plan = map.planImport(parsed.rows, { oi: 'DAP Y4', dateDebut: map.DATE_BASCULE_SCOPE });
    assert.strictEqual(plan.personnesACreer, 16);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('scope-sync-preview'));
    assert.ok(ui.includes('Connectez-vous pour consulter l’annuaire et les fiches nominatives.'));
  });

  await record('33 — 8 LEGACY inchangés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    for(let i = 0; i < 8; i += 1){
      const ev = await repo.insertEvenement({
        date: '2026-03-0' + ((i % 8) + 1),
        domaine_code: 'DAP',
        libelle: 'LEGACY ' + i,
        origine: 'LEGACY_AGGREGATED',
        statut: 'REALISE'
      });
      await repo.insertLegacy({
        evenement_id: ev.evenement_id,
        date: ev.date,
        domaine_code: 'DAP',
        libelle: ev.libelle,
        nb_convoques: 10,
        nb_presents: 8,
        fingerprint: 'legacy-sync-' + i
      });
    }
    const before = await repo.countTable('scope_legacy_aggregates');
    const preview = await service.previewPersonnelSync({
      csvText: csv(['99022;Sap;Legacy;Keep;DAP Y4']),
      dateEffetGlobale: '2026-08-20'
    });
    await service.commitPersonnelSync({
      csvText: csv(['99022;Sap;Legacy;Keep;DAP Y4']),
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-08-20'
    }, ACTOR);
    assert.strictEqual(await repo.countTable('scope_legacy_aggregates'), before);
    assert.strictEqual(before, 8);
  });

  await record('34 — Analytics non régressé', async () => {
    const analytics = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-analytics.js'), 'utf8');
    assert.ok(analytics.includes('officialFromNominatif') || analytics.includes('numerator'));
    const sync = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-sync.js'), 'utf8');
    assert.ok(!/computeTaux|officialFromNominatif/.test(sync));
  });

  await record('35 — Reports non régressé', async () => {
    const reports = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-service.js'), 'utf8');
    assert.ok(reports.includes('SCOPE-REPORT-1'));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('SCOPE-REPORT-1'));
    const scope = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(scope.includes('/imports/personnel/commit'));
    assert.ok(scope.includes('personnel:manage'));
  });

  await record('contrat HTTP + UI + pas F7/ORION', async () => {
    const f7 = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');
    assert.ok(f7.includes('SCOPE-IMPL-1A'));
    const sync = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-sync.js'), 'utf8');
    assert.ok(!/monitoring_f7_/.test(sync));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('scope-sync-filters'));
    assert.ok(ui.includes('Date d’effet globale'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('scope-sync-toolbar'));
    const logic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    assert.ok(logic.includes("parts[0] === 'personnel'"));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    console.error(`\nSCOPE-PERSONNEL-SYNC-1: ${failed.length} NOK / ${results.length}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nSCOPE-PERSONNEL-SYNC-1: ${results.length} PASS`);
})();

#!/usr/bin/env node
'use strict';

/** SCOPE-PERSONNEL-SYNC-1-R1 — cohérence archivage / affectations temporelles. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { STATUTS } = require('../netlify/functions/_scope-personnel-sync-contract');
const { inconsistentSortiWithOpenAffectations } = require('../netlify/functions/_scope-personnel');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'test-r1', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function csv(lines){
  return ['NIP;Grade;Nom;Prénom;OI'].concat(lines).join('\n');
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

async function seedActive(repo, cibleId, spec){
  return seedOnCible(repo, cibleId, spec);
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

async function auditIncoherences(repo){
  const personnes = await repo.listPersonnes({});
  const periodes = await repo.listAllPeriodes();
  const affectations = await repo.listAffectations({});
  return inconsistentSortiWithOpenAffectations(personnes, periodes, affectations);
}

(async () => {
  await record('1 — SORTI clôture période ACTIF', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A01', dateEntree: '2026-01-01' });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    const actif = periodes.find((row) => row.type === 'ACTIF');
    const sorti = periodes.find((row) => row.type === 'SORTI' && !row.date_fin);
    assert.strictEqual(actif.date_fin, '2026-08-31');
    assert.strictEqual(sorti.date_debut, '2026-09-01');
    const saved = await repo.getPersonne(p.personne_id);
    assert.strictEqual(saved.statut_rh, 'SORTI');
    assert.strictEqual(saved.actif, false);
  });

  await record('2 — SORTI clôture affectation principale', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A02', dateEntree: '2026-01-01' });
    const affAvant = await repo.listAffectations({ personneId: p.personne_id });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.strictEqual(aff.length, affAvant.length);
    assert.ok(aff.every((a) => a.date_fin === '2026-08-31'));
    assert.ok(!aff.some((a) => !a.date_fin));
  });

  await record('3 — DEMISSIONNAIRE clôture affectation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedActive(repo, y4.cible_id, { nip: 'R1A03', dateEntree: '2026-01-01' });
    await service.archiverPersonne(p.personne_id, { date: '2026-04-01', type: 'DEMISSIONNAIRE' }, ACTOR);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.ok(aff.length >= 1);
    assert.ok(aff.every((a) => a.date_fin === '2026-03-31'));
    const saved = await repo.getPersonne(p.personne_id);
    assert.strictEqual(saved.statut_rh, 'DEMISSIONNAIRE');
    assert.strictEqual(saved.personne_id, p.personne_id);
  });

  await record('4-5 — aucune suppression historique / ancien OI conservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A04', dateEntree: '2026-01-01' });
    const affId = (await repo.listAffectations({ personneId: p.personne_id }))[0].affectation_id;
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.strictEqual(aff.length, 1);
    assert.strictEqual(aff[0].affectation_id, affId);
    assert.strictEqual(aff[0].cible_id, y3.cible_id);
    assert.strictEqual(aff[0].date_debut, '2026-01-01');
    assert.strictEqual(aff[0].date_fin, '2026-08-31');
    assert.ok(await repo.getPersonneByNip('R1A04'));
  });

  await record('6 — multi-affectations toutes clôturées (SORTI ≠ changement OI)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const jsp = await repo.findCible('JSP', 'G1');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A06', dateEntree: '2026-01-01' });
    await repo.insertAffectation({
      personne_id: p.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-02-01'
    });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.strictEqual(aff.length, 2);
    assert.ok(aff.every((a) => a.date_fin === '2026-08-31'));
  });

  await record('7 — INDISPONIBLE n’est pas assimilé à SORTI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const jsp = await repo.findCible('JSP', 'G1');
    const p = await seedActive(repo, y4.cible_id, { nip: 'R1A07', dateEntree: '2026-01-01' });
    await repo.insertAffectation({
      personne_id: p.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-01-01'
    });
    await service.commitPersonnelSync({
      csvText: 'NIP;Grade;Nom;Prénom;OI\n',
      dateEffetGlobale: '2026-04-01',
      decisions: [{ rowId: `absent:${p.nip}`, nip: p.nip, decision: 'DEBUT_CONGE', dateEffet: '2026-04-01' }]
    }, ACTOR);
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    assert.ok(periodes.some((row) => row.type === 'INDISPONIBLE' && !row.date_fin));
    assert.ok(!periodes.some((row) => row.type === 'SORTI' || row.type === 'DEMISSIONNAIRE'));
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.ok(aff.some((a) => a.cible_id === y4.cible_id && !a.date_fin));
    assert.ok(aff.some((a) => a.cible_id === jsp.cible_id && !a.date_fin));
    assert.strictEqual((await auditIncoherences(repo)).length, 0);
  });

  await record('8-12 — réactivation même personne / NIP / nouvelle période / nouvelle aff / ancienne fermée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A08', dateEntree: '2026-01-01' });
    const oldAff = (await repo.listAffectations({ personneId: p.personne_id }))[0];
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const reactivated = await service.reactiverPersonne({
      nip: 'R1A08',
      date: '2027-01-01',
      cibleId: y3.cible_id
    }, ACTOR);
    assert.strictEqual(reactivated.personne.personne_id, p.personne_id);
    assert.strictEqual(reactivated.personne.nip, 'R1A08');
    assert.strictEqual(reactivated.memeIdentite, true);
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    assert.ok(periodes.some((row) => row.type === 'SORTI' && row.date_fin === '2026-12-31'));
    assert.strictEqual(periodes.filter((row) => row.type === 'ACTIF' && !row.date_fin).length, 1);
    const newActif = periodes.find((row) => row.type === 'ACTIF' && !row.date_fin);
    assert.strictEqual(newActif.date_debut, '2027-01-01');
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.strictEqual(aff.length, 2);
    const closed = aff.find((a) => a.affectation_id === oldAff.affectation_id);
    const opened = aff.find((a) => a.affectation_id !== oldAff.affectation_id);
    assert.strictEqual(closed.date_fin, '2026-08-31');
    assert.strictEqual(closed.cible_id, y3.cible_id);
    assert.ok(!opened.date_fin);
    assert.strictEqual(opened.cible_id, y3.cible_id);
    assert.strictEqual(opened.date_debut, '2027-01-01');
  });

  await record('13 — Y3 → SORTI → Y4 sans transformation rétroactive', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1A13', dateEntree: '2026-01-01' });
    const oldId = (await repo.listAffectations({ personneId: p.personne_id }))[0].affectation_id;
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    await service.reactiverPersonne({ nip: 'R1A13', date: '2027-01-01', cibleId: y4.cible_id }, ACTOR);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    const old = aff.find((a) => a.affectation_id === oldId);
    const neu = aff.find((a) => a.cible_id === y4.cible_id && !a.date_fin);
    assert.strictEqual(old.cible_id, y3.cible_id);
    assert.strictEqual(old.date_fin, '2026-08-31');
    assert.ok(neu);
    assert.strictEqual(neu.date_debut, '2027-01-01');
    assert.notStrictEqual(neu.affectation_id, oldId);
  });

  await record('14-16 — population figée inchangée / futur hors / futur après réactivation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const y4 = await repo.findCible('DAP', 'Y4');
    const keep = await seedActive(repo, y3.cible_id, { nip: 'R1PKEEP', dateEntree: '2026-01-01' });
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1PFIGE', dateEntree: '2026-01-01' });
    const past = await service.createEvenement({
      date: '2026-03-15', domaineCode: 'DAP', libelle: 'TEST R1 fige',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(past.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    const attendusAvant = await repo.listAttendus(past.evenement.evenement_id);
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const attendusApres = await repo.listAttendus(past.evenement.evenement_id);
    assert.strictEqual(attendusApres.length, attendusAvant.length);
    assert.ok(attendusApres.some((a) => a.personne_id === p.personne_id));
    const futurSorti = await service.createEvenement({
      date: '2026-10-15', domaineCode: 'DAP', libelle: 'TEST R1 apres sortie',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const previewSorti = await service.previewAttendus(futurSorti.evenement.evenement_id);
    assert.ok(!previewSorti.personnes.some((x) => x.personneId === p.personne_id));
    assert.ok(previewSorti.personnes.some((x) => x.personneId === keep.personne_id));
    await service.reactiverPersonne({ nip: 'R1PFIGE', date: '2027-01-01', cibleId: y4.cible_id }, ACTOR);
    const futurReac = await service.createEvenement({
      date: '2027-02-15', domaineCode: 'DAP', libelle: 'TEST R1 apres reac',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const previewReac = await service.previewAttendus(futurReac.evenement.evenement_id);
    assert.ok(previewReac.personnes.some((x) => x.personneId === p.personne_id));
    const attendusFinal = await repo.listAttendus(past.evenement.evenement_id);
    assert.strictEqual(attendusFinal.length, attendusAvant.length);
  });

  await record('17 — KPI passé inchangé (non rétroactif)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const a = await seedActive(repo, y3.cible_id, { nip: 'R1KA', dateEntree: '2026-01-01' });
    const b = await seedActive(repo, y3.cible_id, { nip: 'R1KB', dateEntree: '2026-01-01' });
    const mai = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 kpi mai',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await closePresent(service, mai.evenement.evenement_id, [a, b]);
    const before = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    await service.archiverPersonne(b.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const after = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(after.officiel.numerator, before.officiel.numerator);
    assert.strictEqual(after.officiel.denominator, before.officiel.denominator);
    assert.strictEqual(after.officiel.eventCount, 1);
    await service.reactiverPersonne({ nip: 'R1KB', date: '2027-01-01', cibleId: y3.cible_id }, ACTOR);
    const still = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(still.officiel.denominator, before.officiel.denominator);
  });

  await record('18 — ABSENT_DU_FICHIER = aucune mutation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedActive(repo, y4.cible_id, { nip: 'R1KEEP', dateEntree: '2026-01-01' });
    const gone = await seedActive(repo, y4.cible_id, { nip: 'R1GONE', dateEntree: '2026-01-01' });
    const text = csv(['R1KEEP;Sap;R1KEEP;Test;DAP Y4']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-09-01' });
    assert.strictEqual(preview.absents[0].statut, STATUTS.ABSENT_DU_FICHIER);
    assert.strictEqual(preview.absents[0].decision, 'IGNORER');
    await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-09-01'
    }, ACTOR);
    const saved = await repo.getPersonne(gone.personne_id);
    assert.notStrictEqual(saved.statut_rh, 'SORTI');
    const aff = await repo.listAffectations({ personneId: gone.personne_id });
    assert.ok(aff.some((a) => !a.date_fin));
  });

  await record('19 — ABSENT + décision SORTI = archivage complet', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const jsp = await repo.findCible('JSP', 'G1');
    await seedActive(repo, y3.cible_id, { nip: 'R1KEEP2', dateEntree: '2026-01-01' });
    const gone = await seedActive(repo, y3.cible_id, { nip: 'R1ARCH', dateEntree: '2026-01-01' });
    await repo.insertAffectation({
      personne_id: gone.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-03-01'
    });
    const text = csv(['R1KEEP2;Sap;R1KEEP2;Test;DAP Y3']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-09-01' });
    const absent = preview.absents.find((row) => row.nip === 'R1ARCH');
    await service.commitPersonnelSync({
      csvText: text,
      fingerprint: preview.fingerprint,
      dateEffetGlobale: '2026-09-01',
      decisions: [{ rowId: absent.rowId, nip: 'R1ARCH', decision: 'ARCHIVER_SORTI', dateEffet: '2026-09-01' }]
    }, ACTOR);
    const periodes = await repo.listPersonnesPeriodes(gone.personne_id);
    assert.ok(periodes.some((row) => row.type === 'SORTI' && !row.date_fin));
    const aff = await repo.listAffectations({ personneId: gone.personne_id });
    assert.ok(aff.every((a) => a.date_fin === '2026-08-31'));
    const journal = await repo.listJournal('personne', gone.personne_id);
    assert.ok(journal.some((j) => j.action === 'ARCHIVER_PERSONNE'));
    assert.ok(journal.some((j) => j.action === 'CLOTURER_AFFECTATION'));
  });

  await record('20 — transaction rollback si clôture d’affectation échoue', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1ROLL', dateEntree: '2026-01-01' });
    const original = repo.updateAffectation;
    repo.updateAffectation = async function(){
      throw new Error('forced-aff-close-failure');
    };
    await assert.rejects(
      () => service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR),
      (error) => String(error.message).includes('forced-aff-close-failure')
    );
    repo.updateAffectation = original;
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    assert.ok(!periodes.some((row) => row.type === 'SORTI' || row.type === 'DEMISSIONNAIRE'));
    const actif = periodes.find((row) => row.type === 'ACTIF');
    assert.ok(actif && !actif.date_fin);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.ok(aff.some((a) => !a.date_fin));
    const saved = await repo.getPersonne(p.personne_id);
    assert.notStrictEqual(saved.statut_rh, 'SORTI');
  });

  await record('21-22 — idempotence archivage et réactivation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1IDEM', dateEntree: '2026-01-01' });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const second = await service.archiverPersonne(p.personne_id, { date: '2026-09-15', type: 'SORTI' }, ACTOR);
    assert.strictEqual(second.dejaArchive, true);
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    assert.strictEqual(periodes.filter((row) => row.type === 'SORTI').length, 1);
    const affClosed = await repo.listAffectations({ personneId: p.personne_id });
    assert.ok(affClosed.every((a) => a.date_fin === '2026-08-31'));
    await service.reactiverPersonne({ nip: 'R1IDEM', date: '2027-01-01', cibleId: y3.cible_id }, ACTOR);
    const again = await service.reactiverPersonne({ nip: 'R1IDEM', date: '2027-02-01', cibleId: y3.cible_id }, ACTOR);
    assert.strictEqual(again.dejaActive, true);
    const after = await repo.listPersonnesPeriodes(p.personne_id);
    assert.strictEqual(after.filter((row) => row.type === 'ACTIF' && !row.date_fin).length, 1);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.strictEqual(aff.filter((a) => !a.date_fin).length, 1);
    assert.strictEqual(aff.filter((a) => a.cible_id === y3.cible_id).length, 2);
  });

  await record('23 — journal ARCHIVER + CLOTURER_AFFECTATION', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1LOG', dateEntree: '2026-01-01' });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    const journal = await repo.listJournal('personne', p.personne_id);
    const archiver = journal.find((j) => j.action === 'ARCHIVER');
    const cloture = journal.filter((j) => j.action === 'CLOTURER_AFFECTATION');
    assert.ok(archiver);
    assert.strictEqual(archiver.avant.nip, 'R1LOG');
    assert.strictEqual(archiver.apres.date, '2026-09-01');
    assert.ok(cloture.length >= 1);
    assert.strictEqual(cloture[0].apres.date_fin, '2026-08-31');
    assert.strictEqual(cloture[0].apres.date_effet, '2026-09-01');
  });

  await record('24 — 8 LEGACY inchangés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
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
        fingerprint: 'legacy-r1-' + i
      });
    }
    const before = await repo.countTable('scope_legacy_aggregates');
    const p = await seedActive(repo, y3.cible_id, { nip: 'R1LEG', dateEntree: '2026-01-01' });
    await service.archiverPersonne(p.personne_id, { date: '2026-09-01', type: 'SORTI' }, ACTOR);
    await service.reactiverPersonne({ nip: 'R1LEG', date: '2027-01-01', cibleId: y3.cible_id }, ACTOR);
    assert.strictEqual(await repo.countTable('scope_legacy_aggregates'), before);
    assert.strictEqual(before, 8);
  });

  await record('25-28 — analytics / reports / alerts / personnel-sync non régressés', async () => {
    const analytics = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-analytics.js'), 'utf8');
    const reports = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-report-service.js'), 'utf8');
    const alerts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-alerts.js'), 'utf8');
    const sync = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel-sync.js'), 'utf8');
    const service = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
    const personnel = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel.js'), 'utf8');
    assert.ok(analytics.includes('officialFromNominatif') || analytics.includes('numerator'));
    assert.ok(reports.includes('SCOPE-REPORT-1'));
    assert.ok(alerts.includes('SCOPE-ALERTS-1') || alerts.includes('classify'));
    assert.ok(sync.includes('SCOPE-PERSONNEL-SYNC-1'));
    assert.ok(sync.includes('closeAllOpenAffectations'));
    assert.ok(service.includes('closeAllOpenAffectations'));
    assert.ok(personnel.includes('INDISPONIBLE / congé : ne pas appeler'));
    assert.ok(!/computeTaux|officialFromNominatif/.test(sync));
    assert.ok(!/monitoring_f7_/.test(sync));
    const f7 = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');
    assert.ok(f7.includes('SCOPE-IMPL-1A'));
  });

  await record('réparation 99102 — SORTI existant + aff ouverte → clôture à la date déjà enregistrée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedActive(repo, y3.cible_id, { nip: '99102', dateEntree: '2026-08-01' });
    const actif = (await repo.listPersonnesPeriodes(p.personne_id)).find((row) => row.type === 'ACTIF');
    await repo.updatePeriode(actif.periode_id, { date_fin: '2026-08-19' });
    await repo.insertPeriode({
      personne_id: p.personne_id,
      type: 'SORTI',
      date_debut: '2026-08-20',
      source: 'TEST'
    });
    await repo.updatePersonne(p.personne_id, { actif: false, statut_rh: 'SORTI', date_sortie: '2026-08-20' });
    const avant = await auditIncoherences(repo);
    assert.strictEqual(avant.length, 1);
    assert.strictEqual(avant[0].nip, '99102');
    const repaired = await service.archiverPersonne(p.personne_id, { date: '2026-08-25', type: 'SORTI' }, ACTOR);
    assert.strictEqual(repaired.dejaArchive, true);
    const aff = await repo.listAffectations({ personneId: p.personne_id });
    assert.ok(aff.every((a) => a.date_fin === '2026-08-19'));
    assert.ok(!aff.some((a) => a.date_fin === '2026-08-24'));
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    assert.strictEqual(periodes.filter((row) => row.type === 'SORTI').length, 1);
    assert.strictEqual((await auditIncoherences(repo)).length, 0);
    const journal = await repo.listJournal('personne', p.personne_id);
    assert.ok(journal.some((j) => j.action === 'CLOTURER_AFFECTATION'));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    console.error(`\nSCOPE-PERSONNEL-SYNC-1-R1: ${failed.length} NOK / ${results.length}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nSCOPE-PERSONNEL-SYNC-1-R1: ${results.length} PASS`);
})();

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeObjectivesService } = require('../netlify/lib/_scope-objectives-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { HttpError, validateParticipationPatch } = require('../netlify/lib/_scope-rules');
const { canPhysicallyDeletePersonne } = require('../netlify/lib/_scope-model');
const { previewPersonnelSync, STATUTS } = require('../netlify/lib/_scope-personnel-sync-contract');
const { evaluateEligibility, TYPES_PERIODE } = require('../netlify/lib/_scope-personnel');

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

async function expectHttp(fn, status, code){
  try {
    await fn();
    throw new Error(`attendu HTTP ${status}${code ? `/${code}` : ''}`);
  } catch (error) {
    assert.ok(error instanceof HttpError, `HttpError attendu, reçu ${error && error.stack || error}`);
    assert.strictEqual(error.status, status, `status ${error.status} ≠ ${status} (${error.error})`);
    if(code) assert.strictEqual(error.error, code, `code ${error.error} ≠ ${code}`);
    return error;
  }
}

async function seedOnCible(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    date_entree: spec.dateEntree || '2026-01-01',
    date_sortie: spec.dateSortie || null
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: spec.affDebut || spec.dateEntree || '2026-01-01',
    date_fin: spec.affFin || spec.dateSortie || null
  });
  return personne;
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
  await record('1 — migration MODEL-2 / R1 idempotente', async () => {
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
    const sql2 = fs.readFileSync(path.join(ROOT, 'database/migrations/20260820_scope_model_2.sql'), 'utf8');
    const sqlR1 = fs.readFileSync(path.join(ROOT, 'database/migrations/20260820_scope_model_2_r1.sql'), 'utf8');
    assert.ok(schema.includes("values ('scope-model-2') on conflict (version) do nothing"));
    assert.ok(schema.includes("values ('scope-model-2-r1') on conflict (version) do nothing"));
    assert.ok(schema.includes('create table if not exists scope_personne_periodes'));
    assert.ok(sql2.includes('on conflict'));
    assert.ok(sqlR1.includes('create table if not exists scope_personne_periodes'));
    assert.ok(sqlR1.includes('where not exists'));
    assert.ok(sqlR1.includes('on conflict (version) do nothing'));
  });

  await record('2 — identité personne stable (NIP unique)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const a = await service.createPersonne({ nip: 'R1NIP01', nom: 'Dupond', prenom: 'Anne' }, { sub: 'test' });
    await expectHttp(
      () => service.createPersonne({ nip: 'R1NIP01', nom: 'Autre', prenom: 'Identite' }, { sub: 'test' }),
      409,
      'nip_existant'
    );
    const again = await repo.getPersonneByNip('R1NIP01');
    assert.strictEqual(again.personne_id, a.personne.personne_id);
  });

  await record('3 — actif à date', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, { nip: 'R1A001' });
    const created = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 actif',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.strictEqual(preview.count, 1);
    assert.strictEqual(preview.personnes[0].personneId, p.personne_id);
  });

  await record('4 — non encore arrivé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: 'R1A002', dateEntree: '2026-07-01', affDebut: '2026-07-01' });
    const created = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 futur arrivant',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.strictEqual(preview.count, 0);
  });

  await record('5 — sorti avant événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, {
      nip: 'R1A003', dateEntree: '2026-01-01', dateSortie: '2026-06-30', affDebut: '2026-01-01', affFin: '2026-06-30'
    });
    const created = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 sorti',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.strictEqual(preview.count, 0);
    const periodes = await repo.listPersonnesPeriodes(p.personne_id);
    const elig = evaluateEligibility(p, periodes, '2026-09-15');
    assert.strictEqual(elig.eligible, false);
  });

  await record('6 — congé sabbatique couvre événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, { nip: 'R1C001' });
    await service.ouvrirPeriode(p.personne_id, {
      type: TYPES_PERIODE.INDISPONIBLE,
      date_debut: '2026-05-01',
      date_fin: '2026-08-31',
      motif: 'CONGE_SABBATIQUE'
    }, { sub: 'test' });
    const created = await service.createEvenement({
      date: '2026-06-15', domaineCode: 'DAP', libelle: 'TEST R1 conge',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.strictEqual(preview.count, 0);
  });

  await record('7 — retour de congé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, { nip: 'R1C002' });
    const opened = await service.ouvrirPeriode(p.personne_id, {
      type: TYPES_PERIODE.INDISPONIBLE,
      date_debut: '2026-05-01',
      date_fin: '2026-08-31',
      motif: 'CONGE_SABBATIQUE'
    }, { sub: 'test' });
    const after = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 retour',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(after.evenement.evenement_id);
    assert.strictEqual(preview.count, 1);
    assert.ok(opened.periode.periode_id);
  });

  await record('8 — changement d’affectation avant/après date', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await service.createPersonne({
      nip: 'R1AFF01', nom: 'Change', prenom: 'Cible', dateEntree: '2026-01-01', cibleId: y4.cible_id
    }, { sub: 'test' });
    await expectHttp(
      () => service.assertNoAffectationOverlapInDomain(
        p.personne.personne_id, y3.cible_id, '2026-01-01', null
      ),
      422,
      'chevauchement_domaine'
    );
    await service.changerAffectation(p.personne.personne_id, {
      cibleId: y3.cible_id, date: '2026-07-01'
    }, { sub: 'test' });
    const mai = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 Y4',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const septY4 = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 plus Y4',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const septY3 = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 Y3',
      cibleIds: [y3.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    assert.strictEqual((await service.previewAttendus(mai.evenement.evenement_id)).count, 1);
    assert.strictEqual((await service.previewAttendus(septY4.evenement.evenement_id)).count, 0);
    assert.strictEqual((await service.previewAttendus(septY3.evenement.evenement_id)).count, 1);
  });

  await record('9 — population mai A+B, pas C', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const a = await seedOnCible(repo, y4.cible_id, { nip: 'R1MA', dateEntree: '2026-01-01' });
    const b = await seedOnCible(repo, y4.cible_id, {
      nip: 'R1MB', dateEntree: '2026-01-01', dateSortie: '2026-06-30', affFin: '2026-06-30'
    });
    await seedOnCible(repo, y4.cible_id, { nip: 'R1MC', dateEntree: '2026-07-01', affDebut: '2026-07-01' });
    const mai = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 mai',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(mai.evenement.evenement_id);
    const nips = preview.personnes.map((x) => x.nip).sort();
    assert.deepStrictEqual(nips, ['R1MA', 'R1MB']);
    assert.ok(preview.personnes.some((x) => x.personneId === a.personne_id));
    assert.ok(preview.personnes.some((x) => x.personneId === b.personne_id));
  });

  await record('10 — population septembre A+C, pas B', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: 'R1SA', dateEntree: '2026-01-01' });
    await seedOnCible(repo, y4.cible_id, {
      nip: 'R1SB', dateEntree: '2026-01-01', dateSortie: '2026-06-30', affFin: '2026-06-30'
    });
    await seedOnCible(repo, y4.cible_id, { nip: 'R1SC', dateEntree: '2026-07-01', affDebut: '2026-07-01' });
    const sept = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 sept',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(sept.evenement.evenement_id);
    assert.deepStrictEqual(preview.personnes.map((x) => x.nip).sort(), ['R1SA', 'R1SC']);
  });

  await record('11 — population figée non modifiée après changement RH', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const a = await seedOnCible(repo, y4.cible_id, { nip: 'R1F1' });
    const b = await seedOnCible(repo, y4.cible_id, { nip: 'R1F2' });
    const created = await service.createEvenement({
      date: '2026-03-15', domaineCode: 'DAP', libelle: 'TEST R1 fige',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.archiverPersonne(b.personne_id, { date: '2026-07-01', type: 'SORTI' }, { sub: 'test' });
    const attendus = await repo.listAttendus(created.evenement.evenement_id);
    assert.strictEqual(attendus.filter((x) => x.inclus !== false).length, 2);
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.strictEqual(preview.count, 2);
    assert.strictEqual(preview.photographie, true);
    assert.ok(preview.personnes.some((x) => x.personneId === a.personne_id));
    assert.ok(preview.personnes.some((x) => x.personneId === b.personne_id));
  });

  await record('12 — événement futur non figé utilise nouvelle vérité', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedOnCible(repo, y4.cible_id, { nip: 'R1U1' });
    const b = await seedOnCible(repo, y4.cible_id, { nip: 'R1U2' });
    const futur = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 non fige',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.archiverPersonne(b.personne_id, { date: '2026-07-01', type: 'SORTI' }, { sub: 'test' });
    const preview = await service.previewAttendus(futur.evenement.evenement_id);
    assert.strictEqual(preview.count, 1);
    assert.ok(!preview.photographie);
  });

  await record('13 — KPI annuel effectifs variables ≠ effectif actuel × événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const a = await seedOnCible(repo, y4.cible_id, { nip: 'R1KA' });
    const b = await seedOnCible(repo, y4.cible_id, { nip: 'R1KB' });
    const mai = await service.createEvenement({
      date: '2026-05-15', domaineCode: 'DAP', libelle: 'TEST R1 kpi mai',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, mai.evenement.evenement_id, [a, b]);
    await service.archiverPersonne(b.personne_id, { date: '2026-07-01', type: 'SORTI' }, { sub: 'test' });
    const c = await seedOnCible(repo, y4.cible_id, { nip: 'R1KC', dateEntree: '2026-07-01', affDebut: '2026-07-01' });
    const sept = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DAP', libelle: 'TEST R1 kpi sept',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, sept.evenement.evenement_id, [a, c]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 2);
    assert.strictEqual(summary.officiel.numerator, 4);
    assert.strictEqual(summary.officiel.denominator, 4);
    assert.notStrictEqual(summary.officiel.denominator, 6);
    const frozenMai = await repo.listAttendus(mai.evenement.evenement_id);
    assert.strictEqual(frozenMai.filter((x) => x.inclus !== false).length, 2);
  });

  await record('14 — démission archive sans suppression', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createPersonne({ nip: 'R1DEM01', nom: 'Dem', prenom: 'Ission' }, { sub: 'test' });
    const archived = await service.archiverPersonne(created.personne.personne_id, {
      date: '2026-04-01', type: 'DEMISSIONNAIRE'
    }, { sub: 'test' });
    const found = await repo.getPersonneByNip('R1DEM01');
    assert.strictEqual(found.personne_id, created.personne.personne_id);
    assert.strictEqual(archived.personne.statut_rh, 'DEMISSIONNAIRE');
    assert.strictEqual(archived.personne.actif, false);
    assert.strictEqual(canPhysicallyDeletePersonne({ attendusCount: 0, participationsCount: 0, journalCount: 1 }), false);
  });

  await record('15 — historique conservé après archivage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, { nip: 'R1H001' });
    const ev = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DAP', libelle: 'TEST R1 hist',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, ev.evenement.evenement_id, [p]);
    await service.archiverPersonne(p.personne_id, { date: '2026-07-01', type: 'SORTI' }, { sub: 'test' });
    const attendus = await repo.listAttendus(ev.evenement.evenement_id);
    const parts = await repo.listParticipations(ev.evenement.evenement_id);
    assert.strictEqual(attendus.length, 1);
    assert.strictEqual(parts.length, 1);
    const journal = await repo.listJournal('personne', p.personne_id);
    assert.ok(journal.some((j) => j.action === 'ARCHIVER'));
  });

  await record('16 — réactivation même personne / NIP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createPersonne({
      nip: 'R1REAC01', nom: 'Revient', prenom: 'Iel', dateEntree: '2024-01-01'
    }, { sub: 'test' });
    await service.archiverPersonne(created.personne.personne_id, { date: '2024-06-01', type: 'DEMISSIONNAIRE' }, { sub: 'test' });
    const reactivated = await service.reactiverPersonne({
      nip: 'R1REAC01', date: '2026-07-01'
    }, { sub: 'test' });
    assert.strictEqual(reactivated.personne.personne_id, created.personne.personne_id);
    assert.strictEqual(reactivated.personne.nip, 'R1REAC01');
    assert.strictEqual(reactivated.memeIdentite, true);
    const again = await service.reactiverPersonne({ nip: 'R1REAC01', date: '2026-08-01' }, { sub: 'test' });
    assert.strictEqual(again.dejaActive, true);
    const periodes = await repo.listPersonnesPeriodes(created.personne.personne_id);
    assert.strictEqual(periodes.filter((x) => x.type === 'ACTIF' && !x.date_fin).length, 1);
  });

  await record('17 — absence CSV ≠ démission automatique', async () => {
    const preview = previewPersonnelSync(
      'nip;nom;prenom\nKEEP1;Keep;Un\n',
      {
        personnes: [
          { personne_id: 'p1', nip: 'KEEP1', nom: 'Keep', prenom: 'Un', actif: true, statut_rh: 'ACTIF' },
          { personne_id: 'p2', nip: 'GONE1', nom: 'Gone', prenom: 'Deux', actif: true, statut_rh: 'ACTIF' }
        ],
        affectations: []
      }
    );
    assert.strictEqual(preview.absents.length, 1);
    assert.strictEqual(preview.absents[0].statut, STATUTS.ABSENT_DU_FICHIER);
    assert.notStrictEqual(preview.absents[0].statut, 'DEMISSIONNAIRE');
    assert.strictEqual(preview.absents[0].proposition, STATUTS.ARCHIVAGE_PROPOSE);
  });

  await record('18 — archive retrouvé par NIP', async () => {
    const preview = previewPersonnelSync(
      'nip;nom;prenom\nOLD1;Old;Nip\n',
      {
        personnes: [
          { personne_id: 'arch-1', nip: 'OLD1', nom: 'Old', prenom: 'Nip', actif: false, statut_rh: 'DEMISSIONNAIRE' }
        ],
        affectations: []
      }
    );
    assert.strictEqual(preview.lignes[0].statut, STATUTS.ARCHIVE_RETROUVE);
    assert.strictEqual(preview.lignes[0].proposition, STATUTS.REACTIVATION_PROPOSEE);
    assert.strictEqual(preview.lignes[0].personneId, 'arch-1');
  });

  await record('19 — conflit identité NIP', async () => {
    const preview = previewPersonnelSync(
      'nip;nom;prenom\nNIP9;Alpha;Beta\n',
      {
        personnes: [
          { personne_id: 'id-9', nip: 'NIP9', nom: 'Gamma', prenom: 'Delta', actif: true, statut_rh: 'ACTIF' }
        ],
        affectations: []
      }
    );
    assert.strictEqual(preview.lignes[0].statut, STATUTS.CONFLIT);
  });

  await record('20 — import identique = idempotent (INCHANGE)', async () => {
    const csv = 'nip;nom;prenom;cible\nIDEM1;Idem;Potent;Y4\n';
    const ctx = {
      personnes: [{ personne_id: 'id-i', nip: 'IDEM1', nom: 'Idem', prenom: 'Potent', actif: true, statut_rh: 'ACTIF' }],
      affectations: [{ personne_id: 'id-i', cible_id: 'c1', niveau_code: 'Y4', date_fin: null }]
    };
    const first = previewPersonnelSync(csv, ctx);
    const second = previewPersonnelSync(csv, ctx);
    assert.strictEqual(first.lignes[0].statut, STATUTS.INCHANGE);
    assert.strictEqual(second.lignes[0].statut, STATUTS.INCHANGE);
    assert.strictEqual(first.summary.INCHANGE, 1);
    assert.strictEqual(second.summary.NOUVEAU, 0);
  });

  await record('21 — permutation DAP toujours correcte', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const g1 = await repo.findCible('DPS', 'G1');
    const people = [
      await seedOnCible(repo, y4.cible_id, { nip: 'R1P01' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1P02' })
    ];
    const ev = await service.createEvenement({
      date: '2026-04-01', domaineCode: 'DAP', libelle: 'TEST R1 perm',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT' },
        { personneId: people[1].personne_id, statut: 'PERMUTATION' }
      ]
    }, { sub: 'test' });
    await service.cloturer(ev.evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.volumes.presents, 2);
    assert.strictEqual(summary.officiel.volumes.permutations, 1);
    assert.strictEqual(summary.officiel.numerator, 2);
    const hors = await service.createEvenement({
      date: '2026-04-02', domaineCode: 'DPS', libelle: 'TEST R1 perm DPS',
      cibleIds: [g1.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const dps = await seedOnCible(repo, g1.cible_id, { nip: 'R1P03' });
    await service.figerPopulation(hors.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await expectHttp(
      () => service.enregistrerParticipations(hors.evenement.evenement_id, {
        baseVersion: 2,
        participations: [{ personneId: dps.personne_id, statut: 'PERMUTATION' }]
      }, { sub: 'test' }),
      422
    );
  });

  await record('22 — quatre motifs d’excuse toujours corrects', async () => {
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' });
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' });
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' });
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'ACCIDENT_MALADIE' });
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = [];
    for(let i = 1; i <= 5; i += 1){
      people.push(await seedOnCible(repo, y4.cible_id, { nip: `R1E${i}` }));
    }
    const ev = await service.createEvenement({
      date: '2026-04-10', domaineCode: 'DAP', libelle: 'TEST R1 motifs',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT' },
        { personneId: people[1].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
        { personneId: people[2].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' },
        { personneId: people[3].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' },
        { personneId: people[4].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'ACCIDENT_MALADIE' }
      ]
    }, { sub: 'test' });
    await service.cloturer(ev.evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.volumes.excusesPrive, 1);
    assert.strictEqual(summary.officiel.volumes.excusesProfessionnel, 1);
    assert.strictEqual(summary.officiel.volumes.excusesArmee, 1);
    assert.strictEqual(summary.officiel.volumes.excusesAccidentMaladie, 1);
    assert.strictEqual(summary.officiel.numerator, 1);
    assert.strictEqual(summary.officiel.denominator, 5);
  });

  await record('23 — analytics non régressé (somme événements)', async () => {
    const repo = createMemoryRepo();
    const analytics = createScopeAnalyticsService(repo);
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedOnCible(repo, y4.cible_id, { nip: 'R1AN1' });
    const ev = await service.createEvenement({
      date: '2026-02-01', domaineCode: 'DAP', libelle: 'TEST R1 analytics',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await closePresent(service, ev.evenement.evenement_id, [p]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 1);
    assert.strictEqual(summary.officiel.percentage, 100);
    assert.ok(summary.officiel.volumes);
  });

  await record('24 — objectives non régressé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const objectives = createScopeObjectivesService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 'test' });
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = [
      await seedOnCible(repo, y4.cible_id, { nip: 'R1O1' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1O2' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1O3' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1O4' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1O5' })
    ];
    const ev = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DAP', libelle: 'TEST R1 obj',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        ...people.slice(0, 4).map((x) => ({ personneId: x.personne_id, statut: 'PRESENT' })),
        { personneId: people[4].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }
      ]
    }, { sub: 'test' });
    await service.cloturer(ev.evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.percentage, 80);
    assert.strictEqual(summary.officiel.analyticStatus, 'ATTEINT');
  });

  await record('25 — alerts non régressé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const alerts = createScopeAlertsService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = [
      await seedOnCible(repo, y4.cible_id, { nip: 'R1AL1' }),
      await seedOnCible(repo, y4.cible_id, { nip: 'R1AL2' })
    ];
    const ev = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DAP', libelle: 'TEST R1 alert',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT' },
        { personneId: people[1].personne_id, statut: 'PERMUTATION' }
      ]
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const codes = (listed.alerts || []).filter((a) => a.eventId === ev.evenement.evenement_id).map((a) => a.code);
    assert.ok(!codes.includes('SAISIE_NON_RENSEIGNE'));
    assert.ok(codes.includes('CLOTURE_POSSIBLE'));
  });

  await record('26 — 8 LEGACY inchangés (hors KPI officiel)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const cible = await repo.findCible('DPS', 'G1');
    for(let i = 1; i <= 8; i += 1){
      const created = await service.createEvenement({
        date: `2026-01-${String(10 + i).padStart(2, '0')}`,
        domaineCode: 'DPS',
        libelle: `LEGACY R1 ${i}`,
        cibleIds: [cible.cible_id],
        origine: 'LEGACY_AGGREGATED'
      }, { sub: 'test' });
      await repo.insertLegacy({
        evenement_id: created.evenement.evenement_id,
        date: created.evenement.date,
        domaine_code: 'DPS',
        nb_presents: 10,
        nb_convoques: 12,
        payload_v67: { total_attendu: 12 }
      });
    }
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.ok(summary.legacy.points.length >= 8);
  });

  await record('27 — 16 personnes pilote préservées (Y4)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = [];
    for(let i = 1; i <= 16; i += 1){
      people.push(await seedOnCible(repo, y4.cible_id, { nip: `Y4R1${String(i).padStart(2, '0')}` }));
    }
    const ev = await service.createEvenement({
      date: '2026-04-10', domaineCode: 'DAP', libelle: 'TEST R1 16 Y4',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(ev.evenement.evenement_id);
    assert.strictEqual(preview.count, 16);
    assert.strictEqual(people.length, 16);
  });

  await record('28 — Monitoring F7 non modifié', async () => {
    const files = [
      'database/migrations/20260820_scope_model_2_r1.sql',
      'netlify/lib/_scope-schema.js',
      'netlify/lib/_scope-personnel.js',
      'netlify/lib/_scope-service.js'
    ];
    for(const rel of files){
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!/delete from monitoring_f7_/i.test(text));
      assert.ok(!/update monitoring_f7_records/i.test(text));
      assert.ok(!/update monitoring_f7_imported/i.test(text));
    }
    const f7 = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(f7.includes('Monitoring F7 v67.0'));
  });

  const nok = results.filter((r) => r.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - nok.length}/${results.length} PASS`);
  if(nok.length) process.exit(1);
})();

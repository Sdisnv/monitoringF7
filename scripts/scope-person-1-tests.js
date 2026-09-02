#!/usr/bin/env node
'use strict';

/** SCOPE-PERSON-1 — fiche individuelle nominative, liste batch, OI temporel. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeAlertsService } = require('../netlify/functions/_scope-alerts-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { hasPermission } = require('../netlify/functions/_rbac');
const { ALERTS_CONFIG } = require('../netlify/functions/_scope-alerts');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'test-person-1', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function closeWith(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, ACTOR);
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, ACTOR);
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, ACTOR);
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: spec.dateEntree || '2026-01-01'
  });
  if(cibleId){
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: spec.affDebut || spec.dateEntree || '2026-01-01',
      date_fin: spec.affFin || null
    });
  }
  return personne;
}

async function eventClosed(repo, service, { date, domaine, niveau, libelle, people, statuses }){
  const cible = await repo.findCible(domaine, niveau);
  const { evenement } = await service.createEvenement({
    date,
    domaineCode: domaine,
    libelle,
    cibleIds: [cible.cible_id]
  }, ACTOR);
  await closeWith(service, evenement.evenement_id, people, statuses);
  return evenement;
}

(async () => {
  await record('1 — personne active', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88001', nom: 'Actif', prenom: 'Ada', grade: 'Sgt' });
    await eventClosed(repo, service, {
      date: '2026-03-12', domaine: 'DAP', niveau: 'Y4', libelle: 'DAP actif',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026, preset: 'YEAR' });
    assert.strictEqual(fiche.identite.nip, '88001');
    assert.strictEqual(fiche.identite.statutRh, 'ACTIF');
    assert.strictEqual(fiche.identite.archivee, false);
    assert.ok(fiche.identite.oiActuel && fiche.identite.oiActuel.label === 'DAP/Y4');
    assert.strictEqual(fiche.kpi.percentage, 100);
  });

  await record('2 — personne archivée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88002', nom: 'Archive' });
    await service.archiverPersonne(p.personne_id, { date: '2026-08-01', type: 'SORTI' }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, { year: 2026, preset: 'YEAR' });
    assert.strictEqual(fiche.identite.archivee, true);
    assert.strictEqual(fiche.identite.statutRh, 'SORTI');
    assert.strictEqual(fiche.identite.libelleStatut, 'Personne archivée');
    assert.ok(fiche.historiqueRh.periodes.some((row) => row.type === 'SORTI'));
  });

  await record('3 — personne réactivée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88003', nom: 'Reac' });
    await service.archiverPersonne(p.personne_id, { date: '2026-04-01', type: 'SORTI' }, ACTOR);
    const out = await service.reactiverPersonne({
      personneId: p.personne_id,
      date: '2026-06-01',
      cibleId: y4.cible_id
    }, ACTOR);
    assert.strictEqual(out.personne.personne_id, p.personne_id);
    assert.strictEqual(out.memeIdentite, true);
    const fiche = await persons.fiche(p.personne_id, { year: 2026, preset: 'YEAR' });
    assert.strictEqual(fiche.identite.statutRh, 'ACTIF');
    assert.strictEqual(fiche.identite.archivee, false);
    assert.ok(fiche.historiqueRh.periodes.some((row) => row.type === 'SORTI' && row.date_fin));
    assert.ok(fiche.historiqueRh.periodes.filter((row) => row.type === 'ACTIF').length >= 2);
  });

  await record('4 — même NIP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88004' });
    await service.archiverPersonne(p.personne_id, { date: '2026-03-01', type: 'SORTI' }, ACTOR);
    await service.reactiverPersonne({ nip: '88004', date: '2026-05-01', cibleId: y4.cible_id }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.identite.nip, '88004');
  });

  await record('5 — même personne_id', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88005' });
    const id = p.personne_id;
    await service.archiverPersonne(id, { date: '2026-03-01', type: 'SORTI' }, ACTOR);
    await service.reactiverPersonne({ personneId: id, date: '2026-05-01', cibleId: y4.cible_id }, ACTOR);
    const dir = await persons.directory({ year: 2026, q: '88005', statut: 'tous' });
    assert.strictEqual(dir.personnes.length, 1);
    assert.strictEqual(dir.personnes[0].personneId, id);
  });

  await record('6 — changement OI temporel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88006' });
    await service.changerAffectation(p.personne_id, { cibleId: y3.cible_id, dateDebut: '2026-07-01' }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, { year: 2026, date: '2026-08-01' });
    assert.strictEqual(fiche.identite.oiActuel.label, 'DAP/Y3');
    assert.ok(fiche.historiqueRh.affectations.some((a) => a.label === 'DAP/Y4' && a.dateFin));
    assert.ok(fiche.historiqueRh.affectations.some((a) => a.label === 'DAP/Y3' && !a.dateFin));
  });

  await record('7 — événement classé ancien OI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88007' });
    await eventClosed(repo, service, {
      date: '2026-03-10', domaine: 'DAP', niveau: 'Y4', libelle: 'Avant changement',
      people: [p], statuses: ['PRESENT']
    });
    await service.changerAffectation(p.personne_id, { cibleId: y3.cible_id, dateDebut: '2026-07-01' }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, { year: 2026, date: '2026-08-20' });
    assert.strictEqual(fiche.evenements[0].oiAtDate, 'DAP/Y4');
    assert.notStrictEqual(fiche.identite.oiActuel.label, fiche.evenements[0].oiAtDate);
  });

  await record('8 — événement classé nouvel OI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88008' });
    await eventClosed(repo, service, {
      date: '2026-03-10', domaine: 'DAP', niveau: 'Y4', libelle: 'Y4 hist',
      people: [p], statuses: ['PRESENT']
    });
    await service.changerAffectation(p.personne_id, { cibleId: y3.cible_id, dateDebut: '2026-07-01' }, ACTOR);
    await eventClosed(repo, service, {
      date: '2026-08-10', domaine: 'DAP', niveau: 'Y3', libelle: 'Y3 nouveau',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026, date: '2026-08-20' });
    const y4ev = fiche.evenements.find((e) => e.libelle === 'Y4 hist');
    const y3ev = fiche.evenements.find((e) => e.libelle === 'Y3 nouveau');
    assert.strictEqual(y4ev.oiAtDate, 'DAP/Y4');
    assert.strictEqual(y3ev.oiAtDate, 'DAP/Y3');
  });

  await record('9 — congé sabbatique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88009' });
    await service.ouvrirPeriode(p.personne_id, {
      type: 'INDISPONIBLE',
      dateDebut: '2026-03-01',
      motif: 'CONGE_SABBATIQUE'
    }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, { year: 2026, date: '2026-03-15' });
    assert.strictEqual(fiche.identite.statutRh, 'INDISPONIBLE');
    assert.ok(fiche.identite.conge.libelle.includes('Congé sabbatique'));
  });

  await record('10 — congé n’est pas absence exercice', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const actif = await seedPerson(repo, y4.cible_id, { nip: '88010A', nom: 'Actif' });
    const conge = await seedPerson(repo, y4.cible_id, { nip: '88010B', nom: 'Conge' });
    await service.ouvrirPeriode(conge.personne_id, {
      type: 'INDISPONIBLE', dateDebut: '2026-03-01', motif: 'CONGE_SABBATIQUE'
    }, ACTOR);
    await eventClosed(repo, service, {
      date: '2026-03-12', domaine: 'DAP', niveau: 'Y4', libelle: 'Pendant congé',
      people: [actif], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(conge.personne_id, { year: 2026 });
    assert.strictEqual(fiche.evenements.length, 0);
    assert.strictEqual(fiche.kpi.volumes.excuses, 0);
    assert.ok(!fiche.evenements.some((e) => e.statutParticipation === 'ABSENT_EXCUSE'));
  });

  await record('11 — taux 13/15', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88011' });
    for(let i = 1; i <= 15; i += 1){
      const statut = i <= 13
        ? 'PRESENT'
        : (i === 14 ? { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' } : 'ABSENT_NON_EXCUSE');
      await eventClosed(repo, service, {
        date: `2026-02-${String(i).padStart(2, '0')}`,
        domaine: 'DAP', niveau: 'Y4', libelle: `E${i}`,
        people: [p], statuses: [statut]
      });
    }
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.numerator, 13);
    assert.strictEqual(fiche.kpi.denominator, 15);
    assert.strictEqual(fiche.kpi.percentage, 86.7);
  });

  await record('12 — dispensé hors dénominateur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88012' });
    await eventClosed(repo, service, {
      date: '2026-04-01', domaine: 'DPS', niveau: 'G1', libelle: 'P1',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-04-02', domaine: 'DPS', niveau: 'G1', libelle: 'Disp',
      people: [p], statuses: ['DISPENSE']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.numerator, 1);
    assert.strictEqual(fiche.kpi.denominator, 1);
    assert.strictEqual(fiche.kpi.volumes.dispenses, 1);
    assert.strictEqual(fiche.kpi.percentage, 100);
  });

  await record('13 — permutation = présence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88013' });
    await eventClosed(repo, service, {
      date: '2026-05-01', domaine: 'DAP', niveau: 'Y4', libelle: 'Perm',
      people: [p], statuses: [{ statut: 'PERMUTATION', cibleSuivieId: y3.cible_id }]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.volumes.presents, 1);
    assert.strictEqual(fiche.kpi.volumes.permutations, 1);
    assert.strictEqual(fiche.kpi.numerator, 1);
    assert.strictEqual(fiche.evenements[0].permutation, true);
    assert.strictEqual(fiche.evenements[0].oiAccueil, 'DAP/Y3');
  });

  await record('14 — permutation non doublée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88014' });
    for(let i = 1; i <= 10; i += 1){
      const statut = i <= 2 ? 'PERMUTATION' : 'PRESENT';
      await eventClosed(repo, service, {
        date: `2026-06-${String(i).padStart(2, '0')}`,
        domaine: 'DAP', niveau: 'Y4', libelle: `P${i}`,
        people: [p], statuses: [statut]
      });
    }
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.volumes.presents, 10);
    assert.strictEqual(fiche.kpi.volumes.permutations, 2);
    assert.strictEqual(fiche.kpi.numerator, 10);
    assert.notStrictEqual(fiche.kpi.numerator, 12);
  });

  await record('15 — privé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88015' });
    await eventClosed(repo, service, {
      date: '2026-04-03', domaine: 'DPS', niveau: 'G1', libelle: 'Privé',
      people: [p], statuses: [{ statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.motifs.prive, 1);
  });

  await record('16 — professionnel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88016' });
    await eventClosed(repo, service, {
      date: '2026-04-04', domaine: 'DPS', niveau: 'G1', libelle: 'Pro',
      people: [p], statuses: [{ statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' }]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.motifs.professionnel, 1);
  });

  await record('17 — armée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88017' });
    await eventClosed(repo, service, {
      date: '2026-04-05', domaine: 'DPS', niveau: 'G1', libelle: 'Armée',
      people: [p], statuses: [{ statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' }]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.motifs.armee, 1);
  });

  await record('18 — accident/maladie', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88018' });
    await eventClosed(repo, service, {
      date: '2026-04-06', domaine: 'DPS', niveau: 'G1', libelle: 'Santé',
      people: [p], statuses: [{ statut: 'ABSENT_EXCUSE', motif_absence: 'ACCIDENT_MALADIE' }]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.motifs.accidentMaladie, 1);
  });

  await record('19 — non précisé historique', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88019' });
    const event = await repo.insertEvenement({
      date: '2026-04-07',
      domaine_code: 'DPS',
      libelle: 'Hist motif',
      statut: 'REALISE',
      origine: 'NOMINATIF',
      mode_suivi: 'NOMINATIF',
      cible_ids: [g1.cible_id]
    });
    await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({
      evenement_id: event.evenement_id,
      personne_id: p.personne_id,
      statut: 'ABSENT_EXCUSE',
      motif_absence: 'NON_PRECISE'
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.motifs.nonPrecise, 1);
    assert.strictEqual(fiche.kpi.volumes.excuses, 1);
  });

  await record('20 — absent non excusé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88020' });
    await eventClosed(repo, service, {
      date: '2026-04-08', domaine: 'DPS', niveau: 'G1', libelle: 'Non excusé',
      people: [p], statuses: ['ABSENT_NON_EXCUSE']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.volumes.nonExcuses, 1);
    assert.strictEqual(fiche.alertesPersonne.active, false);
    assert.strictEqual(fiche.alertesPersonne.absencesNonExcusees, 1);
  });

  await record('21 — NON_RENSEIGNE comportement', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88021' });
    const event = await repo.insertEvenement({
      date: '2026-04-09',
      domaine_code: 'DPS',
      libelle: 'Non renseigné',
      statut: 'REALISE',
      origine: 'NOMINATIF',
      mode_suivi: 'NOMINATIF',
      cible_ids: [g1.cible_id]
    });
    await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({
      evenement_id: event.evenement_id,
      personne_id: p.personne_id,
      statut: 'NON_RENSEIGNE'
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.percentage, null);
    assert.strictEqual(fiche.kpi.analyticStatus, 'NON_EVALUABLE');
    assert.strictEqual(fiche.kpi.volumes.nonRenseignes, 1);
    assert.strictEqual(fiche.kpi.volumes.nonExcuses, 0);
    assert.strictEqual(fiche.evenements[0].statutParticipation, 'NON_RENSEIGNE');
  });

  await record('22 — QUANTITATIF exclu personne', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88022' });
    await repo.insertEvenement({
      date: '2026-04-10',
      domaine_code: 'DPS',
      libelle: 'Qty',
      statut: 'REALISE',
      origine: 'NOMINATIF',
      mode_suivi: 'QUANTITATIF',
      cible_ids: [g1.cible_id]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(!fiche.evenements.some((e) => e.libelle === 'Qty'));
    assert.ok((fiche.exclusions.horsPerimetre || 0) >= 1 || fiche.kpi.eventCount === 0);
  });

  await record('23 — LEGACY exclu personne', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88023' });
    await repo.insertEvenement({
      date: '2026-04-11',
      domaine_code: 'DPS',
      libelle: 'Legacy',
      statut: 'REALISE',
      origine: 'LEGACY_AGGREGATED',
      mode_suivi: 'LEGACY',
      cible_ids: [g1.cible_id]
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(!fiche.evenements.some((e) => e.libelle === 'Legacy'));
    assert.ok(fiche.explain.modesInclus.includes('NOMINATIF'));
    assert.ok(!fiche.evenements.some((e) => e.modeSuivi === 'LEGACY'));
  });

  await record('24 — domaine', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88024' });
    await repo.insertAffectation({
      personne_id: p.personne_id, cible_id: g1.cible_id, date_debut: '2026-01-01'
    });
    await eventClosed(repo, service, {
      date: '2026-03-01', domaine: 'DAP', niveau: 'Y4', libelle: 'DAP',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-03-02', domaine: 'DPS', niveau: 'G1', libelle: 'DPS',
      people: [p], statuses: ['ABSENT_NON_EXCUSE']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    const dap = fiche.domaines.find((d) => d.code === 'DAP');
    const dps = fiche.domaines.find((d) => d.code === 'DPS');
    assert.strictEqual(dap.percentage, 100);
    assert.strictEqual(dps.percentage, 0);
    assert.strictEqual(dps.eventCount, 1);
  });

  await record('25 — sous-domaine', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const pr = await repo.findCible('PR', 'G1');
    const p = await seedPerson(repo, pr.cible_id, { nip: '88025' });
    await eventClosed(repo, service, {
      date: '2026-03-03', domaine: 'PR', niveau: 'G1', libelle: 'PAPR',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    const fospec = fiche.domaines.find((d) => d.code === 'FOSPEC');
    assert.ok(fospec.eventCount >= 1);
    assert.strictEqual(fiche.evenements[0].domaine, 'PR');
  });

  await record('26 — objectif unique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const objectifs = createScopeObjectivesService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88026' });
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, ACTOR);
    await eventClosed(repo, service, {
      date: '2026-03-04', domaine: 'DPS', niveau: 'G1', libelle: 'Obj',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(fiche.objectif.message.includes('80'));
    assert.strictEqual(fiche.kpi.analyticStatus, 'ATTEINT');
  });

  await record('27 — objectifs multiples', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const objectifs = createScopeObjectivesService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88027' });
    await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-06-30'
    }, ACTOR);
    await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 90, dateDebut: '2026-07-01'
    }, ACTOR);
    await eventClosed(repo, service, {
      date: '2026-03-05', domaine: 'DPS', niveau: 'G1', libelle: 'S1',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-08-05', domaine: 'DPS', niveau: 'G1', libelle: 'S2',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(fiche.objectif.message.includes('Plusieurs objectifs'));
  });

  await record('28 — aucun objectif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88028' });
    await eventClosed(repo, service, {
      date: '2026-03-06', domaine: 'DPS', niveau: 'G1', libelle: 'Sans obj',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.objectif.message, 'Aucun objectif défini.');
  });

  await record('29 — NON_EVALUABLE', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88029' });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.kpi.percentage, null);
    assert.strictEqual(fiche.kpi.analyticStatus, 'NON_EVALUABLE');
  });

  await record('30 — explain', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88030' });
    await eventClosed(repo, service, {
      date: '2026-03-07', domaine: 'DPS', niveau: 'G1', libelle: 'Explain',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(fiche.explain.modesInclus.includes('NOMINATIF'));
    assert.ok(fiche.explain.modesInclus.includes('QUANTITATIF'));
    assert.ok(fiche.explain.totals.numerator === 1);
    assert.ok(fiche.rapportPersonne.disponible === true);
    assert.strictEqual(fiche.rapportPersonne.kind, 'PERSON');
  });

  await record('31 — timeseries', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88031' });
    await eventClosed(repo, service, {
      date: '2026-02-10', domaine: 'DPS', niveau: 'G1', libelle: 'Fév',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-03-10', domaine: 'DPS', niveau: 'G1', libelle: 'Mars',
      people: [p], statuses: ['ABSENT_NON_EXCUSE']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.ok(fiche.timeseries.officiel.length >= 2);
    const feb = fiche.timeseries.officiel.find((b) => b.month === '2026-02');
    const mar = fiche.timeseries.officiel.find((b) => b.month === '2026-03');
    assert.strictEqual(feb.percentage, 100);
    assert.strictEqual(mar.percentage, 0);
    assert.strictEqual(feb.numerator + mar.numerator, 1);
  });

  await record('32 — liste événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88032' });
    await eventClosed(repo, service, {
      date: '2026-01-10', domaine: 'DPS', niveau: 'G1', libelle: 'Ancien',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-05-10', domaine: 'DPS', niveau: 'G1', libelle: 'Récent',
      people: [p], statuses: ['PRESENT']
    });
    const fiche = await persons.fiche(p.personne_id, { year: 2026 });
    assert.strictEqual(fiche.evenements[0].libelle, 'Récent');
    assert.ok(fiche.evenements[0].href.includes('#/exercices/'));
  });

  await record('33 — filtre période', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88033' });
    await eventClosed(repo, service, {
      date: '2026-02-01', domaine: 'DPS', niveau: 'G1', libelle: 'Fév',
      people: [p], statuses: ['PRESENT']
    });
    await eventClosed(repo, service, {
      date: '2026-08-01', domaine: 'DPS', niveau: 'G1', libelle: 'Août',
      people: [p], statuses: ['PRESENT']
    });
    const year = await persons.fiche(p.personne_id, { year: 2026, preset: 'YEAR' });
    const month = await persons.fiche(p.personne_id, { year: 2026, preset: 'MONTH', month: '2' });
    assert.strictEqual(year.evenements.length, 2);
    assert.strictEqual(month.evenements.length, 1);
    assert.strictEqual(month.evenements[0].libelle, 'Fév');
  });

  await record('34 — recherche NIP', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await seedPerson(repo, y4.cible_id, { nip: '88034', nom: 'Alpha' });
    await seedPerson(repo, y4.cible_id, { nip: '88099', nom: 'Beta' });
    const dir = await persons.directory({ year: 2026, q: '88034', statut: 'actifs' });
    assert.strictEqual(dir.personnes.length, 1);
    assert.strictEqual(dir.personnes[0].nip, '88034');
  });

  await record('35 — filtre OI', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const g1 = await repo.findCible('DPS', 'G1');
    await seedPerson(repo, y4.cible_id, { nip: '88035A', nom: 'Dap' });
    await seedPerson(repo, g1.cible_id, { nip: '88035B', nom: 'Dps' });
    const dir = await persons.directory({ year: 2026, statut: 'actifs', oi: 'DAP/Y4' });
    assert.ok(dir.personnes.every((p) => p.oiActuel === 'DAP/Y4'));
    assert.ok(dir.personnes.some((p) => p.nip === '88035A'));
    assert.ok(!dir.personnes.some((p) => p.nip === '88035B'));
  });

  await record('36 — archivés séparés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const actif = await seedPerson(repo, y4.cible_id, { nip: '88036A' });
    const test = await seedPerson(repo, y4.cible_id, { nip: '99136', nom: 'TestArch' });
    await service.archiverPersonne(test.personne_id, { date: '2026-06-01', type: 'SORTI' }, ACTOR);
    const actifs = await persons.directory({ year: 2026, statut: 'actifs' });
    const archives = await persons.directory({ year: 2026, statut: 'archives' });
    assert.ok(actifs.personnes.some((p) => p.personneId === actif.personne_id));
    assert.ok(!actifs.personnes.some((p) => p.nip === '99136'));
    assert.ok(archives.personnes.some((p) => p.nip === '99136'));
    assert.ok(!archives.personnes.some((p) => p.personneId === actif.personne_id));
  });

  await record('37 — RBAC', async () => {
    assert.ok(hasPermission({ roles: ['ADMINISTRATEUR'] }, 'personnel:read'));
    assert.ok(hasPermission({ roles: ['GESTIONNAIRE'] }, 'personnel:read'));
    assert.ok(hasPermission({ roles: ['UTILISATEUR'] }, 'personnel:read'));
    assert.ok(!hasPermission({ roles: ['UTILISATEUR'] }, 'personnel:manage'));
    assert.ok(hasPermission({ roles: ['sdis-admin'] }, 'personnel:read'));
    const rbac = fs.readFileSync(path.join(ROOT, 'netlify/functions/_rbac.js'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/rbac.js'), 'utf8');
    const scopeUi = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(rbac.includes('personnel:read') && scopeUi.includes('personnel:read'));
    assert.ok(ui.includes('CurrentPermissions') && !ui.includes('ROLE_PERMISSIONS'));
    const scope = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(scope.includes("hasPermission(claims, 'personnel:read')"));
  });

  await record('38 — liste batch sans N+1', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    for(let i = 1; i <= 8; i += 1){
      await seedPerson(repo, y4.cible_id, { nip: `8813${i}`, nom: `Batch${i}` });
    }
    let loads = 0;
    const orig = repo.loadAnalyticsBundle.bind(repo);
    repo.loadAnalyticsBundle = async function wrapped(query){
      loads += 1;
      return orig(query);
    };
    const dir = await persons.directory({ year: 2026, statut: 'actifs' });
    assert.ok(dir.personnes.length >= 8);
    assert.strictEqual(loads, 1);
    assert.strictEqual(dir.performance.mode, 'batch');
  });

  await record('39 — population figée historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const y3 = await repo.findCible('DAP', 'Y3');
    const p = await seedPerson(repo, y4.cible_id, { nip: '88039' });
    const { evenement } = await service.createEvenement({
      date: '2026-03-20', domaineCode: 'DAP', libelle: 'Figé Y4', cibleIds: [y4.cible_id]
    }, ACTOR);
    await closeWith(service, evenement.evenement_id, [p], ['PRESENT']);
    const before = await persons.fiche(p.personne_id, { year: 2026 });
    await service.changerAffectation(p.personne_id, { cibleId: y3.cible_id, dateDebut: '2026-07-01' }, ACTOR);
    const after = await persons.fiche(p.personne_id, { year: 2026, date: '2026-08-01' });
    assert.strictEqual(before.kpi.percentage, after.kpi.percentage);
    assert.ok(after.evenements.some((e) => e.libelle === 'Figé Y4' && e.oiAtDate === 'DAP/Y4'));
  });

  await record('40 — analytics non régressé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = [];
    for(let i = 1; i <= 15; i += 1){
      people.push(await seedPerson(repo, g1.cible_id, { nip: `A40${String(i).padStart(2, '0')}` }));
    }
    const statuses = [
      ...Array(13).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      'ABSENT_NON_EXCUSE'
    ];
    await eventClosed(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Habileté',
      people, statuses
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 13);
    assert.strictEqual(summary.officiel.denominator, 15);
    assert.strictEqual(summary.officiel.percentage, 86.7);
  });

  await record('41 — reports non régressé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const p = await seedPerson(repo, g1.cible_id, { nip: '88041' });
    const ev = await eventClosed(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Rapport',
      people: [p], statuses: ['PRESENT']
    });
    const out = await generateReport(repo, { kind: 'EVENT', evenementId: ev.evenement_id }, ACTOR);
    assert.ok(out && (out.bytes || out.buffer || out.pdf || out.filename));
  });

  await record('42 — alerts non régressé', async () => {
    assert.strictEqual(ALERTS_CONFIG.personUnderObjective.enabled, false);
    assert.strictEqual(ALERTS_CONFIG.repeatedUnexcusedAbsences.enabled, false);
    const repo = createMemoryRepo();
    const alerts = createScopeAlertsService(repo);
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(listed.config.personUnderObjective.enabled, false);
    assert.ok(Array.isArray(listed.alerts));
  });

  await record('hash #/personnel/:id distinct de fiche exercice', async () => {
    assert.strictEqual(logic.parseHash('#/personnel/uuid-1').screen, 'personne');
    assert.strictEqual(logic.parseHash('#/personnel/uuid-1').personneId, 'uuid-1');
    assert.strictEqual(logic.parseHash('#/personnel/uuid-1').id, undefined);
    assert.strictEqual(logic.parseHash('#/exercices/uuid-1').id, 'uuid-1');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

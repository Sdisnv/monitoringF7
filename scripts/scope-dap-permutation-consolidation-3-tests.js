#!/usr/bin/env node
'use strict';

/** SCOPE-DAP-PERMUTATION-CONSOLIDATION-3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const display = require('../assets/js/scope-personnel-display');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-dap-permutation-consolidation-3', roles: ['ADMIN'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, index){
  const p = await repo.insertPersonne({
    nip,
    nom: `Consolidation${String(index).padStart(2, '0')}`,
    prenom: 'DAP',
    grade: 'Sdt',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cibleRow.cible_id, date_debut: '2020-01-01' });
  return p;
}

async function frozenEvent(service, cibleRow, date, libelle, exerciseEquivalenceKey){
  const created = await service.createEvenement({
    date,
    domaineCode: cibleRow.domaine_code,
    libelle,
    cibleIds: [cibleRow.cible_id],
    exerciseEquivalenceKey
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function saveMany(service, eventId, rows){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: rows.map((row) => ({
      personneId: row.personne.personne_id,
      statut: row.statut,
      motifAbsence: row.motifAbsence || null,
      role: 'PARTICIPANT'
    }))
  }, ACTOR);
}

async function saveOne(service, eventId, personne, statut){
  return saveMany(service, eventId, [{ personne, statut }]);
}

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT',
    motifInclusion: L.permutationCatchupMotif({ libelle: sourceLabel })
  }, ACTOR);
}

async function removeExpected(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.retirerAttendu(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id
  }, ACTOR);
}

async function fixture(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const y3 = await cible(repo, 'DAP', 'Y3');
  const people = [];
  for(let i = 0; i < 18; i += 1){
    people.push(await person(repo, y1, `DAP-C3-${String(i + 1).padStart(2, '0')}`, i + 1));
  }
  const source = await frozenEvent(service, y1, '2026-04-01', 'Exercice DAP 1', 'DAP_EX1');
  const targetY2 = await frozenEvent(service, y2, '2026-04-08', 'Exercice DAP 1', 'DAP_EX1');
  const targetY3 = await frozenEvent(service, y3, '2026-04-10', 'Exercice DAP 1', 'DAP_EX1');
  return { repo, service, persons, people, source, targetY2, targetY3 };
}

async function sourceRate(ctx){
  return ctx.service.tauxEvenement(ctx.source.eventId);
}

async function prepareSource(ctx, presentCount, permutationCount){
  const rows = ctx.people.map((personne, index) => ({
    personne,
    statut: index < presentCount ? 'PRESENT' : (index < presentCount + permutationCount ? 'PERMUTATION' : 'ABSENT_NON_EXCUSE')
  }));
  await saveMany(ctx.service, ctx.source.eventId, rows);
  await close(ctx.service, ctx.source.eventId);
}

async function catchup(ctx, person, target, sourceLabel = 'Exercice DAP 1, section DAP Y1'){
  await addCatchup(ctx.service, target.eventId, person, sourceLabel);
  await saveOne(ctx.service, target.eventId, person, 'PRESENT');
}

(async () => {
  await record('01 - 17 presents + 1 permutation ouverte / 18 = 94.4', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 17);
    eq(taux.denominator, 18);
    eq(taux.percentage, 94.4);
    eq(taux.rattrapagesRealises, 0);
    eq(taux.aRattraper, 1);
  });

  await record('02 - 17 presents + 1 permutation rattrapee / 18 = 100', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    await catchup(ctx, ctx.people[17], ctx.targetY2);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 18);
    eq(taux.denominator, 18);
    eq(taux.percentage, 100);
    eq(taux.rattrapagesRealises, 1);
    eq(taux.aRattraper, 0);
  });

  await record('03 - 16 presents + 2 permutations ouvertes / 18 = 88.9', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 16, 2);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 16);
    eq(taux.denominator, 18);
    eq(taux.percentage, 88.9);
  });

  await record('04 - 16 presents + 2 permutations dont 1 rattrapee / 18 = 94.4', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 16, 2);
    await catchup(ctx, ctx.people[16], ctx.targetY2);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 17);
    eq(taux.denominator, 18);
    eq(taux.percentage, 94.4);
    eq(taux.rattrapagesRealises, 1);
    eq(taux.aRattraper, 1);
  });

  await record('05 - 16 presents + 2 permutations toutes rattrapees / 18 = 100', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 16, 2);
    await catchup(ctx, ctx.people[16], ctx.targetY2);
    await catchup(ctx, ctx.people[17], ctx.targetY3);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 18);
    eq(taux.denominator, 18);
    eq(taux.percentage, 100);
    eq(taux.rattrapagesRealises, 2);
    eq(taux.aRattraper, 0);
  });

  await record('06 - suppression d un rattrapage rouvre l obligation et redescend a 94.4', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 16, 2);
    await catchup(ctx, ctx.people[16], ctx.targetY2);
    await catchup(ctx, ctx.people[17], ctx.targetY3);
    await removeExpected(ctx.service, ctx.targetY3.eventId, ctx.people[17]);
    const obligation = (await ctx.repo.listPermutations({ personneId: ctx.people[17].personne_id }))[0];
    eq(obligation.statut, 'A_RATTRAPER');
    eq(obligation.rattrapage_evenement_id, null);
    const taux = await sourceRate(ctx);
    eq(taux.numerator, 17);
    eq(taux.denominator, 18);
    eq(taux.percentage, 94.4);
  });

  await record('07 - fiche individuelle source + destination = 1 obligation attendue / 1 realisee', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    await catchup(ctx, ctx.people[17], ctx.targetY2);
    await close(ctx.service, ctx.targetY2.eventId);
    const fiche = await ctx.persons.fiche(ctx.people[17].personne_id, { from: '2026-01-01', to: '2026-12-31' });
    eq(fiche.kpi.denominator, 1);
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.percentage, 100);
    eq(fiche.kpi.eventCount, 1);
    deepEq(fiche.evenements.map((row) => row.date), ['2026-04-01', '2026-04-08']);
    eq(display.ficheEventStatutLabel(fiche.evenements[0]), 'Permutation');
    eq(display.ficheEventInformations(fiche.evenements[0]), 'Rattrapage section DAP Y2');
    eq(display.ficheEventCible(fiche.evenements[1]), 'Rattrapage');
    eq(display.ficheEventInformations(fiche.evenements[1]), 'Exercice DAP 1, section DAP Y1');
  });

  await record('08 - aucune affectation permanente ajoutee par rattrapage', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    const before = await ctx.repo.listAffectations({ personneId: ctx.people[17].personne_id });
    await catchup(ctx, ctx.people[17], ctx.targetY2);
    const after = await ctx.repo.listAffectations({ personneId: ctx.people[17].personne_id });
    eq(after.length, before.length);
    deepEq(after.map((row) => row.cible_id), before.map((row) => row.cible_id));
  });

  await record('09 - destination identifiee Rattrapage et provenance correcte', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    await catchup(ctx, ctx.people[17], ctx.targetY2);
    const targetReport = await collectReport(ctx.repo, { kind: 'EVENT', id: ctx.targetY2.eventId }, { includeNominatif: true });
    const row = targetReport.nominatif.find((item) => item.nip === 'DAP-C3-18');
    eq(row.cible, 'Rattrapage');
    eq(row.motifLabel, 'Exercice DAP 1, section DAP Y1');
    eq(row.statutLabel, 'Présent');
  });

  await record('10 - deux rattrapages dans deux sections ne collisionnent pas', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 16, 2);
    await catchup(ctx, ctx.people[16], ctx.targetY2);
    await catchup(ctx, ctx.people[17], ctx.targetY3);
    const p17 = (await ctx.repo.listPermutations({ personneId: ctx.people[16].personne_id }))[0];
    const p18 = (await ctx.repo.listPermutations({ personneId: ctx.people[17].personne_id }))[0];
    ok(p17.permutation_id !== p18.permutation_id);
    ok(p17.rattrapage_evenement_id !== p18.rattrapage_evenement_id);
    const taux = await sourceRate(ctx);
    eq(taux.percentage, 100);
  });

  await record('11 - PDF: Rattrapage non tronque dans la colonne Cible et note metier consolidee', () => {
    const pdf = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    ok(pdf.includes('Permutations : ${permutations} · Rattrapages réalisés : ${rattrapages} · À rattraper : ${ouverts}'));
    ok(pdf.includes('[38, 72, 62, 42, 36, 60, 52, 137]'));
    ok(!pdf.includes('Rattrap...'));
    ok(!pdf.includes('statuts Permutation, non comptés comme présences événementielles'));
  });

  await record('12 - analytics agrège sans double comptage source + destination', async () => {
    const ctx = await fixture();
    await prepareSource(ctx, 17, 1);
    await catchup(ctx, ctx.people[17], ctx.targetY2);
    await close(ctx.service, ctx.targetY2.eventId);
    const persons = createScopePersonService(ctx.repo);
    const fiche = await persons.fiche(ctx.people[17].personne_id, { from: '2026-01-01', to: '2026-12-31' });
    const dap = fiche.domaines.find((row) => row.code === 'DAP');
    eq(dap.denominator, 1);
    eq(dap.numerator, 1);
    eq(dap.eventCount, 1);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

#!/usr/bin/env node
'use strict';

/** SCOPE-DAP-PERMUTATION-INTEGRITY-4 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeObjectivesService } = require('../netlify/lib/_scope-objectives-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const display = require('../assets/js/scope-personnel-display');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-dap-permutation-integrity-4',
  roles: ['ADMIN'],
  displayName: 'Testeur SCOPE'
};
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

function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0) chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    return _;
  });
  return chunks.join('');
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, index, options = {}){
  const personne = await repo.insertPersonne({
    nip,
    nom: options.nom || `Integrity${String(index).padStart(2, '0')}`,
    prenom: options.prenom || 'DAP',
    grade: options.grade || 'Sdt',
    date_entree: options.dateEntree || '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleRow.cible_id,
    date_debut: options.dateDebut || '2020-01-01',
    date_fin: options.dateFin || null
  });
  return personne;
}

async function frozenEvent(service, cibleRow, date, libelle, exerciseEquivalenceKey){
  const created = await service.createEvenement({
    date,
    domaineCode: cibleRow.domaine_code,
    libelle,
    cibleIds: [cibleRow.cible_id],
    exerciseEquivalenceKey
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
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
      commentaire: row.commentaire || null,
      role: 'PARTICIPANT'
    }))
  }, ACTOR);
}

async function saveOne(service, eventId, personne, statut, motifAbsence){
  return saveMany(service, eventId, [{ personne, statut, motifAbsence }]);
}

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel = 'Exercice DAP 1, section DAP Y1'){
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

async function baseFixture({ y1Count = 18, y2Count = 0, prefix = 'I4' } = {}){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const analytics = createScopeAnalyticsService(repo);
  const objectives = createScopeObjectivesService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const y1People = [];
  const y2People = [];
  for(let i = 0; i < y1Count; i += 1){
    y1People.push(await person(repo, y1, `${prefix}-Y1-${String(i + 1).padStart(2, '0')}`, i + 1));
  }
  for(let i = 0; i < y2Count; i += 1){
    y2People.push(await person(repo, y2, `${prefix}-Y2-${String(i + 1).padStart(2, '0')}`, i + 1));
  }
  const source = await frozenEvent(service, y1, '2026-04-01', 'Exercice DAP 1', 'DAP_EX1');
  const target = await frozenEvent(service, y2, '2026-04-08', 'Exercice DAP 1', 'DAP_EX1');
  const dap2 = await frozenEvent(service, y1, '2026-05-01', 'Exercice DAP 2', 'DAP_EX2');
  return { repo, service, persons, analytics, objectives, y1, y2, y1People, y2People, source, target, dap2 };
}

async function prepareSource(ctx, presentCount, permutationCount){
  const rows = ctx.y1People.map((personne, index) => ({
    personne,
    statut: index < presentCount ? 'PRESENT' : (index < presentCount + permutationCount ? 'PERMUTATION' : 'ABSENT_NON_EXCUSE')
  }));
  await saveMany(ctx.service, ctx.source.eventId, rows);
}

async function realizedCatchup(ctx, personne){
  await addCatchup(ctx.service, ctx.target.eventId, personne);
  await saveOne(ctx.service, ctx.target.eventId, personne, 'PRESENT');
}

function participationSnapshot(rows){
  return new Map((rows || []).map((row) => [String(row.personne_id), {
    statut: row.statut,
    motif: row.motif_absence || null,
    role: row.role || null,
    source: row.source || null
  }]));
}

(async () => {
  await record('01 - changer PERMUTATION vers un autre statut supprime obligation et disponibilite rattrapage', async () => {
    const variants = [
      { statut: 'PRESENT' },
      { statut: 'ABSENT_EXCUSE', motif: 'PRIVE' },
      { statut: 'ABSENT_NON_EXCUSE' },
      { statut: 'DISPENSE', motif: 'PAS_CONCERNE' }
    ];
    for(const variant of variants){
      const ctx = await baseFixture({ prefix: `I4-${variant.statut}` });
      await prepareSource(ctx, 17, 1);
      eq((await ctx.repo.listPermutations({ personneId: ctx.y1People[17].personne_id })).length, 1);
      await saveOne(ctx.service, ctx.source.eventId, ctx.y1People[17], variant.statut, variant.motif);
      deepEq(await ctx.repo.listPermutations({ personneId: ctx.y1People[17].personne_id }), []);
      const sourcePermutations = await ctx.service.permutationsForEvent(ctx.source.eventId);
      const targetPermutations = await ctx.service.permutationsForEvent(ctx.target.eventId);
      eq(sourcePermutations.obligations.length, 0, `source ${variant.statut}`);
      eq(targetPermutations.obligations.length, 0, `destination ${variant.statut}`);
    }
  });

  await record('02 - ajout et suppression rattrapage preservent les saisies existantes de destination', async () => {
    const ctx = await baseFixture({ y2Count: 14, prefix: 'I4-PRESERVE' });
    await prepareSource(ctx, 17, 1);
    const destinationRows = [
      ...ctx.y2People.slice(0, 10).map((personne) => ({ personne, statut: 'PRESENT' })),
      ...ctx.y2People.slice(10, 12).map((personne) => ({ personne, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' })),
      { personne: ctx.y2People[12], statut: 'ABSENT_NON_EXCUSE' },
      { personne: ctx.y2People[13], statut: 'DISPENSE', motifAbsence: 'PAS_CONCERNE' }
    ];
    await saveMany(ctx.service, ctx.target.eventId, destinationRows);
    const before = participationSnapshot(await ctx.repo.listParticipations(ctx.target.eventId));
    await realizedCatchup(ctx, ctx.y1People[17]);
    const afterAdd = participationSnapshot(await ctx.repo.listParticipations(ctx.target.eventId));
    for(const personne of ctx.y2People){
      deepEq(afterAdd.get(String(personne.personne_id)), before.get(String(personne.personne_id)), personne.nip);
    }
    await removeExpected(ctx.service, ctx.target.eventId, ctx.y1People[17]);
    const afterRemove = participationSnapshot(await ctx.repo.listParticipations(ctx.target.eventId));
    for(const personne of ctx.y2People){
      deepEq(afterRemove.get(String(personne.personne_id)), before.get(String(personne.personne_id)), personne.nip);
    }
    const obligation = (await ctx.repo.listPermutations({ personneId: ctx.y1People[17].personne_id }))[0];
    eq(obligation.statut, 'A_RATTRAPER');
    eq(obligation.rattrapage_evenement_id, null);
  });

  await record('03 - seance source reste photo physique, analytics consolide sans double comptage', async () => {
    const ctx = await baseFixture({ prefix: 'I4-PHOTO' });
    await prepareSource(ctx, 16, 2);
    await close(ctx.service, ctx.source.eventId);
    await realizedCatchup(ctx, ctx.y1People[16]);
    await realizedCatchup(ctx, ctx.y1People[17]);
    await close(ctx.service, ctx.target.eventId);
    const sourcePhysical = await ctx.service.tauxEvenement(ctx.source.eventId);
    eq(sourcePhysical.numerator, 16);
    eq(sourcePhysical.denominator, 18);
    eq(sourcePhysical.percentage, 88.9);
    const summary = await ctx.analytics.summary({
      evenementId: ctx.source.eventId,
      from: '2026-01-01',
      to: '2026-12-31'
    });
    eq(summary.officiel.numerator, 18);
    eq(summary.officiel.denominator, 18);
    eq(summary.officiel.percentage, 100);
    eq(summary.officiel.volumes.realisationsDirectes, 16);
    eq(summary.officiel.volumes.rattrapagesRealises, 2);
    eq(summary.officiel.volumes.aRattraper, 0);
  });

  await record('04 - evenement destination expose provenance, KPI rattrapage et effectif section date', async () => {
    const ctx = await baseFixture({ y2Count: 14, prefix: 'I4-EVENT' });
    await person(ctx.repo, ctx.y2, 'I4-Y2-FUTURE', 99, { dateDebut: '2026-12-01' });
    await prepareSource(ctx, 17, 1);
    await saveMany(ctx.service, ctx.target.eventId, ctx.y2People.map((personne) => ({ personne, statut: 'PRESENT' })));
    await realizedCatchup(ctx, ctx.y1People[17]);
    const fiche = await ctx.service.lireEvenement(ctx.target.eventId);
    eq(fiche.rattrapages.count, 1);
    eq(fiche.sectionEffectif, 14);
    const report = await collectReport(ctx.repo, { kind: 'EVENT', id: ctx.target.eventId }, { includeNominatif: true });
    const catchup = report.nominatif.find((row) => row.nip === ctx.y1People[17].nip);
    eq(catchup.cible, 'Rattrapage');
    eq(catchup.motifLabel, 'Exercice DAP 1, section DAP Y1');
  });

  await record('05 - fiche individuelle Agazzi NIP 25574: attendus 2, realises 2, taux 100, traces conservees', async () => {
    const ctx = await baseFixture({ y1Count: 18, y2Count: 0, prefix: 'I4-AGAZZI' });
    const agazzi = ctx.y1People[17];
    await ctx.repo.updatePersonne(agazzi.personne_id, {
      nip: '25574',
      nom: 'Agazzi',
      prenom: 'Test',
      grade: 'Sdt'
    });
    await saveMany(ctx.service, ctx.source.eventId, ctx.y1People.slice(0, 17).map((personne) => ({ personne, statut: 'PRESENT' })).concat([{ personne: agazzi, statut: 'PERMUTATION' }]));
    await close(ctx.service, ctx.source.eventId);
    await realizedCatchup(ctx, agazzi);
    await close(ctx.service, ctx.target.eventId);
    await saveMany(ctx.service, ctx.dap2.eventId, ctx.y1People.map((personne) => ({ personne, statut: 'PRESENT' })));
    await close(ctx.service, ctx.dap2.eventId);
    const fiche = await ctx.persons.fiche(agazzi.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    eq(fiche.kpi.denominator, 2);
    eq(fiche.kpi.numerator, 2);
    eq(fiche.kpi.percentage, 100);
    eq(fiche.kpi.volumes.realisationsDirectes, 1);
    eq(fiche.kpi.volumes.rattrapagesRealises, 1);
    eq(fiche.kpi.volumes.aRattraper, 0);
    deepEq(fiche.evenements.map((row) => row.date), ['2026-04-01', '2026-04-08', '2026-05-01']);
    eq(display.ficheEventStatutLabel(fiche.evenements[0]), 'Permutation');
    eq(display.ficheEventInformations(fiche.evenements[0]), 'Rattrapage section DAP Y2');
    eq(display.ficheEventCible(fiche.evenements[1]), 'Rattrapage');
    eq(display.ficheEventInformations(fiche.evenements[1]), 'Exercice DAP 1, section DAP Y1');
  });

  await record('06 - rapports evenement et PDF exposent compteurs, objectif, rattrapage complet, sans signature hors PR', async () => {
    const ctx = await baseFixture({ prefix: 'I4-PDF' });
    await ctx.objectives.createObjectif({
      portee: 'DOMAINE',
      domaineCode: 'DAP',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      seuilPct: 85
    }, ACTOR);
    await prepareSource(ctx, 17, 1);
    await close(ctx.service, ctx.source.eventId);
    await realizedCatchup(ctx, ctx.y1People[17]);
    await close(ctx.service, ctx.target.eventId);
    const sourceModel = await collectReport(ctx.repo, { kind: 'EVENT', id: ctx.source.eventId }, { includeNominatif: true });
    eq(sourceModel.officiel.numerator, 17);
    eq(sourceModel.officiel.denominator, 18);
    eq(sourceModel.officiel.percentage, 94.4);
    eq(sourceModel.officiel.volumes.permutations, 1);
    eq(sourceModel.officiel.volumes.rattrapagesRealises, 1);
    const targetModel = await collectReport(ctx.repo, { kind: 'EVENT', id: ctx.target.eventId }, { includeNominatif: true });
    const row = targetModel.nominatif.find((item) => item.nip === ctx.y1People[17].nip);
    eq(row.cible, 'Rattrapage');
    eq(row.motifLabel, 'Exercice DAP 1, section DAP Y1');
    const pdf = await generateReport(ctx.repo, {
      kind: 'EVENT',
      evenementId: ctx.target.eventId,
      nominatif: true
    }, ACTOR, { generatedAt: '2026-09-08T10:00:00.000Z' });
    const text = pdfText(pdf.buffer);
    ok(text.includes('Rattrapage'));
    ok(text.includes('Exercice DAP 1, section DAP Y1'));
    ok(targetModel.officiel.objective && targetModel.officiel.objective.thresholdPct === 85);
    ok(!text.includes('Rattrap...'));
    ok(!text.includes('Responsable'));
    ok(!text.includes('____________________________'));
  });

  await record('07 - UI et PDF contiennent bloc rattrapages et mise en evidence bleue', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const pdf = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    ok(ui.includes('function renderCatchupRowsBlock'));
    ok(ui.includes('scope-row-catchup'));
    ok(ui.includes('Rattrapages'));
    ok(ui.includes('Effectif de la section'));
    ok(pdf.includes('renderCatchups'));
    ok(pdf.includes("'#e8f3ff'"));
    ok(pdf.includes('if(!isPr) return;'));
    ok(pdf.includes('CHEF PROTECTION RESPIRATOIRE'));
  });

  await record('08 - listes evenements restent triees chronologiquement croissant cote service', async () => {
    const ctx = await baseFixture({ prefix: 'I4-SORT' });
    const events = await ctx.service.listEvenements({ from: '2026-01-01', to: '2026-12-31' });
    const dates = events.evenements.map((row) => row.evenement.date);
    deepEq(dates, [...dates].sort((a, b) => String(a).localeCompare(String(b))));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

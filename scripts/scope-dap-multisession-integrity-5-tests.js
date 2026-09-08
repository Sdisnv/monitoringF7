#!/usr/bin/env node
'use strict';

/** SCOPE-DAP-MULTISESSION-INTEGRITY-5 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeObjectivesService } = require('../netlify/lib/_scope-objectives-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-dap-multisession-integrity-5', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
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
  const p = await repo.insertPersonne({
    nip,
    nom: options.nom || `Multi${String(index).padStart(2, '0')}`,
    prenom: options.prenom || 'DAP',
    grade: options.grade || 'Sdt',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: p.personne_id,
    cible_id: cibleRow.cible_id,
    date_debut: options.dateDebut || '2020-01-01',
    date_fin: options.dateFin || null
  });
  return p;
}

async function createGroupedSession(service, y1, index){
  const created = await service.createEvenement({
    date: index === 1 ? '2026-06-01' : '2026-06-08',
    domaineCode: 'DAP',
    libelle: `Formation groupée DAP 1.${index}`,
    cibleIds: [y1.cible_id],
    modeSession: 'MULTI',
    nombreSessionsAttendu: 2,
    sessionIndex: index,
    exerciceCode: 'DAP-GROUP-1',
    exerciceLibelle: 'Formation groupée DAP 1'
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function saveRows(service, eventId, rows){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: rows.map((row) => ({
      personneId: row.personne.personne_id,
      statut: row.statut,
      motifAbsence: row.motifAbsence || null,
      role: row.role || 'PARTICIPANT'
    }))
  }, ACTOR);
}

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

async function dapFixture(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const analytics = createScopeAnalyticsService(repo);
  const objectives = createScopeObjectivesService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const y3 = await cible(repo, 'DAP', 'Y3');
  const y4 = await cible(repo, 'DAP', 'Y4');
  const people = [
    await person(repo, y1, 'I5-Y1-01', 1),
    await person(repo, y1, 'I5-Y1-02', 2),
    await person(repo, y2, 'I5-Y2-01', 3),
    await person(repo, y3, 'I5-Y3-01', 4),
    await person(repo, y4, 'I5-Y4-01', 5)
  ];
  const s1 = await createGroupedSession(service, y1, 1);
  const s2 = await createGroupedSession(service, y1, 2);
  return { repo, service, persons, analytics, objectives, y1, y2, y3, y4, people, s1, s2 };
}

(async () => {
  await record('A-B — ajout rattrapage preserve la saisie UI apres Tous presents et statuts mixtes', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const addBlock = ui.slice(ui.indexOf('function addManualParticipant'), ui.indexOf('function regularisePermutationObligation'));
    ok(addBlock.includes('const snapshot = snapshotSaisieState()'));
    ok(addBlock.includes('refreshFichePreservingSaisie(id, snapshot)'));
    ok(!addBlock.includes('await loadFiche(id)'));
    ok(ui.includes('function nonSelectablePersonIds'));
    ok(!ui.includes("toast('info', 'Déjà ajoutée'"));
    ok(ui.includes('Déjà dans cet exercice'));
  });

  await record('C — personne deja ajoutee non selectionnable cote UI', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const searchBlock = ui.slice(ui.indexOf('function searchPersonnes'), ui.indexOf('function renderSuggestionList'));
    ok(searchBlock.includes('const blocked = nonSelectablePersonIds()'));
    ok(searchBlock.includes('!blocked.has(String(p.personne_id))'));
  });

  await record('D — PDF individuel aligne UI: Agazzi 2 attendus, 2 realises, 100 %', async () => {
    const ctx = await dapFixture();
    const agazzi = ctx.people[0];
    await ctx.repo.updatePersonne(agazzi.personne_id, { nip: '25574', nom: 'Agazzi', prenom: 'Léo' });
    await saveRows(ctx.service, ctx.s1.eventId, [
      { personne: agazzi, statut: 'PRESENT' },
      { personne: ctx.people[1], statut: 'PRESENT' }
    ]);
    await close(ctx.service, ctx.s1.eventId);
    await saveRows(ctx.service, ctx.s2.eventId, [
      { personne: agazzi, statut: 'PRESENT' },
      { personne: ctx.people[2], statut: 'PRESENT' },
      { personne: ctx.people[3], statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { personne: ctx.people[4], statut: 'DISPENSE', motifAbsence: 'PAS_CONCERNE' }
    ]);
    await close(ctx.service, ctx.s2.eventId);
    const dap2 = await ctx.service.createEvenement({
      date: '2026-07-01', domaineCode: 'DAP', libelle: 'Exercice DAP 2', cibleIds: [ctx.y1.cible_id], exerciseEquivalenceKey: 'DAP_EX2'
    }, ACTOR);
    await ctx.service.figerPopulation(dap2.evenement.evenement_id, { baseVersion: dap2.evenement.version }, ACTOR);
    await saveRows(ctx.service, dap2.evenement.evenement_id, [
      { personne: agazzi, statut: 'PRESENT' },
      { personne: ctx.people[1], statut: 'PRESENT' }
    ]);
    await close(ctx.service, dap2.evenement.evenement_id);
    const fiche = await ctx.persons.fiche(agazzi.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    eq(fiche.kpi.denominator, 2);
    eq(fiche.kpi.numerator, 2);
    eq(fiche.kpi.percentage, 100);
    const pdf = await generateReport(ctx.repo, { kind: 'PERSON', personneId: agazzi.personne_id, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    ok(text.includes('Réalisés'));
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    const kpiBlock = renderer.slice(renderer.indexOf('personKpiStrip(m)'), renderer.indexOf('personCharts(m)'));
    ok(!kpiBlock.includes("['Présents'"));
  });

  await record('E — PDF evenement affiche objectif reel', async () => {
    const ctx = await dapFixture();
    await ctx.objectives.createObjectif({
      portee: 'DOMAINE',
      domaineCode: 'DAP',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      seuilPct: 85
    }, ACTOR);
    await saveRows(ctx.service, ctx.s1.eventId, [{ personne: ctx.people[0], statut: 'PRESENT' }]);
    await close(ctx.service, ctx.s1.eventId);
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s1.eventId, nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    ok(text.includes('Objectif'));
    ok(text.includes('85'));
  });

  await record('F-G-J — Formation groupee DAP: population toutes sections, cloture 1.1 possible, 1.2 bloque si incomplet', async () => {
    const ctx = await dapFixture();
    const fiche1 = await ctx.service.lireEvenement(ctx.s1.eventId);
    const cibleCodes = fiche1.cibles.map((c) => c.niveau_code).sort();
    deepEq(cibleCodes, ['Y1', 'Y2', 'Y3', 'Y4']);
    eq(fiche1.attendus.length, 5);
    await saveRows(ctx.service, ctx.s1.eventId, [
      { personne: ctx.people[0], statut: 'PRESENT' },
      { personne: ctx.people[1], statut: 'PRESENT' }
    ]);
    await close(ctx.service, ctx.s1.eventId);
    let blocked = null;
    try {
      await close(ctx.service, ctx.s2.eventId);
    } catch(error) {
      blocked = error;
    }
    ok(blocked, 'la derniere session doit etre refusee');
    eq(blocked.error, 'session_incomplete');
    ok(String(blocked.message).includes('personne(s) restent à renseigner sur l’ensemble des sessions'));
    ok((blocked.details && blocked.details.unfilledPeople || []).length >= 1);
  });

  await record('H-I-K — analytics DAP consolide 1.1 + 1.2 sans double compter, formateur DAP inclus une fois', async () => {
    const ctx = await dapFixture();
    await saveRows(ctx.service, ctx.s1.eventId, [
      { personne: ctx.people[0], statut: 'PRESENT' },
      { personne: ctx.people[1], statut: 'PRESENT', role: 'FORMATEUR' }
    ]);
    await close(ctx.service, ctx.s1.eventId);
    await saveRows(ctx.service, ctx.s2.eventId, [
      { personne: ctx.people[0], statut: 'PRESENT' },
      { personne: ctx.people[1], statut: 'PRESENT', role: 'FORMATEUR' },
      { personne: ctx.people[2], statut: 'PRESENT' },
      { personne: ctx.people[3], statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { personne: ctx.people[4], statut: 'DISPENSE', motifAbsence: 'PAS_CONCERNE' }
    ]);
    await close(ctx.service, ctx.s2.eventId);
    const agazziLike = await ctx.analytics.summary({ personneId: ctx.people[0].personne_id, domaine: 'DAP', year: 2026 });
    eq(agazziLike.officiel.numerator, 1);
    eq(agazziLike.officiel.denominator, 1);
    eq(agazziLike.officiel.eventCount, 1);
    const formateur = await ctx.analytics.summary({ personneId: ctx.people[1].personne_id, domaine: 'DAP', year: 2026 });
    eq(formateur.officiel.numerator, 1);
    eq(formateur.officiel.denominator, 1);
    eq(formateur.officiel.eventCount, 1);
    const global = await ctx.analytics.summary({ domaine: 'DAP', year: 2026 });
    eq(global.officiel.volumes.attendus, 5);
    eq(global.officiel.numerator, 3);
    eq(global.officiel.denominator, 4);
    eq(global.officiel.volumes.dispenses, 1);
    eq(global.officiel.eventCount, 1);
  });

  await record('Synthese permutation/rattrapage rendue en KPI sobres', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    ok(ui.includes('Rattrapages réalisés'));
    ok(ui.includes('À rattraper'));
    ok(ui.includes('scope-kpi-grid scope-saisie-kpis'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

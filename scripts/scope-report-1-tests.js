#!/usr/bin/env node
'use strict';
/** SCOPE-REPORT-1 — PDF serveur, datasets GRAPH-1, pas de formule KPI dans le renderer. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { generateReport, sanitizeQuery } = require('../netlify/functions/_scope-report-service');
const { sanitizeFilename, buildFilename } = require('../netlify/functions/_scope-report-data');
const { CHART_TOKENS } = require('../netlify/functions/_scope-chart-tokens');
const { hasPermission } = require('../netlify/functions/_rbac');
const { HttpError } = require('../netlify/functions/_scope-rules');
const { ROOT_DOMAINES } = require('../netlify/functions/_scope-graphs');

const ROOT = path.join(__dirname, '..');
const results = [];
const ACTOR = { roles: ['UTILISATEUR'], sub: 'report-test', displayName: 'Testeur SCOPE' };
const GENERATED = '2026-08-20T08:00:00.000Z';

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0){
      chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    }
    return _;
  });
  return chunks.join('');
}

function sha(buffer){
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWithStatuses(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

function ctx(){
  const repo = createMemoryRepo();
  return {
    repo,
    service: createScopeService(repo),
    objectives: createScopeObjectivesService(repo)
  };
}

async function enableDap(repo){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: '2026-01-01',
    commentaire: 'REPORT-1'
  });
  return y4;
}

async function gen(repo, body, claims){
  return generateReport(repo, body, claims || ACTOR, { generatedAt: GENERATED });
}

(async () => {
  await record('1 — rapport événement nominatif', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'N1');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Nominatif REPORT', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      ...Array(8).fill('PRESENT'), 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE'
    ].map((s, i) => (s === 'ABSENT_EXCUSE' ? { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' } : s)));
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(out.buffer.slice(0, 5).toString() === '%PDF-');
    assert.ok(text.includes('Nom1') && text.includes('Prenom1'));
    assert.ok(text.includes('80') || text.includes('80 %') || text.includes('80,0'));
    assert.ok(!text.includes('computeTaux'));
    assert.ok(out.filename.startsWith('SCOPE_Exercice_DPS_G1_'));
  });

  await record('2 — rapport événement quantitatif sans nom fictif', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-09-02', domaineCode: 'DPS', libelle: 'QTT REPORT', cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
      baseVersion: 1, attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 1,
      excusesPrive: 1, excusesProfessionnel: 0, excusesArmee: 0, excusesAccidentMaladie: 0
    }, { sub: 'test' });
    await service.cloturer(created.evenement.evenement_id, { baseVersion: 2 }, { sub: 'test' });
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('quantitatif') || text.includes('Quantitatif') || text.includes('aucun nom'));
    assert.ok(!text.includes('Nom1'));
    assert.ok(text.includes('89,5') || text.includes('89.5'));
    assert.strictEqual(out.meta.nominatif, false);
  });

  await record('3 — rapport événement LEGACY bandeau et sans nominatif', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-01-15', domaineCode: 'DPS', libelle: 'LEGACY REPORT',
      cibleIds: [g1.cible_id], origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    await repo.insertLegacy({
      evenement_id: created.evenement.evenement_id,
      date: '2026-01-15', domaine_code: 'DPS',
      nb_presents: 10, nb_convoques: 12,
      payload_v67: { total_attendu: 12 }
    });
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Historique agr') || text.includes('LEGACY'));
    assert.ok(text.includes('non nominative') || text.includes('non nominatives') || text.includes('Aucune'));
    assert.ok(!text.includes('Nom1'));
    assert.ok(text.includes('distinctes du KPI officiel') || text.includes('KPI officiel'));
  });

  await record('4 — rapport domaine DAP', async () => {
    const { repo, service } = ctx();
    await enableDap(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = await seedPeople(repo, y4.cible_id, 5, 'D4');
    const created = await service.createEvenement({
      date: '2026-04-10', domaineCode: 'DAP', libelle: 'DAP domaine', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(5).fill('PRESENT'));
    const out = await gen(repo, { kind: 'DOMAIN', domaine: 'DAP', year: 2026, preset: 'YEAR' });
    assert.strictEqual(out.filename, 'SCOPE_DAP_2026.pdf');
    const text = pdfText(out.buffer);
    assert.ok(text.includes('DAP'));
    assert.ok(text.includes('Taux officiel') || text.includes('officiel'));
  });

  await record('5 — rapport cible / OI DAP Y4 et FOSPEC/PR', async () => {
    const { repo, service } = ctx();
    await enableDap(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const pr = await repo.findCible('PR', 'G1');
    const pY = await seedPeople(repo, y4.cible_id, 4, 'Y5');
    const pPr = await seedPeople(repo, pr.cible_id, 4, 'P5');
    const e1 = await service.createEvenement({
      date: '2026-05-01', domaineCode: 'DAP', libelle: 'Y4', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e1.evenement.evenement_id, pY, Array(4).fill('PRESENT'));
    const e2 = await service.createEvenement({
      date: '2026-05-03', domaineCode: 'PR', libelle: 'PR G1', cibleIds: [pr.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e2.evenement.evenement_id, pPr, Array(4).fill('PRESENT'));
    const dap = await gen(repo, { kind: 'TARGET', domaine: 'DAP', cible: 'Y4', year: 2026, preset: 'YEAR' });
    assert.strictEqual(dap.filename, 'SCOPE_DAP_Y4_2026.pdf');
    const fospec = await gen(repo, { kind: 'TARGET', domaine: 'PR', cible: 'G1', year: 2026, preset: 'YEAR' });
    const text = pdfText(fospec.buffer);
    assert.ok(text.includes('FOSPEC') || text.includes('Protection respiratoire'));
    assert.ok(!text.includes('domaine principal PR inventé'));
  });

  await record('6 — rapport période SDIS NON_EVALUABLE + LEGACY distinct', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-02-01', domaineCode: 'DPS', libelle: 'LEGACY période',
      cibleIds: [g1.cible_id], origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    await repo.insertLegacy({
      evenement_id: created.evenement.evenement_id,
      date: '2026-02-01', domaine_code: 'DPS', nb_presents: 8, nb_convoques: 10,
      payload_v67: { total_attendu: 10 }
    });
    const out = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    assert.strictEqual(out.filename, 'SCOPE_Rapport_SDIS_2026.pdf');
    assert.ok(out.pages >= 2);
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Non ') || text.includes('NON_EVALUABLE') || text.includes('Non \xe9valuable') || text.includes('valuable'));
    assert.ok(text.includes('LEGACY') || text.includes('historique'));
    for(const code of ROOT_DOMAINES) assert.ok(text.includes(code), code);
    assert.ok(out.pages < 12);
  });

  await record('7 — objectif unique affiché', async () => {
    const { repo, service, objectives } = ctx();
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'O7');
    const created = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DPS', libelle: 'Obj unique', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(10).fill('PRESENT'));
    const out = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('80') && (text.includes('Objectif') || text.includes('objectif')));
    assert.ok(!text.includes('Plusieurs objectifs ont'));
  });

  await record('8 — objectifs multiples : mention, pas de moyenne', async () => {
    const { repo, service, objectives } = ctx();
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-06-30' }, { sub: 't' });
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 90, dateDebut: '2026-07-01' }, { sub: 't' });
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'M8');
    const e1 = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DPS', libelle: 'H1', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e1.evenement.evenement_id, people, Array(10).fill('PRESENT'));
    const e2 = await service.createEvenement({
      date: '2026-09-01', domaineCode: 'DPS', libelle: 'H2', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e2.evenement.evenement_id, people, Array(10).fill('PRESENT'));
    const out = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Plusieurs objectifs') || text.includes('non homog'));
    assert.ok(!text.includes('85 %') && !text.includes('85,0'));
  });

  await record('9 — NON_EVALUABLE élégant sans 0 % artificiel', async () => {
    const { repo } = ctx();
    const out = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Aucun') || text.includes('Non '));
    assert.ok(!/Taux officiel[\s\S]{0,40}0 %/.test(text));
  });

  await record('10 — LEGACY séparé du KPI officiel', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(src.includes('distinctes du KPI officiel'));
    assert.ok(src.includes('isLegacy'));
  });

  await record('11 — motifs d’excuse MODEL-2', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 6, 'MT');
    const created = await service.createEvenement({
      date: '2026-06-01', domaineCode: 'DPS', libelle: 'Motifs', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT',
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ACCIDENT_MALADIE' }
    ]);
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Priv') || text.includes('PRIVE'));
    assert.ok(text.includes('Professionnel'));
    assert.ok(text.includes('Arm'));
    assert.ok(text.includes('maladie') || text.includes('Accident'));
  });

  await record('12-13 — permutation DAP sous-ensemble, pas de double comptage', async () => {
    const { repo, service } = ctx();
    await enableDap(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = await seedPeople(repo, y4.cible_id, 15, 'PM');
    const created = await service.createEvenement({
      date: '2026-06-15', domaineCode: 'DAP', libelle: 'Permutations', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    const statuses = [...Array(13).fill('PRESENT'), 'PERMUTATION', 'PERMUTATION'];
    await closeWithStatuses(service, created.evenement.evenement_id, people, statuses);
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('dont permutations') || text.includes('permutations'));
    assert.ok(!/Total pr[ée]sence/.test(text));
  });

  await record('14-15 — liste nominative + encadrement hors taux', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'EN');
    const extra = await repo.insertPersonne({ nip: 'ENC001', nom: 'Cadre', prenom: 'Paul' });
    const created = await service.createEvenement({
      date: '2026-07-01', domaineCode: 'DPS', libelle: 'Encadrement', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.ajouterEncadrement(created.evenement.evenement_id, {
      baseVersion: 2, personneId: extra.personne_id, role: 'FORMATEUR'
    }, { sub: 'test' });
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: 3,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'test' });
    await service.cloturer(created.evenement.evenement_id, { baseVersion: 4 }, { sub: 'test' });
    const out = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Cadre') && text.includes('Paul'));
    assert.ok(text.includes('hors taux') || text.includes('Encadrement'));
    assert.ok(text.includes('Nom1'));
  });

  await record('16-17 — pagination nominative 15 et 40', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const p15 = await seedPeople(repo, g1.cible_id, 15, 'P15');
    const e15 = await service.createEvenement({
      date: '2026-07-10', domaineCode: 'DPS', libelle: 'Liste 15', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e15.evenement.evenement_id, p15, Array(15).fill('PRESENT'));
    const out15 = await gen(repo, { kind: 'EVENT', evenementId: e15.evenement.evenement_id, nominatif: true });
    const t15 = pdfText(out15.buffer);
    assert.ok(t15.includes('Nom1') && t15.includes('Nom15'));
    assert.ok(out15.pages >= 1);
    const p40 = await seedPeople(repo, (await repo.findCible('DPS', 'C1')).cible_id, 40, 'P40');
    const e40 = await service.createEvenement({
      date: '2026-07-20', domaineCode: 'DPS', libelle: 'Liste 40', cibleIds: [(await repo.findCible('DPS', 'C1')).cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, e40.evenement.evenement_id, p40, Array(40).fill('PRESENT'));
    const out40 = await gen(repo, { kind: 'EVENT', evenementId: e40.evenement.evenement_id, nominatif: true });
    const t40 = pdfText(out40.buffer);
    assert.ok(t40.includes('Nom1') && t40.includes('Nom40'));
    assert.ok(out40.pages >= 2);
  });

  await record('18-21 — graphiques GRAPH-1 (évolution, domaines, OI, motifs)', async () => {
    const charts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(charts.includes('drawLineChart') && charts.includes('drawBarChart') && charts.includes('drawStackedBar'));
    assert.ok(renderer.includes('m.graphs.evolution'));
    assert.ok(renderer.includes('m.graphs.domaines'));
    assert.ok(renderer.includes('m.graphs.children'));
    assert.ok(renderer.includes('m.graphs.motifs'));
    assert.ok(!charts.includes('computeTaux') && !charts.includes('safePercentage'));
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 5, 'G8');
    const created = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DPS', libelle: 'Graph', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'PRESENT', { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }, 'ABSENT_NON_EXCUSE'
    ]);
    const out = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    assert.ok(out.pages >= 2);
    assert.ok(out.buffer.length > 2000);
  });

  await record('22 — couleurs tokens GRAPH-1', async () => {
    assert.strictEqual(CHART_TOKENS.secondary, '#DE000A');
    assert.strictEqual(CHART_TOKENS.primary, '#171C8F');
    assert.strictEqual(CHART_TOKENS.neutral, '#54585A');
    assert.strictEqual(CHART_TOKENS.warning, '#FFA300');
    const charts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8');
    assert.ok(charts.includes('CHART_TOKENS'));
    assert.ok(!charts.includes('#CB4B40'));
  });

  await record('23 — nom de fichier sanitizer', async () => {
    assert.strictEqual(sanitizeFilename('SCOPE_DAP_Y4_2026.pdf'), 'SCOPE_DAP_Y4_2026.pdf');
    assert.ok(!sanitizeFilename('SCOPE/DAP\\Y4?.pdf').includes('/'));
    assert.ok(!sanitizeFilename('a b').includes(' '));
    assert.strictEqual(buildFilename('PERIOD', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } }), 'SCOPE_Rapport_SDIS_2026.pdf');
    assert.strictEqual(buildFilename('DOMAIN', { domaine: 'DAP', period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } }), 'SCOPE_DAP_2026.pdf');
  });

  await record('24 — RBAC nominatif vs agrégé', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 3, 'RB');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'RBAC', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(3).fill('PRESENT'));
    assert.ok(hasPermission(ACTOR, 'reports:nominatif'));
    assert.ok(hasPermission(ACTOR, 'reports:nominatif'));
    const nominatif = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true }, ACTOR);
    assert.ok(pdfText(nominatif.buffer).includes('Nom1'));
    const agrege = await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id }, ACTOR);
    assert.ok(!pdfText(agrege.buffer).includes('Nom1'));
  });

  await record('25 — preview = download (même buffer / hash)', async () => {
    const { repo } = ctx();
    const a = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    const b = await gen(repo, { kind: 'PERIOD', year: 2026, preset: 'YEAR' });
    assert.strictEqual(a.sha256, sha(a.buffer));
    assert.strictEqual(a.sha256, b.sha256);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
    assert.ok(ui.includes('data-pdf-download'));
    assert.ok(ui.includes('URL.createObjectURL(current.blob)'));
  });

  await record('26 — viewer pagination zoom fermer', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    assert.ok(html.includes('scope-pdf-viewer.js'));
    assert.ok(ui.includes('data-pdf-prev') && ui.includes('data-pdf-next'));
    assert.ok(ui.includes('scope-pdf-canvas'));
    assert.ok(ui.includes('getDocument'));
    assert.ok(ui.includes('standardFontDataUrl'));
    assert.ok(!ui.includes('#page='));
    assert.ok(!ui.includes('iframe'));
    assert.ok(ui.includes('data-pdf-close'));
  });

  await record('27 — période PeriodContext, payload sans chiffres', async () => {
    const q = sanitizeQuery({ kind: 'PERIOD', year: 2026, preset: 'QUARTER', quarter: 3 });
    assert.strictEqual(q.kind, 'PERIOD');
    assert.strictEqual(q.year, 2026);
    assert.throws(
      () => sanitizeQuery({ kind: 'PERIOD', year: 2026, percentage: 80 }),
      (error) => error instanceof HttpError && error.error === 'payload_interdit'
    );
  });

  await record('28 — rapport sans données', async () => {
    const { repo } = ctx();
    const out = await gen(repo, { kind: 'DOMAIN', domaine: 'FOBA', year: 2026, preset: 'YEAR' });
    assert.ok(out.buffer.slice(0, 4).toString() === '%PDF');
    assert.ok(out.pages >= 1);
  });

  await record('29-30 — aucune formule KPI PDF / pas de données fictives', async () => {
    const files = [
      '_scope-pdf-renderer.js', '_scope-pdf-charts.js', '_scope-report-data.js', '_scope-report-service.js'
    ].map((name) => fs.readFileSync(path.join(ROOT, 'netlify/functions', name), 'utf8'));
    for(const src of files){
      assert.ok(!src.includes('computeTaux('));
      assert.ok(!src.includes('officialFromQuantitatif'));
      assert.ok(!src.includes('officialFromTaux'));
      assert.ok(!src.includes('safePercentage('));
    }
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('SCOPE-REPORT-1'));
    assert.ok(ui.includes('generateReport'));
    assert.ok(!ui.includes('officialFromQuantitatif'));
  });

  await record('journal GENERER_RAPPORT', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 2, 'JG');
    const created = await service.createEvenement({
      date: '2026-08-02', domaineCode: 'DPS', libelle: 'Journal', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, ['PRESENT', 'PRESENT']);
    await gen(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true });
    const rows = await repo.listJournal('rapport', created.evenement.evenement_id);
    assert.ok(rows.some((r) => r.action === 'GENERER_RAPPORT'));
  });

  await record('contrat HTTP + logos officiels + RBAC sync', async () => {
    const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    const toml = fs.readFileSync(path.join(ROOT, 'netlify.scope.toml'), 'utf8');
    const rbac = fs.readFileSync(path.join(ROOT, 'netlify/functions/_rbac.js'), 'utf8');
    const rbacUi = fs.readFileSync(path.join(ROOT, 'assets/js/rbac.js'), 'utf8');
    assert.ok(scopeJs.includes("path === '/reports'"));
    assert.ok(toml.includes('logo-scope-blanc.png'));
    assert.ok(toml.includes('LogoSDISblanc.png'));
    assert.ok(toml.includes("frame-src 'self' blob:"));
    assert.ok(toml.includes('pdfkit'));
    assert.ok(rbac.includes('reports:nominatif') && rbacUi.includes('CurrentPermissions'));
    assert.ok(!rbacUi.includes('ROLE_PERMISSIONS'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('.scope-pdf-overlay'));
    assert.ok(css.includes('@media (max-width: 1200px)'));
    assert.ok(css.includes('@media (max-width: 1024px)'));
    assert.ok(css.includes('@media (max-width: 768px)'));
    assert.ok(css.includes('min-height: 44px'));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/logo-scope-blanc.png')));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/LogoSDISblanc.png')));
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(renderer.includes('logo-scope-blanc.png'));
    assert.ok(renderer.includes('LogoSDISblanc.png'));
  });

  await record('démo LIVE-only + pas de moteur Excel', async () => {
    const demo = fs.readFileSync(path.join(ROOT, 'assets/js/scope-demo.js'), 'utf8');
    assert.ok(demo.includes('reports_live_only'));
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.ok(pkg.includes('"pdfkit"'));
    assert.ok(!pkg.includes('exceljs') && !pkg.includes('xlsx'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    console.error(`\nSCOPE-REPORT-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`\nSCOPE-REPORT-1: ${results.length} PASS`);
})();

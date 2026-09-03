#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const { resolveObjective } = require('../netlify/functions/_scope-objectives');
const { hasPermission } = require('../netlify/functions/_rbac');
const { collectMultisessionReport, buildConclusion } = require('../netlify/functions/_scope-multisession-report');
const { collectReport } = require('../netlify/functions/_scope-report-data');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const logic = require('../assets/js/scope-ui-logic.js');
const {
  TYPE, PDF_SHIFT_08_CM, SIGNATURE_TEXT_TOP_GAP, SIGNATURE_TEXT_LINE_COUNT,
  SIGNATURE_IMAGE_RELATIVE_Y, SIGNATURE_FUNCTION_RELATIVE_Y
} = require('../netlify/functions/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-objectives.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-objectives-service.js'), 'utf8');
const reportSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-multisession-report.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'obj-part-1', displayName: 'Testeur OBJECTIFS' };
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
    assert.strictEqual(error.status, status, `status ${error.status} ≠ ${status}`);
    if(code) assert.strictEqual(error.error, code, `code ${error.error} ≠ ${code}`);
    return error;
  }
}

async function markRepo(repo, eventId, personneId, statut, motif){
  await repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: 'PARTICIPANT',
    source: 'SAISIE',
    motif_absence: motif || null
  });
}

async function setupPr(year, groupSuffix, peopleSpec, sessionCount = 6){
  const repo = createMemoryRepo();
  const cycleId = `cycle-pr-${groupSuffix}`;
  await repo.insertCycle({
    cycle_id: cycleId,
    cycle_key: `PAPR-${groupSuffix}`,
    annee: year,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: `Cycle PAPR ${year}`
  });
  const events = [];
  for(let i = 1; i <= sessionCount; i += 1){
    const ev = await repo.insertEvenement({
      evenement_id: `${groupSuffix}-s${i}`,
      cycle_id: cycleId,
      domaine_code: 'PR',
      date: `${year}-09-0${i}`,
      libelle: `Exercice PR 1.${i} | Base`,
      code_cours: `PAPR.PR1.${groupSuffix}.${i}`,
      pr_exercise_group_key: `${cycleId}:PR:1`,
      pr_session_key: `${cycleId}:PR:1.${i}`
    });
    events.push(ev);
  }
  const people = [];
  for(const spec of peopleSpec){
    const p = await repo.insertPersonne({
      personne_id: spec.id,
      nip: spec.nip,
      nom: spec.nom,
      prenom: spec.prenom,
      grade: spec.grade,
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: cycleId, personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id,
        personne_id: p.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  await repo.insertPersonne({
    personne_id: 'chef-pr',
    nip: '1506',
    nom: 'Cerqueira',
    prenom: 'Marco',
    grade: 'Lt instr',
    skipPeriodes: true
  });
  return { repo, events, people };
}

const PEOPLE = [
  { id: 'op-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'op-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'op-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'op-d', nip: '81004', nom: 'Zampieri', prenom: 'Lucas', grade: 'Sgt' }
];

async function seedSession(){
  const ctx = await setupPr(2026, 'op', PEOPLE);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'op-s5', byId['op-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'op-s2', byId['op-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'op-s4', byId['op-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'op-s3', byId['op-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

async function seedEvent(){
  const ctx = await setupPr(2026, 'ope', PEOPLE, 1);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await ctx.repo.updateEventIfVersion(ctx.events[0].evenement_id, ctx.events[0].version, { statut: 'REALISE' });
  await markRepo(ctx.repo, 'ope-s1', byId['op-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'ope-s1', byId['op-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'ope-s1', byId['op-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'ope-s1', byId['op-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

(async () => {
  await record('01 — moteur OBJECTIVES-1 réutilisé', () => {
    assert.ok(serviceSrc.includes("require('./_scope-objectives')"));
    assert.ok(serviceSrc.includes('resolveObjective'));
    assert.ok(reportSrc.includes("require('./_scope-objectives')"));
    assert.ok(reportSrc.includes('resolveObjective({'));
    assert.ok(!ui.includes('assets/js/calculations/objectives.js'));
  });

  await record('02 — aucun second stockage', () => {
    assert.ok(!ui.includes('localStorage') || !/objectifs/.test(ui.slice(ui.indexOf('function loadObjectifs'), ui.indexOf('function loadDashboard'))));
    assert.ok(api.includes("request('GET', `/objectifs"));
    assert.ok(api.includes("request('POST', '/objectifs'"));
    assert.ok(!ui.includes('CREATE TABLE'));
  });

  await record('03 — liste objectifs', () => {
    assert.ok(ui.includes('id="obj-table"'));
    assert.ok(ui.includes('PÉRIODE'));
    assert.ok(ui.includes("sortableHeader('objectifs', 'cible', 'CIBLE'"));
    assert.ok(!ui.includes('CIBLE / SPÉCIALISATION'));
    assert.ok(ui.includes('OBJECTIFS DE PARTICIPATION'));
    assert.ok(ui.includes('Définissez les seuils de participation utilisés par les analyses et rapports SCOPE.'));
  });

  await record('04-06 — GLOBAL / DOMAINE / CIBLE', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const g = await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const d = await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 90, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const papr = await repo.findCible('PR', 'GEN');
    const c = await objectifs.createObjectif({ portee: 'CIBLE', cibleId: papr.cible_id, seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const listed = await objectifs.listObjectifs();
    assert.strictEqual(listed.objectifs.length, 3);
    assert.strictEqual(g.objectif.scope, 'GLOBAL');
    assert.strictEqual(d.objectif.domaineCode, 'PR');
    assert.strictEqual(c.objectif.cibleId, papr.cible_id);
    assert.ok(ui.includes('Général — objectif par défaut'));
    assert.ok(ui.includes('Cible — population précise'));
    assert.ok(!ui.includes('Ensemble SCOPE'));
    assert.ok(!ui.includes('Cible / spécialisation'));
  });

  await record('07 — seuil 0–100', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    await expectHttp(() => objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: -1, dateDebut: '2026-01-01' }, ACTOR), 422, 'seuil_negatif');
    await expectHttp(() => objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 101, dateDebut: '2026-01-01' }, ACTOR), 422, 'seuil_excessif');
    assert.ok(ui.includes('compris entre 0 et 100'));
  });

  await record('08 — dates valides', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const err = await expectHttp(() => objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-12-31', dateFin: '2026-01-01'
    }, ACTOR), 422, 'dates_incoherentes');
    assert.match(err.message, /postérieure/);
  });

  await record('09 — historique préservé', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const first = await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-01-01' }, ACTOR);
    const next = await objectifs.nouvellePeriode(first.objectif.objectifId, { dateDebut: '2027-01-01', seuilPct: 90 }, ACTOR);
    const listed = await objectifs.listObjectifs();
    assert.strictEqual(listed.objectifs.length, 2);
    assert.strictEqual(next.precedent.thresholdPct, 85);
    assert.strictEqual(next.objectif.thresholdPct, 90);
    await expectHttp(() => objectifs.patchObjectif(first.objectif.objectifId, { seuilPct: 99 }, ACTOR), 422, 'historique_protege');
  });

  await record('10-12 — futur / actif / terminé', () => {
    assert.strictEqual(logic.objectifLifecycleStatus({ actif: true, dateDebut: '2027-01-01' }, '2026-09-02'), 'FUTUR');
    assert.strictEqual(logic.objectifLifecycleStatus({ actif: true, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, '2026-09-02'), 'ACTIF');
    assert.strictEqual(logic.objectifLifecycleStatus({ actif: true, dateDebut: '2025-01-01', dateFin: '2025-12-31' }, '2026-09-02'), 'TERMINE');
    const sorted = logic.sortObjectifs([
      { objectifId: 't', dateDebut: '2024-01-01', dateFin: '2024-12-31', actif: true },
      { objectifId: 'f', dateDebut: '2027-01-01', actif: true },
      { objectifId: 'a', dateDebut: '2026-01-01', dateFin: '2026-12-31', actif: true }
    ], null, '2026-09-02').map((r) => r.objectifId);
    assert.deepStrictEqual(sorted, ['a', 'f', 't']);
  });

  await record('13-14 — filtres période et domaine', () => {
    const rows = [
      { scope: 'DOMAINE', domaineCode: 'PR', dateDebut: '2026-01-01', dateFin: '2026-12-31', actif: true },
      { scope: 'DOMAINE', domaineCode: 'AUTO', dateDebut: '2027-01-01', dateFin: '2027-12-31', actif: true }
    ];
    assert.strictEqual(logic.filterObjectifs(rows, { annee: '2026' }, '2026-09-02').length, 1);
    assert.strictEqual(logic.filterObjectifs(rows, { domaine: 'FOSPEC' }, '2026-09-02').length, 2);
    assert.strictEqual(logic.filterObjectifs(rows, { portee: 'CIBLE' }, '2026-09-02').length, 2);
    assert.ok(ui.includes('obj-filter-annee'));
    assert.ok(ui.includes('obj-filter-domaine'));
  });

  await record('15-16 — PAPR jamais domaine / PR-PAPR', () => {
    const items = logic.eventDomainFilterItems([
      { code: 'PR', libelleAffiche: 'PAPR' },
      { code: 'PAPR', libelleAffiche: 'PAPR' },
      { code: 'AUTO', libelleAffiche: 'AUTO' }
    ]);
    const codes = items.filter((i) => i.type === 'domain').map((i) => i.code);
    assert.ok(!codes.includes('PAPR'));
    assert.ok(items.some((i) => i.code === 'PR' && i.label === 'PR'));
    assert.ok(!logic.filterObjectifs([{ domaineCode: 'PAPR', dateDebut: '2026-01-01', actif: true }], {}, '2026-09-02').length);
    assert.ok(!ui.includes('value="PAPR"') || ui.includes("code !== 'PAPR'"));
  });

  await record('17-19 — résolution, priorité, aperçu', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const papr = await repo.findCible('PR', 'GEN');
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 90, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: papr.cible_id, seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const listed = await repo.listObjectifs({ actif: true });
    const cible = resolveObjective({ date: '2026-06-01', domaineCode: 'PR', cibleId: papr.cible_id, analysisGrain: 'CIBLE', objectives: listed });
    const domaine = resolveObjective({ date: '2026-06-01', domaineCode: 'PR', analysisGrain: 'DOMAINE', objectives: listed });
    const global = resolveObjective({ date: '2026-06-01', analysisGrain: 'GLOBAL', objectives: listed });
    assert.strictEqual(cible.thresholdPct, 95);
    assert.strictEqual(domaine.thresholdPct, 90);
    assert.strictEqual(global.thresholdPct, 80);
    const preview = await objectifs.resolveObjectif({ date: '2026-06-01', domaine: 'PR', cibleId: papr.cible_id });
    assert.strictEqual(preview.objectif.thresholdPct, 95);
    assert.ok(ui.includes('client.resolveObjectif'));
    assert.ok(ui.includes('OBJECTIF APPLIQUÉ'));
    assert.ok(ui.includes('Vérifier l’objectif'));
    assert.ok(ui.includes('Priorité : Cible → Domaine → Général'));
    assert.ok(!ui.includes('Aperçu de l’objectif effectif'));
    assert.ok(scopeJs.includes("/objectifs/resolution"));
  });

  await record('20 — rapport récupère objectif créé', async () => {
    const ctx = await seedSession();
    const objectifs = createScopeObjectivesService(ctx.repo);
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 90, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const model = await collectMultisessionReport(ctx.repo, 'op-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.objective.thresholdPct, 90);
    assert.strictEqual(model.objective.scope, 'DOMAINE');
  });

  await record('21 — objectif absent géré', async () => {
    const ctx = await seedSession();
    const model = await collectMultisessionReport(ctx.repo, 'op-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.objective, null);
    const none = buildConclusion({ percentage: 95.7, objectiveThreshold: null, domaine: 'PR', nonParticipants: [{}] });
    assert.ok(none.paragraphs.some((p) => /actuellement défini/.test(p)));
  });

  await record('22 — aucune valeur en dur de seuil UI', () => {
    assert.ok(!/seuilPct:\s*'80'/.test(ui));
    assert.ok(!/seuilPct:\s*80/.test(ui));
    assert.ok(ui.includes("seuilPct: ''"));
  });

  await record('23-24 — RBAC lecture / écriture', () => {
    assert.ok(ui.includes("permission: 'references:manage'"));
    assert.ok(ui.includes("href: '#/reglages/objectifs'"));
    assert.strictEqual(hasPermission({ roles: ['sdis-user'] }, 'references:manage'), false);
    assert.strictEqual(hasPermission({ roles: ['sdis-admin'] }, 'references:manage'), true);
    const postBlock = scopeJs.slice(scopeJs.indexOf("path === '/objectifs'"));
    assert.ok(postBlock.includes("hasPermission(claims, 'references:manage')"));
  });

  await record('25-26 — 422 métier, pas de stack UI', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const err = await expectHttp(() => objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-06-01', dateFin: '2026-12-31'
    }, ACTOR), 422, 'chevauchement_objectif');
    assert.match(err.message, /existe déjà pour ce périmètre/);
    const objUi = ui.slice(ui.indexOf('function renderObjectifs'), ui.indexOf('function renderNouveau'));
    assert.ok(!/stack/.test(objUi));
    assert.ok(!objUi.includes('Netlify'));
    assert.ok(!objUi.includes('JSON.stringify'));
  });

  await record('27-28 — responsive / tri tableau', () => {
    assert.ok(ui.includes('sortableHeader(\'objectifs\''));
    assert.ok(ui.includes("table === 'objectifs'"));
    assert.ok(ui.includes('data-label="Période"'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('@media') && css.includes('.scope-table'));
  });

  await record('29-32 — signature 3 lignes / image seule -22,68', () => {
    assert.strictEqual(SIGNATURE_TEXT_LINE_COUNT, 3);
    assert.strictEqual(SIGNATURE_TEXT_TOP_GAP, TYPE.body * 1.2 * 3);
    assert.strictEqual(PDF_SHIFT_08_CM, 22.68);
    assert.strictEqual(SIGNATURE_IMAGE_RELATIVE_Y, 8);
    assert.strictEqual(SIGNATURE_FUNCTION_RELATIVE_Y, 36);
    const draw = renderer.slice(renderer.indexOf('drawDomainSignature(m){'), renderer.indexOf('renderSessionBody'));
    assert.ok(draw.includes('identityY = contentEndY + SIGNATURE_TEXT_TOP_GAP'));
    assert.ok(draw.includes('signatureImageY = identityY + SIGNATURE_IMAGE_RELATIVE_Y - PDF_SHIFT_08_CM'));
    assert.ok(draw.includes('functionY = identityY + SIGNATURE_FUNCTION_RELATIVE_Y'));
    assert.ok(!draw.includes('this.doc.y -= PDF_SHIFT_08_CM'));
    assert.ok(draw.includes('.text(name, MARGIN, identityY'));
    assert.ok(draw.includes('.text(m.signatureFunction || \'CHEF PROTECTION RESPIRATOIRE\', MARGIN, functionY'));
  });

  await record('33-36 — rapports / NIP 1506 / autres domaines', async () => {
    const session = await seedSession();
    const event = await seedEvent();
    const sessionPdf = await generateReport(session.repo, { kind: 'SESSION', evenementId: 'op-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(event.repo, { kind: 'EVENT', evenementId: 'ope-s1', nominatif: true }, ACTOR);
    assert.strictEqual(sessionPdf.pages, 3);
    assert.ok(eventPdf.pages >= 1);
    const sessionModel = await collectMultisessionReport(session.repo, 'op-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    const eventModel = await collectReport(event.repo, { kind: 'EVENT', evenementId: 'ope-s1' }, { includeNominatif: true });
    assert.strictEqual(sessionModel.signaturePerson.nip, '1506');
    assert.strictEqual(eventModel.signaturePerson.nip, '1506');
    assert.ok(renderer.includes("m.domaine === 'PR'"));
    assert.ok(renderer.includes('CHEF PROTECTION RESPIRATOIRE'));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-objectifs-pdf-'));
    fs.writeFileSync(path.join(tmp, 'SCOPE_Rapport_participation_PR.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(tmp, 'SCOPE_Rapport_exercice_PR.pdf'), eventPdf.buffer);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await record('37-40 — ordre domaines AUTO/PR, DPS/DAP/JSP, FOBA/FOCA/FOSPEC', () => {
    const items = logic.eventDomainFilterItems([
      { code: 'FOBA' }, { code: 'FOCA' }, { code: 'DPS' }, { code: 'DAP' },
      { code: 'PR', libelleAffiche: 'PAPR' }, { code: 'AUTO' }, { code: 'FOSPEC' },
      { code: 'JSP' }, { code: 'PAPR' }, { code: 'XYZ' }
    ]);
    const codes = items.filter((i) => i.type === 'domain').map((i) => i.code);
    assert.deepStrictEqual(codes.slice(0, 2), ['AUTO', 'PR']);
    assert.strictEqual(items[2].type, 'separator');
    assert.deepStrictEqual(codes.slice(2, 5), ['DPS', 'DAP', 'JSP']);
    assert.deepStrictEqual(codes.slice(5, 8), ['FOBA', 'FOCA', 'FOSPEC']);
    assert.strictEqual(logic.EVENT_DOMAIN_GROUPS[2][2], 'FOSPEC');
    assert.ok(!codes.includes('PAPR'));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  results.forEach((r) => console.log(`${r.status} ${r.name}`));
  if(failed.length){
    failed.forEach((r) => console.error(r.proof));
    process.exit(1);
  }
  console.log(`${results.length} tests PASS`);
})();

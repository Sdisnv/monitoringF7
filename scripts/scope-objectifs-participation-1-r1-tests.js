#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const { resolveObjective } = require('../netlify/functions/_scope-objectives');
const { hasPermission } = require('../netlify/functions/_rbac');
const { collectMultisessionReport, buildConclusion } = require('../netlify/functions/_scope-multisession-report');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const BASE = '3311287';
const pgSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pg.js'), 'utf8');
const schemaSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-schema.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-objectives-service.js'), 'utf8');
const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const uiLogic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const conv = fs.readFileSync(path.join(ROOT, 'database/migrations/20260821_scope_db_convergence_1.sql'), 'utf8');
const objSql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260819_scope_objectives_1.sql'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'obj-r1', displayName: 'Testeur R1 objectifs' };
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
    assert.strictEqual(error.status, status);
    if(code) assert.strictEqual(error.error, code);
    return error;
  }
}

function sliceBetween(src, start, end){
  const i = src.indexOf(start);
  const j = src.indexOf(end, i + 1);
  assert.ok(i >= 0 && j > i, `bloc introuvable: ${start}`);
  return src.slice(i, j);
}

function gitShow(file){
  return execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8' });
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

async function seedPrSession(){
  const repo = createMemoryRepo();
  const cycleId = 'cycle-pr-opr1';
  await repo.insertCycle({
    cycle_id: cycleId, cycle_key: 'PAPR-opr1', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PAPR 2026'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    events.push(await repo.insertEvenement({
      evenement_id: `opr1-s${i}`,
      cycle_id: cycleId,
      domaine_code: 'PR',
      date: `2026-09-0${i}`,
      libelle: `Exercice PR 1.${i} | Base`,
      pr_exercise_group_key: `${cycleId}:PR:1`,
      pr_session_key: `${cycleId}:PR:1.${i}`
    }));
  }
  const people = [];
  const specs = [
    { id: 'opr1-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
    { id: 'opr1-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
    { id: 'opr1-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
    { id: 'opr1-d', nip: '81004', nom: 'Zampieri', prenom: 'Lucas', grade: 'Sgt' }
  ];
  for(const spec of specs){
    const p = await repo.insertPersonne({ ...spec, personne_id: spec.id, skipPeriodes: true });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: cycleId, personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION'
      });
    }
  }
  const byId = Object.fromEntries(people.map((p) => [p.personne_id, p]));
  await markRepo(repo, 'opr1-s5', byId['opr1-a'].personne_id, 'PRESENT');
  await markRepo(repo, 'opr1-s2', byId['opr1-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(repo, 'opr1-s4', byId['opr1-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(repo, 'opr1-s3', byId['opr1-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return repo;
}

(async () => {
  await record('01 — schéma réel sans hypothèse', () => {
    const convTable = sliceBetween(conv, 'create table if not exists scope_objectifs', 'create table if not exists scope_regles_bascule');
    assert.ok(!/auteur_id/.test(convTable), 'la table de convergence production n’a pas auteur_id');
    assert.ok(/sous_domaine_code/.test(convTable));
    assert.ok(/seuil_pct/.test(convTable));
    assert.ok(/date_debut/.test(convTable));
    assert.ok(/auteur_id/.test(objSql), 'OBJECTIVES-1 SQL historique proposait auteur_id, jamais appliqué si la table existait déjà');
    const migrate = sliceBetween(schemaSrc, 'async function migrateObjectives1', 'async function migrateEventQ1');
    assert.ok(!/auteur_id/.test(migrate));
  });

  await record('02 — aucune référence invalide à auteur_id sur scope_objectifs', () => {
    const insert = sliceBetween(pgSrc, 'async insertObjectif(row)', 'async updateObjectif(id, patch)');
    assert.ok(!/auteur_id/.test(insert));
    assert.ok(insert.includes('insert into scope_objectifs'));
    assert.ok(insert.includes('commentaire'));
    const journal = sliceBetween(pgSrc, 'async appendJournal(row)', 'async getQuantitatifSaisie');
    assert.ok(journal.includes('auteur_id'), 'l’audit journal conserve auteur_id');
    assert.ok(serviceSrc.includes("action: 'CREER_OBJECTIF'"));
  });

  await record('03 — lecture liste vide', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const listed = await objectifs.listObjectifs();
    assert.deepStrictEqual(listed.objectifs, []);
    assert.strictEqual(logic.emptyMessage('objectifs'), 'Aucun objectif de participation défini.');
    assert.ok(ui.includes("emptyMessage('objectifs')"));
  });

  await record('04-05 — création PR 80 % / contrat de stockage', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    assert.strictEqual(created.objectif.scope, 'DOMAINE');
    assert.strictEqual(created.objectif.domaineCode, 'PR');
    assert.strictEqual(created.objectif.thresholdPct, 80);
    assert.strictEqual(created.objectif.dateDebut, '2026-01-01');
    assert.strictEqual(created.objectif.dateFin, '2026-12-31');
    const raw = await repo.getObjectif(created.objectif.objectifId);
    assert.ok(!('auteur_id' in raw) || raw.auteur_id == null || raw.auteur_id);
    assert.strictEqual(raw.portee, 'DOMAINE');
    assert.strictEqual(Number(raw.seuil_pct), 80);
    const listed = await objectifs.listObjectifs();
    assert.strictEqual(listed.objectifs.length, 1);
  });

  await record('06 — aperçu résolution PR 15.06.2026 = 80 %', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const preview = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'PR' });
    assert.strictEqual(preview.objectif.thresholdPct, 80);
    assert.strictEqual(preview.objectif.scope, 'DOMAINE');
    assert.strictEqual(preview.objectif.domaineCode, 'PR');
    const listed = await repo.listObjectifs({ actif: true });
    const engine = resolveObjective({
      date: '2026-06-15', domaineCode: 'PR', analysisGrain: 'DOMAINE', objectives: listed
    });
    assert.strictEqual(engine.thresholdPct, 80);
  });

  await record('07 — rapport consomme l’objectif créé', async () => {
    const repo = await seedPrSession();
    const objectifs = createScopeObjectivesService(repo);
    await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const model = await collectMultisessionReport(repo, 'opr1-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.objective.thresholdPct, 80);
    const conclusion = buildConclusion({
      percentage: model.officiel && model.officiel.percentage,
      objectiveThreshold: model.objective.thresholdPct,
      domaine: 'PR',
      nonParticipants: model.nonParticipants
    });
    assert.ok(conclusion.paragraphs.some((p) => /80/.test(p) || /objectif/.test(p)));
  });

  await record('08 — clôture conserve l’historique', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01'
    }, ACTOR);
    const closed = await objectifs.cloturerObjectif(created.objectif.objectifId, { dateFin: '2026-12-31' }, ACTOR);
    assert.strictEqual(closed.objectif.dateFin, '2026-12-31');
    const still = await objectifs.getObjectif(created.objectif.objectifId);
    assert.ok(still.objectif);
    assert.strictEqual(still.objectif.thresholdPct, 80);
    const after = await objectifs.resolveObjectif({ date: '2027-01-02', domaine: 'PR' });
    assert.strictEqual(after.objectif, null);
    const during = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'PR' });
    assert.strictEqual(during.objectif.thresholdPct, 80);
    assert.strictEqual(logic.objectifLifecycleStatus(closed.objectif, '2027-01-02'), 'TERMINE');
  });

  await record('09-11 — nouvelle période 2027 / historique 2026 / résolution', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const first = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const next = await objectifs.nouvellePeriode(first.objectif.objectifId, {
      dateDebut: '2027-01-01', dateFin: '2027-12-31', seuilPct: 85
    }, ACTOR);
    const listed = await objectifs.listObjectifs();
    assert.strictEqual(listed.objectifs.length, 2);
    assert.strictEqual(next.precedent.thresholdPct, 80);
    assert.strictEqual(next.objectif.thresholdPct, 85);
    const y26 = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'PR' });
    const y27 = await objectifs.resolveObjectif({ date: '2027-06-15', domaine: 'PR' });
    assert.strictEqual(y26.objectif.thresholdPct, 80);
    assert.strictEqual(y27.objectif.thresholdPct, 85);
  });

  await record('12 — chevauchement refusé', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const err = await expectHttp(() => objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 85, dateDebut: '2026-06-01', dateFin: '2026-12-31'
    }, ACTOR), 422, 'chevauchement_objectif');
    assert.match(err.message, /existe déjà pour ce périmètre/);
  });

  await record('13-14 — RBAC écriture / lecture authentifiée', () => {
    assert.strictEqual(hasPermission({ roles: ['sdis-user'] }, 'references:manage'), false);
    assert.strictEqual(hasPermission({ roles: ['sdis-admin'] }, 'references:manage'), true);
    assert.ok(scopeJs.includes("if(method === 'GET' && path === '/objectifs')"));
    assert.ok(scopeJs.includes("if(method === 'POST' && path === '/objectifs')"));
    const post = sliceBetween(scopeJs, "if(method === 'POST' && path === '/objectifs')", "params = match(path, '/objectifs/:id')");
    assert.ok(post.includes("hasPermission(claims, 'references:manage')"));
    const getList = sliceBetween(scopeJs, "if(method === 'GET' && path === '/objectifs')", "if(method === 'GET' && path === '/objectifs/resolution')");
    assert.ok(!getList.includes("hasPermission(claims, 'references:manage')"));
  });

  await record('15-17 — audit create / close / nouvelle période', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 80, dateDebut: '2026-01-01'
    }, ACTOR);
    await objectifs.cloturerObjectif(created.objectif.objectifId, { dateFin: '2026-06-30' }, ACTOR);
    const next = await objectifs.nouvellePeriode(created.objectif.objectifId, {
      dateDebut: '2026-07-01', seuilPct: 85
    }, ACTOR);
    const journal = await repo.listJournal('objectif', created.objectif.objectifId);
    const journalNext = await repo.listJournal('objectif', next.objectif.objectifId);
    const actions = [...journal, ...journalNext].map((row) => row.action);
    assert.ok(actions.includes('CREER_OBJECTIF'));
    assert.ok(actions.includes('CLOTURER_OBJECTIF'));
    assert.ok(actions.includes('NOUVELLE_PERIODE_OBJECTIF'));
    assert.ok(!actions.includes('OBJECTIVE_CREATE'));
  });

  await record('18 — aucune erreur SQL brute UI', () => {
    const info = logic.friendlyError({
      status: 500,
      error: 'scope_internal',
      message: 'column "auteur_id" of relation "scope_objectifs" does not exist'
    });
    assert.ok(!/auteur_id/.test(info.message));
    assert.ok(!/scope_objectifs/.test(info.message));
    assert.ok(!/does not exist/.test(info.message));
    assert.ok(scopeJs.includes('leaksSql'));
    assert.ok(!ui.includes('error.stack'));
  });

  await record('19 — aucune modification PDF', () => {
    assert.strictEqual(
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8'),
      gitShow('netlify/functions/_scope-pdf-renderer.js')
    );
    assert.strictEqual(
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8'),
      gitShow('netlify/functions/_scope-pdf-charts.js')
    );
    assert.strictEqual(
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-multisession-report.js'), 'utf8'),
      gitShow('netlify/functions/_scope-multisession-report.js')
    );
  });

  await record('20 — aucune modification R4', () => {
    assert.strictEqual(
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8'),
      gitShow('netlify/functions/_scope-cycle-rules.js')
    );
    const r4 = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
    assert.ok(r4.includes('sessionHasValidStatus'));
    assert.ok(r4.includes('canCloseLastSession'));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  results.forEach((r) => console.log(`${r.status} ${r.name}`));
  if(failed.length){
    failed.forEach((r) => console.error(r.proof));
    process.exit(1);
  }
  console.log(`${results.length} tests PASS`);
})();

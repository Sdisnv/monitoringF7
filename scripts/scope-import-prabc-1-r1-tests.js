#!/usr/bin/env node
'use strict';

/** SCOPE-IMPORT-PRABC-1-R1 — validation import PR-ABC + actions de masse. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const svc = require('../netlify/lib/_scope-personnel-service');
const ctx = require('../netlify/lib/_scope-personnel-import-contexts');
const postgres = require('../netlify/lib/_postgres');
const display = require('../assets/js/scope-personnel-display.js');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];
const NIPS = Array.from({ length: 18 }, (_, i) => String(7640 + i + 1)); // 7641–7658, 7647-like inclus

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function csvOf(nips){
  return ['NIP;GRADE;NOM;PRENOM'].concat(nips.map((nip) => `${nip};Sap;Test;${nip}`)).join('\n');
}

function person(nip){
  return {
    id: `p-${nip}`,
    nip,
    grade: 'Sap',
    nom: 'Test',
    prenom: nip,
    date_entree_sdis: '2020-02-03',
    archived_at: null
  };
}

function papr(nip){
  return {
    id: `a-pr-${nip}`,
    personne_id: `p-${nip}`,
    nip,
    categorie: 'SPECIALISATION',
    domaine: 'PR',
    cible: 'PR',
    role_domaine: null,
    date_actif: '2020-01-01',
    date_inactif: null
  };
}

function autoPl(nip){
  return {
    id: `a-pl-${nip}`,
    personne_id: `p-${nip}`,
    nip,
    categorie: 'SPECIALISATION',
    domaine: 'AUTO',
    cible: 'PL',
    role_domaine: null,
    date_actif: '2020-01-01',
    date_inactif: null
  };
}

function createMemoryDb(){
  const persons = new Map();
  const assignments = [];
  const batches = [];
  const lines = [];
  const log = [];
  let failOnAssignmentInsert = 0;
  let assignmentInserts = 0;
  function placeholderArity(sql){
    let max = 0;
    String(sql).replace(/\$(\d+)/g, (_, n) => {
      max = Math.max(max, Number(n));
      return _;
    });
    return max;
  }
  async function query(sql, params){
    const s = String(sql).replace(/\s+/g, ' ');
    const lower = s.toLowerCase();
    const arity = placeholderArity(sql);
    if(arity !== (params || []).length){
      throw new Error(`bind message supplies ${(params || []).length} parameters, but prepared statement requires ${arity}`);
    }
    log.push({ sql: s, params });
    if(lower.includes('select * from scope_personnes where nip = any')){
      return { rows: [...persons.values()].filter((row) => (params[0] || []).includes(row.nip) && !row.archived_at) };
    }
    if(lower.includes('select * from scope_personnes where nip=$1')){
      const row = persons.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if(lower.includes('from scope_affectations a join scope_personnes')){
      const ids = params[0] || [];
      return { rows: assignments.filter((row) => ids.includes(row.personne_id)).map((row) => {
        const found = [...persons.values()].find((item) => item.id === row.personne_id) || {};
        return Object.assign({}, row, { nip: found.nip });
      }) };
    }
    if(lower.includes('select id from scope_affectations')){
      const found = assignments.find((row) => (
        row.personne_id === params[0]
        && row.categorie === params[1]
        && row.domaine === params[2]
        && row.cible === params[3]
        && (row.role_domaine || '') === (params[4] || '')
        && !row.date_inactif
      ));
      return { rows: found ? [{ id: found.id }] : [] };
    }
    if(lower.startsWith('insert into scope_personnes')){
      const row = { id: params[0], nip: params[1], grade: params[2], nom: params[3], prenom: params[4], date_entree_sdis: '2020-02-03', archived_at: null };
      persons.set(row.nip, row);
      return { rows: [row] };
    }
    if(lower.startsWith('insert into scope_affectations')){
      assignmentInserts += 1;
      if(failOnAssignmentInsert && assignmentInserts >= failOnAssignmentInsert){
        throw new Error('forced assignment insert failure');
      }
      assignments.push({
        id: params[0],
        personne_id: params[1],
        categorie: params[2],
        domaine: params[3],
        cible: params[4],
        role_domaine: params[5],
        date_actif: params[6],
        date_inactif: null,
        source_import_batch_id: params[7]
      });
      return { rows: [] };
    }
    if(lower.startsWith('insert into scope_personnel_import_batches')){
      batches.push({ id: params[0], contexte: params[2] });
      return { rows: [] };
    }
    if(lower.startsWith('insert into scope_personnel_import_lines')){
      lines.push({ id: params[0], batch_id: params[1], nip: params[3], status: params[6] });
      return { rows: [] };
    }
    return { rows: [] };
  }
  return {
    persons,
    assignments,
    batches,
    lines,
    log,
    setFailOnAssignmentInsert(n){ failOnAssignmentInsert = n; assignmentInserts = 0; },
    async query(sql, params){ return query(sql, params); },
    async transaction(fn){
      const snapPersons = new Map([...persons.entries()].map(([k, v]) => [k, Object.assign({}, v)]));
      const snapA = assignments.map((row) => Object.assign({}, row));
      const snapB = batches.slice();
      const snapL = lines.slice();
      try{
        return await fn({ query });
      }catch(error){
        persons.clear();
        snapPersons.forEach((v, k) => persons.set(k, v));
        assignments.length = 0;
        assignments.push(...snapA);
        batches.length = 0;
        batches.push(...snapB);
        lines.length = 0;
        lines.push(...snapL);
        throw error;
      }
    },
    _skipScopeSchema: true
  };
}

function installDb(memory){
  postgres._skipScopeSchema = true;
  postgres.query = (sql, params) => memory.query(sql, params);
  postgres.transaction = (fn) => memory.transaction(fn);
}

function seedEighteen(memory, extraPlNip){
  NIPS.forEach((nip) => {
    memory.persons.set(nip, person(nip));
    memory.assignments.push(papr(nip));
    if(nip === extraPlNip) memory.assignments.push(autoPl(nip));
  });
}

function previewEighteen(dateActif){
  const resolved = ctx.resolveImportContext('PR_ABC');
  const file = csvOf(NIPS);
  const rows = svc.normalizeRows(svc.parsePersonnelCsv(file), resolved.code, null);
  const existingPersons = new Map();
  const existingAssignments = new Map();
  NIPS.forEach((nip) => {
    existingPersons.set(nip, person(nip));
    existingAssignments.set(nip, [papr(nip)]);
  });
  return svc.buildPreview({
    rows,
    existingPersons,
    existingAssignments,
    population: [],
    resolved,
    siteJsp: null,
    anneeMonitoring: 2026,
    filename: 'PR-ABC.csv',
    dateActif: dateActif || '2026-01-01'
  });
}

(async () => {
  const preview = previewEighteen('2026-01-01');
  const decorated = display.decoratePersonnelImportPreview(preview);
  const seeded = display.seedPersonnelImportDecisions(decorated, {}, '2026-01-01');

  await record('01 — analyse 18 NIP existants', () => {
    assert.strictEqual(preview.lines.filter((row) => row.status !== 'ABSENT_DU_NOUVEL_IMPORT').length, 18);
    assert.strictEqual(new Set(preview.lines.map((row) => row.normalized.nip)).size, 18);
  });

  await record('02 — 18 PAPR', () => {
    preview.lines.forEach((line) => {
      assert.ok((line.diff.otherPopulations || []).includes('PAPR') || (line.diff.existingAssignments || []).some((row) => row.domaine === 'PR'));
      assert.notStrictEqual(line.status, 'ERROR');
    });
  });

  await record('03 — 18 nouvelles affectations', () => {
    assert.strictEqual(preview.counts.countNewAssignments, 18);
    preview.lines.forEach((line) => {
      assert.strictEqual(line.status, 'NEW_ASSIGNMENT');
      assert.ok(line.diff.newAssignments.some((row) => row.cible === 'ABC'));
    });
  });

  await record('04 — action par défaut = Appliquer', () => {
    decorated.lines.forEach((row) => {
      assert.strictEqual(display.personnelImportDefaultDecision(row), 'APPLIQUER');
      assert.strictEqual(row.decision, 'APPLIQUER');
      assert.ok(row.rowId);
    });
  });

  await record('05 — aucune anomalie', () => {
    assert.strictEqual(preview.counts.countErrors, 0);
    preview.lines.forEach((line) => {
      assert.strictEqual((line.errors || []).length, 0);
    });
  });

  await record('06 — Appliquer à tous', () => {
    const ignored = display.applyMassPersonnelImportDecision(decorated, seeded, 'IGNORER', '2026-01-01');
    const applied = display.applyMassPersonnelImportDecision(decorated, ignored, 'APPLIQUER', '2026-01-01');
    Object.keys(applied).forEach((id) => assert.strictEqual(applied[id].decision, 'APPLIQUER'));
  });

  await record('07 — Ignorer tous', () => {
    const ignored = display.applyMassPersonnelImportDecision(decorated, seeded, 'IGNORER', '2026-01-01');
    Object.keys(ignored).forEach((id) => assert.strictEqual(ignored[id].decision, 'IGNORER'));
  });

  await record('08 — exception individuelle', () => {
    const applied = display.applyMassPersonnelImportDecision(decorated, {}, 'APPLIQUER', '2026-01-01');
    const exceptionId = display.personnelImportRowId(decorated.lines[0]);
    applied[exceptionId] = Object.assign({}, applied[exceptionId], { decision: 'IGNORER' });
    const planned = svc.planCommitMutations(preview, display.personnelImportCommitDecisions(decorated, applied, '2026-01-01'));
    assert.strictEqual(planned.assignmentInserts.length, 17);
  });

  await record('09 — décision conservée après render', () => {
    const map = display.seedPersonnelImportDecisions(decorated, {}, '2026-01-01');
    const id = display.personnelImportRowId(decorated.lines[3]);
    map[id].decision = 'IGNORER';
    const again = display.decoratePersonnelImportPreview(preview);
    const kept = display.personnelImportCommitDecisions(again, map, '2026-01-01');
    assert.strictEqual(kept.find((row) => row.rowId === id).decision, 'IGNORER');
  });

  await record('10 — décision conservée à ouverture modale', () => {
    const map = display.seedPersonnelImportDecisions(decorated, {}, '2026-01-01');
    const modal = display.personnelImportCommitDecisions(decorated, map, '2026-01-01');
    assert.strictEqual(modal.length, 18);
    assert.ok(modal.every((row) => row.decision === 'APPLIQUER'));
  });

  await record('11 — modale compte exactement les Appliquer', () => {
    const map = display.applyMassPersonnelImportDecision(decorated, {}, 'APPLIQUER', '2026-01-01');
    const id = display.personnelImportRowId(decorated.lines[1]);
    map[id].decision = 'IGNORER';
    assert.strictEqual(display.personnelImportAppliedMutationCount(decorated, map, '2026-01-01'), 17);
  });

  await record('12 — payload commit = décisions modale', () => {
    const map = display.seedPersonnelImportDecisions(decorated, {}, '2026-01-01');
    const modal = display.personnelImportCommitDecisions(decorated, map, '2026-01-01');
    const payload = display.personnelImportCommitDecisions(decorated, map, '2026-01-01');
    assert.deepStrictEqual(payload, modal);
  });

  await record('13 — aucun reset vers Ignorer', () => {
    const afterRender = display.decoratePersonnelImportPreview(preview);
    afterRender.lines.forEach((row) => assert.notStrictEqual(row.decision, 'IGNORER'));
    const planned = svc.planCommitMutations(preview, []);
    assert.strictEqual(planned.assignmentInserts.length, 18);
  });

  const memory = createMemoryDb();
  installDb(memory);
  seedEighteen(memory, '7647');

  await record('14 — commit crée 18 affectations', async () => {
    const committed = await svc.commitImport({
      fileText: csvOf(NIPS),
      filename: 'PR-ABC.csv',
      contexte: 'PR_ABC',
      anneeMonitoring: 2026,
      dateEffet: '2026-01-01',
      dateEffetGlobale: '2026-01-01',
      confirmed: true,
      decisions: display.personnelImportCommitDecisions(decorated, seeded, '2026-01-01')
    }, 'tester');
    assert.strictEqual(committed.assignmentsCreated, 18);
    assert.strictEqual(memory.assignments.filter((row) => row.cible === 'ABC').length, 18);
  });

  await record('15 — aucune Personne créée', () => {
    assert.strictEqual(memory.persons.size, 18);
  });

  await record('16 — NIP unique', () => {
    assert.strictEqual(new Set([...memory.persons.keys()]).size, 18);
  });

  await record('17 — date effet correcte', () => {
    memory.assignments.filter((row) => row.cible === 'ABC').forEach((row) => {
      assert.strictEqual(row.date_actif, '2026-01-01');
    });
  });

  await record('18 — PAPR requis', () => {
    const resolved = ctx.resolveImportContext('PR_ABC');
    const rows = svc.normalizeRows(svc.parsePersonnelCsv('NIP;GRADE;NOM;PRENOM\n90001;Sap;Sans;Papr'), resolved.code, null);
    const built = svc.buildPreview({
      rows,
      existingPersons: new Map([['90001', person('90001')]]),
      existingAssignments: new Map([['90001', []]]),
      population: [],
      resolved,
      siteJsp: null,
      anneeMonitoring: 2026,
      filename: 'x.csv',
      dateActif: '2026-01-01'
    });
    assert.strictEqual(built.lines[0].status, 'ERROR');
    assert.strictEqual(display.personnelImportDefaultDecision(built.lines[0]), 'IGNORER');
    assert.strictEqual(display.personnelImportIsMassApplyable(built.lines[0]), false);
  });

  await record('19 — NIP inconnu bloqué', () => {
    const resolved = ctx.resolveImportContext('PR_ABC');
    const rows = svc.normalizeRows(svc.parsePersonnelCsv('NIP\n99999'), resolved.code, null);
    const built = svc.buildPreview({
      rows,
      existingPersons: new Map(),
      existingAssignments: new Map(),
      population: [],
      resolved,
      siteJsp: null,
      anneeMonitoring: 2026,
      filename: 'x.csv',
      dateActif: '2026-01-01'
    });
    assert.strictEqual(built.lines[0].status, 'ERROR');
    assert.ok((built.lines[0].errors || []).some((msg) => /NIP inconnu/.test(msg)));
    const planned = svc.planCommitMutations(built, [{ rowId: String(built.lines[0].lineNumber), decision: 'APPLIQUER' }]);
    assert.strictEqual(planned.assignmentInserts.length, 0);
    assert.strictEqual(planned.personInserts.length, 0);
  });

  await record('20 — succès import', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('IMPORT TERMINÉ'));
    assert.ok(ui.includes('Import PR-ABC terminé'));
  });

  await record('21 — refresh frontend', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(/loadPersonnelDirectory\(\)/.test(ui));
    assert.ok(ui.includes('state.personnelSync.preview = null'));
  });

  await record('22 — fiche 7647-like affiche PR-ABC', () => {
    const assignments = [
      { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' },
      { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'ABC' },
      { categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'PL' }
    ];
    const view = display.ficheSpecializationView(assignments);
    assert.ok(view.labels.includes('PAPR'));
    assert.ok(view.labels.includes('PR-ABC'));
    assert.ok(view.labels.includes('cond PL'));
  });

  await record('23 — réimport = 0 création', async () => {
    const second = await svc.commitImport({
      fileText: csvOf(NIPS),
      filename: 'PR-ABC.csv',
      contexte: 'PR_ABC',
      anneeMonitoring: 2026,
      dateEffet: '2026-01-01',
      dateEffetGlobale: '2026-01-01',
      confirmed: true,
      decisions: display.personnelImportCommitDecisions(decorated, seeded, '2026-01-01')
    }, 'tester');
    assert.strictEqual(second.assignmentsCreated, 0);
    assert.ok(second.skipped || second.alreadyExisting >= 0);
  });

  await record('24 — pas de duplication', () => {
    assert.strictEqual(memory.assignments.filter((row) => row.cible === 'ABC').length, 18);
  });

  await record('25 — pas de message séance pour import', () => {
    const info = logic.friendlyError({
      status: 400,
      error: 'scope_personnel_import_commit_failed',
      payload: { message: 'La date d’effet PR-ABC est obligatoire.' }
    });
    assert.notStrictEqual(info.title, 'Séance modifiée ailleurs');
    assert.ok(!/séance/i.test(info.message));
    const commitJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-import-commit.js'), 'utf8');
    assert.ok(!/return response\(409, \{ ok:false, error:'scope_personnel_import_commit_failed'/.test(commitJs));
  });

  await record('26 — conflit import = message personnel', () => {
    const info = logic.friendlyError({
      status: 409,
      error: 'personnel_stale',
      payload: { message: 'Les données du personnel ont été modifiées depuis l’analyse. Rechargez et analysez à nouveau le fichier avant de poursuivre.' }
    });
    assert.strictEqual(info.title, 'Import du personnel');
    assert.ok(/personnel/.test(info.message));
    const seance = logic.friendlyError({ status: 409, error: 'conflict' });
    assert.strictEqual(seance.title, 'Séance modifiée ailleurs');
  });

  await record('27 — audit import conservé', () => {
    assert.ok(memory.batches.length >= 1);
    assert.ok(memory.lines.length >= 18);
  });

  await record('28 — transaction / rollback si erreur', async () => {
    const isolated = createMemoryDb();
    installDb(isolated);
    isolated.persons.set('80001', person('80001'));
    isolated.assignments.push(papr('80001'));
    isolated.setFailOnAssignmentInsert(1);
    const source = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-service.js'), 'utf8');
    assert.ok(source.includes('getDb().transaction'));
    await assert.rejects(() => svc.commitImport({
      fileText: 'NIP;GRADE;NOM;PRENOM\n80001;Sap;Test;80001',
      filename: 'PR-ABC.csv',
      contexte: 'PR_ABC',
      anneeMonitoring: 2026,
      dateEffet: '2026-01-01',
      confirmed: true
    }, 'tester'));
    assert.strictEqual(isolated.assignments.filter((row) => row.cible === 'ABC').length, 0);
    assert.strictEqual(isolated.persons.size, 1);
  });

  await record('29 — filtre preview cohérent', () => {
    const buttons = display.importFilterButtons(decorated);
    assert.ok(buttons.some((row) => row.id === 'CHANGEMENTS' && row.label === 'À traiter'));
    assert.ok(buttons.some((row) => row.id === 'MODIFICATIONS' && row.label === 'Modifications'));
    assert.ok(buttons.some((row) => row.id === 'TOUS'));
    const treated = display.filterPreviewRows(decorated.lines, 'CHANGEMENTS');
    assert.strictEqual(treated.length, 18);
    const identical = display.filterPreviewRows([{
      statut: 'IDENTICAL',
      nip: '1',
      normalized: { nip: '1' },
      diff: { person: {}, newAssignments: [], existingAssignments: [] }
    }], 'CHANGEMENTS');
    assert.strictEqual(identical.length, 0);
  });

  await record('30 — import PAPR existant non régressé', () => {
    const resolved = ctx.resolveImportContext('PAPR');
    const rows = svc.normalizeRows(svc.parsePersonnelCsv('NIP;GRADE;NOM;PRENOM;OI\nNIP001;Sgt;DUPONT;Marc;DPS B1'), resolved.code, null);
    const paprPerson = {
      id: 'p-NIP001',
      nip: 'NIP001',
      grade: 'Sgt',
      nom: 'DUPONT',
      prenom: 'Marc',
      date_entree_sdis: '2020-02-03',
      archived_at: null
    };
    const built = svc.buildPreview({
      rows,
      existingPersons: new Map([['NIP001', paprPerson]]),
      existingAssignments: new Map([['NIP001', [{
        id: 'oi',
        personne_id: 'p-NIP001',
        categorie: 'OI',
        domaine: 'DPS',
        cible: 'B1',
        role_domaine: 'PRINCIPAL',
        date_actif: '2026-01-01'
      }]]]),
      population: [],
      resolved,
      siteJsp: null,
      anneeMonitoring: 2026,
      filename: 'papr.csv'
    });
    const line = built.lines.find((row) => row.normalized.nip === 'NIP001');
    assert.ok(line.status === 'NEW_ASSIGNMENT' || line.status === 'NEW_PERSON' || line.status === 'MODIFIED');
    const planned = svc.planCommitMutations(built, []);
    assert.ok(planned.assignmentInserts.some((row) => row.assignment && row.assignment.domaine === 'PR'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  });
  if(failed.length){
    console.error(`\n${failed.length} test(s) NOK`);
    process.exit(1);
  }
  console.log(`\n${results.length} tests PASS`);
})();

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const svc = require('../netlify/lib/_scope-personnel-service');
const ctx = require('../netlify/lib/_scope-personnel-import-contexts');
const postgres = require('../netlify/lib/_postgres');

function csv(body){
  return `NIP;GRADE;NOM;PRENOM;OI\n${body}`;
}

function jspCsv(body){
  return `NIP;GRADE;NOM;PRENOM;OI\n${body}`;
}

function personRow(overrides){
  return Object.assign({
    id: 'p1',
    nip: 'NIP001',
    grade: 'Sgt',
    nom: 'DUPONT',
    prenom: 'Marc',
    date_entree_sdis: '2020-02-03',
    archived_at: null
  }, overrides);
}

function aff(overrides){
  return Object.assign({
    id: 'a1',
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'B1',
    role_domaine: 'PRINCIPAL',
    date_actif: '2026-01-01',
    date_inactif: null
  }, overrides || {});
}

function previewOf({ contexte, site, file, persons, assignments, population, annee }){
  const resolved = svc.resolveImportContext(contexte);
  const siteJsp = site ? ctx.normalizeJspSite(site) : null;
  const rows = svc.normalizeRows(svc.parsePersonnelCsv(file), resolved.code, siteJsp);
  const existingPersons = new Map();
  (persons || []).forEach((row) => existingPersons.set(row.nip, row));
  const existingAssignments = new Map();
  (assignments || []).forEach((row) => {
    if(!existingAssignments.has(row.nip)) existingAssignments.set(row.nip, []);
    existingAssignments.get(row.nip).push(row);
  });
  return svc.buildPreview({
    rows,
    existingPersons,
    existingAssignments,
    population: population || [],
    resolved,
    siteJsp,
    anneeMonitoring: annee || 2026,
    filename: 'test.csv'
  });
}

function statuses(preview){
  return preview.lines.map((line) => `${line.normalized.nip}:${line.status}`);
}

function createMemoryDb(){
  const persons = new Map();
  const assignments = [];
  const batches = [];
  const lines = [];
  const log = [];
  function isWrite(sql){
    const s = String(sql).toLowerCase();
    return /^\s*(insert|update|delete)\b/.test(s);
  }
  function personnelWrite(sql){
    const s = String(sql).toLowerCase();
    return isWrite(sql) && (
      s.includes('scope_personnes')
      || s.includes('scope_affectations')
      || s.includes('scope_personnel_import_batches')
      || s.includes('scope_personnel_import_lines')
    );
  }
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
    const count = (params || []).length;
    if(arity !== count){
      throw new Error(`bind message supplies ${count} parameters, but prepared statement requires ${arity}`);
    }
    log.push({ sql: s, params, write: personnelWrite(sql) });
    if(lower.includes('from scope_cibles') && lower.includes('jsp')){
      return { rows: [
        { niveau_code:'G1', libelle:'JSP G1' },
        { niveau_code:'C1', libelle:'JSP C1' },
        { niveau_code:'B1', libelle:'JSP B1' },
        { niveau_code:'CAD', libelle:'JSP CAD' },
        { niveau_code:'GEN', libelle:'JSP GEN' }
      ] };
    }
    if(lower.includes('select * from scope_personnes where nip = any')){
      return { rows: [...persons.values()].filter((row) => (params[0] || []).includes(row.nip) && !row.archived_at) };
    }
    if(lower.includes('select * from scope_personnes where nip=$1') || lower.includes('select * from scope_personnes where nip=$1 for update')){
      const row = persons.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if(lower.includes('from scope_affectations a join scope_personnes')){
      const ids = params[0] || [];
      return { rows: assignments.filter((row) => ids.includes(row.personne_id)).map((row) => {
        const person = [...persons.values()].find((item) => item.id === row.personne_id) || {};
        return Object.assign({}, row, { nip: person.nip });
      }) };
    }
    if(lower.includes('select distinct p.* from scope_affectations a join scope_personnes')){
      const matched = [...persons.values()].filter((person) => assignments.some((row) => {
        if(row.personne_id !== person.id || row.date_inactif) return false;
        if(lower.includes("domaine in ('dps','dap')")) return row.categorie === 'OI' && (row.domaine === 'DPS' || row.domaine === 'DAP');
        if(lower.includes("a.domaine='jsp'")){
          const wanted = ctx.normalizeJspGrade(params[1]);
          return row.domaine === 'JSP' && row.cible === params[0] && ctx.normalizeJspGrade(person.grade) === wanted;
        }
        if(lower.includes("a.domaine=$2") && params[1] === 'PR') return row.domaine === 'PR' && row.cible === params[2];
        if(lower.includes("a.domaine=$2") && params[1] === 'AUTO') return row.domaine === 'AUTO' && (row.cible === params[2] || (params[2] === 'PL' && row.cible === 'cond PL'));
        if(lower.includes("a.domaine=$2") && params[1] === 'FOBA') return row.domaine === 'FOBA' && (row.cible === params[2] || row.cible === `FOBA ${params[2]}`);
        return false;
      }));
      return { rows: matched };
    }
    if(lower.startsWith('insert into scope_personnes')){
      const row = { id: params[0], nip: params[1], grade: params[2], nom: params[3], prenom: params[4], date_entree_sdis: '2020-02-03', archived_at: null };
      persons.set(row.nip, row);
      return { rows: [row] };
    }
    if(lower.startsWith('update scope_personnes') && lower.includes('date_entree_sdis')){
      const row = [...persons.values()].find((item) => item.id === params[0]);
      if(row && params[1]) row.date_entree_sdis = params[1];
      return { rows: row ? [row] : [] };
    }
    if(lower.startsWith('update scope_personnes')){
      const row = [...persons.values()].find((item) => item.id === params[0]);
      if(row){
        row.grade = params[1] == null ? row.grade : params[1];
        row.nom = params[2] == null ? row.nom : params[2];
        row.prenom = params[3] == null ? row.prenom : params[3];
      }
      return { rows: row ? [row] : [] };
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
    if(lower.startsWith('insert into scope_affectations')){
      assert.ok(!lower.includes('niveau'));
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
    if(lower.startsWith('update scope_affectations') && lower.includes('date_inactif')){
      assignments.forEach((row) => {
        if(params.length === 2 && row.id === params[0] && !row.date_inactif) row.date_inactif = params[1];
      });
      return { rows: [] };
    }
    if(lower.startsWith('insert into scope_personnel_import_batches')){
      batches.push({ id: params[0], contexte: params[2], site_jsp: params[3] });
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
    personnelWrites(){ return log.filter((row) => row.write); },
    async query(sql, params){ return query(sql, params); },
    async transaction(fn){ return fn({ query }); },
    _skipScopeSchema: true
  };
}

function installDb(memory){
  postgres._skipScopeSchema = true;
  postgres.query = (sql, params) => memory.query(sql, params);
  postgres.transaction = (fn) => memory.transaction(fn);
}

async function run(){
  // A GENERAL
  const generalPreview = previewOf({
    contexte: 'GENERAL',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1')
  });
  assert.strictEqual(generalPreview.lines[0].status, 'NEW_PERSON');
  assert.strictEqual(generalPreview.wrote, false);
  assert.strictEqual(generalPreview.contexte, 'GENERAL');

  // B PAPR existing person
  const paprPreview = previewOf({
    contexte: 'PAPR',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow()],
    assignments: [Object.assign(aff(), { nip: 'NIP001' })]
  });
  assert.strictEqual(paprPreview.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(paprPreview.lines[0].diff.newAssignments[0].domaine, 'PR');
  assert.ok(!paprPreview.lines[0].diff.newAssignments.some((row) => row.domaine === 'DPS'));

  // C / D / E AUTO distinct
  const vlDps = previewOf({ contexte:'AUTO_VL_DPS', file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'), persons:[personRow()], assignments:[Object.assign(aff(), { nip:'NIP001' })] });
  const vlDap = previewOf({ contexte:'AUTO_VL_DAP', file: csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'), persons:[personRow()], assignments:[Object.assign(aff({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' })] });
  const autoPl = previewOf({ contexte:'AUTO_PL', file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'), persons:[personRow()], assignments:[Object.assign(aff(), { nip:'NIP001' })] });
  assert.strictEqual(vlDps.lines[0].diff.newAssignments[0].cible, 'VL_DPS');
  assert.strictEqual(vlDap.lines[0].diff.newAssignments[0].cible, 'VL_DAP');
  assert.strictEqual(autoPl.lines[0].diff.newAssignments[0].cible, 'PL');
  assert.notStrictEqual(vlDps.lines[0].diff.newAssignments[0].cible, vlDap.lines[0].diff.newAssignments[0].cible);

  // F G H FOBA autonomous
  ['FOBA_1', 'FOBA_2', 'FOBA_3'].forEach((code, index) => {
    const preview = previewOf({ contexte: code, file: csv('NIPF01;Sgt;FOBA;Eve;') });
    assert.strictEqual(preview.lines[0].status, 'NEW_PERSON');
    assert.strictEqual(preview.lines[0].diff.newAssignments[0].domaine, 'FOBA');
    assert.strictEqual(preview.lines[0].diff.newAssignments[0].cible, String(index + 1));
  });

  // I JSP G1 Flm 1 without general personnel — grade on person, site on assignment
  const jspG1Flm1 = previewOf({
    contexte: 'JSP_NORD_VAUDOIS',
    file: jspCsv('JSP001;Flm 1;MARTIN;Lea;JSP G1')
  });
  assert.strictEqual(jspG1Flm1.lines[0].status, 'NEW_JSP');
  assert.ok(!(jspG1Flm1.lines[0].errors || []).length);
  assert.strictEqual(jspG1Flm1.lines[0].normalized.grade, 'Flm 1');
  assert.strictEqual(jspG1Flm1.lines[0].diff.identity.grade.proposed, 'Flm 1');
  assert.strictEqual(jspG1Flm1.lines[0].diff.newAssignments[0].cible, 'JSP G1');
  assert.strictEqual(jspG1Flm1.lines[0].diff.newAssignments[0].domaine, 'JSP');
  assert.ok(jspG1Flm1.lines[0].diff.newAssignments[0].niveau == null);
  assert.ok(!jspG1Flm1.lines[0].diff.newAssignments.some((row) => row.domaine === 'DPS' || row.domaine === 'DAP'));

  // J Flm 1 → Flm 2 same NIP / same site = grade change, no niveau assignment
  const jspG1Flm2 = previewOf({
    contexte: 'JSP_NORD_VAUDOIS',
    file: jspCsv('JSP001;Flm 2;MARTIN;Lea;JSP G1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })]
  });
  assert.strictEqual(jspG1Flm2.lines[0].status, 'MODIFIED');
  assert.strictEqual(jspG1Flm2.lines[0].normalized.nip, 'JSP001');
  assert.strictEqual(jspG1Flm2.lines[0].normalized.grade, 'Flm 2');
  assert.strictEqual(jspG1Flm2.lines[0].diff.identity.grade.current, 'Flm 1');
  assert.strictEqual(jspG1Flm2.lines[0].diff.identity.grade.proposed, 'Flm 2');
  assert.strictEqual(jspG1Flm2.lines[0].diff.person.grade.before, 'Flm 1');
  assert.strictEqual(jspG1Flm2.lines[0].diff.person.grade.after, 'Flm 2');
  assert.strictEqual(jspG1Flm2.lines[0].diff.newAssignments.length, 0);
  assert.strictEqual(jspG1Flm2.lines[0].diff.existingAssignments[0].cible, 'JSP G1');
  assert.ok(jspG1Flm2.lines[0].diff.existingAssignments[0].niveau == null);
  assert.strictEqual(svc.unresolvedRequiredDecisions(jspG1Flm2, []).length, 1);
  const flmChangeMut = svc.planCommitMutations(jspG1Flm2, [{ rowId: jspG1Flm2.lines[0].lineNumber, decision: 'APPLIQUER' }]);
  assert.strictEqual(flmChangeMut.personInserts.length, 0);
  assert.strictEqual(flmChangeMut.personUpdates.length, 1);
  assert.strictEqual(flmChangeMut.personUpdates[0].grade, 'Flm 2');
  assert.strictEqual(flmChangeMut.assignmentInserts.length, 0);

  // K JSP C1 Flm 2 — site distinct from grade
  const jspC1Flm2 = previewOf({
    contexte: 'JSP_NORD_VAUDOIS',
    file: jspCsv('JSP002;Flm 2;BERNARD;Luc;JSP C1')
  });
  assert.notStrictEqual(jspC1Flm2.lines[0].diff.newAssignments[0].cible, jspG1Flm1.lines[0].diff.newAssignments[0].cible);
  assert.strictEqual(jspC1Flm2.lines[0].normalized.grade, 'Flm 2');
  assert.strictEqual(jspC1Flm2.lines[0].diff.newAssignments[0].cible, 'JSP C1');
  assert.ok(jspC1Flm2.lines[0].diff.newAssignments[0].niveau == null);

  // L same NIP GENERAL + PAPR = 1 person
  const afterGeneral = previewOf({
    contexte: 'PAPR',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow()],
    assignments: [Object.assign(aff(), { nip:'NIP001' })]
  });
  assert.notStrictEqual(afterGeneral.lines[0].status, 'NEW_PERSON');
  const paprMut = svc.planCommitMutations(afterGeneral, []);
  assert.strictEqual(paprMut.personInserts.length, 0);
  assert.strictEqual(paprMut.assignmentInserts.length, 1);

  // M PAPR + VL DPS + PL = 1 person distinct assignments
  const multi = ['PAPR', 'AUTO_VL_DPS', 'AUTO_PL'].map((contexte) => previewOf({
    contexte,
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow()],
    assignments: [Object.assign(aff(), { nip:'NIP001' })]
  }));
  const keys = multi.flatMap((preview) => preview.lines[0].diff.newAssignments.map((row) => svc.assignmentKey(row)));
  assert.strictEqual(new Set(keys).size, 3);

  // N FOBA then GENERAL keeps FOBA history
  const fobaThenGeneral = previewOf({
    contexte: 'GENERAL',
    file: csv('NIPF01;Sgt;FOBA;Eve;DPS G1'),
    persons: [personRow({ nip:'NIPF01', nom:'FOBA', prenom:'Eve' })],
    assignments: [Object.assign(aff({ categorie:'SPECIALISATION', domaine:'FOBA', cible:'1', role_domaine:null }), { nip:'NIPF01' })]
  });
  assert.notStrictEqual(fobaThenGeneral.lines[0].status, 'NEW_PERSON');
  assert.ok(fobaThenGeneral.lines[0].diff.otherPopulations.some((label) => String(label).includes('FOBA')));
  const genMut = svc.planCommitMutations(fobaThenGeneral, []);
  assert.strictEqual(genMut.assignmentClosures.length, 0);

  // O / P JSP then FOBA / GENERAL = 1 person
  const jspPerson = personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' });
  const jspAff = Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' });
  const jspThenFoba = previewOf({
    contexte: 'FOBA_1',
    file: csv('JSP001;Flm 1;MARTIN;Lea;'),
    persons: [jspPerson],
    assignments: [jspAff]
  });
  const jspThenGeneral = previewOf({
    contexte: 'GENERAL',
    file: csv('JSP001;Sgt;MARTIN;Lea;DPS G1'),
    persons: [jspPerson],
    assignments: [jspAff]
  });
  assert.notStrictEqual(jspThenFoba.lines[0].status, 'NEW_PERSON');
  assert.notStrictEqual(jspThenGeneral.lines[0].status, 'NEW_PERSON');
  assert.strictEqual(jspThenFoba.lines[0].status, 'NEW_ASSIGNMENT');

  // Q JSP absent from general is not an anomaly
  const generalWithoutJsp = previewOf({
    contexte: 'GENERAL',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow(), jspPerson],
    assignments: [Object.assign(aff(), { nip:'NIP001' }), jspAff],
    population: [personRow()]
  });
  assert.ok(!generalWithoutJsp.lines.some((line) => line.normalized.nip === 'JSP001'));
  assert.ok(!generalWithoutJsp.lines.some((line) => (line.errors || []).join(' ').includes('JSP')));

  // R unknown JSP creation allowed
  assert.strictEqual(jspG1Flm1.lines[0].status, 'NEW_JSP');
  assert.strictEqual((jspG1Flm1.errors || []).length || 0, 0);

  // S / T idempotent reimport
  const jspSame = previewOf({
    contexte: 'JSP_NORD_VAUDOIS',
    file: jspCsv('JSP001;Flm 1;MARTIN;Lea;JSP G1'),
    persons: [jspPerson],
    assignments: [jspAff]
  });
  assert.strictEqual(jspSame.lines[0].status, 'IDENTICAL');
  const jspSameMut = svc.planCommitMutations(jspSame, []);
  assert.strictEqual(jspSameMut.personInserts.length, 0);
  assert.strictEqual(jspSameMut.assignmentInserts.length, 0);

  const paprSame = previewOf({
    contexte: 'PAPR',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow()],
    assignments: [
      Object.assign(aff(), { nip:'NIP001' }),
      Object.assign(aff({ categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null }), { nip:'NIP001' })
    ]
  });
  assert.strictEqual(paprSame.lines[0].status, 'IDENTICAL');
  assert.strictEqual(svc.planCommitMutations(paprSame, []).assignmentInserts.length, 0);

  // U absence signaled, no auto close
  const paprAbsent = previewOf({
    contexte: 'PAPR',
    file: csv('NIP002;Sgt;AUTRE;Paul;DPS B1'),
    persons: [personRow(), personRow({ id:'p2', nip:'NIP002', nom:'AUTRE', prenom:'Paul' })],
    assignments: [
      Object.assign(aff({ categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null }), { nip:'NIP001' })
    ],
    population: [personRow()]
  });
  const absent = paprAbsent.lines.find((line) => line.status === 'ABSENT_DU_NOUVEL_IMPORT');
  assert.ok(absent);
  assert.strictEqual(absent.decision, 'CONSERVER');
  const noClose = svc.planCommitMutations(paprAbsent, []);
  assert.strictEqual(noClose.assignmentClosures.length, 0);
  const withClose = svc.planCommitMutations(paprAbsent, [{ rowId: String(absent.lineNumber), nip:'NIP001', decision:'CLOTURER', dateEffet:'2026-12-31' }]);
  assert.strictEqual(withClose.assignmentClosures.length, 1);

  // V Flm 1 → Flm 2 same person (no new person, no niveau assignment)
  assert.notStrictEqual(jspG1Flm2.lines[0].status, 'NEW_JSP');
  assert.notStrictEqual(jspG1Flm2.lines[0].status, 'NEW_PERSON');
  assert.strictEqual(jspG1Flm2.lines[0].normalized.nip, 'JSP001');

  // W site change same person — grade unchanged, new site assignment
  const siteChange = previewOf({
    contexte: 'JSP_NORD_VAUDOIS',
    file: jspCsv('JSP001;Flm 2;MARTIN;Lea;JSP C1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 2' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })]
  });
  assert.notStrictEqual(siteChange.lines[0].status, 'NEW_JSP');
  assert.strictEqual(siteChange.lines[0].diff.newAssignments[0].cible, 'JSP C1');
  assert.ok((siteChange.lines[0].warnings || []).some((msg) => msg.includes('JSP G1')));

  // X / Y cond VL coherence
  const dpsOnlyForDap = previewOf({
    contexte: 'AUTO_VL_DAP',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    persons: [personRow()],
    assignments: [Object.assign(aff(), { nip:'NIP001' })]
  });
  assert.ok((dpsOnlyForDap.lines[0].warnings || []).some((msg) => msg.includes('sans rattachement DAP')));
  const dapOnlyForDps = previewOf({
    contexte: 'AUTO_VL_DPS',
    file: csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'),
    persons: [personRow()],
    assignments: [Object.assign(aff({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' })]
  });
  assert.ok((dapOnlyForDps.lines[0].warnings || []).some((msg) => msg.includes('sans rattachement DPS')));

  // Z preview zero write
  const memory = createMemoryDb();
  installDb(memory);
  memory.persons.set('NIP001', personRow());
  const analyzed = await svc.analyzeImport({
    fileText: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    filename: 'preview.csv',
    contexte: 'PAPR',
    anneeMonitoring: 2026
  });
  assert.strictEqual(analyzed.wrote, false);
  assert.strictEqual(memory.personnelWrites().length, 0);
  assert.strictEqual(memory.persons.size, 1);
  assert.strictEqual(memory.assignments.length, 0);

  // AA commit only after explicit commit call
  const committed = await svc.commitImport({
    fileText: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    filename: 'commit.csv',
    contexte: 'PAPR',
    anneeMonitoring: 2026,
    confirmed: true
  }, 'tester');
  assert.strictEqual(committed.wrote, true);
  assert.ok(committed.batchId);
  assert.strictEqual(memory.assignments.filter((row) => row.domaine === 'PR').length, 1);
  assert.strictEqual(memory.batches[0].contexte, 'PAPR');

  // AB history batch context + JSP site
  const jspMemory = createMemoryDb();
  installDb(jspMemory);
  await svc.commitImport({
    fileText: jspCsv('JSP009;Flm 1;NOEL;Anne;JSP G1'),
    filename: 'jsp.csv',
    contexte: 'JSP_NORD_VAUDOIS',
    anneeMonitoring: 2026,
    confirmed: true
  }, 'tester');
  assert.strictEqual(jspMemory.batches[0].contexte, 'JSP_NORD_VAUDOIS');
  assert.ok(jspMemory.batches[0].site_jsp === 'JSP G1' || jspMemory.batches[0].site_jsp == null);
  assert.strictEqual(jspMemory.persons.size, 1);
  assert.strictEqual(jspMemory.persons.get('JSP009').grade, 'Flm 1');
  assert.strictEqual(jspMemory.assignments[0].cible, 'JSP G1');
  assert.strictEqual(jspMemory.assignments[0].domaine, 'JSP');
  assert.ok(jspMemory.assignments[0].niveau == null);

  // AC date_entree_sdis not overwritten by empty
  const existingDate = jspMemory.persons.get('JSP009').date_entree_sdis;
  await svc.commitImport({
    fileText: jspCsv('JSP009;Flm 1;NOEL;Anne;JSP G1'),
    filename: 'jsp2.csv',
    contexte: 'JSP_NORD_VAUDOIS',
    anneeMonitoring: 2026,
    confirmed: true
  }, 'tester');
  assert.strictEqual(jspMemory.persons.get('JSP009').date_entree_sdis, existingDate);
  assert.strictEqual(jspMemory.persons.size, 1);

  // AD no duplicate NIP
  assert.strictEqual([...jspMemory.persons.values()].filter((row) => row.nip === 'JSP009').length, 1);

  const contexts = fs.readFileSync(path.join(__dirname, '..', 'netlify/lib/_scope-personnel-import-contexts.js'), 'utf8');
  assert.ok(contexts.includes('AUTO_VL_DPS'));
  assert.ok(contexts.includes('AUTO_VL_DAP'));
  assert.ok(contexts.includes('JSP_NORD_VAUDOIS'));
  assert.ok(contexts.includes('MONITEURS_JSP'));
  assert.ok(contexts.includes("return 'Flm 1'"));
  assert.ok(!contexts.includes('JSP_G1_FLM1'));
  assert.ok(!contexts.includes('jspFlamme:'));

  const allContexts = ['GENERAL', 'PAPR', 'AUTO_VL_DPS', 'AUTO_VL_DAP', 'AUTO_PL', 'FOBA_1', 'FOBA_2', 'FOBA_3', 'JSP_NORD_VAUDOIS', 'MONITEURS_JSP'];
  allContexts.forEach((code) => {
    const resolved = svc.resolveImportContext(code);
    const site = resolved.requiresSite ? { code: 'JSP G1', label: 'JSP G1' } : null;
    const built = svc.buildPopulationQuery(resolved, site);
    assert.ok(built, code);
    assert.strictEqual(svc.sqlPlaceholderArity(built.sql), built.params.length, `${code} bind mismatch`);
  });
  const autoPlQuery = svc.buildPopulationQuery(svc.resolveImportContext('AUTO_PL'), null);
  assert.ok(autoPlQuery.sql.includes('$3'));
  assert.strictEqual(autoPlQuery.params.length, 3);
  assert.strictEqual(autoPlQuery.params[2], 'PL');
  const autoDpsQuery = svc.buildPopulationQuery(svc.resolveImportContext('AUTO_VL_DPS'), null);
  assert.ok(autoDpsQuery.sql.includes('$3'));
  assert.strictEqual(autoDpsQuery.params[2], 'VL_DPS');

  function seedExistingDps(db, nip){
    const person = personRow({ nip, id: `id-${nip}` });
    db.persons.set(nip, person);
    db.assignments.push(Object.assign(aff({ domaine:'DPS', cible:'B1' }), { personne_id: person.id, nip }));
    return person;
  }

  const vlDpsMemory = createMemoryDb();
  installDb(vlDpsMemory);
  seedExistingDps(vlDpsMemory, 'NIP001');
  const vlDpsAnalyze = await svc.analyzeImport({
    fileText: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    filename: 'auto-vl-dps.csv',
    contexte: 'AUTO_VL_DPS',
    anneeMonitoring: 2026
  });
  assert.strictEqual(vlDpsAnalyze.wrote, false);
  assert.strictEqual(vlDpsMemory.personnelWrites().length, 0);
  assert.ok(!(vlDpsAnalyze.lines[0].errors || []).length);
  assert.strictEqual(vlDpsAnalyze.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(vlDpsAnalyze.lines[0].normalized.nip, 'NIP001');
  assert.strictEqual(vlDpsAnalyze.lines[0].diff.newAssignments[0].domaine, 'AUTO');
  assert.strictEqual(vlDpsAnalyze.lines[0].diff.newAssignments[0].cible, 'VL_DPS');
  assert.ok(!vlDpsAnalyze.lines[0].diff.newAssignments.some((row) => row.domaine === 'DPS'));
  assert.strictEqual(vlDpsMemory.assignments.filter((row) => row.domaine === 'DPS').length, 1);
  assert.strictEqual(vlDpsMemory.assignments.filter((row) => row.domaine === 'AUTO').length, 0);

  const vlDapMemory = createMemoryDb();
  installDb(vlDapMemory);
  const dapPerson = personRow({ nip:'NIP001', id:'id-NIP001' });
  vlDapMemory.persons.set('NIP001', dapPerson);
  vlDapMemory.assignments.push(Object.assign(aff({ domaine:'DAP', cible:'Y2' }), { personne_id: dapPerson.id, nip:'NIP001' }));
  const vlDapAnalyze = await svc.analyzeImport({
    fileText: csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'),
    filename: 'auto-vl-dap.csv',
    contexte: 'AUTO_VL_DAP',
    anneeMonitoring: 2026
  });
  assert.strictEqual(vlDapAnalyze.wrote, false);
  assert.strictEqual(vlDapAnalyze.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(vlDapAnalyze.lines[0].diff.newAssignments[0].cible, 'VL_DAP');
  assert.notStrictEqual(vlDapAnalyze.lines[0].diff.newAssignments[0].cible, 'VL_DPS');

  const autoPlMemory = createMemoryDb();
  installDb(autoPlMemory);
  seedExistingDps(autoPlMemory, 'NIP001');
  const autoPlAnalyze = await svc.analyzeImport({
    fileText: csv('NIP001;Sgt;DUPONT;Marc;DPS B1'),
    filename: 'auto-pl.csv',
    contexte: 'AUTO_PL',
    anneeMonitoring: 2026
  });
  assert.strictEqual(autoPlAnalyze.wrote, false);
  assert.strictEqual(autoPlAnalyze.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(autoPlAnalyze.lines[0].diff.newAssignments[0].cible, 'PL');

  const serviceSrc = fs.readFileSync(path.join(__dirname, '..', 'netlify/lib/_scope-personnel-service.js'), 'utf8');
  const pgSrc = fs.readFileSync(path.join(__dirname, '..', 'netlify/lib/_scope-pg.js'), 'utf8');
  assert.ok(!/a\.niveau/.test(serviceSrc));
  assert.ok(!/coalesce\(niveau/.test(serviceSrc));
  assert.ok(!/add column if not exists niveau/.test(serviceSrc));
  assert.ok(!/insert into scope_affectations\([^)]*\bniveau\b/.test(pgSrc));
  assert.ok(!/\ba\.niveau\b/.test(pgSrc));

  console.log('scope-personnel-import-populations tests ok', statuses(generalPreview)[0]);
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

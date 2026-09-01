'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const postgres = require('../netlify/functions/_postgres');
const personnel = require('../netlify/functions/_scope-personnel-service');

const origQuery = postgres.query;
const origTx = postgres.transaction;
const origSkip = postgres._skipScopeSchema;

function createMemoryDb(){
  const persons = new Map();
  const assignments = [];
  const periodes = [];
  const journal = [];
  async function query(sql, params){
    const lower = String(sql).replace(/\s+/g, ' ').toLowerCase().trim();
    if(lower.includes('select * from scope_personnes where id=$1')){
      const row = persons.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if(lower.includes('select * from scope_affectations where personne_id=$1')){
      return { rows: assignments.filter((row) => row.personne_id === params[0]) };
    }
    if(lower.includes('select * from scope_personne_periodes where personne_id=$1')){
      return { rows: periodes.filter((row) => row.personne_id === params[0]) };
    }
    if(lower.includes('select * from scope_journal_metier')){
      return { rows: journal.filter((row) => String(row.entite_id) === String(params[0])) };
    }
    if(lower.startsWith('insert into scope_personne_periodes')){
      periodes.push({
        periode_id: params[0],
        personne_id: params[1],
        type: 'INDISPONIBLE',
        date_debut: params[2],
        date_fin: params[3],
        motif: 'CONGE_SABBATIQUE',
        source: 'MANUEL'
      });
      return { rows: [] };
    }
    if(lower.startsWith('update scope_personne_periodes set date_fin')){
      const row = periodes.find((item) => item.periode_id === params[0]);
      if(row) row.date_fin = params[1];
      return { rows: row ? [row] : [] };
    }
    if(lower.startsWith('insert into scope_journal_metier')){
      journal.push({
        journal_id: params[0],
        action: params[4],
        entite: params[2],
        entite_id: params[3],
        apres: params[6]
      });
      return { rows: [] };
    }
    if(lower.startsWith('insert into scope_affectations')){
      assignments.push({
        id: params[0],
        personne_id: params[1],
        categorie: params[2],
        domaine: params[3],
        cible: params[4],
        role_domaine: params[5],
        date_actif: params[6],
        date_inactif: params[7] || null
      });
      return { rows: [] };
    }
    throw new Error(`SQL mémoire non géré: ${sql}`);
  }
  return {
    query,
    transaction: async (fn) => fn({ query }),
    persons,
    assignments,
    periodes,
    journal
  };
}

function install(mem){
  postgres.query = mem.query;
  postgres.transaction = mem.transaction;
  postgres._skipScopeSchema = true;
}

function restore(){
  postgres.query = origQuery;
  postgres.transaction = origTx;
  postgres._skipScopeSchema = origSkip;
}

function seedPerson(mem, overrides){
  const row = Object.assign({
    id: 'p-b1',
    nip: '99001',
    grade: 'Sgt',
    nom: 'TEST',
    prenom: 'Marc',
    date_entree_sdis: '2020-02-03',
    archived_at: null
  }, overrides || {});
  mem.persons.set(row.id, row);
  return row;
}

function seedAff(mem, overrides){
  const row = Object.assign({
    id: 'a-dps',
    personne_id: 'p-b1',
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    role_domaine: 'PRINCIPAL',
    date_actif: '2026-01-01',
    date_inactif: null
  }, overrides || {});
  mem.assignments.push(row);
  return row;
}

async function expectStatus(fn, status){
  try {
    await fn();
    assert.fail('devait échouer');
  } catch (error) {
    assert.strictEqual(error.statusCode, status, String(error.message || error));
  }
}

(async () => {
  const mem = createMemoryDb();
  install(mem);
  try {
    seedPerson(mem);
    seedAff(mem);
    const snapshotAff = () => mem.assignments.map((row) => ({
      id: row.id, date_actif: row.date_actif, date_inactif: row.date_inactif
    }));
    const before = snapshotAff();

    const created = await personnel.openSabbatical('p-b1', { dateDebut: '2026-07-01', dateFin: '2026-12-31' }, { sub: 'tester' });
    assert.strictEqual(created.periodes.length, 1);
    assert.strictEqual(created.periodes[0].type, 'INDISPONIBLE');
    assert.strictEqual(created.periodes[0].motif, 'CONGE_SABBATIQUE');
    assert.strictEqual(String(created.periodes[0].date_debut).slice(0, 10), '2026-07-01');
    assert.strictEqual(String(created.periodes[0].date_fin).slice(0, 10), '2026-12-31');
    assert.deepStrictEqual(snapshotAff(), before);
    const live = personnel.sabbaticalPayload(created.periodes, '2026-08-01');
    assert.strictEqual(live.active, true);
    assert.strictEqual(live.dateDebut, '2026-07-01');
    assert.strictEqual(live.dateFin, '2026-12-31');
    assert.ok(live.id);
    assert.ok(mem.journal.some((row) => row.action === 'PERSONNEL_SABBATICAL_CREATE'));

    await expectStatus(() => personnel.openSabbatical('p-b1', { dateDebut: '2026-12-31', dateFin: '2026-07-01' }), 422);
    await expectStatus(() => personnel.openSabbatical('p-b1', { dateDebut: '2026-08-01', dateFin: '2026-09-01' }), 422);

    const periodeId = created.periodes[0].periode_id;
    const ended = await personnel.endSabbatical('p-b1', { periodeId, dateFin: '2026-08-15' }, { sub: 'tester' });
    assert.strictEqual(ended.periodes.length, 1);
    assert.strictEqual(String(ended.periodes[0].date_fin).slice(0, 10), '2026-08-15');
    assert.strictEqual(String(ended.periodes[0].date_debut).slice(0, 10), '2026-07-01');
    assert.ok(!ended.periodes.some((row) => String(row.type).toUpperCase() === 'SORTI'));
    assert.deepStrictEqual(snapshotAff(), before);
    assert.ok(mem.journal.some((row) => row.action === 'PERSONNEL_SABBATICAL_END'));
    const afterEnd = personnel.sabbaticalPayload(ended.periodes, '2026-09-01');
    assert.strictEqual(afterEnd.active, false);

    await personnel.createAffectation('p-b1', {
      categorie: 'OI', domaine: 'DAP', cible: 'Y2', roleDomaine: 'PRINCIPAL', dateActif: '2026-01-01'
    });
    await personnel.createAffectation('p-b1', {
      categorie: 'OI', domaine: 'JSP', cible: 'JSP C1', roleDomaine: 'PRINCIPAL', dateActif: '2026-01-01'
    });
    const withThree = await personnel.getPersonne('p-b1');
    const principals = withThree.affectations.filter((row) => row.roleDomaine === 'PRINCIPAL');
    assert.ok(principals.some((row) => row.domaine === 'DPS' && row.cible === 'G1'));
    assert.ok(principals.some((row) => row.domaine === 'DAP' && row.cible === 'Y2'));
    assert.ok(principals.some((row) => row.domaine === 'JSP'));
    assert.strictEqual(mem.persons.get('p-b1').date_entree_sdis, '2020-02-03');
    assert.strictEqual(before.find((row) => row.id === 'a-dps').date_inactif, null);

    await personnel.createAffectation('p-b1', {
      categorie: 'OI', domaine: 'DPS', cible: 'C1', roleDomaine: 'SECONDAIRE', dateActif: '2026-01-01'
    });
    const withSecondary = await personnel.getPersonne('p-b1');
    assert.ok(withSecondary.affectations.some((row) => row.domaine === 'DPS' && row.roleDomaine === 'SECONDAIRE' && row.cible === 'C1'));
    assert.ok(withSecondary.affectations.some((row) => row.id === 'a-dps' && !row.dateInactif));

    await expectStatus(() => personnel.createAffectation('p-b1', {
      categorie: 'OI', domaine: 'DPS', cible: 'G1', roleDomaine: 'PRINCIPAL', dateActif: '2026-03-01'
    }), 422);

    await personnel.createAffectation('p-b1', {
      categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01'
    });
    await personnel.createAffectation('p-b1', {
      categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'VL_DPS', dateActif: '2026-01-01'
    });
    const specs = (await personnel.getPersonne('p-b1')).affectations.filter((row) => row.categorie === 'SPECIALISATION');
    assert.ok(specs.some((row) => row.domaine === 'PR' && row.cible === 'PR'));
    assert.ok(specs.some((row) => row.domaine === 'AUTO' && row.cible === 'VL_DPS'));
    assert.strictEqual(mem.persons.get('p-b1').date_entree_sdis, '2020-02-03');

    await expectStatus(() => personnel.createAffectation('missing', {
      categorie: 'OI', domaine: 'DPS', cible: 'G1', roleDomaine: 'PRINCIPAL', dateActif: '2026-01-01'
    }), 404);

    const handler = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-inactivate.js'), 'utf8');
    const detail = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-detail.js'), 'utf8');
    assert.ok(handler.includes("action === 'sabbatical'"));
    assert.ok(handler.includes("action === 'end_sabbatical'"));
    assert.ok(handler.includes("action === 'close_assignment'"));
    assert.ok(handler.includes('personnel.inactivatePersonne'));
    assert.ok(handler.includes('personnel.closePersonneAffectation'));
    assert.ok(handler.includes('personnel.openSabbatical'));
    assert.ok(!handler.includes('changerAffectation'));
    assert.ok(detail.includes('createAffectation'));
    assert.ok(detail.includes("'personnel:manage'"));
    assert.ok(!detail.includes('changer-affectation'));
  } finally {
    restore();
  }
  console.log('SCOPE-PERSONNEL-BACKEND-B1 tests PASS');
})().catch((error) => {
  restore();
  console.error(error);
  process.exit(1);
});

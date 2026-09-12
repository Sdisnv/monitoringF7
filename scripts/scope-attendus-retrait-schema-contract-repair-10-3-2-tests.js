#!/usr/bin/env node
'use strict';

/** SCOPE — ATTENDUS-RETRAIT-SCHEMA-CONTRACT-REPAIR-10.3.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-attendus-retrait-schema-contract-repair-10-3-2',
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const REQUIRED_RETRAIT_VALUES = [
  'EXCEPTION_RETRAIT',
  'NON_ASSIGNE',
  'PERMUTATION_SOURCE_CORRIGEE',
  'RESET_SAISIE',
  'SUPPRESSION_METIER',
  'DESASSIGNATION',
  'INDISPONIBLE'
];
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

function extractInList(sql){
  const match = String(sql || '').match(/origine_retrait in\s*\(([\s\S]*?)\)/i);
  if(!match) return [];
  return [...match[1].matchAll(/'([A-Z0-9_]+)'/g)].map((item) => item[1]).sort();
}

function extractAllRetraitInLists(schema){
  return [...String(schema || '').matchAll(/origine_retrait in\s*\(([\s\S]*?)\)/gi)]
    .map((match) => [...match[1].matchAll(/'([A-Z0-9_]+)'/g)].map((item) => item[1]).sort());
}

function serviceWrittenRetraitValues(serviceSrc){
  const values = new Set();
  for(const match of String(serviceSrc).matchAll(/origine_retrait:\s*'([A-Z0-9_]+)'/g)){
    values.add(match[1]);
  }
  for(const match of String(serviceSrc).matchAll(/origine_retrait \|\| '([A-Z0-9_]+)'/g)){
    values.add(match[1]);
  }
  return [...values].sort();
}

function pgRetraitAllows(allowedValues, value){
  if(value == null) return true;
  return (allowedValues || []).includes(String(value));
}

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function seedDpsB1Population(count, libelle){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1');
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: String(8900 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${i}`,
      grade: 'Sap'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(personne);
  }
  const created = await service.createEvenement({
    date: '2026-09-12',
    domaineCode: 'DPS',
    libelle: libelle || 'DPS B1 recette R10.3.2',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:45',
    heureFinPrevue: '22:15'
  }, ACTOR);
  return { repo, service, cible, people, created };
}

(async () => {
  const schema = read('netlify/lib/_scope-schema.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const memorySrc = read('netlify/lib/_scope-memory.js');
  const pgSrc = read('netlify/lib/_scope-pg.js');
  const ui = read('assets/js/scope-ui.js');
  const retraitLists = extractAllRetraitInLists(schema);
  const createList = retraitLists[0] || [];
  const alterList = retraitLists[1] || [];

  await record('01 — contrainte PostgreSQL autorise les 7 valeurs métier', async () => {
    eq(retraitLists.length, 2, 'CREATE TABLE et ALTER TABLE exposent le même contrat');
    includes(schema, 'origine_retrait is null');
    for(const value of REQUIRED_RETRAIT_VALUES){
      ok(pgRetraitAllows(createList, value), `CREATE autorise ${value}`);
      ok(pgRetraitAllows(alterList, value), `ALTER autorise ${value}`);
    }
    ok(pgRetraitAllows(createList, null), 'NULL autorisé');
  });

  await record('02 — valeur inconnue toujours refusée', async () => {
    eq(pgRetraitAllows(createList, 'FOO'), false);
    eq(pgRetraitAllows(alterList, 'INCONNU_METIER'), false);
    eq(pgRetraitAllows(createList, 'EXCEPTION_AJOUT'), false);
    eq(createList.join(','), REQUIRED_RETRAIT_VALUES.slice().sort().join(','));
    eq(alterList.join(','), REQUIRED_RETRAIT_VALUES.slice().sort().join(','));
  });

  await record('03 — contrat schéma = valeurs réellement écrites par le code', async () => {
    const written = serviceWrittenRetraitValues(serviceSrc);
    eq(written.join(','), REQUIRED_RETRAIT_VALUES.slice().sort().join(','));
    for(const value of written){
      ok(pgRetraitAllows(createList, value), `schéma accepte ${value} écrit par le service`);
    }
    includes(serviceSrc, "origine_retrait: 'NON_ASSIGNE'");
    includes(serviceSrc, "origine_retrait: 'EXCEPTION_RETRAIT'");
    includes(serviceSrc, "origine_retrait: 'PERMUTATION_SOURCE_CORRIGEE'");
    includes(serviceSrc, "origine_retrait: 'RESET_SAISIE'");
    includes(serviceSrc, "origine_retrait: 'SUPPRESSION_METIER'");
    includes(serviceSrc, "origine_retrait: 'DESASSIGNATION'");
    includes(serviceSrc, "origine_retrait || 'INDISPONIBLE'");
  });

  await record('04 — migration production idempotente, sans écrasement de données', async () => {
    includes(schema, "LATEST_SCOPE_SCHEMA_VERSION = 'scope-attendus-retrait-schema-contract-repair-10-3-2'");
    includes(schema, 'async function migrateAttendusRetraitSchemaContractRepair1032');
    includes(schema, 'drop constraint if exists scope_attendus_retrait_chk');
    includes(schema, 'add constraint scope_attendus_retrait_chk');
    includes(schema, "values ('scope-attendus-retrait-schema-contract-repair-10-3-2') on conflict (version) do nothing");
    includes(schema, 'select distinct origine_retrait');
    includes(schema, 'valeurs hors contrat, non modifiées');
    notIncludes(schema, 'drop table scope_attendus');
    notIncludes(schema, 'delete from scope_attendus');
    notIncludes(schema, 'update scope_attendus set origine_retrait');
    includes(schema, 'scope-participant-selection-runtime-root-repair-10-3-1');
  });

  await record('05 — divergence Memory vs PostgreSQL désormais testée', async () => {
    includes(memorySrc, 'origine_retrait: row.origine_retrait || null');
    notIncludes(memorySrc, 'scope_attendus_retrait_chk');
    notIncludes(memorySrc, "origine_retrait === 'EXCEPTION_RETRAIT'");
    includes(pgSrc, 'origine_retrait = excluded.origine_retrait');
    notIncludes(schema, "origine_retrait is null or origine_retrait = 'EXCEPTION_RETRAIT'");
    ok(createList.includes('NON_ASSIGNE'), 'CREATE n’est plus limité à EXCEPTION_RETRAIT seul');
  });

  await record('06 — figer 5 sur 30 : count 5, 25 NON_ASSIGNE, relecture 5', async () => {
    const ctx = await seedDpsB1Population(30);
    const preview = await ctx.service.previewAttendus(ctx.created.evenement.evenement_id);
    eq(preview.count, 30);
    const selected = ctx.people.slice(0, 5).map((row) => row.personne_id);
    const assigned = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: selected,
      baseVersion: ctx.created.version
    }, ACTOR);
    eq(assigned.count, 5);
    const stored = await ctx.repo.listAttendus(ctx.created.evenement.evenement_id);
    eq(stored.filter((row) => row.inclus !== false).length, 5);
    eq(stored.filter((row) => row.inclus === false && row.origine_retrait === 'NON_ASSIGNE').length, 25);
    for(const row of stored.filter((item) => item.inclus === false)){
      ok(pgRetraitAllows(createList, row.origine_retrait), `valeur persistée ${row.origine_retrait} compatible PostgreSQL`);
    }
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 5);
    const assignedIds = new Set((fiche.attendus || []).map((row) => String(row.personne_id)));
    for(const personId of selected){
      ok(assignedIds.has(String(personId)));
    }
    for(const person of ctx.people.slice(5)){
      ok(!assignedIds.has(String(person.personne_id)));
    }
  });

  await record('07 — frontend sélection non modifié dans ce lot', async () => {
    includes(ui, 'previewSelectionRows');
    includes(ui, 'buildAssignmentSelectedPersonIds');
    includes(ui, 'Sélection incohérente');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(failed.map((row) => row.proof).join('\n\n'));
    process.exit(1);
  }
})();

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const functional = require('../netlify/lib/_scope-functional-catalog');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');

const ROOT = path.resolve(__dirname,'..');
const ACTOR = { sub:'event-identity-global-test',permissions:['scope:write','references:manage'] };
let passed = 0;

async function test(name,fn){
  await fn();
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2,'0')} - ${name}`);
}

async function target(repo,domain){
  return (await repo.listCibles()).find((row) => row.domaine_code === domain);
}

(async() => {
  await test('création SCOPE interne avec Stat.Com utilise la séquence canonique',async() => {
    const repo=createMemoryRepo(); const service=createScopeService(repo); const cible=await target(repo,'PR');
    const one=await service.createEvenement({ date:'2027-02-01',domaineCode:'PR',libelle:'Exercice PR 8.1',cibleIds:[cible.cible_id],statCom:'011PR' },ACTOR);
    const two=await service.createEvenement({ date:'2027-01-01',domaineCode:'PR',libelle:'Exercice PR 8.2',cibleIds:[cible.cible_id],statCom:'011PR' },ACTOR);
    assert.equal(one.evenement.code_cours,'011PR.001');
    assert.equal(two.evenement.code_cours,'011PR.002');
    assert.equal(two.evenement.statcom_code,'011PR');
  });

  await test('création interne sans Stat.Com ne fabrique aucun code',async() => {
    const repo=createMemoryRepo(); const service=createScopeService(repo); const cible=await target(repo,'DPS');
    const created=await service.createEvenement({ date:'2027-03-01',domaineCode:'DPS',libelle:'Activité sans Stat.Com démontré',cibleIds:[cible.cible_id] },ACTOR);
    assert.equal(created.evenement.statcom_code,null);
    assert.equal(created.evenement.code_cours,null);
  });

  await test('événement externe reste sans Stat.Com et sans code',async() => {
    const repo=createMemoryRepo(); const service=createScopeService(repo); const cible=await target(repo,'DPS');
    const created=await service.createEvenement({ date:'2027-03-02',domaineCode:'DPS',libelle:'Activité externe',cibleIds:[cible.cible_id],external:true },ACTOR);
    assert.equal(created.evenement.origine,'EXTERNE');
    assert.equal(created.evenement.source_type,'EXTERNE');
    assert.equal(created.evenement.statcom_code,null);
    assert.equal(created.evenement.code_cours,null);
    await assert.rejects(() => service.createEvenement({ date:'2027-03-03',domaineCode:'DPS',libelle:'Externe incohérent',cibleIds:[cible.cible_id],external:true,statCom:'0120F7' },ACTOR),/externe ne possède ni Stat.Com/i);
  });

  await test('suppression ne recycle pas un code SCOPE',async() => {
    const repo=createMemoryRepo(); const service=createScopeService(repo); const cible=await target(repo,'PR');
    const first=await service.createEvenement({ date:'2027-01-01',domaineCode:'PR',libelle:'Exercice PR 9.1',cibleIds:[cible.cible_id],statCom:'011PR' },ACTOR);
    assert.equal((await repo.deleteEventIfNoDependencies(first.evenement.evenement_id)).deleted,true);
    const second=await service.createEvenement({ date:'2027-01-02',domaineCode:'PR',libelle:'Exercice PR 9.2',cibleIds:[cible.cible_id],statCom:'011PR' },ACTOR);
    assert.equal(second.evenement.code_cours,'011PR.002');
  });

  await test('QUO VADIS réutilise l’allocateur persistant SCOPE',async() => {
    const store=fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-qv-publication-postgres-store.js'),'utf8');
    assert.match(store,/preparePersistedInitialCodes/);
    assert.match(store,/appendPersistedEventCode/);
  });

  await test('import standard conserve le code source sans le présenter comme code événement',async() => {
    const service=fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-service.js'),'utf8');
    const contract=fs.readFileSync(path.join(ROOT,'assets/js/scope-import-contract.js'),'utf8');
    assert.match(service,/source:'SCOPE_STANDARD_IMPORT'/);
    assert.match(service,/code_cours: eventCode/);
    assert.match(service,/code_source: group\.codeCours/);
    assert.match(contract,/if \(codeSource\) byCodeCours\.set\(codeSource, e\)/);
  });

  await test('les libellés opérationnels PR X.n restent précis',async() => {
    const rows=functional.programmeActivityPresentation(programme.rows).filter((row) => /^Exercice PR [12][.]/.test(row.label));
    assert.equal(rows.length,12);
    assert.deepEqual(rows.slice(0,6).map((row) => row.eventDisplayLabel),['Exercice PR 1.1','Exercice PR 1.2','Exercice PR 1.3','Exercice PR 1.4','Exercice PR 1.5','Exercice PR 1.6']);
    assert.deepEqual(rows.slice(6).map((row) => row.eventDisplayLabel),['Exercice PR 2.1','Exercice PR 2.2','Exercice PR 2.3','Exercice PR 2.4','Exercice PR 2.5','Exercice PR 2.6']);
  });

  await test('UI emploie Auto seulement quand un Stat.Com permet l’allocation',async() => {
    const ui=fs.readFileSync(path.join(ROOT,'assets/js/scope-ui.js'),'utf8');
    assert.match(ui,/return row\.statCom \? 'Auto' : '—'/);
    assert.doesNotMatch(ui,/À la publication/);
    assert.match(ui,/qvProgrammeActionLabel/);
    assert.match(ui,/function canonicalScopeEventCode/);
    assert.doesNotMatch(ui,/ev\.code_cours \|\| ev\.identifiant_externe/);
  });

  console.log(`SCOPE EVENT IDENTITY GLOBAL: ${passed}/8 tests PASS`);
})().catch((error) => { console.error(error); process.exit(1); });

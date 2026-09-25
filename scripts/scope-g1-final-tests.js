#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const model = require('../netlify/lib/_scope-model');
const contract = require('../netlify/lib/_scope-core-contract');
const { resolveObjective } = require('../netlify/lib/_scope-objectives');
const imports = require('../assets/js/scope-import-contract');
const ui = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function createEvent(domain, target) {
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible(domain, target);
  assert.ok(cible, `${domain}/${target} absent du référentiel mémoire`);
  const created = await service.createEvenement({
    date: '2027-03-15',
    domaineCode: domain,
    libelle: `G1-FINAL ${domain}`,
    cibleIds: [cible.cible_id]
  }, { sub: 'g1-final-test' });
  return created.evenement;
}

(async () => {
  await check('1 — nouveau PR écrit comme domaine autonome', async () => {
    const event = await createEvent('PR', 'PAPR');
    assert.strictEqual(event.domaine_code, 'PR');
    assert.strictEqual(event.sous_domaine_code, null);
  });

  await check('2 — nouveau AUTO écrit comme domaine autonome', async () => {
    const event = await createEvent('AUTO', 'VL');
    assert.strictEqual(event.domaine_code, 'AUTO');
    assert.strictEqual(event.sous_domaine_code, null);
  });

  await check('3 — FOSPEC réel reste FOSPEC et distinct de PR/AUTO', async () => {
    const event = await createEvent('FOSPEC', 'GEN');
    assert.strictEqual(event.domaine_code, 'FOSPEC');
    assert.strictEqual(event.sous_domaine_code, null);
    assert.deepStrictEqual([...contract.acceptedEventDomains('FOSPEC')], ['FOSPEC']);
    assert.deepStrictEqual([...contract.acceptedEventDomains('PR')], ['PR']);
    assert.strictEqual(contract.domainSpecialisationLabel('PR', 'ABC'), 'PABC');
  });

  await check('4 — import canonique et normalisation legacy unidirectionnelle', () => {
    for (const domain of ['PR', 'AUTO', 'FOSPEC']) {
      const resolved = imports.resolveDomaine({ domaine: domain });
      assert.strictEqual(resolved.domaineStockage, domain);
      assert.strictEqual(resolved.sousDomaine, null);
      assert.strictEqual(resolved.domaineAffiche, domain);
    }
    const oldPr = imports.resolveDomaine({ domaine: 'FOSPEC', sous_domaine: 'PR' });
    const oldAuto = imports.resolveDomaine({ domaine: 'FOSPEC', sous_domaine: 'AUTO' });
    assert.deepStrictEqual(
      [oldPr.domaineStockage, oldPr.sousDomaine, oldPr.legacyNormalized],
      ['PR', null, true]
    );
    assert.deepStrictEqual(
      [oldAuto.domaineStockage, oldAuto.sousDomaine, oldAuto.legacyNormalized],
      ['AUTO', null, true]
    );
  });

  await check('5 — filtres et objectifs n’absorbent plus PR/AUTO dans FOSPEC', () => {
    assert.deepStrictEqual(model.domaineCodesForFilter('FOSPEC'), ['FOSPEC']);
    assert.strictEqual(model.isSousDomaineFospec('PR'), false);
    assert.strictEqual(model.isSousDomaineFospec('AUTO'), false);
    assert.strictEqual(contract.canonicalEventDomaineFromLegacy('FOSPEC', 'PR'), 'PR');
    const objectives = [{
      objectif_id: 'fospec', portee: 'DOMAINE', domaine_code: 'FOSPEC',
      date_debut: '2027-01-01', date_fin: '2027-12-31', seuil_pct: 80, actif: true
    }];
    assert.strictEqual(resolveObjective({ objectives, date: '2027-06-01', domaineCode: 'PR' }), null);
    assert.deepStrictEqual(ui.objectifUxFromRow({ portee: 'DOMAINE', domaineCode: 'PR' }), {
      portee: 'DOMAINE', porteeLabel: 'Domaine', domaineUx: 'PR', cibleUx: '', cibleLabel: '—'
    });
  });

  await check('6 — migration ciblée, idempotente et sans tables opérationnelles protégées', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260925_scope_taxonomy_pr_auto_fospec_g1_final.sql'), 'utf8');
    const executable = sql.replace(/^\s*--.*$/gm, '');
    assert.match(executable, /where domaine_code = 'FOSPEC'[\s\S]*sous_domaine_code in \('PR', 'AUTO'\)/);
    assert.match(executable, /where domaine_code in \('PR', 'AUTO'\)[\s\S]*sous_domaine_code = domaine_code/);
    assert.match(executable, /update scope_sous_domaines[\s\S]*set actif = false/);
    assert.doesNotMatch(executable, /\b(scope_attendus|scope_participations|scope_quo_vadis_obligations|scope_annual_requirements|scope_event_definitions)\b/);
    assert.match(executable, /on conflict \(version\) do nothing/);
  });

  for (const result of results) {
    console.log(`${result.status} — ${result.name}${result.proof ? `\n${result.proof}` : ''}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  console.log(`\nG1-FINAL: ${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

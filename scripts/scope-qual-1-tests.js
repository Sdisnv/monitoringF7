#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const logic = require('../assets/js/scope-ui-logic.js');
const map = require('../assets/js/scope-oi-map.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

(async () => {
  await record('Mapping OI DPS/DAP uniquement', async () => {
    assert.deepStrictEqual(map.mapOi('DPS G1'), { domaineCode: 'DPS', niveauCode: 'G1' });
    assert.deepStrictEqual(map.mapOi('DAP Y4'), { domaineCode: 'DAP', niveauCode: 'Y4' });
    assert.strictEqual(map.mapOi('FOBA 1'), null);
    assert.strictEqual(map.mapOi('PR G1'), null);
    assert.strictEqual(map.mapOi('AUTO VL'), null);
    assert.strictEqual(map.DATE_BASCULE_SCOPE, '2026-08-19');
  });

  await record('Dry-run DAP Y4 — 16 personnes, 0 OI inconnu', async () => {
    const text = fs.readFileSync(path.join(ROOT, 'assets/data/PersonnelSDIS.csv'), 'utf8');
    const parsed = map.parsePersonnelCsv(text);
    assert.strictEqual(parsed.separator, ';');
    assert.ok(parsed.header.includes('OI'));
    const plan = map.planImport(parsed.rows, { oi: 'DAP Y4', dateDebut: map.DATE_BASCULE_SCOPE });
    assert.strictEqual(plan.personnesACreer, 16);
    assert.strictEqual(plan.affectationsACreer, 16);
    assert.strictEqual(plan.erreurs.length, 0);
    assert.strictEqual(plan.doublons.length, 0);
    assert.deepStrictEqual(plan.oiInconnus, {});
    assert.ok(plan.personnes.every((p) => p.domaineCode === 'DAP' && p.niveauCode === 'Y4'));
    assert.ok(plan.personnes.every((p) => p.dateDebut === '2026-08-19'));
    assert.ok(plan.personnes.every((p) => p.source === 'CSV_IMPORT'));
  });

  await record('CLI dry-run n’écrit pas', async () => {
    const run = spawnSync('node', ['scripts/scope-import-personnel.js', '--dry-run', '--oi', 'DAP Y4'], {
      cwd: ROOT, encoding: 'utf8'
    });
    assert.strictEqual(run.status, 0, run.stderr);
    const json = JSON.parse(run.stdout);
    assert.strictEqual(json.dryRun, true);
    assert.strictEqual(json.personnesACreer, 16);
    assert.ok(run.stderr.includes('aucune écriture'));
  });

  await record('Mode live exige confirmation explicite', async () => {
    assert.strictEqual(logic.resolveClientMode({ search: '' }), 'demo');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=live' }), 'gate');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=live', sessionLive: true }), 'live');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=demo', sessionLive: true }), 'demo');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('scope-confirm-live'));
    assert.ok(ui.includes('scope-live-confirmed'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('.scope-banner.live'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

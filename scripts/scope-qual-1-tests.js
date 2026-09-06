#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
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
    const text = fs.readFileSync(path.join(ROOT, 'tests/fixtures/personnel-dap-y4-anonymized.csv'), 'utf8');
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

  await record('Annulation TEST exclut le taux officiel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const personne = await repo.insertPersonne({ nip: 'AN001', nom: 'Annul', prenom: 'Test' });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: g1.cible_id, date_debut: '2026-08-19' });
    const { evenement } = await service.createEvenement({
      date: '2026-08-19', domaineCode: 'DPS', libelle: 'TEST SCOPE — qualification pilote', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(evenement.evenement_id, {
      baseVersion: 2,
      participations: [{ personneId: personne.personne_id, statut: 'PRESENT' }]
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' });
    const cancelled = await service.annulerEvenement(evenement.evenement_id, { baseVersion: 4, motif: 'Qualification SCOPE' }, { sub: 'test' });
    assert.strictEqual(cancelled.evenement.statut, 'ANNULE');
    const taux = await service.tauxEvenement(evenement.evenement_id);
    assert.strictEqual(taux.officiel, false);
    const fiche = await service.lireEvenement(evenement.evenement_id);
    assert.strictEqual(fiche.attendus.length, 1);
    assert.strictEqual(fiche.participations.length, 1);
  });

  await record('Auth stricte : aucun mode DEMO ni confirmation locale', async () => {
    assert.strictEqual(logic.resolveClientMode({ search: '' }), 'live');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=live' }), 'live');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=live', sessionLive: true }), 'live');
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=demo', sessionLive: true }), 'live');
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(!html.includes('scope-demo.js'));
    assert.ok(!ui.includes('ScopeDemo'));
    assert.ok(!ui.includes('createDemoClient'));
    assert.ok(!ui.includes('scope-confirm-live'));
    assert.ok(!ui.includes('scope-stay-demo'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('.scope-login-v1'));
    assert.ok(!css.includes('.scope-banner.demo'));
  });

  await record('Live Okta : cookie navigateur, pas de JWT injecté', async () => {
    const href = logic.oktaLoginHref('/scope.html');
    assert.ok(href.startsWith('/auth/oidc/start?returnTo='));
    assert.ok(href.includes(encodeURIComponent('/scope.html')));
    assert.strictEqual(logic.oktaLoginHref('https://evil.example/'), '/auth/oidc/start?returnTo=%2Fscope.html');
    const info = logic.friendlyError({ status: 401, error: 'unauthorized' });
    assert.strictEqual(info.okta, true);
    const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    assert.ok(api.includes("credentials: 'same-origin'"));
    assert.ok(api.includes("fetchWithAuthRetry('/auth/me'"));
    assert.ok(!api.includes('setAccessToken('));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('scope-okta-login'));
    assert.ok(ui.includes("'/auth/logout?returnTo=' + encodeURIComponent('/scope.html')"));
    assert.ok(ui.includes('authError'));
    assert.ok(ui.includes('sessionMe'));
    const oidc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_oidc-utils.js'), 'utf8');
    assert.ok(oidc.includes('function queryParams'));
    assert.ok(oidc.includes('function oidcErrorReason'));
    const cb = fs.readFileSync(path.join(ROOT, 'netlify/functions/auth-oidc-callback.js'), 'utf8');
    assert.ok(cb.includes('oidc_callback_failed'));
    assert.ok(cb.includes('reason='));
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

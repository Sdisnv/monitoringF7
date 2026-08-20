#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

(async () => {
  const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
  const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');

  await record('sidebar présente, ancienne nav horizontale retirée', async () => {
    assert.ok(ui.includes('scope-sidebar'));
    assert.ok(ui.includes('aria-label="Navigation principale"'));
    assert.ok(!ui.includes('scope-nav-inner'));
    assert.ok(!ui.includes('const navButtons'));
    assert.ok(!ui.includes('id="scope-header-menu"'));
    assert.ok(css.includes('.scope-sidebar'));
    assert.ok(css.includes('--scope-sidebar:'));
  });

  await record('navigation domaines depuis le référentiel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const arbre = logic.normalizeNavArbre(refs.arbre, refs.domaines, refs.cibles);
    const nav = logic.buildSidebarNav(arbre, { screen: 'vue', nav: 'vue' });
    const codes = nav.domains.map((d) => d.id);
    assert.ok(codes.includes('FOBA'));
    assert.ok(codes.includes('FOCA'));
    assert.ok(codes.includes('DPS'));
    assert.ok(codes.includes('DAP'));
    assert.ok(codes.includes('FOSPEC'));
    assert.ok(codes.includes('JSP'));
    assert.ok(!codes.includes('PR'));
    assert.ok(!codes.includes('AUTO'));
  });

  await record('FOSPEC → Protection respiratoire / AUTO', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const nav = logic.buildSidebarNav(refs.arbre, { screen: 'vue', domaine: 'FOSPEC' });
    const fospec = nav.domains.find((d) => d.id === 'FOSPEC');
    assert.ok(fospec);
    assert.ok(fospec.expanded);
    const labels = fospec.children.map((c) => c.label);
    assert.ok(labels.includes('Protection respiratoire'));
    assert.ok(labels.includes('AUTO'));
    assert.ok(fospec.children.some((c) => c.id === 'PR' && c.href === '#/vue/PR'));
    assert.ok(fospec.children.some((c) => c.id === 'AUTO' && c.href === '#/vue/AUTO'));
  });

  await record('navigation OI DPS / DAP sans 25 cibles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const nav = logic.buildSidebarNav(refs.arbre, { screen: 'vue', domaine: 'DAP', cible: 'Y4' });
    const dap = nav.domains.find((d) => d.id === 'DAP');
    const dps = nav.domains.find((d) => d.id === 'DPS');
    assert.deepStrictEqual(dap.children.map((c) => c.label), ['Y1', 'Y2', 'Y3', 'Y4']);
    assert.deepStrictEqual(dps.children.map((c) => c.label).sort(), ['B1', 'B2', 'C1', 'G1']);
    const allChildren = nav.domains.reduce((n, d) => n + d.children.length, 0);
    assert.ok(allChildren < 25);
    assert.ok(dap.expanded);
  });

  await record('sélecteurs période / année', async () => {
    assert.ok(ui.includes("periodSelect('scope-preset'"));
    assert.ok(ui.includes("periodSelect('scope-year'"));
    assert.ok(ui.includes('scope-select-control'));
    assert.ok(css.includes('.scope-select'));
    assert.ok(css.includes('color-scheme: dark'));
    assert.ok(!css.includes("url(\"data:image/svg+xml"));
  });

  await record('logo SCOPE taille validée + logo SDIS officiel', async () => {
    assert.ok(ui.includes('assets/img/logo-scope-blanc.png'));
    assert.ok(ui.includes('class="scope-logo"'));
    assert.match(css, /height:\s*68px/);
    assert.ok(css.includes('object-fit: contain'));
    assert.ok(ui.includes('assets/img/LogoSDISblanc.png'));
    assert.ok(ui.includes('SDIS régional du Nord vaudois'));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/LogoSDISblanc.png')));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/logo-scope-blanc.png')));
  });

  await record('dashboard sans calcul de taux frontend + ALERTS-1', async () => {
    assert.ok(!ui.includes('computeTaux'));
    assert.ok(!ui.includes('officialFromQuantitatif'));
    assert.ok(ui.includes('client.dashboard'));
    assert.ok(ui.includes('À traiter'));
    assert.ok(ui.includes('dash.alerts'));
    assert.ok(ui.includes('scope-dash-split'));
    assert.ok(css.includes('.scope-dash-split'));
  });

  await record('graphique hauteur maîtrisée et palette métier', async () => {
    const empty = logic.participationChartLayout([], []);
    const legacy = logic.participationChartLayout([], [{ date: '2026-03-17', tauxLegacy: 80 }]);
    const sparse = logic.participationChartLayout([{ month: '2026-03', percentage: 80 }], []);
    const full = logic.participationChartLayout([
      { month: '2026-01', percentage: 80 },
      { month: '2026-02', percentage: 82 },
      { month: '2026-03', percentage: 84 }
    ], []);
    assert.strictEqual(empty.mode, 'empty');
    assert.ok(empty.height < sparse.height);
    assert.ok(legacy.height < full.height);
    assert.ok(full.height <= 188);
    const svg = logic.participationChartSvg(
      [{ month: '2026-01', percentage: 80, thresholdPct: 85 }, { month: '2026-02', percentage: 90, thresholdPct: 85 }],
      [{ date: '2026-01-15', tauxLegacy: 70 }]
    );
    assert.ok(svg.includes('#171C8F'));
    assert.ok(svg.includes('#FFA300'));
    assert.ok(svg.includes('#54585A'));
    assert.ok(css.includes('max-height: 188px'));
    assert.ok(logicSrc.includes("officiel: '#171C8F'"));
  });

  await record('responsive structure 1200 / 1024 / 768', async () => {
    assert.ok(css.includes('--scope-max: 1340px'));
    assert.ok(css.includes('@media (max-width: 1200px)'));
    assert.ok(css.includes('@media (max-width: 1100px)'));
    assert.ok(css.includes('@media (max-width: 1024px)'));
    assert.ok(css.includes('@media (max-width: 768px)'));
    assert.ok(css.includes('overflow-x: hidden'));
    assert.ok(!/min-width:\s*980px/.test(css));
    assert.ok(css.includes('transform: translateX(-105%)'));
  });

  await record('accessibilité menu + hash rapports', async () => {
    assert.ok(ui.includes('aria-expanded'));
    assert.ok(ui.includes('aria-current="page"'));
    assert.ok(ui.includes("e.key === 'Escape'"));
    assert.ok(ui.includes('scope-nav-backdrop'));
    assert.strictEqual(logic.parseHash('#/personnel').screen, 'personnel');
    assert.strictEqual(logic.parseHash('#/personnel/abc').screen, 'personne');
    assert.strictEqual(logic.parseHash('#/personnel/abc').personneId, 'abc');
    assert.strictEqual(logic.parseHash('#/personnel/abc').id, undefined);
    assert.strictEqual(logic.parseHash('#/vue/PR').domaine, 'PR');
    assert.strictEqual(logic.parseHash('#/vue/DAP/Y4').cible, 'Y4');
  });

  await record('identité NIP / import exercices hors onglet principal', async () => {
    assert.ok(ui.includes('NIP'));
    assert.ok(ui.includes('PERSON-1'));
    assert.ok(ui.includes('Importer un programme CSV'));
    assert.ok(!ui.includes('data-nav="import"'));
    assert.ok(ui.includes('REPORT-1'));
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

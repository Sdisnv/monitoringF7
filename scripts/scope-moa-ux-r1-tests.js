#!/usr/bin/env node
// SCOPE-MOA-UX-R1 — garde-fous coque applicative, navigation et accueil.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logicSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const toml = fs.readFileSync(path.join(ROOT, 'netlify.scope.toml'), 'utf8');

const L = require(path.join(ROOT, 'assets/js/scope-ui-logic.js'));
const sampleArbre = [
  { code: 'FOBA', libelleAffiche: 'FOBA', cibles: [{ domaineCode: 'FOBA', niveauCode: '1' }, { domaineCode: 'FOBA', niveauCode: '2' }] },
  { code: 'FOCA', libelleAffiche: 'FOCA', cibles: [{ domaineCode: 'FOCA', niveauCode: 'I' }, { domaineCode: 'FOCA', niveauCode: 'III_IV' }] },
  { code: 'PR', libelleAffiche: 'PAPR', cibles: [] },
  { code: 'DAP', libelleAffiche: 'DAP', cibles: [{ domaineCode: 'DAP', niveauCode: 'Y1' }] },
  { code: 'GEN', libelleAffiche: 'Général', cibles: [{ domaineCode: 'GEN', niveauCode: 'GEN' }] }
];

let passed = 0;
async function record(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

(async () => {
  await record('01 — accueil route par défaut', async () => {
    assert.strictEqual(L.parseHash('').screen, 'accueil');
    assert.strictEqual(L.parseHash('#/accueil').screen, 'accueil');
  });

  await record('02 — hash inconnu revient à accueil', async () => {
    assert.strictEqual(L.parseHash('#/ancien-module').screen, 'accueil');
  });

  await record('03 — événements remplace exercice en navigation visible', async () => {
    const nav = L.buildSidebarNav(sampleArbre, {});
    assert.ok(nav.primary.some((item) => item.label === 'Événements' && item.href === '#/evenements'));
    assert.ok(!nav.primary.some((item) => item.label === 'Exercices'));
  });

  await record('04 — alias technique exercices conservé', async () => {
    assert.strictEqual(L.parseHash('#/exercices').screen, 'liste');
    assert.strictEqual(L.parseHash('#/evenements').screen, 'liste');
  });

  await record('05 — import événements sous réglages', async () => {
    assert.strictEqual(L.parseHash('#/reglages/import-evenements').screen, 'import-evenements');
    assert.strictEqual(L.parseHash('#/reglages/import-evenements').nav, 'reglages');
  });

  await record('06 — ancien hash import redirigé logiquement', async () => {
    assert.strictEqual(L.parseHash('#/exercices/import').screen, 'import-evenements');
  });

  await record('07 — import personnel sous réglages', async () => {
    assert.strictEqual(L.parseHash('#/reglages/import-personnel').screen, 'import-personnel');
  });

  await record('08 — utilisateurs sous réglages', async () => {
    assert.strictEqual(L.parseHash('#/reglages/utilisateurs').screen, 'utilisateurs');
  });

  await record('09 — administration sous réglages', async () => {
    assert.strictEqual(L.parseHash('#/reglages/administration').screen, 'administration');
  });

  await record('10 — à propos institutionnel disponible', async () => {
    assert.strictEqual(L.parseHash('#/apropos').screen, 'apropos');
    assert.ok(ui.includes('À propos de SCOPE'));
  });

  await record('11 — drawer fermé par défaut', async () => {
    assert.ok(ui.includes('state.navOpen ?'));
    assert.ok(css.includes('transform: translateX(-105%)'));
    assert.ok(css.includes('.scope-app.is-nav-open .scope-sidebar'));
  });

  await record('12 — menu header ouvre le drawer', async () => {
    assert.ok(ui.includes('scope-nav-toggle'));
    assert.ok(ui.includes('aria-controls="scope-sidebar"'));
    assert.ok(ui.includes('state.navOpen = !state.navOpen'));
  });

  await record('13 — fermeture par croix', async () => {
    assert.ok(ui.includes('scope-nav-close'));
    assert.ok(ui.includes('Fermer la navigation'));
  });

  await record('14 — fermeture par overlay', async () => {
    assert.ok(ui.includes('scope-nav-backdrop'));
    assert.ok(ui.includes("getElementById('scope-nav-backdrop')"));
  });

  await record('15 — fermeture clavier Escape', async () => {
    assert.ok(ui.includes("key === 'Escape'"));
  });

  await record('16 — groupes pleine ligne accessibles', async () => {
    assert.ok(ui.includes('scope-nav-group-head'));
    assert.ok(ui.includes('data-nav-group'));
    assert.ok(ui.includes('aria-expanded'));
  });

  await record('17 — groupes domaines FOBA FOCA PAPR DAP Général', async () => {
    const labels = L.buildSidebarNav(sampleArbre, {}).domains.map((d) => d.label);
    ['FOBA', 'FOCA', 'PAPR', 'DAP', 'Général'].forEach((label) => assert.ok(labels.includes(label)));
  });

  await record('18 — libellés niveaux FOBA lisibles', async () => {
    assert.strictEqual(L.niveauAffiche('FOBA', '1'), 'FOBA 1');
    assert.strictEqual(L.niveauAffiche('FOBA', '2'), 'FOBA 2');
  });

  await record('19 — libellés niveaux FOCA lisibles', async () => {
    assert.strictEqual(L.niveauAffiche('FOCA', 'I'), 'Échelon I');
    assert.strictEqual(L.niveauAffiche('FOCA', 'III_IV'), 'Échelons III et IV');
  });

  await record('20 — libellés PAPR et Général', async () => {
    assert.strictEqual(L.domaineAffiche('PR'), 'PAPR');
    assert.strictEqual(L.niveauAffiche('GEN', 'GEN'), 'Général');
  });

  await record('21 — accueil centre de pilotage', async () => {
    assert.ok(ui.includes('Centre de pilotage'));
    assert.ok(ui.includes('Synthèse de l’activité'));
  });

  await record('22 — statistiques distinctes des rapports', async () => {
    assert.strictEqual(L.parseHash('#/statistiques').screen, 'statistiques');
    assert.ok(ui.includes('renderStatistiques'));
    assert.ok(ui.includes('Statistiques'));
  });

  await record('23 — permutations absentes hors DAP', async () => {
    assert.strictEqual(L.shouldRenderPermutations('FOBA', { emptyReason: 'HORS_DAP' }), false);
    assert.strictEqual(L.shouldRenderPermutations('DAP', { emptyReason: null }), true);
  });

  await record('24 — sélecteurs période hors header', async () => {
    assert.ok(ui.includes('scope-period-context'));
    assert.ok(!/scope-header[\s\S]{0,260}scope-select-control/.test(ui));
  });

  await record('25 — bascule qualification conservée hors bandeau principal', async () => {
    assert.ok(ui.includes('scope-qual-toggle'));
    assert.ok(ui.includes('scope-include-qual'));
    assert.ok(!/function headerHtml[\s\S]*scope-qual-toggle/.test(ui));
  });

  await record('26 — logo SCOPE agrandi', async () => {
    assert.ok(css.includes('height: 48px'));
    assert.ok(ui.includes('assets/img/logo-scope-blanc.png'));
  });

  await record('27 — logo SDIS noir sur fond blanc', async () => {
    assert.ok(ui.includes('assets/img/LogoSDISseulnoir.png'));
    assert.ok(css.includes('background: #fff'));
    assert.ok(toml.includes('assets/img/LogoSDISseulnoir.png'));
  });

  await record('28 — pas de sidebar permanente', async () => {
    assert.ok(!css.includes('--scope-sidebar'));
    assert.ok(!css.includes('grid-template-columns: var(--scope-sidebar)'));
  });

  await record('29 — layout responsive drawer', async () => {
    assert.ok(css.includes('max-width: 88vw'));
    assert.ok(css.includes('@media (max-width: 800px)'));
  });

  await record('30 — pages admin honnêtes sans pseudo-console', async () => {
    assert.ok(ui.includes('identité institutionnelle'));
    assert.ok(ui.includes('gestion utilisateur locale'));
    assert.ok(ui.includes('pseudo-administration'));
  });

  await record('31 — runtime SCOPE autonome préservé', async () => {
    assert.ok(html.includes('assets/js/scope-ui.js'));
    assert.ok(logicSource.includes('root.ScopeUiLogic'));
  });

  console.log(`SCOPE-MOA-UX-R1: ${passed} PASS`);
})();

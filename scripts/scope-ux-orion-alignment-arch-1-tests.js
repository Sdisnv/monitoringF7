#!/usr/bin/env node
// SCOPE-UX-ORION-ALIGNMENT-ARCH-1 — fondations UX/CSS ORION.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const docPath = path.join(ROOT, 'docs/SCOPE_UX_ORION_ALIGNMENT_ARCH_1.md');
const doc = fs.readFileSync(docPath, 'utf8');

let passed = 0;
async function record(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

(async () => {
  await record('01 — document architecture existe', async () => {
    assert.ok(fs.existsSync(docPath));
    ['Cartographie UX actuelle', 'Incoherences CSS principales', 'Design tokens', 'Header', 'Pagination', 'Prochains lots proposes']
      .forEach((needle) => assert.ok(doc.includes(needle), needle));
  });

  await record('02 — bandeaux techniques LIVE/DEMO supprimes', async () => {
    assert.ok(!ui.includes('Mode LIVE — PostgreSQL Monitoring'));
    assert.ok(!ui.includes('Mode démonstration — aucune écriture'));
    assert.ok(!ui.includes('Passer en mode LIVE'));
    assert.ok(!ui.includes('Connexion live demandée'));
    assert.ok(!ui.includes('Session Okta requise'));
  });

  await record('03 — header sans indicateur de mode visible', async () => {
    assert.ok(!ui.includes('scope-mode-pill">${mode'));
    assert.ok(ui.includes('<header class="scope-header">'));
    assert.ok(ui.includes('scope-user-avatar'));
    assert.ok(ui.includes('scope-include-qual'));
  });

  await record('04 — messages connexion en langage utilisateur', async () => {
    assert.ok(ui.includes('Connexion requise'));
    assert.ok(ui.includes('Connectez-vous avec votre compte institutionnel'));
    assert.ok(ui.includes('La session SCOPE n’a pas pu être ouverte'));
    assert.ok(!ui.includes('Aucun jeton'));
  });

  await record('05 — seuil recherche nominative commun 3 caracteres', async () => {
    assert.ok(ui.includes('const SCOPE_SEARCH_MIN_CHARS = 3'));
    assert.ok(ui.includes('const SCOPE_SEARCH_DEBOUNCE_MS = 280'));
    assert.ok(ui.includes('q.length < SCOPE_SEARCH_MIN_CHARS'));
    assert.ok(ui.includes('SCOPE_SEARCH_DEBOUNCE_MS'));
  });

  await record('06 — tokens ORION/SCOPE poses', async () => {
    ['--scope-blue', '--scope-yellow', '--scope-green', '--scope-gray-50', '--scope-control-h-compact', '--scope-space-6', '--scope-z-modal', '--scope-focus-ring']
      .forEach((needle) => assert.ok(css.includes(needle), needle));
  });

  await record('07 — composants fondation poses', async () => {
    ['.scope-ui-card', '.scope-empty-state', '.scope-info-box', '.scope-loader', '.scope-pagination', '.scope-page-size', '.scope-page-status']
      .forEach((needle) => assert.ok(css.includes(needle), needle));
  });

  await record('08 — qualification conservee mais documentee', async () => {
    assert.ok(ui.includes('scope-include-qual'));
    assert.ok(doc.includes('includeQualification'));
    assert.ok(doc.includes('deplacer cette bascule'));
  });

  console.log(`SCOPE-UX-ORION-ALIGNMENT-ARCH-1: ${passed} PASS`);
})();

#!/usr/bin/env node
// UX-DS-1 — fondations visuelles SCOPE / famille ORION (structure only).
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');

const start = css.indexOf('/* === UX-DS-1 foundations');
const end = css.indexOf('/* === /UX-DS-1 ===');
assert.ok(start >= 0 && end > start, 'bloc UX-DS-1 manquant');
const ds = css.slice(start, end);

function token(name) {
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}:\\s*([^;]+);`);
  const m = css.match(re);
  assert.ok(m, `token ${name} manquant`);
  return m[1].trim();
}

function decl(block, selector) {
  const idx = block.indexOf(selector);
  assert.ok(idx >= 0, `sélecteur ${selector} manquant`);
  const open = block.indexOf('{', idx);
  const close = block.indexOf('}', open);
  return block.slice(open, close + 1);
}

let passed = 0;
function record(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

record('01 — tokens couleurs / rayons / espaces / hauteurs / typo / focus', () => {
  assert.strictEqual(token('--scope-bg'), '#f4f5f8');
  assert.strictEqual(token('--scope-surface'), '#ffffff');
  assert.strictEqual(token('--scope-border'), '#e3e7ec');
  assert.strictEqual(token('--scope-text'), '#1f2730');
  assert.ok(token('--scope-muted'));
  assert.strictEqual(token('--scope-red'), '#DE000A');
  assert.strictEqual(token('--scope-red-hover'), '#8c000b');
  assert.strictEqual(token('--scope-navy'), '#171C8F');
  assert.ok(token('--scope-navy-soft').startsWith('#'));
  assert.ok(token('--scope-warning'));
  assert.ok(token('--scope-warning-soft'));
  assert.ok(token('--scope-danger'));
  assert.ok(token('--scope-success'));
  assert.strictEqual(token('--scope-radius-xs'), '3px');
  assert.strictEqual(token('--scope-radius-sm'), '4px');
  assert.strictEqual(token('--scope-radius-modal'), '6px');
  ['--scope-space-1', '--scope-space-2', '--scope-space-3', '--scope-space-8', '--scope-space-12', '--scope-space-16', '--scope-space-20', '--scope-space-24'].forEach((name) => {
    assert.ok(token(name).endsWith('px'));
  });
  assert.strictEqual(token('--scope-space-1'), '4px');
  assert.strictEqual(token('--scope-space-8'), '8px');
  assert.strictEqual(token('--scope-h-compact'), '28px');
  assert.strictEqual(token('--scope-h-field-compact'), '32px');
  assert.strictEqual(token('--scope-h-control'), '40px');
  assert.strictEqual(token('--scope-type-h1'), '22px');
  assert.strictEqual(token('--scope-type-h2'), '16px');
  assert.strictEqual(token('--scope-type-h3'), '13px');
  assert.strictEqual(token('--scope-type-body'), '14px');
  assert.ok(['12px', '13px'].includes(token('--scope-type-secondary')));
  assert.strictEqual(token('--scope-type-label'), '11px');
  assert.ok(token('--scope-focus-ring').includes('2px solid'));
  assert.ok(css.includes('--scope-focus-offset'));
});

record('02 — boutons unifiés, rayon 3, compact 28, pas de 999', () => {
  const btn = decl(css, '\n.scope-btn {');
  assert.ok(btn.includes('var(--scope-radius-xs)'));
  assert.ok(btn.includes('var(--scope-h-control)'));
  ['scope-btn-primary', 'scope-btn-secondary', 'scope-btn-tertiary', 'scope-btn-danger', 'scope-btn-compact', 'scope-icon-btn'].forEach((cls) => {
    assert.ok(css.includes(`.${cls}`), cls);
  });
  const compact = decl(ds, '.scope-btn-compact');
  assert.ok(compact.includes('var(--scope-h-compact)'));
  assert.ok(compact.includes('var(--scope-radius-xs)'));
  assert.ok(!/\.scope-btn[^{]*\{[^}]*999px/.test(ds));
  assert.ok(!ds.includes('border-radius: 999px'));
  assert.ok(!ds.includes('border-radius: 999'));
});

record('03 — champs page 40 / compact 32, même chrome', () => {
  const field = decl(css, '.scope-field input,');
  assert.ok(field.includes('var(--scope-h-control)'));
  assert.ok(field.includes('var(--scope-radius-xs)'));
  assert.ok(field.includes('var(--scope-border)'));
  const compact = decl(ds, '.scope-field.is-compact input,');
  assert.ok(compact.includes('var(--scope-h-field-compact)'));
  assert.ok(css.includes('input[type="search"]'));
  assert.ok(css.includes('input[type="date"]'));
  assert.ok(css.includes('.scope-field textarea'));
});

record('04 — table base commune + scroll horizontal, pas de suppression table-as-card', () => {
  assert.ok(css.includes('.scope-table-scroll'));
  assert.ok(css.includes('overflow-x: auto'));
  const table = decl(css, '\n.scope-table {');
  assert.ok(table.includes('border-collapse: collapse'));
  assert.ok(css.includes('--scope-table-head-bg'));
  assert.ok(css.includes('--scope-type-label'));
  assert.ok(css.includes('--scope-table-zebra'));
  assert.ok(css.includes('.scope-table thead { display: none; }'));
  assert.ok(css.includes('.scope-person-table tbody tr:nth-child(even)'));
});

record('05 — toolbar / segmented jointif / status control / kpi strip / badges', () => {
  const toolbar = decl(css, '\n.scope-toolbar {');
  assert.ok(toolbar.includes('var(--scope-space-8)'));
  assert.ok(toolbar.includes('flex-wrap: wrap'));
  const seg = decl(ds, '\n.scope-segmented {');
  assert.ok(seg.includes('var(--scope-h-compact)'));
  assert.ok(seg.includes('var(--scope-radius-xs)'));
  assert.ok(seg.includes('overflow: hidden'));
  const item = decl(ds, '\n.scope-segmented-item {');
  assert.ok(item.includes('border-radius: 0'));
  assert.ok(!item.includes('999px'));
  ['is-present', 'is-excused', 'is-absent', 'is-exempt', 'is-permutation'].forEach((mod) => {
    assert.ok(ds.includes(`.scope-status-control.${mod}`));
  });
  const status = decl(ds, '\n.scope-status-control {');
  assert.ok(status.includes('var(--scope-radius-xs)'));
  assert.ok(!status.includes('999px'));
  assert.ok(ds.includes('.scope-kpi-strip'));
  const badge = decl(css, '\n.scope-badge {');
  assert.ok(badge.includes('var(--scope-radius-xs)'));
  assert.ok(!badge.includes('999px'));
});

record('06 — modal 6px, menu 4px, focus visible commun', () => {
  assert.ok(ds.includes('.scope-modal-overlay'));
  assert.ok(ds.includes('.scope-modal-header'));
  assert.ok(ds.includes('.scope-modal-body'));
  assert.ok(ds.includes('.scope-modal-footer'));
  const dialog = decl(ds, '\n.scope-modal-dialog {');
  assert.ok(dialog.includes('var(--scope-radius-modal)'));
  assert.ok(css.includes('--scope-modal-s: 480px'));
  assert.ok(css.includes('--scope-modal-m: 640px'));
  assert.ok(css.includes('--scope-modal-l: 800px'));
  const menu = decl(css, '\n.scope-row-more-menu {');
  assert.ok(menu.includes('var(--scope-radius-sm)'));
  assert.ok(/min-width:\s*1(8|9)[0-9]px/.test(menu));
  const menuItem = decl(css, '\n.scope-row-more-menu button {');
  assert.ok(menuItem.includes('var(--scope-h-field-compact)'));
  assert.ok(css.includes('outline: var(--scope-focus-ring)'));
  assert.ok(ds.includes('.scope-btn:focus-visible'));
});

record('07 — aucun 999 dans les nouveaux composants, avatar circulaire conservé', () => {
  assert.ok(!/scope-btn[^{]*\{[^}]*border-radius:\s*999/.test(ds));
  assert.ok(!/scope-segmented[^{]*\{[^}]*999/.test(ds));
  assert.ok(!/scope-status-control[^{]*\{[^}]*999/.test(ds));
  assert.ok(!/scope-badge[^{]*\{[^}]*999/.test(ds));
  assert.ok(!/scope-icon-btn[^{]*\{[^}]*999/.test(ds));
  assert.ok(css.includes('.scope-user-avatar'));
  assert.ok(css.includes('border-radius: 50%'));
});

record('08 — primitives DS disponibles sans nouvelle saisie présence', () => {
  assert.ok(css.includes('.scope-segmented-item'));
  assert.ok(css.includes('.scope-status-control'));
  assert.ok(css.includes('.scope-kpi-strip'));
  assert.ok(ui.includes('scope-row-more-menu'));
  assert.ok(!ds.includes('border-radius: 999px'));
});

record('09 — pas de logique métier dans le lot DS', () => {
  assert.ok(html.includes('assets/css/scope.css?v=scope-ds-1') || html.includes('assets/css/scope.css?v=scope-ux-event-1'));
  assert.ok(pkg.includes('scope-ds-1-tests.js'));
  assert.ok(!ui.includes('function computeTaux'));
});

console.log(`SCOPE-DS-1: ${passed} PASS`);

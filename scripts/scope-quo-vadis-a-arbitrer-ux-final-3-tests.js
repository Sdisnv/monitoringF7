#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const packageJson = read('package.json');
const logicSrc = read('assets/js/scope-ui-logic.js');

const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const domainsFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerDomainsTable('), arbitrer.indexOf('function qvRenderArbitrerDetail('));
const nestedFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerGroupTable('), arbitrer.indexOf('function qvRenderArbitrerDomainsTable('));
const detailFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerDetail('));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));
const finalCss = css.slice(css.indexOf('/* scope-quo-vadis-a-arbitrer-ux-final-1 */'), css.indexOf('.qv-definition-list'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(!/<th[^>]*>Action<\/th>/.test(domainsFn));
assert.ok(!/qvArbitrerAction/.test(domainsFn));
assert.ok(!/>Consulter</.test(domainsFn));
assert.ok(!/Consulter<span class="qv-arbitrer-action-chevron"/.test(domainsFn));
assert.ok(/Consulter la fiche/.test(arbitrer));
assert.ok(/qvArbitrerAction\(group\)/.test(nestedFn));
assert.ok(/qvArbitrerAction\(group\)/.test(detailFn));
assert.ok(/class="qv-col-action"/.test(nestedFn));
assert.ok(/class="qv-col-action"/.test(detailFn));

assert.ok(/qvArbitrerPeriodHtml/.test(detailFn));
assert.ok(/split\(' → '\)/.test(arbitrer));
const dateCol = (L.qvArbitrerSortColumns() || []).find((column) => column.key === 'date');
assert.strictEqual(dateCol.value({ firstStartsAt: '2027-05-06', periodLabel: '06.05.2027 → 17.06.2027' }), '2027-05-06');

['Code cours', 'Activité', 'Stat.Com', 'Date', 'Horaire', 'OI', 'Public cible', 'Responsable', 'Lieu', 'État'].forEach((label) => {
  assert.ok(detailFn.includes(`'${label}'`), `colonne manquante: ${label}`);
});
assert.ok(/Action/.test(detailFn));

assert.ok(!/Bon à savoir/.test(arbitrer));
assert.ok(!/Ordre d’affichage des domaines/.test(arbitrer));
assert.ok(!/Tri des groupes/.test(arbitrer));
assert.ok(!/Voir \/ arbitrer/.test(arbitrer));
assert.ok(!/Voir les activités/.test(arbitrer));
assert.ok(!/scope-pill/.test(arbitrer));

const wrapCss = finalCss.slice(finalCss.indexOf('.qv-arbitrer-table-wrap'));
assert.ok(/overflow-x:\s*auto/.test(wrapCss));
assert.ok(/min-width:\s*1180px/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-detail-table'))));
assert.ok(/table-layout:\s*auto/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-detail-table'))));
assert.ok(!/table-layout:\s*fixed/.test(finalCss));
assert.ok(/min-width:\s*10rem/.test(finalCss));
assert.ok(/min-width:\s*11\.5rem/.test(finalCss));
assert.ok(/min-width:\s*8rem/.test(finalCss));
assert.ok(!/position:\s*sticky/.test(finalCss));
assert.ok(/grid-column:\s*1\s*\/\s*-1/.test(finalCss.slice(finalCss.indexOf('.qv-agenda-filters.qv-arbitrer-filters'))));
assert.ok(/overflow-x:\s*hidden/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-view'))));
assert.ok(/white-space:\s*nowrap/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-action'))));
assert.ok(/overflow:\s*visible/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-action'))));
assert.ok(/text-overflow:\s*unset/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-action'))));
assert.ok(!/\.qv-arbitrer-action[^{]*\{[^}]*text-overflow:\s*ellipsis/.test(finalCss.replace(/\n/g, ' ')));
assert.ok(/text-decoration:\s*none/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-view .scope-text-action:hover'))));
assert.ok(/@media \(max-width: 1280px\)/.test(finalCss));
assert.ok(/@media \(max-width: 1180px\)/.test(finalCss));
assert.ok(/@media \(max-width: 900px\)/.test(finalCss));
assert.ok(/@media \(max-width: 800px\)/.test(css));
assert.ok(/\.qv-arbitrer-table \{[\s\S]*display:\s*table/.test(css.slice(css.indexOf('@media (max-width: 800px)'))));

assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));
assert.ok(/scopeStateHtml/.test(arbitrer));
assert.ok(/qv-arbitrer-legend/.test(arbitrer));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
const headLogicSha = execFileSync('git', ['rev-parse', 'HEAD:assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(logicSha, headLogicSha, 'scope-ui-logic.js ne doit pas changer');

assert.ok(/scope-quo-vadis-a-arbitrer-ux-3-final-3/.test(html));
assert.ok(/test:scope-quo-vadis-a-arbitrer-ux-final-3/.test(packageJson));
assert.ok(!/netlify deploy/.test(arbitrer));

console.log('scope-quo-vadis-a-arbitrer-ux-final-3-tests: ok');

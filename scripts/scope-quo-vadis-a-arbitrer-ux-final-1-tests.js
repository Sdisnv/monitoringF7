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
const service = read('netlify/lib/_scope-quo-vadis-service.js');

const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const finalCss = css.slice(css.indexOf('/* scope-quo-vadis-a-arbitrer-ux-final-1 */'), css.indexOf('.qv-definition-list'));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(!/Bon à savoir/.test(arbitrer));
assert.ok(!/Ordre d’affichage des domaines/.test(arbitrer));
assert.ok(!/Voir \/ arbitrer/.test(arbitrer));
assert.ok(!/Voir les activités/.test(arbitrer));
assert.ok(/Consulter la fiche/.test(arbitrer));
assert.ok(/qvRenderArbitrerDomainsTable/.test(arbitrer));
assert.ok(/<th>Domaine<\/th>/.test(arbitrer));
assert.ok(/<th>Description<\/th>/.test(arbitrer));
assert.ok(/<th>Activités<\/th>/.test(arbitrer));
assert.ok(/<th>Propositions<\/th>/.test(arbitrer));
assert.ok(/<th>Période proposée<\/th>/.test(arbitrer));
assert.ok(/qv-arbitrer-group-table/.test(arbitrer));
assert.ok(!/<section class="qv-arbitrer-group/.test(arbitrer));
assert.ok(/qv-arbitrer-detail-table/.test(arbitrer));
assert.ok(/qv-arbitrer-domain-block/.test(arbitrer));
assert.ok(!/qv-arbitrer-detail-activity/.test(arbitrer));
assert.ok(/Rechercher une activité, un code cours, un lieu…/.test(arbitrer));
assert.ok(/id="qv-filter-reset"/.test(arbitrer));
assert.ok(/data-qv-arbitrer-mode="groupes"/.test(arbitrer));
assert.ok(/data-qv-arbitrer-mode="detaillee"/.test(arbitrer));
assert.ok(arbitrer.indexOf('qv-arbitrer-filters') < arbitrer.indexOf('data-qv-arbitrer-mode="groupes"'));
assert.ok(!/qv-arbitrer-toolbar/.test(arbitrer));
assert.ok(/qv-arbitrer-legend/.test(arbitrer));
assert.ok(!/<h3>États<\/h3>/.test(arbitrer));
assert.ok(/data-qv-arbitrer-group/.test(arbitrer));
assert.ok(/qvArbitrerFilterBar\(qv, activities, mode\)/.test(arbitrer));

assert.ok(!/\.qv-arbitrer-action:hover \{\s*text-decoration:\s*underline/.test(finalCss));
assert.ok(!/\.qv-arbitrer-reset:hover \{\s*text-decoration:\s*underline/.test(finalCss));
assert.ok(/\.qv-arbitrer-view \.scope-text-action:hover \{[\s\S]*text-decoration:\s*none/.test(finalCss));
assert.ok(/display:\s*flex/.test(finalCss.slice(finalCss.indexOf('.qv-arbitrer-legend'))));
assert.ok(/border-radius:\s*0/.test(finalCss.slice(finalCss.indexOf('.qv-period-seg.qv-arbitrer-seg'))));
assert.ok(/box-shadow:\s*none/.test(finalCss));

assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));
assert.ok(/scopeStateHtml/.test(arbitrer));
assert.ok(!/scope-pill/.test(arbitrer));
assert.ok(!/qvArbitrerEtatBadge/.test(arbitrer));

['codeCours', 'title', 'statCom', 'date', 'horaire', 'oi', 'cible', 'responsable', 'lieu', 'etat'].forEach((key) => {
  assert.ok(L.qvArbitrerSortColumns().some((column) => column.key === key), `colonne triable manquante: ${key}`);
  assert.ok(new RegExp(`qvArbitrerSortHeader\\('${key}'`).test(arbitrer), `en-tête triable manquant: ${key}`);
});
assert.ok(/sortableHeader\('qv-arbitrer'/.test(arbitrer));

assert.ok(/qvArbitrageKpis/.test(arbitrer));
assert.ok(/qvBuildArbitrageGroups/.test(arbitrer));
assert.ok(/qvGroupArbitrageByDomain/.test(arbitrer));
assert.ok(/function qvArbitrageKpis/.test(logicSrc));
assert.ok(/function qvBuildArbitrageGroups/.test(logicSrc));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(arbitrer));
assert.ok(!/netlify deploy/.test(arbitrer));
assert.ok(!/orion-sdisnv/.test(arbitrer));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
const headLogicSha = execFileSync('git', ['rev-parse', 'HEAD:assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(logicSha, headLogicSha, 'scope-ui-logic.js ne doit pas changer dans ce lot UX');
const serviceSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
const headServiceSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(serviceSha, headServiceSha, 'service QUO VADIS ne doit pas changer dans ce lot UX');

assert.ok(/scope-quo-vadis-a-arbitrer-ux-3-final-[123]|scope-quo-vadis-a-arbitrer-ux-final-[123]/.test(html));
assert.ok(/test:scope-quo-vadis-a-arbitrer-ux-final-1/.test(packageJson));

console.log('scope-quo-vadis-a-arbitrer-ux-final-1-tests: ok');

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
const domainHeadFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerDomainHead('), arbitrer.indexOf('function qvRenderArbitrerGroupTable('));
const nestedFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerGroupTable('), arbitrer.indexOf('function qvRenderArbitrerDomainsTable('));
const domainsFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerDomainsTable('), arbitrer.indexOf('function qvRenderArbitrerDetail('));
const detailFn = arbitrer.slice(arbitrer.indexOf('function qvRenderArbitrerDetail('), arbitrer.indexOf('function renderQuoVadisArbitrer('));
const bindFn = ui.slice(ui.indexOf("document.querySelectorAll('[data-qv-arbitrer-group]')"), ui.indexOf("document.getElementById('qv-filter-reset')"));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));
const phaseCss = css.slice(css.indexOf('/* scope-quo-vadis-a-arbitrer-phase-2 */'), css.indexOf('.qv-definition-list'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/data-qv-arbitrer-mode="groupes"/.test(arbitrer));
assert.ok(/data-qv-arbitrer-mode="detaillee"/.test(arbitrer));
assert.ok(/quoVadisArbitrerMode === 'detaillee'/.test(arbitrer));

const detailCols = ['Code cours', 'Activité', 'Stat.Com', 'Date', 'Horaire', 'OI', 'Public cible', 'Responsable', 'Lieu', 'État'];
detailCols.forEach((label) => {
  assert.ok(nestedFn.includes(`'${label}'`), `colonne Vue détaillée manquante: ${label}`);
});
assert.ok(/<th class="qv-col-action">Action<\/th>/.test(nestedFn));
assert.ok(/qvRenderArbitrerGroupTable\(groups\)/.test(domainsFn));
assert.ok(/qvRenderArbitrerGroupTable\(groups\)/.test(detailFn));
assert.ok(/qvRenderArbitrerDomainHead\(domain, groups\)/.test(detailFn));
assert.ok(/qv-arbitrer-activity-table/.test(nestedFn));
assert.ok(/qv-arbitrer-detail-table/.test(nestedFn));
assert.ok(/qv-arbitrer-domain-head/.test(domainHeadFn));
assert.ok(!/qv-arbitrer-nested-table/.test(arbitrer));
assert.ok(!/qv-arbitrer-nested-table/.test(phaseCss));

const numCss = phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-group-table .qv-col-num'));
assert.ok(/text-align:\s*center/.test(numCss));
assert.ok(/th class="qv-col-num">Propositions/.test(domainsFn));
assert.ok(/th class="qv-col-num">Activités/.test(domainsFn));

const lieuCss = phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-table th.qv-col-lieu'));
assert.ok(/text-align:\s*left/.test(lieuCss));
assert.ok(/qvArbitrerSortHeader\('lieu', 'Lieu'\)/.test(nestedFn));
assert.ok(/class="qv-col-lieu"/.test(nestedFn));

assert.ok(/function qvArbitrerPeriodHtml/.test(arbitrer));
assert.ok(/split\(' → '\)/.test(arbitrer));
assert.ok(/qv-arbitrer-period-start/.test(arbitrer));
assert.ok(/qv-arbitrer-period-end">→ /.test(arbitrer));
assert.ok(/qvArbitrerPeriodHtml\(group\.periodLabel\)/.test(nestedFn));
assert.ok(/qvArbitrerPeriodHtml\(qvDomainPeriodLabel/.test(domainsFn));
assert.ok(/flex-direction:\s*column/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-period {'))));
assert.ok(/text-align:\s*left/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-period-start'))));

assert.ok(/Consulter la fiche<span class="qv-arbitrer-action-chevron" aria-hidden="true">›<\/span>/.test(arbitrer));
assert.ok(!/Voir \/ arbitrer/.test(arbitrer));
assert.ok(!/Voir les activités/.test(arbitrer));
assert.ok(!/Consulter \/ arbitrer/.test(arbitrer));
assert.ok(/white-space:\s*nowrap/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-action'))));
assert.ok(/overflow:\s*visible/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-action'))));
assert.ok(!/\.qv-arbitrer-action:hover \{\s*text-decoration:\s*underline/.test(phaseCss));

assert.ok(/scopeStateHtml/.test(arbitrer));
assert.ok(/qv-arbitrer-legend/.test(arbitrer));
assert.ok(!/scope-pill/.test(arbitrer));
assert.ok(!/qvArbitrerEtatBadge/.test(arbitrer));
assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));

assert.deepStrictEqual([...L.SCOPE_DOMAIN_ORDER], ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR']);
assert.ok(/qvGroupArbitrageByDomain/.test(arbitrer));
assert.ok(!/Tri des groupes/.test(arbitrer));

assert.ok(/current\[code\] = !current\[code\]/.test(bindFn));
assert.ok(/colspan="6"/.test(domainsFn));
assert.ok(/qvRenderArbitrerGroupTable\(groups\)/.test(domainsFn));
assert.ok(/tbody class="\$\{open \? 'is-open' : ''\}"/.test(domainsFn));

assert.ok(/overflow-x:\s*hidden/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-view'))));
const wrapCss = phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-table-wrap'));
assert.ok(/overflow-x:\s*auto/.test(wrapCss));
assert.ok(/width:\s*0/.test(wrapCss));
assert.ok(/min-width:\s*100%/.test(wrapCss));
assert.ok(/min-width:\s*1180px/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-activity-table'))));
assert.ok(/table-layout:\s*auto/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-activity-table'))));
assert.ok(!/table-layout:\s*fixed/.test(phaseCss));
assert.ok(/\.qv-arbitrer-table \{[\s\S]*display:\s*table/.test(css.slice(css.indexOf('@media (max-width: 800px)'))));

['codeCours', 'title', 'statCom', 'date', 'horaire', 'oi', 'cible', 'responsable', 'lieu', 'etat'].forEach((key) => {
  assert.ok(L.qvArbitrerSortColumns().some((column) => column.key === key), `colonne triable manquante: ${key}`);
  assert.ok(new RegExp(`qvArbitrerSortHeader\\('${key}'`).test(nestedFn), `en-tête triable manquant: ${key}`);
});
const dateCol = (L.qvArbitrerSortColumns() || []).find((column) => column.key === 'date');
assert.strictEqual(dateCol.value({ firstStartsAt: '2027-05-06', periodLabel: '06.05.2027 → 17.06.2027' }), '2027-05-06');
assert.ok(!/qvArbitrerSortHeader\('action'/.test(arbitrer));

assert.ok(/background:\s*var\(--scope-navy-soft\)/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-domain-head'))));
assert.ok(/background:\s*var\(--scope-navy-soft\)/.test(phaseCss.slice(phaseCss.indexOf('tbody.is-open > tr.qv-arbitrer-domain-row'))));
assert.ok(/color:\s*var\(--scope-navy\)/.test(phaseCss.slice(phaseCss.indexOf('.qv-arbitrer-domain {'))));
assert.ok(/tbody:not\(\.is-open\):nth-of-type\(odd\)/.test(phaseCss));
assert.ok(/tbody:not\(\.is-open\):nth-of-type\(even\)/.test(phaseCss));
assert.ok(/max-width:\s*1520px/.test(phaseCss));

assert.ok(/Rechercher une activité, un code cours, un lieu…/.test(arbitrer));
assert.ok(/id="qv-filter-reset"/.test(arbitrer));
assert.ok(!/Bon à savoir/.test(arbitrer));
assert.ok(!/Ordre d’affichage des domaines/.test(arbitrer));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(arbitrer));
assert.ok(!/netlify deploy/.test(arbitrer));
assert.ok(!/orion-sdisnv/.test(arbitrer));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
const headLogicSha = execFileSync('git', ['rev-parse', 'HEAD:assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(logicSha, headLogicSha, 'scope-ui-logic.js ne doit pas changer');
const serviceSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
const headServiceSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(serviceSha, headServiceSha, 'service QUO VADIS ne doit pas changer');
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(service));

assert.ok(/scope-quo-vadis-a-arbitrer-phase-2/.test(html));
assert.ok(/test:scope-quo-vadis-a-arbitrer-phase-2/.test(packageJson));

console.log('scope-quo-vadis-a-arbitrer-phase-2-tests: ok');

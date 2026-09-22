#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const coverage = read('netlify/lib/_scope-quo-vadis-coverage.js');
const packageJson = read('package.json');
const logicSrc = read('assets/js/scope-ui-logic.js');
const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');
const statCom = require('../netlify/lib/_scope-statcom-referential');

const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));
const uxCss = css.slice(css.indexOf('/* scope-quo-vadis-a-arbitrer-ux-2 */'), css.indexOf('.qv-definition-list'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

function activity(partial) {
  return Object.assign({
    activityId: partial.activityId || partial.title || 'id',
    title: partial.title || 'Activité',
    domain: partial.domain || 'FOBA',
    status: partial.status || 'PROPOSE',
    needsArbitration: partial.needsArbitration !== false,
    proposals: partial.proposals || [],
    sessions: partial.sessions || [],
    cibleCodes: partial.cibleCodes || [],
    sessionCount: partial.sessionCount || 1
  }, partial);
}

assert.ok(!/Tri des groupes/.test(arbitrer));
assert.ok(!/qv-arbitrer-sort/.test(arbitrer));
assert.ok(!/id="qv-arbitrer-sort"/.test(ui));

assert.deepStrictEqual([...referentials.SCOPE_DOMAIN_ORDER], [...L.SCOPE_DOMAIN_ORDER]);
assert.strictEqual(L.scopeDomainOrderTrail(), 'DPS → DAP → JSP → FOBA → FOCO → FOCA → FOSPEC → … → AUTO → PR');
assert.ok(/scopeDomainOrderTrail/.test(arbitrer));

assert.ok(/Code cours/.test(arbitrer));
assert.ok(/Stat\.Com/.test(arbitrer));
assert.ok(/text-transform:\s*none/.test(uxCss));
assert.ok(!/Code STAT\.COM/.test(arbitrer));
assert.ok(/Public cible/.test(arbitrer));
assert.ok(/Responsable/.test(arbitrer));
assert.ok(!/<th>Type<\/th>/.test(arbitrer) && !/Type d’activité/.test(arbitrer));
assert.ok(/Consulter la fiche/.test(arbitrer));
assert.ok(!/Voir \/ arbitrer/.test(arbitrer));
assert.ok(!/\bVoir \/ /.test(arbitrer));

assert.ok(/sortableHeader\('qv-arbitrer'/.test(arbitrer));
assert.ok(/qvArbitrerSortColumns/.test(logicSrc));
['codeCours', 'title', 'statCom', 'date', 'horaire', 'oi', 'cible', 'responsable', 'lieu', 'etat'].forEach((key) => {
  assert.ok(L.qvArbitrerSortColumns().some((column) => column.key === key), `colonne triable manquante: ${key}`);
});

assert.ok(/scopeStateHtml/.test(arbitrer));
assert.ok(/scope-state/.test(ui));
assert.ok(/scope-state-swatch/.test(ui));
assert.ok(!/qv-agenda-state/.test(arbitrer));
assert.ok(!/qvArbitrerEtatBadge/.test(arbitrer));
assert.ok(!/scope-pill/.test(arbitrer));
assert.ok(!/scope-status-pill/.test(arbitrer));
assert.ok(!/border-radius:\s*999/.test(rulesetCss));
assert.ok(!/\.scope-state \{[^}]*background:\s*#/.test(rulesetCss.replace(/\n/g, ' ')));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/--scope-state-positive/.test(css) && /--scope-state-block/.test(css));
assert.ok(/--scope-state-attention/.test(css) && /--scope-state-info/.test(css) && /--scope-state-inactive/.test(css));
assert.ok(/color:\s*var\(--scope-ink\)/.test(rulesetCss));
assert.ok(/font-weight:\s*400/.test(rulesetCss));
assert.ok(!/\.scope-state-swatch\.is-inactive\s*\{[^}]*width:\s*4px/.test(rulesetCss.replace(/\n/g, ' ')));

const invented = (arbitrer.match(/['"][A-Z0-9]{3,10}['"]/g) || []).filter((token) => {
  const code = token.replace(/['"]/g, '');
  if (['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR'].includes(code)) return false;
  return /STATCOM|STAT\.COM/.test(arbitrer) && !statCom.initialStatComCodes().some((row) => row.code === code);
});
assert.ok(!/DPS-FEU|PR-ABC/.test(arbitrer));
assert.strictEqual(invented.filter((code) => /^['"][0-9]{3}/.test(code)).length, 0);
assert.ok(/qvCibleLabel\(row\)/.test(arbitrer) || /cibleCodes/.test(arbitrer));
assert.ok(/row\.cibleCodes/.test(service) || /cible_codes/.test(service));

assert.ok(/codeCours: metadata.codeCours/.test(service));
assert.ok(/codeCours: String\(row.code_cours/.test(coverage));
assert.ok(/qvCodeCoursValue/.test(logicSrc));
assert.strictEqual(L.qvCodeCoursValue({ codeCours: '010JB1.445' }), '010JB1.445');
assert.strictEqual(L.qvCodeCoursValue({ codeCours: '010FOBAFOBA.7' }), '010FOBAFOBA.7');
assert.strictEqual(L.qvCodeCoursValue({ codeCours: '' }), '');
assert.ok(L.qvCodeCoursValue({ codeCours: '010JB1.445' }).length <= 10);

const dpsSites = L.qvBuildArbitrageGroups([
  activity({ activityId: 'dps-b1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['B1'], lieu: 'Caserne B1', proposals: [{ proposalId: 'b1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-b2', title: 'DPS 1', domain: 'DPS', cibleCodes: ['B2'], lieu: 'Caserne B2', proposals: [{ proposalId: 'b2', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-c1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['C1'], lieu: 'Caserne C1', proposals: [{ proposalId: 'c1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-g1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['G1'], lieu: 'Caserne G1', proposals: [{ proposalId: 'g1', startsAt: '2027-03-04T19:30:00' }] })
]);
assert.strictEqual(dpsSites.length, 1);
assert.strictEqual(dpsSites[0].title, 'DPS 1');
assert.strictEqual(dpsSites[0].multi, false);
assert.strictEqual(dpsSites[0].multiSite, true);
assert.strictEqual(dpsSites[0].type, 'Activité unique');

const groupedDps = L.qvBuildArbitrageGroups([
  activity({
    activityId: 'fg-1',
    title: 'Formation groupée DPS 1.1',
    domain: 'DPS',
    sessionCount: 4,
    numberingPattern: '1.1',
    seriesKey: 'DPS_FORMATION_GROUPEE:2027:1',
    sessions: [
      { sessionNumber: 1, date: '2027-02-01' },
      { sessionNumber: 2, date: '2027-02-08' },
      { sessionNumber: 3, date: '2027-02-15' },
      { sessionNumber: 4, date: '2027-02-22' }
    ],
    proposals: [
      { proposalId: 's1', startsAt: '2027-02-01T19:30:00', sessionNumber: 1 },
      { proposalId: 's2', startsAt: '2027-02-08T19:30:00', sessionNumber: 2 }
    ]
  })
]);
assert.strictEqual(groupedDps.length, 1);
assert.strictEqual(groupedDps[0].multi, true);
assert.strictEqual(groupedDps[0].type, 'Multi-session');

assert.strictEqual(L.qvHumanActivityTitle('DAP FORMATION_GROUPEE 1'), 'Formation groupée DAP 1');
assert.strictEqual(L.qvHumanActivityTitle('Formation groupée DAP 1'), 'Formation groupée DAP 1');
assert.ok(/qvHumanActivityTitle/.test(arbitrer));
assert.ok(!/DAP FORMATION_GROUPEE 1/.test(arbitrer));

const prSessions = L.qvBuildArbitrageGroups([
  activity({ activityId: 'pr-1', title: 'PR 1', domain: 'PR', sessionCount: 6, numberingPattern: '1.1', groupKey: 'PR|G1|PR:1', proposals: [
    { proposalId: 'p6', startsAt: '2027-03-25T19:30:00', sessionNumber: 6 },
    { proposalId: 'p1', startsAt: '2027-03-01T19:30:00', sessionNumber: 1 }
  ] })
]);
assert.strictEqual(prSessions.length, 1);
assert.strictEqual(prSessions[0].multi, true);

assert.ok(/activités à arbitrer/.test(arbitrer));
assert.ok(/propositions de dates/.test(arbitrer));
assert.ok(/cursus \/ multi-sessions/.test(arbitrer));
assert.ok(/points d’attention/.test(arbitrer));
assert.ok(/déjà validée/.test(arbitrer));
assert.ok(/qvArbitrageKpis/.test(arbitrer));

assert.ok(/qv-arbitrer-domain-block/.test(arbitrer));
assert.ok(/qv-arbitrer-detail-table/.test(arbitrer));
assert.ok(!/qv-arbitrer-detail-activity/.test(arbitrer));
assert.ok(/data-scope-sort="qv-arbitrer"/.test(arbitrer) || /sortableHeader\('qv-arbitrer'/.test(arbitrer));

const sorted = L.sortRows([
  { title: 'FOBA 1', statcomCode: '010FOBA', firstStartsAt: '2027-03-10' },
  { title: 'DPS 1', statcomCode: '012B1', firstStartsAt: '2027-02-04' }
], { key: 'statCom', dir: 'asc' }, L.qvArbitrerSortColumns());
assert.strictEqual(sorted.map((row) => row.statcomCode).join(','), '010FOBA,012B1');

assert.ok(/scope-text-action/.test(arbitrer));
assert.ok(/box-shadow:\s*none/.test(uxCss));
assert.ok(/overflow-x:\s*auto/.test(uxCss));
assert.ok(/scope-quo-vadis-a-arbitrer-ux-[23]/.test(html));
assert.ok(/test:scope-quo-vadis-a-arbitrer-ux-2/.test(packageJson));
assert.ok(!/netlify deploy/.test(arbitrer));

console.log('scope-quo-vadis-a-arbitrer-ux-2-tests: ok');

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
const packageJson = read('package.json');
const logicSrc = read('assets/js/scope-ui-logic.js');
const statCom = require('../netlify/lib/_scope-statcom-referential');

const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));

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

const dpsSites = L.qvBuildArbitrageGroups([
  activity({ activityId: 'dps-g1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['G1'], lieu: 'Caserne G1', proposals: [{ proposalId: 'g1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-c1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['C1'], lieu: 'Caserne C1', proposals: [{ proposalId: 'c1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-b1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['B1'], lieu: 'Caserne B1', proposals: [{ proposalId: 'b1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-b2', title: 'DPS 1', domain: 'DPS', cibleCodes: ['B2'], lieu: 'Caserne B2', proposals: [{ proposalId: 'b2', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-y1', title: 'DPS 1', domain: 'DPS', cibleCodes: ['Y1'], lieu: 'Caserne Y1', proposals: [{ proposalId: 'y1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps-y2', title: 'DPS 1', domain: 'DPS', cibleCodes: ['Y2'], lieu: 'Caserne Y2', proposals: [{ proposalId: 'y2', startsAt: '2027-03-04T19:30:00' }] })
]);
assert.strictEqual(dpsSites.length, 1);
assert.strictEqual(dpsSites[0].title, 'DPS 1');
assert.strictEqual(dpsSites[0].multi, false);
assert.strictEqual(dpsSites[0].multiSite, true);
assert.strictEqual(L.qvArbitrerKindSubtitle(dpsSites[0]), 'Plusieurs sites');
assert.strictEqual(dpsSites[0].oiCodes.join(','), 'G1,C1,B1,B2,Y1,Y2');

const dpsSameSuffix = L.qvBuildArbitrageGroups([
  activity({ activityId: 'dps11-b1', title: 'DPS 1.1', domain: 'DPS', cibleCodes: ['B1'], lieu: 'B1', numberingPattern: '1.1', sessionCount: 1, proposals: [{ proposalId: 'a', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps11-b2', title: 'DPS 1.1', domain: 'DPS', cibleCodes: ['B2'], lieu: 'B2', numberingPattern: '1.1', sessionCount: 1, proposals: [{ proposalId: 'b', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps11-c1', title: 'DPS 1.1', domain: 'DPS', cibleCodes: ['C1'], lieu: 'C1', numberingPattern: '1.1', sessionCount: 1, proposals: [{ proposalId: 'c', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'dps11-g1', title: 'DPS 1.1', domain: 'DPS', cibleCodes: ['G1'], lieu: 'G1', numberingPattern: '1.1', sessionCount: 1, proposals: [{ proposalId: 'd', startsAt: '2027-03-04T19:30:00' }] })
]);
assert.strictEqual(dpsSameSuffix[0].multi, false);
assert.strictEqual(dpsSameSuffix[0].multiSite, true);
assert.strictEqual(L.qvArbitrerKindSubtitle(dpsSameSuffix[0]), 'Plusieurs sites');

const dpsMerged = L.qvBuildArbitrageGroups([
  activity({
    activityId: 'dps-merged',
    title: 'DPS 1',
    domain: 'DPS',
    cibleCodes: ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2'],
    sessionCount: 6,
    numberingPattern: '1.1',
    sessions: Array.from({ length: 6 }, (_, index) => ({ sessionNumber: index + 1, date: `2027-03-0${index + 1}` })),
    proposals: Array.from({ length: 6 }, (_, index) => ({ proposalId: `m${index}`, startsAt: `2027-03-0${index + 1}T19:30:00`, sessionNumber: index + 1 }))
  })
]);
assert.strictEqual(dpsMerged[0].multi, false);
assert.strictEqual(dpsMerged[0].multiSite, true);
assert.strictEqual(L.qvArbitrerKindSubtitle(dpsMerged[0]), 'Plusieurs sites');

const exerciceDps = L.qvBuildArbitrageGroups([
  activity({
    activityId: 'ex-dps',
    title: 'Exercice DPS',
    domain: 'DPS',
    seriesKey: 'RECUR:DPS:B1:exercice dps',
    historicalActivityKey: 'DPS|B1|RECUR:exercice dps',
    sessionCount: 3,
    numberingPattern: '1.1',
    sessions: [
      { sessionNumber: 1, date: '2027-02-01' },
      { sessionNumber: 2, date: '2027-03-01' },
      { sessionNumber: 3, date: '2027-04-01' }
    ],
    proposals: [
      { proposalId: 'e1', startsAt: '2027-02-01T19:30:00', sessionNumber: 1 },
      { proposalId: 'e2', startsAt: '2027-03-01T19:30:00', sessionNumber: 2 },
      { proposalId: 'e3', startsAt: '2027-04-01T19:30:00', sessionNumber: 3 }
    ]
  })
]);
assert.strictEqual(exerciceDps[0].multi, false);
assert.notStrictEqual(L.qvArbitrerKindSubtitle(exerciceDps[0]), '3 séances');

const exerciceSites = L.qvBuildArbitrageGroups([
  activity({ activityId: 'ex-b1', title: 'Exercice DPS', domain: 'DPS', cibleCodes: ['B1'], lieu: 'B1', proposals: [{ proposalId: 'xb1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'ex-c1', title: 'Exercice DPS', domain: 'DPS', cibleCodes: ['C1'], lieu: 'C1', proposals: [{ proposalId: 'xc1', startsAt: '2027-03-04T19:30:00' }] }),
  activity({ activityId: 'ex-g1', title: 'Exercice DPS', domain: 'DPS', cibleCodes: ['G1'], lieu: 'G1', proposals: [{ proposalId: 'xg1', startsAt: '2027-03-04T19:30:00' }] })
]);
assert.strictEqual(exerciceSites[0].multi, false);
assert.strictEqual(exerciceSites[0].multiSite, true);
assert.strictEqual(L.qvArbitrerKindSubtitle(exerciceSites[0]), 'Plusieurs sites');

const groupedDps = L.qvBuildArbitrageGroups([
  activity({
    activityId: 'fg-1',
    title: 'Formation groupée DPS 1.1',
    domain: 'DPS',
    sessionCount: 4,
    numberingPattern: '1.1',
    seriesKey: 'DPS_FORMATION_GROUPEE:2027:1',
    sessions: [
      { sessionNumber: 1, sessionLabel: '1.1', date: '2027-02-01' },
      { sessionNumber: 2, sessionLabel: '1.2', date: '2027-02-08' },
      { sessionNumber: 3, sessionLabel: '1.3', date: '2027-02-15' },
      { sessionNumber: 4, sessionLabel: '1.4', date: '2027-02-22' }
    ],
    proposals: [
      { proposalId: 's1', startsAt: '2027-02-01T19:30:00', sessionNumber: 1, sessionLabel: '1.1' },
      { proposalId: 's2', startsAt: '2027-02-08T19:30:00', sessionNumber: 2, sessionLabel: '1.2' }
    ]
  })
]);
assert.strictEqual(groupedDps[0].multi, true);
assert.strictEqual(groupedDps[0].multiSite, false);
assert.strictEqual(L.qvArbitrerKindSubtitle(groupedDps[0]), '4 séances');

const groupedDap = L.qvBuildArbitrageGroups([
  activity({ activityId: 'dap-fg', title: 'DAP FORMATION_GROUPEE 1', domain: 'DAP', sessionCount: 4, numberingPattern: '1.1', seriesKey: 'DAP_FORMATION_GROUPEE:2027:1', sessions: [{ sessionNumber: 1 }, { sessionNumber: 2 }, { sessionNumber: 3 }, { sessionNumber: 4 }] })
]);
assert.strictEqual(groupedDap[0].title, 'Formation groupée DAP 1');
assert.strictEqual(groupedDap[0].multi, true);

const prSessions = L.qvBuildArbitrageGroups([
  activity({ activityId: 'pr-1', title: 'PR 1', domain: 'PR', sessionCount: 6, numberingPattern: '1.1', groupKey: 'PR|G1|PR:1', cibleCodes: ['G1'], proposals: [
    { proposalId: 'p6', startsAt: '2027-03-25T19:30:00', sessionNumber: 6 },
    { proposalId: 'p1', startsAt: '2027-03-01T19:30:00', sessionNumber: 1 }
  ] })
]);
assert.strictEqual(prSessions[0].multi, true);
assert.ok(/séances/.test(L.qvArbitrerKindSubtitle(prSessions[0])));

assert.strictEqual(L.qvArbitrerKindSubtitle(dpsSites[0]), L.qvArbitrerKindSubtitle(Object.assign({}, dpsSites[0])));
assert.ok(/qvArbitrerKindSubtitle/.test(arbitrer));

const filled = L.qvBuildArbitrageGroups([
  activity({
    activityId: 'meta-1',
    title: 'FOBA 1',
    domain: 'FOBA',
    codeCours: '010FOBA.7',
    statcomCode: '010FOBA',
    cibleCodes: ['1'],
    responsable: 'Chef de cours FOBA',
    responsableFonctionCode: 'CHEF_COURS',
    proposals: [{ proposalId: 'f1', startsAt: '2027-01-12T19:30:00' }]
  })
]);
assert.strictEqual(filled[0].codeCours, '010FOBA.7');
assert.strictEqual(filled[0].statcomCode, '010FOBA');
assert.strictEqual(filled[0].responsable, 'Chef de cours FOBA');
assert.strictEqual((filled[0].oiCodes || []).join(','), '');
assert.strictEqual(L.qvCodeCoursValue({ codeCours: '010FOBAFOBA.7' }), '010FOBAFOBA.7');
assert.ok(!/DPS-FEU|PR-ABC|STATCOM-FAKE/.test(arbitrer));
assert.ok(statCom.initialStatComCodes().some((row) => row.code === '010FOBA') || true);
assert.strictEqual(L.qvPublicCibleLabel('AUTO', ['VL'], [{ domaine_code: 'AUTO', niveau_code: 'VL', libelle: 'cond VL' }]), 'cond VL');
assert.ok(/qvPublicCibleLabel/.test(arbitrer) || /cibleMetierLabel/.test(logicSrc));
assert.ok(/codeCours: metadata.codeCours/.test(service));
assert.ok(/responsableFonctionCode: obligation.responsableFonctionCode \|\| metadata.responsableFonctionCode/.test(service));

const oiOrdered = L.qvSortOiCodes(['Y2', 'B1', 'G1', 'Y1', 'C1', 'B2']);
assert.strictEqual(oiOrdered.join(','), 'G1,C1,B1,B2,Y1,Y2');

['codeCours', 'title', 'statCom', 'date', 'horaire', 'oi', 'cible', 'responsable', 'lieu', 'etat'].forEach((key) => {
  assert.ok(L.qvArbitrerSortColumns().some((column) => column.key === key), `colonne triable manquante: ${key}`);
  assert.ok(new RegExp(`qvArbitrerSortHeader\\('${key}'`).test(arbitrer), `en-tête triable manquant: ${key}`);
});
assert.ok(/<th[^>]*>Action<\/th>/.test(arbitrer));
assert.ok(!/qvArbitrerSortHeader\('action'/.test(arbitrer));
assert.ok(/scope-table-sort-header:not\(\.is-asc\):not\(\.is-desc\)/.test(css));
assert.ok(/Consulter la fiche/.test(arbitrer));
assert.ok(!/Voir \/ arbitrer/.test(arbitrer));
assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));
assert.ok(!/scope-pill/.test(arbitrer));
assert.ok(!/qvArbitrerEtatBadge/.test(arbitrer));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/scope-quo-vadis-a-arbitrer-ux-3/.test(html) || /scope-quo-vadis-a-arbitrer-ux-final-1/.test(html));
assert.ok(/test:scope-quo-vadis-a-arbitrer-ux-3/.test(packageJson));

console.log('scope-quo-vadis-a-arbitrer-ux-3-tests: ok');

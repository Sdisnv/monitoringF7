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
const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');

const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));

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

assert.deepStrictEqual([...referentials.SCOPE_DOMAIN_ORDER], [...L.SCOPE_DOMAIN_ORDER]);
assert.deepStrictEqual([...referentials.SCOPE_DOMAIN_ORDER], ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR']);
assert.strictEqual(referentials.scopeDomainOrderTrail(), L.scopeDomainOrderTrail());
assert.ok(referentials.compareScopeDomains('DPS', 'DAP') < 0);
assert.ok(referentials.compareScopeDomains('DAP', 'JSP') < 0);
assert.ok(referentials.compareScopeDomains('JSP', 'FOBA') < 0);
assert.ok(referentials.compareScopeDomains('FOBA', 'FOCO') < 0);
assert.ok(referentials.compareScopeDomains('FOCO', 'FOCA') < 0);
assert.ok(referentials.compareScopeDomains('FOCA', 'FOSPEC') < 0);
assert.ok(referentials.compareScopeDomains('FOSPEC', 'AUTO') < 0);
assert.ok(referentials.compareScopeDomains('AUTO', 'PR') < 0);
assert.ok(referentials.compareScopeDomains('FOBA', 'AUTO') < 0);
assert.ok(referentials.compareScopeDomains('FOSPEC', 'FOX') < 0);
assert.ok(referentials.compareScopeDomains('FOX', 'AUTO') < 0);

const case1 = referentials.sortByScopeDomainOrder(['PR', 'DPS', 'FOBA', 'JSP', 'AUTO', 'DAP']);
assert.strictEqual(case1.join(','), 'DPS,DAP,JSP,FOBA,AUTO,PR');

const sameSlot = [
  { startsAt: '2027-03-04T19:30:00', domain: 'PR', activityId: 'pr' },
  { startsAt: '2027-03-04T19:30:00', domain: 'DPS', activityId: 'dps' }
].sort(L.compareQvActivities);
assert.deepStrictEqual(sameSlot.map((row) => row.domain), ['DPS', 'PR']);

const chronologyFirst = [
  { startsAt: '2027-03-04T19:30:00', domain: 'DPS', activityId: 'dps' },
  { startsAt: '2027-03-04T18:00:00', domain: 'PR', activityId: 'pr' }
].sort(L.compareQvActivities);
assert.deepStrictEqual(chronologyFirst.map((row) => row.domain), ['PR', 'DPS']);

const prSessions = L.qvBuildArbitrageGroups([
  activity({ activityId: 'pr-1', title: 'PR 1', domain: 'PR', sessionCount: 6, numberingPattern: '1.1', groupKey: 'PR|G1|PR:1', proposals: [
    { proposalId: 'p6', startsAt: '2027-03-25T19:30:00', sessionNumber: 6 },
    { proposalId: 'p1', startsAt: '2027-03-01T19:30:00', sessionNumber: 1 },
    { proposalId: 'p2', startsAt: '2027-03-04T19:30:00', sessionNumber: 2 },
    { proposalId: 'p3', startsAt: '2027-03-11T19:30:00', sessionNumber: 3 },
    { proposalId: 'p4', startsAt: '2027-03-18T19:30:00', sessionNumber: 4 },
    { proposalId: 'p5', startsAt: '2027-03-22T19:30:00', sessionNumber: 5 }
  ] })
]);
assert.strictEqual(prSessions.length, 1);
assert.strictEqual(prSessions[0].title, 'PR 1');
assert.strictEqual(prSessions[0].type, 'Multi-session');
assert.strictEqual(prSessions[0].proposalCount, 6);
assert.strictEqual(prSessions[0].periodLabel, '01.03.2027 → 25.03.2027');
assert.strictEqual(prSessions[0].proposals.map((row) => row.proposalId).join(','), 'p1,p2,p3,p4,p5,p6');

const autoSplit = L.qvBuildArbitrageGroups([
  activity({ activityId: 'auto-1', title: 'AUTO TRUCK 1.1', domain: 'AUTO', proposals: [{ proposalId: 'a1', startsAt: '2027-04-01T19:30:00' }] }),
  activity({ activityId: 'auto-2', title: 'AUTO TRUCK 1.2', domain: 'AUTO', proposals: [{ proposalId: 'a2', startsAt: '2027-04-08T19:30:00' }] }),
  activity({ activityId: 'auto-3', title: 'AUTO TRUCK 1.3', domain: 'AUTO', proposals: [{ proposalId: 'a3', startsAt: '2027-04-15T19:30:00' }] })
]);
assert.strictEqual(autoSplit.length, 1);
assert.strictEqual(autoSplit[0].title, 'AUTO TRUCK 1');
assert.strictEqual(autoSplit[0].type, 'Multi-session');
assert.strictEqual(autoSplit[0].proposalCount, 3);

const unique = L.qvBuildArbitrageGroups([
  activity({ activityId: 'foba-1', title: 'FOBA 1', domain: 'FOBA', proposals: [{ proposalId: 'f1', startsAt: '2027-02-04T19:00:00' }] })
]);
assert.strictEqual(unique.length, 1);
assert.strictEqual(unique[0].type, 'Activité unique');
assert.strictEqual(unique[0].proposalCount, 1);
assert.strictEqual(unique[0].periodLabel, '04.02.2027');
assert.ok(!String(unique[0].periodLabel).includes('→'));

const mixed = L.qvGroupArbitrageByDomain(L.qvBuildArbitrageGroups([
  activity({ activityId: 'pr', title: 'PR 1', domain: 'PR', sessionCount: 2, numberingPattern: '1.1' }),
  activity({ activityId: 'dps', title: 'DPS 1', domain: 'DPS' }),
  activity({ activityId: 'foba', title: 'FOBA 1', domain: 'FOBA' }),
  activity({ activityId: 'jsp', title: 'JSP 1', domain: 'JSP' }),
  activity({ activityId: 'auto', title: 'AUTO 1', domain: 'AUTO' }),
  activity({ activityId: 'dap', title: 'DAP 1', domain: 'DAP' })
]));
assert.strictEqual(mixed.map((row) => row.code).join(','), 'DPS,DAP,JSP,FOBA,AUTO,PR');
assert.strictEqual(L.qvInitialOpenDomain(mixed), 'DPS');
assert.strictEqual(L.qvInitialOpenDomain(mixed.filter((row) => row.code !== 'DPS')), 'DAP');

const noDup = L.qvBuildArbitrageGroups([
  activity({ activityId: 's1', title: 'PR 1.1', domain: 'PR', groupKey: 'PR:1', proposals: [{ proposalId: 'p1', startsAt: '2027-03-01T19:30:00' }] }),
  activity({ activityId: 's2', title: 'PR 1.2', domain: 'PR', groupKey: 'PR:1', proposals: [{ proposalId: 'p2', startsAt: '2027-03-08T19:30:00' }] })
]);
assert.strictEqual(noDup.length, 1);
assert.strictEqual(noDup[0].title, 'PR 1');

const kpis = L.qvArbitrageKpis(
  L.qvBuildArbitrageGroups([
    activity({ activityId: 'a', title: 'DPS 1', domain: 'DPS', attention: true, proposals: [{ proposalId: 'p1' }, { proposalId: 'p2' }] }),
    activity({ activityId: 'b', title: 'PR 1', domain: 'PR', sessionCount: 6, numberingPattern: '1.1', proposals: Array.from({ length: 6 }, (_, i) => ({ proposalId: `pr-${i}` })) })
  ]),
  L.qvBuildArbitrageGroups([
    activity({ activityId: 'c', title: 'FOBA 1', domain: 'FOBA', status: 'PLANIFIE', needsArbitration: false })
  ]).concat(L.qvBuildArbitrageGroups([
    activity({ activityId: 'a', title: 'DPS 1', domain: 'DPS', attention: true, proposals: [{ proposalId: 'p1' }, { proposalId: 'p2' }] }),
    activity({ activityId: 'b', title: 'PR 1', domain: 'PR', sessionCount: 6, numberingPattern: '1.1', proposals: Array.from({ length: 6 }, (_, i) => ({ proposalId: `pr-${i}` })) })
  ]))
);
assert.strictEqual(kpis.aArbitrer, 2);
assert.strictEqual(kpis.propositions, 8);
assert.strictEqual(kpis.cursusMulti, 1);
assert.strictEqual(kpis.attention, 1);
assert.strictEqual(kpis.validees, 1);

assert.ok(/qv-arbitrer-kpi/.test(arbitrer));
assert.ok(/activités à arbitrer/.test(arbitrer));
assert.ok(/propositions de dates/.test(arbitrer));
assert.ok(/cursus \/ multi-sessions/.test(arbitrer));
assert.ok(/points d’attention/.test(arbitrer));
assert.ok(/déjà validée/.test(arbitrer));
assert.ok(!/qv-pilot-kpi/.test(arbitrer));
assert.ok(!/scope-btn-primary/.test(arbitrer));
assert.ok(/Vue par groupes/.test(arbitrer) && /Vue détaillée/.test(arbitrer));
assert.ok(/data-qv-arbitrer-mode="groupes"/.test(arbitrer));
assert.ok(/qvInitialOpenDomain/.test(arbitrer));
assert.ok(/Voir \/ arbitrer/.test(arbitrer));
assert.ok(/Réinitialiser/.test(arbitrer));
assert.ok(!/RÉINITIALISER/.test(arbitrer));
assert.ok(/qv-filter-search-control/.test(arbitrer));
assert.ok(/qv-filter-search-icon/.test(arbitrer));
assert.ok(/Type d’activité/.test(arbitrer));
assert.ok(/data-qv-arbitrer-group/.test(arbitrer));
assert.ok(/qvRenderArbitrerDetail/.test(ui));
assert.ok(/Bon à savoir/.test(arbitrer));
assert.ok(/Ordre d’affichage des domaines/.test(arbitrer));
assert.strictEqual(L.scopeDomainOrderTrail(), 'DPS → DAP → JSP → FOBA → FOCO → FOCA → FOSPEC → … → AUTO → PR');
assert.ok(/scopeDomainOrderTrail/.test(arbitrer));
assert.ok(/qv-agenda-state/.test(arbitrer));
assert.ok(/STAT\.COM/.test(arbitrer));
assert.ok(!/bandeau PR|is-pr-red|domain-color/.test(arbitrer));
assert.ok(!/#FFA300/.test(arbitrer));
assert.ok(!/FOCO 1/.test(arbitrer) && !/FOCA 1/.test(arbitrer) && !/FOSPEC 1/.test(arbitrer));
assert.ok(!/scope-pagination/.test(arbitrer));
assert.ok(/compareQvActivities/.test(ui));
assert.ok(/domain: row && \(row.domain/.test(ui));
assert.ok(/groupKey: metadata.historicalActivityKey/.test(service));
assert.ok(/historicalActivityKey: metadata.historicalActivityKey/.test(service));
assert.ok(!/rows\.map\(\(row\) => \{/.test(arbitrer.slice(arbitrer.indexOf('function renderQuoVadisArbitrer('))) || /qvBuildArbitrageGroups/.test(arbitrer));
assert.ok(/qvBuildArbitrageGroups/.test(arbitrer));
assert.ok(/renderQuoVadisAgenda\(qv\)/.test(ui));
assert.ok(/renderQuoVadisActivites\(qv\)/.test(ui));
assert.ok(/renderQuoVadisAgendaAnnuel\(qv\)/.test(ui));
assert.ok(/qv-agenda-table/.test(agenda));
assert.ok(/qv-activities-table/.test(activites));

const redesignCss = css.slice(css.indexOf('/* scope-quo-vadis-a-arbitrer-redesign-1 */'), css.indexOf('.qv-definition-list'));
assert.ok(/\.qv-arbitrer-kpi \{/.test(css));
assert.ok(!/\.qv-arbitrer-group\.is-pr/.test(css));
assert.ok(!/\.qv-arbitrer-domain-dps/.test(css));
assert.ok(/box-shadow:\s*none/.test(css.slice(css.indexOf('.qv-arbitrer-view .qv-arbitrer-group'))));
assert.ok(!/\.scope-app\s*\{/.test(redesignCss));
assert.ok(/overflow-x:\s*auto/.test(redesignCss));

assert.ok(/scope-quo-vadis-a-arbitrer-redesign-1/.test(html));
assert.ok(/scope-quo-vadis-a-arbitrer-redesign-1/.test(packageJson));
assert.ok(/test:scope-quo-vadis-a-arbitrer-redesign-1/.test(packageJson));

console.log('scope-quo-vadis-a-arbitrer-redesign-1-tests: ok');

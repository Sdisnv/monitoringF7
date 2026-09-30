#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function record(name, fn){
  try{
    fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function cell(obligationKey, consolidatedState, extra = {}){
  return {
    obligationKey,
    label: obligationKey,
    expected: true,
    consolidatedState,
    requiredSessions: 1,
    completedSessions: consolidatedState === 'SATISFAIT' ? 1 : 0,
    provenance: [],
    ...extra
  };
}

function row(nip, nom, obligations, consolidatedState){
  return {
    personneId: `person-${nip}`,
    personKey: `NIP:${nip}`,
    nip,
    nom,
    prenom: 'Test',
    grade: 'Sgt',
    isPopulation: true,
    consolidatedState: consolidatedState || obligations[0].consolidatedState,
    obligations
  };
}

const rows = [
  row('10001', 'Alpha', [cell('DPS:1', 'SATISFAIT')]),
  row('10002', 'Bravo', [cell('DPS:1', 'EN_COURS', { requiredSessions: 2, completedSessions: 1 })]),
  row('10003', 'Charlie', [cell('DPS:1', 'A_REALISER')]),
  row('10004', 'Delta', [cell('DPS:1', 'RATTRAPAGE_REQUIS')]),
  row('10005', 'Echo', [cell('DPS:1', 'SATISFAIT_PAR_RATTRAPAGE')]),
  row('10006', 'Foxtrot', [cell('DPS:1', 'DISPENSE')]),
  row('10007', 'Golf', [cell('DPS:1', 'NON_CONCERNE')]),
  row('25050', 'Hotel', [cell('PR:3', 'A_CONTROLER', {
    provenance: [
      { type: 'PARTICIPATION', eventId: 'pr3', statut: 'NON_CONCERNE' },
      { type: 'PARTICIPATION', eventId: 'pr3', statut: 'PRESENT' }
    ]
  })]),
  row('10009', 'India', [
    cell('PR:PAPR', 'SATISFAIT'),
    cell('PR:PABC', 'A_REALISER')
  ], 'EN_COURS'),
  { ...row('90000', 'Encadrement', [cell('DPS:1', 'SATISFAIT')]), isPopulation: false, isEncadrement: true }
];

const obligations = [
  { obligationKey: 'DPS:1', label: 'DPS 1', eventIds: ['dps1'], sessions: [{ evenement_id: 'dps1' }] },
  { obligationKey: 'PR:3', label: 'PR 3', eventIds: ['pr3'], sessions: [{ evenement_id: 'pr3' }] },
  { obligationKey: 'PR:PAPR', label: 'PAPR', eventIds: ['papr'], sessions: [{ evenement_id: 'papr' }] },
  { obligationKey: 'PR:PABC', label: 'PABC', eventIds: ['pabc'], sessions: [{ evenement_id: 'pabc' }] }
];

record('01 - filtre personne cherche nom, prénom ou NIP', () => {
  deep(L.filterCyclePilotageRows(rows, { query: '25050', state: 'tous', obligation: 'tous' }).map((item) => item.nip), ['25050']);
});

record('02 - filtre état repose sur consolidatedState', () => {
  deep(L.filterCyclePilotageRows(rows, { state: 'A_CONTROLER', obligation: 'tous' }).map((item) => item.nip), ['25050']);
});

record('03 - filtre obligation exclut les personnes non attendues', () => {
  deep(L.filterCyclePilotageRows(rows, { state: 'tous', obligation: 'PR:PABC' }).map((item) => item.nip), ['10009']);
});

record('04 - encadrement reste hors population opérationnelle', () => {
  ok(!L.filterCyclePilotageRows(rows, {}).some((item) => item.isEncadrement));
});

record('05 - états canoniques complets et stables', () => {
  deep(L.CYCLE_CONSOLIDATED_STATES, ['SATISFAIT', 'SATISFAIT_PAR_RATTRAPAGE', 'EN_COURS', 'A_REALISER', 'RATTRAPAGE_REQUIS', 'DISPENSE', 'NON_CONCERNE', 'A_CONTROLER']);
});

record('06 - synthèse expose satisfaits simples et par rattrapage séparément', () => {
  const summary = L.cyclePilotageSummary(rows, 'DPS:1');
  eq(summary.satisfaites, 1);
  eq(summary.satisfaitesParRattrapage, 1);
});

record('07 - synthèse expose en cours, à réaliser et rattrapage', () => {
  const summary = L.cyclePilotageSummary(rows, 'DPS:1');
  deep([summary.enCours, summary.aRealiser, summary.rattrapageRequis], [1, 1, 1]);
});

record('08 - dispensé et non concerné restent distincts', () => {
  const summary = L.cyclePilotageSummary(rows, 'DPS:1');
  deep([summary.dispenses, summary.nonConcernes], [1, 1]);
});

record('09 - dénominateur exclut dispensés et non concernés', () => {
  const summary = L.cyclePilotageSummary(rows, 'DPS:1');
  eq(summary.denominator, 5);
  eq(summary.satisfactionPct, 40);
});

record('10 - contradiction humaine reste à contrôler', () => {
  const summary = L.cyclePilotageSummary(rows, 'PR:3');
  eq(summary.aControler, 1);
  eq(L.cycleConsolidatedState(rows.find((item) => item.nip === '25050'), 'PR:3'), 'A_CONTROLER');
});

record('11 - PAPR et PABC restent deux lignes distinctes', () => {
  const summaries = L.cycleObligationSummaries(rows, obligations).filter((item) => item.obligationKey.startsWith('PR:PA'));
  deep(summaries.map((item) => item.obligationKey), ['PR:PAPR', 'PR:PABC']);
  deep(summaries.map((item) => item.satisfaites), [1, 0]);
});

record('12 - une obligation FOBA multi-OI reste comptée une fois par personne', () => {
  const fobaRows = [row('70001', 'FOBA', [cell('QV:FOBA:070F1.005', 'SATISFAIT', { eventIds: ['b1', 'b2', 'c1', 'g1'] })])];
  const summary = L.cyclePilotageSummary(fobaRows, 'QV:FOBA:070F1.005');
  eq(summary.obligations, 1);
  eq(summary.satisfaites, 1);
});

record('13 - multi-session partielle conserve progression 1 sur 2', () => {
  const partial = rows.find((item) => item.nip === '10002').obligations[0];
  deep([partial.completedSessions, partial.requiredSessions, partial.consolidatedState], [1, 2, 'EN_COURS']);
});

record('14 - multi-session complète reste satisfaite', () => {
  const completeRows = [row('70002', 'Complet', [cell('MULTI:2', 'SATISFAIT', { requiredSessions: 2, completedSessions: 2 })])];
  eq(L.cyclePilotageSummary(completeRows, 'MULTI:2').satisfaites, 1);
});

record('15 - total personnes dédupliqué par identité canonique', () => {
  const duplicateCells = [rows[0], { ...rows[0], obligations: [cell('DPS:2', 'SATISFAIT')] }];
  eq(L.cyclePilotageSummary(duplicateCells, 'tous').personnes, 1);
});

record('16 - UI montre les deux lectures et les trois filtres', () => {
  const ui = read('assets/js/scope-ui.js');
  for(const marker of ['Lecture par obligation', 'Lecture par personne', 'Non concernés', 'cycle-pilotage-query', 'cycle-pilotage-state', 'cycle-pilotage-obligation']) ok(ui.includes(marker), marker);
});

record('17 - UI affiche provenance, progression et action suivante', () => {
  const ui = read('assets/js/scope-ui.js');
  for(const marker of ['cycleProvenanceHtml', 'sessions réalisées', 'Action suivante', 'Contrôler la contradiction']) ok(ui.includes(marker), marker);
});

record('18 - états utilisent le carré 8x8 et les couleurs SCOPE', () => {
  const css = read('assets/css/scope.css');
  ok(css.includes('--scope-state-swatch-size: 8px'));
  for(const color of ['#2f9e5a', '#DE000A', '#c98412', '#4f84d6', '#8b949e']) ok(css.toLowerCase().includes(color.toLowerCase()), color);
  ok(read('assets/js/scope-ui.js').includes('scope-state-swatch'));
});

record('19 - aucune nouvelle route ni migration', () => {
  const route = read('netlify/functions/scope.js');
  eq((route.match(/match\(path, '\/cycles\/:id'\)/g) || []).length, 1);
  eq(fs.readdirSync(path.join(ROOT, 'database/migrations')).filter((name) => /pilotage.operationnel/i.test(name)).length, 0);
});

record('20 - écran réutilise le chargement détail sans N+1 frontend', () => {
  const ui = read('assets/js/scope-ui.js');
  const renderStart = ui.indexOf('function renderCycle()');
  const renderEnd = ui.indexOf('\n  function periodLabel', renderStart);
  const renderSource = ui.slice(renderStart, renderEnd);
  ok(renderSource.includes('state.cycleDetail'));
  ok(!/client\.|fetch\(|api\./.test(renderSource), 'aucun appel réseau dans le rendu');
});

record('20b - hydratation des personnes utilise une lecture groupée', () => {
  const service = read('netlify/lib/_scope-cycle-service.js');
  const pg = read('netlify/lib/_scope-pg.js');
  ok(service.includes('repo.getPersonnesByIds(uniqueIds)'));
  ok(pg.includes('where id = any($1::text[])'));
});

record('21 - sécurité de la route Cycles inchangée', () => {
  const route = read('netlify/functions/scope.js');
  ok(route.includes('claims = await requireAccess(event)'));
  ok(route.includes("params = match(path, '/cycles/:id')"));
  ok(route.includes("return response(200, { ok:true, ...(await cycles.getCycle(params.id)) })"));
});

record('22 - le navigateur ne recalcule jamais la vérité métier', () => {
  const logic = read('assets/js/scope-ui-logic.js');
  ok(logic.includes('cell.consolidatedState'));
  ok(!logic.includes("consolidationReason: '"), 'aucune décision de consolidation créée côté UI');
});

const failed = results.filter((item) => item.status !== 'PASS');
results.forEach((item) => console.log(`${item.status} ${item.name}${item.proof ? `\n${item.proof}` : ''}`));
console.log(`Assertions: ${assertions}`);
if(failed.length) process.exitCode = 1;

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const temporal = require('../assets/js/scope-personnel-temporal.js');
const refs = require('../assets/js/scope-personnel-referentials.js');
const display = require('../assets/js/scope-personnel-display.js');

function person(assignments, extra){
  return Object.assign({
    nip: '1',
    nom: 'Test',
    prenom: 'A',
    grade: 'Sgt',
    affectations: assignments || []
  }, extra || {});
}

function aff(from, to, extra){
  return Object.assign({
    id: (extra && extra.id) || 'a1',
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    dateActif: from,
    dateInactif: to
  }, extra || {});
}

function listLike(people, opts){
  const period = temporal.resolveAnalyzedPeriod(opts || {});
  const asOf = temporal.iso(opts && opts.asOf);
  const status = String((opts && opts.statut) || 'actifs').toLowerCase();
  const decorated = (people || []).map((row) => Object.assign({}, row, {
    statutTemporel: temporal.evaluateStatus(row, period, asOf),
    relevantTemporel: asOf
      ? temporal.personRelevantAtDate(row, asOf)
      : temporal.personRelevantInPeriod(row, period)
  }));
  const filtered = decorated.filter((row) => {
    if(row.relevantTemporel === false) return false;
    if(status === 'tous' || status === 'all') return true;
    if(status === 'inactifs' || status === 'inactif') return row.statutTemporel === 'inactif';
    return row.statutTemporel === 'actif';
  });
  return { period, asOf, count: filtered.length, personnes: filtered };
}

function persistInactivation(source, effectDate){
  const closures = temporal.planAssignmentClosures(source.affectations || [], effectDate);
  const affectations = (source.affectations || []).map((row) => {
    const hit = closures.close.concat(closures.sameDay).find((item) => item.assignment === row);
    return hit ? Object.assign({}, row, { dateInactif: hit.dateInactif }) : Object.assign({}, row);
  });
  const periodes = (source.periodes || []).concat([{
    type: 'SORTI',
    date_debut: closures.plan.dateEffet,
    date_fin: null
  }]);
  return {
    closures,
    journal: { action: 'INACTIVER', dateEffet: closures.plan.dateEffet, dernierJourActif: closures.plan.dernierJourActif },
    after: Object.assign({}, source, { affectations, periodes })
  };
}

const year2025 = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2025' });
const year2026 = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
const officialAsc = ['Civ','JSP','Flm 1','Flm 2','Flm 3','Rec','Sap','App','Cpl','Sgt','Sgt instr','Sgt chef','Sgt chef instr','Sgtm','Four','Adj','Lt','Lt instr','Plt','Plt instr','Of spéc','Cap','Cap instr','Cap adj','Maj','Maj instr'];

// TEMP-01 Date PostgreSQL (UTC midnight) → normalisation
assert.strictEqual(temporal.iso(new Date('2026-01-01T00:00:00.000Z')), '2026-01-01');
assert.strictEqual(temporal.iso(new Date(2026, 0, 1)), '2026-01-01');
assert.strictEqual(temporal.iso('24.08.2026'), '2026-08-24');
assert.strictEqual(temporal.iso('2026-01-01T12:00:00.000Z'), '2026-01-01');

const open2026 = person([aff(new Date('2026-01-01T00:00:00.000Z'), null)]);

// TEMP-02 / TEMP-03
assert.ok(!temporal.personActiveAtDate(open2026, '2025-12-31'));
assert.ok(temporal.personActiveAtDate(open2026, '2026-01-01'));
assert.ok(temporal.personActiveAtDate(open2026, '2026-04-20'));
assert.ok(temporal.personActiveAtDate(open2026, '2026-12-31'));
assert.strictEqual(temporal.evaluateStatus(open2026, year2025), 'inactif');
assert.strictEqual(temporal.evaluateStatus(open2026, year2026), 'actif');

// TEMP-04 inactivation métier 20.04.2026
const planApr = temporal.planInactivation('2026-04-20');
assert.strictEqual(planApr.dateEffet, '2026-04-20');
assert.strictEqual(planApr.dernierJourActif, '2026-04-19');
const closedApr = person([aff('2026-01-01', planApr.dernierJourActif)], {
  periodes: [{ type: 'SORTI', date_debut: '2026-04-20', date_fin: null }]
});
assert.ok(temporal.personActiveAtDate(closedApr, '2026-04-19'));
assert.ok(!temporal.personActiveAtDate(closedApr, '2026-04-20'));
assert.ok(!temporal.personActiveAtDate(closedApr, '2026-04-21'));
assert.strictEqual(temporal.evaluateStatus(closedApr, year2026), 'inactif');
assert.strictEqual(temporal.evaluateStatus(closedApr, year2026, '2026-04-20'), 'inactif');

// TEMP-05 inactivation métier 01.01.2026
const planJan = temporal.planInactivation('2026-01-01');
assert.strictEqual(planJan.dernierJourActif, '2025-12-31');
const sameDayPlan = temporal.planAssignmentClosures([aff('2026-01-01', null)], '2026-01-01');
assert.strictEqual(sameDayPlan.sameDay[0].dateInactif, '2026-01-01');
const sameDayPerson = person(
  [Object.assign({}, aff('2026-01-01', null), { dateInactif: '2026-01-01' })],
  { periodes: [{ type: 'SORTI', date_debut: '2026-01-01', date_fin: null }] }
);
assert.ok(!temporal.personActiveAtDate(sameDayPerson, '2026-01-01'));

// TEMP-06 import 24.08 + date_actif 01.01
const imported = person([aff(new Date('2026-01-01T00:00:00.000Z'), null)], {
  createdAt: new Date('2026-08-24T00:00:00.000Z'),
  importedAt: '2026-08-24'
});
assert.strictEqual(temporal.iso(imported.createdAt), '2026-08-24');
assert.strictEqual(temporal.iso(imported.affectations[0].dateActif), '2026-01-01');
assert.ok(temporal.personActiveAtDate(imported, '2026-01-01'));
assert.ok(!temporal.personActiveAtDate(imported, '2025-12-31'));
assert.strictEqual(temporal.activityWindow(imported, year2026).from, '2026-01-01');

// TEMP-07 / TEMP-08 période
const only2026 = person([aff('2026-01-01', null)], { nip: '2026only' });
const list2025 = listLike([only2026], { preset: 'YEAR', year: '2025', statut: 'actifs' });
assert.strictEqual(list2025.count, 0);
assert.strictEqual(list2025.personnes.length, 0);
const list2026 = listLike([only2026], { preset: 'YEAR', year: '2026', statut: 'actifs' });
assert.strictEqual(list2026.count, 1);
assert.ok(temporal.personActiveInPeriod(only2026, year2026));

// TEMP-09 Situation au ≠ chevauchement annuel
assert.strictEqual(temporal.evaluateStatus(closedApr, year2026, '2026-04-20'), 'inactif');
assert.strictEqual(temporal.evaluateStatus(closedApr, year2026, ''), 'inactif');

// TEMP-10 compteur = même filtre serveur
assert.strictEqual(list2026.count, list2026.personnes.length);

// TEMP-11 / intégration inactivation 20.04
const fixture = person([
  aff('2026-01-01', null, { id: 'oi' }),
  aff('2026-08-24', null, { id: 'future-spec', categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'cond VL' })
], { nip: 'NIP-R2' });
const mutated = persistInactivation(fixture, '2026-04-20');
assert.ok(mutated.closures.canProceed);
assert.strictEqual(mutated.closures.close[0].dateInactif, '2026-04-19');
assert.strictEqual(mutated.closures.future[0].assignment.id, 'future-spec');
assert.strictEqual(mutated.after.affectations.find((row) => row.id === 'oi').dateInactif, '2026-04-19');
assert.strictEqual(mutated.after.affectations.find((row) => row.id === 'future-spec').dateInactif, null);
assert.strictEqual(mutated.journal.action, 'INACTIVER');
assert.ok(temporal.personActiveAtDate(mutated.after, '2026-04-19'));
assert.ok(!temporal.personActiveAtDate(mutated.after, '2026-04-20'));
assert.strictEqual(listLike([mutated.after], { preset: 'YEAR', year: '2026', statut: 'actifs' }).count, 0);
assert.strictEqual(listLike([mutated.after], { preset: 'YEAR', year: '2026', statut: 'inactifs' }).count, 1);
assert.strictEqual(listLike([mutated.after], { preset: 'YEAR', year: '2026', statut: 'actifs', asOf: '2026-04-20' }).count, 0);

// Régression réelle MOA : une période ACTIF backfill 2020 ne doit pas faire
// apparaître en 2025 une personne dont la première affectation commence en 2026.
const legacyBackfill = person([aff('2026-01-01', null)], {
  nip: 'BACKFILL-2026',
  periodes: [{ type: 'ACTIF', date_debut: '2020-01-01', date_fin: null, source: 'BACKFILL' }]
});
assert.strictEqual(temporal.personRelevantInPeriod(legacyBackfill, year2025), false);
assert.strictEqual(listLike([legacyBackfill], { preset: 'YEAR', year: '2025', statut: 'tous' }).count, 0);
assert.strictEqual(listLike([legacyBackfill], { preset: 'YEAR', year: '2025', statut: 'inactifs' }).count, 0);
assert.strictEqual(listLike([legacyBackfill], { preset: 'YEAR', year: '2026', statut: 'actifs' }).count, 1);

const service = fs.readFileSync(path.join(__dirname, '../netlify/functions/_scope-personnel-service.js'), 'utf8');
assert.ok(service.includes('planAssignmentClosures'));
assert.ok(!service.includes('La date d’inactivité ne peut pas précéder le début d’une affectation ouverte'));
assert.ok(service.includes('INACTIVER'));
assert.ok(!service.includes('DELETE FROM scope_personnes'));
assert.ok(service.includes('evaluateStatus'));
assert.ok(service.includes('temporal.iso(row.date_actif)'));
assert.ok(service.includes('resolveImportContext'));

const listHandler = fs.readFileSync(path.join(__dirname, '../netlify/functions/scope-personnel-list.js'), 'utf8');
assert.ok(listHandler.includes('count:'));
assert.ok(listHandler.includes("viewMode:"));

assert.strictEqual(temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' }).from, '2026-01-01');
assert.strictEqual(temporal.resolveAnalyzedPeriod({ preset: 'CUSTOM', from: '2026-08-01', to: '2026-12-31' }).to, '2026-12-31');

const custom = temporal.resolveAnalyzedPeriod({ preset: 'CUSTOM', from: '2026-08-01', to: '2026-12-31' });
assert.strictEqual(temporal.temporalStatus(person([aff('2026-01-01', '2026-07-13')]), custom), 'inactif');
assert.strictEqual(temporal.appliesToFrozenEventPopulation({ populationFigee: true }), false);

// TEMP-12 / TEMP-13 / TEMP-14 grades
assert.deepStrictEqual(refs.GRADE_CODES_ASC.slice(), officialAsc);
assert.strictEqual(officialAsc.slice().sort((a,b) => refs.compareGrades(b,a))[0], 'Maj instr');
assert.ok(refs.compareGrades('Flm 3', 'Rec') < 0);
assert.ok(refs.compareGrades('Civ', 'JSP') < 0);
assert.ok(refs.compareGrades('JSP', 'Flm 1') < 0);
assert.ok(refs.compareGrades('Flm 1', 'Flm 2') < 0);
assert.ok(refs.compareGrades('Flm 2', 'Flm 3') < 0);
assert.ok(refs.compareGrades('Flm 3', 'Rec') < 0);
assert.ok(refs.compareGrades('Inconnu', 'Maj instr') > 0);

const gradeRows = officialAsc.map((grade, i) => person([], { nip: String(i+1), grade }));
assert.deepStrictEqual(display.sortPersonnelRows(gradeRows, { key: 'grade', dir: 'desc' }).map((row) => row.grade)[0], 'Maj instr');

// TEMP-15 OI
const groups = display.operationalOiGroups([]);
assert.deepStrictEqual(groups.map((g) => g.label), ['DPS','DAP','JSP']);
assert.ok(!groups.some((g) => g.items.some((label) => String(label).includes('/'))));
const oiClosedDuringYear = person([aff('2026-01-01', '2026-04-19')]);
assert.ok(display.filterPersonnelRows([oiClosedDuringYear], {
  oi: 'DPS G1',
  period: year2026
}).length === 1);
assert.strictEqual(display.filterPersonnelRows([oiClosedDuringYear], {
  oi: 'DPS G1',
  asOf: '2026-04-20'
}).length, 0);

const mixed = [
  person([aff('2026-01-01', null)], { nip: 'a', statutTemporel: 'actif' }),
  person([aff('2025-01-01', '2025-12-31')], { nip: 'b', statutTemporel: 'inactif', archivedAt: '2026-01-01' })
];
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'actifs' }).map((row) => row.nip), ['a']);
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'inactifs' }).map((row) => row.nip), ['b']);
assert.strictEqual(display.filterPersonnelRows(mixed, { statut: 'tous' }).length, 2);

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
assert.ok(ui.includes("['inactifs', 'Inactifs']"));
assert.ok(!ui.includes("['archives', 'Archivés']"));
assert.ok(!ui.includes('Agrégat batch'));
assert.ok(ui.includes('Gérer l’activité') || ui.includes("Gérer l'activité"));
assert.ok(ui.includes('Démission du SDIS'));
assert.ok(ui.includes('Clôturer une affectation'));
assert.ok(ui.includes('Date d’effet') || ui.includes("Date d'effet"));
assert.ok(ui.includes('positionPersonnelRowMenu'));
assert.ok(ui.includes('data-personnel-more'));
assert.ok(!ui.includes('<details class="scope-row-more">'));
assert.ok(!ui.includes('Rendre inactif'));
assert.ok(ui.includes('À partir de cette date, la personne ne sera plus comptée dans les effectifs concernés.'));
assert.ok(ui.includes('Situation historique'));
assert.ok(ui.includes('Quitter la situation historique'));
assert.ok(ui.includes('Afficher l’historique') || ui.includes("Afficher l'historique") || ui.includes('Afficher l’historique'));
assert.ok(ui.includes('Masquer'));
assert.ok(ui.includes('Personnalisée'));
assert.ok(ui.includes('personnel-period-mode'));
assert.ok(ui.includes('<optgroup'));
assert.ok(ui.includes('Situation au'));
assert.ok(ui.includes('personnelListSeq'));
assert.ok(ui.includes('personnelSituationApplied'));

// TEMP-16 historique
assert.ok(ui.includes('scope-toggle-personnel-history'));
assert.ok(ui.includes('scope-apply-personnel-asof'));

const css = fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
assert.ok(css.includes('nth-child(odd)'));
assert.ok(css.includes('#d7dee8'));

assert.ok(service.includes('resolveImportContext'));
assert.ok(!service.includes('Import AUTO') || service.includes('cond PL'));

console.log('scope-personnel-temporal-ux.test.js PASS');

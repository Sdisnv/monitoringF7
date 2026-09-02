#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { TYPES_PERIODE, MOTIFS_INDISPONIBLE } = require('../netlify/functions/_scope-personnel');
const { domainesAnneesDataset, personRepartitionDataset } = require('../netlify/functions/_scope-graphs');
const display = require('../assets/js/scope-personnel-display.js');
const temporal = require('../assets/js/scope-personnel-temporal.js');
const logic = require('../assets/js/scope-ui-logic.js');
const charts = require('../assets/js/scope-charts.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'b4', displayName: 'Testeur B4' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0) chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    return _;
  });
  return chunks.join('');
}

function eventColumns(){
  return [
    { key: 'date', type: 'date', value: (row) => row.date, tieBreakers: [{ key: 'libelle', type: 'text', value: (row) => row.libelle }] },
    { key: 'libelle', type: 'text', value: (row) => row.libelle },
    { key: 'domaine', type: 'text', value: (row) => row.domaine },
    { key: 'cible', type: 'text', value: (row) => row.oiAtDate },
    { key: 'statut', type: 'text', value: (row) => display.ficheEventStatutLabel(row) },
    { key: 'informations', type: 'text', value: (row) => display.ficheEventInformations(row) }
  ];
}

async function closeWith(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, ACTOR);
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, ACTOR);
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, ACTOR);
}

(async () => {
  await record('01 — affectation clôturée 01.01→01.01 absente après J', () => {
    const rows = [
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: 'FOBA_3', dateActif: '2026-01-01', dateInactif: '2026-01-01' },
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2', dateActif: '2026-01-01', dateInactif: null }
    ];
    assert.ok(temporal.assignmentCoversDate(rows[0], '2026-01-01'));
    assert.ok(!temporal.assignmentCoversDate(rows[0], '2026-01-02'));
    const after = display.ficheSpecializationView(rows, '2026-01-02');
    assert.deepStrictEqual(after.labels, ['FOBA 2']);
    const onDay = display.ficheSpecializationView(rows, '2026-01-01');
    assert.ok(onDay.labels.includes('FOBA 3'));
    assert.ok(onDay.labels.includes('FOBA 2'));
  });

  await record('02 — affectation ouverte affichée', () => {
    const specs = display.ficheSpecializationView([
      { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01', dateInactif: null }
    ], '2026-09-02');
    assert.deepStrictEqual(specs.labels, ['PAPR']);
  });

  await record('03 — FOBA 2 et FOBA 3 distinctes', () => {
    const specs = display.ficheSpecializationView([
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2', dateActif: '2026-01-01' },
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: 'FOBA_3', dateActif: '2026-01-01' }
    ], '2026-03-01');
    assert.deepStrictEqual(specs.labels, ['FOBA 2', 'FOBA 3']);
  });

  await record('04-06 — tri date / texte / filtres', () => {
    const rows = [
      { date: '2026-03-10', libelle: 'Bravo', domaine: 'DPS', oiAtDate: 'DPS/B1', statutParticipation: 'PRESENT' },
      { date: '2026-01-05', libelle: 'Alpha', domaine: 'FOBA', oiAtDate: 'FOBA/2', statutParticipation: 'DISPENSE' },
      { date: '2026-02-01', libelle: 'Écho', domaine: 'DPS', oiAtDate: 'DPS/B1', statutParticipation: 'ABSENT_EXCUSE', motif: 'prive' }
    ];
    const desc = logic.sortRows(rows, { key: 'date', dir: 'desc' }, eventColumns());
    assert.strictEqual(desc[0].date, '2026-03-10');
    const asc = logic.sortRows(rows, { key: 'date', dir: 'asc' }, eventColumns());
    assert.strictEqual(asc[0].date, '2026-01-05');
    const text = logic.sortRows(rows, { key: 'libelle', dir: 'asc' }, eventColumns());
    assert.strictEqual(text[0].libelle, 'Alpha');
    assert.strictEqual(text[1].libelle, 'Bravo');
    const dps = rows.filter((row) => row.domaine === 'DPS');
    const sorted = logic.sortRows(dps, { key: 'date', dir: 'desc' }, eventColumns());
    assert.strictEqual(sorted.length, 2);
    assert.strictEqual(sorted[0].date, '2026-03-10');
    assert.ok(ui.includes("table === 'personne-events'"));
    assert.ok(ui.includes("sortableHeader('personne-events'"));
  });

  await record('07-11 — KPI, congé, graphiques', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const foba2 = await repo.findCible('FOBA', '2');
    const person = await repo.insertPersonne({
      nip: 'B4KPI', nom: 'Test', prenom: 'Ana', grade: 'Sap', date_entree: '2024-01-01'
    });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dps.cible_id, date_debut: '2024-01-01' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba2.cible_id, date_debut: '2024-01-01' });
    const ev2025 = await service.createEvenement({
      date: '2025-06-10', domaineCode: 'DPS', libelle: 'DPS 2025', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, ev2025.evenement.evenement_id, [person], ['PRESENT']);
    const ev1 = await service.createEvenement({
      date: '2026-03-10', domaineCode: 'DPS', libelle: 'DPS 2026 A', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, ev1.evenement.evenement_id, [person], ['PRESENT']);
    const ev2 = await service.createEvenement({
      date: '2026-04-10', domaineCode: 'DPS', libelle: 'DPS 2026 B', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, ev2.evenement.evenement_id, [person], [{ statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }]);
    const ev3 = await service.createEvenement({
      date: '2026-05-10', domaineCode: 'FOBA', libelle: 'FOBA 2026', cibleIds: [foba2.cible_id]
    }, ACTOR);
    await closeWith(service, ev3.evenement.evenement_id, [person], ['DISPENSE']);
    const fiche = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' });
    const vol = fiche.kpi.volumes;
    const points = ((((fiche.graphs.repartition || {}).series || [])[0] || {}).points) || [];
    const byId = Object.fromEntries(points.map((p) => [p.id, p.value]));
    assert.strictEqual(byId.presents, vol.presents);
    assert.strictEqual(byId.excuses, vol.excuses);
    assert.strictEqual(byId.nonExcuses, vol.nonExcuses);
    assert.strictEqual(byId.dispenses, vol.dispenses);
    assert.strictEqual(points.find((p) => p.id === 'nonExcuses').label, 'Absents');
    assert.ok(!points.some((p) => /renseign/i.test(p.label)));
    const years = fiche.graphs.domainesAnnees;
    assert.ok(years.categories.includes('2025') || (years.series || []).some((s) => (s.points || []).some((p) => p.label === '2025' && p.value != null)));
    const dpsSeries = (years.series || []).find((s) => s.id === 'DPS');
    const focaPoint = ((years.series || []).find((s) => s.id === 'FOCA') || { points: [] }).points
      .find((p) => p.label === '2026');
    assert.ok(!focaPoint || focaPoint.value == null);
    const svg = charts.renderChartCard(years, { explain: false });
    assert.ok(!svg.includes('FOCA · 2026 · 0'));
    const donut = charts.renderChartCard(fiche.graphs.repartition, { variant: 'donut', explain: false });
    assert.ok(donut.includes('Présents') || donut.includes('Excusés') || donut.includes('Dispensés'));

    const kpiBeforeLeave = fiche.kpi.denominator;
    const evLeave = await service.createEvenement({
      date: '2026-08-15', domaineCode: 'DPS', libelle: 'Pendant congé', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, evLeave.evenement.evenement_id, [person], ['PRESENT']);
    await repo.insertPeriode({
      personne_id: person.personne_id,
      type: TYPES_PERIODE.INDISPONIBLE,
      motif: MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE,
      date_debut: '2026-08-01',
      date_fin: '2026-08-31'
    });
    const afterLeave = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' });
    assert.ok(!(afterLeave.evenements || []).some((row) => row.libelle === 'Pendant congé' && Number(row.denominator || 0) > 0));
    assert.ok(Number(afterLeave.kpi.denominator || 0) <= Number(kpiBeforeLeave || 0));
    const evReturn = await service.createEvenement({
      date: '2026-09-15', domaineCode: 'DPS', libelle: 'Après congé', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, evReturn.evenement.evenement_id, [person], ['PRESENT']);
    const afterReturn = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' });
    assert.ok((afterReturn.evenements || []).some((row) => row.libelle === 'Après congé'));
  });

  await record('12-13 — PDF identité, période, KPI, graphiques, historique, multipage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const person = await repo.insertPersonne({
      nip: '29216', nom: 'Rapport', prenom: 'Fiche', grade: 'Sgt', date_entree: '2020-01-01'
    });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dps.cible_id, date_debut: '2020-01-01' });
    for(let i = 1; i <= 28; i += 1){
      const created = await service.createEvenement({
        date: `2026-03-${String(i).padStart(2, '0')}`,
        domaineCode: 'DPS',
        libelle: `Exercice long ${i}`,
        cibleIds: [dps.cible_id]
      }, ACTOR);
      await closeWith(service, created.evenement.evenement_id, [person], [i % 3 === 0 ? 'ABSENT_NON_EXCUSE' : 'PRESENT']);
    }
    const out = await generateReport(repo, {
      kind: 'PERSON',
      personneId: person.personne_id,
      from: '2026-01-01',
      to: '2026-12-31',
      preset: 'YEAR',
      year: '2026'
    }, ACTOR, { generatedAt: '2026-09-02T08:00:00.000Z' });
    const text = pdfText(out.buffer);
    assert.ok(out.buffer.slice(0, 5).toString() === '%PDF-');
    assert.ok(text.includes('Rapport') && text.includes('Fiche') && text.includes('29216'));
    assert.ok(text.includes('Période analysée') || text.includes('01.01.2026'));
    assert.ok(text.includes('Présents') && text.includes('Taux'));
    assert.ok(text.includes('Participation par domaine') || text.includes('domaine et par année'));
    assert.ok(text.includes('Répartition') || text.includes('participations'));
    assert.ok(text.includes('Exercice long 1') && text.includes('Exercice long 28'));
    assert.ok(Number(out.pages) >= 2);
    assert.ok(out.filename.indexOf('29216') >= 0);
  });

  await record('14 — NIP 29215 contrat actif DPS B1 + FOBA 2', () => {
    const rows = [
      { categorie: 'OI', domaine: 'DPS', cible: 'B1', roleDomaine: 'PRINCIPAL', dateActif: '2020-01-01', dateInactif: null },
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2', dateActif: '2026-01-01', dateInactif: null },
      { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: 'FOBA_3', dateActif: '2026-01-01', dateInactif: '2026-01-01' }
    ];
    const specs = display.ficheSpecializationView(rows, '2026-09-02');
    const oi = display.ficheIncorporationRows(rows, { from: '2026-01-01', to: '2026-12-31' }, '2026-09-02');
    assert.deepStrictEqual(specs.labels, ['FOBA 2']);
    assert.ok(oi.some((row) => row.label === 'DPS B1'));
    assert.ok(!specs.labels.includes('FOBA 3'));
    assert.ok(html.includes('scope-personnel-design-b4') || html.includes('scope-events-multisession-1'));
    assert.ok(ui.includes('Retour au personnel'));
    assert.ok(ui.includes('person-export-pdf'));
    assert.ok(ui.includes('ANALYSE INDIVIDUELLE'));
    assert.ok(!ui.includes('scope-person-back-link'));
  });

  await record('15 — dataset sans faux 0 %', () => {
    const ds = domainesAnneesDataset([
      { date: '2026-03-01', domaine: 'DPS', numerator: 1, denominator: 1, percentage: 100, volumes: { presents: 1 } }
    ]);
    const foca = (ds.series || []).find((s) => s.id === 'FOCA');
    assert.ok(!foca);
    const dps = (ds.series || []).find((s) => s.id === 'DPS');
    assert.ok(dps.points.every((p) => p.value !== 0 || p.denominator > 0));
    const empty = personRepartitionDataset({ volumes: {} });
    assert.strictEqual(empty.emptyReason, 'NON_EVALUABLE');
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`SCOPE-PERSONNEL-DESIGN-B4: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PERSONNEL-DESIGN-B4: ${results.length} PASS`);
})();

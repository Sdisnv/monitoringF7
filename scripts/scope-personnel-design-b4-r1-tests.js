#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const {
  domainesAnneesDataset,
  specialisationsAnneesDataset,
  personRepartitionDataset
} = require('../netlify/functions/_scope-graphs');
const charts = require('../assets/js/scope-charts.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'b4r1', displayName: 'Testeur B4-R1' };
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

function yearEvents(count, domaine, prefix){
  const start = 2027 - count;
  const events = [];
  for(let i = 0; i < count; i += 1){
    const year = String(start + i);
    events.push({
      date: `${year}-06-01`,
      domaine,
      numerator: 1,
      denominator: 1,
      percentage: 100,
      volumes: { presents: 1 }
    });
  }
  return events;
}

function specMap(){
  return new Map([
    ['c2', { domaine_code: 'FOBA', niveau_code: '2' }],
    ['c3', { domaine_code: 'FOBA', niveau_code: '3' }]
  ]);
}

(async () => {
  await record('01 — fiche 1 année, axes et barres', () => {
    const ds = domainesAnneesDataset(yearEvents(1, 'DPS'));
    assert.deepStrictEqual(ds.categories, ['2026']);
    assert.strictEqual(ds.type, 'year-series');
    const svg = charts.renderYearSeriesChart(ds, { width: 520, height: 200 });
    assert.ok(svg.includes('2026'));
    assert.ok(svg.includes('<rect'));
    assert.ok(!svg.includes('<polyline'));
  });

  await record('02 — fiche 5 années, années consécutives', () => {
    const ds = domainesAnneesDataset(yearEvents(5, 'DPS'));
    assert.strictEqual(ds.categories.length, 5);
    assert.strictEqual(ds.categories[0], '2022');
    assert.strictEqual(ds.categories[4], '2026');
    const svg = charts.renderYearSeriesChart(ds, { width: 520, height: 200 });
    assert.ok(svg.includes('<rect'));
    assert.ok(ds.series[0].points.every((p) => p.value === 100));
  });

  await record('03 — fiche 10 années, lignes et labels sélectifs', () => {
    const ds = domainesAnneesDataset(yearEvents(10, 'DPS'));
    assert.strictEqual(ds.categories.length, 10);
    const svg = charts.renderYearSeriesChart(ds, { width: 520, height: 200 });
    assert.ok(svg.includes('<polyline'));
    const labels = [...svg.matchAll(/>(20\d{2})</g)].map((m) => m[1]);
    assert.ok(labels.length < 10);
    assert.ok(labels.includes('2017') || svg.includes('2017'));
    assert.ok(svg.includes('2026'));
  });

  await record('04 — domaine sans donnée une année ≠ 0 %', () => {
    const ds = domainesAnneesDataset([
      { date: '2024-03-01', domaine: 'DPS', numerator: 1, denominator: 1, percentage: 100 },
      { date: '2026-03-01', domaine: 'DPS', numerator: 1, denominator: 1, percentage: 100 }
    ]);
    assert.deepStrictEqual(ds.categories, ['2024', '2025', '2026']);
    const dps = ds.series.find((s) => s.id === 'DPS');
    const y2025 = dps.points.find((p) => p.label === '2025');
    assert.ok(y2025);
    assert.strictEqual(y2025.value, null);
    assert.ok(y2025.denominator === 0 || y2025.denominator == null || y2025.value !== 0);
    assert.ok(!(ds.series || []).some((s) => s.id === 'FOCA'));
    const svg = charts.renderYearSeriesChart(ds);
    assert.ok(!svg.includes('DPS · 2025 · 0'));
  });

  await record('05 — spécialisation sans affectation une année ≠ 0 %', () => {
    const ds = specialisationsAnneesDataset([
      { date: '2024-04-01', domaine: 'FOBA', cibleIds: ['c2'], numerator: 1, denominator: 1, percentage: 100 },
      { date: '2026-04-01', domaine: 'FOBA', cibleIds: ['c2'], numerator: 1, denominator: 1, percentage: 100 }
    ], specMap());
    const foba2 = ds.series.find((s) => s.id === 'FOBA_2' || /FOBA/.test(s.label));
    assert.ok(foba2);
    const y2025 = foba2.points.find((p) => p.label === '2025');
    assert.ok(y2025);
    assert.strictEqual(y2025.value, null);
    assert.ok(!(ds.series || []).some((s) => s.id === 'FOBA_3'));
  });

  await record('06 — donut 100 % Présents réellement rendu', () => {
    const ds = personRepartitionDataset({
      volumes: { presents: 6, excuses: 0, nonExcuses: 0, dispenses: 0 }
    });
    const svg = charts.renderDonutChart(ds, { width: 280, height: 220 }, { personLayout: true });
    const full = svg.match(/scope-donut-full/g) || [];
    assert.strictEqual(full.length, 2);
    assert.ok(svg.includes('100 %'));
    assert.ok(svg.includes('Présents'));
    assert.ok(svg.includes('Excusés 0'));
    assert.ok(svg.includes('Absents 0'));
  });

  await record('07 — répartition mixte (pas un anneau unique)', () => {
    const ds = personRepartitionDataset({
      volumes: { presents: 3, excuses: 2, nonExcuses: 1, dispenses: 1 }
    });
    const svg = charts.renderDonutChart(ds, { width: 280, height: 220 }, { personLayout: true });
    assert.ok(!svg.includes('scope-donut-full'));
    assert.ok(svg.includes('Présents'));
    assert.ok(svg.includes('Excusés'));
    assert.ok(svg.includes('Absents'));
    assert.ok(svg.includes('Dispensés'));
  });

  await record('08-12 — PDF 3 graphiques, historique p.2+, libellé, KPI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const foba2 = await repo.findCible('FOBA', '2');
    const person = await repo.insertPersonne({
      nip: 'B4R1A', nom: 'Analyse', prenom: 'Fiche', grade: 'Sap', date_entree: '2017-01-01'
    });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dps.cible_id, date_debut: '2017-01-01' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba2.cible_id, date_debut: '2024-01-01' });
    const evDps = await service.createEvenement({
      date: '2026-03-10', domaineCode: 'DPS', libelle: 'DPS unique', cibleIds: [dps.cible_id]
    }, ACTOR);
    await closeWith(service, evDps.evenement.evenement_id, [person], ['PRESENT']);
    const evFoba = await service.createEvenement({
      date: '2026-04-10', domaineCode: 'FOBA', libelle: 'FOBA unique', cibleIds: [foba2.cible_id]
    }, ACTOR);
    await closeWith(service, evFoba.evenement.evenement_id, [person], ['PRESENT']);
    const fiche = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' });
    assert.ok(fiche.graphs.domainesAnnees);
    assert.ok(fiche.graphs.specialisationsAnnees);
    assert.ok(fiche.graphs.repartition);
    const specSeries = fiche.graphs.specialisationsAnnees.series || [];
    assert.ok(specSeries.some((s) => /FOBA/.test(s.id) || /FOBA/.test(s.label)));
    const vol = fiche.kpi.volumes;
    const points = ((((fiche.graphs.repartition || {}).series || [])[0] || {}).points) || [];
    const byId = Object.fromEntries(points.map((p) => [p.id, p.value]));
    assert.strictEqual(byId.presents, vol.presents);
    assert.strictEqual(byId.excuses, vol.excuses);
    const out = await generateReport(repo, {
      kind: 'PERSON',
      personneId: person.personne_id,
      from: '2026-01-01',
      to: '2026-12-31',
      preset: 'YEAR',
      year: '2026'
    }, ACTOR, { generatedAt: '2026-09-02T08:00:00.000Z' });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Participation par domaine') || text.includes('domaine et par année'));
    assert.ok(text.includes('spécialisation') || text.includes('Spécialisation'));
    assert.ok(text.includes('Répartition'));
    assert.ok(/d[ée]but de l/i.test(text) || text.includes('analyse'));
    assert.ok(!/entr[ée]e SDIS/i.test(text));
    assert.ok(text.includes(String(vol.presents)));
    assert.strictEqual(Number(out.pages), 2);
    const bodySrc = renderer.slice(renderer.indexOf('renderPersonBody'));
    assert.ok(bodySrc.indexOf('this.nextPage()') >= 0);
    assert.ok(bodySrc.indexOf('this.nextPage()') < bodySrc.indexOf('Historique des événements'));
  });

  await record('10 — historique multipage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const person = await repo.insertPersonne({
      nip: 'B4R1B', nom: 'Long', prenom: 'Histo', grade: 'Sgt', date_entree: '2026-01-01'
    });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dps.cible_id, date_debut: '2026-01-01' });
    for(let i = 1; i <= 45; i += 1){
      const created = await service.createEvenement({
        date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
        domaineCode: 'DPS',
        libelle: `Exercice multi ${i}`,
        cibleIds: [dps.cible_id]
      }, ACTOR);
      await closeWith(service, created.evenement.evenement_id, [person], ['PRESENT']);
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
    assert.ok(Number(out.pages) >= 3);
    assert.ok(text.includes('Exercice multi 1') && text.includes('Exercice multi 45'));
  });

  await record('11 — libellé écran et cache-bust', () => {
    assert.ok(ui.includes('Date de début de l’analyse') || ui.includes('DATE DE DÉBUT DE L’ANALYSE'));
    assert.ok(!ui.includes('DATE D’ENTRÉE SDIS'));
    assert.ok(ui.includes('scope-fiche-charts'));
    assert.ok(ui.includes('specialisationsAnnees'));
    assert.ok(html.includes('scope-personnel-design-b4-r1') || html.includes('scope-events-multisession-1'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`SCOPE-PERSONNEL-DESIGN-B4-R1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PERSONNEL-DESIGN-B4-R1: ${results.length} PASS`);
})();

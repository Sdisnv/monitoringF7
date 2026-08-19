#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeDashboardService } = require('../netlify/functions/_scope-dashboard-service');
const { classifyInboxItem } = require('../netlify/functions/_scope-inbox');
const { STATUTS, KINDS, MODES } = require('../netlify/functions/_scope-analytics');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWithStatuses(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

function ctx(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const objectives = createScopeObjectivesService(repo);
  const dashboard = createScopeDashboardService(repo);
  return { repo, service, objectives, dashboard };
}

(async () => {
  await record('KPI officiel NON_EVALUABLE à vide', async () => {
    const { dashboard } = ctx();
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.strictEqual(dash.officiel.percentage, null);
    assert.strictEqual(dash.officiel.eventCount, 0);
    assert.strictEqual(dash.officiel.gapPct, null);
    assert.strictEqual(dash.officiel.objective, null);
    assert.strictEqual(logic.objectiveKpiLabel(dash.officiel).title, 'Aucun objectif défini');
    assert.strictEqual(logic.formatGap(dash.officiel.gapPct), null);
  });

  await record('absence d’objectif : jamais un écart 0 inventé', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'Z1');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Sans objectif', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, evenement.evenement_id, people, [
      ...Array(8).fill('PRESENT'), 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.officiel.eventCount, 1);
    assert.ok(dash.officiel.percentage != null);
    assert.strictEqual(dash.officiel.objective, null);
    assert.strictEqual(dash.officiel.gapPct, null);
    assert.strictEqual(dash.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.notStrictEqual(logic.formatGap(dash.officiel.gapPct), '0,0 pts');
  });

  await record('objectif applicable + écart serveur', async () => {
    const { repo, service, objectives, dashboard } = ctx();
    await objectives.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01'
    }, { sub: 'test' });
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'Z2');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Avec objectif', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, evenement.evenement_id, people, [
      ...Array(9).fill('PRESENT'), 'ABSENT_NON_EXCUSE'
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.officiel.numerator, 9);
    assert.strictEqual(dash.officiel.denominator, 10);
    assert.strictEqual(dash.officiel.percentage, 90);
    assert.strictEqual(dash.officiel.objective.thresholdPct, 80);
    assert.strictEqual(dash.officiel.gapPct, 10);
    assert.strictEqual(dash.officiel.analyticStatus, STATUTS.ATTEINT);
    assert.strictEqual(logic.formatGap(10), '+10,0 pts');
    assert.ok(logic.objectiveKpiLabel(dash.officiel).title.includes('80'));
  });

  await record('période YEAR vs MONTH', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const c1 = await repo.findCible('DPS', 'C1');
    const p1 = await seedPeople(repo, g1.cible_id, 4, 'M1');
    const p2 = await seedPeople(repo, c1.cible_id, 4, 'M2');
    const a = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Mars', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, a.evenement.evenement_id, p1, Array(4).fill('PRESENT'));
    const b = await service.createEvenement({
      date: '2026-06-10', domaineCode: 'DPS', libelle: 'Juin', cibleIds: [c1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, b.evenement.evenement_id, p2, Array(4).fill('PRESENT'));
    const year = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const month = await dashboard.dashboard({ year: 2026, preset: 'MONTH', month: 3 });
    assert.strictEqual(year.officiel.eventCount, 2);
    assert.strictEqual(month.officiel.eventCount, 1);
    assert.strictEqual(month.period.from, '2026-03-01');
    assert.strictEqual(logic.periodParams({ preset: 'MONTH', year: '2026', month: '3' }).month, '3');
  });

  await record('LEGACY séparé du KPI officiel', async () => {
    const { repo, service, dashboard } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await repo.upsertRegleBascule({
      portee: 'CIBLE',
      cible_id: y4.cible_id,
      domaine_code: 'DAP',
      date_bascule: '2026-08-19',
      commentaire: 'Pilote nominatif DAP/Y4'
    });
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.ok(dash.legacy.eventCount >= 8, `legacy ${dash.legacy.eventCount}`);
    assert.strictEqual(dash.officiel.eventCount, 0);
    assert.strictEqual(dash.officiel.percentage, null);
    assert.strictEqual(dash.legacy.globalKpi, null);
    assert.ok((dash.legacy.points || []).every((p) => p.kind === KINDS.LEGACY || p.tauxLegacy != null));
  });

  await record('exercice échu PLANIFIE dans l’inbox', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'Échu planifié', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const item = dash.inbox.find((row) => row.evenementId === created.evenement.evenement_id);
    assert.ok(item, 'inbox attendu');
    assert.ok(['ECHU_PLANIFIE', 'NOMINATIF_NON_FIGE'].includes(item.reasonCode));
    assert.ok(item.cta && item.cta.href.includes(created.evenement.evenement_id));
  });

  await record('nominatif non figé proche/échu', async () => {
    const item = classifyInboxItem({
      evenement: {
        evenement_id: 'e1',
        date: '2026-08-18',
        domaine_code: 'DPS',
        libelle: 'Non figé',
        statut: 'PLANIFIE',
        mode_suivi: 'NOMINATIF',
        population_figee: false
      }
    }, { today: '2026-08-19' });
    assert.strictEqual(item.reasonCode, 'NOMINATIF_NON_FIGE');
    assert.strictEqual(item.cta.label, 'Figer la population');
  });

  await record('saisie nominative NON_RENSEIGNE', async () => {
    const { repo, service } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    await seedPeople(repo, g1.cible_id, 3, 'NR');
    const created = await service.createEvenement({
      date: '2026-08-10', domaineCode: 'DPS', libelle: 'Saisie ouverte', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const evenement = await repo.getEvent(created.evenement.evenement_id);
    const item = classifyInboxItem({ evenement }, {
      today: '2026-08-19',
      attendus: await repo.listAttendus(evenement.evenement_id),
      participations: await repo.listParticipations(evenement.evenement_id)
    });
    assert.strictEqual(item.reasonCode, 'SAISIE_NON_RENSEIGNE');
    assert.strictEqual(item.cta.label, 'Compléter la saisie');
  });

  await record('quantitatif incomplet', async () => {
    const item = classifyInboxItem({
      evenement: {
        evenement_id: 'q1',
        date: '2026-09-01',
        domaine_code: 'FOBA',
        libelle: 'QTT',
        statut: 'PLANIFIE',
        mode_suivi: MODES.QUANTITATIF
      }
    }, { today: '2026-08-19', saisie: null });
    assert.strictEqual(item.reasonCode, 'QUANTITATIF_INCOMPLET');
    assert.strictEqual(item.cta.label, 'Saisir les présences');
  });

  await record('ANNULE et REPORTE exclus du KPI et de l’inbox', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'AN');
    const closed = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Réalisé', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, closed.evenement.evenement_id, people, Array(4).fill('PRESENT'));
    const nom = await service.createEvenement({
      date: '2026-04-01', domaineCode: 'DPS', libelle: 'TEST ANNULE DASH', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.annulerEvenement(nom.evenement.evenement_id, { baseVersion: 1, motif: 'Qualification' }, { sub: 'test' });
    const rep = await service.createEvenement({
      date: '2026-04-02', domaineCode: 'DPS', libelle: 'TEST REPORTE DASH', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await repo.updateEventIfVersion(rep.evenement.evenement_id, 1, { statut: 'REPORTE' });
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(dash.officiel.eventCount, 1);
    assert.ok(!dash.inbox.some((row) => row.evenementId === nom.evenement.evenement_id));
    assert.ok(!dash.inbox.some((row) => row.evenementId === rep.evenement.evenement_id));
    assert.ok((dash.explain.excludedEvents || []).some((e) => e.evenementId === nom.evenement.evenement_id));
    assert.ok((dash.explain.excludedEvents || []).some((e) => e.evenementId === rep.evenement.evenement_id));
  });

  await record('drill-down domaine', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 5, 'DR');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'DPS only', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(5).fill('PRESENT'));
    const sdis = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(sdis.domaines.length, 8);
    const dpsCard = sdis.domaines.find((d) => d.code === 'DPS');
    assert.strictEqual(dpsCard.officiel.eventCount, 1);
    const foba = sdis.domaines.find((d) => d.code === 'FOBA');
    assert.strictEqual(foba.officiel.eventCount, 0);
    const dps = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'DPS' });
    assert.strictEqual(dps.domaines.length, 0);
    assert.ok(dps.cibles.length >= 1);
    assert.strictEqual(dps.officiel.eventCount, 1);
    assert.strictEqual(logic.parseHash('#/vue/DAP/Y4').domaine, 'DAP');
    assert.strictEqual(logic.parseHash('#/vue/DAP/Y4').cible, 'Y4');
  });

  await record('explain cohérent avec le KPI', async () => {
    const { repo, service, objectives, dashboard } = ctx();
    await objectives.createObjectif({
      portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-01-01'
    }, { sub: 'test' });
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'EX');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Explain', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      ...Array(8).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' },
      'DISPENSE'
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.explain.totals.numerator, dash.officiel.numerator);
    assert.strictEqual(dash.explain.totals.denominator, dash.officiel.denominator);
    assert.strictEqual(dash.explain.analyticStatus, dash.officiel.analyticStatus);
    assert.strictEqual(dash.explain.includedEvents.length, 1);
    assert.ok(dash.explain.exclusions.dispenses >= 1);
    assert.strictEqual(dash.officiel.denominator, 9);
  });

  await record('aucun calcul officiel frontend', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(!ui.includes('computeTaux'));
    assert.ok(!ui.includes('officialFromQuantitatif'));
    assert.ok(!ui.includes('safePercentage'));
    assert.ok(!ui.includes('officialFromTaux'));
    assert.ok(ui.includes('client.dashboard'));
    assert.ok(ui.includes('EXERCICES À TRAITER') || ui.includes('Exercices à traiter'));
    assert.ok(ui.includes('Comprendre ce chiffre'));
    assert.match(css, /height:\s*68px/);
    assert.ok(68 >= Math.ceil(52 * 1.25));
    const chart = logic.participationChartSvg(
      [{ month: '2026-01', percentage: 80, thresholdPct: 85 }, { month: '2026-02', percentage: 90, thresholdPct: 85 }],
      [{ date: '2026-01-15', tauxLegacy: 70 }]
    );
    assert.ok(chart.includes('polyline'));
    assert.ok(chart.includes('circle'));
    assert.ok(!chart.includes('moyenne'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

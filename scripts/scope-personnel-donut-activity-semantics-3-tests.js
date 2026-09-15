#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-DONUT-ACTIVITY-SEMANTICS-3 */

const assert = require('assert');
const charts = require('../assets/js/scope-charts.js');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { personRepartitionDataset } = require('../netlify/lib/_scope-graphs');
const display = require('../assets/js/scope-personnel-display.js');

const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'CUSTOM' };

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function person(repo, id, nip, cibleId, extra = {}){
  const row = await repo.insertPersonne(Object.assign({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: extra.grade || 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  }, extra.personne || {}));
  if(cibleId){
    await repo.insertAffectation({ personne_id: row.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  }
  for(const aff of extra.affectations || []){
    await repo.insertAffectation(Object.assign({
      personne_id: row.personne_id,
      date_debut: '2026-01-01'
    }, aff));
  }
  return row;
}

async function eventRow(repo, spec){
  const event = await repo.insertEvenement({
    evenement_id: spec.id,
    date: spec.date,
    domaine_code: spec.domaine,
    libelle: spec.libelle,
    code_cours: spec.id,
    statut: spec.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    cible_ids: [spec.cibleId],
    hidden_at: spec.hidden_at || null,
    pr_exercise_group_key: spec.groupKey || null,
    pr_session_key: spec.sessionKey || null
  });
  await repo.setEventCibles(event.evenement_id, [spec.cibleId]);
  return event;
}

async function expectPerson(repo, eventId, personneId){
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personneId, inclus: true, origine: 'REGLE' });
}

async function participate(repo, eventId, personneId, statut, extra = {}){
  await repo.upsertParticipation(Object.assign({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: extra.role || 'PARTICIPANT',
    source: extra.source || 'SAISIE'
  }, extra.patch || {}));
}

function donutCenter(svg){
  const match = String(svg || '').match(/font-weight="700"[^>]*>([^<]+)</);
  return match ? match[1] : null;
}

function donutCenterLabel(svg){
  const match = String(svg || '').match(/fill="#6b7280">([^<]+)</);
  return match ? match[1] : null;
}

function renderFicheDonut(fiche){
  const kpi = fiche.kpi || {};
  return charts.renderDonutChart(fiche.graphs.repartition, { width: 420, height: 210 }, {
    personLayout: true,
    centerLabel: 'Taux',
    officialPercentage: kpi.percentage
  });
}

function legendHas(svg, label, value){
  const escaped = String(svg || '');
  return escaped.includes(`${label} ${value}`) || escaped.includes(`${label} : ${value}`);
}

(async () => {
  await record('CAS 1 — participant 100 % sans encadrement : centre 100 %', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'donut-p100', '37001', cible.cible_id);
    const event = await eventRow(repo, {
      id: 'donut-dps-100',
      date: '2026-03-01',
      domaine: 'DPS',
      libelle: 'DPS présent',
      cibleId: cible.cible_id
    });
    await expectPerson(repo, event.evenement_id, p.personne_id);
    await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.percentage, 100);
    eq(fiche.kpi.numerator, 1);
    eq(Number((fiche.kpi.volumes || {}).encadrementRealise || 0), 0);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '100 %');
    eq(donutCenterLabel(svg), 'Taux');
    ok(legendHas(svg, 'Présents', 1));
    ok(!svg.includes('Encadrement'));
  });

  await record('CAS 2 — participant avec excuse : centre = KPI officiel', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'donut-exc', '37002', cible.cible_id);
    const present = await eventRow(repo, {
      id: 'donut-dps-p',
      date: '2026-03-02',
      domaine: 'DPS',
      libelle: 'DPS présent',
      cibleId: cible.cible_id
    });
    const excuse = await eventRow(repo, {
      id: 'donut-dps-e',
      date: '2026-03-09',
      domaine: 'DPS',
      libelle: 'DPS excusé',
      cibleId: cible.cible_id
    });
    await expectPerson(repo, present.evenement_id, p.personne_id);
    await participate(repo, present.evenement_id, p.personne_id, 'PRESENT');
    await expectPerson(repo, excuse.evenement_id, p.personne_id);
    await participate(repo, excuse.evenement_id, p.personne_id, 'ABSENT_EXCUSE', { patch: { motif_absence: 'PRIVE' } });
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 2);
    eq(fiche.kpi.percentage, 50);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), charts.formatPct(fiche.kpi.percentage));
    eq(donutCenter(svg), '50 %');
    ok(legendHas(svg, 'Présents', 1));
    ok(legendHas(svg, 'Excusés', 1));
  });

  await record('CAS 3 — Formateur + participations : centre = KPI, légende composition conservée', async () => {
    const repo = createMemoryRepo();
    const foba = await repo.findCible('FOBA', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'donut-mix', '37003', foba.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    for(let i = 1; i <= 2; i += 1){
      const event = await eventRow(repo, {
        id: `donut-foba-${i}`,
        date: `2026-03-0${i}`,
        domaine: 'FOBA',
        libelle: `FOBA ${i}`,
        cibleId: foba.cible_id
      });
      await participate(repo, event.evenement_id, p.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const dpsEvent = await eventRow(repo, {
      id: 'donut-dps-mix',
      date: '2026-04-01',
      domaine: 'DPS',
      libelle: 'DPS 1',
      cibleId: dps.cible_id
    });
    await expectPerson(repo, dpsEvent.evenement_id, p.personne_id);
    await participate(repo, dpsEvent.evenement_id, p.personne_id, 'PRESENT');
    const excuseEvent = await eventRow(repo, {
      id: 'donut-dps-exc',
      date: '2026-04-08',
      domaine: 'DPS',
      libelle: 'DPS 2',
      cibleId: dps.cible_id
    });
    await expectPerson(repo, excuseEvent.evenement_id, p.personne_id);
    await participate(repo, excuseEvent.evenement_id, p.personne_id, 'ABSENT_EXCUSE', { patch: { motif_absence: 'PRIVE' } });
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.eventCount, 4);
    eq(fiche.kpi.numerator, 3);
    eq(fiche.kpi.denominator, 4);
    eq(fiche.kpi.percentage, 75);
    eq(Number((fiche.kpi.volumes || {}).presents || 0), 1);
    eq(Number((fiche.kpi.volumes || {}).encadrementRealise || 0), 2);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '75 %');
    ok(!svg.includes('25 %') || svg.includes('Présents 1'), 'le centre n’est pas la part Présents');
    eq(donutCenter(svg), charts.formatPct(fiche.kpi.percentage));
    ok(legendHas(svg, 'Présents', 1));
    ok(legendHas(svg, 'Excusés', 1));
    ok(legendHas(svg, 'Encadrement', 2));
    ok(svg.includes('Présents 1 — 25 %') || svg.includes('Présents 1 — 25%'));
    ok(svg.includes('Encadrement 2 — 50 %') || svg.includes('Encadrement 2 — 50%'));
  });

  await record('CAS 4 — Moniteur JSP : activité personnelle, centre = KPI officiel', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeune = await person(repo, 'donut-jsp-j', '37011', jsp.cible_id, { grade: 'Cadet' });
    const moniteur = await person(repo, 'donut-jsp-m', '37012', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    const event = await eventRow(repo, {
      id: 'donut-jsp-4',
      date: '2026-04-22',
      domaine: 'JSP',
      libelle: 'JSP 4',
      cibleId: jsp.cible_id
    });
    await expectPerson(repo, event.evenement_id, jeune.personne_id);
    await participate(repo, event.evenement_id, jeune.personne_id, 'PRESENT');
    await participate(repo, event.evenement_id, moniteur.personne_id, 'NON_CONCERNE', {
      role: 'MONITEUR',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(moniteur.personne_id, PERIOD);
    eq(fiche.kpi.percentage, 100);
    eq(fiche.kpi.numerator, 1);
    eq(Number((fiche.kpi.volumes || {}).presents || 0), 0);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '100 %');
    ok(legendHas(svg, 'Encadrement', 1));
    ok(!legendHas(svg, 'Présents', 1));
  });

  await record('CAS 5 — dispense : centre conforme au KPI, sans recalcul depuis le donut', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'donut-disp', '37021', cible.cible_id);
    const present = await eventRow(repo, {
      id: 'donut-disp-p',
      date: '2026-05-01',
      domaine: 'DPS',
      libelle: 'DPS présent',
      cibleId: cible.cible_id
    });
    const disp = await eventRow(repo, {
      id: 'donut-disp-d',
      date: '2026-05-08',
      domaine: 'DPS',
      libelle: 'DPS dispensé',
      cibleId: cible.cible_id
    });
    await expectPerson(repo, present.evenement_id, p.personne_id);
    await participate(repo, present.evenement_id, p.personne_id, 'PRESENT');
    await expectPerson(repo, disp.evenement_id, p.personne_id);
    await participate(repo, disp.evenement_id, p.personne_id, 'DISPENSE');
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 1);
    eq(fiche.kpi.percentage, 100);
    eq(Number((fiche.kpi.volumes || {}).dispenses || 0), 1);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '100 %');
    ok(legendHas(svg, 'Présents', 1));
    ok(legendHas(svg, 'Dispensés', 1));
    const presentShare = 100 * 1 / 2;
    ok(svg.includes(`Présents 1 — ${presentShare.toFixed(0)} %`));
    ok(donutCenter(svg) !== `${presentShare.toFixed(1).replace('.', ',')} %`);
  });

  await record('CAS 6 — denominator = 0 : pas de 100 % inventé', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'donut-zero', '37022', cible.cible_id);
    const event = await eventRow(repo, {
      id: 'donut-only-disp',
      date: '2026-05-15',
      domaine: 'DPS',
      libelle: 'DPS seulement dispensé',
      cibleId: cible.cible_id
    });
    await expectPerson(repo, event.evenement_id, p.personne_id);
    await participate(repo, event.evenement_id, p.personne_id, 'DISPENSE');
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.denominator, 0);
    eq(fiche.kpi.percentage, null);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), 'Non évaluable');
    ok(!String(donutCenter(svg)).includes('100'));
    ok(legendHas(svg, 'Dispensés', 1));
  });

  await record('CAS 7 — PLANIFIÉ avec rôle : KPI inchangé, hors donut réalisé', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('FOBA', '2');
    const trainer = await person(repo, 'donut-plan', '37031', cible.cible_id);
    const planned = await eventRow(repo, {
      id: 'donut-plan-1',
      date: '2026-11-12',
      domaine: 'FOBA',
      libelle: 'FOBA planifié formateur',
      cibleId: cible.cible_id,
      statut: 'PLANIFIE'
    });
    await participate(repo, planned.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
      role: 'FORMATEUR',
      source: 'ENCADREMENT'
    });
    const realized = await eventRow(repo, {
      id: 'donut-plan-real',
      date: '2026-03-20',
      domaine: 'FOBA',
      libelle: 'FOBA 6',
      cibleId: cible.cible_id
    });
    await participate(repo, realized.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
      role: 'FORMATEUR',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    eq(fiche.kpi.eventCount, 1);
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.percentage, 100);
    eq(display.ficheEventStatutLabel(fiche.evenements.find((row) => row.planned)), 'Planifié');
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '100 %');
  });

  await record('CAS 8 — MULTI_SESSION : consolidation inchangée, centre = KPI 1/1', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'donut-pr', '37041', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:DONUT';
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `donut-pr-${i}`,
        date: `2026-06-0${i}`,
        domaine: 'PR',
        libelle: `PR 5.${i}`,
        cibleId: cible.cible_id,
        groupKey,
        sessionKey: `${groupKey}.${i}`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    eq(fiche.evenements.length, 3);
    eq(fiche.kpi.eventCount, 1);
    eq(fiche.kpi.percentage, 100);
    const svg = renderFicheDonut(fiche);
    eq(donutCenter(svg), '100 %');
  });

  await record('CAS 9 — dataset MOA-like : centre 93,8 %, légende composition 31 / 6 / 63', () => {
    const ds = personRepartitionDataset({
      percentage: 93.8,
      numerator: 15,
      denominator: 16,
      volumes: { presents: 5, excuses: 1, nonExcuses: 0, dispenses: 0, encadrementRealise: 10 }
    });
    const svg = charts.renderDonutChart(ds, { width: 420, height: 210 }, {
      personLayout: true,
      centerLabel: 'Taux',
      officialPercentage: ds.percentage
    });
    eq(donutCenter(svg), '93,8 %');
    eq(donutCenterLabel(svg), 'Taux');
    ok(svg.includes('Présents 5 — 31 %'));
    ok(svg.includes('Excusés 1 — 6 %'));
    ok(svg.includes('Encadrement 10 — 63 %'));
    ok(!svg.includes('31,3 %'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - failed.length}/${results.length} tests PASS — ${assertions} assertions`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

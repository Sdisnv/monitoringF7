#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { createScopeDashboardService } = require('../netlify/lib/_scope-dashboard-service');
const { ALERTS_CONFIG, CODES } = require('../netlify/lib/_scope-alerts');

const ROOT = path.join(__dirname, '..');
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

async function person(repo, id, nip, extra = {}){
  return repo.insertPersonne({
    personne_id: id,
    nip,
    nom: extra.nom || id,
    prenom: extra.prenom || 'Test',
    grade: extra.grade || 'Sap',
    date_entree: extra.date_entree || '2020-01-01',
    date_sortie: extra.date_sortie || null
  });
}

async function event(repo, id, domain, date, extra = {}){
  const cible = extra.cible || await repo.findCible(domain === 'PR' || domain === 'AUTO' ? 'FOSPEC' : domain, extra.niveau || 'GEN');
  const ev = await repo.insertEvenement({
    evenement_id: id,
    date,
    domaine_code: domain,
    sous_domaine_code: extra.sous_domaine_code || null,
    libelle: extra.libelle || `${domain} ${id}`,
    statut: extra.statut || 'REALISE',
    mode_suivi: extra.mode_suivi || 'NOMINATIF',
    origine: 'NOMINATIF',
    code_cours: extra.code_cours || id,
    cycle_id: extra.cycle_id || null,
    pr_exercise_group_key: extra.pr_exercise_group_key || null,
    pr_session_key: extra.pr_session_key || null,
    cible_ids: cible ? [cible.cible_id] : []
  });
  return repo.updateEventIfVersion(ev.evenement_id, ev.version, { population_figee: extra.population_figee !== false });
}

async function attendu(repo, eventId, personId){
  return repo.upsertAttendu({ evenement_id: eventId, personne_id: personId, inclus: true, origine: 'TEST' });
}

async function participation(repo, eventId, personId, statut, extra = {}){
  return repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personId,
    statut,
    role: extra.role || 'PARTICIPANT',
    motif_absence: extra.motif_absence || null,
    source: 'TEST'
  });
}

async function seedRepo(){
  const repo = createMemoryRepo();
  const g1 = await repo.findCible('DPS', 'G1');
  await repo.insertObjectif({
    objectif_id: 'obj-dps-2026',
    portee: 'DOMAINE',
    domaine_code: 'DPS',
    cible_id: null,
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
    seuil_pct: 75,
    actif: true
  });

  const low = await person(repo, 'p-low', '910001', { nom: 'Bas', prenom: 'Objectif', grade: 'Sdt' });
  const okPerson = await person(repo, 'p-ok', '910002', { nom: 'Atteint', prenom: 'Objectif', grade: 'Lt' });
  const abs = await person(repo, 'p-abs', '910003', { nom: 'Absent', prenom: 'Nonexcuse', grade: 'Cpl' });
  const open = await person(repo, 'p-open', '910004', { nom: 'Donnee', prenom: 'Ouverte' });
  const future = await person(repo, 'p-future', '910005', { nom: 'Futur', prenom: 'Temporel', date_entree: '2026-07-01' });
  const left = await person(repo, 'p-left', '910006', { nom: 'Sorti', prenom: 'Temporel', date_sortie: '2026-05-31' });
  const noObjective = await person(repo, 'p-no-objective', '910007', { nom: 'Sans', prenom: 'Objectif' });
  const jspMonitor = await person(repo, 'p-jsp-monitor', '910008', { nom: 'Moniteur', prenom: 'JSP' });
  const dapPermutation = await person(repo, 'p-dap-permutation', '910009', { nom: 'Permutation', prenom: 'DAP' });
  const prRaw = await person(repo, 'p-pr-raw', '910010', { nom: 'Session', prenom: 'PR' });
  const prCycle = await person(repo, 'p-pr-cycle', '910011', { nom: 'Cycle', prenom: 'PR' });

  const e1 = await event(repo, 'dps-1', 'DPS', '2026-03-01', { cible: g1 });
  const e2 = await event(repo, 'dps-2', 'DPS', '2026-04-01', { cible: g1 });
  const e3 = await event(repo, 'dps-3', 'DPS', '2026-05-01', { cible: g1 });
  for(const p of [low, okPerson, abs]){
    for(const ev of [e1, e2, e3]) await attendu(repo, ev.evenement_id, p.personne_id);
  }
  await participation(repo, e1.evenement_id, low.personne_id, 'PRESENT');
  await participation(repo, e2.evenement_id, low.personne_id, 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' });
  await participation(repo, e3.evenement_id, low.personne_id, 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' });
  for(const ev of [e1, e2, e3]) await participation(repo, ev.evenement_id, okPerson.personne_id, 'PRESENT');
  await participation(repo, e1.evenement_id, abs.personne_id, 'PRESENT');
  await participation(repo, e2.evenement_id, abs.personne_id, 'ABSENT_NON_EXCUSE');
  await participation(repo, e3.evenement_id, abs.personne_id, 'PRESENT');

  const openEvent = await event(repo, 'dps-open', 'DPS', '2026-02-01', { cible: g1, statut: 'PLANIFIE' });
  await attendu(repo, openEvent.evenement_id, open.personne_id);
  await participation(repo, openEvent.evenement_id, open.personne_id, 'NON_RENSEIGNE');

  const temporalEvent = await event(repo, 'dps-temporal', 'DPS', '2026-06-01', { cible: g1 });
  for(const p of [future, left]) {
    await attendu(repo, temporalEvent.evenement_id, p.personne_id);
    await participation(repo, temporalEvent.evenement_id, p.personne_id, 'ABSENT_NON_EXCUSE');
  }

  const foca = await repo.findCible('FOCA', 'I');
  const noObjEvent = await event(repo, 'foca-no-objective', 'FOCA', '2026-03-05', { cible: foca, niveau: 'I' });
  await attendu(repo, noObjEvent.evenement_id, noObjective.personne_id);
  await participation(repo, noObjEvent.evenement_id, noObjective.personne_id, 'ABSENT_EXCUSE', { motif_absence: 'ARMEE' });

  const jsp = await event(repo, 'jsp-monitor', 'JSP', '2026-03-10');
  await participation(repo, jsp.evenement_id, jspMonitor.personne_id, 'ABSENT_NON_EXCUSE', { role: 'MONITEUR' });

  const dap = await event(repo, 'dap-permutation', 'DAP', '2026-03-11');
  await attendu(repo, dap.evenement_id, dapPermutation.personne_id);
  await participation(repo, dap.evenement_id, dapPermutation.personne_id, 'PERMUTATION');

  await repo.insertCycle({
    cycle_id: 'cycle-pr-vigilance',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR GEN',
    libelle: 'Cycle PR vigilance',
    statut: 'REALISE',
    date_debut: '2026-01-01',
    date_fin: '2026-12-31'
  });
  const pr = await event(repo, 'pr-session-raw', 'PR', '2026-09-01', {
    cycle_id: 'cycle-pr-vigilance',
    pr_exercise_group_key: 'cycle-pr-vigilance:1',
    pr_session_key: 'cycle-pr-vigilance:1.1'
  });
  await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-vigilance', personne_id: prRaw.personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-vigilance', personne_id: prCycle.personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  await attendu(repo, pr.evenement_id, prRaw.personne_id);
  await attendu(repo, pr.evenement_id, prCycle.personne_id);
  await participation(repo, pr.evenement_id, prRaw.personne_id, 'ABSENT_NON_EXCUSE');

  return { repo, ids: { low: low.personne_id, ok: okPerson.personne_id, abs: abs.personne_id, open: open.personne_id, future: future.personne_id, left: left.personne_id, prRaw: prRaw.personne_id, prCycle: prCycle.personne_id } };
}

function uiHooks(){
  const code = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const logic = require('../assets/js/scope-ui-logic.js');
  const root = { innerHTML: '', classList: { toggle(){}, add(){}, remove(){} } };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    URLSearchParams,
    location: { hash: '#/vigilance', search: '' },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    document: {
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      getElementById(id){ return id === 'scope-root' ? root : { innerHTML: '', classList: { toggle(){}, add(){}, remove(){} }, addEventListener(){}, dataset: {} }; },
      addEventListener(){},
      body: { addEventListener(){}, classList: { toggle(){}, add(){}, remove(){} } }
    },
    window: {
      __SCOPE_UI_TEST_HOOKS__: true,
      ScopeUiLogic: logic,
      ScopeCharts: null,
      location: { hash: '#/vigilance', search: '' },
      addEventListener(){},
      document: null,
      localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    }
  };
  context.window.document = context.document;
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'scope-ui.js' });
  return context.window.ScopeUiTestHooks;
}

(async () => {
  await record('configuration — vigilances individuelles actives sans seuil métier arbitraire', async () => {
    eq(ALERTS_CONFIG.personUnderObjective.enabled, true);
    eq(ALERTS_CONFIG.repeatedUnexcusedAbsences.enabled, true);
    eq(ALERTS_CONFIG.repeatedUnexcusedAbsences.threshold, null);
  });

  await record('service — catégories personne/donnée et objectifs officiels uniquement', async () => {
    const { repo, ids } = await seedRepo();
    const alerts = createScopeAlertsService(repo);
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-09-06' });
    const low = listed.alerts.find((a) => a.code === CODES.PERSONNE_SOUS_OBJECTIF && a.personId === ids.low);
    ok(low, 'personne sous objectif absente');
    eq(low.level, 'P1');
    eq(low.category, 'VIGILANCE_PERSONNE');
    eq(low.metadata.thresholdPct, 75);
    ok(Number(low.metadata.gapPct) < 0);
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_SOUS_OBJECTIF && a.personId === ids.ok), 'personne au-dessus objectif signalée');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_SOUS_OBJECTIF && a.personId === ids.open), 'donnée incomplète transformée en sous-objectif personne');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_SOUS_OBJECTIF && a.personId === 'p-no-objective'), 'absence objectif transformée en sous-objectif personne');
  });

  await record('service — absences non excusées factuelles, temporalité et rôles hors effectif', async () => {
    const { repo, ids } = await seedRepo();
    const listed = await createScopeAlertsService(repo).listAlerts({ year: 2026, preset: 'YEAR', today: '2026-09-06' });
    const absence = listed.alerts.find((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && a.personId === ids.abs);
    ok(absence, 'absence non excusée attendue');
    eq(absence.level, 'P1');
    eq(absence.category, 'VIGILANCE_PERSONNE');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && a.personId === ids.future), 'entrée future signalée');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && a.personId === ids.left), 'sortie passée signalée');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && /jsp/i.test(a.entityId)), 'moniteur JSP signalé');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && /dap/i.test(a.entityId)), 'permutation DAP signalée');
    ok(!listed.alerts.some((a) => a.code === CODES.PERSONNE_ABSENCE_NON_EXCUSEE && a.personId === ids.prRaw), 'absence brute PR multi-session signalée hors pilotage cycle');
  });

  await record('service — cycles PR incomplets et données à compléter séparés', async () => {
    const { repo, ids } = await seedRepo();
    const listed = await createScopeAlertsService(repo).listAlerts({ year: 2026, preset: 'YEAR', today: '2026-09-06' });
    const cycle = listed.alerts.find((a) => a.code === CODES.CYCLE_INCOMPLET && a.personId === ids.prCycle);
    ok(cycle, 'cycle incomplet attendu');
    eq(cycle.category, 'VIGILANCE_PERSONNE');
    eq(cycle.metadata.vigilanceType, 'CYCLE_INCOMPLET');
    const data = listed.alerts.find((a) => a.code === CODES.SAISIE_NON_RENSEIGNE);
    ok(data, 'donnée à compléter attendue');
    eq(data.category, 'VIGILANCE_DONNEE');
    eq(data.metadata.vigilanceType, 'DONNEES_A_COMPLETER');
  });

  await record('service — filtres période/domaine/type/priorité et compteur dashboard cohérents', async () => {
    const { repo } = await seedRepo();
    const alerts = createScopeAlertsService(repo);
    const dps = await alerts.listAlerts({ year: 2026, preset: 'YEAR', domaine: 'DPS', type: 'SOUS_OBJECTIF', level: 'P1', today: '2026-09-06' });
    ok(dps.alerts.length >= 1);
    ok(dps.alerts.every((a) => a.domainCode === 'DPS' && a.level === 'P1' && a.metadata.vigilanceType === 'SOUS_OBJECTIF'));
    const dashboard = await createScopeDashboardService(repo).dashboard({ year: 2026, preset: 'YEAR', today: '2026-09-06' });
    const all = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-09-06' });
    eq(dashboard.alerts.counts.active, all.counts.active);
    eq(all.counts.active, all.counts.p0 + all.counts.p1);
  });

  await record('UI — route, page, colonnes et filtres vigilance', async () => {
    const logic = require('../assets/js/scope-ui-logic.js');
    eq(logic.parseHash('#/vigilance').screen, 'vigilance');
    eq(logic.parseHash('#/vigilance').nav, 'vigilance');
    const hooks = uiHooks();
    const html = hooks.renderVigilanceHtml({
      counts: { active: 2, people: 1, data: 1, p2: 0 },
      alerts: [{
        code: CODES.PERSONNE_SOUS_OBJECTIF,
        level: 'P1',
        category: 'VIGILANCE_PERSONNE',
        title: 'Sap Bas Objectif',
        message: 'Participation sous objectif',
        domainCode: 'DPS',
        actionHref: '#/personnel/p-low',
        actionLabel: 'Ouvrir la fiche',
        metadata: { vigilanceType: 'SOUS_OBJECTIF', grade: 'Sap', nom: 'Bas', prenom: 'Objectif', nip: '910001', percentage: 33.3, thresholdPct: 75, gapPct: -41.7, cibles: [{ domaineCode: 'DPS', niveauCode: 'G1' }] }
      }]
    });
    ok(html.includes('Vigilance participation'));
    ok(html.includes('Priorité') && html.includes('Personne') && html.includes('OI / spécialisation') && html.includes('Référence') && html.includes('Écart'));
    ok(html.includes('vigilance-filter-domaine') && html.includes('vigilance-filter-oi') && html.includes('vigilance-filter-specialisation'));
    ok(html.includes('Participation sous objectif') && html.includes('Objectif 75,0 %'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}`);
    if(result.proof) console.log(result.proof);
  }
  if(failed.length){
    console.error(`\nSCOPE-VIGILANCE-PARTICIPATION-1: ${failed.length} test(s) en échec / ${results.length}`);
    process.exit(1);
  }
  console.log(`\nSCOPE-VIGILANCE-PARTICIPATION-1: ${results.length} tests PASS, ${assertions} assertions`);
})();

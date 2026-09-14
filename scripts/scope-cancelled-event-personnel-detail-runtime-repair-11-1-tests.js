#!/usr/bin/env node
'use strict';

/** SCOPE — CANCELLED-EVENT-PERSONNEL-DETAIL-RUNTIME-REPAIR-11.1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const TOKEN = 'scope-cancelled-event-personnel-detail-runtime-repair-11-1';
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const PERIOD = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

function extractNamedFunction(src, name){
  const start = src.indexOf(`function ${name}`);
  if(start < 0) throw new Error(`missing ${name}`);
  let i = src.indexOf('{', start);
  let depth = 0;
  let inStr = null;
  let esc = false;
  for(; i < src.length; i += 1){
    const ch = src[i];
    if(inStr){
      if(esc){ esc = false; continue; }
      if(ch === '\\'){ esc = true; continue; }
      if(ch === inStr) inStr = null;
      continue;
    }
    if(ch === '"' || ch === "'" || ch === '`'){ inStr = ch; continue; }
    if(ch === '{') depth += 1;
    else if(ch === '}'){
      depth -= 1;
      if(depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

function runPersonEventsFiltered(fiche, stateOverrides){
  const displayMod = require('../assets/js/scope-personnel-display.js');
  const fn = extractNamedFunction(read('assets/js/scope-ui.js'), 'personEventsFiltered');
  const sandbox = {
    state: Object.assign({
      personneEventFilter: 'tout',
      personneDomainFilter: null,
      personneEventSort: null
    }, stateOverrides || {}),
    personnelDisplay(){ return displayMod; },
    L: { sortRows: null },
    fiche
  };
  vm.runInNewContext(`'use strict';\n${fn}\nthis.result = personEventsFiltered(this.fiche);`, sandbox, {
    filename: 'personEventsFiltered.js'
  });
  return sandbox.result;
}

function graphEventCount(dataset){
  const series = (dataset && dataset.series) || [];
  return series.reduce((sum, row) => {
    const points = row.points || [];
    return sum + points.reduce((inner, point) => inner + Number(point.eventCount || 0), 0);
  }, 0);
}

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function seedDpsB1CancelledScenario(options){
  const keepOpen = Boolean(options && options.keepOpen);
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const analytics = createScopeAnalyticsService(repo);
  const alerts = createScopeAlertsService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1');
  const people = [];
  for(let i = 1; i <= 5; i += 1){
    const personne = await repo.insertPersonne({
      nip: String(9200 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${i}`,
      grade: 'Sap'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(personne);
  }
  const created = await service.createEvenement({
    date: '2026-04-14',
    domaineCode: 'DPS',
    libelle: 'Recette 4, test',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:45',
    heureFinPrevue: '22:15'
  }, ACTOR);
  const selected = people.map((row) => row.personne_id);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: selected,
    baseVersion: created.version
  }, ACTOR);
  const [a, b, c, d, e] = selected;
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [
      { personneId: a, statut: 'PRESENT' },
      { personneId: b, statut: 'PRESENT' },
      { personneId: c, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { personneId: d, statut: 'ABSENT_NON_EXCUSE' },
      { personneId: e, statut: 'DISPENSE' }
    ]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  if(!keepOpen){
    await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  }
  return {
    repo,
    service,
    persons,
    analytics,
    alerts,
    cible,
    people,
    eventId: created.evenement.evenement_id,
    codeEvent: created.evenement.code_cours
  };
}

async function cancelEvent(ctx, motif){
  const current = await ctx.repo.getEvent(ctx.eventId);
  return ctx.service.annulerEvenement(ctx.eventId, {
    baseVersion: current.version,
    motif: motif || 'Recette 11.1 — événement n’a pas eu lieu'
  }, ACTOR);
}

async function seedCancelledDomain(domaineCode, niveauCode, libelle){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const cible = await repo.findCible(domaineCode === 'PR' && niveauCode === 'GEN' ? 'PR' : domaineCode, niveauCode);
  ok(cible, `cible ${domaineCode}/${niveauCode}`);
  const personne = await repo.insertPersonne({
    nip: `93${domaineCode}`.slice(0, 8),
    nom: `Nom${domaineCode}`,
    prenom: 'Test',
    grade: 'Sap'
  });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
  const created = await service.createEvenement({
    date: '2026-04-16',
    domaineCode,
    libelle,
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: [personne.personne_id],
    baseVersion: created.version
  }, ACTOR);
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [{ personneId: personne.personne_id, statut: 'PRESENT' }]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  const closed = await repo.getEvent(created.evenement.evenement_id);
  await service.annulerEvenement(created.evenement.evenement_id, {
    baseVersion: closed.version,
    motif: `Annulation ${domaineCode}`
  }, ACTOR);
  const fiche = await persons.fiche(personne.personne_id, PERIOD);
  return { fiche, eventId: created.evenement.evenement_id, personne };
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const html = read('scope.html');
  const display = require('../assets/js/scope-personnel-display.js');
  const logic = require('../assets/js/scope-ui-logic.js');

  await record('01 — cause runtime: personEventsFiltered n’utilise plus display hors scope', async () => {
    includes(html, TOKEN);
    includes(ui, 'const display = personnelDisplay();');
    includes(extractNamedFunction(ui, 'personEventsFiltered'), 'const display = personnelDisplay();');
    includes(ui, 'function personneFicheStatusHtml');
    includes(ui, 'function renderAfterLoad');
    includes(ui, 'state.personneReady = true');
    includes(ui, 'state.personneError');
    includes(extractNamedFunction(ui, 'loadPersonneFiche'), 'finally');
    includes(ui, "L.errorMessage('personne')");
    includes(ui, 'if (state.personneError) return personneFicheStatusHtml(state.personneError)');
    includes(ui, 'if (state.personneReady) return personneFicheStatusHtml(L.errorMessage(\'personne\'))');
    const cancelledRow = {
      evenementId: 'evt-1',
      date: '2026-04-14',
      libelle: 'Recette 4, test',
      domaine: 'DPS',
      statutParticipation: 'PRESENT',
      statutEvenement: 'ANNULE',
      cancelled: true,
      href: '#/exercices/evt-1'
    };
    const filtered = runPersonEventsFiltered({ evenements: [cancelledRow, {
      evenementId: 'evt-2',
      date: '2026-04-15',
      libelle: 'Réalisé',
      domaine: 'DPS',
      statutParticipation: 'PRESENT',
      href: '#/exercices/evt-2'
    }] });
    eq(filtered.length, 2, 'fiche historique charge avec un ANNULÉ mixé à un réalisé');
    eq(filtered.filter((row) => display.ficheEventIsCancelled(row)).length, 1);
    const presents = runPersonEventsFiltered({ evenements: filtered }, { personneEventFilter: 'presents' });
    eq(presents.length, 1, 'ANNULÉ exclu du filtre Réalisés');
    eq(presents[0].evenementId, 'evt-2');
    const tout = runPersonEventsFiltered({ evenements: filtered }, { personneEventFilter: 'tout' });
    eq(tout.length, 2, 'ANNULÉ reste visible dans Tout');
  });

  await record('02 — Recette 4 DPS B1 : fiche charge, Annulé, KPI/graphiques exclus, navigation fiche', async () => {
    const ctx = await seedDpsB1CancelledScenario();
    const presentId = ctx.people[0].personne_id;
    const before = await ctx.persons.fiche(presentId, PERIOD);
    eq(before.kpi.numerator, 1);
    eq(before.kpi.denominator, 1);
    eq(display.ficheEventStatutLabel((before.evenements || []).find((row) => String(row.evenementId) === String(ctx.eventId))), 'Présent');

    await cancelEvent(ctx);
    const after = await ctx.persons.fiche(presentId, PERIOD);
    ok(after.identite, 'payload fiche avec identité — le loader peut se terminer');
    const afterRow = (after.evenements || []).find((row) => String(row.evenementId) === String(ctx.eventId));
    ok(afterRow, 'historique conserve l’événement annulé');
    eq(display.ficheEventStatutLabel(afterRow), 'Annulé');
    eq(display.ficheEventInformations(afterRow), 'Événement annulé');
    eq(afterRow.href, `#/exercices/${ctx.eventId}`);
    notIncludes(afterRow.href, '/saisie');
    eq(logic.cancelledEventHref(ctx.eventId), `#/exercices/${ctx.eventId}`);
    eq(after.kpi.numerator, 0);
    eq(after.kpi.denominator, 0);
    eq(after.kpi.eventCount, 0);
    eq(after.kpi.volumes.attendus, 0);
    eq(after.kpi.volumes.presents, 0);
    eq(after.kpi.volumes.excuses, 0);
    eq(after.kpi.volumes.nonExcuses, 0);
    eq(after.kpi.volumes.dispenses, 0);
    eq(graphEventCount(after.graphs && after.graphs.domainesAnnees), 0, 'graphique domaines/années ignore ANNULÉ');
    eq(graphEventCount(after.graphs && after.graphs.specialisationsAnnees), 0, 'graphique spécialisations ignore ANNULÉ');
    eq(graphEventCount(after.graphs && after.graphs.repartition), 0, 'répartition ignore ANNULÉ');
    notIncludes(JSON.stringify(after.graphs || {}), ctx.eventId);
    ok(!CycleRules.isParticipationCountable({ statut: 'ANNULE' }, { statut: 'PRESENT' }));

    const listed = runPersonEventsFiltered(after);
    eq(listed.length, 1);
    eq(display.ficheEventStatutLabel(listed[0]), 'Annulé');
  });

  await record('03 — anciens statuts: Présent / Excusé / Absent / Dispensé / Non renseigné → Annulé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const specs = [
      { nip: '9401', statut: 'PRESENT' },
      { nip: '9402', statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { nip: '9403', statut: 'ABSENT_NON_EXCUSE' },
      { nip: '9404', statut: 'DISPENSE' },
      { nip: '9405', statut: 'NON_RENSEIGNE' }
    ];
    const people = [];
    for(const spec of specs){
      const personne = await repo.insertPersonne({ nip: spec.nip, nom: spec.nip, prenom: 'Statut', grade: 'Sap' });
      await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
      people.push(Object.assign({ personne }, spec));
    }
    const created = await service.createEvenement({
      date: '2026-04-18',
      domaineCode: 'DPS',
      libelle: 'Projection statuts',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: people.map((row) => row.personne.personne_id),
      baseVersion: created.version
    }, ACTOR);
    const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: afterAssign.version,
      participations: people.map((row) => ({
        personneId: row.personne.personne_id,
        statut: row.statut,
        motif_absence: row.motif_absence
      }))
    }, ACTOR);
    const afterSave = await service.lireEvenement(created.evenement.evenement_id);
    const closable = people.filter((row) => row.statut !== 'NON_RENSEIGNE');
    if(closable.length === people.length){
      await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    }
    const current = await repo.getEvent(created.evenement.evenement_id);
    await service.annulerEvenement(created.evenement.evenement_id, {
      baseVersion: current.version,
      motif: 'Projection unique Annulé'
    }, ACTOR);
    for(const row of people){
      const fiche = await persons.fiche(row.personne.personne_id, PERIOD);
      const eventRow = (fiche.evenements || []).find((item) => String(item.evenementId) === String(created.evenement.evenement_id));
      ok(eventRow, `historique ${row.statut}`);
      eq(display.ficheEventStatutLabel(eventRow), 'Annulé', `${row.statut} → Annulé`);
      eq(display.ficheEventInformations(eventRow), 'Événement annulé');
      eq(fiche.kpi.numerator, 0);
      eq(fiche.kpi.denominator, 0);
      eq(fiche.kpi.volumes.attendus, 0);
      notIncludes(eventRow.href, '/saisie');
    }
  });

  await record('04 — réactivation restaure Présent, même id, pas de doublon', async () => {
    const ctx = await seedDpsB1CancelledScenario();
    await cancelEvent(ctx, 'Annulation puis réactivation 11.1');
    const cancelled = await ctx.repo.getEvent(ctx.eventId);
    const partsBefore = await ctx.repo.listParticipations(ctx.eventId);
    const reactivated = await ctx.service.reactiverEvenement(ctx.eventId, {
      baseVersion: cancelled.version,
      motif: 'Réactivation 11.1'
    }, ACTOR);
    eq(reactivated.evenement.evenement_id, ctx.eventId);
    eq(reactivated.evenement.code_cours, ctx.codeEvent);
    eq(reactivated.evenement.statut, 'REALISE');
    const allEvents = await ctx.repo.listEvenements({});
    eq(allEvents.filter((row) => String(row.code_cours) === String(ctx.codeEvent)).length, 1);
    const partsAfter = await ctx.repo.listParticipations(ctx.eventId);
    eq(partsAfter.length, partsBefore.length);
    eq(new Set(partsAfter.map((row) => String(row.personne_id))).size, partsAfter.length);
    const presentFiche = await ctx.persons.fiche(ctx.people[0].personne_id, PERIOD);
    const rows = (presentFiche.evenements || []).filter((item) => String(item.evenementId) === String(ctx.eventId));
    eq(rows.length, 1, 'pas de doublon dans l’historique');
    eq(display.ficheEventStatutLabel(rows[0]), 'Présent');
    eq(presentFiche.kpi.numerator, 1);
    eq(presentFiche.kpi.denominator, 1);
    eq(presentFiche.kpi.volumes.presents, 1);
    ok(graphEventCount(presentFiche.graphs && presentFiche.graphs.domainesAnnees) >= 1);
  });

  await record('05 — multi-domaines DPS / DAP / JSP / PR / AUTO, parent ANNULE > statut participant', async () => {
    const cases = [
      ['DPS', 'B1', 'Annulé DPS'],
      ['DAP', 'Y4', 'Annulé DAP'],
      ['JSP', 'G1', 'Annulé JSP'],
      ['PR', 'GEN', 'Annulé PR'],
      ['AUTO', 'VL', 'Annulé AUTO']
    ];
    for(const [domaine, niveau, libelle] of cases){
      const { fiche, eventId } = await seedCancelledDomain(domaine, niveau, libelle);
      const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(eventId));
      ok(row, `historique ${domaine}`);
      eq(display.ficheEventStatutLabel(row), 'Annulé', `${domaine} → Annulé`);
      eq(display.ficheEventInformations(row), 'Événement annulé');
      eq(fiche.kpi.denominator, 0, `${domaine} hors dénominateur`);
      eq(row.href, `#/exercices/${eventId}`);
    }
  });

  await record('06 — loader: ready/error sortent de Chargement ; mix réalisé + annulé', async () => {
    includes(ui, 'if (state.personneError) return personneFicheStatusHtml(state.personneError)');
    includes(ui, 'if (state.personneReady) return personneFicheStatusHtml(L.errorMessage(\'personne\'))');
    includes(ui, "L.loadingMessage('personne')");
    const ctx = await seedDpsB1CancelledScenario();
    const cible = ctx.cible;
    const created = await ctx.service.createEvenement({
      date: '2026-04-20',
      domaineCode: 'DPS',
      libelle: 'Toujours réalisé',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [ctx.people[0].personne_id],
      baseVersion: created.version
    }, ACTOR);
    const afterAssign = await ctx.service.lireEvenement(created.evenement.evenement_id);
    await ctx.service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: afterAssign.version,
      participations: [{ personneId: ctx.people[0].personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const afterSave = await ctx.service.lireEvenement(created.evenement.evenement_id);
    await ctx.service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    await cancelEvent(ctx);
    const fiche = await ctx.persons.fiche(ctx.people[0].personne_id, PERIOD);
    const cancelled = (fiche.evenements || []).find((row) => String(row.evenementId) === String(ctx.eventId));
    const kept = (fiche.evenements || []).find((row) => String(row.evenementId) === String(created.evenement.evenement_id));
    ok(cancelled && kept, 'mix annulé + réalisé dans la même fiche');
    eq(display.ficheEventStatutLabel(cancelled), 'Annulé');
    eq(display.ficheEventStatutLabel(kept), 'Présent');
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 1);
    const filtered = runPersonEventsFiltered(fiche);
    eq(filtered.length, 2);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();

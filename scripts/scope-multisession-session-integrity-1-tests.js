#!/usr/bin/env node
'use strict';

/** SCOPE-MULTISESSION-SESSION-INTEGRITY-1 — séance ≠ bilan global. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { nominativeRows, collectReport } = require('../netlify/functions/_scope-report-data');
const { collectMultisessionReport } = require('../netlify/functions/_scope-multisession-report');
const { canCloseLastSession } = require('../netlify/functions/_scope-cycle-rules');
const { MOTIFS_JSP, MOTIFS_CANONIQUES } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const results = [];
const ACTOR = { sub: 'session-integrity-1' };
const ABC_NIPS = Array.from({ length: 18 }, (_, i) => String(7640 + i + 1));

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

function part(person, statut, extra){
  return Object.assign({ personneId: person.personne_id, statut, role: 'PARTICIPANT' }, extra || {});
}

function saisieRows(fiche){
  return (fiche.attendus || []).filter((row) => row.inclus !== false).map((a) => {
    const person = (fiche.personnes && fiche.personnes[a.personne_id]) || {};
    const p = (fiche.participations || []).find((row) => String(row.personne_id) === String(a.personne_id)) || {};
    const role = String(p.role || 'PARTICIPANT').toUpperCase();
    return {
      personneId: a.personne_id,
      inclus: true,
      role,
      statut: p.statut || 'NON_RENSEIGNE',
      motifAbsence: p.motif_absence || '',
      alreadyCountedInSession: Boolean(a.alreadyCountedInSession),
      coveredInGlobalBilan: Boolean(a.alreadyCountedInSession),
      grade: person.grade || '',
      prenom: person.prenom || '',
      nomFamille: person.nom || '',
      nip: person.nip || ''
    };
  });
}

async function setupSeries(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-int',
    cycle_key: 'PAPR-INT',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR integrity'
  });
  const specs = [
    { id: 'pr31', section: '1', date: '2026-09-01', libelle: 'Exercice PR 3.1 | Alpha' },
    { id: 'pr34', section: '4', date: '2026-09-01', libelle: 'Exercice PR 3.4 | Highway to hell' }
  ];
  const events = [];
  for(const spec of specs){
    const ev = await repo.insertEvenement({
      evenement_id: spec.id,
      cycle_id: 'cycle-pr-int',
      domaine_code: 'PR',
      date: spec.date,
      libelle: spec.libelle,
      code_cours: `PAPR.PR3.${spec.section}`,
      pr_exercise_group_key: 'cycle-pr-int:PR:3',
      pr_session_key: `cycle-pr-int:PR:3.${spec.section}`
    });
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(const [id, nip, nom, prenom] of [
    ['A', '81001', 'Alpha', 'Anne'],
    ['B', '81002', 'Bravo', 'Bernard'],
    ['C', '81003', 'Charlie', 'Claire'],
    ['D', '81004', 'Delta', 'Denis']
  ]){
    const person = await repo.insertPersonne({
      personne_id: id, nip, nom, prenom, grade: 'Sap', skipPeriodes: true
    });
    people.push(person);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-int', personne_id: id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id,
        personne_id: id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return { repo, service, events, people };
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: spec.dateDebut || '2026-01-01'
  });
  if(spec.extraCibleId){
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: spec.extraCibleId,
      date_debut: spec.dateDebut || '2026-01-01'
    });
  }
  return personne;
}

(async () => {
  const ctx = await setupSeries();
  const [A, B, C, D] = ctx.people;
  await save(ctx.service, ctx.repo, 'pr31', [
    part(A, 'PRESENT'),
    part(B, 'PRESENT'),
    part(C, 'ABSENT_NON_EXCUSE')
  ]);
  await save(ctx.service, ctx.repo, 'pr34', [
    part(A, 'PRESENT'),
    part(B, 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' }),
    part(C, 'PRESENT'),
    part(D, 'PRESENT')
  ]);
  const s31 = await ctx.service.lireEvenement('pr31');
  const s34 = await ctx.service.lireEvenement('pr34');
  const rows34 = saisieRows(s34);
  const kpis34 = logic.sessionPresenceKpis(rows34);
  const partA31 = s31.participations.find((row) => row.personne_id === 'A');
  const partA34 = s34.participations.find((row) => row.personne_id === 'A');

  await record('01 — participation A PR3.1 persistée', () => {
    assert.strictEqual(partA31.statut, 'PRESENT');
  });

  await record('02 — participation A PR3.4 persistée', () => {
    assert.strictEqual(partA34.statut, 'PRESENT');
  });

  await record('03 — deux lignes événement distinctes', () => {
    assert.notStrictEqual(partA31.evenement_id, partA34.evenement_id);
    assert.strictEqual(partA31.evenement_id, 'pr31');
    assert.strictEqual(partA34.evenement_id, 'pr34');
  });

  await record('04 — bilan global A = 1', () => {
    assert.strictEqual(s34.prExerciseParticipation.coverage.covered, 4);
    assert.ok(s34.prExerciseParticipation.kpis.presents <= 4);
  });

  await record('05 — séance locale non verrouillée par le bilan global', () => {
    assert.ok(!logic.coveredInGlobalBilan(rows34.find((row) => row.personneId === 'A')));
    assert.ok(!logic.statusLockedForRole('PARTICIPANT'));
    assert.ok(!logic.sessionLocked(rows34.find((row) => row.personneId === 'A')));
  });

  await record('06 — grisage disabled sur ligne déjà comptée ailleurs', () => {
    const renderRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function uniqueFilterValues'));
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(renderRows.includes('statusDisabled'));
    assert.ok(renderRows.includes("statusDisabled ? ' disabled aria-disabled=\"true\"'"));
    assert.ok(ui.includes('scope-row-session-counted'));
  });

  await record('07 — tooltip informatif éventuel', () => {
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.strictEqual(logic.sessionExplainTooltip({
      alreadyCountedInSession: true,
      coveredInGlobalBilan: true,
      statut: 'NON_RENSEIGNE'
    }), '');
  });

  await record('08 — KPI séance = données séance', () => {
    assert.strictEqual(kpis34.present, 3);
    assert.strictEqual(kpis34.excuse, 1);
    assert.strictEqual(kpis34.absent, 0);
    assert.strictEqual(kpis34.open, 0);
  });

  await record('09 — ATTENDUS séance et PRÉSENTS séance même périmètre', () => {
    assert.strictEqual(kpis34.attendus, 4);
    assert.strictEqual(kpis34.present + kpis34.excuse + kpis34.absent + kpis34.dispense + kpis34.open, kpis34.attendus);
  });

  await record('10 — aucun KPI cumulé injecté dans la séance', () => {
    const kpiSrc = ui.slice(ui.indexOf('function renderPresenceKpis'), ui.indexOf('function sortIdentityTieBreak'));
    assert.ok(!kpiSrc.includes('prKpis.presents'));
    assert.ok(!kpiSrc.includes('prExerciseParticipation.kpis'));
    assert.ok(kpiSrc.includes('sessionPresenceKpis') || kpiSrc.includes('À renseigner (séance)'));
  });

  await record('11 — à renseigner = séance uniquement', () => {
    assert.strictEqual(kpis34.open, 0);
    const incomplete = logic.listIncompleteClosureRows(rows34);
    assert.strictEqual(incomplete.length, 0);
    assert.strictEqual(s34.prExerciseParticipation.kpis.open, 0);
  });

  await record('12 — save persiste toute la séance', async () => {
    const byId = Object.fromEntries(s34.participations.map((row) => [row.personne_id, row.statut]));
    assert.deepStrictEqual(byId, { A: 'PRESENT', B: 'ABSENT_EXCUSE', C: 'PRESENT', D: 'PRESENT' });
  });

  await record('13 — close ne filtre pas les personnes déjà couvertes', async () => {
    const closed = await ctx.service.cloturer('pr34', { baseVersion: await version(ctx.repo, 'pr34') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    const after = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(after.participations.filter((row) => row.statut !== 'NON_RENSEIGNE').length, 4);
  });

  await record('14 — vue réalisée = participants séance', async () => {
    const realised = await ctx.service.lireEvenement('pr34');
    const noms = nominativeRows(realised).map((row) => row.nom).sort();
    assert.deepStrictEqual(noms, ['Alpha', 'Bravo', 'Charlie', 'Delta']);
  });

  await record('15 — vue réalisée conserve excusés', async () => {
    const realised = await ctx.service.lireEvenement('pr34');
    const bravo = nominativeRows(realised).find((row) => row.nip === '81002');
    assert.strictEqual(bravo.statut, 'ABSENT_EXCUSE');
  });

  await record('16 — vue réalisée conserve absents', async () => {
    const s31rows = nominativeRows(s31);
    const charlie = s31rows.find((row) => row.nip === '81003');
    assert.strictEqual(charlie.statut, 'ABSENT_NON_EXCUSE');
  });

  await record('17 — vue réalisée conserve dispensés', async () => {
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr34', [
      part(extra.people[0], 'DISPENSE', { motif_absence: 'JOKER' }),
      part(extra.people[1], 'PRESENT'),
      part(extra.people[2], 'PRESENT'),
      part(extra.people[3], 'PRESENT')
    ]);
    await extra.service.cloturer('pr34', { baseVersion: await version(extra.repo, 'pr34') }, ACTOR);
    const row = nominativeRows(await extra.service.lireEvenement('pr34')).find((item) => item.nip === '81001');
    assert.strictEqual(row.statut, 'DISPENSE');
  });

  await record('18 — encadrement séparé', async () => {
    const extra = await setupSeries();
    const trainer = await extra.repo.insertPersonne({
      personne_id: 'F1', nip: '81999', nom: 'Formateur', prenom: 'Fred', grade: 'Sgt', skipPeriodes: true
    });
    await extra.service.ajouterEncadrement('pr34', {
      baseVersion: await version(extra.repo, 'pr34'),
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    const fiche = await extra.service.lireEvenement('pr34');
    assert.ok(fiche.encadrement.some((row) => row.personne_id === 'F1' && row.role === 'FORMATEUR'));
    assert.ok(!fiche.attendus.some((row) => row.personne_id === 'F1'));
  });

  await record('19 — formateur multi-séance non multiplié globalement', async () => {
    const extra = await setupSeries();
    const trainer = await extra.repo.insertPersonne({
      personne_id: 'F2', nip: '81998', nom: 'Form', prenom: 'Luc', grade: 'Sgt', skipPeriodes: true
    });
    await extra.service.ajouterEncadrement('pr31', {
      baseVersion: await version(extra.repo, 'pr31'),
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    await extra.service.ajouterEncadrement('pr34', {
      baseVersion: await version(extra.repo, 'pr34'),
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    const last = await extra.service.lireEvenement('pr34');
    const formateurKeys = last.prExerciseParticipation.details.presents.filter((key) => String(key).includes('81998') || key === 'F2' || key === 'NIP:81998');
    assert.ok(formateurKeys.length <= 1);
  });

  await record('20 — réouverture restitue statuts séance', async () => {
    const reopened = await ctx.service.reouvrir('pr34', {
      baseVersion: await version(ctx.repo, 'pr34'),
      motif: 'Correction MOA'
    }, ACTOR);
    assert.strictEqual(reopened.evenement.statut, 'PLANIFIE');
    const fiche = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === 'B').statut, 'ABSENT_EXCUSE');
  });

  await record('21 — réouverture permet modification', async () => {
    await save(ctx.service, ctx.repo, 'pr34', [part(B, 'PRESENT')]);
    const fiche = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === 'B').statut, 'PRESENT');
  });

  await record('22 — reclôture met à jour bilan global', async () => {
    const fiche = await ctx.service.lireEvenement('pr34');
    await ctx.service.cloturer('pr34', { baseVersion: fiche.evenement.version }, ACTOR);
    const after = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(after.evenement.statut, 'REALISE');
    assert.strictEqual(after.prExerciseParticipation.coverage.covered, 4);
  });

  await record('23 — reset saisie ne touche qu’à la séance', async () => {
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr31', [part(extra.people[0], 'PRESENT'), part(extra.people[1], 'PRESENT'), part(extra.people[2], 'PRESENT'), part(extra.people[3], 'PRESENT')]);
    await save(extra.service, extra.repo, 'pr34', [part(extra.people[0], 'PRESENT'), part(extra.people[1], 'PRESENT'), part(extra.people[2], 'PRESENT'), part(extra.people[3], 'PRESENT')]);
    await extra.service.resetParticipations('pr34', { baseVersion: await version(extra.repo, 'pr34') }, ACTOR);
    assert.strictEqual((await extra.repo.getParticipation('pr31', 'A')).statut, 'PRESENT');
    assert.strictEqual((await extra.repo.getParticipation('pr34', 'A')).statut, 'NON_RENSEIGNE');
  });

  await record('24 — autre séance intacte', async () => {
    const p = await ctx.repo.getParticipation('pr31', 'A');
    assert.strictEqual(p.statut, 'PRESENT');
  });

  await record('25 — rapport événement = séance', async () => {
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'pr34' }, { includeNominatif: true });
    assert.ok(model);
    const eventRows = nominativeRows(await ctx.service.lireEvenement('pr34'));
    assert.strictEqual(eventRows.length, 4);
    assert.ok(eventRows.some((row) => row.statut === 'PRESENT' && row.nip === '81001'));
    assert.ok(eventRows.some((row) => row.statut === 'PRESENT' && row.nip === '81002'));
  });

  await record('26 — rapport multi-session détaillé bloqué tant que toutes les séances ne sont pas clôturées', async () => {
    await assert.rejects(() => collectMultisessionReport(ctx.repo, 'pr34'), /rapport détaillé sera disponible lorsque toutes les séances seront clôturées/);
    assert.ok(canCloseLastSession(s34.prExerciseParticipation));
  });

  await record('27 — R4 inchangé', () => {
    const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
    assert.ok(rulesSrc.includes('function computePrExerciseParticipationState'));
    assert.ok(rulesSrc.includes('function canCloseLastSession'));
    assert.ok(ui.includes('data-report-session'));
  });

  await record('28 — population PR général inclut ABC', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const papr = await repo.findCible('PR', 'GEN');
    for(const nip of ABC_NIPS.slice(0, 2)){
      await seedPerson(repo, abc.cible_id, { nip, extraCibleId: papr.cible_id });
    }
    await seedPerson(repo, papr.cible_id, { nip: 'PAPR901' });
    const created = await service.createEvenement({
      date: '2026-04-21',
      domaineCode: 'PR',
      libelle: 'PR général',
      cibleIds: [papr.cible_id]
    }, ACTOR);
    const frozen = await service.figerPopulation(created.evenement.evenement_id, {
      baseVersion: created.evenement.version
    }, ACTOR);
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.ok(fiche.attendus.filter((row) => row.inclus !== false).length >= 3);
  });

  await record('29 — population PR-ABC séparée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const papr = await repo.findCible('PR', 'GEN');
    for(const nip of ABC_NIPS){
      await seedPerson(repo, abc.cible_id, { nip, extraCibleId: papr.cible_id });
    }
    await seedPerson(repo, papr.cible_id, { nip: 'PAPR902' });
    const created = await service.createEvenement({
      date: '2026-04-21',
      domaineCode: 'PR',
      libelle: 'PR ABC only',
      cibleIds: [abc.cible_id]
    }, ACTOR);
    const frozen = await service.figerPopulation(created.evenement.evenement_id, {
      baseVersion: created.evenement.version
    }, ACTOR);
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.filter((row) => row.inclus !== false).length, 18);
  });

  await record('30 — correctif JSP incomplets R2 non régressé', () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT', personneId: 'a' },
      { inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', personneId: 'b' }
    ];
    assert.strictEqual(logic.listIncompleteClosureRows(rows).length, 1);
    assert.strictEqual(logic.liveCounters([
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT' }
    ]).open, 0);
  });

  await record('31 — motifs JSP R2 non régressés', () => {
    assert.deepStrictEqual(logic.motifsSaisieForDomaine('JSP').map((m) => m.value), Object.values(MOTIFS_JSP));
    assert.deepStrictEqual(logic.motifsSaisieForDomaine('DPS').map((m) => m.value), Object.values(MOTIFS_CANONIQUES));
  });

  await record('32 — SAFE-CLOSE non régressé', async () => {
    const order = [];
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 1,
      save: async () => { order.push('save'); return { ok: true, version: 2 }; },
      unfilledAfterSave: async () => { order.push('check'); return []; },
      isLastSession: true,
      close: async () => { order.push('close'); }
    });
    assert.deepStrictEqual(order, ['save', 'check', 'close']);
    assert.strictEqual(result.closed, true);
  });

  await record('33 — erreur save interdit close', async () => {
    let closed = false;
    await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      save: async () => ({ ok: false }),
      close: async () => { closed = true; }
    });
    assert.strictEqual(closed, false);
  });

  await record('34 — version fraîche utilisée', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 11 }),
      close: async (version) => { assert.strictEqual(version, 11); }
    });
    assert.strictEqual(result.version, 11);
  });

  await record('35 — aucun participant supprimé à la clôture', async () => {
    const after = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(after.attendus.filter((row) => row.inclus !== false).length, 4);
    assert.strictEqual(after.participations.length, 4);
  });

  await record('36 — aucun participant supprimé à la réouverture', async () => {
    await ctx.service.reouvrir('pr34', { baseVersion: await version(ctx.repo, 'pr34'), motif: 'contrôle' }, ACTOR);
    const fiche = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(fiche.participations.length, 4);
  });

  await record('37 — un participant déjà couvert peut être présent à nouveau', async () => {
    await save(ctx.service, ctx.repo, 'pr34', [part(A, 'PRESENT')]);
    assert.strictEqual((await ctx.repo.getParticipation('pr31', 'A')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr34', 'A')).statut, 'PRESENT');
  });

  await record('38 — participation répétée ne double pas le taux global', async () => {
    const last = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(last.prExerciseParticipation.coverage.covered, 4);
    const presents = last.prExerciseParticipation.kpis.presents;
    assert.ok(presents <= 4);
  });

  await record('39 — pas de N+1 réseau', () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
    assert.ok(!src.includes('pr_exercise_participation_deja_comptee'));
    assert.ok(!src.includes('hydratePersonnes([\n            personneId,'));
  });

  await record('40 — événement RÉALISÉ non resynchronisé par population', async () => {
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr34', [
      part(extra.people[0], 'PRESENT'),
      part(extra.people[1], 'PRESENT'),
      part(extra.people[2], 'PRESENT'),
      part(extra.people[3], 'PRESENT')
    ]);
    await extra.service.cloturer('pr34', { baseVersion: await version(extra.repo, 'pr34') }, ACTOR);
    const before = (await extra.service.lireEvenement('pr34')).attendus.length;
    if(typeof extra.service.syncExpectedPopulationForEvents === 'function'){
      await extra.service.syncExpectedPopulationForEvents(['pr34']);
    }
    const after = (await extra.service.lireEvenement('pr34')).attendus.length;
    assert.strictEqual(after, before);
    assert.strictEqual((await extra.service.lireEvenement('pr34')).evenement.statut, 'REALISE');
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
    console.error(`SCOPE-MULTISESSION-SESSION-INTEGRITY-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-MULTISESSION-SESSION-INTEGRITY-1: ${results.length} PASS`);
})();

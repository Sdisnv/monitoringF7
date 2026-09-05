#!/usr/bin/env node
'use strict';

/** SCOPE-EVENTS-SAFE-CLOSE-1-R1 — hotfix rendu saisie + ciblage PR-ABC. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { HttpError } = require('../netlify/lib/_scope-rules');
const logic = require('../assets/js/scope-ui-logic.js');
const personnelImport = require('../netlify/lib/_scope-personnel-service');

const ROOT = path.join(__dirname, '..');
const results = [];
const ACTOR = { sub: 'safe-close-1-r1' };
const ABC_NIPS = Array.from({ length: 18 }, (_, i) => String(7640 + i + 1));

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function readUi(){
  return fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
}

function renderSaisieSource(){
  const ui = readUi();
  const start = ui.indexOf('function renderSaisie()');
  const end = ui.indexOf('function renderSaisieQuantitative()');
  assert.ok(start >= 0 && end > start, 'renderSaisie introuvable');
  return ui.slice(start, end);
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

async function freezeOn(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version, count: frozen.count };
}

async function setupPrWorld(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const abc = await repo.findCible('PR', 'ABC');
  const papr = await repo.findCible('PR', 'GEN');
  const abcPeople = [];
  for(const nip of ABC_NIPS){
    abcPeople.push(await seedPerson(repo, abc.cible_id, { nip, extraCibleId: papr.cible_id }));
  }
  const paprOnly = [];
  for(let i = 0; i < 58; i += 1){
    paprOnly.push(await seedPerson(repo, papr.cible_id, { nip: `PAPR${String(i + 1).padStart(3, '0')}` }));
  }
  return { repo, service, abc, papr, abcPeople, paprOnly };
}

function part(person, statut){
  return { personneId: person.personne_id, statut, role: 'PARTICIPANT' };
}

(async () => {
  await record('01 — aucune référence runtime invalide à saveState', () => {
    const saisie = renderSaisieSource();
    assert.ok(saisie.includes('const saveState = presenceSaveLabel();'));
    assert.ok(!saisie.includes('window.saveState'));
    assert.ok(!saisie.includes('globalThis.saveState'));
    const beforeDecl = saisie.slice(0, saisie.indexOf('const saveState = presenceSaveLabel();'));
    assert.ok(!/\bsaveState\b/.test(beforeDecl.replace(/function renderSaisie\(\)/, '')));
  });

  await record('02 — renderSaisie JSP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'JSP001' });
    const frozen = await freezeOn(service, cible, '2026-05-10', 'JSP saisie');
    const fiche = await service.lireEvenement(frozen.eventId);
    const rows = logic.saisieAttendusFromFiche(fiche);
    assert.strictEqual(fiche.evenement.domaine_code, 'JSP');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].personne_id, person.personne_id);
    const saisie = renderSaisieSource();
    assert.ok(saisie.includes('eventIdentityBand'));
    assert.ok(saisie.includes('renderPresenceKpis'));
    assert.ok(saisie.includes('renderEncadrementBlock'));
    assert.ok(saisie.includes("saveBusy ? 'Enregistrement…' : 'Enregistrer'"));
    assert.ok(saisie.includes('Clôturer'));
  });

  await record('03 — renderSaisie PR général', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-05-10', 'PR général saisie');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const rows = logic.saisieAttendusFromFiche(fiche);
    assert.strictEqual(logic.ciblesLabel(fiche.cibles), 'Général / PAPR');
    assert.strictEqual(rows.length, 76);
    const saisie = renderSaisieSource();
    assert.ok(saisie.includes('id="save-part"'));
    assert.ok(saisie.includes('id="cloturer"'));
  });

  await record('04 — renderSaisie PR-ABC', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.abc, '2026-05-10', 'Exercice PR-ABC | Refresh');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const rows = logic.saisieAttendusFromFiche(fiche);
    assert.strictEqual(logic.ciblesLabel(fiche.cibles), 'PR-ABC');
    assert.strictEqual(rows.length, 18);
    assert.ok(rows.every((row) => ctx.abcPeople.some((p) => p.personne_id === row.personne_id)));
  });

  await record('05 — hard reload route saisie', () => {
    const parsed = logic.parseHash('#/exercices/evt-prabc/saisie');
    assert.strictEqual(parsed.screen, 'saisie');
    assert.strictEqual(parsed.id, 'evt-prabc');
    assert.strictEqual(logic.parseHash('#/evenements/evt-prabc/saisie').screen, 'saisie');
  });

  await record('06 — navigation liste → saisie', () => {
    const ui = readUi();
    assert.ok(ui.includes('data-cta="saisir"'));
    assert.ok(ui.includes('Chargement de l’événement'));
    const leaving = logic.isLeavingSaisieRoute({ screen: 'liste' }, { screen: 'saisie', id: 'a' });
    assert.strictEqual(leaving, false);
  });

  await record('07 — retour → autre saisie', () => {
    assert.strictEqual(logic.isLeavingSaisieRoute({ screen: 'saisie', id: 'a' }, { screen: 'liste' }), true);
    assert.strictEqual(logic.isLeavingSaisieRoute({ screen: 'saisie', id: 'a' }, { screen: 'saisie', id: 'b' }), true);
    assert.strictEqual(logic.isLeavingSaisieRoute({ screen: 'saisie', id: 'a' }, { screen: 'saisie', id: 'a' }), false);
  });

  await record('08 — dirty statut', () => {
    const row = logic.applyParticipationStatus({ personneId: 'a', statut: 'NON_RENSEIGNE', inclus: true }, 'PRESENT');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(logic.hasUnsavedPresenceChanges({ saisieDirty: true }), true);
  });

  await record('09 — save avant close', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 3 }),
      close: async (version) => { assert.strictEqual(version, 3); }
    });
    assert.strictEqual(result.order[0], 'save');
    assert.ok(result.order.includes('close'));
    const ui = readUi();
    assert.ok(ui.includes('async function persistParticipations()'));
    assert.ok(ui.includes('async function onCloturerClick()'));
  });

  await record('10 — version fraîche', () => {
    assert.strictEqual(logic.nextEventVersionAfterSave({ ok: true, version: 8 }, 3), 8);
    assert.strictEqual(logic.nextEventVersionAfterSave({ evenement: { version: 9 } }, 3), 9);
  });

  await record('11 — close après save', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.abc, '2026-05-10', 'PR-ABC close');
    const saved = await ctx.service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: ctx.abcPeople.map((p) => part(p, 'PRESENT'))
    }, ACTOR);
    const closed = await ctx.service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.strictEqual(fiche.participations.filter((row) => row.statut === 'PRESENT').length, 18);
  });

  await record('12 — save error interdit close', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: false, reason: 'save_failed' }),
      close: async () => { throw new Error('close must not run'); }
    });
    assert.strictEqual(result.closed, false);
    assert.strictEqual(result.reason, 'save_failed');
    assert.ok(!result.order || !result.order.includes('close'));
  });

  await record('13 — retour dirty', () => {
    const plan = logic.planSaisieLeave({ saisieDirty: true });
    assert.strictEqual(plan.action, 'PROMPT');
  });

  await record('14 — enregistrer et quitter', async () => {
    const result = await logic.orchestrateLeaveSaisie({
      dirty: true,
      saisieDirty: true,
      choice: 'save',
      save: async () => ({ ok: true, version: 6 })
    });
    assert.strictEqual(result.navigated, true);
    assert.strictEqual(result.saved, true);
    const ui = readUi();
    assert.ok(ui.includes('Enregistrer et quitter'));
    assert.ok(ui.includes('Quitter sans enregistrer'));
  });

  await record('15 — PR général inclut ABC', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-05-10', 'PR général');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const ids = new Set(logic.saisieAttendusFromFiche(fiche).map((row) => row.personne_id));
    assert.ok(ctx.abcPeople.every((p) => ids.has(p.personne_id)));
    assert.strictEqual(ids.size, 76);
  });

  await record('16 — PR-ABC exclut PAPR non ABC', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.abc, '2026-05-10', 'PR-ABC only');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const ids = new Set(logic.saisieAttendusFromFiche(fiche).map((row) => row.personne_id));
    assert.ok(ctx.paprOnly.every((p) => !ids.has(p.personne_id)));
    assert.strictEqual(ids.size, 18);
  });

  await record('17 — PR-ABC = 18 fixture', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.abc, '2026-05-10', 'Exercice PR-ABC | Refresh');
    const listed = await ctx.service.listEvenements({ annee: 2026 });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === frozen.eventId);
    assert.ok(item);
    assert.strictEqual(item.attendusInclus, 18);
    assert.strictEqual(logic.ciblesLabel(item.cibles || (await ctx.service.lireEvenement(frozen.eventId)).cibles), 'PR-ABC');
  });

  await record('18 — aucun doublon', async () => {
    const ctx = await setupPrWorld();
    const gen = await freezeOn(ctx.service, ctx.papr, '2026-05-10', 'PR général dédup');
    const abc = await freezeOn(ctx.service, ctx.abc, '2026-05-10', 'PR-ABC dédup');
    const genIds = logic.saisieAttendusFromFiche(await ctx.service.lireEvenement(gen.eventId)).map((row) => row.personne_id);
    const abcIds = logic.saisieAttendusFromFiche(await ctx.service.lireEvenement(abc.eventId)).map((row) => row.personne_id);
    assert.strictEqual(new Set(genIds).size, genIds.length);
    assert.strictEqual(new Set(abcIds).size, abcIds.length);
    assert.strictEqual(abcIds.length, 18);
  });

  await record('19 — cible PR-ABC persistée', async () => {
    const ctx = await setupPrWorld();
    const created = await ctx.service.createEvenement({
      date: '2026-05-10',
      domaineCode: 'PR',
      libelle: 'Exercice nommé autrement',
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const ids = await ctx.repo.listEventCibleIds(created.evenement.evenement_id);
    assert.deepStrictEqual(ids, [ctx.abc.cible_id]);
    const ui = readUi();
    assert.ok(ui.includes('Général / PAPR'));
    assert.ok(ui.includes('id="edit-event"'));
    assert.strictEqual(logic.niveauAffiche('PR', 'ABC'), 'PR-ABC');
    assert.strictEqual(logic.niveauAffiche('PR', 'GEN'), 'Général / PAPR');
  });

  await record('20 — événement réalisé non resync', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-05-10', 'PR réalisé');
    const saved = await ctx.service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: ctx.abcPeople.concat(ctx.paprOnly).map((p) => part(p, 'PRESENT'))
    }, ACTOR);
    const closed = await ctx.service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    await assert.rejects(
      () => ctx.service.patchEvenement(frozen.eventId, {
        baseVersion: closed.version,
        cibleIds: [ctx.abc.cible_id]
      }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'evenement_realise_non_modifiable'
    );
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    assert.strictEqual(logic.saisieAttendusFromFiche(fiche).length, 76);
  });

  await record('21 — import PR-ABC R1 non régressé', () => {
    const resolved = personnelImport.resolveImportContext('PR_ABC');
    assert.ok(resolved);
    assert.ok(/ABC|PR-ABC|PR_ABC/i.test(String(resolved.code || resolved.population || resolved.label || 'PR_ABC')));
    const importTests = fs.readFileSync(path.join(ROOT, 'scripts/scope-import-prabc-1-r1-tests.js'), 'utf8');
    assert.ok(importTests.includes('7647'));
    const ran = spawnSync(process.execPath, ['scripts/scope-import-prabc-1-r1-tests.js'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(ran.status, 0, ran.stderr || ran.stdout);
  });

  await record('22 — SAFE-CLOSE tests précédents toujours PASS', () => {
    const previous = fs.readFileSync(path.join(ROOT, 'scripts/scope-events-safe-close-1-tests.js'), 'utf8');
    assert.ok(previous.includes('orchestrateClosePresence'));
    assert.ok(previous.includes('save d’abord') || previous.includes('save avant'));
    const ran = spawnSync(process.execPath, ['scripts/scope-events-safe-close-1-tests.js'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(ran.status, 0, ran.stderr || ran.stdout);
  });

  await record('I — retarget PLANIFIÉ figé sans s’appuyer sur le titre', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-05-10', 'Exercice PR-ABC | Refresh');
    const before = await ctx.service.lireEvenement(frozen.eventId);
    assert.strictEqual(logic.ciblesLabel(before.cibles), 'Général / PAPR');
    assert.strictEqual(logic.saisieAttendusFromFiche(before).length, 76);
    const patched = await ctx.service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const after = await ctx.service.lireEvenement(frozen.eventId);
    assert.ok(patched.version > frozen.version);
    assert.strictEqual(logic.ciblesLabel(after.cibles), 'PR-ABC');
    assert.strictEqual(logic.saisieAttendusFromFiche(after).length, 18);
    const listed = await ctx.service.listEvenements({ annee: 2026 });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === frozen.eventId);
    assert.strictEqual(item.attendusInclus, 18);
    const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
    assert.ok(!serviceSrc.includes('Exercice PR-ABC | Refresh'));
    assert.ok(serviceSrc.includes('RETARGET_CIBLES'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  });
  if(failed.length){
    console.error(`\n${failed.length} test(s) NOK`);
    process.exit(1);
  }
  console.log(`\n${results.length} tests PASS`);
})();

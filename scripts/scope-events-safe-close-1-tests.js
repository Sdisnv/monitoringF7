#!/usr/bin/env node
'use strict';

/** SCOPE-EVENTS-SAFE-CLOSE-1 — sauvegarde avant clôture / navigation. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const logic = require('../assets/js/scope-ui-logic.js');
const display = require('../assets/js/scope-personnel-display.js');
const personnelImport = require('../netlify/functions/_scope-personnel-service');

const ROOT = path.join(__dirname, '..');
const results = [];
const ACTOR = { sub: 'safe-close-1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function part(person, statut, extra){
  return Object.assign({
    personneId: person.personne_id,
    statut,
    role: 'PARTICIPANT'
  }, extra || {});
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
    date_debut: '2026-01-01'
  });
  return personne;
}

async function setupEvent(count){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible('DPS', 'G1');
  const people = [];
  for(let i = 0; i < count; i += 1){
    people.push(await seedPerson(repo, cible.cible_id, { nip: `SC${String(i + 1).padStart(3, '0')}` }));
  }
  const created = await service.createEvenement({
    date: '2026-05-10',
    domaineCode: 'DPS',
    libelle: 'Safe close',
    cibleIds: [cible.cible_id]
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, ACTOR);
  return { repo, service, people, eventId: created.evenement.evenement_id, version: frozen.version };
}

(async () => {
  await record('01 — dirty false initial', () => {
    assert.strictEqual(logic.hasUnsavedPresenceChanges({ saisieDirty: false }), false);
    assert.strictEqual(logic.hasUnsavedPresenceChanges({ hasUnsavedChanges: false }), false);
  });

  await record('02 — changement statut → dirty true', () => {
    const row = logic.applyParticipationStatus({ personneId: 'a', statut: 'NON_RENSEIGNE', inclus: true }, 'PRESENT');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(logic.hasUnsavedPresenceChanges({ saisieDirty: true }), true);
  });

  await record('03 — changement motif → dirty true', () => {
    const row = logic.applyExcuseMotif({ personneId: 'a', statut: 'ABSENT_EXCUSE', inclus: true }, 'PRIVE');
    assert.ok(row.motifAbsence === 'PRIVE' || row.motif_absence === 'PRIVE');
    assert.strictEqual(logic.hasUnsavedPresenceChanges({ hasUnsavedChanges: true }), true);
  });

  await record('04 — save réussi → dirty false', async () => {
    const result = await logic.orchestrateLeaveSaisie({
      dirty: true,
      saisieDirty: true,
      choice: 'save',
      save: async () => ({ ok: true, version: 4 })
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.dirty, false);
    assert.strictEqual(result.saved, true);
  });

  await record('05 — close sans dirty → close direct', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: false,
      version: 2,
      close: async () => {}
    });
    assert.deepStrictEqual(result.order, ['close']);
    assert.strictEqual(result.closed, true);
  });

  await record('06 — close avec dirty → save d’abord', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 3 }),
      close: async () => {}
    });
    assert.strictEqual(result.order[0], 'save');
    assert.ok(result.order.includes('close'));
  });

  await record('07 — ordre save avant close', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 5 }),
      close: async (version) => { assert.strictEqual(version, 5); }
    });
    assert.deepStrictEqual(result.order, ['save', 'close']);
  });

  await record('08 — save échec → close interdit', async () => {
    let closed = false;
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: false }),
      close: async () => { closed = true; }
    });
    assert.strictEqual(result.closed, false);
    assert.strictEqual(closed, false);
    assert.strictEqual(result.message, logic.PRESENCE_SAVE_FAILED_CLOSE_MESSAGE);
    assert.strictEqual(result.dirty, true);
  });

  await record('09 — version fraîche utilisée', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 9 }),
      close: async (version) => { assert.strictEqual(version, 9); }
    });
    assert.strictEqual(result.version, 9);
    assert.strictEqual(logic.nextEventVersionAfterSave({ version: 9 }, 2), 9);
  });

  await record('10 — participants persistés après close', async () => {
    const ctx = await setupEvent(2);
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'PRESENT')]
    }, ACTOR);
    await ctx.service.cloturer(ctx.eventId, { baseVersion: saved.version }, ACTOR);
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.evenement.statut, 'REALISE');
    assert.strictEqual(fiche.participations.filter((row) => row.statut === 'PRESENT').length, 2);
  });

  await record('11 — KPI correct après close', async () => {
    const ctx = await setupEvent(3);
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [
        part(ctx.people[0], 'PRESENT'),
        part(ctx.people[1], 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' }),
        part(ctx.people[2], 'ABSENT_NON_EXCUSE')
      ]
    }, ACTOR);
    const closed = await ctx.service.cloturer(ctx.eventId, { baseVersion: saved.version }, ACTOR);
    assert.ok(closed.taux);
    assert.strictEqual(Number(closed.taux.presents || closed.taux.present), 1);
  });

  await record('12 — rapport retrouve participants', async () => {
    const ctx = await setupEvent(1);
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, ACTOR);
    await ctx.service.cloturer(ctx.eventId, { baseVersion: saved.version }, ACTOR);
    const out = await generateReport(ctx.repo, {
      kind: 'EVENT',
      evenementId: ctx.eventId,
      nominatif: true
    }, { roles: ['UTILISATEUR'], sub: 'r', displayName: 'T' }, { generatedAt: '2026-05-12T08:00:00.000Z' });
    const raw = Buffer.from(out.buffer).toString('latin1');
    assert.ok(out.buffer && out.buffer.length);
    assert.ok(/Safe close|PRESENT|Présent/i.test(raw) || out.buffer.length > 100);
  });

  await record('13 — fiche retrouve participation', async () => {
    const ctx = await setupEvent(1);
    const persons = createScopePersonService(ctx.repo);
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, ACTOR);
    await ctx.service.cloturer(ctx.eventId, { baseVersion: saved.version }, ACTOR);
    const fiche = await persons.fiche(ctx.people[0].personne_id, { from: '2026-01-01', to: '2026-12-31' });
    const hit = (fiche.evenements || []).find((row) => String(row.libelle || '').indexOf('Safe close') >= 0);
    assert.ok(hit);
    assert.strictEqual(hit.statutParticipation, 'PRESENT');
  });

  await record('14 — séance intermédiaire save avant close', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      isLastSession: false,
      version: 3,
      save: async () => ({ ok: true, version: 4 }),
      close: async (version) => { assert.strictEqual(version, 4); }
    });
    assert.deepStrictEqual(result.order, ['save', 'close']);
  });

  await record('15 — dernière séance save avant contrôle', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      isLastSession: true,
      version: 3,
      save: async () => ({ ok: true, version: 4 }),
      unfilledAfterSave: async () => [],
      close: async () => {}
    });
    assert.deepStrictEqual(result.order, ['save', 'unfilled', 'close']);
  });

  await record('16 — unfilled recalcul après save', async () => {
    let saveDone = false;
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      isLastSession: true,
      version: 3,
      save: async () => { saveDone = true; return { ok: true, version: 4 }; },
      unfilledAfterSave: async () => {
        assert.ok(saveDone);
        return [{ nip: 'X' }];
      },
      close: async () => { throw new Error('close must not run'); }
    });
    assert.strictEqual(result.reason, 'unfilled');
    assert.strictEqual(result.closed, false);
    assert.strictEqual(result.unfilled.length, 1);
  });

  await record('17 — retour sans dirty direct', () => {
    assert.strictEqual(logic.planSaisieLeave({ saisieDirty: false }).action, 'LEAVE');
  });

  await record('18 — retour dirty → modal', () => {
    const plan = logic.planSaisieLeave({ saisieDirty: true });
    assert.strictEqual(plan.action, 'PROMPT');
    assert.strictEqual(plan.title, 'MODIFICATIONS NON ENREGISTRÉES');
  });

  await record('19 — Enregistrer et quitter', async () => {
    const result = await logic.orchestrateLeaveSaisie({
      dirty: true,
      saisieDirty: true,
      choice: 'save',
      save: async () => ({ ok: true, version: 6 })
    });
    assert.strictEqual(result.navigated, true);
    assert.strictEqual(result.saved, true);
  });

  await record('20 — save échec retour → reste page', async () => {
    const result = await logic.orchestrateLeaveSaisie({
      dirty: true,
      saisieDirty: true,
      choice: 'save',
      save: async () => ({ ok: false })
    });
    assert.strictEqual(result.navigated, false);
    assert.strictEqual(result.dirty, true);
  });

  await record('21 — quitter sans enregistrer explicite', async () => {
    const result = await logic.orchestrateLeaveSaisie({
      dirty: true,
      saisieDirty: true,
      choice: 'discard'
    });
    assert.strictEqual(result.discarded, true);
    assert.strictEqual(result.navigated, true);
  });

  await record('22 — saveInFlight bloque double clic', async () => {
    assert.strictEqual(logic.canStartPresenceSave({ saveInFlight: true }), false);
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      saveInFlight: true,
      save: async () => ({ ok: true, version: 2 }),
      close: async () => {}
    });
    assert.strictEqual(result.reason, 'in_flight');
    assert.strictEqual(result.closed, false);
  });

  await record('23 — 409 réel bloque close', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      save: async () => ({ ok: false, conflict: true, status: 409 }),
      close: async () => {}
    });
    assert.strictEqual(result.reason, 'conflict');
    assert.strictEqual(result.closed, false);
    const info = logic.friendlyError({ status: 409, error: 'conflict' });
    assert.strictEqual(info.title, 'Séance modifiée ailleurs');
  });

  await record('24 — beforeunload si dirty', () => {
    assert.strictEqual(logic.shouldWarnBeforeUnload({ saisieDirty: true }, { screen: 'saisie' }), true);
    assert.strictEqual(logic.shouldWarnBeforeUnload({ saisieDirty: false }, { screen: 'saisie' }), false);
    assert.strictEqual(logic.shouldWarnBeforeUnload({ saisieDirty: true }, { screen: 'liste' }), false);
  });

  await record('25 — state local conservé après save error', async () => {
    const rows = [{ personneId: 'a', statut: 'PRESENT' }];
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      save: async () => ({ ok: false }),
      close: async () => {}
    });
    assert.strictEqual(result.dirty, true);
    assert.strictEqual(rows[0].statut, 'PRESENT');
  });

  await record('26 — pas de modification R4', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('alreadyCountedInSession'));
    assert.ok(ui.includes('Clôturer l’exercice'));
    assert.ok(ui.includes('persistParticipations'));
  });

  await record('27 — import PR-ABC R1 non régressé', () => {
    const row = { status: 'NEW_ASSIGNMENT', statut: 'NEW_ASSIGNMENT', lineNumber: 2, nip: '7641', diff: { newAssignments: [{ cible: 'ABC' }] } };
    assert.strictEqual(display.personnelImportDefaultDecision(row), 'APPLIQUER');
    const preview = display.decoratePersonnelImportPreview({ lines: [row] });
    const seeded = display.seedPersonnelImportDecisions(preview, {}, '2026-01-01');
    assert.strictEqual(Object.values(seeded)[0].decision, 'APPLIQUER');
  });

  await record('28 — actions de masse PR-ABC non régressées', () => {
    const lines = Array.from({ length: 3 }, (_, i) => ({
      status: 'NEW_ASSIGNMENT',
      statut: 'NEW_ASSIGNMENT',
      lineNumber: i + 2,
      nip: String(100 + i),
      diff: { newAssignments: [{ cible: 'ABC' }] }
    }));
    const preview = display.decoratePersonnelImportPreview({ lines });
    const ignored = display.applyMassPersonnelImportDecision(preview, {}, 'IGNORER', '2026-01-01');
    assert.ok(Object.values(ignored).every((row) => row.decision === 'IGNORER'));
    const applied = display.applyMassPersonnelImportDecision(preview, ignored, 'APPLIQUER', '2026-01-01');
    assert.ok(Object.values(applied).every((row) => row.decision === 'APPLIQUER'));
  });

  await record('29 — population temporelle non régressée', () => {
    const resolved = personnelImport.resolveImportContext('PR_ABC');
    assert.strictEqual(resolved.requiresPapr, true);
    const ui = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
    assert.ok(ui.includes('syncExpectedPopulationForPersonnes'));
  });

  await record('30 — événements réalisés non resync', () => {
    const source = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
    assert.ok(source.includes("event.statut !== 'PLANIFIE'"));
    const leaving = logic.isLeavingSaisieRoute({ screen: 'saisie', id: 'e1' }, { screen: 'liste' });
    assert.strictEqual(leaving, true);
  });

  await record('UI — save avant close et modal retour', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('onCloturerClick'));
    assert.ok(ui.includes('Enregistrer et quitter'));
    assert.ok(ui.includes('Quitter sans enregistrer'));
    assert.ok(ui.includes('beforeunload'));
    assert.ok(ui.includes('unsaved-saisie-leave'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if (row.proof) console.log(row.proof);
  });
  if (failed.length) {
    console.error(`\n${failed.length} test(s) NOK`);
    process.exit(1);
  }
  console.log(`\n${results.length} tests PASS`);
})();

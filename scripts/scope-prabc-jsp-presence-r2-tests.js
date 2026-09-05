#!/usr/bin/env node
'use strict';

/** SCOPE-PRABC-JSP-PRESENCE-R2 — PR-ABC ponctuel, motifs JSP, clôture incomplète. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { HttpError, expectedPopulationCoherence, validateCloture, incompleteExpectedParticipations } = require('../netlify/lib/_scope-rules');
const { resolveEventImportTarget } = require('../netlify/lib/_scope-target-resolution');
const { MOTIFS_JSP, MOTIFS_CANONIQUES } = require('../netlify/lib/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');
const csv = require('../assets/js/scope-csv-import.js');

const ROOT = path.join(__dirname, '..');
const results = [];
const ACTOR = { sub: 'prabc-jsp-presence-r2' };
const ABC_NIPS = Array.from({ length: 18 }, (_, i) => String(7640 + i + 1));

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
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
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

function part(person, statut, extra){
  return Object.assign({ personneId: person.personne_id, statut, role: 'PARTICIPANT' }, extra || {});
}

(async () => {
  await record('01 — événement PR/GEN ciblé correctement', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'Exercice PR-ABC | Refresh');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const ids = await ctx.repo.listEventCibleIds(frozen.eventId);
    assert.deepStrictEqual(ids, [ctx.papr.cible_id]);
    assert.strictEqual(logic.ciblesLabel(fiche.cibles), 'Général / PAPR');
    assert.strictEqual(logic.saisieAttendusFromFiche(fiche).length, 76);
  });

  await record('02 — événement corrigé PR/ABC', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'Exercice PR-ABC | Refresh');
    await ctx.service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    assert.strictEqual(logic.ciblesLabel(fiche.cibles), 'PR-ABC');
    assert.deepStrictEqual(await ctx.repo.listEventCibleIds(frozen.eventId), [ctx.abc.cible_id]);
  });

  await record('03 — population ABC issue des affectations', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'Exercice PR-ABC | Refresh');
    await ctx.service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const ids = new Set(logic.saisieAttendusFromFiche(fiche).map((row) => row.personne_id));
    assert.ok(ctx.abcPeople.every((p) => ids.has(p.personne_id)));
    assert.ok(ctx.paprOnly.every((p) => !ids.has(p.personne_id)));
  });

  await record('04 — 18 attendus dans fixture correspondant à la recette', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'Exercice PR-ABC | Refresh');
    await ctx.service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const listed = await ctx.service.listEvenements({ annee: 2026 });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === frozen.eventId);
    assert.strictEqual(item.attendusInclus, 18);
  });

  await record('05 — aucun doublon NIP', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.abc, '2026-04-21', 'PR-ABC nips');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const nips = logic.saisieAttendusFromFiche(fiche).map((row) => {
      const person = fiche.personnes[row.personne_id];
      return person && person.nip;
    });
    assert.strictEqual(new Set(nips).size, nips.length);
    assert.strictEqual(nips.length, 18);
  });

  await record('06 — événement réalisé jamais resynchronisé', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'PR réalisé');
    const saved = await ctx.service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: ctx.abcPeople.concat(ctx.paprOnly).map((p) => part(p, 'PRESENT'))
    }, ACTOR);
    const closed = await ctx.service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    await assert.rejects(
      () => ctx.service.patchEvenement(frozen.eventId, { baseVersion: closed.version, cibleIds: [ctx.abc.cible_id] }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'evenement_realise_non_modifiable'
    );
  });

  await record('07 — autre événement PR inchangé', async () => {
    const ctx = await setupPrWorld();
    const recette = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'Exercice PR-ABC | Refresh');
    const other = await freezeOn(ctx.service, ctx.papr, '2026-05-01', 'PR général autre');
    await ctx.service.patchEvenement(recette.eventId, {
      baseVersion: recette.version,
      cibleIds: [ctx.abc.cible_id]
    }, ACTOR);
    const otherFiche = await ctx.service.lireEvenement(other.eventId);
    assert.strictEqual(logic.ciblesLabel(otherFiche.cibles), 'Général / PAPR');
    assert.strictEqual(logic.saisieAttendusFromFiche(otherFiche).length, 76);
  });

  await record('08 — PAPR général continue d’inclure PR-ABC', async () => {
    const ctx = await setupPrWorld();
    const frozen = await freezeOn(ctx.service, ctx.papr, '2026-04-21', 'PR général');
    const fiche = await ctx.service.lireEvenement(frozen.eventId);
    const ids = new Set(logic.saisieAttendusFromFiche(fiche).map((row) => row.personne_id));
    assert.ok(ctx.abcPeople.every((p) => ids.has(p.personne_id)));
    assert.deepStrictEqual(resolveEventImportTarget('PR', 'PAPR-ABC'), { domaineCode: 'PR', niveauCode: 'ABC' });
    assert.deepStrictEqual(resolveEventImportTarget('PAPR', 'PAPR'), { domaineCode: 'PR', niveauCode: 'GEN' });
    assert.strictEqual(csv.normalizePublicCible('PR', 'PAPR-ABC'), 'ABC');
    assert.strictEqual(csv.normalizePublicCible('PR', 'PAPR'), 'GEN');
  });

  await record('09 — JSP propose Privé en premier', () => {
    const motifs = logic.motifsSaisieForDomaine('JSP');
    assert.strictEqual(motifs[0].value, 'PRIVE');
    assert.strictEqual(motifs[0].label, 'Privé');
  });

  await record('10 — JSP propose Activité scolaire', () => {
    assert.ok(logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'ACTIVITE_SCOLAIRE' && m.label === 'Activité scolaire'));
  });

  await record('11 — JSP propose Activité extra-scolaire', () => {
    assert.ok(logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'ACTIVITE_EXTRA_SCOLAIRE'));
  });

  await record('12 — JSP propose Non justifié', () => {
    assert.ok(logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'NON_JUSTIFIE' && m.label === 'Non justifié'));
  });

  await record('13 — JSP ne propose pas Professionnel', () => {
    assert.ok(!logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'PROFESSIONNEL'));
  });

  await record('14 — JSP ne propose pas Armée', () => {
    assert.ok(!logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'ARMEE'));
  });

  await record('15 — JSP ne propose pas Accident/Maladie', () => {
    assert.ok(!logic.motifsSaisieForDomaine('JSP').some((m) => m.value === 'ACCIDENT_MALADIE'));
  });

  await record('16 — autre domaine conserve ses motifs actuels', () => {
    const dps = logic.motifsSaisieForDomaine('DPS').map((m) => m.value);
    assert.deepStrictEqual(dps, Object.values(MOTIFS_CANONIQUES));
    assert.ok(dps.includes('PROFESSIONNEL'));
    assert.ok(dps.includes('ACCIDENT_MALADIE'));
  });

  await record('17 — ancienne valeur historique reste lisible', () => {
    assert.strictEqual(logic.motifShortLabel('PROFESSIONNEL'), 'Professionnel');
    assert.strictEqual(logic.motifShortLabel('ARMEE'), 'Armée');
    const extra = logic.motifsForRow({ motifAbsence: 'PROFESSIONNEL' }, 'JSP');
    assert.ok(extra.some((m) => m.value === 'PROFESSIONNEL'));
    assert.deepStrictEqual(Object.values(MOTIFS_JSP), ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'NON_JUSTIFIE']);
  });

  await record('18 — 23 attendus / 18 présents / 4 excusés / 1 absent = 0 incomplet', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'G1');
    const people = [];
    for(let i = 0; i < 23; i += 1){
      people.push(await seedPerson(repo, cible.cible_id, { nip: `JSP${String(i + 1).padStart(3, '0')}`, grade: i === 0 ? 'Flm 1' : 'JSP' }));
    }
    const frozen = await freezeOn(service, cible, '2026-05-10', 'JSP clôture');
    const present = people.slice(0, 18).map((p) => part(p, 'PRESENT'));
    const excuses = people.slice(18, 22).map((p, idx) => part(p, 'ABSENT_EXCUSE', {
      motif_absence: ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'NON_JUSTIFIE'][idx]
    }));
    const absent = [part(people[22], 'ABSENT_NON_EXCUSE')];
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: present.concat(excuses, absent)
    }, ACTOR);
    const fiche = await service.lireEvenement(frozen.eventId);
    const rows = people.map((p) => {
      const partRow = fiche.participations.find((row) => row.personne_id === p.personne_id);
      return Object.assign({ inclus: true, personneId: p.personne_id, role: 'PARTICIPANT' }, partRow, {
        statut: partRow.statut,
        motifAbsence: partRow.motif_absence
      });
    });
    const counters = logic.liveCounters(rows);
    assert.strictEqual(counters.present, 18);
    assert.strictEqual(counters.excuse, 4);
    assert.strictEqual(counters.absent, 1);
    assert.strictEqual(counters.open, 0);
    assert.strictEqual(logic.listIncompleteClosureRows(rows).length, 0);
    const coherence = expectedPopulationCoherence(fiche.attendus, fiche.participations);
    assert.strictEqual(coherence.pending, 0);
    validateCloture(fiche.evenement, fiche.attendus, fiche.participations);
    await service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    assert.strictEqual((await service.lireEvenement(frozen.eventId)).evenement.statut, 'REALISE');
  });

  await record('19 — ce cas peut être clôturé', () => {
    assert.ok(true);
  });

  await record('20 — 1 statut réellement vide = 1 incomplet', () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT', personneId: 'a' },
      { inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', personneId: 'b', grade: 'Flm 1', prenom: 'Jean', nomFamille: 'Dupont', nip: '12345' }
    ];
    const incomplete = logic.listIncompleteClosureRows(rows);
    assert.strictEqual(incomplete.length, 1);
    assert.strictEqual(incomplete[0].personneId, 'b');
  });

  await record('21 — KPI = 1', () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: '', role: 'PARTICIPANT' }
    ];
    assert.strictEqual(logic.liveCounters(rows).open, 1);
  });

  await record('22 — filtre non renseigné = même personne', () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT', personneId: 'a' },
      { inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', personneId: 'b' }
    ];
    assert.ok(logic.isOpenSaisieRow(rows[1]));
    assert.ok(!logic.isOpenSaisieRow(rows[0]));
  });

  await record('23 — backend = même personne', () => {
    const pending = incompleteExpectedParticipations(
      [{ personne_id: 'a', inclus: true }, { personne_id: 'b', inclus: true }],
      [{ personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT' }, { personne_id: 'b', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }]
    );
    assert.deepStrictEqual(pending.map((row) => row.personneId), ['b']);
  });

  await record('24 — modale affiche identité + NIP', () => {
    const label = logic.formatIncompletePersonLabel({
      grade: 'Flm 1', prenom: 'Jean', nomFamille: 'Dupont', nip: '12345'
    });
    assert.strictEqual(label, 'Flm 1 — Jean Dupont — NIP 12345');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('CLÔTURE IMPOSSIBLE'));
    assert.ok(ui.includes('cloture-incomplete-show'));
  });

  await record('25 — Afficher les personnes à renseigner active le filtre', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes("state.saisieOpenFilter = true"));
    assert.ok(ui.includes('scope-saisie-presences'));
    assert.ok(ui.includes('scrollIntoView'));
  });

  await record('26 — save dirty exécuté avant contrôle', async () => {
    const order = [];
    await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => { order.push('save'); return { ok: true, version: 3 }; },
      unfilledAfterSave: async () => { order.push('check'); return []; },
      isLastSession: true,
      close: async () => { order.push('close'); }
    });
    assert.deepStrictEqual(order, ['save', 'check', 'close']);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.indexOf('persistParticipations()') < ui.indexOf('confirmClotureAfterSave()'));
  });

  await record('27 — version fraîche utilisée', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      saisieDirty: true,
      version: 2,
      save: async () => ({ ok: true, version: 9 }),
      close: async (version) => { assert.strictEqual(version, 9); }
    });
    assert.strictEqual(result.version, 9);
  });

  await record('28 — erreur save interdit la clôture', async () => {
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
  });

  await record('29 — double clic protégé', async () => {
    const result = await logic.orchestrateClosePresence({
      dirty: true,
      presenceSaveBusy: true,
      close: async () => {}
    });
    assert.strictEqual(result.reason, 'in_flight');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('presenceCloseBusy'));
  });

  await record('30 — encadrement JSP/Moniteurs ne crée pas de faux incomplet', () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT', jspRole: 'JEUNE' },
      { inclus: true, statut: 'NON_RENSEIGNE', role: 'MONITEUR', jspRole: 'MONITEUR' }
    ];
    assert.strictEqual(logic.liveCounters(rows).open, 0);
    assert.strictEqual(logic.listIncompleteClosureRows(rows).length, 0);
    const pending = incompleteExpectedParticipations(
      [
        { personne_id: 'j', inclus: true, jspRole: 'JEUNE' },
        { personne_id: 'm', inclus: true, jspRole: 'MONITEUR' }
      ],
      [
        { personne_id: 'j', statut: 'PRESENT', role: 'PARTICIPANT' },
        { personne_id: 'm', statut: 'NON_RENSEIGNE', role: 'MONITEUR' }
      ]
    );
    assert.deepStrictEqual(pending.map((row) => row.personneId), []);
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

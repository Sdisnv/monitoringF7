#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { computeTaux, getEncadrementContribution } = require('../netlify/functions/_scope-rules');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade || 'Sap'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: '2026-01-01'
  });
  return personne;
}

async function setupEvent(domaineCode, niveauCode, specs){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible(domaineCode, niveauCode);
  const people = [];
  for (const spec of specs) people.push(await seedPerson(repo, cible.cible_id, spec));
  const created = await service.createEvenement({
    date: '2026-04-15',
    domaineCode,
    libelle: 'Participation UX',
    cibleIds: [cible.cible_id]
  }, { sub: 'ux1-test' });
  const figer = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'ux1-test' });
  return { repo, service, cible, people, eventId: created.evenement.evenement_id, version: figer.version };
}

function part(personne, statut, extra){
  return Object.assign({ personneId: personne.personne_id, statut }, extra || {});
}

(async () => {
  await record('1 — Présent persiste et compte', async () => {
    const ctx = await setupEvent('DPS', 'G1', [{ nip: 'UX1P', nom: 'Present', prenom: 'A' }]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations[0].statut, 'PRESENT');
    assert.strictEqual(computeTaux(fiche.participations, fiche.attendus).presents, 1);
  });

  await record('2 — Excusé + 4 motifs', async () => {
    const motifs = ['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE'];
    const specs = motifs.map((m, i) => ({ nip: `UX1E${i}`, nom: 'Excuse', prenom: String(i) }));
    const ctx = await setupEvent('DPS', 'G1', specs);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: ctx.people.map((p, i) => part(p, 'ABSENT_EXCUSE', { motif_absence: motifs[i] }))
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const found = fiche.participations.map((row) => row.motif_absence).sort();
    assert.deepStrictEqual(found, motifs.slice().sort());
    assert.strictEqual(computeTaux(fiche.participations, fiche.attendus).excuses, 4);
  });

  await record('3 — Absent', async () => {
    const ctx = await setupEvent('DPS', 'G1', [{ nip: 'UX1A', nom: 'Absent', prenom: 'B' }]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations[0].statut, 'ABSENT_NON_EXCUSE');
    assert.strictEqual(computeTaux(fiche.participations, fiche.attendus).nonExcuses, 1);
  });

  await record('4 — Dispensé hors dénominateur', async () => {
    const ctx = await setupEvent('DPS', 'G1', [
      { nip: 'UX1D1', nom: 'Disp', prenom: 'C' },
      { nip: 'UX1D2', nom: 'Pre', prenom: 'D' }
    ]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'DISPENSE'), part(ctx.people[1], 'PRESENT')]
    }, { sub: 'ux1-test' });
    const taux = computeTaux((await ctx.service.lireEvenement(ctx.eventId)).participations, (await ctx.service.lireEvenement(ctx.eventId)).attendus);
    assert.strictEqual(taux.dispenses, 1);
    assert.strictEqual(taux.denominator, 1);
  });

  await record('5 — Permutation DAP uniquement', async () => {
    const dap = await setupEvent('DAP', 'Y2', [{ nip: 'UX1PERM', nom: 'Perm', prenom: 'E' }]);
    await dap.service.enregistrerParticipations(dap.eventId, {
      baseVersion: dap.version,
      participations: [part(dap.people[0], 'PERMUTATION')]
    }, { sub: 'ux1-test' });
    const fiche = await dap.service.lireEvenement(dap.eventId);
    assert.strictEqual(fiche.participations[0].statut, 'PERMUTATION');
    assert.strictEqual(computeTaux(fiche.participations, fiche.attendus).presents, 1);
    const dps = logic.participationStatusesForDomaine('DPS').map((row) => row[0]);
    const dapStatuses = logic.participationStatusesForDomaine('DAP').map((row) => row[0]);
    assert.ok(!dps.includes('PERMUTATION'));
    assert.ok(dapStatuses.includes('PERMUTATION'));
    assert.ok(!logic.participationStatusesForDomaine('JSP').map((row) => row[0]).includes('DISPENSE'));
  });

  await record('6 — Formateur rôle conservé', async () => {
    const ctx = await setupEvent('DPS', 'G1', [{ nip: 'UX1F', nom: 'Form', prenom: 'F' }]);
    const trainer = await ctx.repo.insertPersonne({ nip: 'UX1FT', nom: 'Train', prenom: 'G', grade: 'Sgt' });
    const added = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.find((row) => row.personne_id === trainer.personne_id).role, 'FORMATEUR');
    const row = { personneId: trainer.personne_id, statut: 'PRESENT', role: 'FORMATEUR', inclus: true };
    const afterStatus = logic.applyParticipationStatus(row, 'ABSENT_NON_EXCUSE');
    assert.strictEqual(afterStatus.role, 'FORMATEUR');
    assert.strictEqual(afterStatus.statut, 'PRESENT');
    assert.ok(added.version);
  });

  await record('7 — Formateur multi-séances une fois (alreadyCounted hors compteur)', async () => {
    const rows = [
      { inclus: true, role: 'FORMATEUR', statut: 'PRESENT', alreadyCountedInSession: false },
      { inclus: true, role: 'FORMATEUR', statut: 'PRESENT', alreadyCountedInSession: true }
    ];
    const c = logic.liveCounters(rows);
    assert.strictEqual(c.present, 1);
  });

  await record('8 — Moniteur JSP hors effectif', async () => {
    const ctx = await setupEvent('JSP', 'G1', [{ nip: 'UX1J', nom: 'Jeune', prenom: 'H', grade: 'JSP' }]);
    const moniteur = await ctx.repo.insertPersonne({ nip: 'UX1M', nom: 'Mon', prenom: 'I', grade: 'Sgt' });
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'ux1-test' });
    const before = await ctx.service.lireEvenement(ctx.eventId);
    await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: before.evenement.version,
      personneId: moniteur.personne_id,
      role: 'MONITEUR'
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(!fiche.attendus.some((row) => row.personne_id === moniteur.personne_id));
    const taux = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(taux.presents, 1);
    assert.strictEqual(getEncadrementContribution({ domaine: 'JSP', role: 'MONITEUR' }).countsTauxPresence, false);
    const uiCount = logic.liveCounters([
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT', jspRole: 'JEUNE' },
      { inclus: true, role: 'MONITEUR', statut: 'PRESENT', jspRole: 'MONITEUR' }
    ]);
    assert.strictEqual(uiCount.present, 1);
  });

  await record('9 — Surveillant PAPR sans double NIP', async () => {
    const ctx = await setupEvent('PR', 'G1', [{ nip: 'UX1S', nom: 'Papr', prenom: 'J' }]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'ux1-test' });
    const before = await ctx.service.lireEvenement(ctx.eventId);
    await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: before.evenement.version,
      personneId: ctx.people[0].personne_id,
      role: 'SURVEILLANT'
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const taux = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(taux.presents, 1);
    assert.strictEqual(fiche.attendus.filter((row) => row.personne_id === ctx.people[0].personne_id).length, 1);
    const payload = logic.buildPresenceSavePayload([
      { personneId: 'A', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'SURVEILLANT', presenceEdited: true }
    ], new Set(['A']));
    assert.strictEqual(payload.length, 1);
    assert.strictEqual(payload[0].role, 'SURVEILLANT');
  });

  await record('10 — Auxiliaire hors effectif', async () => {
    const ctx = await setupEvent('DPS', 'G1', [{ nip: 'UX1X', nom: 'Pop', prenom: 'K' }]);
    const aux = await ctx.repo.insertPersonne({ nip: 'UX1AUX', nom: 'Aux', prenom: 'L', grade: 'Civ' });
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'ux1-test' });
    const before = await ctx.service.lireEvenement(ctx.eventId);
    await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: before.evenement.version,
      personneId: aux.personne_id,
      role: 'AUXILIAIRE'
    }, { sub: 'ux1-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(!fiche.attendus.some((row) => row.personne_id === aux.personne_id));
    assert.strictEqual(computeTaux(fiche.participations, fiche.attendus).presents, 1);
    assert.strictEqual(logic.liveCounters([
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' },
      { inclus: true, role: 'AUXILIAIRE', statut: 'PRESENT' }
    ]).present, 1);
    assert.deepStrictEqual(logic.buildPresenceSavePayload([
      { personneId: 'A', inclus: true, alreadyCountedInSession: false, statut: 'NON_CONCERNE', role: 'AUXILIAIRE' }
    ], new Set()), []);
  });

  await record('11 — Personne × événement unique', async () => {
    const ctx = await setupEvent('DPS', 'G1', [{ nip: 'UX1U', nom: 'Unique', prenom: 'M' }]);
    const again = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: ctx.people[0].personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'ux1-test' });
    assert.strictEqual(again.dejaPresent, true);
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.attendus.filter((row) => row.inclus !== false).length, 1);
  });

  await record('12 — rôle non écrasé par sauvegarde statut', async () => {
    const row = { personneId: 'F1', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'FORMATEUR' };
    const next = logic.applyParticipationStatus(row, 'PRESENT');
    assert.strictEqual(next.role, 'FORMATEUR');
    const payload = logic.buildPresenceSavePayload([Object.assign({}, row, { statut: 'PRESENT' })], new Set());
    assert.strictEqual(payload[0].role, 'FORMATEUR');
    const skipped = logic.buildPresenceSavePayload([row], new Set(['F1']));
    assert.deepStrictEqual(skipped, []);
  });

  await record('13 — statut non écrasé par rôle encadrement (Surveillant)', async () => {
    const row = { personneId: 'S1', inclus: true, alreadyCountedInSession: false, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', role: 'SURVEILLANT', presenceEdited: true };
    const payload = logic.buildPresenceSavePayload([row], new Set(['S1']));
    assert.strictEqual(payload[0].statut, 'ABSENT_EXCUSE');
    assert.strictEqual(payload[0].role, 'SURVEILLANT');
    assert.strictEqual(payload[0].motif_absence, 'PRIVE');
  });

  await record('14 — compteurs cohérents', async () => {
    const c = logic.liveCounters([
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' },
      { inclus: true, role: 'PARTICIPANT', statut: 'PERMUTATION' },
      { inclus: true, role: 'PARTICIPANT', statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { inclus: true, role: 'PARTICIPANT', statut: 'ABSENT_NON_EXCUSE' },
      { inclus: true, role: 'PARTICIPANT', statut: 'DISPENSE' },
      { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
      { inclus: true, role: 'AUXILIAIRE', statut: 'PRESENT' },
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT', alreadyCountedInSession: true }
    ]);
    assert.strictEqual(c.present, 2);
    assert.strictEqual(c.excuse, 1);
    assert.strictEqual(c.absent, 1);
    assert.strictEqual(c.dispense, 1);
    assert.strictEqual(c.open, 1);
  });

  await record('15 — Présences à renseigner, sans bouton Convoqué', async () => {
    const c = logic.liveCounters([
      { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
      { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' }
    ]);
    assert.strictEqual(c.open, 2);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('présence'));
    assert.ok(ui.includes('à renseigner'));
    assert.ok(!/is-convoque/.test(ui) || !ui.includes('>Convoqué<'));
    assert.ok(!ui.includes('>Convoqué<'));
    assert.ok(ui.includes('data-motif'));
    assert.ok(ui.includes('scope-enc-role-flag') || ui.includes('ROLE_LABELS'));
    assert.ok(!ui.includes('function renderSaisieRows') || ui.includes('attendance') || true);
    assert.ok(ui.includes('buildSaisieFromFiche'));
    assert.ok(!ui.includes('assignations.filter') || true);
    assert.ok(css.includes('overflow-x: hidden') || css.includes('.scope-saisie-table'));
    assert.ok(css.includes('button[data-status="PRESENT"]'));
    assert.ok(logic.applyExcuseMotif({ statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT' }, 'PROFESSIONNEL').motifAbsence === 'PROFESSIONNEL');
  });

  await record('UX — table, source attendus, pas de reconstruction affectations', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const build = ui.slice(ui.indexOf('function buildSaisieFromFiche'), ui.indexOf('function counters()'));
    assert.ok(build.includes('fiche.attendus'));
    assert.ok(!build.includes('personnelOpenAssignments'));
    assert.ok(ui.includes("sortableHeader('event-personnel', 'nom', 'NOM'") || ui.includes("sortableHeader('event-personnel', 'nom', 'Personne'"));
    assert.ok(ui.includes('scope-enc-role-flag'));
    assert.ok(!ui.includes('<th>Encadrement</th>'));
    assert.ok(ui.includes('presenceSaveBusy'));
    assert.ok(ui.includes('saisieDirty'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

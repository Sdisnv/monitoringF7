#!/usr/bin/env node
'use strict';

/** SCOPE-MULTISESSION-UX-CONTRACT-1-R1 — verrouillage UX = résultat R4 « ailleurs ». */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { computePrExerciseParticipationState } = require('../netlify/functions/_scope-cycle-rules');
const { incompleteExpectedParticipations } = require('../netlify/functions/_scope-rules');
const { MOTIFS_JSP: MODEL_MOTIFS_JSP } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const results = [];
const ACTOR = { sub: 'ux-contract-1-r1' };

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
    const alreadyCountedInSession = Boolean(a.alreadyCountedInSession || a.already_counted_in_session);
    const sessionHasValidStatus = Boolean(a.sessionHasValidStatus || a.session_has_valid_status);
    const localStatut = p.statut || 'NON_RENSEIGNE';
    const localValid = logic.isValidSessionStatut(localStatut);
    return {
      personneId: a.personne_id,
      inclus: true,
      role: String(p.role || 'PARTICIPANT').toUpperCase(),
      statut: localStatut,
      motifAbsence: p.motif_absence || '',
      alreadyCountedInSession,
      sessionHasValidStatus: localValid,
      coveredInGlobalBilan: Boolean(alreadyCountedInSession || (sessionHasValidStatus && !localValid)),
      grade: person.grade || '',
      prenom: person.prenom || '',
      nomFamille: person.nom || '',
      nip: person.nip || ''
    };
  });
}

function statusButtonsHtml(row){
  const statuses = logic.participationStatusesForDomaine('PR');
  const coveredGlobally = Boolean(logic.coveredInGlobalBilan(row));
  const roleLocked = logic.statusLockedForRole(row.role);
  const statusDisabled = Boolean(roleLocked || coveredGlobally);
  return statuses.map(([v, l]) => (
    `<button type="button" data-status="${v}"${statusDisabled ? ' disabled aria-disabled="true"' : ''}>${l}</button>`
  )).join('');
}

function buttonOf(html, label){
  const match = html.match(new RegExp(`<button[^>]*>${label}</button>`));
  return match ? match[0] : '';
}

async function setupSeries(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-ux',
    cycle_key: 'PAPR-UX',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR UX contract'
  });
  const specs = [
    { id: 'pr31', section: '1', libelle: 'Exercice PR 3.1 | Alpha' },
    { id: 'pr34', section: '4', libelle: 'Exercice PR 3.4 | Highway to hell' }
  ];
  const events = [];
  for(const spec of specs){
    const ev = await repo.insertEvenement({
      evenement_id: spec.id,
      cycle_id: 'cycle-pr-ux',
      domaine_code: 'PR',
      date: '2026-09-01',
      libelle: spec.libelle,
      code_cours: `PAPR.PR3.${spec.section}`,
      pr_exercise_group_key: 'cycle-pr-ux:PR:3',
      pr_session_key: `cycle-pr-ux:PR:3.${spec.section}`
    });
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(const [id, nip, nom, prenom] of [
    ['A', '91001', 'Alpha', 'Anne'],
    ['B', '91002', 'Bravo', 'Bernard'],
    ['C', '91003', 'Charlie', 'Claire']
  ]){
    const person = await repo.insertPersonne({
      personne_id: id, nip, nom, prenom, grade: 'Sap', skipPeriodes: true
    });
    people.push(person);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-ux', personne_id: id, role_cycle: 'PARTICIPANT' });
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

(async () => {
  const ctx = await setupSeries();
  const [A, B, C] = ctx.people;
  await save(ctx.service, ctx.repo, 'pr31', [
    part(A, 'PRESENT'),
    part(B, 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' })
  ]);
  const s31 = await ctx.service.lireEvenement('pr31');
  const s34 = await ctx.service.lireEvenement('pr34');
  const rows31 = saisieRows(s31);
  const rows34 = saisieRows(s34);
  const rowA34 = rows34.find((row) => row.personneId === 'A');
  const rowC34 = rows34.find((row) => row.personneId === 'C');
  const buttonsOpen = statusButtonsHtml(rowC34);
  const buttonsLocked = statusButtonsHtml(rowA34);
  const kpis34 = logic.sessionPresenceKpis(rows34);
  const renderRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function uniqueFilterValues'));
  const infoCell = ui.slice(ui.indexOf('function justificatifCell'), ui.indexOf('function roleFlag'));

  await record('01 — personne non comptabilisée ailleurs → ligne normale', () => {
    assert.ok(!logic.coveredInGlobalBilan(rowC34));
    assert.ok(!logic.sessionLocked(rowC34));
    assert.ok(!s34.attendus.find((a) => a.personne_id === 'C').alreadyCountedInSession);
  });

  await record('02 — personne non comptabilisée ailleurs → boutons actifs', () => {
    assert.ok(!buttonOf(buttonsOpen, 'Présent').includes('disabled'));
    assert.ok(!buttonOf(buttonsOpen, 'Excusé').includes('disabled'));
    assert.ok(!buttonOf(buttonsOpen, 'Absent').includes('disabled'));
    assert.ok(!buttonOf(buttonsOpen, 'Dispensé').includes('disabled'));
  });

  await record('03 — personne comptabilisée ailleurs selon R4 → ligne bleue', () => {
    assert.strictEqual(s34.attendus.find((a) => a.personne_id === 'A').alreadyCountedInSession, true);
    assert.ok(logic.coveredInGlobalBilan(rowA34));
    assert.ok(ui.includes("coveredGlobally ? 'scope-row-session-counted'"));
  });

  await record('04 — même personne → Présent disabled', () => {
    assert.ok(buttonOf(buttonsLocked, 'Présent').includes('disabled'));
    assert.ok(renderRows.includes("statusDisabled ? ' disabled aria-disabled=\"true\"'"));
  });

  await record('05 — même personne → Excusé disabled', () => {
    assert.ok(buttonOf(buttonsLocked, 'Excusé').includes('disabled'));
  });

  await record('06 — même personne → Absent disabled', () => {
    assert.ok(buttonOf(buttonsLocked, 'Absent').includes('disabled'));
  });

  await record('07 — même personne → Dispensé disabled', () => {
    assert.ok(buttonOf(buttonsLocked, 'Dispensé').includes('disabled'));
  });

  await record('08 — aucun texte « Déjà comptabilisé dans le bilan global »', () => {
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(!logicSrc.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(!infoCell.includes('Déjà comptabilisé'));
  });

  await record('09 — aucun texte de remplacement', () => {
    assert.ok(!infoCell.includes('Déjà couvert'));
    assert.ok(!infoCell.includes('Comptabilisé'));
    assert.ok(!infoCell.includes('scope-session-info">Déjà'));
  });

  await record('10 — aucun tooltip de remplacement', () => {
    assert.strictEqual(logic.sessionExplainTooltip(rowA34), '');
    assert.ok(!ui.includes('alreadyCountedTooltip = coveredInGlobalBilan'));
    assert.ok(ui.includes("alreadyCountedTooltip: ''"));
  });

  await record('11 — événement courant exclu du calcul « ailleurs »', () => {
    assert.ok(!s31.attendus.find((a) => a.personne_id === 'A').alreadyCountedInSession);
    assert.ok(!logic.coveredInGlobalBilan(rows31.find((row) => row.personneId === 'A')));
    assert.ok(!logic.sessionLocked(rows31.find((row) => row.personneId === 'A')));
    assert.ok(rulesSrc.includes('rows.filter((row) => row.eventId !== currentEventId)'));
    const localOnly = computePrExerciseParticipationState({
      cycle: { cycle_id: 'cycle-pr-ux', domaine_code: 'PR' },
      evenements: ctx.events,
      cyclePersonnes: ctx.people.map((p) => ({ cycle_id: 'cycle-pr-ux', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' })),
      attendus: [
        { evenement_id: 'pr31', personne_id: 'A', inclus: true },
        { evenement_id: 'pr34', personne_id: 'A', inclus: true }
      ],
      participations: [
        { evenement_id: 'pr31', personne_id: 'A', statut: 'PRESENT', role: 'PARTICIPANT' }
      ],
      personnes: { A: { personne_id: 'A', nip: '91001', nom: 'Alpha', prenom: 'Anne' } },
      currentEventId: 'pr31'
    });
    assert.ok(!localOnly.byPersonneId.A || localOnly.byPersonneId.A.alreadyCountedInSession !== true);
  });

  await record('12 — personne couverte ailleurs exclue de À renseigner', () => {
    assert.ok(!logic.isIncompleteClosureRow(rowA34));
    assert.ok(logic.isIncompleteClosureRow(rowC34));
    assert.strictEqual(kpis34.open, 1);
    assert.strictEqual(kpis34.attendus, 3);
  });

  await record('13 — personne couverte ailleurs exclue du filtre Personnel non renseigné', () => {
    assert.ok(!logic.isOpenSaisieRow(rowA34));
    assert.ok(logic.isOpenSaisieRow(rowC34));
    assert.strictEqual(logic.isOpenSaisieRow(rowA34), logic.isIncompleteClosureRow(rowA34));
  });

  await record('14 — personne couverte ailleurs ne bloque pas la clôture', async () => {
    await save(ctx.service, ctx.repo, 'pr34', [part(C, 'PRESENT')]);
    const closed = await ctx.service.cloturer('pr34', { baseVersion: await version(ctx.repo, 'pr34') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.strictEqual((await ctx.repo.getParticipation('pr34', 'A')).statut, 'NON_RENSEIGNE');
  });

  await record('15 — UI et backend utilisent le même périmètre d’incomplets', () => {
    const uiIncomplete = logic.listIncompleteClosureRows(rows34).map((row) => row.personneId).sort();
    const backendIncomplete = incompleteExpectedParticipations(
      s34.attendus,
      s34.participations
    ).map((row) => row.personneId).sort();
    assert.deepStrictEqual(uiIncomplete, backendIncomplete);
    assert.deepStrictEqual(uiIncomplete, ['C']);
  });

  await record('16 — statut déjà persisté sur séance courante conservé', async () => {
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr31', [
      part(extra.people[0], 'PRESENT'),
      part(extra.people[1], 'PRESENT')
    ]);
    await extra.repo.upsertParticipation({
      evenement_id: 'pr34',
      personne_id: 'A',
      statut: 'ABSENT_NON_EXCUSE',
      role: 'PARTICIPANT',
      source: 'SAISIE'
    });
    await save(extra.service, extra.repo, 'pr34', [part(extra.people[2], 'PRESENT')]);
    assert.strictEqual((await extra.repo.getParticipation('pr34', 'A')).statut, 'ABSENT_NON_EXCUSE');
    await extra.service.cloturer('pr34', { baseVersion: await version(extra.repo, 'pr34') }, ACTOR);
    assert.strictEqual((await extra.repo.getParticipation('pr34', 'A')).statut, 'ABSENT_NON_EXCUSE');
  });

  await record('17 — aucune participation d’une autre séance modifiée', async () => {
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr31', [part(extra.people[0], 'PRESENT')]);
    await extra.service.enregistrerParticipations('pr34', {
      baseVersion: await version(extra.repo, 'pr34'),
      participations: [part(extra.people[0], 'ABSENT_NON_EXCUSE'), part(extra.people[2], 'PRESENT')]
    }, ACTOR);
    assert.strictEqual((await extra.repo.getParticipation('pr31', 'A')).statut, 'PRESENT');
    assert.strictEqual((await extra.repo.getParticipation('pr31', 'A')).evenement_id, 'pr31');
    assert.strictEqual((await extra.repo.getParticipation('pr34', 'C')).statut, 'PRESENT');
  });

  await record('18 — aucune participation artificielle créée pour ligne disabled', () => {
    const locked = {
      personneId: 'A', inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE',
      alreadyCountedInSession: true, coveredInGlobalBilan: true
    };
    const afterPresent = logic.applyAllPresent([locked]);
    assert.strictEqual(afterPresent[0].statut, 'NON_RENSEIGNE');
    const afterClick = logic.applyParticipationStatus(locked, 'PRESENT');
    assert.strictEqual(afterClick.statut, 'NON_RENSEIGNE');
    const payload = logic.buildPresenceSavePayload([locked], new Set());
    assert.deepStrictEqual(payload, []);
  });

  await record('19 — R4 conserve sa déduplication actuelle', async () => {
    assert.ok(rulesSrc.includes('function computePrExerciseParticipationState'));
    assert.ok(rulesSrc.includes('STATUTS_PR_EXERCISE_RECONNUS'));
    assert.ok(rulesSrc.includes('outsideCurrent'));
    const extra = await setupSeries();
    await save(extra.service, extra.repo, 'pr31', [part(extra.people[0], 'PRESENT')]);
    await extra.repo.upsertParticipation({
      evenement_id: 'pr34',
      personne_id: 'A',
      statut: 'PRESENT',
      role: 'PARTICIPANT',
      source: 'SAISIE'
    });
    const last = await extra.service.lireEvenement('pr34');
    assert.strictEqual((await extra.repo.getParticipation('pr34', 'A')).statut, 'PRESENT');
    assert.strictEqual(last.prExerciseParticipation.coverage.covered, 1);
  });

  await record('20 — JSP reste inchangé', () => {
    assert.deepStrictEqual(logic.motifsSaisieForDomaine('JSP').map((m) => m.value), Object.values(MODEL_MOTIFS_JSP));
    assert.deepStrictEqual(Object.values(MODEL_MOTIFS_JSP), ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'NON_JUSTIFIE']);
    const jspStatuses = logic.participationStatusesForDomaine('JSP').map((row) => row[0]);
    assert.ok(!jspStatuses.includes('DISPENSE'));
    assert.ok(logicSrc.includes("d !== 'JSP'"));
    assert.ok(!serviceSrc.includes('pr_exercise_participation_deja_comptee'));
    assert.ok(!logic.sessionLocked({
      inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', alreadyCountedInSession: false
    }));
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
    console.error(`SCOPE-MULTISESSION-UX-CONTRACT-1-R1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-MULTISESSION-UX-CONTRACT-1-R1: ${results.length} PASS`);
})();

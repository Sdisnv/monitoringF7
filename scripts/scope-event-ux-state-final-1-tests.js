#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function event(id, section){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-state-final',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: '2026-09-01',
    libelle: `Exercice PR 1.${section}`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-state-final:PR:1',
    pr_session_key: `cycle-pr-state-final:PR:1.${section}`,
    population_figee: true
  };
}

async function setupPr(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-state-final',
    cycle_key: 'PAPR-STATE-FINAL',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR state final'
  });
  for(let i = 1; i <= 6; i += 1){
    await repo.insertEvenement(event(`pr${i}`, i));
    await repo.updateEventIfVersion(`pr${i}`, 1, { population_figee: true });
  }
  await repo.insertPersonne({ personne_id: 'b', nip: '1506', nom: 'Cerqueira', prenom: 'Marco', grade: 'Sdt', skipPeriodes: true });
  await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-state-final', personne_id: 'b', role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  for(let i = 1; i <= 6; i += 1){
    await repo.upsertAttendu({ evenement_id: `pr${i}`, personne_id: 'b', inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: `pr${i}`, personne_id: 'b', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
  }
  return { repo, service };
}

async function version(repo, id){
  return (await repo.getEvent(id)).version;
}

function attendu(detail, personneId){
  return detail.attendus.find((row) => row.personne_id === personneId);
}

async function addFormateur(ctx, eventId){
  await ctx.service.ajouterEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId: 'b',
    role: 'FORMATEUR'
  }, { sub: 'test' });
}

async function insertListEvent(repo, id, patch = {}){
  await repo.insertEvenement(Object.assign({
    evenement_id: id,
    domaine_code: 'DPS',
    statut: 'PLANIFIE',
    date: '2026-09-01',
    libelle: id,
    code_cours: id,
    population_figee: true
  }, patch));
}

(async () => {
  await record('A — tooltip Formateur PR continu compacté', () => {
    assert.strictEqual(
      logic.formatFormateurPrTooltip('Marco Cerqueira', '1506', ['1.4', '1.1', '1.3', '1.2']),
      'Marco Cerqueira (1506) participe comme Formateur PR aux sessions 1.1 à 1.4.'
    );
  });

  await record('B — tooltip Formateur PR discontinu', () => {
    assert.strictEqual(
      logic.formatFormateurPrTooltip('Marco Cerqueira', '1506', ['1.6', '1.1', '1.5', '1.2']),
      'Marco Cerqueira (1506) participe comme Formateur PR aux sessions 1.1, 1.2, 1.5 et 1.6.'
    );
    assert.strictEqual(
      logic.formatFormateurPrTooltip('Marco Cerqueira', '1506', ['1.3']),
      'Marco Cerqueira (1506) participe comme Formateur PR à la session 1.3.'
    );
    assert.strictEqual(
      logic.formatFormateurPrTooltip('Marco Cerqueira', '1506', ['1.4', '1.2']),
      'Marco Cerqueira (1506) participe comme Formateur PR aux sessions 1.2 et 1.4.'
    );
  });

  await record('C — API expose toutes les sessions Formateur PR', async () => {
    const ctx = await setupPr();
    for(const id of ['pr1', 'pr2', 'pr3', 'pr4']) await addFormateur(ctx, id);
    const detail = await ctx.service.lireEvenement('pr5');
    const row = attendu(detail, 'b');
    assert.strictEqual(row.alreadyCountedInSession, true);
    assert.strictEqual(row.sessionReferenceQuality, 'Formateur PR');
    assert.deepStrictEqual(row.sessionFormateurSessions, ['1.1', '1.2', '1.3', '1.4']);
  });

  await record('D — tooltip custom seul, sans title natif doublon', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('class="scope-session-counted-tooltip" role="tooltip"'));
    assert.ok(ui.includes('aria-describedby="${tooltipId}"'));
    assert.ok(!ui.includes('title="${escapeHtml(row.alreadyCountedTooltip)}"'));
  });

  await record('E — save nominatif relit le serveur sans snapshot stale', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const saveBlock = ui.slice(ui.indexOf('function saveParticipations'), ui.indexOf('function cloturer'));
    assert.ok(saveBlock.includes('client.enregistrerParticipations'));
    assert.ok(saveBlock.includes('await reloadFicheFromServer(id)'));
    assert.ok(!saveBlock.includes('await loadFiche(id)'));
  });

  await record('F — navigation fiche invalide immédiatement et ignore les réponses tardives', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('ficheRequestSeq'));
    assert.ok(ui.includes('activeFicheId'));
    assert.ok(ui.includes('token !== state.ficheRequestSeq'));
    assert.ok(ui.includes('state.fiche = null'));
    assert.ok(ui.includes('Chargement de l’événement'));
  });

  await record('G — liste événements états métier + filtres exposés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await insertListEvent(repo, 'future-empty', { date: '2026-09-01' });
    await insertListEvent(repo, 'future-started', { date: '2026-09-02' });
    await insertListEvent(repo, 'past-open', { date: '2026-08-01' });
    await insertListEvent(repo, 'past-realise', { date: '2026-08-01', statut: 'REALISE' });
    await repo.insertPersonne({ personne_id: 'p1', nip: '9001', nom: 'Test', prenom: 'Un', grade: 'Sdt', skipPeriodes: true });
    await repo.upsertAttendu({ evenement_id: 'future-started', personne_id: 'p1', inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: 'future-started', personne_id: 'p1', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    const listed = await service.listEvenements({ annee: 2026, today: '2026-08-26' });
    const byId = Object.fromEntries(listed.evenements.map((item) => [item.evenement.evenement_id, item.etatMetier.code]));
    assert.strictEqual(byId['future-empty'], 'PLANIFIE');
    assert.strictEqual(byId['future-started'], 'SAISIE_EN_COURS');
    assert.strictEqual(byId['past-open'], 'A_TRAITER');
    assert.strictEqual(byId['past-realise'], 'TRAITE');
    const filtered = await service.listEvenements({ annee: 2026, statut: 'A_TRAITER', today: '2026-08-26' });
    assert.deepStrictEqual(filtered.evenements.map((item) => item.evenement.evenement_id), ['past-open']);
  });

  await record('H — filtre UI et badge utilisent les états métier', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('<option value="SAISIE_EN_COURS">Saisie en cours</option>'));
    assert.ok(ui.includes('<option value="A_TRAITER">À traiter</option>'));
    assert.ok(ui.includes('<option value="TRAITE">Traité</option>'));
    assert.ok(ui.includes('function eventBusinessStateBadge'));
    assert.ok(css.includes('.scope-dot.SAISIE_EN_COURS'));
    assert.ok(css.includes('.scope-dot.A_TRAITER'));
    assert.ok(css.includes('.scope-dot.TRAITE'));
  });

  await record('I — retour direct liste depuis fiche et saisie', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('<div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)}</div>'));
    assert.ok(!ui.includes('<a href="#/exercices">Événements</a> / ${escapeHtml(ev.libelle)}'));
    assert.ok(ui.includes('<a class="scope-btn" href="#/exercices">Retour aux événements</a>'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE EVENT UX STATE FINAL-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE EVENT UX STATE FINAL-1 tests: ${results.length}/${results.length} PASS`);
})();

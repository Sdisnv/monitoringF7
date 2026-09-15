#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-POLICY-CONFIG-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const policy = require('../netlify/lib/_scope-participation-policy');
const { getEncadrementContribution, validateCloture } = require('../netlify/lib/_scope-rules');
const MultiSessionV2 = require('../netlify/lib/_scope-multisession-v2');
const importContract = require('../assets/js/scope-import-contract');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function mode(domain, label, extra = {}){
  return policy.resolveEventSessionPolicy(domain, Object.assign({ libelle: label }, extra));
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;policy_code;policy_version_code;multi_session_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

function participant(personneId, statut, extra = {}){
  return Object.assign({ evenement_id: extra.evenement_id || 'event-1', personne_id: personneId, statut, role: extra.role || 'PARTICIPANT' }, extra);
}

(async () => {
  await record('01-03 — nombres seuls FOBA/JSP/DPS restent individuels', () => {
    ['FOBA 1', 'FOBA 2', 'FOBA 3'].forEach((label) => eq(mode('FOBA', label).mode, 'INDIVIDUAL', label));
    ['JSP 2', 'JSP 4'].forEach((label) => eq(mode('JSP', label).mode, 'INDIVIDUAL', label));
    ['DPS 1', 'DPS 2'].forEach((label) => eq(mode('DPS', label).mode, 'INDIVIDUAL', label));
  });

  await record('04-10 — familles multi-session PR/AUTO/PR-ABC isolées', () => {
    const pr11 = mode('PR', 'PR 1.1');
    const pr12 = mode('PR', '1.2');
    const pr21 = mode('PR', 'PR 2.1');
    eq(pr11.mode, 'MULTI_SESSION');
    eq(pr11.seriesKey, 'PR:PR:1');
    eq(pr12.seriesKey, 'PR:PR:1');
    eq(pr12.sessionNumber, 2);
    eq(pr21.seriesKey, 'PR:PR:2');
    const car11 = mode('AUTO', 'CAR 1.1');
    const car13 = mode('AUTO', 'CAR 1.3');
    const car21 = mode('AUTO', 'CAR 2.1');
    const truck11 = mode('AUTO', 'TRUCK 1.1');
    eq(car11.seriesKey, 'AUTO:CAR:1');
    eq(car13.seriesKey, 'AUTO:CAR:1');
    eq(car21.seriesKey, 'AUTO:CAR:2');
    eq(truck11.seriesKey, 'AUTO:TRUCK:1');
    ok(truck11.seriesKey !== car11.seriesKey, 'TRUCK et CAR ne fusionnent pas');
    const abc = mode('PR', 'PR-ABC 3.2');
    eq(abc.seriesKey, 'PR:PR-ABC:3');
    eq(abc.family, 'PR-ABC');
  });

  await record('11-12 — PR-ABC historique sans X.Y et renommage avec clé persistée', () => {
    eq(mode('PR', 'Exercice PR-ABC | Refresh').mode, 'INDIVIDUAL');
    const persisted = mode('PR', 'Nom renommé sans numéro', {
      seriesKey: 'persisted:abc:1',
      sessionKey: 'persisted:abc:1.2',
      family: 'PR-ABC',
      exerciseNumber: 1,
      sessionNumber: 2
    });
    eq(persisted.mode, 'MULTI_SESSION');
    eq(persisted.source, 'persisted');
    eq(persisted.seriesKey, 'persisted:abc:1');
  });

  await record('13 — JSP propose Oubli après Activité extra-scolaire', () => {
    const jsp = policy.resolveParticipationPolicy('JSP');
    const motifs = policy.motifsForPolicy(jsp, 'EXCUSE');
    const labels = motifs.map((row) => row.label);
    const ids = motifs.map((row) => row.id);
    eq(ids[ids.indexOf('ACTIVITE_EXTRA_SCOLAIRE') + 1], 'OUBLI');
    deep(labels.slice(labels.indexOf('Activité extra-scolaire'), labels.indexOf('Activité extra-scolaire') + 2), ['Activité extra-scolaire', 'Oubli']);
  });

  await record('14-17 — sémantique encadrement baseline conservée', () => {
    const moniteur = getEncadrementContribution({ domaine: 'JSP', role: 'MONITEUR' });
    eq(moniteur.countsPopulationSuivie, false);
    eq(moniteur.countsTauxPresence, false);
    const auxiliaire = getEncadrementContribution({ domaine: 'JSP', role: 'AUXILIAIRE' });
    eq(auxiliaire.informatifSeulement, true);
    eq(auxiliaire.countsEffectifEngageEvenement, false);
    const formateur = getEncadrementContribution({ domaine: 'DAP', role: 'FORMATEUR' });
    eq(formateur.countsEffectifEngageEvenement, true);
    const source = read('netlify/lib/_scope-cycle-rules.js');
    ok(source.includes("role === 'SURVEILLANT'"), 'SURVEILLANT traité par le moteur de cycle validé');
    ok(source.includes("source === 'SAISIE'"), 'SURVEILLANT ne devient pas une contribution automatique libre');
  });

  await record('18-20 — événements planifiés, annulés et masqués ne contribuent pas', () => {
    const src = read('netlify/lib/_scope-cycle-rules.js');
    ok(src.includes("statut === 'REALISE'"), 'seul REALISE est comptabilisable');
    ok(src.includes('EVENEMENT_ANNULE_NON_EXIGIBLE'), 'ANNULÉ neutralisé');
    ok(src.includes('EVENEMENT_MASQUE_NON_EXIGIBLE'), 'HIDDEN neutralisé');
  });

  await record('21 — clôture séance intermédiaire multi-session sans exiger toute obligation', () => {
    const event = { evenement_id: 's1', statut: 'PLANIFIE', population_figee: true, origine: 'NOMINATIF', domaine_code: 'PR' };
    const attendus = [{ personne_id: 'p1', inclus: true }, { personne_id: 'p2', inclus: true }];
    const participations = [participant('p1', 'PRESENT', { evenement_id: 's1' })];
    assert.throws(() => validateCloture(event, attendus, participations), (error) =>
      error && error.details && (error.details.errors || []).some((row) => row.code === 'saisie_incomplete')
    );
    validateCloture(event, attendus, participations, { requireExpectedFilled: false });
    const state = MultiSessionV2.buildState({
      multisession: { multisession_id: 'ms1', code: 'PR-1', label: 'PR 1', status: 'OUVERTE' },
      currentEventId: 's1',
      sessions: [{ evenement_id: 's1', date: '2026-01-01', statut: 'PLANIFIE', session_index: 1 }],
      population: attendus,
      participations
    });
    eq(state.globalStatus, 'EN_COURS');
  });

  await record('22-24 — import: entier seul individuel, X.Y propose, libellé identique seul non probant', async () => {
    eq(mode('FOBA', 'FOBA 1').mode, 'INDIVIDUAL');
    const cibles = await createMemoryRepo().listCibles();
    const xy = importContract.previewScopeImport(nativeCsv([
      '2026-01-01;PR;;GEN;PR 1.1;NOMINATIF;;;;;;;;',
      '2026-01-08;PR;;GEN;PR 1.2;NOMINATIF;;;;;;;;'
    ]), { cibles });
    eq(xy.detectedExerciseProposals.length, 1);
    ok(String(xy.detectedExerciseProposals[0].seriesKey || '').endsWith(':PR:1'), 'clé de série PR exercice 1 exposée');
    const identical = importContract.previewScopeImport(nativeCsv([
      '2026-02-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;;;;;;;;',
      '2026-05-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;;;;;;;;'
    ]), { cibles });
    eq(identical.detectedExerciseProposals.length, 0);
  });

  await record('audit — moteur central et UI administration réutilisés', () => {
    ok(read('netlify/lib/_scope-participation-policy.js').includes('resolveEventSessionPolicy'), 'policy centrale');
    ok(read('netlify/lib/_scope-generic-event-catalog.js').includes('resolveEngineRoute'), 'routage moteur existant');
    ok(read('netlify/lib/_scope-service.js').includes('function formationCatalog'), 'catalogue administration existant');
    ok(read('assets/js/scope-ui.js').includes('function renderFormationCatalog()'), 'UI administration existante');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-EVENT-POLICY-CONFIG-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-EVENT-POLICY-CONFIG-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

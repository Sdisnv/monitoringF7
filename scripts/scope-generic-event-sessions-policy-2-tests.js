#!/usr/bin/env node
'use strict';

/** SCOPE — GENERIC-EVENT-SESSIONS-POLICY-2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const participationPolicy = require('../netlify/lib/_scope-participation-policy');
const {
  SERIES_TYPE,
  describeEventSeries,
  parseSeriesNotation
} = require('../netlify/lib/_scope-event-series');
const importContract = require('../assets/js/scope-import-contract');

const ROOT = path.join(__dirname, '..');
const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'CUSTOM' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function cible(repo, domain, preferred){
  const found = preferred ? await repo.findCible(domain, preferred) : null;
  if(found) return found;
  return (await repo.listCibles()).find((row) => String(row.domaine_code || row.domaineCode) === domain);
}

async function person(repo, id, nip, cibleId){
  const row = await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  });
  await repo.insertAffectation({ personne_id: row.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return row;
}

async function explicitMultiSession(repo, { domain, cibleCode, personId, nip, label, sessions = 3 }){
  const target = await cible(repo, domain, cibleCode);
  const p = await person(repo, personId, nip, target.cible_id);
  const exercice = await repo.upsertExercise({
    exercice_key: `test:${domain}:${label}`,
    domaine_code: domain,
    code: `${domain}-${label}`,
    libelle: label,
    annee: 2026,
    mode_session: 'MULTI',
    nombre_sessions_attendu: sessions,
    consolidation_active: true,
    source: 'TEST'
  });
  for(let i = 1; i <= sessions; i += 1){
    const event = await repo.insertEvenement({
      evenement_id: `${domain.toLowerCase()}-${personId}-${i}`,
      date: `2026-03-${String(i).padStart(2, '0')}`,
      domaine_code: domain,
      libelle: `${label} ${i}.${i}`,
      code_cours: `${domain}.${personId}.${i}`,
      statut: 'REALISE',
      mode_suivi: 'NOMINATIF',
      cible_ids: [target.cible_id],
      exercice_id: exercice.exercice_id,
      session_index: i,
      session_label: `${i}/${sessions}`
    });
    await repo.setEventCibles(event.evenement_id, [target.cible_id]);
    await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: event.evenement_id, personne_id: p.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  }
  const fiche = await createScopePersonService(repo).fiche(p.personne_id, PERIOD);
  return { repo, person: p, exercice, fiche };
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;policy_code;policy_version_code;multi_session_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

(async () => {
  await record('01 — policy générique autorise individuel et plusieurs séances hors branches domaine', () => {
    for(const domain of ['FOBA', 'DPS', 'JSP', 'FOCA', 'FOSPEC']){
      const p = participationPolicy.resolveParticipationPolicy(domain);
      eq(p.eventCapabilities.supportsIndividual, true, domain);
      eq(p.eventCapabilities.supportsMultiSession, true, domain);
    }
    const src = read('netlify/lib/_scope-cycle-rules.js');
    ok(!src.includes('domain === "FOBA"') && !src.includes("domain === 'FOBA'"), 'pas de branche FOBA');
    ok(!src.includes('domain === "DPS"') && !src.includes("domain === 'DPS'"), 'pas de branche DPS');
    ok(!src.includes('domain === "JSP"') && !src.includes("domain === 'JSP'"), 'pas de branche JSP');
  });

  await record('02 — FOBA 1/2/3 individuel = 3 obligations', () => {
    for(const label of ['FOBA 1', 'FOBA 2', 'FOBA 3']){
      eq(describeEventSeries({ domaine_code: 'FOBA', libelle: label }).seriesType, SERIES_TYPE.INDIVIDUAL, label);
    }
  });

  await record('03 — FOBA explicite plusieurs séances = 1 obligation, 3 traces', async () => {
    const out = await explicitMultiSession(createMemoryRepo(), { domain: 'FOBA', cibleCode: '1', personId: 'foba-ms', nip: '7647', label: 'FOBA plusieurs séances' });
    eq(out.fiche.evenements.length, 3);
    eq(out.fiche.kpi.eventCount, 1);
    eq(new Set(out.fiche.evenements.map((row) => row.prExerciseGroupKey || row.pr_exercise_group_key).filter(Boolean)).size, 1);
  });

  await record('04 — DPS et JSP explicites plusieurs séances utilisent le même moteur générique', async () => {
    const dps = await explicitMultiSession(createMemoryRepo(), { domain: 'DPS', cibleCode: 'B1', personId: 'dps-ms', nip: '23989', label: 'DPS plusieurs séances' });
    const jsp = await explicitMultiSession(createMemoryRepo(), { domain: 'JSP', cibleCode: 'GEN', personId: 'jsp-ms', nip: '28036', label: 'JSP plusieurs séances' });
    eq(dps.fiche.evenements.length, 3);
    eq(dps.fiche.kpi.eventCount, 1);
    eq(jsp.fiche.evenements.length, 3);
    eq(jsp.fiche.kpi.eventCount, 1);
  });

  await record('05 — X.Y détecte mais refus explicite reste individuel', async () => {
    eq(parseSeriesNotation('FOBA 1.1', { domain: 'FOBA' }).seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1.1', eventMode: 'INDIVIDUAL' }).seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1.2', multiSessionRefused: true }).seriesType, SERIES_TYPE.INDIVIDUAL);
    const cibles = await createMemoryRepo().listCibles();
    const preview = importContract.previewScopeImport(nativeCsv([
      '2026-01-01;FOBA;;1;FOBA 1.1;NOMINATIF;;;;;;;;',
      '2026-01-08;FOBA;;1;FOBA 1.2;NOMINATIF;;;;;;;;',
      '2026-01-15;FOBA;;1;FOBA 1.3;NOMINATIF;;;;;;;;'
    ]), { cibles });
    eq(preview.detectedExerciseProposals.length, 1);
    eq(preview.detectedExerciseProposals[0].persisted, false);
  });

  await record('06 — libellé identique seul ne fusionne pas', async () => {
    const cibles = await createMemoryRepo().listCibles();
    const preview = importContract.previewScopeImport(nativeCsv([
      '2026-02-01;DPS;;B1;Exercice identique;NOMINATIF;;;;;;;;',
      '2026-02-08;DPS;;B1;Exercice identique;NOMINATIF;;;;;;;;'
    ]), { cibles });
    eq(preview.detectedExerciseProposals.length, 0);
  });

  await record('07 — PR/PR-ABC/AUTO restent distincts', () => {
    const pr2 = describeEventSeries({ domaine_code: 'PR', libelle: 'PR 2.1' });
    const pr3 = describeEventSeries({ domaine_code: 'PR', libelle: 'PR 3.1' });
    const abc = describeEventSeries({ domaine_code: 'PR', libelle: 'PR-ABC 2.1' });
    const car = describeEventSeries({ domaine_code: 'AUTO', libelle: 'CAR 1.1' });
    const truck = describeEventSeries({ domaine_code: 'AUTO', libelle: 'TRUCK 1.1' });
    ok(pr2.seriesKey !== pr3.seriesKey, 'PR 2.x distinct de PR 3.x');
    ok(pr2.seriesKey !== abc.seriesKey, 'PR-ABC distinct PR général');
    ok(car.seriesKey !== truck.seriesKey, 'CAR distinct TRUCK');
  });

  await record('08 — JSP Oubli, admin capabilities et persistance policy exposés', () => {
    const jsp = participationPolicy.resolveParticipationPolicy('JSP');
    const ids = participationPolicy.motifsForPolicy(jsp, 'EXCUSE').map((row) => row.id);
    eq(ids[ids.indexOf('ACTIVITE_EXTRA_SCOLAIRE') + 1], 'OUBLI');
    const ui = read('assets/js/scope-ui.js');
    const service = read('netlify/lib/_scope-service.js');
    ok(ui.includes('Événements individuels autorisés'));
    ok(ui.includes('Exercices en plusieurs séances autorisés'));
    ok(ui.includes('Rôles d’encadrement'));
    ok(service.includes('eventCapabilities: Object.assign'));
  });

  await record('09 — persistance série prioritaire et alias historique compatible', () => {
    const event = {
      domaine_code: 'FOBA',
      libelle: 'Nom renommé',
      pr_exercise_group_key: 'EXERCICE:stable',
      pr_session_key: 'EXERCICE:stable.2',
      session_index: 2
    };
    const series = describeEventSeries(event);
    eq(series.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(series.seriesKey, 'EXERCICE:stable');
    eq(series.persisted, true);
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-GENERIC-EVENT-SESSIONS-POLICY-2 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-GENERIC-EVENT-SESSIONS-POLICY-2 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

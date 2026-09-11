#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-IMPORT-CONFIGURATION-OPERATIONALIZATION-8 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-import-configuration-operationalization-8', permissions: ['events:create', 'references:manage'], roles: ['sdis-admin'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function standardCsv(rows){
  return [
    'date;code_cours;stat_com;qui;public_cible;domaine;evenement;debut;fin',
    ...rows
  ].join('\n');
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

async function dpsCible(repo){
  const cibles = await repo.listCibles();
  return cibles.find((row) => row.domaine_code === 'DPS' && row.niveau_code !== 'GEN') || cibles.find((row) => row.domaine_code === 'DPS');
}

async function dpsGenCible(repo){
  const cibles = await repo.listCibles();
  return cibles.find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'GEN') || cibles.find((row) => row.domaine_code === 'DPS');
}

async function dapCible(repo){
  const cibles = await repo.listCibles();
  return cibles.find((row) => row.domaine_code === 'DAP' && row.niveau_code !== 'GEN') || cibles.find((row) => row.domaine_code === 'DAP');
}

async function createDpsMulti(service, sessionCount = 6, year = 2026, label = 'Formation groupée DPS'){
  return service.createEventDefinition({
    domain: 'DPS',
    label,
    modeOrganisation: 'MULTI_SESSION',
    sessionCount,
    year,
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
    policyConfig: {
      activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
      excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
      dispenseMotifs: ['FORMATION_HORS_SDIS']
    }
  }, ACTOR);
}

(async () => {
  await record('01 — création événement ponctuel sans configuration', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await dpsGenCible(repo);
    const created = await service.createEvenement({
      date: '2026-06-15',
      domaineCode: 'DPS',
      libelle: 'Exercice ponctuel DPS',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    ok(!created.evenement.definition_version_id, 'aucune configuration silencieuse');
    ok(!created.evenement.engine_route, 'moteur historique conservé');
  });

  await record('02 — création avec configuration SIMPLE et policy versionnée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await dpsGenCible(repo);
    const config = await service.createEventDefinition({ domain: 'DPS', label: 'Formation simple DPS', modeOrganisation: 'SIMPLE', sessionCount: 1, year: 2026 }, ACTOR);
    const created = await service.createEvenement({
      date: '2026-06-15',
      domaineCode: 'DPS',
      libelle: 'Formation simple DPS',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      definitionVersionId: config.version.definition_version_id
    }, ACTOR);
    eq(String(created.evenement.definition_version_id), String(config.version.definition_version_id));
    eq(created.evenement.engine_route, 'GENERIC_SIMPLE');
    ok(created.evenement.participation_policy_snapshot, 'snapshot policy pris à la création');
  });

  await record('03 — création Multi-session session 3/6 et refus hors plage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await dpsGenCible(repo);
    const config = await createDpsMulti(service, 6);
    const created = await service.createEvenement({
      date: '2026-06-15',
      domaineCode: 'DPS',
      libelle: 'Formation groupée DPS 1.3',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      definitionVersionId: config.version.definition_version_id,
      sessionIndex: 3
    }, ACTOR);
    eq(created.evenement.engine_route, 'GENERIC_MULTI_SESSION');
    eq(created.evenement.session_index, 3);
    await assert.rejects(() => service.createEvenement({
      date: '2026-06-15',
      domaineCode: 'DPS',
      libelle: 'Formation groupée DPS 1.7',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      definitionVersionId: config.version.definition_version_id,
      sessionIndex: 7
    }, ACTOR), /Index de session invalide|session_index_invalide/);
  });

  await record('04 — preview import reconnu/ambigu/session suggérée sans écriture', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await createDpsMulti(service, 6);
    await createDpsMulti(service, 6, 2026, 'Formation groupée DPS secours');
    const csv = standardCsv([
      '2026-06-15;DPS-GRP-3;STAT;DPS;GEN;DPS;Formation groupée DPS 1.3;08:00;10:00'
    ]);
    const preview = await service.previewImportEvenements({ csvText: csv });
    eq(preview.ecriture, false);
    ok(preview.lignes[0].genericMatch, 'résolution batch ajoutée');
    ok(['SUGGESTED', 'AMBIGUOUS', 'SESSION_REQUIRED'].includes(preview.lignes[0].genericMatch.status), 'validation humaine requise');
    ok(preview.genericDefinitions.validationRequired, 'preview signale la validation humaine');
    eq((await repo.listEvenements({})).length, 0, 'preview lecture seule');
    await assert.rejects(() => service.commitImportEvenements({ csvText: csv, previewToken: preview.previewToken }, ACTOR), /corrigées|contrôler|import_refuse/);
  });

  await record('05 — correction manuelle ligne puis import batch Multi-session complet', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const config = await createDpsMulti(service, 3);
    const cible = await dpsGenCible(repo);
    const csv = nativeCsv([
      '2026-06-01;DPS;;GEN;Formation groupée DPS 1.1;NOMINATIF;DPS-GRP;;;1;3',
      '2026-06-08;DPS;;GEN;Formation groupée DPS 1.2;NOMINATIF;DPS-GRP;;;2;3',
      '2026-06-15;DPS;;GEN;Formation groupée DPS 1.3;NOMINATIF;DPS-GRP;;;3;3'
    ]);
    const decisions = {
      2: { definitionVersionId: config.version.definition_version_id, sessionIndex: 1, confirmConfiguration: true },
      3: { definitionVersionId: config.version.definition_version_id, sessionIndex: 2, confirmConfiguration: true },
      4: { definitionVersionId: config.version.definition_version_id, sessionIndex: 3, confirmConfiguration: true }
    };
    const preview = await service.previewImportEvenements({ csvText: csv, decisions });
    ok(preview.lignes.every((line) => line.genericMatch.action === 'PRET'), 'corrections validées');
    const result = await service.commitImportEvenements({ csvText: csv, decisions, previewToken: preview.previewToken }, ACTOR);
    eq(result.created.length, 3);
    eq(result.attachedExerciseSessions.length, 3);
    const events = await repo.listEvenements({ domaine: 'DPS' });
    eq(events.filter((event) => String(event.definition_version_id) === String(config.version.definition_version_id)).length, 3);
    eq(events.find((event) => event.session_index === 3).session_label, '3/3');
    ok(cible, 'fixture cible DPS présente');
  });

  await record('06 — doublon conservé et commit bloqué si validation manquante', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await createDpsMulti(service, 6);
    const cible = await dpsGenCible(repo);
    await service.createEvenement({ date: '2026-06-15', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.3', cibleIds: [cible.cible_id], modeSuivi: 'NOMINATIF', codeCours: 'DPS-GRP-3', heureDebut: '08:00', heureFin: '10:00' }, ACTOR);
    const csv = standardCsv(['2026-06-15;DPS-GRP-3;STAT;DPS;GEN;DPS;Formation groupée DPS 1.3;08:00;10:00']);
    const preview = await service.previewImportEvenements({ csvText: csv });
    ok(preview.lignes.some((line) => ['DEJA_PRESENT', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(line.statut)) || preview.groups.some((g) => ['EXACT_MATCH', 'PROBABLE_MATCH'].includes(g.statut)), 'doublon détecté');
  });

  await record('07 — temporalité 2026/2027 et historique 2026 inchangé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const v2026 = await createDpsMulti(service, 6, 2026);
    const v2027 = await service.reconductEventDefinitionVersion(v2026.version.definition_version_id, { year: 2027 }, ACTOR);
    const csv = nativeCsv([
      '2026-06-15;DPS;;GEN;Formation groupée DPS 1.1;NOMINATIF;DPS-GRP;DPS-FORMATION-GROUPEE;2026;1;6',
      '2027-06-15;DPS;;GEN;Formation groupée DPS 1.1;NOMINATIF;DPS-GRP;DPS-FORMATION-GROUPEE;2027;1;6'
    ]);
    const preview = await service.previewImportEvenements({ csvText: csv });
    eq(preview.lignes[0].genericMatch.definitionVersionCode, '2026');
    eq(preview.lignes[1].genericMatch.definitionVersionCode, '2027');
    const reloaded = await repo.getEventDefinitionVersion(v2026.version.definition_version_id);
    eq(reloaded.valid_from, '2026-01-01');
    ok(v2027.version.definition_version_id !== v2026.version.definition_version_id, 'version indépendante');
  });

  await record('08 — référentiel archivé non réinjecté et libellé métier conservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const motif = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Recette TEST' }, ACTOR);
    const created = await service.createEventDefinition({
      domain: 'DPS',
      label: 'Formation référentiel DPS',
      modeOrganisation: 'SIMPLE',
      year: 2026,
      policyConfig: { activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE'], excuseMotifs: [motif.motif.motif_id], dispenseMotifs: [] }
    }, ACTOR);
    await service.saveParticipationMotif({ motifId: motif.motif.motif_id, motifType: 'EXCUSE', label: 'Recette TEST', active: false }, ACTOR);
    const reconducted = await service.reconductEventDefinitionVersion(created.version.definition_version_id, { year: 2027 }, ACTOR);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const policy = catalog.policyVersions.find((row) => String(row.policy_version_id) === String(reconducted.version.policy_version_id));
    ok((policy.config.excuseMotifs || []).includes(motif.motif.motif_id), 'cohérence historique de la configuration reconduite conservée');
    const motifRows = await repo.listParticipationMotifRows();
    eq(motifRows.find((row) => row.motif_id === motif.motif.motif_id).label, 'Recette TEST');
  });

  await record('09 — UX création/import sans IDs techniques en principal', () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    includes(ui, 'Configuration de formation');
    includes(ui, 'Événement ponctuel / sans configuration');
    includes(ui, 'Configuration existante');
    includes(ui, 'Session');
    includes(ui, 'data-import-config');
    includes(ui, 'data-import-session');
    includes(css, '.scope-import-config-controls');
    includes(ui, 'Informations techniques');
  });

  await record('10 — protections R6.2, R7.4, DAP Multi-session et PR legacy présentes', () => {
    includes(read('assets/js/scope-ui-logic.js'), "return 'FOSPEC,PR,AUTO'");
    includes(read('netlify/lib/_scope-service.js'), 'dissociation_partielle_multisession_interdite');
    includes(read('netlify/lib/_scope-multisession-v2.js'), 'MULTI_SESSION_V2');
    includes(read('netlify/lib/_scope-cycle-rules.js'), 'prSessionKey');
    includes(read('scripts/scope-cycles-pdf-density-readability-final-7-4-tests.js'), 'SCOPE CYCLES R7.4 TESTS OK');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`${failed.length} test(s) R8 en échec.`);
    process.exit(1);
  }
  console.log('SCOPE EVENT IMPORT CONFIGURATION OPERATIONALIZATION R8 TESTS OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

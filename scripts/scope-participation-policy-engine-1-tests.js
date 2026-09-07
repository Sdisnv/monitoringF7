#!/usr/bin/env node
'use strict';

/** SCOPE-PARTICIPATION-POLICY-ENGINE-1 - moteur de politiques sans regression V1. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const {
  POLICY_VERSION,
  MOTIF_LIBRARY,
  STATUS_LIBRARY,
  resolveParticipationPolicy
} = require('../netlify/lib/_scope-participation-policy');
const {
  validateParticipationPatch,
  getEncadrementContribution,
  computeTaux
} = require('../netlify/lib/_scope-rules');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const htmlSource = read('scope.html');
const scopeFunctionSource = read('netlify/functions/scope.js');
const serviceSource = read('netlify/lib/_scope-service.js');
const schemaSource = read('netlify/lib/_scope-schema.js');
const uiSource = read('assets/js/scope-ui.js');
const logicSource = read('assets/js/scope-ui-logic.js');
const apiSource = read('assets/js/scope-api.js');
const results = [];
const ACTOR = { roles: ['sdis-admin'], sub: 'scope-participation-policy-engine-1', displayName: 'Testeur SCOPE' };

function sameJson(actual, expected){
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
}

function loadLogic(){
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(logicSource, sandbox, { filename: 'scope-ui-logic.js' });
  return sandbox.module.exports;
}

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function createNominativeEvent(domaineCode, niveauCode){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible(domaineCode, niveauCode);
  const personne = await repo.insertPersonne({
    nip: `PPE${domaineCode}${niveauCode}`,
    nom: 'Policy',
    prenom: 'Engine',
    grade: domaineCode === 'JSP' ? 'JSP' : 'Sdt'
  });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
  const created = await service.createEvenement({
    date: '2026-09-07',
    domaineCode,
    libelle: `Politique ${domaineCode}`,
    cibleIds: [cible.cible_id]
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
  return { repo, service, eventId: created.evenement.evenement_id, personne };
}

(async () => {
  const logic = loadLogic();

  await record('01 contrat central par domaine reproduit les listes V1', () => {
    const jsp = resolveParticipationPolicy('JSP');
    sameJson(jsp.activeStatuses, ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
    sameJson(jsp.excuseMotifs, ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'ACCIDENT_MALADIE', 'NON_JUSTIFIE']);
    sameJson(jsp.dispenseMotifs, []);
    const dap = resolveParticipationPolicy('DAP');
    assert.ok(dap.activeStatuses.includes('PERMUTATION'));
    const dps = resolveParticipationPolicy('DPS');
    assert.ok(dps.activeStatuses.includes('DISPENSE'));
    sameJson(dps.excuseMotifs, ['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE']);
    assert.strictEqual(MOTIF_LIBRARY.ACCIDENT_MALADIE.label, 'Accident/maladie');
    assert.strictEqual(STATUS_LIBRARY.ABSENT_EXCUSE.label, 'Excusé');
  });

  await record('02 comportements structurants PR AUTO JSP FOBA explicites', () => {
    const pr = resolveParticipationPolicy('PR');
    const auto = resolveParticipationPolicy('AUTO');
    assert.strictEqual(pr.behavior.propagationScope, 'ALL_EXERCISE_SESSIONS');
    assert.strictEqual(pr.behavior.deduplicationScope, 'EXERCISE');
    assert.strictEqual(auto.behavior.propagationScope, 'ALL_EXERCISE_SESSIONS');
    assert.strictEqual(auto.behavior.deduplicationScope, 'EXERCISE');
    assert.deepStrictEqual(resolveParticipationPolicy('JSP').behavior.supervisionRoles, ['MONITEUR']);
    assert.ok(resolveParticipationPolicy('FOBA').dispenseMotifs.includes('PAS_CONCERNE'));
  });

  await record('03 validation conserve les regles historiques et borne les statuts par politique', () => {
    assert.strictEqual(validateParticipationPatch({ statut: 'PERMUTATION' }, { domaineCode: 'DAP' }).statut, 'PERMUTATION');
    assert.throws(() => validateParticipationPatch({ statut: 'PERMUTATION' }, { domaineCode: 'DPS' }), /domaine DAP/);
    assert.throws(() => validateParticipationPatch({ statut: 'DISPENSE' }, { domaineCode: 'JSP' }), /pas autorisé/);
    assert.strictEqual(validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motifAbsence: 'NON_JUSTIFIE' }, { domaineCode: 'JSP' }).motif_absence, 'NON_JUSTIFIE');
    assert.strictEqual(validateParticipationPatch({ statut: 'DISPENSE', motifAbsence: 'PAS_CONCERNE' }, { domaineCode: 'FOBA' }).motif_absence, 'PAS_CONCERNE');
  });

  await record('04 snapshot evenement fige la politique malgre une modification ulterieure', async () => {
    const ctx = await createNominativeEvent('JSP', 'B1');
    await ctx.repo.upsertParticipationPolicy({
      domain_code: 'JSP',
      policy_version: POLICY_VERSION,
      config: {
        domainCode: 'JSP',
        policyVersion: POLICY_VERSION,
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE'],
        excuseMotifs: ['PRIVE'],
        dispenseMotifs: [],
        roles: ['PARTICIPANT'],
        behavior: { supervisionRoles: ['MONITEUR'], propagationScope: 'SESSION_ONLY', deduplicationScope: 'SESSION' }
      },
      actif: true
    });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(fiche.evenement.participation_policy_snapshot);
    sameJson(fiche.participationPolicy.excuseMotifs, ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'ACCIDENT_MALADIE', 'NON_JUSTIFIE']);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: fiche.evenement.version,
      participations: [{ personneId: ctx.personne.personne_id, statut: 'ABSENT_EXCUSE', motifAbsence: 'NON_JUSTIFIE' }]
    }, ACTOR);
    const reloaded = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(reloaded.participations[0].motif_absence, 'NON_JUSTIFIE');
  });

  await record('05 referentiels et API admin exposent policies/motifs sous references:manage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    assert.ok(refs.participation);
    assert.ok(refs.participation.policies.find((row) => row.domainCode === 'JSP'));
    assert.ok(refs.participation.motifs.find((row) => row.id === 'NON_JUSTIFIE'));
    assert.ok(/path === '\/participation\/policies'/.test(scopeFunctionSource));
    assert.ok(/hasPermission\(claims, 'references:manage'\)[\s\S]*?saveParticipationPolicy/.test(scopeFunctionSource));
    assert.ok(/participationPolicies\(\) \{ return request\('GET', '\/participation\/policies'\)/.test(apiSource));
  });

  await record('06 frontend consomme une politique explicite sans perdre le fallback V1', () => {
    const policy = {
      domainCode: 'JSP',
      activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE'],
      excuseMotifs: ['PRIVE', 'NON_JUSTIFIE'],
      motifs: [
        { id: 'PRIVE', label: 'Privé', type: 'EXCUSE', group: 'operationnel' },
        { id: 'NON_JUSTIFIE', label: 'Non-justifié', type: 'EXCUSE', group: 'administratif' }
      ],
      statuses: Object.values(STATUS_LIBRARY)
    };
    sameJson(logic.participationStatusesForDomaine('JSP', policy).map((row) => row[0]), ['PRESENT', 'ABSENT_EXCUSE']);
    sameJson(logic.motifsSaisieForDomaine('JSP', policy).map((row) => row.value), ['PRIVE', 'NON_JUSTIFIE']);
    sameJson(logic.participationStatusesForDomaine('DAP').map((row) => row[0]), ['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION']);
  });

  await record('07 administration Participation, schema et cache-bust sont presents', () => {
    assert.ok(/scope_participation_motifs/.test(schemaSource));
    assert.ok(/scope_participation_policies/.test(schemaSource));
    assert.ok(/participation_policy_snapshot/.test(schemaSource));
    assert.ok(/#\/reglages\/participation/.test(logicSource + uiSource));
    assert.ok(/function renderParticipationAdmin/.test(uiSource));
    assert.ok(htmlSource.includes('scope.css?v=scope-participation-policy-engine-1'));
    assert.ok(htmlSource.includes('scope-ui-logic.js?v=scope-participation-policy-engine-1'));
    assert.ok(htmlSource.includes('scope-api.js?v=scope-participation-policy-engine-1'));
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-participation-policy-engine-1'));
  });

  await record('08 invariants taux, encadrement et double comptage restent inchanges', () => {
    const taux = computeTaux([
      { personne_id: '1', statut: 'PRESENT' },
      { personne_id: '2', statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { personne_id: '3', statut: 'ABSENT_NON_EXCUSE' },
      { personne_id: '4', statut: 'DISPENSE' },
      { personne_id: '5', statut: 'PERMUTATION' }
    ], ['1', '2', '3', '4', '5'].map((id) => ({ personne_id: id, inclus: true })));
    assert.strictEqual(taux.numerator, 2);
    assert.strictEqual(taux.denominator, 4);
    assert.strictEqual(taux.dispenses, 1);
    assert.strictEqual(taux.permutations, 1);
    assert.strictEqual(getEncadrementContribution({ domaine: 'JSP', role: 'MONITEUR' }).countsTauxPresence, false);
    assert.strictEqual(getEncadrementContribution({ domaine: 'DAP', role: 'FORMATEUR' }).countsEffectifEngageEvenement, true);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-PARTICIPATION-POLICY-ENGINE-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PARTICIPATION-POLICY-ENGINE-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

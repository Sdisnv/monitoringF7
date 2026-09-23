'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { evaluatePublicRule, compareLegacyAndCanonical } = require('../netlify/lib/_scope-public-engine');
const { PUBLIC_DEFINITIONS } = require('../netlify/lib/_scope-public-foundations');
const { adaptLegacyPersonnelFacts } = require('../netlify/lib/_scope-public-legacy-adapter');

const TARGET_BY_PUBLIC = Object.freeze({
  'DPS-G1': ['DPS', 'G1'], 'DAP-Y1': ['DAP', 'Y1'],
  'FOBA-1': ['FOBA', '1'], 'FOBA-2': ['FOBA', '2'], 'FOBA-3': ['FOBA', '3'],
  'AUTO-COND-VL': ['AUTO', 'VL'], 'AUTO-COND-PL': ['AUTO', 'PL']
});

function definition(code){
  const row = PUBLIC_DEFINITIONS.find((item) => item.code === code);
  assert.ok(row, `definition ${code} missing`);
  return row;
}

async function evaluateRealParity({ name, publicCode, evaluationDate = '2027-06-15', people }){
  const target = TARGET_BY_PUBLIC[publicCode];
  assert.ok(target, `no legacy target for ${publicCode}`);
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const targetRow = await repo.findCible(target[0], target[1]);
  assert.ok(targetRow, `legacy target ${target.join('/')} missing`);
  const persons = [];
  const periods = [];
  const rawAssignments = [];
  for(const spec of people){
    const person = {
      personne_id: spec.personneId, nip: spec.nip || spec.personneId,
      nom: 'PARITY', prenom: spec.personneId, actif: spec.actif !== false,
      date_entree: spec.dateEntree || null, date_sortie: spec.dateSortie || null,
      skipPeriodes: true
    };
    await repo.insertPersonne(person);
    persons.push(person);
    for(const period of spec.periods || []){
      const row = { ...period, personne_id: spec.personneId };
      await repo.insertPeriode(row);
      periods.push(row);
    }
    for(const [index, assignment] of (spec.assignments || []).entries()){
      const domainCode = assignment.domainCode || target[0];
      const targetCode = assignment.targetCode || target[1];
      const cible = await repo.findCible(domainCode, targetCode);
      assert.ok(cible, `fixture target ${domainCode}/${targetCode} missing`);
      const row = {
        affectation_id: `${spec.personneId}-A${index + 1}`, personne_id: spec.personneId,
        cible_id: cible.cible_id, domaine_code: domainCode, niveau_code: targetCode,
        date_debut: assignment.validFrom, date_fin: assignment.validTo || null
      };
      await repo.insertAffectation(row);
      rawAssignments.push(row);
    }
  }
  const legacyPopulation = await service.resolveEligiblePopulation({
    eventDate: evaluationDate, domaineCode: target[0], cibleIds: [targetRow.cible_id], suiviNominatif: [], store: repo
  });
  const legacyResult = {
    complete: true, resolutionStatus: 'COMPLETE',
    personIds: legacyPopulation.personnes.map((row) => String(row.personneId)).sort()
  };
  const adapted = adaptLegacyPersonnelFacts({ persons, periods, assignments: rawAssignments });
  assert.strictEqual(adapted.resolutionStatus, 'COMPLETE', `${name}: adapter resolution`);
  const canonicalResult = evaluatePublicRule({
    ruleVersion: definition(publicCode).version, evaluationDate,
    persons, periods, assignments: adapted.assignments, competencies: adapted.competencies,
    fobaLevels: adapted.fobaLevels, jspRoles: adapted.jspRoles
  });
  const comparison = compareLegacyAndCanonical(legacyResult, canonicalResult);
  assert.deepStrictEqual(canonicalResult.personIds, legacyResult.personIds, `${name}: G0-D/C2-B divergence`);
  assert.strictEqual(comparison.differences.length, 0, `${name}: mirror differences`);
  return { name, classification: 'REAL_PARITY', personIds: canonicalResult.personIds };
}

(async () => {
  const active = (personneId, overrides = {}) => ({
    personneId,
    assignments: [{ validFrom: '2027-01-01', ...(overrides.assignment || {}) }],
    periods: overrides.periods || []
  });
  const scenarios = [
    ['DPS G1', 'DPS-G1', [active('DPS')]],
    ['DAP Y1', 'DAP-Y1', [active('DAP')]],
    ['FOBA 1', 'FOBA-1', [active('F1')]],
    ['FOBA 2', 'FOBA-2', [active('F2')]],
    ['FOBA 3', 'FOBA-3', [active('F3')]],
    ['AUTO cond VL', 'AUTO-COND-VL', [active('VL')]],
    ['AUTO cond PL', 'AUTO-COND-PL', [active('PL')]],
    ['affectation future', 'DPS-G1', [active('FUTURE', { assignment: { validFrom: '2027-06-16' } })]],
    ['affectation expiree', 'DPS-G1', [active('EXPIRED', { assignment: { validFrom: '2027-01-01', validTo: '2027-06-14' } })]],
    ['affectation sans debut', 'DPS-G1', [active('NO_START', { assignment: { validFrom: null } })]],
    ['affectation debut invalide', 'DPS-G1', [active('BAD_START', { assignment: { validFrom: 'not-a-date' } })]],
    ['demission', 'DPS-G1', [active('DEM', { periods: [{ type: 'DEMISSIONNAIRE', date_debut: '2027-01-01' }] })]],
    ['reactivation', 'DPS-G1', [active('REACT', { periods: [
      { type: 'DEMISSIONNAIRE', date_debut: '2027-01-01', date_fin: '2027-05-31' },
      { type: 'ACTIF', date_debut: '2027-06-01' }
    ] })]],
    ['priorite ACTIF legacy', 'DPS-G1', [active('OVERLAP', { periods: [
      { type: 'ACTIF', date_debut: '2027-01-01' },
      { type: 'DEMISSIONNAIRE', date_debut: '2027-01-01' }
    ] })]]
  ];
  const report = [];
  for(const [name, publicCode, people] of scenarios){
    report.push(await evaluateRealParity({ name, publicCode, people }));
  }
  assert.strictEqual(report.every((row) => row.classification === 'REAL_PARITY'), true);
  console.log(`scope-public-engine-c2-b-real-parity-tests: ok (${report.length} REAL_PARITY)`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });

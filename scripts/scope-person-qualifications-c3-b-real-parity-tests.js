'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const engine = require('../netlify/lib/_scope-public-engine');
const c3 = require('../netlify/lib/_scope-person-qualifications');

function definition(code){
  const row = c3.PUBLIC_DEFINITIONS_C3.find((item) => item.code === code);
  assert.ok(row, `definition ${code} missing`);
  return row;
}

async function runScenario({ code, target, people, canonicalFacts, jspRoles = [], expectedLegacyOnly = [] }){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const targetRow = await repo.findCible(target[0], target[1]);
  assert.ok(targetRow, `target ${target.join('/')} missing`);
  for(const person of people){
    await repo.insertPersonne({ personne_id: person.personneId,nip: person.personneId,nom: 'C3',prenom: person.personneId,actif: true,skipPeriodes: true,grade: person.grade });
    for(const [index, assignment] of (person.assignments || []).entries()){
      const cible = await repo.findCible(assignment.domainCode, assignment.targetCode);
      await repo.insertAffectation({
        affectation_id: `${person.personneId}-${index}`,personne_id: person.personneId,cible_id: cible.cible_id,
        domaine_code: assignment.domainCode,niveau_code: assignment.targetCode,date_debut: '2027-01-01'
      });
    }
  }
  const legacy = await service.resolveEligiblePopulation({
    eventDate: '2027-06-15',domaineCode: target[0],cibleIds: [targetRow.cible_id],suiviNominatif: [],store: repo
  });
  const canonical = engine.evaluatePublicRule({
    ruleVersion: definition(code).version,evaluationDate: '2027-06-15',competenceCodes: c3.ALL_QUALIFICATION_CODES,
    persons: people.map((row) => ({ personneId: row.personneId,actif: true,grade: row.grade })),periods: [],
    assignments: canonicalFacts.assignments || [],competencies: canonicalFacts.competencies || [],fobaLevels: [],jspRoles
  });
  const legacyIds = legacy.personnes.map((row) => row.personneId).sort();
  const comparison = engine.compareLegacyAndCanonical({ complete: true,personIds: legacyIds }, canonical);
  assert.deepStrictEqual(comparison.legacyOnlyPersonIds, expectedLegacyOnly, `${code}: unexpected legacy-only population`);
  assert.deepStrictEqual(comparison.canonicalOnlyPersonIds, [], `${code}: unexpected canonical-only population`);
  return { code,classification: 'REAL_PARITY',matched: comparison.differences.length === 0,comparison };
}

(async () => {
  const reports = [];
  reports.push(await runScenario({
    code: 'DPS-GEN',target: ['DPS','GEN'],
    people: [{ personId: 'D1',personneId: 'D1',assignments: [{ domainCode: 'DPS',targetCode: 'G1' }] }],
    canonicalFacts: { assignments: [{ personneId: 'D1',domainCode: 'DPS',oiCode: 'G1',validFrom: '2027-01-01' }] }
  }));
  reports.push(await runScenario({
    code: 'DAP-GEN',target: ['DAP','GEN'],
    people: [{ personneId: 'A1',assignments: [{ domainCode: 'DAP',targetCode: 'Y2' }] }],
    canonicalFacts: { assignments: [{ personneId: 'A1',domainCode: 'DAP',oiCode: 'Y2',validFrom: '2027-01-01' }] }
  }));
  reports.push(await runScenario({
    code: 'JSP-GEN',target: ['JSP','GEN'],
    people: [
      { personneId: 'J1',grade: 'Flamme 2',assignments: [{ domainCode: 'JSP',targetCode: 'G1' }] },
      { personneId: 'JSP-ADULT',grade: 'Capitaine',assignments: [{ domainCode: 'JSP',targetCode: 'G1' }] }
    ],
    canonicalFacts: { assignments: [{ personneId: 'J1',domainCode: 'JSP',oiCode: 'G1',validFrom: '2027-01-01' }] },
    jspRoles: [{ personneId: 'J1',role: 'JEUNE',oiCode: 'G1',validFrom: '2027-01-01' }],
    expectedLegacyOnly: ['JSP-ADULT']
  }));
  for(const [code,targetCode,qualificationCode] of [['PR-PAPR','PAPR','PAPR'],['PR-PABC','ABC','PABC']]){
    const assignments = [
      { personneId: code,domainCode: 'PR',targetCode,validFrom: '2027-01-01' }
    ];
    const backfillInput = [
      { id: `${code}-Q`,personne_id: code,categorie: 'SPECIALISATION',domaine: 'PR',cible: targetCode,date_actif: '2027-01-01' }
    ];
    if(qualificationCode === 'PABC') backfillInput.push({ id: `${code}-PAPR`,personne_id: code,categorie: 'SPECIALISATION',domaine: 'PR',cible: 'PAPR',date_actif: '2027-01-01' });
    const built = c3.buildPersonQualificationBackfill(backfillInput);
    reports.push(await runScenario({
      code,target: ['PR',targetCode],people: [{ personneId: code,assignments }],
      canonicalFacts: { competencies: c3.toCanonicalCompetenceFacts(built.qualifications) }
    }));
  }
  assert.strictEqual(reports.length, 5);
  assert.ok(reports.every((row) => row.classification === 'REAL_PARITY'));
  assert.strictEqual(reports.filter((row) => row.matched).length, 4);
  console.log('scope-person-qualifications-c3-b-real-parity-tests: ok (5 REAL_PARITY, 4 matched, 1 expected JSP young-only divergence)');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });

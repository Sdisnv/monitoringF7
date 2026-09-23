'use strict';

const engine = require('../netlify/lib/_scope-public-engine');
const { PUBLIC_DEFINITIONS, UNRESOLVED_PUBLIC_CANDIDATES } = require('../netlify/lib/_scope-public-foundations');

const persons = [{ personneId: 'P1', actif: true }, { personneId: 'P2', actif: true }];
const facts = {
  persons,
  periods: [{ id: 'RH1', personneId: 'P1', status: 'ACTIF', validFrom: '2027-01-01' }],
  competencies: [], fobaLevels: [], jspRoles: [],
  assignments: [{ id: 'A1', personneId: 'P1', domainCode: 'DPS', oiCode: 'G1', validFrom: '2027-01-01' }]
};
const dpsG1 = PUBLIC_DEFINITIONS.find((row) => row.code === 'DPS-G1');
const result = engine.evaluatePublicRule({ ruleVersion: dpsG1.version, evaluationDate: '2027-06-15', ...facts });
const comparisonFixture = engine.compareLegacyAndCanonical({ complete: true, resolutionStatus: 'COMPLETE', personIds: ['P1', 'P2'] }, result);
const equalFixture = engine.compareLegacyAndCanonical({ complete: true, resolutionStatus: 'COMPLETE', personIds: ['P1'] }, result);
const unresolvedFixture = engine.compareLegacyAndCanonical(
  { complete: true, resolutionStatus: 'COMPLETE', personIds: ['P1'] },
  engine.evaluatePublicRule({ ruleVersion: { ...dpsG1.version, resolutionStatus: 'UNRESOLVED' }, evaluationDate: '2027-06-15', ...facts })
);
const invalidSamples = [
  { predicate: 'HAS_PR_TRACK', trackCodes: ['PAPR'] },
  { op: 'NOT', children: [] },
  { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: ['UNKNOWN'] }
];
const report = {
  engineVersion: engine.ENGINE_VERSION,
  definitions: PUBLIC_DEFINITIONS.length,
  ruleVersions: PUBLIC_DEFINITIONS.length,
  activeRuleVersions: PUBLIC_DEFINITIONS.filter((row) => row.version.status === 'ACTIVE').length,
  fingerprints: Object.fromEntries(PUBLIC_DEFINITIONS.map((row) => [row.code, row.version.fingerprint])),
  validation: {
    valid: PUBLIC_DEFINITIONS.filter((row) => engine.validatePublicRule(row.version.expression).valid).length,
    invalidRejected: invalidSamples.filter((sample) => !engine.validatePublicRule(sample).valid).length
  },
  resolution: {
    resolved: PUBLIC_DEFINITIONS.length,
    unresolved: UNRESOLVED_PUBLIC_CANDIDATES.filter((row) => row.status === 'UNRESOLVED').length,
    ambiguous: UNRESOLVED_PUBLIC_CANDIDATES.filter((row) => row.status === 'AMBIGUOUS').length,
    candidates: UNRESOLVED_PUBLIC_CANDIDATES
  },
  scenarioClasses: {
    realParity: {
      classification: 'REAL_PARITY',
      harness: 'scripts/scope-public-engine-c2-b-real-parity-tests.js',
      scenarioCount: 14
    },
    canonicalFixture: {
      classification: 'CANONICAL_FIXTURE',
      complete: comparisonFixture.complete,
      referenceCount: comparisonFixture.legacyPersonIds.length,
      canonicalCount: comparisonFixture.canonicalPersonIds.length,
      differenceCount: comparisonFixture.differences.length,
      referenceOnly: comparisonFixture.legacyOnlyPersonIds,
      canonicalOnly: comparisonFixture.canonicalOnlyPersonIds,
      scenarios: [
        { code: 'EXACT_COMPARISON', classification: 'CANONICAL_FIXTURE', complete: equalFixture.complete, differenceCount: equalFixture.differences.length },
        { code: 'REFERENCE_ONLY', classification: 'CANONICAL_FIXTURE', complete: comparisonFixture.complete, differenceCount: comparisonFixture.differences.length }
      ],
      differences: comparisonFixture.differences
    },
    canonicalOnly: {
      classification: 'CANONICAL_ONLY',
      scenarios: ['ALL_ANY_NOT', 'MULTI_DOMAIN', 'MULTI_PUBLIC', 'HAS_JSP_ROLE']
    },
    resolutionOnly: {
      classification: 'RESOLUTION_ONLY',
      complete: unresolvedFixture.complete,
      resolutionStatus: unresolvedFixture.resolutionStatus,
      candidates: UNRESOLVED_PUBLIC_CANDIDATES.map((row) => row.code)
    }
  },
  warnings: result.warnings,
  resultFingerprint: result.resultFingerprint
};

if(process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else{
  console.log('SCOPE public engine mirror C2-B - diagnostic statique dry-run');
  console.log(`definitions: ${report.definitions}`);
  console.log(`versions actives: ${report.activeRuleVersions}`);
  console.log(`regles valides: ${report.validation.valid}`);
  console.log(`regles invalides rejetees: ${report.validation.invalidRejected}`);
  console.log(`candidats non resolus: ${report.resolution.unresolved}`);
  console.log(`candidats ambigus: ${report.resolution.ambiguous}`);
  console.log(`scenarios REAL_PARITY du harness: ${report.scenarioClasses.realParity.scenarioCount}`);
  console.log(`ecarts de la fixture canonique: ${report.scenarioClasses.canonicalFixture.differenceCount}`);
  console.log(`fingerprint resultat: ${report.resultFingerprint}`);
}

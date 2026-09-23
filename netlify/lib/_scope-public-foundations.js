'use strict';

const { fingerprintPublicRule } = require('./_scope-public-engine');

const personEligible = Object.freeze({ predicate: 'PERSON_ELIGIBLE_AT' });

function allWith(predicate){
  return { op: 'ALL', children: [personEligible, predicate] };
}

function definition(code, label, ownerCode, predicate, domainHints){
  const expression = allWith(predicate);
  return Object.freeze({
    code, label, description: `Public canonique ${label}`,
    status: 'ACTIVE', ownerType: 'DOMAIN', ownerCode, domainHints: Object.freeze(domainHints || [ownerCode]),
    version: Object.freeze({ versionNumber: 1, versionCode: 'V1', status: 'ACTIVE', schemaVersion: 1, expression, fingerprint: fingerprintPublicRule(expression) })
  });
}

const PUBLIC_DEFINITIONS = Object.freeze([
  ...['G1', 'C1', 'B1', 'B2'].map((code) => definition(`DPS-${code}`, `DPS ${code}`, 'DPS', { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: [code] })),
  ...['Y1', 'Y2', 'Y3', 'Y4'].map((code) => definition(`DAP-${code}`, `DAP ${code}`, 'DAP', { predicate: 'HAS_OI', domainCode: 'DAP', oiCodes: [code] })),
  ...['1', '2', '3'].map((code) => definition(`FOBA-${code}`, `FOBA ${code}`, 'FOBA', { predicate: 'HAS_FOBA_LEVEL', levelCodes: [code] })),
  ...['COND_PL', 'COND_VL', 'COND_TP9', 'GRUTIER', 'MEA', 'PILOTE_BAT'].map((code) =>
    definition(`AUTO-${code.replaceAll('_', '-')}`, `AUTO ${code}`, 'AUTO', { predicate: 'HAS_COMPETENCE', competenceCodes: [code] })),
  ...['OFSI', 'NAC', 'OP_VPC', 'ANTICHUTE'].map((code) =>
    definition(`FOSPEC-${code.replaceAll('_', '-')}`, `FOSPEC ${code}`, 'FOSPEC', { predicate: 'HAS_COMPETENCE', competenceCodes: [code] }))
]);

const UNRESOLVED_PUBLIC_CANDIDATES = Object.freeze([
  { code: 'DPS-GEN', status: 'UNRESOLVED', reason: 'DPS/GEN ne désigne pas une population canonique unique.' },
  { code: 'DAP-GEN', status: 'UNRESOLVED', reason: 'DAP/GEN ne désigne pas une population canonique unique.' },
  { code: 'JSP-GEN', status: 'UNRESOLVED', reason: 'JSP/GEN ne désigne pas une population canonique unique.' },
  { code: 'JSP-CAD', status: 'AMBIGUOUS', reason: 'Le rôle JSP CAD reste à arbitrer.' },
  { code: 'FOCO-DPS', status: 'UNRESOLVED', reason: 'FOCO/DPS ne fournit pas une qualification personnelle canonique.' },
  { code: 'FOCO-DAP', status: 'UNRESOLVED', reason: 'FOCO/DAP ne fournit pas une qualification personnelle canonique.' },
  { code: 'FOCO-JSP', status: 'UNRESOLVED', reason: 'FOCO/JSP ne fournit pas une qualification personnelle canonique.' },
  { code: 'FOCA-GEN', status: 'AMBIGUOUS', reason: 'FOCA/GEN ne permet pas de conclure à un niveau ou parcours.' },
  { code: 'FOSPEC-GEN', status: 'AMBIGUOUS', reason: 'FOSPEC/GEN ne désigne pas une spécialité.' },
  { code: 'PR-GEN', status: 'AMBIGUOUS', reason: 'PR/GEN ne doit pas être assimilé automatiquement à PAPR.' },
  { code: 'PR-PAPR', status: 'UNRESOLVED', reason: 'Aucune compétence personnelle PAPR n’existe dans C1.' },
  { code: 'PR-PABC', status: 'UNRESOLVED', reason: 'Aucune compétence personnelle PABC n’existe dans C1.' }
]);

module.exports = { PUBLIC_DEFINITIONS, UNRESOLVED_PUBLIC_CANDIDATES };

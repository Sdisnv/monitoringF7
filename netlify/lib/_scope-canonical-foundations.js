'use strict';

const CANONICAL_DOMAIN_CODES = Object.freeze([
  'DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR'
]);

const ORGANISATIONAL_UNITS = Object.freeze([
  { code: 'G1', label: 'G1', sortOrder: 1 },
  { code: 'C1', label: 'C1', sortOrder: 2 },
  { code: 'B1', label: 'B1', sortOrder: 3 },
  { code: 'B2', label: 'B2', sortOrder: 4 },
  { code: 'Y1', label: 'Y1', sortOrder: 5 },
  { code: 'Y2', label: 'Y2', sortOrder: 6 },
  { code: 'Y3', label: 'Y3', sortOrder: 7 },
  { code: 'Y4', label: 'Y4', sortOrder: 8 }
]);

const DOMAIN_ORGANISATIONAL_UNITS = Object.freeze({
  DPS: Object.freeze(['G1', 'C1', 'B1', 'B2']),
  DAP: Object.freeze(['Y1', 'Y2', 'Y3', 'Y4']),
  JSP: Object.freeze(['G1', 'C1', 'B1'])
});

const PR_ACTIVITY_TRACKS = Object.freeze([
  { code: 'GENERAL', label: 'Général', sortOrder: 1 },
  { code: 'PAPR', label: 'PAPR', sortOrder: 2 },
  { code: 'PABC', label: 'PABC', sortOrder: 3 }
]);

const PR_ACTIVITY_TRACK_ALIASES = Object.freeze({
  GENERAL: 'GENERAL',
  PAPR: 'PAPR',
  PABC: 'PABC',
  ABC: 'PABC',
  PRABC: 'PABC',
  'PR-ABC': 'PABC'
});

const COMPETENCE_DEFINITIONS = Object.freeze([
  { code: 'COND_PL', label: 'cond PL', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 1 },
  { code: 'COND_TP9', label: 'cond TP9', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 2 },
  { code: 'COND_VL', label: 'cond VL', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 3 },
  { code: 'GRUTIER', label: 'Grutier', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 4 },
  { code: 'MEA', label: 'MEA', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 5 },
  { code: 'PILOTE_BAT', label: 'Pilote BAT', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 6 },
  { code: 'ANTICHUTE', label: 'Antichute', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 1 },
  { code: 'NAC', label: 'NAC', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 2 },
  { code: 'OFSI', label: 'OFSI', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 3 },
  { code: 'OP_VPC', label: 'OP VPC', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 4 }
]);

const COMPETENCE_ALIASES = Object.freeze([
  { domainCode: 'AUTO', alias: 'PL', competenceCode: 'COND_PL' },
  { domainCode: 'AUTO', alias: 'TP9', competenceCode: 'COND_TP9' },
  { domainCode: 'AUTO', alias: 'VL', competenceCode: 'COND_VL' },
  { domainCode: 'AUTO', alias: 'VL_DPS', competenceCode: 'COND_VL', legacyContext: 'DPS' },
  { domainCode: 'AUTO', alias: 'VL_DAP', competenceCode: 'COND_VL', legacyContext: 'DAP' },
  { domainCode: 'AUTO', alias: 'GRUTIER', competenceCode: 'GRUTIER' },
  { domainCode: 'AUTO', alias: 'MEA', competenceCode: 'MEA' },
  { domainCode: 'AUTO', alias: 'BAT', competenceCode: 'PILOTE_BAT' }
]);

const FOBA_LEVELS = Object.freeze([
  { code: '1', label: 'FOBA 1', sortOrder: 1 },
  { code: '2', label: 'FOBA 2', sortOrder: 2 },
  { code: '3', label: 'FOBA 3', sortOrder: 3 }
]);

const REVIEW_TARGETS = Object.freeze({
  'FOCA/GEN': 'FOCA/GEN ne permet pas de conclure à un niveau ou parcours.',
  'JSP/CAD': 'JSP/CAD doit être comparé aux rôles JSP et moniteurs.',
  'FOSPEC/GEN': 'FOSPEC/GEN est un périmètre générique, pas une spécialité.',
  'PR/GEN': 'PR/GEN ne doit pas être assimilé automatiquement à PAPR.'
});

function normalizeCode(value){
  return String(value || '').trim().toUpperCase();
}

function legacyTargetKey(target){
  return `${normalizeCode(target && (target.domaine_code || target.domaineCode))}/${normalizeCode(target && (target.niveau_code || target.niveauCode))}`;
}

function classifyLegacyTarget(target){
  const key = legacyTargetKey(target);
  const [domainCode, levelCode] = key.split('/');
  const mappings = [];

  if((DOMAIN_ORGANISATIONAL_UNITS[domainCode] || []).includes(levelCode)){
    mappings.push({ type: 'OI', code: levelCode, status: 'CONFIRMED' });
  }
  if(domainCode === 'FOBA' && FOBA_LEVELS.some((row) => row.code === levelCode)){
    mappings.push({ type: 'FOBA_LEVEL', code: levelCode, status: 'CONFIRMED' });
  }
  if(domainCode === 'PR' && levelCode === 'PAPR'){
    mappings.push({ type: 'PR_ACTIVITY_TRACK', code: 'PAPR', status: 'CONFIRMED' });
  }
  if(domainCode === 'PR' && levelCode === 'ABC'){
    mappings.push({ type: 'PR_ACTIVITY_TRACK', code: 'PABC', status: 'CONFIRMED' });
  }
  if(domainCode === 'PR' && ['G1', 'C1', 'B1', 'B2'].includes(levelCode)){
    mappings.push({ type: 'OI', code: levelCode, status: 'COMPOSITE' });
    mappings.push({ type: 'PR_ACTIVITY_TRACK', code: 'PAPR', status: 'COMPOSITE' });
  }
  if(domainCode === 'AUTO'){
    const autoMap = { VL: 'COND_VL', PL: 'COND_PL', TP9: 'COND_TP9', GRUTIER: 'GRUTIER', MEA: 'MEA', BAT: 'PILOTE_BAT' };
    if(autoMap[levelCode]) mappings.push({ type: 'COMPETENCE', code: autoMap[levelCode], status: 'CONFIRMED' });
  }

  if(REVIEW_TARGETS[key]){
    return { key, classification: 'AMBIGUOUS', reason: REVIEW_TARGETS[key], mappings: [] };
  }
  if(mappings.some((row) => row.status === 'COMPOSITE')){
    return { key, classification: 'COMPOSITE', reason: 'La cible legacy porte plusieurs concepts canoniques.', mappings };
  }
  if(mappings.length){
    return { key, classification: 'MAPPED', reason: null, mappings };
  }
  return { key, classification: 'UNMAPPED', reason: 'Aucun mapping C1 certain.', mappings: [] };
}

function diagnoseLegacyTargets(targets){
  const details = (targets || []).map((target) => ({
    cibleId: target.cible_id || target.cibleId || null,
    domaineCode: target.domaine_code || target.domaineCode || null,
    niveauCode: target.niveau_code || target.niveauCode || null,
    libelle: target.libelle || target.label || null,
    ...classifyLegacyTarget(target)
  }));
  const count = (classification) => details.filter((row) => row.classification === classification).length;
  return {
    total: details.length,
    mappedAutomatically: count('MAPPED'),
    composite: count('COMPOSITE'),
    ambiguous: count('AMBIGUOUS'),
    unmapped: count('UNMAPPED'),
    details
  };
}

module.exports = {
  CANONICAL_DOMAIN_CODES,
  ORGANISATIONAL_UNITS,
  DOMAIN_ORGANISATIONAL_UNITS,
  PR_ACTIVITY_TRACKS,
  PR_ACTIVITY_TRACK_ALIASES,
  COMPETENCE_DEFINITIONS,
  COMPETENCE_ALIASES,
  FOBA_LEVELS,
  REVIEW_TARGETS,
  legacyTargetKey,
  classifyLegacyTarget,
  diagnoseLegacyTargets
};

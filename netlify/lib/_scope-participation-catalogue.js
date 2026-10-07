'use strict';

const { HttpError } = require('./_scope-rules');

const POPULATIONS = Object.freeze(['PUBLIC','QUALIFICATION','OI','SDIS']);
const MODES = Object.freeze(['EVENT','MULTI_SESSION','CURSUS']);

function normalizeDecision(input = {}){
  if(typeof input.tracking !== 'boolean'){
    throw new HttpError(422,'suivi_participation_invalide','Choisissez Oui ou Non pour le suivi des participations.');
  }
  if(!input.tracking){
    return { tracking:false,populationKind:'NONE',populationCode:null,evaluationMode:'NONE',
      evaluationGroupCode:null,evaluationSessionIndex:null };
  }
  const populationKind = String(input.populationKind || '').trim().toUpperCase();
  const populationCode = String(input.populationCode || '').trim().toUpperCase();
  const evaluationMode = String(input.evaluationMode || '').trim().toUpperCase();
  const evaluationGroupCode = String(input.evaluationGroupCode || '').trim().toUpperCase() || null;
  const evaluationSessionIndex = input.evaluationSessionIndex == null || input.evaluationSessionIndex === ''
    ? null : Number(input.evaluationSessionIndex);
  if(!POPULATIONS.includes(populationKind) || !populationCode || !MODES.includes(evaluationMode)
    || populationCode.length > 80 || evaluationGroupCode && evaluationGroupCode.length > 80
    || evaluationSessionIndex !== null && (!Number.isInteger(evaluationSessionIndex) || evaluationSessionIndex < 1)){
    throw new HttpError(422,'suivi_participation_configuration_invalide',
      'Le public évalué et le mode d’évaluation doivent être définis pour une activité suivie.');
  }
  if(populationKind === 'SDIS' && populationCode !== 'SDIS-TOUS'){
    throw new HttpError(422,'suivi_participation_population_invalide','Utilisez le public canonique SDIS-TOUS.');
  }
  return { tracking:true,populationKind,populationCode,evaluationMode,evaluationGroupCode,evaluationSessionIndex };
}

function serializeRule(row){
  if(!row) return { tracking:null,status:'A_QUALIFIER',populationKind:null,populationCode:null,
    evaluationMode:null,evaluationGroupCode:null,evaluationSessionIndex:null,versionNumber:0 };
  return { tracking:row.tracking === true,status:row.tracking === true ? 'SUIVIE' : 'NON_SUIVIE',
    populationKind:row.population_kind,populationCode:row.population_code,
    evaluationMode:row.evaluation_mode,evaluationGroupCode:row.evaluation_group_code,
    evaluationSessionIndex:row.evaluation_session_index,versionNumber:Number(row.version_number),
    source:row.source,createdAt:row.created_at,createdBy:row.created_by };
}

module.exports = { normalizeDecision,serializeRule };

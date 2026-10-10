(function(root,factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeEcawin = api;
})(typeof window !== 'undefined' ? window : globalThis,function(){
  'use strict';
  const activityCodes = Object.freeze(['COURS','EXERPO','EXERCI','EXERSR','EXOFSI']);
  const source = 'ECAWIN_CAPTURE_MOA_20261009';
  const activityLabels = Object.freeze({COURS:'Cours de formation',EXERPO:'Exercice SPP',EXERCI:'Exercices SDIS',
    EXERSR:'Exercice Secours Routier',EXOFSI:'Formation continue OFSI'});
  const sourceImage = Object.freeze({path:'docs/references/ECAwin_captures_originales_regroupees_20261009.png',
    sha256:'3884f6af43a02c310e81a964747b88b24e5d024f060c6fdd8d5c1e083b2ec81e'});
  const associations = Object.freeze([
    ['COURS','CDIV','Cours divers'],
    ['COURS','CECA','Cours cantonal ECA'],
    ['COURS','CECAFB','Cours cantonal ECA FB01'],
    ['COURS','CFSSP','Cours FSSP'],
    ['COURS','COURJSP','Cours moniteur JSP'],
    ['EXERCI','010FOBA','Exercice FOBA'],
    ['EXERCI','010FOBC','Cours de cadre FOBA'],
    ['EXERCI','010JB1','Exercice JSP B1'],
    ['EXERCI','010JC1','Exercice JSP C1'],
    ['EXERCI','010JG1','Exercice JSP G1'],
    ['EXERCI','010JSP','Exercice JSP'],
    ['EXERCI','010JY3','Exercice JSP Y3'],
    ['EXERCI','011PR','Exercice PR'],
    ['EXERCI','0120F7','Instruction FOCO DPS (4 DPS)'],
    ['EXERCI','012B1','FOCO DPS B1'],
    ['EXERCI','012B2','FOCO DPS B2'],
    ['EXERCI','012C1','FOCO DPS C1'],
    ['EXERCI','012G1','FOCO DPS G1'],
    ['EXERCI','0130F7','Instruction FOCO DAP (4 DAP)'],
    ['EXERCI','013Y1','FOCO DAP Y1'],
    ['EXERCI','013Y2','FOCO DAP Y2'],
    ['EXERCI','013Y3','FOCO DAP Y3'],
    ['EXERCI','013Y4','FOCO DAP Y4'],
    ['EXERCI','014B1','Exercice divers B1'],
    ['EXERCI','014B2','Exercice divers B2'],
    ['EXERCI','014C1','Exercice divers C1'],
    ['EXERCI','014G1','Exercice divers G1'],
    ['EXERCI','0151F7','instruction AUTO EA'],
    ['EXERCI','01521F7','Instruction AUTO PL'],
    ['EXERCI','01522F7','Instruction AUTO VL'],
    ['EXERCI','0152F7','Instruction AUTO PL/VL'],
    ['EXERCI','0153F7','Instrcution AUTO BAT'],
    ['EXERCI','0154F7','Instruction AUTO GRUE'],
    ['EXERCI','0155F7','Instruction AUTO DIVERS'],
    ['EXERCI','0163F7','Instruction FOSPEC VPC'],
    ['EXERCI','0164F7','Instruction FOSPEC ABC'],
    ['EXERCI','0165F7','Instruction FOSPEC NAC'],
    ['EXERCI','0166F7','Instruction FOSPEC ANTICHUTE'],
    ['EXERCI','0167F7','Instruction FOSPEC SANITAIRE'],
    ['EXERCI','0168F7','Instruction FOSPEC DIVERS'],
    ['EXERCI','0170F7','Instruction FOCA (tous les cadres)'],
    ['EXERCI','0171F7','Instruction FOCA DPS'],
    ['EXERCI','0172F7','Instruction FOCA DAP'],
    ['EXERCI','0173F7','Instruction FOCA RECO DPS'],
    ['EXERCI','0174F7','Instruction FOCA RECO DAP'],
    ['EXERCI','0175F7','Instruction FOCA DIVERS'],
    ['EXERCI','0180F7','Formations EXTRAS'],
    ['EXERCI','070F0','Séance F0'],
    ['EXERCI','070F1','Séance F1'],
    ['EXERCI','070F23','Séance F2/3'],
    ['EXERCI','070F4','Séance F4'],
    ['EXERCI','070F56','Séance F5/6'],
    ['EXERCI','070F7','Séance F7'],
    ['EXERCI','070F8','Séance F8'],
    ['EXERCI','071F3','Rapport annuel du SDIS NV'],
    ['EXERCI','072F3','Revue quinquennale SDIS NV'],
    ['EXERCI','073F56','Représentations'],
    ['EXERCI','074F1','Test NUOVO'],
    ['EXERCI','CONCOUR','Concours','MOA_CONCOUR_20261010'],
    ['EXERSR','0161F7','Instruction FOSPEC PIO'],
    ['EXOFSI','0162F7','Instruction FOSPEC OFSI']
  ].map(([activityCode,statCom,description,confirmationSource])=>Object.freeze({activityCode,statCom,description,
    active:statCom !== '010JY3',source:confirmationSource || source})));
  const unresolvedAssociations = Object.freeze([]);
  function activityForStatCom(statCom){
    const matches = associations.filter(row=>row.statCom === statCom && row.active);
    return matches.length === 1 ? matches[0].activityCode : '';
  }
  function isCompatible(activityCode,statCom){
    return associations.some(row=>row.activityCode === activityCode && row.statCom === statCom && row.active);
  }
  function correspondenceRows(rows,references){
    return (rows || []).map(row=>{
      const statCom = row.statCom || '';
      const activityCode = row.ecawinActivityCode || '';
      const qualified = isCompatible(activityCode,statCom);
      const association = associations.find(item=>item.activityCode === activityCode && item.statCom === statCom);
      const descriptionKnown = association?.description != null;
      const reference = references?.find(item=>item.code === statCom);
      const date = String(row.startsAt || row.date || '').slice(0,10);
      const applicable = !references || Boolean(reference && reference.active !== false
        && (!date || ((!reference.validFrom || reference.validFrom <= date) && (!reference.validTo || reference.validTo >= date))));
      return {programmeItemId:row.id,scopeOccurrenceCode:row.businessCode || row.publishedEventCode || '',
        scopeDescription:row.activityLabel || row.label || '',statCom,activityCode,
        suggestedActivityCode:activityForStatCom(statCom),officialDescription:association?.description ?? null,
        associationConfirmed:qualified,
        status:statCom === '010JY3' ? 'HISTORICAL_ONLY' : statCom === 'EMSEA' ? 'SCOPE_ONLY'
          : qualified ? (!applicable ? 'REFERENCE_NOT_APPLICABLE' : descriptionKnown ? 'QUALIFIED' : 'DESCRIPTION_PENDING') : 'UNQUALIFIED',
        exportable:qualified && descriptionKnown && applicable,source:association?.source || null};
    });
  }
  return {activityCodes,activityLabels,associations,sourceImage,unresolvedAssociations,
    complete:unresolvedAssociations.length === 0,source,
    activityForStatCom,isCompatible,correspondenceRows};
});

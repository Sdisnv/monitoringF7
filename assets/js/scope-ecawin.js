(function(root,factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeEcawin = api;
})(typeof window !== 'undefined' ? window : globalThis,function(){
  'use strict';
  const activityCodes = Object.freeze(['COURS','EXERPO','EXERCI','EXERSR','EXOFSI']);
  // Only associations explicitly supplied by the MOA on 09.10.2026 are confirmed.
  const associations = Object.freeze([
    ...['CDIV','CECA','CECAFB','CFSSP','COURJSP'].map(statCom=>({activityCode:'COURS',statCom})),
    ...['011PR','010JC1','010JB1','010JG1','0180F7'].map(statCom=>({activityCode:'EXERCI',statCom})),
    {activityCode:'EXERSR',statCom:'0161F7'},{activityCode:'EXOFSI',statCom:'0162F7'}
  ].map(row=>Object.freeze({...row,description:null,source:'MOA_20261009_EXPLICIT'})));
  function activityForStatCom(statCom){
    const matches = associations.filter(row=>row.statCom === statCom);
    return matches.length === 1 ? matches[0].activityCode : '';
  }
  function isCompatible(activityCode,statCom){
    return associations.some(row=>row.activityCode === activityCode && row.statCom === statCom);
  }
  function correspondenceRows(rows){
    return (rows || []).map(row=>{
      const statCom = row.statCom || '';
      const activityCode = row.ecawinActivityCode || '';
      const qualified = isCompatible(activityCode,statCom);
      const association = associations.find(item=>item.activityCode === activityCode && item.statCom === statCom);
      const descriptionKnown = association?.description != null;
      return {programmeItemId:row.id,scopeOccurrenceCode:row.businessCode || row.publishedEventCode || '',
        scopeDescription:row.activityLabel || row.label || '',statCom,activityCode,
        suggestedActivityCode:activityForStatCom(statCom),officialDescription:association?.description ?? null,
        associationConfirmed:qualified,
        status:qualified ? (descriptionKnown ? 'QUALIFIED' : 'DESCRIPTION_PENDING') : statCom === '010JY3' ? 'HISTORICAL_ONLY' : 'UNQUALIFIED',
        exportable:qualified && descriptionKnown,source:qualified ? 'MOA_20261009_EXPLICIT' : null};
    });
  }
  return {activityCodes,associations,complete:false,source:'MOA_20261009_EXPLICIT',
    activityForStatCom,isCompatible,correspondenceRows};
});

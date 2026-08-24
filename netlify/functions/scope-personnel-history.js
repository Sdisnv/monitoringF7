const { response, verifyToken, bearerToken } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'dashboard:read'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    const params = event.queryStringParameters || {};
    if(params.batchId){
      const batch = await personnel.getPersonnelImportBatch(params.batchId);
      return batch ? response(200, { ok:true, batch }) : response(404, { ok:false, error:'not_found' });
    }
    if(params.asOf || params.date){
      const personnes = await personnel.situationAtDate(params.asOf || params.date, params.statut || 'tous');
      return response(200, { ok:true, date: params.asOf || params.date, personnes, period: personnes._period || null });
    }
    const batches = await personnel.listPersonnelImportHistory();
    return response(200, { ok:true, batches });
  }catch(error){
    return response(500, { ok:false, error:'scope_personnel_history_failed', message:String(error.message || error) });
  }
};

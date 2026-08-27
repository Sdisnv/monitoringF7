const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');
const { getPgRepo } = require('./_scope-pg');
const { createScopeService } = require('./_scope-service');

async function syncExpectedPopulationForPersonne(personne, claims){
  const id = personne?.personne_id || personne?.id || personne?.personneId;
  if(!id) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  return service.syncExpectedPopulationForPersonnes([id], claims, { reason: 'MODIFIER_AFFECTATION_LEGACY' });
}

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, event.httpMethod === 'GET' ? 'dashboard:read' : 'effectifs:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    const params = event.queryStringParameters || {};
    if(event.httpMethod === 'GET'){
      const personne = await personnel.getPersonne(params.id);
      return personne ? response(200, { ok:true, personne }) : response(404, { ok:false, error:'not_found' });
    }
    if(event.httpMethod === 'PUT'){
      const body = parseBody(event);
      if(!body) return response(400, { ok:false, error:'invalid_json' });
      if(body.affectationId){
        const personne = await personnel.updateAffectation(body.affectationId, body);
        const synchronisationPopulation = await syncExpectedPopulationForPersonne(personne, claims);
        return response(200, { ok:true, personne, synchronisationPopulation });
      }
      return response(200, { ok:true, personne:await personnel.updatePersonne(body.id || params.id, body) });
    }
    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    return response(500, { ok:false, error:'scope_personnel_detail_failed', message:String(error.message || error) });
  }
};

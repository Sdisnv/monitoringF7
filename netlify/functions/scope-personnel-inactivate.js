const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');
const { getPgRepo } = require('./_scope-pg');
const { createScopeService } = require('./_scope-service');

async function syncExpectedPopulationForPersonne(personne, claims, reason){
  const id = personne?.personne_id || personne?.id || personne?.personneId;
  if(!id) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  return service.syncExpectedPopulationForPersonnes([id], claims, { reason });
}

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'personnel:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event) || {};
    const id = body.personneId || body.id || (event.queryStringParameters || {}).id;
    const action = String(body.action || 'inactivate').toLowerCase();
    const personne = action === 'correct' || action === 'reactivate'
      ? await personnel.correctPersonneInactivation(id, body, claims)
      : await personnel.inactivatePersonne(id, body, claims);
    const synchronisationPopulation = await syncExpectedPopulationForPersonne(
      personne,
      claims,
      action === 'correct' || action === 'reactivate' ? 'CORRIGER_INACTIVATION' : 'INACTIVER_PERSONNE'
    );
    return response(200, { ok:true, personne, synchronisationPopulation });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:'scope_personnel_inactivate_failed', message:String(error.message || error) });
  }
};

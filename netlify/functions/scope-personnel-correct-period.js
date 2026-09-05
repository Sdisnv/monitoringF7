const { response, verifyToken, bearerToken, parseBody } = require('../lib/_auth-utils');
const { requirePermission } = require('../lib/_rbac');
const personnel = require('../lib/_scope-personnel-service');
const { getPgRepo } = require('../lib/_scope-pg');
const { createScopeService } = require('../lib/_scope-service');

async function syncExpectedPopulationForPersonne(personne, claims){
  const id = personne?.personne_id || personne?.id || personne?.personneId;
  if(!id) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  return service.syncExpectedPopulationForPersonnes([id], claims, { reason: 'CORRIGER_AFFECTATION_PERIODE' });
}

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'personnel:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event) || {};
    const personne = await personnel.correctAffectationPeriod(body.affectationId || body.id, body, claims);
    const synchronisationPopulation = await syncExpectedPopulationForPersonne(personne, claims);
    return response(200, { ok:true, personne, synchronisationPopulation });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:'scope_personnel_correct_period_failed', message:String(error.message || error) });
  }
};

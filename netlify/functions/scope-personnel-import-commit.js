const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const users = require('./_user-store');
const personnel = require('./_scope-personnel-service');
const { getPgRepo } = require('./_scope-pg');
const { createScopeService } = require('./_scope-service');

async function syncExpectedPopulationFromNips(nips, claims){
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  const ids = [];
  for(const nip of [...new Set((nips || []).filter(Boolean))]){
    const personne = await repo.getPersonneByNip(nip);
    if(personne?.personne_id) ids.push(personne.personne_id);
  }
  return service.syncExpectedPopulationForPersonnes(ids, claims, { reason: 'IMPORT_PERSONNEL_LEGACY' });
}

exports.handler = async function(event){
  let claims;
  try{
    claims = verifyToken(bearerToken(event), 'access');
    claims = await users.getUserByIdentity([claims.sub, claims.email, claims.nip]) || claims;
    requirePermission(claims, 'personnel:manage');
  }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event);
    if(!body || !(body.fileText || body.csvText)) return response(400, { ok:false, error:'missing_file_text' });
    const rapport = await personnel.commitImport(Object.assign({}, body, { confirmed:true }), claims.sub || claims.email || claims.nip || '');
    rapport.synchronisationPopulation = await syncExpectedPopulationFromNips(rapport.touchedNips || [], claims);
    return response(200, rapport);
  }catch(error){
    return response(409, { ok:false, error:'scope_personnel_import_commit_failed', message:String(error.message || error) });
  }
};

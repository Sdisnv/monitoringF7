const { response, verifyToken, bearerToken, parseBody } = require('../lib/_auth-utils');
const { requirePermission } = require('../lib/_rbac');
const users = require('../lib/_user-store');
const personnel = require('../lib/_scope-personnel-service');
const { getPgRepo } = require('../lib/_scope-pg');
const { createScopeService } = require('../lib/_scope-service');

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
    try{
      rapport.synchronisationPopulation = await syncExpectedPopulationFromNips([
        ...(rapport.touchedNips || []),
        ...(rapport.analysedNips || rapport.analysed_nips || [])
      ], claims);
    }catch(syncError){
      rapport.synchronisationPopulation = {
        ok: false,
        error: String(syncError && syncError.message || syncError)
      };
    }
    return response(200, rapport);
  }catch(error){
    const status = Number(error.statusCode || error.status || 400);
    const safeStatus = status === 409 ? 409 : (status >= 400 && status < 600 ? status : 400);
    return response(safeStatus, {
      ok: false,
      error: error.error || (safeStatus === 409 ? 'personnel_stale' : 'scope_personnel_import_commit_failed'),
      message: String(error.message || error)
    });
  }
};

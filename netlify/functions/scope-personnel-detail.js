const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');
const { getPgRepo } = require('./_scope-pg');
const { createScopeService } = require('./_scope-service');

async function syncExpectedPopulationForPersonne(personne, claims, window){
  const id = personne?.personne_id || personne?.id || personne?.personneId;
  if(!id) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  return service.syncExpectedPopulationForPersonnes([id], claims, Object.assign({ reason: 'MODIFIER_AFFECTATION_LEGACY' }, window || {}));
}

exports.handler = async function(event){
  let claims;
  const params = event.queryStringParameters || {};
  try{
    const perm = event.httpMethod === 'GET'
      ? ((params.nip && !params.id) ? 'personnel:read' : 'dashboard:read')
      : (event.httpMethod === 'POST' ? 'personnel:manage' : 'effectifs:manage');
    claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, perm);
  } catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    if(event.httpMethod === 'GET'){
      if(params.nip && !params.id){
        const personne = await personnel.getPersonneByNip(params.nip);
        return personne ? response(200, { ok:true, personne }) : response(404, { ok:false, error:'not_found', message:'NIP introuvable.' });
      }
      const personne = await personnel.getPersonne(params.id);
      return personne ? response(200, { ok:true, personne }) : response(404, { ok:false, error:'not_found' });
    }
    if(event.httpMethod === 'POST'){
      const body = parseBody(event);
      if(!body) return response(400, { ok:false, error:'invalid_json' });
      const action = String(body.action || 'create_affectation').toLowerCase();
      if(action === 'lookup_nip' || action === 'lookupnip'){
        const personne = await personnel.getPersonneByNip(body.nip);
        return personne
          ? response(200, { ok:true, personne })
          : response(404, { ok:false, error:'not_found', message:'NIP introuvable.' });
      }
      if(action === 'create_personne' || action === 'createpersonne' || action === 'create_manual_personne'){
        const personne = await personnel.createManualPersonne(body, claims);
        return response(201, { ok:true, personne });
      }
      if(action !== 'create_affectation' && action !== 'createaffectation'){
        return response(400, { ok:false, error:'invalid_action', message:'Action POST non supportée.' });
      }
      const id = body.personneId || body.id || params.id;
      const personne = await personnel.createAffectation(id, body, claims);
      const synchronisationPopulation = await syncExpectedPopulationForPersonne(personne, claims, {
        from: body.dateActif || body.date_actif || body.dateDebut || null,
        to: body.dateInactif || body.date_inactif || null
      });
      return response(200, { ok:true, personne, synchronisationPopulation });
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
    return response(error.statusCode || 500, { ok:false, error:'scope_personnel_detail_failed', message:String(error.message || error) });
  }
};

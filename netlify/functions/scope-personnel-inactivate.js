const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');
const { getPgRepo } = require('./_scope-pg');
const { createScopeService } = require('./_scope-service');

async function syncExpectedPopulationForPersonne(personne, claims, reason, window){
  const id = personne?.personne_id || personne?.id || personne?.personneId;
  if(!id) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
  const repo = await getPgRepo();
  const service = createScopeService(repo);
  return service.syncExpectedPopulationForPersonnes([id], claims, Object.assign({ reason }, window || {}));
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
    const operation = String(body.operation || body.kind || '').toUpperCase();
    const isCorrect = action === 'correct' || action === 'reactivate';
    const isSabbatical = action === 'sabbatical';
    const isEndSabbatical = action === 'end_sabbatical' || action === 'end-sabbatical';
    const isAssignmentClose = !isSabbatical && !isEndSabbatical && (
      action === 'close_assignment' || action === 'cloture'
      || operation === 'ASSIGNMENT' || operation === 'CLOTURE_AFFECTATION' || operation === 'CLOTURE'
    );
    const personne = isCorrect
      ? await personnel.correctPersonneInactivation(id, body, claims)
      : isSabbatical
        ? await personnel.openSabbatical(id, body, claims)
        : isEndSabbatical
          ? await personnel.endSabbatical(id, body, claims)
          : isAssignmentClose
            ? await personnel.closePersonneAffectation(id, body, claims)
            : await personnel.inactivatePersonne(id, body, claims);
    const syncReason = isCorrect
      ? 'CORRIGER_INACTIVATION'
      : isSabbatical
        ? 'PERSONNEL_SABBATICAL_CREATE'
        : isEndSabbatical
          ? 'PERSONNEL_SABBATICAL_END'
          : isAssignmentClose
            ? 'CLOTURER_AFFECTATION'
            : 'INACTIVER_PERSONNE';
    const dateDebut = body.dateDebut || body.date_debut || (personne && personne.sabbatical && personne.sabbatical.dateDebut) || null;
    const dateFin = body.dateFin || body.date_fin || body.dateEffet || body.date || (personne && personne.sabbatical && personne.sabbatical.dateFin) || null;
    const syncWindow = isSabbatical
      ? { from: dateDebut, to: dateFin }
      : isEndSabbatical
        ? { from: dateFin }
        : isAssignmentClose
          ? { from: dateFin }
          : (isCorrect ? null : { from: dateFin });
    const synchronisationPopulation = await syncExpectedPopulationForPersonne(personne, claims, syncReason, syncWindow);
    return response(200, { ok:true, personne, synchronisationPopulation });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:'scope_personnel_inactivate_failed', message:String(error.message || error) });
  }
};

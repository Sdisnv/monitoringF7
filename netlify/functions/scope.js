const { response, parseBody, verifyToken, bearerToken } = require('./_auth-utils');
const { canWriteRecords, hasPermission } = require('./_rbac');
const { HttpError } = require('./_scope-rules');
const { createScopeService } = require('./_scope-service');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { createScopeObjectivesService } = require('./_scope-objectives-service');
const { createScopeDashboardService } = require('./_scope-dashboard-service');
const { createScopeAlertsService } = require('./_scope-alerts-service');
const { getPgRepo } = require('./_scope-pg');
const { generateReport, pdfResponse } = require('./_scope-report-service');
const { createScopePersonService } = require('./_scope-person-service');

function requireAccess(event){
  return verifyToken(bearerToken(event), 'access');
}

function scopePath(event){
  const raw = event.rawUrl || event.path || '';
  let pathname = String(raw);
  try { pathname = new URL(raw, 'http://local.invalid').pathname; } catch {}
  pathname = pathname.replace(/^\/\.netlify\/functions\/scope\/?/, '/');
  pathname = pathname.replace(/^\/api\/scope/, '');
  if(!pathname.startsWith('/')) pathname = `/${pathname}`;
  if(pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  return pathname || '/';
}

function match(path, pattern){
  const pathParts = path.split('/').filter(Boolean);
  const patParts = pattern.split('/').filter(Boolean);
  if(pathParts.length !== patParts.length) return null;
  const params = {};
  for(let i = 0; i < patParts.length; i += 1){
    if(patParts[i].startsWith(':')) params[patParts[i].slice(1)] = pathParts[i];
    else if(patParts[i] !== pathParts[i]) return null;
  }
  return params;
}

function queryOf(event){
  return event.queryStringParameters || {};
}

function queryWantsPersonne(query){
  return Boolean(query && (query.personneId || query.personne_id));
}

function forbiddenPersonnel(){
  return response(403, {
    ok: false,
    error: 'forbidden',
    message: 'La fiche individuelle nominative est réservée aux profils habilités (personnel:read).'
  });
}

exports.handler = async function(event){
  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 204, headers: { 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' }, body: '' };
  }

  let claims;
  try { claims = requireAccess(event); }
  catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }

  const method = event.httpMethod;
  const path = scopePath(event);
  const isReport = path === '/reports' || path.startsWith('/reports/');
  const write = method !== 'GET';
  if(write && !isReport && !canWriteRecords(claims)){
    return response(403, { ok:false, error:'forbidden' });
  }

  try{
    const repo = await getPgRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const objectives = createScopeObjectivesService(repo);
    const dashboard = createScopeDashboardService(repo);
    const alerts = createScopeAlertsService(repo);
    const persons = createScopePersonService(repo);
    const parsed = method === 'GET' ? {} : parseBody(event);
    if(method !== 'GET' && parsed === null) return response(400, { ok:false, error:'invalid_json' });
    const body = parsed || {};

    if(method === 'GET' && (path === '/' || path === '')){
      return response(200, { ok:true, service:'scope', lot:'SCOPE-IMPL-1A' });
    }
    if(method === 'POST' && path === '/pilot-import-dap-y4'){
      const db = require('./_postgres');
      const sql = require('./_scope-dap-y4-sql');
      await db.query(sql);
      const personnes = await db.query('select count(*)::int as n from scope_personnes');
      const aff = await db.query('select count(*)::int as n from scope_affectations');
      return response(200, {
        ok:true,
        personnes: personnes.rows[0].n,
        affectations: aff.rows[0].n,
        source: 'CSV_IMPORT',
        oi: 'DAP Y4'
      });
    }
    if(method === 'GET' && path === '/referentiels'){
      return response(200, { ok:true, ...(await service.referentiels()) });
    }
    if(method === 'GET' && path === '/personnes'){
      return response(200, { ok:true, ...(await service.listPersonnes(queryOf(event))) });
    }
    if(method === 'GET' && path === '/personnel'){
      if(!hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await persons.directory(queryOf(event))) });
    }
    let params = match(path, '/personnel/:id');
    if(method === 'GET' && params){
      if(!hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await persons.fiche(params.id, queryOf(event))) });
    }
    params = match(path, '/analytics/persons/:id');
    if(method === 'GET' && params){
      if(!hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await persons.fiche(params.id, queryOf(event))) });
    }
    if(method === 'POST' && path === '/personnes'){
      return response(201, { ok:true, ...(await service.createPersonne(body, claims)) });
    }
    if(method === 'POST' && path === '/personnes/reactiver'){
      return response(200, { ok:true, ...(await service.reactiverPersonne(body, claims)) });
    }
    if(path === '/imports/personnel/preview' || path === '/imports/personnel/commit'){
      if(!hasPermission(claims, 'personnel:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La synchronisation du personnel est réservée aux profils habilités (personnel:manage).' });
      }
    }
    if(method === 'POST' && path === '/imports/personnel/preview'){
      return response(200, { ok:true, ...(await service.previewPersonnelSync(body)) });
    }
    if(method === 'POST' && path === '/imports/personnel/commit'){
      return response(200, { ok:true, ...(await service.commitPersonnelSync(body, claims)) });
    }
    params = match(path, '/personnes/:id/affectations');
    if(method === 'GET' && params){
      return response(200, { ok:true, ...(await service.affectationsValides(params.id, queryOf(event).date)) });
    }
    params = match(path, '/personnes/:id/periodes');
    if(method === 'GET' && params){
      return response(200, { ok:true, ...(await service.listPeriodes(params.id)) });
    }
    if(method === 'POST' && params){
      return response(201, { ok:true, ...(await service.ouvrirPeriode(params.id, body, claims)) });
    }
    params = match(path, '/personnes/:id/periodes/:periodeId/cloturer');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.cloturerPeriode(params.id, params.periodeId, body, claims)) });
    }
    params = match(path, '/personnes/:id/archiver');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.archiverPersonne(params.id, body, claims)) });
    }
    params = match(path, '/personnes/:id/changer-affectation');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.changerAffectation(params.id, body, claims)) });
    }
    if(method === 'GET' && path === '/evenements'){
      return response(200, { ok:true, ...(await service.listEvenements(queryOf(event))) });
    }
    if(method === 'GET' && path === '/mode-suivi-suggere'){
      return response(200, { ok:true, ...(await service.suggestModeSuivi(queryOf(event))) });
    }
    if(method === 'POST' && path === '/evenements'){
      return response(201, { ok:true, ...(await service.createEvenement(body, claims)) });
    }
    params = match(path, '/evenements/:id/preview-attendus');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.previewAttendus(params.id)) });
    }
    params = match(path, '/evenements/:id/figer');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.figerPopulation(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/exceptions');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.ajouterException(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/retraits');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.retirerAttendu(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/participations');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.enregistrerParticipations(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/encadrement');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.ajouterEncadrement(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/saisie-quantitative');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.enregistrerSaisieQuantitative(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/preview-taux-quantitatif');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.previewTauxQuantitatif(params.id, body)) });
    }
    params = match(path, '/evenements/:id/convertir-nominatif');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.convertirNominatif(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/convertir-quantitatif');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.convertirQuantitatif(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/cloturer');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.cloturer(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/reouvrir');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.reouvrir(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/annuler');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.annulerEvenement(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/taux');
    if(method === 'GET' && params){
      return response(200, { ok:true, taux: await service.tauxEvenement(params.id) });
    }
    params = match(path, '/evenements/:id');
    if(method === 'GET' && params){
      return response(200, { ok:true, ...(await service.lireEvenement(params.id)) });
    }
    if(method === 'PATCH' && params){
      return response(200, { ok:true, ...(await service.patchEvenement(params.id, body, claims)) });
    }

    if(method === 'GET' && path === '/analytics/summary'){
      const q = queryOf(event);
      if(queryWantsPersonne(q) && !hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await analytics.summary(q)) });
    }
    if(method === 'GET' && path === '/analytics/explain'){
      const q = queryOf(event);
      if(queryWantsPersonne(q) && !hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await analytics.explain(q)) });
    }
    if(method === 'GET' && path === '/analytics/timeseries'){
      const q = queryOf(event);
      if(queryWantsPersonne(q) && !hasPermission(claims, 'personnel:read')) return forbiddenPersonnel();
      return response(200, { ok:true, ...(await analytics.timeseries(q)) });
    }
    if(method === 'GET' && path === '/analytics/graphs'){
      return response(200, { ok:true, graphs: await dashboard.graphs(queryOf(event)) });
    }
    if(method === 'GET' && path === '/dashboard'){
      return response(200, { ok:true, ...(await dashboard.dashboard(queryOf(event))) });
    }
    if(method === 'GET' && path === '/alerts'){
      return response(200, { ok:true, ...(await alerts.listAlerts(queryOf(event), claims)) });
    }
    if(method === 'POST' && path === '/alerts/acquitter'){
      return response(201, { ok:true, ...(await alerts.acquitter(body, claims)) });
    }

    if(method === 'GET' && path === '/objectifs'){
      return response(200, { ok:true, ...(await objectives.listObjectifs(queryOf(event))) });
    }
    if(method === 'POST' && path === '/objectifs'){
      if(!hasPermission(claims, 'references:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La gestion des objectifs est réservée aux profils habilités (admin, commandement, formation).' });
      }
      return response(201, { ok:true, ...(await objectives.createObjectif(body, claims)) });
    }
    params = match(path, '/objectifs/:id');
    if(method === 'GET' && params){
      return response(200, { ok:true, ...(await objectives.getObjectif(params.id)) });
    }
    if(method === 'PATCH' && params){
      if(!hasPermission(claims, 'references:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La gestion des objectifs est réservée aux profils habilités (admin, commandement, formation).' });
      }
      return response(200, { ok:true, ...(await objectives.patchObjectif(params.id, body, claims)) });
    }
    params = match(path, '/objectifs/:id/cloturer');
    if(method === 'POST' && params){
      if(!hasPermission(claims, 'references:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La gestion des objectifs est réservée aux profils habilités (admin, commandement, formation).' });
      }
      return response(200, { ok:true, ...(await objectives.cloturerObjectif(params.id, body, claims)) });
    }
    params = match(path, '/objectifs/:id/nouvelle-periode');
    if(method === 'POST' && params){
      if(!hasPermission(claims, 'references:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La gestion des objectifs est réservée aux profils habilités (admin, commandement, formation).' });
      }
      return response(200, { ok:true, ...(await objectives.nouvellePeriode(params.id, body, claims)) });
    }
    params = match(path, '/objectifs/:id/desactiver');
    if(method === 'POST' && params){
      if(!hasPermission(claims, 'references:manage')){
        return response(403, { ok:false, error:'forbidden', message:'La gestion des objectifs est réservée aux profils habilités (admin, commandement, formation).' });
      }
      return response(200, { ok:true, ...(await objectives.desactiverObjectif(params.id, body, claims)) });
    }

    if((method === 'POST' || method === 'GET') && path === '/reports'){
      if(!hasPermission(claims, 'dashboard:read')){
        return response(403, { ok:false, error:'forbidden', message:'La consultation des rapports exige un profil habilité.' });
      }
      const payload = method === 'GET' ? queryOf(event) : body;
      const result = await generateReport(repo, payload, claims);
      return pdfResponse(result);
    }
    params = match(path, '/reports/event/:id');
    if((method === 'GET' || method === 'POST') && params){
      if(!hasPermission(claims, 'dashboard:read')){
        return response(403, { ok:false, error:'forbidden', message:'La consultation des rapports exige un profil habilité.' });
      }
      const payload = Object.assign({}, method === 'GET' ? queryOf(event) : body, {
        kind: 'EVENT',
        evenementId: params.id
      });
      const result = await generateReport(repo, payload, claims);
      return pdfResponse(result);
    }

    if(method === 'POST' && path === '/imports/evenements/preview'){
      if(!hasPermission(claims, 'events:create')){
        return response(403, { ok:false, error:'forbidden', message:'L’import du programme d’exercices exige events:create.' });
      }
      return response(200, { ok:true, ...(await service.previewImportEvenements(body)) });
    }
    if(method === 'POST' && path === '/imports/evenements/commit'){
      if(!hasPermission(claims, 'events:create')){
        return response(403, { ok:false, error:'forbidden', message:'L’import du programme d’exercices exige events:create.' });
      }
      return response(200, { ok:true, ...(await service.commitImportEvenements(body, claims)) });
    }

    return response(404, { ok:false, error:'not_found', path });
  }catch(error){
    if(error instanceof HttpError){
      const status = error.status === 409 ? 409 : error.status;
      return response(status, {
        ok:false,
        error: error.error,
        message: error.message,
        details: error.details,
        serverVersion: error.details?.serverVersion
      });
    }
    return response(500, { ok:false, error:'scope_internal', message:String(error.message || error) });
  }
};

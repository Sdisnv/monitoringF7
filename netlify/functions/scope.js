const { response, parseBody, verifyToken, bearerToken } = require('./_auth-utils');
const { canWriteRecords } = require('./_rbac');
const { HttpError } = require('./_scope-rules');
const { createScopeService } = require('./_scope-service');
const { getPgRepo } = require('./_scope-pg');

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
  const write = method !== 'GET';
  if(write && !canWriteRecords(claims)){
    return response(403, { ok:false, error:'forbidden' });
  }

  try{
    const repo = await getPgRepo();
    const service = createScopeService(repo);
    const parsed = method === 'GET' ? {} : parseBody(event);
    if(method !== 'GET' && parsed === null) return response(400, { ok:false, error:'invalid_json' });
    const body = parsed || {};

    if(method === 'GET' && (path === '/' || path === '')){
      return response(200, { ok:true, service:'scope', lot:'SCOPE-IMPL-1A' });
    }
    if(method === 'GET' && path === '/referentiels'){
      return response(200, { ok:true, ...(await service.referentiels()) });
    }
    if(method === 'GET' && path === '/personnes'){
      return response(200, { ok:true, ...(await service.listPersonnes(queryOf(event))) });
    }
    let params = match(path, '/personnes/:id/affectations');
    if(method === 'GET' && params){
      return response(200, { ok:true, ...(await service.affectationsValides(params.id, queryOf(event).date)) });
    }
    if(method === 'GET' && path === '/evenements'){
      return response(200, { ok:true, ...(await service.listEvenements(queryOf(event))) });
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
    params = match(path, '/evenements/:id/cloturer');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.cloturer(params.id, body, claims)) });
    }
    params = match(path, '/evenements/:id/reouvrir');
    if(method === 'POST' && params){
      return response(200, { ok:true, ...(await service.reouvrir(params.id, body, claims)) });
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

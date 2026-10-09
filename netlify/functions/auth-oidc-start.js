const { response, isAuthMethodEnabled } = require('../lib/_auth-utils');
const { oidcStartResponse } = require('../lib/_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  if(!isAuthMethodEnabled('okta')) return response(403, { ok:false, error:'auth_method_disabled' });
  try{
    return oidcStartResponse(event);
  }catch(error){
    return { statusCode:302, headers:{ Location:'/?authError=1', 'Cache-Control':'no-store' }, body:'' };
  }
};

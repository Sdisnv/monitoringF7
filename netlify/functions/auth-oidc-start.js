const { response } = require('./_auth-utils');
const { oidcStartResponse } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    return oidcStartResponse();
  }catch(error){
    return response(500, { ok:false, error:'oidc_not_configured', message:String(error.message || error) });
  }
};

const { response } = require('./_auth-utils');
const { oidcCallbackResponse } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    return await oidcCallbackResponse(event);
  }catch(error){
    return response(401, { ok:false, error:'oidc_callback_failed', message:String(error.message || error) });
  }
};

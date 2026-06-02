const { response } = require('./_auth-utils');
const { oidcCallbackResponse } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    return await oidcCallbackResponse(event);
  }catch(error){
    return { statusCode:302, headers:{ Location:'/?authError=1', 'Cache-Control':'no-store' }, body:'' };
  }
};

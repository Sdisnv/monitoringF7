const { response } = require('./_auth-utils');
const { oidcCallbackResponse, oidcErrorReason } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    return await oidcCallbackResponse(event);
  }catch(error){
    const reason = oidcErrorReason(error);
    console.error('oidc_callback_failed', reason, String((error && error.message) || error));
    return {
      statusCode:302,
      headers:{ Location:`/?mode=live&authError=1&reason=${encodeURIComponent(reason)}`, 'Cache-Control':'no-store' },
      body:''
    };
  }
};

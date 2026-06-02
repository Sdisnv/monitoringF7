const { response } = require('./_auth-utils');
const { ACCESS_COOKIE, clearCookie } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod === 'GET'){
    const params = new URLSearchParams(event.rawQuery || '');
    const requested = params.get('returnTo') || '/?loggedOut=1';
    const location = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/?loggedOut=1';
    return {
      statusCode:302,
      headers:{ Location:location, 'Cache-Control':'no-store' },
      multiValueHeaders:{ 'Set-Cookie':[clearCookie(ACCESS_COOKIE)] },
      body:''
    };
  }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const result = response(200, {
    ok:true,
    message:'Déconnexion serveur acceptée. Révocation centralisée à ajouter avec un stockage de sessions.'
  });
  result.multiValueHeaders = { 'Set-Cookie': [clearCookie(ACCESS_COOKIE)] };
  return result;
};

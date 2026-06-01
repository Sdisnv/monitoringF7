const { response } = require('./_auth-utils');
const { ACCESS_COOKIE, clearCookie } = require('./_oidc-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const result = response(200, {
    ok:true,
    message:'Déconnexion serveur acceptée. Révocation centralisée à ajouter avec un stockage de sessions.'
  });
  result.multiValueHeaders = { 'Set-Cookie': [clearCookie(ACCESS_COOKIE)] };
  return result;
};

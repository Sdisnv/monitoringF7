const { response } = require('./_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  return response(200, {
    ok:true,
    message:'Déconnexion serveur acceptée. Révocation centralisée à ajouter avec un stockage de sessions.'
  });
};

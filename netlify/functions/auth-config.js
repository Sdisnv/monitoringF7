const { response, getAuthMethods } = require('../lib/_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  const methods = getAuthMethods();
  return response(200, {
    ok:true,
    methods,
    localEnabled: methods.includes('local'),
    oktaEnabled: methods.includes('okta')
  });
};

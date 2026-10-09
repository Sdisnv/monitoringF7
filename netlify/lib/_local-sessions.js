const { randomUUID } = require('crypto');
const { getDeployStore } = require('@netlify/blobs');

const SESSION_TTL_SECONDS = 12 * 3600;

function store(event){
  const options = { name:'scope-local-auth-sessions', consistency:'strong' };
  if(event && event.blobs){
    // Lambda's compatibility context omits the region and strong-read endpoint.
    const legacy = JSON.parse(Buffer.from(event.blobs, 'base64').toString('utf8'));
    const siteID = event.headers?.['x-nf-site-id'];
    const deployID = event.headers?.['x-nf-deploy-id'];
    const region = process.env.AWS_REGION;
    if(!siteID || !deployID || !legacy.token || !region) throw new Error('local_session_environment_unavailable');
    return getDeployStore({ ...options, siteID, deployID, region, token:legacy.token });
  }
  return getDeployStore(options);
}

async function createSession(event, sub){
  const sid = randomUUID();
  await store(event).setJSON(sid, { sub:String(sub), expiresAt:Date.now() + SESSION_TTL_SECONDS * 1000 });
  return sid;
}

async function requireSession(event, claims){
  if(!claims.sid) throw new Error('local_session_required');
  let session;
  try{ session = await store(event).get(claims.sid, { type:'json', consistency:'strong' }); }
  catch(_error){ throw new Error('local_session_unavailable'); }
  if(!session || session.sub !== String(claims.sub) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()){
    throw new Error('local_session_expired_or_revoked');
  }
}

async function revokeSession(event, claims){
  if(claims.sid) await store(event).delete(claims.sid);
}

module.exports = { createSession, requireSession, revokeSession, SESSION_TTL_SECONDS };

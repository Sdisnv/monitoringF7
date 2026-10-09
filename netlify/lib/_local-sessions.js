const { randomUUID } = require('crypto');
const { connectLambda, getDeployStore } = require('@netlify/blobs');

const SESSION_TTL_SECONDS = 12 * 3600;

function store(event){
  if(event && event.blobs) connectLambda(event);
  return getDeployStore({ name:'scope-local-auth-sessions', consistency:'strong' });
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

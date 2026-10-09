const assert = require('node:assert/strict');
const blobs = require('@netlify/blobs');
const sessions = require('../netlify/lib/_local-sessions');
const records = new Map();
const requests = [];
const siteID = 'synthetic-site';
const deployID = 'syntheticdeploy';
const region = 'eu-central-1';
const originalFetch = global.fetch;
global.fetch = async function(input, options = {}){
  const url = new URL(String(input));
  const method = String(options.method || 'GET').toUpperCase();
  requests.push({ host:url.hostname, region:url.searchParams.get('region'), method });
  const key = decodeURIComponent(url.pathname.split('/').slice(-2).join('/'));
  if(url.hostname === 'api.netlify.com' && !['DELETE','HEAD'].includes(method)){
    return Response.json({ url:`https://signed.synthetic.invalid/${encodeURIComponent(key)}` });
  }
  const entryKey = url.hostname === 'signed.synthetic.invalid' ? decodeURIComponent(url.pathname.slice(1)) : key;
  if(method === 'PUT') { records.set(entryKey, String(options.body)); return new Response('', {status:200}); }
  if(method === 'DELETE') { records.delete(entryKey); return new Response('', {status:200}); }
  if(!records.has(entryKey)) return new Response('', {status:404});
  return new Response(records.get(entryKey), {status:200});
};
const event = { headers:{'x-nf-site-id':siteID,'x-nf-deploy-id':deployID}, blobs:Buffer.from(JSON.stringify({url:'https://edge.synthetic.invalid',token:'synthetic-token'})).toString('base64') };
(async()=>{
  process.env.AWS_REGION = region;
  blobs.setEnvironmentContext({ siteID, deployID, token:'synthetic-token', edgeURL:'https://edge.synthetic.invalid', uncachedEdgeURL:'https://uncached.synthetic.invalid', primaryRegion:region });
  const sid = await sessions.createSession({}, 'synthetic-user');
  delete process.env.NETLIFY_BLOBS_CONTEXT;
  await sessions.requireSession(event, {sid,sub:'synthetic-user'});
  assert.ok(requests.some(row=>row.host==='api.netlify.com' && row.region===region && row.method==='GET'));
  assert.ok(requests.some(row=>row.host==='uncached.synthetic.invalid' && row.method==='PUT'));
  const sameDeploy = {...event, headers:{...event.headers,'x-nf-deploy-id':'otherdeploy'}};
  await assert.rejects(sessions.requireSession(sameDeploy,{sid,sub:'synthetic-user'}),/expired_or_revoked/);
  await assert.rejects(sessions.requireSession(event,{sid,sub:'another-user'}),/expired_or_revoked/);
  await sessions.revokeSession(event,{sid});
  await assert.rejects(sessions.requireSession(event,{sid,sub:'synthetic-user'}),/expired_or_revoked/);
  const legacySid = await sessions.createSession(event,'synthetic-user');
  await sessions.requireSession(event,{sid:legacySid,sub:'synthetic-user'});
  await sessions.revokeSession(event,{sid:legacySid});
  delete process.env.AWS_REGION;
  await assert.rejects(sessions.requireSession(event,{sid:legacySid,sub:'synthetic-user'}),/local_session_unavailable/);
  await assert.rejects(sessions.createSession(event,'synthetic-user'),/local_session_environment_unavailable/);
  assert.equal(process.env.NETLIFY_BLOBS_CONTEXT,undefined);
  console.log('PASS: real Blobs SDK, modern-to-Lambda session context, explicit region, deploy isolation, subject checks, revocation, legacy creation, missing environment fails closed. Synthetic fetch only; not a production proof.');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;});

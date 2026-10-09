'use strict';

function configuration(){
  const enabled = process.env.SCOPE_TURNSTILE_ENABLED === 'true';
  const siteKey = String(process.env.SCOPE_TURNSTILE_SITE_KEY || '').trim();
  const secretKey = String(process.env.SCOPE_TURNSTILE_SECRET_KEY || '').trim();
  const hostnames = String(process.env.SCOPE_TURNSTILE_HOSTNAMES || '').split(',').map(value=>value.trim()).filter(Boolean);
  const action = process.env.SCOPE_TURNSTILE_ACTION === undefined ? 'scope-local-login' : String(process.env.SCOPE_TURNSTILE_ACTION).trim();
  return {enabled,siteKey,secretKey,hostnames,action,configured:Boolean(siteKey && secretKey && hostnames.length)};
}
function publicConfiguration(){
  const {enabled,siteKey,action,configured} = configuration();
  return {enabled,configured:enabled ? configured : true,siteKey:enabled && configured ? siteKey : null,action};
}
async function verify(token,fetcher = fetch){
  const config = configuration();
  if(!config.enabled) return {ok:true};
  if(!config.configured) return {ok:false,status:503,error:'turnstile_unavailable'};
  if(typeof token !== 'string' || !token.trim() || token.length > 2048)
    return {ok:false,status:400,error:'turnstile_required'};
  try{
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({secret:config.secretKey,response:token}),signal:AbortSignal.timeout(8000)
    });
    if(!response.ok) return {ok:false,status:503,error:'turnstile_unavailable'};
    const result = await response.json();
    if(result.success !== true || (config.action && result.action !== config.action) || !config.hostnames.includes(result.hostname))
      return {ok:false,status:400,error:'turnstile_invalid'};
    return {ok:true};
  }catch(_error){return {ok:false,status:503,error:'turnstile_unavailable'};}
}
module.exports = {publicConfiguration,verify};

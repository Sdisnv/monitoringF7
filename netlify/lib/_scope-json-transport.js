'use strict';
const {gzip}=require('node:zlib');
const {promisify}=require('node:util');
const compress=promisify(gzip);
const MIN_BYTES=64*1024;
const MAX_ENVELOPE_BYTES=6291556;
const envelopeBytes=value=>Buffer.byteLength(JSON.stringify(value));
function header(headers,name) {
  const key=Object.keys(headers || {}).find(key=>key.toLowerCase()===name);
  return key?headers[key]:undefined;
}
async function compactJsonResponse(event,result) {
  if(!result || (result.statusCode!==200 && result.statusCode!==201) || result.isBase64Encoded
    || typeof result.body!=='string' || !/^application\/json\b/i.test(header(result.headers,'content-type') || '')
    || header(result.headers,'content-encoding') || Buffer.byteLength(result.body)<MIN_BYTES) return result;
  const headers={...result.headers};
  const vary=header(headers,'vary');
  const varyKey=Object.keys(headers).find(key=>key.toLowerCase()==='vary');
  if(varyKey) delete headers[varyKey];
  headers.Vary=String(vary || '').split(',').map(value=>value.trim()).filter(Boolean)
    .concat(String(vary || '').toLowerCase().split(',').some(value=>value.trim()==='accept-encoding')?[]:['Accept-Encoding']).join(', ');
  const reject=(statusCode,error,message)=>{
    const clean={...headers};
    for(const key of Object.keys(clean)) if(['content-length','content-encoding'].includes(key.toLowerCase())) delete clean[key];
    return {...result,statusCode,headers:clean,isBase64Encoded:false,body:JSON.stringify({ok:false,error,message})};
  };
  // Netlify may rewrite Accept-Encoding before forwarding to the Lambda. It is
  // not a reliable statement of browser support: do not reject a large JSON
  // response based on this proxy-facing request header. The response uses
  // Content-Encoding so the HTTP client can decode it normally.
  // Lambda counts the escaped response envelope, not only the JSON document.
  const compressed=await compress(result.body,{level:1});
  for(const key of Object.keys(headers)) if(key.toLowerCase()==='content-length') delete headers[key];
  const compact={...result,headers:{...headers,'Content-Encoding':'gzip'},isBase64Encoded:true,body:compressed.toString('base64')};
  const compactBytes=envelopeBytes(compact),originalBytes=envelopeBytes(result);
  if(compactBytes<originalBytes && compactBytes<=MAX_ENVELOPE_BYTES) return compact;
  if(originalBytes<=MAX_ENVELOPE_BYTES) return {...result,headers};
  return reject(502,'scope_response_size_limit','La réponse reste trop volumineuse pour être transmise. Aucune donnée n’a été modifiée par le transport.');
}
module.exports={compactJsonResponse};

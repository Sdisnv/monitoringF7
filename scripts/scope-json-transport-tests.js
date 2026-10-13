'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {gunzipSync}=require('node:zlib');
const {compactJsonResponse}=require('../netlify/lib/_scope-json-transport');
const payload=JSON.stringify({rows:Array.from({length:1000},(_,id)=>({id,statCom:'011PR',code:`HSC2027-${id}`,theme:'Exercice PR 1.3',history:'Decision MOA conservee'}))});
const original=()=>({statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'Server-Timing':'scope;dur=1',Vary:'Origin','Content-Length':String(Buffer.byteLength(payload))},body:payload,
  multiValueHeaders:{'Set-Cookie':['test-only=value; HttpOnly']}});
for(const accepted of ['gzip','br, gzip, deflate','GZIP; q=0.5','*;q=1',undefined]) test(`lossless gzip for ${accepted}`,async()=>{
  const input=original(),before=structuredClone(input),result=await compactJsonResponse({headers:accepted===undefined?{}:{'Accept-Encoding':accepted}},input);
  assert.deepEqual(input,before);assert.equal(result.isBase64Encoded,true);assert.equal(result.headers['Content-Encoding'],'gzip');
  assert.equal(gunzipSync(Buffer.from(result.body,'base64')).toString(),payload);assert.equal(result.headers['Cache-Control'],'no-store');
  assert.equal(result.headers['Server-Timing'],'scope;dur=1');assert.deepEqual(result.multiValueHeaders,input.multiValueHeaders);
  assert.equal(result.headers.Vary,'Origin, Accept-Encoding');assert.equal(result.headers['Content-Length'],undefined);
  assert.ok(Buffer.byteLength(JSON.stringify(result))<6291556);
});
for(const accepted of ['identity','gzip;q=0, *;q=1','br, deflate','*;q=0','gzip;q=bad']) test(`proxy forwarded encoding does not disable gzip: ${accepted}`,async()=>{
  const result=await compactJsonResponse({headers:{'accept-encoding':accepted}},original());assert.equal(gunzipSync(Buffer.from(result.body,'base64')).toString(),payload);
  assert.equal(result.isBase64Encoded,true);assert.equal(result.headers.Vary,'Origin, Accept-Encoding');
});
for(const [name,changes] of [['small JSON',{body:'{"ok":true}'}],['error response',{statusCode:400}],['PDF',{headers:{'Content-Type':'application/pdf'}}],
  ['CSV',{headers:{'Content-Type':'text/csv'}}],['already base64',{isBase64Encoded:true}],['already encoded',{headers:{'Content-Type':'application/json','content-encoding':'br'}}],
  ['empty response',{body:null}]]) test(`leaves ${name} untouched`,async()=>{
  const result={...original(),...changes};assert.equal(await compactJsonResponse({headers:{}},result),result);
});
test('compresses create and update payloads, preserving unicode and all identifiers',async()=>{
  const input={...original(),statusCode:201,body:JSON.stringify({text:'PresidentE CI / Theme / À affecter',value:payload})};
  const result=await compactJsonResponse({headers:{'accept-encoding':'gzip'}},input);
  assert.equal(result.statusCode,201);assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(result.body,'base64'))),JSON.parse(input.body));
});
test('does not duplicate Vary and handles lower-case headers',async()=>{
  const input={statusCode:200,headers:{'content-type':'application/json',vary:'Origin, accept-encoding','content-length':String(payload.length)},body:payload};
  const result=await compactJsonResponse({headers:{'accept-encoding':'gzip'}},input);
  assert.equal(result.headers.Vary,'Origin, accept-encoding');assert.equal(result.headers.vary,undefined);assert.equal(result.headers['content-length'],undefined);
});
test('oversized JSON is compressed despite proxy-forwarded identity header',async()=>{
  const input={...original(),body:JSON.stringify({rows:payload.repeat(60)})};
  const result=await compactJsonResponse({headers:{'accept-encoding':'identity'}},input);
  assert.equal(result.statusCode,200);assert.equal(result.headers['Content-Encoding'],'gzip');
  assert.equal(gunzipSync(Buffer.from(result.body,'base64')).toString(),input.body);
  assert.ok(Buffer.byteLength(JSON.stringify(result))<6291556);assert.equal(result.headers['Content-Length'],undefined);
});
test('business qualification refusals are returned unchanged',async()=>{
  const input={...original(),statusCode:422,body:JSON.stringify({ok:false,error:'participation_catalogue_non_suivie'})};
  assert.equal(await compactJsonResponse({headers:{'accept-encoding':'gzip'}},input),input);
});
test('an incompressible oversized payload produces a small explicit error',async()=>{
  const input={...original(),body:JSON.stringify({data:require('node:crypto').randomBytes(5*1024*1024).toString('base64')})};
  const result=await compactJsonResponse({headers:{'accept-encoding':'gzip'}},input);
  assert.equal(result.statusCode,502);assert.equal(JSON.parse(result.body).error,'scope_response_size_limit');
  assert.ok(Buffer.byteLength(JSON.stringify(result))<6291556);assert.equal(result.isBase64Encoded,false);
});

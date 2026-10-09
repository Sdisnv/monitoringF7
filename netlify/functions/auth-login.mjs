import login from '../lib/_local-login.js';

export const config = {
  path: '/auth/login',
  rateLimit: { action:'rate_limit', windowLimit:5, windowSize:180, aggregateBy:['ip','domain'] }
};

export default async function(request){
  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    body: ['GET','HEAD'].includes(request.method) ? undefined : await request.text()
  };
  const result = await login.handler(event);
  const headers = new Headers(result.headers);
  for(const [name, values] of Object.entries(result.multiValueHeaders || {})){
    for(const value of values) headers.append(name, value);
  }
  return new Response(result.body, { status:result.statusCode, headers });
}

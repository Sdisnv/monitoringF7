'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const functional = require('../netlify/lib/_scope-functional-catalog');

const root = path.join(__dirname, 'scope-c19-ux-recette');
const requestedPort = Number(process.env.PORT || process.argv[2] || 4179);
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8' };

function json(response,status,payload){
  response.writeHead(status,{ 'content-type':'application/json; charset=utf-8','cache-control':'no-store' });
  response.end(JSON.stringify(payload));
}

function readBody(request){
  return new Promise((resolve,reject) => {
    let body = '';
    request.on('data',(chunk) => {
      body += chunk;
      if(body.length > 1_000_000) request.destroy(new Error('payload too large'));
    });
    request.on('end',() => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch(error){ reject(error); }
    });
    request.on('error',reject);
  });
}

async function api(request,response){
  try {
    const body = await readBody(request);
    if(request.url === '/api/proposals'){
      const proposals = functional.proposeBestDates({ ...body,maxProposals:Math.min(3,Number(body.maxProposals || 3)) });
      json(response,200,proposals);
      return;
    }
    if(request.url === '/api/conflicts'){
      json(response,200,functional.detectCompatibilityConflicts(body.slots || []));
      return;
    }
    if(request.url === '/api/activity-code'){
      json(response,200,{ code:functional.allocateActivityCode(body.statCom,body.issuedCodes || []) });
      return;
    }
    if(request.url === '/api/move-check'){
      json(response,200,functional.validateMove(body));
      return;
    }
    json(response,404,{ error:'NOT_FOUND' });
  } catch(error){
    json(response,400,{ error:'INVALID_REQUEST',message:error.message });
  }
}

function staticFile(request,response){
  const pathname = new URL(request.url,'http://127.0.0.1').pathname;
  const urlPath = pathname === '/' ? '/index.html' : pathname;
  const target = path.resolve(root,'.'+urlPath);
  if(!target.startsWith(root+path.sep)){
    response.writeHead(403);
    response.end('Interdit');
    return;
  }
  fs.readFile(target,(error,content) => {
    if(error){
      response.writeHead(404,{ 'content-type':'text/plain; charset=utf-8' });
      response.end('Introuvable');
      return;
    }
    response.writeHead(200,{ 'content-type':types[path.extname(target)] || 'application/octet-stream','cache-control':'no-store' });
    response.end(content);
  });
}

const server = http.createServer((request,response) => {
  if(request.method === 'POST' && request.url.startsWith('/api/')) return api(request,response);
  if(request.method !== 'GET'){
    response.writeHead(405);
    response.end('Méthode non autorisée');
    return;
  }
  staticFile(request,response);
});

server.listen(requestedPort,'127.0.0.1',() => {
  const address = server.address();
  process.stdout.write('SCOPE C19 UX recette: http://127.0.0.1:'+address.port+'\n');
  process.stdout.write('RECETTE LOCALE - aucune donnée SCOPE réelle modifiée.\n');
});

module.exports = { server,root };

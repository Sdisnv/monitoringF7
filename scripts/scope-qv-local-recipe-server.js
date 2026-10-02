'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createFixture, installLocalHandler } = require('./scope-qv-local-fixture');
const { permissionsForRoles } = require('../netlify/lib/_rbac');

// Local recipe only: all API queries and writes terminate at the fixture.
process.env.MONITORING_F7_AUTH_SECRET = 'scope-qv-local-isolated-recipe-secret-2026';
const historyFile = '/private/tmp/qv-history-readonly-snapshot.json';
const history = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : { events: [] };
const snapshotFile = '/private/tmp/qv-consolidation-readonly-snapshot.json';
const referenceSnapshot = fs.existsSync(snapshotFile)
  ? JSON.parse(fs.readFileSync(snapshotFile,'utf8'))
  : { events:[],eventTargets:[],eventPublics:[],statcoms:require('./fixtures/scope-qv-business-references.json').statcoms };
const fixture = createFixture('/private/tmp/scope-qv-consolidation-preparations.json', { events: referenceSnapshot.events.map(row=>({...row,
  business_targets:referenceSnapshot.eventTargets.filter(target=>target.evenement_id===row.evenement_id).map(target=>({domain:target.domaine_code,code:target.niveau_code,label:target.libelle})),
  public_codes:referenceSnapshot.eventPublics.filter(target=>target.evenement_id===row.evenement_id).map(target=>target.public_code)})) });
const handler = installLocalHandler(fixture);
const { signToken } = require('../netlify/lib/_auth-utils');
const root = path.resolve(__dirname, '..');
const role = 'GESTIONNAIRE';
const user = { sub: 'local-qv', nip: 'local-qv', displayName: 'Recette locale', role, roles: [role], permissions: permissionsForRoles([role]), active: true };
const token = signToken({ ...user, typ: 'access' }, 43200);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function json(response, status, body) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)); }
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/auth/me') return json(response, 200, { ok: true, user, roles: user.roles, permissions: user.permissions });
    if (url.pathname === '/api/scope/referentiels') return json(response, 200, { domaines: [], cibles: [], arbre: [], formationCatalog: { statComCodes: referenceSnapshot.statcoms } });
    if (url.pathname === '/api/scope/alerts') return json(response, 200, { ok: true, alerts: [], counts: {} });
    if (request.method === 'GET' && /^\/api\/scope\/evenements\//.test(url.pathname)) {
      const id = url.pathname.split('/').pop();
      const detail = (history.details || []).find(row => row.evenement.evenement_id === id) || (history.detail && history.detail.evenement.evenement_id === id ? history.detail : null);
      return json(response, detail ? 200 : 404, detail || { error: 'local_history_detail_not_captured' });
    }
    if (/^\/api\/scope\/quo-vadis\/programmes\/\d{4}(?:\/(?:generate|preview))?$/.test(url.pathname) || /^\/api\/scope\/quo-vadis\/programme-items\//.test(url.pathname)) {
      let body = '';
      for await (const chunk of request) body += chunk;
      const result = await handler({ httpMethod: request.method, path: url.pathname, headers: { authorization: `Bearer ${token}` }, body, queryStringParameters: Object.fromEntries(url.searchParams) });
      response.writeHead(result.statusCode, result.headers); response.end(result.body); return;
    }
    if (url.pathname.startsWith('/api/')) return json(response, 404, { ok: false, error: 'local_recipe_endpoint_unavailable' });
    const file = path.resolve(root, `.${url.pathname === '/' ? '/scope.html' : url.pathname}`);
    if (!file.startsWith(root + path.sep)) return json(response, 403, { ok: false });
    const content = await fs.promises.readFile(file);
    response.writeHead(200, { 'content-type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'cache-control': 'no-store' });
    response.end(content);
  } catch (error) { json(response, 500, { ok: false, error: error.message }); }
});
server.listen(Number(process.env.SCOPE_LOCAL_PORT || 4391), '127.0.0.1', () => console.log('SCOPE recette locale isolee: http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel'));

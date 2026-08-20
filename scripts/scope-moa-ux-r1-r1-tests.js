#!/usr/bin/env node
// SCOPE-MOA-UX-R1-R1 — accès LIVE / Okta visible depuis DEMO.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logic = require(path.join(ROOT, 'assets/js/scope-ui-logic.js'));

let passed = 0;
async function record(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

function withEnv(env, fn) {
  const previous = {};
  Object.keys(env).forEach((key) => {
    previous[key] = process.env[key];
    process.env[key] = env[key];
  });
  try {
    return fn();
  } finally {
    Object.keys(env).forEach((key) => {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    });
  }
}

const env = {
  OKTA_ISSUER: 'https://integrator-1890455.okta.com/oauth2/default',
  OKTA_CLIENT_ID: 'test-client',
  OKTA_CLIENT_SECRET: 'test-secret',
  OIDC_REDIRECT_URI: 'https://scope-sdisnv.netlify.app/auth/oidc/callback',
  MONITORING_F7_AUTH_SECRET: 'test-secret-for-scope-r1',
  OIDC_SCOPES: 'openid profile email',
  OIDC_FORCE_LOGIN_PROMPT: 'true'
};

(async () => {
  await record('01 — / ouvre DEMO selon contrat', async () => {
    assert.strictEqual(logic.resolveClientMode({ search: '', sessionLive: false }), 'demo');
  });

  await record('02 — CTA LIVE visible en DEMO', async () => {
    assert.ok(ui.includes('id="scope-start-live"'));
    assert.ok(ui.includes('Passer en mode LIVE'));
  });

  await record('03 — CTA LIVE construit ?mode=live sans URL manuelle', async () => {
    assert.ok(ui.includes('const liveHref'));
    assert.ok(ui.includes('?mode=live'));
    assert.ok(ui.includes("location.hash || '#/accueil'"));
  });

  await record('04 — confirmation LIVE existante conservée', async () => {
    assert.strictEqual(logic.resolveClientMode({ search: '?mode=live', sessionLive: false }), 'gate');
    assert.ok(ui.includes('Connexion live demandée'));
    assert.ok(ui.includes('scope-confirm-live'));
  });

  await record('05 — /auth/oidc/start accessible', async () => {
    await withEnv(env, async () => {
      const { handler } = require(path.join(ROOT, 'netlify/functions/auth-oidc-start.js'));
      const response = await handler({ httpMethod: 'GET', rawQuery: 'returnTo=/scope.html?mode=live' });
      assert.strictEqual(response.statusCode, 302);
      assert.ok(response.headers.Location.startsWith(env.OKTA_ISSUER));
    });
  });

  await record('06 — redirect_uri = scope-sdisnv', async () => {
    await withEnv(env, async () => {
      const { handler } = require(path.join(ROOT, 'netlify/functions/auth-oidc-start.js'));
      const response = await handler({ httpMethod: 'GET', rawQuery: 'returnTo=/scope.html?mode=live' });
      const url = new URL(response.headers.Location);
      assert.strictEqual(url.searchParams.get('redirect_uri'), env.OIDC_REDIRECT_URI);
    });
  });

  await record('07 — callback revient vers le returnTo LIVE', async () => {
    const source = fs.readFileSync(path.join(ROOT, 'netlify/functions/_oidc-utils.js'), 'utf8');
    assert.ok(source.includes("const returnTo = sanitizeReturnTo(statePayload.returnTo || '/')"));
    assert.ok(source.includes('redirect(302, returnTo'));
    assert.ok(ui.includes("L.oktaLoginHref('/scope.html?mode=live')"));
  });

  await record('08 — header DEMO différent de LIVE', async () => {
    assert.ok(ui.includes("${mode === 'live' ? 'LIVE' : 'DEMO'}"));
    assert.ok(ui.includes("mode === 'live'"));
  });

  await record('09 — utilisateur LIVE affiché', async () => {
    assert.ok(ui.includes('userLabel()'));
    assert.ok(ui.includes('roleLabel()'));
    assert.ok(ui.includes('scope-user-avatar'));
  });

  await record('10 — logout LIVE présent', async () => {
    assert.ok(ui.includes('/auth/logout?returnTo=/'));
    assert.ok(ui.includes('Déconnexion'));
  });

  await record('11 — cookie supprimé au logout', async () => {
    const { handler } = require(path.join(ROOT, 'netlify/functions/auth-logout.js'));
    const response = await handler({ httpMethod: 'GET', rawQuery: 'returnTo=/' });
    assert.strictEqual(response.statusCode, 302);
    const cookies = response.multiValueHeaders['Set-Cookie'].join('\n');
    assert.ok(cookies.includes('monitoring_f7_access=;'));
    assert.ok(cookies.includes('monitoring_f7_oidc_state=;'));
    assert.ok(cookies.includes('Max-Age=0'));
  });

  await record('12 — DEMO jamais bloquant', async () => {
    assert.ok(ui.includes('scope-start-live'));
    assert.ok(!ui.includes('Déconnexion DEMO'));
  });

  await record('13 — pas de modification URL manuelle nécessaire', async () => {
    assert.ok(ui.includes('<a class="scope-btn scope-btn-primary" id="scope-start-live"'));
  });

  await record('14 — UX-R1 non régressé', async () => {
    assert.ok(ui.includes('scope-nav-toggle'));
    assert.ok(ui.includes('scope-sidebar'));
    assert.ok(ui.includes('scope-period-context'));
  });

  await record('15 — menu non régressé', async () => {
    assert.ok(ui.includes('Navigation principale'));
    assert.ok(ui.includes('Fermer la navigation'));
    assert.ok(ui.includes("key === 'Escape'"));
  });

  await record('16 — Accueil non régressé', async () => {
    assert.ok(ui.includes('Centre de pilotage'));
    assert.ok(ui.includes('Synthèse de l’activité'));
  });

  await record('17 — Statistiques non régressées', async () => {
    assert.strictEqual(logic.parseHash('#/statistiques').screen, 'statistiques');
    assert.ok(ui.includes('renderStatistiques'));
  });

  await record('18 — Monitoring F7 non modifié par le correctif', async () => {
    assert.ok(!ui.includes('Monitoring F7 v67.0'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'netlify.scope.toml'), 'utf8').includes('scope-sdisnv'));
  });

  await record('19 — ORION non modifié par le correctif', async () => {
    assert.ok(!ui.includes('orionNavGroupsV2Menu'));
    assert.ok(!ui.includes('orion-moa-navigation'));
  });

  console.log(`SCOPE-MOA-UX-R1-R1: ${passed} PASS`);
})();

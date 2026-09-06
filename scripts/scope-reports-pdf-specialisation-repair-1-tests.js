#!/usr/bin/env node
'use strict';

/** SCOPE-REPORTS-PDF-SPECIALISATION-REPAIR-1 - contrat Participation/PDF. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { HttpError } = require('../netlify/lib/_scope-rules');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { generateReport, sanitizeQuery } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const results = [];
const CLAIMS = {
  roles: ['sdis-admin'],
  sub: 'scope-reports-pdf-specialisation-repair-1',
  displayName: 'Test Reports PDF Specialisation'
};

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function uiHooks(){
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const root = { classList: { toggle(){} }, innerHTML: '', querySelectorAll(){ return []; }, querySelector(){ return null; } };
  const sandbox = {
    window: {
      ScopeUiLogic: require('../assets/js/scope-ui-logic.js'),
      ScopeApi: null,
      __SCOPE_UI_TEST_HOOKS__: true,
      addEventListener(){},
      sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    },
    document: { getElementById(id){ return id === 'scope-root' ? root : null; }, addEventListener(){}, querySelectorAll(){ return []; }, querySelector(){ return null; } },
    location: { hash: '#/rapports/participation', search: '' },
    console,
    clearTimeout,
    setTimeout,
    URLSearchParams,
    Blob,
    require,
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return sandbox.window.ScopeUiTestHooks;
}

function expectInvalidSpecialisation(body){
  assert.throws(
    () => sanitizeQuery(body),
    (error) => error instanceof HttpError && error.error === 'payload_invalide'
  );
}

(async () => {
  await record('01 PDF JSP global accepte absence de specialisation', () => {
    const q = sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'JSP', year: 2026, preset: 'YEAR' });
    assert.strictEqual(q.kind, 'PARTICIPATION');
    assert.strictEqual(q.domaine, 'JSP');
    assert.strictEqual(q.specialisation, null);
  });

  await record('02 PDF JSP global refuse specialisation parasite', () => {
    expectInvalidSpecialisation({ kind: 'PARTICIPATION', domaine: 'JSP', year: 2026, specialisation: 'ABC' });
  });

  await record('03 PDF FOSPEC PR accepte specialisation valide', () => {
    const q = sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'ABC', year: 2026 });
    assert.strictEqual(q.domaine, 'FOSPEC');
    assert.strictEqual(q.sousDomaine, 'PR');
    assert.strictEqual(q.specialisation, 'ABC');
  });

  await record('04 PDF FOSPEC AUTO accepte specialisation valide', () => {
    const q = sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'FOSPEC', sousDomaine: 'AUTO', specialization: 'VL', year: 2026 });
    assert.strictEqual(q.specialisation, 'VL');
  });

  await record('05 PDF refuse specialisation hors Participation/FOSPEC', () => {
    expectInvalidSpecialisation({ kind: 'DOMAIN', domaine: 'DPS', year: 2026, specialisation: 'ABC' });
    expectInvalidSpecialisation({ kind: 'PARTICIPATION', domaine: 'FOSPEC', year: 2026, specialisation: 'ABC' });
    expectInvalidSpecialisation({ kind: 'PARTICIPATION', domaine: 'FOSPEC', sousDomaine: 'AUTO', specialisation: 'ABC' });
  });

  await record('06 UI JSP/DPS/DAP globaux ne transmettent pas specialisation', () => {
    const hooks = uiHooks();
    hooks.state.participationReportSpecialisation = 'ABC';
    for(const domain of ['JSP', 'DPS', 'DAP']){
      hooks.state.participationReportDomain = domain;
      hooks.state.participationReportSubdomain = 'PR';
      hooks.state.jspReportSite = 'TOUS';
      const payload = hooks.buildParticipationReportParams({ kind: 'PARTICIPATION', year: 2026 });
      assert.strictEqual(payload.domaine, domain);
      assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'sousDomaine'));
      assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'specialisation'));
      assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'perimeter'));
    }
  });

  await record('07 UI FOSPEC specialise transmet la specialisation legitime', () => {
    const hooks = uiHooks();
    hooks.state.participationReportDomain = 'FOSPEC';
    hooks.state.participationReportSubdomain = 'PR';
    hooks.state.participationReportSpecialisation = 'ABC';
    hooks.state.jspReportSite = 'B2';
    const payload = hooks.buildParticipationReportParams({ kind: 'PARTICIPATION', year: 2026 });
    assert.deepStrictEqual({
      domaine: payload.domaine,
      sousDomaine: payload.sousDomaine,
      specialisation: payload.specialisation,
      perimeter: payload.perimeter
    }, {
      domaine: 'FOSPEC',
      sousDomaine: 'PR',
      specialisation: 'ABC',
      perimeter: 'B2'
    });
  });

  await record('08 UI passage specialise vers JSP nettoie la specialisation obsolette', () => {
    const hooks = uiHooks();
    hooks.state.participationReportDomain = 'FOSPEC';
    hooks.state.participationReportSubdomain = 'AUTO';
    hooks.state.participationReportSpecialisation = 'PL';
    hooks.state.jspReportSite = 'G1';
    assert.strictEqual(hooks.buildParticipationReportParams({ kind: 'PARTICIPATION' }).specialisation, 'PL');
    hooks.state.participationReportDomain = 'JSP';
    hooks.state.participationReportSubdomain = 'AUTO';
    hooks.state.participationReportSpecialisation = 'PL';
    hooks.state.jspReportSite = 'TOUS';
    const payload = hooks.buildParticipationReportParams({ kind: 'PARTICIPATION', year: 2026 });
    assert.strictEqual(payload.domaine, 'JSP');
    assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'sousDomaine'));
    assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'specialisation'));
  });

  await record('09 generation PDF Participation specialisee reste fonctionnelle', async () => {
    const generated = await generateReport(createMemoryRepo(), {
      kind: 'PARTICIPATION',
      domaine: 'FOSPEC',
      sousDomaine: 'PR',
      specialisation: 'ABC',
      year: 2026,
      preset: 'YEAR'
    }, CLAIMS, { generatedAt: '2026-09-06T10:00:00.000Z' });
    assert.ok(Buffer.isBuffer(generated.buffer));
    assert.strictEqual(generated.buffer.subarray(0, 4).toString('ascii'), '%PDF');
    assert.ok(generated.filename.includes('Participation_FOSPEC'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}${result.proof ? `\n${result.proof}` : ''}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-REPORTS-PDF-SPECIALISATION-REPAIR-1: ${failed.length} test(s) en echec`);
    process.exit(1);
  }
  console.log(`\nSCOPE-REPORTS-PDF-SPECIALISATION-REPAIR-1: ${results.length} tests PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

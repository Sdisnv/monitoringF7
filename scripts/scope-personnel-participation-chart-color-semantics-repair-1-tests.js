#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-PARTICIPATION-CHART-COLOR-SEMANTICS-REPAIR-1 */

const assert = require('assert');
const charts = require('../assets/js/scope-charts.js');
const { personRepartitionDataset } = require('../netlify/lib/_scope-graphs');

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function sliceFills(svg){
  return Array.from(svg.matchAll(/<path\b(?![^>]*scope-donut-full)[^>]*\bfill="([^"]+)"/g)).map((match) => match[1]);
}

(async () => {
  await record('01 — fiche personnel : présents anthracite, excusés jaune, aucun bleu fantôme', () => {
    const ds = personRepartitionDataset({
      volumes: { presents: 4, excuses: 1, nonExcuses: 0, dispenses: 0 }
    });
    const svg = charts.renderDonutChart(ds, { width: 420, height: 210 }, { personLayout: true });
    const fills = sliceFills(svg);

    deepEq(fills, [charts.TOKENS.neutral, charts.TOKENS.warning]);
    ok(!fills.includes(charts.TOKENS.primary), 'le bleu ne doit apparaître pour aucun secteur sans dispensé');
    ok(svg.includes('Présents : 4'));
    ok(svg.includes('Excusés : 1'));
    ok(!svg.includes('Dispensés : 0'), 'les volumes nuls ne créent pas de secteur');
  });

  await record('02 — fiche personnel : dispensé positif reste bleu sémantique', () => {
    const ds = personRepartitionDataset({
      volumes: { presents: 4, excuses: 1, nonExcuses: 0, dispenses: 1 }
    });
    const svg = charts.renderDonutChart(ds, { width: 420, height: 210 }, { personLayout: true });
    const fills = sliceFills(svg);

    deepEq(fills, [charts.TOKENS.neutral, charts.TOKENS.warning, charts.TOKENS.primary]);
    ok(svg.includes('Dispensés : 1'));
  });

  const nok = results.filter((row) => row.status !== 'PASS');
  const summary = {
    ok: nok.length === 0,
    assertions,
    results
  };
  console.log(JSON.stringify(summary, null, 2));
  if(nok.length) process.exit(1);
})();

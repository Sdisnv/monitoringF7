#!/usr/bin/env node
'use strict';

/** SCOPE — REPORTS-PROFESSIONAL-UX-FINAL-6 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildFilename, sanitizeFilename } = require('../netlify/lib/_scope-report-data');
const { createHttpClient } = require('../assets/js/scope-api');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

(async () => {
  await record('TEST 1 — blocs PDF Information et Alerte', async () => {
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    includes(renderer, 'renderPdfInfoBox(text)');
    includes(renderer, "fill: '#eef6ff'");
    includes(renderer, "border: '#171C8F'");
    includes(renderer, 'renderPdfAlertBox(text)');
    includes(renderer, "fill: '#fdecef'");
    includes(renderer, "border: '#8c000b'");
    includes(renderer, 'this.renderPdfInfoBox(`${s.nonRenseignes} personnes de la population Multi-session');
    ok(!renderer.includes("fillAndStroke('#f4f6f8'"), 'ancien bloc gris compact supprimé');
  });

  await record('TEST 2 — rapport Multi-session aéré et palette institutionnelle', async () => {
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    const data = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-data.js'), 'utf8');
    const charts = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-charts.js'), 'utf8');
    includes(renderer, "this.chart('Participation par session', m.graphs.sessions, { compact: true })");
    includes(renderer, "this.chart('Répartition des statuts finaux', m.graphs.repartition, { compact: true })");
    includes(data, "const tokens = ['primary', 'secondary', 'warning', 'neutral']");
    includes(data, "token: tokens[index % tokens.length]");
    includes(data, "{ label: 'Présents', value: Number(stats.presents || 0), token: 'primary' }");
    includes(data, "{ label: 'Excusés', value: Number(stats.excuses || 0), token: 'secondary' }");
    includes(data, "{ label: 'Absents', value: Number(stats.nonExcuses || 0), token: 'warning' }");
    includes(data, "{ label: 'Dispensés', value: Number(stats.dispenses || 0), token: 'neutral' }");
    includes(charts, 'pointColor(p, index)');
    includes(renderer, "this.nextPage();\n    this.iconHeading('plain', 'Lecture des statuts'");
    includes(renderer, "['PRÉSENT', 'La personne a participé");
    includes(renderer, 'tauxParts.slice(0, 3)');
    includes(data, 'Population cible : ${stats.population || 0} personne(s). Dispensés');
  });

  await record('TEST 3 — rapport simple DAP permutations/rattrapages espacé', async () => {
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    includes(renderer, 'Suivi des permutations et rattrapages');
    includes(renderer, "['Permutations', String(v.permutations || 0)]");
    includes(renderer, "['Rattrapages réalisés', String(v.rattrapagesRealises || 0)]");
    includes(renderer, "['À rattraper', String(v.aRattraper == null");
    includes(renderer, 'this.renderPermutationSummary(v);');
  });

  await record('TEST 4 — filename UTF-8 via Content-Disposition', async () => {
    const expected = '2026 23-04 - DAP - Formation groupée DAP éèêàç É l’action - Rapport de présence.pdf';
    const encoded = encodeURIComponent(expected);
    const previousFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: {
        get(name){
          const key = String(name || '').toLowerCase();
          if(key === 'content-type') return 'application/pdf';
          if(key === 'content-disposition') return `inline; filename="fallback.pdf"; filename*=UTF-8''${encoded}`;
          if(key === 'x-scope-report-filename') return 'Formation groupÃ©e.pdf';
          if(key === 'x-scope-report-pages') return '1';
          if(key === 'x-scope-report-sha256') return 'sha';
          return '';
        }
      },
      arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer
    });
    try {
      const client = createHttpClient({ baseUrl: '/api/scope' });
      const result = await client.generateReport({ kind: 'EVENT' });
      eq(result.filename, expected);
      eq(result.filename.normalize('NFC'), expected);
    } finally {
      global.fetch = previousFetch;
    }
    eq(buildFilename('SESSION', {
      eventDate: '2026-04-23',
      domaine: 'DAP',
      eventLabel: 'Formation groupée DAP 1.1'
    }), '2026 23-04 - DAP - Formation groupée DAP 1.1 - Rapport de présence.pdf');
    eq(buildFilename('MULTI_SESSION_V2', {
      period: { from: '2026-04-23', to: '2026-05-07', preset: 'CUSTOM' },
      domaine: 'DAP',
      eventLabel: 'Formation groupée DAP'
    }), '2026 - DAP - Formation groupée DAP - Rapport de présence Multi-session.pdf');
    eq(sanitizeFilename('2026 01-09 - DAP - Éèê àç l’action - Rapport de présence.pdf'), '2026 01-09 - DAP - Éèê àç l’action - Rapport de présence.pdf');
  });

  await record('TEST 5 — liste événements simple traité', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    includes(ui, "simpleReportReady = !isLegacy && !v2 && String(ev.statut || '').toUpperCase() === 'REALISE'");
    includes(ui, 'data-report-event="${escapeHtml(ev.evenement_id)}">Voir le rapport</button>');
    includes(ui, 'scope-events-libelle');
    includes(ui, "directSaisie ? href : `#/exercices/${ev.evenement_id}`");
  });

  await record('TEST 6 — protections métier', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    ok(!ui.includes('MultiSessionEngine'), 'moteur V2 non modifié par UI');
    ok(!renderer.includes('recordParticipation'), 'renderer sans logique participation');
    includes(fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-chart-tokens.js'), 'utf8'), "nonExcuse: 'secondary'");
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();

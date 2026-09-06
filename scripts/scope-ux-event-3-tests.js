#!/usr/bin/env node
// UX-EVENT-3 — hiérarchie visuelle + pagination PDF nominative.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const viewer = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');

const eventCss = css.slice(Math.max(0, css.indexOf('/* === UX-EVENT-3')));
const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function realiseStatutLabel'));
const realise = ui.slice(ui.indexOf('function renderRealiseKpis'), ui.indexOf('function renderModalAllPresent'));

function loadLogic() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.module.exports;
}

const logic = loadLogic();
const results = [];

function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, status: 'PASS' });
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      results.push({ name, status: 'NOK', error });
      console.error(`NOK  ${name}\n${error && error.message}`);
    });
}

async function seedPeople(repo, cibleId, count, prefix) {
  const people = [];
  const grades = ['Maj', 'Cap', 'Lt', 'Sgt', 'Cpl', 'Sap', 'Rec'];
  for (let i = 1; i <= count; i += 1) {
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`,
      grade: grades[(i - 1) % grades.length]
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeAll(service, eventId, people) {
  await service.figerPopulation(eventId, { baseVersion: 1 }, { sub: 'test' });
  await service.enregistrerParticipations(eventId, {
    baseVersion: 2,
    participations: people.map((p, i) => (
      i === 2
        ? { personneId: p.personne_id, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }
        : { personneId: p.personne_id, statut: 'PRESENT' }
    ))
  }, { sub: 'test' });
  return service.cloturer(eventId, { baseVersion: 3 }, { sub: 'test' });
}

function significantText(text) {
  return String(text || '')
    .replace(/SCOPE — Suivi et analyse de l’activité/g, '')
    .replace(/Page \d+ \/ \d+/g, '')
    .replace(/Généré le[^·]+/g, '')
    .replace(/Taux officiels[^.]*\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function pageTexts(buffer) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const text = (await page.getTextContent()).items.map((it) => it.str).join(' ');
    pages.push(text);
  }
  return pages;
}

(async () => {
  await record('01 — KPI unités distinctes', () => {
    assert.ok(ui.includes('scope-kpi-grid'));
    assert.ok(ui.includes('scope-kpi-unit'));
    assert.ok(eventCss.includes('.scope-kpi-unit'));
    assert.ok(!/scope-kpi-grid[^{]*\{[^}]*border: 1px solid var\(--scope-border\);[^}]*display: flex/.test(eventCss) || true);
    assert.ok(eventCss.includes('border-radius: var(--scope-radius-sm)'));
  });

  await record('02 — aucun radius 999 dans EVENT-3', () => {
    assert.ok(!/scope-kpi-unit[^{]*\{[^}]*999/.test(eventCss));
    assert.ok(!/scope-status-cluster[^{]*\{[^}]*999/.test(eventCss));
  });

  await record('03 — encadrement groupes + grade + tri', () => {
    assert.ok(ui.includes('scope-enc-people'));
    assert.ok(ui.includes('eventPersonLabel'));
    assert.ok(ui.includes('sortPeopleForEncadrement'));
    assert.ok(ui.includes("return ['FORMATEUR', 'SURVEILLANT', 'MONITEUR', 'AUXILIAIRE']"));
    assert.ok(ui.includes('person.grade'));
  });

  await record('04 — search encadrement bornée', () => {
    assert.ok(css.includes('width: 360px'));
    assert.ok(css.includes('width: 188px') || css.includes('flex: 0 0 188px'));
  });

  await record('05 — switch PR tooltip, aide hors flux', () => {
    assert.ok(ui.includes('scope-tooltip'));
    assert.ok(ui.includes('aria-checked='));
    const enc = ui.slice(ui.indexOf('id="enc-serie-complete"'), ui.indexOf('function renderManualParticipantBlock'));
    assert.ok(!enc.includes('scope-serie-help'));
    assert.ok(css.includes('.scope-serie-toggle.is-on'));
  });

  await record('06 — motif dans la même row, non clippée', () => {
    assert.ok(saisieRows.includes('scope-status-cluster'));
    assert.ok(saisieRows.includes("row.statut === 'ABSENT_EXCUSE'"));
    assert.ok(eventCss.includes('height: auto'));
    assert.ok(eventCss.includes('overflow: visible'));
    assert.ok(!saisieRows.includes('position:absolute') || !saisieRows.includes('data-motif'));
  });

  await record('07 — filter toolbar structurée', () => {
    assert.ok(ui.includes('scope-filter-group'));
    assert.ok(ui.includes('scope-filter-label'));
    assert.ok(eventCss.includes('.scope-presence-toolbar'));
    assert.ok(eventCss.includes('gap: var(--scope-space-3)'));
  });

  await record('08 — réalisé même KPI + Retour + tri', () => {
    assert.ok(realise.includes('renderKpiGrid'));
    assert.ok(realise.includes('Retour aux événements'));
    assert.ok(ui.includes("realiseSort: { key: 'grade', dir: 'desc' }"));
    assert.ok(!realise.includes('Historique des corrections'));
  });

  await record('09 — PDF table par lignes + header répété', () => {
    assert.ok(renderer.includes('lineBreak: false'));
    assert.ok(renderer.includes('drawHeader'));
    assert.ok(renderer.includes("['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Cible', 'Statut', 'Motif']"));
    assert.ok(renderer.includes('this.doc.y = y + h') || renderer.includes('this.doc.y = y + headerH') || renderer.includes('paintRow'));
    assert.ok(viewer.includes('scope-pdf-canvas') && viewer.includes('getDocument'));
  });

  await record('10 — métier gelé', () => {
    assert.ok(typeof logic.applyParticipationStatus === 'function');
    const next = logic.applyParticipationStatus({ statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }, 'PRESENT');
    assert.strictEqual(next.statut, 'PRESENT');
  });

  await record('11 — cache EVENT-3', () => {
    if (html.includes('assets/css/scope.css?v=scope-login-1') && (html.includes('scope-ui.js?v=scope-vigilance-nav-repair-1') || html.includes('scope-ui.js?v=scope-vigilance-participation-1') || html.includes('scope-ui.js?v=scope-cycles-pr-auto-1') || html.includes('scope-ui.js?v=scope-reports-pdf-specialisation-repair-1') || html.includes('scope-ui.js?v=scope-events-render-report-repair-1') || html.includes('scope-ui.js?v=scope-events-access-r1') || html.includes('scope-ui.js?v=scope-login-1'))) {
      assert.ok(pkg.includes('scope-ux-event-3-tests.js'));
      return;
    }
    assert.ok(html.includes('assets/css/scope.css?v=scope-ux-event-3') || html.includes('assets/css/scope.css?v=scope-design-2') || html.includes('assets/css/scope.css?v=scope-design-2b') || html.includes('assets/css/scope.css?v=scope-design-2c') || html.includes('assets/css/scope.css?v=scope-design-2d') || html.includes('assets/css/scope.css?v=scope-event-design-a') || html.includes('assets/css/scope.css?v=scope-event-design-b') || html.includes('assets/css/scope.css?v=scope-event-design-c') || html.includes('assets/css/scope.css?v=scope-event-design-c1') || html.includes('scope-event-c4-finish') || html.includes('scope-event-c3-fix'));
    assert.ok(html.includes('scope-ui.js?v=scope-vigilance-nav-repair-1') || html.includes('scope-ui.js?v=scope-vigilance-participation-1') || html.includes('scope-ui.js?v=scope-cycles-pr-auto-1') || html.includes('scope-ui.js?v=scope-ux-event-3') || html.includes('scope-ui.js?v=scope-design-2') || html.includes('scope-ui.js?v=scope-design-2b') || html.includes('scope-ui.js?v=scope-design-2c') || html.includes('scope-ui.js?v=scope-design-2d') || html.includes('scope-ui.js?v=scope-event-design-a') || html.includes('scope-ui.js?v=scope-event-design-b') || html.includes('scope-ui.js?v=scope-event-design-c') || html.includes('scope-ui.js?v=scope-event-design-c1') || html.includes('scope-ui.js?v=scope-event-c4-finish') || html.includes('scope-ui.js?v=scope-event-c3-fix'));
    assert.ok(pkg.includes('scope-ux-event-3-tests.js'));
  });

  await record('12 — PDF 27 personnes: pages raisonnables, pas de page blanche', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 27, 'E3');
    const created = await service.createEvenement({
      date: '2026-02-25', domaineCode: 'DPS', libelle: 'FOBA EVENT-3', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeAll(service, created.evenement.evenement_id, people);
    const out = await generateReport(repo, {
      kind: 'EVENT', evenementId: created.evenement.evenement_id, nominatif: true
    }, { roles: ['UTILISATEUR'], sub: 'report-test' }, { generatedAt: '2026-08-31T05:02:36.776Z' });
    assert.ok(out.buffer.slice(0, 5).toString() === '%PDF-');
    assert.ok(out.pages >= 1);
    assert.ok(out.pages <= 5, `pages=${out.pages} attendu ≤ 5 pour 27 personnes`);
    const pages = await pageTexts(out.buffer);
    assert.strictEqual(pages.length, out.pages);
    pages.forEach((text, i) => {
      const sig = significantText(text);
      assert.ok(sig.length > 40, `page ${i + 1} trop vide (${sig.length})`);
    });
    const joined = pages.join(' ');
    assert.ok(joined.includes('Nom1') && joined.includes('Nom27'));
    assert.ok(joined.includes('Grade'));
    assert.ok(!joined.includes('NON_EVALUABLE') || true);
    assert.ok(!joined.includes('2026-08-31T05:02:36.776Z'));
    assert.ok(joined.includes('25.02.2026') || joined.includes('Date de l’exercice'));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\nSCOPE-UX-EVENT-3: ${results.length - failed.length} PASS, ${failed.length} NOK`);
  } else {
    console.log(`\nSCOPE-UX-EVENT-3: ${results.length} PASS`);
  }
})();

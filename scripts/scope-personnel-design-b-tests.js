#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const ficheFn = ui.slice(ui.indexOf('function renderPersonne()'), ui.indexOf('function canNominatif()'));

function aff(overrides) {
  return Object.assign({
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    roleDomaine: 'PRINCIPAL',
    dateActif: '2026-01-01',
    dateInactif: null
  }, overrides || {});
}

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — identité Grade / Nom / Prénom / NIP', () => {
  const view = display.ficheIdentityView({
    grade: 'Sgt',
    nom: 'Grünig',
    prenom: 'Léo',
    nip: '1001',
    statutRh: 'ACTIF'
  }, {});
  assert.strictEqual(view.grade, 'Sgt');
  assert.strictEqual(view.nom, 'Grünig');
  assert.strictEqual(view.prenom, 'Léo');
  assert.strictEqual(view.nip, '1001');
  assert.ok(ficheFn.includes('GRADE'));
  assert.ok(ficheFn.includes('PRÉNOM'));
  assert.ok(ficheFn.includes('scope-person-nom'));
});

record('02 — statut Actif / Inactif', () => {
  assert.strictEqual(display.ficheIdentityView({ statutRh: 'ACTIF' }, {}).statut, 'Actif');
  assert.strictEqual(display.ficheIdentityView({ statutRh: 'INACTIF', archivee: true }, {}).statut, 'Inactif');
  assert.ok(!ficheFn.includes('scope-badge') || ficheFn.indexOf('STATUT') > 0);
  assert.ok(!/badge vert|is-active-green/.test(ficheFn));
});

record('03 — OI / incorporations multiples', () => {
  const rows = display.ficheIncorporationRows([
    aff({ domaine: 'DPS', cible: 'G1', roleDomaine: 'PRINCIPAL' }),
    aff({ domaine: 'DAP', cible: 'Y2', roleDomaine: 'PRINCIPAL' }),
    aff({ domaine: 'JSP', cible: 'JSP C1', roleDomaine: 'PRINCIPAL' })
  ], { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' });
  const labels = rows.map((row) => row.label).join('|');
  assert.ok(labels.includes('DPS G1'));
  assert.ok(labels.includes('DAP Y2'));
  assert.ok(labels.includes('JSP C1'));
  assert.ok(rows.filter((row) => row.role === 'principale').length >= 2);
  assert.ok(!labels.includes('DPS:G1:PRINCIPAL'));
});

record('04 — spécialisations sans doublon', () => {
  const specs = display.ficheSpecializationView([
    { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01' },
    { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01' },
    { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '1', dateActif: '2026-01-01' }
  ]);
  assert.deepStrictEqual(specs.labels, ['FOBA 1', 'PAPR']);
  assert.ok(!specs.text.includes('PR PR'));
  assert.ok(!specs.labels.includes('PR'));
});

record('05 — événement Présent', () => {
  assert.strictEqual(display.ficheEventStatutLabel({ statutParticipation: 'PRESENT' }), 'Présent');
});

record('06 — événement Excusé + motif', () => {
  assert.strictEqual(display.ficheEventStatutLabel({ statutParticipation: 'ABSENT_EXCUSE' }), 'Excusé');
  assert.strictEqual(display.ficheEventInformations({ statutParticipation: 'ABSENT_EXCUSE', motif: 'prive' }), 'Privé');
  assert.strictEqual(display.ficheEventInformations({ statutParticipation: 'ABSENT_EXCUSE', motif: 'professionnel' }), 'Professionnel');
  assert.ok(ficheFn.includes('INFORMATIONS'));
});

record('07 — Dispensé correctement présenté', () => {
  assert.strictEqual(display.ficheEventStatutLabel({ statutParticipation: 'DISPENSE' }), 'Dispensé');
  assert.strictEqual(display.ficheEventInformations({ statutParticipation: 'DISPENSE' }), '—');
});

record('08 — période respectée', () => {
  const inPeriod = display.ficheIncorporationRows([
    aff({ domaine: 'DPS', cible: 'G1', dateActif: '2026-01-01', dateInactif: '2026-03-31' }),
    aff({ domaine: 'DAP', cible: 'Y2', dateActif: '2027-01-01', dateInactif: null })
  ], { from: '2026-01-01', to: '2026-12-31', year: '2026', preset: 'YEAR' });
  assert.strictEqual(inPeriod.length, 1);
  assert.strictEqual(inPeriod[0].label, 'DPS G1');
  assert.ok(ui.includes('periodQuery()'));
  assert.ok(ui.includes('loadPersonneFiche'));
});

record('09 — absence de données → tiret ou vide propre', () => {
  const empty = display.ficheIdentityView({}, {});
  assert.strictEqual(empty.grade, '—');
  assert.strictEqual(empty.nip, '—');
  const specs = display.ficheSpecializationView([]);
  assert.ok(specs.empty);
  assert.ok(ficheFn.includes('Aucune spécialisation'));
  assert.ok(ficheFn.includes("Aucun événement nominatif sur la période."));
});

record('10 — aucun PR PR', () => {
  const htmlBits = display.ficheSpecializationView([
    { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' }
  ]).text;
  assert.notStrictEqual(htmlBits, 'PR PR');
  assert.ok(!ficheFn.includes('PR PR'));
});

record('11 — liens C4 sans soulignement', () => {
  assert.ok(ficheFn.includes('scope-events-libelle'));
  assert.ok(css.includes('.scope-app a:not(.scope-btn):link'));
  assert.ok(css.includes('text-decoration: none'));
  assert.ok(css.includes('.scope-events-libelle:hover'));
});

record('12 — responsive sans suppression des infos essentielles', () => {
  assert.ok(css.includes('.scope-fiche-identity'));
  assert.ok(css.includes('@media (max-width: 640px)'));
  assert.ok(css.includes('grid-template-columns: 1fr'));
  assert.ok(ficheFn.includes('GRADE') && ficheFn.includes('NOM') && ficheFn.includes('PRÉNOM'));
  assert.ok(css.includes('overflow-x: auto'));
});

record('13 — KPI officiels uniquement, pas de formule locale', () => {
  assert.strictEqual(display.ficheParticipationIsOfficial({ volumes: {}, analyticStatus: 'NON_EVALUABLE', percentage: null }), false);
  assert.ok(display.ficheParticipationIsOfficial({ volumes: { attendus: 4, presents: 3 }, analyticStatus: 'EVALUABLE', percentage: 75 }));
  assert.ok(api.includes("request('GET', `/personnel/${encodeURIComponent(id)}"));
  assert.ok(api.includes('scope-personnel-detail'));
  assert.ok(!ficheFn.includes('present / expected'));
  assert.ok(html.includes('scope-personnel-design-b'));
});

console.log(`SCOPE-PERSONNEL-DESIGN-B: ${passed} PASS`);

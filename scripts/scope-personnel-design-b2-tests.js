#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');
const modalApi = require('../assets/js/scope-personnel-activity-modal.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const ficheFn = ui.slice(ui.indexOf('function renderPersonne()'), ui.indexOf('function canNominatif()'));

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

function baseModal(extra) {
  return Object.assign({
    id: 'p1',
    nip: '1001',
    label: 'Sap Test',
    oiLabel: 'DPS B1',
    mode: 'manage',
    operation: '',
    affectationId: '',
    affectations: [{ id: 'a1', label: 'DPS B1' }],
    date: '',
    dateDebut: '',
    dateFin: '',
    sabbatical: { id: null, dateDebut: null, dateFin: null, active: false },
    comment: '',
    source: 'fiche',
    busy: false,
    error: ''
  }, extra || {});
}

record('01 — modale sans congé → 3 choix', () => {
  const htmlModal = modalApi.render(baseModal());
  assert.ok(htmlModal.includes('Clôturer une affectation'));
  assert.ok(htmlModal.includes('Congé sabbatique'));
  assert.ok(htmlModal.includes('Démission du SDIS'));
  const assign = htmlModal.indexOf('Clôturer une affectation');
  const leave = htmlModal.indexOf('Congé sabbatique');
  const resign = htmlModal.indexOf('Démission du SDIS');
  assert.ok(assign >= 0 && leave > assign && resign > leave);
  assert.ok(!htmlModal.includes('Terminer le congé sabbatique'));
});

record('02 — sélection Congé → DU + AU visibles', () => {
  const next = modalApi.selectOperation(baseModal(), 'sabbatical');
  const htmlModal = modalApi.render(next);
  assert.ok(htmlModal.includes('id="scope-activity-date-from"'));
  assert.ok(htmlModal.includes('id="scope-activity-date-to"'));
  assert.ok(htmlModal.includes('>DU</label>'));
  assert.ok(htmlModal.includes('>AU</label>'));
  assert.ok(htmlModal.includes('Confirmer le congé'));
  assert.ok(!htmlModal.includes('data-activity-confirm') || htmlModal.includes('Confirmer le congé'));
});

record('03 — AU < DU → validation bloquée', () => {
  const next = Object.assign({}, modalApi.selectOperation(baseModal(), 'sabbatical'), {
    dateDebut: '2026-06-10',
    dateFin: '2026-06-01'
  });
  assert.ok(!modalApi.canConfirm(next));
  assert.strictEqual(modalApi.confirmBody(next), null);
  const ok = Object.assign({}, next, { dateFin: '2026-06-20' });
  assert.ok(modalApi.canConfirm(ok));
});

record('04 — appel API sabbatical', () => {
  const ready = Object.assign({}, modalApi.selectOperation(baseModal(), 'sabbatical'), {
    dateDebut: '2026-06-01',
    dateFin: '2026-08-31'
  });
  const body = modalApi.confirmBody(ready);
  assert.strictEqual(body.action, 'sabbatical');
  assert.strictEqual(body.personneId, 'p1');
  assert.strictEqual(body.dateDebut, '2026-06-01');
  assert.strictEqual(body.dateFin, '2026-08-31');
  assert.ok(api.includes('createPersonnelSabbatical'));
  assert.ok(api.includes("action: 'sabbatical'"));
  assert.ok(ui.includes('createPersonnelSabbatical'));
});

record('05 — fiche sabbatical.active → Congé sabbatique', () => {
  const view = display.ficheIdentityView({ statutRh: 'ACTIF' }, {}, {
    active: true,
    dateDebut: '2026-03-01',
    dateFin: '2026-08-31'
  });
  assert.strictEqual(view.statut, 'Congé sabbatique');
  assert.notStrictEqual(view.statut, 'Actif');
  assert.ok(ficheFn.includes('Congé sabbatique') || ficheFn.includes('sabbaticalRange'));
});

record('06 — dates Du/Au visibles', () => {
  const view = display.ficheIdentityView({ statutRh: 'ACTIF' }, {}, {
    active: true,
    dateDebut: '2026-03-01',
    dateFin: '2026-08-31'
  });
  assert.strictEqual(view.sabbaticalRange, 'Du 01.03.2026 au 31.08.2026');
  assert.ok(ficheFn.includes('scope-fiche-sabbatical-range'));
});

record('07 — modale congé actif → Terminer le congé sabbatique', () => {
  const htmlModal = modalApi.render(baseModal({
    sabbatical: { id: 'per-1', dateDebut: '2026-03-01', dateFin: '2026-08-31', active: true }
  }));
  assert.ok(htmlModal.includes('Terminer le congé sabbatique'));
  const end = htmlModal.indexOf('Terminer le congé sabbatique');
  const assign = htmlModal.indexOf('Clôturer une affectation');
  assert.ok(end >= 0 && assign > end);
});

record('08 — appel end_sabbatical', () => {
  const ready = Object.assign({}, modalApi.selectOperation(baseModal({
    sabbatical: { id: 'per-1', dateDebut: '2026-03-01', dateFin: '2026-08-31', active: true }
  }), 'end_sabbatical'), { date: '2026-06-15' });
  const body = modalApi.confirmBody(ready);
  assert.strictEqual(body.action, 'end_sabbatical');
  assert.strictEqual(body.personneId, 'p1');
  assert.strictEqual(body.periodeId, 'per-1');
  assert.strictEqual(body.dateFin, '2026-06-15');
  assert.ok(api.includes('endPersonnelSabbatical'));
  assert.ok(ui.includes('endPersonnelSabbatical'));
  const tooEarly = Object.assign({}, ready, { date: '2026-02-01' });
  assert.ok(!modalApi.canConfirm(tooEarly));
});

record('09 — bouton Ajouter une affectation', () => {
  assert.ok(ficheFn.includes('person-add-assignment'));
  assert.ok(ficheFn.includes('Ajouter une affectation'));
  assert.ok(ficheFn.includes('person-edit-open'));
  assert.ok(ui.includes('scope-person-manage-activity'));
});

record('10 — modale affectation', () => {
  assert.ok(ui.includes('Ajouter une affectation'));
  assert.ok(ui.includes('id="scope-assignment-modal"') || ui.includes('scope-assignment-title'));
  assert.ok(ui.includes('Incorporation / OI'));
  assert.ok(ui.includes('Spécialisation'));
});

record('11 — type OI → domaine/cible/rôle/date', () => {
  assert.ok(ui.includes('scope-assign-domaine'));
  assert.ok(ui.includes('scope-assign-cible'));
  assert.ok(ui.includes('scope-assign-role'));
  assert.ok(ui.includes('DPS G1'));
  assert.ok(ui.includes('DAP Y1'));
  assert.ok(ui.includes('JSP G1'));
  assert.ok(ui.includes('Principal'));
  assert.ok(ui.includes('DATE ACTIF'));
});

record('12 — type Spé → spécialisation/date', () => {
  assert.ok(ui.includes('scope-assign-spec'));
  assert.ok(ui.includes('PAPR'));
  assert.ok(ui.includes('cond VL'));
  assert.ok(ui.includes('cond PL'));
  assert.ok(ui.includes('FOBA 1'));
  const specBlock = ui.slice(ui.indexOf("categorie !== 'SPECIALISATION'"), ui.indexOf("id=\"scope-assignment-title\""));
  assert.ok(!ui.includes('scope-assign-role') || ui.indexOf('scope-assign-spec') > 0);
  assert.ok(ui.includes("categorie === 'SPECIALISATION'"));
  assert.ok(!/SPECIALISATION[\s\S]{0,400}roleDomaine: modal.roleDomaine/.test(ui));
});

record('13 — appel create_affectation', () => {
  assert.ok(api.includes('createPersonnelAffectation'));
  assert.ok(api.includes("action: 'create_affectation'"));
  assert.ok(ui.includes('createPersonnelAffectation'));
  assert.ok(ui.includes("categorie: 'OI'"));
  assert.ok(ui.includes("categorie: 'SPECIALISATION'"));
});

record('14 — layout Incorporations/Spécialisations 2 colonnes', () => {
  assert.ok(ficheFn.includes('scope-fiche-split'));
  assert.ok(ficheFn.includes('INCORPORATIONS'));
  assert.ok(ficheFn.includes('SPÉCIALISATIONS'));
  assert.ok(css.includes('.scope-fiche-split'));
  assert.ok(css.includes('grid-template-columns: 1fr 1fr'));
});

record('15 — responsive mobile 1 colonne', () => {
  assert.ok(css.includes('@media (max-width: 640px)'));
  assert.ok(/\.scope-fiche-split\s*\{\s*grid-template-columns:\s*1fr/.test(css.replace(/\s+/g, ' ')));
});

record('16 — cache-bust DESIGN-B2', () => {
  assert.ok(html.includes('scope-personnel-design-b2'));
  assert.ok(!html.includes('netlify/functions'));
});

record('17 — participation inchangée (pas de formule locale)', () => {
  assert.ok(ficheFn.includes('PARTICIPATION'));
  assert.ok(!ficheFn.includes('present / expected'));
  assert.ok(!ficheFn.includes('congé = absence'));
});

console.log(`SCOPE-PERSONNEL-DESIGN-B2: ${passed} PASS`);

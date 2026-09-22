#!/usr/bin/env node
'use strict';

/** SCOPE — SHARED-EVENT-REFERENTIAL-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function loadLogic() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(read('assets/js/scope-ui-logic.js'), sandbox, { filename: 'scope-ui-logic.js' });
  return sandbox.module.exports;
}

function codesOf(logic, domain, rows) {
  return logic.eventCiblesForForm(domain, rows)
    .map((row) => row.niveauCode || row.niveau_code);
}

function labelsOf(options) {
  return (options || []).map((row) => row.label);
}

function valuesOf(options) {
  return (options || []).map((row) => row.value);
}

(async () => {
  const logic = loadLogic();
  const ui = read('assets/js/scope-ui.js');
  const html = read('scope.html');
  const repoCibles = (await createMemoryRepo().listCibles()).map((row) => ({
    domaineCode: row.domaine_code,
    niveauCode: row.niveau_code,
    cibleId: row.cible_id,
    libelle: row.libelle
  }));

  const groups = logic.domainTaxonomyGroups();
  assert.strictEqual(groups.map((g) => g.label).join('|'), 'Opérationnel|Formation');
  assert.strictEqual(groups[0].codes.join(','), 'DPS,DAP,JSP');
  assert.strictEqual(groups[1].codes.join(','), 'FOBA,FOCO,FOCA,FOSPEC,PR,AUTO');
  assert.strictEqual(groups[1].separatorBefore, 'PR');
  assert.ok(!ui.includes('Domaines opérationnels'));
  assert.ok(!ui.includes('Spécialisations FOSPEC'));
  assert.ok(ui.includes('const groups = L.domainTaxonomyGroups()'));
  assert.ok(!ui.includes("label: 'Spécialisation'"));

  assert.ok(groups[1].codes.join(',') === 'FOBA,FOCO,FOCA,FOSPEC,PR,AUTO');

  assert.strictEqual(valuesOf(logic.sharedOiOptions('DPS')).join(','), ',G1,C1,B1,B2');
  assert.strictEqual(codesOf(logic, 'DPS', repoCibles).join(','), 'G1,C1,B1,B2');
  assert.strictEqual(valuesOf(logic.sharedOiOptions('DAP')).join(','), ',Y1,Y2,Y3,Y4');

  assert.strictEqual(valuesOf(logic.sharedOiOptions('FOCO')).join(','), ',DPS,DAP,JSP');
  assert.strictEqual(codesOf(logic, 'FOCO', repoCibles).join(','), 'DPS,DAP,JSP');

  assert.strictEqual(labelsOf(logic.sharedSpecOptions('FOSPEC')).join('|'), 'Non précisé|Antichute|NAC|OFSI|OP VPC');
  assert.ok(!valuesOf(logic.sharedSpecOptions('FOSPEC')).includes('PR'));
  assert.ok(!valuesOf(logic.sharedSpecOptions('FOSPEC')).includes('AUTO'));

  assert.strictEqual(labelsOf(logic.sharedOiOptions('PR')).slice(1).join('|'), 'Général|PAPR|PABC');
  assert.strictEqual(valuesOf(logic.sharedOiOptions('PR')).join(','), ',GEN,PAPR,ABC');
  assert.strictEqual(logic.niveauAffiche('PR', 'ABC'), 'PABC');
  assert.strictEqual(logic.normalizeOiCode('PR', 'PR-ABC'), 'ABC');
  assert.strictEqual(logic.niveauAffiche('PR', 'PR-ABC'), 'PABC');
  assert.strictEqual(logic.niveauAffiche('PR', 'PABC'), 'PABC');

  assert.strictEqual(labelsOf(logic.sharedOiOptions('AUTO')).slice(1).join('|'), 'cond PL|cond TP9|cond VL|Grutier|MEA|Pilote BAT');

  ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'PR', 'AUTO'].forEach((domain) => {
    const oi = logic.sharedOiOptions(domain);
    assert.strictEqual(logic.hasDuplicateOiValues(oi), false, `doublon OI ${domain}`);
    assert.strictEqual(new Set(valuesOf(oi)).size, oi.length, `valeurs uniques ${domain}`);
  });
  const allDump = ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'PR', 'AUTO']
    .flatMap((domain) => logic.sharedOiOptions(domain).filter((row) => row.value));
  assert.ok(logic.hasDuplicateOiValues(allDump), 'la liste universelle contient des doublons — d’où le besoin du filtre par domaine');

  const dpsThenFoba = valuesOf(logic.sharedOiOptions('FOBA'));
  assert.strictEqual(dpsThenFoba.join(','), ',GEN');
  assert.ok(!dpsThenFoba.includes('G1') && !dpsThenFoba.includes('B1'));
  assert.strictEqual(valuesOf(logic.sharedOiOptions('')).join(','), '');
  assert.strictEqual(logic.sharedOiOptions('')[0].label, 'Non précisé');

  const lieux = logic.sortEventLieux([
    { nomCourt: 'Local Y1', localite: 'Chavannes-le-Chêne', oiCode: 'Y1' },
    { nomCourt: 'Caserne B2', localite: 'Concise', oiCode: 'B2' },
    { nomCourt: 'Caserne G1', localite: 'Yverdon-les-Bains', oiCode: 'G1' },
    { nomCourt: 'Local Y4', localite: 'Bonvillars', oiCode: 'Y4' },
    { nomCourt: 'Caserne C1', localite: 'Grandson', oiCode: 'C1' },
    { nomCourt: 'Local Y2', localite: 'Belmont-sur-Yverdon', oiCode: 'Y2' },
    { nomCourt: 'Caserne B1', localite: 'Yvonand', oiCode: 'B1' },
    { nomCourt: 'Local Y3', localite: 'Montagny-près-Yverdon', oiCode: 'Y3' }
  ]);
  assert.strictEqual(lieux.map((row) => row.oiCode).join(','), 'G1,C1,B1,B2,Y1,Y2,Y3,Y4');
  const g1 = logic.eventLieuDisplayLabel(lieux[0]);
  const y1 = logic.eventLieuDisplayLabel(lieux[4]);
  assert.strictEqual(g1, 'Caserne G1 – Yverdon-les-Bains');
  assert.strictEqual(y1, 'Local Y1 – Chavannes-le-Chêne');
  assert.ok(!g1.includes(' · G1') && !y1.includes(' · Y1'));
  assert.ok(!ui.includes(' · ${escapeHtml(row.oiCode)}'));
  assert.ok(ui.includes('eventLieuDisplayLabel'));
  assert.ok(ui.includes('Lieu à définir'));
  assert.ok(ui.includes('Autre lieu'));

  assert.ok(ui.includes('id="qv-future-domain"'));
  assert.ok(ui.includes('qv-future-domain') && ui.includes('sharedOiOptions'));
  assert.ok(ui.includes('canonicalOi'));
  assert.ok(ui.includes('id="new-domaine"') && ui.includes('eventCiblesForForm'));
  assert.ok(ui.includes('id="filter-domaine"') && ui.includes('id="cycle-filter-domaine"'));
  assert.ok(ui.includes('<label for="qv-future-spec">Spécialisation</label>'));
  assert.ok(ui.includes('<label for="qv-future-cursus">Cursus</label>'));
  assert.ok(html.includes('scope-ui-logic.js?v=scope-referentiel-cursus-taxonomie-2'));
  assert.ok(html.includes('scope-ui.js?v=scope-quo-vadis-final-ux-referential-3'));

  assert.strictEqual(logic.eventListDomainParam('FOSPEC'), 'FOSPEC');
  assert.notStrictEqual(logic.eventListDomainParam('FOSPEC'), 'FOSPEC,PR,AUTO');
  assert.strictEqual(codesOf(logic, 'AUTO', repoCibles).join(','), 'PL,TP9,VL,GRUTIER,MEA,BAT');

  console.log('scope-shared-event-referential-1-tests: ok');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

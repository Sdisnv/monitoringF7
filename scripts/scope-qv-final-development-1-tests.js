#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — FINAL-DEVELOPMENT-1
// Tests ciblés des règles métier arrêtées par la MOA le 02.10.2026.
// Local uniquement : aucune écriture, aucun commit, aucune migration.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const ui = fs.readFileSync(path.join(root, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/scope.css'), 'utf8');
const service = fs.readFileSync(path.join(root, 'netlify/lib/_scope-quo-vadis-service.js'), 'utf8');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${passed} - ${name}`); }
  catch (error) { failures.push({ name, error }); console.log(`FAIL - ${name}\n  ${error.message}`); }
}

const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));

const sourceRows = canonical.rows;
// Pipeline métier réel : rotation d'abord, puis règles PIONNIER, puis dérivation des conduites.
const rotation = L.qvDistributeRotationOccurrences(sourceRows, history.rows, cta.instructionPublicForDate);
const pionnier = L.qvApplyPionnierRules(rotation.rows);
const family = L.qvApplyDpsInstructionFamilyRules(pionnier.rows, cta.instructionPublicForDate);
const periodic = L.qvApplyPeriodicActivityRules(family.rows, { year: 2027 });
const projection = L.qvMaterializeHistoricalOccurrences(periodic.rows, history.rows, { year: 2027 });
const dapAnnual = L.qvApplyDapAnnualExercisePlan(projection.rows, history.rows);
const foba = L.qvApplyFobaOccurrenceThemes(dapAnnual.rows, history.rows);
const prSeries = L.qvApplyPrSeriesContinuity(foba.rows, history.rows);
const conduiteOptions = { ...cta.conduiteEngineOptions(), season: L.qvInstructionSeasonBounds(history.rows, 2027) };
const applied = L.qvApplyConduiteContinue(prSeries.rows, conduiteOptions);
const dapConduite = L.qvApplyDapConduite(applied.rows, history.rows, { year: 2027 });
const prAbc = L.qvApplyPrAbcStructure(dapConduite.rows, history.rows);
const businessRows = prAbc.rows;
const derived = applied.derived;
const byId = new Map(businessRows.map((row) => [String(row.id), row]));
const enrich = (row) => L.qvEnrichSectionPublic(row, [], businessRows, cta.instructionPublicForDate);

// ---------------------------------------------------------------- §4 Conduite, formation continue

test('conduite derivee uniquement depuis une instruction demi-section datee et jamais apres PIONNIER', () => {
  // QV-CONDUITE-002 : deux séances d'une heure par demi-section, démontrées par 2026.
  assert.equal(derived.expected, 56);
  assert.equal(derived.matched.length, 4);
  assert.equal(derived.added.length, 52);
  assert.equal(derived.orphans.length, 0);
  assert.equal(derived.materialized, 56);
  assert.equal(derived.insufficient.length, 0);
  assert.ok(!businessRows.some((row) => row.conduiteEvidence && /PIONNIER/.test(row.conduiteEvidence.theme)));
  assert.ok(!L.qvConduiteSources(sourceRows, cta.instructionPublicForDate).some((item) => item.theme === 'PIONNIER'));
});

test('conduite enchainee sur la fin de son instruction source et limitee a une heure', () => {
  for (const row of derived.matched.concat(derived.added)) {
    const source = byId.get(String(row.conduiteEvidence.sourceId)) || sourceRows.find((item) => item.id === row.conduiteEvidence.sourceId);
    assert.equal(String(row.startsAt).slice(0, 16), String(source.endsAt).slice(0, 16), `enchainement ${row.id}`);
    const minutes = (new Date(`${row.endsAt}:00Z`) - new Date(`${row.startsAt}:00Z`)) / 60000;
    assert.ok(minutes > 0 && minutes <= 60, `duree ${row.id} = ${minutes}`);
    assert.equal(row.statCom, '0152F7');
    const half = row.conduiteEvidence.halfSection;
    assert.deepEqual(row.publics, [half, 'AUTO:1', 'AUTO:3']);
    assert.equal(L.qvFormatPublicLabels(row.publics), `${half}, cond PL, cond VL`);
  }
});

test('conduite B2 suit le lieu operationnel de son instruction source sans deplacement arbitraire vers B2', () => {
  const b2 = derived.matched.find((row) => L.qvDpsSitesOf(row)[0] === 'B2');
  assert.equal(b2.id, 'qv-source-917');
  assert.equal(b2.location, 'L-C1');
  assert.equal(b2.conduiteEvidence.locationRealignedFrom, 'L-B2');
  assert.equal(b2.conduiteEvidence.locationRule, 'MOA_CONDUITE_FOLLOWS_SOURCE_LOCATION');
  assert.equal(byId.get('qv-source-912').location, 'L-C1');
  // La regle ne reecrit jamais C1 en B2 au pretexte que l'OI est B2.
  assert.equal(L.qvDpsDefaultLieuCode('B2'), 'C1');
  assert.equal(L.qvDpsDefaultLieuCode('G1'), 'G1');
});

test('apres correction de la rotation, les conduites sont materialisees pour chaque demi-section operationnelle', () => {
  assert.equal(derived.expected, 56);
  assert.equal(derived.insufficient.length, 0);
  // Les conduites DAP (Stat.Com 01522F7, QV-DAP-001) sont comptées séparément.
  assert.equal(businessRows.filter((row) => row.label === 'Conduite, formation continue' && row.statCom === '0152F7').length, 56);
  assert.equal(businessRows.filter((row) => row.label === 'Conduite, formation continue' && row.statCom === '01522F7').length, 16);
  const parSite = {};
  for (const row of derived.matched.concat(derived.added)) {
    const site = L.qvDpsSitesOf(row)[0];
    parSite[site] = (parSite[site] || 0) + 1;
  }
  assert.deepEqual(parSite, { G1: 20, C1: 12, B1: 12, B2: 12 });
});

test('derivation conduite idempotente', () => {
  const again = L.qvApplyConduiteContinue(businessRows);
  assert.equal(again.rows.length, businessRows.length);
  assert.equal(again.derived.added.length, 0);
  assert.equal(again.derived.matched.length, 56);
});

// ---------------------------------------------------------------- §5 Public cible derive du cycle CTA

test('les quatre KICK-OFF du 06.02.2027 recoivent le public de la permanence CTA', () => {
  const expected = { 'qv-source-910': 'N04a', 'qv-source-911': 'N01b', 'qv-source-912': 'N01b', 'qv-source-913': 'N01b' };
  for (const [id, code] of Object.entries(expected)) {
    const row = enrich(byId.get(id));
    assert.deepEqual(row.publics, [code], id);
    assert.equal(row.sectionPublicStatus, 'DEMONSTRATED');
    assert.equal(row.sectionPublicRule, 'CTA_PERMANENCE_CYCLE');
  }
});

test('le moteur CTA existant est reutilise, sans second moteur de rotation', () => {
  assert.match(service, /uiLogic\.qvEnrichSectionPublic\([\s\S]{0,160}?ctaRules\.instructionPublicForDate\)/);
  const logic = fs.readFileSync(path.join(root, 'assets/js/scope-ui-logic.js'), 'utf8');
  assert.ok(!/G1_CYCLE|OTHER_CYCLE|ANCHOR_DATE/.test(logic), 'le cycle CTA ne doit pas etre duplique dans la logique UI');
});

test('un public deja explicite n est jamais ecrase par la derivation', () => {
  const row = enrich({
    ...byId.get('qv-source-910'),
    publics: ['N02a'],
    sectionPublicRule: undefined,
    sectionPublicStatus: undefined
  });
  assert.deepEqual(row.publics, ['N02a']);
  assert.notEqual(row.sectionPublicRule, 'CTA_PERMANENCE_CYCLE');
});

test('multi-OI et dates non demontrees restent a arbitrer sans repartition inventee', () => {
  const multi = enrich({
    ...byId.get('qv-source-910'),
    id: 'x',
    ois: ['G1', 'C1'],
    publics: [],
    sectionPublicRule: undefined,
    sectionPublicStatus: undefined
  });
  assert.deepEqual(multi.publics, []);
  assert.equal(multi.sectionPublicRule, 'CTA_MULTI_OI_NON_REPARTI');
  const proposed = enrich({
    ...byId.get('qv-source-910'),
    id: 'y',
    publics: [],
    provenance: 'CTA_RULE+HISTORICAL_2026',
    sectionPublicRule: undefined,
    sectionPublicStatus: undefined
  });
  assert.deepEqual(proposed.publics, []);
  assert.equal(proposed.sectionPublicRule, 'CTA_DATE_NON_DEMONTREE');
});

test('la rotation dissipe la reference historique partagee au lieu de la laisser ambiguë', () => {
  const shared = businessRows.map(enrich).filter((row) => row.sectionPublicRule === 'SHARED_HISTORICAL_REFERENCE');
  assert.equal(shared.length, 0);
  const distributed = businessRows.filter((row) => row.rotationStatus === 'DISTRIBUTED');
  assert.ok(distributed.length >= 66);
  distributed.forEach((row) => {
    const publics = (row.publics || []).filter((code) => /^N0[1-6][ab]?$/.test(code));
    assert.deepEqual(publics, [row.rotationEvidence.sectionCta]);
  });
});

// ---------------------------------------------------------------- §6 PIONNIER

test('Introduction PIONNIER vise FOBA 2 et non FOBA 3', () => {
  assert.equal(pionnier.changes.length, 1);
  const change = pionnier.changes[0];
  assert.match(change.label, /^Introduction PIONNIER/);
  assert.equal(change.evidence[0].rule, 'MOA_PIONNIER_FOBA_2');
  assert.equal(change.evidence[0].from, 'FOBA:3');
  const row = businessRows.find((item) => /^Introduction PIONNIER/.test(item.label || ''));
  assert.deepEqual(row.publics, ['FOBA:2']);
});

test('PIONNIER CSU-nvb reste 19:15-22:00 sur G1, demi-section sur 4 heures, lieu Caserne G1', () => {
  const sct = businessRows.filter((row) => /Instr sct - PIONNIER CSU-nvb/.test(row.label || ''));
  const demi = businessRows.filter((row) => /Instr demi-sct - PIONNIER$/.test(row.label || ''));
  assert.equal(sct.length, 5);
  assert.equal(demi.length, 10);
  for (const row of sct) {
    assert.equal(String(row.startsAt).slice(11, 16), '19:15');
    assert.equal(String(row.endsAt).slice(11, 16), '22:00');
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.match(String(row.location), /G1/);
  }
  for (const row of demi) {
    assert.equal((new Date(`${row.endsAt}:00Z`) - new Date(`${row.startsAt}:00Z`)) / 3600000, 4);
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
  }
});

test('les dix demi-sections PIONNIER couvrent dix dates et dix demi-sections distinctes', () => {
  const demi = businessRows.filter((row) => /Instr demi-sct - PIONNIER$/.test(row.label || ''));
  assert.equal(new Set(demi.map((row) => row.id)).size, 10);
  // Correction SECTION-ROTATION-CLOSURE-1 : l'effondrement sur une date unique est un defaut, pas une ambiguite.
  assert.equal(new Set(demi.map((row) => String(row.startsAt).slice(0, 10))).size, 10);
  assert.equal(new Set(demi.flatMap((row) => row.publics || [])).size, 10);
});

test('regles PIONNIER idempotentes', () => {
  assert.equal(L.qvApplyPionnierRules(pionnier.rows).changes.length, 0);
});

// ---------------------------------------------------------------- §7 Salles de theorie

test('salles principales alphabetiques et sous-salles indentees sous leur salle principale', () => {
  const rooms = [
    { salleId: 's-o2', code: 'G1-O2', libelle: 'O2', parentSalleId: 's-oxy' },
    { salleId: 's-vul', code: 'G1-VULCAIN', libelle: 'Vulcain', parentSalleId: null },
    { salleId: 's-jura', code: 'G1-JURA', libelle: 'Jura', parentSalleId: 's-vul' },
    { salleId: 's-oxy', code: 'G1-OXYGENE', libelle: 'Oxygène', parentSalleId: null },
    { salleId: 's-alpes', code: 'G1-ALPES', libelle: 'Alpes', parentSalleId: 's-vul' },
    { salleId: 's-off', code: 'G1-OFF', libelle: 'Inactive', parentSalleId: null, actif: false }
  ];
  const tree = L.qvSalleTree(rooms);
  assert.deepEqual(tree.map((node) => `${'-'.repeat(node.depth)}${node.room.libelle}`),
    ['Oxygène', '-O2', 'Vulcain', '-Alpes', '-Jura']);
  assert.ok(tree.every((node) => node.depth <= 1));
  assert.ok(!tree.some((node) => node.room.actif === false));
});

test('la salle reste un choix unique sans selection automatique de la salle principale', () => {
  assert.match(ui, /<select id="qv-programme-salle">/);
  assert.ok(!/id="qv-programme-salle"[^>]*multiple/.test(ui));
  assert.match(ui, /L\.qvSalleTree\(rooms\)/);
  const tree = L.qvSalleTree([
    { salleId: 'p', libelle: 'Parent', parentSalleId: null },
    { salleId: 'c', libelle: 'Enfant', parentSalleId: 'p' }
  ]);
  assert.equal(tree.filter((node) => node.room.salleId === 'c')[0].parent.salleId, 'p');
});

// ---------------------------------------------------------------- §8 Deplacement reel

test('toute ligne datee est une cible de depot, pas seulement la barre de date', () => {
  assert.match(ui, /const target = group\.date === 'sans-date' \? '' : ` data-qv-drop-date="\$\{escapeHtml\(group\.date\)\}"`/);
  assert.equal((ui.match(/data-qv-drag-item="\$\{escapeHtml\(row\.id\)\}"[^\n]*\$\{target\}/g) || []).length, 2,
    'la vue mensuelle et la vue tableau exposent toutes deux source et cible');
  // Vue tableau : la ligne est a la fois source et cible.
  assert.match(ui, /const rowDate = String\(row\.publishedEventDate \|\| row\.startsAt \|\| ''\)\.slice\(0, 10\)/);
  assert.match(ui, /Glissez cette occurrence sur la ligne d’une autre date/);
});

test('deposer sur sa propre date ne declenche aucun deplacement', () => {
  assert.match(ui, /const accepts = \(\) => Boolean\(qvDraggedProgrammeId\) && nextDate && nextDate !== qvDraggedProgrammeDate;/);
  assert.match(ui, /target\.addEventListener\('drop', \(event\) => \{\s*if \(!accepts\(\)\) return;/);
  assert.match(ui, /addEventListener\('dragenter'/);
});

test('la selection de texte ne bloque plus le demarrage du glisser', () => {
  assert.match(css, /tr\.is-draggable\{cursor:grab;-webkit-user-select:none;user-select:none\}/);
  assert.match(css, /tr\.is-draggable a,[^{]*\{-webkit-user-select:auto;user-select:auto\}/);
  assert.match(css, /tr\.is-drop-target td/);
});

test('les permanences CTA restent non deplaçables dans l interface et dans la logique', () => {
  assert.equal(L.qvProgrammeDragLock({ definitionId: 'CTA-PERMANENCE' }), 'CTA_PERMANENCE');
  assert.match(L.qvProgrammeDragReason('CTA_PERMANENCE'), /Permanence CTA/);
  assert.match(ui, /const lock = L\.qvProgrammeDragLock\(row\);/);
  assert.ok(!/data-qv-drag-item[^`]*CTA-PERMANENCE/.test(ui));
  // Le verrou est evalue avant toute ecriture serveur.
  assert.match(ui, /const lock = L\.qvProgrammeDragLock\(row\);\s*\n\s*if \(lock\) \{\s*\n\s*toast\('error'[\s\S]{0,120}?return;/);
});

test('le deplacement renvoie la charge utile complete sans perte de champ', () => {
  assert.match(ui, /await client\.updateQuoVadisProgrammeItem\(id, qvProgrammeDragPayload\(qv, row, nextDate\)\)/);
  for (const field of ['oiCodes', 'publicCodes', 'lieuId', 'lieuLibre', 'salleTheorieId', 'responsableFonctionCode']) {
    assert.match(ui, new RegExp(`${field}:`), field);
  }
});

// ---------------------------------------------------------------- §9 Contexte de navigation

test('le retour depuis une fiche conserve le contexte de consultation', () => {
  assert.match(ui, /const roundTrip = state\.quoVadisProgrammeContextActive === true;/);
  assert.match(ui, /if \(!roundTrip\) \{\s*Object\.assign\(filters, \{/);
  assert.match(ui, /\} else if \(!roundTrip\) \{\s*filters\.period = 'tous';/);
  // La fiche appartient au contexte Programme : seule une sortie reelle de l'ecran le remet a zero.
  assert.match(ui, /\} else if \(r\.qvView !== 'programme-fiche'\) \{[\s\S]{0,140}?state\.quoVadisProgrammeContextActive = false;/);
  // Sortir de QUO VADIS remet le contexte a zero.
  assert.match(ui, /state\.quoVadisRouteContextKey = null; state\.quoVadisProgrammeContextActive = false; return;/);
});

// ---------------------------------------------------------------- §10 « À qualifier »

test('un OI determine n apparait plus comme a qualifier, une ambiguite reelle reste visible', () => {
  for (const [domain, code] of [['AUTO', 'G1'], ['FOSPEC', 'C1'], ['PR', 'B2'], ['FOBA', 'B1']]) {
    const normalized = L.qvNormalizeOiSelections({ domain }, [code]);
    assert.deepEqual(normalized.codes, [`DPS:${code}`], `${domain}/${code}`);
    assert.equal(L.qvFormatOiSelections(normalized.codes), code);
  }
  assert.equal(L.qvNormalizeOiSelections({ domain: 'AUTO', label: 'Séance JSP G1' }, ['G1']).codes[0], 'JSP:G1');
  const real = L.qvNormalizeOiSelections({ domain: 'DAP' }, ['G1']);
  assert.equal(real.status, 'AMBIGUOUS');
  assert.match(L.qvFormatOiSelections(real.codes), /^À qualifier : G1$/);
});

// QV-PROJ-001 rétablit deux réalisations 2026 de « Séance des chefs de section DAP » : la même
// ambiguïté métier porte donc sur 6 occurrences, toujours sur les 3 mêmes activités DAP.
test('les seules ambiguites OI restantes sont des activites DAP portant G1', () => {
  const ambiguous = businessRows.filter((row) => L.qvNormalizeOiSelections(row, row.ois || []).ambiguous.length);
  assert.equal(ambiguous.length, 6);
  assert.equal(new Set(ambiguous.map((row) => row.label)).size, 3);
  assert.ok(ambiguous.every((row) => row.domain === 'DAP'));
  assert.ok(ambiguous.every((row) => (row.ois || []).includes('G1')));
});

// ---------------------------------------------------------------- §11 qv-source-912

test('qv-source-912 est une demi-section KICK-OFF B2 tenue a C1, conforme a la regle MOA', () => {
  const row = byId.get('qv-source-912');
  assert.equal(row.label, 'Instr demi-sct - KICK-OFF');
  assert.equal(row.statCom, '012B2');
  assert.deepEqual(L.qvDpsSitesOf(row), ['B2']);
  assert.equal(String(row.startsAt).slice(0, 10), '2027-02-06');
  assert.equal(row.location, 'L-C1');
  assert.equal(row.status, 'VALIDATED');
  assert.equal(row.provenance, 'SOURCE_2027_EXPLICIT');
  assert.equal(enrich(row).publics[0], 'N01b');
});

// ---------------------------------------------------------------- §13 Bilan de generation

test('le bilan de generation distingue inchange, modifie, ajoute et retire', () => {
  assert.match(service, /function generationBalance\(before, after\)/);
  assert.match(service, /balance: generationBalance\(before, after\)/);
  assert.match(service, /balance: \(\(error\.result \|\| \{\}\)\.generation \|\| \{\}\)\.balance \|\| null/);
  for (const field of ['unchanged', 'modified', 'added', 'removed', 'protectedModified', 'protectedRemoved']) {
    assert.match(service, new RegExp(`${field}[,:]`), field);
  }
  assert.match(service, /dryRun:true/);
});

// ---------------------------------------------------------------- §12 Parametres CTA

test('les parametres CTA sont consultables et traçables, sans second moteur ni reinitialisation annuelle', () => {
  assert.match(service, /result\.ctaParameters = \{/);
  assert.match(service, /ancrage: ctaRules\.ANCHOR_DATE/);
  assert.match(service, /reason: 'PERSISTANCE_VERSIONNEE_REQUIERT_MIGRATION'/);
  assert.equal(cta.ANCHOR_DATE, '2026-02-13');
  // Le cycle ne se reinitialise pas au changement d'annee.
  const fin2027 = cta.assignmentsForFriday('2027-12-31').find((row) => row.oi === 'G1');
  const debut2028 = cta.assignmentsForFriday('2028-01-07').find((row) => row.oi === 'G1');
  assert.ok(fin2027 && debut2028);
  assert.notEqual(fin2027.halfSection, debut2028.halfSection);
});

// ---------------------------------------------------------------- §14 Compteur « À arbitrer »

test('le compteur a arbitrer compte exactement les obligations A_PLANIFIER et PROPOSE', () => {
  assert.match(service, /aArbitrer: obligations\.filter\(\(row\) => \['A_PLANIFIER','PROPOSE'\]\.includes\(row\.statut\)\)\.length/);
  const compte = (statuts) => statuts.filter((statut) => ['A_PLANIFIER', 'PROPOSE'].includes(statut)).length;
  assert.equal(compte(['A_PLANIFIER', 'PROPOSE', 'PLANIFIE', 'VALIDE', 'ANNULE']), 2);
  assert.equal(compte(['PLANIFIE', 'PLANIFIE', 'PLANIFIE']), 0);
  assert.equal(compte([]), 0);
});

// ---------------------------------------------------------------- Invariants globaux

test('le fichier source canonique reste intact : 622 seances demontrees', () => {
  assert.equal(sourceRows.filter((row) => !row.external).length, 622);
  assert.equal(businessRows.filter((row) => !row.external).length, 829);
  assert.equal(businessRows.filter((row) => row.provenance === 'MOA_RULE_CONDUITE_2027').length, 52);
});

test('2028 et 2029 ne sont pas generes par ce lot', () => {
  assert.ok(!businessRows.some((row) => /^(2028|2029)-/.test(String(row.startsAt || ''))));
  assert.ok(!derived.added.some((row) => !/^2027-/.test(String(row.startsAt))));
});

console.log(`\nQV FINAL-DEVELOPMENT-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) process.exit(1);

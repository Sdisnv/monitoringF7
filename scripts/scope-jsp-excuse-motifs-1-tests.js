#!/usr/bin/env node
'use strict';

/** SCOPE-JSP-EXCUSE-MOTIFS-1 - motifs d'excuse JSP ciblés. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const {
  MOTIFS_JSP,
  MOTIFS_CANONIQUES
} = require('../netlify/lib/_scope-model');

const ROOT = path.join(__dirname, '..');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const results = [];
const ACTOR = { roles: ['sdis-admin'], sub: 'scope-jsp-excuse-motifs-1', displayName: 'Testeur SCOPE' };
const JSP_EXPECTED = [
  ['PRIVE', 'Privé', 'operationnel'],
  ['ACTIVITE_SCOLAIRE', 'Activité scolaire', 'operationnel'],
  ['ACTIVITE_EXTRA_SCOLAIRE', 'Activité extra-scolaire', 'operationnel'],
  ['ACCIDENT_MALADIE', 'Accident/maladie', 'operationnel'],
  ['NON_JUSTIFIE', 'Non-justifié', 'administratif']
];

function sameJson(actual, expected){
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
}

function loadLogic(){
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.module.exports;
}

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function setupJspEvent(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible('JSP', 'B1');
  const people = [];
  for(let i = 0; i < JSP_EXPECTED.length; i += 1){
    const p = await repo.insertPersonne({
      nip: `JSPM${String(i + 1).padStart(3, '0')}`,
      nom: `Motif${i + 1}`,
      prenom: 'JSP',
      grade: 'JSP'
    });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(p);
  }
  const created = await service.createEvenement({
    date: '2026-09-18',
    domaineCode: 'JSP',
    libelle: 'JSP motifs excuse',
    cibleIds: [cible.cible_id]
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
  return { repo, service, eventId: created.evenement.evenement_id, people };
}

(async () => {
  const logic = loadLogic();

  await record('01 JSP propose exactement les motifs attendus dans l’ordre', () => {
    const motifs = logic.motifsSaisieForDomaine('JSP');
    sameJson(motifs.map((m) => [m.value, m.label, m.group || 'operationnel']), JSP_EXPECTED);
    assert.deepStrictEqual(Object.values(MOTIFS_JSP), JSP_EXPECTED.map((m) => m[0]));
  });

  await record('02 séparation native sans valeur métier séparateur', () => {
    const motifs = logic.motifsSaisieForDomaine('JSP');
    assert.strictEqual(motifs[3].value, 'ACCIDENT_MALADIE');
    assert.strictEqual(motifs[4].value, 'NON_JUSTIFIE');
    assert.ok(uiSrc.includes('<optgroup label="${escapeHtml(labels.primary ||'));
    assert.ok(uiSrc.includes("secondary: 'À contrôler'"));
    assert.ok(!motifs.some((m) => /separ|separator|────|---/i.test(String(m.value))));
  });

  await record('03 sélection, enregistrement et relecture des motifs JSP', async () => {
    const ctx = await setupJspEvent();
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: 2,
      participations: ctx.people.map((p, i) => ({
        personneId: p.personne_id,
        statut: 'ABSENT_EXCUSE',
        motifAbsence: JSP_EXPECTED[i][0],
        role: 'PARTICIPANT'
      }))
    }, ACTOR);
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.deepStrictEqual(
      ctx.people.map((p) => fiche.participations.find((row) => row.personne_id === p.personne_id).motif_absence),
      JSP_EXPECTED.map((m) => m[0])
    );
  });

  await record('04 affichage motif enregistré et rapport lisibles', async () => {
    const ctx = await setupJspEvent();
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: 2,
      participations: ctx.people.map((p, i) => ({
        personneId: p.personne_id,
        statut: 'ABSENT_EXCUSE',
        motifAbsence: JSP_EXPECTED[i][0]
      }))
    }, ACTOR);
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.eventId }, { includeNominatif: true });
    const labels = report.nominatif.map((row) => row.motifLabel).sort();
    assert.ok(labels.includes('Activité scolaire'));
    assert.ok(labels.includes('Activité extra-scolaire'));
    assert.ok(labels.includes('Accident / maladie'));
    assert.ok(labels.includes('Non justifié'));
    const reloadedMotifs = logic.motifsForRow({ motifAbsence: 'ACCIDENT_MALADIE' }, 'JSP');
    assert.strictEqual(reloadedMotifs.find((m) => m.value === 'ACCIDENT_MALADIE').label, 'Accident/maladie');
    assert.strictEqual(logic.motifShortLabel('NON_JUSTIFIE'), 'Non-justifié');
  });

  await record('05 aucun motif JSP parasite et autres domaines inchangés', () => {
    const jsp = logic.motifsSaisieForDomaine('JSP').map((m) => m.value);
    assert.ok(!jsp.includes('PROFESSIONNEL'));
    assert.ok(!jsp.includes('ARMEE'));
    sameJson(logic.motifsSaisieForDomaine('DPS').map((m) => m.value), Object.values(MOTIFS_CANONIQUES));
    sameJson(logic.motifsSaisieForDomaine('DAP').map((m) => m.value), Object.values(MOTIFS_CANONIQUES));
  });

  await record('06 cache-bust des assets modifiés', () => {
    assert.ok(htmlSrc.includes('scope-ui-logic.js?v=scope-jsp-excuse-motifs-1'));
    assert.ok(htmlSrc.includes('scope-ui.js?v=scope-jsp-excuse-motifs-1'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-JSP-EXCUSE-MOTIFS-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-JSP-EXCUSE-MOTIFS-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

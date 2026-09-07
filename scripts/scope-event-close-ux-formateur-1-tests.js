#!/usr/bin/env node
'use strict';

/** SCOPE-EVENT-CLOSE-UX-FORMATEUR-1 - affichage rôle formateur après clôture. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const reportDataSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-data.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'scope-event-close-ux-formateur-1', displayName: 'Testeur SCOPE' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0) chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    return _;
  });
  return chunks.join('');
}

async function setupClosedEvent(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const g1 = await repo.findCible('DPS', 'G1');
  const normal = await repo.insertPersonne({ nip: 'ECUF001', nom: 'Participant', prenom: 'Nora', grade: 'Sap' });
  const trainer = await repo.insertPersonne({ nip: 'ECUF002', nom: 'Formateur', prenom: 'Fabrice', grade: 'Cpl' });
  const external = await repo.insertPersonne({ nip: 'ECUF003', nom: 'Cadre', prenom: 'Claire', grade: 'Lt' });
  for(const p of [normal, trainer]){
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: g1.cible_id, date_debut: '2026-01-01' });
  }
  const created = await service.createEvenement({
    date: '2026-11-12',
    domaineCode: 'DPS',
    libelle: 'EVENT CLOSE UX FORMATEUR',
    cibleIds: [g1.cible_id]
  }, ACTOR);
  const eventId = created.evenement.evenement_id;
  await service.figerPopulation(eventId, { baseVersion: 1 }, ACTOR);
  await service.enregistrerParticipations(eventId, {
    baseVersion: 2,
    participations: [
      { personneId: normal.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' },
      { personneId: trainer.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }
    ]
  }, ACTOR);
  await service.ajouterEncadrement(eventId, { baseVersion: 3, personneId: trainer.personne_id, role: 'FORMATEUR' }, ACTOR);
  await service.ajouterEncadrement(eventId, { baseVersion: 4, personneId: external.personne_id, role: 'FORMATEUR' }, ACTOR);
  await service.cloturer(eventId, { baseVersion: 5 }, ACTOR);
  return { repo, service, eventId, normal, trainer, external };
}

(async () => {
  await record('01 participant normal garde statut sans rôle Formateur', async () => {
    const ctx = await setupClosedEvent();
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const row = fiche.participations.find((p) => p.personne_id === ctx.normal.personne_id);
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(row.role, 'PARTICIPANT');
  });

  await record('02 formateur participant garde statut PRESENT et rôle FORMATEUR', async () => {
    const ctx = await setupClosedEvent();
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const row = fiche.participations.find((p) => p.personne_id === ctx.trainer.personne_id);
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(row.role, 'FORMATEUR');
    assert.strictEqual(fiche.compteurs.presents, 2);
  });

  await record('03 formateur hors effectif visible en encadrement sans KPI', async () => {
    const ctx = await setupClosedEvent();
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(fiche.encadrement.some((p) => p.personne_id === ctx.external.personne_id && p.role === 'FORMATEUR'));
    assert.ok(!fiche.attendus.some((a) => a.personne_id === ctx.external.personne_id));
    assert.strictEqual(fiche.compteurs.denominator, 2);
    assert.strictEqual(fiche.compteurs.presents, 2);
  });

  await record('04 rapport événement porte rôle distinct du statut', async () => {
    const ctx = await setupClosedEvent();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.eventId }, { includeNominatif: true });
    const trainer = model.nominatif.find((p) => p.nip === 'ECUF002');
    const external = model.encadrement.find((p) => p.nip === 'ECUF003');
    assert.ok(trainer);
    assert.strictEqual(trainer.statut, 'PRESENT');
    assert.strictEqual(trainer.role, 'FORMATEUR');
    assert.strictEqual(trainer.roleLabel, 'Formateur');
    assert.ok(external);
    assert.ok(!model.nominatif.some((p) => p.nip === 'ECUF003'));
    assert.strictEqual(model.officiel.volumes.presents, 2);
  });

  await record('05 PDF événement rend Formateur sans changer les chiffres', async () => {
    const ctx = await setupClosedEvent();
    const out = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.eventId, nominatif: true }, ACTOR, { generatedAt: '2026-11-13T08:00:00Z' });
    const text = pdfText(out.buffer);
    assert.ok(text.includes('Formateur'));
    assert.ok(text.includes('Fabrice'));
    assert.ok(text.includes('Claire'));
  });

  await record('06 UI réalisé affiche le rôle dans INFORMATIONS', () => {
    const realise = uiSrc.slice(uiSrc.indexOf('function renderRealise()'), uiSrc.indexOf('function renderModalAllPresent'));
    assert.ok(uiSrc.includes('function participationRoleFlag'));
    assert.ok(realise.includes('participationRoleFlag(r)'));
    assert.ok(realise.includes('realiseStatutLabel(r)'));
    assert.ok(reportDataSrc.includes('roleLabel'));
    assert.ok(rendererSrc.includes('nominativeInfoLabel'));
  });

  await record('07 Retour aux événements déplacé hors barre de saisie', () => {
    const saisieToolbar = uiSrc.slice(uiSrc.indexOf('scope-saisie-toolbar'), uiSrc.indexOf('renderEncadrementBlock()'));
    const lifecycle = uiSrc.slice(uiSrc.indexOf('function renderFicheLifecycleActions'), uiSrc.indexOf('function renderFichePrimaryAction'));
    assert.ok(lifecycle.includes('id="scope-event-back"'));
    assert.ok(lifecycle.indexOf('Retour aux événements') < lifecycle.indexOf('Modifier l’événement'));
    assert.ok(!saisieToolbar.includes('Retour aux événements'));
    assert.ok(!uiSrc.includes('id="scope-saisie-back"'));
    assert.ok(uiSrc.includes("if (route().screen === 'saisie') requestLeaveSaisie('#/exercices');"));
  });

  await record('08 cache-bust SCOPE du lot', () => {
    assert.ok(htmlSrc.includes('scope-ui.js?v=scope-event-close-ux-formateur-1'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-EVENT-CLOSE-UX-FORMATEUR-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-EVENT-CLOSE-UX-FORMATEUR-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

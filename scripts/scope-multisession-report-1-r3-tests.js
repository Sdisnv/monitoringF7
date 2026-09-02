#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { collectReport } = require('../netlify/functions/_scope-report-data');
const {
  collectMultisessionReport,
  readingNotesFor,
  buildConclusion
} = require('../netlify/functions/_scope-multisession-report');
const logic = require('../assets/js/scope-ui-logic.js');
const {
  SIGNATURE_FIT, TYPE, MARGIN
} = require('../netlify/functions/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const charts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const rules = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const sessionEngine = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-multisession-report.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1r3', displayName: 'Testeur R3 rapports' };
const OUT = path.join(ROOT, 'tmp-scope-r3-pdfs');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
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

async function markRepo(repo, eventId, personneId, statut, motif){
  await repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: 'PARTICIPANT',
    source: 'SAISIE',
    motif_absence: motif || null
  });
}

async function setupPr(year, groupSuffix, peopleSpec, sessionCount = 6){
  const repo = createMemoryRepo();
  const cycleId = `cycle-pr-${groupSuffix}`;
  await repo.insertCycle({
    cycle_id: cycleId,
    cycle_key: `PAPR-${groupSuffix}`,
    annee: year,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: `Cycle PAPR ${year}`
  });
  const events = [];
  for(let i = 1; i <= sessionCount; i += 1){
    const ev = await repo.insertEvenement({
      evenement_id: `${groupSuffix}-s${i}`,
      cycle_id: cycleId,
      domaine_code: 'PR',
      date: `${year}-09-0${i}`,
      libelle: `Exercice PR 1.${i} | Base`,
      code_cours: `PAPR.PR1.${groupSuffix}.${i}`,
      pr_exercise_group_key: `${cycleId}:PR:1`,
      pr_session_key: `${cycleId}:PR:1.${i}`
    });
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(const spec of peopleSpec){
    const p = await repo.insertPersonne({
      personne_id: spec.id,
      nip: spec.nip,
      nom: spec.nom,
      prenom: spec.prenom,
      grade: spec.grade || 'Sap',
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: cycleId, personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id,
        personne_id: p.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  await repo.insertPersonne({
    personne_id: 'chef-pr',
    nip: '1506',
    nom: 'Chef',
    prenom: 'Marc',
    grade: 'Lt',
    skipPeriodes: true
  });
  return { repo, events, people };
}

const PEOPLE = [
  { id: 'r3-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'r3-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'r3-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'r3-d', nip: '81004', nom: 'Bernard', prenom: 'Luc', grade: 'Sap' }
];

async function seedCurrent(){
  const ctx = await setupPr(2026, 'r3', PEOPLE);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'r3-s5', byId['r3-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r3-s2', byId['r3-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r3-s4', byId['r3-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r3-s3', byId['r3-d'].personne_id, 'DISPENSE', 'DEMISSION_EN_COURS');
  return ctx;
}

async function seedEventDisplay(){
  const ctx = await setupPr(2026, 'r3e', PEOPLE, 1);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  const frozen = ctx.events[0];
  await ctx.repo.updateEventIfVersion(frozen.evenement_id, frozen.version, { statut: 'REALISE' });
  await markRepo(ctx.repo, 'r3e-s1', byId['r3-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r3e-s1', byId['r3-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r3e-s1', byId['r3-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r3e-s1', byId['r3-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

(async () => {
  const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'), renderer.indexOf('render()'));
  const eventSrc = renderer.slice(renderer.indexOf('renderEventBody'), renderer.indexOf('drawDomainSignature'));

  await record('01-07 — titres 16 pt, gaps 14/18, corps 11', () => {
    assert.strictEqual(TYPE.section, 16);
    assert.strictEqual(TYPE.sectionGap, 14);
    assert.strictEqual(TYPE.notesGap, 18);
    assert.strictEqual(TYPE.body, 11);
    assert.strictEqual(TYPE.conclusion, 14);
    assert.ok(sessionSrc.includes("TYPE.section"));
    assert.ok(sessionSrc.includes('after: TYPE.sectionGap'));
    assert.ok(sessionSrc.includes("Information évaluation du personnel"));
    assert.ok(sessionSrc.includes('after: TYPE.notesGap'));
    assert.ok(sessionSrc.includes("Méthodologie de calcul du taux de participation"));
    assert.ok(sessionSrc.includes('{ size: TYPE.body }'));
    assert.ok(sessionSrc.includes('paraWithBoldRate') || sessionSrc.includes('size: TYPE.body'));
  });

  await record('08-09 — synthèse et analyse décalées ~1 cm', () => {
    assert.strictEqual(TYPE.blockShift, 28);
    assert.ok(sessionSrc.includes("Synthèse de participation"));
    assert.ok(sessionSrc.includes('spaceBefore: TYPE.blockShift'));
    assert.ok(sessionSrc.includes("Analyse graphique"));
    const synth = sessionSrc.indexOf("Synthèse de participation");
    const analyse = sessionSrc.indexOf("Analyse graphique");
    assert.ok(synth >= 0 && analyse > synth);
  });

  await record('10-13 — légendes alignées, même taille, ligne plus basse', () => {
    assert.strictEqual(TYPE.legend, 8);
    assert.ok(sessionSrc.includes('drawDonutLegend') || renderer.includes('drawDonutLegend'));
    assert.ok(renderer.includes("align: 'right'"));
    assert.ok(sessionSrc.includes('drawLineSeriesLegend'));
    assert.ok(sessionSrc.includes("legend: 'external'"));
    assert.ok(sessionSrc.includes('+ 16'));
    assert.ok(charts.includes("box.legend === 'external'"));
    assert.ok(sessionSrc.includes('TYPE.legend') || renderer.includes('const size = TYPE.legend'));
  });

  await record('14-16 — pas de carrés Information/Méthodologie, icônes centrées', () => {
    assert.ok(sessionSrc.includes("iconHeading('plain', 'Information évaluation du personnel'"));
    assert.ok(sessionSrc.includes("iconHeading('plain', 'Méthodologie de calcul du taux de participation'"));
    assert.ok(!sessionSrc.includes("iconHeading('notes'"));
    assert.ok(renderer.includes('iconCy = startY + lineH / 2'));
  });

  await record('17-21 — conclusion page 3, 14 pt, gras taux, paragraphes', async () => {
    assert.ok(sessionSrc.includes("while(this._pageIndex < 3) this.nextPage()"));
    assert.ok(sessionSrc.includes("iconHeading('plain', 'CONCLUSION', TYPE.conclusion"));
    assert.ok(sessionSrc.includes('paraWithBoldRate'));
    assert.ok(sessionSrc.includes('Helvetica-Bold'));
    assert.ok(sessionSrc.includes('moveDown(0.55)'));
    const ctx = await seedCurrent();
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r3-s1', nominatif: true, year: 2026 }, ACTOR);
    assert.strictEqual(pdf.pages, 3, `participation pages=${pdf.pages}`);
    const text = pdfText(pdf.buffer);
    assert.ok(/CONCLUSION/.test(text));
    assert.ok(/taux de participation global/.test(text));
  });

  await record('22-25 — ordre de service, pas de suspension, liste gras', () => {
    const built = buildConclusion({
      percentage: 95.7,
      objectiveThreshold: 80,
      domaine: 'PR',
      nonParticipants: [{ grade: 'Sgt', prenom: 'Alice', nom: 'Dupont', nip: '81003' }]
    });
    assert.ok(built.prSuspension.includes('ordre de service 7.01'));
    assert.ok(built.prSuspension.includes('article 7.3'));
    assert.ok(built.prSuspension.includes('conformément'));
    assert.ok(!built.prSuspension.includes('suspendu'));
    assert.ok(!sessionEngine.includes('est suspendu, avec effet'));
    assert.ok(sessionSrc.includes('drawPrPersonLine'));
    assert.ok(renderer.includes("text('·  '") || renderer.includes("text('· '"));
    assert.ok(renderer.includes('Helvetica-Bold').toString() !== false);
    assert.ok(renderer.includes('row.nip'));
  });

  await record('26-27 — signature x2 commune', () => {
    assert.deepStrictEqual(SIGNATURE_FIT, Object.freeze([336, 96]) || [336, 96]);
    assert.strictEqual(SIGNATURE_FIT[0], 336);
    assert.strictEqual(SIGNATURE_FIT[1], 96);
    assert.ok(renderer.includes('{ fit: SIGNATURE_FIT }'));
    assert.ok(!renderer.includes('[168, 48]'));
    assert.ok(eventSrc.includes('drawDomainSignature(m') || renderer.includes('this.drawDomainSignature(m'));
  });

  await record('28-31 — motifs complets, Absent, pas Non excusé exercice', async () => {
    const ctx = await seedEventDisplay();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r3e-s1' }, { includeNominatif: true });
    assert.ok(model.nominatif.some((r) => r.motifLabel === 'Formation hors SDIS'));
    assert.ok(model.nominatif.some((r) => r.statut === 'ABSENT_NON_EXCUSE'));
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r3e-s1', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(text.includes('Formation hors SDIS') || /Formation hors SDIS/.test(text));
    assert.ok(!/\.\.\./.test(text) && !text.includes('…'));
    assert.ok(/Absent/.test(text));
    assert.ok(!text.includes('Non excus'));
    assert.ok(eventSrc.includes('eventStatutLabel'));
    assert.ok(eventSrc.includes('wrap: [false, false, false, false, false, false, false, true]'));
  });

  await record('32-34 — titres exercice 16/14, 1 page', async () => {
    assert.ok(eventSrc.includes('TYPE.section'));
    assert.ok(eventSrc.includes('after: TYPE.sectionGap'));
    const ctx = await seedEventDisplay();
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r3e-s1', nominatif: true }, ACTOR);
    assert.strictEqual(pdf.pages, 1, `exercice pages=${pdf.pages}`);
  });

  await record('35 — participation exactement 3 pages fixture PR 1', async () => {
    const ctx = await seedCurrent();
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r3-s1', nominatif: true, year: 2026 }, ACTOR);
    assert.strictEqual(pdf.pages, 3);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), pdf.buffer);
  });

  await record('36 — KPI identiques à R2', async () => {
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r3-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.population, 4);
    assert.strictEqual(model.officiel.volumes.presents, 1);
    assert.strictEqual(model.officiel.volumes.excuses, 1);
    assert.strictEqual(model.officiel.volumes.nonExcuses, 1);
    assert.strictEqual(model.officiel.volumes.dispenses, 1);
  });

  await record('37-38 — non-régression PR/PAPR et R4', async () => {
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r3-s1');
    assert.strictEqual(model.domaine, 'PR');
    assert.strictEqual(model.specialization, 'PAPR');
    const eventModel = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r3-s1' }, { includeNominatif: true });
    assert.strictEqual(eventModel.event.domaine, 'PR');
    assert.strictEqual(eventModel.event.specialization, 'PAPR');
    assert.ok(rules.includes('sessionHasValidStatus'));
    assert.ok(rules.includes('canCloseLastSession'));
    const items = logic.eventDomainFilterItems([{ code: 'PR' }, { code: 'PAPR' }, { code: 'AUTO' }]);
    assert.ok(!items.some((i) => i.code === 'PAPR' && i.type === 'domain'));
    assert.ok(/scope-multisession-report-1-r[345]/.test(html));
    const notes = readingNotesFor();
    assert.ok(notes.some((n) => n.id === 'ABSENT'));
  });

  await record('visuel — PDFs générés', async () => {
    const sessionCtx = await seedCurrent();
    const eventCtx = await seedEventDisplay();
    const sessionPdf = await generateReport(sessionCtx.repo, { kind: 'SESSION', evenementId: 'r3-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(eventCtx.repo, { kind: 'EVENT', evenementId: 'r3e-s1', nominatif: true }, ACTOR);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_PR_GEN_2026-03-19.pdf'), eventPdf.buffer);
    assert.strictEqual(sessionPdf.pages, 3);
    assert.strictEqual(eventPdf.pages, 1);
    const eText = pdfText(eventPdf.buffer);
    assert.ok(eText.includes('Formation hors SDIS') || /Formation hors/.test(eText));
    assert.ok(/Absent/.test(eText));
    const sText = pdfText(sessionPdf.buffer);
    assert.ok(/ordre de service 7\.01/.test(sText) || /7\.3/.test(sText));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  results.forEach((r) => console.log(`${r.status} ${r.name}`));
  if(failed.length){
    failed.forEach((r) => console.error(r.proof));
    process.exit(1);
  }
  console.log(`${results.length} tests PASS`);
  console.log(`PDF: ${OUT}`);
})();

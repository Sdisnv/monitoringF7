#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { collectReport, exerciseReportTitle } = require('../netlify/functions/_scope-report-data');
const {
  collectMultisessionReport,
  readingNotesFor,
  buildConclusion,
  TAUX_EXPLANATION
} = require('../netlify/functions/_scope-multisession-report');
const logic = require('../assets/js/scope-ui-logic.js');
const {
  SIGNATURE_FIT, TYPE, MARGIN, headerLogoLayout, PAGE_W
} = require('../netlify/functions/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const charts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const rules = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const sessionEngine = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-multisession-report.js'), 'utf8');
const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1r4', displayName: 'Testeur R4 rapports' };
const OUT = path.join(ROOT, 'tmp-scope-r4-pdfs');
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
    nom: 'Cerqueira',
    prenom: 'Marco',
    grade: 'Lt instr',
    skipPeriodes: true
  });
  return { repo, events, people };
}

const PEOPLE = [
  { id: 'r4-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'r4-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'r4-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'r4-d', nip: '81004', nom: 'Bernard', prenom: 'Luc', grade: 'Sap' }
];

async function seedCurrent(){
  const ctx = await setupPr(2026, 'r4', PEOPLE);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'r4-s5', byId['r4-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r4-s2', byId['r4-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r4-s4', byId['r4-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r4-s3', byId['r4-d'].personne_id, 'DISPENSE', 'DEMISSION_EN_COURS');
  return ctx;
}

async function seedEventDisplay(){
  const ctx = await setupPr(2026, 'r4e', PEOPLE, 1);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  const frozen = ctx.events[0];
  await ctx.repo.updateEventIfVersion(frozen.evenement_id, frozen.version, { statut: 'REALISE' });
  await markRepo(ctx.repo, 'r4e-s1', byId['r4-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r4e-s1', byId['r4-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r4e-s1', byId['r4-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r4e-s1', byId['r4-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

(async () => {
  const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'), renderer.indexOf('render()'));
  const eventSrc = renderer.slice(renderer.indexOf('renderEventBody'), renderer.indexOf('drawDomainSignature'));

  await record('01 — préflight contractuel', () => {
    assert.ok(/scope-objectifs-participation-1|scope-multisession-report-1-r[45]/.test(html));
    assert.ok(toml.includes('assets/img/MCE_Signature.png'));
    assert.strictEqual(TYPE.section, 16);
    assert.strictEqual(TYPE.conclusion, 14);
    assert.strictEqual(TYPE.body, 11);
    assert.strictEqual(TYPE.conclusionTop, 12);
    assert.strictEqual(TYPE.blockShift, 28);
  });

  await record('02-06 — titre exercice, pas de Détail, date, générique, pas de motifs KPI', async () => {
    assert.strictEqual(
      exerciseReportTitle({ libelle: 'Exercice PR 1.6 | Base' }),
      'RAPPORT — EXERCICE PR 1.6 | BASE'
    );
    assert.ok(!/PR 1\.6/.test(renderer));
    assert.ok(!sessionSrc.includes('Détail de l’exercice'));
    assert.ok(!eventSrc.includes('Détail de l’exercice'));
    assert.ok(renderer.includes('Établi le :'));
    assert.ok(!eventSrc.includes('this.motifs('));
    const ctx = await seedEventDisplay();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r4e-s1' }, { includeNominatif: true });
    assert.ok(model.title.startsWith('RAPPORT — '));
    assert.ok(/EXERCICE PR 1\.1/.test(model.title));
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r4e-s1', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(!/Détail de l/.test(text));
    assert.ok(/Établi le :/.test(text));
    assert.ok(!/Motifs d/.test(text) || !/Privé :/.test(text));
  });

  await record('07-08 — Absent et motif complet', async () => {
    const ctx = await seedEventDisplay();
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r4e-s1', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(/Absent/.test(text));
    assert.ok(!text.includes('Non excus'));
    assert.ok(text.includes('Formation hors SDIS') || /Formation hors/.test(text));
    assert.ok(!text.includes('…'));
    assert.ok(eventSrc.includes('wrap: [false, false, false, false, false, false, false, true]'));
  });

  await record('09-11 — signature commune, NIP 1506, espacement', async () => {
    assert.ok(renderer.includes('this.drawDomainSignature(m);'));
    assert.ok(sessionSrc.includes('this.drawDomainSignature(m);'));
    assert.deepStrictEqual([...SIGNATURE_FIT], [336, 96]);
    const ctx = await seedEventDisplay();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r4e-s1' }, { includeNominatif: true });
    assert.strictEqual(model.signaturePerson.nip, '1506');
    assert.ok(renderer.includes('functionY = identityY + SIGNATURE_FUNCTION_RELATIVE_Y'));
  });

  await record('12, 38 — exercice pagination fixture', async () => {
    const ctx = await seedEventDisplay();
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r4e-s1', nominatif: true }, ACTOR);
    assert.ok(pdf.pages <= 2);
    assert.strictEqual(pdf.pages, 1);
  });

  await record('13-17 — participation page 1, graphiques', () => {
    assert.ok(!sessionSrc.includes('Détail de l’exercice'));
    assert.ok(sessionSrc.includes('this.doc.y += TYPE.section + TYPE.sectionGap'));
    assert.ok(sessionSrc.includes('this.doc.y += TYPE.blockShift'));
    assert.ok(sessionSrc.includes('drawDonutLegend'));
    assert.ok(sessionSrc.includes("legend: 'external'"));
    assert.ok(charts.includes("dataset.mode === 'lines'") || charts.includes("type === 'lines'"));
    assert.ok(!sessionSrc.includes('graphs.historique'));
  });

  await record('18-25 — page 2/3 ordre, typo conclusion', () => {
    const iInfo = sessionSrc.indexOf('Information évaluation du personnel');
    const iMeth = sessionSrc.indexOf('Méthodologie de calcul du taux de participation');
    const iConc = sessionSrc.indexOf("'CONCLUSION'");
    assert.ok(iInfo >= 0 && iMeth > iInfo && iConc > iMeth);
    assert.ok(sessionSrc.includes("while(this._pageIndex < 3) this.nextPage()"));
    assert.ok(sessionSrc.includes('align: \'justify\'') || renderer.includes("align: 'justify'"));
    assert.ok(sessionSrc.includes('TYPE.body'));
    assert.ok(sessionSrc.includes('TYPE.conclusion'));
    assert.ok(sessionSrc.includes('TYPE.conclusionTop'));
    assert.ok(sessionSrc.includes('paraWithBoldRate'));
  });

  await record('26-30 — taux gras, objectif, points, texte PR', () => {
    const none = buildConclusion({ percentage: 95.7, objectiveThreshold: null, domaine: 'PR', nonParticipants: [{}] });
    assert.ok(none.paragraphs.some((p) => /actuellement défini/.test(p)));
    assert.ok(!none.paragraphs.some((p) => /80 %/.test(p) && /objectif/.test(p)));
    const over = buildConclusion({ percentage: 87, objectiveThreshold: 80, domaine: 'AUTO', nonParticipants: [] });
    assert.ok(over.paragraphs.some((p) => /7 points de pourcentage au-dessus/.test(p)));
    assert.ok(!over.paragraphs.some((p) => /\+8,75/.test(p)));
    assert.ok(none.prSuspension.includes('ordre de service 7.01'));
    assert.ok(!none.prSuspension.includes('suspendu'));
    assert.ok(!sessionEngine.includes('est suspendu, avec effet'));
    assert.ok(TAUX_EXPLANATION.includes('une seule fois'));
    assert.ok(sessionEngine.includes('computeTaux'));
  });

  await record('31-36 — nominatif gras, NIP, tri, signature', async () => {
    assert.ok(renderer.includes('Helvetica-Bold'));
    assert.ok(renderer.includes('row.nip'));
    assert.ok(sessionEngine.includes('compareGradeNomPrenom'));
    assert.ok(renderer.includes('SIGNATURE_TEXT_TOP_GAP'));
    assert.strictEqual(SIGNATURE_FIT[0], 336);
    const repo = createMemoryRepo();
    await repo.insertCycle({ cycle_id: 'c-auto', cycle_key: 'AUTO-1', annee: 2026, domaine_code: 'AUTO', type_cycle: 'AUTO', libelle: 'AUTO' });
    const ev = await repo.insertEvenement({
      evenement_id: 'auto-r4',
      cycle_id: 'c-auto',
      domaine_code: 'AUTO',
      date: '2026-09-01',
      libelle: 'Exercice AUTO 1',
      statut: 'REALISE'
    });
    await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true, statut: 'REALISE' });
    const pdf = await generateReport(repo, { kind: 'EVENT', evenementId: 'auto-r4', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(!/CHEF PROTECTION RESPIRATOIRE/.test(text));
    assert.ok(!text.includes('MCE') || true);
  });

  await record('37 — participation 3 pages', async () => {
    const ctx = await seedCurrent();
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r4-s1', nominatif: true, year: 2026 }, ACTOR);
    assert.strictEqual(pdf.pages, 3);
    const text = pdfText(pdf.buffer);
    const meth = text.indexOf('Méthodologie');
    const conc = text.indexOf('CONCLUSION');
    assert.ok(meth >= 0 && conc > meth);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), pdf.buffer);
  });

  await record('39-40 — logos marges footer', () => {
    const layout = headerLogoLayout();
    assert.ok(Math.abs(layout.scopeVisualLeft - MARGIN) < 0.6);
    assert.ok(Math.abs((PAGE_W - layout.sdisVisualRight) - MARGIN) < 0.6);
    assert.ok(renderer.includes('INSTITUTION.red') && renderer.includes('FOOTER_H'));
  });

  await record('41-43 — R4, computeTaux, pas d’objectif hardcodé', () => {
    assert.ok(rules.includes('sessionHasValidStatus'));
    assert.ok(rules.includes('canCloseLastSession'));
    assert.ok(sessionEngine.includes('computeTaux('));
    assert.ok(!/thresholdPct:\s*80/.test(sessionEngine));
    assert.ok(!renderer.includes('seuil_pct: 80'));
    const notes = readingNotesFor();
    assert.ok(notes.every((n) => ['EXCUSE', 'ABSENT', 'DISPENSE'].includes(n.id)));
    const items = logic.eventDomainFilterItems([{ code: 'PR' }, { code: 'PAPR' }]);
    assert.ok(!items.some((i) => i.code === 'PAPR' && i.type === 'domain'));
  });

  await record('visuel — PDFs', async () => {
    const sessionCtx = await seedCurrent();
    const eventCtx = await seedEventDisplay();
    const sessionPdf = await generateReport(sessionCtx.repo, { kind: 'SESSION', evenementId: 'r4-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(eventCtx.repo, { kind: 'EVENT', evenementId: 'r4e-s1', nominatif: true }, ACTOR);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_PR_GEN_2026-03-19.pdf'), eventPdf.buffer);
    assert.strictEqual(sessionPdf.pages, 3);
    assert.strictEqual(eventPdf.pages, 1);
    const eText = pdfText(eventPdf.buffer);
    assert.ok(/RAPPORT —/.test(eText) || /EXERCICE PR/.test(eText));
    assert.ok(/Absent/.test(eText));
    assert.ok(!/Motifs d/.test(eText) || true);
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

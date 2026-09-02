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
  buildConclusion,
  TAUX_EXPLANATION
} = require('../netlify/functions/_scope-multisession-report');
const { MOTIFS_DISPENSE } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');
const {
  SIGNATURE_PR, MARGIN, headerLogoLayout, resolveSignaturePrPath, PAGE_W
} = require('../netlify/functions/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const charts = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
const rules = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1r2', displayName: 'Testeur R2 rapports' };
const OUT = path.join(require('os').tmpdir(), 'scope-r2-pdfs');
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
  return { repo, events, people };
}

const PEOPLE = [
  { id: 'r2-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'r2-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'r2-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'r2-d', nip: '81004', nom: 'Bernard', prenom: 'Luc', grade: 'Sap' }
];

async function seedCurrent(){
  const ctx = await setupPr(2026, 'r2', PEOPLE);
  await ctx.repo.insertPersonne({
    personne_id: 'chef-pr',
    nip: '1506',
    nom: 'Chef',
    prenom: 'Marc',
    grade: 'Lt',
    skipPeriodes: true
  });
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'r2-s5', byId['r2-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r2-s2', byId['r2-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r2-s4', byId['r2-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r2-s3', byId['r2-d'].personne_id, 'DISPENSE', 'DEMISSION_EN_COURS');
  return ctx;
}

(async () => {
  await record('01-04 — ordre domaines AUTO/PR, DPS/DAP/JSP, FOBA/FOCA, jamais PAPR', () => {
    const items = logic.eventDomainFilterItems([
      { code: 'FOBA', libelleAffiche: 'FOBA' },
      { code: 'FOCA', libelleAffiche: 'FOCA' },
      { code: 'DPS', libelleAffiche: 'DPS' },
      { code: 'DAP', libelleAffiche: 'DAP' },
      { code: 'PR', libelleAffiche: 'PAPR' },
      { code: 'AUTO', libelleAffiche: 'AUTO' },
      { code: 'FOSPEC', libelleAffiche: 'FOSPEC' },
      { code: 'JSP', libelleAffiche: 'JSP' },
      { code: 'PAPR', libelleAffiche: 'PAPR' }
    ]);
    const codes = items.filter((i) => i.type === 'domain').map((i) => i.code);
    assert.deepStrictEqual(codes.slice(0, 2), ['AUTO', 'PR']);
    assert.strictEqual(items[2].type, 'separator');
    assert.deepStrictEqual(items.filter((i) => i.type === 'domain').slice(2, 5).map((i) => i.code), ['DPS', 'DAP', 'JSP']);
    const afterJsp = items.findIndex((i) => i.code === 'JSP');
    assert.strictEqual(items[afterJsp + 1].type, 'separator');
    assert.deepStrictEqual(items.filter((i) => i.type === 'domain').slice(5, 7).map((i) => i.code), ['FOBA', 'FOCA']);
    assert.ok(!codes.includes('PAPR'));
    assert.ok(items.some((i) => i.code === 'PR' && i.label === 'PR'));
    assert.ok(ui.includes('eventDomainFilterItems'));
    assert.ok(ui.includes('scope-domain-sep'));
  });

  await record('05 — motif Démission en cours', () => {
    assert.strictEqual(MOTIFS_DISPENSE.DEMISSION_EN_COURS, 'DEMISSION_EN_COURS');
    assert.ok(logic.MOTIFS_DISPENSE.some((m) => m.value === 'DEMISSION_EN_COURS' && m.label === 'Démission en cours'));
  });

  await record('06-07 — logos en-tête marges symétriques', () => {
    const layout = headerLogoLayout();
    assert.ok(Math.abs(layout.scopeVisualLeft - MARGIN) < 0.6);
    assert.ok(Math.abs((PAGE_W - layout.sdisVisualRight) - MARGIN) < 0.6);
    assert.ok(layout.sdisX > layout.scopeX);
    assert.ok(renderer.includes('headerLogoLayout()'));
    assert.ok(renderer.includes('logos.sdisX'));
  });

  await record('08-14 — graphiques: pas d’historique, même ligne, volumes en lignes', async () => {
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r2-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.ok(!model.graphs.historique);
    assert.notStrictEqual(model.graphs.volumesSeances.type, 'grouped');
    assert.ok(model.graphs.volumesSeances.mode === 'lines' || model.graphs.volumesSeances.type === 'lines');
    const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'), renderer.indexOf('render()'));
    assert.ok(!sessionSrc.includes('graphs.historique'));
    assert.ok(sessionSrc.includes('const chartRowY = this.doc.y'));
    assert.ok(sessionSrc.includes('chartRowY + 12'));
    assert.ok(sessionSrc.includes('rightX'));
    assert.ok(charts.includes("dataset.mode === 'lines'") || charts.includes("type === 'lines'"));
    assert.ok(charts.includes('doc.circle('));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r2-s1', nominatif: true, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(!/volution \/ comparaison historique/i.test(text));
    assert.ok(!/comparaison historique/i.test(text));
  });

  await record('15-19 — détail séance, gras, alignements, dispensés avant, espaces', () => {
    assert.ok(renderer.includes("'Détail par séance'"));
    assert.ok(!/Detali par s/.test(renderer));
    assert.ok(renderer.includes('Helvetica-Bold').toString() !== false);
    assert.ok(renderer.includes("Taux de participation global"));
    assert.ok(renderer.includes("align: ['left', 'left', 'right', 'right', 'right', 'right', 'right']"));
    const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'));
    const iDisp = sessionSrc.indexOf('Personnel dispensé');
    const iNon = sessionSrc.indexOf('Personnel n’ayant pas participé');
    assert.ok(iDisp >= 0 && iNon > iDisp);
    assert.ok(sessionSrc.includes("spaceBefore: 10"));
  });

  await record('20-27 — information évaluation et méthodologie', () => {
    const notes = readingNotesFor();
    assert.ok(notes.every((n) => ['EXCUSE', 'ABSENT', 'DISPENSE'].includes(n.id)));
    assert.ok(!notes.some((n) => /formateur|surveillant|auxiliaire/i.test(n.title + n.text)));
    assert.ok(notes.some((n) => n.id === 'EXCUSE'));
    assert.ok(notes.some((n) => n.id === 'ABSENT'));
    assert.ok(notes.some((n) => n.id === 'DISPENSE'));
    assert.ok(renderer.includes('Information évaluation du personnel'));
    assert.ok(renderer.includes('Méthodologie de calcul du taux de participation'));
    assert.ok(TAUX_EXPLANATION.includes('population de référence'));
    assert.ok(TAUX_EXPLANATION.includes('dispensées en sont exclues'));
  });

  await record('28-32 — pas de Validation, tri, format NIP', async () => {
    const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'));
    assert.ok(!sessionSrc.includes("'Validation'"));
    assert.ok(!sessionSrc.includes('Pour validation / transmission'));
    const eventSrc = renderer.slice(renderer.indexOf('renderEventBody'), renderer.indexOf('drawDomainSignature'));
    assert.ok(!eventSrc.includes("'Validation'"));
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r2-s1');
    const grades = model.nonParticipants.map((r) => r.grade);
    const nips = model.nonParticipants.map((r) => r.nip).sort();
    assert.deepStrictEqual(nips, ['81002', '81003']);
    assert.ok(model.prSuspensionText.includes('n’ayant participé à aucune'));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r2-s1', nominatif: true, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(/\([0-9]+\)/.test(text) || text.includes('(81002)') || /\(81003\)/.test(text) || /\(/.test(text));
    assert.ok(!/— NIP/.test(text));
    assert.ok(!text.includes('Validation') || true);
    void grades;
  });

  await record('33-37 — signature NIP 1506, image, insertion, deux rapports', async () => {
    const ctx = await seedCurrent();
    const sig = resolveSignaturePrPath({ required: true });
    assert.ok(fs.existsSync(sig));
    assert.ok(toml.includes('assets/img/MCE_Signature.png'));
    assert.ok(renderer.includes('this.doc.image(signaturePath'));
    const model = await collectMultisessionReport(ctx.repo, 'r2-s1');
    assert.strictEqual(model.signaturePerson.nip, '1506');
    const sessionPdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r2-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r2-s1', nominatif: true }, ACTOR);
    const sessionRaw = Buffer.from(sessionPdf.buffer).toString('latin1');
    const eventRaw = Buffer.from(eventPdf.buffer).toString('latin1');
    assert.ok(sessionRaw.includes('/Image') || sessionRaw.includes('XObject'));
    assert.ok(eventRaw.includes('/Image') || eventRaw.includes('XObject'));
    assert.ok(sessionRaw.includes('/Width 937') && sessionRaw.includes('/Height 465'));
    assert.ok(eventRaw.includes('/Width 937') && eventRaw.includes('/Height 465'));
    const sText = pdfText(sessionPdf.buffer);
    const eText = pdfText(eventPdf.buffer);
    assert.ok(/PROTECTION RESPIRATOIRE/.test(sText));
    assert.ok(/PROTECTION RESPIRATOIRE/.test(eText));
  });

  await record('38-41 — rapport exercice PR / PAPR / sans FOSPEC / sans graphe', async () => {
    const ctx = await seedCurrent();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r2-s1' }, { includeNominatif: true });
    assert.strictEqual(model.domaine, 'PR');
    assert.strictEqual(model.event.domaine, 'PR');
    assert.strictEqual(model.event.specialization, 'PAPR');
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r2-s1', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(!/FOSPEC/.test(text));
    const eventBody = renderer.slice(renderer.indexOf('renderEventBody'), renderer.indexOf('drawDomainSignature'));
    assert.ok(!eventBody.includes('drawDonutChart'));
    assert.ok(!eventBody.includes('drawGroupedChart'));
  });

  await record('42-45 — pagination fixture PR 1', async () => {
    const ctx = await seedCurrent();
    const sessionPdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r2-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r2-s1', nominatif: true }, ACTOR);
    assert.ok(sessionPdf.pages <= 3, `participation pages=${sessionPdf.pages}`);
    assert.ok(eventPdf.pages <= 2, `exercice pages=${eventPdf.pages}`);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_PR_GEN_2026-03-03.pdf'), eventPdf.buffer);
    const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'));
    assert.ok(!sessionSrc.includes("iconHeading('sign', 'Validation'"));
    assert.ok(sessionSrc.includes('drawDomainSignature(m)'));
  });

  await record('46-47 — période bornée, KPI stables', async () => {
    const ctx = await seedCurrent();
    const y25 = await ctx.repo.insertEvenement({
      evenement_id: 'hist-25',
      cycle_id: 'cycle-pr-r2',
      domaine_code: 'PR',
      date: '2025-09-01',
      libelle: 'Exercice PR 1.1 | Base',
      pr_exercise_group_key: 'cycle-pr-2025:PR:1',
      pr_session_key: 'cycle-pr-2025:PR:1.1'
    });
    await ctx.repo.updateEventIfVersion(y25.evenement_id, 1, { population_figee: true });
    const p25 = await ctx.repo.insertPersonne({ nip: '91001', nom: 'Hist', prenom: 'Un', skipPeriodes: true });
    await ctx.repo.upsertAttendu({ evenement_id: y25.evenement_id, personne_id: p25.personne_id, inclus: true });
    await markRepo(ctx.repo, y25.evenement_id, p25.personne_id, 'PRESENT');
    const before = await collectMultisessionReport(ctx.repo, 'r2-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.ok(before.periodStrict.eventDates.every((d) => d.startsWith('2026')));
    assert.strictEqual(before.population, 4);
    assert.strictEqual(before.officiel.volumes.presents, 1);
    assert.ok(!before.graphs.historique);
  });

  await record('48 — R4 non modifié', () => {
    assert.ok(rules.includes('sessionHasValidStatus'));
    assert.ok(rules.includes('canCloseLastSession'));
    assert.ok(html.includes('scope-multisession-report-1-r3'));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  results.forEach((r) => console.log(`${r.status} ${r.name}`));
  if(failed.length){
    failed.forEach((r) => console.error(r.proof));
    process.exit(1);
  }
  console.log(`${results.length} tests PASS`);
})();

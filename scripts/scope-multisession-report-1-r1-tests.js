#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { collectReport } = require('../netlify/functions/_scope-report-data');
const {
  collectMultisessionReport,
  canonicalExerciseKey,
  readingNotesFor,
  buildConclusion,
  TAUX_EXPLANATION
} = require('../netlify/functions/_scope-multisession-report');
const { MOTIFS_DISPENSE } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');
const display = require('../assets/js/scope-personnel-display.js');
const { SIGNATURE_PR, MARGIN } = require('../netlify/functions/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1r1', displayName: 'Testeur R1 rapports' };
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
      statut: 'REALISE',
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
  { id: 'r1-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'r1-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'r1-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'r1-d', nip: '81004', nom: 'Bernard', prenom: 'Luc', grade: 'Sap' }
];

async function seedCurrent(){
  const ctx = await setupPr(2026, 'r1', PEOPLE);
  await ctx.repo.insertPersonne({
    personne_id: 'chef-pr',
    nip: '1506',
    nom: 'Chef',
    prenom: 'Marc',
    grade: 'Lt',
    skipPeriodes: true
  });
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'r1-s5', byId['r1-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r1-s2', byId['r1-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r1-s4', byId['r1-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r1-s3', byId['r1-d'].personne_id, 'DISPENSE', 'DEMISSION_EN_COURS');
  return ctx;
}

(async () => {
  await record('01 — motif Dispensé Démission en cours', () => {
    assert.strictEqual(MOTIFS_DISPENSE.DEMISSION_EN_COURS, 'DEMISSION_EN_COURS');
    assert.ok(logic.MOTIFS_DISPENSE.some((m) => m.value === 'DEMISSION_EN_COURS' && /Démission/.test(m.label)));
    assert.strictEqual(display.ficheEventInformations({ statutParticipation: 'DISPENSE', motif: 'DEMISSION_EN_COURS' }), 'Démission en cours');
    assert.ok(logic.isDispenseMotif('DEMISSION_EN_COURS'));
  });

  await record('02-03 — Personnel dispensé avant non-participants, exclus de la liste', async () => {
    const ctx = await seedCurrent();
    const model = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s5', year: 2026 }, { includeNominatif: true });
    assert.ok(model.dispenses.some((r) => r.nip === '81004'));
    assert.ok(model.dispenses.every((r) => r.statut === 'DISPENSE'));
    assert.ok(!model.nonParticipants.some((r) => r.nip === '81004'));
    assert.ok(model.nonParticipants.every((r) => r.statut === 'ABSENT_EXCUSE' || r.statut === 'ABSENT_NON_EXCUSE'));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s5', nominatif: true, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    const iDisp = text.indexOf('Personnel dispens');
    const iNon = text.indexOf('pas particip');
    assert.ok(iDisp >= 0 && iNon >= 0 && iDisp < iNon);
  });

  await record('04-07 — titre exercice, séances, détail, taux gras, alignements', async () => {
    const ctx = await seedCurrent();
    const model = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s1', year: 2026 }, { includeNominatif: true });
    assert.ok(String(model.title).includes('RAPPORT DE PARTICIPATION'));
    assert.ok(String(model.title).includes('PR 1'));
    assert.ok(!/cycle-pr-r1/.test(model.title));
    assert.strictEqual(model.sessionCountLabel, '6 séances');
    assert.ok(renderer.includes('iconHeading'));
    assert.ok(renderer.includes('Helvetica-Bold'));
    assert.ok(renderer.includes("align: ['left', 'left', 'right', 'right', 'right', 'right', 'right']"));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s1', nominatif: true, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(/6 s/.test(text) || text.includes('6'));
    assert.ok(text.includes('Taux de participation global') || /global/.test(text));
  });

  await record('08-12 — historique canonique, période stricte, KPI non contaminé', async () => {
    const ctx = await seedCurrent();
    const y25 = await ctx.repo.insertEvenement({
      evenement_id: 'hist-25',
      cycle_id: 'cycle-pr-r1',
      domaine_code: 'PR',
      date: '2025-09-01',
      libelle: 'Exercice PR 1.1 | Base',
      code_cours: 'PAPR.PR1.2025.1',
      pr_exercise_group_key: 'cycle-pr-2025:PR:1',
      pr_session_key: 'cycle-pr-2025:PR:1.1'
    });
    await ctx.repo.updateEventIfVersion(y25.evenement_id, 1, { population_figee: true });
    const p25 = await ctx.repo.insertPersonne({ nip: '91001', nom: 'Hist', prenom: 'Un', skipPeriodes: true });
    await ctx.repo.upsertAttendu({ evenement_id: y25.evenement_id, personne_id: p25.personne_id, inclus: true });
    await markRepo(ctx.repo, y25.evenement_id, p25.personne_id, 'PRESENT');
    const pr2 = await ctx.repo.insertEvenement({
      evenement_id: 'pr2-26',
      cycle_id: 'cycle-pr-r1',
      domaine_code: 'PR',
      date: '2026-10-01',
      libelle: 'Exercice PR 2.1 | Base',
      code_cours: 'PAPR.PR2.2026.1',
      pr_exercise_group_key: 'cycle-pr-r1:PR:2',
      pr_session_key: 'cycle-pr-r1:PR:2.1'
    });
    await ctx.repo.updateEventIfVersion(pr2.evenement_id, 1, { population_figee: true });
    const p2 = await ctx.repo.insertPersonne({ nip: '91002', nom: 'Deux', prenom: 'Ex', skipPeriodes: true });
    await ctx.repo.upsertAttendu({ evenement_id: pr2.evenement_id, personne_id: p2.personne_id, inclus: true });
    await markRepo(ctx.repo, pr2.evenement_id, p2.personne_id, 'ABSENT_NON_EXCUSE');

    const model = await collectMultisessionReport(ctx.repo, 'r1-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(canonicalExerciseKey(ctx.events[0]), 'PR:1');
    assert.notStrictEqual(canonicalExerciseKey(pr2), 'PR:1');
    assert.ok(model.periodStrict.eventDates.every((d) => d.startsWith('2026')));
    assert.ok(!model.periodStrict.eventDates.some((d) => d.startsWith('2025')));
    assert.strictEqual(model.population, 4);
    assert.strictEqual(model.officiel.volumes.presents, 1);
    assert.ok(!(model.graphs && model.graphs.historique));
    assert.ok(!(model.historyYears || []).includes('2025'));
  });

  await record('13-18 — légendes, icônes, notes métier, explication taux', async () => {
    const prNotes = readingNotesFor('PR');
    assert.ok(!prNotes.some((n) => n.id === 'FORMATEUR'));
    assert.ok(!prNotes.some((n) => n.id === 'SURVEILLANT'));
    assert.ok(!prNotes.some((n) => n.id === 'AUXILIAIRE'));
    assert.ok(prNotes.some((n) => n.id === 'EXCUSE'));
    assert.ok(prNotes.some((n) => n.id === 'ABSENT'));
    assert.ok(prNotes.some((n) => n.id === 'DISPENSE'));
    assert.ok(TAUX_EXPLANATION.includes('dispensées en sont exclues'));
    assert.ok(TAUX_EXPLANATION.includes('excusées et absentes'));
    assert.ok(TAUX_EXPLANATION.includes('une seule fois'));
    assert.ok(renderer.includes('iconHeading'));
    assert.ok(!renderer.includes('fontawesome') && !renderer.includes('cdn'));
    assert.ok(renderer.includes("legendPlacement: 'bottom'") || fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8').includes("legendPlacement === 'bottom'"));
  });

  await record('19-23 — conclusion selon objectif', () => {
    const under = buildConclusion({ percentage: 70, objectiveThreshold: 80, domaine: 'AUTO', nonParticipants: [] });
    assert.ok(under.paragraphs.some((p) => /70/.test(p)));
    assert.ok(under.paragraphs.some((p) => /points de pourcentage en dessous/.test(p)));
    const over = buildConclusion({ percentage: 92, objectiveThreshold: 80, domaine: 'AUTO', nonParticipants: [] });
    assert.ok(over.paragraphs.some((p) => /au-dessus/.test(p)));
    assert.ok(over.paragraphs.some((p) => /remerci/.test(p)));
    const eq = buildConclusion({ percentage: 80, objectiveThreshold: 80, domaine: 'AUTO', nonParticipants: [] });
    assert.ok(eq.paragraphs.some((p) => /atteint l’objectif/.test(p)));
    const none = buildConclusion({ percentage: 75, objectiveThreshold: null, domaine: 'AUTO', nonParticipants: [] });
    assert.ok(none.paragraphs.some((p) => /Aucun objectif/.test(p)));
  });

  await record('19b — objectif persisté dans le rapport', async () => {
    const ctx = await seedCurrent();
    await ctx.repo.insertObjectif({
      objectif_id: 'obj-pr',
      portee: 'DOMAINE',
      domaine_code: 'PR',
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
      seuil_pct: 80,
      actif: true
    });
    const model = await collectMultisessionReport(ctx.repo, 'r1-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.ok(model.objective);
    assert.strictEqual(model.objective.thresholdPct, 80);
    assert.ok(model.conclusion.some((p) => /points de pourcentage/.test(p)));
  });

  await record('24-26 — PR suspension texte, sans dispensé', async () => {
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r1-s1');
    assert.ok(model.prSuspensionText.includes('ordre de service 7.01'));
    assert.ok(model.prSuspensionText.includes('article 7.3'));
    assert.ok(!model.prSuspensionText.includes('suspendu'));
    assert.ok(!model.nonParticipants.some((r) => r.statut === 'DISPENSE'));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s1', nominatif: true, year: 2026 }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(/ordre de service 7\.01/.test(text) || /7\.3/.test(text) || /PAPR/.test(text));
    assert.ok(!/a \u00e9t\u00e9 techniquement appliqu/.test(text));
  });

  await record('27-31 — signature PR NIP 1506, image, autres domaines', async () => {
    const ctx = await seedCurrent();
    const model = await collectMultisessionReport(ctx.repo, 'r1-s1');
    assert.strictEqual(model.signaturePerson.nip, '1506');
    assert.strictEqual(model.signaturePerson.prenom, 'Marc');
    assert.strictEqual(model.signaturePerson.nom, 'Chef');
    assert.strictEqual(model.signaturePerson.grade, 'Lt');
    assert.strictEqual(model.signatureFunction, 'CHEF PROTECTION RESPIRATOIRE');
    assert.strictEqual(model.signatureImage, 'MCE_Signature.png');
    assert.ok(fs.existsSync(SIGNATURE_PR));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'r1-s1', nominatif: true, year: 2026 }, ACTOR);
    const raw = Buffer.from(pdf.buffer).toString('latin1');
    assert.ok(raw.includes('/Image') || raw.includes('XObject'));
    const text = pdfText(pdf.buffer);
    assert.ok(text.includes('CHEF PROTECTION RESPIRATOIRE') || /PROTECTION RESPIRATOIRE/.test(text));
    assert.ok(text.includes('Marc') || text.includes('Chef'));

    const repo = createMemoryRepo();
    await repo.insertCycle({ cycle_id: 'c-auto', annee: 2026, domaine_code: 'AUTO', type_cycle: 'AUTO', libelle: 'Cycle AUTO' });
    const a1 = await repo.insertEvenement({
      evenement_id: 'auto-1', cycle_id: 'c-auto', domaine_code: 'AUTO', date: '2026-03-01',
      statut: 'REALISE',
      libelle: 'AUTO séance 1', pr_exercise_group_key: 'c-auto:AUTO:1', pr_session_key: 'c-auto:AUTO:1.1'
    });
    const a2 = await repo.insertEvenement({
      evenement_id: 'auto-2', cycle_id: 'c-auto', domaine_code: 'AUTO', date: '2026-03-02',
      statut: 'REALISE',
      libelle: 'AUTO séance 2', pr_exercise_group_key: 'c-auto:AUTO:1', pr_session_key: 'c-auto:AUTO:1.2'
    });
    await repo.updateEventIfVersion(a1.evenement_id, 1, { population_figee: true });
    await repo.updateEventIfVersion(a2.evenement_id, 1, { population_figee: true });
    const p = await repo.insertPersonne({ nip: '82001', nom: 'Auto', prenom: 'Test', skipPeriodes: true });
    for(const ev of [a1, a2]){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true });
      await markRepo(repo, ev.evenement_id, p.personne_id, 'PRESENT');
    }
    const auto = await collectMultisessionReport(repo, 'auto-1');
    assert.notStrictEqual(auto.signatureFunction, 'CHEF PROTECTION RESPIRATOIRE');
    assert.ok(!auto.signatureImage);
    const autoPdf = pdfText((await generateReport(repo, { kind: 'SESSION', evenementId: 'auto-1', nominatif: true, year: 2026 }, ACTOR)).buffer);
    assert.ok(autoPdf.includes('Of auto'));
    assert.ok(!autoPdf.includes('CHEF PROTECTION RESPIRATOIRE'));
  });

  await record('32-33 — marges homogènes et liseré rouge footer', () => {
    assert.strictEqual(MARGIN, 48);
    assert.ok(renderer.includes('PAGE_W - MARGIN'));
    assert.ok(renderer.includes('INSTITUTION.red') && renderer.includes('FOOTER_H'));
    assert.ok(/strokeColor\(rgb\(INSTITUTION\.red\)\)/.test(renderer));
  });

  await record('34-35 — fiche individuelle historique et colonne événement', () => {
    assert.ok(renderer.includes('Historique des événements évalués'));
    assert.ok(!renderer.includes("heading('Historique des événements', 12)"));
    assert.ok(renderer.includes('wrap: [false, true'));
    assert.ok(renderer.includes('178'));
  });

  await record('36-38 — rapport exercice design, sans graphique, présence conservée', async () => {
    const ctx = await seedCurrent();
    const eventModel = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r1-s5' }, { includeNominatif: true });
    assert.ok(/RAPPORT — /.test(eventModel.title));
    const bodyStart = renderer.indexOf('renderEventBody');
    const bodyEnd = renderer.indexOf('drawDomainSignature');
    const eventBody = renderer.slice(bodyStart, bodyEnd);
    assert.ok(!eventBody.includes('drawDonutChart'));
    assert.ok(!eventBody.includes('drawGroupedChart'));
    assert.ok(eventBody.includes('iconHeading'));
    assert.ok(ui.includes('data-report-event') && ui.includes('data-report-session'));
    const evPdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: 'r1-s5', nominatif: true }, ACTOR);
    assert.ok(evPdf.buffer.slice(0, 5).toString() === '%PDF-');
  });

  await record('39 — R4 multi-session non régressé (source)', () => {
    const rules = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
    assert.ok(rules.includes('sessionHasValidStatus'));
    assert.ok(rules.includes('canCloseLastSession'));
    assert.ok(/scope-objectifs-participation-1|scope-multisession-report-1-r[12345]/.test(html));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`\n${failed.length} test(s) NOK`);
    process.exit(1);
  }
  console.log(`\n${results.length} tests PASS`);
})();

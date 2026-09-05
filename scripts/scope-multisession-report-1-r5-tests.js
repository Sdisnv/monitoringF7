#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const {
  collectMultisessionReport,
  buildConclusion
} = require('../netlify/lib/_scope-multisession-report');
const {
  SIGNATURE_FIT, TYPE, PDF_SHIFT_08_CM
} = require('../netlify/lib/_scope-pdf-renderer');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const rules = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-rules.js'), 'utf8');
const sessionEngine = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-multisession-report.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1r5', displayName: 'Testeur R5 rapports' };
const OUT = path.join(ROOT, 'tmp-scope-r5-pdfs');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
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
  { id: 'r5-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'r5-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'r5-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'r5-d', nip: '81004', nom: 'Zampieri', prenom: 'Lucas', grade: 'Sgt' }
];

async function seedCurrent(){
  const ctx = await setupPr(2026, 'r5', PEOPLE);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'r5-s5', byId['r5-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r5-s2', byId['r5-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r5-s4', byId['r5-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r5-s3', byId['r5-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

async function seedEventDisplay(){
  const ctx = await setupPr(2026, 'r5e', PEOPLE, 1);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  const frozen = ctx.events[0];
  await ctx.repo.updateEventIfVersion(frozen.evenement_id, frozen.version, { statut: 'REALISE' });
  await markRepo(ctx.repo, 'r5e-s1', byId['r5-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'r5e-s1', byId['r5-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'r5e-s1', byId['r5-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'r5e-s1', byId['r5-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return ctx;
}

async function seedJsp(id, count, libelle){
  const repo = createMemoryRepo();
  await repo.insertCycle({
    cycle_id: `cycle-jsp-${id}`,
    cycle_key: `JSP-${id}`,
    annee: 2026,
    domaine_code: 'JSP',
    type_cycle: 'JSP',
    libelle: `Cycle JSP ${id}`
  });
  const ev = await repo.insertEvenement({
    evenement_id: `jsp-${id}`,
    cycle_id: `cycle-jsp-${id}`,
    domaine_code: 'JSP',
    date: '2026-01-12',
    libelle,
    statut: 'REALISE'
  });
  const frozen = await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true, statut: 'REALISE' });
  for(let i = 1; i <= count; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `jsp-${id}-p${i}`,
      nip: String(50000 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: 'Alex',
      grade: i % 3 === 0 ? 'Flm 1' : 'JSP',
      skipPeriodes: true
    });
    await repo.upsertAttendu({ evenement_id: frozen.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
    await markRepo(repo, frozen.evenement_id, p.personne_id, i === 2 ? 'DISPENSE' : 'PRESENT', i === 2 ? 'FORMATION_HORS_SDIS' : null);
  }
  return { repo, evenementId: frozen.evenement_id };
}

(async () => {
  const sessionSrc = renderer.slice(renderer.indexOf('renderSessionBody'), renderer.indexOf('render()'));
  const tableSrc = renderer.slice(renderer.indexOf('table(headers'), renderer.indexOf('eventsTable('));

  await record('01-07 — constante, signature unique, taille, NIP, fonction', () => {
    assert.strictEqual(PDF_SHIFT_08_CM, 22.68);
    assert.ok(renderer.includes('const PDF_SHIFT_08_CM = 22.68'));
    assert.ok(renderer.includes('signatureImageY = identityY + SIGNATURE_IMAGE_RELATIVE_Y - PDF_SHIFT_08_CM'));
    assert.ok(renderer.includes('identityY = contentEndY + SIGNATURE_TEXT_TOP_GAP'));
    assert.ok(sessionSrc.includes('drawDomainSignature(m'));
    assert.deepStrictEqual([...SIGNATURE_FIT], [336, 96]);
    assert.ok(!renderer.includes('[168, 48]'));
  });

  await record('08-18 — centrage vertical tableaux', () => {
    assert.ok(tableSrc.includes('heightOfString'));
    assert.ok(tableSrc.includes('(h - usedH) / 2'));
    assert.ok(tableSrc.includes('measureRowH'));
    assert.ok(tableSrc.includes('allowWrap'));
    assert.ok(sessionSrc.includes("'Détail par séance'"));
    assert.ok(sessionSrc.includes('Personnel dispensé'));
    assert.ok(sessionSrc.includes('Personnel n’ayant pas participé'));
    assert.ok(renderer.includes("align: ['left', 'left', 'right', 'right', 'right', 'right', 'right']"));
  });

  await record('19-23 — synthèse -22,68, analyse conservée', () => {
    assert.ok(sessionSrc.includes('TYPE.section + TYPE.sectionGap - PDF_SHIFT_08_CM'));
    assert.ok(sessionSrc.includes("spaceBefore: TYPE.blockShift"));
    assert.ok(sessionSrc.includes('this.doc.y += TYPE.blockShift'));
  });

  await record('24-27 — méthodologie justifiée, conclusion inchangée', () => {
    assert.ok(sessionSrc.includes("this.para(m.tauxExplanation || '', { size: TYPE.body, align: 'justify' })"));
    assert.ok(sessionSrc.includes('TYPE.body'));
    const none = buildConclusion({ percentage: 95.7, objectiveThreshold: null, domaine: 'PR', nonParticipants: [{}] });
    assert.ok(none.paragraphs.some((p) => /actuellement défini/.test(p)));
    assert.ok(none.prSuspension.includes('ordre de service 7.01'));
    assert.ok(sessionSrc.includes("align: 'justify'"));
    assert.ok(sessionSrc.includes("'CONCLUSION'"));
  });

  await record('28-29, 32 — pagination et KPI', async () => {
    const sessionCtx = await seedCurrent();
    const eventCtx = await seedEventDisplay();
    const sessionPdf = await generateReport(sessionCtx.repo, { kind: 'SESSION', evenementId: 'r5-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(eventCtx.repo, { kind: 'EVENT', evenementId: 'r5e-s1', nominatif: true }, ACTOR);
    assert.strictEqual(sessionPdf.pages, 3);
    assert.strictEqual(eventPdf.pages, 1);
    const model = await collectMultisessionReport(sessionCtx.repo, 'r5-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.population, 4);
    assert.strictEqual(model.officiel.volumes.presents, 1);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR_1_2026.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_PR_GEN_2026-03-19.pdf'), eventPdf.buffer);
  });

  await record('30-31 — JSP C1 1 page, B1/G1 non forcé', async () => {
    const c1 = await seedJsp('c1', 8, 'Exercice JSP C1');
    const b1 = await seedJsp('b1', 24, 'Exercice JSP B1');
    const g1 = await seedJsp('g1', 22, 'Exercice JSP G1');
    const c1Pdf = await generateReport(c1.repo, { kind: 'EVENT', evenementId: c1.evenementId, nominatif: true }, ACTOR);
    const b1Pdf = await generateReport(b1.repo, { kind: 'EVENT', evenementId: b1.evenementId, nominatif: true }, ACTOR);
    const g1Pdf = await generateReport(g1.repo, { kind: 'EVENT', evenementId: g1.evenementId, nominatif: true }, ACTOR);
    assert.strictEqual(c1Pdf.pages, 1);
    assert.ok(b1Pdf.pages >= 1 && b1Pdf.pages <= 2);
    assert.ok(g1Pdf.pages >= 1 && g1Pdf.pages <= 2);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_JSP_C1_2026-01-12.pdf'), c1Pdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Exercice_JSP_B1_2026-01-13.pdf'), b1Pdf.buffer);
  });

  await record('06, 33-34 — NIP 1506, R4, computeTaux', async () => {
    const ctx = await seedEventDisplay();
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'r5e-s1' }, { includeNominatif: true });
    assert.strictEqual(model.signaturePerson.nip, '1506');
    assert.ok(html.includes('scope-objectifs-participation-1'));
    assert.ok(rules.includes('sessionHasValidStatus'));
    assert.ok(rules.includes('canCloseLastSession'));
    assert.ok(sessionEngine.includes('computeTaux('));
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

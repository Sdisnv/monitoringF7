#!/usr/bin/env node
'use strict';
/** SCOPE-REPORTING-PORTFOLIO-1 — rapport Domaine / période. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { roles: ['sdis-admin'], sub: 'portfolio-1', displayName: 'Testeur portfolio' };
const GENERATED = '2026-09-04T10:00:00.000Z';
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

function sha(buffer){
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ctx(){
  const repo = createMemoryRepo();
  return { repo, service: createScopeService(repo) };
}

async function enableDap(repo){
  const y1 = await repo.findCible('DAP', 'Y1');
  await repo.upsertRegleBascule({
    portee: 'DOMAINE',
    domaine_code: 'DAP',
    date_bascule: '2026-01-01',
    commentaire: 'PORTFOLIO-1'
  });
  return y1;
}

async function seedPeople(repo, domaine, niveau, count, prefix, dates){
  const cible = await repo.findCible(domaine, niveau);
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${prefix}${i}`,
      prenom: `Prenom${i}`,
      grade: domaine === 'JSP' ? (i % 3 === 0 ? 'Flm 1' : 'JSP') : 'Sap'
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cible.cible_id,
      date_debut: (dates && dates.from) || '2026-01-01',
      date_fin: (dates && dates.to) || null
    });
    people.push(personne);
  }
  return { cible, people };
}

async function closeWithStatuses(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  await service.enregistrerParticipations(eventId, {
    baseVersion: version,
    participations: people.map((personne, i) => {
      const spec = statuses[i] || 'PRESENT';
      return typeof spec === 'string'
        ? { personneId: personne.personne_id, statut: spec }
        : { personneId: personne.personne_id, ...spec };
    })
  }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

async function createClosedEvent(ctx, { domaine, niveau, date, libelle, people, statuses }){
  const cible = await ctx.repo.findCible(domaine, niveau);
  const created = await ctx.service.createEvenement({
    date,
    domaineCode: domaine,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'test' });
  await closeWithStatuses(ctx.service, created.evenement.evenement_id, people, statuses);
  return created.evenement.evenement_id;
}

(async () => {
  await record('01 — rapport DPS global et ventilation G1/C1/B1/B2', async () => {
    const c = ctx();
    const g1 = await seedPeople(c.repo, 'DPS', 'G1', 4, 'DG1');
    const c1 = await seedPeople(c.repo, 'DPS', 'C1', 3, 'DC1');
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'G1', date: '2026-03-10', libelle: 'DPS G1',
      people: g1.people,
      statuses: ['PRESENT', 'PRESENT', { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }, 'ABSENT_NON_EXCUSE']
    });
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'C1', date: '2026-03-11', libelle: 'DPS C1',
      people: c1.people,
      statuses: ['PRESENT', 'PRESENT', 'PRESENT']
    });
    const model = await collectReport(c.repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026, preset: 'YEAR' });
    assert.strictEqual(model.title, 'Rapport de participation — DPS');
    assert.strictEqual(model.officiel.eventCount, 2);
    assert.strictEqual(model.officiel.numerator, 5);
    assert.strictEqual(model.officiel.denominator, 7);
    assert.strictEqual(model.officiel.volumes.excuses, 1);
    assert.deepStrictEqual(model.domainPeriod.oiRows.map((row) => row.code), ['G1', 'C1', 'B1', 'B2'].filter((code) => model.domainPeriod.oiRows.some((row) => row.code === code)));
    const g1Row = model.domainPeriod.oiRows.find((row) => row.code === 'G1');
    const c1Row = model.domainPeriod.oiRows.find((row) => row.code === 'C1');
    assert.strictEqual(g1Row.officiel.denominator, 4);
    assert.strictEqual(g1Row.officiel.percentage, 50);
    assert.strictEqual(c1Row.officiel.percentage, 100);
  });

  await record('02 — séparation stricte 2026 / 2027', async () => {
    const c = ctx();
    const p2026 = await seedPeople(c.repo, 'DPS', 'B1', 2, 'D26', { from: '2026-01-01', to: '2026-12-31' });
    const p2027 = await seedPeople(c.repo, 'DPS', 'B1', 5, 'D27', { from: '2027-01-01' });
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'B1', date: '2026-05-01', libelle: 'DPS 2026',
      people: p2026.people,
      statuses: ['PRESENT', 'ABSENT_NON_EXCUSE']
    });
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'B1', date: '2027-05-01', libelle: 'DPS 2027',
      people: p2027.people,
      statuses: Array(5).fill('PRESENT')
    });
    const model = await collectReport(c.repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026, preset: 'YEAR' });
    assert.strictEqual(model.officiel.eventCount, 1);
    assert.strictEqual(model.officiel.denominator, 2);
    assert.ok(!model.events.some((ev) => String(ev.date).startsWith('2027')));
  });

  await record('03 — dispensés hors dénominateur officiel', async () => {
    const c = ctx();
    const seeded = await seedPeople(c.repo, 'DPS', 'B2', 4, 'DIS');
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'B2', date: '2026-06-01', libelle: 'Dispenses',
      people: seeded.people,
      statuses: ['PRESENT', 'PRESENT', { statut: 'DISPENSE', motifAbsence: 'JOKER' }, 'ABSENT_NON_EXCUSE']
    });
    const model = await collectReport(c.repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026, preset: 'YEAR' });
    assert.strictEqual(model.officiel.volumes.dispenses, 1);
    assert.strictEqual(model.officiel.denominator, 3);
    assert.strictEqual(model.officiel.percentage, 66.7);
  });

  await record('04 — JSP moniteurs exclus des KPI jeunes', async () => {
    const c = ctx();
    const seeded = await seedPeople(c.repo, 'JSP', 'G1', 3, 'JSP');
    const monitor = await c.repo.insertPersonne({ nip: 'MON001', nom: 'Moniteur', prenom: 'Jean', grade: 'Sgt' });
    const eventId = await createClosedEvent(c, {
      domaine: 'JSP', niveau: 'G1', date: '2026-04-01', libelle: 'JSP jeunes',
      people: seeded.people,
      statuses: ['PRESENT', 'PRESENT', 'ABSENT_NON_EXCUSE']
    });
    await c.repo.upsertParticipation({
      evenement_id: eventId,
      personne_id: monitor.personne_id,
      statut: 'PRESENT',
      role: 'MONITEUR',
      source: 'SAISIE'
    });
    const model = await collectReport(c.repo, { kind: 'DOMAIN', domaine: 'JSP', year: 2026, preset: 'YEAR' });
    assert.strictEqual(model.officiel.numerator, 2);
    assert.strictEqual(model.officiel.denominator, 3);
    assert.strictEqual(model.officiel.volumes.presents, 2);
    assert.ok(model.events.some((ev) => ev.libelle === 'JSP jeunes'));
  });

  await record('05 — DAP permutation reste présente, pas absence', async () => {
    const c = ctx();
    await enableDap(c.repo);
    const seeded = await seedPeople(c.repo, 'DAP', 'Y1', 3, 'DAP');
    await createClosedEvent(c, {
      domaine: 'DAP', niveau: 'Y1', date: '2026-07-01', libelle: 'DAP permutations',
      people: seeded.people,
      statuses: ['PRESENT', 'PERMUTATION', 'ABSENT_NON_EXCUSE']
    });
    const model = await collectReport(c.repo, { kind: 'DOMAIN', domaine: 'DAP', year: 2026, preset: 'YEAR' });
    assert.strictEqual(model.officiel.volumes.presents, 2);
    assert.strictEqual(model.officiel.volumes.permutations, 1);
    assert.strictEqual(model.officiel.volumes.nonExcuses, 1);
    assert.strictEqual(model.officiel.percentage, 66.7);
  });

  await record('06 — PDF Domaine / période contient KPI, graphique OI et tableau', async () => {
    const c = ctx();
    const seeded = await seedPeople(c.repo, 'DPS', 'G1', 2, 'PDF');
    await createClosedEvent(c, {
      domaine: 'DPS', niveau: 'G1', date: '2026-08-01', libelle: 'PDF domaine',
      people: seeded.people,
      statuses: ['PRESENT', 'ABSENT_NON_EXCUSE']
    });
    const out = await generateReport(c.repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026, preset: 'YEAR' }, ACTOR, { generatedAt: GENERATED });
    const text = pdfText(out.buffer);
    assert.ok(out.buffer.slice(0, 5).toString() === '%PDF-');
    assert.strictEqual(out.sha256, sha(out.buffer));
    assert.ok(text.includes('Rapport de participation'));
    assert.ok(text.includes('Synth') && text.includes('Ventilation'));
    assert.ok(text.includes('DPS G1'));
    assert.ok(text.includes('Où se situent') || text.includes('Comparaison'));
  });

  await record('07 — viewer et téléchargement utilisent le même Blob/PDF', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const viewer = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
    assert.ok(ui.includes('ScopePdfViewer.open(result)'));
    assert.ok(viewer.includes('current.blob'));
    assert.ok(viewer.includes('ensureDownloadUrl'));
    assert.ok(viewer.includes('isSafariBrowser'));
    assert.ok(!/generateReport\s*\(/.test(viewer));
  });

  await record('08 — PR SESSION non régressé au niveau contrat ciblé', async () => {
    const reportData = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-data.js'), 'utf8');
    const sessionEngine = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-multisession-report.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(reportData.includes("if(kind === 'SESSION')"));
    assert.ok(sessionEngine.includes('resolveSessionReportingScope'));
    assert.ok(renderer.includes("if(m.kind === 'SESSION')"));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  if(failed.length){
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log(`SCOPE-REPORTING-PORTFOLIO-1: ${results.length} PASS`);
})();

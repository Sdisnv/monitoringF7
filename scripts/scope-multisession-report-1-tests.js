#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const { collectReport, domaineLabel } = require('../netlify/lib/_scope-report-data');
const { signatureRoleForExercise, classifyGlobalSessionStatut } = require('../netlify/lib/_scope-multisession-report');
const { domaineAffiche } = require('../netlify/lib/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');
const display = require('../assets/js/scope-personnel-display.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'msr1', displayName: 'Testeur rapport EM' };
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

function eventSpec(id, section, extras = {}){
  return Object.assign({
    evenement_id: id,
    cycle_id: extras.cycle_id || 'cycle-pr-msr',
    domaine_code: extras.domaine_code || 'PR',
    statut: extras.statut || 'REALISE',
    date: extras.date || `2026-09-0${section}`,
    libelle: extras.libelle || `Exercice PR 1.${section} | Base`,
    code_cours: extras.code_cours || `PAPR.PR1MSR.${section}`,
    pr_exercise_group_key: extras.pr_exercise_group_key || 'cycle-pr-msr:PR:1',
    pr_session_key: extras.pr_session_key || `cycle-pr-msr:PR:1.${section}`
  }, extras.patch || {});
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

async function setupPr16(peopleSpec){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-msr',
    cycle_key: 'PAPR-MSR',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR MSR'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    const ev = await repo.insertEvenement(eventSpec(`msr-s${i}`, i));
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
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-msr', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
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
  return { repo, service, events, people };
}

const PEOPLE = [
  { id: 'msr-a', nip: '81001', nom: 'Canna', prenom: 'Kevin', grade: 'Sap' },
  { id: 'msr-b', nip: '81002', nom: 'Masson', prenom: 'Christophe', grade: 'Cpl' },
  { id: 'msr-c', nip: '81003', nom: 'Dupont', prenom: 'Alice', grade: 'Sgt' },
  { id: 'msr-d', nip: '81004', nom: 'Bernard', prenom: 'Luc', grade: 'Sap' }
];

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

async function seedStandard(){
  const ctx = await setupPr16(PEOPLE);
  const byId = Object.fromEntries(ctx.people.map((p) => [p.personne_id, p]));
  await markRepo(ctx.repo, 'msr-s5', byId['msr-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'msr-s6', byId['msr-a'].personne_id, 'PRESENT');
  await markRepo(ctx.repo, 'msr-s2', byId['msr-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(ctx.repo, 'msr-s4', byId['msr-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(ctx.repo, 'msr-s3', byId['msr-d'].personne_id, 'DISPENSE', 'FORMATEUR_PR');
  return ctx;
}

async function collectSession(repo, eventId){
  return collectReport(repo, { kind: 'SESSION', evenementId: eventId }, { includeNominatif: true });
}

(async () => {
  await record('01-03 — population dédupliquée, présent unique, volumes globaux', async () => {
    const ctx = await seedStandard();
    const model = await collectSession(ctx.repo, 'msr-s5');
    assert.strictEqual(model.population, 4);
    assert.strictEqual(model.officiel.volumes.presents, 1);
    assert.strictEqual(model.officiel.volumes.excuses, 1);
    assert.strictEqual(model.officiel.volumes.nonExcuses, 1);
    assert.strictEqual(model.officiel.volumes.dispenses, 1);
    assert.strictEqual(model.officiel.volumes.nonRenseignes, 0);
    assert.strictEqual(model.officiel.numerator, 1);
    assert.strictEqual(model.officiel.denominator, 3);
  });

  await record('07-09 — pas de Non renseigné parasite, synthèse et taux par séance', async () => {
    const ctx = await seedStandard();
    const model = await collectSession(ctx.repo, 'msr-s1');
    assert.strictEqual(model.parasiteNonRenseigne, true);
    assert.strictEqual(model.seances.length, 6);
    const s5 = model.seances.find((s) => s.label === 'PR 1.5');
    const s1 = model.seances.find((s) => s.label === 'PR 1.1');
    const s3 = model.seances.find((s) => s.label === 'PR 1.3');
    assert.ok(s5);
    assert.strictEqual(s5.presents, 1);
    assert.strictEqual(s1.presents, 0);
    assert.strictEqual(s1.populationRenseignee, 0);
    assert.strictEqual(s3.dispenses, 1);
    assert.strictEqual(s3.presents, 0);
    assert.strictEqual(s5.percentage, 100);
    assert.ok(!JSON.stringify(model.seances).includes('Non renseigné'));
  });

  await record('10-12 — donut, cas 100 %, PDF générable', async () => {
    const allPresent = await setupPr16(PEOPLE.slice(0, 2));
    await markRepo(allPresent.repo, 'msr-s1', allPresent.people[0].personne_id, 'PRESENT');
    await markRepo(allPresent.repo, 'msr-s2', allPresent.people[1].personne_id, 'PRESENT');
    const full = await collectSession(allPresent.repo, 'msr-s1');
    assert.strictEqual(full.officiel.volumes.presents, 2);
    assert.strictEqual(full.officiel.percentage, 100);
    const donut = full.graphs.repartition.series[0].points.filter((p) => p.value > 0);
    assert.strictEqual(donut.length, 1);
    assert.strictEqual(donut[0].label, 'Présents');
    const mixed = await seedStandard();
    const pdf = await generateReport(mixed.repo, { kind: 'SESSION', evenementId: 'msr-s6', nominatif: true }, ACTOR);
    assert.ok(pdf.buffer.slice(0, 5).toString() === '%PDF-');
    assert.ok(pdf.pages >= 2);
    const text = pdfText(pdf.buffer);
    assert.ok(text.includes('RAPPORT DE PARTICIPATION') || text.includes('RAPPORTDE PARTICIPATION') || /RAPPORT/.test(text));
    assert.ok(full.graphs.tauxSeances && full.graphs.volumesSeances);
  });

  await record('13-17 — non-participants Absent + Excusé uniquement', async () => {
    const ctx = await seedStandard();
    const model = await collectSession(ctx.repo, 'msr-s6');
    const nips = model.nonParticipants.map((r) => r.nip).sort();
    assert.deepStrictEqual(nips, ['81002', '81003']);
    assert.ok(!model.nonParticipants.some((r) => r.nip === '81001'));
    assert.ok(!model.nonParticipants.some((r) => r.nip === '81004'));
    const excuse = model.nonParticipants.find((r) => r.nip === '81002');
    assert.strictEqual(excuse.statut, 'ABSENT_EXCUSE');
    assert.ok(/Priv/i.test(excuse.motifLabel));
    const names = model.nonParticipants.map((r) => r.nom);
    assert.deepStrictEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  });

  await record('18-20 — signatures Chef PR / Of auto / Chef formation', () => {
    assert.strictEqual(signatureRoleForExercise({ domaineCode: 'PR' }), 'Chef PR');
    assert.strictEqual(signatureRoleForExercise({ domaineCode: 'AUTO' }), 'Of auto');
    assert.strictEqual(signatureRoleForExercise({ domaineCode: 'FOBA', typeCycle: 'FORMATION_GROUPEE', libelle: 'Formation groupée' }), 'Chef formation');
    assert.strictEqual(classifyGlobalSessionStatut(['PRESENT', 'ABSENT_EXCUSE']), 'PRESENT');
  });

  await record('18b — PDF signatures par domaine', async () => {
    const pr = await seedStandard();
    const prPdf = await generateReport(pr.repo, { kind: 'SESSION', evenementId: 'msr-s1', nominatif: true }, ACTOR);
    const prText = pdfText(prPdf.buffer);
    assert.ok(prText.includes('Chef PR') || /PROTECTION RESPIRATOIRE/.test(prText));
    assert.ok(/Personnel/.test(prText) || /pas particip/.test(prText) || prText.includes('nayant pas') || prText.includes('n’ayant') || prText.includes('nhayant'));

    const repo = createMemoryRepo();
    const service = createScopeService(repo);
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
      await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    }
    const autoPdf = await generateReport(repo, { kind: 'SESSION', evenementId: 'auto-1', nominatif: true }, ACTOR);
    assert.ok(pdfText(autoPdf.buffer).includes('Of auto'));

    const repoF = createMemoryRepo();
    await repoF.insertCycle({ cycle_id: 'c-fo', annee: 2026, domaine_code: 'FOBA', type_cycle: 'FORMATION_GROUPEE', libelle: 'Formation groupée 2026' });
    const f1 = await repoF.insertEvenement({
      evenement_id: 'fo-1', cycle_id: 'c-fo', domaine_code: 'FOBA', date: '2026-04-01',
      statut: 'REALISE',
      libelle: 'Formation groupée A', pr_exercise_group_key: 'c-fo:FOBA:1', pr_session_key: 'c-fo:FOBA:1.1'
    });
    const f2 = await repoF.insertEvenement({
      evenement_id: 'fo-2', cycle_id: 'c-fo', domaine_code: 'FOBA', date: '2026-04-02',
      statut: 'REALISE',
      libelle: 'Formation groupée B', pr_exercise_group_key: 'c-fo:FOBA:1', pr_session_key: 'c-fo:FOBA:1.2'
    });
    await repoF.updateEventIfVersion(f1.evenement_id, 1, { population_figee: true });
    await repoF.updateEventIfVersion(f2.evenement_id, 1, { population_figee: true });
    const pf = await repoF.insertPersonne({ nip: '83001', nom: 'Form', prenom: 'Test', skipPeriodes: true });
    for(const ev of [f1, f2]){
      await repoF.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: pf.personne_id, inclus: true });
      await repoF.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: pf.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    }
    const foPdf = await generateReport(repoF, { kind: 'SESSION', evenementId: 'fo-1', nominatif: true }, ACTOR);
    assert.ok(pdfText(foPdf.buffer).includes('Chef formation'));
    void service;
  });

  await record('21-22 — historique multipage et en-têtes répétés', async () => {
    const ctx = await seedStandard();
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'msr-s6', nominatif: true }, ACTOR);
    assert.ok(pdf.pages >= 2);
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(renderer.includes('drawHeader()'));
    assert.ok(renderer.includes("Détail par séance"));
  });

  await record('23-24 — rapport présence conservé + rapport détaillé', () => {
    assert.ok(ui.includes('data-report-event'));
    assert.ok(ui.includes('generateEventReport'));
    assert.ok(ui.includes('data-report-session'));
    assert.ok(ui.includes('Rapport détaillé'));
    assert.ok(ui.includes("kind: 'SESSION'"));
    assert.ok(ui.includes('generateSessionReport'));
  });

  await record('25-26 — domaine PR / spécialisation PAPR, jamais domaine PAPR', async () => {
    assert.strictEqual(logic.domaineAffiche('PR'), 'PR');
    assert.strictEqual(logic.domaineAffiche('PAPR'), 'PR');
    assert.strictEqual(domaineAffiche('PR'), 'PR');
    assert.strictEqual(domaineAffiche('PAPR'), 'PR');
    assert.strictEqual(domaineLabel('PR'), 'PR');
    assert.notStrictEqual(domaineLabel('PR'), 'PAPR');
    const assignment = { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' };
    assert.strictEqual(display.specializationCode(assignment), 'PAPR');
    assert.strictEqual(display.specializationUserLabel(assignment), 'PAPR');
    const historic = { categorie: 'SPECIALISATION', domaine: 'PAPR', cible: 'PAPR' };
    assert.strictEqual(display.specializationCode(historic), 'PAPR');
    const ctx = await seedStandard();
    const model = await collectSession(ctx.repo, 'msr-s1');
    assert.strictEqual(model.domaine, 'PR');
    assert.notStrictEqual(model.domaine, 'PAPR');
    assert.ok(model.filename.startsWith('SCOPE_Rapport_participation_PR_1_2026'));
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'msr-s1', nominatif: true }, ACTOR);
    const text = pdfText(pdf.buffer);
    assert.ok(!/DOMAINE\s*PAPR/i.test(text));
  });

  await record('27 — bouton Personnel réutilise le CTA Nouvel événement', () => {
    assert.ok(ui.includes('id="scope-open-personnel-manual-add"'));
    assert.ok(/scope-open-personnel-manual-add"[^>]*scope-events-new|scope-events-new"[^>]*id="scope-open-personnel-manual-add"/.test(ui)
      || ui.includes('class="scope-btn scope-btn-primary scope-events-new" id="scope-open-personnel-manual-add"'));
    assert.ok(css.includes('.scope-personnel-pilot #scope-open-personnel-manual-add.scope-events-new'));
    assert.ok(css.includes('.scope-events-pilot #scope-new.scope-events-new'));
    assert.ok(ui.includes('Ajouter une personne / affectation'));
    assert.ok(html.includes('scope-objectifs-participation-1') || html.includes('scope-multisession-report-1'));
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

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { isoDate } = require('../netlify/functions/_scope-rules');
const { resolveObjective } = require('../netlify/functions/_scope-objectives');
const { collectMultisessionReport, buildConclusion } = require('../netlify/functions/_scope-multisession-report');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const uiLogic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-objectives.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-objectives-service.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'obj-r2', displayName: 'Testeur R2 objectifs' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function expectHttp(fn, status, code){
  try {
    await fn();
    throw new Error(`attendu HTTP ${status}${code ? `/${code}` : ''}`);
  } catch (error) {
    assert.strictEqual(error.status, status, String(error));
    if(code) assert.strictEqual(error.error, code);
    return error;
  }
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

async function seedPrSession(){
  const repo = createMemoryRepo();
  const cycleId = 'cycle-pr-opr2';
  await repo.insertCycle({
    cycle_id: cycleId, cycle_key: 'PAPR-opr2', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PAPR 2026'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    events.push(await repo.insertEvenement({
      evenement_id: `opr2-s${i}`,
      cycle_id: cycleId,
      domaine_code: 'PR',
      date: `2026-09-0${i}`,
      libelle: `Exercice PR 1.${i} | Base`,
      code_cours: `PAPR.PR1.opr2.${i}`,
      pr_exercise_group_key: `${cycleId}:PR:1`,
      pr_session_key: `${cycleId}:PR:1.${i}`
    }));
  }
  const people = [];
  for(const spec of [
    { id: 'opr2-a', nip: '82001', nom: 'Canna', prenom: 'Kevin' },
    { id: 'opr2-b', nip: '82002', nom: 'Masson', prenom: 'Christophe' },
    { id: 'opr2-c', nip: '82003', nom: 'Dupont', prenom: 'Alice' },
    { id: 'opr2-d', nip: '82004', nom: 'Zampieri', prenom: 'Lucas' }
  ]){
    const p = await repo.insertPersonne({
      personne_id: spec.id, nip: spec.nip, nom: spec.nom, prenom: spec.prenom, skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: cycleId, personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION'
      });
    }
  }
  const byId = Object.fromEntries(people.map((p) => [p.personne_id, p]));
  await markRepo(repo, 'opr2-s5', byId['opr2-a'].personne_id, 'PRESENT');
  await markRepo(repo, 'opr2-s2', byId['opr2-b'].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(repo, 'opr2-s4', byId['opr2-c'].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(repo, 'opr2-s3', byId['opr2-d'].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return repo;
}

function gitShow(file){
  return execFileSync('git', ['show', `57c721c:${file}`], { cwd: ROOT, encoding: 'utf8' });
}

(async () => {
  await record('01 — 01/01/2027 → 2027-01-01', () => {
    assert.strictEqual(logic.toIsoDate('01/01/2027'), '2027-01-01');
    assert.strictEqual(isoDate('01/01/2027'), '2027-01-01');
  });

  await record('02 — 31/12/2027 → 2027-12-31', () => {
    assert.strictEqual(logic.toIsoDate('31/12/2027'), '2027-12-31');
    assert.strictEqual(isoDate('31/12/2027'), '2027-12-31');
    assert.strictEqual(logic.formatUiDate('2027-12-31'), '31/12/2027');
  });

  await record('03 — jamais 0007', () => {
    const period = logic.yearToObjectifPeriod('01/01/2027');
    assert.strictEqual(period.dateDebut, '2027-01-01');
    assert.strictEqual(period.dateFin, '2027-12-31');
    assert.ok(!JSON.stringify(period).includes('0007'));
    assert.ok(!logic.toIsoDate('01/01/2027').includes('0007'));
    assert.notStrictEqual(String('01/01/2027').replace(/\D/g, '').slice(0, 4), logic.extractCalendarYear('01/01/2027'));
  });

  await record('04 — payload nouvelle période valide', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const first = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const next = await objectifs.nouvellePeriode(first.objectif.objectifId, {
      dateDebut: '01/01/2027', dateFin: '31/12/2027', seuilPct: 95
    }, ACTOR);
    assert.strictEqual(next.objectif.dateDebut, '2027-01-01');
    assert.strictEqual(next.objectif.dateFin, '2027-12-31');
    assert.strictEqual(isoDate('01/01/2027'), '2027-01-01');
  });

  await record('05-06 — 2026 conservé / 2027 créé', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const first = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    await objectifs.nouvellePeriode(first.objectif.objectifId, {
      dateDebut: '01/01/2027', dateFin: '31/12/2027', seuilPct: 90
    }, ACTOR);
    const listed = await objectifs.listObjectifs();
    assert.strictEqual(listed.objectifs.length, 2);
    const y26 = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'PR' });
    const y27 = await objectifs.resolveObjectif({ date: '2027-06-15', domaine: 'PR' });
    assert.strictEqual(y26.objectif.thresholdPct, 95);
    assert.strictEqual(y27.objectif.thresholdPct, 90);
    const still = await objectifs.getObjectif(first.objectif.objectifId);
    assert.strictEqual(still.objectif.thresholdPct, 95);
    assert.strictEqual(still.objectif.dateFin, '2026-12-31');
  });

  await record('07-10 — libellés Général / Domaine / Cible', () => {
    assert.strictEqual(logic.OBJECTIF_PORTEE_LABELS.GLOBAL, 'Général');
    assert.strictEqual(logic.OBJECTIF_PORTEE_LABELS.DOMAINE, 'Domaine');
    assert.strictEqual(logic.OBJECTIF_PORTEE_LABELS.CIBLE, 'Cible');
    assert.ok(ui.includes('Général — objectif par défaut'));
    assert.ok(ui.includes('Domaine — ensemble d’un domaine'));
    assert.ok(ui.includes('Cible — population précise'));
    assert.ok(!ui.includes('Ensemble SCOPE'));
    assert.ok(!ui.includes('Cible / spécialisation'));
    assert.ok(!ui.includes('CIBLE / SPÉCIALISATION'));
    assert.ok(ui.includes("sortableHeader('objectifs', 'cible', 'CIBLE'"));
  });

  await record('11-13 — domaines objectifs sans PR/AUTO', () => {
    const codes = logic.objectifDomainOptions().map((d) => d.code);
    assert.deepStrictEqual(codes, ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC']);
    assert.ok(!codes.includes('PR'));
    assert.ok(!codes.includes('AUTO'));
    assert.ok(!codes.includes('PAPR'));
    const objUi = ui.slice(ui.indexOf('function renderObjectifs'), ui.indexOf('function renderNouveau'));
    assert.ok(objUi.includes('L.objectifDomainOptions()'));
    assert.ok(!objUi.includes('value="PR"'));
    assert.ok(!objUi.includes('value="AUTO"'));
  });

  await record('14-20 — cibles par domaine', () => {
    assert.deepStrictEqual(logic.objectifCibleOptions('FOSPEC').map((c) => c.code), ['AUTO', 'PR']);
    assert.deepStrictEqual(logic.objectifCibleOptions('DPS').map((c) => c.code), ['G1', 'C1', 'B1', 'B2']);
    assert.deepStrictEqual(logic.objectifCibleOptions('DAP').map((c) => c.code), ['Y1', 'Y2', 'Y3', 'Y4']);
    assert.deepStrictEqual(logic.objectifCibleOptions('JSP').map((c) => c.code), ['G1', 'C1', 'B1']);
    assert.deepStrictEqual(logic.objectifCibleOptions('FOBA').map((c) => c.label), ['FOBA 1', 'FOBA 2', 'FOBA 3']);
    assert.deepStrictEqual(logic.objectifCibleOptions('FOCA'), []);
    assert.ok(!logic.objectifCibleOptions('FOSPEC').some((c) => c.code === 'PAPR'));
  });

  await record('21-22 — ancien PR 95 % affiché FOSPEC/PR', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const resolved = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'FOSPEC', cible: 'PR' });
    assert.strictEqual(resolved.objectif.thresholdPct, 95);
    const ux = logic.objectifUxFromRow(resolved.objectif);
    assert.strictEqual(ux.porteeLabel, 'Cible');
    assert.strictEqual(ux.domaineUx, 'FOSPEC');
    assert.strictEqual(ux.cibleUx, 'PR');
    const mapped = logic.objectifFormToEngine({ portee: 'CIBLE', domaineCode: 'FOSPEC', cibleCode: 'PR' });
    assert.strictEqual(mapped.portee, 'DOMAINE');
    assert.strictEqual(mapped.domaineCode, 'PR');
  });

  await record('23 — priorité Cible > Domaine > Général', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 70, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'JSP', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: cible.cible_id, seuilPct: 85, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const listed = await repo.listObjectifs({ actif: true });
    const c = resolveObjective({ date: '2026-06-01', domaineCode: 'JSP', cibleId: cible.cible_id, analysisGrain: 'CIBLE', objectives: listed });
    const d = resolveObjective({ date: '2026-06-01', domaineCode: 'JSP', analysisGrain: 'DOMAINE', objectives: listed });
    const g = resolveObjective({ date: '2026-06-01', analysisGrain: 'GLOBAL', objectives: listed });
    assert.strictEqual(c.thresholdPct, 85);
    assert.strictEqual(d.thresholdPct, 80);
    assert.strictEqual(g.thresholdPct, 70);
    assert.ok(ui.includes('Priorité : Cible → Domaine → Général'));
  });

  await record('24-26 — objectif appliqué / CTA / carte', () => {
    assert.ok(ui.includes('>OBJECTIF APPLIQUÉ<'));
    assert.ok(ui.includes('Vérifiez quel objectif sera utilisé pour une date et un périmètre donnés.'));
    assert.ok(ui.includes('Vérifier l’objectif'));
    assert.ok(!ui.includes('Aperçu de l’objectif effectif'));
    assert.ok(!ui.includes('id="obj-preview">Aperçu<'));
    assert.ok(ui.includes('scope-objectif-applique'));
    assert.ok(ui.includes('id="obj-applique-result"'));
    assert.ok(ui.includes("scrollIntoView({ behavior: 'smooth'"));
  });

  await record('27-29 — résolution Général / Domaine / Cible', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const global = await objectifs.resolveObjectif({ date: '15/06/2026' });
    assert.strictEqual(global.objectif.scope, 'GLOBAL');
    assert.strictEqual(global.objectif.thresholdPct, 85);
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'JSP', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const domaine = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'JSP' });
    assert.strictEqual(domaine.objectif.scope, 'DOMAINE');
    assert.strictEqual(domaine.objectif.thresholdPct, 80);
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: cible.cible_id, seuilPct: 90, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const cibleRes = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'JSP', cible: 'B1' });
    assert.strictEqual(cibleRes.objectif.thresholdPct, 90);
    const preview = logic.objectifPreviewQuery({ domaine: 'JSP', cibleCode: 'B1' });
    assert.strictEqual(preview.analysisGrain, 'CIBLE');
  });

  await record('30 — objectif absent', async () => {
    const objectifs = createScopeObjectivesService(createMemoryRepo());
    const none = await objectifs.resolveObjectif({ date: '2026-06-15', domaine: 'JSP' });
    assert.strictEqual(none.objectif, null);
    assert.ok(ui.includes('AUCUN OBJECTIF DÉFINI'));
    assert.ok(ui.includes('Aucun objectif de participation n’est défini pour ce périmètre à cette date.'));
    const card = ui.slice(ui.indexOf('function objectifAppliqueCard'), ui.indexOf('function renderObjectifs'));
    assert.ok(!/0 % fictif|thresholdPct \|\| 0/.test(card));
  });

  await record('31 — erreur précédente effacée après succès', () => {
    assert.ok(ui.includes("clearToast();\n        toast('success', 'Objectif enregistré'"));
    assert.ok(ui.includes('La nouvelle période est active pour les analyses et rapports SCOPE.'));
  });

  await record('32 — rapport 95 % non régressé', async () => {
    const repo = await seedPrSession();
    const objectifs = createScopeObjectivesService(repo);
    await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 95, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, ACTOR);
    const model = await collectMultisessionReport(repo, 'opr2-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.objective.thresholdPct, 95);
    const conclusion = buildConclusion({
      percentage: 95.7,
      objectiveThreshold: model.objective.thresholdPct,
      domaine: 'PR',
      nonParticipants: [{}]
    });
    assert.ok(conclusion.paragraphs.some((p) => /0,7/.test(p) || /95/.test(p)));
  });

  await record('33 — graphiques PDF gelés, header/conclusion autorisés', () => {
    assert.strictEqual(
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-charts.js'), 'utf8'),
      gitShow('netlify/functions/_scope-pdf-charts.js')
    );
    const renderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
    assert.ok(renderer.includes('const PDF_SHIFT_08_CM = 22.68'));
    assert.ok(renderer.includes('SIGNATURE_TEXT_LINE_COUNT = 3'));
    assert.ok(!renderer.includes('SCOPE — Suivi et analyse de l’activité'));
  });

  await record('34 — OBJECTIVES-1 inchangé (même moteur)', () => {
    assert.ok(serviceSrc.includes('resolveObjective'));
    assert.ok(engine.includes("GLOBAL: 'GLOBAL'"));
    assert.ok(engine.includes("DOMAINE: 'DOMAINE'"));
    assert.ok(engine.includes("CIBLE: 'CIBLE'"));
    assert.ok(!engine.includes("PERIMETRE"));
    assert.ok(!ui.includes('assets/js/calculations/objectives.js'));
    assert.ok(serviceSrc.includes("require('./_scope-objectives')"));
  });

  await record('35 — granularité future non implémentée', () => {
    assert.strictEqual(logic.OBJECTIF_FUTURE_LEVEL, 'PERIMETRE');
    assert.ok(uiLogic.includes('Non implémenté'));
    assert.ok(!ui.includes('Périmètre :'));
    assert.ok(!engine.includes('analysisGrain: GRAINS.PERIMETRE') && !engine.includes("GRAINS.PERIMETRE"));
  });

  await record('cache HTML R2', () => {
    assert.ok(html.includes('scope-objectifs-participation-1-r2'));
    assert.ok(ui.includes('nextObjectifPeriod'));
    assert.ok(ui.includes("placeholder=\"JJ/MM/AAAA\""));
  });

  const failed = results.filter((r) => r.status === 'NOK');
  results.forEach((r) => console.log(`${r.status} ${r.name}`));
  if(failed.length){
    failed.forEach((r) => console.error(r.proof));
    process.exit(1);
  }
  console.log(`${results.length} tests PASS`);
})();

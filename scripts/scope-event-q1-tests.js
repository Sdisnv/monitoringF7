#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { HttpError } = require('../netlify/lib/_scope-rules');
const { officialFromQuantitatif, KINDS, STATUTS, MODES } = require('../netlify/lib/_scope-analytics');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv');
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
    assert.ok(error instanceof HttpError, `HttpError attendu, reçu ${error && error.stack || error}`);
    assert.strictEqual(error.status, status, `status ${error.status} ≠ ${status} (${error.error})`);
    if(code) assert.strictEqual(error.error, code, `code ${error.error} ≠ ${code}`);
    return error;
  }
}

async function withBascule(repo){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: '2026-08-19',
    commentaire: 'Pilote nominatif DAP/Y4'
  });
}

async function createQty(service, repo, { date, domaine, niveau, libelle }){
  const cible = await repo.findCible(domaine, niveau);
  const created = await service.createEvenement({
    date,
    domaineCode: domaine,
    libelle,
    cibleIds: [cible.cible_id],
    modeSuivi: 'QUANTITATIF'
  }, { sub: 'test' });
  return { evenement: created.evenement, cible, version: created.version };
}

const VOLUMES = { attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 1 };

(async () => {
  await record('1 — création QUANTITATIF', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement } = await createQty(service, repo, {
      date: '2026-09-01', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT création'
    });
    assert.strictEqual(evenement.mode_suivi, MODES.QUANTITATIF);
    assert.strictEqual(evenement.statut, 'PLANIFIE');
    assert.strictEqual(evenement.origine, 'NOMINATIF');
  });

  await record('2-4 — aucun nominatif fictif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-01', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT sans nominatif'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    assert.strictEqual(await repo.countTable('scope_attendus'), 0);
    assert.strictEqual(await repo.countTable('scope_participations'), 0);
    assert.strictEqual(await repo.countTable('scope_personnes'), 0);
    assert.strictEqual(await repo.countTable('scope_saisies_quantitatives'), 1);
  });

  await record('5-7 — saisie 20/17/1/1/1 = 17/19 = 89,5 %, dispensé exclu', async () => {
    const official = officialFromQuantitatif({
      nb_attendus: 20, nb_presents: 17, nb_excuses: 1, nb_non_excuses: 1, nb_dispenses: 1
    });
    assert.strictEqual(official.numerator, 17);
    assert.strictEqual(official.denominator, 19);
    assert.strictEqual(official.percentage, 89.5);
    assert.strictEqual(official.kind, KINDS.OFFICIEL);
    assert.strictEqual(official.volumes.dispenses, 1);
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-02', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT 20-17'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    const closed = await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    assert.strictEqual(closed.taux.numerator, 17);
    assert.strictEqual(closed.taux.denominator, 19);
    assert.strictEqual(closed.taux.percentage, 89.5);
    const taux = await service.tauxEvenement(evenement.evenement_id);
    assert.strictEqual(taux.officiel, true);
    assert.strictEqual(taux.kind, 'OFFICIEL');
    assert.strictEqual(taux.percentage, 89.5);
  });

  await record('8 — égalité incorrecte refusée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-03', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT égalité'
    });
    await expectHttp(() => service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 0
    }, { sub: 'test' }), 422, 'volumes_incoherents');
  });

  await record('9 — valeur négative refusée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-04', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT négatif'
    });
    await expectHttp(() => service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, attendus: 20, presents: -1, excuses: 10, nonExcuses: 11, dispenses: 0
    }, { sub: 'test' }), 422, 'volume_negatif');
  });

  await record('10-11 — sauvegarde sans clôture + baseVersion', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-05', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT save'
    });
    const saved = await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    assert.strictEqual(saved.version, version + 1);
    assert.strictEqual(saved.evenement.statut, 'PLANIFIE');
    const fiche = await service.lireEvenement(evenement.evenement_id);
    assert.strictEqual(fiche.saisieQuantitative.nb_presents, 17);
    const journal = fiche.journal.map((j) => j.action);
    assert.ok(journal.includes('SAISIE_QUANTITATIVE'));
    const analytics = createScopeAnalyticsService(repo);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
  });

  await record('12 — stale baseVersion → 409', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-06', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT 409'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'a' });
    const err = await expectHttp(() => service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'b' }), 409, 'conflict');
    assert.ok(err.message);
    const ui = logic.friendlyError(err);
    assert.strictEqual(ui.conflict, true);
    assert.ok(ui.message.includes('modifiée ailleurs'));
  });

  await record('13-18 — clôture + analytics officiel / explain / timeseries / filtres', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-07', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT analytics'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    const closed = await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    const q = { from: '2026-01-01', to: '2026-12-31' };
    const summary = await analytics.summary(q);
    assert.strictEqual(summary.officiel.numerator, 17);
    assert.strictEqual(summary.officiel.denominator, 19);
    assert.strictEqual(summary.officiel.percentage, 89.5);
    assert.strictEqual(summary.officiel.eventCount, 1);
    assert.strictEqual(summary.officiel.kind, KINDS.OFFICIEL);
    const explain = await analytics.explain(q);
    assert.strictEqual(explain.totals.numerator, summary.officiel.numerator);
    assert.strictEqual(explain.totals.denominator, summary.officiel.denominator);
    assert.strictEqual(explain.totals.percentage, summary.officiel.percentage);
    assert.strictEqual(explain.kind, KINDS.OFFICIEL);
    assert.ok(explain.includedEvents.some((e) => e.evenementId === evenement.evenement_id && e.kind === KINDS.OFFICIEL));
    const series = await analytics.timeseries(q);
    assert.ok(series.officiel.some((p) => p.kind === KINDS.OFFICIEL && p.eventCount >= 1 && p.percentage === 89.5));
    const byDomaine = await analytics.summary({ ...q, domaine: 'DPS' });
    assert.strictEqual(byDomaine.officiel.eventCount, 1);
    const otherDomaine = await analytics.summary({ ...q, domaine: 'FOBA' });
    assert.strictEqual(otherDomaine.officiel.eventCount, 0);
    const byCible = await analytics.summary({ ...q, cible: 'DPS/G1' });
    assert.strictEqual(byCible.officiel.eventCount, 1);
    const otherCible = await analytics.summary({ ...q, cibleId: (await repo.findCible('DPS', 'C1')).cible_id });
    assert.strictEqual(otherCible.officiel.eventCount, 0);
    const grain = await analytics.summary({ ...q, evenementId: evenement.evenement_id });
    assert.strictEqual(grain.officiel.eventCount, 1);
    assert.strictEqual(g1.domaine_code, 'DPS');
  });

  await record('19-20 — réouverture sort du KPI, reclôture réintègre', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-08', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT réouverture'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    const reopened = await service.reouvrir(evenement.evenement_id, {
      baseVersion: version + 2, motif: 'Correction volumes qualification'
    }, { sub: 'test' });
    assert.strictEqual(reopened.evenement.statut, 'PLANIFIE');
    const saisie = await repo.getQuantitatifSaisie(evenement.evenement_id);
    assert.strictEqual(saisie.nb_presents, 17);
    const afterOpen = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(afterOpen.officiel.eventCount, 0);
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: reopened.version, attendus: 10, presents: 8, excuses: 1, nonExcuses: 1, dispenses: 0
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: reopened.version + 1 }, { sub: 'test' });
    const afterClose = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(afterClose.officiel.numerator, 8);
    assert.strictEqual(afterClose.officiel.denominator, 10);
    assert.strictEqual(afterClose.officiel.eventCount, 1);
  });

  await record('21 — denominator 0 → NON_EVALUABLE', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-09', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT denom 0'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, attendus: 4, presents: 0, excuses: 0, nonExcuses: 0, dispenses: 4
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 0);
    assert.strictEqual(summary.officiel.denominator, 0);
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('22 — NOMINATIF → QUANTITATIF interdit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-09-10', domaineCode: 'DPS', libelle: 'TEST NOM', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    assert.strictEqual(created.evenement.mode_suivi, MODES.NOMINATIF);
    await expectHttp(
      () => service.convertirQuantitatif(created.evenement.evenement_id, { baseVersion: 1, confirmation: true }, { sub: 'test' }),
      422,
      'conversion_interdite'
    );
  });

  await record('23-24 — QUANTITATIF → NOMINATIF avant clôture, volumes détruits seulement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const personne = await repo.insertPersonne({ nip: 'KEEP01', nom: 'Keep', prenom: 'Personne' });
    const { evenement, version, cible } = await createQty(service, repo, {
      date: '2026-09-11', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT convert'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    await expectHttp(
      () => service.convertirNominatif(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' }),
      400,
      'confirmation_requise'
    );
    const converted = await service.convertirNominatif(evenement.evenement_id, {
      baseVersion: version + 1, confirmation: true
    }, { sub: 'test' });
    assert.strictEqual(converted.evenement.mode_suivi, MODES.NOMINATIF);
    assert.strictEqual(await repo.getQuantitatifSaisie(evenement.evenement_id), null);
    assert.strictEqual(await repo.countTable('scope_saisies_quantitatives'), 0);
    assert.ok(await repo.getPersonne(personne.personne_id));
    assert.strictEqual((await repo.listAttendus(evenement.evenement_id)).length, 0);
    await service.cloturer(evenement.evenement_id, { baseVersion: converted.version }, { sub: 'test' }).then(
      () => { throw new Error('clôture nominative sans gel devrait échouer'); },
      (error) => { assert.strictEqual(error.status, 422); }
    );
  });

  await record('conversion après clôture refusée, réouvrir d’abord', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-12', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT convert après'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    await expectHttp(
      () => service.convertirNominatif(evenement.evenement_id, { baseVersion: version + 2, confirmation: true }, { sub: 'test' }),
      422,
      'statut_invalide'
    );
  });

  await record('25-26 — LEGACY inchangé, ANNULE exclu', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const before = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    const legacyCount = before.legacy.eventCount;
    const { evenement, version } = await createQty(service, repo, {
      date: '2026-09-13', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT vs legacy'
    });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, ...VOLUMES
    }, { sub: 'test' });
    await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 'test' });
    const g1 = await repo.findCible('DPS', 'G1');
    const nom = await service.createEvenement({
      date: '2026-09-14', domaineCode: 'DPS', libelle: 'TEST ANNULE Q1', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.annulerEvenement(nom.evenement.evenement_id, { baseVersion: 1, motif: 'Qualification' }, { sub: 'test' });
    const after = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(after.legacy.eventCount, legacyCount);
    assert.strictEqual(after.officiel.eventCount, 1);
    assert.strictEqual(after.officiel.percentage, 89.5);
    const explain = await analytics.explain({ from: '2026-01-01', to: '2026-12-31' });
    assert.ok(explain.excludedEvents.some((e) => e.evenementId === nom.evenement.evenement_id && e.reason === 'annule'));
    const dapY2 = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', domaine: 'DAP', cible: 'DAP/Y2' });
    assert.strictEqual(dapY2.officiel.eventCount, 0);
    assert.strictEqual(dapY2.legacy.eventCount, 1);
  });

  await record('LEGACY interdit à la création manuelle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await expectHttp(() => service.createEvenement({
      date: '2026-09-15', domaineCode: 'DPS', libelle: 'Nope', cibleIds: [g1.cible_id], modeSuivi: 'LEGACY'
    }, { sub: 'test' }), 400, 'mode_legacy_interdit');
  });

  await record('suggestion de mode + cibles divergentes', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const g1 = await repo.findCible('DPS', 'G1');
    const nom = await service.suggestModeSuivi({ date: '2026-08-19', cibles: y4.cible_id });
    assert.strictEqual(nom.suggested, MODES.NOMINATIF);
    const qty = await service.suggestModeSuivi({ date: '2026-08-18', cibles: y4.cible_id });
    assert.strictEqual(qty.suggested, MODES.QUANTITATIF);
    const mixed = await service.suggestModeSuivi({ date: '2026-08-19', cibles: `${y4.cible_id},${g1.cible_id}` });
    assert.strictEqual(mixed.suggested, null);
    assert.strictEqual(mixed.requireExplicit, true);
    assert.strictEqual(mixed.reason, 'cibles_divergentes');
  });

  await record('preview taux serveur, pas de formule UI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement } = await createQty(service, repo, {
      date: '2026-09-16', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT preview'
    });
    const preview = await service.previewTauxQuantitatif(evenement.evenement_id, VOLUMES);
    assert.strictEqual(preview.valide, true);
    assert.strictEqual(preview.officiel, false);
    assert.strictEqual(preview.taux.percentage, 89.5);
    assert.strictEqual(preview.taux.source, 'PREVIEW');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(!ui.includes('attendus - dispenses'));
    assert.ok(!ui.includes('presents / (presents +'));
  });

  await record('27 — UI / responsive non régressée', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('Saisir les présences'));
    assert.ok(ui.includes('Taux officiel SCOPE'));
    assert.ok(ui.includes('Nominatif'));
    assert.ok(ui.includes('Quantitatif'));
    assert.ok(!ui.includes('quantitative record'));
    assert.ok(!ui.includes('agrégat') || ui.includes('Aucun agrégat'));
    assert.ok(css.includes('scope-qty-form'));
    assert.ok(css.includes('max-width: 768px'));
    assert.ok(!/min-width:\s*980px/.test(css));
    assert.ok(ui.includes('assets/img/logo-scope-blanc.png'));
    assert.deepStrictEqual(logic.principalCta({ statut: 'PLANIFIE', modeSuivi: 'QUANTITATIF' }), {
      action: 'saisir-volumes',
      label: 'Saisir les présences'
    });
    assert.strictEqual(logic.principalCta({ statut: 'PLANIFIE', populationFigee: false }).action, 'generer');
    assert.ok(logic.volumesEquality(VOLUMES));
    assert.ok(!logic.volumesEquality({ attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 0 }));
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
    assert.ok(schema.includes('scope-event-q1'));
    assert.ok(schema.includes('scope_saisies_quantitatives'));
    const api = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(api.includes('/evenements/:id/saisie-quantitative'));
    assert.ok(api.includes('/mode-suivi-suggere'));
  });

  await record('preview / figer refusés en QUANTITATIF', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement } = await createQty(service, repo, {
      date: '2026-09-17', domaine: 'DPS', niveau: 'G1', libelle: 'TEST QTT no freeze'
    });
    await expectHttp(() => service.previewAttendus(evenement.evenement_id), 422, 'mode_quantitatif');
    await expectHttp(
      () => service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' }),
      422,
      'mode_quantitatif'
    );
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

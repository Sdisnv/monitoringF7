#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const logic = require('../assets/js/scope-ui-logic.js');
const { createDemoClient } = require('../assets/js/scope-demo.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

(async () => {
  await record('Test UI 1 — 15 attendus, 13 présents, 1 maladie, 1 absent → 86,7 %', async () => {
    const client = createDemoClient();
    const refs = await client.referentiels();
    const g1 = refs.cibles.find((c) => c.domaineCode === 'DPS' && c.niveauCode === 'G1');
    const created = await client.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Habileté incendie', cibleIds: [g1.cibleId]
    });
    const id = created.evenement.evenement_id;
    const preview = await client.previewAttendus(id);
    assert.strictEqual(preview.count, 15);
    await client.figer(id, 1);
    const fiche = await client.getEvenement(id);
    const people = fiche.attendus.filter((a) => a.inclus !== false).map((a) => a.personne_id);
    const payload = people.map((personneId, i) => {
      if (i === 13) return { personneId, statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' };
      if (i === 14) return { personneId, statut: 'ABSENT_NON_EXCUSE' };
      return { personneId, statut: 'PRESENT' };
    });
    await client.enregistrerParticipations(id, payload, 2);
    const closed = await client.cloturer(id, 3);
    assert.strictEqual(closed.taux.numerator, 13);
    assert.strictEqual(closed.taux.denominator, 15);
    assert.strictEqual(closed.taux.percentage, 86.7);
    assert.strictEqual(logic.formatTaux(closed.taux.percentage), '86,7 %');
    assert.strictEqual(logic.displayTauxForList('PLANIFIE', false, 86.7), '—');
  });

  await record('Test UI 2 — 40 attendus, 34/3/2/1 → 87,2 %', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    for (let i = 1; i <= 40; i += 1) {
      const personne = await repo.insertPersonne({ nip: `U2${String(i).padStart(3, '0')}`, nom: `Nom${i}`, prenom: 'Test' });
      await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: g1.cible_id, date_debut: '2026-01-01' });
    }
    const { evenement } = await service.createEvenement({
      date: '2026-03-19', domaineCode: 'DPS', libelle: 'Manœuvre groupée', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const fiche = await service.lireEvenement(evenement.evenement_id);
    const people = fiche.attendus.filter((a) => a.inclus !== false).map((a) => a.personne_id);
    assert.strictEqual(people.length, 40);
    const payload = people.map((personneId, i) => {
      if (i < 34) return { personneId, statut: 'PRESENT' };
      if (i < 37) return { personneId, statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' };
      if (i < 39) return { personneId, statut: 'ABSENT_NON_EXCUSE' };
      return { personneId, statut: 'DISPENSE' };
    });
    await service.enregistrerParticipations(evenement.evenement_id, { baseVersion: 2, participations: payload }, { sub: 'test' });
    const closed = await service.cloturer(evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' });
    assert.strictEqual(closed.taux.presents, 34);
    assert.strictEqual(closed.taux.excuses, 3);
    assert.strictEqual(closed.taux.nonExcuses, 2);
    assert.strictEqual(closed.taux.dispenses, 1);
    assert.strictEqual(closed.taux.percentage, 87.2);
    assert.strictEqual(logic.formatTaux(87.2), '87,2 %');
  });

  await record('Test UI 3 — NON_RENSEIGNE : clôture autorisée après confirmation UI', async () => {
    const rows = [
      { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' },
      { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' }
    ];
    const counters = logic.liveCounters(rows);
    assert.strictEqual(counters.open, 1);
    assert.strictEqual(logic.clotureDisabled(counters), false);
    const blockers = logic.closureBlockers(rows);
    assert.strictEqual(blockers.open, 1);
    assert.strictEqual(blockers.incompleteExcuses, 0);
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const personne = await repo.insertPersonne({ nip: 'NR001', nom: 'Ouvert', prenom: 'Cas' });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: g1.cible_id, date_debut: '2026-01-01' });
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Non renseigné', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const closed = await service.cloturer(evenement.evenement_id, { baseVersion: 2 }, { sub: 'test' });
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.strictEqual(closed.taux.nonRenseignes, 1);
    assert.strictEqual(closed.taux.denominator, 0);
  });

  await record('Test UI 4 — 409 message + aucun écrasement', async () => {
    const client = createDemoClient({ forceConflict: true });
    const refs = await client.referentiels();
    const g1 = refs.cibles.find((c) => c.domaineCode === 'DPS' && c.niveauCode === 'G1');
    const created = await client.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Conflit', cibleIds: [g1.cibleId]
    });
    const before = await client.getEvenement(created.evenement.evenement_id);
    await assert.rejects(
      () => client.patchEvenement(created.evenement.evenement_id, { libelle: 'écrasé' }, before.version),
      (error) => error.status === 409 && error.error === 'conflict'
    );
    const after = await client.getEvenement(created.evenement.evenement_id);
    assert.strictEqual(after.evenement.libelle, 'Conflit');
    assert.strictEqual(after.version, before.version);
    const info = logic.friendlyError({ status: 409, error: 'conflict' });
    assert.strictEqual(info.conflict, true);
    assert.ok(info.message.includes('Cette séance a été modifiée ailleurs'));
  });

  await record('Test UI 5 — tablette 768, pas de débordement horizontal', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(!/min-width:\s*980px/.test(css));
    assert.ok(/max-width:\s*1340px/.test(css) || /--scope-max:\s*1340px/.test(css));
    assert.ok(/overflow-x:\s*hidden/.test(css));
    assert.ok(/@media \(max-width: 800px\)/.test(css));
    assert.ok(/min-height:\s*44px/.test(css));
    assert.ok(css.includes('--scope-red: #DE000A'));
    assert.ok(css.includes('--scope-fs-body: 15px'));
    assert.ok(css.includes('object-fit: contain'));
    assert.ok(/grid-template-columns:\s*1fr 1fr/.test(css));
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    assert.ok(!/min-width:\s*980px/.test(html));
    assert.ok(html.includes('viewport'));
  });

  await record('Liste événements + CTA unique + nav P0', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Liste', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DPS' });
    assert.strictEqual(listed.evenements.length, 1);
    assert.ok(listed.evenements[0].evenement.libelle === 'Liste');
    assert.deepStrictEqual(logic.principalCta({ statut: 'PLANIFIE', populationFigee: false, previewReady: false }).action, 'generer');
    assert.deepStrictEqual(logic.principalCta({ statut: 'PLANIFIE', populationFigee: false, previewReady: true }).action, 'figer');
    assert.deepStrictEqual(logic.principalCta({ statut: 'PLANIFIE', populationFigee: true, previewReady: true }).action, 'saisir');
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Vue d’ensemble'));
    assert.ok(ui.includes('Événements'));
    assert.ok(ui.includes('Personnel'));
    assert.ok(ui.includes('assets/img/logo-scope-blanc.png'));
    assert.ok(ui.includes('assets/img/LogoSDISseulnoir.png'));
    assert.ok(ui.includes('scope-logo'));
    assert.ok(ui.includes('scope-sdis-logo'));
    assert.ok(!ui.includes('<h1>SCOPE</h1>'));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/logo-scope-blanc.png')));
    assert.ok(!html.includes('Monitoring F7 v67.0'));
    assert.ok(logic.parseHash('#/exercices').screen === 'liste');
    const ctaCount = logic.principalCta({ statut: 'PLANIFIE', populationFigee: true });
    assert.ok(ctaCount && ctaCount.action === 'saisir');
  });

  await record('Tout présent n’écrase pas l’encadrement', async () => {
    const rows = [
      { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
      { inclus: true, role: 'FORMATEUR', statut: 'NON_CONCERNE' }
    ];
    const next = logic.applyAllPresent(rows);
    assert.strictEqual(next[0].statut, 'PRESENT');
    assert.strictEqual(next[1].statut, 'NON_CONCERNE');
    assert.strictEqual(logic.needsConfirmAllPresent(rows), false);
    assert.strictEqual(logic.needsConfirmAllPresent([{ inclus: true, role: 'PARTICIPANT', statut: 'ABSENT_NON_EXCUSE' }]), true);
  });

  await record('Non-régression v67 / cache SCOPE', async () => {
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(index.includes('Monitoring F7 v67.0'));
    const policy = fs.readFileSync(path.join(ROOT, 'assets/js/online-cache-policy.js'), 'utf8');
    assert.ok(policy.includes('SCOPE_TABLES_WRITABLE_FROM_CACHE: false'));
    assert.ok(policy.includes('AUTO_PUBLISH_LOCAL: false'));
    const app = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');
    assert.ok(app.includes('SCOPE-IMPL-1A'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();

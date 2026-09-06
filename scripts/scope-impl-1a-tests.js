#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { computeTaux, HttpError } = require('../netlify/lib/_scope-rules');
const { DOMAINES, CIBLES } = require('../netlify/lib/_scope-schema');
const cachePolicy = require('../assets/js/online-cache-policy.js');

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

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWithStatuses(service, repo, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

(async () => {
  await record('Test 1 — 13/15 = 86,7 %', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 15, 'T1');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Habileté incendie',
      cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const statuses = [
      ...Array(13).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' },
      'ABSENT_NON_EXCUSE'
    ];
    const closed = await closeWithStatuses(service, repo, evenement.evenement_id, people, statuses);
    assert.strictEqual(closed.taux.numerator, 13);
    assert.strictEqual(closed.taux.denominator, 15);
    assert.strictEqual(closed.taux.percentage, 86.7);
    const officiel = await service.tauxEvenement(evenement.evenement_id);
    assert.strictEqual(officiel.percentage, 86.7);
    assert.strictEqual(officiel.officiel, true);
  });

  await record('Test 2 — 34/39 = 87,2 % avec 1 dispensé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 40, 'T2');
    const { evenement } = await service.createEvenement({
      date: '2026-03-19',
      domaineCode: 'DPS',
      libelle: 'Manœuvre groupée',
      cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const statuses = [
      ...Array(34).fill('PRESENT'),
      ...Array(3).fill({ statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }),
      ...Array(2).fill('ABSENT_NON_EXCUSE'),
      'DISPENSE'
    ];
    const closed = await closeWithStatuses(service, repo, evenement.evenement_id, people, statuses);
    assert.strictEqual(closed.taux.presents, 34);
    assert.strictEqual(closed.taux.excuses, 3);
    assert.strictEqual(closed.taux.nonExcuses, 2);
    assert.strictEqual(closed.taux.dispenses, 1);
    assert.strictEqual(closed.taux.denominator, 39);
    assert.strictEqual(closed.taux.percentage, 87.2);
  });

  await record('Test 3 — NON_RENSEIGNE refuse la clôture tant que la saisie est incomplète', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 3, 'T3');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Test NON_RENSEIGNE', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT' },
        { personneId: people[1].personne_id, statut: 'PRESENT' }
      ]
    }, { sub: 'test' });
    await assert.rejects(
      () => service.cloturer(evenement.evenement_id, { baseVersion: 3 }, { sub: 'test' }),
      (error) => error instanceof HttpError && error.error === 'cloture_refusee'
    );
  });

  await record('Test 4 — ABSENT_EXCUSE sans motif refusé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 2, 'T4');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Test motif', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await assert.rejects(
      () => service.enregistrerParticipations(evenement.evenement_id, {
        baseVersion: 2,
        participations: [
          { personneId: people[0].personne_id, statut: 'PRESENT' },
          { personneId: people[1].personne_id, statut: 'ABSENT_EXCUSE' }
        ]
      }, { sub: 'test' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'motif_obligatoire'
    );
  });

  await record('Test 5 — affectation temporelle G1 puis C1', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const c1 = await repo.findCible('DPS', 'C1');
    const personne = await repo.insertPersonne({ nip: 'T5001', nom: 'Tempo', prenom: 'Alex' });
    await repo.insertAffectation({
      personne_id: personne.personne_id, cible_id: g1.cible_id, date_debut: '2026-01-01', date_fin: '2026-04-30'
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id, cible_id: c1.cible_id, date_debut: '2026-05-01'
    });
    const mars = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Mars G1', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const marsC1 = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Mars C1', cibleIds: [c1.cible_id]
    }, { sub: 'test' });
    const juinG1 = await service.createEvenement({
      date: '2026-06-10', domaineCode: 'DPS', libelle: 'Juin G1', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const juinC1 = await service.createEvenement({
      date: '2026-06-10', domaineCode: 'DPS', libelle: 'Juin C1', cibleIds: [c1.cible_id]
    }, { sub: 'test' });
    const pMarsG1 = await service.previewAttendus(mars.evenement.evenement_id);
    const pMarsC1 = await service.previewAttendus(marsC1.evenement.evenement_id);
    const pJuinG1 = await service.previewAttendus(juinG1.evenement.evenement_id);
    const pJuinC1 = await service.previewAttendus(juinC1.evenement.evenement_id);
    assert.strictEqual(pMarsG1.count, 1, 'mars G1');
    assert.strictEqual(pMarsC1.count, 0, 'mars C1');
    assert.strictEqual(pJuinG1.count, 0, 'juin G1');
    assert.strictEqual(pJuinC1.count, 1, 'juin C1');
  });

  await record('Test 6 — optimistic locking 409', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'V1', cibleIds: [g1.cible_id]
    }, { sub: 'A' });
    const first = await service.patchEvenement(evenement.evenement_id, { baseVersion: 1, libelle: 'V2-B' }, { sub: 'B' });
    assert.strictEqual(first.version, 2);
    await assert.rejects(
      () => service.patchEvenement(evenement.evenement_id, { baseVersion: 1, libelle: 'stale-A' }, { sub: 'A' }),
      (error) => error instanceof HttpError && error.status === 409 && error.details.serverVersion === 2
    );
  });

  await record('Test 7 — legacy 17/20 sans attendu ni participation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const legacy = await repo.insertLegacy({
      date: '2025-11-18',
      domaine_code: 'DPS',
      libelle: 'Exercice DPS v67',
      nb_convoques: 20,
      nb_presents: 17
    });
    const { evenement } = await service.createEvenement({
      date: '2025-11-18',
      domaineCode: 'DPS',
      libelle: 'Exercice DPS v67',
      cibleIds: [(await repo.findCible('DPS', 'G1')).cible_id],
      origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    const preview = await service.previewAttendus(evenement.evenement_id);
    assert.strictEqual(preview.count, 0);
    await assert.rejects(
      () => service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' }),
      (error) => error instanceof HttpError && error.status === 422
    );
    const attendus = await repo.listAttendus(evenement.evenement_id);
    const participations = await repo.listParticipations(evenement.evenement_id);
    assert.strictEqual(attendus.length, 0);
    assert.strictEqual(participations.length, 0);
    assert.strictEqual(legacy.nb_presents, 17);
    assert.strictEqual(legacy.nb_convoques, 20);
  });

  await record('Test 8 — cache local ne réinjecte pas SCOPE / extras v67', async () => {
    assert.strictEqual(cachePolicy.AUTO_PUBLISH_LOCAL, false);
    assert.strictEqual(cachePolicy.PUSH_HYDRATE_EXTRAS, false);
    assert.strictEqual(cachePolicy.SCOPE_TABLES_WRITABLE_FROM_CACHE, false);
    const server = [{ id: 'server-1' }];
    const localGhost = [{ id: 'server-1' }, { id: 'ghost-indexeddb' }];
    const hydrated = cachePolicy.serverWinsArray(server);
    assert.deepStrictEqual(hydrated.map(x => x.id), ['server-1']);
    assert.ok(!hydrated.some(x => x.id === 'ghost-indexeddb'));
    const appJs = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');
    assert.ok(!/pushOnlineCollection\(name, merged\)/.test(appJs));
    assert.ok(!/pushOnlineCollection\(name, localObject\)/.test(appJs));
    assert.ok(appJs.includes('SCOPE-IMPL-1A'));
    assert.ok(appJs.includes('disabled: true'));
    const start = appJs.slice(appJs.indexOf('function startOnlineRefreshAfterInitialRender'));
    assert.ok(!start.slice(0, 500).includes('await publishLocalCacheToServer()'));
    const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(!/writeCollection/.test(scopeJs));
    assert.ok(!/replaceCollection/.test(scopeJs));
    const pgStore = fs.readFileSync(path.join(ROOT, 'netlify/lib/_data-store-postgres.js'), 'utf8');
    assert.ok(!/scope_/.test(pgStore));
  });

  await record('Test 9 — référentiel SQL initial + cibles runtime enrichies', async () => {
    assert.strictEqual(DOMAINES.length, 8);
    assert.strictEqual(CIBLES.length, 28);
    assert.deepStrictEqual(DOMAINES.map(d => d.code), ['FOBA','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP']);

    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260819_scope_impl_1a.sql'), 'utf8');
    assert.ok(!/\bdrop\b/i.test(sql));
    assert.ok(!/\bdelete\b/i.test(sql));
    assert.ok(!/\btruncate\b/i.test(sql));
    assert.ok(!/\bupdate\b/i.test(sql));
    assert.strictEqual((sql.match(/scope-impl-1a/g) || []).length, 1);
    assert.ok(!/scope-impl-1a-r1/.test(sql));

    const domaineBlock = sql.match(/insert into scope_domaines[\s\S]*?on conflict \(code\) do nothing;/i);
    const cibleBlock = sql.match(/insert into scope_cibles[\s\S]*?on conflict \(domaine_code, niveau_code\) do nothing;/i);
    assert.ok(domaineBlock, 'seed scope_domaines manquant');
    assert.ok(cibleBlock, 'seed scope_cibles manquant');

    const sqlDomaines = [...domaineBlock[0].matchAll(/\('([A-Z]+)', '([^']*)', true\)/g)]
      .map((m) => ({ code: m[1], libelle: m[2] }));
    const sqlCibles = [...cibleBlock[0].matchAll(/gen_random_uuid\(\), '([A-Z]+)', '([^']*)', '([^']*)', true/g)]
      .map((m) => [m[1], m[2], m[3]]);

    assert.strictEqual(sqlDomaines.length, 8);
    assert.strictEqual(sqlCibles.length, 27);
    assert.deepStrictEqual(sqlDomaines, DOMAINES);
    assert.ok(sqlCibles.every((row) => CIBLES.some((cible) => cible[0] === row[0] && cible[1] === row[1] && cible[2] === row[2])));

    function applyOnConflict(first, second){
      const map = new Map();
      for(const row of first) map.set(`${row[0]}:${row[1]}`, row[2]);
      for(const row of second){
        const key = `${row[0]}:${row[1]}`;
        if(!map.has(key)) map.set(key, row[2]);
      }
      return [...map.entries()].map(([k, libelle]) => {
        const [domaine, niveau] = k.split(':');
        return [domaine, niveau, libelle];
      });
    }
    const sqlFirst = sqlCibles.map((row, i) => [row[0], row[1], `sql-${i}`]);
    const jsFirst = CIBLES.map((row, i) => [row[0], row[1], `js-${i}`]);
    const casA = applyOnConflict(sqlFirst, jsFirst);
    const casB = applyOnConflict(jsFirst, sqlFirst);
    assert.strictEqual(casA.length, 28);
    assert.strictEqual(casB.length, 28);
    assert.deepStrictEqual(casA.map(r => `${r[0]}:${r[1]}`).sort(), CIBLES.map(r => `${r[0]}:${r[1]}`).sort());
    assert.deepStrictEqual(casB.map(r => `${r[0]}:${r[1]}`).sort(), CIBLES.map(r => `${r[0]}:${r[1]}`).sort());
    const sqlKeys = new Set(sqlCibles.map((row) => `${row[0]}:${row[1]}`));
    assert.ok(casA.every(r => r[2].startsWith(sqlKeys.has(`${r[0]}:${r[1]}`) ? 'sql-' : 'js-')), 'Cas A doit conserver les UUID SQL existants et ajouter les cibles runtime');
    assert.ok(casB.every(r => r[2].startsWith('js-')), 'Cas B doit conserver les UUID runtime');
  });

  await record('Formule unitaire encadrement hors taux', async () => {
    const taux = computeTaux(
      [
        { personne_id: 'a', statut: 'PRESENT' },
        { personne_id: 'b', statut: 'PRESENT' },
        { personne_id: 'staff', statut: 'PRESENT', role: 'FORMATEUR' }
      ],
      [
        { personne_id: 'a', inclus: true },
        { personne_id: 'b', inclus: true }
      ]
    );
    assert.strictEqual(taux.numerator, 2);
    assert.strictEqual(taux.denominator, 2);
    assert.strictEqual(taux.percentage, 100);
  });

  const failed = results.filter(r => r.status !== 'PASS');
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

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { computeTaux } = require('../netlify/functions/_scope-rules');
const importContract = require('../assets/js/scope-import-contract.js');

const ACTOR = { sub: 'scope-event-std-1-test', roles: ['sdis-admin'] };
const HEADER = 'CODE COURS;date;début;fin;événement;domaine;qui;public_cible;responsable;salle;STAT.COM.;semaine;jour;monitoring;code exercice';

function csv(rows){
  return [HEADER, ...rows].join('\n');
}

function row({ code, date = '14.04.2026', debut = '19:30', fin = '21:30', libelle, domaine = 'DPS', qui = 'G1', publicCible = 'G1', statCom = 'DPS.', source = 'A' }){
  return [code, date, debut, fin, libelle, domaine, qui, publicCible, 'Resp', 'Salle', statCom, '16', 'ma', 'oui', source].join(';');
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  assert.ok(row, `cible ${domaine}/${niveau}`);
  return row;
}

async function person(repo, nip, affs){
  const p = await repo.insertPersonne({ nip, nom: `Nom${nip}`, prenom: `Pre${nip}`, grade: 'Sap', date_entree: '2020-01-01' });
  for(const aff of affs){
    const c = await cible(repo, aff[0], aff[1]);
    await repo.insertAffectation({
      personne_id: p.personne_id,
      cible_id: c.cible_id,
      date_debut: aff[2] || '2020-01-01',
      date_fin: aff[3] || null
    });
  }
  return p;
}

async function commit(service, text){
  const preview = await service.previewImportEvenements({ csvText: text, filename: 'std.csv' });
  const result = await service.commitImportEvenements({ csvText: text, filename: 'std.csv', previewToken: preview.previewToken }, ACTOR);
  return { preview, result };
}

(async () => {
  const results = [];
  async function run(name, fn){
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (error) {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    }
  }

  await run('A — 1 ligne CSV normale => 1 événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.G1.001', libelle: 'Conduite formation continue' })]));
    assert.strictEqual(result.summary.imported, 1);
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
  });

  await run('B — spécialisation AUTO : 3 lignes même événement => 1 événement + plusieurs targets', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv([
      row({ code: 'EX.AUTO.010', libelle: 'Exercice combiné', domaine: 'AUTO', qui: 'AUTO', publicCible: 'VL', statCom: 'EX.' }),
      row({ code: 'EX.AUTO.011', libelle: 'Exercice combiné', domaine: 'AUTO', qui: 'AUTO', publicCible: 'PL', statCom: 'EX.' }),
      row({ code: 'EX.AUTO.012', libelle: 'Exercice combiné', domaine: 'AUTO', qui: 'AUTO', publicCible: 'VL', statCom: 'EX.' })
    ]);
    const { preview, result } = await commit(service, text);
    assert.strictEqual(preview.summary.regroupes, 1);
    assert.strictEqual(result.summary.imported, 1);
    const event = (await repo.listEvenements({ annee: 2026 }))[0];
    assert.strictEqual((await repo.listEventCibleIds(event.evenement_id)).length, 2);
  });

  await run('C — DPS G1 + FOBA 2 avec double appartenance => 1 NIP', async () => {
    const repo = createMemoryRepo();
    await person(repo, 'C001', [['DPS', 'G1'], ['FOBA', '2']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([
      row({ code: 'EX.DOUBLE.020', libelle: 'Exercice double inclusion', domaine: 'DPS', qui: 'DOUBLE', publicCible: 'G1', statCom: 'EX.' }),
      row({ code: 'EX.DOUBLE.021', libelle: 'Exercice double inclusion', domaine: 'FOBA', qui: 'DOUBLE', publicCible: '2', statCom: 'EX.' })
    ]));
    const attendus = await repo.listAttendus(result.created[0].evenementId);
    assert.strictEqual(attendus.filter((a) => a.personne_id).length, 1);
  });

  await run('D — DPS B1 principal + G1 secondaire, événement G1 => incluse', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'D001', [['DPS', 'B1'], ['DPS', 'G1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.G1.030', libelle: 'G1 drill' })]));
    assert.ok((await repo.listAttendus(result.created[0].evenementId)).some((a) => a.personne_id === p.personne_id));
  });

  await run('E — G1 principal + B1 secondaire, événement B1 => incluse', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'E001', [['DPS', 'G1'], ['DPS', 'B1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.B1.040', libelle: 'B1 drill', qui: 'B1', publicCible: 'B1', statCom: 'DPS.' })]));
    assert.ok((await repo.listAttendus(result.created[0].evenementId)).some((a) => a.personne_id === p.personne_id));
  });

  await run('F — CODE existant réimporté => pas de nouvel événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv([row({ code: 'DPS.G1.050', libelle: 'Réimport code' })]);
    await commit(service, text);
    const second = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(second.groups[0].statut, 'EXACT_MATCH');
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
  });

  await run('G — numéro source changé mais rapprochement évident => pas de doublon', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await commit(service, csv([row({ code: 'DPS.G1.060', libelle: 'Libellé identique' })]));
    const preview = await service.previewImportEvenements({ csvText: csv([row({ code: 'DPS.G1.999', libelle: 'Libelle - identique' })]) });
    assert.strictEqual(preview.groups[0].statut, 'PROBABLE_MATCH');
  });

  await run('H — rapprochement ambigu => REVIEW_REQUIRED', async () => {
    const repo = createMemoryRepo();
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Ambigu', cibleIds: [g1.cible_id], heureDebut: '19:30', heureFin: '21:30', statCom: 'DPS.', qui: 'G1' }, ACTOR);
    await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Ambigu', cibleIds: [g1.cible_id], heureDebut: '19:30', heureFin: '21:30', statCom: 'DPS.', qui: 'G1' }, ACTOR);
    const preview = await service.previewImportEvenements({ csvText: csv([row({ code: 'DPS.G1.070', libelle: 'Ambigu' })]) });
    assert.strictEqual(preview.groups[0].statut, 'REVIEW_REQUIRED');
  });

  await run('H2 — même date/horaire/libellé mais QUI ou STAT.COM différent => pas de fusion automatique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv([
      row({ code: 'DPS.G1.071', libelle: 'Même surface', qui: 'G1', publicCible: 'G1', statCom: 'DPS.' }),
      row({ code: 'DPS.B1.072', libelle: 'Même surface', qui: 'B1', publicCible: 'B1', statCom: 'DPS.' }),
      row({ code: 'DAP.Y1.073', libelle: 'Même surface', domaine: 'DAP', qui: 'Y1', publicCible: 'Y1', statCom: 'DAP.' })
    ]);
    const { preview, result } = await commit(service, text);
    assert.strictEqual(preview.summary.eventsDetected, 3);
    assert.strictEqual(result.summary.imported, 3);
  });

  await run('METIER A — JSP C1 + JSP B1 même date/libellé/STAT.COM => 2 événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010JC1JSP.201;12.01.26;Exercice JSP 1;JSP;010J.;JSP C1',
      '010JB1JSP.202;12.01.26;Exercice JSP 1;JSP;010J.;JSP B1'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
    assert.strictEqual(preview.summary.regroupes, 0);
  });

  await run('METIER B — JSP C1 + JSP B1 + JSP G1 même date/libellé/STAT.COM => 3 événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010JC1JSP.211;12.01.26;Exercice JSP 1;JSP;010J.;JSP C1',
      '010JB1JSP.212;12.01.26;Exercice JSP 1;JSP;010J.;JSP B1',
      '010JG1JSP.213;12.01.26;Exercice JSP 1;JSP;010J.;JSP G1'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 3);
    assert.strictEqual(preview.summary.territoriauxDistincts, 3);
  });

  await run('METIER C — DPS G1 + DPS B1 même date/libellé/STAT.COM => 2 événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '014G1DPS.221;24.03.26;Exercice DPS 1;DPS;014.;DPS G1',
      '014B1DPS.222;24.03.26;Exercice DPS 1;DPS;014.;DPS B1'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
    assert.strictEqual(preview.summary.regroupes, 0);
  });

  await run('METIER D — DAP Y1 + DAP Y2 même date/libellé/STAT.COM => 2 événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '013Y1DAP.231;12.03.26;Exercice DAP 1;DAP;013.;DAP Y1',
      '013Y2DAP.232;12.03.26;Exercice DAP 1;DAP;013.;DAP Y2'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
    assert.strictEqual(preview.summary.regroupes, 0);
  });

  await run('METIER E — spécialisation AUTO identique => 1 événement regroupé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '01521F7AUTO.241;08.09.26;Exercice CAR 1.1;FOSPEC / AUTO;01522F7.;Cond VL DPS',
      '01521F7AUTO.242;08.09.26;Exercice CAR 1.1;FOSPEC / AUTO;01522F7.;Cond PL'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 1);
    assert.strictEqual(preview.summary.regroupes, 1);
    assert.strictEqual(preview.groups[0].cibleCodes, 'PL|VL');
  });

  await run('METIER F — spécialisation AUTO même STAT.COM mais dates différentes => événements différents', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '01521F7AUTO.251;08.09.26;Exercice CAR 1.1;AUTO;01522F7.;Cond VL',
      '01521F7AUTO.252;09.09.26;Exercice CAR 1.1;AUTO;01522F7.;Cond VL'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
  });

  await run('METIER G — spécialisation même STAT.COM mais libellés incompatibles => pas de fusion', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '01521F7AUTO.261;08.09.26;Exercice CAR 1.1;AUTO;01522F7.;Cond VL',
      '01521F7AUTO.262;08.09.26;Formation continue conduite;AUTO;01522F7.;Cond VL'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
  });

  await run('METIER H — FOBA 1 + FOBA 2 + FOBA 3 même activité => 1 événement + plusieurs cibles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010FOBAFOBA.271;25.02.26;Exercice FOBA 1;FOBA;010FOBA.;FOBA 1',
      '010FOBAFOBA.272;25.02.26;Exercice FOBA 1;FOBA;010FOBA.;FOBA 2',
      '010FOBAFOBA.273;25.02.26;Exercice FOBA 1;FOBA;010FOBA.;FOBA 3'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 1);
    assert.strictEqual(preview.groups[0].cibleCodes, '1|2|3');
  });

  await run('METIER I — personne présente dans DPS + FOBA => 1 NIP dans attendus', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'MI001', [['DPS', 'G1'], ['FOBA', '2']]);
    const g1 = await cible(repo, 'DPS', 'G1');
    const foba2 = await cible(repo, 'FOBA', '2');
    const service = createScopeService(repo);
    const ev = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Union DPS FOBA', cibleIds: [g1.cible_id, foba2.cible_id] }, ACTOR);
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    assert.strictEqual((await repo.listAttendus(ev.evenement.evenement_id)).filter((a) => a.personne_id === p.personne_id).length, 1);
  });

  await run('METIER J — deux populations regroupées => 1 NIP', async () => {
    const repo = createMemoryRepo();
    await person(repo, 'MJ001', [['FOBA', '1'], ['FOBA', '2']]);
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010FOBAFOBA.281;25.02.26;Exercice FOBA union;FOBA;010FOBA.;FOBA 1',
      '010FOBAFOBA.282;25.02.26;Exercice FOBA union;FOBA;010FOBA.;FOBA 2'
    ].join('\n');
    const { result } = await commit(service, text);
    const attendus = await repo.listAttendus(result.created[0].evenementId);
    assert.strictEqual(attendus.filter((a) => a.personne_id).length, 1);
  });

  await run('METIER O — STAT.COM identique seul insuffisant pour fusionner', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '01521F7AUTO.291;08.09.26;Exercice CAR 1.1;AUTO;01522F7.;Cond VL',
      '01521F7AUTO.292;08.09.26;Exercice TRUCK 1.1;AUTO;01522F7.;Cond PL'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 2);
  });

  await run('METIER P — cible globale DPS => événement valide, pas REVIEW_REQUIRED', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010F7DPS.301;12.01.26;Exercice DPS générique;DPS;010F7.;DPS'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.lignes[0].statut, 'NEW_EVENT');
    assert.strictEqual(preview.lignes[0].cibleCodes, 'GEN');
    assert.strictEqual(preview.lignes[0].publicCible, 'Tous les DPS');
  });

  await run('STATCOM A/B/C/D — normalisation canonique sans point final', async () => {
    assert.strictEqual(importContract.normalizeStatCom('010JSP'), '010JSP');
    assert.strictEqual(importContract.normalizeStatCom('010JSP.'), '010JSP');
    assert.strictEqual(importContract.normalizeStatCom('0120F7'), '0120F7');
    assert.strictEqual(importContract.normalizeStatCom('0130F7'), '0130F7');
  });

  await run('TARGET C/D/E — DPS/DAP/JSP globaux valides', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '0120F7DPS.501;12.05.26;FOCO DPS;DPS;0120F7;DPS',
      '0130F7DAP.502;23.04.26;FOCO DAP;DAP;0130F7;DAP',
      '010JSPJSP.503;21.03.26;Exercice JSP global;JSP;010JSP;JSP'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.aControler, 0);
    assert.strictEqual(preview.summary.erreurs, 0);
    assert.deepStrictEqual(preview.lignes.map((l) => l.cibleCodes), ['GEN', 'GEN', 'GEN']);
    assert.deepStrictEqual(preview.lignes.map((l) => l.publicCible), ['Tous les DPS', 'Tous les DAP', 'Tout le personnel JSP']);
  });

  await run('TARGET F/G/H — cibles territoriales précises conservées', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '012G1DPS.511;12.05.26;DPS G1;DPS;012G1;G1',
      '013Y2DAP.512;23.04.26;DAP Y2;DAP;013Y2;Y2',
      '010JC1JSP.513;21.03.26;JSP C1;JSP;010JC1;JSP C1'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.deepStrictEqual(preview.lignes.map((l) => l.cibleCodes), ['G1', 'Y2', 'C1']);
    assert.strictEqual(preview.summary.regroupes, 0);
  });

  await run('TARGET I — DPS global => NIP unique malgré multi-OI', async () => {
    const repo = createMemoryRepo();
    await person(repo, 'GI001', [['DPS', 'G1'], ['DPS', 'B1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: '0120F7DPS.521', libelle: 'Global DPS', domaine: 'DPS', qui: 'DPS', publicCible: 'DPS', statCom: '0120F7' })]));
    const attendus = await repo.listAttendus(result.created[0].evenementId);
    assert.strictEqual(attendus.filter((a) => a.personne_id).length, 1);
  });

  await run('TARGET J — DAP global => NIP unique', async () => {
    const repo = createMemoryRepo();
    await person(repo, 'GJ001', [['DAP', 'Y1'], ['DAP', 'Y2']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: '0130F7DAP.522', libelle: 'Global DAP', domaine: 'DAP', qui: 'DAP', publicCible: 'DAP', statCom: '0130F7' })]));
    const attendus = await repo.listAttendus(result.created[0].evenementId);
    assert.strictEqual(attendus.filter((a) => a.personne_id).length, 1);
  });

  await run('TARGET K — JSP global => NIP unique', async () => {
    const repo = createMemoryRepo();
    await person(repo, 'GK001', [['JSP', 'G1'], ['JSP', 'B1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: '010JSPJSP.523', libelle: 'Global JSP', domaine: 'JSP', qui: 'JSP', publicCible: 'JSP', statCom: '010JSP' })]));
    const attendus = await repo.listAttendus(result.created[0].evenementId);
    assert.strictEqual(attendus.filter((a) => a.personne_id).length, 1);
  });

  await run('TARGET O — 4 lignes JSP globales distinctes ne fusionnent pas', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Stat.Com;Cible',
      '010JSPJSP.61;30.05.26;Formation groupée JSP | Simulateur;JSP;010JSP;JSP',
      '010JSPJSP.62;30.05.26;Formation groupée JSP | Simulateur;JSP;010JSP;JSP',
      '010JSPJSP.63;30.05.26;Formation groupée JSP | Simulateur;JSP;010JSP;JSP',
      '010JSPJSP.64;30.05.26;Formation groupée JSP | Simulateur;JSP;010JSP;JSP'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.summary.eventsDetected, 4);
    assert.strictEqual(preview.summary.regroupes, 0);
    assert.strictEqual(preview.summary.aControler, 0);
  });

  await run('METIER K/L — dates JJ.MM.AA françaises et refus US', async () => {
    assert.strictEqual(importContract.normalizeDate('13.02.26').iso, '2026-02-13');
    assert.strictEqual(importContract.normalizeDate('02.13.26').error, 'date_invalide');
  });

  await run('METIER M — CODE COURS source strictement conservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([
      row({ code: '010JC1JSP.401', date: '12.01.26', libelle: 'Code conservé', domaine: 'JSP', qui: 'JSP', publicCible: 'JSP C1', statCom: '010JC1.' })
    ]));
    const saved = await repo.getEvent(result.created[0].evenementId);
    assert.strictEqual(saved.code_cours, '010JC1JSP.401');
  });

  await run('METIER N — réimport CODE COURS existant avec date modifiée => pas de duplication', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await commit(service, csv([row({ code: 'DPS.G1.410', date: '14.04.2026', libelle: 'Réimport date' })]));
    const changed = csv([row({ code: 'DPS.G1.410', date: '21.04.2026', libelle: 'Réimport date' })]);
    const preview = await service.previewImportEvenements({ csvText: changed });
    assert.strictEqual(preview.groups[0].statut, 'EXACT_MATCH');
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
  });

  await run('METIER Q — événement manuel => suffixe Sxxx stable', async () => {
    const repo = createMemoryRepo();
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    const a = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Manuel Q1', cibleIds: [g1.cible_id], statCom: 'DPS.', qui: 'G1' }, ACTOR);
    const b = await service.createEvenement({ date: '2026-04-21', domaineCode: 'DPS', libelle: 'Manuel Q2', cibleIds: [g1.cible_id], statCom: 'DPS.', qui: 'G1' }, ACTOR);
    assert.strictEqual(a.evenement.code_cours, 'DPSG1.S001');
    assert.strictEqual(b.evenement.code_cours, 'DPSG1.S002');
  });

  await run('I — événement déplacé de date => CODE inchangé', async () => {
    const repo = createMemoryRepo();
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    const created = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Déplacement', cibleIds: [g1.cible_id] }, ACTOR);
    const code = created.evenement.code_cours;
    const moved = await service.patchEvenement(created.evenement.evenement_id, { baseVersion: 1, date: '2026-04-21' }, ACTOR);
    assert.strictEqual(moved.evenement.code_cours, code);
    assert.strictEqual(moved.evenement.date, '2026-04-21');
  });

  await run('J — événement manuel => suffixe Sxxx stable', async () => {
    const repo = createMemoryRepo();
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    const a = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Manuel A', cibleIds: [g1.cible_id], statCom: 'DPS.', qui: 'G1' }, ACTOR);
    const b = await service.createEvenement({ date: '2026-04-21', domaineCode: 'DPS', libelle: 'Manuel B', cibleIds: [g1.cible_id], statCom: 'DPS.', qui: 'G1' }, ACTOR);
    assert.strictEqual(a.evenement.code_cours, 'DPSG1.S001');
    assert.strictEqual(b.evenement.code_cours, 'DPSG1.S002');
  });

  await run('K — personne ajoutée manuellement => une seule ligne', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'K001', []);
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    const ev = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Ajout manuel', cibleIds: [g1.cible_id] }, ACTOR);
    await service.figerPopulation(ev.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    await service.ajouterException(ev.evenement.evenement_id, { baseVersion: 2, personneId: p.personne_id }, ACTOR);
    assert.strictEqual((await repo.listAttendus(ev.evenement.evenement_id)).filter((a) => a.personne_id === p.personne_id).length, 1);
  });

  await run('L — personne déjà calculée puis ajout manuel => pas de doublon', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'L001', [['DPS', 'G1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.G1.080', libelle: 'Déjà calculé' })]));
    const eventId = result.created[0].evenementId;
    const ev = await repo.getEvent(eventId);
    const added = await service.ajouterException(eventId, { baseVersion: ev.version, personneId: p.personne_id }, ACTOR);
    assert.strictEqual(added.dejaPresent, true);
    assert.strictEqual((await repo.listAttendus(eventId)).filter((a) => a.personne_id === p.personne_id).length, 1);
  });

  await run('M — 2 présents + 1 dispensé => taux 100 % sur 2', async () => {
    const attendus = [{ personne_id: '1', inclus: true }, { personne_id: '2', inclus: true }, { personne_id: '3', inclus: true }];
    const parts = [{ personne_id: '1', statut: 'PRESENT' }, { personne_id: '2', statut: 'PRESENT' }, { personne_id: '3', statut: 'DISPENSE' }];
    const taux = computeTaux(parts, attendus);
    assert.strictEqual(taux.numerator, 2);
    assert.strictEqual(taux.denominator, 2);
    assert.strictEqual(taux.percentage, 100);
  });

  await run('N — ligne 2027 dans fichier 2026 => événement 2027', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await commit(service, csv([row({ code: 'DPS.G1.090', date: '07.01.2027', libelle: 'Début 2027' })]));
    assert.strictEqual((await repo.listEvenements({ annee: 2027 })).length, 1);
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 0);
  });

  await run('O — suppression sans participation => autorisée', async () => {
    const repo = createMemoryRepo();
    const g1 = await cible(repo, 'DPS', 'G1');
    const service = createScopeService(repo);
    const ev = await service.createEvenement({ date: '2026-04-14', domaineCode: 'DPS', libelle: 'Suppression', cibleIds: [g1.cible_id] }, ACTOR);
    const res = await service.supprimerOuAnnulerEvenement(ev.evenement.evenement_id, { baseVersion: 1, motif: 'test' }, ACTOR);
    assert.strictEqual(res.deleted, true);
    assert.strictEqual(await repo.getEvent(ev.evenement.evenement_id), null);
  });

  await run('P — suppression avec participation => annulation et données conservées', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'P001', [['DPS', 'G1']]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.G1.100', libelle: 'Annulation' })]));
    const eventId = result.created[0].evenementId;
    await repo.upsertParticipation({ evenement_id: eventId, personne_id: p.personne_id, statut: 'PRESENT' });
    const ev = await repo.getEvent(eventId);
    const res = await service.supprimerOuAnnulerEvenement(eventId, { baseVersion: ev.version, motif: 'test' }, ACTOR);
    assert.strictEqual(res.annule, true);
    assert.strictEqual((await repo.getEvent(eventId)).statut, 'ANNULE');
    assert.ok((await repo.listParticipations(eventId)).length > 0);
  });

  await run('Q — snapshot avril inchangé après affectation modifiée ensuite', async () => {
    const repo = createMemoryRepo();
    const p = await person(repo, 'Q001', [['DPS', 'G1', '2020-01-01', null]]);
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([row({ code: 'DPS.G1.110', libelle: 'Snapshot' })]));
    const eventId = result.created[0].evenementId;
    const aff = (await repo.listAffectations({ personneId: p.personne_id }))[0];
    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-09-01' });
    assert.ok((await repo.listAttendus(eventId)).some((a) => a.personne_id === p.personne_id));
  });

  await run('QUI — colonne manquante => erreur explicite', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const bad = [
      'CODE COURS;date;début;fin;événement;domaine;public_cible;responsable;salle;STAT.COM.',
      'DPS.G1.120;14.04.2026;19:30;21:30;Sans qui;DPS;G1;Resp;Salle;DPS.'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: bad });
    assert.ok(preview.lignes[0].raison.includes('Colonne QUI obligatoire manquante'));
  });

  await run('REALCSV — colonnes MOA, dates JJ.MM.AA et cibles réelles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = fs.readFileSync(path.join(__dirname, '..', 'tests/fixtures/scope-events-real-moa.csv'), 'utf8');
    const preview = await service.previewImportEvenements({ csvText: text, filename: 'scope-events-real-moa.csv' });
    assert.strictEqual(preview.summary.erreurs, 0);
    assert.strictEqual(preview.summary.aControler, 0);
    assert.strictEqual(preview.summary.eventsDetected, 10);
    assert.strictEqual(preview.summary.regroupes, 1);
    const byCode = new Map(preview.lignes.map((line) => [line.codeCours, line]));
    assert.strictEqual(byCode.get('010JC1JSP.2').date, '2026-01-12');
    assert.strictEqual(byCode.get('010JC1JSP.2').domaineStockage, 'JSP');
    assert.strictEqual(byCode.get('010JC1JSP.2').cibleCodes, 'C1');
    assert.strictEqual(byCode.get('011PRPR.10').domaineStockage, 'PR');
    assert.strictEqual(byCode.get('011PRPR.10').cibleCodes, 'GEN');
    assert.strictEqual(byCode.get('013Y1DAP.14').cibleCodes, 'Y1');
    assert.strictEqual(byCode.get('014G1DPS.20').cibleCodes, 'G1');
    assert.strictEqual(byCode.get('01521F7AUTO.33').cibleCodes, 'PL');
    assert.strictEqual(byCode.get('01520F7AUTO.34').cibleCodes, 'VL');
    assert.strictEqual(byCode.get('010JC1JSP.140').date, '2027-01-12');
    const result = await service.commitImportEvenements({
      csvText: text,
      filename: 'scope-events-real-moa.csv',
      previewToken: preview.previewToken
    }, ACTOR);
    assert.strictEqual(result.summary.imported, 10);
    const foba = result.created.find((item) => item.codeCours === '010FOBAFOBA.7');
    assert.ok(foba);
    assert.strictEqual(foba.targets, 3);
    const saved = await repo.getEvent(foba.evenementId);
    assert.strictEqual(saved.code_cours, '010FOBAFOBA.7');
    assert.strictEqual((await repo.listEvenements({ annee: 2027 })).length, 1);
  });

  await run('REALCSV — date jour.mois.année, jamais inversion US', async () => {
    assert.strictEqual(importContract.normalizeDate('13.02.26').iso, '2026-02-13');
    assert.strictEqual(importContract.normalizeDate('02.13.26').error, 'date_invalide');
  });

  await run('REALCSV — QUI/DOMAINE contradictoires => REVIEW_REQUIRED', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = [
      'Code cours;Date événement;Événement;Qui;Domaine;Stat.Com;Cible',
      '010JC1JSP.2;12.01.26;Exercice JSP 1;JSP;DAP;010JC1;JSP C1'
    ].join('\n');
    const preview = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(preview.lignes[0].statut, 'REVIEW_REQUIRED');
    assert.ok(preview.lignes[0].raison.includes('contradictoires'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  if(failed.length) process.exit(1);
  console.log('scope-event-std-1-tests.js PASS');
})();

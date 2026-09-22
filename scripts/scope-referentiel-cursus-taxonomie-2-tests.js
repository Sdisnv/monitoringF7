#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { DOMAINES, CIBLES } = require('../netlify/lib/_scope-schema');
const qvReferentials = require('../netlify/lib/_scope-quo-vadis-referentials');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('assets/js/scope-ui.js');
const serviceSource = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');
const functionSource = read('netlify/functions/scope.js');
const migration = read('database/migrations/20260922_scope_referentiel_cursus_taxonomie_2.sql');
const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
sandbox.global = sandbox;
vm.runInNewContext(read('assets/js/scope-ui-logic.js'), sandbox);
const logic = sandbox.module.exports;

const groups = logic.domainTaxonomyGroups();
assert.strictEqual(groups.map((row) => row.label).join('|'), 'Opérationnel|Formation');
assert.strictEqual(groups[0].codes.join(','), 'DPS,DAP,JSP');
assert.strictEqual(groups[1].codes.join(','), 'FOBA,FOCO,FOCA,FOSPEC,PR,AUTO');
assert.strictEqual(groups[1].separatorBefore, 'PR');
assert.ok(!ui.includes("label: 'Spécialisation'"));
assert.strictEqual(qvReferentials.SCOPE_DOMAIN_ORDER.join(','), groups.flatMap((row) => row.codes).join(','));
assert.ok(DOMAINES.some((row) => row.code === 'FOCO'));
assert.ok(migration.includes("'FOCO'"));
assert.ok(schema.includes('scope_domaines_code_chk'));
assert.ok(migration.includes('enable row level security'));
assert.ok(functionSource.includes("path === '/quo-vadis/cursus'"));
assert.ok(functionSource.includes("hasPermission(claims, 'references:manage')"));

const values = (domain) => logic.sharedOiOptions(domain).map((row) => row.value).join(',');
assert.strictEqual(values('DPS'), ',G1,C1,B1,B2');
assert.strictEqual(values('DAP'), ',Y1,Y2,Y3,Y4');
assert.strictEqual(values('FOCO'), ',DPS,DAP,JSP');
assert.strictEqual(values('PR'), ',GEN,PAPR,ABC');
assert.strictEqual(logic.sharedOiOptions('PR')[3].label, 'PABC');
for(const raw of ['ABC', 'PR-ABC', 'PRABC', 'PABC']){
  assert.strictEqual(logic.niveauAffiche('PR', raw), 'PABC');
}
assert.strictEqual(logic.sharedOiOptions('AUTO').map((row) => row.label).join('|'), 'Non précisé|cond PL|cond TP9|cond VL|Grutier|MEA|Pilote BAT');
assert.strictEqual(logic.sharedSpecOptions('FOSPEC').map((row) => row.label).join('|'), 'Non précisé|Antichute|NAC|OFSI|OP VPC');
assert.deepStrictEqual(CIBLES.filter((row) => row[0] === 'FOCO').map((row) => row[1]), ['DPS', 'DAP', 'JSP']);

const rows = [
  { domaineCode: 'DPS', niveauCode: 'G1', cibleId: 'dps-g1' },
  { domaineCode: 'DAP', niveauCode: 'Y1', cibleId: 'dap-y1' }
];
assert.strictEqual(logic.eventCiblesForForm('DAP', rows, ['dps-g1']).map((row) => row.cibleId).join(','), 'dap-y1');
assert.ok(ui.includes('form.cibleCode = oiOk ? canonicalOi'));
assert.ok(ui.includes('if (!specOk) form.specialisation'));
assert.ok(ui.includes('sortEventLieux'));
assert.deepStrictEqual([...qvReferentials.SCOPE_SITE_ORDER], ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);

assert.ok(serviceSource.includes('left join scope_quo_vadis_cursus_versions'));
assert.ok(serviceSource.includes('left join scope_quo_vadis_cursus_steps'));
assert.ok(serviceSource.includes('coalesce(csp.retenu, false)'));
assert.ok(ui.includes('data-qv-cursus-step') && ui.includes("${planned && manageable ? '' : 'disabled'}"));
assert.ok(ui.includes('(qv.cursusSelections || []).filter((row) => row.retenu)'));
assert.ok(serviceSource.includes('cp.retenu is true and d.statut'));
assert.ok(!migration.includes('delete from scope_quo_vadis_cursus'));

const STOP = new Error('stop after writes');
const programme = { programme_id: 'programme-2027', annee: 2027, code: 'QV-2027', libelle: 'QUO VADIS 2027' };
function database({ selected = true } = {}){
  const calls = [];
  return {
    calls,
    async query(sql, params){
      calls.push({ sql, params });
      if(sql.includes('select * from scope_quo_vadis_programmes where annee')) return { rows: [programme] };
      if(sql.includes('update scope_quo_vadis_cursus_programmes cp')) return { rows: [{ code: 'CI-DPS', retenu: params[2] }] };
      if(sql.includes('select cp.retenu from scope_quo_vadis_cursus_steps')) return { rows: [{ retenu: selected }] };
      if(sql.includes('select 1 from scope_quo_vadis_cursus_programmes cp')) return { rows: selected ? [{ '?column?': 1 }] : [] };
      if(sql.includes('insert into scope_quo_vadis_cursus_step_programmes') && sql.includes('values ($1,$2,$3')) return { rows: [{ step_id: params[1], retenu: params[2] }] };
      if(sql.includes('delete from scope_quo_vadis_calendar_days')) throw STOP;
      if(sql.includes('insert into scope_quo_vadis_cursus_definitions')) return { rows: [{ cursus_id: 'new-id', code: params[0], libelle: params[1] }] };
      return { rows: [] };
    }
  };
}

(async () => {
  const eventRepo = createMemoryRepo();
  const referentiels = await createScopeService(eventRepo).referentiels();
  assert.strictEqual(referentiels.domaines.map((row) => row.code).join(','), 'DPS,DAP,JSP,FOBA,FOCO,FOCA,FOSPEC,PR,AUTO');
  assert.ok(referentiels.arbre.some((row) => row.code === 'PR'));
  assert.ok(referentiels.arbre.some((row) => row.code === 'AUTO'));
  assert.ok(!((referentiels.arbre.find((row) => row.code === 'FOSPEC') || {}).sousDomaines || []).some((row) => ['PR', 'AUTO'].includes(row.code)));
  const focoTargets = (await eventRepo.listCibles()).filter((row) => row.domaine_code === 'FOCO' && ['DPS', 'DAP'].includes(row.niveau_code));
  assert.strictEqual(focoTargets.length, 2);
  const focoEvent = await createScopeService(eventRepo).createEvenement({
    date: '2027-05-12', domaineCode: 'FOCO', libelle: 'Exercice DPS DAP',
    cibleIds: focoTargets.map((row) => row.cible_id), modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '19:00', heureFinPrevue: '21:00'
  }, { sub: 'taxonomy-test', permissions: ['events:create'], roles: ['sdis-admin'] });
  assert.strictEqual(focoEvent.evenement.domaine_code, 'FOCO');
  assert.strictEqual((await eventRepo.listEventCibleIds(focoEvent.evenement.evenement_id)).length, 2);

  const createdDb = database();
  const created = await createScopeQuoVadisService({ database: createdDb }).createCursus({ libelle: 'Cursus sans événement' });
  assert.strictEqual(created.created, true);
  assert.strictEqual(created.cursus.libelle, 'Cursus sans événement');
  assert.strictEqual(createdDb.calls.length, 1);
  assert.deepStrictEqual(createdDb.calls[0].params, ['CURSUS-SANS-EVENEMENT', 'Cursus sans événement']);

  const offDb = database();
  await assert.rejects(() => createScopeQuoVadisService({ database: offDb }).setCursusSelection(2027, { code: 'CI-DPS', retenu: false }), STOP);
  assert.ok(offDb.calls.some((call) => call.sql.includes('update scope_quo_vadis_cursus_step_programmes csp') && call.params[1] === 'CI-DPS'));
  assert.ok(offDb.calls.some((call) => call.sql.includes('update scope_quo_vadis_obligations o set include_in_programme = false')));

  const onDb = database();
  await assert.rejects(() => createScopeQuoVadisService({ database: onDb }).setCursusSelection(2027, { code: 'CI-DPS', retenu: true }), STOP);
  assert.ok(!onDb.calls.some((call) => call.sql.includes('update scope_quo_vadis_cursus_step_programmes csp')));

  const blockedDb = database({ selected: false });
  const blocked = await createScopeQuoVadisService({ database: blockedDb }).setCursusStepSelection(2027, { stepId: 'step-1', retenu: true });
  assert.strictEqual(blocked.updated, false);
  assert.ok(!blockedDb.calls.some((call) => call.sql.includes('values ($1,$2,$3')));

  const stepDb = database();
  await assert.rejects(() => createScopeQuoVadisService({ database: stepDb }).setCursusStepSelection(2027, { stepId: 'step-1', retenu: false }), STOP);
  assert.ok(stepDb.calls.some((call) => call.sql.includes('values ($1,$2,$3') && call.params[2] === false));
  assert.ok(stepDb.calls.some((call) => call.sql.includes('cursus_step_id = $2 and source_type =')));

  const futureDb = database({ selected: false });
  const future = await createScopeQuoVadisService({ database: futureDb }).createFutureDate({ targetYear: 2027, cursusId: 'new-id', domain: 'FOCO' });
  assert.strictEqual(future.created, false);
  assert.ok(!futureDb.calls.some((call) => call.sql.includes('insert into scope_quo_vadis_future_dates')));
  console.log('scope-referentiel-cursus-taxonomie-2-tests: ok');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });

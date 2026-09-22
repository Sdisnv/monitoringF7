#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createQvReferentialManagement } = require('../netlify/lib/_scope-qv-referential-management');
const { _effectivePlanningRules } = require('../netlify/lib/_scope-quo-vadis-service');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ID = '11111111-1111-4111-8111-111111111111';
const STEP = '22222222-2222-4222-8222-222222222222';
const RULE = '33333333-3333-4333-8333-333333333333';
const VERSION = '44444444-4444-4444-8444-444444444444';
const sql = [];
let history = false;
const db = {
  async transaction(fn) { return fn(this); },
  async query(statement, params = []) {
    sql.push({ statement, params });
    if (/from scope_domaines/.test(statement)) return { rows: [{ '?column?': 1 }] };
    if (/from scope_cibles/.test(statement) || /from scope_lieux/.test(statement)) return { rows: [{ '?column?': 1 }] };
    if (/insert into scope_quo_vadis_cursus_definitions/.test(statement)) return { rows: [{ cursus_id: ID, code: 'TEST' }] };
    if (/select \* from scope_quo_vadis_cursus_definitions/.test(statement)) return { rows: [{ cursus_id: ID, libelle: 'Test', description: '', domain_code: 'DPS', cible_id: null, duration_months: 12, statut: 'ACTIF' }] };
    if (/select cursus_id, code from scope_quo_vadis_cursus_definitions/.test(statement)) return { rows: [{ cursus_id: ID, code: 'TEST' }] };
    if (/as dates,/.test(statement)) return { rows: [{ dates: 0, cohortes: 0, obligations: history ? 1 : 0, modules: 0, programmes: 0 }] };
    if (/update scope_quo_vadis_cursus_definitions/.test(statement)) return { rows: [{ cursus_id: ID, code: 'TEST' }] };
    if (/select v.cursus_version_id/.test(statement)) return { rows: [{ cursus_version_id: VERSION, domain_code: 'DPS' }] };
    if (/select coalesce\(max\(ordre\)/.test(statement)) return { rows: [{ next_order: 1 }] };
    if (/insert into scope_quo_vadis_cursus_steps/.test(statement)) return { rows: [{ step_id: STEP }] };
    if (/select s\.\*, v\.cursus_id/.test(statement)) return { rows: [{ step_id: STEP, domain_code: 'DPS', libelle: 'Module', logical_year: 1, duration_minutes: 120, usual_start_time: '19:00', usual_end_time: '21:00' }] };
    if (/select step_id from scope_quo_vadis_cursus_steps where step_id/.test(statement)) return { rows: [{ step_id: STEP }] };
    if (/as obligations,/.test(statement)) return { rows: [{ obligations: history ? 1 : 0, programmes: 0 }] };
    if (/select step_id from scope_quo_vadis_cursus_steps where cursus_version_id/.test(statement)) return { rows: [{ step_id: STEP }] };
    if (/select r\.\*, c\.niveau_code/.test(statement)) return { rows: [{ rule_id: RULE, domain: 'DPS', cible_id: null, day_policy: dayPolicy, time_policy: { usualStart: '19:00', usualEnd: '21:00' }, metadata: {}, derogation_allowed: true }] };
    if (/insert into scope_quo_vadis_planning_rules/.test(statement)) return { rows: [{ rule_id: RULE }] };
    if (/update scope_quo_vadis_planning_rules.*returning rule_id/s.test(statement)) return { rows: [{ rule_id: RULE }] };
    return { rows: [] };
  }
};
const manager = createQvReferentialManagement(db);
const dayPolicy = Object.fromEntries(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map((day) => [day, 'AUTORISE']));

(async () => {
  assert.equal((await manager.createCursus({ code: 'TEST', libelle: 'Test', domainCode: 'DPS', durationMonths: 24 })).created, true);
  assert.equal((await manager.updateCursus(ID, { durationMonths: 12 })).updated, true);
  assert.equal((await manager.addModule(ID, { libelle: 'Module', logicalYear: 1, durationMinutes: 120, usualStartTime: '19:00', usualEndTime: '21:00' })).created, true);
  assert.equal((await manager.updateModule(STEP, { libelle: 'Module corrigé' })).updated, true);
  assert.equal((await manager.reorderModules(ID, [STEP])).updated, true);
  assert.equal((await manager.removeModule(STEP)).deleted, true);
  history = true;
  assert.equal((await manager.removeModule(STEP)).archived, true);
  assert.equal((await manager.removeCursus(ID)).archived, true);
  history = false;
  assert.equal((await manager.removeCursus(ID)).deleted, true);
  const input = { domain: 'DPS', dayPolicy, usualStart: '19:00', usualEnd: '21:00', preferredDay: 'MONDAY' };
  assert.equal((await manager.createRule(input)).created, true);
  assert.equal((await manager.updateRule(RULE, { ...input, usualStart: '18:30' })).updated, true);
  assert.equal((await manager.removeRule(RULE)).archived, true);
  assert.equal((await manager.createRule({ ...input, dayPolicy: {} })).ok, false);
  assert.ok(sql.some((row) => /definition_version_id is null/.test(row.statement)), 'event-definition rules are protected');
  assert.ok(sql.some((row) => /for update/.test(row.statement)), 'referential mutations lock their rows');

  const rules = _effectivePlanningRules([
    { code: 'PLANIF-DAP', domain: 'DAP', active: true },
    { code: 'DAP-VENDREDI-AUTORISE', domain: 'DAP', active: true },
    { code: 'PLANIF-DAP-Y4', domain: 'DAP', cible_id: ID, active: true }
  ]);
  assert.equal(rules.length, 2, 'one general and one specific rule');
  const targets = L.eventCiblesForForm('DPS', [{ cibleId: ID, domaineCode: 'DPS', niveauCode: 'B3', libelle: 'B3', actif: true }], []);
  assert.equal(targets[0].niveauCode, 'B3', 'active targets need no static entry');

  const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260922_scope_quo_vadis_referential_management_4.sql'), 'utf8');
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on/i);
  assert.doesNotMatch(migration, /\b(drop table|truncate|delete from)\b/i);
  const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  assert.match(ui, />OI OU PUBLIC CIBLE<\/label>/);
  assert.match(ui, /setQuoVadisCursusStepSchedule/);
  assert.match(ui, /data-qv-module-move/);
  console.log('scope-quo-vadis-referential-management-4-tests: ok');
})().catch((error) => { console.error(error); process.exitCode = 1; });

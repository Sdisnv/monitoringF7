'use strict';

const assert = require('node:assert/strict');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');
const { buildPlan } = require('./scope-qv-2027-publication-clone');

const REPORT = Object.freeze({
  caseId: 'qv-source-923',
  eventId: '55a8007b-a82f-49c1-a90f-e85c46426b34',
  definitionId: 'QV26-RAPPORT-ANNUEL-FF60DF89',
  publicationKey: 'QV-2027-EF5F5766C0F99962CD1E0E790F303E0F',
  statCom: '071F3',
  oldDate: '2027-03-04',
  newDate: '2027-02-23'
});
const PRODUCTION = Object.freeze({ host: 'aws-0-eu-central-2.pooler.supabase.com', database: 'postgres' });
const PLAN = Object.freeze({ CREATE: 0, UPDATE: 1, UNCHANGED: 124, BLOCKED: 725, NOT_PUBLISHED: 0 });
const DATE_FIELDS = ['event.endDate', 'event.endsAt', 'event.startDate', 'event.startsAt', 'fingerprint'];
const PROTECTED = [
  'scope_quo_vadis_obligations', 'scope_quo_vadis_proposals', 'scope_quo_vadis_calendar_days',
  'scope_participations', 'scope_affectations', 'scope_attendus', 'scope_journal_metier'
];
const EVENT_RELATIONS = [
  'scope_qv_publication_links', 'scope_evenement_domaines', 'scope_evenement_cibles_qv',
  'scope_evenement_ois', 'scope_evenement_publics_qv', 'scope_evenement_roles_qv',
  'scope_evenement_ressources_qv', 'scope_qv_session_events'
];

function parseArgs(args){
  const options = {};
  for(let index = 0; index < args.length; index++){
    const key = args[index];
    assert.ok(['--target', '--expected-host', '--expected-database', '--confirm-event-id',
      '--confirm-old-date', '--confirm-new-date', '--apply'].includes(key), `Unknown option: ${key}`);
    assert.equal(options[key], undefined, `Repeated option: ${key}`);
    if(key === '--apply') options[key] = true;
    else{
      assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value: ${key}`);
      options[key] = args[++index];
    }
  }
  assert.ok(['clone', 'production'].includes(options['--target']), 'Explicit --target clone|production required');
  assert.ok(options['--expected-host'] && options['--expected-database'], 'Exact host and database required');
  if(options['--target'] === 'production'){
    assert.deepEqual({ host:options['--expected-host'],database:options['--expected-database'] }, PRODUCTION);
  }
  if(options['--apply']){
    assert.equal(options['--confirm-event-id'], REPORT.eventId);
    assert.equal(options['--confirm-old-date'], REPORT.oldDate);
    assert.equal(options['--confirm-new-date'], REPORT.newDate);
    if(options['--target'] === 'production'){
      assert.equal(process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED, 'YES',
        'Production apply requires a separate explicit environment gate');
    }
  }
  return {
    mode: options['--target'], host:options['--expected-host'],
    database:options['--expected-database'], apply:options['--apply'] === true
  };
}

function assertSingleReportPlan(plan, snapshot){
  assert.deepEqual(plan.summary, PLAN);
  assert.equal(plan.decisions.length, 850);
  assert.equal(snapshot.length, 125);
  assert.equal(new Set(snapshot.map((row) => row.eventId)).size, 125);
  assert.equal(new Set(snapshot.map((row) => row.publicationKey)).size, 125);
  const updates = plan.decisions.filter((row) => row.action === 'UPDATE');
  assert.equal(updates.length, 1);
  const decision = updates[0];
  assert.equal(decision.caseId, REPORT.caseId);
  assert.equal(decision.publicationKey, REPORT.publicationKey);
  assert.equal(decision.eventId, REPORT.eventId);
  assert.deepEqual([...decision.changedFields].sort(), [...DATE_FIELDS].sort());
  assert.equal(decision.target.source.definitionId, REPORT.definitionId);
  assert.equal(decision.target.source.publicationUnitId, REPORT.caseId);
  assert.deepEqual(decision.target.source.sourceRecordIds, [REPORT.caseId]);
  assert.equal(decision.target.activity.statComCode, REPORT.statCom);
  assert.equal(decision.target.event.startDate, REPORT.newDate);
  assert.equal(decision.target.event.endDate, REPORT.newDate);
  const old = snapshot.find((row) => row.publicationKey === REPORT.publicationKey);
  assert.ok(old);
  assert.equal(old.eventId, REPORT.eventId);
  assert.equal(old.source.definitionId, REPORT.definitionId);
  assert.equal(old.source.publicationUnitId, REPORT.caseId);
  assert.deepEqual(old.source.sourceRecordIds, [REPORT.caseId]);
  assert.equal(old.desired.activity.statComCode, REPORT.statCom);
  assert.equal(old.desired.event.startDate, REPORT.oldDate);
  assert.equal(old.desired.event.endDate, REPORT.oldDate);
  assert.equal(old.fingerprint, old.publicationFingerprint);
  assert.equal(old.fingerprint, old.lastSyncedFingerprint);
  assert.equal(decision.expectedFingerprint, old.fingerprint);
  assert.equal(decision.expectedVersion, old.version);
  assert.equal(old.desired.event.startTime, decision.target.event.startTime);
  assert.equal(old.desired.event.endTime, decision.target.event.endTime);
  assert.equal(old.desired.event.status, decision.target.event.status);
  assert.equal(snapshot.filter((row) => row.desired.activity.statComCode === REPORT.statCom
    && row.desired.activity.label === 'Rapport annuel').length, 1);
  assert.ok(Object.values(old.operationalState).every((count) => count === 0));
  return { decision,old };
}

async function fingerprint(store, table, where = '', values = []){
  const { rows } = await store.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t ${where}`, values);
  return rows[0];
}

async function protectedState(store){
  const proof = {};
  for(const table of PROTECTED) proof[table] = await fingerprint(store,table);
  proof.otherEvents = await fingerprint(store,'scope_evenements','where evenement_id<>$1',[REPORT.eventId]);
  for(const table of EVENT_RELATIONS){
    proof[table] = await fingerprint(store,table,'where evenement_id<>$1',[REPORT.eventId]);
  }
  return proof;
}

async function reportAlerts(store){
  let queue = Promise.resolve();
  const query = (...args) => {
    const next = queue.then(() => store.query(...args));
    queue = next.catch(() => {});
    return next;
  };
  const programme = await createScopeQuoVadisService({ database:{ query } }).listProgramme(2027);
  assert.equal(programme.canonicalProgramme.target.sessions,847);
  assert.equal(programme.alerts.length,2);
  const rows = programme.canonicalProgramme.rows;
  const report = rows.find((row) => row.id === REPORT.caseId);
  assert.ok(report);
  assert.equal(report.annualReportRule.priority,'ABSOLUTE');
  assert.equal(report.annualReportConstraint.blockStart,'2027-02-23T12:00');
  assert.equal(report.annualReportConstraint.blockEnd,'2027-02-24T00:00');
  const conflicts = rows.filter((row) =>
    row.annualReportConstraint?.status === 'BLOCKED_BY_ANNUAL_REPORT');
  assert.deepEqual(conflicts.map((row) => row.label).sort(),['Formation MEA 1.2','Séance COSEC']);
  assert.deepEqual(programme.alerts.filter((row) => row.programmeItemId
    && conflicts.some((item) => item.id === row.programmeItemId)).map((row) => row.title).sort(),
  ['Formation MEA 1.2','Séance COSEC']);
  return { conflicts:conflicts.map((row) => ({ id:row.id,title:row.label,startsAt:row.startsAt })),
    reportPublishedDate:report.publishedEventDate || null };
}

async function run(options){
  const connectionString = process.env.SCOPE_QV_RA_DATABASE_URL;
  assert.ok(connectionString, 'SCOPE_QV_RA_DATABASE_URL is required');
  const store = await ScopeQvPostgresStore.open({
    connectionString,deploymentMode:options.mode,expectedHost:options.host,
    expectedDatabase:options.database,allowCloneConnection:options.mode === 'clone',
    allowProductionConnection:options.mode === 'production',readOnly:!options.apply,
    statementTimeoutMs:120000
  });
  const client = await store.pool.connect();
  let open = false;
  try{
    await client.query(options.apply ? 'begin isolation level serializable' : 'begin isolation level repeatable read read only');
    open = true;
    store._client = client;
    const dataset = await buildCurrentCandidateDataset();
    const { plan,snapshot } = await buildPlan(store,dataset);
    const { decision,old } = assertSingleReportPlan(plan,snapshot);
    const summary = {
      target:options.mode,mode:options.apply ? 'APPLY' : 'DRY_RUN',eventId:old.eventId,
      statCom:REPORT.statCom,oldDate:REPORT.oldDate,newDate:REPORT.newDate,
      oldStartsAt:old.desired.event.startsAt,oldEndsAt:old.desired.event.endsAt,
      newStartsAt:decision.target.event.startsAt,newEndsAt:decision.target.event.endsAt,
      plan:plan.summary,publishedEvents:snapshot.length,
      alertsExpected:['Formation MEA 1.2','Séance COSEC']
    };
    if(!options.apply){
      await client.query('rollback'); open = false;
      return { ...summary,alertsVerification:'CLONE_APPLY_REQUIRED',transaction:'READ_ONLY_ROLLBACK' };
    }
    const before = await protectedState(store);
    const changedId = await store.updateTarget(old,decision.target,() => {});
    assert.equal(changedId,REPORT.eventId);
    const after = await store.snapshot(2027);
    assert.equal(after.length,125);
    assert.equal(new Set(after.map((row) => row.eventId)).size,125);
    const report = after.find((row) => row.publicationKey === REPORT.publicationKey);
    assert.ok(report);
    assert.equal(report.eventId,REPORT.eventId);
    assert.equal(report.desired.event.startDate,REPORT.newDate);
    assert.equal(report.desired.event.endDate,REPORT.newDate);
    assert.equal(report.desired.event.startTime,old.desired.event.startTime);
    assert.equal(report.desired.event.endTime,old.desired.event.endTime);
    assert.equal(report.fingerprint,report.publicationFingerprint);
    assert.equal(report.fingerprint,report.lastSyncedFingerprint);
    assert.equal(after.filter((row) => row.desired.activity.statComCode === REPORT.statCom
      && row.desired.activity.label === 'Rapport annuel').length,1);
    for(const previous of snapshot.filter((row) => row.eventId !== REPORT.eventId)){
      const current = after.find((row) => row.eventId === previous.eventId);
      assert.ok(current);
      assert.deepEqual(current,previous);
    }
    assert.deepEqual(await protectedState(store),before);
    await client.query('savepoint qv_alert_inspection');
    let alertsAfter;
    try{
      alertsAfter = await reportAlerts(store);
    }finally{
      await client.query('rollback to savepoint qv_alert_inspection');
      await client.query('release savepoint qv_alert_inspection');
    }
    assert.deepEqual(await protectedState(store),before);
    assert.deepEqual(alertsAfter.conflicts.map((row) => row.title).sort(),summary.alertsExpected);
    assert.equal(alertsAfter.reportPublishedDate,REPORT.newDate);
    const proof = { ...summary,after:{eventId:report.eventId,date:report.desired.event.startDate,
      startsAt:report.desired.event.startsAt,endsAt:report.desired.event.endsAt,
      publishedEvents:after.length},protectedDataUnchanged:true,otherEventsUnchanged:true,
      alertsAfter:alertsAfter.conflicts.map((row) => row.title) };
    if(options.mode === 'clone'){
      await client.query('rollback'); open = false;
      const restored = (await store.snapshot(2027,REPORT.publicationKey))[0];
      assert.equal(restored.eventId,REPORT.eventId);
      assert.equal(restored.desired.event.startDate,REPORT.oldDate);
      assert.deepEqual(await protectedState(store),before);
      return { ...proof,transaction:'ROLLBACK',afterRollback:{eventId:restored.eventId,
        date:restored.desired.event.startDate} };
    }
    await client.query('commit'); open = false;
    return { ...proof,transaction:'COMMIT' };
  }finally{
    if(open) await client.query('rollback');
    store._client = null;
    client.release();
    await store.close();
  }
}

if(require.main === module){
  Promise.resolve().then(() => run(parseArgs(process.argv.slice(2))))
    .then((result) => console.log(JSON.stringify(result,null,2)))
    .catch((error) => { console.error(error.code || 'RA_TARGETED_REFUSED',error.message);process.exitCode=1; });
}

module.exports = { REPORT,PRODUCTION,PLAN,parseArgs,assertSingleReportPlan,run };

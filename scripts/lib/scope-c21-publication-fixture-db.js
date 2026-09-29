'use strict';

const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const planner = require('../../netlify/lib/_scope-qv-publication-plan');

const ROOT = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(ROOT, 'database/fixtures/scope_qv_publication_c21_fixture.sql');

function nowIso(clock){
  return typeof clock === 'function' ? String(clock()) : new Date().toISOString();
}

function deterministicId(prefix, value){
  return `${prefix}-${createHash('sha256').update(String(value)).digest('hex').slice(0, 20).toUpperCase()}`;
}

function json(value){
  return JSON.stringify(value == null ? null : value);
}

function parseJson(value, fallback){
  try { return JSON.parse(String(value)); }
  catch { return fallback; }
}

class C21PublicationFixtureDb {
  constructor(options = {}){
    this.adapterKind = 'C21_SQLITE_ISOLATED_FIXTURE';
    this.isIsolated = true;
    this.isProduction = false;
    this.clock = options.clock;
    this.db = new DatabaseSync(options.filename || ':memory:');
    this.db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    this._tail = Promise.resolve();
  }

  close(){
    this.db.close();
  }

  async runExclusive(task){
    const previous = this._tail;
    let release;
    this._tail = new Promise((resolve) => { release = resolve; });
    await previous;
    try { return await task(); }
    finally { release(); }
  }

  async transaction(task){
    this.db.exec('begin immediate');
    try{
      const result = await task(this);
      this.db.exec('commit');
      return result;
    }catch(error){
      this.db.exec('rollback');
      throw error;
    }
  }

  startRun(input){
    this.db.prepare(`insert into c21_publication_runs(
      run_id,plan_id,plan_fingerprint,source_year,actor_id,process_id,started_at,status,
      planned_create_count,planned_update_count,planned_unchanged_count,planned_blocked_count,planned_not_published_count
    ) values (?,?,?,?,?,?,?,'STARTED',?,?,?,?,?)`).run(
      input.runId, input.planId, input.planFingerprint, input.year, input.actorId, input.processId,
      nowIso(this.clock), input.summary.CREATE || 0, input.summary.UPDATE || 0,
      input.summary.UNCHANGED || 0, input.summary.BLOCKED || 0, input.summary.NOT_PUBLISHED || 0
    );
  }

  finishRun(runId, status, options = {}){
    this.db.prepare(`update c21_publication_runs
      set completed_at=?,status=?,error_code=?,rolled_back=?,create_count=?,update_count=?,unchanged_count=?,blocked_count=?,not_published_count=?
      where run_id=?`).run(
      nowIso(this.clock), status, options.errorCode || null, options.rolledBack ? 1 : 0,
      options.counts && options.counts.created || 0,
      options.counts && options.counts.updated || 0,
      options.counts && options.counts.unchanged || 0,
      options.counts && options.counts.blocked || 0,
      options.counts && options.counts.notPublished || 0,
      runId
    );
  }

  listRuns(){
    return this.db.prepare('select * from c21_publication_runs order by started_at, run_id').all();
  }

  ensureActivity(target){
    const source = target.source;
    const activity = target.activity;
    const activityId = deterministicId('ACT', `${source.year}|${source.definitionId}`);
    const timestamp = nowIso(this.clock);
    this.db.prepare(`insert into c21_publication_activities(
      activity_id,source_year,definition_id,label,statcom_code,business_code,created_at,updated_at
    ) values (?,?,?,?,?,?,?,?) on conflict(source_year,definition_id) do nothing`).run(
      activityId, source.year, source.definitionId, activity.label, activity.statComCode,
      activity.businessCode, timestamp, timestamp
    );
    const existing = this.db.prepare('select * from c21_publication_activities where source_year=? and definition_id=?').get(source.year, source.definitionId);
    if(String(existing.business_code || '') !== String(activity.businessCode || '') || String(existing.statcom_code || '') !== String(activity.statComCode || '')){
      const error = new Error('Canonical activity code is immutable.');
      error.code = 'BUSINESS_CODE_IMMUTABLE';
      throw error;
    }
    return existing.activity_id;
  }

  replaceRelations(eventId, target){
    const specs = [
      ['c21_event_domains', 'domain_code', target.relations.domainCodes],
      ['c21_event_targets', 'target_code', target.relations.targetCodes],
      ['c21_event_ois', 'oi_code', target.relations.oiCodes],
      ['c21_event_publics', 'public_code', target.relations.publicCodes],
      ['c21_event_roles', 'role_code', target.relations.roleCodes],
      ['c21_event_resources', 'resource_code', target.relations.resourceCodes]
    ];
    for(const [table, column, values] of specs){
      this.db.prepare(`delete from ${table} where event_id=?`).run(eventId);
      const insert = this.db.prepare(`insert into ${table}(event_id,${column}) values (?,?)`);
      for(const value of values || []) insert.run(eventId, value);
    }
  }

  attachSession(eventId, activityId, target){
    const session = target.session;
    const timestamp = nowIso(this.clock);
    this.db.prepare(`insert into c21_session_groups(group_id,activity_id,session_count,created_at)
      values (?,?,?,?) on conflict(group_id) do nothing`).run(session.groupId, activityId, session.count, timestamp);
    const group = this.db.prepare('select * from c21_session_groups where group_id=?').get(session.groupId);
    if(group.activity_id !== activityId || Number(group.session_count) !== Number(session.count)){
      const error = new Error('Session group is inconsistent with the publication target.');
      error.code = 'SESSION_GROUP_CONFLICT';
      throw error;
    }
    this.db.prepare(`insert into c21_session_events(group_id,event_id,session_index,session_label)
      values (?,?,?,?)`).run(session.groupId, eventId, session.index, session.label);
  }

  createTarget(target, checkpoint){
    const activityId = this.ensureActivity(target);
    const eventId = deterministicId('EVT', target.publicationKey);
    const timestamp = nowIso(this.clock);
    this.db.prepare(`insert into c21_events(
      event_id,publication_key,activity_id,source_year,status,label,primary_domain,family,event_type,starts_at,ends_at,duration_minutes,
      location_code,room_code,responsible_id,entry_service,priority,fixed_date,day_exclusive,permutation_allowed,
      business_exception,published_fingerprint,version,created_at,updated_at
    ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`).run(
      eventId, target.publicationKey, activityId, target.sourceYear, target.event.status, target.event.label,
      target.event.primaryDomain, target.event.family, target.event.eventType, target.event.startsAt, target.event.endsAt, target.event.durationMinutes,
      target.event.locationCode, target.event.roomCode, target.event.responsibleId,
      target.event.entryService, target.event.priority, target.event.fixedDate ? 1 : 0, target.event.dayExclusive ? 1 : 0,
      target.event.permutationAllowed ? 1 : 0, target.event.businessException, target.fingerprint, timestamp, timestamp
    );
    checkpoint('AFTER_EVENT');
    this.db.prepare(`insert into c21_qv_publication_links(
      provenance_id,event_id,publication_key,source_year,definition_id,occurrence_id,session_id,publication_unit_id,
      source_record_ids,last_synced_fingerprint,last_synced_at
    ) values (?,?,?,?,?,?,?,?,?,?,?)`).run(
      deterministicId('PRV', target.publicationKey), eventId, target.publicationKey, target.source.year,
      target.source.definitionId, target.source.occurrenceId, target.source.sessionId, target.source.publicationUnitId,
      json(target.source.sourceRecordIds || []), target.fingerprint, timestamp
    );
    checkpoint('AFTER_PROVENANCE');
    this.replaceRelations(eventId, target);
    checkpoint('AFTER_RELATIONS');
    this.attachSession(eventId, activityId, target);
    checkpoint('AFTER_SESSION');
    return eventId;
  }

  updateTarget(existing, target, checkpoint){
    const activity = this.db.prepare('select * from c21_publication_activities where activity_id=?').get(existing.activityId);
    if(String(activity.business_code || '') !== String(target.activity.businessCode || '') || String(activity.statcom_code || '') !== String(target.activity.statComCode || '')){
      const error = new Error('Canonical activity code is immutable.');
      error.code = 'BUSINESS_CODE_IMMUTABLE';
      throw error;
    }
    const timestamp = nowIso(this.clock);
    this.db.prepare(`update c21_events set
      status=?,label=?,primary_domain=?,family=?,event_type=?,starts_at=?,ends_at=?,duration_minutes=?,location_code=?,room_code=?,
      responsible_id=?,entry_service=?,priority=?,fixed_date=?,day_exclusive=?,permutation_allowed=?,business_exception=?,
      published_fingerprint=?,version=version+1,updated_at=?
      where event_id=?`).run(
      target.event.status, target.event.label, target.event.primaryDomain, target.event.family, target.event.eventType,
      target.event.startsAt, target.event.endsAt,
      target.event.durationMinutes, target.event.locationCode, target.event.roomCode, target.event.responsibleId,
      target.event.entryService, target.event.priority, target.event.fixedDate ? 1 : 0, target.event.dayExclusive ? 1 : 0,
      target.event.permutationAllowed ? 1 : 0, target.event.businessException, target.fingerprint, timestamp, existing.eventId
    );
    checkpoint('AFTER_EVENT');
    this.db.prepare(`update c21_qv_publication_links set source_record_ids=?,last_synced_fingerprint=?,last_synced_at=? where event_id=?`).run(
      json(target.source.sourceRecordIds || []), target.fingerprint, timestamp, existing.eventId
    );
    checkpoint('AFTER_PROVENANCE');
    this.replaceRelations(existing.eventId, target);
    checkpoint('AFTER_RELATIONS');
    checkpoint('AFTER_SESSION');
    return existing.eventId;
  }

  relationValues(table, column, eventId){
    return this.db.prepare(`select ${column} as value from ${table} where event_id=? order by ${column}`).all(eventId).map((row) => row.value);
  }

  operationalState(eventId){
    const rows = this.db.prepare('select kind,count(*) as n from c21_operational_data where event_id=? group by kind').all(eventId);
    const counts = Object.fromEntries(rows.map((row) => [row.kind, Number(row.n)]));
    return {
      attendus: counts.ATTENDU || 0,
      participations: counts.PARTICIPATION || 0,
      permutations: counts.PERMUTATION || 0,
      rattrapages: counts.RATTRAPAGE || 0,
      decisions: counts.DECISION || 0
    };
  }

  snapshot(year){
    const events = this.db.prepare(`select e.*,a.definition_id,a.label as activity_label,a.statcom_code,a.business_code,
      p.occurrence_id,p.session_id,p.publication_unit_id,p.source_record_ids,p.last_synced_fingerprint,
      s.group_id,s.session_index,s.session_label,g.session_count
      from c21_events e
      join c21_publication_activities a on a.activity_id=e.activity_id
      join c21_qv_publication_links p on p.event_id=e.event_id
      join c21_session_events s on s.event_id=e.event_id
      join c21_session_groups g on g.group_id=s.group_id
      where e.source_year=? order by e.publication_key`).all(Number(year));
    return events.map((row) => {
      const desired = {
        publicationKey: row.publication_key,
        sourceType: 'QUO_VADIS',
        sourceYear: Number(row.source_year),
        source: {
          year: Number(row.source_year), definitionId: row.definition_id, occurrenceId: row.occurrence_id,
          sessionId: row.session_id, publicationUnitId: row.publication_unit_id,
          sourceRecordIds: parseJson(row.source_record_ids, [])
        },
        activity: { definitionId: row.definition_id, label: row.activity_label, statComCode: row.statcom_code, businessCode: row.business_code },
        occurrence: { occurrenceId: row.occurrence_id, sessionId: row.session_id, publicationUnitId: row.publication_unit_id },
        session: { groupId: row.group_id, index: Number(row.session_index), count: Number(row.session_count), label: row.session_label },
        event: {
          status: row.status, label: row.label, primaryDomain: row.primary_domain,
          family: row.family, eventType: row.event_type,
          startsAt: row.starts_at, endsAt: row.ends_at, startDate: row.starts_at.slice(0, 10), endDate: row.ends_at.slice(0, 10),
          startTime: row.starts_at.slice(11), endTime: row.ends_at.slice(11), durationMinutes: Number(row.duration_minutes),
          crossesMidnight: row.starts_at.slice(0, 10) !== row.ends_at.slice(0, 10),
          locationCode: row.location_code, roomCode: row.room_code, responsibleId: row.responsible_id,
          entryService: row.entry_service, priority: row.priority == null ? null : Number(row.priority),
          fixedDate: Boolean(row.fixed_date), dayExclusive: Boolean(row.day_exclusive), permutationAllowed: Boolean(row.permutation_allowed),
          businessException: row.business_exception
        },
        relations: {
          domainCodes: this.relationValues('c21_event_domains', 'domain_code', row.event_id),
          targetCodes: this.relationValues('c21_event_targets', 'target_code', row.event_id),
          publicCodes: this.relationValues('c21_event_publics', 'public_code', row.event_id),
          oiCodes: this.relationValues('c21_event_ois', 'oi_code', row.event_id),
          roleCodes: this.relationValues('c21_event_roles', 'role_code', row.event_id),
          resourceCodes: this.relationValues('c21_event_resources', 'resource_code', row.event_id)
        }
      };
      desired.fingerprint = planner.targetFingerprint(desired);
      return {
        eventId: row.event_id,
        activityId: row.activity_id,
        publicationKey: row.publication_key,
        sourceType: 'QUO_VADIS',
        sourceYear: Number(row.source_year),
        source: desired.source,
        publicationFingerprint: row.published_fingerprint,
        fingerprint: desired.fingerprint,
        lastSyncedFingerprint: row.last_synced_fingerprint,
        version: Number(row.version),
        desired,
        operationalState: this.operationalState(row.event_id)
      };
    });
  }

  getByPublicationKey(key){
    const row = this.db.prepare('select source_year from c21_events where publication_key=?').get(key);
    return row ? this.snapshot(row.source_year).find((item) => item.publicationKey === key) : null;
  }

  addOperationalData(publicationKey, kind, payload = {}){
    const event = this.db.prepare('select event_id from c21_events where publication_key=?').get(publicationKey);
    if(!event) throw new Error('Event not found.');
    this.db.prepare('insert into c21_operational_data(operational_id,event_id,kind,payload,created_at) values (?,?,?,?,?)').run(
      randomUUID(), event.event_id, String(kind), json(payload), nowIso(this.clock)
    );
  }

  directMutate(publicationKey, patch){
    const allowed = { roomCode: 'room_code', locationCode: 'location_code', responsibleId: 'responsible_id', startsAt: 'starts_at', endsAt: 'ends_at', status: 'status' };
    for(const [field, value] of Object.entries(patch || {})){
      const column = allowed[field];
      if(!column) throw new Error(`Unsupported direct mutation: ${field}`);
      this.db.prepare(`update c21_events set ${column}=?,updated_at=? where publication_key=?`).run(value, nowIso(this.clock), publicationKey);
    }
  }

  deleteRelation(publicationKey, kind, code){
    const event = this.db.prepare('select event_id from c21_events where publication_key=?').get(publicationKey);
    const specs = { oi: ['c21_event_ois', 'oi_code'], public: ['c21_event_publics', 'public_code'], target: ['c21_event_targets', 'target_code'] };
    const spec = specs[kind];
    if(!event || !spec) throw new Error('Relation not found.');
    this.db.prepare(`delete from ${spec[0]} where event_id=? and ${spec[1]}=?`).run(event.event_id, code);
  }

  counts(){
    const names = ['c21_publication_activities','c21_events','c21_qv_publication_links','c21_event_domains','c21_event_targets','c21_event_ois','c21_event_publics','c21_event_roles','c21_event_resources','c21_session_groups','c21_session_events','c21_operational_data'];
    return Object.fromEntries(names.map((name) => [name, Number(this.db.prepare(`select count(*) as n from ${name}`).get().n)]));
  }

  rawDuplicateEvent(publicationKey){
    const row = this.db.prepare('select * from c21_events where publication_key=?').get(publicationKey);
    return this.db.prepare(`insert into c21_events(
      event_id,publication_key,activity_id,source_year,status,label,primary_domain,family,event_type,starts_at,ends_at,duration_minutes,
      location_code,room_code,responsible_id,entry_service,priority,fixed_date,day_exclusive,permutation_allowed,
      business_exception,published_fingerprint,version,created_at,updated_at
    ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      randomUUID(), row.publication_key, row.activity_id, row.source_year, row.status, row.label, row.primary_domain,
      row.family, row.event_type, row.starts_at, row.ends_at, row.duration_minutes, row.location_code, row.room_code,
      row.responsible_id, row.entry_service, row.priority, row.fixed_date, row.day_exclusive, row.permutation_allowed,
      row.business_exception, row.published_fingerprint, 1, nowIso(this.clock), nowIso(this.clock)
    );
  }

  provenanceByEvent(eventId){
    return this.db.prepare('select * from c21_qv_publication_links where event_id=?').get(eventId) || null;
  }

  provenanceBySource(source){
    return this.db.prepare(`select * from c21_qv_publication_links
      where source_year=? and definition_id=? and occurrence_id=? and session_id=? and publication_unit_id=?`).get(
      source.year, source.definitionId, source.occurrenceId, source.sessionId, source.publicationUnitId
    ) || null;
  }

  listActivities(year){
    return this.db.prepare('select * from c21_publication_activities where source_year=? order by definition_id').all(Number(year));
  }

  listSessionEvents(groupId){
    return this.db.prepare('select * from c21_session_events where group_id=? order by session_index,event_id').all(groupId);
  }
}

module.exports = { C21PublicationFixtureDb, SCHEMA_PATH, deterministicId };

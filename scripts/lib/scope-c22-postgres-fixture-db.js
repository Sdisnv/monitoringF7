'use strict';

const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const { Pool } = require('pg');
const planner = require('../../netlify/lib/_scope-qv-publication-plan');

const ROOT = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(ROOT, 'database/fixtures/scope_qv_publication_c22_postgres.sql');
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const REQUIRED_DATABASE = 'scope_c22_preprod';

function nowIso(clock){
  return typeof clock === 'function' ? String(clock()) : new Date().toISOString();
}

function deterministicUuid(value){
  const hex = createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function assertSafeConnection(connectionString){
  const parsed = new URL(connectionString);
  const database = parsed.pathname.replace(/^\//, '');
  if(parsed.protocol !== 'postgresql:' || !ALLOWED_HOSTS.has(parsed.hostname) || database !== REQUIRED_DATABASE){
    const error = new Error('C22 PostgreSQL fixture only accepts the dedicated loopback database.');
    error.code = 'C22_UNSAFE_POSTGRES_TARGET';
    throw error;
  }
  return { host: parsed.hostname, port: Number(parsed.port || 5432), database };
}

class C22PostgresFixtureDb {
  constructor(options){
    this.adapterKind = 'C22_POSTGRES_EPHEMERAL_FIXTURE';
    this.isIsolated = true;
    this.isProduction = false;
    this.clock = options.clock;
    this.connection = assertSafeConnection(options.connectionString);
    this.pool = new Pool({ connectionString: options.connectionString, max: 4 });
    this._tail = Promise.resolve();
    this._client = null;
  }

  static async open(options = {}){
    const store = new C22PostgresFixtureDb(options);
    await store.initialize();
    return store;
  }

  async initialize(){
    await this.pool.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const proof = await this.pool.query(`select current_database() as database, inet_server_addr()::text as host,
      inet_server_port() as port, current_setting('server_version') as version`);
    this.serverProof = proof.rows[0];
    return this.serverProof;
  }

  async close(){
    await this.pool.end();
  }

  query(text, params = []){
    return (this._client || this.pool).query({ text, values: params });
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
    const client = await this.pool.connect();
    await client.query('begin');
    this._client = client;
    try{
      const result = await task(this);
      await client.query('commit');
      return result;
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{
      this._client = null;
      client.release();
    }
  }

  async startRun(input){
    await this.query(`insert into c22_gate.scope_publication_runs(
      run_id,plan_id,plan_fingerprint,source_year,actor_id,process_id,started_at,status,
      planned_create_count,planned_update_count,planned_unchanged_count,planned_blocked_count,planned_not_published_count
    ) values ($1,$2,$3,$4,$5,$6,$7,'STARTED',$8,$9,$10,$11,$12)`, [
      input.runId, input.planId, input.planFingerprint, input.year, input.actorId, input.processId,
      nowIso(this.clock), input.summary.CREATE || 0, input.summary.UPDATE || 0,
      input.summary.UNCHANGED || 0, input.summary.BLOCKED || 0, input.summary.NOT_PUBLISHED || 0
    ]);
  }

  async finishRun(runId, status, options = {}){
    await this.query(`update c22_gate.scope_publication_runs set
      completed_at=$1,status=$2,error_code=$3,rolled_back=$4,create_count=$5,update_count=$6,
      unchanged_count=$7,blocked_count=$8,not_published_count=$9 where run_id=$10`, [
      nowIso(this.clock), status, options.errorCode || null, Boolean(options.rolledBack),
      options.counts && options.counts.created || 0, options.counts && options.counts.updated || 0,
      options.counts && options.counts.unchanged || 0, options.counts && options.counts.blocked || 0,
      options.counts && options.counts.notPublished || 0, runId
    ]);
  }

  async listRuns(){
    return (await this.query('select * from c22_gate.scope_publication_runs order by started_at, run_id')).rows;
  }

  async ensureActivity(target){
    const activityKey = `${target.source.definitionId}|${target.activity.businessCode || target.activity.statComCode || ''}`;
    const id = deterministicUuid(`ACT|${target.source.year}|${activityKey}`);
    const timestamp = nowIso(this.clock);
    await this.query(`insert into c22_gate.scope_activities(
      id,source_year,definition_id,activity_key,libelle,statcom_code,code_metier,created_at,updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8) on conflict(source_year,activity_key) do nothing`, [
      id, target.source.year, target.source.definitionId, activityKey, target.activity.label,
      target.activity.statComCode, target.activity.businessCode, timestamp
    ]);
    const existing = (await this.query(
      'select * from c22_gate.scope_activities where source_year=$1 and activity_key=$2',
      [target.source.year, activityKey]
    )).rows[0];
    if(String(existing.code_metier || '') !== String(target.activity.businessCode || '')
      || String(existing.statcom_code || '') !== String(target.activity.statComCode || '')){
      const error = new Error('Canonical activity code is immutable.');
      error.code = 'BUSINESS_CODE_IMMUTABLE';
      throw error;
    }
    return existing.id;
  }

  async replaceRelations(eventId, target){
    const specs = [
      ['scope_evenement_domaines', 'domaine_code', target.relations.domainCodes],
      ['scope_evenement_cibles', 'cible_code', target.relations.targetCodes],
      ['scope_evenement_ois', 'oi_code', target.relations.oiCodes],
      ['scope_evenement_publics', 'public_code', target.relations.publicCodes],
      ['scope_evenement_roles', 'role_code', target.relations.roleCodes],
      ['scope_evenement_ressources', 'ressource_code', target.relations.resourceCodes]
    ];
    for(const [table, column, values] of specs){
      await this.query(`delete from c22_gate.${table} where evenement_id=$1`, [eventId]);
      for(const value of values || []){
        await this.query(`insert into c22_gate.${table}(evenement_id,${column}) values ($1,$2)`, [eventId, value]);
      }
    }
  }

  async attachSession(eventId, activityId, target){
    const timestamp = nowIso(this.clock);
    await this.query(`insert into c22_gate.scope_session_groupes(group_id,activite_id,session_count,created_at)
      values ($1,$2,$3,$4) on conflict(group_id) do nothing`, [target.session.groupId, activityId, target.session.count, timestamp]);
    const group = (await this.query('select * from c22_gate.scope_session_groupes where group_id=$1', [target.session.groupId])).rows[0];
    if(group.activite_id !== activityId || Number(group.session_count) !== Number(target.session.count)){
      const error = new Error('Session group is inconsistent with the publication target.');
      error.code = 'SESSION_GROUP_CONFLICT';
      throw error;
    }
    await this.query(`insert into c22_gate.scope_session_evenements(group_id,evenement_id,session_index,session_label)
      values ($1,$2,$3,$4)`, [target.session.groupId, eventId, target.session.index, target.session.label]);
  }

  async createTarget(target, checkpoint){
    const activityId = await this.ensureActivity(target);
    const eventId = deterministicUuid(`EVT|${target.publicationKey}`);
    const timestamp = nowIso(this.clock);
    await this.query(`insert into c22_gate.scope_evenements(
      id,publication_key,activite_id,source_year,statut,libelle,domaine_code,famille,type_evenement,debut,fin,duree_minutes,
      lieu_code,salle_code,responsable_id,entree_service,priorite,date_fixe,journee_reservee,permutation_autorisee,
      exception_metier,publication_fingerprint,version,created_at,updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,1,$23,$23)`, [
      eventId, target.publicationKey, activityId, target.sourceYear, target.event.status, target.event.label,
      target.event.primaryDomain, target.event.family, target.event.eventType, target.event.startsAt, target.event.endsAt,
      target.event.durationMinutes, target.event.locationCode, target.event.roomCode, target.event.responsibleId,
      target.event.entryService, target.event.priority, target.event.fixedDate, target.event.dayExclusive,
      target.event.permutationAllowed, target.event.businessException, target.fingerprint, timestamp
    ]);
    checkpoint('AFTER_EVENT');
    await this.query(`insert into c22_gate.scope_qv_publication_links(
      id,evenement_id,publication_key,source_year,definition_id,occurrence_id,session_id,publication_unit_id,
      source_record_ids,last_synced_fingerprint,last_synced_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`, [
      deterministicUuid(`PRV|${target.publicationKey}`), eventId, target.publicationKey, target.source.year,
      target.source.definitionId, target.source.occurrenceId, target.source.sessionId, target.source.publicationUnitId,
      JSON.stringify(target.source.sourceRecordIds || []), target.fingerprint, timestamp
    ]);
    checkpoint('AFTER_PROVENANCE');
    await this.replaceRelations(eventId, target);
    checkpoint('AFTER_RELATIONS');
    await this.attachSession(eventId, activityId, target);
    checkpoint('AFTER_SESSION');
    return eventId;
  }

  async updateTarget(existing, target, checkpoint){
    const activity = (await this.query('select * from c22_gate.scope_activities where id=$1', [existing.activityId])).rows[0];
    if(String(activity.code_metier || '') !== String(target.activity.businessCode || '')
      || String(activity.statcom_code || '') !== String(target.activity.statComCode || '')){
      const error = new Error('Canonical activity code is immutable.');
      error.code = 'BUSINESS_CODE_IMMUTABLE';
      throw error;
    }
    const timestamp = nowIso(this.clock);
    await this.query(`update c22_gate.scope_evenements set
      statut=$1,libelle=$2,domaine_code=$3,famille=$4,type_evenement=$5,debut=$6,fin=$7,duree_minutes=$8,
      lieu_code=$9,salle_code=$10,responsable_id=$11,entree_service=$12,priorite=$13,date_fixe=$14,
      journee_reservee=$15,permutation_autorisee=$16,exception_metier=$17,publication_fingerprint=$18,
      version=version+1,updated_at=$19 where id=$20`, [
      target.event.status, target.event.label, target.event.primaryDomain, target.event.family, target.event.eventType,
      target.event.startsAt, target.event.endsAt, target.event.durationMinutes, target.event.locationCode,
      target.event.roomCode, target.event.responsibleId, target.event.entryService, target.event.priority,
      target.event.fixedDate, target.event.dayExclusive, target.event.permutationAllowed,
      target.event.businessException, target.fingerprint, timestamp, existing.eventId
    ]);
    checkpoint('AFTER_EVENT');
    await this.query(`update c22_gate.scope_qv_publication_links set source_record_ids=$1::jsonb,
      last_synced_fingerprint=$2,last_synced_at=$3 where evenement_id=$4`, [
      JSON.stringify(target.source.sourceRecordIds || []), target.fingerprint, timestamp, existing.eventId
    ]);
    checkpoint('AFTER_PROVENANCE');
    await this.replaceRelations(existing.eventId, target);
    checkpoint('AFTER_RELATIONS');
    checkpoint('AFTER_SESSION');
    return existing.eventId;
  }

  async relationValues(table, column, eventId){
    return (await this.query(`select ${column} as value from c22_gate.${table} where evenement_id=$1 order by ${column}`, [eventId])).rows.map((row) => row.value);
  }

  async operationalState(eventId){
    const rows = (await this.query(`select kind,count(*)::integer as n from c22_gate.scope_donnees_operationnelles
      where evenement_id=$1 group by kind`, [eventId])).rows;
    const counts = Object.fromEntries(rows.map((row) => [row.kind, Number(row.n)]));
    return {
      attendus: counts.ATTENDU || 0, participations: counts.PARTICIPATION || 0,
      permutations: counts.PERMUTATION || 0, rattrapages: counts.RATTRAPAGE || 0, decisions: counts.DECISION || 0
    };
  }

  async snapshot(year, publicationKey = null){
    const params = [Number(year)];
    let filter = '';
    if(publicationKey){ params.push(publicationKey); filter = ' and e.publication_key=$2'; }
    const events = (await this.query(`select e.*,a.definition_id,a.libelle as activity_label,a.statcom_code,a.code_metier,
      p.occurrence_id,p.session_id,p.publication_unit_id,p.source_record_ids,p.last_synced_fingerprint,
      s.group_id,s.session_index,s.session_label,g.session_count,
      to_char(e.debut,'YYYY-MM-DD"T"HH24:MI') as starts_at,
      to_char(e.fin,'YYYY-MM-DD"T"HH24:MI') as ends_at
      from c22_gate.scope_evenements e
      join c22_gate.scope_activities a on a.id=e.activite_id
      join c22_gate.scope_qv_publication_links p on p.evenement_id=e.id
      join c22_gate.scope_session_evenements s on s.evenement_id=e.id
      join c22_gate.scope_session_groupes g on g.group_id=s.group_id
      where e.source_year=$1${filter} order by e.publication_key`, params)).rows;
    const output = [];
    for(const row of events){
      const desired = {
        publicationKey: row.publication_key, sourceType: 'QUO_VADIS', sourceYear: Number(row.source_year),
        source: {
          year: Number(row.source_year), definitionId: row.definition_id, occurrenceId: row.occurrence_id,
          sessionId: row.session_id, publicationUnitId: row.publication_unit_id, sourceRecordIds: row.source_record_ids
        },
        activity: { definitionId: row.definition_id, label: row.activity_label, statComCode: row.statcom_code, businessCode: row.code_metier },
        occurrence: { occurrenceId: row.occurrence_id, sessionId: row.session_id, publicationUnitId: row.publication_unit_id },
        session: { groupId: row.group_id, index: Number(row.session_index), count: Number(row.session_count), label: row.session_label },
        event: {
          status: row.statut, label: row.libelle, primaryDomain: row.domaine_code, family: row.famille,
          eventType: row.type_evenement, startsAt: row.starts_at, endsAt: row.ends_at,
          startDate: row.starts_at.slice(0, 10), endDate: row.ends_at.slice(0, 10),
          startTime: row.starts_at.slice(11), endTime: row.ends_at.slice(11), durationMinutes: Number(row.duree_minutes),
          crossesMidnight: row.starts_at.slice(0, 10) !== row.ends_at.slice(0, 10),
          locationCode: row.lieu_code, roomCode: row.salle_code, responsibleId: row.responsable_id,
          entryService: row.entree_service, priority: row.priorite == null ? null : Number(row.priorite),
          fixedDate: row.date_fixe, dayExclusive: row.journee_reservee,
          permutationAllowed: row.permutation_autorisee, businessException: row.exception_metier
        },
        relations: {
          domainCodes: await this.relationValues('scope_evenement_domaines', 'domaine_code', row.id),
          targetCodes: await this.relationValues('scope_evenement_cibles', 'cible_code', row.id),
          oiCodes: await this.relationValues('scope_evenement_ois', 'oi_code', row.id),
          publicCodes: await this.relationValues('scope_evenement_publics', 'public_code', row.id),
          roleCodes: await this.relationValues('scope_evenement_roles', 'role_code', row.id),
          resourceCodes: await this.relationValues('scope_evenement_ressources', 'ressource_code', row.id)
        }
      };
      desired.fingerprint = planner.targetFingerprint(desired);
      output.push({
        eventId: row.id, activityId: row.activite_id, publicationKey: row.publication_key,
        sourceType: 'QUO_VADIS', sourceYear: Number(row.source_year), source: desired.source,
        publicationFingerprint: row.publication_fingerprint, fingerprint: desired.fingerprint,
        lastSyncedFingerprint: row.last_synced_fingerprint, version: Number(row.version), desired,
        operationalState: await this.operationalState(row.id)
      });
    }
    return output;
  }

  async getByPublicationKey(key){
    const year = (await this.query('select source_year from c22_gate.scope_evenements where publication_key=$1', [key])).rows[0];
    if(!year) return null;
    return (await this.snapshot(year.source_year, key))[0] || null;
  }

  async addOperationalData(publicationKey, kind, payload = {}){
    const event = (await this.query('select id from c22_gate.scope_evenements where publication_key=$1', [publicationKey])).rows[0];
    if(!event) throw new Error('Event not found.');
    await this.query(`insert into c22_gate.scope_donnees_operationnelles(id,evenement_id,kind,payload,created_at)
      values ($1,$2,$3,$4::jsonb,$5)`, [randomUUID(), event.id, String(kind), JSON.stringify(payload), nowIso(this.clock)]);
  }

  async directMutate(publicationKey, patch){
    const allowed = { roomCode: 'salle_code', locationCode: 'lieu_code', responsibleId: 'responsable_id', startsAt: 'debut', endsAt: 'fin', status: 'statut' };
    for(const [field, value] of Object.entries(patch || {})){
      const column = allowed[field];
      if(!column) throw new Error(`Unsupported direct mutation: ${field}`);
      await this.query(`update c22_gate.scope_evenements set ${column}=$1,updated_at=$2 where publication_key=$3`, [value, nowIso(this.clock), publicationKey]);
    }
  }

  async deleteRelation(publicationKey, kind, code){
    const event = (await this.query('select id from c22_gate.scope_evenements where publication_key=$1', [publicationKey])).rows[0];
    const specs = {
      oi: ['scope_evenement_ois', 'oi_code'], public: ['scope_evenement_publics', 'public_code'],
      target: ['scope_evenement_cibles', 'cible_code']
    };
    const spec = specs[kind];
    if(!event || !spec) throw new Error('Relation not found.');
    await this.query(`delete from c22_gate.${spec[0]} where evenement_id=$1 and ${spec[1]}=$2`, [event.id, code]);
  }

  async counts(){
    const names = [
      'scope_activities','scope_evenements','scope_qv_publication_links','scope_evenement_domaines',
      'scope_evenement_cibles','scope_evenement_ois','scope_evenement_publics','scope_evenement_roles',
      'scope_evenement_ressources','scope_session_groupes','scope_session_evenements','scope_donnees_operationnelles'
    ];
    const result = {};
    for(const name of names){
      result[name] = Number((await this.query(`select count(*)::integer as n from c22_gate.${name}`)).rows[0].n);
    }
    return result;
  }

  async rawDuplicateEvent(publicationKey){
    const row = (await this.query('select * from c22_gate.scope_evenements where publication_key=$1', [publicationKey])).rows[0];
    return this.query(`insert into c22_gate.scope_evenements(
      id,publication_key,activite_id,source_year,statut,libelle,domaine_code,famille,type_evenement,debut,fin,duree_minutes,
      lieu_code,salle_code,responsable_id,entree_service,priorite,date_fixe,journee_reservee,permutation_autorisee,
      exception_metier,publication_fingerprint,version,created_at,updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,1,$23,$23)`, [
      randomUUID(), row.publication_key, row.activite_id, row.source_year, row.statut, row.libelle, row.domaine_code,
      row.famille, row.type_evenement, row.debut, row.fin, row.duree_minutes, row.lieu_code, row.salle_code,
      row.responsable_id, row.entree_service, row.priorite, row.date_fixe, row.journee_reservee,
      row.permutation_autorisee, row.exception_metier, row.publication_fingerprint, nowIso(this.clock)
    ]);
  }

  async provenanceByEvent(eventId){
    return (await this.query('select * from c22_gate.scope_qv_publication_links where evenement_id=$1', [eventId])).rows[0] || null;
  }

  async provenanceBySource(source){
    return (await this.query(`select * from c22_gate.scope_qv_publication_links where
      source_year=$1 and definition_id=$2 and occurrence_id=$3 and session_id=$4 and publication_unit_id=$5`, [
      source.year, source.definitionId, source.occurrenceId, source.sessionId, source.publicationUnitId
    ])).rows[0] || null;
  }

  async schemaEvidence(){
    const columns = (await this.pool.query(`select table_name,column_name,data_type,is_nullable
      from information_schema.columns where table_schema='c22_gate' order by table_name,ordinal_position`)).rows;
    const constraints = (await this.pool.query(`select tc.table_name,tc.constraint_type,tc.constraint_name
      from information_schema.table_constraints tc where tc.table_schema='c22_gate'
      order by tc.table_name,tc.constraint_type,tc.constraint_name`)).rows;
    const rls = (await this.pool.query(`select relname as table_name,relrowsecurity as enabled
      from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace
      where nspname='c22_gate' and relkind='r' order by relname`)).rows;
    return { server: this.serverProof, columns, constraints, rls };
  }
}

module.exports = {
  SCHEMA_PATH,
  REQUIRED_DATABASE,
  assertSafeConnection,
  deterministicUuid,
  C22PostgresFixtureDb
};

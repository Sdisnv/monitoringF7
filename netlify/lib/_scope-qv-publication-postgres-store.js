'use strict';

const { createHash } = require('crypto');
const { Pool } = require('pg');
const planner = require('./_scope-qv-publication-plan');

const ADAPTER_KIND = 'SCOPE_QV_POSTGRES_PRODUCTION';
const MIGRATION_VERSION = 'scope-qv-publication-c23-repair-1';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function storeError(code, message){
  const error = new Error(message);
  error.code = code;
  return error;
}

function deterministicUuid(value){
  const hex = createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function inspectConnectionTarget(connectionString){
  let parsed;
  try { parsed = new URL(String(connectionString || '')); }
  catch(_error){ throw storeError('QV_POSTGRES_CONNECTION_INVALID', 'A valid PostgreSQL connection is required.'); }
  const database = parsed.pathname.replace(/^\//, '');
  if(!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !database){
    throw storeError('QV_POSTGRES_CONNECTION_INVALID', 'A valid PostgreSQL host and database are required.');
  }
  return { host: parsed.hostname, port: Number(parsed.port || 5432), database, loopback: LOOPBACK_HOSTS.has(parsed.hostname) };
}

function assertConnectionIntent(target, options = {}){
  const mode = String(options.deploymentMode || '').toLowerCase();
  if(mode === 'clone'){
    if(!target.loopback || options.allowCloneConnection !== true || target.database !== String(options.expectedDatabase || '')){
      throw storeError('QV_POSTGRES_CLONE_TARGET_REFUSED', 'Clone mode requires an explicitly named loopback database.');
    }
    return { mode, isProduction: false, isIsolated: true };
  }
  if(mode === 'production'){
    if(options.allowProductionConnection !== true
      || !String(options.expectedHost || '')
      || !String(options.expectedDatabase || '')
      || target.host !== String(options.expectedHost)
      || target.database !== String(options.expectedDatabase)){
      throw storeError('QV_POSTGRES_PRODUCTION_TARGET_REFUSED', 'Production connection requires an exact explicit host and database match.');
    }
    return { mode, isProduction: true, isIsolated: false };
  }
  throw storeError('QV_POSTGRES_MODE_REQUIRED', 'Explicit clone or production deployment mode is required.');
}

function isoTimestamp(clock){
  return typeof clock === 'function' ? String(clock()) : new Date().toISOString();
}

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date){
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

function canonicalLocationCode(row){
  return row.location_site_code ? `L-${row.location_site_code}` : null;
}

function canonicalRoomCode(row){
  return row.room_code ? `R-${row.room_code}` : null;
}

class ScopeQvPostgresStore {
  constructor(options = {}){
    this.connectionString = options.connectionString || process.env.SCOPE_DATABASE_URL || process.env.DATABASE_URL || '';
    this.target = inspectConnectionTarget(this.connectionString);
    const intent = assertConnectionIntent(this.target, options);
    this.adapterKind = ADAPTER_KIND;
    this.deploymentMode = intent.mode;
    this.isProduction = intent.isProduction;
    this.isIsolated = intent.isIsolated;
    this.readOnly = options.readOnly === true;
    this.clock = options.clock;
    this.statementTimeoutMs = Number(options.statementTimeoutMs || 30000);
    this.lockTimeoutMs = Number(options.lockTimeoutMs || 5000);
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: Number(options.maxConnections || 4),
      connectionTimeoutMillis: Number(options.connectionTimeoutMs || 10000),
      idleTimeoutMillis: Number(options.idleTimeoutMs || 10000),
      statement_timeout: this.statementTimeoutMs,
      application_name: 'scope-qv-publication-c23-repair-1'
    });
    this._client = null;
    this._tail = Promise.resolve();
  }

  static async open(options = {}){
    const store = new ScopeQvPostgresStore(options);
    try { await store.verify(); }
    catch(error){ await store.close(); throw error; }
    return store;
  }

  async verify(){
    const proof = (await this.pool.query(`select current_database() as database,
      current_setting('server_version') as version,
      exists(select 1 from monitoring_f7_schema_migrations where version=$1) as migration_ready`, [MIGRATION_VERSION])).rows[0];
    if(proof.database !== this.target.database) throw storeError('QV_POSTGRES_DATABASE_MISMATCH', 'Connected database differs from the approved target.');
    if(proof.migration_ready !== true) throw storeError('QV_POSTGRES_MIGRATION_REQUIRED', `Migration ${MIGRATION_VERSION} is required.`);
    this.serverProof = { database: proof.database, version: proof.version, target: this.target, mode: this.deploymentMode };
    return this.serverProof;
  }

  async close(){
    if(this.pool) await this.pool.end();
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
    try{
      await client.query(this.readOnly ? 'begin read only' : 'begin');
      await client.query(`set local statement_timeout = '${this.statementTimeoutMs}ms'`);
      await client.query(`set local lock_timeout = '${this.lockTimeoutMs}ms'`);
      if(!this.readOnly) await client.query('select pg_advisory_xact_lock($1)', [671902323]);
      this._client = client;
      const result = await task(this);
      await client.query('commit');
      return result;
    }catch(error){
      try { await client.query('rollback'); } catch(_rollbackError){}
      throw error;
    }finally{
      this._client = null;
      client.release();
    }
  }

  runUuid(runId){ return deterministicUuid(`RUN|${runId}`); }

  async startRun(input){
    if(this.readOnly) throw storeError('QV_POSTGRES_READ_ONLY', 'A read-only store cannot start a publication run.');
    await this.query(`insert into scope_qv_publication_runs(
      publication_run_id,plan_id,plan_fingerprint,source_year,actor_id,process_id,started_at,result,
      planned_create_count,planned_update_count,planned_unchanged_count,planned_blocked_count,planned_not_published_count
    ) values ($1,$2,$3,$4,$5,$6,$7,'STARTED',$8,$9,$10,$11,$12)`, [
      this.runUuid(input.runId), input.planId, input.planFingerprint, input.year, input.actorId,
      input.processId, isoTimestamp(this.clock), input.summary.CREATE || 0, input.summary.UPDATE || 0,
      input.summary.UNCHANGED || 0, input.summary.BLOCKED || 0, input.summary.NOT_PUBLISHED || 0
    ]);
  }

  async finishRun(runId, result, options = {}){
    if(this.readOnly) throw storeError('QV_POSTGRES_READ_ONLY', 'A read-only store cannot finish a publication run.');
    await this.query(`update scope_qv_publication_runs set completed_at=$1,result=$2,error_code=$3,rolled_back=$4,
      create_count=$5,update_count=$6,unchanged_count=$7,blocked_count=$8,not_published_count=$9
      where publication_run_id=$10`, [
      isoTimestamp(this.clock), result, options.errorCode || null, Boolean(options.rolledBack),
      options.counts && options.counts.created || 0, options.counts && options.counts.updated || 0,
      options.counts && options.counts.unchanged || 0, options.counts && options.counts.blocked || 0,
      options.counts && options.counts.notPublished || 0, this.runUuid(runId)
    ]);
  }

  async listRuns(){
    return (await this.query('select * from scope_qv_publication_runs order by started_at, publication_run_id')).rows;
  }

  async ensureActivity(target){
    const activityKey = `${target.source.definitionId}|${target.activity.businessCode || target.activity.statComCode || ''}`;
    const id = deterministicUuid(`ACT|${target.source.year}|${activityKey}`);
    await this.query(`insert into scope_qv_publication_activities(
      publication_activity_id,source_year,source_definition_id,activity_key,label,stat_com_code,business_code,created_at,updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8) on conflict(source_year,activity_key) do nothing`, [
      id, target.source.year, target.source.definitionId, activityKey, target.activity.label,
      target.activity.statComCode, target.activity.businessCode, isoTimestamp(this.clock)
    ]);
    const existing = (await this.query(`select * from scope_qv_publication_activities
      where source_year=$1 and activity_key=$2`, [target.source.year, activityKey])).rows[0];
    if(!existing || String(existing.business_code || '') !== String(target.activity.businessCode || '')
      || String(existing.stat_com_code || '') !== String(target.activity.statComCode || '')){
      throw storeError('BUSINESS_CODE_IMMUTABLE', 'Canonical activity code is immutable.');
    }
    return existing.publication_activity_id;
  }

  async resolveReferences(target){
    const domains = [...new Set(target.relations.domainCodes || [])];
    const domainRows = domains.length ? (await this.query('select code from scope_domaines where actif and code=any($1::text[])', [domains])).rows : [];
    if(domainRows.length !== domains.length) throw storeError('QV_UNKNOWN_DOMAIN', 'A canonical domain is absent from the production referential.');

    const oiCodes = [...new Set(target.relations.oiCodes || [])];
    const oiRows = oiCodes.length ? (await this.query('select oi_id,code from scope_ois where actif and code=any($1::text[])', [oiCodes])).rows : [];
    if(oiRows.length !== oiCodes.length) throw storeError('QV_UNKNOWN_OI', 'A canonical OI is absent from the production referential.');

    const siteCode = String(target.event.locationCode || '').replace(/^L-/, '');
    const location = siteCode ? (await this.query('select lieu_id,code,site_code from scope_lieux where actif and site_code=$1', [siteCode])).rows[0] : null;
    if(siteCode && !location) throw storeError('QV_UNKNOWN_LOCATION', 'A canonical location is absent from the production referential.');

    const roomCode = String(target.event.roomCode || '').replace(/^R-/, '');
    const room = roomCode ? (await this.query(`select s.salle_id,s.code,s.lieu_id from scope_salles_theorie s
      where s.actif and s.code=$1`, [roomCode])).rows[0] : null;
    if(roomCode && !room) throw storeError('QV_UNKNOWN_ROOM', 'A canonical room is absent from the production referential.');
    if(room && location && room.lieu_id !== location.lieu_id) throw storeError('QV_ROOM_LOCATION_MISMATCH', 'Canonical room and location disagree.');

    const exactTargets = [];
    for(const code of target.relations.targetCodes || []){
      const separator = code.indexOf('-');
      if(separator <= 0) continue;
      const domainCode = code.slice(0, separator);
      const levelCode = code.slice(separator + 1);
      const row = (await this.query(`select cible_id from scope_cibles
        where actif and domaine_code=$1 and niveau_code=$2`, [domainCode, levelCode])).rows[0];
      if(row) exactTargets.push(row.cible_id);
    }
    return { oiRows, location, room, exactTargets };
  }

  async replaceRelations(eventId, target, references){
    const textRelations = [
      ['scope_evenement_domaines', 'domaine_code', target.relations.domainCodes],
      ['scope_evenement_cibles_qv', 'cible_code', target.relations.targetCodes],
      ['scope_evenement_publics_qv', 'public_code', target.relations.publicCodes],
      ['scope_evenement_roles_qv', 'role_code', target.relations.roleCodes],
      ['scope_evenement_ressources_qv', 'ressource_code', target.relations.resourceCodes]
    ];
    for(const [table, column, values] of textRelations){
      await this.query(`delete from ${table} where evenement_id=$1`, [eventId]);
      for(const value of [...new Set(values || [])]) await this.query(`insert into ${table}(evenement_id,${column}) values ($1,$2)`, [eventId, value]);
    }

    await this.query('delete from scope_evenement_ois where evenement_id=$1', [eventId]);
    for(const row of references.oiRows) await this.query('insert into scope_evenement_ois(evenement_id,oi_id) values ($1,$2)', [eventId, row.oi_id]);

    await this.query('delete from scope_evenement_cibles where evenement_id=$1', [eventId]);
    for(const targetId of references.exactTargets) await this.query('insert into scope_evenement_cibles(evenement_id,cible_id) values ($1,$2)', [eventId, targetId]);
  }

  async attachSession(eventId, activityId, target){
    await this.query(`insert into scope_qv_session_groups(session_group_id,publication_activity_id,session_count,created_at)
      values ($1,$2,$3,$4) on conflict(session_group_id) do nothing`, [
      target.session.groupId, activityId, target.session.count, isoTimestamp(this.clock)
    ]);
    const group = (await this.query('select * from scope_qv_session_groups where session_group_id=$1', [target.session.groupId])).rows[0];
    if(!group || group.publication_activity_id !== activityId || Number(group.session_count) !== Number(target.session.count)){
      throw storeError('SESSION_GROUP_CONFLICT', 'Session group is inconsistent with the publication target.');
    }
    await this.query(`insert into scope_qv_session_events(session_group_id,evenement_id,session_index,session_label)
      values ($1,$2,$3,$4)`, [target.session.groupId, eventId, target.session.index, target.session.label]);
  }

  async createTarget(target, checkpoint){
    const activityId = await this.ensureActivity(target);
    const references = await this.resolveReferences(target);
    const eventId = deterministicUuid(`EVT|${target.publicationKey}`);
    const timestamp = isoTimestamp(this.clock);
    await this.query(`insert into scope_evenements(
      evenement_id,date,date_fin,domaine_code,libelle,statut,origine,mode_suivi,population_figee,population_version,
      version,internal_event_id,code_cours,code_source,source_type,heure_debut,heure_fin,salle,responsable,statcom_code,
      publication_key,publication_fingerprint,famille,type_evenement,lieu_id,salle_theorie_id,entree_service,
      duree_planifiee_minutes,priorite,date_fixe,journee_reservee,permutation_autorisee,exception_metier,created_at,updated_at
    ) values ($1,$2,$3,$4,$5,$6,'NOMINATIF','NOMINATIF',false,1,1,$7,$8,$9,'QUO_VADIS',$10,$11,$12,$13,$14,
      $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$28)`, [
      eventId, target.event.startDate, target.event.endDate, target.event.primaryDomain, target.event.label,
      target.event.status, `QV:${target.publicationKey}`, null, target.source.definitionId,
      target.event.startTime, target.event.endTime, target.event.roomCode, target.event.responsibleId,
      target.activity.statComCode, target.publicationKey, target.fingerprint, target.event.family, target.event.eventType,
      references.location && references.location.lieu_id, references.room && references.room.salle_id,
      target.event.entryService, target.event.durationMinutes, target.event.priority, target.event.fixedDate,
      target.event.dayExclusive, target.event.permutationAllowed, target.event.businessException, timestamp
    ]);
    checkpoint('AFTER_EVENT');
    await this.query(`insert into scope_qv_publication_links(
      publication_link_id,evenement_id,publication_activity_id,source_year,source_definition_id,source_occurrence_id,
      source_session_id,publication_unit_id,publication_key,source_record_ids,last_synced_fingerprint,last_synced_at,metadata
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13::jsonb)`, [
      deterministicUuid(`PRV|${target.publicationKey}`), eventId, activityId, target.source.year,
      target.source.definitionId, target.source.occurrenceId, target.source.sessionId, target.source.publicationUnitId,
      target.publicationKey, JSON.stringify(target.source.sourceRecordIds || []), target.fingerprint, timestamp,
      JSON.stringify({ sourceType: target.sourceType })
    ]);
    checkpoint('AFTER_PROVENANCE');
    await this.replaceRelations(eventId, target, references);
    checkpoint('AFTER_RELATIONS');
    await this.attachSession(eventId, activityId, target);
    checkpoint('AFTER_SESSION');
    return eventId;
  }

  async updateTarget(existing, target, checkpoint){
    const activity = (await this.query('select * from scope_qv_publication_activities where publication_activity_id=$1', [existing.activityId])).rows[0];
    if(!activity || String(activity.business_code || '') !== String(target.activity.businessCode || '')
      || String(activity.stat_com_code || '') !== String(target.activity.statComCode || '')){
      throw storeError('BUSINESS_CODE_IMMUTABLE', 'Canonical activity code is immutable.');
    }
    const references = await this.resolveReferences(target);
    const timestamp = isoTimestamp(this.clock);
    await this.query(`update scope_evenements set date=$1,date_fin=$2,domaine_code=$3,libelle=$4,statut=$5,
      code_cours=$6,code_source=$7,heure_debut=$8,heure_fin=$9,salle=$10,responsable=$11,statcom_code=$12,
      publication_fingerprint=$13,famille=$14,type_evenement=$15,lieu_id=$16,salle_theorie_id=$17,
      entree_service=$18,duree_planifiee_minutes=$19,priorite=$20,date_fixe=$21,journee_reservee=$22,
      permutation_autorisee=$23,exception_metier=$24,version=version+1,updated_at=$25 where evenement_id=$26`, [
      target.event.startDate, target.event.endDate, target.event.primaryDomain, target.event.label, target.event.status,
      null, target.source.definitionId, target.event.startTime, target.event.endTime,
      target.event.roomCode, target.event.responsibleId, target.activity.statComCode, target.fingerprint,
      target.event.family, target.event.eventType, references.location && references.location.lieu_id,
      references.room && references.room.salle_id, target.event.entryService, target.event.durationMinutes,
      target.event.priority, target.event.fixedDate, target.event.dayExclusive, target.event.permutationAllowed,
      target.event.businessException, timestamp, existing.eventId
    ]);
    checkpoint('AFTER_EVENT');
    await this.query(`update scope_qv_publication_links set source_record_ids=$1::jsonb,last_synced_fingerprint=$2,
      last_synced_at=$3,updated_at=$3 where evenement_id=$4`, [
      JSON.stringify(target.source.sourceRecordIds || []), target.fingerprint, timestamp, existing.eventId
    ]);
    checkpoint('AFTER_PROVENANCE');
    await this.replaceRelations(existing.eventId, target, references);
    checkpoint('AFTER_RELATIONS');
    checkpoint('AFTER_SESSION');
    return existing.eventId;
  }

  async relationValues(table, column, eventId){
    return (await this.query(`select ${column} as value from ${table} where evenement_id=$1 order by ${column}`, [eventId])).rows.map((row) => row.value);
  }

  async operationalState(eventId){
    const row = (await this.query(`select
      (select count(*)::integer from scope_attendus where evenement_id=$1) as attendus,
      (select count(*)::integer from scope_participations where evenement_id=$1) as participations,
      (select count(*)::integer from scope_permutations where source_evenement_id=$1 or rattrapage_evenement_id=$1) as permutations,
      (select count(*)::integer from scope_permutations where rattrapage_evenement_id=$1) as rattrapages,
      (select count(*)::integer from scope_journal_metier where entite='SCOPE_EVENEMENT' and entite_id=$1::text) as decisions`, [eventId])).rows[0];
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]));
  }

  async snapshot(year, publicationKey = null){
    const params = [Number(year)];
    let filter = '';
    if(publicationKey){ params.push(publicationKey); filter = ' and e.publication_key=$2'; }
    const rows = (await this.query(`select e.*,a.publication_activity_id,a.source_definition_id,a.label as activity_label,
      a.stat_com_code,a.business_code,p.source_occurrence_id,p.source_session_id,p.publication_unit_id,
      p.source_record_ids,p.last_synced_fingerprint,s.session_group_id,s.session_index,s.session_label,g.session_count,
      l.site_code as location_site_code,r.code as room_code
      from scope_evenements e
      join scope_qv_publication_links p on p.evenement_id=e.evenement_id
      join scope_qv_publication_activities a on a.publication_activity_id=p.publication_activity_id
      join scope_qv_session_events s on s.evenement_id=e.evenement_id
      join scope_qv_session_groups g on g.session_group_id=s.session_group_id
      left join scope_lieux l on l.lieu_id=e.lieu_id
      left join scope_salles_theorie r on r.salle_id=e.salle_theorie_id
      where p.source_year=$1${filter} order by e.publication_key`, params)).rows;
    const output = [];
    for(const row of rows){
      const startDate = dateOnly(row.date);
      const endDate = dateOnly(row.date_fin || row.date);
      const startTime = String(row.heure_debut || '').slice(0, 5);
      const endTime = String(row.heure_fin || '').slice(0, 5);
      const desired = {
        publicationKey: row.publication_key, sourceType: 'QUO_VADIS', sourceYear: Number(year),
        source: {
          year: Number(year), definitionId: row.source_definition_id, occurrenceId: row.source_occurrence_id,
          sessionId: row.source_session_id, publicationUnitId: row.publication_unit_id,
          sourceRecordIds: row.source_record_ids || []
        },
        activity: {
          definitionId: row.source_definition_id, label: row.activity_label,
          statComCode: row.stat_com_code, businessCode: row.business_code
        },
        occurrence: {
          occurrenceId: row.source_occurrence_id, sessionId: row.source_session_id,
          publicationUnitId: row.publication_unit_id
        },
        session: {
          groupId: row.session_group_id, index: Number(row.session_index),
          count: Number(row.session_count), label: row.session_label
        },
        event: {
          status: row.statut, label: row.libelle, primaryDomain: row.domaine_code, family: row.famille,
          eventType: row.type_evenement, startsAt: `${startDate}T${startTime}`, endsAt: `${endDate}T${endTime}`,
          startDate, endDate, startTime, endTime, durationMinutes: Number(row.duree_planifiee_minutes),
          crossesMidnight: startDate !== endDate, locationCode: canonicalLocationCode(row), roomCode: canonicalRoomCode(row),
          responsibleId: row.responsable, entryService: row.entree_service,
          priority: row.priorite == null ? null : Number(row.priorite), fixedDate: row.date_fixe,
          dayExclusive: row.journee_reservee, permutationAllowed: row.permutation_autorisee,
          businessException: row.exception_metier
        },
        relations: {
          domainCodes: await this.relationValues('scope_evenement_domaines', 'domaine_code', row.evenement_id),
          targetCodes: await this.relationValues('scope_evenement_cibles_qv', 'cible_code', row.evenement_id),
          oiCodes: (await this.query(`select o.code as value from scope_evenement_ois eo join scope_ois o on o.oi_id=eo.oi_id
            where eo.evenement_id=$1 order by o.code`, [row.evenement_id])).rows.map((item) => item.value),
          publicCodes: await this.relationValues('scope_evenement_publics_qv', 'public_code', row.evenement_id),
          roleCodes: await this.relationValues('scope_evenement_roles_qv', 'role_code', row.evenement_id),
          resourceCodes: await this.relationValues('scope_evenement_ressources_qv', 'ressource_code', row.evenement_id)
        }
      };
      desired.fingerprint = planner.targetFingerprint(desired);
      output.push({
        eventId: row.evenement_id, activityId: row.publication_activity_id,
        publicationKey: row.publication_key, sourceType: 'QUO_VADIS', sourceYear: Number(year), source: desired.source,
        publicationFingerprint: row.publication_fingerprint, fingerprint: desired.fingerprint,
        lastSyncedFingerprint: row.last_synced_fingerprint, version: Number(row.version), desired,
        operationalState: await this.operationalState(row.evenement_id)
      });
    }
    return output;
  }

  async getByPublicationKey(key){
    const row = (await this.query('select source_year from scope_qv_publication_links where publication_key=$1', [key])).rows[0];
    return row ? (await this.snapshot(row.source_year, key))[0] || null : null;
  }

  async counts(){
    const specs = {
      scope_qv_publication_activities: 'scope_qv_publication_activities',
      scope_evenements: 'scope_evenements where publication_key is not null',
      scope_qv_publication_links: 'scope_qv_publication_links',
      scope_evenement_domaines: 'scope_evenement_domaines',
      scope_evenement_cibles_qv: 'scope_evenement_cibles_qv',
      scope_evenement_ois: 'scope_evenement_ois',
      scope_evenement_publics_qv: 'scope_evenement_publics_qv',
      scope_evenement_roles_qv: 'scope_evenement_roles_qv',
      scope_evenement_ressources_qv: 'scope_evenement_ressources_qv',
      scope_qv_session_groups: 'scope_qv_session_groups',
      scope_qv_session_events: 'scope_qv_session_events'
    };
    const result = {};
    for(const [name, source] of Object.entries(specs)){
      result[name] = Number((await this.query(`select count(*)::integer as n from ${source}`)).rows[0].n);
    }
    return result;
  }

  async provenanceByEvent(eventId){
    return (await this.query('select * from scope_qv_publication_links where evenement_id=$1', [eventId])).rows[0] || null;
  }

  async provenanceBySource(source){
    return (await this.query(`select * from scope_qv_publication_links where source_year=$1 and source_definition_id=$2
      and source_occurrence_id=$3 and source_session_id=$4 and publication_unit_id=$5`, [
      source.year, source.definitionId, source.occurrenceId, source.sessionId, source.publicationUnitId
    ])).rows[0] || null;
  }
}

module.exports = {
  ADAPTER_KIND,
  MIGRATION_VERSION,
  inspectConnectionTarget,
  assertConnectionIntent,
  deterministicUuid,
  ScopeQvPostgresStore
};

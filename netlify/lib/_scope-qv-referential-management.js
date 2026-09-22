const { randomUUID } = require('crypto');

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_CLASSES = new Set(['PREFERE','AUTORISE','DECONSEILLE','INTERDIT']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value) => String(value == null ? '' : value).trim();
const validId = (value) => !value || UUID.test(String(value));
const bad = (message) => ({ ok: false, error: message });
const codeOf = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const validTime = (value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

function createQvReferentialManagement(db){
  const transact = (callback) => typeof db.transaction === 'function' ? db.transaction(callback) : callback(db);

  async function validateDomainTarget(client, domain, cibleId){
    const code = clean(domain).toUpperCase();
    if(!code) return bad('Le domaine est obligatoire.');
    const domains = await client.query(`select 1 from scope_domaines where code = $1 and actif is true`, [code]);
    if(!domains.rows[0]) return bad('Domaine inconnu ou inactif.');
    if(!validId(cibleId)) return bad('Public cible invalide.');
    if(cibleId){
      const targets = await client.query(`select 1 from scope_cibles where cible_id = $1 and domaine_code = $2 and actif is true`, [cibleId, code]);
      if(!targets.rows[0]) return bad('Le public cible ne correspond pas au domaine.');
    }
    return { ok: true, domain: code };
  }

  async function validateLieu(client, lieuId){
    if(!validId(lieuId)) return bad('Lieu invalide.');
    if(!lieuId) return { ok: true };
    const found = await client.query(`select 1 from scope_lieux where lieu_id = $1 and actif is true`, [lieuId]);
    return found.rows[0] ? { ok: true } : bad('Lieu inconnu ou inactif.');
  }

  async function createCursus(body = {}){
    return transact(async (client) => {
      const libelle = clean(body.libelle);
      const code = codeOf(body.code || libelle);
      const months = Number(body.durationMonths);
      if(!libelle || !code || code.length > 80) return bad('Code ou libellé du cursus invalide.');
      if(!Number.isInteger(months) || months < 1 || months > 240) return bad('Durée du cursus invalide.');
      const target = await validateDomainTarget(client, body.domainCode, body.cibleId);
      if(!target.ok) return target;
      const inserted = await client.query(
        `insert into scope_quo_vadis_cursus_definitions(code, libelle, description, domain_code, cible_id, duration_months, statut, metadata)
         values ($1,$2,$3,$4,$5,$6,'ACTIF','{"source":"QUO-VADIS-REFERENTIAL-MANAGEMENT-4"}'::jsonb)
         on conflict (code) do nothing returning cursus_id, code`,
        [code, libelle, clean(body.description) || null, target.domain, body.cibleId || null, months]
      );
      if(!inserted.rows[0]) return bad('Ce code de cursus existe déjà.');
      const cursus = inserted.rows[0];
      await client.query(
        `insert into scope_quo_vadis_cursus_versions(cursus_id, version_code, active, metadata)
         values ($1,'ADMIN-1',true,'{"source":"QUO-VADIS-REFERENTIAL-MANAGEMENT-4"}'::jsonb)`, [cursus.cursus_id]
      );
      return { ok: true, created: true, cursus };
    });
  }

  async function updateCursus(id, body = {}){
    if(!UUID.test(String(id))) return bad('Cursus invalide.');
    return transact(async (client) => {
      const current = await client.query(`select * from scope_quo_vadis_cursus_definitions where cursus_id = $1 for update`, [id]);
      if(!current.rows[0]) return bad('Cursus introuvable.');
      const row = current.rows[0];
      const libelle = clean(body.libelle == null ? row.libelle : body.libelle);
      const months = Number(body.durationMonths == null ? row.duration_months : body.durationMonths);
      const domain = body.domainCode == null ? row.domain_code : body.domainCode;
      const cibleId = body.cibleId === undefined ? row.cible_id : body.cibleId;
      const statut = clean(body.statut || row.statut).toUpperCase();
      if(!libelle || !Number.isInteger(months) || months < 1 || months > 240) return bad('Libellé ou durée invalide.');
      if(!['ACTIF','INACTIF','ARCHIVE'].includes(statut)) return bad('État du cursus invalide.');
      const target = await validateDomainTarget(client, domain, cibleId);
      if(!target.ok) return target;
      const updated = await client.query(
        `update scope_quo_vadis_cursus_definitions set libelle = $2, description = $3, domain_code = $4,
            cible_id = $5, duration_months = $6, statut = $7, updated_at = now()
         where cursus_id = $1 returning cursus_id, code`,
        [id, libelle, clean(body.description == null ? row.description : body.description) || null, target.domain, cibleId || null, months, statut]
      );
      return { ok: true, updated: true, cursus: updated.rows[0] };
    });
  }

  async function removeCursus(id){
    if(!UUID.test(String(id))) return bad('Cursus invalide.');
    return transact(async (client) => {
      const current = await client.query(`select cursus_id, code from scope_quo_vadis_cursus_definitions where cursus_id = $1 for update`, [id]);
      if(!current.rows[0]) return bad('Cursus introuvable.');
      const dependencies = await client.query(`
        select
          (select count(*) from scope_quo_vadis_future_dates where cursus_id = $1)::int as dates,
          (select count(*) from scope_quo_vadis_cohortes c join scope_quo_vadis_cursus_versions v on v.cursus_version_id = c.cursus_version_id where v.cursus_id = $1)::int as cohortes,
          (select count(*) from scope_quo_vadis_obligations o join scope_quo_vadis_cursus_steps s on s.step_id = o.cursus_step_id join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id where v.cursus_id = $1)::int as obligations,
          (select count(*) from scope_quo_vadis_cursus_steps s join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id where v.cursus_id = $1)::int as modules,
          (select count(*) from scope_quo_vadis_cursus_programmes where cursus_id = $1 and (retenu is true or metadata->>'userSelection' = 'true'))::int as programmes`, [id]);
      const counts = dependencies.rows[0];
      if(Object.values(counts).some((value) => Number(value) > 0)){
        await client.query(`update scope_quo_vadis_cursus_definitions set statut = 'ARCHIVE', updated_at = now() where cursus_id = $1`, [id]);
        return { ok: true, archived: true, reason: 'Historique ou planification liée : le cursus est archivé, sans suppression de ses données.', dependencies: counts };
      }
      await client.query(`delete from scope_quo_vadis_cursus_definitions where cursus_id = $1`, [id]);
      return { ok: true, deleted: true };
    });
  }

  async function activeVersion(client, cursusId){
    const result = await client.query(`select v.cursus_version_id, d.domain_code from scope_quo_vadis_cursus_versions v
      join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
      where v.cursus_id = $1 and v.active is true and d.statut = 'ACTIF'
      order by v.created_at desc limit 1`, [cursusId]);
    return result.rows[0] || null;
  }

  async function validateStep(client, version, body){
    const libelle = clean(body.libelle);
    const logicalYear = Number(body.logicalYear);
    const minutes = Number(body.durationMinutes);
    const preferredMonth = body.preferredMonth ? Number(body.preferredMonth) : null;
    if(!libelle || !Number.isInteger(logicalYear) || logicalYear < 1 || logicalYear > 30) return bad('Libellé ou année du module invalide.');
    if(!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) return bad('Durée du module invalide.');
    if(preferredMonth != null && (!Number.isInteger(preferredMonth) || preferredMonth < 1 || preferredMonth > 12)) return bad('Mois habituel invalide.');
    if(!validTime(body.usualStartTime) || !validTime(body.usualEndTime)) return bad('Horaire habituel invalide.');
    if(body.cibleId){
      const target = await validateDomainTarget(client, version.domain_code, body.cibleId);
      if(!target.ok) return target;
    }
    const lieu = await validateLieu(client, body.lieuId);
    if(!lieu.ok) return lieu;
    return { ok: true, libelle, logicalYear, minutes, preferredMonth };
  }

  async function addModule(cursusId, body = {}){
    if(!UUID.test(String(cursusId))) return bad('Cursus invalide.');
    return transact(async (client) => {
      const version = await activeVersion(client, cursusId);
      if(!version) return bad('Cursus actif introuvable.');
      const valid = await validateStep(client, version, body);
      if(!valid.ok) return valid;
      const rank = await client.query(`select coalesce(max(ordre),0)::int + 1 as next_order from scope_quo_vadis_cursus_steps where cursus_version_id = $1 and active is true`, [version.cursus_version_id]);
      const stepCode = codeOf(body.stepCode || valid.libelle);
      if(!stepCode) return bad('Code du module invalide.');
      const result = await client.query(`insert into scope_quo_vadis_cursus_steps
        (cursus_version_id, step_code, libelle, ordre, logical_year, duration_minutes, usual_start_time,
         usual_end_time, crosses_midnight, lieu_id, cible_id, preferred_month, metadata)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{"source":"QUO-VADIS-REFERENTIAL-MANAGEMENT-4"}'::jsonb)
        on conflict (cursus_version_id, step_code) do nothing returning step_id`,
        [version.cursus_version_id, stepCode, valid.libelle, rank.rows[0].next_order, valid.logicalYear,
          valid.minutes, body.usualStartTime || null, body.usualEndTime || null, body.crossesMidnight === true,
          body.lieuId || null, body.cibleId || null, valid.preferredMonth]);
      return result.rows[0] ? { ok: true, created: true, stepId: result.rows[0].step_id } : bad('Ce module existe déjà dans le cursus.');
    });
  }

  async function updateModule(stepId, body = {}){
    if(!UUID.test(String(stepId))) return bad('Module invalide.');
    return transact(async (client) => {
      const found = await client.query(`select s.*, v.cursus_id, d.domain_code from scope_quo_vadis_cursus_steps s
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
        where s.step_id = $1 and s.active is true and v.active is true for update of s`, [stepId]);
      if(!found.rows[0]) return bad('Module actif introuvable.');
      const old = found.rows[0];
      const merged = {
        libelle: body.libelle === undefined ? old.libelle : body.libelle,
        logicalYear: body.logicalYear === undefined ? old.logical_year : body.logicalYear,
        durationMinutes: body.durationMinutes === undefined ? old.duration_minutes : body.durationMinutes,
        usualStartTime: body.usualStartTime === undefined ? old.usual_start_time : body.usualStartTime,
        usualEndTime: body.usualEndTime === undefined ? old.usual_end_time : body.usualEndTime,
        crossesMidnight: body.crossesMidnight === undefined ? old.crosses_midnight : body.crossesMidnight,
        lieuId: body.lieuId === undefined ? old.lieu_id : body.lieuId,
        cibleId: body.cibleId === undefined ? old.cible_id : body.cibleId,
        preferredMonth: body.preferredMonth === undefined ? old.preferred_month : body.preferredMonth
      };
      const valid = await validateStep(client, old, merged);
      if(!valid.ok) return valid;
      await client.query(`update scope_quo_vadis_cursus_steps set libelle = $2, logical_year = $3,
        duration_minutes = $4, usual_start_time = $5, usual_end_time = $6, crosses_midnight = $7,
        lieu_id = $8, cible_id = $9, preferred_month = $10 where step_id = $1`,
        [stepId, valid.libelle, valid.logicalYear, valid.minutes, merged.usualStartTime || null,
          merged.usualEndTime || null, merged.crossesMidnight === true, merged.lieuId || null,
          merged.cibleId || null, valid.preferredMonth]);
      return { ok: true, updated: true, stepId };
    });
  }

  async function removeModule(stepId){
    if(!UUID.test(String(stepId))) return bad('Module invalide.');
    return transact(async (client) => {
      const found = await client.query(`select step_id from scope_quo_vadis_cursus_steps where step_id = $1 and active is true for update`, [stepId]);
      if(!found.rows[0]) return bad('Module actif introuvable.');
      const linked = await client.query(`select
        (select count(*) from scope_quo_vadis_obligations where cursus_step_id = $1)::int as obligations,
        (select count(*) from scope_quo_vadis_cursus_step_programmes where step_id = $1 and (retenu is true or metadata->>'userSelection' = 'true'))::int as programmes`, [stepId]);
      if(Number(linked.rows[0].obligations) || Number(linked.rows[0].programmes)){
        await client.query(`update scope_quo_vadis_cursus_steps set active = false where step_id = $1`, [stepId]);
        return { ok: true, archived: true, reason: 'Module lié à une planification : il est archivé pour préserver l’historique.' };
      }
      await client.query(`delete from scope_quo_vadis_cursus_steps where step_id = $1`, [stepId]);
      return { ok: true, deleted: true };
    });
  }

  async function reorderModules(cursusId, stepIds){
    if(!UUID.test(String(cursusId)) || !Array.isArray(stepIds) || !stepIds.every((id) => UUID.test(String(id)))) return bad('Ordre des modules invalide.');
    return transact(async (client) => {
      const version = await activeVersion(client, cursusId);
      if(!version) return bad('Cursus actif introuvable.');
      const rows = await client.query(`select step_id from scope_quo_vadis_cursus_steps where cursus_version_id = $1 and active is true for update`, [version.cursus_version_id]);
      const actual = new Set(rows.rows.map((row) => String(row.step_id)));
      if(actual.size !== stepIds.length || new Set(stepIds).size !== stepIds.length || !stepIds.every((id) => actual.has(String(id)))) return bad('La liste des modules est incomplète.');
      for(const [index, id] of stepIds.entries()) await client.query(`update scope_quo_vadis_cursus_steps set ordre = $2 where step_id = $1`, [id, index + 1]);
      return { ok: true, updated: true };
    });
  }

  async function validateRule(client, body){
    const target = await validateDomainTarget(client, body.domain, body.cibleId);
    if(!target.ok) return target;
    const policy = body.dayPolicy || {};
    if(DAYS.some((day) => !DAY_CLASSES.has(policy[day]))) return bad('La classification des sept jours est obligatoire.');
    const start = clean(body.usualStart);
    const end = clean(body.usualEnd);
    if(!validTime(start) || !validTime(end) || !start || !end) return bad('Horaire habituel invalide.');
    if(!validDate(body.validFrom) || !validDate(body.validTo) || (body.validFrom && body.validTo && body.validFrom > body.validTo)) return bad('Période de validité invalide.');
    if(body.durationMinutes != null && body.durationMinutes !== '' && (!Number.isInteger(Number(body.durationMinutes)) || Number(body.durationMinutes) < 1 || Number(body.durationMinutes) > 10080)) return bad('Durée de règle invalide.');
    const preferredDay = clean(body.preferredDay).toUpperCase();
    if(preferredDay && (!DAYS.includes(preferredDay) || policy[preferredDay] === 'INTERDIT')) return bad('Jour principal invalide.');
    return { ok: true, domain: target.domain, policy, start, end, preferredDay };
  }

  async function createRule(body = {}){
    return transact(async (client) => Object.assign({ created: true }, await createRuleWithClient(client, body)));
  }

  async function updateRule(id, body = {}){
    if(!UUID.test(String(id))) return bad('Règle invalide.');
    return transact(async (client) => {
      const current = await client.query(`select r.*, c.niveau_code as cible_code from scope_quo_vadis_planning_rules r
        left join scope_cibles c on c.cible_id = r.cible_id where r.rule_id = $1 and r.active is true and r.definition_version_id is null for update of r`, [id]);
      if(!current.rows[0]) return bad('Règle active introuvable.');
      const old = current.rows[0];
      const merged = {
        domain: body.domain === undefined ? old.domain || (old.metadata || {}).family : body.domain,
        cibleId: body.cibleId === undefined ? old.cible_id : body.cibleId,
        cibleCode: body.cibleCode || old.cible_code,
        dayPolicy: body.dayPolicy === undefined ? old.day_policy : body.dayPolicy,
        usualStart: body.usualStart === undefined ? (old.time_policy || {}).usualStart : body.usualStart,
        usualEnd: body.usualEnd === undefined ? (old.time_policy || {}).usualEnd : body.usualEnd,
        durationMinutes: body.durationMinutes === undefined ? old.duration_minutes : body.durationMinutes,
        validFrom: body.validFrom === undefined ? old.valid_from && new Date(old.valid_from).toISOString().slice(0, 10) : body.validFrom,
        validTo: body.validTo === undefined ? old.valid_to && new Date(old.valid_to).toISOString().slice(0, 10) : body.validTo,
        preferredDay: body.preferredDay === undefined ? (old.metadata || {}).preferredDay : body.preferredDay,
        constraints: body.constraints === undefined ? (old.metadata || {}).constraints : body.constraints,
        derogationAllowed: body.derogationAllowed === undefined ? old.derogation_allowed : body.derogationAllowed
      };
      const valid = await validateRule(client, merged);
      if(!valid.ok) return valid;
      await client.query(`update scope_quo_vadis_planning_rules set active = false, updated_at = now() where rule_id = $1`, [id]);
      const next = await createRuleWithClient(client, Object.assign({}, merged, { domain: valid.domain }));
      return Object.assign({ updated: true }, next);
    });
  }

  async function createRuleWithClient(client, body){
    const valid = await validateRule(client, body);
    if(!valid.ok) return valid;
    const cibleId = body.cibleId || null;
    await client.query(`update scope_quo_vadis_planning_rules set active = false, updated_at = now()
      where active is true and definition_version_id is null and (domain = $1 or (domain is null and metadata->>'family' = $1))
        and cible_id is not distinct from $2`, [valid.domain, cibleId]);
    const code = cibleId ? `PLANIF-${valid.domain}-${codeOf(body.cibleCode || cibleId)}` : `PLANIF-${valid.domain}`;
    const result = await client.query(`insert into scope_quo_vadis_planning_rules
      (code, version_code, domain, cible_id, day_policy, time_policy, duration_minutes,
       valid_from, valid_to, derogation_allowed, metadata)
      values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11::jsonb) returning rule_id`,
      [code, `ADMIN-${Date.now()}-${randomUUID().slice(0, 8)}`, valid.domain, cibleId,
        JSON.stringify(valid.policy), JSON.stringify({ usualStart: valid.start, usualEnd: valid.end }),
        Number(body.durationMinutes) || null, body.validFrom || null, body.validTo || null,
        body.derogationAllowed !== false,
        JSON.stringify({ source: 'QUO-VADIS-REFERENTIAL-MANAGEMENT-4', preferredDay: valid.preferredDay, constraints: clean(body.constraints) })]);
    return { ok: true, ruleId: result.rows[0].rule_id };
  }

  async function removeRule(id){
    if(!UUID.test(String(id))) return bad('Règle invalide.');
    const result = await db.query(`update scope_quo_vadis_planning_rules set active = false, updated_at = now()
      where rule_id = $1 and active is true and definition_version_id is null returning rule_id`, [id]);
    return result.rows[0] ? { ok: true, archived: true, reason: 'Règle archivée ; ses versions historiques restent conservées.' } : bad('Règle active introuvable.');
  }

  return { createCursus, updateCursus, removeCursus, addModule, updateModule, removeModule, reorderModules, createRule, updateRule, removeRule };
}

module.exports = { createQvReferentialManagement, DAYS, DAY_CLASSES };

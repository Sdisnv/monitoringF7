'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { buildCurrentCandidateDataset, preserveUnspecifiedPublicationFields } = require('./lib/scope-c22-canonical-dataset');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const CONNECTION = `postgresql://127.0.0.1:55432/${DATABASE}`;

function normalized(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function classifyLocation(row, locations){
  const value = normalized(row.location);
  const exact = locations.filter((item) => [item.code, item.nom_court, item.nom_complet]
    .some((label) => normalized(label) === value));
  if(exact.length === 1) return { status:'MATCHED', code:`L-${exact[0].site_code}`, rule:'EXACT_SQL_LABEL' };
  if(exact.length > 1) return { status:'AMBIGUOUS', candidates:exact.map((item) => item.code), rule:'MULTIPLE_EXACT_LABELS' };
  if(['CASERNE SDIS', 'SDIS NV'].includes(value))
    return { status:'AMBIGUOUS', candidates:locations.map((item) => item.code), rule:'GENERIC_SDIS_SITE' };
  const locality = locations.filter((item) => normalized(item.localite) === value);
  if(locality.length) return { status:'AMBIGUOUS', candidates:locality.map((item) => item.code), rule:'LOCALITY_IS_NOT_A_BUILDING' };
  return { status:'UNMATCHED', candidates:[], rule:value === 'A DEFINIR' ? 'NOT_YET_DEFINED' : 'NO_SQL_LOCATION' };
}

function classifyRoom(row, rooms){
  const raw = String(row.room || '');
  const code = raw === 'R-G1-EM' ? 'G1-ETAT-MAJOR' : raw.replace(/^R-/, '');
  const exact = rooms.filter((item) => item.code === code);
  if(exact.length === 1) return { status:'MATCHED', code:`R-${exact[0].code}`,
    rule:raw === 'R-G1-EM' ? 'UNIQUE_ETAT_MAJOR_ALIAS' : 'EXACT_SQL_CODE' };
  if(exact.length > 1) return { status:'AMBIGUOUS', candidates:exact.map((item) => item.code), rule:'MULTIPLE_SQL_CODES' };
  if(normalized(raw) === 'SALLE DE THEORIE'){
    const siteRooms = rooms.filter((item) => item.lieu_id === row.business?.lieuId);
    const theory = siteRooms.filter((item) => normalized(item.libelle).includes('THEORIE'));
    if(theory.length === 1) return { status:'MATCHED', code:`R-${theory[0].code}`, rule:'UNIQUE_THEORY_ROOM_AT_EXACT_LOCATION' };
    if(siteRooms.length > 1) return { status:'AMBIGUOUS', candidates:siteRooms.map((item) => item.code), rule:'THEORY_ROOM_NOT_SPECIFIED_AT_SITE' };
  }
  return { status:'UNMATCHED', candidates:[], rule:'NO_SQL_ROOM' };
}

function counts(rows){
  return Object.fromEntries(['MATCHED','UNMATCHED','AMBIGUOUS'].map((status) =>
    [status, rows.filter((row) => row.status === status).length]));
}

function fieldAt(value, path){
  return path.split('.').reduce((item, key) => item && item[key], value);
}

async function buildLocalReadOnlyDiff(){
  const dataset = await buildCurrentCandidateDataset();
  assert.equal(dataset.programme.length, 850);
  assert.equal(dataset.localIds.size, 15);
  const store = await ScopeQvPostgresStore.open({ connectionString:CONNECTION, deploymentMode:'clone',
    allowCloneConnection:true, expectedDatabase:DATABASE, readOnly:true });
  try{
    return await store.transaction(async () => {
      const locationResult = await store.query('select lieu_id,code,nom_court,nom_complet,localite,site_code from scope_lieux where actif order by code');
      const roomResult = await store.query('select salle_id,code,libelle,lieu_id from scope_salles_theorie where actif order by code');
      const domainResult = await store.query('select code from scope_domaines where actif order by code');
      const oiResult = await store.query('select code from scope_ois where actif order by code');
      const statComResult = await store.query('select code from scope_statcom_referentiel order by code');
      const tableResult = await store.query("select count(*)::integer as n from pg_catalog.pg_tables where schemaname='public' and tablename like 'scope_%'");
      const baseResult = await store.query(`select
          (select count(*)::integer from scope_evenements) as events,
          (select count(*)::integer from scope_evenements where date < date '2027-01-01') as historical_events,
          (select count(*)::integer from scope_participations) as participations,
          (select count(*)::integer from scope_attendus) as attendus,
          (select count(*)::integer from scope_quo_vadis_obligations) as obligations,
          (select count(*)::integer from scope_quo_vadis_proposals) as proposals`);
      const duplicateResult = await store.query(`select count(*)::integer as n from (
          select publication_key from scope_evenements where publication_key is not null
          group by publication_key having count(*) > 1) duplicates`);
      const preparationRooms = await store.query(`select count(*)::integer as n
        from scope_quo_vadis_obligations where metadata->>'source'='QV_PROGRAMME_PREPARATION'
          and salle_theorie_id is not null`);
      const locations = locationResult.rows;
      const rooms = roomResult.rows;
      const unresolvedLocations = dataset.candidateRows.filter((row) => row.location && !row.business?.lieuId)
        .map((row) => ({ id:row.id, label:row.location, ...classifyLocation(row, locations) }));
      const unresolvedRooms = dataset.candidateRows.filter((row) => row.room && !row.business?.salleTheorieId)
        .map((row) => ({ id:row.id, label:row.room, ...classifyRoom(row, rooms) }));
      assert.equal(unresolvedLocations.length, 57);
      assert.equal(unresolvedRooms.length, 116);
      const referentials = {
        ...dataset.referentials,
        domains:domainResult.rows.map((row) => row.code),
        ois:oiResult.rows.map((row) => row.code),
        statComCodes:statComResult.rows.map((row) => row.code),
        locations:locations.map((row) => `L-${row.site_code}`),
        rooms:rooms.map((row) => `R-${row.code}`)
      };
      const snapshot = await store.snapshot(2027);
      const snapshotByKey = new Map(snapshot.map((row) => [row.publicationKey,row]));
      const plan = planner.buildPublicationPlan({ year:2027, programme:dataset.programme,
        targetSnapshot:snapshot, referentials });
      const reconciledProgramme = preserveUnspecifiedPublicationFields(dataset.programme,snapshot);
      const reconciledReferentials = { ...referentials,
        targets:[...new Set(referentials.targets.concat(snapshot.flatMap((row) =>
          row.desired && row.desired.relations && row.desired.relations.targetCodes || [])))] };
      const reconciledPlan = planner.buildPublicationPlan({ year:2027,programme:reconciledProgramme,
        targetSnapshot:snapshot,referentials:reconciledReferentials });
      const snapshotKeys = new Set(snapshot.map((row) => row.publicationKey));
      const reasons = {};
      for(const row of plan.decisions) reasons[row.reason] = (reasons[row.reason] || 0) + 1;
      const operational = snapshot.filter((row) => Object.values(row.operationalState || {}).some((value) => Number(value) > 0));
      const unvalidated = dataset.programme.filter((row) => row.status !== 'VALIDATED').length;
      const output = {
        kind:'QV_2027_LOCAL_SQL_READ_ONLY_DIFF',
        target:{ database:DATABASE, host:'127.0.0.1', port:55432, scopeTables:tableResult.rows[0].n,
          migrationReady:true, base:baseResult.rows[0] },
        candidate:{ count:dataset.programme.length, localDecisions:dataset.localIds.size,
          tourDeFrance:dataset.programme.filter((row) => /TOUR-DE-FRANCE-FEMMES/.test(row.caseId)).length,
          unvalidated },
        locations:{ total:unresolvedLocations.length,
          alreadyMapped:dataset.candidateRows.filter((row) => row.business?.lieuId).length,
          counts:counts(unresolvedLocations), rows:unresolvedLocations },
        rooms:{ total:unresolvedRooms.length, compatibleForeignKeys:preparationRooms.rows[0].n,
          counts:counts(unresolvedRooms), rows:unresolvedRooms },
        diff:{ snapshot:snapshot.length, matchedKeys:plan.decisions.filter((row) => snapshotKeys.has(row.publicationKey)).length,
          summary:plan.summary, reasons, duplicates:duplicateResult.rows[0].n,
          removedSource:plan.decisions.filter((row) => !row.caseId).length,
          existingWithOperationalData:operational.length,
          changedRows:plan.decisions.filter((row) => ['CREATE','UPDATE'].includes(row.action))
            .map((row) => {
              const fields = (row.changedFields || []).filter((field) => field !== 'fingerprint');
              const existing = snapshotByKey.get(row.publicationKey);
              return { id:row.caseId,action:row.action,changedFields:row.changedFields || [],
                before:Object.fromEntries(fields.map((field) => [field,fieldAt(existing && existing.desired,field) ?? null])),
                after:Object.fromEntries(fields.map((field) => [field,fieldAt(row.target,field) ?? null])) };
            }),
          blockedRows:plan.decisions.filter((row) => row.action === 'BLOCKED')
            .map((row) => ({ id:row.caseId, reason:row.reason })) },
        reconciled:{ summary:reconciledPlan.summary,
          changedRows:reconciledPlan.decisions.filter((row) => ['CREATE','UPDATE'].includes(row.action))
            .map((row) => ({ id:row.caseId,action:row.action,changedFields:row.changedFields || [] })),
          blockers:reconciledPlan.decisions.filter((row) => row.action === 'BLOCKED')
            .map((row) => ({ id:row.caseId,reason:row.reason })) }
      };
      assert.equal(plan.decisions.length, 850);
      assert.equal(output.candidate.tourDeFrance, 0);
      assert.equal(output.diff.duplicates, 0);
      return output;
    });
  }finally{ await store.close(); }
}

if(require.main === module) buildLocalReadOnlyDiff().then((report) => {
  const dir = path.resolve(__dirname, '../outputs/qv-2027-sql-recette');
  fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(path.join(dir, 'local-readonly-diff.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ target:report.target, candidate:report.candidate,
    locations:report.locations.counts, rooms:report.rooms.counts,
    diff:{ ...report.diff, changedRows:report.diff.changedRows.length,
      blockedRows:report.diff.blockedRows.length },
    reconciled:{ summary:report.reconciled.summary,changedRows:report.reconciled.changedRows.length,
      blockers:report.reconciled.blockers.length } }, null, 2));
}).catch((error) => { console.error(error.code || '', error.stack || error); process.exitCode = 1; });

module.exports = { buildLocalReadOnlyDiff, classifyLocation, classifyRoom };

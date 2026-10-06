'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const CONNECTION = `postgresql://127.0.0.1:55432/${DATABASE}`;

function fingerprint(value){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function stableId(caseId){
  const hex = fingerprint(`QV_PREPARATION|2027|${caseId}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function preparationPayload(row, locationIds, rooms, statcoms){
  const sourceLieuId = row.business && row.business.lieuId || null;
  const lieuId = sourceLieuId && locationIds.has(sourceLieuId) ? sourceLieuId : null;
  const rawRoom = String(row.room || '');
  const code = rawRoom === 'R-G1-EM' ? 'G1-ETAT-MAJOR' : rawRoom.replace(/^R-/, '');
  let room = rooms.get(code);
  if(!room && rawRoom === 'Salle de théorie' && lieuId){
    const theory = [...rooms.values()].filter((item) => item.lieu_id === lieuId
      && String(item.libelle || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes('THEORIE'));
    if(theory.length === 1) room = theory[0];
  }
  const salleId = room && lieuId && room.lieu_id === lieuId ? room.salle_id : null;
  const status = String(row.status || '');
  const metadata = {
    source:'QV_PROGRAMME_PREPARATION',
    automatedSnapshot:true,
    humanDecision:false,
    canonicalProgrammeItemId:String(row.id),
    canonicalStatus:status,
    canonicalRow:row,
    sourceFingerprint:fingerprint({ row,lieuId,salleId })
  };
  return {
    id:stableId(row.id),caseId:String(row.id),title:String(row.activityLabel || row.label),
    domain:String(row.persistenceDomain || 'INSTITUTIONNEL'),
    publics:row.publics || [],status:status === 'VALIDATED' ? 'PLANIFIE' : 'A_PLANIFIER',
    startsAt:status === 'VALIDATED' ? row.startsAt || null : null,
    endsAt:status === 'VALIDATED' ? row.endsAt || null : null,
    statcom:row.statCom || null,
    statcomPolicy:row.statCom && statcoms.has(row.statCom) ? 'OBLIGATOIRE' : 'A_CONFIRMER',
    lieuId,lieuLibre:lieuId ? null : row.location || null,salleId,
    metadata
  };
}

async function materializePreparations({ execute = false } = {}){
  const dataset = await buildCurrentCandidateDataset();
  assert.equal(dataset.candidateRows.length, 850);
  assert.equal(new Set(dataset.candidateRows.map((row) => row.id)).size, 850);
  assert.equal(dataset.localIds.size, 15);
  assert.equal(dataset.candidateRows.filter((row) => /TOUR-DE-FRANCE-FEMMES/.test(row.id)).length, 0);
  const pool = new Pool({ connectionString:CONNECTION, max:1, connectionTimeoutMillis:10000,
    statement_timeout:60000, application_name:'scope-qv-2027-preparation-clone' });
  const client = await pool.connect();
  try{
    await client.query(execute ? 'begin' : 'begin read only');
    await client.query("set local lock_timeout='5s'");
    const identity = (await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity, { name:DATABASE,host:'127.0.0.1/32',port:55432 });
    const programmes = (await client.query('select programme_id from scope_quo_vadis_programmes where annee=2027')).rows;
    assert.equal(programmes.length, 1);
    const programmeId = programmes[0].programme_id;
    const locations = (await client.query('select lieu_id from scope_lieux where actif')).rows;
    const rooms = (await client.query('select code,libelle,salle_id,lieu_id from scope_salles_theorie where actif')).rows;
    const statcoms = (await client.query('select code from scope_statcom_referentiel')).rows;
    const locationIds = new Set(locations.map((row) => row.lieu_id));
    const roomByCode = new Map(rooms.map((row) => [row.code,row]));
    const statcomCodes = new Set(statcoms.map((row) => row.code));
    const existing = (await client.query(`select obligation_id,source_type,source_ref,metadata
      from scope_quo_vadis_obligations where programme_id=$1 and source_ref=any($2::text[])`,
      [programmeId,dataset.candidateRows.map((row) => row.id)])).rows;
    const byCaseId = new Map(existing.map((row) => [row.source_ref,row]));
    assert.equal(byCaseId.size, existing.length, 'Duplicate preparation source references');
    const payloads = dataset.candidateRows.map((row) => preparationPayload(row,locationIds,roomByCode,statcomCodes));
    const counts = { candidate:850,nonValidated:dataset.candidateRows.filter((row) => row.status !== 'VALIDATED').length,
      created:0,updated:0,unchanged:0,humanProtected:0,blocked:0,roomFk:payloads.filter((row) => row.salleId).length,
      textualLocations:payloads.filter((row) => row.lieuLibre).length,localDecisions:dataset.localIds.size };
    const conflicts = [];
    for(const item of payloads){
      const current = byCaseId.get(item.caseId);
      if(current && current.metadata && current.metadata.humanDecision === true){ counts.humanProtected++;continue; }
      if(current && (current.source_type !== 'MANUAL' || !current.metadata || current.metadata.automatedSnapshot !== true)){
        counts.blocked++;conflicts.push(item.caseId);continue;
      }
      if(current && current.metadata.sourceFingerprint === item.metadata.sourceFingerprint){ counts.unchanged++;continue; }
      if(current) counts.updated++; else counts.created++;
    }
    if(counts.blocked) throw new Error(`Existing non-snapshot obligations require review: ${conflicts.join(', ')}`);
    if(execute){
      for(const item of payloads){
        const current = byCaseId.get(item.caseId);
        if(current && (current.metadata.humanDecision === true || current.metadata.sourceFingerprint === item.metadata.sourceFingerprint)) continue;
        const values = [item.id,programmeId,item.caseId,item.title,item.domain,item.publics,item.status,
          item.startsAt,item.endsAt,item.statcomPolicy,item.statcom,item.lieuId,item.lieuLibre,item.salleId,
          JSON.stringify(item.metadata)];
        if(current){
          await client.query(`update scope_quo_vadis_obligations set title=$4,domain=$5,cible_codes=$6::text[],
            statut=$7,imposed_start_at=case when $8::text is null then null else $8::timestamp at time zone 'Europe/Zurich' end,
            imposed_end_at=case when $9::text is null then null else $9::timestamp at time zone 'Europe/Zurich' end,
            statcom_policy=$10,statcom_code=$11,lieu_id=$12,lieu_libre=$13,salle_theorie_id=$14,
            metadata=$15::jsonb,updated_at=now() where obligation_id=$1 and programme_id=$2 and source_ref=$3`,
          [current.obligation_id,...values.slice(1)]);
        }else{
          await client.query(`insert into scope_quo_vadis_obligations
            (obligation_id,programme_id,source_type,source_ref,title,domain,cible_codes,statut,
             imposed_start_at,imposed_end_at,statcom_policy,statcom_code,lieu_id,lieu_libre,
             salle_theorie_id,metadata,include_in_programme)
            values ($1,$2,'MANUAL',$3,$4,$5,$6::text[],$7,
              case when $8::text is null then null else $8::timestamp at time zone 'Europe/Zurich' end,
              case when $9::text is null then null else $9::timestamp at time zone 'Europe/Zurich' end,
              $10,$11,$12,$13,$14,$15::jsonb,false)`,values);
        }
      }
      const proof = (await client.query(`select count(*)::integer as total,
        count(*) filter (where metadata->>'canonicalStatus' <> 'VALIDATED')::integer as non_validated,
        count(distinct source_ref)::integer as ids from scope_quo_vadis_obligations
        where programme_id=$1 and metadata->>'source'='QV_PROGRAMME_PREPARATION'`,[programmeId])).rows[0];
      assert.deepEqual(proof,{ total:850,non_validated:725,ids:850 });
    }
    await client.query('commit');
    return { mode:execute ? 'LOCAL_CLONE_WRITE' : 'READ_ONLY',database:DATABASE,...counts };
  }catch(error){ try{ await client.query('rollback'); }catch(_error){} throw error; }
  finally{ client.release();await pool.end(); }
}

if(require.main === module) materializePreparations({ execute:process.argv.includes('--execute') })
  .then((result) => console.log(JSON.stringify(result,null,2)))
  .catch((error) => { console.error(error.stack || error);process.exitCode=1; });

module.exports = { materializePreparations, preparationPayload, stableId };

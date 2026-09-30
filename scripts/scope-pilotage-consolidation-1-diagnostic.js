#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const { createPgRepo } = require('../netlify/lib/_scope-pg');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');

function databaseUrl(){
  return process.env.SCOPE_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || '';
}

async function scalar(client, sql){
  const result = await client.query(sql);
  return Number(result.rows[0] && result.rows[0].value || 0);
}

async function grouped(client, sql, key){
  const result = await client.query(sql);
  return Object.fromEntries(result.rows.map((row) => [String(row[key] || 'NON_RENSEIGNE'), Number(row.value || 0)]));
}

async function main(){
  const connectionString = databaseUrl();
  if(!connectionString) throw new Error('SCOPE_DATABASE_URL absent.');
  const client = new Client({
    connectionString,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    statement_timeout: 180000
  });
  await client.connect();
  try{
    await client.query('begin read only');
    const transactionReadOnly = (await client.query('show transaction_read_only')).rows[0].transaction_read_only;
    let queryQueue = Promise.resolve();
    const serialClient = {
      query(...args){
        const run = queryQueue.then(() => client.query(...args));
        queryQueue = run.catch(() => undefined);
        return run;
      }
    };
    const repo = createPgRepo(serialClient);
    const cycles = createScopeCycleService(repo);
    const cycleDetails = [];
    for(const year of [2026, 2027]){
      const list = await cycles.listCycles({ annee: year });
      for(const cycle of list.cycles || []){
        if(cycleDetails.some((item) => item.cycle.cycle_id === cycle.cycle_id)) continue;
        cycleDetails.push(await cycles.getCycle(cycle.cycle_id));
      }
    }
    const scopedRows = cycleDetails.flatMap((detail) => (detail.pilotage && detail.pilotage.individualRows || [])
      .filter((row) => row.isPopulation)
      .map((row) => ({ cycle: detail.cycle || {}, row })));
    const personRows = scopedRows.map((item) => item.row);
    const states = {};
    for(const row of personRows){
      const state = row.consolidatedState || row.globalState || 'NON_RENSEIGNE';
      states[state] = (states[state] || 0) + 1;
    }
    const report = {
      mission: 'SCOPE-PILOTAGE-CONSOLIDATION-1',
      mode: 'BEGIN READ ONLY / ROLLBACK',
      transactionReadOnly,
      capturedAt: new Date().toISOString(),
      baseline: {
        personnes: await scalar(client, 'select count(*)::integer as value from scope_personnes'),
        evenements: await scalar(client, 'select count(*)::integer as value from scope_evenements'),
        evenementsPubliesC23: await scalar(client, 'select count(distinct evenement_id)::integer as value from scope_qv_publication_links'),
        attendusInclus: await scalar(client, 'select count(*)::integer as value from scope_attendus where inclus is true'),
        personnesAttendues: await scalar(client, 'select count(distinct personne_id)::integer as value from scope_attendus where inclus is true'),
        participations: await scalar(client, 'select count(*)::integer as value from scope_participations'),
        doublonsAttendus: await scalar(client, `select count(*)::integer as value from (select evenement_id,personne_id from scope_attendus group by evenement_id,personne_id having count(*)>1) d`),
        doublonsParticipations: await scalar(client, `select count(*)::integer as value from (select evenement_id,personne_id from scope_participations group by evenement_id,personne_id having count(*)>1) d`),
        decisionsHumaines: await scalar(client, `select (select count(*) from scope_attendus where origine='EXCEPTION_AJOUT' or origine_retrait is not null) + (select count(*) from scope_participations where source='SAISIE') as value`),
        permutations: await scalar(client, 'select count(*)::integer as value from scope_permutations')
      },
      participationStatuses: await grouped(client, 'select statut,count(*)::integer as value from scope_participations group by statut order by statut', 'statut'),
      permutationStatuses: await grouped(client, 'select statut,count(*)::integer as value from scope_permutations group by statut order by statut', 'statut'),
      consolidation: {
        cyclesAnalyses: cycleDetails.length,
        personnesObligationsAnalysees: personRows.length,
        personnesDistinctes: new Set(personRows.map((row) => row.personneId || row.personKey)).size,
        obligationsAnalysees: personRows.reduce((sum, row) => sum + (row.obligations || []).filter((cell) => cell.expected).length, 0),
        states,
        provenanceManquante: personRows.reduce((sum, row) => sum + (row.obligations || []).filter((cell) => cell.expected && ['SATISFAIT', 'SATISFAIT_PAR_RATTRAPAGE'].includes(cell.consolidatedState) && !(cell.provenance || []).length).length, 0),
        aControler: scopedRows.filter((item) => item.row.consolidatedState === 'A_CONTROLER').map((item) => ({
          cycleId: item.cycle.cycle_id || null,
          cycle: item.cycle.libelle || null,
          nip: item.row.nip || null,
          obligations: (item.row.obligations || []).filter((cell) => cell.consolidatedState === 'A_CONTROLER').map((cell) => ({
            obligationKey: cell.obligationKey,
            reason: cell.consolidationReason,
            provenance: cell.provenance
          }))
        }))
      }
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    try{ await client.query('rollback'); }catch(_error){}
    await client.end();
  }
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

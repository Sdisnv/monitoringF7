#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const { createPgRepo } = require('../netlify/lib/_scope-pg');
const { createScopeService } = require('../netlify/lib/_scope-service');

function arg(name, fallback = null){
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function flag(name){
  return process.argv.includes(`--${name}`);
}

async function main(){
  const dryRun = !flag('apply');
  const year = arg('year', '2026');
  const domaine = arg('domaine', 'FOBA');
  const personId = arg('personne-id', 'a335a65f-8b33-4c5b-a0b1-34493e438861');
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.SCOPE_DATABASE_URL;
  if(!databaseUrl) throw new Error('DATABASE_URL/NETLIFY_DATABASE_URL/SCOPE_DATABASE_URL obligatoire.');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: Number(process.env.SCOPE_BACKFILL_CONNECT_TIMEOUT_MS || 30000),
    statement_timeout: Number(process.env.SCOPE_BACKFILL_STATEMENT_TIMEOUT_MS || 60000)
  });
  await client.connect();
  try{
    const repo = createPgRepo(client);
    const service = createScopeService(repo);
    await client.query(dryRun ? 'BEGIN READ ONLY' : 'BEGIN');
    const before = await snapshotPerson(service, repo, personId, year, domaine);
    try{
      const summary = await service.reconcileExpectedPopulation({
        year,
        domaine,
        dryRun,
        reason: dryRun ? 'BACKFILL_POPULATION_ATTENDUE_DRY_RUN' : 'BACKFILL_POPULATION_ATTENDUE_APPLY'
      }, { sub: dryRun ? 'scope-backfill-dry-run' : 'scope-backfill-apply' });
      const after = dryRun ? before : await snapshotPerson(service, repo, personId, year, domaine);
      if(dryRun) await client.query('ROLLBACK');
      else await client.query('COMMIT');
      process.stdout.write(JSON.stringify({
        ok: true,
        dryRun,
        year,
        domaine,
        summary,
        personId,
        before,
        after
      }, null, 2));
    }catch(error){
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }finally{
    await client.end();
  }
}

async function snapshotPerson(service, repo, personId, year, domaine){
  const personne = await repo.getPersonne(personId);
  const events = (await repo.listEvenements({ annee: year, domaine }))
    .filter((event) => event.statut === 'PLANIFIE')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.libelle).localeCompare(String(b.libelle)));
  const rows = [];
  for(const event of events){
    const fiche = await service.lireEvenement(event.evenement_id);
    const attendu = (fiche.attendus || []).find((row) => String(row.personne_id) === String(personId));
    const cibles = (fiche.cibles || []).map((cible) => `${cible.domaine_code}/${cible.niveau_code}`);
    rows.push({
      eventId: event.evenement_id,
      date: event.date,
      libelle: event.libelle,
      cibles,
      attendusCount: (fiche.attendus || []).length,
      nipPresent: Boolean(attendu),
      origine: attendu?.origine || null,
      motifInclusion: attendu?.motif_inclusion || null,
      compteurs: fiche.compteurs || null
    });
  }
  return {
    personne: personne ? {
      id: personne.personne_id,
      nip: personne.nip,
      nom: personne.nom,
      prenom: personne.prenom
    } : null,
    rows
  };
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});

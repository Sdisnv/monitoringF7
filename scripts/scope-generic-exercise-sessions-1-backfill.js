#!/usr/bin/env node
'use strict';

/** Backfill contrôlé PR-ABC 2026 vers le modèle exercice -> sessions. */

if(process.env.SCOPE_DATABASE_URL && !process.env.DATABASE_URL){
  const url = new URL(process.env.SCOPE_DATABASE_URL);
  if(url.port === '6543') url.port = '5432';
  process.env.DATABASE_URL = url.toString();
}

const { randomUUID } = require('crypto');
const db = require('../netlify/lib/_postgres');
const { ensureScopeSchema } = require('../netlify/lib/_scope-schema');

const EXECUTE = process.argv.includes('--execute');
const EXERCISE_KEY = 'scope-pr-abc-refresh-2026';
const EXERCISE_CODE = 'PR-ABC-REFRESH-2026';
const EXERCISE_LABEL = 'Exercice PR-ABC | Refresh — 2026';
const KNOWN = [
  { id: 'ac65a9c8-ddc4-4dad-ad0e-a753e7475188', date: '2026-04-21', sessionIndex: 1 },
  { id: '16dcf8f9-1338-45d7-b0f9-553f3d044a4b', date: '2026-06-10', sessionIndex: 2 }
];

async function q(text, params){
  return db.query(text, params || []);
}

async function schemaHasGenericColumns(){
  const result = await q(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scope_evenements'
      and column_name in ('exercice_id','session_index','session_label')
  `);
  return result.rows.length === 3;
}

async function findEvents(client){
  const query = client ? client.query.bind(client) : q;
  const result = await query(`
    select
      e.evenement_id,
      e.date::date::text as date,
      e.libelle,
      e.code_cours,
      e.cycle_id,
      ${await schemaHasGenericColumns() ? 'e.exercice_id, e.session_index, e.session_label,' : 'null::uuid as exercice_id, null::integer as session_index, null::text as session_label,'}
      e.pr_exercise_group_key,
      e.pr_session_key,
      e.statut,
      e.version,
      (select count(*)::int from scope_attendus a where a.evenement_id = e.evenement_id and a.inclus is not false) as attendus,
      (select count(*)::int from scope_participations p where p.evenement_id = e.evenement_id) as participations,
      (select count(*)::int from scope_participations p where p.evenement_id = e.evenement_id and upper(coalesce(p.role,'PARTICIPANT')) <> 'PARTICIPANT') as encadrement
    from scope_evenements e
    where e.evenement_id = any($1::uuid[])
       or (
         e.date = date '2026-10-06'
         and e.domaine_code = 'PR'
         and e.libelle = 'Exercice PR-ABC | Refresh'
       )
    order by e.date, e.code_cours nulls last, e.evenement_id
  `, [KNOWN.map((row) => row.id)]);
  return result.rows;
}

function assignSessions(rows){
  return rows
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.code_cours || '').localeCompare(String(b.code_cours || '')))
    .map((row, index) => ({ ...row, expected_session_index: index + 1, expected_session_label: `Session ${index + 1}` }));
}

function assertTarget(rows){
  if(rows.length !== 3){
    throw new Error(`Backfill refusé: 3 séances PR-ABC attendues, ${rows.length} trouvée(s).`);
  }
  const ids = new Set(rows.map((row) => String(row.evenement_id)));
  for(const row of KNOWN){
    if(!ids.has(row.id)) throw new Error(`Backfill refusé: événement obligatoire absent ${row.id}.`);
  }
  const dates = rows.map((row) => row.date);
  for(const date of ['2026-04-21', '2026-06-10', '2026-10-06']){
    if(!dates.includes(date)) throw new Error(`Backfill refusé: date obligatoire absente ${date}.`);
  }
  rows.forEach((row) => {
    if(row.libelle !== 'Exercice PR-ABC | Refresh'){
      throw new Error(`Backfill refusé: libellé inattendu pour ${row.evenement_id}.`);
    }
  });
}

async function dryRun(){
  const hasGeneric = await schemaHasGenericColumns();
  const rows = assignSessions(await findEvents());
  assertTarget(rows);
  const summary = {
    mode: 'DRY_RUN',
    schemaGenericPresent: hasGeneric,
    exercise: {
      exercice_key: EXERCISE_KEY,
      code: EXERCISE_CODE,
      libelle: EXERCISE_LABEL,
      domaine_code: 'PR',
      annee: 2026,
      mode_session: 'MULTI',
      nombre_sessions_attendu: 3,
      consolidation_active: true,
      source: 'BACKFILL'
    },
    sessions: rows.map((row) => ({
      evenement_id: row.evenement_id,
      date: row.date,
      code_cours: row.code_cours,
      before: {
        exercice_id: row.exercice_id,
        session_index: row.session_index,
        session_label: row.session_label,
        pr_exercise_group_key: row.pr_exercise_group_key,
        pr_session_key: row.pr_session_key,
        cycle_id: row.cycle_id
      },
      after: {
        session_index: row.expected_session_index,
        session_label: row.expected_session_label
      },
      counts: {
        attendus: row.attendus,
        participations: row.participations,
        encadrement: row.encadrement,
        statut: row.statut
      }
    }))
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function execute(){
  await ensureScopeSchema();
  const before = assignSessions(await findEvents());
  assertTarget(before);
  await db.transaction(async (client) => {
    const exerciseId = randomUUID();
    const exerciseResult = await client.query(`
      insert into scope_exercices(
        exercice_id, exercice_key, domaine_code, code, libelle, annee,
        mode_session, nombre_sessions_attendu, consolidation_active, source, metadata
      ) values ($1,$2,'PR',$3,$4,2026,'MULTI',3,true,'BACKFILL',$5::jsonb)
      on conflict (exercice_key) where exercice_key is not null do update set
        domaine_code = excluded.domaine_code,
        code = excluded.code,
        libelle = excluded.libelle,
        annee = excluded.annee,
        mode_session = excluded.mode_session,
        nombre_sessions_attendu = excluded.nombre_sessions_attendu,
        consolidation_active = excluded.consolidation_active,
        source = excluded.source,
        updated_at = now(),
        metadata = scope_exercices.metadata || excluded.metadata
      returning exercice_id
    `, [exerciseId, EXERCISE_KEY, EXERCISE_CODE, EXERCISE_LABEL, JSON.stringify({ lot: 'SCOPE-GENERIC-EXERCISE-SESSIONS-1' })]);
    const savedExerciseId = exerciseResult.rows[0].exercice_id;
    for(const row of before){
      await client.query(`
        update scope_evenements
        set exercice_id = $2,
            session_index = $3,
            session_label = $4,
            pr_exercise_group_key = $5,
            pr_session_key = $6,
            updated_at = now(),
            version = version + 1
        where evenement_id = $1
      `, [
        row.evenement_id,
        savedExerciseId,
        row.expected_session_index,
        row.expected_session_label,
        `EXERCICE:${savedExerciseId}`,
        `EXERCICE:${savedExerciseId}.${row.expected_session_index}`
      ]);
      await client.query(`
        insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, apres)
        values ($1,$2,'evenement',$3,'BACKFILL_EXERCICE_SESSION',$4::jsonb)
      `, [
        randomUUID(),
        'scope-generic-exercise-sessions-1',
        row.evenement_id,
        JSON.stringify({ exerciceId: savedExerciseId, sessionIndex: row.expected_session_index, exerciseKey: EXERCISE_KEY })
      ]);
    }
    const afterResult = await client.query(`
      select count(*)::int as count
      from scope_evenements
      where exercice_id = $1
    `, [savedExerciseId]);
    if(afterResult.rows[0].count !== 3){
      throw new Error(`Validation post-backfill refusée: ${afterResult.rows[0].count} événements attachés.`);
    }
    const after = assignSessions(await findEvents(client));
    assertTarget(after);
    for(let i = 0; i < before.length; i += 1){
      const oldRow = before[i];
      const newRow = after.find((row) => row.evenement_id === oldRow.evenement_id);
      if(!newRow || oldRow.attendus !== newRow.attendus || oldRow.participations !== newRow.participations || oldRow.encadrement !== newRow.encadrement){
        throw new Error(`Validation post-backfill refusée: comptages modifiés pour ${oldRow.evenement_id}.`);
      }
    }
    console.log(JSON.stringify({
      mode: 'EXECUTE',
      exercice_id: savedExerciseId,
      sessions: after.map((row) => ({
        evenement_id: row.evenement_id,
        date: row.date,
        code_cours: row.code_cours,
        exercice_id: row.exercice_id,
        session_index: row.session_index,
        session_label: row.session_label,
        pr_exercise_group_key: row.pr_exercise_group_key,
        pr_session_key: row.pr_session_key,
        counts: {
          attendus: row.attendus,
          participations: row.participations,
          encadrement: row.encadrement,
          statut: row.statut
        }
      }))
    }, null, 2));
  });
}

(EXECUTE ? execute() : dryRun())
  .catch((error) => {
    console.error(error && error.stack || error);
    process.exitCode = 1;
  });

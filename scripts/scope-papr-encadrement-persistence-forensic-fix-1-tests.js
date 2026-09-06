const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { Client } = require('pg');
const { createPgRepo } = require('../netlify/lib/_scope-pg');
const { createScopeService } = require('../netlify/lib/_scope-service');

function loadRuntimeEnv(){
  const file = path.join(os.homedir(), '.config/scope/runtime.env');
  if(!fs.existsSync(file)) return;
  for(const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)){
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if(!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '');
    if(process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

function assert(condition, message){
  if(!condition) throw new Error(message);
}

function uiPayloadFromFiche(fiche){
  const parts = new Map((fiche.participations || []).map((p) => [p.personne_id, p]));
  return (fiche.attendus || [])
    .filter((a) => a.inclus !== false)
    .map((a) => {
      const part = parts.get(a.personne_id) || {};
      const role = part.role || 'PARTICIPANT';
      return {
        personneId: a.personne_id,
        statut: part.statut || 'NON_RENSEIGNE',
        role: ['FORMATEUR', 'SURVEILLANT'].includes(role) ? role : 'PARTICIPANT',
        motif_absence: part.motif_absence || null,
        commentaire: part.commentaire || null
      };
    });
}

async function dbParticipation(client, eventId, personneId){
  const result = await client.query(
    `select evenement_id, personne_id, statut, role, source
     from scope_participations
     where evenement_id = $1 and personne_id = $2`,
    [eventId, personneId]
  );
  return result.rows[0] || null;
}

async function insertPerson(repo, suffix){
  const id = `forensic-${suffix}-${randomUUID().slice(0, 8)}`;
  return repo.insertPersonne({
    personne_id: id,
    nip: `F${Math.floor(Math.random() * 100000)}`,
    nom: `FORENSIC_${suffix.toUpperCase()}`,
    prenom: 'Personne',
    grade: 'Sgt',
    date_entree_sdis: '2020-01-01',
    skipPeriodes: true
  });
}

async function insertEvent(client, repo, suffix, groupKey){
  const eventId = randomUUID();
  await repo.insertEvenement({
    evenement_id: eventId,
    date: '2026-08-26',
    domaine_code: 'PR',
    libelle: `Forensic Exercice PR 1.${suffix}`,
    statut: 'PLANIFIE',
    origine: 'NOMINATIF',
    pr_exercise_group_key: groupKey,
    pr_session_key: `${groupKey}:S${suffix}`
  });
  await client.query(
    'update scope_evenements set population_figee = true, population_version = 1 where evenement_id = $1',
    [eventId]
  );
  return eventId;
}

async function expectHttpError(fn, status, code){
  try {
    await fn();
  } catch (error) {
    assert(error.status === status, `HTTP status attendu ${status}, reçu ${error.status}`);
    assert(error.error === code, `Code attendu ${code}, reçu ${error.error}`);
    return;
  }
  throw new Error(`Erreur ${status} ${code} attendue`);
}

async function setupSingleSession(client, repo, role, withSecondParticipant){
  const groupKey = `FORENSIC:PERSIST:${role}:${randomUUID()}`;
  const eventId = await insertEvent(client, repo, role, groupKey);
  const personA = await insertPerson(repo, `${role.toLowerCase()}-a`);
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personA.personne_id, inclus: true, origine: 'REGLE', motif_inclusion: 'PR_BASE' });
  let personB = null;
  if(withSecondParticipant){
    personB = await insertPerson(repo, `${role.toLowerCase()}-b`);
    await repo.upsertAttendu({ evenement_id: eventId, personne_id: personB.personne_id, inclus: true, origine: 'REGLE', motif_inclusion: 'PR_BASE' });
  }
  return { eventId, personA, personB };
}

async function runPersistenceCase(client, service, repo, role, withSecondParticipant){
  const { eventId, personA, personB } = await setupSingleSession(client, repo, role, withSecondParticipant);
  const initialFiche = await service.lireEvenement(eventId);
  const stalePayload = uiPayloadFromFiche(initialFiche);
  const added = await service.ajouterEncadrement(eventId, { personneId: personA.personne_id, role, baseVersion: 1 }, { sub: 'forensic-test' });
  const afterRole = await dbParticipation(client, eventId, personA.personne_id);
  const expectedAfterAdd = role === 'FORMATEUR' ? 'PRESENT' : 'NON_RENSEIGNE';
  assert(afterRole && afterRole.role === role && afterRole.statut === expectedAfterAdd, `${role} statut ${expectedAfterAdd} attendu après ajout`);

  const payload = stalePayload.map((row) => ({ ...row }));
  if(withSecondParticipant){
    const rowB = payload.find((row) => row.personneId === personB.personne_id);
    assert(rowB, 'Participant B absent du payload UI');
    rowB.statut = 'PRESENT';
  }
  await service.enregistrerParticipations(eventId, { participations: payload, baseVersion: added.version }, { sub: 'forensic-test' });

  const afterSave = await dbParticipation(client, eventId, personA.personne_id);
  assert(afterSave && afterSave.role === role, `${role} écrasé après Enregistrer`);
  assert(afterSave.statut === expectedAfterAdd, `${role} statut ${expectedAfterAdd} non conservé après Enregistrer`);
  const reloaded = await service.lireEvenement(eventId);
  assert((reloaded.encadrement || []).some((row) => row.personne_id === personA.personne_id && row.role === role), `${role} absent après relecture backend`);
  if(withSecondParticipant){
    const partB = await dbParticipation(client, eventId, personB.personne_id);
    assert(partB && partB.role === 'PARTICIPANT' && partB.statut === 'PRESENT', 'Participant B non enregistré présent');
  }
}

async function runPrGlobalRegression(client, service, repo){
  const groupKey = `FORENSIC:PR:GLOBAL:${randomUUID()}`;
  const session1 = await insertEvent(client, repo, '1', groupKey);
  const session2 = await insertEvent(client, repo, '2', groupKey);
  const personA = await insertPerson(repo, 'global-a');
  const personB = await insertPerson(repo, 'global-b');
  for(const eventId of [session1, session2]){
    await repo.upsertAttendu({ evenement_id: eventId, personne_id: personA.personne_id, inclus: true, origine: 'REGLE', motif_inclusion: 'PR_BASE' });
    await repo.upsertAttendu({ evenement_id: eventId, personne_id: personB.personne_id, inclus: true, origine: 'REGLE', motif_inclusion: 'PR_BASE' });
  }
  await service.enregistrerParticipations(session1, {
    baseVersion: 1,
    participations: [{ personneId: personA.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
  }, { sub: 'forensic-test' });
  const fiche2 = await service.lireEvenement(session2);
  assert(fiche2.prExerciseParticipation.kpis.population === 2, 'Population PR globale incorrecte');
  assert(fiche2.prExerciseParticipation.kpis.presents === 1, 'KPI PR global présent incorrect');
  const attenduA = fiche2.attendus.find((row) => row.personne_id === personA.personne_id);
  assert(attenduA && attenduA.already_counted_in_session === true, 'Ligne bleue PR globale absente');
  await service.enregistrerParticipations(session2, {
    baseVersion: fiche2.evenement.version,
    participations: [{ personneId: personA.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
  }, { sub: 'forensic-test' });
  assert((await service.lireEvenement(session2)).participations.find((row) => row.personne_id === personA.personne_id).statut === 'PRESENT', 'Participation verrouillée non persistée');
  await service.ajouterEncadrement(session2, { personneId: personA.personne_id, role: 'FORMATEUR', baseVersion: (await service.lireEvenement(session2)).evenement.version }, { sub: 'forensic-test' });
  const enc = await dbParticipation(client, session2, personA.personne_id);
  assert(enc && enc.role === 'FORMATEUR', 'Encadrement non sélectionnable après verrou PR global');
}

(async () => {
  loadRuntimeEnv();
  if(!process.env.SCOPE_DATABASE_URL){
    console.log('SKIP — SCOPE_DATABASE_URL absent, test PostgreSQL réel non exécuté.');
    return;
  }
  const url = new URL(process.env.SCOPE_DATABASE_URL);
  url.port = '5432';
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    const repo = createPgRepo(client);
    const service = createScopeService(repo);
    await runPersistenceCase(client, service, repo, 'FORMATEUR', false);
    await runPersistenceCase(client, service, repo, 'SURVEILLANT', false);
    await runPersistenceCase(client, service, repo, 'FORMATEUR', true);
    await runPersistenceCase(client, service, repo, 'SURVEILLANT', true);
    await runPrGlobalRegression(client, service, repo);
    await client.query('ROLLBACK');
    console.log('PASS — SCOPE-PAPR-ENCADREMENT-PERSISTENCE-FORENSIC-FIX-1 PostgreSQL rollback');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(error && error.stack || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();

const { randomUUID } = require('crypto');
const db = require('./_postgres');
const { ensureScopeSchema } = require('./_scope-schema');
const { isoDate } = require('./_scope-rules');
const { periodFromPersonneRow } = require('./_scope-personnel');
const { pgCibleJoinCondition } = require('./_scope-target-resolution');

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return String(value).slice(0, 10);
}

function mapEvent(row){
  if(!row) return null;
  const exerciceId = row.exercice_id || null;
  const sessionIndex = row.session_index == null ? null : Number(row.session_index);
  const exercice = exerciceId ? {
    exercice_id: exerciceId,
    exercice_key: row.exercice_key || null,
    code: row.exercice_code || null,
    libelle: row.exercice_libelle || null,
    annee: row.exercice_annee == null ? null : Number(row.exercice_annee),
    mode_session: row.exercice_mode_session || null,
    nombre_sessions_attendu: row.nombre_sessions_attendu == null ? null : Number(row.nombre_sessions_attendu),
    consolidation_active: row.consolidation_active === true,
    source: row.exercice_source || null,
    cycle_id: row.exercice_cycle_id || null
  } : null;
  return {
    evenement_id: row.evenement_id,
    date: dateOnly(row.date),
    domaine_code: row.domaine_code,
    sous_domaine_code: row.sous_domaine_code || null,
    libelle: row.libelle,
    statut: row.statut,
    origine: row.origine,
    mode_suivi: row.mode_suivi || (row.origine === 'LEGACY_AGGREGATED' ? 'LEGACY' : 'NOMINATIF'),
    population_figee: row.population_figee,
    population_version: row.population_version,
    figee_at: row.figee_at,
    figee_par: row.figee_par,
    cloture_at: row.cloture_at,
    cloture_par: row.cloture_par,
    participation_policy_version: row.participation_policy_version || null,
    participation_policy_snapshot: row.participation_policy_snapshot || null,
    version: row.version,
    identifiant_externe: row.identifiant_externe || null,
    internal_event_id: row.internal_event_id || row.evenement_id || null,
    code_cours: row.code_cours || null,
    code_source: row.code_source || null,
    source_type: row.source_type || null,
    heure_debut: row.heure_debut || null,
    heure_fin: row.heure_fin || null,
    salle: row.salle || null,
    responsable: row.responsable || null,
    cycle_id: row.cycle_id || null,
    exercice_id: exerciceId,
    session_index: sessionIndex,
    session_label: row.session_label || null,
    definition_version_id: row.definition_version_id || null,
    policy_version_id: row.policy_version_id || null,
    engine_route: row.engine_route || null,
    engine_snapshot: row.engine_snapshot || null,
    exercice_key: exercice && exercice.exercice_key,
    exercice_code: exercice && exercice.code,
    exercice_libelle: exercice && exercice.libelle,
    mode_session: exercice && exercice.mode_session,
    nombre_sessions_attendu: exercice && exercice.nombre_sessions_attendu,
    consolidation_active: exercice ? exercice.consolidation_active : false,
    exercice,
    pr_exercise_group_key: row.pr_exercise_group_key || null,
    pr_session_key: row.pr_session_key || null,
    exercise_equivalence_key: row.exercise_equivalence_key || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    already_exists: Boolean(row.already_exists)
  };
}

function mapExercise(row){
  if(!row) return null;
  return {
    exercice_id: row.exercice_id,
    exercice_key: row.exercice_key || null,
    domaine_code: row.domaine_code,
    code: row.code || null,
    libelle: row.libelle,
    annee: row.annee == null ? null : Number(row.annee),
    mode_session: row.mode_session || 'SINGLE',
    nombre_sessions_attendu: row.nombre_sessions_attendu == null ? 1 : Number(row.nombre_sessions_attendu),
    consolidation_active: row.consolidation_active === true,
    source: row.source || 'MANUEL',
    cycle_id: row.cycle_id || null,
    definition_version_id: row.definition_version_id || null,
    policy_version_id: row.policy_version_id || null,
    engine_route: row.engine_route || null,
    configuration_snapshot: row.configuration_snapshot || null,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapEventDefinition(row){
  if(!row) return null;
  return {
    definition_id: row.definition_id,
    definitionId: row.definition_id,
    code: row.code,
    label: row.label,
    domain: row.domain,
    description: row.description || '',
    status: row.status || 'ACTIF',
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapEventDefinitionVersion(row){
  if(!row) return null;
  return {
    definition_version_id: row.definition_version_id,
    definitionVersionId: row.definition_version_id,
    definition_id: row.definition_id,
    definitionId: row.definition_id,
    version_code: row.version_code,
    versionCode: row.version_code,
    valid_from: dateOnly(row.valid_from),
    validFrom: dateOnly(row.valid_from),
    valid_to: dateOnly(row.valid_to),
    validTo: dateOnly(row.valid_to),
    mode_organisation: row.mode_organisation,
    modeOrganisation: row.mode_organisation,
    session_count: row.session_count == null ? 1 : Number(row.session_count),
    sessionCount: row.session_count == null ? 1 : Number(row.session_count),
    policy_version_id: row.policy_version_id || null,
    policyVersionId: row.policy_version_id || null,
    population_rule: row.population_rule || {},
    populationRule: row.population_rule || {},
    numbering_pattern: row.numbering_pattern || null,
    numberingPattern: row.numbering_pattern || null,
    active: row.active !== false,
    metadata: row.metadata || {},
    definitionCode: row.definition_code || null,
    definitionLabel: row.definition_label || null,
    domain: row.domain || null,
    policyCode: row.policy_code || null,
    policyVersionCode: row.policy_version_code || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapParticipationPolicyVersion(row){
  if(!row) return null;
  return {
    policy_version_id: row.policy_version_id,
    policyVersionId: row.policy_version_id,
    policy_code: row.policy_code,
    policyCode: row.policy_code,
    domain: row.domain,
    version_code: row.version_code,
    versionCode: row.version_code,
    valid_from: dateOnly(row.valid_from),
    validFrom: dateOnly(row.valid_from),
    valid_to: dateOnly(row.valid_to),
    validTo: dateOnly(row.valid_to),
    config: row.config || {},
    active: row.active !== false,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapCycle(row){
  if(!row) return null;
  return {
    cycle_id: row.cycle_id,
    cycle_key: row.cycle_key || null,
    annee: row.annee == null ? null : Number(row.annee),
    domaine_code: row.domaine_code,
    type_cycle: row.type_cycle || null,
    libelle: row.libelle,
    statut: row.statut,
    stat_com: row.stat_com || null,
    qui: row.qui || null,
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    source_type: row.source_type || 'MANUEL',
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapCyclePersonne(row){
  if(!row) return null;
  return {
    cycle_id: row.cycle_id,
    personne_id: row.personne_id,
    role_cycle: row.role_cycle,
    statut_cycle: row.statut_cycle,
    session_event_id: row.session_event_id || null,
    participated_event_id: row.participated_event_id || null,
    exception_type: row.exception_type || null,
    exercise_scope: row.exercise_scope || [],
    source: row.source || 'MANUEL',
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    commentaire: row.commentaire || null,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    nip: row.nip || null,
    nom: row.nom || null,
    prenom: row.prenom || null,
    grade: row.grade || null
  };
}

function mapObjectif(row){
  if(!row) return null;
  return {
    ...row,
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    seuil_pct: row.seuil_pct == null ? null : Number(row.seuil_pct),
    actif: row.actif !== false
  };
}

const PERSONNE_SELECT = `
  id as personne_id,
  id,
  nip,
  nom,
  prenom,
  grade,
  (archived_at is null) as actif,
  date_entree_sdis as date_entree,
  null::date as date_sortie,
  'PERSONNEL'::text as source,
  case when archived_at is null then 'ACTIF' else 'INACTIF' end as statut_rh,
  date_entree_sdis,
  created_at,
  updated_at,
  archived_at
`;

const AFFECTATION_SELECT = `
  a.id as affectation_id,
  a.id,
  a.personne_id,
  c.cible_id,
  a.categorie,
  a.domaine,
  a.cible,
  a.role_domaine,
  a.domaine as domaine_code,
  a.cible as niveau_code,
  a.date_actif as date_debut,
  a.date_inactif as date_fin,
  'PERSONNEL'::text as source,
  a.date_actif,
  a.date_inactif,
  a.created_at,
  a.updated_at
`;

const EVENT_SELECT = `
  e.*,
  x.exercice_key,
  x.code as exercice_code,
  x.libelle as exercice_libelle,
  x.annee as exercice_annee,
  x.mode_session as exercice_mode_session,
  x.nombre_sessions_attendu,
  x.consolidation_active,
  x.source as exercice_source,
  x.cycle_id as exercice_cycle_id
`;

const cibleJoinCondition = pgCibleJoinCondition;

function normalizeAffectationInput(row = {}, cible){
  const domaine = row.domaine || row.domaine_code || (cible && cible.domaine_code) || null;
  const cibleCode = row.cible || row.niveau_code || (cible && cible.niveau_code) || null;
  return {
    id: row.affectation_id || row.id || randomUUID(),
    personne_id: row.personne_id,
    categorie: row.categorie || (domaine === 'PR' || domaine === 'AUTO' ? 'SPECIALISATION' : 'OI'),
    domaine,
    cible: cibleCode,
    role_domaine: row.role_domaine || 'PRINCIPAL',
    date_actif: isoDate(row.date_actif || row.date_debut),
    date_inactif: isoDate(row.date_inactif || row.date_fin)
  };
}

function mapPersonneDates(row){
  if(!row) return null;
  return {
    ...row,
    date_entree: dateOnly(row.date_entree),
    date_sortie: dateOnly(row.date_sortie),
    date_entree_sdis: dateOnly(row.date_entree_sdis)
  };
}

function mapAffectationDates(row){
  if(!row) return null;
  return {
    ...row,
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    date_actif: dateOnly(row.date_actif),
    date_inactif: dateOnly(row.date_inactif)
  };
}

function createPgRepo(client){
  const q = (text, params) => (client || db).query(text, params);
  let participationPolicyColumnsKnown = null;
  const tableExists = async (tableName) => {
    const result = await q(
      `select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = $1
      ) as ok`,
      [tableName]
    );
    return result.rows[0] && result.rows[0].ok === true;
  };
  const hasParticipationPolicyColumns = async () => {
    if(participationPolicyColumnsKnown !== null) return participationPolicyColumnsKnown;
    const result = await q(
      `select count(*)::int as n
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'scope_evenements'
         and column_name in ('participation_policy_version', 'participation_policy_snapshot')`
    );
    participationPolicyColumnsKnown = Number(result.rows[0] && result.rows[0].n) === 2;
    return participationPolicyColumnsKnown;
  };

  const api = {
    async withTransaction(fn){
      if(client) return fn(api);
      return db.transaction(async (txClient) => fn(createPgRepo(txClient)));
    },
    async listDomaines(){
      const result = await q('select * from scope_domaines where actif = true order by code');
      return result.rows;
    },
    async listSousDomaines(){
      const result = await q(`
        select *, domaine_code as domaine_parent
        from scope_sous_domaines
        where actif = true
        order by code
      `);
      return result.rows;
    },
    async listSuiviNominatif(){
      const columns = await q(`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'scope_suivi_nominatif'
      `);
      const existing = new Set(columns.rows.map((row) => row.column_name));
      const optional = [
        existing.has('date_fin') ? 'date_fin' : 'null::date as date_fin',
        existing.has('sous_domaine_code') ? 'sous_domaine_code' : 'null::text as sous_domaine_code',
        existing.has('commentaire') ? 'commentaire' : 'null::text as commentaire'
      ];
      const result = await q(`
        select
          suivi_id,
          portee,
          domaine_code,
          ${optional[1]},
          cible_id,
          nominatif_autorise,
          date_debut,
          ${optional[0]},
          ${optional[2]}
        from scope_suivi_nominatif
        order by portee, date_debut
      `);
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
    },
    async listCibles(){
      const result = await q('select * from scope_cibles where actif = true order by domaine_code, niveau_code');
      return result.rows;
    },
    async getCible(id){
      const result = await q('select * from scope_cibles where cible_id = $1', [id]);
      return result.rows[0] || null;
    },
    async findCible(domaine, niveau){
      const result = await q(
        'select * from scope_cibles where domaine_code = $1 and niveau_code = $2',
        [domaine, niveau]
      );
      return result.rows[0] || null;
    },
    async insertPersonne(row){
      const id = row.personne_id || randomUUID();
      const result = await q(
        `insert into scope_personnes(id, nip, nom, prenom, grade, date_entree_sdis, archived_at)
         values ($1,$2,$3,$4,$5,$6,$7) returning ${PERSONNE_SELECT}`,
        [
          id,
          row.nip,
          row.nom,
          row.prenom,
          row.grade || null,
          isoDate(row.date_entree_sdis || row.date_entree),
          row.actif === false ? new Date().toISOString() : null
        ]
      );
      const saved = mapPersonneDates(result.rows[0]);
      if(!row.skipPeriodes){
        for(const periode of periodFromPersonneRow(saved)){
          await q(
            `insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [randomUUID(), saved.personne_id, periode.type, periode.date_debut, periode.date_fin, periode.motif, periode.source || 'MANUEL']
          );
        }
      }
      return saved;
    },
    async updatePersonne(id, patch){
      const current = await api.getPersonne(id);
      if(!current) return null;
      const cleaned = Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value !== undefined));
      const next = { ...current, ...cleaned };
      const archivedAt = next.actif === false ? (current.archived_at || new Date().toISOString()) : null;
      const result = await q(
        `update scope_personnes
         set archived_at = $2, date_entree_sdis = $3,
             nom = $4, prenom = $5, grade = $6, updated_at = now()
         where id = $1 returning ${PERSONNE_SELECT}`,
        [
          id,
          archivedAt,
          isoDate(next.date_entree_sdis || next.date_entree),
          next.nom,
          next.prenom,
          next.grade || null
        ]
      );
      return mapPersonneDates(result.rows[0] || null);
    },
    async listPersonnesPeriodes(personneId){
      const result = await q(
        `select * from scope_personne_periodes where personne_id = $1 order by date_debut, created_at`,
        [personneId]
      );
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
    },
    async listAllPeriodes(){
      const result = await q('select * from scope_personne_periodes order by personne_id, date_debut, created_at');
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
    },
    async insertPeriode(row){
      const result = await q(
        `insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
         values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [
          row.periode_id || randomUUID(), row.personne_id, row.type,
          isoDate(row.date_debut), isoDate(row.date_fin), row.motif || null, row.source || 'MANUEL'
        ]
      );
      const saved = result.rows[0];
      return { ...saved, date_debut: dateOnly(saved.date_debut), date_fin: dateOnly(saved.date_fin) };
    },
    async updatePeriode(id, patch){
      const current = await q('select * from scope_personne_periodes where periode_id = $1', [id]);
      if(!current.rows[0]) return null;
      const next = {
        type: patch.type || current.rows[0].type,
        date_debut: patch.date_debut !== undefined ? isoDate(patch.date_debut) : dateOnly(current.rows[0].date_debut),
        date_fin: patch.date_fin !== undefined ? isoDate(patch.date_fin) : dateOnly(current.rows[0].date_fin),
        motif: patch.motif !== undefined ? patch.motif : current.rows[0].motif
      };
      const result = await q(
        `update scope_personne_periodes
         set type = $2, date_debut = $3, date_fin = $4, motif = $5, updated_at = now()
         where periode_id = $1 returning *`,
        [id, next.type, next.date_debut, next.date_fin, next.motif]
      );
      const saved = result.rows[0];
      return { ...saved, date_debut: dateOnly(saved.date_debut), date_fin: dateOnly(saved.date_fin) };
    },
    async getPersonneByNip(nip){
      const result = await q(`select ${PERSONNE_SELECT} from scope_personnes where nip = $1`, [String(nip)]);
      return mapPersonneDates(result.rows[0] || null);
    },
    async upsertPersonne(row){
      const existing = row.nip ? await api.getPersonneByNip(row.nip) : null;
      if(existing){
        const result = await q(
          `update scope_personnes
           set nom = $2, prenom = $3, grade = $4, date_entree_sdis = coalesce($5, date_entree_sdis), updated_at = now()
           where id = $1 returning ${PERSONNE_SELECT}`,
          [
            existing.personne_id,
            row.nom,
            row.prenom,
            row.grade || existing.grade,
            isoDate(row.date_entree_sdis || row.date_entree)
          ]
        );
        return mapPersonneDates(result.rows[0]);
      }
      return api.insertPersonne(row);
    },
    async getPersonne(id){
      const result = await q(`select ${PERSONNE_SELECT} from scope_personnes where id = $1`, [id]);
      return mapPersonneDates(result.rows[0] || null);
    },
    async listPersonnes({ q: search } = {}){
      if(!search){
        const result = await q(`select ${PERSONNE_SELECT} from scope_personnes order by nom, prenom`);
        return result.rows.map(mapPersonneDates);
      }
      const like = `%${String(search).trim()}%`;
      const result = await q(
        `select ${PERSONNE_SELECT} from scope_personnes
         where nip ilike $1 or nom ilike $1 or prenom ilike $1
            or (nom || ' ' || prenom) ilike $1
            or (prenom || ' ' || nom) ilike $1
         order by nom, prenom`,
        [like]
      );
      return result.rows.map(mapPersonneDates);
    },
    async countPersonnes(){
      const result = await q(`select count(*)::int as count from scope_personnes`);
      return Number(result.rows[0] && result.rows[0].count || 0);
    },
    async insertAffectation(row){
      const cible = row.cible_id ? await api.getCible(row.cible_id) : null;
      const next = normalizeAffectationInput(row, cible);
      if(!next.domaine || !next.cible) throw new Error('scope_affectation_target_required');
      const result = await q(
        `with inserted as (
           insert into scope_affectations(id, personne_id, categorie, domaine, cible, role_domaine, date_actif, date_inactif)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           returning *
         )
         select ${AFFECTATION_SELECT}
         from inserted a
         left join scope_cibles c on ${cibleJoinCondition('a')}
         where a.id = $1`,
        [
          next.id,
          next.personne_id,
          next.categorie,
          next.domaine,
          next.cible,
          next.role_domaine,
          next.date_actif,
          next.date_inactif
        ]
      );
      return mapAffectationDates(result.rows[0]);
    },
    async updateAffectation(id, patch){
      patch = patch || {};
      const current = await q('select * from scope_affectations where id = $1', [id]);
      if(!current.rows[0]) return null;
      const row = current.rows[0];
      const cible = patch.cible_id ? await api.getCible(patch.cible_id) : null;
      const next = {
        date_actif: patch.date_actif !== undefined ? isoDate(patch.date_actif) : (patch.date_debut !== undefined ? isoDate(patch.date_debut) : dateOnly(row.date_actif)),
        date_inactif: patch.date_inactif !== undefined ? isoDate(patch.date_inactif) : (patch.date_fin !== undefined ? isoDate(patch.date_fin) : dateOnly(row.date_inactif)),
        domaine: patch.domaine || patch.domaine_code || (cible && cible.domaine_code) || row.domaine,
        cible: patch.cible || patch.niveau_code || (cible && cible.niveau_code) || row.cible,
        categorie: patch.categorie || row.categorie,
        role_domaine: patch.role_domaine !== undefined ? patch.role_domaine : row.role_domaine
      };
      const result = await q(
        `with updated as (
           update scope_affectations
           set date_actif = $2, date_inactif = $3, domaine = $4, cible = $5,
               categorie = $6, role_domaine = $7, updated_at = now()
           where id = $1
           returning *
         )
         select ${AFFECTATION_SELECT}
         from updated a
         left join scope_cibles c on ${cibleJoinCondition('a')}
         where a.id = $1`,
        [id, next.date_actif, next.date_inactif, next.domaine, next.cible, next.categorie, next.role_domaine]
      );
      return mapAffectationDates(result.rows[0]);
    },
    async listAffectations({ personneId, date } = {}){
      const base = `select ${AFFECTATION_SELECT}
        from scope_affectations a
        left join scope_cibles c on ${cibleJoinCondition('a')}`;
      if(personneId && date){
        const result = await q(
          `${base}
           where a.personne_id = $1
             and a.date_actif <= $2::date
             and (a.date_inactif is null or $2::date <= a.date_inactif)`,
          [personneId, isoDate(date)]
        );
        return result.rows.map(mapAffectationDates);
      }
      if(personneId){
        const result = await q(`${base} where a.personne_id = $1`, [personneId]);
        return result.rows.map(mapAffectationDates);
      }
      const result = await q(base);
      return result.rows.map(mapAffectationDates);
    },
    async listAffectationsForCibles(cibleIds, date){
      if(!cibleIds.length) return [];
      const result = await q(
        `select ${AFFECTATION_SELECT}
         from scope_affectations a
         join scope_cibles c on ${cibleJoinCondition('a')}
         where c.cible_id = any($1::uuid[])
           and a.date_actif <= $2::date
           and (a.date_inactif is null or $2::date <= a.date_inactif)`,
        [cibleIds, isoDate(date)]
      );
      return result.rows.map(mapAffectationDates);
    },
    async insertEvenement(row){
      const id = row.evenement_id || randomUUID();
      const { inferModeSuivi } = require('./_scope-analytics');
      const modeSuivi = inferModeSuivi(row);
      const codeCours = row.code_cours || row.codeCours || null;
      const policyColumns = await hasParticipationPolicyColumns();
      const exerciseEquivalenceKey = row.exercise_equivalence_key || row.exerciseEquivalenceKey || null;
      const eventColumns = [
        'evenement_id', 'internal_event_id', 'date', 'domaine_code', 'sous_domaine_code', 'libelle', 'statut', 'origine', 'mode_suivi',
        'identifiant_externe', 'code_cours', 'code_source', 'source_type', 'heure_debut', 'heure_fin', 'salle', 'responsable',
        'exercice_id', 'session_index', 'session_label', 'pr_exercise_group_key', 'pr_session_key'
      ];
      const params = [
        id,
        row.internal_event_id || row.internalEventId || id,
        isoDate(row.date),
        row.domaine_code,
        row.sous_domaine_code || null,
        row.libelle,
        row.statut || 'PLANIFIE',
        row.origine || 'NOMINATIF',
        modeSuivi,
        row.identifiant_externe || row.identifiantExterne || null,
        codeCours,
        row.code_source || row.codeSource || codeCours,
        row.source_type || row.sourceType || (row.origine === 'IMPORT_CSV' ? 'CSV' : 'MANUEL'),
        row.heure_debut || row.heureDebut || null,
        row.heure_fin || row.heureFin || null,
        row.salle || null,
        row.responsable || null,
        row.exercice_id || row.exerciceId || null,
        row.session_index == null ? (row.sessionIndex == null ? null : Number(row.sessionIndex)) : Number(row.session_index),
        row.session_label || row.sessionLabel || null,
        row.pr_exercise_group_key || row.prExerciseGroupKey || null,
        row.pr_session_key || row.prSessionKey || null
      ];
      if(exerciseEquivalenceKey){
        eventColumns.push('exercise_equivalence_key');
        params.push(exerciseEquivalenceKey);
      }
      if(policyColumns){
        eventColumns.push('participation_policy_version', 'participation_policy_snapshot');
        params.push(
          row.participation_policy_version || row.participationPolicyVersion || null,
          JSON.stringify(row.participation_policy_snapshot || row.participationPolicySnapshot || null)
        );
      }
      if(await tableExists('scope_event_definition_versions')){
        eventColumns.push('definition_version_id', 'policy_version_id', 'engine_route', 'engine_snapshot');
        params.push(
          row.definition_version_id || row.definitionVersionId || null,
          row.policy_version_id || row.policyVersionId || null,
          row.engine_route || row.engineRoute || null,
          JSON.stringify(row.engine_snapshot || row.engineSnapshot || null)
        );
      }
      const valuePlaceholders = params.map((_, index) => `$${index + 1}${eventColumns[index] === 'participation_policy_snapshot' || eventColumns[index] === 'engine_snapshot' ? '::jsonb' : ''}`);
      const result = codeCours
        ? await q(
          `with ins as (
             insert into scope_evenements(
               ${eventColumns.join(', ')}, version
             ) values (${valuePlaceholders.join(', ')},1)
             on conflict (code_cours) where code_cours is not null do nothing
             returning *, false as already_exists
           )
           select * from ins
           union all
           select e.*, true as already_exists
           from scope_evenements e
           where e.code_cours = $11
             and not exists (select 1 from ins)
           limit 1`,
          params
        )
        : await q(
          `insert into scope_evenements(
             ${eventColumns.join(', ')}, version
           ) values (${valuePlaceholders.join(', ')},1)
           returning *, false as already_exists`,
          params
        );
      const cibleIds = row.cible_ids || [];
      for(const cibleId of cibleIds){
        await q(
          'insert into scope_evenement_cibles(evenement_id, cible_id) values ($1,$2) on conflict do nothing',
          [id, cibleId]
        );
      }
      return mapEvent(result.rows[0]);
    },
    async listEvenements({ annee, statut, domaine, from, to } = {}){
      const clauses = [];
      const params = [];
      let i = 1;
      if(annee){
        clauses.push(`extract(year from e.date) = $${i}`);
        params.push(Number(annee));
        i += 1;
      }
      if(statut){
        clauses.push(`e.statut = $${i}`);
        params.push(String(statut));
        i += 1;
      }
      if(domaine){
        clauses.push(`e.domaine_code = $${i}`);
        params.push(String(domaine));
        i += 1;
      }
      if(from){
        clauses.push(`e.date >= $${i}::date`);
        params.push(isoDate(from));
        i += 1;
      }
      if(to){
        clauses.push(`e.date <= $${i}::date`);
        params.push(isoDate(to));
        i += 1;
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(`select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id ${where} order by e.date desc, e.libelle`, params);
      return result.rows.map(mapEvent);
    },
    async getEvent(id){
      const result = await q(`select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id where e.evenement_id = $1`, [id]);
      return mapEvent(result.rows[0] || null);
    },
    async getEventForUpdate(id){
      const result = await q('select * from scope_evenements where evenement_id = $1 for update', [id]);
      return mapEvent(result.rows[0] || null);
    },
    async listEventCibleIds(id){
      const result = await q('select cible_id from scope_evenement_cibles where evenement_id = $1', [id]);
      return result.rows.map(r => r.cible_id);
    },
    async listEventCiblesForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q(
        `select ec.evenement_id, c.*
         from scope_evenement_cibles ec
         join scope_cibles c on c.cible_id = ec.cible_id
         where ec.evenement_id = any($1::uuid[])`,
        [ids]
      );
      return result.rows;
    },
    async setEventCibles(id, cibleIds){
      await q('delete from scope_evenement_cibles where evenement_id = $1', [id]);
      for(const cibleId of cibleIds){
        await q('insert into scope_evenement_cibles(evenement_id, cible_id) values ($1,$2)', [id, cibleId]);
      }
    },
    async updateEventIfVersion(id, baseVersion, patch){
      let allowed = [
        'date','domaine_code','libelle','statut','origine','mode_suivi','population_figee','population_version',
        'figee_at','figee_par','cloture_at','cloture_par','sous_domaine_code','heure_debut','heure_fin','salle','responsable','cycle_id',
        'exercice_id','session_index','session_label','pr_exercise_group_key','pr_session_key','exercise_equivalence_key','participation_policy_version','participation_policy_snapshot',
        'definition_version_id','policy_version_id','engine_route','engine_snapshot'
      ];
      if(Object.prototype.hasOwnProperty.call(patch || {}, 'participation_policy_version') || Object.prototype.hasOwnProperty.call(patch || {}, 'participation_policy_snapshot')){
        if(!(await hasParticipationPolicyColumns())){
          allowed = allowed.filter((key) => key !== 'participation_policy_version' && key !== 'participation_policy_snapshot');
        }
      }
      const sets = ['version = version + 1', 'updated_at = now()'];
      const params = [];
      let i = 1;
      for(const key of allowed){
        if(Object.prototype.hasOwnProperty.call(patch, key)){
          sets.push(`${key} = $${i}`);
          params.push(patch[key]);
          i += 1;
        }
      }
      params.push(id, Number(baseVersion));
      const result = await q(
        `update scope_evenements set ${sets.join(', ')}
         where evenement_id = $${i} and version = $${i + 1}
         returning *`,
        params
      );
      return mapEvent(result.rows[0] || null);
    },
    async upsertMultisessionV2(row){
      const result = await q(
        `insert into scope_multisessions_v2(multisession_id, code, label, domain, period, status, metadata)
         values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, coalesce($6, 'OUVERTE'), coalesce($7::jsonb, '{}'::jsonb))
         on conflict (code) do update set
           label = excluded.label,
           domain = excluded.domain,
           period = excluded.period,
           status = excluded.status,
           metadata = scope_multisessions_v2.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [row.multisession_id || null, row.code, row.label, row.domain || row.domaine || row.domaine_code, row.period || null, row.status || 'OUVERTE', JSON.stringify(row.metadata || {})]
      );
      return result.rows[0] || null;
    },
    async getMultisessionV2(id){
      const result = await q('select * from scope_multisessions_v2 where multisession_id = $1', [id]);
      return result.rows[0] || null;
    },
    async listMultisessionsV2(query = {}){
      const where = [];
      const params = [];
      let i = 1;
      const domain = String(query.domaine || query.domaineCode || query.domaine_code || '').trim().toUpperCase();
      if(domain && domain !== 'TOUS'){
        where.push(`upper(domain) = $${i}`);
        params.push(domain);
        i += 1;
      }
      const year = query.annee || query.year;
      if(year){
        where.push(`coalesce(period->>'from', period->>'to', '') like $${i}`);
        params.push(`${Number(year)}%`);
        i += 1;
      }
      const sql = `select * from scope_multisessions_v2 ${where.length ? `where ${where.join(' and ')}` : ''} order by period->>'from' desc nulls last, label`;
      const result = await q(sql, params);
      return result.rows;
    },
    async getMultisessionV2ForEvent(eventId){
      const result = await q(
        `select ms.*
         from scope_multisessions_v2 ms
         join scope_multisession_v2_sessions s on s.multisession_id = ms.multisession_id
         where s.event_id = $1`,
        [eventId]
      );
      return result.rows[0] || null;
    },
    async listMultisessionV2Sessions(multisessionId){
      const result = await q(
        `select ${EVENT_SELECT}, s.multisession_session_id, s.multisession_id, s.event_id, s.sequence, s.status, s.metadata
         from scope_multisession_v2_sessions s
         join scope_evenements e on e.evenement_id = s.event_id
         left join scope_exercices x on x.exercice_id = e.exercice_id
         where s.multisession_id = $1
         order by s.sequence, e.date, e.libelle`,
        [multisessionId]
      );
      return result.rows.map((row) => Object.assign(mapEvent(row), {
        multisession_session_id: row.multisession_session_id,
        multisession_id: row.multisession_id,
        event_id: row.event_id,
        sequence: Number(row.sequence),
        status: row.status,
        metadata: row.metadata || {}
      }));
    },
    async upsertMultisessionV2Session(row){
      const result = await q(
        `insert into scope_multisession_v2_sessions(multisession_id, event_id, sequence, status, metadata)
         values ($1,$2,$3,coalesce($4,'OUVERTE'),coalesce($5::jsonb,'{}'::jsonb))
         on conflict (event_id) do update set
           multisession_id = excluded.multisession_id,
           sequence = excluded.sequence,
           status = excluded.status,
           metadata = scope_multisession_v2_sessions.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [row.multisession_id, row.event_id, Number(row.sequence || 1), row.status || 'OUVERTE', JSON.stringify(row.metadata || {})]
      );
      return result.rows[0] || null;
    },
    async listMultisessionV2Population(multisessionId){
      const result = await q(
        `select mp.*, mp.person_id as personne_id, p.nip, p.grade, p.nom, p.prenom
         from scope_multisession_v2_population mp
         left join scope_personnes p on p.id = mp.person_id
         where mp.multisession_id = $1
         order by p.nom, p.prenom, p.nip`,
        [multisessionId]
      );
      return result.rows;
    },
    async upsertMultisessionV2Population(row){
      const result = await q(
        `insert into scope_multisession_v2_population(multisession_id, person_id, snapshot, provenance)
         values ($1,$2,coalesce($3::jsonb,'{}'::jsonb),coalesce($4,'ATTENDUS_CONSOLIDES'))
         on conflict (multisession_id, person_id) do update set
           snapshot = scope_multisession_v2_population.snapshot || excluded.snapshot,
           provenance = excluded.provenance,
           updated_at = now()
         returning *, person_id as personne_id`,
        [row.multisession_id, row.person_id || row.personne_id, JSON.stringify(row.snapshot || {}), row.provenance || 'ATTENDUS_CONSOLIDES']
      );
      return result.rows[0] || null;
    },
    async upsertMultisessionV2Participation(row){
      const result = await q(
        `insert into scope_multisession_v2_participations(multisession_id, session_id, person_id, attendance_status, role, reason, created_by)
         values ($1,$2,$3,$4,coalesce($5,'PARTICIPANT'),$6,$7)
         on conflict (multisession_id, session_id, person_id, role) do update set
           attendance_status = excluded.attendance_status,
           reason = excluded.reason,
           created_by = excluded.created_by,
           updated_at = now()
         returning *, person_id as personne_id`,
        [row.multisession_id, row.session_id || row.event_id, row.person_id || row.personne_id, row.attendance_status || row.statut, row.role || 'PARTICIPANT', row.reason || row.motif_absence || null, row.created_by || row.auteur_id || null]
      );
      return result.rows[0] || null;
    },
    async updateMultisessionV2(id, patch){
      const allowed = ['status', 'closed_at', 'closed_by', 'metadata'];
      const sets = ['updated_at = now()'];
      const params = [];
      let i = 1;
      for(const key of allowed){
        if(Object.prototype.hasOwnProperty.call(patch || {}, key)){
          sets.push(`${key} = $${i}${key === 'metadata' ? '::jsonb' : ''}`);
          params.push(key === 'metadata' ? JSON.stringify(patch[key] || {}) : patch[key]);
          i += 1;
        }
      }
      params.push(id);
      const result = await q(`update scope_multisessions_v2 set ${sets.join(', ')} where multisession_id = $${i} returning *`, params);
      return result.rows[0] || null;
    },
    async listAttendus(eventId){
      const result = await q('select * from scope_attendus where evenement_id = $1', [eventId]);
      return result.rows;
    },
    async listAttendusForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q('select * from scope_attendus where evenement_id = any($1::uuid[])', [ids]);
      return result.rows;
    },
    async getAttendu(eventId, personneId){
      const result = await q(
        'select * from scope_attendus where evenement_id = $1 and personne_id = $2',
        [eventId, personneId]
      );
      return result.rows[0] || null;
    },
    async upsertAttendu(row){
      const result = await q(
        `insert into scope_attendus(evenement_id, personne_id, inclus, origine, origine_retrait, motif_inclusion)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (evenement_id, personne_id) do update set
           inclus = excluded.inclus,
           origine = excluded.origine,
           origine_retrait = excluded.origine_retrait,
           motif_inclusion = excluded.motif_inclusion,
           updated_at = now()
         returning *`,
        [row.evenement_id, row.personne_id, row.inclus !== false, row.origine, row.origine_retrait || null, row.motif_inclusion || null]
      );
      return result.rows[0];
    },
    async bulkUpsertAttendus(rows){
      const list = rows || [];
      if(!list.length) return [];
      const result = await q(
        `insert into scope_attendus(evenement_id, personne_id, inclus, origine, origine_retrait, motif_inclusion)
         select evenement_id, personne_id, coalesce(inclus, true), origine, origine_retrait, motif_inclusion
         from jsonb_to_recordset($1::jsonb) as x(
           evenement_id uuid,
           personne_id uuid,
           inclus boolean,
           origine text,
           origine_retrait text,
           motif_inclusion text
         )
         on conflict (evenement_id, personne_id) do update set
           inclus = excluded.inclus,
           origine = excluded.origine,
           origine_retrait = excluded.origine_retrait,
           motif_inclusion = excluded.motif_inclusion,
           updated_at = now()
         returning *`,
        [JSON.stringify(list.map((row) => ({
          evenement_id: row.evenement_id,
          personne_id: row.personne_id,
          inclus: row.inclus !== false,
          origine: row.origine,
          origine_retrait: row.origine_retrait || null,
          motif_inclusion: row.motif_inclusion || null
        })))]
      );
      return result.rows;
    },
    async listParticipations(eventId){
      const result = await q('select * from scope_participations where evenement_id = $1', [eventId]);
      return result.rows;
    },
    async listParticipationsForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q('select * from scope_participations where evenement_id = any($1::uuid[])', [ids]);
      return result.rows;
    },
    async getParticipation(eventId, personneId){
      const result = await q(
        'select * from scope_participations where evenement_id = $1 and personne_id = $2',
        [eventId, personneId]
      );
      return result.rows[0] || null;
    },
    async deleteParticipation(eventId, personneId){
      const result = await q(
        'delete from scope_participations where evenement_id = $1 and personne_id = $2',
        [eventId, personneId]
      );
      return result.rowCount > 0;
    },
    async upsertParticipation(row){
      const result = await q(
        `insert into scope_participations(
           evenement_id, personne_id, statut, motif_absence, commentaire, role, source, auteur_id, cible_suivie_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (evenement_id, personne_id) do update set
           statut = excluded.statut,
           motif_absence = excluded.motif_absence,
           commentaire = excluded.commentaire,
           role = excluded.role,
           source = excluded.source,
           auteur_id = excluded.auteur_id,
           cible_suivie_id = excluded.cible_suivie_id,
           updated_at = now()
         returning *`,
        [
          row.evenement_id, row.personne_id, row.statut, row.motif_absence || null,
          row.commentaire || null, row.role || 'PARTICIPANT', row.source || 'SAISIE', row.auteur_id || null,
          row.cible_suivie_id || null
        ]
      );
      return result.rows[0];
    },
    async bulkUpsertParticipations(rows){
      const list = rows || [];
      if(!list.length) return [];
      const result = await q(
        `insert into scope_participations(
           evenement_id, personne_id, statut, motif_absence, commentaire, role, source, auteur_id, cible_suivie_id
         )
         select evenement_id, personne_id, statut, motif_absence, commentaire,
                coalesce(role, 'PARTICIPANT'), coalesce(source, 'SAISIE'), auteur_id, cible_suivie_id
         from jsonb_to_recordset($1::jsonb) as x(
           evenement_id uuid,
           personne_id uuid,
           statut text,
           motif_absence text,
           commentaire text,
           role text,
           source text,
           auteur_id text,
           cible_suivie_id uuid
         )
         on conflict (evenement_id, personne_id) do update set
           statut = excluded.statut,
           motif_absence = excluded.motif_absence,
           commentaire = excluded.commentaire,
           role = excluded.role,
           source = excluded.source,
           auteur_id = excluded.auteur_id,
           cible_suivie_id = excluded.cible_suivie_id,
           updated_at = now()
         returning *`,
        [JSON.stringify(list.map((row) => ({
          evenement_id: row.evenement_id,
          personne_id: row.personne_id,
          statut: row.statut,
          motif_absence: row.motif_absence || null,
          commentaire: row.commentaire || null,
          role: row.role || 'PARTICIPANT',
          source: row.source || 'SAISIE',
          auteur_id: row.auteur_id || null,
          cible_suivie_id: row.cible_suivie_id || null
        })))]
      );
      return result.rows;
    },
    async upsertPermutation(row){
      let result;
      try {
        result = await q(
          `insert into scope_permutations(
           permutation_id, personne_id, source_evenement_id, source_exercise_key, source_cible_id,
           source_date, rattrapage_evenement_id, rattrapage_cible_id, rattrapage_date,
           statut, regularisation_motif, commentaire, auteur_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (personne_id, source_evenement_id) do update set
           source_exercise_key = excluded.source_exercise_key,
           source_cible_id = excluded.source_cible_id,
           source_date = excluded.source_date,
           rattrapage_evenement_id = excluded.rattrapage_evenement_id,
           rattrapage_cible_id = excluded.rattrapage_cible_id,
           rattrapage_date = excluded.rattrapage_date,
           statut = excluded.statut,
           regularisation_motif = excluded.regularisation_motif,
           commentaire = excluded.commentaire,
           auteur_id = excluded.auteur_id,
           updated_at = now()
           returning *`,
          [
            row.permutation_id || randomUUID(),
            row.personne_id,
            row.source_evenement_id,
            row.source_exercise_key,
            row.source_cible_id || null,
            isoDate(row.source_date) || null,
            row.rattrapage_evenement_id || null,
            row.rattrapage_cible_id || null,
            isoDate(row.rattrapage_date) || null,
            row.statut || 'A_RATTRAPER',
            row.regularisation_motif || null,
            row.commentaire || null,
            row.auteur_id || null
          ]
        );
      } catch(error) {
        if(error && error.code === '42P01') return null;
        throw error;
      }
      return result.rows[0];
    },
    async listPermutations(filter = {}){
      const clauses = [];
      const params = [];
      let i = 1;
      const add = (sql, value) => {
        clauses.push(sql.replace('?', `$${i}`));
        params.push(value);
        i += 1;
      };
      const personneId = filter.personneId || filter.personne_id;
      if(personneId) add('personne_id = ?', personneId);
      const sourceEvenementId = filter.sourceEvenementId || filter.source_evenement_id;
      if(sourceEvenementId) add('source_evenement_id = ?', sourceEvenementId);
      if(filter.sourceEvenementIds && filter.sourceEvenementIds.length){
        clauses.push(`source_evenement_id = any($${i}::uuid[])`);
        params.push(filter.sourceEvenementIds);
        i += 1;
      }
      const sourceExerciseKey = filter.sourceExerciseKey || filter.source_exercise_key;
      if(sourceExerciseKey) add('source_exercise_key = ?', sourceExerciseKey);
      if(filter.statut){
        const statuses = Array.isArray(filter.statut) ? filter.statut : [filter.statut];
        clauses.push(`statut = any($${i}::text[])`);
        params.push(statuses);
        i += 1;
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      let result;
      try {
        result = await q(`select * from scope_permutations ${where} order by created_at`, params);
      } catch(error) {
        if(error && error.code === '42P01') return [];
        throw error;
      }
      return result.rows.map((row) => ({
        ...row,
        source_date: dateOnly(row.source_date),
        rattrapage_date: dateOnly(row.rattrapage_date)
      }));
    },
    async getPermutation(id){
      let result;
      try {
        result = await q('select * from scope_permutations where permutation_id = $1', [id]);
      } catch(error) {
        if(error && error.code === '42P01') return null;
        throw error;
      }
      const row = result.rows[0];
      return row ? { ...row, source_date: dateOnly(row.source_date), rattrapage_date: dateOnly(row.rattrapage_date) } : null;
    },
    async deletePermutation(id){
      try {
        const result = await q('delete from scope_permutations where permutation_id = $1', [id]);
        return result.rowCount > 0;
      } catch(error) {
        if(error && error.code === '42P01') return false;
        throw error;
      }
    },
    async insertLegacy(row){
      const id = row.legacy_id || randomUUID();
      const result = await q(
        `insert into scope_legacy_aggregates(
           legacy_id, source_record_id, date, domaine_code, libelle,
           nb_convoques, nb_presents, nb_excuses, nb_absents, payload_v67,
           evenement_id, fingerprint
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) returning *`,
        [
          id, row.source_record_id || null, isoDate(row.date), row.domaine_code, row.libelle || null,
          row.nb_convoques ?? null, row.nb_presents ?? null, row.nb_excuses ?? null, row.nb_absents ?? null,
          JSON.stringify(row.payload_v67 || {}),
          row.evenement_id || null, row.fingerprint || null
        ]
      );
      return result.rows[0];
    },
    async listLegacy(){
      const result = await q('select * from scope_legacy_aggregates order by date');
      return result.rows;
    },
    async listCycles({ annee, domaine, statut } = {}){
      const clauses = [];
      const params = [];
      let i = 1;
      if(annee){
        clauses.push(`annee = $${i}`);
        params.push(Number(annee));
        i += 1;
      }
      if(domaine){
        clauses.push(`domaine_code = $${i}`);
        params.push(String(domaine));
        i += 1;
      }
      if(statut){
        clauses.push(`statut = $${i}`);
        params.push(String(statut));
        i += 1;
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(`select * from scope_cycles ${where} order by annee desc nulls last, date_debut desc nulls last, libelle`, params);
      return result.rows.map(mapCycle);
    },
    async getCycle(id){
      const result = await q('select * from scope_cycles where cycle_id = $1', [id]);
      return mapCycle(result.rows[0] || null);
    },
    async getCycleByKey(cycleKey){
      const result = await q('select * from scope_cycles where cycle_key = $1', [cycleKey]);
      return mapCycle(result.rows[0] || null);
    },
    async insertCycle(row){
      const id = row.cycle_id || randomUUID();
      const result = await q(
        `insert into scope_cycles(
          cycle_id, cycle_key, annee, domaine_code, type_cycle, libelle, statut,
          stat_com, qui, date_debut, date_fin, source_type, metadata
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
        returning *`,
        [
          id,
          row.cycle_key || null,
          row.annee == null ? null : Number(row.annee),
          row.domaine_code,
          row.type_cycle || null,
          row.libelle,
          row.statut || 'PLANIFIE',
          row.stat_com || null,
          row.qui || null,
          isoDate(row.date_debut),
          isoDate(row.date_fin),
          row.source_type || 'MANUEL',
          JSON.stringify(row.metadata || {})
        ]
      );
      return mapCycle(result.rows[0]);
    },
    async updateCycle(id, patch){
      const allowed = ['cycle_key','annee','domaine_code','type_cycle','libelle','statut','stat_com','qui','date_debut','date_fin','source_type','metadata'];
      const sets = ['updated_at = now()'];
      const params = [];
      let i = 1;
      for(const key of allowed){
        if(Object.prototype.hasOwnProperty.call(patch || {}, key)){
          if(key === 'metadata') {
            sets.push(`${key} = $${i}::jsonb`);
            params.push(JSON.stringify(patch[key] || {}));
          } else {
            sets.push(`${key} = $${i}`);
            params.push(key === 'date_debut' || key === 'date_fin' ? isoDate(patch[key]) : patch[key]);
          }
          i += 1;
        }
      }
      params.push(id);
      const result = await q(`update scope_cycles set ${sets.join(', ')} where cycle_id = $${i} returning *`, params);
      return mapCycle(result.rows[0] || null);
    },
    async listCycleEvents(cycleId){
      const result = await q(`select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id where e.cycle_id = $1 order by e.date, e.libelle`, [cycleId]);
      return result.rows.map(mapEvent);
    },
    async listPrExerciseEvents(groupKey){
      const textKey = String(groupKey || '');
      if(textKey.startsWith('EXERCICE:') && api.listExerciseEvents){
        return api.listExerciseEvents(textKey.slice('EXERCICE:'.length));
      }
      const result = await q(`select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id where e.pr_exercise_group_key = $1 order by e.date, e.libelle`, [groupKey]);
      return result.rows.map(mapEvent);
    },
    async listExerciseEvents(exerciceId){
      const result = await q(`select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id where e.exercice_id = $1 order by coalesce(e.session_index, 999999), e.date, e.libelle`, [exerciceId]);
      return result.rows.map(mapEvent);
    },
    async getExercise(id){
      const result = await q('select * from scope_exercices where exercice_id = $1', [id]);
      return mapExercise(result.rows[0] || null);
    },
    async getExerciseByKey(exerciceKey){
      const result = await q('select * from scope_exercices where exercice_key = $1', [exerciceKey]);
      return mapExercise(result.rows[0] || null);
    },
    async upsertExercise(row){
      const id = row.exercice_id || row.exerciceId || randomUUID();
      const result = await q(
        `insert into scope_exercices(
          exercice_id, exercice_key, domaine_code, code, libelle, annee,
          mode_session, nombre_sessions_attendu, consolidation_active, source, cycle_id, metadata,
          definition_version_id, policy_version_id, engine_route, configuration_snapshot
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16::jsonb)
        on conflict (exercice_key) where exercice_key is not null do update set
          domaine_code = excluded.domaine_code,
          code = coalesce(scope_exercices.code, excluded.code),
          libelle = excluded.libelle,
          annee = excluded.annee,
          mode_session = excluded.mode_session,
          nombre_sessions_attendu = excluded.nombre_sessions_attendu,
          consolidation_active = excluded.consolidation_active,
          definition_version_id = coalesce(scope_exercices.definition_version_id, excluded.definition_version_id),
          policy_version_id = coalesce(scope_exercices.policy_version_id, excluded.policy_version_id),
          engine_route = coalesce(excluded.engine_route, scope_exercices.engine_route),
          configuration_snapshot = coalesce(scope_exercices.configuration_snapshot, excluded.configuration_snapshot),
          updated_at = now(),
          metadata = scope_exercices.metadata || excluded.metadata
        returning *`,
        [
          id,
          row.exercice_key || row.exerciceKey || null,
          row.domaine_code || row.domaineCode,
          row.code || null,
          row.libelle,
          row.annee == null ? null : Number(row.annee),
          row.mode_session || row.modeSession || 'SINGLE',
          row.nombre_sessions_attendu == null ? (row.nombreSessionsAttendu == null ? 1 : Number(row.nombreSessionsAttendu)) : Number(row.nombre_sessions_attendu),
          row.consolidation_active === true || row.consolidationActive === true,
          row.source || 'MANUEL',
          row.cycle_id || row.cycleId || null,
          JSON.stringify(row.metadata || {}),
          row.definition_version_id || row.definitionVersionId || null,
          row.policy_version_id || row.policyVersionId || null,
          row.engine_route || row.engineRoute || null,
          JSON.stringify(row.configuration_snapshot || row.configurationSnapshot || null)
        ]
      );
      return mapExercise(result.rows[0]);
    },
    async updateExercise(id, patch){
      const allowed = ['exercice_key','domaine_code','code','libelle','annee','mode_session','nombre_sessions_attendu','consolidation_active','source','cycle_id','metadata','definition_version_id','policy_version_id','engine_route','configuration_snapshot'];
      const sets = ['updated_at = now()'];
      const params = [];
      let i = 1;
      for(const key of allowed){
        if(Object.prototype.hasOwnProperty.call(patch || {}, key)){
          if(key === 'metadata' || key === 'configuration_snapshot'){
            sets.push(`${key} = $${i}::jsonb`);
            params.push(JSON.stringify(patch[key] || {}));
          } else {
            sets.push(`${key} = $${i}`);
            params.push(patch[key]);
          }
          i += 1;
        }
      }
      params.push(id);
      const result = await q(`update scope_exercices set ${sets.join(', ')} where exercice_id = $${i} returning *`, params);
      return mapExercise(result.rows[0] || null);
    },
    async attachEventToCycle(cycleId, eventId){
      const result = await q('update scope_evenements set cycle_id = $1, updated_at = now(), version = version + 1 where evenement_id = $2 returning *', [cycleId, eventId]);
      return mapEvent(result.rows[0] || null);
    },
    async detachEventFromCycle(cycleId, eventId){
      const result = await q('update scope_evenements set cycle_id = null, updated_at = now(), version = version + 1 where evenement_id = $2 and cycle_id = $1 returning *', [cycleId, eventId]);
      return mapEvent(result.rows[0] || null);
    },
    async listCyclePersonnes(cycleId){
      const result = await q(
        `select cp.*, p.nip, p.nom, p.prenom, p.grade
         from scope_cycle_personnes cp
         join scope_personnes p on p.id = cp.personne_id
         where cp.cycle_id = $1
         order by cp.role_cycle, p.nom, p.prenom`,
        [cycleId]
      );
      return result.rows.map(mapCyclePersonne);
    },
    async upsertCyclePersonne(row){
      const result = await q(
        `insert into scope_cycle_personnes(
          cycle_id, personne_id, role_cycle, statut_cycle, session_event_id, participated_event_id,
          exception_type, exercise_scope, source, date_debut, date_fin, commentaire, metadata
        ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13::jsonb)
        on conflict (cycle_id, personne_id, role_cycle) do update set
          statut_cycle = excluded.statut_cycle,
          session_event_id = excluded.session_event_id,
          participated_event_id = excluded.participated_event_id,
          exception_type = excluded.exception_type,
          exercise_scope = excluded.exercise_scope,
          source = excluded.source,
          date_debut = excluded.date_debut,
          date_fin = excluded.date_fin,
          commentaire = excluded.commentaire,
          metadata = excluded.metadata,
          updated_at = now()
        returning *`,
        [
          row.cycle_id,
          row.personne_id,
          row.role_cycle || 'PARTICIPANT',
          row.statut_cycle || 'ACTIF',
          row.session_event_id || null,
          row.participated_event_id || null,
          row.exception_type || null,
          JSON.stringify(row.exercise_scope || []),
          row.source || 'MANUEL',
          isoDate(row.date_debut),
          isoDate(row.date_fin),
          row.commentaire || null,
          JSON.stringify(row.metadata || {})
        ]
      );
      return mapCyclePersonne(result.rows[0]);
    },
    async deleteCyclePersonne(cycleId, personneId, roleCycle){
      const result = await q(
        'delete from scope_cycle_personnes where cycle_id = $1 and personne_id = $2 and role_cycle = $3',
        [cycleId, personneId, roleCycle || 'PARTICIPANT']
      );
      return result.rowCount > 0;
    },
    async getLegacyByEvenementId(eventId){
      const result = await q(
        'select * from scope_legacy_aggregates where evenement_id = $1',
        [eventId]
      );
      return result.rows[0] || null;
    },
    async listReglesBascule(){
      const result = await q('select * from scope_regles_bascule');
      return result.rows.map((row) => Object.assign({}, row, { date_bascule: dateOnly(row.date_bascule) }));
    },
    async listParticipationMotifRows(){
      if(!(await tableExists('scope_participation_motifs'))) return [];
      const result = await q('select * from scope_participation_motifs order by display_order, label');
      return result.rows;
    },
    async listParticipationStatusRows(){
      if(!(await tableExists('scope_participation_statuses'))) return [];
      const result = await q('select * from scope_participation_statuses order by display_order, label');
      return result.rows;
    },
    async upsertParticipationStatus(row){
      const result = await q(
        `insert into scope_participation_statuses(status_id, label, base_status, actif, historique, display_order, group_code, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         on conflict (status_id) do update set
           label = excluded.label,
           base_status = excluded.base_status,
           actif = excluded.actif,
           historique = excluded.historique,
           display_order = excluded.display_order,
           group_code = excluded.group_code,
           metadata = scope_participation_statuses.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [
          String(row.status_id || row.id).trim().toUpperCase(),
          row.label || row.libelle,
          String(row.base_status || row.baseStatus || 'PRESENT').trim().toUpperCase(),
          row.actif !== false && row.active !== false,
          row.historique === true || row.historical === true,
          Number(row.display_order || row.order || 999),
          row.group_code || row.group || 'operationnel',
          JSON.stringify(row.metadata || {})
        ]
      );
      return result.rows[0];
    },
    async upsertParticipationMotif(row){
      const result = await q(
        `insert into scope_participation_motifs(motif_id, motif_type, label, actif, historique, display_order, group_code, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         on conflict (motif_id) do update set
           motif_type = excluded.motif_type,
           label = excluded.label,
           actif = excluded.actif,
           historique = excluded.historique,
           display_order = excluded.display_order,
           group_code = excluded.group_code,
           metadata = scope_participation_motifs.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [
          String(row.motif_id || row.id).trim().toUpperCase(),
          String(row.motif_type || row.type || 'EXCUSE').trim().toUpperCase(),
          row.label || row.libelle,
          row.actif !== false && row.active !== false,
          row.historique === true || row.historical === true,
          Number(row.display_order || row.order || 999),
          row.group_code || row.group || 'operationnel',
          JSON.stringify(row.metadata || {})
        ]
      );
      return result.rows[0];
    },
    async listParticipationReferentialUsages(){
      const usages = { statuses: {}, motifs: {}, statusDetails: {}, motifDetails: {} };
      const add = (bucket, detailBucket, id, source, count) => {
        const key = String(id || '').trim().toUpperCase();
        const value = Number(count || 0);
        if(!key || value <= 0) return;
        bucket[key] = Number(bucket[key] || 0) + value;
        detailBucket[key] = Object.assign({}, detailBucket[key] || {}, { [source]: value });
      };
      const addRows = async (sql, params, bucket, detailBucket, source, tableName) => {
        if(tableName && !(await tableExists(tableName))) return;
        const result = await q(sql, params || []);
        for(const row of result.rows || []) add(bucket, detailBucket, row.id, source, row.count);
      };
      await addRows(
        `select upper(statut) as id, count(*)::int as count
         from scope_participations
         where statut is not null and length(trim(statut)) > 0
         group by upper(statut)`,
        [], usages.statuses, usages.statusDetails, 'participations', 'scope_participations'
      );
      await addRows(
        `select upper(motif_absence) as id, count(*)::int as count
         from scope_participations
         where motif_absence is not null and length(trim(motif_absence)) > 0
         group by upper(motif_absence)`,
        [], usages.motifs, usages.motifDetails, 'participations', 'scope_participations'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_participation_policies p,
              lateral jsonb_array_elements_text(coalesce(p.config->'activeStatuses', p.config->'active_statuses', '[]'::jsonb)) as value
         group by upper(value)`,
        [], usages.statuses, usages.statusDetails, 'policies', 'scope_participation_policies'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_participation_policies p,
              lateral jsonb_array_elements_text(
                coalesce(p.config->'excuseMotifs', p.config->'excuse_motifs', '[]'::jsonb)
                || coalesce(p.config->'dispenseMotifs', p.config->'dispense_motifs', '[]'::jsonb)
              ) as value
         group by upper(value)`,
        [], usages.motifs, usages.motifDetails, 'policies', 'scope_participation_policies'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_participation_policy_versions v,
              lateral jsonb_array_elements_text(coalesce(v.config->'activeStatuses', v.config->'active_statuses', '[]'::jsonb)) as value
         group by upper(value)`,
        [], usages.statuses, usages.statusDetails, 'policyVersions', 'scope_participation_policy_versions'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_participation_policy_versions v,
              lateral jsonb_array_elements_text(
                coalesce(v.config->'excuseMotifs', v.config->'excuse_motifs', '[]'::jsonb)
                || coalesce(v.config->'dispenseMotifs', v.config->'dispense_motifs', '[]'::jsonb)
              ) as value
         group by upper(value)`,
        [], usages.motifs, usages.motifDetails, 'policyVersions', 'scope_participation_policy_versions'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_evenements e,
              lateral jsonb_array_elements_text(coalesce(e.participation_policy_snapshot->'activeStatuses', e.participation_policy_snapshot->'active_statuses', '[]'::jsonb)) as value
         where e.participation_policy_snapshot is not null
         group by upper(value)`,
        [], usages.statuses, usages.statusDetails, 'eventSnapshots', 'scope_evenements'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_evenements e,
              lateral jsonb_array_elements_text(
                coalesce(e.participation_policy_snapshot->'excuseMotifs', e.participation_policy_snapshot->'excuse_motifs', '[]'::jsonb)
                || coalesce(e.participation_policy_snapshot->'dispenseMotifs', e.participation_policy_snapshot->'dispense_motifs', '[]'::jsonb)
              ) as value
         where e.participation_policy_snapshot is not null
         group by upper(value)`,
        [], usages.motifs, usages.motifDetails, 'eventSnapshots', 'scope_evenements'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_exercices x,
              lateral jsonb_array_elements_text(coalesce(x.configuration_snapshot->'activeStatuses', x.configuration_snapshot->'active_statuses', '[]'::jsonb)) as value
         where x.configuration_snapshot is not null
         group by upper(value)`,
        [], usages.statuses, usages.statusDetails, 'exerciseSnapshots', 'scope_exercices'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_exercices x,
              lateral jsonb_array_elements_text(
                coalesce(x.configuration_snapshot->'excuseMotifs', x.configuration_snapshot->'excuse_motifs', '[]'::jsonb)
                || coalesce(x.configuration_snapshot->'dispenseMotifs', x.configuration_snapshot->'dispense_motifs', '[]'::jsonb)
              ) as value
         where x.configuration_snapshot is not null
         group by upper(value)`,
        [], usages.motifs, usages.motifDetails, 'exerciseSnapshots', 'scope_exercices'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_event_definition_versions v,
              lateral jsonb_array_elements_text(coalesce(v.metadata->'activeStatuses', v.metadata->'active_statuses', '[]'::jsonb)) as value
         where v.metadata is not null
         group by upper(value)`,
        [], usages.statuses, usages.statusDetails, 'configurations', 'scope_event_definition_versions'
      );
      await addRows(
        `select upper(value) as id, count(*)::int as count
         from scope_event_definition_versions v,
              lateral jsonb_array_elements_text(
                coalesce(v.metadata->'excuseMotifs', v.metadata->'excuse_motifs', '[]'::jsonb)
                || coalesce(v.metadata->'dispenseMotifs', v.metadata->'dispense_motifs', '[]'::jsonb)
              ) as value
         where v.metadata is not null
         group by upper(value)`,
        [], usages.motifs, usages.motifDetails, 'configurations', 'scope_event_definition_versions'
      );
      return usages;
    },
    async listParticipationReferentialUsageDetails(kind, id, options = {}){
      const referentialKind = String(kind || '').toLowerCase() === 'status' ? 'status' : 'motif';
      const key = String(id || '').trim().toUpperCase();
      const includePeople = options.includePeople === true;
      const usage = await this.listParticipationReferentialUsages();
      const sourceCounts = referentialKind === 'status' ? (usage.statusDetails[key] || {}) : (usage.motifDetails[key] || {});
      const result = {
        kind: referentialKind,
        id: key,
        sourceCounts,
        configurations: [],
        policies: [],
        policyVersions: [],
        snapshotEvents: [],
        exerciseSnapshots: [],
        events: [],
        canShowPeople: includePeople,
        peopleRestricted: false
      };
      const arrayExpr = (alias, field) => referentialKind === 'status'
        ? `coalesce(${alias}.${field}->'activeStatuses', ${alias}.${field}->'active_statuses', '[]'::jsonb)`
        : `(coalesce(${alias}.${field}->'excuseMotifs', ${alias}.${field}->'excuse_motifs', '[]'::jsonb)
          || coalesce(${alias}.${field}->'dispenseMotifs', ${alias}.${field}->'dispense_motifs', '[]'::jsonb))`;
      const containsSql = (alias, field) => `exists (select 1 from jsonb_array_elements_text(${arrayExpr(alias, field)}) as value where upper(value) = $1)`;
      if(await tableExists('scope_event_definition_versions') && await tableExists('scope_event_definitions')){
        const rows = await q(
          `select v.definition_version_id, v.version_code, v.valid_from, v.valid_to, v.active,
                  d.domain, d.label as definition_label, d.status as definition_status
           from scope_event_definition_versions v
           join scope_event_definitions d on d.definition_id = v.definition_id
           where v.metadata is not null and ${containsSql('v', 'metadata')}
           order by d.domain, d.label, v.valid_from desc nulls last, v.version_code desc`,
          [key]
        );
        result.configurations = rows.rows.map((row) => ({
          domain: row.domain,
          label: row.definition_label,
          version: row.version_code,
          validFrom: dateOnly(row.valid_from),
          validTo: dateOnly(row.valid_to),
          active: row.active !== false,
          status: row.active === false || row.definition_status === 'ARCHIVE' ? 'historique' : 'active'
        }));
      }
      if(await tableExists('scope_participation_policies')){
        const rows = await q(
          `select domain_code, policy_version, actif, commentaire
           from scope_participation_policies p
           where p.config is not null and ${containsSql('p', 'config')}
           order by domain_code`,
          [key]
        );
        result.policies = rows.rows.map((row) => ({
          domain: row.domain_code,
          version: row.policy_version,
          active: row.actif !== false,
          label: row.commentaire || `Règles ${row.domain_code}`
        }));
      }
      if(await tableExists('scope_participation_policy_versions')){
        const rows = await q(
          `select policy_version_id, policy_code, domain, version_code, valid_from, valid_to, active
           from scope_participation_policy_versions v
           where v.config is not null and ${containsSql('v', 'config')}
           order by domain, policy_code, valid_from desc nulls last, version_code desc`,
          [key]
        );
        result.policyVersions = rows.rows.map((row) => ({
          domain: row.domain,
          policyCode: row.policy_code,
          version: row.version_code,
          validFrom: dateOnly(row.valid_from),
          validTo: dateOnly(row.valid_to),
          active: row.active !== false
        }));
      }
      if(await tableExists('scope_evenements')){
        const rows = await q(
          `select e.evenement_id, e.date, e.libelle, e.domaine_code, e.statut
           from scope_evenements e
           where e.participation_policy_snapshot is not null and ${containsSql('e', 'participation_policy_snapshot')}
           order by e.date desc, e.libelle
           limit 100`,
          [key]
        );
        result.snapshotEvents = rows.rows.map((row) => ({
          eventId: row.evenement_id,
          date: dateOnly(row.date),
          label: row.libelle,
          domain: row.domaine_code,
          status: row.statut
        }));
      }
      if(await tableExists('scope_exercices')){
        const rows = await q(
          `select x.exercice_id, x.annee, x.domaine_code, x.libelle, x.mode_session
           from scope_exercices x
           where x.configuration_snapshot is not null and ${containsSql('x', 'configuration_snapshot')}
           order by x.annee desc nulls last, x.libelle
           limit 100`,
          [key]
        );
        result.exerciseSnapshots = rows.rows.map((row) => ({
          exerciseId: row.exercice_id,
          year: row.annee == null ? null : Number(row.annee),
          label: row.libelle,
          domain: row.domaine_code,
          modeSession: row.mode_session
        }));
      }
      if(await tableExists('scope_participations') && await tableExists('scope_evenements')){
        const where = referentialKind === 'status' ? 'upper(p.statut) = $1' : 'upper(p.motif_absence) = $1';
        if(includePeople && await tableExists('scope_personnes')){
          const rows = await q(
            `select e.evenement_id, e.date, e.libelle, e.domaine_code, e.statut as event_status,
                    p.personne_id, p.statut, p.motif_absence, p.role,
                    sp.nip, sp.grade, sp.nom, sp.prenom
             from scope_participations p
             join scope_evenements e on e.evenement_id = p.evenement_id
             left join scope_personnes sp on sp.id = p.personne_id
             where ${where}
             order by e.date desc, e.libelle, sp.nom, sp.prenom
             limit 300`,
            [key]
          );
          const byEvent = new Map();
          for(const row of rows.rows || []){
            const eventId = row.evenement_id;
            if(!byEvent.has(eventId)){
              byEvent.set(eventId, {
                eventId,
                date: dateOnly(row.date),
                label: row.libelle,
                domain: row.domaine_code,
                status: row.event_status,
                count: 0,
                people: []
              });
            }
            const item = byEvent.get(eventId);
            item.count += 1;
            item.people.push({
              personId: row.personne_id,
              nip: row.nip || '',
              grade: row.grade || '',
              nom: row.nom || '',
              prenom: row.prenom || '',
              status: row.statut,
              motif: row.motif_absence || null,
              role: row.role || 'PARTICIPANT'
            });
          }
          result.events = [...byEvent.values()];
        }else{
          const rows = await q(
            `select e.evenement_id, e.date, e.libelle, e.domaine_code, e.statut, count(*)::int as count
             from scope_participations p
             join scope_evenements e on e.evenement_id = p.evenement_id
             where ${where}
             group by e.evenement_id, e.date, e.libelle, e.domaine_code, e.statut
             order by e.date desc, e.libelle
             limit 100`,
            [key]
          );
          result.events = rows.rows.map((row) => ({
            eventId: row.evenement_id,
            date: dateOnly(row.date),
            label: row.libelle,
            domain: row.domaine_code,
            status: row.statut,
            count: Number(row.count || 0)
          }));
          result.peopleRestricted = rows.rows.some((row) => Number(row.count || 0) > 0);
        }
      }
      return result;
    },
    async getParticipationReferentialUsage(kind, id){
      const usage = await this.listParticipationReferentialUsages();
      const key = String(id || '').trim().toUpperCase();
      if(String(kind || '').toLowerCase() === 'status'){
        return { count: Number(usage.statuses[key] || 0), details: usage.statusDetails[key] || {} };
      }
      return { count: Number(usage.motifs[key] || 0), details: usage.motifDetails[key] || {} };
    },
    async deleteParticipationStatus(statusId){
      if(!(await tableExists('scope_participation_statuses'))) return false;
      const result = await q('delete from scope_participation_statuses where status_id = $1 returning status_id', [String(statusId || '').trim().toUpperCase()]);
      return result.rowCount > 0;
    },
    async deleteParticipationMotif(motifId){
      if(!(await tableExists('scope_participation_motifs'))) return false;
      const result = await q('delete from scope_participation_motifs where motif_id = $1 returning motif_id', [String(motifId || '').trim().toUpperCase()]);
      return result.rowCount > 0;
    },
    async listParticipationPolicyRows(){
      if(!(await tableExists('scope_participation_policies'))) return [];
      const result = await q('select * from scope_participation_policies where actif is not false order by domain_code');
      return result.rows;
    },
    async upsertParticipationPolicy(row){
      const result = await q(
        `insert into scope_participation_policies(domain_code, policy_version, config, actif, commentaire, auteur_id)
         values ($1,$2,$3::jsonb,$4,$5,$6)
         on conflict (domain_code) do update set
           policy_version = excluded.policy_version,
           config = excluded.config,
           actif = excluded.actif,
           commentaire = excluded.commentaire,
           auteur_id = excluded.auteur_id,
           updated_at = now()
         returning *`,
        [
          String(row.domain_code || row.domainCode).trim().toUpperCase(),
          row.policy_version || row.policyVersion,
          JSON.stringify(row.config || row.policy || {}),
          row.actif !== false,
          row.commentaire || null,
          row.auteur_id || null
        ]
      );
      return result.rows[0];
    },
    async listParticipationPolicyVersions(filter = {}){
      if(!(await tableExists('scope_participation_policy_versions'))) return [];
      const clauses = [];
      const params = [];
      if(filter.domain){
        params.push(String(filter.domain).toUpperCase());
        clauses.push(`domain = $${params.length}`);
      }
      if(filter.active !== undefined){
        params.push(filter.active !== false);
        clauses.push(`active = $${params.length}`);
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(`select * from scope_participation_policy_versions ${where} order by domain, policy_code, valid_from desc nulls last, version_code desc`, params);
      return result.rows.map(mapParticipationPolicyVersion);
    },
    async upsertParticipationPolicyVersion(row){
      const result = await q(
        `insert into scope_participation_policy_versions(policy_version_id, policy_code, domain, version_code, valid_from, valid_to, config, active, metadata)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb)
         on conflict (policy_code, version_code) do update set
           domain = excluded.domain,
           valid_from = excluded.valid_from,
           valid_to = excluded.valid_to,
           config = excluded.config,
           active = excluded.active,
           metadata = scope_participation_policy_versions.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [
          row.policy_version_id || row.policyVersionId || randomUUID(),
          row.policy_code || row.policyCode,
          String(row.domain || row.domain_code || row.domainCode).toUpperCase(),
          row.version_code || row.versionCode,
          isoDate(row.valid_from || row.validFrom),
          isoDate(row.valid_to || row.validTo),
          JSON.stringify(row.config || {}),
          row.active !== false && row.actif !== false,
          JSON.stringify(row.metadata || {})
        ]
      );
      return mapParticipationPolicyVersion(result.rows[0]);
    },
    async listEventDefinitions(filter = {}){
      if(!(await tableExists('scope_event_definitions'))) return [];
      const clauses = [];
      const params = [];
      if(filter.domain){
        params.push(String(filter.domain).toUpperCase());
        clauses.push(`d.domain = $${params.length}`);
      }
      if(filter.status){
        params.push(String(filter.status).toUpperCase());
        clauses.push(`d.status = $${params.length}`);
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(`select d.* from scope_event_definitions d ${where} order by d.domain, d.label`, params);
      return result.rows.map(mapEventDefinition);
    },
    async upsertEventDefinition(row){
      const result = await q(
        `insert into scope_event_definitions(definition_id, code, label, domain, description, status, metadata)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb)
         on conflict (code) do update set
           label = excluded.label,
           domain = excluded.domain,
           description = excluded.description,
           status = excluded.status,
           metadata = scope_event_definitions.metadata || excluded.metadata,
           updated_at = now()
         returning *`,
        [
          row.definition_id || row.definitionId || randomUUID(),
          row.code,
          row.label || row.libelle,
          String(row.domain || row.domaine_code || row.domainCode).toUpperCase(),
          row.description || null,
          row.status || 'ACTIF',
          JSON.stringify(row.metadata || {})
        ]
      );
      return mapEventDefinition(result.rows[0]);
    },
    async listEventDefinitionVersions(filter = {}){
      if(!(await tableExists('scope_event_definition_versions'))) return [];
      const clauses = [];
      const params = [];
      if(filter.definitionId){
        params.push(filter.definitionId);
        clauses.push(`v.definition_id = $${params.length}`);
      }
      if(filter.domain){
        params.push(String(filter.domain).toUpperCase());
        clauses.push(`d.domain = $${params.length}`);
      }
      if(filter.active !== undefined){
        params.push(filter.active !== false);
        clauses.push(`v.active = $${params.length}`);
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(
        `select v.*, d.code as definition_code, d.label as definition_label, d.domain, pv.policy_code, pv.version_code as policy_version_code
         from scope_event_definition_versions v
         join scope_event_definitions d on d.definition_id = v.definition_id
         left join scope_participation_policy_versions pv on pv.policy_version_id = v.policy_version_id
         ${where}
         order by d.domain, d.label, v.valid_from desc nulls last, v.version_code desc`,
        params
      );
      return result.rows.map(mapEventDefinitionVersion);
    },
    async countEventsByDefinitionVersions(versionIds = []){
      const ids = (versionIds || []).filter(Boolean);
      if(!ids.length) return {};
      const result = await q(
        `select coalesce(e.definition_version_id, x.definition_version_id) as definition_version_id, count(*)::int as count
         from scope_evenements e
         left join scope_exercices x on x.exercice_id = e.exercice_id
         where coalesce(e.definition_version_id, x.definition_version_id) = any($1::uuid[])
         group by coalesce(e.definition_version_id, x.definition_version_id)`,
        [ids]
      );
      return Object.fromEntries((result.rows || []).map((row) => [row.definition_version_id, Number(row.count || 0)]));
    },
    async listEventsByDefinitionVersions(versionIds = []){
      const ids = (versionIds || []).filter(Boolean);
      if(!ids.length) return {};
      const result = await q(
        `with wanted as (
           select v.definition_version_id, v.version_code, d.code as definition_code
           from scope_event_definition_versions v
           join scope_event_definitions d on d.definition_id = v.definition_id
           where v.definition_version_id = any($1::uuid[])
         ),
         explicit_events as (
           select w.definition_version_id as binding_definition_version_id, e.*, coalesce(e.session_index, s.sequence) as resolved_session_index,
                  coalesce(s.metadata, '{}'::jsonb) as association_metadata
           from wanted w
           join scope_evenements e on e.definition_version_id = w.definition_version_id
           left join scope_multisession_v2_sessions s on s.event_id = e.evenement_id
           union
           select w.definition_version_id as binding_definition_version_id, e.*, coalesce(e.session_index, s.sequence) as resolved_session_index,
                  coalesce(s.metadata, '{}'::jsonb) as association_metadata
           from wanted w
           join scope_exercices x on x.definition_version_id = w.definition_version_id
           join scope_evenements e on e.exercice_id = x.exercice_id
           left join scope_multisession_v2_sessions s on s.event_id = e.evenement_id
           where e.definition_version_id is null
           union
           select w.definition_version_id as binding_definition_version_id, e.*, coalesce(e.session_index, s.sequence) as resolved_session_index,
                  coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object('source','existing_event') as association_metadata
           from wanted w
           join scope_multisessions_v2 ms on ms.code = concat(w.definition_code, '-1-', w.version_code)
           join scope_multisession_v2_sessions s on s.multisession_id = ms.multisession_id
           join scope_evenements e on e.evenement_id = s.event_id
           where e.definition_version_id is null
         )
         select * from explicit_events order by date, resolved_session_index nulls last, libelle`,
        [ids]
      );
      const byVersion = {};
      for(const row of result.rows || []){
        const key = row.binding_definition_version_id;
        if(!byVersion[key]) byVersion[key] = [];
        byVersion[key].push(Object.assign(mapEvent({ ...row, session_index: row.resolved_session_index }), {
          association_metadata: row.association_metadata || {}
        }));
      }
      return byVersion;
    },
    async getEventDefinitionVersion(id){
      if(!(await tableExists('scope_event_definition_versions'))) return null;
      const result = await q(
        `select v.*, d.code as definition_code, d.label as definition_label, d.domain, pv.policy_code, pv.version_code as policy_version_code
         from scope_event_definition_versions v
         join scope_event_definitions d on d.definition_id = v.definition_id
         left join scope_participation_policy_versions pv on pv.policy_version_id = v.policy_version_id
         where v.definition_version_id = $1`,
        [id]
      );
      return mapEventDefinitionVersion(result.rows[0] || null);
    },
    async upsertEventDefinitionVersion(row){
      const result = await q(
        `insert into scope_event_definition_versions(
          definition_version_id, definition_id, version_code, valid_from, valid_to, mode_organisation,
          session_count, policy_version_id, population_rule, numbering_pattern, active, metadata
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb)
        on conflict (definition_id, version_code) do update set
          valid_from = excluded.valid_from,
          valid_to = excluded.valid_to,
          mode_organisation = excluded.mode_organisation,
          session_count = excluded.session_count,
          policy_version_id = excluded.policy_version_id,
          population_rule = excluded.population_rule,
          numbering_pattern = excluded.numbering_pattern,
          active = excluded.active,
          metadata = scope_event_definition_versions.metadata || excluded.metadata,
          updated_at = now()
        returning *`,
        [
          row.definition_version_id || row.definitionVersionId || randomUUID(),
          row.definition_id || row.definitionId,
          row.version_code || row.versionCode,
          isoDate(row.valid_from || row.validFrom),
          isoDate(row.valid_to || row.validTo),
          row.mode_organisation || row.modeOrganisation || 'SIMPLE',
          Number(row.session_count || row.sessionCount || 1),
          row.policy_version_id || row.policyVersionId || null,
          JSON.stringify(row.population_rule || row.populationRule || {}),
          row.numbering_pattern || row.numberingPattern || null,
          row.active !== false && row.actif !== false,
          JSON.stringify(row.metadata || {})
        ]
      );
      return this.getEventDefinitionVersion(result.rows[0].definition_version_id);
    },
    async upsertRegleBascule(row){
      const portee = String(row.portee || (row.cible_id ? 'CIBLE' : (row.domaine_code ? 'DOMAINE' : 'GLOBAL'))).toUpperCase();
      const cibleId = portee === 'CIBLE' ? row.cible_id : null;
      const domaineCode = portee === 'GLOBAL' ? null : (row.domaine_code || null);
      let existing;
      if(portee === 'CIBLE'){
        existing = await q(
          `select * from scope_regles_bascule where portee = 'CIBLE' and cible_id = $1`,
          [cibleId]
        );
      }else if(portee === 'DOMAINE'){
        existing = await q(
          `select * from scope_regles_bascule where portee = 'DOMAINE' and domaine_code = $1`,
          [row.domaine_code]
        );
      }else{
        existing = await q(`select * from scope_regles_bascule where portee = 'GLOBAL'`);
      }
      if(existing.rows[0]){
        const result = await q(
          `update scope_regles_bascule
           set date_bascule = $2, commentaire = $3, domaine_code = $4, updated_at = now()
           where regle_id = $1 returning *`,
          [existing.rows[0].regle_id, isoDate(row.date_bascule), row.commentaire || null, domaineCode]
        );
        return result.rows[0];
      }
      const result = await q(
        `insert into scope_regles_bascule(portee, cible_id, domaine_code, date_bascule, commentaire)
         values ($1,$2,$3,$4,$5) returning *`,
        [portee, cibleId, domaineCode, isoDate(row.date_bascule), row.commentaire || null]
      );
      return result.rows[0];
    },
    async insertImport(row){
      const id = row.import_id || randomUUID();
      const result = await q(
        `insert into scope_imports(
           import_id, source_filename, source_sha256, imported_par, statut, nb_lignes, rapport
         ) values ($1,$2,$3,$4,$5,$6,$7::jsonb) returning *`,
        [
          id, row.source_filename || null, row.source_sha256 || null, row.imported_par || null,
          row.statut || 'COMMITE', row.nb_lignes || 0, JSON.stringify(row.rapport || null)
        ]
      );
      return result.rows[0];
    },
    async insertImportLigne(row){
      const result = await q(
        `insert into scope_import_lignes(
           import_id, ligne_no, fingerprint, statut, type_propose,
           evenement_id, legacy_id, payload_source, raison, action
         ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) returning *`,
        [
          row.import_id, row.ligne_no, row.fingerprint, row.statut, row.type_propose || null,
          row.evenement_id || null, row.legacy_id || null,
          JSON.stringify(row.payload_source || null), row.raison || null, row.action || null
        ]
      );
      return result.rows[0];
    },
    async bulkInsertImportLignes(rows){
      const list = rows || [];
      if(!list.length) return [];
      const result = await q(
        `insert into scope_import_lignes(
           import_id, ligne_no, fingerprint, statut, type_propose,
           evenement_id, legacy_id, payload_source, raison, action
         )
         select import_id, ligne_no, fingerprint, statut, type_propose,
                evenement_id, legacy_id, payload_source, raison, action
         from jsonb_to_recordset($1::jsonb) as x(
           import_id uuid,
           ligne_no integer,
           fingerprint text,
           statut text,
           type_propose text,
           evenement_id uuid,
           legacy_id uuid,
           payload_source jsonb,
           raison text,
           action text
         )
         returning *`,
        [JSON.stringify(list.map((row) => ({
          import_id: row.import_id,
          ligne_no: row.ligne_no,
          fingerprint: row.fingerprint,
          statut: row.statut,
          type_propose: row.type_propose || null,
          evenement_id: row.evenement_id || null,
          legacy_id: row.legacy_id || null,
          payload_source: row.payload_source || null,
          raison: row.raison || null,
          action: row.action || null
        })))]
      );
      return result.rows;
    },
    async listImportedFingerprints(){
      const result = await q(
        `select fingerprint from scope_import_lignes where statut = 'IMPORTE'`
      );
      return result.rows.map((r) => r.fingerprint);
    },
    async nextManualEventSequence(){
      const result = await q(`
        select coalesce(max((substring(code_cours from 'S([0-9]+)$'))::int), 0) + 1 as next
        from scope_evenements
        where code_cours ~ 'S[0-9]+$'
      `);
      return Number(result.rows[0]?.next || 1);
    },
    async deleteEventIfNoDependencies(eventId){
      const deps = await q(`
        select
          (select count(*)::int from scope_attendus where evenement_id = $1) as attendus,
          (select count(*)::int from scope_participations where evenement_id = $1) as participations
      `, [eventId]);
      if(Number(deps.rows[0].attendus || 0) > 0 || Number(deps.rows[0].participations || 0) > 0){
        return { deleted: false, reason: 'dependencies' };
      }
      await q('delete from scope_evenement_cibles where evenement_id = $1', [eventId]);
      const result = await q('delete from scope_evenements where evenement_id = $1 returning *', [eventId]);
      return { deleted: Boolean(result.rows[0]), event: mapEvent(result.rows[0] || null) };
    },
    async countTable(name){
      const allowed = new Set([
        'scope_personnes', 'scope_evenements', 'scope_attendus', 'scope_participations',
        'scope_legacy_aggregates', 'scope_imports', 'scope_import_lignes', 'scope_saisies_quantitatives',
        'scope_objectifs', 'scope_alertes_acquittements'
      ]);
      if(!allowed.has(name)) return 0;
      const result = await q(`select count(*)::int as n from ${name}`);
      return result.rows[0].n;
    },
    async appendJournal(row){
      const result = await q(
        `insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, avant, apres, commentaire)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) returning *`,
        [
          randomUUID(), row.auteur_id || null, row.entite, String(row.entite_id), row.action,
          JSON.stringify(row.avant || null), JSON.stringify(row.apres || null), row.commentaire || null
        ]
      );
      return result.rows[0];
    },
    async getQuantitatifSaisie(eventId){
      const result = await q('select * from scope_saisies_quantitatives where evenement_id = $1', [eventId]);
      return result.rows[0] || null;
    },
    async listQuantitatifSaisiesForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q(
        'select * from scope_saisies_quantitatives where evenement_id = any($1::uuid[])',
        [ids]
      );
      return result.rows;
    },
    async listAcquittementsByUser(utilisateurId){
      const result = await q(
        'select * from scope_alertes_acquittements where utilisateur_id = $1',
        [String(utilisateurId)]
      );
      return result.rows;
    },
    async upsertAcquittement(row){
      const result = await q(
        `insert into scope_alertes_acquittements(
           acquittement_id, fingerprint, code, entity_type, entity_id, utilisateur_id, commentaire
         ) values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (utilisateur_id, fingerprint) do update set
           commentaire = excluded.commentaire,
           created_at = now()
         returning *`,
        [
          row.acquittement_id || randomUUID(),
          row.fingerprint,
          row.code,
          row.entity_type,
          row.entity_id,
          row.utilisateur_id,
          row.commentaire || null
        ]
      );
      return result.rows[0];
    },
    async upsertQuantitatifSaisie(row){
      const result = await q(
        `insert into scope_saisies_quantitatives(
           evenement_id, nb_attendus, nb_presents, nb_excuses, nb_non_excuses, nb_dispenses, auteur_id,
           nb_excuses_prive, nb_excuses_professionnel, nb_excuses_armee, nb_excuses_accident_maladie,
           nb_excuses_non_precise, nb_permutations
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (evenement_id) do update set
           nb_attendus = excluded.nb_attendus,
           nb_presents = excluded.nb_presents,
           nb_excuses = excluded.nb_excuses,
           nb_non_excuses = excluded.nb_non_excuses,
           nb_dispenses = excluded.nb_dispenses,
           auteur_id = excluded.auteur_id,
           nb_excuses_prive = excluded.nb_excuses_prive,
           nb_excuses_professionnel = excluded.nb_excuses_professionnel,
           nb_excuses_armee = excluded.nb_excuses_armee,
           nb_excuses_accident_maladie = excluded.nb_excuses_accident_maladie,
           nb_excuses_non_precise = excluded.nb_excuses_non_precise,
           nb_permutations = excluded.nb_permutations,
           updated_at = now()
         returning *`,
        [
          row.evenement_id,
          row.nb_attendus,
          row.nb_presents,
          row.nb_excuses,
          row.nb_non_excuses,
          row.nb_dispenses,
          row.auteur_id || null,
          Number(row.nb_excuses_prive || 0),
          Number(row.nb_excuses_professionnel || 0),
          Number(row.nb_excuses_armee || 0),
          Number(row.nb_excuses_accident_maladie || 0),
          Number(row.nb_excuses_non_precise || 0),
          Number(row.nb_permutations || 0)
        ]
      );
      return result.rows[0];
    },
    async deleteQuantitatifSaisie(eventId){
      await q('delete from scope_saisies_quantitatives where evenement_id = $1', [eventId]);
    },
    async listObjectifs({ actif } = {}){
      const result = actif === undefined
        ? await q('select * from scope_objectifs order by date_debut, portee')
        : await q('select * from scope_objectifs where actif = $1 order by date_debut, portee', [Boolean(actif)]);
      return result.rows.map(mapObjectif);
    },
    async getObjectif(id){
      const result = await q('select * from scope_objectifs where objectif_id = $1', [id]);
      return mapObjectif(result.rows[0] || null);
    },
    async insertObjectif(row){
      const result = await q(
        `insert into scope_objectifs(
           objectif_id, portee, domaine_code, cible_id, date_debut, date_fin, seuil_pct, actif, commentaire
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [
          row.objectif_id,
          row.portee,
          row.domaine_code || null,
          row.cible_id || null,
          isoDate(row.date_debut),
          isoDate(row.date_fin),
          row.seuil_pct,
          row.actif !== false,
          row.commentaire || null
        ]
      );
      return mapObjectif(result.rows[0]);
    },
    async updateObjectif(id, patch){
      const current = await api.getObjectif(id);
      if(!current) return null;
      const next = { ...current, ...patch };
      const result = await q(
        `update scope_objectifs set
           portee = $2,
           domaine_code = $3,
           cible_id = $4,
           date_debut = $5,
           date_fin = $6,
           seuil_pct = $7,
           actif = $8,
           commentaire = $9,
           updated_at = now()
         where objectif_id = $1
         returning *`,
        [
          id,
          next.portee,
          next.domaine_code || null,
          next.cible_id || null,
          isoDate(next.date_debut),
          isoDate(next.date_fin),
          next.seuil_pct,
          next.actif !== false,
          next.commentaire || null
        ]
      );
      return mapObjectif(result.rows[0]);
    },
    async deleteObjectif(id){
      await q('delete from scope_objectifs where objectif_id = $1', [id]);
    },
    async loadAnalyticsBundle({ from, to, domaineCode, cibleId, evenementId, personneId } = {}){
      const clauses = ['e.date >= $1::date', 'e.date <= $2::date'];
      const params = [from, to];
      let i = 3;
      if(domaineCode){
        clauses.push(`e.domaine_code = $${i}`);
        params.push(domaineCode);
        i += 1;
      }
      if(evenementId){
        clauses.push(`e.evenement_id = $${i}`);
        params.push(evenementId);
        i += 1;
      }
      if(cibleId){
        clauses.push(`exists (select 1 from scope_evenement_cibles x where x.evenement_id = e.evenement_id and x.cible_id = $${i})`);
        params.push(cibleId);
        i += 1;
      }
      if(personneId){
        clauses.push(`coalesce(e.mode_suivi, case when e.origine = 'LEGACY_AGGREGATED' then 'LEGACY' else 'NOMINATIF' end) = 'NOMINATIF'`);
        clauses.push(`exists (select 1 from scope_attendus a where a.evenement_id = e.evenement_id and a.personne_id = $${i} and a.inclus is not false)`);
        params.push(personneId);
        i += 1;
      }
      const eventsRes = await q(
        `select ${EVENT_SELECT} from scope_evenements e left join scope_exercices x on x.exercice_id = e.exercice_id where ${clauses.join(' and ')} order by e.date, e.libelle`,
        params
      );
      const events = eventsRes.rows.map(mapEvent);
      const ids = events.map((event) => event.evenement_id);
      const bundle = {
        events: [],
        attendusByEvent: {},
        participationsByEvent: {},
        cibleIdsByEvent: {},
        legacyByEvent: {},
        quantitatifByEvent: {},
        personneId: personneId || null
      };
      if(!ids.length) return bundle;
      const [ciblesRes, attendusRes, partsRes, legacyRes, qtyRes] = await Promise.all([
        q('select evenement_id, cible_id from scope_evenement_cibles where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_attendus where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_participations where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_legacy_aggregates where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_saisies_quantitatives where evenement_id = any($1::uuid[])', [ids])
      ]);
      for(const row of ciblesRes.rows){
        if(!bundle.cibleIdsByEvent[row.evenement_id]) bundle.cibleIdsByEvent[row.evenement_id] = [];
        bundle.cibleIdsByEvent[row.evenement_id].push(row.cible_id);
      }
      for(const row of attendusRes.rows){
        if(!bundle.attendusByEvent[row.evenement_id]) bundle.attendusByEvent[row.evenement_id] = [];
        bundle.attendusByEvent[row.evenement_id].push(row);
      }
      for(const row of partsRes.rows){
        if(!bundle.participationsByEvent[row.evenement_id]) bundle.participationsByEvent[row.evenement_id] = [];
        bundle.participationsByEvent[row.evenement_id].push(row);
      }
      for(const row of legacyRes.rows){
        let payload = row.payload_v67;
        if(typeof payload === 'string'){
          try { payload = JSON.parse(payload); } catch { payload = {}; }
        }
        bundle.legacyByEvent[row.evenement_id] = {
          ...row,
          date: dateOnly(row.date),
          payload_v67: payload || {}
        };
      }
      for(const row of qtyRes.rows){
        bundle.quantitatifByEvent[row.evenement_id] = row;
      }
      for(const event of events){
        bundle.events.push({ ...event, cible_ids: bundle.cibleIdsByEvent[event.evenement_id] || [] });
        bundle.attendusByEvent[event.evenement_id] = bundle.attendusByEvent[event.evenement_id] || [];
        bundle.participationsByEvent[event.evenement_id] = bundle.participationsByEvent[event.evenement_id] || [];
        bundle.legacyByEvent[event.evenement_id] = bundle.legacyByEvent[event.evenement_id] || null;
        bundle.quantitatifByEvent[event.evenement_id] = bundle.quantitatifByEvent[event.evenement_id] || null;
      }
      return bundle;
    },
    async listJournal(entite, entiteId){
      const result = await q(
        'select * from scope_journal_metier where entite = $1 and entite_id = $2 order by at',
        [entite, String(entiteId)]
      );
      return result.rows;
    }
  };
  return api;
}

async function getPgRepo(){
  await ensureScopeSchema();
  return createPgRepo(null);
}

module.exports = { createPgRepo, getPgRepo };

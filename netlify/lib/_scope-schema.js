const { randomUUID } = require('crypto');
const db = require('./_postgres');
const qvLieux = require('./_scope-quo-vadis-lieux');
const qvReferentials = require('./_scope-quo-vadis-referentials');
const canonicalFoundations = require('./_scope-canonical-foundations');
const publicFoundations = require('./_scope-public-foundations');
const personQualifications = require('./_scope-person-qualifications');
const personQualificationDdl = require('./_scope-person-qualifications-ddl');
const annualCatalogDdl = require('./_scope-annual-catalog-ddl');
const catalogConvergenceDdl = require('./_scope-catalog-convergence-ddl');
const annualThemeDdl = require('./_scope-annual-theme-ddl');
const annualCatalogImportDdl = require('./_scope-annual-catalog-import-ddl');
const statComReferential = require('./_scope-statcom-referential');

const DOMAINES = [
  { code: 'DPS', libelle: 'Défense incendie et protection contre les sinistres' },
  { code: 'DAP', libelle: 'Détachement d’appui' },
  { code: 'JSP', libelle: 'Jeunes sapeurs-pompiers' },
  { code: 'FOBA', libelle: 'Formation de base' },
  { code: 'FOCO', libelle: 'Formation continue' },
  { code: 'FOCA', libelle: 'Formation des cadres' },
  { code: 'FOSPEC', libelle: 'Formations spéciales' },
  { code: 'PR', libelle: 'Premiers secours' },
  { code: 'AUTO', libelle: 'Automobile' }
];

const DOMAINES_MODEL_2 = {
  FOBA: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'FOBA' },
  FOCA: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'FOCA' },
  DPS: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'DPS' },
  DAP: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'DAP' },
  PR: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'PR', libelle: 'Protection respiratoire' },
  AUTO: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'AUTO' },
  FOSPEC: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'FOSPEC' },
  JSP: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'JSP' }
};

const SOUS_DOMAINES = [
  { code: 'PR', domaineParent: 'FOSPEC', libelle: 'Protection respiratoire', libelleAffiche: 'PAPR' },
  { code: 'AUTO', domaineParent: 'FOSPEC', libelle: 'Automobile', libelleAffiche: 'AUTO' }
];

const CIBLES = [
  ['FOBA', '1', 'FOBA 1'],
  ['FOBA', '2', 'FOBA 2'],
  ['FOBA', '3', 'FOBA 3'],
  ['FOCO', 'DPS', 'DPS'],
  ['FOCO', 'DAP', 'DAP'],
  ['FOCO', 'JSP', 'JSP'],
  ['FOCA', 'GEN', 'FOCA'],
  ['DPS', 'GEN', 'DPS'],
  ['DPS', 'G1', 'DPS G1'],
  ['DPS', 'C1', 'DPS C1'],
  ['DPS', 'B1', 'DPS B1'],
  ['DPS', 'B2', 'DPS B2'],
  ['DAP', 'GEN', 'DAP'],
  ['DAP', 'Y1', 'DAP Y1'],
  ['DAP', 'Y2', 'DAP Y2'],
  ['DAP', 'Y3', 'DAP Y3'],
  ['DAP', 'Y4', 'DAP Y4'],
  ['PR', 'G1', 'PAPR G1'],
  ['PR', 'C1', 'PAPR C1'],
  ['PR', 'B1', 'PAPR B1'],
  ['PR', 'B2', 'PAPR B2'],
  ['PR', 'GEN', 'PAPR GEN'],
  ['PR', 'PAPR', 'PAPR'],
  ['PR', 'ABC', 'PR-ABC'],
  ['AUTO', 'VL', 'AUTO VL'],
  ['AUTO', 'PL', 'AUTO PL'],
  ['AUTO', 'TP9', 'cond TP9'],
  ['AUTO', 'GRUTIER', 'Grutier'],
  ['AUTO', 'MEA', 'MEA'],
  ['AUTO', 'BAT', 'Pilote BAT'],
  ['FOSPEC', 'GEN', 'FOSPEC'],
  ['JSP', 'G1', 'JSP G1'],
  ['JSP', 'C1', 'JSP C1'],
  ['JSP', 'B1', 'JSP B1'],
  ['JSP', 'CAD', 'JSP CAD'],
  ['JSP', 'GEN', 'JSP GEN']
];

const DDL = [
  `create table if not exists scope_domaines (
    code text primary key,
    libelle text not null,
    actif boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_domaines_code_chk check (code in ('FOBA','FOCO','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP'))
  )`,
  `create table if not exists scope_cibles (
    cible_id uuid primary key,
    domaine_code text not null references scope_domaines(code),
    niveau_code text not null,
    libelle text not null,
    actif boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_cibles_unique unique (domaine_code, niveau_code)
  )`,
  `create table if not exists scope_personnes (
    id text primary key,
    nip text not null unique,
    grade text,
    nom text,
    prenom text,
    date_entree_sdis date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
  )`,
  `create table if not exists scope_affectations (
    id text primary key,
    personne_id text not null references scope_personnes(id),
    categorie text not null,
    domaine text not null,
    cible text not null,
    role_domaine text,
    date_actif date not null,
    date_inactif date,
    source_import_batch_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_affectations_dates_chk check (date_inactif is null or date_actif <= date_inactif)
  )`,
  `create unique index if not exists scope_affectations_open_unique
    on scope_affectations (personne_id, categorie, domaine, cible, coalesce(role_domaine, '')) where date_inactif is null`,
  `create index if not exists scope_affectations_scope
    on scope_affectations (domaine, cible, role_domaine, date_actif, date_inactif)`,
  `create index if not exists scope_affectations_personne_scope
    on scope_affectations (personne_id, domaine, cible, date_actif)`,
  `create table if not exists scope_evenements (
    evenement_id uuid primary key,
    date date not null,
    domaine_code text not null references scope_domaines(code),
    libelle text not null,
    statut text not null,
    origine text not null default 'NOMINATIF',
    population_figee boolean not null default false,
    population_version integer not null default 0,
    figee_at timestamptz,
    figee_par text,
    cloture_at timestamptz,
    cloture_par text,
    version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_evenements_statut_chk check (statut in ('PLANIFIE','REALISE','REPORTE','ANNULE')),
    constraint scope_evenements_origine_chk check (origine in ('NOMINATIF','LEGACY_AGGREGATED')),
    constraint scope_evenements_libelle_chk check (length(trim(libelle)) > 0),
    constraint scope_evenements_version_chk check (version >= 1)
  )`,
  `create index if not exists scope_evenements_date_statut_domaine
    on scope_evenements (date, statut, domaine_code)`,
  `create table if not exists scope_evenement_cibles (
    evenement_id uuid not null references scope_evenements(evenement_id),
    cible_id uuid not null references scope_cibles(cible_id),
    primary key (evenement_id, cible_id)
  )`,
  `create table if not exists scope_attendus (
    evenement_id uuid not null references scope_evenements(evenement_id),
    personne_id text not null references scope_personnes(id),
    inclus boolean not null default true,
    origine text not null,
    origine_retrait text,
    motif_inclusion text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (evenement_id, personne_id),
    constraint scope_attendus_origine_chk check (origine in ('REGLE','EXCEPTION_AJOUT')),
    constraint scope_attendus_retrait_chk check (
      origine_retrait is null
      or origine_retrait in (
        'EXCEPTION_RETRAIT',
        'NON_ASSIGNE',
        'PERMUTATION_SOURCE_CORRIGEE',
        'RESET_SAISIE',
        'SUPPRESSION_METIER',
        'DESASSIGNATION',
        'INDISPONIBLE'
      )
    )
  )`,
  `create index if not exists scope_attendus_evenement on scope_attendus (evenement_id)`,
  `create table if not exists scope_participations (
    evenement_id uuid not null references scope_evenements(evenement_id),
    personne_id text not null references scope_personnes(id),
    statut text not null,
    motif_absence text,
    commentaire text,
    role text not null default 'PARTICIPANT',
    source text not null default 'SAISIE',
    auteur_id text,
    creation_dl boolean default false,
    preparation_dl_minutes integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (evenement_id, personne_id),
    constraint scope_participations_statut_chk check (statut in (
      'NON_RENSEIGNE','PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_CONCERNE'
    )),
    constraint scope_participations_role_chk check (role in (
      'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE','RENFORT','REMPLACANT'
    )),
    constraint scope_participations_motif_chk check (
      statut <> 'ABSENT_EXCUSE' or motif_absence is not null
    ),
    constraint scope_participations_motif_val_chk check (
      motif_absence is null or motif_absence in ('MALADIE','ACCIDENT','ARMEE','PROFESSIONNEL','PRIVE','AUTRE','ACCIDENT_MALADIE','NON_PRECISE','ACTIVITE_SCOLAIRE','ACTIVITE_EXTRA_SCOLAIRE','OUBLI','NON_JUSTIFIE')
    ),
    constraint scope_participations_autre_chk check (
      motif_absence is distinct from 'AUTRE'
      or (commentaire is not null and length(trim(commentaire)) > 0)
    ),
    constraint scope_participations_preparation_dl_chk check (
      preparation_dl_minutes is null or preparation_dl_minutes >= 0
    )
  )`,
  `create index if not exists scope_participations_evenement_statut
    on scope_participations (evenement_id, statut)`,
  `create index if not exists scope_participations_personne
    on scope_participations (personne_id)`,
  `create table if not exists scope_legacy_aggregates (
    legacy_id uuid primary key,
    source_record_id text,
    date date not null,
    domaine_code text not null references scope_domaines(code),
    libelle text,
    nb_convoques integer,
    nb_presents integer,
    nb_excuses integer,
    nb_absents integer,
    payload_v67 jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists scope_journal_metier (
    journal_id uuid primary key,
    at timestamptz not null default now(),
    auteur_id text,
    entite text not null,
    entite_id text not null,
    action text not null,
    avant jsonb,
    apres jsonb,
    commentaire text
  )`,
  `create index if not exists scope_journal_entite
    on scope_journal_metier (entite, entite_id, at desc)`,
  `create table if not exists scope_regles_bascule (
    regle_id uuid primary key default gen_random_uuid(),
    portee text not null,
    cible_id uuid references scope_cibles(cible_id),
    domaine_code text references scope_domaines(code),
    date_bascule date not null,
    commentaire text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_regles_bascule_portee_chk check (portee in ('CIBLE','DOMAINE','GLOBAL')),
    constraint scope_regles_bascule_shape_chk check (
      (portee = 'CIBLE' and cible_id is not null)
      or (portee = 'DOMAINE' and domaine_code is not null and cible_id is null)
      or (portee = 'GLOBAL' and cible_id is null and domaine_code is null)
    )
  )`,
  `create table if not exists scope_imports (
    import_id uuid primary key,
    source_filename text,
    source_sha256 text,
    imported_at timestamptz not null default now(),
    imported_par text,
    statut text not null,
    nb_lignes integer not null default 0,
    rapport jsonb,
    constraint scope_imports_statut_chk check (statut in ('COMMITE','REFUSE','PARTIEL'))
  )`,
  `create table if not exists scope_import_lignes (
    import_id uuid not null references scope_imports(import_id),
    ligne_no integer not null,
    fingerprint text not null,
    statut text not null,
    type_propose text,
    evenement_id uuid references scope_evenements(evenement_id),
    legacy_id uuid references scope_legacy_aggregates(legacy_id),
    payload_source jsonb,
    raison text,
    action text,
    primary key (import_id, ligne_no),
    constraint scope_import_lignes_statut_chk check (statut in (
      'IMPORTE','IGNORE','ERREUR','DEJA_IMPORTE','EXCLU'
    ))
  )`,
  `create unique index if not exists scope_import_lignes_fingerprint_imported
    on scope_import_lignes (fingerprint) where statut = 'IMPORTE'`,
  `alter table scope_legacy_aggregates add column if not exists evenement_id uuid references scope_evenements(evenement_id)`,
  `alter table scope_legacy_aggregates add column if not exists fingerprint text`
];

const LATEST_SCOPE_SCHEMA_VERSION = 'scope-annual-catalog-themes-c8-b';
const SCOPE_SCHEMA_LOCK_KEY = 671902270;
let ready = false;
let readyPromise = null;

async function hasMigration(version){
  const result = await db.query('select 1 from monitoring_f7_schema_migrations where version = $1 limit 1', [version]);
  return Boolean(result.rows && result.rows[0]);
}

async function withSchemaLock(callback){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [SCOPE_SCHEMA_LOCK_KEY]);
    return callback();
  });
}

async function ensureScopeSchema(){
  if(ready) return true;
  if(readyPromise) return readyPromise;
  readyPromise = (async () => {
  await db.ensureCoreSchema();
  if(await hasMigration(LATEST_SCOPE_SCHEMA_VERSION)){
    ready = true;
    return true;
  }
  if(await hasMigration('scope-person-qualifications-c3-b')){
    // Canonical C1-C5 migrations are operator-run and never applied from user traffic.
    ready = true;
    return true;
  }
  if(await hasMigration('scope-quo-vadis-referential-management-4')){
    ready = true;
    return true;
  }
  if(await hasMigration('scope-referentiel-cursus-taxonomie-2')){
    await migrateQuoVadisReferentialManagement4();
    ready = true;
    return true;
  }
  return await withSchemaLock(async () => {
  if(await hasMigration(LATEST_SCOPE_SCHEMA_VERSION)){
    ready = true;
    return true;
  }
  for(const sql of DDL){
    await db.query(sql);
  }
  await db.query(`alter table scope_domaines drop constraint if exists scope_domaines_code_chk`);
  await db.query(`alter table scope_domaines add constraint scope_domaines_code_chk check (code in ('FOBA','FOCO','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP'))`);
  for(const domaine of DOMAINES){
    await db.query(
      `insert into scope_domaines(code, libelle, actif) values ($1,$2,true)
       on conflict (code) do update set libelle = excluded.libelle, updated_at = now()`,
      [domaine.code, domaine.libelle]
    );
  }
  for(const [domaine, niveau, libelle] of CIBLES){
    await db.query(
      `insert into scope_cibles(cible_id, domaine_code, niveau_code, libelle, actif)
       values ($1,$2,$3,$4,true)
       on conflict (domaine_code, niveau_code) do nothing`,
      [randomUUID(), domaine, niveau, libelle]
    );
  }
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-impl-1a') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-data-5') on conflict (version) do nothing`
  );
  await migrateReglesBasculeR1();
  await seedBasculeDapY4();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-data-5-r1') on conflict (version) do nothing`
  );
  await migrateModeSuiviAnalytics1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-analytics-1') on conflict (version) do nothing`
  );
  await migrateEventQ1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-event-q1') on conflict (version) do nothing`
  );
  await migrateObjectives1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-objectives-1') on conflict (version) do nothing`
  );
  await migrateAlerts1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-alerts-1') on conflict (version) do nothing`
  );
  await migrateModel2();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-model-2') on conflict (version) do nothing`
  );
  await migrateModel2R1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-model-2-r1') on conflict (version) do nothing`
  );
  await migrateEventImport1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-event-import-1') on conflict (version) do nothing`
  );
  await migrateEventStandard1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-event-std-1') on conflict (version) do nothing`
  );
  /* scope-qual-finish-1 — pas de migration : filtre qualification applicatif */
  await migratePersonnelImportPopulations1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-personnel-import-populations-1') on conflict (version) do nothing`
  );
  await migrateJspGradeModelFix1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-jsp-grade-model-fix-1') on conflict (version) do nothing`
  );
  await migrateSpecialisationCyclesArch1();
  await migrateGenericExerciseSessions1();
  await migrateMetierActivation3();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-specialisation-cycles-arch-1') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-generic-exercise-sessions-1') on conflict (version) do nothing`
  );
  await migrateParticipationPolicyEngine1();
  await migrateConfigurationFormationUxReferentialsFinish5();
  await migrateConfigurationReferentialsLifecycleRepair51();
  await migrateGenericEventSessionPolicyArchitecture1();
  await migrateMultiSessionV2Foundation1();
  await migrateEventTemporalConfigurationFoundation9();
  await migrateEventPopulationTimeStaffingWorkflowClose10();
  await migrateEventWorkflowAssignmentStaffingSemanticRepair101();
  await migrateEventAssignedPopulationPolicyStaffingClose102();
  await migrateEventAssignedPopulationReactivationDeleteFinal103();
  await migrateParticipantSelectionRuntimeRootRepair1031();
  await migrateAttendusRetraitSchemaContractRepair1032();
  await migrateCancelledEventSingleSourceOfTruth11();
  await migrateStatComReferentialConfig1();
  await migrateStatComSpecialisationPersistenceRepair2();
  await migrateQuoVadisCore1();
  await migrateQuoVadisPilotage2();
  await migrateQuoVadisCoverage1();
  await migrateQuoVadisMoaRecovery1();
  await migrateQuoVadisAgendaUx2();
  await migrateQuoVadisToutesActivitesUx1();
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-configuration-formation-ux-referentials-finish-5') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-configuration-referentials-lifecycle-repair-5-1') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-event-temporal-configuration-foundation-9') on conflict (version) do nothing`
  );
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-referentiel-cursus-taxonomie-2') on conflict (version) do nothing`);
  await migrateQuoVadisReferentialManagement4();
  // The historical bootstrap stops here. Canonical C1-C5 migrations require an
  // explicit operator action and are guarded by the read-only readiness check.
  ready = true;
  return true;
  });
  })();
  try{
    return await readyPromise;
  }finally{
    readyPromise = null;
  }
}

async function migrateQuoVadisReferentialManagement4(){
  return db.transaction(async (client) => {
  await client.query('select pg_advisory_xact_lock($1)', [671902274]);
  const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version = 'scope-quo-vadis-referential-management-4'`);
  if(done.rows[0]) return;
  await client.query(`alter table scope_quo_vadis_cursus_definitions
    add column if not exists domain_code text references scope_domaines(code),
    add column if not exists cible_id uuid references scope_cibles(cible_id),
    add column if not exists duration_months integer`);
  await client.query(`alter table scope_quo_vadis_cursus_steps
    add column if not exists duration_minutes integer,
    add column if not exists lieu_id uuid references scope_lieux(lieu_id),
    add column if not exists cible_id uuid references scope_cibles(cible_id),
    add column if not exists preferred_month integer,
    add column if not exists active boolean not null default true`);
  await client.query(`alter table scope_quo_vadis_planning_rules add column if not exists cible_id uuid references scope_cibles(cible_id)`);
  for(const [table, name, expression] of [
    ['scope_quo_vadis_cursus_definitions','scope_qv_cursus_duration_months_chk','duration_months is null or duration_months > 0'],
    ['scope_quo_vadis_cursus_steps','scope_qv_cursus_step_duration_minutes_chk','duration_minutes is null or duration_minutes > 0'],
    ['scope_quo_vadis_cursus_steps','scope_qv_cursus_step_preferred_month_chk','preferred_month is null or preferred_month between 1 and 12']
  ]){
    const exists = await client.query(`select 1 from pg_constraint where conname = $1`, [name]);
    if(!exists.rows[0]) await client.query(`alter table ${table} add constraint ${name} check (${expression})`);
  }
  for(const table of ['scope_quo_vadis_cursus_definitions','scope_quo_vadis_cursus_steps','scope_quo_vadis_planning_rules']){
    await client.query(`alter table ${table} enable row level security`);
    for(const role of ['anon','authenticated']){
      const exists = await client.query(`select 1 from pg_roles where rolname = $1`, [role]);
      if(exists.rows[0]) await client.query(`revoke all on ${table} from ${role}`);
    }
  }
  await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-referential-management-4') on conflict (version) do nothing`);
  });
}

async function migrateCanonicalFoundationsC1(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902275]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version = 'scope-canonical-foundations-c1'`);
    if(done.rows[0]) return;
    const ddl = [
      `create table if not exists scope_ois (
        oi_id uuid primary key default gen_random_uuid(), code text not null unique, libelle text not null,
        actif boolean not null default true, sort_order integer not null default 100,
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_ois_code_chk check (length(trim(code)) > 0), constraint scope_ois_libelle_chk check (length(trim(libelle)) > 0))`,
      `create table if not exists scope_domaine_ois (
        domaine_oi_id uuid primary key default gen_random_uuid(), domaine_code text not null references scope_domaines(code),
        oi_id uuid not null references scope_ois(oi_id), valid_from date not null default date '1900-01-01', valid_to date,
        actif boolean not null default true, metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_domaine_ois_dates_chk check (valid_to is null or valid_from <= valid_to),
        constraint scope_domaine_ois_unique unique (domaine_code, oi_id, valid_from))`,
      `create index if not exists scope_domaine_ois_active_idx on scope_domaine_ois(domaine_code, oi_id, valid_from, valid_to) where actif is true`,
      `create table if not exists scope_pr_parcours (
        parcours_id uuid primary key default gen_random_uuid(), code text not null unique, libelle text not null,
        actif boolean not null default true, sort_order integer not null default 100,
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_pr_parcours_code_chk check (length(trim(code)) > 0), constraint scope_pr_parcours_libelle_chk check (length(trim(libelle)) > 0))`,
      `create table if not exists scope_pr_parcours_aliases (
        alias text primary key, parcours_id uuid not null references scope_pr_parcours(parcours_id),
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
        constraint scope_pr_parcours_alias_chk check (length(trim(alias)) > 0))`,
      `create table if not exists scope_competence_definitions (
        competence_id uuid primary key default gen_random_uuid(), code text not null unique, libelle text not null, type text not null,
        domaine_code text references scope_domaines(code), actif boolean not null default true, sort_order integer not null default 100,
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_competence_type_chk check (type in ('QUALIFICATION','SPECIALITE','HABILITATION','AUTRE')),
        constraint scope_competence_code_chk check (length(trim(code)) > 0), constraint scope_competence_libelle_chk check (length(trim(libelle)) > 0))`,
      `create index if not exists scope_competence_domain_type_idx on scope_competence_definitions(domaine_code, type, actif, sort_order)`,
      `create table if not exists scope_competence_aliases (
        domaine_code text not null references scope_domaines(code), alias text not null,
        competence_id uuid not null references scope_competence_definitions(competence_id), legacy_context text,
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
        constraint scope_competence_alias_pk primary key (domaine_code, alias),
        constraint scope_competence_alias_chk check (length(trim(alias)) > 0))`,
      `create table if not exists scope_foba_niveaux (
        niveau_id uuid primary key default gen_random_uuid(), code text not null unique, libelle text not null,
        actif boolean not null default true, sort_order integer not null default 100,
        metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_foba_niveaux_code_chk check (length(trim(code)) > 0), constraint scope_foba_niveaux_libelle_chk check (length(trim(libelle)) > 0))`,
      `create table if not exists scope_legacy_cible_oi_mappings (
        cible_id uuid not null references scope_cibles(cible_id) on delete restrict, oi_id uuid not null references scope_ois(oi_id) on delete restrict,
        mapping_method text not null default 'SEEDED_C1', mapping_status text not null, confidence numeric(4,3) not null default 1,
        validated_at timestamptz, validated_by text, metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_legacy_cible_oi_pk primary key (cible_id, oi_id),
        constraint scope_legacy_cible_oi_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
        constraint scope_legacy_cible_oi_confidence_chk check (confidence between 0 and 1))`,
      `create table if not exists scope_legacy_cible_pr_parcours_mappings (
        cible_id uuid not null references scope_cibles(cible_id) on delete restrict, parcours_id uuid not null references scope_pr_parcours(parcours_id) on delete restrict,
        mapping_method text not null default 'SEEDED_C1', mapping_status text not null, confidence numeric(4,3) not null default 1,
        validated_at timestamptz, validated_by text, metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_legacy_cible_pr_pk primary key (cible_id, parcours_id),
        constraint scope_legacy_cible_pr_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
        constraint scope_legacy_cible_pr_confidence_chk check (confidence between 0 and 1))`,
      `create table if not exists scope_legacy_cible_competence_mappings (
        cible_id uuid not null references scope_cibles(cible_id) on delete restrict, competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
        mapping_method text not null default 'SEEDED_C1', mapping_status text not null, confidence numeric(4,3) not null default 1,
        validated_at timestamptz, validated_by text, metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_legacy_cible_competence_pk primary key (cible_id, competence_id),
        constraint scope_legacy_cible_competence_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
        constraint scope_legacy_cible_competence_confidence_chk check (confidence between 0 and 1))`,
      `create table if not exists scope_legacy_cible_foba_niveau_mappings (
        cible_id uuid not null references scope_cibles(cible_id) on delete restrict, niveau_id uuid not null references scope_foba_niveaux(niveau_id) on delete restrict,
        mapping_method text not null default 'SEEDED_C1', mapping_status text not null, confidence numeric(4,3) not null default 1,
        validated_at timestamptz, validated_by text, metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_legacy_cible_foba_pk primary key (cible_id, niveau_id),
        constraint scope_legacy_cible_foba_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
        constraint scope_legacy_cible_foba_confidence_chk check (confidence between 0 and 1))`,
      `create table if not exists scope_legacy_cible_reviews (
        cible_id uuid primary key references scope_cibles(cible_id) on delete restrict, classification text not null, reason text not null,
        metadata jsonb not null default '{}'::jsonb, reviewed_at timestamptz, reviewed_by text,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
        constraint scope_legacy_cible_reviews_class_chk check (classification in ('AMBIGUOUS','REVIEW_REQUIRED','UNMAPPED')),
        constraint scope_legacy_cible_reviews_reason_chk check (length(trim(reason)) > 0))`
    ];
    for(const sql of ddl) await client.query(sql);

    const sourceMetadata = JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1' });
    for(const row of canonicalFoundations.ORGANISATIONAL_UNITS){
      await client.query(`insert into scope_ois(code, libelle, sort_order, metadata) values ($1,$2,$3,$4::jsonb) on conflict (code) do nothing`,
        [row.code, row.label, row.sortOrder, sourceMetadata]);
    }
    const oiRows = (await client.query(`select oi_id, code from scope_ois`)).rows || [];
    const oiByCode = new Map(oiRows.map((row) => [row.code, row.oi_id]));
    for(const [domainCode, oiCodes] of Object.entries(canonicalFoundations.DOMAIN_ORGANISATIONAL_UNITS)){
      for(const oiCode of oiCodes){
        await client.query(`insert into scope_domaine_ois(domaine_code, oi_id, valid_from, metadata)
          values ($1,$2,date '1900-01-01',$3::jsonb) on conflict (domaine_code, oi_id, valid_from) do nothing`,
        [domainCode, oiByCode.get(oiCode), JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1', validity: 'UNBOUNDED_LEGACY' })]);
      }
    }
    for(const row of canonicalFoundations.PR_ACTIVITY_TRACKS){
      await client.query(`insert into scope_pr_parcours(code, libelle, sort_order, metadata) values ($1,$2,$3,$4::jsonb) on conflict (code) do nothing`,
        [row.code, row.label, row.sortOrder, sourceMetadata]);
    }
    const prRows = (await client.query(`select parcours_id, code from scope_pr_parcours`)).rows || [];
    const prByCode = new Map(prRows.map((row) => [row.code, row.parcours_id]));
    for(const [alias, trackCode] of Object.entries(canonicalFoundations.PR_ACTIVITY_TRACK_ALIASES)){
      await client.query(`insert into scope_pr_parcours_aliases(alias, parcours_id, metadata) values ($1,$2,$3::jsonb) on conflict (alias) do nothing`,
        [alias, prByCode.get(trackCode), JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1', legacy: alias !== trackCode })]);
    }
    for(const row of canonicalFoundations.COMPETENCE_DEFINITIONS){
      await client.query(`insert into scope_competence_definitions(code, libelle, type, domaine_code, sort_order, metadata)
        values ($1,$2,$3,$4,$5,$6::jsonb) on conflict (code) do nothing`,
      [row.code, row.label, row.type, row.domainCode, row.sortOrder, sourceMetadata]);
    }
    const competenceRows = (await client.query(`select competence_id, code from scope_competence_definitions`)).rows || [];
    const competenceByCode = new Map(competenceRows.map((row) => [row.code, row.competence_id]));
    for(const row of canonicalFoundations.COMPETENCE_ALIASES){
      await client.query(`insert into scope_competence_aliases(domaine_code, alias, competence_id, legacy_context, metadata)
        values ($1,$2,$3,$4,$5::jsonb) on conflict (domaine_code, alias) do nothing`,
      [row.domainCode, row.alias, competenceByCode.get(row.competenceCode), row.legacyContext || null,
        JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1', preserveLegacyContext: Boolean(row.legacyContext) })]);
    }
    for(const row of canonicalFoundations.FOBA_LEVELS){
      await client.query(`insert into scope_foba_niveaux(code, libelle, sort_order, metadata) values ($1,$2,$3,$4::jsonb) on conflict (code) do nothing`,
        [row.code, row.label, row.sortOrder, sourceMetadata]);
    }
    const levelRows = (await client.query(`select niveau_id, code from scope_foba_niveaux`)).rows || [];
    const levelByCode = new Map(levelRows.map((row) => [row.code, row.niveau_id]));
    const targets = (await client.query(`select cible_id, domaine_code, niveau_code, libelle from scope_cibles`)).rows || [];
    for(const target of targets){
      const classification = canonicalFoundations.classifyLegacyTarget(target);
      for(const mapping of classification.mappings){
        const metadata = JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1', legacyKey: classification.key });
        const confidence = mapping.status === 'COMPOSITE' ? 0.950 : 1.000;
        if(mapping.type === 'OI'){
          await client.query(`insert into scope_legacy_cible_oi_mappings(cible_id, oi_id, mapping_status, confidence, metadata)
            values ($1,$2,$3,$4,$5::jsonb) on conflict (cible_id, oi_id) do nothing`,
          [target.cible_id, oiByCode.get(mapping.code), mapping.status, confidence, metadata]);
        }else if(mapping.type === 'PR_ACTIVITY_TRACK'){
          await client.query(`insert into scope_legacy_cible_pr_parcours_mappings(cible_id, parcours_id, mapping_status, confidence, metadata)
            values ($1,$2,$3,$4,$5::jsonb) on conflict (cible_id, parcours_id) do nothing`,
          [target.cible_id, prByCode.get(mapping.code), mapping.status, confidence, metadata]);
        }else if(mapping.type === 'COMPETENCE'){
          await client.query(`insert into scope_legacy_cible_competence_mappings(cible_id, competence_id, mapping_status, confidence, metadata)
            values ($1,$2,$3,$4,$5::jsonb) on conflict (cible_id, competence_id) do nothing`,
          [target.cible_id, competenceByCode.get(mapping.code), mapping.status, confidence, metadata]);
        }else if(mapping.type === 'FOBA_LEVEL'){
          await client.query(`insert into scope_legacy_cible_foba_niveau_mappings(cible_id, niveau_id, mapping_status, confidence, metadata)
            values ($1,$2,$3,$4,$5::jsonb) on conflict (cible_id, niveau_id) do nothing`,
          [target.cible_id, levelByCode.get(mapping.code), mapping.status, confidence, metadata]);
        }
      }
      if(['AMBIGUOUS', 'UNMAPPED'].includes(classification.classification)){
        await client.query(`insert into scope_legacy_cible_reviews(cible_id, classification, reason, metadata)
          values ($1,$2,$3,$4::jsonb) on conflict (cible_id) do nothing`,
        [target.cible_id, classification.classification, classification.reason,
          JSON.stringify({ source: 'CANONICAL_FOUNDATIONS_C1', legacyKey: classification.key })]);
      }
    }
    const protectedTables = [
      'scope_ois','scope_domaine_ois','scope_pr_parcours','scope_pr_parcours_aliases',
      'scope_competence_definitions','scope_competence_aliases','scope_foba_niveaux',
      'scope_legacy_cible_oi_mappings','scope_legacy_cible_pr_parcours_mappings',
      'scope_legacy_cible_competence_mappings','scope_legacy_cible_foba_niveau_mappings','scope_legacy_cible_reviews'
    ];
    for(const table of protectedTables){
      await client.query(`alter table ${table} enable row level security`);
      for(const role of ['anon', 'authenticated']){
        const exists = await client.query(`select 1 from pg_roles where rolname = $1`, [role]);
        if(exists.rows[0]) await client.query(`revoke all on ${table} from ${role}`);
      }
    }
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-canonical-foundations-c1') on conflict (version) do nothing`);
  });
}

async function migratePublicEngineMirrorC2B(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902276]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version = 'scope-public-engine-mirror-c2-b'`);
    if(done.rows[0]) return;
    await client.query(`create table if not exists scope_public_definitions (
      public_definition_id uuid primary key default gen_random_uuid(), code text not null unique,
      label text not null, description text not null, status text not null default 'INACTIVE',
      owner_type text, owner_code text, domain_hints text[] not null default '{}',
      valid_from date, valid_to date, metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      constraint scope_public_definitions_status_chk check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
      constraint scope_public_definitions_code_chk check (code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
      constraint scope_public_definitions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to))`);
    await client.query(`create table if not exists scope_public_rule_versions (
      public_rule_version_id uuid primary key default gen_random_uuid(),
      public_definition_id uuid not null references scope_public_definitions(public_definition_id) on delete restrict,
      version_number integer not null, version_code text not null, status text not null default 'DRAFT',
      valid_from date, valid_to date, schema_version integer not null default 1,
      expression jsonb not null, fingerprint text not null, approved_at timestamptz, approved_by text,
      metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      constraint scope_public_rule_versions_number_chk check (version_number > 0),
      constraint scope_public_rule_versions_status_chk check (status in ('DRAFT','ACTIVE','RETIRED')),
      constraint scope_public_rule_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
      constraint scope_public_rule_versions_expression_chk check (jsonb_typeof(expression) = 'object'),
      constraint scope_public_rule_versions_fingerprint_chk check (fingerprint ~ '^[0-9a-f]{64}$'),
      constraint scope_public_rule_versions_number_uk unique (public_definition_id, version_number),
      constraint scope_public_rule_versions_code_uk unique (public_definition_id, version_code))`);
    await client.query(`create index if not exists scope_public_rule_versions_lookup_idx
      on scope_public_rule_versions(public_definition_id, status, valid_from, valid_to)`);
    await client.query(`create or replace function scope_public_definitions_guard_code()
      returns trigger language plpgsql as $$
      begin
        if new.code is distinct from old.code then raise exception 'public definition code is immutable'; end if;
        return new;
      end; $$`);
    await client.query(`drop trigger if exists scope_public_definitions_guard_code_trg on scope_public_definitions`);
    await client.query(`create trigger scope_public_definitions_guard_code_trg before update on scope_public_definitions
      for each row execute function scope_public_definitions_guard_code()`);
    await client.query(`create or replace function scope_public_rule_versions_guard_active()
      returns trigger language plpgsql as $$
      begin
        perform pg_advisory_xact_lock(671902277, hashtext(new.public_definition_id::text));
        if tg_op = 'UPDATE' and not (
          (old.status = 'DRAFT' and new.status in ('DRAFT','ACTIVE')) or
          (old.status = 'ACTIVE' and new.status in ('ACTIVE','RETIRED')) or
          (old.status = 'RETIRED' and new.status = 'RETIRED')
        ) then raise exception 'invalid public rule version status transition: % -> %', old.status, new.status; end if;
        if tg_op = 'UPDATE' and old.status = 'ACTIVE' and (
          new.public_definition_id is distinct from old.public_definition_id or new.version_number is distinct from old.version_number or
          new.version_code is distinct from old.version_code or new.valid_from is distinct from old.valid_from or
          new.valid_to is distinct from old.valid_to or new.schema_version is distinct from old.schema_version or
          new.expression is distinct from old.expression or new.fingerprint is distinct from old.fingerprint
        ) then raise exception 'active public rule versions are semantically immutable'; end if;
        if new.status = 'ACTIVE' and exists (
          select 1 from scope_public_rule_versions existing
          where existing.public_definition_id = new.public_definition_id and existing.status = 'ACTIVE'
            and existing.public_rule_version_id <> new.public_rule_version_id
            and daterange(coalesce(existing.valid_from, date '0001-01-01'), coalesce(existing.valid_to, date '9999-12-31'), '[]')
              && daterange(coalesce(new.valid_from, date '0001-01-01'), coalesce(new.valid_to, date '9999-12-31'), '[]')
        ) then raise exception 'overlapping active public rule versions are forbidden'; end if;
        return new;
      end; $$`);
    await client.query(`drop trigger if exists scope_public_rule_versions_guard_active_trg on scope_public_rule_versions`);
    await client.query(`create trigger scope_public_rule_versions_guard_active_trg before insert or update on scope_public_rule_versions
      for each row execute function scope_public_rule_versions_guard_active()`);
    const metadata = JSON.stringify({ source: 'PUBLIC_ENGINE_MIRROR_C2_B' });
    for(const row of publicFoundations.PUBLIC_DEFINITIONS){
      await client.query(`insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
        values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) on conflict (code) do nothing`,
      [row.code, row.label, row.description, row.status, row.ownerType, row.ownerCode, row.domainHints, metadata]);
    }
    const definitions = (await client.query(`select public_definition_id, code from scope_public_definitions`)).rows || [];
    const definitionByCode = new Map(definitions.map((row) => [row.code, row.public_definition_id]));
    for(const row of publicFoundations.PUBLIC_DEFINITIONS){
      const version = row.version;
      await client.query(`insert into scope_public_rule_versions(
        public_definition_id,version_number,version_code,status,schema_version,expression,fingerprint,approved_at,approved_by,metadata)
        select $1,$2,$3,$4,$5,$6::jsonb,$7,now(),'C2-B-SEED',$8::jsonb
        where not exists (select 1 from scope_public_rule_versions where public_definition_id = $1 and version_number = $2)
        on conflict (public_definition_id,version_number) do nothing`,
      [definitionByCode.get(row.code), version.versionNumber, version.versionCode, version.status, version.schemaVersion,
        JSON.stringify(version.expression), version.fingerprint, metadata]);
    }
    for(const table of ['scope_public_definitions', 'scope_public_rule_versions']){
      await client.query(`alter table ${table} enable row level security`);
      for(const role of ['anon', 'authenticated']){
        const exists = await client.query(`select 1 from pg_roles where rolname = $1`, [role]);
        if(exists.rows[0]) await client.query(`revoke all on ${table} from ${role}`);
      }
    }
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-public-engine-mirror-c2-b') on conflict (version) do nothing`);
  });
}

async function migratePersonQualificationsC3B(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902278]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-person-qualifications-c3-b'`);
    if(done.rows[0]) return;
    await client.query(personQualificationDdl.NORMALIZE_VPC_SQL);
    const metadata = JSON.stringify({ source: 'PERSON_QUALIFICATIONS_C3_B' });
    for(const row of personQualifications.QUALIFICATION_DEFINITIONS_C3){
      await client.query(`insert into scope_competence_definitions(code,libelle,type,domaine_code,sort_order,metadata)
        values ($1,$2,$3,$4,$5,$6::jsonb) on conflict (code) do nothing`,
      [row.code,row.label,row.type,row.domainCode,row.sortOrder,metadata]);
    }
    const definitions = (await client.query(`select competence_id,code from scope_competence_definitions`)).rows || [];
    const idByCode = new Map(definitions.map((row) => [row.code,row.competence_id]));
    const aliases = [
      ...personQualifications.QUALIFICATION_ALIASES_C3,
      ...canonicalFoundations.COMPETENCE_ALIASES.map((row) => ({
        domainCode: row.domainCode,alias: row.alias,
        qualificationCode: row.competenceCode === 'OP_VPC' ? 'VPC' : row.competenceCode,
        legacyContext: row.legacyContext || null
      }))
    ];
    for(const row of aliases){
      const competenceId = idByCode.get(row.qualificationCode);
      if(!competenceId) throw new Error(`C3-B missing qualification ${row.qualificationCode}`);
      await client.query(`insert into scope_competence_aliases(domaine_code,alias,competence_id,legacy_context,metadata)
        values ($1,$2,$3,$4,$5::jsonb) on conflict (domaine_code,alias) do update
        set competence_id=excluded.competence_id,legacy_context=excluded.legacy_context,
            metadata=scope_competence_aliases.metadata || excluded.metadata`,
      [row.domainCode,row.alias,competenceId,row.legacyContext || null,metadata]);
    }
    for(const sql of personQualificationDdl.DDL) await client.query(sql);
    await client.query(personQualificationDdl.GUARD_SQL);
    await client.query(`drop trigger if exists scope_person_qualifications_guard_trg on scope_person_qualifications`);
    await client.query(`create trigger scope_person_qualifications_guard_trg before insert or update or delete on scope_person_qualifications
      for each row execute function scope_person_qualifications_guard()`);
    await client.query(personQualificationDdl.SUPERSESSION_SQL);
    await client.query(personQualificationDdl.EVIDENCE_GUARD_SQL);
    await client.query(`drop trigger if exists scope_person_qualification_evidence_guard_trg on scope_person_qualification_evidence`);
    await client.query(`create trigger scope_person_qualification_evidence_guard_trg before update or delete on scope_person_qualification_evidence
      for each row execute function scope_person_qualification_evidence_guard()`);
    await client.query(`insert into scope_competence_implications(competence_id,implied_competence_id,metadata)
      values ($1,$2,$3::jsonb) on conflict (competence_id,implied_competence_id) do nothing`,
    [idByCode.get('PABC'),idByCode.get('PAPR'),JSON.stringify({ source: 'PERSON_QUALIFICATIONS_C3_B',rule: 'PABC_IMPLIES_PAPR',synthesize: false })]);
    for(const role of personQualifications.EVENT_ROLE_DEFINITIONS){
      await client.query(`insert into scope_event_role_definitions(code,label,domain_code,metadata)
        values ($1,$2,$3,$4::jsonb) on conflict (code) do nothing`, [role.code,role.label,role.domainCode,metadata]);
      const inserted = await client.query(`select event_role_definition_id from scope_event_role_definitions where code=$1`, [role.code]);
      for(const alias of role.aliases || []){
        await client.query(`insert into scope_event_role_aliases(alias,event_role_definition_id,metadata)
          values ($1,$2,$3::jsonb) on conflict (alias) do nothing`,
        [alias,inserted.rows[0].event_role_definition_id,metadata]);
      }
    }
    await client.query(`update scope_public_rule_versions version set status='RETIRED',updated_at=now()
      from scope_public_definitions definition where version.public_definition_id=definition.public_definition_id
      and definition.code='FOSPEC-OP-VPC' and version.status='ACTIVE'`);
    await client.query(`update scope_public_definitions set status='ARCHIVED',
      metadata=metadata || '{"canonicalReplacement":"FOSPEC-VPC"}'::jsonb,updated_at=now() where code='FOSPEC-OP-VPC'`);
    for(const row of personQualifications.PUBLIC_DEFINITIONS_C3){
      await client.query(`insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
        values ($1,$2,$3,'ACTIVE','DOMAIN',$4,$5,$6::jsonb) on conflict (code) do nothing`,
      [row.code,row.label,row.description,row.ownerCode,row.domainHints,metadata]);
      const inserted = await client.query(`select public_definition_id from scope_public_definitions where code=$1`, [row.code]);
      await client.query(`insert into scope_public_rule_versions(public_definition_id,version_number,version_code,status,schema_version,expression,fingerprint,approved_at,approved_by,metadata)
        values ($1,1,$2,'ACTIVE',1,$3::jsonb,$4,now(),'C3-B-SEED',$5::jsonb)
        on conflict (public_definition_id,version_number) do nothing`,
      [inserted.rows[0].public_definition_id,row.version.versionCode,JSON.stringify(row.version.expression),row.version.fingerprint,metadata]);
    }
    for(const row of personQualifications.UNRESOLVED_PUBLICS_C3){
      await client.query(`insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
        values ($1,$2,$3,'INACTIVE','DOMAIN',$4,$5,$6::jsonb) on conflict (code) do nothing`,
      [row.code,row.label,row.description,row.ownerCode,[row.ownerCode],
        JSON.stringify({ source: 'PERSON_QUALIFICATIONS_C3_B',resolutionStatus: row.resolutionStatus,reason: row.reason })]);
    }
    for(const table of [
      'scope_competence_implications','scope_person_qualifications','scope_person_qualification_evidence',
      'scope_event_role_definitions','scope_event_role_aliases','scope_event_person_roles'
    ]){
      await client.query(`alter table ${table} enable row level security`);
      for(const role of ['anon','authenticated']){
        const exists = await client.query(`select 1 from pg_roles where rolname=$1`,[role]);
        if(exists.rows[0]) await client.query(`revoke all on ${table} from ${role}`);
      }
    }
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-person-qualifications-c3-b') on conflict (version) do nothing`);
  });
}

async function migrateAnnualCatalogC4B(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902280]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-annual-catalog-c4-b'`);
    if(done.rows[0]) return;
    for(const sql of annualCatalogDdl.DDL) await client.query(sql);
    await client.query(annualCatalogDdl.GUARD_SQL);
    for(const table of annualCatalogDdl.CHILD_TABLES) await client.query(annualCatalogDdl.childTriggerSql(table));
    await client.query(annualCatalogDdl.PROTECTION_SQL);
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-annual-catalog-c4-b') on conflict (version) do nothing`);
  });
}

async function migrateCatalogConvergenceC5B(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902281]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-catalog-convergence-c5-b'`);
    if(done.rows[0]) return;
    for(const sql of catalogConvergenceDdl.DDL) await client.query(sql);
    await client.query(catalogConvergenceDdl.SEED_SQL);
    await client.query(catalogConvergenceDdl.PROTECTION_SQL);
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-catalog-convergence-c5-b') on conflict (version) do nothing`);
  });
}

async function migrateAnnualCatalogThemesC8B(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902283]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-annual-catalog-themes-c8-b'`);
    if(done.rows[0]) return;
    for(const sql of annualThemeDdl.DDL) await client.query(sql);
    await client.query(annualThemeDdl.GUARD_SQL);
    await client.query(annualThemeDdl.PROTECTION_SQL);
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-annual-catalog-themes-c8-b') on conflict (version) do nothing`);
  });
}

async function migrateAnnualCatalogImportC15(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902285]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-annual-catalog-import-c15'`);
    if(done.rows[0]) return;
    for(const sql of annualCatalogImportDdl.DDL) await client.query(sql);
    await client.query(annualCatalogImportDdl.GUARD_SQL);
    await client.query(annualCatalogImportDdl.PROTECTION_SQL);
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-annual-catalog-import-c15') on conflict (version) do nothing`);
  });
}

async function migrateStatComJspRepair2(){
  return db.transaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [671902286]);
    const done = await client.query(`select 1 from monitoring_f7_schema_migrations where version='scope-statcom-jsp-repair-2'`);
    if(done.rows[0]) return;
    const codes = new Set(['010JB1','010JC1','010JG1','COURJSP']);
    for(const row of statComReferential.initialStatComCodes().filter((item) => codes.has(item.code))){
      await client.query(
        `insert into scope_statcom_referentiel(code,label,domain,category,oi_code,specialization,specialization_label,valid_from,valid_to,active,metadata)
         values ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10::jsonb)
         on conflict (code) do nothing`,
        [row.code,row.label,row.domain,row.category,row.oi,row.specialization,row.valid_from,row.valid_to,row.active,JSON.stringify(row.metadata || {})]
      );
    }
    await client.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-statcom-jsp-repair-2') on conflict (version) do nothing`);
  });
}

async function migrateAlerts1(){
  await db.query(`
    create table if not exists scope_alertes_acquittements (
      acquittement_id uuid primary key,
      fingerprint text not null,
      code text not null,
      entity_type text not null,
      entity_id text not null,
      utilisateur_id text not null,
      commentaire text,
      created_at timestamptz not null default now()
    )
  `);
  await db.query(`
    create unique index if not exists scope_alertes_acq_user_fp
      on scope_alertes_acquittements (utilisateur_id, fingerprint)
  `);
  await db.query(`
    create index if not exists scope_alertes_acq_fp_idx
      on scope_alertes_acquittements (fingerprint)
  `);
}

async function migrateObjectives1(){
  await db.query(`
    create table if not exists scope_objectifs (
      objectif_id uuid primary key,
      portee text not null,
      domaine_code text references scope_domaines(code),
      cible_id uuid references scope_cibles(cible_id),
      date_debut date not null,
      date_fin date,
      seuil_pct numeric(5,1) not null,
      actif boolean not null default true,
      commentaire text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_objectifs_portee_chk check (portee in ('GLOBAL','DOMAINE','CIBLE')),
      constraint scope_objectifs_coherence_chk check (
        (portee = 'GLOBAL' and domaine_code is null and cible_id is null)
        or (portee = 'DOMAINE' and domaine_code is not null and cible_id is null)
        or (portee = 'CIBLE' and cible_id is not null)
      ),
      constraint scope_objectifs_seuil_chk check (seuil_pct >= 0 and seuil_pct <= 100),
      constraint scope_objectifs_dates_chk check (date_fin is null or date_fin >= date_debut)
    )
  `);
  await db.query(`
    create index if not exists scope_objectifs_portee_dates_idx
      on scope_objectifs (portee, domaine_code, cible_id, date_debut)
  `);
  await db.query(`
    create index if not exists scope_objectifs_actif_idx
      on scope_objectifs (actif, date_debut)
  `);
}

async function migrateEventQ1(){
  await db.query(`
    create table if not exists scope_saisies_quantitatives (
      evenement_id uuid primary key references scope_evenements(evenement_id),
      nb_attendus integer not null,
      nb_presents integer not null,
      nb_excuses integer not null,
      nb_non_excuses integer not null,
      nb_dispenses integer not null default 0,
      auteur_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_saisies_q_nonneg_chk check (
        nb_attendus >= 0
        and nb_presents >= 0
        and nb_excuses >= 0
        and nb_non_excuses >= 0
        and nb_dispenses >= 0
      ),
      constraint scope_saisies_q_eq_chk check (
        nb_attendus = nb_presents + nb_excuses + nb_non_excuses + nb_dispenses
      )
    )
  `);
  await db.query(`
    create index if not exists scope_saisies_quantitatives_updated
      on scope_saisies_quantitatives (updated_at desc)
  `);
}

async function migrateReglesBasculeR1(){
  const cols = await db.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'scope_regles_bascule'`
  );
  const names = new Set(cols.rows.map((r) => r.column_name));
  if(!names.size) return;
  if(!names.has('portee')){
    await db.query('alter table scope_regles_bascule add column if not exists regle_id uuid');
    await db.query('alter table scope_regles_bascule add column if not exists portee text');
    await db.query('alter table scope_regles_bascule add column if not exists cible_id uuid references scope_cibles(cible_id)');
    await db.query('alter table scope_regles_bascule add column if not exists created_at timestamptz default now()');
    await db.query(`update scope_regles_bascule set portee = 'DOMAINE' where portee is null`);
    await db.query('update scope_regles_bascule set regle_id = gen_random_uuid() where regle_id is null');
    await db.query('alter table scope_regles_bascule drop constraint if exists scope_regles_bascule_pkey');
    await db.query('alter table scope_regles_bascule alter column domaine_code drop not null');
    await db.query('alter table scope_regles_bascule alter column regle_id set default gen_random_uuid()');
    await db.query('alter table scope_regles_bascule alter column regle_id set not null');
    await db.query('alter table scope_regles_bascule alter column portee set not null');
    await db.query('alter table scope_regles_bascule add primary key (regle_id)');
  }
  await db.query(`
    create unique index if not exists scope_regles_bascule_cible_uidx
      on scope_regles_bascule (cible_id) where portee = 'CIBLE'
  `);
  await db.query(`
    create unique index if not exists scope_regles_bascule_domaine_uidx
      on scope_regles_bascule (domaine_code) where portee = 'DOMAINE'
  `);
  await db.query(`
    create unique index if not exists scope_regles_bascule_global_uidx
      on scope_regles_bascule ((true)) where portee = 'GLOBAL'
  `);
}

async function migrateModeSuiviAnalytics1(){
  await db.query('alter table scope_evenements add column if not exists mode_suivi text');
  await db.query(`
    update scope_evenements
    set mode_suivi = 'LEGACY'
    where origine = 'LEGACY_AGGREGATED'
      and (mode_suivi is null or mode_suivi not in ('NOMINATIF','QUANTITATIF','LEGACY'))
  `);
  await db.query(`
    update scope_evenements
    set mode_suivi = 'NOMINATIF'
    where mode_suivi is null
       or mode_suivi not in ('NOMINATIF','QUANTITATIF','LEGACY')
  `);
  await db.query('alter table scope_evenements drop constraint if exists scope_evenements_mode_suivi_chk');
  await db.query(`
    alter table scope_evenements add constraint scope_evenements_mode_suivi_chk
      check (mode_suivi in ('NOMINATIF','QUANTITATIF','LEGACY'))
  `);
  await db.query("alter table scope_evenements alter column mode_suivi set default 'NOMINATIF'");
  await db.query('alter table scope_evenements alter column mode_suivi set not null');
  await db.query(`
    create index if not exists scope_evenements_analytics_idx
      on scope_evenements (date, statut, mode_suivi, domaine_code)
  `);
  await db.query(`
    create index if not exists scope_evenement_cibles_cible_evt
      on scope_evenement_cibles (cible_id, evenement_id)
  `);
}

async function migrateModel2(){
  await db.query(`alter table scope_domaines add column if not exists nature text`);
  await db.query(`alter table scope_domaines add column if not exists parent_code text`);
  await db.query(`alter table scope_domaines add column if not exists libelle_affiche text`);
  await db.query(`
    update scope_domaines
    set nature = coalesce(nature, 'DOMAINE'),
        libelle_affiche = coalesce(libelle_affiche, case when code = 'PR' then 'PAPR' else code end)
  `);
  await db.query(`
    update scope_domaines
    set parent_code = null,
        nature = 'DOMAINE',
        libelle_affiche = code
    where code in ('PR', 'AUTO')
  `);
  await db.query(`
    update scope_domaines
    set libelle = 'Protection respiratoire', libelle_affiche = 'PR'
    where code = 'PR'
  `);
  await db.query(`alter table scope_domaines drop constraint if exists scope_domaines_nature_chk`);
  await db.query(`
    alter table scope_domaines add constraint scope_domaines_nature_chk
      check (nature in ('DOMAINE', 'SOUS_DOMAINE'))
  `);
  await db.query(`alter table scope_domaines drop constraint if exists scope_domaines_parent_fk`);
  await db.query(`
    alter table scope_domaines
      add constraint scope_domaines_parent_fk
      foreign key (parent_code) references scope_domaines(code)
  `);

  await db.query(`
    create table if not exists scope_sous_domaines (
      code text primary key,
      domaine_code text not null references scope_domaines(code),
      libelle text not null,
      libelle_affiche text not null,
      actif boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await db.query(`alter table scope_sous_domaines add column if not exists libelle_affiche text`);
  await db.query(`update scope_sous_domaines set libelle_affiche = libelle where libelle_affiche is null`);
  await db.query(`alter table scope_sous_domaines alter column libelle_affiche set not null`);
  for(const row of SOUS_DOMAINES){
    await db.query(
      `insert into scope_sous_domaines(code, domaine_code, libelle, libelle_affiche, actif)
       values ($1,$2,$3,$4,true)
       on conflict (code) do update set
         domaine_code = excluded.domaine_code,
         libelle = excluded.libelle,
         libelle_affiche = excluded.libelle_affiche,
         updated_at = now()`,
      [row.code, row.domaineParent, row.libelle, row.libelleAffiche]
    );
  }

  await db.query(`alter table scope_evenements add column if not exists sous_domaine_code text`);
  await db.query(`alter table scope_evenements add column if not exists exercise_equivalence_key text`);
  await db.query(`create index if not exists scope_evenements_equivalence_idx on scope_evenements (domaine_code, exercise_equivalence_key)`);
  await db.query(`
    update scope_evenements
    set sous_domaine_code = domaine_code
    where domaine_code in ('PR', 'AUTO') and sous_domaine_code is null
  `);
  await db.query(`
    do $$ begin
      alter table scope_evenements
        add constraint scope_evenements_sous_domaine_fk
        foreign key (sous_domaine_code) references scope_sous_domaines(code);
    exception when duplicate_object then null;
    end $$
  `);

  await db.query(`alter table scope_participations add column if not exists cible_suivie_id uuid`);
  await db.query(`
    do $$ begin
      alter table scope_participations
        add constraint scope_participations_cible_suivie_fk
        foreign key (cible_suivie_id) references scope_cibles(cible_id);
    exception when duplicate_object then null;
    end $$
  `);
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_statut_chk`);
  await db.query(`
    alter table scope_participations add constraint scope_participations_statut_chk check (statut in (
      'NON_RENSEIGNE','PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_CONCERNE','PERMUTATION'
    ))
  `);
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_role_chk`);
  await db.query(`
    alter table scope_participations add constraint scope_participations_role_chk check (role in (
      'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE','RENFORT','REMPLACANT'
    ))
  `);
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_motif_val_chk`);
  await db.query(`
    alter table scope_participations add constraint scope_participations_motif_val_chk check (
      motif_absence is null or motif_absence in (
        'PRIVE','PROFESSIONNEL','ARMEE','ACCIDENT_MALADIE','MALADIE','ACCIDENT','AUTRE','NON_PRECISE',
        'ACTIVITE_SCOLAIRE','ACTIVITE_EXTRA_SCOLAIRE','OUBLI','NON_JUSTIFIE',
        'JOKER','FORMATEUR_PR','FORMATION_HORS_SDIS','AUTO_RETRAIT','NON_CONCERNE','PAS_CONCERNE','DEMISSION_EN_COURS'
      )
    )
  `);
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_permutation_motif_chk`);
  await db.query(`
    alter table scope_participations add constraint scope_participations_permutation_motif_chk check (
      statut <> 'PERMUTATION' or motif_absence is null
    )
  `);

  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_excuses_prive integer`);
  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_excuses_professionnel integer`);
  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_excuses_armee integer`);
  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_excuses_accident_maladie integer`);
  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_excuses_non_precise integer`);
  await db.query(`alter table scope_saisies_quantitatives add column if not exists nb_permutations integer`);
  await db.query(`
    update scope_saisies_quantitatives
    set nb_excuses_prive = coalesce(nb_excuses_prive, 0),
        nb_excuses_professionnel = coalesce(nb_excuses_professionnel, 0),
        nb_excuses_armee = coalesce(nb_excuses_armee, 0),
        nb_excuses_accident_maladie = coalesce(nb_excuses_accident_maladie, 0),
        nb_excuses_non_precise = coalesce(
          nb_excuses_non_precise,
          case
            when coalesce(nb_excuses_prive,0) + coalesce(nb_excuses_professionnel,0)
               + coalesce(nb_excuses_armee,0) + coalesce(nb_excuses_accident_maladie,0) = 0
            then nb_excuses
            else 0
          end
        ),
        nb_permutations = coalesce(nb_permutations, 0)
  `);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_prive set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_professionnel set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_armee set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_accident_maladie set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_non_precise set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_permutations set default 0`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_prive set not null`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_professionnel set not null`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_armee set not null`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_accident_maladie set not null`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_excuses_non_precise set not null`);
  await db.query(`alter table scope_saisies_quantitatives alter column nb_permutations set not null`);
  await db.query(`alter table scope_saisies_quantitatives drop constraint if exists scope_saisies_q_motifs_chk`);
  await db.query(`
    alter table scope_saisies_quantitatives add constraint scope_saisies_q_motifs_chk check (
      nb_excuses = nb_excuses_prive + nb_excuses_professionnel + nb_excuses_armee
        + nb_excuses_accident_maladie + nb_excuses_non_precise
    )
  `);
  await db.query(`alter table scope_saisies_quantitatives drop constraint if exists scope_saisies_q_perm_chk`);
  await db.query(`
    alter table scope_saisies_quantitatives add constraint scope_saisies_q_perm_chk check (
      nb_permutations >= 0 and nb_permutations <= nb_presents
    )
  `);

  await db.query(`
    create table if not exists scope_suivi_nominatif (
      suivi_id uuid primary key,
      portee text not null,
      domaine_code text references scope_domaines(code),
      sous_domaine_code text references scope_sous_domaines(code),
      cible_id uuid references scope_cibles(cible_id),
      nominatif_autorise boolean not null,
      date_debut date not null,
      date_fin date,
      commentaire text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_suivi_portee_chk check (portee in ('GLOBAL','DOMAINE','SOUS_DOMAINE','CIBLE')),
      constraint scope_suivi_dates_chk check (date_fin is null or date_fin >= date_debut)
    )
  `);
  await db.query(`
    insert into scope_suivi_nominatif(
      suivi_id, portee, nominatif_autorise, date_debut, commentaire
    ) values (
      '8c0a0002-2026-4000-8000-000000000001',
      'GLOBAL', true, date '2020-01-01',
      'MODEL-2 : le suivi nominatif est possible pour tous les domaines. Ne change pas le mode des événements existants.'
    )
    on conflict (suivi_id) do nothing
  `);
  await db.query(`
    create table if not exists scope_permutations (
      permutation_id uuid primary key,
      personne_id text not null references scope_personnes(id),
      source_evenement_id uuid not null references scope_evenements(evenement_id),
      source_exercise_key text not null,
      source_cible_id uuid references scope_cibles(cible_id),
      source_date date,
      rattrapage_evenement_id uuid references scope_evenements(evenement_id),
      rattrapage_cible_id uuid references scope_cibles(cible_id),
      rattrapage_date date,
      statut text not null,
      regularisation_motif text,
      commentaire text,
      auteur_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_permutations_statut_chk check (statut in ('A_RATTRAPER','RATTRAPPE','A_REGULARISER','REGULARISE')),
      constraint scope_permutations_regularisation_chk check (
        statut <> 'REGULARISE' or regularisation_motif is not null
      )
    )
  `);
  await db.query(`create unique index if not exists scope_permutations_open_source_idx on scope_permutations(personne_id, source_evenement_id)`);
  await db.query(`create index if not exists scope_permutations_lookup_idx on scope_permutations(personne_id, source_exercise_key, statut)`);
}

async function migrateModel2R1(){
  await db.query(`
    create table if not exists scope_personne_periodes (
      periode_id uuid primary key,
      personne_id text not null references scope_personnes(id),
      type text not null,
      date_debut date not null,
      date_fin date,
      motif text,
      source text not null default 'MANUEL',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_periode_type_chk check (type in ('ACTIF','INDISPONIBLE','SORTI','DEMISSIONNAIRE')),
      constraint scope_periode_dates_chk check (date_fin is null or date_fin >= date_debut)
    )
  `);
  await db.query(`
    create index if not exists scope_personne_periodes_personne_dates
      on scope_personne_periodes (personne_id, date_debut)
  `);
  await db.query(`
    insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
    select gen_random_uuid(), p.id, 'ACTIF',
           coalesce(p.date_entree_sdis, date '2020-01-01'),
           null,
           null, 'BACKFILL'
    from scope_personnes p
    where not exists (
      select 1 from scope_personne_periodes x where x.personne_id = p.id
    )
      and p.archived_at is null
  `);
  await db.query(`
    insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
    select gen_random_uuid(), p.id,
           'SORTI',
           coalesce(p.archived_at::date, coalesce(p.date_entree_sdis, date '2020-01-01')),
           null, null, 'BACKFILL'
    from scope_personnes p
    where p.archived_at is not null
      and not exists (
        select 1 from scope_personne_periodes x
        where x.personne_id = p.id and x.type in ('SORTI','DEMISSIONNAIRE')
      )
  `);
}

async function seedBasculeDapY4(){
  await db.query(
    `insert into scope_regles_bascule (portee, cible_id, domaine_code, date_bascule, commentaire)
     select 'CIBLE', cible_id, 'DAP', date '2026-08-19',
            'Pilote nominatif DAP/Y4. Seule cible qualifiée. Pas une règle domaine DAP.'
     from scope_cibles
     where domaine_code = 'DAP' and niveau_code = 'Y4'
     on conflict (cible_id) where portee = 'CIBLE' do nothing`
  );
}

async function migrateEventImport1(){
  await db.query('alter table scope_evenements drop constraint if exists scope_evenements_origine_chk');
  await db.query(`
    alter table scope_evenements add constraint scope_evenements_origine_chk
      check (origine in ('NOMINATIF','LEGACY_AGGREGATED','IMPORT_CSV'))
  `);
  await db.query('alter table scope_evenements add column if not exists identifiant_externe text');
  await db.query(`
    create unique index if not exists scope_evenements_identifiant_externe_uq
      on scope_evenements (identifiant_externe)
      where identifiant_externe is not null
  `);
}

async function migrateEventStandard1(){
  await db.query('alter table scope_evenements add column if not exists internal_event_id text');
  await db.query('update scope_evenements set internal_event_id = evenement_id::text where internal_event_id is null');
  await db.query('alter table scope_evenements alter column internal_event_id set not null');
  await db.query(`
    create unique index if not exists scope_evenements_internal_event_id_uq
      on scope_evenements (internal_event_id)
  `);
  await db.query('alter table scope_evenements add column if not exists code_cours text');
  await db.query('alter table scope_evenements add column if not exists code_source text');
  await db.query('alter table scope_evenements add column if not exists source_type text');
  await db.query('alter table scope_evenements add column if not exists heure_debut text');
  await db.query('alter table scope_evenements add column if not exists heure_fin text');
  await db.query('alter table scope_evenements add column if not exists salle text');
  await db.query('alter table scope_evenements add column if not exists responsable text');
  await db.query(`
    update scope_evenements
    set source_type = case
      when origine = 'IMPORT_CSV' then 'CSV'
      when origine = 'LEGACY_AGGREGATED' then 'LEGACY'
      else 'MANUEL'
    end
    where source_type is null
  `);
  await db.query(`
    create unique index if not exists scope_evenements_code_cours_uq
      on scope_evenements (code_cours)
      where code_cours is not null
  `);
  await db.query(`
    create index if not exists scope_evenements_standard_match_idx
      on scope_evenements (date, domaine_code, sous_domaine_code, heure_debut, heure_fin)
  `);
}

async function migratePersonnelImportPopulations1(){
  await db.query(`
    create table if not exists scope_personnel_import_batches (
      id text primary key,
      import_type text not null,
      contexte text,
      site_jsp text,
      annee_monitoring integer not null,
      filename text,
      status text not null,
      total_lines integer not null default 0,
      total_unique_nips integer not null default 0,
      count_identical integer not null default 0,
      count_new_persons integer not null default 0,
      count_new_jsp integer not null default 0,
      count_modified integer not null default 0,
      count_new_assignments integer not null default 0,
      count_existing_assignments integer not null default 0,
      count_missing_assignments integer not null default 0,
      count_closures integer not null default 0,
      count_errors integer not null default 0,
      created_by text,
      created_at timestamptz not null default now(),
      committed_at timestamptz
    )
  `);
  await db.query(`alter table scope_personnel_import_batches add column if not exists site_jsp text`);
  await db.query(`alter table scope_personnel_import_batches add column if not exists count_new_jsp integer not null default 0`);
  await db.query(`alter table scope_personnel_import_batches add column if not exists count_existing_assignments integer not null default 0`);
  await db.query(`alter table scope_personnel_import_batches add column if not exists count_closures integer not null default 0`);
  await db.query(`
    create table if not exists scope_personnel_import_lines (
      id text primary key,
      batch_id text not null references scope_personnel_import_batches(id) on delete cascade,
      line_number integer not null,
      nip text,
      raw_payload jsonb not null default '{}'::jsonb,
      normalized_payload jsonb not null default '{}'::jsonb,
      status text not null,
      diff_payload jsonb not null default '{}'::jsonb,
      errors_payload jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await db.query(`
    create index if not exists idx_scope_import_lines_batch
      on scope_personnel_import_lines (batch_id, line_number)
  `);
}

async function migrateJspGradeModelFix1(){
  const col = await db.query(`
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scope_affectations'
      and column_name = 'niveau'
  `);
  if(col.rows && col.rows.length){
    await db.query(`
      update scope_personnes p
      set grade = case a.niveau
        when 'FLM_1' then 'Flm 1'
        when 'FLM_2' then 'Flm 2'
        when 'FLM_3' then 'Flm 3'
        else p.grade
      end
      from scope_affectations a
      where a.personne_id = p.id
        and a.niveau in ('FLM_1', 'FLM_2', 'FLM_3')
        and (p.grade is null or btrim(p.grade) = '')
    `);
    await db.query(`alter table scope_affectations drop constraint if exists scope_affectations_niveau_chk`);
    await db.query(`drop index if exists scope_affectations_population_idx`);
    await db.query(`drop index if exists scope_affectations_open_unique`);
    await db.query(`alter table scope_affectations drop column if exists niveau`);
  }
  await db.query(`
    create unique index if not exists scope_affectations_open_unique
      on scope_affectations (
        personne_id,
        categorie,
        domaine,
        cible,
        coalesce(role_domaine, '')
      )
      where date_inactif is null
  `);
}

async function migrateSpecialisationCyclesArch1(){
  await db.query(`
    create table if not exists scope_cycles (
      cycle_id uuid primary key default gen_random_uuid(),
      cycle_key text,
      annee integer,
      domaine_code text not null references scope_domaines(code),
      type_cycle text,
      libelle text not null,
      statut text not null default 'PLANIFIE',
      stat_com text,
      qui text,
      date_debut date,
      date_fin date,
      source_type text not null default 'MANUEL',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_cycles_domaine_chk check (domaine_code in ('PR','AUTO')),
      constraint scope_cycles_statut_chk check (statut in ('PLANIFIE','REALISE','REPORTE','ANNULE')),
      constraint scope_cycles_dates_chk check (date_fin is null or date_debut is null or date_debut <= date_fin),
      constraint scope_cycles_libelle_chk check (length(trim(libelle)) > 0),
      constraint scope_cycles_source_type_chk check (source_type in ('MANUEL','IMPORT','ARBITRAGE_MOA'))
    )
  `);
  await db.query(`
    create unique index if not exists scope_cycles_cycle_key_uq
      on scope_cycles (cycle_key)
      where cycle_key is not null
  `);
  await db.query(`
    create index if not exists scope_cycles_rapprochement_idx
      on scope_cycles (domaine_code, annee, type_cycle, stat_com, qui, date_debut, date_fin)
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists cycle_id uuid references scope_cycles(cycle_id) on delete set null
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists pr_exercise_group_key text
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists pr_session_key text
  `);
  await db.query(`
    create index if not exists scope_evenements_cycle_id_idx
      on scope_evenements (cycle_id)
  `);
  await db.query(`
    create index if not exists scope_evenements_pr_exercise_group_idx
      on scope_evenements (cycle_id, pr_exercise_group_key)
      where pr_exercise_group_key is not null
  `);
  await db.query(`
    create table if not exists scope_cycle_personnes (
      cycle_id uuid not null references scope_cycles(cycle_id) on delete cascade,
      personne_id text not null references scope_personnes(id),
      role_cycle text not null default 'PARTICIPANT',
      statut_cycle text not null default 'ACTIF',
      session_event_id uuid references scope_evenements(evenement_id) on delete set null,
      participated_event_id uuid references scope_evenements(evenement_id) on delete set null,
      exception_type text,
      exercise_scope jsonb not null default '[]'::jsonb,
      source text not null default 'MANUEL',
      date_debut date,
      date_fin date,
      commentaire text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (cycle_id, personne_id, role_cycle),
      constraint scope_cycle_personnes_role_chk check (role_cycle in (
        'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE'
      )),
      constraint scope_cycle_personnes_statut_chk check (statut_cycle in (
        'ACTIF','DISPENSE','EXCLU','NON_RENSEIGNE'
      )),
      constraint scope_cycle_personnes_exception_chk check (
        exception_type is null or exception_type in ('DISPENSE_EXERCICE_INTERNE')
      ),
      constraint scope_cycle_personnes_source_chk check (source in (
        'MANUEL','IMPORT','HERITAGE','ARBITRAGE_MOA'
      )),
      constraint scope_cycle_personnes_dates_chk check (date_fin is null or date_debut is null or date_debut <= date_fin)
    )
  `);
  await db.query(`
    create index if not exists scope_cycle_personnes_personne_idx
      on scope_cycle_personnes (personne_id)
  `);
  await db.query(`
    create index if not exists scope_cycle_personnes_role_idx
      on scope_cycle_personnes (cycle_id, role_cycle, statut_cycle)
  `);
  await db.query(`
    create index if not exists scope_cycle_personnes_session_event_idx
      on scope_cycle_personnes (session_event_id)
  `);
}

async function migrateMetierActivation3(){
  await db.query(`
    alter table scope_participations drop constraint if exists scope_participations_motif_val_chk
  `);
  await db.query(`
    alter table scope_participations add constraint scope_participations_motif_val_chk check (
      motif_absence is null or motif_absence in (
        'PRIVE','PROFESSIONNEL','ARMEE','ACCIDENT_MALADIE','MALADIE','ACCIDENT','AUTRE','NON_PRECISE',
        'ACTIVITE_SCOLAIRE','ACTIVITE_EXTRA_SCOLAIRE','OUBLI','NON_JUSTIFIE',
        'JOKER','FORMATEUR_PR','FORMATION_HORS_SDIS','AUTO_RETRAIT','NON_CONCERNE','PAS_CONCERNE','DEMISSION_EN_COURS'
      )
    )
  `);
}

async function migrateGenericExerciseSessions1(){
  await db.query(`
    create table if not exists scope_exercices (
      exercice_id uuid primary key default gen_random_uuid(),
      exercice_key text,
      domaine_code text not null references scope_domaines(code),
      code text,
      libelle text not null,
      annee integer,
      mode_session text not null default 'SINGLE',
      nombre_sessions_attendu integer not null default 1,
      consolidation_active boolean not null default false,
      source text not null default 'MANUEL',
      cycle_id uuid references scope_cycles(cycle_id) on delete set null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_exercices_mode_session_chk check (mode_session in ('SINGLE','MULTI')),
      constraint scope_exercices_nb_sessions_chk check (nombre_sessions_attendu >= 1),
      constraint scope_exercices_libelle_chk check (length(trim(libelle)) > 0),
      constraint scope_exercices_source_chk check (source in ('MANUEL','IMPORT','ARBITRAGE_MOA','BACKFILL','LEGACY_BRIDGE')),
      constraint scope_exercices_multi_chk check (
        (mode_session = 'SINGLE' and nombre_sessions_attendu = 1)
        or (mode_session = 'MULTI' and nombre_sessions_attendu >= 2)
      )
    )
  `);
  await db.query(`
    create unique index if not exists scope_exercices_exercice_key_uq
      on scope_exercices (exercice_key)
      where exercice_key is not null
  `);
  await db.query(`
    create index if not exists scope_exercices_lookup_idx
      on scope_exercices (domaine_code, annee, mode_session)
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists exercice_id uuid references scope_exercices(exercice_id) on delete set null
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists session_index integer
  `);
  await db.query(`
    alter table scope_evenements
      add column if not exists session_label text
  `);
  await db.query(`
    alter table scope_evenements drop constraint if exists scope_evenements_session_index_chk
  `);
  await db.query(`
    alter table scope_evenements add constraint scope_evenements_session_index_chk
      check (session_index is null or session_index >= 1)
  `);
  await db.query(`
    create index if not exists scope_evenements_exercice_id_idx
      on scope_evenements (exercice_id)
  `);
  await db.query(`
    create unique index if not exists scope_evenements_exercice_session_uq
      on scope_evenements (exercice_id, session_index)
      where exercice_id is not null and session_index is not null
  `);
}

async function migrateParticipationPolicyEngine1(){
  const policy = require('./_scope-participation-policy');
  await db.query(`
    create table if not exists scope_participation_motifs (
      motif_id text primary key,
      motif_type text not null,
      label text not null,
      actif boolean not null default true,
      historique boolean not null default false,
      display_order integer not null default 999,
      group_code text not null default 'operationnel',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_participation_motifs_type_chk check (motif_type in ('EXCUSE','DISPENSE')),
      constraint scope_participation_motifs_id_chk check (length(trim(motif_id)) > 0),
      constraint scope_participation_motifs_label_chk check (length(trim(label)) > 0)
    )
  `);
  await db.query(`
    create table if not exists scope_participation_policies (
      domain_code text primary key references scope_domaines(code),
      policy_version text not null,
      config jsonb not null,
      actif boolean not null default true,
      commentaire text,
      auteur_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await db.query(`alter table scope_evenements add column if not exists participation_policy_version text`);
  await db.query(`alter table scope_evenements add column if not exists participation_policy_snapshot jsonb`);
  const motifs = policy.motifCatalog();
  for(const motif of motifs){
    await db.query(
      `insert into scope_participation_motifs(motif_id, motif_type, label, actif, historique, display_order, group_code)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (motif_id) do nothing`,
      [motif.id, motif.type, motif.label, motif.active !== false, motif.historical === true, motif.order, motif.group]
    );
  }
  for(const row of policy.listDefaultPolicies()){
    await db.query(
      `insert into scope_participation_policies(domain_code, policy_version, config, commentaire)
       values ($1,$2,$3::jsonb,$4)
       on conflict (domain_code) do nothing`,
      [row.domainCode, row.policyVersion, JSON.stringify(row), 'Configuration SDIS NV par défaut - équivalence V1']
    );
  }
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-participation-policy-engine-1') on conflict (version) do nothing`);
}

async function migrateConfigurationFormationUxReferentialsFinish5(){
  const policy = require('./_scope-participation-policy');
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_motif_val_chk`);
  await db.query(`
    alter table scope_participations add constraint scope_participations_motif_val_chk check (
      motif_absence is null or length(trim(motif_absence)) > 0
    )
  `);
  await db.query(`
    create table if not exists scope_participation_statuses (
      status_id text primary key,
      label text not null,
      base_status text not null,
      actif boolean not null default true,
      historique boolean not null default false,
      display_order integer not null default 999,
      group_code text not null default 'operationnel',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_participation_statuses_base_chk check (base_status in ('PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','PERMUTATION')),
      constraint scope_participation_statuses_id_chk check (length(trim(status_id)) > 0),
      constraint scope_participation_statuses_label_chk check (length(trim(label)) > 0)
    )
  `);
  for(const status of policy.statusCatalog().filter((row) => !row.system)){
    await db.query(
      `insert into scope_participation_statuses(status_id, label, base_status, actif, historique, display_order, group_code, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       on conflict (status_id) do nothing`,
      [
        status.id,
        status.label,
        ['PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','PERMUTATION'].includes(status.id) ? status.id : 'PRESENT',
        status.active !== false,
        status.historical === true,
        status.order,
        status.group || 'operationnel',
        JSON.stringify({ source: 'STATUS_LIBRARY', system_behavior: status.id })
      ]
    );
  }
}

async function migrateConfigurationReferentialsLifecycleRepair51(){
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-configuration-referentials-lifecycle-repair-5-1') on conflict (version) do nothing`);
}

async function migrateGenericEventSessionPolicyArchitecture1(){
  const catalog = require('./_scope-generic-event-catalog');
  const policy = require('./_scope-participation-policy');
  await db.query(`
    create table if not exists scope_event_definitions (
      definition_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      label text not null,
      domain text not null references scope_domaines(code),
      description text,
      status text not null default 'ACTIF',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_event_definitions_status_chk check (status in ('ACTIF','INACTIF','ARCHIVE')),
      constraint scope_event_definitions_code_chk check (length(trim(code)) > 0),
      constraint scope_event_definitions_label_chk check (length(trim(label)) > 0)
    )
  `);
  await db.query(`create index if not exists scope_event_definitions_domain_idx on scope_event_definitions(domain, status)`);
  await db.query(`
    create table if not exists scope_participation_policy_versions (
      policy_version_id uuid primary key default gen_random_uuid(),
      policy_code text not null,
      domain text not null references scope_domaines(code),
      version_code text not null,
      valid_from date,
      valid_to date,
      config jsonb not null default '{}'::jsonb,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_policy_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
      constraint scope_policy_versions_unique unique(policy_code, version_code),
      constraint scope_policy_versions_code_chk check (length(trim(policy_code)) > 0),
      constraint scope_policy_versions_version_chk check (length(trim(version_code)) > 0)
    )
  `);
  await db.query(`create index if not exists scope_policy_versions_domain_dates_idx on scope_participation_policy_versions(domain, valid_from, valid_to) where active is true`);
  await db.query(`
    create table if not exists scope_event_definition_versions (
      definition_version_id uuid primary key default gen_random_uuid(),
      definition_id uuid not null references scope_event_definitions(definition_id),
      version_code text not null,
      valid_from date,
      valid_to date,
      mode_organisation text not null default 'SIMPLE',
      session_count integer not null default 1,
      policy_version_id uuid references scope_participation_policy_versions(policy_version_id),
      population_rule jsonb not null default '{}'::jsonb,
      numbering_pattern text,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_event_definition_versions_mode_chk check (mode_organisation in ('SIMPLE','MULTI_SESSION')),
      constraint scope_event_definition_versions_sessions_chk check (
        (mode_organisation = 'SIMPLE' and session_count = 1)
        or (mode_organisation = 'MULTI_SESSION' and session_count >= 2)
      ),
      constraint scope_event_definition_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
      constraint scope_event_definition_versions_unique unique(definition_id, version_code)
    )
  `);
  await db.query(`create index if not exists scope_event_definition_versions_lookup_idx on scope_event_definition_versions(definition_id, valid_from, valid_to) where active is true`);
  await db.query(`alter table scope_exercices add column if not exists definition_version_id uuid references scope_event_definition_versions(definition_version_id)`);
  await db.query(`alter table scope_exercices add column if not exists policy_version_id uuid references scope_participation_policy_versions(policy_version_id)`);
  await db.query(`alter table scope_exercices add column if not exists engine_route text`);
  await db.query(`alter table scope_exercices add column if not exists configuration_snapshot jsonb`);
  await db.query(`alter table scope_evenements add column if not exists definition_version_id uuid references scope_event_definition_versions(definition_version_id)`);
  await db.query(`alter table scope_evenements add column if not exists policy_version_id uuid references scope_participation_policy_versions(policy_version_id)`);
  await db.query(`alter table scope_evenements add column if not exists engine_route text`);
  await db.query(`alter table scope_evenements add column if not exists engine_snapshot jsonb`);
  await db.query(`alter table scope_evenements drop constraint if exists scope_evenements_engine_route_chk`);
  await db.query(`
    alter table scope_evenements add constraint scope_evenements_engine_route_chk
      check (engine_route is null or engine_route in ('SIMPLE_LEGACY','PR_LEGACY','GENERIC_SIMPLE','GENERIC_MULTI_SESSION'))
  `);
  await db.query(`alter table scope_exercices drop constraint if exists scope_exercices_engine_route_chk`);
  await db.query(`
    alter table scope_exercices add constraint scope_exercices_engine_route_chk
      check (engine_route is null or engine_route in ('SIMPLE_LEGACY','PR_LEGACY','GENERIC_SIMPLE','GENERIC_MULTI_SESSION'))
  `);
  for(const row of policy.listDefaultPolicies()){
    const version = catalog.policyVersionFromDomainPolicy(row, { year: 2026 });
    await db.query(
      `insert into scope_participation_policy_versions(policy_code, domain, version_code, valid_from, valid_to, config, metadata)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
       on conflict (policy_code, version_code) do nothing`,
      [version.policy_code, version.domain, version.version_code, version.valid_from, version.valid_to, JSON.stringify(version.config), JSON.stringify(version.metadata)]
    );
  }
  const dapMultiPolicy = policy.resolveParticipationPolicy('DAP');
  const dapMultiConfig = Object.assign({}, dapMultiPolicy, {
    policyVersion: 'dap-multisession-2026',
    activeStatuses: (dapMultiPolicy.activeStatuses || []).filter((status) => status !== 'PERMUTATION'),
    behavior: Object.assign({}, dapMultiPolicy.behavior || {}, {
      propagationScope: 'ALL_EXERCISE_SESSIONS',
      deduplicationScope: 'EXERCISE'
    })
  });
  await db.query(
    `insert into scope_participation_policy_versions(policy_code, domain, version_code, valid_from, valid_to, config, metadata)
     values ('DAP-MULTISESSION','DAP','2026','2026-01-01','2026-12-31',$1::jsonb,'{"source":"generic_event_session_policy_architecture_1","explicit":true}'::jsonb)
     on conflict (policy_code, version_code) do nothing`,
    [JSON.stringify(dapMultiConfig)]
  );
  await db.query(
    `insert into scope_event_definitions(code, label, domain, description, status, metadata)
     values ('DAP-FORMATION-GROUPEE','Formation groupée DAP','DAP','Premier modèle générique raccordable au Multi-session V2 validé.','ACTIF','{"source":"generic_event_session_policy_architecture_1","explicit":true}'::jsonb)
     on conflict (code) do nothing`
  );
  await db.query(`
    insert into scope_event_definition_versions(definition_id, version_code, valid_from, valid_to, mode_organisation, session_count, policy_version_id, population_rule, numbering_pattern, metadata)
    select d.definition_id, '2026', '2026-01-01', '2026-12-31', 'MULTI_SESSION', 2, pv.policy_version_id,
           '{"type":"SCOPE_TARGET_RULE","domain":"DAP","scope":"CIBLES_EVENEMENT"}'::jsonb,
           '{label} {index.major}.{index.minor}',
           '{"source":"generic_event_session_policy_architecture_1","reference":"DAP-FORMATION-GROUPEE-1-2026"}'::jsonb
    from scope_event_definitions d
    join scope_participation_policy_versions pv on pv.policy_code = 'DAP-MULTISESSION' and pv.version_code = '2026'
    where d.code = 'DAP-FORMATION-GROUPEE'
    on conflict (definition_id, version_code) do nothing
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-generic-event-session-policy-architecture-1') on conflict (version) do nothing`);
}

async function migrateMultiSessionV2Foundation1(){
  await db.query(`
    create table if not exists scope_multisessions_v2 (
      multisession_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      label text not null,
      domain text not null references scope_domaines(code),
      period text,
      status text not null default 'OUVERTE',
      closed_at timestamptz,
      closed_by text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_multisessions_v2_status_chk check (status in ('PLANIFIEE','OUVERTE','CLOTUREE','ANNULEE')),
      constraint scope_multisessions_v2_code_chk check (length(trim(code)) > 0),
      constraint scope_multisessions_v2_label_chk check (length(trim(label)) > 0)
    )
  `);
  await db.query(`
    create table if not exists scope_multisession_v2_sessions (
      multisession_session_id uuid primary key default gen_random_uuid(),
      multisession_id uuid not null references scope_multisessions_v2(multisession_id) on delete cascade,
      event_id uuid not null references scope_evenements(evenement_id) on delete cascade,
      sequence integer not null,
      status text not null default 'OUVERTE',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_multisession_v2_sessions_sequence_chk check (sequence >= 1),
      constraint scope_multisession_v2_sessions_status_chk check (status in ('PLANIFIEE','OUVERTE','CLOTUREE','ANNULEE')),
      constraint scope_multisession_v2_sessions_event_uq unique (event_id),
      constraint scope_multisession_v2_sessions_sequence_uq unique (multisession_id, sequence)
    )
  `);
  await db.query(`
    create table if not exists scope_multisession_v2_population (
      multisession_id uuid not null references scope_multisessions_v2(multisession_id) on delete cascade,
      person_id text not null references scope_personnes(id),
      snapshot jsonb not null default '{}'::jsonb,
      provenance text not null default 'ATTENDUS_CONSOLIDES',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (multisession_id, person_id)
    )
  `);
  await db.query(`
    create table if not exists scope_multisession_v2_participations (
      multisession_id uuid not null references scope_multisessions_v2(multisession_id) on delete cascade,
      session_id uuid not null references scope_evenements(evenement_id) on delete cascade,
      person_id text not null references scope_personnes(id),
      attendance_status text not null,
      role text not null default 'PARTICIPANT',
      reason text,
      created_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (multisession_id, session_id, person_id, role),
      constraint scope_multisession_v2_participations_status_chk check (
        attendance_status in ('PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_RENSEIGNE','NON_CONCERNE')
      ),
      constraint scope_multisession_v2_participations_role_chk check (
        role in ('PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE')
      )
    )
  `);
  await db.query(`create index if not exists scope_multisession_v2_sessions_lookup_idx on scope_multisession_v2_sessions(multisession_id, event_id)`);
  await db.query(`create index if not exists scope_multisession_v2_population_person_idx on scope_multisession_v2_population(person_id)`);
  await db.query(`
    insert into scope_multisessions_v2(code, label, domain, period, status, metadata)
    select 'DAP-FORMATION-GROUPEE-1-2026', 'Formation groupée DAP', 'DAP', '2026', 'OUVERTE',
           '{"activation":"MULTISESSION-V2-FOUNDATION-1","explicit":true}'::jsonb
    where exists (
      select 1 from scope_evenements
      where domaine_code = 'DAP' and libelle in ('Formation groupée DAP 1.1','Formation groupée DAP 1.2')
    )
    on conflict (code) do nothing
  `);
  await db.query(`
    insert into scope_multisession_v2_sessions(multisession_id, event_id, sequence, status, metadata)
    select ms.multisession_id, e.evenement_id,
           case when e.libelle = 'Formation groupée DAP 1.1' then 1 else 2 end,
           case when e.statut = 'ANNULE' then 'ANNULEE' when e.statut = 'REALISE' then 'CLOTUREE' else 'OUVERTE' end,
           jsonb_build_object('activation','MULTISESSION-V2-FOUNDATION-1','source','existing_event')
    from scope_multisessions_v2 ms
    join scope_evenements e on e.domaine_code = 'DAP'
      and e.libelle in ('Formation groupée DAP 1.1','Formation groupée DAP 1.2')
    where ms.code = 'DAP-FORMATION-GROUPEE-1-2026'
    on conflict (event_id) do nothing
  `);
  await db.query(`
    insert into scope_multisession_v2_population(multisession_id, person_id, snapshot, provenance)
    select distinct ms.multisession_id, a.personne_id,
           jsonb_build_object('activation','MULTISESSION-V2-FOUNDATION-1','source','scope_attendus','event_id',a.evenement_id),
           'ATTENDUS_CONSOLIDES'
    from scope_multisessions_v2 ms
    join scope_multisession_v2_sessions s on s.multisession_id = ms.multisession_id
    join scope_attendus a on a.evenement_id = s.event_id and a.inclus is not false
    where ms.code = 'DAP-FORMATION-GROUPEE-1-2026'
    on conflict (multisession_id, person_id) do nothing
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-multisession-v2-foundation-1') on conflict (version) do nothing`);
}

async function migrateEventTemporalConfigurationFoundation9(){
  await db.query(`alter table scope_evenements add column if not exists heure_debut_prevue text`);
  await db.query(`alter table scope_evenements add column if not exists heure_fin_prevue text`);
  await db.query(`alter table scope_evenements add column if not exists heure_debut_reelle text`);
  await db.query(`alter table scope_evenements add column if not exists heure_fin_reelle text`);
  await db.query(`alter table scope_evenements add column if not exists duree_reelle_minutes integer`);
  await db.query(`
    update scope_evenements
       set heure_debut_prevue = coalesce(heure_debut_prevue, heure_debut),
           heure_fin_prevue = coalesce(heure_fin_prevue, heure_fin),
           heure_debut_reelle = coalesce(heure_debut_reelle, heure_debut),
           heure_fin_reelle = coalesce(heure_fin_reelle, heure_fin)
     where heure_debut is not null or heure_fin is not null
  `);
  await db.query(`alter table scope_participations add column if not exists heure_debut_individuelle text`);
  await db.query(`alter table scope_participations add column if not exists heure_fin_individuelle text`);
  await db.query(`alter table scope_participations add column if not exists duree_individuelle_minutes integer`);
  await db.query(`create index if not exists scope_evenements_temporal_idx on scope_evenements(date, heure_debut_prevue, heure_debut_reelle)`);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-event-temporal-configuration-foundation-9') on conflict (version) do nothing`);
}

async function migrateEventPopulationTimeStaffingWorkflowClose10(){
  await db.query(`alter table scope_participations add column if not exists creation_dl boolean default false`);
  await db.query(`alter table scope_participations add column if not exists preparation_dl_minutes integer`);
  await db.query(`alter table scope_participations drop constraint if exists scope_participations_preparation_dl_chk`);
  await db.query(`
    alter table scope_participations
      add constraint scope_participations_preparation_dl_chk
      check (preparation_dl_minutes is null or preparation_dl_minutes >= 0)
  `);
  await db.query(`create index if not exists scope_participations_creation_dl_idx on scope_participations(personne_id, evenement_id) where creation_dl is true`);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-event-population-time-staffing-workflow-close-10') on conflict (version) do nothing`);
}

async function migrateEventWorkflowAssignmentStaffingSemanticRepair101(){
  await db.query(`alter table scope_evenements add column if not exists hidden_at timestamptz`);
  await db.query(`alter table scope_evenements add column if not exists hidden_par text`);
  await db.query(`create index if not exists scope_evenements_hidden_idx on scope_evenements(hidden_at) where hidden_at is null`);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-event-workflow-assignment-staffing-semantic-repair-10-1') on conflict (version) do nothing`);
}

async function migrateEventAssignedPopulationPolicyStaffingClose102(){
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-event-assigned-population-policy-staffing-close-10-2') on conflict (version) do nothing`);
}

async function migrateEventAssignedPopulationReactivationDeleteFinal103(){
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-event-assigned-population-reactivation-delete-final-10-3') on conflict (version) do nothing`);
}

async function migrateParticipantSelectionRuntimeRootRepair1031(){
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-participant-selection-runtime-root-repair-10-3-1') on conflict (version) do nothing`);
}

async function migrateAttendusRetraitSchemaContractRepair1032(){
  const allowed = [
    'EXCEPTION_RETRAIT',
    'NON_ASSIGNE',
    'PERMUTATION_SOURCE_CORRIGEE',
    'RESET_SAISIE',
    'SUPPRESSION_METIER',
    'DESASSIGNATION',
    'INDISPONIBLE'
  ];
  const existing = await db.query(
    `select distinct origine_retrait as value
       from scope_attendus
      where origine_retrait is not null
        and origine_retrait not in (${allowed.map((_, index) => `$${index + 1}`).join(', ')})`,
    allowed
  );
  const unexpected = (existing.rows || []).map((row) => row.value).filter(Boolean);
  if(unexpected.length){
    throw new Error(`scope_attendus.origine_retrait contient des valeurs hors contrat, non modifiées : ${unexpected.join(', ')}`);
  }
  await db.query(`alter table scope_attendus drop constraint if exists scope_attendus_retrait_chk`);
  await db.query(`
    alter table scope_attendus
    add constraint scope_attendus_retrait_chk
    check (
      origine_retrait is null
      or origine_retrait in (
        'EXCEPTION_RETRAIT',
        'NON_ASSIGNE',
        'PERMUTATION_SOURCE_CORRIGEE',
        'RESET_SAISIE',
        'SUPPRESSION_METIER',
        'DESASSIGNATION',
        'INDISPONIBLE'
      )
    )
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-attendus-retrait-schema-contract-repair-10-3-2') on conflict (version) do nothing`);
}

async function migrateCancelledEventSingleSourceOfTruth11(){
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-cancelled-event-single-source-of-truth-11') on conflict (version) do nothing`);
}

async function migrateStatComReferentialConfig1(){
  const statcom = require('./_scope-statcom-referential');
  await db.query(`
    create table if not exists scope_statcom_referentiel (
      statcom_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      label text not null,
      domain text,
      category text,
      oi_code text,
      specialization text,
      specialization_label text,
      valid_from date not null default '2023-01-01',
      valid_to date,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_statcom_code_chk check (length(trim(code)) > 0),
      constraint scope_statcom_label_chk check (length(trim(label)) > 0),
      constraint scope_statcom_dates_chk check (valid_to is null or valid_from <= valid_to)
    )
  `);
  await db.query(`create index if not exists scope_statcom_lookup_idx on scope_statcom_referentiel(domain, category, active, valid_from, valid_to)`);
  await db.query(`alter table scope_statcom_referentiel add column if not exists specialization_label text`);
  await db.query(`create index if not exists scope_statcom_oi_idx on scope_statcom_referentiel(oi_code, specialization)`);
  await db.query(`alter table scope_event_definition_versions add column if not exists statcom_code text`);
  await db.query(`alter table scope_event_definition_versions add column if not exists statcom_snapshot jsonb`);
  await db.query(`alter table scope_evenements add column if not exists statcom_code text`);
  await db.query(`alter table scope_evenements add column if not exists statcom_snapshot jsonb`);
  await db.query(`alter table scope_exercices add column if not exists statcom_code text`);
  await db.query(`alter table scope_exercices add column if not exists statcom_snapshot jsonb`);
  await db.query(`create index if not exists scope_evenements_statcom_idx on scope_evenements(statcom_code, date)`);
  await db.query(`create index if not exists scope_event_definition_versions_statcom_idx on scope_event_definition_versions(statcom_code)`);
  for(const row of statcom.initialStatComCodes()){
    await db.query(
      `insert into scope_statcom_referentiel(code, label, domain, category, oi_code, specialization, specialization_label, valid_from, valid_to, active, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       on conflict (code) do nothing`,
      [
        row.code,
        row.label,
        row.domain,
        row.category,
        row.oi,
        row.specialization,
        row.specialization,
        row.valid_from,
        row.valid_to,
        row.active,
        JSON.stringify(row.metadata || {})
      ]
    );
  }
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-statcom-referential-config-1') on conflict (version) do nothing`);
}

async function migrateStatComSpecialisationPersistenceRepair2(){
  await db.query(`alter table scope_statcom_referentiel add column if not exists specialization_label text`);
  await db.query(`
    update scope_statcom_referentiel
       set specialization_label = specialization
     where specialization_label is null
       and specialization is not null
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-statcom-specialisation-persistence-repair-2') on conflict (version) do nothing`);
}

async function migrateQuoVadisCore1(){
  await db.query(`
    create table if not exists scope_lieux (
      lieu_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      nom_court text not null,
      nom_complet text,
      adresse_ligne1 text,
      npa text,
      localite text,
      oi_code text,
      site_code text,
      actif boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_lieux_code_chk check (length(trim(code)) > 0),
      constraint scope_lieux_nom_chk check (length(trim(nom_court)) > 0)
    )
  `);
  await db.query(`create index if not exists scope_lieux_oi_idx on scope_lieux(oi_code, actif)`);
  for(const row of [
    ['G1-CASERNE', 'Caserne G1', 'G1'],
    ['B1-CASERNE', 'Caserne B1', 'B1'],
    ['C1-CASERNE', 'Caserne C1', 'C1'],
    ['B2-CASERNE', 'Caserne B2', 'B2']
  ]){
    await db.query(
      `insert into scope_lieux(code, nom_court, oi_code, metadata)
       values ($1,$2,$3,'{"source":"QUO-VADIS-CORE-1","addressKnown":false}'::jsonb)
       on conflict (code) do update set nom_court = excluded.nom_court, oi_code = excluded.oi_code, updated_at = now()`,
      row
    );
  }
  await db.query(`
    create table if not exists scope_quo_vadis_programmes (
      programme_id uuid primary key default gen_random_uuid(),
      annee integer not null unique,
      code text not null unique,
      libelle text not null,
      periode_debut date not null,
      periode_fin date not null,
      statut text not null default 'PREPARATION',
      published_at timestamptz,
      archived_at timestamptz,
      revision integer not null default 1,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_programmes_statut_chk check (statut in ('PREPARATION','PUBLIE','ARCHIVE')),
      constraint scope_qv_programmes_dates_chk check (periode_debut <= periode_fin),
      constraint scope_qv_programmes_annee_chk check (annee >= 2027)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_programme_history (
      history_id uuid primary key default gen_random_uuid(),
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      revision integer not null,
      change_type text not null,
      snapshot jsonb not null default '{}'::jsonb,
      changed_by text,
      changed_at timestamptz not null default now()
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_calendar_days (
      calendar_day_id uuid primary key default gen_random_uuid(),
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      jour date not null,
      type_jour text not null,
      libelle text not null,
      source text not null default 'MANUEL',
      neutralise boolean not null default false,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      constraint scope_qv_calendar_type_chk check (type_jour in ('VACANCES_SCOLAIRES','FERIE','VEILLE_FERIE','WEEKEND_FERIE','NEUTRALISATION_INTERNE','DEROGATION')),
      constraint scope_qv_calendar_unique unique(programme_id, jour, type_jour, libelle)
    )
  `);
  await db.query(`create index if not exists scope_qv_calendar_day_idx on scope_quo_vadis_calendar_days(programme_id, jour)`);
  await db.query(`
    create table if not exists scope_quo_vadis_planning_rules (
      rule_id uuid primary key default gen_random_uuid(),
      code text not null,
      version_code text not null,
      domain text references scope_domaines(code),
      definition_version_id uuid references scope_event_definition_versions(definition_version_id),
      valid_from date,
      valid_to date,
      day_policy jsonb not null default '{}'::jsonb,
      time_policy jsonb not null default '{}'::jsonb,
      duration_minutes integer,
      forbidden_periods jsonb not null default '[]'::jsonb,
      prerequisites jsonb not null default '[]'::jsonb,
      capacity jsonb not null default '{}'::jsonb,
      default_lieu_id uuid references scope_lieux(lieu_id),
      derogation_allowed boolean not null default true,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_rules_unique unique(code, version_code),
      constraint scope_qv_rules_duration_chk check (duration_minutes is null or duration_minutes > 0),
      constraint scope_qv_rules_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_definitions (
      cursus_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      libelle text not null,
      description text,
      statut text not null default 'ACTIF',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_cursus_statut_chk check (statut in ('ACTIF','INACTIF','ARCHIVE'))
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_versions (
      cursus_version_id uuid primary key default gen_random_uuid(),
      cursus_id uuid not null references scope_quo_vadis_cursus_definitions(cursus_id) on delete cascade,
      version_code text not null,
      valid_from date,
      valid_to date,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_cursus_versions_unique unique(cursus_id, version_code),
      constraint scope_qv_cursus_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_steps (
      step_id uuid primary key default gen_random_uuid(),
      cursus_version_id uuid not null references scope_quo_vadis_cursus_versions(cursus_version_id) on delete cascade,
      step_code text not null,
      libelle text not null,
      ordre integer not null,
      logical_year integer not null default 1,
      definition_version_id uuid references scope_event_definition_versions(definition_version_id),
      usual_start_time text,
      usual_end_time text,
      crosses_midnight boolean not null default false,
      preferred_day text,
      metadata jsonb not null default '{}'::jsonb,
      constraint scope_qv_cursus_steps_unique unique(cursus_version_id, step_code),
      constraint scope_qv_cursus_steps_order_chk check (ordre >= 1),
      constraint scope_qv_cursus_steps_year_chk check (logical_year >= 1)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_cohortes (
      cohorte_id uuid primary key default gen_random_uuid(),
      cursus_version_id uuid not null references scope_quo_vadis_cursus_versions(cursus_version_id),
      code text not null unique,
      libelle text not null,
      start_year integer not null,
      current_logical_year integer not null default 1,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_programmes (
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      cursus_id uuid not null references scope_quo_vadis_cursus_definitions(cursus_id) on delete cascade,
      retenu boolean not null default false,
      justification text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_cursus_programmes_pk primary key(programme_id, cursus_id)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_future_dates (
      future_date_id uuid primary key default gen_random_uuid(),
      target_year integer not null,
      date_debut date not null,
      heure_debut text,
      date_fin date,
      heure_fin text,
      activite_label text not null,
      domain text references scope_domaines(code),
      lieu_id uuid references scope_lieux(lieu_id),
      lieu_libre text,
      remarque text,
      converted_obligation_id uuid,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_future_year_chk check (target_year >= 2027),
      constraint scope_qv_future_label_chk check (length(trim(activite_label)) > 0)
    )
  `);
  await db.query(`create index if not exists scope_qv_future_year_idx on scope_quo_vadis_future_dates(target_year, date_debut)`);
  await db.query(`
    create table if not exists scope_quo_vadis_dps_organisation_versions (
      organisation_id uuid primary key default gen_random_uuid(),
      oi_code text not null,
      valid_from date not null,
      valid_to date,
      sections jsonb not null default '[]'::jsonb,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_dps_dates_chk check (valid_to is null or valid_from <= valid_to),
      constraint scope_qv_dps_unique unique(oi_code, valid_from)
    )
  `);
  await db.query(`
    create table if not exists scope_quo_vadis_obligations (
      obligation_id uuid primary key default gen_random_uuid(),
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      source_type text not null,
      source_ref text,
      definition_version_id uuid references scope_event_definition_versions(definition_version_id),
      cursus_step_id uuid references scope_quo_vadis_cursus_steps(step_id),
      cohorte_id uuid references scope_quo_vadis_cohortes(cohorte_id),
      title text not null,
      domain text references scope_domaines(code),
      cible_codes text[] not null default array[]::text[],
      statut text not null default 'A_PLANIFIER',
      priority integer not null default 100,
      imposed_start_at timestamptz,
      imposed_end_at timestamptz,
      selected_proposal_id uuid,
      scope_evenement_id uuid references scope_evenements(evenement_id) on delete set null,
      exercise_id uuid references scope_exercices(exercice_id) on delete set null,
      statcom_policy text not null default 'A_CONFIRMER',
      statcom_code text,
      lieu_id uuid references scope_lieux(lieu_id),
      lieu_libre text,
      numbering_pattern text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_obligations_source_chk check (source_type in ('DEFINITION','RECURRENT','MULTI_SESSION','CURSUS','DPS_RULE','FUTURE_DATE','MANUAL')),
      constraint scope_qv_obligations_statut_chk check (statut in ('A_PLANIFIER','PROPOSE','PLANIFIE','NON_RETENU','ANNULE')),
      constraint scope_qv_obligations_statcom_chk check (statcom_policy in ('OBLIGATOIRE','FACULTATIF','NON_APPLICABLE','A_CONFIRMER')),
      constraint scope_qv_obligations_title_chk check (length(trim(title)) > 0)
    )
  `);
  await db.query(`create index if not exists scope_qv_obligations_programme_idx on scope_quo_vadis_obligations(programme_id, statut, domain)`);
  await db.query(`create index if not exists scope_qv_obligations_event_idx on scope_quo_vadis_obligations(scope_evenement_id) where scope_evenement_id is not null`);
  await db.query(`create unique index if not exists scope_qv_obligations_source_uq on scope_quo_vadis_obligations(programme_id, source_type, coalesce(source_ref, ''))`);
  await db.query(`
    create table if not exists scope_quo_vadis_proposals (
      proposal_id uuid primary key default gen_random_uuid(),
      obligation_id uuid not null references scope_quo_vadis_obligations(obligation_id) on delete cascade,
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      day_class text not null default 'AUTORISE',
      status text not null default 'PROPOSE',
      reasons jsonb not null default '[]'::jsonb,
      conflict_summary jsonb not null default '{}'::jsonb,
      lieu_id uuid references scope_lieux(lieu_id),
      lieu_libre text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_proposals_day_chk check (day_class in ('PREFERE','AUTORISE','DECONSEILLE','INTERDIT')),
      constraint scope_qv_proposals_status_chk check (status in ('PROPOSE','RETENU','ECARTE','DEROGATION')),
      constraint scope_qv_proposals_dates_chk check (starts_at < ends_at)
    )
  `);
  await db.query(`create index if not exists scope_qv_proposals_obligation_idx on scope_quo_vadis_proposals(obligation_id, starts_at)`);
  await db.query(`
    alter table scope_quo_vadis_obligations
      add constraint scope_qv_obligations_selected_proposal_fk
      foreign key (selected_proposal_id) references scope_quo_vadis_proposals(proposal_id) on delete set null
      not valid
  `).catch(async (error) => {
    if(!String(error && error.message || '').includes('already exists')) throw error;
  });
  await db.query(`
    insert into scope_quo_vadis_programmes(annee, code, libelle, periode_debut, periode_fin, statut, metadata)
    values (2027, 'QV-2027', 'Programme QUO VADIS 2027', '2027-01-01', '2028-03-31', 'PREPARATION',
            '{"source":"QUO-VADIS-CORE-1","firstNativeProgramme":true}'::jsonb)
    on conflict (annee) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
    values
      ('FORMATION-GENERALE','2027','FOBA',
       '{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,
       '{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb, 120,
       '{"source":"QUO-VADIS-CORE-1","rule":"friday_excluded_training"}'::jsonb),
      ('DAP-VENDREDI-AUTORISE','2027','DAP',
       '{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"AUTORISE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,
       '{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb, 120,
       '{"source":"QUO-VADIS-CORE-1","exception":"DAP may allow Friday"}'::jsonb)
    on conflict (code, version_code) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_cursus_definitions(code, libelle, description, metadata)
    values ('CI-DPS', 'CI DPS', 'Cursus générique CI DPS sur deux années logiques.', '{"source":"QUO-VADIS-CORE-1"}'::jsonb)
    on conflict (code) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_cursus_versions(cursus_id, version_code, valid_from, metadata)
    select d.cursus_id, '2027', '2027-01-01', '{"source":"QUO-VADIS-CORE-1"}'::jsonb
    from scope_quo_vadis_cursus_definitions d
    where d.code = 'CI-DPS'
    on conflict (cursus_id, version_code) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_cursus_steps(cursus_version_id, step_code, libelle, ordre, logical_year, usual_start_time, usual_end_time, crosses_midnight, preferred_day, metadata)
    select v.cursus_version_id, s.step_code, s.libelle, s.ordre, s.logical_year, s.usual_start_time, s.usual_end_time, s.crosses_midnight, s.preferred_day, s.metadata::jsonb
    from scope_quo_vadis_cursus_versions v
    join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
    cross join (values
      ('M01','Module 1',1,1,'19:30','21:30',false,'THURSDAY','{"module":1}'),
      ('M02','Module 2',2,1,'19:30','21:30',false,'THURSDAY','{"module":2}'),
      ('M03','Module 3',3,1,'19:30','21:30',false,'THURSDAY','{"module":3}'),
      ('M04','Module 4',4,1,'19:30','21:30',false,'THURSDAY','{"module":4}'),
      ('M05','Module 5',5,1,'19:30','21:30',false,'THURSDAY','{"module":5}'),
      ('M06','Module 6',6,2,'19:30','21:30',false,'THURSDAY','{"module":6}'),
      ('M07','Module 7',7,2,'19:30','21:30',false,'THURSDAY','{"module":7}'),
      ('M08','Module 8',8,2,'19:30','21:30',false,'THURSDAY','{"module":8}'),
      ('M09','Module 9',9,2,'19:30','21:30',false,'THURSDAY','{"module":9}'),
      ('M10','Module 10 - test final',10,2,'18:00','08:00',true,'SATURDAY','{"module":10,"finalTest":true}')
    ) as s(step_code, libelle, ordre, logical_year, usual_start_time, usual_end_time, crosses_midnight, preferred_day, metadata)
    where d.code = 'CI-DPS' and v.version_code = '2027'
    on conflict (cursus_version_id, step_code) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_cohortes(cursus_version_id, code, libelle, start_year, current_logical_year, metadata)
    select v.cursus_version_id, c.code, c.libelle, c.start_year, c.current_logical_year, c.metadata::jsonb
    from scope_quo_vadis_cursus_versions v
    join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
    cross join (values
      ('CI-DPS-2026', 'CI DPS cohorte 2026', 2026, 2, '{"source":"QUO-VADIS-CORE-1","programme2027Scope":"modules 6-10"}'),
      ('CI-DPS-2027', 'CI DPS cohorte 2027', 2027, 1, '{"source":"QUO-VADIS-CORE-1","programme2027Scope":"modules 1-5"}')
    ) as c(code, libelle, start_year, current_logical_year, metadata)
    where d.code = 'CI-DPS' and v.version_code = '2027'
    on conflict (code) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_cursus_programmes(programme_id, cursus_id, retenu, justification, metadata)
    select p.programme_id, d.cursus_id, true, 'Cursus CI DPS retenu pour valider la planification 2027 sur deux années.', '{"source":"QUO-VADIS-PILOTAGE-2","defaultSelection":true}'::jsonb
    from scope_quo_vadis_programmes p
    join scope_quo_vadis_cursus_definitions d on d.code = 'CI-DPS'
    where p.annee = 2027
    on conflict (programme_id, cursus_id) do nothing
  `);
  await db.query(`
    insert into scope_quo_vadis_dps_organisation_versions(oi_code, valid_from, sections, metadata)
    values
      ('G1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]},{"section":"N04","halfSections":["N04a","N04b"]},{"section":"N05","halfSections":["N05a","N05b"]},{"section":"N06","reserve":true,"label":"G1 N06"}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
      ('C1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
      ('B1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
      ('B2', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb)
    on conflict (oi_code, valid_from) do nothing
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-core-1') on conflict (version) do nothing`);
}

async function migrateQuoVadisPilotage2(){
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_programmes (
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      cursus_id uuid not null references scope_quo_vadis_cursus_definitions(cursus_id) on delete cascade,
      retenu boolean not null default false,
      justification text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_qv_cursus_programmes_pk primary key(programme_id, cursus_id)
    )
  `);
  await db.query(`
    insert into scope_quo_vadis_cursus_programmes(programme_id, cursus_id, retenu, justification, metadata)
    select p.programme_id, d.cursus_id, true, 'Cursus CI DPS retenu pour valider la planification 2027 sur deux années.', '{"source":"QUO-VADIS-PILOTAGE-2","defaultSelection":true}'::jsonb
    from scope_quo_vadis_programmes p
    join scope_quo_vadis_cursus_definitions d on d.code = 'CI-DPS'
    where p.annee = 2027
    on conflict (programme_id, cursus_id) do nothing
  `);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-pilotage-2') on conflict (version) do nothing`);
}

async function migrateQuoVadisCoverage1(){
  await db.query(`alter table scope_quo_vadis_programmes drop constraint if exists scope_qv_programmes_statut_chk`);
  await db.query(`
    alter table scope_quo_vadis_programmes
      add constraint scope_qv_programmes_statut_chk
      check (statut in ('PREPARATION','VALIDATION','VALIDE','PUBLIE','ARCHIVE'))
  `).catch((error) => {
    if(!String(error && error.message || '').includes('already exists')) throw error;
  });
  await db.query(`alter table scope_quo_vadis_obligations drop constraint if exists scope_qv_obligations_source_chk`);
  await db.query(`
    alter table scope_quo_vadis_obligations
      add constraint scope_qv_obligations_source_chk
      check (source_type in ('DEFINITION','RECURRENT','MULTI_SESSION','CURSUS','DPS_RULE','FUTURE_DATE','HISTORIQUE','CYCLIQUE','OPTIONNELLE','MANUAL'))
  `).catch((error) => {
    if(!String(error && error.message || '').includes('already exists')) throw error;
  });
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists activity_kind text`);
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists periodicity_years integer`);
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists include_in_programme boolean`);
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists last_occurrence date`);
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists classification jsonb not null default '{}'::jsonb`);
  await db.query(`
    create table if not exists scope_quo_vadis_cursus_step_programmes (
      programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
      step_id uuid not null references scope_quo_vadis_cursus_steps(step_id) on delete cascade,
      retenu boolean not null default false,
      metadata jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      constraint scope_qv_cursus_step_programmes_pk primary key(programme_id, step_id)
    )
  `);
  const policies = [
    ['PLANIF-DPS','DPS','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:30","usualEnd":"21:30"}',120],
    ['PLANIF-DAP','DAP','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"AUTORISE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:30","usualEnd":"21:30"}',120],
    ['PLANIF-JSP','JSP','{"MONDAY":"AUTORISE","TUESDAY":"PREFERE","WEDNESDAY":"AUTORISE","THURSDAY":"AUTORISE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"18:30","usualEnd":"20:30"}',120],
    ['PLANIF-FOBA','FOBA','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:00","usualEnd":"21:30"}',150],
    ['PLANIF-FOCA','FOCA','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:00","usualEnd":"21:30"}',150],
    ['PLANIF-FOSPEC','FOSPEC','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:30","usualEnd":"21:30"}',120],
    ['PLANIF-PR','PR','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:30","usualEnd":"21:30"}',120],
    ['PLANIF-AUTO','AUTO','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}','{"usualStart":"19:30","usualEnd":"21:30"}',120]
  ];
  for(const [code, domain, days, times, duration] of policies){
    await db.query(
      `insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
       values ($1,'2027',$2,$3::jsonb,$4::jsonb,$5,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb)
       on conflict (code, version_code) do nothing`,
      [code, domain, days, times, duration]
    );
  }
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-coverage-1') on conflict (version) do nothing`);
}

async function migrateQuoVadisMoaRecovery1(){
  await db.query(
    `insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
     values ('PLANIF-FOCO','2027',null,'{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-MOA-RECOVERY-1","family":"FOCO"}'::jsonb)
     on conflict (code, version_code) do nothing`
  );
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-moa-recovery-1') on conflict (version) do nothing`);
}

async function migrateQuoVadisAgendaUx2(){
  if(await hasMigration('scope-quo-vadis-agenda-ux-2')) return;
  let lieuxRows = [];
  let salles = [];
  try {
    lieuxRows = (await db.query(`select * from scope_lieux`)).rows || [];
  } catch (_error) {
    lieuxRows = [];
  }
  try {
    salles = ((await db.query(`select distinct btrim(salle) as salle from scope_evenements where salle is not null and btrim(salle) <> ''`)).rows || [])
      .map((row) => row.salle);
  } catch (_error) {
    salles = [];
  }
  const plan = qvLieux.planLieuAddressConsolidation(lieuxRows, salles);
  for(const update of plan.updates){
    if(!update.lieuId) continue;
    await db.query(
      `update scope_lieux
          set adresse_ligne1 = case when coalesce(nullif(btrim(adresse_ligne1), ''), '') = '' then $2 else adresse_ligne1 end,
              npa = case when coalesce(nullif(btrim(npa), ''), '') = '' then $3 else npa end,
              localite = case when coalesce(nullif(btrim(localite), ''), '') = '' then $4 else localite end,
              metadata = coalesce(metadata, '{}'::jsonb) || $5::jsonb,
              updated_at = now()
        where lieu_id = $1`,
      [update.lieuId, update.adresseLigne1 || '', update.npa || '', update.localite || '', JSON.stringify({
        source: 'QUO-VADIS-AGENDA-UX-2',
        addressKnown: Boolean(update.adresseLigne1 || update.npa || update.localite)
      })]
    );
  }
  for(const insert of plan.inserts){
    await db.query(
      `insert into scope_lieux(code, nom_court, adresse_ligne1, npa, localite, oi_code, metadata)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)
       on conflict (code) do nothing`,
      [insert.code, insert.nomCourt, insert.adresseLigne1 || null, insert.npa || null, insert.localite || null, insert.oiCode,
        JSON.stringify({ source: 'QUO-VADIS-AGENDA-UX-2', addressKnown: Boolean(insert.adresseLigne1 || insert.npa || insert.localite) })]
    );
  }
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-agenda-ux-2') on conflict (version) do nothing`);
}

async function migrateQuoVadisToutesActivitesUx1(){
  if(await hasMigration('scope-quo-vadis-toutes-activites-ux-1')) return;
  for(const lieu of qvReferentials.OFFICIAL_LIEUX){
    await db.query(
      `insert into scope_lieux(code, nom_court, adresse_ligne1, npa, localite, oi_code, site_code, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       on conflict (code) do update set
         nom_court = coalesce(nullif(btrim(scope_lieux.nom_court), ''), excluded.nom_court),
         adresse_ligne1 = case when coalesce(nullif(btrim(scope_lieux.adresse_ligne1), ''), '') = '' then excluded.adresse_ligne1 else scope_lieux.adresse_ligne1 end,
         npa = case when coalesce(nullif(btrim(scope_lieux.npa), ''), '') = '' then excluded.npa else scope_lieux.npa end,
         localite = case when coalesce(nullif(btrim(scope_lieux.localite), ''), '') = '' then excluded.localite else scope_lieux.localite end,
         oi_code = coalesce(nullif(btrim(scope_lieux.oi_code), ''), excluded.oi_code),
         site_code = coalesce(nullif(btrim(scope_lieux.site_code), ''), excluded.site_code),
         metadata = coalesce(scope_lieux.metadata, '{}'::jsonb) || excluded.metadata,
         updated_at = now()`,
      [
        lieu.code,
        lieu.nomCourt,
        lieu.adresseLigne1 || null,
        lieu.npa || null,
        lieu.localite || null,
        lieu.oiCode,
        lieu.oiCode,
        JSON.stringify({
          source: 'QUO-VADIS-TOUTES-ACTIVITES-UX-1',
          kind: lieu.kind,
          addressKnown: Boolean(lieu.adresseLigne1 || lieu.localite)
        })
      ]
    );
  }
  await db.query(`
    create table if not exists scope_responsable_fonctions (
      code text primary key,
      libelle text not null,
      actif boolean not null default true,
      sort_order integer not null default 100,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_resp_fn_code_chk check (length(trim(code)) > 0),
      constraint scope_resp_fn_libelle_chk check (length(trim(libelle)) > 0)
    )
  `);
  for(const [index, libelle] of qvReferentials.RESPONSIBLE_FUNCTIONS.entries()){
    await db.query(
      `insert into scope_responsable_fonctions(code, libelle, sort_order, metadata)
       values ($1,$2,$3,$4::jsonb)
       on conflict (code) do update set libelle = excluded.libelle, sort_order = excluded.sort_order, updated_at = now()`,
      [libelle, libelle, index + 1, JSON.stringify({ source: 'QUO-VADIS-TOUTES-ACTIVITES-UX-1' })]
    );
  }
  await db.query(`
    create table if not exists scope_salles_theorie (
      salle_id uuid primary key default gen_random_uuid(),
      code text not null unique,
      libelle text not null,
      lieu_id uuid not null references scope_lieux(lieu_id),
      parent_salle_id uuid references scope_salles_theorie(salle_id),
      actif boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint scope_salles_theorie_code_chk check (length(trim(code)) > 0),
      constraint scope_salles_theorie_libelle_chk check (length(trim(libelle)) > 0)
    )
  `);
  const lieux = (await db.query(`select lieu_id, code from scope_lieux`)).rows || [];
  const lieuIdByCode = new Map(lieux.map((row) => [row.code, row.lieu_id]));
  const salleIdByCode = new Map();
  for(const room of qvReferentials.THEORY_ROOMS){
    const lieuId = lieuIdByCode.get(room.lieuCode);
    if(!lieuId) continue;
    const inserted = await db.query(
      `insert into scope_salles_theorie(code, libelle, lieu_id, metadata)
       values ($1,$2,$3,$4::jsonb)
       on conflict (code) do update set libelle = excluded.libelle, lieu_id = excluded.lieu_id, updated_at = now()
       returning salle_id, code`,
      [room.code, room.libelle, lieuId, JSON.stringify({ source: 'QUO-VADIS-TOUTES-ACTIVITES-UX-1', lieuCode: room.lieuCode, parentCode: room.parentCode })]
    );
    const row = inserted.rows && inserted.rows[0];
    if(row) salleIdByCode.set(row.code, row.salle_id);
  }
  for(const room of qvReferentials.THEORY_ROOMS){
    if(!room.parentCode) continue;
    const salleId = salleIdByCode.get(room.code);
    const parentId = salleIdByCode.get(room.parentCode);
    if(!salleId || !parentId) continue;
    await db.query(`update scope_salles_theorie set parent_salle_id = $2, updated_at = now() where salle_id = $1`, [salleId, parentId]);
  }
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists salle_theorie_id uuid references scope_salles_theorie(salle_id)`);
  await db.query(`alter table scope_quo_vadis_obligations add column if not exists responsable_fonction_code text references scope_responsable_fonctions(code)`);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-quo-vadis-toutes-activites-ux-1') on conflict (version) do nothing`);
  await db.query(`alter table scope_quo_vadis_cursus_step_programmes alter column retenu set default false`);
  await db.query(`alter table scope_quo_vadis_future_dates add column if not exists cursus_id uuid references scope_quo_vadis_cursus_definitions(cursus_id)`);
  for(const table of ['scope_domaines', 'scope_cibles', 'scope_quo_vadis_cursus_definitions', 'scope_quo_vadis_cursus_versions', 'scope_quo_vadis_cursus_steps', 'scope_quo_vadis_cursus_programmes', 'scope_quo_vadis_cursus_step_programmes', 'scope_quo_vadis_future_dates']){
    await db.query(`alter table ${table} enable row level security`);
    for(const role of ['anon', 'authenticated']){
      const exists = await db.query(`select 1 from pg_roles where rolname = $1`, [role]);
      if(exists.rows[0]) await db.query(`revoke all on ${table} from ${role}`);
    }
  }
}

module.exports = { ensureScopeSchema, DOMAINES, CIBLES, SOUS_DOMAINES, DOMAINES_MODEL_2 };

const { randomUUID } = require('crypto');
const db = require('./_postgres');

const DOMAINES = [
  { code: 'FOBA', libelle: 'Formation de base' },
  { code: 'FOCA', libelle: 'Formation des cadres' },
  { code: 'DPS', libelle: 'Défense incendie et protection contre les sinistres' },
  { code: 'DAP', libelle: 'Détachement d’appui' },
  { code: 'PR', libelle: 'Premiers secours' },
  { code: 'AUTO', libelle: 'Automobile' },
  { code: 'FOSPEC', libelle: 'Formations spéciales' },
  { code: 'JSP', libelle: 'Jeunes sapeurs-pompiers' }
];

const DOMAINES_MODEL_2 = {
  FOBA: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'FOBA' },
  FOCA: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'FOCA' },
  DPS: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'DPS' },
  DAP: { nature: 'DOMAINE', parentCode: null, libelleAffiche: 'DAP' },
  PR: { nature: 'SOUS_DOMAINE', parentCode: 'FOSPEC', libelleAffiche: 'PAPR', libelle: 'Protection respiratoire' },
  AUTO: { nature: 'SOUS_DOMAINE', parentCode: 'FOSPEC', libelleAffiche: 'AUTO' },
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
  ['PR', 'ABC', 'PR-ABC'],
  ['AUTO', 'VL', 'AUTO VL'],
  ['AUTO', 'PL', 'AUTO PL'],
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
    constraint scope_domaines_code_chk check (code in ('FOBA','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP'))
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
    constraint scope_attendus_retrait_chk check (origine_retrait is null or origine_retrait = 'EXCEPTION_RETRAIT')
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

const LATEST_SCOPE_SCHEMA_VERSION = 'scope-participant-selection-runtime-root-repair-10-3-1';
const SCOPE_SCHEMA_LOCK_KEY = 671902270;
let ready = false;
let readyPromise = null;

async function hasMigration(version){
  const result = await db.query('select 1 from monitoring_f7_schema_migrations where version = $1 limit 1', [version]);
  return Boolean(result.rows && result.rows[0]);
}

async function withSchemaLock(callback){
  await db.query('select pg_advisory_lock($1)', [SCOPE_SCHEMA_LOCK_KEY]);
  try{
    return await callback();
  }finally{
    await db.query('select pg_advisory_unlock($1)', [SCOPE_SCHEMA_LOCK_KEY]);
  }
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
  return await withSchemaLock(async () => {
  if(await hasMigration(LATEST_SCOPE_SCHEMA_VERSION)){
    ready = true;
    return true;
  }
  for(const sql of DDL){
    await db.query(sql);
  }
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
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-configuration-formation-ux-referentials-finish-5') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-configuration-referentials-lifecycle-repair-5-1') on conflict (version) do nothing`
  );
  await db.query(
    `insert into monitoring_f7_schema_migrations(version) values ('scope-event-temporal-configuration-foundation-9') on conflict (version) do nothing`
  );
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
    set parent_code = 'FOSPEC',
        nature = 'SOUS_DOMAINE',
        libelle_affiche = case when code = 'PR' then 'PAPR' else 'AUTO' end
    where code in ('PR', 'AUTO')
  `);
  await db.query(`
    update scope_domaines
    set libelle = 'Protection respiratoire', libelle_affiche = 'PAPR'
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

module.exports = { ensureScopeSchema, DOMAINES, CIBLES, SOUS_DOMAINES, DOMAINES_MODEL_2 };

-- SCOPE-ALERTS-1 : acquittements additifs. L’alerte elle-même n’est pas matérialisée :
-- elle est recalculée. Un acquittement P0 n’efface pas une cause toujours active.

create table if not exists scope_alertes_acquittements (
  acquittement_id uuid primary key,
  fingerprint text not null,
  code text not null,
  entity_type text not null,
  entity_id text not null,
  utilisateur_id text not null,
  commentaire text,
  created_at timestamptz not null default now()
);

create unique index if not exists scope_alertes_acq_user_fp
  on scope_alertes_acquittements (utilisateur_id, fingerprint);

create index if not exists scope_alertes_acq_fp_idx
  on scope_alertes_acquittements (fingerprint);

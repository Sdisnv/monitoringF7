-- SCOPE-PRABC-JSP-PRESENCE-R2 — motifs d’excuse JSP (schéma uniquement).
-- Ne contient PAS la correction ponctuelle de l’événement PR-ABC.

alter table scope_participations drop constraint if exists scope_participations_motif_val_chk;
alter table scope_participations add constraint scope_participations_motif_val_chk check (
  motif_absence is null or motif_absence in (
    'PRIVE','PROFESSIONNEL','ARMEE','ACCIDENT_MALADIE','MALADIE','ACCIDENT','AUTRE','NON_PRECISE',
    'ACTIVITE_SCOLAIRE','ACTIVITE_EXTRA_SCOLAIRE','NON_JUSTIFIE',
    'JOKER','FORMATEUR_PR','FORMATION_HORS_SDIS','PAS_CONCERNE','DEMISSION_EN_COURS'
  )
);

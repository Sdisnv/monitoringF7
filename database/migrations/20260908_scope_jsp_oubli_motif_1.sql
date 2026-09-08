-- SCOPE-PERMUTATION-PROD-REPAIR-2
-- Autorise le motif JSP OUBLI sans modifier les donnees existantes.

ALTER TABLE scope_participations
  DROP CONSTRAINT IF EXISTS scope_participations_motif_val_chk;

ALTER TABLE scope_participations
  ADD CONSTRAINT scope_participations_motif_val_chk CHECK (
    motif_absence IS NULL OR motif_absence IN (
      'PRIVE','PROFESSIONNEL','ARMEE','ACCIDENT_MALADIE','MALADIE','ACCIDENT','AUTRE','NON_PRECISE',
      'ACTIVITE_SCOLAIRE','ACTIVITE_EXTRA_SCOLAIRE','OUBLI','NON_JUSTIFIE',
      'JOKER','FORMATEUR_PR','FORMATION_HORS_SDIS','AUTO_RETRAIT','NON_CONCERNE','PAS_CONCERNE','DEMISSION_EN_COURS'
    )
  );

-- SCOPE-PERMUTATION-RECOVERY-MOA-FIX-1
-- Backfill cible des cles d'equivalence DAP existantes pour exposer le rattrapage.

UPDATE scope_evenements
SET exercise_equivalence_key = 'DAP_EXERCICE_' || substring(lower(libelle) from 'exercice[[:space:]]+dap[[:space:]]+([0-9]+)')
WHERE upper(domaine_code) = 'DAP'
  AND exercise_equivalence_key IS NULL
  AND substring(lower(libelle) from 'exercice[[:space:]]+dap[[:space:]]+([0-9]+)') IS NOT NULL;

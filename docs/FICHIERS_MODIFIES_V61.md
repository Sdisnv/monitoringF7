# Fichiers modifies — Monitoring F7 v61

## Objectif

Ergonomie professionnelle COD sans refonte, sans backend actif et sans modification des regles metier.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v61` ;
  - navigation principale renommee : `Situation COD`, `Evenements`, `Effectifs`, `Analyses`, `Graphiques`, `Administration` ;
  - ajout d'une synthese professionnelle COD en quatre blocs ;
  - bouton projection renomme `Mode projection` ;
  - libelle tableau simplifie : `Vue synthese` / `Details`.

- `assets/js/config.js`
  - version centrale alignee en `v61`.

- `assets/js/monitoring-f7-evolution.js`
  - version et messages alignes en `v61` ;
  - mise a jour dynamique de la synthese COD ;
  - conservation des preferences tableau v61 avec fallback v60/v59.

- `assets/css/monitoring-f7-evolution.css`
  - styles de la nouvelle synthese COD ;
  - adaptation responsive ;
  - amelioration du mode projection.

- `assets/js/*.js`
  - alignement des commentaires et fallback de version actifs en `v61`.

- `netlify.toml`
  - commentaire de version v61, configuration statique conservee.

- `README.md`
  - ajout de la section v61.

## Maintiens explicites

- `backendEnabled = false`.
- `syncEnabled = false`.
- `serverAuthEnabled = false`.
- `SyncService` reste inactif.
- Aucun backend n'est ajoute.
- Les KPI, calculs, imports/exports et regles evenements ne sont pas modifies.

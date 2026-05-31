# Fichiers modifies — Monitoring F7 v60

## Objectif

Preparation backend optionnel sans activation : schema de donnees explicite, contrats API documentes et authentification serveur preparee contractuellement.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v60` ;
  - chargement de `assets/js/data-schema.js` et `assets/js/api-contracts.js` avant la facade API.

- `assets/js/config.js`
  - version centrale alignee en `v60`.

- `assets/js/data-schema.js`
  - nouveau schema client des entites principales : formations, evenements importes, periodes de reference, objectifs et journal local.

- `assets/js/api-contracts.js`
  - nouveaux contrats documentes pour `/auth/*`, `/records`, `/imported-events` et `/reference-periods`.

- `assets/js/backend-config.js`
  - ajout des options futures `serverAuthEnabled`, `tokenStorage` et `requiredRole` ;
  - maintien de `backendEnabled = false` par defaut.

- `assets/js/api-client.js`
  - support preparatoire du token bearer en memoire ;
  - methodes futures `loginServer`, `logoutServer`, `getCurrentUser` et `refreshSession` ;
  - aucune requete distante si le backend est desactive.

- `assets/js/auth.js`
  - statut d'authentification enrichi pour distinguer session locale et auth serveur preparee.

- `assets/js/sync-service.js`
  - libelles v60, synchronisation toujours inactive par defaut.

- `assets/js/monitoring-f7-evolution.js`
  - diagnostic local enrichi : auth serveur, schema de donnees, contrats API.

- `assets/js/app.js`, `assets/js/storage.js`, `assets/js/security.js`, `assets/js/audit-log.js`, `assets/js/data/*.js`, `assets/js/render/render-charts.js`
  - alignement des libelles et fallback de version en `v60`.

- `README.md`
  - ajout de la section v60.

- `netlify.toml`
  - commentaire de version v60, configuration statique conservee.

## Maintiens explicites

- `backendEnabled = false`.
- `syncEnabled = false`.
- `serverAuthEnabled = false`.
- `SyncService` reste inactif.
- Aucun backend, aucune Netlify Function et aucune base de donnees ne sont ajoutes.
- Les KPI, calculs metier et workflows SDIS ne sont pas modifies.

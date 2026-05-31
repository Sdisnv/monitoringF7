# Fichiers modifies — Monitoring F7 v64

## Objectif

Preparer un stockage central optionnel pour les donnees metier, sans remplacer le stockage local et sans activer la synchronisation.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v64`.

- `assets/js/config.js`
  - version centrale alignee en `v64`.

- `assets/js/backend-config.js`
  - ajout de `centralStorageEnabled`, desactive par defaut.

- `assets/js/api-client.js`
  - ajout de methodes preparatoires : `listRecords`, `replaceRecords`, `replaceImportedEvents`, `replaceReferencePeriods`.

- `assets/js/monitoring-f7-evolution.js`
  - diagnostic local enrichi avec le statut `Stockage central`.

- `netlify.toml`
  - redirects `/records`, `/imported-events`, `/reference-periods` vers les fonctions donnees.

- `netlify/functions/_data-store.js`
  - adaptateur serveur optionnel base sur Netlify Blobs si disponible.

- `netlify/functions/data-records.js`
  - route serveur optionnelle pour les formations.

- `netlify/functions/data-imported-events.js`
  - route serveur optionnelle pour les evenements importes.

- `netlify/functions/data-reference-periods.js`
  - route serveur optionnelle pour les periodes de reference.

- `README.md`
  - ajout de la section v64.

## Maintiens explicites

- `backendEnabled = false` par defaut.
- `storageMode = local` par defaut.
- `centralStorageEnabled = false` par defaut.
- `syncEnabled = false`.
- `serverAuthEnabled = false` par defaut.
- `SyncService` reste inactif.
- Aucune migration automatique vers serveur.
- Les KPI, calculs, imports/exports, ergonomie v61 et regles evenements ne sont pas modifies.

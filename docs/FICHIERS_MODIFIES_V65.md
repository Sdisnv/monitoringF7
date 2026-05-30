# Fichiers modifies — Monitoring F7 v65

## Objectif

Preparer une synchronisation maitrisee sans execution automatique, sans migration serveur et sans modification des regles metier.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v65` ;
  - ajout du bouton `Tester prerequis sync` dans le diagnostic local ;
  - ajout d'un encart de statut sync.

- `assets/js/config.js`
  - version centrale alignee en `v65`.

- `assets/js/sync-service.js`
  - file de synchronisation v65 ;
  - controle `checkReadiness` ;
  - plan local `planSync` ;
  - `syncNow` limite a un controle de prerequis, sans execution automatique.

- `assets/js/monitoring-f7-evolution.js`
  - integration du bouton diagnostic sync ;
  - diagnostic enrichi avec prerequis sync et file sync.

- `README.md`
  - ajout de la section v65.

## Maintiens explicites

- `backendEnabled = false` par defaut.
- `storageMode = local` par defaut.
- `centralStorageEnabled = false` par defaut.
- `syncEnabled = false` par defaut.
- `serverAuthEnabled = false` par defaut.
- Aucune synchronisation automatique.
- Les KPI, calculs, imports/exports, ergonomie v61 et regles evenements ne sont pas modifies.

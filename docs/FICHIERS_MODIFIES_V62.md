# Fichiers modifies — Monitoring F7 v62

## Objectif

Preparation backend phase suivante avec verification locale des contrats API, sans backend actif, sans appel reseau et sans synchronisation.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v62` ;
  - ajout du bouton `Verifier contrats backend` dans `Diagnostic local` ;
  - chargement de `assets/js/backend-contract-check.js` entre les contrats API et le client API.

- `assets/js/config.js`
  - version centrale alignee en `v62`.

- `assets/js/backend-contract-check.js`
  - nouveau module de verification locale des contrats backend ;
  - controle les methodes HTTP, chemins API, modes auth, reponses documentees et schema de donnees ;
  - ne declenche aucun appel reseau.

- `assets/js/backend-config.js`
  - ajout des indicateurs `contractCheckEnabled` et `mockBackendEnabled` ;
  - `mockBackendEnabled` reste force a `false` dans cette livraison.

- `assets/js/monitoring-f7-evolution.js`
  - integration du bouton de verification ;
  - enrichissement du diagnostic local avec contrats verifies et mock backend desactive.

- `README.md`
  - ajout de la section v62.

- `netlify.toml` et fichiers JS actifs
  - alignement des libelles et fallback de version en `v62`.

## Maintiens explicites

- `backendEnabled = false`.
- `syncEnabled = false`.
- `serverAuthEnabled = false`.
- `mockBackendEnabled = false`.
- `SyncService` reste inactif.
- Aucun backend, aucune Netlify Function et aucune base de donnees ne sont ajoutes.
- Les KPI, calculs, imports/exports, ergonomie v61 et regles evenements ne sont pas modifies.

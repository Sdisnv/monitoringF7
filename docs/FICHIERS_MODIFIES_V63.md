# Fichiers modifies — Monitoring F7 v63

## Objectif

Ajouter une authentification serveur reelle et optionnelle via Netlify Functions, sans activation par defaut et sans synchronisation.

## Fichiers modifies

- `index.html`
  - version visible alignee en `v63`.

- `assets/js/config.js`
  - version centrale alignee en `v63`.

- `assets/js/api-client.js`
  - compatibilite avec une API same-origin `/auth/*` lorsque le backend est active explicitement ;
  - aucune requete distante tant que `backendEnabled = false`.

- `assets/js/backend-config.js`
  - libelle v63, valeurs par defaut locales conservees.

- `netlify.toml`
  - declaration du dossier `netlify/functions` ;
  - redirects `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` vers les fonctions Netlify.

- `netlify/functions/_auth-utils.js`
  - helpers serveur : JSON, hash SHA-256, comparaison constante, jetons HMAC, lecture utilisateur.

- `netlify/functions/auth-login.js`
  - login serveur via variables d'environnement.

- `netlify/functions/auth-me.js`
  - validation du jeton d'acces.

- `netlify/functions/auth-refresh.js`
  - renouvellement d'un jeton d'acces a partir d'un refresh token.

- `netlify/functions/auth-logout.js`
  - endpoint de deconnexion serveur stateless.

- `README.md`
  - ajout de la section v63.

## Maintiens explicites

- `backendEnabled = false` par defaut.
- `syncEnabled = false`.
- `serverAuthEnabled = false` par defaut.
- `mockBackendEnabled = false`.
- `SyncService` reste inactif.
- Aucun stockage central n'est ajoute.
- Les KPI, calculs, imports/exports, ergonomie v61 et regles evenements ne sont pas modifies.

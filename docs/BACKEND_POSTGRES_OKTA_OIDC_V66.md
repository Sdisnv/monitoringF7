# Backend PostgreSQL et Okta/OIDC — Monitoring F7 v66 preparatoire

## Objectif

Cette phase ajoute le socle serveur requis pour une future mise en production institutionnelle :

- PostgreSQL via Supabase ou Neon.
- Schema SQL versionne.
- Netlify Functions avec stockage PostgreSQL optionnel.
- Authentification Okta/OIDC preparee.
- Variables d'environnement Netlify documentees.

Le mode local/offline-first reste prioritaire. Rien ne bascule tant que la configuration client conserve :

- `backendEnabled: false`
- `serverAuthEnabled: false`
- `centralStorageEnabled: false`
- `syncEnabled: false`

## Base PostgreSQL

Executer `database/schema.sql` dans Supabase ou Neon.

Tables creees :

- `monitoring_f7_user_profiles`
- `monitoring_f7_records`
- `monitoring_f7_imported_events`
- `monitoring_f7_reference_periods`
- `monitoring_f7_objectives`
- `monitoring_f7_audit_entries`
- `monitoring_f7_sync_changes`
- `monitoring_f7_schema_migrations`

Les endpoints existants `records`, `imported-events` et `reference-periods` peuvent utiliser PostgreSQL quand `MONITORING_F7_STORAGE_DRIVER=postgres`.

## Variables Netlify requises

Stockage :

- `DATABASE_URL`
- `MONITORING_F7_STORAGE_DRIVER=postgres`
- `MONITORING_F7_PG_POOL_MAX=3`

Sessions serveur :

- `MONITORING_F7_AUTH_SECRET`

Okta/OIDC :

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OIDC_REDIRECT_URI`
- `OIDC_SCOPES=openid profile email groups`
- `OKTA_ALLOWED_GROUPS`
- `OKTA_ADMIN_GROUPS`

La valeur `MONITORING_F7_AUTH_SECRET` doit etre longue, aleatoire et differente du code local.

## Routes ajoutees

- `/auth/oidc/start`
- `/auth/oidc/callback`

Le callback verifie :

- `state`
- `nonce`
- signature RS256 de l'ID token via JWKS
- issuer
- audience
- expiration
- groupes Okta autorises si configures

## Strategie d'activation

1. Garder la production en mode local.
2. Creer la base PostgreSQL.
3. Executer `database/schema.sql`.
4. Renseigner les variables Netlify.
5. Tester les Functions sur un deploy preview.
6. Activer progressivement `backendEnabled`, `serverAuthEnabled`, `centralStorageEnabled`, puis `syncEnabled`.
7. Ne jamais activer la synchronisation automatique avant recette de conflits.

## Limites volontaires

- Pas de creation de compte cote application.
- Pas de changement de mot de passe cote application.
- Pas de secrets dans le depot.
- Pas d'activation backend par defaut.
- Pas de migration automatique destructrice.

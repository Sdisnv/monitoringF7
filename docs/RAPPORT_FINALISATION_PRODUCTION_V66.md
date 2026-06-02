# Monitoring F7 v66.0 — Rapport finalisation production institutionnelle

## Base analysée

Travail effectué exclusivement depuis `Monitoring_F7_v65.5.4_DEPLOY.zip`.

## Corrections réalisées

- Version alignée en `v66.0` dans l’application et `66.0.0` dans `package.json`.
- Secours local désactivé par défaut en production : Okta/OIDC est obligatoire.
- Le code local historique `1234` n’est plus une voie normale d’accès ; il ne peut être réactivé que par configuration explicite `allowLocalFallback:true` + hash dédié.
- Alerte rouge runtime limitée aux erreurs critiques réelles ; les faux positifs et warnings non bloquants restent journalisés sans affichage intrusif.
- RBAC centralisé côté frontend et API.
- Netlify Functions protégées par permissions.
- Administration utilisateurs ajoutée : liste, création/modification, rôles, permissions, activation/désactivation.
- Audit trail serveur ajouté : consultation admin et journalisation des actions sensibles côté API.
- Schéma PostgreSQL enrichi de manière non destructive.
- Procédures production ajoutées dans `/docs`.

## Fichiers principaux modifiés / ajoutés

- `assets/js/config.js`
- `assets/js/auth.js`
- `assets/js/security.js`
- `assets/js/api-client.js`
- `assets/js/rbac.js`
- `assets/js/admin.js`
- `netlify/functions/_rbac.js`
- `netlify/functions/_audit-store.js`
- `netlify/functions/_user-store.js`
- `netlify/functions/admin-users.js`
- `netlify/functions/audit-log.js`
- `netlify/functions/auth-me.js`
- `netlify/functions/_oidc-utils.js`
- `netlify/functions/_data-store.js`
- `database/schema.sql`
- `netlify.toml`
- `package.json`

## Points volontairement non réécrits

Les calculs statistiques, KPI, tableaux de bord, graphiques, imports/exports métier, logique de présence et structure métier des événements n’ont pas été réécrits.

## Réserve importante

La création d’utilisateurs dans Monitoring F7 crée un profil applicatif et ses rôles. La création de l’identité primaire, du mot de passe, du MFA et du cycle de vie IAM reste dans Okta.

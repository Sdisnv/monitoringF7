# Monitoring F7 v66.0 — Matrice RBAC institutionnelle

## Principe

Okta/OIDC reste l’IdP principal. Monitoring F7 ne gère aucun mot de passe local en production. Les rôles applicatifs sont centralisés dans `assets/js/rbac.js` côté frontend et `netlify/functions/_rbac.js` côté API.

## Rôles

| Rôle | Usage |
|---|---|
| `sdis-admin` | Administration complète, utilisateurs, audit, paramètres système |
| `sdis-commandement` | Pilotage COD / état-major, consultation audit, import/export, données métier |
| `sdis-formation` | Gestion formation, effectifs, référentiels, import/export |
| `sdis-instructeur` | Saisie et modification des événements, export |
| `sdis-user` | Utilisateur standard, saisie/modification contrôlée, export |
| `sdis-readonly` | Lecture dashboard et export uniquement |

## Permissions

| Permission | Description |
|---|---|
| `dashboard:read` | Lecture dashboard / indicateurs |
| `events:create` | Création événement |
| `events:update` | Modification événement |
| `events:delete` | Suppression événement |
| `effectifs:manage` | Gestion effectifs |
| `references:manage` | Gestion référentiels |
| `data:import` | Import données |
| `data:export` | Export données |
| `users:admin` | Administration utilisateurs |
| `audit:read` | Consultation audit trail |
| `settings:manage` | Paramètres système |

## Matrice

| Rôle | Permissions |
|---|---|
| `sdis-admin` | Toutes les permissions |
| `sdis-commandement` | dashboard, événements, effectifs, référentiels, import, export, audit |
| `sdis-formation` | dashboard, événements, effectifs, référentiels, import, export |
| `sdis-instructeur` | dashboard, création/modification événements, export |
| `sdis-user` | dashboard, création/modification événements, export |
| `sdis-readonly` | dashboard, export |

## Contrôles

Les contrôles UI ne sont pas considérés comme une sécurité suffisante. Les Netlify Functions refusent aussi les actions non autorisées avec `403 forbidden`.

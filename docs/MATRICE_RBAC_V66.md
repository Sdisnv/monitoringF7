# SCOPE — Matrice RBAC V66 actuelle

## Principe

Okta/OIDC reste l'identité primaire. SCOPE ne gère aucun mot de passe local en production. Les droits applicatifs sont calculés côté API par `netlify/lib/_rbac.js`, puis exposés au frontend via `/auth/me` sous forme de `roles` et `permissions`.

Un masquage de menu n'est pas une protection de sécurité. Toute écriture sensible est aussi contrôlée côté Netlify Functions et doit répondre `403 forbidden` lorsque l'utilisateur est authentifié mais non habilité.

## Personne != Utilisateur

`Personne` est l'objet métier suivi par SCOPE: NIP, grade, nom, prénom, date d'entrée, affectations, spécialisations, historique et participations. Le NIP reste la clé métier de rapprochement du personnel.

`Utilisateur` est le profil applicatif autorisé à accéder à SCOPE: subject Okta/OIDC, email, nom affiché, rôles, permissions et état actif/inactif. Un utilisateur SCOPE n'est pas automatiquement une personne monitorée, et une personne monitorée n'a pas automatiquement un compte SCOPE.

Le champ `nip` éventuellement présent dans un profil utilisateur sert uniquement d'identifiant auth alternatif pour retrouver un profil d'accès existant. Il ne crée pas de jointure fonctionnelle avec `scope_personnes`.

## Rôles finaux

| Rôle | Finalité | Administration visible |
|---|---|---|
| `UTILISATEUR` | Usage courant: tableau de bord, événements, rapports et consultation personnel. | À propos |
| `GESTIONNAIRE` | Administration métier: objectifs, suivi nominatif, imports et audit. | Objectifs, Suivi nominatif, Imports, À propos |
| `ADMINISTRATEUR` | Administration complète: droits utilisateurs et réglages protégés. | Objectifs, Suivi nominatif, Imports, Utilisateurs, À propos |

Les anciens rôles `sdis-user`, `sdis-instructeur`, `sdis-readonly`, `sdis-commandement`, `sdis-formation` et `sdis-admin` ne sont plus des profils V1 affichés. Ils restent acceptés comme alias de compatibilité et sont normalisés vers les trois rôles finaux.

## Permissions

| Permission | Usage |
|---|---|
| `dashboard:read` | Consultation tableaux de bord, listes et rapports. |
| `events:create` | Création/import programme événements. |
| `events:update` | Modification événements et présences. |
| `events:delete` | Suppression événements. |
| `effectifs:manage` | Gestion des effectifs. |
| `personnel:read` | Consultation personnel et fiches nominatives. |
| `personnel:manage` | Import/synchronisation personnel et gestion nominative. |
| `references:manage` | Gestion des objectifs et référentiels métier. |
| `data:import` | Capacité métier d'import. |
| `data:export` | Exports et rapports. |
| `reports:nominatif` | Rapports et exports nominatifs. |
| `users:admin` | Gestion des profils applicatifs utilisateurs. |
| `admin:manage` | Capacité administrative générale. |
| `audit:read` | Consultation audit. |
| `settings:manage` | Réglages serveur protégés. |

## Matrice des rôles

| Rôle | Permissions |
|---|---|
| `UTILISATEUR` | `dashboard:read`, `events:create`, `events:update`, `data:export`, `personnel:read`, `reports:nominatif` |
| `GESTIONNAIRE` | `dashboard:read`, `events:create`, `events:update`, `effectifs:manage`, `personnel:read`, `personnel:manage`, `references:manage`, `data:import`, `data:export`, `reports:nominatif`, `audit:read` |
| `ADMINISTRATEUR` | Toutes les permissions gestionnaire, plus `events:delete`, `users:admin`, `admin:manage`, `settings:manage` |

## Surfaces Administration

| Surface | Visibilite menu | Protection API | Contrat |
|---|---|---|---|
| Objectifs | `references:manage` | écritures `references:manage`; lectures authentifiées | Configuration métier des objectifs officiels. |
| Suivi nominatif | `personnel:manage` | écritures personnel `personnel:manage`; lectures nominatives `personnel:read` | Paramétrage et gestion nominative, sans fusion avec Utilisateurs. |
| Imports / Événements | `events:create` | preview/commit `events:create` | Import contrôlé du programme d'événements. |
| Imports / Personnel | `personnel:manage` | preview/commit `personnel:manage` | Synchronisation personnel par NIP. |
| Utilisateurs | `users:admin` | `admin-users` et `users` exigent `users:admin` | Profils applicatifs SCOPE, activation et rôles. |
| Administration | route technique directe | selon liens internes | Hub descriptif, non affiché comme entrée `Administration > Accès > Administration`. |
| À propos | visible aux utilisateurs authentifiés | aucune donnée sensible | Information applicative simple. |

## 401 / 403

`401` signifie session absente, expirée ou token invalide. Ce cas peut déclencher le parcours de reconnexion.

`403` signifie utilisateur authentifié mais non autorisé, désactivé ou inconnu selon le contexte. Une action d'administration refusée en `403` ne doit pas invalider toute la session frontend.

## Points de maintenance

Toute évolution RBAC doit aligner simultanément:

1. `netlify/lib/_rbac.js` pour la source de vérité rôles/permissions.
2. Les contrôles Netlify Functions pour les endpoints sensibles.
3. `assets/js/scope-ui-logic.js` pour la visibilité du menu.
4. `assets/js/scope-ui.js` pour les états UI et messages d'accès.
5. Les tests SCOPE ciblés avant publication.

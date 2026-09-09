# SCOPE — Generic Event / Session / Policy Architecture 1

## Objectif

Ce lot ajoute un socle transversal permettant de décrire les exercices SCOPE par définition métier, version annuelle, organisation simple ou Multi-session, et policy de participation versionnée.

Le changement est volontairement additif. Les moteurs existants restent propriétaires de leur comportement :

- PR legacy conserve `pr_exercise_group_key`, `pr_session_key` et son moteur historique.
- DAP simple reste sur le comportement existant, y compris Permutation.
- Multi-session V2 continue d'assurer les invariants de participation déjà validés.

## Modèle ajouté

Tables :

- `scope_event_definitions` : définition métier stable, par domaine.
- `scope_event_definition_versions` : version temporelle d'une définition, avec mode `SIMPLE` ou `MULTI_SESSION`, nombre de sessions et policy associée.
- `scope_participation_policy_versions` : version annuelle ou datée d'une policy de participation.

Colonnes additives :

- `scope_exercices.definition_version_id`
- `scope_exercices.policy_version_id`
- `scope_exercices.engine_route`
- `scope_exercices.configuration_snapshot`
- `scope_evenements.definition_version_id`
- `scope_evenements.policy_version_id`
- `scope_evenements.engine_route`
- `scope_evenements.engine_snapshot`

## Routage

Routes explicites :

- `SIMPLE_LEGACY`
- `PR_LEGACY`
- `GENERIC_SIMPLE`
- `GENERIC_MULTI_SESSION`

Le routage ne dépend pas du domaine DAP, d'un suffixe `.1/.2` ou d'un libellé. Un événement devient générique uniquement par association persistée à une version de définition, ou par le moteur Multi-session V2 déjà activé explicitement.

## Versioning temporel

Une version 2026 reste immuable pour les événements qui l'ont capturée. La reconduction crée une nouvelle version, par exemple 2027, sans modifier les événements 2026.

Chaque événement générique porte un snapshot `engine_snapshot` au moment de sa création. Le snapshot permet de comprendre ultérieurement quelle définition, version et policy ont été utilisées.

## Seed minimal

Le seed runtime ajoute :

- `DAP-MULTISESSION` version 2026, dérivée de la policy DAP mais sans `PERMUTATION`.
- `DAP-FORMATION-GROUPEE` version 2026, `MULTI_SESSION`, 2 sessions.

Ce seed ne migre aucun événement historique automatiquement.

## Administration

L'écran `#/reglages/formations` expose :

- la liste des définitions ;
- les versions disponibles ;
- le mode Session unique / Multi-session ;
- le nombre de sessions ;
- la policy de participation associée ;
- une création de définition/version ;
- une reconduction annuelle.

## Import

Les imports acceptent désormais des colonnes optionnelles :

- `event_definition_code`
- `definition_version_code`
- `policy_code`
- `policy_version_code`
- `multi_session_code`

Le preview affiche :

- une reconnaissance exacte si le code est explicite ;
- une suggestion si le libellé/domaine ressemble à une définition existante ;
- un statut inconnu si aucun modèle ne correspond.

Une suggestion ne crée pas de rattachement automatique. Le rattachement persistant repose sur une information explicite et validée.

## Performance

Les optimisations appliquées dans l'UI portent sur :

- cache court des référentiels ;
- cache court des listes, dashboard, vigilance, personnel ;
- invalidation ciblée après écritures ;
- réduction des rechargements redondants lors des changements de route.

Diagnostic indicatif exposé par `/diagnostics/performance` :

- événements : 3 appels vers 1 appel courant ;
- personnel : 2 appels vers 1 ;
- vigilance : 2 appels vers 1 ;
- référentiels : cache 5 minutes avec invalidation après modification.

Limite restante : les temps exacts en production restent dépendants de la base Netlify/Postgres et doivent être observés côté navigateur après déploiement.

## Repair 2 — exploitation métier

Le lot `SCOPE-CONFIGURATION-FORMATION-UX-IMPORT-PERFORMANCE-REPAIR-2` transforme la fondation technique en parcours métier exploitable.

Changements principaux :

- la liste des modèles devient consultable ;
- la fiche modèle affiche Identité, Organisation, Participation, Historique/version ;
- les codes techniques sont masqués dans le parcours normal et restent disponibles dans `Informations techniques` ;
- la création demande un domaine, un nom, une organisation, une année et des règles métier ;
- SCOPE génère le code de définition et la policy versionnée ;
- la reconduction annuelle clone aussi la policy vers la nouvelle année ;
- le preview import affiche `Reconnu`, `À confirmer` ou `Non reconnu` ;
- la version applicable est résolue depuis la date réelle de l'événement ;
- les doublons date/domaine/libellé sont signalés avant écriture.

Performance :

- suppression du chargement global de tout le personnel hors vues qui l'utilisent ;
- ajout de `/personnes/count` pour le compteur léger ;
- parallélisation des chargements indépendants pendant la navigation ;
- instrumentation client `window.ScopePerformance.calls` avec méthode, chemin, durée, statut et taille de payload.

Diagnostic local DB :

Depuis l'environnement Codex, la résolution réseau du pooler Supabase a d'abord été bloquée par le sandbox puis la connexion SQL a expiré. Aucune écriture DB n'a été tentée. Le diagnostic production doit donc être complété côté navigateur avec `window.ScopePerformance.calls` après déploiement.

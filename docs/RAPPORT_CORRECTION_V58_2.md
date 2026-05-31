# Rapport correction — Monitoring F7 v58.3

## Objectif

Corriger l’anomalie constatée sur serveur : la liste « Événements à traiter » affichait des événements postérieurs à la date du jour, alors que la règle métier validée indique que la date de référence est la date locale du jour de connexion.

## Correction appliquée

La liste « Événements à traiter » utilise désormais une date de référence calculée au chargement de l’application : `SESSION_REFERENCE_DATE_ISO`.

Un événement est affiché dans cette liste uniquement si :

1. sa date événementielle est valide ;
2. sa date est inférieure ou égale à la date locale du jour de connexion ;
3. il n’est pas déjà traité, effectué, annulé, clôturé ou ignoré.

Les événements futurs ne sont pas supprimés. Ils restent conservés dans le stockage local et dans la liste générale des événements, mais ils ne sont plus présentés comme événements à traiter le jour de la connexion.

## Non-régression

La correction ne modifie pas :

- les KPI ;
- les graphiques ;
- les règles de comptabilisation ;
- les imports/exports JSON/CSV ;
- IndexedDB ;
- localStorage ;
- StorageService ;
- backendEnabled, qui reste désactivé ;
- SyncService, qui reste inactif.

## Contrôle attendu

Sur Netlify, localhost et ouverture locale si supportée :

- un événement daté d’hier ou d’aujourd’hui et non traité apparaît dans « Événements à traiter » ;
- un événement daté de demain ou plus tard n’apparaît pas dans « Événements à traiter » ;
- les événements futurs restent accessibles dans la liste générale / gestion événements ;
- le badge indique le nombre d’événements à traiter jusqu’à la date de référence.

# Rapport stabilisation ergonomie — Monitoring F7 v59

## Objectif

Réduire la charge cognitive terrain/COD sans refondre l’application et sans modifier les règles métier.

## Changements

### Vue projection COD

Le dashboard dispose d’un mode projection activable depuis le premier écran.

Ce mode :

- masque la navigation haute ;
- conserve les KPI essentiels ;
- masque la section dense de pilotage détaillé ;
- affiche une synthèse courte lisible sur écran ou projection.

### Tableaux événements

La liste événements dispose désormais de deux densités :

- `Vue synthèse` : lecture rapide des colonnes métier prioritaires ;
- `Vue complète` : toutes les colonnes détaillées restent disponibles.

La préférence est conservée localement dans le navigateur.

### Messages intégrés

Une barre de message locale fournit des retours courts sans ajouter de backend ni perturber les workflows existants.

## Maintiens

- Application statique.
- Offline-first.
- `localStorage / IndexedDB` conservés.
- `backendEnabled = false`.
- `SyncService` inactif.
- Aucun framework ajouté.
- Aucun build obligatoire.

## Contrôles recommandés

- Dashboard en vue normale.
- Activation/désactivation projection COD.
- Navigation après sortie projection.
- Liste événements en vue synthèse.
- Liste événements en vue complète.
- Import/export inchangés.
- Diagnostic local : backend désactivé, sync inactive.

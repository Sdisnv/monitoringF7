# Rapport correction — Monitoring F7 v58.4

## Objectif

Stabilisation courte après audit v58.3 : corriger les divergences événements/session/documentation sans refonte et sans backend.

## Corrections appliquées

### Événements à traiter

La règle est centralisée dans `assets/js/config.js` via `MonitoringEventRules`.

Elle impose :

- date locale du jour de connexion comme référence ;
- affichage uniquement des événements non traités ;
- date d’événement inférieure ou égale à cette date locale ;
- conservation des événements futurs sans affichage dans la liste à traiter.

Le cœur historique `assets/js/app.js` et la couche `assets/js/monitoring-f7-evolution.js` utilisent désormais la même règle.

### Session locale

Après connexion locale, `assets/js/auth.js` émet l’événement navigateur `monitoring-f7-auth-session-changed`.

La zone utilisateur se rafraîchit sans rechargement complet et affiche le profil/session locale avec la date de référence partagée.

### Documentation

La référence erronée à `docs/STOCKAGE_LOCAL_ET_EVOLUTION_BACKEND_V58_3.md` a été corrigée dans le README historique, et une documentation v58.4 courte a été ajoutée.

## Maintiens

- Application client-only.
- Offline-first.
- `backendEnabled = false`.
- `SyncService` inactif.
- Aucun endpoint serveur obligatoire.
- Aucune modification des KPI, graphiques ou règles métier.

## Contrôles recommandés

- Connexion locale première utilisation.
- Rafraîchissement immédiat du menu utilisateur.
- Événement daté d’hier ou aujourd’hui : visible à traiter si non traité.
- Événement futur : conservé mais absent de la liste à traiter.
- Import événements CSV/JSON.
- Export JSON.
- Diagnostic local backend désactivé / synchronisation inactive.

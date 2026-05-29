# Fichiers modifiés — Monitoring F7 v58.4

Base stricte : `Monitoring_F7_v58.3.zip`.

## Fichiers applicatifs

- `index.html`
  - version visible alignée en `v58.4`.

- `assets/js/config.js`
  - version centrale alignée en `v58.4` ;
  - ajout de `MonitoringEventRules`, règle locale partagée pour les événements à traiter.

- `assets/js/app.js`
  - `getOverdueRows()` utilise la règle partagée ;
  - les événements futurs ne peuvent plus réapparaître via la logique historique.

- `assets/js/monitoring-f7-evolution.js`
  - utilisation de la règle partagée ;
  - rafraîchissement du profil local après événement de session.

- `assets/js/auth.js`
  - émission de `monitoring-f7-auth-session-changed` après connexion locale ;
  - date de référence de session alignée sur la date locale partagée.

- `README.md`
  - ajout de la section v58.4 ;
  - correction de la référence documentaire stockage local v58.3.

## Documentation ajoutée

- `docs/FICHIERS_MODIFIES_V58_4.md`
- `docs/RAPPORT_CORRECTION_V58_4.md`
- `docs/STOCKAGE_LOCAL_ET_EVOLUTION_BACKEND_V58_4.md`

## Non modifié volontairement

- `backendEnabled` reste `false`.
- `SyncService` reste inactif.
- Aucun backend ajouté.
- Aucun build ajouté.
- Aucun changement des KPI, graphiques ou règles métier.

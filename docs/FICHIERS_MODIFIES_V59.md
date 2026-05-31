# Fichiers modifiés — Monitoring F7 v59

Base stricte : `Monitoring_F7_v58.4.zip`.

## Fichiers applicatifs

- `index.html`
  - version visible alignée en `v59` ;
  - ajout du bouton `Vue projection COD` ;
  - ajout d’un bandeau de synthèse projection ;
  - ajout des boutons `Vue synthèse` et `Vue complète` dans la liste événements ;
  - ajout de la barre de message intégrée.

- `assets/js/config.js`
  - version centrale alignée en `v59`.

- `assets/js/monitoring-f7-evolution.js`
  - gestion de la vue projection COD ;
  - gestion de la densité tableau synthèse/complète ;
  - mise à jour de la synthèse projetable ;
  - messages intégrés via `MonitoringUiMessage`.

- `assets/css/monitoring-f7-evolution.css`
  - styles de projection COD ;
  - styles de vue synthèse tableau ;
  - styles de barre de messages intégrés.

- `README.md`
  - ajout de la section v59.

## Non modifié volontairement

- Aucun backend ajouté.
- `backendEnabled = false`.
- `SyncService` inactif.
- Aucun build ajouté.
- Aucun changement des KPI, graphiques ou règles métier.

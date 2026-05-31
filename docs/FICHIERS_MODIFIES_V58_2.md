# Fichiers modifiés — Monitoring F7 v58.3

Version livrée : `Monitoring_F7_v58.3.zip`

## Modifications

- `index.html`
  - version visible alignée en `v58.3` ;
  - texte de la section « Événements à traiter » clarifié : la liste est limitée à la date locale du jour de connexion.

- `assets/js/monitoring-f7-evolution.js`
  - ajout d’une date de référence de session `SESSION_REFERENCE_DATE_ISO` calculée au chargement ;
  - filtrage des événements à traiter sur `date événement <= date locale du jour de connexion` ;
  - exclusion des événements futurs de la liste « à traiter » ;
  - badge enrichi avec la date limite utilisée ;
  - journalisation locale non intrusive du filtrage.

- `assets/js/config.js` et fichiers JS/documentation concernés
  - version alignée en `v58.3`.

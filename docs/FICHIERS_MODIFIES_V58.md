# Fichiers modifiés — Monitoring F7 v58

Version livrée : `Monitoring_F7_v58.zip`

Objectif : stabilisation finale pré-release / contrôle qualité global, sans nouvelle fonctionnalité majeure, sans backend, sans framework et sans modification des règles métier.

## Fichiers applicatifs modifiés

- `index.html`
  - titre navigateur passé en v58 ;
  - badge version visible passé en v58 ;
  - footer Appendices aligné en v58 ;
  - contrôle de l’ordre des scripts conservé.

- `assets/js/config.js`
  - version applicative centrale passée à `v58`.

- `assets/js/app.js`
  - libellés/commentaires versionnés alignés en v58 ;
  - message diagnostic stockage aligné en v58 ;
  - aucune règle métier modifiée.

- `assets/js/monitoring-f7-evolution.js`
  - constante d’évolution passée en v58 ;
  - message de session locale aligné en v58 ;
  - diagnostic migration/stockage reformulé pour la stabilisation v58.

- `assets/js/auth.js`
  - fallback de version et message backend préparatoire alignés en v58.

- `assets/js/storage.js`
  - commentaire et fallback version alignés en v58 ;
  - clés historiques v56 conservées volontairement pour préserver les données existantes.

- `assets/js/audit-log.js`
  - commentaire et fallback version alignés en v58 ;
  - clé de journal v56 conservée volontairement pour ne pas perdre l’historique local.

- `assets/js/security.js`
  - commentaire et payload diagnostic alignés en v58.

- `assets/js/backend-config.js`
  - commentaire versionné aligné en v58 ;
  - `backendEnabled` reste `false`.

- `assets/js/api-client.js`
  - commentaire et message backend désactivé alignés en v58.

- `assets/js/sync-service.js`
  - commentaire et messages de synchronisation inactive alignés en v58 ;
  - clés de file/status v57 conservées comme compatibilité de préparation backend future.

- `assets/js/data/import-json.js`
  - commentaire versionné aligné en v58.

- `assets/js/data/export-json.js`
  - commentaire et version export fallback alignés en v58.

- `assets/js/render/render-charts.js`
  - commentaire et warnings graphiques alignés en v58 ;
  - logique Chart.js inchangée.

- `netlify.toml`
  - commentaire d’en-tête aligné en v58 ;
  - configuration statique client-only conservée.

- `README.md`
  - titre passé en v58 ;
  - procédure ZIP passée à `Monitoring_F7_v58.zip` ;
  - section Phase 9 ajoutée.

## Documentation créée

- `docs/FICHIERS_MODIFIES_V58.md`
- `docs/RAPPORT_STABILISATION_FINALE_V58.md`
- `docs/PROCEDURE_DEPLOIEMENT_V58.md`
- `docs/CHECKLIST_RECETTE_PILOTE_SDIS_V58.md`

## Points volontairement non modifiés

- Calculs métier SDIS.
- KPI et graphiques.
- Workflows imports/export.
- Structure IndexedDB/localStorage.
- `StorageService` et ses clés de compatibilité.
- `audit-log.js` et sa clé locale historique.
- Backend optionnel : préparé mais inactif.
- `SyncService` : préparé mais inactif.
- Aucune dépendance React/Vue/Angular.
- Aucun build obligatoire.

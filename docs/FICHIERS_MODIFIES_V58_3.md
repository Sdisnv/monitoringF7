# Fichiers modifiés — Monitoring F7 v58.3

Base stricte : `Monitoring_F7_v58.2.zip`.

## Fichiers applicatifs

- `index.html`
  - alignement version visible en `v58.3`.

- `assets/js/config.js`
  - version centrale alignée en `v58.3`.

- `assets/js/auth.js`
  - stabilisation de la session locale navigateur ;
  - ajout d'une sauvegarde locale de session contrôlée dans `localStorage` pour améliorer la continuité sur serveur statique Netlify ;
  - conservation de l'expiration douce locale ;
  - clarification du statut d'authentification locale ;
  - aucune authentification serveur ajoutée ;
  - aucun backend activé.

- `assets/js/monitoring-f7-evolution.js`
  - remplacement des alertes Profil / Paramètres / Session par un panneau local intégré ;
  - accès Profil et Paramètres utilisateur plus fiable depuis serveur Netlify ;
  - paramètre local léger `Nom affiché dans l'interface` ;
  - journalisation locale non intrusive des ouvertures Profil / Paramètres / Session ;
  - rappel explicite du caractère local/offline-first.

- `README.md`
  - ajout de la section v58.3.

## Documentation ajoutée

- `docs/FICHIERS_MODIFIES_V58_3.md`
- `docs/RAPPORT_CORRECTION_V58_3.md`

## Non modifié volontairement

- `backendEnabled` reste `false`.
- `SyncService` reste inactif.
- Aucun appel réseau obligatoire ajouté.
- Aucun changement des KPI, graphiques ou règles métier.
- IndexedDB / localStorage conservés.
- Netlify gratuit conservé.

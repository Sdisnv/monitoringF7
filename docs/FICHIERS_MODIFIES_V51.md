# Monitoring F7 v51 — Liste détaillée des fichiers modifiés

## Fichiers applicatifs

- `index.html` : passage visible en v51, chargement de la nouvelle couche `assets/js/security.js`, footer de version harmonisé.
- `assets/js/config.js` : version applicative passée à `v51`.
- `assets/js/security.js` : nouveau module client-only centralisant `safeText`, `safeSetHTML`, sanitation HTML minimale, création DOM sécurisée, confirmations sensibles, journalisation sécurité, handler global `error` et `unhandledrejection`, contrôle indicatif du quota navigateur.
- `assets/js/storage.js` : stockage local renforcé avec lecture JSON tolérante, détection de corruption, fallback, snapshot/restore pour rollback import, contrôle disponibilité IndexedDB.
- `assets/js/auth.js` : isolation progressive de la session locale, expiration douce 12 h, nettoyage session invalide, synchronisation d’état UI connecté/déconnecté, `MonitoringSessionManager`.
- `assets/js/app.js` : version v51, validation JSON renforcée, détection champs critiques inattendus, contrôle JSON vide/binaire, rollback en cas d’import échoué, confirmation avant import JSON/CSV, validation CSV renforcée, double confirmation avant effacement complet local.
- `assets/js/monitoring-f7-evolution.js` : version v51 harmonisée dans les messages utilisateur.
- `netlify.toml` : headers Netlify durcis : CSP réaliste, permissions-policy complète, COOP/CORP, nosniff, cache différencié, MIME HTML/JSON/CSV.
- `README.md` : ajout de la section d’évolution v51 et clarification client-only.

## Documents ajoutés

- `docs/FICHIERS_MODIFIES_V51.md` : présente liste.
- `docs/RAPPORT_SECURISATION_PHASE_2_V51.md` : rapport Phase 2.
- `docs/PROCEDURE_DEPLOIEMENT_V51.md` : procédure GitHub/Netlify adaptée à v51.

## Non modifié volontairement

- Pas de backend.
- Pas de framework.
- Pas de refonte UI.
- Pas de modification volontaire des calculs métier, KPI, graphiques, CSV métier ou workflows SDIS.

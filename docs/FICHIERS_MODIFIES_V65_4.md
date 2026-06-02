# Fichiers modifies — Monitoring F7 v65.5

## `index.html`

- Version visible alignee en `v65.5`.
- Ajout de `assets/js/session-service.js` avant `auth.js`.
- Ajout de `assets/js/ui/user-modal.js` avant `monitoring-f7-evolution.js`.
- Cache-busting responsive aligne en `?v=65.4`.

## `assets/js/config.js`

- Version centrale alignee en `v65.5`.
- Notice `localAuth` alignee sur la version.

## `assets/js/session-service.js`

- Nouveau service local pour session/profil/logout.
- Centralise les cles `monitoring_sdis_auth_*`.
- Expose `MonitoringSessionManager`.

## `assets/js/auth.js`

- Delegue session/profil a `MonitoringSessionManager`.
- Conserve `MonitoringAuthService` comme facade compatible.
- Message backend prepare aligne en `v65.5`.

## `assets/js/ui/user-modal.js`

- Nouveau helper UI pour modales utilisateur locales.
- Expose `MonitoringUserModal`.

## `assets/js/monitoring-f7-evolution.js`

- Utilise progressivement `MonitoringSessionManager`.
- Utilise progressivement `MonitoringUserModal`.
- Deconnexion locale centralisee.
- Cle de preference vue synthese/detail alignee en v65.5 avec compatibilite des anciennes cles.

## `assets/css/monitoring-f7-evolution.css`

- Styles dedies a la modale utilisateur extraite.

## Documentation

- `docs/RAPPORT_ARCHITECTURE_CIBLEE_V65_4.md`
- `docs/ARCHITECTURE_AUTH_BACKEND_FUTUR_V65_4.md`
- `docs/FICHIERS_MODIFIES_V65_4.md`


# Fichiers modifies — Monitoring F7 v66 backend preparatoire

## Ajoutes

- `package.json`
  - Dependence `pg` pour PostgreSQL dans Netlify Functions.
- `database/schema.sql`
  - Schema PostgreSQL Supabase/Neon.
- `netlify/functions/_postgres.js`
  - Pool PostgreSQL paresseux.
- `netlify/functions/_data-store-postgres.js`
  - Lecture/ecriture des collections metier en PostgreSQL.
- `netlify/functions/_oidc-utils.js`
  - Helpers Okta/OIDC, verification ID token et cookie de session serveur.
- `netlify/functions/auth-oidc-start.js`
  - Demarrage du flux OIDC.
- `netlify/functions/auth-oidc-callback.js`
  - Callback OIDC.
- `docs/BACKEND_POSTGRES_OKTA_OIDC_V66.md`
  - Procedure backend et variables Netlify.

## Modifies

- `netlify/functions/_data-store.js`
  - Selection du stockage par `MONITORING_F7_STORAGE_DRIVER`.
- `netlify/functions/_auth-utils.js`
  - Lecture du token bearer depuis cookie HttpOnly serveur en plus de l'en-tete Authorization.
- `netlify/functions/auth-me.js`
  - Compatibilite avec sessions OIDC sans utilisateur local JSON.
- `netlify/functions/auth-logout.js`
  - Effacement du cookie serveur OIDC.
- `netlify.toml`
  - Redirections OIDC.
- `assets/js/backend-config.js`
  - Options futures PostgreSQL/OIDC documentees, inactives par defaut.

## Non modifies volontairement

- Login local applicatif.
- IndexedDB/localStorage.
- Imports/exports JSON et CSV.
- Calculs metier.
- KPI.
- Gestion des evenements.
- Synchronisation automatique.

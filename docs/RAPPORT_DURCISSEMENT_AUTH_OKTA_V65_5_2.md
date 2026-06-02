# Monitoring F7 v65.5.2 — Durcissement état global Auth Okta

## Objectif

Corriger le reliquat technique observé après la v65.5.1 : l'application ouvrait correctement Monitoring F7 avec l'identité Okta, mais `window.MonitoringAuth` pouvait rester `undefined` alors que `window.CurrentUser`, `window.CurrentRoles` et `window.CurrentPermissions` étaient hydratés.

## Cause technique

La v65.5.1 hydratait correctement l'utilisateur courant lors du retour positif de `/.netlify/functions/auth-me`, mais l'état global `window.MonitoringAuth` dépendait encore trop fortement du cycle d'exécution initial de `auth.js`. Si un autre chemin de restauration session/profil prenait le relais, l'interface pouvait afficher l'utilisateur Okta sans garantir l'exposition durable de `window.MonitoringAuth`.

## Correctif appliqué

- Ajout d'une fonction d'exposition robuste de `window.MonitoringAuth` dans `assets/js/auth.js`.
- Réhydratation de `window.MonitoringAuth` depuis la session/profil Okta lorsque nécessaire.
- Ajout d'une protection dans `assets/js/session-service.js` pour reconstruire l'état global depuis la session institutionnelle existante.
- Conservation stricte du fallback local comme secours technique.
- Ajout de la dépendance `@netlify/blobs` dans `package.json` afin d'éviter l'échec de build Netlify : `Cannot find module '@netlify/blobs'`.
- Mise à jour de la version affichée en `v65.5.2`.

## Fichiers modifiés

- `assets/js/auth.js`
- `assets/js/session-service.js`
- `assets/js/config.js`
- `assets/js/monitoring-f7-evolution.js`
- `index.html`
- `package.json`
- `docs/RAPPORT_DURCISSEMENT_AUTH_OKTA_V65_5_2.md`

## Contrôles attendus après déploiement

```javascript
await fetch('/.netlify/functions/auth-me', { credentials:'include' }).then(r => r.json())
```

Attendu : `ok: true`.

```javascript
window.CurrentUser
window.CurrentRoles
window.CurrentPermissions
window.MonitoringAuth
```

Attendu : objets hydratés, avec :

```javascript
window.MonitoringAuth.isAuthenticated === true
window.MonitoringAuth.mode === 'okta'
```

```javascript
await window.MonitoringApiClient.listRecords()
```

Attendu : `{ ok: true, status: 200 }`.

## Garantie de non-régression

Le correctif ne modifie pas :

- les calculs Monitoring ;
- les KPI ;
- les imports/exports ;
- les graphiques ;
- les effectifs ;
- PostgreSQL ;
- les Netlify Functions ;
- les migrations SQL ;
- la structure des données métier ;
- IndexedDB/localStorage métier.

Le changement est limité à l'exposition et à la persistance frontend de l'état d'authentification Okta déjà validé.

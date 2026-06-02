# Monitoring F7 v66.0 — Procédure déploiement GitHub → Netlify

## Pré-requis Netlify

Variables d’environnement à contrôler dans Netlify :

- `DATABASE_URL`
- `MONITORING_F7_STORAGE_DRIVER=postgres`
- `MONITORING_F7_AUTH_SECRET` avec au moins 32 caractères
- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OIDC_REDIRECT_URI`
- `OIDC_SCOPES=openid profile email groups`
- `OKTA_ALLOWED_GROUPS` selon groupes SDIS autorisés
- `OKTA_ADMIN_GROUPS` selon groupes administrateurs

## Déploiement normal

```bash
cd "/Users/thierrygrunig/Projects/Monitoring F7"
git status
git add .
git commit -m "release: Monitoring F7 v66.0 production institutionnelle"
git push
```

Le push doit déclencher automatiquement le build Netlify lié au dépôt GitHub. Le Netlify Drop manuel ne doit plus être le processus normal.

## Contrôle post-déploiement

Dans la console navigateur du site publié :

```js
await fetch('/.netlify/functions/auth-me', { credentials: 'include' }).then(r => r.json())
await window.MonitoringApiClient.listRecords()
window.CurrentUser
window.CurrentRoles
window.CurrentPermissions
window.MonitoringAuth
```

Attendu : `auth-me.ok === true`, API `ok:true/status:200`, utilisateur Okta et rôles hydratés.

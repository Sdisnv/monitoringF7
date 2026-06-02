# Monitoring F7 v66.0 — Recette production

## Authentification

```js
await fetch('/.netlify/functions/auth-me', { credentials: 'include' }).then(r => r.json())
```

Attendu : `{ ok: true }` avec utilisateur, rôles et permissions.

## API

```js
await window.MonitoringApiClient.listRecords()
```

Attendu : `{ ok: true, status: 200 }`.

## Globals

```js
window.CurrentUser
window.CurrentRoles
window.CurrentPermissions
window.MonitoringAuth
```

Attendu : utilisateur hydraté, rôles hydratés, permissions hydratées, `MonitoringAuth.mode === 'okta'`.

## UI

- Aucun popup NIP en production.
- Aucun code local 1234 utilisable par défaut.
- Aucun message technique rouge au démarrage normal.
- En-tête avec utilisateur Okta et session institutionnelle.
- Navigation privée : redirection Okta, puis retour sans blocage.

## RBAC

Tester au minimum :

- `sdis-admin` : accès administration utilisateurs et audit.
- `sdis-readonly` : consultation uniquement, actions admin refusées.
- `sdis-user` : accès métier normal, admin refusé.

## Administration utilisateurs

- Créer un profil applicatif lié à une identité Okta.
- Modifier les rôles.
- Désactiver un utilisateur.
- Vérifier refus d’accès non-admin.
- Vérifier confirmation forte avant retrait de son propre rôle admin via API.

## Déploiement

- `git push` déclenche Netlify.
- Build vert.
- Functions packagées.
- Aucune dépendance manquante.

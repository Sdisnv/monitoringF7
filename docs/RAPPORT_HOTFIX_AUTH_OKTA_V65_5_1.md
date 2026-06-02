# Monitoring F7 v65.5.1 — Hotfix frontend Auth Okta

## Objectif

Corriger le dernier blocage frontend constaté lorsque `/.netlify/functions/auth-me` retourne déjà `ok: true`, mais que l’interface conserve un overlay ou un état local.

## Cause technique constatée

La v65.5 appelait déjà `auth-me` au chargement et pouvait créer un profil OIDC, mais le frontend restait insuffisamment prioritaire côté UI :

- l’overlay `#authOverlay` était seulement masqué par classe CSS au lieu d’être supprimé ;
- l’état global demandé `window.MonitoringAuth` n’était pas hydraté ;
- l’en-tête utilisateur lisait encore prioritairement certains états locaux ;
- les appels tardifs pouvaient encore présenter un état institutionnel non connecté tant que la session UI n’était pas relue.

## Correctif appliqué

Correctif minimal côté frontend uniquement :

1. `auth-me` est appelé avec `credentials: 'include'` et `cache: 'no-store'`.
2. Si `payload.ok === true`, le frontend hydrate :
   - `window.CurrentUser`
   - `window.CurrentRoles`
   - `window.CurrentPermissions`
   - `window.MonitoringAuth`
3. La session applicative locale compatible est écrite avec `authSource: 'okta-oidc'`.
4. Les verrous visuels sont retirés :
   - suppression de `#authOverlay`
   - suppression de `#loginOverlay`
   - suppression de `#securityModal`
   - retrait de `body.auth-locked`
   - ajout de `body.auth-active`
5. Les écrans de login institutionnel ou fallback local ne se réaffichent pas si `window.MonitoringAuth.mode === 'okta'`.
6. L’en-tête utilisateur privilégie désormais l’identité Okta active.

## Fichiers modifiés

- `assets/js/auth.js`
- `assets/js/session-service.js`
- `assets/js/config.js`
- `assets/js/monitoring-f7-evolution.js`
- `index.html`
- `docs/RAPPORT_HOTFIX_AUTH_OKTA_V65_5_1.md`

## Non-régression

Aucune modification n’a été apportée à :

- la logique métier Monitoring ;
- les KPI ;
- les graphiques ;
- les imports / exports ;
- le dashboard COD ;
- PostgreSQL ;
- les Netlify Functions ;
- les migrations SQL ;
- le schéma de données ;
- IndexedDB / localStorage métier.

Le fallback local est conservé comme secours technique, mais il n’est plus prioritaire lorsqu’une session Okta valide existe.

## Contrôles recommandés après déploiement Netlify

Dans la console navigateur, après connexion Okta :

```js
await fetch('/.netlify/functions/auth-me', {
  credentials: 'include',
  cache: 'no-store'
}).then(r => r.json())
```

Résultat attendu :

```js
{ ok: true }
```

Puis :

```js
await window.MonitoringApiClient.listRecords()
```

Résultat attendu :

```js
{ ok: true, status: 200 }
```

Contrôler aussi :

```js
window.CurrentUser
window.CurrentRoles
window.CurrentPermissions
window.MonitoringAuth
```

Résultat attendu : objets hydratés, avec `MonitoringAuth.isAuthenticated === true` et `MonitoringAuth.mode === 'okta'`.

## Validation visuelle attendue

- aucun popup NIP ;
- aucun popup code local ;
- aucun overlay `Connexion institutionnelle requise` si `auth-me` retourne `ok: true` ;
- ouverture directe de Monitoring F7 ;
- en-tête avec le nom OIDC et `Connecté via Okta`.

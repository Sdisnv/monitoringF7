# Monitoring F7 v66.10 — Rapport hotfix OIDC login flow

## Cause du problème

La v66.0 disposait déjà d’une authentification Okta/OIDC serveur fonctionnelle, mais le flux utilisateur n’était pas encore entièrement institutionnel à lien unique. Le démarrage OIDC ne conservait pas le chemin courant demandé par l’utilisateur et le retour du callback redirigeait systématiquement vers `/`. L’écran de connexion conservait aussi des mentions techniques et un chemin de secours local visible selon configuration.

Le correctif v66.10 transforme le flux en séquence simple : ouverture du lien Monitoring F7, contrôle automatique `auth-me`, affichage d’un écran institutionnel si aucune session n’existe, clic Okta, callback, création cookie serveur, retour automatique vers la page interne demandée.

## Audit obligatoire avant modification

| Élément audité | Fichier | Fonction / emplacement | Ligne v66.10 | Rôle |
|---|---|---:|---:|---|
| `authOverlay` | `index.html` | Overlay initial DOM | 18 | Écran de contrôle de session / connexion institutionnelle |
| `authOverlay` | `assets/js/auth.js` | `showInstitutionalLogin()` | 226-238 | Réécriture de la carte login en mode institutionnel |
| Suppression `authOverlay` | `assets/js/auth.js` | `removeAuthLocks()` | 151-158 | Déverrouille l’application après `auth-me ok:true` |
| `loginOverlay` | Recherche globale | Aucun élément DOM actif | — | Prévu en suppression défensive uniquement |
| Suppression `loginOverlay` | `assets/js/auth.js` | `removeAuthLocks()` | 153 | Suppression défensive si une ancienne version l’injecte |
| `securityModal` | Recherche globale | Aucun élément DOM actif | — | Prévu en suppression défensive uniquement |
| Suppression `securityModal` | `assets/js/auth.js` | `removeAuthLocks()` | 154 | Suppression défensive si une ancienne version l’injecte |
| `auth-locked` | `assets/js/auth.js` | `clearSession()` / `syncAuthUI()` | 139-149 | Verrouillage visuel avant session valide |
| Retrait `auth-locked` | `assets/js/auth.js` | `removeAuthLocks()` | 155 | Accès application après session serveur validée |
| `login-locked` | `assets/js/auth.js` | `clearSession()` / `syncAuthUI()` | 142 / 147 | Verrou défensif ajouté pour compatibilité historique |
| Retrait `login-locked` | `assets/js/auth.js` | `removeAuthLocks()` | 156 | Retrait immédiat après authentification |
| `security-locked` | `assets/js/auth.js` | `clearSession()` / `syncAuthUI()` | 143 / 148 | Verrou défensif ajouté pour compatibilité historique |
| Retrait `security-locked` | `assets/js/auth.js` | `removeAuthLocks()` | 157 | Retrait immédiat après authentification |
| Hydratation utilisateur | `assets/js/auth.js` | `hydrateCurrentUser()` | 90-101 | Alimente `window.CurrentUser`, `window.CurrentRoles`, `window.CurrentPermissions`, `window.MonitoringAuth` |
| Contrôle session serveur | `assets/js/auth.js` | `checkServerAuthentication()` | 184-202 | Appelle `/.netlify/functions/auth-me` avec `credentials: include` et `cache: no-store` |
| Démarrage Okta | `assets/js/auth.js` | `startOktaLogin()` | 211-219 | Redirige vers `auth-oidc-start?returnTo=...` |
| `returnTo` client | `assets/js/auth.js` | `safeCurrentReturnTo()` | 203-210 | Conserve chemin, query string et hash internes |
| Fallback local | `assets/js/config.js` | `localAuth.allowLocalFallback` | 5-12 | Désactivé par défaut en production |
| Fallback local | `assets/js/auth.js` | `restoreLocalFallbackForm()` | 240-261 | Code conservé mais invisible tant que `allowLocalFallback=false` |
| Code local `1234` | `assets/js/auth.js` | `DEFAULT_ACCESS_HASH_HEX` | 3 | Présent uniquement comme héritage technique, non exposé à l’utilisateur |
| Login local | `assets/js/auth.js` | `onSubmit()` | 288-306 | Chemin de secours journalisé si explicitement réactivé |
| Cookie session OIDC | `netlify/functions/_oidc-utils.js` | `secureCookie()` | 65-67 | Cookie `HttpOnly`, `Secure`, `SameSite=Lax` |
| Cookie access | `netlify/functions/_oidc-utils.js` | `oidcCallbackResponse()` | 196-215 | Crée `monitoring_f7_access` après callback validé |
| Lecture cookie | `netlify/functions/_auth-utils.js` | `bearerToken()` | 72-82 | Lit le cookie `monitoring_f7_access` côté serveur |
| `auth-me` | `netlify/functions/auth-me.js` | `handler()` | 4-35 | Vérifie token, reconstruit user/roles/permissions |
| RBAC | `assets/js/rbac.js` | `roles()` / `explicitPermissions()` | 12-13 | Lit `window.CurrentRoles` et `window.CurrentPermissions` |
| `assets/js/bootstrap.js` | Recherche fichier | Absent du ZIP | — | Aucun composant bootstrap séparé à modifier |
| `assets/js/login.js` | Recherche fichier | Absent du ZIP | — | La logique login est dans `assets/js/auth.js` |

## Modifications v66.10

### Frontend

- `index.html` affiche directement un écran institutionnel sobre : logo, titre, texte institutionnel, bouton `Se connecter avec Okta`, message `Contrôle de la session en cours…`.
- `assets/js/auth.js` lance automatiquement `auth-me` au chargement.
- Si `auth-me` retourne `ok:true`, l’application hydrate `CurrentUser`, `CurrentRoles`, `CurrentPermissions`, `MonitoringAuth`, supprime les overlays et retire les classes `auth-locked`, `login-locked`, `security-locked`.
- Si `auth-me` retourne `401` ou une réponse non valide, seul l’écran institutionnel reste visible.
- Le fallback local n’est plus proposé dans l’écran utilisateur standard.
- Le fallback local reste techniquement présent, désactivé par défaut, et journalisé sous `login-local-fallback-used` s’il est explicitement réactivé.

### Backend OIDC

- `auth-oidc-start` accepte `returnTo` et le transmet à `_oidc-utils`.
- `_oidc-utils` valide et stocke `returnTo` dans le cookie d’état OIDC signé.
- `auth-oidc-callback` relit `returnTo`, le revalide, crée le cookie d’accès, puis redirige vers la destination interne demandée.
- En cas d’erreur OIDC, les endpoints redirigent vers `/?authError=1` au lieu d’afficher une erreur JSON technique à l’utilisateur final.

## Logique `returnTo`

Valeurs autorisées :

- `/`
- `/index.html`
- `/?view=events`
- `/#gestion`
- `/?view=events#gestion`

Valeurs refusées et remplacées par `/` :

- `https://evil.example.com`
- `//evil.example.com`
- `javascript:...`
- toute valeur ne commençant pas par `/`

La validation est appliquée deux fois : au départ OIDC et au callback.

## Navigation privée et smartphone

Le flux ne dépend d’aucun token côté frontend ni d’un stockage local pour prouver l’authentification institutionnelle. La preuve de session est le cookie serveur `monitoring_f7_access`, lu par `auth-me` avec `credentials: include`. Cela rend le flux compatible avec Safari, Chrome, Firefox, navigation privée et ouverture depuis e-mail, Teams ou WhatsApp, sous réserve que le navigateur accepte les cookies de première partie du domaine Netlify.

## État du fallback local

- `allowLocalFallback=false` dans `assets/js/config.js`.
- Aucun bouton de secours local n’est rendu dans l’écran standard.
- Aucun code local n’est affiché comme voie normale d’accès.
- Le code reste uniquement pour compatibilité de secours explicite et diagnostic.

## Recette complète

1. Navigateur normal avec session active : ouvrir `https://sdisnv-monitoring-f7.netlify.app`, vérifier accès direct, aucun login, aucun popup local.
2. Cookies supprimés : ouvrir l’URL, vérifier écran institutionnel, cliquer Okta, retour automatique et Monitoring ouvert.
3. Navigation privée Safari / Chrome / Firefox : vérifier login Okta, callback, `auth-me ok:true`.
4. Smartphone iPhone / Android : ouvrir depuis e-mail, Teams ou WhatsApp, vérifier retour automatique.
5. Console :

```js
await fetch('/.netlify/functions/auth-me',{ credentials:'include', cache:'no-store' }).then(r=>r.json())
window.CurrentUser
window.CurrentRoles
window.CurrentPermissions
window.MonitoringAuth
await window.MonitoringApiClient.listRecords()
```

Attendu : `auth-me` retourne `ok:true`; `listRecords()` retourne `{ ok:true, status:200 }`.

6. Sécurité `returnTo` :

```text
/.netlify/functions/auth-oidc-start?returnTo=https://evil.example.com
/.netlify/functions/auth-oidc-start?returnTo=//evil.example.com
/.netlify/functions/auth-oidc-start?returnTo=javascript:alert(1)
```

Attendu : aucune open redirect, fallback `/`.

## Garanties de non-régression

- Aucun module métier Monitoring n’a été modifié.
- Aucune modification des statistiques, KPI, graphiques, imports, exports, événements, effectifs, PostgreSQL, migrations, IndexedDB métier ou dashboard COD.
- RBAC conservé : rôles et permissions continuent de provenir de `auth-me` et `_rbac`.
- Aucun secret ni token n’est stocké dans `localStorage` côté frontend.
- Cookies conservés en `HttpOnly`, `Secure`, `SameSite=Lax`.
- `auth-me` reste l’unique source frontend de vérité pour ouvrir l’application.

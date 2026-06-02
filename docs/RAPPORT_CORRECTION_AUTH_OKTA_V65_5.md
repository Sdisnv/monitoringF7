# Monitoring F7 v65.5 — Correction authentification Okta/OIDC prioritaire

## 1. Cause technique

La v65.4 disposait déjà des Netlify Functions d’authentification et du endpoint `/.netlify/functions/auth-me`, mais le client démarrait encore par la barrière locale :

- `assets/js/auth.js` appliquait `auth-locked` au chargement ;
- aucun contrôle automatique de `auth-me` n’était effectué avant l’affichage du formulaire local ;
- `index.html` contenait directement les champs `NIP ECA utilisateur` et `Code d’accès local` ;
- `monitoring-f7-evolution.js` affichait toujours `Session locale active — navigateur uniquement`.

Résultat : même avec une session Okta valide côté serveur, le popup NIP local restait bloquant.

## 2. Correctif appliqué

La v65.5 inverse l’ordre d’authentification :

1. au chargement, appel automatique de `/.netlify/functions/auth-me` avec `credentials: 'same-origin'` ;
2. si `ok: true`, création de la session applicative, hydratation du profil, des rôles et des permissions ;
3. création des objets globaux :
   - `window.CurrentUser`
   - `window.CurrentRoles`
   - `window.CurrentPermissions`
4. fermeture immédiate de l’overlay ;
5. affichage de `Connecté via Okta` dans la zone utilisateur ;
6. si `ok: false`, affichage d’un écran institutionnel avec bouton `Connexion Okta` vers `/.netlify/functions/auth-oidc-start`.

Le secours local NIP est conservé, mais il n’est plus affiché par défaut et ne bloque plus un utilisateur Okta authentifié.

## 3. Fichiers modifiés

- `index.html`
- `assets/js/config.js`
- `assets/js/auth.js`
- `assets/js/session-service.js`
- `assets/js/monitoring-f7-evolution.js`
- `assets/js/backend-config.js`
- `assets/js/ui/user-modal.js`
- `package.json`
- `scripts/check-local.sh`

## 4. Non-régression

Aucune modification n’a été apportée aux zones suivantes :

- logique métier Monitoring ;
- calculs statistiques ;
- KPI ;
- imports / exports ;
- dashboard COD ;
- effectifs ;
- graphiques ;
- schéma PostgreSQL ;
- Netlify Functions existantes ;
- migrations SQL ;
- logique de synchronisation backend.

La synchronisation automatique reste désactivée côté configuration (`syncEnabled: false`) afin d’éviter toute modification de comportement métier non demandée. Le backend, le stockage central PostgreSQL et l’authentification serveur sont activés côté client via `MonitoringBackendConfigOverrides`.

## 5. Contrôles réalisés localement

- `node --check` sur tous les fichiers JavaScript client et Netlify Functions ;
- contrôle de version v65.5 ;
- contrôle des routes Netlify ;
- contrôle de présence PostgreSQL / Okta ;
- contrôle de configuration backend active et synchronisation automatique non activée.

Commande exécutée avec succès :

```bash
bash scripts/check-local.sh
```

## 6. Tests attendus en production Netlify

Depuis la console navigateur, session Okta valide :

```js
await fetch('/.netlify/functions/auth-me').then(r => r.json())
```

Attendu :

```json
{ "ok": true }
```

Puis :

```js
await window.MonitoringApiClient.listRecords()
```

Attendu :

```json
{ "ok": true, "status": 200 }
```

Avec une session Okta valide, les textes suivants ne doivent pas apparaître :

- `NIP ECA utilisateur`
- `Code d’accès local`
- `Accéder au monitoring`

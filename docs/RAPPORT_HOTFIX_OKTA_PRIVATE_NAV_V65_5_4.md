# Monitoring F7 v65.5.4 — Hotfix Connexion Okta en navigation privée

## Objectif
Corriger le cas où le bouton **Connexion Okta** peut ne pas déclencher visiblement le flux OIDC en navigation privée Safari.

## Cause technique
Le flux `auth-me` retourne logiquement `401 unauthorized` en navigation privée tant qu'aucun cookie Okta n'existe dans cette session isolée. Le bouton devait ensuite rediriger vers `/.netlify/functions/auth-oidc-start`, mais le déclenchement reposait uniquement sur un listener JS attaché après réécriture du contenu de l'overlay.

## Correctif appliqué
- Transformation du bouton Okta en lien réel vers `/.netlify/functions/auth-oidc-start`.
- Ajout d'un gestionnaire de clic capturant et délégué sur `document`.
- Ajout d'une fonction `startOktaLogin()` avec `window.location.assign()` et fallback `window.location.href`.
- Correction de l'appel global à `rehydrateMonitoringAuthFromSession()` pour éviter toute référence hors scope.
- Maintien du fallback local uniquement comme secours technique.

## Fichiers modifiés
- `assets/js/auth.js`
- `assets/js/config.js`
- `assets/js/session-service.js`
- `assets/js/monitoring-f7-evolution.js`
- `index.html`
- `docs/RAPPORT_HOTFIX_OKTA_PRIVATE_NAV_V65_5_4.md`

## Validation attendue
En navigation privée :
1. `auth-me` retourne `401` avant connexion, ce qui est normal.
2. Le clic sur **Connexion Okta** ouvre le flux OIDC.
3. Après validation Okta, Monitoring F7 s'ouvre sans overlay.
4. L'en-tête affiche l'identité OIDC et `Connecté via Okta`.
5. `window.MonitoringAuth` est hydraté.

## Non-régression
Aucune modification métier, statistiques, imports, exports, PostgreSQL, Netlify Functions ou schéma de données.

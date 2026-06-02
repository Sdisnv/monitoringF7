# Fichiers modifiés — Monitoring F7 v65.5

## Objectif

Basculer l’accès utilisateur vers l’authentification institutionnelle Okta/OIDC et supprimer le blocage par formulaire NIP local lorsqu’une session `auth-me` valide existe.

## Liste

- `index.html` : écran initial institutionnel, suppression du formulaire NIP affiché par défaut, version v65.5.
- `assets/js/config.js` : version v65.5 et activation client backend/auth OIDC via `MonitoringBackendConfigOverrides`.
- `assets/js/auth.js` : contrôle automatique `auth-me`, hydratation `CurrentUser/CurrentRoles/CurrentPermissions`, fermeture overlay si Okta valide, écran Connexion Okta si non authentifié, secours local masqué par défaut.
- `assets/js/session-service.js` : session capable d’indiquer `institutional-oidc` avec rôles/permissions.
- `assets/js/monitoring-f7-evolution.js` : affichage utilisateur `Connecté via Okta` et session adaptée.
- `assets/js/backend-config.js` : commentaire clarifié pour la configuration effective.
- `assets/js/ui/user-modal.js` : alignement version.
- `package.json` : version 65.5.0.
- `scripts/check-local.sh` : contrôle local exécutable depuis le dossier projet courant.
- `docs/RAPPORT_CORRECTION_AUTH_OKTA_V65_5.md` : rapport technique.

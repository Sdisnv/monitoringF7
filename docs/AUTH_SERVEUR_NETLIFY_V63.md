# Auth serveur Netlify — Monitoring F7 v63

## Principe

La v63 ajoute une authentification serveur optionnelle avec Netlify Functions. Elle permet une verification reelle cote serveur lorsque l'environnement Netlify est configure.

Par defaut, l'application reste en mode local/offline-first.

## Routes ajoutees

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

Ces routes sont mappees dans `netlify.toml` vers `netlify/functions/*`.

## Variables d'environnement requises

### MONITORING_F7_AUTH_SECRET

Secret serveur utilise pour signer les jetons HMAC.

Exigence minimale : 32 caracteres.

### MONITORING_F7_AUTH_USERS

Tableau JSON d'utilisateurs autorises.

Exemple :

```json
[
  {
    "nip": "12345",
    "displayName": "Utilisateur SDIS",
    "passwordHash": "hash_sha256_du_mot_de_passe",
    "roles": ["sdis-user"],
    "permissions": ["read:monitoring"],
    "active": true
  }
]
```

Le hash est un SHA-256 hex du mot de passe. Il doit etre calcule hors navigateur public et stocke uniquement dans les variables d'environnement Netlify.

## Activation cote client

La v63 ne l'active pas par defaut. Une activation future doit fournir explicitement :

```js
window.MonitoringBackendConfigOverrides = {
  backendEnabled: true,
  apiBaseUrl: "",
  authMode: "backend",
  serverAuthEnabled: true,
  syncEnabled: false
};
```

Cette activation ne doit etre faite qu'apres recette Netlify et validation des comptes.

## Limites v63

- Pas de base utilisateurs dynamique.
- Pas de federation SSO/OIDC.
- Pas de revocation centralisee persistante sans stockage de session.
- Pas de synchronisation de donnees metier.
- Pas d'audit serveur persistant.

La v63 pose une authentification serveur reelle minimale, mais ne remplace pas encore une plateforme institutionnelle complete.

# Contrats API — Monitoring F7 v60

## Principe

La v60 documente les contrats API cibles dans `assets/js/api-contracts.js`. Ces contrats servent de reference pour un futur backend, mais aucune route serveur n'est livree dans cette version.

Par defaut :

- `backendEnabled = false`
- `syncEnabled = false`
- `serverAuthEnabled = false`
- aucune requete distante n'est emise.

## Authentification cible

### POST /auth/login

Authentifie un utilisateur cote serveur.

Requete :

```json
{
  "nip": "string",
  "password": "string"
}
```

Reponse attendue :

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": "MonitoringUser",
  "expiresAt": "ISODateTime"
}
```

Erreurs prevues : `400`, `401`, `423`, `429`.

### GET /auth/me

Retourne l'utilisateur authentifie, ses roles et permissions.

Auth : bearer token ou session HTTP securisee.

Erreurs prevues : `401`, `403`.

### POST /auth/refresh

Renouvelle le jeton d'acces.

Auth : refresh token ou cookie serveur securise.

Erreurs prevues : `401`, `403`.

### POST /auth/logout

Revoque la session serveur.

Auth : bearer token ou session HTTP securisee.

## Donnees cible

### GET /records

Retourne les formations / exercices.

Reponse attendue : `records: MonitoringRecord[]`, `schemaVersion`.

### PUT /records

Remplace ou synchronise le jeu de formations cote serveur.

Requete attendue : `records: MonitoringRecord[]`, `schemaVersion`.

### PUT /imported-events

Synchronise les evenements importes.

### PUT /reference-periods

Synchronise les periodes de reference.

## Roles cibles

- `sdisUser` : lecture monitoring et brouillon local.
- `sdisAdmin` : lecture, ecriture, gestion referentiels, export audit.
- `sdisReadOnly` : lecture uniquement.

## Decisions v60

La facade `MonitoringApiClient` sait preparer un header `Authorization: Bearer ...` si un jeton est fourni par un vrai backend. En mode actuel, elle retourne une reponse desactivee et ne contacte aucun serveur.

La synchronisation reste volontairement separee : documenter les routes ne suffit pas a activer `SyncService`.

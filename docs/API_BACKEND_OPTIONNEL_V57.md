# API backend optionnel — contrats préparatoires v57

## Statut

Document préparatoire uniquement. Aucune API réelle n’est imposée en v57. Le backend est désactivé par défaut et l’application reste locale/offline-first.

## Configuration cible future

```js
{
  backendEnabled: false,
  apiBaseUrl: "",
  syncEnabled: false,
  authMode: "local",
  storageMode: "local",
  auditMode: "local"
}
```

## Contrats possibles futurs

### Utilisateur

```json
{
  "id": "string",
  "nip": "string",
  "displayName": "string",
  "roles": ["admin", "viewer"],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Session

```json
{
  "sessionId": "string",
  "userId": "string",
  "authMode": "backend",
  "issuedAt": "ISO-8601",
  "expiresAt": "ISO-8601"
}
```

### Exercice

```json
{
  "id": "string",
  "domain": "FOBA|PR|DPS|DAP|AUTO|JSP",
  "template": "string",
  "date": "YYYY-MM-DD",
  "nbConvoques": 0,
  "nbPresents": 0,
  "nbExcuses": 0,
  "nbAbsents": 0,
  "metadata": {},
  "updatedAt": "ISO-8601"
}
```

### Import

```json
{
  "id": "string",
  "source": "json|csv",
  "fileName": "string",
  "importedAt": "ISO-8601",
  "recordCount": 0,
  "status": "success|warning|failed"
}
```

### Export

```json
{
  "id": "string",
  "format": "json|csv|pdf",
  "exportedAt": "ISO-8601",
  "recordCount": 0,
  "appVersion": "v57"
}
```

### Journal

```json
{
  "id": "string",
  "level": "info|warning|error|action",
  "eventType": "string",
  "message": "string",
  "at": "ISO-8601",
  "userId": "string|null",
  "data": {}
}
```

### Dashboard

```json
{
  "generatedAt": "ISO-8601",
  "period": "string",
  "domains": [],
  "kpis": {},
  "warnings": []
}
```

### Statistiques

```json
{
  "generatedAt": "ISO-8601",
  "filters": {},
  "summary": {},
  "byDomain": [],
  "bySeries": []
}
```

## Endpoints possibles futurs

Ces routes sont indicatives et non utilisées en v57 :

- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /session/current`
- `GET /exercises`
- `POST /exercises`
- `PUT /exercises/{id}`
- `DELETE /exercises/{id}`
- `POST /imports`
- `POST /exports`
- `POST /audit-events`
- `POST /sync/push`
- `GET /sync/pull`

## Règles futures recommandées

- Ne jamais activer le backend sans fallback local testé.
- Ne jamais considérer le journal local comme preuve d’audit serveur.
- Prévoir gestion des conflits avant toute synchronisation multi-postes.
- Conserver exports JSON pour sauvegarde et reprise.
- Documenter explicitement les migrations de schéma.

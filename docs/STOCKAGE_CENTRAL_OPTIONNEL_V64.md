# Stockage central optionnel — Monitoring F7 v64

## Principe

La v64 ajoute des routes serveur optionnelles pour stocker les donnees metier principales. Le stockage local reste le mode actif par defaut.

Les routes sont protegees par bearer token et supposent donc l'auth serveur v63 activee au prealable.

## Routes ajoutees

- `GET /records`
- `PUT /records`
- `PUT /imported-events`
- `PUT /reference-periods`

Ces routes sont mappees dans `netlify.toml` vers `netlify/functions/data-*`.

## Stockage cible

L'adaptateur `netlify/functions/_data-store.js` tente d'utiliser Netlify Blobs via `@netlify/blobs`.

Si Netlify Blobs n'est pas disponible ou configure, les fonctions repondent proprement :

```json
{
  "ok": false,
  "error": "central_storage_not_configured"
}
```

## Activation future cote client

La v64 ne l'active pas par defaut. Une activation future doit etre explicite :

```js
window.MonitoringBackendConfigOverrides = {
  backendEnabled: true,
  apiBaseUrl: "",
  authMode: "backend",
  serverAuthEnabled: true,
  storageMode: "backend",
  centralStorageEnabled: true,
  syncEnabled: false
};
```

`syncEnabled` doit rester a `false` tant que les conflits multi-postes ne sont pas traites.

## Limites v64

- Pas de synchronisation automatique.
- Pas de resolution de conflits.
- Pas de migration automatique des donnees locales.
- Pas d'audit serveur durable.
- Pas encore de modele SQL/Postgres.

La v64 pose un point d'entree serveur optionnel. Elle ne transforme pas encore Monitoring F7 en application multi-utilisateurs centralisee.

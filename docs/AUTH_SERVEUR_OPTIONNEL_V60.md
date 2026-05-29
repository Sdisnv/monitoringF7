# Auth serveur optionnelle — Monitoring F7 v60

## Etat actuel

Monitoring F7 v60 conserve l'authentification locale existante :

- NIP local ;
- mot de passe local stocke sous forme de hash dans le navigateur ;
- session locale navigateur ;
- aucune verification institutionnelle cote serveur.

Cette barriere protege l'ergonomie d'un poste local, mais ne constitue pas une securite forte.

## Preparation v60

La v60 ajoute une preparation explicite pour une future authentification serveur :

- contrat `POST /auth/login` ;
- contrat `GET /auth/me` ;
- contrat `POST /auth/refresh` ;
- contrat `POST /auth/logout` ;
- roles cibles `sdisUser`, `sdisAdmin`, `sdisReadOnly` ;
- support client d'un bearer token en memoire.

## Non-activation volontaire

Les valeurs par defaut restent :

```js
backendEnabled: false
syncEnabled: false
authMode: "local"
serverAuthEnabled: false
tokenStorage: "memory"
```

Consequence : aucune authentification serveur n'est activee dans la livraison v60.

## Conditions minimales avant activation

Avant toute activation future :

- endpoint HTTPS reel ;
- stockage serveur des utilisateurs ou integration SSO institutionnelle ;
- politique de mot de passe ou federation d'identite ;
- roles et permissions verifies cote serveur ;
- revocation des sessions ;
- journalisation serveur ;
- sauvegarde et restauration des donnees ;
- tests multi-postes et conflits de synchronisation.

## Point d'attention Netlify

Netlify statique gratuit ne suffit pas a fournir une authentification serveur. Une evolution future devra passer par des fonctions serveur, Netlify Identity, un fournisseur OIDC/SAML ou une API institutionnelle separee.

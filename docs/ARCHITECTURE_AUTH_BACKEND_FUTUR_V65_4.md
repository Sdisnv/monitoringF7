# Architecture auth/backend futur — Monitoring F7 v65.5

## Position actuelle

La v65.5 fonctionne en mode local/offline-first. Les Netlify Functions d'authentification existent, mais l'application ne les utilise pas tant que la configuration reste :

```js
backendEnabled: false
authMode: 'local'
serverAuthEnabled: false
storageMode: 'local'
syncEnabled: false
```

Cette position est volontaire. Elle evite de bloquer l'acces lors des deploiements Netlify et preserve les donnees locales.

## Principe de bascule future

Une authentification serveur ne doit etre activee qu'apres recette explicite. La bascule devra etre atomique sur quatre axes :

- `backendEnabled: true`
- `authMode: 'backend'`
- `serverAuthEnabled: true`
- `apiBaseUrl` configure vers les Netlify Functions ou un backend equivalent

La synchronisation et le stockage central ne doivent pas etre actives automatiquement avec l'auth serveur. Ils restent des etapes separees.

## Contrat recommande

1. `auth-login` valide le NIP et le mot de passe cote serveur.
2. Le serveur retourne un access token court et un refresh token.
3. `auth-me` retourne l'utilisateur actif, ses roles et permissions.
4. `auth-refresh` renouvelle la session.
5. `auth-logout` devra recevoir une vraie revocation si un stockage de sessions est ajoute.

## Points de securite a traiter avant activation

- Secrets Netlify configures et suffisamment longs.
- Liste utilisateurs institutionnelle geree hors code public.
- Hashs de mots de passe calcules hors navigateur.
- Politique de roles minimale documentee.
- Procedure de desactivation utilisateur.
- Test de perte reseau : l'app doit echouer proprement vers un mode local controle ou bloquer seulement les fonctions serveur.
- Pas d'annonce de securite institutionnelle tant que l'auth serveur n'est pas activee et recettee.

## Compatibilite offline-first

Le futur backend doit respecter le stockage local existant. L'activation serveur ne doit pas :

- supprimer les donnees locales ;
- forcer une migration destructrice ;
- rendre impossible l'export JSON ;
- casser les imports CSV/JSON ;
- casser les KPI et les calculs metier.

## Chemin propose

1. Recette locale v65.5 stable.
2. Activation d'un environnement test backend separe.
3. Login serveur optionnel derriere configuration.
4. Tests auth serveur sans sync.
5. Stockage central optionnel.
6. Synchronisation maitrisee avec file, conflits et rollback documentes.


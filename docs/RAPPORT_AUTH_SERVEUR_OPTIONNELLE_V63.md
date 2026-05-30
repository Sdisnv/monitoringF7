# Rapport auth serveur optionnelle — Monitoring F7 v63

## Synthese

La v63 franchit une etape importante : Monitoring F7 dispose maintenant de routes d'authentification serveur optionnelles, compatibles Netlify Functions, sans dependance externe et sans activation par defaut.

Le pilote local reste intact. L'auth locale navigateur continue d'etre le mode actif tant que le backend n'est pas explicitement configure.

## Apports

- Verification du mot de passe cote serveur.
- Utilisateurs charges depuis des variables d'environnement Netlify.
- Jetons d'acces et refresh tokens signes par HMAC.
- Routes `/auth/*` conformes aux contrats v60/v62.
- Aucun appel reseau en mode local.

## Securite

Le mot de passe n'est pas verifie dans le navigateur lorsque l'auth serveur est activee. Le navigateur envoie les identifiants a `/auth/login`, et la fonction Netlify verifie le hash serveur.

Les jetons sont signes avec `MONITORING_F7_AUTH_SECRET`. Le secret ne doit jamais etre commite dans le depot.

## Limites

La v63 ne fournit pas encore :

- revocation persistante des sessions ;
- journalisation serveur durable ;
- gestion utilisateurs UI ;
- SSO institutionnel ;
- stockage metier central ;
- synchronisation multi-postes.

## Prochaine phase recommandee

La v64 devrait traiter le stockage central optionnel :

1. choix Postgres ou autre stockage structure ;
2. modele serveur des entites Monitoring F7 ;
3. sauvegarde/restauration serveur ;
4. audit serveur minimal ;
5. synchronisation toujours desactivee jusqu'a validation des conflits.

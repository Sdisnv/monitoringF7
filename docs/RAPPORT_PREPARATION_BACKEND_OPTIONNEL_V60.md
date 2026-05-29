# Rapport preparation backend optionnel — Monitoring F7 v60

## Synthese

La v60 stabilise le socle technique pour une future centralisation, sans transformer le pilote offline-first en application serveur.

Le changement est volontairement court : schema de donnees explicite, contrats API documentes, auth serveur preparee, synchronisation toujours inactive.

## Apports

- Le modele de donnees n'est plus implicite dans le seul code historique.
- Les routes API futures sont nommees et documentees.
- La difference entre session locale et auth serveur est plus claire.
- Le diagnostic local confirme le chargement du schema et des contrats.
- La facade API peut porter un jeton bearer si un backend reel est branche plus tard.

## Ce qui ne change pas

- Les donnees restent dans `localStorage` / IndexedDB.
- L'application reste statique et compatible Netlify gratuit.
- `backendEnabled` reste a `false`.
- `SyncService` reste inactif.
- Aucun calcul metier, KPI, filtre evenement ou workflow SDIS n'est modifie.

## Risques restants

- Pas de multi-utilisateur centralise en v60.
- Pas d'audit trail serveur infalsifiable.
- Pas de controle d'acces institutionnel tant que le backend n'existe pas.
- Les conflits de synchronisation ne sont pas encore resolus.

## Recommandation

Conserver v60 comme version de preparation. La prochaine evolution backend doit etre decidee seulement apres validation du besoin multi-postes :

1. choix d'authentification serveur ;
2. choix du stockage central ;
3. strategie de synchronisation et conflits ;
4. environnement de pre-production ;
5. tests terrain sur donnees non sensibles.

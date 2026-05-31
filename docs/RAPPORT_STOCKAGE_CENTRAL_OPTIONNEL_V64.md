# Rapport stockage central optionnel — Monitoring F7 v64

## Synthese

La v64 prepare un stockage central optionnel pour Monitoring F7, en conservant strictement le fonctionnement local/offline-first actuel.

Les routes serveur existent, sont protegees par l'auth serveur v63 et refusent proprement de fonctionner si le stockage central Netlify Blobs n'est pas disponible.

## Apports

- Routes serveur pour les formations, evenements importes et periodes de reference.
- Protection par bearer token.
- Adaptateur Netlify Blobs optionnel.
- Client API prepare pour lire/remplacer les collections.
- Diagnostic local indiquant que le stockage central est inactif par defaut.

## Ce qui ne change pas

- Les donnees metier restent dans `localStorage` / IndexedDB.
- Aucun push serveur automatique.
- Aucun pull serveur automatique.
- `SyncService` reste inactif.
- Les exports/imports manuels restent la strategie de sauvegarde pilote.

## Risques couverts

La v64 evite un faux mode multi-utilisateurs : elle expose des routes mais ne les utilise pas automatiquement. Cela empeche les collisions silencieuses et les pertes de donnees par ecrasement distant.

## Prochaine phase recommandee

La v65 devrait traiter la synchronisation maitrisee :

1. file d'attente locale ;
2. detection de version serveur ;
3. conflits explicites ;
4. journalisation serveur minimale ;
5. activation sync uniquement apres recette.

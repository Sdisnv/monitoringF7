# Procédure GitHub → Netlify — Monitoring F7 v50

## Publication GitHub

1. Décompresser `Monitoring_F7_v50.zip`.
2. Vérifier que le dossier contient `index.html`, `assets/`, `docs/` et `README.md`.
3. Ne pas ajouter d’exports personnels, sauvegardes JSON réelles, logs, `.env` ou fichiers temporaires.
4. Committer la version v50 dans le dépôt GitHub.
5. Pousser la branche utilisée par Netlify.

## Déploiement Netlify gratuit

1. Laisser Netlify publier le site statique depuis le dépôt GitHub.
2. Aucun build n’est requis si Netlify publie directement le dossier contenant `index.html`.
3. Après déploiement, ouvrir l’URL Netlify.
4. Contrôler : logo login, connexion, menu, onglets, Gestion événements, Gestion effectif, Gestion Monitoring, imports/export, KPI et graphiques.

## Première installation

1. Ouvrir `index.html` localement ou depuis Netlify.
2. Contrôler l’absence d’erreur critique au chargement.
3. Se connecter avec le flux de première connexion existant.
4. Remplacer le mot de passe temporaire.
5. Vérifier que localStorage/IndexedDB s’initialisent sans action serveur.
6. Importer ou saisir un jeu de test.
7. Réaliser un export de sauvegarde.

## Persistance et mises à jour

Les données utilisateur sont conservées dans le navigateur. Remplacer les fichiers sur GitHub/Netlify ne supprime pas localStorage/IndexedDB. Avant une grosse mise à jour, effectuer un export JSON de sauvegarde depuis l’application.

# Procédure de déploiement — Monitoring F7 v58

## 1. Préparation

1. Décompresser `Monitoring_F7_v58.zip`.
2. Contrôler la présence de `index.html`, `assets/`, `docs/`, `README.md` et `netlify.toml`.
3. Ne pas ajouter au dépôt les exports utilisateurs, sauvegardes locales, journaux support ou fichiers temporaires.

## 2. Déploiement GitHub

1. Créer une branche ou un commit dédié, par exemple `release/v58-pre-release`.
2. Remplacer les fichiers applicatifs du dépôt par ceux de la v58.
3. Vérifier que `netlify.toml` reste à la racine publiée.
4. Commit recommandé : `Monitoring F7 v58 - stabilisation finale pré-release`.
5. Après recette, créer éventuellement un tag Git : `v58-pre-release`.

## 3. Déploiement Netlify gratuit

Configuration attendue :

- application statique ;
- aucun backend ;
- aucune commande de build ;
- dossier publié : racine du projet contenant `index.html` ;
- `netlify.toml` avec `publish = "."`.

Étapes :

1. Lier le dépôt GitHub à Netlify.
2. Définir le dossier publié sur la racine si nécessaire.
3. Laisser la commande de build vide.
4. Publier.
5. Ouvrir l’URL Netlify et contrôler l’affichage v58.

## 4. Contrôle ouverture locale

1. Ouvrir directement `index.html` depuis le dossier décompressé.
2. Contrôler le chargement CSS/JS.
3. Vérifier que le login local apparaît.
4. Contrôler les onglets principaux, le dashboard, les imports/export et les diagnostics.

## 5. Contrôle stockage avant mise à jour

Avant remplacement d’une version pilote utilisée :

1. Demander aux utilisateurs un export JSON de sauvegarde.
2. Demander, si nécessaire, un export du journal support local.
3. Informer que les données sont stockées dans le navigateur et non dans Netlify/GitHub.

## 6. Contrôle après mise à jour

Vérifier :

- version visible v58 ;
- login/logout ;
- dashboard commandement ;
- KPI/graphiques ;
- import JSON ;
- import CSV ;
- export JSON/CSV/PDF selon usage ;
- diagnostic local ;
- journal audit-log ;
- backend indiqué comme désactivé ;
- synchronisation indiquée comme inactive.

## 7. Limites à communiquer

Monitoring F7 v58 est compatible Netlify gratuit et GitHub, mais reste client-only :

- pas de sécurité institutionnelle forte ;
- pas de backend réel ;
- pas de synchronisation réelle ;
- pas de multi-utilisateur centralisé ;
- données et journaux stockés localement dans le navigateur.

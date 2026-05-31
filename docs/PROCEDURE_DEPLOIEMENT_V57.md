# Procédure de déploiement — Monitoring F7 v57

## Principe

La v57 reste une application statique. Aucun backend, aucune variable d’environnement, aucun build et aucun serveur applicatif ne sont nécessaires.

## Déploiement local

1. Décompresser `Monitoring_F7_v57.zip`.
2. Ouvrir `index.html` dans un navigateur moderne.
3. Contrôler le login local.
4. Contrôler le diagnostic local.
5. Tester un export JSON de sécurité.

## Déploiement GitHub / Netlify gratuit

1. Décompresser le ZIP.
2. Copier le contenu applicatif dans le dépôt GitHub.
3. Committer les fichiers de l’application.
4. Vérifier que les exports utilisateurs et fichiers temporaires ne sont pas ajoutés au dépôt.
5. Laisser Netlify publier le site statique contenant `index.html`.
6. Ouvrir l’URL Netlify.
7. Contrôler : login, imports, exports, dashboard commandement, KPI, graphiques et diagnostic local.

## Données utilisateur

Les données utilisateur restent dans IndexedDB/localStorage du navigateur. Une mise à jour des fichiers GitHub/Netlify ne les écrase pas. Un export JSON doit toutefois être réalisé avant toute mise à jour importante.

## Backend optionnel futur

La v57 contient des fichiers préparatoires mais le backend est désactivé :

- `backendEnabled: false`
- `syncEnabled: false`
- `authMode: local`
- `storageMode: local`
- `auditMode: local`

Ne pas modifier ces valeurs en production sans phase de test dédiée.

## Contrôles post-déploiement

- Ouverture sans erreur bloquante.
- Aucune requête API obligatoire.
- Diagnostic : backend désactivé, stockage local, auth locale, sync inactive.
- Import JSON OK.
- Export JSON/CSV/PDF OK selon workflows existants.
- Dashboard commandement visible.
- Graphiques visibles ou fallback propre si Chart.js indisponible.
- Journal local exportable.

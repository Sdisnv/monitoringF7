# Procédure de déploiement Monitoring F7 v56

## Préparation

1. Conserver une copie du ZIP v55 de référence.
2. Décompresser `Monitoring_F7_v56.zip`.
3. Vérifier que les fichiers suivants sont présents :
   - `index.html` ;
   - `assets/js/audit-log.js` ;
   - `assets/js/config.js` ;
   - `assets/js/storage.js` ;
   - `assets/js/app.js` ;
   - `docs/RAPPORT_JOURNALISATION_PHASE_7_V56.md`.

## Déploiement GitHub / Netlify gratuit

1. Remplacer les fichiers applicatifs du dépôt GitHub par ceux de la v56.
2. Ne pas ajouter d’exports utilisateur, backups privés, journaux exportés, fichiers temporaires ou données locales.
3. Committer avec un message clair, par exemple : `Monitoring F7 v56 - journalisation locale diagnostic`.
4. Laisser Netlify publier le site statique.
5. Aucun build, backend ou framework n’est requis.

## Contrôles après publication

Tester :

- ouverture de l’application ;
- affichage de la version v56 dans l’en-tête ;
- login local ;
- logout ;
- accès à `Gestion Monitoring` ;
- accès à `Diagnostic local` ;
- présence d’entrées dans le journal ;
- export du journal support ;
- vidage du journal avec confirmation ;
- import JSON ;
- import CSV ;
- export JSON ;
- export CSV ;
- dashboard commandement ;
- graphiques ;
- KPI ;
- ouverture locale de `index.html`.

## Persistance des données

La v56 conserve le modèle offline-first et les stockages locaux existants. Un remplacement des fichiers applicatifs via GitHub/Netlify ne supprime pas les données stockées dans le navigateur de l’utilisateur.

Recommandation : faire un export de sauvegarde complète avant déploiement pilote ou changement de poste.

## Limites

La journalisation v56 reste locale au navigateur. Elle est utile au diagnostic, mais :

- n’est pas infalsifiable ;
- n’est pas centralisée ;
- ne remplace pas un audit serveur ;
- ne fournit pas de sécurité institutionnelle forte ;
- ne doit pas être utilisée comme preuve réglementaire.

## Retour arrière

En cas de problème bloquant :

1. conserver les données navigateur ;
2. republier la v55 depuis GitHub ;
3. demander un export JSON des données métier si nécessaire ;
4. demander un export du journal support v56 si l’application reste accessible.

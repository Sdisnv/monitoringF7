# Procédure de déploiement Monitoring F7 v55

## Préparation

1. Sauvegarder les données utilisateur depuis l’application actuelle via les exports disponibles.
2. Conserver une copie du ZIP v54 et du ZIP v55.
3. Décompresser `Monitoring_F7_v55.zip` localement.
4. Ouvrir `index.html` en local pour contrôle rapide.

## Contrôles locaux recommandés

- Connexion / déconnexion locale ;
- affichage de la version v55 dans l’en-tête ;
- ouverture du `Dashboard commandement` ;
- affichage des KPI avec données complètes, partielles et sans données ;
- affichage du tableau commandement dans l’ordre FOBA, PR, DPS, DAP, AUTO, JSP ;
- affichage du graphique commandement simplifié ;
- affichage des `Points de vigilance` ;
- import JSON ;
- export JSON / CSV / PDF si utilisé ;
- conservation IndexedDB/localStorage ;
- ouverture des onglets existants.

## Déploiement GitHub / Netlify gratuit

1. Remplacer les fichiers applicatifs du dépôt GitHub par ceux de la v55.
2. Ne pas committer de fichiers temporaires, exports utilisateur, logs ou sauvegardes privées.
3. Vérifier que `netlify.toml` reste présent.
4. Laisser Netlify publier le site statique sans build.
5. Après publication, ouvrir l’URL Netlify et contrôler les points locaux ci-dessus.

## Retour arrière

En cas d’anomalie :

1. restaurer le commit GitHub v54 ;
2. republier Netlify ;
3. conserver les données navigateur, car la v55 ne supprime pas localStorage/IndexedDB ;
4. réimporter une sauvegarde uniquement si nécessaire.

## Note sécurité

La v55 reste une application statique client-only. Elle ne fournit pas d’authentification institutionnelle serveur, pas d’audit trail sécurisé et pas de contrôle d’accès fort. Ces limites restent inchangées par rapport aux phases précédentes.

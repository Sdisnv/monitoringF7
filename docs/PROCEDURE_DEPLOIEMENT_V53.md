# Monitoring F7 v53 — Procédure de déploiement

## Préparation

1. Sauvegarder le ZIP v52 actuellement utilisé.
2. Exporter un JSON depuis l’application v52 si des données réelles existent.
3. Décompresser `Monitoring_F7_v53.zip`.
4. Déployer le contenu du dossier sur Netlify ou ouvrir `index.html` localement.

## Contrôles après mise en ligne

1. Ouvrir l’application.
2. Vérifier que la version visible est `v53`.
3. Contrôler la console : un diagnostic `Monitoring F7 stockage v53` doit apparaître.
4. Vérifier login/logout.
5. Vérifier KPI, graphiques, filtres, tableaux et navigation.
6. Tester un export JSON.
7. Tester un import JSON v49/v50/v51/v52 si disponible.
8. Recharger la page et vérifier la persistance des données.

## Migration localStorage vers IndexedDB

La migration est automatique et non destructive. Les anciennes clés `localStorage` restent présentes. IndexedDB devient une couche robuste supplémentaire, avec fallback localStorage.

## Rollback

En cas de problème bloquant :

1. redéployer la v52 ;
2. conserver le même navigateur ;
3. les anciennes données `localStorage` restent lisibles ;
4. utiliser l’export JSON v52/v53 si une restauration manuelle est nécessaire.

## Points de vigilance

- Ne pas vider manuellement le stockage navigateur pendant la recette.
- Tester d’abord sur un navigateur pilote avant diffusion large.
- IndexedDB peut être bloqué par certains contextes privés ou politiques navigateur ; dans ce cas, localStorage reste actif.

# Procédure GitHub → Netlify — Monitoring F7 v52

## Préparation

1. Décompresser `Monitoring_F7_v52.zip`.
2. Vérifier que `index.html`, `assets/`, `docs/`, `README.md` et `netlify.toml` sont présents.
3. Ne pas supprimer les données navigateur des utilisateurs pilotes.

## Déploiement GitHub

1. Remplacer les fichiers du dépôt GitHub par le contenu complet de la v52.
2. Vérifier que les chemins restent relatifs.
3. Commit conseillé : `Monitoring F7 v52 - modularisation progressive phase 3`.
4. Pousser sur la branche connectée à Netlify.

## Déploiement Netlify

1. Laisser le site en mode statique sans build.
2. Vérifier que `netlify.toml` est bien détecté.
3. Attendre le déploiement.
4. Ouvrir le site dans un navigateur vierge.

## Contrôles après déploiement

- version visible `v52` ;
- logo chargé ;
- CSS chargé ;
- scripts chargés dans l’ordre ;
- login/logout ;
- import JSON ;
- import CSV ;
- export JSON/CSV ;
- KPI ;
- graphiques ;
- filtres ;
- tableaux ;
- console sans erreur bloquante.

## Rollback

En cas de problème bloquant :

1. revenir au commit v51 ;
2. ne pas effacer les données navigateur ;
3. conserver le ZIP v52 pour analyse ;
4. comparer les modules `utils`, `render` et `data` modifiés.

# Procédure de déploiement — Monitoring F7 v54

## Préparation

1. Sauvegarder les données utilisateur depuis l’application en export JSON.
2. Décompresser `Monitoring_F7_v54.zip`.
3. Vérifier que le dossier contient bien `index.html`, `assets/`, `docs/`, `README.md` et `netlify.toml`.

## Déploiement GitHub / Netlify gratuit

1. Remplacer les fichiers applicatifs dans le dépôt GitHub par ceux de la v54.
2. Ne pas ajouter de données utilisateur privées, exports temporaires, logs locaux ou fichiers système.
3. Committer avec un message explicite, par exemple :

   `Monitoring F7 v54 - Phase 5 KPI et graphiques`

4. Laisser Netlify publier le site statique.
5. Ouvrir l’URL Netlify après publication.

## Contrôles après publication

### Version

- Le titre navigateur indique v54.
- L’en-tête affiche v54.
- Le pied de page / note de version indique v54.
- `assets/js/config.js` contient `version: 'v54'`.

### Fonctionnement général

- ouverture locale possible via `index.html` ;
- ouverture Netlify possible ;
- login/logout fonctionnels ;
- données locales conservées ;
- IndexedDB/localStorage fonctionnels ;
- StorageService présent ;
- import JSON fonctionnel ;
- export JSON fonctionnel ;
- export CSV fonctionnel ;
- filtres fonctionnels.

### KPI

- aucun `NaN` visible ;
- aucun `Infinity` visible ;
- exercices comptabilisés cohérents ;
- convoqués cohérents ;
- présents cohérents ;
- excusés cohérents ;
- absents non excusés cohérents ;
- taux brut cohérent ;
- taux net ajusté cohérent ;
- alertes métier informatives et non bloquantes.

### Graphiques

- graphiques visibles si données disponibles ;
- message propre si données vides ;
- reload sans doublon graphique ;
- filtres année/domaine fonctionnels ;
- console sans erreur bloquante liée aux graphiques.

## Retour arrière

En cas de problème, restaurer les fichiers v53 dans GitHub/Netlify. Les données utilisateur locales ne sont pas supprimées par un retour arrière fichier, car elles restent dans le navigateur via IndexedDB/localStorage.

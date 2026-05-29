# Monitoring F7 v48 — modifications appliquées

## Fichiers créés

- `assets/css/monitoring-f7-evolution.css`
- `assets/js/monitoring-f7-evolution.js`
- `docs/NETLIFY_GITHUB_PERSISTANCE.md`
- `docs/MODIFICATIONS_V48.md`

## Fichiers modifiés

- `index.html`
- `assets/css/base.css`

## Résumé

- Ajout d’onglets dédiés : Import événements, Formations, Effectifs, Administration, Paramètres / Sauvegarde.
- Déplacement non destructif au chargement des blocs existants : saisie formation, effectifs, import, actions sensibles.
- Ajout d’un import CSV/JSON non destructif avec prévisualisation et résumé.
- Ajout d’une gestion des statuts d’événements : importé, à traiter, prioritaire, en cours, traité, ignoré / non comptabilisé.
- Ajout d’un export / restauration de sauvegarde complète du stockage local Monitoring F7.
- Ajout d’un menu Admin local avec code hashé, statistiques techniques et fonctions sensibles déplacées.
- Ajout d’une méta-version de données : application, schéma, dernière migration.
- Centralisation du rouge institutionnel sur `--sdis-primary-red` avec valeur `#cc0000`, documentée par l’espace presse SDIS NV.

## Limites connues

- La sécurité Admin reste locale, adaptée à Netlify gratuit/offline-first, mais pas équivalente à une authentification serveur.
- Les données restent liées au navigateur/profil utilisateur. Pour changer de poste, utiliser l’export/restauration.
- L’application conserve volontairement la logique métier existante et le stockage local déjà en place.

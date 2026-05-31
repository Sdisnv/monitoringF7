# Monitoring F7 v50 — Liste des fichiers modifiés

## Fichiers modifiés

- `index.html` : passage visible en v50, clarification du mode Admin local, état de session plus explicite.
- `README.md` : ajout de la section d’évolution v50.
- `assets/js/config.js` : version applicative passée à `v50`.
- `assets/js/auth.js` : session locale normalisée en JSON, compatibilité avec l’ancien marqueur `1`, logout plus propre, conservation des profils existants.
- `assets/js/app.js` : validations JSON/CSV, messages d’import plus sûrs, version exportée, fallback graphique si Chart.js est indisponible, protection contre valeurs graphiques non numériques.
- `assets/js/monitoring-f7-evolution.js` : version v50, lecture robuste de session JSON/legacy, messages de session/Admin local clarifiés.
- `assets/css/monitoring-f7-evolution.css` : commentaires de version harmonisés en v50.

## Fichiers ajoutés

- `netlify.toml` : configuration Netlify statique avec headers sécurité, MIME JSON/CSV et cache assets.
- `docs/RAPPORT_STABILISATION_PHASE_1_V50.md` : rapport de stabilisation Phase 1.
- `docs/FICHIERS_MODIFIES_V50.md` : liste détaillée des modifications.
- `docs/PROCEDURE_DEPLOIEMENT_V50.md` : procédure de déploiement v50 dérivée de la procédure v49.

## Fichiers conservés comme historiques

Les documents `V49` existants sont conservés comme archives de la phase précédente. Ils ne sont pas utilisés comme version active.

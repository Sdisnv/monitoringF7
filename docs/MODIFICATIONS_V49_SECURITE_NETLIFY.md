# Monitoring F7 v49 — logo, audit sécurité et préparation Netlify/GitHub

## Base utilisée

- Base strictement utilisée : `Monitoring F7 v48.zip`.
- Version finale : `Monitoring F7 v49`.
- Backend : aucun backend obligatoire ajouté.
- Hébergement : compatible Netlify gratuit et dépôt GitHub statique.

## Fichiers modifiés

- `index.html`
- `README.md`
- `assets/css/monitoring-f7-evolution.css`
- `assets/js/config.js`
- `assets/js/auth.js`
- `assets/js/monitoring-f7-evolution.js`

## Fichiers créés

- `assets/img/logo-monitoring-f7.jpeg`
- `docs/MODIFICATIONS_V49_SECURITE_NETLIFY.md`
- `docs/AUDIT_SECURITE_V49.md`
- `docs/PROCEDURE_DEPLOIEMENT_V49.md`

## Corrections appliquées

- Passage visible et technique en v49.
- Intégration du logo Monitoring F7 dans les assets.
- Remplacement du badge texte `SDIS` sur le login par le logo Monitoring F7 à gauche de `Accès Monitoring`.
- Ajout CSS responsive pour logo non déformé.
- Renforcement mineur du login local : session structurée en `sessionStorage`, validation de profil, mot de passe initial remplacé avec longueur minimale renforcée à 6 caractères.
- Confirmation explicite à la déconnexion.
- Limites de taille sur imports CSV/JSON de la couche v49.
- Restauration de sauvegarde limitée aux clés localStorage connues et autorisées.
- Conservation stricte du mode offline-first et des données locales navigateur.

## Autocontrôle v49

- Version affichée : v49.
- Logo présent dans `assets/img/logo-monitoring-f7.jpeg`.
- Logo chargé depuis un chemin relatif compatible Netlify.
- Aucun secret réel ajouté.
- Aucun fichier serveur, `.env`, log, sauvegarde réelle ou donnée utilisateur ajouté.
- IndexedDB/localStorage conservés.
- KPI, graphiques, calculs métier et imports/export historiques non refondus.

# Fichiers modifies — Monitoring F7 v65.1

## `index.html`

- Version visible alignee en `v65.1`.
- Suppression du bloc de changement de mot de passe utilisateur.
- Remplacement des messages de premiere connexion temporaire.
- Clarification du libelle de code d'acces local.
- Message Admin local clarifie sans procedure de recuperation publique.

## `assets/js/config.js`

- Version centrale alignee en `v65.1`.
- Ajout de `MonitoringConfig.localAuth`.
- Preparation d'une configuration locale stricte par NIP sans activer de backend.

## `assets/js/auth.js`

- Suppression de la creation/changement de mot de passe cote utilisateur.
- Validation contre la configuration locale.
- Conservation de session `sessionStorage` avec backup `localStorage`.
- Compatibilite avec les profils v65 existants pour eviter les pertes d'acces apres mise a jour.
- Statut auth enrichi pour distinguer session locale et backend prepare.

## `assets/js/monitoring-f7-evolution.js`

- Le changement du code Admin local exige maintenant le code courant.
- Le code initial local reste disponible tant qu'aucun code Admin n'a ete defini.

## `docs/RAPPORT_CORRECTION_LOGIN_V65_1.md`

- Documentation du correctif login, de ses limites et des tests de recette.


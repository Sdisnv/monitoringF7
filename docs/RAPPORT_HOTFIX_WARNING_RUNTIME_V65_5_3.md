# Monitoring F7 v65.5.3 — Hotfix avertissement technique local

## Objectif
Supprimer l’affichage intempestif de l’avertissement technique local lorsqu’une erreur provient de la console développeur ou d’un contexte externe non applicatif.

## Cause constatée
La v65.5.2 ajoutait la classe CSS `monitoring-runtime-warning` pour toute erreur JavaScript globale. Une erreur de saisie dans la console DevTools pouvait donc afficher le bandeau rouge, même si l’application, Okta, les rôles et l’API backend fonctionnaient correctement.

## Correctif appliqué
- Modification minimale de `assets/js/security.js`.
- Ajout d’un filtre `shouldShowRuntimeWarning()`.
- Les erreurs de type console/DevTools sans fichier source applicatif ne déclenchent plus le message utilisateur.
- Les erreurs applicatives réelles continuent d’être journalisées et peuvent toujours afficher l’avertissement.

## Non-régression
Aucune modification de la logique métier, des KPI, des imports/exports, de PostgreSQL, des Netlify Functions, du schéma SQL ou du stockage métier.

## Version
Version affichée mise à jour en `v65.5.3`.

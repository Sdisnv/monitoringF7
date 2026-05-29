# Monitoring F7 v48 — Réorganisation UI / métier

## Fichiers modifiés
- `index.html`
- `assets/css/monitoring-f7-evolution.css`
- `assets/js/app.js`
- `assets/js/monitoring-f7-evolution.js`

## Fichiers créés
- `docs/MODIFICATIONS_V48_REORGANISATION_UI_METIER.md`

## Synthèse
Cette livraison réorganise l’interface Monitoring F7 v48 sans backend obligatoire, sans modification serveur et sans remplacement du stockage local existant.

## Navigation principale
Ordre final des onglets :
1. Tableau de bord
2. Analyses avancées
3. Graphiques
4. Gestion événements
5. Gestion effectif
6. Gestion Monitoring

`Gestion Monitoring` reste le dernier onglet. La page par défaut reste `Tableau de bord`.

## Gestion événements
L’onglet `Gestion événements` devient le centre métier complet. Son ordre interne est :
1. Saisie événements
2. Événements à traiter
3. Liste des événements

Les actions `Modifier` et `Traiter` ouvrent désormais la saisie événements avec les données préchargées. Le traitement direct depuis la vue `Événements à traiter` a été supprimé.

## Événements à traiter
La section filtre automatiquement les événements du jour uniquement et exclut les événements traités, clôturés, annulés ou déjà comptabilisés.

## Gestion effectif
Un onglet autonome `Gestion effectif` a été ajouté entre `Gestion événements` et `Gestion Monitoring`. Il contient l’effectif de référence, les actions existantes de période et un historique simple avec aperçu, chargement et suppression confirmée.

## Gestion Monitoring
Cette vue est désormais dédiée aux fonctions techniques : import événements, sauvegarde, restauration et outils Admin. Les effectifs n’y sont plus mélangés.

## Zone utilisateur
Ajout d’une zone utilisateur dans l’entête avec icône, état de session locale, menu utilisateur, informations session, accès rapide sauvegarde et déconnexion.

## UI / UX
L’onglet actif utilise désormais un gris anthracite discret. Le rouge SDIS reste réservé à l’identité institutionnelle et aux actions/alertes pertinentes.

## Protections anti-régression
- Stockage local existant conservé.
- Clés localStorage existantes non renommées.
- Imports/exports existants conservés.
- Calculs KPI, graphiques, analyses et fonctions de synthèse non refondus.
- Aucune configuration serveur ajoutée ou modifiée.

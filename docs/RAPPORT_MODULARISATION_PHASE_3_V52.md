# Monitoring F7 v52 — Rapport de modularisation Phase 3

## Objectif

La Phase 3 vise une modularisation progressive de Monitoring F7 sans réécriture complète. Le but est de commencer à sortir des éléments sûrs de `assets/js/app.js`, tout en conservant les workflows SDIS, les KPI, les graphiques, les imports/export et les protections ajoutées en v50/v51.

## Principe appliqué

La v52 n’effectue pas de big bang architectural. Elle introduit des façades stables et des wrappers temporaires afin que les appels historiques continuent de fonctionner.

Une façade globale `window.MonitoringF7` est amorcée pour exposer progressivement :

- `MonitoringF7.dom`
- `MonitoringF7.numbers`
- `MonitoringF7.dates`
- `MonitoringF7.formatters`
- `MonitoringF7.charts`
- `MonitoringF7.kpis`
- `MonitoringF7.importJson`
- `MonitoringF7.exportJson`
- `MonitoringF7.summary`
- `MonitoringF7.series`

## Extractions réalisées

### Helpers DOM

`assets/js/utils/dom.js` centralise désormais les helpers :

- sélection DOM simple ;
- texte sûr ;
- échappement HTML ;
- échappement attribut ;
- écriture texte ;
- écriture HTML via sanitation v51 ;
- création d’éléments sûre.

`app.js` délègue progressivement `safeText`, `escapeHtml`, `escapeHtmlAttr` et `setElementText` à cette couche.

### Helpers dates

`assets/js/utils/dates.js` centralise :

- année courante ;
- trimestre ;
- semestre ;
- format date CH ;
- format date input ;
- parsing flexible `JJ.MM.AAAA`, `JJ/MM/AAAA`, ISO ;
- auto-formatage des champs date.

`app.js` conserve les fonctions historiques mais les transforme en wrappers compatibles.

### Helpers nombres et formatage

`assets/js/utils/numbers.js` et `assets/js/utils/formatters.js` centralisent :

- conversion entière positive ;
- conversion numérique sûre ;
- pourcentage sûr ;
- format `0.0%` ;
- points signés.

### Rendu graphiques

`assets/js/render/render-charts.js` devient un vrai module actif :

- rendu vide ;
- couleurs métier ;
- barres verticales ;
- barres horizontales ;
- barres doubles ;
- camembert canvas ;
- courbe Chart.js avec fallback ;
- destruction propre des instances Chart.js ;
- normalisation des données numériques.

Les fonctions historiques dans `app.js` restent présentes mais délèguent au module. Cela évite une rupture brutale des appels internes.

### Import JSON

`assets/js/data/import-json.js` centralise les validations génériques :

- type fichier ;
- taille ;
- structure Monitoring F7 ;
- champs inattendus critiques ;
- limites de volume.

`app.js` continue de gérer le flux métier complet, le rollback et les messages utilisateur, mais utilise la façade extraite.

### Export JSON

`assets/js/data/export-json.js` introduit une base réutilisable pour les prochaines phases :

- métadonnées export ;
- sérialisation JSON sûre.

### Calculs purs

`assets/js/calculations/summary.js` et `assets/js/calculations/series.js` exposent uniquement des fonctions simples et sans risque. Les calculs métier complexes restent dans `app.js` pour éviter une régression.

## Ce qui reste volontairement dans `app.js`

Restent dans `app.js` :

- les agrégations métier complètes ;
- les calculs SDIS sensibles ;
- les séries multi-sessions complexes ;
- les rendus tableaux détaillés ;
- la gestion complète des formulaires ;
- la logique import/export complète ;
- les flux UI fortement couplés.

Ces blocs sont conservés volontairement car ils présentent encore trop de dépendances croisées pour une extraction sûre en Phase 3.

## Gains obtenus

- Modules existants rendus réellement actifs.
- `app.js` légèrement allégé.
- Délégation progressive sans rupture.
- Façade de compatibilité prête pour les phases futures.
- Rendu graphique mieux isolé.
- Helpers DOM/dates/nombres centralisés.
- Base technique plus saine pour la migration stockage Phase 4.

## Risques résiduels

- `app.js` reste le cœur principal.
- De nombreux `innerHTML` historiques subsistent, mais les helpers v51/v52 limitent progressivement les risques.
- Les calculs métier complexes ne sont pas encore isolés.
- Le stockage n’est pas encore migré vers une couche IndexedDB dominante.

## Tests réalisés

- Contrôle syntaxe JavaScript par fichier modifié.
- Contrôle version v52 dans les fichiers principaux.
- Contrôle ordre de chargement des scripts.
- Contrôle présence des modules v52.
- Contrôle conservation des protections v51.

## Tests métier à réaliser en navigateur

- ouverture locale `index.html` ;
- déploiement Netlify ;
- login/logout ;
- session après rechargement ;
- import JSON v51 ;
- import CSV ;
- export JSON/CSV ;
- affichage KPI ;
- affichage graphiques ;
- filtres ;
- tableaux ;
- responsive tablette/laptop.

## Recommandations Phase 4

La Phase 4 doit éviter une extraction UI supplémentaire trop large et se concentrer sur la migration stockage progressive :

1. créer un `StorageService` central ;
2. versionner le schéma local ;
3. migrer doucement localStorage vers IndexedDB ;
4. garder un fallback lecture localStorage ;
5. ajouter un export de sécurité avant migration ;
6. documenter clairement la non-perte de données.

# Rapport responsive smartphone — Monitoring F7 v65.3

## Objectif

La v65.3 rend la consultation smartphone exploitable sans modifier la logique metier, les calculs, les imports/exports, le stockage local ou la synchronisation preparee.

## Corrections appliquees

- `assets/css/responsive.css` devient un vrai fichier responsive.
- Conservation du rendu desktop existant.
- Adaptation tablette des grilles, formulaires, filtres, actions et dashboard.
- Reduction des debordements horizontaux sur smartphone.
- Boutons tactiles portes a une hauteur minimale plus confortable.
- KPI et blocs commandement empiles sur petit ecran.
- Premiere transformation en cartes pour les tableaux critiques :
  - `recordsTable` — liste des evenements ;
  - `overdueTable` — evenements a traiter ;
  - `commandDomainTable` — synthese commandement par domaine ;
  - `objectiveTable` — objectifs commandement.

## Strategie retenue

La transformation en cartes est faite en CSS uniquement. Les fonctions JavaScript qui calculent et rendent les donnees ne sont pas modifiees. Les libelles des cartes sont portes par les `nth-child` des cellules afin de conserver le DOM historique.

Les tableaux non critiques restent scrollables pour limiter le risque de regression.

## Points de vigilance

- Les vues cartes reposent sur l'ordre actuel des colonnes.
- Si une colonne critique est ajoutee ou deplacee dans le futur, les libelles CSS devront etre ajustes.
- Les tableaux d'analyse avancés pourront etre traites dans une phase responsive ulterieure si besoin.

## Tests de validation

- iPhone portrait : login, dashboard, KPI, menu utilisateur, Gestion, evenements a traiter, liste evenements.
- Android portrait : verification absence de debordement global.
- Tablette : grilles empilees proprement sans casser desktop.
- Laptop et ecran large : rendu historique conserve.
- Non-regression : login, backend desactive, sync inactive, imports/exports non modifies.


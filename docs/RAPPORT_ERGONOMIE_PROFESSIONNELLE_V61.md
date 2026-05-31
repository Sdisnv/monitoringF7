# Rapport ergonomie professionnelle — Monitoring F7 v61

## Synthese

La v61 professionnalise la premiere lecture operationnelle tout en conservant la ligne generale de Monitoring F7 : application locale/offline-first, dashboard commandement, tableaux metier, preparation backend inactive.

L'objectif est de rendre l'outil plus exploitable en reunion COD et plus clair pour un responsable SDIS, sans transformer l'application ni toucher aux calculs.

## Ameliorations realisees

### Navigation

La navigation principale utilise des libelles plus courts et plus operationnels :

- `Situation COD`
- `Evenements`
- `Effectifs`
- `Analyses`
- `Graphiques`
- `Administration`

Cette organisation reduit l'impression d'outil technique et se rapproche davantage d'un poste de conduite.

### Synthese COD

Une nouvelle synthese en quatre blocs est ajoutee sous l'entete du dashboard :

- situation actuelle ;
- point de vigilance ;
- action attendue ;
- mode local/offline-first.

Les valeurs sont alimentees par les KPI et les alertes deja existants. Les regles de calcul ne changent pas.

### Projection

Le bouton `Mode projection` active une lecture plus epuree :

- navigation secondaire masquee ;
- synthese COD agrandie ;
- KPI plus lisibles ;
- graphique secondaire masque ;
- lecture adaptee a un affichage mural ou une projection de reunion.

### Tableaux

La liste des evenements conserve toutes ses fonctions, mais le vocabulaire est simplifie :

- `Vue synthese` pour la lecture courte ;
- `Details` pour la vue complete.

La preference utilisateur est stockee en v61 avec compatibilite v60/v59.

## Backend

La preparation backend de v60 est conservee sans activation :

- schema de donnees explicite ;
- contrats API documentes ;
- auth serveur preparee contractuellement ;
- sync inactive ;
- aucun appel reseau obligatoire.

## Limites restantes

- La barre d'actions de la liste des evenements reste dense.
- Le tableau complet reste large pour un petit ecran.
- La projection est amelioree, mais pas encore une page autonome.
- Le backend reste au stade preparation : pas d'auth serveur, pas de stockage central, pas de sync multi-postes.

## Suite recommandee

Pour la v62, il serait coherent de traiter :

1. un mode backend mock/verificateur de contrats, desactive par defaut ;
2. une page projection autonome si l'usage COD se confirme ;
3. une barre d'actions tableau plus compacte avec regroupement des actions sensibles.

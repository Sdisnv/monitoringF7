# SCOPE-OBJECTIVES-1

Référentiel temporel des objectifs de participation et intégration au moteur analytique.

Les valeurs 80 / 82 / 85 / 90 % utilisées dans les tests et exemples sont des **seuils d’architecture**, pas des décisions MOA du SDIS.

## Décisions

- Hiérarchie : **CIBLE > DOMAINE > GLOBAL > aucun**.
- Un objectif a toujours une période (`date_debut` obligatoire, `date_fin` nullable).
- Non-rétroactivité : on ne modifie pas le seuil ou les dates d’une ligne. On clôture, puis on crée une nouvelle période.
- Chevauchements interdits pour une même portée ; périodes **adjacentes** autorisées.
- Appliqué uniquement au KPI **officiel** (NOMINATIF + QUANTITATIF `REALISE`). Jamais au LEGACY.
- Résolution **serveur**. Jamais de moyenne de seuils.
- `vigilanceMarginPct` existe mais vaut `null` : **VIGILANCE n’est pas inventée**.

## Grain d’analyse

| Requête | Grain | Objectif |
|---|---|---|
| SDIS (aucun filtre) | GLOBAL | Objectif global uniquement |
| `domaine=` | DOMAINE | Objectif domaine, sinon global. Jamais l’objectif d’une cible remonté au domaine |
| `cible=` | CIBLE | Cible > domaine > global |
| `evenementId=` | EVENEMENT | Unique ssi toutes les cibles de l’événement résolvent le même `objectifId` |

## Période multi-seuils

Chaque événement officiel est évalué à **sa date**.

Si plusieurs seuils distincts apparaissent dans le périmètre :

- `objective = null`
- `gapPct = null`
- `analyticStatus = NON_EVALUABLE` (évaluation objectif)
- `objectiveContext.homogeneous = false`
- `objectiveContext.distinctObjectives` liste les seuils

DASH-1 ne doit pas inventer un seuil unique pour un KPI annuel traversant deux périodes.

## Neutralisation vs clôture

- **Clôturer** : pose `date_fin`. L’historique de la période reste applicable.
- **Neutraliser** (`actif = false`) : retire l’objectif de toute résolution, y compris l’historique. Sert à retirer un objectif TEST de recette.

## RBAC

Écriture : permission existante `references:manage` (admin, commandement, chef-formation, formation).

Pas de permission dédiée `objectifs:manage` (dette documentée, pas de refonte RBAC dans ce lot).

Lecture : tout utilisateur authentifié autorisé à consulter analytics.

`sdis-user` peut saisir des événements mais **pas** gérer les objectifs.

## API

- `GET /api/scope/objectifs`
- `POST /api/scope/objectifs`
- `PATCH /api/scope/objectifs/:id` (commentaire uniquement)
- `POST /api/scope/objectifs/:id/cloturer`
- `POST /api/scope/objectifs/:id/nouvelle-periode`
- `POST /api/scope/objectifs/:id/desactiver`

HTTP 422 `chevauchement_objectif` si overlap.

## UI

Menu header → Réglages · Objectifs (`#/reglages/objectifs`). Pas de nouvel onglet principal.

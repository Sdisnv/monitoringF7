# SCOPE-EVENT-Q1 — Mode QUANTITATIF métier

Lot : événement SCOPE suivi par volumes, sans population nominative fictive.
Calcul officiel inchangé : moteur ANALYTICS-1 / `officialFromQuantitatif`.

## Modèle

Table additive `scope_saisies_quantitatives` (PK `evenement_id`) :

| Colonne | Règle |
|---|---|
| `nb_attendus`, `nb_presents`, `nb_excuses`, `nb_non_excuses`, `nb_dispenses` | entiers ≥ 0 |
| égalité | présents + excusés + non excusés + dispensés = attendus |
| auteur / timestamps | audit |

Aucune écriture dans `scope_personnes`, `scope_affectations`, `scope_attendus`, `scope_participations`.

Migration : `database/migrations/20260819_scope_event_q1.sql`  
Runtime : `ensureScopeSchema()` / version `scope-event-q1`.

## Création

`POST /api/scope/evenements` accepte `modeSuivi` : `NOMINATIF` | `QUANTITATIF`.
`LEGACY` est refusé à la création manuelle.
Sans `modeSuivi` : `NOMINATIF` (compatibilité des lots précédents).

Suggestion visible uniquement :

`GET /api/scope/mode-suivi-suggere?date=YYYY-MM-DD&cibles=id1,id2`

- règle de bascule applicable et date ≥ bascule → proposition NOMINATIF
- sinon QUANTITATIF
- cibles divergentes → `suggested: null`, `requireExplicit: true`

Le serveur ne change jamais le mode silencieusement.

## Endpoints ajoutés

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/api/scope/mode-suivi-suggere` | Proposition de mode |
| POST | `/api/scope/evenements/:id/preview-taux-quantitatif` | Aperçu serveur (contrat officiel, `officiel: false` si non REALISE) |
| POST | `/api/scope/evenements/:id/saisie-quantitative` | Enregistrement volumes + `baseVersion` + journal `SAISIE_QUANTITATIVE` |
| POST | `/api/scope/evenements/:id/convertir-nominatif` | QTT → NOM avant clôture, confirmation, suppression des volumes |
| POST | `/api/scope/evenements/:id/convertir-quantitatif` | Toujours 422 `conversion_interdite` |

## Endpoints existants étendus

| Chemin | Comportement QUANTITATIF |
|---|---|
| `POST .../cloturer` | Exige volumes cohérents, PLANIFIE → REALISE, pas de gel nominatif |
| `POST .../reouvrir` | REALISE → PLANIFIE, volumes conservés, sort du KPI |
| `GET .../taux` | `officialFromQuantitatif`, `kind: OFFICIEL` si REALISE |
| `POST .../preview-attendus`, `/figer`, `/participations` | 422 `mode_quantitatif` |

Conflit : même contrat `baseVersion` → HTTP 409, aucun écrasement.

## Taux officiel

numerator = présents  
denominator = présents + excusés + non excusés (= attendus − dispensés)  
Dispensés hors dénominateur.  
denominator 0 → percentage null / NON_EVALUABLE.

Exemple qualification : 20 / 17 / 1 / 1 / 1 → 17 / 19 = 89,5 %.

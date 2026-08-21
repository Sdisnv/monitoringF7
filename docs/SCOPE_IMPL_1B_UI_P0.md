# SCOPE-IMPL-1B — Écrans P0 nominatifs

Lot local : interface pilote contre `/api/scope/*`. **Pas de deploy production.**

## Écrans

| Écran | Route | État |
|---|---|---|
| Liste des exercices | `scope.html#/exercices` | P0 |
| Création | `#/exercices/nouveau` | P0 minimale |
| Fiche PLANIFIE | `#/exercices/:id` | P0 |
| Saisie nominative | `#/exercices/:id/saisie` | P0 |
| Fiche REALISE | `#/exercices/:id` si statut REALISE | P0 |
| Vue d’ensemble | `#/vue` | Placeholder |
| Personnel | `#/personnel` | Placeholder |

Ouvrir `scope.html`. Mode par défaut : **démonstration mémoire** (aucune écriture PostgreSQL).  
Mode API réelle (qualification ultérieure) : `scope.html?mode=live`.

## Parcours

1. Liste → Nouvel exercice (date, domaine, cibles, libellé) → fiche PLANIFIE.
2. **Générer les attendus** → preview serveur (sans mutation).
3. Ajouts / retraits préparés localement.
4. **Figer la population** → `POST .../figer` (calcul serveur) puis exceptions/retraits.
5. **Saisir les participations** → Tout présent / Enregistrer / Clôturer.
6. Fiche REALISE : taux officiel serveur, Réouvrir (motif).

CTA unique selon l’état : Générer **ou** Figer **ou** Saisir.

## API consommée

| Client | Endpoint |
|---|---|
| GET | `/referentiels`, `/personnes`, `/evenements`, `/evenements/:id`, `/evenements/:id/taux` |
| POST | `/evenements`, `preview-attendus`, `figer`, `exceptions`, `retraits`, `participations`, `encadrement`, `cloturer`, `reouvrir` |
| PATCH | `/evenements/:id` |

Toute écriture envoie `baseVersion`.

### Adaptation minimale backend (ce lot)

- `GET /api/scope/evenements` : liste filtrable (`annee`, `statut`, `domaineCode`) + compteurs.
- `GET /evenements/:id` enrichi : `personnes` + `journal`.

Les exceptions **avant gel** ne deviennent pas une liste envoyée comme source de vérité. Preview reste non mutante ; le gel calcule côté serveur ; les retraits/ajouts préparés sont appliqués ensuite.

## Responsive

- Largeur max 1340 px, Arial/Helvetica, header `#E30613`, fond `#F4F5F8`.
- Sous 800 px : lignes condensées, statuts en grille 2×2, zones 44 px.
- Pas de `min-width: 980px`.

## Erreurs

| Cas | Comportement |
|---|---|
| Succès | bandeau sobre, écran conservé |
| 409 | *Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.* + Recharger. Pas d’écrasement. |
| 422 clôture | liste exploitable ; bouton Clôturer désactivé si NON_RENSEIGNE > 0 |
| 401/403/réseau | messages métier, pas d’`alert()` |

Le taux officiel n’est **jamais** recalculé dans le navigateur. Hors REALISE, la liste affiche « — ».

## Limites du pilote

- Pas de Vue d’ensemble / fiche domaine / Personnel réel.
- Pas d’import `PersonnelSDIS.csv`.
- Pas de graphiques, RBAC avancé, Okta refondu, écriture offline.
- Mode démo : personnel fictif **local**. Les tables nominatives production restent vides tant que `mode=live` n’est pas utilisé.
- v67 reste sur `index.html`.

## Tests

`npm run test:scope` (lots 1A + 1B).

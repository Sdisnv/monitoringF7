# SCOPE-MODEL-2 — vérité métier

Lot de stabilisation **avant** UX-3, GRAPH-1, REPORT-1, PERSONNEL-SYNC-1, PERSON-1.

Aucune table `monitoring_f7_*` n’est écrite (hors `monitoring_f7_schema_migrations` pour versionner SCOPE). Aucune suppression destructive.

## Sous-domaine / FOSPEC

PR et AUTO restent des **codes domaine** (`scope_domaines.code`) pour ne pas casser les FK événements / cibles / objectifs.

Ils sont aussi des **sous-domaines** de FOSPEC :

```
FOSPEC
  ├── PR  (PAPR — Protection respiratoire)
  └── AUTO
```

Le libellé historique « Premiers secours » pour PR était une incohérence F7. SCOPE affiche PAPR / Protection respiratoire. Le seed SQL IMPL-1A n’est pas réécrit.

Un niveau `SOUS-DOMAINE` est explicite (`nature`, `parent_code`, table `scope_sous_domaines`). La cible n’est pas détournée pour simuler un sous-domaine.

## Motifs d’excuse

Canoniques (saisie nouvelle, obligatoire si EXCUSÉ) :

- `PRIVE`
- `PROFESSIONNEL`
- `ARMEE`
- `ACCIDENT_MALADIE`

Historique conservé, jamais inventé : `MALADIE`, `ACCIDENT` → analytics `accidentMaladie` ; `AUTRE` ; `NON_PRECISE`.

Taux officiel inchangé : `présents / (présents + excusés + non_excusés)`. DISPENSÉ hors dénominateur. NON_RENSEIGNE bloque la clôture.

## Permutation DAP

Statut `PERMUTATION` : participation réalisée, **compte comme présence**, identifiable à part. Hors DAP : refusé.

Quantitatif DAP : `0 ≤ nb_permutations ≤ nb_presents` (sous-ensemble, jamais additionné aux présents).

## Quantitatif

```
nb_excuses = privé + professionnel + armée + accident_maladie + non_précisé
nb_attendus = présents + nb_excuses + non_excusés + dispensés
0 ≤ nb_permutations ≤ nb_presents
```

Saisies anciennes sans motifs : `nb_excuses_non_precise = nb_excuses`.

## Suivi nominatif configurable

Table `scope_suivi_nominatif`. Hiérarchie **CIBLE > SOUS-DOMAINE > DOMAINE > GLOBAL**.

Seed GLOBAL `nominatif_autorise = true` : le nominatif est **possible** pour tous les domaines. Ne change pas le `mode_suivi` des événements existants. Peut proposer un mode à la création/import.

## Import exercices SCOPE (contrat, pas d’écrivain)

Colonnes : `date`, `domaine`, `sous_domaine`, `cibles`, `libelle`, `mode_suivi`, `comptabilise`, `remarque`, `identifiant_externe`.

Preview avant écriture : valides / erreurs / doublons / référentiel inconnu / modes proposés / à créer / déjà présents. Commit transactionnel et idempotence : lot ultérieur. Le CSV F7 22 colonnes reste disponible.

## Personnel (préparation PERSONNEL-SYNC-1)

`statut_rh` : `ACTIF` | `INACTIF` | `SORTI` | `DEMISSIONNAIRE`.

Suppression physique **uniquement** si aucun attendu, aucune participation, aucun journal. Une personne avec historique n’est pas effaçable.

## Analytics / objectifs / alertes / LEGACY

Payload officiel enrichi (motifs + permutations). Formule et timeseries inchangées. Objectifs sur le taux officiel. PERMUTATION renseignée ≠ absence. LEGACY : pas de reconstitution de motifs.

## UX-3 (à faire, pas MODEL-2)

1. Menu latéral inspiré d’ORION.
2. Accès direct aux domaines.
3. Sous-domaines/cibles sans navigation confuse (arbre FOSPEC > PR/AUTO).
4. Logo SCOPE dimension actuelle (+25 % min, 68 px desktop).
5. Logo SDIS régional du Nord vaudois dans les en-têtes pertinents.
6. Contraste des sélecteurs année/période/menus header (carrés blancs = défaut).
7. Responsive 1200 / 1024 / 768.
8. Pas d’interface « prototype IA ».
9. Cohérence visuelle ORION sans copier le CSS.

## GRAPH-1 / REPORT-1 (payload prêt)

Questions métier, pas un graphe par champ. Couleurs : `#DE000A` `#171C8F` `#54585A` `#FFA300`.

- évolution du taux officiel ;
- objectif ;
- comparaison domaines / cibles ;
- répartition Présent / Excusé / Non excusé ;
- détail des motifs ;
- permutations DAP ;
- tendances temporelles.

Les mêmes graphes devront servir au PDF REPORT-1.

## Autonomie Monitoring F7

| DÉPENDANCE | UTILISÉE PAR | NÉCESSAIRE AUJOURD’HUI | CIBLE SCOPE AUTONOME | ACTION FUTURE |
|---|---|---|---|---|
| PostgreSQL commun | SCOPE + F7 | Oui (même instance) | Instance ou schéma SCOPE dédié | Extraire après ressaisie |
| `monitoring_f7_*` | F7 ; SCOPE lit `schema_migrations` | Oui pour F7 | Plus de lecture métier F7 | Ne pas supprimer dans MODEL-2 |
| CSV 22 colonnes F7 | Import exercices | Transitoire | Format SCOPE_MODEL_2 | Lot import dédié |
| Auth Okta / RBAC partagés | Login SCOPE | Oui | Auth SCOPE ou SSO conservé | Décision MOA |
| Noms / commentaires F7 | Code, docs | Documentation | Vocabulaire SCOPE | Nettoyage UX-3+ |
| 8 agrégats LEGACY | Analytics visuel | Oui, hors KPI | Conservés ou ressaisis | Ne pas reconstituer les motifs |
| Objectifs F7 | Non | Non | `scope_objectifs` | Déjà séparé |
| UI F7 (`app.js`) | Site F7 uniquement | Non pour SCOPE | — | Ne pas déployer F7 |

Reprise recommandée : **SCOPE-UX-3** puis **SCOPE-GRAPH-1** puis **SCOPE-REPORT-1**.

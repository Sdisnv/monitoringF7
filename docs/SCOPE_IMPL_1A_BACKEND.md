# SCOPE-IMPL-1A — Backend nominatif pilote

Lot : schéma PostgreSQL SCOPE, API commandes, taux serveur, journal, **neutralisation du merge cache → serveur**.

Pas de deploy (le CLI Netlify local pointe vers **ORION**).

## Tables créées

Additives, aucune table `monitoring_f7_*` altérée.

| Table | Rôle |
|---|---|
| `scope_domaines` | 8 codes canoniques (PR affiché PAPR) |
| `scope_cibles` | UNIQUE (domaine, niveau) |
| `scope_personnes` | NIP unique, UUID technique |
| `scope_affectations` | Datées. Chevauchement Personne×Cible : unique partielle si `date_fin IS NULL` + contrôle backend `daterange`. Pas d’extension `btree_gist` (deploy plus fragile). |
| `scope_evenements` | Statuts PLANIFIE/REALISE/REPORTE/ANNULE, `version`, gel, clôture. Pas de `aComptabiliser`. |
| `scope_evenement_cibles` | PK composite |
| `scope_attendus` | PK événement×personne, `inclus`, origines REGLE / EXCEPTION_* |
| `scope_participations` | Statuts + motifs + rôles. Encadrement = participation sans attendu inclus. |
| `scope_legacy_aggregates` | Structure 17/20, **aucune FK participation**, pas de migration v67 exécutée |
| `scope_journal_metier` | Append-only |

Migration : `database/migrations/20260819_scope_impl_1a.sql`  
Rollback pré-pilote : `database/migrations/20260819_scope_impl_1a_rollback.sql`  
Runtime : `ensureScopeSchema()` (idempotent). Version `scope-impl-1a` dans `monitoring_f7_schema_migrations`.

## Endpoints

Base : `/api/scope/*` → `/.netlify/functions/scope`  
Auth : jeton existant. Écriture : `canWriteRecords`. Pas de refonte RBAC.

| Méthode | Chemin | Commande |
|---|---|---|
| GET | `/api/scope/referentiels` | Domaines + cibles |
| GET | `/api/scope/personnes` | Liste / recherche `q` |
| GET | `/api/scope/personnes/:id/affectations?date=` | Affectations valides à une date |
| POST | `/api/scope/evenements` | Créer PLANIFIE |
| GET | `/api/scope/evenements/:id` | Fiche (attendus, participations, encadrement, compteurs, version) |
| PATCH | `/api/scope/evenements/:id` | Modifier. Après gel : date/domaine/cibles **refusés** |
| POST | `/api/scope/evenements/:id/preview-attendus` | Génération **sans mutation** |
| POST | `/api/scope/evenements/:id/figer` | Calcul serveur + attendus + NON_RENSEIGNE |
| POST | `/api/scope/evenements/:id/exceptions` | EXCEPTION_AJOUT |
| POST | `/api/scope/evenements/:id/retraits` | inclus=false, NON_CONCERNE, trace |
| POST | `/api/scope/evenements/:id/participations` | Batch, 1 bump de version |
| POST | `/api/scope/evenements/:id/encadrement` | FORMATEUR/SURVEILLANT/AUXILIAIRE hors attendu |
| POST | `/api/scope/evenements/:id/cloturer` | REALISE ou 422 |
| POST | `/api/scope/evenements/:id/reouvrir` | REALISE → PLANIFIE + motif |
| GET | `/api/scope/evenements/:id/taux` | Formule unique serveur |

Toute écriture d’événement exige `baseVersion`. Stale → **409** `{ serverVersion }`.

Pas de PUT de collection SCOPE. Pas de seed navigateur.

## Versioning

```
UPDATE scope_evenements SET version = version + 1, ...
WHERE evenement_id = $1 AND version = $baseVersion
```

0 ligne → 409.

## Règles métier serveur

- Affectation valide : `dateDebut <= dateEvenement` et (`dateFin IS NULL` ou `dateEvenement <= dateFin`).
- Aucune implication DPS → FOBA/PR/AUTO.
- Gel : uniquement PLANIFIE, origine NOMINATIF, liste calculée **serveur**.
- Clôture : PLANIFIE, figé, aucun attendu inclus NON_RENSEIGNE, motif si ABSENT_EXCUSE, commentaire si AUTRE, pas legacy.
- Encadrement : si déjà attendu inclus → 422, une seule ligne participation par personne.

## Taux de participation

```
PRESENT / (PRESENT + ABSENT_EXCUSE + ABSENT_NON_EXCUSE)
```

Exclus : DISPENSE, NON_CONCERNE, NON_RENSEIGNE, encadrement hors attendu, non REALISE, legacy.

Arrondi 1 décimale : 13/15 → **86,7 %** ; 34/39 → **87,2 %**.

Le frontend ne calcule pas le taux officiel.

## Legacy

Table préparée. **Aucune migration nominative** des records v67. Interdit d’inventer des noms depuis 17/20.

## Cache / sync

| Mécanisme | État |
|---|---|
| `publishLocalCacheToServer` | **no-op** (disabled SCOPE-IMPL-1A) |
| `hydrateOnlineDataCache` | serveur → cache lecture, **plus de push des extras locaux** |
| `startOnlineRefreshAfterInitialRender` | hydrate seulement |
| `MonitoringSyncService.syncNow` | plus d’appel publishLocal |
| `scheduleOnlineCollectionWrite` | **résidu v67** : sauvegarde de session vers tables `monitoring_f7_*` uniquement |
| Tables `scope_*` | **aucune** connexion au merge historique |

**Un ancien cache navigateur ne peut plus réinjecter automatiquement des données SCOPE dans PostgreSQL.**  
Il ne peut plus non plus republier automatiquement des extras v67 via hydrate/publish. Les PUT v67 explicites (saisie F7 en session) restent, hors tables SCOPE.

## Rollback

Avant pilote : revenir au commit précédent ; optionnellement exécuter `20260819_scope_impl_1a_rollback.sql` ; désactiver le redirect `/api/scope/*`.

Après saisie nominative : **ne pas DROP** les tables SCOPE. Désactiver les endpoints seulement.

## Qualification

`npm run test:scope` — tests 1–8 + encadrement hors taux.

`./scripts/check-local.sh` — non-régression v67 syntaxe/marqueurs.

Production : **non déployé** (CLI Netlify lié à `orion-sdisnv`).

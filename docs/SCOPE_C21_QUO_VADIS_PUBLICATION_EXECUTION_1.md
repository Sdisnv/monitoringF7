# C21 — QUO VADIS — Exécution transactionnelle contrôlée

## A. Verdict

**PASS**. Les 25 critères sont démontrés sur la fixture SQLite isolée; la production reste explicitement interdite.

## B. Git initial

HEAD initial: `362d6c41381ae106c318d9c9081cb83fc23588f4`. Aucun commit, push ou déploiement.

## C. Architecture C20 conservée

buildPublicationPlan remains the only business decision engine. executePublicationPlan consumes and validates the immutable plan; it never rebuilds decisions. A/B/C/D restent inchangés; D revient sur la même identité avec 1 UPDATE et 0 CREATE.

## D. SQL utilisé localement

Exécution réelle: `database/fixtures/scope_qv_publication_c21_fixture.sql`. Brouillons PostgreSQL non appliqués: `database/migrations/20260929_scope_qv_publication_c20.sql`, `database/migrations/20260929_scope_qv_publication_c21.sql`.

## E. Exécuteur

`executePublicationPlan(plan, context)` traite CREATE/UPDATE et laisse UNCHANGED/BLOCKED/NOT_PUBLISHED sans écriture métier.

## F. Validation du plan

Type, version C20, drapeaux dry-run/non-writable, résumé, actions, cibles et empreinte globale sont validés avant transaction.

## G. Stale plan

Modification cible intervenue après plan: `STALE_PLAN`; comptes métier inchangés.

## H. Transaction

Une transaction couvre activité, événement, provenance, relations domaine/cible/public/OI et session. Le journal d’exécution survit séparément pour tracer un rollback.

## I. Rollback

Panne `INJECTED_EXECUTION_FAILURE` après création de provenance; état avant/après identique: {"c21_publication_activities":0,"c21_events":0,"c21_qv_publication_links":0,"c21_event_domains":0,"c21_event_targets":0,"c21_event_ois":0,"c21_event_publics":0,"c21_session_groups":0,"c21_session_events":0,"c21_operational_data":0}.

## J. Retry

FAIL → ROLLBACK → `SUCCESS` (10 CREATE) → `NO_OP`.

## K. Idempotence

Plan B: {"CREATE":0,"UPDATE":0,"UNCHANGED":10,"BLOCKED":8,"NOT_PUBLISHED":1}; exécution: `NO_OP`, zéro écriture métier.

## L. Unicité DB

UNIQUE publication_key et identité source. Une insertion brute concurrente est refusée: `UNIQUE constraint failed: c21_events.publication_key`.

## M. Concurrence

Deux appels du plan A: SUCCESS + NO_OP; état final 10 événements / 10 provenances.

## N. CREATE

Plan A et Execute A: 10 créations.

## O. UPDATE

Plan C: 1 UPDATE, 0 CREATE; exécution: 1 mise à jour.

## P. UNCHANGED

Plan B: 10; l’exécuteur vérifie l’état et ne réécrit rien.

## Q. BLOCKED

8 cas restent hors écriture avec motif C20; les données opérationnelles produisent HUMAN_REVIEW.

## R. NOT_PUBLISHED

1 activité externe historique, sans événement et sans code métier.

## S. Provenance

Interrogation bidirectionnelle démontrée: true; définition/occurrence/session/unité sont stockées, jamais déduites du libellé.

## T. Stat.Com

Les codes publiés respectent `STATCOM.xxx`; externe et EMSEA restent sans code inventé.

## U. Code stable

Horaire et salle modifiés: même événement et code `070F1.004` → `070F1.004`.

## V. CTA

2027-01-01T18:00 → 2027-01-04T06:00: 3600 minutes, une matérialisation.

## W. FOBA

Une activité `070F1.005`, quatre événements, OI B1/B2/C1/G1. Une mise à jour G1 produit 1 UPDATE et laisse C1/B1/B2 inchangés: true.

## X. JSP

Code `010JC1.001`, public `JSP:1`.

## Y. EMSEA

Domaine INSTITUTIONNEL; Stat.Com=null, code=null.

## Z. Multi-session

1 activité, 6 sessions et 6 événements reliés au groupe `QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1`.

## AA. Données opérationnelles

Une participation artificielle transforme la modification en `BLOCKED` / HUMAN_REVIEW; empreinte inchangée après exécution.

## AB. Modification sûre

Avant toute donnée opérationnelle: date, début, fin, durée, lieu, salle, responsable, cible, public et OI sont AUTO_UPDATE_ALLOWED sous contrôle optimiste.

## AC. Modification protégée

Après donnée opérationnelle: ces dix familles sont HUMAN_REVIEW_REQUIRED, politique conservatrice déduite des invariants de présence/permutation/clôture.

## AD. Annulation

Occurrence publiée → UPDATE vers `ANNULE`; provenance conservée: true.

## AE. Source supprimée

Motif `SOURCE_REMOVED_CANCEL_SCOPE_EVENT`; événement conservé et statut final `ANNULE`.

## AF. Réconciliation

Plan A: `MATCH`; états pris en charge: MATCHED, MISSING, DUPLICATE, DRIFT, PROTECTED_CHANGE, UNEXPECTED.

## AG. Drift

Mutation directe Vulcain → Jura: `DRIFT`; la réconciliation en lecture seule ne corrige rien.

## AH. Audit

Chaque tentative trace acteur, processus, heure, année, plan/empreinte, compteurs planifiés/réels, erreur, rollback et statut final; aucun secret/token.

## AI. RBAC

Permission `events:publish`: GESTIONNAIRE/ADMINISTRATEUR autorisés; UTILISATEUR refusé par `PUBLICATION_FORBIDDEN`.

## AJ. RLS

C20/C21 PostgreSQL drafts enable RLS and revoke anon/authenticated on new publication tables.

## AK. Protection production

Refus exécutable démontré: `PRODUCTION_EXECUTION_FORBIDDEN`. Aucun adaptateur PostgreSQL n’est accepté par C21.

## AL. Tests

60/60 C21 PASS; 137/137 C18-C20 liés PASS. Suite globale non répétée: The optional global suite was not repeated. C20 already recorded its sole known unrelated ORION cache-bust failure; C21 uses focused and related regression suites.

## AM. Régressions

C18 18, moteur C19 9, UX C19 67, clôture C19 13, C20 30: zéro échec.

## AN. Git final

HEAD final: `362d6c41381ae106c318d9c9081cb83fc23588f4` (identique). Commit=false, push=false, deploy=false, migration production=false.

## AO. Recommandation C22

STOP C21. Keep production publication forbidden. A separate MOA gate may authorize C22 to design a real PostgreSQL adapter, rehearse the additive migration on a disposable preproduction clone, and define recovery/observability before any production decision.

## Preuves centrales

| Preuve | Résultat |
|---|---|
| Publication | A: 10 CREATE, reconcile MATCH; B: 10 UNCHANGED, execute NO_OP |
| Update | C: 1 UPDATE, 0 CREATE, même événement/code, reconcile MATCH |
| Rollback | INJECTED_EXECUTION_FAILURE, état restauré, retry SUCCESS, retry NO_OP |
| Protection | donnée opérationnelle → BLOCKED/HUMAN_REVIEW, 0 UPDATE |
| Drift | salle mutée directement → DRIFT, aucune correction |
| Concurrence | SUCCESS + NO_OP, 10 événements et 10 provenances |

## Politique de modification

| Champ | Avant exploitation | Après exploitation |
|---|---|---|
| date | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| start | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| end | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| duration | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| location | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| room | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| responsible | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| target | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| public | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |
| oi | AUTO_UPDATE_ALLOWED | HUMAN_REVIEW_REQUIRED |

## Fichiers C21

- `database/fixtures/scope_qv_publication_c21_fixture.sql`
- `database/migrations/20260929_scope_qv_publication_c21.sql`
- `docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.json`
- `docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.md`
- `netlify/lib/_scope-qv-publication-executor.js`
- `netlify/lib/_scope-qv-publication-plan.js`
- `netlify/lib/_scope-qv-publication-reconciliation.js`
- `netlify/lib/_rbac.js`
- `package.json`
- `scripts/lib/scope-c21-publication-fixture-db.js`
- `scripts/lib/scope-c21-publication-scenarios.js`
- `scripts/scope-c21-quo-vadis-publication-execution-1-tests.js`
- `scripts/scope-c21-quo-vadis-publication-execution-1.js`

## Interdictions respectées

- 0 écriture dans SCOPE production
- 0 migration PostgreSQL appliquée
- 0 déploiement Netlify
- 0 commit / push
- C22 non démarré

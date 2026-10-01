# SCOPE C23-REPAIR-1 - PRODUCTION PATH ENABLEMENT

## Verdict

**PASS**

**CANDIDAT PRET POUR REPRISE DU GATE PRODUCTION : YES**

Ce lot ne constitue ni une autorisation de production, ni un deploiement, ni une migration de la base reelle. Aucune cible de production n'a ete modifiee.

## Candidat Git

- Branche : `main`.
- SHA parent : `362d6c41381ae106c318d9c9081cb83fc23588f4`.
- SHA candidat : `6abf8b8bd8a7654e7d1b5249f306f20ac5cd8d3e`.
- Commit : `feat(scope): enable guarded quo vadis production path`.
- Diffstat : 68 fichiers, 12 368 insertions, 72 suppressions.
- Etat distant : candidat local en avance d'un commit sur `origin/main`.
- Push : non. Deploiement : non.

Le commit contient exclusivement le produit SCOPE, ses migrations, fixtures, outils de recette et tests C18-C23. Les rapports `docs/`, captures, dumps, clones PostgreSQL et sorties de build sont exclus. La liste exhaustive des 68 fichiers est disponible dans le rapport JSON compagnon.

## Barrieres C23

### 1. Candidat non immuable

Cause : l'ensemble C18-C22 existait uniquement dans le working tree au-dessus du SHA `362d6c4`.

Resolution : le commit local `6abf8b8` fige exactement le candidat deployable et ses tests. **Barriere levee.**

### 2. Migrations ROLLBACK uniquement

Cause : les brouillons C20-C22 etaient volontairement non persistants.

Resolution : deux nouveaux fichiers separes ont ete ajoutes sans modifier l'historique :

- `database/migrations/20260929_scope_qv_publication_c23_repair_1.sql`
- `database/migrations/20260929_scope_qv_publication_c23_repair_1_rollback.sql`

La migration est transactionnelle, idempotente, executee avec `ON_ERROR_STOP`, verifie ses preconditions et postconditions, active RLS, retire les droits clients et inscrit `scope-qv-publication-c23-repair-1`.

Deux passages successifs sur restauration de production : **PASS**. Rollback sur une seconde restauration propre : **PASS**, marqueur et schema ajoutes retires, trois evenements 2027 conserves. Le rollback refuse explicitement de supprimer un schema ayant deja porte une publication ; dans ce cas la restauration du dump revu est obligatoire. **Barriere levee.**

## Adaptateur PostgreSQL

`netlify/lib/_scope-qv-publication-postgres-store.js` implemente le contrat C21 sur PostgreSQL :

- connexion issue de l'environnement, sans secret code ou journalise ;
- cible hote/base comparee exactement ;
- modes explicites `clone` et `production` ;
- transactions, commit, rollback et verrou consultatif ;
- timeouts de connexion, requete et verrou ;
- audit des runs ;
- activites, evenements, provenance, relations et sessions ;
- snapshot bidirectionnel et etat operationnel ;
- dry-run strictement non mutant.

Les codes publics et cibles QV sont conserves sans perte dans des relations dediees. Les FK operationnelles ne sont alimentees que lorsqu'une correspondance exacte existe. Le code metier reste porte par l'identite d'activite, ce qui permet les quatre materialisations FOBA sans violer l'unicite historique de `scope_evenements.code_cours`.

## Garde-fous production

La capacite technique est separee de l'autorisation effective. Par defaut, toute mutation production reste **REFUSEE**.

Une future execution exige simultanement :

- le store en mode `production` avec hote et base exacts ;
- `environment=production` ;
- `allowProductionExecution=true` ;
- `SCOPE_QV_PRODUCTION_EXECUTION_ENABLED=YES` ;
- une autorisation contenant `gateId`, `approvedBy`, le `planId`, son empreinte exacte et la cible exacte ;
- l'approbation bulk existante liee au meme plan.

Tests explicites : production non autorisee refusee, mauvaise cible refusee, configuration incomplete refusee, dry-run sans mutation, erreur intermediaire rollbackee, execution clone commitee et second passage idempotent.

## Recette clone production

La sauvegarde C23 a ete restauree dans `scope_c23_clone`. Aucun acces mutant a la production reelle n'a eu lieu.

| Controle | Resultat |
|---|---:|
| Cycle de vie | 635 |
| READY | 118 |
| HUMAN_REVIEW | 19 |
| BLOCKED hors revue | 485 |
| NOT_PUBLISHED | 13 |
| Premier passage | 118 CREATED |
| Second passage | 118 UNCHANGED |
| UUID stables | PASS |
| Doublons de cle | 0 |
| Erreur injectee | ROLLED_BACK |
| Retry | 1 UPDATE puis retour conforme |
| Reconciliation finale | 118 MATCHED |
| Evenements 2027 preexistants conserves | 3 |
| CTA de 60 h | 53 |
| Stat.Com | 87 PDF + 4 extensions |
| FOBA 070F1.005 | 1 activite, 4 materialisations |
| Sessions multi-session sans date | 12 BLOCKED |

Une participation ajoutee sur le clone transforme bien toute modification en revue humaine et n'est jamais ecrasee.

## Non-regression

- C23-REPAIR-1 : `26/26 PASS`.
- C20 : `30/30 PASS`.
- C21 : `60/60 PASS`.
- C22 : `48/48 PASS`.
- Build Netlify SCOPE local : `PASS`.
- Aucune suite globale multi-projets n'a ete lancee.

C18/C19 n'ont pas ete rejoues : le correctif touche uniquement migration, stockage PostgreSQL, execution et reconciliation. C22, qui conserve leurs invariants, reste integralement vert.

## Ecart avec C22

Aucun ecart fonctionnel. Les volumes, classifications, decisions humaines, CTA, Stat.Com, FOBA, multi-OI et sessions sans date restent identiques. Les seules adaptations concernent la persistance dans le schema PostgreSQL reel.

## Conclusion

**C23-REPAIR-1 — PRODUCTION PATH ENABLEMENT : PASS**

**CANDIDAT PRET POUR REPRISE DU GATE PRODUCTION : YES**

Attente de la decision MOA. Aucun Gate Production n'a ete relance automatiquement.

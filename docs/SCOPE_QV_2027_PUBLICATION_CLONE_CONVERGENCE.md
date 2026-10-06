# SCOPE QV 2027 - Convergence publication sur clone local

## Portee et cible

- Branche : `scope-qv-canonical-rules-checkpoint-20261002`.
- Clone local uniquement : `127.0.0.1:55432/scope_qv_2027_recipe_20261006`.
- Candidat canonique inchange : 850 preparations, dont 125 `VALIDATED` et 725 en attente de validation. Tour de France Femmes 2027 absent ; 15 decisions locales intactes.
- Sauvegarde avant ecriture : `/private/tmp/scope-qv-2027-before-publication-20261006.dump`.
- Aucune connexion ni ecriture SQL de production ; aucun commit, push, PR, merge ou deploiement.

## Regles et plan

- Huit formations transversales PR/AUTO/FOBA conservent leur public explicite et n'exigent pas d'OI invente. Le lieu G1 ne produit pas d'OI G1. Les OI explicites restent controles.
- Le public est stocke par codes internes et presente avec les libelles du catalogue existant.
- Les champs non fournis par le candidat ne remplacent pas les valeurs deja publiees. Le plan reconcilie conserve les affectations CTA locales et les relations cible/publique existantes. Les seuls changements de dates du plan concernent quatre CTA a calendrier canonique ; le changement de lieu de `qv-source-917` porte sa preuve MOA existante.
- Plan avant publication : `CREATE 7 / UPDATE 34 / UNCHANGED 84 / WAITING_VALIDATION 725 / TRUE_MOA_CONFLICT 0 / TECHNICAL_BLOCKED 0 / DUPLICATES 0`.
- Le C20 brut signalait 725 `BLOCKED:SOURCE_NOT_VALIDATED` ; ce sont des attentes de workflow, pas des anomalies.

## Execution locale

- La premiere tentative a ete annulee avant les evenements : migration des allocations de codes absente. La migration additive existante `20260930_scope_event_identity_phase2.sql` a ete appliquee uniquement au clone apres sauvegarde. Ses revocations de roles sont maintenant conditionnelles a leur presence, sans changement d'effet sur un environnement qui les possede.
- Premier passage execute : 7 crees, 34 mis a jour, 84 inchanges, 725 non publies. Les 118 identites existantes ont ete conservees.
- Le controle a ensuite mis en evidence 33 anciens evenements QV deja publies sur le clone, avec Stat.Com mais sans code d'evenement. L'allocateur existant a complete uniquement ces 33 codes sous transaction. Les 37 codes deja alloues ont ete preserves ; 70 evenements QV avec Stat.Com ont maintenant un code, 0 manque. Un second passage de ce rattrapage a alloue 0 code.
- Second passage publication : `CREATE 0 / UPDATE 0 / UNCHANGED 125 / WAITING_VALIDATION 725`. Reconciliation stricte : 125 `MATCHED`, 0 `DRIFT`, 0 `DUPLICATE`, 0 `UNEXPECTED`.
- Les 850 preparations, 725 statuts non valides et 15 decisions locales sont restes inchanges. Les empreintes de 959 obligations, 159 propositions, 6156 participations, 5952 attendus, 636 affectations, 2290 journaux et 132 evenements hors QV sont identiques avant/apres. FOBA `070F1.005` : 4 evenements conformes. Aucune salle FK a un lieu incompatible.

## Lieux et salles

- 737/850 occurrences ont deja un lieu metier identifie, dont 371 libellees Caserne G1. Les 57 lieux textuels restants n'ont pas d'ID certain : 41 sans correspondance, 16 ambigus. Le `0 MATCHED` du rapport concerne uniquement ces 57, pas le referentiel entier. Aucun lieu ni OI n'a ete cree par deduction.
- 116 salles textuelles : 110 codes retrouves, 4 sans correspondance, 2 ambigus. Seules 93 preparations ont une FK de salle prouvee compatible avec leur lieu ; les autres conservent le texte source sans FK contradictoire.

## Recette

- `node --test scripts/scope-qv*tests.js` : 33/33 PASS, dont C23 candidat courant en lecture seule.
- `npm run test:scope-c20-qv-integration` : 30/30 PASS.
- `npm run test:scope-c21-qv-publication` : 60/60 PASS.
- `node scripts/scope-event-identity-phase2-tests.js` : 11/11 PASS.
- `node --test scripts/scope-qv-2027-sql-recette-readonly-tests.js` : PASS.
- `npm run check` et `git diff --check` : PASS.

Preuves machine : `outputs/qv-2027-sql-recette/local-publication-convergence.json` et `outputs/qv-2027-sql-recette/local-readonly-diff.json`. Le clone est finalise pour cette recette locale ; la production demeure inchangee.

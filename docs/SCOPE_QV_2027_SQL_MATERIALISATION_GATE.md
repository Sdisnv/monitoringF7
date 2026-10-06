# SCOPE / QUO VADIS 2027 - gate de materialisation SQL

Date : 05.10.2026. Verdict : **NOK / BLOCKED**, avant toute ecriture SQL.

## Preflight

- Branche : `scope-qv-canonical-rules-checkpoint-20261002` ; HEAD avant/apres : `a186bbee530cb40217034b2d27d5d08641703305`.
- Le worktree etait deja modifie avant ce lot : moteur et UI QV, regles, tests, rapports, migration calendrier non suivie, sorties XLSX et PDF de tests. Aucun de ces changements n'a ete restaure, supprime, stashe ou commite.
- Le controle du candidat passe : 850 occurrences, 47 vacances conformes, 19 repositionnements, 3 controles manuels parmi les 70 cas initiaux, 1 Tour exclu ; 15 decisions locales au total (12 instructions, 3 conduites), 0 `HUMAN_REVIEW` bloquant, 56/16 conduites DPS/DAP, 0 seance sans date.
- Empreintes SHA-256 des entrees controlees : service QV `f7ea88558ed3950595daa9001dc922d6b9ac1590b0fba45532caf4f3d2bf3902`, programme source `695a10cb9c5dd25d9ef738917673eb80c6466479dcfc67188c24e3ea87e0f319`, arbitrages `f1e3fabd7714ac91405d025120c754ddc2cdd8d2f903c18001c4b5ae116c7643`, XLSX valide `c3cb5e4310899c0b6af4c0eac3bea286a0ef55bac2ac9296c703477518bf167d`.
- Rapport d'entree : `docs/SCOPE_QV_2027_CORRECTION_CALENDRIER_FINALE.md`.

## Ecart bloquant

La chaine C23/C23-REPAIR du depot (`scripts/scope-c23-repair-1-production-path-enablement.js`, `scripts/lib/scope-c22-canonical-dataset.js`, `netlify/lib/_scope-qv-publication-plan.js` et l'adaptateur PostgreSQL) lit le programme C19 fige de **635** lignes, pas le candidat courant de **850**. La comparaison par ID donne 608 lignes communes, 242 propres au candidat et 27 propres au jeu C23.

Le jeu C23 contient encore `QV26-TOUR-DE-FRANCE-FEMMES-26-4BF12176:O1:S1`, exclu du candidat courant. Il ne contient aucune des trois conduites locales `QV27:CONDUITE:{B1,B2,C1}:N02a:2027-09-18:1030`. Il ne peut donc pas prouver le traitement du Tour ni la preservation des 15 decisions locales de ce candidat.

Le planificateur C23 exige `status=VALIDATED` avant de publier un evenement. Parmi les 850 lignes courantes, 125 sont `VALIDATED`, 719 `A_POSITIONNER`, 1 `CALCULE` et 5 `INSUFFICIENT_INFORMATION`. La validation fonctionnelle du candidat n'est pas une validation individuelle ni une autorisation de publication de toutes les lignes. Forcer ces statuts contredirait les decisions locales et modifierait le candidat, ce qui est interdit dans ce lot.

Le fichier `database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql` ne traite que la plage de vacances de l'Ascension dans `scope_quo_vadis_calendar_days`. Il ne materialise aucune des 850 occurrences. Le script C23 de recette commence par `resetClone()`, qui efface les publications du clone ; il n'a pas ete execute contre un candidat divergent. Le clone local declare par C23 (`127.0.0.1:55432`) ne repond pas a `pg_isready` ; aucun snapshot SQL de cette cible n'a ete obtenu.

## Diagnostic a blanc, non executable

Le plan C23 a ete calcule en memoire, sans base cible, avec son **ancien jeu de 635 lignes** et un snapshot vide : `CREATE=118`, `UPDATE=0`, `UNCHANGED=0`, `BLOCKED=504`, `NOT_PUBLISHED=13`. Les 504 blocages comprennent 485 `SOURCE_NOT_VALIDATED` et 19 revues historiques. Ce calcul est une preuve de divergence, **pas** le dry-run des 850 occurrences demande. Son `CREATE=118` n'est pas un nombre de creations attendu pour le candidat valide.

| Controle requis avant ecriture | Constat |
| --- | --- |
| Objets candidats / occurrences a materialiser | 850 dans le candidat ; aucun plan SQL conforme de 850 lignes disponible |
| CREATED / UPDATED / UNCHANGED / MATCHED attendus | Indetermines sans pont prouve vers le modele SQL et sans snapshot cible |
| Suppressions ou desactivations | Indeterminees ; le planificateur C23 peut annuler une source absente de son jeu, donc aucune execution |
| Conflits, doublons, objets sans correspondance | Non certifiables sur la cible indisponible ; 242 IDs courants manquent au jeu C23 et 27 anciens IDs lui sont propres |
| Tour de France Femmes 2027 | Absent du candidat ; present dans le jeu C23 ancien ; presence SQL cible inconnue |
| 15 decisions locales | 15 dans le candidat ; trois conduites absentes du jeu C23 ; aucune decision renseignee ou arbitree par ce lot |
| Decisions humaines, participations, assignations, historique 2026 et hors-perimetre | Aucune ecriture faite ; controle de persistance apres migration non applicable |
| Second passage / UUID stables | Non executes ; idempotence de la materialisation des 850 non demontree |

La migration est arretee avant le premier passage. `DRY-RUN=NOK` signifie ici que le dry-run **conforme au candidat** n'a pas pu etre produit ; aucune erreur SQL de migration n'est pretendue. `CALENDAR_SQL_STATUS=BLOCKED`. Le candidat fonctionnel de 850 reste intact ; aucune migration locale, distante ou de production, publication, operation ORION, deploiement ou operation Git n'a ete effectuee.

Condition de reprise : disposer d'une correspondance verifiable entre les 850 IDs courants et les objets SQL de **preparation** vises, avec leurs statuts conserves, puis d'une cible locale/de recette identifiable et accessible pour etablir un vrai diff SQL lecture seule. La chaine C23 de publication d'evenements ne doit pas etre assimilee sans preuve a la materialisation du programme preparatoire.

## Controles realises

- 22/22 suites `scripts/scope-qv*tests.js` : PASS.
- `npm run check` : PASS.
- `git diff --check` : PASS.
- XLSX valide rouvert en lecture seule : `DETAIL_70` = 47 conformes + 19 repositionnes + 3 controles manuels + 1 exclusion ; `LOCAL_REVIEW_15` = 12 instructions + 3 conduites, decisions vides.
- Aucun premier ni second passage SQL ; identifiants post-migration non verifiables.

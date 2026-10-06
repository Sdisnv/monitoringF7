# SCOPE QV 2027 - arbitrage calendrier final

Base : candidat de `SCOPE_QV_2027_CORRECTION_CIBLEE_1.md` et 70 IDs physiques du XLSX initial. Branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD avant/après `a186bbee530cb40217034b2d27d5d08641703305`. Worktree antérieur conservé.

| Indicateur | Résultat |
| --- | --- |
| PROGRAMME_AVANT / PROGRAMME_APRES | 851 / 850 |
| CONFLITS_INITIAUX | 70 |
| VACANCES_SEULES_CONFORMES | 47, dates inchangées |
| REPOSITIONNES | 19, IDs et horaires conservés |
| EXCLU_NON_RECURRENT | 1, Tour de France Femmes '26 |
| LOCAL_REVIEW | 15 = 12 instructions + 3 conduites, dates inchangées, décision locale vide |
| HUMAN_REVIEW_BLOQUANT | 0 |
| CONDUITES_DPS / CONDUITES_DAP / CONDUITES_TOTAL | 56 / 16 / 72 |
| CTA_ALERTES / FOCA_ANNULEES / CONTRADICTIONS_OI_CIBLEES | 0 / 6 / 0 |
| SESSIONS_SANS_DATE | 0 |
| STATCOM_MOA_RESTANT | 0 |
| CALENDAR_SQL_STATUS | `PENDING_MIGRATION` |
| TESTS | 22/22 suites QV ; `npm run check` ; `git diff --check` ; XLSX rouvert |
| VERDICT CANDIDAT CALENDRIER | `PASS` ; décisions locales ultérieures non bloquantes |

Les vacances seules sont désormais une information non bloquante, y compris dans la classification de planification. Férié, veille et week-end férié restent bloquants lorsqu'ils se superposent aux vacances. Les 19 déplacements sont tracés par `calendarAdjustment` et dans `DETAIL_70`. Deux conduites G1 suivent désormais une autre instruction réelle de leur propre demi-section (N02b : ABC du 05.06 ; N04b : ABC du 22.05), à 10:30-11:30. Les 56 conduites DPS et les 16 DAP restent présentes, et la dérivation DPS demeure idempotente. Les 12 instructions locales n'ont reçu ni déplacement ni décision automatique. La règle G1 lundi férié vers mardi reste appliquée. Formation groupée 1.1-1.6, Souper B2 `070F1`, CTA et six FOCA annulées sont conservés. Le Tour de France Femmes '26, événement extraordinaire non récurrent, est exclu du candidat 2027 par décision MOA ; sa présence en 2026 ne suffit pas à le reconduire.

## Contrôles locaux non bloquants

| ID | Activité / OI | Date | Motif précis |
| --- | --- | --- | --- |
| `QV27:CONDUITE:B1:N02a:2027-09-18:1030` | Conduite B1 N02a | 18.09.2027 | Seconde conduite après FEU B1 réelle ; la date de cette instruction est à décider localement. |
| `QV27:CONDUITE:B2:N02a:2027-09-18:1030` | Conduite B2 N02a | 18.09.2027 | Seconde conduite après FEU B2 réelle ; la date de cette instruction est à décider localement. |
| `QV27:CONDUITE:C1:N02a:2027-09-18:1030` | Conduite C1 N02a | 18.09.2027 | Seconde conduite après FEU C1 réelle ; la date de cette instruction est à décider localement. |

Le classeur 2026 a été lu directement (`QUO VADIS '26`, SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`). La ligne 487 est le Tour du 01.08.2026, sans preuve de récurrence. Les lignes 12-14 et 16-18 montrent les instructions KICK-OFF et conduites subséquentes du 14.02.2026 sur C1/B2/B1 ; les lignes 577-579 et 583-585 montrent FEU puis conduites du 05.09.2026. Le classeur n'encode pas explicitement `N02a` pour chacune de ces lignes ; la correspondance par demi-section 2027 est établie par le référentiel annuel et les sources de chaque conduite. La décision MOA plus récente de deux conduites par demi-section prime l'ancienne règle de deux par site encore visible dans une documentation historique.

Chaque site B1/B2/C1 possède en 2027 trois instructions distinctes `N02a` : KICK-OFF le 20.02 (première conduite), VARIA le 15.05 et FEU le 18.09 (seconde conduite actuelle). Les deux dernières dates relèvent déjà des 12 décisions locales sur week-end férié. La seconde conduite pointe vers une véritable instruction FEU du même site et public, à 10:30 après sa fin à 10:30 ; aucune instruction n'a été créée pour elle. Sur ces mêmes sites, `N02b` a ses conduites après KICK-OFF le 13.03 et FEU le 28.08, `N01a` les 27.02 et 25.09, `N03a` les 13.02 et 11.09. Il n'y a donc pas de duplication technique démontrée pour `N02a`.

Décision MOA du présent avenant : aucune réponse de la MOA n'est requise maintenant. Le maintien ou le repositionnement de FEU relève des responsables locaux lors du traitement manuel du programme ; le moteur ne choisit ni une autre date ni VARIA. Les trois conduites gardent leur ID, date, public, OI et instruction FEU source, et ne portent plus `review: true` ni `calendarReview: HUMAN_REVIEW`. L'extraction les classe dans le même groupe `INSTRUCTION_LOCALE` que les 12 instructions sources, soit 15 contrôles manuels distincts et zéro exception bloquante. Leur statut métier de préparation reste `A_POSITIONNER` comme celui des instructions ; cette requalification n'est ni une validation ni une publication.

Fichier de recette : `outputs/qv-2027-final/SCOPE_QV_2027_CONTROLE_CALENDRIER_APRES_ARBITRAGE.xlsx` (`SYNTHESE` 8 groupes ; `DETAIL_70` 70 IDs = 47 conformes + 19 repositionnés + 3 contrôles manuels non bloquants + 1 exclu ; `LOCAL_REVIEW_15` 12 instructions et 3 conduites avec IDs et sources FEU). Le Tour y conserve son ID historique et sa date initialement projetée comme trace, mais n'a plus de date après ni d'occurrence dans le programme. Les champs de décision locale restent vides. La migration `20261005_scope_qv_2027_ascension_vacation_correction_1.sql` est inchangée, transactionnelle et idempotente (deux exécutions PostgreSQL locales dans le lot précédent) ; aucune preuve d'application à la DB persistée, donc `PENDING_MIGRATION`.

La requalification présente modifie uniquement `netlify/lib/data/scope-qv-2027-calendar-arbitrages.json`, `scripts/scope-qv-2027-no-go-final-extraction.js`, trois suites de tests ciblées, ce rapport et le XLSX. Le générateur XLSX local dans `/private/tmp/scope-qv-final-xlsx` est ajusté pour tracer les 15 contrôles locaux. Les autres modifications du worktree étaient préexistantes et ont été conservées. Aucun commit, push, PR, merge, déploiement, migration exécutée ni écriture distante.

# SCOPE / QUO VADIS 2027 - SQL materialisation REPAIR 1

Date : 06.10.2026. Verdict : **NOK / BLOCKED**, sans ecriture SQL.

## Source et contrat statique

La source courante est `createFixture(null).service.listProgramme(2027).canonicalProgramme.rows`, hors lignes `external`, issue de `netlify/lib/_scope-quo-vadis-service.js`. Ce service assemble `netlify/lib/data/scope-qv-programme-2027.json`, l'historique 2026, les regles annuelles, les arbitrages calendrier et les regles de conduite/sections. Les 15 controles locaux sont recalcules par `scripts/scope-qv-2027-no-go-final-extraction.js`, qui verifie aussi l'empreinte du classeur 2026. Le candidat et le classeur n'ont pas ete modifies.

L'injection C23 historique est `scripts/lib/scope-c22-canonical-dataset.js:PROGRAM_PATH`, vers `docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1_PROGRAM_2027.json` (635 objets). Le script C23 historique importe `buildCanonicalDataset()` et commence par `resetClone()` ; il n'a pas ete lance. Le nouvel adaptateur d'entree `buildCurrentCandidateDataset()` du meme module fournit directement les 850 lignes au planificateur C20/C23 existant. Aucun moteur de publication nouveau ni changement de donnees metier.

Artefact deterministe : `outputs/qv-2027-sql-materialisation-repair-1/static-control.json`. Chaque ligne conserve l'ID canonique, modele, libelle, domaine, famille, Stat.Com/code, date et horaire, OI/site, publics, type, statut, decision locale, instruction liee le cas echeant, cle de publication SQL et action theorique C23. Le modele de publication contient une activite reutilisable, une occurrence/session et un evenement par `publicationKey` ; **850 cles de publication** sont derivees, sans pretendre qu'il faut creer 850 evenements.

| Controle | Resultat |
| --- | ---: |
| Occurrences entrantes / transformees / classifiees | 850 / 850 / 850 |
| IDs perdus / supplementaires / doublons | 0 / 0 / 0 |
| Cles SQL nulles / collisions | 0 / 0 |
| Tour de France Femmes 2027 | 0 |
| Decisions locales / instructions / conduites | 15 / 12 / 3 |
| Liens des trois conduites N02a vers leur instruction FEU | 3 / 3 conformes |
| Decisions locales auto-arbitrees / HUMAN_REVIEW calendrier bloquants | 0 / 0 |
| Dates manquantes / erreurs de transformation structurelle | 0 / 0 |
| Conduites DPS / DAP | 56 / 16 |

## Limites bloquantes

Le plan theorique C23 sur **snapshot vide artificiel**, et non sur PostgreSQL, donne `CREATE=24`, `BLOCKED=826` (`SOURCE_NOT_VALIDATED=725`, `REFERENCES_NOT_VALIDATED=101`). Ces nombres ne sont **pas** un diff SQL ni une autorisation de publication. Les statuts du candidat sont preserves : 125 `VALIDATED`, 719 `A_POSITIONNER`, 1 `CALCULE`, 5 `INSUFFICIENT_INFORMATION`. La validation metier du candidat n'equivaut pas a la validation individuelle d'un evenement publie.

Le referentiel local de fixture ne permet pas de mapper 57 lieux et 116 salles textuels vers une reference canonique. Les valeurs brutes restent dans l'artefact ; elles ne sont pas effacees du candidat. L'adaptateur laisse les codes de lieu/salle absents lorsque la correspondance n'est pas prouvee. Les referentiels reconstruits depuis la fixture ne certifient pas la presence des codes dans PostgreSQL de recette. Toute publication ou materialisation SQL exige un controle de ces references et de la cardinalite des objets preparatoires, sans forcer les statuts.

La cible C23 `127.0.0.1:55432/scope_c23_clone` ne repond pas a `pg_isready`. Le dump C23 mentionne dans le rapport historique n'est plus present localement ; aucun clone de recette complet reutilisable n'a ete identifie. La fixture PostgreSQL locale d'Ascension ne contient que les tables calendrier et n'est pas une cible C23. Aucun clone n'a ete cree, restaure ou reinitialise ; aucune production n'a ete consultee comme substitut.

Par consequent, le vrai diff SQL en lecture seule (`MATCHED`, `WOULD_CREATE`, `WOULD_UPDATE`, `UNCHANGED`, `WOULD_DELETE/DISABLE`, `BLOCKED`, doublons et objets inattendus) est **non obtenu**. Les decisions humaines, participations, assignations et donnees historiques sont inchangees par ce lot, mais leur protection contre une future migration ne peut etre verifiee sans snapshot SQL. `CALENDAR_SQL_STATUS=BLOCKED` jusqu'a disponibilite d'un clone conforme et d'un vrai diff, puis examen MOA de ce diff avant toute ecriture.

## Verification

- `node scripts/scope-qv-2027-sql-materialisation-repair-1.js` : PASS, artefact genere.
- `node scripts/scope-qv-2027-sql-materialisation-repair-1-tests.js` : PASS, determinisme et contrat 850.
- 23/23 suites `scripts/scope-qv*tests.js` : PASS (22 existantes + 1 nouvelle).
- `npm run check` : PASS.
- `git diff --check` : PASS.

Branche : `scope-qv-canonical-rules-checkpoint-20261002`. Aucun commit, push, PR, merge, migration ou deploiement. Production inchangee.

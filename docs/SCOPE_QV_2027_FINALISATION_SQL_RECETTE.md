# SCOPE / QUO VADIS 2027 - finalisation SQL de recette

Date : 06.10.2026. **Verdict : MOA_REQUIRED / BLOCKED avant migration locale.**

## Cible de recette

- Site Netlify lie au depot : `scope-sdisnv`. Le code utilise `DATABASE_URL`; la variable locale `SCOPE_DATABASE_URL` pointe vers le pooler PostgreSQL Supabase SCOPE. La valeur Netlify production est masquee par l'outil et n'a pas ete divulguee. L'identite SCOPE est confirmee par 110 tables `scope_%`, dont `scope_evenements` et `scope_quo_vadis_programmes`. Aucune connexion ORION.
- Source distante : un SELECT explicite `BEGIN READ ONLY` a constate 250 evenements, 6 156 participations et 5 952 attendus. `pg_dump` du schema `public` a ete lu sans ecriture distante : `/private/tmp/scope-qv-2027-recipe-20261006.dump`, permissions `0600`, SHA-256 `8449013e6dd530d447c87a4ee18b39d51e37620cddaf316482924797d12e8801`.
- PostgreSQL Homebrew existant redemarre sur `127.0.0.1:55432`. Base **locale dediee** `scope_qv_2027_recipe_20261006` creee puis restauree. La premiere restauration a rencontre le schema `public` precree; `pg_restore --clean --if-exists` a reussi uniquement dans cette base locale neuve.
- Clone verifie : 110 tables SCOPE, migration `scope-qv-publication-c23-repair-1` presente, 250 evenements, 129 evenements historiques, 6 156 participations, 5 952 attendus, 636 affectations, 2 290 entrees du journal metier, 109 obligations QV, 159 propositions, 118 liens de publication QV. Ces volumes sont restes inchanges apres le diff. La recette n'emploie aucune dependance ORION.

## Referentiels SQL

Comparaison par occurrence contre les **references SQL actives**, detaillee dans `outputs/qv-2027-sql-recette/local-readonly-diff.json` :

| Valeurs textuelles sans ID dans le candidat | MATCHED | UNMATCHED | AMBIGUOUS |
| --- | ---: | ---: | ---: |
| 57 lieux | 0 | 41 | 16 |
| 116 salles | 110 | 4 | 2 |

Les 110 salles certaines comprennent les codes SQL exacts, l'alias `R-G1-EM` vers l'unique salle SQL `G1-ETAT-MAJOR`, et les salles de theorie uniques de B1/C1 avec lieu ID deja prouve. Les deux `Salle de theorie` de G1 restent ambigues ; trois de B2 et `Compactus equipement` sont absents. Les lieux `Caserne SDIS`, `SDIS NV` et un nom de localite sont ambigus; `A definir` et les lieux externes non repertories restent sans correspondance. Aucun lieu ou salle n'a ete cree. Le candidat et ses libelles bruts sont conserves. L'adaptateur SQL reutilise aussi la conversion existante des domaines fonctionnels F* vers `INSTITUTIONNEL`, sans changer le domaine metier, et n'envoie plus la portee `SDIS` comme code OI.

## Diff SQL reel - lecture seule

Le script `scripts/scope-qv-2027-sql-recette-readonly.js` ouvre exclusivement la base locale nommee, avec l'adaptateur C23 en mode `readOnly`, puis calcule le plan dans `BEGIN READ ONLY`. L'ancien snapshot de 635 objets n'a pas ete utilise comme source. Les 850 IDs canoniques et les 15 decisions locales sont presents ; Tour de France 2027 absent ; aucune collision ni doublon SQL.

| Mesure | Nombre |
| --- | ---: |
| Occurrences traitees / cles existantes appairees | 850 / 118 |
| WOULD_CREATE / WOULD_UPDATE / UNCHANGED | 5 / 110 / 0 |
| WOULD_DELETE/DISABLE / doublons | 0 / 0 |
| BLOCKED | **735** |
| SOURCE_NOT_VALIDATED | 725 |
| REFERENCES_NOT_VALIDATED | 10 |

Les 725 non `VALIDATED` sont des statuts de preparation conserves, non une autorisation de publication d'evenement. Les 10 autres comprennent huit OI a qualifier et deux Stat.Com `EMSEA` absents du referentiel. Parmi les 110 updates theoriques, 110 changent la priorite et le libelle de session, 53 concernent CTA, et certains changent aussi domaine, public, lieu ou horaire. Ces valeurs ne doivent pas etre ecrasees par des valeurs par defaut de l'adaptateur. Aucun evenement lie n'a de donnees operationnelles selon le snapshot C23, mais ce seul constat ne rend pas les 110 updates metier conformes.

**STOP avant premier passage local.** Le plan C23 publie des evenements `VALIDATED`; il ne materialise pas les 850 preparations dans SQL. Le forcer a publier 725 occurrences `A_POSITIONNER`/autres changerait le contrat metier. Executer les 115 actions restantes maintenant laisserait 735 occurrences non materialisees et pourrait degrader des champs des 118 publications existantes. La migration locale, le second passage, l'idempotence et les identifiants post-migration ne sont donc pas demonstrables. Aucune migration de production n'est preparee ni executee.

**Question MOA ciblee :** la materialisation SQL des 850 vise-t-elle les **preparations QUO VADIS**, sans publication d'evenements pour les 725 non `VALIDATED`, ou une publication C23 seulement apres validation individuelle de chaque occurrence ? La premiere option doit conserver les 15 decisions locales et les lieux libres; la seconde ne permet pas une migration 850 maintenant. Aucun statut n'a ete releve automatiquement.

## Controles

- `scripts/scope-qv*tests.js` : 24/24 PASS (22 preexistantes et deux controles SQL statiques).
- C20 publication : 30/30 PASS ; C21 execution/protection : 60/60 PASS.
- `npm run check` : PASS ; `git diff --check` : PASS.
- Le test historique C23 n'a **pas** ete lance : il execute `resetClone()` et le jeu fige de 635, incompatibles avec ce clone representatif.
- Evenements, participations, attendus, affectations, journal et historique du clone preserves **par absence de migration**; protection apres migration non verifiee.
- Aucun changement de candidat, calendrier ou decision locale ; aucun commit, push, PR, merge, deploiement ou ecriture de production.
- SELECT distant final en `BEGIN READ ONLY` : 250 evenements, 6 156 participations, 5 952 attendus, 118 liens QV, identiques aux volumes observes sur la source avant/au moment du dump.

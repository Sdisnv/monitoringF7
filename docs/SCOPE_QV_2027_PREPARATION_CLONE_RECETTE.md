# SCOPE / QUO VADIS 2027 - recette SQL du candidat 850

Date : 06.10.2026. **Verdict : preparation locale PASS ; publication et migration production BLOCKED.** Ce rapport suit la decision MOA de distinguer programme/preparation et evenement operationnel. Le rapport `SCOPE_QV_2027_FINALISATION_SQL_RECETTE.md` decrit l'etat anterieur, avant cette decision.

## Frontiere metier et cible

La cible est uniquement le clone PostgreSQL local `scope_qv_2027_recipe_20261006` sur `127.0.0.1:55432`, restaure depuis un dump SCOPE en lecture seule (SHA-256 `8449013e6dd530d447c87a4ee18b39d51e37620cddaf316482924797d12e8801`). Le script d'ecriture verifie le nom de la base et l'adresse du serveur avant toute transaction. Aucune connexion ORION ni ecriture distante dans ce lot.

La table existante `scope_quo_vadis_obligations` stocke maintenant les 850 snapshots de preparation, sous `source_type=MANUAL` et `metadata.source=QV_PROGRAMME_PREPARATION`, avec `automatedSnapshot=true`, `humanDecision=false` et le statut canonique exact dans `metadata.canonicalStatus`. Le statut SQL de workflow est `PLANIFIE` pour les 125 lignes `VALIDATED`, `A_PLANIFIER` pour les 725 autres. `metadata.canonicalRow` conserve les donnees source; `include_in_programme=false` evite une seconde population d'obligations. La lecture canonique expose le lien de preparation sans remplacer le statut metier; une decision humaine ulterieure garde la priorite. La permanence feriee de l'Ascension, ajoutee tardivement par CTA, est elle aussi reliee. Reouverture applicative : 850 lignes non externes, 850 liens de preparation, 725 statuts non `VALIDATED`, 118 liens d'evenements preexistants, Tour de France absent.

## Referentiels et dix cas initiaux

Sur les 57 lieux textuels sans ID : **0 MATCHED / 41 UNMATCHED / 16 AMBIGUOUS** contre les lieux SQL actifs. Ils restent en `lieu_libre` et dans la source canonique; aucun lieu n'est cree. Sur 116 salles textuelles : **110 MATCHED / 4 UNMATCHED / 2 AMBIGUOUS** par code ou alias. Seules **93** sont rattachees a une FK compatible avec un lieu certain. Parmi les 110 matchs de code, 15 pointent `R-G1-VULCAIN` alors que le lieu est C1/B1/B2/Y*, et deux ont un lieu `SSP` sans ID prouve; ces 17 libelles restent textuels sans FK contradictoire. Les six autres restent textuels faute de match unique. Aucun referentiel n'est cree ou modifie.

| ID | Activite, Stat.Com | Constat et sort |
| --- | --- | --- |
| `qv-source-862` | Seance Etat-major, `EMSEA` | Stat.Com non applicable selon C20; adaptateur transmet `null` a C23 et conserve `EMSEA` en preparation. Lien existant. Resolu techniquement. |
| `qv-source-877` | Cours de cadres Formateurs cursus MEA, `0151F7` | Publics `AUTO:1/5`, OI a qualifier, aucun lien existant. Aucune publication inventee. |
| `qv-source-890` | Cursus MEA module 1.0, `0151F7` | Publics `AUTO:1/5`, OI a qualifier; lien existant conserve. |
| `qv-source-895` | Cours de cadres FOBA, `010FOBC` | Publics `FOBA:1/2/3`, OI a qualifier, aucun lien existant. Aucune publication inventee. |
| `qv-source-896` | Cours de cadres Formateurs MEA 1, `0151F7` | Publics `AUTO:1/5`, OI a qualifier; lien existant conserve. |
| `qv-source-899` | Cursus PAPR module 1, `011PR` | Public `PR:2`, OI a qualifier; lien existant conserve. |
| `qv-source-902` | Cursus cond VL module 1.0, `01522F7` | Public `AUTO:3`, OI a qualifier; lien existant conserve. |
| `qv-source-905` | Cours de cadres PR, `011PR` | Public `PR:2`, OI a qualifier; lien existant conserve. |
| `qv-source-919` | Cours de cadres formation annuelle Grutiers, `0154F7` | Public `AUTO:1`, OI a qualifier; lien existant conserve. |
| `qv-source-921` | Seance Etat-major, `EMSEA` | Meme regle technique que `qv-source-862`; lien existant. Resolu techniquement. |

Les huit cas `OI a qualifier` restent des preparations, sans OI fabrique. Leurs six publications anterieures restent intactes. L'absence d'OI ne doit pas etre deduite du domaine; la MOA doit confirmer si ces cours transversaux n'ont volontairement aucun OI ou designer les OI reellement concernes.

## Diff et protection des publications

Le controle par ID des **110 `WOULD_UPDATE` initiaux** est dans `outputs/qv-2027-sql-recette/update-review.json`, avec les valeurs avant/apres : `SAFE_UPDATE=3`, `NO_CHANGE_REQUIRED=75`, `BLOCKED_REAL_CONFLICT=32`. Les 75 sans changement requis regroupent 49 CTA ou la preparation globale ne remplace pas l'affectation publiee par site et 26 ecarts de valeurs par defaut. Trois ajouts de public source sont surs une fois les champs non fournis preserves. Les 32 conflits concernent quatre dates CTA, 22 mappings de domaine SQL, une cible/famille, un lieu/public et quatre changements conjoints de responsable et public; ils ne sont pas auto-arbitres. Les deux EMSEA resolus s'ajoutent ensuite aux candidats `WOULD_UPDATE` C23 : leur cible SQL `SDIS-EM` differe du `SDIS` du programme et reste a verifier. Aucun `UPDATE` C23 n'a ete lance.

Nouveau diff brut C23 en lecture seule : `MATCHED=118`, `WOULD_CREATE=5`, `WOULD_UPDATE=112`, `UNCHANGED=0`, `BLOCKED=733` (`725 SOURCE_NOT_VALIDATED`, attente normale du workflow, et `8 REFERENCES_NOT_VALIDATED`), `WOULD_DELETE/DISABLE=0`, doublons `0`. Le plan **reconcilie en lecture seule**, qui preserve les champs absents et les affectations CTA deja publiees, donne `WOULD_CREATE=5`, `WOULD_UPDATE=37`, `UNCHANGED=75`, `BLOCKED=733`, doublons `0`. Ce total de `BLOCKED` est un resultat du moteur de **publication**, pas du stockage des preparations : les 725 sont preparees et ne constituent pas des anomalies. Les cinq creations techniquement publiables et les trois updates surs sont retenus tant que le diff de publication global n'est pas sur. Aucun statut ni date du candidat n'a ete eleve ou deplace.

## Passages locaux et controles

Premier passage du materialiseur de preparations : `CREATED=850 / UPDATED=0 / UNCHANGED=0 / BLOCKED=0 / doublons=0`. Deuxieme passage identique : `CREATED=0 / UPDATED=0 / UNCHANGED=850 / BLOCKED=0 / doublons=0`; les UUID derives des identites sont stables. Les 15 decisions locales restent dans les 850 lignes, avec `humanDecision=false` sur les snapshots automatiques : aucune decision locale n'a ete auto-arbitree.

Avant / apres : evenements `250/250`, participations `6156/6156`, attendus `5952/5952`, affectations `636/636`, journal metier `2290/2290`, historique programme `0/0`, liens QV publies `118/118`; obligations `109 -> 959`. Aucun evenement lie au candidat non `VALIDATED`. Ces volumes et le code d'ecriture limite aux obligations constituent la preuve de non-interference du passage local. Les decisions humaines persistantes restent protegees par la garde `humanDecision` et par le test cible; aucune donne humaine existante n'a ete mise a jour.

Tests : `node --test scripts/scope-qv*tests.js` **29/29 tests PASS** (dont 5 tests cibles de la preparation et de l'adaptateur), C20 **30/30 PASS**, C21 **60/60 PASS**, `npm run check` PASS, `git diff --check` PASS. La lecture applicative du clone donne 850/850 preparations. Le test historique C23 qui reinitialise le clone de recette n'a pas ete lance.

**STOP avant toute ecriture production.** Le passage local des preparations est idempotent, mais le plan de publication operationnelle n'est pas pret : huit OI restent a qualifier et 32 divergences des 110 updates initiaux ne sont pas resolues. `CALENDAR_SQL_STATUS=BLOCKED`, et non `READY_FOR_PRODUCTION_MIGRATION`. Aucune migration SQL, publication, commit, push, PR, merge ou deploiement en production.

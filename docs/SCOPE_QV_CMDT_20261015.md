# SCOPE / QUO VADIS — Correctif CMDT, 15.10.2026

## Préflight
Main directement vérifié : `0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41`, PR #26 fusionnée.
Production scope-sdisnv : déploiement `6ad0a892de679dbc83844576`, même commit,
publié le 15.10.2026 à 10:19:31 UTC. PR #20 à #26 fusionnées, aucune autre PR ouverte au préflight.
Branche unique `codex/scope-qv-cmdt-gouvernance-20261015`, depuis ce main, sans modification de main.
Travaux locaux étrangers, serveur de recette et transaction MOA ouverts préservés.

## Cause Et Adaptation Minimale
QV-OI-SDIS-001 diffusait toutes les activités organisées par SDIS aux onze OI opérationnels.
Cette règle ne distinguait pas les quatre catégories de gouvernance désormais qualifiées CMDT.
L'inventaire des mécanismes existants n'a pas démontré de propriété dédiée de diffusion ;
les notions de couverture/public existantes concernent la population, pas ce périmètre de visibilité.
Les détourner aurait modifié le sens métier. Aucun nouveau champ persistant n'est nécessaire.

`qvProgrammeDiffusionScope` calcule CMDT pour SDIS + cinq identifiants canoniques démontrés
(quatre catégories, dont la variante Codir + repas). `qvProgrammeOiMatches`, déjà commun au
Programme, à l'Agenda annuel, au mois et aux exports, exclut uniquement ces lignes des onze OI
et de leurs filtres parents. Le rendu, le serveur métier et les moteurs de participation ne changent pas.
Pas de nouveau sélecteur, référentiel parallèle, OI, famille, domaine ou moteur de filtrage.

Sources : `scope-qv-programme-2027.json` et `scope-qv-history-2026.json`, définitions explicites ;
liens de publication réels lus sans écriture. Codir `qv-source-893` et EM `qv-source-862/921`
conservent leurs UUID de publication. Les chaînes canoniques ne sont pas des UUID SQL :
aucune équivalence dans `scope_event_definitions.code` n'a été supposée après résultat nul.
Les liens `source_definition_id` démontrent les publications EM/Codir ; CRDIS et Conférence
sont démontrées dans le catalogue versionné, sans inventer une publication correspondante.
Un titre humain renommé ne change pas la diffusion d'une définition reconnue ; un simple titre
Codir sans définition ne qualifie rien. Les autres activités SDIS restent QV-OI-SDIS-001.

## Recette Ciblée A–T

| Tests | Résultat |
| --- | --- |
| A–D | EM, Codir et Codir + repas, CRDIS, Conférence : cinq définitions exactes, 26 occurrences actives dans le jeu représentatif |
| E–F | Global 924 lignes et SDIS 44 : modèles/CSV strictement identiques à main, CMDT conservé |
| G–J | Onze OI et trois filtres parents : retrait exact des 26 CMDT, aucun retrait d'autre ligne, aucun doublon |
| K | Dix-huit autres activités SDIS conservées dans chaque vue opérationnelle ; cadres F5/6 explicitement vérifié dans le mois |
| L–M | Y1 : 121 → 95 lignes, PDF 8 pages et CSV existants sans les quatre catégories ; requête PDF et CSV téléchargé correspondent à l'écran |
| N | SDIS : 44 lignes, PDF 5 pages/CSV, catégories CMDT conservées ; global tous : modèle/CSV identiques à main |
| O | Identifiants uniques, pas de duplication ni suppression en base |
| P–S | Projection complète avant/après identique ; mêmes Stat.Com, codes, dates, horaires, OI, publics, validations et publications ; onze tables publiques du clone identiques |
| T | SQL production exclusivement BEGIN READ ONLY / ROLLBACK ; navigateur local sans requête métier écrite ; aucune migration ni publication |

Preuves dans `docs/captures/qv-cmdt/` : préflight directement relevé, inventaire d'identifiants,
empreintes, filtres avant/après, captures Programme/Agenda, manifestes navigateur et PDF/CSV.
Les premières pages PDF ont été rendues et inspectées ; géométrie et douze colonnes vérifiées
sur toutes les pages. Renderer, formats, CSV BOM/point-virgule et champs métier inchangés.
L'export Excel existant est un CSV compatible Excel, pas un nouveau XLSX.

Le jeu de recette est la projection privée PR #26 déjà prouvée : 944 lignes, 924 actives,
dont 44 SDIS = 26 CMDT + 18 non CMDT. Ce n'est pas un nouveau recensement exhaustif de production.
Le test compare le code de main et ce lot sur le même jeu ; aucune campagne historique relancée.
Clone `scope_qv_2027_recipe_20261006` @ 127.0.0.1:5432, transaction READ ONLY puis rollback
avec vérification des onze tables : obligations, événements, publications, affectations, présences,
attendus, journal, codes, OI d'événements, publics d'événements, personnes.

Chrome/Playwright, sessions neuves isolées à 1440x1100 et 1366x768, zéro erreur JavaScript.
Assets et projection de ce lot substitués par interception sur le serveur de recette existant ;
requêtes métier non GET interceptées, aucun changement dans l'onglet MOA ouvert. Les requêtes PDF
sont comparées au modèle puis interceptées ; PDF réels générés séparément par le renderer inchangé.
Le navigateur existant reste sur son ancien code ; ce lot n'y est pas installé silencieusement.
Safari/WebKit non testé (runtime absent).

Commandes : `node scripts/scope-qv-cmdt-tests.js`,
`SCOPE_PLAYWRIGHT_MODULE=<Playwright existant> node scripts/scope-qv-cmdt-browser.js`,
`node scripts/scope-qv-cmdt-exports.js`, `node scripts/build-scope-static.js`, vérifications syntaxe
et `git diff 0d1fc89 --check`. Build configuré Netlify réussi, aucun déploiement commandé.

## Fichiers Et Livraison
Application : `assets/js/scope-ui-logic.js` uniquement.
Garde sans publication de cette branche : `netlify.toml`. Attributs PDF/CSV limités aux preuves :
`.gitattributes`. Trois scripts de recette ciblée, preuves `qv-cmdt`, complément canonique,
ce rapport, rapport consolidé `SCOPE_V1_SITUATION_20261015.md` et actualisation de la roadmap/ToDo existante.

**READY_FOR_MOA** pour le correctif CMDT démontré. **MOA_REQUIRED** pour toute autre catégorie
non qualifiée et les arbitrages V1 explicités dans le rapport consolidé. Aucun Programme annuel
déclaré validé. Une seule PR, aucune fusion, publication, migration ou écriture métier en production.

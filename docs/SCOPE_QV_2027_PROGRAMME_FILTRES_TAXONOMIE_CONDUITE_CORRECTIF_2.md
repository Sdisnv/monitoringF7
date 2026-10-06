# QUO VADIS 2027 - Programme, filtres, taxonomie et conduite - Correctif 2

## Préflight et périmètre

- Branche initiale : `scope-qv-canonical-rules-checkpoint-20261002`.
- `HEAD` initial : `a186bbee530cb40217034b2d27d5d08641703305` ; `origin/main` : `55667a79012e976d54f5c90cc183628f8897cec9`.
- `git status --short` : worktree déjà sale (correctifs SCOPE antérieurs, rapports, tests et autres fichiers non suivis). Aucun reset, restore, stash ou nettoyage.
- `git diff --check` initial : PASS. Le référentiel `docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md` et les rapports récents Conduite/couverture ont été lus avant modification.
- Classeur historique ouvert directement par la suite `scope-qv-programme-domain-oi-transversality-correctif-1-tests.js` : 919 lignes, SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`, identique au référentiel historique importé. Aucune écriture dans le classeur.
- Aucune donnée métier, aucun Stat.Com, OI, événement, production ou moteur de génération n'a été modifié dans ce lot. NUOVO et Rapport annuel restent inchangés.

## Diagnostic Conduite

L'historique Git montre l'ancien moteur (présent dans `HEAD` `a186bbe`) avec `QV_CONDUITE_PER_HALF = 2` : 56 conduites DPS, deux par demi-section, et une règle qui pouvait ajouter des instructions. Le worktree préexistant à ce lot a remplacé cette règle par `QV_CONDUITE_PER_SITE = 2`, soit huit DPS, et a abandonné l'ajout d'instructions artificielles. Les rapports et tests MOA plus récents (`SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md`, `SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md`) valident expressément **huit** DPS, deux par site, en 2027-2029. Le changement 56 -> 8 est donc local et antérieur à ce lot ; il ne peut être traité comme une régression technique certaine sans renverser cette décision métier. Le présent lot n'a pas modifié ce moteur.

| Mesure | Avant ce lot | Après ce lot | Règle actuellement prouvée |
| --- | ---: | ---: | ---: |
| Conduite DPS | 8 | 8 | 8, deux/site |
| Conduite DAP | 16 | 16 | 16, quatre/Y1-Y4 |
| Conduite totale | 24 | 24 | 24 |
| Programme 2027 | 808 | 808 | 808 |
| Datées / sans date / historiques | 796 / 12 / 637 | 796 / 12 / 637 | Inchangé |
| Conduites DPS en juillet | 1 (G1) | 1 (G1) | Aucune autre juillet prouvée |

### Inventaire réel des 24 conduites

Les quatre lignes DPS du 06.02 sont des sources explicites 2027. Les quatre autres suivent leur demi-section sélectionnée. Toutes les conduites DPS portent `0152F7`, `AUTO:1` (cond PL) et `AUTO:3` (cond VL), en plus de la demi-section ; toutes les DAP portent `01522F7` et `AUTO:3` (cond VL).

| Date | Horaire | OI et public de section | Nombre |
| --- | --- | --- | ---: |
| 06.02.2027 | 10:30-11:30 | DPS:G1 N04a ; DPS:C1/B1/B2 N01b | 4 |
| 03.07.2027 | 10:30-11:30 | DPS:G1 N03a | 1 |
| 21.08.2027 | 10:30-11:30 | DPS:C1/B1/B2 N03b | 3 |
| 03.03.2027 | 18:30-21:30 | DAP:Y2, Y4 | 2 |
| 04.03.2027 | 18:30-21:30 | DAP:Y2, Y3, Y4 | 3 |
| 09.03.2027 | 18:30-21:30 | DAP:Y3 | 1 |
| 10.03.2027 | 18:30-21:30 | DAP:Y2 | 1 |
| 17.03.2027 | 18:30-21:30 | DAP:Y2, Y3, Y4 | 3 |
| 18.03.2027 | 18:30-21:30 | DAP:Y4 | 1 |
| 25.03.2027 | 18:30-21:30 | DAP:Y3 | 1 |
| 26.04, 03.05, 10.05, 17.05.2027 | 18:30-21:30 | DAP:Y1 | 4 |

La comparaison des anciens 56 avec les huit actuelles ne justifie pas à elle seule une restauration : l'ancienne règle deux/demi-section est contredite par la validation ultérieure deux/site. Les instructions ajoutées après cette réduction n'appellent aucune conduite supplémentaire selon le rapport de couverture. `MOA_REQUIRED` : confirmer explicitement si la règle huit DPS reste applicable ou si elle est remplacée, avec cardinalité, thèmes et calendrier exacts. Ne pas fabriquer des séances de juillet pour C1/B1/B2 alors que leur seconde conduite prouvée est en août.

## Filtres et présentation

- **Domaine** : choix F0-F8 dans l'ordre et sans tiret. La lecture du domaine utilise d'abord un code F0-F8 canonique, puis la ligne source 2026 non composée, puis un suffixe F0-F8 explicite du Stat.Com. Un domaine historique composé (`F1/8`, `F2/3`, `F5/6`) n'est jamais ventilé par hypothèse. Répartition affichable sur les 808 lignes : F0 48, F1 28, F3 30, F4 24, F6 21, F7 533, non qualifiées 124. F2/F5/F8 ont actuellement zéro ligne démontrée, mais figurent au référentiel. Le filtrage technique d'une valeur composée préexistante demeure possible par compatibilité, sans choix visible.
- **Famille** : DPS, DAP, JSP ; FOBA, FOCO, FOCA, FOSPEC ; AUTO, PR. Le filtre et la colonne Programme ne confondent plus ces codes avec Événement/Exercice/Formation/Instruction. Aucune famille n'est inférée de l'OI.
- **Type** : filtre juste avant État. Inventaire effectif 2027 : Événement 194, Exercice 173, Formation 183, Instruction 155, Conduite 16 et 87 sans valeur source ; parmi ces 87, 29 libellés commencent par « Séance » et 53 sont exactement « Permanence ». Ces deux derniers types sont dérivés du libellé explicite ; cinq autres restent non qualifiés. Les choix Cours et Représentation sont affichés selon le référentiel MOA mais aucune ligne 2027 ne les porte actuellement. Le classeur 2026 n'a pas de champ Type structuré équivalent.
- **OI** : hiérarchie DPS/G1,C1,B1,B2 ; DAP/Y1-Y4 ; JSP/JSP G1,C1,B1 ; SDIS. Les codes internes qualifiés restent intacts. Un parent sélectionne les OI confirmés correspondants, indépendamment du domaine et de la famille ; les cas transverses F6 et F4 restent visibles depuis chaque OI concerné.
- **Public cible** : groupes construits depuis le catalogue SCOPE : Général, DPS, DAP, JSP, FOBA, FOCA (échelons), FOCO, FOSPEC, AUTO, PR, Encadrement, puis éventuels codes supplémentaires. N01a/b etc. sont indentés. Aucun code public actif n'est supprimé. Y1-Y4 et les sites JSP sont des OI dans les données actuelles, non des codes public cible : ils sont donc proposés par OI, pas faussement par Public cible. Les codes FOCO et FOCA n'ont pas de cible active 2027 ; les groupes se remplissent dès qu'un code du catalogue est utilisé. La règle PABC/PAPR n'est pas touchée.
- **Stat.Com** : menu à colonnes CSS fixes (code `9ch`, libellé dans une colonne distincte), sans tiret entre eux. La sélection stocke le code exact, sans padding. Aucun code métier n'a changé.
- **Lieu** : DPS/DAP/Autres conservés. Donneloye, Belmont-sur-Yverdon et Ursins sont masqués comme simples localités dans les choix, mais restent dans les données source. Les vrais lieux présents restent sélectionnables.
- **Séances multiples** : l'ancienne condition `sessionCount > 1` retournait zéro après que la présentation opérationnelle avait converti certaines sessions en occurrences (`sessionCount = 1`). La lecture s'appuie maintenant sur `activityLabel` + `eventDisplayLabel` numéroté + `occurrenceCount > 1`, ou sur `sessionCount > 1` lorsqu'il existe réellement. Le cas source explicite Formation groupée JSP (quatre créneaux distincts le 29.05, même définition, `occurrenceCount = 4`) est aussi inclus. 48 lignes réelles : Exercice PR 24, Formation groupée 1.x 6, Formation groupée JSP 4, TRUCK 9, CAR 5 ; les récurrences non séquencées comme Conduite restent exclues. Aucun booléen métier ajouté.
- **Agenda annuel** : grille desktop de quatre colonnes égales, repli à deux colonnes sous 720 px. Calculs 808/796/637/12 inchangés.

## Vérification

- Nouvelle suite `node scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js` : **9/9 PASS** ; exercice la vraie liste 808, AUTO+DPS 8, AUTO+DAP 16, G1 2, cond PL/VL, OI transverses, 48 lignes multi-séances, HTML des filtres et CSS KPI.
- Suite antérieure `node scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js` : **13/13 PASS** après adaptation de ses assertions UX aux nouveaux libellés ; son contrôle direct du classeur et les preuves F4/F6/OI restent inchangés.
- `scope-qv-programme-domaines-canoniques-final-tests.js` 9/9 ; `scope-qv-instructions-rotation-conduite-repair-1-tests.js` 45/45 ; `scope-qv-instruction-coverage-moa-repair-2-tests.js` 21/21 ; `scope-qv-agenda-programme-ux-final-1-tests.js` 9/9 ; `scope-qv-2027-post-recette-a-j-tests.js` 20/20 ; `scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` 19/19 ; `scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js` 12/12 ; `scope-qv-repair-2-tests.js` 11/11 ; `scope-qv-business-consolidation-tests.js` 39/39 ; `scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js` 12/12. Total des 12 suites QUO VADIS ciblées : **219/219 PASS**.
- `npm run check` : PASS. `npm run test:scope` : interrompu par l'assertion préexistante `scope-login-visual-alignment-orion-1-tests.js:138` qui attend une ancienne version de cache-bust CSS login ; quatre suites précédentes PASS, pas de correction hors lot. `git diff --check` : PASS.
- Recette navigateur : **NON EFFECTUÉE**. Le serveur local répond sur `http://127.0.0.1:4393/scope.html#/quo-vadis/programme`, mais l'outil navigateur ne découvre aucun navigateur connecté (`[]`). Aucun PASS visuel n'est revendiqué. **MOA_REQUIRED** pour la recette visuelle des menus, alignements et KPI desktop/mobile.

## MOA_REQUIRED et état Git

1. Arbitrer la contradiction Conduite : demande actuelle de restaurer des séances après chaque instruction / en juillet versus dernière règle validée de huit DPS (deux/site), confirmée par plusieurs suites métier. Aucun ajout n'a été fait.
2. Examiner les 124 lignes dont aucun domaine F0-F8 simple n'est démontré par les éléments accessibles ; ne pas les classer en bloc. Cela inclut les valeurs historiques composées et les permanences sans code domaine.
3. Si Public cible doit inclure Y1-Y4 et les sites JSP comme dimensions distinctes de l'OI, fournir la règle et les codes publics correspondants ; le catalogue actuel ne les porte pas.
4. Réaliser la recette navigateur lorsque l'accès est rétabli.

Fichiers touchés dans ce lot : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `assets/css/scope.css`, `scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js` (assertions UX antérieures actualisées), `scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js`, et ce rapport. Les nombreuses autres modifications du worktree sont antérieures et préservées. Aucun commit, push, PR, merge ou déploiement ; production inchangée.

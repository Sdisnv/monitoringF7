# SCOPE - QUO VADIS 2027 - correction post-recette MOA A-J

## Périmètre et état initial

- Branche initiale : `scope-qv-canonical-rules-checkpoint-20261002` ; HEAD initial : `9c19979de51f32d64ca8a313fc792174d12a1731`.
- Worktree initial déjà modifié par le lot précédent. Ses corrections, son rapport et ses captures ont été préservés. Les artefacts C19 et PDF régénérés, sans rapport avec A-J, n'ont pas été retouchés volontairement.
- Classeur historique **ouvert et lu directement** : `2026 QUO VADIS SDIS Nord vaudois.xlsx`, chemin fourni dans la conversation, feuille `QUO VADIS '26`, SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`, 919 lignes métier structurées. Les lignes lues correspondent exactement à la projection JSON existante. Le fichier accessible ne porte pas le suffixe `(4)` mentionné dans un message antérieur ; aucun second classeur n'a été supposé.
- Source canonique 2027 : 622 lignes, inchangée. Les corrections sont appliquées par le moteur de lecture et les préparations locales, sans migration ni écriture en production.
- Travail hérité : projection historique, rotations section/demi-section, PR-ABC, périodicité, agenda et fiches étaient déjà en place. REPAIR-2 reste vert (11/11) et la consolidation métier antérieure reste verte (39/39). A-J précise et remplace les règles contraires, notamment trois vers deux conduites DPS par demi-section.

## Causes et corrections

| Règle MOA | Avant ce correctif | Correction | Après / preuve |
| --- | --- | --- | --- |
| A / H Instructions, PIONNIER, ABC | Répartition déjà corrigée dans le lot précédent | Aucune réécriture de KICK-OFF ou des rotations ; contrôle de non-régression | 17 KICK-OFF sur 9 dates et 4 sites ; PIONNIER/ABC sans signature date-public dupliquée ; test A-J 1-2 |
| B DAP exercices | 5 exercices par section | 5e non reconduit automatiquement ; 4e placé sur le dernier créneau historique vendredi/samedi ; identifiants source conservés et décisions humaines prioritaires | 4 par Y1-Y4 ; 16 cours de cadres tous antérieurs à l'exercice correspondant ; tests 3-4, 17-19 |
| C Conduite DPS | 3 par demi-section, 84 au total | Cardinalité 2 dans la règle de dérivation et sa cible CTA ; durée inchangée | 56 = 28 demi-sections x 2 ; 10:30-11:30 ; test 5 |
| C Conduite DAP | 17 soirées issues de 2026, public moniteurs, chevauchement non modélisé | 4 soirées mars-mai par Y1-Y4, public cond VL ; 4 places avec présences chevauchées et demi-heures exactes conduite/connaissance véhicule | 16 soirées 18:30-21:30 ; test 6 ; fiche DAP enrichie |
| D JSP | 84 séances et activités particulières conformes | Aucune transformation | 84 séances préservées ; test 7 |
| E FOBA | 13 exercices légitimes ; trois FOBA 3 génériques non qualifiés par thème | Reprise des dates et thèmes de chaque réalisation 2026 ; champ thèmes multiples par occurrence dans fiche, recherche et tableau | 10 FOBA 1/2 + 3 FOBA 3 ; Stat.Com `010FOBA` ; `070F1.005` n'est jamais traité comme un Stat.Com ; tests 8 et 20 |
| F / G FOCO et CTA | Agrégation FOCO voulue ; CTA validé | Aucun domaine FOCO inventé, aucune rotation CTA modifiée | FOCO agrège 485 séances DPS/DAP/JSP ; 53 permanences CTA ; tests 9 et 13 |
| H OFSI/FOSPEC | 4 OFSI et autres familles présents | Contrôle uniquement | 4 OFSI, NAC, OP VPC, Antichute, BLS préservés ; test 10 |
| I PR | 5 PR 1.x sans date ; identité activité/occurrence/thème non visible | Les 6 PR 1.x de mars 2026 sont projetés individuellement au début 2027 ; thèmes 2026 attachés aux occurrences PR 1-4 ; PR-ABC/PAPR inchangés | 6 PR 1.x datés ; PR 2-4 = 6 chacun ; test 11 |
| J CMDT | EM/CODIR déjà présents après le lot précédent | Comparaison directe 2026/2027 ; aucune règle d'adjacence imposée sans preuve | 2026 : 9 EM et 9 CODIR dans le classeur, plus annonces explicites 2027 ; Programme : 11 EM et 10 CODIR ; test 12 |

La source 2026 montre 5 conduites Y1 entre avril et mai, dont quatre lundis consécutifs et un mercredi ultérieur, et 4 pour chacune des autres sections. La règle MOA cible quatre soirées par section : le moteur retient la série régulière des quatre premières Y1. C'est une **inférence de sélection**, pas une décision historique inscrite dans le classeur.

Pour DAP, aucun événement source ne fixe la date ou le format de la formation groupée. Le 5e exercice est écarté de la reconduction automatique conformément à la décision MOA, mais aucune formation groupée fictive n'est créée. Une préparation humaine existante sur ce 5e exercice reste visible et enregistrable ; une nouvelle 5e séance automatique reste refusée.

## Comparaison chiffrée 2027

| Mesure | Avant A-J | Après A-J | Base de comparaison |
| --- | ---: | ---: | --- |
| Séances actives de l'overlay | 886 | 829 | mesuré avant et après |
| Dates définies | 869 | 817 | mesuré avant et après |
| Dates à définir | 17 | 12 | mesuré avant et après |
| Activités affichées | 262 | 260 | ancien chiffre = cible statique du catalogue ; nouveau = modèles actifs, **non directement comparable** |
| Réalisations affichées | 612 | 805 | ancien chiffre = cible statique ; nouveau = occurrences actives, **non directement comparable** |
| Sessions affichées | 622 | 829 | ancien chiffre = cible statique ; nouveau = overlay actif, **non directement comparable** |
| Couverture OI affichée | 1413 | 1217 | ancien chiffre = cible statique ; nouveau = somme des OI actifs, **non directement comparable** |
| À traiter affiché | 504 | 704 | ancien chiffre = cible statique ; nouveau = lignes nécessitant placement/décision, **non directement comparable** |

La réduction nette de 57 séances vient de 28 conduites DPS, 1 conduite DAP et 4 exercices DAP en moins, ainsi que de 24 instructions remplacées par la cardinalité correcte ; la réconciliation du pipeline est testée sur 829. Les cinq dates à définir en moins sont les PR 1.x projetés depuis les dates de mars 2026. Aucun chiffre réel « avant » sur les modèles, occurrences, couverture OI et état à traiter de l'overlay n'avait été capturé ; le rapport ne confond donc pas la cible source statique et le Programme réellement affiché. Ces quatre comparaisons effectives restent non mesurables rétrospectivement sans snapshot initial.

## Quinze contrôles de recette

| # | Contrôle | Résultat automatique |
| --- | --- | --- |
| 1 | KICK-OFF | PASS : 17, 9 dates, 4 sites |
| 2 | PIONNIER | PASS : 10 demi-sections, dates/publics non dupliqués |
| 3 | ABC | PASS : 10 demi-sections + 5 sections, dates/publics non dupliqués |
| 4 | DAP | PASS sous réserve MOA : 4 exercices par section, cours avant exercices, dernier vendredi/samedi ; formation groupée non datée |
| 5 | Conduite DAP | PASS : 4 soirées par section, cond VL, 4 places chevauchées |
| 6 | AUTO | PASS : 2 occurrences par demi-section, 1 h chacune |
| 7 | FOBA | PASS : 13 conservés, FOBA 3 et thèmes distincts |
| 8 | OFSI | PASS : 4 séances |
| 9 | PR | PASS : 6 PR 1.x datés début 2027, séries 2-4 et thèmes |
| 10 | CMDT | PASS : comparaison 2026/2027, sans règle non démontrée |
| 11 | CTA | PASS : 53 permanences, dates et assignations inchangées |
| 12 | Stat.Com | PASS : codes source préservés sur DAP/FOBA/PR |
| 13 | Codes métier | PASS : identifiants source préservés ; aucune renumérotation DAP/FOBA/PR |
| 14 | Décisions humaines | PASS fixture : DAP 5 préparé visible et enregistrable ; lignes protégées non déplacées |
| 15 | Participations / assignations | PASS fixture : OI et publics protégés conservés ; aucune écriture d'événement ou de présence |

La recette **navigateur post-A-J n'a pas pu être effectuée**. Le serveur local `http://127.0.0.1:4391/scope.html` répond, mais le navigateur de l'application reste indisponible pour Codex (`No browser is available` après réactivation signalée par l'utilisateur et nouvelles tentatives). Les captures du lot précédent ne constituent pas une preuve UI des nouvelles règles A-J.

## MOA_REQUIRED et limites

1. **Formation groupée DAP** : fixer ses dates, son format, ses sections et sa relation exacte avec les quatre exercices. Aucune ligne 2026 ne permet de l'inventer.
2. **Sélection DAP Y1** : confirmer que la 5e soirée historique du 27.05.2026 doit être écartée au profit des quatre lundis réguliers projetés en 2027.
3. **Dernier exercice DAP** : confirmer que le créneau historique de l'exercice 5 doit devenir celui de l'exercice 4, sans autre ajustement de calendrier. Il respecte vendredi/samedi et la précédence des cours de cadres, mais la substitution exacte est une inférence.
4. **Recette UI** : rejouer dans le navigateur le Programme, les thèmes FOBA/PR et les créneaux DAP dès que la connexion est disponible. Non déclaré PASS ici.

Les écarts déjà identifiés dans le rapport précédent sur la formation groupée DAP et la structure `Formation groupée 1.1` restent hors correction A-J ; aucune valeur métier nouvelle n'a été décidée à leur place.

## Vérifications et Git

- `node scripts/scope-qv-2027-post-recette-a-j-tests.js` : **20/20 PASS**, avec lecture directe du classeur, service réel sur fixture SQL et contrôle d'absence d'écriture d'événement.
- `node scripts/scope-qv-2027-moa-recette-correctif-1-tests.js` : **33/33 PASS**.
- Suites ciblées : canonicalization **19/19**, conduites **13/13**, DPS/OI **12/12**, final-development **30/30**, rotation **20/20**, agenda-UX **9/9**, history-sections **28/28**, finalisation-local **41/41**, business-consolidation **39/39**, REPAIR-2 **11/11**. Total rejoué : **275/275 contrôles PASS**.
- `npm run check` : PASS. `git diff --check` : PASS. Batterie générale non relancée : hors périmètre du correctif et comporte des échecs antérieurs documentés dans le rapport précédent.
- Fichiers de code et de règles : `assets/css/scope.css`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `netlify/lib/_scope-cta-rules.js`, `netlify/lib/_scope-quo-vadis-service.js`, `netlify/lib/data/scope-qv-canonical-annual-rules.json`, `docs/business-rules/quo-vadis-canonical-rules.md`.
- Tests et analyse : `scripts/scope-qv-2027-moa-recette-analysis.js`, `scripts/scope-qv-2027-moa-recette-correctif-1-tests.js`, `scripts/scope-qv-2027-post-recette-a-j-tests.js`, `scripts/scope-qv-agenda-programme-ux-final-1-tests.js`, `scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js`, `scripts/scope-qv-conduites-canonical-closure-1-tests.js`, `scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js`, `scripts/scope-qv-final-development-1-tests.js`, `scripts/scope-qv-finalisation-local-tests.js`, `scripts/scope-qv-history-sections-ux-tests.js`, `scripts/scope-qv-section-rotation-closure-1-tests.js`.
- Rapports et captures : `docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md`, ce rapport, et les 12 PNG de `docs/captures/qv-2027-moa-recette-correctif-1/` (preuves du lot précédent, pas une recette A-J).
- Un seul commit local final est demandé par A-J ; son SHA et l'état Git final sont consignés dans la réponse de clôture. Aucun push, PR, merge, déploiement, migration ou modification de données de production.

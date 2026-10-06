# SCOPE - QUO VADIS - Couverture des instructions - Correctif MOA

## Décision et périmètre

La recette MOA sur l'instance fraîche `:4392` a invalidé la cardinalité historique appliquée aux seules activités `Instr demi-sct` et `Instr sct`. Chaque thème prévu pour un site doit couvrir toutes ses demi-sections actives et toutes ses sections actives. Une section Nxx suit Nxxa et Nxxb ; elle peut s'entrelacer avec les autres demi-sections du thème, comme en 2026 (précision MOA explicite). Le thème suivant attend la fin du précédent sur le même site. Les autres activités QUO VADIS ne prennent pas cette cardinalité.

Le classeur 2026 avait été ouvert et analysé directement dans le lot précédent (SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`) ; cette reprise ne refait pas le préflight. Il démontre le rythme hebdomadaire et les profils horaires : G1 KICK-OFF 10 demi-sections / 5 sections ; C1/B1 5 / 3 ; B2 5 / 2. Les lacunes de C1/B1/B2 et de B2 section ne bornent plus la couverture canonique. Les quatre séances explicites du 06.02.2027 restent en place.

## Cause et correction

Le référentiel `annualDpsInstructionVersions` fixait une occurrence KICK-OFF demi-section par site et deux sections B2 pour VARIA/FEU. Le générateur projetait ces quantités historiques, donc seulement 17 KICK-OFF, puis lançait ABC ou VARIA alors que le thème initial restait incomplet.

Le moteur calcule maintenant la cardinalité des instructions depuis les sections actives de l'année d'effet. Il conserve le rythme 2026 à l'intérieur de chaque thème, complète les publics CTA manquants et garde les identifiants des lignes déjà présentes. Les écarts de date historiques sont projetés à partir d'un ancrage commun du thème, ce qui évite les sauts de semaine autour du 29 février. Aucune conduite n'est créée du seul fait d'une instruction supplémentaire.

## Couverture 2027 exhaustive

`Att.` est calculé depuis la structure active, non codé par thème. `Obt.` est la réponse finale du générateur ; `PASS` inclut la rotation CTA, les deux demi-sections avant leur section correspondante, l'ordre des thèmes et l'exclusion des réserves.

| Site | Thème | Demi-sct att. | Demi-sct obt. | Sct att. | Sct obt. | Première séance | Dernière séance | Contrôle |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| G1 | KICK-OFF | 10 | 10 | 5 | 5 | 06.02 | 19.04 | PASS |
| G1 | ABC | 10 | 10 | 5 | 5 | 24.04 | 28.06 | PASS |
| G1 | VARIA | 10 | 10 | 5 | 5 | 03.07 | 06.09 | PASS |
| G1 | PIONNIER / CSU-nvb | 10 | 10 | 5 | 5 | 25.09 | 13.12 | PASS |
| C1 | KICK-OFF | 6 | 6 | 3 | 3 | 06.02 | 03.04 | PASS |
| C1 | VARIA | 6 | 6 | 3 | 3 | 01.05 | 03.07 | PASS |
| C1 | FEU | 6 | 6 | 3 | 3 | 21.08 | 13.11 | PASS |
| B1 | KICK-OFF | 6 | 6 | 3 | 3 | 06.02 | 03.04 | PASS |
| B1 | VARIA | 6 | 6 | 3 | 3 | 01.05 | 03.07 | PASS |
| B1 | FEU | 6 | 6 | 3 | 3 | 21.08 | 13.11 | PASS |
| B2 | KICK-OFF | 6 | 6 | 3 | 3 | 06.02 | 03.04 | PASS |
| B2 | VARIA | 6 | 6 | 3 | 3 | 01.05 | 03.07 | PASS |
| B2 | FEU | 6 | 6 | 3 | 3 | 21.08 | 13.11 | PASS |

Total : **94 instructions demi-section + 47 instructions section = 141**. KICK-OFF représente **28 + 14 = 42** lignes. Les 27 ajouts sont G1 KICK-OFF +9, C1 +5, B1 +5, B2 KICK-OFF +6 et B2 VARIA/FEU +1 chacun. Les quatre identifiants KICK-OFF explicites du 06.02 restent inchangés. Les 27 ajouts portent une preuve de cadence 2026 mais pas de fausse `historicalProposal` : le nombre de propositions historiques reste 637.

## Programme, Agenda et continuité

| Année | Instructions | Conduites DPS | Programme actif | Datées | À définir | Couverture |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2027 avant ce correctif | 114 | 8 | 781 | 769 | 12 | NOK KICK-OFF/B2 |
| 2027 corrigé | 141 | 8 | 808 | 796 | 12 | PASS 13/13 |
| 2028 corrigé | 141 | 8 | 202 | 202 | 0 | PASS 13/13 |
| 2029 corrigé | 141 | 8 | 202 | 202 | 0 | PASS 13/13 |

Programme et Agenda consomment les mêmes lignes canoniques ; les compteurs du tableau ont été relevés sur la seule instance `:4392` fraîchement redémarrée après les modifications. `GET /api/scope/quo-vadis/programmes/{2027,2028,2029}` répond 200 et expose respectivement `808/796/12`, `202/202/0`, `202/202/0` (total/datées/à définir), avec couverture `PASS` pour chaque année. La projection Agenda sur ce Programme conserve les mêmes compteurs. Le contrôle CTA de chaque instruction non-PIONNIER passe ; aucune réserve N06 G1 ou N04 C1/B1/B2 n'apparaît. Les 15 PIONNIER restent hors astreinte N et N-1, la dernière séance 2027 le 13.12. Les huit conduites DPS restent deux par site, `0152F7`, au plus une heure, immédiatement après leur vraie instruction demi-section, avec le public Nxx et `AUTO:1` / `AUTO:3`.

Une simulation de structure C1 réduite à N01/N02 effective en 2029 produit 4 demi-sections + 2 sections par thème C1, 132 instructions annuelles au total, sans changer les 141 de 2028. Les années repères 2030, 2035 et 2040 conservent 141 instructions, la couverture complète et PIONNIER compatible CTA ; 2040 vérifie explicitement le passage bissextile.

## Vérification et Git

Suites ciblées exécutées sur le code corrigé, toutes PASS :

- `node scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js` : 21/21 (dont préparation d'une nouvelle instruction sans écriture d'événement) ; `node scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js` : 45/45 ; `node scripts/scope-qv-2027-post-recette-a-j-tests.js` : 20/20 ; `node scripts/scope-qv-repair-2-tests.js` : 11/11.
- `node scripts/scope-qv-agenda-programme-ux-final-1-tests.js` : 9/9 ; `node scripts/scope-qv-business-consolidation-tests.js` : 39/39 ; `node scripts/scope-qv-conduites-canonical-closure-1-tests.js` : 13/13 ; `node scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` : 19/19.
- `node scripts/scope-qv-section-rotation-closure-1-tests.js` : 20/20 ; `node scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js` : 12/12 ; `node scripts/scope-qv-final-development-1-tests.js` : 30/30 ; `node scripts/scope-qv-2027-moa-recette-correctif-1-tests.js` : 33/33.
- `node scripts/scope-qv-history-sections-ux-tests.js` : 28/28 ; `node scripts/scope-qv-finalisation-local-tests.js` : 41/41 ; `node scripts/scope-quo-vadis-moa-consolidation-2-tests.js` : PASS sans compteur ; `node scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` : PASS sans compteur.
- `npm run check` : PASS ; `git diff --check` : PASS.

`npm run test:scope` s'arrête toujours sur `scope-login-visual-alignment-orion-1-tests.js` (attente antérieure d'une version CSS du login). `node scripts/scope-quo-vadis-calendar-reference-complete-2-tests.js` échoue toujours sur « période d'été absente du seed », attente antérieure du script. Aucun de ces tests hors correctif n'a été modifié ou présenté comme PASS.

Fichiers du présent correctif : `assets/js/scope-ui-logic.js`, `netlify/lib/_scope-quo-vadis-service.js`, `netlify/lib/data/scope-qv-canonical-annual-rules.json`, `docs/business-rules/quo-vadis-canonical-rules.md`, le présent rapport et la note de supersession dans `docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md`, `scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js`, ainsi que les quatre suites QV dont les assertions de cardinalité étaient figées : `scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js`, `scripts/scope-qv-2027-post-recette-a-j-tests.js`, `scripts/scope-qv-agenda-programme-ux-final-1-tests.js`, `scripts/scope-qv-history-sections-ux-tests.js`. Les changements des lots précédents et les 12 fichiers C19/PDF préexistants restent préservés.

La recette navigateur MOA est volontairement arrêtée pendant ce correctif, conformément au nouveau prompt ; aucun résultat visuel nouveau n'est revendiqué. Aucune question métier ne reste ouverte sur l'entrelacement demi-section/section après la réponse MOA. Branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD avant/après `a186bbee530cb40217034b2d27d5d08641703305` ; worktree non commité. Aucun commit, push, PR, merge, déploiement ou changement de données de production.

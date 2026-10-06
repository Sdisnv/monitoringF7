# QUO VADIS 2027 - Instructions, cycle et visibilité KICK-OFF - FINAL-3

## A. Préflight Git et source

- Branche : `scope-qv-canonical-rules-checkpoint-20261002` ; HEAD avant : `a186bbee530cb40217034b2d27d5d08641703305`.
- Worktree déjà modifié avant FINAL-3 : corrections QV des lots précédents ; quatre documents C19 et huit PDF préexistants. Aucun reset, checkout, stash ou écrasement de ces fichiers.
- Rapports REPAIR-1, REPAIR-2 et POST-RECETTE A-J relus intégralement. Leurs anciens totaux pré-REPAIR-2 ne remplacent pas les 808 lignes actuelles.
- Classeur historique 2026 accessible directement ; SHA-256 vérifié : `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`, identique à l'audit antérieur. Le présent lot ne reconstruit pas l'analyse du classeur.

## B. Diagnostic du match caché KICK-OFF

La recherche annuelle indexe `row.eventLabel` dans `qvProgrammeFilteredRows`. Les sept activités hors instruction ont `KICK-OFF` dans ce champ, mais affichent `eventDisplayLabel` / `activityLabel` sans ce contexte et n'ont pas de `row.themes`. Pour `Formation permanents`, `projectionEvidence.theme = KICK-OFF` confirme en plus le thème historique ; **la cause exacte du match de recherche reste `eventLabel`**. Le total est 49 : 42 instructions et sept autres activités.

## C. Modification réalisée

`qvProgrammeVisibleThemes` projette uniquement les données canoniques déjà présentes : thèmes explicites, `projectionEvidence.theme`, et suffixe explicite `KICK-OFF` du `eventLabel`. La colonne Activité existante du Programme et la vue mensuelle utilisent son sous-libellé discret ; la fiche affiche `Thème / cycle`. L'Agenda annuel conserve ses cases compactes, mais leur libellé accessible expose le thème et le clic mène à la vue mensuelle. Aucun nom d'activité, date, public ou mécanisme de recherche n'a été réécrit ; aucune nouvelle colonne ni badge.

## D. Sept activités non-instruction KICK-OFF

| Activité (id) | Date et heure | Domaine | Cause exacte du match KICK-OFF | Champ source |
| --- | --- | --- | --- | --- |
| Séance personnel DPS (`qv-source-871`) | 20.01.2027 18:30 | DPS | `Séance personnel DPS · Kick-off` | `eventLabel` |
| Séance personnel DPS (`qv-source-872`) | 20.01.2027 19:00 | DPS | `Séance personnel DPS · Kick-off` | `eventLabel` |
| Séance personnel DPS (`qv-source-873`) | 20.01.2027 19:00 | DPS | `Séance personnel DPS · Kick-off` | `eventLabel` |
| Séance personnel DPS (`qv-source-874`) | 20.01.2027 19:00 | DPS | `Séance personnel DPS · Kick-off` | `eventLabel` |
| Séance cadres JSP (`qv-source-876`) | 21.01.2027 18:00 | JSP | `Séance cadres JSP · Kick-off` | `eventLabel` |
| Séance personnel DAP (`qv-source-888`) | 27.01.2027 19:00 | DAP | `Séance personnel DAP · Kick-off` | `eventLabel` |
| Formation permanents (`QV26-FORMATION-PERMANENTS-4F48A9D0:O1:S1`) | 12.03.2027 08:00 | DPS | `Formation permanents G1 — KICK-OFF` ; thème historique corroboré | `eventLabel` ; `projectionEvidence.theme` |

## E. Couverture complète par site et thème

Chaque ligne `demi-sct / sct` est un compte contrôlé sur le programme canonique actif, identique en 2027, 2028 et 2029. Aucun N06 G1 ni N04 C1/B1/B2.

| Site | Thème | 2027 | 2028 | 2029 |
| --- | --- | --- | --- | --- |
| G1 | KICK-OFF | 10 / 5 | 10 / 5 | 10 / 5 |
| G1 | ABC | 10 / 5 | 10 / 5 | 10 / 5 |
| G1 | VARIA | 10 / 5 | 10 / 5 | 10 / 5 |
| G1 | PIONNIER | 10 / 5 | 10 / 5 | 10 / 5 |
| C1 | KICK-OFF | 6 / 3 | 6 / 3 | 6 / 3 |
| C1 | VARIA | 6 / 3 | 6 / 3 | 6 / 3 |
| C1 | FEU | 6 / 3 | 6 / 3 | 6 / 3 |
| B1 | KICK-OFF | 6 / 3 | 6 / 3 | 6 / 3 |
| B1 | VARIA | 6 / 3 | 6 / 3 | 6 / 3 |
| B1 | FEU | 6 / 3 | 6 / 3 | 6 / 3 |
| B2 | KICK-OFF | 6 / 3 | 6 / 3 | 6 / 3 |
| B2 | VARIA | 6 / 3 | 6 / 3 | 6 / 3 |
| B2 | FEU | 6 / 3 | 6 / 3 | 6 / 3 |

## F. Contrôle chronologique Nxxa/Nxxb vers Nxx

`node scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js --timeline` produit les **42 séquences chronologiques** (14 sections actives x 3 années) avec date, site, public, thème et type. Pour chacun des 13 couples site/thème par an : toutes les demi-sections et sections attendues sont uniques ; chaque Nxx commence après ses propres Nxxa et Nxxb ; les thèmes se succèdent dans l'ordre annuel de la règle ; aucune instruction destinée au même public ne se chevauche. La comparaison est faite sur les horodatages, pas sur un simple ordre d'affichage. Aucun écart constaté, aucune date corrigée pour le test.

## G. CTA

Les publics non-PIONNIER sont comparés à `instructionPublicForDate`. Les 15 PIONNIER G1 passent `qvPionnierCtaCheck` (hors astreinte N et N-1). Les passages du 31 décembre 2027/2028 à la première semaine 2028/2029 avancent chacun d'un cran dans les cycles CTA G1 et C1/B1/B2 ; pas de remise à zéro annuelle. Réserves exclues.

## H. Conduite

2027, 2028 et 2029 : huit conduites DPS `0152F7`, soit deux par site G1/C1/B1/B2. `qvConduiteCoherenceControl` passe pour chaque année. Aucun retour aux 56 conduites.

## I. Résultat 2027

808 lignes actives, 796 datées, 12 à définir ; 141 instructions (42 KICK-OFF, 42 VARIA, 15 ABC, 27 FEU, 15 PIONNIER). Le contrôle annuel passe 13/13 couples. Fenêtres : G1 KICK-OFF 06.02-19.04, ABC 24.04-28.06, VARIA 03.07-06.09, PIONNIER 25.09-13.12 ; C1/B1/B2 KICK-OFF 06.02-03.04, VARIA 01.05-03.07, FEU 21.08-13.11. Recherche KICK-OFF : 49 = 42 + 7. L'API de l'instance fraîche `:4393` a répondu HTTP 200 avec 808/796/12 et couverture 13/13 PASS.

## J. Résultat 2028

202 lignes actives datées, 141 instructions ; structure annuelle identique. G1 : KICK-OFF 12.02-17.04, ABC 22.04-26.06, VARIA 01.07-04.09, PIONNIER 23.09-11.12. C1/B1/B2 : KICK-OFF 12.02-08.04, VARIA 29.04-01.07, FEU 19.08-11.11. Couverture, CTA, prérequis et collisions PASS.

## K. Résultat 2029 et mutation

202 lignes actives datées, 141 instructions ; structure annuelle identique. G1 : KICK-OFF 17.02-23.04, ABC 28.04-02.07, VARIA 07.07-10.09, PIONNIER 29.09-17.12. C1/B1/B2 : KICK-OFF 17.02-14.04, VARIA 05.05-07.07, FEU 25.08-17.11. Couverture, CTA, prérequis et collisions PASS. Mutation **simulée seulement** : C1 réduit à N01/N02 dès 2029 donne 4 demi-sections + 2 sections par thème C1 et 132 instructions au total, sans changer la configuration réelle ni 2028.

## L. Programme vers Agenda

`qvAgendaProjection` et `qvBuildMonth` lisent `canonicalProgramme.rows` pour l'année du Programme ; il n'existe pas de seconde génération d'instructions dans l'Agenda. En 2027, la projection explique les mêmes 808 lignes, 796 dans le calendrier et 12 sans date. Les cases annuelles restent compactes et leur libellé accessible reprend le contexte de thème ; le détail est dans Programme mensuel et fiche.

## M. Tests exacts

- `node scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js` : 12/12 PASS, dont recherche réelle du moteur UI (49 lignes) et rendu HTML du tableau, de la vue mensuelle, de la fiche et de l'Agenda ; variante `--timeline` : 12/12 PASS, 42 séquences produites.
- `node scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js` : 21/21 ; `scope-qv-instructions-rotation-conduite-repair-1-tests.js` : 45/45 ; `scope-qv-2027-post-recette-a-j-tests.js` : 20/20 ; `scope-qv-repair-2-tests.js` : 11/11, tous PASS.
- `node scripts/scope-qv-agenda-programme-ux-final-1-tests.js` : 9/9 ; `scope-qv-business-consolidation-tests.js` : 39/39 ; `scope-qv-conduites-canonical-closure-1-tests.js` : 13/13 ; `scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` : 19/19, tous PASS.
- `node scripts/scope-qv-section-rotation-closure-1-tests.js` : 20/20 ; `scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js` : 12/12 ; `scope-qv-final-development-1-tests.js` : 30/30 ; `scope-qv-2027-moa-recette-correctif-1-tests.js` : 33/33, tous PASS.
- `node scripts/scope-qv-history-sections-ux-tests.js` : 28/28 ; `scope-qv-finalisation-local-tests.js` : 41/41 ; `scope-quo-vadis-moa-consolidation-2-tests.js` : PASS sans compteur ; `scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` : PASS sans compteur.
- `npm run check` : PASS.

## N. Tests globaux historiquement rouges

- `npm run test:scope` : échec reproduit dans `scope-login-visual-alignment-orion-1-tests.js`, assertion 06. Le test accepte quatre anciennes valeurs de `assets/css/scope.css?v=...`, tandis que `scope.html` charge `scope-qv-finalisation-local`. Il contrôle un identifiant de cache ancien, pas le rendu CSS courant ; le test est obsolète pour cette assertion. La suite globale s'arrête là, donc **pas de PASS global**.
- `node scripts/scope-quo-vadis-calendar-reference-complete-2-tests.js` : échec reproduit « période d'été absente du seed ». Son parseur cherche littéralement `const vacations = [` dans le service ; le service appelle désormais `ctaRules.vaudSchoolVacations(year)`. Cette source retourne 03.07-22.08.2027, et `qvExpandCalendarDays` couvre le début, le 01.08 et la fin. L'attente de forme du seed est obsolète ; aucune preuve de régression fonctionnelle sur ce point. Ces deux tests restent inchangés.

## O. Instance et recette MOA

Instance locale isolée **fraîche**, démarrée après le correctif sur [http://127.0.0.1:4393/scope.html#/quo-vadis/programme](http://127.0.0.1:4393/scope.html#/quo-vadis/programme). Le serveur annonce désormais le bon port et `/scope.html` répond HTTP 200. Les rendus HTML ont été testés automatiquement, mais la recette navigateur Codex est **non effectuée** : le navigateur intégré ne présente aucune instance connectée ; aucun PASS visuel n'est revendiqué.

Recherches à effectuer par la MOA dans Programme 2027 : `KICK-OFF` (49 résultats, 42 instructions + 7 autres activités dont le sous-libellé doit montrer Kick-off), `sct - varia`, `sct - feu`, `sct - abc`, `sct - pionnier`. Vérifier une des sept fiches, sa vue mensuelle et le lien depuis l'Agenda annuel. STOP avant commit en attente de cette recette.

## P. Fichiers modifiés par FINAL-3

- `assets/js/scope-ui-logic.js` : projection d'affichage du thème existant.
- `assets/js/scope-ui.js` : tableau, vue mensuelle, fiche et libellé accessible de l'Agenda.
- `scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js` : nouveau contrôle ciblé et chronologies.
- `scripts/scope-qv-local-recipe-server.js` : annonce du port réellement écouté.
- `docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md` : présent rapport.

Les autres modifications QV étaient déjà en cours avant FINAL-3 ; les documents C19 et PDF préexistants sont laissés intacts.

## Q. Diff

`git diff --check` : PASS. Aucun commit, push, PR, merge, déploiement, migration ou changement de données de production.

## R. Verdict

Contrôles métier ciblés PASS et instance de recette disponible. `MOA_REQUIRED` : recette visuelle KICK-OFF et autres recherches sur l'instance `:4393`, puis décision sur les deux tests globaux obsolètes avant tout commit. Le lot s'arrête ici conformément à la consigne.

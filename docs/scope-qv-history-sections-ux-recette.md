# SCOPE QUO VADIS : historique, recurrence, sections et UX

Recette locale du 02.10.2026. Verdict : **NOK partiel**, et non chantier termine. Les corrections et les controles locaux passent, mais une couverture CTA heritee reste contradictoire au passage du 01.01.2026. Arbitrage metier demande, sans correction speculative.

## 1. PREFLIGHT GIT / GITHUB

- Branche verifiee : `codex/qv-recette-programme-cta-edit-3`.
- HEAD, origin/main et GitHub main verifies avant les modifications puis en fin de recette : `55667a79012e976d54f5c90cc183628f8897cec9`.
- GitHub verifie par `git ls-remote origin refs/heads/main`, sans fetch ni modification de ref.
- Worktree deja dirty : 11 fichiers suivis modifies et plusieurs fichiers non suivis, listes exactement en section 9.
- Diff initial conserve dans `/private/tmp/qv-historique-sections-preflight.diff`. Aucun changement preexistant annule.

## 2. DIAGNOSTIC

L'agenda 2026 reutilisait des references/projections du Programme, sans population explicite de vrais evenements SCOPE. La correction expose les evenements existants via la lecture SQL deja utilisee par le service, puis reutilise la fiche SCOPE et sa route existante. Aucune seconde fiche historique n'est creee.

La rotation CTA fonctionnait avec un ancrage continu au 01.01.2027, mais l'agenda ne projetait pas correctement toutes les annees. Le calcul retrospectif et prospectif conserve cet ancrage, les cycles existants et les bornes operationnelles, y compris les occurrences chevauchant le changement d'annee. Aucun programme 2027 complet n'est copie en 2028.

Le calendrier scolaire etait principalement lie a 2027. Les periodes officielles de chaque annee sont maintenant integrees au meme calendrier, avec source et date de fin. Le calcul des jours feries existant est reutilise.

Les codes Nxx existaient dans les donnees et les affectations CTA, mais n'etaient pas tous accessibles dans le catalogue de selection. Le groupe Sections DPS les rend selectionnables et enregistrables comme codes atomiques, sans nouvelles cibles UUID ni migration.

Une reference historique reutilisee par plusieurs occurrences ne demontre pas la section propre a chacune. Les 9 occurrences KICK-OFF issues de la ligne 172 restent donc ambigues. Les affectations deja presentes ne sont pas remplacees.

Un controle supplementaire des bornes a revele une contradiction du moteur existant : les couvertures des 1er et 2 janvier 2026 se chevauchent pendant 12 heures avec des groupes differents. Ce point reste NOK, detaille en section 13.

## 3. AGENDA 2026

Classeur relu directement avec openpyxl en lecture seule, puis extrait avec le parseur XLSX existant du projet :

`/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx`

Feuille `QUO VADIS '26`, **919 lignes metier**. SHA-256 : `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`. Le classeur n'a pas ete modifie. L'extraction conserve les numeros de lignes, dates, horaires, titres, codes, lieux, personnel concerne, DOMAINE F7, SOUS-DOMAINE, QUI, responsables, salles, Stat.Com et marqueurs OI.

Population SCOPE verifiee par transaction PostgreSQL `REPEATABLE READ READ ONLY`, terminee par ROLLBACK : **121 evenements 2026 visibles**. Aucun evenement cache n'est expose. Aucune migration ni ecriture SQL de recette.

Correspondances exigeant une date et un code identiques, ou un titre, un horaire et un Stat.Com concordants, avec candidat unique : **0 correspondance demontree**, **919 references Excel distinctes**. L'absence d'horaire dans certains imports SCOPE empeche notamment une correspondance stricte, meme pour un titre identique. Les references sont conservees sans inventer de presences ni d'identifiants.

Un clic de jour reste en 2026 et liste les vrais evenements, les references Excel et les permanences calculees. Les vrais evenements ouvrent `#/exercices/<evenement_id>`, route SCOPE existante. Un horaire absent reste "Horaire non renseigne".

Recette sur trois dossiers reels copies en lecture seule dans la fixture privee : JSP du 12 janvier, PR du 3 mars, DAP du 12 mars. La fiche SCOPE expose les presences, statuts, motifs et encadrement enregistres. Les valeurs relues sont respectivement 14/14, 14/15 et 16/18 presents ; motifs Professionnel et Accident/Maladie visibles. Aucune donnee individuelle de participation n'est ajoutee au depot.

La fixture locale contient la liste des 121 evenements mais seulement ces trois fiches detaillees. Les autres vrais liens sont construits avec leurs identifiants reels ; leurs details ne sont pas tous disponibles dans cette recette isolee.

**53 occurrences CTA couvrant 2026**, avec prise en compte de la permanence commençant le 31.12.2026 a 18:00. Aucun evenement SCOPE de permanence 2026 n'a ete trouve dans la population lue ; les occurrences sont donc explicitement calculees et non presentees comme historique enregistre.

## 4. AGENDA 2027

Une grille de 12 mois, navigation 2026 / 2027 / 2028 conservee. Un clic sur le 05.01.2027 ouvre le Programme mensuel sur cette journee.

Compte de reference conserve : **622 seances, 488 datees, 363 propositions historiques, 134 sans date**, dont 125 sans periode et 9 avec mois propose. Les 53 permanences du catalogue 2027 restent presentes. Les couleurs d'etat et les reperes calendaires existants restent disponibles.

## 5. AGENDA 2028

**53 permanences couvrant l'annee** : 52 nouvelles occurrences hebdomadaires et le report de celle du 31.12.2027. Premiere borne controlee : 31.12.2027 a 18:00 ; premiere nouvelle occurrence : 07.01.2028 a 18:00 ; derniere nouvelle occurrence : 29.12.2028 a 18:00.

Continuite verifiee automatiquement et dans le detail navigateur :

| Vendredi de rotation | G1 | C1 / B1 / B2 |
| --- | --- | --- |
| 31.12.2027 | N02b | N03a |
| 07.01.2028 | N01b | N02a |

L'ancrage n'est pas reinitialise en janvier. Le detail 2028 ne contient ni faux lien d'evenement publie ni copie des propositions du Programme 2027.

Les 9 jours feries annuels et les 7 periodes scolaires intersectant chaque annee sont presentes. Sources officielles consultees : [Vaud 2026](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2026), [Vaud 2027](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2027), [Vaud 2028](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2028).

## 6. SECTIONS DPS

Groupe ajoute au catalogue existant : `N01`, `N01a`, `N01b`, `N02`, `N02a`, `N02b`, `N03`, `N03a`, `N03b`, `N04`, `N04a`, `N04b`, `N05`, `N05a`, `N05b`, `N06`.

Le service utilise ce meme catalogue pour valider la sauvegarde. Codes atomiques conserves dans `publicCodes`, comme les autres publics existants.

- **0 nouvelle affectation automatique** sur le Programme actuel.
- **22 affectations DPS existantes conservees**, dont FEU N01b et VARIA N02a.
- **24 lignes ambigues** : 9 partagent la meme reference KICK-OFF ligne 172 ; 15 n'ont pas de preuve individuelle suffisante.
- Exemple de regle demontree teste : ligne Excel 11, G1, personnel "Section 5A" => N05a, seulement lorsque la reference est propre a la seance.
- Exemple ambigu : ligne 13, B2, personnel mentionnant seulement la permanence B2 => aucune section deduite.
- Un arbitrage humain enregistre est applique apres l'enrichissement de reference et n'est pas ecrase.

Les libelles de la source canonique 2027 ne sont pas reecrits. Les autres domaines, dont les instructions DAP, ne sont pas automatiquement assimilés aux sections DPS.

## 7. FICHE / UX

Checkbox natives de formulaire : apparence carree 14 x 14 px, rayon 0, focus visible et repli natif en couleurs forcees. Pas de nouveau gros controle ni de capsule.

Zebrage applique a une option sur deux, et non aux groupes : transparent / `rgb(244, 245, 246)` / transparent / gris. Focus et survol lisibles. Espace mesure entre fieldsets : **26 px**.

Mesures navigateur desktop : champs Date / Debut / Fin sur une meme ligne et a la meme hauteur, environ **36 px** ; idem Lieu / Salle / Responsable. Selecteurs OI et Public cible : meme depart, hauteurs **280 px**, largeurs equivalentes, resumes alignes sous les listes.

Controles a **960, 800 et 390 px CSS reels**, avec captures. Aucun debordement horizontal global. Sur mobile, les groupes passent en colonne et les champs suivent la grille responsive existante. Le tableau Programme conserve son defilement horizontal local, sans elargir la page.

Enregistrement navigateur d'un public N03a, rechargement, puis restauration du public initial : persistance constatee. Arbitrage ouvre la route existante. Annuler pour l'annee et Supprimer de la production sont executes localement, cette derniere action apres confirmation de la modale ; les decisions sont stockees uniquement dans la fixture. L'effet sur une future production reelle n'est pas teste en production.

## 8. PROGRAMME

**622 / 488 / 363 / 134** conserves. Compteurs de niveaux observes : 262 activites, 612 realisations, 622 sessions, couverture OI 1413.

Recherche `tp9` : **30 resultats**, deux pages de 20 puis 10 lignes. Toutes les lignes ont OI G1 et public cond TP9 ; aucun cond PL. Fiche TP9000 controlee avec les memes valeurs.

Recherche `instr` puis `demi-sct` : N02a / N05a existants visibles, KICK-OFF sans section explicite reste A definir. Fiches instruction, TP9000 et evenement standard inspectees. L'etat carre + texte et les colonnes du tableau existant sont conserves.

## 9. FICHIERS MODIFIES

Chemins ci-dessous relatifs au depot `/Users/thierrygrunig/Projects/Monitoring F7`.

### A. Modifications suivies preexistantes

| Fichier | Present lot |
| --- | --- |
| `assets/css/scope.css` | Checkbox, zebrage, espace 26 px |
| `assets/js/scope-api.js` | Aucun ajout : diff initial identique |
| `assets/js/scope-ui-logic.js` | Catalogue Sections DPS, preuve de section, populations historiques |
| `assets/js/scope-ui.js` | Agenda historique, navigation et permanences des autres annees |
| `netlify/functions/scope.js` | Aucun ajout : diff initial identique |
| `netlify/lib/_scope-cta-rules.js` | Bornes annuelles, periodes scolaires et metadonnees de projection |
| `netlify/lib/_scope-quo-vadis-service.js` | Integration de l'historique, sections et calendriers annuels |
| `netlify/lib/data/scope-qv-programme-2027.json` | Aucun ajout : diff initial identique |
| `scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` | Assertion navigation adaptee |
| `scripts/scope-quo-vadis-calendar-vd-final-4-tests.js` | Aucun ajout : diff initial identique |
| `scripts/scope-qv-finalisation-local-tests.js` | Assertions catalogue et preuves feries adaptees |

### B. Fichiers non suivis deja presents

Touches par ce lot :

- `scripts/scope-qv-agenda-programme-ux-final-1-tests.js`
- `scripts/scope-qv-local-fixture.js`
- `scripts/scope-qv-local-recipe-server.js`

Laisses en place : `deno.lock`, `docs/scope-qv-agenda-programme-ux-final-1-recette.md` et les captures precedentes sous `docs/captures/`.

### C. Nouveaux fichiers du lot

- `netlify/lib/data/scope-qv-history-2026.json`
- `scripts/scope-qv-extract-history-2026.js`
- `scripts/scope-qv-history-sections-ux-tests.js`
- `docs/scope-qv-history-sections-ux-recette.md`
- `docs/captures/qv-history-sections-ux/01-fiche-tp9000.png`
- `docs/captures/qv-history-sections-ux/02-fiche-960.png`
- `docs/captures/qv-history-sections-ux/03-fiche-800.png`
- `docs/captures/qv-history-sections-ux/04-fiche-390.png`
- `docs/captures/qv-history-sections-ux/05-agenda-2027.png`
- `docs/captures/qv-history-sections-ux/06-agenda-2028.png`
- `docs/captures/qv-history-sections-ux/07-cta-2028-detail.png`
- `docs/captures/qv-history-sections-ux/08-agenda-2026.png`
- `docs/captures/qv-history-sections-ux/09-lifecycle-local.png`
- `docs/captures/qv-history-sections-ux/10-fiche-standard.png`
- `docs/captures/qv-history-sections-ux/11-programme-tp9.png`

Hors depot, preuves privees et fixture de recette : `/private/tmp/qv-history-readonly-probe.js`, `/private/tmp/qv-history-readonly-snapshot.json`, `/private/tmp/scope-qv-final-1-preparations.json`. Ces fichiers ne sont pas des donnees a publier.

## 10. TESTS

| Commande | Resultat |
| --- | --- |
| `node scripts/scope-qv-extract-history-2026.js` | 919 lignes, lecture directe du classeur |
| `node scripts/scope-qv-history-sections-ux-tests.js` | 28/28 PASS |
| `node scripts/scope-qv-finalisation-local-tests.js` | 31/31 PASS |
| `node scripts/scope-qv-agenda-programme-ux-final-1-tests.js` | 8/8 PASS |
| `node scripts/scope-quo-vadis-calendar-vd-final-4-tests.js` | PASS |
| `node scripts/scope-quo-vadis-core-1-tests.js` | ok |
| `node scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` | ok |
| `node --check` sur les 11 JS touches du lot | PASS, code retour 0 |
| `npm run check` | PASS, controles locaux termines |
| `git diff --check` | PASS, aucune sortie, code retour 0 |

Les tests PASS prouvent les assertions couvertes, pas une validation metier du chevauchement CTA restant. Le refus RBAC sans `references:manage` est teste ; aucun elargissement de permissions n'est effectue.

JS verifies individuellement : `assets/js/scope-ui.js`, `assets/js/scope-ui-logic.js`, `netlify/lib/_scope-cta-rules.js`, `netlify/lib/_scope-quo-vadis-service.js`, `scripts/scope-qv-extract-history-2026.js`, `scripts/scope-qv-history-sections-ux-tests.js`, `scripts/scope-qv-local-fixture.js`, `scripts/scope-qv-local-recipe-server.js`, `scripts/scope-qv-finalisation-local-tests.js`, `scripts/scope-qv-agenda-programme-ux-final-1-tests.js`, `scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js`.

## 11. RECETTE NAVIGATEUR

| Scenario | Verdict | Preuve / limite |
| --- | --- | --- |
| Agenda 2026 : grille, feries, vacances, permanences | PASS AVEC RESERVE | 12 mois, 53 CTA ; couverture debut janvier non validee |
| Agenda 2026 : plusieurs jours et vrais dossiers | PASS AVEC RESERVE | JSP, PR, DAP et motifs consultes ; 3 details disponibles localement sur 121 liens |
| Couverture CTA 01 / 02.01.2026 | NOK | Chevauchement de 12 heures, arbitrage demande |
| Agenda 2027 | PASS | Compteurs, propositions et clic vers Programme mensuel |
| Agenda 2028 | PASS | 53 CTA visibles ; clics 1er et 7 janvier, cycle continu |
| Programme TP9 / pagination | PASS | 30 resultats, 20 + 10, G1 + cond TP9 uniquement |
| Programme instructions | PASS AVEC RESERVE | Publics existants visibles ; 24 cas sans affectation inventee |
| Fiche / enregistrement | PASS | N03a relu apres reload ; N02a restaure |
| Arbitrage / Annuler / Supprimer | PASS local | Route, decision annuelle et confirmation future ; aucune production reelle executee |
| Fiche 960 / 800 / 390 px | PASS | Captures et absence de debordement global |
| Refus RBAC signale par la MOA | NON REPRODUIT | Protection conservee ; scenario reel non disponible |

Les captures de ce lot sont celles listees en section 9. Aucun comparatif pixel a pixel avec des captures MOA absentes de cette piece jointe n'est revendique.

## 12. URLS LOCALES

- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?annee=2026
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?annee=2027
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?annee=2028
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?jour=2028-01-01&mois=2028-01&annee=2028
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?jour=2028-01-07&mois=2028-01&annee=2028
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme?jour=2027-01-05&mois=2027-01&mode=mensuelle
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme/QV26-INSTR-DEMI-SCT-VARIA-D51E6F19%3AO1%3AS1
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme/QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-2-5D809A90%3AO3%3AS1
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme/qv-source-887
- http://127.0.0.1:4391/scope.html#/quo-vadis/a-arbitrer
- http://127.0.0.1:4391/scope.html#/exercices/c6f283f9-f773-4591-a019-cb9d2869b0f4
- http://127.0.0.1:4391/scope.html#/exercices/dbc79365-20a4-49a7-acc5-f2609f999b7b
- http://127.0.0.1:4391/scope.html#/exercices/7d7e71a2-fc9b-4947-8047-d99da4a20a4f

Serveur lie a 127.0.0.1, sans connexion de production. Les ecritures de recette aboutissent exclusivement au fichier temporaire local. Les endpoints hors fixture renvoient une erreur explicite plutot que des donnees inventees.

## 13. POINTS RESTANTS

1. **Couverture CTA de debut janvier 2026, NOK** : 01.01 couvert du 31.12.2025 18:00 au 02.01.2026 06:00, G1 N02a et autres N03b ; 02.01 couvert du 01.01.2026 18:00 au 05.01.2026 06:00, G1 N01a et autres N02b. Le chevauchement 01.01 18:00 -> 02.01 06:00 exige une regle de releve metier. Question transmise a la MOA ; moteur non modifie arbitrairement.
2. **24 instructions DPS ambigues** : aucune preuve suffisante pour attribuer une section propre a chacune. Les 22 affectations existantes sont conservees. Pas de faux enrichissement pour faire augmenter un compteur.
3. **Rapprochement historique** : 121 evenements accessibles et 919 references distinctes ; aucun rapprochement ne satisfait la preuve stricte disponible. Les trois details locaux ne constituent pas une recette exhaustive des 121 dossiers.
4. **RBAC MOA** : refus observe par la MOA non reproduit avec son scenario reel. Test du gestionnaire local et refus du profil sans permission passent. Aucune permission elargie.

Le lot ne doit pas etre annonce termine tant que le premier point reste NOK.

## 14. GIT / GITHUB FINAL

Branche `codex/qv-recette-programme-cta-edit-3`. HEAD, origin/main et GitHub main toujours `55667a79012e976d54f5c90cc183628f8897cec9`. Worktree dirty, modifications preexistantes preservees et nouveaux fichiers non stages.

COMMIT : AUCUN

PUSH : AUCUN

PR : AUCUNE

MERGE : AUCUN

DEPLOIEMENT : AUCUN

PRODUCTION : INCHANGEE

MIGRATION PRODUCTION : AUCUNE

ECRITURE DE RECETTE EN PRODUCTION : AUCUNE

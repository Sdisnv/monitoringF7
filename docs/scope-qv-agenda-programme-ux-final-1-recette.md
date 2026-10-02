# QV-AGENDA-PROGRAMME-UX-FINAL-1

Statut global : NOK pour cloture. Les corrections Agenda/Programme/Fiche sont verifiees localement. La cause du refus RBAC rapporte par la MOA n'est pas reproduite dans cette version et ne peut pas etre annoncee comme corrigee.

## 1. PREFLIGHT GIT / GITHUB

- Repertoire : /Users/thierrygrunig/Projects/Monitoring F7.
- Branche : codex/qv-recette-programme-cta-edit-3.
- HEAD et origin/main : 55667a79012e976d54f5c90cc183628f8897cec9.
- GitHub main confirme en lecture seule par git ls-remote origin refs/heads/main.
- Les cinq derniers commits : 55667a7, e79aab8, 2a989a6, 958c602, c28bd72.
- Worktree initial : huit fichiers suivis modifies, deno.lock et docs/captures/ non suivis.
- Les differences presentes avant ce lot ont ete preservees. Le JSON d'enrichissement 2027, scope-api.js et netlify/functions/scope.js n'ont pas ete edites par ce lot.
- Aucun commit, push, PR, merge, deploiement ou migration de production.

## 2. DIAGNOSTIC

| Defaut | Cause identifiee | Fichier et fonction |
| --- | --- | --- |
| Trois annees empilees | Trois appels de grille annuelle et trois sections completes | assets/js/scope-ui.js, renderQuoVadisAgendaAnnuel |
| Historique ouvrant Programme 2027/2026 | Tous les liens de mois et jours visaient Programme sans distinguer l'annee | assets/js/scope-ui.js, qvRenderMiniMonth |
| 2028 vide | qvBuildMonth consommait uniquement canonicalProgramme 2027 | assets/js/scope-ui.js, qvBuildMonth ; netlify/lib/_scope-quo-vadis-service.js, listProgramme |
| Cycle CTA different de la demande | OTHER_CYCLE commencait par N03a et ne representait pas l'ancrage reserve N04b | netlify/lib/_scope-cta-rules.js, assignmentsForFriday |
| 134 et 125 | 134 sans date, dont 9 avec mois propose et 125 sans date ni mois | assets/js/scope-ui.js, qvAgendaProjection, qvAgendaProposedPool |
| Etat comprime | Texte long dans colonne fixe | assets/css/scope.css, cellule 11 et scope-state-label |
| Fiche chargee | Sections successives, cadres repetes, trois blocs de decision | assets/js/scope-ui.js, renderQuoVadisProgrammeFiche |
| Groupes sans respiration | optgroup natifs dont le rendu ne garantit pas l'espacement CSS | assets/js/scope-ui.js, qvProgrammeOiOptions, qvProgrammePublicGroups |
| Apercus ressemblant a des inputs | Bordure, fond et padding similaires aux champs | assets/css/scope.css, qv-programme-select-summary |
| Refus Autre lieu | Non reproduit sur le vrai handler local. Le precedent proxy de recette refuse TOUTES les ecritures avec HTTP 403/local_recipe_read_only ; friendlyError traduit tout HTTP 403 en refus de profil | /private/tmp/scope-local-recipe-server.js ; assets/js/scope-ui-logic.js, friendlyError |

La derniere ligne explique un faux diagnostic RBAC possible dans la recette precedente. Elle ne prouve pas la cause du scenario MOA ou seul Autre lieu echoue. Aucune correction speculative des permissions n'a ete introduite.

## 3. AGENDA

- Selection directe 2026/2027/2028, 2027 par defaut, une seule grille de 12 mois.
- Titre et calendrier modal suivent l'annee selectionnee.
- 2026 presente les correspondances historiques deja enrichies. Ce n'est pas une reproduction exhaustive des 919 lignes du classeur.
- Les clics historiques ouvrent les references du mois/jour dans Agenda 2026. Le lien Correspondance 2027 ouvre ensuite une fiche 2027.
- Le filtre de periode du Programme reste limite a 2027.
- 2028 utilise generateYear puis applyCtaRules et assignmentsForFriday. Aucun fichier de copies statiques 2028.
- 52 nouveaux week-ends plus celui commence le 31.12.2027 couvrant le debut 2028 : 53 lignes calculees.
- Janvier : 5 permanences visibles, dont la permanence commencee en decembre 2027 ; fevrier : 4 ; decembre : 5.
- 31.12.2027 : G1 N02b, C1/B1/B2 N03a ; 07.01.2028 : G1 N01b, C1/B1/B2 N02a.
- Ancrage 01.01.2027 : N04b pour tous les OI, reserve pour C1/B1/B2. Ensuite N03b, N02b, N01b, N03a, N02a, N01a pour ces trois OI.
- Neuf jours feries 2028 calcules avec le moteur existant : 01.01, 02.01, 14.04, 17.04, 25.05, 05.06, 01.08, 18.09, 25.12.
- Les vacances disponibles sont conservees : hiver du 24.12.2027 au 09.01.2028. Les autres vacances 2028 ne sont pas inventees.
- 134 sans date = 125 sans periode + 9 avec mois propose. Les deux niveaux sont maintenant nommes.

## 4. PROGRAMME

- 622 seances actives, 262 modeles, 612 realisations, 1413 associations OI.
- 488 datees, 363 propositions historiques conservees, 134 sans date dont 125 sans mois.
- 106 correspondances fortes, 257 probables et 134 ambigues conserves dans l'enrichissement acquis.
- Les 30 TP9000 restent OI G1, public AUTO:2/cond TP9.
- Tableau : carre 8 x 8, Activite proposee sur deux lignes, Action distincte et centree verticalement.
- Le moteur de code cours et la lecture des codes publies ne sont pas modifies.

Le classeur a ete ouvert directement avec le runtime Python fourni, en lecture seule, feuille QUO VADIS '26. Il contient 919 lignes metier datees avec evenement. Une date supplementaire est en ligne 3, hors donnees metier. Les lignes TP9000 relues indiquent Cond TP9. Aucun export ou changement du classeur.

## 5. FICHE

- Deux colonnes de synthese, regle dans un detail depliable, formulaire, puis actions de decision regroupees.
- Suppression des titres repetes Workflow/Gestion de l'occurrence et de l'UUID preparatoire affiche.
- Valeurs des champs en graisse 400, hauteur mesuree 36 px ; date jj.mm.aaaa.
- OI/Public cote a cote au-dessus de 800 px, empiles a 800 px et moins.
- Groupes accessibles de cases a cocher : espace mesure de 24 px entre groupes, listes compactes a l'interieur.
- Les valeurs OI partagees entre DPS et JSP sont synchronisees et dedupliquees a l'enregistrement.
- Apercus Selection : ... sans bordure ni fond, avec meme largeur et meme position verticale.
- Contractions des echelons et referentiel responsable existants conserves.
- Autre lieu occupe toute la largeur de la grille ; maxlength 28 existant conserve.
- Arbitrage, Annuler pour l'annee et Supprimer de la production conserves. La recette ne declenche pas ces deux dernieres actions.

## 6. AUTRE LIEU / RBAC

Trace verifiee : listener qv-programme-save -> ScopeApi.updateQuoVadisProgrammeItem -> PATCH /api/scope/quo-vadis/programme-items/:id -> canWriteRecords et references:manage -> updateProgrammePreparation -> planningFields -> obligation MANUAL QV_PROGRAMME_PREPARATION.

Payloads de lieu, autres champs identiques :

```json
{"lieuId":"caserne-g1","lieuLibre":"","salleTheorieId":null}
{"lieuId":null,"lieuLibre":"Place du marche Yverdon","salleTheorieId":null}
```

Dans le vrai service, lieuLibre devient planningFields.lieuLibre, planningFields.locationLabel et lieu_libre. La variante canonique devient locationLabel Caserne G1. Aucune route differente, aucun calcul de modification d'evenement publie et aucune permission dependante du contenu du lieu.

- Profil GESTIONNAIRE existant avec references:manage : HTTP 200 pour les deux payloads via le vrai handler.
- Profil UTILISATEUR sans references:manage : HTTP 403, avant toute requete de persistance.
- Le service reel persiste les valeurs dans la fixture SQL locale ; une nouvelle instance relit le fichier local avec le meme lieuLibre.
- Navigateur : choix Caserne G1 et succes, choix Autre lieu et texte, succes, rechargement complet et texte conserve, restauration Caserne G1 et succes.
- Test d'une occurrence reliee a un evenement publie : evenement et version inchanges ; aucune requete UPDATE/INSERT scope_evenements.
- Ces preuves sont locales, avec front et handler reels et une base simulee au niveau SQL. Elles ne constituent pas une recette PostgreSQL reelle ni une reproduction du refus MOA.

Point bloquant : identifier l'URL/version et le profil exacts de l'observation MOA, puis reproduire le HTTP 403 differencie. Question envoyee dans la conversation. Le lot reste NOK pour cloture tant que ce point manque.

## 7. FICHIERS MODIFIES

Fichiers edites par ce lot :

- assets/css/scope.css
- assets/js/scope-ui.js
- assets/js/scope-ui-logic.js
- netlify/lib/_scope-cta-rules.js
- netlify/lib/_scope-quo-vadis-service.js
- scripts/scope-qv-finalisation-local-tests.js
- scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js
- scripts/scope-quo-vadis-calendar-vd-final-4-tests.js

Fichiers crees par ce lot :

- scripts/scope-qv-agenda-programme-ux-final-1-tests.js
- scripts/scope-qv-local-fixture.js
- scripts/scope-qv-local-recipe-server.js
- docs/scope-qv-agenda-programme-ux-final-1-recette.md
- docs/captures/qv-agenda-programme-ux-final-1/01-agenda-2027.png
- docs/captures/qv-agenda-programme-ux-final-1/02-agenda-2028.png
- docs/captures/qv-agenda-programme-ux-final-1/03-tableau-propositions.png
- docs/captures/qv-agenda-programme-ux-final-1/04-fiche-groupes.png
- docs/captures/qv-agenda-programme-ux-final-1/05-autre-lieu-enregistre.png
- docs/captures/qv-agenda-programme-ux-final-1/06-fiche-mobile-390.png

Modifications preexistantes preservees, non editees dans ce lot : assets/js/scope-api.js, netlify/functions/scope.js, netlify/lib/data/scope-qv-programme-2027.json, deno.lock, autres docs/captures/.

## 8. TESTS

| Commande | Resultat final |
| --- | --- |
| node --check assets/js/scope-ui.js | exit 0 |
| node --check assets/js/scope-ui-logic.js | exit 0 |
| node --check netlify/lib/_scope-cta-rules.js | exit 0 |
| node --check netlify/lib/_scope-quo-vadis-service.js | exit 0 |
| node --check scripts/scope-qv-local-recipe-server.js | exit 0 |
| node scripts/scope-qv-finalisation-local-tests.js | SCOPE QV FINALISATION LOCALE: 31/31 tests PASS |
| node scripts/scope-qv-agenda-programme-ux-final-1-tests.js | QV-AGENDA-PROGRAMME-UX-FINAL-1: 8/8 PASS |
| node scripts/scope-quo-vadis-core-1-tests.js | scope-quo-vadis-core-1-tests: ok |
| node scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js | scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests: ok |
| node scripts/scope-quo-vadis-calendar-vd-final-4-tests.js | scope-quo-vadis-calendar-vd-final-4-tests: PASS |
| npm run check | OK: controles locaux termines. |
| git diff --check | exit 0, aucune sortie |

Les attentes de cycle des tests finaux suivent la nouvelle sequence explicite MOA. Deux suites anciennes ont ete actualisees pour la navigation Programme 2027 et references hors 2027, la regle rouge groupee deja existante et le chargement du bundle versionne courant. Les controles de couleurs, vacances, neutralisation et navigation sont conserves. La nouvelle suite teste les resultats du moteur et du vrai handler, pas uniquement la presence de code.

## 9. RECETTE NAVIGATEUR

| Parcours | Resultat | Preuve |
| --- | --- | --- |
| Agenda 2027 | PASS | 12 mois ; 622/488/363/134 ; capture 01 |
| Agenda 2026 | PASS | Clic 05.02.2026 reste dans Agenda 2026, detail 19:00-21:30 |
| Agenda 2028 | PASS | Janvier 5, fevrier 4, decembre 5 ; neuf feries ; 30 cellules de couverture CTA ; capture 02 |
| Tableau | PASS | Etat sur deux lignes, carre mesure 8 px, label dans cellule ; capture 03 |
| TP9000 | PASS | 30 resultats ; plusieurs lignes G1/cond TP9 ; fiche Reference 2026 et 14:00-16:00 |
| Fiche | PASS | Champs 36 px/400 ; groupes 24 px ; apercus sans bordure/fond ; actions conservees ; capture 04 |
| Autre lieu local | PASS | Deux sauvegardes, reload complet, texte conserve, lieu initial restaure ; capture 05 |
| RBAC non autorise | PASS automatise | Handler HTTP 403 sans requete de persistance |
| Refus RBAC rapporte MOA | NOK | Non reproduit ; contexte exact manquant |
| Responsive fiche | PASS | Largeurs CSS 1600, 1500, 1150, 960, 800, 390 ; aucun debordement ; capture 06 |
| Responsive tableau | PASS | Memes largeurs ; scroll interne a 960, 800 et 390 ; aucun debordement de page |

Le zoom du navigateur a ete pris en compte pour mesurer les largeurs CSS effectives. L'override de viewport a ensuite ete reinitialise.

## 10. URLS LOCALES

- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?annee=2026
- http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel?annee=2028
- http://127.0.0.1:4391/scope.html#/quo-vadis/programme

Serveur scripts/scope-qv-local-recipe-server.js. Donnees de recette dans /private/tmp/scope-qv-final-1-preparations.json. Aucun acces a une base de production dans ce serveur. Les vues hors du perimetre de recette peuvent ne pas etre disponibles.

## 11. GIT / GITHUB FINAL

- Branche : codex/qv-recette-programme-cta-edit-3.
- HEAD = origin/main = GitHub main = 55667a79012e976d54f5c90cc183628f8897cec9.
- Worktree dirty : onze fichiers suivis modifies ; deno.lock, docs/captures/, ce rapport et trois scripts nouveaux non suivis.
- git diff --stat est un diff cumule incluant les travaux anterieurs. Il ne mesure pas seulement ce lot.
- COMMIT : AUCUN.
- PUSH : AUCUN.
- PR : AUCUNE.
- MERGE : AUCUN.
- DEPLOIEMENT : AUCUN.
- PRODUCTION : aucun changement applicatif publie, aucune ecriture de recette en production.

Ne pas annoncer la cloture PASS : la reproduction et la cause du refus RBAC observe par la MOA restent a etablir.

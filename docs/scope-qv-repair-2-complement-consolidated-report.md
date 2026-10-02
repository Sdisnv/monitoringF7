# SCOPE / QUO VADIS - rapport consolide de reprise

Date : 02.10.2026. Perimetre : worktree local et serveur de recette isole. Ce rapport ne constate aucune mise en production.

## Source et preflight

- Classeur historique ouvert directement : `2026 QUO VADIS SDIS Nord vaudois.xlsx`, feuille `QUO VADIS '26`, 919 lignes, SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`. Le fichier accessible ne porte pas le suffixe `(4)` annonce dans le premier message ; aucune lecture de ce nom distinct n'est revendiquee.
- Instructions du classeur traitees comme donnees, non comme ordres. Les deux prompts utilisateur ont ete rapproches : REPAIR-2 prime sur le complement pour 2027 ; l'historique 2026 n'est pas reecrit.
- Branche `codex/qv-recette-programme-cta-edit-3`, HEAD `55667a79012e976d54f5c90cc183628f8897cec9`. Worktree deja sale a la reprise, conserve. Aucun commit, push, PR, merge, deploiement ou ecriture de donnees de production.
- La capture SCOPE en lecture seule de l'etape precedente est resumee dans `docs/scope-qv-business-consolidation-recette.md` et `docs/scope-qv-business-audit.json`. Ses fichiers temporaires ne sont plus disponibles ; ses conclusions ne sont pas presentees comme un nouveau controle live.

## REPAIR-2 : corrige et teste

- OI : valeurs internes DPS/DAP/JSP distinctes ; affichage DPS et DAP sans prefixe, JSP avec `JSP`. OI et public cible restent deux champs independants.
- Salle : options filtrees par lieu avec les libelles atomiques du referentiel, sans `Vulcain / Jura` ni `Oxygene / O2` ; changement de lieu vide seulement la salle devenue incompatible. Libelles de secours de la fiche alignes.
- ABC/PIO : quatre occurrences 2027 contenant `ABC` n'attribuent plus C1/B1/B2. G1 et les lignes du classeur 2026 sont conserves. La source 2026 de `Formation cadres ABC`, ligne 325, cite encore les quatre OI ; c'est la nouvelle regle explicite 2027 qui prime. Les trois references historiques `PR-ABC` n'ont pas d'OI source demontre.
- CTA : ancrage du 13.02.2026, cycle transannuel et reserves exclus du tournus normal. L'exception `PIONNIER CSU-nvb` suit la semaine precedente, prouvee sur cinq lignes explicites du classeur ; les autres instructions suivent la semaine courante.
- Instructions DPS generees : choix du lundi G1, samedi C1/B1/B2, horaires 07:30-10:30 ou 18:30-21:30, exception PIONNIER 19:15-22:00. La section datee calculee dans la proposition est maintenant affichee comme public dans la fiche activite, sans changer le code de site sous-jacent.
- Fiche : choix de l'etat de planification existant (`A_PLANIFIER`, `PROPOSE`, `PLANIFIE`), validation date/etat, persistance et trace de decision. Signal `A controler` conserve tant qu'aucune validation metier ne le leve. Le lien Arbitrage pointe sur l'obligation exacte lorsqu'elle a des propositions ; aucun lien generique trompeur n'est affiche sinon. Actions d'ecriture reservees aux profils habilites.
- FOBA : test isole d'une correction humaine `FOBA:2` seule, reconduite en 2028 puis 2029 sans `AUTO:CAND-EA`. Le code exercice `010FOBA.006` reste distinct du Stat.Com `010FOBA`. Ce test ne pretend pas avoir retrouve ou modifie en production l'occurrence precise corrigee par la MOA.
- Regles de planification : versions datees applicables par annee, ancienne version fermee lors d'une creation future. Un chevauchement rejete ne laisse plus de mise a jour partielle. Le catalogue charge les versions valables pour l'annee demandee, et non toujours celles de 2027.
- Libelle `Supprimer` et confirmation explicite ; comportement backend de desactivation conserve.

## REPAIR-2 : restant

- Aucune correction des 53 evenements CTA SCOPE deja materialises : leurs OI et certains intervalles divergent selon l'audit en lecture seule precedent. Une politique MOA est requise avant toute mutation.
- L'occurrence FOBA 2 precise modifiee par la MOA n'a pas ete retrouvee dans une capture locale encore disponible. La protection du moteur est testee, pas sa valeur effective en production.
- Les anciennes occurrences SCOPE 2027 attribuees eventuellement a C1/B1/B2 pour ABC/PIO ne sont pas modifiees ; seule la source canonique locale 2027 et sa projection sont corrigees.
- Le Programme canonique local 2027 comporte encore 20 lignes d'instruction de section multi-OI (FEU 3, KICK-OFF 9, VARIA 8), dont les 9 KICK-OFF partagent une meme date et une meme ligne historique. La correspondance de chaque identifiant `O1...` avec un site n'est pas demontree. Le generateur DPS futur est par site, mais cette ancienne materialisation 2027 n'est pas reparee ni simplement cachee dans l'UI. STOP cible / MOA_REQUIRED sur la reattribution des occurrences.
- Les series de demi-sections FEU/VARIA/ABC/PIONNIER portent egalement plusieurs occurrences sur une seule date historique partagee ; sans correspondance source par occurrence, leur repartition annuelle exacte reste a arbitrer.
- Une recherche exhaustive des anciennes occurrences multi-OI en base et une recette navigateur actualisee restent necessaires avant de declarer la population SCOPE corrigee.

## Complement consolide final : realise et teste

- Agenda annuel 2026/2027/2028, calcul CTA continu, jours feries et vacances existants preserves. Les references Excel restent distinctes des vrais evenements SCOPE et ne recoivent pas de faux UUID.
- Regles administrables avec nom, description, priorite, periode et effet temporel ; classification des jours et horaire utilises par le moteur.
- Fiche Programme : activite, Stat.Com canonique, OI, public, lieu, salle, responsable, date, etat et decision de cycle de vie dans le modele existant. Le recalcul conserve les versions metier validees et les decisions humaines.
- Dry-run 2028 dans une transaction annulee, resultat repetable sans ecriture ; action explicite de calcul 2028 apres previsualisation, confirmation et protection `references:manage`. L'API locale renvoie 200 pour la previsualisation, et le test d'API confirme qu'un calcul autorise laisse le programme en `PREPARATION`.
- Reconduction locale 2027 -> 2028 -> 2029 testee sur une lignee validee ; second calcul 2028 sans doublon. Aucun evenement operationnel ni presence n'est cree par ces tests.

## Complement consolide final : restant

- Drag and drop des occurrences dans le calendrier absent. L'edition accessible de date dans la fiche existe ; aucun deplacement par glisser-deposer n'a ete improvise sans controle complet des contraintes metier.
- Le Programme navigable et editable de 2028/2029 n'est pas complet : la fiche canonique des annees futures n'expose actuellement que les lignees validees et la CTA, alors que le moteur produit aussi d'autres obligations. La table de resultat du calcul 2028 est consultable, mais ne remplace pas une vue annuelle complete.
- Le lien Arbitrage ne peut etre affiche que pour une occurrence deja rattachee a une obligation et a des propositions. Le parcours inverse complet et le compteur exact de toutes les occurrences restent a recetter dans l'interface.
- L'inventaire et l'edition de tous les types de regles demandes, notamment les parametres CTA, ne sont pas acheves par le seul editeur de regles de planification.
- Le recalcul ne fournit pas encore un bilan exhaustif `inchange / modifie / ajoute / retire` par occurrence. Les rapports actuels exposent les nouvelles obligations/propositions, l'attention et la consolidation.

## MOA_REQUIRED

- Arbitrage de correction des 53 evenements CTA SCOPE 2027 existants et de leurs demi-sections non stockees. Quatre intervalles et une couverture d'Ascension divergent dans l'audit anterieur.
- Qualification des 958 references historiques classees ambigues dans l'audit precedent, dont 18 instructions sans section demontree et des OI/publics incomplets. Les 9 sections explicites 2026 qui divergent de la permanence hebdomadaire (hors exception PIONNIER prouvee) ne sont pas reecrites.
- Stat.Com `EMSEA` sur 11 lignes historiques absent du referentiel canonique selon l'audit precedent : aucune creation de code implicite.
- Identification de l'occurrence FOBA 2 effectivement corrigee par la MOA avant une eventuelle reprise de donnees. Le cas test local ne vaut pas preuve de sa valeur actuelle en SCOPE.
- Conflit source/regle explicite : ligne 910 du classeur, `Instr demi-sct - KICK-OFF` G1, samedi 06.02.2027 07:30-10:30, face a la regle REPAIR-2 "instructions G1 le lundi". Cette date source n'est pas deplacee par hypothese. Decision MOA demandee : exception confirmee, replanification ou maintien en attente. STOP cible sur cette occurrence ; le generateur des nouvelles propositions suit le lundi.
- L'interdiction ABC/PIO C1/B1/B2 en 2027 prime sur les attributions 2026 du classeur sans alteration de 2026 ; ce point n'est pas le conflit ouvert.

## Recette et tests exacts

- Recette navigateur nouvelle : **NON EFFECTUEE**. Le runtime de controle n'a trouve aucun navigateur (`browsers.list() = []`). Les captures et le rapport de l'etape precedente ne valident pas les changements ajoutes dans cette reprise. Une demande de reouverture du navigateur local a ete adressee a l'utilisateur.
- Serveur local isole demarre sur `http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel`. Sans la capture temporaire SCOPE, la fixture actuelle utilise les referentiels du depot et signale l'historique SCOPE indisponible ; elle ne touche pas la production. GET du programme 2027 : HTTP 200. POST du dry-run 2028 : HTTP 200.
- `node scripts/scope-qv-repair-2-tests.js` : 11/11 PASS.
- `node scripts/scope-qv-business-consolidation-tests.js` : 39/39 PASS.
- `node scripts/scope-qv-finalisation-local-tests.js` : 33/33 PASS.
- `node scripts/scope-qv-agenda-programme-ux-final-1-tests.js` : 9/9 PASS.
- `node scripts/scope-qv-history-sections-ux-tests.js` : 28/28 PASS.
- `node scripts/scope-quo-vadis-moa-consolidation-2-tests.js` : PASS, idempotence et rollback.
- `node scripts/scope-quo-vadis-core-1-tests.js` : PASS.
- `node scripts/scope-quo-vadis-referential-management-4-tests.js` : PASS.
- `node scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` : PASS.
- `node scripts/scope-quo-vadis-calendar-vd-final-4-tests.js` : PASS.
- `npm run check` et `git diff --check` : PASS.
- Suites anciennes en echec sur attentes figees anterieures au lot : `node scripts/scope-quo-vadis-coverage-1-tests.js` et `node scripts/scope-quo-vadis-moa-recovery-1-tests.js` attendent `scope-public-engine-mirror-c2-b` alors que le schema actuel est `scope-annual-catalog-themes-c8-b`; `node scripts/scope-quo-vadis-professional-3-tests.js` attend Synthese comme entree au lieu d'Agenda annuel ; `node scripts/scope-quo-vadis-synthese-ux-1-tests.js` attend `Navigation rapide` ; `node scripts/scope-quo-vadis-a-arbitrer-ux-2-tests.js` attend AUTO avant PR ; `node scripts/scope-quo-vadis-a-arbitrer-ux-final-3-tests.js` fige un hash de `scope-ui-logic.js`. Ces suites n'ont pas ete modifiees pour forcer un vert. `npm run test:scope` n'a pas ete execute.

## Fichiers et Git final

- Suivis modifies : `assets/css/scope.css`, `assets/js/scope-api.js`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `netlify/functions/scope.js`, `netlify/lib/_scope-cta-rules.js`, `netlify/lib/_scope-quo-vadis-consolidation.js`, `netlify/lib/_scope-quo-vadis-coverage.js`, `netlify/lib/_scope-quo-vadis-service.js`, `netlify/lib/_scope-qv-referential-management.js`, `netlify/lib/data/scope-qv-programme-2027.json`, `scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js`, `scripts/scope-quo-vadis-calendar-vd-final-4-tests.js`, `scripts/scope-quo-vadis-moa-consolidation-2-tests.js`, `scripts/scope-qv-finalisation-local-tests.js`.
- Non suivis du chantier conserves/completes : `netlify/lib/data/scope-qv-history-2026.json`, `scripts/fixtures/`, `scripts/scope-qv-business-audit.js`, `scripts/scope-qv-business-consolidation-tests.js`, `scripts/scope-qv-extract-history-2026.js`, `scripts/scope-qv-history-sections-ux-tests.js`, `scripts/scope-qv-local-fixture.js`, `scripts/scope-qv-local-recipe-server.js`, `scripts/scope-qv-repair-2-tests.js`, les rapports et captures `docs/` listes par `git status`. `deno.lock` non suivi preexistant conserve.
- Aucun fichier sale d'avant reprise n'a ete restaure ou supprime. Aucun commit cree. Production inchangee.

COMMIT : AUCUN  
PUSH : AUCUN  
PR : AUCUNE  
MERGE : AUCUN  
DÉPLOIEMENT : AUCUN  
PRODUCTION : INCHANGÉE

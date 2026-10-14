# SCOPE / QUO VADIS - correctif post-PR #16 - 14.10.2026

**READY_FOR_MOA. Aucune fusion, aucun deploiement, aucune migration.**

## Preflight
Main GitHub initial et dernier controle : `160eb54ccca078d313703e8f24fd64c0d4a81149`.
PR #16 fusionnee le 13.10, aucun autre lot ouvert au preflight. Production `scope-sdisnv`, deploy `6ace6fb85a62f357cfd85aa8`, ready, meme commit ; authentification LOCAL confirme par `/auth/config`.
Branche unique : `codex/scope-qv-post-pr16-moa-20261014`. HEAD final : commit de la PR de ce lot, fourni dans le compte rendu GitHub/chat. Checkout principal et modifications etrangeres preserves, aucun reset ou force-push.
Referentiel canonique, ROADMAP/ToDo et diff PR #16 examines avant modification. Decisions de production du 14.10 relues en READ ONLY, notamment CFF/Oxygene, OSR et PAPR 3 ; aucun ancien instantane ne les remplace.

## Corrections
- Historique : sept colonnes directes, sans detail de changements deroulant. Creation manuelle unique, vrais champs modifies, transitions de validation, motifs existants. Ordre OI ignore ; champs derives dedupliques et techniques exclus. Valeurs avant issues des planningFields persistes, valeurs anciennes absentes non inventees. Corrections automatiques persistantes distinguees de l'auteur humain. Transactions anciennes conservees en base ; absence de transition indiquee comme enregistrement historique. Ouverture conservee pendant les rafraichissements, cache de session invalide apres sauvegarde/deconnexion, reponse abandonnee si la session change.
- Reservation : salle ou ressource explicite, jamais site exclusif deduit d'un lieu sans salle. CFF sans salle n'a plus de conflit fictif ; meme salle Codir bloque, Oxygene reste independante. Exclusivite explicite et chevauchement partiel conserves, moteur de compatibilite serveur reutilise ; pas d'extension du controle des occupations a toutes les activites SDIS.
- Controles : moteur calendrier existant partage avec le navigateur, non reecrit ; signaux des la proposition et pendant la saisie, actualises avant sauvegarde et controle serveur avant validation. Messages sans codes de regles, dates jj.mm.aaaa. N+364, calendrier/cursus, disponibilite, CTA, PR, DAP et dates humaines preserves.
- OSR : vendredi, y compris 08:00-16:00 le 08.10.2027, possible uniquement pour le type canonique confirme / 0171F7 / OSR, avec CI DPS dans ce meme type. Publics mixtes supplementaires non deroges automatiquement ; vacances/feries/neutralisations restent controles. Aucune permission globale vendredi DPS.
- UX : cinq parametres dans la grille existante reguliere ; cases inchangées, quatre largeurs verifiees. Historique mobile garde ses colonnes lisibles dans le defilement local existant, sans mise en cartes ni debordement de page. Occupation externe : sans cycle SDIS, non reconduite automatiquement.
- PDF : trois exports conserves, A4 portrait mensuel et paysage annuel/compact ; bandeau/logos/titres/pieds communs. Cause d'encodage : U+30FB dans les titres sources, absent de Helvetica ; rendu U+00B7 uniquement en PDF, aucune source modifiee. Onze colonnes annuelles, noms/annee dynamiques. Un bug de selection revele par la recette est aussi corrige : changer le mois ne remet plus le format mensuel en annuel.
- Publics : Opérationnel, ordre exact OSR/CI DPS/Candidat CI DPS/CI DAP/Candidat CI DAP ; OSR premier dans les valeurs affichees, FOBA 1/2/3 et identifiants conserves.
- IndeX : inventaire et correspondances documentaires uniquement dans la ROADMAP existante : 17 competences, 8 fonctions, 36 publics ; fonctions/candidatures/qualifications/grades/echelons/affectations dates distincts. QV-RULES-001, Cours ECA et autres suites conserves, aucun nouveau module.

## Tests Et Preuves
25 tests unitaires cibles, dont equivalence du moteur historique partage avec main ; 6 controles PostgreSQL ; 5 tests de dependance PDF : reussis.
8 parcours Chromium reels, authentification LOCAL : avant/apres main, historique, grille 1440/1100/768/390 px, controles pendant saisie, public OSR, reservation CFF, DAP, creation manuelle et trois apercus/telechargements. Zero erreur JavaScript ; fichiers reellement telecharges verifies, y compris mensuel.
PDF complets : 914 lignes actives, 47 pages annuelles / 45 compactes ; fevrier : 73 lignes / 5 pages portrait. Geometrie, en-tetes/positions toutes pages, point median et annee 2028 verifies. PNG initiaux, pages des deux titres et pages finales inspectes.
934 lignes comparees a main sur l'instantane actuel : **100 % des Stat.Com identiques**, codes, dates/horaires, OI, themes, publics, decisions et liens identiques avant recette. Essais de modification ensuite temporaires, dont une qualification automatique deja autorisee au jalon precedent pour verifier sa trace ; aucun nouveau changement Stat.Com livre.
Rollback exact des 113 tables apres recettes API et navigateur. Evenements publies, presences, affectations, attendus, personnel et qualifications proteges pendant les essais. Les suffixes de secondes normalises par la sauvegarde existante ne sont pas traites comme un changement d'horaire reel.
Production : deux lectures READ ONLY du 14.10, 07:30 et 07:46 Europe/Zurich, empreintes identiques pour 257 evenements, 5 967 participations, 636 affectations, 125 liens, 971 obligations et 2 475 journaux. Aucun test ni appel d'ecriture en production.
Build Netlify production reussi : 25 fonctions, 6,3 s. Authentification/RLS/permissions/gzip PR #15 inchanges. Diff et integrite Git controles ; aucune migration nouvelle ou destructrice.
Preuves : `docs/captures/qv-post-pr16-moa-20261014/`. Les instantanes metier sources restent locaux dans `output/qv-post-pr16/`, jamais inclus dans les assets ou une migration de production. Aucun serveur ou transaction de recette laisse ouvert.

## Fichiers Modifies
Interface : `assets/js/scope-ui.js`, `assets/js/scope-ui-logic.js`, `assets/css/scope.css`, `scope.html`.
Calendrier partage : `assets/js/scope-qv-coverage.js`, facade `netlify/lib/_scope-quo-vadis-coverage.js` ; services `netlify/lib/_scope-quo-vadis-service.js`, `netlify/lib/_scope-qv-programme-revisions.js` ; PDF `netlify/lib/_scope-pdf-renderer.js`.
Recettes existantes ajustees : `scripts/scope-qv-p0-recipe-server.js`, `scripts/scope-qv-post-recette-moa-clone.js`, `scripts/scope-qv-post-recette-moa-tests.js`.
Nouvelles recettes du lot : `scripts/scope-qv-post-pr16-moa-tests.js`, `scripts/scope-qv-post-pr16-moa-clone.js`, `scripts/scope-qv-post-pr16-moa-browser.js`, `scripts/scope-qv-post-pr16-moa-pdf-proof.js`.
Documents : present rapport, `docs/business-rules/quo-vadis-canonical-rules.md`, `docs/SCOPE_QV_ROADMAP_V1_20261012.md`, preuves et attribut PDF binaire dans leur repertoire.

## Reserves Et Decision
Catalogue officiel IndeX non disponible : les sources SCOPE observees ne sont pas presentees comme une preuve de libelles officiels IndeX. Correspondances/MEA-Grutier, fonctions/qualifications, publics mixtes OSR et reservations exclusives non qualifiees restent des decisions MOA futures, sans migration ni regle inventee.
Un ancien script `scope-quo-vadis-coverage-1-tests.js` echoue sur son assertion de version C2 attendue ; main contient deja `scope-annual-catalog-themes-c8-b`. Schema et script inchanges dans ce lot ; ce test obsolete n'est pas revendique PASS. La dependance calendrier touchee est verifiee par equivalence executable avec main.
Donnees a qualifier, separees de la presentation : « Securite feu · les Zotres Brandons », 27.02.2027, domaine affiche « — » et public « A definir » dans la source actuelle ; formation groupee DAP 1.1/1.2 reste sans date/heure validee, propositions distinctes conservees. Aucun remplissage automatique pour ameliorer le PDF ; les champs manquants sont conserves.
Une seule PR, marqueur `[skip netlify]`. Aucun merge ni deploiement sans nouveau GO MOA explicite ; la production reste `160eb54`. Recette suivante uniquement sur les corrections de ce lot, sans recommencer les acquis.

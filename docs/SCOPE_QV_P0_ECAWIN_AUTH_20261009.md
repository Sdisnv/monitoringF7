# SCOPE QUO VADIS Corrections MOA consolidees

Lot du 10.10.2026. Ce rapport actualise la PR #10 apres la reprise controlee.
Les observations retirees sur les lieux, salles et les deux captures ne font pas partie du lot.

## A Etat initial

Branche `codex/scope-qv-p0-consolidated-20261009`, HEAD initial `71677a69b97619a7d9dff9397186af32f95852fb`.
PR #10 OPEN, DRAFT, MERGEABLE. Main controle : `985eb5779590d90b671a591a4edcb3a961b42a50`.
Acquis reutilises : P0, LOCAL, gabarit commun, Drag & Drop, popovers, permanences jaunes, qualifications/cursus, exports et Turnstile.
Le dossier initial et ses modifications preexistantes restent intacts.

## B Enregistrer et planifier

Causes reproduites : une ancienne navigation achevait son chargement apres l'ouverture de la nouvelle fiche et remplacait sa saisie ; l'etat Planifie etait masque par Valide ; la relecture de reponse intervenait apres COMMIT et pouvait echouer alors que l'ecriture etait deja conservee.

Correctifs : compteur de navigation existant utilise pour ignorer les chargements perimes et leur cache ; fiche bloquee pendant son propre chargement ; compteur d'alertes actualise sans reconstruire la fiche ; affichage Planifie distinct de la validation metier ; ecriture et hydratation de reponse dans la meme transaction PostgreSQL.

Fichiers principaux : `assets/js/scope-ui.js`, `netlify/lib/_scope-quo-vadis-service.js`.
SAVE conserve les decisions ; VALIDATE valide sans changer la planification ; PLAN valide et planifie.
Creation, occurrence 2026, version metier validee, reouverture rapide, deuxieme sauvegarde sans doublon et erreur serveur apres ecriture : PASS sur clone.
Aucun evenement operationnel cree : publication toujours soumise a la validation complete du programme annuel.

## C Responsables

Selection multiple avec recherche dans `scope_responsable_fonctions`, ajout libre et suppression individuelle.
`responsibleSelections` distingue REFERENCE (code existant) et FREE (libelle exact, sans conversion en personne).
Le champ scalaire historique reste compatible ; les selections et la presentation complete sont conservees dans les metadonnees.
FREE conserve casse et espaces, y compris `PrésidentE  Codir` dans le cas de recette.
La fiche commune, le Programme, les donnees Agenda et les exports existants lisent les libelles conserves ; aucun format de rapport reconstruit.
Aucun NIP fictif, aucune affectation individuelle creee.

## D Publics cibles

Selection multiple des codes existants et ajout de libelles libres, avec recherche et suppression individuelle.
`publicCodes` et la colonne `cible_codes` contiennent uniquement les publics references.
`publicFreeLabels` reste une information descriptive, jamais une qualification, un public calcule ou une obligation individuelle.
Combinaison reference/libre, persistance et reouverture : PASS. Calculs DPS/DAP/JSP, qualifications, cursus et affectations datees inchanges.

## E ECAwin

`EXERCI / CONCOUR / Concours` confirme par la MOA le 10.10.2026 : sept caracteres, sans S final.
Les 60 associations precedentes sont identiques, verifiees contre le commit initial. Registre fourni : 61 associations, 60 actives et JSP Y3 historique ; `complete:true`.
La completude porte sur les captures fournies et cette confirmation, pas sur un catalogue ECAwin mondial non fourni.
Aucune association EXERPO inventee. EMSEA reste specifique SCOPE. 010JY3 reste historique, sans conversion.
Synchronisation de referentiel version `scope-statcom-ecawin-moa-20261010-2` preparee et testee sur clone, jamais executee en production.
Original et transcription : [reference ECAwin](references/ECAwin_20261009.md). Aucun code d'occurrence renumerote.

## F Tests et preuves

- Tests cibles : 41/41 PASS, dont atomicite, structures serveur, sauvegardes distinctes, chargement concurrent, champs libres et conservation des 60 associations.
- PostgreSQL clone `scope_qv_2027_recipe_20261006` sur `127.0.0.1:5432` : baseline 847, selections multiples/libres persistantes, CONCOUR utilisable, deuxieme PLAN sans duplication, deplacement conservant les nouvelles decisions, rollback PASS.
- Chromium : 6 parcours consolides PASS ; menus controles sur 1440x1000, 960x900 et 390x844. Erreur HTTP 500 apres ecriture : rollback et saisies conservees.
- Empreintes avant rollback : 18 tables hors cible inchangees, dont personnes/NIP, affectations, qualifications, participations, evenements, lieux et salles ; autres preparations inchangees. Toutes les empreintes restaurees apres rollback.
- Build Netlify du candidat PASS, sans deploiement. `git diff --check` PASS.
- Preuves : [parcours navigateur](captures/qv-moa-correctifs-20261010/recipe-results.json), [integrite PostgreSQL](captures/qv-moa-correctifs-20261010/postgres-integrity.json), captures dans le meme dossier.
- Limite : Safari non couvert. Preuves P0 et Turnstile anterieures conservees dans `captures/qv-p0-ecawin-auth-20261009/`, sans repetition des recettes non concernees.

## G Livraison

Un commit correctif explicite sur la branche existante ; SHA final indique dans la PR et le compte rendu de livraison.
Une seule [PR #10](https://github.com/Sdisnv/monitoringF7/pull/10), maintenue en brouillon.
Decisions MOA ajoutees au [referentiel versionne](business-rules/quo-vadis-canonical-rules.md).
Production `scope-sdisnv`, site ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`, deploiement de reference `6ac8d732e7e62259b75409ff` conserve.
Aucune fusion, publication, ecriture en production, modification de secrets, RLS ou ORION.
Gestion des lieux/salles et JSON canonique source inchanges. Nouvelle structure JSON compatible, aucune migration destructive.

## H Verdict

**READY_FOR_MOA** : lot implemente et teste sur clone, pret pour recette fonctionnelle ciblee de la PR en brouillon.
Ce verdict ne vaut pas GO de fusion, de publication ou d'activation Turnstile en production.

## Configuration Turnstile

Parametres runtime du site SCOPE, a configurer seulement apres validation et nouveau GO :

| Parametre | Valeur attendue |
| --- | --- |
| `SCOPE_TURNSTILE_ENABLED` | Absent ou `false` par defaut ; `true` seulement apres validation |
| `SCOPE_TURNSTILE_SITE_KEY` | Cle publique du widget invisible ou non interactif |
| `SCOPE_TURNSTILE_SECRET_KEY` | Secret uniquement dans le runtime Functions, jamais cote client |
| `SCOPE_TURNSTILE_HOSTNAMES` | Liste de noms d'hote exacts, par exemple `scope-sdisnv.netlify.app` |
| `SCOPE_TURNSTILE_ACTION` | `scope-local-login` par defaut, identique cote widget et validation serveur |

Sans activation explicite, LOCAL fonctionne sans cles Turnstile. Une activation explicite mal configuree est refusee ; aucune validation client ne remplace Siteverify. Limitation Netlify 5 requetes / 180 secondes, mot de passe, sessions, permissions et refus anonyme conserves.

La CSP du site autonome SCOPE autorise uniquement le domaine Cloudflare necessaire dans `script-src`, `frame-src` et `connect-src`. Les autres restrictions sont conservees.

La recette utilise uniquement les [cles publiques officielles de test](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Leur reponse Siteverify observee retourne `example.com` sans champ action : ces parametres restent propres a la recette. Ne pas les reprendre pour la production. La verification serveur suit la [documentation Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

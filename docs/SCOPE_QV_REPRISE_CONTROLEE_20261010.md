# SCOPE QUO VADIS Reprise controlee

Controle du 10.10.2026 apres interruption du Mac. Le travail est conserve localement et sur GitHub.
La PR unique est prete pour examen MOA et reste en brouillon. Aucune nouvelle correction fonctionnelle.
L'anomalie MOA **Enregistrer et planifier** reste ouverte : les PASS de recette isolee ne valent pas resolution de ce signalement.

## A Etat Git retrouve

- Depot distant : `Sdisnv/monitoringF7`, `git@github.com:Sdisnv/monitoringF7.git`.
- Dossier initial preserve : `/Users/thierrygrunig/Projects/Monitoring F7`, branche
  `codex/scope-prod-local-auth-preserved-20261009`, HEAD `c847314`.
  Neuf fichiers suivis modifies et les entrees non suivies preexistantes sont laisses intacts ; index vide.
- Dossier correctif retrouve : `/private/tmp/scope-qv-final-ecawin-20261009`.
- Branche locale et distante : `codex/scope-qv-p0-consolidated-20261009`.
- HEAD applicatif retrouve : `9d7d3cf84de6e3c100cd9030e2fab9f33fb9a82f`, identique au HEAD distant et a celui de la PR au debut du controle.
- Acquis conserves : `46a62c6`, `585a6f7`, `9d7d3cf`. Aucun commit refait, aucun rebase ou force push.
- Main distant : `985eb5779590d90b671a591a4edcb3a961b42a50`, inchange.
- Lot retrouve par rapport a main : 51 fichiers, 1428 insertions, 99 suppressions.
  Les 39 fichiers / 733 insertions / 80 suppressions de la consigne ne sont donc pas l'etat final versionne retrouve.
- Aucune modification applicative indexee ou non indexee dans le dossier correctif.
  Seul `node_modules` est non suivi : lien local de dependances, exclu de la PR.
- `git fsck --no-reflogs --no-dangling` et `git diff --check` : PASS.
- Aucun processus de recette SCOPE, de build/deploiement Netlify ou de navigateur de recette cible trouve actif.

## B Travaux recuperes

Acquis retrouves : authentification LOCAL, notifications centrales, Drag & Drop tableau et mensuel,
gabarit commun, popovers, permanences jaunes, qualifications/cursus, registre ECAwin et Turnstile prepare.
Les modifications de la PR concernent SCOPE, ses tests et ses preuves ; les PDF et scripts locaux hors lot n'y figurent pas.

Preuves conservees : [rapport P0 et authentification](SCOPE_QV_P0_ECAWIN_AUTH_20261009.md),
[recette Chromium](captures/qv-p0-ecawin-auth-20261009/recipe-results.json),
[recette Turnstile](captures/qv-p0-ecawin-auth-20261009/turnstile-results.json), captures des quatre provenances,
calendriers et notifications, [reference ECAwin](references/ECAwin_20261009.md).
Les 11 scenarios Chromium sont PASS ; Safari reste non couvert.
Le rapport anterieur conserve les 40 tests cibles PASS et la recette PostgreSQL avec baseline 847 et rollback PASS.
Ces recettes n'ont pas ete rejouees pendant la reprise.

Controle d'integrite unique : 17/17 PASS (`scope-ecawin-tests`, `scope-qv-p0-consolidated-tests`, `scope-turnstile-tests`).
Les quatre assets SCOPE critiques dans `dist/scope` sont identiques aux sources et leurs SHA-256 figurent dans le HTML construit.
Les archives Functions `scope.zip` et `auth-login.zip` sont integres ; la Function SCOPE construite contient les marqueurs du registre final et de sa migration.
Le build Netlify termine precedemment et ses artefacts sont conserves. Aucun rebuild complet necessaire a cette reprise documentaire.

Le fichier temporaire `scope-qv-p0-pr-body.md` n'est pas retrouve. Le corps documente de la PR est disponible sur GitHub : aucune preuve versionnee n'est perdue pour cette raison.
Le referentiel [QUO VADIS canonique](business-rules/quo-vadis-canonical-rules.md) et les regles versionnees des trois sauvegardes ont ete relus ; aucune regle modifiee.

## C Travaux restants

- **Enregistrer et planifier : anomalie MOA NON RESOLUE.** Aucun diagnostic ou correctif nouveau dans cette reprise.
  Les resultats du clone concernent leur propre parcours de recette et ne ferment pas l'anomalie du parcours MOA.
  Reproduction du cas signale et toute nouvelle correction requierent une validation MOA du perimetre suivant.
- Le manque general de captures ECAwin est leve : original conserve, 60 associations avec descriptions transcrites.
  Seul le code complet de la ligne Concours reste a confirmer (`CONCOU` visible au bord de la colonne) ; il reste non qualifie.
- L'activation Turnstile en production et toute fusion/publication restent soumises a un nouveau GO MOA.

## D Livraison

Une seule [PR #10](https://github.com/Sdisnv/monitoringF7/pull/10), OPEN, DRAFT, vers `main`, MERGEABLE au controle initial.
Le commit applicatif `9d7d3cf` est reutilise. Le seul ajout de reprise sur la meme branche est ce rapport documentaire ;
le SHA documentaire final est indique par le HEAD de la PR et dans le rapport de livraison du chat.
Les preuves precedentes restent conservees dans la PR, completees d'un avertissement explicite sur l'anomalie MOA.

Production controlee en lecture seule : `scope-sdisnv`, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`,
deploiement publie `6ac8d732e7e62259b75409ff`, etat `ready`, inchange.
Aucune fusion, publication, ecriture de recette en production, migration executee, modification de secrets ou RLS.

## E Verdict

**MOA_REQUIRED.** Reprise et finalisation documentaire terminees ; PR unique en brouillon prete pour examen MOA.
L'anomalie de planification et la confirmation ECAwin restent ouvertes. Ce verdict n'est pas une autorisation de publication.

# SCOPE - QUO VADIS - Consolidation metier 2026-2028

Recette locale du 02.10.2026. Les validations ci-dessous concernent le code et le serveur de recette isole, pas une mise en production.

## Source obligatoire ouverte directement

Fichier effectivement fourni et lu : `/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx`.
Le nom accessible ne porte pas le suffixe `(4)` mentionne dans le message. Aucun fichier portant ce suffixe n'est presume avoir ete lu.

- Feuille : `QUO VADIS '26`, 919 references exploitees directement.
- SHA-256 : `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`.
- `scripts/scope-qv-business-audit.js` ouvre le XLSX original avec le lecteur XLSX du depot, et compare son empreinte ainsi que chacune de ses 919 lignes avec la projection historique. Il s'arrete en cas d'ecart ou d'inaccessibilite.
- Le classeur n'a pas ete modifie. Ses cellules sont traitees comme des donnees metier, pas comme des instructions d'execution.
- Collecte SCOPE : transaction PostgreSQL explicitement READ ONLY, SELECT puis ROLLBACK, capture du `2026-10-02T05:15:42.369Z`.
- 242 evenements 2026/2027, 315 relations de cibles et 28 relations de publics; aucune ecriture de production.
- Audit reproductible : `node scripts/scope-qv-business-audit.js`, necessitant les fichiers originaux et la capture privee locale.

Les preuves par reference et par champ sont dans [l'audit JSON](scope-qv-business-audit.json). La liste exhaustive des ecarts CTA est dans [l'annexe CTA](scope-qv-cta-divergences.md).

## 1. Git/GitHub preflight

Branche : `codex/qv-recette-programme-cta-edit-3`.
HEAD, origin/main et main GitHub : `55667a79012e976d54f5c90cc183628f8897cec9`.
11 fichiers suivis deja modifies, plus fichiers non suivis du lot precedent. Diff initial conserve dans `/private/tmp/qv-consolidation-business-preflight.diff`.
Aucun changement preexistant n'a ete annule. Aucune autre branche ni worktree n'a ete cree.

## 2. Permanences 2026-2028

Ancrage unique : vendredi 13.02.2026 18:00 -> lundi 16.02.2026 06:00.
G1 = N05a; C1/B1/B2 = N01a. Aucune permanence calculee avant cet ancrage.
Le filtre vise uniquement les projections `CTA-PERMANENCE`; il ne supprime aucun veritable evenement SCOPE.
Les cycles presents au debut de ce lot sont conserves, avec un decalage d'index vers l'ancrage MOA. Les listes annuelles sont calculees, pas stockees.

| Annee couverte | Fenetres | Premiere | Derniere | Groupes premiere / derniere, G1 puis C1/B1/B2 |
| --- | ---: | --- | --- | --- |
| 2026 | 47 | 13.02.2026 18:00 -> 16.02.2026 06:00 | 31.12.2026 18:00 -> 04.01.2027 06:00 | N05a / N01a ; N04b / N03a |
| 2027 | 53 | 31.12.2026 18:00 -> 04.01.2027 06:00 | 31.12.2027 18:00 -> 03.01.2028 06:00 | N04b / N03a ; N02b / N02b |
| 2028 | 53 | 31.12.2027 18:00 -> 03.01.2028 06:00 | 29.12.2028 18:00 -> 02.01.2029 06:00 | N02b / N02b ; N05a / N01a |

Les nombres comptent les fenetres hebdomadaires qui intersectent l'annee civile. En 2026 : 46 vendredis nominaux de 2026 plus la permanence nominale du 01.01.2027, avancee au 31.12.2026. En 2028 : 52 vendredis nominaux plus le report du 31.12.2027.
La meme fenetre transannuelle conserve le meme identifiant et les memes groupes dans les deux annees : ce n'est pas une duplication d'evenement.
Les couvertures de feries isoles sont attachees a leur permanence porteuse et documentees separement; elles ne gonflent pas ce compteur de fenetres hebdomadaires.
L'API conserve aussi la prolongation du 29.12.2028 jusqu'au 02.01.2029 apres reapplication des regles.

## 3. Coherence avec donnees existantes

- SCOPE 2026 : 0 permanence existante parmi les 121 evenements. XLSX 2026 : 0 ligne de permanence.
- Programme canonique 2027 : 0 divergence de dates ou demi-sections avec le moteur recalcule.
- SCOPE 2027 : 53 permanences existantes, toutes associees uniquement a G1 au lieu de G1/C1/B1/B2. Ces 53 ecarts sont listes individuellement dans l'annexe avec UUID et vendredi nominal.
- Les demi-sections ne sont pas enregistrees sur ces 53 evenements SCOPE : leur rotation en production n'est PAS DEMONTREE. Aucun code Nxx n'est invente pour combler ce manque.

Quatre ecarts d'intervalle supplementaires :

| UUID SCOPE | Vendredi nominal | Stocke | Calcule |
| --- | --- | --- | --- |
| ed39f9e0-3b21-486c-ae9b-d5cc9e77742e | 01.01.2027 | 01.01 18:00 -> 04.01 06:00 | 31.12.2026 18:00 -> 04.01 06:00 |
| 20e72a57-696a-4f36-ae32-b3dc0cbf4e68 | 26.03.2027 | 26.03 18:00 -> 29.03 06:00 | 25.03 18:00 -> 30.03 06:00 |
| 655e588a-9ad8-416d-a19c-96a2092dd55b | 14.05.2027 | 14.05 18:00 -> 17.05 06:00 | 14.05 18:00 -> 18.05 06:00 |
| 69748e94-149f-413e-a0e6-a2adbede725f | 17.09.2027 | 17.09 18:00 -> 20.09 06:00 | 17.09 18:00 -> 21.09 06:00 |

La couverture Ascension 05.05.2027 18:00 -> 07.05.2027 06:00 n'est pas enregistree sur l'evenement porteur du 30.04.2027, UUID `7b9dad11-b846-43b6-a75a-d7fb9216e87f`.
La coherence des donnees SCOPE existantes est donc NOK sur ces points. Aucun ecart n'a ete corrige silencieusement.

## 4. Historique 2026 enrichi

| Source | CERTAIN (A) | REGLE GENERALISABLE (B) | AMBIGU (C) | Total |
| --- | ---: | ---: | ---: | ---: |
| SCOPE | 0 | 28 | 93 | 121 |
| XLSX sans correspondance SCOPE demontree | 0 | 54 | 865 | 919 |
| Total | 0 | 82 | 958 | 1040 |

Aucun reclassement artificiel n'est effectue pour alimenter la population A. B identifie une qualification metier resolue par une regle reutilisable; il ne certifie pas que chaque champ optionnel est complet. Les valeurs partielles demontrees restent disponibles sur les references C.

Regles generales utilisees dans `scope-ui-logic.js`, communes a l'historique et aux annees suivantes :

| Preuve/regle | Champs ou references concernes |
| --- | ---: |
| Cibles SCOPE canoniques -> OI qualifies | 58 |
| Cibles SCOPE canoniques -> publics connus | 67 |
| Famille explicitement presente dans la source | 1001 |
| Alias canonique de fonction responsable | 486 |
| Lieu exactement retrouve dans le referentiel | 849 |
| Salle exactement retrouvee et compatible | 119 |
| Domaine demontre par Stat.Com canonique | 177 |
| Public explicitement reconnu dans le personnel cible | 286 |
| Qualification OI par domaine demontre | 313 |
| OI demontre par Stat.Com specifique | 33 |
| Succession Stat.Com canonique et datee | 1 |

Ces nombres sont des preuves par champ, se recouvrent, et ne s'additionnent pas en populations.
La succession existante `010JY3 -> 010JC1`, applicable depuis le 01.01.2026, est reutilisee une fois; le code source reste trace. Les 11 occurrences `EMSEA`, absentes du referentiel canonique, ne sont pas transformees en Stat.Com invente.
Activite, date, heures et valeurs brutes de source sont conservees. Aucune demi-section n'est deduite du groupe de permanence, et la regle TP9000 2027 n'est pas appliquee retroactivement a 2026.
Les enrichissements sont des projections deterministes restituees par l'API et conserves dans l'audit local. Ils survivent a une nouvelle instance du service sans modifier les sources, les evenements ou les presences de production.

## 5. Activite editable

Le champ Activite modifie une occurrence/session precise, identifiee par l'item canonique, et non le modele partage.
La preparation existante dans `scope_quo_vadis_obligations.metadata.planningFields` conserve la valeur. Aucun mecanisme de publication supplementaire n'est introduit.
La recette locale a modifie `qv-source-854` en `Integration DPS G1 - reference validee` (libelle reel accentue dans l'interface).
Apres sauvegarde et reload : fiche, tableau, mensuel et libelle du jour dans l'agenda affichent le nouveau titre. Les occurrences C1/B1/B2 independantes restent inchangees.

## 6. Stat.Com editable

Selecteur issu des 91 codes du referentiel SCOPE, avec validation backend de l'existence, de l'activite et de la periode de validite. Aucun texte libre.
Code cours et Stat.Com restent distincts. L'absence legitime est acceptee; un ancien code inconnu est affiche a controler, pas recree.
Recette : `070F1 -> 012G1`, conserve dans fiche/tableau/mensuel apres reload. Code inconnu rejete et absence acceptee dans les tests.

## 7. Lieux / salles

Referentiel reel : 8 lieux et 11 salles, dont 9 salles G1 (incluant les espaces parents Vulcain/Oxygene), Theorie C1 et Theorie B1.
Les libelles combines `Vulcain / Jura`, `Vulcain / Alpes`, `Oxygene / O2`, `Oxygene / O3` utilisent les liens parents existants.
La liste est restreinte au lieu actif selectionne. Changer de lieu efface la salle precedente. Une salle incompatible est aussi rejetee par le backend.
Recette : G1/Jura -> C1 : salle vide, seule Theorie C1 disponible. Retour G1/Jura, sauvegarde et reload : `Vulcain / Jura` conserve.
Les anciens alias de caserne sont resolus vers les vrais UUID. Aucun faux UUID de centre de formation n'est cree. Absence de salle et lieu libre existant restent possibles.

## 8. Separation OI DPS / JSP

Le referentiel actuel comporte 8 sites physiques et 11 associations domaine/site. Le code collectif existant SDIS est conserve.
Les selections de preparation sont atomiques : DPS:G1/C1/B1/B2, DAP:Y1/Y2/Y3/Y4, JSP:G1/C1/B1. Les libelles visibles restent courts dans leur groupe.
La projection physique `ois` est conservee pour les consommateurs existants; `oiSelections` conserve les valeurs qualifiees et toutes les selections ambigues non resolues.

| Source | Normalise | Inchange | Ambigu | Precision |
| --- | ---: | ---: | ---: | --- |
| Programme 2027 (622) | 395 | 154 | 73 | 135 selections vides parmi les inchangees |
| XLSX 2026 (919) | 313 | 378 | 228 | 345 restent vides apres enrichissement; 33 OI demontres par Stat.Com |
| SCOPE 2026 (121) | 0 | 121 | 0 | Selections initiales vides; 58 qualifications ajoutees virtuellement via cibles canoniques, 63 restent vides |

"Inchange" ne veut pas dire "complet". Un domaine AUTO sans contexte suffisant ne permet pas de transformer aveuglement G1 en DPS:G1. La valeur ambigue est conservee, et la validation metier demande une qualification explicite.
Recette navigateur : independance DPS/JSP prouvee dans les deux sens pour G1 et C1, puis sauvegardee et relue. B1 couvert par les tests de valeurs et le meme controle groupe.
Aucune migration ni normalisation en base de production.

## 9. Public cible

`AUTO:CAND-EA` = Candidats machiniste EA, place a cote de Machiniste EA (`AUTO:5`) et distinct de celui-ci.
Catalogue partage, backend, fiche, resume, filtres et recherche sont couverts. La recherche utilise aussi les libelles, pas uniquement les codes internes.
Le groupe est exactement General (accentue dans l'interface), avec Recrue/Sapeur/Sapeur DPS/Sapeur DAP, sans changement de son contenu.
Recette : nouveau public coche, enregistre, recharge, visible dans le resume; filtre et recherche retrouvent l'unique occurrence locale correspondante.

## 10. UX fiche

Grille conservee : Activite pleine largeur; Date/Debut/Fin; Stat.Com/Lieu/Salle; Responsable; OI/Public cible.
Mesures navigateur : champs 35.996 px, checkbox 13.984 x 13.984 px et rayon 0, espacement intergroupes 26 px, lignes zebrees.
Largeurs CSS 1441/960/800/390 px : largeur scroll egale a la largeur du viewport; champs/actions contenus, aucune superposition globale.
Captures [desktop](captures/qv-business-consolidation/fiche-desktop.png), [960](captures/qv-business-consolidation/fiche-960.png), [800](captures/qv-business-consolidation/fiche-800.png), [390](captures/qv-business-consolidation/fiche-390.png).
La validation de reference metier est distinguee du workflow annuel : "Version metier validee" peut coexister avec "A controler" tant que l'occurrence annuelle n'est pas arbitree/publiee. Aucun statut de production n'est valide automatiquement.

## 11. Tests

| Suite | Resultat |
| --- | --- |
| scope-qv-business-consolidation-tests.js | 37/37 PASS |
| scope-qv-finalisation-local-tests.js | 31/31 PASS |
| scope-qv-history-sections-ux-tests.js | 28/28 PASS |
| scope-qv-agenda-programme-ux-final-1-tests.js | 8/8 PASS |
| scope-quo-vadis-calendar-vd-final-4-tests.js | PASS |
| scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js | PASS |
| scope-quo-vadis-core-1-tests.js | PASS |
| scope-quo-vadis-moa-consolidation-2-tests.js | PASS, idempotence/decisions humaines/rollback |

Le simulateur SQL de la derniere suite a ete adapte aux lectures de referentiels et aux cursus geres hors CI-DPS; les assertions de population et de protection restent intactes.
`node --check`, `npm run check`, `git diff --check` : PASS.
Journal complet local : `/private/tmp/qv-business-final-tests.log`.
Les tests executent le vrai service et le handler/RBAC avec une base simulee et une persistance JSON locale. Ils ne constituent pas un test d'ecriture PostgreSQL en production. La suite generale `npm run test:scope` n'a pas ete executee dans ce lot.

## 12. Recette navigateur

Serveur local isole : [ouvrir la recette](http://127.0.0.1:4391/scope.html#/quo-vadis/agenda-annuel).

| Scenario | Resultat et preuve |
| --- | --- |
| A. Agenda 2026 | PASS : janvier et 01-12 fevrier sans CTA; 13-16 fevrier N05a/N01a; 20 fevrier N04a/N03b; 27 fevrier N03a/N02b; vrai dossier Exercice JSP 1 accessible |
| B. Agenda 2027 | PASS : permanence de report 31.12.2026-04.01.2027 N04b/N03a; derniere 31.12.2027-03.01.2028 N02b/N02b; compteurs 622/488/363/134 preserves |
| C. Agenda 2028 | PASS : meme report N02b/N02b; 07.01 N01b/N01b; 29.12 N05a/N01a jusqu'au 02.01.2029; 9 feries et 7 periodes de vacances affiches |
| D. Fiche | PASS : Activite/Stat.Com/Lieu/Salle, sauvegarde, validation et reload; propagation tableau/mensuel/agenda sans renommage des autres occurrences |
| E. OI | PASS : G1 et C1 DPS/JSP independants dans les deux sens; selections qualifiees relues |
| F. Public | PASS : General exact, candidats EA distinct, resume/filtre/recherche persistants |
| Responsive | PASS : 1441/960/800/390 px, mesures et inspection visuelle desktop/mobile |

Le vrai evenement consulte conserve l'UUID `c6f283f9-f773-4591-a019-cb9d2869b0f4` et sa route historique. Aucune reference Excel n'est transformee en faux dossier SCOPE. Les donnees personnelles du dossier ne sont pas copiees dans les captures du depot.
Autres captures : [ancrage 2026](captures/qv-business-consolidation/agenda-2026-ancrage.png), [agenda 2028](captures/qv-business-consolidation/agenda-2028.png), [feries/vacances 2028](captures/qv-business-consolidation/calendrier-2028.png), [mensuel](captures/qv-business-consolidation/programme-mensuel.png), [filtre](captures/qv-business-consolidation/programme-filtre-public.png), [recherche](captures/qv-business-consolidation/programme-recherche-public.png).

## RECONDUCTION N -> N+1

Architecture existante reutilisee : programmes, obligations, metadata de preparation, propositions, consolidation et preservations des decisions humaines. Pas de nouvelle table ni architecture parallele.

`Enregistrer` conserve un brouillon. `Enregistrer et valider` conserve le snapshot metier avec annee, date de validation, champs de reference et liste des modifications effectives. Une modification ulterieure non validee ne remplace pas ce snapshot.
La generation N+1 cherche la derniere reference validee de chaque lignee avant l'annee cible, la traite avant les sources initiales, puis utilise les propositions et regles annuelles existantes pour les dates/heures.

Champs reconductibles exacts : `activityLabel`, `statCom`, `domain`, `family`, `oiCodes`, `publicCodes`, `responsibleLabel`, `responsableFonctionCode`, `locationLabel`, `lieuId`, `lieuLibre`, `roomLabel`, `salleTheorieId`, `sessionStructure`.
`sessionStructure` conserve les indices/nombres de sessions et occurrences ainsi que l'identite de definition; une session deja individualisee ne multiplie pas ses soeurs.

Non copies : `date`, `startTime`, `endTime`, horaires/date imposes de l'occurrence precedente, `statut`, `selected_proposal_id`, arbitrage annuel, validation annuelle, `humanDecision` annuel, annulation de l'annee, presences, excuses, dispenses et execution. Les dates et horaires proposes sont recalcules selon les regles annuelles.
La desactivation de production est, elle, durable : elle bloque la lignee meme si elle porte sur un descendant pas encore valide; une proposition future deja generee est neutralisee au recalcul. L'annulation annuelle ne bloque pas la recurrence future.

Priorite : derniere validation de N dans la lignee > validation anterieure dans la meme lignee > source initiale historique/canonique du mecanisme existant > decision humaine si aucune correspondance fiable. Aucune correspondance n'est inventee par simple egalite de libelle.
Filiation : `metadata.lineage.key`, `initialSource`, `initialSourceLine` lorsque demontree, `initialOccurrence`, `parentYear`, `parentOccurrence`, `referenceValidatedAt`. Les identifiants independants ne sont pas fusionnes; une correction d'occurrence ne modifie pas le catalogue.

Preuves des tests : libelle/Stat.Com/OI/public/responsable/lieu/salle modifies et valides en 2027, repris en 2028; recalcul 2028 identique; autres occurrences inchangees; brouillon 2027 ignore comme reference; correction 2028 validee reprise en 2029; fallback valide plus ancien; dates/workflow/presences non copies; protection des validations et desactivations; source et filiation conservees. PASS dans les 37 tests dedies.

## 13. Fichiers modifies

Preexistants suivis, diff identique au preflight : `assets/js/scope-api.js`, `netlify/functions/scope.js`, `netlify/lib/data/scope-qv-programme-2027.json`, les tests calendar-vd-final-4 et agenda-annuel-calendar-markers-repair-1. Le gros diff du programme canonique n'est PAS une modification de ce lot.

Preexistants suivis, completes dans ce lot : `assets/css/scope.css`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `netlify/lib/_scope-cta-rules.js`, `netlify/lib/_scope-quo-vadis-service.js`, `scripts/scope-qv-finalisation-local-tests.js`.

Fichiers suivis nouvellement modifies : `netlify/lib/_scope-quo-vadis-consolidation.js`, `scripts/scope-quo-vadis-moa-consolidation-2-tests.js`.

Fichiers non suivis preexistants completes : `scripts/scope-qv-local-fixture.js`, `scripts/scope-qv-local-recipe-server.js`.
Fichiers non suivis preexistants conserves : `deno.lock`, `netlify/lib/data/scope-qv-history-2026.json`, extracteur XLSX, suites locales precedent lot, rapports/captures precedents.

Nouveaux dans ce lot : `scripts/fixtures/scope-qv-business-references.json`, `scripts/scope-qv-business-consolidation-tests.js`, `scripts/scope-qv-business-audit.js`, `docs/scope-qv-business-audit.json`, `docs/scope-qv-cta-divergences.md`, ce rapport et `docs/captures/qv-business-consolidation/`.
Les captures PostgreSQL et fichiers de preparation de recette restent dans `/private/tmp`, pas dans les donnees de production.

## 14. Points restant reellement a decider

- Politique de correction des 53 evenements CTA SCOPE existants : OI incomplets, quatre intervalles et couverture Ascension. Aucun feu vert implicite pour les modifier.
- Qualification des 958 references historiques ambigues, dont les complementaires de personnel non representes exactement dans le catalogue. Valeurs brutes conservees.
- 18 instructions sans section demontree, 11 occurrences du code EMSEA absent du referentiel, et valeurs OI interdomaines non qualifiables. Pas de rattachement arbitraire.
- Les indicateurs de manque se recouvrent : 636 OI a qualifier, 698 publics non demontres, 163 domaines non demontres, 809 publics complementaires a qualifier. Ce ne sont pas des populations additionnelles.
- Le perimetre de verification est local. Les choix de mise en production, de publication des propositions futures et de correction historique restent hors de ce lot.

## 15. Git/GitHub final

Branche et HEAD inchanges; main GitHub verifie par `git ls-remote origin refs/heads/main`, meme SHA que le preflight. 13 fichiers suivis modifies au total, dont 11 deja modifies avant le lot; fichiers non suivis conserves.
Aucune indexation Git, aucun commit/push/PR/merge/deploiement, aucune migration ou ecriture de production.

COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DEPLOIEMENT : AUCUN
PRODUCTION : INCHANGEE

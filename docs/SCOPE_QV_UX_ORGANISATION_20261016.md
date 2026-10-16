# QUO VADIS — Lot unique UX et organisationnel du 16.10.2026

**État : DÉVELOPPÉ, TESTS TECHNIQUES CIBLÉS PASS ; RECETTE MOA PRODUCTION NON EFFECTUÉE. Programme annuel 2027 NON VALIDÉ.**

Le lot simplifie la fiche et déplace les contrôles transversaux existants dans un accès unique « Contrôle du programme ». L’encadré « Règle appliquée » et son visualiseur sont réutilisés. La synthèse distingue les occurrences des critères examinés ; le modèle d’harmonisation reste explicite. Les fonctions de remplacement reconnues suivent le classement de leur titulaire. Aucun moteur nominatif, paramètre stocké ou fait individuel n’est reconstruit.

Branche : `codex/scope-qv-ux-organisation-20261016`. Base main directement vérifiée : `0cb698e3c8dd7cf5d1bccf1ca4d091060d86dbe5` (#31). Le commit de livraison porte `[skip netlify]` ; aucun GO de fusion ou de déploiement n’est présumé.

## Sources et précontrôles

Mandat humain : « LOT UNIQUE UX ET ORGANISATIONNEL QUO VADIS 2027 — DÉCISIONS MOA DU 16.10.2026 », empreinte dans la [preuve de précontrôle](captures/qv-ux-organisation-20261016/preflight.json). Il remplace la disposition locale de trois sections de #31 ; les règles métier et protections acquises subsistent.

Sources consultées : [contexte maître](SCOPE_PROJECT_MASTER_CONTEXT.md), [protocole de reprise/livraison](project-context/SCOPE_REPRISE_ET_LIVRAISON.md), [canon](business-rules/quo-vadis-canonical-rules.md), [index des règles](project-context/SCOPE_INDEX_REGLES.md), mêmes [roadmap](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), [décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md) et [anomalies](audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md). Rapports et preuves pertinents [#29](SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md), [#30 OS/IndeX](SCOPE_OS_INDEX_UNIFORMISATION_20261016.md), [#31](SCOPE_QV_CORRECTIF_MOA_20261016.md). Les concordances OS 1.01/1.06 et décisions complémentaires de ces lots sont conservées ; aucune procédure contenue dans un OS n’est traitée comme autorisation de mutation.

GitHub vérifié directement : #29, #30 et #31 fusionnées, aucune PR ouverte au départ et à la revérification avant livraison. Production `scope-sdisnv`, site `6def8d4d-78c6-4112-bb76-6891df0e0a52`, déploiement **publié** `6ad1f1629c067a02cb67e1e9`, ready, même SHA `0cb698e3…`, publication le 16.10 à 09:42:54.379 UTC / 11:42:54.379 Europe/Zurich. Lecture des seules métadonnées GitHub/Netlify, aucun appel applicatif métier ou SQL. Les observations précédentes des fiches publiées sont capitalisées ; leur contenu vivant n’a pas été relu.

Le checkout partagé contient des travaux étrangers : ils n’ont pas été modifiés ni incorporés. Réutilisation d’un worktree attaché propre et création de la branche depuis main vérifié. Les écarts de cette PR portent sur quatre fichiers applicatifs, deux scripts de tests nouveaux et la documentation/preuve ciblée.

## Existant, modifications et portée

| Besoin | Existant réutilisé | Modification du lot |
|---|---|---|
| Navigation indépendante | Router hash, shell/navigation QV, chargeur du Programme et filtres existants ; aucun accès équivalent au comparateur par types hors fiche | Une route `controle-programme`, une entrée « Contrôle du programme » ; contexte Programme conservé au retour |
| Fiche lisible | Informations/planification, préparation, sauvegarde, validation, révision et historique existants | Formulaires locaux d’assignation/conformité/harmonisation retirés ; lien contextuel sobre vers la même vue transversale |
| Conditions applicables | Profils `qvProgrammeAssignmentProfile`, règles `qvProgrammeFieldRule`, sélection du visualiseur existant | Conditions en lecture seule dans le seul encadré existant ; mêmes action et contenu détaillé, libellés humains |
| États | Encadrés et contrôles préparatoires/annuels existants | Palette QV bleu/jaune/rouge avec motif ; non-conformité distincte du blocage, absence de règle sans blocage fictif |
| Conformité/harmonisation | Comparateur `qvProgrammeCorrectionProposals` de #31, règles et compatibilités | Métadonnée de blocage explicite, lecture des blocages préparatoires déjà calculés ; source enregistrée exigée ; aucune nouvelle règle de correction |
| Synthèse et détails | Résultats et tableau détaillé de #31, formatteurs métier et liens fiche | Comptes par type, occurrences distinctes et critères séparés ; détails construits seulement à l’ouverture ; date/OI/session pertinentes |
| Modèle volontaire | Prévisualisation #31 et paramètres de source/types/champs | Recherche du modèle enregistré, présélection contextuelle, identité visible et invalidation des anciennes prévisualisations |
| Fonctions | Référentiel Personnel commun, tri hiérarchique/alphabet et alias | Six métadonnées groupe/rang alignées avec le parent reconnu ; codes et données individuelles inchangés |

L’accès « Règles » garde les contrôles de validation annuelle déjà présents. La nouvelle vue les signale et y renvoie : aucun second moteur annuel. Les filtres activité/famille/OI servent à choisir des **types** ; le contrôle couvre ensuite toutes les occurrences/sessions actives de ces types, conformément au texte d’aide. Un blocage annuel global sans type n’est pas distribué artificiellement dans les comptes.

La définition d’un modèle enregistré utilise les identités existantes de préparation ou d’événement lié. Une validation affichée sans identité persistée ne suffit pas. Une différence volontaire demeure une reprise volontaire, une incompatibilité n’est jamais recommandée, les règles absentes restent non définies. Aucun bouton d’application groupée n’est ajouté. Les paramètres d’assignation stockés restent accessibles au comparateur et à l’API ; une sauvegarde sans édition n’envoie pas ces champs et conserve la valeur existante selon le contrat acquis.

L’encadré décrit les règles confirmées de CAR/TRUCK/TP9, DPS, formations groupées, PR/PAPR et rôles associés, l’exception PIONNIER FOBA 3, les conditions de conduite et d’évaluation applicables. Il ne duplique pas les valeurs effectives date/horaire/lieu/OI/public/responsable. Son bleu porte sur la complétude des informations de règle pour les contrôles effectués ; il ne certifie ni assignation nominative ni conformité globale de l’occurrence. Les champs de planning non renseignés restent leurs contrôles métier existants.

Six couples contrôlés : Rempl. Commandant → Commandant ; Rempl. chef site → Chef site ; Rempl. chef section → Chef section ; Rempl. chef FOBA → Chef FOBA ; Rempl. chef PR → Chef PR ; Rempl. responsable VPC → Responsable VPC. Même groupe/rang puis alphabet. « Rempl. chef site » rejoint Commandement et responsables. Aucun changement de grade/échelon/code/alias, aucune fonction nouvelle ni affectation automatique ; références JSP retirées et candidats adjacents conservés.

## Recette technique ciblée et preuves

Exécution locale sur fixtures synthétiques uniquement, le 16.10.2026. Aucun test acquis PR20–31 relancé. [Résultats structurés](captures/qv-ux-organisation-20261016/targeted-results.json).

| Exigence | Scénario ciblé / composant | Résultat et preuve | Acceptation MOA |
|---|---|---|---|
| Navigation / contexte | Route année/modèle, entrée unique, passage Programme → fiche → contrôle → retour, filtres et mode mensuel | PASS, tests et Chrome | En attente production |
| Fiche / intégrité | Absence des trois formulaires, encadré/visualiseur uniques ; sauvegarde existante interceptée sans paramètres ni évaluation ajoutés | PASS, [fiche 1440](captures/qv-ux-organisation-20261016/fiche-1440.png) | En attente production |
| États | Bleu règle complète, jaune règle absente/partielle, rouge préparation interdite ; prérequis annuel indispensable absent ; validation individuelle seule sans faux bleu | PASS, tests et trois tons Chrome | En attente production |
| Synthèse | Quatre occurrences, vingt-quatre critères ; résultats disponibles seulement ; critère préparatoire bloquant et exception respectée | PASS, [synthèse](captures/qv-ux-organisation-20261016/synthese-1440.png) | En attente production |
| Détails | Aucun tableau détaillé avant ouverture ; 24 critères à l’ouverture, date/OI/session, lien fiche, libellés, carré 8×8, zébrage | PASS, [détails](captures/qv-ux-organisation-20261016/details-1440.png) | En attente production |
| Modèle / compatibilité | Source JSP présélectionnée sans action, recherche d’un modèle enregistré, changement invalidant résultats, reprise JSP→TP9 incompatible | PASS, [vue transversale](captures/qv-ux-organisation-20261016/controle-1440.png) | En attente production |
| Moteur conservé | Comparaison directe au module main #31 sur les mêmes cas, hors nouvelle métadonnée d’affichage ; aucune campagne historique | PASS, tests ciblés | En attente production |
| Dictionnaire | Six couples parent/remplaçant ; listes de codes et grades identiques à main ; références JSP retirées conservées | PASS, test ciblé | En attente production |
| Témoin et données | Fixture des paramètres MOA protégés, stockage/ID/lignée/version/historique/liaison inchangés après rendu et contrôle | PASS synthétique uniquement, aucune lecture/mutation du témoin vivant | Validation individuelle antérieure conservée ; aucune revalidation |
| UX / permissions | 1440, 1024, 390 : zéro chevauchement mesuré, panneau et liens contenus ; permissions de gestion existantes respectées | PASS Chrome, [390](captures/qv-ux-organisation-20261016/controle-390.png) | En attente production |

**15/15 tests automatisés ciblés et 12/12 parcours Chrome PASS.** Les 12 parcours regroupent plusieurs assertions ; ils ne représentent pas 12 recettes MOA. Le scénario navigateur sert le shell réel avec des réponses API simulées, logos du dépôt et réseau intégralement intercepté sous `scope-ux.test` : zéro requête externe, zéro écriture de production. L’unique essai de sauvegarde est intercepté et renvoie volontairement `updated:false` ; il vérifie le payload sans persistance. La notification attendue est fermée avant captures. Aucun rollback de données n’est nécessaire pour ces tests sans stockage.

Exécution reproductible depuis la racine du dépôt :

```sh
node --test scripts/scope-qv-ux-organisation-20261016-tests.js
node scripts/scope-qv-ux-organisation-20261016-browser.js
```

Le deuxième script requiert Playwright disponible dans le runtime et Chrome (option `SCOPE_CHROME_PATH` si nécessaire), avec `NODE_PATH` adapté à l’installation. `SCOPE_UX_SCREENSHOT_DIR` désigne un dossier de sortie existant optionnel. Les tests de comparaison requièrent l’objet Git de la base main indiqué ci-dessus. Vérifications statiques : syntaxe des cinq fichiers JavaScript concernés, diff sans erreur, liens ajoutés, neuf empreintes de provenance, neuf colonnes ToDo et quatorze champs des deux fiches roadmap ; résultats dans la même preuve ciblée.

## Données protégées, limites et risques

Le témoin **Séance Direction JSP 010JSP.006 du 18.02.2027, 18:30–20:30**, famille JSP, OI JSP G1/C1/B1, Chef JSP responsable, publics Chef formation/Chef site/Resp formation, évaluation Non, est protégé selon le mandat humain. Sa validation individuelle, sa publication/liaison et son historique ne sont ni rejoués ni modifiés. La fixture n’exporte aucune donnée de production et ne crée aucun NIP/personnel.

Aucun fichier backend, migration, RLS, Okta, configuration Netlify, moteur nominatif, affectation, qualification, spécialisation, présence ou événement opérationnel modifié. Aucun appel métier vivant, écriture, migration ou publication annuelle. Les fonctions a.i., OI/affectations datés, populations FOBA, quotas PR et DPS, auxiliaires, dispenses, candidatures et règles d’évaluation acquises gardent leur portée antérieure. La suppression du formulaire local ne supprime pas ses paramètres historiques.

Les résultats sont techniques : persistance réelle, Safari, session Okta réelle et comportement sur le Programme vivant ne sont pas validés par ces fixtures. La construction différée limite le volume initial du tableau, sans benchmark du Programme complet. Les règles nominatives absentes et la source réelle des faits individuels restent leurs dépendances antérieures. Le rapport annuel exhaustif demandé dans la roadmap n’est pas déclaré achevé ; la nouvelle synthèse couvre les critères réellement disponibles. Le risque principal est le déplacement d’accès et le rendu des règles/données historiques sur la version publiée : recette MOA ciblée nécessaire. Aucun nouvel arbitrage indispensable au lot UX n’a été identifié.

Les changements applicatifs se limitent à `scope-ui.js`, `scope-ui-logic.js`, `scope-personnel-referentials.js` et `scope.css` ; deux scripts ciblés nouveaux. Capitalisation dans les mêmes canon, contexte, registres, roadmap et ToDo ; provenance historique conservée. Le présent document est une preuve de livraison, pas un second backlog.

Suite imposée : PR sans fusion automatique → **GO MOA fusion distinct** → **GO déploiement distinct** → vérification du SHA réellement publié → recette MOA sur [SCOPE Online de production](https://scope-sdisnv.netlify.app) → **PASS MOA explicite avant clôture**. Aucune de ces autorisations n’est déduite des tests. **Programme annuel 2027 NON VALIDÉ.**

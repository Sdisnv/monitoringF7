# SCOPE — Correctif unique post-recette MOA #29 / #30, 16.10.2026

**PASS TECHNIQUE LOCAL ; NOUVELLE RECETTE MOA PRODUCTION EN ATTENTE. Programme annuel 2027 NON VALIDÉ.** Branche `codex/scope-qv-correctif-moa-20261016`, base main vérifiée `8a11b2e50ff47932628733b3dbc9715bfe6822b2`. Une seule PR, sans fusion ou déploiement automatique. Le rapport décrit cette livraison ciblée ; les tâches restent dans les mêmes roadmap/ToDo.

## Contrôles directs et sources

GitHub : #30 fusionnée le 16.10.2026 à 08:11:45 UTC, #29 à 05:56:13 UTC, #28 le 15.10 à 15:03:47 UTC ; aucune PR ouverte au départ. Site exact `scope-sdisnv` / `6def8d4d-78c6-4112-bb76-6891df0e0a52`, déploiement publié `6ad1de3ada52eb7d16b98738`, ready, SHA identique à main, publié le 16.10 à 08:21:12.013 UTC / 10:21:12.013 Europe/Zurich. [Précontrôle minimal](captures/qv-correctif-moa-20261016/preflight.json). Le checkout partagé conserve ses travaux étrangers ; le worktree propre attaché est réutilisé sur nouvelle branche depuis main vérifié.

Mandat humain « LOT CORRECTIF UNIQUE POST-RECETTE MOA PR #29 / PR #30 », 16.10.2026. Contexte maître, protocole de reprise/livraison, canon, index des règles, vues consolidées et registres existants relus pour ce périmètre. Rapports/preuves [#24](SCOPE_QV_PUBLICS_MOA_20261015.md), [#29](SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md), [#30](SCOPE_OS_INDEX_UNIFORMISATION_20261016.md) consultés, pas rejoués. OS 1.01 v1.1/OS 1.06 v1.4 restent les sources institutionnelles lues dans le lot précédent et épinglées par leur concordance. La décision post-recette actuelle prévaut sur la capture ayant introduit Chef formation JSP et sur son classement en #30. Aucun nouvel arbitrage inventé.

## Causes et corrections

| Constat | Existant réutilisé et correction |
|---|---|
| Chef formation JSP proposé, Resp formation mal classé | Deux métadonnées du référentiel Personnel existant modifiées : retrait actif avec identité historique intacte ; Resp formation dans Commandement et responsables. Aucun nouveau code, équivalence ou fait personnel |
| Recherche JSP omettant Chef site | Filtre existant enrichi des alias et contextes institutionnels, sans dupliquer Chef site ou ajouter de sélection OI |
| Fiche JSP considérée comme référence TP9 | Même fonction de comparaison, avec finalité explicite. Conformité : aucune lecture des champs de la fiche ouverte comme référence. Harmonisation : source enregistrée, types et champs choisis explicitement ; ancien appel avec valeurs arbitraires refusé |
| Différence présentée comme anomalie | Quatre états de conformité et source de règle explicite ; absence de règle sans proposition. Public minimal d’un profil distingué d’une extraction nominative ou validation de fiche complète |
| Reprise incompatible | Contrôle des profils existants, OI/domaines, familles proposées et évaluation préparatoire ; incompatibilité explicitée, jamais recommandée ; compatibilité inconnue à arbitrer |
| JSON, codes, chevauchements | Trois sections dans le même panneau ; contrôles alignés et espacés, tableau zébré en cinq colonnes, libellés métier, états carré 8 × 8 ; actions désactivées et indications contextuelles, prévisualisation invalidée si le périmètre change |

Les sauvegardes, validations, versions/révisions, journaux, publication/liaisons, présences, contraintes et permissions existantes restent les chemins applicatifs. Aucun module serveur, schéma, migration, RLS/Okta, configuration Netlify ni moteur nominatif n’est modifié. Aucun bouton d’application groupée ni exécuteur ajouté.

## Règles réellement vérifiées et limites

La conformité réutilise les identifiants exacts de profils déjà reconnus, les cours préparatoires connus, la proposition DAP existante conditionnée par définition/nature/Stat.Com/OI et sept définitions DPS/DAP déjà présentes dans le programme canonique. Les règles d’évaluation s’appliquent aux PR 1–4/groupées DPS-DAP reconnus et à ces exercices, indépendamment de la fiche ouverte. Les publics CAR/TRUCK/TP9 sont contrôlés sur les critères explicites acquis ; les autres fonctions conservées ne sont pas réputées éligibles nominativement. Le profil absent reste à confirmer ; la responsabilité enregistrée n’est pas supprimée. Aucun moteur parallèle ou référentiel supplémentaire.

Les champs sans règle applicable restent « Règle métier non définie », notamment domaine/famille/qualification/évaluation TP9 en l’absence de règle confirmée pour ce champ. Aucun défaut de la fiche modèle ne fait autorité. Les types nouveaux, règles manquantes ou compatibilités inconnues exigent une définition/arbitrage MOA avant une correction recommandée. Le contrôle n’est pas un rapport annuel exhaustif et ne valide pas les fiches ou le Programme.

La résolution nominative, source des faits individuels datés, disponibilités et compositions annuelles restent hors lot. Les profils TP9 acquis sont préservés ; aucun autre module du cursus n’est reclassé par analogie. Non-évaluable reste consultable/assignable ; auxiliaires hors effectifs/statistiques, dispenses et présences historiques préservées.

## Témoin protégé

Le mandat fournit Séance Direction JSP **010JSP.006**, 18.02.2027 18:30–20:30, famille JSP, OI JSP G1/C1/B1, responsable Chef JSP, publics Chef formation/Chef site/Resp formation, évaluation Non. Selon la MOA, validation individuelle acquise, fiche publiée et liée. Aucune lecture ou modification SQL de cette fiche, création d’événement ou revalidation dans ce lot. Les fixtures reprennent uniquement ces paramètres non nominatifs avec identifiants synthétiques ; elles conservent byte pour byte IDs, version, code, lien et historique. Le Stat.Com non fourni n’est pas inventé. Cela ne constitue pas une nouvelle vérification de la donnée persistée de production.

## Matrice ciblée et preuves

[Résultats structurés et empreintes](captures/qv-correctif-moa-20261016/targeted-results.json). `node --test scripts/scope-qv-correctif-moa-20261016-tests.js` : **14 tests PASS**. `node scripts/scope-qv-correctif-moa-20261016-browser.js` avec Playwright et Chrome disponibles : **11 scénarios PASS**. Toutes les requêtes navigateur sont interceptées ; un document synthétique, aucun réseau externe ni base. Une sauvegarde de fixture non publiée passe par un faux client en mémoire, jamais vers un serveur ; champs intacts omis. Pas de mutation réelle à annuler. Aucune recette PR20–27 relancée, aucune preuve antérieure reconstruite.

| Exigence | Contrôle nouveau / résultat |
|---|---|
| JSP / codes | Chef formation JSP hors nouveaux choix, historique sélectionné conservé sans substitution ; mêmes identifiants institutionnels et grades qu’à main ; Resp formation classé et Chef site unique |
| Recherche / tri | JSP retrouve les fonctions communes applicables ; comparateur existant, candidats adjacents et résumé indépendant de l’ordre des clics |
| Cas majeur JSP → quatre TP9 | Contrôle sans F7/JSP/Chef formation/Non proposés depuis la source ; règles inconnues non définies ; source arbitraire refusée |
| Évaluation | PR/groupes/exercices reconnus selon leur propre règle ; préparatoire interdit ; aucune propagation de la valeur JSP vers TP9 |
| Harmonisation | Source/type/champ obligatoires, incompatibilité métier non recommandée, compatibilité inconnue à arbitrer, absence de différence explicite, aucun enregistrement |
| UX / accès | Trois sections, libellés métier, aucun JSON/code technique visible dans le panneau ; aucun dialogue de prérequis ; anciens résultats effacés au changement ; actions inactives sans les permissions existantes |
| Disposition | Mesures à 1440/1024/390 pixels : aucun chevauchement label/champ ou case/libellé, panneau contenu, défilement de tableau confiné, carré 8 × 8 ; captures inspectées |
| Intégrité | Témoin synthétique et jeux d’entrée inchangés ; IDs/grades/codes, lien/historique/version conservés ; aucune écriture de production ; aucun writer/backend modifié |

Captures Chrome synthétiques : [A — assignations](captures/qv-correctif-moa-20261016/assignations-1440.png), [B — conformité](captures/qv-correctif-moa-20261016/conformite-1440.png), [C — harmonisation](captures/qv-correctif-moa-20261016/harmonisation-1440.png), [vue étroite](captures/qv-correctif-moa-20261016/panel-390.png). Ce sont des preuves techniques locales, jamais des PASS MOA production. Safari, profils réels, sauvegarde/révision persistante et version publiée du correctif restent à recetter uniquement après autorisation adaptée.

## Fichiers et livraison

Quatre fichiers applicatifs : `assets/js/scope-personnel-referentials.js`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `assets/css/scope.css`. Deux nouveaux scripts ciblés ; présent rapport et preuves. Canon, contexte maître, décisions, anomalies, roadmap/ToDo existants amendés ; manifeste de provenance mis à jour en conservant les empreintes antérieures. Aucun second backlog, configuration ou fichier de données de production.

Risques résiduels : les tables deviennent longues quand de nombreux types sont contrôlés ; le défilement horizontal est confiné sur écran étroit. Les règles non établies restent volontairement non définies et l’harmonisation ne les transforme pas en validation métier. Le contrat de la fonction pure de proposition remplace l’ancien transfert implicite ; les anciens scripts/preuves de #29 restent datés, leurs attentes sur ce comportement ne sont pas présentées comme acquises après correctif. Aucune mutation/API groupée n’existe. Retour arrière de code possible par réversion du commit sous autorisation de fusion/déploiement ; aucune restauration de données nécessaire pour cette PR sans écriture.

Commit et titre de PR portent `[skip netlify]`, sans changement de configuration. Aucune fusion, aucun déploiement, aucune modification des données de production ou du témoin JSP. La livraison technique ne clôture aucune anomalie MOA.

**Suite obligatoire : GO fusion distinct → GO déploiement distinct → vérification du SHA réellement publié → recette MOA ciblée sur https://scope-sdisnv.netlify.app → PASS MOA explicite avant clôture. Programme annuel QUO VADIS 2027 NON VALIDÉ.**

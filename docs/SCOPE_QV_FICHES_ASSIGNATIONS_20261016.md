# SCOPE — Fiches QV2027 et préparation des assignations, 16.10.2026

**Livraison technique en PR, recette MOA production EN ATTENTE. Programme annuel2027 NON VALIDÉ.** Mission humaine du lot prioritaire, complétée par les réponses TP9 et effectif PR ; [règles détaillées](business-rules/quo-vadis-canonical-rules.md#complément-moa--lot-prioritaire-fiches-et-préparation-des-assignations-16102026), [décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md#lot-prioritaire-fiches-et-assignations--16102026). Ce rapport est une preuve de livraison, pas un nouveau backlog.

Branche : `codex/scope-qv-fiches-assignations-20261016`. Base main vérifiée directement : `b6054b9a9ccd94a7c7e7104dbfbc86c6de111d1a` (#28 documentaire). Au précontrôle et au contrôle final avant PR : aucune PR ouverte ; #24–28 fusionnées. Production inchangée : `scope-sdisnv`, déploiement publié `6ad0d08255cda461366136f2`, ready, SHA fonctionnel #27 `3bdad82029ef79ea721bcf4043a5bb47e4d86764`, publication15.10.2026 13:09:59.769UTC. L’écart main/production est la capitalisation documentaire #28, sans changement fonctionnel publié.

## Existant réutilisé et manque constaté

| Besoin | Existant relu / réutilisé | Adaptation ciblée et portée |
|---|---|---|
| Publics / fonctions | Catalogue commun, valeurs descriptives, alias et sélecteur #24/#25 ; moteur C2 `HAS_PERSON_FUNCTION` limité auparavant aux fonctions DPS historiques | Quatre identités communes avec contexte applicable ; choix selon les OI existants ; prédicat optionnel daté domaine/OI/site/section ; anciennes règles et empreintes conservées |
| Faits individuels | Affectations datées `scope_affectations` ; pas de relation fonction–domaine–OI datée ; PRINCIPAL/SECONDAIRE est un rôle d’affectation | Contrat de faits confirmés étendu, pas de nouvelle table ni déduction. Source réelle encore à arbitrer, résolution réelle NON LIVRÉE |
| Qualifications / candidatures | Champs de qualification/spécialisation et cursus ; prédicat C2 `HAS_COMPETENCE` | Inclusion explicite des candidatures confirmées/datées ; aucune qualification créée ; profils CAR/TRUCK/TP9 sans réécriture des fiches |
| Préparation / événements | Relations de préparation et groupées #26 ; identités/lignées ; sauvegarde, validation, révision motivée et journal existants | Paramètre optionnel `assignmentParameters` dans les métadonnées et snapshots existants ; changement majeur de révision ; aucun nouvel endpoint ni moteur de publication |
| Évaluation | `participationEvaluation` de la fiche et défaut futur de catalogue, décisions individuelles reconduites | Propositions par types sélectionnés sur occurrences/sessions ; refus serveur d’activation/validation des cours préparatoires connus ; ancienne valeur non modifiée par une sauvegarde sans changement |
| Assignations | `evaluateAssignmentConstraints`, présences, dispenses, participation et déduplication des cycles existants | `prepareAssignmentReview`, extension en lecture seule de ce même module : contraintes/capacités/publics/alternatives/échelons ; aucun générateur ou writer parallèle |
| Contrôle qualité | Contrôles annuels, préparation et révision existants | Prévisualisation des différences domaine/famille/public/qualifications-spécialisations/évaluation/paramètres, sans sauvegarde groupée ; fiche cible et validation requise visibles |

La fiche propose le profil reconnu sans le confirmer automatiquement. L’utilisateur confirme le profil, puis enregistre dans le workflow existant. Responsable ne crée aucune assignation ; une obligation exige une règle spécifique identifiée. Le choix d’OI reste unique dans la fiche. Les champs d’évaluation/paramètres non touchés ne sont pas ajoutés implicitement au payload. Les décisions historiques, y compris codes reconnus pour affichage, restent brutes dans la sauvegarde.

Le contrôle préparatoire consomme uniquement les faits explicitement fournis ; il ne charge pas de données nominatives ni n’est raccordé à une nouvelle API de personnes. Il marque les entrées absentes INCOMPLETE, contrôle les personnes obligatoires/non concernées, les collisions et indisponibilités connues, prépare des alternatives sous arbitrage et respecte les sessions prioritaires/non déplaçables. Il ne réorganise pas des assignations existantes. Les moteurs d’assignation et déplacements manuels existants restent les seuls chemins d’exécution futurs.

## Scénarios techniques nouveaux et dépendances

[Résultats structurés](captures/qv-fiches-assignations/targeted-results.json). Tests locaux sur fixtures non nominatives et fausse base ne permettant que les SELECT attendus ; aucun NIP, clone privé, appel aux données ou test avec écriture réelle. Il n’y a donc aucune mutation réelle à annuler pour cette preuve. Le navigateur n’accède qu’à un document synthétique intercepté ; aucun réseau externe. Ces preuves sont **techniques et locales, jamais une recette MOA**.

| Exigence / dépendance | Scénario et résultat technique16.10 | Recette MOA production |
|---|---|---|
| T-07 / fonctions communes | Identités sans doublon, OI qualifiés, même fait daté/site/section ; Chef JSP + Chef site JSP et Chef DAP + Chef section DAP ; absence/fin/date future/croisement DPS-DAP refusés | EN ATTENTE ; source réelle manquante |
| Compatibilité C2 / données historiques | Comparaison de normalisation, empreinte et explication avec le module de main `b6054b9` ; sorties historiques identiques sans options nouvelles ; aucune donnée modifiée | EN ATTENTE |
| Candidatures / TP9 | CAR VL/TRUCK PL + candidatures confirmées datées ; TP9 1.x deux conducteurs, 2.x conducteurs validés ; aucun rapprochement au titre seul ni qualification synthétique | EN ATTENTE |
| T-04 / corrections et évaluation | Toutes les occurrences/sessions des types sélectionnés, incluant DPS/DAP multi-OI ; avant/après/impact/validation ; annulations exclues ; profils incompatibles INTERDIT ; cours préparatoires activés/validés refusés avant écriture | EN ATTENTE |
| T-08 / instructions et groupes | G1 seul plafonné 8/demi-section,16/section ; aucun quota C1/B1/B2 ; DPS6/DAP2 ; proportionnalité réelle explicitement non vérifiée | EN ATTENTE |
| T-08 / PR | Préposé APR dans les 12 et dans le public ;13 bloqué ; surveillant hors effectif ; six surveillants distincts, un/session ; formateurs manuels toutes sessions ; exemptions et auxiliaires conservés/exclus selon règle | EN ATTENTE |
| Collision / alternatives | Réutilisation du contrôleur existant ; non-concernés, absences obligatoires, conflits ; alternatives écartées si indisponible/pleine/prioritaire/verrouillée ; responsable obligatoire seulement sous règle explicite | EN ATTENTE |
| Versions / journaux / reconduction | Champ optionnel dans révision majeure et snapshot existants ; snapshots absents identiques ; codes/lignées/Stat.Com non changés par ce lot ; aucun chemin de suppression de présence ajouté | EN ATTENTE pour workflow persistant réel |
| Permissions / fiche | Réutilisation `references:manage`, champ disabled sans permission ; aucun changement RLS/Okta ; HTML échappé ; liens de fiches corrects | EN ATTENTE pour profils réels |
| Navigateur | Six scénarios Chrome isolé : propositions sans enregistrement, OI individuels/groupés rafraîchissant les fonctions, codes/libellés historiques conservés, sauvegarde explicite via le client existant, paramètres non touchés omis, aucun défaut JS/réseau | EN ATTENTE |

Commande unitaire : `node --test scripts/scope-qv-fiches-assignations-20261016-tests.js` : **24/24 PASS**. Dépendance `pg` chargée depuis les dépendances existantes, sans connexion à une base. Commande navigateur : `node scripts/scope-qv-fiches-assignations-20261016-browser.js` avec Playwright disponible et `SCOPE_CHROME_PATH` vers Chrome si nécessaire : **6/6 PASS**. Aucun ancien script de campagne PR20–27 relancé. Vérification syntaxique des fichiers JS modifiés, diff et liens documentaires ciblés : PASS.

## Limites et décisions restantes dans les vues uniques

- T-07 : source, mode de confirmation, saisie/import et persistance des faits individuels fonctions/candidatures encore à arbitrer. Le contrat testé n’est pas une extraction nominative opérationnelle.
- T-08 : compositions annuelles des sections/demi-sections, faits d’échelons/disponibilités et proportion réelle par public/OI à fournir ; vacances Permanent et ProgJour futures, ProgJour suspendu. Aucune optimisation/répartition automatique développée dans ce lot.
- T-04 : les propositions n’ont pas de bouton d’application groupée. Chaque correction passe par la fiche, son contrôle serveur et la validation/révision existante ; aucune valeur de production n’est corrigée par cette PR. Les préparations sont identifiées par leurs IDs connus ; un nouveau type manuel ambigu exige qualification explicite, sans classification automatique par titre.
- La clarification « surveillant hors effectif » ne change pas son régime de contribution statistique historique. Les règles existantes d’unicité par exercice et exclusion des auxiliaires sont réutilisées.
- Les tests sur fausse base et navigateur synthétique ne démontrent pas une sauvegarde de production, une recette Safari ni l’acceptation métier d’une version publiée. Aucun PASS MOA de ce lot n’a été reçu.

## Livraison et passage en recette

Fichiers applicatifs : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `netlify/lib/_scope-public-engine.js`, `netlify/lib/_scope-assignment-constraints.js`, `netlify/lib/_scope-qv-programme-revisions.js`, `netlify/lib/_scope-quo-vadis-consolidation.js`, `netlify/lib/_scope-quo-vadis-service.js`. Deux scripts ciblés, ce rapport et les preuves ; canon, contexte/protocole et vues roadmap/ToDo/décisions existantes actualisés. Registre des anomalies inchangé : aucun nouvel incident de production démontré et aucun acquis PR20–27 rouvert. Provenance initiale conservée dans le manifeste amendé.

Une branche, un lot et une PR ; `[skip netlify]` dans commit et titre pour respecter l’absence de déploiement automatique, configuration inchangée. Travaux étrangers du checkout partagé préservés. Aucune migration, modification de données de production, RLS/Okta, déploiement ou publication annuelle. Les contrôles directs GitHub/Netlify ne nécessitent pas de GET applicatif potentiellement initialisant.

**Suite obligatoire :** revue de la PR → GO MOA de fusion → fusion autorisée → GO déploiement distinct → déploiement autorisé et contrôle du SHA publié → recette MOA sur [SCOPE Online](https://scope-sdisnv.netlify.app) → PASS MOA explicite avant clôture du lot. Vérifier les seuls parcours modifiés, valeurs historiques, identités, versions/journaux, présences/participations et continuité de la saisie sur cette version. Toute écriture de test en production exige autorisation explicite et plan d’intégrité/rollback contrôlé au préalable ; ne jamais restaurer globalement des données en écrasant la saisie récente. Aucun de ces GO/PASS n’est acquis par la présente livraison.

# SCOPE / QUO VADIS : Lot Consolidé MOA Du 15.10.2026

## Référence Et Périmètre

Main GitHub et commit réellement publié sur scope-sdisnv contrôlés directement :
`fba5bda6e98956458530cf1f947640e9341a57c5` (PR #20 fusionnée).
Déploiement publié : `6ad060db3870ae4aaefd2344`, 15.10.2026 à 05:13:32 UTC.
Branche unique : `codex/scope-qv-moa-consolide-20261015`.
Ce rapport ne valide pas le programme annuel. Aucune fusion ni livraison applicative autorisée.

## Corrections Applicatives

- Onze familles dans l'ordre MOA, Permanent disponible en fiche, filtres, statistiques et reconduction.
- Aucun reclassement automatique vers Permanent. Absence « — » en dernier, filtre conservé.
- En-têtes Famille Organisation / Formation gris clair et non sélectionnables, rendus communs.
- Cursus et spécialisations regroupés selon leurs rattachements explicites existants, tri français.
- Sans rattachement démontré : Autres cursus / Autres spécialisations. Identifiants inchangés.
- SDIS avant DPS, DAP et JSP dans le filtre OI, codes qualifiés et sélections existantes conservés.
- Propositions DAP limitées aux définitions canoniques exercices/cadres 1 à 4, OI et Stat.Com concordants.
- Lecture strictement limitée de la décision de famille sur un instantané automatique ; pas de reprise
  des autres champs de préparation et aucune conversion en décision humaine complète.

CI-DPS et CI-DAP ont actuellement `domain_code` absent : ils restent disponibles dans Autres cursus.
C-GROUPE est rattaché à FOCA ; TP9, COND-VL, MEA et ELEVATEUR-S2 à AUTO ; OFSI-BASE et
OPERATEUR-VPC à FOSPEC ; PAPR à PR ; JSP à JSP. Aucun référentiel n'a été réécrit.

## Données Corrigées Sous GO MOA

Préflight en lecture seule à 05:37:12 UTC : 32 identifiants canoniques, OI, Stat.Com, valeurs actuelles
et empreintes complètes. Le plan DAP 12 de PR #20 est réutilisé en excluant ses quatre exercices 2
déjà corrigés et en conservant ses huit exercices 3/4 ; les huit cadres 3/4 sont désormais
explicitement autorisés. Les cadres 1/2 déjà conformes ne sont pas modifiés.
Résultat effectif : **16 familles Exercice vers DAP, 16 déjà DAP sans modification, zéro cible bloquée**.
Transaction SQL gardée, commit à 05:48:38 UTC, relecture indépendante en lecture seule à 05:48:54 UTC :
32 familles DAP enregistrées. Les dates ci-dessous sont les valeurs conservées, pas des propositions.

| Identifiant existant | Activité | OI | Date conservée | Stat.Com conservé | Famille avant / après |
| --- | --- | --- | --- | --- | --- |
| 6543bf35-1cc0-494c-af9b-cfd5c342b733 | Cours de cadres exercice DAP 3 | DAP:Y1 | 2027-07-28 | 013Y1 | Exercice → DAP |
| 7b01d84e-de8d-4b97-aadd-b7f43aca983a | Cours de cadres exercice DAP 4 | DAP:Y1 | 2027-09-29 | 013Y1 | Exercice → DAP |
| 3989b128-98d6-4f2e-af09-a0e03a87b800 | Exercice DAP 3 | DAP:Y1 | 2027-09-02 | 013Y1 | Exercice → DAP |
| a6de28f5-6a07-4686-a13d-317ac0e3b971 | Exercice DAP 4 | DAP:Y1 | 2027-11-06 | 013Y1 | Exercice → DAP |
| 86d373ff-017f-4e24-a5cb-d8862d2a2845 | Cours de cadres exercice DAP 3 | DAP:Y2 | 2027-08-25 | 013Y2 | Exercice → DAP |
| 799ea7da-4541-4a1f-a502-2b5630ac8eaf | Cours de cadres exercice DAP 4 | DAP:Y2 | Non fixée | 013Y2 | Exercice → DAP |
| 601293c1-8027-41b2-a658-1abc578e5a59 | Exercice DAP 3 | DAP:Y2 | 2027-09-08 | 013Y2 | Exercice → DAP |
| c4e93967-0d07-44ff-a231-d1af7d27c44a | Exercice DAP 4 | DAP:Y2 | 2027-10-30 | 013Y2 | Exercice → DAP |
| 00188406-4236-4ba7-ab1d-e2141dd0f491 | Cours de cadres exercice DAP 3 | DAP:Y3 | 2027-09-22 | 013Y3 | Exercice → DAP |
| 28aca891-888a-4400-ab7e-77af0a58a1b3 | Cours de cadres exercice DAP 4 | DAP:Y3 | 2027-10-27 | 013Y3 | Exercice → DAP |
| e50ffe6f-e111-4cda-a32b-6e54b7bce54d | Exercice DAP 3 | DAP:Y3 | 2027-10-06 | 013Y3 | Exercice → DAP |
| 16172f16-2a4d-46e1-ac3c-95da39cb3987 | Exercice DAP 4 | DAP:Y3 | 2027-11-12 | 013Y3 | Exercice → DAP |
| 9779ef65-4ee6-4e2d-a58b-19732624b48b | Cours de cadres exercice DAP 3 | DAP:Y4 | 2027-08-31 | 013Y4 | Exercice → DAP |
| 3a2e6f0a-ccb7-4cb4-a011-95a28fbe920a | Cours de cadres exercice DAP 4 | DAP:Y4 | 2027-10-06 | 013Y4 | Exercice → DAP |
| 51541dbd-035c-459f-a8c8-15b47eafa139 | Exercice DAP 3 | DAP:Y4 | 2027-09-22 | 013Y4 | Exercice → DAP |
| 57d29891-e740-4947-a13e-0f0b6c9b2bb0 | Exercice DAP 4 | DAP:Y4 | 2027-10-26 | 013Y4 | Exercice → DAP |

Les 16 exercices et cadres 1/2 déjà conformes restent intacts, notamment Y4 des 04.03, 24.03,
11.05 et 27.05. Les mixtes DPS-DAP, les quatre anciennes lignes DAP 5 masquées et les autres
classifications historiques du recensement 858 ne font l'objet d'aucune correction générale.

### Protection Et Workflow

Correction éditoriale de famille seule, classée MINOR par le comparateur existant. Exécution SQL
avec contrôle de concurrence, verrou par cible et refus des publications/liens, révisions en attente,
retraits de validation ou états non admissibles. Aucun endpoint de validation n'a été appelé.
Chaque correction ajoute une trace MODIFIER_OCCURRENCE et une entrée du journal existant, sous
l'acteur technique `codex:moa-go:2026-10-15`, sans inventer de personne ou NIP.
Les états, validations antérieures et leur historique restent conservés ; aucune validation nouvelle.

Comparaison complète des obligations avant/après hors famille et traces d'audit autorisées :
**100 % des Stat.Com, codes et autres champs métier préservés**. Empreintes identiques pour les
neuf tables protégées : événements, liens de publication, affectations, participations, attendus,
allocations des codes, OI d'événements, publics et qualifications individuelles. Journal antérieur
intact, exactement 16 nouvelles entrées. Aucune migration ni suppression de données.

## Tests Et Preuves

Uniquement les dépendances de ce lot, sans relancer les campagnes acquises :

- Quatre groupes de tests ciblés couvrant les 13 contrôles MOA : PASS. Service réel sur tables
  temporaires du clone `scope_qv_2027_recipe_20261006`, 943 lignes projetées ; Permanent sauvegardé,
  filtré, compté puis reconduit sur fixture uniquement ; 32 DAP et autres champs comparés.
- Concurrence simulée : cible divergente bloquée isolément, aucun écrasement ni doublon de correction.
- ROLLBACK vérifié : huit empreintes des tables publiques du clone strictement identiques.
- Trois groupes de recette navigateur : PASS, zéro erreur JavaScript, zéro écriture métier.
  Données de projection du clone et nouveaux JS/CSS substitués dans une session isolée sur le serveur
  de recette existant. Cela ne constitue pas une recette de la nouvelle version en production.
- Build local `netlify build --offline --context production` : réussi, statique et fonctions.
- `git diff --check` : réussi. Aucun changement d'authentification, CTA, ORION ou moteur d'export.

Preuves versionnées dans `docs/captures/qv-moa-consolide/` :
`dap-plan.json`, `targeted-results.json`, `browser-results.json`,
`production-family-correction.json`, `production-after-readonly.json`,
`programme-dap-y4.png`, `filters-mobile.png`.

## Fichiers Du Lot

Application : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `assets/css/scope.css`,
`netlify/lib/_scope-quo-vadis-service.js`. Le seul ajout à `netlify.toml` interdit le déploiement
automatique de cette branche corrective avant nouveau GO ; configuration de main inchangée.
Outils ciblés : `scripts/lib/scope-qv-dap-family-go.js`, `scripts/scope-qv-moa-consolide-tests.js`,
`scripts/scope-qv-moa-consolide-browser.js`. Documentation : ce rapport, référentiel canonique
et les sept preuves listées ci-dessus. Aucun snapshot brut ni configuration locale n'est livré.

## Réserves Et Verdict

**READY_FOR_MOA pour la PR**, sans déclaration de validation annuelle.
Les 16 corrections de données autorisées sont effectivement commitées en production ; le code
applicatif reste non fusionné et non déployé, conformément à la mission.
La famille enregistrée du cours automatique DAP 4 Y2 nécessite le correctif de lecture de cette PR
pour être restituée par l'application : main actuel ignore encore cette décision partielle.
Sa date reste non décidée. Les rattachements absents CI-DAP/CI-DPS ne sont pas inventés.
La recette locale déjà ouverte et ses modifications MOA ont été préservées, sans redémarrage.
Une fusion et toute livraison applicative nécessitent un nouveau GO MOA explicite.

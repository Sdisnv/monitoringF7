# SCOPE V1 — Situation Consolidée Après Le Lot CMDT

Date : 15.10.2026. Périmètre : dépôt Sdisnv/monitoringF7, site scope-sdisnv uniquement.
Rapport de situation pour revue MOA de la roadmap et de la ToDo, **pas une nouvelle campagne
d'audit général ni une déclaration de validation du Programme annuel**.

## Méthode Et Vocabulaire

Sources réutilisées : référentiel métier canonique, roadmap/ToDo existante, rapports et preuves
PR #12 à #26, audit métier versionné `scope-qv-business-audit.json`, baseline V1 historique,
lectures GitHub/Netlify/SQL ciblées du présent lot et recette CMDT. Aucun test historique relancé.
L'audit métier porte sur un snapshot SCOPE du 02.10.2026 et compte alors 622 lignes projetées ;
ses chiffres ne sont pas un recensement courant. La baseline du 06.09 décrit notamment Okta :
elle n'est pas la configuration LOCAL constatée aujourd'hui. Les rapports anciens sont conservés
comme preuves datées, leurs réserves ne sont pas automatiquement déclarées ouvertes ou closes.

- **DÉVELOPPÉ** : code présent et inspectable, sans impliquer une recette ou une publication.
- **TESTÉ TECHNIQUEMENT** : résultat de test identifiable, daté et limité à son périmètre.
- **PUBLIÉ** : commit effectivement publié par Netlify, distinct d'un build/merge ou d'un GO.
- **VALIDÉ MOA** : décision ou recette explicitement confirmée par la MOA, pas un test Codex.
- **PARTIEL** : capacité existante mais parcours complet ou couverture non démontrés.
- **BLOQUÉ** : prérequis identifié manquant pour le travail concerné, pas pour tout SCOPE.
- **NON DÉMONTRÉ** : aucune preuve suffisante examinée ; ne signifie pas inexistence certaine.

Un GO développement, un GO fusion, une validation de date, une validation métier d'occurrence
et la validation annuelle sont cinq décisions distinctes. Aucune n'est inférée des autres.
Les derniers commits cités désignent le changement ou la preuve précisément identifié ;
un dernier changement de fichier n'est pas présenté comme une validation complète du module.

## 1. État GitHub Et Netlify

- **État réel :** main `0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41`, PR #26 fusionnée.
  scope-sdisnv effectivement PUBLIÉ sur ce même commit ; déploiement `6ad0a892de679dbc83844576`,
  15.10 à 10:19:31 UTC. Aucune autre PR ouverte au préflight ; le lot CMDT sera l'unique nouvelle PR.
- **Preuve :** `captures/qv-cmdt/preflight-readonly.json`, lecture GitHub directe et API Netlify.
- **Dernier commit :** main `0d1fc89` ; correctif CMDT dans le commit de l'unique PR, non publié.
- **Décision MOA :** GO développement/recette CMDT seulement. Aucune fusion/publication autorisée.
- **Travail restant :** décision de livraison ; après GO seulement, vérifier le commit publié et l'accès ciblé.
- **Dépendances / risque :** GitHub → Netlify opérationnel ; une preview annulée n'est pas une preuve de build distant réussi. Garde de branche `ignore = "exit 0"` conservée.

## 2. PR Fusionnées Et Travaux Ouverts

| PR | Périmètre réel | HEAD correctif | Commit de fusion vérifié |
| --- | --- | --- | --- |
| #20 | Familles métier et filtres | 5a7135b | fba5bda |
| #21 | Familles, référentiels et corrections DAP autorisées | cf0aebc | e767236 |
| #22 | Conduites DAP, stabilité LOCAL, publics et rattachements FOCA | 2d0beb2 | 74ac904 |
| #23 | Horaires Programme sur deux lignes | c192e69 | 435bed7 |
| #24 | Public cible et références communes, valeurs historiques | 207fb20 | b3b0cb3 |
| #25 | Échelons, Chef section, calendrier/date, préparation classique | f40046d | 92cce51 |
| #26 | Préparation groupée et visibilité SDIS transversale | 88ce4e6 | 0d1fc89 |

- **État réel :** sept PR fusionnées, incluses dans le commit publié ; CMDT DÉVELOPPÉ/TESTÉ, non fusionné.
- **Preuve :** métadonnées GitHub conservées dans le préflight, historique Git local vérifié.
- **Dernier commit :** `88ce4e6` / fusion `0d1fc89` avant CMDT.
- **Décision MOA :** livraison CMDT à décider ; les fusions antérieures ne prouvent pas une recette exhaustive.
- **Travail restant :** aucune réouverture ni duplication des PR acquises ; examiner l'unique nouvelle PR.
- **Dépendances / risque :** les changements étrangers du checkout principal restent hors lot ; aucun reset/force-push.

## 3. Fonctionnalités Développées

- **État réel :** Programme canonique, fiches, recherche/filtres, calendrier et préparation, workflow
  motivé, historique, réactivation, reconduction, publics/responsables multisélections/libres,
  activités types, codes HSC, cursus PAPR, DAP groupées, exports et statistiques : socles DÉVELOPPÉS,
  avec preuves ciblées de leurs jalons. Leur couverture ne vaut pas achèvement de toute la roadmap.
- **Preuve :** rapports `SCOPE_QV_MOA_20261012.md`, `SCOPE_QV_MOA_20261014.md`,
  `SCOPE_QV_V1_TESTS19_33_20261014.md` et rapports PR #20 à #26 ; références canoniques.
- **Dernier commit :** jalons récents #20–#26 ci-dessus ; PAPR/date provisoire : preuve `cf868e7`.
- **Décision MOA :** capitaliser, pas de reconstruction ; CMDT s'ajoute aux règles existantes.
- **Travail restant :** parcours spécialisés des sections 11–16, pas de nouveaux modules parallèles.
- **Dépendances / risque :** ne pas confondre disponibilité d'un socle avec validation opérationnelle de tous les cas.

## 4. Fonctionnalités Publiées

- **État réel :** code des PR #20 à #26 PUBLIÉ dans `0d1fc89`. CMDT NON PUBLIÉ à la livraison de cette branche.
  Les anciennes données et décisions continuent à s'appliquer ; la publication de code ne revalide rien.
- **Preuve :** commit Netlify réellement publié, correspondance avec l'historique des fusions ; pas seulement build local.
- **Dernier commit :** production `0d1fc89`, déploiement ci-dessus.
- **Décision MOA :** aucun nouveau déploiement sans GO ; pas de nouveau projet Netlify, ORION hors périmètre.
- **Travail restant :** après GO, recette de production limitée au nouveau périmètre CMDT.
- **Dépendances / risque :** présence du code en production ne certifie pas toutes les migrations ou tous les parcours utilisateurs ; aucune nouvelle certification globale n'est revendiquée.

## 5. Recettes MOA Validées

- **État réel :** VALIDÉ MOA dans les missions/décisions : Enregistrer et planifier,
  Enregistrer et valider, cohérence générale du Programme. Dates JSP 17.02 et 23.06.2027
  18:30–20:30 approuvées ; DAP groupée cours 23.03 / séances 21.04 et 28.04 approuvés.
  QV-RULES-001 : maquette et principe métier approuvés, pas éditeur complet accepté.
- **Preuve :** décisions canoniques QV-CYCLE-006, QV-EXERCICE-PREPARATION-001,
  QV-RULES-001 ; rapports MOA du 12/14/15.10. Ces preuves sont documentaires, pas des tests Codex rebaptisés MOA.
- **Dernier commit :** décisions PR #18 `f4495c4`, préparation groupée `88ce4e6`, référence publiée `0d1fc89`.
- **Décision MOA :** conserver ces acquis, ne pas redemander les mêmes tests.
- **Travail restant :** appliquer les révisions approuvées selon workflow quand leur publication reste divergente ; ce rapport ne les exécute pas.
- **Dépendances / risque :** date approuvée ≠ réservation disponible ≠ validation annuelle ≠ autorisation de modifier directement une publication.

## 6. Recettes Partielles

- **État réel :** TESTÉ TECHNIQUEMENT sur clones/Chrome ; acceptation MOA exhaustive des
  lots récents NON DÉMONTRÉE par leur seule fusion. CMDT : ciblé A–T démontré, reste soumis à recette/décision MOA.
- **Preuve :** manifestes sous `captures/qv-v1-tests19-33`, `qv-complement`, `qv-consolide-preparation`,
  `qv-preparation-sdis`, `qv-cmdt` ; scopes, rollbacks et limitations explicités.
- **Dernier commit :** `c19a61a`, `2d0beb2`, `f40046d`, `88ce4e6`, puis commit du lot CMDT.
- **Décision MOA :** ne pas répéter les campagnes acquises ; distinguer nouvelle recette et tests techniques existants.
- **Travail restant :** confirmations ciblées manquantes, Safari/veille physique si requis, profils réels selon exploitation.
- **Dépendances / risque :** les tests du lot actuel substituent assets/projection dans une session isolée du serveur local ; ils ne mettent pas à jour l'onglet MOA ouvert ni la production.

## 7. Anomalies Ouvertes

- **État réel :** anomalie de diffusion CMDT CORRIGÉE/TESTÉE dans la branche, non publiée.
  DAP Y1 -28 jours est une anomalie de date démontrée, non corrigée automatiquement.
  L'absence d'alerte cours signalée précédemment n'était pas reproduite sur main fraîchement recalculé.
  Clôture actuelle de tous les dossiers M1–M7/P1–P6 NON DÉMONTRÉE, pas présumée réalisée.
- **Preuve :** `SCOPE_QV_CMDT_20261015.md`, preuves PR #26, tableau unique des dossiers dans `SCOPE_QV_MOA_20261014.md`.
- **Dernier commit :** préparation `88ce4e6`, dossiers documentaires `f4495c4`, correctif CMDT actuel.
- **Décision MOA :** aucune date déplacée ni publication réécrite silencieusement ; M2 souhaite Vulcain, pas Oxygène.
- **Travail restant :** revoir uniquement les dossiers encore ouverts dans SCOPE, disponibilité/animations/révisions selon workflow.
- **Dépendances / risque :** compter des anciens dossiers comme défauts actuels sans rapprochement serait un faux audit ; leur clôture reste à prouver, sans annuler les décisions approuvées.

## 8. Réserves Métier

- **État réel :** MOA_REQUIRED pour les relations préparatoires mixtes non démontrées
  (24 dans la projection de preuve #26), relation personne–fonction–domaine/OI datée,
  autres périmètres SDIS non qualifiés et paramètres de clôture définitifs.
- **Preuve :** `qv-preparation-sdis/targeted-results.json`, `SCOPE_QV_PUBLICS_MOA_20261015.md`, canonical et roadmap actualisée.
- **Dernier commit :** `207fb20`, `f40046d`, `88ce4e6` ; extension CMDT actuelle documentée séparément.
- **Décision MOA :** ne pas inventer de cours, NIP, correspondance IndeX ou diffusion par analogie.
- **Travail restant :** arbitrages précis par référence/OI/date, puis alimentation des mécanismes existants.
- **Dépendances / risque :** les 24 cas sont un nombre de snapshot, pas un nouveau comptage exhaustif de production ; une visibilité SDIS n'est pas une obligation de participation.

## 9. État Du Programme Annuel 2027

- **État réel :** SQL production READ ONLY du 15.10 à 12:24 UTC : **PREPARATION**, 878 préparations
  enregistrées et 125 liens de publication existants. Ces trois mesures ne sont pas un nombre
  de séances affichées ni une preuve de publication annuelle complète. Projection de recette PR #26 :
  944 lignes / 924 actives ; les 918 observées dans la vieille recette PR #19 sont un autre état.
- **Preuve :** `qv-cmdt/preflight-readonly.json`, preuves de projection #26 et mission de recette PR #19.
- **Dernier commit :** application publiée `0d1fc89` ; données métier lues à l'instant indiqué, pas versionnées par un commit Git.
- **Décision MOA :** aucune validation annuelle implicite. Rapport 23.02.2027 / début 24.02 conservés ; clôture 10.02.2028 provisoire/Codir.
- **Travail restant :** compléter décisions, réservations et contraintes, confirmer clôture et valider le Programme selon son workflow.
- **Dépendances / risque :** publications historiques et préparations coexistent ; ni suppression des liens existants ni création anticipée de nouveaux événements.

## 10. État Des Calendriers Et Exports

- **État réel :** calendriers et trois variantes PDF/CSV existants DÉVELOPPÉS/TESTÉS/PUBLIÉS.
  SDIS transversal #26 publié ; restriction CMDT DÉVELOPPÉE/TESTÉE, non publiée.
  Jeu actuel ciblé : Y1 121 → 95, G1 409 → 383, JSP C1 106 → 80 ; SDIS 44 et global 924 inchangés.
- **Preuve :** `qv-cmdt/targeted-results.json`, navigateur, PDF réel Y1 95 lignes/8 pages et SDIS 44/5 pages ; modèles/colonnes inchangés.
- **Dernier commit :** renderer `c19a61a`, portée SDIS `88ce4e6`, prédicat CMDT dans la nouvelle PR.
- **Décision MOA :** CMDT global visible, onze OI exclus ; autres SDIS inchangés ; pas de refonte.
- **Travail restant :** recette/go ciblé CMDT ; calendriers individuels/ProgJour et GELORE2 restent des besoins distincts.
- **Dépendances / risque :** Excel désigne ici le CSV BOM existant, pas un XLSX nouveau. La diffusion est organisationnelle, pas une nouvelle permission de sécurité.

## 11. État Des Affectations Et Assignations

- **État réel :** socle daté personnes/NIP/OI et moteur d'applicabilité DÉVELOPPÉS, présents
  en production ; résolution individuelle distincte/dédupliquée techniquement prouvée.
  Parcours annuel complet assignation → programme individuel → communication : PARTIEL/NON DÉMONTRÉ.
- **Preuve :** `_scope-service.js` resolveEligiblePopulation, `_scope-public-engine.js`,
  tests datés conservés #24/#26 ; réserve de relation fonctionnelle dans le rapport Publics.
- **Dernier commit :** dernières éditions sources constatées `88c1f93` (service), `1abc30f` (public engine) ; preuve de compatibilité récente `88ce4e6`.
- **Décision MOA :** réutiliser les moteurs, NIP et faits datés ; diffusion CMDT/SDIS ne définit jamais la population.
- **Travail restant :** compléter relations fonctionnelles autorisées, règles d'assignation manuelles/assistées/automatiques et recette du parcours bout en bout.
- **Dépendances / risque :** une personne multi-OI ne doit pas être comptée deux fois ; ce lot n'a créé aucune assignation, présence ou obligation.

## 12. État Du Suivi Des Participations

- **État réel :** socle événements/prévu-réel/présences, obligations/excuses/dispenses/rattrapages
  et statistiques nominatives DÉVELOPPÉ ; contrats techniques de participation existants.
  Complétude de chaque type spécialisé et acceptation annuelle opérationnelle : PARTIELLES.
- **Preuve :** baseline V1 historique et rapports du contrat catalogue/participation ; QV-PART-001,
  QV-STAT-001 et preuves cycle/statistiques dans `qv-roadmap-v1-20261012`.
- **Dernier commit :** dernière édition `_scope-service.js` `88c1f93` ; ne pas l'assimiler à un nouvel agrément MOA de tout le module.
- **Décision MOA :** évaluation par défaut activée pour 2027 ; choix individuel prioritaire et reconductible ; désactivation sans destruction d'historique.
- **Travail restant :** finaliser types suivis/exports individuels et cas spécialisés sur les moteurs existants.
- **Dépendances / risque :** statistiques strictement 01.01–31.12 selon date réelle ; ni cycle métier ni simple visibilité OI ne crée une contribution statistique.

## 13. Cours ECA Et Statistiques Individuelles

- **État réel :** PARTIEL. Événements nominatifs, NIP, présences et agrégats génériques existent ;
  parcours spécialisé cantonal inscription/import + origine ECA + distinction obligation SDIS NON DÉMONTRÉ comme achevé.
- **Preuve :** QV-ECA-COURSES-001, section E de la roadmap, rapports finalisation PR #12.
- **Dernier commit :** preuve documentaire PR #12 `cf868e7`, roadmap récemment actualisée par `f40046d` ; commit d'un parcours ECA spécialisé complet NON DÉMONTRÉ.
- **Décision MOA :** besoin maintenu, aucun module parallèle et aucune confusion entre cours cantonal et obligation interne.
- **Travail restant :** contrat d'import/inscription, origine et filtres/agrégats/exports individuels recettés.
- **Dépendances / risque :** source cantonale, identités NIP et affectations datées ; des statistiques génériques ne prouvent pas le parcours ECA.

## 14. Éditeur Des Règles QV-RULES-001

- **État réel :** maquette/principe VALIDÉ MOA ; éditeur complet par cursus PARTIEL/NON DÉMONTRÉ.
  Un éditeur générique de planification par domaine/public/jours/horaire existe déjà ; il ne démontre pas la fiche cursus en huit sections ni son contrôle complet de faisabilité.
- **Preuve :** canonical QV-RULES-001, roadmap ; `renderQuoVadisRegles` inspecté dans le code existant, non modifié.
- **Dernier commit :** décision capitalisée par PR #13 ; code UI relu sur `0d1fc89`, aucun commit d'achèvement du jalon QV-RULES-001 démontré.
- **Décision MOA :** un seul onglet, une règle par cursus complet, portées explicites, jours qualifiés, faisabilité et droits ; jalon après stabilisation.
- **Travail restant :** développer les manques en réutilisant cet éditeur et les moteurs, puis recette dédiée.
- **Dépendances / risque :** ne pas présenter le simple onglet Règles existant comme livraison de toute la maquette, ni créer une règle par module.

## 15. Observations Et Évaluations

- **État réel :** besoin maintenu, parcours qualitatif complet NON DÉMONTRÉ/À développer dans la roadmap.
  La case d'évaluation des participations est développée mais répond à une autre question.
- **Preuve :** roadmap, suites post-PR #16 et canonical QV-PART-001 ; aucune campagne supplémentaire menée sur ce module hors périmètre.
- **Dernier commit :** état documentaire relu sur `0d1fc89` ; implémentation complète spécialisée NON DÉMONTRÉE.
- **Décision MOA :** conserver observations, sélection, forçage manuel et évaluations comme exigences, ne pas les déclarer abandonnées.
- **Travail restant :** préciser et recetter le parcours qualitatif attendu avec la MOA.
- **Dépendances / risque :** population et droits existants ; ne pas confondre notation/observation et taux de présence.

## 16. ECAwin Et Référentiel IndeX

- **État réel :** registre ECAwin, EXEPRO, EXERCI par défaut non destructif, CONCOUR et
  0180F7 développés dans les jalons acquis. Alignement officiel IndeX BLOQUÉ par source/validation manquante ;
  contrat spécialisé d'échange ECAwin sans Stat.Com NON DÉMONTRÉ. Aucun nouvel import supposé.
- **Preuve :** QV-ECA-001/002/003/004, QV-INDEX-001, inventaire `qv-post-pr16-moa-20261014/index-referentials-readonly.json`, rapport PR #12 corrective.
- **Dernier commit :** socle relu sur `0d1fc89` ; derniers arbitrages documentés #18/#24/#25, pas de commit d'alignement officiel complet démontré.
- **Décision MOA :** Stat.Com, codes d'occurrence et activité ECAwin distincts ; gel des correspondances IndeX et du budget DAP Y1/070F23 ; aucun identifiant inventé.
- **Travail restant :** référence IndeX officielle versionnée et correspondances approuvées, contrats d'échange/rapprochement précis.
- **Dépendances / risque :** une liste de libellés SCOPE n'est pas une preuve d'exhaustivité IndeX ; événement ECAwin déjà existant à rapprocher, jamais recréer par défaut.

## 17. Sécurité Et Authentification

- **État réel :** LOCAL seul actif constaté sur `/auth/config` ; Okta désactivé dans cette configuration.
  Turnstile public : configuré mais `enabled: false` à la lecture. RBAC/API/RLS existants non modifiés.
  Aucune nouvelle certification générale de sécurité, ni de session physique longue, n'est revendiquée.
- **Preuve :** config publique actuelle et `SCOPE_QV_COMPLEMENT_MOA_20261015.md` : défauts de jeton mémoire/renouvellement et indisponibilité de stockage reproduits puis corrigés, tests LOCAL ciblés.
- **Dernier commit :** correctif auth `2d0beb2`, inclus dans `0d1fc89`. Baseline `c6ad814` historique, pas description courante du fournisseur actif.
- **Décision MOA :** connexions existantes, aucun secret demandé, aucune modification d'authentification/droits dans CMDT.
- **Travail restant :** validation d'exploitation des conditions non démontrées (veille physique, Safari, profils réels) et politique Turnstile si souhaitée, dans un périmètre distinct.
- **Dépendances / risque :** Chrome/horloge simulée ≠ veille physique ou Okta réel ; filtre CMDT ≠ restriction d'accès de sécurité. Aucune migration ou écriture de recette en production.

## 18. Roadmap V1 Actualisée

- **État réel :** roadmap existante actualisée, sans document concurrent ; stabilisation des
  préparations/diffusions développée et publiée jusqu'à #26, CMDT testé à livrer, jalons opérationnels toujours PARTIELS.
- **Preuve :** section « Actualisation Après PR #26 Et Lot CMDT » de `SCOPE_QV_ROADMAP_V1_20261012.md` ; ce rapport n'en remplace pas les décisions.
- **Dernier commit :** roadmap antérieure `f40046d`, complément documentaire dans le commit CMDT.
- **Décision MOA :** un seul lot CMDT maintenant ; Cours ECA, QV-RULES-001, IndeX, observations, ProgJour/GELORE2 restent explicitement conservés.
- **Travail restant :** revue MOA des priorités/critères de fin ; pas de développement des autres jalons dans cette PR.
- **Dépendances / risque :** une feuille de route actualisée n'est pas un engagement de livraison ni une validation fonctionnelle.

## 19. ToDo Consolidée Priorisée

- **État réel :** ToDo consolidée dans la roadmap existante avec actions, propriétaire attendu,
  critère de clôture et dépendances ; P0 livraison CMDT/qualification annuelle/clôture Codir,
  P1 relations/applicabilité/orchestration/règles/Cours ECA/contrats, P2 extensions et besoins fournisseurs.
- **Preuve :** tableau « ToDo Consolidée Priorisée Pour La Revue MOA » de cette roadmap.
- **Dernier commit :** complément du lot CMDT, sur base `0d1fc89`.
- **Décision MOA :** préserver les acquis, ne pas relancer les recettes techniques ou métier déjà confirmées.
- **Travail restant :** attribuer les décisions/actions restantes puis recetter les nouveaux parcours au bon jalon.
- **Dépendances / risque :** pas de nouveau backlog concurrent ; les dossiers anciens ne deviennent pas des régressions certaines sans preuve actuelle.

## 20. Décisions MOA Nécessaires

- **État réel :** MOA_REQUIRED pour les arbitrages ci-dessous ; READY_FOR_MOA pour le correctif CMDT démontré, pas pour l'ensemble du Programme annuel.
- **Preuve :** canonical, roadmap/ToDo, rapport CMDT et réserves #18/#24/#26.
- **Dernier commit :** `0d1fc89` pour l'état publié, commit de l'unique PR CMDT pour ce complément.
- **Décisions attendues :** GO livraison CMDT ; qualification finale/réservations et révisions encore ouvertes ;
  clôture 10.02.2028 par Codir ; relations préparatoires mixtes ; relation NIP–fonction–domaine/OI datée ;
  référence IndeX/contrats ECAwin et Cours ECA ; priorités de QV-RULES-001, observations et nouveaux périmètres de diffusion.
- **Travail restant :** appliquer les décisions dans le workflow existant et tracer leurs preuves ; ne pas demander à nouveau les dates JSP/DAP déjà approuvées.
- **Dépendances / risque :** communication initiale puis différentielle après publication à démontrer ; absence de décision ne permet ni écrasement humain ni assignation automatique.

## Conclusion Pour La Revue

SCOPE dispose d'un socle V1 et de corrections QUO VADIS réellement publiées jusqu'à #26.
La préparation annuelle reste en cours ; le cycle 2027 n'est ni déclaré validé ni déclaré publié
globalement par ce rapport. Les événements opérationnels historiques existants sont conservés.
CMDT est livré comme correctif déterministe testé, sans changement de données ni de moteurs.
Les parcours spécialisés et arbitrages identifiés restent explicitement PARTIELS, BLOQUÉS ou
NON DÉMONTRÉS selon leurs preuves, sans remise en cause des recettes MOA acquises.

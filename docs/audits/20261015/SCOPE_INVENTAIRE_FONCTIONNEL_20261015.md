# SCOPE — Inventaire fonctionnel et technique

> Capitalisation phase B : import de la phase A actualisée à #27. Les déclarations « hors dépôt », « pas de phase B » et les prochains GO dans le texte importé décrivent son mandat historique. La mission de phase B autorise maintenant sa capitalisation documentaire en une PR, sans fusion ni déploiement. Les réserves AUDIT_INCOMPLET et Programme 2027 NON VALIDÉ restent applicables. Voir [provenance](README.md).


## Actualisation consolidée du 15.10.2026 — référence applicable

**Phase A, lecture seule. Verdict : AUDIT_INCOMPLET**, avec réserves explicites ci-dessous. **Programme annuel 2027 NON VALIDÉ.** Cette actualisation reprend les huit mêmes livrables ; elle ne recommence pas l'audit initial.

GitHub `Sdisnv/monitoringF7`, `main` : **`3bdad82029ef79ea721bcf4043a5bb47e4d86764`**. PR #20 à #27 fusionnées ; contrôle direct GitHub et Netlify effectué pendant cette actualisation. Production `scope-sdisnv` : déploiement **`6ad0d08255cda461366136f2`**, **ready**, même SHA, publication **15.10.2026 à 15:09:59.769 Europe/Zurich** (13:09:59.769 UTC). Une publication technique ne vaut pas validation du Programme annuel.

Aucune écriture dans le dépôt partagé, GitHub, les données, les configurations, les permissions/RLS, Okta ou Netlify. Aucun test acquis relancé, aucune branche/PR/migration, fusion ou publication réalisée par cet audit. Les écritures se limitent aux livrables et preuves d'audit dans `dossier local historique de l’audit (non versionné)` et à leur copie de remise hors dépôt dans le dossier d’artefacts Codex. Pas de phase B engagée.

Les sections d'actualisation précèdent l'**archive initiale** conservée en fin de fichier pour assurer la continuité. Pour les changements #23–#27, les décisions actuelles ci-dessus et les rectifications ci-dessous remplacent les états initiaux correspondants. Les références à `74ac904…`, aux anciens déploiements et aux comptes SQL initiaux dans l'archive restent datées ; elles ne décrivent pas la production courante. Les points non remplacés restent au backlog avec les limites initiales, sans nouvelle preuve d'ouverture ou de clôture.

Navigation : [SCOPE_AUDIT_INTEGRAL_20261015.md](SCOPE_AUDIT_INTEGRAL_20261015.md) · [SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md](SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md) · [SCOPE_ROADMAP_CONSOLIDEE_20261015.md](SCOPE_ROADMAP_CONSOLIDEE_20261015.md) · [SCOPE_TODO_CONSOLIDEE_20261015.md](SCOPE_TODO_CONSOLIDEE_20261015.md) · [SCOPE_REGISTRE_ANOMALIES_20261015.md](SCOPE_REGISTRE_ANOMALIES_20261015.md) · [SCOPE_MATRICE_TRACABILITE_20261015.md](SCOPE_MATRICE_TRACABILITE_20261015.md) · [SCOPE_PLAN_FINALISATION_QV_20261015.md](SCOPE_PLAN_FINALISATION_QV_20261015.md) · [SCOPE_REGISTRE_DECISIONS_MOA_20261015.md](SCOPE_REGISTRE_DECISIONS_MOA_20261015.md). Diagnostic distinct demandé : [SCOPE_DIAGNOSTIC_NETLIFY_20261015.md](SCOPE_DIAGNOSTIC_NETLIFY_20261015.md).

## Registre des nouveautés et acquis protégés

| PR fusionnée, incluse dans le main publié | Périmètre | SHA de fusion | Acceptation et portée | Source épinglée |
|---|---|---|---|---|
| [#20](https://github.com/Sdisnv/monitoringF7/pull/20) | Familles, cinq filtres, classification DAP | fba5bda6e98956458530cf1f947640e9341a57c5 | Acquis techniques documentés ; validation globale non extrapolée | [docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) |
| [#21](https://github.com/Sdisnv/monitoringF7/pull/21) | Permanent, référentiels et OI | e7672369e08727849e96ef56d4462840d9dfca0e | Permanent et corrections déterministes acquis ; décision humaine conservée | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) |
| [#22](https://github.com/Sdisnv/monitoringF7/pull/22) | Conduites DAP, reconnexion/brouillons, publics, CI → FOCA | 74ac904ff78c464dbc57482c2d7d06ccf3d2300f | Corrections ciblées acquises ; veille/expiration réelle non démontrées | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) |
| [#23](https://github.com/Sdisnv/monitoringF7/pull/23) | Horaires verticaux du Programme | 435bed709dc61c6534d1e58ce2978c6f7bbceac2 | ACQUIS VALIDÉ — PASS MOA horaires | [docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md) |
| [#24](https://github.com/Sdisnv/monitoringF7/pull/24) | Public cible, Responsable et références communes | b3b0cb372fa68aa4a83f8ef8f0856d31d7fbc3a5 | PARTIELLEMENT DÉVELOPPÉ — PASS MOA partiel | [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) |
| [#25](https://github.com/Sdisnv/monitoringF7/pull/25) | Échelon 0, et/à, candidats EA, calendrier, dates, 14 jours | 92cce517f79a89e3040d234314b8de52613af05a | PARTIELLEMENT DÉVELOPPÉ — PASS MOA partiel | [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) |
| [#26](https://github.com/Sdisnv/monitoringF7/pull/26) | Préparations bidirectionnelles, groupées et SDIS transversal | 0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41 | ACQUIS VALIDÉ — PASS MOA sur cas démontrés | [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) |
| [#27](https://github.com/Sdisnv/monitoringF7/pull/27) | CMDT — gouvernance hors calendriers des onze OI opérationnels | 3bdad82029ef79ea721bcf4043a5bb47e4d86764 | ACQUIS VALIDÉ — PASS MOA sur périmètre contrôlé | [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) |

#27 : **Y1 96, G1 384, SDIS 46 ; aucune duplication observée**, PASS transmis par la MOA dans la mission actuelle. Ne pas relancer cette recette. Les preuves clone #27 portent sur Y1 95, G1 383, SDIS 44 (944 lignes projetées, 924 actives), périmètre antérieur et représentatif explicitement déclaré. Ces valeurs différentes ne suffisent pas à établir une régression ; aucune d'elles n'est un invariant de production.

Protection commune : identifiants et données brutes conservés ; pas de conversion historique automatique. Programme web : heures verticales acquises #23. Exports PDF : future typographie ASCII distincte. Chef section commun DPS/DAP, Échelon **0** (zéro), regroupements « et » pour deux/discontinus et « à » pour séquence continue ≥3, Resp matériel, Préposé matériel, candidats PL/TP9/VL et machiniste EA, initiales et références Chef harmonisées : préserver la portée démontrée #24/#25, sans transformer leurs PASS partiels en acceptation générale.

SDIS : visibilité transversale sur onze OI et leurs parents ; le filtre SDIS n'inclut que les organisateurs SDIS, sans inverse généralisé. CMDT est une **portée de diffusion calculée**, pas un nouvel OI, domaine, droit ou public. Les cinq définitions exactes EM/Codir/Codir repas/CRDIS/Conférence des Commandants sont exclues des vues opérationnelles et restent dans SDIS/global. Aucune exclusion par titre seul, Stat.Com F0, COSEC ou analogie ; aucune assignation individuelle créée par la diffusion.

Les seize soirées DAP, quotas existants, onze familles dont Permanent, CI DAP/CI DPS sous FOCA, révisions/historique/codes, CTA/sections/réserves et moteurs déjà acquis restent protégés. Aucun chantier nouveau ne justifie leur reconstruction.

## Chaîne opérationnelle de finalisation QUO VADIS 2027

La validation annuelle, les publications opérationnelles existantes et la publication Netlify sont trois notions distinctes. Le programme reste **NON VALIDÉ**. L’ordre ci-dessous organise les dépendances ; il ne donne aucun GO d’exécution.

### 1 — Validation annuelle

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | setProgrammeStatus appelle listProgramme ; contrôles rapprochement, réservation, clôture provisoire, PAPR et préparations bloquantes ; historique des transitions et motif de retrait |
| Preuves code | [async function setProgrammeStatus](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-quo-vadis-service.js#L3502) |
| Fonctions manquantes / non démontrées | Rapport global QV-CONTROLE-QUALITE-001 sur tous axes et preuve complète de couverture |
| Validations acquises | Contrôles ciblés #25/#26 et règles acquises ; aucune acceptation annuelle |
| Dépendances / anomalies ouvertes | Clôture Codir, dossiers M/P, révisions, publics/familles requis, relations de préparation ; cas Y1 −28 jours |
| Décisions MOA nécessaires | MOA : contenu, dérogations autorisées, résolution blocages, décision annuelle explicite |
| Critères d’acceptation | Un blocage non résolu empêche VALIDE ; rapport complet avec IDs/causes/décisions, mêmes moteurs, journal et versions, aucune correction automatique |

### 2 — Publication

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | buildPublicationPlan, publicationPlanFingerprint, executePublicationPlan, store PostgreSQL, rapprochement ; séparation plan et exécution |
| Preuves code | [function buildPublicationPlan](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-qv-publication-plan.js#L379) ; [async function executePublicationPlan](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-qv-publication-executor.js#L159) |
| Fonctions manquantes / non démontrées | Preuve du raccord au parcours opérationnel annuel et acceptation bout en bout ; présence des modules seule insuffisante |
| Validations acquises | Socles et publications ciblées historiques acquis ; 125 liens dans preuve12:24 UTC ne prouvent pas publication annuelle |
| Dépendances / anomalies ouvertes | Étape1, permissions events:publish, empreinte/version, GO publication distinct, continuité production |
| Décisions MOA nécessaires | MOA : périmètre du lot, effets et publication après validation |
| Critères d’acceptation | Plan revu, préconditions effectives, exécution contrôlée, mêmes liens, anti-doublons, traçabilité et reprise/rollback ; données opérationnelles préservées |

### 3 — Création / liaison événements

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | PublicationPlan classe créations/liaisons/mises à jour ; exécuteur/store et publicationReconciliation ; révisions ciblées existantes |
| Preuves code | [netlify/lib/_scope-qv-publication-postgres-store.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-qv-publication-postgres-store.js) ; [netlify/lib/_scope-qv-publication-reconciliation.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-qv-publication-reconciliation.js) ; [netlify/lib/_scope-qv-programme-revisions.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-qv-programme-revisions.js) |
| Fonctions manquantes / non démontrées | Démonstration du rapprochement de toutes occurrences retenues et traitement des ambiguïtés réelles |
| Validations acquises | Révisions et anti-doublons ciblés précédemment testés ; ne pas rejouer les correctifs |
| Dépendances / anomalies ouvertes | Plan approuvé ; EM/PR/JSP à vérifier selon dernier état ; source→occurrence→événement stable ; codes NULL légitimes |
| Décisions MOA nécessaires | MOA : confirmation des révisions majeures et impacts, résolution des rapprochements ambigus |
| Critères d’acceptation | Pas de doublon ni nouvelle lignée pour réviser ; mêmes IDs/codes/Stat.Com/historiques et présences ; aucune allocation arbitraire ni NULL rempli sans source |

### 4 — Assignations

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | resolveEligiblePopulation, affectationsValides, assignmentConstraints, figerPopulation et desassignerPopulation ; attendus et participations existants |
| Preuves code | [async function resolveEligiblePopulation](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-service.js#L2246) ; [async function assignmentConstraints](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-service.js#L3082) ; [async function figerPopulation](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-service.js#L3567) |
| Fonctions manquantes / non démontrées | Raccord publication annuelle→assignation explicite et PERSONNE–FONCTION–DOMAINE–OI datée pour cas fonctionnels |
| Validations acquises | Socles de population/participation existants ; aucune assignation créée par #26/#27 ; validation de chaîne NON VÉRIFIÉE |
| Dépendances / anomalies ouvertes | Étape3, périodes/affectations/qualifications/publics exacts ; limites d’entrées fonctionnelles |
| Décisions MOA nécessaires | MOA : responsabilités, fonctions et date de référence, cas manquants/ambiguïtés |
| Critères d’acceptation | Destinataires éligibles à la date, choix explicite et permissions, doublons exclus, raisons des inclusions/exclusions, présences et assignations antérieures préservées |

### 5 — Programmes individuels

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | Socle personnes/périodes/affectations/attendus et sélection des événements ; vues et exports existants n’équivalent pas à une chaîne annuelle nominative livrée |
| Preuves code | [netlify/lib/_scope-service.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-service.js) ; [assets/js/scope-ui.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-ui.js) |
| Fonctions manquantes / non démontrées | Production/diffusion individuelle annuelle de bout en bout non démontrée ; préciser les raccords réutilisables avant développement |
| Validations acquises | Aucun PASS général sur les programmes individuels déduit des PASS filtres/exports OI |
| Dépendances / anomalies ouvertes | Étape4 ; relation datée et autorisations ; QV-CYCLE-007 |
| Décisions MOA nécessaires | MOA : périmètre individuel, contenu et canal ; ne pas confondre visibilité OI et obligation personnelle |
| Critères d’acceptation | Chaque personne voit/reçoit ses seules activités dues selon période ; identité stable ; export autorisé, version identifiable et historique conservé |

### 6 — Communication

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | Socles alertes et inbox ; classifyInboxItem est une projection d’alertes existantes, pas preuve d’un moteur d’envoi |
| Preuves code | [netlify/lib/_scope-inbox.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-inbox.js) |
| Fonctions manquantes / non démontrées | Chaîne initiale d’envoi, destinataires, statut et preuve de remise/reprise NON VÉRIFIÉE ; aucun envoi effectué |
| Validations acquises | Aucun PASS de communication annuelle acquis dans les sources lues |
| Dépendances / anomalies ouvertes | Étape5, canal autorisé, identité/droits, procédure incident et journal minimal |
| Décisions MOA nécessaires | MOA : canal, contenu, responsables et validation des destinataires avant envoi |
| Critères d’acceptation | Information des bonnes personnes, trace de version/destinataires/résultat, reprise contrôlée sans duplication ni divulgation ; aucun second moteur sans nécessité |

### 7 — Modifications ultérieures

| Dimension | Constat / cible |
|---|---|
| Fonctions existantes | updateProgrammePreparation, programmeHistory, révisions ciblées avec versions/motifs, contrôles de dates validées et dérogations |
| Preuves code | [async function updateProgrammePreparation](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-quo-vadis-service.js#L3672) ; [async function programmeHistory](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-quo-vadis-service.js#L4390) |
| Fonctions manquantes / non démontrées | QV-CYCLE-007 : propager impacts aux assignations/programmes individuels/communication, preuve complète manquante |
| Validations acquises | Historique/révisions ciblés acquis ; date validée protégée #25 ; pas de validation globale de chaîne |
| Dépendances / anomalies ouvertes | Étapes3–6, contrat de changement majeur/mineur, annulation/réactivation, données opérationnelles existantes |
| Décisions MOA nécessaires | MOA : impacts et révision selon règles ; autorisation des éventuels changements à risque |
| Critères d’acceptation | Ajout/modification/annulation tracé sur mêmes IDs ; seules personnes concernées informées ; aucun renvoi systématique du programme initial, aucune perte de présence ou historique |


## Autres chantiers conservés explicitement

| Chantier | État applicable / prochain travail |
|---|---|
| Participations et assignations | Socles existants à préserver ; compléter le raccord annuel, pas de nouvel algorithme parallèle. Voir chaîne et backlog initial. |
| Cours ECA | PARTIELLEMENT DÉVELOPPÉ : catalogue/événements génériques présents ; contrat spécialisé, import/origine cantonale et parcours métier à compléter. |
| Observations et évaluations | PARTIELLEMENT DÉVELOPPÉ : indicateur d’évaluation et socles ne démontrent pas les observations qualitatives ; conserver leur distinction et définir le parcours manquant. |
| IndeX | BLOQUÉ par source/contrat de synchronisation et décisions ; respecter le gel Y1 ; aucun NIP fictif ni synchronisation automatique. |
| ECAwin | Référentiels/exports existants ; conformité de bout en bout et activités soldées à documenter selon contrat ; ne pas créer un autre référentiel. |
| ProgJour | SUSPENDU ; ne pas reprendre pendant l’audit ni avant décision MOA. |
| GELORE2 | DÉPENDANCE FOURNISSEUR ; aucun développement spéculatif. |
| QV-RULES-001 | Maquette acquise ; éditeur générique existant ; cible huit sections/règle par cursus à compléter ; dépendance à la validation2027 à arbitrer. |
| QV-CYCLE-007 | Priorité chaîne opérationnelle annuelle et changements ciblés ; aucune communication annuelle déclarée terminée. |
| M1–M7/P1–P6 et révisions EM/PR/JSP | Tableau unique conservé dans registre ; décisions P2/P6 et EM16.02 acquises ; application distincte à vérifier ; pas de remise à zéro ni prétention de13 dossiers toujours tous ouverts. |
| Programme annuel 2027 | NON VALIDÉ ; clôture Codir encore provisoire selon source courante ; pas de publication annuelle par cet audit. |

Source de situation actuelle : [docs/SCOPE_V1_SITUATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_V1_SITUATION_20261015.md) (pré-#27 ; seule sa rubrique CMDT/GO est remplacée par #27 et le PASS MOA). Les autres modules de l’inventaire initial sont conservés avec leurs limites de preuve.

## Sources effectivement consultées pour l’actualisation

Lecture intégrale des cinq rapports #23–#27 et de la situation V1, comparaison complète des ajouts du canon et de la roadmap par rapport à #22, lecture ciblée du code cité. Les rapports #20–#22 et les socles de l’audit initial restent acquis. Les 43 fichiers texte modifiés ont été récupérés dans la copie d’audit ; récupération/indexation ne signifie pas lecture humaine intégrale de chacun. Le delta comprend dix commits entre #22 et #27.

| Source | Utilisation et limite |
|---|---|
| [docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md) | Rapport lu intégralement ; preuve datée de son périmètre, non nouvelle exécution |
| [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) | Rapport lu intégralement ; preuve datée de son périmètre, non nouvelle exécution |
| [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) | Rapport lu intégralement ; preuve datée de son périmètre, non nouvelle exécution |
| [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) | Rapport lu intégralement ; preuve datée de son périmètre, non nouvelle exécution |
| [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) | Rapport lu intégralement ; preuve datée de son périmètre, non nouvelle exécution |
| [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md) | Ajouts #24–#27 comparés intégralement ; collisions d’IDs qualifiées par section/date |
| [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_ROADMAP_V1_20261012.md) | Delta intégral lu ; ancienne attente GO CMDT remplacée par livraison #27/PASS |
| [docs/SCOPE_V1_SITUATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_V1_SITUATION_20261015.md) | Lecture intégrale ; état #26 antérieur à livraison #27 |
| [docs/captures/qv-cmdt/preflight-readonly.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-cmdt/preflight-readonly.json) | Preuve SQL versionnée à12:24:08 UTC ; pas lecture courante ni export nominatif de cet audit |
| GitHub API commits/main, PR20–27, compare74ac904…3bdad820 | Vérification directe des fusions et du SHA ; pas de mutation GitHub |
| Netlify getSite + Observability counts/request_logs/request_detail | Déploiement effectivement publié, deux fenêtres de codes et détail limité ; pas de modification |
| Mission humaine actuelle | Décisions et résultats MOA transmis, reproduits dans registre des décisions ; distincts des constats techniques |

### Preuves ciblées consultées

| Fichier versionné | Portée conservée |
|---|---|
| [docs/captures/qv-horaire-layout/results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-horaire-layout/results.json) | PASS rendu desktop1920/1366 ; 921 plages bornées ; aucune écriture métier dans cette preuve |
| [docs/captures/qv-publics-moa/results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-publics-moa/results.json) | PASS unit/clone documenté ; codes bruts préservés ; MOA partielle |
| [docs/captures/qv-consolide-preparation/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-consolide-preparation/targeted-results.json) | PASS cas Échelon/14 jours/calendrier documentés ; pas couverture globale de tout le programme |
| [docs/captures/qv-consolide-preparation/browser-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-consolide-preparation/browser-results.json) | PASS Chrome isolé ; sauvegardes interceptées, zéro écriture métier ; Safari non testé |
| [docs/captures/qv-preparation-sdis/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-preparation-sdis/targeted-results.json) | PASS groupes/11OI/bidirectionnel ; baseline déjà bidirectionnelle : aucune cause cache inventée ; cas Y1−28 jours conservé |
| [docs/captures/qv-preparation-sdis/browser-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-preparation-sdis/browser-results.json) | PASS Chrome isolé ; Safari non testé |
| [docs/captures/qv-preparation-sdis/exports/results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-preparation-sdis/exports/results.json) | Preuve export historique ; pas nouvelle recette export ni PDF témoin attendu |
| [docs/captures/qv-cmdt/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-cmdt/targeted-results.json) | PASS clone représentatif, transactionReadOnly/rollback, empreintes input/output identiques ;944/924 actives |
| [docs/captures/qv-cmdt/browser-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-cmdt/browser-results.json) | PASS Chrome isolé, zéro écriture métier ; Safari non testé |
| [docs/captures/qv-cmdt/exports/results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-cmdt/exports/results.json) | Y1 95/8 pages, SDIS44/5 pages sur fixture ; aucune équivalence au témoin6 pages96 |

## Réserves de l'actualisation et verdict

**AUDIT_INCOMPLET** : les huit livrables sont actualisés pour #20–#27 et les nouvelles décisions, mais l'exhaustivité globale n'est pas attestée. La lecture ciblée du delta ne comble pas les lacunes de l'audit initial : lecture humaine intégrale des 183 documents initiaux/captures non réalisée ; associations complètes règle → scénario → preuve → acceptation manquantes ; parcours authentifiés de tous les profils non vérifiés ; veille physique, expiration réelle Okta et Safari non démontrés ; configuration IdP, correspondance effective DATABASE_URL/projet SQL, exposition Data API/RPC et revue de permissions complète non vérifiées.

Le témoin PDF exact « QUO VADIS 2027, Liste compacte (RECETTE).pdf », six pages, 96 séances, filtre DAP:Y1, est **NON OBTENU**. Recherche de noms de fichiers dans les pièces jointes Codex, le dossier d'audit, les preuves locales PR #27 et le dépôt partagé : 73 PDF indexés, aucun nom correspondant « recette » + « compacte/quo vadis ». Cela ne démontre pas son inexistence ailleurs. Aucun nouveau PDF de production exporté, aucune inspection visuelle de ce témoin revendiquée.

Netlify : fenêtre et codes effectivement lus ; cause précise des six 401 NON VÉRIFIÉE. Les 499 sont compatibles avec des interruptions, sans preuve du motif client. Aucun 5xx retourné sur les deux fenêtres étudiées ; cela ne garantit pas toutes les périodes. Les journaux détaillés consultés ne livrent pas de motif applicatif exploitable pour les requêtes examinées.

Les chiffres MOA 925 séances / 270 activités / 924 réalisations / 1535 couvertures OI / 670 à traiter sont un instantané humain, pas des invariants ni une lecture fraîche de cet audit. La preuve versionnée PR #27 à **14:24:08 heure suisse** relève PREPARATION, 878 préparations persistées et 125 liens de publication ; ces objets ne sont pas des compteurs équivalents aux lignes projetées ou aux séances. Aucun recalcul applicatif ni nouvel appel de GET susceptible d'initialiser le schéma n'a été fait.

Prochain jalon recommandé : revue MOA du dossier actualisé, obtention du témoin PDF et association des preuves manquantes, puis qualification des contrôles bloquants QV et décisions de planning. Le GO de capitalisation phase B, le GO de développement, la validation annuelle et le GO de publication sont distincts. Aucune action future n'est engagée automatiquement par ces documents.

---

## Archive de l’audit initial — état #22, conservé pour traçabilité

**Historique, non mis à jour dans cette section.** Le main74ac904, déploiement08:56, instantanés initiaux, anciens « à développer » et anciens prochains jalons ci-dessous sont à lire avec les rectifications et l’ordre applicable en tête. Cette archive préserve les exigences, preuves, tableaux et décisions non rouverts ; les constats non réévalués restent datés. Elle ne constitue pas un second backlog actif. Aucun état « actuel » contenu dans cette archive ne doit être transféré sans sa date.

Date de référence : **15 octobre 2026**, Europe/Zurich. Phase A seulement.

Référence initiale acquise : `e7672369e08727849e96ef56d4462840d9dfca0e`. Une information postérieure, découverte dans le chat « Correction des filtres DAP », a justifié l'examen **du seul delta PR #22** : main vérifié à `74ac904ff78c464dbc57482c2d7d06ccf3d2300f`, PR #22 fusionnée le 15.10 à 08:55:55 ; Netlify `6ad078fdc7267d841bd7a675`, état ready, publication à **08:56:34.716 heure suisse**. Les contrôles de la base #20/#21 n'ont pas été rejoués. Les trois assets identiques à la production appartiennent à la preuve initiale ; cette preuve n'est pas étendue artificiellement aux nouveaux assets #22.

Sources GitHub épinglées au SHA ci-dessus ; copie de travail d'audit dans `dossier local historique de l’audit (non versionné)`, sans checkout de branche. Aucun code du dépôt partagé modifié. Aucun test exécuté, aucun serveur démarré, aucune migration, écriture métier, PR, fusion ou publication effectuée par cet audit. Les huit rapports sont des **livrables locaux de phase A**, pas une capitalisation GitHub. `docs/SCOPE_PROJECT_MASTER_CONTEXT.md` n'est ni créé ni modifié.

Les résultats historiques PASS sont des preuves de leur périmètre et de leur date. Ils ne constituent ni une nouvelle exécution, ni une validation MOA de toute l'application. Une validation de règle ou de maquette reste distincte de l'acceptation d'un parcours opérationnel. **Programme annuel 2027 NON VALIDÉ.**

## Organisation et axes à préserver

DPS G1 Yverdon-les-Bains / C1 Grandson / B1 Yvonand / B2 Concise ; DAP Y1–Y4 ; JSP G1/C1/B1. Les OI restent qualifiés par domaine. Domaines fonctionnels F0–F8, domaines de formation/planification, familles, natures, qualifications, fonctions, candidatures, cursus et lieux/salles sont des axes distincts. Une fonction descriptive ne crée aucune personne/NIP.

## Architecture et dépendances

`scope.html` charge les composants JS/CSS SCOPE. `scope-ui.js` porte routes/formulaires et `scope-api.js` le transport ; `scope-ui-logic.js` expose les transformations communes. `/api/scope/*` aboutit à la fonction Netlify `scope`, puis aux services métier et au dépôt PostgreSQL. Les fonctions personnel et auth ont leurs entrées dédiées. PDFKit produit les PDF, PDF.js les présente. `scripts/build-scope-static.js` prépare `dist/scope` ; ne pas confondre l'ancien index/MonitoringF7 ou ORION avec le site SCOPE.

Personnes/périodes/affectations/qualifications → populations datées/publics → attendus/événements → présences/roles/consolidation → analyses/rapports. Catalogue/CTA/cursus/calendrier → préparationsQV → validation annuelle → plan/publication/liensévénements → assignations/programmes/communication. QV-CYCLE-007 indique que la chaîne complète reste à démontrer. Les statistiques se fondent sur la date civile réelle, pas le cycle métier.

Dépendances bloquantes2027 : clôtureCodir, contrôles bloquants et décisions/révisions ; rôle exact de QV-RULES-001 dans le gate2027 à confirmer. GELORE2/ProgJour ne doivent pas devenir artificiellement bloquants pour les correctifsQV acquis. Moteurs réutilisables : CTA, calendrier, rules/publics datés, policies participation, consolidation, projection/reconduction, plan/exécuteur publication, PDF/CSV.

## Modules : fonctions existantes, attendues et réserves

Développement par défaut **DÉVELOPPÉ NON VALIDÉ** au sens acceptation MOA exhaustive du périmètre actuel : code et campagnes historiques existent, sans nouvelle acceptation implicite. Cela ne rouvre pas les acquis. Les exceptions et fonctions futures sont détaillées dans la roadmap.

### Accueil/tableau de bord

| Dimension | État / source |
|---|---|
| Objectif | Pilotage et KPI officiels |
| Fonctions existantes | Dashboard, graphiques, objectifs, navigation vers événements |
| Composant | [netlify/lib/_scope-dashboard-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-dashboard-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-ANALYTICS dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Non-démonstration d’une nouvelle recette tous profils ; registre d’anomalies lié |

### Personnel

| Dimension | État / source |
|---|---|
| Objectif | Identités et éligibilité datée |
| Fonctions existantes | Liste/fiche NIP, grades, statuts RH, périodes, affectations multiples, import/analyse/commit, inactivation/correction |
| Composant | [netlify/lib/_scope-personnel-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PERSONNEL dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | DATE_ENTREE_SDIS, correspondances IndeX et exhaustivité réelle à vérifier sans export nominatif ; registre d’anomalies lié |

### Qualifications/spécialisations

| Dimension | État / source |
|---|---|
| Objectif | Compétences personnelles distinctes des fonctions |
| Fonctions existantes | C3-B, intervalles, preuves, aliases, pas de qualification synthétisée depuis QV |
| Composant | [netlify/lib/_scope-person-qualifications.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-person-qualifications.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-INDEX dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Backfill personnel non autorisé par présence du schéma ; registre d’anomalies lié |

### Événements

| Dimension | État / source |
|---|---|
| Objectif | Activités opérationnelles et versions |
| Fonctions existantes | Créer/modifier, figer attendus, saisir présences/encadrement, annuler/réactiver, clôturer/rouvrir, imports |
| Composant | [netlify/lib/_scope-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PARTICIPATION dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Ne pas assimiler occurrence Programme à événement opérationnel ; registre d’anomalies lié |

### Présences/obligations

| Dimension | État / source |
|---|---|
| Objectif | Participation selon politiques et rôles |
| Fonctions existantes | Nominatif, quantitatif, excuses/dispenses, attendus, PR1.1–1.6, consolidation et clôture |
| Composant | [netlify/lib/_scope-participation-policy.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-participation-policy.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PARTICIPATION dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Auxiliaires/formateurs/surveillants ne sont pas des contributions indifférenciées ; registre d’anomalies lié |

### DAP permutations/rattrapages

| Dimension | État / source |
|---|---|
| Objectif | Équivalence d’exercice et régularisation |
| Fonctions existantes | Permutations, rattrapages, séries, exercise_equivalence_key |
| Composant | [netlify/lib/_scope-obligation-consolidation.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-obligation-consolidation.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-DAP-EQUIVALENCE dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Libellé seul insuffisant pour équivalence ; registre d’anomalies lié |

### Cycles PR/AUTO et multi-session

| Dimension | État / source |
|---|---|
| Objectif | Une contribution selon exercice et policy |
| Fonctions existantes | Cycles, rattachement séances/personnes, état multi-session, version annuelle |
| Composant | [netlify/lib/_scope-cycle-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cycle-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PARTICIPATION dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Cycle de formation distinct de cycle annuel QV ; registre d’anomalies lié |

### JSP

| Dimension | État / source |
|---|---|
| Objectif | Suivre les jeunes sans confondre moniteurs |
| Fonctions existantes | Publics/site/flammes, présences/excuses, reporting JSP et rôles encadrement |
| Composant | [netlify/lib/_scope-jsp-reporting.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-jsp-reporting.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-JSP-PART dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | JSP-CAD canonique garde ses réserves de données ; pas d’âge supposé ; registre d’anomalies lié |

### Vigilance

| Dimension | État / source |
|---|---|
| Objectif | Signaler causes opérationnelles et objectifs |
| Fonctions existantes | Alertes échéance, non figé, saisie/clôture, acquittement distinct résolution |
| Composant | [netlify/lib/_scope-alerts-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-alerts-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-ANALYTICS dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Seuils individuels non décidés pas activés par audit ; registre d’anomalies lié |

### Statistiques/analyses

| Dimension | État / source |
|---|---|
| Objectif | Taux officiels et agrégats civils |
| Fonctions existantes | Global/domaine/OI/spécialisation/individu, motifs, permutations, objectifs datés |
| Composant | [netlify/lib/_scope-analytics-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-analytics-service.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-ANALYTICS dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | LEGACY distinct, non évalué exclu du taux sans supprimer présences ; registre d’anomalies lié |

### Rapports/exports

| Dimension | État / source |
|---|---|
| Objectif | Restitution existante des mêmes moteurs |
| Fonctions existantes | PDF événement/personnel/formation/participation/Stat.Com, QV annuel/compact/mensuel et CSV |
| Composant | [netlify/lib/_scope-report-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-report-service.js) |
| Fonctions attendues / travaux restants | Fiche QV-EXPORT-002 dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Audit ne produit aucun export de personne ; gap CSV personnel distinct ; registre d’anomalies lié |

### Catalogue annuel

| Dimension | État / source |
|---|---|
| Objectif | Références et versions, pas événements par défaut |
| Fonctions existantes | Activités, réalisations source, thèmes, périodicités, publics/qualifications, imports, cycles |
| Composant | [netlify/lib/_scope-annual-catalog-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog-service.js) |
| Fonctions attendues / travaux restants | Fiche QV-FAMILLES-STOCK dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Catalogue≠programme≠publication ; sources2026 protégées ; registre d’anomalies lié |

### QUO VADIS

| Dimension | État / source |
|---|---|
| Objectif | Préparer le Programme annuel |
| Fonctions existantes | Agenda annuel, programme tableau/mensuel, fiches, manuel/types, reconduction, cycles, contrôles, calendrier, salles, publication/révisions |
| Composant | [netlify/lib/_scope-quo-vadis-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-service.js) |
| Fonctions attendues / travaux restants | Fiche QV-FILTRES-001 dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | 2027 PREPARATION ; non-validation annuelle confirmée ; registre d’anomalies lié |

### CTA/instructions

| Dimension | État / source |
|---|---|
| Objectif | Rotation et publics selon règles datées |
| Fonctions existantes | Permanences, demi-sections, saison, couverture, PIONNIER CSU-nvb |
| Composant | [netlify/lib/_scope-cta-rules.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cta-rules.js) |
| Fonctions attendues / travaux restants | Fiche QV-CTA-001/007 dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Un seul moteur ; pas de reset au1erjanvier ; registre d’anomalies lié |

### Formation/cursus

| Dimension | État / source |
|---|---|
| Objectif | Catalogue et suivi existants |
| Fonctions existantes | FOBA/FOCO/FOCA/FOSPEC/AUTO/PR/PAPR, CI DPS/CI DAP/C groupe/TP9/OFSI et autres références |
| Composant | [netlify/lib/_scope-training-context-resolver.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-training-context-resolver.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-ECA-COURSES dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Cursus≠spécialisation ; parcours ECA spécialisé incomplet ; registre d’anomalies lié |

### Publics canoniques en miroir

| Dimension | État / source |
|---|---|
| Objectif | Comparer sans bascule arbitraire |
| Fonctions existantes | DSL C2-B, éligibilité datée et traces, interfaces legacy, C3-B |
| Composant | [netlify/lib/_scope-public-engine.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-public-engine.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PERSONNEL dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Miroir existant ne remplace pas populations figées ni participation ; registre d’anomalies lié |

### Publication/révisions

| Dimension | État / source |
|---|---|
| Objectif | Lier/mettre à jour sans doublon |
| Fonctions existantes | Plan/exécuteur/store, empreintes, version, impacts présences, pending, rollback transactionnel |
| Composant | [netlify/lib/_scope-qv-publication-executor.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-publication-executor.js) |
| Fonctions attendues / travaux restants | Fiche QV-CYCLE-007 dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | GO technique≠GO annuel ; pas de chaîne communication complète revendiquée ; registre d’anomalies lié |

### Administration/paramètres

| Dimension | État / source |
|---|---|
| Objectif | Gouverner les références et accès |
| Fonctions existantes | Objectifs, suivi nominatif, policies/formation, imports, utilisateurs, permissions, audit |
| Composant | [netlify/lib/_rbac.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_rbac.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PILOT-IMPORT dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Une permission d’écriture générique ne prouve pas la bonne permission de chaque commande ; registre d’anomalies lié |

### Authentification/sessions

| Dimension | État / source |
|---|---|
| Objectif | Accès Okta/OIDC et LOCAL |
| Fonctions existantes | Cookies signés, comptes/droits, session LOCAL Blobs, refresh/logout/inactivité, brouillon mémoire |
| Composant | [netlify/lib/_auth-utils.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_auth-utils.js) |
| Fonctions attendues / travaux restants | Fiche SEC-AUTH-22 dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | État LOCAL selon #22 ; Okta réel/veille non réexécutés ; registre d’anomalies lié |

### Intégrations futures

| Dimension | État / source |
|---|---|
| Objectif | Réutiliser données et identités |
| Fonctions existantes | IndeX/ECAwin, ProgJour, GELORE2, observations/évaluations |
| Composant | [netlify/lib/_scope-ecawin-referential.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-ecawin-referential.js) |
| Fonctions attendues / travaux restants | Fiche SCOPE-PROGJOUR dans SCOPE_ROADMAP_CONSOLIDEE_20261015.md |
| Règles et dépendances | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) ; [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| Tests | Voir annexe par fichier/scénario dans la matrice ; aucune suite exécutée |
| MOA | Règles canoniques ou baseline citées ; validation complète du module actuel NON VÉRIFIÉE |
| Anomalies/risques | Suspendu/contrats attendus, aucune synchronisation déduite ; registre d’anomalies lié |

## Pages et routes de navigation détectées

Extraction de chaînes littérales `#/...` : inventaire de routes référencées, pas preuve que chaque sous-menu est actuellement visible pour chaque profil.

- `#/accueil`
- `#/administration`
- `#/cycles`
- `#/cycles/`
- `#/evenements`
- `#/exercices`
- `#/exercices/`
- `#/exercices/nouveau`
- `#/personnel`
- `#/personnel/`
- `#/quo-vadis/`
- `#/quo-vadis/activites/`
- `#/quo-vadis/catalogue-annuel`
- `#/quo-vadis/catalogue-annuel/`
- `#/quo-vadis/programme`
- `#/quo-vadis/programme/`
- `#/quo-vadis/synthese`
- `#/rapports`
- `#/rapports/formation`
- `#/rapports/participation`
- `#/reglages/formations`
- `#/reglages/import-evenements`
- `#/reglages/import-personnel`
- `#/reglages/objectifs`
- `#/reglages/participation`
- `#/reglages/suivi`
- `#/reglages/utilisateurs`
- `#/statistiques`
- `#/vigilance`
- `#/vue`
- `#/vue/`

## Fonctions Netlify et services

| Fichier | Rôle de l’inventaire |
|---|---|
| [netlify/functions/admin-settings.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/admin-settings.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/admin-users.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/admin-users.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/audit-log.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/audit-log.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-config.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-config.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-login.mjs](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-login.mjs) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-logout.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-logout.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-me.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-me.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-oidc-callback.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-oidc-callback.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-oidc-start.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-oidc-start.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/auth-refresh.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/auth-refresh.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/data-imported-events.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/data-imported-events.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/data-objectives.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/data-objectives.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/data-records.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/data-records.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/data-reference-periods.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/data-reference-periods.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/data-status.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/data-status.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-correct-period.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-correct-period.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-detail.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-detail.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-effectif-at-date.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-effectif-at-date.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-history.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-history.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-import-analyze.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-import-analyze.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-import-commit.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-import-commit.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-inactivate.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-inactivate.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope-personnel-list.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope-personnel-list.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/scope.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js) | Point d’entrée serveur ; autorisation effective à lire par route |
| [netlify/functions/users.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/users.js) | Point d’entrée serveur ; autorisation effective à lire par route |

### Services, composants et moteurs détectés

| Fichier | Fonctions déclarées / méthodes candidates |
|---|---|
| [netlify/lib/_audit-server.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_audit-server.js) | auditEntry, listAudit |
| [netlify/lib/_audit-store.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_audit-store.js) | rid, safeContext, addAudit, listAudit |
| [netlify/lib/_auth-identity.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_auth-identity.js) | clean, normalizeIdentityText, isApplicationIdentity, firstHuman, resolveHumanIdentity, hasHumanIdentity, displayNameFromClaims, displayNameFromUser, mergeStoredUserWithIdentity |
| [netlify/lib/_auth-utils.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_auth-utils.js) | response, parseBody, base64url, hashPassword, scryptParams, createPasswordHash, parseScryptHash, timingEqualBuffers, verifyPassword, timingEqualHex, getSecret, getUsers, getAuthMethods, isAuthMethodEnabled, signToken, verifyToken, bearerToken, publicUser, publicOidcUserFromClaims, findUser, resolveSessionUser, verifyAccess, authFailureResponse |
| [netlify/lib/_data-store-postgres.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_data-store-postgres.js) | getCollectionConfig, itemId, readCollection, writeCollection |
| [netlify/lib/_data-store.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_data-store.js) | storageDriver, getBlobsStore, requireAccess, forbiddenIfNoWrite, validatePayload, readCollection, writeCollection, storageUnavailablePayload, handleCollection |
| [netlify/lib/_local-login.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_local-login.js) | Exports/méthodes : voir source |
| [netlify/lib/_local-sessions.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_local-sessions.js) | store, createSession, requireSession, revokeSession |
| [netlify/lib/_oidc-utils.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_oidc-utils.js) | base64url, decodeBase64url, jsonFromBase64url, requiredEnv, oidcConfig, hmac, signedStateCookie, verifyStateCookie, parseCookies, queryParams, oidcErrorReason, secureCookie, clearCookie, discovery, tokenRequest, jwkForToken, verifyIdToken, rolesFromClaims, publicUserFromClaims, sanitizeReturnTo, redirect, oidcStartResponse, oidcCallbackResponse |
| [netlify/lib/_postgres.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_postgres.js) | getDatabaseUrl, getPool, query, transaction, ensureCoreSchema, createMetrics, withMetrics, currentMetrics |
| [netlify/lib/_rbac.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_rbac.js) | roleKey, normalizeRole, normalizeRoles, dominantRole, permissionsForRoles, hasPermission, requirePermission, canWriteRecords, isAdminRole |
| [netlify/lib/_scope-alerts-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-alerts-service.js) | groupBy, batchRows, looksLikeUuid, resolveCible, packOfficiel, pct, gapPts, personId, personDisplay, personMeta, personEligibleByDates, gradeRank, alertImpact, createScopeAlertsService, operationalAlerts, objectiveAlerts, personUnderObjectiveAlerts, unexcusedAbsenceAlerts, cycleOverlapsPeriod, cycleIncompleteAlerts, markDataQuality, applyAck, listAlerts, acquitter |
| [netlify/lib/_scope-alerts.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-alerts.js) | volumesComplete, volumesIncoherent, todayIso, fingerprint, ctaFor, packAlert, mapCibles, classifyOperationalAlert, toInboxItem, isUnderObjective, formatPct, formatGapPts, packObjectiveAlert, packObjectifAbsent |
| [netlify/lib/_scope-analytics-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-analytics-service.js) | truthy, exclusionBucket, officialTotals, timeseriesFromOfficial, timeseriesFromLegacy, looksLikeUuid, personEligibleByDates, filterEligibleAttendus, eventIdOf, fulfilledPermutationPersonIdsForEvent, multiSessionGroupKey, isMultiSessionConsolidatedEvent, isRealisedEvenement, realisedGroupEventIds, consolidatedVolumesFromSessionState, officialFromSessionState, officialFromPersonSessionRows, officialFromIndividualActivity, officialFromPersonActivity, statutFromPersonSessionRows, isCatchupOnlyTrace, resolveQuery, createScopeAnalyticsService, loadBundle, classify, addDirectoryRate, evaluate, summary, summaryFrom, explain, explainFrom, timeseries, timeseriesFrom, snapshot, directoryRates |
| [netlify/lib/_scope-analytics.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-analytics.js) | inferModeSuivi, safePercentage, emptyVolumes, volumesFromTaux, addVolumes, officialFromTaux, readIntegerField, parseQuantitatifInput, officialFromQuantitatif, parsePayload, legacyPointFromAggregate, resolveObjective, analyticStatus, gapPct |
| [netlify/lib/_scope-annual-catalog-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog-ddl.js) | childTriggerSql |
| [netlify/lib/_scope-annual-catalog-import-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog-import-ddl.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-annual-catalog-import.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog-import.js) | normalize, marked, unique, sortDomains, sha, canonicalJson, slug, excelDate, excelTime, headerName, rowsFromWorkbook, inferActivityType, inferSpecializations, inferRow, proposalClassification, buildProposals, summarize, analyzeWorkbook, importFingerprint, applyHumanDecisions |
| [netlify/lib/_scope-annual-catalog-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog-service.js) | domainRank, text, dateOnly, dateForYear, integer, actorId, rows, one, strictTime, upperList, optionalTime, canonicalRule, groupExerciseOccurrences, slug, normalizeActivityInput, insertRequiredReference, insertActivityVersion, bindThemes, strictDate, resolveAliasedField, draftInputWithDefaults, validateDraftInput, readinessMessage, readyErrorMessage, readyTransitionMessages, readyTransitionMessage, toPublicReadyTransition, readinessForClient, publicRow, loadCatalogReferences, requireCanonicalCodes, requireReady, persistedImportDecisions, findDefinition, requireScopedRequirement, loadContext, serializeContext, inspectReadyTransition, createScopeAnnualCatalogService |
| [netlify/lib/_scope-annual-catalog.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-catalog.js) | text, upper, integer, dateOnly, idOf, strictDate, strictTime, canonicalize, canonicalJson, fingerprint, normalizeThemeLabel, deterministicUuid, validatePeriodicity, validateSessionTemplates, validatePlanningConstraint, validUniqueList, validateStatisticalContribution, validateDefinitionContract, findForbiddenPersonKey, applicableRuleVersions, normalizeThemeAssignment, validateThemeAssignments, prepareAnnualRequirementReady, generateAnnualProgram, validAnnualSnapshot, generationSemanticConfig, validateAnnualRequirementMutation, resolveAliasedField, projectToQuoVadis, classifyLegacyCandidates |
| [netlify/lib/_scope-annual-report-rule.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-report-rule.js) | effectiveRule, closesCycleYear |
| [netlify/lib/_scope-annual-theme-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-annual-theme-ddl.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-assignment-constraints.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-assignment-constraints.js) | text, upper, unique, eventId, personId, dateOnly, timeOnly, plusDays, intervalForEvent, overlap, relationMap, participantState, shared, issue, evaluateAssignmentConstraints |
| [netlify/lib/_scope-calendar.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-calendar.js) | todayZurichIso, calendarDate, isEchu |
| [netlify/lib/_scope-canonical-foundations.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-canonical-foundations.js) | normalizeCode, legacyTargetKey, classifyLegacyTarget, diagnoseLegacyTargets |
| [netlify/lib/_scope-canonical-readiness.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-canonical-readiness.js) | values, inspectCanonicalReadiness |
| [netlify/lib/_scope-catalog-convergence-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-catalog-convergence-ddl.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-catalog-convergence.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-catalog-convergence.js) | blueprint, reviewBlueprint, rule, blueprintFingerprint, normalizeLabel, upper, unique, classifyLegacyActivity, result, detectPublicCodes, canonicalPublicCode, detectSessionInformation, aliasFromClassification, buildLegacyAliases, buildAnnualRequirements2027, blueprintContract, hasHumanDecision, reconcileQuoVadisMirror, compareLegacyAndCanonical, comparisonKey, normalizedArray, compareField, stripComparisonFields, compareSessions, buildConvergenceDiagnostic |
| [netlify/lib/_scope-chart-tokens.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-chart-tokens.js) | hexToRgb, colorOf |
| [netlify/lib/_scope-core-contract.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-core-contract.js) | clean, normalizeDomaine, normalizePerimeter, domainSpecialisationLabel, perimeterLabel, rankIn, comparePerimeter, compareName, compareInstitutional, canonicalEventDomaineFromLegacy, acceptedEventDomains, autoPerimeterCodes, participationFactKey |
| [netlify/lib/_scope-csv-import.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-csv-import.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-cta-rules.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cta-rules.js) | operationalHalfSections, isReserveHalfSection, expectedAnnualConduites, conduiteEngineOptions, dateKey, utcDate, addDays, cycleIndex, atCycle, assignmentsForFriday, instructionPublicForDate, easterSunday, thirdMondayOfSeptember, vaudHolidays, vaudSchoolVacations, compactAssignments, applyCtaRules, generateYear |
| [netlify/lib/_scope-cycle-rules.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cycle-rules.js) | normalizeText, normalizeUpper, normalizeDomain, personneId, eventId, cycleId, exerciseId, exerciseModeSession, exerciseExpectedSessionCount, exerciseConsolidationActive, personneLookup, dedupeKey, addPerson, isSessionCountingParticipation, sortedValues, classifyPrGlobalSessionStatut, cycleTechnicalIdentity, sameTechnicalCycle, buildCycleProposal, proposeCycleLink, roleCycle, statutCycle, assignedEventId, participatedEventId, eventBelongsToCycle, cycleEvents, eventStatut, isCancelledEvenement, isHiddenEvenement, isEventOperational, eventContributionState, isEventStatisticallyCountable, isEventCycleExigible, isParticipationCountable, resolveCycleCompletion, mapEventCounts, prExerciseGroupKey, reportingYearPeriodForEvent, normalizeReportingPeriod, eventInReportingPeriod, resolveSessionReportingScope, prSessionKey, prSessionLabel, parseSessionOrder, sortSessionEvents, sessionExerciseLabel, personDisplayName, motifExcuseLabel, motifDispenseLabel, prExerciseEvents, computeCycleMetrics, autoObligationKey, cycleObligationKey, cycleObligationLabel, personIdentityFromKey, statusRank, statusFromDecision, buildCyclePilotage, computeMultiSessionParticipationState, multiSessionExerciseGroupKey, multiSessionSessionKey, multiSessionSessionLabel, multiSessionEvents, computePrExerciseParticipationState, computeSessionParticipationState, computeStandardEventMetricsUnchanged, isValidSessionStatut, isNonContributiveEncadrementRole, isAuxiliaireRole, isIndividualActivityEncadrementRole, isValidSessionDecision, isIndividualActivityContribution, canCloseLastSession, personHasValidStatusInSession, collapsePersonSessionHistory |
| [netlify/lib/_scope-cycle-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cycle-service.js) | actorId, normalizeDomain, text, optionalText, optionalFilter, derivedCycleId, multisessionCycleId, isDerivedCycleId, isMultisessionCycleId, multisessionIdentityFromId, derivedIdentityFromId, eventId, dateOnly, yearOfEvent, sessionNumber, cycleLabelFromEvents, cycleDisplayLabel, projectCycleLabel, cycleStatusFromCompletion, multiSessionStatusFromState, dateRangeFromSessions, personDedupeKey, hydratePeople, normalizeCyclePayload, normalizeCyclePersonnePayload, createScopeCycleService, cycleMetrics, cyclePilotage, detail, buildMultiSessionState, multiSessionPilotageFromState, multisessionCycleDetail, derivedCycleFromEvents, derivedCycleMetrics, derivedCycles, derivedCycleDetail |
| [netlify/lib/_scope-dap-y4-sql.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-dap-y4-sql.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-dashboard-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-dashboard-service.js) | packOfficiel, createScopeDashboardService, dashboard, graphs |
| [netlify/lib/_scope-ecawin-referential.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-ecawin-referential.js) | synchronizeEcawinReferential |
| [netlify/lib/_scope-event-code.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-event-code.js) | text, upper, unique, parseEventCode, formatEventCode, chronology, oiRank, businessOrder, stableIdentity, compareEvents, consumedByStatCom, initialAllocations, compareEventCodes, appendPersistedEventCode, preparePersistedInitialCodes, allocateInternalEventCode |
| [netlify/lib/_scope-event-series.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-event-series.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-functional-catalog-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-functional-catalog-ddl.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-functional-catalog.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-functional-catalog.js) | text, upper, unique, canonical, fingerprint, id, normalizedArray, sameEvidence, minutesOf, durationMinutes, durationLabel, finalActivityLabel, numberedActivityLabel, scheduledActivityLabel, programmeActivityPresentation, allocateActivityCode, numberedLabel, buildConvergenceMatrix, normalizeFunctionalProfile, annualConfiguration, day, date, addDays, nextWeekday, intervalStart, intervalEnd, overlaps, calendarRangesOverlap, intersects, weekdayOf, statusSet, normalizeCalendarRules, evaluateCalendarDate, progressFobaLevel, canonicalFobaResponsibility, normalizeSlot, permutationCovers, compatibilityBetween, detectCompatibilityConflicts, explainConflict, presentConstraintCause, proposeBestDates, validateMove, proposeAnnualSchedule, detectPublicConflicts |
| [netlify/lib/_scope-generic-event-catalog.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-generic-event-catalog.js) | text, upper, nfc, slug, normalizeComparable, yearFrom, dateOnly, normalizeMode, definitionCode, policyCode, normalizeDefinition, normalizePopulationRule, normalizeDefinitionVersion, normalizePolicyVersion, snapshotDefinitionVersion, resolveEngineRoute, validateDefinitionVersion, policyVersionFromDomainPolicy, findApplicableVersion, extractSessionIndex, suggestedSessionIndexFromLabel, decisionForLine, versionById, definitionForVersion, matchPayload, enrichImportLinesWithMatches, reconductDefinitionVersion, performanceBaseline |
| [netlify/lib/_scope-graphs.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-graphs.js) | hasSousDomaines, sousDomaineLabel, familyCodes, isDapPerimeter, queryKey, packFromEvents, pointFromPack, dataset, explainSlice, evolutionDataset, compositionDataset, motifsDataset, permutationsDataset, personRepartitionDataset, personDomainKey, yearSeriesDataset, domainesAnneesDataset, specialisationsAnneesDataset, comparisonDataset, includedOf, buildScopeGraphs, ev, emptyGraphs |
| [netlify/lib/_scope-hsc-preflight.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-hsc-preflight.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-import-contract.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-import-contract.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-inbox.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-inbox.js) | classifyInboxItem |
| [netlify/lib/_scope-json-transport.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-json-transport.js) | header, compactJsonResponse |
| [netlify/lib/_scope-jsp-reporting.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-jsp-reporting.js) | clean, pct, emptyCounts, finalizeCounts, normalizeSite, normalizeDomaine, normalizePerimeter, selectedBlocks, statusBucket, motifLabel, periodLabel, subdivisionForPersonAt, siteForPersonAt, reportSubdivisionForPersonAt, compareName, compareInstitutional, displayPerson, peopleById, assignmentsByPerson, eventSubdivision, graphPayload, subtypeLabel, subdivisionsFor, personKey, objectiveFor, eventDomainsFor, domaineLabel, formationDomainRank, emptyReport, createScopeParticipationReportingService, report, formationReport, createScopeJspReportingService |
| [netlify/lib/_scope-memory.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-memory.js) | now, dateOnly, createMemoryRepo, keyEP, keyLigne, keyCP, keyMsSession, keyMsPopulation, keyMsParticipation, decorateEvent, cloneMap, mapMemoryStatCom, snapshot, restore |
| [netlify/lib/_scope-model.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-model.js) | isJspDomaine, motifsSaisieForDomaine, participationStatutLabel, normalizeExerciseEquivalenceKey, exerciseEquivalenceKeyForEvent, isCompatiblePermutationEvent, displayDomaineCode, domaineAffiche, domaineCodesForFilter, isSousDomaineFospec, normalizeMotifKey, emptyExcuseBreakdown, addExcuseBreakdown, excuseTotalFromBreakdown, emptyModelVolumes, volumesFromBreakdown, quantitatifEquality, resolveSuiviNominatif, canPhysicallyDeletePersonne |
| [netlify/lib/_scope-multisession-report.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-multisession-report.js) | eventId, personId, personKey, classifyGlobalSessionStatut, signatureRoleForExercise, motifLabel, yearBoundsFromDate, dateInPeriod, canonicalExerciseKey, specializationForDomaine, readingNotesFor, formatPctFr, buildConclusion, mapNominativeRow, formatTaux, rateOnDenom, seanceDisplayLabel, compareGradeNomPrenom, officialFromVolumes, loadSessionBundle, buildSessionDataset, assertAllReportSessionsClosed, subsetBundle, collectMultisessionReport |
| [netlify/lib/_scope-multisession-v2.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-multisession-v2.js) | norm, upper, personId, eventId, dateOnly, sessionLabel, sortSessions, mergePerson, targetPopulationSet, buildState, decorateAttendus, calculateStatistics, validateFinalClosure |
| [netlify/lib/_scope-objectives-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-objectives-service.js) | actorId, historiqueProtegeMessage, isFutureObjectif, isHistoryProtected, parseSeuil, createScopeObjectivesService, summarize, listObjectifs, getObjectif, assertNoOverlap, normalizePortee, createObjectif, patchObjectif, deleteObjectif, cloturerObjectif, nouvellePeriode, desactiverObjectif, resolveObjectif |
| [netlify/lib/_scope-objectives.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-objectives.js) | dateOnly, addDays, coversDate, isActif, scopeKey, periodsOverlap, mapObjective, inferAnalysisGrain, covering, resolveObjective, resolveEventObjective, collectObjectiveContext, gapAgainst |
| [netlify/lib/_scope-obligation-consolidation.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-obligation-consolidation.js) | text, upper, eventId, personId, requiredSessionCount, participationProvenance, permutationForCell, catchupResult, consolidateCell, personState, round1, consolidatePilotage |
| [netlify/lib/_scope-participation-catalogue.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-participation-catalogue.js) | participationEvaluation, normalizeDecision, serializeRule |
| [netlify/lib/_scope-participation-policy.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-participation-policy.js) | statusRow, statusCatalog, basePolicy, normalizeDomain, listFrom, motifRow, motifCatalog, mergePolicyRow, cloneSeriesFamilies, sanitizePolicy, normalizeSeriesLabel, persistedSeriesDecision, notationSeriesDecision, resolveEventSessionPolicy, describeEventSeries, isPrDefaultDispenseDump, resolveParticipationPolicy, policySnapshot, motifsForPolicy, listDefaultPolicies |
| [netlify/lib/_scope-pdf-charts.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-pdf-charts.js) | rgb, uniqueThreshold, drawLineChart, drawBarChart, drawStackedBar, groupedPalette, seriesColor, drawGroupedChart, drawDonutChart, chartHeight |
| [netlify/lib/_scope-pdf-renderer.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-pdf-renderer.js) | qvMonthCalendarLines, resolveSignaturePrPath, headerLogoLayout, headerTitleLayout, rgb, formatTaux, formatGap, formatVolume, periodLabel, formatDisplayDate, formatDisplayDateTime, formatStatComValidity, statComPdfRow, hasLogo, nominativeInfoLabel, permutationSummaryLabel, isCatchupPdfRow, renderReportPdf, renderStatComReferentialPdf, renderQuoVadisProgrammePdf |
| [netlify/lib/_scope-period.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-period.js) | pad2, utcDate, lastDayOfMonth, yearBounds, monthBounds, quarterBounds, semesterBounds, spanDays, parsePeriod, inPeriod, monthKey |
| [netlify/lib/_scope-person-qualifications-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-person-qualifications-ddl.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-person-qualifications.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-person-qualifications.js) | upper, isoDate, personId, canonicalizeQualification, mapLegacyQualificationAssignment, overlaps, covers, validateQualificationLifecycleMutation, validateQualificationSupersession, buildPersonQualificationBackfill, toCanonicalCompetenceFacts, deriveJspYouthRoleFacts, definition |
| [netlify/lib/_scope-person-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-person-service.js) | isArchivedStatut, labelOi, permutationSectionLabel, eventRowId, timeseriesFromVisibleEvents, hiddenEvenementIds, excludeHiddenEventRows, enrichPersonPermutationRows, affectationPayload, coveringAffectations, principalOi, includedStatsByEventId, isConsolidatedSessionAnalyticsRow, isEncadrementHistoryRole, isOperationalHistoryParticipation, eventSessionGroupKey, personHistoryRow, personIsConcernedByEvent, personOperationalHistoryEvents, openRows, periodOverlap, statutLabel, matchesOi, visibleInDirectory, congeLibelle, identityPayload, personGraphs, createScopePersonService, actorId, cleanedIdentityPatch, ciblesMap, directory, fiche, updateIdentite |
| [netlify/lib/_scope-personnel-import-contexts.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel-import-contexts.js) | clean, normalizeJspGrade, resolveImportContext, isJspYouthGrade, isLegacyJspCadetGrade, isActiveAssignment, hasActiveOi, isJspMonitor, isJspYouth, classifyJspRole, visibleImportContexts, normalizeJspSite, jspSitesFromCibles, contextAssignment, normalizeFobaCible, normalizeAutoCible, assignmentKey, assignmentMatchesContext, personMatchesJspPopulation, populationLabel, specializationLabel, oiLabel |
| [netlify/lib/_scope-personnel-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel-service.js) | rid, clean, httpError, normalizeNip, monitoringStart, lastDayOfPreviousYear, getDb, ensureScopeSchema, parseDelimitedLine, normalizeHeader, parsePersonnelCsv, normalizeOiToken, parseOiAssignments, specializationForContext, normalizeAssignments, assignmentKey, hasOpenDomaineOi, gradesEqual, identityChanged, normalizeRows, currentContextAssignments, summarizeLine, buildAbsentLine, summarizeAnalysis, buildPreview, loadJspSites, resolveSiteOrThrow, loadExistingForNips, sqlPlaceholderArity, assertSqlBind, buildPopulationQuery, loadPopulation, defaultDecision, requiresExplicitDecision, unresolvedRequiredDecisions, planCommitMutations, analyzeImport, jsonParam, mutationOutcome, commitImport, personIdFor, mapPerson, mapAssignment, listPersonnel, appendPersonnelJournal, getPersonneByNip, createManualPersonne, getPersonne, updatePersonne, updateAffectation, getPopulationAtDate, effectifAtDate, groupAssignmentsByPerson, computeEffectifsFromAssignments, assignmentRecordId, applyAssignmentClosures, closePersonneAffectation, inactivatePersonne, correctPersonneInactivation, correctAffectationPeriod, isSabbaticalPeriode, periodeBounds, periodeCoversDay, sabbaticalPayload, openSabbatical, endSabbatical, resolveCreateAssignmentInput, assignmentIdentityKey, assignmentsOverlap, createAffectation, importTypeLabel, listPersonnelImportHistory, getPersonnelImportBatch, situationAtDate |
| [netlify/lib/_scope-personnel-sync-contract.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel-sync-contract.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-personnel-sync.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel-sync.js) | actorId, actorLabel, loadContext, buildPreview, previewPersonnelSync, syncPersonneSnapshot, journal, applying, closePrincipalAffectations, openAffectation, resolveCible, journalClosedAffectations, applyArchive, applyReactivation, applyConge, applyFinConge, commitPersonnelSync |
| [netlify/lib/_scope-personnel.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-personnel.js) | addDays, dayBefore, periodCovers, evaluateEligibility, fallbackDates, assertPeriodCompatible, deriveStatutCourant, closeAllOpenAffectations, inconsistentSortiWithOpenAffectations, periodFromPersonneRow, filterAttendusEligibleAtDate |
| [netlify/lib/_scope-pg.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-pg.js) | dateOnly, mapEvent, mapExercise, mapEventDefinition, mapEventDefinitionVersion, mapStatCom, mapParticipationPolicyVersion, mapCycle, mapCyclePersonne, mapObjectif, participationEvaluationSql, eventSelectSql, normalizeAffectationInput, mapPersonneDates, mapAffectationDates, createPgRepo, countDelete, getPgRepo |
| [netlify/lib/_scope-programme-cycle.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-programme-cycle.js) | date, nextDay, resolveProgrammeCycle, classifyProgrammeDate, programmeDateAdmission, occurrenceIdentity, sameOccurrence |
| [netlify/lib/_scope-public-engine.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-public-engine.js) | stableValue, stableStringify, sha256, upper, normalizedCodes, validationError, normalizePublicRule, visit, validatePublicRule, fingerprintPublicRule, dateOnly, inRange, normalizedFactDate, personId, factId, factDates, currentFacts, personEligible, requiredInputs, evaluatePredicate, evaluateNode, incompleteResult, evaluatePublicRule, explainPersonExclusion, compareLegacyAndCanonical, validateRuleVersionSet, validateRuleStatusTransition |
| [netlify/lib/_scope-public-foundations.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-public-foundations.js) | allWith, definition |
| [netlify/lib/_scope-public-legacy-adapter.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-public-legacy-adapter.js) | upper, personId, adaptLegacyPersonnelFacts |
| [netlify/lib/_scope-qualification.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qualification.js) | isQualificationEvenement, isTestPersonnelNip, wantsQualification |
| [netlify/lib/_scope-quo-vadis-consolidation.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-consolidation.js) | identity, equivalent, isAutomaticPreparationSnapshot, hasHumanDecision, programmeRequirement, activePopulation, businessSnapshot, proposedReconductionSnapshot, latestValidatedReferences |
| [netlify/lib/_scope-quo-vadis-coverage.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-coverage.js) | Exports/méthodes : voir source |
| [netlify/lib/_scope-quo-vadis-lieux.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-lieux.js) | normalizeLieuName, slugLieuCode, parseSwissAddress, extractOi, lieuLookupKeys, matchLieu, emptyAddress, planLieuAddressConsolidation |
| [netlify/lib/_scope-quo-vadis-referentials.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-referentials.js) | responsibleFunctionLabel, extractSiteCode, scopeSiteRank, compareScopeSites, sortByScopeSiteOrder, siteCodeFromActivity, lieuByOiCode, suggestLieu, roomsForLieu, occupancyKeys, roomsConflict, hasTheoryRooms, normalizeScopeDomainCode, scopeDomainBand, scopeDomainRank, compareScopeDomains, sortByScopeDomainOrder, scopeDomainLabel, scopeDomainOrderTrail |
| [netlify/lib/_scope-quo-vadis-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-service.js) | applyMoaCalendarArbitrages2027, historicalStatComForOccurrence, applyMoaInstitutionalDomains, applyProvenInstitutionalDomains, reconcileValidatedCursusModules, annualReportRuleFromCatalog, annualReportBlock, applyAnnualReportConstraint, applyMonthlyJspDirectionAndAnnualReport, canonicalBusinessProgramme2027, generationBalance, planningRuleDomain, effectivePlanningRules, dateOnly, isoLocalDateTime, programmeFreeLabels, programmeEcawinActivityCode, programmeEventFlags, participationEvaluation, programmeDefinition, programmeParticipationEvaluation, programmeResponsibleSelections, strictProgrammeDate, strictProgrammeTime, addMinutesIso, addDays, calendarType, calendarDate, calendarEndDate, isHolidayCalendarRow, isBlockingCalendarRow, deriveHolidayEves, isAscensionHoliday, deriveAscensionBridges, enrichCalendarRows, calendarRowsForDate, weekdayName, monthStart, domainLabel, normalizeCode, dayPolicyForDomain, usualTimeForDomain, isWeekend, hasHolidayWeekend, classifyDate, monthForDomain, monthLabel, mapProgramme, mapObligation, mapProposal, mapCalendarDay, mapLieu, mapSalleTheorie, mapResponsableFonction, lieuLabel, displayLieuLabel, indexLieux, resolveActivityLieu, normalizeActivityTitle, titleTokens, scoreHistoricalMatch, mapHistoricalEvent, mapCursus, mapCatalogue, createScopeQuoVadisService, getProgrammeByYear, loadCycleReports, getProgrammeCycle, setProgrammeCycle, ensureProgramme, ensureDefaultCursusSelections, ensureDefaultCursusStepSelections, loadCatalogue, programmeSummary, buildAlerts, buildAnnualBreakdown, loadHistoricalEventRows, listActivityReferences, buildActivities, buildPlanning, listProgramme, seedCalendar, upsertObligation, insertProposal, resetGeneratedDrafts, finishConsolidation, stampObligationModel, loadRulesByDomain, loadYearEventRows, insertRankedProposal, finalizeObligationStatus, generateHistoricalObligations, generateCatalogueObligations, generateDpsInstructionObligations, generateCursusObligations, generateManagedCursusObligations, generateValidatedReconductions, generateProgramme, previewProgramme, createFutureDate, setCursusSelection, setCursusStepSelection, setCursusStepSchedule, setProgrammeStatus, retainProposal, updateActivityPlanning, createProgrammePreparation, updateProgrammePreparation, programmeHistory |
| [netlify/lib/_scope-qv-moa-20261013-ddl.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-moa-20261013-ddl.js) | install |
| [netlify/lib/_scope-qv-moa-proposals.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-moa-proposals.js) | reportReference, installAnnualReportProposal |
| [netlify/lib/_scope-qv-papr-rules.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-papr-rules.js) | moduleNumber, preparatoryCycle, restorePaprModules, annualPaprControl, proposePaprDates |
| [netlify/lib/_scope-qv-programme-reconciliation.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-programme-reconciliation.js) | identity, sameBusinessOccurrence, differences, reconcilePublishedOccurrences, restoreDapGroupedFormation, proposeDapGroupedSecond |
| [netlify/lib/_scope-qv-programme-revisions.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-programme-revisions.js) | comparable, revisionChanges, fieldsFromProgrammeRow, history, reservations, reservationMessages, journal, applyPublishedRevision |
| [netlify/lib/_scope-qv-publication-executor.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-publication-executor.js) | executionError, assertIsolatedContext, targetMatches, assertExecutionContext, validateBulkApproval, validatePlan, hasOperationalData, classifyChangeSafety, createCheckpoint, currentFingerprint, synchronizationIsConsistent, executePublicationPlan |
| [netlify/lib/_scope-qv-publication-plan.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-publication-plan.js) | stableValue, stableStringify, sha256, targetFingerprint, text, upper, sortedUnique, sortedText, sourceIdentity, canonicalPublicationKey, parseLocalDateTime, temporalSnapshot, refSet, missingReferences, businessValidation, readiness, desiredTarget, operationalData, changedFields, decisionForItem, summarize, buildPublicationPlan, publicationPlanFingerprint, simulateAppliedPlan, buildExecutionBlueprint |
| [netlify/lib/_scope-qv-publication-postgres-store.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-publication-postgres-store.js) | storeError, deterministicUuid, inspectConnectionTarget, assertConnectionIntent, isoTimestamp, dateOnly, canonicalLocationCode, canonicalRoomCode |
| [netlify/lib/_scope-qv-publication-reconciliation.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-publication-reconciliation.js) | reconciliationError, assertReconciliationContext, hasOperationalData, reconcilePublicationPlan |
| [netlify/lib/_scope-qv-referential-management.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-referential-management.js) | createQvReferentialManagement, validateDomainTarget, validateLieu, createCursus, updateCursus, removeCursus, activeVersion, validateStep, addModule, updateModule, removeModule, reorderModules, validateRule, createRule, updateRule, createRuleWithClient, removeRule |
| [netlify/lib/_scope-report-data.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-report-data.js) | reportGradeRank, comparePersonName, sortByGradeThenName, roleGroupRank, exerciseReportTitle, normalizeTime, timeMinutes, durationMinutes, durationLabel, eventTemporal, normalizeKind, domaineLabel, perimeterTitle, periodSlug, sanitizeFilename, cleanFilenamePart, dateFilenamePrefix, buildFilename, domainPeriodOiRows, pickAlerts, nominativeRows, encadrementRows, multiSessionV2NominativeRows, multiSessionV2SessionReportModel, multiSessionV2EventRows, multiSessionV2Graphs, cycleStatusLabel, cycleTypeLabel, cyclePilotageStateLabel, cycleRoleLabel, cycleRoleSummaryLabel, compactCycleResultLabel, cycleGraphs, cyclePrimaryResultLabel, cycleInformationLabel, cycleReportRows, multiSessionV2ReportModel, collectReport |
| [netlify/lib/_scope-report-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-report-service.js) | actorLabel, sanitizeQuery, validateParticipationSpecialisation, pdfHeaders, sanitizeStatComRows, sanitizeStatComExportMeta, generateStatComReferentialReport, sanitizeQuoVadisRows, sanitizeQuoVadisExportMeta, generateQuoVadisProgrammeReport, generateReport, pdfResponse |
| [netlify/lib/_scope-rules.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-rules.js) | isoDate, isValidYmd, isAffectationValide, personneActiveA, round1, isPermutationCatchupAttendu, permutationObligationSummary, computeTaux, normalizeDomaineForContribution, getEncadrementContribution, idOfPersonne, nipOfParticipation, computeEffectifEngageEvenement, validateParticipationPatch, isUnsetExpectedStatut, motifOf, hasValidClosureStatus, incompleteClosureReason, sessionLockedRow, coveredByExistingSessionState, incompleteExpectedParticipations, countsInEventEffectif, expectedPopulationCoherence, validateCloture, rangesOverlap |
| [netlify/lib/_scope-schema.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-schema.js) | hasMigration, withSchemaLock, ensureScopeSchema, migrateQuoVadisReferentialManagement4, migrateCanonicalFoundationsC1, migratePublicEngineMirrorC2B, migratePersonQualificationsC3B, migrateAnnualCatalogC4B, migrateCatalogConvergenceC5B, migrateAnnualCatalogThemesC8B, migrateAnnualCatalogImportC15, migrateFunctionalCatalogC18, migrateStatComEcawinMoa20261009, migrateStatComExtrasMoa20261012, migrateScopeInternalIdentity20261012, migrateQuoVadisMoa20261013, migrateQuoVadisFinalIncremental20261012, migrateQuoVadisFinalMoaProposal20261012, migrateStatComJspRepair2, migrateAlerts1, migrateObjectives1, migrateEventQ1, migrateReglesBasculeR1, migrateModeSuiviAnalytics1, migrateModel2, migrateModel2R1, seedBasculeDapY4, migrateEventImport1, migrateEventStandard1, migratePersonnelImportPopulations1, migrateJspGradeModelFix1, migrateSpecialisationCyclesArch1, migrateMetierActivation3, migrateGenericExerciseSessions1, migrateParticipationPolicyEngine1, migrateConfigurationFormationUxReferentialsFinish5, migrateConfigurationReferentialsLifecycleRepair51, migrateGenericEventSessionPolicyArchitecture1, migrateMultiSessionV2Foundation1, migrateEventTemporalConfigurationFoundation9, migrateEventPopulationTimeStaffingWorkflowClose10, migrateEventWorkflowAssignmentStaffingSemanticRepair101, migrateEventAssignedPopulationPolicyStaffingClose102, migrateEventAssignedPopulationReactivationDeleteFinal103, migrateParticipantSelectionRuntimeRootRepair1031, migrateAttendusRetraitSchemaContractRepair1032, migrateCancelledEventSingleSourceOfTruth11, migrateStatComReferentialConfig1, migrateStatComSpecialisationPersistenceRepair2, migrateQuoVadisCore1, migrateQuoVadisPilotage2, migrateQuoVadisCoverage1, migrateQuoVadisMoaRecovery1, migrateQuoVadisAgendaUx2, migrateQuoVadisMoaResponsible20261012, migrateQuoVadisRoadmapResponsible20261012, migrateQuoVadisToutesActivitesUx1 |
| [netlify/lib/_scope-service.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-service.js) | requireBaseVersion, actorId, boolFromInput, normalizeSessionConfig, exerciseKeyFromParts, isExternalEventInput, isQuantitatif, isPrParticipantContribution, requireQuantitatif, volumesOrThrow, officialQuantitatifOrThrow, bumpOrConflict, createScopeService, generateReferentialId, participationMotifRows, participationStatusRows, participationPolicyRows, resolvePolicyForEvent, capturePolicySnapshot, policyPayload, summarizeReferentialUsage, referentialUsageLabel, participationPolicies, participationReferentialUsage, formationCatalog, resolveStatComSnapshot, assertWritableStatCom, saveStatComCode, resolveStatComImportContract, dateOnlyText, normalizeAssociationOrigin, normalizeAssociatedConfigurationEvents, resolveEventTrainingContext, formationConfigurationFromContext, resolveEventFormationConfiguration, eventDateInVersion, inferConfigurationSessionIndex, policySnapshotFromDefinitionVersion, validateParticipationsAgainstPolicy, buildFormationBindingCandidate, summarizeAssociationDiagnostics, previewFormationEventAssociation, associateEventsToFormationConfiguration, dissociateEventsFromFormationConfiguration, normalizedPolicyConfig, removedPolicyElements, removedPolicyElementsEmpty, participationUsesRemovedPolicyElement, validateFormationConfigurationRemoval, createEventDefinition, reconductEventDefinitionVersion, saveParticipationPolicy, saveParticipationMotif, deleteParticipationMotif, saveParticipationStatus, deleteParticipationStatus, comparePeopleByGradeName, referentiels, listPersonnes, countPersonnes, affectationsValides, createEvenement, normalizeHeureEvent, minutesFromHeure, durationMinutes, isHiddenEvenement, isCancelledEvenement, cancelledOfficialCompteurs, assignedPopulationLocked, isOperationalAttendu, operationalAttendus, throwIfEventHidden, recordedParticipantRows, isEffectiveParticipationStatut, recordedParticipationStatut, participationTemporalForStatut, normalizeEventTemporal, eventTemporalPayload, normalizeParticipationTemporal, normalizeLessonPrep, sameIdList, journalChamps, populationImpactForChange, assertExerciseSessionCountCanChange, previewModifierEvenement, patchEvenement, resolveEligiblePopulation, catalogueParticipationForEvent, resolveCataloguePublic, cibleMotifFromPopulationPerson, isDapGroupedFormationLabel, expandDapGroupedCibles, requiresFinalMultiSessionClosure, normalizeIdList, participationHasBusinessTrace, isStaleNonConcerneForExpected, eventPopulationCibleIds, cibleLabel, targetDetails, expandEventCibleIds, evaluatePersonExpectedForEvent, resolveExpectedByPersonForEvent, eventCiblesMatchAffected, eventLooksPrAbc, activeAttendusCount, syncExpectedPopulationForEvents, reconcileExpectedPopulation, reconcilePrAbcPopulation, eventDateInSyncWindow, allowsAssignedPopulationResyncForReason, syncExpectedPopulationForPersonnesInRepo, syncExpectedPopulationForPersonnes, isPersonExpectedForEvent, previewPopulationStore, enrichStandardPreviewPopulations, photographieFigee, decorateJspEventPopulations, classifyJspRoleForEventPerson, assignmentConstraints, previewAttendus, listPeriodes, syncPersonneSnapshot, journalClotureAffectations, ouvrirPeriode, cloturerPeriode, archiverPersonne, reactiverPersonne, createPersonne, changerAffectation, previewPersonnelSync, commitPersonnelSync, figerPopulation, ajouterException, retirerAttendu, prSeriesEvents, isFirstPrSessionEvent, removeEncadrementRow, retirerEncadrement, loadPrExerciseParticipationState, loadMultiSessionV2State, ensureMultiSessionV2EventRows, mirrorMultiSessionV2Participation, multisessionV2PersonState, firstEventCibleId, explicitPermutationExerciseKey, cibleSectionLabel, decorateSourcePermutationAttendus, fulfilledPermutationPersonIds, fulfilledPermutationPersonIdsForEvent, sectionEffectifAtEventDate, catchupAttendusCount, releasePermutationCatchupForParticipation, isPermutationCatchupMotif, removeSourcePermutationObligation, syncPermutationWorkflow, permutationsForEvent, regulariserPermutation, markUnrecoveredPermutationsForEvent, enregistrerParticipations, resetParticipations, upsertEncadrementRow, ajouterEncadrement, modifierEncadrement, cloturer, cloturerMultiSessionV2, annulerEvenement, masquerEvenement, desassignerPopulation, reactiverEvenement, supprimerOuAnnulerEvenement, reouvrir, groupByEventId, hasQuantitativeBusinessInput, hasNominativeBusinessInput, businessEtatForEvenement, summarizeEvenements, summarizeEvenement, listEvenements, hydratePersonnes, lireEvenement, tauxEvenement, rulesList, previewContext, existingEventsWithCibles, previewFromCsv, previewNativeContext, importedExerciseKey, importDefinitionBinding, attachImportedExerciseSessions, enrichGenericImportPreview, enrichGenericImportPreviewWithDecisions, importConfigurationBlocks, previewImportEvenements, commitStandardImport, commitNativeImport, commitImportEvenements, suggestModeSuivi, summarizeLite, previewTauxQuantitatif, enregistrerSaisieQuantitative, convertirNominatif, convertirQuantitatif, assertNoAffectationOverlap, assertNoAffectationOverlapInDomain, performanceDiagnostics |
| [netlify/lib/_scope-statcom-referential.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-statcom-referential.js) | normalizeStatComCode, initialStatComCodes, resolveStatComCode, isStatComValidForDate, statComSnapshot |
| [netlify/lib/_scope-target-resolution.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-target-resolution.js) | clean, isPrAbcCode, normalizeTargetCode, resolveEventImportTarget, matchesAssignmentToEventTarget, pgNormalizeExpression, pgCibleJoinCondition |
| [netlify/lib/_scope-training-context-resolver.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-training-context-resolver.js) | text, upper, dateOnly, yearOf, eventId, exerciseId, definitionVersionIdOf, policySnapshotOf, engineSnapshotOf, policyVersionIdOf, normalizePolicy, motifRows, policyRows, policyVersionRows, resolvePolicy, loadDefinition, loadDefinitionVersion, loadV2DefinitionVersion, loadExercise, dapGroupedFallback, sourceEventsForSeries, resolveSeriesContext, formationLabel, originLabel, resolveTrainingContext |
| [netlify/lib/_scope-xlsx-reader.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-xlsx-reader.js) | fail, zipEntries, xmlText, attribute, sharedStrings, workbookSheets, columnIndex, parseCell, parseWorksheet, readXlsx |
| [netlify/lib/_turnstile.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_turnstile.js) | configuration, publicConfiguration, verify |
| [netlify/lib/_user-store.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_user-store.js) | subjectFor, publicUser, ensureUser, listUsers, getUser, getUserByIdentity, upsertUser |

## Tables PostgreSQL réellement recensées

Projet Supabase SCOPE,113 tables `scope_*`, catalogue uniquement, transactionREAD ONLY. Ce n’est pas un inventaire de données personnelles. Propriétépostgres ; aucune RLS forcée relevée.

| Table | RLS activé | RLS forcé |
|---|---|---|
| scope_activity_domain_bindings | True | False |
| scope_activity_functional_profiles | True | False |
| scope_activity_legacy_aliases | True | False |
| scope_activity_location_requirements | True | False |
| scope_activity_participation_rules | True | False |
| scope_activity_periodicities | True | False |
| scope_activity_planning_constraints | True | False |
| scope_activity_public_bindings | True | False |
| scope_activity_qualification_bindings | True | False |
| scope_activity_responsible_requirements | True | False |
| scope_activity_role_requirements | True | False |
| scope_activity_session_templates | True | False |
| scope_activity_statistical_contributions | True | False |
| scope_activity_theme_bindings | True | False |
| scope_affectations | True | False |
| scope_alertes_acquittements | True | False |
| scope_annual_program_entries | True | False |
| scope_annual_requirement_theme_assignments | True | False |
| scope_annual_requirements | True | False |
| scope_attendus | True | False |
| scope_catalog_convergence_links | True | False |
| scope_catalog_import_decisions | True | False |
| scope_catalog_import_runs | True | False |
| scope_cibles | True | False |
| scope_competence_aliases | True | False |
| scope_competence_definitions | True | False |
| scope_competence_implications | True | False |
| scope_cycle_personnes | False | False |
| scope_cycles | False | False |
| scope_domaine_ois | True | False |
| scope_domaines | True | False |
| scope_evenement_cibles | True | False |
| scope_evenement_cibles_qv | True | False |
| scope_evenement_domaines | True | False |
| scope_evenement_ois | True | False |
| scope_evenement_public_rule_versions | True | False |
| scope_evenement_publics_qv | True | False |
| scope_evenement_ressources_qv | True | False |
| scope_evenement_roles_qv | True | False |
| scope_evenements | True | False |
| scope_event_code_allocations | True | False |
| scope_event_code_sequences | True | False |
| scope_event_definition_versions | False | False |
| scope_event_definitions | False | False |
| scope_event_person_roles | True | False |
| scope_event_role_aliases | True | False |
| scope_event_role_definitions | True | False |
| scope_exercices | False | False |
| scope_foba_niveaux | True | False |
| scope_import_lignes | True | False |
| scope_imports | True | False |
| scope_journal_metier | True | False |
| scope_legacy_aggregates | True | False |
| scope_legacy_cible_competence_mappings | True | False |
| scope_legacy_cible_foba_niveau_mappings | True | False |
| scope_legacy_cible_oi_mappings | True | False |
| scope_legacy_cible_pr_parcours_mappings | True | False |
| scope_legacy_cible_reviews | True | False |
| scope_lieux | False | False |
| scope_location_categories | True | False |
| scope_multisession_v2_participations | False | False |
| scope_multisession_v2_population | False | False |
| scope_multisession_v2_sessions | False | False |
| scope_multisessions_v2 | False | False |
| scope_objectifs | True | False |
| scope_ois | True | False |
| scope_participation_motifs | False | False |
| scope_participation_policies | False | False |
| scope_participation_policy_versions | False | False |
| scope_participation_statuses | False | False |
| scope_participations | True | False |
| scope_permutations | False | False |
| scope_person_qualification_evidence | True | False |
| scope_person_qualifications | True | False |
| scope_personne_periodes | True | False |
| scope_personnel_import_batches | True | False |
| scope_personnel_import_lines | True | False |
| scope_personnes | True | False |
| scope_planned_occurrence_sessions | True | False |
| scope_planned_occurrences | True | False |
| scope_planned_site_slots | True | False |
| scope_pr_parcours | True | False |
| scope_pr_parcours_aliases | True | False |
| scope_public_definitions | True | False |
| scope_public_rule_versions | True | False |
| scope_quo_vadis_calendar_days | False | False |
| scope_quo_vadis_cohortes | False | False |
| scope_quo_vadis_cursus_definitions | True | False |
| scope_quo_vadis_cursus_programmes | True | False |
| scope_quo_vadis_cursus_step_programmes | True | False |
| scope_quo_vadis_cursus_steps | True | False |
| scope_quo_vadis_cursus_versions | True | False |
| scope_quo_vadis_dps_organisation_versions | False | False |
| scope_quo_vadis_future_dates | True | False |
| scope_quo_vadis_obligations | False | False |
| scope_quo_vadis_planning_rules | True | False |
| scope_quo_vadis_programme_history | False | False |
| scope_quo_vadis_programmes | False | False |
| scope_quo_vadis_proposals | False | False |
| scope_qv_publication_activities | True | False |
| scope_qv_publication_links | True | False |
| scope_qv_publication_runs | True | False |
| scope_qv_session_events | True | False |
| scope_qv_session_groups | True | False |
| scope_regles_bascule | True | False |
| scope_responsable_fonctions | False | False |
| scope_saisies_quantitatives | True | False |
| scope_salles_theorie | False | False |
| scope_sous_domaines | True | False |
| scope_statcom_referentiel | False | False |
| scope_suivi_nominatif | True | False |
| scope_theme_definitions | True | False |
| scope_theme_versions | True | False |

## Migrations et opérations SQL versionnées

Présence de fichier ≠ migration appliquée. Aucun fichier SQL exécuté par cet audit ; 59 marqueurs SCOPE réellement enregistrés sont listés plus loin, sans prétendre à une correspondance complète fichier par fichier. Les fichiers rollback/fixtures/ops ne sont pas des prescriptions de production.

| Fichier | Nature |
|---|---|
| [database/fixtures/scope_qv_publication_c21_fixture.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/fixtures/scope_qv_publication_c21_fixture.sql) | Fixture |
| [database/fixtures/scope_qv_publication_c22_postgres.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/fixtures/scope_qv_publication_c22_postgres.sql) | Fixture |
| [database/migrations/20260819_scope_analytics_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_analytics_1.sql) | Migration/version source |
| [database/migrations/20260819_scope_data_5.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_data_5.sql) | Migration/version source |
| [database/migrations/20260819_scope_data_5_r1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_data_5_r1.sql) | Migration/version source |
| [database/migrations/20260819_scope_event_q1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_event_q1.sql) | Migration/version source |
| [database/migrations/20260819_scope_event_q1_rollback.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_event_q1_rollback.sql) | Migration/version source |
| [database/migrations/20260819_scope_impl_1a.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_impl_1a.sql) | Migration/version source |
| [database/migrations/20260819_scope_impl_1a_rollback.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_impl_1a_rollback.sql) | Migration/version source |
| [database/migrations/20260819_scope_objectives_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_objectives_1.sql) | Migration/version source |
| [database/migrations/20260819_scope_objectives_1_rollback.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_objectives_1_rollback.sql) | Migration/version source |
| [database/migrations/20260819_scope_qual1r1_dap_y4.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260819_scope_qual1r1_dap_y4.sql) | Migration/version source |
| [database/migrations/20260820_scope_alerts_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260820_scope_alerts_1.sql) | Migration/version source |
| [database/migrations/20260820_scope_event_import_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260820_scope_event_import_1.sql) | Migration/version source |
| [database/migrations/20260820_scope_model_2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260820_scope_model_2.sql) | Migration/version source |
| [database/migrations/20260820_scope_model_2_r1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260820_scope_model_2_r1.sql) | Migration/version source |
| [database/migrations/20260821_scope_db_convergence_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260821_scope_db_convergence_1.sql) | Migration/version source |
| [database/migrations/20260823_scope_jsp_grade_model_fix_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260823_scope_jsp_grade_model_fix_1.sql) | Migration/version source |
| [database/migrations/20260823_scope_personnel_import_populations_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260823_scope_personnel_import_populations_1.sql) | Migration/version source |
| [database/migrations/20260825_scope_event_std_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260825_scope_event_std_1.sql) | Migration/version source |
| [database/migrations/20260826_scope_papr_exercise_group_recipe_fix_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260826_scope_papr_exercise_group_recipe_fix_1.sql) | Migration/version source |
| [database/migrations/20260826_scope_presence_standard_1r4.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260826_scope_presence_standard_1r4.sql) | Migration/version source |
| [database/migrations/20260826_scope_specialisation_cycles_arch_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260826_scope_specialisation_cycles_arch_1.sql) | Migration/version source |
| [database/migrations/20260903_scope_prabc_jsp_presence_r2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260903_scope_prabc_jsp_presence_r2.sql) | Migration/version source |
| [database/migrations/20260907_scope_generic_exercise_sessions_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260907_scope_generic_exercise_sessions_1.sql) | Migration/version source |
| [database/migrations/20260907_scope_permutation_recovery_final_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260907_scope_permutation_recovery_final_1.sql) | Migration/version source |
| [database/migrations/20260908_scope_jsp_oubli_motif_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260908_scope_jsp_oubli_motif_1.sql) | Migration/version source |
| [database/migrations/20260908_scope_permutation_moa_fix_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260908_scope_permutation_moa_fix_1.sql) | Migration/version source |
| [database/migrations/20260909_scope_configuration_formation_ux_referentials_finish_5.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260909_scope_configuration_formation_ux_referentials_finish_5.sql) | Migration/version source |
| [database/migrations/20260909_scope_configuration_referentials_lifecycle_repair_5_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260909_scope_configuration_referentials_lifecycle_repair_5_1.sql) | Migration/version source |
| [database/migrations/20260909_scope_generic_event_session_policy_architecture_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260909_scope_generic_event_session_policy_architecture_1.sql) | Migration/version source |
| [database/migrations/20260916_scope_quo_vadis_core_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260916_scope_quo_vadis_core_1.sql) | Migration/version source |
| [database/migrations/20260916_scope_quo_vadis_pilotage_2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260916_scope_quo_vadis_pilotage_2.sql) | Migration/version source |
| [database/migrations/20260917_scope_quo_vadis_coverage_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260917_scope_quo_vadis_coverage_1.sql) | Migration/version source |
| [database/migrations/20260917_scope_quo_vadis_moa_recovery_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260917_scope_quo_vadis_moa_recovery_1.sql) | Migration/version source |
| [database/migrations/20260918_scope_quo_vadis_agenda_ux_2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260918_scope_quo_vadis_agenda_ux_2.sql) | Migration/version source |
| [database/migrations/20260918_scope_quo_vadis_toutes_activites_ux_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260918_scope_quo_vadis_toutes_activites_ux_1.sql) | Migration/version source |
| [database/migrations/20260922_scope_quo_vadis_referential_management_4.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260922_scope_quo_vadis_referential_management_4.sql) | Migration/version source |
| [database/migrations/20260922_scope_referentiel_cursus_taxonomie_2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260922_scope_referentiel_cursus_taxonomie_2.sql) | Migration/version source |
| [database/migrations/20260923_scope_canonical_foundations_c1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260923_scope_canonical_foundations_c1.sql) | Migration/version source |
| [database/migrations/20260923_scope_person_qualifications_c3_b.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260923_scope_person_qualifications_c3_b.sql) | Migration/version source |
| [database/migrations/20260923_scope_public_engine_mirror_c2_b.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260923_scope_public_engine_mirror_c2_b.sql) | Migration/version source |
| [database/migrations/20260924_scope_annual_catalog_c4_b.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260924_scope_annual_catalog_c4_b.sql) | Migration/version source |
| [database/migrations/20260924_scope_annual_catalog_themes_c8_b.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260924_scope_annual_catalog_themes_c8_b.sql) | Migration/version source |
| [database/migrations/20260925_scope_annual_catalog_import_c15.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260925_scope_annual_catalog_import_c15.sql) | Migration/version source |
| [database/migrations/20260925_scope_catalog_convergence_c5_b.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260925_scope_catalog_convergence_c5_b.sql) | Migration/version source |
| [database/migrations/20260925_scope_functional_catalog_c18.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260925_scope_functional_catalog_c18.sql) | Migration/version source |
| [database/migrations/20260925_scope_statcom_jsp_repair_2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260925_scope_statcom_jsp_repair_2.sql) | Migration/version source |
| [database/migrations/20260925_scope_taxonomy_pr_auto_fospec_g1_final.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260925_scope_taxonomy_pr_auto_fospec_g1_final.sql) | Migration/version source |
| [database/migrations/20260929_scope_qv_publication_c20.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260929_scope_qv_publication_c20.sql) | Migration/version source |
| [database/migrations/20260929_scope_qv_publication_c21.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260929_scope_qv_publication_c21.sql) | Migration/version source |
| [database/migrations/20260929_scope_qv_publication_c22_preprod_gate.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260929_scope_qv_publication_c22_preprod_gate.sql) | Migration/version source |
| [database/migrations/20260929_scope_qv_publication_c23_repair_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260929_scope_qv_publication_c23_repair_1.sql) | Migration/version source |
| [database/migrations/20260929_scope_qv_publication_c23_repair_1_rollback.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260929_scope_qv_publication_c23_repair_1_rollback.sql) | Migration/version source |
| [database/migrations/20260930_scope_event_identity_phase2.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20260930_scope_event_identity_phase2.sql) | Migration/version source |
| [database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql) | Migration/version source |
| [database/migrations/20261006_scope_qv_cursus_structural_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261006_scope_qv_cursus_structural_1.sql) | Migration/version source |
| [database/migrations/20261007_scope_qv_catalogue_publics.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261007_scope_qv_catalogue_publics.sql) | Migration/version source |
| [database/migrations/20261007_scope_qv_participation_catalogue_1.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261007_scope_qv_participation_catalogue_1.sql) | Migration/version source |
| [database/migrations/20261008_scope_qv_statcom_emsea.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261008_scope_qv_statcom_emsea.sql) | Migration/version source |
| [database/migrations/20261012_scope_internal_event_identity.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261012_scope_internal_event_identity.sql) | Migration/version source |
| [database/migrations/20261013_scope_qv_moa_consolidated.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/migrations/20261013_scope_qv_moa_consolidated.sql) | Migration/version source |
| [database/ops/20260903_diagnose_jsp6_b1_date.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/ops/20260903_diagnose_jsp6_b1_date.sql) | Opération |
| [database/ops/20260903_retarget_exercice_prabc_refresh.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/ops/20260903_retarget_exercice_prabc_refresh.sql) | Opération |
| [database/ops/20261013_scope_hsc_preflight_readonly.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/ops/20261013_scope_hsc_preflight_readonly.sql) | Opération |
| [database/schema.sql](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/database/schema.sql) | Migration/version source |


## Cursus persistants : relevé exhaustif non nominatif

| Code | Libellé stocké | Rattachement | Statut |
|---|---|---|---|
| C-GROUPE | C groupe | FOCA | ACTIF |
| CI-DAP | CI DAP | FOCA | ACTIF |
| CI-DPS | CI DPS | FOCA | ACTIF |
| COND-VL | cond VL | AUTO | ACTIF |
| ELEVATEUR-S2 | Élévateur à timon S2 | AUTO | ACTIF |
| JSP | JSP | JSP | ACTIF |
| MEA | MEA | AUTO | ACTIF |
| OFSI-BASE | OFSI formation de base | FOSPEC | ACTIF |
| OPERATEUR-VPC | Opérateur VPC | FOSPEC | ACTIF |
| PAPR | PAPR | PR | ACTIF |
| TP9 | TP9 | AUTO | ACTIF |

FOBA, FOCO, FOCA, FOSPEC, AUTO et PR ne doivent pas être transformés en cursus parce qu’ils sont des domaines ou familles. Les onze lignes ci-dessus sont les définitions de cursus réellement enregistrées ; leurs modules, prérequis et équivalences exigent leurs versions et règles propres. Les noms affichés TP9/OFSI sont adaptés dans les fiches/filtres sans nouvel identifiant.

## Personnel : contraintes et complétude sans données individuelles


## Réserve complémentaire — DATE_ENTREE_SDIS

Lecture agrégée sous READ ONLY le 15.10 à 09:22:49, heure suisse : 296 personnes ; zéro NIP vide, zéro groupe de NIP dupliqué ; contrainte UNIQUE(nip) présente. 290 champs `date_entree_sdis` sont NULL. Zéro affectation sans `date_actif` ; zéro paire d'affectations OI PRINCIPAL se chevauchant pour une même personne et un même domaine, selon les intervalles inclusifs stockés.

**SCOPE-PERSONNEL-DATE — P2 — réserve de complétude prouvée, exigence d'exhaustivité à qualifier MOA.** L'absence de date à ce champ ne prouve ni une date d'entrée inconnue dans toutes les sources, ni une inéligibilité opérationnelle : les périodes et règles datées existantes doivent être prises en compte. Ne pas substituer automatiquement une date d'affectation, une date d'import ou la date courante à la date réelle d'entrée SDIS. Si une complétion est requise, elle doit être fondée sur une source RH autorisée, conserver l'historique et faire l'objet d'un mandat distinct. Aucune personne n'est identifiée dans les livrables.

La liste exhaustive des onze cursus actuellement enregistrés et les 59 marqueurs de migration SCOPE lus sont ajoutés à l'inventaire. Un marqueur d'installation n'est pas une preuve de parité intégrale entre chaque fichier SQL et la base.
| Contrainte réelle | Définition |
|---|---|
| scope_personnes_nip_key | UNIQUE (nip) |
| scope_personnes_pkey | PRIMARY KEY (id) |
| scope_affectations_categorie_chk | CHECK ((categorie = ANY (ARRAY['OI'::text, 'SPECIALISATION'::text]))) |
| scope_affectations_dates_chk | CHECK (((date_inactif IS NULL) OR (date_actif <= date_inactif))) |
| scope_affectations_personne_id_fkey | FOREIGN KEY (personne_id) REFERENCES scope_personnes(id) |
| scope_affectations_pkey | PRIMARY KEY (id) |
| scope_affectations_role_chk | CHECK (((role_domaine IS NULL) OR (role_domaine = ANY (ARRAY['PRINCIPAL'::text, 'SECONDAIRE'::text])))) |
| scope_affectations_source_import_batch_id_fkey | FOREIGN KEY (source_import_batch_id) REFERENCES scope_personnel_import_batches(id) |

### Marqueurs SCOPE effectivement enregistrés

Relevé READ ONLY à 2026-10-15T07:22:21.966609+00:00. Les 59 marqueurs de `monitoring_f7_schema_migrations` dont la version commence par scope sont lus ; la correspondance univoque entre ces marqueurs, les migrations autonomes et le bootstrap runtime n’est pas entièrement démontrée.

| Version enregistrée | Date d’application stockée |
|---|---|
| scope-alerts-1 | 2026-08-21T16:21:01.232321+00:00 |
| scope-analytics-1 | 2026-08-21T16:21:01.127304+00:00 |
| scope-annual-catalog-c4-b | 2026-09-24T03:30:45.763488+00:00 |
| scope-annual-catalog-import-c15 | 2026-09-25T06:45:34.034426+00:00 |
| scope-annual-catalog-themes-c8-b | 2026-09-24T06:15:52.365931+00:00 |
| scope-attendus-retrait-schema-contract-repair-10-3-2 | 2026-09-12T06:45:03.691299+00:00 |
| scope-cancelled-event-single-source-of-truth-11 | 2026-09-14T04:41:49.075064+00:00 |
| scope-canonical-foundations-c1 | 2026-09-24T03:26:56.766788+00:00 |
| scope-catalog-convergence-c5-b | 2026-09-24T03:31:12.885727+00:00 |
| scope-configuration-formation-ux-referentials-finish-5 | 2026-09-09T19:39:22.409431+00:00 |
| scope-configuration-referentials-lifecycle-repair-5-1 | 2026-09-10T03:13:48.850246+00:00 |
| scope-data-5 | 2026-08-21T16:21:00.959737+00:00 |
| scope-data-5-r1 | 2026-08-21T16:21:01.026545+00:00 |
| scope-event-assigned-population-policy-staffing-close-10-2 | 2026-09-11T11:30:54.508165+00:00 |
| scope-event-assigned-population-reactivation-delete-final-10-3 | 2026-09-12T05:19:46.804747+00:00 |
| scope-event-identity-phase2 | 2026-10-06T07:04:49.516329+00:00 |
| scope-event-import-1 | 2026-08-21T21:50:47.709619+00:00 |
| scope-event-population-time-staffing-workflow-close-10 | 2026-09-11T07:02:50.668034+00:00 |
| scope-event-q1 | 2026-08-21T16:21:01.155448+00:00 |
| scope-event-std-1 | 2026-08-25T10:08:52.162613+00:00 |
| scope-event-temporal-configuration-foundation-9 | 2026-09-11T04:03:08.111482+00:00 |
| scope-event-workflow-assignment-staffing-semantic-repair-10-1 | 2026-09-11T09:10:57.55268+00:00 |
| scope-functional-catalog-c18 | 2026-09-25T14:42:00.423886+00:00 |
| scope-generic-event-session-policy-architecture-1 | 2026-09-09T13:45:10.283163+00:00 |
| scope-generic-exercise-sessions-1 | 2026-09-07T06:55:32.66719+00:00 |
| scope-impl-1a | 2026-08-21T16:21:00.950349+00:00 |
| scope-internal-event-identity-20261012 | 2026-10-12T17:10:36.722933+00:00 |
| scope-jsp-grade-model-fix-1 | 2026-08-23T06:30:59.414033+00:00 |
| scope-model-2 | 2026-08-21T21:50:47.604909+00:00 |
| scope-model-2-r1 | 2026-08-21T21:50:47.656292+00:00 |
| scope-multisession-v2-foundation-1 | 2026-09-09T03:48:57.372057+00:00 |
| scope-objectives-1 | 2026-08-21T16:21:01.194308+00:00 |
| scope-participant-selection-runtime-root-repair-10-3-1 | 2026-09-12T05:49:57.777429+00:00 |
| scope-participation-policy-engine-1 | 2026-09-07T13:03:26.48497+00:00 |
| scope-person-qualifications-c3-b | 2026-09-24T03:30:06.910691+00:00 |
| scope-personnel-1b | 2026-08-21T09:58:25.580475+00:00 |
| scope-personnel-import-populations-1 | 2026-08-23T06:30:59.385328+00:00 |
| scope-public-engine-mirror-c2-b | 2026-09-24T03:29:28.569067+00:00 |
| scope-quo-vadis-agenda-ux-2 | 2026-09-18T07:36:06.865202+00:00 |
| scope-quo-vadis-core-1 | 2026-09-16T09:56:56.953688+00:00 |
| scope-quo-vadis-coverage-1 | 2026-09-17T04:40:04.082847+00:00 |
| scope-quo-vadis-moa-recovery-1 | 2026-09-17T05:22:51.142506+00:00 |
| scope-quo-vadis-pilotage-2 | 2026-09-16T11:36:51.633443+00:00 |
| scope-quo-vadis-referential-management-4 | 2026-09-23T05:07:21.46103+00:00 |
| scope-quo-vadis-toutes-activites-ux-1 | 2026-09-18T10:54:02.498043+00:00 |
| scope-qv-cursus-structural-1 | 2026-10-06T14:52:43.47053+00:00 |
| scope-qv-final-moa-report-20261012 | 2026-10-12T17:10:36.646452+00:00 |
| scope-qv-moa-consolidated-20261013 | 2026-10-13T11:56:56.433686+00:00 |
| scope-qv-moa-responsible-20261012 | 2026-10-12T17:10:36.530458+00:00 |
| scope-qv-publication-c23-repair-1 | 2026-09-29T15:35:44.594898+00:00 |
| scope-qv-roadmap-responsible-20261012 | 2026-10-12T17:10:36.597925+00:00 |
| scope-qv-statcom-emsea-20261008 | 2026-10-08T07:54:55.949556+00:00 |
| scope-referentiel-cursus-taxonomie-2 | 2026-09-22T15:43:34.226734+00:00 |
| scope-specialisation-cycles-arch-1 | 2026-08-26T12:19:47.647089+00:00 |
| scope-statcom-extras-moa-20261012 | 2026-10-12T17:10:36.479087+00:00 |
| scope-statcom-jsp-repair-2 | 2026-09-25T08:47:38.493574+00:00 |
| scope-statcom-referential-config-1 | 2026-09-16T04:02:39.998316+00:00 |
| scope-statcom-specialisation-persistence-repair-2 | 2026-09-16T05:57:12.602151+00:00 |
| scope-taxonomy-pr-auto-fospec-g1-final | 2026-09-25T13:10:36.190344+00:00 |

## Routes API littérales de la fonction SCOPE

Inventaire statique, sans requête métier. Les méthodes et permissions applicables doivent être lues dans le bloc de route lié ; l’extraction ne certifie pas leur comportement opérationnel. Les routes auth/personnel dédiées sont listées parmi les fonctions Netlify.

| Chemin sous /api/scope | Source |
|---|---|
| /reports | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L119) |
| / | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L142) |
| /pilot-import-dap-y4 | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L145) |
| /referentiels | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L159) |
| /participation/policies | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L162) |
| /annual-catalog/readiness | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L165) |
| /annual-catalog | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L168) |
| /annual-catalog/import/preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L171) |
| /annual-catalog/import/apply | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L175) |
| /annual-catalog/activities | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L179) |
| /annual-catalog/activities/:code | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L183) |
| /annual-catalog/activities/:code/archive | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L195) |
| /annual-catalog/activities/:code/participation | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L197) |
| /annual-catalog/activities/:code/restore | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L206) |
| /annual-catalog/requirements | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L211) |
| /annual-catalog/programmes/:year/activities/:code | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L215) |
| /annual-catalog/programmes/:year/conflicts | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L220) |
| /annual-catalog/requirements/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L224) |
| /annual-catalog/requirements/:id/propose-schedule | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L233) |
| /annual-catalog/site-slots/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L238) |
| /annual-catalog/requirements/:id/ready | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L243) |
| /annual-catalog/requirements/:id/themes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L248) |
| /annual-catalog/requirements/:id/revise | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L253) |
| /annual-catalog/requirements/:id/generate | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L258) |
| /annual-catalog/requirements/:id/quo-vadis-preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L263) |
| /quo-vadis/programmes/:annee | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L267) |
| /quo-vadis/cursus | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L271) |
| /quo-vadis/cursus/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L276) |
| /quo-vadis/cursus/:id/modules | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L282) |
| /quo-vadis/cursus/:id/modules/order | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L288) |
| /quo-vadis/cursus/modules/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L294) |
| /quo-vadis/rules | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L300) |
| /quo-vadis/rules/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L305) |
| /quo-vadis/programmes/:annee/generate | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L311) |
| /quo-vadis/programmes/:annee/cycle | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L316) |
| /quo-vadis/programmes/:annee/preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L322) |
| /quo-vadis/programmes/:annee/cursus | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L327) |
| /quo-vadis/programmes/:annee/cursus-steps | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L331) |
| /quo-vadis/programmes/:annee/cursus-step-schedule | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L335) |
| /quo-vadis/programmes/:annee/statut | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L341) |
| /quo-vadis/proposals/:id/retain | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L346) |
| /quo-vadis/future-dates | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L350) |
| /quo-vadis/activities/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L354) |
| /quo-vadis/programme-items | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L358) |
| /quo-vadis/programme-items/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L363) |
| /quo-vadis/programme-items/:id/history | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L369) |
| /quo-vadis/activities/:id/references | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L373) |
| /participation/referentials/:kind/:id/usages | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L377) |
| /participation/policies/:domain | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L384) |
| /participation/motifs | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L391) |
| /participation/motifs/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L397) |
| /participation/statuses | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L404) |
| /participation/statuses/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L410) |
| /personnes/count | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L417) |
| /personnes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L420) |
| /personnel | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L423) |
| /personnel/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L427) |
| /analytics/persons/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L436) |
| /personnes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L441) |
| /personnes/reactiver | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L445) |
| /imports/personnel/preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L448) |
| /imports/personnel/commit | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L448) |
| /imports/personnel/preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L453) |
| /imports/personnel/commit | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L456) |
| /maintenance/pr-abc/reconcile | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L459) |
| /personnes/:id/affectations | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L465) |
| /personnes/:id/periodes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L469) |
| /personnes/:id/periodes/:periodeId/cloturer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L476) |
| /personnes/:id/archiver | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L480) |
| /personnes/:id/changer-affectation | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L484) |
| /evenements | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L488) |
| /mode-suivi-suggere | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L491) |
| /evenements | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L494) |
| /evenements/:id/preview-modifier | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L497) |
| /evenements/:id/preview-attendus | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L501) |
| /evenements/:id/contraintes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L505) |
| /evenements/:id/figer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L509) |
| /evenements/:id/exceptions | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L513) |
| /evenements/:id/retraits | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L517) |
| /evenements/:id/participations | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L521) |
| /evenements/:id/permutations | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L525) |
| /permutations/:id/regulariser | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L529) |
| /evenements/:id/participations/reset | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L533) |
| /evenements/:id/encadrement/modifier | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L537) |
| /evenements/:id/encadrement | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L541) |
| /evenements/:id/saisie-quantitative | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L548) |
| /evenements/:id/preview-taux-quantitatif | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L552) |
| /evenements/:id/convertir-nominatif | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L556) |
| /evenements/:id/convertir-quantitatif | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L560) |
| /evenements/:id/cloturer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L564) |
| /multisessions-v2/:id/cloturer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L568) |
| /evenements/:id/reouvrir | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L572) |
| /evenements/:id/annuler | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L576) |
| /evenements/:id/reactiver | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L580) |
| /evenements/:id/desassigner | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L584) |
| /evenements/:id/masquer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L588) |
| /evenements/:id/supprimer-ou-annuler | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L592) |
| /evenements/:id/taux | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L596) |
| /evenements/:id/personnel.csv | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L600) |
| /evenements/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L607) |
| /cycles | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L615) |
| /cycles | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L618) |
| /cycles/proposer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L621) |
| /cycles/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L624) |
| /cycles/:id/evenements | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L631) |
| /cycles/:id/personnes | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L638) |
| /analytics/summary | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L646) |
| /analytics/explain | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L651) |
| /analytics/timeseries | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L656) |
| /analytics/graphs | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L661) |
| /dashboard | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L664) |
| /reporting/jsp | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L667) |
| /reporting/participation | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L673) |
| /reporting/formation | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L679) |
| /alerts | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L685) |
| /alerts/acquitter | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L688) |
| /objectifs | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L692) |
| /objectifs/resolution | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L695) |
| /objectifs | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L698) |
| /objectifs/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L704) |
| /objectifs/:id/cloturer | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L720) |
| /objectifs/:id/nouvelle-periode | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L727) |
| /objectifs/:id/desactiver | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L734) |
| /formation/catalog | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L742) |
| /formation/statcom | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L748) |
| /formation/statcom/resolve | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L754) |
| /formation/definitions | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L760) |
| /formation/definition-versions/:id/association-preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L766) |
| /formation/definition-versions/:id/associate-events | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L773) |
| /formation/definition-versions/:id/dissociate-events | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L780) |
| /formation/definition-versions/:id/reconduct | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L787) |
| /diagnostics/performance | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L794) |
| /reports/statcom | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L801) |
| /reports/quo-vadis | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L808) |
| /reports | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L816) |
| /reports/event/:id | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L824) |
| /imports/evenements/preview | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L837) |
| /imports/evenements/commit | [Bloc de route et permissions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/functions/scope.js#L843) |

## Limites et éléments manquants

Le verdict global est **AUDIT_INCOMPLET**. Les huit dossiers sont remis pour revue, mais l'exhaustivité intégrale ne peut pas être attestée :

1. Les quatre sources principales, leurs ajouts #20–#22 et les socles cités ont été lus ; les autres documents sont inventoriés et indexés, avec revue ciblée. L'intégralité des 183 documents Markdown et de chaque capture n'a pas fait l'objet d'une lecture/interprétation manuelle exhaustive. L'annexe distingue lecture approfondie et indexation.
2. L'inventaire de tests est statique et exhaustif selon le critère de sélection annoncé ; la dernière exécution et l'acceptation MOA ne sont pas démontrées pour chaque fichier/scénario. Les simples mentions documentaires et rapprochements lexicaux ne sont pas transformés en preuves de couverture.
3. Les parcours authentifiés de tous les modules et profils ne sont pas rejoués. Des GET SCOPE passent par `getPgRepo()` et `ensureScopeSchema()` ; leur initialisation peut écrire. Ils ont donc été évités pendant cet audit. Aucun audit dynamique sans risque de toute l'application n'est revendiqué.
4. Pas de nouvelle recette physique de veille, expiration réelle Okta, ni de campagne autorisations complète en production. PR #22 documente LOCAL actif et des scénarios contrôlés ; elle ne valide pas ces conditions réelles.
5. Les métadonnées du projet Supabase nommé SCOPE ont été lues directement, sans personnes ni secrets. Les identifiants EM et cursus concordent avec les preuves de production, mais la valeur effective de DATABASE_URL Netlify n'a pas été extraite/comparée. Variables d'environnement, configuration IdP effective, schémas exposés Data API et surface RPC complète restent non vérifiés.
6. Le tableau M1–M7/P1–P6 est conservé intégralement. Des lectures ciblées actualisent ses préparations/publications ; les disponibilités de toutes les salles, capacités, équipements et fonctions ne sont pas recalculées comme une nouvelle recette de planning. Les disponibilités du 14.10 restent datées, pas garanties aujourd'hui.
7. La matrice automatise les références littérales pour chaque rubrique canonique, mais une démonstration humaine complète règle → exécution → preuve → acceptation reste manquante sur les lignes marquées NON VÉRIFIÉ. Les acquis ne sont pas rouverts du fait de ce manque de traçabilité.

Ces limites ne justifient aucune correction automatique. Le prochain jalon d'audit doit compléter les associations de preuves et les vérifications manquantes **en priorité sur les conditions bloquantes**, sans refaire les campagnes acquises. Le GO phase B reste distinct et ne doit être sollicité qu'après revue MOA de la phase A.

# SCOPE — Matrice de traçabilité et inventaire des tests

> Capitalisation phase B : import de la phase A actualisée à #27. Les déclarations « hors dépôt », « pas de phase B » et les prochains GO dans le texte importé décrivent son mandat historique. La mission de phase B autorise maintenant sa capitalisation documentaire en une PR, sans fusion ni déploiement. Les réserves AUDIT_INCOMPLET et Programme 2027 NON VALIDÉ restent applicables. Voir [provenance](README.md).


## Actualisation consolidée du 15.10.2026 — référence applicable

**Phase A, lecture seule. Verdict : AUDIT_INCOMPLET**, avec réserves explicites ci-dessous. **Programme annuel 2027 NON VALIDÉ.** Cette actualisation reprend les huit mêmes livrables ; elle ne recommence pas l'audit initial.

GitHub `Sdisnv/monitoringF7`, `main` : **`3bdad82029ef79ea721bcf4043a5bb47e4d86764`**. PR #20 à #27 fusionnées ; contrôle direct GitHub et Netlify effectué pendant cette actualisation. Production `scope-sdisnv` : déploiement **`6ad0d08255cda461366136f2`**, **ready**, même SHA, publication **15.10.2026 à 15:09:59.769 Europe/Zurich** (13:09:59.769 UTC). Une publication technique ne vaut pas validation du Programme annuel.

Aucune écriture dans le dépôt partagé, GitHub, les données, les configurations, les permissions/RLS, Okta ou Netlify. Aucun test acquis relancé, aucune branche/PR/migration, fusion ou publication réalisée par cet audit. Les écritures se limitent aux livrables et preuves d'audit dans `dossier local historique de l’audit (non versionné)` et à leur copie de remise hors dépôt dans le dossier d’artefacts Codex. Pas de phase B engagée.

Les sections d'actualisation précèdent l'**archive initiale** conservée en fin de fichier pour assurer la continuité. Pour les changements #23–#27, les décisions actuelles ci-dessus et les rectifications ci-dessous remplacent les états initiaux correspondants. Les références à `74ac904…`, aux anciens déploiements et aux comptes SQL initiaux dans l'archive restent datées ; elles ne décrivent pas la production courante. Les points non remplacés restent au backlog avec les limites initiales, sans nouvelle preuve d'ouverture ou de clôture.

Navigation : [SCOPE_AUDIT_INTEGRAL_20261015.md](SCOPE_AUDIT_INTEGRAL_20261015.md) · [SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md](SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md) · [SCOPE_ROADMAP_CONSOLIDEE_20261015.md](SCOPE_ROADMAP_CONSOLIDEE_20261015.md) · [SCOPE_TODO_CONSOLIDEE_20261015.md](SCOPE_TODO_CONSOLIDEE_20261015.md) · [SCOPE_REGISTRE_ANOMALIES_20261015.md](SCOPE_REGISTRE_ANOMALIES_20261015.md) · [SCOPE_MATRICE_TRACABILITE_20261015.md](SCOPE_MATRICE_TRACABILITE_20261015.md) · [SCOPE_PLAN_FINALISATION_QV_20261015.md](SCOPE_PLAN_FINALISATION_QV_20261015.md) · [SCOPE_REGISTRE_DECISIONS_MOA_20261015.md](SCOPE_REGISTRE_DECISIONS_MOA_20261015.md). Diagnostic distinct demandé : [SCOPE_DIAGNOSTIC_NETLIFY_20261015.md](SCOPE_DIAGNOSTIC_NETLIFY_20261015.md).

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

## Complément de l’inventaire des tests #23–#27

Ces dix scripts sont identifiés statiquement dans le delta. Les preuves des campagnes correspondantes sont citées ci-dessus ; leur présence seule ne vaut pas PASS. Aucune commande de test n’a été exécutée par l’audit. Les 391 entrées de l’index initial conservent leur nature statique et leurs limites ; ne pas additionner sans dédoublonnage comme une couverture mesurée.

| Script | État audit |
|---|---|
| [scripts/scope-qv-cmdt-browser.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-cmdt-browser.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-cmdt-exports.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-cmdt-exports.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-cmdt-tests.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-cmdt-tests.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-consolide-preparation-browser.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-consolide-preparation-browser.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-consolide-preparation-tests.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-consolide-preparation-tests.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-horaire-layout-tests.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-horaire-layout-tests.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-preparation-sdis-browser.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-preparation-sdis-browser.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-preparation-sdis-exports.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-preparation-sdis-exports.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-preparation-sdis-tests.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-preparation-sdis-tests.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |
| [scripts/scope-qv-publics-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/scripts/scope-qv-publics-moa-tests.js) | Présent au SHA courant ; non relancé ; rapprocher de la preuve datée correspondante |


## Complément du canon et collisions d’identifiants

Les ajouts ci-dessous sont référencés par position et intitulé, sans prétention de preuve d’exécution exhaustive. Des compléments PUBLIC-008 ont aussi été insérés dans une section antérieure à la ligne912 ; voir rapport #24 et les rectifications.

| Rubrique actuelle | Source exacte | Preuve/acceptation à retenir |
|---|---|---|
| QV-CURSUS-009 — CI DAP et CI DPS sous FOCA | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L938) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-PUBLIC-008 — Échelon 0 et candidat machiniste | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L951) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-DPS-003 — Complément Responsable commun Chef section | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L961) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-EXERCICE-PREPARATION-001 — Cours préparatoire et délai minimal | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L970) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-CALENDAR-003 — Complément ouverture selon date et cycle | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L998) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-PROPOSITION-002 — Priorité de la date validée, champ par champ | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L1005) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-EXERCICE-PREPARATION-001 — Bidirectionnalité et formations groupées | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L1023) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-OI-SDIS-001 — Visibilité transversale de l'organisateur SDIS | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L1058) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |
| QV-OI-SDIS-002 — Diffusion CMDT — Gouvernance | [Rubrique canonique](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L1078) | Voir rapport #24/#25/#26/#27 selon date ; MOA partielle ou cas démontrés ; pas de validation globale |

## Règles remplacées, chronologie et contradictions qualifiées

| État antérieur / source | Source postérieure | État applicable sans nouvel arbitrage |
|---|---|---|
| Audit initial : main #22 / 74ac904 ; mentions non déployé des rapports #23–#27 avant livraison | GitHub fusion #27 et Netlify published_deploy contrôlés directement | #20–#27 intégrées et techniquement publiées ; mentions pré-fusion restent historiques |
| Situation V1 du 15.10 : CMDT en attente de GO, main #26 | [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) puis mission actuelle §2–3 | GO/livraison dépassés par #27 fusionnée/publiée et PASS MOA ; aucun nouveau correctif CMDT à programmer |
| Audit initial : formations groupées DAP 1.1/1.2 entièrement à préciser | [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) / canon actualisé | Cas DAP démontré : cours 23.03, séances 21/28.04, 29 jours, décision humaine préservée. Groupes DPS : 15.03 → première 12.05, 58 jours, projection démontrée distincte décision humaine. Ne pas maintenir une absence générale de relation ; autres thèmes/horaires/responsables à qualifier seulement si source manquante |
| Chef section DAP séparé ; libellés bruts/historiques | [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) puis [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) | Chef section de présentation commun DPS/DAP ; ancien code et données brutes conservés ; trim de présentation Resp matériel ; aucune relation fonctionnelle individuelle inventée |
| QV-PDF-003 canon, impression à 100 %, marges 10 mm et trois formats | Mission actuelle §5 — complément MOA | Même repère qualifié par intitulé/date ; complément largeur/ASCII distinct ; aucun renommage ni écrasement de la règle antérieure |
| #23 restaure la lecture verticale web | Mission §5 demande HH:MM - HH:MM dans le PDF | Deux supports, aucune contradiction ; ne pas modifier le vertical web acquis |
| Rapports clone #27 Y1 95/G1 383/SDIS 44 | Mission actuelle Y1 96/G1 384/SDIS 46 PASS | Instantanés/périmètres différents ; pas de régression déduite, pas de recette relancée |
| QV-PUBLIC-008, DPS-003, CALENDAR-003, EXERCICE-PREPARATION-001 réapparaissent dans le canon | Ajouts datés #24–#26 et ancien index | Citer section/date/intitulé en plus de l’ID ; ne pas fusionner silencieusement des exigences distinctes |
| M1–M7/P1–P6 et révisions dans preuve 14.10 / lecture SQL initiale du 15.10 | Pas de nouvelle preuve de clôture reçue dans #23–#27 | À suivre selon dernier état prouvé ; ouverture actuelle NON VÉRIFIÉE pour les cas non relus ; P2/P6 restent décisions acquises, pas à redécider |

## Traçabilité des exigences actualisées

| Exigence | Fonctions / preuves | Acceptation MOA | Reste à prouver |
|---|---|---|---|
| QV-CONTROLE-QUALITE-001 (proposé) | [async function setProgrammeStatus](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-quo-vadis-service.js#L3502) ; [function preparationControls](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-qv-coverage.js#L809) | Besoin exprimé ; implémentation non acceptée | Relier les contrôles, compléter les axes manquants, rapport consolidé sans autocorrection |
| QV-PLANIF-ALTERNATIVES-001 (proposé) | [function proposeBestDates](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-functional-catalog.js#L442) ; [function validateMove](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-functional-catalog.js#L471) ; [function pickProposalSlot](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-qv-coverage.js#L731) | Besoin exprimé ; pas de choix de date délégué | Réutiliser les propositions existantes ; documenter les contraintes couvertes/manquantes et leur preuve |
| QV-CONSULTATION-001 (proposé) | [netlify/lib/_rbac.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_rbac.js) ; [netlify/functions/scope.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/functions/scope.js) ; [assets/js/scope-ui.js](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-ui.js) | Besoin exprimé ; périmètre et droits détaillés à décider | Définir présentation et matrice d’accès sans retrait des droits de saisie existants |
| SCOPE-PROD-001 (proposé) | Netlify published_deploy 6ad0d08255cda461366136f2 ; rapports #20–#27 | Exigence impérative de continuité ; aucun GO de mutation donné | Formaliser contrôle avant/après, sauvegarde/retour arrière adaptés et intervention incident |
| SCOPE-INCIDENT-001 (proposé) | Diagnostic Netlify distinct ; logs datés et PR existantes | Circuit et quatre niveaux demandés ; responsables/SLA à décider | Définir qualification, preuve, responsable, priorité et clôture dans le suivi existant |
| QV-PDF-003 — complément MOA 15.10 (identifiant qualifié) | [Ancien QV-PDF-003 — Impression à 100 %](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md#L673) ; mission §5 | Demande exprimée ; réalisation non acceptée | Obtenir le témoin ; comparer chaque gabarit ; corriger seulement les éléments concernés après GO |
| QV-PUBLIC-008 — complément relation datée (référence qualifiée) | [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) ; [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/business-rules/quo-vadis-canonical-rules.md) ; [async function affectationsValides](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/netlify/lib/_scope-service.js#L1554) | Chef section commun acquis ; modèle daté restant demandé | Définir provenance, dates d’effet et liaison sur les affectations ; conserver les valeurs historiques |
| QV-EXERCICE-PREPARATION-001 — reliquat après #25/#26 | [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) ; [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) ; [docs/captures/qv-preparation-sdis/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/captures/qv-preparation-sdis/targeted-results.json) | Alertes et groupes démontrés PASS ; pas de date corrigée par l’audit | Qualifier DAP Y1 exercice 10.02/cours 10.03 (−28 jours) et relations mixtes non démontrées ; ne pas recréer l’alerte |
| QV-OI-SDIS-001/002 — SDIS / CMDT | [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) ; [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) ; [function qvProgrammeDiffusionScope](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-ui-logic.js#L3609) | PASS #26 cas démontrés ; PASS #27 Y1 96/G1 384/SDIS 46 sans duplication | Aucun correctif à rouvrir sans anomalie résiduelle nommée |
| QV-HORAIRES — acquis PR #23 (repère d’audit, pas nouvel ID canonique) | [docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md) ; [function qvProgrammeTimeHtml](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/assets/js/scope-ui.js#L12245) | PASS MOA | Aucun développement identique ; séparer futur complément PDF |
| QV-CYCLE-007 — chaîne annuelle et modifications | [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_ROADMAP_V1_20261012.md) ; [docs/SCOPE_V1_SITUATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_V1_SITUATION_20261015.md) | Processus demandé ; Programme 2027 NON VALIDÉ | Voir plan par étape ; compléter les raccords et contrats, pas de moteur parallèle |
| QV-RULES-001 | [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_ROADMAP_V1_20261012.md) ; [docs/SCOPE_V1_SITUATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_V1_SITUATION_20261015.md) | Maquette/règles acquises ; aucun GO de reconstruction | Compléter portées, jours, contrôles et faisabilité ; confirmer si nécessaire avant validation 2027 |

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

## Lecture de la matrice

Une association explicite test→règle est plus forte qu'une simple mention littérale. Les annexes automatiques ci-dessous indiquent les mentions trouvées, **sans prétendre qu'une chaîne de texte démontre la couverture**. NON VÉRIFIÉ ne signifie ni testéchoué ni fonctionnalité à reconstruire. Aucun scénario n'a été exécuté pour l'audit.

## Chaînes vérifiées sur les sujets prioritaires
| Règle/exigence | Composant | Test/harness | Preuve | Validation / limite |
|---|---|---|---|---|
| QV-FAMILY-005 | [qvProgrammeFamilyCatalogue](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui-logic.js#L3502) | [scripts/scope-qv-moa-consolide-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-consolide-tests.js) | [docs/captures/qv-moa-consolide/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-consolide/targeted-results.json) | Décision humaine15.10 retrouvée ; acceptation globale du logiciel non déduite |
| QV-FILTER-006/007 | [qvProgrammeFilteredRows](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui.js#L12068) | [scripts/scope-qv-familles-filtres-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-familles-filtres-tests.js) | [docs/captures/qv-familles-filtres/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-familles-filtres/targeted-results.json) | Décisions canoniques ; témoignage Annulé en mémoire |
| QV-CURSUS-009 | [qvProgrammeReferenceGroups](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui-logic.js#L3530) | [scripts/scope-qv-complement-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-clone.js) | [docs/captures/qv-complement/clone-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/clone-results.json) | GO FOCA ; références actuelles relues |
| QV-DAP-001 | [qvDapConduiteSlots](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui-logic.js#L4615) | [scripts/scope-qv-complement-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-tests.js) | [docs/captures/qv-complement/targeted-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/targeted-results.json) | Tableau métier versionné ; recette terrain non attestée |
| QV-AUDIT-002 | [function history](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-programme-revisions.js#L37) | [scripts/scope-qv-post-pr16-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js) | [docs/captures/qv-post-pr16-moa-20261014/clone-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-post-pr16-moa-20261014/clone-results.json) | Présentation décidée ; pas de reconstruction historique |
| QV-AUDIT-004 | [updateProgrammePreparation](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-quo-vadis-service.js#L3650) | [scripts/scope-qv-v1-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-clone.js) | [docs/captures/qv-v1-tests19-33/clone-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/clone-results.json) | Permission/motif/ID/30min prouvés sur clone |
| QV-CYCLE-006/JSP-001 | [applyPublishedRevision](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-qv-programme-revisions.js#L166) | [scripts/scope-qv-pr18-finalisation-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr18-finalisation-proof.js) | [docs/captures/qv-moa-20261014/finalisation-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-20261014/finalisation-results.json) | Dates approuvées ; révisions opérationnelles distinctes |
| QV-CTA-001/007 | [instructionPublicForDate](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-cta-rules.js#L30) | [scripts/scope-qv-v1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js) | [docs/captures/qv-v1-tests19-33/clone-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/clone-results.json) | InvariantsCTA validés ; aucune nouvelle rotation |
| QV-EXPORT-002 | [generateQuoVadisProgrammeReport](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_scope-report-service.js#L237) | [scripts/scope-qv-v1-pdf.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-pdf.js) | [docs/captures/qv-v1-tests19-33/pdf/manifest.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/pdf/manifest.json) | 918lignes/50pages au jalon19, pas compte actuel |
| AUTH-SESSION-22 | [authFailureResponse](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/netlify/lib/_auth-utils.js#L264) | [scripts/scope-qv-complement-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-tests.js) | [docs/captures/qv-complement/browser-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/browser-results.json) | Technique ; expiration Okta et veille physique non démontrées |

## Index de toutes les rubriques canoniques

Pour chaque rubrique : source complète, références littérales à des fichiers, identifiants trouvés dans tests. Une référence absente n’est pas une preuve d’absence de test ; les autres exigences peuvent être couvertes par assertions de valeurs. Les rubriques futures ne sont pas déclarées implémentées.

| Rubrique | Fichiers référencés existants | Mentions dans les tests/harness | Validation exhaustive |
|---|---|---|---|
| [QV-CTA-001 — Cycle CTA perpétuel interannuel](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L18) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-002 — Réserves exclues des permanences normales](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L23) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-003 — G1 = 5 sections / 10 demi-sections opérationnelles](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L27) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-004 — C1 / B1 / B2 = 3 sections / 6 demi-sections chacun](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L30) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-005 — Un seul moteur](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L33) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-006 — Public d’instruction dérivé de la permanence du vendredi de référence](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L37) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-001 — Réalisation par OI lorsque Stat.Com / public / lieu diffèrent](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L44) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-002 — B2 reste B2 même au lieu Caserne C1](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L48) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-003 — Responsable = Chef section DPS](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L52) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-004 — L’Excel 2026 n’écrase pas un public CTA déjà posé](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L57) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-005 — Rotation historique des activités hors couverture d'instruction](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L60) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-006 — Saison d’instruction bornée par l’historique](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L63) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-ANNUAL-001 — Structure et ordre versionnés](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L70) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-COVERAGE-001 — Couverture complète de chaque thème d'instruction](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L73) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PROJ-001 — Chaque occurrence reprend sa propre réalisation 2026](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L80) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-pr18-finalisation-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr18-finalisation-proof.js); [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PERIOD-001 — Périodicité pluriannuelle](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L98) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-001 — 2 conduites annuelles par demi-section DPS active](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L108) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-002 — Cible = demi-sections opérationnelles actives × 2](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L111) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-008 — Désactivée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L114) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-conduites-canonical-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js); [scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js); [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-003 — Adossée à une Instr demi-sct réelle](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L117) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-004 — Durée maximale 1 heure](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L120) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-005 — Public = `<demi-section source>, cond PL, cond VL`](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L123) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-006 — Pas de conduite après PIONNIER](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L127) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONDUITE-007 — Répartition annuelle déterministe](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L130) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DAP-001 — Conduite / formation continue DAP](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L135) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-complement-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-clone.js); [scripts/scope-qv-conduites-canonical-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js); [scripts/scope-qv-complement-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-browser.js); [scripts/scope-qv-final-development-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js); [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DAP-002 — Quatre exercices DAP](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L159) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FOBA-001 / QV-PR-001 — Thèmes propres aux occurrences](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L174) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PRABC-001 — *Abrogée* : 3 séances T1 + 3 séances T4](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L185) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PRABC-002 — Séance en matinée du mercredi](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L189) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PRABC-003 — Exercice PR-ABC = exactement 3 séances](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L192) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PIONNIER-001 — Introduction PIONNIER = FOBA 2](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L206) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PIONNIER-002 — Demi-section = 4 heures (07:30–11:30)](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L207) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PIONNIER-003 — CSU-nvb = 19:15–22:00](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L208) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PIONNIER-004 — Hors astreinte N et N−1](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L211) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-001 — État = carré 8×8 + texte, sans badge ni capsule](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L218) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-002 — Actions textuelles non soulignées](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L222) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-003 — Filtres / recherche conservés au retour de fiche](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L225) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-004 — Permanence CTA non déplaçable](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L228) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-005 — Filtre Domaine = taxonomie métier canonique](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L231) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UI-006 — Agenda d’une année passée listé sans mois dans l’URL](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L242) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js); [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CODE-001 — Code métier = STAT.COM.xxx lorsque l’activité a un Stat.Com](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L252) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CODE-002 — Séquence xxx stable et indépendante par Stat.Com](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L253) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CODE-003 — Pas d’identifiant technique visible en remplacement du code métier](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L255) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-SAVE-001 — Trois actions distinctes](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L268) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESP-001 — Responsables référencés et descriptifs](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L275) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLIC-001 — Public libre uniquement descriptif](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L281) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-001 — Concours confirmé](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L287) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-TITLE-001 — Intitulé exact de l'occurrence](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L295) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESP-002 — Références inclusives et état par défaut](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L298) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLIC-002 — Public permanent descriptif](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L301) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-OI-001 — Sélection globale qualifiée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L304) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-002 — EXEPRO et défaut EXERCI non destructif](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L307) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PART-001 — Évaluation individuelle et reconduction](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L310) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PAPR-001 — Sept modules distincts et prérequis annuel bloquant](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L315) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PR-OI-002 — Exercices PR et exception PR-ABC](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L333) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-003 — Référence SQL Formations EXTRAS](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L336) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-WORKFLOW-002 — Retrait et révision ciblée d'une publication](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L340) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-004 — Rapport de clôture 2027 proposé en février 2028](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L347) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PAPR-002 — Propositions automatiques 2027](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L353) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-005 — Clôture provisoire 10.02.2028](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L360) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PAPR-003 — Publication antérieure du module 1](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L365) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLIC-004 — Singulier et Préposé APR](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L368) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-THEME-002 — Priorité au thème explicite](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L372) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-SPEC-001 / QV-ECA-COURSES-002 — Acquis et roadmap](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L375) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | À DÉVELOPPER / voir fiche |
| [QV-PUBLIC-003 — Fonctions descriptives permanentes](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L382) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESP-003 — Correction du libellé C sct](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L386) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-EXPORT-001 — Intitulé et thème dans les exports](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L389) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-roadmap-export-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-proof.js); [scripts/scope-qv-roadmap-export-pdf-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js); [scripts/scope-qv-roadmap-v1-ui-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-TYPE-001 / QV-TYPE-002 — Bibliothèque complémentaire](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L392) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-001 — Cycle délimité par les Rapports annuels](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L395) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-002 — A+1 et absence de doublons](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L399) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-STAT-001 — Statistiques civiles indépendantes](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L403) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-roadmap-v1-statistics-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-SCOPE-001 — Externe et non évalué sont distincts](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L406) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-COURSES-001 — Suivi cantonal préservé](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L409) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | À DÉVELOPPER / voir fiche |
| [QV-SAVE-002 — État explicite indépendant](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L414) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PAPR-004 — Modules préparatoires du cursus 2027](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L418) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-post-recette-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-004 — Liste d'activités ECAwin](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L422) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-MANIFESTATION-001 / QV-CODE-004 — Interne non soldé sans Stat.Com](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L425) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-MANIFESTATION-002 — Préremplissage dépendant des OI](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L430) | [scripts/scope-qv-pr12-corrective-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js); [scripts/scope-qv-pr12-corrective-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-clone-tests.js); [scripts/scope-qv-pr12-corrective-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-browser.js); [docs/captures/qv-pr12-corrective-20261012/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-pr12-corrective-20261012/) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-SEARCH-001 / QV-UI-007 — Réactivité et fiches](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L438) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-WORKFLOW-003 — Aucune modification, mineure ou majeure](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L442) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-AUDIT-001 — Journal permanent existant](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L447) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESP-004 / QV-PUBLIC-005 — Présentation sans migration d'associations](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L451) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-NATURE-001 — Paramètres indépendants et occupations](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L456) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-post-pr16-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CODE-005 — HSC, sans renumérotation historique](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L461) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CONTROL-001 — Contrôles utiles uniquement](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L465) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DPS-GROUP-001 — Formation continue groupée des quatre DPS](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L469) | Voir composant référencé dans le texte du canon | [scripts/scope-qv-post-recette-moa-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-clone.js) | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-004 — Programme civil et rattachement métier](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L472) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UX-RECH-001 / QV-UX-003 — Post-recette ciblée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L475) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PDF-001 — Deux exports annuels existants](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L478) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLIC-004 — Groupe OPÉRATIONNEL](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L481) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-ECA-001 — Activité déjà créée dans ECAwin](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L484) | [docs/captures/qv-moa-20261013/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-20261013/) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLICATION-003 — Rapprochement non destructif](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L491) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CODE-006 — Préflight HSC préalable à la décision de production](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L503) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESP-005 — Références absentes non supposées](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L512) | [docs/captures/qv-pr13-complement-20261013/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-pr13-complement-20261013/) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLICATION-004 — Dates des propositions A+1](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L525) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DAP-003 — Replanification autorisée de la séance 1.2](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L534) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RULES-001 — Décision MOA validée, prochain jalon uniquement](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L546) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | À DÉVELOPPER / voir fiche |
| [QV-AUDIT-002 — Tableau directement lisible](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L558) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESERVATION-002 — Ressource explicite](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L568) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PLANIF-005 / QV-OSR-001 — Proposition contrôlée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L576) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-UX-004 / QV-PDF-002 / QV-PUBLIC-006](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L587) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-INDEX-001 — Correspondances documentaires, pas de réorganisation](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L596) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESERVATION-003 — Date réelle, tous cycles et battement](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L609) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-EM-001 — Priorité État-major](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L626) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CALENDAR-003 — Calendrier validé, stable](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L637) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-AUDIT-003 — Annulation motivée, valeurs conservées](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L645) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FAMILY-002 / QV-PUBLIC-007 — Organisation et présentation](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L657) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FREEZE-20261014 — Budget et IndeX gelés](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L666) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PDF-003 — Impression à 100 %](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L673) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-006 — Dates confirmées et ancienne publication EM](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L682) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-JSP-001 — Dates Direction JSP approuvées par la MOA](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L693) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-RESERVATION-004 — Résolution manuelle et preuves d'identité](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L707) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CYCLE-007 — Ajouts et communication après publication annuelle](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L726) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | À DÉVELOPPER / voir fiche |
| [QV-CALENDAR-004 — Panneau complet de la maquette](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L750) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CTA-007 — Alerte selon la règle d'instruction, pas la règle générique](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L758) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FAMILY-003 — Catalogue commun et valeur absente neutre](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L771) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FAMILY-004 — Familles exclusives, décision MOA du 15.10.2026](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L784) | [docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FILTER-006 — Référentiels communs fiche et Programme, 15.10.2026](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L808) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-EXPORT-002 — Domaine court et ordre cohérent](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L821) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-AUDIT-004 — Réactivation annuelle explicite](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L828) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [Perspectives ProgJour Et GELORE2](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L839) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FAMILY-005 — Permanent et ordre des onze familles](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L845) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-FILTER-007 — Groupes descriptifs et rattachements démontrés](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L852) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-DAP-002 — Complément de classification autorisé le 15.10.2026](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L863) | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-PUBLIC-008 — Quatre références descriptives](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L884) | Voir composant référencé dans le texte du canon | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |
| [QV-CURSUS-009 — CI DAP et CI DPS sous FOCA](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L902) | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) | Pas de mention littérale dans les fichiers inventoriés | NON VÉRIFIÉ pour chaîne exhaustive ; voir chaînes prioritaires |

## Inventaire des tests et harness existants

Critère : fichiers JS/MJS/SH de scripts/ ou tests/ dont le nom contient test, clone, browser, proof, recipe, pdf ou check. Inclut serveurs/diagnostics et fixtures de recette : leur présence n’autorise pas leur exécution. Extraction de scénarios littéraux quand possible ; les scénarios dynamiques ne sont pas reconstruits. Les dates de rapport ne sont pas des horodatages d’exécution prouvés.


### scripts/check-local.sh

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/check-local.sh](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/check-local.sh) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/FICHIERS_MODIFIES_V65_5.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/FICHIERS_MODIFIES_V65_5.md); [docs/PROCEDURE_MAJ_GITHUB_NETLIFY_TERMINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/PROCEDURE_MAJ_GITHUB_NETLIFY_TERMINAL.md); [docs/RAPPORT_CORRECTION_AUTH_OKTA_V65_5.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/RAPPORT_CORRECTION_AUTH_OKTA_V65_5.md); [docs/SCOPE_IMPL_1A_BACKEND.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_IMPL_1A_BACKEND.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/lib/scope-qv-pr13-complement-recipe.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/lib/scope-qv-pr13-complement-recipe.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/lib/scope-qv-pr13-complement-recipe.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-admin-rbac-doc-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-admin-rbac-doc-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-admin-rbac-doc-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-admin-users-availability-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-admin-users-availability-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-admin-users-availability-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-alerts-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-alerts-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-alerts-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-analyses-statistiques-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-analyses-statistiques-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-analyses-statistiques-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-analytics-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-analytics-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-analytics-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-annual-catalog-c10-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-c10-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L18) | 01 undefined annual need has a business summary |
| [27](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L27) | 02 defined annual need has correct counts and plurals |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L33) | 03 variants stay internal until a canonical business model exists |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L41) | 04 technical activity code is absent from list cell |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L48) | 05 date fields describe a period and use neutral placeholders |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L54) | 06 annual catalog domain order remains business-defined |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L55) | 07 workflow vocabulary is MOA-facing |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L62) | 08 themes stay occurrence-based and free themes remain available |
| [65](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L65) | 09 empty supporting sections remain neutral |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L66) | 10 family FOCO is technical detail, not normal business frame |
| [74](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L74) | 11 C10 uses open sections rather than nested catalog cards |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L81) | 12 status convention remains eight-pixel square plus black text |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L84) | 13 responsive contracts cover all requested widths |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L85) | 14 list keeps exactly eight business columns |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L86) | 15 preview pipeline is read-only and manual-review closed |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L92) | 16 operational boundaries and QV mirror remain untouched |
| [97](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L97) | 17 readiness action follows the server decision and lifecycle |
| [104](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L104) | 18 compatible normalized forms are grouped without a false collision |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L111) | 19 contradictory identities and domains produce review collisions |
| [121](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L121) | 20 collision output is deterministic |
| [125](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c10-tests.js#L125) | 21 C10 text-action overrides stay confined to the annual catalog |

### scripts/scope-annual-catalog-c13-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-c13-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L39) | 01 list renders the validated programme-facing Catalogue columns |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L44) | 02 list keeps business domain order and unknown domains last |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L49) | 03 list hides technical identities and uses fiche action |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L53) | 04 detail has the three ordered desktop zones |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L58) | 05 annual need retains operational form controls |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L64) | 06 no annual requirement remains coherent and editable |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L68) | 07 one-occurrence draft renders one occurrence row |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L72) | 08 four-occurrence draft keeps canonical free and empty themes |
| [77](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L77) | 09 themes table exposes occurrence theme and action columns |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L81) | 10 activity information excludes technical family |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L85) | 11 requirements and Stat.Com are compact business rows |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L89) | 12 public organisation uses only available values |
| [93](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L93) | 13 technical details stay closed and carry internal identity |
| [97](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L97) | 14 READY allowed uses only public contract and remains enabled |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L101) | 15 READY refused displays the business message only |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L105) | 16 READY lifecycle hides validation and offers QV preparation |
| [109](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L109) | 17 CSS owns dense list and responsive one-column result |
| [112](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L112) | 18 CSS has explicit 1150 960 and 800 adaptations |
| [113](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L113) | 19 preview generator uses actual renderer output |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c13-tests.js#L116) | 20 protected operational structures are untouched |

### scripts/scope-annual-catalog-c15-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-c15-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L87) | 01 lit le classeur réel et réconcilie 925 lignes événementielles |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L92) | 02 retrouve 48 colonnes métier et 365 libellés sources |
| [97](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L97) | 03 applique strictement le parsing activité barre verticale thème |
| [106](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L106) | 04 compose les libellés avec le point médian |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L110) | 05 ne préfixe jamais le thème dans le libellé composé |
| [113](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L113) | 06 conserve les tirets internes |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L116) | 07 interprète un cas DPS seul depuis les vraies croix |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L117) | 08 interprète un cas DAP seul depuis les vraies croix |
| [118](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L118) | 09 interprète un cas DPS et DAP |
| [119](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L119) | 10 retrouve DPS DAP FOBA JSP sur BIKABLO |
| [123](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L123) | 11 AUTO traverse plusieurs populations et reste domaine de premier niveau |
| [127](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L127) | 12 conserve les activités portant plusieurs OI |
| [128](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L128) | 13 conserve FOBA associé à des exercices DPS ou DAP |
| [129](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L129) | 14 ne crée jamais GEN comme OI |
| [130](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L130) | 15 ne transforme pas CADET en domaine |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L131) | 16 maintient PR AUTO et FOSPEC comme domaines distincts |
| [135](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L135) | 16b traduit VPC exclusivement vers le canon C3 |
| [141](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L141) | 17 ne confond pas famille technique et domaine |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L142) | 17b traite FOCO comme famille lorsque les croix démontrent le public |
| [148](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L148) | 18 produit un regroupement et une empreinte déterministes |
| [152](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L152) | 18b classe les collisions comme arbitrages explicites |
| [156](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L156) | 19 retrouve les répétitions annoncées et réconcilie les groupes |
| [161](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L161) | 20 détecte 148 lignes multi-populations |
| [162](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L162) | 21 préserve une décision humaine explicite |
| [170](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L170) | 22 le dry-run de service ne lance ni transaction ni écriture |
| [176](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L176) | 23 le Catalogue rend création import et filtre archives |
| [181](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L181) | 24 la fiche rend modification archivage restauration et versionnement |
| [186](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L186) | 25 refuse le hard-delete d’une activité utilisée |
| [196](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L196) | 25b réserve le hard-delete aux activités sans aucune trace C15 |
| [221](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L221) | 26 ne contient aucune écriture vers les structures opérationnelles |
| [226](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L226) | 27 modernise les contrôles sans modifier les primitives globales |
| [231](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L231) | 28 couvre les largeurs 1500 1150 960 et 800 sans cartes mobiles |
| [235](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L235) | 29 garde une parité structurelle entre migration et DDL partagé |
| [241](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L241) | 30 produit un artefact preview lisible et exhaustif |
| [245](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L245) | 31 génère les six états UX depuis le renderer réel |
| [253](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L253) | 32 crée une définition et active une version canonique |
| [266](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L266) | 32b crée les liaisons VPC canoniques et rejette une référence absente |
| [299](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L299) | 33 versionne une modification et clone toute la configuration canonique |
| [329](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L329) | 34 archive et restaure sans détruire la définition |
| [337](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L337) | 35 recharge les arbitrages humains lors d’un nouveau dry-run |
| [348](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c15-tests.js#L348) | 36 rend le vrai second import identique idempotent après création des alias |

### scripts/scope-annual-catalog-c4-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-c4-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L45) | 01 stable definition identity is separate from version configuration |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L53) | 02 DPS-DAP is one valid multi-domain activity |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L59) | 03 session templates support arbitrary N |
| [67](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L67) | 04 generator creates required occurrences and all sessions |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L72) | 05 periodicity combinations are strict |
| [78](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L78) | 06 public bindings reference C2-B definitions and restricted operators |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L85) | 07 READY pins exactly one active public rule version |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L98) | 08 qualification bindings keep prerequisite, taught and renewed separate |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L105) | 09 role requirements do not assign a holder |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L111) | 10 planning constraints validate all severities and reject free-form types |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L140) | 11 an activity supports multiple Stat.Com contributions |
| [146](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L146) | 12 contribution modes are strictly validated |
| [154](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L154) | 13 FOSPEC remains data-driven |
| [161](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L161) | 14 AUTO remains data-driven |
| [168](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L168) | 15 C4-B creates no CADET structure or seed |
| [173](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L173) | 16 JSP-CAD stays fail-closed at READY |
| [178](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L178) | 17 annual generation is deterministic and input-pure |
| [192](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L192) | 18 catalogue contracts forbid person assignment |
| [198](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L198) | 19 generator creates no operational event, expected population or participation |
| [203](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L203) | 20 QV projection is pure and carries only identifiers |
| [209](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L209) | 21 standalone migration and runtime DDL are structurally identical |
| [218](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L218) | 22 DDL is structurally idempotent and protected |
| [245](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-c4-b-tests.js#L245) | 23 legacy diagnostic classifies without producing writes |

### scripts/scope-annual-catalog-moa-c6-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-moa-c6-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [132](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L132) | base source still exposes exactly nine high-confidence activities |
| [133](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L133) | business domain order is exact |
| [134](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L134) | independent C1-C5 DDL inventory reports SCHEMA_READY |
| [138](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L138) | readiness reports MIGRATION_REQUIRED |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L142) | readiness rejects a missing critical table |
| [146](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L146) | readiness rejects a missing critical column |
| [152](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L152) | readiness rejects a missing critical function |
| [156](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L156) | readiness rejects a missing critical trigger |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L160) | readiness executes SELECT statements only |
| [164](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L164) | service maps the real definition status to active |
| [172](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L172) | readiness distinguishes another missing table from migration state |
| [176](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L176) | readiness fails closed on metadata error |
| [180](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L180) | DRAFT validation accepts the MOA annual fields |
| [181](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L181) | DRAFT aliases accept camelCase, snake_case and equal pairs |
| [186](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L186) | DRAFT aliases reject every contradictory pair |
| [192](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L192) | DRAFT date validation accepts real leap dates only |
| [198](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L198) | DRAFT validation rejects incoherent windows |
| [199](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L199) | service creates only an annual DRAFT |
| [205](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L205) | contradictory aliases fail before CREATE or UPDATE writes |
| [216](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L216) | snake_case UPDATE is accepted for an in-scope DRAFT |
| [222](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L222) | future canonical activities are data-driven behind structural guards |
| [234](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L234) | READY pins a public rule and persists snapshot/fingerprint |
| [240](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L240) | read contract exposes an allowed READY transition only for a valid DRAFT |
| [245](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L245) | activity read serializes the server READY transition contract |
| [251](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L251) | read contract explains a missing applicable public rule |
| [259](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L259) | read contract fails closed for an incomplete activity contract |
| [265](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L265) | read contract masks an unknown future READY error with a safe fallback |
| [270](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L270) | read contract maps multiple READY causes deterministically without duplicates |
| [278](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L278) | read contract never offers READY twice or after lifecycle closure |
| [284](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L284) | READY error is expressed as a business error |
| [291](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L291) | READY correction creates a DRAFT by explicit supersession |
| [298](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L298) | generation is deterministic and idempotent through conflict-safe inserts |
| [306](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L306) | preview is mirror-only and creates no event |
| [312](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L312) | generated occurrences and sessions remain distinct |
| [316](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L316) | ensureScopeSchema contains no runtime C1-C5 migration call |
| [321](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L321) | C6 service has no operational-table write |
| [325](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L325) | frontend navigation places annual catalog before annual agenda |
| [329](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L329) | frontend routes list and canonical activity detail |
| [334](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L334) | frontend exposes required controls and exact action wording |
| [338](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L338) | frontend presents migration-required state without SQL detail |
| [342](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L342) | status marker is an eight-pixel square |
| [346](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-moa-c6-b-tests.js#L346) | API and UI never offer event publication from annual catalog |

### scripts/scope-annual-catalog-themes-c8-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-annual-catalog-themes-c8-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L50) | 01 canonical theme assignment is valid |
| [51](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L51) | 02 free annual theme is valid and normalized |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L55) | 03 zero themes is valid |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L56) | 04 several themes can target one occurrence |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L57) | 05 one canonical theme can be reused on several occurrences |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L58) | 06 unbound canonical theme is rejected |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L59) | 07 theme bound to another activity is rejected |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L60) | 08 session from another version is rejected |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L61) | 09 canonical and free together are rejected |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L62) | 10 READY snapshot and fingerprint cover themes |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L66) | 11 external theme mutation after snapshot is detected |
| [70](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L70) | 12 READY assignments are protected by SQL guard |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L71) | 13 supersession copies themes into the new DRAFT |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L72) | 14 generation with themes is deterministic |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L75) | 15 persistence rerun is conflict-safe and assignments are unique |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L79) | 16 QV projection carries occurrence themes |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L84) | 17 free theme is explicitly identified in QV |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L88) | 18 C8 writes no operational event |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L89) | 19 C8 writes no expected population |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L90) | 20 C8 writes no participation |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L91) | 21 QV mirror keeps human decisions empty |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L95) | 22 empty UI sections are hidden by logic |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L96) | 23 technical enums have business labels |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L100) | 24 business domain order is exact |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L101) | 25 future families are not blocked by nine-code SQL |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L102) | 26 date placeholder is never a field value |
| [106](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L106) | 27 contradictory theme aliases fail before writes |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L116) | 28 invalid dates still fail before SQL |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L117) | 29 Auth permission remains references:manage |
| [121](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L121) | 30 readiness includes C8 without runtime auto-migration |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L126) | 31 migration and runtime DDL are structurally identical |
| [130](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L130) | 32 DDL has lifecycle, RLS and revoke guards |
| [134](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L134) | 33 list and detail use the approved MOA vocabulary |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L142) | 34 buttons are softer than state red and responsive breakpoints exist |
| [146](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L146) | 35 no canonical theme is seeded or promoted automatically |
| [150](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L150) | 36 repair protects theme definitions only when referenced by READY |
| [154](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L154) | 37 repair protects READY binding identity even when status stays ACTIVE |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L160) | 38 repair validates every assignment before a DRAFT version change |
| [167](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L167) | 39 repair enforces the JavaScript free-theme normalization contract in SQL |
| [176](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-annual-catalog-themes-c8-b-tests.js#L176) | 40 repair-2 makes SQL normalization independent from database locale |

### scripts/scope-assignments-constraints-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-assignments-constraints-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-assignments-constraints-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-attendus-retrait-schema-contract-repair-10-3-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-attendus-retrait-schema-contract-repair-10-3-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-attendus-retrait-schema-contract-repair-10-3-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-401-root-cause-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-401-root-cause-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-401-root-cause-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-identity-recovery-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-identity-recovery-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-identity-recovery-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-identity-recovery-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-identity-recovery-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-identity-recovery-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-idle-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-idle-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-idle-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-lambda-blobs-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-lambda-blobs-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-lambda-blobs-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_AUTH_RELEASE_GATE_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_AUTH_RELEASE_GATE_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-packaging-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-packaging-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-packaging-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_AUTH_RELEASE_GATE_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_AUTH_RELEASE_GATE_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-rbac-orion-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-rbac-orion-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-rbac-orion-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-auth-session-security-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-auth-session-security-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-auth-session-security-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_AUTH_RELEASE_GATE_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_AUTH_RELEASE_GATE_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-c11-ux-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c11-ux-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L49) | 01 every local SCOPE asset receives its published content hash |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L62) | 02 identical builds are byte-for-byte deterministic |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L68) | 03 JS, logic and CSS content independently control their public URLs |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L89) | 04 dead annual catalog renderer and historical asset versions are absent |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L96) | 05 list DOM exposes eight business columns and no visible technical code |
| [108](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L108) | 06 activity DOM without requirement is neutral and contains no legacy panel |
| [121](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L121) | 07 DRAFT DOM follows public READY decision without exposing internal codes |
| [133](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L133) | 08 two occurrences keep canonical and free themes attached to their rows |
| [144](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L144) | 09 C10 CSS remains scoped, open and responsive at required breakpoints |
| [153](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L153) | 10 PDF worker URL follows published bytes and returns after restoration |
| [167](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c11-ux-repair-1-tests.js#L167) | 11 standard font URL follows published bytes and returns after restoration |

### scripts/scope-c16-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c16-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [20](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L20) | 01 expose les quatre références JSP canoniques exactes |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L29) | 02 conserve le code historique sans conversion automatique |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L36) | 03 conserve 010JY3 et sa provenance dans le vrai XLSX |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L48) | 04 garde les propositions actives et signale le code historique hors seed |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L57) | 05 maintient les 80 thèmes et les réparations C15 |
| [65](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c16-repair-2-tests.js#L65) | 06 garde migration seed et DDL runtime en parité |

### scripts/scope-c19-preprod-canonical-truth-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-canonical-truth-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L15) | 01 extrait exactement les 87 codes du PDF officiel |
| [20](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L20) | 02 réconcilie exactement le PDF 87 et SCOPE 91 |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L26) | 03 trace les quatre extensions JSP post-export |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L30) | 04 maintient la succession 010JY3 vers 010JC1 |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L33) | 05 autorise le Stat.Com vide externe et détecte le manque SDIS |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L39) | 06 canonise le Stat.Com EMSEA démontré par le classeur source |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L46) | 07 démontre onze occurrences historiques et le mardi prioritaire |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L52) | 08 complète les onze occurrences 2027 sans date inventée |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L59) | 09 retrouve et vérifie les sources CTA multi-années |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L66) | 10 reconstruit les 53 semaines CTA 2027 |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L73) | 11 conserve les sections, la réserve et les capacités canoniques |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L83) | 12 attache le tournus exact aux 53 permanences |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L88) | 13 laisse les permanences primer sur le calendrier protégé |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L92) | 14 préserve les règles FOBA et C FOBA |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L98) | 15 prouve sept chaînes de workflow uniques |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L102) | 16 enrichit chaque objet avec sa chaîne d’identité |
| [106](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L106) | 17 réconcilie les 613 objets antérieurs sans perte |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L111) | 18 explique exactement la nouvelle volumétrie |
| [120](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L120) | 19 ne crée aucun P1 ni nouveau P2 canonique |
| [125](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L125) | 20 sépare socle canonique 87 et référentiel opérationnel 91 dans la preview |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L131) | 21 impose le titre dynamique ASCII de l’écran 11 |
| [135](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L135) | 22 respecte la sémantique des marqueurs 5x5 |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L140) | 23 conserve l’UX conflit et les contrôles date/heure |
| [149](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L149) | 24 conserve filtres, zébrage et scroll interne |
| [158](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-canonical-truth-1-tests.js#L158) | 25 produit exactement le rapport A à BH |

### scripts/scope-c19-preprod-gate-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-gate-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md); [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-c19-preprod-gate-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-gate-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L19) | les cellules de date vides restent nulles |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L26) | la réconciliation 2026 ne perd aucune ligne silencieusement |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L33) | les lignes 2027 explicites restent distinctes de la génération annuelle |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L41) | chaque événement de preview conserve sa preuve source |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L47) | le calendrier officiel 2026 et 2027 est complet |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L54) | faits calendaires et règles métier restent séparés |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L60) | aucun tournus CTA n’est inventé |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L66) | les OI JSP interdits Y1 à Y4 ne sont jamais produits |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L71) | les arbitrages structurants sont tous explicites |
| [77](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-1-tests.js#L77) | le verdict ne peut pas masquer les gates bloqués |

### scripts/scope-c19-preprod-gate-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-gate-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L14) | 01 — base R1 PASS et génération sans écriture |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L19) | 02 — 302 définitions R1 sans perte silencieuse |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L24) | 03 — 72 événements source conservés un pour un |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L30) | 04 — récurrences générées sans date 2026 copiée |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L35) | 05 — cursus non retenu ne génère aucune occurrence |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L40) | 06 — CTA garde les neuf définitions et les tournus partiels |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L46) | 07 — capacités G1 et absence de limite C1 B1 B2 |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L53) | 08 — N06 reste une réserve et non un Public |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L58) | 09 — Stat.Com SCOPE, 12 anomalies et extérieurs non bloqués |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L64) | 10 — FOCA sans date conservées à positionner |
| [69](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L69) | 11 — trois Publics restent inconnus et quatre non-Publics sont exclus |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L73) | 12 — modèle multi-public et multi-session |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L79) | 13 — OI indépendants, FULL_OI, partiel, JSP/DPS et PR/DPS |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L91) | 14 — calendrier officiel réutilisé et annonces autonomes |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L96) | 15 — typologie de conflits limitée aux quatre états |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L100) | 16 — preview complète et dataset local |
| [107](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-2-tests.js#L107) | 17 — volumétrie réconciliée |

### scripts/scope-c19-preprod-gate-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-gate-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [8](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L8) | 01 FOBA DPS progresse 1-2-3 puis intègre |
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L9) | 02 FOBA DAP s’arrête après niveau 2 |
| [10](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L10) | 03 activité du 05.01 corrigée |
| [11](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L11) | 03b phase II du 06.01 progresse aussi sans écraser C site |
| [12](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L12) | 04 référentiel courant 91 et quatre ajouts exacts |
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L13) | 05 StatCom absents restent ambigus sans invention |
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L14) | 06 EMSEA reste sans correspondance inventée |
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L15) | 07 permanence traverse un férié par exception |
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L16) | 08 activité ordinaire refusée sur jour protégé |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L17) | 09 propositions évitent les vacances de janvier |
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L18) | 10 entrée en service et provenance propagées |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L19) | 11 publics preview dédupliqués |
| [20](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L20) | 12 CTA G1 et autres sites inchangés |
| [21](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L21) | 13 aucune perte Gate 2 |
| [22](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-gate-3-tests.js#L22) | 14 benchmark 1000 objets reste séparé des données réelles |

### scripts/scope-c19-preprod-moa-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-moa-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L16) | 01 matérialise le programme massif réel |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L17) | 02 dépasse les 72 dates explicites sans date inventée |
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L18) | 03 ferme exactement l’équation des statuts |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L19) | 04 réconcilie 302 définitions sans perte |
| [20](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L20) | 05 conserve une provenance explicite sur chaque objet |
| [21](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L21) | 06 contrôle les quatre codes JSP avec origine et présence SCOPE |
| [22](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L22) | 07 applique la succession 010JY3 vers 010JC1 |
| [23](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L23) | 08 garde EMSEA à arbitrer |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L24) | 09 ne classe pas l’externe sans StatCom en anomalie |
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L25) | 10 applique FOBA et la fonction Chef FOBA |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L26) | 11 conserve la structure et les capacités CTA |
| [27](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L27) | 12 refuse les bords calendaires ordinaires et autorise les permanences |
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L28) | 13 utilise le moteur partagé pour la cohérence |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L29) | 14 ne crée ni Public dupliqué ni cible/salle impossible |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L30) | 15 mesure le dataset réel comme preuve principale |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L31) | 16 charge les 613 objets dans la preview |
| [32](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L32) | 17 place Entrée en service dans les occurrences |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L33) | 18 corrige les écrans 9 10 et 11 |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L34) | 19 rend la marque SCOPE carrée 8x8 sans badge texte |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-final-1-tests.js#L35) | 20 produit le retour obligatoire A à BU |

### scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L16) | 01 conserve les 345 définitions |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L17) | 02 conserve exactement les 622 objets programme |
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L18) | 03 attribue un code à chaque définition dotée d’un Stat.Com |
| [22](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L22) | 04 laisse sans code les 16 définitions sans Stat.Com démontré |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L26) | 05 impose strictement STATCOM.xxx |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L30) | 06 évite toute collision entre définitions |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L34) | 07 produit les compteurs .001 puis .002 |
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L38) | 08 reste stable entre deux constructions |
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L43) | 09 conserve tous les identifiants techniques |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L44) | 10 élimine QV26/QV27 des champs métier définition |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L45) | 11 élimine QV26/QV27 des champs métier programme |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L46) | 12 aligne chaque code programme sur son propre Stat.Com |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L47) | 13 conserve la chaîne technique des 622 objets |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L50) | 14 laisse l’externe sans Stat.Com ni code |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L56) | 15 conserve les 87 Stat.Com PDF |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L57) | 16 distingue exactement les quatre extensions SCOPE |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L61) | 17 conserve les 53 permanences CTA |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L62) | 18 conserve les 11 occurrences EMSEA sans faux code |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L68) | 19 conserve les huit preuves transverses |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L71) | 20 centralise la réconciliation du code dans l’UI |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L75) | 21 sépare Code et Stat.Com au catalogue |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L76) | 22 affiche le libellé métier Code |
| [77](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L77) | 23 supprime Yverdon-les-Bains du référentiel de lieux visible |
| [78](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L78) | 24 compose l’identité écran 2 sur cinq colonnes intentionnelles |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L79) | 25 respecte les proportions MOA de l’écran 3 |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L80) | 26 rend les listes longues explicitement scrollables |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L81) | 27 utilise un multi-public sur le besoin annuel |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L82) | 28 garde Date Début Fin Durée à 36 px et calcule 12 h 30 |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L86) | 29 crée l’événement externe sans code ni Stat.Com |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L90) | 30 conserve actions sobres et états SCOPE |
| [94](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-preprod-moa-ux-code-final-1-tests.js#L94) | 31 produit exactement le rapport A à BL |

### scripts/scope-c19-quo-vadis-27-full-dress-rehearsal-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-quo-vadis-27-full-dress-rehearsal-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-quo-vadis-27-full-dress-rehearsal-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-c19-quo-vadis-27-moa-closure-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c19-quo-vadis-27-moa-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c19-quo-vadis-27-moa-closure-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L38) | mapping creates nineteen explained decisions |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L39) | publication identity ignores label and date |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L44) | publication identity distinguishes operational units |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L48) | Stat.Com.xxx is enforced |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L54) | external activity has no code and is not published |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L59) | run A creates every ready case only |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L60) | run A is read-only by contract |
| [65](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L65) | CTA is one 60-hour multi-day event |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L72) | FOBA is one activity with four linked OI units |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L80) | JSP keeps canonical Stat.Com |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L85) | EMSEA is publishable without Stat.Com |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L91) | multi-session structure is preserved |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L100) | provenance is bidirectional and complete |
| [109](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L109) | run B is fully idempotent |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L110) | run C changes exactly one existing event |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L111) | run C has no extra create |
| [112](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L112) | run D changes exactly the same event back |
| [119](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L119) | A and C snapshots contain no duplicate publication key |
| [123](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L123) | incomplete information is blocked explicitly |
| [128](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L128) | blocking conflict is never best-effort published |
| [133](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L133) | existing attendance protects an update |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L142) | removed source becomes cancellation update |
| [150](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L150) | removed source with operational data is blocked |
| [158](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L158) | duplicate source identity is blocked |
| [163](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L163) | duplicate target identity is blocked |
| [170](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L170) | unknown canonical reference is blocked |
| [177](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L177) | execution blueprint requires one transaction and rollback |
| [184](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L184) | additive SQL contract cannot persist in C20 |
| [193](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L193) | proof covers sections A through AZ |
| [197](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c20-quo-vadis-integration-architecture-1-tests.js#L197) | C19 invariants remain referenced |

### scripts/scope-c21-quo-vadis-publication-execution-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c21-quo-vadis-publication-execution-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L30) | C20 Plan A invariants are preserved |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L31) | Execute A creates ten materializations |
| [32](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L32) | Execute A leaves blocked and not-published decisions unwritten |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L37) | Reconcile A is a strict match |
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L38) | Plan B preserves ten unchanged decisions |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L39) | Execute B is a business no-op |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L44) | Plan C contains one update and no create |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L48) | Execute C updates exactly one materialization |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L49) | Update preserves event identity |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L50) | Update and return preserve canonical business code and identity |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L57) | Reconcile C is a strict match |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L59) | mid-transaction failure is injected |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L60) | rollback restores every business table count |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L61) | rollback leaves no event or provenance orphan |
| [65](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L65) | retry after rollback succeeds once |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L66) | second retry is a no-op |
| [67](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L67) | failed publication audit is marked rolled back |
| [74](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L74) | concurrent executions finish as success plus no-op |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L75) | concurrent final state has one event per key |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L79) | database unique constraint rejects a duplicate key |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L80) | stale plan is rejected |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L81) | stale rejection performs no business write |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L82) | tampered plan fingerprint is rejected |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L84) | provenance is queryable source to event |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L85) | provenance is queryable event to source |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L86) | CTA is one 60-hour event |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L92) | FOBA has one canonical activity and four events |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L99) | FOBA preserves all four OI relations |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L100) | FOBA keeps canonical 070F1.005 |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L101) | JSP keeps its code and public relation |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L105) | EMSEA publishes without invented Stat.Com |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L110) | representative multi-session keeps one activity and six sessions |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L116) | operational data changes the plan to BLOCKED |
| [121](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L121) | protected event is not overwritten |
| [125](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L125) | all listed fields auto-update before operational use |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L126) | all listed fields require review after operational use |
| [127](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L127) | time update preserves code and event identity |
| [133](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L133) | source cancellation updates to ANNULE |
| [137](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L137) | cancellation retains provenance |
| [138](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L138) | removed source is explicit cancellation update |
| [139](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L139) | removed source is not physically deleted |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L140) | manual room change is detected as drift |
| [141](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L141) | reconciliation does not repair drift |
| [143](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L143) | reconciliation reports MISSING before execution |
| [151](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L151) | reconciliation reports missing OI relation as DRIFT |
| [163](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L163) | reconciliation marks drift with operational data as protected |
| [176](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L176) | reconciliation reports unexpected target rows |
| [187](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L187) | audit records actor process year and plan |
| [194](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L194) | audit stores actual execution counts |
| [201](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L201) | audit schema contains no secret field |
| [202](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L202) | GESTIONNAIRE is authorized by executed proofs |
| [203](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L203) | UTILISATEUR is refused publication |
| [204](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L204) | explicit production environment is refused |
| [205](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L205) | plan validator accepts the intact Plan A shape |
| [210](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L210) | fixture enforces foreign keys |
| [211](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L211) | PostgreSQL contract enables RLS and revokes client roles |
| [212](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L212) | C20 and C21 PostgreSQL drafts both end in rollback |
| [213](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L213) | C21 SQL separates activity identity from event identity |
| [220](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L220) | external historical activity remains not published |
| [221](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c21-quo-vadis-publication-execution-1-tests.js#L221) | business codes retain exactly three suffix digits |

### scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L25) | 01 uses PostgreSQL 18 evidence |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L26) | 02 restricts the database to loopback fixture |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L30) | 03 reconciles canonical 635 lifecycle rows |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L34) | 04 keeps all 125 dates sourced |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L35) | 05 records four source conflicts |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L36) | 06 refuses production |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L37) | 07 binds bulk approval to the exact plan |
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L38) | 08 creates exactly 118 events |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L39) | 09 second plan is idempotent |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L40) | 10 C and D update one stable identity |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L44) | 11 rollback is real |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L45) | 12 retry succeeds and next retry is unchanged |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L49) | 13 final reconciliation is strict |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L52) | 14 drift is detected |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L53) | 15 CTA is 53 continuous events |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L54) | 16 Stat.Com is 87 plus four extensions |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L55) | 17 external activities stay uncoded |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L56) | 18 EMSEA Stat.Com is non applicable |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L57) | 19 FOBA retains four OI materializations |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L58) | 20 multi-public is represented |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L59) | 21 canonical multi-session lines remain traceable |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L60) | 22 synthetic multi-session proof rolls back |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L61) | 23 PostgreSQL schema has structured relations |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L66) | 24 PostgreSQL schema enables RLS |
| [67](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L67) | 25 PostgreSQL schema has UUID JSONB timestamps and FKs |
| [70](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L70) | 26 mapping covers every required field and draft remains rollback-only |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L75) | 27 C20 planner remains the only planner |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L76) | 28 C21 executor accepts only named isolated adapters |
| [77](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L77) | 29 executor requires exact bulk approval |
| [78](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L78) | 30 UI has twelve views |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L79) | 31 UI exposes the exact dynamic title convention |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L80) | 32 UI removes excluded places from visible list |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L81) | 33 annual need title is dynamic |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L82) | 34 UI uses one 36px control primitive |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L83) | 35 text actions are never underlined |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L84) | 36 state markers are square 8px |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L85) | 37 ordinary agenda events have no dot |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L86) | 38 special agenda event dots are five pixels |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L87) | 39 programme separates history from 2027 |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L88) | 40 backend evidence suite is green |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L89) | 41 browser recipe covers 48 screen states |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L90) | 42 every equivalent browser control is 36px |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L91) | 43 responsive checks have no global overflow or truncated action |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L92) | 44 workflow context survives screens two to seven |
| [93](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L93) | 45 conflict workflow rechecks opens and returns |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L98) | 46 programme search returns all 53 CTA rows |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L99) | 47 agenda and movement use representative full data |
| [104](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js#L104) | 48 twelve 1500px captures exist |

### scripts/scope-c23-repair-1-production-path-enablement-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-c23-repair-1-production-path-enablement-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-c23-repair-1-production-path-enablement-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cancelled-event-personnel-detail-runtime-repair-11-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cancelled-event-personnel-detail-runtime-repair-11-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cancelled-event-personnel-detail-runtime-repair-11-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cancelled-event-single-source-of-truth-11-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cancelled-event-single-source-of-truth-11-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cancelled-event-single-source-of-truth-11-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-canonical-foundations-c1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-canonical-foundations-c1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-canonical-foundations-c1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-catalog-convergence-c5-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-catalog-convergence-c5-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [32](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L32) | 01 classifier covers A-F with trace fields |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L45) | 02 C and F are never auto-promoted |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L50) | 02b business test is not confused with technical test data |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L55) | 03 aliases are deterministic and idempotent |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L60) | 04 initial catalogue has unique activity identities |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L66) | 05 DPS GEN is a public, not a definition per site |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L71) | 06 DAP GEN is a public, not a definition per site |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L76) | 07 JSP expected public is young JSP only |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L83) | 08 no CADET structure is auto-created |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L88) | 09 DPS-DAP remains one multi-domain activity |
| [93](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L93) | 10 DPS-DAP contributions are multiple and manual |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L99) | 11 FOCO DPS and DAP stay distinguishable |
| [104](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L104) | 12 FOSPEC is data-driven |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L111) | 13 VPC aliases converge on VPC |
| [115](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L115) | 14 AUTO is data-driven |
| [122](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L122) | 15 roles remain separate from qualifications |
| [127](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L127) | 16 annual generation is deterministic |
| [132](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L132) | 17 annual snapshot and fingerprint remain enforced |
| [137](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L137) | 18 multi-session generation preserves one occurrence |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L142) | 19 CATALOG_C4 is explicit in SQL and runtime contracts |
| [147](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L147) | 20 projection carries occurrence and session links |
| [153](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L153) | 21 preserveDecision creates link-only reconciliation |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L160) | 22 HUMAN_DECISION and human date remain unchanged |
| [169](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L169) | 23 second mirror generation creates no duplicate link |
| [175](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L175) | 24 mirror comparison reports structural differences |
| [180](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L180) | 25 C/F disappearance never absorbs or deletes human decisions |
| [185](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L185) | 26 projection retains every domain, public and Stat.Com contribution |
| [190](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L190) | 27 standalone migration and runtime are structurally equivalent |
| [203](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L203) | 28 C5-B contains no operational writes or person assignment |
| [209](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L209) | 29 2027 requirements become READY only with resolved pinned public rules |
| [217](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L217) | 30 explicit canonical identity is fail-closed on contradictory evidence |
| [234](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L234) | 31 SQL guards enforce obligation occurrence and proposal session coherence |
| [254](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-catalog-convergence-c5-b-tests.js#L254) | 32 confirmed aliases preserve every semantic proof field |

### scripts/scope-config-staff-ux-finalization-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-config-staff-ux-finalization-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-config-staff-ux-finalization-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configurable-training-rules-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configurable-training-rules-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configurable-training-rules-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configurable-training-rules-moa-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configurable-training-rules-moa-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configurable-training-rules-moa-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configuration-formation-ux-import-performance-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configuration-formation-ux-import-performance-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configuration-formation-ux-import-performance-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configuration-formation-ux-referentials-finish-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configuration-formation-ux-referentials-finish-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configuration-formation-ux-referentials-finish-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configuration-policy-runtime-performance-root-repair-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configuration-policy-runtime-performance-root-repair-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configuration-policy-runtime-performance-root-repair-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-configuration-referentials-lifecycle-repair-5-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-configuration-referentials-lifecycle-repair-5-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-configuration-referentials-lifecycle-repair-5-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-core-consolidation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-core-consolidation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-core-consolidation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycle-specialisations-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycle-specialisations-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycle-specialisations-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycles-pdf-density-readability-final-7-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycles-pdf-density-readability-final-7-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycles-pdf-density-readability-final-7-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycles-population-pilotage-reporting-repair-7-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycles-population-pilotage-reporting-repair-7-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycles-population-pilotage-reporting-repair-7-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycles-pr-auto-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycles-pr-auto-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycles-pr-auto-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycles-semantic-pdf-professional-finish-7-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycles-semantic-pdf-professional-finish-7-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycles-semantic-pdf-professional-finish-7-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-cycles-semantic-ux-reporting-finish-7-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-cycles-semantic-ux-reporting-finish-7-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-cycles-semantic-ux-reporting-finish-7-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dap-multisession-engine-6-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dap-multisession-engine-6-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dap-multisession-engine-6-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dap-multisession-integrity-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dap-multisession-integrity-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dap-multisession-integrity-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dap-permutation-consolidation-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dap-permutation-consolidation-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dap-permutation-consolidation-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dap-permutation-finalization-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dap-permutation-finalization-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dap-permutation-finalization-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dap-permutation-integrity-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dap-permutation-integrity-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dap-permutation-integrity-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-dash-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-dash-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-dash-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-data-5-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-data-5-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-data-5-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-data-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-data-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-data-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-deleted-event-persistence-root-cause-11-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-deleted-event-persistence-root-cause-11-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-deleted-event-persistence-root-cause-11-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-deleted-event-single-source-of-truth-11-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-deleted-event-single-source-of-truth-11-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-deleted-event-single-source-of-truth-11-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-domaines-rapports-close-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-domaines-rapports-close-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-domaines-rapports-close-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ds-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ds-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ds-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ecawin-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ecawin-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [7](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L7) | seules les associations MOA explicites sont qualifiées |
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L25) | les trois codes restent distincts et les associations absentes ne sont pas inventées |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L37) | la capture conservee est la source exacte du registre |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L44) | une reference suspendue, absente ou expiree ne devient pas exportable |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L55) | le code JSP Y3 historique ne subit plus de conversion automatique |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ecawin-tests.js#L62) | les décisions validées conservent les liens de référentiels pour leur reconduction |

### scripts/scope-event-assigned-population-policy-staffing-close-10-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-assigned-population-policy-staffing-close-10-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-assigned-population-policy-staffing-close-10-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-assigned-population-reactivation-delete-final-10-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-assigned-population-reactivation-delete-final-10-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-assigned-population-reactivation-delete-final-10-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-c3-fix-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-c3-fix-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-c3-fix-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-c4-finish-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-c4-finish-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-c4-finish-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-close-ux-formateur-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-close-ux-formateur-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-close-ux-formateur-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-config-filter-routing-repair-6-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-config-filter-routing-repair-6-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-config-filter-routing-repair-6-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-configuration-binding-migration-6-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-configuration-binding-migration-6-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-configuration-binding-migration-6-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-configuration-binding-ux-repair-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-configuration-binding-ux-repair-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-configuration-binding-ux-repair-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-creation-professional-ux-final-9-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-creation-professional-ux-final-9-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-creation-professional-ux-final-9-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-creation-professional-ux-temporal-repair-9-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-creation-professional-ux-temporal-repair-9-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-creation-professional-ux-temporal-repair-9-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-creation-temporal-professional-close-9-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-creation-temporal-professional-close-9-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-creation-temporal-professional-close-9-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-data-integrity-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-data-integrity-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-data-integrity-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-data-integrity-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-data-integrity-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-data-integrity-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-deletion-cascade-cleanup-11-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-deletion-cascade-cleanup-11-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-deletion-cascade-cleanup-11-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-deletion-kpi-legacy-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-deletion-kpi-legacy-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-deletion-kpi-legacy-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-deletion-residual-ghost-cleanup-11-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-deletion-residual-ghost-cleanup-11-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-deletion-residual-ghost-cleanup-11-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-design-c-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-design-c-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-design-c-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-design-c1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-design-c1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-design-c1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-design-c2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-design-c2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-design-c2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-edit-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-edit-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-edit-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-expected-population-backfill-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-expected-population-backfill-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-expected-population-backfill-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-expected-population-sync-1-fix-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-expected-population-sync-1-fix-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-expected-population-sync-1-fix-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-expected-population-sync-1-fix-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-expected-population-sync-1-fix-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-expected-population-sync-1-fix-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-expected-population-sync-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-expected-population-sync-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-expected-population-sync-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-identity-global-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-identity-global-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L26) | création SCOPE interne avec Stat.Com utilise la séquence canonique |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L35) | création interne sans Stat.Com ne fabrique aucun code |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L42) | événement externe reste sans Stat.Com et sans code |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L52) | suppression ne recycle pas un code SCOPE |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L60) | QUO VADIS réutilise l’allocateur persistant SCOPE |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L66) | import standard conserve le code source sans le présenter comme code événement |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L75) | les libellés opérationnels PR X.n restent précis |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-global-tests.js#L82) | UI emploie Auto seulement quand un Stat.Com permet l’allocation |

### scripts/scope-event-identity-phase2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-identity-phase2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_PUBLICATION_CLONE_CONVERGENCE.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PUBLICATION_CLONE_CONVERGENCE.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L14) | allocation initiale chronologique et séquences Stat.Com indépendantes |
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L25) | code validé gelé et ajout ultérieur en fin de séquence |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L34) | numéro supprimé réservé et jamais réutilisé |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L39) | simultanéité multi-OI reçoit des numéros distincts dans l’ordre SCOPE |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L45) | 070F1.005 peut coexister comme code exercice et code événement |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L57) | égalité stricte sans ordre métier utilise a b c de façon déterministe |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L64) | idempotence et tri naturel |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L73) | PR 1 redevient six occurrences et aucune fausse session |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L82) | PR 2.x est une série de six occurrences sans code événement inventé |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L89) | migration additive garantit persistance unicité et non-réutilisation |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-identity-phase2-tests.js#L98) | publication alloue le code à l’événement et ne l’efface plus à la mise à jour |

### scripts/scope-event-import-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-import-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-import-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-import-configuration-operationalization-8-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-import-configuration-operationalization-8-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-import-configuration-operationalization-8-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-participation-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-participation-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-participation-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-policy-config-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-policy-config-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-policy-config-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-population-time-staffing-workflow-close-10-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-population-time-staffing-workflow-close-10-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-population-time-staffing-workflow-close-10-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-q1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-q1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-q1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-series-semantic-contract-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-series-semantic-contract-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-series-semantic-contract-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-std-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-std-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-std-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-temporal-configuration-foundation-9-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-temporal-configuration-foundation-9-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-temporal-configuration-foundation-9-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-ux-state-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-ux-state-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-ux-state-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-event-workflow-assignment-staffing-semantic-repair-10-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-event-workflow-assignment-staffing-semantic-repair-10-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-event-workflow-assignment-staffing-semantic-repair-10-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-access-data-integrity-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-access-data-integrity-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-access-data-integrity-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-multisession-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-multisession-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-multisession-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-multisession-1-r3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-multisession-1-r3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-multisession-1-r3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-multisession-1-r4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-multisession-1-r4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-multisession-1-r4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-multisession-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-multisession-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-multisession-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-population-temporal-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-population-temporal-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-population-temporal-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-safe-close-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-safe-close-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-safe-close-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-events-safe-close-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-events-safe-close-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-events-safe-close-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-final-product-integration-v1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-final-product-integration-v1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L35) | 01 - le jeu canonique garde les 635 lignes et 622 objets programme |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L41) | 02 - les niveaux 2027 sont explicites et stables |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L47) | 03 - la route Programme et sa fiche sont canoniques |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L56) | 04 - le tableau Programme expose filtres, niveaux et action MOA exacte |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L79) | 05 - les 118 unités publiables de référence restent présentes |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L84) | 06 - l’export personnel est protégé côté serveur et limité aux colonnes utiles |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L90) | 07 - la saisie présente l’action seulement avec les permissions nominatives |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L95) | 08 - le Programme affiche le code attribué plutôt que le mode Auto |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-final-product-integration-v1-tests.js#L102) | 09 - la recherche État-major ignore casse et diacritiques |

### scripts/scope-foba-target-resolution-fix-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-foba-target-resolution-fix-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-foba-target-resolution-fix-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-front-finition-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-front-finition-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-front-finition-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-functional-catalog-c18-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-functional-catalog-c18-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L13) | 1 Exercice JSP converge vers une définition, dix réalisations et trois sites |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L29) | 2 la série Formation groupée 1.1 à 1.6 devient une activité multi-séances liée |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L41) | 3 la série Exercice PR 1.1 à 1.6 devient une activité PR 1 multi-séances liée |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L55) | 4 une activité non récurrente peut être ajoutée comme extraordinaire annuelle |
| [63](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L63) | 5 la modification Catalogue crée une version et retire seulement la version active précédente |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L71) | 6 un override annuel ne modifie pas le profil permanent |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L80) | 7 horaire, durée et complément construisent un libellé final sans thème obligatoire |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L99) | 8 un chevauchement réel de public canonique produit un conflit déterministe |
| [109](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L109) | 9 deux activités du même jour sans chevauchement horaire ne sont pas en conflit |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L117) | 10 C18 ne publie aucun événement ni donnée opérationnelle |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L126) | 11 la convergence SQL est transactionnelle, idempotente et limitée aux groupes démontrés |
| [144](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L144) | 12 des horaires identiques sans public commun ne créent aucun conflit public |
| [152](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L152) | 13 la multi-sélection de publics est structurée, canonisée et sans doublon |
| [159](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L159) | 14 deux sites produisent deux créneaux liés à la même occurrence |
| [169](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L169) | 15 la durée est recalculée exclusivement depuis le début et la fin |
| [175](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L175) | 16 un complément vide ou retiré ne laisse aucun séparateur parasite |
| [182](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L182) | 17 l’UI et le service persistent les références structurées puis les relisent |
| [194](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c18-tests.js#L194) | 18 PR 1.1 à 1.6 est une seule définition active et six sessions générées |

### scripts/scope-functional-catalog-c19-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-functional-catalog-c19-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md); [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [7](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L7) | C19 libellé canonique occurrence/session/complément |
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L14) | C19 publics/sites structurés et durée calculée |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L24) | C19 règles calendaires distinguent jours interdits et statuts multiples |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L35) | C19 date imposée ne bloque pas la journée lorsque les compatibilités sont réelles |
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L43) | C19 exclusivité journée est une règle distincte de date imposée |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L53) | C19 conflits publics et rôles sont expliqués, avec priorité métier |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L66) | C19 permutation explicite peut rendre PR compatible malgré public partagé |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L76) | C19 propositions automatiques sont limitées à trois et évitent les conflits |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-tests.js#L86) | C19 validation visible QUO VADIS reste distincte des écritures opérationnelles |

### scripts/scope-functional-catalog-c19-ux-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-functional-catalog-c19-ux-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L36) | twelve recipe screens remain wired |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L40) | canonical Stat.Com and stable allocator are preserved |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L45) | canonical domain, AUTO, PR and FOSPEC order is explicit |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L50) | catalogue search covers visible business fields and combines with target |
| [60](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L60) | catalogue filtering preserves focus by updating rows without rendering |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L68) | draft activity has an initialized business code and no null heading |
| [74](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L74) | known event reuses public references and persists zero one or many selections |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L81) | target CRUD is complete, protected and propagated |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L86) | public CRUD is complete and protected |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L90) | duplicate, empty and generated-code collisions are rejected |
| [94](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L94) | definition preview reacts to occurrences, sessions and numbering |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L100) | occurrence and session cardinalities are exact |
| [107](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L107) | four by six stays ordered by occurrence then session |
| [118](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L118) | numbering disabled never exposes a session suffix |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L126) | definition preview exposes public and room while preserving generated total |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L131) | occurrence inheritance uses independent copies |
| [139](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L139) | forms 2 to 5 use aligned stable controls |
| [144](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L144) | sites and rooms remain represented |
| [148](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L148) | activity table has compact date, Stat.Com, state and action |
| [155](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L155) | annual agenda exposes four categories and continuous vacations |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L160) | agenda colors typography and legend order match final MOA values |
| [165](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L165) | activity columns sort both ways with a red direction arrow |
| [170](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L170) | agenda year navigation derives from activities and opens the exact event |
| [174](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L174) | agenda detail is rich and uses explicit absent values |
| [179](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L179) | movement selection, drop target and last-row binding are present |
| [188](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L188) | activity table transfers the selected activity to movement screen |
| [194](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L194) | move endpoint delegates to the canonical engine |
| [198](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L198) | first, middle and last movable rows can move |
| [205](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L205) | fixed and externally locked rows are rejected by the API |
| [210](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L210) | priority movement requires explicit confirmation |
| [216](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L216) | conflicting movement is rejected by the same engine |
| [221](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L221) | day reservation follows SDIS, local unit and external target scope |
| [232](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L232) | conflict analysis names both events without duplicate status labels |
| [242](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L242) | conflict analysis and move result cannot share stale state |
| [250](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L250) | drag and drop binds nested row content and supports both directions |
| [262](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L262) | different DPS intervention units coexist even with generic public codes |
| [275](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L275) | DAP Y1 to Y4 use the same full-unit isolation rule |
| [285](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L285) | a full DPS exercise blocks another full exercise of the same unit |
| [291](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L291) | JSP exercise conflicts with DPS exercise of the same unit only |
| [299](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L299) | PR and DPS exercise overlap is avoidable with explicit confirmation |
| [310](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L310) | grouped DPS training and PR remain attention unless a resource is shared |
| [321](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L321) | SDIS-wide coverage is blocking and messages stay in business language |
| [331](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L331) | three non-compatible severities are part of the canonical contract |
| [336](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L336) | calendar restrictions are enforced by movement engine |
| [342](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L342) | screen 2 exposes explicit add remove multipublic controls and deduplicates requirements |
| [351](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L351) | known event external target clears internal publics and editable references remain structured |
| [357](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L357) | annual agenda uses a dimension-neutral light fill and conditional square activity dot without count |
| [366](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L366) | two priority activities can be moved by an explicit audited derogation |
| [380](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L380) | Etat-major conflicts only when the destination shares a real indispensable role |
| [395](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L395) | dragend never commits a stale previously hovered destination |
| [402](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L402) | screen 12 names constraint level and business context before derogation |
| [408](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L408) | proposal count is capped at three |
| [413](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L413) | preview remains local and performs no production write |
| [419](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L419) | controls keep restrained square geometry |
| [425](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L425) | saved definition becomes the annual and slot source of truth |
| [433](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L433) | FOBA annual need builds four complete independent planning sessions |
| [443](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L443) | administered weekday rules are the placement engine input |
| [457](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L457) | choosing a proposal creates one canonical programmed activity used by screens 10 to 12 |
| [463](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L463) | screen 9 delegates canonical activities to the same move endpoint as screen 12 |
| [471](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L471) | screen 9 and screen 12 preserve the same canonical level and causes |
| [485](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L485) | PR permutation covers target and public only, never indispensable constraints |
| [499](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L499) | diagnostic recipe exercises all four user-facing levels from real engine results |
| [507](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L507) | autonomous announced dates have a stable non-operational model and full CRUD |
| [519](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L519) | screen 4 administers announced dates without creating screen 10 or 12 rows |
| [528](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L528) | agenda distinguishes announced-only and announced-plus-activity days |
| [535](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L535) | programming links an announcement trace without duplicating the activity |
| [542](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-functional-catalog-c19-ux-tests.js#L542) | announced dates never enter proposal or conflict engine inputs |

### scripts/scope-g1-final-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-g1-final-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-g1-final-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-generic-event-session-policy-architecture-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-generic-event-session-policy-architecture-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-generic-event-session-policy-architecture-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-generic-event-sessions-policy-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-generic-event-sessions-policy-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-generic-event-sessions-policy-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-generic-exercise-sessions-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-generic-exercise-sessions-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-generic-exercise-sessions-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-generic-pr-historical-series-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-generic-pr-historical-series-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-generic-pr-historical-series-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-graph-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-graph-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-graph-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-impl-1a-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-impl-1a-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-impl-1a-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-impl-1b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-impl-1b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-impl-1b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-import-prabc-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-import-prabc-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-import-prabc-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-json-transport-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-json-transport-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L9) | lossless gzip for ${accepted} |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L17) | proxy forwarded encoding does not disable gzip: ${accepted} |
| [23](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L23) | leaves ${name} untouched |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L26) | compresses create and update payloads, preserving unicode and all identifiers |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L31) | does not duplicate Vary and handles lower-case headers |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L36) | oversized JSON is compressed despite proxy-forwarded identity header |
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L43) | business qualification refusals are returned unchanged |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-json-transport-tests.js#L47) | an incompressible oversized payload produces a small explicit error |

### scripts/scope-jsp-excuse-motifs-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-jsp-excuse-motifs-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-jsp-excuse-motifs-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-jsp-reporting-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-jsp-reporting-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-jsp-reporting-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-login-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-login-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-login-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-login-visual-alignment-orion-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-login-visual-alignment-orion-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-login-visual-alignment-orion-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md); [docs/SCOPE_C19_PREPROD_GATE_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_2.md); [docs/SCOPE_C19_PREPROD_GATE_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_3.md); [docs/SCOPE_C19_PREPROD_MOA_FINAL_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_MOA_FINAL_1.md); [docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1.md); [docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.md); [docs/SCOPE_C19_QUO_VADIS_27_MOA_CLOSURE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_QUO_VADIS_27_MOA_CLOSURE_1.md); [docs/SCOPE_C20_QUO_VADIS_INTEGRATION_ARCHITECTURE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C20_QUO_VADIS_INTEGRATION_ARCHITECTURE_1.md); [docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1.md); [docs/SCOPE_QV_2027_CONDUITE_FILTRES_PROGRAMME_CORRECTION_FINALE.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CONDUITE_FILTRES_PROGRAMME_CORRECTION_FINALE.md); [docs/SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md); [docs/SCOPE_QV_2027_RESOLUTION_NO_GO_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_RESOLUTION_NO_GO_FINAL.md); [docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-metier-activation-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-metier-activation-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-metier-activation-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-metier-foundation-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-metier-foundation-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-metier-foundation-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-metier-recovery-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-metier-recovery-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-metier-recovery-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-moa-ux-r1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-moa-ux-r1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-moa-ux-r1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-moa-ux-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-moa-ux-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-moa-ux-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-moa-ux-r2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-moa-ux-r2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-moa-ux-r2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-model-2-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-model-2-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-model-2-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-model-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-model-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-model-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-core-7-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-core-7-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-core-7-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-parity-8-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-parity-8-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-parity-8-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-r2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-r2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-r2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-r3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-r3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-r3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-r4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-r4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-r4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-r5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-r5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-r5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-report-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-report-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-report-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-session-integrity-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-session-integrity-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-session-integrity-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-ux-contract-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-ux-contract-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-ux-contract-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-v2-close-reopen-report-ux-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-v2-close-reopen-report-ux-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-v2-close-reopen-report-ux-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-v2-finalization-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-v2-finalization-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-v2-finalization-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-v2-foundation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-v2-foundation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-v2-foundation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-v2-moa-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-v2-moa-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-v2-moa-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-multisession-v2-report-access-finish-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-multisession-v2-report-access-finish-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-multisession-v2-report-access-finish-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-nav-convergence-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-nav-convergence-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-nav-convergence-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-objectifs-participation-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-objectifs-participation-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-objectifs-participation-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-objectifs-participation-1-r2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-objectifs-participation-1-r2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-objectifs-participation-1-r2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-objectifs-participation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-objectifs-participation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-objectifs-participation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-objectives-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-objectives-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-objectives-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-encadrement-metier-fix-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-encadrement-metier-fix-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-encadrement-metier-fix-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-encadrement-persistence-forensic-fix-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-encadrement-persistence-forensic-fix-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-encadrement-persistence-forensic-fix-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-encadrement-recipe-fix-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-papr-encadrement-recipe-fix-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-encadrement-recipe-fix-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-encadrement-state-fix-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-encadrement-state-fix-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-encadrement-state-fix-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-exercise-group-recipe-fix-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-papr-exercise-group-recipe-fix-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-exercise-group-recipe-fix-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-formateur-serie-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-formateur-serie-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-formateur-serie-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-participation-origin-ux-fix-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-participation-origin-ux-fix-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-participation-origin-ux-fix-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-papr-session-roles-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-papr-session-roles-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-papr-session-roles-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-participant-selection-runtime-root-repair-10-3-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-participant-selection-runtime-root-repair-10-3-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-participant-selection-runtime-root-repair-10-3-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-participation-policy-engine-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-participation-policy-engine-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-participation-policy-engine-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-permutation-recovery-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-permutation-recovery-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-permutation-recovery-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-permutation-ux-professionalization-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-permutation-ux-professionalization-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-permutation-ux-professionalization-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-person-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-person-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-person-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-person-qualifications-c3-b-real-parity-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-person-qualifications-c3-b-real-parity-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-person-qualifications-c3-b-real-parity-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-person-qualifications-c3-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-person-qualifications-c3-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-person-qualifications-c3-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-affectations-events-sync-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-affectations-events-sync-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-affectations-events-sync-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-analytics-integrity-audit-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-analytics-integrity-audit-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-analytics-integrity-audit-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-a-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-a-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-a-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-a1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-a1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-a1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-a2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-a2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-a2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b3-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b3-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b3-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b3-r2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b3-r2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b3-r2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b4-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b4-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b4-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-design-b4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-design-b4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-design-b4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-donut-activity-semantics-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-donut-activity-semantics-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-donut-activity-semantics-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-edit-import-papr-serie-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-edit-import-papr-serie-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-edit-import-papr-serie-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-encadrement-activity-kpi-semantics-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-encadrement-activity-kpi-semantics-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-encadrement-activity-kpi-semantics-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-encadrement-realized-history-generic-repair-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-encadrement-realized-history-generic-repair-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-encadrement-realized-history-generic-repair-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-formateur-history-vs-stats-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-formateur-history-vs-stats-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-formateur-history-vs-stats-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-history-session-contribution-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-history-session-contribution-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-history-session-contribution-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-participation-chart-color-semantics-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-participation-chart-color-semantics-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-participation-chart-color-semantics-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-planned-role-history-state-repair-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-planned-role-history-state-repair-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-planned-role-history-state-repair-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-pr-individual-analytics-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-pr-individual-analytics-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-pr-individual-analytics-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-status-ux-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-status-ux-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-status-ux-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-sync-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-sync-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-sync-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-personnel-sync-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-personnel-sync-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-personnel-sync-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pilotage-consolidation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pilotage-consolidation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pilotage-consolidation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pilotage-operationnel-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pilotage-operationnel-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pilotage-operationnel-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pr-abc-multisession-close-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pr-abc-multisession-close-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pr-abc-multisession-close-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pr-abc-multisession-close-root-cause-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pr-abc-multisession-close-root-cause-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pr-abc-multisession-close-root-cause-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pr-multisession-recovery-1-r1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pr-multisession-recovery-1-r1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pr-multisession-recovery-1-r1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pr-multisession-recovery-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pr-multisession-recovery-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pr-multisession-recovery-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-pr-role-report-integrity-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-pr-role-report-integrity-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-pr-role-report-integrity-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-prabc-jsp-presence-r2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-prabc-jsp-presence-r2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-prabc-jsp-presence-r2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-presence-standard-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-presence-standard-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-presence-standard-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-prod-local-auth-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-prod-local-auth-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-prod-local-auth-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_AUTH_RELEASE_GATE_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_AUTH_RELEASE_GATE_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-public-engine-c2-b-real-parity-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-public-engine-c2-b-real-parity-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-public-engine-c2-b-real-parity-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_PUBLIC_ENGINE_MIRROR_C2_B.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_PUBLIC_ENGINE_MIRROR_C2_B.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-public-engine-c2-b-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-public-engine-c2-b-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-public-engine-c2-b-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qual-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qual-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qual-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qual-finish-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qual-finish-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qual-finish-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-phase-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-phase-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-phase-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-redesign-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-redesign-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-redesign-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-ux-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-ux-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-ux-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-ux-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-ux-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-ux-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-ux-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-ux-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-ux-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-ux-final-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-ux-final-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-ux-final-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-a-arbitrer-ux-final-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-a-arbitrer-ux-final-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-a-arbitrer-ux-final-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-annuel-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-annuel-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-annuel-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-ui-ruleset-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-ui-ruleset-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-ui-ruleset-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-ux-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-ux-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-ux-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-agenda-ux-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-agenda-ux-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-agenda-ux-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-calendar-reference-complete-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-calendar-reference-complete-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-calendar-reference-complete-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-calendar-vd-final-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-calendar-vd-final-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-calendar-vd-final-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-calendar-vd-final-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-calendar-vd-final-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-calendar-vd-final-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-core-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-core-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-core-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-coverage-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-coverage-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-coverage-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-final-ux-referential-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-final-ux-referential-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-final-ux-referential-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-moa-consolidation-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-moa-consolidation-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-moa-consolidation-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-moa-recovery-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-moa-recovery-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-moa-recovery-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-pilot-tabs-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-pilot-tabs-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-pilot-tabs-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-pilotage-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-pilotage-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-pilotage-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-professional-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-professional-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-professional-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-referential-management-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-referential-management-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-referential-management-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-synthese-grid-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-synthese-grid-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-synthese-grid-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-synthese-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-synthese-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-synthese-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-toutes-activites-ui-ruleset-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-toutes-activites-ui-ruleset-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-toutes-activites-ui-ruleset-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-toutes-activites-ux-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-toutes-activites-ux-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-toutes-activites-ux-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-toutes-activites-ux-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-toutes-activites-ux-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-toutes-activites-ux-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-toutes-activites-ux-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-toutes-activites-ux-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-toutes-activites-ux-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-quo-vadis-toutes-activites-ux-4-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-quo-vadis-toutes-activites-ux-4-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-quo-vadis-toutes-activites-ux-4-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-correction-calendrier-finale-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-correction-calendrier-finale-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-correction-calendrier-finale-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-correction-ciblee-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-correction-ciblee-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-correction-ciblee-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-gate-consolidation-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-gate-consolidation-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-gate-consolidation-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-moa-recette-correctif-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-moa-recette-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L57) | QV-DPS-006 : saison dérivée de 2026, du premier samedi de février au 06.12 |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L68) | QV-DPS-006 : aucune instruction en janvier 2027 ni après Noël |
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L79) | KICK-OFF : séquence annuelle complète sur les quatre sites, démarrage 06.02.2027 |
| [94](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L94) | section et demi-section jamais converties, publics cohérents |
| [104](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L104) | PIONNIER non régressé : G1, FOBA 2, 4 h, CSU-nvb 19:15–22:00 |
| [114](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L114) | §2.6 Formation permanents : 7 occurrences datées de jour, CSU-nvb conservée |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L131) | §2.7 Journée des familles : uniquement les OI qui l’organisent réellement |
| [148](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L148) | §2.8 Noël des familles : trois OI historiques, aucune duplication |
| [157](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L157) | §2.9 QV-PERIOD-001 : aucune Revue quinquennale en 2027, prochaine échéance 2031 |
| [173](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L173) | §3 QV-PRABC-003 : exactement 3 séances, T2 soir, T2 mercredi matin, T4 |
| [189](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L189) | §3 PR-ABC : public PABC sans JSP, responsable Chef PR |
| [203](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L203) | §3 PR-ABC : un OI fixé par décision humaine reste protégé |
| [212](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L212) | §4.1 QV-DAP-001 : conduite DAP rétablie, distincte des conduites DPS |
| [234](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L234) | §4.3 exercices DAP : quatre réalisations par section, dernière vendredi/samedi |
| [252](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L252) | §4.4 cours de cadres exercice DAP : 4 cours, un par section, 16 réalisations distinctes |
| [265](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L265) | §4.5 Vision locale DAP, Séance cadres, Reconnaissance DAP : réalisations propres |
| [277](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L277) | §5 CMDT : le schéma 2026 est reconstitué, aucun Codir perdu |
| [293](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L293) | §5 CMDT : chaque Codir reste adossé à la période d’une séance État-major |
| [306](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L306) | §6 JSP : volumes cohérents avec 2026, aucun doublon technique |
| [324](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L324) | §6 JSP : responsables métier conservés, pas de bascule générale vers À affecter |
| [335](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L335) | §7 FOBA : règles acquises préservées |
| [346](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L346) | §10 cas A : une ligne 2026 multi-OI reste un événement unique |
| [355](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L355) | §10 cas B : K réalisations 2026 distinctes restent K occurrences propres |
| [366](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L366) | §10 aucune déduplication textuelle : rien n’est retiré par QV-PROJ-001 |
| [377](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L377) | doublons techniques : cinq lignes FOCA en excès dans cette projection historique |
| [397](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L397) | §8 QV-UI-005 : FOCO reste une famille, distincte des domaines F0-F8 |
| [406](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L406) | §8 QV-UI-005 : FOCO ne se deduit plus du domaine DPS, DAP ou JSP |
| [419](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L419) | §9 QV-UI-006 : agenda 2026 exploitable sans mois dans l’URL |
| [432](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L432) | §11 codes métier : aucun identifiant technique exposé comme code |
| [442](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L442) | §12 CTA : permanences et cycles inchangés par ce correctif |
| [454](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L454) | §13 décisions humaines préservées et occurrences verrouillées intactes |
| [469](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L469) | §13 idempotence : second passage sans changement supplémentaire |
| [483](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L483) | réconciliation 829 et source 2027 intacte à 622 |
| [500](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-moa-recette-correctif-1-tests.js#L500) | catalogue de règles : identifiants du correctif actifs et traçables |

### scripts/scope-qv-2027-no-go-final-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-no-go-final-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-no-go-final-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_RESOLUTION_NO_GO_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_RESOLUTION_NO_GO_FINAL.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-post-recette-a-j-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-post-recette-a-j-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L36) | 1 KICK-OFF: 42 réalisations, 15 dates, 4 sites |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L42) | 2 PIONNIER/ABC et instructions: aucune date/public dupliqué |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L50) | 3 DAP: quatre exercices par section, cours de cadres antérieurs |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L64) | 4 DAP: identifiants du cinquième préservés et décision protégée |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L73) | 5 AUTO DPS: deux séances par demi-section et une heure maintenue |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L81) | 6 conduite DAP: 4 soirées par section, cond VL et 4 créneaux |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L95) | 7 JSP: activités particulières préservées |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L99) | 8 FOBA: 10 FOBA 1/2, 3 FOBA 3, thèmes et codes distincts |
| [108](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L108) | 9 FOCO: aucune attribution depuis DPS, DAP ou JSP |
| [113](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L113) | 10 OFSI: quatre séances et autres FOSPEC préservés |
| [119](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L119) | 11 PR: six PR 1.x datés, puis séries 2–4 et thèmes |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L131) | 12 CMDT: EM/CODIR présents, positionnement comparé à 2026 |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L140) | 13 CTA: 54 permanences, dont Ascension isolée, et rotations intactes |
| [151](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L151) | 14 codes métier et Stat.Com: correction sourcée par occurrence et OI |
| [168](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L168) | 15 décisions et assignations: aucun déplacement des lignes protégées |
| [181](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L181) | 16 interface: thèmes, créneaux et cible recalculée visibles |
| [199](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L199) | 17 préparation humaine DAP 5 conservée malgré la non-reconduction automatique |
| [209](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L209) | 18 fiche DAP 5 déjà préparée reste enregistrable, nouvelle cinquième séance refusée |
| [219](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L219) | 19 règle DAP annuelle ne permet pas de créer une cinquième séance ex nihilo |
| [231](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-post-recette-a-j-tests.js#L231) | 20 thèmes FOBA multiples enregistrés sur une occurrence sans changer l’activité |

### scripts/scope-qv-2027-preparation-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-2027-preparation-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [12](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L12) | preparation keeps canonical status and only links a room at its proven site |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L30) | automatic preparation is visible without overriding status, including late CTA row |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L50) | human decision overrides an earlier automatic snapshot |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L64) | CTA reconciliation preserves published site assignment and non-provided fields |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L86) | reconciliation retains prior defaults but permits explicit public addition |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L102) | eight explicit transversal courses need no OI and G1 location does not become an OI |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L117) | an explicit OI remains subject to referential validation |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone-tests.js#L131) | technical public codes retain the existing business labels |

### scripts/scope-qv-2027-preparation-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-2027-preparation-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-preparation-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-publication-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-2027-publication-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-publication-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [8](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-publication-clone-tests.js#L8) | C23 current candidate: clone publication dry-run retains the wider reconciliation proofs |
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-publication-clone-tests.js#L25) | C23 clone: Rapport annuel updates the same event and rolls back without collateral changes |

### scripts/scope-qv-2027-publication-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-2027-publication-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-publication-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-sql-materialisation-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-sql-materialisation-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-sql-materialisation-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_SQL_MATERIALISATION_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_SQL_MATERIALISATION_REPAIR_1.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-2027-sql-recette-readonly-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-2027-sql-recette-readonly-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-2027-sql-recette-readonly-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_PUBLICATION_CLONE_CONVERGENCE.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PUBLICATION_CLONE_CONVERGENCE.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-agenda-programme-ux-final-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-agenda-programme-ux-final-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L16) | CTA ancrage 13 fevrier 2026 puis cycle perpetuel canonique |
| [21](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L21) | janvier fevrier decembre 2028 et continuite decembre 2027 |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L33) | 850 seances datees, 636 historiques et TP9000 preserves |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L49) | grilles calculees 12 mois par an sans reste sans periode |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L56) | navigation annee isolee et references hors Programme |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L72) | meme route RBAC gestionnaire: lieu canonique puis Autre lieu |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L82) | profil sans references:manage bloque avant persistance |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L88) | calcul 2028 protege et conserve le programme en preparation |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-agenda-programme-ux-final-1-tests.js#L100) | persistance locale relue par une nouvelle instance du vrai service |

### scripts/scope-qv-annual-report-clone-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-annual-report-clone-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-clone-proof.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-annual-report-targeted-release-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-annual-report-targeted-release-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js#L14) | Rapport annuel defaults to dry-run with an explicit target |
| [23](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js#L23) | Rapport annuel refuses an unexpected production target |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js#L30) | Rapport annuel apply requires exact event and dates |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js#L37) | Rapport annuel production apply has a separate gate |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-annual-report-targeted-release-tests.js#L50) | Rapport annuel refuses an unapproved publication plan before update |

### scripts/scope-qv-business-consolidation-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-business-consolidation-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L18) | aucune permanence avant le 13.02.2026, y compris projection erronée existante |
| [25](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L25) | premier intervalle et groupes exactement MOA |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L30) | fenêtres couvrantes avec fériés isolés, aucun redémarrage annuel |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L52) | activité, Stat.Com et OI atomiques persistés |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L57) | provenance distingue modifications et simples confirmations |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L64) | salle canonique et lieu canonique persistés |
| [67](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L67) | etat propose persiste et transitions incompatibles refusees |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L76) | prévisualisation 2028 répétable sans écriture |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L87) | autres occurrences indépendantes inchangées |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L91) | Stat.Com inconnu rejeté et absence légitime acceptée |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L96) | salle incompatible rejetée, absence de salle acceptée |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L101) | alias caserne résolu par le vrai lieu UUID |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L105) | DPS:${site} et JSP:${site} distincts sans perte |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L110) | anciennes valeurs qualifiées selon contexte, ambiguës conservées |
| [122](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L122) | validation métier accepte G1 explicite et refuse un OI inconnu |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L126) | Candidats machiniste EA atomique distinct de Machiniste EA |
| [132](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L132) | recalcul de N conserve les corrections validées et les occurrences indépendantes |
| [138](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L138) | rechargement depuis une nouvelle instance du vrai service |
| [150](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L150) | API annuelle conserve les prolongations CTA à la frontière de janvier suivant |
| [155](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L155) | N+1 reprend dernière version validée libellé, Stat.Com, OI, public, responsable, lieu, salle |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L160) | date, workflow, validation annuelle, présences non copiés |
| [167](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L167) | filiation précise et structure de session conservées sans multiplication |
| [173](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L173) | brouillon N ultérieur non validé ne remplace pas snapshot validé |
| [178](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L178) | correction humaine N+1 validée survit au recalcul, puis N+2 la reprend |
| [187](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L187) | annulation annuelle ne détruit ni corrections ni validation |
| [193](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L193) | absence de validation récente: plus ancienne version validée propre à la lignée |
| [199](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L199) | lignées indépendantes jamais fusionnées par libellé identique |
| [202](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L202) | désactivation production empêche la future reconduction |
| [206](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L206) | désactivation N+1 non validée bloque la reprise de la validation N en N+2 |
| [222](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L222) | checkbox groupées aux valeurs internes uniques, libellés courts |
| [228](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L228) | filtres Programme conservés pendant le rendu, contexte appliqué seulement à la navigation |
| [236](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L236) | recherche par libellé du nouveau public et par OI qualifié |
| [246](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L246) | enrichissement explicite, sans substitution code cours/Stat.Com, sans règle TP9 rétroactive |
| [254](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L254) | cibles SCOPE démontrent OI/public, et succession Stat.Com datée réutilisée |
| [263](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L263) | enrichissement historique identique après nouvelle instance sans mutation de la source |
| [274](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L274) | paramètres SQL des modifications entièrement typables, verrou commun au recalcul |
| [281](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-consolidation-tests.js#L281) | sauvegarde et génération n’écrivent aucun événement ou présence |

### scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md); [docs/scope-qv-business-rules-canonicalization-and-final-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-rules-canonicalization-and-final-closure-1-report.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L43) | QV-CTA-003 : G1 a exactement 10 demi-sections opérationnelles |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L50) | QV-CTA-004 : C1/B1/B2 ont exactement 6 demi-sections opérationnelles chacun |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L59) | QV-CTA-001 : le cycle CTA est perpétuel et unique |
| [69](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L69) | QV-CONDUITE-002 : cible annuelle 56, deux par demi-section |
| [77](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L77) | QV-CONDUITE-001 / QV-CONDUITE-003 : chaque conduite a une Instr demi-sct source |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L87) | QV-CONDUITE-005 : public = demi-section, cond PL, cond VL |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L95) | QV-CONDUITE-004 : durée maximale 1 h |
| [103](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L103) | QV-CONDUITE-006 : aucune conduite après PIONNIER |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L111) | QV-CONDUITE-007 : deux familles historiques et deuxième passage idempotent |
| [128](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L128) | QV-CONDUITE-008 abandonnée : 0 instruction artificielle, 56 conduites sourcées |
| [137](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L137) | QV-DPS-001 : aucune fusion C1/B1/B2 sur VARIA et FEU |
| [144](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L144) | QV-DPS-002 : B2 conserve OI B2, Stat.Com B2, lieu Caserne C1 |
| [155](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L155) | QV-DPS-003 : aucune Instr sct/demi-sct concernée n’a Responsable = À affecter |
| [172](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L172) | QV-PIONNIER-001/002/003 : FOBA 2, 4 h, 19:15–22:00, pas de régression |
| [187](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L187) | QV-PRABC-003 : 3 séances PR-ABC datées depuis 2026, public PABC, Chef PR |
| [203](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L203) | QV-UI-001 : État = carré 8×8 + texte, sans badge |
| [209](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L209) | QV-UI-002 : actions textuelles non soulignées |
| [213](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L213) | aucune réserve utilisée, aucun doublon de conduite, source 2027 intacte |
| [224](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js#L224) | le référentiel canonique documente les identifiants de règles |

### scripts/scope-qv-catalogue-canonical-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-catalogue-canonical-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [11](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L11) | unknown durable fields stay unqualified |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L17) | approved annual report rule is durable and has no annual date |
| [27](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L27) | planning modes, business domains and hours reject inventions and invalid ranges |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L36) | Catalogue fiche offers canonical editing and distinguishes annual data |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L52) | qualified Catalogue rows prefer versioned publics and do not invent a period |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-catalogue-canonical-tests.js#L62) | chief and deputy public is explicit and fails closed without dated function facts |

### scripts/scope-qv-complement-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-complement-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-browser.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté, modes détaillés dans preuve |
| Preuve | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) ; [docs/captures/qv-complement/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-complement-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-complement-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-clone.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté, modes détaillés dans preuve |
| Preuve | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) ; [docs/captures/qv-complement/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-complement-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-complement-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-complement-tests.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté, modes détaillés dans preuve |
| Preuve | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) ; [docs/captures/qv-complement/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-complement/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-conduites-canonical-closure-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-conduites-canonical-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L43) | référentiel CTA : G1=10 C1=B1=B2=6, cible conduite calculée 56 |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L50) | 56 conduites matérialisées, 0 insuffisance, 0 instruction CTA ajoutée |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L57) | exactement 2 conduites par demi-section opérationnelle, 0 réserve |
| [66](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L66) | aucune conduite orpheline ; OI et Nxx identiques à la source ; immédiat après ; 1 h |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L75) | public = Nxx, cond PL, cond VL pour les 56 |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L83) | séparation C1/B1/B2 et lieux / Stat.Com |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L98) | VARIA/FEU demi-sct et sct : Chef section DPS |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L102) | instructions programmées : samedi CTA, pas PIONNIER, pas de date inventée hors cycle |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L116) | KICK-OFF 06.02 et PIONNIER non régressés |
| [127](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L127) | CTA interannuel inchangé (moteur unique) |
| [135](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L135) | réconciliation overlay 829 |
| [153](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L153) | catalogue annuel versionné, QV-CONDUITE-008 désactivée |
| [159](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-conduites-canonical-closure-1-tests.js#L159) | contrôle chiffré : tous les compteurs métier à 0 hors totaux |

### scripts/scope-qv-consolidated-browser-recipe.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-consolidated-browser-recipe.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-consolidated-browser-recipe.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-cursus-structural-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-cursus-structural-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-cursus-structural-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-cursus-structural-tests.js#L28) | the direct 2026 workbook is the exact historical evidence used for cursus |
| [51](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-cursus-structural-tests.js#L51) | only proven 2027 modules get Cursus type; JSP projections are superseded, not deleted |
| [111](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-cursus-structural-tests.js#L111) | a later human decision or publication keeps a projected module visible |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-cursus-structural-tests.js#L126) | local clone: ordered referential, five links and protected counts |

### scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-dps-oi-separation-and-conduite-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-dps-oi-separation-and-conduite-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [79](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L79) | VARIA demi-sct : une réalisation par OI, sans tableau OI fusionné |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L83) | VARIA sct : B2 conserve deux tours historiques démontrés, sans invention du troisième |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L87) | FEU demi-sct : C1, B1 et B2 distincts, B2 à la Caserne C1 |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L91) | FEU sct : B2 conserve deux tours historiques démontrés |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L95) | ABC G1 reste une rotation datée sans fusion ni date unique |
| [107](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L107) | PIONNIER ne régresse pas : G1, Caserne G1, FOBA 2, 4 h, 19:15-22:00 |
| [134](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L134) | KICK-OFF du 06.02.2027 reste inchangé |
| [150](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L150) | cible 56 conduites, chacune rattachée à une demi-section source |
| [180](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L180) | PR-ABC : 3 séances datées depuis 2026, une seule ligne par séance |
| [197](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L197) | colonne État : carré canonique 8×8, inline-flex, sans badge ni capsule |
| [213](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L213) | filtres au retour de fiche et DnD CTA inchangés |
| [218](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js#L218) | le fichier source 2027 reste à 622 séances |

### scripts/scope-qv-familles-filtres-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-familles-filtres-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-familles-filtres-browser.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) ; [docs/captures/qv-familles-filtres/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-familles-filtres/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-familles-filtres-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-familles-filtres-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-familles-filtres-tests.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) ; [docs/captures/qv-familles-filtres/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-familles-filtres/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-final-development-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-final-development-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-final-development-1-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-final-development-1-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L50) | conduite derivee uniquement depuis une instruction demi-section datee et jamais apres PIONNIER |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L62) | conduite enchainee sur la fin de son instruction source et limitee a une heure |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L75) | conduite B2 suit le lieu operationnel de son instruction source sans deplacement arbitraire vers B2 |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L87) | apres correction de la rotation, deux conduites sont materialisees par demi-section |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L101) | derivation conduite idempotente |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L110) | les quatre KICK-OFF du 06.02.2027 recoivent le public de la permanence CTA |
| [120](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L120) | le moteur CTA existant est reutilise, sans second moteur de rotation |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L126) | un public deja explicite n est jamais ecrase par la derivation |
| [137](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L137) | multi-OI et dates non demontrees restent a arbitrer sans repartition inventee |
| [160](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L160) | la rotation dissipe la reference historique partagee au lieu de la laisser ambiguë |
| [173](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L173) | Introduction PIONNIER vise FOBA 2 et non FOBA 3 |
| [183](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L183) | PIONNIER CSU-nvb reste 19:15-22:00 sur G1, demi-section sur 4 heures, lieu Caserne G1 |
| [200](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L200) | les dix demi-sections PIONNIER couvrent dix dates et dix demi-sections distinctes |
| [208](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L208) | regles PIONNIER idempotentes |
| [214](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L214) | salles principales alphabetiques et sous-salles indentees sous leur salle principale |
| [230](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L230) | la salle reste un choix unique sans selection automatique de la salle principale |
| [243](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L243) | toute ligne datee est une cible de depot, pas seulement la barre de date |
| [252](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L252) | deposer sur sa propre date ne declenche aucun deplacement |
| [258](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L258) | la selection de texte ne bloque plus le demarrage du glisser |
| [264](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L264) | les permanences CTA restent non deplaçables dans l interface et dans la logique |
| [273](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L273) | le deplacement renvoie la charge utile complete sans perte de champ |
| [282](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L282) | le retour depuis une fiche conserve le contexte de consultation |
| [294](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L294) | un OI determine n apparait plus comme a qualifier, meme hors de son domaine |
| [308](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L308) | les occurrences DAP portant G1 n ont plus d OI ambigu |
| [316](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L316) | qv-source-912 est une demi-section KICK-OFF B2 tenue a C1, conforme a la regle MOA |
| [330](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L330) | le bilan de generation distingue inchange, modifie, ajoute et retire |
| [342](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L342) | les parametres CTA sont consultables et traçables, sans second moteur ni reinitialisation annuelle |
| [356](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L356) | le compteur a arbitrer exige une décision humaine explicite |
| [365](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L365) | le fichier source canonique reste intact : 622 seances demontrees |
| [371](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-final-development-1-tests.js#L371) | 2028 et 2029 ne sont pas generes par ce lot |

### scripts/scope-qv-finalisation-local-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-finalisation-local-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L26) | Agenda annuel est la porte d’entrée QUO VADIS |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L30) | les routes mois et jour ouvrent le Programme en vue mensuelle |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L39) | la navigation principale ne duplique plus Agenda mensuel et Activités |
| [51](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L51) | Programme propose les vues tableau et mensuelle sur la même source |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L59) | la fiche expose le statut persiste et un arbitrage lie a son occurrence |
| [69](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L69) | calcul 2028 apres dry-run et ecritures reserves aux gestionnaires |
| [78](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L78) | les onze colonnes métier affichées sont triables sans Occurrence ni Session |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L89) | les filtres métier et la recherche globale sont reliés |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L98) | occurrences, sessions et action utilisent les libellés compacts |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L105) | le tableau supprime le défilement desktop et conserve toutes les données aux petits écrans |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L117) | le Catalogue reste une liste de modèles parents |
| [138](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L138) | Phase I multi-OI et Phase II par OI reflètent la source réelle |
| [148](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L148) | CMDT et EMSEA sont corrigés dans la source canonique |
| [159](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L159) | le public contradictoire DAP revient à une décision humaine |
| [169](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L169) | les codes publics techniques utilisent les libellés canoniques démontrés |
| [183](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L183) | pagination, tri mensuel et reset explicite sont branchés |
| [193](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L193) | la présentation finale des permanences CTA reste source-backed |
| [225](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L225) | le moteur CTA applique le cycle continu et les neuf jours fériés vaudois |
| [243](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L243) | les séries JSP sont portées par le site sans confondre les trois OI |
| [254](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L254) | l’Agenda enrichit les 497 séances non datées depuis QUO VADIS 2026 |
| [274](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L274) | le tableau Programme respecte l’ordre MOA final et le code non gras |
| [290](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L290) | la projection PostgreSQL conserve le jour civil en Europe Zurich |
| [296](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L296) | la fiche Programme expose les libellés métier sans UUID |
| [318](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L318) | un code attribué est lu depuis le registre canonique avant Auto |
| [325](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L325) | les 497 séances à positionner disposent d’une vue de travail partageable |
| [335](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L335) | la date et les barres CTA sont dérivées des bornes opérationnelles |
| [343](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L343) | les jours officiels restent distincts des périodes de permanence fériée |
| [351](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L351) | la fiche Programme persiste une obligation préparatoire sans éditer l’événement publié |
| [367](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L367) | la salle absente reste un tiret et les séries JSP restent inchangées |
| [374](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L374) | le public cible canonique remplace MEA et contracte les échelons |
| [391](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L391) | les responsables partagent un référentiel et normalisent les variantes non ambiguës |
| [413](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L413) | l’agenda classe les propositions historiques 2026 et le reliquat ambigu |
| [431](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L431) | TP9000 et les instructions section/demi-section appliquent les règles métier source-backed |
| [445](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L445) | quatre occurrences DPS identiques en date et heure s’ordonnent G1, C1, B1, B2 |
| [460](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L460) | la date et l’horaire restent prioritaires sur l’ordre métier des sites |
| [469](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L469) | tableau, vue mensuelle et agenda annuel partagent le même départage métier |
| [484](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L484) | les 9 KICK-OFF multi-OI gardent un ordre stable sans attribution de site inventée |
| [495](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L495) | le glisser-déposer mensuel réutilise l’enregistrement fiche et verrouille le calculé |
| [511](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L511) | les lignes source 910 à 913 démontrent l’ordre G1, C1, B1, B2 sur données réelles |
| [523](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L523) | la règle G1 lundi vise l’instruction de section PIONNIER CSU-nvb, pas la demi-section |
| [539](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-finalisation-local-tests.js#L539) | le Programme d’une année future est consultable dans la même interface |

### scripts/scope-qv-history-sections-ux-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-history-sections-ux-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L28) | une seule grille annuelle |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L29) | navigation directe des trois annees |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L30) | navigation historique distincte du Programme |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L31) | vrai identifiant SCOPE et route evenement existante |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L36) | reference Excel sans correspondance sans faux id evenement |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L41) | permanences ${year} presentes |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L45) | pas de copie du Programme en 2028 |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L46) | cycle continu 31 decembre 2027 et 7 janvier 2028 |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L50) | calcul retrospectif sans reinitialisation annuelle |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L54) | neuf feries pour chaque annee |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L55) | vacances officielles dependantes de chaque annee |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L61) | 850 seances preservees |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L62) | 850 dates matérialisées et couverture MOA |
| [63](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L63) | 636 propositions historiques preservees |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L64) | aucune séance sans date après décision MOA Formation groupée |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L68) | TP9000 G1 seul |
| [69](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L69) | 30 TP9000 cond TP9 seul |
| [70](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L70) | 16 codes atomiques de sections sans doublon |
| [74](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L74) | affectations source demontree et respect des publics complementaires |
| [80](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L80) | ambiguite conservee sans section deduite de la permanence |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L89) | resume des sections et contraction des echelons |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L90) | checkbox carrees et focus accessible |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L91) | respiration 26px entre groupes et zebra par ligne |
| [92](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L92) | nouveaux publics enregistrables sans ecrire un evenement |
| [98](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L98) | source Excel complete conservee avec empreinte |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-history-sections-ux-tests.js#L99) | decisions lifecycle locales preservent histoire et evenements publies |

### scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L42) | 13 couples site/theme couverts sans ligne manquante ni doublon |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L47) | KICK-OFF = 42 instructions, 28 demi-sections et 14 sections |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L53) | G1 KICK-OFF couvre dix demi-sections et cinq sections |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L57) | C1, B1 et B2 KICK-OFF couvrent chacun six demi-sections et trois sections |
| [63](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L63) | ABC, VARIA, FEU et PIONNIER ont aussi leur couverture complète |
| [70](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L70) | quatre sources explicites du 06.02.2027 gardent leurs identifiants |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L81) | la cadence KICK-OFF complète les samedis de février à avril |
| [88](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L88) | la section Nxx suit Nxxa et Nxxb, avec entrelacement historique autorisé |
| [97](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L97) | un thème suivant ne commence qu après la fin du précédent dans son site |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L100) | tous les publics non-PIONNIER proviennent du CTA continu |
| [107](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L107) | aucune réserve N06 G1 ni N04 C1/B1/B2 |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L110) | 27 lignes seulement ajoutées au générateur, sans nouveau faux historique |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L117) | Programme et Agenda 2027 partagent 847 séances distinctes sur 850 lignes techniques |
| [123](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L123) | conduite DPS couvre chaque demi-section deux fois, 56 au total |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L131) | chaque conduite suit sa vraie demi-section et dure au plus une heure |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L140) | PIONNIER reste a quinze occurrences hors astreinte N et N-1 |
| [158](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L158) | une structure C1 reduite en 2029 ajuste chaque theme sans modifier 2028 |
| [174](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L174) | la projection 2040 conserve les ecarts hebdomadaires autour du 29 fevrier |
| [183](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js#L183) | un second passage de couverture est idempotent |

### scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [113](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L113) | ${year}: cycle chronologique, publics actifs, cadence et collisions |
| [117](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L117) | même structure de 141 instructions en 2027, 2028 et 2029 |
| [123](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L123) | KICK-OFF = 42 instructions et sept autres activités visibles par la source |
| [142](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L142) | ABC, VARIA, FEU et PIONNIER restent lisibles sans fausse association |
| [154](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L154) | le thème projeté et le suffixe KICK-OFF utilisent les champs canoniques |
| [167](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L167) | tableau, vue mensuelle, fiche et Agenda annuel rendent le contexte KICK-OFF |
| [194](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L194) | conduite DPS = 56 occurrences, deux par demi-section |
| [208](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L208) | CTA passe le 31 décembre sans réinitialiser les cycles |
| [224](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L224) | mutation C1 à deux sections ajuste le moteur sans changer la structure réelle |
| [238](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js#L238) | Programme et Agenda 2027 comptent les mêmes lignes canoniques |

### scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_CORRECTION_CIBLEE_1.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-local-recipe-server.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-local-recipe-server.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-local-recipe-server.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md); [docs/scope-qv-agenda-programme-ux-final-1-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-agenda-programme-ux-final-1-recette.md); [docs/scope-qv-business-consolidation-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-business-consolidation-recette.md); [docs/scope-qv-history-sections-ux-recette.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-history-sections-ux-recette.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261012-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-20261012-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261012-ui-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-20261012-ui-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L18) | la fiche affiche le titre exact de la seance et conserve son theme |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L24) | la fiche propose seulement les references inclusives et pas un responsable par defaut |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L39) | le public permanent reste descriptif et les groupes sont tries |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L47) | les groupes OI restent qualifies et exposent leur etat partiel |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L54) | evaluation est activee par defaut, mais respecte une decision individuelle |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L58) | un Stat.Com hors liste et une ancienne activite sont conserves dans la fiche |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261012-ui-tests.js#L64) | le catalogue expose le defaut des programmations futures, distinct de la decision individuelle |

### scripts/scope-qv-moa-20261013-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-20261013-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261013-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-20261013-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261013-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-20261013-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [10](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L10) | recurrent SDIS defaults and explicit decisions stay independent |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L17) | extraordinary CRIMSON stays in 2027 and is not an annual recurrence |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L24) | external occupation is neither payroll, evaluation, export nor recurrence |
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L28) | HSC is not Stat.Com; legacy display aliases do not modify stored codes |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L34) | room and whole-building reservations use the existing compatibility engine |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L42) | visual responsible groups do not change domain identifiers |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L48) | revisions distinguish editorial, planning and independent parameter changes |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261013-tests.js#L54) | programme fiche has compact parameters, one visible PR trainer and no permanent motif |

### scripts/scope-qv-moa-20261014-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-20261014-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261014-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-20261014-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261014-pdf.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-20261014-pdf.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-pdf.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-20261014-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-20261014-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L9) | same room ${start}-${end} conflicts in both directions |
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L13) | exact 30 minute gap is allowed without rewriting slots |
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L18) | no invented room booking ${JSON.stringify(extra)} |
| [20](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L20) | other cycle is checked, same publication owner is not duplicated |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L26) | EM priority has a demonstrated common function, not an invented individual assignment |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L36) | public display preserves internal codes, OSR priority, FOBA and free labels |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L41) | qualified organisational families are independent of functional domain |
| [47](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L47) | legacy partial cancellation is one genuine action; source audit is immutable |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-20261014-tests.js#L56) | legacy operational room text is ${ambiguous?'not inferred when ambiguous':'matched to its existing reference'} |

### scripts/scope-qv-moa-backend-20261012-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-backend-20261012-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-backend-20261012-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-backend-20261012-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L19) | EXERCI cible les associations confirmees et conserve 100% des Stat.Com, codes, IDs, decisions et themes 2027 |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L37) | les choix ECA explicites meme vides restent des decisions humaines et le defaut est limite a 2027 |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L53) | les titres exacts PR 1.1 a 1.6 et leurs themes survivent a deux enregistrements |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L71) | un snapshot automatique garde le titre occurrence, une decision humaine garde son titre exact |
| [95](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L95) | references inclusives gardent les codes stables et les libelles historiques ou libres exacts |
| [119](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L119) | A affecter est une sentinelle sans acteur, meme avec des selections multiples |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L131) | CMDT:CODIR reste un public descriptif permanent, sans inventer de population |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L140) | EXEPRO est officiel, EXERPO historique reste lisible et enregistrable sans changer le Stat.Com |
| [155](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L155) | un Stat.Com incompatible ou historique reste conserve a la relecture et a SAVE |
| [169](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L169) | un Stat.Com inconnu est refuse avant la compatibilite ECA, sans changer les erreurs des codes connus |
| [180](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L180) | participationEvaluation refuse les faux booleens avant toute ecriture |
| [191](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L191) | participationEvaluation false persiste dans SAVE, VALIDATE, deplacement et reconduction 2028/2029 |
| [217](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L217) | les futurs programmes heritent du defaut du type, avec priorite aux decisions individuelles et exception 2027 |
| [250](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-backend-20261012-tests.js#L250) | la migration inclusive utilise les anciens codes et devient idempotente |

### scripts/scope-qv-moa-consolide-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-consolide-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-consolide-browser.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) ; [docs/captures/qv-moa-consolide/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-consolide/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-consolide-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-consolide-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-consolide-tests.js) |
| Dernière exécution connue | 15.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) ; [docs/captures/qv-moa-consolide/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-consolide/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-correctifs-20261010-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-moa-correctifs-20261010-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-moa-correctifs-20261010-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-correctifs-20261010-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [14](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L14) | une erreur de relecture ne laisse pas une planification partiellement enregistree |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L33) | responsables et publics libres restent descriptifs, exacts et compatibles avec les references |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L57) | les trois commandes conservent leurs significations et la baseline humaine |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L73) | le serveur refuse les structures et references inventees sans ecriture |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L85) | CONCOUR complete le registre sans modifier les 60 associations acquises |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L96) | la fiche commune restitue selections libres et etat de planification distinct |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-correctifs-20261010-tests.js#L116) | une ancienne navigation ne reactive ni ne recree la fiche en cours de chargement |

### scripts/scope-qv-moa-final-consolidation-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-moa-final-consolidation-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-final-consolidation-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [8](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-final-consolidation-tests.js#L8) | les fiches créées et transformées utilisent les mêmes panneaux, champs et trois actions |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-final-consolidation-tests.js#L31) | la notification centrale conserve le formulaire et distingue les quatre types accessibles |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-final-consolidation-tests.js#L48) | une confirmation critique conserve son action et sa priorité sur les notifications |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-moa-final-consolidation-tests.js#L61) | l’Agenda rend un véritable sélecteur des trois formats PDF |

### scripts/scope-qv-operational-exports-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-operational-exports-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [21](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L21) | l’export annuel reprend les séances distinctes et non la page courante |
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L55) | recherche métier et période sélectionnée bornent les lignes du PDF annuel |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L76) | PDF mensuel portrait : mois et recherche actifs, pagination sans séance étrangère |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L99) | le service refuse une séance hors du mois déclaré |
| [106](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L106) | la liste compacte contient dix séances CODIR sur une page sans panneaux mensuels |
| [122](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L122) | les noms des plannings annuels et mensuels suivent leur année et leur mois |
| [130](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L130) | le calendrier PDF suit l’année exportée et signale les périodes scolaires inconnues |
| [146](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-operational-exports-tests.js#L146) | les références historiques restent séparées des arbitrages opérationnels |

### scripts/scope-qv-p0-browser-seed.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-p0-browser-seed.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-browser-seed.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-p0-consolidated-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-p0-consolidated-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L9) | un 401 exige une session SCOPE sans imposer Okta |
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L16) | configuration indisponible : aucun fournisseur inventé et nouvelle tentative accessible |
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L28) | connexion LOCAL : la route courante charge son programme sans rechargement |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L45) | confirmation d’enregistrement conservée au retour vers le programme |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L56) | présentation des permanences sans altérer les verrouillages |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-consolidated-tests.js#L64) | erreur du widget Turnstile visible et formulaire de connexion conservé |

### scripts/scope-qv-p0-recipe-server.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-p0-recipe-server.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-p0-recipe-server.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md); [docs/SCOPE_QV_V1_TESTS19_33_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_V1_TESTS19_33_20261014.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-participation-catalogue-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-participation-catalogue-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-catalogue-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-participation-catalogue-security-clone-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-participation-catalogue-security-clone-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-catalogue-security-clone-proof.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-participation-evaluation-moa-20261012-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-participation-evaluation-moa-20261012-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-clone-tests.js#L28) | localhost:5432 clone: publication, filtering, type priority and history integrity in BEGIN/ROLLBACK |

### scripts/scope-qv-participation-evaluation-moa-20261012-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-participation-evaluation-moa-20261012-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [55](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L55) | default true, strict booleans and occurrence priority over the future type default |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L72) | reconduction retains the validated individual choice including false |
| [86](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L86) | publication carries the flag without removing events, relations or session shape |
| [105](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L105) | legacy true fingerprints stay stable; false updates remain idempotent and operationally protected |
| [124](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L124) | CMDT:CODIR publishes as a preserved declaration without any nominative public relation |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L140) | operational lists filter false while full lists and stored history remain readable |
| [159](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L159) | future type metadata uses existing definitions; explicit choices override it |
| [174](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L174) | participation statistics exclude disabled events without touching their expected population or presences |
| [202](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L202) | evaluation does not bypass qualification or dated assignment population engines |
| [221](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L221) | existing annual participation action edits and reloads the type default without changing tracking semantics |
| [237](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L237) | invalid type booleans and stale form versions cannot persist metadata |
| [249](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L249) | legacy form payloads preserve the configured type default and historical population guards |
| [261](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L261) | historical events without an individual flag ignore later type changes; explicit false stays false |
| [270](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L270) | future event insertion freezes either type default, preserving realised events and their status |
| [291](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L291) | missing C23 link, programme or obligation table uses the same safe SQL fallback for all event readers |
| [318](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L318) | closed multi-session rates survive type flips and disabling one session without losing stored history |
| [350](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-participation-evaluation-moa-20261012-tests.js#L350) | evaluated ABSENT plus unevaluated PRESENT contributes exactly 0/1 globally, individually and in the directory |

### scripts/scope-qv-post-pr16-moa-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-pr16-moa-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-browser.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) ; [docs/captures/qv-post-pr16-moa-20261014/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-post-pr16-moa-20261014/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-pr16-moa-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-pr16-moa-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-clone.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) ; [docs/captures/qv-post-pr16-moa-20261014/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-post-pr16-moa-20261014/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-pr16-moa-pdf-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-pr16-moa-pdf-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-pdf-proof.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) ; [docs/captures/qv-post-pr16-moa-20261014/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-post-pr16-moa-20261014/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-pr16-moa-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-post-pr16-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) ; [docs/captures/qv-post-pr16-moa-20261014/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-post-pr16-moa-20261014/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [10](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L10) | manual creation has one readable seven-column row |
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L15) | one row for each of ${n} modified business fields |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L19) | validation transition ${validated} has one decision and retains reason |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L24) | automatic persisted correction is not attributed to the human author |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L29) | OI reordering and technical fields do not become business changes |
| [34](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L34) | legacy missing before values are not reconstructed |
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L38) | same room overlaps while different rooms are independent |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L42) | a location without a room is not an exclusive booking |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L45) | explicit site exclusivity and explicit shared resources remain blocking |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L49) | partial overlap and mandatory turnaround use the actual booking |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L59) | confirmed OSR type can use daytime Fridays without opening other DPS Fridays |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L64) | OSR exception never removes holidays or school vacations |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L68) | 52 weeks retains weekday and controls the resulting forbidden date |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L73) | sharing coverage preserves the main historical motor and all non-OSR day policies |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L82) | operational public order and FOBA identities remain exact |
| [87](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-pr16-moa-tests.js#L87) | user alerts hide internal rule IDs and display proposal dates in French format |

### scripts/scope-qv-post-recette-moa-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-recette-moa-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-recette-moa-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-recette-moa-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-recette-moa-pdf-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-post-recette-moa-pdf-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-pdf-proof.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-post-recette-moa-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-post-recette-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_POST_PR16_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_POST_PR16_MOA_20261014.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L9) | civil Programme dates and business cycle boundaries remain distinct |
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L15) | external occupations only follow the selected civil year |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L24) | PAPR preparatory exception and provisional report remain intact |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L29) | operational public choices reuse the four existing CI reference codes |
| [35](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L35) | history shows business fields directly and never fabricates missing historical values |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L42) | author names only use the authorized directory path |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-post-recette-moa-tests.js#L48) | DPS day controls show the rule and no invented reason for an unplanned item |

### scripts/scope-qv-pr12-complement-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-complement-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-complement-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-complement-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-complement-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-pr12-complement-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L13) | Seven distinct PAPR modules, exact source themes, no invented dates or repeated restoration |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L29) | PAPR and PR human decisions are never overwritten |
| [37](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L37) | Classic PR exercises all DPS, PR-ABC PABC remains G1 only |
| [44](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L44) | Annual gate checks module 1 and 2 end strictly before actual PR 1.1 start |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L56) | Unknown or duplicate modules block annual validation |
| [61](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L61) | Editorial minor, scheduling and population major; array order is irrelevant |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L68) | Validated occurrence themes are part of the existing reconduction snapshot |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L73) | 0180F7 SQL seed and official EXERCI mapping, historic EXERPO retained |
| [81](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L81) | Programme UI offers withdrawal, annual blocking reasons and no fabricated report date |
| [91](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-complement-tests.js#L91) | Annual State cell top aligned, square remains 8x8 |

### scripts/scope-qv-pr12-corrective-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-corrective-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-corrective-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-corrective-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-corrective-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-pr12-corrective-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L15) | explicit planning change is major for a publication, not an editorial change |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L19) | PAPR preparation belongs to 2027 without changing cycle boundaries or other activities |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L30) | internal manifestations use qualified DPS/DAP publics and the stable C scrt reference |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L41) | unpaid internal event is publishable with independent evaluation and export flags |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L52) | internal identity never parses as Stat.Com and is allocated by the database sequence |
| [58](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L58) | default flags retain historic publication fingerprints |
| [63](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-corrective-tests.js#L63) | ECAwin UI keeps dropdown and independent controls, without the search field |

### scripts/scope-qv-pr12-finalisation-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-finalisation-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-finalisation-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr12-finalisation-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr12-finalisation-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-pr12-finalisation-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L13) | Seven PAPR proposals reuse annual weekday and calendar motor; module 2 before PR 1.1 |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L24) | Human date remains exact even when chronology conflicts |
| [32](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L32) | Impossible rules give a precise conflict without fabricating a date |
| [38](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L38) | MOA provisional report is a planning boundary, not an operational or civil statistics event |
| [45](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L45) | Report migration never replaces an existing declared report |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L52) | Explicit corrected themes take precedence over Phase I/II, including deliberate empty themes |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L57) | Prepose APR is permanent descriptive, functional labels singular, historical codes retained |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr12-finalisation-tests.js#L64) | Seven-column PAPR proposal table, provisional Codir notice, existing multiselection and cursus label |

### scripts/scope-qv-pr13-complement-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr13-complement-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr13-complement-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr13-complement-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr13-complement-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr13-complement-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr13-final-controls-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr13-final-controls-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr13-final-controls-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr13-final-controls-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr13-final-controls-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr13-final-controls-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-pr18-finalisation-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-pr18-finalisation-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-pr18-finalisation-proof.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS clone, rollback documenté |
| Preuve | [docs/SCOPE_QV_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_20261014.md) ; [docs/captures/qv-moa-20261014/finalisation-results.json](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-moa-20261014/finalisation-results.json) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-programme-creation-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-programme-creation-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-creation-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_DOMAINES_OI_TRANSVERSALITE_CORRECTIF_1.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L42) | classeur 2026 direct et projection historique identiques |
| [48](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L48) | programme 2027 porte 850 seances et conserve les identites source |
| [53](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L53) | OI pur DPS:G1 sans DAP:Y1 |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L59) | communication F6 G1 et Y1 par deux filtres OI et son domaine |
| [68](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L68) | materiel SDIS reste F4 et ressort sous chacun des huit OI |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L76) | G1 explicite sous DAP devient DPS:G1 sans deduction depuis DAP |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L83) | aucune cellule OI utilisateur ne contient texte technique ou point-virgule |
| [93](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L93) | filtre Domaine prepare les codes institutionnels et le filtre OI reste canonique |
| [124](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L124) | periode affiche le mois sans repeter l annee de la page |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L131) | Fourriers et echelons historiques preserves, rapport annuel inchange en attente du solde |
| [149](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L149) | les classifications non arbitrees ne sont pas deduites en masse |
| [155](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L155) | domaine fonctionnel affiche, domaine technique institutionnel sauvegarde |
| [168](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js#L168) | reconduction validee garde F6 sans ecrire un domaine SQL inconnu |

### scripts/scope-qv-programme-domaines-canoniques-final-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-programme-domaines-canoniques-final-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_REFERENTIEL_DOMAINES_OI_TRANSVERSALITE_FINAL.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [22](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L22) | F0 gouvernance, hors recrutement NUOVO non prouve |
| [29](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L29) | F1 personnel et integration |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L33) | F3 prestations internes et externes sans toucher aux Stat.Com |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L40) | F4 materiel, evenement equipement et photo unique |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L46) | F6 SIC photographie et multi-OI independants du domaine |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L57) | JSP conserve 010JSP; famille ne derive pas du site |
| [64](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L64) | 127 changements de domaine sans modification des cas soldes non verifies |
| [85](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L85) | 2028 reprend F0 F3 F4 F6 des modeles valides |
| [96](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-domaines-canoniques-final-tests.js#L96) | 2029 reconduit les memes domaines sans regle liee a 2027 |

### scripts/scope-qv-programme-fiche-calendar-moa-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-programme-fiche-calendar-moa-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L17) | PR-ABC reprend les OI 2026 sans effacer un événement publié ou une décision humaine |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L40) | PR-ABC reste enregistrable avec le public PABC et sans OI |
| [52](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L52) | 010JSP, G1/État-major, Chef JSP et domaine préparatoire persistent ensemble |
| [84](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L84) | date, heures et Stat.Com restent strictement validés |
| [97](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L97) | Autre lieu réutilise une référence et refuse un doublon libre |
| [108](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L108) | un lieu ponctuel reste hors référentiel; conserver crée puis réutilise la référence |
| [129](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L129) | SDIS ne peut pas être enregistré avec des OI individuels |
| [136](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L136) | À arbitrer exige une décision humaine explicite, indépendamment du statut de préparation |
| [152](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L152) | PR 1/2/3 conservent les séances canoniques ordonnées, les horaires et les exceptions de journée |
| [169](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L169) | fiche Programme rend calendrier, heure, domaine, Stat.Com aligné et lieux Autres existants |
| [218](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L218) | Programme, ancienne route agenda, Agenda annuel et Synthèse gardent la même source 2027 |
| [245](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L245) | tableau et mois conservent les identités, filtres et liens de fiche |
| [275](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L275) | Agenda annuel 2028 présente le programme et le bandeau 2028, sans compteur 2027 déguisé |
| [291](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L291) | Alertes identifie les deux conflits Rapport annuel sans les confondre avec À arbitrer |
| [313](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L313) | Direction JSP reste mensuelle, sans effacer la projection technique |
| [328](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L328) | Rapport annuel porte la priorité annuelle, réserve sa date et expose les conflits |
| [349](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L349) | déplacer le Rapport annuel transfère la contrainte et conserve les décisions existantes |
| [380](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-fiche-calendar-moa-tests.js#L380) | la préparation RA ne déplace jamais son événement déjà publié |

### scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L49) | programme adds only 48 DPS drives: 56 DPS + 16 DAP |
| [56](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L56) | every operational DPS half has two one-hour drives attached to distinct real instructions |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L83) | July G1 drives and N04b moved to May follow real half-section instructions |
| [100](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L100) | DAP keeps the documented four-per-Y rule from 17 direct 2026 source evenings |
| [116](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L116) | functional domain comes only from canonical code, 2026 reference or explicit Stat.Com |
| [124](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L124) | family and type are distinct and 2027 source types are inventoried |
| [131](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L131) | AUTO combines with parent DPS, DAP, G1 and cond PL independently |
| [140](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L140) | Type Conduite includes every DPS and DAP row, with combined domain and OI filters |
| [151](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L151) | OI parent and transverse matching use confirmed selections, not domain |
| [161](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L161) | multi-session filter recovers PR, grouped training, TRUCK, CAR only from existing sequence |
| [173](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L173) | domain, family and type controls have the requested ordering and labels |
| [182](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L182) | OI hierarchy, public groups and Stat.Com presentation keep exact stored codes |
| [192](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-filtres-taxonomie-conduite-correctif-2-tests.js#L192) | locality-only choices excluded and agenda has four desktop KPI tracks |

### scripts/scope-qv-programme-recipe-correction.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-programme-recipe-correction.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-programme-recipe-correction.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-repair-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-repair-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-repair-2-complement-consolidated-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-repair-2-complement-consolidated-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [15](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L15) | classeur historique ouvert directement, empreinte et 919 lignes |
| [19](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L19) | ABC et PIONNIER restent G1 uniquement dans le programme 2027 |
| [26](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L26) | PIONNIER CSU-nvb suit les cinq sections explicites de la semaine precedente |
| [36](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L36) | sections et demi-sections calculees par site, sans reserve |
| [49](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L49) | instruction G1 lundi, C1 B1 B2 samedi matin |
| [59](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L59) | public de section datee apparait dans la fiche activite, sans changer le site source |
| [72](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L72) | regle 2028 appliquee seulement a sa periode et horaire conserve |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L82) | creation version 2028 ferme 2027 sans desactiver son historique |
| [101](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L101) | chevauchement refuse sans modifier les versions precedentes |
| [120](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L120) | catalogue 2028 consulte les versions valables en 2028 |
| [126](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-repair-2-tests.js#L126) | correction humaine FOBA 2 seule survit aux calculs 2028 et 2029 |

### scripts/scope-qv-response-performance-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-response-performance-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-response-performance-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-response-performance-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-response-performance-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-response-performance-clone.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-export-pdf-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-export-pdf-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [32](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js#L32) | QV-EXPORT-001 ${mode}: exact occurrence title then theme on the next line |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js#L54) | QV-EXPORT-001 ${mode}: blank or absent themes keep a single title line |
| [73](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js#L73) | QV-EXPORT-001: explicit themes preserve session suffixes and separators already in the title |
| [83](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-pdf-tests.js#L83) | QV-EXPORT-001: the existing pagination keeps each title and theme together |

### scripts/scope-qv-roadmap-export-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-roadmap-export-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-export-proof.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-v1-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-roadmap-v1-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-browser.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-v1-cycle-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-roadmap-v1-cycle-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/scope-qv-roadmap-v1-cycle-contract.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-roadmap-v1-cycle-contract.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-v1-cycle-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-v1-cycle-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-tests.js#L13) | closing reports define business years independently of civil dates |
| [30](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-tests.js#L30) | missing and ambiguous closing dates remain pending |
| [40](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-tests.js#L40) | exact occurrence matching preserves domain-qualified OI and human titles |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-cycle-tests.js#L50) | cycle GET validates its year before querying PostgreSQL |

### scripts/scope-qv-roadmap-v1-external-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-v1-external-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-external-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [9](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-external-tests.js#L9) | une activite externe reste au planning sans publication ni population SCOPE |
| [16](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-external-tests.js#L16) | une activite interne non evaluee reste publiable apres les gardes existants |

### scripts/scope-qv-roadmap-v1-helper-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-v1-helper-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [18](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L18) | publics permanents exacts et tries; codes historiques conserves |
| [31](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L31) | C scrt reste le code historique; C sct est le libelle propose |
| [41](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L41) | exports exacts avec theme et suffixe sans mutation |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L54) | contrat UI defaults/prefill, consensus, copies editables et provenance |
| [71](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L71) | variantes DPS conservees par site et Stat.Com; ordre stable et pas de duplication |
| [89](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L89) | champs divergents ou absents omis; aucune union des publics et OI |
| [99](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L99) | les creations manuelles ne creent pas de type et ne changent aucun consensus canonique |
| [108](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L108) | domaine fonctionnel historique ou canonique uniquement, variantes independantes de F7 |
| [120](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L120) | types canoniques existants, references ECAWIN et responsables multiples/libres |
| [132](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L132) | planner: toutes les fonctions descriptives exclues des relations de population |
| [144](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L144) | UMD navigateur expose les deux APIs sans module CommonJS |
| [151](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L151) | planner: externe historique hors SCOPE ne cree aucun evenement ni population |
| [159](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-helper-tests.js#L159) | planner: activite SCOPE non evaluee reste publiable avec flag false |

### scripts/scope-qv-roadmap-v1-referentials-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-roadmap-v1-referentials-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-referentials-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-v1-statistics-clone-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-roadmap-v1-statistics-clone-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-clone-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-roadmap-v1-statistics-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-v1-statistics-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [27](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-tests.js#L27) | QV-STAT-001: le cycle 2027 ne change ni les bornes civiles ni les contributions de 2028 |
| [42](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-tests.js#L42) | les rapports individuels, OI, domaine et agreges reutilisent la date civile sans double comptage |
| [57](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-statistics-tests.js#L57) | la population applicable utilise la date reelle A+1 et non le numero du cycle |

### scripts/scope-qv-roadmap-v1-ui-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-roadmap-v1-ui-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [12](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js#L12) | QV-EXPORT-001 Programme: titre exact separe pour PDF, meme cellule Excel, sans mutation |
| [24](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js#L24) | la fiche manuelle propose les types canoniques dans le formulaire existant |
| [33](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js#L33) | les publics courts sont permanents et C sct est propose sans nouveau code responsable |
| [43](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js#L43) | un mois A+1 conserve son annee civile dans le filtre du cycle 2027 |
| [50](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-roadmap-v1-ui-tests.js#L50) | les bornes metier sont visibles et la cloture manquante ne recoit aucune date inventee |

### scripts/scope-qv-section-rotation-closure-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-section-rotation-closure-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_CYCLE_KICKOFF_VISIBILITY_FINAL_3.md); [docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTIONS_ROTATION_CONDUITE_REPAIR_1.md); [docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_INSTRUCTION_COVERAGE_MOA_REPAIR_2.md); [docs/SCOPE_QV_2027_POST_RECETTE_A_J.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_2027_POST_RECETTE_A_J.md); [docs/scope-qv-conduites-canonical-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-conduites-canonical-closure-1-report.md); [docs/scope-qv-section-rotation-closure-1-report.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/scope-qv-section-rotation-closure-1-report.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L46) | ABC demi-sct : dix occurrences sur dix dates et dix demi-sections distinctes |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L54) | ABC demi-sct : rotation G1 conforme au cycle CTA de permanence |
| [62](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L62) | ABC sct : cinq occurrences sur cinq dates et cinq sections distinctes |
| [75](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L75) | PIONNIER demi-sct : dix occurrences sur dix dates et dix demi-sections distinctes |
| [82](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L82) | PIONNIER demi-sct : site G1, Caserne G1 et durée de quatre heures |
| [90](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L90) | PIONNIER sct CSU-nvb : cinq occurrences sur cinq dates et cinq sections distinctes |
| [102](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L102) | Introduction PIONNIER conserve le public FOBA 2 sans régression |
| [110](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L110) | VARIA et FEU sont répartis sur autant de réalisations OI que de tours démontrés |
| [121](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L121) | VARIA conserve deux horaires métier distincts selon le site |
| [135](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L135) | chaque occurrence répartie porte une date et une section mutuellement cohérentes |
| [151](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L151) | aucune occurrence section ou demi-section ne reste collée à un autre tour |
| [165](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L165) | KICK-OFF du 06.02.2027 reste strictement identique au résultat recetté PASS |
| [179](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L179) | les conduites 0152F7 sont matérialisées après correction des sources, sans invention |
| [195](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L195) | la matrice des conduites vise deux séances par demi-section opérationnelle |
| [211](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L211) | aucune conduite n’est jamais ajoutée après une instruction PIONNIER |
| [218](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L218) | les conduites B2 se tiennent à la Caserne C1 sans transformation automatique du lieu |
| [228](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L228) | le réalignement est idempotent au deuxième passage |
| [237](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L237) | une décision humaine explicite est préservée et jamais réalignée |
| [247](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L247) | aucune date n’est inventée : un tour non démontré reste MOA_REQUIRED |
| [268](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-section-rotation-closure-1-tests.js#L268) | la génération 2028 n’est pas déclenchée par ce lot |

### scripts/scope-qv-statcom-emsea-clone-proof.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-statcom-emsea-clone-proof.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-clone-proof.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-statcom-emsea-correctif-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-statcom-emsea-correctif-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L39) | EMSEA est canonique pour État-major, distinct de EXEC et soldé au forfait |
| [54](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L54) | EMSEA est accepté sans conversion, mais reste réservé aux séances État-major |
| [69](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L69) | un code canonique valide reste enregistrable |
| [76](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L76) | la fiche affiche EMSEA canonique et le gabarit PR/DPS/État-major reste commun |
| [113](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L113) | Enregistrer et valider conserve EMSEA et les modifications métier |
| [138](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-statcom-emsea-correctif-1-tests.js#L138) | date puis heure conservent le code historique et la même préparation |

### scripts/scope-qv-v1-browser.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-v1-browser.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-browser.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_V1_TESTS19_33_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_V1_TESTS19_33_20261014.md) ; [docs/captures/qv-v1-tests19-33/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-v1-clone.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-qv-v1-clone.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-clone.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_V1_TESTS19_33_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_V1_TESTS19_33_20261014.md) ; [docs/captures/qv-v1-tests19-33/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-v1-pdf.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-v1-pdf.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-pdf.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_V1_TESTS19_33_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_V1_TESTS19_33_20261014.md) ; [docs/captures/qv-v1-tests19-33/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-qv-v1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-qv-v1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js) |
| Dernière exécution connue | 14.10.2026 ; heure exacte non attestée |
| Résultat | PASS documenté |
| Preuve | [docs/SCOPE_QV_V1_TESTS19_33_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_V1_TESTS19_33_20261014.md) ; [docs/captures/qv-v1-tests19-33/](https://github.com/Sdisnv/monitoringF7/tree/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/captures/qv-v1-tests19-33/) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [6](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js#L6) | Families preserve explicit values independently of domain, OI and Stat.Com |
| [28](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js#L28) | CTA exception requires real type, active public and matching canonical week |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js#L39) | CSV includes family, code-only domain and keeps OI/Public neighbours |
| [46](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-qv-v1-tests.js#L46) | Technical review errors are rendered as business messages |

### scripts/scope-recovery-auth-netlify-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-recovery-auth-netlify-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-recovery-auth-netlify-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-referentials-actions-ui-lifecycle-repair-5-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-referentials-actions-ui-lifecycle-repair-5-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-referentials-actions-ui-lifecycle-repair-5-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-referentials-usage-traceability-active-filter-repair-5-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-referentials-usage-traceability-active-filter-repair-5-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-referentials-usage-traceability-active-filter-repair-5-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-referentiel-cursus-taxonomie-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-referentiel-cursus-taxonomie-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-referentiel-cursus-taxonomie-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-report-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-report-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-report-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-report-pdf-reliability-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-report-pdf-reliability-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-report-pdf-reliability-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reporting-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reporting-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reporting-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reporting-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reporting-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reporting-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reporting-cycles-foundation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reporting-cycles-foundation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reporting-cycles-foundation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reporting-portfolio-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reporting-portfolio-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reporting-portfolio-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reports-multisession-professional-finish-5-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reports-multisession-professional-finish-5-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reports-multisession-professional-finish-5-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reports-pdf-specialisation-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reports-pdf-specialisation-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reports-pdf-specialisation-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-reports-professional-ux-final-6-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-reports-professional-ux-final-6-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-reports-professional-ux-final-6-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-shared-event-referential-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-shared-event-referential-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-shared-event-referential-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-specialisation-cycles-ux-api-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-specialisation-cycles-ux-api-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-specialisation-cycles-ux-api-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-statcom-referential-config-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-statcom-referential-config-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-statcom-referential-config-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_C19_PREPROD_GATE_1_R1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_1_R1.md); [docs/SCOPE_C19_PREPROD_GATE_2.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_C19_PREPROD_GATE_2.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-turnstile-browser-recipe.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-turnstile-browser-recipe.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-browser-recipe.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-turnstile-live-recipe.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Serveur/harness potentiellement persistant |
| Fichier | [scripts/scope-turnstile-live-recipe.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-live-recipe.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-turnstile-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-turnstile-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |
| Ligne | Scénario / risque de régression tel que nommé dans la source |
|---|---|
| [13](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js#L13) | Turnstile reste désactivé sans activation explicite |
| [17](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js#L17) | configuration publique ne révèle jamais le secret |
| [22](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js#L22) | activation sans configuration et absence de jeton refusées |
| [27](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js#L27) | Siteverify serveur requis avec contrôle du domaine et de l’action |
| [39](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-turnstile-tests.js#L39) | indisponibilité Siteverify ne contourne pas la protection activée |

### scripts/scope-ux-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ux-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ux-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ux-event-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ux-event-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ux-event-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ux-event-2-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ux-event-2-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ux-event-2-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ux-event-3-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ux-event-3-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ux-event-3-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-ux-orion-alignment-arch-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-ux-orion-alignment-arch-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-ux-orion-alignment-arch-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | [docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_FINAL_CONSOLIDATION_20261009.md) |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-vigilance-nav-repair-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-vigilance-nav-repair-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-vigilance-nav-repair-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### scripts/scope-vigilance-participation-1-tests.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [scripts/scope-vigilance-participation-1-tests.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/scripts/scope-vigilance-participation-1-tests.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-auto-specializations-priority.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-auto-specializations-priority.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-auto-specializations-priority.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-jsp-populations.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-jsp-populations.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-jsp-populations.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-backend-b1.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-backend-b1.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-backend-b1.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-filters-sort.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-filters-sort.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-filters-sort.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-import-populations.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-import-populations.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-import-populations.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-import-ux-order.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-import-ux-order.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-import-ux-order.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-import-ux.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-import-ux.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-import-ux.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-populations-metier.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-populations-metier.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-populations-metier.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-status-ux-2.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-status-ux-2.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-status-ux-2.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel-temporal-ux.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel-temporal-ux.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel-temporal-ux.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

### tests/scope-personnel.test.js

| Champ | Valeur |
|---|---|
| Fonctionnalité / risque couvert | Scénarios littéraux ci-dessous ; Suite de tests — ne pas supposer pure sans lecture |
| Fichier | [tests/scope-personnel.test.js](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/tests/scope-personnel.test.js) |
| Dernière exécution connue | NON VÉRIFIÉ ; aucune nouvelle exécution |
| Résultat | NON VÉRIFIÉ dans cet audit ; aucune conclusion depuis présence du fichier |
| Preuve | Aucune mention documentaire directe trouvée |
| Validation MOA | NON VÉRIFIÉ pour cette suite ; un PASS technique ne vaut pas acceptation |
| Exécution audit | NON EXÉCUTÉ : réutilisation des acquis ; risque de mutation non exclu pour harness/clone ; aucun import de module applicatif |

Scénarios dynamiques ou harness : aucun nom littéral test(...) extrait ; lire le fichier pour la couverture détaillée, sans exécuter.

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

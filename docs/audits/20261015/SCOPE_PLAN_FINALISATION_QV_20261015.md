# SCOPE — Plan de finalisation QUO VADIS

## Raccord UX de préparation — mandat opérationnel du 16.10.2026 après #32

Base main/production vérifiée `fe4cfb96ad59732cb0a1eea08fd4e9124b91cf51`. Le [lot UX/exploitation](../../SCOPE_QV_ACCELERATION_UX_20261016.md) facilite l’étape 1 sans modifier la chaîne ni ses gates : contrôle annuel compact, accès aux occurrences identifiées, type → occurrence → critères, relations préparatoires explicites et contexte conservé. La validation annuelle reste dans le workflow existant ; la conformité affichée d’un critère ne vaut pas validation de l’occurrence. Les blocages globaux restent globaux ; la préparation manquante n’est pas effacée par une liste de liens vide. Ni assignation, ni communication ou publication annuelle engagée. Les étapes et preuves historiques ci-dessous gardent leur portée ; Programme annuel 2027 NON VALIDÉ. Recette MOA du lot uniquement en production après GO distincts et SHA publié, PASS explicite requis.

> Capitalisation phase B : import de la phase A actualisée à #27. Les déclarations « hors dépôt », « pas de phase B » et les prochains GO dans le texte importé décrivent son mandat historique. La mission de phase B autorise maintenant sa capitalisation documentaire en une PR, sans fusion ni déploiement. Les réserves AUDIT_INCOMPLET et Programme 2027 NON VALIDÉ restent applicables. Voir [provenance](README.md).


## Actualisation consolidée du 15.10.2026 — référence applicable

**Phase A, lecture seule. Verdict : AUDIT_INCOMPLET**, avec réserves explicites ci-dessous. **Programme annuel 2027 NON VALIDÉ.** Cette actualisation reprend les huit mêmes livrables ; elle ne recommence pas l'audit initial.

GitHub `Sdisnv/monitoringF7`, `main` : **`3bdad82029ef79ea721bcf4043a5bb47e4d86764`**. PR #20 à #27 fusionnées ; contrôle direct GitHub et Netlify effectué pendant cette actualisation. Production `scope-sdisnv` : déploiement **`6ad0d08255cda461366136f2`**, **ready**, même SHA, publication **15.10.2026 à 15:09:59.769 Europe/Zurich** (13:09:59.769 UTC). Une publication technique ne vaut pas validation du Programme annuel.

Aucune écriture dans le dépôt partagé, GitHub, les données, les configurations, les permissions/RLS, Okta ou Netlify. Aucun test acquis relancé, aucune branche/PR/migration, fusion ou publication réalisée par cet audit. Les écritures se limitent aux livrables et preuves d'audit dans `dossier local historique de l’audit (non versionné)` et à leur copie de remise hors dépôt dans le dossier d’artefacts Codex. Pas de phase B engagée.

Les sections d'actualisation précèdent l'**archive initiale** conservée en fin de fichier pour assurer la continuité. Pour les changements #23–#27, les décisions actuelles ci-dessus et les rectifications ci-dessous remplacent les états initiaux correspondants. Les références à `74ac904…`, aux anciens déploiements et aux comptes SQL initiaux dans l'archive restent datées ; elles ne décrivent pas la production courante. Les points non remplacés restent au backlog avec les limites initiales, sans nouvelle preuve d'ouverture ou de clôture.

Navigation : [SCOPE_AUDIT_INTEGRAL_20261015.md](SCOPE_AUDIT_INTEGRAL_20261015.md) · [SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md](SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md) · [SCOPE_ROADMAP_CONSOLIDEE_20261015.md](SCOPE_ROADMAP_CONSOLIDEE_20261015.md) · [SCOPE_TODO_CONSOLIDEE_20261015.md](SCOPE_TODO_CONSOLIDEE_20261015.md) · [SCOPE_REGISTRE_ANOMALIES_20261015.md](SCOPE_REGISTRE_ANOMALIES_20261015.md) · [SCOPE_MATRICE_TRACABILITE_20261015.md](SCOPE_MATRICE_TRACABILITE_20261015.md) · [SCOPE_PLAN_FINALISATION_QV_20261015.md](SCOPE_PLAN_FINALISATION_QV_20261015.md) · [SCOPE_REGISTRE_DECISIONS_MOA_20261015.md](SCOPE_REGISTRE_DECISIONS_MOA_20261015.md). Diagnostic distinct demandé : [SCOPE_DIAGNOSTIC_NETLIFY_20261015.md](SCOPE_DIAGNOSTIC_NETLIFY_20261015.md).

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


## Roadmap priorisée applicable

1. **Continuité de production et incidents réels** : conserver la saisie accessible ; qualifier l’impact avant gravité et correction. Aucun incident critique établi par le seul ratio Netlify.
2. **Finalisation QV2027** : dossier de contrôles bloquants, M/P et révisions, clôture Codir, relations de préparation ; construire le contrôle qualité consolidé sur les moteurs existants ; proposer des alternatives expliquées seulement là où la couverture manque.
3. **Chaîne annuelle** : décision de validation, publication autorisée, liens d’événements, assignations fiables, programmes individuels, communication et modifications ciblées. Voir plan par étape. L’ordre ne vaut pas GO de publication.
4. **Compléments limités** : témoin/correctif PDF ciblé, harmonisation restante, relation datée des fonctions, mode consultation EM. Préserver les correctifs et PASS partiels dans leur portée.
5. **Éditeur QV-RULES-001 et autres modules** : préciser dépendance à validation2027, poursuivre ECA/observations/évaluations/IndeX/ECAwin selon contrats et sources ; ProgJour suspendu et GELORE2 dépendant fournisseur.

Aucune priorité proposée n’arbitre les dates, les dérogations ni les droits à la place de la MOA. Les quatorze champs antérieurs restent dans le catalogue initial conservé ; les fiches suivantes définissent les nouveautés et amendements qui remplacent les états précédents sur les mêmes sujets.

## ToDo applicable après cette actualisation

Les actions d’audit documentaire #20–#27 sont réalisées ; les travaux ci-dessous restent à autoriser/faire selon leur nature. Aucun ticket externe créé. P1/P2 = ordre de travail proposé, distinct des gravités d’incident et des décisions MOA. Les détails et quatorze champs sont dans la roadmap actualisée.

| Ordre | Action concrète | Responsable proposé | Condition / preuve de clôture | État |
|---|---|---|---|---|
| 0 continu | Préserver saisie et acquis #20–#27 ; qualifier incident réel si signalé | Exploitation + MOA | SCOPE-PROD-001/SCOPE-INCIDENT-001 ; pas de régression de sauvegarde ; impact et cause tracés | Exigence permanente ; procédure à formaliser |
| 1 | Obtenir le PDF compact RECETTE exact ; qualifier largeur et horaires | MOA fournit source ; revue documentaire | 6 pages,96 séances, DAP:Y1 ; comparaison visuelle ; aucune génération production par audit | NON OBTENU / complément PDF non vérifié |
| 2 | Rapprocher le tableau M1–M7/P1–P6 de l’état courant sans refaire les recettes acquises | MOA / responsable planning | Une décision/action/état par dossier ; dates P2/P6 déjà approuvées ; capacités/fonctions prouvées | Application/clôture actuelle à vérifier, pas13 anomalies automatiquement ouvertes |
| 3 | Qualifier Y1 exercice10.02/cours10.03 et relations mixtes | MOA planning | Date/dérogation autorisée et justification traçable ; ambiguïtés identifiées ; aucune auto-correction | ANOMALIE OUVERTE dans preuve / état courant non relu |
| 4 | Fixer périmètre du contrôle qualité consolidé | MOA + développement futur | QV-CONTROLE-QUALITE-001 : axes, gravités, rapport et gardes annuelles reliés aux moteurs existants | PARTIELLEMENT DÉVELOPPÉ |
| 5 | Cartographier et compléter les propositions alternatives | Développement futur + MOA | Réutiliser proposeBestDates ; contraintes non vérifiées explicites ; choix final humain | PARTIELLEMENT DÉVELOPPÉ |
| 6 | Décider clôture Codir et dates restant à arbitrer ; confirmer EM/PR/JSP via révisions existantes | MOA / Codir / responsable métier | Même ID/version ; motif/historique ; aucune clôture déduite de fusion PR | BLOQUÉ MOA / application distincte |
| 7 | Définir relation datée personne–fonction–domaine–OI | MOA personnel + développement futur | Source et dates d’effet ; affectations existantes ; pas de NIP fictif ni PRINCIPAL=Chef | PARTIELLEMENT DÉVELOPPÉ |
| 8 | Revoir les sept étapes de chaîne et combler les seuls raccords manquants | MOA + développement futur | Voir plan : validation/pub/liens/assignations/individuels/communication/changements ; critères par étape | PARTIELLEMENT DÉVELOPPÉ / bout en bout NON VÉRIFIÉ |
| 9 | Compléter les seules preuves et conditions nouvelles non démontrées | Recette future autorisée | Scénarios limités aux écarts/conditions réelles ; ne pas rejouer PASS #23/#26/#27 | NON VÉRIFIÉ pour conditions listées |
| 10 | Décider annuellement, puis autoriser publication séparément | MOA | Rapport consolidé ; aucun blocage non résolu ; versions/empreintes et impacts revus | Programme2027 NON VALIDÉ |
| 11 | Séquençage QV-RULES-001 et consultation EM | MOA + développement futur | Maquette conservée ; moteurs existants ; droits serveur ; nécessité avant2027 à arbitrer | PARTIELLEMENT DÉVELOPPÉ |
| 12 | Traiter les autres modules selon dépendances et backlog conservé | MOA + responsables métier | ECA/observations/évaluations/IndeX/ECAwin ; ProgJour suspendu ; GELORE2 fournisseur | Voir inventaire et roadmap initiaux conservés |
| 13 | Capitaliser le dossier après GO phase B distinct | MOA puis intervenant autorisé | Huit fichiers revus ; limites acceptées/complétées ; aucun dépôt modifié pendant phaseA | BLOQUÉ par absence de GO, phaseB non engagée |

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

## Verdict et point de départ

Programme2027 en PREPARATION dans la lecture SQL du15.10, `published_at` NULL. L'existence d'événements opérationnels déjà liés ne prouve pas la publication annuelle du programme. Les PR #19–#22 sont intégrées ; leurs anciens rapports « non déployé » sont des états de livraison historiques.

## A — Anomalies techniques prouvées

- Défauts de filtres, révisions EM/date_fin, annulation/réactivation, rendu PDF et places DAP : corrections intégrées avec preuves ciblées ; ne pas reprogrammer un correctif identique.
- Authentification #22 : deux causes reproduites/corrigées ; il reste une observation terrain, pas la preuve de toutes les expirations historiques.
- Revue sécurité : route pilote personnel trop largement gardée, couverture RLS incomplète, export CSV nominatif et fallback OIDC à qualifier. Aucun changement autorisé par l'audit ; mesurer l'impact réel avant un lot correctif séparé.

## B — Corrections métier déterministes

32 familles DAP et deux cursus FOCA déjà appliqués : préservation, aucune réexécution. Dates JSP approuvées et maintien EM16.02 : application par l'interface et les révisions ciblées sous responsabilité MOA, mêmes IDs, vérification de version, motif et historique. M5 nécessite configuration formation existante ; ne pas retirer silencieusement une qualification pour faire passer une révision.

## C — Arbitrages MOA

P1 Of auto commun ; P3 fonctions cadres DAP/EM ; P4/P5 animation DPS/DAP et C for commun ; M2 disponibilité Vulcain et intégration DAP. Confirmer capacité/équipement des salles alternatives, date du cours cadres DAP4 Y2, formations groupées DAP1.1/1.2 et leurs horaires/thèmes/responsables non démontrés, qualifications du stock familles, portée des publics mixtes OSR. Clôture Codir10.02.2028 distincte. Respecter gel Y1/IndeX.

## D — Fonctions à développer ou compléter

QV-RULES-001 : compléter le parcours cible sur les moteurs existants ; maquette validée, huit sections, règle par cursus et faisabilité. Des routes de règles existent déjà : leur présence ne démontre pas que le parcours cible est terminé.

QV-CYCLE-007 : compléter/démontrer les ajouts après publication et la chaîne assignations → programmes individuels → communication, sans régénération générale. Cours ECA : contrat spécialisé et origine cantonale à formaliser. Observations/évaluations et IndeX suivent leurs dépendances propres. ProgJour demeure suspendu ; GELORE2 attend le fournisseur.

## E — Recettes réellement restantes

Réutiliser les preuves clone/navigateur/PDF et intégrités acquises. Ne lancer une nouvelle recette que pour une modification depuis la preuve ou une condition non démontrée : créneaux manuellement révisés, approbation de version, disponibilité actuelle, application des décisions, observation terrain des sessions #22. Un cas QV-DOMAINE-F7 doit d'abord être identifié précisément. Le témoin Annulé de #20 était en mémoire ; ne pas créer une annulation en production pour compléter l'audit.

Aucun parcours dynamique pouvant initialiser le schéma ne doit être exécuté sous mandat strictement READ ONLY. Préparer une méthode sans mutation avant une vérification authentifiée future ; aucun nouveau serveur ou environnement demandé automatiquement ici.

## F — Conditions de validation annuelle2027

1. Décision MOA explicite sur le Programme et clôture Codir confirmée ; paramètres cohérents avec Rapport23.02, cycle24.02, exception PAPR préparatoire et statistiques civiles.
2. Arbitrages bloquants et contrôles actifs résolus ou dérogés uniquement selon règles autorisées, avec motifs.
3. Sept modules PAPR distincts, thèmes/références/horaire, modules1/2 avant premier PR1.1 ; aucune décision humaine écrasée.
4. Révisions ciblées réellement confirmées selon l'état courant ; pas de déclaration de résolution parce qu'une PR technique est fusionnée.
5. Qualification des familles et publics sur le périmètre requis par la MOA, sans inventer la portée de validation du stock historique.
6. Preuves de recette et décision de validation conservées ; aucun simple PASS technique ne suffit.

## G — Conditions de publication opérationnelle

GO distinct de la validation annuelle. Réutiliser le plan/exécuteur/store de publication existants, contrôle de droits `events:publish`, version/empreinte, conservation des liens et anti-doublons. Exclure occupations externes du suivi SCOPE ; une activité interne non évaluée peut rester publiable selon son workflow. Préserver Stat.Com/codes et données de présence ; confirmer les impacts humains sur les révisions majeures.

Démontrer ensuite les assignations réelles, programmes individuels et communication initiale. Ajouts/modifications/annulations : information individuelle des seules personnes concernées ; pas de renvoi systématique des programmes initiaux. Aucun envoi n'est autorisé par cet audit.

## Prochain jalon recommandé

Une revue MOA consolidée des **13 dossiers de résolution** et des conditions de clôture, en s'appuyant sur les preuves acquises et les lectures ciblées du15.10. L'implémentation manquante de QV-RULES-001 doit être séquencée explicitement après stabilisation, sans déduire arbitrairement qu'elle bloque ou ne bloque pas la validation2027. Son critère de dépendance au Programme doit être confirmé lors de cette revue. ProgJour reste après la finalisation QV.

Sources : [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md), [docs/SCOPE_QV_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_20261014.md), [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md), [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md).

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

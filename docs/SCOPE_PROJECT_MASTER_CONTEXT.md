# SCOPE — Contexte maître du projet

Référence documentaire : **16 octobre 2026**, Europe/Zurich. MOA : **SDIS régional du Nord vaudois**. Point d’entrée pour une nouvelle IA ou un développeur ; guide de navigation et de gouvernance, sans remplacer le référentiel détaillé.

Actualisation post-recette MOA du 16.10 : [lot correctif unique #29/#30](SCOPE_QV_CORRECTIF_MOA_20261016.md). Main et production vérifiés à `8a11b2e50ff47932628733b3dbc9715bfe6822b2`, déploiement `6ad1de3ada52eb7d16b98738` ready, publié le 16.10 à 10:21:12.013 Europe/Zurich. Les anomalies de propositions JSP→TP9, dictionnaire JSP et UX sont corrigées techniquement sur branche isolée ; nouvelle recette MOA production EN ATTENTE. Chef formation JSP hors nouveaux choix, historique conservé ; Resp formation dans Commandement et responsables. Conformité par règles distincte de l’harmonisation volontaire explicite ; aucune mutation de production. Le témoin JSP 010JSP.006 validé individuellement et publié est protégé selon le mandat. Les paragraphes suivants décrivent leurs jalons historiques, pas la production courante. GO fusion puis GO déploiement distincts, SHA publié et PASS MOA requis ; Programme2027 NON VALIDÉ.

Actualisation institutionnelle16.10 : [lot OS1.01 / OS1.06 / IndeX](SCOPE_OS_INDEX_UNIFORMISATION_20261016.md), développé depuis main #29 fusionnée `02b034ab5e1d5065373b39b8fb43aa74740b7fa7`. Production toujours #27, sans déploiement de #29 ou de ce lot. Le référentiel Personnel existant porte les métadonnées communes ; trois groupes, abréviations, candidats, contextes et populations FOBA distinctes. Chef matériel JSP est exclu des nouveaux choix selon décision MOA, historique conservé. Aucun import individuel, source des faits réels encore nécessaire. GO fusion et déploiement distincts, SHA publié puis recette MOA exclusivement en production et PASS explicite avant clôture. Les paragraphes suivants sont des jalons datés, pas une autorisation de publication.

Actualisation16.10 : [lot prioritaire fiches et préparation des assignations](SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md), en PR depuis main #28 `b6054b9a9ccd94a7c7e7104dbfbc86c6de111d1a`. Aucun déploiement de ce lot ; production fonctionnelle #27. Le catalogue et le contrat daté avancent, la source réelle des faits individuels reste à arbitrer. **Recette MOA exclusivement en production après GO fusion et GO déploiement distincts, vérification SHA et PASS explicite avant clôture** ; le local reste technique. Les états de capitalisation phase B ci-dessous décrivent leur mandat historique.

## 1. Présentation et priorité

SCOPE suit les personnes, leurs engagements et formations, les événements, obligations, présences et participations, puis leurs statistiques et rapports. QUO VADIS prépare le Programme annuel et ses publications liées. **Priorité absolue : finaliser QUO VADIS 2027. Programme annuel 2027 NON VALIDÉ. Audit phase A AUDIT_INCOMPLET.** La présente phase B capitalise les sources disponibles ; elle ne clôture ni les réserves d’audit ni les décisions métier.

Dépôt : [Sdisnv/monitoringF7](https://github.com/Sdisnv/monitoringF7). Branche de référence : `main`. Production : [SCOPE Online](https://scope-sdisnv.netlify.app), site `scope-sdisnv`, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`. Une nouvelle session doit vérifier les références réelles, sans supposer celles de ce document encore actuelles.

## 2. Philosophie de développement

Application métier cumulative : conserver les fonctions développées, testées et validées ; réutiliser moteurs, composants, référentiels, identifiants et preuves. La MOA définit les règles. L’IA implémente un périmètre autorisé ; elle ne réinterprète ni les dates, ni les fonctions, ni les droits. Une divergence se documente avec sources et chronologie puis se soumet à la MOA.

Avant chaque jalon : lire les décisions applicables, vérifier GitHub, le code déjà présent, les tests et recettes acquis, les anomalies et dépendances ; démontrer la nécessité de la modification. Regrouper les corrections déterministes dans un lot cohérent, limiter les interventions Codex/Cursor et éviter les micro-PR. Aucun audit global automatique à chaque reprise. Aucun moteur parallèle, refonte globale, référentiel concurrent, suppression de capacité ou modification arbitraire de données.

Développement, fusion, publication technique, test technique réussi, recette MOA et validation définitive sont six états distincts. Chaque PASS garde son périmètre, sa date et son environnement ; une recette clone/Chrome n’est pas une recette exhaustive de production ou Safari/Okta.

## 3. Organisation métier et identités

Les OI sont qualifiés par domaine : DPS G1/C1/B1/B2 ; DAP Y1/Y2/Y3/Y4 ; JSP G1/C1/B1. DPS G1 et JSP G1 restent distincts. OI, site, lieu, salle, domaine fonctionnel, famille, nature, spécialisation, cursus, public et responsable sont des axes distincts. CMDT est une portée calculée de diffusion de certaines activités SDIS, pas une nouvelle organisation ou population.

Personne métier et utilisateur applicatif sont distincts ; le NIP rapproche les personnes, pas les comptes. Fonction, responsabilité d’activité, qualification, candidature et affectation ne se remplacent pas mutuellement. Les descriptions libres ne créent aucune personne, qualification, obligation ou affectation. La relation datée PERSONNE–FONCTION–DOMAINE–OI reste manquante pour les extractions fiables de chefs de section ; réutiliser les affectations datées, sans NIP fictif. Voir [rapport #24](SCOPE_QV_PUBLICS_MOA_20261015.md) et [inventaire](audits/20261015/SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md).

## 4. Architecture applicative

[Guide des dix-huit blocs métier et interactions](project-context/SCOPE_ARCHITECTURE_ET_MODULES.md).

Interface JavaScript et composants existants dans [assets/js](../assets/js), service métier [scope](../netlify/lib/_scope-service.js), fonctions serveur dans [netlify/functions](../netlify/functions), PostgreSQL et bootstrap de schéma [existant](../netlify/lib/_scope-schema.js), autorisations [RBAC](../netlify/lib/_rbac.js). QUO VADIS réutilise [service préparatoire](../netlify/lib/_scope-quo-vadis-service.js), [couverture](../assets/js/scope-qv-coverage.js), [logique commune](../assets/js/scope-ui-logic.js), [CTA](../netlify/lib/_scope-cta-rules.js), [plan](../netlify/lib/_scope-qv-publication-plan.js), [exécuteur](../netlify/lib/_scope-qv-publication-executor.js) et [magasin PostgreSQL](../netlify/lib/_scope-qv-publication-postgres-store.js). La présence de ces composants ne prouve pas la chaîne annuelle complète acceptée.

Chaîne **conceptuelle** : PERSONNE → AFFECTATION DATÉE → QUALIFICATION → PUBLIC APPLICABLE → ÉVÉNEMENT → OBLIGATION → PRÉSENCE → STATISTIQUE. Elle exprime une dépendance métier, pas une liste de clés étrangères PostgreSQL. Le calcul d’éligibilité croise plusieurs axes à la date réelle et ne confère pas automatiquement une qualification.

L’inventaire phase A recense les tables réellement lues (113 `scope_*` au relevé), notamment `scope_personnes`, `scope_affectations`, `scope_person_qualifications`, `scope_evenements`, `scope_attendus`, `scope_participations` et le journal. Aucune nouvelle lecture SQL ou FK n’est déclarée vérifiée par cette PR. Pour une relation physique, vérifier le DDL/migration et le catalogue réel approprié avant de l’affirmer ; ne pas inventer de contrat API. Les GET qui initialisent le schéma ne sont pas une méthode de contrôle strictement sans écriture.

## 5. Sources de vérité et lecture obligatoire

Ordre de reprise : ce contexte, [canon QV](business-rules/quo-vadis-canonical-rules.md), [roadmap consolidée](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo consolidée](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), [décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md), puis les sources du jalon. Lire intégralement à la reprise de fond : [roadmap V1 et historique](SCOPE_QV_ROADMAP_V1_20261012.md), [MOA14.10 et tableau unique M/P](SCOPE_QV_MOA_20261014.md), [tests19–33](SCOPE_QV_V1_TESTS19_33_20261014.md). Les [huit livrables et leur provenance](audits/20261015/README.md) restent disponibles sans les conversations.

## 6. Hiérarchie des décisions et chronologie

La décision MOA explicitement datée gouverne le métier ; sa capitalisation applicable est dans le canon et le registre. Rapports et preuves démontrent une portée technique ; le code montre l’existant, sans autoriser une règle nouvelle. Une instruction humaine récente explicite peut remplacer une règle précédente : citer les deux sources, date, périmètre et conséquences. Si le remplacement n’est pas clair, demander l’arbitrage, sans l’inventer.

Les IDs canoniques peuvent se répéter : QV-DAP-002, QV-PUBLIC-008, QV-CYCLE-004, QV-ECA-001, QV-CALENDAR-003 notamment. Toujours qualifier par date, section et intitulé. Exemples de remplacement : PRABC-001 abrogée par PRABC-003 ; fabrication d’instructions CONDUITE-008 désactivée ; liste FAMILY-004 complétée par FAMILY-005 avec Permanent ; présentation d’audit groupée remplacée par sept colonnes ; légendes calendrier ajoutées par CALENDAR-004 ; rattachement CI confirmé sous FOCA par CURSUS-009 ; Chef section de présentation commun après les choix historiques séparés. L’ancien texte reste historique, sans réactivation implicite.

La [baseline](SCOPE_V1_BASELINE.md) est datée du 06.09 ; ses mentions Okta actif ne définissent pas la configuration courante. [MODEL-2](SCOPE_MODEL_2.md) contient un ancien rattachement PR/AUTO sous FOSPEC, tandis que [C1](SCOPE_CANONICAL_FOUNDATIONS_C1.md) distingue les domaines canoniques : citer modèle, version et mécanisme avant toute évolution, sans migration implicite du legacy. Les mentions CMDT « non publié / GO attendu » dans les rapports pré-fusion #27 sont dépassées par la vérification de livraison et le PASS MOA. Voir les [rectifications détaillées](audits/20261015/SCOPE_AUDIT_INTEGRAL_20261015.md).

## 7. Référentiel métier et navigation

Le [canon existant](business-rules/quo-vadis-canonical-rules.md) reste le référentiel QV. [Index des groupes de règles](project-context/SCOPE_INDEX_REGLES.md) : CTA, DPS, DAP, JSP, PR/PAPR, AUTO, FOBA/FOCO/FOCA/FOSPEC, cursus, sections/demi-sections, permanences, publics/responsables, cycles/reconduction/publication/révisions, rapports/statistiques. Il pointe vers les IDs, composants, décisions et preuves existants ; il ne réécrit pas les règles.

## 8. Fonctionnalités et recettes acquises

Les [acquis #20–#27](audits/20261015/SCOPE_AUDIT_INTEGRAL_20261015.md) et leurs preuves exactes restent visibles :

| PR | Acquis et source | Portée MOA à conserver |
|---|---|---|
| #20 | [Familles, filtres, DAP](SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) | Corrections techniques et décisions démontrées ; pas de validation globale extrapolée |
| #21 | [Permanent, classifications, référentiels/OI](SCOPE_QV_MOA_CONSOLIDE_20261015.md) | Permanent acquis, onze familles ; corrections déterministes ne pas rejouer |
| #22 | [Conduites, créneaux, reconnexion/brouillons, CI/publics](SCOPE_QV_COMPLEMENT_MOA_20261015.md) | Corrections ciblées ; veille physique/expiration Okta réelle non démontrées |
| #23 | [Horaires verticaux](SCOPE_QV_HORAIRE_LAYOUT_20261015.md) | PASS MOA |
| #24 | [Public cible / Responsable](SCOPE_QV_PUBLICS_MOA_20261015.md) | PASS partiel |
| #25 | [Échelon0, et/à, préparation/calendrier/dates](SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) | PASS partiel |
| #26 | [Alertes bidirectionnelles, groupes, SDIS transversal](SCOPE_QV_PREPARATION_SDIS_20261015.md) | PASS sur cas démontrés |
| #27 | [Diffusion CMDT](SCOPE_QV_CMDT_20261015.md) | PASS MOA sur périmètre contrôlé ; Y1 96 /G1 384 /SDIS46, aucune duplication observée |

Les résultats #27 reçus de la MOA sont conservés dans les [sources humaines](project-context/SCOPE_MOA_SOURCES_20261015.md). Les comptes clone différents sont datés et non comparables sans périmètre commun. Aucun compteur de recette ou du Programme n’est un invariant de production.

## 9. Non-régression et gels

Préserver IDs, sources/lignées, Stat.Com, codes, dates humaines, validations, publications, affectations, qualifications, présences et historique. Ne pas remplir un NULL sans source (notamment publication EM). Pas de doublon déduit d’un titre ; réviser le même événement selon version/motif et workflow. Ne pas convertir les publics descriptifs en obligations. Préserver CTA perpétuel, réserves exclues, sections/demi-sections,56 conduites DPS et16 soirées DAP selon règles applicables, sans généralisation de quotas.

Gel budget DAP Y1 /070F23/070F23.006 et rapprochement IndeX conservés selon QV-FREEZE-20261014. Les PDF conformes restent acquis ; le complément QV-PDF-003 largeur/ASCII ne modifie ni les données horaires ni le vertical web #23. Aucune régression technique alléguée sans occurrence et preuve.

## 10. Roadmap unique

[Roadmap consolidée phase A](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), capitalisée et non reconstruite. Les fiches conservent source/date/priorité/module/dépendances/développement/tests/MOA/travaux/critères/preuves/prochain jalon. Les sections anciennes sont datées, les rectifications #23–#27 prévalent. La [roadmap V1](SCOPE_QV_ROADMAP_V1_20261012.md) devient navigation et historique vers ces vues, sans liste concurrente dans ce contexte.

États à distinguer : ACQUIS VALIDÉ, DÉVELOPPÉ NON VALIDÉ, PARTIELLEMENT DÉVELOPPÉ, À DÉVELOPPER, BLOQUÉ MOA, ANOMALIE OUVERTE, NON VÉRIFIÉ. Une absence de preuve ne démontre pas une anomalie. Une maquette validée ne vaut pas parcours terminé. Les priorités proposées restent à arbitrer par la MOA.

## 11. ToDo unique

[ToDo opérationnelle capitalisée](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), même document phase A avec métadonnées enrichies en place : ID/description/priorité/module/dépendances/responsable de décision/état/preuve/clôture. T-xx est un repère documentaire, pas une règle métier. Les tâches historiques restent datées et ne sont pas supprimées sans preuve de clôture. La capitalisation phase B est désormais autorisée ; elle ne donne aucun GO de développement, de fusion ou de déploiement.

## 12. Anomalies et limites

[Registre des anomalies](audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md), avec preuve et qualification. DAP Y1 exercice10.02/cours10.03, délai−28 jours : contrôle critique démontré dans #26 ; état courant non relu. Relations mixtes, fonctions datées, dates/arbitrages et révisions restent distincts des correctifs techniques livrés. Écarts statiques sécurité de phase A restent datés et à qualifier, pas des fuites démontrées. Aucun appel de route sensible, export nominatif ou test de droits réalisé par cette phase B.

Réserves conservées : **AUDIT_INCOMPLET**, couverture historique non exhaustive, preuves pas toutes reliées, recettes réelles non démontrées, **PDF témoin NON OBTENU**, causalité Netlify non établie, Programme 2027 NON VALIDÉ. Voir [diagnostic distinct](audits/20261015/SCOPE_DIAGNOSTIC_NETLIFY_20261015.md) :312 requêtes,23x499 et6x401, aucun 5xx retourné sur la fenêtre14:46:53–15:46:53 suisse ; pas l’ancien 247/10,93%. Aucune cause n’est attribuée sur la seule proximité de #27.

## 13. Arbitrages MOA

[Registre des décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md) et [tableau unique M1–M7/P1–P6](SCOPE_QV_MOA_20261014.md). Les dates JSP 17.02/23.06,18:30–20:30 et maintien EM 16.02 sont approuvés ; application/révisions distinctes, à vérifier sur état courant, sans redemander ces dates. M2 Vulcain souhaitée n’est pas disponibilité démontrée ; M3 une seule action FVSP pour deux paires. P1/P3/P4/P5 exigent arbitrage fonctions/animation ; une autre salle ne libère pas une fonction commune. Capacité/équipement ne se déduisent pas d’une salle libre. Date cadres DAP 4 Y2 et clôture Codir10.02.2028 provisoire restent à décider selon dernières preuves.

## 14. État technique de production à la capitalisation

Contrôle direct GitHub/Netlify le 15.10.2026 : main `3bdad82029ef79ea721bcf4043a5bb47e4d86764`, PR #27 fusionnée13:09:20 UTC, aucune PR ouverte avant cette livraison documentaire. Déploiement publié `6ad0d08255cda461366136f2`, ready, même SHA, publié13:09:59.769 UTC /15:09:59.769 suisse. Cette PR sera une nouvelle référence documentaire de branche, pas le SHA fonctionnel publié. Vérifier à nouveau avant toute intervention.

Ne pas confondre publication Netlify et validation/publication du Programme annuel. PREPARATION est l’état du relevé SQL versionné PR #27 à12:24:08 UTC ;878 préparations/125 liens sont des objets persistés, pas les925 séances MOA. Aucun nouveau comptage SQL réalisé pendant la phase B.

## 15. Reprise immédiate

Appliquer le [protocole de reprise](project-context/SCOPE_REPRISE_ET_LIVRAISON.md), puis copier le [prompt officiel](SCOPE_NEW_CONVERSATION_PROMPT.md). Identifier le jalon et ses dépendances dans les deux vues uniques ; vérifier les sources, main/PR et production ; restituer acquis/besoins/anomalies/décisions et le périmètre proposé. **Validation MOA avant développement**, sans redemander les décisions déjà acquises. Pas de nouvel audit global automatique.

## 16. Protocole Codex/Cursor

Un intervenant responsable et une branche isolée par lot cohérent, depuis main vérifié ; ne pas incorporer les changements étrangers du checkout partagé. Périmètre autorisé explicite, analyse de l’existant avant édition, diff minimal. Ne pas transformer un prompt documentaire en commande de mutation. Aucun secret, jeu de personnes, token ou snapshot privé dans Git. Relier exigence, code, scénario, preuve et acceptation ; mettre à jour les mêmes documents à chaque jalon. Voir [procédure détaillée](project-context/SCOPE_REPRISE_ET_LIVRAISON.md).

## 17. Recette

Réutiliser les preuves acquises. Tester uniquement la différence nouvelle et les dépendances dont un changement impose une preuve ; distinguer unit/clone/navigateur/PDF/production et technique/MOA. Les tests de mutation sont confinés à un environnement autorisé, avec contrôle de cible et rollback vérifié ; aucune migration en production pour « vérifier ». Comparer invariants réels et données avant/après selon le contrat, sans transformer les compteurs datés en contraintes. La [matrice](audits/20261015/SCOPE_MATRICE_TRACABILITE_20261015.md) reste honnête sur ses rapprochements statiques.

## 18. Publication et continuité

La saisie en production doit rester accessible, sans gel général pour documentation. Préserver consultation/enregistrement/validation/publications/présences/affectations/historiques. Autorisations distinctes : développement, recette, fusion, publication technique, validation annuelle et publication métier. Cette phase B autorise une PR documentaire seulement, **sans fusion ni déploiement**. Un commit et un titre de PR `[skip netlify]` évitent les builds automatiques selon la [documentation Netlify](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/), sans modifier la configuration.

Chaîne métier attendue : **validation annuelle → publication → création/liaison événements → assignations → programmes individuels → communication → modifications ultérieures**. [Plan de finalisation par étape](audits/20261015/SCOPE_PLAN_FINALISATION_QV_20261015.md) : existant, manque, validations, dépendances/anomalies, décisions et critères. Ne pas annoncer les programmes individuels/communication livrés parce que les filtres OI fonctionnent. Ajouts/changements/annulations sont communiqués aux seules personnes concernées, sans renvoi systématique du programme initial ; aucun envoi autorisé par cette PR.

## 19. Incidents

SCOPE-PROD-001 et SCOPE-INCIDENT-001 : signalement → qualification → priorité → correction → test ciblé → publication autorisée → vérification → clôture. Réutiliser le suivi existant ; pas de deuxième système sans nécessité démontrée. CRITIQUE/MAJEURE/MODÉRÉE/MINEURE selon impact réel ; incident différent d’évolution. Une urgence de production peut être traitée indépendamment d’un grand jalon, sous mandat adapté et contrôles de continuité. Retour arrière ciblé/versionné et vérifié ; aucune restauration globale de données non autorisée, aucune réduction de sécurité pour diminuer un taux d’erreurs.

## 20. Développements futurs et résultat attendu

Conserver QV-CONTROLE-QUALITE-001, QV-PLANIF-ALTERNATIVES-001, QV-CONSULTATION-001, QV-RULES-001, QV-CYCLE-007 et QV-PDF-003 complément MOA dans la roadmap unique. Les trois nouveaux IDs QV et les deux IDs SCOPE d’exploitation restent des identifiants proposés de mission, pas une implémentation livrée. `proposeBestDates` existe déjà ; compléter entrées/explications/contraintes non vérifiées plutôt que recréer le moteur. Le contrôle qualité doit intégrer les axes demandés et empêcher une validation avec blocage non résolu ; aucune autocorrection. Consultation EM dans la même app/RBAC, protections serveur et droits de saisie existants préservés.

Cours ECA, observations/évaluations, IndeX et ECAwin gardent leurs contrats et dépendances. **ProgJour suspendu ; GELORE2 dépendant fournisseur**. Ne rien développer dans ce lot. Prochain résultat recommandé : revue MOA des documents et du dossier de bloqueurs QV2027, obtention du PDF témoin, qualification des relations mixtes/fonctions et des arbitrages ; autoriser ensuite le seul jalon nécessaire. La capacité de transfert documentaire peut être READY_FOR_MOA tout en conservant AUDIT_INCOMPLET pour la phase A.

Preuves de livraison documentaire : [contrôles phase B et périmètre](project-context/SCOPE_PHASE_B_CONTROLES_20261015.md).

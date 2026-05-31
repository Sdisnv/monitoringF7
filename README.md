# Monitoring F7 v65 - synchronisation maîtrisée optionnelle

Cette livraison découpe le fichier HTML monolithique v47 en une arborescence exploitable localement.

## Lancement

1. Décompresser le ZIP.
2. Ouvrir `index.html` dans un navigateur moderne.
3. Première connexion :
   - NIP ECA : saisir le NIP utilisateur
   - Mot de passe temporaire : `1234`
   - Remplacer immédiatement ce mot de passe dans les champs affichés.

## Sécurité du login

Le login fourni est une barrière locale pour usage interne hors serveur. Ce n'est pas une sécurité forte : l'application reste statique côté client et le stockage est dans le navigateur.  
Le mot de passe temporaire n'est pas stocké en clair dans le code : seul son hash SHA-256 est utilisé. Après remplacement, le hash du nouveau mot de passe est stocké en localStorage.

Pour une production serveur, remplacer `assets/js/auth.js` par une authentification côté serveur avec sessions, politique de mots de passe, journalisation et révocation.

## Arborescence

- `index.html` : structure HTML extraite du fichier v47.
- `assets/css/` : feuilles CSS chargées séparément.
- `assets/js/app.js` : logique métier v47 conservée pour éviter les régressions.
- `assets/js/auth.js` : barrière de login locale.
- `assets/js/data/` : points d'extension import/export/données.
- `assets/js/calculations/` : points d'extension calculs métier.
- `assets/js/render/` : points d'extension rendu.
- `assets/js/ui/` : points d'extension interactions UI.
- `assets/js/utils/` : utilitaires simples isolés.
- `assets/data/` : JSON de contrôle fourni.
- `assets/docs/arborescence-monitoring-sdis.pdf` : documentation de l'arborescence.

## Principe de refactorisation retenu

La logique métier originale est conservée dans `assets/js/app.js` pour garantir le comportement v47 : imports JSON, exports JSON/CSV/PDF, KPI, graphiques, DAP, PR/PAPR, séries, appendices, stockage local.

Les fichiers spécialisés sont prêts pour l'extraction progressive. Pour éviter de casser la production, déplacer les fonctions une par une depuis `app.js` vers le fichier correspondant, puis tester immédiatement.

## Contrôle qualité effectué

- Structure ZIP générée.
- `index.html` référence les fichiers CSS/JS.
- `app.js` contient la logique v47 extraite.
- Login local ajouté.
- PDF d'arborescence généré.
- JSON de contrôle inclus.
- Logo local inclus pour éviter une référence image cassée.

## Évolution v48 — séparation Monitoring F7

Cette version ajoute une couche non destructive pour séparer clairement :

- Tableau de bord / Monitoring : lecture et synthèse.
- Événements à traiter : statuts opérationnels persistants.
- Import événements : prévisualisation CSV/JSON et import non destructif.
- Formations : saisie et modification isolées.
- Effectifs : consultation et mise à jour séparées.
- Administration : fonctions sensibles protégées par code local.
- Paramètres / Sauvegarde : export et restauration complète du stockage local.

Documentation complémentaire :

- `docs/MODIFICATIONS_V48.md`
- `docs/NETLIFY_GITHUB_PERSISTANCE.md`

Le rouge principal est centralisé via `--sdis-primary-red` avec la valeur `#cc0000`, correspondant au code couleur publié dans l’espace presse du SDIS Nord vaudois.


## Évolution v50 — logo, audit sécurité et compatibilité Netlify/GitHub

Base de travail : Monitoring F7 v48. La v50 conserve le fonctionnement statique/offline-first, IndexedDB/localStorage, les imports/export existants, les KPI, graphiques et calculs métier.

### Publication GitHub → Netlify

1. Décompresser `Monitoring_F7_v65.zip`.
2. Committer les fichiers applicatifs dans le dépôt GitHub, sans ajouter de données utilisateur exportées ni fichiers temporaires.
3. Laisser Netlify publier le dossier statique contenant `index.html`. Aucun backend ni build obligatoire n’est requis.
4. Après publication, ouvrir l’URL Netlify et contrôler le login, le logo, les onglets, les imports/export et les graphiques.

### Persistance des données

Les données utilisateur restent dans le navigateur via localStorage/IndexedDB. Un remplacement complet des fichiers sur GitHub/Netlify ne supprime pas ces données locales. Un export de sauvegarde reste conseillé avant toute grosse mise à jour ou changement de poste/navigateur.

### Première installation

L’application doit s’ouvrir directement via `index.html` ou depuis Netlify gratuit. Les assets, CSS, JS et données statiques utilisent des chemins relatifs. La première connexion conserve la barrière locale existante et impose le remplacement du mot de passe temporaire.

## Évolution v50 — Stabilisation critique pré-production Netlify

Base de travail : Monitoring F7 v49. La v50 correspond à la Phase 1 de stabilisation critique : session locale robuste, validation imports JSON/CSV, clarification Admin local, fallback graphiques et configuration `netlify.toml` réaliste pour Netlify gratuit.

Cette version ne fournit pas d’authentification serveur forte. Le mode Admin local reste une barrière UX navigateur/offline-first.

## Évolution v51 — Sécurisation réaliste Netlify client-only

Base de travail : Monitoring F7 v50. La v51 renforce la sécurité réaliste côté navigateur sans backend obligatoire et sans transformation en framework.

Principes conservés : application statique, ouverture locale possible, Netlify gratuit, IndexedDB/localStorage, imports/export, KPI, graphiques et workflows SDIS.

Ajouts principaux :

- helpers DOM centralisés (`safeText`, `safeSetHTML`, sanitation minimale) ;
- couche `MonitoringSecurity` pour réduire les risques XSS simples ;
- validation JSON renforcée avec rollback en cas d’échec ;
- validation CSV renforcée : taille, séparateur, encodage, en-têtes métier ;
- session locale clarifiée avec expiration douce et nettoyage ;
- confirmations supplémentaires sur imports et effacement local ;
- gestion globale des erreurs JavaScript et promesses rejetées ;
- stockage local plus robuste via `MonitoringStorage` ;
- `netlify.toml` durci avec CSP, permissions-policy et headers cohérents.

Limite importante : la v51 reste client-only. Elle ne fournit pas d’authentification institutionnelle forte, pas d’audit trail sécurisé et pas de contrôle d’accès fiable contre un utilisateur local malveillant. Ces points nécessitent un backend optionnel dans une phase future.


## Évolution v52 — Modularisation progressive calculs / UI / helpers

Base de travail : Monitoring F7 v51. La v52 correspond à la Phase 3 de modularisation progressive. Elle ne refond pas l’application : elle commence à rendre les fichiers spécialisés réellement actifs tout en conservant le cœur métier historique dans `assets/js/app.js`.

Ajouts principaux :

- helpers DOM réellement centralisés dans `assets/js/utils/dom.js` ;
- helpers numériques, dates et formatage exploités par `app.js` via wrappers compatibles ;
- façade `window.MonitoringF7` pour préparer les futures extractions sans casser les appels globaux ;
- rendu graphiques centralisé dans `assets/js/render/render-charts.js` avec wrappers historiques conservés ;
- façade KPI dans `assets/js/render/render-kpis.js` ;
- validation JSON extraite dans `assets/js/data/import-json.js` avec compatibilité v51 ;
- helpers export JSON dans `assets/js/data/export-json.js` ;
- façades de calcul pur dans `assets/js/calculations/summary.js` et `assets/js/calculations/series.js`.

La v52 conserve les protections v50/v51, Netlify gratuit, l’ouverture locale, IndexedDB/localStorage, les imports/export existants, les KPI, les graphiques et les workflows SDIS.

## Évolution v53 — Phase 4 stockage IndexedDB progressif

Base de travail : Monitoring F7 v52. La v53 introduit un `StorageService` central dans `assets/js/storage.js` afin de préparer une migration progressive et non destructive de `localStorage` vers IndexedDB.

Principes conservés :

- fonctionnement offline-first ;
- ouverture locale de `index.html` ;
- compatibilité Netlify gratuit et GitHub ;
- conservation des clés `localStorage` historiques ;
- fallback localStorage si IndexedDB est indisponible ;
- aucune modification volontaire des calculs métier, KPI, graphiques ou workflows SDIS.

La migration v53 copie les données historiques vers IndexedDB lorsqu’il est disponible. Les données d’origine restent en place dans `localStorage` afin de permettre un retour arrière simple.


## Évolution v54 — Phase 5 rationalisation KPI et graphiques

Base de travail : Monitoring F7 v53. La v54 améliore la lisibilité commandement des KPI et la robustesse des graphiques sans modifier les règles métier ni imposer de backend.

Ajouts principaux :

- hiérarchisation des KPI de synthèse : exercices comptabilisés, convoqués, présents, excusés, absents non excusés, taux brut et taux net ajusté ;
- alertes métier non bloquantes sur les données vides, taux faibles, incohérences simples et références manquantes ;
- durcissement de `assets/js/render/render-charts.js` : canvas absent, dataset vide, valeurs nulles, NaN/Infinity, fallback Chart.js et destruction propre ;
- conservation des calculs sources existants et des exports/imports ;
- documentation Phase 5 dans `docs/RAPPORT_KPI_GRAPHIQUES_PHASE_5_V54.md`.

## Évolution v55 — Phase 6 Dashboard commandement simplifié

Base de travail : Monitoring F7 v54. La v55 ajoute une vue clairement identifiable **Dashboard commandement** destinée à la lecture rapide en réunion, sans modifier les règles métier ni les calculs existants.

Ajouts principaux :

- renommage de l’entrée principale en `Dashboard commandement` ;
- bloc supérieur de lecture rapide avec 6 KPI visibles maximum ;
- tableau de comparaison commandement par domaine dans l’ordre FOBA, PR, DPS, DAP, AUTO, JSP ;
- graphique principal simplifié sur le taux de présence brut par domaine ;
- bloc `Points de vigilance` conservé et renforcé comme alerte non bloquante ;
- CSS responsive et print léger pour préparer une future synthèse imprimable ;
- documentation Phase 6 dans `docs/RAPPORT_DASHBOARD_COMMANDEMENT_PHASE_6_V55.md`.


## Évolution v56 — Phase 7 journalisation locale et traçabilité légère

Base de travail : Monitoring F7 v55. La v56 ajoute une journalisation locale utile au diagnostic pilote et au support utilisateur, sans backend, sans refonte UI et sans modification des calculs métier.

Ajouts principaux :

- nouveau service `assets/js/audit-log.js` avec `logInfo`, `logWarning`, `logError`, `logAction`, `getLogs`, `clearLogs`, `exportLogs` et `getLogDiagnostics` ;
- journalisation locale des ouvertures, login/logout, imports, exports, erreurs globales, erreurs stockage, migrations et actions sensibles ;
- rotation automatique du journal, limitée aux 1000 dernières entrées ;
- nouvelle section discrète `Diagnostic local` dans `Gestion Monitoring` ;
- export JSON du journal support avec diagnostic de stockage ;
- documentation Phase 7 dans `docs/RAPPORT_JOURNALISATION_PHASE_7_V56.md`.

Limite volontaire : ce journal reste client-only, modifiable localement, non centralisé et non infalsifiable. Il ne remplace pas un audit serveur institutionnel.


## Évolution v57 — Phase 8 préparation backend optionnel futur

Base de travail : Monitoring F7 v56. La v57 prépare une architecture backend future sans l’activer. Le fonctionnement reste strictement local/offline-first : ouverture directe de `index.html`, Netlify gratuit, IndexedDB/localStorage, imports/export, audit-log, dashboard commandement, KPI et graphiques sont conservés.

Ajouts principaux :

- `assets/js/backend-config.js` : configuration backend optionnel, désactivée par défaut ;
- `assets/js/api-client.js` : façade API préparatoire qui ne déclenche aucune requête si le backend est désactivé ;
- `assets/js/sync-service.js` : service de synchronisation future, inactif en v57 ;
- renforcement de `AuthService` autour de la session locale existante ;
- diagnostic local enrichi avec backend désactivé, stockage local, auth locale et synchronisation inactive ;
- documentation Phase 8 dans `docs/RAPPORT_BACKEND_OPTIONNEL_PHASE_8_V57.md` et `docs/API_BACKEND_OPTIONNEL_V57.md`.

Limites assumées : aucun backend réel n’est ajouté, aucune authentification forte serveur n’est fournie, aucun audit serveur ni aucune synchronisation réelle ne sont activés.


## Évolution v58.3 — Phase 9 stabilisation finale pré-release / contrôle qualité global

Base de travail : Monitoring F7 v57. La v58.3 consolide la version pilote sans ajouter de nouvelle grande fonctionnalité et sans modifier les règles métier.

Contrôles principaux effectués :

- alignement version v58.3 dans `index.html`, `assets/js/config.js`, footer/version visible, diagnostics et documentation ;
- contrôle de l’ordre des scripts : configuration, backend préparatoire, audit-log, état, sécurité, StorageService, AuthService, helpers, imports/export, calculs, rendu, UI, cœur métier puis couche d’évolution ;
- vérification du modèle Netlify gratuit : application statique, `publish = "."`, aucun build obligatoire, aucun serveur requis ;
- conservation du backend optionnel désactivé, de `SyncService` inactif et du fonctionnement local/offline-first ;
- conservation des clés de stockage existantes lorsque nécessaire pour éviter toute perte des journaux ou données locales ;
- documentation pré-release ajoutée dans `docs/RAPPORT_STABILISATION_FINALE_V58.md`, `docs/PROCEDURE_DEPLOIEMENT_V58.md`, `docs/CHECKLIST_RECETTE_PILOTE_SDIS_V58.md` et `docs/FICHIERS_MODIFIES_V58.md`.

Limites rappelées : Monitoring F7 v58.3 reste une application client-only offline-first. Elle est compatible Netlify gratuit et GitHub, mais ne fournit pas de sécurité institutionnelle forte, pas de backend réel, pas de synchronisation réelle et pas de multi-utilisateur centralisé.

## Évolution v58.3 — Correction profil / événements / stockage local

Base stricte : `Monitoring_F7_v58.zip`.

Livrable : `Monitoring_F7_v58.3.zip`.

Objectif : corriger les constats post-mise en ligne serveur sans ajouter de backend réel et sans modifier les règles métier.

Corrections principales :

- clarification du message Profil / Paramètres utilisateur avec le titre `Profil local Monitoring F7` ;
- clarification de l’information session avec version `v58.3` ;
- rappel que le NIP protège uniquement l’accès local à l’interface ;
- correction et durcissement du flux `Sélectionner un événement importé…` / import événements annuels ;
- journalisation audit-log non intrusive du flux d’import événements ;
- message utilisateur clair en cas de fichier événement invalide ;
- documentation ajoutée sur les limites du stockage local navigateur et les options futures Netlify Blobs / base de données.

Maintiens explicites :

- mode offline-first conservé ;
- `localStorage / IndexedDB` conservés ;
- `StorageService` conservé ;
- `backendEnabled = false` ;
- `SyncService` inactif ;
- aucun appel réseau obligatoire ajouté ;
- Netlify gratuit conservé ;
- imports/exports existants conservés ;
- KPI, graphiques et règles métier non modifiés.

Documentation v58.3 :

- `docs/FICHIERS_MODIFIES_V58_3.md` ;
- `docs/RAPPORT_CORRECTION_V58_3.md` ;
- `docs/STOCKAGE_LOCAL_ET_EVOLUTION_BACKEND_V58_1.md`.


## Évolution v58.3 — Correction date de référence événements à traiter

Livrable : `Monitoring_F7_v58.3.zip`.

Correction ciblée : la liste « Événements à traiter » est désormais limitée aux événements non traités dont la date est inférieure ou égale à la date locale du jour de connexion. Les événements futurs restent conservés dans l’application, mais ne sont plus affichés comme événements à traiter aujourd’hui.

Le mode offline-first est conservé. Aucun backend réel n’est ajouté. `backendEnabled` reste désactivé et `SyncService` reste inactif.

## Évolution v58.4 — Stabilisation courte événements / session / documentation

Livrable : `Monitoring_F7_v58.4.zip`.

Objectif : corriger uniquement les divergences constatées lors de l’audit v58.3, sans refonte, sans backend et sans modification des KPI ou règles métier.

Corrections principales :

- règle centralisée `MonitoringEventRules` pour les événements à traiter ;
- limitation appliquée aussi dans le cœur historique `app.js` : événements non traités avec date locale inférieure ou égale au jour de connexion ;
- événements futurs conservés mais exclus des événements à traiter ;
- rafraîchissement immédiat du profil local après connexion via événement de session navigateur ;
- alignement version visible et version centrale en `v58.4` ;
- correction de la référence documentaire stockage local.

Maintiens explicites :

- `backendEnabled = false` ;
- `SyncService` inactif ;
- application statique compatible Netlify gratuit ;
- stockage local `localStorage / IndexedDB` conservé ;
- aucun framework, aucun build, aucun backend ajouté.

Documentation v58.4 :

- `docs/FICHIERS_MODIFIES_V58_4.md` ;
- `docs/RAPPORT_CORRECTION_V58_4.md` ;
- `docs/STOCKAGE_LOCAL_ET_EVOLUTION_BACKEND_V58_4.md`.

## Évolution v59 — Stabilisation ergonomie

Livrable : `Monitoring_F7_v59.zip`.

Objectif : réduire la charge cognitive sans refonte technique, sans backend et sans modification des règles métier.

Corrections principales :

- ajout d’une vue projection COD sur le dashboard ;
- ajout d’un bandeau de synthèse projetable avec situation, priorité et date de référence locale ;
- ajout d’une bascule `Vue synthèse` / `Vue complète` sur la liste des événements ;
- masquage des colonnes détaillées en vue synthèse, tout en conservant la vue complète disponible ;
- ajout d’une barre de messages intégrés pour les retours ergonomiques courts ;
- conservation stricte de `backendEnabled = false` et de `SyncService` inactif.

Documentation v59 :

- `docs/FICHIERS_MODIFIES_V59.md` ;
- `docs/RAPPORT_STABILISATION_ERGONOMIE_V59.md`.

## Évolution v60 — Préparation backend optionnel

Livrable : `Monitoring_F7_v60.zip`.

Objectif : préparer proprement une future centralisation sans activer de backend, sans synchronisation par défaut et sans remettre en cause le pilote offline-first.

Ajouts principaux :

- schéma de données explicite dans `assets/js/data-schema.js` ;
- contrats API documentés côté client dans `assets/js/api-contracts.js` ;
- configuration backend enrichie avec `serverAuthEnabled`, `tokenStorage` et rôle requis, toujours désactivée par défaut ;
- façade API capable de porter un jeton bearer en mémoire si un vrai backend est activé ultérieurement ;
- statut d’authentification clarifié : session locale active aujourd’hui, auth serveur préparée contractuellement mais inactive ;
- diagnostic local enrichi avec schéma de données et contrats API chargés.

Maintiens explicites :

- `backendEnabled = false` ;
- `syncEnabled = false` ;
- `serverAuthEnabled = false` ;
- `SyncService` inactif ;
- application statique compatible Netlify gratuit ;
- aucun build, aucune fonction Netlify, aucune base de données et aucune authentification serveur réellement appelée dans cette livraison.

Documentation v60 :

- `docs/FICHIERS_MODIFIES_V60.md` ;
- `docs/SCHEMA_DONNEES_V60.md` ;
- `docs/CONTRATS_API_V60.md` ;
- `docs/AUTH_SERVEUR_OPTIONNEL_V60.md` ;
- `docs/RAPPORT_PREPARATION_BACKEND_OPTIONNEL_V60.md`.

## Évolution v61 — Ergonomie professionnelle COD

Livrable : `Monitoring_F7_v61.zip`.

Objectif : professionnaliser la première lecture opérationnelle sans modifier les règles métier, sans refonte technique et sans activer le backend.

Corrections principales :

- renommage de la navigation principale en vocabulaire plus opérationnel : `Situation COD`, `Événements`, `Effectifs`, `Analyses`, `Graphiques`, `Administration` ;
- ajout d'une synthèse `Situation COD` en quatre blocs : situation actuelle, vigilance, action attendue et mode local/offline-first ;
- amélioration du mode projection COD avec une lecture plus épurée et plus lisible sur écran ;
- simplification du libellé tableau : `Vue synthèse` / `Détails` ;
- messages intégrés orientés usage métier court ;
- maintien strict de la préparation backend v60 sans activation.

Maintiens explicites :

- `backendEnabled = false` ;
- `syncEnabled = false` ;
- `serverAuthEnabled = false` ;
- `SyncService` inactif ;
- application statique compatible Netlify gratuit ;
- aucun build, aucune fonction serveur et aucune base de données ajoutés ;
- KPI, calculs métier, imports/exports et règles événements conservés.

Documentation v61 :

- `docs/FICHIERS_MODIFIES_V61.md` ;
- `docs/RAPPORT_ERGONOMIE_PROFESSIONNELLE_V61.md`.

## Évolution v62 — Vérification locale des contrats backend

Livrable : `Monitoring_F7_v62.zip`.

Objectif : préparer la prochaine phase backend avec un vérificateur local des contrats API et du schéma de données, sans serveur réel, sans appel réseau et sans synchronisation.

Corrections principales :

- ajout de `assets/js/backend-contract-check.js` ;
- bouton `Vérifier contrats backend` dans le diagnostic local ;
- contrôle local des méthodes HTTP, chemins API, modes d'authentification et réponses documentées ;
- contrôle local de la présence des entités du schéma de données ;
- diagnostic enrichi avec nombre de contrats vérifiés et mock backend désactivé ;
- configuration enrichie avec `contractCheckEnabled` et `mockBackendEnabled`, toujours sans activation backend.

Maintiens explicites :

- `backendEnabled = false` ;
- `syncEnabled = false` ;
- `serverAuthEnabled = false` ;
- `mockBackendEnabled = false` ;
- `SyncService` inactif ;
- aucun appel réseau effectué par le vérificateur ;
- aucun backend, aucune fonction serveur, aucune base de données ajoutés ;
- ergonomie v61, KPI, calculs métier et règles événements conservés.

Documentation v62 :

- `docs/FICHIERS_MODIFIES_V62.md` ;
- `docs/RAPPORT_VERIFICATION_CONTRATS_BACKEND_V62.md`.

## Évolution v63 — Auth serveur optionnelle Netlify

Livrable : `Monitoring_F7_v63.zip`.

Objectif : ajouter une authentification serveur réelle et optionnelle via Netlify Functions, sans l'activer côté client par défaut et sans synchronisation.

Ajouts principaux :

- fonctions Netlify `auth-login`, `auth-me`, `auth-refresh`, `auth-logout` ;
- vérification serveur d'un utilisateur configuré par variables d'environnement ;
- jetons HMAC courts côté serveur, sans dépendance externe ;
- redirects Netlify `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` ;
- conservation de l'auth locale navigateur tant que `backendEnabled` et `serverAuthEnabled` restent désactivés ;
- documentation des variables d'environnement nécessaires.

Maintiens explicites :

- `backendEnabled = false` par défaut ;
- `syncEnabled = false` ;
- `serverAuthEnabled = false` par défaut ;
- `mockBackendEnabled = false` ;
- `SyncService` inactif ;
- aucun stockage central et aucune synchronisation multi-postes ;
- KPI, calculs métier, ergonomie v61 et règles événements conservés.

Documentation v63 :

- `docs/FICHIERS_MODIFIES_V63.md` ;
- `docs/AUTH_SERVEUR_NETLIFY_V63.md` ;
- `docs/RAPPORT_AUTH_SERVEUR_OPTIONNELLE_V63.md`.

## Évolution v64 — Stockage central optionnel

Livrable : `Monitoring_F7_v64.zip`.

Objectif : préparer un stockage serveur optionnel pour les données métier, sans remplacer le stockage local et sans activer la synchronisation.

Ajouts principaux :

- routes Netlify `/records`, `/imported-events`, `/reference-periods` ;
- fonctions `data-records`, `data-imported-events`, `data-reference-periods` ;
- adaptateur serveur `netlify/functions/_data-store.js` basé sur Netlify Blobs si disponible ;
- protection des routes données par bearer token issu de l'auth serveur v63 ;
- diagnostic local enrichi avec le statut `Stockage central` ;
- client API enrichi avec `listRecords`, `replaceRecords`, `replaceImportedEvents`, `replaceReferencePeriods`.

Maintiens explicites :

- `backendEnabled = false` par défaut ;
- `storageMode = local` par défaut ;
- `centralStorageEnabled = false` par défaut ;
- `syncEnabled = false` ;
- `serverAuthEnabled = false` par défaut ;
- `SyncService` inactif ;
- aucune migration automatique vers serveur ;
- aucune synchronisation multi-postes ;
- KPI, calculs métier, ergonomie v61 et règles événements conservés.

Documentation v64 :

- `docs/FICHIERS_MODIFIES_V64.md` ;
- `docs/STOCKAGE_CENTRAL_OPTIONNEL_V64.md` ;
- `docs/RAPPORT_STOCKAGE_CENTRAL_OPTIONNEL_V64.md`.

## Évolution v65 — Synchronisation maîtrisée optionnelle

Livrable : `Monitoring_F7_v65.zip`.

Objectif : préparer une synchronisation contrôlée sans l'exécuter automatiquement, avec contrôle explicite des prérequis et file locale lisible.

Ajouts principaux :

- file de synchronisation v65 avec compatibilité des anciennes files ;
- contrôle `checkReadiness` des prérequis backend, auth serveur, stockage central, sync et jeton d'accès ;
- plan de synchronisation local via `planSync` ;
- bouton `Tester prérequis sync` dans le diagnostic local ;
- diagnostic enrichi avec `Prérequis sync` et `File sync` ;
- aucune exécution automatique même si les prérequis sont réunis.

Maintiens explicites :

- `backendEnabled = false` par défaut ;
- `storageMode = local` par défaut ;
- `centralStorageEnabled = false` par défaut ;
- `syncEnabled = false` par défaut ;
- `serverAuthEnabled = false` par défaut ;
- aucune écriture serveur automatique ;
- aucune résolution de conflit masquée ;
- KPI, calculs métier, ergonomie v61 et règles événements conservés.

Documentation v65 :

- `docs/FICHIERS_MODIFIES_V65.md` ;
- `docs/RAPPORT_SYNCHRONISATION_MAITRISEE_V65.md`.

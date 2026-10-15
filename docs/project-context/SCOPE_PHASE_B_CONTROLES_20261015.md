# Phase B — Contrôles de capitalisation du 15.10.2026

**READY_FOR_MOA pour la PR documentaire.** Ce verdict ne remplace pas **AUDIT_INCOMPLET** pour la phase A ; Programme annuel2027 **NON VALIDÉ**. Le périmètre de sources disponibles est capitalisé ; les réserves ne sont pas réputées résolues. Aucun audit général ou test applicatif relancé.

## Contrôles de référence

GitHub contrôlé directement : `main=3bdad82029ef79ea721bcf4043a5bb47e4d86764`, dernières fusions #20–#27 ; aucune PR ouverte avant cette livraison. Netlify : site scope-sdisnv, déploiement publié `6ad0d08255cda461366136f2`, ready, même SHA, publié le15.10 à13:09:59.769UTC /15:09:59.769Europe/Zurich. Ces vérifications sont datées ; le futur HEAD documentaire de la PR ne devient pas le SHA fonctionnel publié.

Les quatre sources obligatoires et les rapports #20–#27 ont été relus intégralement. Les neuf fichiers reçus (huit livrables et diagnostic distinct) correspondent au manifeste phase A : SHA-256 vérifiés avant import. L’organisation existante docs/ (rapports à plat, business-rules/ et captures/) a été examinée : aucun déplacement massif ; seules les nouvelles pièces d’audit dans audits/20261015 et les guides dans project-context sont ajoutés. Le canon, les rapports historiques et preuves #20–#27 ne sont pas modifiés. Une notice de navigation est ajoutée à la roadmap V1 historique pour éviter les états concurrents.

## Conservation et cohérence

- Les huit livrables ne sont pas reconstruits. Leur contenu substantiel et les preuves citées restent conservés. Le [manifeste de provenance](../audits/20261015/PROVENANCE_PHASE_A.json) distingue l’empreinte source de l’empreinte importée et décrit les seules adaptations éditoriales.
- Une seule roadmap et une seule ToDo consolidées actives. Les champs de tâches ont été enrichis dans la ToDo reçue, sans backlog distinct ; la tâche phase B autorisée est actualisée, les anciennes conditions de GO restent historiques. Sources, états, priorité proposée, dépendances, responsables de décision, preuves et critères sont présents. Aucun nom de décideur individuel ni SLA n’est inventé.
- Les acquis #20–#27 sont conservés ; #23 et#27PASS, #24/#25partiels, #26cas démontrés. Le PASS technique, la fusion, la publication et la validation MOA restent distincts. Les IDs répétés sont qualifiés par section/date ; l’index n’introduit aucun nouvel ID canonique.
- Les repères de tâches T-xx sont documentaires ; les jalons proposés de mission restent proposés, sans développement prétendu. Les remplacements et abrogations explicites restent traçables, pas réactivés.
- M1–M7/P1–P6 et le tableau intégral d’origine restent accessibles. P2/P6 et EM16.02 ne sont pas à redécider. Les changements d’état courant non relus restent NON VÉRIFIÉS ; pas de13conflits automatiquement déclarés ouverts.
- Les sources humaines utiles sont versionnées, dont Permanent et la mission d’actualisation complète. Les nouveaux guides ne nécessitent pas les conversations ou des liens locaux temporaires.

## Vérification documentaire

Contrôle statique sur le dossier préparé : **334 liens locaux** résolus et **822 références GitHub blob** vérifiées par présence des objets `SHA:chemin` dans l’historique Git récupéré depuis origin/main. Les liens de ligne du canon sont épinglés à des lignes présentes ; tous les IDs sélectionnés par l’index proviennent des titres réellement présents. Une référence de fichier valide ne prouve pas à elle seule la couverture métier d’un scénario : la matrice conserve cette réserve.

Contrôle des empreintes des neuf documents importés ; lecture du diff de la roadmap existante ; contrôle du périmètre limité à docs/ ; détection de chemins temporaires, emails, jetons courants, JWT et clés privées : aucun résultat dans les fichiers ajoutés. Les pièces importées contiennent règles, décisions, IDs d’événements et agrégats datés, aucun dossier nominatif, NIP individuel, présence individuelle, IP, cookie ou secret. Les deux JSON de preuve sont des métadonnées techniques normalisées ; aucun snapshot brut de production n’est versionné.

`git diff --check` et inspection des fichiers ajoutés/diff sont requis avant commit, puis contrôle de la PR et de la production publiée après création. Le résultat final, le numéro de PR et le commit documentaire sont fournis dans la livraison GitHub ; ils ne sont pas auto-inscrits dans leur propre commit.

## Limites conservées

AUDIT_INCOMPLET : couverture historique globale non exhaustive ; associations de preuves manquantes ; certaines recettes réelles non démontrées (dont Safari/veille/Okta réel selon cas) ; configuration effective et exposition SQL/RPC non intégralement rapprochées ; disponibilités actuelles/salles/fonctions non garanties par les relevés datés ; PDF compact six pages96séances DAP:Y1 NON OBTENU ; causalité des erreurs Netlify non établie. Aucun contrat IndeX/ECAwin/GELORE2 manquant n’est inventé. ProgJour reste suspendu, GELORE2 attend le fournisseur. La priorité de fond demeure la finalisation QV2027 sous décision MOA.

## Périmètre de livraison

Une seule branche documentaire isolée `codex/scope-capitalisation-phase-b-20261015`, une seule PR demandée. Commit et titre de PR avec `[skip netlify]`, sans modifier de configuration. Aucun code métier, test applicatif, migration, donnée, permission/RLS, Okta ou Netlify modifié. Aucun événement/publication du Programme, présence, affectation, qualification ou envoi créé/modifié. Aucune fusion ni déploiement autorisé par cette mission.

Liste des fichiers de la PR (21) :

- `docs/SCOPE_NEW_CONVERSATION_PROMPT.md`
- `docs/SCOPE_PROJECT_MASTER_CONTEXT.md`
- `docs/SCOPE_QV_ROADMAP_V1_20261012.md`
- `docs/audits/20261015/PROVENANCE_PHASE_A.json`
- `docs/audits/20261015/README.md`
- `docs/audits/20261015/SCOPE_AUDIT_INTEGRAL_20261015.md`
- `docs/audits/20261015/SCOPE_DIAGNOSTIC_NETLIFY_20261015.md`
- `docs/audits/20261015/SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md`
- `docs/audits/20261015/SCOPE_MATRICE_TRACABILITE_20261015.md`
- `docs/audits/20261015/SCOPE_PLAN_FINALISATION_QV_20261015.md`
- `docs/audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md`
- `docs/audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md`
- `docs/audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md`
- `docs/audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md`
- `docs/audits/20261015/proofs/netlify-observability.json`
- `docs/audits/20261015/proofs/phase-a-verification.json`
- `docs/project-context/SCOPE_ARCHITECTURE_ET_MODULES.md`
- `docs/project-context/SCOPE_INDEX_REGLES.md`
- `docs/project-context/SCOPE_MOA_SOURCES_20261015.md`
- `docs/project-context/SCOPE_PHASE_B_CONTROLES_20261015.md`
- `docs/project-context/SCOPE_REPRISE_ET_LIVRAISON.md`

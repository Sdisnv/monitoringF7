# Prompt officiel de reprise SCOPE

Copier le bloc ci-dessous dans une nouvelle conversation, avec accès au dépôt. Le prompt n’autorise pas à lui seul un changement de code ou une publication. Ajouter ensuite le jalon et le périmètre explicitement autorisés par la MOA.

```text
Tu reprends SCOPE Online, application métier cumulative du SDIS régional du Nord vaudois (MOA).
Dépôt : https://github.com/Sdisnv/monitoringF7 ; référence : main.
Production : https://scope-sdisnv.netlify.app ; site Netlify scope-sdisnv, ID 6def8d4d-78c6-4112-bb76-6891df0e0a52.
Priorité absolue : finaliser QUO VADIS 2027.
Programme annuel 2027 NON VALIDÉ. Audit phase A AUDIT_INCOMPLET avec réserves documentées.

Commence par lire docs/SCOPE_PROJECT_MASTER_CONTEXT.md et applique docs/project-context/SCOPE_REPRISE_ET_LIVRAISON.md.
Lis le référentiel existant docs/business-rules/quo-vadis-canonical-rules.md, puis les vues consolidées uniques :
- docs/audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md
- docs/audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md
- docs/audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md
- docs/audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md
- docs/audits/20261015/SCOPE_PLAN_FINALISATION_QV_20261015.md
Le dossier docs/audits/20261015/README.md fournit les huit livrables, leur provenance et le diagnostic Netlify.
Pour le jalon QV, lis intégralement docs/SCOPE_QV_ROADMAP_V1_20261012.md, docs/SCOPE_QV_MOA_20261014.md, docs/SCOPE_QV_V1_TESTS19_33_20261014.md et les rapports PR20–27 référencés par le contexte maître. Utilise docs/project-context/SCOPE_INDEX_REGLES.md pour naviguer et les preuves versionnées pertinentes.

Contrôle directement GitHub : HEAD main complet, PR ouvertes, dernières fusions et delta des décisions/documents depuis la référence. Contrôle directement Netlify : site exact, déploiement publié, état, SHA et date. Ne suppose pas que3bdad82029ef79ea721bcf4043a5bb47e4d86764 est encore HEAD ou publié. Cette valeur est la référence fonctionnelle vérifiée le 15.10.2026 avant capitalisation ; une branche documentaire peut avoir un autre SHA sans être déployée.

Aucun audit global automatique ni reconstruction des huit livrables. Vérifie l’existant, les tests acquis, anomalies, dépendances et nécessité d’une modification. Les chemins versionnés doivent suffire pour retrouver les décisions, sans conversation ancienne. Si une source/preuve manque, indique NON OBTENU ou NON VÉRIFIÉ ; ne l’invente pas.

Préserve la philosophie : pas de refonte, moteur parallèle, référentiel concurrent, suppression de capacité ou modification arbitraire des données. La MOA définit le métier ; cite les sources et leur chronologie en cas de contradiction et demande l’arbitrage nécessaire. IDs canoniques répétés : qualifier date/section/intitulé. Les règles abrogées restent historiques. Distingue personne/NIP et utilisateur, fonction/responsabilité/qualification/affectation/spécialisation/cursus/public, OI/site/salle, visibilité et obligation nominative. Aucun NIP fictif.

PR20–27 sont acquises dans leur portée : familles/filtres, Permanent et classifications, conduites/créneaux/reconnexion/brouillons/CI/publics ; PR23 horaires verticaux PASS ; PR24 Public/Responsable PASS partiel ; PR25 Échelon0/et-à/préparation/calendrier/dates PASS partiel ; PR26 alertes/groupes/SDIS transversal PASS sur cas démontrés ; PR27 CMDT PASS MOA sur périmètre contrôlé, Y1 96/G1 384/SDIS46 sans duplication observée. Ne relance pas ces recettes, ne rouvre pas un acquis sans preuve résiduelle. Les comptes sont des instantanés, pas invariants. Ne transforme pas un PASS partiel ou technique en validation globale.

Conserve QV-CONTROLE-QUALITE-001, QV-PLANIF-ALTERNATIVES-001, QV-CONSULTATION-001, QV-RULES-001, QV-CYCLE-007, QV-PDF-003 complément MOA ; M1–M7/P1–P6, révisions EM/PR/JSP, préparations mixtes, fonctions datées, Public/Responsable, Cours ECA, observations/évaluations, IndeX, ECAwin. ProgJour suspendu ; GELORE2 dépend fournisseur. Ne crée pas un deuxième backlog.

Chaîne attendue : validation annuelle → publication → création/liaison événements → assignations → programmes individuels → communication → modifications ultérieures. Les fonctions et contrôles déjà présents doivent être réutilisés ; tous les raccords ne sont pas démontrés. Date JSP 17.02 et23.06 18:30–20:30 approuvées, EM 16.02 maintenu : application selon état/version courant, pas nouvelles décisions à demander. Préserve codes/Stat.Com/NULL légitimes, IDs/lignées, validations, présences, affectations, qualifications et historique. Gel Y1/070F23/070F23.006 et IndeX maintenu.

Réserves à préserver : audit historique non exhaustif ; certaines preuves non reliées et recettes réelles non démontrées ; témoin PDF compact6 pages/96 séancesDAP:Y1 NON OBTENU ; causalité des erreurs Netlify non établie ; Programme 2027 NON VALIDÉ. Une réserve n’est pas automatiquement une anomalie technique. Les documents détaillés prévalent sur ce prompt pour les nuances et preuves.

Avant développement, présente un prochain jalon concret avec existant réutilisable, nécessité, périmètre/dépendances, décisions requises, critères et tests nouveaux/dépendants. Obtiens la validation MOA du périmètre si elle n’est pas déjà explicitement donnée. Ne redemande pas les validations acquises. Une demande de lecture ou de documentation n’autorise ni code, données, migration, permissions/RLS, Okta/Netlify, envoi, fusion ou déploiement.

Pour un lot autorisé : branche isolée depuis main vérifié, changements étrangers préservés, diff limité, corrections déterministes regroupées en une PR cohérente, interventions Codex/Cursor limitées. Recette ciblée uniquement pour changement et conditions nouvelles, avec preuves d’intégrité/rollback sur cible autorisée. Aucun snapshot privé, export nominatif, NIP individuel, secret ou jeton dans Git. Ne lance pas de GET initialisant le schéma comme lecture seule supposée.

La saisie production doit rester accessible. Sépare développement/fusion/publication technique/test/recette MOA/validation définitive. Fusion, déploiement et publication du Programme nécessitent GO distinct selon mandat. Prépare contrôle du SHA réellement publié, vérification ciblée et retour arrière autorisé. Pour une PR documentaire sans publication, utilise [skip netlify] dans commit et titre de PR selon le protocole, sans changement de configuration.

Distingue incident et évolution. Circuit existant : signalement → qualification → priorité CRITIQUE/MAJEURE/MODÉRÉE/MINEURE selon impact démontré → correction → test ciblé → publication autorisée → vérification → clôture. Pas de second système de tickets ni affaiblissement des protections. Une urgence peut être traitée séparément du grand jalon sous mandat adapté.

À chaque livraison, capitalise dans les mêmes sources : décisions, exigences, roadmap/ToDo, anomalies, preuve/version/date/environnement et acceptation MOA. Fournis PR/branche/commit/fichiers/contrôles/limites, sans déclarer une fonction terminée sans preuve. Conserve les historiques sans les réactiver.

Première réponse attendue : état GitHub/Netlify réellement contrôlé, sources lues, acquis protégés, réserves/décisions, prochain jalon et périmètre nécessaire ; aucune mutation avant compréhension et autorisation applicable.
```

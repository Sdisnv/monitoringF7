# SCOPE / QUO VADIS — lot MOA du 12.10.2026

## A. Référence

GitHub `main` contrôlé directement : `9fde68077f35bede72ef08f3b3dc65ea5f93c224`.
Branche corrective : `codex/scope-qv-moa-consolide-20261012`, depuis ce main.
Le commit final est le HEAD de la PR unique de cette branche ; main reste inchangé avant GO MOA.
Les modifications étrangères du checkout principal sont préservées.

## B. Corrections

- Intitulés exacts des occurrences multi-séances et thèmes conservés, y compris PR 1.1 à 1.6 ; aucune renumérotation.
- Responsables multiples et libres préservés, références inclusives `PrésidentE Codir` / `PrésidentE CI`, domaines et tri ; `À affecter` reste un état vide, jamais un acteur.
- Public permanent `Membres du Codir`, groupement et tri ; public descriptif sans NIP, affectation, obligation individuelle ni contribution automatique aux statistiques.
- Sélections globales DPS, DAP et JSP, état partiel, désélection indépendante et codes qualifiés persistants.
- `EXEPRO` actif, compatibilité historique `EXERPO`, `CONCOUR` inchangé. Défaut `EXERCI` uniquement démontré ; aucune modification de Stat.Com.
- Évaluation individuelle activée par défaut, persistante et reconductible. Défaut des types futurs dans le catalogue existant ; une décision individuelle prévaut.
- Filtrage des participations et des taux, sans retrait des événements de l'Agenda ni destruction des présences ou obligations. Défaut figé à la création et historique protégé contre un changement ultérieur du type.

## C. Preuves

57/57 tests ciblés, 9/9 scénarios Chromium, zéro erreur JavaScript observée.
PR 1.1–1.6 : ouverture, modification du thème, SAVE, retour au Programme et réouverture vérifiés.
Menus vérifiés sur 1440, 960 et 390 pixels ; captures inspectées.
Clone PostgreSQL : 867/867 Stat.Com identiques avant/après défaut, IDs et décisions protégés inchangés.
730 défauts EXERCI confirmés ; 137 autres lignes non forcées, inventaire `ecawin-non-forced-2027.json`.
ROLLBACK : 113 tables inchangées pour la recette backend ; 18 tables non ciblées et autres préparations intactes pour la recette navigateur, rollback intégral PASS.
Publication et filtrage testés sur clone, y compris public Codir descriptif, historique, défaut futur et schéma sans C23.
Séance évaluée ABSENT + séance non évaluée PRESENT : 0/1 en global, individuel et annuaire, présence conservée.
Build Netlify contexte production : PASS, 25 fonctions. Préflight du site : PASS. Diff sans erreur d'espacement.

Preuves : `docs/captures/qv-moa-20261012/` (résultats JSON, intégrité, inventaire et captures).
Les recettes MOA déjà acquises de planification, validation et cohérence ne sont pas redemandées.

## D. Limites

Aucun blocage métier nouveau constaté. Les lignes non qualifiables restent conservées et signalées, sans association inventée.
Deux anciennes suites complètes ont une limite reproduite sur main : simulateur C6 incomplet après 23 contrôles réussis ; test de consolidation après 35 contrôles, attendant un remplacement historique `010JY3` → `010JC1`. Cette attente est contraire à la préservation MOA et n'est pas appliquée.
Les nouvelles corrections du catalogue sont couvertes par les tests ciblés. La validation globale annuelle, les populations datées et les gardes de publication restent en place.
Aucun format définitif d'export ECAwin ni nouveau module hors périmètre n'est introduit.

## E. Données Et Sécurité

Migration `scope-qv-moa-responsible-20261012`, transactionnelle, verrouillée et idempotente : seuls les deux libellés inclusifs du référentiel sont actualisés, avec leurs codes stables et leurs suspensions conservés.
Les décisions d'évaluation utilisent les métadonnées existantes. Aucun nouveau NIP, aucune modification des lieux/salles ou affectations individuelles en production.
Authentification LOCAL et autorisations existantes conservées, booléens stricts, références contrôlées et sauvegarde atomique.
Aucune écriture de recette ni migration de ce lot exécutée en production. Aucun événement opérationnel créé par la préparation.

## F. Livraison

Site existant `scope-sdisnv`, équipe F7 formation / ydon903, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`.
GitHub → Netlify confirmé : repository `Sdisnv/monitoringF7`, branche `main`.
Production contrôlée : deploy `6acc550bc15e4abb0465554b`, état ready, commit `9fde680`, publié le 12.10.2026 à 03:34:33 UTC.
`/scope.html` répond HTTP 200 ; `/auth/config` confirme uniquement `local`.
Le présent lot n'est ni fusionné ni publié : GO MOA explicite requis. Après GO, contrôler le SHA fusionné et le SHA réellement publié, puis l'accès et les fonctions concernées, sans recette d'écriture en production.

## G. Verdict

**READY_FOR_MOA** — un seul lot vérifiable, mise en production non annoncée avant GO et contrôle du commit publié.

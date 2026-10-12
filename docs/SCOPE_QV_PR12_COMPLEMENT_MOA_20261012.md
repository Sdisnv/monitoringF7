# SCOPE / QUO VADIS - complément MOA PR #12

## A. HEAD
Main GitHub vérifié : `6f0eb8b2f6aaad6d7a6ab7946304e3b9d3c76ba3`.
HEAD initial PR #12 : `02d909abdc052421d2d98722f402a9cf1fb8f0b9`.
Complément sur la même branche et la même PR. Checkout principal et changements étrangers conservés.

## B. Corrections
- Sept modules PAPR distincts, avec les sept thèmes et lignes source du classeur 2026. Les six modules manquants sont rétablis dans le Programme existant, sans date 2027 inventée et sans double restauration.
- Défauts PAPR : quatre OI DPS, `C PR`, `Candidats PAPR` et `Formateur PR`. Défauts PR classiques : quatre OI DPS ; PR-ABC : PABC, DPS G1 uniquement. Les décisions et publications divergentes restent protégées et sont signalées.
- Validation annuelle bloquante : sept modules complets et modules 1/2 terminés avant le premier PR 1.1.
- `0180F7 / Formations EXTRAS` : association officielle déjà correcte ; référence manquante dans le SQL initial. Seed complété et migration ciblée idempotente, sans modification d'occurrence.
- Retrait annuel/individuel motivé et journalisé. Correction éditoriale publiée sans nouvelle validation ; modification majeure motivée, révision ciblée en attente, puis validation sur le même événement avec les protections et moteurs opérationnels existants.
- Cellule État alignée en haut, carré 8x8 et libellé conservés. Fenêtre du Rapport clôturant 2027 : février 2028, date vide et relâches à vérifier. Statistiques civiles inchangées.
- Thèmes inclus dans l'instantané de reconduction existant. Référentiels, C sct, exports, activités types, A+1, anti-doublons et roadmap Cours ECA conservés.

## C. Preuves
28 tests ciblés passent, dont 10 pour le complément et 18 de non-régression directement concernés ; les recettes MOA acquises ne sont pas redemandées.
5 scénarios Chromium réels passent : fiches PAPR, réouverture, retrait motivé, contrôle annuel, liste ECAwin et rendu desktop/mobile. Aucun échec JavaScript.
PostgreSQL local `127.0.0.1:5432/scope_qv_2027_recipe_20261006`, BEGIN/ROLLBACK : **867/867 Stat.Com identiques**, codes et identifiants existants conservés, 113 tables identiques après rollback.
Le déplacement majeur d'un événement de recette avec population gelée conserve son identifiant et sa présence historique exacte. Le moteur existant ajoute 18 lignes de participation non renseignées pour des personnes déjà présentes dans le clone ; aucun nouveau personnel ou NIP. Aucun événement créé par la préparation, le retrait ou la révision.
La recette navigateur conserve aussi les **873/873 Stat.Com** du jeu incluant les six modules rétablis. Rollback complet, tables opérationnelles et préparations non ciblées inchangées.
Build Netlify contexte production et préflight du site existant réussis. Preuves : `docs/captures/qv-pr12-complement-20261012/`.

## D. Restant MOA
1. Confirmer les dates 2027 des modules 2 à 7 ; module 2 obligatoirement terminé avant PR 1.1. La date explicite du module 1 est conservée.
2. Le clone contient une ancienne publication du module 1 sans OI : elle reste intacte et bloque la validation annuelle jusqu'à révision ciblée des OI. Ce constat ne prétend pas être une recette de production.
3. Fixer la date du Rapport annuel en février 2028 selon les relâches ; aucune date ni événement n'est créé par la proposition.
4. Une révision de qualification ou de cursus requiert l'association de configuration de formation existante. Le parcours ne la réinterprète pas automatiquement et conserve la publication en attente.

## E. PR Et Sécurité
PR existante : https://github.com/Sdisnv/monitoringF7/pull/12. Aucune seconde PR, aucun force push.
Écritures API réservées à `references:manage`, auteur issu de l'authentification, SQL paramétré, verrouillage et contrôle de version. Les références de lieux/salles, affectations et présences historiques ne sont ni supprimées ni réécrites.
Une suspension ou période déjà enregistrée pour `0180F7` est conservée ; une divergence explicite nécessite arbitrage.

## F. Déploiement
Site existant `scope-sdisnv`, équipe F7 formation / ydon903. Aucune fusion, publication ou écriture de recette en production. Build local et éventuel Deploy Preview ne constituent pas une mise en production.
Production relue : deploy `6acc6f74104cd900084d9ef2`, `ready`, commit `6f0eb8b`, publié le 12.10.2026 à 05:26:41 UTC.
Titre PR et commit marqués `[skip netlify]` pour éviter aussi les déploiements automatiques de preview/branche avant GO. Les previews précédentes ne représentent pas ce complément.
Après GO explicite seulement : retirer le marqueur du titre, fusionner avec un message non marqué, puis vérifier le commit réellement publié, l'accès LOCAL et les fonctions concernées.

## G. Verdict
**MOA_REQUIRED** : complément vérifié, dates et décisions ci-dessus à confirmer ; GO explicite requis avant fusion et publication.

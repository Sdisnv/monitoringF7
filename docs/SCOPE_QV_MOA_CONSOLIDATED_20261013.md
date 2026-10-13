# SCOPE / QUO VADIS — lot consolidé MOA 13.10.2026

## A. Préflight
Main GitHub confirmé : `2d70837773f86e457cfbd5f570f1cf647a1b8274`, fusion de PR #12. Aucune PR ouverte au démarrage. Branche unique : `codex/scope-qv-moa-consolidated-20261013`. Checkout principal et modifications étrangères conservés.

## B. Causes constatées
Recherche : reconstruction complète à chaque caractère et calcul de toutes les colonnes lors de chaque comparaison de tri. Fiches : paramètres sur des lignes pleines et hauteurs de menus distinctes des contrôles natifs. Révisions : comparaison de valeurs préparatoires/canoniques avec publication, sans distinguer un changement réellement soumis.
Le clone initial ne reproduisait pas spontanément l'erreur PAPR. Les deux écarts préparation/publication ont été reproduits en données temporaires, puis corrigés sans mutation sur SAVE inchangé. Connexion SQL production non résolue via les accès existants, sans secret supplémentaire demandé.

## C. Réalisation
Frappe différée uniquement pour le filtrage, moteur et contexte conservés. Grille quatre/deux/une colonne, contrôles uniformes de 39 px ; zone compacte Nature/reconduction/participation/solde/export. Liste ECAwin seule, code et libellé séparés par espace.
SAVE publié sans changement : succès sans révision. Mineure conservant publication ; majeure et retrait par fenêtres motivées. Journal permanent existant complété et protégé contre modification, panneaux Historique repliables. Bouton OI PAPR retiré seulement si les quatre OI sont réellement persistés.
Responsables classés visuellement ; libellés uniformisés sans changer les codes. Références de publics regroupées à l'écran, associations historiques conservées. Contrôles factuels regroupés et résolus automatiquement. Cycle/validation dans Règles et PAPR dans Cursus, sans nouvelle navigation.
CRIMSON : 0180F7, non reconduit, solde/export indépendants. CFF : Programme/Agenda et réservation réelle de salle, sans événement opérationnel, obligation, solde, export ou reconduction. Conflits détectés par le moteur existant.
HSC pour nouveaux codes hors Stat.Com ; alias lisibles pour anciens SCOPE sans réécriture des valeurs stockées ni des liens.

## D. Conservation
**929/929 Stat.Com identiques**, codes et identifiants existants préservés. Présences, personnel, qualifications, affectations, lieux et salles conservés. Sept PAPR, dates/thèmes, PR/PR-ABC, spécialisation multiple, rapport provisoire 10.02.2028, statistiques civiles et roadmap Cours ECA conservés. Registre ECAwin et JSON canonique 2027 sans diff.

## E. Tests
**8 unitaires + 8 scénarios PostgreSQL + 9 scénarios Chromium réussis**, zéro erreur JavaScript. Contrôle supplémentaire ciblé du checkbox de confirmation PR après inspection visuelle, sans rejouer les autres scénarios.
Saisie complète `Exercice PR 1.3` : **200 ms**, tempo de 10 ms/caractère, sur **911 occurrences** ; tous les caractères et le contexte conservés. Charge composée des 909 occurrences actives du clone et des deux cas MOA temporaires CRIMSON/CFF, entièrement annulés. Ce résultat n'est pas un benchmark de latence réseau de production.
Les recettes historiques ne sont pas globalement relancées. Build Netlify production et préflight `scope-sdisnv` réussis, 25 fonctions empaquetées. LOCAL uniquement confirmé en GET de production.

## F. Visuel
15 captures inspectées : PR, DPS, DAP, F0 et occupation externe, à 1440×1100, 1280×800 et 390×844. Champs alignés, hauteurs uniformes, paramètres compacts, aucun débordement de page. Fenêtres de retrait/révision, historique et conflit de réservation capturés. Retouche finale de l'alignement de confirmation PR contrôlée sur les trois formats.
Captures : `docs/captures/qv-moa-20261013/browser/`.

## G. Migrations
Migration `scope-qv-moa-consolidated-20261013`, transactionnelle et idempotente, contrôles HSC avant DDL, contraintes de compatibilité et protection append-only du journal existant. Aucun backfill d'audit ni changement de données historiques.
Recettes exclusivement `127.0.0.1:5432/scope_qv_2027_recipe_20261006`, BEGIN/ROLLBACK. **113 tables identiques après rollback** ; préparations et événements non ciblés inchangés. Serveurs de recette arrêtés, aucune écriture de recette en production.
Preuves : [PostgreSQL](captures/qv-moa-20261013/postgres-integrity.json), [Chromium](captures/qv-moa-20261013/browser/recipe-results.json), [rollback](captures/qv-moa-20261013/browser/postgres-integrity.json).

## H. Réserves
Le référentiel PostgreSQL existant ne contient pas toutes les références demandées, notamment Fourrier, Chef FOCA, Chef communication et Chef publication. Aucun identifiant supposé ou doublon n'est créé ; saisie libre et références disponibles conservées. Compléments/correspondances permanentes à confirmer avec la MOA.
L'inventaire SQL des codes attribués en production n'a pas pu être obtenu avec la connexion existante. La migration inspecte cet inventaire réel avant changement et bloque toute collision ou valeur HSC hors plage ; aucune renumérotation automatique. Contrat d'import ECAwin hors Stat.Com toujours non démontré.

## I. Livraison
Un seul commit de lot sur la branche corrective, une seule PR ; SHA et URL exacts dans le commentaire de livraison GitHub. Marqueurs `[skip netlify]` sur commit et titre de PR. Aucun merge ni déploiement.
Production contrôlée en lecture seule : commit `2d70837`, déploiement `6acd131a6edefab42959d5ba`, ready, LOCAL actif. Aucun changement ORION, aucun projet Netlify créé.

## J. Verdict
**MOA_REQUIRED** : correctif consolidé et vérifié pour recette ; réserves de références et préflight SQL production explicites. GO MOA requis avant toute fusion/publication. Aucune demande de répéter les recettes déjà acquises.

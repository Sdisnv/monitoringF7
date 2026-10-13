# SCOPE / QUO VADIS — derniers contrôles PR #13

## A. GitHub
HEAD initial `0a4975b9c86f9fe3951dc4a31242de72cef0aa89`, branche existante `codex/scope-qv-moa-consolidated-20261013`. Main `2d70837773f86e457cfbd5f570f1cf647a1b8274`, PR #13 ouverte/fusionnable. Aucun nouveau checkout/branche/PR, changements locaux étrangers conservés.

## B. Doublons Prouvés
SQL production SCOPE, READ ONLY : une publication par cas et une préparation liée au même identifiant source. Le problème réel est **l'affichage des propositions A+1** : des dates/horaires de publication 2027 restaient hérités du modèle validé, malgré une date réelle 2028 et l'absence de `publishedEventId`. Reproduction avec les décisions réelles rejouées dans le clone et inspection des captures, pas simple confiance dans le premier test par identifiant.

| Cas | Publication existante | Proposition distincte | Avant affichage | Après |
|---|---|---|---|---|
| DAP Y2 | `qv-source-870`, `48d8e96c-73fa-4bc0-aef1-8c65c12bd44a`, `013Y2.001`, 19.01.2027 19:00–21:00 | Cycle A+1, 18.01.2028, `013Y2`, DAP Y2 | Faussement 19.01.2027 | 18.01.2028 |
| Kick-off | `qv-source-888`, `389b5f4a-cd38-48b3-ac3d-e40801e1b702`, `070F1.012`, 27.01.2027 19:00–21:30 | Cycle A+1, 26.01.2028, `070F1`, DAP Y1–Y4 | Faussement 27.01.2027 | 26.01.2028 |

Correction limitée : reset des métadonnées de publication lors de la projection ; affichage/export/date de déplacement n'utilisent une date publiée qu'avec un vrai lien publié. Les cinq propositions DAP affectées sont conservées, avec leurs dates réelles, OI, Stat.Com et identifiants. **Aucune suppression, dépublication ou réécriture de décision humaine.** Main reconstitué avec données métier autorisées : 911 lignes ; PR : 913, dont les deux séances DAP restaurées. Nombre inchangé par ce correctif, pas de masquage de doublon pour réduire le compteur.

## C. HSC Production
Accès connecté Supabase **SCOPE / `bnfbqzqisdkysnoaeuej`**, distinct d'ORION. Script existant réellement exécuté en production, transaction READ ONLY/ROLLBACK, sans migration ni allocation : résultat **`HSC_PREFLIGHT_READY_FOR_MOA`**. SQL inchangé, SHA-256 `5b8e5a64df56b37d60f67c2f036509dd008eb8e42e62fc4f02dc2b865e659a40`. Directive psql ON_ERROR_STOP omise uniquement pour l'API SQL, qui remonte toute erreur.
Inventaire : `SCOPE-000001`, `SCOPE-000002`, `SCOPE-000003`, aucune collision signalée par le garde. Séquence : `last_value=3`, `is_called=true`, prochain ordinal **4**, sans appel nextval/setval. Les anciens codes restent stockés tels quels ; prochain nouveau HSC `HSC.004`, pas un reset à 001.
Contraintes réelles inventoriées. La compatibilité d'une activité HSC sans Stat.Com requiert la migration PR #13 déjà testée dans le clone ; **elle n'a pas été appliquée en production**. Le blocage d'accès SQL précédent est levé, pas de secret ni authentification supplémentaire demandés.

## D. Proposition DAP 1.2
Moteur existant `pickProposalSlot`, règles DAP applicables lues, calendrier réel, préférence du jeudi, ordre chronologique de départage, continuité après DAP 1.1 et sans avancement avant la projection historique. Horaires individuels absents : les journées déjà occupées par un OI DAP sont exclues par prudence, sans déplacer ces activités.
**1. 13.05.2027 ; 2. 20.05.2027**, jeudis préférés, rang -0,2, sans activité DAP concurrente identifiée ces jours. Le 13 mai n'est pas choisi arbitrairement. 06.05 interdit (Ascension/pont) ; 27.05 occupé par Exercice DAP 2. Alternatives autorisées classées et exclusions détaillées dans la preuve.
**Proposition calendaire à confirmer**, pas une validation complète de créneau : horaire individuel, lieu/salle, thème, responsable et fonctions du public restent non démontrés. Plage générique de règle lue 19:30–21:30, jamais imposée aux champs individuels. Aucun lieu/salle choisi ni modifié en production ; date/horaire individuels restent vides. Une décision humaine arrête la proposition automatique. DAP 1.1, quatre exercices par section et formations DPS conservés.

## E. Responsables
Fonctions permanentes, rôles, aliases et publics contrôlés en SQL production : aucune correspondance officielle de fonction démontrée pour Fourrier, Chef FOCA, Chef communication ou Chef publication. Aucun identifiant supposé, aucune identité d'une autre fonction réutilisée. Saisie libre acquise conservée. **Absence documentée, non bloquante pour la livraison.**

## F. Contrôles Ciblés
Défaut reproduit sur code déployé/main et PR initiale, puis correction vérifiée dans le clone avec décisions réelles. **933/933 Stat.Com identiques** à PR initiale, codes/identifiants inchangés ; conservation d'une décision humaine et cas sans date conforme vérifiés. Pas de répétition des 32 contrôles acquis ; anciennes preuves inchangées.
Deux scénarios Chromium nouveaux, zéro erreur JS, quatre captures finales inspectées, captures avant conservées. Le premier contrôle limité aux identifiants est explicitement marqué insuffisant dans la preuve avant ; le test final contrôle l'année affichée de toutes les propositions A+1.
**113 tables restaurées après rollback** ; événements, présences et affectations non modifiés pendant les tests. Production : empreintes identiques entre lectures pour 257 événements, 5967 présences, 636 affectations, 967 préparations/obligations et 2366 entrées de journal. Serveurs de recette arrêtés. Build Netlify production et préflight du site existant réussis ; LOCAL seul confirmé par GET.

## G. Capitalisation
Référentiel GitHub complété : QV-PUBLICATION-004, QV-DAP-003 et QV-RULES-001. Règles anti-doublons, Stat.Com, HSC, publication et reconduction préservées. QV-RULES-001 et sa maquette validée sont capitalisés dans la roadmap : un onglet, règle par cursus complet, huit sections, portées explicites, jours qualifiés, faisabilité, permissions, information événements. **Aucun développement de ce futur jalon**, ni module Cours ECA parallèle.

## H–J. Livraison, Réserves et Verdict
PR #13 exclusivement actualisée ; commit final exact dans son commentaire de livraison. `[skip netlify]` maintenu. Aucun merge, déploiement, nouvelle PR, projet Netlify ou changement ORION. Production demeure `2d70837` sur `scope-sdisnv`.
**READY_FOR_MOA** : les blocages techniques démontrés sont levés, PR prête pour décision de livraison. Restent les validations métier normales de la proposition DAP et le GO final ; références absentes non bloquantes. Aucune publication automatique ni demande de refaire les recettes acquises.

Preuves : [production readonly](captures/qv-pr13-final-controls-20261013/production-readonly.json), [intégrité production](captures/qv-pr13-final-controls-20261013/production-integrity.json), [séquence HSC](captures/qv-pr13-final-controls-20261013/hsc-sequence-readonly.json), [reproduction/correction/rollback](captures/qv-pr13-final-controls-20261013/clone-final-controls.json), [navigateur](captures/qv-pr13-final-controls-20261013/browser/results.json).

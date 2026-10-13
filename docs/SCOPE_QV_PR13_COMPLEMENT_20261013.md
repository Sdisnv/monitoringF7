# SCOPE / QUO VADIS — complément ciblé PR #13

## Préflight
PR #13 ouverte, fusionnable, branche `codex/scope-qv-moa-consolidated-20261013`, HEAD initial `66b38c6f81551075dccea6f00b27333d1b76db71`. Main réel `2d70837773f86e457cfbd5f570f1cf647a1b8274`, inchangé. Référentiel canonique et sources relus directement ; modifications étrangères du checkout principal préservées.

## Doublons et rapprochement
Le clone réel contient **929 lignes brutes / 909 actives**, sans collision exacte des deux séances signalées. Les 911 lignes actuelles de production ne sont pas accessibles en SQL avec les connexions existantes : **leur cause exacte reste non confirmée**, pas présentée comme résolue en production.
Défaut technique démontré sur deux alias temporaires : rapprochement limité à `publication_unit_id`, sans reconnaître une réalisation identique sous un autre identifiant. Correction readonly exacte/univoque, avec horaires/OI publiés vérifiés ; enregistrements, codes et décisions conservés. Les alias ne doublent plus Programme/Excel/publication ; l'ancienne fiche renvoie à la publiée. Décisions distinctes ou plusieurs publications : arbitrage bloquant, sans fusion automatique.

| Cas | Avant | Après / diagnostic | Preuve |
|---|---|---|---|
| Instruction DAP Y2, 19.01.2027, 19:00–21:00, `013Y2`, `qv-source-870` | Clone réel : 1 publication `48d8e96c-73fa-4bc0-aef1-8c65c12bd44a` | Inchangée ; aucun doublon réel confirmé dans le clone | Inventaires avant/après |
| Kick-off DAP, 27.01.2027, 19:00–21:30, Y1–Y4, `070F1`, `qv-source-888` | Clone réel : 1 publication `389b5f4a-cd38-48b3-ac3d-e40801e1b702` | Inchangée ; aucun doublon réel confirmé dans le clone | Inventaires avant/après |
| Alias contrôlé de chacune des deux lignes précédentes | Recette sur `66b38c6` : 2 lignes actives par réalisation, identifiants distincts | 1 ligne active, alias historique conservé, même événement/code/Stat.Com ; pas de double publication/affectation | PostgreSQL + Chromium |
| Y1 et Y3, 28.01.2027, 19:00–21:00 | Même intitulé et horaire, OI/Stat.Com distincts | Cas écarté : deux occurrences légitimes conservées | Inventaires + test OI |
| Instructions / Kick-off de janvier 2028 | Même activité, autre date réelle / cycle A+1 | Cas écarté : conservés ; statistiques par année civile | Inventaires + test année |
| Thème humain différent sur un alias contrôlé | Identité temporelle identique, décision distincte | Les deux enregistrements restent actifs, validation annuelle bloquée pour arbitrage | Test ciblé de validation |

Aucune publication, affectation, présence ou ligne de journal supprimée. Comparaisons détaillées des identifiants, sources et clés dans les JSON de preuve. Ce tableau distingue volontairement données réelles du clone et collisions de recette, jamais assimilées à celles de production.

## Formation Groupée DAP
Cause : absence des deux séances dans le classeur QUO VADIS versionné et le JSON annuel ; QV-DAP-002 retirait le cinquième exercice sans les matérialiser. Les événements/imports 2026 existants confirment **1.1 le 23.04.2026** et **1.2 le 07.05.2026**, import `0130F7`, public historique `DAP/GEN`. Aucun horaire, thème ou responsable n'y est renseigné.
Deux séances restaurées comme propositions, OI **DAP Y1/Y2/Y3/Y4**, public descriptif historique `DAP` conservé ; aucune fonction de public inventée. Identités de la même occurrence stables, enregistrement/réouverture possibles, décision manuelle existante réutilisée. Les quatre exercices par section (**16 lignes**) et cours de cadres acquis sont conservés, cinquième hors programme ; aucun changement aux formations groupées DPS.

| Séance | Source réelle | Proposition par reconduction existante +364 jours | État |
|---|---|---|---|
| DAP 1.1 | Import versionné + événement `46645fbf-ce18-4e50-9ac4-7ea4ecd44d28`, 23.04.2026 | 22.04.2027 | À confirmer ; horaires/thème/responsable/fonctions du public manquants |
| DAP 1.2 | Import versionné + événement `d2b9d7df-9488-4832-a6ff-bb7196826039`, 07.05.2026 | 06.05.2027 | Conflit Ascension ; aucun déplacement inventé |

Les dates proposées sont seulement dans la provenance/contrôle de fiche, pas des dates planifiées ou validées. Aucun événement opérationnel créé. Extrait exact des deux imports et SHA-256 de leur source versionnés ; classeur original relu, hash identique au référentiel historique.

## HSC et Références
Inventaire clone : aucun code HSC/SCOPE attribué dans les quatre sources contrôlées ; contraintes et index d'unicité/code/publication inventoriés. Aucun code ou lien existant réécrit. Préflight exécutable : `psql --file database/ops/20261013_scope_hsc_preflight_readonly.sql` sur la connexion SCOPE existante. READ ONLY + ON_ERROR_STOP, garde partagé avec la migration ; anomalies bloquantes, aucune réparation automatique.
**Avant publication : exécuter et conserver le résultat réel en production**, relire contraintes/index et résoudre toute anomalie. Aucun PASS SQL production déclaré.
Recherche dans 16 tables de référentiels/fonctions/rôles/aliases : aucune identité permanente de fonction démontrée pour **Fourrier, Chef FOCA, Chef communication, Chef publication**. Aucun identifiant de public/cursus réaffecté comme fonction ; 28 codes existants préservés. Ces quatre correspondances restent à documenter par source autorisée.

## Tests et Livraison
**7 scénarios PostgreSQL ciblés + 3 Chromium réussis**, zéro erreur JS ; sept captures desktop/mobile et sources inspectées. Préflight HSC readonly, migration idempotente et anomalies bloquantes testés. **929/929 Stat.Com identiques**, codes/identifiants antérieurs identiques. Publications, allocations, affectations, présences, attendus, personnel et journal inchangés pendant les scénarios non opérationnels. **113 tables identiques après rollback**, préparations/événements non ciblés conservés ; serveurs arrêtés.
Les preuves des **25 contrôles précédents** sont byte-identiques au commit `66b38c6` (SHA-256 vérifiés), sans reprise globale de ces recettes. Build Netlify production : succès, 25 fonctions ; préflight du site existant : succès. LOCAL uniquement confirmé par GET ; aucune écriture de recette en production.
PR #13 exclusivement actualisée ; commit final exact et état GitHub dans le commentaire de livraison. Production relue : commit `2d70837`, deploy `6acd131a6edefab42959d5ba`, ready. Aucun merge, déploiement, nouveau projet Netlify ou changement ORION.

Preuves : [inventaire initial](captures/qv-pr13-complement-20261013/diagnostic-before.json), [inventaire final](captures/qv-pr13-complement-20261013/diagnostic-after.json), [PostgreSQL](captures/qv-pr13-complement-20261013/postgres-integrity.json), [Chromium](captures/qv-pr13-complement-20261013/browser/recipe-results.json), [rollback navigateur](captures/qv-pr13-complement-20261013/browser/postgres-integrity.json).

## Verdict
**MOA_REQUIRED**. Complément vérifié sur clone et prêt à examiner dans PR #13 ; pas de certification des 911 lignes de production. Restent : rapprocher les deux cas réels via export/lecture autorisée, arbitrer la date DAP 1.2 et compléter les champs non démontrés, résoudre les quatre références, exécuter le préflight HSC réel. GO explicite indispensable avant fusion/publication. Acquis PR #12/#13 et roadmap Cours ECA conservés.

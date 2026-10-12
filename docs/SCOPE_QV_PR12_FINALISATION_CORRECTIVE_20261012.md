# SCOPE / QUO VADIS — finalisation corrective PR #12

## A. Cause du workflow
À `cf868e7`, `saveAction=SAVE` reprenait toujours l'ancien état et ignorait `body.status`. PostgreSQL et la consolidation restituaient donc correctement une valeur serveur incorrecte. Le Programme privilégiait aussi le libellé de validation sur certains états préparatoires.
Le clone projette DAP 4 / Y4 / `013Y4` au 05.11.2027 ; le cas MOA du 26.10.2027 a été reproduit uniquement en transaction temporaire, puis annulé.

## B. Correction
Enregistrer persiste l'état explicitement choisi, dans les deux sens ; sans changement explicite, l'état antérieur reste conservé. Validation métier, date, politique Stat.Com et identité restent indépendantes. La fiche et le Programme restituent l'état enregistré.
Un changement de planification publié exige le motif et la révision ciblée existants. Il ne supprime ni l'événement publié ni ses présences. La recherche ECAwin superflue est supprimée ; le registre officiel et le JSON source 2027 sont inchangés.

## C. Rattachement PAPR
Les modules 1/2 sont explicitement `PREPARATORY_CURSUS`, cursus et cycle métier 2027, même avant la borne du clone au 05.03.2027. Le rattachement est conservé après enregistrement, sans changer cette borne, les rotations ou les dates.
Sept dates conservées : **02.02, 16.02, 03.06, 29.09, 16.11, 30.11, 11.12.2027**. Les modules 1/2 finissent avant PR 1.1 du 02.03.2027. Sept thèmes distincts et les autres acquis PR #12 restent conservés.
Module 1 : les quatre OI DPS sont préparables par révision motivée ; preuve `PENDING` sur le même événement, publication et historiques inchangés. Confirmation de la révision réelle encore nécessaire.

## D. Non soldé
Solde, évaluation et demande d'export ECAwin sont des paramètres indépendants, persistants et reconductibles. Un événement interne non soldé sans Stat.Com reçoit un nouveau code stable `SCOPE-000001` dans une séquence indépendante ; aucun Stat.Com, code existant ou NIP n'est inventé/remplacé. L'absence de Stat.Com est `NON_APPLICABLE`.
Publication et relations OI réutilisent les moteurs existants. Le test isolé crée un seul événement, puis retrouve `UNCHANGED` au rejeu et résout 14 personnes par les affectations datées existantes. Aucun événement opérationnel n'est créé en préparation.
Journée/Noël des familles : préremplissage DPS/DAP qualifié, Sapeur du domaine + FOBA 1/2 et `C sct` (code historique `C scrt`). Les modifications manuelles, y compris enregistrées, priment.
Les données d'export sont préparées dans l'API existante avec `exportRequested` et `IMPORT_CONTRACT_REQUIRED` sans Stat.Com. **Aucun format d'import ECAwin spécifique n'est démontré ni généré.** Les calendriers individuels restent dans la roadmap existante.

## E. Preuves
- 7 tests unitaires ciblés ; 9 scénarios PostgreSQL ; 5 scénarios Chromium réel, desktop/mobile, aucune erreur JavaScript.
- **929/929 Stat.Com identiques**, tous les codes et identifiants existants préservés. Les seuls nouveaux codes de recette concernent des occurrences auparavant sans code.
- Rollback des **113 tables**, de la nouvelle séquence et des contraintes ; présences, personnel, affectations, lieux et salles conservés. Aucun écrit de recette en production.
- Migration transactionnelle idempotente `scope-internal-event-identity-20261012` : séquence, plancher des identités déjà réservées et exception SQL limitée au nouveau format sans Stat.Com. Migrations MOA acquises également vérifiées ; le chemin canonique de démarrage ne les ignore plus.
- Build Netlify production : site statique et 25 fonctions empaquetées. Cible `scope-sdisnv` vérifiée par `scope:preflight` avec son ID explicite. Authentification production vérifiée en lecture seule : LOCAL uniquement.
- Diff sans erreur ; modifications locales étrangères conservées. Recettes acquises non relancées.

Preuves : [PostgreSQL](captures/qv-pr12-corrective-20261012/postgres-integrity.json), [Chromium](captures/qv-pr12-corrective-20261012/browser/recipe-results.json), [rollback navigateur](captures/qv-pr12-corrective-20261012/browser/postgres-integrity.json), [livraison et production en lecture seule](captures/qv-pr12-corrective-20261012/delivery-checks.json).

## F. Git et livraison
Main initial vérifié : `6f0eb8b2f6aaad6d7a6ab7946304e3b9d3c76ba3`. HEAD PR initial : `cf868e7e73390c9548162ac8e9520ba439c53368`.
Un seul commit correctif sur `codex/scope-qv-roadmap-v1-20261012`, portant ce rapport et ses preuves. Son SHA final est précisé dans le commentaire de livraison de [PR #12](https://github.com/Sdisnv/monitoringF7/pull/12). Aucun nouveau projet, branche ou PR.
Les marqueurs `[skip netlify]` du titre et du commit sont conservés. Production toujours au commit `6f0eb8b`, déploiement `6acc6f74104cd900084d9ef2`. Aucun merge ni déploiement de ce lot.

## G. Réserves
GO MOA explicite requis pour fusion/déploiement. Révision OI du module 1 à confirmer sur la publication réelle. Rapport annuel 10.02.2028 toujours provisoire, à valider par le Codir avant validation annuelle définitive.
Contrat d'import ECAwin sans Stat.Com à obtenir avant réalisation de cet export ; calendrier individuel et suivi spécialisé Cours ECA restent dans la roadmap, sans module parallèle. Aucune autre incompatibilité métier nouvelle constatée dans le périmètre testé.

## H. Verdict
**READY_FOR_MOA** : lot correctif testé et prêt au contrôle MOA, pas une mise en production. Les réserves ci-dessus restent explicites ; aucune recette déjà acquise n'est redemandée.

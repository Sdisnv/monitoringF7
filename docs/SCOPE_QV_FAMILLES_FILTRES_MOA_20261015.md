# SCOPE / QUO VADIS : familles et filtres, 15.10.2026

## Périmètre et verdict

Base GitHub directement contrôlée : `95d8bdff3f2c923f5d4e5a81a6fd1e3cc9bdd43c` (main, PR #19 fusionnée).
Branche unique : `codex/scope-qv-familles-filtres-20261015`.
Lot applicatif prêt pour décision MOA : **READY_FOR_MOA**.
Aucune fusion, publication, migration ou correction de données de production effectuée.
Les changements locaux étrangers et le serveur de recette existant sont préservés.

## Cause démontrée

Le JSON canonique 2027 contient `family: "Exercice"` pour les définitions historiques Exercice DAP.
La projection par réalisation conserve cette ancienne nature dans le champ famille.
Le catalogue de familles ajoutait ensuite les valeurs observées aux dix références confirmées,
et le serveur acceptait une ancienne valeur dès qu'elle était déjà enregistrée ailleurs.
La lecture des fiches respecte heureusement les `planningFields.family` explicites.
Les types réutilisables ne préremplissaient pas la famille ; la reconduction utilisait exclusivement
l'ancien instantané validé, même lorsqu'il contenait encore la nature.

Lecture PostgreSQL de production sous `BEGIN READ ONLY`, `transaction_read_only=on` :
préparations et cursus le **15.10.2026 à 04:23:15 UTC**, publications à **04:28:04 UTC**.
Ces instants sont distincts : aucun prétendu instantané atomique multi-appels ni gel de la production.
La MOA avait déjà corrigé les quatre Exercice DAP 1. Aucune réécriture n'est nécessaire sur ces fiches.

| OI | Date conservée | Famille actuelle | Stat.Com conservé |
| --- | --- | --- | --- |
| Y1 | 10.03.2027 | DAP | 013Y1 |
| Y2 | 24.03.2027 | DAP | 013Y2 |
| Y3 | 17.03.2027 | DAP | 013Y3 |
| Y4 | 24.03.2027, 19:00–21:30 | DAP | 013Y4 |

Y1 possède encore un ancien instantané validé en « Exercice » : ne pas réécrire ce passé.
Pour le nouveau cycle seulement, reprendre sa famille enregistrée DAP comme **proposition à valider**,
avec provenance, nature Exercice indépendante et statut de préparation habituel.
Les autres champs validés, Stat.Com et OI restent inchangés ; aucune validation n'est inventée.

## Corrections applicatives

- Référentiel commun limité à SDIS, DPS, DAP, JSP, FOBA, FOCO, FOCA, FOSPEC, AUTO, PR, dans cet ordre.
- Une famille historique reste visible dans sa fiche comme valeur conservée non sélectionnable
  à nouveau. Une sauvegarde sans modification de famille la conserve ; le serveur refuse les nouvelles valeurs hors liste.
- Les nouveaux types proposent DAP uniquement si la définition canonique d'exercice DAP,
  la nature Exercice, un OI qualifié DAP:Yx unique et le Stat.Com officiel 013Yx concordent.
  Ni les exercices mixtes DPS-DAP ni les cours de cadres ne sont reclassés par approximation.
  Une référence non démontrée n'est pas inventée.
- Les nouvelles activités issues de ces types reprennent cette famille et une nature distincte.
  La reconduction ne réécrit aucune occurrence source ; les anciennes familles non autorisées
  deviennent une proposition séparée pour le nouveau cycle, à valider. Une famille autorisée déjà validée est conservée.
- Les filtres cursus et spécialisation utilisent les mêmes référentiels que les fiches :
  identifiants réels des cursus, codes des qualifications et recherche dans la multisélection.
  « Cursus cond TP9 » affiche le véritable cursus `TP9` ; « Cursus OFSI » affiche `OFSI-BASE`.
  Aucun alias ou identifiant métier supplémentaire n'est créé.
- Le filtre public expose tout le catalogue existant, y compris N06 et les échelons.
  Les trois équivalences d'affichage déjà utilisées par les fiches sont partagées avec le filtre,
  sans changement des codes enregistrés. Les OI restent qualifiés dans leur propre filtre.
- Une occurrence annulée, même publiée, est présentée comme Annulé et peut être retrouvée par cet état.
  Aucun état, droit, workflow, affectation ou événement n'est créé par le filtre.

## Inventaire en lecture seule

Fichier détaillé : [inventory-2027.json](captures/qv-familles-filtres/inventory-2027.json).
Il indique pour chaque ligne : identifiant technique, identifiant canonique, date, activité,
Stat.Com, OI, famille actuelle/attendue, nature, justification, certitude, état, visibilité,
publication éventuelle et date de dernière modification.
Périmètre : **943 lignes de projection 2027, dont 923 visibles**, issues de la source actuelle,
et non les 918 séances de l'ancienne photographie locale.

| Catégorie | Lignes | Traitement |
| --- | ---: | --- |
| Anomalies certaines | 16 | 12 occurrences actives DAP 2 à 4 ; 4 anciennes lignes DAP 5 déjà masquées |
| Arbitrage MOA | 858 | Famille absente ou ancienne nature ; famille attendue non démontrée |
| Conformes | 69 | Famille explicitement autorisée et cas DAP 1 déjà corrigés |

« Arbitrage MOA » ne signifie pas 858 erreurs avec une correspondance connue.
Aucune conversion générale Instruction/Formation/Conduite/Événement vers une famille n'est autorisée.
Les 4 anciennes lignes DAP 5 restent masquées : ne pas recréer un cinquième exercice,
ne pas annuler le rapprochement existant, ne pas modifier leur cycle de vie.

## Plan ciblé : NON EXÉCUTÉ

**Un GO MOA distinct est obligatoire.** Les douze cibles actives non publiées au moment de la lecture sont :

| Identifiant PostgreSQL | Occurrence SCOPE | Date conservée | Activité | OI conservé | Stat.Com conservé | Avant | Après proposé |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `536447d9-fe2b-4740-a49d-5284907b706f` | `QV26-EXERCICE-DAP-2-6285EF74:O1:S1` | 2027-05-19 | Exercice DAP 2 | DAP:Y2 | 013Y2 | Exercice | DAP |
| `c50c3e4f-c5dc-4b1b-a5b7-09d8e4ba5357` | `QV26-EXERCICE-DAP-2-6285EF74:O2:S1` | 2027-05-19 | Exercice DAP 2 | DAP:Y3 | 013Y3 | Exercice | DAP |
| `6fb058a8-978e-4f7f-ab12-7df94ec00893` | `QV26-EXERCICE-DAP-2-6285EF74:O3:S1` | 2027-06-16 | Exercice DAP 2 | DAP:Y1 | 013Y1 | Exercice | DAP |
| `dd45f0f9-1b4a-4e2f-a4ec-e471b3dcfbe3` | `QV26-EXERCICE-DAP-2-6285EF74:O4:S1` | 2027-05-27 | Exercice DAP 2 | DAP:Y4 | 013Y4 | Exercice | DAP |
| `601293c1-8027-41b2-a658-1abc578e5a59` | `QV26-EXERCICE-DAP-3-618B0715:O1:S1` | 2027-09-08 | Exercice DAP 3 | DAP:Y2 | 013Y2 | Exercice | DAP |
| `e50ffe6f-e111-4cda-a32b-6e54b7bce54d` | `QV26-EXERCICE-DAP-3-618B0715:O2:S1` | 2027-10-06 | Exercice DAP 3 | DAP:Y3 | 013Y3 | Exercice | DAP |
| `3989b128-98d6-4f2e-af09-a0e03a87b800` | `QV26-EXERCICE-DAP-3-618B0715:O3:S1` | 2027-09-02 | Exercice DAP 3 | DAP:Y1 | 013Y1 | Exercice | DAP |
| `51541dbd-035c-459f-a8c8-15b47eafa139` | `QV26-EXERCICE-DAP-3-618B0715:O4:S1` | 2027-09-22 | Exercice DAP 3 | DAP:Y4 | 013Y4 | Exercice | DAP |
| `a6de28f5-6a07-4686-a13d-317ac0e3b971` | `QV26-EXERCICE-DAP-4-46753B3A:O1:S1` | 2027-11-06 | Exercice DAP 4 | DAP:Y1 | 013Y1 | Exercice | DAP |
| `c4e93967-0d07-44ff-a231-d1af7d27c44a` | `QV26-EXERCICE-DAP-4-46753B3A:O2:S1` | 2027-10-30 | Exercice DAP 4 | DAP:Y2 | 013Y2 | Exercice | DAP |
| `57d29891-e740-4947-a13e-0f0b6c9b2bb0` | `QV26-EXERCICE-DAP-4-46753B3A:O3:S1` | 2027-10-26 | Exercice DAP 4 | DAP:Y4 | 013Y4 | Exercice | DAP |
| `16172f16-2a4d-46e1-ac3c-95da39cb3987` | `QV26-EXERCICE-DAP-4-46753B3A:O4:S1` | 2027-11-12 | Exercice DAP 4 | DAP:Y3 | 013Y3 | Exercice | DAP |

Justification commune : définition canonique Exercice DAP, nature Exercice, OI DAP:Yx et Stat.Com 013Yx concordants.
Les dates, horaires, thèmes, responsables et publics ne sont pas inclus dans la correction.

Procédure après autorisation, sans exécution dans cette PR :

1. Relire chaque cible sous verrou et conserver l'avant complet, son `updated_at`, son état,
   ses métadonnées et les liens de publication. Retirer du plan toute ligne déjà corrigée.
   Toute divergence depuis l'inventaire suspend cette cible ; ne pas écraser une nouvelle décision MOA.
2. Si la ligne est devenue publiée, utiliser la révision ciblée existante avec motif et validation requis,
   sans modifier la publication silencieusement. Ne jamais contourner ce workflow par SQL.
3. Sur une cible restée non publiée, modifier exclusivement la famille par le workflow existant,
   avec traçabilité du motif « Famille DAP confirmée par la MOA ». Une revalidation requise reste une
   décision MOA explicite ; ni le programme annuel ni les autres décisions ne sont validés en bloc.
4. Vérifier les douze identités et le nombre d'occurrences, les liens, états, dates, horaires, OI,
   thèmes, publics, responsables, Stat.Com et codes d'occurrence avant/après.
   **100 % des Stat.Com et codes identiques** est une condition bloquante.
   Vérifier séparément les affectations, présences et journaux : aucun effacement d'historique.
5. Retour arrière, uniquement sur autorisation : remettre seulement les chemins de famille effectivement
   modifiés à leurs valeurs d'avant, avec garde de concurrence et nouvelle trace de retour arrière.
   Une ancienne valeur Exercice n'étant plus une nouvelle référence sélectionnable, une restauration
   technique de valeur historique nécessiterait une opération PostgreSQL ciblée expressément autorisée.
   Ne pas restaurer en bloc les métadonnées, ne pas supprimer la trace de correction, ne pas toucher
   aux autres décisions intervenues depuis. Si une cible est désormais publiée, repasser par la révision ciblée.

Les quatre Exercice DAP 1 conformes sont exclus du plan. Les quatre anciennes lignes DAP 5 masquées
et les 858 arbitrages sont exclus de toute exécution. Aucun script de migration n'est fourni ou lancé.

## Tests et preuves

- Sept contrôles ciblés regroupant A à L : [targeted-results.json](captures/qv-familles-filtres/targeted-results.json).
  Création réelle via service, refus d'une nouvelle famille Exercice, sauvegarde d'une fiche historique
  sans changer sa famille, propositions de reconduction des quatre sites, catalogues et filtres effectifs.
- PostgreSQL local existant `scope_qv_2027_recipe_20261006`, port 5432.
  Écritures de recette confinées à des tables temporaires de session ; rollback vérifié.
  Les empreintes des neuf tables publiques protégées sont identiques avant/après.
  Le serveur de recette ouvert n'a pas été interrompu.
- Comparaison avec le service du main : familles, domaines, Stat.Com, codes, OI, publics, dates,
  thèmes, validations et publications des 943 lignes inchangés.
- Chrome réel, profil neuf, authentification locale existante :
  [browser-results.json](captures/qv-familles-filtres/browser-results.json).
  Assets du lot et projection fraîche substitués **uniquement dans la session de test**.
  Les résultats affichés sont comparés par identifiant après mise à jour effective des filtres.
  Le cas annulé utilise un témoin en mémoire car la source actuelle ne contient aucune annulation.
  Aucune requête d'écriture métier ; aucune erreur JavaScript.
- Captures : [Programme DAP](captures/qv-familles-filtres/programme-dap.png),
  [fiche Y4](captures/qv-familles-filtres/fiche-y4.png),
  [filtres mobiles](captures/qv-familles-filtres/filters-mobile.png).
- `netlify build --offline --context production` réussi : site statique et bundle des fonctions.
  Ce résultat local n'est pas un déploiement.
- Pas de campagne historique relancée. Fonctions d'export, authentification, CTA, présences et
  correspondances IndeX non modifiées. Pas de migration.

## Réserves et décision attendue

Le stock historique non corrigé conserve volontairement ses anciennes valeurs.
Le filtre DAP n'intègre pas artificiellement des lignes encore enregistrées « Exercice » :
le plan doit être approuvé puis exécuté séparément avant de revendiquer leur correction.
Les familles des cas non démontrés nécessitent une décision métier, pas une déduction par titre.
Aucun de ces arbitrages n'empêche la revue du correctif applicatif.

La règle Netlify `ignore = "exit 0"` est ajoutée uniquement pour cette branche :
pas de changement du site de production, de son authentification ni de ses variables.
Attendre le GO MOA pour toute fusion ; le programme annuel n'est pas déclaré validé.

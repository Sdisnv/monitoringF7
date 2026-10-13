# SCOPE / QUO VADIS - post-recette MOA - 13.10.2026

**READY_FOR_MOA - aucune fusion ou publication de ce lot.**

## A. Preflight
Main GitHub directement verifie : `7e330f5f3fef0cb11a1a572c3e0e7e87a9fd64a0`.
PR #13, #14 et #15 fusionnees. Site `scope-sdisnv`, deploy `6ace30835ca18634d8259e7f`, ready, meme commit, publication 13:23:35 UTC.
Branche unique : `codex/scope-qv-post-recette-moa-20261013`. Modifications locales du checkout principal conservees ; aucun reset, force-push ou changement de main.
Referentiel consulte et actualise : `docs/business-rules/quo-vadis-canonical-rules.md`. Roadmap/ToDo consolidee actualisees dans `docs/SCOPE_QV_ROADMAP_V1_20261012.md`, sans document concurrent.

## B. Anomalies et corrections
- Cycle : ancienne preparation automatique du Rapport stockee au 04.03.2027, non humaine, faisait commencer le cycle au 05.03. La lecture reprend le Rapport canonique confirme du 23.02, donc debut 24.02, sans deplacer la ligne stockee ou sa publication. Cloture 10.02.2028 toujours provisoire / Codir.
- Creation SDIS des le 01.01.2027, rattachement au cycle precedent explicite, exception preparatoire PAPR intacte. Occupation externe uniquement civile, sans cycle SDIS, evaluation, export, Stat.Com fictif ou reconduction ; lieu/salle et disponibilite conserves.
- Recherche : badge mis a jour sans rendu global ; meme champ et curseur conserves pendant la frappe rapide. Alignement CSS des cinq parametres corrige sans changer les hauteurs des champs.
- Journal : une transaction repliable regroupe les champs, actions en francais, auteur nomme depuis un referentiel autorise selon permission. Identifiant interne non affiche ; anciennes valeurs absentes signalees, jamais inventees. Validation repetee sans changement ignoree ; retrait puis nouvelle validation restent legitimes. Anciennes lignes PAPR 3 conservees.
- Controle DPS 1.2 : vendredi 21.05.2027 interdit par `PLANIF-DPS`, cause/date/regle/action affichees ; derogation motivee si autorisee. Etat de planification distinct d'un controle metier ; aucun controle invente pour une simple proposition ou permanence calculee.
- Stat.Com : cinq seances automatiques non validees/non publiees de formation continue groupee des quatre DPS passent de `0162F7` a `0120F7` / `EXERCI` a la lecture et lors de l'enregistrement normal. La seance humaine 1.1 deja en `0120F7`, les cours de cadres et les autres `0162F7` sont conserves. Aucun remplacement global ou migration de donnees.
- DAP : propositions 13.05 / 20.05.2027 conservees, application a la fiche sans heure ni validation inventee ; OI Y1-Y4 et `0130F7` inchanges.
- PDF annuels/compacts : A4 paysage, onze colonnes exactes dont Public cible et code Stat.Com seul ; noms `QUO VADIS AAAA, Planning annuel.pdf` et `QUO VADIS AAAA, Liste compacte.pdf`, titres/annee dynamiques, filtres et logos conserves.
- Public OPERATIONNEL : OSR et quatre CI/candidats CI, references CI existantes reutilisees, selection multiple descriptive, aucun NIP, affectation ou obligation individuelle cree.

## C. Tests et preuves
7 tests unitaires ciblant cycle, occupation, publics, historique, permissions et controles ; 8 controles sur le clone avec decisions de production lues en READ ONLY ; 5 tests PDF de dependance touchee : reussis.
8 parcours Chrome reels reussis : frappe rapide Formation groupee / Exercice DAP 4 avec badge retarde, alignement mesure, historique, motif obligatoire/revalidation, DPS, DAP, CFF et deux apercus/telechargements PDF filtres. Zero erreur JavaScript. Header de proxy `identity` simule cote fonction, client HTTP normal ; gzip PR #15 fonctionne et son code n'a pas ete modifie.
PDF complets : 913 seances, 47 pages annuelles et 44 compactes, geometrie 841,89 x 595,28 points, onze en-tetes repetes dans l'ordre, positions de texte controlees sur toutes les pages. Pages initiales/suivantes/finales rendues et inspectees, logos non deformes et aucun chevauchement constate. Annee 2028 testee.
933 lignes comparees : dates, horaires, themes, identifiants, codes et liens de publication identiques. Seules les cinq differences Stat.Com explicitement autorisees sont acceptees ; toute autre difference echoue. Planification d'une occurrence deja validee et proposee testee pour ne pas etre confondue avec une sauvegarde sans changement.
Rollback exact des 113 tables du clone ; evenements, presences, affectations, attendus, personnel, qualifications et allocations de codes proteges pendant les tests. Recettes et sources actualisees restent locales, jamais executees sur la base de production. Les scripts exigent l'instantane READ ONLY local `output/qv-post-recette/production-business-snapshot.json`, non publie avec des donnees de personnel.
Build Netlify production reussi, 25 fonctions, diff controle. Aucun changement d'authentification LOCAL, de RLS ou de secret. Migrations existantes controlees, dont `scope-qv-moa-consolidated-20261013` appliquee ; aucune migration nouvelle necessaire.

## D. PostgreSQL et reserves
Production interrogee uniquement avec `BEGIN READ ONLY` / `ROLLBACK`. Entre les deux dernieres lectures : hashes identiques pour 257 evenements, 5 967 participations, 636 affectations et 125 liens de publication. Obligations 968 -> 969 et journal 2 441 -> 2 448 : evolution concurrente observee, non corrigee et non ecrasee. Aucune ecriture de recette en production.
Le Rapport publie conserve sa date historique si elle differe de celle du Programme : revision ciblee a coordonner, pas de deplacement automatique. Le cas CFF est enregistrable et signale le conflit de disponibilite reel avec la seance Codir existante ; pas de faux effacement du conflit pour obtenir PASS.
QV-RULES-001 reste le prochain jalon majeur : maquette et specification conservees, aucun nouvel editeur dans ce lot. Alignement IndeX, Cours ECA specialises, types suivis, affectations, exports individuels, observations/evaluations et contrat de rapprochement ECAwin restent dans la ToDo existante. Aucun module parallele ou integration ECAwin non documentee.

## E. Livraison
Une seule PR corrective, commit et identite visibles dans les metadonnees GitHub et le rapport de livraison. Marqueur `[skip netlify]` pour eviter une publication sans GO. Apres GO explicite seulement : fusion normale, retrait du marqueur dans le message de fusion, verification du commit Netlify reellement publie et recette MOA ciblee. Ne pas redemander les recettes historiques acquises.
Preuves : `docs/captures/qv-post-recette-moa-20261013/`. Aucun serveur de recette ou transaction de test laisse ouvert.

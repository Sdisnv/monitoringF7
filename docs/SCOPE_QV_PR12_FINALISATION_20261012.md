# SCOPE / QUO VADIS - finalisation PR #12

## A. Propositions PAPR 2027
Les horaires/thèmes viennent des lignes exactes QUO VADIS 2026 ; projection annuelle conservant le jour, sélection du créneau par le moteur existant et règles/calendrier 2027. Toutes les propositions restent modifiables. Le module 1 n'est pas redaté.

| Module | Date | Horaire | Thème | Source de la proposition | Contraintes vérifiées | État |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 02.02.2027 | 18:00-21:00 | Petzi découvre l'APR | Ligne 899, annexe 2027 explicite | Calendrier, ordre, avant PR 1.1, fonction C PR | Date protégée |
| 2 | 16.02.2027 | 18:00-21:00 | Matériel PR | Ligne 10 ; projection du 09.02 écartée par le calendrier | Calendrier, ordre, avant PR 1.1, fonction C PR | Proposition automatique |
| 3 | 03.06.2027 | 17:00-22:00 | AO Simulateur | Ligne 373 ; projection annuelle | Calendrier, ordre, fonction C PR | Proposition automatique |
| 4 | 29.09.2027 | 18:00-21:00 | Surveillance PR | Ligne 687 ; projection annuelle | Calendrier, ordre, fonction C PR | Proposition automatique |
| 5 | 16.11.2027 | 18:00-21:00 | R&S grand volume | Ligne 803 ; projection annuelle | Calendrier, ordre, fonction C PR | Proposition automatique |
| 6 | 30.11.2027 | 18:00-21:00 | Cobra | Ligne 826 ; projection annuelle | Calendrier, ordre, fonction C PR | Proposition automatique |
| 7 | 11.12.2027 | 07:30-12:00 | Engagement pratique | Ligne 845 ; projection annuelle | Calendrier, ordre, fonction C PR | Proposition automatique |

Premier PR 1.1 actuel : 02.03.2027 à 19:00. Modules 1/2 terminés avant son début. Sept thèmes, Stat.Com 011PR, identités et codes source conservés. Défauts : quatre OI DPS, C PR, Candidat PAPR, Formateur PR, spécialisation PAPR et cursus PAPR, sans qualification personnelle ni NIP synthétique.

## B. Rapport annuel 2028
Proposition MOA **10.02.2028**, **PROVISOIRE - À VALIDER PAR LE CODIR**. JSON versionné et migration `scope-qv-final-moa-report-20261012`, transactionnelle/idempotente, vers les Dates annoncées existantes. Une déclaration antérieure est protégée.
La modification provisoire conserve la même référence et l'historique, sans doublon. Confirmation Codir distincte des paramètres annuels. La borne permet les propositions A+1/rotations existantes, sans créer d'événement ; les statistiques restent civiles, 01.01-31.12, selon les dates réelles.

## C. Corrections intégrées
- Tableau des sept propositions et provenance automatique visible ; dates humaines conservées après modification/réouverture ; impossibilités signalées.
- Spécialisation multisélection persistante, référence PAPR existante, libellé Cursus de formation.
- Préposé APR permanent descriptif, fonctions proposées au singulier, anciens codes et descriptions libres préservés.
- Thème explicite, même vide, prioritaire : Phase I/II ne se rajoutent plus après une correction. Sans remplacement MOA explicite, la phase historique reste lisible.
- Diagnostic des OI publiés distinct des champs préparatoires ; commande de proposition de révision ciblée du module 1. Enregistrement PENDING, même événement, aucune synchronisation silencieuse. Les autres fiches restent éditables.
- Référentiel métier actualisé ; acquis de la PR, C sct, exports, moteurs, anti-doublons, suivi individuel et roadmap conservés.

## D. Réserves
Le clone conserve une ouverture du cycle au 05.03.2027. Les modules préparatoires 1/2 et PR 1.1 sont avant cette borne : rattachement métier à arbitrer, affiché dans le tableau, sans déplacement ni exception inventée.
Confirmation ciblée des OI de l'ancienne publication du module 1 et validation Codir de la clôture restent nécessaires avant validation annuelle définitive. Réservations de salles et disponibilité nominative ne sont pas réputées validées par ces propositions.
Alignement exhaustif IndeX : référence IndeX versionnée non disponible dans le dépôt, catalogue C3-B conservé sans refonte. Suivi spécialisé Cours ECA maintenu en roadmap : inscriptions/import cantonal, distinction cours/obligations SDIS, NIP, contributions, agrégats et exports avec les mécanismes SCOPE, sans module parallèle.

## E. Tests et preuves
8 tests nouveaux ciblés et 6 scénarios Chromium passent. Aucune reprise des recettes MOA acquises. Captures desktop/mobile inspectées ; aucune erreur JavaScript.
Clone PostgreSQL BEGIN/ROLLBACK : **873/873 Stat.Com identiques**, codes/identités existants et dates protégées conservés, **113 tables identiques après rollback**. Migration idempotente, clôture modifiable sans doublon, décision enregistrée/reouverte conservée, révision module 1 PENDING avec publication et présences identiques. Aucun événement opérationnel créé, aucun personnel/NIP, affectation ou lieu/salle modifié.
Build Netlify production et préflight réussis ; authentification production lue en GET : `methods=[local]`, LOCAL activé, OKTA désactivé. Aucun secret demandé, aucune écriture de recette en production.
Preuves : `docs/captures/qv-pr12-finalisation-20261012/`.

## F. Commit et PR
HEAD initial PR : `2532630aa08427870c1c01b64212a1cb089078e7`. Même branche `codex/scope-qv-roadmap-v1-20261012`, même PR https://github.com/Sdisnv/monitoringF7/pull/12. HEAD final : commit de finalisation publié dans cette PR et communiqué dans son rapport GitHub.
Main initial : `6f0eb8b`. Changements étrangers du checkout principal préservés. Aucune nouvelle PR, fusion, publication, modification ORION ou nouveau site Netlify. Marqueurs skip Netlify conservés jusqu'au GO.

## G. Verdict
**MOA_REQUIRED** : PR techniquement préparée pour une fusion après GO ; réserves métier ci-dessus visibles, sans bloquer la préparation des autres activités.
Après GO explicite : retirer le marqueur du titre, fusionner avec un message non marqué, contrôler le déploiement automatique et le commit publié, puis accès LOCAL et recette ciblée des nouveautés.

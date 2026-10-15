# Sources humaines de la capitalisation — 15.10.2026

Les décisions métier sont définies par la MOA SDIS régional du Nord vaudois. Ce fichier conserve la provenance humaine utile au transfert ; il ne remplace ni le canon ni le registre détaillé et n’autorise aucune exécution future par simple lecture.

## Source Permanent

Extrait exact de la mission « LOT CONSOLIDÉ — RECETTE MOA DU 15.10.2026 », transmis avant PR #21. Empreinte du fichier source intégral : `e47f6bd23bba4f83dfe3f8b33688eb2c48b2238f882d0b4553ebd4813a2daf51`. L’extrait ne prétend pas reproduire l’intégralité du mandat initial. Sa mise en œuvre et ses limites sont dans [le rapport #21](../SCOPE_QV_MOA_CONSOLIDE_20261015.md) et [QV-FAMILY-005](../business-rules/quo-vadis-canonical-rules.md).

```text

ÉTAPE 2 — FAMILLES MÉTIER

Nouvelle liste officielle :

SDIS
DPS
DAP
JSP
Permanent
FOBA
FOCO
FOCA
FOSPEC
AUTO
PR

La famille Permanent est officiellement validée
par la MOA.

Elle doit être disponible :

- Dans les fiches événements.
- Dans les filtres.
- Dans les statistiques.
- Dans les mécanismes de reconduction.

Ne reclasser automatiquement aucun événement
existant dans Permanent.

Respecter les identifiants et référentiels existants.

Le choix "—" (sans famille) apparaît toujours
en dernière position.

Conserver la possibilité de filtrer les événements
dont la famille est absente.

```

## Actualisation de phase A

La mission humaine d’actualisation (PR #20–#27, PASS, nouveaux jalons et réserves) est conservée intégralement dans [le registre des décisions capitalisé](../audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md). Elle conserve notamment le PASS CMDT Y1 96 / G1 384 / SDIS 46, sans en faire des invariants.

## Mission de phase B

Texte fourni par la MOA pour cette PR documentaire. La création de cette PR est autorisée ; fusion, déploiement, code, données et paramètres demeurent hors mandat. Empreinte de la source : `73d884edd5b38bcd13d95bb1645c19b50fad85f1a425a88b82e938cc7bd09f73`.

```text
MISSION : SCOPE ONLINE — PHASE B
CAPITALISATION DURABLE ET TRANSMISSION INTÉGRALE DU PROJET

DÉPÔT
Sdisnv/monitoringF7

BRANCHE DE RÉFÉRENCE
main

PRODUCTION
https://scope-sdisnv.netlify.app

MOA
SDIS régional du Nord vaudois

DATE DE RÉFÉRENCE
15 octobre 2026

PRIORITÉ MÉTIER
Finalisation de QUO VADIS 2027.

============================================================
1. OBJECTIF IMPÉRATIF
============================================================

Créer une documentation durable, structurée,
versionnée et vérifiable permettant :

1. De conserver la philosophie de développement SCOPE.
2. De préserver toutes les règles métier validées.
3. De préserver toutes les décisions MOA.
4. De préserver toutes les fonctionnalités acquises.
5. De conserver l'historique des validations.
6. De disposer d'une ROADMAP consolidée.
7. De disposer d'une ToDo List opérationnelle.
8. De retrouver les anomalies réellement ouvertes.
9. De retrouver les décisions encore nécessaires.
10. De reprendre immédiatement le développement.
11. De transmettre le projet à une nouvelle IA.
12. De ne plus dépendre des conversations ChatGPT.

IMPORTANT

La documentation doit permettre de reprendre
le projet même si les conversations précédentes
ne sont plus disponibles.

Elle doit être suffisamment détaillée pour
éviter de reconstruire les décisions historiques.

Elle ne doit pas créer un deuxième référentiel
métier concurrent.

============================================================
2. SOURCES DE VÉRITÉ
============================================================

Commencer par contrôler directement GitHub.

Vérifier :

- HEAD main.
- PR ouvertes.
- Dernières PR fusionnées.
- État des documents.
- Dernières décisions métier.
- Dernière ROADMAP.
- Dernière ToDo.
- Rapports de recette.
- Preuves de validation.

Lire intégralement :

docs/business-rules/quo-vadis-canonical-rules.md

docs/SCOPE_QV_ROADMAP_V1_20261012.md

docs/SCOPE_QV_MOA_20261014.md

docs/SCOPE_QV_V1_TESTS19_33_20261014.md

Lire également les documents des PR #20 à #27.

Exploiter les huit livrables de l'audit phase A
actualisé au 15.10.2026 :

SCOPE_AUDIT_INTEGRAL_20261015.md

SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md

SCOPE_ROADMAP_CONSOLIDEE_20261015.md

SCOPE_TODO_CONSOLIDEE_20261015.md

SCOPE_REGISTRE_ANOMALIES_20261015.md

SCOPE_MATRICE_TRACABILITE_20261015.md

SCOPE_PLAN_FINALISATION_QV_20261015.md

SCOPE_REGISTRE_DECISIONS_MOA_20261015.md

Ces huit livrables sont disponibles dans
le dossier de travail de l'audit.

Ne pas les reconstruire.

Ne pas recommencer l'audit global.

Vérifier leur version et leur provenance.

============================================================
3. ÉTAT DE RÉFÉRENCE
============================================================

Dernier état MOA communiqué :

PR #27 fusionnée et publiée.

Commit annoncé :
3bdad82029ef79ea721bcf4043a5bb47e4d86764

Recette CMDT :
PASS MOA sur le périmètre contrôlé.

Les PR #20 à #27 sont considérées comme
des acquis dans la portée de leurs validations.

Vérifier l'état GitHub actuel avant écriture.

Ne pas supposer que ce commit est encore HEAD
si de nouvelles PR ont été fusionnées.

Programme annuel 2027 :
NON VALIDÉ.

Audit phase A :
AUDIT_INCOMPLET, avec réserves documentées.

Ne pas transformer cet état en AUDIT_COMPLET.

============================================================
4. PHILOSOPHIE DE DÉVELOPPEMENT
============================================================

SCOPE est une application métier cumulative.

Le développement doit capitaliser sur l'existant.

PRINCIPES ABSOLUS

A. PRÉSERVATION

Toute fonctionnalité développée, testée et
validée constitue un acquis.

Ne jamais la reconstruire inutilement.

Ne jamais la modifier sans nécessité démontrée.

B. AUTORITÉ MÉTIER

La MOA définit les règles métier.

L'IA ne réinterprète pas les décisions.

Toute divergence exige un arbitrage MOA.

C. CONTRÔLE DIRECT

Avant chaque jalon :

- Lire les décisions applicables.
- Vérifier GitHub.
- Vérifier les développements existants.
- Vérifier les tests acquis.
- Vérifier les anomalies ouvertes.
- Vérifier les dépendances.
- Vérifier la nécessité d'une modification.

D. EFFICACITÉ

Limiter les interventions Codex/Cursor.

Éviter les micro-PR.

Regrouper les corrections déterministes.

Ne pas relancer les audits déjà effectués.

Ne pas redemander les validations acquises.

E. NON-RÉGRESSION

Aucune refonte globale.

Aucun moteur parallèle inutile.

Aucun nouveau référentiel concurrent.

Aucune suppression de capacité existante.

Aucune modification arbitraire des données.

F. TRAÇABILITÉ

Toute règle métier validée doit être versionnée.

Toute anomalie doit être suivie.

Toute correction doit conserver ses preuves.

Toute validation MOA doit être identifiable.

G. GOUVERNANCE

Distinguer impérativement :

- Fonctionnalité développée.
- Fonctionnalité fusionnée.
- Fonctionnalité publiée.
- Test technique réussi.
- Recette MOA réussie.
- Validation métier définitive.

Ces états ne sont pas interchangeables.

============================================================
5. CONTINUITÉ DE PRODUCTION
============================================================

La saisie en production doit rester accessible.

Ne jamais provoquer de gel général du système
pour une évolution documentaire.

Préserver :

- Consultation.
- Saisie.
- Enregistrement.
- Validation.
- Présences.
- Affectations.
- Publications existantes.
- Historiques.

Prévoir les interventions futures avec :

- Branches isolées.
- Tests ciblés.
- Contrôle du déploiement.
- Retour arrière.
- Gestion rapide des incidents.

Les corrections urgentes de production peuvent
être traitées indépendamment des grands jalons.

============================================================
6. ARCHITECTURE ET MODULES SCOPE
============================================================

Documenter les modules existants :

- Personnes.
- Grades.
- Fonctions.
- Affectations.
- Qualifications.
- Spécialisations.
- Candidatures.
- Événements.
- Présences.
- Obligations.
- Participations.
- Statistiques.
- Rapports.
- Formations.
- Cursus.
- Administration.
- QUO VADIS.

Décrire les interactions entre les modules.

Préserver la chaîne :

PERSONNE
→ AFFECTATION DATÉE
→ QUALIFICATION
→ PUBLIC APPLICABLE
→ ÉVÉNEMENT
→ OBLIGATION
→ PRÉSENCE
→ STATISTIQUE.

Distinguer les relations conceptuelles
des relations PostgreSQL réellement vérifiées.

Ne pas inventer de tables ou de contrats API.

============================================================
7. RÈGLES MÉTIER CANONIQUES
============================================================

Conserver le référentiel métier existant.

Ne pas recopier arbitrairement les règles.

Créer un index de navigation permettant
de retrouver rapidement :

- CTA.
- DPS.
- DAP.
- JSP.
- PR.
- PAPR.
- AUTO.
- FOBA.
- FOCO.
- FOCA.
- FOSPEC.
- Cursus.
- Sections.
- Demi-sections.
- Permanences.
- Publics.
- Responsables.
- Cycles.
- Reconduction.
- Publication.
- Révisions.
- Rapports.
- Statistiques.

Pour chaque groupe de règles :

- Source canonique.
- Identifiants QV-*.
- Décisions MOA.
- Composants existants.
- Tests disponibles.
- Réserves éventuelles.

Les règles abrogées doivent rester
identifiables comme historiques.

Ne jamais les réactiver implicitement.

============================================================
8. ACQUIS DES PR #20 À #27
============================================================

Capitaliser les développements et recettes :

PR #20 :
Familles et filtres.

PR #21 :
Famille Permanent et classifications.

PR #22 :
Conduites DAP, créneaux, reconnexion,
brouillons, cursus CI et publics.

PR #23 :
Horaires verticaux.
PASS MOA.

PR #24 :
Public cible et Responsable.
PASS partiel.

PR #25 :
Échelon 0, regroupements,
préparations, calendrier et dates validées.
PASS partiel.

PR #26 :
Alertes bidirectionnelles.
Formations groupées DPS/DAP.
OI SDIS transversal.
PASS sur les cas démontrés.

PR #27 :
Diffusion CMDT.
PASS MOA.

Conserver les preuves exactes.

Ne pas transformer les PASS partiels
en validations complètes.

Ne pas rouvrir les acquis sans régression
démontrée.

============================================================
9. ROADMAP DURABLE
============================================================

Utiliser la ROADMAP consolidée de phase A.

Ne pas créer une Roadmap concurrente.

Pour chaque jalon :

- Identifiant.
- Intitulé.
- Description métier.
- Source.
- Priorité.
- État.
- Dépendances.
- Développement existant.
- Tests.
- Validation MOA.
- Critères d'acceptation.
- Prochain résultat attendu.

Distinguer :

ACQUIS VALIDÉ
DÉVELOPPÉ NON VALIDÉ
PARTIELLEMENT DÉVELOPPÉ
À DÉVELOPPER
BLOQUÉ MOA
ANOMALIE OUVERTE
NON VÉRIFIÉ.

Les acquis restent visibles.

Les chantiers futurs restent conservés.

============================================================
10. TODO LIST DURABLE
============================================================

Utiliser la ToDo consolidée de phase A.

Ne pas créer une deuxième ToDo indépendante.

Chaque tâche doit contenir :

- Identifiant.
- Description.
- Priorité.
- Module.
- Dépendances.
- Responsable de décision.
- État.
- Preuve.
- Critère de clôture.

Distinguer les incidents de production
des évolutions fonctionnelles.

Ne pas supprimer les tâches historiques
sans preuve de clôture.

============================================================
11. PRIORITÉ QUO VADIS
============================================================

La priorité absolue reste :

FINALISER LE PROGRAMME ANNUEL 2027.

Préserver la chaîne :

VALIDATION ANNUELLE
→ PUBLICATION
→ CRÉATION/LIAISON DES ÉVÉNEMENTS
→ ASSIGNATIONS
→ PROGRAMMES INDIVIDUELS
→ COMMUNICATION
→ MODIFICATIONS ULTÉRIEURES.

Conserver les chantiers :

QV-CONTROLE-QUALITE-001

QV-PLANIF-ALTERNATIVES-001

QV-CONSULTATION-001

QV-RULES-001

QV-CYCLE-007

QV-PDF-003 — complément MOA.

Préserver également :

- Arbitrages M1–M7 et P1–P6.
- Révisions EM, PR et JSP.
- Relations préparatoires mixtes.
- Chefs de section datés.
- Public cible / Responsable.
- Cours ECA.
- Observations.
- IndeX.
- ECAwin.
- ProgJour.
- GELORE2.

ProgJour reste suspendu.

GELORE2 reste dépendant de la réponse
du fournisseur.

============================================================
12. RÉSERVES DE L'AUDIT
============================================================

Conserver explicitement :

- AUDIT_INCOMPLET.
- Couverture historique non exhaustive.
- Certaines preuves de tests non reliées.
- Certaines recettes réelles non démontrées.
- PDF témoin non obtenu.
- Diagnostic causal des erreurs Netlify
  non établi.
- Programme annuel 2027 NON VALIDÉ.

Ne pas transformer une réserve en anomalie
technique certaine.

Ne pas masquer les informations manquantes.

============================================================
13. DOCUMENT MAÎTRE À CRÉER
============================================================

Créer :

docs/SCOPE_PROJECT_MASTER_CONTEXT.md

Ce document doit devenir le point d'entrée
officiel du projet pour toute nouvelle IA
ou tout nouveau développeur.

Il doit contenir :

1. Présentation générale.
2. Philosophie de développement.
3. Organisation métier SDIS.
4. Architecture applicative.
5. Sources de vérité.
6. Hiérarchie des décisions.
7. Référentiel métier.
8. Fonctionnalités acquises.
9. Règles de non-régression.
10. ROADMAP.
11. ToDo.
12. Anomalies ouvertes.
13. Arbitrages MOA.
14. État de production.
15. Procédure de reprise.
16. Protocole Codex/Cursor.
17. Procédure de recette.
18. Procédure de publication.
19. Gestion des incidents.
20. Développements futurs.

IMPORTANT

Le document maître est un index opérationnel
et un guide de gouvernance.

Il ne remplace pas les documents détaillés.

Chaque référence doit pointer vers
un document réellement présent et versionné.

Aucun lien vers un fichier temporaire local.

============================================================
14. DOCUMENTS COMPLÉMENTAIRES
============================================================

Capitaliser les huit livrables de phase A
dans une structure documentaire claire.

Conserver leur contenu et leurs preuves.

Ne pas remplacer les documents canoniques
par des résumés.

Éviter les doublons documentaires.

Proposer une organisation de type :

docs/project-context/
docs/audits/
docs/roadmap/
docs/decisions/

IMPORTANT

Cette structure est indicative.

Avant toute création de répertoire,
examiner l'organisation existante de docs/.

Réutiliser les emplacements actuels
lorsqu'ils conviennent.

Ne pas déplacer massivement les documents.

============================================================
15. PROTOCOLE DE REPRISE
============================================================

Créer une procédure permettant de reprendre
SCOPE dans une nouvelle conversation.

Elle doit imposer :

1. Lecture du contexte maître.
2. Lecture du référentiel métier.
3. Lecture de la ROADMAP et de la ToDo.
4. Contrôle GitHub.
5. Contrôle Netlify.
6. Vérification des PR.
7. Vérification des acquis.
8. Identification des anomalies ouvertes.
9. Identification du prochain jalon.
10. Validation MOA avant développement.

Aucun audit général automatique
à chaque nouvelle conversation.

Aucun développement avant compréhension
des décisions applicables.

============================================================
16. PROMPT OFFICIEL DE REPRISE
============================================================

Créer un document :

docs/SCOPE_NEW_CONVERSATION_PROMPT.md

Il doit contenir un prompt complet permettant
de démarrer une nouvelle conversation
ChatGPT, Claude ou autre IA.

Ce prompt doit :

- Présenter SCOPE.
- Présenter la priorité QUO VADIS.
- Identifier GitHub et Netlify.
- Imposer les sources de vérité.
- Imposer la philosophie de développement.
- Préserver les acquis.
- Préserver la ROADMAP et la ToDo.
- Préserver les décisions MOA.
- Interdire les reconstructions inutiles.
- Interdire les modifications non autorisées.
- Limiter les interventions Codex.
- Prévoir les recettes ciblées.
- Prévoir la capitalisation continue.
- Distinguer audit, développement,
  déploiement et validation métier.

Le prompt doit être directement copiable.

Il ne doit pas dépendre de cette conversation.

============================================================
17. CONTRÔLES DE QUALITÉ
============================================================

Avant livraison :

- Vérifier les liens documentaires.
- Vérifier les références GitHub.
- Vérifier les identifiants de règles.
- Vérifier les statuts.
- Vérifier les décisions MOA.
- Vérifier la cohérence Roadmap/ToDo.
- Vérifier la conservation des acquis.
- Vérifier les réserves.
- Vérifier l'absence de secrets.
- Vérifier l'absence de données personnelles.
- Vérifier l'absence de modification métier.

Contrôler le diff Git.

Aucun fichier applicatif modifié.

Aucune migration modifiée.

Aucune configuration modifiée.

Aucune donnée modifiée.

============================================================
18. LIVRAISON
============================================================

Produire une seule PR documentaire.

La PR doit contenir :

- Contexte maître.
- Prompt de nouvelle conversation.
- Documentation de reprise.
- Références aux huit livrables.
- ROADMAP/ToDo capitalisées.
- Registre des décisions.
- Réserves de l'audit.

Fournir :

- Numéro de PR.
- Branche.
- Commit.
- Liste des fichiers.
- Résultat des contrôles.
- Preuves de cohérence.
- Éléments non vérifiés.

Ne pas fusionner.

Ne pas déployer.

Ne pas modifier la production.

VERDICT ATTENDU :

READY_FOR_MOA

Uniquement si la documentation est cohérente,
complète dans le périmètre des sources disponibles
et vérifiée.

Sinon :

MOA_REQUIRED

avec la liste précise des éléments manquants.

============================================================
19. INTERDICTIONS FINALES
============================================================

Aucun changement de code métier.

Aucune modification des données.

Aucune migration.

Aucune modification Okta.

Aucune modification Netlify.

Aucune modification des permissions.

Aucune modification RLS.

Aucune publication du Programme annuel.

Aucune création d'événement opérationnel.

Aucune modification des présences.

Aucune modification des affectations.

Aucune modification des qualifications.

Aucune refonte.

Aucun nouveau moteur.

Aucune reconstruction de fonctionnalité.

Aucune modification hors documentation.

Aucune fusion sans GO MOA.

FIN DE MISSION
```

# C19 - PREPROD GATE 3

## A. Verdict global

**PASS_WITH_EXPLICIT_RESERVATIONS**. Consolidation locale/preprod uniquement.

## B. Git

HEAD de référence `362d6c41381ae106c318d9c9081cb83fc23588f4`; aucun commit, push ou déploiement.

## C. Workflow

definition -> annualRequirement -> occurrence -> session -> placementPayload -> programmedActivity

## D. Modèle

Identités conservées: uid, definitionUid, occurrenceId, sessionId, activityId.

## E. FOBA DPS

FOBA1 N -> FOBA2 N+1; FOBA2 N -> FOBA3 N+1; FOBA3 N -> intégration DPS N+1.

## F. FOBA DAP

FOBA1 N -> FOBA2 N+1; FOBA2 N -> fin de parcours DAP N+1.

## G. FOBA 05.01.2027

Intégration personnel DPS, phase I: FOBA 2, responsable C FOBA, rôle CHEF-FOBA; C for conservé comme historique.

## H. StatCom 87/91

Le snapshot PDF annoncé contient 87 entrées; le référentiel SCOPE courant en contient 91 et prime opérationnellement.

## I. Quatre codes

010JB1 (Exercices JSP B1), 010JC1 (Exercices JSP C1), 010JG1 (Exercices JSP G1), COURJSP (Cours JSP).

## J. Sans StatCom

12 activités SDIS restent AMBIGUOUS_REVIEW; les externes hors suivi peuvent rester sans code.

## K. EMSEA

Code source QUO VADIS utilisé pour les séances EM de 2026 à 2027; absent du référentiel canonique SCOPE et sans succession démontrée. Ne pas convertir automatiquement; correspondance canonique à confirmer.

## L. CTA structure

G1 N01-N06; C1/B1/B2 N01-N03.

## M. CTA capacités

G1 section <=15 et demi-section <=8.

## N. CTA autres sites

C1/B1/B2 sans limite 8/15 inventée.

## O. CTA permanence

53 fenêtres vendredi 18:00 -> lundi 06:00 maintenues.

## P. Calendrier ordinaire

Les quatre statuts protégés sont interdits pour la définition de recette.

## Q. Exception permanence

23 permanences croisent un statut protégé et restent autorisées par continuité de service.

## R. Propositions

2027-01-11, 2027-01-12, 2027-01-13.

## S. Programmation

La proposition sélectionnée produit une session canonique, sans copie autonome.

## T. Écran 1

Catalogue complet et lignes alternées.

## U. Écran 2

Définition, grille rééquilibrée et entrée en service propagée.

## V. Écran 3

Règles calendrier administrées et consommées.

## W. Écran 4

Besoin annuel dynamique lié à la définition.

## X. Écran 5

Occurrences/sessions avec provenance.

## Y. Écran 6

Payload de placement dérivé de la session.

## Z. Écran 7

Propositions filtrées par calendrier et motifs visibles.

## AA. Écran 8

Événement connu avec entrée en service.

## AB. Écran 9

Deux activités ouvrables, modification puis revérification.

## AC. Écran 10

Publics dédupliqués à la racine.

## AD. Écran 11

Titre QUO VADIS '27 et permanence visible pendant les périodes protégées.

## AE. Écran 12

Déplacement conservé, recette de non-régression.

## AF. Date/heure

Date, Début, Fin et Durée normalisés dans les parcours éditables.

## AG. Entrée en service

Champ texte jusqu’à 60 caractères, propagé définition -> session -> activité.

## AH. Multi-public

Doublons de tableaux Public dans la preview: 0.

## AI. Scénario transverse

Définition -> besoin -> occurrence -> session -> placement -> programmation -> activité -> conflit -> modification -> revérification.

## AJ. Scénario FOBA

Progression et responsabilité canonique validées sur qv-source-852.

## AK. Scénario calendrier

Activité ordinaire refusée sur statut protégé; permanence maintenue.

## AL. Scénario StatCom

91 codes courants consommés; quatre ajouts isolés; aucun code EMSEA inventé.

## AM. Responsive

Recette à 1500, 1150, 960 et 800 px: aucun débordement global sur les 12 écrans.

## AN. Performance

1000 objets synthétiques, distincts des 72 dates source: 994.63 ms.

## AO. Tests ciblés

Gate 3 15/15; Gate 2 17/17; C18 18/18; C19 9/9; UX 67/67; 1A 10/10; 1B 8/8.

## AP. Suite globale

Une exécution: arrêt sur le cache-bust connu de scope-login-visual-alignment-orion-1-tests.js; aucune régression Gate 3 avant cet arrêt.

## AQ. P1

0

## AR. P2

STATCOM_PDF_UNAVAILABLE

## AS. Indéterminable

Correspondance canonique EMSEA; Ordre des tournus CTA; Affectations personnelles 2027 complètes.

## AT. Fichiers

Générateur, tests, moteur, modèle, preview et rapports Gate 3.

## AU. URL locale

http://127.0.0.1:4186/?preprod=1 répond localement.

## AV. Captures

definition-1500, definition-800, conflicts-1150 et agenda-1150.

## AW. Git final

Aucune opération Git distante ni écriture SCOPE.

## AX. Recommandation

GO preprod sous réserve de fournir le PDF StatCom annoncé et d’arbitrer EMSEA/tournus CTA.

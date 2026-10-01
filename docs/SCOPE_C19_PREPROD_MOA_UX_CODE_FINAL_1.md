# C19 — PREPROD MOA UX CODE FINAL 1

## A. Verdict global

**PASS**.

## B. Git initial/final

Branche `main`; initial et final `362d6c41381ae106c318d9c9081cb83fc23588f4`; worktree existant préservé.

## C. Cause des codes QVxx

Les identifiants techniques QV26-* du catalogue importé avaient été recopiés dans definition.code.

## D. Nouvelle règle code métier

`STAT.COM + "." + compteur stable sur exactement 3 chiffres`.

## E. Compteur 3 chiffres

329 codes alloués; 0 format invalide; 0 collision.

## F. Stabilité du code

Allocation déterministe dans l’ordre source stable; le même code est propagé de la définition au programme sans recalcul au rendu.

## G. Identifiants techniques internes

345/345 `uid` techniques conservés et séparés du champ `code`.

## H. Activités externes

Stat.Com vide et code métier vide; un identifiant technique local reste disponible.

## I. Recherche globale anciens codes

345 anciens codes QVxx migrés; 0 QVxx restant dans un champ métier visible.

## J. Migration locale des codes

Table exhaustive de 345 lignes dans le JSON de preuve: ancien code, Stat.Com, nouveau code, ID technique, type et raison.

## K. 87 Stat.Com PDF

**87** codes documentaires officiels.

## L. 4 extensions SCOPE exactes

- `010JB1` — Exercices JSP B1; JSP; source QUO VADIS '26; introduction 2026-01-01; utilisé: oui; PDF: non; SCOPE: oui; **EXTENSION SCOPE**.
- `010JC1` — Exercices JSP C1; JSP; source QUO VADIS '26; introduction 2026-01-01; utilisé: oui; PDF: non; SCOPE: oui; **EXTENSION SCOPE**.
- `010JG1` — Exercices JSP G1; JSP; source QUO VADIS '26; introduction 2026-01-01; utilisé: oui; PDF: non; SCOPE: oui; **EXTENSION SCOPE**.
- `COURJSP` — Cours JSP; JSP; source QUO VADIS '26; introduction 2026-01-01; utilisé: oui; PDF: non; SCOPE: oui; **EXTENSION SCOPE**.

## M. Statut des 4 extensions

Les 4 entrées restent explicitement **EXTENSION SCOPE**; elles ne sont pas présentées comme officielles PDF.

## N. Écran 1

PASS — 345 définitions, colonnes Code et Stat.Com séparées, aucun QV visible.

## O. Écran 2

PASS — Identité métier sur cinq colonnes, Code attribué à l’enregistrement, structure occurrence lisible.

## P. Écran 3

PASS — Préférences et contraintes alignées; rôles/ressources scrollables et proportions MOA respectées.

## Q. Écran 4

PASS — Contexte annuel explicite, multi-public et administration des dates annoncées alignée à 36 px.

## R. Écran 5

PASS — Occurrences et sessions conservent Code, Stat.Com et contexte métier sans identifiant technique visible.

## S. Écran 6

PASS — Placement automatique conserve Code, Stat.Com, cible, public et lieu.

## T. Écran 7

PASS — Propositions lisibles et cohérentes avec le moteur métier existant.

## U. Écran 8

PASS — Événement externe sans code; Date/Début/Fin/Durée alignés et durée 12 h 30 exacte.

## V. Écran 9

PASS — Conflits réels, liens A/B, analyse et revérification opérationnels sans QV visible.

## W. Écran 10

PASS — 622 activités, colonnes Code/Stat.Com cohérentes, filtres sans débordement et éditeur métier propre.

## X. Écran 11

PASS — Agenda annuel QUO VADIS '27 lisible, couleurs et détails journaliers conservés.

## Y. Écran 12

PASS — Déplacement chronologique conserve codes métier, états et moteur de compatibilité commun.

## Z. Date/Début/Fin/Durée

Écran 8: Date, Début, Fin et Durée mesurent 36 px; 07:00–19:30 produit 12 h 30.

## AA. Hauteurs contrôles

Tous les contrôles métier des écrans 2, 3, 4 et 8 mesurent 36 px, hors listes multiples volontairement hautes à 76 px et cases à cocher natives.

## AB. Alignements

Écran 2: les cinq champs d’identité partagent y=282.5; écran 4: les cinq champs annuels partagent y=298.5 et les cinq champs de date annoncée partagent y=540; écran 8: Date/Début/Fin/Durée partagent y=333.

## AC. Largeurs

Écran 2: Stat.Com 319.3 px, Code 268.2 px, Domaine/Famille 173.7 px, Type 199.2 px; occurrences 180 px et sessions 260 px. Écran 3: ressources 340 px, rôles 307.8 px, horaires 205.2 px, importance 293.1 px.

## AD. Listes scrollables

Les listes multiples Rôles et Ressources de l’écran 3 sont scrollables (hauteur 76 px, scrollHeight supérieur à clientHeight).

## AE. Zébrage

Catalogue, activités et listes de sessions: alternance gris/blanc conservée.

## AF. Actions textuelles

Aucune action textuelle soulignée; chevrons discrets conservés selon contexte.

## AG. États

Carrés 8×8 et couleurs SCOPE #2f9e5a, #DE000A, #c98412, #4f84d6, #8b949e.

## AH. DPS transverse

{"key":"DPS","definitionId":"QV26-8-KM-DU-SDIS-D2C38C47","annualNeedId":"QV27:NEED:QV26-8-KM-DU-SDIS-D2C38C47","occurrenceId":"QV26-8-KM-DU-SDIS-D2C38C47:O1","sessionId":"QV26-8-KM-DU-SDIS-D2C38C47:O1:S1","activityId":null,"businessCode":"","statCom":"","domain":"DPS","target":"SOURCE-OI-DAP-Y1-DAP-Y2-DAP-Y3-DAP-Y4-DPS-B1-DPS-B2-DPS-C1-DPS-G1-JSP-B1-JSP-C1-JSP-G1","publics":["FOBA:1","JSP:1"],"location":"L-C1","room":"","provenance":"RECURRENCE_RULE","stable":true}

## AI. DAP transverse

{"key":"DAP","definitionId":"QV26-COURS-DE-CADRES-EXERCICE-DAP-1-871DAD30","annualNeedId":"QV27:NEED:QV26-COURS-DE-CADRES-EXERCICE-DAP-1-871DAD30","occurrenceId":"QV26-COURS-DE-CADRES-EXERCICE-DAP-1-871DAD30:O1","sessionId":"QV26-COURS-DE-CADRES-EXERCICE-DAP-1-871DAD30:O1:S1","activityId":null,"businessCode":"013Y1.001","statCom":"013Y1","domain":"DAP","target":"SOURCE-OI-DAP-Y1-DAP-Y2-DAP-Y3-DAP-Y4","publics":[],"location":"L-Y1","room":"","provenance":"RECURRENCE_RULE","stable":true}

## AJ. JSP transverse

{"key":"JSP","definitionId":"QV26-CHAMPIONNAT-SUISSES-JSP-2156FD86","annualNeedId":"QV27:NEED:QV26-CHAMPIONNAT-SUISSES-JSP-2156FD86","occurrenceId":"QV26-CHAMPIONNAT-SUISSES-JSP-2156FD86:O1","sessionId":"QV26-CHAMPIONNAT-SUISSES-JSP-2156FD86:O1:S1","activityId":null,"businessCode":"010JSP.003","statCom":"010JSP","domain":"JSP","target":"SOURCE-OI-JSP-B1-JSP-C1-JSP-G1","publics":["JSP:1"],"location":"","room":"","provenance":"RECURRENCE_RULE","stable":true}

## AK. PR transverse

{"key":"PR","definitionId":"QV26-EXERCICE-PR-1-1-30B1E01A","annualNeedId":"QV27:NEED:QV26-EXERCICE-PR-1-1-30B1E01A","occurrenceId":"QV26-EXERCICE-PR-1-1-30B1E01A:O1","sessionId":"QV26-EXERCICE-PR-1-1-30B1E01A:O1:S1","activityId":null,"businessCode":"011PR.009","statCom":"011PR","domain":"PR","target":"PR","publics":["PR:2"],"location":"L-G1","room":"","provenance":"RECURRENCE_RULE","stable":true}

## AL. FOBA transverse

{"key":"FOBA","definitionId":"QV26-ENTRETIEN-DE-COLLABORATION-AVEC-COMMANDANT-B80CFF32","annualNeedId":"QV27:NEED:QV26-ENTRETIEN-DE-COLLABORATION-AVEC-COMMANDANT-B80CFF32","occurrenceId":"QV26-ENTRETIEN-DE-COLLABORATION-AVEC-COMMANDANT-B80CFF32:O1","sessionId":"QV26-ENTRETIEN-DE-COLLABORATION-AVEC-COMMANDANT-B80CFF32:O1:S1","activityId":null,"businessCode":"010FOBA.001","statCom":"010FOBA","domain":"FOBA","target":"DPS-G1","publics":["FOBA:2"],"location":"L-G1","room":"R-G1-EM","provenance":"RECURRENCE_RULE","stable":true}

## AM. CTA transverse

{"key":"CTA","definitionId":"CTA-PERMANENCE","annualNeedId":"QV27:NEED:CTA-PERMANENCE","occurrenceId":"CTA-PERM-2027-01-01:O1","sessionId":"CTA-PERM-2027-01-01:S1","activityId":"CTA-PERM-2027-01-01","businessCode":"","statCom":"","domain":"DPS","target":"DPS-G1","publics":[],"location":"L-G1","room":"","provenance":"CTA_RULE+CTA_TURNUS_SOURCE","stable":false}

## AN. EMSEA transverse

{"key":"EMSEA","definitionId":"QV26-SEANCE-EM-ED042EBD","annualNeedId":"QV27:NEED:QV26-SEANCE-EM-ED042EBD","occurrenceId":"QV27:EMSEA:O01","sessionId":"QV27:EMSEA:S01","activityId":"qv-source-862","businessCode":"","statCom":"","domain":"Institutionnel","target":"SDIS-EM","publics":[],"location":"L-G1","room":"","provenance":"SOURCE_2027_EXPLICIT+MOA_CANONICAL_EMSEA","stable":true}

## AO. Externe transverse

{"key":"EXTERNE","definitionId":"external-local-fixture","annualNeedId":null,"occurrenceId":null,"sessionId":null,"activityId":"external-local-event","businessCode":"","statCom":"","domain":"Externe","target":"EXTERNAL","publics":[],"location":"L-CANTON","room":"","provenance":"LOCAL_PREPROD","stable":true}

## AP. 622 objets avant

**622**.

## AQ. Objets après

**622**.

## AR. Diff expliqué

Variation 0; aucune suppression ni duplication silencieuse.

## AS. CTA non-régression

53 permanences conservées.

## AT. EMSEA non-régression

11 occurrences, mardi prioritaire, sans faux Stat.Com.

## AU. FOBA non-régression

FOBA1 N → FOBA2 N+1 → FOBA3 → intégration DPS; FOBA1 N → FOBA2 N+1 → fin du parcours.

## AV. Calendrier non-régression

Jours protégés, veilles, vacances et exception CTA conservés.

## AW. Conflits non-régression

Moteur commun écrans 9/12 conservé; liens A/B et revérification recettés.

## AX. Captures 1500

12 captures 1500 px.

## AY. Captures responsive

12 captures responsive pertinentes.

## AZ. Mesures bounding boxes

55 mesures objectives enregistrées.

## BA. Tests nouveau lot

31/31 PASS

## BB. Tests C18/C19

10 suites C18/C19 PASS: catalogue C18 18/18, moteur C19 9/9, UX C19 67 contrôles, Gate 1 10/10, Gate 1 R1 PASS, Gate 2 17/17, Gate 3 15/15, MOA final 20/20, Canonical Truth 25/25, nouveau lot 31/31.

## BC. npm run test:scope

npm run test:scope exécuté une seule fois: exit 1 sur le défaut préexistant de cache-bust SCOPE visuel dans scope-login-visual-alignment-orion-1-tests.js (test 06); aucune nouvelle régression C19 observée avant cet arrêt.

## BD. Erreurs console

0 erreur(s).

## BE. Findings P1

**0**.

## BF. Findings P2

**0 nouveau P2 lié au lot**.

## BG. Points MOA réellement ouverts

Aucun après recette finale.

## BH. Fichiers modifiés

Générateur, tests et rapport du lot; dataset preview; couche finale app/CSS. Aucune donnée SCOPE réelle.

## BI. URL preview

`http://127.0.0.1:4186/?preprod=1`

## BJ. Git final/worktree

HEAD `362d6c41381ae106c318d9c9081cb83fc23588f4`; aucun commit, push, Netlify, déploiement, migration prod ou écriture SCOPE.

## BK. Verdict Gate

**PASS MOA local**.

## BL. Recommandation étape suivante

**GO pour C19-QUO-VADIS-27-FULL-DRESS-REHEARSAL-1**, sans l’exécuter dans ce lot.

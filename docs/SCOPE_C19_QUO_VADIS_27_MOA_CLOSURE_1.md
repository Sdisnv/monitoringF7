# C19 — QUO VADIS '27 — MOA CLOSURE 1

## A. Verdict global

**PASS** — les points de fermeture sont démontrés, sans P1/P2 nouveau.

## B. Git initial/final

`362d6c41381ae106c318d9c9081cb83fc23588f4` → `362d6c41381ae106c318d9c9081cb83fc23588f4`, sans commit.

## C. QUO VADIS '27

Libellé dynamique exact sur les quatre surfaces : menu écran 11, bouton écran 10, titre écran 11, bouton écran 12.

## D. CTA durée réelle

Un objet continu : `2027-01-01T18:00` → `2027-01-04T06:00`, 3600 min (60 h).

## E. CTA périodes protégées

Le cas du 01.01 traverse 2027-01-01, 2027-01-02, 2027-01-03, 2027-01-04 sous exception `SERVICE_CONTINUITY`; samedi, dimanche et lundi avant 06:00 sont en conflit, lundi dès 06:00 est compatible.

## F. 622/635

72 + 53 + 0 + 9 + 479 + 3 + 6 = 622; 622 + 13 = 635. L'écran 10 ouvre sur Programme 2027 (622) et propose séparément Historique / non reconduit (13).

## G. Activités externes

Les 13 lignes sont des traces 2026 sans date 2027, marquées NON_RECONDUIT, hors programme 2027, sans suppression.

## H. Codes Stat.Com.xxx

326 définitions codées; 0 format invalide, 0 collision sémantique, 0 externe codé.

## I. FOBA phase II

Une activité canonique 070F1.005 matérialisée par quatre affectations OI G1/C1/B1/B2; même définition et lien canonique explicite.

## J. EMSEA

Signification résolue : Séance État-major. Aucun Stat.Com démontré; affichage neutre Non applicable, sans invention.

## K. Fenêtres EMSEA

| Occurrence | Période | Propositions | Priorité | Date source |
|---:|---|---|---|---|
| 1 | 2027-01-01 → 2027-01-31 | — | Mardi | 2027-01-12 |
| 2 | 2027-02-01 → 2027-02-28 | — | Mardi | 2027-02-24 |
| 3 | 2027-03-01 → 2027-03-31 | 2027-03-02, 2027-03-09, 2027-03-16 | Mardi | — |
| 4 | 2027-04-01 → 2027-04-30 | 2027-04-13, 2027-04-20, 2027-04-27 | Mardi | — |
| 5 | 2027-05-01 → 2027-05-31 | 2027-05-04, 2027-05-11, 2027-05-18 | Mardi | — |
| 6 | 2027-06-01 → 2027-06-30 | 2027-06-01, 2027-06-08, 2027-06-15 | Mardi | — |
| 7 | 2027-07-01 → 2027-07-31 | 2027-07-01 | Mardi | — |
| 8 | 2027-08-01 → 2027-08-31 | 2027-08-24, 2027-08-31, 2027-08-23 | Mardi | — |
| 9 | 2027-09-01 → 2027-09-30 | 2027-09-07, 2027-09-14, 2027-09-21 | Mardi | — |
| 10 | 2027-10-01 → 2027-10-31 | 2027-10-05, 2027-10-26, 2027-10-01 | Mardi | — |
| 11 | 2027-11-01 → 2027-11-30 | 2027-11-02, 2027-11-09, 2027-11-16 | Mardi | — |

## L. Lieux / Caserne SDIS

Le libellé artificiel est retiré. Triathlon Yverdon utilise Non déterminé; G1 n’est pas inventé.

## M. Conflits ouverture A/B

Les deux actions conservent la clé du scénario sélectionné.

## N. Retour contexte

Le scénario actif est remis en évidence et ramené dans la zone visible.

## O. Revérification

Le résultat obsolète est supprimé après édition; Revérifier recalcule avec le moteur partagé de déplacement.

## P. Écran 10

Programme/historique séparés; FOBA 05/06.01, JSP, CTA, externe et absence légitime de Stat.Com contrôlés.

## Q. Écran 11

Titre/menu QUO VADIS '27; CTA visible sur chaque jour couvert, y compris période protégée; ouverture de fiche conservée.

## R. Écran 12

Retour QUO VADIS '27; CTA multi-jour lisible et date fixée; même moteur de contraintes.

## S. Responsive

16/16 contrôles PASS sur 1500/1150/960/800, 0 erreur console.

## T. Tests ciblés

13/13 PASS; suites liées 140/140.

## U. npm run test:scope

KNOWN_FAILURE, exécution unique; premier défaut scope-login-visual-alignment-orion-1-tests.js — cache-bust SCOPE visuel uniquement; régression C19 : non.

## V. Findings P1/P2

0 P1; 0 P2 nouveau.

## W. Arbitrages réellement restants

479 placements sans horaire/règle discriminante; 9 choix EMSEA; 3 arbitrages métier; 6 fiches à compléter; 4 conflits source.

## X. Fichiers modifiés

Moteur C19 partagé, preview app/index/styles/data, générateur/tests et preuves de ce lot.

## Y. URL locale

`http://127.0.0.1:4186/?preprod=1`

## Z. Git final / worktree

HEAD `362d6c41381ae106c318d9c9081cb83fc23588f4`; worktree préexistant conservé, aucun commit/push/Netlify/déploiement/migration/écriture SCOPE/ORION.

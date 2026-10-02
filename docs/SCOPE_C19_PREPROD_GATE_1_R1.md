# C19-PREPROD-GATE-1-R1 — Recovery des règles métier

## A. Verdict

**PASS.** La base de vérité du Gate 1 est requalifiée sans génération 2027 et sans écriture SCOPE.

## B. Git initial/final

Branche : `codex/qv-recette-programme-cta-edit-3`. HEAD : `55667a79012e976d54f5c90cc183628f8897cec9` (référence attendue identique). Worktree préexistant préservé :

```text
    M assets/css/scope.css
     M assets/js/scope-api.js
     M assets/js/scope-ui-logic.js
     M assets/js/scope-ui.js
     M docs/SCOPE_C19_PREPROD_GATE_1_R1.json
     M docs/SCOPE_C19_PREPROD_GATE_1_R1.md
     M docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.json
     M docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.md
     M netlify/functions/scope.js
     M netlify/lib/_scope-cta-rules.js
     M netlify/lib/_scope-quo-vadis-consolidation.js
     M netlify/lib/_scope-quo-vadis-coverage.js
     M netlify/lib/_scope-quo-vadis-service.js
     M netlify/lib/_scope-qv-referential-management.js
     M netlify/lib/data/scope-qv-programme-2027.json
     M scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js
     M scripts/scope-quo-vadis-calendar-vd-final-4-tests.js
     M scripts/scope-quo-vadis-moa-consolidation-2-tests.js
     M scripts/scope-qv-finalisation-local-tests.js
    ?? deno.lock
    ?? docs/captures/
    ?? docs/scope-qv-agenda-programme-ux-final-1-recette.md
    ?? docs/scope-qv-business-audit.json
    ?? docs/scope-qv-business-consolidation-recette.md
    ?? docs/scope-qv-cta-divergences.md
    ?? docs/scope-qv-history-sections-ux-recette.md
    ?? docs/scope-qv-repair-2-complement-consolidated-report.md
    ?? netlify/lib/data/scope-qv-history-2026.json
    ?? scripts/fixtures/
    ?? scripts/scope-qv-agenda-programme-ux-final-1-tests.js
    ?? scripts/scope-qv-business-audit.js
    ?? scripts/scope-qv-business-consolidation-tests.js
    ?? scripts/scope-qv-extract-history-2026.js
    ?? scripts/scope-qv-final-development-1-tests.js
    ?? scripts/scope-qv-history-sections-ux-tests.js
    ?? scripts/scope-qv-local-fixture.js
    ?? scripts/scope-qv-local-recipe-server.js
    ?? scripts/scope-qv-repair-2-tests.js
    ?? tmp-scope-r3-pdfs/
    ?? tmp-scope-r4-pdfs/
    ?? tmp-scope-r5-pdfs/
```

## C. Méthode de recherche SCOPE

- Schéma et migrations
- Référentiels et services
- Repositories et API
- UI et statistiques
- Moteurs de règles et conflits
- Tests ciblés
- Réconciliation du classeur QUO VADIS 2026

## D. Stat.Com — implémentation retrouvée

Source canonique unique : `scope_statcom_referentiel`, alimentée par `netlify/lib/_scope-statcom-referential.js`. Schéma, repositories mémoire/PostgreSQL, service, API, UI et tests sont présents. C19 doit la consommer et ne doit créer aucun référentiel parallèle.

## E. Stat.Com — statistiques SCOPE

Les versions de définitions, événements et exercices portent `statcom_code` et `statcom_snapshot`. Le catalogue annuel porte `scope_activity_statistical_contributions`; l’API `/reports/statcom` agrège les usages.

## F. 39 lignes sans Stat.Com — reclassification A/B/C/D

Totaux : **A=26, B=1, C=12, D=0**.

| Ligne | Date | Activité | Domaine | Nature | Suivi attendu | Correspondance | Cat. | Verdict |
|---:|---|---|---|---|---|---|:---:|---|
| 5 | 2026-01-23 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 30 | 2026-02-23 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 33 | 2026-02-24 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 44 | 2026-02-25 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 47 | 2026-02-26 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 132 | 2026-03-13 | Cours ECA FB01 - formation de base recrues | FOBA | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 138 | 2026-03-14 | Cours ECA FB01 - formation de base recrues | FOBA | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 195 | 2026-03-27 | Assemblée générale de la SIC | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 223 | 2026-04-07 | Formation continue OACP CarPostal | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 225 | 2026-04-08 | Formation continue OACP CarPostal | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 227 | 2026-04-09 | Formation continue OACP CarPostal | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 294 | 2026-05-07 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 299 | 2026-05-08 | Assemblée des délégués de la FVSP | FVSP | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 328 | 2026-05-21 | Visite du Conseil d'État | SDIS | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 366 | 2026-06-02 | Cours ECA SP19 - ventilation opérationnelle | ECAFORM | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 367 | 2026-06-02 | Formation personnel CFF | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 388 | 2026-06-09 | Cours ECA SA10 - cours de cadres - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 390 | 2026-06-10 | Cours ECA SA10 - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 394 | 2026-06-11 | Cours ECA SA10 - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 406 | 2026-06-12 | Cours ECA SA11 - recyclage répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 437 | 2026-06-19 | Journée des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 443 | 2026-06-20 | Journée des familles | DAP | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 445 | 2026-06-21 | Journée des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 446 | 2026-06-21 | Journée des familles | DAP | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 465 | 2026-06-26 | Repas du Permanent | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 499 | 2026-08-14 | 8 km du SDIS | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 502 | 2026-08-15 | Journée des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 581 | 2026-09-05 | Journée des familles | DAP | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 646 | 2026-09-22 | Cours ECA SA10 - cours de cadres - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 653 | 2026-09-23 | Cours ECA SA10 - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 654 | 2026-09-23 | Cours ECA SP19 - ventilation opérationnelle | ECAFORM | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 661 | 2026-09-24 | Cours ECA SA10 - répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 665 | 2026-09-25 | Cours ECA SA11 - recyclage répondant de la formation antichute | FOSPEC | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 730 | 2026-10-21 | Formation continue OACP CarPostal | F5/6 | EXTERIEURE | false | — | A | ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source |
| 833 | 2026-12-05 | Téléthon | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 834 | 2026-12-06 | Noël des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 844 | 2026-12-11 | Souper annuel | DPS | SDIS | true | 070F1 | B | STAT.COM RETROUVÉ DANS SCOPE/historique source: 070F1 |
| 846 | 2026-12-12 | Noël des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |
| 847 | 2026-12-13 | Noël des familles | DPS | SDIS | true | — | C | ACTIVITÉ SDIS — Stat.Com réellement manquant |

## G. EMSEA

11 usages retrouvés, tous sur `Séance EM`, domaine historique F0/SDIS, salle EM, responsable Cdt, entre 2026 et 2027. Code source QUO VADIS utilisé pour les séances EM de 2026 à 2027; absent du référentiel canonique SCOPE et sans succession démontrée. Ne pas convertir automatiquement; correspondance canonique à confirmer.

## H. Historique 010JY3 → 010JC1

`STATCOM_SUCCESSIONS` applique `010JC1` à partir du 01.01.2026 tout en conservant `sourceCode=010JY3` et un snapshot : l’historique n’est pas écrasé.

## I. CTA — éléments retrouvés

Table `scope_quo_vadis_dps_organisation_versions`, service de lecture, exposition API QUO VADIS et affichage UI du nombre de sections/date d’effet.

## J. Sections

G1 : N01 à N06; C1/B1/B2 : N01 à N03.

## K. Demi-sections

N01 à N05 pour G1 et N01 à N03 pour C1/B1/B2 portent chacune les suffixes `a` et `b`. N06 n’est pas scindée.

## L. Versionnement/date d’effet

`valid_from`, `valid_to` et l’unicité `(oi_code, valid_from)` rendent la structure temporelle. La version seed prend effet le 01.02.2027.

## M. Capacités G1

Règle connue : demi-section maximum 8, section maximum 15. **Implémentation non retrouvée** dans la structure ou les contrôles.

## N. Absence de capacité C1/B1/B2

Aucune règle 8/15 n’est appliquée à ces sites. Cette absence est correcte.

## O. Réserve / N06

N06 est représentée par `reserve=true`, sans demi-sections. L’affectation et la recommandation ne sont pas automatisées; la décision reste humaine.

## P. Permanence CTA

Règle générale connue vendredi 18:00 → lundi 06:00, non implémentée. Le détail d’extension autour des jours fériés reste à confirmer.

## Q. Tournus CTA

Notion métier connue et distincte; aucun ordre/algorithme consommable n’a été retrouvé. Verdict : règle connue, implémentation absente, pas redéfinition générale à demander.

## R. Tournus demi-sections

Même verdict, dans un mécanisme séparé du tournus CTA.

## S. Instructions section/demi-section

Le moteur de coverage produit explicitement `instructionKind=section` ou `demi-section`; le catalogue contient des définitions distinctes et le prérequis des demi-sections avant section.

## T. Portée FULL_OI / partielle

Un exercice DPS est `FULL_OI`; une instruction section/demi-section est partielle. Le moteur ne bloque FULL_OI que sur le même OI et le même créneau.

## U. JSP/DPS

`JSP_DPS_DEPENDENCY` bloque le chevauchement exercice JSP/exercice DPS sur le même OI. Une instruction partielle n’est pas bloquée globalement sans population/rôle/ressource commun.

## V. OI et coexistence

DPS G1/C1/B1/B2, DAP Y1–Y4 et JSP G1/C1/B1 restent indépendants; `sameUnit` empêche un conflit SDIS global artificiel.

## W. 302 définitions — reclassification A→H

Totaux : **G=3**, **D=13**, **H=6**, **A=210**, **B=56**, **E=5**, **C=9**. Vrais arbitrages/insuffisances G+H : **9**, pas 302.

| Activité | Domaine | Lignes | Cat. | Preuve/raison |
|---|---|---:|:---:|---|
| Assemblée CI | — | 2 | G | SCOPE classe cette activité comme optionnelle; reconduction humaine requise. |
| Assemblée des délégués de la FVSP | — | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Assemblée générale de la SIC | — | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Conférence des Commandants | — | 1 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Cours ECA SP19 - ventilation opérationnelle | — | 2 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Formation continue OACP CarPostal | — | 4 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Formation personnel CFF | — | 7 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Journée « Oser tous les métiers » (JOM) | — | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Séance Codir + repas | — | 2 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Séance COSEC | — | 5 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Séance CRDIS | — | 2 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Séance interSDIS | — | 1 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Table ouverte avec le Commandant | — | 2 | H | Aucun domaine canonique démontrable après rapprochement SCOPE. |
| Visite du Conseil d'État | — | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| 8 km du SDIS | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cérémonie de promotion et nomination | DPS | 1 | G | SCOPE classe cette activité comme optionnelle; reconduction humaine requise. |
| Concours de la FVSP | DPS | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Cours de cadres exercice DPS 1 | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DPS 2 | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DPS 3 | DPS | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DPS-DAP 1 | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DPS-DAP 2 - reconnaissance lieux | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres Formation groupée DPS | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres interSDIS | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres SDIS Nord vaudois | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cursus « Notions d'administration publique » | DPS | 2 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus c groupe - module 1 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus c groupe - module 2 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus c groupe - module 3 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus c groupe - module 4 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - cours de cadres pour évaluateurs | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 1 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 10 | DPS | 2 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 2 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 3 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 4 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 5 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 6 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 7 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 8 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DPS - module 9 | DPS | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Entretien postulant échelons I et II | DPS | 3 | E | Toutes les lignes historiques sont inactives. |
| Exercice DPS 1 | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DPS 2 | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DPS 3 | DPS | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DPS-DAP 1 | DPS | 8 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DPS-DAP 2 | DPS | 16 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice engagement Incyte Biosciences | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Fête Eau Lac | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation BIKABLO | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.1 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.2 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.3 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.4 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.5 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée 1.6 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation permanents | DPS | 7 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation relation avec la presse | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Instr demi-sct - FEU | DPS | 18 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr demi-sct - VARIA | DPS | 28 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr sct - FEU | DPS | 8 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr sct - KICK-OFF | DPS | 13 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr sct - VARIA | DPS | 13 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Journée des familles | DPS | 6 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Journée des nouveaux habitants | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Mise à niveau annuelle OSR | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Nettoyage annuel caserne | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Noël des familles | DPS | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Passeport-Vacances | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Préparation concours de la FVSP | DPS | 8 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Préparation cours de cadres SDIS Nord vaudois | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Préparation Revue Quinquennale | DPS | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Préparation Xmas | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Reconnaissance DPS | DPS | 7 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Recrutement cantonal | DPS | 8 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Refresh CI | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Repas du Permanent | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Revue Quinquennale SDIS Nord vaudois | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance commission d'instruction | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance de préparation Téléthon | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance OSR | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo du personnel DPS | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo personnel DPS B1 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo personnel DPS B2 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo personnel DPS C1 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Sécurité feu · Fête Médiévale | DPS | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Sécurité feu・Fête Nationale | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Sécurité feu・les Zôtres Brandons | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Souper annuel | DPS | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Téléthon | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test de sélection échelons I, II N'26 | DPS | 1 | E | Toutes les lignes historiques sont inactives. |
| Test de sélection NUOVO | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Tir inter-unités | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Tour de France Femmes '26 | DPS | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Vision locale DPS | DPS | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DAP 1 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DAP 2 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DAP 3 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice DAP 4 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cursus CI DAP - module 1 | DAP | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DAP - module 2 | DAP | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DAP - module 3 | DAP | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DAP - module 4 | DAP | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus CI DAP - module 5 | DAP | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Exercice DAP 1 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DAP 2 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DAP 3 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DAP 4 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice DAP 5 | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation cadres DAP | DAP | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Reconnaissance DAP | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance cadres | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo du personnel DAP | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo personnel DAP | DAP | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance photo personnel DAP Y1 | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Soirée information DAP Y1 | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Soirée information DAP Y2 | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Soirée information DAP Y3 | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Soirée information DAP Y4 | DAP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Vision locale DAP | DAP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Assemblée GVJSP | JSP | 1 | G | SCOPE classe cette activité comme optionnelle; reconduction humaine requise. |
| Championnat suisses JSP | JSP | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres formation groupée JSP | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS03 - flamme 3 JSP | JSP | 1 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Cours JSP JS11 - Journée d'instruction JSP (après-midi) | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS11 - Journée d'instruction JSP (matin) | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS12 - Journée d'instruction des Moniteurs Cadets | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS21 - valorisation moniteurs - module I | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS22 - valorisation moniteurs - module II | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS23 - formation moniteurs - simulateur (après-midi) | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS23 - formation moniteurs - simulateur (matin) | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours JSP JS24 - valorisation moniteurs - module III | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 10 | JSP | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 3 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 4 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 5 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 6 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 7 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 8 | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP 9 | JSP | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP Cadets 1 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice JSP Cadets 2 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation CEMEA, module 1 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation CEMEA, module 2 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation CEMEA, module 3 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation CEMEA, module 4 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation groupée JSP | JSP | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Grillades des JSP Nord vaudois | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Groupe de travail JSP | JSP | 6 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance d'information JSP '26 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance instruction JSP | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance interne cadres JSP | JSP | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Soirée des présidents JSP | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test flammes 1 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test flammes 2 | JSP | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours ECA FB01 - formation de base recrues | FOBA | 2 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Entretien de collaboration avec Commandant | FOBA | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Équipement personnel DPS + photo individuelle | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA | FOBA | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 1 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 10 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 2 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 3 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 4 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 5 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 6 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 7 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 8 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice FOBA 9 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Introduction PIONNIER | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Remise équipement des recrues FOBA 1 | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test annuel FOBA | FOBA | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| BLS | FOSPEC | 2 | E | Toutes les lignes historiques sont inactives. |
| Cours de cadres Formation ABC | FOSPEC | 1 | E | Toutes les lignes historiques sont inactives. |
| Cours de cadres Formation cadres ABC | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres recyclage BLS | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours ECA SA10 - cours de cadres - répondant de la formation antichute | FOSPEC | 2 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Cours ECA SA10 - répondant de la formation antichute | FOSPEC | 4 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Cours ECA SA11 - recyclage répondant de la formation antichute | FOSPEC | 2 | D | Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique. |
| Cursus OFSI - formation de base | FOSPEC | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus opérateur VPC - module 1 | FOSPEC | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Exercice OFSI・infrastructures CFF | FOSPEC | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation ABC | FOSPEC | 3 | E | Toutes les lignes historiques sont inactives. |
| Formation antichute | FOSPEC | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation cadres ABC | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation NAC 1.1 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation NAC 1.2 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 1.1 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 1.2 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 1.3 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 1.4 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 2.1 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 2.2 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 2.3 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation opérateur VPC 2.4 | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation Travail en hauteur et antichute | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Instr demi-sct - ABC | FOSPEC | 10 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr demi-sct - PIONNIER | FOSPEC | 10 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr sct - ABC | FOSPEC | 5 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Instr sct - PIONNIER CSU-nvb | FOSPEC | 5 | C | Instruction section/demi-section reconnue par le moteur QUO VADIS. |
| Journée des Commandants ABC | FOSPEC | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Recyclage BLS | FOSPEC | 6 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 1.0 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 1.1 | AUTO | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 1.2 | AUTO | 7 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 2.0 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 2.1 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Conduite TP9000, formation continue 2.2 | AUTO | 8 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice CAR | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres exercice TRUCK | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres Formateurs MEA 2 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres formation pilote BAT 1 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cours de cadres formation pilote BAT 2 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cursus cond VL - module 2.0 | AUTO | 7 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus cond VL - module 3.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus cond VL - module 3.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus cond VL - module 4.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus cond VL - module 4.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus élévateur à timon S2 - module 1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 2.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 2.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 3.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 3.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 4.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 4.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 5.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 5.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 6.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 6.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 7.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 7.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 8.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 8.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 9.1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus MEA - module 9.2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus TP9 - conduite libre | AUTO | 2 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus TP9 - module 1 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus TP9 - module 2 | AUTO | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus TP9 - module 3.1 | AUTO | 4 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus TP9 - module 3.2 | AUTO | 4 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Exercice CAR 1.1 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice CAR 1.2 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice CAR 1.3 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice CAR 1.4 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice CAR 1.5 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice TRUCK 1.1 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice TRUCK 1.2 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice TRUCK 1.3 | AUTO | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice TRUCK 1.4 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation grutier 1.0 | AUTO | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation grutier 1.2 | AUTO | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation grutier 2.0 | AUTO | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation grutier 2.2 | AUTO | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 1.0 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 1.1 | AUTO | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 1.2 | AUTO | 9 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 2.0 | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 2.1 | AUTO | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation MEA 2.2 | AUTO | 9 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation pilote BAT 1 | AUTO | 6 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation pilote BAT 2 | AUTO | 6 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation véhicule d'urgence | AUTO | 4 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test de sélection cond PL N'26 | AUTO | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Cursus PAPR - module 2 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus PAPR - module 3 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus PAPR - module 4 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus PAPR - module 5 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus PAPR - module 6 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Cursus PAPR - module 7 | PR | 1 | B | Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle. |
| Exercice PR 1.1 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 1.2 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 1.3 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 1.4 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 1.5 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 1.6 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.1 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.2 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.3 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.4 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.5 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 2.6 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.1 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.2 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.3 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.4 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.5 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 3.6 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.1 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.2 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.3 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.4 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.5 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR 4.6 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Exercice PR-ABC | PR | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Formation engagement pratique PR | PR | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Piste entraînement PAPR 1 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Piste entraînement PAPR 2 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Piste entraînement PAPR 3 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Piste entraînement PAPR 4 | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Séance préposés APR | PR | 3 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Sortie des formateurs PR | PR | 1 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |
| Test de sélection PAPR N'27 | PR | 2 | A | Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle. |

## X. Six FOCA

Définition catalogue et Stat.Com `0175F7` retrouvés, ainsi que l’horaire 16:00–19:00 et le lieu. Aucune date n’est démontrée : les six dates restent à arbitrer, sans invention.

## Y. 12 publics candidats

| Code | Classification | Preuve |
|---|---|---|
| DPS-GEN | CORRESPONDANCE CANONIQUE RETROUVEE | database/migrations/20260923_scope_person_qualifications_c3_b.sql |
| DAP-GEN | CORRESPONDANCE CANONIQUE RETROUVEE | database/migrations/20260923_scope_person_qualifications_c3_b.sql |
| JSP-GEN | CORRESPONDANCE CANONIQUE RETROUVEE | database/migrations/20260923_scope_person_qualifications_c3_b.sql |
| JSP-CAD | REELLEMENT INCONNUE | Le rôle JSP CAD reste à arbitrer. |
| FOCO-DPS | VALEUR EXTERIEURE AU REFERENTIEL PUBLIC | Dimension statistique, pas qualification personnelle. |
| FOCO-DAP | VALEUR EXTERIEURE AU REFERENTIEL PUBLIC | Dimension statistique, pas qualification personnelle. |
| FOCO-JSP | VALEUR EXTERIEURE AU REFERENTIEL PUBLIC | Dimension statistique, pas qualification personnelle. |
| FOCA-GEN | REELLEMENT INCONNUE | FOCA/GEN ne permet pas de conclure à un niveau ou parcours. |
| FOSPEC-GEN | VALEUR EXTERIEURE AU REFERENTIEL PUBLIC | Périmètre statistique, pas qualification personnelle. |
| PR-GEN | REELLEMENT INCONNUE | PR/GEN ne doit pas être assimilé automatiquement à PAPR. |
| PR-PAPR | CORRESPONDANCE CANONIQUE RETROUVEE | database/migrations/20260923_scope_person_qualifications_c3_b.sql |
| PR-PABC | CORRESPONDANCE CANONIQUE RETROUVEE | database/migrations/20260923_scope_person_qualifications_c3_b.sql |

## Z. Rôles

Référentiel, alias et exigences par définition existent. Les affectations 2027 ne sont pas complètes.

## AA. Ressources

Le moteur gère `resourceCodes` et `RESOURCE_CONFLICT`, avec exigences de lieux/salles; aucun jeu complet d’affectations automatiques 2027 n’est démontré.

## AB. Règles calendaires SCOPE retrouvées

Les calendriers officiels validés sont conservés. SCOPE sait gérer jours autorisés/prioritaires/interdits, fériés, veilles et vacances via `dayStatuses`, ainsi que les périodes neutralisées. L’exception précise de permanence CTA reste absente.

## AC. Matrice de recovery

| Sujet | Connue ? | Source métier | Implémentation | Preuve | Écart | Action | MOA ? |
|---|---|---|---|---|---|---|---|
| Stat.Com canonique | OUI | _scope-statcom-referential.js + scope_statcom_referentiel | OUI | Schéma, repositories, service, API, UI, rapports et tests | Aucun second référentiel C19 | Consommer SCOPE | NON |
| Historique 010JY3 → 010JC1 | OUI | Décision SCOPE effective au 01.01.2026 | OUI | STATCOM_SUCCESSIONS + résolution datée | Aucun | Conserver code source et snapshot canonique | NON |
| Sections DPS | OUI | SCOPE QUO-VADIS-CORE-1 | OUI | scope_quo_vadis_dps_organisation_versions.sections | Aucun | Réutiliser les versions actives | NON |
| Demi-sections Nxxa/Nxxb | OUI | SCOPE QUO-VADIS-CORE-1 | OUI | Seeds G1/C1/B1/B2 et tests core | Aucun | Réutiliser la convention | NON |
| Versionnement CTA | OUI | SCOPE QUO-VADIS-CORE-1 | OUI | valid_from, valid_to, unique(oi_code, valid_from) | Administration limitée à la lecture dans l’UI | Conserver la sélection temporelle | NON |
| Capacité G1 demi-section = 8 | OUI | Décision métier C19 R1 | NON | Aucune capacité portée par les versions DPS | Contrôle absent | Implémenter au lot ultérieur | NON |
| Capacité G1 section = 15 | OUI | Décision métier C19 R1 | NON | Aucune capacité portée par les versions DPS | Contrôle absent | Implémenter au lot ultérieur | NON |
| Capacité C1/B1/B2 | OUI: aucune limite | Décision métier C19 R1 | OUI par absence de règle | Aucun 8/15 trouvé hors G1 | Aucun | Ne jamais généraliser G1 | NON |
| Réserve G1 N06 | OUI | SCOPE QUO-VADIS-CORE-1 | PARTIEL | N06 reserve=true, sans halfSections | Affectation/recommandation non automatisée | Garder une affectation réelle et décision humaine | NON |
| Permanence CTA vendredi 18:00 → lundi 06:00 | OUI | Décision métier C19 R1 | NON | Aucun modèle/algorithme retrouvé | Automatisme absent | Implémenter séparément | NON |
| Exception permanence jours fériés | PARTIEL | Principe d’adaptation connu | NON | Aucune règle exacte retrouvée | Détail de prolongation non démontré | Conserver à confirmer | OUI |
| Tournus CTA | OUI comme notion distincte | Décisions métier SCOPE | NON | Aucun ordre/algorithme consommable retrouvé | Implémentation absente | Récupérer/implémenter sans fusion | NON |
| Tournus demi-sections | OUI comme notion distincte | Décisions métier SCOPE | NON | Aucun ordre/algorithme consommable retrouvé | Implémentation absente | Récupérer/implémenter séparément | NON |
| Portée section/demi-section | OUI | SCOPE coverage + catalogue | OUI | instructionKind section/demi-section; définitions distinctes | Cible Nxx/Nxxa/b à enrichir lors de la génération | Conserver portée partielle | NON |
| Exercice DPS FULL_OI | OUI | Moteur de compatibilité C19 | OUI | coverage FULL_OI + FULL_OI_CONFLICT | Aucun | Conserver | NON |
| JSP/DPS même site | OUI | Moteur de compatibilité C19 | OUI | JSP_DPS_DEPENDENCY sur même OI et chevauchement | Aucun blocage global | Conserver | NON |
| Indépendance des OI | OUI | Fondations canoniques + moteur C19 | OUI | organisationUnit et sameUnit | Aucun | Conserver | NON |
| Rôles | OUI référentiel | C3-B + catalogue annuel | PARTIEL | role definitions, aliases, role requirements | Affectations par définition incomplètes | Configurer sans inventer | NON |
| Ressources | OUI au niveau conflit | Catalogue fonctionnel C19 | PARTIEL | resourceCodes + RESOURCE_CONFLICT | Pas de référentiel/exigences automatiques complets | Configurer sans inventer | NON |
| Règles calendaires | OUI | Catalogue fonctionnel + QUO VADIS coverage | PARTIEL | weekdays, dayStatuses, périodes neutralisées | Exception CTA fériée absente | Réutiliser les règles génériques | OUI pour l’exception CTA seulement |

## AD. Ancien Gate → Gate requalifié

| Ancien verdict | Nouvelle preuve | Nouveau verdict |
|---|---|---|
| Stat.Com partiel / 39 anomalies | Référentiel SCOPE complet et règle HORS SDIS | Référentiel implémenté; A=26, B=1, C=12, D=0 |
| CTA inconnu | Organisation versionnée, sections, demi-sections et réserve | Structure connue et implémentée; capacités/permanence/tournus restent des écarts d’implémentation |
| 302 arbitrages | Moteur SCOPE de coverage, cursus, règles CTA et marqueurs HORS SDIS | 9 arbitrages/insuffisances résiduels, pas 302 |
| 12 publics non résolus | Migration C3-B | 5 canoniques retrouvés, 4 valeurs non-Public, 3 réellement inconnus |
| Rôles/ressources absents | Référentiels et exigences du catalogue | Référentiels présents; affectations 2027 incomplètes |

## AE. Vrais arbitrages MOA résiduels

| Sujet | Volume | Détail |
|---|---:|---|
| Stat.Com activités SDIS | 12 | 5 activités internes sans code démontré |
| EMSEA | 1 | Correspondance canonique à confirmer |
| Dates Groupe de travail FOCA | 6 | Six occurrences sans date |
| Publics réellement inconnus | 3 | JSP-CAD, PR-GEN, FOCA-GEN |
| Reconduction 2027 | 9 | 3 optionnelles + 6 sans domaine canonique |
| Exception CTA jours fériés | 1 | Règle exacte non démontrée |

## AF. Règles connues mais non implémentées

- Capacités G1 8/15
- Affectation/recommandation N06
- Permanence CTA vendredi 18:00 à lundi 06:00
- Tournus CTA
- Tournus demi-sections
- Exception fériée CTA
- Affectations exhaustives rôles/ressources 2027

## AG. Findings P1/P2

P1 : aucun.

- P2 — Les capacités G1 8/15 ne sont pas implémentées.
- P2 — La permanence et les deux tournus CTA ne sont pas implémentés.
- P2 — EMSEA n’a pas de correspondance canonique démontrée.
- P2 — Douze lignes SDIS restent sans Stat.Com.
- P2 — Six occurrences FOCA restent sans date.
- P2 — Trois candidats Public restent réellement inconnus.

## AH. Tests ciblés

| Commande | Résultat | Note |
|---|---|---|
| `node scripts/scope-c19-preprod-gate-1-r1-tests.js` | PASS | — |
| `node scripts/scope-quo-vadis-core-1-tests.js` | PASS | — |
| `node scripts/scope-functional-catalog-c19-tests.js` | PASS 9/9 | — |
| `node scripts/scope-statcom-referential-config-1-tests.js` | PARTIAL 11/12 | Échec préexistant du contrôle textuel size: 'A4'; le renderer courant utilise size: [pageW, pageH]. Le PDF est produit. |
| `git diff --check` | PASS | — |

## AI. Fichiers créés/modifiés pour l’analyse

- `scripts/scope-c19-preprod-gate-1-r1.js`
- `scripts/scope-c19-preprod-gate-1-r1-tests.js`
- `docs/SCOPE_C19_PREPROD_GATE_1_R1.json`
- `docs/SCOPE_C19_PREPROD_GATE_1_R1.md`

## AJ. Git final/worktree

HEAD inchangé; aucun commit, push, déploiement, migration ou write DB. Le worktree C18/C19 préexistant est conservé.

STOP.

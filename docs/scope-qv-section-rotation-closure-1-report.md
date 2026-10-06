# SCOPE — QUO VADIS — SECTION-ROTATION-CLOSURE-1

Correction structurelle de la matérialisation des instructions section / demi-section.
Suite directe de FINAL-DEVELOPMENT-1 et de la recette MOA réelle du 02.10.2026.

Aucun commit, aucun push, aucune PR, aucun merge, aucun déploiement, aucune migration.
ORION hors périmètre.

---

# A. Préflight

Dépôt `/Users/thierrygrunig/Projects/Monitoring F7`, branche `codex/qv-recette-programme-cta-edit-3`.
HEAD `55667a79012e976d54f5c90cc183628f8897cec9`, identique à `origin/main`. **0 commit** créé par ce lot.

Le worktree FINAL-DEVELOPMENT-1 a été conservé intégralement : aucun `reset`, aucun `restore`, aucun `stash`, aucun checkout destructif. `deno.lock` n'a pas été touché.

Le serveur de recette `127.0.0.1:4391` a été relancé après la correction afin que le cache Node recharge la couche métier.

---

# B. Cause racine

KICK-OFF demi-section n'est pas généré par le même chemin que ABC / PIONNIER / VARIA / FEU.

**KICK-OFF demi-sct** (PASS MOA) : quatre lignes Excel 2027 explicites (`qv-source-910` à `913`), `provenance: SOURCE_2027_EXPLICIT`, une date démontrée par site. Rien à répartir.

**Les autres instructions section / demi-section** : une définition métier unique, N occurrences (`:O1` … `:ON`), toutes clonées sur **la première date historique 2026 rencontrée**. Le champ `historicalProposal.proposedDate2027` est donc identique pour les N lignes, de même que le public hérité de cette unique ligne source.

Conséquence observée en recette :

- 10 × `Instr demi-sct - ABC` le 24.04.2027 / N05a
- 10 × `Instr demi-sct - PIONNIER` le 11.09.2027 / N05a
- 5 × `Instr sct - PIONNIER CSU-nvb` le 08.11.2027 / N06
- même effondrement sur VARIA (16) et FEU (6)

Ce ne sont pas des doublons techniques. Ce sont N tours de rotation distincts, mal matérialisés.

La correction ne duplique pas le cycle CTA et n'ajoute aucune exception `if ABC` / `if PIONNIER`. Elle relit l'historique 2026 **par titre**, groupe les lignes en **tours** (date + horaire), décale chaque tour de 52 semaines (364 jours, jour de la semaine conservé — la même règle déjà utilisée pour `proposedDate2027`), et réattribue les N occurrences aux N tours démontrés. Date et public avancent ensemble. Une occurrence sans tour démontré reste `MOA_REQUIRED` : aucune date n'est inventée.

Les lignes `SOURCE_2027_EXPLICIT` (dont KICK-OFF du 06.02) sont **exclues** de cette redistribution.

---

# C. Comparaison KICK-OFF / ABC / PIONNIER / VARIA / FEU

| Activité | Type | Occ. 2027 | Provenance avant | Dates uniques avant | Tours 2026 (date+heure) | Mécanisme actuel | Cause de l'effondrement | Mécanisme cible |
|---|---|---|---|---|---|---|---|---|
| Instr demi-sct - KICK-OFF | demi-sct | 4 | SOURCE_2027_EXPLICIT | 1 (06.02, 4 sites) | 11 | source Excel 2027 par site | aucun | inchangé |
| Instr sct - KICK-OFF | sct | 9 | CTA_RULE+HISTORICAL_2026 | 1 | 9 | héritage 1re ligne | oui | rotation historique |
| Instr demi-sct - ABC | demi-sct | 10 | CTA_RULE+HISTORICAL_2026 | 1 (24.04 / N05a) | 10 | héritage 1re ligne | oui | rotation historique |
| Instr sct - ABC | sct | 5 | CTA_RULE | 0 | 5 | non daté | dates absentes | rotation historique |
| Instr demi-sct - VARIA | demi-sct | 16 | CTA_RULE+HISTORICAL_2026 | 1 | 16 | héritage 1re ligne | oui | rotation historique |
| Instr sct - VARIA | sct | 8 | CTA_RULE | 0 | 8 | non daté | dates absentes | rotation historique |
| Instr demi-sct - FEU | demi-sct | 6 | CTA_RULE+HISTORICAL_2026 | 1 | 6 | héritage 1re ligne | oui | rotation historique |
| Instr sct - FEU | sct | 3 | CTA_RULE | 0 | 3 | non daté | dates absentes | rotation historique |
| Instr demi-sct - PIONNIER | demi-sct | 10 | CTA_RULE+HISTORICAL_2026 | 1 (11.09 / N05a) | 10 | héritage 1re ligne | oui | rotation historique |
| Instr sct - PIONNIER CSU-nvb | sct | 5 | CTA_RULE+HISTORICAL_2026 | 1 (08.11 / N06) | 5 | héritage 1re ligne | oui | rotation historique |

Activités 2027 utilisant le même mécanisme (marqueurs `Instr sct` / `Instr demi-sct`) : **exactement ces dix libellés**. Pas d'autre instruction section/demi-section dans le programme canonique.

ABC n'existe que pour G1 : aucune occurrence C1/B1/B2 n'a été créée.

---

# D. Correction générique

Fichiers :

- `assets/js/scope-ui-logic.js` — `qvRotationBuckets`, `qvDistributeRotationOccurrences`, `qvShiftHistoricalDate`, `QV_HISTORICAL_SHIFT_DAYS`
- `netlify/lib/_scope-quo-vadis-service.js` — `canonicalBusinessProgramme2027()` applique **d'abord** la rotation, puis les règles PIONNIER, puis la dérivation des conduites
- `qvConduiteSources` — une instruction multi-site ouvre une conduite par site réellement couvert ; le lieu B2 reste C1

Aucune modification de : DnD, filtres, salles, ordre G1/C1/B1/B2, moteur CTA (`G1_CYCLE` / `OTHER_CYCLE` / `ANCHOR_DATE`), génération 2028.

Réalignement 2027 : couche de lecture déterministe et idempotente (deuxième passage = 0 changement). Le fichier source `scope-qv-programme-2027.json` reste à 622 séances. Les dates/publics corrigés sont calculés à la lecture.

Décision humaine : `metadata.humanDecision` / `preserveDecision` / `publishedEventId` / `locked` → `rotationStatus: HUMAN_DECISION`, date et public inchangés.

---

# E. Matrice des occurrences avant / après

## Instr demi-sct - ABC (G1) — horaire 07:30–10:30, Caserne G1

Avant : 10 × 24.04.2027 / N05a.

| Date | Jour | Horaire | Public | Site | Lieu |
|---|---|---|---|---|---|
| 2027-04-24 | samedi | 07:30–10:30 | N05a | G1 | Caserne G1 |
| 2027-05-01 | samedi | 07:30–10:30 | N04a | G1 | Caserne G1 |
| 2027-05-08 | samedi | 07:30–10:30 | N03a | G1 | Caserne G1 |
| 2027-05-15 | samedi | 07:30–10:30 | N02a | G1 | Caserne G1 |
| 2027-05-22 | samedi | 07:30–10:30 | N01a | G1 | Caserne G1 |
| 2027-05-29 | samedi | 07:30–10:30 | N05b | G1 | Caserne G1 |
| 2027-06-05 | samedi | 07:30–10:30 | N04b | G1 | Caserne G1 |
| 2027-06-12 | samedi | 07:30–10:30 | N03b | G1 | Caserne G1 |
| 2027-06-19 | samedi | 07:30–10:30 | N02b | G1 | Caserne G1 |
| 2027-06-26 | samedi | 07:30–10:30 | N01b | G1 | Caserne G1 |

## Instr sct - ABC (G1) — horaire 18:30–21:30

Avant : 5 occurrences non datées.

| Date | Jour | Horaire | Public | Site | Lieu |
|---|---|---|---|---|---|
| 2027-05-31 | lundi | 18:30–21:30 | N05 | G1 | Caserne G1 |
| 2027-06-07 | lundi | 18:30–21:30 | N04 | G1 | Caserne G1 |
| 2027-06-14 | lundi | 18:30–21:30 | N03 | G1 | Caserne G1 |
| 2027-06-21 | lundi | 18:30–21:30 | N02 | G1 | Caserne G1 |
| 2027-06-28 | lundi | 18:30–21:30 | N01 | G1 | Caserne G1 |

## Instr demi-sct - PIONNIER (G1) — 4 heures, Caserne G1

Avant : 10 × 11.09.2027 / N05a.

| Date | Jour | Horaire | Public | Site | Lieu |
|---|---|---|---|---|---|
| 2027-09-11 | samedi | 07:30–11:30 | N05a | G1 | Caserne G1 |
| 2027-09-25 | samedi | 07:30–11:30 | N03a | G1 | Caserne G1 |
| 2027-10-02 | samedi | 07:30–11:30 | N02a | G1 | Caserne G1 |
| 2027-10-09 | samedi | 07:30–11:30 | N01b | G1 | Caserne G1 |
| 2027-10-16 | samedi | 07:30–11:30 | N05b | G1 | Caserne G1 |
| 2027-10-23 | samedi | 07:30–11:30 | N04b | G1 | Caserne G1 |
| 2027-10-30 | samedi | 07:30–11:30 | N03b | G1 | Caserne G1 |
| 2027-11-06 | samedi | 07:30–11:30 | N02b | G1 | Caserne G1 |
| 2027-11-13 | samedi | 07:30–11:30 | N01a | G1 | Caserne G1 |
| 2027-11-27 | samedi | 07:30–11:30 | N04a | G1 | Caserne G1 |

Le samedi 18.09.2027 n'apparaît pas : l'historique 2026 n'a pas de tour ce week-end-là. Aucune date n'a été inventée pour combler le trou.

## Instr sct - PIONNIER CSU-nvb (G1) — 19:15–22:00

Avant : 5 × 08.11.2027 / N06.

| Date | Jour | Horaire | Public | Site | Lieu |
|---|---|---|---|---|---|
| 2027-11-08 | lundi | 19:15–22:00 | N03 | G1 | Caserne G1 |
| 2027-11-15 | lundi | 19:15–22:00 | N02 | G1 | Caserne G1 |
| 2027-11-22 | lundi | 19:15–22:00 | N01 | G1 | Caserne G1 |
| 2027-11-29 | lundi | 19:15–22:00 | N05 | G1 | Caserne G1 |
| 2027-12-06 | lundi | 19:15–22:00 | N04 | G1 | Caserne G1 |

`Introduction PIONNIER` : public **FOBA 2**, inchangé.

## VARIA / FEU

Même défaut, même correction. VARIA demi-sct : 16 dates distinctes (C1/B1/B2 de mai à juin, puis G1 de juillet à septembre). FEU demi-sct : 6 samedis du 21.08 au 25.09, publics N01b → N02b, sites C1+B1+B2, lieu Caserne C1 (site principal du tour, règle B2 → C1). FEU sct : 3 dates (30.10 N03, 06.11 N02, 13.11 N01).

Les publics N05a / N06 hérités de l'effondrement ont été remplacés par les sections démontrées de chaque tour 2026. Aucune décision humaine individuelle n'existait sur ces lignes.

---

# F. Conduites 0152F7

Attendu métier : **12** (3 par site). Après correction des sources : **12 matérialisées, 0 non matérialisable**.

| Date | Horaire | OI | Public | Lieu | Instruction source |
|---|---|---|---|---|---|
| 06.02.2027 | 10:30–11:30 | G1 | cond VL, cond PL | Caserne G1 | KICK-OFF `qv-source-910` |
| 06.02.2027 | 10:30–11:30 | C1 | cond VL, cond PL | Caserne C1 | KICK-OFF `qv-source-911` |
| 06.02.2027 | 10:30–11:30 | B1 | cond VL, cond PL | Caserne B1 | KICK-OFF `qv-source-913` |
| 06.02.2027 | 10:30–11:30 | B2 | cond VL, cond PL | Caserne C1 | KICK-OFF `qv-source-912` |
| 24.04.2027 | 10:30–11:30 | G1 | cond VL, cond PL | Caserne G1 | ABC (1er tour G1) |
| 01.05.2027 | 10:30–11:30 | C1 | cond VL, cond PL | Caserne C1 | VARIA (1er tour C1) |
| 01.05.2027 | 10:30–11:30 | B1 | cond VL, cond PL | Caserne B1 | VARIA (1er tour B1) |
| 01.05.2027 | 10:30–11:30 | B2 | cond VL, cond PL | Caserne C1 | VARIA (1er tour B2) |
| 03.07.2027 | 10:30–11:30 | G1 | cond VL, cond PL | Caserne G1 | VARIA (1er tour G1) |
| 21.08.2027 | 10:30–11:30 | C1 | cond VL, cond PL | Caserne C1 | FEU (1er tour C1) |
| 21.08.2027 | 10:30–11:30 | B1 | cond VL, cond PL | Caserne B1 | FEU (1er tour B1) |
| 21.08.2027 | 10:30–11:30 | B2 | cond VL, cond PL | Caserne C1 | FEU (1er tour B2) |

G1 = KICK-OFF + ABC + VARIA. C1/B1/B2 = KICK-OFF + VARIA + FEU. Aucune conduite après PIONNIER. B2 à Caserne C1. Durée 1 h, début = fin de l'instruction source.

Compteurs Programme : **630 séances** = 622 du fichier source + 8 conduites dérivées (les 4 KICK-OFF existaient déjà). Datées : 512. Sans date : 118. Le fichier canonique reste à 622.

---

# G. Décisions humaines / MOA_REQUIRED

- Décision humaine explicite : protégée (`HUMAN_DECISION`). Aucune n'était présente sur ABC/PIONNIER/VARIA/FEU.
- Tour non démontré : `ROTATION_TOUR_NON_DEMONTRE`. Sur les données 2027 réelles, toutes les occurrences section/demi-section concernées ont un tour 2026. Le garde-fou est couvert par un test synthétique (11e ABC → aucune date inventée).
- KICK-OFF 06.02 `SOURCE_2027_EXPLICIT` : non redistribué.
- `Introduction PIONNIER` FOBA 2 : non réouvert.

---

# H. Tests

| Suite | Résultat |
|---|---|
| `scope-qv-section-rotation-closure-1-tests.js` | **20/20 PASS** |
| `scope-qv-final-development-1-tests.js` | **30/30 PASS** |
| `scope-qv-finalisation-local-tests.js` | 41/41 PASS |
| `scope-qv-history-sections-ux-tests.js` | 28/28 PASS |
| `scope-qv-agenda-programme-ux-final-1-tests.js` | 9/9 PASS |
| `scope-qv-business-consolidation-tests.js` | 39/39 PASS |
| `scope-qv-repair-2-tests.js` | 11/11 PASS |
| `scope-quo-vadis-core-1-tests.js` | ok |
| `scope-quo-vadis-calendar-vd-final-4-tests.js` | PASS |
| `scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js` | ok |
| `scope-quo-vadis-referential-management-4-tests.js` | ok |
| C19 MOA closure / C20 / C21 / C22 | 13 + 30 + 60 + 48 PASS |

Les tests ciblés interdisent explicitement : 10 ABC le même jour / N05a ; 10 PIONNIER demi-sct le même jour / même demi-section ; 5 PIONNIER sct le même jour / N06. Ils exigent la cohérence date ↔ section, KICK-OFF inchangé, 12 conduites, 4 h / 19:15–22:00, B2 à C1, idempotence, protection humaine, absence de 2028.

---

# I. Recette navigateur

Serveur `http://127.0.0.1:4391`, navigateur piloté, JS/CSS `?recette=rot1` / `rot2`.

| Contrôle | Verdict |
|---|---|
| A — KICK-OFF 06.02 G1 N04a Caserne G1 / C1 N01b C1 / B1 N01b B1 / B2 N01b C1 + 4 conduites 10:30–11:30 | **PASS** |
| B — ABC demi-sct 10 dates × 10 publics, plus 5 sections 18:30 | **PASS** |
| C — VARIA 16 + 8 dates distinctes | **PASS** |
| D — FEU 6 + 3 dates distinctes | **PASS** |
| E — PIONNIER : demi-sct distribuées, sct 19:15–22:00 distribuées, FOBA 2, G1, 4 h, aucune conduite | **PASS** |
| F — 12 conduites 0152F7, 3 par site, B2 à C1 | **PASS** |
| G — DnD : 8 lignes glissables et cibles de dépôt le 06.02 | **PASS** (smoke) |
| H — Permanence CTA `data-qv-drag-locked=CTA_PERMANENCE`, non glissable | **PASS** |
| I — Recherche PIONNIER → fiche Introduction → retour : recherche encore « PIONNIER », 16 lignes | **PASS** |
| J — Salles | **PASS** (code non touché) |

Captures : `docs/captures/qv-section-rotation-closure-1/`
`01-abc-reparti.png`, `02-pionnier-reparti.png`, `03-conduites-12.png`, `04-kickoff-06-02-inchange.png`.

---

# J. DAP portant G1

Lecture seule, aucune correction.

| Activité | Stat.Com | Date | OI | Public | Lieu | Provenance | Raison de G1 |
|---|---|---|---|---|---|---|---|
| Formation cadres DAP | 0172F7 | 04.02.2027 19:00 | G1, Y1–Y4 | (vide) | Local Y1 | RECURRENCE_RULE+HISTORICAL_2026 | G1 n'est pas un site DAP du référentiel (Y1–Y4) |
| Formation cadres DAP | 0172F7 | 03.03.2027 19:00 | G1, Y1–Y4 | (vide) | Local Y2 | idem | idem |
| Séance Fourriers DAP | 070F8 | 25.01.2027 19:00 | G1, Y1–Y4 | (vide) | L-G1 | SOURCE_2027_EXPLICIT | G1 comme lieu d'accueil possible, OI non qualifié |
| Séance des chefs de section DAP | 070F23 | 01.02.2027 19:00 | G1, Y1–Y4 | (vide) | L-G1 | SOURCE_2027_EXPLICIT | idem |

---

# K. Restes réels

Hors périmètre de ce lot, déjà identifiés :

- PostgreSQL de recette inaccessible : pas de PASS base.
- Paramètres CTA versionnés : migration de schéma requise.
- Quatre activités DAP portant G1 : décision MOA, non corrigées.

Faits historiques conservés, à ne pas « lisser » sans décision :

- PIONNIER demi-sct saute le samedi 18.09.2027 (trou 2026).
- Une VARIA sct G1 tombe un mardi 31.08.2027 dans l'historique.

---

# L. Git

```
branche:  codex/qv-recette-programme-cta-edit-3
HEAD:     55667a79012e976d54f5c90cc183628f8897cec9
origin/main: identique
commits:  0
diff --check: vide
```

Fichiers de ce lot (en plus du worktree FINAL-DEVELOPMENT-1 déjà présent) :

- `assets/js/scope-ui-logic.js` (rotation générique)
- `netlify/lib/_scope-quo-vadis-service.js` (pipeline rotation → PIONNIER → conduites)
- `scripts/scope-qv-section-rotation-closure-1-tests.js`
- `scripts/scope-qv-final-development-1-tests.js` / `scope-qv-history-sections-ux-tests.js` (assertions de compteur)
- `docs/scope-qv-section-rotation-closure-1-report.md`
- `docs/captures/qv-section-rotation-closure-1/`

---

# M. Verdict

**READY_FOR_MOA_ROTATION_RECIPE**

La cause racine est identifiée et corrigée de façon générique. KICK-OFF 06.02 reste le PASS MOA. ABC, PIONNIER, VARIA et FEU ne sont plus empilés sur une date/public uniques. Les 12 conduites 0152F7 sont matérialisables. DnD, filtres, salles et CTA non déplaçable restent PASS. Aucune génération 2028. Aucun commit.

```
COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DÉPLOIEMENT : AUCUN
PRODUCTION : INCHANGÉE
```

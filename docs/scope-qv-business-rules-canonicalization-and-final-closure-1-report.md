# SCOPE — QUO VADIS — BUSINESS-RULES-CANONICALIZATION-AND-FINAL-CLOSURE-1

Recette locale : `http://127.0.0.1:4391`
Branche : `codex/qv-recette-programme-cta-edit-3`

Le JSON canonique 2027 reste à **622** séances. L’overlay de lecture produit **719** séances
(598 datées, 121 à définir). Aucun patch manuel de liste d’occurrences 2027.

Aucun commit, aucun push, aucune PR, aucun merge, aucun déploiement. ORION hors périmètre.

---

## A. Verdict

**READY_FOR_MOA_RECIPE**

Les règles métier MOA sont recensées, identifiées, centralisées dans un référentiel versionné,
appliquées par le moteur (overlay de lecture, pas un JSON 2027 retouché), testées par identifiant,
et visibles en recette.

Les 12 conduites « 3 thèmes × 4 OI » sont remplacées par la règle générale
**3 conduites par demi-section opérationnelle** (cible **84**).

Le total matérialisé est **60**, pas 84 : **24** demi-sections n’ont que **2** `Instr demi-sct`
éligibles. L’anomalie `CONDUITE_SOURCE_INSUFFISANTE` est produite explicitement
(OI, demi-section, attendu 3, trouvé 2, sources candidates). Aucune 3ᵉ date n’est inventée.
Le lot autorise ce cas.

Le public de conduite `Nxx, cond PL, cond VL` s’applique aux **4 OI**, y compris C1/B1/B2
(plus seulement G1). Les Instr sct ABC / VARIA / FEU / PIONNIER ont **Responsable = Chef section DPS**.
C1/B1/B2 restent séparés. PIONNIER, KICK-OFF 06.02, État 8×8 et PR-ABC 3 T1 + 3 T4 sont conservés.

---

## B. Causes racines

1. **Conduites cas par cas.** L’ancien moteur prenait la première `Instr demi-sct` de 3 thèmes
   par OI (G1 : KICK-OFF/ABC/VARIA ; C1/B1/B2 : KICK-OFF/VARIA/FEU) → 12 lignes.
   La règle MOA est 28 demi-sections opérationnelles × 3 = 84, dérivées des sources réelles.

2. **Public de conduite incomplet hors G1.** Le public n’injectait pas la demi-section source.
   G1 paraissait corrigé parce que le KICK-OFF G1 portait déjà `N04a` ; C1/B1/B2 n’affichaient
   que `cond VL, cond PL`.

3. **Responsable Instr sct.** `qvResponsableCanonique('C sct', { domain: 'DPS' })` renvoyait
   déjà « Chef section DPS », donc la réécriture était sautée. ABC et PIONNIER sont **FOSPEC** :
   le brut `C sct` restait affiché, ou « À affecter ». La règle doit porter sur la **famille**
   `Instr sct` / `Instr demi-sct`, pas sur le domaine ni sur une liste d’IDs 2027.

4. **Cible 27 vs 28.** Une erreur de calcul MOA antérieure citait 27 demi-sections.
   G1 10 + C1 6 + B1 6 + B2 6 = **28**. Les réserves (G1 N06, C1/B1/B2 N04) sont hors cycle.

Les séparations C1/B1/B2, le moteur CTA unique, PIONNIER (4 h / CSU-nvb / FOBA 2) et l’État
8×8 n’étaient pas cassés. Ils n’ont pas été rouverts.

---

## C. Règles canoniques recensées

Référentiel : `docs/business-rules/quo-vadis-canonical-rules.md`

Aucune règle nouvelle n’est inventée. Chaque identifiant a une preuve code / test / décision MOA.

| ID | Règle | Preuve |
|---|---|---|
| QV-CTA-001 | Cycle perpétuel interannuel, ancrage 2026-02-13 | `_scope-cta-rules.js` |
| QV-CTA-002 | Réserves exclues (G1 N06, autres N04) | `G1_CYCLE` / `OTHER_CYCLE` |
| QV-CTA-003 | G1 = 10 demi-sections opérationnelles | `operationalHalfSections('G1')` |
| QV-CTA-004 | C1/B1/B2 = 6 chacun ; total 28 | idem |
| QV-CTA-005 | Un seul moteur CTA | pas de duplication dans `scope-ui-logic.js` |
| QV-CTA-006 | Public = permanence du vendredi ; PIONNIER sct G1 = vendredi précédent | `instructionPublicForDate(..., pionnierException)` |
| QV-DPS-001 | Une réalisation par OI | `qvRotationBuckets` date+horaire+OI |
| QV-DPS-002 | B2 : OI B2 + Stat.Com B2 + lieu Caserne C1 | `qvDpsDefaultLieuCode` |
| QV-DPS-003 | Instr sct/demi-sct → Chef section DPS | `qvApplyDpsInstructionFamilyRules` |
| QV-DPS-004 | Excel 2026 n’écrase pas un public CTA | skip `DISTRIBUTED` / `CTA_PERMANENCE_CYCLE` |
| QV-DPS-005 | Dates = tours 2026 démontrés, jamais inventées | rotation |
| QV-CONDUITE-001 | 3 conduites / demi-section opérationnelle / an | `QV_CONDUITE_PER_HALF` |
| QV-CONDUITE-002 | Cible 84 ; sinon `CONDUITE_SOURCE_INSUFFISANTE` | `expectedAnnualConduites()` |
| QV-CONDUITE-003 | Adossée à une Instr demi-sct réelle | début = fin de source |
| QV-CONDUITE-004 | Durée max 1 h | `QV_CONDUITE_MAX_MINUTES` |
| QV-CONDUITE-005 | Public = demi-section source, cond PL, cond VL | `qvConduitePublics` |
| QV-CONDUITE-006 | Pas de conduite après PIONNIER | `qvConduiteSources` |
| QV-CONDUITE-007 | Répartition annuelle déterministe | `qvSelectSpreadIndices` |
| QV-PRABC-001 | 3 T1 + 3 T4 | `qvApplyPrAbcStructure` |
| QV-PRABC-002 | Séance 2 mercredi matin si possible ; sinon dates à arbitrer | statut `MOA_PROPOSAL_NO_DEMONSTRATED_T1_T4_CALENDAR` |
| QV-PIONNIER-001 | Introduction = FOBA 2 | `qvApplyPionnierRules` |
| QV-PIONNIER-002 | Demi-section = 4 h (07:30–11:30) | idem |
| QV-PIONNIER-003 | CSU-nvb = 19:15–22:00 | idem |
| QV-UI-001 | État = carré 8×8 + texte, sans badge | `scope.css` |
| QV-UI-002 | Actions textuelles non soulignées | `.qv-programme-action` |
| QV-UI-003 | Recherche conservée au retour de fiche | `quoVadisProgrammeContextActive` |
| QV-UI-004 | Permanence CTA non déplaçable | `qvProgrammeDragLock` |
| QV-CODE-001/002/003 | Code métier = STAT.COM.xxx stable | serial `0152F7` pour conduites ajoutées |

---

## D. Emplacement de l’implémentation

| Couche | Fichier | Rôle |
|---|---|---|
| CTA unique | `netlify/lib/_scope-cta-rules.js` | Cycle, réserves, 28 demi-sections, 84 attendues, `conduiteEngineOptions()` |
| Overlay métier | `assets/js/scope-ui-logic.js` | Rotation, PIONNIER, famille QV-DPS-003, conduites, PR-ABC |
| Pipeline lecture | `netlify/lib/_scope-quo-vadis-service.js` | `canonicalBusinessProgramme2027()` : rotation → PIONNIER → famille → conduites → PR-ABC |
| Source 2027 | `netlify/lib/data/scope-qv-programme-2027.json` | **Non modifié par ce lot** (622) |
| Référentiel | `docs/business-rules/quo-vadis-canonical-rules.md` | IDs de règles |
| Tests nommés | `scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` | 19/19 |
| UX gelée | `assets/css/scope.css`, `assets/js/scope-ui.js` | État 8×8, actions, round-trip |

Pipeline (ordre figé) :

1. `qvDistributeRotationOccurrences` — une réalisation par OI, public CTA.
2. `qvApplyPionnierRules` — FOBA 2, 4 h, 19:15–22:00.
3. `qvApplyDpsInstructionFamilyRules` — Responsable Chef section DPS + public CTA si manquant.
4. `qvApplyConduiteContinue(conduiteEngineOptions())` — 3 par demi-section, ou anomalie.
5. `qvApplyPrAbcStructure` — 3 T1 + 3 T4.

Un second passage ne recrée pas de conduites (ids stables `QV27:CONDUITE:{oi}:{half}:{date}:{start}`).

---

## E. Modifications réalisées

- **CTA** : helpers `operationalHalfSections`, `isReserveHalfSection`, `expectedAnnualConduites` (84).
  Pas de second moteur. `G1_CYCLE` / `OTHER_CYCLE` / `ANCHOR_DATE` inchangés.
- **Famille DPS** : si le responsable affiché **ou** brut n’est pas `Chef section DPS`, réécriture
  sur toute la famille `Instr sct` / `Instr demi-sct`. Pas une liste d’IDs 2027.
  Les occurrences `humanDecision` / rotation protégées ne sont pas écrasées.
- **Conduites** : groupement par `OI + demi-section` (plus par thème). Exclusion PIONNIER et réserves.
  Public `[half, 'AUTO:1', 'AUTO:3']` → `N04a, cond PL, cond VL`.
  Répartition `qvSelectSpreadIndices` : si n ≤ 3 toutes les sources ; sinon
  `round(i × (n−1) / (k−1))` pour i = 0…k−1 (premier, milieu, dernier), collision
  vers l’index libre suivant, tri, **aucun hasard**.
- **Cache lecture** : `canonicalBusinessCache` résume `expected / materialized / insufficient`.
- **Tests historiques** adaptés à 719 / 60 / 24 lorsque l’ancienne règle 12 n’est plus la règle MOA.
- **JSON 2027** : non patché.

---

## F. Matrice CTA

Ancrage : vendredi **13.02.2026**. Index = semaines depuis l’ancrage. Pas de remise à zéro au 1er janvier.

| OI | Sections opérationnelles | Réserve | Demi-sections opérationnelles (ordre de cycle) |
|---|---|---|---|
| G1 | N01 N02 N03 N04 N05 | N06 | N04b N03b N02b N01b N05a N04a N03a N02a N01a N05b (10) |
| C1 | N01 N02 N03 | N04 | N03b N02b N01b N03a N02a N01a (6) |
| B1 | N01 N02 N03 | N04 | idem (6) |
| B2 | N01 N02 N03 | N04 | idem (6) |

**Total opérationnel = 28.** Fonction unique : `instructionPublicForDate(date, oi, kind, pionnierException)`.

Exception QV-CTA-006 : `Instr sct - PIONNIER CSU-nvb` G1 utilise le **vendredi précédent**.

---

## G. Preuve rotations

Source du calcul pour toutes les lignes : `instructionPublicForDate` (`_scope-cta-rules.js`).
PIONNIER CSU-nvb : 4ᵉ argument `true`.

Toutes les lignes datées ci-dessous sont **PASS**.

### KICK-OFF

| Date | Activité | OI | Attendu | Obtenu | PASS |
|---|---|---|---|---|---|
| 06.02.2027 07:30 | Instr demi-sct - KICK-OFF | G1 | N04a | N04a | PASS |
| 06.02.2027 07:30 | Instr demi-sct - KICK-OFF | C1 | N01b | N01b | PASS |
| 06.02.2027 07:30 | Instr demi-sct - KICK-OFF | B1 | N01b | N01b | PASS |
| 06.02.2027 07:30 | Instr demi-sct - KICK-OFF | B2 | N01b | N01b | PASS |
| 20.03.2027 | Instr sct - KICK-OFF | C1 | N01 | N01 | PASS |
| 20.03.2027 | Instr sct - KICK-OFF | B1 | N01 | N01 | PASS |
| 20.03.2027 | Instr sct - KICK-OFF | B2 | N01 | N01 | PASS |
| 22.03.2027 | Instr sct - KICK-OFF | G1 | N03 | N03 | PASS |
| 27.03.2027 | Instr sct - KICK-OFF | B2 | N03 | N03 | PASS |
| 27.03.2027 | Instr sct - KICK-OFF | B1 | N03 | N03 | PASS |
| 27.03.2027 | Instr sct - KICK-OFF | C1 | N03 | N03 | PASS |
| 29.03.2027 | Instr sct - KICK-OFF | G1 | N02 | N02 | PASS |
| 03.04.2027 | Instr sct - KICK-OFF | B1 | N02 | N02 | PASS |
| 03.04.2027 | Instr sct - KICK-OFF | C1 | N02 | N02 | PASS |
| 06.04.2027 | Instr sct - KICK-OFF | G1 | N01 | N01 | PASS |
| 12.04.2027 | Instr sct - KICK-OFF | G1 | N05 | N05 | PASS |
| 19.04.2027 | Instr sct - KICK-OFF | G1 | N04 | N04 | PASS |

Lieux 06.02 : G1 Caserne G1 / C1 Caserne C1 / B1 Caserne B1 / B2 Caserne C1.
Stat.Com : 012G1 / 012C1 / 012B1 / 012B2.

### ABC (G1 uniquement — FOSPEC)

| Date | Activité | Attendu | Obtenu | PASS |
|---|---|---|---|---|
| 24.04.2027 | Instr demi-sct - ABC | N03a | N03a | PASS |
| 01.05.2027 | Instr demi-sct - ABC | N02a | N02a | PASS |
| 08.05.2027 | Instr demi-sct - ABC | N01a | N01a | PASS |
| 15.05.2027 | Instr demi-sct - ABC | N05b | N05b | PASS |
| 22.05.2027 | Instr demi-sct - ABC | N04b | N04b | PASS |
| 29.05.2027 | Instr demi-sct - ABC | N03b | N03b | PASS |
| 31.05.2027 | Instr sct - ABC | N03 | N03 | PASS |
| 05.06.2027 | Instr demi-sct - ABC | N02b | N02b | PASS |
| 07.06.2027 | Instr sct - ABC | N02 | N02 | PASS |
| 12.06.2027 | Instr demi-sct - ABC | N01b | N01b | PASS |
| 14.06.2027 | Instr sct - ABC | N01 | N01 | PASS |
| 19.06.2027 | Instr demi-sct - ABC | N05a | N05a | PASS |
| 21.06.2027 | Instr sct - ABC | N05 | N05 | PASS |
| 26.06.2027 | Instr demi-sct - ABC | N04a | N04a | PASS |
| 28.06.2027 | Instr sct - ABC | N04 | N04 | PASS |

10 demi-sections distinctes, 5 sections. Lieu Caserne G1, Stat.Com 0164F7, Responsable Chef section DPS.

### VARIA

C1/B1/B2 le même jour, réalisations distinctes. Public identique par date (même cycle OTHER), OI/Stat.Com/lieu propres.

| Date | OI | Demi/sct | Attendu | Obtenu | Stat.Com | Lieu | PASS |
|---|---|---|---|---|---|---|---|
| 01.05.2027 | C1 | demi N01b | N01b | N01b | 012C1 | Caserne C1 | PASS |
| 01.05.2027 | B1 | demi N01b | N01b | N01b | 012B1 | Caserne B1 | PASS |
| 01.05.2027 | B2 | demi N01b | N01b | N01b | 012B2 | Caserne C1 | PASS |
| 08.05.2027 | C1/B1/B2 | demi N03a | N03a | N03a | propres | propres | PASS |
| 15.05.2027 | C1/B1/B2 | demi N02a | N02a | N02a | propres | propres | PASS |
| 22.05.2027 | C1/B1/B2 | demi N01a | N01a | N01a | propres | propres | PASS |
| 29.05.2027 | C1/B1/B2 | demi N03b | N03b | N03b | propres | propres | PASS |
| 05.06.2027 | C1/B1/B2 | demi N02b | N02b | N02b | propres | propres | PASS |
| 19.06.2027 | C1/B1/B2 | sct N03 | N03 | N03 | propres | propres | PASS |
| 26.06.2027 | C1/B1/B2 | sct N02 | N02 | N02 | propres | propres | PASS |
| 03.07.2027 | C1, B1 | sct N01 | N01 | N01 | propres | propres | PASS |
| 03.07.2027 | G1 | demi N03a | N03a | N03a | 012G1 | Caserne G1 | PASS |
| 10.07 → 04.09 | G1 | 9 demi restantes | cycle G1 | cycle G1 | 012G1 | Caserne G1 | PASS |
| 09.08 / 16.08 / 23.08 / 31.08 / 06.09 | G1 | sct N03 N02 N01 N05 N04 | cycle | cycle | 012G1 | Caserne G1 | PASS |

B2 n’a **pas** d’Instr sct VARIA le 03.07 : tour 2026 absent, non inventé.

### FEU

| Date | OI | Demi/sct | Attendu | Obtenu | PASS |
|---|---|---|---|---|---|
| 21.08.2027 | C1/B1/B2 | demi N03b | N03b | N03b | PASS |
| 28.08.2027 | C1/B1/B2 | demi N02b | N02b | N02b | PASS |
| 04.09.2027 | C1/B1/B2 | demi N01b | N01b | N01b | PASS |
| 11.09.2027 | C1/B1/B2 | demi N03a | N03a | N03a | PASS |
| 18.09.2027 | C1/B1/B2 | demi N02a | N02a | N02a | PASS |
| 25.09.2027 | C1/B1/B2 | demi N01a | N01a | N01a | PASS |
| 30.10.2027 | C1/B1/B2 | sct N02 | N02 | N02 | PASS |
| 06.11.2027 | C1/B1/B2 | sct N01 | N01 | N01 | PASS |
| 13.11.2027 | C1, B1 | sct N03 | N03 | N03 | PASS |

B2 : lieu Caserne C1, OI B2, Stat.Com 012B2. Pas d’Instr sct FEU B2 le 13.11 (tour 2026 absent).

### PIONNIER (G1)

Demi-section : vendredi de la semaine. CSU-nvb : vendredi **précédent**.

| Date | Activité | Attendu | Obtenu | PASS |
|---|---|---|---|---|
| 11.09.2027 07:30–11:30 | Instr demi-sct - PIONNIER | N03a | N03a | PASS |
| 25.09.2027 | Instr demi-sct - PIONNIER | N01a | N01a | PASS |
| 02.10.2027 | Instr demi-sct - PIONNIER | N05b | N05b | PASS |
| 09.10.2027 | Instr demi-sct - PIONNIER | N04b | N04b | PASS |
| 16.10.2027 | Instr demi-sct - PIONNIER | N03b | N03b | PASS |
| 23.10.2027 | Instr demi-sct - PIONNIER | N02b | N02b | PASS |
| 30.10.2027 | Instr demi-sct - PIONNIER | N01b | N01b | PASS |
| 06.11.2027 | Instr demi-sct - PIONNIER | N05a | N05a | PASS |
| 08.11.2027 19:15–22:00 | Instr sct - PIONNIER CSU-nvb | N01 (vendredi préc.) | N01 | PASS |
| 13.11.2027 | Instr demi-sct - PIONNIER | N04a | N04a | PASS |
| 15.11.2027 19:15–22:00 | Instr sct - PIONNIER CSU-nvb | N05 | N05 | PASS |
| 22.11.2027 19:15–22:00 | Instr sct - PIONNIER CSU-nvb | N04 | N04 | PASS |
| 27.11.2027 | Instr demi-sct - PIONNIER | N02a | N02a | PASS |
| 29.11.2027 19:15–22:00 | Instr sct - PIONNIER CSU-nvb | N03 | N03 | PASS |
| 06.12.2027 19:15–22:00 | Instr sct - PIONNIER CSU-nvb | N02 | N02 | PASS |

Sans l’exception vendredi précédent, CSU-nvb afficherait N05/N04/N03/N02/N01 (décalage d’une semaine). Le moteur unique applique l’exception ; pas un second cycle.

---

## H. Preuve séparation OI

Aucune occurrence VARIA / FEU / ABC / PIONNIER / KICK-OFF ne porte un tableau OI fusionné après overlay.

| Activité | G1 | C1 | B1 | B2 | Fusion |
|---|---:|---:|---:|---:|---|
| Instr demi-sct - VARIA | 10 | 6 | 6 | 6 | 0 |
| Instr sct - VARIA | 5 | 3 | 3 | 2 | 0 |
| Instr demi-sct - FEU | 0 | 6 | 6 | 6 | 0 |
| Instr sct - FEU | 0 | 3 | 3 | 2 | 0 |
| Instr demi-sct - ABC | 10 | 0 | 0 | 0 | 0 |
| Instr sct - ABC | 5 | 0 | 0 | 0 | 0 |
| Instr demi-sct - PIONNIER | 10 | 0 | 0 | 0 | 0 |
| Instr sct - PIONNIER CSU-nvb | 5 | 0 | 0 | 0 | 0 |
| Instr demi-sct - KICK-OFF | 1 | 1 | 1 | 1 | 0 |

QV-DPS-002 vérifié sur toutes les VARIA/FEU B2 : OI=`B2`, Stat.Com=`012B2`, lieu=`Caserne C1`.

---

## I. Preuve responsables

Famille QV-DPS-003 : **0** occurrence concernée avec Responsable = `À affecter`.

| Activité | n | Responsable | OI |
|---|---:|---|---|
| Instr sct - ABC | 5 | Chef section DPS | G1 |
| Instr sct - VARIA | 13 | Chef section DPS | C1 B1 B2 G1 |
| Instr sct - FEU | 8 | Chef section DPS | C1 B1 B2 |
| Instr sct - PIONNIER CSU-nvb | 5 | Chef section DPS | G1 |
| Instr demi-sct ABC/VARIA/FEU/PIONNIER/KICK-OFF | toutes | Chef section DPS | par OI |

Les 4 conduites 06.02 déjà présentes dans le JSON 2027 conservent leur responsable source
(`À affecter` G1, `C sct` C1/B1/B2). Ce n’est **pas** la famille Instr sct. Les 56 conduites
ajoutées portent `Chef section DPS` par héritage de construction, hors exigence MOA de ce lot.

---

## J. Preuve conduites

Cible structurelle : **84**. Matérialisé : **60**. Insuffisances explicites : **24** (found=2).
4 existantes appariées (KICK-OFF 06.02) + 56 ajoutées. Second passage : 0 ajout.

Public de **chaque** conduite : `<demi-section>, cond PL, cond VL`.
Horaire : immédiatement après la source, ≤ 1 h. Stat.Com `0152F7`. Jamais après PIONNIER.
Aucune réserve. Aucun doublon `OI|startsAt|demi-section`.

Les 4 demi-sections avec 3 sources (donc 3 conduites) sont celles qui ont un KICK-OFF le 06.02
en plus d’ABC+VARIA (G1) ou VARIA+FEU (C1/B1/B2) :

- G1 N04a
- C1 N01b
- B1 N01b
- B2 N01b

### Matrice 28 × 3

| OI | Demi-section | Conduite 1 | Conduite 2 | Conduite 3 | n | Statut |
|---|---|---|---|---|---:|---|
| G1 | N04a | 06.02 KICK-OFF | 26.06 ABC | 04.09 VARIA | 3 | PASS |
| G1 | N03a | 24.04 ABC | 03.07 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N02a | 01.05 ABC | 10.07 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N01a | 08.05 ABC | 17.07 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N05b | 15.05 ABC | 24.07 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N04b | 22.05 ABC | 31.07 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N03b | 29.05 ABC | 07.08 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N02b | 05.06 ABC | 14.08 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N01b | 12.06 ABC | 21.08 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| G1 | N05a | 19.06 ABC | 28.08 VARIA | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| C1 | N01b | 06.02 KICK-OFF | 01.05 VARIA | 04.09 FEU | 3 | PASS |
| C1 | N03a | 08.05 VARIA | 11.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| C1 | N02a | 15.05 VARIA | 18.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| C1 | N01a | 22.05 VARIA | 25.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| C1 | N03b | 29.05 VARIA | 21.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| C1 | N02b | 05.06 VARIA | 28.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B1 | N01b | 06.02 KICK-OFF | 01.05 VARIA | 04.09 FEU | 3 | PASS |
| B1 | N03a | 08.05 VARIA | 11.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B1 | N02a | 15.05 VARIA | 18.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B1 | N01a | 22.05 VARIA | 25.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B1 | N03b | 29.05 VARIA | 21.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B1 | N02b | 05.06 VARIA | 28.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B2 | N01b | 06.02 KICK-OFF | 01.05 VARIA | 04.09 FEU | 3 | PASS |
| B2 | N03a | 08.05 VARIA | 11.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B2 | N02a | 15.05 VARIA | 18.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B2 | N01a | 22.05 VARIA | 25.09 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B2 | N03b | 29.05 VARIA | 21.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |
| B2 | N02b | 05.06 VARIA | 28.08 FEU | — | 2 | CONDUITE_SOURCE_INSUFFISANTE |

Totaux : G1 21 / C1 13 / B1 13 / B2 13 = **60**. Manque : 9 G1 + 5 C1 + 5 B1 + 5 B2 = **24**.

Cause unique : hors KICK-OFF, G1 n’a que ABC+VARIA datés ; C1/B1/B2 n’ont que VARIA+FEU datés.
PIONNIER est volontairement inéligible (QV-CONDUITE-006). Inventer une 3ᵉ source violerait QV-CONDUITE-003.

Recette 06.02 (publics désormais généraux) :

| OI | Public | Lieu |
|---|---|---|
| G1 | N04a, cond PL, cond VL | Caserne G1 |
| C1 | N01b, cond PL, cond VL | Caserne C1 |
| B1 | N01b, cond PL, cond VL | Caserne B1 |
| B2 | N01b, cond PL, cond VL | Caserne C1 |

---

## K. PR-ABC

6 séances : T1 × 3 + T4 × 3. Dates civiles **vides**. Séance 2 : contrainte mercredi matin
enregistrée, non datée. Fiche T1 S1 : « Aucune date T1 2026 démontrée ; 2026 montre T2
(21.04 soir, 10.06 matin mercredi) et T4 (06.10 soir). Les dates civiles 2027 ne sont pas inventées. »

Domaine PR, public PABC. Distinct d’ABC FOSPEC. Structure conservée.

---

## L. Tests

Nouveau : `scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` — **19/19 PASS**.

Couverture nommée : QV-CTA-001/003/004, QV-CONDUITE-001 à 007, QV-DPS-001/002/003,
QV-PIONNIER-001/002/003, QV-PRABC-001/002, QV-UI-001/002, idempotence, réserves, doublons,
JSON 2027 = 622, overlay = 719.

---

## M. Non-régression

| Suite | Résultat |
|---|---|
| BUSINESS-RULES-CANONICALIZATION-AND-FINAL-CLOSURE-1 | 19/19 |
| QV FINAL-DEVELOPMENT-1 | 30/30 |
| QV-DPS-OI-SEPARATION-AND-CONDUITE-CLOSURE-1 | 12/12 |
| QV SECTION-ROTATION-CLOSURE-1 | 20/20 |
| QV HISTORY SECTIONS UX | 28/28 |
| QV-AGENDA-PROGRAMME-UX-FINAL-1 | 9/9 |
| QV BUSINESS CONSOLIDATION | 39/39 |
| QV REPAIR 2 | 11/11 |

Les assertions historiques « 12 conduites » / overlay 671 ont été alignées sur la règle MOA
corrigée (84 attendues, 60 matérialisées, 24 insuffisances, overlay 719). Ce n’est pas une
régression fonctionnelle : c’est le remplacement de la règle erronée 3 thèmes × 4 OI.

Acquis conservés : séparation C1/B1/B2, B2 lieu C1, PIONNIER 4 h / CSU-nvb / FOBA 2,
KICK-OFF 06.02 4 OI, État 8×8, filtres, round-trip fiche, DnD CTA verrouillé (code non touché).

---

## N. Captures navigateur

Répertoire : `docs/captures/qv-business-rules-canonicalization-and-final-closure-1/`

| # | Fichier | Contrôle |
|---|---|---|
| 1 | `01-conduites-60.png` | Recherche « Conduite, formation continue » → 60 résultats |
| 2 | `02-conduites-kickoff-publics.png` | 06.02 G1 N04a / C1 N01b / B1 N01b / B2 N01b + cond PL, cond VL |
| 3 | `03-kickoff-06-02.png` | 4 Instr demi-sct séparées, publics CTA, lieux canoniques |
| 4 | `04-instr-sct-varia-responsable.png` | 13 lignes, Chef section DPS, C1/B1/B2 séparés |
| 5 | `05-instr-sct-feu-responsable.png` | 8 lignes, Chef section DPS |
| 6 | `06-instr-sct-abc-responsable.png` | 5 G1, Chef section DPS, rotation N03→N04 |
| 7 | `07-instr-sct-pionnier-responsable.png` | 5 CSU-nvb 19:15–22:00, Chef section DPS, exception vendredi préc. |
| 8 | `08-varia-demi-oi-separes.png` | 28 lignes, C1/B1/B2 distincts le même jour |
| 9 | `09-feu-demi-oi-separes.png` | 18 lignes, B2 Caserne C1 / 012B2 |
| 10 | `10-abc-demi-rotation.png` | 10 G1, dates distinctes, Chef section DPS |
| 11 | `11-pionnier-demi.png` | 10 × 07:30–11:30, Caserne G1 |
| 12 | `12-pr-abc.png` | 6 Exercice PR-ABC, dates À définir, domaine PR |
| 13 | `13-pr-abc-fiche-t1-s1.png` | Occurrence 1 session 1/3, date vide, note T1 |
| 14 | `14-retour-recherche-etat.png` | Recherche PR-ABC conservée (6) ; État carré 8×8 + texte |

Mesure CDP État : swatch **8×8 px**, `border-radius: 0`, wrapper `inline-flex` / `nowrap`,
fond transparent, `--scope-state-swatch-size: 8px`. Pas de badge ni capsule.

Round-trip : Programme (recherche `Exercice PR-ABC`, 6) → fiche T1 S1 → **Retour au programme** :
recherche toujours `Exercice PR-ABC`, 6 résultats.

---

## O. Anomalies métier restantes

1. **84 − 60 = 24 conduites manquantes**, toutes `CONDUITE_SOURCE_INSUFFISANTE` found=2.
   Pas d’invention. Une 3ᵉ source exigerait une décision MOA (thème supplémentaire éligible,
   ou lever l’exclusion PIONNIER, ou dates 2026 supplémentaires démontrées).
2. **Instr sct VARIA B2** : 2/3 tours (03.07 absent).
3. **Instr sct FEU B2** : 2/3 tours (13.11 absent).
4. **PR-ABC** : structure 3+3 livrée, **aucune date civile**.
5. **Bandeau KPI** « Réalisations 612 / Sessions 622 » : compteurs du fichier source.
   Le tableau overlay affiche **719**. Pas une fusion OI.
6. **Responsable des 4 conduites 06.02 source 2027** : `À affecter` / `C sct` conservés
   (hors famille Instr sct). Non exigé par ce lot.

Ces points sont masqués nulle part.

---

## P. Décisions MOA éventuellement nécessaires

1. Comment atteindre 84 si les sources resteront à 2 par demi-section : ouvrir un 3ᵉ thème
   éligible, accepter 60 comme plafond 2027 honnête, ou programmer des Instr demi-sct
   supplémentaires.
2. Dates civiles PR-ABC T1 et T4.
3. 3ᵉ tour Instr sct VARIA/FEU B2 s’il doit exister malgré l’absence 2026.
4. Harmoniser le responsable des 4 conduites KICK-OFF source 2027 (hors périmètre actuel).

COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DÉPLOIEMENT : AUCUN
PRODUCTION : INCHANGÉE

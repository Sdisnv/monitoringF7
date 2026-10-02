# SCOPE — QUO VADIS — CONDUITES-CANONICAL-CLOSURE-1

Recette locale : `http://127.0.0.1:4391`
Branche : `codex/qv-recette-programme-cta-edit-3`

Le JSON canonique 2027 reste à **622** séances. L’overlay de lecture produit **767** séances
(**646** datées, **121** à définir). Aucun patch manuel d’occurrence 2027.

Aucun commit, aucun push, aucune PR, aucun merge, aucun déploiement. ORION hors périmètre.

Le lot BUSINESS-RULES-CANONICALIZATION-AND-FINAL-CLOSURE-1 n’est pas rouvert.
Son état 60/84 (`CONDUITE_SOURCE_INSUFFISANTE`, found=2) n’est plus l’état final.

---

## P. Verdict

**READY_FOR_MOA_RECIPE**

La cible calculée depuis le référentiel CTA réel est **84**.
Les **84** conduites sont matérialisées. **0** insuffisance. **0** orpheline.
Le contrôle `qvConduiteCoherenceControl` est **pass = true** avec compteurs chiffrés.

---

## A. Cause racine des 24 conduites manquantes

Le moteur du lot précédent traitait le **nombre de sources historiques 2026 datées** comme un
plafond 2027. Pour 24 demi-sections opérationnelles, seules **2** `Instr demi-sct` éligibles
existaient (hors PIONNIER). Le moteur s’arrêtait avec `CONDUITE_SOURCE_INSUFFISANTE (found=2)`
au lieu d’appliquer la règle annuelle MOA.

L’historique 2026 est une **preuve** lorsqu’il existe, pas un **droit de veto**.

Les 4 demi-sections déjà à 3 sources (KICK-OFF + 2 thèmes) n’étaient pas concernées :
G1 N04a et C1/B1/B2 N01b (06.02.2027).

---

## B. Règle corrigée

**QV-CONDUITE-008** — si une demi-section opérationnelle a moins de 3 `Instr demi-sct` éligibles
(hors PIONNIER), le moteur **programme** les occurrences manquantes de façon déterministe :

- samedi de permanence CTA (`instructionPublicForDate`) ;
- 07:30–10:30 ;
- hors jours fériés vaudois ;
- hors date déjà occupée par une instruction du même OI ;
- thème = premier thème éligible non KICK-OFF encore absent
  (G1 : VARIA en 2ᵉ tour ; C1/B1/B2 : FEU) ;
- provenance `MOA_RULE_ANNUAL_PROGRAMMING` ;
- identifiants `QV27:PROG:{theme}:{oi}:{half}:{date}:{start}`.

Ensuite **QV-CONDUITE-001** pose **exactement 3** conduites de 1 h, immédiatement après
chaque source, même OI, même Nxx.

Aucune date civile n’est inventée hors cycle CTA. Aucune fusion C1/B1/B2. Aucune conduite
après PIONNIER.

---

## C. Référentiel des demi-sections réellement utilisé

Source unique : `netlify/lib/_scope-cta-rules.js` (`operationalHalfSections`).

| OI | Cycle | Réserve exclue | Demi-sections opérationnelles |
|---|---|---|---|
| G1 | N04b → N03b → N02b → N01b → N05a → N04a → N03a → N02a → N01a → N05b | N06 | **10** |
| C1 | N03b → N02b → N01b → N03a → N02a → N01a | N04 | **6** |
| B1 | idem C1 | N04 | **6** |
| B2 | idem C1 | N04 | **6** |
| **Total** | | | **28** |

Pas de divergence avec la cible annoncée **84** (28 × 3). Pas d’arrêt.

**Note cycle C1/B1/B2.** Le prompt liste N03a en tête. Le moteur conserve `OTHER_CYCLE`
commençant par **N03b**, car la preuve MOA du 06.02.2027 est **N01b**. Une preuve métier
validée prime sur une réécriture du cycle. Le moteur CTA n’est pas dupliqué.

---

## D. Cible calculée par OI

| OI | Demi-sections | Cible conduites |
|---|---:|---:|
| G1 | 10 | **30** |
| C1 | 6 | **18** |
| B1 | 6 | **18** |
| B2 | 6 | **18** |
| **Total** | **28** | **84** |

---

## E. Nombre réellement matérialisé

| OI | Matérialisé | UI recette (recherche « Conduite, formation continue ») |
|---|---:|---|
| G1 | 30 | inclus dans 84 |
| C1 | 18 | 18 |
| B1 | 18 | inclus dans 84 |
| B2 | 18 | 18 |
| **Total** | **84** | **84** |

Dont **4** conduites déjà présentes (KICK-OFF 06.02) + **80** ajoutées overlay.
**24** `Instr demi-sct` programmées (QV-CONDUITE-008) pour porter les 24 conduites
qui manquaient.

`CONDUITE_SOURCE_INSUFFISANTE` : **0**.

---

## F. Preuve : 3 conduites par demi-section

`qvConduiteCoherenceControl` : `perHalf.length = 28`, chaque `n = 3`,
`incompleteHalves = []`, `reserveConduites = 0`.

Exemples G1 ( * = instruction programmée ) :

| Demi-section | 1 | 2 | 3 |
|---|---|---|---|
| N04b | 22.05 ABC | 31.07 VARIA | 18.12 VARIA* |
| N04a | 06.02 KICK-OFF | 26.06 ABC | 04.09 VARIA |
| N01a | 08.05 ABC | 17.07 VARIA | 04.12 VARIA* |

C1/B1/B2, mêmes dates par Nxx, OI distincts. Ex. N01b : 06.02 KICK-OFF / 01.05 VARIA / 04.09 FEU.

Toutes les conduites : **10:30–11:30** après Instr **07:30–10:30**.

---

## G. Preuve public `Nxx, cond PL, cond VL`

Contrôle : `publicFail = 0`. Recette : 84/84.

| Date | OI | Public |
|---|---|---|
| 06.02.2027 | G1 | **N04a, cond PL, cond VL** |
| 06.02.2027 | C1 / B1 / B2 | **N01b, cond PL, cond VL** |
| 09.01.2027 | G1 | N03b, cond PL, cond VL |
| 09.01.2027 | C1 / B1 / B2 | N02a, cond PL, cond VL |

Le Nxx est celui de l’Instr demi-sct immédiatement précédente, jamais recalculé à part.

---

## H. Preuve séparation C1 / B1 / B2

`fusedOi = 0`. Recette : même samedi, trois lignes distinctes.

| OI | Stat.Com instruction | Lieu |
|---|---|---|
| G1 | 012G1 | Caserne G1 |
| C1 | 012C1 | Caserne C1 |
| B1 | 012B1 | Caserne B1 |
| B2 | 012B2 | **Caserne C1** |

Capture `10-b2-conduites-caserne-c1.png` : 18 conduites B2, lieu Caserne C1, OI B2.

---

## I. Preuve responsables

Contrôle : `responsableFail = 0`.

| Famille | Recette | Responsable |
|---|---|---|
| Instr demi-sct / sct VARIA | 50 lignes « VARIA » | **Chef section DPS** (0 « À affecter ») |
| Instr demi-sct / sct FEU | Instr FEU | **Chef section DPS** |
| ABC / PIONNIER (Instr) | conservés | Chef section DPS (non régression lot précédent) |

Les 6 « Chef site DPS » sous filtre « FEU » ne sont **pas** des Instr sct/demi-sct
(autres activités FEU). Non retouchées.

KICK-OFF 06.02 conduites : responsable historique inchangé (À affecter / C sct) —
hors familles VARIA/FEU.

---

## J. Contrôle rotation CTA

Moteur unique `instructionPublicForDate` (`_scope-cta-rules.js`).
Aucune duplication de cycle dans `scope-ui-logic.js`.

- Ancrage **2026-02-13**, cycle **interannuel**, pas de reset au 1er janvier.
- 06.02.2027 = samedi CTA : G1 **N04a**, C1/B1/B2 **N01b** (preuve MOA).
- 20.02.2027 G1 : Instr VARIA **N02a** (suite du cycle).
- 04.12.2027 G1 : Instr VARIA* **N01a** + conduite 10:30–11:30.
- 18.12.2027 G1 : N04b (retour dans le cycle de 10).

Les 24 instructions programmées tombent sur un samedi CTA dont le public
égale `instructionPublicForDate(date, oi, 'demi-section')`.

---

## K. Réconciliation du total de séances

Le **719** du lot précédent n’est pas le total correct de ce lot.

| Étape | Δ | Cumul |
|---|---:|---:|
| JSON canonique 2027 | | **622** |
| Clones OI (séparation C1/B1/B2, rotation) | +38 | 660 |
| Instr demi-sct programmées QV-CONDUITE-008 | +24 | 684 |
| Conduites overlay `MOA_RULE_CONDUITE_2027` | +80 | 764 |
| PR-ABC (3 T1 + 3 T4, 2ᵉ séance mercredi si démontrée) | +3 | **767** |
| Suppressions / remplacements | 0 | **767** |

UI : **767** séances · **646** datées · **121** à définir.

Équation : `622 + 38 + 24 + 80 + 3 = 767`.

---

## L. Règles désormais canoniques / réutilisables

Référentiel : `docs/business-rules/quo-vadis-canonical-rules.md`
Catalogue campagne : `netlify/lib/data/scope-qv-canonical-annual-rules.json` **version 2027.2**

Règles actives exposées au moteur (`ctaParameters.annualRules`) :
QV-CTA-001…004, QV-CONDUITE-001…003, 005…**008**, QV-DPS-001…003, QV-PRABC-001, QV-PIONNIER-001.

Le même overlay s’applique à 2028/2029 sans retoucher le JSON annuel : le cycle CTA
continue ; QV-CONDUITE-008 complète les sources manquantes.

---

## M. Reliquat structurel (migration minimale, non bloquante)

Table existante : `scope_quo_vadis_planning_rules`.

**Non fait** (hors périmètre, pas d’écriture production) : seed
`(code, version_code, valid_from/to, active, metadata.ruleId)` pour activer/désactiver
une campagne depuis l’UI « Règles » sans toucher au code.

Les règles métier 2027 sont déjà centralisées et appliquées.

---

## N. Tests et non-régression

| Suite | Résultat |
|---|---|
| `scripts/scope-qv-conduites-canonical-closure-1-tests.js` | **13/13** |
| `scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js` | 19/19 |
| `scripts/scope-qv-final-development-1-tests.js` | 30/30 |
| `scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js` | 12/12 |
| `scripts/scope-qv-section-rotation-closure-1-tests.js` | 20/20 |
| `scripts/scope-qv-history-sections-ux-tests.js` | 28/28 |
| `scripts/scope-qv-agenda-programme-ux-final-1-tests.js` | 9/9 |
| `scripts/scope-qv-business-consolidation-tests.js` | 39/39 |
| `scripts/scope-qv-repair-2-tests.js` | 11/11 |

Contrôle chiffré (`qvConduiteCoherenceControl`) :

| Compteur | Valeur |
|---|---:|
| halves | G1:10 C1:6 B1:6 B2:6 |
| target / materialized | 84 / 84 |
| reserveConduites | 0 |
| orphans | 0 |
| oiMismatch / nxxMismatch | 0 / 0 |
| notImmediate / durationFail | 0 / 0 |
| publicFail | 0 |
| fusedOi / statComFail / lieuFail | 0 / 0 / 0 |
| responsableFail / duplicates | 0 / 0 |
| pass | **true** |

Acquis conservés : KICK-OFF 06.02 (4 OI), ABC, PIONNIER (10 demi-sct G1), VARIA, FEU,
PR-ABC, drag-and-drop, filtres, ordre métier, Stat.Com, lieux, publics CTA, État **carré 8×8 + texte**
(aucun badge, aucune capsule).

---

## O. Captures navigateur

Dossier : `docs/captures/qv-conduites-canonical-closure-1/`

| Fichier | Preuve |
|---|---|
| `01-conduites-84.png` | 84 conduites, publics Nxx + cond PL + cond VL, 10:30–11:30, État 8×8 |
| `02-kickoff.png` | KICK-OFF conservé, overlay 767 |
| `03-varia.png` | Instr VARIA séparées C1/B1/B2, Chef section DPS |
| `04-feu.png` | Instr FEU C1/B1/B2, Chef section DPS |
| `05-abc.png` | ABC G1 non régressé |
| `06-pionnier.png` | PIONNIER G1 non régressé, pas de conduite collée |
| `07-g1-fevrier.png` | 06.02 N04a + conduite ; 20.02 N02a (rotation) |
| `08-g1-decembre-rotation.png` | 04.12 N01a Instr + conduite (source programmée) |
| `09-c1-conduites-18.png` | 18 conduites C1, Caserne C1 |
| `10-b2-conduites-caserne-c1.png` | 18 conduites B2, lieu Caserne C1 |

JSON 2027 : **non modifié**.

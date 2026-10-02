# SCOPE — QV-DPS-OI-SEPARATION-AND-CONDUITE-CLOSURE-1

Recette locale : `http://127.0.0.1:4391`
Branche : `codex/qv-recette-programme-cta-edit-3`
Correction du modèle de génération (overlay de lecture). Le JSON canonique 2027 reste à **622** séances. L’overlay métier produit **671** séances.

Aucun commit, aucun push, aucune PR, aucun merge, aucun déploiement.

---

## A. Cause racine

Les tours historiques 2026 de VARIA et FEU existent **une ligne par OI** (C1, B1, B2 distincts). Le moteur de rotation regroupait encore ces tours dans un seau `date + horaire` unique. Une seule occurrence 2027 était alors produite avec :

- `OI = C1, B1, B2`
- Stat.Com recopié du premier site (souvent `012B1`)
- lieu unique (souvent Caserne C1)

Conséquences observées en recette MOA :

1. fusion C1/B1/B2 pour Instr sct/demi-sct VARIA et FEU ;
2. instruction de section B2 manquante (absorbée dans la ligne fusionnée) ;
3. public et Stat.Com non propres à l’OI ;
4. conduites rattachables à une source fusionnée plutôt qu’à une demi-section d’OI ;
5. colonne État : une règle CSS résiduelle (`.scope-state-label span { white-space: normal }`) autorisait le retour à la ligne du libellé.

ABC G1 et PIONNIER n’étaient pas fusionnés : ils étaient déjà G1 seuls. Le cycle CTA n’a pas été modifié.

---

## B. Correction appliquée

Dans `qvRotationBuckets` (`assets/js/scope-ui-logic.js`), la clé de seau est désormais :

`date 2026 + horaire + OI`

Chaque OI reçoit sa propre réalisation. Si le canonique 2027 n’a qu’une ligne C1/B1/B2, les OI manquants sont **clonés** (`QV27:OI:{définition}:{OI}:{date}:{heure}`), sans patch manuel des lignes 2027.

Pour chaque réalisation répartie :

- OI atomique ;
- Stat.Com réécrit par OI (`qvRewriteDpsSiteToken`, `012C1` / `012B1` / `012B2` / `012G1`) ;
- lieu = `Caserne ${qvDpsDefaultLieuCode(oi)}` avec **B2 → C1** ;
- public = cycle CTA canonique (`instructionPublicForDate`), jamais la capture MOA ni l’Excel multi-OI.

L’enrichissement historique Excel est **ignoré** lorsque `rotationStatus === DISTRIBUTED` ou `sectionPublicRule === CTA_PERMANENCE_CYCLE`, pour ne pas écraser le public CTA par un personnel partagé C1/B1/B2.

Pipeline inchangé dans l’ordre : rotation → PIONNIER → conduites → PR-ABC.

PR-ABC : 2 séries T1 et T4 × 3 séances. Dates civiles **non inventées**. Statut `MOA_PROPOSAL_NO_DEMONSTRATED_T1_T4_CALENDAR`.

Colonne État : suppression de la règle `white-space:normal` sur un `span` imbriqué ; conservation du composant canonique 8×8 + texte, `inline-flex`, sans badge.

---

## C. Séparation G1 / C1 / B1 / B2

Aucune occurrence VARIA / FEU / ABC / PIONNIER / KICK-OFF ne porte un tableau OI fusionné après overlay.

| Activité | G1 | C1 | B1 | B2 | Fusion C1/B1/B2 |
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

B2 section VARIA et FEU : **2 tours historiques démontrés**, pas 3. Le troisième n’existe pas dans Excel 2026. Il n’a pas été inventé.

---

## D. Rotation sections / demi-sections

Cycle CTA inchangé (ancrage 13.02.2026, G1 10 semaines hors N06, C1/B1/B2 6 semaines hors N04). Les publics du tableau ci-dessous sont dérivés de ce cycle, pas de la capture MOA.

ABC G1 demi-sct : **10 dates distinctes**, 10 demi-sections distinctes. La rotation n’est plus empilée sur une date unique.

Écart volontaire vs capture MOA ABC (CTA gagne) :

| Date | Capture MOA | CTA (livré) |
|---|---|---|
| 24.04.27 | N05a | **N03a** |
| 01.05.27 | N04a | **N02a** |
| 08.05.27 | N03a | **N01a** |
| 15.05.27 | N02a | **N05b** |
| 22.05.27 | N01a | **N04b** |
| 29.05.27 | N05b | **N03b** |
| 31.05.27 sct | N05 | **N03** |
| 05.06.27 | N04b | **N02b** |
| 07.06.27 sct | N04 | **N02** |
| 12.06.27 | N03b | **N01b** |
| 14.06.27 sct | N03 | **N01** |
| 19.06.27 | N02b | **N05a** |
| 21.06.27 sct | N02 | **N05** |
| 26.06.27 | N01b | **N04a** |
| 28.06.27 sct | N01 | **N04** |

Les dates et horaires de la rotation ABC sont conservés. Seul le public suit le cycle CTA.

---

## E. VARIA

Séparé G1 / C1 / B1 / B2. Recette navigateur : recherche `VARIA` (capture `03-varia.png`).

### Demi-section

| Date | Horaire | OI | Public | Stat.Com | Lieu |
|---|---|---|---|---|---|
| 01.05.27 | 07:30–10:30 | C1 | N01b | 012C1 | Caserne C1 |
| 01.05.27 | 07:30–10:30 | B1 | N01b | 012B1 | Caserne B1 |
| 01.05.27 | 07:30–10:30 | B2 | N01b | 012B2 | Caserne C1 |
| 08.05.27 | 07:30–10:30 | C1 | N03a | 012C1 | Caserne C1 |
| 08.05.27 | 07:30–10:30 | B1 | N03a | 012B1 | Caserne B1 |
| 08.05.27 | 07:30–10:30 | B2 | N03a | 012B2 | Caserne C1 |
| 15.05.27 | 07:30–10:30 | C1 | N02a | 012C1 | Caserne C1 |
| 15.05.27 | 07:30–10:30 | B1 | N02a | 012B1 | Caserne B1 |
| 15.05.27 | 07:30–10:30 | B2 | N02a | 012B2 | Caserne C1 |
| 22.05.27 | 07:30–10:30 | C1 | N01a | 012C1 | Caserne C1 |
| 22.05.27 | 07:30–10:30 | B1 | N01a | 012B1 | Caserne B1 |
| 22.05.27 | 07:30–10:30 | B2 | N01a | 012B2 | Caserne C1 |
| 29.05.27 | 07:30–10:30 | C1 | N03b | 012C1 | Caserne C1 |
| 29.05.27 | 07:30–10:30 | B1 | N03b | 012B1 | Caserne B1 |
| 29.05.27 | 07:30–10:30 | B2 | N03b | 012B2 | Caserne C1 |
| 05.06.27 | 07:30–10:30 | C1 | N02b | 012C1 | Caserne C1 |
| 05.06.27 | 07:30–10:30 | B1 | N02b | 012B1 | Caserne B1 |
| 05.06.27 | 07:30–10:30 | B2 | N02b | 012B2 | Caserne C1 |
| 03.07.27 | 07:30–10:30 | G1 | N03a | 012G1 | Caserne G1 |
| 10.07.27 | 07:30–10:30 | G1 | N02a | 012G1 | Caserne G1 |
| 17.07.27 | 07:30–10:30 | G1 | N01a | 012G1 | Caserne G1 |
| 24.07.27 | 07:30–10:30 | G1 | N05b | 012G1 | Caserne G1 |
| 31.07.27 | 07:30–10:30 | G1 | N04b | 012G1 | Caserne G1 |
| 07.08.27 | 07:30–10:30 | G1 | N03b | 012G1 | Caserne G1 |
| 14.08.27 | 07:30–10:30 | G1 | N02b | 012G1 | Caserne G1 |
| 21.08.27 | 07:30–10:30 | G1 | N01b | 012G1 | Caserne G1 |
| 28.08.27 | 07:30–10:30 | G1 | N05a | 012G1 | Caserne G1 |
| 04.09.27 | 07:30–10:30 | G1 | N04a | 012G1 | Caserne G1 |

### Section

| Date | Horaire | OI | Public | Stat.Com | Lieu |
|---|---|---|---|---|---|
| 19.06.27 | 07:30–10:30 | C1 | N03 | 012C1 | Caserne C1 |
| 19.06.27 | 07:30–10:30 | B1 | N03 | 012B1 | Caserne B1 |
| 19.06.27 | 07:30–10:30 | B2 | N03 | 012B2 | Caserne C1 |
| 26.06.27 | 07:30–10:30 | C1 | N02 | 012C1 | Caserne C1 |
| 26.06.27 | 07:30–10:30 | B1 | N02 | 012B1 | Caserne B1 |
| 26.06.27 | 07:30–10:30 | B2 | N02 | 012B2 | Caserne C1 |
| 03.07.27 | 07:30–10:30 | C1 | N01 | 012C1 | Caserne C1 |
| 03.07.27 | 07:30–10:30 | B1 | N01 | 012B1 | Caserne B1 |
| 09.08.27 | 18:30–21:30 | G1 | N03 | 012G1 | Caserne G1 |
| 16.08.27 | 18:30–21:30 | G1 | N02 | 012G1 | Caserne G1 |
| 23.08.27 | 18:30–21:30 | G1 | N01 | 012G1 | Caserne G1 |
| 31.08.27 | 18:30–21:30 | G1 | N05 | 012G1 | Caserne G1 |
| 06.09.27 | 18:30–21:30 | G1 | N04 | 012G1 | Caserne G1 |

Anomalie conservée : **pas de Instr sct - VARIA B2 le 03.07.27**. Historique 2026 : deux tours B2 seulement. Pas d’invention.

---

## F. FEU

Même séparation. Recette navigateur : recherche `sct - FEU` (capture `04-feu.png`) — la recherche `FEU` seule remonte aussi « Sécurité feu ».

### Demi-section

| Date | Horaire | OI | Public | Stat.Com | Lieu |
|---|---|---|---|---|---|
| 21.08.27 | 07:30–10:30 | C1 | N03b | 012C1 | Caserne C1 |
| 21.08.27 | 07:30–10:30 | B1 | N03b | 012B1 | Caserne B1 |
| 21.08.27 | 07:30–10:30 | B2 | N03b | 012B2 | Caserne C1 |
| 28.08.27 | 07:30–10:30 | C1 | N02b | 012C1 | Caserne C1 |
| 28.08.27 | 07:30–10:30 | B1 | N02b | 012B1 | Caserne B1 |
| 28.08.27 | 07:30–10:30 | B2 | N02b | 012B2 | Caserne C1 |
| 04.09.27 | 07:30–10:30 | C1 | N01b | 012C1 | Caserne C1 |
| 04.09.27 | 07:30–10:30 | B1 | N01b | 012B1 | Caserne B1 |
| 04.09.27 | 07:30–10:30 | B2 | N01b | 012B2 | Caserne C1 |
| 11.09.27 | 07:30–10:30 | C1 | N03a | 012C1 | Caserne C1 |
| 11.09.27 | 07:30–10:30 | B1 | N03a | 012B1 | Caserne B1 |
| 11.09.27 | 07:30–10:30 | B2 | N03a | 012B2 | Caserne C1 |
| 18.09.27 | 07:30–10:30 | C1 | N02a | 012C1 | Caserne C1 |
| 18.09.27 | 07:30–10:30 | B1 | N02a | 012B1 | Caserne B1 |
| 18.09.27 | 07:30–10:30 | B2 | N02a | 012B2 | Caserne C1 |
| 25.09.27 | 07:30–10:30 | C1 | N01a | 012C1 | Caserne C1 |
| 25.09.27 | 07:30–10:30 | B1 | N01a | 012B1 | Caserne B1 |
| 25.09.27 | 07:30–10:30 | B2 | N01a | 012B2 | Caserne C1 |

### Section

| Date | Horaire | OI | Public | Stat.Com | Lieu |
|---|---|---|---|---|---|
| 30.10.27 | 07:30–10:30 | C1 | N02 | 012C1 | Caserne C1 |
| 30.10.27 | 07:30–10:30 | B1 | N02 | 012B1 | Caserne B1 |
| 30.10.27 | 07:30–10:30 | B2 | N02 | 012B2 | Caserne C1 |
| 06.11.27 | 07:30–10:30 | C1 | N01 | 012C1 | Caserne C1 |
| 06.11.27 | 07:30–10:30 | B1 | N01 | 012B1 | Caserne B1 |
| 06.11.27 | 07:30–10:30 | B2 | N01 | 012B2 | Caserne C1 |
| 13.11.27 | 07:30–10:30 | C1 | N03 | 012C1 | Caserne C1 |
| 13.11.27 | 07:30–10:30 | B1 | N03 | 012B1 | Caserne B1 |

Anomalie conservée : **pas de Instr sct - FEU B2 le 13.11.27**. Deux tours B2 historiques seulement.

---

## G. ABC

G1 uniquement. Stat.Com `0164F7`. Lieu Caserne G1. 10 demi-sct + 5 sct, dates distinctes. Capture `01-abc.png`.

| Date | Horaire | OI | Public | Stat.Com | Lieu |
|---|---|---|---|---|---|
| 24.04.27 | 07:30–10:30 | G1 | N03a | 0164F7 | Caserne G1 |
| 01.05.27 | 07:30–10:30 | G1 | N02a | 0164F7 | Caserne G1 |
| 08.05.27 | 07:30–10:30 | G1 | N01a | 0164F7 | Caserne G1 |
| 15.05.27 | 07:30–10:30 | G1 | N05b | 0164F7 | Caserne G1 |
| 22.05.27 | 07:30–10:30 | G1 | N04b | 0164F7 | Caserne G1 |
| 29.05.27 | 07:30–10:30 | G1 | N03b | 0164F7 | Caserne G1 |
| 31.05.27 | 18:30–21:30 | G1 | N03 | 0164F7 | Caserne G1 |
| 05.06.27 | 07:30–10:30 | G1 | N02b | 0164F7 | Caserne G1 |
| 07.06.27 | 18:30–21:30 | G1 | N02 | 0164F7 | Caserne G1 |
| 12.06.27 | 07:30–10:30 | G1 | N01b | 0164F7 | Caserne G1 |
| 14.06.27 | 18:30–21:30 | G1 | N01 | 0164F7 | Caserne G1 |
| 19.06.27 | 07:30–10:30 | G1 | N05a | 0164F7 | Caserne G1 |
| 21.06.27 | 18:30–21:30 | G1 | N05 | 0164F7 | Caserne G1 |
| 26.06.27 | 07:30–10:30 | G1 | N04a | 0164F7 | Caserne G1 |
| 28.06.27 | 18:30–21:30 | G1 | N04 | 0164F7 | Caserne G1 |

Pas d’instruction ABC C1/B1/B2 générée. Hors périmètre G1.

---

## H. PIONNIER

PASS conservé. Capture `02-pionnier.png`.

| Activité | OI | Dates | Public | Stat.Com | Lieu | Horaire |
|---|---|---|---|---|---|---|
| Introduction PIONNIER | G1 | inchangé | FOBA 2 | (FOBA) | Caserne G1 | inchangé |
| Instr demi-sct - PIONNIER | G1 | 10 dates distinctes | rotation demi-sct CTA | 0161F7 | Caserne G1 | 07:30–11:30 (4 h) |
| Instr sct - PIONNIER CSU-nvb | G1 | 08.11 / 15.11 / 22.11 / 29.11 / 06.12.27 | N01 N05 N04 N03 N02 | 0161F7 | Caserne G1 | 19:15–22:00 |

Aucune conduite « formation continue » n’est créée après PIONNIER.

Demi-sct PIONNIER : 11.09 N03a, 25.09 N01a, 02.10 N05b, 09.10 N04b, 16.10 N03b, 23.10 N02b, 30.10 N01b, 06.11 N05a, 13.11 N04a, 27.11 N02a.

---

## I. 12 conduites et leurs sources

Exactement 12. 3 G1 (KICK-OFF, ABC, VARIA) + 3 C1 + 3 B1 + 3 B2 (KICK-OFF, VARIA, FEU).

Chaque conduite : Stat.Com `0152F7`, publics `cond VL, cond PL` (`AUTO:3`, `AUTO:1`), durée 1 h, début = fin de la demi-section source, même jour, même lieu que la source.

Les images agenda 06/07 mars n’ont **pas** été utilisées comme preuve.

| OI | Type source | Date source | Horaire source | Public source | Stat.Com source | Lieu source | Date conduite | Horaire conduite | Lieu conduite | Résultat |
|----|-------------|-------------|----------------|---------------|-----------------|-------------|---------------|-------------------|----------------|----------|
| G1 | KICK-OFF | 06.02.27 | 07:30–10:30 | N04a | 012G1 | Caserne G1 | 06.02.27 | 10:30–11:30 | Caserne G1 | OK |
| G1 | ABC | 24.04.27 | 07:30–10:30 | N03a | 0164F7 | Caserne G1 | 24.04.27 | 10:30–11:30 | Caserne G1 | OK |
| G1 | VARIA | 03.07.27 | 07:30–10:30 | N03a | 012G1 | Caserne G1 | 03.07.27 | 10:30–11:30 | Caserne G1 | OK |
| C1 | KICK-OFF | 06.02.27 | 07:30–10:30 | N01b | 012C1 | Caserne C1 | 06.02.27 | 10:30–11:30 | Caserne C1 | OK |
| C1 | VARIA | 01.05.27 | 07:30–10:30 | N01b | 012C1 | Caserne C1 | 01.05.27 | 10:30–11:30 | Caserne C1 | OK |
| C1 | FEU | 21.08.27 | 07:30–10:30 | N03b | 012C1 | Caserne C1 | 21.08.27 | 10:30–11:30 | Caserne C1 | OK |
| B1 | KICK-OFF | 06.02.27 | 07:30–10:30 | N01b | 012B1 | Caserne B1 | 06.02.27 | 10:30–11:30 | Caserne B1 | OK |
| B1 | VARIA | 01.05.27 | 07:30–10:30 | N01b | 012B1 | Caserne B1 | 01.05.27 | 10:30–11:30 | Caserne B1 | OK |
| B1 | FEU | 21.08.27 | 07:30–10:30 | N03b | 012B1 | Caserne B1 | 21.08.27 | 10:30–11:30 | Caserne B1 | OK |
| B2 | KICK-OFF | 06.02.27 | 07:30–10:30 | N01b | 012B2 | Caserne C1 | 06.02.27 | 10:30–11:30 | Caserne C1 | OK |
| B2 | VARIA | 01.05.27 | 07:30–10:30 | N01b | 012B2 | Caserne C1 | 01.05.27 | 10:30–11:30 | Caserne C1 | OK |
| B2 | FEU | 21.08.27 | 07:30–10:30 | N03b | 012B2 | Caserne C1 | 21.08.27 | 10:30–11:30 | Caserne C1 | OK |

Source de chaque conduite : première instruction demi-section datée du thème requis pour l’OI, hors PIONNIER. Capture `05-conduites.png`.

---

## J. PR-ABC

Structure demandée livrée **sans dates inventées**.

Historique 2026 démontré :

- 21.04.2026 soir (T2, mardi)
- 10.06.2026 matin mercredi 08:00–11:00 (T2)
- 06.10.2026 soir (T4, mardi)

**Zéro date T1 2026.** Une seule date T4 2026. Recopier T2 en T1 ou décaler d’un an aurait inventé un calendrier.

Livré : 6 séances, domaine PR, public `JSP, PABC` (`JSP:1`, `PR:3`), Stat.Com `0164F7`, OI G1, lieu Caserne G1, date/horaire **À définir**.

| Série | Séance | Horaire proposé (non daté) | Statut |
|---|---|---|---|
| T1 | 1/3 | 18:30–21:30 | `MOA_PROPOSAL_NO_DEMONSTRATED_T1_T4_CALENDAR` |
| T1 | 2/3 | 08:00–11:00, mercredi | idem |
| T1 | 3/3 | 18:30–21:30 | idem |
| T4 | 1/3 | 18:30–21:30 | idem |
| T4 | 2/3 | 08:00–11:00, mercredi | idem |
| T4 | 3/3 | 18:30–21:30 | idem |

Note fiche T1 S1 : « Aucune date T1 2026 démontrée ; 2026 montre T2 (21.04 soir, 10.06 matin mercredi) et T4 (06.10 soir). Les dates civiles 2027 ne sont pas inventées. »

Captures : `07-pr-abc.png`, `07b-pr-abc-fiche-t1-s1.png`.

Hors confusion avec instructions ABC FOSPEC.

---

## K. UX État

Composant `scopeStateHtml` inchangé : carré 8×8 à gauche + texte.

Mesure navigateur (cellule col. 11) :

- swatch 8×8 px, `border-radius: 0`
- `display: inline-flex`, `white-space: nowrap`, pas de fond de capsule
- couleurs : vert `#2f9e5a`, rouge `#DE000A` (`Activité proposée` = `is-block`), jaune-orangé `#c98412`, bleu `#4f84d6`, gris `#8b949e`

Règle résiduelle `.scope-state-label span { white-space: normal }` **supprimée**. Colonne `.qv-programme-col-11` 9 %. Capture `08-etat-canonique.png` et colonnes État des captures VARIA / FEU / KICK-OFF (`Validé` vert).

Aucune autre convention UX (salles, ordre métier, recherche, vues tableau/mensuelle) n’a été refondue.

---

## L. Tests

Nouveau : `scripts/scope-qv-dps-oi-separation-and-conduite-closure-1-tests.js` — **12/12 PASS**.

Non-régression relancée :

| Suite | Résultat |
|---|---|
| QV-DPS-OI-SEPARATION-AND-CONDUITE-CLOSURE-1 | 12/12 |
| QV FINAL-DEVELOPMENT-1 | 30/30 |
| QV SECTION-ROTATION-CLOSURE-1 | 20/20 |
| QV HISTORY SECTIONS UX | 28/28 |
| QV-AGENDA-PROGRAMME-UX-FINAL-1 | 9/9 |
| QV BUSINESS CONSOLIDATION | 39/39 |
| QV REPAIR 2 | 11/11 |
| agenda annuel calendar markers repair | ok |

Le JSON source 2027 reste à 622. Overlay 671 = 622 + clones OI + conduites manquantes + séances PR-ABC.

---

## M. Captures navigateur

Répertoire : `docs/captures/qv-dps-oi-separation-and-conduite-closure-1/`

| # | Fichier | Contrôle |
|---|---|---|
| 1 | `01-abc.png` | ABC G1, dates distinctes, publics CTA, État |
| 2 | `02-pionnier.png` | PIONNIER G1 Caserne G1, rotation |
| 3 | `03-varia.png` | C1/B1/B2 séparés, Stat.Com et lieux propres, public CTA |
| 4 | `04-feu.png` | idem FEU, B2 lieu Caserne C1 / OI B2 / 012B2 |
| 5 | `05-conduites.png` | 12 lignes, 0152F7, cond VL/cond PL, 06.02 10:30–11:30 |
| 6 | `06-kickoff-06-02.png` | 4 Instr demi-sct KICK-OFF 07:30–10:30 |
| 7 | `07-pr-abc.png` | 6 Exercice PR-ABC, dates à définir, domaine PR, PABC |
| 7b | `07b-pr-abc-fiche-t1-s1.png` | Occurrence 1 session 1/3, note T1 sans date inventée |
| 8 | `08-etat-canonique.png` | carré 8×8 + texte, pas de badge |

Filtre au retour de fiche : Programme (recherche `PR-ABC`, 6 résultats) → fiche T1 S1 → **Retour au programme** : recherche `PR-ABC` toujours active, 6 résultats. Après navigation hash, la recherche `Instr demi-sct - ABC` est restée posée.

DnD / CTA non déplaçable : non rejoués visuellement dans cette passe ; tests FINAL-DEVELOPMENT-1 (cibles de dépôt, CTA `CTA_PERMANENCE`) toujours verts. Code DnD non modifié par ce lot.

---

## N. Anomalies restantes

1. **Instr sct VARIA B2** : 2/3 tours. Le 03.07.27 existe pour C1 et B1, pas pour B2, faute de ligne historique 2026.
2. **Instr sct FEU B2** : 2/3 tours. Le 13.11.27 existe pour C1 et B1, pas pour B2.
3. **Publics ABC** : dates identiques à la capture MOA, publics = cycle CTA (N03a le 24.04, pas N05a). Écart à assumer en recette MOA.
4. **PR-ABC** : structure T1/T4 × 3 séances livrée ; **aucune date civile 2027** faute de calendrier T1/T4 démontré. Proposition tracée, pas une fausse donnée historique.
5. **Bandeau KPI** « Réalisations 612 / Sessions 622 » : compteurs du fichier source. Le programme overlay affiche **671** séances. Pas une fusion OI ; écart de compteur source vs overlay.
6. **KICK-OFF publics** : vides dans le JSON source ; posés à la lecture par `qvApplyCtaSectionPublic` (N04a / N01b). Visibles dans le tableau. Dates, OI, lieux, Stat.Com inchangés.

Ces points sont masqués nulle part. Ils n’autorisent pas d’invention complémentaire dans ce lot.

---

## O. Verdict

Critères 1–11, 13, 15–18 démontrés (ABC rotation, PIONNIER, séparation VARIA/FEU, lieux B1/B2, publics CTA, 12 conduites sourcées, KICK-OFF 06.02, filtres, État, tests verts).

Critère 12 : structure T1/T4 respectée **et** impossibilité de dater explicitement démontrée (0 date T1 2026, 1 date T4 2026 qui n’est pas une série de 3).

Critère 14 : DnD non recassé dans le code ; preuve par tests, pas par un nouveau geste navigateur.

Les deux instructions de section B2 « manquantes » ne sont pas des fusions résiduelles : ce sont des tours 2026 absents.

**READY_FOR_MOA_RECIPE**

COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DÉPLOIEMENT : AUCUN
PRODUCTION : INCHANGÉE

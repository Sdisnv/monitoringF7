# QUO VADIS — règles métier canoniques

Référentiel versionné des règles explicitement validées par la MOA.
Aucune règle nouvelle n’est inventée ici : chaque identifiant pointe vers du code, un test, ou une décision MOA déjà établie.

Source de vérité CTA : `netlify/lib/_scope-cta-rules.js` (`instructionPublicForDate`).
Application programme 2027 : overlay de lecture dans `canonicalBusinessProgramme2027()`
(`netlify/lib/_scope-quo-vadis-service.js`) — rotation → PIONNIER → famille d’instructions → conduites → PR-ABC.
Le JSON canonique `netlify/lib/data/scope-qv-programme-2027.json` (622 séances) n’est pas patché.

Preuve de lot : `scripts/scope-qv-business-rules-canonicalization-and-final-closure-1-tests.js`.

---

## CTA

### QV-CTA-001 — Cycle CTA perpétuel interannuel
Le cycle ne redémarre pas au 1er janvier. Ancrage `2026-02-13`.
Implémentation : `ANCHOR_DATE`, `cycleIndex`, `assignmentsForFriday`.
Preuve : tests agenda UX final 1 ; `ctaParameters.reinitialisationAnnuelle === false`.

### QV-CTA-002 — Réserves exclues des permanences normales
G1 N06 et C1/B1/B2 N04 ne tournent pas dans le cycle ordinaire.
Implémentation : `G1_CYCLE` / `OTHER_CYCLE` ne les contiennent pas ; `isReserveHalfSection`.

### QV-CTA-003 — G1 = 5 sections / 10 demi-sections opérationnelles
N01–N05, a/b. `operationalHalfSections('G1')` longueur 10.

### QV-CTA-004 — C1 / B1 / B2 = 3 sections / 6 demi-sections chacun
N01–N03, a/b. Réserve N04 exclue. Total opérationnel 10+6+6+6 = **28** (une erreur MOA antérieure citait 27).

### QV-CTA-005 — Un seul moteur
`instructionPublicForDate` n’est pas dupliqué dans `scope-ui-logic.js`.
Preuve : test « le moteur CTA existant est reutilise ».

### QV-CTA-006 — Public d’instruction dérivé de la permanence du vendredi de référence
Section = 3 caractères `N0x`, demi-section = `N0xa`/`N0xb`. Exception PIONNIER section G1 : vendredi précédent (CSU-nvb).

---

## Instructions DPS

### QV-DPS-001 — Réalisation par OI lorsque Stat.Com / public / lieu diffèrent
C1, B1 et B2 ne sont jamais fusionnés en `OI = C1, B1, B2` pour une instruction de section ou demi-section.
Implémentation : `qvRotationBuckets` clé `date + horaire + OI` ; clones `QV27:OI:…`.

### QV-DPS-002 — B2 reste B2 même au lieu Caserne C1
OI B2, Stat.Com B2 (`012B2` pour FOCO), lieu `Caserne C1`. Le lieu ne détermine jamais le Stat.Com.
Implémentation : `qvDpsDefaultLieuCode('B2') === 'C1'` ; `qvRewriteDpsSiteToken`.

### QV-DPS-003 — Responsable = Chef section DPS
Famille : toute activité `Instr sct` / `Instr demi-sct` (ABC, VARIA, FEU, PIONNIER, KICK-OFF et équivalents).
Pas une liste d’IDs 2027. Les décisions humaines (`humanDecision`) ne sont pas écrasées.
Implémentation : `qvApplyDpsInstructionFamilyRules`.

### QV-DPS-004 — L’Excel 2026 n’écrase pas un public CTA déjà posé
`qvEnrichSectionPublicHistorical` ignore `DISTRIBUTED` et `CTA_PERMANENCE_CYCLE`.

### QV-DPS-005 — Dates de rotation = tours historiques démontrés, jamais inventées
Un tour sans source 2026 reste `MOA_REQUIRED`. Cardinalité B2 section VARIA/FEU : 2 tours historiques, pas 3.

---

## Conduite, formation continue

### QV-CONDUITE-001 — 3 conduites annuelles par demi-section opérationnelle
Remplace l’ancienne matrice 3 thèmes × 4 OI = 12 (lots FINAL-DEVELOPMENT / DPS-OI-SEPARATION).

### QV-CONDUITE-002 — Cible = demi-sections opérationnelles × 3
Calculée depuis `operationalHalfSections` (10+6+6+6=28) × 3 = **84**.
Pas un total magique. Une absence de 3 sources historiques 2026 n’est plus un veto :
QV-CONDUITE-008 programme les Instr demi-sct manquantes.

### QV-CONDUITE-008 — Compléter les Instr demi-sct par le cycle CTA
Si une demi-section opérationnelle a moins de 3 `Instr demi-sct` éligibles (hors PIONNIER),
le moteur pose les occurrences manquantes le samedi de permanence CTA, hors jours fériés
et hors dates déjà occupées. Thème : premier thème éligible non KICK-OFF encore absent
(ABC/VARIA pour G1, VARIA/FEU pour C1/B1/B2), sinon second tour du dernier thème.
Provenance `MOA_RULE_ANNUAL_PROGRAMMING`. Pas de hasard. Idempotent.

### QV-CONDUITE-003 — Adossée à une Instr demi-sct réelle
Début de la conduite = fin de la source. Même jour. Même OI. Même lieu opérationnel.

### QV-CONDUITE-004 — Durée maximale 1 heure
`QV_CONDUITE_MAX_MINUTES = 60`. Stat.Com `0152F7`. Domaine AUTO.

### QV-CONDUITE-005 — Public = `<demi-section source>, cond PL, cond VL`
Ordre d’affichage obligatoire. Codes `N0xa`, `AUTO:1`, `AUTO:3`.
La demi-section est lue sur la source, pas recalculée indépendamment si la source est déjà valable.

### QV-CONDUITE-006 — Pas de conduite après PIONNIER
Les `Instr demi-sct - PIONNIER` sont exclues des sources.

### QV-CONDUITE-007 — Répartition annuelle déterministe
Pour chaque OI + demi-section :

1. collecter les Instr demi-sct éligibles, ordre chronologique ;
2. exclure PIONNIER et les réserves ;
3. si n ≤ 3, prendre toutes ; sinon indices `round(i × (n−1) / 2)` pour i = 0,1,2 (premier, milieu, dernier) ;
4. collision d’indice → prochain index libre ;
5. pas de hasard. Mêmes sources ⇒ même résultat.

Implémentation : `qvSelectSpreadIndices`, `qvDeriveConduiteContinue`.

---

## PR-ABC

### QV-PRABC-001 — 3 séances T1 + 3 séances T4
Domaine PR, public PABC (`PR:3`). Distinct des instructions ABC FOSPEC.

### QV-PRABC-002 — Séance 2 idéalement mercredi matin
Si aucune date T1/T4 2026 n’est démontrable : structure conservée, dates à arbitrer, statut `MOA_PROPOSAL_NO_DEMONSTRATED_T1_T4_CALENDAR`. Historique 2026 : T2 (21.04 soir, 10.06 matin mercredi) et T4 (06.10 soir). Zéro date T1.

---

## PIONNIER

### QV-PIONNIER-001 — Introduction PIONNIER = FOBA 2
### QV-PIONNIER-002 — Demi-section = 4 heures (07:30–11:30)
### QV-PIONNIER-003 — CSU-nvb = 19:15–22:00
G1, Caserne G1. Implémentation : `qvApplyPionnierRules`.

---

## UX (gel)

### QV-UI-001 — État = carré 8×8 + texte, sans badge ni capsule
Couleurs : `#2f9e5a`, `#DE000A`, `#c98412`, `#4f84d6`, `#8b949e`.

### QV-UI-002 — Actions textuelles non soulignées
`.qv-programme-action { text-decoration: none !important }`.

### QV-UI-003 — Filtres / recherche conservés au retour de fiche
`quoVadisProgrammeContextActive`.

### QV-UI-004 — Permanence CTA non déplaçable
`qvProgrammeDragLock({ definitionId: 'CTA-PERMANENCE' }) === 'CTA_PERMANENCE'`.

---

## Codes métier

### QV-CODE-001 — Code métier = STAT.COM.xxx lorsque l’activité a un Stat.Com
### QV-CODE-002 — Séquence xxx stable et indépendante par Stat.Com
Les conduites ajoutées reçoivent le prochain serial `0152F7` libre ; les lignes source conservent leur code.
### QV-CODE-003 — Pas d’identifiant technique visible en remplacement du code métier
Affichage programme : `qvProgrammeEventCodeLabel`.

---

## Décisions humaines et idempotence

Une occurrence `metadata.humanDecision` / `preserveDecision` n’est pas réalignée par la rotation ni par QV-DPS-003.
Les overlays rotation / conduite / PR-ABC sont idempotents au second passage.
Le JSON 2027 source reste à 622 séances.

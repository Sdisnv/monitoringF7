# QUO VADIS — règles métier canoniques

Référentiel versionné des règles explicitement validées par la MOA.
Aucune règle nouvelle n’est inventée ici : chaque identifiant pointe vers du code, un test, ou une décision MOA déjà établie.

Source de vérité CTA : `netlify/lib/_scope-cta-rules.js` (`instructionPublicForDate`).
Application programme 2027 : overlay de lecture dans `canonicalBusinessProgramme2027()`
(`netlify/lib/_scope-quo-vadis-service.js`) — rotation → PIONNIER → famille d’instructions →
périodicité pluriannuelle → matérialisation historique → conduites DPS → conduite DAP → PR-ABC.
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

### QV-DPS-006 — Saison d’instruction bornée par l’historique
Aucune instruction de section ou de demi-section en janvier, ni entre Noël et la fin d’année.
Borne basse : premier samedi de février (06.02.2027, confirmé par la ligne 2027 du classeur).
Borne haute : dernière instruction 2026 projetée (07.12.2026 + 364 = 06.12.2027), plafonnée au 23 décembre.
Preuve 2026 : 62 dates d’instruction du 14.02.2026 au 07.12.2026, zéro en janvier.
Implémentation : `qvInstructionSeasonBounds`, appliquée aux candidats de QV-CONDUITE-008.

---

## Projection annuelle

### QV-PROJ-001 — Chaque occurrence reprend sa propre réalisation 2026
La génération comptait une occurrence par ligne source 2026 mais écrasait chacune avec l’union
des OI et la date de la première ligne. Chaque occurrence est désormais rattachée à une
réalisation historique distincte : date projetée, horaire, OI, lieu, responsable.

* Une ligne 2026 multi-OI reste **un** événement portant tous ses OI (cas A).
* K réalisations 2026 distinctes restent **K** occurrences propres (cas B) — jamais fusionnées.
* Deux sources qui tombent sur le même créneau 2027 ne font qu’un événement ; une ligne déjà
  datée en 2027 prime sur une ligne 2026 projetée.
* Si aucune ligne ne porte d’OI mais que les lieux désignent plusieurs sites, l’OI est démontré
  par le lieu.
* Aucune occurrence n’est supprimée : les réalisations perdues par la génération sont recréées.
* Les définitions multi-session, les instructions DPS (QV-DPS-001/005), les conduites et PR-ABC
  relèvent de leur règle propre et ne sont pas traitées ici.
* Sans source 2026, l’occurrence reste à définir. Aucune date n’est inventée.

Implémentation : `qvHistoricalOccurrenceBuckets`, `qvMaterializeHistoricalOccurrences`.

### QV-PERIOD-001 — Périodicité pluriannuelle
La Revue quinquennale suit la législature : une édition par cycle de 5 ans, préparation incluse.
Édition de référence 2026 ⇒ prochaine échéance **2031**, donc aucune occurrence en 2027.
« Non reconduite en 2027 » ne veut pas dire « activité supprimée » : la périodicité reste portée
par le moteur (`qvPeriodicActivityDecision`) et l’activité reste au catalogue annuel.

---

## Conduite, formation continue

### QV-CONDUITE-001 — 2 conduites annuelles par demi-section opérationnelle
Remplace l’ancienne matrice 3 thèmes × 4 OI = 12 (lots FINAL-DEVELOPMENT / DPS-OI-SEPARATION).

### QV-CONDUITE-002 — Cible = demi-sections opérationnelles × 2
Calculée depuis `operationalHalfSections` (10+6+6+6=28) × 2 = **56**.
Le classeur 2026 démontre deux conduites d'une heure par demi-section, pas trois. Une absence de 2 sources historiques 2026 n’est plus un veto :
QV-CONDUITE-008 programme les Instr demi-sct manquantes.

### QV-CONDUITE-008 — Compléter les Instr demi-sct par le cycle CTA
Si une demi-section opérationnelle a moins de 2 `Instr demi-sct` éligibles (hors PIONNIER),
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
3. si n ≤ 2, prendre toutes ; sinon indices `round(i × (n−1))` pour i = 0,1 (premier et dernier) ;
4. collision d’indice → prochain index libre ;
5. pas de hasard. Mêmes sources ⇒ même résultat.

Implémentation : `qvSelectSpreadIndices`, `qvDeriveConduiteContinue`.

### QV-DAP-001 — Conduite / formation continue DAP
Activité propre au DAP : Stat.Com `01522F7`, sections Y1–Y4, 18:30–21:30, local de section,
responsable `Of auto`, public `cond VL`. Présente dans l’historique (17 réalisations :
Y1 ×5, Y2 ×4, Y3 ×4, Y4 ×4) mais absente de la génération 2027 ; la décision MOA en retient
quatre par section, entre mars et mai (16 soirées). Chaque soirée comprend quatre places
chevauchées ; chacune prévoit 30 minutes de conduite et 30 minutes de connaissance du véhicule.
Elle ne copie jamais les occurrences DPS (`0152F7`). Implémentation : `qvApplyDapConduite`.

### QV-DAP-002 — Quatre exercices DAP
La formation groupée remplace un exercice de la série 2026 à cinq exercices. Le Programme 2027
conserve les exercices 1 à 4 par section et les quatre cours de cadres correspondants ; le dernier
exercice reprend les créneaux vendredi/samedi de l'exercice 5 historique, sans renuméroter les
codes métier. Les lignes 5 générées restent identifiables mais hors programme, sauf décision humaine
ou publication à préserver. La date de la formation groupée n'est pas démontrée par 2026.

### QV-FOBA-001 / QV-PR-001 — Thèmes propres aux occurrences
Les dix exercices FOBA 1/2 et les trois FOBA 3 sont conservés. Les trois FOBA 3 reprennent leurs
dates et thèmes `Consolidation 1` à `Consolidation 3` des lignes Excel exactes. Les séances PR 1.1
à 1.6 sont datées depuis 2026 ; aucune séance PR 1.x de fin 2026 n'a été constatée dans le classeur.
Les thèmes restent distincts de l'activité et de l'occurrence, et sont modifiables par occurrence
dans la fiche Programme.

---

## PR-ABC

### QV-PRABC-001 — *Abrogée* : 3 séances T1 + 3 séances T4
Invalidée par la recette MOA 2027 : cette structure dédoublait chaque séance (6 lignes pour
3 séances réelles). Remplacée par QV-PRABC-003.

### QV-PRABC-002 — Séance en matinée du mercredi
Conservée comme caractéristique de la 2ᵉ séance, démontrée par 2026 (10.06, mercredi 08:00–11:00).

### QV-PRABC-003 — Exercice PR-ABC = exactement 3 séances
Preuve 2026 : 21.04 mardi 18:30–21:30 (T2), 10.06 mercredi 08:00–11:00 (T2), 06.10 mardi 18:30–21:30 (T4).
Projection 2027 : 20.04, 09.06, 05.10. Une séance = une ligne, jamais deux.
Public **PABC** (`PR:3`) uniquement : JSP n’est jamais public d’une activité PR-ABC.
Responsable **Chef PR** (`C PR`), conformément à 2026 et au reste du domaine PR.
Implémentation : `qvApplyPrAbcStructure`, `qvPrAbcSessionPlan`.

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

### QV-UI-005 — Filtre Domaine = taxonomie métier canonique
Le filtre était construit depuis les seules valeurs observées : FOCO n’y apparaissait jamais,
car FOCO est la **famille** des activités DPS/DAP/JSP (`qvProgrammeFamily`) et n’est porté comme
domaine par aucune séance. Le filtre expose désormais `SCOPE_DOMAIN_ORDER` complété des valeurs
observées, dans l’ordre métier global. Jamais de tri alphabétique.

Exposer l’option ne suffisait pas : choisir FOCO ne rendait aucune ligne. `qvProgrammeDomainMatches`
résout donc FOCO sur l’axe famille — la colonne affichée est bien `Domaine famille` — et rend les
485 séances DPS, DAP et JSP de l’overlay 2027. Les autres valeurs sont de vrais domaines et gardent
une correspondance stricte sur `row.domain` : les deux axes ne sont pas confondus.

### QV-UI-006 — Agenda d’une année passée listé sans mois dans l’URL
La liste d’événements était conditionnée à `?mois=` : l’agenda 2026 s’ouvrait sans aucun
événement listé alors que l’année en compte 894. À défaut de mois demandé, le premier mois
porteur d’événements est affiché, le total annuel est indiqué et une navigation mensuelle
chiffrée reste disponible. Implémentation : `qvAgendaReference`.

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

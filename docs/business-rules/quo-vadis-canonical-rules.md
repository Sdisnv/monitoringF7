# QUO VADIS — règles métier canoniques

Référentiel versionné des règles explicitement validées par la MOA.
Aucune règle nouvelle n’est inventée ici : chaque identifiant pointe vers du code, un test, ou une décision MOA déjà établie.

Source de vérité CTA : `netlify/lib/_scope-cta-rules.js` (`instructionPublicForDate`).
Application programme 2027 : overlay de lecture dans `canonicalBusinessProgramme2027()`
(`netlify/lib/_scope-quo-vadis-service.js`) — rotation → PIONNIER → contrôle CTA N/N−1 → famille d’instructions →
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
Section = 3 caractères `N0x`, demi-section = `N0xa`/`N0xb`. Le public PIONNIER initial est projeté depuis le vendredi de référence historique, puis son créneau est recherché hors astreinte N/N−1.

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

### QV-DPS-005 — Rotation historique des activités hors couverture d'instruction
Les réalisations 2026 démontrent les tours historiques des activités ordinaires ; un tour sans source reste `MOA_REQUIRED`. Les instructions de section et demi-section suivent désormais la règle de couverture spécifique QV-DPS-COVERAGE-001 : les deux sections B2 VARIA/FEU observées en 2026 ne limitent plus leur couverture 2027 à deux.

### QV-DPS-006 — Saison d’instruction bornée par l’historique
Aucune instruction de section ou de demi-section en janvier, ni entre Noël et la fin d’année.
Borne basse : premier samedi de février (06.02.2027, confirmé par la ligne 2027 du classeur).
Borne haute : dernière instruction 2026 projetée (07.12.2026 + 364 = 06.12.2027), plafonnée au 23 décembre.
Preuve 2026 : 62 dates d’instruction du 14.02.2026 au 07.12.2026, zéro en janvier.
Implémentation : `qvInstructionSeasonBounds` pour les propositions historiques ; PIONNIER peut rester jusqu'au 23 décembre si le CTA l'exige.

### QV-DPS-ANNUAL-001 — Structure et ordre versionnés
`annualDpsInstructionVersions` définit par année d'effet les sections actives et l'ordre des thèmes. Pour les seules instructions de section et demi-section, la cardinalité est calculée sur ces sections actives. À partir de 2028, les profils horaires et la cadence proviennent directement des lignes 2026 ; 2027 n'est pas la source de l'année suivante. La projection conserve les écarts exacts entre séances d'un thème, y compris les années bissextiles. Le CTA existant attribue les publics sans remise à zéro annuelle.

### QV-DPS-COVERAGE-001 — Couverture complète de chaque thème d'instruction
Pour chaque thème prévu sur un site, produire une instruction par demi-section active et une par section active. Une séance de section Nxx suit ses propres Nxxa et Nxxb ; elle peut s'entrelacer avec les autres demi-sections du même thème, conformément au rythme 2026 confirmé par la MOA. Le thème suivant ne commence qu'après la dernière séance du précédent sur ce site. Une réserve n'est jamais créée. Les quatre KICK-OFF explicites du 06.02.2027 et toute décision humaine sont préservés ; le générateur ajoute seulement les publics manquants. Cette cardinalité ne s'applique ni aux conduites (deux par demi-section active), ni aux autres activités QUO VADIS.

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

### QV-CONDUITE-001 — 2 conduites annuelles par demi-section DPS active
Chaque conduite est adossée à une instruction réelle de sa demi-section ; la demi-section reste affichée dans son public. La décision MOA du 08.10.2026 maintient les 56 conduites du candidat 2027, sans réduire la couverture à deux par site.

### QV-CONDUITE-002 — Cible = demi-sections opérationnelles actives × 2
G1 : dix demi-sections × deux = 20 ; C1, B1 et B2 : six demi-sections × deux = 12 par site. Total DPS 2027 : **56**. Les 53 conduites constatées en 2026 sont la preuve historique, pas une obligation de recopier leurs dates.

### QV-CONDUITE-008 — Désactivée
L'ancienne fabrication d'instructions pour atteindre un quota est abandonnée. Les 56 conduites 2027 sont adossées aux instructions réelles ; aucune instruction n'est créée pour supporter artificiellement une conduite.

### QV-CONDUITE-003 — Adossée à une Instr demi-sct réelle
Début de la conduite = fin de la source. Même jour. Même OI. Même lieu opérationnel.

### QV-CONDUITE-004 — Durée maximale 1 heure
`QV_CONDUITE_MAX_MINUTES = 60`. La fiche porte 60 minutes de conduite pure par conducteur concerné, sans créer d'affectation individuelle avant la validation globale. Stat.Com `0152F7`. Domaine AUTO.

### QV-CONDUITE-005 — Public = `<demi-section source>, cond PL, cond VL`
Ordre d’affichage obligatoire. Codes `N0xa`, `AUTO:1`, `AUTO:3`.
La demi-section est lue sur la source, pas recalculée indépendamment si la source est déjà valable.

### QV-CONDUITE-006 — Pas de conduite après PIONNIER
Les `Instr demi-sct - PIONNIER` sont exclues des sources.

### QV-CONDUITE-007 — Répartition annuelle déterministe
Pour chaque demi-section active, sélectionner la première et la dernière instruction réelle admissible avant PIONNIER, sans créer de séance source. Conserver les repositionnements G1 décidés par la MOA ainsi que les conduites FEU B1/B2/C1 laissées en contrôle local ; ne pas les déplacer automatiquement. Cette sélection algorithmique n'invente pas de périodicité métier.

Implémentation : `qvDeriveConduiteContinue`.

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
Les trois lignes 2026 (241, 391, 711) ne désignent aucun OI : la projection non protégée
ne doit pas hériter de `G1` par défaut. Un OI fixé par décision humaine ou publication reste préservé.
Responsable **Chef PR** (`C PR`), conformément à 2026 et au reste du domaine PR.
Implémentation : `qvApplyPrAbcStructure`, `qvPrAbcSessionPlan`.

---

## PIONNIER

### QV-PIONNIER-001 — Introduction PIONNIER = FOBA 2
### QV-PIONNIER-002 — Demi-section = 4 heures (07:30–11:30)
### QV-PIONNIER-003 — CSU-nvb = 19:15–22:00
G1, Caserne G1. Implémentation : `qvApplyPionnierRules`.

### QV-PIONNIER-004 — Hors astreinte N et N−1
`qvSchedulePionnierOffDuty` recherche le premier créneau hebdomadaire compatible avec le CTA, les demi-sections préalables de la section et la période de septembre à décembre. Identifiants et décisions humaines sont préservés ; aucun créneau sûr donne `MOA_REQUIRED`.

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

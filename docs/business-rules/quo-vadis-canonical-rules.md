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
Activité propre au DAP : Stat.Com `01522F7`, sections Y1–Y4, 18:30 - 21:30, local de section,
responsable `Of auto`, public `cond VL`. Présente dans l’historique (17 réalisations :
Y1 ×5, Y2 ×4, Y3 ×4, Y4 ×4) mais absente de la génération 2027 ; la décision MOA en retient
quatre par section, entre mars et mai (16 soirées). Chaque soirée comprend quatre places
chevauchées ; chacune prévoit 30 minutes de conduite et 30 minutes de connaissance du véhicule.
Elle ne copie jamais les occurrences DPS (`0152F7`). Implémentation : `qvApplyDapConduite`.

Complément MOA du 15.10.2026 : quatre places par soirée, chacune avec une heure de présence,
30 minutes de conduite et 30 minutes de connaissance véhicule. Chevauchements imposés :

| Place | Présence | Conduite | Connaissance véhicule |
| --- | --- | --- | --- |
| 1 | 18:30 - 19:30 | 18:30 - 19:00 | 19:00 - 19:30 |
| 2 | 19:00 - 20:00 | 19:30 - 20:00 | 19:00 - 19:30 |
| 3 | 20:00 - 21:00 | 20:00 - 20:30 | 20:30 - 21:00 |
| 4 | 20:30 - 21:30 | 21:00 - 21:30 | 20:30 - 21:00 |

Tous les affichages de ces créneaux utilisent exclusivement `HH:MM - HH:MM` : trait d'union ASCII
et exactement une espace de chaque côté. Les valeurs temporelles persistantes ne changent pas pour
la typographie. La source commune `qvDapConduiteSlots` est réutilisée pour Y1 à Y4 et les restitutions
annuelles reconduites démontrées par type Conduite, Stat.Com `01522F7` et OI DAP qualifié unique.
Aucune nouvelle programmation, date, plage globale, affectation ou présence n'est déduite de ce tableau.

### QV-DAP-002 — Quatre exercices DAP
La formation groupée remplace un exercice de la série 2026 à cinq exercices. Le Programme 2027
conserve les exercices 1 à 4 par section et les quatre cours de cadres correspondants ; le dernier
exercice reprend les créneaux vendredi/samedi de l'exercice 5 historique, sans renuméroter les
codes métier. Les lignes 5 générées restent identifiables mais hors programme, sauf décision humaine
ou publication à préserver. Le classeur QUO VADIS 2026 ne démontre pas la formation groupée DAP.
Complément du 13.10 : les événements/imports 2026 existants démontrent les séances 1.1 et 1.2,
les 23.04 et 07.05.2026, Stat.Com d'import `0130F7`, public historique générique `DAP/GEN`.
Ce public est conservé comme description `DAP`, sans correspondance officielle de fonction inventée.
La reconduction existante de 52 semaines donne uniquement des propositions au 22.04 et 06.05.2027 ;
la seconde est en conflit avec l'Ascension. Aucun déplacement ni horaire n'est inventé.
Deux séances d'une même occurrence, OI DAP Y1–Y4, restent à positionner/confirmer ; thèmes,
horaires et responsable non démontrés. Les programmations manuelles identifiées sont réutilisées,
jamais remplacées par ces propositions. Les six formations DPS restent distinctes et inchangées.

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
Les trois lignes 2026 (241, 391, 711) ne désignent aucun OI. Cette absence historique reste conservée dans la source.
Le complément MOA PR #12 du 12.10.2026 impose désormais **DPS G1 uniquement** pour les propositions PR-ABC / PABC.
Une décision humaine ou publication divergente n'est pas écrasée : elle est signalée par le contrôle annuel pour révision ciblée.
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
La cellule État du tableau du Programme annuel est alignée verticalement en haut ; le carré et le libellé sont conservés.

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

## Décisions MOA du 10.10.2026

### QV-SAVE-001 — Trois actions distinctes
Enregistrer conserve les décisions et l'état de planification lorsqu'aucun changement d'état explicite n'est demandé. Le complément MOA PR #12 du 12.10.2026 impose d'enregistrer l'état explicitement sélectionné, dans les deux sens, indépendamment de la validation métier. Enregistrer et valider valide sans planification implicite.
Enregistrer et planifier valide et place l'occurrence dans l'état `PLANIFIE`, avec date et horaires requis.
Ces actions ne créent pas d'événement opérationnel : cette création reste soumise à la validation complète du programme annuel.
Une erreur doit conserver la saisie sans annoncer un succès ni laisser une écriture partielle.
Implémentation : `updateProgrammePreparation` et fiche Programme commune. Preuve : recette MOA ciblée du 10.10.2026.

### QV-RESP-001 — Responsables référencés et descriptifs
Sélection multiple depuis le référentiel existant des fonctions et saisie libre d'une personne ou d'une fonction.
`responsibleSelections` distingue `REFERENCE` (code existant) et `FREE` (libellé exact).
Une valeur libre n'est pas transformée en personne, en NIP ou en affectation ; les valeurs historiques restent conservées.
Le champ scalaire existant reste compatible, les sélections complètes sont conservées dans les métadonnées.

### QV-PUBLIC-001 — Public libre uniquement descriptif
Les publics référencés restent dans `publicCodes` et `cible_codes` ; eux seuls peuvent contribuer aux mécanismes existants de population.
Les libellés `publicFreeLabels` peuvent être combinés avec ces codes mais ne deviennent ni public calculé, qualification,
spécialisation, affectation, obligation individuelle ou contribution aux statistiques de participation.
Aucun NIP fictif et aucune correspondance implicite avec le personnel ne sont créés.

### QV-ECA-001 — Concours confirmé
Association confirmée par la MOA le 10.10.2026 : `EXERCI / CONCOUR / Concours`.
`CONCOUR` compte sept caractères, sans S final ; `CONCOU` dans la capture était tronqué.
Les 60 associations précédentes restent identiques ; le registre fourni compte 61 associations, dont JSP Y3 historique uniquement.
Cette décision ne renumérote aucune occurrence et ne modifie aucun événement historique.

## Décisions MOA du 12.10.2026

### QV-TITLE-001 — Intitulé exact de l'occurrence
La fiche reprend le même intitulé que le Programme, suffixe de séance compris. Une décision humaine de libellé ou de thème prime sur la présentation générique du type. Aucune occurrence n'est renumérotée.

### QV-RESP-002 — Références inclusives et état par défaut
Les nouveaux choix officiels sont exactement `PrésidentE Codir` et `PrésidentE CI`, avec leurs codes historiques stables. Les libellés enregistrés restent conservés. Les fonctions sont regroupées par domaine puis triées alphabétiquement ; `À affecter` n'est jamais un acteur sélectionné ou exporté.

### QV-PUBLIC-002 — Public permanent descriptif
`CMDT:CODIR / Membres du Codir` est sélectionnable dans le référentiel permanent du Programme, groupe Commandement. Cette déclaration ne crée aucune population nominative : aucune personne, aucun NIP, aucune affectation ni obligation individuelle. Elle reste séparée des publics calculés à la publication, dans `descriptivePublics`. Les valeurs libres ne sont pas promues automatiquement.

### QV-OI-001 — Sélection globale qualifiée
Les groupes DPS (G1, C1, B1, B2), DAP (Y1–Y4) et JSP (G1, C1, B1) se sélectionnent ou se retirent indépendamment. L'état partiel est visible. Les codes qualifiés par domaine restent distincts et persistants.

### QV-ECA-002 — EXEPRO et défaut EXERCI non destructif
`EXEPRO` remplace `EXERPO` dans les choix actifs ; l'ancien code reste lisible et compatible historiquement. Aucune association Stat.Com n'est inventée. Le défaut 2027 `EXERCI` concerne uniquement le champ activité ECAwin des occurrences dont la correspondance officielle est démontrée. Une qualification explicite reste préservée, même vide ; les autres activités et cas incertains restent non forcés et signalés. Tous les Stat.Com, codes SCOPE, identifiants et décisions protégées restent identiques. Un Stat.Com enregistré hors liste reste conservé et l'incompatibilité est signalée, jamais corrigée automatiquement.

### QV-PART-001 — Évaluation individuelle et reconduction
`participationEvaluation` est un booléen individuel, activé par défaut pour toutes les occurrences jusqu'en 2027. Une décision individuelle prévaut et est reconduite. Le défaut des types futurs se configure dans le catalogue annuel existant, séparément du suivi nominatif et de ses règles de population. Désactiver l'évaluation filtre le suivi et les taux, sans supprimer le Programme, l'Agenda, les présences ni les obligations historiques. Aucun événement opérationnel n'est créé par la préparation ; la validation annuelle globale reste nécessaire.

## Complément MOA PR #12 — 12.10.2026

### QV-PAPR-001 — Sept modules distincts et prérequis annuel bloquant
Le cursus PAPR est obligatoire dans le Programme 2027. Le classeur QUO VADIS 2026 fournit sept modules distincts :

| Intitulé | Thème | Ligne source |
| --- | --- | --- |
| Cursus PAPR - module 1 | Petzi découvre l'APR | 899, annexe 2027 du classeur |
| Cursus PAPR - module 2 | Matériel PR | 10 |
| Cursus PAPR - module 3 | AO Simulateur | 373 |
| Cursus PAPR - module 4 | Surveillance PR | 687 |
| Cursus PAPR - module 5 | R&S grand volume | 803 |
| Cursus PAPR - module 6 | Cobra | 826 |
| Cursus PAPR - module 7 | Engagement pratique | 845 |

OI obligatoires : `DPS:G1`, `DPS:C1`, `DPS:B1`, `DPS:B2`. Responsable `C PR`. Publics `PR:CAND-PAPR / Candidats PAPR` et `PR:FORMATEUR-PR / Formateur PR`, sans personne ni NIP synthétique.
Le module 1 conserve sa date explicite source du 02.02.2027. Les dates 2026 des modules 2 à 7 ne sont pas des décisions 2027 : la finalisation MOA autorise maintenant leur projection automatique selon QV-PAPR-002, avec identification de la proposition et conservation des décisions humaines.
La validation annuelle `VALIDE` est bloquée si un module manque, est dupliqué, n'a pas son thème, ses références obligatoires ou ses horaires confirmés. Les modules 1 et 2 doivent se terminer strictement avant le début du premier Exercice PR 1.1. Une publication ou décision divergente est signalée, jamais réalignée silencieusement.
Les modules rétablis utilisent le Programme et le cursus existants, pas un module applicatif parallèle. Une seconde lecture ne les duplique pas. Les thèmes décidés sont enregistrés dans le même instantané de reconduction que les autres champs métier.

### QV-PR-OI-002 — Exercices PR et exception PR-ABC
Les propositions d'exercices PR classiques portent les quatre OI DPS qualifiés. PR-ABC conserve uniquement le public PABC (`PR:3`) et `DPS:G1`. Les identifiants, suffixes, dates, Stat.Com et codes d'occurrence existants restent inchangés. Les décisions humaines divergentes restent accessibles et bloquent la validation annuelle tant qu'elles ne sont pas arbitrées.

### QV-ECA-003 — Référence SQL Formations EXTRAS
`EXERCI / 0180F7 / Formations EXTRAS` est confirmé par les captures ECAwin officielles. Le registre officiel contenait déjà l'association ; le référentiel initial SQL ne la contenait pas. Le code est ajouté au référentiel initial et une migration ciblée, transactionnelle et idempotente, rétablit la référence manquante.
Les éventuelles suspensions et périodes d'une référence déjà présente restent conservées. La liste EXERCI utilise le référentiel SQL, sans réécriture d'occurrence, de Stat.Com ou de code SCOPE.

### QV-WORKFLOW-002 — Retrait et révision ciblée d'une publication
Retirer une validation annuelle ou individuelle exige un motif non vide. L'auteur, le motif, les états et champs antérieurs sont tracés dans les métadonnées et le journal métier existant. Le retrait individuel ne sauvegarde pas les autres saisies non enregistrées de la fiche.
Le sous-ensemble éditorial sans effet sur la population est constitué de l'intitulé, du thème et des descriptions libres de public. Une telle correction publiée conserve la date de validation précédente et modifie le même événement, sous contrôle de version.
Les autres différences sont traitées conservativement comme majeures : motif obligatoire, révision `PENDING` de l'occurrence, événement publié inchangé. Une validation ciblée ultérieure applique la révision au même identifiant, par l'éditeur opérationnel et les moteurs de population existants. Les impacts sur les présences exigent leur confirmation ; les présences et exceptions historiques sont conservées. Une concurrence de version bloque l'écriture entière.
Un Stat.Com publié et son code SCOPE sont immuables dans ce parcours. Un changement de qualification ou de cursus ne réassocie pas implicitement une configuration de formation : la révision reste en attente et renvoie vers la configuration existante de l'événement. Les protections des événements réalisés ou annulés restent celles de l'éditeur opérationnel.
Ni retrait, ni préparation, ni ouverture de révision ne crée un événement opérationnel ou un doublon.

### QV-CYCLE-004 — Rapport de clôture 2027 proposé en février 2028
La fenêtre métier initiale était **février 2028**, avant ou après les relâches selon le calendrier scolaire. La finalisation MOA fixe désormais la proposition provisoire du **10.02.2028**, selon QV-CYCLE-005. Les décisions de date explicites restent prioritaires.
Les statistiques de participation restent strictement civiles : date réelle entre le 01.01 et le 31.12 inclus. Aucune extension du cycle métier n'étend cette fenêtre statistique. Le suivi Cours ECA reste dans la roadmap et les capacités existantes, sans module parallèle.

## Finalisation MOA PR #12 — 12.10.2026

### QV-PAPR-002 — Propositions automatiques 2027
Sept modules et sept thèmes distincts. OI `DPS:G1/C1/B1/B2`, responsable `C PR`, publics `Candidat PAPR` et `Formateur PR`, Stat.Com `011PR`, spécialisation `PAPR`, cursus de formation `PAPR`.
La proposition réutilise `qvProjectAnnualWeekday`, `pickProposalSlot`, les règles PR actives, les calendriers persistés et les horaires exacts des lignes 2026. Elle cherche un créneau admissible proche de la projection dans le mois, puis les autres créneaux admissibles si nécessaire ; elle conserve le jour historique ou le jour du cursus référencé, sans recopier arbitrairement une date.
Les modules 1/2 doivent se terminer avant le premier PR 1.1, identifié par son identité source stable. L'ordre des modules et les chevauchements connus de la fonction C PR sont contrôlés. Une impossibilité conserve les dates protégées et signale les contraintes en conflit ; elle ne fabrique pas une décision humaine.
La date source explicite du module 1 reste protégée. Les autres dates portent `PROPOSITION_AUTOMATIQUE`, restent modifiables dans la fiche existante et deviennent une décision conservée lorsque la MOA les enregistre. La référence PAPR est une caractéristique de formation, pas une qualification personnelle synthétisée.
Le tableau PAPR expose module, date, horaire, thème, source, contraintes et état. Les réserves de salles et disponibilité nominative ne sont pas réputées validées par le seul calendrier ; les mécanismes existants et décisions humaines restent prioritaires. Le rattachement préparatoire des modules 1/2 est désormais explicitement confirmé par QV-PAPR-004.

### QV-CYCLE-005 — Clôture provisoire 10.02.2028
Le `10.02.2028` clôture provisoirement le cycle métier 2027, statut exact **PROVISOIRE — À VALIDER PAR LE CODIR**. La proposition MOA est versionnée et enregistrée par migration transactionnelle idempotente dans les Dates annoncées existantes. Aucun événement opérationnel n'est créé.
Une déclaration antérieure est conservée, jamais remplacée silencieusement. Une modification de la proposition provisoire réutilise la même référence et conserve l'historique des dates. Le contrôle `Date validée par le Codir` est distinct de `Paramètres annuels définis` ; le caractère provisoire n'est pas une validation annuelle.
La borne provisoire permet de préparer les propositions A+1 avec les moteurs et rotations continus. La validation annuelle définitive reste bloquée tant que le Codir n'a pas confirmé la clôture. Les statistiques restent exclusivement du 01.01 au 31.12 selon les dates réelles des événements.

### QV-PAPR-003 — Publication antérieure du module 1
Le diagnostic compare les OI de l'événement publié, pas uniquement les valeurs préparatoires du Programme. La fiche permet de proposer les quatre OI DPS par la révision ciblée existante. L'enregistrement ouvre `PENDING`, ne change pas l'événement publié, son identifiant, son Stat.Com, son code ni ses présences. La confirmation de révision reste nécessaire avant synchronisation opérationnelle. Les autres activités restent éditables.

### QV-PUBLIC-004 — Singulier et Préposé APR
`PR:PREPOSE-APR / Préposé APR` est un public descriptif permanent. Il ne crée pas de personne, NIP, affectation, qualification ou obligation nominative et ne contribue pas automatiquement aux statistiques.
Les fonctions proposées sont au singulier. `PR:CAND-PAPR` devient visiblement `Candidat PAPR` sans changer de code ; les anciens codes de fonctions restent lisibles, avec une mention historique lorsqu'ils coexistent avec une référence descriptive permanente. Les descriptions libres et décisions enregistrées ne sont pas réécrites.

### QV-THEME-002 — Priorité au thème explicite
Un tableau `themes` explicite, y compris vide, est prioritaire sur le thème historique de projection. Phase I/Phase II ne réapparaissent pas après une correction ou un effacement explicite. Sans thème explicite, la source historique reste lisible ; aucun remplacement global non démontré des phases historiques n'est effectué.

### QV-SPEC-001 / QV-ECA-COURSES-002 — Acquis et roadmap
La spécialisation du Programme reste multisélection et persistante, avec les codes canoniques datés existants ; libellé `Cursus de formation`. PAPR/PABC et les autres références acquises sont conservés. Aucun backfill personnel ni qualification fictive n'est créé depuis QUO VADIS.
L'alignement exhaustif sur IndeX doit être appuyé par un référentiel IndeX versionné et une décision de correspondance ; le catalogue C3-B existant n'est pas présenté comme un export IndeX vérifié. Cette vérification reste dans la roadmap, sans refonte dans la livraison.
Le suivi spécialisé des Cours ECA reste requis : inscriptions/import cantonal, suivi individuel NIP, distinction cours suivis/obligations SDIS, contributions et agrégats par domaine/OI/période civile, exports. Les mécanismes SCOPE existants doivent être complétés ; aucun module parallèle n'est ouvert.

## ROADMAP V1 — décisions confirmées du 12.10.2026

### QV-PUBLIC-003 — Fonctions descriptives permanentes
Commandement : `CDT`, `C op`, `C log`, `C for`, `QM`. PR : `C PR`, `Formateur PR`. AUTO : `Of auto`, `Formateur C1/118`, `Moniteur conduite`.
Les libellés visibles restent ces codes ou descriptions exacts, triés dans leur domaine. Ces déclarations ne désignent aucune personne et ne créent aucun NIP, affectation ou obligation individuelle. Les anciens publics et saisies libres restent conservés.

### QV-RESP-003 — Correction du libellé C sct
Le code stable `C scrt` conserve son identité ; son libellé proposé devient `C sct`. Les occurrences et décisions enregistrées ne sont pas réécrites. La migration est transactionnelle et idempotente.

### QV-EXPORT-001 — Intitulé et thème dans les exports
Programme et Agenda : le PDF présente l'intitulé complet puis le thème à la ligne suivante. L'export Excel existant, CSV compatible, les présente dans la même cellule, avec le séparateur exact ` - `. Sans thème renseigné, aucun séparateur ni ligne vide supplémentaire. Les générateurs existants sont conservés et aucun titre, Stat.Com ou code source n'est modifié.

### QV-TYPE-001 / QV-TYPE-002 — Bibliothèque complémentaire
La fiche manuelle propose les types canoniques existants et leurs valeurs démontrées, avec des variantes DPS qualifiées par site. Les valeurs restent modifiables. Une divergence de sources laisse le champ à compléter ; aucune correspondance, date, personne ou obligation n'est inventée. Une création manuelle ne devient pas automatiquement une nouvelle référence ou un nouveau type. La bibliothèque ne remplace jamais la génération récurrente.

### QV-CYCLE-001 — Cycle délimité par les Rapports annuels
Le Rapport annuel clôture le cycle précédent. Le cycle suivant commence après ce jalon, selon ses paramètres confirmés. La date réelle du Rapport enregistré prime sur la date canonique ; aucune clôture inconnue n'est déduite du 31 décembre. Les références de Rapport, bornes et confirmation des paramètres utilisent les métadonnées du Programme et les dates annoncées existantes.
Une clôture explicitement renseignée par la MOA peut se situer en A+1. Le Programme acquis reste conservé, y compris les décisions historiques hors nouvelles bornes ; aucune occurrence validée n'est déplacée automatiquement. Les rotations CTA restent continues.

### QV-CYCLE-002 — A+1 et absence de doublons
Une occurrence manuelle peut appartenir au cycle A avec une date civile en A+1, sans génération préalable du Programme A+1, si les Rapports connus démontrent ce rattachement. Une occurrence correspondant au type, à la date, aux horaires, au Stat.Com et aux OI qualifiés est proposée sans écrasement ni nouvelle création. La génération suivante conserve les lignées humaines et ne recrée pas les occurrences déjà rattachées au cycle précédent.
Les prolongations automatiques réutilisent les moteurs existants et les sources démontrées ; les champs et cadences non démontrés restent signalés, sans date inventée. Aucun événement opérationnel n'est créé avant validation complète du Programme.

### QV-STAT-001 — Statistiques civiles indépendantes
Les statistiques utilisent exclusivement la date réelle de l'événement, du 01.01 au 31.12 inclus, indépendamment de son cycle métier. Une occurrence du cycle 2027 datée en janvier 2028 contribue uniquement à 2028. Les moteurs existants conservent NIP, OI, domaines, spécialisations, affectations datées, dispenses et rattrapages ; une occurrence non évaluée ne contribue pas au taux et ses présences restent conservées.

### QV-SCOPE-001 — Externe et non évalué sont distincts
Une activité externe hors suivi SCOPE reste au Programme et à l'Agenda mais n'est pas publiée comme événement opérationnel SCOPE et ne crée aucune obligation individuelle. Une activité SCOPE non évaluée reste publiable après validation annuelle, avec ses mécanismes de présence conservés ; seule sa contribution au taux est désactivée.

### QV-ECA-COURSES-001 — Suivi cantonal préservé
Le suivi individuel par NIP, les cours suivis, les agrégats et leurs exports doivent réutiliser les mécanismes de participation SCOPE. Les codes ECAwin `COURS` et Stat.Com cantonaux restent distincts des obligations internes SDIS. Aucun module parallèle n'est créé. Le rapport du jalon documente les éventuels contrats spécialisés restant à terminer.

## Finalisation corrective PR #12 — 12.10.2026

### QV-SAVE-002 — État explicite indépendant
Le serveur conserve `body.status` explicitement demandé par Enregistrer et le persiste dans `statut`, `metadata.planningStatus` et les champs préparatoires. La fiche n'envoie un état que si son sélecteur a été modifié ; sans modification, l'état antérieur reste conservé. Le Programme affiche cet état même si la validation métier antérieure est conservée.
Une modification de planification sur une publication est majeure : motif, révision ciblée en attente, version et journal existants. L'événement opérationnel, ses dates et ses présences ne sont pas supprimés par un retour préparatoire à « À planifier ». La validation antérieure reste traçable ; ce changement n'est pas un retrait implicite de validation d'une préparation non publiée.

### QV-PAPR-004 — Modules préparatoires du cursus 2027
Les modules 1/2 appartiennent au cursus PAPR 2027, même avant la borne du cycle enregistrée au 05.03.2027 sur le clone. Leur classification est `PREPARATORY_CURSUS`, avec année, cursus, module et règle explicites, conservés à l'enregistrement. Il ne s'agit ni d'un autre cycle ni d'un déplacement de la borne.
Dates conservées : 02.02, 16.02, 03.06, 29.09, 16.11, 30.11 et 11.12.2027. Les modules 1/2 se terminent avant PR 1.1 du 02.03.2027. L'exception est limitée aux deux modules preparatoires PAPR 2027, pas à toutes les activités hors cycle. Les rotations CTA et les statistiques civiles restent inchangées.

### QV-ECA-004 — Liste d'activités ECAwin
La fiche présente uniquement la liste déroulante des cinq activités principales, sans recherche supplémentaire. Les références `EXEPRO`, `EXERCI`, `CONCOUR`, les valeurs historiques et toutes les associations officielles restent intactes. Une sélection d'activité n'efface jamais un Stat.Com enregistré.

### QV-MANIFESTATION-001 / QV-CODE-004 — Interne non soldé sans Stat.Com
Solde (`sold`), évaluation (`participationEvaluation`) et demande d'export ECAwin (`ecawinExport`) sont trois décisions indépendantes, persistantes et reconductibles. Une activité interne non soldée reste publiable après le workflow annuel existant ; elle n'est pas assimilée à une activité externe hors SCOPE.
Sans Stat.Com, un nouveau code d'occurrence peut être attribué dans l'espace réservé `SCOPE-000001` par une séquence PostgreSQL indépendante. Il ne constitue jamais un Stat.Com, un NIP ou une association ECAwin. Le code est conservé à la réouverture et à la publication ; les contraintes d'unicité des événements et le mécanisme anti-doublons existant restent actifs. Un échec peut laisser un trou dans une séquence, jamais entraîner une renumérotation. Aucun code ni Stat.Com historique n'est remplacé. Le Stat.Com absent est `NON_APPLICABLE`, pas une correspondance fictive à compléter.
Les données internes de publication et les relations OI qualifiées réutilisent le magasin et le moteur de population datée existants. Aucune affectation individuelle ni événement opérationnel n'est créé lors de la préparation. Aucun fichier d'import ECAwin n'est inventé : le contrat spécifique des manifestations sans Stat.Com reste à démontrer avant livraison d'un tel export. La présence future dans les calendriers individuels reste portée par la roadmap existante, sans nouveau module.

### QV-MANIFESTATION-002 — Préremplissage dépendant des OI
Journée des familles et Noël des familles : propositions non soldées, export ECAwin activable ; l'évaluation 2027 reste cochée par défaut et désactivable. Pour les OI DPS qualifiées : Sapeur DPS, FOBA 1, FOBA 2. Pour les OI DAP qualifiées : Sapeur DAP, FOBA 1, FOBA 2. Un OI non qualifié n'est pas assimilé à un domaine.
Responsable proposé : `C sct`, identité historique `C scrt` conservée. Les nouvelles propositions utilisent le libellé corrigé ; aucune décision historique n'est réécrite. Le préremplissage s'arrête pour les champs modifiés manuellement, y compris après enregistrement. Les descriptions libres restent descriptives, sans NIP fictif.

Preuves ciblées : `scripts/scope-qv-pr12-corrective-tests.js`, `scripts/scope-qv-pr12-corrective-clone-tests.js`, `scripts/scope-qv-pr12-corrective-browser.js` et `docs/captures/qv-pr12-corrective-20261012/`. Les recettes acquises des jalons précédents ne sont pas relancées.

## Lot consolidé MOA — 13.10.2026

### QV-SEARCH-001 / QV-UI-007 — Réactivité et fiches
La frappe est immédiate ; filtrage différé de 180 ms, contexte conservé. Le moteur existant, ses filtres et son ordre restent inchangés. Les textes de recherche sont mémorisés par instantané et le tri ne calcule que sa colonne active. Recette sur 911 occurrences : 909 actives du clone et deux cas MOA temporaires CRIMSON/CFF, annulés intégralement.
Les fiches utilisent la grille existante à quatre, deux puis une colonne, contrôles de 39 px. Nature et paramètres sont dans une zone compacte, sans badges ni capsules. Les états restent carré 8 × 8 + libellé, contenus en haut. Cycle et validation annuelle sont dans Règles ; propositions PAPR dans Cursus, navigation existante conservée.

### QV-WORKFLOW-003 — Aucune modification, mineure ou majeure
Une sauvegarde publiée sans différence effectivement saisie réussit sans révision, journal artificiel ni modification de l'événement. Les différences de présentation/canonicalisation et valeurs non soumises ne déclenchent pas de modification majeure. Les OI de la publication sont affichés lorsqu'aucune révision n'est en attente ; une préparation divergente ne remplace pas leur réalité opérationnelle.
Le mécanisme spécifique de proposition des quatre OI reste disponible uniquement lorsque les quatre OI DPS ne sont pas réellement persistés. Une révision explicite est motivée et ciblée, avec identités, Stat.Com et présences conservés. Les modifications éditoriales autorisées restent mineures.
Motifs dans une fenêtre dédiée au retrait ou à la confirmation d'une révision majeure, pas dans un champ permanent. Annuler conserve la saisie et ne retire aucune validation. Le retrait ignore les autres brouillons non enregistrés.

### QV-AUDIT-001 — Journal permanent existant
Réutilisation de `scope_journal_metier`, avec date/heure, auteur, action, avant/après et motif requis. Les nouvelles créations, modifications, validations, publications, révisions, retraits, annulations et suppressions logiques sont journalisés. Les fiches Programme et Événements présentent Historique repliable ; aucune interface d'édition du journal. Des déclencheurs interdisent UPDATE, DELETE et TRUNCATE de ce journal. Les lignes anciennes et journaux existants restent conservés ; les opérations anciennes non journalisées ne sont jamais reconstituées artificiellement.
Présentation du 13.10, remplacée par la décision MOA du 14.10 ci-dessous : une ligne de transaction regroupe ses champs détaillables, actions lisibles en français, auteur nommé uniquement avec permission de lecture du référentiel personnel. Une ancienne valeur absente reste « Non enregistré ». Les répétitions sans différence de champs ni transition de validation ne créent pas de transaction ; retrait puis nouvelle validation restent deux décisions légitimes. Les validations historiques répétées du PAPR 3 ne sont pas supprimées. Les nouveaux enregistrements précisent l'entrée Programme et le workflow ; aucun mode ancien manquant n'est inventé.

### QV-RESP-004 / QV-PUBLIC-005 — Présentation sans migration d'associations
Ordre des groupes de responsables : F0, F1/8, F2/3, F4, F5/6, F7, DPS, DAP, JSP, Autres domaines. Tri alphabétique dans chaque groupe. Les regroupements sont uniquement visuels, sans fusion des domaines F0 à F8 ni changement d'identifiant.
Libellés proposés : Chef audiovisuel, Chef formation, Chef section, Chef site, Chef opérationnel, Chef FOSPEC et Officier auto, avec références historiques stables. Multisélection et saisie libre conservées. Les fonctions absentes du référentiel PostgreSQL ne sont pas créées sous un identifiant supposé.
Les doublons visuels de Formateur PR, Moniteur conduite et Formateur C1/118 sont regroupés en un choix. Une sélection historique conserve tous ses codes enregistrés tant qu'elle n'est pas explicitement modifiée ; aucune conversion automatique d'une population historique en fonction descriptive. Libellés au singulier, valeurs libres non promues.

### QV-NATURE-001 — Paramètres indépendants et occupations
Nature : activité SDIS récurrente, activité SDIS extraordinaire ou occupation externe. Reconduction annuelle, évaluation, solde et demande d'export sont persistants et indépendants ; une activité déjà gérée dans ECAwin peut être soldée sans nouvel export.
SDIS récurrent : reconduction, évaluation, solde et export activés par défaut, sauf décision explicite. CRIMSON opérateurs/chefs VPC : 0180F7 inchangé, non reconduit en 2028 ; suivi/solde selon décision et traitement, pas de nouvel export si déjà créé dans ECAwin. Reconduction réutilisant les lignées et décisions de désactivation existantes.
CFF/caserne G1 : Programme et Agenda, réservation du lieu/salle existants, sans participation obligatoire SDIS, solde, export, reconduction ni événement opérationnel. Les conflits de salle ou de lieu sont détectés avec le moteur de compatibilité existant. Le contrôle disparaît après résolution ; la validation annuelle ne passe pas avec une réservation bloquante. Aucun lieu ou salle n'est modifié automatiquement.

### QV-CODE-005 — HSC, sans renumérotation historique
Décision remplaçant le format d'affichage de QV-CODE-004 : `HSC.001`, `HSC.002`, etc., compteur sur trois chiffres. HSC signifie Hors Stat.Com ; jamais une référence Stat.Com synthétique. Les nouveaux codes utilisent la séquence interne existante. Les anciennes valeurs `SCOPE-000150`, par exemple, sont conservées en stockage et présentées/exportées comme `HSC.150`, sans modification d'identifiant, de lien, de code historique ou de Stat.Com.
Avant installation, contrôle des identités déjà présentes : collision d'alias, zéro ou valeur hors 001–999 bloque la migration pour décision MOA, sans renumérotation. Une séquence épuisée bloque l'allocation. Les occupations hors SCOPE peuvent rester sans code. Aucun format d'import ECAwin non démontré n'est inventé.

### QV-CONTROL-001 — Contrôles utiles uniquement
Un seul encadré de fiche regroupe les contrôles factuels : OI publiés incomplets, conflit PAPR, réservation, correspondance ECAwin historique non confirmée, OI ambigu ou conflit Rapport annuel. Il indique point, raison et action. Aucune boîte si aucune cause active ; disparition après résolution.
QV-CONTROLE-001, même exigence post-recette : état de planification et contrôle métier sont distincts. `A_POSITIONNER` sans cause active signifie « À planifier », pas un contrôle inventé. Le classement des jours réutilise les règles et le calendrier existants ; une date interdite à valider exige une dérogation motivée seulement si la règle l'autorise. Une date humaine déjà validée n'est jamais déplacée automatiquement.

### QV-DPS-GROUP-001 — Formation continue groupée des quatre DPS
Décision MOA du 13.10 : les séances de formation continue groupée G1/C1/B1/B2 utilisent `0120F7` / `EXERCI`. Les cinq séances non humaines, non validées et non publiées de la définition démontrée `QV26-FORMATION-GROUPEE-1-1-3D8CCE58` sont requalifiées à la lecture, puis persistées par l'enregistrement normal. La séance 1.1 déjà validée en `0120F7` est conservée. Ni les cours de cadres, ni les autres `0162F7`, ni les publications/historiques ne sont remplacés globalement.

### QV-CYCLE-004 — Programme civil et rattachement métier
Rapport annuel 2027 confirmé au 23.02.2027 ; cycle suivant au 24.02.2027 ; clôture au 10.02.2028 toujours provisoire, à valider par le Codir. Un instantané automatique ancien du Rapport n'est pas une décision humaine et ne prévaut pas sur la règle canonique ; sa ligne historique n'est pas déplacée. Une activité du Programme 2027 peut être créée dès le 01.01.2027 : son rattachement antérieur au 24 février est le cycle 2026, sauf exception préparatoire PAPR confirmée. Les statistiques restent strictement civiles. Une occupation externe suit uniquement l'année civile choisie, sans cycle SDIS, participation, Stat.Com fictif, export ou reconduction ; réservation et calendrier sont conservés.

### QV-UX-RECH-001 / QV-UX-003 — Post-recette ciblée
La recherche Programme conserve son nœud, son focus et son curseur pendant la frappe, y compris lors du rafraîchissement asynchrone du badge. Les cinq paramètres existants sont alignés sans modifier leurs règles métier, leurs hauteurs uniformes ou créer une nouvelle interface.

### QV-PDF-001 — Deux exports annuels existants
Planning annuel et Liste compacte : A4 paysage réel, onze colonnes dans l'ordre Date, Horaire, Activité, Domaine, OI, Lieu, Salle, Responsable, Public cible, Stat.Com, État. Stat.Com contient le code seul. Filtres, thèmes, pagination, en-têtes répétés et logos conservés. Noms : `QUO VADIS AAAA, Planning annuel.pdf` et `QUO VADIS AAAA, Liste compacte.pdf`, année dynamique, sans préfixe SCOPE ni underscore. Le planning mensuel acquis n'est pas supprimé.

### QV-PUBLIC-004 — Groupe OPÉRATIONNEL
OSR, CI DPS, Candidat CI DPS, CI DAP, Candidat CI DAP, multisélection dans le catalogue descriptif existant. Les quatre codes CI `ENC:*` existants sont réutilisés ; OSR est une référence descriptive, pas un NIP ou une affectation. Aucune conversion automatique des valeurs libres ni contribution individuelle aux statistiques.

### QV-ECA-001 — Activité déjà créée dans ECAwin
Conserver l'événement SCOPE et les mécanismes d'affectation ; ne pas réexporter pour recréer une activité déjà existante. Le rapprochement du code externe avec le code métier SCOPE peut être réalisé par la MOA dans ECAwin. CRIMSON reste extraordinaire/FOSPEC, non reconduit, export désactivable. Le contrat d'échange et l'inscription spécialisée des Cours ECA restent à vérifier dans la roadmap, sans intégration non documentée ni module parallèle.

Preuves du lot : `docs/captures/qv-moa-20261013/`. Acquis sept PAPR, dates/thèmes, spécialisation multiple, 0180F7, A+1, Rapport 10.02.2028 provisoire, statistiques civiles et suivi Cours ECA conservés. Aucune recette historique rejouée globalement.

## Complément ciblé PR #13 — 13.10.2026

### QV-PUBLICATION-003 — Rapprochement non destructif
Un identifiant de source distinct ne suffit pas à distinguer deux réalisations. Le rapprochement
avec une publication exige intitulé normalisé exact, date réelle, horaires, Stat.Com, OI qualifiés
et séance identiques. Les horaires/OI de la publication doivent correspondre réellement à la fiche.
Les thèmes, publics, responsables, lieux, paramètres et décisions de retrait/révision distincts
interdisent un rapprochement automatique. Aucun rapprochement approximatif ou par intitulé seul.
Un alias exact et univoque reste enregistré, avec tous ses identifiants, décisions et journal,
mais renvoie à la fiche publiée et n'est pas une seconde ligne Programme/export/publication.
Toute pluralité de publications ou décision divergente bloque la validation annuelle pour arbitrage.
L'événement opérationnel et ses affectations/présences ne sont ni recréés, ni supprimés, ni modifiés.
Une occurrence A+1, une autre séance ou un autre OI reste distincte, même avec le même intitulé.

### QV-CODE-006 — Préflight HSC préalable à la décision de production
Inventaire readonly des événements, préparations, activités de publication, allocations, contraintes
et index. Le SQL `database/ops/20261013_scope_hsc_preflight_readonly.sql` s'exécute avec `psql`
sur la connexion SCOPE existante, `ON_ERROR_STOP` et transaction READ ONLY. Le même garde SQL
est exécuté avant le DDL : format/plage, collisions d'alias, réutilisation par plusieurs événements,
allocation divergente, liens orphelins et séquence épuisée bloquent, sans réparation automatique.
Un résultat du clone n'est jamais une preuve d'inventaire SQL de production. Sans cet accès,
la vérification réelle préalable et le GO restent obligatoires. Aucun code historique renuméroté.

### QV-RESP-005 — Références absentes non supposées
Chercher Fourrier, Chef FOCA, Chef communication et Chef publication dans les fonctions, rôles,
aliases et référentiels existants ; ne pas réutiliser une identité de public ou de cursus comme fonction.
Dans le clone accessible, aucune correspondance permanente de fonction n'est démontrée pour ces
quatre noms. Les 28 codes de fonctions existants sont préservés ; les descriptions libres restent
disponibles. Les correspondances encore absentes attendent une source métier autorisée.

Preuves complémentaires : `docs/captures/qv-pr13-complement-20261013/`.
Les 25 contrôles précédents et leurs preuves restent conservés, sans recette globale répétée.
Suivi spécialisé des Cours ECA maintenu dans la roadmap existante, sans module parallèle.

## Derniers contrôles PR #13 — 13.10.2026

### QV-PUBLICATION-004 — Dates des propositions A+1
Les lectures SQL de production démontrent une publication unique pour instruction DAP Y2 du
19.01.2027 et Kick-off du 27.01.2027. Les propositions distinctes de janvier 2028 héritaient
de dates de publication 2027 lors de la copie d'un modèle humain validé : défaut d'affichage,
pas deux réalisations identiques. Une proposition sans lien publié n'utilise jamais les dates,
horaires, état/version ou OI de publication de son modèle. Ces métadonnées sont réinitialisées
à la projection ; date affichée et déplacement reposent sur la date de l'occurrence réelle.
Aucune occurrence supprimée, aucun Stat.Com/code/identifiant renuméroté, aucune publication modifiée.

### QV-DAP-003 — Replanification autorisée de la séance 1.2
La MOA autorise une proposition conforme, pas une date validée inventée. Réutiliser
`pickProposalSlot`, les règles DAP applicables, le calendrier réel et les jours préférés/possibles.
Recherche dans le mois projeté, sans avancer avant la proposition historique initiale ni avant
la séance 1.1. Horaires individuels absents : toute activité des OI DAP le même jour est un
conflit potentiel conservé par prudence. Aucun horaire générique n'est imposé à la séance.
Propositions démontrées : 13.05.2027 puis 20.05.2027, jeudis préférés ; 06.05 interdit
(Ascension), 27.05 occupé par un exercice DAP. Rang et raisons visibles, date/horaire
individuels toujours non décidés. Lieu, salle, thème et responsable restent à confirmer.
Une décision humaine ou publication arrête la proposition automatique. DAP 1.1, quatre
exercices par section, formations DPS, Stat.Com et identifiants existants sont préservés.

### QV-RULES-001 — Décision MOA validée, prochain jalon uniquement
Un seul onglet Règles ; une seule règle pour un cursus complet, pas une règle par module.
Fiche structurée en huit sections, portées explicites, jours préférés/possibles/déconseillés/interdits,
contrôle de faisabilité avant validation, accès administrateur ou permission explicite.
Affichage informatif dans les événements. Maquette validée par la MOA.
Cette mission capitalise la décision : aucun éditeur, nouveau moteur ni nouveau module développé.
Implémentation prévue après stabilisation de la production, avec les mécanismes existants.

## Décisions MOA post-PR #16 — 14.10.2026

Ces décisions remplacent les présentations contradictoires du 13.10, sans réécrire les historiques.

### QV-AUDIT-002 — Tableau directement lisible
Sept colonnes : Date et heure, Auteur, Action, Champ, Ancienne valeur, Nouvelle valeur, Motif.
Aucun menu de changements. Création manuelle : une seule ligne « Création manuelle de l'événement ».
Modification : une ligne par champ métier réellement modifié ; validation : une décision par transition réelle.
Retrait : motif obligatoire, workflow existant. Les listes OI sont comparées comme des ensembles.
Champs dérivés et techniques sans incidence exclus ; valeurs anciennes absentes « Non enregistré ».
Les corrections automatiques effectivement persistées sont distinguées de l'auteur humain, avec valeur stockée avant/après.
Les anciennes transactions sans transition restent explicitement historiques, sans valeur inventée ni suppression en base.
Le journal permanent, les permissions de lecture des auteurs et les protections append-only sont conservés.

### QV-RESERVATION-002 — Ressource explicite
Une salle réservée se compare à la même salle et au créneau réel. Un emplacement se compare à son code de ressource.
Un site n'est exclusif que si cette décision est explicitement enregistrée ; un lieu seul ne l'est jamais.
Une occupation CFF sans salle ne crée donc aucun conflit fictif de salle ou de caserne.
Les salles différentes restent indépendantes ; chevauchements partiels et exclusivités explicites restent contrôlés.
Moteur de compatibilité serveur existant conservé ; le contrôle ciblé des occupations ne remplace pas les contrôles SDIS.
En l'absence de ressource ou de portée enregistrée, aucune exclusivité n'est déduite. Aucun lieu ni salle réécrit.

### QV-PLANIF-005 / QV-OSR-001 — Proposition contrôlée
Principe accepté : date N + 364 jours, puis contrôles des fériés, vacances, périodes particulières, règles de domaine/cursus,
disponibilité, exceptions et programmation existante. Les règles spécifiques priment ; CTA et cursus PR restent leurs moteurs existants.
Une proposition interdite porte un contrôle visible, jamais une conformité automatique. Saisie et actions d'enregistrement actualisent les contrôles.
Dates humaines validées/publiées inchangées ; DAP 1.1 et 1.2 conservent leurs propositions et décisions, affichées en jj.mm.aaaa.
Mise à niveau annuelle OSR, type canonique démontré `QV26-MISE-A-NIVEAU-ANNUELLE-OSR-9977BB10`, `0171F7` : vendredi possible, y compris en journée.
Portée certaine : OSR, éventuellement CI DPS dans cette même formation ; public supplémentaire ou libre = aucune levée automatique.
La seule présence d'OSR dans une autre activité ne déroge pas à DPS. Fériés, vacances et neutralisations restent applicables.
Cas confirmé conservé : 08.10.2027, 08:00–16:00. Aucun vendredi DPS globalement autorisé.
Les alertes expliquent problème, données, conséquence et action, sans identifiants techniques. Planification, contrôle, validation et publication restent distincts.

### QV-UX-004 / QV-PDF-002 / QV-PUBLIC-006
Nature et quatre cases : grille existante régulière, alignée, responsive, mêmes fonctions et hauteurs.
Occupation externe : « Occupation externe — Sans cycle métier SDIS. Activité non reconduite automatiquement. »
Trois exports conservés : mensuel A4 portrait ; annuel et compact A4 paysage, même bandeau/logos/titres/pieds de page.
Séparateur historique U+30FB rendu comme U+00B7, uniquement en PDF, sans modifier la source. Public cible après Responsable, Stat.Com avant État.
Noms annuels `QUO VADIS AAAA, Planning annuel.pdf` et `QUO VADIS AAAA, Liste compacte.pdf`, année dynamique, dates jj.mm.aaaa.
Groupe « Opérationnel » : OSR, CI DPS, Candidat CI DPS, CI DAP, Candidat CI DAP, ordre exact ; OSR en premier dans les sélections affichées.
FOBA 1/2/3 conservés : respectivement Recrues, Sapeurs DPS et DAP, Sapeurs DPS, sans remplacer les libellés par les populations.

### QV-INDEX-001 — Correspondances documentaires, pas de réorganisation
Fonction ≠ spécialisation ; candidat ≠ qualifié ; Formateur PR ne confère jamais Porteur APR.
Qualifications et affectations évaluées à la date réelle de l'événement. VPC et Sanitaire appartiennent à FOSPEC.
Préparer Organisation, Cadres, Candidats par domaine, Spécialisation, Fonctions particulières, Gouvernance ; domaines PR/AUTO/FOSPEC/FOBA/DPS/DAP/JSP.
Spécialisations par domaine puis ordre alphabétique ; propositions contextuelles par Stat.Com (`011PR` : PR/candidatures/fonctions pertinentes).
Libellés officiels IndeX à conserver après rapprochement démontré ; aucun identifiant IndeX supposé ni migration.
Inventaire, écarts, correspondances et questions dans la ROADMAP/ToDo existante. QV-RULES-001 reste un jalon futur, maquette validée inchangée.

## Correctif post-recette MOA du 14.10.2026

Source : mission « Correctif consolidé post-recette MOA — 14.10.2026 ». Ces décisions
complètent les acquis PR #17 ; aucune réécriture des données historiques.

### QV-RESERVATION-003 — Date réelle, tous cycles et battement
Disponibilité selon date et horaires réels, salle ou ressource explicitement réservée,
indépendamment du cycle affiché. Lire ensemble les préparations du Programme, les réservations
persistées des autres cycles et les événements opérationnels/publiés. Les références rapprochées
d'une même publication ne créent pas une seconde réservation ; ses créneaux effectivement différents
restent visibles. Une ancienne obligation remplacée par sa préparation canonique n'écrase pas la décision humaine.
Exclure les annulations ; une réservation distincte encore explicitement active reste indépendante.
Un lieu seul n'est jamais exclusif. Deux salles différentes restent indépendantes, notamment
Oxygène et État-major ; aucune salle déduite de la seule caserne, aucun conflit fictif pour CFF sans salle.
Même salle : chevauchement ou battement strictement inférieur à 30 minutes = conflit, dans les deux sens.
18:00–20:00 puis 20:00 ou 20:15 : conflit ; 20:30 : compatible. Les horaires sources ne changent pas.
Contrôles immédiats sur date/début/fin/lieu/salle et nouvelle lecture serveur sous verrou transactionnel
commun aux écritures de préparation, tous cycles. Une collision bloque le nouveau créneau ; elle ne
déplace aucune décision existante et n'empêche pas une modification éditoriale sans nouveau créneau.
Le filtre Salle dépend du Lieu ; les autres réservations effectives apparaissent en lecture seule,
avec leur date réelle et leur cycle, sans ajout aux occurrences ni aux exports métier ECAwin.

### QV-EM-001 — Priorité État-major
État-major est prioritaire sur les activités nécessitant l'échelon IV : Commandant, chefs opérationnel,
logistique et formation, quartier-maître, officier communication, chefs de site DPS et chef DAP.
Chef formation participe également à la Direction JSP. Les fonctions/publics explicitement démontrés
permettent un contrôle de participation commune ; ils ne créent ni NIP ni affectation individuelle.
Cas MOA : 16.02.2027, État-major 18:00–21:00 / Direction JSP 18:30–20:30, salle État-major G1 ;
22.06.2027 à contrôler également. Proposer le repositionnement de l'autre activité, soumis à validation MOA,
sans inventer une nouvelle date ni déplacer un événement publié ou une décision humaine.
La participation commune fonctionnelle reste distinguée d'une intersection nominative non démontrée.
Les règles de jour, dérogations et autres contraintes canoniques existantes restent applicables.

### QV-CALENDAR-003 — Calendrier validé, stable
Composant existant : six semaines fixes, dimensions et position conservées pendant la navigation,
y compris lorsqu'il s'ouvre au-dessus du champ ; rester dans la fenêtre. Clic direct, jj.mm.aaaa,
aucun bouton supplémentaire. Vacances/fériés : mêmes référentiels et couleurs que l'Agenda annuel ;
week-ends légèrement grisés, aucune légende ajoutée. Alerte rouge claire distincte sous « À contrôler »,
date explicite et distinction date interdite/déconseillée/disponibilité/dérogation. Disparition à conformité,
sans remplacement automatique d'une date humaine.

### QV-AUDIT-003 — Annulation motivée, valeurs conservées
Confirmation préalable avec activité, date, horaire, OI, année et conséquences ; motif obligatoire.
Boutons « Conserver l'activité » / « Confirmer l'annulation ». Une action d'annulation identifiable,
auteur/horodatage/ancienne valeur/nouvelle valeur/motif ; les champs inchangés restent identiques dans
les deux instantanés. Les anciens journaux partiels sont présentés comme l'action de cycle réellement
enregistrée, jamais comme une suppression de leurs champs ; leurs données sources restent intactes.
Occurrence annulée : paramètres de planification historiques clairement expliqués, pas de réactivation
implicite par un enregistrement ordinaire. Annulation annuelle et arrêt de reconduction restent distincts.
Suppression logique existante : confirmation et motif obligatoires, arrêt des productions futures,
fiche annuelle/historique conservés. Aucun DELETE ni élargissement silencieux de cette sémantique ;
un retrait de l'année courante reste l'action d'annulation annuelle, non une suppression d'historique.

### QV-FAMILY-002 / QV-PUBLIC-007 — Organisation et présentation
Famille organisationnelle indépendante du domaine fonctionnel : OI qualifiés DAP Y1–Y4 permettent DAP,
DPS G1/C1/B1/B2 permettent DPS, OI JSP permettent JSP. Choix humain compatible ou transversal/non qualifié,
jamais une déduction budgétaire ni une famille imposée aux activités multi-OI. Réutiliser les champs et
la reconduction existants, sans changer Stat.Com, publics ou spécialisations.
Publics : virgules ; échelons contigus contractés « Échelon I et II », « Échelon I à III »,
« Échelon II et III », « Échelon II à IV », « Échelon IV ». Mêmes sélections internes, affichage uniforme
fiche/tableau/historique/PDF. OSR prioritaire dans l'affichage ; FOBA 1, 2 et 3 inchangés.

### QV-FREEZE-20261014 — Budget et IndeX gelés
Séance de coordination du 25.08.2027, 19:00–21:00, DAP Y1, Local Y1 : enregistrement existant uniquement.
Conserver `070F23` et `070F23.006`, son annulation humaine actuelle, son historique et sa lignée.
Ne pas recréer ni dupliquer cette séance. Aucun compte Y1 ni ventilation ou correction similaire déduite.
IndeX : aucun identifiant, fonction, spécialisation, qualification, renommage, correspondance ou affectation
inventé/modifié dans ce lot. Rapprochement documentaire maintenu dans la roadmap, exécution gelée.

### QV-PDF-003 — Impression à 100 %
Trois formats existants : annuel/compact A4 paysage, mensuel A4 portrait ; marge imprimable minimale
10 mm autour de tous les éléments, bandeau/logos/pied de page compris. Aucun facteur de réduction imposé.
Conserver Responsable, Public cible, Stat.Com, État et les thèmes ; blocs non coupés et ordre chronologique.
Noms dynamiques : `QUO VADIS AAAA, Planning annuel.pdf`, `QUO VADIS AAAA, Liste compacte.pdf`,
`QUO VADIS AAAA, Planning mensuel - Mois.pdf`. Sources métier inchangées ; accents et points médians conservés.

## Finalisation Consolidée PR #18 — 14.10.2026

### QV-CYCLE-006 — Dates confirmées et ancienne publication EM
Rapport annuel définitivement **23.02.2027**, cycle suivant **24.02.2027**, clôture proposée
**10.02.2028 provisoire / Codir**. La publication du Rapport et son occurrence concordent au 23.02.
EM **16.02.2027 18:00–21:00** maintenu. Sa publication historique au 24.02 est le même événement
lié, révision ciblée déjà en attente, pas une seconde séance ni une date de report validée.
Confirmation humaine motivée sur cet événement existant uniquement, après résolution JSP ;
identifiant, Stat.Com publié NULL, code NULL, lignée et historique conservés. Le repère EMSEA
préparatoire ne remplit jamais automatiquement le Stat.Com de cette ancienne publication.
Une révision approuvée d'une séance d'un seul jour conserve la cohérence date/date_fin ; aucune
date humaine n'est déplacée par la lecture du Programme ou par la proposition.

### QV-JSP-001 — Dates Direction JSP approuvées par la MOA
La projection N+364 et la priorité d'une séance explicite mensuelle restent les moteurs existants.
Il ne s'agit pas d'un mardi obligatoire : `PLANIF-JSP` autorise le mercredi et les sources 2026
montrent plusieurs jours de semaine. Les dates MOA **17.02.2027** et **23.06.2027**,
**18:30–20:30**, restent dans leur mois, hors vacances/fériés et sans réservation de la salle
État-major à ces créneaux au contrôle du 14.10. Décision MOA du 14.10.2026 : les deux dates
sont **APPROUVÉES**, pas encore appliquées aux publications. Conserver les événements et leurs
identifiants ; appliquer les révisions ciblées selon le workflow existant, sans écriture directe
en production dans cette PR ni déplacement automatique.
Publics, OI JSP, responsable C JSP et fonctions historiques C for/C JSP/C site JSP/Resp for JSP
restent inchangés ; Chef formation commun avec EM conformément à QV-EM-001.
Changer de salle le 16.02 ou le 22.06 ne suffit pas à libérer une fonction commune.
Aucun enregistrement automatique, aucune affectation nominative inventée, recontrôle avant saisie.

### QV-RESERVATION-004 — Résolution manuelle et preuves d'identité
Décision MOA : conflits ordinaires réglés **manuellement dans SCOPE**, par les procédures existantes,
sans moteur de résolution automatique ni création de salle/événement. Le tableau de résolution unique
est intégré au [rapport de la PR #18](../SCOPE_QV_MOA_20261014.md), avec disponibilités datées,
battement >=30 minutes, publications et tous cycles, fonctions communes et décisions restantes.
Une salle libre ne démontre ni capacité/équipement ni disponibilité nominative exhaustive.
Une publication ancienne et sa préparation doivent être réconciliées, pas supprimées ou fusionnées.
Les références des cours cadres DPS/DAP des 31.03 et 22.06 ont Stat.Com, OI et sources 2026 distincts ;
les deux AUTO du 18.01 ont horaires/personnels source et publications distincts. Aucun doublon n'est
déduit de l'intitulé ni de leur salle commune. Animation conjointe/distincte à arbitrer par la MOA ;
préserver toutes les lignées, codes et décisions en attendant. Gel Y1/IndeX inchangé, suivi Cours ECA
et éditeur de règles conservés dans la roadmap existante. Ce GO n'autorise ni fusion ni déploiement.

Dossier **M2, 13.01.2027** : salle souhaitée par la MOA **VULCAIN** pour Direction JSP.
Oxygène était une proposition technique, pas une décision MOA ; elle n'est pas retenue.
Le conflit avec l'intégration DAP reste signalé tant que la disponibilité de Vulcain au créneau
18:30–20:30, battement de 30 minutes compris, n'est pas démontrée. Aucune réservation modifiée
ni déplacement automatique. Cette décision documentaire n'atteste pas une disponibilité nouvelle.

### QV-CYCLE-007 — Ajouts et communication après publication annuelle
Décision MOA du 14.10.2026, documentation métier uniquement dans cette PR : après validation
finale et publication du Programme annuel, une nouvelle activité SDIS créée manuellement peut
être rattachée au cycle métier publié même si sa date civile précède son début habituel
(exemple : formation CRIMSON ajoutée manuellement). Il s'agit d'un rattachement explicite de
l'ajout, pas d'un reclassement automatique des activités existantes ; cycles historiques préservés.

Processus opérationnel à conserver : **validation annuelle → publication → création ou liaison
des événements opérationnels → assignations du personnel → programmes individuels → communication
initiale aux personnes concernées**. La publication annuelle déclenche cette chaîne ; cette règle
documente le processus attendu et ne déclare pas tous ses parcours opérationnels implémentés.

Après publication, les nouvelles activités sont identifiées comme **ajouts**. Le personnel concerné
doit être informé individuellement de ces ajouts, ainsi que des modifications et annulations qui
le concernent. Les programmes individuels initiaux ne sont ni régénérés ni renvoyés systématiquement ;
les destinataires ajoutent manuellement les nouvelles dates à leur calendrier personnel.
Aucun nouveau moteur de notification, reclassement, événement ou envoi n'est développé ou déclenché
par ce complément. La préparation de ce parcours reste dans la roadmap existante ; les statistiques
civiles de QV-STAT-001 et les mécanismes de sécurité existants restent inchangés.

## Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026
Base contrôlée : PR #18 fusionnée, main et production `7033e3e`. Les décisions suivantes
complètent les acquis, sans changement des dates humaines, Stat.Com, codes, populations ou budgets.

### QV-CALENDAR-004 — Panneau complet de la maquette
Compléter le calendrier existant, sans remplacement : six semaines fixes, position stable entre
les mois, date sélectionnée en toutes lettres et panneau contextuel. La nouvelle décision MOA
remplace l'absence antérieure de légende de QV-CALENDAR-003 : jours fériés, vacances scolaires
vaudoises et week-ends sont identifiés et légendés, avec les informations du référentiel Agenda.
Panneau droit complet sur ordinateur, disposition verticale sur mobile, sans changement de date
lors de la navigation. Aucune date, réservation ou décision enregistrée n'est modifiée.

### QV-CTA-007 — Alerte selon la règle d'instruction, pas la règle générique
Une instruction DPS de section/demi-section est reconnue par son type, son domaine de planification,
son OI unique et un public actif correspondant au moteur CTA canonique. Le serveur expose les semaines
et affectations calculées par ce moteur ; aucune deuxième rotation n'est créée dans le navigateur.
Lorsque cette correspondance est démontrée, le samedi et les vacances ne constituent pas à eux seuls
une alerte générique. Les fériés, veilles/week-ends fériés et contraintes internes restent contrôlés,
et les adaptations CTA existantes restent inchangées. Exception PIONNIER CSU-nvb G1 de section :
référence précédente du moteur existant, pas une dérogation générale. Aucun déplacement automatique.
Cas MOA démontrés : G1 06.02.2027 N04a et B1 13.02.2027 N03a ; correction commune, pas deux patches d'IDs.
G1 N01–N05 / réserve N06 ; autres sites N01–N03 / réserve N04 ; demi-sections a/b, cycle perpétuel,
sans remise à zéro au 1er janvier. Une réserve, un public différent ou une séance préparatoire ne
bénéficie pas de cette qualification ; séance instruction DPS du 27.01 sans section CTA déduite.

### QV-FAMILY-003 — Catalogue commun et valeur absente neutre
Famille indépendante du domaine, de l'OI et du Stat.Com. Choix MOA : SDIS avant DPS, puis DAP, JSP,
FOBA, FOCO, FOCA, FOSPEC, AUTO et PR. Cette liste n'est pas déclarée exhaustive : les valeurs déjà
enregistrées Conduite/Événement/Exercice/Formation/Instruction/Permanence restent conservées et recensées,
sans les renommer ni les attribuer automatiquement. Les valeurs présentes dans le référentiel/source
restent accessibles ; une nouvelle famille non référencée est refusée par le serveur.
Pas de famille déduite automatiquement d'un domaine ; une valeur explicite prime, notamment F1/DAP/Y1
sans changement de `070F23` ni imputation budgétaire. Aucune correspondance IndeX inventée.
Libellés artificiels Transversale / non qualifiée, Autre et Sans famille spécifique retirés des nouveaux
choix ; absence affichée « — » et recherchable par le filtre neutre, sans nouveau code métier.
Les historiques ne sont pas réécrits. Recensement daté de la source courante : 92 activités internes
et 4 externes sans famille, à distinguer, aucune qualification automatique.

### QV-FAMILY-004 — Familles exclusives, décision MOA du 15.10.2026

Cette décision remplace la possibilité QV-FAMILY-003 de proposer les anciennes natures observées.
Les seules nouvelles références sont, dans cet ordre : SDIS, DPS, DAP, JSP, FOBA, FOCO, FOCA,
FOSPEC, AUTO, PR. Exercice, Instruction, Formation, Conduite, Événement et Permanence ne sont
pas des familles. Famille, domaine fonctionnel, nature, cursus et spécialisation sont distincts.
Une valeur historique reste conservée et visible sans être réintroduite comme référence officielle.
Modifier un autre champ ne modifie pas la famille. Aucune donnée existante n'est reclassée automatiquement.

Pour les définitions canoniques d'exercices DAP, la famille attendue est DAP lorsque la nature
Exercice, le Stat.Com officiel 013Yx et l'OI qualifié DAP:Yx unique concordent. Ne pas déduire
une correspondance du seul intitulé, ni étendre cette décision aux exercices mixtes ou cours de cadres.
Le domaine F7, les Stat.Com, OI, dates et codes d'occurrence restent inchangés.
Les nouvelles activités issues des types reprennent une proposition démontrée ; les autres
classifications restent à qualifier. Dans une nouvelle reconduction seulement, une ancienne nature
ne devient pas une nouvelle famille : reprendre la famille conforme enregistrée ou une proposition
démontrée, avec provenance et validation restant requise. La nature est conservée séparément.
L'instantané validé antérieur et les occurrences déjà enregistrées ne sont jamais réécrits.
Une famille autorisée déjà validée reste conservée.

Lecture de production du 15.10.2026 : les quatre Exercice DAP 1, dont Y4 du 24.03.2027,
sont déjà corrigés manuellement en DAP. Ne pas les retoucher. Le plan séparé non exécuté et
l'inventaire complet figurent dans `docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md`.

### QV-FILTER-006 — Référentiels communs fiche et Programme, 15.10.2026

Les familles des filtres et fiches partagent QV-FAMILY-004. Les cursus utilisent les identifiants
réels du catalogue actif, notamment CI-DPS, CI-DAP, C-GROUPE, TP9 et OFSI-BASE ; les libellés
affichés sont Cursus CI DPS, Cursus CI DAP, Cursus C groupe, Cursus cond TP9 et Cursus OFSI.
Aucun nouvel identifiant ou alias n'est créé. Les spécialisations proviennent des qualifications
existantes et le filtre prend en compte chaque sélection, indépendamment du cursus.
Les publics utilisent le catalogue des fiches, sections, demi-sections et réserves comprises.
Les équivalences d'affichage déjà établies ne fusionnent ni ne suppriment les valeurs enregistrées.
Les OI restent qualifiés et séparés : DPS G1 ne désigne pas JSP G1.
L'état Annulé existant permet de retrouver une occurrence annulée même si elle était publiée ;
aucun nouveau workflow ni réactivation implicite n'est introduit.

### QV-EXPORT-002 — Domaine court et ordre cohérent
Tableaux compacts et exports : code du domaine seulement ; libellé complet conservé dans la fiche.
Planning annuel : Public cible immédiatement après OI. CSV Excel : Famille ajoutée après Domaine,
OI/Public voisins, cellules protégées contre l'interprétation comme formule. PDF annuel A4 paysage
à 100 %, marges latérales de sécurité >=10 mm, colonnes mesurées sans troncature, textes/en-têtes/
pieds conservés. Structure mensuelle acquise inchangée ; aucun Stat.Com ou code SCOPE réécrit.

### QV-AUDIT-004 — Réactivation annuelle explicite
Réactivation d'une occurrence annulée par l'action dédiée, permission existante `references:manage`,
motif obligatoire, journal avant/après et identifiant stable. Reprendre l'état enregistré, sans nouvelle
validation inventée, sans effacement d'historique ni changement de reconduction future. Lire les salles
au créneau réel, tous cycles, sous le même verrou et avec battement de 30 minutes ; conflit refusé.
Enregistrement ordinaire ne réactive toujours pas une annulation. Une publication opérationnelle
annulée doit d'abord suivre la réactivation existante dans sa fiche, avec ses droits ; le Programme
ne contourne pas cette procédure et ne recrée aucun événement. Suppression logique reste distincte.
Messages destinés à la MOA : causes métier lisibles ; informations techniques conservées dans les
sources/journaux, pas de undefined, HUMAN_REVIEW_REQUIRED ou identifiant interne dans les alertes.

### Perspectives ProgJour Et GELORE2
ProgJour et export des réservations G1 vers GELORE2 : exigences conservées dans la roadmap existante.
Aucun écran, table, synchronisation, événement dupliqué, API ou format d'import inventé dans ce lot.

## Complément Consolidé MOA Du 15.10.2026

### QV-FAMILY-005 — Permanent et ordre des onze familles
Cette décision complète QV-FAMILY-004 et remplace sa liste de dix nouvelles références par :
SDIS, DPS, DAP, JSP, Permanent, FOBA, FOCO, FOCA, FOSPEC, AUTO, PR, dans cet ordre exact.
Permanent est disponible en fiche, filtre, statistiques et reconduction. Aucun événement existant
n'est automatiquement classé Permanent. Les anciennes valeurs restent conservées, non sélectionnables
comme nouvelles références ; « — » reste le dernier choix et le filtre d'absence reste disponible.

### QV-FILTER-007 — Groupes descriptifs et rattachements démontrés
Le filtre Famille sépare Organisation (SDIS à Permanent) et Formation (FOBA à PR), dans l'ordre
QV-FAMILY-005, avec en-têtes gris clair non sélectionnables. Les cursus et spécialisations utilisent
uniquement le rattachement explicite existant du référentiel (`domainCode` exposant `domain_code`),
lorsqu'il désigne une famille officielle. Tri alphabétique français dans chaque groupe ; sans
rattachement démontré : Autres cursus / Autres spécialisations. Aucun code, identifiant ou
rattachement n'est inventé. CI-DPS et CI-DAP restent notamment dans Autres cursus tant que leur
rattachement persistant est absent ; leur nom n'autorise pas à le déduire.
Filtre OI : SDIS, DPS (G1, C1, B1, B2), DAP (Y1, Y2, Y3, Y4), JSP (G1, C1, B1).
Séparation visuelle des groupes, codes qualifiés et sélections multiples existantes conservés.

### QV-DAP-002 — Complément de classification autorisé le 15.10.2026
La classification DAP couvre les quatre exercices classiques ET leurs quatre cours de cadres
correspondants par section Y1 à Y4. Cette décision étend explicitement le périmètre restreint de
QV-FAMILY-004, sans toucher aux mixtes DPS-DAP, cinquièmes exercices masqués ou autres historiques.
La preuve repose sur la définition canonique exacte, l'OI unique DAP:Yx et le Stat.Com 013Yx
concordants, jamais sur le seul intitulé. Relire identifiant, famille et empreinte de dernière
modification ; toute divergence bloque uniquement sa cible. Une cible déjà DAP reste intacte.
Une publication, révision en attente ou validation retirée nécessite son workflow dédié.
Le GO de ce lot n'autorise aucune modification de publication ni nouvelle validation annuelle.

Le 15.10.2026, 16 familles restantes Exercice ont été corrigées en DAP, avec journal et conservation
des validations antérieures ; 16 occurrences déjà DAP sont restées intactes, dont les quatre cas Y4
des 04.03, 24.03, 11.05 et 27.05. Dates, horaires et tous les autres champs métier sont préservés.
Une décision de famille seule sur un instantané automatique peut être lue avec le marqueur explicite
`familyDecision.scope=FAMILY_ONLY` sans transformer cet instantané en préparation humaine complète.
Elle n'adopte ni date ni état automatiquement et ne vaut pas validation. Le cours de cadres DAP 4 Y2
reste sans date décidée ; sa restitution nécessite le correctif applicatif de ce lot, encore non déployé.
Preuves et réserves : `docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md`.

## Correctif Complémentaire MOA Du 15.10.2026

### QV-PUBLIC-008 — Quatre références descriptives
Catalogue permanent partagé des fiches et filtres : Chef section DAP immédiatement après Chef DAP,
Candidat cond VL immédiatement après cond VL, Resp matériel et Préposé matériel dans Encadrement.
Le positionnement des deux fonctions matériel est provisoire ; aucune réorganisation des autres
groupes n'est anticipée. L'ancre Chef DAP réutilise le code de fonction existant `C DAP` comme
description, sans inventer d'équivalence de population individuelle ou de correspondance IndeX.
Après recherche des équivalents dans les sources et le référentiel persistant des publics, seuls
les quatre codes descriptifs manquants sont ajoutés au catalogue existant :
`CMDT:CHEF-SECTION-DAP`, `AUTO:CAND-VL`, `ENC:RESP-MATERIEL`, `ENC:PREPOSE-MATERIEL`.
Ce sont des références descriptives SCOPE, pas des qualifications ni des règles de population.

Les quatre libellés strictement identiques sont reconnus dans les filtres et présentés sans doublon
en fiche. Les codes et libellés libres déjà enregistrés restent présents dans les payloads de sauvegarde
tant que l'utilisateur ne retire pas sa sélection. Reconnaître ne signifie pas convertir : aucune
conversion persistante de ces occurrences ou publications n'est autorisée par ce lot. Toute conversion
ultérieure exige un inventaire et une autorisation MOA distincte ; une variante ambiguë reste libre.
La sélection n'engendre ni NIP, affectation, obligation ni contribution statistique automatique.

**Complément MOA du 15.10.2026, après recette des PR #22 et #23.** Les décisions ci-dessus
restent tracées ; les nouvelles règles de présentation suivantes prévalent pour le sélecteur :

- Une seule fonction visible **Chef section**, réutilisant `ENC:C-SECTION`. Ne pas créer de
  fonctions indépendantes DPS/DAP. L'ancien code `CMDT:CHEF-SECTION-DAP`, les libellés libres
  Chef section DAP / Chef section DPS et C section sont reconnus pour l'affichage et le filtre,
  sans conversion persistante. Le code historique reste connu des mécanismes descriptifs existants.
- La distinction DPS G1/C1/B1/B2 et DAP Y1/Y2/Y3/Y4 repose sur des rattachements qualifiés et
  datés. Une personne peut exercer la fonction dans plusieurs domaines. Ni la famille ni l'OI
  d'un événement ne prouvent sa fonction individuelle. Les extractions doivent croiser NIP,
  fonction, domaine/OI et validité temporelle, puis dédupliquer les personnes, sans nouveau moteur.
- Resp matériel (`ENC:RESP-MATERIEL`) et Préposé matériel (`ENC:PREPOSE-MATERIEL`) restent dans
  Encadrement. La reconnaissance tolère uniquement les espaces de bord autour des alias confirmés ;
  la valeur brute historique, y compris ces espaces, reste conservée. Une référence et son ancien
  libellé libre apparaissent comme une seule sélection, sans perte des autres publics.
- Dans AUTO, chaque candidat suit immédiatement sa qualification : `AUTO:1` / `AUTO:CAND-PL`,
  `AUTO:2` / `AUTO:CAND-TP9`, `AUTO:3` / `AUTO:CAND-VL`. Aucun nouveau code ni qualification.
- Les références visibles commencent par une majuscule, sans modifier la suite du libellé ni
  les sigles. Correspondances Chef confirmées : C for / Chef formation, C log / Chef logistique,
  C op / Chef opérationnel, C DAP / Chef DAP, C PR / Chef PR. Codes techniques inchangés.
  Aucune expansion générique du préfixe C ; C groupe et Candidat C groupe restent inchangés
  faute d'équivalence supplémentaire démontrée dans les sources consultées de ce lot.
- La présentation commune aux fiches, résumés et filtres ne modifie ni le catalogue historique
  utilisé par les projections/populations ni les exports PDF/Excel. Les décisions individuelles,
  affectations, publications, présences, Stat.Com et codes SCOPE restent inchangés.

**Limite constatée, pas une nouvelle règle de population :** l'inventaire SQL en lecture seule
du 15.10.2026 confirme les affectations datées et trois personnes rattachées à DPS et DAP,
mais pas de relation persistante personne-fonction-domaine/OI avec dates de validité. Le public
`DPS-CHEFS-SECTION-REMPLACANTS` porte toujours `personFunctionMapping=PENDING_INDEX_SYNC`.
L'adaptateur du moteur ne fournit pas les faits `functions` ; les seuls codes de fonction pris
en charge par ce moteur sont historiquement DPS. Les rôles affectés à un événement ne prouvent
pas une fonction organisationnelle permanente. Les extractions de chefs DPS/DAP/tous domaines
restent donc non démontrables tant que cette relation n'est pas résolue et autorisée ; aucun
effectif de chefs n'est inventé. Preuves et périmètre : `docs/SCOPE_QV_PUBLICS_MOA_20261015.md`.

### QV-CURSUS-009 — CI DAP et CI DPS sous FOCA
Décision explicite remplaçant la réserve de rattachement QV-FILTER-007 : les cursus existants
CI-DAP et CI-DPS appartiennent à FOCA. Ordre alphabétique français : Cursus C groupe, Cursus CI DAP,
Cursus CI DPS. Identifiants existants réutilisés, aucun cursus supplémentaire. Seul `domain_code`
est corrigé dans les deux références, avec date de modification et trace du journal ; inscriptions,
cohortes, modules, versions, historiques, qualifications et affectations restent inchangés.
Les fiches et filtres lisent ces mêmes références persistantes, sans catalogue parallèle.

Les causes techniques d'authentification et preuves ciblées sont séparées des règles métier dans
`docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md`. Aucune durée ni protection d'authentification n'est modifiée.

## Complément Consolidé MOA Du 15.10.2026 Après PR #24

### QV-PUBLIC-008 — Échelon 0 et candidat machiniste
Ajouter `ECH:0` au catalogue descriptif existant, immédiatement avant I, II, III, IV ; aucune
référence persistante équivalente trouvée lors de l'inventaire. Zéro n'est pas la lettre O.
Deux échelons sont joints par « et ». Trois ou davantage ne forment une plage « à » que si
TOUTE la sélection est continue. Une sélection discontinue reste une énumération explicite,
sans ajouter les intermédiaires. Exemples : 0 et I ; 0 à III ; I à III ; II et III ; II à IV ;
0 et III ; 0 et II et III. Réutiliser le formateur existant, sans changer les sélections.
Même règle dans les extractions existantes ; aucun changement de moteur PDF/Excel.
`AUTO:CAND-EA` suit immédiatement `AUTO:5`, comme les candidats PL/TP9/VL ; aucun nouveau code AUTO.

### QV-DPS-003 — Complément Responsable commun Chef section
Dans le sélecteur Responsable, la référence existante `C scrt` (libellé C sct) est présentée
comme **Chef section**, commune DPS G1/C1/B1/B2 et DAP Y1/Y2/Y3/Y4. Anciennes références et valeurs
libres Chef section DPS, Chef section DAP, Chef section, C sct restent reconnues et conservées.
Le regroupement visuel ne convertit ni les événements ni les responsables enregistrés ; il ne
modifie pas les fonctions individuelles. Le contexte organisationnel reste porté par domaine/OI.
La réserve MOA_REQUIRED de relation personne-fonction-domaine/OI datée reste entière, sans table
ni migration dans ce lot. Les libellés historiques exportés restent inchangés.

### QV-EXERCICE-PREPARATION-001 — Cours préparatoire et délai minimal
Complément des contrôles existants de couverture, attention et validation ; aucun second moteur.
Un exercice DPS/DAP classique doit disposer de son cours de cadres préparatoire correspondant,
terminé au moins **14 jours calendaires** avant sa date locale. 28, 21 et 14 jours sont conformes ;
13, 7 et 0 jours sont à contrôler ; un cours après l'exercice déclenche une alerte critique.
Cours absent, cours sans date ou exercice sans date : à contrôler. Relation ambiguë : MOA_REQUIRED.

Les quatre couples canoniques DAP de QV-DAP-002 sont rapprochés par numéro de définition,
OI unique Y1–Y4 et Stat.Com 013Yx concordant. Les trois couples DPS numérotés sont rapprochés
par définitions canoniques exactes et même OI/Stat.Com 012xx, avec compatibilité des sections et
demi-sections explicitement enregistrées. Les identifiants et sources 2026 sont repris des
références versionnées ; ni titre seul ni famille seule ne prouvent la relation. Aucun nouveau
cours ni date n'est généré. Les cours mixtes DPS-DAP ne sont pas attribués à des exercices sur
le seul numéro : les relations qualifiées non démontrées restent à arbitrer par paire/OI.
Les autres cours de cadres sont hors périmètre de ce contrôle.

Contrôle recalculé sur la projection annuelle (génération/reconduction comprises), sur modification
en fiche et côté serveur avant validation individuelle ou annuelle. Dates civiles calculées sans
influence de fuseau ou changement d'heure. Alerte : exercice, cours, OI, dates, délai constaté,
minimum et cause. Les contrôles conformes ne créent pas d'alerte ; une paire n'est pas répétée
dans la liste annuelle. Une anomalie non résolue bloque la validation silencieuse.

Une paire qualifiée et datée peut faire l'objet d'une exception explicitement confirmée dans
le dialogue de dérogation existant, avec motif, acteur et trace du journal. Son empreinte est
limitée à cette paire/OI/dates : une nouvelle date exige un nouveau contrôle. Une relation
ambiguë ne se résout pas par un simple motif. Aucune validation historique supprimée ; les
exercices déjà publiés restent signalés sans invalidation rétroactive. Aucun déplacement ni CTA modifié.

### QV-CALENDAR-003 — Complément ouverture selon date et cycle
Réutiliser le calendrier personnalisé existant : date renseignée prioritaire, mois/année et jour
sélectionné correspondants. Sans date : janvier du cycle, pas le mois courant ni le dernier mois
navigué. Une date janvier 2028 sur cycle 2027 ouvre janvier 2028. La route de fiche conserve
explicitement l'année 2028. Ouvrir/naviguer ne modifie ni date ni autre champ et n'enregistre rien.
Aucun remplacement par un sélecteur natif, aucune refonte UX.

### QV-PROPOSITION-002 — Priorité de la date validée, champ par champ
Une date humaine validée prévaut sur sa proposition automatique. Provenance exigée :
`humanDecision`, validation métier horodatée et date explicitement validée. Pour les anciennes
validations sans date dans l'instantané, seule la preuve d'une même écriture horodatée
`businessValidation.validatedAt = planningFields.updatedAt` avec la date persistée est reconnue.
PLANIFIE seul, une date seule ou une décision de famille seule ne suffisent jamais.
Les validations futures tracent `validatedDate`. Une sauvegarde d'un autre champ conserve la
preuve de date existante, sans créer une nouvelle validation ; une date différente, un retrait
ou une révision en attente réactive le contrôle. Aucune migration rétroactive des historiques.

La proposition reste historique, mais sa date/bouton Appliquer ne sont plus actifs ni comptés
comme date à traiter après preuve de validation. Le bilan sépare dates actives/obsolètes.
Une validation de date seule ne supprime pas les contrôles d'horaire, thème, public, responsable,
lieu/salle. Une validation métier complète déjà acquise reste respectée. Reconduction future
conservée : aucune date n'est copiée comme nouvelle décision humaine.

## Complément MOA Du 15.10.2026 — Préparation Et SDIS Transversal

### QV-EXERCICE-PREPARATION-001 — Bidirectionnalité et formations groupées
Complément, sans remplacement des décisions précédentes : une relation préparatoire produit
un seul contrôle, partagé par le cours et toutes les séances qu'il prépare. Les deux fiches
présentent le cours, la première séance concernée, leurs dates civiles, le délai, le minimum
de 14 jours et la cause. Sur le cours situé après l'exercice, le message désigne explicitement
ce cours comme tardif. Modifier une date recalcule ce même contrôle immédiatement ; un aperçu
non enregistré n'est pas une décision validée.

Le délai de 14 jours calendaires, calculé depuis la fin du cours, s'applique aux formations
groupées DPS/DAP uniquement si la relation est démontrée par les identifiants canoniques,
la lignée, les OI qualifiés et les références métier. Le titre seul ne suffit pas. Le cours
prépare l'ensemble des séances identifiées, avec contrôle de la plus précoce ; aucune séance
n'est déplacée, dupliquée ou supprimée. Une séance sans date empêche de certifier la première.

Relations démontrées dans les sources et l'inventaire en lecture seule du 15.10.2026 :
- DPS : définition `QV26-FORMATION-GROUPEE-1-1-3D8CCE58`, six séances
  `:O1:S1` à `:O1:S6`, cours de définition
  `QV26-COURS-DE-CADRES-FORMATION-GROUPEE-DPS-87729EC5`, quatre OI DPS.
  Source QUO VADIS 2026 : cours Formation groupée DPS / OFSI / ABC le 16.03.2026,
  six formations 1.1 à 1.6, mêmes quatre DPS et thème OFSI/ABC. Qualification des formations
  `0120F7` selon QV-DPS-GROUP-001 ; cours `0162F7` conservé. Aucun Stat.Com réécrit.
- DAP : `QV27:DAP-GROUP:1.1` et `QV27:DAP-GROUP:1.2`, cours manuel identifié
  `QV27:MANUAL:26ff9a06-a58a-4da0-8e63-2486118fc62b`, quatre OI DAP, `0130F7`.
  La lignée initiale du cours conserve ce rapprochement pour la reconduction, sans déduire
  un cours du seul libellé. Dates validées inchangées : cours 23.03.2027, séances
  21.04.2027 et 28.04.2027 ; délai 29 jours, CONFORME.

Une nouvelle identité non démontrée ou plusieurs cours compatibles restent MOA_REQUIRED.
Les cours sans relation démontrée ne sont pas arbitrairement rattachés. Validation individuelle,
validation annuelle et reconduction réutilisent le contrôle existant. Une anomalie critique
bloque la validation ordinaire. L'exception reste explicitement motivée et tracée ; sa clé
comprend le cours, les séances, les OI et toutes les dates des séances groupées. Changer une
date rend l'ancienne exception inapplicable. Les publications historiques ne sont pas invalidées
rétroactivement ; aucun nouveau cours, affectation ou décision humaine n'est généré.

### QV-OI-SDIS-001 — Visibilité transversale de l'organisateur SDIS
Une activité dont l'OI organisateur enregistré est `SDIS` est visible dans les onze OI
qualifiés : DPS G1/C1/B1/B2, DAP Y1/Y2/Y3/Y4, JSP G1/C1/B1. DPS G1 et JSP G1 restent
distincts. Le filtre d'un OI contient ses activités propres et celles de SDIS ; les filtres
parents DPS/DAP/JSP conservent cette même portée. Le filtre SDIS ne contient que les
activités dont l'organisateur réel comprend SDIS. Aucune inversion automatique.

Le même prédicat de visibilité s'applique au Programme, à l'Agenda annuel, au calendrier
mensuel et aux extractions PDF/Excel existantes. Les filtres combinés et sélections multiples
enregistrées sont conservés. Le calendrier et l'export globaux ne dupliquent pas l'événement.
L'OI organisateur réel reste SDIS, sans matérialiser onze activités, sans déduire un OI du lieu,
sans modifier CTA, dates, salles ou réservations. L'agenda historique 2026 reste inchangé.

Visibilité ne signifie pas participation : le public, les affectations datées, qualifications,
spécialisations et règles d'applicabilité déterminent seuls la population réellement concernée.
Les moteurs existants et l'identité individuelle/NIP sont conservés ; une personne multi-OI
ne doit pas être comptée deux fois pour un événement. Ce lot ne crée aucune assignation,
présence ou obligation. Une relation individuelle personne-fonction-domaine/OI non démontrée
reste MOA_REQUIRED, sans inventer de données ni de moteur parallèle.

### QV-OI-SDIS-002 — Diffusion CMDT — Gouvernance
Décision MOA du 15.10.2026 : CMDT est exclusivement un périmètre de diffusion organisationnelle,
pas un OI, une famille, un domaine, un public ni une population nominative. L'OI organisateur
enregistré reste SDIS. Les événements restent uniques, avec leurs identifiants et leur historique.

Catégories confirmées et définitions canoniques existantes :
- Séance État-major : `QV26-SEANCE-EM-ED042EBD`.
- Séance Codir : `QV26-SEANCE-CODIR-92921E7C`, y compris sa variante source
  `QV26-SEANCE-CODIR-REPAS-81897EA7` (Séance Codir + repas).
- Séance CRDIS : `QV26-SEANCE-CRDIS-B8654449`.
- Conférence des Commandants : `QV26-CONFERENCE-DES-COMMANDANTS-A2DEA769`.

La qualification réutilise ces références démontrées et l'OI SDIS, dans le prédicat de visibilité
existant. Une création depuis un type canonique conserve sa définition ; la reconduction conserve
la même identité de définition. Aucun texte approximatif, code Stat.Com générique, domaine F0,
public Membres du Codir ou titre libre seul ne permet de déduire le périmètre. Une activité libre
sans référence démontrée conserve son traitement existant jusqu'à qualification MOA.

Les événements CMDT restent dans le Programme global, le filtre SDIS et l'Agenda global SDIS.
Ils sont exclus des filtres/calendriers opérationnels DPS G1/C1/B1/B2, DAP Y1/Y2/Y3/Y4,
JSP G1/C1/B1, y compris les filtres parents DPS/DAP/JSP. La même sélection s'applique aux
exports PDF et Excel existants ; aucun modèle, colonne ou format n'est modifié.

QV-OI-SDIS-001 reste applicable aux autres activités SDIS : elles ne sont ni reclassées ni
retirées automatiquement des OI opérationnels. Les autres séances de cadres, COSEC, interSDIS
et activités F0 ne sont pas assimilées à CMDT par analogie. Toute extension exige une décision MOA.

Aucune propriété persistante nouvelle n'est nécessaire pour ce périmètre déterministe.
Aucun événement, OI organisateur, famille, domaine, date/horaire, Stat.Com, code SCOPE, public,
responsable, présence, affectation, publication, validation ou historique n'est réécrit.
La diffusion ne change ni les permissions ni la population applicable : pas d'assignation,
présence, obligation ou notification créée, aucune duplication en onze événements, aucune migration.


## Complément MOA — lot prioritaire fiches et préparation des assignations, 16.10.2026

Source : mission humaine « SCOPE ONLINE — LOT PRIORITAIRE QUO VADIS 2027 — FIABILISATION DES FICHES ET PRÉPARATION DES ASSIGNATIONS », complétée par les réponses TP9 et effectif PR du même échange. Ces précisions complètent les règles existantes ci-dessous ; elles n’autorisent aucune conversion des données existantes. [Décisions et réponses conservées](../audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md#lot-prioritaire-fiches-et-assignations--16102026). L’expression « Mission MOA fiches/assignations — 16.10.2026 » dans une proposition désigne cette source, pas un nouvel identifiant canonique.

### QV-PUBLIC-008 — complément fonctions communes et contexte

| Fonction commune | Domaine / OI applicables | Condition |
|---|---|---|
| Chef site (`C site`) | DPS G1/C1/B1/B2 ; JSP G1/C1/B1 | Même fonction, contexte domaine/OI/site et période d’effet |
| Chef section (`ENC:C-SECTION`) | DPS selon OI et section ; DAP Y1/Y2/Y3/Y4 selon section | Même fonction, section datée dans son domaine et son OI |
| Chef JSP (`C JSP`) | Domaine JSP | Responsable du domaine, sous responsabilité du Chef formation (`CMDT:C-FOR`) ; exerce aussi Chef site dans un OI JSP |
| Chef DAP (`C DAP`) | Domaine DAP | Responsable du domaine ; exerce aussi Chef section dans un OI DAP |

Les fonctions communes existantes sont conservées. Les choix applicables de Public cible réutilisent ces identités ; les anciens codes et libellés restent sauvegardés sous leur valeur brute jusqu’à retrait explicite. Il n’existe pas de seconde sélection d’OI dans Public cible : **les OI de la fiche sont la source des organisations concernées**. La responsabilité d’une activité n’entraîne aucune assignation implicite. Une règle propre à l’activité peut imposer la participation du responsable, avec référence explicite et résolution de ses personnes concernées.

Les faits individuels de fonction doivent porter personne réelle, fonction, domaine, OI, site/section lorsque pertinent, début/fin de validité et confirmation de la source. Le moteur vérifie un même fait contextualisé, sans joindre arbitrairement deux affectations. Les conditions Chef JSP/Chef DAP doivent être démontrées à la même date. Ni `PRINCIPAL`/`SECONDAIRE`, ni Responsable, ni libellé libre ne créent ce fait. **Source réelle de saisie/import et rattachement aux personnes encore à arbitrer** ; la relation persistante fonction–domaine–OI datée n’est pas livrée par ce lot, aucun rattachement n’est inventé.

### Paramètres des activités — préparation dans les composants existants

Public cible, fonctions, qualifications, spécialisations, candidatures, cursus, sessions et évaluation restent des axes distincts. Les fiches réutilisent leurs champs existants. Le complément `assignmentParameters` est une décision explicite de préparation, conservée dans les métadonnées, versions, révisions majeures, journaux et reconduction existants. L’absence de ce champ conserve le comportement antérieur ; une règle reconnue reste une **proposition non confirmée**. Aucun moteur d’écriture d’assignations n’est ajouté.

Les candidats sont assimilés aux titulaires pour les assignations applicables, sauf exception métier explicite. Cette assimilation de population n’est pas une attribution de qualification. Les candidatures fournies au moteur doivent être confirmées et datées ; une entrée manquante reste INCOMPLETE.

| Activité | Public / contrainte |
|---|---|
| CAR | Conducteurs VL et candidats VL concernés |
| TRUCK | Conducteurs PL et candidats PL concernés |
| TP9 1.x | Série existante « Conduite TP9000, formation continue 1.0/1.1/1.2 » ; conducteurs TP9 uniquement, deux par session |
| TP9 2.x | Série 2.0/2.1/2.2 : les anciens candidats sont supposés avoir été validés et sont considérés conducteurs TP9 ; une qualification valide doit réellement être présente à la date concernée, aucune promotion automatique de candidat |
| Instruction DPS | Base de section/demi-section et composition annuelle ; compléments externes seulement autorisés ; cohérence demi-section vers section ; G1 maximum 8 par demi-section, 16 par section ; aucun quota général confirmé pour C1/B1/B2 |
| Formations groupées DPS / DAP | Respectivement six / deux sessions, répartition proportionnée des participants |
| Exercices PR 1–4 | Maximum 12 PAPR par session ; **Préposé APR obligatoirement dans cet effectif** et issu du public concerné ; **surveillant hors effectif**, un par session et six personnes différentes pour les six sessions ; couverture PAPR échelons 0 à II ; formateurs désignés manuellement pour toutes les sessions concernées ; une seule contribution statistique par exercice |

Le contrat préparatoire réutilise le contrôle existant des collisions et décrit les personnes obligatoires, erreurs, non-concernés, situations à arbitrer, disponibilité individuelle, autre session compatible, priorités/non-déplaçables, équilibre échelons 0/I/II/III/IV et déplacements manuels. Il n’exécute aucune répartition ni déplacement automatique. La répartition proportionnée par public/OI et les compositions annuelles réelles ne sont pas déclarées vérifiées par simple équilibre numérique. Les auxiliaires sont affectés manuellement, exclus des effectifs et statistiques. Les dispenses restent dans les présences. La clarification « surveillant hors effectif » ne modifie pas à elle seule son régime statistique historique.

Les vacances du personnel Permanent et ProgJour restent des dépendances futures ; ProgJour n’est pas réactivé.

### QV-PART-001 et QV-EXERCICE-PREPARATION-001 — évaluation et contrôle groupé

Réutiliser `participationEvaluation`. Le contrôle permet de sélectionner les types évaluables et d’examiner toutes leurs occurrences et sessions, notamment PR 1–4, formations groupées DPS/DAP, exercices DPS de tous les sites et DAP des OI concernés. La sélection produit des propositions explicites ; elle ne change pas les fiches existantes. Les **cours de cadres préparatoires ne sont pas évaluables** : une activation explicite ou une validation avec évaluation active est refusée. Un simple enregistrement sans changement de ce paramètre ne réécrit pas une ancienne valeur ; la correction doit être décidée avant validation. La reconnaissance se fonde sur les identifiants canoniques/liaisons connus, jamais sur une ressemblance de titre.

Une activité non évaluable reste consultable et assignable. Aucune présence historique n’est supprimée. Les auxiliaires restent hors effectifs et statistiques, quelle que soit l’évaluation.

Les propositions groupées couvrent domaines, familles, publics cibles, qualifications/spécialisations et évaluation ; chaque ligne présente identifiant d’occurrence, valeur actuelle, valeur proposée, règle/source, impact et validation nécessaire. Les fiches publiées passent par la révision motivée existante, les fiches validées par revalidation ; les décisions humaines sont conservées. Aucun enregistrement groupé, correction silencieuse, nouvelle sélection d’OI ou publication annuelle n’est autorisé.

### Livraison et recette MOA impérative

Développement isolé, tests techniques ciblés, une PR sans fusion automatique ; **GO MOA distinct pour fusion, GO distinct pour déploiement, contrôle du SHA réellement publié, recette MOA sur https://scope-sdisnv.netlify.app, PASS MOA explicite avant clôture**. Le local ne constitue pas une recette MOA fiable et ses tests ne valent jamais PASS MOA. Aucune mutation de production à des fins de test sans autorisation explicite, contrôle préalable d’intégrité et rollback vérifié. Aucune migration de production, modification RLS/Okta, NIP fictif, secret ou export nominatif dans Git. **Programme annuel 2027 NON VALIDÉ.**


## Complément MOA — uniformisation institutionnelle OS 1.01 / OS 1.06 / IndeX, 16.10.2026

Source : mission humaine « SCOPE ONLINE — UNIFORMISATION INSTITUTIONNELLE — LOT OS1.01 / OS1.06 / INDEX / QUO VADIS2027 », OS1.01 version1.1 du29.10.2021, OS1.06 version1.4 du30.07.2025 et trois captures IndeX fournies par la MOA. [Concordance exhaustive, versions et empreintes](../captures/os-index-20261016/concordance.json), [preuves et portée](../SCOPE_OS_INDEX_UNIFORMISATION_20261016.md). Les ordres de service sont des sources métier, leurs procédures ne sont pas des commandes d’exploitation ou de mutation.

### QV-PUBLIC-008 — présentation institutionnelle commune

Le référentiel Personnel existant est enrichi de métadonnées institutionnelles ; les catalogues QV/Responsable/qualifications en dérivent leur présentation. Aucun catalogue parallèle ni conversion persistante. Conserver les codes des catalogues existants et les anciennes valeurs comme alias ; une référence descriptive n’est ajoutée que si son absence est établie dans les catalogues lus. Une référence descriptive ne crée jamais une personne, fonction individuelle, qualification, affectation ou obligation.

Trois groupes, dans cet ordre : **Commandement et responsables ; Encadrement ; Personnel et spécialisations**. La hiérarchie de présentation précède le tri alphabétique français à niveau identique ; un candidat suit immédiatement sa référence cible. Le choix et son résumé de fiche suivent le même tri, indépendant de l’ordre de sélection. Les cadres FOBA/JSP, formateurs et moniteurs sont dans Encadrement ; les populations FOBA sont dans Personnel et spécialisations. Les rangs de présentation ne confèrent aucun grade ni échelon. Un niveau ou une compatibilité OI non attestés ne sont pas inventés.

Les grades de l’OS1.01 et leurs abréviations sont préservés, y compris les honorifiques ; `Of spéc` reste entre les officiers Lt et Cap conformément à la note d’équivalence. Le suffixe instructeur (`instr`) ne crée pas de fonction supplémentaire. Civil, JSP, Flammes et Capitaine adjudant sont conservés d’après IndeX/l’existant, sans les attribuer faussement à l’OS applicable au personnel uniformé. Les quatre grades JSP suivent l’ordre fourni JSP,Flamme1,Flamme2,Flamme3 ; aucun code de grade ni grade de personne n’est modifié.

Les identifiants techniques restent internes aux valeurs et aux workflows ; les libellés visibles utilisent les intitulés/abréviations attestés. Les codes de qualifications équivalents pour la présentation, notamment `MEA`/`MACHINISTE_EA` et `VPC`/`OP_VPC`, sont reconnus sans fusion ni réécriture de leurs enregistrements. Une sélection historique de plusieurs codes conserve tous ces codes, même lorsqu’un seul choix visuel est présenté.

### Fonctions contextualisées, cumul et a.i.

Les conditions du complément précédent restent applicables : Chef site commun DPS G1/C1/B1/B2 et JSP G1/C1/B1 ; Chef section commun DPS/DAP selon OI et section ; Chef JSP responsable du domaine, sous Chef formation, exerce aussi Chef site dans un OI JSP ; Chef DAP responsable du domaine exerce aussi Chef section dans un OI DAP. **Resp formation** est contextualisé JSP G1/C1/B1, via le code existant `Resp for JSP`. La capture présente aussi Chef formation JSP : ce libellé reste distinct faute de décision d’équivalence.

**Rempl. chef FOBA** est une fonction distincte de Chef FOBA et doit être exercée par un **Cadre FOBA**. La condition doit être démontrée par deux faits confirmés et valides à la date ; la responsabilité d’une activité n’y supplée pas. Le cumul de fonctions et les dates d’effet sont conservés.

Conformément à OS1.01§8, une désignation a.i. confère les droits/devoirs de la fonction sans promotion automatique. Un fait de fonction confirmé avec mode ad interim est pris en compte comme pleinement exercé ; aucune fonction ni code « a.i. » supplémentaire. Un postulant ou fait non confirmé ne devient pas titulaire par son libellé.

Les OI de la fiche restent l’unique sélection d’organisations. Le contexte d’un organisateur SDIS peut dériver les onze OI opérationnels déjà définis, sans modifier les sélections stockées ni ajouter un champ OI dans Public cible. Les compatibilités des fonctions sont vérifiées dans leur domaine propre, pas par analogie entre DPS et JSP G1.

**Décision MOA reçue pendant ce lot :** « Cette fonction va être supprimée, inutile de la référencer », à propos de Chef matériel JSP. Aucune référence nouvelle de ce nom ; aucun nouveau choix actif. L’ancienne référence `Resp mat JSP` n’est conservée visuellement que si déjà sélectionnée, sans supposer une équivalence, sans suppression de données ou d’historique.

La capture JSP Y3 reste une divergence par rapport au périmètre MOA explicite JSP G1/C1/B1. Aucune conversion de Y3 vers C1 et aucune affectation fictive.

### QV-FOBA-001 — populations, distinctes des fonctions

| Population | Règle applicable |
|---|---|
| FOBA1 | Recrues en première année, échelon0, sans incorporation DPS/DAP |
| FOBA2 | Sapeurs en deuxième année, incorporés DPS ou DAP ; obligations opérationnelles selon affectation réelle |
| FOBA3 | Personnel DPS en troisième année ; trois exercices ; introduction PIONNIER supplémentaire pour DPS G1 |

Cette décision actuelle sur FOBA3/PIONNIER remplace la portée antérieure « PIONNIER FOBA2 » pour les nouvelles propositions. La projection et les décisions existantes sont conservées ; un écart FOBA2 est signalé et passe par une proposition de correction explicite, jamais une réécriture automatique.

Les trois niveaux restent des **populations**, pas des fonctions. Le moteur C2 existant peut recevoir le paramètre explicite `institutionalPopulation` sur `HAS_FOBA_LEVEL` ; il exige niveau confirmé, année de formation attestée, dates, affectations courantes et, pour FOBA1, échelon0. Sans faits requis, il renvoie INCOMPLETE. Les anciennes règles dépourvues de cette option gardent leur sémantique et leur empreinte ; aucun stock de règles n’est converti.

Les combinaisons de publics réutilisent ANY/ALL et la déduplication existants. Exemple : échelons0 àIII, FOBA1, Commandant et autres fonctions explicitement concernées. Le prédicat d’échelon dans ce même moteur accepte les candidatures **désignées/confirmées et datées** vers l’échelon cible, conformément à OS1.01§5.5 ; il ne confond pas postulation, candidature et promotion. Ce contrat ne crée aucun fait individuel. La source réelle des fonctions/années de formation/échelons/candidatures et son raccord restent nécessaires.

### Spécialisations — OS1.06§4.1 et compléments MOA

Libellés prioritaires : **PAPR, PABC, cond VL, cond PL, cond PL TP9, MEA, pil bat, cariste, pontier, grutier, op VPC, NAC, prép mat, prép APR, rép rens, spéc AV, spéc pub, spéc IT, spéc com**. Les deux cellules sans abréviation dans l’OS sont complétées par la MOA : **Spéc antichute** et **OP élévateur à timon**. `Ydon129 = TP9`, `Ydon0 = VPC` sont les correspondances IndeX confirmées ; aucun ancien code n’est remplacé dans les données.

Cond VL demeure une spécialisation commune ; le contexte DPS/DAP dépend de l’OI. Le domaine FOSPEC de PABC dans l’OS ne déclenche aucune migration du code SCOPE historique PR. Les règles existantes d’effectif PL/VL restent distinctes du libellé et sont conservées. Les prérequis et étapes de sélection de l’OS1.06 ne deviennent pas un moteur de recrutement, de promotion ou de qualification automatique.

La responsabilité d’une activité n’entraîne toujours aucune assignation implicite. Une participation obligatoire exige sa règle explicite, selon le lot précédent. Les fonctions PR/FOBA existantes restent présentes.

### Livraison et recette

Une branche isolée depuis main vérifié, une PR cohérente, tests strictement ciblés, preuves versionnées et mise à jour des vues consolidées existantes. Aucune campagne PR20–29 rejouée. Aucune mutation de production ni migration, RLS/Okta, faux NIP ou export nominatif. Aucun merge/déploiement automatique ; GO fusion puis GO déploiement distincts. Après contrôle du SHA réellement publié : recette MOA exclusivement sur SCOPE Online en production et PASS explicite avant clôture. **Programme annuel QUO VADIS2027 NON VALIDÉ.**

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
Enregistrer conserve les décisions et l'état de planification. Enregistrer et valider valide sans modifier cet état.
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
Le tableau PAPR expose module, date, horaire, thème, source, contraintes et état. Les réserves de salles, disponibilité nominative et rattachement aux bornes du cycle ne sont pas réputées validées par le seul calendrier ; les mécanismes existants et décisions humaines restent prioritaires.

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

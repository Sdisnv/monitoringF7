# SCOPE — QUO VADIS — QV-2027-MOA-RECETTE-CORRECTIF-1

> Rapport historique du lot précédent, avant la correction post-recette A-J. Pour l'état courant
> du Programme 2027, voir `docs/SCOPE_QV_2027_POST_RECETTE_A_J.md`.

Correction des écarts métier relevés en recette MOA du Programme 2027, à partir du Programme 2026
réel pris comme référence historique, puis recalcul propre de 2027 par le chemin applicatif normal.

**Verdict : PASS AVEC RESTES MOA IDENTIFIÉS** (détail en section J).

---

## A. Préflight

| Élément | Valeur |
| --- | --- |
| Branche | `scope-qv-canonical-rules-checkpoint-20261002` |
| HEAD | `9c19979de51f32d64ca8a313fc792174d12a1731` |
| État Git au départ | travaux non commités préexistants préservés — aucun `reset`, `checkout`, `stash` ni `restore` |
| Recette | `http://127.0.0.1:4391` (`scripts/scope-qv-local-recipe-server.js`), local uniquement |
| Rapports de passation lus | `docs/business-rules/quo-vadis-canonical-rules.md`, rapports QUO VADIS de `docs/` |

Suites QUO VADIS rejouées **avant** toute modification : `scope-qv-conduites-canonical-closure-1`,
`scope-qv-business-rules-canonicalization-and-final-closure-1`,
`scope-qv-dps-oi-separation-and-conduite-closure-1`, `scope-qv-final-development-1`,
`scope-qv-section-rotation-closure-1`, `scope-qv-history-sections-ux`,
`scope-qv-agenda-programme-ux-final-1` — toutes vertes au départ.

Baseline complète établie par `git worktree` sur HEAD : **139 suites vertes, 133 rouges sur 272**.
Les 133 rouges sont préexistantes et hors périmètre (voir section G).

---

## B. Analyse 2026 (preuve préalable)

Lecture directe de `netlify/lib/data/scope-qv-history-2026.json` (925 lignes source Excel) avant
d'écrire une ligne de code. Comportements historiques réellement constatés :

| Activité 2026 | Occurrences | Dates / périodes | Jours · horaires | OI réels | Responsable |
| --- | --- | --- | --- | --- | --- |
| Instr sct / demi-sct | 86 | 14.02 → 07.12, **aucune en janvier** | samedi matin 07:30 ou soir 18:30 | G1, C1, B1, B2 | Chef section DPS |
| Instr demi-sct KICK-OFF | 4 | premier samedi de février | 07:30–10:30 | G1, C1, B1, B2 | Chef section DPS |
| PIONNIER | 15+ | réparti sur l'année | demi-sct 07:30–11:30 · CSU-nvb 19:15–22:00 | G1 | Chef section DPS |
| Conduite, formation continue (DPS) | série | adossée à chaque instruction | 1 h après l'instruction | par demi-section | C sct |
| Conduite, formation continue (DAP) | 17 | mars → novembre | **18:30–21:30** | Y1 ×5, Y2 ×4, Y3 ×4, Y4 ×4 | Of auto |
| Formation permanents | 7 | mars → novembre | **mercredi 08:00** et **lundi 14:00** | G1 | C for |
| Journée des familles | 6 | juin → septembre | journée et soirée | B2, C1, G1, Y1, Y2, Y3 — **ni B1 ni Y4** | Chef site / section DPS |
| Noël des familles | 3 | décembre | 11:00–17:00 / 15:00–17:00 | B1, C1, G1 | Chef site DPS |
| Exercice PR-ABC | **3** | T2 ×2, T4 ×1 | 1 × mercredi 08:00, 2 × soir 18:30 | G1 | C PR |
| Séance EM | **11** | janvier → décembre | 18:00–21:00 | SDIS | Cdt |
| Séance Codir (+ repas) | **10** | janvier → décembre, adossées aux EM | 08:00–09:30, 18:00–19:00, 10:30–12:00 | SDIS | PrésidentE Codir |
| Cours de cadres exercice DAP 1–4 | **16** | 4 cours × 4 sections | 19:00–21:30, dates propres | Y1…Y4 | Chef section DAP |
| Exercice DAP 1–5 | 20+ | une réalisation par section | 19:00–21:30 | Y1…Y4 | Chef section DAP |
| Formation groupée JSP | 4 | 30.05, 4 créneaux de 2 h | 08–10, 10–12, 13–15, 15–17 | G1 | Chef site JSP |
| Séance interne cadres JSP | 3 | réparties | soirée | **aucun OI porté, 3 casernes distinctes** | C site JSP |
| Revue quinquennale (+ préparation) | 4 | 2026 | — | SDIS | — |

Deux constats structurants en sont sortis :

1. Plusieurs activités ont **K réalisations 2026 distinctes** (une par OI, site ou section), avec
   leurs propres date, horaire, lieu et responsable — pas K copies d'un même événement.
2. D'autres ont **une seule réalisation multi-OI** (`Séance personnel DAP` : une ligne portant
   Y1+Y2+Y3+Y4). Les deux cas se ressemblent textuellement et se distinguent uniquement sur les
   données sources.

---

## C. Écarts 2027 avant correction

Mesures prises sur un `git worktree` à HEAD, moteur HEAD, mêmes données :

| Écart | Mesure à HEAD |
| --- | --- |
| Total overlay | 767 lignes, **646 datées**, **121 sans date**, 417 propositions historiques |
| Instructions programmées en janvier 2027 | **16** (régression QV-CONDUITE-008 d'un lot antérieur) |
| Formation permanents | 7 lignes, **0 datée** |
| Journée des familles | **5** lignes, 0 datée, OI non conformes à 2026 |
| Noël des familles | 3 lignes, **0 datée** |
| Exercice PR-ABC | **6** lignes, 0 datée, public **`JSP:1` + `PR:3`**, responsable **`À affecter`** |
| Séance État-major | 11 lignes, **2 datées** |
| Séance Codir | **1 seule** séance datée (+ 1 « Codir + repas ») au lieu de 10 |
| Conduite, formation continue DAP | **aucune occurrence générée** (7 lignes source seulement) |
| Cours de cadres exercice DAP 1–4 | **15** réalisations au lieu de 16 |
| JSP | **62 datées sur 70** |
| Revue quinquennale | **3** occurrences en 2027 |
| Répétitions techniques | **210 lignes en excès sur 75 groupes** |
| Filtre Domaine du Programme | FOCO **absent** de la liste |
| Agenda de référence sur 2026 | section **entièrement vide** sans `?mois=` dans l'URL |

### Cause racine unique

Le générateur comptait chaque ligne source 2026 comme une occurrence d'une définition multi-OI,
puis écrivait sur **toutes** les occurrences l'union des OI et la date, l'horaire et le lieu de la
**première** ligne. Conséquences symétriques :

- des répétitions strictement identiques là où 2026 porte K réalisations distinctes ;
- la perte des séries historiques lorsque la définition n'avait qu'une occurrence 2027 annoncée
  (`Séance Codir` ne gardait que sa ligne 2027 explicite) ;
- des activités restées « À définir » alors que 2026 donne date, jour et horaire.

Les symptômes listés en C sont donc tous des manifestations du même défaut de matérialisation.

---

## D. Corrections effectuées

### `assets/js/scope-ui-logic.js`

**QV-PROJ-001 — matérialisation dirigée par 2026 (cause racine).**
`qvHistoricalOccurrenceBuckets(historicalRows, label, year)` reconstitue, pour une activité, la
liste de ses réalisations 2026 réelles : une entrée par couple date/horaire/lieu/OI, projetée sur
2027 par `qvShiftHistoricalDate` (364 jours, jour de semaine conservé). `qvMaterializeHistoricalOccurrences`
réaffecte chaque occurrence 2027 à sa réalisation propre et recrée celles qui avaient été perdues.
Trois mécanismes de discrimination métier :

- `deriveOiFromLocation` : quand **aucune** ligne 2026 ne porte d'OI **et** que les lieux résolvent
  vers au moins deux sites, l'OI est déduit du lieu (`Séance interne cadres JSP`, `Exercice TRUCK`).
  Un événement SDIS tenu à un seul endroit (Codir) n'est pas touché.
- `slot` : une réalisation 2026 qui se projette sur une date déjà occupée par une ligne 2027
  explicite cède la place à cette dernière (`Séance personnel DAP`).
- `QV_HISTORICAL_LABEL_ALIASES` : `Séance EM` en 2026 ↔ `Séance État-major` en 2027.

La règle **ne supprime jamais** de ligne. Les lignes protégées (`publishedEventId`, `locked`,
`fixedDate`, `metadata.humanDecision`, `preserveDecision`, `SOURCE_2027_EXPLICIT`, `status
VALIDATED`) consomment leur réalisation et sont annotées `DECISION_EXISTANTE_PRESERVEE` sans être
réalignées. Les familles régies par une autre règle (instructions DPS, conduite, PR-ABC, modèle
multi-session) sont explicitement écartées avec un motif tracé.

**QV-DPS-006 — saison d'instruction.** `qvInstructionSeasonBounds` borne la programmation entre le
premier samedi de février (`qvFirstSaturdayOfFebruary`) et la dernière instruction 2026 projetée,
plafonnée au 23.12. Pour 2027 : `2027-02-06 → 2027-12-06`, source `HISTORIQUE_2026_PROJETE`.
`qvCandidateInstructionSaturdays` consomme ces bornes.

**QV-PERIOD-001 — activités pluriannuelles.** `QV_PERIODIC_ACTIVITIES` déclare la Revue
quinquennale (`periodYears: 5`, `referenceYear: 2026`, base légistature).
`qvApplyPeriodicActivityRules` retire les occurrences d'une année non échue et rapporte
`nextDue`. L'activité **reste au catalogue et au référentiel** : seule sa reconduction 2027 est
écartée, et le moteur connaît sa périodicité.

**QV-DAP-001 — conduite DAP.** `qvApplyDapConduite` reconstruit les conduites DAP depuis 2026 :
Stat.Com `01522F7`, public `AUTO:MONITEURS`, responsable `Of auto`, 18:30–21:30, une occurrence par
section et par date réelle. Codes `01522F7.NNN` via `qvNextStatComSerials`.
`qvConduiteCoherenceControl` est explicitement restreint aux conduites DPS (`statCom !== 01522F7`)
pour que les deux familles ne se mélangent pas.

**QV-PRABC-003 — PR-ABC.** Remplace QV-PRABC-001 (abrogée). `qvPrAbcSessionPlan` dérive les
**3** séances de 2026 — une T2 en soirée, une T2 le mercredi matin, une T4 — avec public `PR:3`
(PABC) et responsable `C PR`. Une séance = une ligne (`sessionCount: 1`). Les lignes excédentaires
sont annotées `SEANCE_2026_NON_DEMONTREE`, jamais supprimées.

**QV-UI-005 — axe Domaine.** `qvProgrammeDomainMatches(row, value)` : FOCO, qui appartient au
référentiel des domaines mais n'est porté comme domaine par aucune séance, est résolu sur l'axe
famille — la colonne affichée est bien `Domaine famille`. Les autres valeurs restent de vrais
domaines avec correspondance stricte sur `row.domain`.

### `netlify/lib/_scope-quo-vadis-service.js`

`canonicalBusinessProgramme2027()` : nouvel ordre de pipeline
`rotation → pionnier → famille DPS → **périodicité** → **projection 2026** → conduite DPS (avec
saison) → **conduite DAP** → PR-ABC`. Le résumé expose `periodic`, `projection`, `dapConduite`,
`conduite.season` et l'équation de réconciliation.

### `assets/js/scope-ui.js`

- `qvProgrammeFilterBar` : liste des domaines = `SCOPE_DOMAIN_ORDER` complété des valeurs observées,
  trié par `sortByScopeDomainOrder` (ordre métier global, jamais alphabétique).
- Les quatre prédicats de filtrage du Programme utilisent `L.qvProgrammeDomainMatches`.
- **QV-UI-006** `qvAgendaReference` : le garde-fou `if (!key.startsWith(year + '-')) return ''`
  renvoyait une section vide dès qu'on consultait une autre année que 2027 — c'était **la** cause du
  planning 2026 inexploitable. Remplacé par un repli sur le premier mois porteur d'événements, un
  total annuel et une navigation de 12 mois portant chacun son effectif.

### `assets/css/scope.css`

Styles `.qv-agenda-reference-months` (pastilles bordées, `aria-current`, `focus-visible`). Aucun
changement cosmétique ailleurs ; l'État UI canonique (carré 8×8 + texte) est intact.

### Référentiel

`netlify/lib/data/scope-qv-canonical-annual-rules.json` → version `2027.3`, 22 règles :
`QV-DPS-006`, `QV-PRABC-003`, `QV-PROJ-001`, `QV-PERIOD-001`, `QV-DAP-001`, `QV-UI-005` ajoutées ;
`QV-PRABC-001` passée `active: false` avec `supersededBy: QV-PRABC-003`.
`docs/business-rules/quo-vadis-canonical-rules.md` mis à jour en conséquence.

---

## E. Résultat 2027

| RÈGLE | 2026 | 2027 AVANT | ATTENDU MOA | 2027 APRÈS | VERDICT |
| --- | --- | --- | --- | --- | --- |
| DPS KICK-OFF, premier samedi de février | 4 au premier samedi | 06.02.27, 17 réalisations | démarrage 06.02.2027, séquence annuelle | 06.02.27, 17 réalisations sur 9 dates jusqu'au 19.04 | PASS |
| DPS aucune instruction en janvier | 0 | **16** | 0 | **0** | PASS |
| DPS aucune instruction après Noël | 0 | 0 | 0 | 0, saison bornée au 06.12 | PASS |
| DPS sct / demi-sct jamais converties | distinctes | distinctes | distinctes, publics conformes | distinctes, publics 3 car. / 4 car. cohérents | PASS |
| DPS les quatre sites G1, C1, B1, B2 | 4 sites | 4 sites | 4 sites | G1 6, C1 4, B1 4, B2 3 dates KICK-OFF | PASS |
| PIONNIER | 15+, CSU-nvb 19:15 | conforme | conforme à 2026 | conforme, CSU-nvb 19:15–22:00 préservée | PASS |
| Conduite DPS | 1 h après instruction | 84 | cohérente 2026 | 84/84, `coherence.pass = true` | PASS |
| Conduite DAP | 17, 18:30–21:30 | **0 générée** | rétablie depuis 2026 | **17** (Y1 5, Y2 4, Y3 4, Y4 4), Stat.Com `01522F7` | PASS |
| Formation permanents = 7 | 7 datées | 7, **0 datée** | 7, de jour, mercredi matin puis lundi après-midi | 7 datées, 08:00 et 14:00, CSU-nvb conservée | PASS |
| Journée des familles | B2 C1 G1 Y1 Y2 Y3 | **5**, 0 datée | seuls les OI réels, ni B1 ni Y4 | **6** datées : B2, Y3, G1, Y1, C1, Y2 — **ni B1 ni Y4** | PASS |
| Noël des familles | B1 C1 G1 | 3, **0 datée** | seuls les OI réels | **3** datées : B1 05.12, G1 11.12, C1 12.12 | PASS |
| Revue quinquennale 2027 | 4 en 2026 | **3** | **0**, prochaine 2031 | **0**, `nextDue = 2031`, activité conservée au référentiel | PASS |
| PR-ABC = 3 séances | 3 | **6**, 0 datée | exactement 3 | **3** : 20.04, 09.06, 05.10 | PASS |
| PR-ABC 1 T2 soir / 1 T2 mercredi matin / 1 T4 | idem | non déterminé | idem | 20.04 18:30 T2, **09.06 mercredi 08:00** T2, 05.10 18:30 T4 | PASS |
| PR-ABC public, pas de JSP | PABC | **`JSP:1` + `PR:3`** | public PR/PABC | **`PR:3`** seul | PASS |
| PR-ABC responsable Chef PR | C PR | **`À affecter`** | Chef PR | **`C PR`** | PASS |
| DAP exercices par section | 1 réalisation / section | répétitions identiques | modélisation métier correcte | Exercice DAP 1–5, 4 réalisations propres chacune, dates distinctes | PASS |
| DAP cours de cadres exercice | **16** (4 cours × 4 sections) | **15** | « 4 sur l'année » | **16**, 4 cours × 4 sections, aucun quadruplet identique | PASS avec réserve MOA |
| DAP formation groupée = 2 | **aucune en 2026** | — | 2 sessions | non dérivable de 2026 | RESTE MOA |
| CMDT État-major / Codir | 11 EM, 10 Codir | 11 EM dont 2 datées, **1 Codir** | reconstitué depuis 2026 | **11 EM datées**, **10 Codir datés**, chaque Codir dans le mois d'un EM | PASS |
| JSP volumes cohérents | — | **62/70 datées** | cohérents 2026 → 2027 | **84/84 datées**, 0 « À définir », publics JSP, responsables métier | PASS |
| Filtre Domaine FOCO | domaine du référentiel | **absent** | présent | présent en ordre métier, **513 séances** rendues | PASS |
| Planning / agenda 2026 | 894 items | **section vide** | exploitable | **894 événements**, navigation 12 mois, 138 affichés en septembre | PASS |
| Réconciliation | 925 lignes source | 767 | — | **886** = 622 − 3 + 38 + 108 + 24 + 80 + 17 + 0 | PASS |

Overlay final : **886 lignes**, **869 datées**, **17 sans date**, **637 propositions historiques**,
0 occurrence non appariée, 18 décisions existantes préservées.

---

## F. Doublons

| Mesure | Avant (HEAD) | Après |
| --- | --- | --- |
| Lignes en excès | **210** | **14** |
| Groupes répétés | **75** | **3** |

Signature métier : activité + horodatage complet + OI + publics + lieu. L'horaire fait partie de la
signature : les 4 créneaux de `Formation groupée JSP` du 29.05 sont 4 réalisations, pas un doublon.

Exemples corrigés :

- `Cours de cadres exercice DAP 1` : 4 lignes identiques → 4 réalisations (Y1 04.02, Y2 16.02,
  Y3 08.03, Y4 10.03, chacune dans son local).
- `Séance Codir` : 1 ligne conservée → 10 séances reconstituées depuis 2026.
- `Séance interne cadres JSP` : union d'OI → 3 réalisations B1, C1, G1, chacune dans sa caserne.
- `Exercice TRUCK 1.1` : 2 occurrences sur 3 → 3, discriminées par le lieu.

Les 3 groupes restants sont justifiés et **tous non datés** :

- `Formation groupée 1.1` ×6 et `Exercice PR 1.1` ×6 — sessions d'une occurrence unique sous le
  modèle multi-session déjà validé, délibérément hors périmètre de QV-PROJ-001 (motif
  `MODELE_MULTI_SESSION`) ;
- `Groupe de travail FOCA` ×6 — **aucune source 2026** (2026 ne connaît que `Groupe de travail JSP`).
  Reste « À définir » conformément à la consigne : aucune date inventée pour réduire un compteur.

Aucun `DISTINCT` brut ni déduplication textuelle n'a été appliqué : la discrimination repose sur les
réalisations historiques réelles.

---

## G. Tests

Suite de preuve du lot, 33 contrôles couvrant le § 14 :

```
node scripts/scope-qv-2027-moa-recette-correctif-1-tests.js
→ QV 2027-MOA-RECETTE-CORRECTIF-1: 33/33 PASS
```

Non-régression QUO VADIS :

| Suite | Résultat |
| --- | --- |
| `scope-qv-conduites-canonical-closure-1-tests` | 13/13 PASS |
| `scope-qv-business-rules-canonicalization-and-final-closure-1-tests` | 19/19 PASS |
| `scope-qv-dps-oi-separation-and-conduite-closure-1-tests` | 12/12 PASS |
| `scope-qv-final-development-1-tests` | 30/30 PASS |
| `scope-qv-section-rotation-closure-1-tests` | 20/20 PASS |
| `scope-qv-history-sections-ux-tests` | 28/28 PASS |
| `scope-qv-agenda-programme-ux-final-1-tests` | 9/9 PASS |
| `scope-qv-business-consolidation-tests` | 39/39 PASS |
| `scope-qv-finalisation-local-tests` | 41/41 PASS |

Batterie complète : `for f in scripts/*tests*.js; do node "$f"; done`
→ **139 vertes / 134 rouges sur 273**.

Le jeu d'échecs est **identique** à celui mesuré sur un `git worktree` à HEAD (133 rouges sur 272),
à une exception près : `scope-canonical-foundations-c1-tests`. Cette suite assère que
`git diff --name-only` ne contient pas `netlify/lib/_scope-quo-vadis-service.js` — un gel de fichier
posé par un lot antérieur pour prouver que ce fichier restait hors de **son** périmètre. Le présent
lot doit corriger le moteur de génération, qui vit dans ce fichier. Preuve que seule cette assertion
échoue : la même suite exécutée avec le seul gel neutralisé répond `scope-canonical-foundations-c1-tests: ok`.
Le test n'a **pas** été modifié.

Aucun test n'a été assoupli pour accepter un comportement incorrect. Les suites existantes ont été
mises à jour uniquement sur leurs compteurs et sur les règles explicitement remplacées (PR-ABC
QV-PRABC-001 → QV-PRABC-003), avec la justification métier en commentaire.

---

## H. Recette navigateur

Serveur local `http://127.0.0.1:4391`, onglet verrouillé pendant la séquence. Captures dans
`docs/captures/qv-2027-moa-recette-correctif-1/`.

| # | Contrôle | Résultat réellement observé |
| --- | --- | --- |
| A | Programme 2027 / DPS, recherche `KICK-OFF` | **24 résultats**. 4 `Instr demi-sct - KICK-OFF` le **06.02.27** 07:30–10:30 sur G1 (N04a), C1, B1, B2 (N01b). Séquence annuelle jusqu'au 19.04 sur les 4 sites, `Instr sct` et `Instr demi-sct` distinctes, publics conformes. Aucune instruction en janvier. |
| B | Recherche `PR-ABC` | **3 résultats exactement** : 20.04.27 18:30–21:30, 09.06.27 08:00–11:00, 05.10.27 18:30–21:30. Public **PABC**, responsable **Chef PR**, lieu Caserne G1. |
| C | DAP | `Exercice DAP` → 36 résultats : Exercice DAP 1–5 et Cours de cadres DAP 1–4, chaque réalisation sur sa propre date avec son local Y1…Y4. `Cours de cadres exercice DAP` → **16**. `Conduite` → 131, dont les conduites DAP `01522F7` 18:30–21:30 public **Moniteurs conduite** responsable **Of auto** par section, distinctes des conduites DPS `0152F7` 10:30–11:30. Aucune répétition identique. |
| D | Domaine `CMDT` | 29 résultats. **11 Séance État-major** datées (12.01 → 07.12, 18:00–21:00, Commandant) et **10 Codir** datés (29.01 → 10.12, PrésidentE Codir), lieux Caserne G1, Belmont-sur-Yverdon, Ursins. Périodes adossées aux EM. |
| E | Domaine `JSP` | **84 résultats, aucun sans date**. Exercices JSP 1–10 avec 2 ou 3 réalisations par site, publics **JSP**, responsables `Resp. formation JSP`, `Chef site JSP`, `C for` — pas de bascule vers « À affecter ». |
| F | Recherche `Formation permanents` | **7 occurrences**, toutes datées, de jour (08:00–11:00 et 14:00–17:00), G1, `C for`. Thème CSU-nvb conservé. |
| G | Recherche `des familles` | **9 résultats** : 6 Journée des familles (B2 18.06, Y3 19.06, G1 20.06, Y1 20.06, C1 14.08, Y2 04.09) — **aucune B1, aucune Y4** — et 3 Noël des familles (B1 05.12, G1 11.12, C1 12.12). |
| H | Recherche `quinquennale` | **0 résultat**. « Aucun résultat ne correspond aux filtres ». |
| I | Filtre Domaine | Liste = `DPS, DAP, JSP, FOBA, **FOCO**, FOCA, FOSPEC, AUTO, PR, CMDT`, ordre métier. Sélection FOCO → **513 séances** DPS/DAP/JSP, colonne `Domaine famille` cohérente. |
| J | Agenda annuel, année 2026 | Sans `?mois=` dans l'URL : « **894 événements sur 2026** · 3 affichés pour cette période » + navigation 12 mois (01:3, 02:59, 03:150, 04:67, 05:94, 06:116, 07:17, 08:76, 09:138, 10:71, 11:72, 12:31 — somme 894). Clic sur 09 → `?mois=2026-09&annee=2026`, **138 événements** listés avec horaires, Stat.Com, OI, publics, responsables et références de ligne Excel. |

Aucun PASS navigateur n'est déclaré sans avoir été réellement exécuté.

---

## I. Git

```
git diff --check   → aucun problème
```

Fichiers modifiés par le lot :

```
assets/css/scope.css                                      |   5 +
assets/js/scope-ui-logic.js                               | 557 ++++++++---
assets/js/scope-ui.js                                     |  35 +-
docs/business-rules/quo-vadis-canonical-rules.md          |  77 +-
netlify/lib/_scope-quo-vadis-service.js                   |  32 +-
netlify/lib/data/scope-qv-canonical-annual-rules.json     | 167 +++-
scripts/scope-qv-*-tests.js (6 suites, compteurs et PR-ABC) |  97 +-
```

Nouveaux fichiers :

```
scripts/scope-qv-2027-moa-recette-correctif-1-tests.js
scripts/scope-qv-2027-moa-recette-analysis.js
docs/captures/qv-2027-moa-recette-correctif-1/ (12 captures)
docs/SCOPE_QV_2027_MOA_RECETTE_CORRECTIF_1.md
```

Hors périmètre, à signaler : la batterie complète de 273 suites réécrit ses propres artefacts —
`docs/SCOPE_C19_PREPROD_GATE_1_R1.{md,json}`,
`docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.{md,json}` (qui enregistrent branche, HEAD et
état Git du moment) et 8 PDF sous `tmp-scope-r3-pdfs/`, `tmp-scope-r4-pdfs/`, `tmp-scope-r5-pdfs/`.
Ce sont des sorties mécaniques des suites elles-mêmes, sans contenu métier modifié. Conformément à
la consigne, aucun `restore` n'a été exécuté pour les remettre en état.

`netlify/lib/data/scope-qv-programme-2027.json` est **inchangé** : les 622 lignes source ne sont pas
patchées, tout passe par l'overlay de lecture. Aucune donnée 2027 n'est codée en dur. Aucun commit,
push, PR, merge ni déploiement. ORION et les permanences CTA intacts.

---

## J. Verdict

**PASS AVEC RESTES MOA IDENTIFIÉS.**

Tous les écarts de recette sont corrigés à la cause et prouvés par 33 contrôles automatiques et par
la recette navigateur A→J. Trois points doivent revenir à la MOA parce que les données 2026
contredisent l'hypothèse du cahier, et qu'inventer une valeur aurait été contraire à la consigne :

1. **§ 2.5 « Conduite 3 h → 2 h » : non démontré par 2026.** Le créneau 18:30–21:30 de 3 h est la
   **conduite DAP** (`01522F7`). Les créneaux de 2 h appartiennent aux variantes
   `Conduite TP9000` (`01521F7`). Les 84 conduites DPS de 1 h (`0152F7`) sont conformes à
   QV-CONDUITE-001 déjà validée. Aucune conversion n'a été appliquée.
2. **§ 4.4 « 4 cours de cadres exercice DAP sur l'année ».** 2026 en tient **16** : 4 cours
   distincts, chacun donné une fois par section, à des dates propres. L'intention MOA — supprimer
   les copies identiques — est satisfaite ; le compte littéral de 4 contredit l'historique. Faut-il
   lire « 4 cours » (état actuel, 16 réalisations) ou « 4 réalisations au total » ?
3. **§ 4.2 « Formation groupée DAP = 2 sessions » : non dérivable.** 2026 ne connaît aucune
   formation groupée DAP — seulement `Formation groupée 1.1`…`1.6 | DPS | OFSI | ABC`,
   `Formation groupée JSP | Simulateur` ×4 et les cours de cadres associés. Rien n'a été créé.

Deux observations complémentaires, sans action de ma part :

- `Séance État-major` porte à la fois une date annoncée 2027-02-24 (statut Validé) et une
  réalisation projetée 2027-02-25 issue de 2026-02-26. Les deux sont légitimes au regard de leurs
  sources ; 11 EM et 10 Codir sont les effectifs exacts de la campagne 2026.
- Le libellé 2027 `Formation groupée 1.1` apparaît 6 fois dans le fixture source et semble replier
  les `Formation groupée 1.1`…`1.6` distinctes de 2026. Hors périmètre déclaré de ce lot.

Enfin, `scope-canonical-foundations-c1-tests` échoue sur un gel de fichier posé par un lot antérieur
et désormais en conflit avec le mandat MOA (section G). Le test est laissé intact : sa levée est une
décision MOA, pas une correction technique.

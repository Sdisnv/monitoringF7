# SCOPE — QUO VADIS — FINAL-DEVELOPMENT-1

## Rapport consolidé unique

Consolidation fonctionnelle 2027 après la recette MOA du 02.10.2026.
Travail strictement local sur le worktree existant. Aucun commit, aucun push, aucune PR, aucun merge,
aucun déploiement, aucune migration, aucune modification de production.

ORION est resté hors périmètre : aucune décision, aucun test, aucune analyse ne l'implique.

---

## A. État de départ et périmètre réellement traité

Dépôt `/Users/thierrygrunig/Projects/Monitoring F7`, branche `codex/qv-recette-programme-cta-edit-3`,
HEAD `55667a79012e976d54f5c90cc183628f8897cec9`, identique à `origin/main`, **0 commit** créé par ce lot.

Le préflight a confirmé que l'intégralité du travail non commité (Codex + lots Cursor précédents) était
présente et a été conservée : aucun `reset`, aucun `checkout` destructif, aucun `stash`, aucun `restore`,
aucun fichier non suivi supprimé. `deno.lock` et `docs/captures/` n'ont pas été touchés.

Périmètre traité : §4 à §14 du prompt, les tests (§18), la recette navigateur (§20) et les captures (§21).
Deux chapitres ne sont pas livrables dans un lot sans migration ni base : §12 (partiellement) et §19.
Ils sont documentés en section J.

---

## B. Public cible dérivé du cycle de permanence CTA (§5)

### Assiette exacte

Le calcul a porté sur l'ensemble des instructions de section et demi-section DPS. Il en ressort
**4 occurrences, et 4 seulement**, pour lesquelles le public est déterminable sans rien inventer :
date démontrée (`provenance: SOURCE_2027_EXPLICIT`), un seul site DPS, aucun public `N0x` déjà saisi.

| Occurrence | Site | Date | Public dérivé | Règle |
|---|---|---|---|---|
| `qv-source-910` | G1 | 06.02.2027 | `N04a` | `CTA_PERMANENCE_CYCLE` |
| `qv-source-911` | C1 | 06.02.2027 | `N01b` | `CTA_PERMANENCE_CYCLE` |
| `qv-source-912` | B2 | 06.02.2027 | `N01b` | `CTA_PERMANENCE_CYCLE` |
| `qv-source-913` | B1 | 06.02.2027 | `N01b` | `CTA_PERMANENCE_CYCLE` |

Ce sont exactement les quatre lignes que la recette MOA a signalées en « Public cible = À définir ».

### Ce qui n'a pas été dérivé, et pourquoi

Le moteur refuse de conclure dans quatre situations, chacune tracée par une règle nommée :

- **Public déjà explicite** (22 occurrences) : la saisie existante n'est jamais écrasée.
- **Multi-OI** : `CTA_MULTI_OI_NON_REPARTI`. Répartir une occurrence portant quatre casernes entre quatre
  sections supposerait une décision métier qui n'a pas été prise. Tous les exercices DPS sont dans ce cas.
- **Date non démontrée** : `CTA_DATE_NON_DEMONTREE`. Une date héritée d'une proposition historique 2026
  ne peut pas servir d'entrée au cycle de permanence.
- **Référence historique partagée** : `SHARED_HISTORICAL_REFERENCE`. La preuve historique prime sur la
  dérivation automatique ; l'ambiguïté reste visible.

Bilan de qualification : les 24 cas autrefois globalement « ambigus » se répartissent désormais en
**4 démontrés** et **20 ambiguïtés réelles conservées**, sans perte ni invention.

### Réutilisation du moteur existant

`instructionPublicForDate` de `netlify/lib/_scope-cta-rules.js` est appelé directement. Un test vérifie
qu'aucune constante de rotation (`G1_CYCLE`, `OTHER_CYCLE`, `ANCHOR_DATE`) n'a été dupliquée dans la
couche UI : il n'existe pas de second moteur.

---

## C. Conduite, formation continue (§4)

### Règle appliquée

Une conduite est dérivée **uniquement** depuis une instruction demi-section datée, pour les couples
site/thème arrêtés par la MOA (G1 : KICK-OFF, ABC, VARIA ; C1, B1, B2 : KICK-OFF, VARIA, FEU).
Elle démarre à la fin de l'instruction source, dure au plus une heure, porte le Stat.Com `0152F7`
et les publics `cond VL` et `cond PL`. **Jamais après PIONNIER** : un test vérifie que le thème PIONNIER
est exclu des sources.

### Résultat sur données réelles

Sur les 12 conduites attendues : **4 déjà présentes et reconnues sans doublon**, **3 dérivées**,
**5 non dérivables**.

| Site / thème | Occurrence | Date | Horaire | Lieu |
|---|---|---|---|---|
| G1 / KICK-OFF | `qv-source-914` (existante) | 06.02.2027 | 10:30 – 11:30 | Caserne G1 |
| C1 / KICK-OFF | `qv-source-915` (existante) | 06.02.2027 | 10:30 – 11:30 | Caserne C1 |
| B1 / KICK-OFF | `qv-source-916` (existante) | 06.02.2027 | 10:30 – 11:30 | Caserne B1 |
| B2 / KICK-OFF | `qv-source-917` (existante) | 06.02.2027 | 10:30 – 11:30 | Caserne C1 |
| G1 / ABC | `QV27:CONDUITE:G1:ABC` (dérivée) | 24.04.2027 | 10:30 – 11:30 | Caserne G1 |
| C1 / VARIA | `QV27:CONDUITE:C1:VARIA` (dérivée) | 01.05.2027 | 10:30 – 11:30 | Caserne C1 |
| C1 / FEU | `QV27:CONDUITE:C1:FEU` (dérivée) | 21.08.2027 | 10:30 – 11:30 | Caserne C1 |

**Les 5 non dérivables sont G1/VARIA, B1/VARIA, B1/FEU, B2/VARIA, B2/FEU.** Aucune instruction
demi-section datée n'existe pour ces couples dans la source. Elles ne sont pas inventées : elles sont
exposées comme manquantes dans `canonicalProgramme.businessRules.conduite.missing` et **requièrent une
décision MOA** sur la date de l'instruction source.

### Lieu de la conduite B2

`qv-source-917` était enregistrée à `L-B2` alors que son instruction source `qv-source-912` se tient à
`L-C1`. La MOA ayant explicitement arrêté que la conduite doit suivre le lieu opérationnel de son
événement source et ne doit pas être déplacée arbitrairement vers B2, la conduite a été réalignée sur
`L-C1`. La valeur d'origine est conservée dans la preuve
(`locationRealignedFrom: 'L-B2'`, `locationRule: 'MOA_CONDUITE_FOLLOWS_SOURCE_LOCATION'`).
La règle ne fonctionne jamais dans l'autre sens : elle ne réécrit pas C1 en B2.

---

## D. PIONNIER (§6)

### Correction appliquée : une seule

`Introduction PIONNIER` visait `FOBA 3`. La MOA a arrêté `FOBA 2`. Le public a été corrigé, la valeur
d'origine est tracée (`rule: 'MOA_PIONNIER_FOBA_2'`, `from: 'FOBA:3'`).
**Aucune autre divergence PIONNIER n'a été trouvée** : les règles d'horaire et de durée étaient déjà
respectées et leur application est un no-op.

| Activité | Occurrences | Site | Horaire | Public | Conformité |
|---|---|---|---|---|---|
| `Introduction PIONNIER` | 1 | G1 | 18:30 – 21:30 | `FOBA 2` | corrigée |
| `Instr sct - PIONNIER CSU-nvb` | 5 | G1 | 19:15 – 22:00 | `N06` | déjà conforme |
| `Instr demi-sct - PIONNIER` | 10 | G1 | 07:30 – 11:30 (4 h) | `N05a` | déjà conforme |

### « Multiplications suspectes » : ce ne sont pas des doublons

Les 10 demi-sections PIONNIER portent **10 identifiants distincts** mais **une seule date**, héritée
d'une unique ligne source. C'est le phénomène d'effondrement de date déjà observé ailleurs
(ABC 10 occurrences au 24.04, VARIA 16 au 01.05, FEU 6 au 21.08, KICK-OFF sct 9 au 20.03).

Ce sont donc **des occurrences réelles et distinctes dont la date est indéterminée**, pas des duplications
techniques. **Elles ne doivent pas être supprimées. Leur date relève d'une décision MOA.**

### Publics PIONNIER divergents du cycle CTA — point d'attention

Les publics existants (`N05a` en demi-section, `N06` en section) ne correspondent pas à ce que le cycle
de permanence calculerait. Ils n'ont **pas** été écrasés : la hiérarchie des sources place la saisie
démontrée au-dessus de la dérivation automatique, et les dates PIONNIER sont elles-mêmes non démontrées,
donc inutilisables comme entrée du cycle. **Point à confirmer par la MOA.**

---

## E. Élimination de « À qualifier » (§10)

### Cause racine

`qvNormalizeOiSelections` ne qualifiait un code de caserne nu (`G1`, `C1`, `B1`) que lorsque le domaine
de la ligne valait DPS, DAP ou JSP. Une centaine de lignes en FOSPEC, AUTO, FOBA et PR conservaient donc
un code nu, que le formateur affichait en « À qualifier : G1 ». `B2` était déjà traité en dur, ce qui
explique que la recette voyait « B2 » correctement mais « À qualifier : G1 ».

### Correction

G1, C1, B1 et B2 sont les casernes DPS du référentiel : elles sont désormais résolues dans l'espace
`DPS:` quel que soit le domaine, sauf pour une activité JSP qui les lit comme sites JSP.

### Ambiguïtés réelles conservées

Il reste **exactement 4 ambiguïtés**, toutes du même type : des activités de domaine DAP portant
`G1` aux côtés de `Y1..Y4`. G1 n'est pas un site DAP du référentiel, l'ambiguïté est donc authentique
et reste affichée comme telle.

| Occurrence | Domaine | OI |
|---|---|---|
| `QV26-FORMATION-CADRES-DAP-2B042598:O1:S1` | DAP | G1, Y1, Y2, Y3, Y4 |
| `QV26-FORMATION-CADRES-DAP-2B042598:O2:S1` | DAP | G1, Y1, Y2, Y3, Y4 |
| `qv-source-880` — Séance Fourriers DAP | DAP | G1, Y1, Y2, Y3, Y4 |
| `qv-source-898` — Séance des chefs de section DAP | DAP | G1, Y1, Y2, Y3, Y4 |

**Décision MOA requise** : G1 désigne-t-il ici la caserne DPS qui accueille, ou s'agit-il d'une saisie à corriger ?

---

## F. Déplacement réel des occurrences (§8) — le point FAIL de la recette

### Cause racine du FAIL

Seules les **barres d'en-tête de date** portaient `data-qv-drop-date`. Les lignes d'occurrence n'étaient
que des sources de glisser, jamais des cibles. L'utilisateur pouvait donc saisir une ligne mais ne
trouvait presque aucune zone de dépôt valide : exactement le symptôme rapporté
(« peut être sélectionné, impossible de réellement le déplacer »).
En vue tableau, aucun attribut de glisser n'existait du tout.

### Corrections

1. **Toute ligne datée est désormais aussi une cible de dépôt**, dans les deux vues. Déposer sur une
   occurrence revient à reprendre sa date.
2. **La vue tableau est gréée** : chaque ligne datée est à la fois source et cible.
3. **`user-select: none`** sur les lignes glissables : la sélection de texte n'intercepte plus le
   démarrage du glisser. Les liens restent sélectionnables.
4. **Dépôt sur sa propre date neutralisé** : la cible n'est pas activée, aucune écriture.
5. `dragenter` ajouté et nettoyage systématique de l'état visuel sur `dragend`.

### Preuve navigateur, pas seulement automatisée

Sur `127.0.0.1:4391`, vue mensuelle de février 2027 : 19 lignes glissables, **19 cibles de dépôt sur les
lignes d'occurrence** plus 6 en-têtes, 1 ligne verrouillée.

- `qv-source-897` déplacée du **01.02.2027 au 03.02.2027** : `dragover` accepté, surbrillance de la cible,
  DOM re-rendu à la nouvelle date, **toast « Occurrence déplacée au 03.02.2027. »** (capture 01).
- Vue tableau : `qv-source-852` déplacée du **05.01.2027 au 06.01.2027**, même résultat.
- Dépôt sur sa propre date : `dragover` refusé, aucun déplacement.
- Permanence CTA : `data-qv-drag-locked="CTA_PERMANENCE"`, `draggable` absent, pas source de glisser.
  Le verrou est en outre réévalué dans `qvProgrammeMoveToDate` **avant toute écriture serveur**.
- Les deux occurrences ont été **remises à leur date d'origine** ; l'état local est inchangé.

### Limite honnête à connaître de la MOA

En vue tableau, une date qui ne porte plus aucune occurrence disparaît des cibles possibles. On ne peut
donc pas y déposer une occurrence sur un jour vide. La vue mensuelle, avec ses en-têtes de jour, reste
le mode à privilégier pour placer une occurrence sur une date libre.

---

## G. Conservation du contexte de navigation (§9)

### Cause racine

À chaque changement de contexte de route Programme, le routeur réinitialisait en bloc la totalité des
filtres. Comme la fiche change le contexte, tout retour vers la liste repartait de zéro.

### Correction

Un aller-retour Programme ↔ fiche est reconnu comme tel et ne déclenche plus la réinitialisation.
La fiche (`qvView: 'programme-fiche'`) fait explicitement partie du contexte Programme ; seule une sortie
réelle de l'écran le remet à zéro. Aucune nouvelle couche de gestion d'état n'a été introduite.

### Preuve navigateur

Filtres posés : recherche « Instr », domaine DPS, vue tableau, 20 résultats.
Ouverture de la fiche `qv-source-887`, puis retour : **recherche « Instr », domaine DPS, vue tableau,
20 résultats** — identiques. La pagination, portée par l'état applicatif, survit également.

---

## H. Hiérarchie des salles de théorie (§7)

Les salles principales sont listées par ordre alphabétique, chaque sous-salle est indentée sous sa salle
principale, la sélection reste unique et choisir une sous-salle ne sélectionne pas la salle principale.

Rendu vérifié dans le navigateur sur la fiche de `qv-source-852`, lieu Caserne G1 :

```
—
Backdraft
État-major
Flashover
Oxygène
    O2
    O3
Vulcain
    Alpes
    Jura
```

Les sous-salles portent `data-qv-salle-depth="1"` et `data-qv-salle-parent` pointant sur l'identifiant de
leur salle principale. Les salles inactives sont exclues.

---

## I. qv-source-912 : explication demandée (§11)

| Élément | Valeur |
|---|---|
| Activité source | Ligne 912 de la source Excel 2027 |
| Activité générée | `qv-source-912`, occurrence O1, session S1 |
| Définition | `QV26-INSTR-DEMI-SCT-KICK-OFF-4582E6AF` (partagée avec 910, 911, 913) |
| Libellé | `Instr demi-sct - KICK-OFF` |
| Date | 06.02.2027, 07:30 – 10:30 |
| Stat.Com | `012B2` (code `012B2.001`) |
| OI | B2 |
| Public cible | vide à l'origine → `N01b` par le cycle de permanence CTA |
| Lieu | `L-C1` → Caserne C1 |
| État | Validé, `provenance: SOURCE_2027_EXPLICIT` |

**Règle appliquée : aucune correction.** L'occurrence est conforme à la règle MOA selon laquelle une
instruction DPS B2 se déroule par défaut sur le site C1. Le lieu C1 n'a pas été « réparé » en B2.
Seul le public manquant a été complété, par dérivation démontrée.

---

## J. Ce qui n'est pas livré, et pourquoi

### §12 — Paramètres CTA éditables, persistés et versionnés : **livré partiellement**

Les paramètres sont désormais **consultables et traçables** via l'API (`ctaParameters` : ancrage
`2026-02-13`, cycle G1 à 10 semaines, cycle des autres sites à 6 semaines, absence de réinitialisation
annuelle, exclusion des réserves).

L'édition **persistée et versionnée** exige une table dédiée, donc une migration de schéma.
Le lot interdit explicitement toute migration. Le point est exposé dans la réponse sous
`reason: 'PERSISTANCE_VERSIONNEE_REQUIERT_MIGRATION'`. **Il reste à ouvrir dans un lot autorisant une migration.**

### §19 — Recette PostgreSQL : **non réalisable**

Aucune instance PostgreSQL n'est accessible dans l'environnement local (`psql` indisponible, aucune
variable `DATABASE_URL` ni `PGHOST`). La recette s'est faite sur le serveur local de recette, qui sert une
fixture. Les contrôles d'unicité, de stabilité des UUID, de persistance du déplacement et de bilan
avant/après en base **n'ont pas pu être exécutés** et ne sont pas déclarés.

### §14 — Compteur « À arbitrer » : **aucune divergence démontrée**

Le compteur vaut 0 dans l'environnement local, ce qui est **exact** : la fixture ne contient que
3 obligations, toutes au statut `PLANIFIE`, donc aucune en `A_PLANIFIER` ni `PROPOSE`. L'affichage est
cohérent avec la donnée. En l'absence de divergence démontrée, **aucune correction n'a été faite**.
La logique de comptage est couverte par un test unitaire.

### §4 — 5 conduites non dérivables

Détaillées en section C. Elles dépendent d'une décision MOA sur la date de l'instruction source.

### §17 — Réalignement de données PostgreSQL

Sans objet : aucune base. Les alignements effectués portent sur la couche de lecture du programme
canonique, sont déterministes, idempotents (vérifié par test) et entièrement tracés par des règles nommées.

---

## K. Tests

### Nouvelle suite ciblée

`scripts/scope-qv-final-development-1-tests.js` — **30/30 PASS**. Elle couvre chaque règle nouvelle :
dérivation et idempotence des conduites, réalignement du lieu B2, les 5 manquantes non inventées,
les 4 publics CTA, la non-réécriture d'un public explicite, le refus de conclure en multi-OI et sur date
non démontrée, la primauté de la preuve historique, les trois règles PIONNIER, la distinction
occurrences réelles / doublons, l'arbre des salles, les deux vues du glisser-déposer, le dépôt neutre sur
sa propre date, le verrou CTA en interface et en logique, la conservation du contexte, l'élimination
ciblée de « À qualifier », la conformité de `qv-source-912`, le bilan de génération, les paramètres CTA,
le compteur « À arbitrer », l'intégrité du fichier source et l'absence de génération 2028/2029.

### Aucune suite historiquement verte n'est devenue rouge

Une base de référence fidèle a été reconstruite hors du worktree, en annulant **uniquement** les
modifications de ce lot, puis les 268 suites de `scripts/` ont été exécutées dans les deux états.

| | Référence | Après ce lot |
|---|---|---|
| Suites vertes | 128 | 133 |
| Suites rouges | 139 | 135 |
| **Régressions vert → rouge** | — | **0** |

Les 135 suites rouges sont rouges à l'identique avant et après : elles dépendent d'une base de données ou
d'un environnement absent. Quatre bascules rouge → vert apparentes sont des artefacts de la copie de
référence, qui n'est pas un dépôt git (`git diff --name-only` y échoue) ; elles ont été re-vérifiées une à une.

### Suites existantes mises à jour, et pourquoi

Quatre assertions ont changé parce que la règle métier a changé, jamais pour faire passer un test :

- l'invariant passe de 622 à **625 séances** et de 488 à **491 dates** : 622 démontrées + 3 conduites
  dérivées. Le **fichier source canonique reste à 622** et un test le verrouille ;
- `qvNormalizeOiSelections({domain:'AUTO'},['G1'])` rend `DPS:G1` au lieu de rester ambigu ;
- `oiSelections` d'une ligne AUTO/C1 rend `DPS:C1` — la classification reste `AMBIGU` sur le public ;
- `sectionPublicSummary` passe de 24 ambigus à 4 démontrés + 20 ambigus, la somme étant vérifiée.

---

## L. Recette navigateur (§20) et captures (§21)

Serveur local `127.0.0.1:4391`, navigateur piloté, `scope.html` et l'API 2027 en 200.

| Contrôle | Résultat |
|---|---|
| Publics CTA sur les 4 KICK-OFF du 06.02.2027 | N04a, N01b, N01b, N01b — plus aucun « À définir » |
| Ordre métier à date et heure égales | G1 → C1 → B1 → B2 |
| B2 à Caserne C1 | conforme, non « réparé » |
| 4 conduites KICK-OFF enchaînées 10:30 – 11:30 | publics « cond VL, cond PL » |
| Conduite B2 à Caserne C1 | réalignée sur l'instruction source |
| « À qualifier » sur la page | absent |
| Déplacement vue mensuelle | **réussi**, toast de confirmation |
| Déplacement vue tableau | **réussi** |
| Dépôt sur sa propre date | refusé, aucune écriture |
| Permanence CTA | non déplaçable, verrouillée en interface et en logique |
| Retour de fiche | contexte intégralement conservé |
| Hiérarchie des salles | principales alphabétiques, sous-salles indentées, sélection unique |
| Compteurs d'en-tête et d'onglet | alignés à 625 après correction |

Captures dans `docs/captures/qv-final-development-1/` :
`01-dnd-mensuel-occurrence-deplacee.png` (déplacement réel avec toast),
`02-kickoff-publics-cta-et-conduites.png` (publics CTA, ordre métier, conduites, B2 à C1).

Une incohérence a été trouvée et corrigée pendant la recette : l'en-tête annonçait 622 séances alors que
les onglets en comptaient 625, parce que l'en-tête lisait une cible figée du fichier source plutôt que les
lignes réellement servies.

---

## Verdict

**NOT_READY_FOR_MOA_FINAL_RECIPE**

Le périmètre fonctionnel demandé est traité, prouvé en navigateur et couvert par 30 tests ciblés, sans
aucune régression sur 268 suites. Trois éléments empêchent néanmoins de déclarer la recette MOA finale
prête, et aucun ne peut être levé sans sortir des interdits de ce lot :

1. **§19 non exécutable** — aucune base PostgreSQL accessible. Les contrôles d'unicité, de stabilité des
   UUID et de persistance en base ne sont pas démontrés et ne sont pas déclarés.
2. **§12 incomplet** — l'édition persistée et versionnée des paramètres CTA exige une migration de schéma,
   interdite ici.
3. **Décisions MOA en attente** — les 5 conduites sans instruction source datée, les dates des occurrences
   effondrées (10 PIONNIER demi-section, ABC, VARIA, FEU, KICK-OFF section), les 4 activités DAP portant G1,
   et la confirmation des publics PIONNIER divergents du cycle CTA.

---

## Clôture

```
COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DÉPLOIEMENT : AUCUN
PRODUCTION : INCHANGÉE
```

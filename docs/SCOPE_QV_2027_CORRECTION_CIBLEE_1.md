# SCOPE QV 2027 - correction ciblée 1

Base de départ : branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD `a186bbee530cb40217034b2d27d5d08641703305`. Worktree préexistant conservé. Classeur 2026 ouvert directement : SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`.

## Résultat

| Indicateur | Valeur |
| --- | --- |
| PROGRAMME_AVANT | 851 |
| PROGRAMME_APRES | 851 |
| STATCOM_SOUPER_B2 | `070F1` |
| STATCOM_MOA_RESTANT | 0 |
| FORMATION_GROUPEE_MODULES | 6 distincts, une occurrence physique chacun |
| FORMATION_GROUPEE_DATES | 6, du 12.05 au 15.06.2027 |
| SESSIONS_SANS_DATE_AVANT | 6 |
| SESSIONS_SANS_DATE_APRES | 0 |
| CALENDAR_SQL_STATUS | `PENDING_MIGRATION` |
| CONFLITS_ORDINAIRES_EXTRAITS | 70, 11 causes |
| INSTRUCTIONS_FERIEES_VALIDATION_LOCALE | 12, non modifiées |
| CONDUITES_DPS | 56 |
| CONDUITES_DAP | 16 |
| CTA_ALERTES | 0 |

Souper annuel : source 2026 G1 ligne 832 = `070F1`, B2 ligne 844 = cellule vide. Décision MOA appliquée au candidat B2 : même `070F1`, sans changer son OI, sa nature ni son public. Test dédié sur les deux occurrences.

| Module | Date 2027 | Jour | Heure | Stat.Com | OI | Public | Lieu | Responsable | Conflit calendrier |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | 12.05 | Mercredi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | DPS ; OFSI ; FOBA 2 ; FOBA 3 | Caserne G1 | C for | Aucun |
| 1.2 | 21.05 | Vendredi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | idem | Caserne G1 | C for | Aucun* |
| 1.3 | 26.05 | Mercredi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | idem | Caserne G1 | C for | Aucun |
| 1.4 | 04.06 | Vendredi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | idem | Caserne G1 | C for | Aucun* |
| 1.5 | 08.06 | Mardi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | idem | Caserne G1 | C for | Aucun |
| 1.6 | 15.06 | Mardi | 18:30-22:00 | 0162F7 | G1/C1/B1/B2 | idem | Caserne G1 | C for | Aucun |

Source directe : lignes 309, 347, 350, 389, 421, 433. Aucun jour férié, veille, pont ou vacances détecté sur ces six dates ; aucune autre activité ordinaire n'occupe Caserne G1 aux mêmes horaires. `*` : permanence CTA hebdomadaire en parallèle, exclue des conflits ordinaires par la règle existante ; les affectations individuelles ne sont pas vérifiées dans ce lot. Le public source reste `DPS | OFSI | FOBA 2 | FOBA 3`, avec codes existants `FOSPEC:3`, `FOBA:2`, `FOBA:3`. Identifiants de ligne conservés, six `occurrenceId` distincts.

Ascension SQL : migration transactionnelle et idempotente `database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql`. Elle ajoute uniquement `VACANCES_SCOLAIRES`, `2027-05-06` au `2027-05-09`, « Vacances scolaires vaudoises - Ascension », source `CALENDAR_VD_FINAL_3`, sans reseed et sans toucher au `FERIE` existant. Test PostgreSQL éphémère local : deux exécutions réussies, exactement une ligne vacances conforme et une ligne férié conservée. **Aucune écriture distante** ; le SQL persisté reste à corriger par la procédure de migration du projet, donc `PENDING_MIGRATION`, pas `MATCH`.

Extraction : `outputs/qv-2027-final/SCOPE_QV_2027_70_CONFLITS_CALENDRIER.xlsx`, deux onglets `SYNTHÈSE` (11 causes, total 70) et `DÉTAIL` (70 occurrences physiques, une ligne par ID). Les décisions restent `À_DÉCIDER`. Les 12 instructions locales demeurent dans l'extraction de validation précédente, sans décision universelle. Aucune des 70 dates n'a été modifiée.

Invariants : six FOCA annulées ; 72 conduites (56 DPS, 16 DAP) ; 0 alerte CTA ; 179 occurrences multi-OI et 1'243 associations OI conservées ; Stat.Com antérieurs non réouverts.

Tests : `node scripts/scope-qv-2027-correction-ciblee-1-tests.js` PASS ; 21 suites `scripts/scope-qv*-tests.js` PASS ; migration exécutée deux fois sur PostgreSQL local, contenu contrôlé ; XLSX rouvert (12 lignes / 12 colonnes en synthèse, 71 lignes / 19 colonnes en détail, en-têtes compris) ; `npm run check` PASS ; `git diff --check` PASS. Test cache-bust login hors QV non rejoué.

Fichiers du lot : `netlify/lib/data/scope-qv-programme-2027.json`, `netlify/lib/_scope-quo-vadis-service.js`, `database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql`, `scripts/scope-qv-2027-correction-ciblee-1-tests.js`, `scripts/scope-qv-2027-no-go-final-tests.js`, `scripts/scope-qv-2027-gate-consolidation-tests.js`, `scripts/scope-qv-2027-post-recette-a-j-tests.js`, `scripts/scope-qv-agenda-programme-ux-final-1-tests.js`, `scripts/scope-qv-instruction-coverage-moa-repair-2-tests.js`, `scripts/scope-qv-instructions-cycle-kickoff-visibility-final-3-tests.js`, `scripts/scope-qv-instructions-rotation-conduite-repair-1-tests.js`, `scripts/scope-qv-finalisation-local-tests.js`, `scripts/scope-qv-history-sections-ux-tests.js`, `scripts/scope-qv-2027-moa-recette-correctif-1-tests.js`, ce rapport et le XLSX. Aucun autre chantier ouvert. Restant MOA : arbitrer les 11 groupes couvrant 70 conflits ordinaires et les 12 instructions locales ; migration SQL à appliquer par le mécanisme autorisé avant de déclarer le calendrier persisté conforme.

# SCOPE_EXERCICES_CSV_1 — import du programme d’exercices

Format officiel du **programme SCOPE**. Il décrit les exercices à créer, pas l’historique Monitoring F7.

Le fichier F7 à 22 colonnes (`monitoring_exercices_sdis_22cols`) reste accepté pour la transition. Ce n’est pas le parcours principal.

Exemple téléchargeable : `assets/csv/SCOPE_Programme_Exercices_Exemple.csv`.

## Fichier

| Règle | Valeur |
| --- | --- |
| Séparateur | `;` (une virgule est aussi acceptée si le fichier n’est pas mixte) |
| Encodage | UTF-8 |
| BOM | accepté (`U+FEFF`) et ignoré |
| Multi-cibles | `Y1\|Y2` (pipe). Un `;` dans la cellule est aussi découpé. **Pas** `/` |
| Une ligne | un événement. Deux lignes = deux événements. Aucune fusion automatique |
| LEGACY | interdit dans ce format |

## Colonnes

### date

| | |
| --- | --- |
| Obligatoire | oui |
| Format | canonique `YYYY-MM-DD` |
| Valeurs | date civile réelle |
| Exemple | `2026-09-10` |
| Règle | aussi accepté sans ambiguïté : `DD.MM.YYYY` ou `DD/MM/YYYY`. Date invalide = `ERREUR_DATE`. Pas de correction silencieuse. La preview affiche toujours la date normalisée. |

### domaine

| | |
| --- | --- |
| Obligatoire | oui |
| Format | code référentiel |
| Valeurs | `FOBA`, `FOCA`, `DPS`, `DAP`, `FOSPEC`, `JSP` (codes techniques `PR` / `AUTO` / `PAPR` aussi résolus) |
| Exemple | `DAP` ou `FOSPEC` |
| Règle | le référentiel serveur est la vérité. Inconnu = `ERREUR_REFERENTIEL`. Pas de fuzzy matching, pas de création automatique. |

### sous_domaine

| | |
| --- | --- |
| Obligatoire | non, sauf FOSPEC si on veut PR ou AUTO |
| Format | code |
| Valeurs | `PR` / `PAPR` (Protection respiratoire), `AUTO` |
| Exemple | `PR` |
| Règle | FOSPEC + PR est stocké sous le code feuille `PR` (sous-domaine de FOSPEC). PR/AUTO ne sont pas des racines fonctionnelles. Inconnu = `ERREUR_REFERENTIEL`. |

### cibles

| | |
| --- | --- |
| Obligatoire | oui |
| Format | un ou plusieurs codes, séparés par `\|` |
| Valeurs | codes du référentiel du domaine de stockage (`Y4`, `G1`, `VL`, `1`, …) |
| Exemple | `Y4` ou `Y1\|Y2` |
| Règle | chaque cible est affichée séparément. Cible inconnue = `ERREUR_REFERENTIEL`. Pas de création automatique. |

### libelle

| | |
| --- | --- |
| Obligatoire | oui |
| Format | texte |
| Valeurs | nom réel de l’exercice |
| Exemple | `Exercice DAP 3` |
| Règle | aucune génération depuis domaine/cible, aucun remplacement par `modele` F7. Créé tel quel. |

### mode_suivi

| | |
| --- | --- |
| Obligatoire | non (défaut `AUTO`) |
| Format | code |
| Valeurs | `NOMINATIF`, `QUANTITATIF`, `AUTO` |
| Exemple | `NOMINATIF` |
| Règle | `LEGACY` = `ERREUR_MODE`. NOMINATIF : le suivi nominatif doit être autorisé (CIBLE > SOUS-DOMAINE > DOMAINE > GLOBAL). QUANTITATIF : créé explicitement. AUTO : suggestion existante, **visible** en preview (`Mode demandé : AUTO` / `Mode proposé : …`). Cibles divergentes = `A_ARBITRER`. |

### a_comptabiliser

| | |
| --- | --- |
| Obligatoire | non (défaut `oui`) |
| Format | oui/non |
| Valeurs | `oui`, `non` |
| Exemple | `oui` |
| Règle | métadonnée de programme, **pas** un statut et **pas** l’inclusion historique F7. L’événement est créé `PLANIFIE`. `non` produit un avertissement : le KPI ne l’inclura qu’après clôture. Alias accepté : `comptabilise`. |

### remarque

| | |
| --- | --- |
| Obligatoire | non |
| Format | texte libre |
| Valeurs | commentaire |
| Exemple | `Semaine 37` |
| Règle | hors empreinte. Cosmétique : ne casse pas l’idempotence. |

### identifiant_externe

| | |
| --- | --- |
| Obligatoire | non |
| Format | texte stable du programme source |
| Valeurs | identifiant métier externe |
| Exemple | `PROG-2026-014` |
| Règle | ne remplace jamais l’ID interne SCOPE. S’il est présent, il sert d’empreinte. Sinon : empreinte canonique. |

## Empreinte (idempotence)

Canonicalisation :

1. Si `identifiant_externe` → `ext:{valeur}`
2. Sinon → `nat:{date}\|{domaineStockage}\|{sous-domaine}\|{cibles triées}\|{libellé minuscule}\|{mode final}`

`remarque` et `a_comptabiliser` sont hors empreinte.

## Preview (zéro écriture)

`POST /api/scope/imports/evenements/preview`

Le serveur reparse le fichier. Aucune écriture.

Statuts : `A_CREER`, `DEJA_PRESENT`, `DEJA_IMPORTE`, `ERREUR_REFERENTIEL`, `ERREUR_DATE`, `ERREUR_MODE`, `CONFLIT`, `A_ARBITRER`, `EXCLU` (à l’exclusion explicite).

Une ligne en erreur ou à arbitrer, non exclue : commit refusé.

## Commit

`POST /api/scope/imports/evenements/commit`

Le serveur reparse, revalide, vérifie le `previewToken`, applique exclusions/décisions, crée en transaction PostgreSQL, journalise `IMPORTER_PROGRAMME_EXERCICES`.

Événements créés :

- statut `PLANIFIE`
- mode `NOMINATIF` ou `QUANTITATIF` (jamais `LEGACY`)
- origine `IMPORT_CSV`
- population non figée
- aucun attendu, aucune participation, aucune saisie quantitative inventée

Si un événement a été créé entre preview et commit : `409 preview_obsolete`.

## Idempotence

Premier import : N créations. Second import du même fichier : 0 création, lignes `DEJA_IMPORTE` / `DEJA_PRESENT`. Pas d’UPSERT destructif.

- même ligne déjà importée → `DEJA_IMPORTE`
- même identité métier, autre import → `DEJA_PRESENT`
- même identité, autre mode → `CONFLIT`
- doublon dans le fichier → erreur avant commit

## Permission

Écriture métier : `events:create`. Lecture seule refusée.

## Distinguer F7

En-tête F7 typique : `date_exercice`, `nb_convoques`, `public_cible`.  
En-tête SCOPE : `date`, `domaine`, `cibles`, `libelle`, `mode_suivi`.

# SCOPE C22 - QUO VADIS PREPROD INTEGRATION GATE 1

### A. Verdict
PASS

### B. Git initial/final
```json
{
  "initial": "362d6c41381ae106c318d9c9081cb83fc23588f4",
  "final": "362d6c41381ae106c318d9c9081cb83fc23588f4",
  "unchanged": true
}
```

### C. Environnement réellement utilisé
```json
{
  "target": {
    "host": "127.0.0.1",
    "port": 55432,
    "database": "scope_c22_preprod"
  },
  "server": {
    "database": "scope_c22_preprod",
    "host": "127.0.0.1/32",
    "port": 55432,
    "version": "18.6 (Homebrew)"
  },
  "schema": "c22_gate",
  "productionTouched": false
}
```

### D. Protection production
```json
{
  "productionRefused": true,
  "bulkThreshold": 50,
  "bulkApprovalBoundToExactPlan": true
}
```

### E. Schéma SCOPE
91 colonnes inspectées par information_schema; 121 contraintes; 13/13 tables RLS.

### F. Compatibilité SQL C20/C21
Planificateur C20, exécuteur et réconciliation C21 réutilisés sans moteur parallèle.

### G. Migrations locales éventuelles
Fixture additive exécutée dans c22_gate et draft 20260929_scope_qv_publication_c22_preprod_gate.sql terminé par ROLLBACK; aucune migration production.

### H. Dataset QV 27
```json
{
  "definitions": 345,
  "quoVadisObjects": 622,
  "externalHistorical": 13,
  "lifecycle": 635,
  "explicitSourceDates": 72,
  "cta": 53,
  "dated": 125,
  "underdetermined": 479,
  "emseaChoices": 9,
  "arbitrations": 3,
  "insufficient": 6,
  "sourceConflicts": 4,
  "equation": "118 READY + 19 HUMAN_REVIEW + 485 BLOCKED + 13 NOT_PUBLISHED = 635; the 7 objects in 4 source-conflict pairs are excluded from the 125 dated objects."
}
```

### I. Volumes
```json
{
  "TOTAL": 635,
  "READY_TO_PUBLISH": 118,
  "CREATE": 118,
  "UPDATE": 0,
  "UNCHANGED": 0,
  "BLOCKED": 485,
  "HUMAN_REVIEW_REQUIRED": 19,
  "NOT_PUBLISHED": 13
}
```

### J. READY_TO_PUBLISH
```json
118
```

### K. BLOCKED
```json
485
```

### L. HUMAN_REVIEW
```json
19
```

### M. NOT_PUBLISHED
```json
13
```

### N. Stat.Com
```json
{
  "pdf": 87,
  "extensions": 4,
  "operational": 91
}
```

### O. Codes STATCOM.xxx
63 matérialisations codées; suffixes à trois chiffres vérifiés.

### P. Externes
13 traces historiques, aucun événement 2027, aucun code artificiel.

### Q. EMSEA
11 occurrences; 2 datées conservées, 9 choix mensuels en revue humaine; Stat.Com non applicable.

### R. CTA structure
G1 N01-N06; C1/B1/B2 N01-N03; demi-sections structurées; N06 G1 reste une réserve.

### S. CTA capacités
15/8 uniquement sur G1; aucune propagation aux autres sites.

### T. CTA tournus
Provenance C19 conservée; aucun ordre C22 parallèle.

### U. CTA 60 h
53 événements continus de 3600 minutes.

### V. CTA calendrier protégé
SERVICE_CONTINUITY conserve week-ends, fériés, veilles et vacances.

### W. FOBA progression
Progression C19 réutilisée; aucune cohorte recalculée.

### X. FOBA responsable
Chef FOBA / C FOBA canonique; C for seulement historique.

### Y. FOBA multi-OI
4 matérialisations pour une activité 070F1.005.

### Z. OI
Relations structurées et indépendantes.

### AA. FULL_OI
Portée OI distincte des sections/demi-sections.

### AB. JSP/DPS
Dépendance même OI conservée dans le moteur partagé.

### AC. PR/DPS
AVOID/dérogeable, non transformé en blocage absolu.

### AD. Formation groupée
ATTENTION, blocage seulement sur ressource/rôle fort partagé.

### AE. Calendrier
Référentiel officiel C19 réutilisé sans recherche ni reconstruction.

### AF. Vacances
Règles héritées et exception CTA testées.

### AG. Fériés
Règles héritées et exception CTA testées.

### AH. Veilles
Règles héritées et exception CTA testées.

### AI. Multi-public
2 objets READY à plusieurs publics, relations dédupliquées.

### AJ. Multi-session
12 lignes canoniques restent BLOCKED sans date inventée; preuve PostgreSQL synthétique 1/N et N/N sur 7 sessions, entièrement rollbackée.

### AK. Provenance
Événement ↔ unité QV ↔ session ↔ occurrence ↔ définition démontré dans les deux sens.

### AL. Idempotence
A=118 CREATE; B=118 UNCHANGED; C/D=1 UPDATE avec même UUID.

### AM. Transaction
BEGIN/COMMIT PostgreSQL réels.

### AN. Rollback
Échec AFTER_EVENT: ROLLBACK complet, comptes identiques.

### AO. Retry
SUCCESS puis NO_OP/UNCHANGED.

### AP. Données opérationnelles
PARTICIPATION ajoutée; modification QV classée HUMAN_REVIEW_REQUIRED.

### AQ. Drift
Mutation directe salle détectée DRIFT; aucune autocorrection par reconcile.

### AR. Réconciliation
```json
{
  "MATCHED": 118,
  "MISSING": 0,
  "DUPLICATE": 0,
  "DRIFT": 0,
  "PROTECTED_CHANGE": 0,
  "UNEXPECTED": 0
}
```

### AS. Écran 1
Catalogue annuel recetté avec codes métier et zébrage.

### AT. Écran 2
Identité compacte, multi-public, lieux exclus retirés.

### AU. Écran 3
Rôles, ressources, calendriers et priorité recettés.

### AV. Écran 4
Contexte persistant et année dynamique.

### AW. Écran 5
Héritage activité/occurrence/session contrôlé.

### AX. Écran 6
Contexte de session à placer persistant.

### AY. Écran 7
Propositions et choix vers programme contrôlés.

### AZ. Écran 8
Grille date/début/fin/durée et multi-public contrôlés.

### BA. Écran 9
Moteur partagé, ouverture A/B et revérification.

### BB. Écran 10
635 lignes de cycle de vie, programme/historique séparés.

### BC. Écran 11
Titre dynamique QUO VADIS '27 et marqueurs canoniques.

### BD. Écran 12
Déplacement compatible/attention/dérogeable/bloquant et trace.

### BE. Date/heure
Primitive commune --control-height:36px.

### BF. Hauteurs champs
```json
[
  {
    "screen": "catalogue",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "definition",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "automations",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "annual",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "occurrences",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "known",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "activities",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "move",
    "width": 1500,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "catalogue",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "definition",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "automations",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "annual",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "occurrences",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "known",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "activities",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "move",
    "width": 1150,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "catalogue",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "definition",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "automations",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "annual",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "occurrences",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "known",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "activities",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "move",
    "width": 960,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "catalogue",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "definition",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "automations",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "annual",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "occurrences",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "known",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "activities",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  },
  {
    "screen": "move",
    "width": 800,
    "height": 36,
    "expected": 36,
    "status": "PASS"
  }
]
```

### BG. Zébrage
Catalogue et programme gris/blanc.

### BH. Actions
Aucune action textuelle soulignée.

### BI. Navigation
```json
{
  "steps": [
    {
      "context": null,
      "heading": "Catalogue annuel",
      "index": 1
    },
    {
      "context": "Nouvelle activité",
      "heading": "Définition permanente",
      "index": 2
    },
    {
      "context": "Nouvelle activité",
      "heading": "Automatismes",
      "index": 3
    },
    {
      "context": "Nouvelle activité",
      "heading": "Besoin annuel 2027",
      "index": 4
    },
    {
      "context": "Nouvelle activité",
      "heading": "Nouvelle activité — besoin 2027",
      "index": 5
    },
    {
      "context": "Nouvelle activité",
      "heading": "Placement automatique",
      "index": 6
    },
    {
      "context": "Nouvelle activité",
      "heading": "Propositions",
      "index": 7
    },
    {
      "context": null,
      "heading": "Ajouter un événement connu",
      "index": 8
    },
    {
      "context": null,
      "heading": "Compatibilités et conflits",
      "index": 9
    },
    {
      "context": null,
      "heading": "Toutes les activités",
      "index": 10
    },
    {
      "context": null,
      "heading": "QUO VADIS '27",
      "index": 11
    },
    {
      "context": null,
      "heading": "Déplacement chronologique",
      "index": 12
    }
  ],
  "contextPreservedScreens2to7": true,
  "conflictRecheck": 1,
  "openedActivityEditor": 1,
  "returnedToConflictContext": true
}
```

### BJ. Responsive
```json
{
  "total": 48,
  "pass": 48,
  "nok": 0
}
```

### BK. Performance
```json
{
  "planGenerationMs": 112.63,
  "execution118Ms": 196.96,
  "reconciliation118Ms": 61.52
}
```

### BL. Tests C22
26/26 preuves backend + 48/48 assertions ciblées PASS.

### BM. Régressions C18-C21
C18 18/18; C19 core 9/9; C19 UX 67/67; C20 30/30; C21 60/60.

### BN. npm run test:scope
Exécuté une seule fois: arrêt sur le known failure cache-bust ORION (scope-login-visual-alignment-orion-1-tests.js, test 06), sans lien C22; aucun chantier parasite ouvert.

### BO. P1
```json
[]
```

### BP. P2
```json
[]
```

### BQ. P3
```json
[]
```

### BR. Arbitrages MOA
```json
[
  "Le Gate production suivant devra appliquer la migration additive validée ici avant toute publication réelle."
]
```

### BS. Éléments indémontrables
```json
[]
```

### BT. Fichiers modifiés
```json
[
  "database/fixtures/scope_qv_publication_c22_postgres.sql",
  "database/migrations/20260929_scope_qv_publication_c22_preprod_gate.sql",
  "scripts/lib/scope-c22-canonical-dataset.js",
  "scripts/lib/scope-c22-postgres-fixture-db.js",
  "scripts/scope-c22-quo-vadis-preprod-integration-gate-1.js",
  "scripts/scope-c22-quo-vadis-preprod-integration-gate-1-tests.js",
  "netlify/lib/_scope-qv-publication-plan.js",
  "netlify/lib/_scope-qv-publication-executor.js",
  "netlify/lib/_scope-qv-publication-reconciliation.js",
  "scripts/scope-c19-ux-recette/app.js",
  "scripts/scope-c19-ux-recette/styles.css"
]
```

### BU. Recommandation Gate suivant
GO GATE PRODUCTION

## Matrice QV vers SCOPE
| Champ QV | Champ SCOPE | Type | Nullable | FK / référentiel | Règle | Risque |
|---|---|---|---|---|---|---|
| Code | scope_qv_publication_activities.business_code | text | oui | UNIQUE annuel | STATCOM.xxx stable | collision / faux code |
| Stat.Com | scope_qv_publication_activities.stat_com_code | text | oui | référentiel 91 codes | nullable selon catégorie | code inventé |
| Libellé | scope_qv_publication_activities.label + scope_evenements.libelle | text | non | activité | activité canonique / matérialisation | confusion identité |
| Domaine | scope_evenements.domaine_code | text | non | référentiel domaine | domaine principal | transversal incomplet |
| Multi-domaines | scope_evenement_domaines.domaine_code | text | non | relation N:N additive | valeurs dédupliquées | migration requise |
| Famille | scope_evenements.famille (C22 additif) | text | oui | référentiel | héritage définition | valeur libre |
| Type | scope_evenements.type_evenement (C22 additif) | text | oui | référentiel | héritage définition | valeur libre |
| Occurrence | scope_qv_publication_links.source_occurrence_id | text | non | source QV | provenance, pas libellé | lien perdu |
| Session | scope_qv_session_events + source_session_id | text/int | non | groupe FK | 1/N conservé | aplatissement |
| Cible | scope_evenement_cibles.cible_id | uuid | non | FK scope_cibles | FULL_OI distinct | cible concaténée |
| Publics | scope_evenement_public_rule_versions.public_rule_version_id | uuid | non | FK règles public | multi-public dédupliqué | perte multi-public |
| OI | scope_evenement_ois.oi_id | uuid | non | FK scope_ois | indépendance G1/C1/B1/B2 | contamination OI |
| Lieu | scope_evenements.lieu_id (C22 additif) | uuid | oui | FK scope_lieux | valeur canonique | lieu exclu |
| Entrée en service | scope_evenements.entree_service | text | oui | aucune | max UX 60 caractères | troncature |
| Salle | scope_evenements.salle_theorie_id (C22 additif) | uuid | oui | FK scope_salles_theorie | cohérente avec lieu | salle orpheline |
| Date | scope_evenements.date + date_fin | date | non/oui | aucune | date source seulement | date inventée |
| Début | scope_evenements.heure_debut | text HH:MM | oui | aucune | heure locale validée | format invalide |
| Fin | scope_evenements.heure_fin | text HH:MM | oui | aucune | avec date_fin pour nuit CTA | nuit CTA aplatie |
| Durée | scope_evenements.duree_planifiee_minutes (C22 additif) | integer | oui | CHECK > 0 | calculée, CTA 3600 | incohérence |
| Rôles | scope_evenement_roles_qv.role_code (C22 additif) | text | non | relation N:N | conflits partagés | rôle concaténé |
| Ressources | scope_evenement_ressources_qv.ressource_code (C22 additif) | text | non | relation N:N | conflits partagés | ressource perdue |
| Responsable | scope_evenements.responsable | text | oui | personne/rôle futur | Chef FOBA canonique | C for figé |
| Priorité | scope_evenements.priorite | integer | oui | aucune | niveau, pas blocage absolu | surblocage |
| Provenance | scope_qv_publication_links | jsonb/text/uuid | non | FK événement | bidirectionnelle complète | reconstruction libellé |
| Statut publication | scope_publication_runs.status | text | non | CHECK | audit transactionnel | exécution muette |

## Preuve technique
- Plan: `C20-4D97B1FDD8017623C3DC` / `d0daee2d709dcda2c0675ed23cb3b6bfa002bf43c877147adcd8dc1d5cf483f5`.
- PostgreSQL: 18.6 (Homebrew), 127.0.0.1/32:55432, base `scope_c22_preprod`.
- Schéma jetable: `c22_gate`; RLS 13/13; aucune connexion production.
- Captures: `docs/captures/c22/`.

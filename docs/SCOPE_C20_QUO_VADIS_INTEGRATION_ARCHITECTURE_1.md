# C20 — QUO VADIS — Architecture d’intégration 1

## A. Verdict

**PASS** — architecture locale et dry-run démontrés; aucune écriture ou publication réelle.

## B. Git initial

HEAD `362d6c41381ae106c318d9c9081cb83fc23588f4`; aucun commit, push ou déploiement.

## C. Architecture existante analysée

scope_quo_vadis_programmes, scope_quo_vadis_obligations, scope_quo_vadis_proposals, scope_event_definitions, scope_event_definition_versions, scope_exercices, scope_evenements, scope_evenement_cibles, scope_multisessions_v2, scope_multisession_v2_sessions, scope_participations, scope_permutations, scope_lieux, scope_public_rule_versions.

## D. Tables SCOPE concernées

scope_quo_vadis_programmes, scope_quo_vadis_obligations, scope_quo_vadis_proposals, scope_event_definitions, scope_event_definition_versions, scope_exercices, scope_evenements, scope_evenement_cibles, scope_multisessions_v2, scope_multisession_v2_sessions, scope_participations, scope_permutations, scope_lieux, scope_public_rule_versions.

## E. Services/routes concernés

GET /quo-vadis/programmes/:annee; POST /quo-vadis/programmes/:annee/generate; POST /evenements; PATCH /evenements/:id; POST /imports/evenements/preview; POST /imports/evenements/commit.

## F. Modèle QUO VADIS source

Programme annuel -> définition -> occurrence -> session -> unité de matérialisation.

## G. Frontière programme/événement

PREPARATION -> VALIDATION -> PUBLICATION_PLAN -> EXECUTION_FUTURE -> SCOPE_EVENT.

## H. Identité canonique

SHA-256 over year + stable definition/occurrence/session/publication-unit ids; labels, dates and array indexes are excluded.

## I. Mapping définition

QV definition -> scope_event_definitions / version; immutable definition id in provenance link.

## J. Mapping occurrence

QV occurrence -> canonical activity/exercise occurrence; business code can be shared by its event materializations.

## K. Mapping session

QV session -> scope_evenements session plus scope_multisession_v2_sessions when count > 1.

## L. Mapping cible

targetCodes -> scope_evenement_cibles.

## M. Mapping public

publicCodes -> immutable scope_public_rule_versions via scope_evenement_public_rule_versions.

## N. Mapping OI

oiCodes -> scope_ois via scope_evenement_ois.

## O. Mapping domaine

One owner domain remains on the event; additional domains/publics/OI are relations, never concatenated text.

## P. Mapping lieu

locationCode -> scope_lieux; unknown remains NULL.

## Q. Mapping salle

roomCode -> canonical room reference; unknown remains NULL.

## R. Mapping responsable

Identifiant de responsable stable; valeur inconnue = NULL, jamais « À affecter » persisté comme identité.

## S. Mapping Stat.Com

Reused from the C19 canonical referential; absence is legal for EMSEA.

## T. Mapping code

Stat.Com.xxx on the canonical activity, never a QV id or UUID.

## U. Activités externes

Historique non reconduit -> NOT_PUBLISHED; aucun code ni événement.

## V. CTA

Un événement 2027-01-01 18:00 -> 2027-01-04 06:00, 3600 minutes, SERVICE_CONTINUITY; aucune fragmentation.

## W. FOBA multi-OI

Une définition/occurrence/session et quatre unités G1/C1/B1/B2; même activité 070F1.005, quatre événements reliés, jamais quatre activités indépendantes.

## X. JSP

JSP-C1 réutilise 010JC1 et le public JSP:1.

## Y. EMSEA

Séance État-major, domaine INSTITUTIONNEL issu de C19, sans Stat.Com ni code; cette absence ne bloque pas.

## Z. Multi-session

Les six sessions C19 distinctes conservent le même groupId et count=6; elles restent BLOCKED sans date et ne sont jamais mises à plat.

## AA. Temps/date/durée

startsAt/endsAt locaux canoniques, dates de début/fin et durée calculée; CTA traverse plusieurs jours.

## AB. Provenance

Lien bidirectionnel event -> session -> occurrence -> définition par publication_key et scope_qv_publication_links.

## AC. PublicationPlan

Plan pur C20-3B69359CFC1564A72D2F, dryRun=true, writable=false.

## AD. CREATE

10 création(s) au passage A.

## AE. UPDATE

Même publication_key; seul le fingerprint et les champs modifiés changent.

## AF. UNCHANGED

10 inchangé(s) au passage B.

## AG. BLOCKED

Informations non validées et conflits bloquants restent hors publication avec motif explicite.

## AH. NOT_PUBLISHED

L’activité externe historique est conservée comme preuve sans cible opérationnelle.

## AI. Gate READY_TO_PUBLISH

VALIDATED + identité + dates/heures + références + cible + aucun conflit + règle code/Stat.Com valide.

## AJ. Idempotence A/B

A: {"CREATE":10,"UPDATE":0,"UNCHANGED":0,"BLOCKED":8,"NOT_PUBLISHED":1}; B: {"CREATE":0,"UPDATE":0,"UNCHANGED":10,"BLOCKED":8,"NOT_PUBLISHED":1}.

## AK. Modification C

C: {"CREATE":0,"UPDATE":1,"UNCHANGED":9,"BLOCKED":8,"NOT_PUBLISHED":1}; Vulcain -> Jura produit exactement un UPDATE.

## AL. Retour arrière D

D: {"CREATE":0,"UPDATE":1,"UNCHANGED":9,"BLOCKED":8,"NOT_PUBLISHED":1}; même identité: true.

## AM. Doublons

Après A: 0; après C: 0.

## AN. Conflits

Un conflit blocking=true produit BLOCKED; aucune stratégie de meilleur effort.

## AO. Données opérationnelles existantes

Toute modification d’un événement portant présences, permutations, rattrapages, décisions ou statut final devient BLOCKED/HUMAN_REVIEW.

## AP. Annulation

Une annulation QV devient UPDATE vers ANNULE si aucune donnée opérationnelle; sinon HUMAN_REVIEW.

## AQ. Suppression

Une source disparue ne supprime jamais physiquement: annulation contrôlée ou HUMAN_REVIEW.

## AR. Transaction

Une transaction unique couvre activité, événements, cibles, publics, OI, provenance et journal.

## AS. Rollback

Tout échec de relation ou de journal annule le lot de publication complet.

## AT. Retry

Reconstruire le plan depuis un snapshot cible frais, puis rejouer par publication_key avec contrôle optimiste de version.

## AU. RBAC

Permission future events:publish, réservée à GESTIONNAIRE / ADMINISTRATEUR.

## AV. RLS

Les nouvelles tables de provenance, OI et publics activent RLS et refusent anon/authenticated; accès par rôle serveur uniquement.

## AW. UX dry-run

Le JSON déterministe et le tableau Markdown fournissent l’aperçu MOA requis sans exposer une commande de publication trompeuse en C20.

## AX. Responsive

Tableau SCOPE compact avec défilement horizontal interne et carré d’état + texte; largeurs 1500/1150/960/800.

## AY. Tests

30/30 C20 et 107/107 C18/C19 PASS. Suite globale exécutée une fois: KNOWN_FAILURE sur scope-login-visual-alignment-orion-1-tests.js, contrôle cache-bust préexistant, sans lien C20.

## AZ. Recommandation C21

Authorize a database-backed read-only publication-plan endpoint first; only then authorize a separately reviewed transactional executor and apply the additive contract.

## Preuves A/B/C/D

| Passage | CREATE | UPDATE | UNCHANGED | BLOCKED | NOT_PUBLISHED |
|---|---:|---:|---:|---:|---:|
| A | 10 | 0 | 0 | 8 | 1 |
| B | 0 | 0 | 10 | 8 | 1 |
| C | 0 | 1 | 9 | 8 | 1 |
| D | 0 | 1 | 9 | 8 | 1 |

## Dataset de preuve

| Cas | Source QV | État | Identité | Stat.Com | Code | Cible | Date | Action dry-run | Motif | Cible SCOPE |
|---|---|---|---|---|---|---|---|---|---|---|
| RECURRENCE-1 | QV26-ECHANGE-TENUE-3AD66FD0 / qv-source-853:O1 / qv-source-853:S1 | Validé | QV-2027-319BA728684780FFA1C995EC025C3C1B | 010JSP | 010JSP.010 | JSP-B1, JSP-C1, JSP-G1 | 2027-01-06 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| RECURRENCE-2 | QV26-ECHANGE-TENUE-3AD66FD0 / qv-source-858:O1 / qv-source-858:S1 | Validé | QV-2027-36C915AF659F5E05C9F3232AC8A7F356 | 010JSP | 010JSP.010 | JSP-B1, JSP-C1, JSP-G1 | 2027-01-07 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| FOBA-PHASE-II-B1 | QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5 / QV27:FOBA-PHASE-II:O1 / QV27:FOBA-PHASE-II:S1 | Validé | QV-2027-50345023DFB0D03B1D3907585538A5B1 | 070F1 | 070F1.005 | DPS-B1 | 2027-01-06 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| EMSEA-SANS-STATCOM | QV26-SEANCE-EM-ED042EBD / QV27:EMSEA:O01 / QV27:EMSEA:S01 | Validé | QV-2027-50E6C4314D0B35FE976A2C43194B1E39 | — | — | SDIS-EM | 2027-01-12 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| CTA-60H | CTA-PERMANENCE / CTA-PERM-2027-01-01:O1 / CTA-PERM-2027-01-01:S1 | Validé | QV-2027-5A64EBB8E93D43AB50B97819046501FB | — | — | DPS-G1 | 2027-01-01 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| FOBA-PHASE-II-B2 | QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5 / QV27:FOBA-PHASE-II:O1 / QV27:FOBA-PHASE-II:S1 | Validé | QV-2027-67DECE42B12066E9FCBD90D49446C401 | 070F1 | 070F1.005 | DPS-B2 | 2027-01-06 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| FOBA-PHASE-II-G1 | QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5 / QV27:FOBA-PHASE-II:O1 / QV27:FOBA-PHASE-II:S1 | Validé | QV-2027-688D2F3987BE1BE39F82F7F9E8499FDC | 070F1 | 070F1.005 | DPS-G1 | 2027-01-06 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| FOBA-PHASE-II-C1 | QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5 / QV27:FOBA-PHASE-II:O1 / QV27:FOBA-PHASE-II:S1 | Validé | QV-2027-B722D39978526393CF01B8262193E56F | 070F1 | 070F1.005 | DPS-C1 | 2027-01-06 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| JSP-C1 | QV26-EXERCICE-JSP-1-7F24A973 / QV27:JSP-C1:O1 / QV27:JSP-C1:S1 | Validé | QV-2027-C4A5076403417636D9AFA4ED67D0A12C | 010JC1 | 010JC1.001 | JSP-C1 | 2027-01-11 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| SIMPLE-VULCAIN | QV26-INTEGRATION-PERSONNEL-DPS-PHASE-I-62BE4A9E / qv-source-852:O1 / qv-source-852:S1 | Validé | QV-2027-F2E5138105171189DCC7CDDC73D2A46B | 070F1 | 070F1.004 | DPS-B1, DPS-B2, DPS-C1, DPS-G1 | 2027-01-05 | CREATE | READY_WITHOUT_SCOPE_EVENT | scope_evenements + relations |
| MULTI-SESSION-1 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S1 | Non prêt | QV-2027-1AD85746E3DED894B5642A9F2DEB9306 | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| MULTI-SESSION-2 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S2 | Non prêt | QV-2027-33EC35D1DD5C1FEB1117967C1771AF40 | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| MULTI-SESSION-5 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S5 | Non prêt | QV-2027-42681B76C3697CC3F39780485D806708 | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| CONFLIT-BLOQUANT | QV26-SEANCE-DE-PREPARATION-CONCOURS-DE-LA-FVSP-F1E4A8D4 / qv-source-866:O1 / qv-source-866:S1 | Non prêt | QV-2027-5621E67E9E6A3D9209E7E3D0F9209EFC | CONCOUR | CONCOUR.003 | — | — | BLOCKED | BLOCKING_CONFLICT:ROOM_CONFLICT | — |
| MULTI-SESSION-3 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S3 | Non prêt | QV-2027-889AEF3F6CFB151861D8246751089E3E | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| INFORMATION-INSUFFISANTE | QV26-8-KM-DU-SDIS-D2C38C47 / QV27:8KM:O1 / QV27:8KM:O1:S1 | Non prêt | QV-2027-8A05C5F85809D9169A06FE845285C0D8 | — | — | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| MULTI-SESSION-4 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S4 | Non prêt | QV-2027-8DFD43FB1BA7170DB7DB47F55AADBED9 | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| MULTI-SESSION-6 | QV26-FORMATION-GROUPEE-1-1-3D8CCE58 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1 / QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S6 | Non prêt | QV-2027-A86987DF16429C9B12BF752E83047217 | 0162F7 | 0162F7.002 | — | — | BLOCKED | SOURCE_NOT_VALIDATED | — |
| EXTERNE-HISTORIQUE | QV26-ASSEMBLEE-DES-DELEGUES-DE-LA-FVSP-662AE3DD / — / — | Historique | — | — | — | — | — | NOT_PUBLISHED | EXTERNAL_HISTORICAL_NOT_RECONDUCTED | — |

## Écarts structurels constatés

- scope_evenements has no end date, so a 60-hour CTA cannot be stored as one event.
- code_cours is unique per event although one canonical activity code may span recurrences or FOBA OI materializations.
- scope_evenements has one primary domain and no direct public-rule or OI publication relations.
- C19 Institutionnel is not admitted by the current scope_domaines check constraint.
- QV obligations link at most one SCOPE event and do not carry definition/occurrence/session/unit provenance.

Contrat additif local non appliqué: `database/migrations/20260929_scope_qv_publication_c20.sql`.

## Interdictions respectées

- 0 écriture SCOPE réelle
- 0 migration appliquée
- 0 déploiement Netlify
- 0 modification ORION/Okta
- 0 date, Stat.Com ou code inventé

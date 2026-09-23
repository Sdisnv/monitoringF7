# SCOPE Canonical Foundations C1

## Purpose

C1 adds canonical reference data beside the legacy model. It does not switch any event, personnel, population, QUO VADIS, or Stat.Com behavior.

## Canonical Objects

- `scope_ois`: organisational units G1, C1, B1, B2, Y1, Y2, Y3, Y4.
- `scope_domaine_ois`: temporal-ready many-to-many relation between domains and OIs.
- `scope_pr_parcours`: PR activity tracks GENERAL, PAPR, PABC.
- `scope_competence_definitions`: typed definitions (`QUALIFICATION`, `SPECIALITE`, `HABILITATION`, `AUTRE`).
- `scope_foba_niveaux`: FOBA levels 1, 2, 3.

PR activity tracks are intentionally separate from personal qualifications. AUTO entries are qualifications. FOSPEC entries are extensible specialties. An OI is not a site, place, or room.

## Legacy Compatibility

`scope_cibles` remains unchanged and retains its historical identity. Four typed mapping tables reference both the legacy row and a real canonical target with foreign keys. This avoids an unverifiable polymorphic foreign key while allowing one legacy row to map to several concepts.

PR/G1, C1, B1, and B2 are composite mappings: each maps to an OI and to the PAPR activity track. `ABC`, `PRABC`, and `PR-ABC` are aliases of PABC. `VL_DPS` and `VL_DAP` both map to `COND_VL`; their DPS/DAP context is retained on the alias.

`scope_legacy_cible_reviews` records ambiguous or unmapped rows. C1 does not infer mappings for PR/GEN, FOCA/GEN, JSP/CAD, FOSPEC/GEN, PIO, Sanitaire, Divers, or historical Stat.Com ABC.

## Invariants

- PR and AUTO are domains, not FOSPEC children.
- No canonical universal target exists.
- No legacy `cible_id` is rewritten.
- No person competence ownership is migrated.
- `scope_attendus`, `scope_participations`, events, multi-session, imports, QUO VADIS, Stat.Com, authentication, and authorization remain functionally unchanged.
- New tables have RLS enabled and direct `anon`/`authenticated` grants revoked, matching protected SCOPE referential tables.

The standalone SQL migration and the runtime schema bootstrap intentionally contain equivalent DDL because deployments may use either path. `_scope-canonical-foundations.js` is the runtime source of truth for codes and mapping classification; the C1 test asserts SQL/runtime parity and seed coverage.

## Diagnostic

`node scripts/scope-canonical-foundations-c1-diagnostic.js` performs a static, read-only dry-run against the seeded `scope_cibles` catalogue. `--json` emits machine-readable details. It never opens a database connection.

## C2 Boundary

C2 may introduce public definitions, versioned public rules, and parity checks against G0-D. It must consume these references without changing frozen populations or historical participation semantics.

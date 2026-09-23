# SCOPE Person Qualifications C3-B

## Purpose

C3-B adds a dated and auditable relationship from a person to a canonical qualification. It is additive and mirror-only. It does not replace G0-D and does not write events, expected populations, participations, frozen populations, or human decisions.

The model keeps domain, organisational assignment, personal qualification, PR activity track, cursus, calculated public, event role, obligation, and statistical allocation as separate concepts.

## Canonical identity

Codes are stable identities and labels remain editable. Aliases never create a second qualification.

VPC is the canonical FOSPEC specialty. The C1 OP_VPC row is renamed to VPC while retaining its UUID; OP_VPC and OP VPC become aliases. The historical FOSPEC-OP-VPC public is retired and archived in favor of FOSPEC-VPC.

PAPR and PABC are personal qualifications in addition to the separate PR activity tracks. The implication PABC to PAPR is reference data with synthesis disabled: a missing compatible PAPR proof produces REVIEW_REQUIRED; C3-B never invents or backdates PAPR.

## Persistence

scope_person_qualifications stores the semantic interval. Bounds are inclusive. A gap followed by reactivation creates a new interval. Corrections are append-only through supersedes_person_qualification_id; semantic fields cannot be edited in place.

scope_person_qualification_evidence stores each source assertion, import references, legacy codes and contexts, source dates, confidence, and audit payload. Its source identity is unique, making backfill idempotent.

Overlapping confirmed intervals for the same person and qualification are rejected. Multiple evidence rows may support one interval. VL_DPS and VL_DAP both map to COND_VL; DPS and DAP remain evidence contexts.

A person's RH departure does not delete or automatically expire a qualification. PERSON_ELIGIBLE_AT remains responsible for RH eligibility.

## Backfill

The pure planner in _scope-person-qualifications.js accepts only personal assignment facts. It maps exact aliases, merges overlapping intervals, preserves evidence, and emits diagnostics. Stat.Com, event, and Quo Vadis sources are rejected.

The schema migration deliberately does not insert person qualifications. Running a production backfill remains an explicit later operation after review of its diagnostic. No database operation is part of C3-B validation.

## Roles

scope_event_role_definitions, scope_event_role_aliases, and scope_event_person_roles provide an extensible event-role contract. Roles such as FORMATEUR_PR, FMF, MONITEUR_JSP, and FORMATEUR_C1_118 never imply a personal qualification.

## Publics

Active C3-B definitions:

- DPS-GEN: DPS G1, C1, B1, or B2;
- DAP-GEN: DAP Y1, Y2, Y3, or Y4;
- JSP-GEN: young JSP in G1, C1, or B1;
- PR-PAPR: confirmed PAPR qualification;
- PR-PABC: confirmed PABC qualification;
- FOSPEC-VPC: confirmed VPC specialty.

JSP-CAD stays REVIEW_REQUIRED because the current Person model has no reliable birth date. PR-GEN, FOCA-GEN, and FOSPEC-GEN remain non-qualification public questions. FOCO DPS/DAP remain statistical dimensions and JSP stays outside FOCO.

## Extensibility

Storage, temporal evaluation, evidence, deduplication, and HAS_COMPETENCE are code-agnostic. The public-rule validator remains fail-closed and accepts an explicit qualification catalog loaded from reference data. Adding a simple future qualification therefore requires reference data, not a new predicate or a code branch.

## Security

All C3-B tables enable RLS and revoke direct access from anon and authenticated when those roles exist. The standalone migration and ensureScopeSchema create the same tables, constraints, triggers, indexes, seeds, aliases, public definitions, and protections.

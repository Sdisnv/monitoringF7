# Catalogue annuel et themes C8-B

## Responsabilites

C8-B conserve la chaine `ActivityDefinition -> AnnualRequirement -> PlannedOccurrence -> QUO VADIS`. Un theme decrit le contenu d'une occurrence; il ne porte ni public, ni periodicite, ni architecture de sessions, ni Stat.Com autonome. Un contenu qui possede l'un de ces contrats reste une `ActivityDefinition`. En cas d'incertitude, aucune promotion n'est faite.

## Modele

- `scope_theme_definitions` porte l'identite stable et le code immutable.
- `scope_theme_versions` versionne libelle, description, provenance et fingerprint. Une version `ACTIVE` est semantiquement immutable.
- `scope_activity_theme_bindings` autorise explicitement un theme pour une activite. Le domaine et le libelle ne conferent jamais cette compatibilite.
- `scope_annual_requirement_theme_assignments` affecte zero, un ou plusieurs themes a un numero d'occurrence. `session_template_id` reste facultatif et n'est utilise que lorsque le contrat multisession le justifie.

Un assignment contient exactement une version canonique ou un libelle libre. Le libelle libre est normalise pour la deduplication, reste marque `FREE` et ne cree jamais de referentiel. C8-B ne seede aucun theme et ne backfille aucun libelle historique.

## Lifecycle annuel

Les themes sont modifiables uniquement sur un besoin `DRAFT`. Le passage `READY` epingle les versions, copie les themes libres dans le snapshot et les couvre par le fingerprint. La generation compare la configuration courante au snapshot. Toute correction passe par la supersession existante, qui recopie les assignments dans le nouveau brouillon.

## Projection QUO VADIS

La projection `CATALOG_C4` transporte activite, occurrence, session eventuelle, domaines, publics, periode, themes, contraintes et Stat.Com. Un theme expose `kind: CANONICAL|FREE` et `free: true|false`. Les dates, horaires, lieux finaux, responsables nommes, arbitrages et publication restent sous responsabilite QUO VADIS. `operationalWrites` et `eventPublication` restent `false`.

## Interface MOA

La liste affiche domaine, activite, besoin annuel, periode, contenus, etat et preparation QV. La fiche place le besoin annuel et les contenus avant le cadre permanent. Les rubriques vides sont masquees, les enums sont traduits et les identifiants internes sont replies. Les dates grisees sont des placeholders et ne sont jamais envoyees comme valeurs.

## Activation

La migration `20260924_scope_annual_catalog_themes_c8_b.sql` est additive, sans seed et sans backfill. Elle doit etre executee explicitement par un operateur. `ensureScopeSchema()` ne l'applique pas depuis le trafic utilisateur.

# Convergence catalogue / QUO VADIS C5-B

## Responsabilite

C5-B raccorde le catalogue C4 au programme annuel et a QUO VADIS en mode miroir. La chaine reste `ActivityDefinition` -> `ActivityDefinitionVersion` -> `AnnualRequirement` -> `PlannedOccurrence` -> `PlannedOccurrenceSession` -> intention QUO VADIS. Elle ne cree ni evenement operationnel, ni attendu, ni participation et n'assigne aucune personne.

## Classification et aliases

Le classifieur pur retourne A a F, les indices detectes et leurs justifications. Seules A et B peuvent produire un alias `CONFIRMED`. C et F sont `REVIEW_REQUIRED`; D reste historique; E est exclu. Une numerotation seule est un indice faible et ne suffit pas a creer une structure multi-session.

`scope_activity_legacy_aliases` relie une valeur historique normalisee a une definition existante. L'identite d'un alias confirme est immutable. La contrainte unique `(source_type, normalized_value)` rend l'ingestion idempotente et les aliases ne deviennent jamais des definitions concurrentes.

## Catalogue initial

Le seed haute confiance contient les exercices DPS, DAP, JSP et DPS-DAP, les instructions DPS section/demi-section, ainsi que l'exercice PAPR, la piste gaz et le test physique PR. Les sites sont portes par les publics C2-B. DPS-DAP reste une seule definition avec deux DomainBindings et deux contributions Stat.Com `MANUAL` tant que la ventilation n'est pas arbitree.

Les besoins 2027 PAPR et test physique sont crees `DRAFT`. Le passage `READY` utilise exclusivement `prepareAnnualRequirementReady()`: public actif, version de regle epinglee, snapshot complet et fingerprint valide sont obligatoires.

Restent en revue: JSP-CAD, periodicite PABC, simulateur et cursus candidat PAPR, detail CI-DAP, taxonomie FOCA, sens de TRUCK/CAR, ventilation DPS-DAP et activites FOSPEC/AUTO insuffisamment decrites. VPC et ses aliases personnels restent geres par C3-B.

## Projection et miroir

La projection C4 expose le domaine primaire et tous les DomainBindings, PublicBindings et StatisticalContributions. Chaque obligation porte `plannedOccurrenceId`; chaque intention de proposition porte `plannedOccurrenceSessionId`. `CATALOG_C4` est une provenance QV explicite et exige un lien d'occurrence.

La reconciliation C5-B est pure: elle propose des liens mais ne produit aucune ecriture. Une obligation ou proposition humaine est marquee `LINK_ONLY_PRESERVE_DECISION` ou `LINK_ONLY_PRESERVE_DATE`. Une entree C/F n'est jamais absorbee. Le comparateur expose les exclusivites et les differences de definition, sessions, domaines, publics, statistiques et planification.

## Corpus et ingestion future

Le diagnostic utilise seulement les fixtures et referentiels versionnes. Il annonce explicitement que le classeur QUO VADIS complet est absent et ne pretend pas classifier ses quelque 925 lignes. Une ingestion future passera par le meme classifieur, produira un rapport A-F, puis requerra un visa MOA pour C/F avant toute creation canonique.

Commandes autonomes:

```sh
npm run test:scope-catalog-convergence-c5-b
npm run diagnostic:scope-catalog-convergence-c5-b
npm run diagnostic:scope-catalog-convergence-c5-b -- --json
```

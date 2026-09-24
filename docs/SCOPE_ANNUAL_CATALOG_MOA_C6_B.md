# Catalogue annuel MOA C6-B

## Responsabilite

C6-B expose la premiere interface MOA de la chaine canonique C1-C5. Le flux reste `ActivityDefinition` -> `ActivityDefinitionVersion` -> `AnnualRequirement` -> `PlannedOccurrence` -> `PlannedOccurrenceSession` -> projection `CATALOG_C4`. Il ne cree ni evenement operationnel, ni attendu, ni participation et ne resout aucune personne nominative.

Le catalogue V1 est limite aux neuf definitions haute confiance de C5-B. Les hypotheses JSP-CAD, PABC, FOCA, FOSPEC et AUTO non arbitrees restent fermees.

## Activation controlee

`ensureScopeSchema()` conserve le bootstrap historique jusqu'a QUO VADIS referential management, mais n'appelle plus les migrations C1-C5. Ces migrations sont appliquees uniquement par une action operateur explicite.

La readiness est strictement en lecture seule. Elle controle les cinq marqueurs, les tables et colonnes structurantes, ainsi que les fonctions et triggers critiques. Elle retourne `SCHEMA_READY`, `MIGRATION_REQUIRED` ou `SCHEMA_INCOMPATIBLE`, avec des capacites structurees. Une erreur de lecture echoue fermee en `MIGRATION_REQUIRED`; aucun detail SQL n'est expose a l'utilisateur.

## Contrat annuel

Un besoin `DRAFT` peut modifier son nombre d'occurrences, sa fenetre et sa variante. Le passage `READY` reutilise `prepareAnnualRequirementReady()`: version d'activite ACTIVE, public actif, version de regle applicable epinglee, snapshot canonique et fingerprint SHA-256 sont obligatoires. Un besoin READY reste immutable.

La generation reutilise `generateAnnualProgram()`. Les identifiants deterministes et les contraintes `ON CONFLICT` rendent les occurrences et sessions idempotentes. Les deux niveaux restent distincts et aucune personne n'est assignee.

## QUO VADIS miroir

L'aperçu reutilise `projectToQuoVadis()` en memoire. La reponse porte `mode: MIRROR`, `operationalWrites: false` et `eventPublication: false`. C6-B ne materialise aucune obligation ou proposition QUO VADIS et ne peut donc ni remplacer une decision humaine ni modifier une date humaine.

## Interface

`Catalogue annuel` precede `Agenda annuel` dans QUO VADIS. La liste fournit annee, recherche, domaine, etat et reinitialisation. La fiche separe identite, structure, publics, qualifications, roles, lieux, contraintes, Stat.Com et programme annuel. Les etats utilisent un carre de 8 px et du texte, sans badge ni couleur de domaine.

Commandes autonomes:

```sh
npm run test:scope-annual-catalog-moa-c6-b
npm run diagnostic:scope-annual-catalog-moa-c6-b
```

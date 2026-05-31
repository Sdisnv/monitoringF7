# Schema de donnees — Monitoring F7 v60

## Principe

La v60 expose un schema de donnees explicite dans `assets/js/data-schema.js`. Ce schema sert de reference commune pour les futurs imports, exports, controles et contrats API.

Il ne migre pas les donnees et ne change pas les regles metier.

## Version

- Application : `Monitoring F7 v60`.
- Schema : `schemaVersion = 4`.
- Mode actuel : client-only, offline-first.

## Entites referencees

### MonitoringRecord

Entite principale de formation / exercice.

Champs attendus :

- `id`
- `dateExercice`
- `domain`
- `subStructure`
- `template`
- `statCom`
- `status`
- `aComptabiliser`
- effectifs : `nbConvoques`, `nbPresents`, `nbMaladie`, `nbAccident`, `nbArmee`, `nbProfessionnel`, `nbPrive`, `nbAbsents`, `nbPermutation`
- `remarque`
- `importedEventId`
- `createdAt`
- `updatedAt`

Champs requis minimaux : `id`, `dateExercice`, `domain`, `subStructure`, `template`.

### ImportedEvent

Evenement importe pour traitement operationnel.

Champs attendus : `id`, `dateExercice`, `domain`, `subStructure`, `template`, `statCom`, `status`, `createdAt`, `updatedAt`.

Champs requis minimaux : `id`, `dateExercice`, `domain`, `template`.

### ReferencePeriod

Periode ou referentiel utilise par les onglets de suivi.

Champs attendus : `id`, `dateEffective`, `dateEnd`, `domaines`, `organes`, `foba`, `suivi`, `createdAt`, `updatedAt`.

Champs requis minimaux : `id`, `dateEffective`.

### Objective

Objectif parametre pour le suivi et les indicateurs.

Champs attendus : `key`, `value`, `domain`, `scope`, `updatedAt`.

Champs requis minimaux : `key`, `value`.

### AuditEntry

Entree du journal local de diagnostic.

Champs attendus : `id`, `level`, `eventType`, `status`, `message`, `context`, `at`, `version`.

Champs requis minimaux : `id`, `level`, `eventType`, `message`, `at`.

## Enveloppe export

Le schema declare une enveloppe cible :

- `type = MonitoringF7Export`
- `schemaVersion = 4`
- `appVersion = v60`
- entites : `records`, `importedEvents`, `referencePeriods`, `objectives`

## Limites

Le schema v60 est volontairement declaratif. Il prepare la stabilisation future, mais ne remplace pas encore les controles metier historiques.

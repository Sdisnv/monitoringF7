# Monitoring F7 v53 — Rapport stockage Phase 4

## Objectif

La Phase 4 met en place une migration progressive du stockage local vers une couche centralisée, sans refonte métier et sans suppression des anciennes données.

## Stratégie IndexedDB

Le fichier `assets/js/storage.js` devient le `StorageService` central. Il expose :

- `initStorage()` ;
- `saveData()` ;
- `loadData()` ;
- `exportBackup()` ;
- `validateStoredData()` ;
- `migrateLegacyStorageIfNeeded()` ;
- `getStorageDiagnostics()`.

IndexedDB est utilisé comme stockage plus robuste lorsque le navigateur le permet. Les écritures historiques passent aussi par des wrappers compatibles `getJSON()` et `setJSON()` afin de ne pas réécrire brutalement l’application.

## Compatibilité localStorage

Les anciennes clés `localStorage` sont conservées. La v53 ne supprime pas automatiquement les données historiques. En cas d’échec IndexedDB, l’application continue avec `localStorage`.

## Migration

La migration est :

- automatique ;
- idempotente ;
- non destructive ;
- journalisée ;
- limitée aux clés connues de Monitoring F7.

Avant migration, une sauvegarde locale est créée dans `monitoring_f7_storage_backup_before_migration_v53`.

## Versionnage schéma

Chaque donnée stockée dans IndexedDB est enveloppée avec :

- `storageSchemaVersion` ;
- `appVersion` ;
- `createdAt` ;
- `updatedAt` ;
- `sourceVersion` ;
- `migrationHistory`.

Les exports JSON v53 ajoutent aussi des informations de diagnostic stockage sans modifier les tableaux métier.

## Validation données

La validation reste douce : elle contrôle les structures minimales attendues, les types essentiels et les volumes inhabituels. Une donnée récupérable n’est pas bloquée brutalement.

## Diagnostics

`getStorageDiagnostics()` retourne notamment :

- disponibilité IndexedDB ;
- disponibilité localStorage ;
- quota localStorage approximatif ;
- dernière sauvegarde ;
- dernière migration ;
- version de schéma ;
- erreurs récentes.

Le diagnostic est journalisé dans la console au chargement.

## Rollback

Retour arrière simple : redéployer la v52. Les données localStorage historiques n’ayant pas été supprimées, la v52 peut continuer à les lire.

## Limites client-only

Cette phase ne fournit pas de sécurité serveur, d’authentification forte ni de synchronisation multi-utilisateurs. Les données restent locales au navigateur.

## Recommandations Phase 5

- consolider les KPI et graphiques dans des modules encore plus isolés ;
- ajouter un écran diagnostic admin si souhaité ;
- préparer des migrations de schéma plus fines si de nouveaux champs métier apparaissent ;
- renforcer les tests de comparaison KPI v52/v53 avec jeux de données réels.

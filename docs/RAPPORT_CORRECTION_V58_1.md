# Rapport correction — Monitoring F7 v58.3

## Objectif

Monitoring F7 v58.3 corrige les problèmes constatés après mise en ligne serveur sans ajouter de grande fonctionnalité et sans modifier les règles métier.

La version reste client-only, offline-first et compatible Netlify gratuit.

## Corrections réalisées

### Profil utilisateur / Paramètres utilisateur

Le message abrupt affiché lors de l’accès au profil ou aux paramètres a été remplacé par un message plus professionnel :

- titre : `Profil local Monitoring F7` ;
- clarification du profil local ;
- clarification du NIP local ;
- rappel que le NIP ne constitue pas une authentification institutionnelle serveur ;
- rappel que les données restent stockées localement via `localStorage / IndexedDB`.

### Information session

L’information session est conservée, mais présentée comme information technique et non comme erreur.

La version affichée est désormais `v58.3`.

Une mention a été ajoutée :

> Cette version est adaptée à un pilote local/offline-first. Une persistance centralisée nécessitera une phase backend ultérieure.

### Gestion des événements

Le flux d’import et de sélection d’événements a été renforcé :

- contrôle du bouton `importEventsBtn` ;
- contrôle du champ fichier `eventsFileInput` ;
- activation explicite du bouton et du champ fichier ;
- protection contre les problèmes de clic bloqué ;
- message clair si aucun événement importé n’est disponible dans la liste ;
- message clair si le fichier importé est invalide ;
- journalisation audit-log non intrusive.

Événements audit-log ajoutés ou clarifiés :

- `import-events-launch` ;
- `import-events-picker-open` ;
- `import-events-file-selected` ;
- `import-events-invalid-file` ;
- `import-events-success` ;
- `import-events-error` ;
- `select-imported-event`.

## Stockage local / backend futur

La documentation `docs/STOCKAGE_LOCAL_ET_EVOLUTION_BACKEND_V58_3.md` a été ajoutée.

Elle rappelle que :

- `localStorage / IndexedDB` ne sont pas une base centralisée ;
- les données ne sont pas partagées entre utilisateurs/postes ;
- un changement de navigateur ou d’appareil ne restaure pas automatiquement les données ;
- l’export/import reste nécessaire pour le transfert manuel ;
- une évolution future vers Netlify Blobs ou base de données nécessitera une phase backend dédiée.

## Décisions conservées

- `backendEnabled = false` ;
- `SyncService` inactif ;
- aucun backend réel ajouté ;
- aucun appel réseau obligatoire ajouté ;
- Netlify gratuit conservé ;
- GitHub conservé ;
- IndexedDB/localStorage conservés ;
- StorageService conservé ;
- audit-log conservé ;
- imports/exports conservés ;
- dashboard commandement conservé ;
- KPI et graphiques non modifiés.

## Contrôles de non-régression à effectuer en recette

- login/logout local ;
- accès profil ;
- paramètres utilisateur ;
- information session ;
- import événement CSV ;
- sélection d’un événement importé ;
- export événement CSV ;
- import JSON ;
- export JSON ;
- IndexedDB ;
- localStorage ;
- StorageService ;
- audit-log ;
- dashboard commandement ;
- KPI ;
- graphiques ;
- ouverture Netlify ;
- ouverture localhost ;
- ouverture locale si supportée ;
- console sans erreur bloquante.

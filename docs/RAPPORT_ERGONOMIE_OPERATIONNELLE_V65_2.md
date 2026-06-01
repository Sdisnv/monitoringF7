# Rapport ergonomie operationnelle — Monitoring F7 v65.2

## Objectif

La v65.2 clarifie les zones operationnelles sans modifier les calculs metier, les imports/exports, le stockage local, la synchronisation preparee ou les Netlify Functions.

## Corrections appliquees

- Version visible et configuration centrale alignees en `v65.2`.
- Onglet principal `Administration` renomme en `Gestion`.
- Navigation Gestion simplifiee :
  - `Importer`
  - `Sauvegarder`
  - `Admin local`
  - `Diagnostic`
- Menu utilisateur clarifie :
  - `Profil local`
  - `Preferences locales`
  - `Session locale`
  - `Export rapide`
- Modales profil/session/preferences clarifiees pour eviter toute ambiguite avec un compte serveur.
- Messages operationnels harmonises pour les actions admin, sauvegarde, diagnostic et navigation Gestion.
- Le changement de code Admin local conserve la verification du code courant introduite en v65.1.
- Les styles des modales utilisateur sont regroupes dans `monitoring-f7-evolution.css` au lieu de rester integralement inline.

## Ce qui n'a pas ete modifie

- Calculs KPI.
- Formulaires metier.
- Import JSON / CSV.
- Export JSON / CSV.
- Gestion des evenements.
- StorageService IndexedDB/localStorage.
- Backend optionnel.
- Netlify Functions.
- Synchronisation preparee, toujours inactive par defaut.

## Tests de validation

- Login local avec code d'acces configure.
- Menu utilisateur : profil, preferences, session, export rapide.
- Navigation Gestion : Importer, Sauvegarder, Admin local, Diagnostic.
- Deverrouillage Admin local.
- Refus changement code Admin si code courant incorrect.
- Messages operationnels visibles puis masques automatiquement.
- Diagnostic backend/sync toujours en mode inactif par defaut.


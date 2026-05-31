# Monitoring F7 — GitHub, Netlify et persistance locale

## Principe

L’application reste une application statique offline-first compatible Netlify gratuit. Le dépôt GitHub contient uniquement le code, les assets et les fichiers de référence. Les données utilisateur ne sont jamais stockées dans GitHub ni dans Netlify : elles restent dans le stockage local du navigateur (`localStorage` actuellement utilisé par l’application).

## Workflow recommandé

1. Modifier le code localement.
2. Tester l’ouverture locale de `index.html`.
3. Commit / push sur GitHub.
4. Laisser Netlify déployer les fichiers statiques.
5. Les données déjà présentes dans le navigateur de l’utilisateur sont conservées automatiquement tant que le même navigateur/profil est utilisé.
6. Avant une grosse mise à jour, utiliser `Paramètres / Sauvegarde` → `Exporter sauvegarde complète`.
7. Après incident ou changement de poste, utiliser `Restaurer sauvegarde complète`.

## Séparation code / données

- Code versionné : `index.html`, `assets/css/*`, `assets/js/*`, `assets/img/*`, `docs/*`.
- Données utilisateur : stockage local navigateur.
- Sauvegardes : fichiers JSON exportés manuellement, à conserver hors dépôt public.
- CSV / JSON de référence : fichiers statiques dans `assets/data/` si nécessaires, sans données utilisateur sensibles.

## Sécurité Admin locale

Le menu Admin utilise un code local hashé dans le navigateur. Le code initial est `1234` et doit être changé. Cette protection évite les manipulations accidentelles sur un poste partagé, mais ne remplace pas une authentification serveur réelle.

## Migrations

Une clé `monitoring_f7_data_meta_v1` conserve :

- `appVersion`
- `dataSchemaVersion`
- `lastMigrationAt`
- `storageMode`

Les évolutions doivent rester non destructives par défaut. Toute opération de suppression ou remplacement global doit demander une confirmation explicite.

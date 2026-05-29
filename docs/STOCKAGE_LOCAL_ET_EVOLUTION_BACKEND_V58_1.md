# Stockage local et évolution backend — Monitoring F7 v58.3

## État livré en v58.3

Monitoring F7 v58.3 conserve un fonctionnement client-only, local et offline-first.

Les données applicatives restent stockées dans le navigateur au moyen de :

- `localStorage` pour les paramètres légers, la session locale et certains états applicatifs ;
- `IndexedDB` via `StorageService` pour les données plus structurées et la conservation locale robuste ;
- export/import JSON ou CSV pour les transferts manuels.

Aucun backend réel n’est activé dans cette version.

## Limites du stockage local navigateur

Le stockage local navigateur n’est pas une base centralisée.

Conséquences importantes :

- les données ne sont pas partagées automatiquement entre utilisateurs ;
- les données ne sont pas partagées automatiquement entre postes ;
- un changement de navigateur ne retrouve pas automatiquement les données ;
- un changement d’appareil ne retrouve pas automatiquement les données ;
- une suppression des données du navigateur peut effacer les données locales ;
- les sauvegardes et transferts restent dépendants des exports/imports manuels.

Cette architecture est adaptée à un pilote local/offline-first, à condition de conserver une discipline d’export et de sauvegarde.

## Profil local, session locale et NIP

Le profil Monitoring F7 est local au navigateur.

Le NIP protège l’accès local à l’interface et améliore l’ergonomie de session. Il ne constitue pas une authentification institutionnelle serveur.

Il ne faut donc pas assimiler ce NIP à :

- une authentification centralisée ;
- une gestion d’identité institutionnelle ;
- une séparation forte des droits entre utilisateurs ;
- une sécurité backend.

## Options futures possibles

Une persistance centralisée devra faire l’objet d’une phase backend ultérieure.

Options techniques envisageables :

### Netlify Blobs

Netlify Blobs peut servir de stockage objet ou key-value léger pour certains exports, états ou paquets de données.

Cette option nécessiterait :

- des Netlify Functions ou endpoints serveur ;
- une stratégie de clés et de séparation des données ;
- une authentification réelle si plusieurs utilisateurs accèdent aux données ;
- une politique de sauvegarde/restauration.

### Netlify Database / Postgres

Une base structurée de type Postgres peut être envisagée pour une gestion multi-utilisateur plus robuste.

Cette option nécessiterait :

- un modèle de données explicite ;
- des endpoints serveur ;
- une vraie authentification ;
- des rôles admin/utilisateur ;
- des droits d’accès ;
- une stratégie de sauvegarde, restauration et migration.

## Décisions conservées en v58.3

- `backendEnabled = false` ;
- `SyncService` inactif ;
- aucun appel réseau obligatoire ajouté ;
- Netlify gratuit conservé ;
- ouverture locale conservée lorsque le navigateur le permet ;
- imports/exports existants conservés ;
- règles métier, KPI et graphiques non modifiés.

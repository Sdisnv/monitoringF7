# Rapport architecture ciblee — Monitoring F7 v65.5

## Objectif

La v65.5 amorce l'extraction progressive auth/session/UI sans reecrire l'application. Le mode offline-first reste prioritaire et aucun backend reel n'est active.

## Corrections appliquees

- Ajout de `assets/js/session-service.js`.
- Centralisation des cles de session et profil local dans `MonitoringSessionManager`.
- `auth.js` delegue maintenant lecture/ecriture/clear/logout de session au service dedie.
- `MonitoringAuthService` reste expose pour compatibilite avec les appels existants.
- Ajout de `assets/js/ui/user-modal.js`.
- La modale utilisateur locale est extraite dans `MonitoringUserModal`.
- `monitoring-f7-evolution.js` utilise progressivement `MonitoringSessionManager` et `MonitoringUserModal`.
- Suppression de plusieurs acces directs aux cles `monitoring_sdis_auth_session_*` dans la couche UI.
- Version applicative alignee en `v65.5`.
- Cache-busting CSS responsive aligne en `?v=65.4`.

## Ce qui reste volontairement inchange

- Backend desactive par defaut.
- Netlify Functions non modifiees.
- StorageService IndexedDB/localStorage non modifie.
- Calculs metier non modifies.
- Imports/exports non modifies.
- KPI et gestion des evenements non modifies.
- Synchronisation preparee mais inactive.

## Architecture cible progressive

### Couche session locale

`MonitoringSessionManager` devient le point d'entree stable pour :

- lire la session locale ;
- creer une session locale ;
- nettoyer une session ;
- lire et patcher le profil local ;
- deconnecter l'utilisateur.

Les anciennes API `MonitoringAuthService.readSession()` et `MonitoringAuthService.logout()` restent disponibles comme wrappers.

### Couche auth locale

`auth.js` reste responsable de :

- verifier le NIP et le code d'acces local ;
- gerer le formulaire de login ;
- exposer l'etat auth local/backend prepare.

La logique de stockage session/profil n'est plus dupliquee dans `auth.js`.

### Couche UI utilisateur

`MonitoringUserModal` isole la creation, ouverture et fermeture des modales utilisateur locales. La prochaine phase pourra extraire davantage de contenu UI sans toucher aux calculs metier.

## Risques reduits

- Moins de duplication des cles de session.
- Deconnexion locale centralisee.
- Compatibilite conservee pour les modules qui appellent encore `MonitoringAuthService`.
- Preparation plus claire d'une future authentification serveur.

## Tests de validation

- Login local.
- Refresh navigateur.
- Deconnexion/reconnexion.
- Menu utilisateur : profil, preferences, session.
- Changement du nom affiche.
- Onglet Gestion / Diagnostic.
- Backend toujours desactive.
- Sync toujours inactive.


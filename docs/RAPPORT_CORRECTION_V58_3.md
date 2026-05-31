# Rapport correction — Monitoring F7 v58.3

## Objectif

Stabiliser l'accès au profil, aux paramètres utilisateur et aux informations de session depuis une mise en ligne serveur Netlify, sans introduire de backend réel et sans modifier le fonctionnement offline-first.

## Corrections appliquées

### Accès Profil local

L'accès au profil ne repose plus sur une simple alerte navigateur. Un panneau intégré affiche désormais :

- le profil local Monitoring F7 ;
- le NIP local ;
- le statut de session ;
- le début de session ;
- la date de référence ;
- l'origine d'exécution (`served-origin` ou `local-file`) ;
- la version applicative.

Le message rappelle clairement que le NIP est une barrière UX locale et non une authentification institutionnelle serveur.

### Accès Paramètres utilisateur

Les paramètres utilisateur disposent désormais d'un panneau local dédié. La v58.3 ajoute uniquement un réglage léger et local :

- nom affiché dans l'interface.

Ce réglage est stocké localement dans le navigateur et n'est pas synchronisé entre postes.

### Session locale serveur statique

La session locale reste une session navigateur. Pour améliorer la continuité en contexte serveur Netlify/statique, la session active est également copiée dans une clé locale contrôlée :

- `monitoring_sdis_auth_session_backup_v1`.

Cette sauvegarde sert uniquement à restaurer l'état local de l'interface dans le même navigateur. Elle ne constitue pas une session serveur et ne remplace pas une authentification réelle.

### Journalisation locale

Les actions suivantes sont journalisées dans l'audit-log local :

- ouverture du profil local ;
- ouverture des paramètres utilisateur ;
- enregistrement des paramètres locaux ;
- consultation des informations session.

## Sécurité et limites conservées

La v58.3 conserve strictement le modèle suivant :

- application client-only ;
- stockage local navigateur ;
- offline-first ;
- absence de backend réel ;
- absence de synchronisation réelle ;
- absence de comptes serveur ;
- absence de gestion centralisée des droits.

## Backend optionnel

Aucun backend n'a été ajouté dans cette phase.

- `backendEnabled = false` conservé.
- `SyncService` inactif conservé.
- Aucun endpoint serveur obligatoire.
- Aucun appel réseau obligatoire.

Une future phase pourra ajouter Netlify Functions, Netlify Blobs ou une base structurée, mais cela devra être traité comme une évolution backend distincte avec authentification réelle et droits utilisateurs.

## Contrôles de non-régression recommandés

- Connexion locale avec NIP/mot de passe.
- Rechargement page sur serveur Netlify après connexion.
- Ouverture Profil.
- Ouverture Paramètres utilisateur.
- Modification du nom affiché.
- Ouverture Information session.
- Déconnexion locale.
- Import/export événements.
- Import/export JSON.
- IndexedDB.
- localStorage.
- Dashboard commandement.
- KPI et graphiques.

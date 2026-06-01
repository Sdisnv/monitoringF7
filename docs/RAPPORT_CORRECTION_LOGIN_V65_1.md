# Rapport correction login — Monitoring F7 v65.1

## Objectif

La v65.1 stabilise l'acces local sans activer de backend. Le login reste une barriere applicative navigateur, adaptee au mode Netlify gratuit et offline-first, mais il ne pretend pas fournir une authentification institutionnelle serveur.

## Corrections appliquees

- Suppression du changement de mot de passe utilisateur dans l'ecran de login.
- Suppression des champs `authNewPassword`, `authNewPasswordConfirm` et du bloc `authChangeBlock`.
- Remplacement du message de premiere connexion par un message d'acces local stable.
- Ajout d'une configuration `MonitoringConfig.localAuth` pour maitriser les acces localement.
- Conservation d'une compatibilite douce avec les profils v65 deja crees dans le navigateur.
- Refus de toute creation de compte depuis l'interface.
- Protection du changement de code Admin local par verification du code courant.

## Configuration locale

La configuration active se trouve dans `assets/js/config.js`.

Par defaut, la v65.1 accepte un NIP saisi avec le code d'acces local configure par `sharedAccessPasswordHashHex`. Le hash livre correspond au code initial `1234`, afin de ne pas bloquer les postes pilotes apres mise a jour.

Pour un usage institutionnel plus strict, renseigner `localAuth.users` avec les NIP autorises et passer `requireKnownNip` a `true`.

Exemple :

```js
localAuth: Object.freeze({
  mode: 'local-browser-only',
  requireKnownNip: true,
  sharedAccessEnabled: false,
  sharedAccessPasswordHashHex: '',
  users: Object.freeze([
    {
      nip: '123456',
      displayName: 'Utilisateur SDIS',
      role: 'sdis-user',
      passwordHashHex: 'HASH_SHA256_DU_CODE'
    }
  ])
})
```

## Limites de securite

Les identifiants et hashes presents dans une application statique restent inspectables par une personne ayant acces au navigateur et aux fichiers deployes. Cette correction evite les blocages et clarifie le comportement, mais ne remplace pas une authentification serveur.

L'authentification serveur reste preparee par les Netlify Functions et par `backend-config.js`, mais elle demeure desactivee par defaut.

## Tests de recette prioritaires

- Premiere ouverture apres deploiement.
- Connexion avec NIP et code local configure.
- Mauvais NIP si `requireKnownNip` est actif.
- Mauvais code d'acces local.
- Refresh navigateur.
- Fermeture puis reouverture navigateur.
- Deconnexion puis reconnexion.
- Absence de bouton creation de compte.
- Absence de champ nouveau mot de passe.
- Absence de bloc `authChangeBlock`.
- Safari normal.
- Safari navigation privee.
- Chrome.
- Diagnostic sync v65 toujours inactif par defaut.
- Imports et exports JSON/CSV inchanges.


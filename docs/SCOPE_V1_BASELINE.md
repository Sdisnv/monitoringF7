# SCOPE V1.0 - BASELINE

Date de gel : 2026-09-06

## Identification

- Version : SCOPE V1.0 - BASELINE
- Branche de reference : `main`
- Commit fonctionnel deploye : `2bf55acb79c13c941ffb5460a721b09fc38a7ddf`
- Deploy Netlify V1 : `6a9da2985056d311756b861b`
- URL production : `https://scope-sdisnv.netlify.app`
- Site Netlify : `scope-sdisnv`
- Site ID : `6def8d4d-78c6-4112-bb76-6891df0e0a52`
- Build : `dist/scope`
- Functions Netlify attendues : 24

Le commit documentaire qui porte ce fichier est le point Git de gel de la baseline. Le deploy production ci-dessus correspond au dernier commit fonctionnel SCOPE V1.

## Architecture fonctionnelle V1

SCOPE V1 couvre les blocs suivants :

- authentification Okta/OIDC stricte, sans mode DEMO ;
- RBAC applicatif centralise cote API ;
- evenements et presences nominatives ou quantitatives ;
- PR/PAPR multi-seances, encadrement et consolidation ;
- cycles PR et AUTO ;
- personnel, affectations, temporalite et fiches individuelles ;
- vigilance participation ;
- analyses globales, par domaine, OI, specialisation et individu ;
- rapports et exports PDF ;
- administration des objectifs, suivi nominatif, imports et utilisateurs.

## Navigation V1

Menu principal de reference :

- Accueil
- Activite
  - Evenements
  - Cycles
- Pilotage
  - Vigilance
  - Analyses
- Personnel
- Rapports
- Administration
  - Application : Objectifs, Suivi nominatif
  - Imports : Evenements, Personnel
  - Acces : Utilisateurs
  - A propos

Les routes `#/vue/...` restent des vues contextuelles de drill-down. Elles ne recreent pas un groupe principal Domaines.

## Roles V1

Roles applicatifs affiches :

- Utilisateur
- Gestionnaire
- Administrateur

Les anciens roles restent traites comme aliases de compatibilite quand le backend les rencontre, mais ne constituent pas des profils V1 affiches.

## Personne et Utilisateur

`Personne` est l'objet metier suivi par SCOPE : NIP, grade, nom, prenom, affectations, specialisations, historique et participations.

`Utilisateur` est le profil applicatif autorise a acceder a SCOPE : identifiant Okta/OIDC, email, nom affiche, roles, permissions et etat actif/inactif.

Un utilisateur SCOPE n'est pas automatiquement une personne monitoree, et une personne monitoree n'a pas automatiquement un compte SCOPE.

Le NIP est la cle metier de rapprochement des Personnes. Il n'est pas la cle primaire des Utilisateurs.

## Recette et tests PASS

Campagne finale executee le 2026-09-06 :

- `npm run check` : PASS
- `npm run scope:preflight` : PASS, cible SCOPE verifiee
- `npm run test:scope` : PASS
- `netlify build` : PASS
- Build command : `node scripts/build-scope-static.js`
- Repertoire statique : `dist/scope`
- Manifest Netlify : 24 Functions

Contrats couverts par la suite globale :

- auth/RBAC ;
- evenements/presences ;
- multi-session PR/PAPR ;
- personnel/temporalite ;
- cycles ;
- vigilance ;
- analytics ;
- rapports/PDF ;
- navigation ;
- administration.

Warnings connus non bloquants :

- PDF.js en environnement Node peut signaler l'absence du module optionnel `canvas` et de polices standards pendant les tests. Les suites restent PASS et le PDF rendu est valide.
- Le dossier local `.netlify/functions` peut contenir 46 ZIP, dont 22 artefacts locaux `* 2.zip` non references par le manifest. Le deploy Netlify utilise les 24 Functions du manifest.

## Controle production

Etat production releve le 2026-09-06 :

- `/` : HTTP 200
- `/scope.html` : HTTP 200
- `/.netlify/functions/auth-me` sans session : HTTP 401
- `/.netlify/functions/auth-oidc-start` : HTTP 302 vers Okta, `redirect_uri=https://scope-sdisnv.netlify.app/auth/oidc/callback`
- `/.netlify/functions/auth-logout` : HTTP 302 vers `/?loggedOut=1` et purge les cookies SCOPE
- Assets SCOPE : `scope-ui.js?v=scope-front-finition-1`

La recette interactive Okta avec un compte reel reste une verification MOA/humaine de production. Les contrats automatises AUTH/RBAC et les controles HTTP publics sont PASS.

## Procedure build/deploy de reference

Preparer et verifier :

```bash
npm run check
npm run scope:preflight
npm run test:scope
netlify build
```

Publier SCOPE uniquement, sans link Netlify ambigu :

```bash
netlify deploy --prod --site=6def8d4d-78c6-4112-bb76-6891df0e0a52 --no-build --dir=dist/scope --message "SCOPE V1.x <commit>"
```

Ne pas utiliser `--dir=.`. Ne pas deployer ORION depuis ce repository.

## POST-V1

Reserves non bloquantes acceptees pour apres baseline :

1. Nettoyage progressif CSS et styles inline residuels.
2. Rationalisation de la suite de tests, sans baisse de couverture metier.
3. Decoupage eventuel de `assets/js/scope-ui.js` uniquement si un lot futur apporte un gain clair.
4. Nettoyage de code mort historique prouve, hors urgence V1.
5. Artefacts locaux `.netlify/functions/* 2.zip` dataless a surveiller, non deployables.
6. Granularite FOCA au-dela du perimetre `GEN` si besoin metier futur.
7. Finitions UX mineures restantes a traiter en V1.x seulement si retour terrain.
8. Recette visuelle authentifiee periodique sur differents profils reels.

## Decision

SCOPE V1.0 est declaree baseline stable si le commit documentaire de gel est present sur `main` et tague `scope-v1.0`.

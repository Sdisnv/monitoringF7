# Checklist recette pilote SDIS — Monitoring F7 v58

## A. Installation et accès

- [ ] ZIP `Monitoring_F7_v58.zip` décompressé sans erreur.
- [ ] Ouverture locale de `index.html` fonctionnelle.
- [ ] Publication Netlify fonctionnelle.
- [ ] Version visible : v58.
- [ ] Logo et assets chargés.
- [ ] CSS chargé sans rupture visible.

## B. Login / session locale

- [ ] Login local accessible.
- [ ] Connexion avec NIP/mot de passe prévue.
- [ ] Logout fonctionnel.
- [ ] Message de session cohérent avec v58.
- [ ] Limite client-only comprise par les testeurs.

## C. Stockage

- [ ] Données existantes toujours visibles après reload navigateur.
- [ ] IndexedDB disponible si navigateur compatible.
- [ ] Fallback localStorage contrôlé si IndexedDB indisponible.
- [ ] Diagnostic stockage lisible.
- [ ] Aucun effacement non demandé.

## D. Imports

- [ ] Import JSON valide accepté.
- [ ] Import JSON corrompu refusé proprement.
- [ ] Import JSON incomplet géré sans crash.
- [ ] Import CSV valide accepté.
- [ ] CSV invalide refusé avec message compréhensible.
- [ ] Rollback fonctionnel après erreur d’import.

## E. Exports

- [ ] Export JSON fonctionnel.
- [ ] Export CSV fonctionnel si utilisé.
- [ ] Export PDF fonctionnel si utilisé.
- [ ] Version export cohérente.
- [ ] Nom de fichier lisible.
- [ ] Données essentielles présentes après réimport de contrôle.

## F. Dashboard commandement

- [ ] KPI principaux visibles.
- [ ] Tableau domaines lisible.
- [ ] Graphique principal lisible.
- [ ] Points de vigilance visibles.
- [ ] Utilisable en réunion sur laptop.
- [ ] Utilisable sur tablette.

## G. KPI / graphiques

- [ ] Aucun NaN affiché.
- [ ] Aucun Infinity affiché.
- [ ] Dataset vide géré proprement.
- [ ] Destruction/recréation Chart.js sans erreur visible.
- [ ] Valeurs métier cohérentes avec la v57.

## H. Audit-log / diagnostic

- [ ] Ouverture de l’application journalisée.
- [ ] Login/logout journalisés.
- [ ] Import/export journalisés.
- [ ] Erreurs visibles dans le diagnostic si provoquées.
- [ ] Export du journal support fonctionnel.
- [ ] Effacement du journal possible après confirmation si prévu.

## I. Backend optionnel / SyncService

- [ ] Backend annoncé comme désactivé.
- [ ] `backendEnabled = false` confirmé.
- [ ] Aucune requête serveur obligatoire.
- [ ] SyncService annoncé comme inactif.
- [ ] Aucun crash lié à la synchronisation.

## J. Responsive et ergonomie

- [ ] Menu utilisable sur laptop.
- [ ] Menu utilisable sur tablette.
- [ ] Tableaux longs lisibles ou scrollables.
- [ ] Graphiques sans débordement majeur.
- [ ] Dashboard lisible sans refonte nécessaire.

## K. Console navigateur

- [ ] Pas d’erreur bloquante au chargement.
- [ ] Pas d’erreur bloquante lors login/logout.
- [ ] Pas d’erreur bloquante lors imports/export.
- [ ] Warnings éventuels documentés.

## L. Validation pilote

- [ ] Test avec jeu de données vide.
- [ ] Test avec jeu de données réel SDIS.
- [ ] Test après reload navigateur.
- [ ] Test après fermeture/réouverture navigateur.
- [ ] Export de sauvegarde réalisé avant validation finale.
- [ ] Risques client-only expliqués aux utilisateurs pilotes.

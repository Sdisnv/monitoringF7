# SCOPE UX ORION ALIGNMENT ARCH 1

## 1. Objet

Ce lot pose les fondations UX/CSS de SCOPE pour rejoindre progressivement le niveau ORION sans refonte ecran par ecran. Les corrections effectuees sont volontairement transversales et limitees : suppression de textes techniques visibles, seuil commun de recherche, premiers tokens/classes reutilisables, et cadrage des prochains lots.

## 2. Cartographie UX actuelle

| Ecran / route | Role metier | Etat UX observe | Priorite suivante |
| --- | --- | --- | --- |
| Accueil | Pilotage global | Vue riche mais encore tres composee par blocs historiques, hierarchie KPI/alertes a clarifier. | Lot accueil pilotage. |
| Evenements | Liste et statut des evenements | Tableau fonctionnel, tri deja professionnalise, densite correcte. Filtres et badges a harmoniser. | Pagination commune et etats vides. |
| Saisie evenement | Presence nominative/quantitative | Flux metier valide, nombreuses sections, encadrement PR/PAPR specifique. | Modales et feedback uniformes. |
| Vues quantitatives | Saisie par volumes | Lisible, mais controles et messages doivent rejoindre les tokens communs. | Harmonisation formulaires. |
| Cycles | Sessions de specialisation | UX recente, proche du standard cible, cartes denses et actions metier. | Alignement badges/tableaux. |
| Personnel | Annuaire et fiches | Le meilleur niveau actuel : tri commun, colonnes metier, filtres conserves. | Servir de reference composants. |
| Fiches Personne | Detail nominatif | Fonctionnel, encore heterogene dans les cartes, historiques et messages. | Lot fiche individuelle. |
| Imports | Preview CSV et validation | Tres metier, mais textes d'aide et zones d'alerte a normaliser. | Standard preview/import. |
| Domaines DPS/DAP/JSP | Vue par cible | Navigation claire, cartes et tableaux variables selon domaines. | Lot vues domaines. |
| PAPR/PR | Cycles, sessions, encadrement | Metier valide, composants specifiques nombreux. | Extraire composants session/personne. |
| AUTO / FOBA | Specialisations | Lisibles mais moins homogenes que PR/PAPR. | Meme gabarit que specialisations. |
| Reglages | Parametres, imports, utilisateurs | Plusieurs textes techniques historiques etaient visibles. | Regrouper qualification et administration. |
| Alertes / rapports | Priorisation et exports | Fonctionnel, palette graphique SDIS deja tokenisee. | KPI/alertes/objectifs communs. |

## 3. Incoherences CSS principales

- Couleurs codees en dur encore presentes dans des blocs historiques, notamment modales, historiques, badges et context banners.
- Deux modeles `.scope-modal` coexistent : overlay pleine page et carte de dialogue dans `.scope-modal-backdrop`.
- Rayons incoherents entre cartes principales, modales, banners, details et controles.
- Ombres appliquees ponctuellement avec valeurs directes.
- Hauteurs de controles partiellement standardisees autour de 40 px, mais petits boutons et filtres restent disperses.
- Etats vides, loaders, info boxes et pagination n'avaient pas de classe commune stable.
- Plusieurs styles inline restent dans les rendus JS (`margin-top:0`, `margin-top:12px`) et devront etre absorbes progressivement.

## 4. Design tokens

Le fichier `assets/css/scope.css` contient deja les bases SCOPE : rouge SDIS, navy, amber, slate, fonds, textes, bordures, rayons, chart tokens et tailles typo.

Ce lot ajoute/rationalise :

- couleurs alias SDIS : `--scope-blue`, `--scope-yellow`, `--scope-green`;
- gamme gris : `--scope-gray-50` a `--scope-gray-900`;
- espacements : `--scope-space-1` a `--scope-space-6`;
- controles : `--scope-control-h`, `--scope-control-h-compact`;
- rayons/ombres : `--scope-radius-md`, `--scope-shadow-sm`, `--scope-shadow-md`;
- z-index : `--scope-z-header`, `--scope-z-modal`, `--scope-z-toast`;
- focus : `--scope-focus-ring`.

## 5. Composants communs poses

- `.scope-ui-card` : carte neutre reutilisable.
- `.scope-empty-state` : etat vide standard.
- `.scope-info-box` : message informatif metier.
- `.scope-loader` : zone de chargement sobre.
- `.scope-pagination`, `.scope-pagination-group`, `.scope-pagination-controls`, `.scope-page-size`, `.scope-page-status` : base commune de pagination.

Ces classes sont des fondations. Elles ne remplacent pas encore tous les composants historiques.

## 6. Header

Le header conserve la structure SCOPE : logo, menu, navigation, utilisateur, deconnexion, alertes et bascule qualification.

Corrections appliquees :

- suppression du badge visible `LIVE/DEMO`;
- suppression du bandeau normal indiquant base technique/session;
- libelles utilisateur neutres si la session n'est pas chargee;
- messages d'acces reformules en langage utilisateur.

La bascule "Inclure les donnees de qualification" reste dans le header dans ce lot car elle pilote un vrai comportement metier/recette via `includeQualification` pour :

- liste des evenements;
- annuaire personnel;
- alertes;
- dashboard;
- rapports;
- services d'analyse.

Decision produit recommandee : deplacer cette bascule dans Reglages ou dans un filtre avance "Donnees de qualification", avec un libelle reserve aux profils habilites.

## 7. Navigation et menus

La navigation laterale est structuree par Accueil, Activite, Domaines et Reglages. Elle est deja responsive et accessible via bouton menu/Escape.

Points a uniformiser ensuite :

- etat courant des groupes domaines;
- densite visuelle des sous-sections;
- relation entre "Evenements", "Cycles" et specialisations;
- deplacement eventuel des fonctions de qualification/administration hors header.

## 8. Modales et alertes

Constat : les modales utilisent deux conventions CSS historiques. Le prochain lot doit converger vers :

- overlay unique;
- carte de dialogue unique;
- actions alignees;
- titres courts;
- aides metier sous forme `.scope-info-box`;
- z-index tokenise.

Ce lot n'a pas migre les modales metier afin d'eviter un risque sur les flux PAPR/PR et personnel.

## 9. Recherche

Standard retenu :

- demarrage automatique apres 3 caracteres;
- debounce commun;
- aucune recherche avant seuil;
- feedback vide seulement apres seuil;
- conservation des filtres actifs.

Correction appliquee : les recherches nominatives de saisie/encadrement utilisent maintenant `SCOPE_SEARCH_MIN_CHARS = 3` et `SCOPE_SEARCH_DEBOUNCE_MS = 280`.

## 10. Pagination

Strategie produit :

- composant commun pour statut, taille de page et boutons;
- taille par defaut selon densite : 12 pour cartes, 25 pour tableaux metier, 50 pour historiques/imports;
- pagination front pour listes deja chargees et volumes moderes;
- pagination API pour personnel/evenements/imports lorsque les volumes depassent le seuil utile;
- priorites : Evenements, Personnel, Imports, Historiques, Vues domaines.

Ce lot cree les classes CSS de fondation sans brancher une pagination fonctionnelle partout.

## 11. Vues domaines et specialisations

Les vues DPS/DAP/JSP et specialisations partagent des besoins communs : KPI de cible, liste d'evenements, alertes, statut, prochaines actions, populations.

Gabarit cible :

- bandeau domaine;
- KPI compacts;
- alertes prioritaires;
- tableau evenementiel commun;
- detail cible/session en drill-down;
- liens rapides vers saisie et rapports.

## 12. Fiches individuelles

Les fiches personnes doivent heriter du standard Personnel :

- identite compacte;
- periodes et statuts lisibles;
- participation globale;
- specialisations;
- historique;
- actions dangereuses en modale standard.

## 13. Architecture Accueil proposee

L'accueil doit devenir un centre de pilotage immediat, pas une page de presentation.

Structure cible :

1. Bandeau compact : periode, alerte prioritaire, derniere synchronisation utile.
2. KPI principaux : participation globale, ecarts objectifs, evenements a traiter, effectifs actifs.
3. Files d'action : saisies ouvertes, imports a valider, alertes P0/P1.
4. Acces metier : Evenements, Personnel, Cycles, Domaines, Rapports.

## 14. KPI, alertes et objectifs

Les KPI doivent distinguer :

- valeur observee;
- objectif;
- ecart;
- tendance;
- criticite;
- perimetre de qualification inclus/exclu.

Les alertes doivent garder le vocabulaire metier : "a traiter", "retard", "objectif non atteint", "population incomplete". Les termes techniques internes ne doivent pas etre exposes.

## 15. Graphiques et palette SDIS

La palette graphique existe deja via `--scope-chart-*` :

- bleu SDIS pour les valeurs principales;
- rouge SDIS pour l'alerte ou l'ecart critique;
- jaune SDIS pour objectifs, avertissements ou statuts intermediaires;
- gris pour references/legacy.

Prochain travail : appliquer cette palette a tous les graphes et legendes, avec contraste et libelles metier.

## 16. Changements appliques dans ce lot

- Suppression de l'affichage normal `LIVE/DEMO` dans le header.
- Suppression des banners visibles "Mode LIVE", "Mode demonstration", "PostgreSQL Monitoring", "Okta" hors contexte technique interne.
- Reformulation de messages utilisateur vers "Connexion requise" / "Connectez-vous".
- Mise a jour de la page Utilisateurs pour ne plus afficher les details de plomberie auth.
- Mise a jour de la page A propos pour supprimer environnement, deploiement et version source visibles.
- Centralisation du seuil de recherche nominative a 3 caracteres.
- Ajout de tokens CSS ORION/SCOPE.
- Ajout de classes de fondation pour carte, etat vide, info box, loader et pagination.

## 17. Prochains lots proposes

1. `SCOPE-HOME-ORION-PILOTAGE-1` : refonte accueil centre de pilotage.
2. `SCOPE-MODAL-ALERT-STANDARD-1` : convergence modales, banners, feedback.
3. `SCOPE-PAGINATION-STANDARD-1` : composant pagination branche sur Evenements, Personnel, Imports.
4. `SCOPE-DOMAINS-ORION-UX-1` : gabarit commun DPS/DAP/JSP/specialisations.
5. `SCOPE-PERSON-FICHE-ORION-1` : fiche individuelle au standard Personnel.
6. `SCOPE-CHARTS-SDIS-PALETTE-1` : palette et legendes graphiques definitives.

## 18. Limites volontaires du lot

- Pas de migration.
- Pas de changement de logique metier.
- Pas de refonte exhaustive des ecrans.
- Pas de suppression de l'authentification ni des modes internes.
- Pas de deplacement de la bascule qualification tant que sa cible produit n'est pas validee.

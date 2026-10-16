# QUO VADIS — correctif consolidé post-PR #33, 16.10.2026

Statut : **développé et vérifié techniquement sur branche isolée ; recette MOA production EN ATTENTE**. GO développement explicite du mandat humain « SCOPE ONLINE — MANDAT CORRECTIF CONSOLIDÉ PR #33 ». Fusion, déploiement et mutation de production non autorisés. **Programme annuel 2027 NON VALIDÉ.** Aucun PASS MOA ou GO de publication déduit des tests locaux.

## Base et périmètre vérifiés

Branche : `codex/scope-qv-correctif-r33-20261016`, créée depuis main directement vérifié **`ef679b06ce8faebb27911a86e0766b5eb4cd8b9d`**. #33 fusionnée le 16.10 à 12:44:44 UTC ; aucune PR ouverte au départ et à la revérification avant livraison. Production `scope-sdisnv`, site `6def8d4d-78c6-4112-bb76-6891df0e0a52`, déploiement **`6ad21c7a2c50c1b3d62ab95f`**, ready, même SHA, publication **12:46:46.231 UTC / 14:46:46.231 Europe/Zurich**. [Métadonnées et empreinte du mandat](captures/qv-correctif-r33-20261016/preflight.json).

Worktree attaché propre réutilisé ; modifications étrangères du checkout partagé préservées. Contrôles externes limités aux métadonnées GitHub/Netlify ; aucun GET métier, accès SQL ou écriture de production. Une PR finale avec `[skip netlify]`, sans fusion automatique. Les états de livraison GitHub restent vérifiables dans la PR ; les empreintes de ce rapport identifient les fichiers testés.

Précontrôles documentaires : [contexte maître](SCOPE_PROJECT_MASTER_CONTEXT.md), [reprise/livraison](project-context/SCOPE_REPRISE_ET_LIVRAISON.md), [canon](business-rules/quo-vadis-canonical-rules.md), mêmes [roadmap](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), [décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md) et [anomalies](audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md). Rapports/preuves pertinents relus : [#31](SCOPE_QV_CORRECTIF_MOA_20261016.md), [#32](SCOPE_QV_UX_ORGANISATION_20261016.md), [#33](SCOPE_QV_ACCELERATION_UX_20261016.md). Aucun audit ni campagne acquise rejoué. Les OS et décisions institutionnelles antérieures conservent leurs statuts ; aucune règle métier ajoutée par supposition.

## Existant, manque et correction

| Composant existant réutilisé | Défaut ciblé à #33 | Correction de ce lot |
|---|---|---|
| Navigation QV commune, trois groupes et dix routes | Grille et retour à la ligne des liens | Flux commun des groupes ; dix menus sur une ligne à 1440 px, intitulés intacts, trait actif sous le libellé ; groupes adaptés et défilement interne aux faibles largeurs |
| `qv-programme-choice-menu`, recherche institutionnelle/alias et positionnement des popovers | Focus absent, options pouvant hériter du gras ; grandes listes natives dans le contrôle | Même composant pour types, modèles et occurrences ; liaison commune unique du focus et clavier ; valeurs normales et géométrie DS commune, sans nouveau framework |
| Recherche normalisée, données canoniques chargées, `qvPilotPager` | Recherche à déclencher ; premiers quarante choix seulement | Filtrage synchrone avant pagination, pages de 25 accessibles ; sélections dans le contexte indépendantes de la page ; champ de recherche conservé pendant les mises à jour, aucun réseau par caractère |
| `qvProgrammeCorrectionProposals` et compatibilité par règle/type/OI | Destinataires sélectionnés par types entiers | Seule extension du moteur : filtre optionnel `occurrenceIds` ; l’UI fournit les IDs choisis individuellement. Sorties par défaut identiques à main ; aucun moteur parallèle |
| Modèle enregistré et lien Harmonisation depuis la fiche | Choix de destinataires à reconstruire, champs source absents encore affichés | Source exacte depuis la fiche ; autres occurrences du même type proposées immédiatement ; choix individuel explicite, récapitulatif ; champs disponibles seulement, dont false renseigné |
| `sortRows`, `nextSort`, `sortHeaderState`, pagination et liens de fiche | Colonnes combinées, tri non actionnable | Date/Activité/OI/Session séparées ; en-têtes triables avec état accessible ; horodatages complets fournis au tri numérique existant, ordre conservé pendant la pagination |
| Relations `qvProgrammeLinkedRows` et contrôles annuels | Consultation compacte à améliorer | Relations et compteurs inchangés ; colonnes exactes des activités liées, détails type → occurrence → critères et synthèse annuelle conservés |
| Tokens SCOPE-UI-2/UX-DS-1 | Hauteurs et graisses hétérogènes | Public/OI/Responsable/Spécialisation/Cursus mesurés à 40 px, Arial/Helvetica 14 px, valeurs 400 ; titres/libellés gras, options normales ; aucun token global changé |

Navigation conservée : Programme = Agenda annuel, Programme annuel, Synthèse 2027 ; Préparation 2027 = Catalogue, Dates annoncées, Contrôle du programme, À arbitrer, Alertes ; Paramétrage = Cursus, Règles. Pas de doublon, suppression de capacité ou nouvelle entrée métier. La règle informative bleue et son alerte indépendante gardent les surfaces, actions et moteurs acquis à #33.

La recherche des types porte sur les types filtrés par famille/OI ; le contrôle de conformité continue de couvrir toutes leurs occurrences et sessions actives. La recherche des modèles/destinataires examine les fiches actives autorisées disponibles par activité, date, OI et session, avant de limiter l’affichage. Les tris utilisent l’heure complète des données, sans comparer les libellés `jj.mm.aa` ; l’utilitaire global de date et les autres écrans conservent leur comportement.

## Harmonisation explicite, sans écriture

Depuis une fiche enregistrée, le modèle est fourni par la route existante. En accès direct, le sélecteur ouvre sa recherche immédiatement. Choisir un modèle propose aussitôt les autres occurrences du même type ; aucun destinataire n’est sélectionné automatiquement. Une option explicite permet d’examiner les autres types accessibles avec le même contrôle de compatibilité.

L’utilisateur choisit chaque occurrence et chaque champ disponible puis demande l’aperçu. Les sélections persistent pendant recherche et pagination ; un récapitulatif nomme les occurrences/session/OI choisies. Le comparateur existant reste seul responsable des règles et compatibilités. Les incompatibilités démontrées des champs demandés sont affichées et désactivées pour une nouvelle sélection ; un choix déjà sélectionné incompatible reste retirable et interdit le lancement tant qu’il demeure incompatible. Les cas à arbitrer restent identifiés comme tels dans l’aperçu. Les règles confirmées du destinataire dominent le modèle ; aucune reprise incompatible recommandée.

Changer le modèle efface destinataires et résultats précédents ; les champs sont restreints à ceux disponibles dans la nouvelle source. L’aperçu fournit identifiant/date/activité, valeurs actuelle/source/proposée, règle, compatibilité, impact et validation nécessaire via les tableaux existants. **Aucune route d’écriture appelée, aucune correction groupée enregistrée.** Les validations et révisions motivées restent celles de la fiche concernée.

## CI et construction

Aucun workflow `.github` versionné ; API Actions `total_count: 0`. `package.json`, `scope.html`, `netlify.toml`, fonctions, base et protections inchangés. Deux échecs antérieurs reproduits sur la base :

- `check-local.sh` s’arrêtait à l’assertion de la route retirée `auth-login`. Le contrôle vérifie maintenant les quatre routes session/config réellement configurées et leurs fichiers, tout en gardant les assertions OIDC start/callback. Les motifs contenant `/api/scope/*` sont lus littéralement avec `grep -F`, afin de vérifier la branche SCOPE effective. Aucun redirect ou mécanisme d’authentification modifié.
- Le cas DS09 reconnaissait une liste d’anciens suffixes CSS. Il vérifie maintenant une unique référence CSS SCOPE versionnée, une version non vide et l’existence de l’asset ; les huit contrôles de primitives et les autres assertions restent présents. Aucun contrôle masqué.

Résultat : [contrôle local PASS](captures/qv-correctif-r33-20261016/check-local.txt), [DS9/9 PASS](captures/qv-correctif-r33-20261016/design-system.txt). Construction statique dans une sortie temporaire isolée : **PASS**, empreintes des trois assets publiés retrouvées dans le HTML construit ; [résultat et SHA-256](captures/qv-correctif-r33-20261016/build-results.json). Aucun fichier de build livré dans Git, aucune exécution de déploiement.

## Matrice de vérification ciblée

Environnement : macOS, Node, Chrome headless, 16.10.2026. Fixtures synthétiques ; tous les accès navigateur interceptés sur une origine fictive, aucun réseau externe. Preuves **techniques locales**, aucune recette MOA.

| Exigence / dépendance | Vérification exécutée | Résultat / preuve | Acceptation MOA |
|---|---|---|---|
| Compatibilité du moteur | Sorties de conformité et harmonisation par défaut comparées à main exact ; filtre IDs = sous-ensemble attendu ; annulations/inactifs/source/hors-type exclus, liste vide sans élargissement | 9/9 tests ciblés, [résultats](captures/qv-correctif-r33-20261016/targeted-results.json) | En attente production |
| Préservations | Garde des champs/types/source, règle TP9 prioritaire, relations et synthèse annuelle identiques ; témoin JSP/version/qualification/historique/lignée et programme byte-identiques | Tests unitaires ciblés ; aucune écriture | En attente production |
| Navigation | Dix routes ouvertes ; mêmes dix intitulés, une ligne à 1440, un indicateur actif sous le texte ; toutes les entrées atteignables aux faibles largeurs | Parcours Chrome et captures [1440](captures/qv-correctif-r33-20261016/navigation-1440.png), [1024](captures/qv-correctif-r33-20261016/navigation-1024.png), [390](captures/qv-correctif-r33-20261016/navigation-390.png) | En attente production |
| Sélecteurs | Public/OI/Responsable/Spécialisation : focus immédiat visible, flèches/clavier/Escape, aucun focus vers la recherche fermée ; cinq contrôles mêmes hauteur/police/taille/graisse | Mesures dans [résultats Chrome](captures/qv-correctif-r33-20261016/browser-results.json) | Safari/profils réels et production à vérifier |
| Recherche et sélection | Type au-delà du quarantième, modèle Session60, résultats filtrés immédiatement ; multisélection conservée lors des recherches/pages, contexte de retour et curseur préservés | Parcours Chrome, aucune requête par caractère | En attente production |
| Conformité et tri | Vues exclusives ; synthèse type puis occurrences puis critères ; date/activité/OI/session/résultats triables, sens et pagination conservés | Parcours Chrome, [contrôle 1440](captures/qv-correctif-r33-20261016/controle-1440.png), [1024](captures/qv-correctif-r33-20261016/controle-1024.png), [390](captures/qv-correctif-r33-20261016/controle-390.png) | En attente production |
| Harmonisation | Accès fiche/direct, source exacte, propositions du même type, destinataires choisis un par un, champs disponibles, preview sur ces IDs seulement ; changement de source invalide ; incompatibles non sélectionnables | Parcours Chrome, [1440](captures/qv-correctif-r33-20261016/harmonisation-1440.png), [1024](captures/qv-correctif-r33-20261016/harmonisation-1024.png), [390](captures/qv-correctif-r33-20261016/harmonisation-390.png) | En attente production |
| Activités liées | Sept colonnes exactes, six tris aller/retour, dates réelles, conservation du tri après pagination, liens directs et défilement horizontal interne à 390 | Parcours Chrome, [mobile](captures/qv-correctif-r33-20261016/activites-liees-390.png) ; contrainte min-width de la carte corrigée pendant le contrôle | En attente production |
| Permissions/données | Boutons de gestion désactivés sans droit ; fixture complète et témoin publié inchangés, zéro sauvegarde simulée, zéro erreur JS/externe | 13/13 parcours Chrome PASS, [résultats](captures/qv-correctif-r33-20261016/browser-results.json) | Profil réel serveur/Okta non exercé |
| Documentation | Liens locaux, SHA provenance, neuf champs ToDo/quatorze champs roadmap, sources et réserves conservées, diff borné | Contrôle documentaire ciblé dans résultats | Revue PR en attente |

Les nouveaux scripts sont `scripts/scope-qv-correctif-r33-20261016-tests.js` (Node test) et `scripts/scope-qv-correctif-r33-20261016-browser.js` (Playwright/Chrome). Ils réutilisent le harnais et la mise en place synthétique existants. Aucun ajout de dépendance. Pour le navigateur, `SCOPE_CHROME_PATH` peut désigner Chrome et `SCOPE_R33_SCREENSHOT_DIR` une sortie autorisée ; Playwright est fourni par le runtime local. Le dossier ne contient aucune donnée de production, aucun NIP ni export nominatif.

## Fichiers modifiés et limites

Application : `assets/js/scope-ui.js`, `assets/js/scope-ui-logic.js`, `assets/css/scope.css`. Contrôles : `scripts/check-local.sh`, `scripts/scope-ds-1-tests.js` et les deux scripts ciblés ci-dessus. Capitalisation : ce rapport et ses preuves, contexte maître, canon, mêmes roadmap/ToDo/registres de décisions/anomalies, manifeste de provenance. Les empreintes sources phase A et les états historiques restent conservés ; aucune seconde liste de tâches.

Aucun changement de moteur nominatif, CTA/rotations/PR/FOBA/JSP, qualifications/candidatures, participation/statistiques, dates métier, validations/publications, codes/Stat.Com, IDs/lignées, versions/journaux ou données. Le témoin JSP010JSP.006 n’a pas été relu en production ni modifié ; sa protection est vérifiée sur une fixture sans donnée nominative. Les tests ne démontrent ni les faits réels absents ni la totalité de la chaîne annuelle. Safari, profils réels, veille et authentification de production ne sont pas recettés par analogie.

Aucun arbitrage métier nouveau indispensable à ces corrections déterministes. Les arbitrages déjà ouverts restent dans les vues existantes. **Revue PR → GO fusion distinct → GO déploiement distinct → vérification du SHA réellement publié → recette MOA sur [SCOPE Online production](https://scope-sdisnv.netlify.app) → PASS MOA explicite avant clôture.** Sans autorisation d’écriture en production, les vérifications restent consultatives. Une future publication technique ne valide pas le Programme annuel 2027.

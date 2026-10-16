# QUO VADIS — Accélération UX et exploitation, 16.10.2026

**DÉVELOPPÉ TECHNIQUEMENT — 16 tests ciblés et 22 parcours Chrome PASS. Recette MOA du lot en production NON EFFECTUÉE. Programme annuel 2027 NON VALIDÉ.** Deux contrôles historiques ont des attentes obsolètes documentées ci-dessous ; les tests ciblés ne les transforment pas en PASS.

Le mandat opérationnel humain du 16 octobre autorise un lot unique après la recette #32 : navigation raisonnée, séparation règle/alerte, vues conformité/harmonisation exclusives, blocages annuels compacts, résultats progressifs, liens et contexte, activités liées et composants de messages uniformisés. Le comparateur et les workflows métier restent ceux de #29–#32.

Branche : `codex/scope-qv-acceleration-ux-20261016`. Base main contrôlée directement : **`fe4cfb96ad59732cb0a1eea08fd4e9124b91cf51`**, #32 fusionnée le 16.10 à 10:50:26 UTC. Production publiée vérifiée au même SHA, site `scope-sdisnv` / `6def8d4d-78c6-4112-bb76-6891df0e0a52`, déploiement **`6ad20a3bbc6afdaa433daec6`**, ready, publié à **11:28:54.534 UTC / 13:28:54.534 Europe/Zurich**. Aucune PR ouverte au départ et à la revérification précédant la livraison. [Métadonnées et source du mandat](captures/qv-acceleration-ux-20261016/preflight.json).

## Sources et existant relu

Sources : [contexte maître](SCOPE_PROJECT_MASTER_CONTEXT.md), [protocole de reprise/livraison](project-context/SCOPE_REPRISE_ET_LIVRAISON.md), [index des règles](project-context/SCOPE_INDEX_REGLES.md), [canon](business-rules/quo-vadis-canonical-rules.md), mêmes [roadmap](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), [décisions](audits/20261015/SCOPE_REGISTRE_DECISIONS_MOA_20261015.md), [anomalies](audits/20261015/SCOPE_REGISTRE_ANOMALIES_20261015.md) et [plan de finalisation](audits/20261015/SCOPE_PLAN_FINALISATION_QV_20261015.md). Rapports et preuves pertinents : [#29](SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md), [#30 et concordance OS/IndeX](SCOPE_OS_INDEX_UNIFORMISATION_20261016.md), [#31](SCOPE_QV_CORRECTIF_MOA_20261016.md), [#32](SCOPE_QV_UX_ORGANISATION_20261016.md). Les OS 1.01/1.06 et décisions complémentaires restent acquis ; aucune instruction de mutation n’est déduite des documents institutionnels.

Pas de nouvel audit ni campagne acquise rejouée. Worktree attaché propre réutilisé, branche créée depuis main vérifié ; travaux étrangers du checkout partagé préservés. Contrôles GitHub/Netlify limités aux métadonnées, aucun GET métier ou accès SQL de production.

## CI/CD, construction et design system

| Composant vérifié avant modification | Fonction et application au lot |
|---|---|
| Workflows GitHub | Aucun fichier `.github` versionné ; API Actions : `total_count: 0`. Aucun workflow créé/modifié |
| `package.json` | `check` appelle `scripts/check-local.sh`, `scope:preflight` vérifie la cible Netlify ; commandes historiques de tests présentes, pas de campagne globale pertinente à lancer |
| `netlify.toml` | Build `node scripts/build-scope-static.js`, sortie `dist/scope`, fonctions et redirects existants ; configuration inchangée |
| `scripts/check-local.sh` | Syntaxe JS puis assertions historiques v67/Netlify et contrats ; exécuté une fois, syntaxe et version passent, arrêt à l’attente `/auth/login` absente de main |
| `scripts/assert-scope-netlify-target.js` | Garde `scope-sdisnv`, bloque ORION ; lecture du script, cible exacte confirmée par métadonnées publiées ; aucun déploiement ni modification de liaison locale |
| `scripts/build-scope-static.js` | Copie statique, empreintes assets et corpus PDF ; exécuté avec sortie temporaire isolée, PASS ; aucune sortie de build ajoutée à Git |
| `assets/css/scope.css` | SCOPE-UI-2 + UX-DS-1 ; Arial/Helvetica, tailles, espaces, bordures, hauteurs et tokens existants ; variables globales inchangées |
| Composants UI | Navigation QV, `scope-btn`, `scope-segmented`, champs/grilles/tableaux QV, `qvPilotPager`, notifications, banners et feedback existants réutilisés |

Palette : tokens existants `--scope-blue`, `--scope-navy-soft`, `--scope-warning`, `--scope-warning-soft`, `--scope-error`, `--scope-red-soft`, `--scope-card`, `--scope-border`, `--scope-text`. Les variables locales des encadrés QV pointent vers ces tokens ; aucune nouvelle charte ni famille de police. Les styles des notifications/banners/feedback sont communs ; seuls le ton explicite existant des confirmations et les styles de surface sont exposés, sans changement des actions, délais, rôles ou permissions. Les écrans à messages spécialisés restent une dépendance dans T-04, sans refonte globale.

Le test historique `scope-ds-1-tests.js` passe ses **8 contrôles de primitives**, puis échoue au cas 09 : la liste de suffixes CSS admis ne contient pas `scope-qv-p0-consolidated-20261009`, déjà présent dans `scope.html` de main. De même, le premier contrôle Netlify de `check-local.sh` attend `/auth/login`, absent de `netlify.toml` de main. Ces quatre fichiers sont identiques à la base : les échecs sont attribuables à ces attentes antérieures, sans rejouer les suites sur une autre branche. Ils ne sont ni masqués ni corrigés par une modification CI/CD non autorisée. [Résultats et réserves structurés](captures/qv-acceleration-ux-20261016/targeted-results.json).

## Inventaire de navigation et capacités

Toutes les entrées ci-dessous existent à #32 et restent implémentées. Elles conservent le chargeur QV, les filtres, les routes hash et le RBAC existants ; leur déplacement ne change aucun droit serveur. Les actions de gestion/contrôle restent soumises à `references:manage`, les actions de publication à leurs droits existants.

| Entrée | Fonction réelle / cible existante | Utilité, dépendances et choix du lot | Permissions existantes / état |
|---|---|---|---|
| Agenda annuel | `#/quo-vadis/agenda-annuel` | Vue calendrier, année/calendrier/occurrences ; groupe Programme | Lecture authentifiée ; actions selon droits existants ; implémenté |
| Programme annuel | `#/quo-vadis/programme` | Tableau/mensuel, filtres et fiches ; distinct du calendrier, Programme | Lecture authentifiée ; fiches gérées sous references:manage ; implémenté |
| Synthèse 2027 | `#/quo-vadis/synthese` | KPI et accès aux périmètres existants, pas un nouveau suivi ; Programme | Lecture authentifiée ; changement du statut sous references:manage ; implémenté |
| Catalogue | `#/quo-vadis/catalogue-annuel` | Préparation des besoins et configuration permanente des activités ; Préparation | Lecture authentifiée ; gestion sous references:manage ; implémenté |
| Dates annoncées | `#/quo-vadis/dates-connues` | Dates déjà connues et rattachements existants ; Préparation | Lecture authentifiée ; écritures sous le gate existant canWriteRecords ; implémenté |
| Contrôle du programme | `#/quo-vadis/controle-programme` | Même comparateur et contrôles annuels ; conformité/harmonisation exclusives ; Préparation | Lecture authentifiée ; lancement des contrôles sous references:manage ; implémenté |
| À arbitrer | `#/quo-vadis/a-arbitrer` | Groupes d’arbitrage existants, états et priorités inchangés ; Préparation | Lecture authentifiée ; actions d’arbitrage sous leurs gates existants ; implémenté |
| Alertes | `#/quo-vadis/alertes` | Points d’attention existants, liens explicites vers la fiche si identité disponible ; Préparation | Lecture authentifiée ; création/actions sous leurs gates existants ; implémenté |
| Cursus | `#/quo-vadis/cursus` | Parcours/modules et règles associées ; Paramétrage | Lecture authentifiée ; gestion sous references:manage ; implémenté |
| Règles | `#/quo-vadis/regles` | Règles générales, gates et workflow de validation annuelle ; Paramétrage | Lecture authentifiée ; gestion/validation annuelle sous references:manage ; implémenté |

Aucun doublon supprimé par analogie : agenda et tableau offrent des consultations différentes ; synthèse, arbitrage, alertes et contrôle ont des fonctions distinctes. Les liens existants de Synthèse/À arbitrer restent leurs chemins acquis ; seul le raccord des alertes identifiables est précisé. Aucun nouveau tableau de suivi ou changement de priorité.

**Événements envisagé :** la fiche du catalogue porte déjà sa configuration permanente (versions, publics, sessions, contraintes, rôles, qualifications), les cursus portent les parcours et les règles la planification. La route existante `#/reglages/formations` possède une configuration de formation sous `references:manage`, hors QV. Aucun écran unique de paramètres couvrant toutes les familles citées n’est établi par simple inspection. Aucun nouveau menu « Événements » ni modèle créé : le choix d’un éventuel regroupement et sa portée restent une décision de présentation documentée dans la même roadmap/T-04, sans bloquer les corrections déterministes.

## Adaptations et règles préservées

- Fiche : « Règle du programme » informative toujours bleue, alerte de contrôle séparée au ton réel ; aucun bleu réputant la fiche entièrement validée. Même sélection et visualiseur détaillé. Bouton secondaire « Voir la règle complète » / « Masquer la règle », clavier et `aria-expanded` conservés, flèche décorative retirée.
- Actions supérieures : « Harmonisation » secondaire réutilise la route/modèle enregistré de #32 ; lien isolé sous le formulaire retiré. Actions enregistrer/valider/planifier/retrait/révision/événement lié et payloads inchangés.
- Contrôle : deux vues exclusives sur la même route ; menu en conformité, action fiche en harmonisation. Choix/résultats/filtres conservés lors des changements de vue et retour fiche. Recherche par les mêmes helpers, choix types/modèles bornés à 40 plus les sélections explicites ; affiner la recherche retrouve les autres entrées.
- Annuel : adaptateur de présentation des seuls contrôles fournis par les moteurs existants. Comptes de points bloquants/non bloquants et occurrences distinctes **identifiées**, détails à la demande paginés par 25 ; pas de résultat global réparti sur des occurrences. Timestamp absent non inventé. Les liens utilisent les IDs du contrôle (préparation, rapprochement, réservation) et les IDs de modules fournis ; doublon de module affiche toutes les références explicites, aucun favori déduit. Un texte sans rattachement structuré reste sans lien.
- Résultats : même synthèse par type ; niveau occurrence paginé par 25 ; critères construits à l’ouverture de l’occurrence. Filtres activité/période/OI/session/état appliqués aux résultats disponibles ; comptes recalculés et désignés « résultats filtrés ». Critères et occurrences distincts ; jamais une conformité globale inférée. Sélections et filtres peuvent rester actifs lors d’un nouveau contrôle : leur portée reste visible et réinitialisable.
- Navigation : routes existantes avec année et provenance, lien « Consulter la fiche », retour au contrôle conservant vue, types, recherches, filtres de résultats, occurrence/session et ouvertures. Le contexte reste en mémoire de la session ; aucun nouveau stockage de données métier.
- Activités liées : même `definitionId` et relations `courseId` / `exerciseId(s)` / `groupId` déjà calculées. Tri date puis libellé, pagination existante, état/actions. Aucune relation créée depuis le titre/date, aucun cours ambigu choisi ; références réconciliées inactives non réexposées. « Aucune activité liée identifiée. » ne supprime pas une alerte de préparation manquante.
- Typographie : titres/en-têtes/libellés structurants gras ; valeurs, sélections, contenus et messages ordinaires normaux. Périmètre QV et composants de messages partagés, aucune nouvelle police ou modification globale de tokens.

Le comparateur `qvProgrammeCorrectionProposals`, les profils/règles et les comptes de #32 sont comparés directement à main sur les mêmes entrées : mêmes résultats. Les nouveaux helpers sont des adaptateurs de présentation/filtrage de résultats et d’identités existantes, sans calcul d’éligibilité, de nouvelles relations métier ou de blocage annuel. Aucune mutation, migration, qualification individuelle, affectation, présence, événement, moteur nominatif, RLS ou Okta.

## Matrice de vérification ciblée

Fixtures synthétiques et API simulée uniquement sur macOS, Chrome headless installé. Tous les accès navigateur sont interceptés ; aucun réseau externe, appel métier vivant ou stockage persistant. L’unique sauvegarde est interceptée avec réponse `updated:false` pour vérifier le payload intact ; notification attendue fermée avant captures, aucun rollback réel nécessaire.

| Exigence / dépendance | Scénario et résultat | Preuve | MOA production |
|---|---|---|---|
| Navigation / vues | Dix cibles préservées, défaut conformité du menu, deux vues exclusives et choix conservés | PASS tests/Chrome | En attente |
| Règle / alerte / actions | Bleu informatif, jaune/rouge réel séparé ; visualiseur unique, clavier/libellés, action en haut | PASS ; [fiche](captures/qv-acceleration-ux-20261016/fiche-1440.png) | En attente |
| Annuel | 6 points bloquants + 1 point à contrôler, 5 occurrences identifiées, 2 points globaux sur fixture ; détails absents avant demande, IDs exacts et liens | PASS ; [vue compacte](captures/qv-acceleration-ux-20261016/controle-1440.png) | En attente |
| Trois niveaux | 4 occurrences / 24 critères ; aucun critère avant ouverture volontaire d’une occurrence, puis 6 critères de celle-ci | PASS ; [occurrences et critères](captures/qv-acceleration-ux-20261016/occurrences-1440.png) | En attente |
| Filtres / comptes | Période avril + C1 + session 4 + règles non définies = 1 occurrence / 4 critères ; vue/résultats conservés au retour | PASS Chrome | En attente |
| Pagination | 60 occurrences affichées 25/25/10, 59 activités liées affichées 25/25/9 ; aucun tableau massif initial | PASS tests/Chrome | En attente |
| Harmonisation | Modèle JSP explicite, ouverture sans action, reprise JSP→TP9 incompatible, source modifiée invalidant résultats | PASS ; [harmonisation exclusive](captures/qv-acceleration-ux-20261016/harmonisation-1440.png) | En attente |
| Relations / visibilité | Définition commune et relation préparatoire explicite seulement, cours ambigu sans lien inventé ; doublons réconciliés omis | PASS tests/Chrome | En attente |
| Année / contexte | Type/recherche/filtres/ouvertures retrouvés au retour, année 2028 conservée par les routes existantes | PASS navigation sur fixtures | En attente |
| Messages partagés | Notifications info/succès bleues, avertissement jaune, erreur rouge ; confirmation au ton explicite, annulation sans action ; rôles/clôture conservés | PASS Chrome, couleurs/poids calculés dans JSON | En attente |
| Typographie / responsive | Valeurs du résumé, champs et conditions en poids 400 ; 1440/1024/390 sans chevauchement mesuré, liens/panneau et deux choix de vue contenus | PASS ; [390](captures/qv-acceleration-ux-20261016/controle-390.png) | En attente |
| Intégrité / permissions | Payload inchangé hors champs touchés, mêmes profils/comparateur ; fixture du témoin JSP intacte ; gestion désactivée sans droit | PASS tests/Chrome | Aucune revalidation du témoin |

**16/16 tests ciblés et 22/22 parcours Chrome PASS.** Les parcours regroupent plusieurs assertions et ne sont pas des recettes MOA. Pas de campagne PR20–32 relancée. Syntaxe des quatre JS concernés, build statique isolé, diff, liens ajoutés, provenance et structure des vues documentaires vérifiés ; résultats détaillés dans la [preuve structurée](captures/qv-acceleration-ux-20261016/targeted-results.json).

```sh
node --test scripts/scope-qv-acceleration-20261016-tests.js
node scripts/scope-qv-acceleration-20261016-browser.js
```

Le navigateur requiert Playwright du runtime existant et Chrome ; `SCOPE_CHROME_PATH` permet le chemin du binaire, `SCOPE_ACCEL_SCREENSHOT_DIR` un dossier de captures optionnel existant, `NODE_PATH` le module du runtime si nécessaire. La comparaison unitaire requiert l’objet Git de la base indiquée. Le build de preuve appelle `buildScopeStatic({out: ...})` vers un dossier temporaire dédié ; aucun déploiement exécuté.

## Limites, risques et capitalisation

Le mandat fourni se termine à la section 18 (« Ne pas modifier les validations »). Les protections et le circuit de livraison déjà acquis restent appliqués ; aucun GO de fusion/déploiement ne se déduit du GO développement.

Le témoin **Séance Direction JSP 010JSP.006, 18.02.2027, 18:30–20:30**, famille JSP, OI JSP G1/C1/B1, Chef JSP responsable, publics Chef formation/Chef site/Resp formation, évaluation Non, reste protégé selon la MOA. Aucune lecture ou modification de sa donnée vivante, aucune revalidation ; fixture non nominative et IDs synthétiques uniquement. Codes/Stat.Com, IDs/lignées, validations, versions, événements liés et historiques acquis restent inchangés. Pas de NIP ou export nominatif dans Git.

Les preuves couvrent Chrome/macOS sur fixtures. **Safari, session Okta/profils réels, persistance effective et Programme vivant restent non vérifiés par ces tests** et relèvent de la recette ciblée autorisée. Le test d’année 2028 porte sur les routes/contexte, pas sur le contenu métier réel 2028. Aucun benchmark du Programme complet ; pagination et construction différée sont vérifiées sur 60 occurrences. La synthèse n’est pas un rapport annuel exhaustif ; comptes limités aux contrôles effectivement fournis. Un contrôle sans ID structuré reste global, même si un humain peut reconnaître son libellé. Les règles nominatives et faits individuels datés gardent leurs dépendances antérieures.

Risque principal : déplacement des accès et composant commun de messages affectant d’autres usages. Les familles de tons, rôles et actions communes sont testées ; chaque écran spécialisé n’a pas été recetté. Les deux attentes historiques CI sont conservées en réserve, sans affaiblir les protections. Le besoin « Événements » n’exige pas d’arbitrage indispensable au correctif UX ; son regroupement supplémentaire reste documenté dans la roadmap existante.

Fichiers applicatifs : `assets/js/scope-ui.js`, `assets/js/scope-ui-logic.js`, `assets/css/scope.css`. Deux scripts ciblés ajoutés. Canon, contexte, mêmes registres, roadmap/T-04, ToDo, plan de finalisation et provenance mis à jour ; sources et sections historiques conservées. Ce rapport et ses captures sont des preuves de livraison, pas un second backlog.

Livraison unique avec `[skip netlify]`, sans fusion ni déploiement automatique. **GO MOA fusion distinct → GO déploiement distinct → SHA réellement publié vérifié → recette MOA sur [SCOPE Online](https://scope-sdisnv.netlify.app) → PASS explicite avant clôture. Programme annuel 2027 NON VALIDÉ.**

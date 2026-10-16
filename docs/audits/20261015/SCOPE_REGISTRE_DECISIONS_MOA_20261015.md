# SCOPE — Registre des décisions MOA

## Mandat opérationnel unique — accélération UX et exploitation, 16.10.2026 après #32

GO développement humain explicite, un lot/une branche/une PR depuis main vérifié `fe4cfb96ad59732cb0a1eea08fd4e9124b91cf51`. Les constats de recette #32 autorisent les corrections déterministes du mandat ; ils ne valent pas PASS MOA général ou clôture des anomalies antérieures. [Rapport et preuves ciblées](../../SCOPE_QV_ACCELERATION_UX_20261016.md). Sources OS 1.01/1.06 et décisions #29–#32 conservées.

| Décision MOA | Application / limite |
|---|---|
| Navigation | Programme : Agenda, Programme annuel, Synthèse ; Préparation : Catalogue, Dates annoncées, Contrôle, À arbitrer, Alertes ; Paramétrage : Cursus, Règles ; mêmes routes/capacités/permissions |
| Événements envisagé | Catalogue annuel : configuration permanente, versions, publics, sessions, contraintes/rôles/qualifications ; Cursus et Règles : parcours et planification ; Configuration formation existe hors QV. Aucun nouveau modèle ou menu concurrent inventé ; regroupement supplémentaire dépend d’une décision de présentation/périmètre |
| Typographie | Titres/en-têtes/libellés structurants en gras ; contenus, valeurs, sélections et messages ordinaires normaux ; police/tailles existantes ; application QV et composants de messages partagés, pas refonte des autres écrans |
| Règle / alerte | Encadré informatif bleu indépendant du contrôle, alerte distincte au ton réel ; bleu ne certifie pas une fiche entière ; visualiseur unique conservé |
| Consultation règle | « Voir la règle complète » fermé, « Masquer la règle » ouvert ; état accessible clavier, aucune flèche décorative ; bouton secondaire existant |
| Harmonisation | Bouton secondaire dans les actions supérieures ; même route, modèle enregistré présélectionné ; aucun transfert automatique, workflow et permissions conservés |
| Contrôle du programme | Conformité et harmonisation exclusives ; défaut menu = conformité ; changement de vue conservant choix/résultats/filtres |
| Blocages annuels | Synthèse compacte des points réellement fournis et occurrences identifiées ; détails à la demande, globals non répartis ; date du contrôle uniquement si fournie ; liens uniquement sur identités établies |
| Résultats | Type → occurrences paginées → critères déployés volontairement ; filtres activité/période/OI/session/état sur données disponibles ; critères et occurrences distincts, jamais conformité globale déduite |
| Activités liées | Identité de type commune ou relation préparatoire existante ; liste paginée, pas de rapprochement par intitulé/date ; ambiguïtés sans faux cours lié ; préparations manquantes toujours signalées |
| Contexte | Année, filtres, type, occurrence/session, vue et déploiements conservés lors de consultation/retour ; pas de nouvel état métier |
| Messages partagés | Info/positif bleu, partiel/avertissement jaune, erreur/non-conformité/blocage rouge selon signification ; titres/texte explicites, rôles/actions/délais conservés ; styles avec tokens existants |
| Protections et livraison | Témoin JSP 010JSP.006, IDs/lignées/codes/Stat.Com, validations, historiques et données préservés ; aucun moteur nominatif ou mutation de production ; [skip netlify], GO fusion et déploiement distincts puis SHA publié, recette MOA production et PASS explicite |

Les écrans nécessitant une refonte spécifique de messages gardent leur dépendance dans les mêmes vues actives ; aucune refonte globale engagée. Les attentes obsolètes de deux scripts historiques sont documentées, pas corrigées par un changement CI/CD non autorisé. **Programme annuel 2027 NON VALIDÉ.**

## Lot unique UX et organisationnel — décisions MOA du 16.10.2026

Mandat humain postérieur à #31, base main et production vérifiées `0cb698e3c8dd7cf5d1bccf1ca4d091060d86dbe5`. [Rapport, matrice et preuves](../../SCOPE_QV_UX_ORGANISATION_20261016.md). Les règles institutionnelles OS1.01/1.06 et les décisions #29–#31 restent acquises. Cette décision remplace la disposition locale « A. Préparation / B. Conformité / C. Harmonisation » de #31, sans supprimer ses données ni ses capacités applicatives.

| Décision MOA | Application du lot |
|---|---|
| Fiche simple | Retrait du formulaire local d’assignation et des outils transversaux ; paramètres stockés, API et historiques préservés |
| Règle appliquée | Encadré et visualiseur existants uniques ; conditions documentées des profils existants, capacités, sessions, rôles, exceptions et évaluation ; aucun doublon des valeurs de date/horaire/lieu/OI/public/responsable |
| Trois états QV | Bleu : informations complètes pour les contrôles effectués ; jaune : partiel ou à arbitrer sans blocage démontré ; rouge : non-conformité ou blocage démontré ; texte explicite ; règle nominative absente sans faux blocage annuel |
| Contrôle du programme | Un accès transversal ; conformité par règles et harmonisation volontaire séparées, même moteur #31 ; recherche/famille/OI pour choisir les types ; toutes leurs occurrences et sessions actives ensuite contrôlées |
| Synthèse | Occurrences distinctes et critères comptés séparément par type ; détails ouverts volontairement ; ne jamais déduire une conformité globale d’un seul critère conforme |
| Modèle explicite | Fiche enregistrée (identité de préparation ou événement lié), types et champs choisis ; lien contextuel avec activité/date/OI ; changement de modèle/périmètre invalide les résultats ; aucun enregistrement groupé |
| Fonctions de remplacement | Même groupe et rang que la fonction remplacée reconnue ; Rempl. chef site dans Commandement et responsables ; grades, codes, alias, candidats et historiques inchangés |
| Références retirées | Chef formation JSP et Chef matériel JSP restent hors nouveaux choix, historique conservé |
| Témoin protégé | Séance Direction JSP 010JSP.006 du18.02.2027,18:30–20:30 : validation individuelle/publication/liaison conservées ; aucune modification ni revalidation |
| Livraison | Une PR avec [skip netlify], sans fusion ni déploiement ; GO distincts, SHA réellement publié puis recette MOA en production et PASS explicite |

Aucune nouvelle décision métier indispensable ne bloque ce lot UX. Les faits individuels datés et règles encore absentes restent leurs dépendances antérieures ; aucun moteur nominatif, qualification, affectation ou présence modifié. **Programme annuel 2027 NON VALIDÉ ; recette MOA de ce lot NON EFFECTUÉE.**


## Correctif post-recette MOA #29 / #30 — 16.10.2026

Mandat humain postérieur au lot OS/IndeX, appliqué sans nouvel arbitrage implicite. [Rapport et preuves](../../SCOPE_QV_CORRECTIF_MOA_20261016.md) ; canon, section « Correctif post-recette MOA PR #29 / #30 ». Les OS 1.01/1.06 restent les sources institutionnelles ; les décisions humaines plus récentes ci-dessous rectifient la lecture des captures de #30.

| Décision confirmée | Portée |
|---|---|
| Chef formation JSP n’existe pas | Retrait des nouveaux choix ; historique brut conservé ; aucune équivalence ou remplacement par Resp formation |
| Resp formation / Chef site | Commandement et responsables ; contextes JSP G1/C1/B1 et DPS/JSP acquis ; cumul/dates ; recherche JSP via contexte et alias |
| JSP → TP9, cas MOA | Les différences observées ne démontrent aucune non-conformité. La fiche ouverte ne sert jamais implicitement de référence métier |
| Conformité / harmonisation | Règles applicables vérifiables et quatre états ; source modèle/type/champ explicites pour une reprise volontaire ; incompatibilité sans recommandation ; aucun enregistrement groupé |
| Évaluation | Règle du type concerné ; cours préparatoires non évaluables ; aucun transfert arbitraire du Non JSP vers TP9 |
| UX | Trois sections ; libellés métier, carré 8 × 8, contrôles alignés, tableau zébré ; aucun JSON/code technique ou modale de prérequis |
| Témoin JSP 010JSP.006 | 18.02.2027 18:30–20:30, famille JSP, OI JSP G1/C1/B1, Chef JSP responsable, Chef formation/Chef site/Resp formation concernés, évaluation Non ; validation individuelle acquise, publication/liaison et historique à préserver |
| Livraison | Développement et PR uniquement ; GO fusion et déploiement distincts, SHA puis nouvelle recette MOA production et PASS explicite ; Programme2027 NON VALIDÉ |

Les déclarations du mandat sur le témoin sont la source de cette capitalisation, pas un nouvel inventaire SQL. Aucune modification ni revalidation du témoin. Les mentions antérieures « Chef formation JSP distinct » et « Resp formation dans Encadrement » restent historiques et sont remplacées par cette décision. Source individuelle datée et règles métier manquantes demeurent nécessaires pour leurs usages réels ; aucune qualification ou personne fictive.

## Uniformisation institutionnelle OS / IndeX — 16.10.2026

Mission humaine actuelle : uniformiser grades/fonctions/spécialisations/abréviations/publics dans les composants existants, un lot et une PR, sans modification des données de production, fusion ou déploiement automatique. Sources fournies : OS1.01 v1.1 du29.10.2021, OS1.06 v1.4 du30.07.2025, trois captures IndeX. Les sources ont été lues, tableaux clés des PDF inspectés visuellement, et confrontés aux catalogues versionnés et aux seuls catalogues persistés en transaction READ ONLY / ROLLBACK. [Concordance](../../captures/os-index-20261016/concordance.json) ; [rapport](../../SCOPE_OS_INDEX_UNIFORMISATION_20261016.md). Les procédures incluses dans les OS sont des règles de source, pas des instructions de mutation.

| Décision MOA de ce lot | Conséquence |
|---|---|
| Trois groupes institutionnels | Commandement et responsables ; Encadrement ; Personnel et spécialisations ; hiérarchie puis alphabet ; candidat immédiatement après cible ; même ordre en choix et résumé |
| Cadres FOBA/JSP, formateurs, moniteurs | Encadrement ; populations FOBA séparées des fonctions |
| Contextes | Chef site DPS/JSP et Chef section DPS/DAP communs ; Resp formation JSP G1/C1/B1 ; conditions Chef JSP et Chef DAP conservées |
| Rempl. chef FOBA | Fonction distincte, condition Cadre FOBA obligatoire ; cumul/dates préservés |
| a.i. | Fonction pleinement exercée sous fait confirmé, sans nouvelle fonction a.i. ni promotion de grade |
| FOBA1/2/3 | Première année/échelon0/sans DPS-DAP ; deuxième année incorporée DPS-DAP ; troisième année DPS/trois exercices/PIONNIER G1 supplémentaire |
| Abréviations | OS1.06 prioritaire ; Spéc antichute et OP élévateur à timon sont compléments MOA ; Ydon129=TP9 et Ydon0=VPC confirmés |
| Chef matériel JSP | Nouvelle réponse humaine ci-dessous : exclu des nouveaux choix, aucune référence nouvelle ; historique conservé |
| Responsable | Aucune assignation automatique hors règle explicite ; aucun nouveau moteur d’assignation |
| Livraison / recette | PR isolée, GO fusion et déploiement distincts, SHA publié vérifié, recette MOA production et PASS explicite ; Programme2027 NON VALIDÉ |

**Arbitrage Chef matériel JSP reçu dans l’échange, texte exact :**
> Cette fonction va être supprimée, inutile de la référencer

Cette réponse clôt le besoin de nouvelle référence Chef matériel JSP. Elle n’autorise aucune suppression de données de production ni des anciennes sélections `Resp mat JSP`. Aucune équivalence personnelle ou migration entre les deux libellés n’est inventée.

La règle actuelle FOBA3/PIONNIER remplace l’ancienne règle FOBA2 pour les nouvelles propositions ; les sources/décisions enregistrées ne sont pas réécrites. Chef formation JSP et Resp formation JSP restent distincts selon la capture, faute d’équivalence décidée. JSP Y3 de la capture n’est pas transformé en JSP C1 : le mandat explicite conserve JSP G1/C1/B1.

Les sources institutionnelles fournissent des références et règles, pas des rattachements de personnes. Source réelle et confirmation des faits individuels datés, années de formation/échelons/candidatures toujours nécessaires pour les extractions et assignations réelles ; aucune donnée fictive. Les acquis PR20–29 ne sont pas rejoués et leurs PASS gardent leur portée. L’uniformisation technique reste **DÉVELOPPÉE NON VALIDÉE MOA EN PRODUCTION**.

## Lot prioritaire fiches et assignations — 16.10.2026

**Décision humaine actuelle, applicable avant les états historiques ci-dessous.** La mission « LOT PRIORITAIRE QUO VADIS 2027 — FIABILISATION DES FICHES ET PRÉPARATION DES ASSIGNATIONS » autorise le développement déterministe d’un seul lot sur branche isolée, tests ciblés et PR. Elle interdit fusion automatique, déploiement, modification/migration de production, RLS/Okta et publication annuelle. Elle ne rouvre pas les recettes PR20–27 et impose de préserver les travaux étrangers. Les règles détaillées sont capitalisées dans le [canon](../../business-rules/quo-vadis-canonical-rules.md#complément-moa--lot-prioritaire-fiches-et-préparation-des-assignations-16102026), les preuves dans le [rapport ciblé](../../SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md). Aucun nouveau backlog n’est créé.

| Sujet décidé par la MOA | Portée applicable |
|---|---|
| Fonctions | Chef site commun DPS/JSP, Chef section commun DPS/DAP ; Chef JSP relève du Chef formation et exerce Chef site JSP ; Chef DAP exerce Chef section DAP ; contexte OI/site/dates ; autres fonctions conservées |
| Public / Responsable | OI de la fiche seul périmètre d’organisation ; Responsable sans assignation implicite ; participation possible sous règle propre explicite |
| Candidatures | Assimilées pour assignations applicables, exceptions explicites ; CAR VL + candidats, TRUCK PL + candidats ; aucune attribution automatique de qualification |
| TP9 | Réponse reproduite ci-dessous ; 1.x conducteurs uniquement, deux/session ; dès 2.x considérer des conducteurs après validation effective |
| Évaluation | Paramètre existant, types et toutes occurrences/sessions sélectionnables ; cours préparatoires non évaluables ; non-évaluable consultable/assignable ; présences conservées |
| Assignations | Préparation sur moteurs existants ; contraintes individuelles, sessions et arbitrages ; DPS G1 8/demi-section,16/section ; groupes DPS6/DAP2 ; règles PR du canon et précision effectif ci-dessous |
| Corrections | Propositions avec ID/avant/après/règle/impact/validation ; aucune modification silencieuse validée/publiée |
| Recette et clôture | MOA uniquement sur production réellement publiée ; GO fusion, GO déploiement distincts ; vérification SHA ; PASS MOA explicite ; Programme2027 NON VALIDÉ |

**Réponse humaine TP9, reçue dans cet échange (orthographe conservée) :**
> Cela concerne la série de contuite TP9 1.x depuis la 2 nous partons du principe que les condidats auront été validés et qu'ils seront considérés comme des cond tP9

Conséquence déterministe : les séries canoniques TP9000 1.0/1.1/1.2 et 2.0/2.1/2.2 sont reconnues, sans changement de titre, d’ID ou de qualification individuelle. À partir de 2.x on attend une qualification de conducteur valide ; une candidature seule ne la remplace pas.

**Réponse humaine effectif PR, reçue dans cet échange (orthographe conservée) :**
> Le préposé APR fait obligatoirement partie de l'effectif. Le surveillant ne fait pas partie de l'effectif.

Le Préposé APR est donc l’un des 12 PAPR et fait partie du public concerné ; le surveillant est hors plafond. Ce point est arbitré. Le régime statistique historique du surveillant n’est pas redéfini par cette réponse.

**Arbitrage encore demandé, isolé :** source autorisée des faits individuels datés fonction–domaine–OI/site/section et des candidatures (saisie SCOPE, import IndeX ou autre), mode de confirmation et liaison aux personnes existantes. La question a été adressée à la MOA ; aucune réponse n’est présumée. Le catalogue/contrat et les corrections déterministes avancent sans inventer de données individuelles. T-07/T-08 restent partiels.

Le développement et les tests techniques de ce lot ne constituent ni GO fusion, ni GO déploiement, ni PASS MOA. Les acquis et réserves d’audit ci-dessous restent datés et inchangés.

> Capitalisation phase B : import de la phase A actualisée à #27. Les déclarations « hors dépôt », « pas de phase B » et les prochains GO dans le texte importé décrivent son mandat historique. La mission de phase B autorise maintenant sa capitalisation documentaire en une PR, sans fusion ni déploiement. Les réserves AUDIT_INCOMPLET et Programme 2027 NON VALIDÉ restent applicables. Voir [provenance](README.md).


## Actualisation consolidée du 15.10.2026 — référence applicable

**Phase A, lecture seule. Verdict : AUDIT_INCOMPLET**, avec réserves explicites ci-dessous. **Programme annuel 2027 NON VALIDÉ.** Cette actualisation reprend les huit mêmes livrables ; elle ne recommence pas l'audit initial.

GitHub `Sdisnv/monitoringF7`, `main` : **`3bdad82029ef79ea721bcf4043a5bb47e4d86764`**. PR #20 à #27 fusionnées ; contrôle direct GitHub et Netlify effectué pendant cette actualisation. Production `scope-sdisnv` : déploiement **`6ad0d08255cda461366136f2`**, **ready**, même SHA, publication **15.10.2026 à 15:09:59.769 Europe/Zurich** (13:09:59.769 UTC). Une publication technique ne vaut pas validation du Programme annuel.

Aucune écriture dans le dépôt partagé, GitHub, les données, les configurations, les permissions/RLS, Okta ou Netlify. Aucun test acquis relancé, aucune branche/PR/migration, fusion ou publication réalisée par cet audit. Les écritures se limitent aux livrables et preuves d'audit dans `dossier local historique de l’audit (non versionné)` et à leur copie de remise hors dépôt dans le dossier d’artefacts Codex. Pas de phase B engagée.

Les sections d'actualisation précèdent l'**archive initiale** conservée en fin de fichier pour assurer la continuité. Pour les changements #23–#27, les décisions actuelles ci-dessus et les rectifications ci-dessous remplacent les états initiaux correspondants. Les références à `74ac904…`, aux anciens déploiements et aux comptes SQL initiaux dans l'archive restent datées ; elles ne décrivent pas la production courante. Les points non remplacés restent au backlog avec les limites initiales, sans nouvelle preuve d'ouverture ou de clôture.

Navigation : [SCOPE_AUDIT_INTEGRAL_20261015.md](SCOPE_AUDIT_INTEGRAL_20261015.md) · [SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md](SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md) · [SCOPE_ROADMAP_CONSOLIDEE_20261015.md](SCOPE_ROADMAP_CONSOLIDEE_20261015.md) · [SCOPE_TODO_CONSOLIDEE_20261015.md](SCOPE_TODO_CONSOLIDEE_20261015.md) · [SCOPE_REGISTRE_ANOMALIES_20261015.md](SCOPE_REGISTRE_ANOMALIES_20261015.md) · [SCOPE_MATRICE_TRACABILITE_20261015.md](SCOPE_MATRICE_TRACABILITE_20261015.md) · [SCOPE_PLAN_FINALISATION_QV_20261015.md](SCOPE_PLAN_FINALISATION_QV_20261015.md) · [SCOPE_REGISTRE_DECISIONS_MOA_20261015.md](SCOPE_REGISTRE_DECISIONS_MOA_20261015.md). Diagnostic distinct demandé : [SCOPE_DIAGNOSTIC_NETLIFY_20261015.md](SCOPE_DIAGNOSTIC_NETLIFY_20261015.md).

## Décisions actuellement acquises et décisions encore nécessaires

| Sujet | Acquis / ne pas redécider | Décision ou preuve restant nécessaire |
|---|---|---|
| #23/#26/#27 | PASS MOA selon portée ; Y1 96/G1 384/SDIS46 et absence duplication observée #27 | Aucune nouvelle autorisation de correction identique ; occurrence résiduelle exigée pour réouverture |
| #24/#25 | PASS partiels, harmonisations livrées | Acceptation des seuls reliquats non démontrés ; pas de validation globale implicite |
| Dates JSP/EM | JSP17.02 et23.06 18:30–20:30 ; EM16.02 maintenu | Application des révisions sur état/version courant et impacts ; pas nouvelle décision sur ces dates |
| Groupes DAP/DPS | Relation démontrée #26 ; DAP23.03→21/28.04 décidé ; projection DPS15.03→12.05 première séance | Autres champs seulement si incomplets ; projection DPS ne constitue pas décision humaine |
| M1–M7/P1–P6 | Tableau intégral et décisions historiques conservés | P1/P3/P4/P5 et actions manuelles non clôturées par preuve ; ressources/capacités à constater sans déplacement automatique |
| Date cadresDAP4Y2 / clôtureCodir | Cadre des règles existant | Date exacte restante ; décision Codir sur10.02.2028 provisoire ; aucune date inventée |
| Contrôlequalité et alternatives | Besoins mission§6–7 ; socles existants | Sévérités/rapport, données de contrainte, critères de blocage ; arbitrage final humain |
| PERSONNE–FONCTION–DOMAINE–OI | Chef section commun, affectations datées existantes | Source de fonction/date/portée, règles de saisie/liaison ; pas de NIP fictif |
| ConsultationEM | Même app, Okta/RBAC existants, droits saisie à préserver | Matrice et fonctions visibles/exportables ; protections serveur à démontrer |
| PDF | Ancien QV-PDF-003 préservé ; complément demandé | Témoin NON OBTENU ; constater largeur/ASCII avant correctif ; modèles conformes protégés |
| SCOPE-PROD / INCIDENT | Continuité impérative et circuit demandé | Responsables/SLA et procédure de retour arrière à définir selon outils existants |
| Annualité/chaîne | Programme2027 NON VALIDÉ ; publication technique Netlify distincte | Décision annuelle puis GO publication distinct ; destinataires/canal/communication et modifications à accepter |
| QV-RULES / autresmodules | Maquette acquise ; ProgJour suspendu ; GELORE2 fournisseur | Séquençage QV-RULES, contrats ECA/IndeX/ECAwin et observations selon backlog |
| Capitalisation | PhaseA actualisée hors dépôt | GO phaseB distinct ; aucun GO demandé ni présumé par restitution |

## Registre des nouveautés et acquis protégés

| PR fusionnée, incluse dans le main publié | Périmètre | SHA de fusion | Acceptation et portée | Source épinglée |
|---|---|---|---|---|
| [#20](https://github.com/Sdisnv/monitoringF7/pull/20) | Familles, cinq filtres, classification DAP | fba5bda6e98956458530cf1f947640e9341a57c5 | Acquis techniques documentés ; validation globale non extrapolée | [docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_FAMILLES_FILTRES_MOA_20261015.md) |
| [#21](https://github.com/Sdisnv/monitoringF7/pull/21) | Permanent, référentiels et OI | e7672369e08727849e96ef56d4462840d9dfca0e | Permanent et corrections déterministes acquis ; décision humaine conservée | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) |
| [#22](https://github.com/Sdisnv/monitoringF7/pull/22) | Conduites DAP, reconnexion/brouillons, publics, CI → FOCA | 74ac904ff78c464dbc57482c2d7d06ccf3d2300f | Corrections ciblées acquises ; veille/expiration réelle non démontrées | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) |
| [#23](https://github.com/Sdisnv/monitoringF7/pull/23) | Horaires verticaux du Programme | 435bed709dc61c6534d1e58ce2978c6f7bbceac2 | ACQUIS VALIDÉ — PASS MOA horaires | [docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_HORAIRE_LAYOUT_20261015.md) |
| [#24](https://github.com/Sdisnv/monitoringF7/pull/24) | Public cible, Responsable et références communes | b3b0cb372fa68aa4a83f8ef8f0856d31d7fbc3a5 | PARTIELLEMENT DÉVELOPPÉ — PASS MOA partiel | [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) |
| [#25](https://github.com/Sdisnv/monitoringF7/pull/25) | Échelon 0, et/à, candidats EA, calendrier, dates, 14 jours | 92cce517f79a89e3040d234314b8de52613af05a | PARTIELLEMENT DÉVELOPPÉ — PASS MOA partiel | [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) |
| [#26](https://github.com/Sdisnv/monitoringF7/pull/26) | Préparations bidirectionnelles, groupées et SDIS transversal | 0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41 | ACQUIS VALIDÉ — PASS MOA sur cas démontrés | [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) |
| [#27](https://github.com/Sdisnv/monitoringF7/pull/27) | CMDT — gouvernance hors calendriers des onze OI opérationnels | 3bdad82029ef79ea721bcf4043a5bb47e4d86764 | ACQUIS VALIDÉ — PASS MOA sur périmètre contrôlé | [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) |

#27 : **Y1 96, G1 384, SDIS 46 ; aucune duplication observée**, PASS transmis par la MOA dans la mission actuelle. Ne pas relancer cette recette. Les preuves clone #27 portent sur Y1 95, G1 383, SDIS 44 (944 lignes projetées, 924 actives), périmètre antérieur et représentatif explicitement déclaré. Ces valeurs différentes ne suffisent pas à établir une régression ; aucune d'elles n'est un invariant de production.

Protection commune : identifiants et données brutes conservés ; pas de conversion historique automatique. Programme web : heures verticales acquises #23. Exports PDF : future typographie ASCII distincte. Chef section commun DPS/DAP, Échelon **0** (zéro), regroupements « et » pour deux/discontinus et « à » pour séquence continue ≥3, Resp matériel, Préposé matériel, candidats PL/TP9/VL et machiniste EA, initiales et références Chef harmonisées : préserver la portée démontrée #24/#25, sans transformer leurs PASS partiels en acceptation générale.

SDIS : visibilité transversale sur onze OI et leurs parents ; le filtre SDIS n'inclut que les organisateurs SDIS, sans inverse généralisé. CMDT est une **portée de diffusion calculée**, pas un nouvel OI, domaine, droit ou public. Les cinq définitions exactes EM/Codir/Codir repas/CRDIS/Conférence des Commandants sont exclues des vues opérationnelles et restent dans SDIS/global. Aucune exclusion par titre seul, Stat.Com F0, COSEC ou analogie ; aucune assignation individuelle créée par la diffusion.

Les seize soirées DAP, quotas existants, onze familles dont Permanent, CI DAP/CI DPS sous FOCA, révisions/historique/codes, CTA/sections/réserves et moteurs déjà acquis restent protégés. Aucun chantier nouveau ne justifie leur reconstruction.

## Règles remplacées, chronologie et contradictions qualifiées

| État antérieur / source | Source postérieure | État applicable sans nouvel arbitrage |
|---|---|---|
| Audit initial : main #22 / 74ac904 ; mentions non déployé des rapports #23–#27 avant livraison | GitHub fusion #27 et Netlify published_deploy contrôlés directement | #20–#27 intégrées et techniquement publiées ; mentions pré-fusion restent historiques |
| Situation V1 du 15.10 : CMDT en attente de GO, main #26 | [docs/SCOPE_QV_CMDT_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CMDT_20261015.md) puis mission actuelle §2–3 | GO/livraison dépassés par #27 fusionnée/publiée et PASS MOA ; aucun nouveau correctif CMDT à programmer |
| Audit initial : formations groupées DAP 1.1/1.2 entièrement à préciser | [docs/SCOPE_QV_PREPARATION_SDIS_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PREPARATION_SDIS_20261015.md) / canon actualisé | Cas DAP démontré : cours 23.03, séances 21/28.04, 29 jours, décision humaine préservée. Groupes DPS : 15.03 → première 12.05, 58 jours, projection démontrée distincte décision humaine. Ne pas maintenir une absence générale de relation ; autres thèmes/horaires/responsables à qualifier seulement si source manquante |
| Chef section DAP séparé ; libellés bruts/historiques | [docs/SCOPE_QV_PUBLICS_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_PUBLICS_MOA_20261015.md) puis [docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/3bdad82029ef79ea721bcf4043a5bb47e4d86764/docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md) | Chef section de présentation commun DPS/DAP ; ancien code et données brutes conservés ; trim de présentation Resp matériel ; aucune relation fonctionnelle individuelle inventée |
| QV-PDF-003 canon, impression à 100 %, marges 10 mm et trois formats | Mission actuelle §5 — complément MOA | Même repère qualifié par intitulé/date ; complément largeur/ASCII distinct ; aucun renommage ni écrasement de la règle antérieure |
| #23 restaure la lecture verticale web | Mission §5 demande HH:MM - HH:MM dans le PDF | Deux supports, aucune contradiction ; ne pas modifier le vertical web acquis |
| Rapports clone #27 Y1 95/G1 383/SDIS 44 | Mission actuelle Y1 96/G1 384/SDIS 46 PASS | Instantanés/périmètres différents ; pas de régression déduite, pas de recette relancée |
| QV-PUBLIC-008, DPS-003, CALENDAR-003, EXERCICE-PREPARATION-001 réapparaissent dans le canon | Ajouts datés #24–#26 et ancien index | Citer section/date/intitulé en plus de l’ID ; ne pas fusionner silencieusement des exigences distinctes |
| M1–M7/P1–P6 et révisions dans preuve 14.10 / lecture SQL initiale du 15.10 | Pas de nouvelle preuve de clôture reçue dans #23–#27 | À suivre selon dernier état prouvé ; ouverture actuelle NON VÉRIFIÉE pour les cas non relus ; P2/P6 restent décisions acquises, pas à redécider |

## Source humaine actuelle conservée intégralement

Transcription fournie par la MOA ; aucune phrase de cette archive ne donne autorisation d’exécuter une phase future pendant cet audit.

```text
SCOPE ONLINE — AUDIT GLOBAL
ACTUALISATION CONSOLIDÉE DU 15.10.2026

MISSION
Actualiser l'audit global SCOPE déjà réalisé afin
d'intégrer les dernières décisions MOA, les PR #20
à #27, les recettes acquises et les nouveaux jalons.

OBJECTIF FINAL
Préparer une base documentaire durable, complète,
cohérente et vérifiable permettant :

1. De poursuivre le développement de SCOPE.
2. De finaliser prioritairement QUO VADIS.
3. De préserver tous les acquis.
4. De disposer d'une ROADMAP exhaustive.
5. De disposer d'une ToDo List exhaustive.
6. De transmettre intégralement le projet à une
   nouvelle conversation ChatGPT, Claude ou
   un autre développeur.
7. De ne plus dépendre des anciennes conversations
   pour retrouver les décisions métier.

DÉPÔT
Sdisnv/monitoringF7

BRANCHE
main

PRODUCTION
https://scope-sdisnv.netlify.app

MODE
AUDIT DOCUMENTAIRE ET TECHNIQUE
LECTURE SEULE

==================================================
1. RÈGLES ABSOLUES
==================================================

Ne pas recommencer l'audit global.

Ne pas relancer les tests déjà acquis.

Ne pas modifier le code.

Ne pas modifier les données.

Ne pas modifier les configurations.

Ne pas créer de migration.

Ne pas modifier les permissions ou RLS.

Ne pas modifier Okta.

Ne pas modifier Netlify.

Ne pas créer de branche ou de PR.

Ne pas fusionner.

Ne pas déployer.

Ne pas publier le Programme annuel.

Ne pas modifier les événements.

Ne pas modifier les affectations.

Ne pas modifier les présences.

Ne pas modifier les qualifications.

Ne pas modifier les historiques.

Ne pas reconstruire une fonctionnalité existante.

Ne pas créer de moteur parallèle.

Ne pas inventer de règle métier.

Ne pas arbitrer à la place de la MOA.

Aucune écriture dans le dépôt.

Les livrables actualisés doivent rester hors dépôt
jusqu'à autorisation MOA de la phase B.

==================================================
2. CAPITALISATION DES ACQUIS
==================================================

Les PR #20 à #27 sont annoncées fusionnées et
publiées par la MOA.

Vérifier directement GitHub et Netlify.

Ne pas considérer ces informations comme
techniquement vérifiées avant contrôle.

PR #20 :
Familles, filtres, classification DAP.

PR #21 :
Famille Permanent, référentiels et OI.

PR #22 :
Conduites DAP, créneaux horaires,
reconnexion, brouillons, Public cible,
cursus CI → FOCA.

PR #23 :
Affichage vertical des horaires.
Recette MOA PASS.

PR #24 :
Référentiel Public cible, Responsable,
Chef section commun, matériel,
candidats conducteurs.
Recette MOA partielle.

PR #25 :
Échelon 0, regroupements "et"/"à",
candidat machiniste EA, calendrier,
dates validées, délai de 14 jours.
Recette MOA partielle.

PR #26 :
Alertes bidirectionnelles.
Formations groupées DPS/DAP.
OI SDIS transversal sur onze OI.
Filtres, calendriers et exports.
Recette MOA PASS sur les cas démontrés.

PR #27 :
Diffusion CMDT — Gouvernance.
Exclusion des séances État-major, Codir,
CRDIS et Conférence des Commandants
des calendriers opérationnels.
Conservation dans SDIS/global.
Recette MOA PASS.

Commit de fusion PR #27 annoncé :
3bdad82029ef79ea721bcf4043a5bb47e4d86764

Vérifier le SHA réellement publié.

Ne pas rouvrir ces corrections sans preuve
d'une anomalie résiduelle.

==================================================
3. DERNIÈRES RECETTES MOA
==================================================

Conserver les résultats suivants :

PR #27 — CMDT

OI Y1 : 96 résultats.
OI G1 : 384 résultats.
OI SDIS : 46 résultats.

PASS MOA sur le périmètre contrôlé.

Aucune duplication observée.

Ne pas relancer cette recette.

PR #23 :
Affichage des horaires PASS.

PR #24 :
Public cible / Responsable PASS partiel.

PR #25 :
Contrôles préparatoires PASS partiel.

PR #26 :
Alertes bidirectionnelles et OI transversal
PASS sur les cas démontrés.

Ne jamais transformer un PASS partiel
en validation globale.

==================================================
4. PRIORITÉ ABSOLUE — QUO VADIS
==================================================

La priorité actuelle est :

FINALISER QUO VADIS 2027.

La chaîne opérationnelle attendue est :

VALIDATION ANNUELLE
→ PUBLICATION
→ CRÉATION / LIAISON DES ÉVÉNEMENTS
→ ASSIGNATIONS
→ PROGRAMMES INDIVIDUELS
→ COMMUNICATION
→ MODIFICATIONS ULTÉRIEURES.

Pour chaque étape :

- Identifier les fonctions existantes.
- Identifier les fonctions manquantes.
- Identifier les validations acquises.
- Identifier les dépendances.
- Identifier les anomalies ouvertes.
- Identifier les décisions MOA nécessaires.
- Définir les critères d'acceptation.

Ne pas déclarer le Programme annuel validé.

==================================================
5. CORRECTION PDF À CONSERVER
==================================================

Chantier :
QV-PDF-003 — complément MOA.

ATTENTION :
Vérifier les usages antérieurs de cet identifiant
avant de le réutiliser.

Demande 1 :
Uniformiser la largeur utile des éléments du PDF :

- Bandeau rouge.
- Titre.
- Informations de génération.
- Filtres.
- Tableau.
- Pied de page.

Conserver les logos et proportions.

Demande 2 :
Uniformiser les horaires PDF :

HH:MM - HH:MM

Exemple :
19:00 - 21:30

Trait d'union simple avec espaces.

Ne pas modifier les données horaires.

Ne pas modifier les autres modèles conformes.

Ne pas modifier l'affichage vertical acquis
du Programme annuel :

19:00
21:30

Document témoin :
QUO VADIS 2027, Liste compacte (RECETTE).pdf

Six pages, 96 séances, filtre DAP:Y1.

Vérifier si ce document est disponible
dans les preuves existantes.

Sinon :
NON OBTENU.

==================================================
6. NOUVEAU JALON — CONTRÔLE QUALITÉ
==================================================

Identifiant proposé :
QV-CONTROLE-QUALITE-001

Objectif :
Contrôle de cohérence du Programme annuel
avant validation définitive.

Réutiliser les moteurs existants.

Contrôler notamment :

- OI.
- Domaine.
- Famille.
- Stat.Com.
- Lieu et salle.
- Responsable.
- Public cible.
- Spécialisation.
- Cursus.
- État.
- Reconduction.
- Évaluation.
- Activité soldée.
- Export ECAwin.

Comparer les activités équivalentes entre OI.

Détecter les écarts inhabituels sans les
considérer automatiquement comme erreurs.

Réutiliser les contrôles de planification :

- Dates.
- Salles.
- Ressources.
- CTA.
- Sections et demi-sections.
- Préparations.
- Délai de 14 jours.
- Jours fériés.
- Vacances.
- Dates validées.
- Dérogations.

Gravités attendues :

BLOQUANT
À ARBITRER
INFORMATIF

Une anomalie bloquante non résolue empêche
la validation annuelle.

Rapport consolidé attendu avec :

- Anomalies.
- Causes.
- Événements concernés.
- Décisions MOA.
- Dérogations.
- Corrections.
- État de résolution.

Aucune correction automatique.

==================================================
7. ASSISTANCE À LA PLANIFICATION
==================================================

Identifiant proposé :
QV-PLANIF-ALTERNATIVES-001

Lorsqu'une collision est détectée,
SCOPE doit pouvoir proposer plusieurs dates
alternatives pertinentes.

Prendre en compte :

- Jours préférés, possibles, déconseillés,
  interdits.
- Autres événements.
- Préparations.
- Délai minimal.
- Salles et ressources.
- Publics.
- Sections et demi-sections.
- Rotations CTA.
- Jours fériés.
- Vacances.
- Décisions MOA.

Expliquer les contraintes respectées.

Identifier les contraintes non vérifiées.

Ne jamais déclarer une salle disponible
sans preuve.

Aucune modification automatique des dates.

La MOA conserve la décision finale.

==================================================
8. CONSULTATION ÉTAT-MAJOR
==================================================

Identifiant proposé :
QV-CONSULTATION-001

Prévoir un mode de consultation simplifié
de QUO VADIS pour l'État-major.

Fonctions attendues :

- Programme annuel.
- Agenda.
- Calendrier.
- Fiches.
- Recherche.
- Filtres.
- Exports autorisés.

Masquer les fonctions non pertinentes.

Réutiliser Okta et RBAC existants.

Vérifier les protections serveur.

Ne pas créer une seconde application.

Ne pas retirer les droits existants
aux utilisateurs autorisés à la saisie.

==================================================
9. CONTINUITÉ DE PRODUCTION
==================================================

Identifiant proposé :
SCOPE-PROD-001

Exigence impérative :

LA SAISIE EN PRODUCTION DOIT RESTER ACCESSIBLE.

Préserver :

- Consultation.
- Saisie.
- Enregistrement.
- Validation.
- Publications existantes.
- Présences.
- Affectations.
- Historiques.

Prévoir :

- Branches isolées.
- Recette maîtrisée.
- Contrôle du déploiement.
- Retour arrière.
- Intervention rapide en cas d'incident.

Aucune opération risquée sur les données
sans GO MOA.

==================================================
10. SIGNALEMENT DES INCIDENTS
==================================================

Identifiant proposé :
SCOPE-INCIDENT-001

Prévoir un circuit opérationnel :

SIGNALEMENT
→ QUALIFICATION
→ PRIORISATION
→ CORRECTION
→ TEST CIBLÉ
→ PUBLICATION
→ VÉRIFICATION
→ CLÔTURE.

Distinguer incident et évolution.

Priorités :

CRITIQUE
MAJEURE
MODÉRÉE
MINEURE

Réutiliser les outils de suivi existants.

Ne pas créer un second système de tickets
sans nécessité démontrée.

==================================================
11. NETLIFY — TAUX D'ERREURS
==================================================

Observation MOA du 15.10.2026 :

247 requêtes sur une heure.
Taux d'erreurs affiché : 10,93 %.

Ces chiffres sont historiques.

Ne pas les présenter comme l'état actuel.

Investigation attendue :

- Logs Netlify.
- Codes HTTP.
- Routes.
- Fonctions.
- Refus de sécurité attendus.
- Erreurs serveur réelles.
- Déploiements récents.
- Causes démontrées.

Ne pas modifier les protections pour
réduire artificiellement le taux.

Produire un diagnostic distinct.

Classer les incidents réellement critiques
en priorité opérationnelle.

==================================================
12. PUBLIC CIBLE / RESPONSABLE
==================================================

Conserver les acquis :

- Chef section commun DPS/DAP.
- Échelon 0.
- Regroupements "et" / "à".
- Resp matériel.
- Préposé matériel.
- Candidats conducteurs.
- Candidat machiniste EA.
- Majuscules initiales.
- Références Chef harmonisées.

Poursuivre l'harmonisation des référentiels.

Préserver la distinction :

PUBLIC CIBLE
RESPONSABLE
FONCTION
QUALIFICATION
AFFECTATION
SPÉCIALISATION
CURSUS.

Besoin restant :

Relation datée
PERSONNE–FONCTION–DOMAINE–OI.

Objectif :
Extractions individuelles fiables des
chefs de section.

Réutiliser les affectations datées existantes.

Aucun NIP fictif.

==================================================
13. PROGRAMME ANNUEL 2027
==================================================

Observation MOA du 15.10.2026 :

925 séances.
270 activités distinctes.
924 réalisations.
1535 couvertures OI.
670 éléments à traiter.

Ces valeurs sont des instantanés.

Ne pas les transformer en invariants.

Vérifier les valeurs actuelles uniquement
si un accès lecture seule approprié existe.

Programme annuel toujours NON VALIDÉ.

==================================================
14. ROADMAP ET TODO — ACTUALISATION
==================================================

Actualiser les huit livrables existants :

SCOPE_AUDIT_INTEGRAL_20261015.md

SCOPE_INVENTAIRE_FONCTIONNEL_20261015.md

SCOPE_ROADMAP_CONSOLIDEE_20261015.md

SCOPE_TODO_CONSOLIDEE_20261015.md

SCOPE_REGISTRE_ANOMALIES_20261015.md

SCOPE_MATRICE_TRACABILITE_20261015.md

SCOPE_PLAN_FINALISATION_QV_20261015.md

SCOPE_REGISTRE_DECISIONS_MOA_20261015.md

Ne pas recréer de nouveaux documents concurrents.

Pour chaque exigence :

- Identifiant.
- Description métier.
- Source.
- Date de décision.
- Priorité.
- Module.
- Dépendances.
- État du développement.
- État des tests.
- Validation MOA.
- Travaux restants.
- Critères d'acceptation.
- Preuves.
- Prochain jalon.

Distinguer :

ACQUIS VALIDÉ
DÉVELOPPÉ NON VALIDÉ
PARTIELLEMENT DÉVELOPPÉ
À DÉVELOPPER
BLOQUÉ MOA
ANOMALIE OUVERTE
TRAVAIL EN COURS
NON VÉRIFIÉ.

Ne pas rouvrir les acquis.

Ne pas déclarer une fonctionnalité terminée
sans preuve.

==================================================
15. AUTRES CHANTIERS À CONSERVER
==================================================

Conserver explicitement :

- QV-RULES-001.
- QV-CYCLE-007.
- Participations et assignations.
- Cours ECA.
- Observations et évaluations.
- IndeX.
- ECAwin.
- ProgJour.
- GELORE2.
- Arbitrages M1–M7 et P1–P6.
- Révisions EM, PR et JSP.
- Validation du Programme annuel 2027.

ProgJour reste suspendu.

GELORE2 reste dépendant du fournisseur.

Ne pas développer ces chantiers pendant
l'audit.

==================================================
16. VÉRIFICATIONS DOCUMENTAIRES
==================================================

Lire les sources GitHub actuelles :

- Référentiel métier canonique.
- Roadmap et ToDo.
- Rapports MOA.
- Rapports PR #20 à #27.
- Documents de recette.
- Rapports de sécurité.
- Documents d'architecture.

Confronter les nouveaux constats aux
décisions déjà validées.

Identifier les règles remplacées ou abrogées.

En cas de contradiction :

- Citer les deux sources.
- Vérifier leur chronologie.
- Ne pas arbitrer automatiquement.

Ne pas se fier uniquement à la mémoire
ChatGPT ou aux anciens rapports.

==================================================
17. LIVRABLE FINAL
==================================================

Produire :

1. Les huit livrables de phase A actualisés.
2. Un registre des nouveautés depuis
   l'audit initial.
3. Une liste des acquis protégés.
4. Une liste des anomalies réellement ouvertes.
5. Une ROADMAP priorisée.
6. Une ToDo opérationnelle.
7. Un plan de finalisation QUO VADIS.
8. Les décisions MOA encore nécessaires.
9. Les limites et informations NON VÉRIFIÉES.
10. Une recommandation du prochain jalon.

Tous les documents restent hors dépôt.

Aucune écriture GitHub.

Aucune modification du code.

Aucune modification des données.

Aucune publication.

Aucun nouveau développement.

==================================================
18. VERDICT ATTENDU
==================================================

AUDIT_READY_FOR_MOA

Uniquement si les huit livrables sont
cohérents, actualisés et vérifiables.

Sinon :

AUDIT_INCOMPLET

Avec les réserves précises.

Ne pas déclarer l'audit exhaustif si des
sources ou preuves importantes restent
non consultées.

Ne pas engager la phase B.

Attendre le GO MOA.

FIN DE MISSION
```

## Réserves de l'actualisation et verdict

**AUDIT_INCOMPLET** : les huit livrables sont actualisés pour #20–#27 et les nouvelles décisions, mais l'exhaustivité globale n'est pas attestée. La lecture ciblée du delta ne comble pas les lacunes de l'audit initial : lecture humaine intégrale des 183 documents initiaux/captures non réalisée ; associations complètes règle → scénario → preuve → acceptation manquantes ; parcours authentifiés de tous les profils non vérifiés ; veille physique, expiration réelle Okta et Safari non démontrés ; configuration IdP, correspondance effective DATABASE_URL/projet SQL, exposition Data API/RPC et revue de permissions complète non vérifiées.

Le témoin PDF exact « QUO VADIS 2027, Liste compacte (RECETTE).pdf », six pages, 96 séances, filtre DAP:Y1, est **NON OBTENU**. Recherche de noms de fichiers dans les pièces jointes Codex, le dossier d'audit, les preuves locales PR #27 et le dépôt partagé : 73 PDF indexés, aucun nom correspondant « recette » + « compacte/quo vadis ». Cela ne démontre pas son inexistence ailleurs. Aucun nouveau PDF de production exporté, aucune inspection visuelle de ce témoin revendiquée.

Netlify : fenêtre et codes effectivement lus ; cause précise des six 401 NON VÉRIFIÉE. Les 499 sont compatibles avec des interruptions, sans preuve du motif client. Aucun 5xx retourné sur les deux fenêtres étudiées ; cela ne garantit pas toutes les périodes. Les journaux détaillés consultés ne livrent pas de motif applicatif exploitable pour les requêtes examinées.

Les chiffres MOA 925 séances / 270 activités / 924 réalisations / 1535 couvertures OI / 670 à traiter sont un instantané humain, pas des invariants ni une lecture fraîche de cet audit. La preuve versionnée PR #27 à **14:24:08 heure suisse** relève PREPARATION, 878 préparations persistées et 125 liens de publication ; ces objets ne sont pas des compteurs équivalents aux lignes projetées ou aux séances. Aucun recalcul applicatif ni nouvel appel de GET susceptible d'initialiser le schéma n'a été fait.

Prochain jalon recommandé : revue MOA du dossier actualisé, obtention du témoin PDF et association des preuves manquantes, puis qualification des contrôles bloquants QV et décisions de planning. Le GO de capitalisation phase B, le GO de développement, la validation annuelle et le GO de publication sont distincts. Aucune action future n'est engagée automatiquement par ces documents.

---

## Archive de l’audit initial — état #22, conservé pour traçabilité

**Historique, non mis à jour dans cette section.** Le main74ac904, déploiement08:56, instantanés initiaux, anciens « à développer » et anciens prochains jalons ci-dessous sont à lire avec les rectifications et l’ordre applicable en tête. Cette archive préserve les exigences, preuves, tableaux et décisions non rouverts ; les constats non réévalués restent datés. Elle ne constitue pas un second backlog actif. Aucun état « actuel » contenu dans cette archive ne doit être transféré sans sa date.

Date de référence : **15 octobre 2026**, Europe/Zurich. Phase A seulement.

Référence initiale acquise : `e7672369e08727849e96ef56d4462840d9dfca0e`. Une information postérieure, découverte dans le chat « Correction des filtres DAP », a justifié l'examen **du seul delta PR #22** : main vérifié à `74ac904ff78c464dbc57482c2d7d06ccf3d2300f`, PR #22 fusionnée le 15.10 à 08:55:55 ; Netlify `6ad078fdc7267d841bd7a675`, état ready, publication à **08:56:34.716 heure suisse**. Les contrôles de la base #20/#21 n'ont pas été rejoués. Les trois assets identiques à la production appartiennent à la preuve initiale ; cette preuve n'est pas étendue artificiellement aux nouveaux assets #22.

Sources GitHub épinglées au SHA ci-dessus ; copie de travail d'audit dans `dossier local historique de l’audit (non versionné)`, sans checkout de branche. Aucun code du dépôt partagé modifié. Aucun test exécuté, aucun serveur démarré, aucune migration, écriture métier, PR, fusion ou publication effectuée par cet audit. Les huit rapports sont des **livrables locaux de phase A**, pas une capitalisation GitHub. `docs/SCOPE_PROJECT_MASTER_CONTEXT.md` n'est ni créé ni modifié.

Les résultats historiques PASS sont des preuves de leur périmètre et de leur date. Ils ne constituent ni une nouvelle exécution, ni une validation MOA de toute l'application. Une validation de règle ou de maquette reste distincte de l'acceptation d'un parcours opérationnel. **Programme annuel 2027 NON VALIDÉ.**

## Autorité et portée

Les décisions humaines versionnées priment. Ce registre cite les décisions et leurs remplacements ; il ne les réécrit pas. Les corrections de code, tests et fusions sont des états de livraison distincts. Les priorités d'audit ne constituent pas des décisions MOA.

## Preuve précise pour Permanent

Demande originale retrouvée par lecture du chat Codex « Finaliser la publication de la PR #8 », tour `01a13e0a-6c72-7d82-bdbb-1af5fe72138f`, message utilisateur `01a13e0a-6cd3-7b72-acc6-0907b829ee29`, pièce jointe locale : [mission du lot consolidé](../../project-context/SCOPE_MOA_SOURCES_20261015.md#source-permanent). Titre daté15.10.2026, AUTORISATION MOA : GO, Étape2 : « La famille Permanent est officiellement validée par la MOA. »

La justification métier démontrée est la demande explicite d'une famille supplémentaire disponible en fiches, filtres, statistiques et reconduction, séparée des familles de formation ; aucun périmètre nominatif de « Permanent » n'est inventé. Capitalisation durable déjà présente : [### QV-FAMILY-005](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L845). L'autorisation de ce lot historique ne donne aucun droit de mutation pendant le présent audit.

Code : [function qvProgrammeFamilyCatalogue](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui-logic.js#L3502), [function qvProgrammeFamilyOptions](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/assets/js/scope-ui.js#L12794). Tests/preuves #21 : Permanent sauvegardé/filtré/compté/reconduit uniquement sur fixtures, sans conversion existante. CSV lit la famille stockée ; aucune nouvelle colonne Permanent dédiée ni nouveau moteur d'export. Les PDF historiques ne démontrent pas un nouveau test de rendu Permanent ; statut de cette vérification spécifique NON VÉRIFIÉ.

## Décisions consolidées
| Objet | Date | État | Décision applicable | Limite / conséquence | Source |
|---|---|---|---|---|---|
| 10 familles →11 | 15.10.2026 | VALIDÉE, remplace la liste antérieure | Mission humaine originale Étape2 : Permanent officiellement validée ; QV-FAMILY-005 versionné. Organisation SDIS/DPS/DAP/JSP/Permanent puis Formation FOBA/FOCO/FOCA/FOSPEC/AUTO/PR. | Aucun événement automatiquement reclassé. | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) |
| CI-DAP/CI-DPS | 15.10.2026 | VALIDÉE, remplace réserve QV-FILTER-007 | QV-CURSUS-009 rattache explicitement les références à FOCA ; lecture SQL ACTIF/FOCA pour les deux. | Ne pas conserver Autres cursus comme anomalie actuelle. | [docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_COMPLEMENT_MOA_20261015.md) |
| DAP exercices ET cadres | 15.10.2026 | VALIDÉE, extension QV-FAMILY-004 | QV-DAP-002 couvre32 occurrences ciblées, 16 familles modifiées et16 déjà conformes. | Ni mixtes, ni DAP5, ni reclassement général. | [docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_CONSOLIDE_20261015.md) |
| PR-ABC | Canon courant | QV-PRABC-001 ABROGÉE | QV-PRABC-003 : trois séances exactes, PABC, Chef PR ; complément12.10 DPS:G1 pour propositions. | Ne pas rétablir6 lignes ni OI historiques supposés. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Conduites DPS | 08.10.2026 | VALIDÉE, état canonique courant | 56 =28 demi-sections×2, adossées aux vraies instructions. Anciennes fabrications/quota par site remplacés. | Conserver décisions humaines et exclusion PIONNIER. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Instructions DPS | Canon courant | VALIDÉE et versionnée | Couverture demi-sections et sections actives, ordre des thèmes, CTA perpétuel, réserves exclues. | Ne pas limiter B2 à2 sections sur seule lacune2026. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Calendrier | 14.10.2026 | QV-CALENDAR-004 remplace absence de légende | Trois légendes/panneau contextuel ; grille6 semaines stable. | Conserver sélection pendant navigation. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Historique | 14.10.2026 | QV-AUDIT-002 remplace détail repliable13.10 | Sept colonnes lisibles, une ligne par champ réellement modifié ; ancien absent = Non enregistré. | Journal historique non reconstruit. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| HSC | 13.10.2026 | QV-CODE-005 remplace affichage QV-CODE-004 | HSC.001–999 ; anciens SCOPE-000xxx conservés en stockage. | Aucune renumérotation ni Stat.Com fictif. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| Cycle/Rapport | 14.10.2026 | VALIDÉE ; clôture future PROVISOIRE | Rapport23.02.2027 ; début24.02 ;10.02.2028 à confirmer Codir. | Périodes SQL/anciennes dates de recette pas décisions. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| JSP P2/P6 | 14.10.2026 | DATES APPROUVÉES, application distincte | 17.02 et23.06.2027,18:30–20:30 ; préserver événement et responsables/publics. | Février toujours au16 à la lecture ciblée. | [docs/SCOPE_QV_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_20261014.md) |
| EM M7 | 14.10.2026 | MAINTIEN16.02, confirmation en attente | 24.02 publié est état historique du même événement ; pas report approuvé. | Stat.Com/code NULL restent NULL. | [docs/SCOPE_QV_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_20261014.md) |
| M2 salle | 14.10.2026 | SOUHAIT MOA, disponibilité non validée | Vulcain souhaitée ; Oxygène pas décision retenue. | Conflit DAP à résoudre ; pas de réservation automatique. | [docs/SCOPE_QV_MOA_20261014.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_MOA_20261014.md) |
| Budget Y1/IndeX | 14.10.2026 | GEL EXPLICITE | 070F23/070F23.006, annulation25.08 et lignée conservées. | Aucune transformation IndeX ou imputation supposée. | [docs/business-rules/quo-vadis-canonical-rules.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md) |
| QV-RULES-001 | 13.10.2026 | MAQUETTE VALIDÉE ; développement cible restant | Un onglet, une règle par cursus, huit sections, jours/quatre statuts, faisabilité/permissions. | Ne pas déclarer terminé parce que des routes existent. | [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| QV-CYCLE-007 | 14.10.2026 | PROCESSUS VALIDÉ, chaîne à démontrer | Ajouts au cycle publié explicites, assignations/programmes/communications individuelles. | Pas de moteur nouveau ni envoi par audit. | [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |
| PR/AUTO et FOSPEC | C1/C15 postérieurs MODEL-2 | PORTÉES À DISTINGUER | MODEL-2 décrit l’ancien regroupement PR/AUTO sous FOSPEC ; C1/C15 les définissent comme domaines indépendants avec compatibilité legacy inchangée. | Ne pas appliquer l’ancienne hiérarchie comme refonte ; si un écran reste ambigu, arbitrage MOA sur sa présentation. | [docs/SCOPE_CANONICAL_FOUNDATIONS_C1.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_CANONICAL_FOUNDATIONS_C1.md) |
| ProgJour / GELORE2 | 14–15.10.2026 | SUSPENDU / CONTRAT ATTENDU | ProgJour après QV ; GELORE2 export G1 à définir selon fournisseur. | Pas d’API/format/synchronisation inventé. | [docs/SCOPE_QV_ROADMAP_V1_20261012.md](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/SCOPE_QV_ROADMAP_V1_20261012.md) |

## Index intégral des rubriques QV du canon actuel

Les intitulés ci-dessous sont reproduits comme index ; chaque occurrence d’un ID reste qualifiée par sa ligne et sa section. L’index ne transforme pas chaque règle en fonctionnalité validée.

| Rubrique canonique | Section / date documentaire | Référence |
|---|---|---|
| QV-CTA-001 — Cycle CTA perpétuel interannuel | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L18) |
| QV-CTA-002 — Réserves exclues des permanences normales | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L23) |
| QV-CTA-003 — G1 = 5 sections / 10 demi-sections opérationnelles | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L27) |
| QV-CTA-004 — C1 / B1 / B2 = 3 sections / 6 demi-sections chacun | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L30) |
| QV-CTA-005 — Un seul moteur | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L33) |
| QV-CTA-006 — Public d’instruction dérivé de la permanence du vendredi de référence | CTA | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L37) |
| QV-DPS-001 — Réalisation par OI lorsque Stat.Com / public / lieu diffèrent | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L44) |
| QV-DPS-002 — B2 reste B2 même au lieu Caserne C1 | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L48) |
| QV-DPS-003 — Responsable = Chef section DPS | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L52) |
| QV-DPS-004 — L’Excel 2026 n’écrase pas un public CTA déjà posé | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L57) |
| QV-DPS-005 — Rotation historique des activités hors couverture d'instruction | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L60) |
| QV-DPS-006 — Saison d’instruction bornée par l’historique | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L63) |
| QV-DPS-ANNUAL-001 — Structure et ordre versionnés | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L70) |
| QV-DPS-COVERAGE-001 — Couverture complète de chaque thème d'instruction | Instructions DPS | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L73) |
| QV-PROJ-001 — Chaque occurrence reprend sa propre réalisation 2026 | Projection annuelle | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L80) |
| QV-PERIOD-001 — Périodicité pluriannuelle | Projection annuelle | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L98) |
| QV-CONDUITE-001 — 2 conduites annuelles par demi-section DPS active | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L108) |
| QV-CONDUITE-002 — Cible = demi-sections opérationnelles actives × 2 | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L111) |
| QV-CONDUITE-008 — Désactivée | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L114) |
| QV-CONDUITE-003 — Adossée à une Instr demi-sct réelle | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L117) |
| QV-CONDUITE-004 — Durée maximale 1 heure | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L120) |
| QV-CONDUITE-005 — Public = `<demi-section source>, cond PL, cond VL` | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L123) |
| QV-CONDUITE-006 — Pas de conduite après PIONNIER | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L127) |
| QV-CONDUITE-007 — Répartition annuelle déterministe | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L130) |
| QV-DAP-001 — Conduite / formation continue DAP | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L135) |
| QV-DAP-002 — Quatre exercices DAP | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L159) |
| QV-FOBA-001 / QV-PR-001 — Thèmes propres aux occurrences | Conduite, formation continue | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L174) |
| QV-PRABC-001 — *Abrogée* : 3 séances T1 + 3 séances T4 | PR-ABC | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L185) |
| QV-PRABC-002 — Séance en matinée du mercredi | PR-ABC | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L189) |
| QV-PRABC-003 — Exercice PR-ABC = exactement 3 séances | PR-ABC | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L192) |
| QV-PIONNIER-001 — Introduction PIONNIER = FOBA 2 | PIONNIER | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L206) |
| QV-PIONNIER-002 — Demi-section = 4 heures (07:30–11:30) | PIONNIER | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L207) |
| QV-PIONNIER-003 — CSU-nvb = 19:15–22:00 | PIONNIER | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L208) |
| QV-PIONNIER-004 — Hors astreinte N et N−1 | PIONNIER | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L211) |
| QV-UI-001 — État = carré 8×8 + texte, sans badge ni capsule | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L218) |
| QV-UI-002 — Actions textuelles non soulignées | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L222) |
| QV-UI-003 — Filtres / recherche conservés au retour de fiche | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L225) |
| QV-UI-004 — Permanence CTA non déplaçable | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L228) |
| QV-UI-005 — Filtre Domaine = taxonomie métier canonique | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L231) |
| QV-UI-006 — Agenda d’une année passée listé sans mois dans l’URL | UX (gel) | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L242) |
| QV-CODE-001 — Code métier = STAT.COM.xxx lorsque l’activité a un Stat.Com | Codes métier | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L252) |
| QV-CODE-002 — Séquence xxx stable et indépendante par Stat.Com | Codes métier | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L253) |
| QV-CODE-003 — Pas d’identifiant technique visible en remplacement du code métier | Codes métier | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L255) |
| QV-SAVE-001 — Trois actions distinctes | Décisions MOA du 10.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L268) |
| QV-RESP-001 — Responsables référencés et descriptifs | Décisions MOA du 10.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L275) |
| QV-PUBLIC-001 — Public libre uniquement descriptif | Décisions MOA du 10.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L281) |
| QV-ECA-001 — Concours confirmé | Décisions MOA du 10.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L287) |
| QV-TITLE-001 — Intitulé exact de l'occurrence | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L295) |
| QV-RESP-002 — Références inclusives et état par défaut | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L298) |
| QV-PUBLIC-002 — Public permanent descriptif | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L301) |
| QV-OI-001 — Sélection globale qualifiée | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L304) |
| QV-ECA-002 — EXEPRO et défaut EXERCI non destructif | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L307) |
| QV-PART-001 — Évaluation individuelle et reconduction | Décisions MOA du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L310) |
| QV-PAPR-001 — Sept modules distincts et prérequis annuel bloquant | Complément MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L315) |
| QV-PR-OI-002 — Exercices PR et exception PR-ABC | Complément MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L333) |
| QV-ECA-003 — Référence SQL Formations EXTRAS | Complément MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L336) |
| QV-WORKFLOW-002 — Retrait et révision ciblée d'une publication | Complément MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L340) |
| QV-CYCLE-004 — Rapport de clôture 2027 proposé en février 2028 | Complément MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L347) |
| QV-PAPR-002 — Propositions automatiques 2027 | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L353) |
| QV-CYCLE-005 — Clôture provisoire 10.02.2028 | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L360) |
| QV-PAPR-003 — Publication antérieure du module 1 | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L365) |
| QV-PUBLIC-004 — Singulier et Préposé APR | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L368) |
| QV-THEME-002 — Priorité au thème explicite | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L372) |
| QV-SPEC-001 / QV-ECA-COURSES-002 — Acquis et roadmap | Finalisation MOA PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L375) |
| QV-PUBLIC-003 — Fonctions descriptives permanentes | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L382) |
| QV-RESP-003 — Correction du libellé C sct | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L386) |
| QV-EXPORT-001 — Intitulé et thème dans les exports | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L389) |
| QV-TYPE-001 / QV-TYPE-002 — Bibliothèque complémentaire | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L392) |
| QV-CYCLE-001 — Cycle délimité par les Rapports annuels | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L395) |
| QV-CYCLE-002 — A+1 et absence de doublons | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L399) |
| QV-STAT-001 — Statistiques civiles indépendantes | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L403) |
| QV-SCOPE-001 — Externe et non évalué sont distincts | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L406) |
| QV-ECA-COURSES-001 — Suivi cantonal préservé | ROADMAP V1 — décisions confirmées du 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L409) |
| QV-SAVE-002 — État explicite indépendant | Finalisation corrective PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L414) |
| QV-PAPR-004 — Modules préparatoires du cursus 2027 | Finalisation corrective PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L418) |
| QV-ECA-004 — Liste d'activités ECAwin | Finalisation corrective PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L422) |
| QV-MANIFESTATION-001 / QV-CODE-004 — Interne non soldé sans Stat.Com | Finalisation corrective PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L425) |
| QV-MANIFESTATION-002 — Préremplissage dépendant des OI | Finalisation corrective PR #12 — 12.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L430) |
| QV-SEARCH-001 / QV-UI-007 — Réactivité et fiches | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L438) |
| QV-WORKFLOW-003 — Aucune modification, mineure ou majeure | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L442) |
| QV-AUDIT-001 — Journal permanent existant | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L447) |
| QV-RESP-004 / QV-PUBLIC-005 — Présentation sans migration d'associations | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L451) |
| QV-NATURE-001 — Paramètres indépendants et occupations | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L456) |
| QV-CODE-005 — HSC, sans renumérotation historique | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L461) |
| QV-CONTROL-001 — Contrôles utiles uniquement | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L465) |
| QV-DPS-GROUP-001 — Formation continue groupée des quatre DPS | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L469) |
| QV-CYCLE-004 — Programme civil et rattachement métier | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L472) |
| QV-UX-RECH-001 / QV-UX-003 — Post-recette ciblée | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L475) |
| QV-PDF-001 — Deux exports annuels existants | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L478) |
| QV-PUBLIC-004 — Groupe OPÉRATIONNEL | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L481) |
| QV-ECA-001 — Activité déjà créée dans ECAwin | Lot consolidé MOA — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L484) |
| QV-PUBLICATION-003 — Rapprochement non destructif | Complément ciblé PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L491) |
| QV-CODE-006 — Préflight HSC préalable à la décision de production | Complément ciblé PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L503) |
| QV-RESP-005 — Références absentes non supposées | Complément ciblé PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L512) |
| QV-PUBLICATION-004 — Dates des propositions A+1 | Derniers contrôles PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L525) |
| QV-DAP-003 — Replanification autorisée de la séance 1.2 | Derniers contrôles PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L534) |
| QV-RULES-001 — Décision MOA validée, prochain jalon uniquement | Derniers contrôles PR #13 — 13.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L546) |
| QV-AUDIT-002 — Tableau directement lisible | Décisions MOA post-PR #16 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L558) |
| QV-RESERVATION-002 — Ressource explicite | Décisions MOA post-PR #16 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L568) |
| QV-PLANIF-005 / QV-OSR-001 — Proposition contrôlée | Décisions MOA post-PR #16 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L576) |
| QV-UX-004 / QV-PDF-002 / QV-PUBLIC-006 | Décisions MOA post-PR #16 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L587) |
| QV-INDEX-001 — Correspondances documentaires, pas de réorganisation | Décisions MOA post-PR #16 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L596) |
| QV-RESERVATION-003 — Date réelle, tous cycles et battement | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L609) |
| QV-EM-001 — Priorité État-major | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L626) |
| QV-CALENDAR-003 — Calendrier validé, stable | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L637) |
| QV-AUDIT-003 — Annulation motivée, valeurs conservées | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L645) |
| QV-FAMILY-002 / QV-PUBLIC-007 — Organisation et présentation | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L657) |
| QV-FREEZE-20261014 — Budget et IndeX gelés | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L666) |
| QV-PDF-003 — Impression à 100 % | Correctif post-recette MOA du 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L673) |
| QV-CYCLE-006 — Dates confirmées et ancienne publication EM | Finalisation Consolidée PR #18 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L682) |
| QV-JSP-001 — Dates Direction JSP approuvées par la MOA | Finalisation Consolidée PR #18 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L693) |
| QV-RESERVATION-004 — Résolution manuelle et preuves d'identité | Finalisation Consolidée PR #18 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L707) |
| QV-CYCLE-007 — Ajouts et communication après publication annuelle | Finalisation Consolidée PR #18 — 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L726) |
| QV-CALENDAR-004 — Panneau complet de la maquette | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L750) |
| QV-CTA-007 — Alerte selon la règle d'instruction, pas la règle générique | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L758) |
| QV-FAMILY-003 — Catalogue commun et valeur absente neutre | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L771) |
| QV-FAMILY-004 — Familles exclusives, décision MOA du 15.10.2026 | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L784) |
| QV-FILTER-006 — Référentiels communs fiche et Programme, 15.10.2026 | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L808) |
| QV-EXPORT-002 — Domaine court et ordre cohérent | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L821) |
| QV-AUDIT-004 — Réactivation annuelle explicite | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L828) |
| Perspectives ProgJour Et GELORE2 | Finalisation V1 — Recette MOA Tests 19 À 33, 14.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L839) |
| QV-FAMILY-005 — Permanent et ordre des onze familles | Complément Consolidé MOA Du 15.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L845) |
| QV-FILTER-007 — Groupes descriptifs et rattachements démontrés | Complément Consolidé MOA Du 15.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L852) |
| QV-DAP-002 — Complément de classification autorisé le 15.10.2026 | Complément Consolidé MOA Du 15.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L863) |
| QV-PUBLIC-008 — Quatre références descriptives | Correctif Complémentaire MOA Du 15.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L884) |
| QV-CURSUS-009 — CI DAP et CI DPS sous FOCA | Correctif Complémentaire MOA Du 15.10.2026 | [Source versionnée](https://github.com/Sdisnv/monitoringF7/blob/74ac904ff78c464dbc57482c2d7d06ccf3d2300f/docs/business-rules/quo-vadis-canonical-rules.md#L902) |

## Source à obtenir — dates d’entrée SDIS

La lecture agrégée relève 290 dates d’entrée SDIS non renseignées sur 296 personnes. Aucune décision de complétion automatique n’est retrouvée ; source RH et portée à confirmer, sans modifier les données. La date d’une affectation ne devient pas arbitrairement une date d’entrée.

## Limites et éléments manquants

Le verdict global est **AUDIT_INCOMPLET**. Les huit dossiers sont remis pour revue, mais l'exhaustivité intégrale ne peut pas être attestée :

1. Les quatre sources principales, leurs ajouts #20–#22 et les socles cités ont été lus ; les autres documents sont inventoriés et indexés, avec revue ciblée. L'intégralité des 183 documents Markdown et de chaque capture n'a pas fait l'objet d'une lecture/interprétation manuelle exhaustive. L'annexe distingue lecture approfondie et indexation.
2. L'inventaire de tests est statique et exhaustif selon le critère de sélection annoncé ; la dernière exécution et l'acceptation MOA ne sont pas démontrées pour chaque fichier/scénario. Les simples mentions documentaires et rapprochements lexicaux ne sont pas transformés en preuves de couverture.
3. Les parcours authentifiés de tous les modules et profils ne sont pas rejoués. Des GET SCOPE passent par `getPgRepo()` et `ensureScopeSchema()` ; leur initialisation peut écrire. Ils ont donc été évités pendant cet audit. Aucun audit dynamique sans risque de toute l'application n'est revendiqué.
4. Pas de nouvelle recette physique de veille, expiration réelle Okta, ni de campagne autorisations complète en production. PR #22 documente LOCAL actif et des scénarios contrôlés ; elle ne valide pas ces conditions réelles.
5. Les métadonnées du projet Supabase nommé SCOPE ont été lues directement, sans personnes ni secrets. Les identifiants EM et cursus concordent avec les preuves de production, mais la valeur effective de DATABASE_URL Netlify n'a pas été extraite/comparée. Variables d'environnement, configuration IdP effective, schémas exposés Data API et surface RPC complète restent non vérifiés.
6. Le tableau M1–M7/P1–P6 est conservé intégralement. Des lectures ciblées actualisent ses préparations/publications ; les disponibilités de toutes les salles, capacités, équipements et fonctions ne sont pas recalculées comme une nouvelle recette de planning. Les disponibilités du 14.10 restent datées, pas garanties aujourd'hui.
7. La matrice automatise les références littérales pour chaque rubrique canonique, mais une démonstration humaine complète règle → exécution → preuve → acceptation reste manquante sur les lignes marquées NON VÉRIFIÉ. Les acquis ne sont pas rouverts du fait de ce manque de traçabilité.

Ces limites ne justifient aucune correction automatique. Le prochain jalon d'audit doit compléter les associations de preuves et les vérifications manquantes **en priorité sur les conditions bloquantes**, sans refaire les campagnes acquises. Le GO phase B reste distinct et ne doit être sollicité qu'après revue MOA de la phase A.

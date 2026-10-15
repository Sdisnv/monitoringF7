# SCOPE / QUO VADIS — ROADMAP V1, 12.10.2026

> Navigation applicable après capitalisation du 15.10.2026 : [roadmap consolidée](audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo opérationnelle](audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md), [contexte maître](SCOPE_PROJECT_MASTER_CONTEXT.md). Les sections ci-dessous restent l’historique des lots. En particulier « CMDT non publié / GO attendu » est dépassé par la fusion/publication #27 et le PASS MOA documentés dans la consolidation. Aucun nouveau backlog ni nouvelle règle n’est créé ici.

## A. HEAD

Main GitHub vérifié : `6f0eb8b2f6aaad6d7a6ab7946304e3b9d3c76ba3`, PR #11 fusionnée.
Branche depuis ce main : `codex/scope-qv-roadmap-v1-20261012`.
HEAD final : commit porté par la PR unique de cette branche. Aucun changement direct de main.
Les modifications locales préexistantes du checkout principal sont conservées.

## B. Corrections

- Dix publics permanents ajoutés, par domaine et triés, avec leurs libellés courts exacts. Publics existants et libres conservés, fonctions descriptives séparées des populations.
- Libellé responsable `C sct`, code historique `C scrt` stable et occurrences inchangées.
- PDF : titre complet puis thème à la ligne suivante. CSV compatible Excel : même cellule, séparateur ` - ` ; aucun séparateur ni ligne vide si le thème est absent.
- Bibliothèque des types canoniques dans la fiche manuelle, propositions uniquement démontrées, variantes DPS par site et valeurs modifiables. Aucune promotion automatique des créations libres.
- Cycle métier séparé de l'année civile, Rapports liés, bornes et paramètres explicites. Rattachement A+1, doublon proposé sans écrasement, lignées et rotations conservées.
- Publication explicitement exclue pour une activité externe hors SCOPE ; une activité interne non évaluée reste publiable après validation globale.

## C. Capacités Réutilisées

PDFKit, export CSV Excel existant, catalogue et référentiels QUO VADIS, moteurs historiques/CTA/DPS, reconduction validée, contrôles de publication, populations datées et moteurs de participation/reporting.
Aucun second suivi des participations, nouveau NIP, affectation fictive, nouveau projet Netlify ou refonte globale.

## D. Preuves

35 tests ciblés et 8 scénarios Chromium du nouveau jalon passent. Les six recettes MOA acquises ne sont pas redemandées.
PDF annuels, compacts et mensuels vérifiés avec et sans thème ; pagination, suffixes et source inchangée. Export CSV et PDF réels vérifiés depuis l'interface.
Trois recettes PostgreSQL, uniquement sur `127.0.0.1:5432/scope_qv_2027_recipe_20261006`, avec BEGIN/ROLLBACK.
867 occurrences originales : Stat.Com, codes, identifiants, dates, thèmes et décisions protégées inchangés.
113 tables identiques après rollback ; aucun événement opérationnel créé, aucune présence ni affectation modifiée durablement.
Cycle de recette clôturé au 02.02.2028 : 47 propositions A+1 en 2027, 51 pour le cycle suivant ; Codir automatique reconnu et proposé sans doublon. La date est artificielle, uniquement en recette rollback.
Clôture de recette au 04.03.2028 : 16 instructions DPS et 16 conduites de l'année civile 2028 restent dans le cycle 2027, avec décisions humaines conservées ; le cycle suivant commence le 05.03 et ne les recrée pas. Moteurs DPS existants et structures de l'année civile réutilisés.
Statistiques : événement du cycle 2027 au 01.01 ou au 28.01.2028, zéro contribution en 2027 et une en 2028 ; événement non évalué exclu, présence conservée, aucun NIP créé.
Build Netlify contexte production et préflight du site existant réussis. Preuves JSON, captures, PDF et CSV : `docs/captures/qv-roadmap-v1-20261012/`.

## E. Données À Confirmer

Actualisation MOA : Rapport annuel 2027 au 23.02.2027, cycle suivant au 24.02.2027 ; clôture proposée au 10.02.2028, toujours provisoire et à valider par le Codir. Aucune date de recette ni 31 décembre ne remplace cette borne. Les cycles futurs attendent leurs paramètres confirmés.
Les anciennes décisions restent accessibles sans reclassement ou déplacement destructif. Les dates civiles restent les seules bornes statistiques.

Cours ECA : les événements nominatifs, les identifiants NIP, les présences, les Stat.Com et les rapports agrégés génériques existent et sont préservés. Un contrat spécialisé d'inscription/import des cours cantonaux, le filtrage explicite des rapports par origine ECA et la distinction formalisée inscription cantonale / obligation SDIS ne sont pas démontrés comme parcours achevé. Ces éléments restent à terminer dans le jalon opérationnel suivant, avec les mécanismes existants, sans module parallèle.

## F. Livraison Et Sécurité

Un seul lot, une seule PR. Migration du libellé C sct transactionnelle, verrouillée et idempotente ; codes, suspensions et historique conservés. Authentification LOCAL, autorisations existantes et sécurité PostgreSQL/RLS inchangées.
Site `scope-sdisnv`, équipe F7 formation / ydon903, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`.
Production préflight : deploy `6acc6f74104cd900084d9ef2`, ready, commit `6f0eb8b`, publié le 12.10.2026 à 05:26:41 UTC.
Aucune écriture de recette ou publication du lot en production. Après GO MOA seulement : fusion, contrôle du déploiement automatique et du commit réellement publié, puis accès et fonctions concernées.
Aucune recette MOA demandée sur une production qui ne contient pas encore le lot.

## G. Verdict

**MOA_REQUIRED** : lot déterministe vérifié ; clôture réelle du cycle 2027 à confirmer et GO explicite requis avant fusion/publication. Aucun défaut de code signalé comme PASS sans preuve.

## Prochain Jalon Validé — QV-RULES-001
Décision MOA du 13.10.2026, maquette validée : un seul onglet Règles, une règle par cursus
complet, fiche en huit sections, portées explicites, jours préférés/possibles/déconseillés/interdits,
faisabilité contrôlée avant validation, accès administrateur ou permission explicite, affichage
informatif dans les événements. À développer après stabilisation de la production, avec les
moteurs existants. Aucun développement de cette exigence dans la finalisation PR #13.
Le suivi spécialisé des Cours ECA reste inscrit au jalon opérationnel, sans module parallèle.

## Actualisation Post-Recette MOA — 13.10.2026

Base directement contrôlée : main et production `7e330f5`, PR #13/#14/#15 fusionnées.
Le correctif gzip PR #15 est préservé sans modification. Les sections historiques ci-dessus
restent des preuves de leur jalon, pas l'état courant des dates : Rapport 23.02.2027,
début de cycle 24.02.2027, clôture 10.02.2028 provisoire / Codir.
Le nouveau lot ne déplace aucune occurrence ou publication et n'effectue aucune recette en production.
Référentiel et ToDo restent dans les documents existants, sans référentiel parallèle.

### ToDo Consolidée

| Exigence | État du lot | Preuve / prochain travail |
|---|---|---|
| QV-CYCLE-004 : cycle et année civile | Terminé et prouvé | Clone : ancien snapshot écarté, janvier SDIS et occupation CFF acceptés ; dates existantes identiques |
| QV-UX-RECH-001 : focus recherche | Terminé et prouvé | Même nœud de recherche, badge ciblé ; frappe rapide et curseur conservés dans Chrome |
| QV-UX-003 : paramètres | Terminé et prouvé | Alignement des cinq contrôles mesuré dans le navigateur ; hauteurs conservées |
| QV-AUDIT-001 : transactions | Terminé et prouvé | Auteur autorisé, actions françaises, détail groupé ; PAPR 3 sans nouvelle validation factice, retrait/revalidation conservés |
| QV-CONTROLE-001 : causes et dérogations | Terminé et prouvé | Règle PLANIF-DPS / vendredi 21.05.2027 ; dérogation motivée contrôlée sur clone, sans cause inventée |
| QV-DPS-GROUP-001 : 0120F7 | Terminé et prouvé | Cinq séances automatiques qualifiées ; séance humaine 1.1 et tous les autres Stat.Com conservés |
| QV-DAP-003 : dates proposées | Terminé et prouvé | 13.05.2027 / 20.05.2027 conservés, application à la fiche sans horaire ni validation inventés |
| QV-PDF-001 : deux PDF | Terminé et prouvé | Onze colonnes, noms exacts, 913 lignes / 47 et 44 pages ; téléchargements filtrés et aperçus contrôlés |
| QV-PUBLIC-004 : OPÉRATIONNEL | Terminé et prouvé | Catalogue descriptif existant, quatre références CI stables, OSR sans NIP ni obligation |
| QV-RULES-001 : jalon majeur suivant | À développer | Un seul onglet ; règle par cursus complet, modules paramétrables, portée, jours lundi–dimanche, quatre statuts, faisabilité et permissions. Maquette validée conservée ; aucun éditeur nouveau dans ce lot |
| Alignement spécialisations IndeX | Bloqué par décision MOA | Référentiel IndeX versionné et correspondances à confirmer, sans refonte |
| Cours ECA individuels et statistiques | À développer | Inscription/import et origine cantonale à formaliser avec les moteurs actuels, aucun module parallèle |
| Types suivis, affectations, exports individuels | En cours | Capacités génériques acquises ; parcours spécialisés à terminer, sans NIP fictif |
| Observations / évaluations | À développer | Conserver le besoin opérationnel et les données existantes |
| Reconduction annuelle contrôlée | Terminé et prouvé | Lignées, décisions humaines et rotations conservées ; extensions statistiques exclusivement civiles |
| QV-ECA-001 : rapprochement ECAwin | Bloqué par décision MOA | Événement déjà existant conservé, pas de réexport de création ; contrat d'échange à vérifier avant intégration |

Le GO de cette livraison et la recette ciblée de production restent distincts des preuves du clone.
Preuves du lot : `docs/captures/qv-post-recette-moa-20261013/` ; rapport `docs/SCOPE_QV_POST_RECETTE_MOA_20261013.md`.

## Actualisation Post-PR #16 — 14.10.2026

Main et production contrôlés directement : `160eb54`, PR #16 fusionnée, aucun autre lot ouvert au préflight.
Les présentations du jalon antérieur restent historiques : détail déroulant remplacé par le tableau à sept colonnes ;
groupe public désormais « Opérationnel ». Aucune fusion, publication ou migration de ce nouveau lot.

### ToDo Du Jalon Ciblé
| Exigence | Travail du lot | Suite |
|---|---|---|
| QV-AUDIT-002 | Tableau, vrais changements, ordre OI ignoré, décisions, corrections automatiques distinctes | Journal existant et anciennes valeurs conservés |
| QV-RESERVATION-002 | Ressource réelle, pas d'exclusivité déduite du lieu sans salle | Qualification explicite des occupations exclusives à confirmer si absente ; aucun nouveau sélecteur |
| QV-PLANIF-005 | N+364 conservé ; contrôle dès proposition/modification, puis enregistrement/validation | Aucun repositionnement de date humaine ou publiée ; DAP/CTA/PR conservés |
| QV-OSR-001 | Exception vendredi limitée au type OSR confirmé et au public démontré | Publics mixtes supplémentaires à arbitrer ; pas de permission générale DPS |
| QV-UX-004 | Grille existante régulière à plusieurs largeurs ; nature externe explicite | Composants et cases conservés |
| QV-PDF-002 | Trois formats existants, présentation commune, séparateur rendu sans modifier la source | Incohérences de données séparées de la mise en page |
| QV-PUBLIC-006 | Ordre exact Opérationnel et OSR prioritaire, FOBA 1/2/3 stables | Aucun changement d'identifiant ou de population |
| QV-INDEX-001 | Inventaire/correspondances ci-dessous uniquement | Catalogue officiel IndeX et arbitrages MOA requis avant réorganisation |

### Inventaire Et Correspondances IndeX À Valider
Lecture seule SCOPE du 14.10 : 17 compétences, 8 fonctions événementielles, 36 publics canoniques,
25 alias de compétences, 6 anciennes correspondances cibles/compétences. Source structurée :
`docs/captures/qv-post-pr16-moa-20261014/index-referentials-readonly.json`.
Les métadonnées sont des sources SCOPE C1/C3, pas une preuve d'exhaustivité officielle IndeX.
Aucun export officiel IndeX versionné trouvé ; les libellés observés ne sont donc pas déclarés officiels par supposition.

| Dimension | Existant / correspondance observée | Écart / décision attendue |
|---|---|---|
| PR, spécialisation | PAPR, PABC ; publics PR-PAPR/PR-PABC, choix PR:2/PR:3 | Correspondance IndeX officielle, candidatures et dates de qualification à confirmer |
| PR, fonctions | FORMATEUR_PR, FORMATEUR_MAISON_FEU, CHEF_PISTE ; choix Formateur PR/FMF/Chef piste | Rôle événementiel distinct de PAPR ; aucune implication automatique |
| AUTO, qualifications | COND_PL, COND_TP9, COND_VL, GRUTIER, MEA, PILOTE_BAT, MACHINISTE_EA, GRUTIER_A, GRUTIER_C, CARISTE | MEA/Machiniste EA et Grutier A/C restent distincts jusqu'à décision, sans fusion |
| AUTO, fonctions | MONITEUR_CONDUITE, FORMATEUR_C1_118, FORMATEUR_EA | Formation qualifiante ≠ fonction de formateur ; alignement IndeX requis |
| FOSPEC | ANTICHUTE, NAC, OFSI, VPC, SANITAIRE | VPC/Sanitaire dans FOSPEC ; public Sanitaire à confirmer, sans identifiant inventé |
| FOBA | FOBA-1/2/3 canoniques ; FOBA:1/2/3 en sélection | Libellés conservés ; populations Recrues / Sapeurs DPS+DAP / Sapeurs DPS |
| DPS/DAP/JSP, organisation | DPS-G1/C1/B1/B2 ; DAP-Y1/Y2/Y3/Y4 ; JSP-GEN/JSP-CAD, MONITEUR_JSP/AIDE_MONITEUR_JSP | Organisation, spécialisation et fonction séparées ; groupes IndeX à confirmer |
| Candidatures | Candidat PAPR/CI DPS/CI DAP/cond PL/machiniste EA/TP9 déjà descriptifs | Candidat non automatiquement qualifié ni affecté ; domaines supplémentaires à valider |
| Grades | 21 grades SDIS, 4 JSP et Civil dans `scope-personnel-referentials.js`, alias existants | Aucun catalogue IndeX externe démontré ; conserver codes/libellés actuels |
| Échelons | ECH:I à ECH:IV dans le catalogue SCOPE | Valider leurs correspondances IndeX, ne pas confondre avec les grades |
| Gouvernance | Codir, CDT, C op/log/for, QM descriptifs ; responsables permanents séparés | Inventaire des fonctions officielles IndeX à fournir/rapprocher ; pas de NIP fictif |
| Affectations/qualifications datées | `scope_affectations`, `scope_person_qualifications` valid_from/valid_to, rôles événementiels séparés | Éligibilité à la date réelle, aucune promotion automatique des descriptions libres |

Proposition de structure future, non implémentée : Organisation ; Cadres ; Candidats par domaine ;
Spécialisation ; Fonctions particulières ; Gouvernance. Domaines PR, AUTO, FOSPEC, FOBA, DPS, DAP, JSP.
Spécialisations triées alphabétiquement dans chaque domaine, libellés IndeX officiels conservés une fois démontrés.
Suggestions contextuelles `011PR` : spécialisations PR, candidats PR et fonctions PR pertinentes, jamais qualification accordée.
Questions MOA : catalogue officiel IndeX ; sens exact MEA/Machiniste EA/Grutier ; fonctions vs qualifications ;
publics mixtes OSR non démontrés ; portée explicite des réservations de site/emplacement.

### Suites Conservées
QV-RULES-001 : onglet unique, portées, cursus multi-modules, contraintes, responsables, publics,
faisabilité, workflow de validation, accès autorisés uniquement ; maquette MOA validée, aucun développement de l'éditeur ici.
Assignations manuelles/assistées/automatiques selon règles validées, éligibilité datée.
Participation : types suivis, Cours ECA individuels, agrégats et présences, sans module parallèle.
ECAwin : codes, exports, rapprochements, événements déjà existants sans recréation.
Observations : sélection, forçage manuel, évaluations. Reconduction N→N+1 : versions métier validées conservées.
Les règles de publication annuelle, RLS, permissions et données historiques restent inchangées.

### Gel MOA Du 14.10.2026
Budget DAP Y1 et transformations du référentiel IndeX gelés : aucune déduction depuis l'OI,
aucun compte, identifiant, renommage, qualification ou affectation inventé. `070F23` / `070F23.006`
et la séance de coordination existante restent intacts, y compris son annulation annuelle humaine.
Rapprochement IndeX, suivi spécialisé Cours ECA et éditeur de règles restent des jalons explicites,
sans module parallèle. Correctif salles/calendrier/annulations/familles/publics/PDF :
[rapport et réserves du lot](SCOPE_QV_MOA_20261014.md), sans déplacement ni publication automatique.

### Finalisation PR #18 — GO Limité Au Lot
Préflight GitHub/Netlify : main et production `6666e2c`, PR #18 sur `a5cb32d` avant ce complément.
Le [rapport existant](SCOPE_QV_MOA_20261014.md#tableau-unique-de-résolution) contient désormais
l'unique tableau des 12 paires de salles (21 IDs), plus le conflit fonctionnel JSP de juin et la
réconciliation EM. Après décision MOA : **neuf dossiers manuels M1–M7 et P2/P6, quatre arbitrages
P1/P3/P4/P5, aucun déplacement exécuté**. Les repères P2/P6 restent conservés, leurs dates sont approuvées.
Deux défauts du mécanisme de révision existant corrigés : compatibilité limitée EM historique sans
remplir son Stat.Com NULL ; fin de date d'une séance d'un jour cohérente après révision approuvée.
Preuve ciblée sur le même clone : 938 lignes courantes, 935 IDs acquis conservés, invariants identiques,
confirmations JSP/EM simulées puis annulées, six refus de sécurité, rollback des 113 tables initiales.
Les trois nouvelles occupations CFF et la modification humaine courante restent conservées.

| Dossier | Suite humaine, sans nouveau développement automatique |
|---|---|
| M1–M6 : réservations et publications liées | Rapprochement DPS/DAP janvier, salles JSP janvier/FVSP/MAT/PR/groupe JSP ; vérifier configuration de formation de la révision PR |
| M2 : salle JSP du 13.01 | **VULCAIN souhaitée par la MOA**, pas Oxygène ; conflit avec intégration DAP conservé tant que sa disponibilité n'est pas démontrée ; aucune réservation modifiée |
| M7 : EM publié 24.02 / préparé 16.02 | Même événement, révision PENDING à confirmer avec motif conforme au maintien du 16.02 ; aucune nouvelle publication |
| P2/P6 : JSP février/juin | **17.02 et 23.06.2027, 18:30–20:30 APPROUVÉS** ; appliquer selon le workflow existant, mêmes enregistrements/identifiants, aucun changement direct de publication en production |
| P1/P3/P4/P5 : fonctions communes | AUTO, cadres DAP/EM, cours cadres DPS/DAP : arbitrer animation et participation ; autre salle insuffisante seule |
| Rapport et cycle | 23.02.2027 définitif, début 24.02 ; 10.02.2028 provisoire / Codir |
| Livraison PR #18 | READY_FOR_MOA n'autorise ni fusion ni publication ; garde-fou de branche conservé |

Les preuves Chrome/PDF/intercycles/annulations acquises restent applicables, sans nouvelle campagne.
QV-RULES-001, Cours ECA spécialisés et rapprochement officiel IndeX restent dans leurs jalons existants ;
aucun module parallèle, aucune modification du budget DAP Y1 ni du référentiel IndeX.

### Complément Ciblé — Processus Après Publication
Décision MOA QV-CYCLE-007, documentation uniquement : **validation annuelle → publication →
création/liaison des événements opérationnels → assignations du personnel → programmes individuels
→ communication initiale → ajouts/modifications/annulations après publication**.
Après validation finale et publication, un ajout SDIS manuel (exemple CRIMSON) peut être rattaché
au cycle publié même avant son début civil habituel, sans reclasser automatiquement les cycles
historiques. Les ajouts doivent être identifiés ; les personnes concernées doivent recevoir une
information individuelle sur ajout, modification ou annulation. Les programmes individuels initiaux
ne sont pas régénérés ni renvoyés systématiquement ; ajout manuel des nouvelles dates par les
destinataires dans leur calendrier personnel. Ce processus reste à préparer avec les mécanismes
existants, sans nouveau moteur de notification dans la PR #18 ni affirmation de parcours déjà livré.

Recette MOA ciblée préparée dans le [rapport existant](SCOPE_QV_MOA_20261014.md) : réutilisation des
**18 scénarios déjà réalisés (11 clone + 7 Chrome)** et de leurs preuves, aucun scénario réexécuté.
Complément strictement documentaire : pas de code, migration, changement Okta/Netlify, écriture en
production, fusion ou publication ; gels Y1 / `070F23` / IndeX déjà intégrés et laissés inchangés.

## Finalisation V1 — Tests MOA 19 À 33
PR #18 désormais fusionnée : main et production contrôlés directement sur `7033e3e`.
Le rapport historique PR #18 et ses preuves restent ceux de ce jalon. Nouveau lot correctif unique,
sans reprise générale : [rapport V1 et preuves ciblées](SCOPE_QV_V1_TESTS19_33_20261014.md).

| Besoin | État / suite |
|---|---|
| Calendrier de fiche | Composant acquis complété par panneau contextuel, date longue, trois légendes ; stabilité ordinateur/mobile vérifiée |
| Instructions DPS / CTA | Faux avertissements samedi/vacances corrigés uniquement si type/OI/public actif correspondent au CTA canonique ; fériés et cycle continu conservés |
| Familles | Catalogue commun, SDIS premier, valeurs enregistrées conservées ; 92 internes / 4 externes sans famille recensés, attribution à confirmer par la MOA |
| Publics | Catalogue sections/demi-sections/échelons/qualifications/fonctions conservé ; aucune section calculée pour séance préparatoire du 27.01 |
| PDF / CSV / domaines | Planning annuel paysage sans troncature à 100 %, Public après OI, Famille en CSV, domaines courts ; structure mensuelle inchangée |
| Réactivation | Action explicite et motif, trace, même ID, disponibilité et état antérieur ; publication annulée traitée dans son workflow opérationnel existant |
| Messages | Causes métier lisibles ; détails techniques conservés hors affichage MOA |
| ProgJour — prochain besoin, pas ce lot | Futur chemin SCOPE > QUO VADIS > ProgJour pour programmation hebdomadaire des permanents. Préserver ID d'événement, activité/thème, date/heures, lieu/salle, OI/public/responsable, état, modifications/annulations. Futures affectations nominatives reliées aux personnes SCOPE par NIP. Sélection des activités et règles détaillées à définir par la MOA ; aucun écran, table, synchronisation ou duplication créé |
| GELORE2 — en attente fournisseur | Export futur des réservations de salles G1 ; demande technique indiquée envoyée par la MOA, format d'import attendu. Aucun développement, API ou format CSV supposé |

QV-RULES-001, suivi spécialisé Cours ECA, processus post-publication QV-CYCLE-007 restent préservés,
sans module parallèle. Budget DAP Y1, `070F23`, correspondances IndeX, EM du 16.02 et décisions JSP
approuvées inchangés. Aucun Programme annuel validé automatiquement ; fusion/publication sous GO distinct.

## Complément MOA Du 15.10.2026 Après PR #24
Lot ciblé : Échelon 0, formatage et/à déterministe, candidat machiniste EA, Responsable commun
Chef section, délai préparatoire de 14 jours sur relations qualifiées, calendrier selon date/cycle,
propositions de date subordonnées aux validations persistantes. Pas de nouvelle migration ni moteur.
Réserves : relations mixtes DPS-DAP non démontrées à arbitrer par paire ; relation individuelle
personne-fonction-domaine/OI datée toujours MOA_REQUIRED. Suivi spécialisé Cours ECA et processus
post-publication restent au même périmètre. Preuves : `docs/SCOPE_QV_CONSOLIDE_PREPARATION_20261015.md`.

## Actualisation Après PR #26 Et Lot CMDT — 15.10.2026

Cette section actualise les états ci-dessus sans effacer leurs preuves historiques.
Main et production vérifiés : `0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41`, PR #20 à #26 fusionnées.
Dernière publication constatée : `6ad0a892de679dbc83844576`, 15.10 à 10:19:31 UTC.
La fusion/publication d'un correctif n'est ni une recette MOA exhaustive ni une validation annuelle.
Programme SQL 2027 encore PREPARATION lors de la lecture seule du lot CMDT.
Synthèse de référence pour la revue V1 : [rapport en vingt rubriques](SCOPE_V1_SITUATION_20261015.md).
Preuves nouvelles limitées : [correctif CMDT](SCOPE_QV_CMDT_20261015.md).

### Roadmap V1 Courante

| Jalon | État réel | Preuves et suite |
| --- | --- | --- |
| PR #20–#25 : familles, publics, horaires, stabilité LOCAL, préparation | DÉVELOPPÉ / TESTÉ TECHNIQUEMENT / PUBLIÉ | Commits fusionnés présents en production ; confirmations MOA limitées aux décisions et recettes explicitement acquises, pas une acceptation globale implicite |
| PR #26 : préparation groupée et SDIS transversal | DÉVELOPPÉ / TESTÉ TECHNIQUEMENT / PUBLIÉ | 88ce4e6 → 0d1fc89 ; relations DAP/DPS démontrées, 24 relations mixtes et fonction individuelle non démontrées toujours ouvertes |
| QV-OI-SDIS-002 : CMDT | DÉVELOPPÉ / TESTÉ TECHNIQUEMENT, NON PUBLIÉ | Correctif présent dans l'unique branche CMDT, décision métier MOA confirmée ; GO fusion/publication séparé requis |
| Qualification finale Programme et réservations | PARTIEL / MOA_REQUIRED | Programme PREPARATION ; dates validées préservées, dossiers M/P selon workflow, aucune validation annuelle annoncée |
| Cycle et reconduction | DÉVELOPPÉ / TESTÉ TECHNIQUEMENT / PUBLIÉ | Borne métier distincte des statistiques civiles ; Rapport 10.02.2028 provisoire/Codir, rotations et décisions conservées |
| Publication, assignations, programmes individuels et communication | PARTIEL | Gardes/publication et moteurs datés existants ; orchestration et diffusion nominative complète non démontrées comme parcours accepté |
| Participations et statistiques | Socle DÉVELOPPÉ / TESTÉ TECHNIQUEMENT / PUBLIÉ ; spécialisations PARTIELLES | NIP, publics applicables, périodes civiles, évaluation individuelle ; finir parcours spécialisés sans nouveau moteur |
| QV-RULES-001 | Maquette/décision VALIDÉE MOA ; éditeur complet NON DÉMONTRÉ | Éditeur générique par domaine existant, pas l'éditeur cursus huit sections attendu ; jalon dédié après stabilisation |
| Cours ECA spécialisés | PARTIEL | Contrat inscriptions/import, origine ECA, obligation SDIS/cours cantonal et agrégats à formaliser sur les mécanismes existants |
| IndeX officiel / ECAwin sans Stat.Com | BLOQUÉ par sources/contrats manquants | Gel IndeX conservé ; rapprochement officiel et contrat d'échange requis, pas de fichier inventé |
| Observations et évaluations qualitatives | NON DÉMONTRÉ / À développer | Besoin maintenu ; ne pas confondre avec la case Évaluer les participations |
| ProgJour / GELORE2 | Besoins conservés, NON DÉMONTRÉS comme livrés | Périmètre MOA ProgJour et format fournisseur GELORE2 attendus, aucun module parallèle |

### ToDo Consolidée Priorisée Pour La Revue MOA

| Priorité | Action / propriétaire attendu | Critère de clôture | Dépendances et protection |
| --- | --- | --- | --- |
| P0 | MOA : recette ciblée CMDT et décision de livraison | Catégories visibles en SDIS/global, exclues des onze OI ; GO explicite | Une seule PR ; pas de répétition des recettes acquises |
| P0 | MOA : finir qualification et réservations du Programme 2027 | Dossiers ouverts traités avec motif, contrôle de salles/personnel, validation annuelle explicite | M2 Vulcain souhaitée, disponibilité à démontrer ; JSP approuvés et EM préservés, pas de déplacement automatique |
| P0 | Codir : confirmer/modifier Rapport 10.02.2028 | Borne métier confirmée et traçable | Provisoire jusque-là ; statistiques 01.01–31.12 inchangées |
| P1 | MOA : qualifier les relations préparatoires mixtes restantes | Correspondance par paire/OI et dates démontrée, ou exception admissible | 24 cas dans la projection de preuve PR #26, nombre courant à rapprocher sans nouveau backfill |
| P1 | MOA/données : relation NIP–fonction–domaine/OI datée | Population de chefs démontrée, sans extension DPS → DAP implicite | Réutiliser moteur daté ; aucun NIP/affectation fictif |
| P1 | Produit/technique : terminer orchestration post-publication | Événements liés, assignations datées, programme individuel, communication initiale puis différentielle démontrés | Validation annuelle → publication → assignations → programmes individuels → communication → ajouts/modifications/annulations ; aucun renvoi systématique du programme initial |
| P1 | MOA/technique : QV-RULES-001 | Une règle/cursus, huit sections, portées, jours, faisabilité et droits, recette dédiée | Réutiliser éditeur et moteurs existants, pas de moteur parallèle |
| P1 | Formation : Cours ECA individuels | Import/inscription, origine, obligations distinctes, NIP et agrégats recettés | Contrat cantonal et données réelles autorisées |
| P1 | MOA : fournir/valider IndeX et contrat ECAwin manquant | Correspondances officielles versionnées et échange démontré | Gel du référentiel IndeX et Stat.Com existants ; aucune modification budget DAP Y1/070F23 |
| P2 | MOA : qualifier les autres diffusions SDIS si nécessaire | Liste de références approuvée | Ne pas extrapoler CMDT aux autres cadres, F0, COSEC ou interSDIS |
| P2 | Produit/MOA : observations et évaluations | Périmètre sélection/forçage/saisie/traçabilité accepté | Réutiliser personnes/événements ; distinct des taux de participation |
| P2 | MOA/fournisseur : ProgJour et GELORE2 | Règles hebdomadaires et format d'import de réservations reçus | Pas de synchronisation ou format supposé |
| P2 | Exploitation/MOA : recette de stabilité sur conditions non prouvées | Veille physique/Safari et profils réels documentés si requis | Les preuves LOCAL/Chrome ne valent pas preuve Okta/veille réelle ; pas de modification sécurité dans le lot CMDT |

La ToDo est consolidée ici, pas dans un second référentiel concurrent. Les anciennes lignes « terminé »
désignent leurs jalons techniques, pas une validation MOA exhaustive. Aucun nouveau développement
hors CMDT n'est exécuté par cette actualisation documentaire.

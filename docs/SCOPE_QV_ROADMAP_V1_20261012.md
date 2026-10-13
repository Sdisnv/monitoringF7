# SCOPE / QUO VADIS — ROADMAP V1, 12.10.2026

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

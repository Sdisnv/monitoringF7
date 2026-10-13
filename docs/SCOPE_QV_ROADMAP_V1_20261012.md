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

La date réelle du Rapport clôturant le cycle 2027 n'est pas démontrée par le référentiel. L'application ne la remplace pas par une date de recette ou le 31 décembre. Les bornes sont déclarables par la MOA dans le Programme ; les cycles futurs attendent leurs paramètres.
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

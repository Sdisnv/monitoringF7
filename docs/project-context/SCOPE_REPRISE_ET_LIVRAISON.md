# Reprise, recette, livraison et incidents SCOPE

Périmètre : guide opérationnel documentaire. [Contexte maître](../SCOPE_PROJECT_MASTER_CONTEXT.md), [roadmap unique](../audits/20261015/SCOPE_ROADMAP_CONSOLIDEE_20261015.md), [ToDo unique](../audits/20261015/SCOPE_TODO_CONSOLIDEE_20261015.md). Ce guide ne donne aucune autorisation implicite d’écriture ou d’envoi.

## Reprise dans une nouvelle conversation

1. Lire le contexte maître, le [canon](../business-rules/quo-vadis-canonical-rules.md), la roadmap/ToDo et le registre des décisions. Puis lire intégralement les sources du jalon ; pour reprise du dossier QV, inclure [roadmap V1](../SCOPE_QV_ROADMAP_V1_20261012.md), [MOA14.10](../SCOPE_QV_MOA_20261014.md), [tests19–33](../SCOPE_QV_V1_TESTS19_33_20261014.md), rapports #20–#27 et preuves référencées utiles. Ne pas reconstruire le dossier d’audit.
2. Contrôler GitHub directement : HEAD main complet, PR ouvertes, dernières fusions, branche et éventuels travaux locaux étrangers. Ne pas supposer3bdad820encore courant. Lire uniquement le delta des sources depuis la référence documentaire pour identifier les décisions nouvelles ; pas de campagne d’audit globale automatique.
3. Contrôler Netlify en lecture seule : site exact, déploiement **publié** (pas seulement dernier build), état, commit et horodatage. Une différence documentaire de branche n’impose pas une publication ; un SHA publié différent doit être expliqué avant recette de ce lot.
4. Vérifier les acquis techniques et MOA, le périmètre des PASS, anomalies réellement ouvertes, réserves et dépendances. Lire la chronologie en cas de contradiction, qualifier les IDs répétés par section/date/intitulé. Si un document ou droit d’accès manque, le signaler précisément sans inventer de résultat.
5. Identifier le prochain jalon dans la roadmap et sa tâche dans la ToDo. Restituer besoin, existant réutilisable, modification nécessaire, impacts, preuves acquises, tests strictement nouveaux/dépendants, décisions manquantes et critères de clôture. La priorité reste QV2027 NON VALIDÉ.
6. Obtenir la **validation MOA du périmètre avant développement**. Une instruction explicite déjà reçue couvre son périmètre ; ne pas redemander les validations acquises. Un GO documentaire ne vaut pas GO de code, données, fusion ou publication. En cas de simple qualification autorisée, poursuivre les lectures utiles puis présenter les décisions encore nécessaires.

## Protocole Codex/Cursor pendant un lot autorisé

Travailler dans une branche isolée depuis main vérifié, un lot cohérent et une PR, sans incorporer les modifications étrangères. Ne changer que les composants nécessaires. Relire les moteurs existants (CTA, public daté, participation, planification, publication, reconduction) avant de proposer une implémentation. Aucun deuxième référentiel ou moteur parallèle, refonte ou conversion du stock sans autorisation explicite.

Pour chaque tâche, conserver les neuf champs de la ToDo ; pour chaque jalon, garder source/date, état, dépendances, existant, tests, MOA, critères et prochain résultat dans la même roadmap. Ne pas copier des listes de tâches dans un nouveau fichier indépendant. Mettre à jour la décision et ses preuves au moment du changement ; conserver les sections remplacées avec leur statut historique. Une nouvelle règle MOA doit être capitalisée dans le canon applicable sous son identité réelle, sans ID arbitraire ni simple résumé substitué à la règle détaillée.

Ne jamais déposer de secret, URL avec mot de passe, cookie, jeton, export nominatif, NIP individuel ni snapshot métier privé. Séparer la preuve technique minimale des données de personnes. Les scripts historiques de recette peuvent nécessiter des instantanés privés non livrés ; l’absence d’entrée est une réserve explicite, pas une permission de copier la production.

## Recette ciblée

Préparer une matrice exigence → composant → scénario → environnement/date → preuve → acceptation MOA. Réutiliser les résultats acquis, dont #23 horaires, #26 cas démontrés et #27 CMDT. Les PASS partiels #24/#25 restent partiels. Une condition nouvelle (Safari, veille réelle, profil EM, raccord de communication…) n’est pas validée par analogie.

Exécuter uniquement les tests adaptés au changement autorisé. Pour une PR strictement documentaire : contrôler liens, sources, IDs/statuts, provenance, cohérence des deux vues, présence des réserves, diff et absence de données personnelles/secrets ; ne pas lancer build ou recette applicative. Pour un futur changement métier : préciser cible et isolation, comparer avant/après, contrôler versions, identifiants, Stat.Com/codes et données protégées selon contrat ; rollback vérifié sur le clone si écritures. Aucun GET potentiellement initialisant ne doit être utilisé comme preuve de lecture seule sans méthode adéquate.

Une anomalie bloquante non résolue empêche la validation annuelle ; une dérogation ne vaut que si la règle l’autorise et qu’IDs/OI/dates/motif/acteur/journal la démontrent. Une relation ambiguë ne se résout pas par motif seul. Aucun déplacement automatique, aucune salle réputée disponible sans preuve actuelle, capacité/équipement et disponibilité fonctionnelle distingués.

Le PDF complément QV-PDF-003 nécessite son témoin exact avant constat visuel : six pages96 séances DAP:Y1. État actuel NON OBTENU ; ne pas remplacer par le PDF clone95 séances/huit pages ni modifier les modèles conformes ou le vertical web.

## Livraison et publication

Une seule PR cohérente, titre/description expliquant le problème, le résultat, le périmètre et la validation. Fournir branche, commit, fichiers, contrôles/preuves et limites. Pour cette mission de capitalisation : `[skip netlify]` dans le commit **et** le titre de PR ; vérifier que le déploiement publié reste inchangé et examiner les éventuels checks. [Méthode officielle Netlify](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/). Ne pas changer netlify.toml, variables, intégration ou protections ; pas de build hook ou deploy manuel.

Après un futur GO de fusion/publication explicite : vérifier l’état GitHub, la base et le diff final, puis suivre le périmètre autorisé et le [protocole de déploiement existant](../PROCEDURE_DEPLOIEMENT_GITHUB_NETLIFY.md). Contrôler ensuite le commit **réellement publié**, l’état du site et les seuls parcours affectés. Les commandes des anciennes procédures ne constituent pas une autorisation de les exécuter. Une publication technique ne valide jamais le Programme annuel.

SCOPE-PROD-001 : la saisie doit rester accessible ; consultation, sauvegarde, validation, publications existantes, présences, affectations et historiques préservés. Préparer contrôle avant/après et retour arrière ciblé, avec cible/version et conditions de déclenchement. La [procédure de sauvegarde/restauration existante](../PROCEDURE_SAUVEGARDE_RESTAURATION.md) est une source à lire, pas une autorisation de restauration générale. Les opérations à risque sur les données nécessitent GO MOA ; ne jamais restaurer un snapshot complet en écrasant des saisies récentes.

La validation annuelle et la publication métier sont des décisions distinctes de la livraison de code. Suivre le [plan QV par étape](../audits/20261015/SCOPE_PLAN_FINALISATION_QV_20261015.md) : validation → publication → création/liaison événements → assignations → programmes individuels → communication → modifications. Vérifier les raccords manquants ; pas de notification ou obligation créée depuis la visibilité SDIS/CMDT seule. Les ajouts/modifications/annulations visent les seules personnes concernées, sans renvoi systématique initial.

## Incidents de production

Réutiliser les outils de suivi existants, sans deuxième système de tickets. Un incident est une capacité attendue dégradée ; une évolution ajoute/modifie un besoin. Qualifier impact/périmètre/heure/opération/route/déploiement et preuve minimale, sans détails personnels dans Git. Statuts HTTP401/403/422 peuvent refléter protections ou validation ; leur légitimité doit être démontrée.499 n’est pas automatiquement une panne serveur ; absence de5xx sur une fenêtre n’est pas garantie globale.

| Gravité demandée | Qualification opérationnelle à confirmer | Suite |
|---|---|---|
| CRITIQUE | Indisponibilité générale ou risque grave démontré | Intervention prioritaire autorisée, protéger saisie/données, preuve et retour arrière |
| MAJEURE | Parcours essentiel bloqué, impact important démontré | Correction rapide ciblée et contrôlée |
| MODÉRÉE | Périmètre limité, fonctionnement dégradé avec solution praticable | Planifier selon impact et dépendances |
| MINEURE | Gêne faible sans blocage métier démontré | Suivre dans le backlog existant |

Cette grille propose la qualification d’impact, sans inventer des SLA ni attribuer une gravité aux401 non expliqués. La MOA/exploitation désigne responsable, délai et mandat. Urgence et grand jalon peuvent être traités séparément.

Circuit : **signalement → qualification → priorité → correction → test ciblé → publication autorisée → vérification → clôture**. Clôture avec cause démontrée, référence de correctif/commit, résultat ciblé, contrôle du SHA publié et confirmation de l’effet métier requis ; sinon conserver l’état ouvert ou NON VÉRIFIÉ. Ne pas affaiblir les protections pour réduire artificiellement les erreurs. Le [diagnostic15.10](../audits/20261015/SCOPE_DIAGNOSTIC_NETLIFY_20261015.md) reste un instantané de logs à causalité limitée.

## Capitalisation continue et passage de relais

À chaque jalon : actualiser les mêmes roadmap/ToDo/registres selon diff, lier les preuves et la décision, puis le contexte maître pour ses pointeurs/état de production si nécessaire. Ne pas effacer les réserves ni déclarer achevé sans preuve. Conserver dates de validité, identité des sources et remplacements explicites. Si de nouveaux dossiers d’audit datés sont autorisés ultérieurement, indiquer lequel porte les vues actives ; aucune duplication silencieuse.

La nouvelle conversation doit pouvoir retrouver règle, décision, développement, preuve, état MOA et reste à faire dans Git. Les éléments non obtenus restent nommés : PDF, contrats IndeX/ECAwin/GELORE2, relations fonctionnelles, conditions réelles manquantes. **AUDIT_INCOMPLET** reste le verdict phase A jusqu’à une mission qui apporte les preuves manquantes. Une PR documentaire READY_FOR_MOA ne le remplace pas.

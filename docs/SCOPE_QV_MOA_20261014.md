# SCOPE / QUO VADIS — Correctif MOA du 14.10.2026

## Livraison
Base GitHub vérifiée : `6666e2c19ab9dd79954b9f4337ceec66786ce95b`, PR #17 fusionnée.
Branche unique : `codex/scope-qv-post-recette-moa-20261014`. Travaux locaux étrangers préservés.
Verdict : **READY_FOR_MOA** pour la PR corrective, pas une validation automatique du Programme annuel.
Aucune fusion, aucun déploiement ni écriture de recette en production. Aucune migration nécessaire.

## Corrections
- Salles : même contrôle partagé navigateur/serveur, date réelle tous cycles, battement de 30 minutes,
  lecture des réservations persistées et publications, rapprochement sans doublons techniques.
  Filtre Salle dépendant du Lieu, autres occupations consultables sans ajouter d'occurrence ou export ECAwin.
  Nouvelle lecture sous verrou transactionnel intercycles avant sauvegarde d'un nouveau créneau.
- État-major : priorité explicitement documentée ; Chef formation commun avec Direction JSP,
  activité à repositionner signalée, proposition uniquement. Aucun déplacement ni affectation nominative.
- Calendrier existant : six semaines, position et dimensions stables, couleurs Agenda identiques,
  week-ends éclaircis, sélection directe ; alerte de date distincte, effacée à conformité.
- Annulation : confirmation détaillée, motif obligatoire, une action réelle avec champs conservés.
  Anciennes écritures partielles présentées sans fausses suppressions, journal source inchangé.
  Une sauvegarde ordinaire ne réactive plus une occurrence annulée ; reconduction annuelle préservée.
- Famille DPS/DAP/JSP sélectionnable selon OI qualifiés, sans modifier domaine, Stat.Com, publics ou IndeX.
  Publics/échelons normalisés uniquement à l'affichage, OSR prioritaire, FOBA 1/2/3 conservés.
- PDF : trois formats existants, A4 exact, marge minimale 10 mm, logos/bandeaux/pieds de page à l'intérieur,
  Responsable/Public/Stat.Com/État conservés aussi au mensuel, noms dynamiques demandés.

## Preuves
Dossier : [captures et résultats](captures/qv-moa-20261014/).
- 21 tests ciblés nouveaux, 4 tests de réservation dépendants et 8 tests PDF dépendants réussis.
- [Clone PostgreSQL](captures/qv-moa-20261014/clone-results.json) : 863 préparations métier courantes,
  935 occurrences comparées à main, 100 % des Stat.Com/codes/dates/OI/publics/décisions identiques.
  11 scénarios, dont réservation intercycle, 20:15 refusé / 20:30 accepté, verrou excluant une seconde
  connexion, annulation idempotente, famille F1/DAP et réactivation implicite refusée. Annulation annuelle
  et arrêt futur se préservent dans les deux ordres d'action.
  Rollback vérifié sur 113 tables ; événements, affectations, attendus, présences et qualifications inchangés.
- [Chrome réel](captures/qv-moa-20261014/browser/recipe.json) : 7 parcours, LOCAL, 1440/390 px,
  couleurs comparées à l'Agenda, confirmation déclinable, motif imposé, réouverture et trois téléchargements,
  aucune erreur JavaScript. [Intégrité navigateur](captures/qv-moa-20261014/browser/postgres-integrity.json).
- [PDF](captures/qv-moa-20261014/pdf/manifest.json) : 915 séances, annuel 51 pages, compact 49,
  janvier 6. Géométrie et textes sur les 106 pages, 6 rendus première/dernière page sans aucun pixel
  imprimé hors marge 10 mm ; accents, points médians, publics multiples et libellés longs vérifiés.
- Build `netlify build --context production` réussi, 25 fonctions empaquetées ; diff sans erreur.
  Les mesures API du clone restent sous la limite de réponse, compression existante conservée.
  Le snapshot brut de lecture seule reste local, hors Git ; les données de recette sont annulées.

## Arbitrages Restants
- La source courante expose 121 réservations et 12 conflits auparavant non signalés. Aucun n'a été
  résolu par un déplacement automatique. Direction JSP des 16.02 et 22.06 : proposition de
  repositionnement soumise à la MOA, sans date inventée ; juin reste une proposition non validée.
- La préparation État-major du 16.02 et sa publication encore datée du 24.02 sont distinctes dans les
  sources courantes ; aucune date publiée n'est corrigée dans ce lot. Révision ciblée existante à utiliser.
- Le conflit Chef formation est fonctionnel et démontré par la décision MOA ; aucune intersection
  nominative non démontrée n'est annoncée et aucun NIP n'est déduit des fonctions.
- La suppression logique existante arrête les productions futures et conserve la fiche annuelle.
  L'annulation de l'année courante reste une action distincte, sans élargissement de la suppression.
- Séance du 25.08 : un seul enregistrement, annulé, `070F23` / `070F23.006` intacts. Budget Y1 et
  rapprochement IndeX gelés ; suivi Cours ECA et éditeur de règles conservés dans la roadmap existante.

## Publication
Production vérifiée sur `6666e2c`, déploiement `6acf24d33ab0cb939e642969` ; non remplacée par ce lot.
Pour respecter l'absence de déploiement avant GO, seule la branche corrective possède un garde-fou
de contexte versionné ; aucune configuration distante, Okta, RLS ou variable sensible modifiée.
[Résolution officielle Netlify testée](captures/qv-moa-20261014/delivery-gate.json) : prévisualisations
de cette branche arrêtées, `main` et les autres branches inchangés. Après GO explicite, fusion puis
contrôle du commit réellement publié et recette ciblée. Ne pas déclencher de build hook avant GO.
Références techniques : [contextes Netlify](https://docs.netlify.com/build/configure-builds/file-based-configuration/#deploy-contexts)
et [commande de contrôle préalable](https://docs.netlify.com/build/configure-builds/ignore-builds/#custom-ignore-command).

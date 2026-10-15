# Lot consolidé MOA du 15.10.2026 après PR #24

Base GitHub vérifiée directement : `b3b0cb372fa68aa4a83f8ef8f0856d31d7fbc3a5`.
PR #20 à #24 fusionnées. Branche isolée : `codex/scope-qv-consolide-preparation-20261015`.
Les modifications étrangères et la recette ouverte sur 4410 sont conservées.

## Corrections et causes

- Public : absence de référence Échelon 0 dans le catalogue descriptif ; ajout de `ECH:0` après
  recherche des équivalents (présence textuelle 2026, aucun code référentiel persistant équivalent).
  Ordre 0/I/II/III/IV, zéro distinct de O. Le formateur existant utilisait des sous-plages dans
  une sélection discontinue : désormais « et » pour deux éléments ou toute sélection discontinue,
  « à » uniquement pour une sélection entièrement continue d'au moins trois éléments.
- AUTO : le tri séparait `AUTO:CAND-EA` de `AUTO:5`. Dérogation d'adjacence ajoutée au mécanisme
  existant, sans déplacer les autres couples PL/TP9/VL ni changer les qualifications.
- Responsable : `C scrt` / C sct existe réellement dans PostgreSQL. Le canoniseur historique
  présentait encore DPS/DAP selon le domaine. Une présentation commune Chef section et une seule
  option réutilisent ce code, sans modifier ce canoniseur utilisé par les moteurs/exports.
  Les sélections libres et références historiques complètes restent dans le payload, même en
  cas d'ajout d'un autre responsable ; aucun nouveau code de fonction.
- Préparation : aucun contrôle équivalent du minimum de 14 jours n'était présent dans les
  contrôles de couverture/validation inspectés. Extension du module existant `scope-qv-coverage`,
  partagé navigateur/serveur. Sept couples de définitions canoniques exactes (DAP 1–4, DPS 1–3),
  même OI qualifié/Stat.Com, compatibilité des sections/demi-sections. Un titre ne suffit jamais.
  Cours absent, non daté ou relation ambiguë restent visibles. Aucune date ni cours créé/déplacé.
- Validation : contrôle serveur des occurrences et validation annuelle ; dialogue de dérogation
  existant réutilisé pour une exception explicitement confirmée et motivée, avec acteur/journal.
  L'exception est liée aux identifiants, OI et dates, pas reconduite vers d'autres dates. Une
  dérogation de délai ne vaut pas autorisation d'un jour interdit ; confirmations distinctes.
  Relations ambiguës non résolubles par un motif. Publications historiques jamais invalidées.
- Calendrier : le mois restait celui précédemment navigué lorsque Date était vidée. La route
  de fiche omettait aussi `qvAnnee`, provoquant le retour implicite à 2027 pour une fiche 2028.
  Deux corrections ciblées, sans remplacement du calendrier personnalisé existant.
- Propositions : la date n'était pas incluse dans le snapshot de validation reconductible,
  volontairement limité aux champs métier hors dates. Nouvelle trace `validatedDate` au seul
  enregistrement de validation, sans changer ce snapshot/reconduction. Lecture historique
  conservatrice : humanDecision + validation horodatée dans la même écriture que planningFields.
  Une sauvegarde d'un autre champ préserve cette preuve sans nouvelle validation. Date différente,
  retrait ou révision en attente réactivent le contrôle. PLANIFIE/date seule ne prouvent rien.

La ligne réelle `QV27:DAP-GROUP:1.1` a été lue sans écriture : date 21.04.2027, 19:00–21:30,
validation métier horodatée et même horodatage de planningFields. Cette preuve suffit à retirer
la proposition de date du périmètre actif, pas à inventer une décision sur d'autres champs.
Une validation métier complète masquait déjà le bouton dans main avec une projection fraîche :
ce comportement acquis est conservé. Le nouveau contrôle est champ par champ et explicite ;
il ne prétend pas reproduire l'état exact d'un onglet ancien ou d'une réponse mise en cache.
Proposition historique conservée, bouton masqué si date validée, bilan actif/obsolète séparé.

## Preuves ciblées

`scripts/scope-qv-consolide-preparation-tests.js` :

- Sept exemples et/à, ordre 0/I/II/III/IV, distinction O, candidat EA, routage 2028.
- Délais 28/21/14/13/7/0/après, trois fuseaux dont Europe/Zurich ; absence de cours/date,
  doublon/ambiguïté, autre OI/Stat.Com, sections DPS incompatibles et section couvrant une demi-section.
- Cas MOA reproduit dans des tables temporaires : exercice DAP Y1 10.02, cours 10.03, délai -28,
  alerte critique ; validation refusée sans confirmation/motif puis exception tracée explicitement.
- 943 lignes comparées au service chargé directement depuis le commit main : 100 % Stat.Com,
  codes, dates, OI, publics, responsables, validations et références publiées identiques avant recette.
- Sauvegarde d'un autre champ sur la formation groupée conserve la date validée ; `ECH:0` accepté
  par le serveur. Aucune écriture opérationnelle même pendant ces écritures temporaires.
- Neuf tables du clone identiques après ROLLBACK : préparations, événements, affectations,
  participations, attendus, journal, publications, allocations de codes, personnes.
- 923 lignes d'export : toutes les autres colonnes identiques ; aucune différence des publics
  sur cette projection réelle. Les nouveaux exemples utilisent le même formateur déterministe.
- Transport Netlify acquis conservé : enveloppe Lambda 867 020 octets avant, 887 756 après,
  limite 6 291 556 ; décompression strictement identique au JSON original. Le JSON brut dépasse
  6 Mo : ne pas supprimer la compression existante. Aucun changement du transport dans ce lot.

`scripts/scope-qv-consolide-preparation-browser.js`, Chrome réel / Playwright :

- Deux résolutions, 1440x1100 et 1366x768 ; dix cas calendrier couvrant les cinq exemples MOA.
  Mois suivant puis réouverture, jour sélectionné, champ inchangé, aucune sauvegarde automatique.
- Responsable unique avec anciennes sélections libres/références ; ajout QM sans perte de sélection.
- Échelons, résumé « Échelon 0 et I », ordre candidat EA, sauvegardes interceptées.
- Date validée seule : bouton retiré, confirmations des autres champs conservées ; PLANIFIE seul
  ne masque pas une proposition. Alerte critique puis recalcul immédiat après changement de date.
- Deux sauvegardes interceptées, zéro écriture métier serveur, zéro erreur JavaScript.
  Captures inspectées visuellement dans `docs/captures/qv-consolide-preparation/`.

Build utilisé par Netlify : `node scripts/build-scope-static.js`, réussi. Contrôles syntaxiques
des quatre fichiers JS applicatifs et `git diff --check` réussis. Aucune campagne historique relancée.

Le premier essai de recette a attendu sur le calendrier du clone : son processus seul a été arrêté,
puis toutes les tables de calendrier/propositions ont été isolées en TEMP avec délais SQL bornés.
Le processus serveur MOA et sa transaction n'ont jamais été arrêtés ni rollbackés.

## Réserves et livraison

- **MOA_REQUIRED conservé** : relation individuelle personne–fonction–domaine/OI datée absente,
  aucun effectif de chefs inventé, aucune migration/table nouvelle.
- Sur la projection clone : 27 contrôles classiques conformes, 24 occurrences mixtes à relation
  préparatoire non démontrée. Liste précise par ID/OI dans `targeted-results.json`. Ce ne sont
  ni des dates à déplacer automatiquement ni des décisions de production. Une relation qualifiée
  doit être confirmée pour chaque cas ; le lot déterministe n'est pas interrompu pour ces réserves.
- Une ancienne validation dont la date ne peut pas être prouvée n'est pas transformée en décision
  de date ; contrôle maintenu jusqu'à validation explicite du champ par la MOA.
- Safari/WebKit non testé : runtime absent. Chrome (moteur Chromium du parcours local) vérifié ;
  aucune limitation de sélecteur natif ni substitution supposée, le composant est personnalisé.
- Recette navigateur isolée sur le serveur existant avec assets/projection interceptés : ce
  correctif n'est pas installé dans l'onglet MOA ouvert. Aucune écriture métier en production.
- Une seule branche et une PR, pas de merge ni déploiement. Garde Netlify de branche annule les
  builds automatiques de ce lot ; aucun paramètre de production/authentification modifié.

Verdict **MOA_REQUIRED** pour les relations non démontrées ; correctifs déterministes prêts pour
recette ciblée. Aucune validation du Programme annuel annoncée.

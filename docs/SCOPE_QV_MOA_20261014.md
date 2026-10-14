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
Le bilan initial de `a5cb32d` comptait 121 réservations et 12 paires de conflits. La finalisation
ci-dessous remplace les propositions antérieures non validées, pas les décisions humaines.
- Le conflit Chef formation est fonctionnel et démontré par la décision MOA ; aucune intersection
  nominative non démontrée n'est annoncée et aucun NIP n'est déduit des fonctions.
- La suppression logique existante arrête les productions futures et conserve la fiche annuelle.
  L'annulation de l'année courante reste une action distincte, sans élargissement de la suppression.
- Séance du 25.08 : un seul enregistrement, annulé, `070F23` / `070F23.006` intacts. Budget Y1 et
  rapprochement IndeX gelés ; suivi Cours ECA et éditeur de règles conservés dans la roadmap existante.

## Finalisation Consolidée PR #18

Préflight direct : PR ouverte, `MERGEABLE` / `CLEAN`, branche et référence `a5cb32d` inchangées,
main et production `6666e2c`. Commentaires GitHub relus, y compris le GO limité à la finalisation.
Lecture PostgreSQL **READ ONLY**, le 14.10.2026 à **10:18 UTC** ; aucun appel de génération en production.
Depuis la recette initiale, la MOA a ajouté trois occupations CFF et modifié une occupation existante :
866 préparations, **938 lignes** désormais, dont les **935 identifiants initiaux conservés**.
La comparaison avant/après code est faite sur le même état courant, sans écraser ces modifications.
Le pool courant contient **122 réservations effectives**, publications et préparations incluses.
Aucune réservation d'un autre cycle ne recoupe actuellement la fenêtre ; la lecture intercycles reste active
et sa preuve synthétique acquise n'est pas rejouée. Une occupation sans salle ni exclusivité explicite
ne réserve pas fictivement toute la caserne.

### Décisions Et Publications

- **Rapport annuel : 23.02.2027, 18:45–21:30**, occurrence `qv-source-923`, `071F3.001`.
  Publication `55a8007b-a82f-49c1-a90f-e85c46426b34` également au **23.02**, version 3.
  Début du cycle suivant **24.02.2027** ; clôture **10.02.2028 provisoire / Codir**. Aucune divergence.
- **État-major : 16.02.2027, 18:00–21:00**, préparation `qv-source-921`, obligation
  `1f6552f4-0393-492e-a18e-0f8b884d2813`, lignée `QV27:EMSEA:O02` / `QV27:EMSEA:S02`.
  Un seul lien de publication vers `ecb5b5af-1513-45fa-a103-abf4ad2d8165`, encore au **24.02.2027**,
  version 1, créé et non modifié depuis le **29.09.2026**. C'est l'ancienne publication de la même
  séance, pas une deuxième séance ni un report approuvé. Classe **C**.
  Deux traces `OUVRIR_REVISION_CIBLEE` du 13.10, 17:22:55 et 17:24:05 UTC, attestent la révision
  **PENDING**, date 24.02 → 16.02, public Échelon IV et salle État-major. Le motif ancien
  « Séance planifiée le lendemain du Rapport annuel » est conservé dans l'historique mais ne valide
  pas le 24.02 et ne décrit plus la décision actuelle. La MOA doit confirmer la révision avec un
  motif explicite conforme au maintien du 16.02, après traitement du conflit JSP.
  Publication : Stat.Com **NULL**, code **NULL**, zéro attendu, présence et rôle nominatif sur cet
  événement à la lecture ; le Programme porte `EMSEA`. Ne pas remplir ces NULL automatiquement.
- Direction JSP : `PLANIF-JSP`, mercredi **AUTORISE**, horaire usuel **18:30–20:30**.
  La cadence existante est une séance explicite par mois primant sur sa projection, non un mardi
  obligatoire : sources 2026 les mardi, mercredi, lundi et jeudi, reconduction **N+364** selon
  QV-PROJ-001, exception mensuelle existante. Les dates **17.02** et **23.06** restent dans
  leur mois, sans deuxième séance active ce mois-là, hors vacances/fériés, sans conflit fonctionnel
  démontré aux nouveaux créneaux, salle État-major libre avec battement >=30 minutes.
  Le 17.02, Grutiers 17:30–20:00 occupe Oxygène, pas État-major. Le 23.06, CFF 13:00–17:00 occupe
  Oxygène et FOBA 5 18:30–21:30 reste distinct ; les fonctions source FOBA ne contiennent pas
  C for/C JSP/C site JSP/Resp for JSP. Aucune disponibilité nominative exhaustive n'est déduite.
  Décision MOA confirmée du 14.10.2026 : ces deux dates, **18:30–20:30**, sont **APPROUVÉES**.
  Elles ne sont pas appliquées en production par ce lot. Les événements et identifiants existants
  sont conservés ; les révisions ciblées restent à appliquer selon le workflow existant.

### Tableau Unique De Résolution

Toutes les salles ci-dessous sont les références existantes de **Caserne G1**. « Libre » signifie
contrôlée sur les réservations persistées/publications, tous cycles et battement de 30 minutes,
au relevé précité ; ce n'est ni une réservation ni une confirmation de capacité/équipement.
La disponibilité doit être recontrôlée au moment de la saisie. Les lignes 7/8 partagent la même
action FVSP. Aucun conflit manuel n'est déclaré résolu. Les numéros correspondent au JSON source.

| Paire / date | Activités | Identifiants métier / sources | Horaires en conflit | Salle actuelle | Nature exacte | Salle alternative proposée | Date alternative | Disponibilité vérifiée | Action manuelle dans SCOPE | Correction technique | Classe / décision MOA restante |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 — 11.01.2027 | Intégration DPS / DAP | `070F1.004` / `070F1.011` ; `qv-source-852/861` | DPS 18:00–22:00 / publication DAP 19:00–21:30 | Vulcain / Vulcain | Chevauchement ; préparation DAP déjà au **13.01**, publication restée au 11.01 (C) | Oxygène libre au 11.01 si cette date était retenue ; ne pas y ramener la préparation | **13.01 déjà enregistré**, pas une proposition de déplacement | Oxygène 11.01 libre ; rapprochement des deux états nécessaire | Dossier M1 : réconcilier la publication DAP avec la décision existante du 13.01 via révision motivée ; vérifier aussi publication DPS au 05.01 vs préparation 11.01 | Aucune suppression ni fusion | **ACTION MANUELLE MOA** ; confirmer les révisions, ne pas remplacer une décision par la date ancienne |
| 6 — 13.01.2027 | Cadres F5/6 / Direction JSP | `070F56.003` / `010JSP.021` ; `qv-source-863/864` | 18:00–20:00 / 18:30–20:30 | État-major / État-major | Chevauchement actuel ; choix Vulcain également en conflit avec préparation DAP 19:00–21:30 | **VULCAIN souhaitée par la MOA** ; Oxygène non retenue comme décision | — | Vulcain **non démontrée disponible** ; conflit DAP conservé, aucun nouveau contrôle de réservation dans ce complément | M2 : conserver le conflit signalé ; démontrer la disponibilité de Vulcain avant toute révision de salle JSP | Aucune modification de réservation | **ACTION MANUELLE MOA** ; disponibilité/conflit DAP à résoudre, aucun déplacement automatique |
| 7 — 18.01.2027 | FVSP / AUTO séance source 867 | `CONCOUR.003` / publication `0152F7.001` ; `qv-source-866/867` | 18:00–19:00 / 18:30–20:00 | Vulcain / Vulcain | Chevauchement | **Flashover pour FVSP** | — | Libre 18:00–19:00 ; **Oxygène refusée : CRIMSON 18:00–21:00** | M3 : une seule modification FVSP résout les paires 7 et 8, via révision de la publication | Aucune automatique | **ACTION MANUELLE MOA** ; confirmer adéquation Flashover |
| 8 — 18.01.2027 | FVSP / AUTO séance source 868 | `CONCOUR.003` / publication `0152F7.002` ; `qv-source-866/868` | 18:00–19:00 / 19:00–21:30 | Vulcain / Vulcain | **Battement nul**, même sans chevauchement | **Flashover pour FVSP**, même action M3 | — | Libre, même contrôle que paire 7 | M3, ne pas modifier FVSP deux fois | Aucune automatique | **ACTION MANUELLE MOA** ; le conflit AUTO/AUTO reste distinct |
| 9 — 18.01.2027 | AUTO source 867 / AUTO source 868 | publications `0152F7.001` / `.002` ; `qv-source-867/868` | 18:30–20:00 / 19:00–21:30 | Vulcain / Vulcain | Deux séances distinctes (B), publics source DAP vs DPS/C1-118 ; **Of auto commun** | **Backdraft pour 868**, uniquement solution de salle | Date/horaire ou animation à arbitrer, aucun créneau humain inventé | Backdraft libre 19:00–21:30 ; Oxygène occupée | P1 : arbitrer le chevauchement de l'Of auto puis réviser la séance concernée ; une salle différente seule ne suffit pas | Aucun dédoublonnage ; codes sources conservés, y compris affichage canonique commun `.001` | **PROPOSITION À VALIDER** ; aucune suppression sur intitulé identique |
| 10 — 25.01.2027 | Formateurs cursus MEA / Responsables MAT | `0151F7.001` / `070F4.002` ; `qv-source-877/879` | 17:00–19:00 / 18:30–21:00 | Vulcain / Vulcain | Chevauchement ; pas de fonction commune explicitement démontrée | **Oxygène pour MAT** | — | Libre 18:30–21:00, >=30 min | M4 : réviser uniquement la salle MAT | Aucune automatique | **ACTION MANUELLE MOA** ; confirmer adéquation et participants réels |
| 11 — 01.02.2027 | Formateurs MEA 1 / Cadres PR | `0151F7.002` / `011PR.001` ; `qv-source-896/905` | 17:30–20:00 / préparation PR 18:30–21:00 | Vulcain / Vulcain | Chevauchement ; publication PR encore au **03.02**, préparation au 01.02 (C) | **Oxygène pour PR au 01.02** | — ; ne pas déplacer automatiquement au 03.02 | Libre 18:30–21:00 ; aucune nouvelle date décidée | M5 : préciser le motif de la révision PR en attente, confirmer la salle et vérifier la configuration de formation existante avant validation | Le pending PR mentionne `qualificationCodes` : le garde-fou existant exige la configuration de l'événement ; pas de retrait silencieux de ce changement | **ACTION MANUELLE MOA** ; arbitrage de la révision et configuration PR, pas une résolution acquise |
| 12 — 16.02.2027 | Direction JSP / État-major | `qv-source-918` / `qv-source-921` (`EMSEA`) | 18:30–20:30 / 18:00–21:00 | État-major / État-major | Salle **et Chef formation commun** ; priorité EM | Garder État-major pour JSP **à la date approuvée**, pas le même soir | **17.02.2027, 18:30–20:30 — APPROUVÉ** | Contrôle acquis : mercredi autorisé, hors vacances/fériés ; État-major libre ; recontrôle lors de la saisie | P2 : décision de date acquise ; appliquer la révision JSP par le workflow existant, même événement et identifiant ; garder EM au 16.02 | Correctif `date_fin` acquis et inchangé | **ACTION MANUELLE MOA** ; date approuvée, publication non modifiée par ce complément |
| 3 — 16.03.2027 | Formation cadres DAP / État-major | `0172F7.006`, `QV26-FORMATION-CADRES-DAP-2B042598:O2:S1` / `QV27:EMSEA:SESSION:03` | 19:00–21:30 / 18:00–21:00 | État-major / État-major | Salle ; source 2026 ligne 152 : **Cdt et C for**, responsable C DAP ; priorité EM | **Oxygène pour DAP**, insuffisante seule si ces fonctions restent requises | À arbitrer après confirmation des fonctions ; aucune date inventée | Oxygène libre 19:00–21:30 ; conflit fonctionnel non déclaré résolu | P3 : confirmer les fonctions requises puis repositionner DAP si participation commune maintenue ; préserver EM | Aucun déplacement automatique ni déduction nominative | **PROPOSITION À VALIDER** ; la salle seule ne vaut pas validation |
| 1 — 31.03.2027 | Cours cadres DPS-DAP 1, références DPS / DAP | **`0120F7.001` / `0130F7.001`**, C1 ci-dessous | 19:00–21:30 / 19:00–21:30 | Vulcain / Vulcain | Références métier distinctes (B), pas doublon technique ; **C for commun** ; possible animation conjointe à confirmer | **Oxygène pour référence DAP** si deux animations distinctes confirmées | À arbitrer si C for doit animer séparément | Oxygène libre, mais disponibilité d'un même responsable non démontrée | P4 : confirmer animation commune ou distincte ; ne fusionner/supprimer aucun code ni OI ; ensuite résoudre la réservation manuellement | **Aucune déduplication admissible** sur ces preuves | **PROPOSITION À VALIDER** ; responsabilité commune empêche de conclure par la seule salle |
| 2 — 22.06.2027 | Cours cadres DPS-DAP 2, références DPS / DAP | **`0120F7.002` / `0130F7.002`**, C2 ci-dessous | 19:00–22:00 / 19:00–22:00 | Vulcain / Vulcain | Même distinction (B), **C for commun**, également indisponible durant EM 18:00–21:00 | **Oxygène pour référence DAP**, solution de salle seulement | À arbitrer avec priorité EM ; aucun déplacement présumé | Oxygène libre 19:00–22:00 ; fonctions non libérées par la salle | P5 : confirmer animation et réorganiser participation/dates selon décision MOA ; ne pas retirer une lignée | Aucune fusion automatique | **PROPOSITION À VALIDER** ; source DAP ligne 455 mentionne C DAP/C sct, responsable C for conservé |
| 4 — 09.11.2027 | Groupe travail JSP / Table ouverte Commandant | `010JSP.019`, `QV26-GROUPE-DE-TRAVAIL-JSP-2A45EC4E:O6:S1` / `070F1.001`, T1 ci-dessous | 18:00–21:00 / 17:00–20:00 | Vulcain / Vulcain | Chevauchement ; pas de fonction commune explicitement démontrée | **Oxygène pour groupe JSP** | — | Libre 18:00–21:00, >=30 min | M6 : modifier la salle du groupe JSP, conserver la Table ouverte | Aucune automatique | **ACTION MANUELLE MOA** ; publics effectifs de la Table ouverte à préciser s'ils impliquent JSP |
| F2, hors 12 paires — 22.06.2027 | Direction JSP / État-major | J2 ci-dessous / `QV27:EMSEA:SESSION:06` | 18:30–20:30 / 18:00–21:00 | JSP sans salle ; EM État-major | **Fonctionnel**, Chef formation commun ; pas une treizième paire de salle | **État-major à la date approuvée** | **23.06.2027, 18:30–20:30 — APPROUVÉ** | Contrôle acquis : mercredi autorisé, hors vacances/fériés, salle libre ; recontrôle lors de la saisie | P6 : décision de date acquise ; appliquer au même enregistrement selon le workflow existant, conserver ses identifiants ; ne pas créer une nouvelle séance | Aucune automatique | **ACTION MANUELLE MOA** ; date approuvée, non appliquée en production par ce complément |
| Réconciliation liée — 16 / 24.02.2027 | Même séance État-major, préparation et ancienne publication | `qv-source-921` / `ecb5b5af-1513-45fa-a103-abf4ad2d8165` | 18:00–21:00 aux deux dates | Préparation État-major / publication sans salle | Classe C ; révision déjà PENDING, date ancienne non approuvée | Maintenir la salle et la date de la préparation | **Aucune nouvelle date : conserver 16.02** | Après révision JSP ; simulation sur clone uniquement | M7 : reprendre et confirmer la révision existante avec motif conforme, même événement et version contrôlée | **ANOMALIE TECHNIQUE CORRIGÉE** : compatibilité EM historique NULL et fin de date cohérente ; aucun Stat.Com ajouté | Confirmation humaine toujours requise ; ancienne publication inchangée en production |

Identifiants longs (les IDs sources complets et liens figurent aussi dans la preuve JSON) :
- C1 : `QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-1-8AF88C67:O1:S1` et
  `QV27:PROJ:QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-1-8AF88C67:2027-03-31:1900:Y1-Y2-Y3-Y4`.
- C2 : `QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-2-RECONNAISSANCE-LI-94E8317E:O1:S1` et
  `QV27:PROJ:QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-2-RECONNAISSANCE-LI-94E8317E:2027-06-22:1900:Y1-Y2-Y3-Y4`.
- T1 : `QV27:PROJ:QV26-TABLE-OUVERTE-AVEC-LE-COMMANDANT-23F40B54:2027-11-09:1700:Caserne-G1`.
- J2 : `QV27:PROJ:QV26-SEANCE-DIRECTION-JSP-32B2ACA4:2027-06-22:1830:Caserne-G1`.

### Diagnostic Des Doublons Apparents

**B, références distinctes conservées** : C1 reprend les lignes 2026 **214/215**, C2 les lignes
**454/455**, dates et horaires communs mais Stat.Com **0120F7/0130F7**, OI DPS **C1/B1/B2** vs
DAP **Y1/Y2/Y3/Y4**, quatre obligations distinctes, aucune publication associée. Les lignées et
codes diffèrent : une ressemblance d'intitulé ne prouve pas un doublon. Une animation physique
conjointe reste un arbitrage métier, pas une suppression technique autorisée.

AUTO : sources explicites **867/868**, horaires **18:30–20:00 / 19:00–21:30**, personnel source
**Moniteurs conduite DAP / Moniteurs conduite DPS, C1/118**, deux publications distinctes
`f04f50b5-ed70-44e3-a35f-239cdb22ddb5` / `0b354df4-733a-4852-a83d-09b266f79d41`,
clés de publication et codes `.001/.002` distincts. Les OI actuels DAP et le code canonique commun
restent conservés ; ils ne sont pas réalignés silencieusement sur le libellé historique DPS.
**C** : EM 16/24.02, DAP 13/11.01 et PR 01/03.02 sont les états préparatoire/publié reliés,
pas des créations concurrentes. **A : aucun doublon technique prouvé parmi les 12 paires**.

### Correctif Technique Et Preuves Ciblées

Deux défauts reproduits sur le code `a5cb32d`, puis corrigés dans le moteur de révision existant :
1. L'approbation EM échouait avec `programme_statcom_publie_immutable` (`EMSEA` préparatoire,
   publication NULL). Exception strictement limitée à une publication NULL, source et lien canoniques
   EM concordants, sans modification demandée du Stat.Com. Le Stat.Com publié **reste NULL** ;
   les autres divergences et codes non NULL restent refusés. La référence EMSEA active a été
   vérifiée directement en production, sans inventer d'association ECAwin.
2. Une révision JSP 16 → 17.02 changeait `date` mais laissait `date_fin` au **16.02**.
   La fin d'une publication d'un seul jour suit désormais sa date lors de la révision approuvée,
   sous le même verrou et dans la même transaction. Aucune fin multijour ni fin NULL n'est recalculée.

[Preuve de finalisation](captures/qv-moa-20261014/finalisation-results.json), script
`scripts/scope-qv-pr18-finalisation-proof.js`, **clone existant uniquement, rollback vérifié** :
- Les 12 paires sources sont retrouvées à l'identique, **21 identifiants distincts**, plus le conflit
  fonctionnel JSP/EM de juin hors compte des paires de salle. Douze essais de salle contrôlés,
  dont Oxygène rejetée au 18.01 ; deux dates JSP admissibles, aucun déplacement réel.
- **938 lignes** comparées avant/après, 100 % Stat.Com/codes/dates/OI/publics/thèmes/décisions
  et références de publication identiques avant toute simulation. Les 935 IDs acquis sont présents.
- Parcours serveur réel : JSP ouverture PENDING sans modification publiée, confirmation explicite,
  puis confirmation EM existante sur le même événement ; journal des confirmations vérifié.
  Au clone seulement : JSP 17.02 et EM 16.02, fins cohérentes, versions +1, mêmes IDs/codes/Stat.Com.
  **Six refus ciblés** prouvent que les divergences de code, lien/source EM incorrect et version périmée
  restent bloqués. Publications/liens/attendus/présences/affectations/qualifications/rôles conservés
  après annulation des simulations ; rollback global des **113 tables initiales** vérifié.
- Les migrations existantes du catalogue de participation et d'EMSEA sont rejouées exclusivement
  à l'intérieur de la transaction de recette pour aligner le clone ; **aucune migration nouvelle**.
- Recette Chrome, PDF, réservations intercycles, annulations et contrôle de livraison acquis réutilisés ;
  aucune campagne générale, aucun environnement ni déploiement de recette supplémentaire.
- Build Netlify local du complément, contexte production et site `scope-sdisnv` explicite : réussi,
  25 fonctions empaquetées, 6,2 s. Vérifications syntaxiques et `git diff --check` réussies.

### Bilan Pour Décision

**12 paires de salle / 21 identifiants examinés ; 0 conflit de planning effectivement résolu**,
car aucun changement métier n'est exécuté par Codex. **Deux anomalies techniques de révision corrigées**,
à distinguer de la résolution des réservations. Actualisation documentaire après décision MOA :
**neuf dossiers d'actions manuelles M1–M7 et P2/P6**, dont une seule action FVSP pour deux paires,
et **quatre arbitrages P1/P3/P4/P5**, soit **13 dossiers distincts** au total. Les repères P2/P6 sont
conservés pour la traçabilité, mais leurs dates JSP sont approuvées, non à redécider. M2 vise Vulcain,
dont la disponibilité reste à démontrer face à DAP. Aucun de ces changements n'est exécuté par ce lot.

**0 blocage technique résiduel démontré sur les deux révisions testées.** Réserves métier :
animation AUTO/C for/DAP, capacité des salles, configuration de la révision PR signalée en M5,
clôture Codir et approbations individuelles. La validation globale du Programme ne découle pas de
ce verdict de livraison. **READY_FOR_MOA** pour décision sur la PR #18 et traitement de ce tableau.
Aucun merge, aucune publication ni nouvelle prévisualisation autorisés par ce GO.

### Complément Documentaire Strict — Décisions MOA Du 14.10.2026
Référence directement vérifiée sur GitHub : `e6082ad`, PR #18 ouverte et fusionnable avant ce
complément. Seuls rapport, référentiel métier et roadmap sont actualisés ; code et preuves acquis
inchangés, aucune recette, analyse de disponibilité ou campagne de tests relancée.

**QV-CYCLE-007** documente l'ajout manuel d'une activité SDIS au cycle déjà publié, même avant son
début civil habituel (exemple CRIMSON), après validation finale et publication annuelle. Chaîne
métier conservée : validation annuelle → publication → création/liaison des événements → assignations
→ programmes individuels → communication initiale. Les ajouts sont ensuite identifiés et communiqués
individuellement, ainsi que les modifications/annulations ; pas de régénération ni de renvoi systématique
du programme individuel initial. Les destinataires ajoutent manuellement les dates à leur calendrier.
Documentation du processus attendu uniquement : aucun nouveau moteur de notification ni reclassement
des cycles historiques développé dans cette PR.

**Préparation de la recette MOA ciblée** : réutiliser les **18 scénarios acquis**, soit les 11 scénarios
[clone](captures/qv-moa-20261014/clone-results.json) et les 7 parcours
[Chrome](captures/qv-moa-20261014/browser/recipe.json), sans les réexécuter. La checklist de décision
porte uniquement sur les nouveaux états documentés : JSP février/juin approuvés mais révisions non
appliquées ; M2 Vulcain avec conflit DAP conservé ; processus d'ajout/communication post-publication
inscrit dans la roadmap, non présenté comme nouvelle fonctionnalité livrée. Le gel Y1 / `070F23` /
IndeX étant déjà intégré, il n'est pas modifié. Aucun nouveau test, migration, réglage Okta/Netlify,
écriture en production, fusion ou publication. Le Programme annuel n'est pas déclaré validé.

## Publication
Production vérifiée sur `6666e2c`, déploiement `6acf24d33ab0cb939e642969` ; non remplacée par ce lot.
Pour respecter l'absence de déploiement avant GO, seule la branche corrective possède un garde-fou
de contexte versionné ; aucune configuration distante, Okta, RLS ou variable sensible modifiée.
[Résolution officielle Netlify testée](captures/qv-moa-20261014/delivery-gate.json) : prévisualisations
de cette branche arrêtées, `main` et les autres branches inchangés. Après GO explicite, fusion puis
contrôle du commit réellement publié et recette ciblée. Ne pas déclencher de build hook avant GO.
Références techniques : [contextes Netlify](https://docs.netlify.com/build/configure-builds/file-based-configuration/#deploy-contexts)
et [commande de contrôle préalable](https://docs.netlify.com/build/configure-builds/ignore-builds/#custom-ignore-command).

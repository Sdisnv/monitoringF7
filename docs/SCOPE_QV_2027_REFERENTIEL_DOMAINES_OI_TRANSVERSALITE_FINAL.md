# SCOPE / QUO VADIS 2027 - référentiel domaines / OI / transversalité

État au 05.10.2026. Correctif local **partiel, non accepté MOA**. Aucune écriture
de production, aucun commit, push, PR, merge ou déploiement.

## A. Préflight et source

- Branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD
  `a186bbee530cb40217034b2d27d5d08641703305`, `origin/main`
  `55667a79012e976d54f5c90cc183628f8897cec9`.
- Worktree initial déjà sale : correctifs QV, documents C19 et huit PDF locaux.
  Aucun de ces changements préexistants n'a été restauré ou supprimé.
- Classeur directement relu : `2026 QUO VADIS SDIS Nord vaudois.xlsx`, feuille
  `QUO VADIS '26`, 919 lignes métier, SHA-256
  `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`.
  Quatre feuilles vérifiées, classeur version 1 datée du 29.11.2025.
- La base SCOPE a été interrogée en **SELECT uniquement** pour chercher les deux
  événements soldés. Aucun événement 2026 identifiable NUOVO/Rapport annuel
  n'y apparaît ; l'unique `Rapport annuel` trouvé est planifié le 04.03.2027.

## B. Contrôle des deux soldes

| Cas | Meilleure trace accessible | Stat.Com | Conclusion |
|---|---|---|---|
| Test de sélection NUOVO | Classeur ligne 806, 21.11.2026, `070F1NUOVO.806`, F1/8/SDIS/NUOVO ; pas de trace de solde. La ligne 769 invoquée par la MOA est **Recrutement cantonal**, 05.11.2026, `070F0NUOVO.769`, F0/SDIS/NUOVO. | 806 : `070F1` ; 769 : `070F0` | Les deux libellés désignent des activités différentes. La réponse MOA `070F0` après recherche n'identifie pas le solde du test. **Test inchangé (DPS) ; MOA_REQUIRED**. |
| Rapport annuel | Classeur ligne 923, `071F3.923`, 04.03.2027, F3, public TOUS, responsable Cdt, OI DPS/DAP/JSP ; aucune réalisation soldée 2026 dans le fichier ni dans les événements SCOPE consultés. | Projection 2027 : `071F3` | Le F3 et la cible SDIS-ALL déjà posés par le lot précédent sont **conservés sans nouvelle modification**, mais non confirmés comme classification soldée. **MOA_REQUIRED** avant validation canonique. |

Le classeur est antérieur aux événements de novembre 2026 : ses lignes de
planification ne constituent pas une preuve de solde. Aucun historique soldé
n'a été réécrit. `SDIS` est la portée, pas une déduction de domaine.

## C. Référentiel et application

Nomenclature MOA : **F0 Gouvernance, F1 Personnel, F2 Renseignements,
F3 Prestations, F4 Matériel, F5 Partenaires, F6 SIC, F7 Formation,
F8 Finances**. `F1/8`, `F2/3` et `F5/6` restent des valeurs historiques
distinctes lorsqu'aucune ventilation n'est prouvée. Aucun F2/F5/F8 n'a été
attribué par défaut. Les domaines fonctionnels F sont présentés au niveau du
Programme ; le stockage SQL existant utilise `INSTITUTIONNEL`, avec le code
fonctionnel conservé dans `planningFields.domain`.

L'overlay 2027 garde **808 séances actives** et change le domaine de **127
séances** : F0 36, F1 23, F3 27, F4 20, F6 21. Les lignes ci-dessous sont
les groupes exhaustifs de ces changements ; les nombres sont les séances
2027, et « avant » est la valeur de l'overlay avant ce lot. Les décisions
MOA explicites des sections 4 à 10 priment le regroupement historique 2026.

| Activité (séances) | Avant | Après | Règle / preuve 2026 |
|---|---|---|---|
| Séance État-major (11) | CMDT | F0 | MOA gouvernance ; Séance EM 2026 F0/EMSEA |
| Séance Codir (8) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Séance Codir + repas (2) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Séance COSEC (5) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Assemblée CI (2) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Séance CRDIS (2) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Séance OSR (2) | DPS | F0 | MOA gouvernance ; F0/070F0 |
| Séance interSDIS (1) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Conférence des Commandants (1) | CMDT | F0 | MOA gouvernance ; F0/070F0 |
| Table ouverte avec le Commandant (2) | CMDT | F0 | MOA explicite ; 2026 F1/8/070F1 |
| Séance chefs de section DPS (6) | DPS | F1 | MOA explicite ; 2026 F2/3/070F23 |
| Séance chefs de section DPS C1 (8) | DPS | F1 | Même modèle chefs DPS ; F2/3/070F23 |
| Séance des chefs de section DAP (3) | DAP | F1 | MOA explicite ; 2026 F2/3/070F23 |
| Intégration personnel DPS, phase I (1) | DPS | F1 | Finalité personnel ; 2026 F1/8/070F1 |
| Intégration personnel DPS, phase II (4) | DPS | F1 | Finalité personnel ; 2026 F1/8/070F1 |
| Intégration personnel DAP (1) | DAP | F1 | Finalité personnel ; 2026 F1/8/070F1 |
| Journée des familles (6) | DPS | F3 | MOA prestation interne ; 2026 F1/8 |
| Noël des familles (3) | DPS | F3 | MOA prestation interne ; 2026 F1/8 |
| Repas du Permanent (1) | DPS | F3 | MOA prestation interne ; 2026 F1/8 |
| Souper annuel (2) | DPS | F3 | MOA prestation interne ; 2026 F1/8/070F1 |
| Fête Eau Lac (2) | DPS | F3 | MOA prestation externe ; 2026 F5/6/073F56 |
| Tir inter-unités (1) | DPS | F3 | MOA prestation externe ; 2026 F5/6/073F56 |
| Passeport-Vacances (1) | DPS | F3 | MOA prestation externe ; 2026 F2/3/070F56 |
| Préparation concours de la FVSP (8) | DPS | F3 | MOA explicite ; 2026 F2/3/CONCOUR |
| Séance de préparation concours de la FVSP (1) | DPS | F3 | MOA explicite ; 2026 F2/3/CONCOUR |
| Séance de préparation Téléthon (1) | DPS | F3 | MOA explicite ; 2026 F2/3/070F23 |
| Téléthon (1) | DPS | F3 | MOA explicite ; 2026 F2/3 |
| Nettoyage annuel caserne (4) | DPS | F4 | MOA matériel ; 2026 F4/040G1-C1-B1-B2 |
| Préparation Xmas (4) | DPS | F4 | MOA matériel ; 2026 F4/040G1-C1-B1-B2 |
| Séance Préposés mat DPS (4) | DPS | F4 | MOA matériel ; 2026 F4/070F4 |
| Vision locale DPS (3) | DPS | F4 | MOA matériel ; 2026 F4/070F4 |
| Vision locale DAP (4) | DAP | F4 | MOA matériel ; 2026 F4/070F4 |
| Équipement personnel DPS + photo individuelle (1) | FOBA | F4 | MOA explicite ; 2026 F4/070F4 ; événement unique |
| Séance communication F5/6 (9) | F5/6 | F6 | MOA SIC ; 2026 sous-domaine SIC/070F56 |
| Séance audiovisuel et communication F5/6 (1) | F5/6 | F6 | MOA SIC ; 2026 SIC/070F56 |
| Séance cadres F5/6 (3) | F5/6 | F6 | MOA SIC conditionnée ; les lignes 2026 portent SIC/070F56 |
| Séance photo du personnel DPS (1) | DPS | F6 | MOA photographie ; 2026 SIC/AV/070F56 |
| Séance photo du personnel DAP (1) | DAP | F6 | MOA photographie ; 2026 SIC/AV/070F56 |
| Séance photo personnel DPS B1/B2/C1 (3) | DPS | F6 | MOA photographie ; 2026 SIC/AV/070F56 |
| Séance photo personnel DAP / DAP Y1 (3) | DAP | F6 | MOA photographie ; 2026 SIC/AV/070F56 |

`Séance responsables MAT SDIS` était déjà F4 dans le lot précédent et le reste.
`Séance d'information JSP '26` reste JSP / `010JSP` ; les 19 corrections et
les six nettoyages OI antérieurs sont préservés. `Concours de la FVSP` et
`Visite du Conseil d'État` sont marqués non reconduits en 2027 : la règle
canonique F3/F0 existe par titre, mais aucune séance active n'a été ajoutée.
Les Stat.Com, dates, OI, publics, identifiants et décisions humaines ne sont
pas modifiés par les 127 reclassements. La distinction prestation interne /
externe est documentée par la décision MOA ; le modèle actuel n'a pas de
champ dédié validé pour la persister sans créer une nouvelle catégorie.

## D. MOA_REQUIRED après application

**11 modèles / 22 séances 2027** restent sans classification canonique
démontrée ou sans preuve soldée suffisante. Ce total est l'inventaire des
modèles identifiés dans ce lot, pas une prétention à épuiser tout le catalogue.

| Activité (séances) | Code / Stat.Com, source 2026 | Domaine actuel | Raison exacte |
|---|---|---|---|
| Test de sélection NUOVO (1) | `070F1NUOVO.806` / `070F1`, F1/8 ; recrutement ligne 769 `070F0` | DPS | Le `070F0` communiqué concerne le recrutement, pas une trace de solde du test. |
| Rapport annuel (1) | `071F3.923` / `071F3`, ligne datée 2027 | F3 provisoire préexistant | Absence de Stat.Com soldé 2026 correspondant. |
| Cérémonie de promotion et nomination (1) | ligne 851 / `070F1`, F1/8 | DPS | Finalité gouvernance, personnel ou prestation non arbitrée. |
| Journée des nouveaux habitants (1) | ligne 612 / `070F1`, F1/8 | DPS | Finalité exacte non arbitrée par les prestations externes citées. |
| Répétition garde drapeau RA'25 (1) | ligne 859 / `071F3`, F2/3 | DPS | Préparation interne : aucune décision F2/F3 spécifique. |
| Recrutement cantonal (8) | lignes 769-776 / `070F0`, F0/SDIS/NUOVO | DPS | Ancien F0 ne suffit pas : le prompt interdit sa conversion globale pour le recrutement. |
| Séance Fourriers DPS (1) et DAP (1) | lignes 878/880 / `070F8`, F1/8 | F1/8 | Décision antérieure de conserver F1/8 ; aucune ventilation F8 de cette activité n'est explicitement confirmée. |
| Séance échelons II, III et IV (2) | lignes 557/865 / `070F1`, F1/8 | F1/8 | Publics II-IV prouvés, finalité F1 non formellement tranchée. |
| Séance personnel DPS (4) et DAP (1) | `070F1`, F1/8 | DPS / DAP | La règle d'intégration du personnel ne vaut pas preuve de classement de toute séance personnel. |

Une décision MOA peut regrouper Fourriers DPS/DAP, séances personnel DPS/DAP,
et séparément les activités NUOVO, mais ne doit pas être déduite des seuls OI
ou des préfixes Stat.Com. F2/F5/F8 n'ont aucune séance canonisée par ce lot.

## E. Tests et recette

- `node scripts/scope-qv-programme-domaines-canoniques-final-tests.js` : **9/9 PASS**.
  Contrôles 2027 puis reconductions validées 2028 et 2029 : F0/F3/F4/F6.
- `node scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js` :
  **13/13 PASS** ; OI DPS:G1 + DAP:Y1 pour F6, huit OI pour F4, filtres
  indépendants du domaine, libellés Stat.Com/lieux/période.
- Les **17 suites `scripts/scope-qv-*-tests.js`** : toutes exit 0 après
  adaptation des assertions FOCO/F6 devenues obsolètes.
- `npm run check` : PASS. `git diff --check` : PASS.
- `npm run test:scope` : échec hors lot sur l'assertion historique
  `scope-login-visual-alignment-orion-1-tests.js:138` (version/cache CSS de
  login). Les suites suivantes ne sont pas exécutées par ce script après cet
  arrêt ; le login et son test n'ont pas été modifiés.
- Instance locale fraîche `http://127.0.0.1:4394/scope.html#/quo-vadis/programme` :
  `/auth/me` 200 avec utilisateur recette, `/scope.html` 200 sans redirection,
  API Programme 2027 `ok:true`, **808 actives / 796 datées / 12 à définir**,
  127 changements. L'Agenda annuel partage le même shell local ; **aucune
  interaction visuelle navigateur n'a pu être effectuée** (`browsers.list()=[]`).
  **MOA_REQUIRED : recette visuelle Thierry** (Programme, filtres, fiche,
  Agenda annuel desktop/mobile).

## F. État Git et sortie

HEAD inchangé sur la branche ci-dessus. Fichiers modifiés dans ce lot :
`assets/css/scope.css`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`,
`netlify/lib/_scope-quo-vadis-service.js`, quatre scripts de tests antérieurs
adaptés (`scope-qv-2027-moa-recette-correctif-1-tests.js`,
`scope-qv-2027-post-recette-a-j-tests.js`,
`scope-qv-business-consolidation-tests.js`,
`scope-qv-programme-domain-oi-transversality-correctif-1-tests.js`),
le nouveau `scope-qv-programme-domaines-canoniques-final-tests.js` et ce rapport.
Les autres fichiers sales du worktree étaient préexistants et sont conservés.

**Statut final : partiel / MOA_REQUIRED**, pas de validation canonique de
NUOVO ou Rapport annuel, pas de recette visuelle. STOP pour recette MOA.

COMMIT : AUCUN
PUSH : AUCUN
PR : AUCUNE
MERGE : AUCUN
DÉPLOIEMENT : AUCUN
PRODUCTION : INCHANGÉE

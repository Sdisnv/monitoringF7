# Contrat backend des cycles annuels

Base fixe : `6f0eb8b2f6aaad6d7a6ab7946304e3b9d3c76ba3`.

Le service expose `getProgrammeCycle(year)` et `setProgrammeCycle(year, body)`.
Le parent raccorde GET/PUT au chemin `/quo-vadis/programmes/:annee/cycle`.
`listProgramme(year).programmeCycle` retourne le meme contrat :

```json
{
  "year": 2027,
  "startDate": "2027-02-24",
  "endDate": null,
  "status": "MOA_REQUIRED",
  "parametersDefined": true,
  "generationAllowed": false,
  "openingReport": {
    "sourceType": "PROGRAMME_ITEM",
    "itemId": "qv-source-923",
    "programmeYear": 2027,
    "closesCycleYear": 2026,
    "actualDate": "2027-02-23"
  },
  "closingReport": null,
  "missing": ["CLOSING_REPORT"],
  "statisticsBasis": "CIVIL_EVENT_DATE"
}
```

Les dates de cet exemple proviennent de la source canonique ; une decision de fiche
existante prime. Le rapport stocke dans le Programme 2027 clot le cycle 2026.
Aucune date, aucun identifiant et aucune decision de cette occurrence ne sont deplaces.
La periode technique `periode_debut / periode_fin` n'est pas une preuve de cloture.

`reportOptions` liste les rapports dates connus avec `itemId`, `sourceType`, `actualDate`,
`label`, `programmeYear` et `closesCycleYear`, pour choisir une reference si plusieurs
rapports rendent une borne ambigue. Le PUT accepte
`{startDate, endDate, parametersDefined, openingReport, closingReport}`.
Les references portent `itemId` et, si disponible, `sourceType`. `startDate` doit suivre
le rapport precedent. `endDate` est facultative : aucune date de cloture n'est deduite.
Une `endDate` saisie explicitement par la MOA est conservee comme une annonce
"Rapport annuel" dans le mecanisme existant des dates annoncees, avec
`metadata.annualReport.closesCycleYear`. Un rapport deja connu a cette date est reutilise.
Une reference de rapport fournie doit exister et cloturer le cycle demande ; ses dates
reelles priment. `parametersDefined: true` confirme les parametres annuels existants,
sans nouveau catalogue ni assistant. Le resultat du PUT est `{updated:true, programmeCycle}`.
Le defaut 2027 est vrai uniquement en l'absence d'une valeur stockee : un choix explicite
`false` prime et suspend les nouvelles generations, tout en conservant les decisions existantes.

Une occurrence manuelle A+1 est admissible uniquement si les bornes demontrent son
appartenance. Sans cloture, la creation datee A+1 retourne l'erreur explicite
`programme_cycle_cloture_inconnue`. Le Programme 2027 acquis reste accessible.
La generation d'un cycle futur attend les bornes et les parametres confirmes.

La creation manuelle garde les valeurs modifiables envoyees par l'utilisateur.
`programmeTypeId` est verifie dans `qvProgrammeActivityTypes(quoVadis)` ; le backend
conserve le `definitionId` du type dans `metadata.manualSource` et sa provenance
dans `metadata.typeSource`. Une correspondance exacte de definition, date, horaires,
Stat.Com et OI retourne sans creer ni modifier d'occurrence :

```json
{
  "created": false,
  "updated": false,
  "reason": "PROGRAMME_OCCURRENCE_EXISTS",
  "existingItemId": "identifiant-existant",
  "existingCycleYear": 2027,
  "quoVadis": {}
}
```

Le parent retourne HTTP 200 / `ok:true` pour cette proposition et conserve la saisie.
Les statistiques continuent de prendre la date civile de l'evenement.
La date du 02.02.2028 est reservee aux fixtures artificielles de recette rollback ;
elle n'est ni un defaut applicatif ni une date metier demontree.

## Extension automatique et arbitrages restants

Les moteurs CTA, QV-PROJ-001 et la classification annuelle du moteur historique
existants sont reutilises. La source versionnee
`scope-qv-history-2026.json` contient deja la ligne 893 datee du 29.01.2027 :
sa projection annuelle demontre la proposition Codir du 28.01.2028, 08:00-09:30.
Cette ligne est une date civile A+1 explicite du classeur du cycle de reference 2026 ;
elle n'est pas presentee comme une realisation de janvier 2026. Le profil Codir porte
deja `QV-PROJ-001` dans la generation canonique. La projection annuelle existante
est reappliquee par cycle, avec annee civile et rattachement metier separes :
le cycle 2028 teste propose aussi janvier 2029.
Le backend propose cette occurrence avant toute creation manuelle exacte. La fiche
existante permet de la modifier et de la valider, avec allocation d'un nouveau code
metier et conservation de son type. Une decision humaine deja posee prime.
La rotation CTA conserve son ancrage et ses identifiants ; aucun redemarrage annuel.

Le calendrier et la periode technique sont etendus aux bornes explicitement configurees.
Les dates des nouveaux creneaux generes restent dans ces bornes. Les occurrences
existantes, y compris avant le rapport d'ouverture, restent conservees et signalees
par `cycleClassification`; les 867 lignes de reference ne sont pas reclassees par deplacement.

La cloture seule ne demontre pas une cadence supplementaire pour toutes les familles.
Seules les realisations explicites du prolongement historique sont projetees, sans
inventer de frequence mensuelle. Le profil catalogue explicite prime ; en son absence,
la regle canonique ou la classification annuelle du moteur historique existant reste
utilisable. Un profil non recurrent ou non reconduit est exclu. Une date annuelle ou
un arbitrage obligatoire reste signale par definition et par ligne source.
Les instructions saisonnieres, les conduites derivees et les cursus gardent leurs
moteurs specifiques : cette extension ne leur ajoute pas de quota de janvier.

`programmeCycle.automaticExtension` expose `historicalExplicitNextYear` et les seuls
`missingCadence` affectant reellement la fenetre A+1. Les motifs possibles sont
`RECURRENCE_NOT_QUALIFIED` et `ANNUAL_DATE_OR_ARBITRATION_REQUIRED`. Une famille
prevue en mars n'est pas declaree manquante en janvier. Le statut est `DEMONSTRATED`
si tous les candidats concernes ont une regle existante, sinon `PARTIAL_MOA_REQUIRED`.
Dans les fixtures testees : 47 propositions historiques pour le cycle 2027,
51 pour le cycle 2028, et aucune qualification manquante dans ces fenetres.
En production, la cloture du cycle 2027 reste a definir ; aucune date 2028 n'est inventee.

## Preuve ciblee

`scripts/scope-qv-roadmap-v1-cycle-clone-tests.js` compare les 867 lignes a une
baseline complete chargee depuis le commit fixe, dependances et JSON compris.
La preuve verifie le type reconduit avec un intitule humain different, le doublon
dans le cycle suivant, l'edition de la proposition automatique et les themes de
l'Agenda. Les 105 tables protegees restent identiques pendant la recette, puis
les 113 tables du clone apres `ROLLBACK`. Aucun evenement operationnel n'est cree.
Les moteurs de statistiques civiles sont conserves ; la preuve native est prise
en charge par le parent. Aucun commit ni push dans ce sous-lot.

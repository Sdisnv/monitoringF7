# QUO VADIS MOA CONSOLIDATION 2

Base: `902aadee974583cdcf8231fe7cb0afd9768265c4`.

## Cause et population active

L'historique etait consolide, mais les definitions actives etaient traitees
comme des exigences annuelles, puis un catalogue DPS statique etait ajoute.
La cle de deduplication dependait du libelle et les anciennes obligations
avec une proposition selectionnee survivaient au recalcul.

Le recalcul repart des activites de `interpretHistoricalProgramme()`.
Il reconcilie les sources par domaine, cibles, libelle metier normalise,
cohorte et identite historique. Les identites historiques distinctes ne
sont pas fusionnees, meme si deux exercices partagent le meme libelle.
Les numeros de seance ne creent jamais une obligation supplementaire.

`include_in_programme = false` archive les obligations obsoletes. Les
propositions archivees restent stockees. La population active unique
alimente synthese, activites, ventilation annuelle, agenda et arbitrages.

## Exigences supplementaires

Une definition disponible n'est pas une exigence du programme. Le moteur
lit `programmeRequirement` dans les metadata existantes des definitions
et versions: `required: true`, `justification` non vide, dates optionnelles
`validFrom` / `validTo`, et `cibleCodes` optionnels. Les metadata de version
priment sur celles de definition.

Les complements DPS proviennent de `metadata.programmeActivities` des
versions d'organisation datees. Chaque entree porte `code`, `label`,
`instructionKind`, `month` et le meme `programmeRequirement`. Aucun
catalogue supplementaire n'est impose par le code ou une migration.
Un cursus selectionne et une date annoncee sont des exigences explicites.

Le rapport retourne les obligations, leurs justifications, les sources
dedupliquees, les exclusions sans exigence, les identifiants archives et
les decisions humaines preservees.

## Conservation et atomicite

Les arbitrages humains, saisies manuelles et liens operationnels sont
proteges. En cas de doublon humain, les propositions gardent identifiant,
dates, statut et raisons et sont rattachees a l'activite canonique.
Une decision humaine sans equivalent reste active avec une justification.
Les dates annoncees sont conservees et leur lien est reconcilie.

Les dates retenues automatiquement, identifiees par `autoPositioned`,
restent stockees; `generatedObsolete` les retire de l'agenda actif.
Le recalcul reactive les seances courantes en conservant leurs identifiants.
Il ne remplace pas les dates retenues par un humain.

La generation utilise une transaction PostgreSQL et un verrou par annee.
Un echec annule la reconciliation entiere. Aucun acces production n'est
necessaire aux tests: le test cible execute le service reel avec une base
en memoire stricte qui refuse les ecritures operationnelles et le SQL inconnu.

Commande: `npm run test:scope-quo-vadis-moa-consolidation-2`.
Les ventilations chiffrees du test sont des fixtures, pas un etat mesure
en production. Aucun deploiement ni migration production accompagne ce lot.

# SCOPE / QUO VADIS — Préparation et OI SDIS transversal

## Référence et périmètre

Main vérifié directement : `92cce517f79a89e3040d234314b8de52613af05a`, PR #25 fusionnée.
Site scope-sdisnv : publication `6ad09d1180cbb7bcbfd3906a`, même commit,
15.10.2026 à 09:30:29 UTC lors du préflight en lecture seule.
Branche unique : `codex/scope-qv-preparation-sdis-20261015`.
Aucune migration, fusion, publication ni écriture métier en production.
La garde Netlify de cette branche uniquement demande l'annulation des builds automatiques.

Les preuves acquises PR #25 sont conservées ; aucune campagne historique relancée.
Les modifications étrangères du checkout principal et la recette MOA existante sont préservées.

## Causes vérifiées et corrections

- Le filtre Programme comparait uniquement les OI enregistrés. SDIS n'était donc pas inclus
  dans un filtre qualifié. Le prédicat existant étend désormais sa visibilité aux onze OI,
  sans modifier l'organisateur ni élargir les populations individuelles.
- Agenda annuel : aucun sélecteur OI n'existait, et ses mini-calendriers comme son export
  complet ignoraient ce périmètre. Réutilisation des options Programme et du même prédicat,
  avec conservation du contexte vers le mois, des filtres Programme combinés et des exports globaux.
  La route mensuelle active utilise déjà le Programme canonique : aucun changement du vieux
  calendrier non routé fondé sur le lieu. L'historique 2026 et les règles CTA restent inchangés.
- Le moteur préparatoire ne couvrait que les couples classiques et les ambiguïtés mixtes.
  Ajout des deux seules relations groupées démontrées, dans le même moteur, un contrôle pour
  toutes leurs séances, propagé aux fiches/attention/validation/reconduction existantes.
- DAP Y1 : dates réelles confirmées en lecture seule, 10.02 / 10.03, délai -28 jours.
  **L'absence d'alerte sur la fiche cours n'est pas reproduite sur une projection fraîche de main** :
  le serveur y attache déjà la relation aux deux fiches (`baselineBidirectional: true`).
  Aucune cause de cache/session/version n'est affirmée sans preuve. Ce lot rend le message
  du cours explicite, expose la même clé sur les deux fiches et sécurise l'aperçu non enregistré.

## Relations groupées démontrées

| Groupe | Cours / première séance 2027 | Délai | Résultat | Preuve |
| --- | --- | ---: | --- | --- |
| DAP 1 | 23.03 / 21.04, puis 28.04 | 29 jours | CONFORME | Identifiants 1.1/1.2 et cours manuel/lignée, quatre DAP, Stat.Com 0130F7 ; inventaire réel en lecture seule à 09:42 UTC |
| DPS 1 | 15.03 / 12.05, six séances | 58 jours | CONFORME | QUO VADIS 2026 versionné, lignes 145, 309, 347, 350, 389, 421, 433 ; mêmes DPS et OFSI/ABC ; identifiants canoniques et six lignées |

Les dates DPS ci-dessus décrivent la projection de recette, pas une nouvelle validation MOA.
Les trois dates DAP et leurs validations humaines sont strictement conservées.
Les définitions et identifiants exacts sont consignés dans le complément canonique.
Une nouvelle identité inconnue reste MOA_REQUIRED ; aucun rapprochement sur titre seul.

## Tests ciblés et preuves

Preuves : `docs/captures/qv-preparation-sdis/`.

| Contrôles MOA | Résultat démontré |
| --- | --- |
| A-D | -28 jours ; même contrôle/clés sur exercice et cours ; message cours adapté ; captures aux deux résolutions |
| E-F | DAP Y2 : 36 jours ; DPS C1/B1/B2 classiques : 21, 29 et 35 jours, CONFORME ; détails par ID dans targeted-results.json |
| G-H | DAP 29 jours / deux séances ; DPS 58 jours / six séances ; un seul contrôle par relation |
| I-J | Cours seul sans relation inventée ; nouvelle identité groupée et cours multiples : MOA_REQUIRED |
| K-L | Recalcul immédiat avec mention non enregistrée ; seuils groupés 14/13/-1 ; seconde séance bloquée par la même relation ; exception explicite avec motif, acteur, date et journal ; ancienne exception inapplicable après changement de date |
| M-P | Onze OI + SDIS contrôlés, union exacte sans doublon ; asymétrie SDIS ; G1 DPS/JSP distincts ; filtres combinés conservés |
| Q-S | Calendrier annuel filtré et navigation mensuelle Y1/G1/JSP C1 : événement SDIS visible et unique, OI conservé |
| T-U | PDF et CSV compatible Excel Y1 identiques au modèle de sélection ; contrôles étendus G1/JSP C1 ; téléchargement réel CSV et requête PDF navigateur comparés |
| V-X | Identifiants uniques dans chaque sélection ; organisateur inchangé ; moteurs datés existants testés avec personnes du clone et entrées répétées, résultat individuel unique ; aucune assignation créée |
| Y-AC | 944 lignes avant/après : Stat.Com, codes, dates/horaires, OI, publics, responsables, thèmes, décisions et publications identiques ; onze tables publiques identiques après rollback ; exports globaux identiques ; build réussi |

Commandes dédiées uniquement :

```sh
node scripts/scope-qv-preparation-sdis-tests.js
env SCOPE_PLAYWRIGHT_MODULE=/chemin/existant/playwright node scripts/scope-qv-preparation-sdis-browser.js
node scripts/scope-qv-preparation-sdis-exports.js
node scripts/build-scope-static.js
git diff --check
```

Le test clone réutilise les instantanés privés existants, complétés par l'inventaire préparatoire
réel lu le 15.10.2026 ; chemins documentés dans le script. Ces instantanés contenant des métadonnées
brutes ne sont pas versionnés. Les seules modifications de recette ont lieu dans des tables TEMP,
avec savepoints et rollback final sur `scope_qv_2027_recipe_20261006` @ 127.0.0.1:5432.
Les empreintes avant/après des onze tables publiques figurent dans targeted-results.json.
Le volume est représentatif et non une copie exhaustive actualisée de la production :
944 lignes de projection, dont 924 actives. Enveloppe API compactée : 891428 octets, sous la limite.

Navigateur Chrome/Playwright : sessions isolées sur le serveur existant, assets et projection
de ce lot interceptés, requêtes métier non GET bloquées ; aucun changement de la session MOA
ouverte ni de sa transaction. Résolutions 1440x1100 et 1366x768, zéro erreur JavaScript.
Ce lot n'est pas installé dans l'onglet de recette déjà ouvert. Safari/WebKit non testé : runtime absent.

PDF/Excel : modèles et renderer inchangés ; CSV UTF-8 BOM avec séparateur point-virgule existant,
pas de nouveau format XLSX. Y1 121 lignes / 10 pages, G1 409 / 25, JSP C1 106 / 10.
Chaque sélection inclut 44 lignes SDIS, avec identifiants uniques. Données identiques en entrée
PDF/CSV, colonnes et géométrie A4 paysage vérifiées sur toutes les pages ; premières pages
rendues et inspectées. Captures et empreintes dans exports/results.json. Export global inchangé.

## Réserves et décision

- **READY_FOR_MOA** pour les corrections et relations démontrées de ce lot.
- **MOA_REQUIRED** conservé pour les 24 relations mixtes DPS-DAP non démontrées, listées par
  identifiant/OI dans targeted-results.json. Pas de cours inventé ni date déplacée.
- **MOA_REQUIRED** conservé pour la relation individuelle personne-fonction-domaine/OI datée
  non démontrée. SDIS transversal est une visibilité, jamais une obligation générale.
- Le cas d'alerte absente observé dans une ancienne session n'a pas été reproduit sur main frais ;
  la preuve porte sur les fiches avec les assets de ce lot et les données réelles scoped.
- Aucun Programme annuel déclaré validé. Fusion et publication restent soumises à GO MOA.

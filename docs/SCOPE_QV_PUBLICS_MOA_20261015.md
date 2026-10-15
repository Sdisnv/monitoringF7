# Public cible : correctif MOA du 15.10.2026

Base directement contrôlée sur GitHub : main `435bed709dc61c6534d1e58ce2978c6f7bbceac2`,
PR #23 fusionnée. Branche unique `codex/scope-qv-publics-moa-20261015`.
Travaux locaux étrangers préservés dans leurs répertoires ; nouveau worktree isolé.

## Causes démontrées

- Le cas réellement enregistré `QV26-VISION-LOCALE-DAP-F8783089:O3:S1` contient
  `publicFreeLabels=["Chef section DAP","Resp matériel "]` : espace final après matériel.
  L'alias exact ajouté par #22 ne reconnaissait pas cette valeur. Aucun défaut supposé de
  migration ni conversion de données : comparaison de présentation désormais tolérante aux
  espaces de bord des alias confirmés, valeur originale conservée.
- Le JavaScript servi par la recette ouverte sur 4410 reste celui de PR #19 : absence de
  `qvProgrammePublicReferenceCode` et de Resp matériel dans le fichier réellement téléchargé.
  Cette recette n'est donc pas une preuve de publication de #22/#23. Elle n'a pas été redémarrée
  ni remplacée, afin de préserver sa transaction ouverte et les saisies MOA.
- Le tri alphabétique séparait PL/TP9 de leurs candidats. Les anciennes dérogations ne
  couvraient que VL. Chef section DAP était une référence descriptive distincte ; les libellés
  Chef et les minuscules conducteur provenaient du catalogue historique.

## Corrections et références

Couche de présentation dérivée du catalogue existant, partagée entre fiche et filtre.
Catalogue technique historique et classification descriptive inchangés pour les moteurs/exports.

| Codes existants | Affichage / alias reconnu |
| --- | --- |
| `ENC:C-SECTION` | Chef section, unique dans Encadrement |
| `CMDT:CHEF-SECTION-DAP` | Sélection historique de Chef section, code original retenu |
| Chef section DAP / Chef section DPS / C section | Anciennes valeurs libres reconnues, conservées brutes |
| `ENC:RESP-MATERIEL` | Resp matériel, Encadrement ; alias libre avec ou sans espaces de bord |
| `ENC:PREPOSE-MATERIEL` | Préposé matériel, Encadrement ; code réutilisé |
| `AUTO:1`, `AUTO:CAND-PL` | Cond PL puis Candidat cond PL |
| `AUTO:2`, `AUTO:CAND-TP9` | Cond TP9 puis Candidat cond TP9 |
| `AUTO:3`, `AUTO:CAND-VL` | Cond VL puis Candidat cond VL |
| `CMDT:C-FOR`, `CMDT:C-LOG`, `CMDT:C-OP` | Chef formation, Chef logistique, Chef opérationnel |
| `C DAP`, `PR:C-PR` | Chef DAP, Chef PR |
| `PR:FORMATEURS`, `AUTO:MONITEURS`, `AUTO:FORM-C1` | Alias déjà acquis conservés |

Aucun nouveau code, aucune nouvelle fonction individuelle. Aucune conversion persistante.
Libellés inconnus et variantes non confirmées restent libres. C groupe/Candidat C groupe
ne sont pas développés par simple reconnaissance du préfixe C. La reconnaissance visuelle
des fonctions ne crée ni population ni obligation. Lors d'une sauvegarde non liée aux publics,
les mêmes valeurs brutes sont conservées ; l'ordre d'une multisélection reste non significatif,
comme dans le workflow existant.

Fichiers applicatifs : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`.
Autres fichiers : complément canonique QV-PUBLIC-008, présent rapport, script ciblé et preuves
dans `docs/captures/qv-publics-moa/`. `netlify.toml` ajoute seulement l'annulation automatique
des builds de cette branche corrective : aucune publication autorisée.

## Extractions : réserve précise

Inventaire production en transaction READ ONLY, terminée par ROLLBACK : 72 rattachements OI
DAP datés, 161 DPS datés pour 158 personnes distinctes, trois personnes ayant des rattachements
dans les deux domaines, aucun doublon de NIP. Ce ne sont PAS des effectifs de chefs.

`scope_affectations` fournit personne, domaine, cible, dates ; `role_domaine` est PRINCIPAL ou
SECONDAIRE, pas une fonction Chef section. `scope_responsable_fonctions` définit des références
de responsabilité d'activités, sans les relier aux personnes. `scope_event_person_roles` est
limité à un événement. Aucune colonne persistante `function_code`/`fonction_code` n'est présente
dans le schéma public inventorié. Le public DPS existant reste `PENDING_INDEX_SYNC`.

Le moteur existant gère dates, domaine/OI et déduplication par personne ; vérifié avec les
affectations réelles du clone, sans fabriquer de personne ni d'affectation. En revanche son
adaptateur n'alimente pas `functions`, et sa liste de fonctions est limitée aux deux codes
historiques DPS. Il renvoie bien INCOMPLETE/MISSING_INPUT_FUNCTIONS plutôt qu'un total fictif.

Manque à résoudre hors de ce lot d'affichage : relation autorisée et datée entre personne/NIP,
fonction commune et contexte domaine/OI, puis alimentation du moteur existant. Il faut notamment
éviter qu'une fonction exercée en DPS implique à tort la même fonction sur un rattachement DAP.
Aucun nouveau moteur statistique ; aucune donnée personnelle modifiée.

## Contrôles ciblés A–M

Commande : `SCOPE_PLAYWRIGHT_MODULE=<module Playwright local> node scripts/scope-qv-publics-moa-tests.js`.
Pas de relance des campagnes historiques.

- A–B : référence Chef section unique ; anciens codes et libellés sélectionnés et filtrables.
- C–D : Resp matériel exact et avec espace final, référence + libre simultanés sans doublon ;
  Préposé matériel présent dans Encadrement.
- E–G : trois adjacences fiche/filtre, initiales majuscules des références, cinq correspondances
  Chef confirmées et absence de transformation de C inconnu.
- H–J : catalogue technique et codes descriptifs identiques à main ; huit sauvegardes navigateur
  interceptées conservent intégralement les valeurs brutes de quatre cas, dont les autres publics.
  Aucune sauvegarde transmise au serveur métier.
- K : affectations datées DPS/DAP réelles du clone résolues sans double compte même avec une
  entrée personnes doublée ; impossibilité d'extraction des chefs explicitement démontrée.
- L : 943 lignes de projection inchangées ; parcours Programme, recherche par public, fiche et
  résumés. Captures avant/après à 1440x1100 et 1366x768, inspectées visuellement.
- M : onze tables PostgreSQL du clone identiques avant/après rollback : préparations (dont
  Stat.Com/codes/publics), événements, affectations, participations, attendus, journal,
  publications, allocations de codes, personnes et références publiques. Exports complets
  identiques à main ; fonctions d'affichage horaire/OI/CTA inchangées ; zéro erreur JavaScript.

Preuves : `results.json`, `inventory-readonly.json` et quatre captures dans le répertoire précité.
Le navigateur utilise le serveur existant avec assets/projection isolés par interception ; le
correctif n'est PAS installé dans l'onglet MOA ouvert et n'est PAS publié en production.

## Livraison

Verdict **MOA_REQUIRED**, uniquement pour la relation individuelle manquante et l'extraction des
chefs de section. Correctif de présentation démontré et prêt à examiner. Aucune migration,
aucune écriture métier en production, aucun merge, aucun déploiement. Programme annuel non validé.

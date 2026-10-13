# SCOPE / QUO VADIS - P0 transport et accueil - 13.10.2026

**Verdict : READY_FOR_MOA. Correctif non fusionne et non publie. GO MOA obligatoire.**

## Cause et fonction

GitHub main et publication Netlify controles directement : `89a2f15fb835e40ddc90bbff4132d4868ed6f4c6`, deploy `6ace1c1db708d92528d5cc74` ready, publie le 13.10 a 11:55:44 UTC. Les journaux de la fonction `scope` attestent neuf refus Lambda 413 dans la fenetre capturee apres publication.

Route responsable : `GET /api/scope/quo-vadis/programmes/2027`. Le JSON est retourne comme une chaine dans l'enveloppe Lambda ; son echappement ajoute environ 736 ko. Le clone reproduit exactement le refus avec le handler Git `89a2f15`, pas seulement avec un test unitaire.

Les deux principaux blocs sont `canonicalProgramme` (2 932 936 octets, 933 lignes brutes / 913 actives) et `historicalAgenda2026` (1 336 826 octets). Les correspondances ECAwin representent 387 843 octets ; le catalogue 224 745. Les enrichissements PR #13 ajoutent 179 637 octets au document, notamment 136 671 au programme canonique et 31 973 a l'historique 2026. La marge precedente etait insuffisante. Le journal complet des transactions n'est pas charge dans cette reponse : son endpoint de detail reste differe.

## Mesures avant / apres

Tailles exactes mesurees sur le clone representatif avec reprise des 858 preparations et 117 decisions humaines lues en production. Ce ne sont pas des mesures du corps final de production, dont Netlify refuse la transmission.

| Mesure | Avant PR #13 | Main publie | Correctif |
|---|---:|---:|---:|
| Document JSON | 5 405 963 o | 5 585 600 o | 5 585 600 o, inchange |
| Enveloppe Lambda | 6 122 393 o | 6 321 226 o | 740 622 o |
| Seuil constate | 6 291 556 o | 6 291 556 o | 6 291 556 o |
| Transport HTTP | JSON brut | JSON brut, refuse | gzip 555 323 o |

Correction minimale : compression JSON sans perte a partir de 64 ko, au bord du handler existant, `Content-Encoding: gzip` et `isBase64Encoded`. Le navigateur retrouve le meme document. Aucun champ ni historique n'est retire ; pas de pagination, de nouveau moteur, de requete d'ecriture ni de migration. PDF, CSV, authentification et erreurs metier restent inchanges. Une reponse hors budget reste une petite erreur explicite ; un client refusant gzip recoit 406 au lieu d'un depassement Lambda.

## Accueil

L'accueil ne charge pas le Programme. Ses appels sont `/referentiels`, `/evenements`, `/dashboard`, puis le badge `/alerts`. Leur code de calcul n'avait pas change dans PR #13. Un recalcul triple du meme perimetre dans le dashboard est demontre et remplace par `analytics.snapshot`, methode deja existante : 320 -> 300 requetes SQL, sortie integrale identique. Le transport gzip beneficie aussi aux referentiels et aux listes.

Derniere recette Chrome / clone : accueil 1,94 -> 1,36 s ; Programme auparavant en erreur, maintenant 0,80 s ; recherche 0,44 s ; fiche Programme 33 ms ; fiche publiee 181 ms ; parsing navigateur des 933 lignes 6,4 ms. Dashboard HTTP 1 101 -> 786 ms. Referentiels HTTP 1 250 737 -> 123 941 octets transmis ; dashboard 372 409 -> 36 109. Mesures locales ponctuelles, pas une promesse de latence en production. Les resolutions multi-seances par evenement et les calculs d'alertes preexistants restent hors de cette intervention urgente.

## Tests et integrite

22 tests de transport reussis : identite apres decompression, headers, negociation, 200/201, PDF/CSV, erreurs, budget et payload incompressible. Recette navigateur reelle avec authentification LOCAL : Programme, recherche PR 1.3, filtres F7/DAP, fiche avec Stat.Com exact, historique differe et fiche publiee accessibles ; zero erreur JavaScript et aucun depassement de taille avec le correctif.

933/933 lignes canoniques identiques dans tous leurs champs entre main et correctif, dont Stat.Com, codes et decisions. Comparaison integrale des statistiques : global 2026, DAP, cible DAP et global 2027 identiques. Rollback verifie sur les 113 tables du clone ; aucune presence, affectation, publication ou journal modifie par les recettes. Lectures PostgreSQL production encadrees par `BEGIN READ ONLY` / `ROLLBACK` : hashes identiques avant/apres sur 257 evenements, 5 967 participations, 636 affectations, 967 obligations, 125 liens et 2 366 lignes de journal.

Reserve conservee : la fiche d'une ancienne publication non qualifiee du clone reste lisible ; son calcul de participants refuse l'operation avec le garde-fou existant `participation_catalogue_non_suivie` (422). Ce refus n'est ni un depassement ni une erreur JavaScript et n'est pas contourne. Configuration LOCAL verifiee en production ; connexion reelle et performances de production a confirmer apres GO, sans demander de secrets.

Build Netlify production reussi (25 fonctions, 7,5 s), preflight cible SCOPE reussi, diff controle. Modifications locales et preuves des lots precedents preservees. Preuves et captures : `docs/captures/qv-response-performance-20261013/`.

## Livraison

Branche unique : `codex/scope-qv-response-performance-20261013`, depuis main `89a2f15`. Commit et PR identifies dans le rapport de livraison et les metadonnees GitHub. Aucun merge, deploy ou ecriture de recette en production. Le marqueur `[skip netlify]` protege cette preparation contre une publication sans GO. Apres GO : retirer ce marqueur du titre/message de fusion, fusionner normalement dans main, verifier le commit vraiment publie sur `scope-sdisnv`, puis refaire uniquement la recette P0 de production.

Reference technique : [contrat Lambda Netlify](https://docs.netlify.com/build/functions/lambda-compatibility/) et [limites des fonctions](https://docs.netlify.com/build/functions/configuration/).

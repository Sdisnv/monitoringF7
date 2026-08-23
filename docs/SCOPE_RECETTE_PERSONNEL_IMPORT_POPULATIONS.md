# Recette MOA — Import des populations nominatives

Parcours interface uniquement. Connexion : `https://scope-sdisnv.netlify.app/scope.html?mode=live` puis Okta.

Personnel → **Importer du personnel**. Pour chaque test : choisir le type, le site JSP si demandé, sélectionner un CSV, **Analyser le fichier**, vérifier la prévisualisation, **ne pas valider** si la base réelle ne doit pas être modifiée.

L’analyse n’écrit pas en base. La validation n’a lieu qu’après **Valider l’import** puis confirmation.

## TEST 1 — Personnel général
Type : Personnel général. CSV `NIP;GRADE;NOM;PRENOM;OI`. Vérifier identiques / nouvelles personnes / OI.

## TEST 2 — PAPR
Type : PAPR. Personne déjà connue : une affectation PAPR est proposée, les OI existants restent.

## TEST 3 — cond VL — DPS
Type : cond VL — DPS. Affectation distincte. Sans rattachement DPS : anomalie visible, pas de correction silencieuse.

## TEST 4 — cond VL — DAP
Type : cond VL — DAP. Ne pas fusionner avec DPS. Sans rattachement DAP : anomalie visible.

## TEST 5 — cond PL
Type : cond PL. N’écrase ni PAPR ni cond VL.

## TEST 6 — FOBA 1
Type : FOBA 1. Import autonome. NIP inconnu = nouvelle personne, pas d’anomalie.

## TEST 7 — FOBA 2
Type : FOBA 2. Population distincte de FOBA 1. Même NIP = même personne.

## TEST 8 — FOBA 3
Type : FOBA 3. Même logique.

## TEST 9 — JSP — Flm 1 + site
Type : JSP — Flm 1. Site JSP obligatoire (JSP G1 / JSP C1 / JSP B1). NIP absent du personnel général = **Nouveau JSP**, cas normal. Vérifier que le résumé affiche le site et le niveau Flamme.

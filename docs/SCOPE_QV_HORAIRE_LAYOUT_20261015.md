# SCOPE : Restauration Ciblée De La Colonne Horaire

Verdict : **READY_FOR_MOA**. Aucune fusion ni publication effectuée.
Référence GitHub main contrôlée : `74ac904ff78c464dbc57482c2d7d06ccf3d2300f`, fusion PR #22.
Branche : `codex/scope-qv-horaire-layout-20261015`.

## Cause Et Correction

La PR #22 a introduit le séparateur ASCII ` - ` pour les créneaux DAP, conformément à la décision
concernant les fiches. Mais `qvProgrammeTimeHtml` ne reconnaissait que le séparateur ` – ` pour
fabriquer ses deux lignes. Le texte complet DAP restait donc sur une ligne dans une cellule étroite
sans retour autorisé, et débordait sur Activité. Débordement reproduit dans le navigateur avant correction.

Le rendu de la seule colonne Horaire reconnaît maintenant les deux séparateurs et réutilise le
conteneur vertical existant : heure de début, puis heure de fin. Pour les permanences CTA dotées
d'une heure de fin, cette borne connue est également affichée sur la deuxième ligne ; aucune heure
n'est inventée lorsqu'une borne manque. CSS, largeurs, alignements et autres cellules inchangés.

La fonction de sélection des horaires métier `qvProgrammeTime`, le rendu de la fiche événement,
les calculs QV-DAP-001 et les exports restent identiques au commit de référence.

## Contrôles Exclusivement Ciblés

- A/B/D/E : navigateur réel, 16 conduites DAP couvrant Y1 à Y4 sur 1920x1080 et 1366x768.
  Après correction : `18:30` puis `21:30`, positions verticales distinctes, texte contenu dans la cellule.
- C : six exercices PR contrôlés au navigateur sur les deux résolutions ; deux lignes conservées.
- D : contrôle supplémentaire du rendu des 921 lignes actives disposant des deux bornes, CTA compris.
- E : coordonnées des limites de colonnes strictement identiques avant/après ; contenu des onze
  autres cellules identique pour chaque événement contrôlé. Captures ordinateur et portable examinées.
- F : quatre places et trois plages par place au format `HH:MM - HH:MM` ; tables Conducteurs VL
  Y1/Y2/Y3/Y4 identiques avant/après au niveau du HTML, captures Y1 conservées.
- G : même projection existante du clone PostgreSQL (943 lignes, 923 actives), empreinte SHA-256
  identique avant/après. Zéro appel métier en écriture transmis, aucun accès SQL ni écriture en production.
- Zéro erreur JavaScript. Build local `netlify build --offline --context production` réussi.
  Aucun test historique acquis relancé.

La recette utilise le serveur local existant avec des sessions navigateur isolées et substitue seulement
les assets de référence/correction et la même projection de recette. La session MOA ouverte n'est ni
rechargée ni modifiée. Il ne s'agit pas d'une vérification de ce correctif en production.

## Fichiers Et Preuves

Application : `assets/js/scope-ui.js`, deux lignes du seul rendu Horaire.
Garde de non-publication propre à la branche : `netlify.toml`, trois lignes.
Recette ciblée : `scripts/scope-qv-horaire-layout-tests.js`, ce rapport et les preuves suivantes :

- `docs/captures/qv-horaire-layout/results.json` : mesures avant/après et contrôles de préservation.
- `programme-before-desktop.png` / `programme-after-desktop.png` : 1920x1080.
- `programme-before-laptop.png` / `programme-after-laptop.png` : 1366x768.
- `conducteurs-vl-before.png` / `conducteurs-vl-after.png` : tableau validé inchangé.

Aucun changement des données, dates/heures enregistrées, Stat.Com, codes, OI, familles, cursus,
publics, publications, affectations, présences, authentification, reconduction, exports ou référentiel métier.
La seule différence CTA est une présentation de l'heure de fin déjà disponible, dans la colonne concernée.
Fusion et déploiement restent soumis au GO MOA explicite.

# Guide de recette MOA — SCOPE

Parcours de découverte. 12 étapes. La MOA juge l’application ; ce guide n’impose pas de résultats métier.

Connexion : `https://scope-sdisnv.netlify.app/scope.html?mode=live` puis Okta. Aucun jeton technique.

Les données de qualification (libellés `TEST…`, NIP `99xxx` / `TSTR2*`) sont masquées par défaut. Option d’en-tête : **Inclure les données de qualification**. Les 8 agrégats LEGACY restent visibles.

1. **Connexion / navigation** — Ouvrir SCOPE, parcourir le menu (Vue d’ensemble, Exercices, domaines, Personnel, Rapports, Objectifs, Suivi nominatif). Aucun lien mort attendu.
2. **Importer un petit programme** — Exercices → Importer un programme CSV → exemple CSV → prévisualiser. Ne pas nécessairement committer si un programme réel est déjà en base.
3. **Vérifier les exercices** — Liste 2026 : chargement, filtres, badges, ouverture d’une fiche. Pas d’état vide pendant le chargement.
4. **Jouer un nominatif** — Ouvrir un exercice nominatif planifié, figer si besoin, saisir, clôturer si la MOA le souhaite.
5. **Jouer un quantitatif** — Même parcours sur un exercice quantitatif. Permutations uniquement sur DAP.
6. **Dashboard / graphiques** — Accueil : KPI, À traiter, évolution, domaines. Drill DAP / DPS / FOSPEC. LEGACY en série historique distincte.
7. **Définir un objectif** — Réglages → Objectifs : créer ou consulter un seuil de participation.
8. **Vérifier les alertes** — Inbox « À traiter » (P0) et vigilances. Pas d’alerte TEST visible par défaut.
9. **Générer un PDF** — Rapports → période ou domaine → aperçu → téléchargement.
10. **Personnel** — Actifs, recherche, filtre OI, import si utile. 16 DAP/Y4 réels attendus dans le référentiel vivant.
11. **Fiche personne** — Ouvrir une fiche DAP/Y4 : taux, événements, graphiques.
12. **Responsive** — 1200 / 1024 / 768 : accueil, exercices, import, personnel, fiche, rapports. Pas de défilement horizontal.

Après cette recette : les seuls correctifs viendront des constats MOA.

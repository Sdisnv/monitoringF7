# Monitoring F7 v48 — correctif événements à traiter / responsive

## Fichiers modifiés

- `index.html`
- `assets/js/app.js`
- `assets/js/monitoring-f7-evolution.js`
- `assets/css/monitoring-f7-evolution.css`

## Fichier créé

- `docs/MODIFICATIONS_V48_CORRECTIF_EVENTS_RESPONSIVE.md`

## Corrections réalisées

- Remplacement du texte de la vue “Événements à traiter” pour supprimer la référence au jour de consultation.
- Correction du filtrage principal : les événements non traités sont sélectionnés selon leur date événementielle, sans comparaison avec la date du jour.
- Suppression de la limitation indirecte qui masquait des événements dès qu’une action partielle avait été saisie sans clôture.
- Conservation du statut traité/non traité via `aComptabiliser` et les statuts de clôture existants.
- Tri stable par date événementielle, domaine puis événement.
- Correction de la couche d’évolution v48 afin qu’elle applique la même logique que le moteur principal.
- Correction de la structure du tableau Liste des événements : suppression d’un `<tr>` doublon et alignement du `colgroup` sur les colonnes réelles.
- Ajout d’une classe dédiée `records-table-wrap` pour gérer l’affichage complet avec scroll horizontal maîtrisé.
- Amélioration de la visibilité des actions dans les tableaux.
- Alignement à gauche du menu utilisateur, suppression du bold excessif et amélioration du bouton Déconnexion.
- Renforcement responsive pour header, menu, toolbars, tableaux et petits écrans.

## Protections anti-régression

- Aucune clé localStorage / IndexedDB modifiée.
- Aucun import/export supprimé ou renommé.
- Aucun calcul KPI ou graphique modifié.
- Aucun paramètre serveur ajouté.
- Compatibilité Netlify/GitHub conservée.

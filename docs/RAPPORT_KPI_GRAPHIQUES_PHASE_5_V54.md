# Rapport KPI et graphiques — Phase 5 — Monitoring F7 v54

## Objectif

La phase 5 rationalise l’affichage KPI et les graphiques afin de rendre le tableau de bord plus utile au commandement, plus lisible et plus robuste techniquement, sans modifier les règles métier existantes.

## Base analysée

Base stricte : `Monitoring_F7_v53.zip`.

Les zones analysées prioritairement sont :

- KPI de synthèse du tableau de bord ;
- KPI commandement/objectifs ;
- graphiques de l’onglet Graphiques ;
- graphiques de l’onglet Analyses avancées ;
- helpers `assets/js/render/render-charts.js` ;
- calculs sources dans `summarizeRecords`, `summarizeObjectivePerformance` et fonctions associées.

## Constat v53

### KPI

Les calculs métier étaient déjà centralisés et exploitables, mais l’affichage de synthèse ne mettait pas assez clairement en avant toute la chaîne commandement : comptabilisés, convoqués, présents, excusés, absents non excusés, taux brut et taux net ajusté.

Les données `excuses` et `absents` existaient déjà dans `summarizeRecords`, mais n’étaient pas visibles au même niveau que les KPI principaux.

### Graphiques

Le fichier `render-charts.js` disposait déjà de wrappers canvas et d’un fallback partiel, mais plusieurs cas restaient à durcir :

- canvas absent ;
- contexte canvas indisponible ;
- dataset vide ;
- dataset uniquement à zéro ;
- valeurs nulles, `NaN` ou `Infinity` ;
- destruction incomplète d’une instance Chart.js ;
- fallback Chart.js non disponible ;
- messages utilisateurs peu explicites.

## Modifications v54

### 1. Hiérarchisation KPI commandement

La grille KPI principale affiche désormais dans un ordre plus opérationnel :

1. exercices comptabilisés ;
2. non comptabilisés ;
3. convoqués ;
4. présents ;
5. excusés ;
6. absents non excusés ;
7. taux de présence brut ;
8. taux net ajusté.

Les nouveaux KPI `Excusés` et `Absents non excusés` utilisent directement les valeurs déjà calculées par `summarizeRecords`. Aucune règle métier n’a été modifiée.

### 2. Alertes métier non bloquantes

Ajout d’un bloc `Alertes métier de synthèse` sous les KPI principaux.

Alertes ajoutées :

- aucun exercice comptabilisé dans la sélection ;
- aucun convoqué exploitable ;
- taux de présence brut inférieur à 60 % ;
- absences non excusées élevées ;
- incohérence possible entre convoqués, présents, excusés et absents ;
- référence absente ou nulle pour un domaine affiché.

Ces alertes sont informatives. Elles ne bloquent aucun workflow et ne modifient aucune donnée.

### 3. Robustesse Chart.js / canvas

`assets/js/render/render-charts.js` a été renforcé :

- destruction systématique et protégée des anciennes instances ;
- contrôle du canvas avant dessin ;
- contrôle du contexte `2d` ;
- normalisation numérique ;
- remplacement des valeurs non finies par `0` ;
- plafonnement défensif des séries de pourcentage dans les graphiques d’objectifs ;
- message propre si aucun graphique n’est exploitable ;
- fallback canvas simple si Chart.js est indisponible ;
- absence d’erreur bloquante en console.

### 4. Nettoyage visuel limité

Aucune refonte UI complète n’a été effectuée.

Les ajustements visuels sont limités à :

- grille KPI adaptée à 4 colonnes sur grand écran ;
- responsive 2 colonnes puis 1 colonne ;
- alertes discrètes avec niveaux `ok`, `info`, `warn` ;
- messages de graphique vides plus clairs.

### 5. Calculs métier

Aucune règle métier n’a été changée.

Les valeurs KPI continuent à provenir des fonctions existantes, notamment :

- `summarizeRecords` ;
- `sumExcuses` ;
- `getEffectivePresents` ;
- `getEffectiveConvoques` ;
- `capRateForDomain` ;
- `summarizeObjectivePerformance`.

Les corrections effectuées sont défensives sur le rendu et l’affichage, pas sur la logique métier.

## Préparation Phase 6

La v54 prépare un futur dashboard commandement simplifié en isolant mieux :

- KPI prioritaires ;
- alertes synthétiques ;
- rendu graphique robuste ;
- messages de non-exploitabilité ;
- distinction entre synthèse commandement et analyses détaillées.

Recommandations Phase 6 :

1. créer un vrai bloc `Dashboard commandement` avec 6 à 8 KPI maximum ;
2. déplacer les graphiques secondaires dans un panneau repliable ;
3. conserver les tableaux détaillés pour l’analyse, pas pour la lecture immédiate ;
4. ajouter une synthèse texte automatique de la sélection filtrée ;
5. conserver les calculs métier existants comme source unique.

## Contrôles effectués

- version v54 appliquée ;
- syntaxe JavaScript contrôlée ;
- ZIP généré et vérifié ;
- absence de framework ajouté ;
- absence de backend ajouté ;
- conservation des imports/export ;
- conservation IndexedDB/localStorage ;
- conservation Netlify/GitHub/offline-first.

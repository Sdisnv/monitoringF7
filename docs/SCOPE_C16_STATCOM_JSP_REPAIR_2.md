# C16-REPAIR-2 - Référentiel Stat.Com JSP

Le référentiel canonique contient désormais `010JB1`, `010JC1`, `010JG1` et `COURJSP`, actifs à partir du 1er janvier 2026.

Le pipeline d'import conserve le code Stat.Com lu dans la source et résout séparément son identité canonique. La succession métier unique est :

- avant le 1er janvier 2026, `010JY3` reste historiquement `010JY3` ;
- à partir du 1er janvier 2026, `010JY3` est résolu en `010JC1` ;
- `013Y3` n'est jamais concerné par cette règle.

La provenance est conservée dans `sourceStatComCodes` et `statComResolutions`. Le fichier XLSX source n'est pas modifié.

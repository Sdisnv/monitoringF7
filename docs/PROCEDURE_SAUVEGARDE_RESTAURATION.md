# Monitoring F7 v66.0 — Sauvegarde / restauration

## Sauvegarde PostgreSQL

Plan minimal recommandé :

1. sauvegarde automatique quotidienne côté fournisseur PostgreSQL/Supabase ;
2. conservation de plusieurs points de restauration ;
3. export manuel avant toute migration importante ;
4. test de restauration périodique sur base de test.

Exemple générique :

```bash
pg_dump "$DATABASE_URL" --format=custom --file="monitoring_f7_$(date +%Y%m%d_%H%M).dump"
```

## Restauration

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" monitoring_f7_YYYYMMDD_HHMM.dump
```

À exécuter d’abord sur une base de test. En production, annoncer une fenêtre de maintenance et bloquer les modifications pendant la restauration.

## Export de sécurité applicatif

Les exports métier existants restent conservés. Ils ne remplacent pas une sauvegarde PostgreSQL complète, mais servent de filet opérationnel avant recette terrain ou migration.

## PRA/PCA léger

- Conserver le ZIP de release validé.
- Conserver les variables Netlify dans un coffre institutionnel.
- Conserver le schéma SQL versionné.
- Documenter le responsable de restauration et la dernière sauvegarde testée.

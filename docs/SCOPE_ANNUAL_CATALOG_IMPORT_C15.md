# C15 — Catalogue métier et import QUO VADIS 2026

## Contrat

C15 ajoute un pipeline explicable et déterministe : XLSX source → parsing → extraction activité/thème → lecture des croix → classification canonique → regroupement → collisions → propositions → arbitrage humain → import idempotent.

Le dry-run ne réalise aucune écriture. L'import confirmé alimente uniquement le Catalogue canonique, ses thèmes, ses alias et son journal d'arbitrage. Il conserve `operationalWrites=false` et `eventPublication=false` : aucune table d'événements, d'attendus, de participations, de présences ou de populations gelées n'est modifiée.

## Décisions métier

- `|` sépare exclusivement l'activité du thème dans la source 2026.
- Le libellé composé utilise `activité · thème`, sans ajouter le mot « Thème ».
- Les tirets internes des libellés sont conservés.
- Les croix décrivent les populations et OI; elles ne sont pas remplacées par `DOMAINE` ou `SOUS-DOMAINE`.
- `GEN` est une portée globale et n'est jamais créé comme OI.
- CADET reste JSP.
- PR et AUTO restent des domaines de premier niveau, distincts de FOSPEC.
- VPC utilise exclusivement la qualification `VPC` et le public `FOSPEC-VPC` canoniques de C3.
- `family_code`, domaine, public, qualification, cursus, thème et Stat.Com. restent des dimensions distinctes.

## Lifecycle

Une création produit une définition et une version canonique ACTIVE complète. Toute référence canonique demandée doit être active et effectivement liée avant activation. Une modification crée une nouvelle version puis retire la précédente sans modifier les champs immuables de l'ancienne version. Une activité utilisée ou tracée par un alias ou une décision d'import est archivée afin de préserver ses références. Les archives sont masquées par défaut, filtrables et restaurables. La suppression physique est réservée aux définitions entièrement vierges.

L'identité d'un import combine le contenu source, la version du pipeline et les décisions MOA explicites. Elle reste indépendante des alias créés comme conséquence du premier passage, afin qu'un second import identique retrouve le run existant sans nouvelle écriture.

## Migration

La migration C15 ajoute uniquement le journal des imports et des décisions humaines. Elle est additive, transactionnelle, protégée par RLS/REVOKE et n'est pas exécutée par le trafic applicatif. Les modèles C1 à C8 restent les propriétaires des définitions, versions, publics, thèmes et besoins annuels.

## Preview reproductible

`npm run diagnostic:scope-annual-catalog-c15 -- "/chemin/vers/QUO VADIS 2026.xlsx"`

Le diagnostic génère `docs/SCOPE_C15_QUO_VADIS_2026_PREVIEW.json` et `.md`. Ces artefacts ne contiennent pas de personnes; ils réconcilient toutes les lignes source avec leurs propositions et décisions.

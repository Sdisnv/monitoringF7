# SCOPE - moteur de public canonique en miroir C2-B

## Statut et périmètre

C2-B fournit un modèle canonique additif et un moteur pur de proposition de public. Il ne remplace aucun calcul historique, n'assigne personne, ne fige aucune population et n'écrit ni dans les événements, ni dans les attendus, ni dans les participations. Son résultat est uniquement destiné à une comparaison en miroir.

Il n'existe aucune bascule G0-D dans ce lot. Une proposition C2-B n'est jamais une population assignée.

Le moteur est versionné `C2-B-1`. Une évaluation exige une date explicite et renvoie `complete`, `resolutionStatus`, `personIds`, `tracesByPerson`, `warnings`, `ruleFingerprint` et `resultFingerprint`. Les traces ordinaires concernent seulement les personnes incluses. `explainPersonExclusion` produit à la demande la trace d'une personne exclue.

## Persistance

- `scope_public_definitions` porte l'identité et la responsabilité fonctionnelle du public.
- `scope_public_rule_versions` porte une expression, une période de validité inclusive, sa version de schéma et son empreinte SHA-256.
- Une définition utilise les statuts `ACTIVE`, `INACTIVE` et `ARCHIVED`. Son propriétaire est facultatif et ses indices de domaines restent informatifs.
- Une version `ACTIVE` est sémantiquement immuable. Elle peut être retirée, mais son expression, son empreinte et sa validité ne peuvent plus être modifiées.
- Le lifecycle autorise uniquement `DRAFT -> DRAFT|ACTIVE`, `ACTIVE -> ACTIVE|RETIRED` et `RETIRED -> RETIRED`. Un retrait est donc définitif.
- Deux versions actives d'une même définition ne peuvent pas avoir de périodes qui se chevauchent, bornes incluses.
- Les deux tables ont la RLS activée et aucun droit direct pour `anon` ou `authenticated`.
- Aucun lien n'est ajouté aux événements, exercices, attendus ou versions de définition d'événement.

La migration autonome est `database/migrations/20260923_scope_public_engine_mirror_c2_b.sql`. Le même contrat est installé par `ensureScopeSchema`, sans exécution automatique dans C2-B.

## DSL fermé

Les seuls opérateurs sont `ALL`, `ANY` et `NOT`. Les seuls prédicats sont :

- `PERSON_ELIGIBLE_AT`
- `HAS_DOMAIN_ASSIGNMENT`
- `HAS_OI`
- `HAS_COMPETENCE`
- `HAS_FOBA_LEVEL`
- `HAS_JSP_ROLE`

`HAS_PR_TRACK` n'existe volontairement pas. PAPR et PABC doivent être exprimés par une compétence personnelle canonique avant de pouvoir devenir un public résolu.

Le validateur rejette les opérateurs, prédicats et champs inconnus, les groupes vides, une arité de `NOT` différente de un, les codes non canoniques et tout champ de présentation comme `label`. Les limites sont 8 niveaux, 64 nœuds, 32 codes par prédicat et 16 384 octets JSON.

La normalisation met les codes en majuscules, trie et déduplique leurs listes, et trie les enfants des opérateurs commutatifs. L'empreinte SHA-256 porte sur la sérialisation stable de cette forme normalisée.

## Sémantique temporelle

Toutes les bornes sont inclusives. Une donnée future ne qualifie pas encore une personne et une donnée expirée ne la qualifie plus. `PERSON_ELIGIBLE_AT` examine d'abord les périodes personnelles valides à la date, puis les dates et le statut de la personne. Pour reproduire G0-D en miroir, `ACTIF` est prioritaire lorsqu'une période `ACTIF` et une période `DEMISSIONNAIRE` sont simultanément applicables. Une personne est dédupliquée par son identifiant.

Les jeux de faits requis doivent être explicitement fournis. Une liste vide signifie « source chargée, aucun fait » et produit donc un résultat déterministe; une liste absente signifie « source non fournie » et produit `INCOMPLETE`. En particulier, `periods` absent ne peut jamais produire `COMPLETE` pour une règle utilisant `PERSON_ELIGIBLE_AT`. Avec `periods: []`, le miroir reproduit G0-D en évaluant les dates et le statut portés par la personne; ce fallback explicite ne génère aucun avertissement de source manquante. Une règle marquée `UNRESOLVED` ou `AMBIGUOUS` n'est pas évaluée comme un ensemble vide.

Une affectation issue du legacy n'est valide que si sa date de début existe et est valide, comme dans G0-D. Les intervalles canoniques qui admettent légitimement une borne ouverte conservent leur propre contrat.

## Seeds C2-B

Les 21 règles actives de haute confiance sont : DPS G1/C1/B1/B2, DAP Y1/Y2/Y3/Y4, FOBA 1/2/3, AUTO COND_PL/COND_VL/COND_TP9/GRUTIER/MEA/PILOTE_BAT, et FOSPEC OFSI/NAC/OP_VPC/ANTICHUTE.

Les dix cas C1 à revoir ne sont pas seedés. PAPR et PABC ne sont pas seedés non plus : C1 définit les parcours, mais pas une table ni une définition complète de compétence personnelle PAPR/PABC.

## Adaptateur legacy

`_scope-public-legacy-adapter.js` convertit des faits legacy déjà chargés en faits normalisés. Il n'accède à aucun dépôt et ne constitue jamais la source finale. Une cible non représentable devient un fait `UNRESOLVED` ou `AMBIGUOUS`; elle n'est pas transformée en absence de qualification. `VL_DPS` et `VL_DAP` deviennent tous deux la compétence canonique `COND_VL`, mais les preuves conservent `legacyCode` et `legacyContext` afin de distinguer leur provenance DPS ou DAP.

## Miroir et multi-session

`compareLegacyAndCanonical` reçoit deux résultats déjà calculés. Il ne connaît et n'appelle aucun moteur legacy. Il expose l'intersection, les personnes propres à chaque côté et une cause probable stable.

Les scénarios et rapports utilisent quatre classifications strictes :

- `REAL_PARITY` : le harness de test exécute réellement `resolveEligiblePopulation` et le moteur C2-B sur les mêmes données en mémoire, puis compare les `personne_id`.
- `CANONICAL_FIXTURE` : une liste de référence injectée vérifie seulement le comportement attendu du comparateur ou du moteur canonique; elle n'est jamais annoncée comme une parité G0-D.
- `CANONICAL_ONLY` : la fonction testée, par exemple une composition multi-domaine ou multi-public, n'a pas d'équivalent legacy comparable.
- `RESOLUTION_ONLY` : le scénario vérifie exclusivement les états `UNRESOLVED` ou `AMBIGUOUS`.

Le harness `scripts/scope-public-engine-c2-b-real-parity-tests.js` est exclusivement utilisé par les tests. Il construit un repository mémoire et appelle le service legacy réel; il n'est relié à aucun chemin opérationnel.

Chaque session doit lancer sa propre évaluation avec sa date D1 ou D2. Aucun résultat n'est partagé implicitement entre sessions; les tests démontrent que deux dates consécutives peuvent produire des propositions différentes.

## Limites et décisions MOA ouvertes

- Définir la future source canonique des compétences détenues par les personnes.
- Arbitrer les dix cibles C1 ouvertes et les qualifications personnelles PAPR/PABC.
- Décider comment une proposition par date de session devient, ou non, une population assignée.
- Décider les conditions mesurables d'une éventuelle bascule après preuve de parité.
- Dimensionner les futurs index de lecture à partir de requêtes réelles; C2-B n'ajoute aucun cache persistant de résultats personnes.

## Vérification

```sh
npm run test:scope-public-engine-c2-b
node scripts/scope-public-engine-c2-b-diagnostic.js
node scripts/scope-public-engine-c2-b-diagnostic.js --json
```

Le diagnostic est statique et en mémoire. Il ne lit ni n'écrit aucune base et ne déclenche aucun effet distant.

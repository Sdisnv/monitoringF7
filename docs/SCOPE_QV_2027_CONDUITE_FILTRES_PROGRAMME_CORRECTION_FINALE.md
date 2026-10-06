# QUO VADIS 2027 - Conduite et filtres Programme - Correction finale

## Périmètre et preuves

- Préflight : rapport `SCOPE_QV_2027_PROGRAMME_FILTRES_TAXONOMIE_CONDUITE_CORRECTIF_2.md` lu intégralement ; worktree préexistant inspecté et préservé. Branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD `a186bbee530cb40217034b2d27d5d08641703305`.
- Classeur 2026 ouvert directement : `2026 QUO VADIS SDIS Nord vaudois.xlsx`, 919 lignes, SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`. Aucune écriture dans le classeur.
- Le précédent rapport retenait 8 conduites DPS (deux/site). La présente décision MOA explicite remplace cette règle par deux conduites **par demi-section opérationnelle**. La règle DAP de quatre soirées par Y, confirmée dans le rapport post-recette A-J, reste inchangée.

## Conduite DPS et DAP

| Mesure 2027 | Avant | Après |
| --- | ---: | ---: |
| Conduite DPS | 8 | 56 |
| G1 / C1 / B1 / B2 | 2 / 2 / 2 / 2 | 20 / 12 / 12 / 12 |
| Conduite DAP | 16 | 16 |
| Y1 / Y2 / Y3 / Y4 | 4 / 4 / 4 / 4 | 4 / 4 / 4 / 4 |
| Total conduite | 24 | 72 |
| Programme 2027 | 808 | 856 |
| Séances datées / sans date | 796 / 12 | 844 / 12 |

Les 28 demi-sections opérationnelles ont chacune exactement deux conduites de 10:30 à 11:30, après deux instructions demi-section distinctes de même OI, même date et même public. Le moteur sélectionne la première et la dernière instruction réelle de chaque demi-section ; il n'ajoute aucune instruction pour porter une conduite. N06 G1 et N04 des autres sites restent des réserves exclues. Les quatre conduites explicites du 06.02 sont conservées, 52 occurrences sont dérivées, soit 48 de plus qu'avant. Stat.Com DPS `0152F7`, publics `Nxxa/b, cond PL, cond VL` ; aucun AUTO non justifié n'est ajouté. Les conduites ne sont pas marquées « séances multiples ».

Juillet G1 est vérifié sur cinq sources demi-section réelles : 03.07 N03a, 10.07 N02a, 17.07 N01a, 24.07 N05b, 31.07 N04b, chaque fois 10:30-11:30 après l'instruction finissant à 10:30. La couverture annuelle vérifie aussi individuellement N01a/b à N05a/b, pas seulement le total G1.

Le classeur 2026 contient 17 réalisations DAP `Conduite, formation continue`, Stat.Com `01522F7`, sous-domaine `AUTO`, responsable `Of auto`, public `Cond VL`, 18:30-21:30 dans les `Local Y`. Y2/Y3/Y4 ont quatre dates chacun en mars ; Y1 a cinq dates entre avril et mai. La règle 2027 déjà documentée retient les quatre premières dates de chaque Y, en ordre Y1-Y4 ; la cinquième Y1 n'est pas reconduite automatiquement. Les 16 conduites DAP restent distinctes des formations groupées à deux sessions.

## Programme et filtres

- `Type = Conduite` trouve les 72 lignes (56 DPS + 16 DAP) selon le libellé réel de l'activité, indépendamment du Stat.Com et de la famille. `Type + Famille AUTO` retourne 72 ; `Type + OI DPS` 56 ; G1 20, C1/B1/B2 12 chacun ; DAP 16 ; Y1/Y2/Y3/Y4 quatre chacun. `Domaine F7 + Type Conduite + OI DPS` et `Recherche Conduite, formation continue + OI DPS` retournent chacun 56.
- Domaine : `Tous`, puis F0 à F8 avec les neuf libellés demandés, sans ligne vide ni pseudo-option. Famille : DPS/DAP/JSP, FOBA/FOCO/FOCA/FOSPEC, AUTO/PR, axe distinct du domaine et du type.
- Type : groupes de présentation non sélectionnables FORMATION, OPÉRATIONNEL, ÉVÉNEMENTIEL ; valeurs métier sélectionnables sans tiret décoratif. OI : parents DPS/DAP/JSP sélectionnables, enfants indentés dont libellés visibles G1/C1/B1/B2 et Y1-Y4, puis SDIS ; codes internes qualifiés conservés. Le filtre OI utilise les affectations confirmées, pas le domaine, et les activités transversales restent trouvables depuis chaque OI concerné.
- Stat.Com, Public cible, Lieux et KPI Agenda conservent les corrections antérieures. Le filtre « Séances multiples » retourne toujours 48 lignes réelles et aucune conduite dérivée.

## Vérification et limites

- 18 suites `scripts/scope-qv-*-tests.js` exécutées individuellement : **388/388 PASS**. La suite ciblée conduite/filtres compte 13/13, incluant le contrôle direct du classeur, les 28 demi-sections, les cinq samedis G1 de juillet, DAP, filtres combinés et HTML/CSS des menus.
- `npm run check` : PASS. `git diff --check` : PASS.
- `npm run test:scope` : NON PASS global. Arrêt sur `scope-login-visual-alignment-orion-1-tests.js:138`, assertion de cache-bust CSS login attendant une ancienne version ; les quatre suites précédentes passent. Ce défaut est hors périmètre et n'a pas été modifié.
- Recette visuelle navigateur : **non effectuée**. Le runtime ne trouve aucun navigateur connecté (`agent.browsers.list() = []`) malgré une nouvelle tentative. Aucun résultat visuel n'est revendiqué ; la recette MOA desktop/mobile reste à faire.
- Serveur de recette locale isolée relancé sur `http://127.0.0.1:4396/scope.html#/quo-vadis/programme` ; la page répond HTTP 200. Ce contrôle HTTP ne remplace pas une recette navigateur.
- Aucune donnée de production, aucun événement, aucun Stat.Com ni OI persisté n'a été changé. Les cas de classification métier hors conduite demeurent soumis aux preuves/arbitrages précédents, sans réouverture dans ce lot.

## Fichiers et Git

Correctif de ce lot : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `assets/css/scope.css`, `netlify/lib/_scope-cta-rules.js`, tests QUO VADIS affectés par la nouvelle cardinalité, et le présent rapport. Les autres changements déjà présents dans le worktree sont conservés. Aucun reset, commit, push, PR, merge ni déploiement ; production inchangée.

# QV 2027 - Complement NO-GO : causes MOA et calendrier

Diagnostic uniquement, au 05.10.2026. Sources : [gate](SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md), ses trois CSV, ses [metriques](SCOPE_QV_2027_GATE_CONSOLIDATION_METRICS.json), le XLSX de controle et les decisions MOA deja documentees. Aucune regeneration du gate, du classeur ou du Programme. Le classeur historique identifie par SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742` reste lisible ; ses 847 lignes datees 2026 sont conservees comme source.

## Synthese des 433 lignes

Une ligne est une source physique 2026 ou une occurrence physique 2027, jamais une association OI supplementaire. Les huit causes `H` couvrent les 136 sources 2026 et les 212 correspondances 2027 (348 lignes). Les cinq causes `C` ne comptent que les **85 alertes exclusivement calendaires**. Les 23 autres alertes calendrier sont deja dans `H` ; 348 + 85 = **433**, sans double compte. Dans la colonne OI, `?` signifie que la source n'en documente pas.

| Cause | Lignes | OI | Statut | Action |
| --- | ---: | --- | --- | --- |
| H1 - source 2026 sans titre identique en 2027 | 125 | DPS, DAP, ? | Preuve de reconduction absente, pas disparition prouvee | Controler les obligations annuelles par famille ; ne pas creer 125 decisions |
| H2 - titre 2026 present, ligne non liee | 11 | DPS, DAP, ? | Appariement incomplet | Verifier les lignes concurrentes ; ex. `Exercice DAP 4`, `Formation cadres DAP` |
| H3 - source liee, titre identique, Stat.Com different | 80 | DPS, DAP, JSP | Divergence technique a examiner, pas changement volontaire prouve | Comparer Stat.Com par OI ; ex. source `012C1`/`013Y2`/`010JC1` projetee `012B1`/`013Y1`/`010JB1` |
| H4 - source liee, titre transforme, Stat.Com identique | 94 | DPS, DAP, JSP, SDIS, ? | La condition d'egalite du titre sur-alerte, mais la transformation peut changer theme/public | Auditer par famille ; ex. `Recyclage BLS \| AED SN55i` -> `Recyclage BLS`, ou PR 1.2-1.6 -> 1.1 ; **une** liaison photo DAP ligne 593 Y2 -> Y3 contredit l'OI source |
| H5 - source liee, titre **et** Stat.Com transformes | 8 | DPS, DAP, JSP | Correspondance non sure | Verifier le lien avant toute classification ; ex. `Exercice DAP 5` -> `Exercice DAP 4` (3), `Formation permanents \| ABC/PIO` -> `Formation permanents` (2), `Formation cadres DAP` (2), JSP Cadets (1) |
| H6 - ligne explicite 2027 sans lien exact | 15 | DPS, DAP, JSP, SDIS | 4 KICK-OFF du 06.02 deja valides ; 11 autres sont des projets explicites, pas des creations deduites de 2026 | Ne pas redemander les 4 ; apparier les 11 sans nier leur existence |
| H7 - occurrences sans date | 12 | DPS, ? | Deux structures distinctes, non resolues par le gate | Six sessions `Formation groupee 1.1` et six `Groupe de travail FOCA` : voir questions 1-2 |
| H8 - PR-ABC derive | 3 | DPS:G1 | **Deja decide MOA** : trois seances datees, public/responsable fixes | Retirer l'alerte de correspondance lors d'un futur gate, sans toucher au Programme ici |
| C1 - vacances, autres activites | 34 | DPS, DAP, JSP | Revue de date ; 13 autres cas de vacances sont aussi dans H | Appliquer la regle generale, sauf exception explicite ; ex. `8 km du SDIS` |
| C2 - ferie / veille / week-end, autres activites | 13 | DPS, DAP, JSP | Revue de date ; 10 autres cas analogues sont aussi dans H | Faire confirmer date ou exception, sans deplacer silencieusement |
| C3 - instruction sct / demi-sct en week-end ferie | 12 | DPS:G1/C1/B1/B2 | **Validation humaine explicitement requise** | Douze dates a valider ou corriger, une seule famille de regle |
| C4 - conduite DPS apres instruction, vacances seules | 20 | DPS:G1/C1/B1/B2 | **Deja decide MOA** : instruction en vacances autorisable, conduite adossee le meme jour | Exception metier, pas 20 nouvelles questions ; les conduites avec ferie/veille restent en C2 |
| C5 - permanence CTA traversant un ferie | 6 | DPS:G1/C1/B1/B2 | Cycle hebdomadaire valide ; **exception feriee exacte non demontree** | Une regle MOA d'extension/couverture a confirmer, sans supprimer les six fenetres |

`H1` inclut 26 lignes externes/institutionnelles sans Stat.Com, 44 lignes codees avec OI coches et 55 lignes codees sans OI coches. **125 titres absents ne prouvent pas 125 disparitions.** `H2` comprend huit lignes avec OI et trois sans OI. `H3` est une divergence de donnees source/projection, non une autorisation de recopier automatiquement le Stat.Com historique. `H4` inclut des renommages plausibles, mais aussi des numerotations et une contradiction d'OI : il ne peut etre entierement solde par une simple normalisation de texte.

**Resolus par decisions existantes : 27 lignes uniques** (H6 : quatre KICK-OFF ; H8 : trois PR-ABC ; C4 : vingt conduites). Deux causes completes et une cause partielle. Le cycle CTA hebdomadaire est valide, mais les rapports de preproduction [C19 R1](SCOPE_C19_PREPROD_GATE_1_R1.md) et [C19 R2](SCOPE_C19_PREPROD_GATE_2.md) laissent l'**exception feriee** ouverte : ses six alertes ne sont pas soldees. Le gate a deja exclu de ses 108 alertes les instructions sct/demi-sct pendant les **seules** vacances ; aucune revue MOA supplementaire ne leur est due. La section G1 du lundi de Paques est deja deplacee du 29 au 30.03.2027 avec sa trace, hors des 108.

## Repartition des 108 alertes calendrier

| Classe diagnostique | Occurrences | Detail |
| --- | ---: | --- |
| A. CONFORME_AUTOMATIQUE | 0 | Les instructions pendant les seules vacances et la section G1 deplacee sont deja **hors** des 108 alertes. |
| B. CONFORME_EXCEPTION_METIER | 20 | Conduites DPS adossees a une instruction lors des seules vacances, sans ferie/veille/pont. |
| C. HUMAN_REVIEW_REEL | 88 | 12 instructions en week-end ferie ; 70 autres dates : 47 vacances seules, 8 veilles, 6 ferie+vacances, 2 week-end+veille+vacances, 2 week-end+vacances, 2 feries seuls, 3 week-ends feries seuls ; 6 fenetres CTA dont l'exception feriee exacte manque. |
| D. ANOMALIE_A_CORRIGER certaine | 0 | Les 88 cas C peuvent conduire a des corrections de date/regle, mais aucune n'est decretee ici sans validation. |

23 des 88 cas C sont egalement des correspondances H ; ne pas additionner 88 et 348. Les 12 instructions portent sur **quatre jours distincts** et requierent la validation de chaque occurrence selon la regle MOA ; les regrouper ne vaut pas approbation collective. Les 70 autres occurrences couvrent **32 jours distincts** et demandent correction de date ou exception explicite, non 70 nouvelles regles. Ensemble, les 82 occurrences hors CTA couvrent **33 jours distincts** (certains jours portent les deux familles). Les six CTA posent une seule question sur la couverture/extension feriee, **pas** sur l'existence du cycle. `Passeport-Vacances` et les evenements publics d'ete peuvent avoir une raison de tenir pendant les vacances, mais la source disponible ne valide pas d'office leur **date 2027**.

## Calendrier persiste : nature exacte du blocage

La source SQL attendue est `scope_quo_vadis_calendar_days`, liee a `scope_quo_vadis_programmes.programme_id`. `seedCalendar()` l'alimente depuis `_scope-cta-rules.js` (feries vaudois et periodes scolaires), et `listProgramme()` la lit. Le fixture SQL local repond pour cette table : il a permis de constater **9 feries et 7 periodes de vacances** touchant 2027, pas de certifier l'etat distant. La premiere tentative de lecture `psql` en sandbox a echoue a la resolution DNS ; les lectures **read-only** ensuite autorisees ont expire lors de la connexion/GSS au pooler `aws-0-eu-central-2.pooler.supabase.com:6543`, meme avec `PGCONNECT_TIMEOUT=5` et GSS desactive. Ce n'est **pas** une preuve de table absente, de droit SQL refuse, de variable manquante ou d'endpoint applicatif defectueux : la session SQL n'a jamais ete etablie. Aucun calendrier nouveau ni aucune source MOA a refournir.

Controle minimal **a faire uniquement depuis un acces reseau DB fonctionnel**, en lecture seule, sans afficher l'URL ni changer de donnees :

```sh
set -a; source "$HOME/.config/scope/runtime.env"; set +a
PGCONNECT_TIMEOUT=5 PGGSSENCMODE=disable PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=10000' /opt/homebrew/opt/libpq/bin/psql "$SCOPE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "select c.jour, c.type_jour, c.libelle, c.metadata->>'dateFin' as fin, c.source from scope_quo_vadis_calendar_days c join scope_quo_vadis_programmes p on p.programme_id=c.programme_id where p.annee=2027 order by c.jour, c.type_jour, c.libelle"
```

La certification exige ensuite de rapprocher **les lignes retourneees**, y compris les sources manuelles et `dateFin`, des 9/7 locaux ; un simple compte ne suffirait pas. Ne pas executer `listProgramme()` sur la DB reelle pour cet audit, puisque ce service appelle `seedCalendar()`.

## Ecarts 2026 -> 2027 encore ouverts

- **Disparition : aucune prouvee** parmi H1/H2. La cinquieme conduite DAP Y1 est la seule non-reconduction volontaire deja justifiee. La presence d'un titre 2026 n'etablit pas une obligation annuelle 2027.
- **Multiplication : aucun doublon exact parmi 844 occurrences datees** ; les 178 evenements multi-OI representent 698 associations, pas 698 evenements. Le seul doute de structure saillant est `Formation groupee 1.1` (six sessions non datees face a des themes 2026 1.1-1.6), plus les six FOCA sans source 2026.
- **OI :** la liaison `Seance photo du personnel DAP` projetee Y3 sur la source ligne 593 Y2 est contradictoire ; la source ligne 719 Y3 existe aussi. H5 contient deux `Formation cadres DAP` Y4 reliees a des sources Y1/Y2 : lien a verifier. Les 355 lignes 2026 sans OI coche et 132 occurrences 2027 sans OI confirme ne doivent pas etre completees par deduction du domaine.
- **Stat.Com :** 80 titres identiques relies portent un code different ; regroupement repetitif `012B1`, `013Y1`, `010JB1` ou `040B1` pour d'autres OI. H5 ajoute huit changements titre+code. Aucune intention de changement 2027 n'est prouvee par le gate.
- **Public :** 81 des 182 projections H avec ligne source ont un public structure vide alors que le champ historique `personnel` est rempli. Les deux champs n'ont pas la meme semantique ; verifier les contrats de projection avant de qualifier les 81 de pertes metier.
- **Sessions :** les six `Formation groupee 1.1` restent a arbitrer ; les six FOCA sans date ni source constituent une seconde question. Les 124 domaines 2027 sans F0-F8 simple et les OI non documentes sont des limites de preuve transversales, pas 124 ni 132 decisions inventees.

## Vraies questions pour Thierry

| Question | Impact | Options et consequence |
| --- | ---: | --- |
| 1. `Formation groupee 1.1` : une activite a six sessions, ou six themes distincts 1.1-1.6 comme les lignes 2026 ? | 6 sessions sans date | Une activite conserve une fiche multi-session ; six themes exigent des identites et calendriers distincts. Dans les deux cas, les dates doivent etre fixees. |
| 2. Les six `Groupe de travail FOCA` sans date ni source 2026 sont-ils bien requis en 2027 ? | 6 occurrences | Oui : indiquer calendrier, public/OI et responsable ; non : etablir explicitement la decision de non-planification, sans suppression dans ce diagnostic. |
| 3. Pour les 12 instructions sct/demi-sct en week-end ferie, quelles occurrences sont validees et lesquelles sont a corriger ? | 12 occurrences sur 4 jours | Validation explicite ou repositionnement ; l'exception vacances seules ne couvre pas ces week-ends. |
| 4. Pour les 70 autres conflits calendaires, quelles occurrences 2027 sont corrigees et quelles exceptions metier sont explicitement assumees ? | 70 occurrences sur 32 jours, dont 23 avec aussi un motif H | Le principe ordinaire existant favorise le repositionnement ; une exception preserve la date documentee. Un nom d'activite ne suffit pas a l'approuver. |
| 5. Quelle est la regle exacte de couverture/extension CTA autour des feries pour les six fenetres signalees ? | 6 fenetres | Maintenir le cycle valide, mais preciser debut/fin ou couverture supplementaire ; aucune prolongation n'est inventee ici. |

Ce sont **cinq dossiers MOA**, et non cinq votes uniques : les 82 occurrences hors CTA, reparties sur 33 jours, peuvent exiger des validations individuelles. Avant d'ouvrir d'autres questions, l'equipe technique doit rapprocher H1-H5 des regles de recurrence et des lignes source ; notamment corriger le diagnostic de correspondance, verifier les 80 Stat.Com et la liaison photo Y2/Y3. Si ce rapprochement demontre ensuite une obligation annuelle absente ou un changement intentionnel non documente, presenter ce **cas cible** a la MOA ; ne pas convertir preventivement 136 absences de lien en decisions.

## Verdict

`HUMAN_REVIEW_TECHNIQUES = 433` ; `CAUSES_RACINES = 13` (huit H, cinq C) ; `RESOLUS_PAR_REGLES_EXISTANTES = 27 lignes` (deux causes completes + quatre lignes d'une troisieme) ; `ANOMALIES_TECHNIQUES = 2 familles a investiguer` (80 divergences de Stat.Com liees, une liaison OI contradictoire ; les huit H5 restent mixtes) ; `DECISIONS_MOA_REELLES = 5 dossiers`, dont 82 occurrences calendaires hors CTA potentiellement individuelles sur 33 jours ; `CONFLITS_CALENDRIER_REELS = 88 occurrences a valider`, **pas** 108 cas a soumettre a nouveau.

**NO_GO_TECHNIQUE maintenu**, pour cinq verifications precises : (1) calendrier SQL persiste non certifie ; (2) divergences de Stat.Com/OI et correspondances H1-H5 non rapprochees ; (3) 12 sessions sans date ou structure arbitree ; (4) 88 alertes calendaires restant sous revue, dont six CTA gouvernees par une exception feriee non formulee ; (5) limites de preuve OI/domaines/public a controler avant le controle externe par OI. Ces verifications ne sont pas 433 arbitrages. Aucun GO production n'en decoule.

Controle effectue pour ce complement : lecture seule des artefacts existants et du worktree ; recomptage des 433 identifiants, de leurs 23 recouvrements calendrier, des 80 divergences titre egal/Stat.Com different et des 108 motifs calendrier. Aucun test d'execution, aucune recette navigateur ni connexion DB reussie n'est revendique. Aucun fichier metier, donnee de production, code, commit, push, PR, merge ou deploiement modifie par ce complement.

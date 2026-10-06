# QUO VADIS 2027 - domaines, OI et transversalite - correctif 1

## A. Diagnostic et preuve 2026

Preflight : branche `scope-qv-canonical-rules-checkpoint-20261002`, HEAD initial
`a186bbee530cb40217034b2d27d5d08641703305`, `origin/main`
`55667a79012e976d54f5c90cc183628f8897cec9`. Worktree deja modifie : aucun
reset, stash ou nettoyage. Source obligatoire ouverte directement :
`2026 QUO VADIS SDIS Nord vaudois.xlsx`, onglet `QUO VADIS '26`, 919 lignes utiles,
SHA-256 `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`.
La projection JSON historique correspond exactement aux lignes lues du classeur.

- Source du defaut Domaine/famille : le programme canonique 2027 contient des lignes
  institutionnelles figees en `DPS` ou `DAP`. La famille affichee devient alors `FOCO`
  par regle de presentation, meme lorsque la colonne `DOMAINE` 2026 vaut `F4`, `F5/6`,
  `F1/8` ou `F3`. Ce n'est pas une erreur de la seule colonne HTML.
- Source du defaut OI : `qvNormalizeOiSelections` consultait `row.domain` pour qualifier
  `G1`. Dans six seances de domaine DAP, `G1` explicite dans la source restait brut,
  absent du filtre `DPS:G1` et affiche comme `A qualifier : G1`.
- Source du texte technique : `qvFormatOiSelections` concatene par ` ; ` les groupes
  OI et les codes ambigus. Le Programme reutilisait ce format d'audit comme affichage.
- Persistance : `scope_quo_vadis_obligations.domain` reference `scope_domaines(code)` ;
  les codes F1-F8 ne sont pas des codes SQL actifs dans la migration actuelle.
  `INSTITUTIONNEL` y est declare, sans verification d'etat sur la base de production.
  Le Programme affiche le domaine fonctionnel prouve et
  enregistre `INSTITUTIONNEL` pour ses fiches, sans migration ni nouveau code de base.

## B. Correctif et impact

Le domaine et l'OI sont maintenant independants. Les selections OI du Programme sont
qualifiees par site reel (`G1/C1/B1/B2` = DPS, `Y1-Y4` = DAP, JSP conserve son axe),
sans decision tiree du domaine de l'activite. Le filtre OI compare les codes confirmes,
et les cellules OI affichent uniquement leurs libelles, separes par virgules.

Le filtre Domaine conserve l'ordre operationnel acquis et propose aussi Gouvernance,
F1, F2, F3, F4, F5/6, F7, F8, plus les codes distincts `F1/8` et `F2/3` observes
dans le classeur. Seuls F1, F4 et F8 disposent des libelles complets communiques par
la MOA. Aucun libelle complet de F2, F3 ou F7 n'est suppose.

Impact de la projection locale 2027 : **808 seances actives conservees** ; **19
seances / 8 modeles** reclasses selon preuve directe ; **6 seances / 3 modeles**
nettoyes du `G1` ambigu ; **3 seances** voient leur public errone `JSP:1` remplace
par le public explicite (Echelons II-IV) ou par la cible existante `SDIS-ALL`
(Rapport annuel). Identites, dates, Stat.Com et decisions humaines non modifies.
**35 modeles candidats** restent `MOA_REQUIRED` pour une autre classification ;
aucune conversion de masse ni ecriture de production.

## C. Inventaire source 2026

`Domaine / sous-domaine / Qui` reprend exactement les colonnes 2026. La ligne et le
code sont des exemples de tracabilite quand un modele a plusieurs realisations. Les
OI sont ceux coches dans le classeur ; `Personnel` est le public textuel historique.

### PROUVE ET CORRIGE

| Activite (seances 2027) | Ligne / code 2026 | Stat.Com | Domaine / sous-domaine / Qui 2026 | OI 2026 | Personnel ; responsable | Domaine 2027 |
|---|---|---|---|---|---|---|
| Rapport annuel (1) | 923 / 071F3.923 | 071F3 | F3 / vide / vide | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | TOUS ; Cdt | F3, cible SDIS-ALL |
| Seance audiovisuel et communication F5/6 (1) | 869 / 070F56.869 | 070F56 | F5/6 / SIC / vide | G1,C1,B1,Y1,Y4 | Specialiste audiovisuel et communication ; Of spec | F5/6 |
| Seance cadres F5/6 (3) | 398,747,863 / 070F56 | 070F56 | F5/6 / SIC / vide | G1,B1 | Cadres F5/6 ; Of spec | F5/6 |
| Seance communication F5/6 (9) | 80,212,290,371,508... / 070F56 | 070F56 | F5/6 / SIC / vide | G1,Y1 | Membres communication ; Of spec | F5/6 |
| Seance echelons II, III et IV (2) | 557,865 / 070F1SDIS | 070F1 | F1/8 / SDIS / SDIS | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | Echelons II, III et IV ; Cdt | F1/8, publics ECH:II-III-IV |
| Seance Fourriers DAP (1) | 880 / 070F8.880 | 070F8 | F1/8 / DAP / vide | G1,Y1,Y2,Y3,Y4 | QM / Four DAP ; QM | F1/8 |
| Seance Fourriers DPS (1) | 878 / 070F8.878 | 070F8 | F1/8 / DPS / vide | G1,C1,B1,B2 | QM / Four DPS ; QM | F1/8 |
| Seance responsables MAT SDIS (1) | 879 / 070F4SDIS.879 | 070F4 | F4 / LOG / SDIS | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | C log / Resp mat DPS / Resp mat DAP ; C log | F4 |

### MOA_REQUIRED - AUCUNE RECLASSIFICATION

La colonne 2027 indique l'etat conserve, pas une proposition. Une mention F dans
`DOMAINE` 2026 ne tranche pas seule si ce code doit remplacer le domaine operationnel
principal d'une autre activite. Les 35 modeles ci-dessous demandent ce choix metier.

| Activite (seances 2027) | Ligne / code ; Stat.Com | Domaine / sous-domaine / Qui 2026 | OI 2026 | Personnel ; responsable | Domaine 2027 conserve |
|---|---|---|---|---|---|
| Ceremonie de promotion et nomination (1) | 851 / 070F1 ; 070F1 | F1/8 / SDIS / vide | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | EM / Selon convocation ; Cdt | DPS |
| Equipement personnel DPS + photo individuelle (1) | 849 / 070F4 ; 070F4 | F4 / FOBA / vide | G1 | C log / Resp equipement / AV / Selon convocation ; C log | FOBA |
| Fete Eau Lac (2) | 470,471 / 073F56 ; 073F56 | F5/6 / SIC / vide | G1 | Sur convocation ; C site | DPS |
| Integration personnel DAP (1) | 861 / 070F1 ; 070F1 | F1/8 / DAP / vide | Y1,Y2,Y3,Y4 | C DAP / QM / C sct DAP / FOBA 2 ; C DAP | DAP |
| Integration personnel DPS, phase I (1) | 852 / 070F1 ; 070F1 | F1/8 / DPS / vide | G1,C1,B1,B2 | C for / QM / FOBA 2 ; C for | DPS |
| Integration personnel DPS, phase II (4) | 854-857 / 070F1 ; 070F1 | F1/8 / DPS / vide | G1,C1,B1,B2 | C site / FOBA 2 ; C site | DPS |
| Journee des familles (6) | 437,443,445,446,502... / sans code ; sans Stat.Com | F1/8 / DPS et DAP / vide | B2,Y3,G1,Y1,C1,Y2 | EM / DPS ou DAP / Familles ; C site ou C sct | DPS |
| Journee des nouveaux habitants (1) | 612 / 070F1 ; 070F1 | F1/8 / DPS / vide | G1 | QM / Sur convocation ; QM | DPS |
| Nettoyage annuel caserne (4) | 459,460,462,463 / codes distincts selon site ; 040G1,040C1,040B1,040B2 | F4 / DPS / MAT | G1,C1,B1,B2 | Resp mat DPS / Preposes mat ; C log | DPS |
| Noel des familles (3) | 834,846,847 / sans code ; sans Stat.Com | F1/8 / DPS / vide | B1,G1,C1 | EM / DPS / JSP / Familles ; C site | DPS |
| Passeport-Vacances (1) | 727 / 070F56 ; 070F56 | F2/3 / SDIS / vide | G1 | Selon convocation ; C op | DPS |
| Preparation concours de la FVSP (8) | 53,67,107,148,193... / CONCOUR ; CONCOUR | F2/3 / FVSP / vide | aucun coche dans ces lignes | Equipes concours FVSP / Juges ; C op | DPS |
| Preparation Xmas (4) | 814-817 / codes distincts selon site ; 040G1,040C1,040B1,040B2 | F4 / DPS / MAT | G1,C1,B1,B2 | Resp mat DPS / Preposes mat ; C log | DPS |
| Repas du Permanent (1) | 465 / sans code ; sans Stat.Com | F1/8 / SDIS / PER | G1 | Permanent ; Cdt | DPS |
| Repetition garde drapeau RA'25 (1) | 859 / 071F3 ; 071F3 | F2/3 / SDIS / vide | G1,C1,Y3 | Garde drapeau ; C op | DPS |
| Seance chefs de section DPS (6) | 400,449,598,602,881... / 070F23 ; 070F23 | F2/3 / DPS / vide | G1,B1 | C site / C sct / Rempl C sct ; C site | DPS |
| Seance d'information JSP '26 (1) | 850 / 010JSP ; 010JSP | F1/8 / JSP / vide | aucun coche | Cdt / C JSP / Parents JSP ; C JSP | JSP |
| Seance de preparation concours de la FVSP (1) | 866 / CONCOUR ; CONCOUR | F2/3 / FVSP / vide | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | C op / SOF / Echelon 0 ; C op | DPS |
| Seance de preparation Telethon (1) | 525 / 070F23 ; 070F23 | F2/3 / SDIS / vide | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | Resp Telethon DPS, DAP et JSP ; QM | DPS |
| Seance des chefs de section DAP (3) | 420,620,898 / 070F23 ; 070F23 | F2/3 / DAP / vide | G1,Y1,Y2,Y3,Y4 | Cdt / QM / C for / C DAP / C sct ; C DAP | DAP |
| Seance photo du personnel DAP (1) | 719 / 070F56AV ; 070F56 | F5/6 / SIC / AV | Y3 | C sct / Echelon 0 a III ; C sct | DAP |
| Seance photo du personnel DPS (1) | 251 / 070F56AV ; 070F56 | F5/6 / SIC / AV | G1 | C site / DPS / FOBA 2 et 3 ; C site | DPS |
| Seance photo personnel DAP (2) | 593,707 / 070F56AV ; 070F56 | F5/6 / SIC / AV | Y2,Y4 | C sct / Echelon 0 a III ; C sct ou C site | DAP |
| Seance photo personnel DAP Y1 (1) | 566 / 070F56AV ; 070F56 | F5/6 / SIC / AV | Y1 | C sct / Echelon 0 a III ; C sct | DAP |
| Seance photo personnel DPS B1 (1) | 633 / 070F56AV ; 070F56 | F5/6 / SIC / AV | B1 | C site / DPS / FOBA 2 et 3 ; C site | DPS |
| Seance photo personnel DPS B2 (1) | 634 / 070F56AV ; 070F56 | F5/6 / SIC / AV | B2 | C site / DPS / FOBA 2 et 3 ; C site | DPS |
| Seance photo personnel DPS C1 (1) | 632 / 070F56AV ; 070F56 | F5/6 / SIC / AV | C1 | C site / DPS / FOBA 2 et 3 ; C site | DPS |
| Seance Preposes mat DPS (4) | 906-909 / 070F4DPS ; 070F4 | F4 / LOG / DPS | G1,C1,B1,B2 | C log / Resp mat DPS / Preposes mat ; C log ou Resp mat | DPS |
| Souper annuel (2) | 832,844 / 070F1 ; 070F1 | F1/8 / DPS / vide | G1,B2 | EM / DPS ; C site | DPS |
| Table ouverte avec le Commandant (2) | 473,787 / 070F1 ; 070F1 | F1/8 / vide / vide | aucun coche | Cdt ; Cdt | CMDT |
| Telethon (1) | 833 / sans code ; sans Stat.Com | F2/3 / SDIS / vide | G1,C1,B1,B2,Y1,Y2,Y3,Y4 | TOUS ; QM | DPS |
| Test de selection NUOVO (1) | 806 / 070F1NUOVO ; 070F1 | F1/8 / SDIS / NUOVO | G1,C1,B1 | EM / Echelons III et II selon convocation ; QM | DPS |
| Tir inter-unites (1) | 575 / 073F56 ; 073F56 | F5/6 / SIC / vide | G1 | Selon convocation ; Cdt | DPS |
| Vision locale DAP (4) | 118,119,182,183 / 070F4 ; 070F4 | F4 / DAP / vide | Y1,Y2,Y3,Y4 | C sct / C log / Resp mat DAP ; C log | DAP |
| Vision locale DPS (3) | 115,180,208 / 070F4 ; 070F4 | F4 / DPS / vide | B2,B1,C1 | C site / C log / Resp mat DPS ; C log | DPS |

Autres points MOA : valider la politique de correspondance entre la classification
fonctionnelle F1-F8 du Programme et le referentiel SQL `scope_domaines` avant toute
extension de ce dernier ; fournir, si souhaites, les libelles officiels complets
de F2, F3 et F7. Aucun domaine Gouvernance, F1 ou F8 individuel n'a ete attribue sans preuve.

## D. Tests et recette

- `node scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js` : 12/12 PASS (source directe, filtres OI/Domaine/Public, nettoyage OI, sauvegarde locale et reconduction).
- Les 16 suites `scripts/scope-qv-*-tests.js` : 365/365 PASS apres adaptation des attentes devenues obsoletes.
- `npm run check` : PASS.
- `npm run test:scope` : echec hors lot dans `scope-login-visual-alignment-orion-1-tests.js`, assertion de version CSS cache-bust ; non modifiee.
- Recette locale HTTP isolee : `GET /api/scope/quo-vadis/programmes/2027` sur port 4395, HTTP 200 ; 825 lignes dont 17 externes = 808 actives, exemples F5/6, F4, F1/8, F3 et OI controles. Aucune ecriture de production.
- Application locale disponible sur `http://127.0.0.1:4395/scope.html#/quo-vadis/programme`.
- Recette visuelle / clics dans le navigateur integre : **non effectuee** ; la connexion navigateur retourne `[]` malgre l'onglet ambiant. Ne pas qualifier cette recette de PASS.

## E. Fichiers et Git

Fichiers de ce lot : `assets/js/scope-ui-logic.js` (normalisation/format Programme),
`assets/js/scope-ui.js` (filtres et colonnes), `netlify/lib/_scope-quo-vadis-service.js`
(reclassement prouve et domaine SQL existant),
`scripts/scope-qv-programme-domain-oi-transversality-correctif-1-tests.js`
(nouveaux tests), et adaptations ciblees de cinq suites preexistantes :
`scope-qv-business-consolidation-tests.js`, `scope-qv-final-development-1-tests.js`,
`scope-qv-finalisation-local-tests.js`, `scope-qv-2027-post-recette-a-j-tests.js`,
`scope-qv-2027-moa-recette-correctif-1-tests.js`.

Branche et HEAD final inchanges (`a186bbee530cb40217034b2d27d5d08641703305`) ;
`git diff --check` : PASS. Aucun commit, push, PR, merge, deploiement, migration
ni modification des donnees de production. Le worktree reste volontairement sale,
y compris des modifications locales anterieures sans rapport avec ce lot.

# C15 — Preview QUO VADIS 2026

Dry-run déterministe. Aucune écriture DB ou opérationnelle.

## Source

- SHA-256 : `58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742`
- Empreinte preview : `63ba27e458286cd22f80fb6ef6d694765de02fa3d279b0893b7e13b7798f6b1c`
- Onglet : `QUO VADIS '26`
- Lignes physiques : 929
- Lignes événementielles : 925
- Colonnes métier : 48
- Libellés bruts distincts : 365

## Normalisation

- Activités racines : 345
- Thèmes distincts : 80
- Lignes avec thème : 166
- Lignes sans thème : 759
- Lignes multi-populations : 148

## Réconciliation

925 lignes source → 925 lignes regroupées → 345 propositions → 345 propositions classées.

| Décision | Propositions | Lignes source |
|---|---:|---:|
| AUTO_IMPORT | 296 | 825 |
| MERGE | 0 | 0 |
| REVIEW_REQUIRED | 2 | 7 |
| UNRESOLVED | 16 | 51 |
| IGNORED | 31 | 42 |

## Domaines proposés

Une activité multi-domaine est comptée dans chaque domaine associé.

| Domaine | Activités |
|---|---:|
| DPS | 98 |
| DAP | 58 |
| JSP | 53 |
| FOBA | 30 |
| FOCA | 1 |
| FOSPEC | 31 |
| AUTO | 68 |
| PR | 41 |

## Principaux regroupements

| Activité | Lignes | Occurrences |
|---|---:|---:|
| Conduite, formation continue | 74 | 36 |
| Instr demi-sct - KICK-OFF | 29 | 11 |
| Instr demi-sct - VARIA | 28 | 16 |
| Instr demi-sct - FEU | 18 | 6 |
| Exercice DPS-DAP 2 | 16 | 4 |
| Instr sct - KICK-OFF | 13 | 9 |
| Instr sct - VARIA | 13 | 8 |
| Séance EM | 11 | 11 |
| Séance Direction JSP | 11 | 11 |
| Instr demi-sct - ABC | 10 | 10 |
| Instr demi-sct - PIONNIER | 10 | 10 |
| Séance communication F5/6 | 9 | 9 |
| Formation MEA 1.2 | 9 | 9 |
| Formation MEA 2.2 | 9 | 9 |
| Séance Codir | 8 | 8 |

## Propositions

| Activité | Domaine | Lignes | Occurrences | Populations | Thèmes | Classe |
|---|---|---:|---:|---|---:|---|
| Assemblée CI | — | 2 | 2 | EM | 0 | UNRESOLVED |
| Assemblée des délégués de la FVSP | — | 1 | 1 | EM | 0 | UNRESOLVED |
| Assemblée générale de la SIC | — | 1 | 1 | — | 0 | UNRESOLVED |
| Conférence des Commandants | — | 1 | 1 | EM | 0 | UNRESOLVED |
| Cours ECA SP19 - ventilation opérationnelle | — | 2 | 2 | — | 0 | UNRESOLVED |
| Formation continue OACP CarPostal | — | 4 | 4 | — | 0 | UNRESOLVED |
| Formation personnel CFF | — | 7 | 7 | — | 0 | UNRESOLVED |
| Journée « Oser tous les métiers » (JOM) | — | 1 | 1 | — | 0 | UNRESOLVED |
| Séance Codir | — | 8 | 8 | EM | 0 | UNRESOLVED |
| Séance Codir + repas | — | 2 | 2 | EM | 0 | UNRESOLVED |
| Séance COSEC | — | 5 | 5 | EM | 4 | UNRESOLVED |
| Séance CRDIS | — | 2 | 2 | EM | 0 | UNRESOLVED |
| Séance EM | — | 11 | 11 | EM | 1 | UNRESOLVED |
| Séance interSDIS | — | 1 | 1 | — | 0 | UNRESOLVED |
| Table ouverte avec le Commandant | — | 2 | 2 | EM | 0 | UNRESOLVED |
| Visite du Conseil d'État | — | 1 | 1 | EM | 0 | UNRESOLVED |
| 8 km du SDIS | DPS | 1 | 1 | DAP, DPS, FOBA, JSP | 0 | AUTO_IMPORT |
| Cérémonie de promotion et nomination | DPS | 1 | 1 | DAP, DPS, EM | 0 | AUTO_IMPORT |
| Concours de la FVSP | DPS | 1 | 1 | DAP, DPS, JSP | 0 | AUTO_IMPORT |
| Cours de cadres exercice DPS 1 | DPS | 4 | 2 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice DPS 2 | DPS | 4 | 2 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice DPS 3 | DPS | 3 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice DPS-DAP 1 | DPS | 2 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice DPS-DAP 2 - reconnaissance lieux | DPS | 2 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Cours de cadres Formation groupée DPS | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cours de cadres interSDIS | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres SDIS Nord vaudois | DPS | 1 | 1 | DAP, DPS, EM | 0 | AUTO_IMPORT |
| Cursus « Notions d'administration publique » | DPS | 2 | 2 | DPS, EM | 1 | IGNORED |
| Cursus c groupe - module 1 | DPS | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus c groupe - module 2 | DPS | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus c groupe - module 3 | DPS | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus c groupe - module 4 | DPS | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - cours de cadres pour évaluateurs | DPS | 1 | 1 | DPS | 0 | IGNORED |
| Cursus CI DPS - module 1 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - module 10 | DPS | 2 | 2 | DPS | 1 | IGNORED |
| Cursus CI DPS - module 2 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - module 3 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - module 4 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - module 5 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus CI DPS - module 6 | DPS | 1 | 1 | DPS | 1 | IGNORED |
| Cursus CI DPS - module 7 | DPS | 1 | 1 | DPS | 1 | IGNORED |
| Cursus CI DPS - module 8 | DPS | 1 | 1 | DPS | 1 | IGNORED |
| Cursus CI DPS - module 9 | DPS | 1 | 1 | DPS | 1 | IGNORED |
| Entretien postulant échelons I et II | DPS | 3 | 3 | DAP, DPS, EM | 0 | IGNORED |
| Exercice DPS 1 | DPS | 4 | 2 | DPS, FOBA | 0 | AUTO_IMPORT |
| Exercice DPS 2 | DPS | 4 | 2 | DPS, FOBA | 0 | AUTO_IMPORT |
| Exercice DPS 3 | DPS | 3 | 1 | DPS, FOBA | 0 | AUTO_IMPORT |
| Exercice DPS-DAP 1 | DPS | 8 | 4 | DAP, DPS | 0 | AUTO_IMPORT |
| Exercice DPS-DAP 2 | DPS | 16 | 4 | DAP, DPS, FOBA | 0 | AUTO_IMPORT |
| Exercice engagement Incyte Biosciences | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Fête Eau Lac | DPS | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Formation BIKABLO | DPS | 4 | 4 | DAP, DPS, FOBA, JSP | 1 | AUTO_IMPORT |
| Formation groupée 1.1 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation groupée 1.2 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation groupée 1.3 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation groupée 1.4 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation groupée 1.5 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation groupée 1.6 | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Formation permanents | DPS | 7 | 7 | DPS | 7 | AUTO_IMPORT |
| Formation relation avec la presse | DPS | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Instr demi-sct - FEU | DPS | 18 | 6 | DPS | 0 | AUTO_IMPORT |
| Instr demi-sct - KICK-OFF | DPS | 29 | 11 | DPS | 0 | AUTO_IMPORT |
| Instr demi-sct - VARIA | DPS | 28 | 16 | DPS | 0 | AUTO_IMPORT |
| Instr sct - FEU | DPS | 8 | 3 | DPS | 0 | AUTO_IMPORT |
| Instr sct - KICK-OFF | DPS | 13 | 9 | DPS | 0 | AUTO_IMPORT |
| Instr sct - VARIA | DPS | 13 | 8 | DPS | 0 | AUTO_IMPORT |
| Intégration personnel DPS, phase I | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Intégration personnel DPS, phase II | DPS | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Journée des familles | DPS | 6 | 5 | DAP, DPS, EM | 0 | REVIEW_REQUIRED |
| Journée des nouveaux habitants | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Mise à niveau annuelle OSR | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Nettoyage annuel caserne | DPS | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Noël des familles | DPS | 3 | 3 | DPS, EM, JSP | 0 | AUTO_IMPORT |
| Passeport-Vacances | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Préparation concours de la FVSP | DPS | 8 | 8 | DAP, DPS, JSP | 1 | AUTO_IMPORT |
| Préparation cours de cadres SDIS Nord vaudois | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Préparation Revue Quinquennale | DPS | 3 | 2 | DAP, DPS, FOBA, JSP | 1 | AUTO_IMPORT |
| Préparation Xmas | DPS | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Rapport annuel | DPS | 1 | 1 | DAP, DPS, EM, JSP | 0 | AUTO_IMPORT |
| Reconnaissance DPS | DPS | 7 | 3 | DPS | 0 | AUTO_IMPORT |
| Recrutement cantonal | DPS | 8 | 1 | DAP, DPS, EM | 0 | AUTO_IMPORT |
| Refresh CI | DPS | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Repas du Permanent | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Répétition garde drapeau RA'25 | DPS | 1 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Revue Quinquennale SDIS Nord vaudois | DPS | 1 | 1 | DAP, DPS, EM, FOBA, JSP | 0 | AUTO_IMPORT |
| Séance audiovisuel et communication F5/6 | DPS | 1 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Séance cadres F5/6 | DPS | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Séance chefs de section DPS | DPS | 6 | 6 | DPS | 0 | AUTO_IMPORT |
| Séance chefs de section DPS C1 | DPS | 8 | 4 | DPS | 1 | AUTO_IMPORT |
| Séance commission d'instruction | DPS | 2 | 2 | DPS | 1 | AUTO_IMPORT |
| Séance communication F5/6 | DPS | 9 | 9 | DAP, DPS | 0 | AUTO_IMPORT |
| Séance de préparation concours de la FVSP | DPS | 1 | 1 | DAP, DPS, JSP | 0 | AUTO_IMPORT |
| Séance de préparation Téléthon | DPS | 1 | 1 | DAP, DPS, JSP | 0 | AUTO_IMPORT |
| Séance échelons II, III et IV | DPS | 2 | 2 | DAP, DPS, JSP | 0 | AUTO_IMPORT |
| Séance Fourriers DPS | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance instruction DPS | DPS | 4 | 3 | DPS | 0 | AUTO_IMPORT |
| Séance OSR | DPS | 2 | 2 | DPS, EM | 0 | AUTO_IMPORT |
| Séance personnel DPS | DPS | 4 | 2 | DPS | 1 | AUTO_IMPORT |
| Séance photo du personnel DPS | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance photo personnel DPS B1 | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance photo personnel DPS B2 | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance photo personnel DPS C1 | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance Préposés mat DPS | DPS | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance responsables MAT SDIS | DPS | 1 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Sécurité feu · Fête Médiévale | DPS | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Sécurité feu・Fête Nationale | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Sécurité feu・les Zôtres Brandons | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Souper annuel | DPS | 2 | 2 | DPS, EM | 0 | AUTO_IMPORT |
| Téléthon | DPS | 1 | 1 | DAP, DPS, JSP | 0 | AUTO_IMPORT |
| Test de sélection échelons I, II N'26 | DPS | 1 | 1 | DPS, EM | 0 | IGNORED |
| Test de sélection NUOVO | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Tir inter-unités | DPS | 1 | 1 | DPS, EM | 0 | AUTO_IMPORT |
| Tour de France Femmes '26 | DPS | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Vision locale DPS | DPS | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice DAP 1 | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Cours de cadres exercice DAP 2 | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Cours de cadres exercice DAP 3 | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Cours de cadres exercice DAP 4 | DAP | 4 | 3 | DAP | 0 | AUTO_IMPORT |
| Cursus CI DAP - module 1 | DAP | 1 | 1 | DAP, EM | 1 | AUTO_IMPORT |
| Cursus CI DAP - module 2 | DAP | 1 | 1 | DAP, EM | 1 | AUTO_IMPORT |
| Cursus CI DAP - module 3 | DAP | 1 | 1 | DAP, EM | 1 | AUTO_IMPORT |
| Cursus CI DAP - module 4 | DAP | 1 | 1 | DAP, EM | 1 | AUTO_IMPORT |
| Cursus CI DAP - module 5 | DAP | 1 | 1 | DAP, EM | 1 | AUTO_IMPORT |
| Exercice DAP 1 | DAP | 4 | 4 | DAP, FOBA | 0 | AUTO_IMPORT |
| Exercice DAP 2 | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Exercice DAP 3 | DAP | 4 | 4 | DAP, FOBA | 0 | AUTO_IMPORT |
| Exercice DAP 4 | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Exercice DAP 5 | DAP | 4 | 4 | DAP, FOBA | 0 | AUTO_IMPORT |
| Formation cadres DAP | DAP | 2 | 2 | DAP, EM | 0 | AUTO_IMPORT |
| Intégration personnel DAP | DAP | 1 | 1 | DAP, EM | 0 | AUTO_IMPORT |
| Reconnaissance DAP | DAP | 4 | 2 | DAP | 0 | AUTO_IMPORT |
| Séance cadres | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Séance des chefs de section DAP | DAP | 3 | 3 | DAP, EM | 0 | AUTO_IMPORT |
| Séance Fourriers DAP | DAP | 1 | 1 | DAP | 0 | AUTO_IMPORT |
| Séance instruction DAP | DAP | 4 | 3 | DAP | 0 | AUTO_IMPORT |
| Séance personnel DAP | DAP | 2 | 2 | DAP, EM | 1 | AUTO_IMPORT |
| Séance photo du personnel DAP | DAP | 1 | 1 | DAP | 0 | AUTO_IMPORT |
| Séance photo personnel DAP | DAP | 2 | 2 | DAP | 0 | AUTO_IMPORT |
| Séance photo personnel DAP Y1 | DAP | 1 | 1 | DAP | 0 | AUTO_IMPORT |
| Soirée information DAP Y1 | DAP | 1 | 1 | DAP, EM | 0 | AUTO_IMPORT |
| Soirée information DAP Y2 | DAP | 1 | 1 | DAP, EM | 0 | AUTO_IMPORT |
| Soirée information DAP Y3 | DAP | 1 | 1 | DAP, EM | 0 | AUTO_IMPORT |
| Soirée information DAP Y4 | DAP | 1 | 1 | DAP, EM | 0 | AUTO_IMPORT |
| Vision locale DAP | DAP | 4 | 4 | DAP | 0 | AUTO_IMPORT |
| Assemblée GVJSP | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Championnat suisses JSP | JSP | 2 | 2 | JSP | 0 | AUTO_IMPORT |
| Cours de cadres formation groupée JSP | JSP | 1 | 1 | — | 0 | REVIEW_REQUIRED |
| Cours JSP JS03 - flamme 3 JSP | JSP | 1 | 1 | JSP | 0 | IGNORED |
| Cours JSP JS11 - Journée d'instruction JSP (après-midi) | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS11 - Journée d'instruction JSP (matin) | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS12 - Journée d'instruction des Moniteurs Cadets | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS21 - valorisation moniteurs - module I | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS22 - valorisation moniteurs - module II | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS23 - formation moniteurs - simulateur (après-midi) | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS23 - formation moniteurs - simulateur (matin) | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours JSP JS24 - valorisation moniteurs - module III | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cursus JSP - module 1 | JSP | 2 | 2 | JSP | 1 | AUTO_IMPORT |
| Cursus JSP - module 2 | JSP | 2 | 2 | JSP | 1 | AUTO_IMPORT |
| Échange tenue | JSP | 2 | 2 | JSP | 1 | AUTO_IMPORT |
| Exercice JSP 1 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 10 | JSP | 2 | 2 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 2 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 3 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 4 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 5 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 6 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 7 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 8 | JSP | 3 | 3 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP 9 | JSP | 2 | 2 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP Cadets 1 | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Exercice JSP Cadets 2 | JSP | 1 | 1 | JSP | 1 | AUTO_IMPORT |
| Formation CEMEA, module 1 | JSP | 1 | 1 | JSP | 1 | AUTO_IMPORT |
| Formation CEMEA, module 2 | JSP | 1 | 1 | JSP | 1 | AUTO_IMPORT |
| Formation CEMEA, module 3 | JSP | 1 | 1 | JSP | 1 | AUTO_IMPORT |
| Formation CEMEA, module 4 | JSP | 1 | 1 | JSP | 1 | AUTO_IMPORT |
| Formation groupée JSP | JSP | 4 | 4 | JSP | 1 | AUTO_IMPORT |
| Grillades des JSP Nord vaudois | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Groupe de travail JSP | JSP | 6 | 6 | EM, JSP | 0 | AUTO_IMPORT |
| Séance cadres JSP | JSP | 2 | 2 | JSP | 2 | AUTO_IMPORT |
| Séance d'information JSP '26 | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Séance Direction JSP | JSP | 11 | 11 | JSP | 0 | AUTO_IMPORT |
| Séance instruction JSP | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Séance interne cadres JSP | JSP | 3 | 2 | JSP | 0 | AUTO_IMPORT |
| Soirée des présidents JSP | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Test flammes 1 | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Test flammes 2 | JSP | 1 | 1 | JSP | 0 | AUTO_IMPORT |
| Cours de cadres FOBA | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Cours ECA FB01 - formation de base recrues | FOBA | 2 | 2 | — | 0 | AUTO_IMPORT |
| Entretien de collaboration avec Commandant | FOBA | 2 | 2 | DPS, EM | 0 | AUTO_IMPORT |
| Équipement des recrues FOBA 1 | FOBA | 1 | 1 | FOBA | 1 | AUTO_IMPORT |
| Équipement personnel DPS + photo individuelle | FOBA | 1 | 1 | DPS, FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA | FOBA | 3 | 3 | FOBA | 3 | AUTO_IMPORT |
| Exercice FOBA 1 | FOBA | 1 | 1 | EM, FOBA | 1 | AUTO_IMPORT |
| Exercice FOBA 10 | FOBA | 1 | 1 | EM, FOBA | 1 | AUTO_IMPORT |
| Exercice FOBA 2 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 3 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 4 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 5 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 6 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 7 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 8 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Exercice FOBA 9 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Introduction PIONNIER | FOBA | 1 | 1 | DPS, FOBA | 0 | AUTO_IMPORT |
| Remise équipement des recrues FOBA 1 | FOBA | 1 | 1 | FOBA | 0 | AUTO_IMPORT |
| Test annuel FOBA | FOBA | 1 | 1 | EM, FOBA | 0 | AUTO_IMPORT |
| Groupe de travail FOCA | FOCA | 6 | 1 | EM | 0 | AUTO_IMPORT |
| BLS | FOSPEC | 2 | 2 | DPS | 1 | IGNORED |
| Cours de cadres Formation ABC | FOSPEC | 1 | 1 | DPS, EM | 0 | IGNORED |
| Cours de cadres Formation cadres ABC | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres recyclage BLS | FOSPEC | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cours ECA SA10 - cours de cadres - répondant de la formation antichute | FOSPEC | 2 | 2 | — | 0 | IGNORED |
| Cours ECA SA10 - répondant de la formation antichute | FOSPEC | 4 | 4 | — | 0 | IGNORED |
| Cours ECA SA11 - recyclage répondant de la formation antichute | FOSPEC | 2 | 2 | — | 0 | AUTO_IMPORT |
| Cursus OFSI - formation de base | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cursus opérateur VPC - module 1 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice OFSI・infrastructures CFF | FOSPEC | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Formation ABC | FOSPEC | 3 | 3 | DPS | 0 | IGNORED |
| Formation antichute | FOSPEC | 2 | 2 | DAP, DPS | 0 | AUTO_IMPORT |
| Formation cadres ABC | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation NAC 1.1 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation NAC 1.2 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 1.1 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 1.2 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 1.3 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 1.4 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 2.1 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 2.2 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 2.3 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation opérateur VPC 2.4 | FOSPEC | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation Travail en hauteur et antichute | FOSPEC | 1 | 1 | DAP, DPS | 0 | AUTO_IMPORT |
| Instr demi-sct - ABC | FOSPEC | 10 | 10 | DPS | 0 | AUTO_IMPORT |
| Instr demi-sct - PIONNIER | FOSPEC | 10 | 10 | DPS | 0 | AUTO_IMPORT |
| Instr sct - ABC | FOSPEC | 5 | 5 | DPS | 0 | AUTO_IMPORT |
| Instr sct - PIONNIER CSU-nvb | FOSPEC | 5 | 5 | DPS | 0 | AUTO_IMPORT |
| Journée des Commandants ABC | FOSPEC | 1 | 1 | EM | 0 | AUTO_IMPORT |
| Recyclage BLS | FOSPEC | 6 | 6 | DAP, DPS | 1 | AUTO_IMPORT |
| Conduite TP9000, formation continue 1.0 | AUTO | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Conduite TP9000, formation continue 1.1 | AUTO | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Conduite TP9000, formation continue 1.2 | AUTO | 7 | 7 | DPS | 0 | AUTO_IMPORT |
| Conduite TP9000, formation continue 2.0 | AUTO | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Conduite TP9000, formation continue 2.1 | AUTO | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Conduite TP9000, formation continue 2.2 | AUTO | 8 | 8 | DPS | 0 | AUTO_IMPORT |
| Conduite, formation continue | AUTO | 74 | 36 | DAP, DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice CAR | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres exercice TRUCK | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres Formateurs cursus MEA | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres Formateurs MEA 1 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres Formateurs MEA 2 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres formation annuelle Grutiers | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres formation pilote BAT 1 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres formation pilote BAT 2 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres moniteurs AUTO | AUTO | 2 | 2 | DAP, DPS | 0 | AUTO_IMPORT |
| Cursus cond VL - module 1.0 | AUTO | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus cond VL - module 2.0 | AUTO | 7 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus cond VL - module 3.1 | AUTO | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus cond VL - module 3.2 | AUTO | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus cond VL - module 4.1 | AUTO | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus cond VL - module 4.2 | AUTO | 1 | 1 | DAP, DPS | 1 | AUTO_IMPORT |
| Cursus élévateur à timon S2 - module 1 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cursus MEA - module 1.0 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cursus MEA - module 2.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 2.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 3.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 3.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 4.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 4.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 5.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 5.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 6.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 6.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 7.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 7.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 8.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 8.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 9.1 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus MEA - module 9.2 | AUTO | 1 | 1 | DPS | 0 | IGNORED |
| Cursus TP9 - conduite libre | AUTO | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Cursus TP9 - module 1 | AUTO | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus TP9 - module 2 | AUTO | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus TP9 - module 3.1 | AUTO | 4 | 4 | DPS | 1 | AUTO_IMPORT |
| Cursus TP9 - module 3.2 | AUTO | 4 | 4 | DPS | 1 | AUTO_IMPORT |
| Exercice CAR 1.1 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice CAR 1.2 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice CAR 1.3 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice CAR 1.4 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice CAR 1.5 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice TRUCK 1.1 | AUTO | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice TRUCK 1.2 | AUTO | 4 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice TRUCK 1.3 | AUTO | 3 | 1 | DPS | 0 | AUTO_IMPORT |
| Exercice TRUCK 1.4 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Formation grutier 1.0 | AUTO | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Formation grutier 1.2 | AUTO | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Formation grutier 2.0 | AUTO | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Formation grutier 2.2 | AUTO | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 1.0 | AUTO | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 1.1 | AUTO | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 1.2 | AUTO | 9 | 9 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 2.0 | AUTO | 4 | 4 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 2.1 | AUTO | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Formation MEA 2.2 | AUTO | 9 | 9 | DPS | 0 | AUTO_IMPORT |
| Formation pilote BAT 1 | AUTO | 6 | 6 | DPS | 1 | AUTO_IMPORT |
| Formation pilote BAT 2 | AUTO | 6 | 6 | DPS | 1 | AUTO_IMPORT |
| Formation véhicule d'urgence | AUTO | 4 | 4 | DPS | 3 | AUTO_IMPORT |
| Test de sélection cond PL N'26 | AUTO | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cours de cadres PR | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Cursus PAPR - module 1 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 2 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 3 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 4 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 5 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 6 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Cursus PAPR - module 7 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.1 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.2 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.3 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.4 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.5 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 1.6 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.1 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.2 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.3 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.4 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.5 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 2.6 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.1 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.2 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.3 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.4 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.5 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 3.6 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.1 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.2 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.3 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.4 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.5 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR 4.6 | PR | 1 | 1 | DPS | 1 | AUTO_IMPORT |
| Exercice PR-ABC | PR | 3 | 3 | DPS, JSP | 1 | AUTO_IMPORT |
| Formation engagement pratique PR | PR | 2 | 2 | DPS | 0 | AUTO_IMPORT |
| Piste entraînement PAPR 1 | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Piste entraînement PAPR 2 | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Piste entraînement PAPR 3 | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Piste entraînement PAPR 4 | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Séance préposés APR | PR | 3 | 3 | DPS | 0 | AUTO_IMPORT |
| Sortie des formateurs PR | PR | 1 | 1 | DPS | 0 | AUTO_IMPORT |
| Test de sélection PAPR N'27 | PR | 2 | 2 | DPS | 2 | AUTO_IMPORT |

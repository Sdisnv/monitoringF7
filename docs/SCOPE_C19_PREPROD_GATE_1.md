# C19 — QUO VADIS 2026/2027 — Preprod Gate 1

Verdict global : **NOK**. Dry-run strict, aucune écriture opérationnelle.

## Sources et matrice de vérité

| Domaine | Donnée | Source | Valeur | Preuve | Utilisation C19 | Confiance | Arbitrage |
|---|---|---|---|---|---|---|---|
| QUO VADIS 2026 | Classeur source | /Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx | 58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742 | Empreinte SHA-256 recalculée | Analyse et réconciliation | HAUT | NON |
| Stat.Com | Référentiel initial et successions | netlify/lib/_scope-statcom-referential.js | 91 codes; 1 succession(s) | Exports exécutables | Validation par date | HAUT | NON |
| Domaines | Domaines canoniques | netlify/lib/_scope-canonical-foundations.js | DPS, DAP, JSP, FOBA, FOCO, FOCA, FOSPEC, AUTO, PR | Constante exportée | Classification C19 | HAUT | NON |
| OI | Unités organisationnelles | netlify/lib/_scope-canonical-foundations.js | 8 OI | Constante exportée | Cibles/OI | HAUT | NON |
| Publics | Publics canoniques | netlify/lib/_scope-public-foundations.js | 21 publics; 12 candidats non résolus | Constantes exportées | Résolution public | MOYEN | OUI |
| Lieux | Lieux officiels SCOPE | netlify/lib/_scope-quo-vadis-referentials.js | 8 lieux | Constante exportée | Placement | HAUT | NON |
| Salles | Salles de théorie | netlify/lib/_scope-quo-vadis-referentials.js | 11 salles | Constante exportée | Placement/conflits | HAUT | NON |
| Calendrier 2026 | Fériés et vacances | État de Vaud | https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2026 | Page officielle consultée le 2026-09-29 | Marqueurs calendaires | HAUT | NON |
| Calendrier 2027 | Fériés et vacances | État de Vaud | https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2027 | Page officielle consultée le 2026-09-29 | Marqueurs calendaires | HAUT | NON |
| Veilles | Règle métier | Aucune source canonique trouvée | MANQUANTE | Recherche code/docs | Aucune règle appliquée | FAIBLE | OUI |
| Tournus CTA | Ordre/périodicité sections et demi-sections | Aucune source canonique trouvée | MANQUANTE | Recherche code/docs et historique 2026 | Aucune génération CTA | FAIBLE | OUI |
| Rôles/Ressources | Affectations 2027 par activité | Aucune règle complète trouvée | PARTIEL | Référentiels UX seulement | Non inventés dans le dry-run | FAIBLE | OUI |

## Gate 1 — Réconciliation 2026

847 lignes datées 2026 → 847 analysées → 318 définitions → 689 occurrences → 847 sessions → 225 dates distinctes. Pertes silencieuses : **0**. Les doublons potentiels (5 groupes, 10 lignes) restent tracés, jamais supprimés automatiquement.

Classification des lignes : UNRESOLVED=48, AUTO_IMPORT=750, IGNORED=42, REVIEW_REQUIRED=7.

## Calendrier officiel

Sources : [2026](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2026) et [2027](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2027), consultées le 29.09.2026. Les faits calendaires sont intégrés au rapport; les règles métier de veille ou d’évitement restent **À ARBITRER**.

## Tournus CTA

**NOK — source canonique introuvable.** Les libellés historiques de sections/demi-sections ne démontrent ni ordre, ni périodicité, ni algorithme. Aucune seconde logique CTA n’a été créée.

## Gate 3 — Programme 2027 à blanc

72 événements explicitement datés dans le classeur sont chargés en preview, du 2027-01-05 au 2027-03-04, avec provenance `SOURCE_WORKBOOK_DATE`. Ce jeu est réel mais partiel; il ne constitue pas un programme annuel complet. Aucun historique 2026 n’a été reconduit sans décision.

### Lignes sans date

| Ligne | Activité | Horaire | Statut |
|---:|---|---|---|
| 924 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |
| 925 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |
| 926 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |
| 927 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |
| 928 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |
| 929 | Groupe de travail FOCA | 16:00–19:00 | DATE MANQUANTE |

### Activités 2026 absentes de la source 2027 explicite

> La source 2027 s’arrête au 4 mars : ces absences sont des arbitrages, pas des suppressions démontrées.

| Activité | Domaine | Lignes 2026 | Statut |
|---|---|---:|---|
| Assemblée CI | — | 2 | À ARBITRER |
| Assemblée des délégués de la FVSP | — | 1 | À ARBITRER |
| Assemblée générale de la SIC | — | 1 | À ARBITRER |
| Conférence des Commandants | — | 1 | À ARBITRER |
| Cours ECA SP19 - ventilation opérationnelle | — | 2 | À ARBITRER |
| Formation continue OACP CarPostal | — | 4 | À ARBITRER |
| Formation personnel CFF | — | 7 | À ARBITRER |
| Journée « Oser tous les métiers » (JOM) | — | 1 | À ARBITRER |
| Séance Codir + repas | — | 2 | À ARBITRER |
| Séance COSEC | — | 5 | À ARBITRER |
| Séance CRDIS | — | 2 | À ARBITRER |
| Séance interSDIS | — | 1 | À ARBITRER |
| Table ouverte avec le Commandant | — | 2 | À ARBITRER |
| Visite du Conseil d'État | — | 1 | À ARBITRER |
| 8 km du SDIS | DPS | 1 | À ARBITRER |
| Cérémonie de promotion et nomination | DPS | 1 | À ARBITRER |
| Concours de la FVSP | DPS | 1 | À ARBITRER |
| Cours de cadres exercice DPS 1 | DPS | 4 | À ARBITRER |
| Cours de cadres exercice DPS 2 | DPS | 4 | À ARBITRER |
| Cours de cadres exercice DPS 3 | DPS | 3 | À ARBITRER |
| Cours de cadres exercice DPS-DAP 1 | DPS | 2 | À ARBITRER |
| Cours de cadres exercice DPS-DAP 2 - reconnaissance lieux | DPS | 2 | À ARBITRER |
| Cours de cadres Formation groupée DPS | DPS | 1 | À ARBITRER |
| Cours de cadres interSDIS | DPS | 1 | À ARBITRER |
| Cours de cadres SDIS Nord vaudois | DPS | 1 | À ARBITRER |
| Cursus « Notions d'administration publique » | DPS | 2 | À ARBITRER |
| Cursus c groupe - module 1 | DPS | 1 | À ARBITRER |
| Cursus c groupe - module 2 | DPS | 1 | À ARBITRER |
| Cursus c groupe - module 3 | DPS | 1 | À ARBITRER |
| Cursus c groupe - module 4 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - cours de cadres pour évaluateurs | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 1 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 10 | DPS | 2 | À ARBITRER |
| Cursus CI DPS - module 2 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 3 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 4 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 5 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 6 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 7 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 8 | DPS | 1 | À ARBITRER |
| Cursus CI DPS - module 9 | DPS | 1 | À ARBITRER |
| Entretien postulant échelons I et II | DPS | 3 | À ARBITRER |
| Exercice DPS 1 | DPS | 4 | À ARBITRER |
| Exercice DPS 2 | DPS | 4 | À ARBITRER |
| Exercice DPS 3 | DPS | 3 | À ARBITRER |
| Exercice DPS-DAP 1 | DPS | 8 | À ARBITRER |
| Exercice DPS-DAP 2 | DPS | 16 | À ARBITRER |
| Exercice engagement Incyte Biosciences | DPS | 1 | À ARBITRER |
| Fête Eau Lac | DPS | 2 | À ARBITRER |
| Formation BIKABLO | DPS | 4 | À ARBITRER |
| Formation groupée 1.1 | DPS | 1 | À ARBITRER |
| Formation groupée 1.2 | DPS | 1 | À ARBITRER |
| Formation groupée 1.3 | DPS | 1 | À ARBITRER |
| Formation groupée 1.4 | DPS | 1 | À ARBITRER |
| Formation groupée 1.5 | DPS | 1 | À ARBITRER |
| Formation groupée 1.6 | DPS | 1 | À ARBITRER |
| Formation permanents | DPS | 7 | À ARBITRER |
| Formation relation avec la presse | DPS | 4 | À ARBITRER |
| Instr demi-sct - FEU | DPS | 18 | À ARBITRER |
| Instr demi-sct - VARIA | DPS | 28 | À ARBITRER |
| Instr sct - FEU | DPS | 8 | À ARBITRER |
| Instr sct - KICK-OFF | DPS | 13 | À ARBITRER |
| Instr sct - VARIA | DPS | 13 | À ARBITRER |
| Journée des familles | DPS | 6 | À ARBITRER |
| Journée des nouveaux habitants | DPS | 1 | À ARBITRER |
| Mise à niveau annuelle OSR | DPS | 1 | À ARBITRER |
| Nettoyage annuel caserne | DPS | 4 | À ARBITRER |
| Noël des familles | DPS | 3 | À ARBITRER |
| Passeport-Vacances | DPS | 1 | À ARBITRER |
| Préparation concours de la FVSP | DPS | 8 | À ARBITRER |
| Préparation cours de cadres SDIS Nord vaudois | DPS | 1 | À ARBITRER |
| Préparation Revue Quinquennale | DPS | 3 | À ARBITRER |
| Préparation Xmas | DPS | 4 | À ARBITRER |
| Reconnaissance DPS | DPS | 7 | À ARBITRER |
| Recrutement cantonal | DPS | 8 | À ARBITRER |
| Refresh CI | DPS | 1 | À ARBITRER |
| Repas du Permanent | DPS | 1 | À ARBITRER |
| Revue Quinquennale SDIS Nord vaudois | DPS | 1 | À ARBITRER |
| Séance commission d'instruction | DPS | 2 | À ARBITRER |
| Séance de préparation Téléthon | DPS | 1 | À ARBITRER |
| Séance OSR | DPS | 2 | À ARBITRER |
| Séance photo du personnel DPS | DPS | 1 | À ARBITRER |
| Séance photo personnel DPS B1 | DPS | 1 | À ARBITRER |
| Séance photo personnel DPS B2 | DPS | 1 | À ARBITRER |
| Séance photo personnel DPS C1 | DPS | 1 | À ARBITRER |
| Sécurité feu · Fête Médiévale | DPS | 4 | À ARBITRER |
| Sécurité feu・Fête Nationale | DPS | 1 | À ARBITRER |
| Sécurité feu・les Zôtres Brandons | DPS | 1 | À ARBITRER |
| Souper annuel | DPS | 2 | À ARBITRER |
| Téléthon | DPS | 1 | À ARBITRER |
| Test de sélection échelons I, II N'26 | DPS | 1 | À ARBITRER |
| Test de sélection NUOVO | DPS | 1 | À ARBITRER |
| Tir inter-unités | DPS | 1 | À ARBITRER |
| Tour de France Femmes '26 | DPS | 1 | À ARBITRER |
| Vision locale DPS | DPS | 3 | À ARBITRER |
| Cours de cadres exercice DAP 1 | DAP | 4 | À ARBITRER |
| Cours de cadres exercice DAP 2 | DAP | 4 | À ARBITRER |
| Cours de cadres exercice DAP 3 | DAP | 4 | À ARBITRER |
| Cours de cadres exercice DAP 4 | DAP | 4 | À ARBITRER |
| Cursus CI DAP - module 1 | DAP | 1 | À ARBITRER |
| Cursus CI DAP - module 2 | DAP | 1 | À ARBITRER |
| Cursus CI DAP - module 3 | DAP | 1 | À ARBITRER |
| Cursus CI DAP - module 4 | DAP | 1 | À ARBITRER |
| Cursus CI DAP - module 5 | DAP | 1 | À ARBITRER |
| Exercice DAP 1 | DAP | 4 | À ARBITRER |
| Exercice DAP 2 | DAP | 4 | À ARBITRER |
| Exercice DAP 3 | DAP | 4 | À ARBITRER |
| Exercice DAP 4 | DAP | 4 | À ARBITRER |
| Exercice DAP 5 | DAP | 4 | À ARBITRER |
| Formation cadres DAP | DAP | 2 | À ARBITRER |
| Reconnaissance DAP | DAP | 4 | À ARBITRER |
| Séance cadres | DAP | 4 | À ARBITRER |
| Séance photo du personnel DAP | DAP | 1 | À ARBITRER |
| Séance photo personnel DAP | DAP | 2 | À ARBITRER |
| Séance photo personnel DAP Y1 | DAP | 1 | À ARBITRER |
| Soirée information DAP Y1 | DAP | 1 | À ARBITRER |
| Soirée information DAP Y2 | DAP | 1 | À ARBITRER |
| Soirée information DAP Y3 | DAP | 1 | À ARBITRER |
| Soirée information DAP Y4 | DAP | 1 | À ARBITRER |
| Vision locale DAP | DAP | 4 | À ARBITRER |
| Assemblée GVJSP | JSP | 1 | À ARBITRER |
| Championnat suisses JSP | JSP | 2 | À ARBITRER |
| Cours de cadres formation groupée JSP | JSP | 1 | À ARBITRER |
| Cours JSP JS03 - flamme 3 JSP | JSP | 1 | À ARBITRER |
| Cours JSP JS11 - Journée d'instruction JSP (après-midi) | JSP | 1 | À ARBITRER |
| Cours JSP JS11 - Journée d'instruction JSP (matin) | JSP | 1 | À ARBITRER |
| Cours JSP JS12 - Journée d'instruction des Moniteurs Cadets | JSP | 1 | À ARBITRER |
| Cours JSP JS21 - valorisation moniteurs - module I | JSP | 1 | À ARBITRER |
| Cours JSP JS22 - valorisation moniteurs - module II | JSP | 1 | À ARBITRER |
| Cours JSP JS23 - formation moniteurs - simulateur (après-midi) | JSP | 1 | À ARBITRER |
| Cours JSP JS23 - formation moniteurs - simulateur (matin) | JSP | 1 | À ARBITRER |
| Cours JSP JS24 - valorisation moniteurs - module III | JSP | 1 | À ARBITRER |
| Exercice JSP 10 | JSP | 2 | À ARBITRER |
| Exercice JSP 3 | JSP | 3 | À ARBITRER |
| Exercice JSP 4 | JSP | 3 | À ARBITRER |
| Exercice JSP 5 | JSP | 3 | À ARBITRER |
| Exercice JSP 6 | JSP | 3 | À ARBITRER |
| Exercice JSP 7 | JSP | 3 | À ARBITRER |
| Exercice JSP 8 | JSP | 3 | À ARBITRER |
| Exercice JSP 9 | JSP | 2 | À ARBITRER |
| Exercice JSP Cadets 1 | JSP | 1 | À ARBITRER |
| Exercice JSP Cadets 2 | JSP | 1 | À ARBITRER |
| Formation CEMEA, module 1 | JSP | 1 | À ARBITRER |
| Formation CEMEA, module 2 | JSP | 1 | À ARBITRER |
| Formation CEMEA, module 3 | JSP | 1 | À ARBITRER |
| Formation CEMEA, module 4 | JSP | 1 | À ARBITRER |
| Formation groupée JSP | JSP | 4 | À ARBITRER |
| Grillades des JSP Nord vaudois | JSP | 1 | À ARBITRER |
| Groupe de travail JSP | JSP | 6 | À ARBITRER |
| Séance d'information JSP '26 | JSP | 1 | À ARBITRER |
| Séance instruction JSP | JSP | 1 | À ARBITRER |
| Séance interne cadres JSP | JSP | 3 | À ARBITRER |
| Soirée des présidents JSP | JSP | 1 | À ARBITRER |
| Test flammes 1 | JSP | 1 | À ARBITRER |
| Test flammes 2 | JSP | 1 | À ARBITRER |
| Cours ECA FB01 - formation de base recrues | FOBA | 2 | À ARBITRER |
| Entretien de collaboration avec Commandant | FOBA | 2 | À ARBITRER |
| Équipement personnel DPS + photo individuelle | FOBA | 1 | À ARBITRER |
| Exercice FOBA | FOBA | 3 | À ARBITRER |
| Exercice FOBA 1 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 10 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 2 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 3 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 4 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 5 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 6 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 7 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 8 | FOBA | 1 | À ARBITRER |
| Exercice FOBA 9 | FOBA | 1 | À ARBITRER |
| Introduction PIONNIER | FOBA | 1 | À ARBITRER |
| Remise équipement des recrues FOBA 1 | FOBA | 1 | À ARBITRER |
| Test annuel FOBA | FOBA | 1 | À ARBITRER |
| BLS | FOSPEC | 2 | À ARBITRER |
| Cours de cadres Formation ABC | FOSPEC | 1 | À ARBITRER |
| Cours de cadres Formation cadres ABC | FOSPEC | 1 | À ARBITRER |
| Cours de cadres recyclage BLS | FOSPEC | 1 | À ARBITRER |
| Cours ECA SA10 - cours de cadres - répondant de la formation antichute | FOSPEC | 2 | À ARBITRER |
| Cours ECA SA10 - répondant de la formation antichute | FOSPEC | 4 | À ARBITRER |
| Cours ECA SA11 - recyclage répondant de la formation antichute | FOSPEC | 2 | À ARBITRER |
| Cursus OFSI - formation de base | FOSPEC | 1 | À ARBITRER |
| Cursus opérateur VPC - module 1 | FOSPEC | 1 | À ARBITRER |
| Exercice OFSI・infrastructures CFF | FOSPEC | 4 | À ARBITRER |
| Formation ABC | FOSPEC | 3 | À ARBITRER |
| Formation antichute | FOSPEC | 2 | À ARBITRER |
| Formation cadres ABC | FOSPEC | 1 | À ARBITRER |
| Formation NAC 1.1 | FOSPEC | 1 | À ARBITRER |
| Formation NAC 1.2 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 1.1 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 1.2 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 1.3 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 1.4 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 2.1 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 2.2 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 2.3 | FOSPEC | 1 | À ARBITRER |
| Formation opérateur VPC 2.4 | FOSPEC | 1 | À ARBITRER |
| Formation Travail en hauteur et antichute | FOSPEC | 1 | À ARBITRER |
| Instr demi-sct - ABC | FOSPEC | 10 | À ARBITRER |
| Instr demi-sct - PIONNIER | FOSPEC | 10 | À ARBITRER |
| Instr sct - ABC | FOSPEC | 5 | À ARBITRER |
| Instr sct - PIONNIER CSU-nvb | FOSPEC | 5 | À ARBITRER |
| Journée des Commandants ABC | FOSPEC | 1 | À ARBITRER |
| Recyclage BLS | FOSPEC | 6 | À ARBITRER |
| Conduite TP9000, formation continue 1.0 | AUTO | 4 | À ARBITRER |
| Conduite TP9000, formation continue 1.1 | AUTO | 3 | À ARBITRER |
| Conduite TP9000, formation continue 1.2 | AUTO | 7 | À ARBITRER |
| Conduite TP9000, formation continue 2.0 | AUTO | 4 | À ARBITRER |
| Conduite TP9000, formation continue 2.1 | AUTO | 4 | À ARBITRER |
| Conduite TP9000, formation continue 2.2 | AUTO | 8 | À ARBITRER |
| Cours de cadres exercice CAR | AUTO | 1 | À ARBITRER |
| Cours de cadres exercice TRUCK | AUTO | 1 | À ARBITRER |
| Cours de cadres Formateurs MEA 2 | AUTO | 1 | À ARBITRER |
| Cours de cadres formation pilote BAT 1 | AUTO | 1 | À ARBITRER |
| Cours de cadres formation pilote BAT 2 | AUTO | 1 | À ARBITRER |
| Cursus cond VL - module 2.0 | AUTO | 7 | À ARBITRER |
| Cursus cond VL - module 3.1 | AUTO | 1 | À ARBITRER |
| Cursus cond VL - module 3.2 | AUTO | 1 | À ARBITRER |
| Cursus cond VL - module 4.1 | AUTO | 1 | À ARBITRER |
| Cursus cond VL - module 4.2 | AUTO | 1 | À ARBITRER |
| Cursus élévateur à timon S2 - module 1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 2.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 2.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 3.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 3.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 4.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 4.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 5.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 5.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 6.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 6.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 7.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 7.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 8.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 8.2 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 9.1 | AUTO | 1 | À ARBITRER |
| Cursus MEA - module 9.2 | AUTO | 1 | À ARBITRER |
| Cursus TP9 - conduite libre | AUTO | 2 | À ARBITRER |
| Cursus TP9 - module 1 | AUTO | 1 | À ARBITRER |
| Cursus TP9 - module 2 | AUTO | 1 | À ARBITRER |
| Cursus TP9 - module 3.1 | AUTO | 4 | À ARBITRER |
| Cursus TP9 - module 3.2 | AUTO | 4 | À ARBITRER |
| Exercice CAR 1.1 | AUTO | 1 | À ARBITRER |
| Exercice CAR 1.2 | AUTO | 1 | À ARBITRER |
| Exercice CAR 1.3 | AUTO | 1 | À ARBITRER |
| Exercice CAR 1.4 | AUTO | 1 | À ARBITRER |
| Exercice CAR 1.5 | AUTO | 1 | À ARBITRER |
| Exercice TRUCK 1.1 | AUTO | 4 | À ARBITRER |
| Exercice TRUCK 1.2 | AUTO | 4 | À ARBITRER |
| Exercice TRUCK 1.3 | AUTO | 3 | À ARBITRER |
| Exercice TRUCK 1.4 | AUTO | 1 | À ARBITRER |
| Formation grutier 1.0 | AUTO | 2 | À ARBITRER |
| Formation grutier 1.2 | AUTO | 3 | À ARBITRER |
| Formation grutier 2.0 | AUTO | 2 | À ARBITRER |
| Formation grutier 2.2 | AUTO | 3 | À ARBITRER |
| Formation MEA 1.0 | AUTO | 4 | À ARBITRER |
| Formation MEA 1.1 | AUTO | 2 | À ARBITRER |
| Formation MEA 1.2 | AUTO | 9 | À ARBITRER |
| Formation MEA 2.0 | AUTO | 4 | À ARBITRER |
| Formation MEA 2.1 | AUTO | 2 | À ARBITRER |
| Formation MEA 2.2 | AUTO | 9 | À ARBITRER |
| Formation pilote BAT 1 | AUTO | 6 | À ARBITRER |
| Formation pilote BAT 2 | AUTO | 6 | À ARBITRER |
| Formation véhicule d'urgence | AUTO | 4 | À ARBITRER |
| Test de sélection cond PL N'26 | AUTO | 1 | À ARBITRER |
| Cursus PAPR - module 2 | PR | 1 | À ARBITRER |
| Cursus PAPR - module 3 | PR | 1 | À ARBITRER |
| Cursus PAPR - module 4 | PR | 1 | À ARBITRER |
| Cursus PAPR - module 5 | PR | 1 | À ARBITRER |
| Cursus PAPR - module 6 | PR | 1 | À ARBITRER |
| Cursus PAPR - module 7 | PR | 1 | À ARBITRER |
| Exercice PR 1.1 | PR | 1 | À ARBITRER |
| Exercice PR 1.2 | PR | 1 | À ARBITRER |
| Exercice PR 1.3 | PR | 1 | À ARBITRER |
| Exercice PR 1.4 | PR | 1 | À ARBITRER |
| Exercice PR 1.5 | PR | 1 | À ARBITRER |
| Exercice PR 1.6 | PR | 1 | À ARBITRER |
| Exercice PR 2.1 | PR | 1 | À ARBITRER |
| Exercice PR 2.2 | PR | 1 | À ARBITRER |
| Exercice PR 2.3 | PR | 1 | À ARBITRER |
| Exercice PR 2.4 | PR | 1 | À ARBITRER |
| Exercice PR 2.5 | PR | 1 | À ARBITRER |
| Exercice PR 2.6 | PR | 1 | À ARBITRER |
| Exercice PR 3.1 | PR | 1 | À ARBITRER |
| Exercice PR 3.2 | PR | 1 | À ARBITRER |
| Exercice PR 3.3 | PR | 1 | À ARBITRER |
| Exercice PR 3.4 | PR | 1 | À ARBITRER |
| Exercice PR 3.5 | PR | 1 | À ARBITRER |
| Exercice PR 3.6 | PR | 1 | À ARBITRER |
| Exercice PR 4.1 | PR | 1 | À ARBITRER |
| Exercice PR 4.2 | PR | 1 | À ARBITRER |
| Exercice PR 4.3 | PR | 1 | À ARBITRER |
| Exercice PR 4.4 | PR | 1 | À ARBITRER |
| Exercice PR 4.5 | PR | 1 | À ARBITRER |
| Exercice PR 4.6 | PR | 1 | À ARBITRER |
| Exercice PR-ABC | PR | 3 | À ARBITRER |
| Formation engagement pratique PR | PR | 2 | À ARBITRER |
| Piste entraînement PAPR 1 | PR | 1 | À ARBITRER |
| Piste entraînement PAPR 2 | PR | 1 | À ARBITRER |
| Piste entraînement PAPR 3 | PR | 1 | À ARBITRER |
| Piste entraînement PAPR 4 | PR | 1 | À ARBITRER |
| Séance préposés APR | PR | 3 | À ARBITRER |
| Sortie des formateurs PR | PR | 1 | À ARBITRER |
| Test de sélection PAPR N'27 | PR | 2 | À ARBITRER |

## Arbitrages MOA

| Code | Volume | Problème | Impact |
|---|---:|---|---|
| CTA-TURN | 1 | Source canonique du tournus CTA introuvable | Génération sections/demi-sections impossible sans invention |
| QV27-COVERAGE | 1 | Source 2027 limitée au 4 mars | Programme annuel complet indisponible |
| UNDATED-FOCA | 6 | Lignes FOCA sans date | Non chargeables dans l’agenda |
| HISTORY-RECONDUCTION | 302 | Activités 2026 absentes de la source 2027 partielle | Décision de reconduction requise |
| CALENDAR-BUSINESS-RULES | 3 | Règles veilles/vacances non administrées | Contraintes de placement non applicables automatiquement |
| STATCOM-MISSING | 39 | Stat.Com source manquant | Export ECAwin impossible pour ces lignes |

## Recette UX finale sur données disponibles

| Écran | Nom | Données 2027 | Constat | UX |
|---:|---|---|---|---|
| 1 | Catalogue annuel | NOK | Catalogue de démonstration; catalogue 2027 complet non démontré | PASS |
| 2 | Définition activité | NOK | Définitions de démonstration, pas les 42 définitions source 2027 | PASS |
| 3 | Automatismes | NOK | Règles de démonstration; tournus CTA absent | PASS |
| 4 | Besoin annuel | NOK | Besoin complet 2027 non arbitré | PASS |
| 5 | Occurrences/sessions | NOK | Génération annuelle complète indisponible | PASS |
| 6 | Placement | NOK | Aucun placement automatique 2027 prouvé | PASS |
| 7 | Propositions | NOK | Propositions non exécutables sur programme complet | PASS |
| 8 | Événement connu | NOK | Écran fonctionnel mais non alimenté par un référentiel 2027 complet | PASS |
| 9 | Conflits | NOK | Rôles et ressources 2027 non structurés; scénarios réels incomplets | PASS |
| 10 | Toutes les activités | PASS | 72 lignes 2027 explicites, tableau et filtres réels | PASS |
| 11 | Agenda annuel | PASS | 72 lignes explicites et calendrier officiel 2027 | PASS |
| 12 | Déplacement | PASS | 72 lignes explicites affichées et déplaçables localement | PASS |

Responsive : 48 contrôles (12 écrans × 1500/1150/960/800), aucun scroll horizontal global; tableaux larges en scroll interne. Performance indicative sur 72 événements : ouverture activités 300 ms, déplacement 302 ms; recherche `int` 13 ms. Ces mesures ne valident pas une volumétrie proche de 1 000.

## Findings P1/P2

P1 : aucun finding.

| Niveau | Finding | Impact |
|---|---|---|
| P2-CTA-SOURCE | Source canonique du tournus CTA absente | Gate 2 et génération CTA bloqués |
| P2-QV27-COVERAGE | Données 2027 limitées au 4 mars | Gate 3 et recette grandeur nature bloqués |
| P2-STATCOM | 39 lignes sans Stat.Com et code EMSEA absent du référentiel | Export ECAwin non fiable sans arbitrage |
| P2-C15-BASELINE | Suite C15 préexistante à 37/41 | Contrôle CSS et trois validations de publics canoniques restent rouges |

## Gates

- Gate 1 — 2026 : **PASS**
- Gate 2 — référentiels/calendrier : **NOK** (CTA et règles métier manquants)
- Gate 3 — génération 2027 : **NOK** (couverture partielle au 4 mars)
- Gate 4 — UX grandeur nature : **BLOCKED**; recette possible uniquement sur les 72 événements explicites

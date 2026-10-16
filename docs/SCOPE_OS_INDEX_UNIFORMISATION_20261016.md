# SCOPE — Uniformisation OS1.01 / OS1.06 / IndeX, 16.10.2026

**DÉVELOPPÉ NON VALIDÉ MOA EN PRODUCTION. Programme annuel2027 NON VALIDÉ.** Branche `codex/scope-uniformisation-os-index-20261016`, base main vérifiée `02b034ab5e1d5065373b39b8fb43aa74740b7fa7` (#29 fusionnée16.10 à05:56:13UTC), aucune PR ouverte au départ. Production publiée inchangée : `scope-sdisnv`, déploiement `6ad0d08255cda461366136f2`, ready, SHA#27 `3bdad82029ef79ea721bcf4043a5bb47e4d86764`, publication15.10 à13:09:59.769UTC. #28 documentaire et #29 ne sont pas réputées publiées.

## Sources et confrontation

OS1.01 version1.1 du29.10.2021 (7pages) et OS1.06 version1.4 du30.07.2025 (6pages), fournis par la MOA, lus intégralement par extraction et tableaux clés inspectés visuellement. Trois captures IndeX fournies ont été lues ; tous les libellés ont été transcrits. Les procédures des documents sont des sources, pas des instructions de mutation.

[Concordance exhaustive figée](captures/os-index-20261016/concordance.json) : versions/SHA256 des5 sources,25 lignes de fonctions OS1.01,21 spécialités OS1.06,81 entrées fonctions/spécialités des captures,26 grades IndeX,11OI,9statuts et5échelons observés ;106 métadonnées de référence, dont1 historique retirée des nouveaux choix. Les autres axes IndeX sont tracés sans créer de statut ou d’OI. Le code applicatif lit le seul composant de références Personnel existant ; le JSON est une preuve datée sans consommateur applicatif, pas un référentiel concurrent.

Les catalogues persistés du projet SCOPE ont été lus uniquement par SELECT code/libellé dans **BEGIN READ ONLY … ROLLBACK** :28responsabilités,36publics,17qualifications. `transaction_read_only=on` constaté ; aucune personne, affectation, présence ou qualification individuelle consultée. [Résultat minimal non nominatif](captures/os-index-20261016/catalogues-readonly.json). Une première requête avec mauvais nom de colonne a été refusée ; la requête corrigée a réussi. Aucun bootstrap applicatif, DDL, migration ou mutation. Les catalogues ont ainsi confirmé CARISTE, MEA/MACHINISTE_EA et VPC existants avant choix des compléments.

Les preuves [#24](SCOPE_QV_PUBLICS_MOA_20261015.md), [#29](SCOPE_QV_FICHES_ASSIGNATIONS_20261016.md) et leurs résultats ont été relus. Aucune campagne PR20–29 rejouée. Contexte/protocole/canon et vues consolidées existantes réutilisés ; les archives d’audit ne sont pas reconstruites.

## Réutilisation et développement

| Composant existant | Adaptation |
|---|---|
| Référentiels Personnel grades/OI/spécialisations | Métadonnées institutionnelles et index d’alias dans le même module ; codes de grades inchangés ; ordre JSP conforme à la capture ; origine OS/IndeX distinguée |
| Catalogues publics et Responsable QV | Trois groupes communs, hiérarchie puis alphabet, candidats adjacents, résumés indépendants des clics ; cadres FOBA/JSP et formateurs/moniteurs dans Encadrement ; identifiants internes masqués |
| Qualifications / affichage Personnel | Abréviations OS1.06 et deux compléments MOA ; anciens libellés reconnus ; MEA/MACHINISTE_EA et VPC/OP_VPC présentés sans doublon ni fusion en base ; cond VL commun, effectifs PL/VL existants préservés |
| Fonctions contextualisées #29 / C2 | Resp formation JSP, Chef/Cadre/Rempl.chef FOBA ; condition Cadre FOBA ; Commandant global pour combinaisons ; a.i.confirmé pleinement exercé ; même moteur daté, cumul/conditions Chef JSP/DAP conservés |
| Moteur de publics C2 | Option explicite de population FOBA avec année/dates/incorporation/échelon0 et prédicat d’échelon ; ANY/ALL/déduplication existants ; anciens fingerprints/règles identiques sans nouvelles options |
| Création et correction de fiches | Défaut de nouvelle proposition PIONNIER FOBA3, contexteG1 existant ; anciennes projections/décisions FOBA2 conservées et écart signalé ; correction explicite par fiche/workflow #29 |
| Plan de publication existant | Les anciens publics opérationnels gardent leur classification/relations et codes ; les nouvelles fonctions restent descriptives, y compris leurs identifiants historiques en casse mixte ; aucun exécuteur ni publication lancé |
| Sauvegarde/révision/journal/assignations | Chemins existants conservés ; valeurs brutes retenues dans les attributs des choix fusionnés visuellement ; champs intacts omis ; aucune écriture d’assignation ajoutée |

46 choix descriptifs complètent le catalogue de publics de main : 12 réutilisent une référence déjà présente dans un autre catalogue et 34 sont des compléments **descriptifs** absents des catalogues lus, dont Cadre FOBA, Rempl.chef FOBA, Chef formation JSP, fonctions de formateurs/moniteurs manquantes, Secrétaire EM et spécialités citées. Aucun nouvel enregistrement de qualification, fonction personnelle ou public C2 n’est créé en base par ce lot. Les codes existants sont préférés, notamment CARISTE ; les anciens namespaces publics/qualifications/responsabilités sont conservés. L’ajout d’un choix descriptif ne prouve pas sa population réelle.

La réponse MOA **« Cette fonction va être supprimée, inutile de la référencer »** exclut Chef matériel JSP des nouveaux choix. Aucun nouvel identifiant pour ce libellé ; `Resp mat JSP` n’est visible que si déjà sélectionné, sans perte d’historique, suppression ou équivalence inventée. Ce point est arbitré.

Chef formation JSP et Resp formation JSP restent distincts d’après la capture ; leur réunion n’est pas décidée. La capture JSPY3 ne constitue pas une conversion vers JSPC1 : le mandat explicite G1/C1/B1 gouverne les nouveaux contextes. Aucune référence organisationnelle n’est créée. Les métadonnées de compatibilité OI non attestées restent vides/non établies, sans restriction déduite, notamment pour les spécialités uniquement visibles dans IndeX ; FOBA1 porte explicitement l’absence d’incorporation DPS/DAP. Les rangs sont de présentation, jamais des grades ou promotions automatiques.

## Dictionnaire institutionnel à examiner

Chaque ligne ci-dessous renvoie au même enregistrement de preuve qui contient aussi les codes existants de chaque catalogue et l’action précise. « Non établi » n’est pas « tous les OI ». Les grades/abréviations et les captures d’autres axes sont détaillés séparément dans la concordance. Les codes dans ce tableau de développeur restent internes à l’application.

| Intitulé officiel/source | Abréviation | Code SCOPE retenu | Domaine | OI compatibles attestés | Groupe | Rang | Alias historiques | Action |
|---|---|---|---|---|---|---|---|---|
| Commandant | Non fournie | CMDT:CDT | F0 | Non établi / global selon règle | Commandement et responsables | 0 | Cdt, CDT | Réutiliser |
| Remplaçant du Commandant | Non fournie | CMDT:REMPL-CDT | F0 | Non établi / global selon règle | Commandement et responsables | 1 | Remplaçant du Commandant | Complément descriptif |
| Quartier-maître F1/8 | Non fournie | CMDT:QM | F1/8 | Non établi / global selon règle | Commandement et responsables | 10 | QM, Quartier-maître F1/8 | Réutiliser |
| Chef opérationnel F2/3 | Non fournie | CMDT:C-OP | F2/3 | Non établi / global selon règle | Commandement et responsables | 10 | C op, Chef OP, Chef opérationnel F2/3 | Réutiliser |
| Chef logistique F4 | Non fournie | CMDT:C-LOG | F4 | Non établi / global selon règle | Commandement et responsables | 10 | C log, Chef logistique F4 | Réutiliser |
| Chef formation F7 | Non fournie | CMDT:C-FOR | F7 | Non établi / global selon règle | Commandement et responsables | 10 | C for, Chef formation F7 | Réutiliser |
| Officier information F5/6 | Non fournie | F56:OF-INFO | F5/6 | Non établi / global selon règle | Commandement et responsables | 10 | Officier information F5/6 | Complément descriptif |
| Chef de site DPS / Chef de site JSP | Non fournie | C site | DPS/JSP | DPS, JSP | Commandement et responsables | 10 | Chef de site DPS, Chef site DPS, Chef de site JSP, Chef site JSP, C site JSP | Réutiliser |
| Chef DAP | Non fournie | C DAP | DAP | DAP | Commandement et responsables | 10 | Chef DAP | Réutiliser |
| Chef JSP | Non fournie | C JSP | JSP | JSP | Commandement et responsables | 10 | Chef JSP | Réutiliser |
| Chef formation des cadres | Non fournie | C FOCA | FOCA | Non établi / global selon règle | Commandement et responsables | 20 | Chef formation des cadres, Chef FOCA | Complément descriptif |
| Chef formation de base | Non fournie | C FOBA | FOBA | Non établi / global selon règle | Commandement et responsables | 30 | Chef FOBA, Chef formation de base | Réutiliser |
| Chef protection respiratoire | Non fournie | PR:C-PR | PR | Non établi / global selon règle | Commandement et responsables | 30 | C PR, Chef PR, Chef protection respiratoire | Réutiliser |
| Officier automobile | Non fournie | AUTO:OF-AUTO | AUTO | Non établi / global selon règle | Commandement et responsables | 30 | Of auto, Officier auto, Officier automobile | Réutiliser |
| Chef formation des spécialistes | Non fournie | C FOSPEC | FOSPEC | Non établi / global selon règle | Commandement et responsables | 30 | Chef FOSPEC, Chef formation des spécialistes | Réutiliser |
| Chef de section DPS / DAP | Non fournie | ENC:C-SECTION | DPS/DAP | DPS, DAP | Encadrement | 10 | C scrt, C sct, C section, Chef section DPS, Chef section DAP, Chef de section DPS, Chef de section DAP, CMDT:CHEF-SECTION-DAP | Réutiliser |
| Chef audiovisuel | Non fournie | C audiovisuel | F5/6 | Non établi / global selon règle | Commandement et responsables | 40 | C audiovisuel | Réutiliser |
| Chef publication | Non fournie | C publication | F5/6 | Non établi / global selon règle | Commandement et responsables | 40 | C publication | Complément descriptif |
| Chef informatique | Non fournie | C IT | F5/6 | Non établi / global selon règle | Commandement et responsables | 40 | Chef informatique, Chef IT | Complément descriptif |
| Chef communication | Non fournie | C communication | F5/6 | Non établi / global selon règle | Commandement et responsables | 40 | Of communication, C communication | Complément descriptif |
| Responsable matériel | Non fournie | ENC:RESP-MATERIEL | F4 | Non établi / global selon règle | Commandement et responsables | 40 | Resp mat, Responsable matériel, Resp matériel | Réutiliser |
| Fourrier | Non fournie | F1:FOURRIER | F1/8 | Non établi / global selon règle | Commandement et responsables | 40 | — | Complément descriptif |
| Responsable APR | Non fournie | Resp APR | F4 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Responsable ABC | Non fournie | Resp ABC | F7 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Responsable OFSI | Non fournie | Resp OFSI | F7 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Responsable VPC | Non fournie | Resp VPC | F7 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Resp matériel JSP | Non fournie | Resp mat JSP | JSP | JSP | Commandement et responsables | 50 | Responsable matériel JSP | Historique seul |
| Référent sanitaire | Non fournie | Réf sanitaire | F7 | Non établi / global selon règle | Commandement et responsables | 50 | Réf. Sanitaire | Réutiliser |
| Répondant sport | Non fournie | Répondant sport | F7 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Responsable sports | Non fournie | Resp Sports | F7 | Non établi / global selon règle | Commandement et responsables | 50 | — | Réutiliser |
| Remplaçant chef de site DPS / JSP | Non fournie | ENC:REMPL-C-SITE | DPS/JSP | DPS, JSP | Encadrement | 10 | Remplaçant chef de site DPS, Remplaçant chef de site JSP | Complément descriptif |
| Remplaçant chef de section DPS / DAP | Non fournie | ENC:REMPL-C-SECTION | DPS/DAP | DPS, DAP | Encadrement | 20 | Rempl chef de section DPS, Remplaçant chef de section DPS, Remplaçant chef de section DAP | Complément descriptif |
| Chef de groupe | Non fournie | ENC:C-GROUPE | DPS/DAP | DPS, DAP | Encadrement | 30 | C groupe, Chef de groupe | Réutiliser |
| OSR | Non fournie | ENC:OSR | DPS | DPS | Encadrement | 30 | — | Réutiliser |
| Chef intervention DPS | Non fournie | ENC:CI-DPS | DPS | DPS | Encadrement | 30 | — | Réutiliser |
| Chef intervention DAP | Non fournie | ENC:CI-DAP | DAP | DAP | Encadrement | 30 | — | Réutiliser |
| Remplaçant chef FOBA | Non fournie | FOBA:REMPL-CHEF | FOBA | Non établi / global selon règle | Encadrement | 40 | Rempl. chef FOBA, Remplaçant chef FOBA | Complément descriptif |
| Cadre FOBA | Non fournie | ENC:CADRE-FOBA | FOBA | Non établi / global selon règle | Encadrement | 50 | — | Complément descriptif |
| Chef formation JSP | Non fournie | JSP:CHEF-FORMATION | JSP | JSP | Encadrement | 50 | — | Complément descriptif |
| Responsable formation JSP | Non fournie | Resp for JSP | JSP | JSP | Encadrement | 50 | Resp. formation JSP, Responsable formation JSP, Resp formation JSP | Réutiliser |
| Moniteur JSP | Non fournie | JSP:MONITEUR | JSP | JSP | Encadrement | 60 | — | Complément descriptif |
| Aide-moniteur JSP | Non fournie | JSP:AIDE-MONITEUR | JSP | JSP | Encadrement | 60 | — | Complément descriptif |
| Formateur PR | Non fournie | PR:FORMATEUR-PR | PR | Non établi / global selon règle | Encadrement | 60 | PR:FORMATEURS | Réutiliser |
| Formateur maison de feu | Non fournie | PR:FMF | PR | Non établi / global selon règle | Encadrement | 60 | Formateur maison Feu (FMF), Formateur maison de feu | Réutiliser |
| Chef de piste | Non fournie | PR:CHEF-PISTE | PR | Non établi / global selon règle | Encadrement | 60 | Chef piste | Réutiliser |
| Remplaçant chef PR | Non fournie | PR:REMPL-CHEF | PR | Non établi / global selon règle | Encadrement | 40 | Remplaçant chef PR | Complément descriptif |
| Moniteur de conduite | Non fournie | AUTO:MONITEUR-CONDUITE | AUTO | Non établi / global selon règle | Encadrement | 60 | AUTO:MONITEURS, Moniteur de conduite | Réutiliser |
| Formateur permis C1/118 | Non fournie | AUTO:FORMATEUR-C1-118 | AUTO | Non établi / global selon règle | Encadrement | 60 | AUTO:FORM-C1, Formateur permis C1/118 | Réutiliser |
| Formateur EA | Non fournie | AUTO:FORM-EA | AUTO | Non établi / global selon règle | Encadrement | 60 | — | Réutiliser |
| Formateur grutier | Non fournie | AUTO:FORM-GRUTIER | AUTO | Non établi / global selon règle | Encadrement | 60 | — | Réutiliser |
| Formateur antichute | Non fournie | FOSPEC:FORM-ANTICHUTE | FOSPEC | Non établi / global selon règle | Encadrement | 60 | — | Complément descriptif |
| Instructeur BLS/AED | Non fournie | SAN:INSTR-BLS-AED | F7 | Non établi / global selon règle | Encadrement | 60 | — | Complément descriptif |
| Instructeur fédéral | Non fournie | ENC:INSTR-FEDERAL | F7 | Non établi / global selon règle | Encadrement | 60 | — | Complément descriptif |
| Remplaçant responsable VPC | Non fournie | VPC:REMPL-RESP | F7 | Non établi / global selon règle | Encadrement | 40 | Remplaçant responsable VPC | Complément descriptif |
| Porteur d’appareil de protection respiratoire | PAPR | PR:2 | PR | DPS | Personnel et spécialisations | 50 | Porteur APR, PAPR, PR-PAPR | Réutiliser |
| Conducteur véhicule léger | cond VL | AUTO:3 | AUTO | DPS, DAP | Personnel et spécialisations | 50 | Conducteur véhicule léger, Cond VL, AUTO_VL_DPS, AUTO_VL_DAP, COND_VL, AUTO-COND-VL | Réutiliser |
| Conducteur poids lourd | cond PL | AUTO:1 | AUTO | DPS | Personnel et spécialisations | 50 | Conducteur poids-lourd, Cond PL, AUTO_PL, COND_PL, AUTO-COND-PL | Réutiliser |
| Conducteur poids lourd TP 9000 | cond PL TP9 | AUTO:2 | AUTO | DPS:G1 | Personnel et spécialisations | 50 | Conducteur poids-lourd Ydon 129, cond TP9, Cond TP9, Ydon 129, COND_TP9, AUTO-COND-TP9 | Réutiliser |
| Machiniste EA | MEA | AUTO:5 | AUTO | DPS:G1 | Personnel et spécialisations | 50 | Machiniste EA, MEA, MACHINISTE_EA, AUTO-MEA | Réutiliser |
| Pilote bateau | pil bat | AUTO:6 | AUTO | DPS:G1 | Personnel et spécialisations | 50 | Pilote bateau, Pilote BAT, PILOTE_BAT, AUTO-PILOTE-BAT | Réutiliser |
| Cariste | cariste | CARISTE | AUTO | DPS, DAP | Personnel et spécialisations | 50 | Cariste | Réutiliser |
| Opérateur élévateur à timon | OP élévateur à timon | AUTO:ELEVATEUR-TIMON | AUTO | DPS, DAP | Personnel et spécialisations | 50 | Élévateur à timon, Opérateur élévateur à timon | Complément descriptif |
| Pontier-élingueur | pontier | AUTO:PONTIER | AUTO | DPS:B1 | Personnel et spécialisations | 50 | Pontier-élingueur | Complément descriptif |
| Grutier | grutier | AUTO:4 | AUTO | DPS:G1 | Personnel et spécialisations | 50 | Grutier, GRUTIER, AUTO-GRUTIER | Réutiliser |
| Opérateur VPC | op VPC | FOSPEC:4 | FOSPEC | DPS:G1 | Personnel et spécialisations | 50 | Opérateur Ydon 0, OP VPC, Ydon 0, OP_VPC, VPC, FOSPEC-VPC, FOSPEC-OP-VPC | Réutiliser |
| Spécialiste antichute | Spéc antichute | FOSPEC:1 | FOSPEC | DPS, DAP | Personnel et spécialisations | 50 | Spécialiste Antichute, Antichute, ANTICHUTE, FOSPEC-ANTICHUTE | Réutiliser |
| Porteur ABC tenue lourde | PABC | PR:3 | FOSPEC | DPS:G1 | Personnel et spécialisations | 50 | Porteur ABC tenue lourde, PR-ABC, PR_ABC, PABC, PR-PABC | Réutiliser |
| Spécialiste NAC | NAC | FOSPEC:2 | FOSPEC | DPS | Personnel et spécialisations | 50 | NAC, FOSPEC-NAC | Réutiliser |
| Répondant renseignement | rép rens | F2:REP-RENS | F2 | DPS, DAP | Personnel et spécialisations | 50 | Répondant renseignement | Complément descriptif |
| Préposé au matériel | prép mat | ENC:PREPOSE-MATERIEL | F4 | DPS | Personnel et spécialisations | 50 | Préposé au matériel, Préposé matériel | Réutiliser |
| Préposé APR | prép APR | PR:PREPOSE-APR | F4 | DPS | Personnel et spécialisations | 50 | Préposé APR | Réutiliser |
| Spécialiste audiovisuel | spéc AV | F56:SPEC-AV | F5/6 | DPS, DAP | Personnel et spécialisations | 50 | Membre audiovisuel | Complément descriptif |
| Spécialiste publication | spéc pub | F56:SPEC-PUB | F5/6 | DPS, DAP | Personnel et spécialisations | 50 | Membre publication | Complément descriptif |
| Spécialiste IT | spéc IT | F56:SPEC-IT | F5/6 | DPS, DAP | Personnel et spécialisations | 50 | Membre IT | Complément descriptif |
| Spécialiste communication | spéc com | F56:SPEC-COM | F5/6 | DPS, DAP | Personnel et spécialisations | 50 | Membre communication | Complément descriptif |
| Personnel OFSI | Non fournie | FOSPEC:3 | FOSPEC | Non établi / global selon règle | Personnel et spécialisations | 50 | Personnel OFSI, OFSI, FOSPEC-OFSI | Réutiliser |
| Porteur Cobra | Non fournie | PR:COBRA | PR | Non établi / global selon règle | Personnel et spécialisations | 50 | Porteur Cobra | Complément descriptif |
| Préposé aux tuyaux | Non fournie | F4:PREPOSE-TUYAUX | F4 | Non établi / global selon règle | Personnel et spécialisations | 50 | Préposé aux tuyaux | Complément descriptif |
| Certification BLS/AED | Non fournie | SAN:BLS-AED | F7 | Non établi / global selon règle | Personnel et spécialisations | 50 | Certification BLS/AED | Complément descriptif |
| Secouriste IAS Niveau I | Non fournie | SAN:IAS-1 | F7 | Non établi / global selon règle | Personnel et spécialisations | 50 | Secouriste IAS Niveau I | Complément descriptif |
| Secouriste IAS Niveau II | Non fournie | SAN:IAS-2 | F7 | Non établi / global selon règle | Personnel et spécialisations | 50 | Secouriste IAS Niveau II | Complément descriptif |
| Secouriste IAS Niveau III | Non fournie | SAN:IAS-3 | F7 | Non établi / global selon règle | Personnel et spécialisations | 50 | Secouriste IAS Niveau III | Complément descriptif |
| Personnel permanent | Non fournie | F1:PERMANENT | F1 | Non établi / global selon règle | Personnel et spécialisations | 50 | Personnel permanent | Complément descriptif |
| Échelon 0 | Non fournie | ECH:0 | SDIS | DPS, DAP, JSP | Personnel et spécialisations | 0 | — | Réutiliser |
| Échelon I | Non fournie | ECH:I | SDIS | DPS, DAP, JSP | Personnel et spécialisations | 0 | — | Réutiliser |
| Échelon II | Non fournie | ECH:II | SDIS | DPS, DAP, JSP | Personnel et spécialisations | 0 | — | Réutiliser |
| Échelon III | Non fournie | ECH:III | SDIS | DPS, DAP, JSP | Personnel et spécialisations | 0 | — | Réutiliser |
| Échelon IV | Non fournie | ECH:IV | SDIS | DPS, DAP, JSP | Personnel et spécialisations | 0 | — | Réutiliser |
| FOBA 1 | Non fournie | FOBA:1 | FOBA | Sans DPS/DAP | Personnel et spécialisations | 10 | FOBA-1 | Réutiliser |
| FOBA 2 | Non fournie | FOBA:2 | FOBA | DPS, DAP | Personnel et spécialisations | 10 | FOBA-2 | Réutiliser |
| FOBA 3 | Non fournie | FOBA:3 | FOBA | DPS | Personnel et spécialisations | 10 | FOBA-3 | Réutiliser |
| Recrue | Non fournie | GEN:RECRUE | SDIS | Non établi / global selon règle | Personnel et spécialisations | 20 | — | Réutiliser |
| Sapeur | Non fournie | GEN:SAPEUR | SDIS | Non établi / global selon règle | Personnel et spécialisations | 20 | — | Réutiliser |
| Sapeur DPS | Non fournie | GEN:SAPEUR-DPS | SDIS | DPS | Personnel et spécialisations | 20 | — | Réutiliser |
| Sapeur DAP | Non fournie | GEN:SAPEUR-DAP | SDIS | DAP | Personnel et spécialisations | 20 | — | Réutiliser |
| JSP | Non fournie | JSP:1 | JSP | JSP | Personnel et spécialisations | 20 | — | Réutiliser |
| Membres du Codir | Non fournie | CMDT:CODIR | F0 | Non établi / global selon règle | Commandement et responsables | -10 | — | Réutiliser |
| Candidat Chef de groupe | Non fournie | ENC:CAND-C-GROUPE | DPS/DAP | DPS, DAP | Encadrement | 30 | — | Réutiliser |
| Candidat Chef intervention DPS | Non fournie | ENC:CAND-CI-DPS | DPS | DPS, DAP | Encadrement | 30 | — | Réutiliser |
| Candidat Chef intervention DAP | Non fournie | ENC:CAND-CI-DAP | DAP | DPS, DAP | Encadrement | 30 | — | Réutiliser |
| Candidat Porteur d’appareil de protection respiratoire | Non fournie | PR:CAND-PAPR | PR | DPS | Personnel et spécialisations | 50 | — | Réutiliser |
| Candidat Conducteur poids lourd | Non fournie | AUTO:CAND-PL | AUTO | DPS | Personnel et spécialisations | 50 | — | Réutiliser |
| Candidat Conducteur poids lourd TP 9000 | Non fournie | AUTO:CAND-TP9 | AUTO | DPS:G1 | Personnel et spécialisations | 50 | — | Réutiliser |
| Candidat Conducteur véhicule léger | Non fournie | AUTO:CAND-VL | AUTO | DPS, DAP | Personnel et spécialisations | 50 | — | Réutiliser |
| Candidat Machiniste EA | Non fournie | AUTO:CAND-EA | AUTO | DPS:G1 | Personnel et spécialisations | 50 | — | Réutiliser |
| Secrétaire EM | Non fournie | CMDT:SECRETAIRE-EM | F0 | Non établi / global selon règle | Personnel et spécialisations | 30 | — | Complément descriptif |

## Tests ciblés et preuves

[Résultats techniques](captures/os-index-20261016/targeted-results.json), scripts `scripts/scope-os-index-20261016-tests.js` et `scripts/scope-os-index-20261016-browser.js`. **20 tests nouveaux PASS**, **8 scénarios Chrome synthétiques PASS**, contrôles syntaxiques/diff/liens/provenance ciblés. Capture de la même page synthétique, [sélecteur FOBA](captures/os-index-20261016/selector.png), inspectée visuellement ; ce n’est pas une recette MOA.

| Exigence | Contrôle ciblé | Résultat / limite |
|---|---|---|
| Grades / hiérarchie | Même ensemble de codes et alias ; séquence OS et ordre JSP fourni ; Of spéc entre Lt et Cap | PASS technique ; aucune personne promue |
| Groupes / candidats / résumé | Trois groupes dans publics, responsables, qualifications ; chaque candidat après cible ; permutations/clics donnent le même texte ; contraction échelons0 àIII | PASS technique |
| OS1.06 / IndeX |21abréviations/compléments et aliasYdon ; catalogues réellement lus ; MEA/VPC sans doublon visuel | PASS technique ; aucun code de qualification réécrit |
| Fonctions / contextes | DPS/DAP/JSP distincts, SDIS parent sans nouvelle sélection OI ; a.i.confirmé valide ; Chef JSP/DAP gardent leurs conditions ; Rempl.chefFOBA exige CadreFOBA daté | PASS sur fixtures ; faits individuels réels encore manquants |
| FOBA / combinaisons | FOBA1 année1/éch0/sansDPS-DAP ; FOBA2 année2/incorporée ; FOBA3 année3/DPS ; ANY éch0–III/FOBA1/Commandant sans doublon ; candidat désigné distinct postulant | PASS sur faits synthétiques ; aucun effectif réel annoncé |
| Préservation | Anciennes règles C2/fingerprints/résultats identiques ; projection PIONNIER existante inchangée ; défaut nouveau seulement ; code,Stat.Com,qualifications,responsabilités et publics historiques identiques dans payloads contrôlés | PASS technique ; sauvegardes navigateur interceptées, aucun serveur métier appelé |
| Chef matériel JSP | Absent des nouveaux choix, ancienne sélection conservée lisible | PASS technique, décision MOA acquise |
| Production / permissions | Aucun code RLS/Okta/permission, schéma, endpoint ou migration changé ; seules références persistées lues en READ ONLY/ROLLBACK ; aucun NIP ni export nominatif | Aucune mutation de production ; profils réels et version publiée à recetter |

Les écritures de test sont uniquement des appels à un faux client en mémoire ; aucune base de recette ni production n’est modifiée. Il n’existe aucune mutation réelle à annuler dans ces tests. La seule consultation de base est la transaction de catalogues READ ONLY terminée par ROLLBACK. Les lectures GitHub/Netlify et catalogues ne sont pas une recette MOA.

## Portée de livraison et suite obligatoire

Fichiers applicatifs : `assets/js/scope-personnel-referentials.js`, `assets/js/scope-personnel-display.js`, `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `netlify/lib/_scope-public-engine.js`, `netlify/lib/_scope-qv-publication-plan.js`. Deux scripts ciblés, présent rapport et preuves. Canon, contexte maître, roadmap/ToDo et décisions existants amendés ; provenance maintenue. Registre des anomalies inchangé : aucune nouvelle anomalie de production démontrée, aucun acquis rouvert. Aucun deuxième backlog.

Les libellés de publics partagés avec les résumés/exports sont uniformisés ; les gabarits PDF, données horaires, codes, Stat.Com et lignées ne sont pas remaniés. Le présent lot ne prétend pas démontrer une recette PDF, Safari, import IndeX ou parcours persistant réel. Source/confirmation des fonctions, années de formation, échelons/candidatures individuels et raccord à l’adaptateur encore nécessaires ; absence signalée INCOMPLETE, aucun fait ni NIP inventé. Le contrat strict FOBA ne remplace pas silencieusement les anciennes règles persistées. Trois exercices FOBA3/PIONNIERG1 sont les exigences du contrat ; aucune séance/obligation n’est créée automatiquement.

Une seule PR, branche isolée depuis main#29 vérifié, commit/titre `[skip netlify]` pour empêcher les builds automatiques ; configuration inchangée. Travaux étrangers préservés. Aucun merge ou déploiement, changement de données de production, migration, RLS/Okta ou publication annuelle.

**GO MOA fusion distinct → GO déploiement distinct → contrôle du SHA réellement publié → recette MOA obligatoire sur https://scope-sdisnv.netlify.app → PASS MOA explicite avant clôture.** Les tests locaux sont techniques. Toute écriture de test en production exige autorisation explicite, contrôle préalable et garanties d’intégrité/rollback vérifiées. Programme annuel QUO VADIS2027 NON VALIDÉ.

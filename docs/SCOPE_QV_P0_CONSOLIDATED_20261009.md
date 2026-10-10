# SCOPE / QUO VADIS 2027 - Lot correctif P0 du 09.10.2026

A. Causes etablies : le login LOCAL ne chargeait pas la route demandee apres ouverture de session ; un echec de configuration activait implicitement Okta ; les erreurs 401 utilisaient un message Okta ; le retour au Programme effacait la confirmation ; Safari a expose une notification avec opacite calculee a 0 pendant son animation ; les calendriers et listes ne se repositionnaient pas selon le viewport. Le defaut du geste souris Drag & Drop reste a confirmer : le controle natif Safari a retourne `noWindowsAvailable` avant de transmettre le geste.

B. Correctifs : chargement de la route apres login ; configuration explicite des fournisseurs et nouvelle tentative ; messages de session neutres ; preservation des confirmations au retour ; notifications sans dependance a une animation et au-dessus de la navigation ; popovers fixes repositionnes verticalement et horizontalement ; gabarit commun en lecture seule selon permissions ; commandes alignees ; classe commune de presentation des permanences ; deplacement de date preservant les decisions stockees et controle des verrouillages au serveur ; controle du resultat d'enregistrement.

C. Tests cibles : PASS pour le lot P0 (5), consolidation des fiches/feedback/exports (4), login (8), composition du login et mode Okta configure (6), authentification LOCAL et RBAC (10 blocs, 31 assertions), exports operationnels (8). Test PostgreSQL clone : PASS, baseline 847, sauvegarde/validation/planification distinctes, deplacement persistant apres relecture, evenement publie refuse, aucune creation operationnelle et aucune autre preparation modifiee. Rollback et empreintes PASS. Build Netlify et preflight de cible PASS.

D. Recette Safari : INCOMPLETE, donc NOK pour le gate de publication. Connexion LOCAL avec vrais handlers et compte synthetique, acces au Programme, creation, modification, sauvegarde, validation, planification, retour avec recherche et rechargement de session observes. La base utilisee pour les ecritures etait exclusivement `scope_qv_2027_recipe_20261006` sur `127.0.0.1:5432`. Sessions de recette exclusivement en memoire. Transactions annulees, empreintes restaurees.

E. Drag & Drop tableau : NOK / NON VALIDE. Le geste natif de l'outil Safari echoue avec `noWindowsAvailable`. La persistance et la preservation des champs sont testees au service sur le clone, sans assimiler ce resultat a un geste Safari.

F. Drag & Drop mensuel : NOK / NON VALIDE, meme blocage de controle natif. Aucun PASS de geste simule n'est revendique.

G. Fiches homogenes : tests structurels PASS. Comparaison visuelle Safari des quatre provenances NON TERMINEE.

H. Calendriers et listes : ouverture du calendrier vers le haut et liste OI avec defilement observes dans Safari ; couverture complete de tous les champs et viewports NON TERMINEE.

I. Trois actions : PASS sur clone PostgreSQL et actions Safari observees. Donnees invalides conservees apres refus. Les evenements operationnels ne sont pas crees par ces actions.

J. Authentification LOCAL : PASS sur les tests cibles et login Safari ; session conservee apres rechargement ; Okta reste testable par configuration explicite.

K. Permanences jaunes : classe commune et styles implementes pour tableau, mois, Agenda et fiche. Validation visuelle finale NON TERMINEE.

L. Notifications centrales : tests du composant et conservation au retour PASS. Opacite 0 diagnostiquee dans Safari et dependance a l'animation retiree. Validation visuelle finale du correctif NON TERMINEE.

M. GitHub : branche unique `codex/scope-qv-p0-consolidated-20261009`, depuis `985eb5779590d90b671a591a4edcb3a961b42a50`. Aucun merge sur main. PR de release non ouverte avant recette complete.

N. Netlify : cible `scope-sdisnv`, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`, build PASS. Aucune publication du candidat. Le deploiement `6ac8d732e7e62259b75409ff` est conserve.

O. Donnees metier de production inchangees : OUI par cette intervention. Aucune ecriture de recette en production, aucun secret ou RLS modifie, aucune migration, aucun recalcul global. Les tables du clone reviennent a leurs empreintes initiales apres rollback. Le dossier de travail initial et ses modifications hors lot ne sont pas touches.

P. Verdict : BLOCKED - recette Safari obligatoire incomplete, gestes Drag & Drop natifs non executes a cause de `noWindowsAvailable`, comparaison visuelle finale incomplete. Ne pas fusionner ni publier sur cette preuve.

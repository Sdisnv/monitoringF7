# SCOPE - Finalisation P0, ECAwin et authentification

A. GitHub initial : main `985eb5779590d90b671a591a4edcb3a961b42a50`, branche `codex/scope-qv-p0-consolidated-20261009`, commit acquis `46a62c6b1dbbd9811e115ee37e87d921a59eac83`. Branche poursuivie, acquis conserves. Aucun merge.

B. P0 : corrections de session, route apres login, notifications, popovers, gabarit et workflow conservees. La priorite CSS des permanences est corrigee : le zebrage ne masque plus le jaune.

C. Navigateur : recette Chromium PASS, 10 scenarios consolides. Couverture Safari non obtenue : controle natif `noWindowsAvailable`. Controle natif Chrome egalement indisponible via capture macOS ; recette automatisee Chromium dans un profil temporaire isole. Preuves dans `captures/qv-p0-ecawin-auth-20261009/recipe-results.json`.

D. Drag & Drop : tableau PASS ; mensuel sur barre de date PASS ; ecriture sur clone, relecture et rechargement PASS. Horaires, codes, qualifications, cursus et decisions conserves. Les verrouillages publies et CTA restent actifs.

E. Fiches : quatre provenances comparees, meme structure et dimensions des composants. Code activite ECAwin place dans le champ valide ; code d'occurrence SCOPE maintenu dans les informations. Aucune reorganisation de la fiche.

F. Calendriers et listes : PASS sur 1440x1000, 960x900 et 390x844. Repositionnement et limites du viewport controles ; dernieres options accessibles par defilement interne.

G. Permanences : jaune `#FFF3CD` verifie par couleur calculee dans tableau, mois, Agenda annuel et fiche. Aucun changement des dates ou rotations.

H. Notifications : confirmation centrale visible PASS ; erreur centrale visible PASS ; saisies conservees apres refus ; confirmation conservee apres retour au Programme avec recherche.

I. ECAwin : INCOMPLET. Les captures officielles completes et leurs descriptions ne sont pas disponibles. Les pieces jointes, le depot, Desktop, Downloads et Projects ont ete recherches ; les anciens documents Quo Vadis retrouves ne sont pas substitues aux captures ECAwin. Seules 12 associations explicitement confirmees par la mission sont encodees dans `assets/js/scope-ecawin.js`, avec `complete:false` et descriptions officielles non inventees. `ecawinCorrespondence` dans la reponse Programme fournit la table preparee pour le futur export ; les lignes non qualifiees ou sans description officielle prouvee ne sont pas declarees exportables.

J. Divergences : `COURJSP` conserve, aucun `COURJS` propose ; association incompatible refusee au serveur ; code d'occurrence distinct du code ECAwin et du Stat.Com ; valeurs historiques non confirmees conservees et non proposees comme nouvelles associations.

K. Historique : `010JY3` conserve sans conversion automatique vers `010JC1`, absent des nouvelles options actives ; `EMSEA` conserve sans association ECAwin inventee et sans remplacement par EXEC ou 070F0. Aucune renumerotation ni reecriture historique.

L. Qualifications et cursus : references existantes lues, identifiants metier reutilises, selection multiple des qualifications et champ vide possibles. Saisie libre refusee au serveur. Liens techniques des modules Cursus proteges. Aucune ecriture sur personnel, qualifications ou progressions individuelles.

M. Connexion : carte simplifiee, NIP et mot de passe, identite sombre SCOPE et logo SDIS conserves. Cadenas et encadre redondant retires. Aucun lien de recuperation ajoute.

N. Turnstile : prepare et desactive par defaut. Tests serveur PASS ; Siteverify reel avec cles publiques Cloudflare de test PASS (acceptation et refus) ; widget invisible et connexion LOCAL avec verification serveur PASS. Aucun secret de production ni parametre Netlify modifie. Preuve dans `captures/qv-p0-ecawin-auth-20261009/turnstile-results.json`.

O. Tests : P0 6/6 ; fiches/feedback 4/4 ; ECAwin 4/4 ; historique JSP/XLSX 6/6 ; Turnstile 5/5 ; login 8/8 ; presentation login 6/6 ; LOCAL/RBAC 10 blocs et 31 assertions ; exports 8/8. Recette PostgreSQL clone PASS, baseline 847, aucune autre preparation ou evenement operationnel modifie ; empreintes personnel, qualifications et cursus conservees ; rollback PASS. Build et preflight Netlify PASS.

P. PR : une seule PR en brouillon vers main sur la branche existante. Aucune fusion ni publication autorisee par cette mission ; nouveau GO MOA necessaire apres fermeture du blocage ECAwin.

Q. Netlify : cible `scope-sdisnv`, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`. Deploiement de reference `6ac8d732e7e62259b75409ff` conserve. Aucun candidat publie.

R. Donnees : aucune ecriture metier de recette en production, aucune migration, aucun changement RLS, secrets ou ORION. Modifications locales preexistantes preservees. Toutes les ecritures de recette annulees sur le clone.

S. Verdict : BLOCKED - referentiel ECAwin officiel complet et descriptions manquants. Les fonctions P0 et l'integration d'authentification sont validees ; le registre partiel ne vaut pas referentiel officiel complet.

## Configuration Turnstile

Parametres runtime du site SCOPE, a configurer seulement apres validation et nouveau GO :

| Parametre | Valeur attendue |
| --- | --- |
| `SCOPE_TURNSTILE_ENABLED` | Absent ou `false` par defaut ; `true` seulement apres validation |
| `SCOPE_TURNSTILE_SITE_KEY` | Cle publique du widget invisible ou non interactif |
| `SCOPE_TURNSTILE_SECRET_KEY` | Secret uniquement dans le runtime Functions, jamais cote client |
| `SCOPE_TURNSTILE_HOSTNAMES` | Liste de noms d'hote exacts, par exemple `scope-sdisnv.netlify.app` |
| `SCOPE_TURNSTILE_ACTION` | `scope-local-login` par defaut, identique cote widget et validation serveur |

Sans activation explicite, LOCAL fonctionne sans cles Turnstile. Une activation explicite mal configuree est refusee ; aucune validation client ne remplace Siteverify. Limitation Netlify 5 requetes / 180 secondes, mot de passe, sessions, permissions et refus anonyme conserves.

La CSP du site autonome SCOPE autorise uniquement le domaine Cloudflare necessaire dans `script-src`, `frame-src` et `connect-src`. Les autres restrictions sont conservees.

La recette utilise uniquement les [cles publiques officielles de test](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Leur reponse Siteverify observee retourne `example.com` sans champ action : ces parametres restent propres a la recette. Ne pas les reprendre pour la production. La verification serveur suit la [documentation Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

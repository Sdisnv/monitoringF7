# SCOPE / QUO VADIS : Correctif Complémentaire Du 15.10.2026

## Référence Et Verdict

**READY_FOR_MOA**, pour la PR corrective seulement, sans validation annuelle.
Base GitHub contrôlée directement : `e7672369e08727849e96ef56d4462840d9dfca0e`, fusion PR #21.
Production contrôlée : même commit, déploiement `6ad06be019176816088e3c91` du 15.10 à 06:00:31 UTC.
`/auth/config` confirme LOCAL seul actif ; Okta désactivé dans la configuration effective.
PR #20 et #21 conservées. Branche unique : `codex/scope-qv-complement-moa-20261015`.
Aucune fusion ni livraison de ce correctif ; garde Netlify limitée à cette branche pour éviter sa preview.
La recette locale déjà ouverte, son serveur et sa transaction MOA restent intacts.

## Conduite DAP

Cause : les places 1 et 3 inversaient les blocs conduite/connaissance dans la fonction existante
`qvDapConduiteSlots`. Les places 2 et 4 étaient correctes. Source corrigée, pas de nouveau moteur.

| Place | Présence | Conduite | Connaissance véhicule |
| --- | --- | --- | --- |
| 1 | 18:30 - 19:30 | 18:30 - 19:00 | 19:00 - 19:30 |
| 2 | 19:00 - 20:00 | 19:30 - 20:00 | 19:00 - 19:30 |
| 3 | 20:00 - 21:00 | 20:00 - 20:30 | 20:30 - 21:00 |
| 4 | 20:30 - 21:30 | 21:00 - 21:30 | 20:30 - 21:00 |

Rendu des trois colonnes et du rappel global au format ASCII `HH:MM - HH:MM`.
Le service réutilise cette fonction pour les restitutions de conduite DAP démontrées : type Conduite,
Stat.Com 01522F7, OI DAP:Y1 à Y4 unique, date existante. Cela couvre les lignées des cycles futurs,
sans persister de nouveaux horaires ni modifier la plage globale de l'événement.
Test des 16 soirées et de la restitution d'une lignée 2028, exclusivement en fixture temporaire.

## Authentification : Défauts Reproduits

1. Le login LOCAL plaçait le jeton en mémoire. Le renouvellement modifiait le cookie HttpOnly mais
   pas ce jeton mémoire, envoyé en priorité dans Authorization. Une fois périmé, il provoquait deux
   401, même après un renouvellement réussi par le cookie valide. Reproduction sur le code de base :
   401 et notification de déconnexion ; même scénario corrigé : 200, sans déconnexion.
   Le nouveau jeton retourné par le mécanisme sécurisé existant remplace désormais celui en mémoire.
2. `local_session_unavailable`, erreur temporaire de lecture du stockage de session, était convertie
   en 401 par auth-me, auth-refresh et scope. Injection ciblée de cette panne : les trois fonctions
   renvoyaient 401 avant, renvoient 503 après. L'accès reste refusé pendant la panne, sans assimiler
   l'indisponibilité à une révocation. Une expiration ou révocation réelle reste un 401.

Le 403 de permission ne déclenche pas de renouvellement ni de déconnexion. Une erreur réseau,
un 503 ou un 429 de renouvellement reste temporaire ; le rafraîchissement périodique ne produit
plus de rejet de promesse non géré. Un contrôle de session temporairement indisponible ne purge
pas une session déjà connue. Le jeton mémoire est vidé lors de l'invalidation explicite.

Durées inchangées : jeton d'accès une heure, session LOCAL au maximum douze heures, inactivité
réelle dix minutes, avertissement neuf minutes, renouvellement au plus toutes les huit minutes.
Les événements techniques ne deviennent pas une activité humaine. Synchronisation d'activité
inter-onglets existante conservée. Aucun jeton ajouté à localStorage/sessionStorage, aucun droit,
RLS, paramètre Okta ou secret changé ; aucun nouveau jeton permanent.

L'avertissement et « Rester connecté » préservent la fiche en cours. Après un 401 définitif pendant
la saisie, la reconnexion reste obligatoire ; un brouillon de fiche existante est retenu uniquement
en mémoire, restauré après la fin de connexion du même utilisateur avec droit de gestion et même
version de préparation. Changement d'identité, de route, de version ou de droits : pas de restauration.
Le cache Programme est invalidé lors de la déconnexion pour relire cette version après authentification.
Déconnexion explicite et fermeture/rechargement de l'onglet effacent ce brouillon. Aucune sauvegarde
n'est annoncée sans confirmation du serveur. La redirection d'expiration par inactivité reste inchangée.

Ces défauts sont démontrés, mais les journaux locaux disponibles ne permettent pas d'attribuer chaque
incident historique à l'un d'eux. LOCAL testé ; pas d'essai d'expiration du fournisseur Okta réel.
Reprise après interruption réseau/passage au premier plan et horloge avancée simulées, pas fermeture
physique du capot. Protocole après futur déploiement : conserver une fiche en saisie, provoquer un
renouvellement après expiration du jeton mémoire avec cookie valide, puis une indisponibilité passagère,
et vérifier reprise sans perte ; un 401 réellement définitif doit toujours proposer la connexion.

## Publics Et Inventaire

Réutilisation du catalogue descriptif existant, commun au serveur, aux fiches et aux filtres.
Recherche des équivalents : aucun des quatre publics demandé n'existe dans `scope_public_definitions` ;
AUTO-COND-VL décrit le conducteur VL, pas son candidat, et n'est pas détourné.
Le code de fonction existant `C DAP` sert d'ancre descriptive Chef DAP ; il ne définit pas une population.

| Libellé | Code descriptif du catalogue | Position |
| --- | --- | --- |
| Chef section DAP | CMDT:CHEF-SECTION-DAP | Après Chef DAP |
| Candidat cond VL | AUTO:CAND-VL | Après cond VL |
| Resp matériel | ENC:RESP-MATERIEL | Encadrement, provisoire |
| Préposé matériel | ENC:PREPOSE-MATERIEL | Encadrement, provisoire |

Inventaire courant : un libellé libre Chef section DAP dans la préparation non publiée
`QV26-VISION-LOCALE-DAP-F8783089:O3:S1`, UUID `f179d163-5d1b-428a-a6e0-bb3be7a56bdb`.
Aucune occurrence courante identifiée pour les trois autres libellés exacts, ni dans la projection
de production ni dans la recette locale ouverte. Voir `free-label-inventory.json` pour les périmètres.
Correspondance d'affichage et de filtrage exacte, sans approximation, sans doublon de case cochée.
Le payload intercepté conserve le libellé libre et les autres publics d'origine : **zéro conversion**.
Aucune publication, affectation ou qualification individuelle n'est créée par ces descriptions.
Une éventuelle conversion persistante reste soumise à une autorisation MOA distincte.

## Rattachement Persistant FOCA Exécuté Sous GO

| Cursus | Identifiant existant | Avant | Après |
| --- | --- | --- | --- |
| CI-DAP | f618cd32-7e4a-4b2a-a34c-47d4fd5d02f1 | Aucun rattachement | FOCA |
| CI-DPS | ea7029d5-4355-4b8c-b976-6037d6bcea7e | Aucun rattachement | FOCA |

Transaction autorisée exécutée le 15.10 à 06:40:00 UTC, après clone et recette ciblée.
Verrou, vérification des IDs, codes, statut et dernière modification ; refus si divergence.
Seuls domain_code et updated_at de ces deux références sont modifiés ; deux traces du journal
sont ajoutées, journal antérieur contrôlé intact. Relecture indépendante à 06:40:32 UTC : les deux
cursus sous FOCA, C-GROUPE déjà FOCA inchangé. Aucun nouveau cursus ni migration générale.

Quinze tables protégées ont une empreinte identique avant/après, notamment l'intégralité des
obligations Programme, événements, liens publiés, présences, affectations, attendus, allocations de
codes, qualifications, versions/modules/cohortes et sélections de cursus. Par conséquent Stat.Com,
codes SCOPE et décisions existantes sont inchangés à 100 %, dont les familles DAP acquises.
Les quatre références Public cible et les créneaux corrigés attendent le futur déploiement applicatif.

## Vérifications Ciblées Et Fichiers

- Tests ciblés de logique et protocole d'authentification : PASS, comparaison directe au code de base.
- Clone PostgreSQL `scope_qv_2027_recipe_20261006` : PASS, 943 lignes projetées, deux références
  corrigées en tables temporaires, 16 conduites, restitution 2028, filtres communs et IDs conservés.
- ROLLBACK du clone vérifié par onze empreintes publiques strictement identiques.
- Navigateur réel sur le serveur local existant : PASS, nouveaux assets/projection substitués dans
  une session isolée ; renouvellement cookie LOCAL réel, perturbations contrôlées, sélection des
  publics et payloads interceptés sans écriture métier au serveur. Aucune recette écrite en production.
- Build Netlify local production/offline réussi ; diff contrôlé. Campagnes acquises non relancées.

Application : `assets/js/scope-ui-logic.js`, `assets/js/scope-ui.js`, `assets/js/scope-auth-idle.js`,
`netlify/lib/_scope-quo-vadis-service.js`, `netlify/lib/_auth-utils.js`,
`netlify/functions/auth-me.js`, `netlify/functions/auth-refresh.js`, `netlify/functions/scope.js`.
Garde de branche seulement : `netlify.toml`.
Outils ciblés : `scripts/scope-qv-complement-tests.js`, `scripts/scope-qv-complement-clone.js`,
`scripts/scope-qv-complement-browser.js`, `scripts/lib/scope-qv-ci-foca-go.js` (rollback par défaut).
Documentation : ce rapport, `docs/business-rules/quo-vadis-canonical-rules.md` et
preuves/captures dans `docs/captures/qv-complement/`. Aucun snapshot brut ni configuration locale livré.

Réserves : conversions persistantes des publics non autorisées, position matériel provisoire,
validation en conditions réelles Okta/veille physique non revendiquée. Aucun de ces points
n'autorise une nouvelle publication. La PR reste soumise au GO MOA pour fusion et déploiement.

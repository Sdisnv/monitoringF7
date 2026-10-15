# SCOPE — Diagnostic Netlify du 15.10.2026

> Capitalisation phase B : import de la phase A actualisée à #27. Les déclarations « hors dépôt », « pas de phase B » et les prochains GO dans le texte importé décrivent son mandat historique. La mission de phase B autorise maintenant sa capitalisation documentaire en une PR, sans fusion ni déploiement. Les réserves AUDIT_INCOMPLET et Programme 2027 NON VALIDÉ restent applicables. Voir [provenance](README.md).


Diagnostic distinct demandé par la mission §11, rattaché aux huit livrables. **Lecture seule. Aucune protection, session, durée, configuration ou donnée modifiée. Aucun test applicatif relancé.**

## Périmètre et sources

Site `scope-sdisnv`, ID `6def8d4d-78c6-4112-bb76-6891df0e0a52`. Observability : `get_counts(status_codes)` sur deux fenêtres, `get_request_logs` pour HTTP≥400 sur l’heure (29 lignes reçues), et `get_request_detail` sur trois exemples (refresh401, programme401, asset499). Les comptages sont des réponses du service sur ces fenêtres, pas une garantie d’exhaustivité au-delà de sa rétention ou de son instrumentation. Les données conservées d’audit sont limitées aux heures, chemins sans query string, codes, durées, invocations et request IDs techniques ; pas d’IP, cookie, jeton ni profil utilisateur dans les livrables.

GitHub et Netlify : `main` et déploiement publié `6ad0d08255cda461366136f2` ready correspondent à `3bdad82029ef79ea721bcf4043a5bb47e4d86764`. Publication15.10 à13:09:59.769UTC /15:09:59.769suisse. La fenêtre horaire traverse ce déploiement ; une proximité temporelle ne démontre pas une cause.

L’observation MOA **247 requêtes /10,93%** est historique. Sa fenêtre exacte et la définition de son dénominateur ne sont pas disponibles ; elle n’est ni reproduite à l’identique ni présentée comme courante. Les pourcentages calculés ci-dessous sont simplement `nombre de statuts ≥400 / nombre total retourné`, distincts de la métrique « erreurs » d’un tableau de bord.

## Comptages observés

Heure : **15.10.2026 12:46:53–13:46:53UTC**, soit **14:46:53–15:46:53Europe/Zurich**.

| HTTP | Nombre |
|---|---|
| 200 | 282 |
| 499 | 23 |
| 401 | 6 |
| 201 | 1 |

Total **312** ; HTTP≥400 **29 (9,29%)** ; **aucun 5xx retourné**. Une erreur HTTP ne démontre pas en soi un incident métier.

Journée partielle : **14.10 à22:00UTC–15.10 à13:46:53UTC**, soit **15.10 00:00–15:46:53heure suisse**.

| HTTP | Nombre |
|---|---|
| 200 | 2010 |
| 499 | 64 |
| 401 | 59 |
| 404 | 10 |
| 302 | 9 |
| 422 | 7 |
| 201 | 6 |
| 304 | 5 |
| 301 | 3 |

Total **2173** ; HTTP≥400 **140 (6,44%)** ; **aucun 5xx retourné**. Les 404/422 de cette fenêtre ont été comptés, pas qualifiés individuellement. Un422 peut refléter une règle de validation ; aucun motif précis n’est démontré ici. Aucun refus n’est automatiquement déclaré légitime.

## Les six401 : routes, fonctions, limites

| UTC15.10 | Méthode / route | Durée ms | Fonction invoquée | Request ID |
|---|---|---|---|---|
| 2026-10-15T13:11:14.568745743Z | GET /api/scope/quo-vadis/programmes/2027 | 2091.82 | True | 01M4ZV0CW8G4M6P5XVQK4R63J9 |
| 2026-10-15T13:11:16.656580216Z | POST /auth/refresh | 1249.56 | True | 01M4ZV0EXGJ9E27N32S35AAG6B |
| 2026-10-15T13:11:17.937775063Z | GET /api/scope/alerts | 614.86 | True | 01M4ZV0G5H0MHC6BRA6852874P |
| 2026-10-15T13:11:18.565288811Z | POST /auth/refresh | 374.26 | True | 01M4ZV0GS5KKZANHBXZDPPBPCZ |
| 2026-10-15T13:11:47.891811236Z | GET /auth/me | 860.34 | True | 01M4ZV1DDK5FX08ND1C9E9M78F |
| 2026-10-15T13:11:48.76523848Z | POST /auth/refresh | 733.6 | True | 01M4ZV1E8XJK652WXJXNXDT5YS |

Six invocations effectives : fonction `scope` pour programme et alertes, `auth-refresh` trois fois, `auth-me` une fois. Toutes suivent la publication #27, entre13:11:14 et13:11:48UTC. Les tableaux `logs` sont vides ; les trois détails examinés ne donnent pas de motif applicatif permettant de distinguer requête anonyme, expiration, reconnexion, protection attendue ou défaut réel.

**Cause NON VÉRIFIÉE.** Le code d’authentification utilise un magasin lié au déploiement ; une reconnexion après changement de déploiement est une hypothèse à examiner, pas une conclusion. Aucun utilisateur ni client identifié. La correction #22 n’est pas rouverte sans cas résiduel précis. Les opérations réalisées par la MOA et leur sauvegarde n’ont pas été observées ici ; le déploiement ready et les200 ne prouvent pas que toute saisie fonctionne pour tous les profils.

## Les vingt-trois499

Aucune invocation de fonction n’est signalée pour ces23 requêtes. Une requête `/auth/me` suit le déploiement vers13:10:03UTC (≈225,5ms),20 assets statiques arrivent en rafale vers13:11:46.996–13:11:47.001UTC (≈45–50ms), puis `/auth/config` et `/favicon.ico` vers13:20:16UTC. Les traces ne contiennent pas le motif client.

Le499 est généralement compatible avec une fermeture de connexion avant réponse ; cette sémantique générique est documentée par [Cloudflare](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-499/). Cette documentation n’établit ni une cause Netlify ni l’usage de Cloudflare pour ces requêtes. La rafale et l’absence d’invocation sont compatibles avec des annulations/interruption de navigation ; **aucune attribution au navigateur, robot ou utilisateur et aucune panne serveur ne sont démontrées**. Aucun 499 ne doit être transformé ici en500 supposé.

## Qualification et priorité opérationnelle

| Observation | Qualification démontrée | Priorité / suite proposée |
|---|---|---|
| 5xx | Aucun sur les deux fenêtres retournées | Aucun incident CRITIQUE serveur démontré ; pas preuve de santé universelle |
| 401 | Refus réel ; légitimité et impact métier inconnus | À qualifier. CRITIQUE si indisponibilité générale confirmée de saisie ; MAJEURE si parcours essentiel bloqué ; MODÉRÉE si périmètre limité avec contournement ; ne pas assigner gravité sans impact |
| 499 | Interruption possible ; motif non connu | À relier à un incident utilisateur avant correction ; ne pas affaiblir sécurité |
| 404/422 journée | Codes agrégés uniquement | Qualifier route et motif si corrélation avec incident ; aucune cause inventée |
| 10,93%historique | Fenêtre/définition non obtenues | Ne pas comparer directement au ratio brut calculé9,29% |

Prochain diagnostic ciblé : recueillir heure, route, opération et effet visibles lors d’un incident réel ; corréler au request ID et au déploiement ; distinguer refus attendu et erreur applicative ; proposer un correctif seulement pour cause établie. Toute future action suit SCOPE-INCIDENT-001 : signalement → qualification → priorité → correction → test ciblé → publication autorisée → vérification → clôture. Maintien de saisie et rollback selon SCOPE-PROD-001. Aucun allongement de session, retrait de garde, désactivation de protection ou publication effectué.

Source de méthode : [Netlify — Status codes](https://docs.netlify.com/manage/monitoring/observability/reference/status-codes/). Cette référence explique les codes et groupes ; les chiffres ci-dessus proviennent des appels Observability, pas de la documentation publique. Preuve locale normalisée hors dépôt : `proofs/netlify-observability.json` ; manifest de restitution et copies disponibles dans le dossier d’audit. La cause détaillée des401 et la définition de l’ancien10,93% demeurent réservées.

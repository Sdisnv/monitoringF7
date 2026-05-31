# Rapport Phase 8 — Préparation backend optionnel futur — Monitoring F7 v57

## Résumé

Monitoring F7 v57 prépare l’application à une éventuelle évolution backend, sans ajouter de serveur ni modifier le comportement actuel. L’application reste une application statique offline-first compatible ouverture locale, Netlify gratuit, GitHub, IndexedDB et localStorage.

## Ce qui est préparé

### Configuration backend optionnel

Le fichier `assets/js/backend-config.js` expose une configuration centrale :

- `backendEnabled: false`
- `apiBaseUrl: ""`
- `syncEnabled: false`
- `authMode: "local"`
- `storageMode: "local"`
- `auditMode: "local"`

Cette configuration empêche toute activation réseau par défaut.

### Façade API future

Le fichier `assets/js/api-client.js` prépare :

- `apiGet()`
- `apiPost()`
- `apiPut()`
- `apiDelete()`
- `isBackendEnabled()`
- `getBackendStatus()`

Lorsque le backend est désactivé, les fonctions retournent une réponse locale maîtrisée et ne lancent aucune requête distante.

### Auth future

`assets/js/auth.js` conserve la session locale actuelle et expose `MonitoringAuthService` pour séparer progressivement :

- session locale navigateur ;
- futur mode `authMode: "backend"` ;
- statut d’authentification local/backend.

Aucune authentification serveur n’est ajoutée en v57.

### Sync future

Le fichier `assets/js/sync-service.js` prépare :

- file d’attente locale ;
- statut de synchronisation ;
- dernière tentative ;
- base future pour conflits.

La synchronisation reste inactive en v57.

### Diagnostic local

Le diagnostic local affiche désormais discrètement :

- mode backend : désactivé ;
- mode stockage : local ;
- mode auth : local ;
- synchronisation : inactive ;
- dernière tentative sync : aucune.

## Ce qui n’est pas activé

- Aucun backend réel.
- Aucune API distante obligatoire.
- Aucune authentification forte serveur.
- Aucun audit serveur infalsifiable.
- Aucune synchronisation réelle.
- Aucun changement de calcul métier.

## Pourquoi le mode local reste prioritaire

Le monitoring doit rester utilisable en contexte SDIS sans dépendance réseau, sans serveur obligatoire et sans risque de perte de données lors d’une publication GitHub/Netlify. Les données restent dans le navigateur de l’utilisateur via localStorage/IndexedDB et les exports restent le mécanisme de sauvegarde maîtrisé.

## Limites client-only

Le mode local ne fournit pas :

- contrôle d’accès institutionnel fiable ;
- révocation centrale ;
- traçabilité serveur ;
- preuve d’intégrité des journaux ;
- synchronisation multi-postes ;
- sauvegarde distante automatique.

Ces fonctions nécessitent un backend réel dans une phase ultérieure.

## Risques

- Les journaux restent modifiables localement.
- Les données restent liées au navigateur/poste.
- Une suppression du stockage navigateur supprime les données locales non exportées.
- Une future activation backend devra être testée séparément et progressivement.

## Tests réalisés

- Contrôle structure ZIP.
- Contrôle présence des nouveaux fichiers Phase 8.
- Contrôle version v57 dans `index.html`, `README.md`, `assets/js/config.js`.
- Contrôle syntaxe JavaScript avec `node --check` sur les fichiers JS.
- Contrôle absence d’appel backend obligatoire.
- Contrôle conservation des clés de journal local v56 pour éviter perte du journal local existant.
- Contrôle génération ZIP final.

## Recommandations futures

1. Définir une vraie stratégie d’authentification serveur avant toute activation backend.
2. Définir un modèle de droits par rôle.
3. Mettre en place un journal serveur séparé du journal local.
4. Ajouter une synchronisation progressive uniquement après tests pilotes.
5. Conserver l’export JSON comme filet de sécurité.
6. Ne jamais rendre le backend obligatoire tant que le mode SDIS offline n’est pas remplacé par une procédure validée.

# Monitoring F7 v51 — Rapport Phase 2

## Objet

Phase 2 limitée à la sécurisation réaliste Netlify client-only. L’application reste statique, offline-first, compatible GitHub/Netlify gratuit et ouverture locale.

## Durcissements réalisés

### DOM / XSS simple

- Ajout d’un module `MonitoringSecurity`.
- Centralisation de `safeText`, `safeSetHTML`, `sanitizeHTML` et `createSafeElement`.
- Suppression des attributs événementiels `on*`, URL `href/src` injectées et balises non autorisées dans les nouveaux flux sécurisés.
- Préparation progressive pour remplacer les `innerHTML` historiques sans casser les rendus métier existants.

### Imports JSON

- Contrôle fichier vide, taille, encodage binaire, structure, type, version et volumes anormaux.
- Détection de champs critiques inattendus (`script`, `html`, `token`, `password`, `credential`, `auth`).
- Snapshot local avant import.
- Rollback automatique si l’import échoue.
- Messages utilisateur plus opérationnels.
- Compatibilité ascendante conservée : tableau legacy, objet legacy, format avec `referencePeriods`.

### Imports CSV

- Contrôle taille.
- Détection CSV vide ou binaire.
- Détection séparateur `;` ou `,`, avec préférence métier documentée pour `;`.
- Contrôle en-têtes obligatoires : Date, Événement, Domaine, Stat.Com, Public cible.
- Confirmation utilisateur avant import.

### Auth/session locale

- Séparation progressive via `MonitoringSessionManager`.
- Session locale `sessionStorage` clarifiée.
- Expiration douce après 12 h.
- Nettoyage session invalide.
- Synchronisation d’état UI `auth-locked` / `auth-active`.

### Actions sensibles

- Confirmation renforcée avant import JSON.
- Confirmation avant import CSV.
- Double confirmation avant effacement complet des données locales.
- Confirmations existantes de suppression conservées.

### Netlify

- CSP réaliste compatible application statique et Chart.js local.
- `frame-ancestors 'none'` et `X-Frame-Options DENY`.
- `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- Cache différencié assets / HTML / JSON / CSV.

### Erreurs globales

- Handler global `window.error`.
- Handler global `unhandledrejection`.
- Logs console structurés `[Monitoring F7 sécurité]`.
- Marqueur CSS potentiel `monitoring-runtime-warning` en cas d’erreur runtime.

### Stockage local

- Lecture JSON avec fallback.
- Détection corruption.
- Sauvegarde best-effort d’une copie `_corrupt_` avant fallback.
- Snapshot/restore pour imports.
- Détection disponibilité IndexedDB.
- Contrôle indicatif quota navigateur.

## Sécurité réaliste obtenue

- Réduction du risque XSS simple.
- Meilleure robustesse des imports.
- Moins d’erreurs silencieuses.
- Session locale plus cohérente.
- Déploiement Netlify plus strict.
- Protections UX sur opérations destructives.

## Limites restantes honnêtes

La v51 ne fournit pas et ne peut pas fournir sans backend :

- authentification forte réelle ;
- contrôle d’accès institutionnel fiable ;
- permissions non contournables ;
- audit trail sécurisé ;
- chiffrement serveur ;
- protection contre un utilisateur local malveillant ayant accès au navigateur ou aux fichiers.

## Risques résiduels

- Le client-only reste adapté à un pilote SDIS contrôlé, pas à une exposition institutionnelle sensible.
- Les données restent dépendantes du navigateur et des sauvegardes exportées.
- Des `innerHTML` historiques subsistent dans `app.js`; la v51 ajoute la base sécurisée sans refonte brutale. Leur remplacement complet doit être progressif pour éviter les régressions métier.

## Préparation Phase 3

La v51 prépare :

- extraction progressive des services DOM/import/storage ;
- future couche storage centralisée ;
- modularisation contrôlée hors monolithe `app.js` ;
- futur backend optionnel ;
- futur audit trail serveur si nécessaire.

## Contrôles réalisés

- Contrôle syntaxe JS avec `node --check` sur `app.js`, `auth.js`, `security.js`, `storage.js`, `monitoring-f7-evolution.js`, `config.js`.
- Contrôle présence scripts dans `index.html`.
- Contrôle cohérence version v51.
- ZIP final testé après génération.

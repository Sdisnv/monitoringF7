# Rapport Phase 7 — Journalisation locale et traçabilité légère v56

## Objectif

La Phase 7 ajoute une journalisation locale utile au diagnostic pilote SDIS, au support utilisateur et à la maintenance progressive de Monitoring F7.

Cette journalisation ne crée pas un audit trail institutionnel sécurisé. Elle reste volontairement client-only, locale au navigateur, exportable par l’utilisateur et non infalsifiable.

## Service ajouté

Le fichier `assets/js/audit-log.js` expose :

- `logInfo(eventType, message, context)` ;
- `logWarning(eventType, message, context)` ;
- `logError(eventType, message, context)` ;
- `logAction(eventType, message, context)` ;
- `getLogs()` ;
- `clearLogs()` ;
- `exportLogs()` ;
- `getLogDiagnostics()`.

Le stockage est local, compatible avec l’architecture IndexedDB/localStorage existante. Le journal utilise une clé locale dédiée et ne modifie pas les clés métier historiques.

## Événements journalisés

La v56 journalise notamment :

- ouverture de l’application ;
- login local réussi ou refusé ;
- logout ;
- prévisualisation import CSV/JSON ;
- intégration import local ;
- import JSON historique ;
- import CSV historique ;
- export JSON ;
- export CSV ;
- export sauvegarde complète ;
- export journal support ;
- restauration sauvegarde complète ;
- migration stockage ;
- erreur IndexedDB / StorageService ;
- erreurs globales JavaScript ;
- promesses rejetées ;
- avertissements graphiques ;
- génération du dashboard commandement ;
- suppression/reset sensible ;
- suppression d’un effectif de référence.

## Données volontairement non journalisées

Pour limiter les risques liés à la vie privée et éviter la surcharge, le journal ne stocke pas volontairement :

- contenu complet des JSON importés ;
- contenu complet des CSV importés ;
- données métier détaillées ;
- NIP utilisateur ;
- mots de passe, tokens, secrets ou credentials ;
- fichiers complets ;
- liste nominative ou information personnelle détaillée.

Le contexte technique est réduit à des informations minimales : version, type d’événement, statut, message court, taille approximative, nombre d’éléments ou diagnostic de stockage.

## Vue Diagnostic local

Une nouvelle section `Diagnostic local` est ajoutée dans `Gestion Monitoring`.

Elle permet :

- voir les derniers événements ;
- actualiser l’affichage ;
- exporter le journal support en `.json` ;
- vider le journal avec confirmation ;
- afficher la version applicative ;
- afficher l’état IndexedDB/localStorage ;
- afficher la dernière migration connue ;
- afficher le nombre d’entrées journalisées ;
- afficher une estimation du stockage local.

Le dashboard commandement n’est pas surchargé.

## Rotation et limitation de taille

Le journal conserve au maximum les 1000 dernières entrées.

Lorsqu’une nouvelle entrée dépasse cette limite, les plus anciennes sont supprimées automatiquement. En cas de quota localStorage insuffisant, une réduction de secours conserve une moitié récente du journal.

## Export support

L’export génère un fichier JSON nommé selon le modèle :

`monitoring-f7-journal-support-v56-AAAA-MM-JJ_HHMM.json`

Le fichier contient :

- type d’export ;
- version application ;
- date d’export ;
- rappel des limites client-only ;
- diagnostic stockage ;
- événements récents.

## Limites client-only documentées

La v56 fournit :

- un journal utile pour diagnostic local ;
- un journal utile pour support pilote ;
- un journal exportable par l’utilisateur.

La v56 ne fournit pas :

- journal sécurisé contre modification locale ;
- centralisation serveur ;
- preuve infalsifiable ;
- authentification institutionnelle forte ;
- audit trail réglementaire ;
- contrôle fiable contre un utilisateur local malveillant.

## Tests réalisés

Contrôles effectués :

- ajout du service `audit-log.js` ;
- chargement du service avant les modules applicatifs ;
- syntaxe JavaScript contrôlée par `node --check` sur les fichiers JS ;
- version v56 alignée dans `index.html`, `config.js`, `README.md` et scripts versionnés ;
- présence de la vue `Diagnostic local` ;
- boutons export / clear / refresh présents ;
- export journal JSON implémenté ;
- rotation automatique implémentée ;
- handlers `window.onerror` et `unhandledrejection` raccordés ;
- dashboard commandement conservé ;
- aucune modification volontaire des calculs métier.

## Recommandations Phase 8

Pour une phase ultérieure :

1. ajouter une page de recette pilote avec checklist intégrée ;
2. améliorer l’assistant d’export support avec résumé anonymisé ;
3. ajouter un mode lecture seule pour consultation commandement ;
4. préparer une option backend facultative pour audit serveur réel ;
5. documenter une procédure de collecte support standardisée SDIS.

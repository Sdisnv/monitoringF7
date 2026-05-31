# Monitoring F7 v50 — Rapport de stabilisation Phase 1

## Objectif

Phase 1 limitée à la stabilisation critique pré-production Netlify. La version v50 reste une application HTML/CSS/JavaScript statique, offline-first, sans backend obligatoire et sans framework.

## Corrections réalisées

- Passage cohérent de v49 à v50 dans l’interface, la configuration, les textes visibles et la documentation principale.
- Correction de la session locale : lecture compatible ancien marqueur `1`, nouveau format JSON, conservation des profils existants, état connecté/déconnecté plus explicite et logout plus complet.
- Clarification du mode Admin local : la barrière de connexion est une protection UX locale stockée dans le navigateur, pas une authentification institutionnelle forte.
- Ajout d’une validation d’import JSON : fichier vide/refusé, taille maximale, BOM, structure connue, version lisible, bornes de volumes anormaux, messages utilisateur plus propres.
- Ajout d’une validation d’import CSV : fichier vide, extension, taille maximale, séparateur détectable, compatibilité `;` conservée et virgule tolérée avec avertissement.
- Réduction d’un usage `innerHTML` évitable dans le statut d’import au profit de `textContent`.
- Robustesse graphique : nettoyage sécurisé des instances Chart.js, fallback canvas natif si Chart.js n’est pas disponible, normalisation des valeurs non numériques.
- Ajout de `netlify.toml` avec headers réalistes pour une application statique Netlify gratuite : CSP client-only, MIME JSON/CSV, cache assets et no-cache HTML.

## Sécurité réaliste côté Netlify statique

Amélioré : sanitation minimale sur les messages, validation d’import, headers HTTP, clarification UX, limitation des fichiers entrants.

Non fourni sans backend : authentification forte, rôles fiables, permissions institutionnelles, audit trail infalsifiable, journalisation serveur.

## Risques résiduels

- `assets/js/app.js` reste le cœur métier principal et concentre encore beaucoup de responsabilités.
- Plusieurs rendus métier utilisent encore `innerHTML` avec échappement local ; ils n’ont pas été refondus pour éviter les régressions.
- Le stockage reste local au navigateur ; une suppression du profil navigateur ou du stockage efface les données locales sans sauvegarde JSON préalable.
- La sécurité reste adaptée à un pilote SDIS contrôlé, pas à une production institutionnelle multi-utilisateurs.

## Préparation Phase 2

Phase 2 peut extraire progressivement les services de validation/import/export et les helpers DOM depuis `app.js`, sans changer le schéma de données ni le fonctionnement offline-first.

## Autocontrôle Phase 1

- Syntaxe JavaScript contrôlée avec `node --check` sur les fichiers modifiés.
- Ouverture locale conservée : `index.html` reste autonome.
- Netlify gratuit conservé : pas de build, pas de backend, pas de dépendance serveur.
- Imports/export existants conservés.
- KPI, calculs métier et structures JSON non modifiés volontairement.

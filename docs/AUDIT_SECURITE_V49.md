# Audit sécurité — Monitoring F7 v49

## Synthèse

Monitoring F7 v49 reste une application statique offline-first. Le niveau de sécurité raisonnable pour Netlify gratuit est amélioré côté client, mais l’application ne doit pas être considérée comme une application à authentification forte sans backend.

## Points contrôlés

| Domaine | Résultat | Correction v49 |
|---|---|---|
| Stockage local | Données conservées dans localStorage/IndexedDB navigateur | Pas d’écrasement au déploiement |
| Login | Barrière locale existante, non équivalente à un serveur sécurisé | Session structurée, profil validé, mot de passe temporaire renforcé |
| Session | Session navigateur locale | `sessionStorage` structuré avec date de début |
| Administration | Protection UI locale uniquement | Rappel documentaire du risque majeur |
| Imports CSV/JSON | Risque de fichier invalide ou trop volumineux | Limite de taille sur couche v49 |
| Restauration sauvegarde | Risque d’injection de clés localStorage inconnues | Liste blanche des clés autorisées |
| Affichage dynamique | Nombreux rendus existants avec échappement partiel | Les rendus v49 utilisent `escapeHtml` et `textContent` lorsque possible |
| Secrets | Aucun secret réel intégré | Aucun `.env`, token ou secret ajouté |
| Netlify gratuit | Compatible statique | Aucun backend imposé |
| Première installation | Chemins relatifs | Logo et assets en chemins relatifs |

## Corrections mineures intégrées

1. Logo intégré proprement dans `assets/img`.
2. Login rendu plus professionnel et responsive.
3. Version v49 harmonisée.
4. Session locale structurée.
5. Longueur minimale du nouveau mot de passe portée à 6 caractères.
6. Validation du profil local avant déverrouillage.
7. Confirmation à la déconnexion.
8. Limite de taille pour import CSV/JSON de la couche v49.
9. Restauration de sauvegarde limitée aux clés applicatives attendues.
10. Documentation Netlify/GitHub mise à jour.

## Problèmes majeurs relevés

### 1. Authentification uniquement côté client

- Risque : élevé.
- Impact : un utilisateur ayant accès au navigateur et au code peut contourner la barrière locale.
- Non corrigé immédiatement : nécessite un backend, une gestion serveur des comptes et des sessions.
- Recommandation : prévoir une phase backend optionnelle avec authentification serveur, rôles et audit trail.
- Compatibilité Netlify gratuit : non complet sans service externe ou fonctions/serverless.

### 2. Administration protégée uniquement par l’interface

- Risque : élevé.
- Impact : les fonctions sensibles restent exposées côté client si l’utilisateur manipule le navigateur.
- Non corrigé immédiatement : une vraie séparation des permissions nécessite un serveur.
- Recommandation : déplacer les actions admin sensibles côté backend lors d’une future phase.
- Compatibilité Netlify gratuit : partielle avec Netlify Functions ou backend externe.

### 3. Données locales non chiffrées

- Risque : moyen à élevé selon les données saisies.
- Impact : accès possible depuis le profil navigateur/poste utilisateur.
- Non corrigé immédiatement : chiffrement local robuste impliquerait gestion de clé et récupération utilisateur.
- Recommandation : définir une politique de poste, export/sauvegarde et chiffrement futur si données sensibles.
- Compatibilité Netlify gratuit : possible côté client, mais avec limites opérationnelles.

### 4. Absence de journal serveur centralisé

- Risque : moyen.
- Impact : actions et restaurations non auditables centralement.
- Non corrigé immédiatement : pas de backend obligatoire dans cette mission.
- Recommandation : ajouter audit trail serveur dans une phase dédiée.
- Compatibilité Netlify gratuit : partielle avec fonctions/serverless ou service externe.

### 5. Robustesse limitée contre les manipulations avancées du navigateur

- Risque : moyen.
- Impact : localStorage/IndexedDB peuvent être modifiés manuellement.
- Non corrigé immédiatement : limite structurelle d’une application statique client-only.
- Recommandation : validation serveur future pour données officielles.
- Compatibilité Netlify gratuit : non complet sans backend.

# Stockage local et évolution backend — Monitoring F7 v58.4

Monitoring F7 v58.4 conserve strictement le modèle v58.3.

## État livré

- Application statique client-only.
- Stockage navigateur local.
- `localStorage` pour session, profil local, paramètres légers et clés historiques.
- `IndexedDB` via `StorageService` lorsque disponible.
- Export/import manuel pour sauvegarde, restauration et transfert.

## Limites assumées

- Pas de données centralisées.
- Pas de synchronisation multi-postes.
- Pas d’authentification institutionnelle serveur.
- Pas d’audit trail infalsifiable.
- Perte possible si les données du navigateur sont supprimées.

## Décisions v58.4

- `backendEnabled = false`.
- `SyncService` inactif.
- Aucun backend ajouté.
- Aucun build imposé.
- Netlify gratuit conservé.

## Suite recommandée

Ne préparer Netlify Blobs ou Postgres qu’après validation du pilote local et définition d’une vraie authentification serveur, de rôles utilisateurs et d’une stratégie de sauvegarde/restauration.

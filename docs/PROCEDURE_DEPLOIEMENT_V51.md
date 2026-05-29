# Procédure GitHub → Netlify — Monitoring F7 v51

1. Décompresser `Monitoring_F7_v51.zip`.
2. Vérifier que le dossier publié contient directement `index.html`, `assets/`, `docs/` et `netlify.toml`.
3. Remplacer les fichiers du dépôt GitHub par la v51 complète.
4. Committer la version v51.
5. Laisser Netlify redéployer automatiquement depuis GitHub.
6. Après déploiement, tester dans un navigateur récent : login local, reload, import JSON, import CSV, export JSON, graphiques, KPI, suppression protégée.

## Points de vigilance

- Les données restent dans le navigateur utilisateur (`localStorage` / IndexedDB). Les mises à jour de fichiers sur Netlify ne doivent pas effacer ces données.
- Exporter régulièrement un JSON de sauvegarde.
- Ne pas présenter le login local comme une authentification institutionnelle forte.
- Pour une sécurité forte, prévoir une phase backend optionnelle.

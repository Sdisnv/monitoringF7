# Procedure Terminal — GitHub / Netlify

## Dossier local

```bash
cd "/Users/thierrygrunig/Projects/Monitoring F7"
```

## Depot GitHub

```text
https://github.com/Sdisnv/monitoringF7.git
```

## 1. Controler le projet

```bash
./scripts/check-local.sh
```

## 2. Connecter le dossier local au depot GitHub

A faire une seule fois :

```bash
./scripts/setup-github-sdisnv.sh
```

Si GitHub contient deja des fichiers, recuperer l'historique avant le premier push :

```bash
git pull origin main --allow-unrelated-histories
```

Verifier les conflits eventuels avant de continuer.

## 3. Publier une mise a jour

```bash
./scripts/update-sdisnv-netlify.sh "Release Monitoring F7 v65"
```

Ce script :

1. controle le projet ;
2. ajoute les fichiers applicatifs ;
3. cree un commit ;
4. pousse sur GitHub ;
5. laisse Netlify deployer automatiquement.

## 4. Creer un ZIP local de livraison

```bash
./scripts/package-release.sh v65
```

Le fichier sera cree dans :

```text
releases/Monitoring_F7_v65.zip
```

## 5. Voir l'etat du workflow

```bash
./scripts/status-sdisnv.sh
```

## Rappel securite

Par defaut, la version v65 reste locale/offline-first :

- `backendEnabled = false`
- `serverAuthEnabled = false`
- `centralStorageEnabled = false`
- `syncEnabled = false`

Ne pas activer ces options sur Netlify sans recette dediee.

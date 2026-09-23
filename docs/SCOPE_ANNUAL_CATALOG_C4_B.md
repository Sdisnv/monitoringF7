# Catalogue annuel canonique C4-B

## Responsabilite

C4-B ajoute une couche descriptive et generative entre les versions d'activite existantes et QUO VADIS. Elle reutilise `scope_event_definitions` et `scope_event_definition_versions`; aucune seconde identite d'activite n'est creee.

La chaine est: version d'activite, besoin annuel, occurrence planifiee, session planifiee, projection QUO VADIS en memoire. Elle ne cree ni evenement operationnel, ni population attendue, ni participation.

## Contrats

- Une version porte ses domaines, sessions, periodicite, publics, qualifications, roles, lieux, responsables, contraintes et contributions Stat.Com.
- Un besoin `READY` contient un snapshot et un fingerprint et epingle chaque `PublicRuleVersion` C2-B.
- Les versions `ACTIVE` et leurs enfants semantiques sont immuables. Un besoin `READY` est corrige par supersession, pas par reecriture.
- Le generateur est pur, deterministe et ne connait ni PostgreSQL ni le service operationnel.
- La projection QUO VADIS produit seulement des intentions en memoire reliees aux occurrences et sessions planifiees.

## Decisions figees

- DPS-DAP est une seule activite avec plusieurs liaisons de domaine.
- Les qualifications PR, AUTO et FOSPEC utilisent les definitions C3-B; aucune colonne ou branche specialisee n'est ajoutee.
- Plusieurs contributions Stat.Com explicites peuvent coexister par activite ou session.
- Aucun objet CADET n'est cree. JSP-CAD reste fail-closed tant que la source et la temporalite de la date de naissance ne sont pas arbitrees.
- Le diagnostic legacy classe les candidats A/B/C/D sans backfill automatique.

## Hors perimetre

Publication, creation de `scope_evenements`, affectation de personnes, gel des populations, resolution de contraintes, backfill et modification du comportement QUO VADIS restent hors C4-B.

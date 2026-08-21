# SCOPE-ALERTS-1 — moteur d’alertes

## Timezone

- Référence : `Europe/Zurich` (CET/CEST, DST via `Intl`).
- Comparaison : dates civiles `YYYY-MM-DD`.
- Minuit : à 00:00 Zurich le jour J, `today = J`. Un événement daté J-1 est échu.
- Injection tests : `today` (ISO) ou `now` (Date). Le navigateur ne décide pas.

## J-7 / population non figée

Aucun délai J-7 n’a été validé MOA. Choix ALERTS-1 :

- événement **échu** + nominatif non figé → P0 `NOMINATIF_NON_FIGE`
- événement **futur** non figé → pas d’alerte d’urgence (liste Exercices)

## REPORTE

Comme ANNULE : aucune alerte P0. Pas d’action de clôture sur un exercice reporté.

## Déduplication P0 (un événement → une alerte)

1. `SAISIE_NON_RENSEIGNE` / `QUANTITATIF_INCOMPLET`
2. `NOMINATIF_NON_FIGE`
3. `CLOTURE_POSSIBLE`
4. `ECHU_PLANIFIE` (repli)

`ECHU_PLANIFIE` et `CLOTURE_POSSIBLE` ne coexistent jamais.

P1 objectifs peuvent coexister avec une P0 : question différente (taux vs opération).

## Acquittement ≠ résolution

- Résolution : la cause disparaît (clôture, saisie, etc.) → l’alerte n’est plus calculée.
- Acquittement : table additive `scope_alertes_acquittements`.
- P0 : « vu » possible, **jamais masqué** tant que la cause existe.
- P1/P2 : un acquittement réduit le bruit (`includeAcknowledged=1` pour les revoir).

## P1-03 / PERSON-1

- Absences non excusées répétées : contrat `repeatedUnexcusedAbsences.enabled=false` (seuil « ≥ 2 » non validé MOA).
- Personne sous objectif : `personUnderObjective.enabled=false` (PERSON-1 non ouvert).
- LEGACY et QUANTITATIF ne produisent jamais d’alerte personne.

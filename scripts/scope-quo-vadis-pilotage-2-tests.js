#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const schema = read('netlify/lib/_scope-schema.js');
const migration = read('database/migrations/20260916_scope_quo_vadis_pilotage_2.sql');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const fn = read('netlify/functions/scope.js');
const api = read('assets/js/scope-api.js');
const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));

for (const src of [schema, migration, service]) {
  assert.ok(!/\b(drop|truncate)\s+table\b/i.test(src), 'aucun DROP/TRUNCATE dans PILOTAGE-2');
  assert.ok(!/delete\s+from\s+scope_(evenements|attendus|participations|personnes|affectations)\b/i.test(src), 'aucune suppression de données métier');
  assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(src), 'aucune création prématurée événement/attendu/participation');
}

assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-pilotage-2'/.test(schema), 'borne migration PILOTAGE-2 requise');
assert.ok(/create table if not exists scope_quo_vadis_cursus_programmes/.test(schema), 'sélection cursus programme manquante');
assert.ok(/scope-quo-vadis-pilotage-2/.test(schema), 'migration runtime PILOTAGE-2 non enregistrée');
assert.ok(/create table if not exists scope_quo_vadis_cursus_programmes/.test(migration), 'migration SQL PILOTAGE-2 incomplète');

assert.ok(/loadCatalogue/.test(service), 'catalogue annuel dérivé manquant');
assert.ok(/scope_event_definitions/.test(service), 'catalogue doit exploiter les définitions SCOPE');
assert.ok(/scope_cibles/.test(service), 'fallback référentiels SCOPE manquant');
assert.ok(/listActivityReferences/.test(service) && /e\.salle/.test(service) && /scope_evenements/.test(service), 'historique SCOPE doit lire la salle en lecture seule');
assert.ok(!/e\.lieu_id/.test(service), 'historique 2026 ne doit plus joindre un lieu_id inexistant');
assert.ok(/console\.error\('QUO VADIS: historique 2026 indisponible/.test(service), 'erreur historique doit être loguée');
assert.ok(/buildActivities/.test(service), 'vue activités manquante');
assert.ok(/scope_lieux/.test(service) && /lieu_id/.test(service), 'référentiel lieux SCOPE non exploité');
assert.ok(/generateCatalogueObligations/.test(service), 'génération catalogue 2027 manquante');
assert.ok(/generateDpsInstructionObligations/.test(service), 'instructions DPS manquantes');
assert.ok(/KICK-OFF[\s\S]*ABC[\s\S]*VARIA[\s\S]*FEU[\s\S]*PIONNIER/.test(service), 'ordre métier DPS incomplet');
assert.ok(/Demi-sections concernées réalisées avant instruction de section/.test(service), 'prérequis demi-sections non représenté');
assert.ok(/astreinte semaine N et N-1/.test(service), 'contrainte PIONNIER astreinte non représentée');
assert.ok(/hasHolidayWeekend/.test(service), 'week-end férié non traité');
assert.ok(/derogation|Dérogation|requiresDerogation/i.test(service), 'dérogation non représentée');
assert.ok(/String\(domain \|\| ''\)\.toUpperCase\(\) === 'DAP'/.test(service), 'vendredi ne doit pas être codé globalement par domaine');
assert.ok(/simultaneousEventsAllowed:\s*true/.test(service), 'multi-événements même jour doivent rester possibles');
assert.ok(/compactEventCode/.test(service), 'contrainte code événement court non préparée');
assert.ok(/operationalEventsCreated:\s*0/.test(service), 'aucun événement opérationnel');
assert.ok(/attendusCreated:\s*0/.test(service), 'aucun attendu');
assert.ok(/participationsCreated:\s*0/.test(service), 'aucune participation');
assert.ok(/on conflict.*do nothing/is.test(service), 'génération idempotente attendue');

assert.ok(/setCursusSelection/.test(service) && /setQuoVadisCursus/.test(api), 'choix des cursus non raccordé');
assert.ok(/retainProposal/.test(service) && /retainQuoVadisProposal/.test(api), 'arbitrage date retenue non raccordé');
assert.ok(/\/quo-vadis\/programmes\/:annee\/cursus/.test(fn), 'route choix cursus manquante');
assert.ok(/\/quo-vadis\/proposals\/:id\/retain/.test(fn), 'route arbitrage manquante');

assert.ok(/renderQuoVadisAgendaAnnuel/.test(ui), 'vue agenda annuel manquante');
assert.ok(/Synthèse 2027/.test(ui) && /Agenda annuel/.test(ui) && /Toutes les activités 2027/.test(ui) && /À arbitrer/.test(ui) && /Alertes/.test(ui) && /Cursus 2027/.test(ui) && /Dates connues/.test(ui), 'navigation QUO VADIS professionnelle incomplète');
assert.ok(/renderQuoVadisActivites/.test(ui) && /qvFilteredActivities/.test(ui) && /Réinitialiser les filtres/.test(ui), 'vue Activités et filtres manquants');
assert.ok(/data-qv-sort/.test(ui) && /qvSortHeader/.test(ui), 'tri Activités manquant');
assert.ok(/renderQuoVadisActivite/.test(ui) && /Référence 2026/.test(ui) && /Justification/.test(ui), 'fiche activité exploitable manquante');
assert.ok(/Date connue \/ contrainte/.test(ui), 'fiche dates connues non refondue');
assert.ok(/Retenir cette proposition/.test(ui), 'action retenir proposition manquante');
assert.ok(/Date de début/.test(ui) && /Heure de début/.test(ui) && /Date de fin/.test(ui) && /Heure de fin/.test(ui), 'formulaire dates connues incomplet');
assert.ok(/Recalculer les propositions 2027/.test(ui), 'libellé métier du recalcul manquant');
assert.ok(/Préparation 2027 mise à jour/.test(ui) && /Nouvelles propositions/.test(ui) && /Points d’attention/.test(ui), 'compte rendu génération exploitable manquant');
assert.ok(/renderQuoVadisAlertes/.test(ui), 'alertes non consultables');
assert.ok(/qv-year-grid/.test(ui) && /qv-mini-month/.test(ui), 'agenda annuel 12 mois manquant');
assert.ok(/renderQuoVadisAgenda/.test(ui) && /qv-agenda-day/.test(ui), 'agenda chronologique manquant');
assert.ok(/qvLieuOptions/.test(ui) && /qv-future-lieu-id/.test(ui) && /data-qv-proposal-lieu/.test(ui), 'lieux référentiels non sélectionnables');
assert.ok(/Dates déjà saisies/.test(ui) && /scope-form-section/.test(ui), 'Dates connues pas assez structurées');
assert.ok(/Cohorte 2026/.test(ui) && /Cohorte 2027/.test(ui), 'distinction cohortes CI DPS manquante');
assert.ok(/qv-subnav/.test(css) && /qv-year-grid/.test(css) && /qv-mini-cal/.test(css) && /qv-definition-list/.test(css), 'style QUO VADIS professionnel manquant');
assert.ok(/if \(r\.screen === 'quo-vadis'\) jobs\.push\(loadQuoVadis\(\)\)/.test(ui), 'QUO VADIS ne doit charger que sur sa route');
assert.ok(!/r\.screen === 'accueil'[\s\S]{0,120}loadQuoVadis/.test(ui), 'Accueil ne doit pas déclencher QUO VADIS');
assert.ok(/loadQuoVadisHistory/.test(ui), 'historique 2026 doit être chargé à la demande');
assert.ok(/generateQuoVadisReport/.test(ui) && /SCOPE_QUO_VADIS_2027_Programme\.csv/.test(ui), 'exports PDF/Excel manquants');
assert.ok(/Lieu à définir/.test(qvUi), 'libellé lieu vide attendu');
assert.ok(!/Vue annuelle/.test(qvUi), 'la synthèse ne doit plus s’appeler Vue annuelle');
assert.ok(!/Dates futures/.test(qvUi), 'Dates futures doit être remplacé par Dates connues');

assert.ok(/before: beforeSummary/.test(service) && /newProposals/.test(service) && /unchangedProposals/.test(service) && /attentionPoints/.test(service), 'bilan réel avant/après génération manquant');
assert.ok(/buildAlerts/.test(service) && /buildAnnualBreakdown/.test(service), 'alertes ou synthèse annuelle manquantes');

const forbiddenUi = ['THURSDAY', 'MONDAY', 'SATURDAY', 'PREFERRED', 'ALLOWED', 'FORBIDDEN', 'source_ref', 'metadata', 'CORE-1', 'seed', 'day_policy'];
for (const word of forbiddenUi) {
  assert.ok(!qvUi.includes(word), `terme technique interdit dans UI QUO VADIS: ${word}`);
}
assert.ok(!/1\/2|2\/2|1\/4|2\/4/.test(service + qvUi), 'notation slash interdite');
assert.ok(!/scope-pill success/.test(qvUi), 'vert structurant à éviter dans QUO VADIS');

console.log('scope-quo-vadis-pilotage-2-tests: ok');

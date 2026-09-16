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

assert.ok(/renderQuoVadisPlanning/.test(ui), 'vue planning manquante');
assert.ok(/Vue annuelle/.test(ui) && /Planning/.test(ui) && /À arbitrer/.test(ui) && /Cursus 2027/.test(ui), 'navigation QUO VADIS professionnelle incomplète');
assert.ok(/Fiche date future/.test(ui), 'fiche date future non refondue');
assert.ok(/Retenir/.test(ui), 'action retenir proposition manquante');
assert.ok(/Date début/.test(ui) && /Heure début/.test(ui) && /Date fin/.test(ui) && /Heure fin/.test(ui), 'formulaire dates futures incomplet');

const forbiddenUi = ['THURSDAY', 'MONDAY', 'source_ref', 'metadata', 'CORE-1'];
for (const word of forbiddenUi) {
  assert.ok(!qvUi.includes(word), `terme technique interdit dans UI QUO VADIS: ${word}`);
}
assert.ok(!/1\/2|2\/2|1\/4|2\/4/.test(service + qvUi), 'notation slash interdite');
assert.ok(!/scope-pill success/.test(qvUi), 'vert structurant à éviter dans QUO VADIS');

console.log('scope-quo-vadis-pilotage-2-tests: ok');

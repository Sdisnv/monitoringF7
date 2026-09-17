#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const logicSrc = read('assets/js/scope-ui-logic.js');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const fn = read('netlify/functions/scope.js');
const api = read('assets/js/scope-api.js');
const pdfRenderer = read('netlify/lib/_scope-pdf-renderer.js');
const report = read('netlify/lib/_scope-report-service.js');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

const routes = [
  ['#/quo-vadis', 'synthese'],
  ['#/quo-vadis/synthese', 'synthese'],
  ['#/quo-vadis/agenda-annuel', 'agenda-annuel'],
  ['#/quo-vadis/agenda', 'agenda'],
  ['#/quo-vadis/activites', 'activites'],
  ['#/quo-vadis/a-arbitrer', 'a-arbitrer'],
  ['#/quo-vadis/alertes', 'alertes'],
  ['#/quo-vadis/cursus', 'cursus'],
  ['#/quo-vadis/regles', 'regles'],
  ['#/quo-vadis/dates-connues', 'dates-connues']
];
for (const [hash, view] of routes) {
  const parsed = L.parseHash(hash);
  assert.strictEqual(parsed.screen, 'quo-vadis', hash);
  assert.strictEqual(parsed.qvView, view, hash);
}

const fiche = L.parseHash('#/quo-vadis/activites/abc-123?from=agenda');
assert.strictEqual(fiche.qvView, 'activite');
assert.strictEqual(fiche.qvActivityId, 'abc-123');
assert.strictEqual(fiche.qvFrom, 'agenda');

const jour = L.parseHash('#/quo-vadis/agenda-annuel?jour=2027-02-06');
assert.strictEqual(jour.qvView, 'agenda-annuel');
assert.strictEqual(jour.qvJour, '2027-02-06');

assert.ok(/qv-year-grid/.test(qvUi) && /qv-mini-month/.test(qvUi), '12 mini-mois requis');
assert.ok((qvUi.match(/qv-mini-month/g) || []).length >= 1, 'mini-calendriers absents');
assert.ok(/qv-agenda-day/.test(qvUi), 'agenda chronologique absent');
assert.ok(/qvFormatDate/.test(qvUi), 'dates ISO datetime doivent être affichées');
assert.ok(/\[qvTime\(row\.startsAt\), qvTime\(row\.endsAt\)\]/.test(qvUi) || /Horaire/.test(qvUi), 'horaire métier manquant');
assert.ok(/sort\.key === 'date' \? \['date', 'time', 'domain', 'title'\]/.test(qvUi), 'tri DATE → HEURE → DOMAINE → ACTIVITÉ manquant');
assert.ok(/Référence 2026/.test(qvUi), 'bloc référence 2026 manquant');
assert.ok(/loadQuoVadisHistory/.test(ui), 'historique non lazy');
assert.ok(/e\.salle/.test(service) && !/e\.lieu_id/.test(service), 'historique doit utiliser salle');
assert.ok(/Lieu à définir/.test(qvUi), 'libellé lieu vide incorrect');
assert.ok(/Date annoncée/.test(qvUi) && /Enregistrer la date annoncée/.test(qvUi), 'formulaire dates annoncées incomplet');
assert.ok(/scope-form-section/.test(qvUi) && /scope-field/.test(qvUi), 'grammaire formulaire SCOPE absente');
assert.ok(/Annuler/.test(qvUi), 'action Annuler manquante');
assert.ok(!/disabled>Modifier/.test(qvUi), 'bouton Modifier factice interdit');
assert.ok(/Retenir cette proposition/.test(qvUi), 'arbitrage manquant');
assert.ok(/generateQuoVadisReport/.test(api) && /\/reports\/quo-vadis/.test(fn), 'route PDF manquante');
assert.ok(/renderQuoVadisProgramme/.test(pdfRenderer) && /generateQuoVadisProgrammeReport/.test(report), 'moteur PDF SCOPE non réutilisé');
assert.ok(/SCOPE_QUO_VADIS_2027_Programme\.csv/.test(ui) && /\\uFEFF/.test(ui), 'export Excel/CSV manquant');
assert.ok(/if \(r\.screen === 'quo-vadis'\) jobs\.push\(loadQuoVadis\(\)\)/.test(ui));
assert.ok(!/r\.screen === 'accueil'[\s\S]{0,160}loadQuoVadis/.test(ui));
assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(service));
assert.ok(/operationalEventsCreated:\s*0/.test(service));
assert.ok(!/technicalCode/.test(qvUi), 'identifiant technique encore visible');
assert.ok(!/Vue annuelle/.test(qvUi));
assert.ok(!/Dates futures/.test(qvUi));
assert.ok(/qv-year-legend/.test(qvUi), 'légende agenda annuel manquante');
assert.ok(/Janvier – mars 2028/.test(qvUi), 'consultation 2028 manquante');
assert.ok(/qv-agenda-table/.test(qvUi) && /qv-agenda-date-row/.test(qvUi), 'agenda chronologique dense manquant');
assert.ok(/qv-filter-lieu/.test(qvUi), 'filtre lieu manquant');
assert.ok(/hideMonth/.test(qvUi), 'l’agenda ne doit plus dupliquer le filtre mois');
assert.ok(/Le recalcul met à jour les propositions de planification/.test(qvUi));
assert.ok(/Il ne crée aucun événement opérationnel/.test(qvUi));
assert.ok(/Dates déjà saisies/.test(qvUi), 'liste dates connues manquante');
assert.ok(/Correspondance à confirmer/.test(qvUi) || /Fiabilité/.test(qvUi), 'fiabilité 2026 manquante');
assert.ok(/qv-home-link/.test(qvUi), 'retour synthèse manquant');
assert.ok(!/id="qv-future-end-date"[^>]*required/.test(qvUi), 'date de fin ne doit plus être obligatoire');
assert.ok(/resetGeneratedDrafts/.test(service), 'recalcul doit réinitialiser les brouillons QV');
assert.ok(/selected_proposal_id is null/.test(service) && /p\.status <> 'RETENU'/.test(service), 'proposition retenue non préservée');
assert.ok(/score < 55/.test(service), 'matching 2026 trop permissif');
assert.ok(/hasVacances/.test(service) && /VACANCES_SCOLAIRES/.test(service), 'vacances non consommées par le moteur');
assert.ok(/throw error/.test(service), 'erreur historique encore avalée');

const forbiddenUi = ['THURSDAY', 'MONDAY', 'SATURDAY', 'PREFERRED', 'ALLOWED', 'FORBIDDEN', 'source_ref', 'metadata', 'CORE-1', 'seed', 'day_policy'];
for (const word of forbiddenUi) {
  assert.ok(!qvUi.includes(word), `terme technique interdit: ${word}`);
}

const { renderQuoVadisProgrammePdf } = require('../netlify/lib/_scope-pdf-renderer');
(async () => {
  const rendered = await renderQuoVadisProgrammePdf([
    { date: '06.02.2027', horaire: '19:30 – 21:30', domaine: 'DPS', oi: 'G1', activite: 'KICK-OFF', specCursus: '', lieu: 'Caserne G1', etat: 'À arbitrer' }
  ], { search: 'Toutes', domain: 'DPS', oi: 'G1', status: 'Tous', month: 'Février', sort: 'Date — horaire — domaine — activité' }, { generatedAt: '2026-09-16T12:00:00Z' });
  assert.ok(Buffer.isBuffer(rendered.buffer) && rendered.buffer.slice(0, 5).toString() === '%PDF-', 'PDF QUO VADIS non généré');
  assert.ok(rendered.pages >= 1, 'PDF sans pagination');
  console.log('scope-quo-vadis-professional-3-tests: ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

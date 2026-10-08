'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalRule,PLANNING_MODES } = require('../netlify/lib/_scope-annual-catalog-service');
const report = require('../netlify/lib/_scope-annual-report-rule');
const publicEngine = require('../netlify/lib/_scope-public-engine');
const foundations = require('../netlify/lib/_scope-public-foundations');
const { createCatalogUiHarness,catalogPayload,activityPayload } = require('./scope-annual-catalog-ui-harness');

test('unknown durable fields stay unqualified',() => {
  assert.deepEqual(canonicalRule(),{ businessDomain:null,planningMode:null,priorityKind:null,
    preferredWeekdays:[],allowedWeekdays:[],planningMonths:[],usualStart:null,usualEnd:null,blockStart:null,blockEnd:null });
  assert.deepEqual(PLANNING_MODES,['AUTOMATIC','ANNUAL_DATE','ARBITRATION','NON_RENEWED']);
});

test('approved annual report rule is durable and has no annual date',() => {
  const rule = canonicalRule(report.APPROVED_RULE);
  assert.equal(rule.businessDomain,'F3');
  assert.equal(rule.planningMode,'ANNUAL_DATE');
  assert.equal(rule.priorityKind,'ABSOLUTE');
  assert.equal(rule.blockStart,'12:00');
  assert.equal(rule.blockEnd,'24:00');
  assert.doesNotMatch(JSON.stringify(rule),/2027-02-23|23\.02\.2027/);
});

test('planning modes, business domains and hours reject inventions and invalid ranges',() => {
  for(const input of [
    { planningMode:'HUMAN_REVIEW' },{ businessDomain:'DPS' },{ priorityKind:'URGENT' },
    { preferredWeekdays:['FUNDAY'] },{ planningMonths:['13'] },
    { usualStart:'21:00',usualEnd:'19:00' },{ blockStart:'12:00' },
    { blockStart:'12:00',blockEnd:'10:00' }
  ]) assert.throws(() => canonicalRule(input));
});

test('Catalogue fiche offers canonical editing and distinguishes annual data',() => {
  const { hooks } = createCatalogUiHarness();
  const payload = activityPayload();
  payload.approvedRule = { ...report.APPROVED_RULE,publicCode:'SDIS-TOUS',statCom:'071F3' };
  const html = hooks.renderAnnualCatalogActivityHtml(payload);
  hooks.state.annualCatalogDefinitionEdit = true;
  const editHtml = hooks.renderAnnualCatalogActivityHtml(payload);
  for(const id of ['annual-edit-business-domain','annual-edit-statcom','annual-edit-publics',
    'annual-edit-responsible','annual-edit-location','annual-edit-room','annual-edit-planning-mode',
    'annual-edit-preferred-days','annual-edit-allowed-days','annual-edit-usual-start','annual-edit-block-end']){
    assert.match(editHtml,new RegExp(id),id);
  }
  assert.match(html,/règle Rapport annuel validée|Règle Rapport annuel validée/);
  assert.match(html,/date 2027 reste une donnée annuelle distincte/);
});

test('qualified Catalogue rows prefer versioned publics and do not invent a period',() => {
  const { hooks } = createCatalogUiHarness();
  const payload = catalogPayload();
  payload.activities[0] = { ...payload.activities[0],qualified:true,publicCodes:['SDIS-TOUS'],canonicalPublics:['JSP:1'] };
  const html = hooks.renderAnnualCatalogHtml(payload);
  assert.match(html,/SDIS-TOUS/);
  assert.doesNotMatch(html,/JSP:1|Toute l’année/);
  assert.match(html,/À qualifier/);
});

test('chief and deputy public is explicit and fails closed without dated function facts',() => {
  const definition = foundations.PUBLIC_DEFINITIONS.find((row) => row.code === 'DPS-CHEFS-SECTION-REMPLACANTS');
  assert.ok(definition);
  const base = { ruleVersion:definition.version,evaluationDate:'2027-06-15',
    persons:[{ personneId:'CHEF',actif:true },{ personneId:'REMPLACANT',actif:true },{ personneId:'MEMBRE',actif:true }],periods:[],
    assignments:['CHEF','REMPLACANT','MEMBRE'].map((personneId) => ({ personneId,domainCode:'DPS',validFrom:'2027-01-01' })) };
  const incomplete = publicEngine.evaluatePublicRule(base);
  assert.equal(incomplete.resolutionStatus,'INCOMPLETE');
  assert.deepEqual(incomplete.personIds,[]);
  const resolved = publicEngine.evaluatePublicRule({ ...base,functions:[
    { personneId:'CHEF',functionCode:'DPS_CHEF_SECTION',validFrom:'2027-01-01' },
    { personneId:'REMPLACANT',functionCode:'DPS_REMPLACANT_CHEF_SECTION',validFrom:'2027-01-01' }
  ] });
  assert.deepEqual(resolved.personIds,['CHEF','REMPLACANT']);
});

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const coverage = require('../netlify/lib/_scope-quo-vadis-coverage');
const consolidation = require('../netlify/lib/_scope-quo-vadis-consolidation');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');

const copy = (value) => JSON.parse(JSON.stringify(value));

function history(){
  const rows = [];
  for(let activity = 0; activity < 28; activity += 1){
    for(let session = 1; session <= (activity < 7 ? 8 : 1); session += 1){
      rows.push({ evenement_id: `h-${activity}-${session}`, date: '2026-06-06', domaine_code: 'DAP',
        sous_domaine_code: 'Y1', libelle: `Formation métier ${activity}`, exercice_libelle: `Formation métier ${activity}`,
        mode_session: activity < 7 ? 'MULTI' : 'SIMPLE', exercice_id: `exercise-${activity}`,
        session_index: session, nombre_sessions_attendu: activity < 7 ? 8 : 1,
        salle: 'Caserne C1', statut: 'PLANIFIE', statcom_code: `DAP-${activity}` });
    }
  }
  for(let i = 0; i < 52; i += 1) rows.push({ evenement_id: `noise-${i}`, date: '2026-01-01', domaine_code: 'DAP', libelle: `Test recette ${i}` });
  return rows;
}

// This database double executes the real service. Unknown SQL and operational writes fail closed.
class MemoryDatabase {
  constructor(){
    this.programme = { programme_id: 'programme', annee: 2027, code: 'QV-2027', statut: 'PREPARATION', metadata: {} };
    this.events = history();
    this.obligations = [];
    this.proposals = [];
    this.catalogue = [];
    this.steps = [];
    this.futureDates = [];
    this.dps = [];
    this.serial = 0;
    this.failAtFinish = false;
    const interpreted = coverage.interpretHistoricalProgramme(this.events, 2027);
    for(const item of interpreted.activities){
      this.addObligation({ source_type: 'HISTORIQUE', source_ref: `H2026:${item.activityKey}`, title: item.title, domain: item.domain, cible_codes: item.cibleCodes });
    }
    for(let i = 0; i < 70; i += 1){
      const duplicate = i < 28;
      const title = duplicate ? interpreted.activities[i].title : `Template disponible ${i}`;
      this.addObligation({ source_type: i % 2 ? 'DEFINITION' : 'RECURRENT', source_ref: `legacy-${i}`, title, domain: 'DAP', cible_codes: [] });
      this.catalogue.push({ id: `catalogue-${i}`, source: 'DEFINITION', title, domain: 'DAP', metadata: {} });
    }
  }

  addObligation(values){
    const row = { obligation_id: `o-${++this.serial}`, programme_id: 'programme', statut: 'PROPOSE', metadata: {}, ...values };
    this.obligations.push(row);
    return row;
  }

  async transaction(callback){
    const snapshot = copy({ programme: this.programme, obligations: this.obligations, proposals: this.proposals, futureDates: this.futureDates, serial: this.serial });
    try { return await callback({ query: this.query.bind(this) }); }
    catch(error){ Object.assign(this, snapshot); throw error; }
  }

  async query(sql, params = []){
    const q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    const result = (rows = []) => ({ rows: copy(rows), rowCount: rows.length });
    assert.ok(!/\b(insert into|update|delete from) scope_(evenements|attendus|participations|personnes)\b/.test(q), 'operational write forbidden');
    if(q.startsWith('select pg_advisory_xact_lock')) return result();
    if(q.startsWith('select * from scope_quo_vadis_programmes')) return result([this.programme]);
    if(q.startsWith('insert into scope_quo_vadis_cursus_programmes') || q.startsWith('insert into scope_quo_vadis_cursus_step_programmes') || q.startsWith('insert into scope_quo_vadis_calendar_days')) return result();
    if(q.includes('from scope_evenements e')) return result(this.events);
    if(q.includes('from scope_event_definitions d')) return result(this.catalogue);
    if(q.includes('from scope_cibles c')) return result();
    if(q.includes('from scope_lieux')) return result([{ lieu_id: 'lieu-c1', nom_court: 'Caserne C1', oi_code: 'C1', actif: true }]);
    if(q.includes('from scope_quo_vadis_dps_organisation_versions')) return result(this.dps);
    if(q.includes('from scope_quo_vadis_planning_rules') || q.includes('from scope_quo_vadis_calendar_days')) return result();
    if(q.includes('from scope_quo_vadis_cursus_steps s')) return result(this.steps);
    if(q.includes('from scope_quo_vadis_cursus_definitions d')) return result();
    if(q.startsWith('select * from scope_quo_vadis_future_dates')) return result(this.futureDates);
    if(q.startsWith('select p.*')) return result(this.proposals);
    if(q.startsWith('select o.*') || q.startsWith('select * from scope_quo_vadis_obligations where programme_id')) return result(this.obligations);
    if(q.startsWith('insert into scope_quo_vadis_obligations')){
      const existing = this.obligations.find((row) => row.source_type === params[1] && row.source_ref === params[2]);
      if(existing) return result();
      return result([this.addObligation({ source_type: params[1], source_ref: params[2], title: params[5], domain: params[6], cible_codes: params[7],
        priority: params[8], imposed_start_at: params[9], imposed_end_at: params[10], lieu_id: params[12], lieu_libre: params[13], numbering_pattern: params[14], metadata: JSON.parse(params[15]), statut: params[16] })]);
    }
    if(q.startsWith('select * from scope_quo_vadis_obligations')) return result(this.obligations.filter((row) => row.source_type === params[1] && row.source_ref === params[2]));
    if(q.startsWith('insert into scope_quo_vadis_proposals')){
      if(!this.proposals.some((row) => row.obligation_id === params[0] && row.starts_at === params[1] && row.ends_at === params[2])){
        this.proposals.push({ proposal_id: `p-${++this.serial}`, obligation_id: params[0], starts_at: params[1], ends_at: params[2], day_class: params[3], reasons: JSON.parse(params[4]), conflict_summary: JSON.parse(params[5]), lieu_id: params[6], lieu_libre: params[7], status: params[8] });
      }
      return result();
    }
    if(q.startsWith('select proposal_id')) return result(this.proposals.filter((row) => row.obligation_id === params[0] && !row.conflict_summary.generatedObsolete).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 1));
    if(q.startsWith('update scope_quo_vadis_proposals')){
      for(const row of this.proposals.filter((p) => p.obligation_id === params[0])){
        if(q.includes('set obligation_id')) row.obligation_id = params[1];
        else if(q.includes('set conflict_summary')) row.conflict_summary.generatedObsolete = true;
        else if(q.includes('set day_class')){
          if(row.starts_at === params[1] && row.ends_at === params[2] && row.conflict_summary.generatedObsolete){
            Object.assign(row, { day_class: params[3], reasons: JSON.parse(params[4]), conflict_summary: JSON.parse(params[5]), lieu_id: params[6], lieu_libre: params[7], status: params[8] });
          }
        } else if(q.includes("set status = 'retenu'")) { if(!row.conflict_summary.generatedObsolete) row.status = 'RETENU'; }
        else throw new Error(`Unsupported proposal SQL: ${q}`);
      }
      return result();
    }
    if(q.startsWith('update scope_quo_vadis_future_dates')){
      for(const row of this.futureDates){
        if(q.includes('where converted_obligation_id')) { if(row.converted_obligation_id === params[0]) row.converted_obligation_id = params[1]; }
        else if(row.future_date_id === params[1]) row.converted_obligation_id = params[0];
      }
      return result();
    }
    if(q.startsWith('update scope_quo_vadis_obligations')){
      const row = this.obligations.find((o) => o.obligation_id === params[0]);
      assert.ok(row, 'updated obligation exists');
      if(q.includes('set include_in_programme')){
        row.include_in_programme = q.includes('set include_in_programme = true');
        Object.assign(row.metadata, JSON.parse(params[1]));
      } else if(q.includes('set title')){
        Object.assign(row, { title: params[1], domain: params[2], cible_codes: params[3], statut: params[4], selected_proposal_id: null, numbering_pattern: params[5] });
        Object.assign(row.metadata, JSON.parse(params[6]));
      } else if(q.includes('set activity_kind')){
        Object.assign(row, { activity_kind: params[1], periodicity_years: params[2], include_in_programme: params[3], last_occurrence: params[4], classification: JSON.parse(params[5]), statcom_code: params[6] });
      } else if(q.includes("set statut = 'propose'")) { row.statut = 'PROPOSE'; Object.assign(row.metadata, JSON.parse(params[1])); }
      else if(q.includes("set statut = 'planifie'")) { row.statut = 'PLANIFIE'; row.selected_proposal_id = params[1]; Object.assign(row.metadata, JSON.parse(params[2])); }
      else throw new Error(`Unsupported obligation SQL: ${q}`);
      return result();
    }
    if(q.startsWith('update scope_quo_vadis_programmes')){
      if(this.failAtFinish) throw new Error('simulated generation failure');
      Object.assign(this.programme.metadata, JSON.parse(params[1]));
      return result();
    }
    throw new Error(`Unsupported SQL: ${q}`);
  }
}

function snapshot(qv){
  return copy({ obligations: qv.obligations, proposals: qv.proposals, activities: qv.activities, summary: qv.summary, breakdown: qv.breakdown, planning: qv.planning });
}

function verifyPopulation(qv){
  const ids = new Set(qv.obligations.map((row) => row.obligationId));
  assert.strictEqual(qv.summary.totalActivites, ids.size);
  assert.strictEqual(qv.activities.length, ids.size);
  assert.strictEqual(qv.breakdown.domains.reduce((sum, row) => sum + row.total, 0), ids.size);
  assert.ok(qv.proposals.every((row) => ids.has(row.obligationId)));
  assert.ok(qv.planning.months.flatMap((month) => month.days.flatMap((day) => day.items)).every((row) => ids.has(row.obligationId)));
  assert.strictEqual(qv.summary.aArbitrer, qv.activities.filter((row) => row.needsArbitration).length);
}

async function run(){
  const database = new MemoryDatabase();
  const report = coverage.interpretHistoricalProgramme(database.events, 2027);
  assert.strictEqual(report.sourceLines, 129);
  assert.strictEqual(report.activities.length, 28);
  assert.strictEqual(report.sessions, 49);
  assert.strictEqual(database.obligations.length, 98);
  const service = createScopeQuoVadisService({ database });
  const originalHistory = copy(database.events);
  const staleRetained = { proposal_id: 'old-auto-retained', obligation_id: database.obligations[97].obligation_id,
    starts_at: '2027-05-01T10:00:00+00:00', ends_at: '2027-05-01T12:00:00+00:00', status: 'RETENU', reasons: ['Ancien positionnement automatique'], conflict_summary: {} };
  database.obligations[97].metadata.autoPositioned = true;
  database.obligations[97].selected_proposal_id = staleRetained.proposal_id;
  database.proposals.push(copy(staleRetained));
  const first = await service.generateProgramme();
  verifyPopulation(first);
  assert.strictEqual(first.summary.totalActivites, 28, '98 technical obligations become 28 business activities');
  assert.strictEqual(first.proposals.length, 77, '49 additional sessions plus 28 first sessions remain grouped');
  assert.strictEqual(first.generation.consolidation.obsoleteNeutralized, 70);
  assert.ok(first.generation.consolidation.duplicatesAvoided >= 28);
  assert.strictEqual(first.generation.consolidation.excludedComplements.length, 42);
  assert.deepStrictEqual(database.proposals.find((row) => row.proposal_id === staleRetained.proposal_id), staleRetained, 'obsolete retained proposal is archived intact');
  assert.ok(!first.proposals.some((row) => row.proposalId === staleRetained.proposal_id), 'obsolete retained proposal is absent from the active agenda');
  const storedCounts = [database.obligations.length, database.proposals.length];
  const second = await service.generateProgramme();
  assert.deepStrictEqual(snapshot(second), snapshot(first), 'two recalculations retain exactly the same active population and session ids');
  assert.strictEqual(second.generation.consolidation.obsoleteNeutralized, 0);
  assert.deepStrictEqual(database.events, originalHistory);
  assert.deepStrictEqual([database.obligations.length, database.proposals.length], storedCounts, 'even stored rows do not inflate');

  // RECOVERY-1's report counts additional consolidated sessions. Also test exactly 49 total sessions.
  const exact49 = new MemoryDatabase();
  exact49.events = exact49.events.filter((row) => !(row.nombre_sessions_attendu === 8 && row.session_index > 4));
  exact49.events.forEach((row) => { if(row.nombre_sessions_attendu === 8) row.nombre_sessions_attendu = 4; });
  for(let i = 0; i < 28; i += 1) exact49.events.push({ evenement_id: `more-noise-${i}`, date: '2026-01-01', domaine_code: 'DAP', libelle: `Test recette supplémentaire ${i}` });
  const exactResult = await createScopeQuoVadisService({ database: exact49 }).generateProgramme();
  assert.strictEqual(exactResult.coverage.sourceLines, 129);
  assert.strictEqual(exactResult.summary.totalActivites, 28);
  assert.strictEqual(exactResult.proposals.length, 49, '28 activities / 49 actual sessions do not become 98 activities');
  assert.deepStrictEqual(snapshot(await createScopeQuoVadisService({ database: exact49 }).generateProgramme()), snapshot(exactResult));

  const sameLabel = new MemoryDatabase();
  sameLabel.events.forEach((row) => {
    if(['exercise-0', 'exercise-1'].includes(row.exercice_id)) row.libelle = row.exercice_libelle = 'Formation groupée';
  });
  const sameLabelResult = await createScopeQuoVadisService({ database: sameLabel }).generateProgramme();
  assert.strictEqual(sameLabelResult.summary.totalActivites, 28, 'distinct historical exercise identities survive identical display labels');
  assert.strictEqual(sameLabelResult.activities.filter((row) => row.title === 'Formation groupée').length, 2);

  const enriched = new MemoryDatabase();
  const decided = enriched.obligations[10];
  decided.metadata = { arbitrage: { justification: 'Date validée MOA' }, autoPositioned: true, needsArbitration: true };
  decided.statut = 'PLANIFIE';
  decided.selected_proposal_id = 'human-proposal';
  const humanProposal = { proposal_id: 'human-proposal', obligation_id: decided.obligation_id, starts_at: '2027-07-17T09:00:00+00:00', ends_at: '2027-07-17T11:00:00+00:00', status: 'RETENU', reasons: ['Choix humain'], conflict_summary: {}, lieu_id: 'lieu-c1' };
  enriched.proposals.push(copy(humanProposal));
  const duplicateDecision = enriched.obligations[28 + 11];
  duplicateDecision.cible_codes = ['Y1'];
  duplicateDecision.metadata = { arbitrage: { justification: 'Deuxième décision valide' } };
  duplicateDecision.statut = 'PLANIFIE';
  duplicateDecision.selected_proposal_id = 'duplicate-human';
  enriched.proposals.push({ ...copy(humanProposal), proposal_id: 'duplicate-human', obligation_id: duplicateDecision.obligation_id });
  const standalone = enriched.addObligation({ source_type: 'DPS_RULE', source_ref: 'human-new', domain: 'DPS', title: 'Instruction nouvelle validée', cible_codes: ['G1'], metadata: { arbitrage: { justification: 'Activité ajoutée MOA' } }, statut: 'PLANIFIE' });
  enriched.proposals.push({ ...copy(humanProposal), proposal_id: 'standalone-human', obligation_id: standalone.obligation_id });
  enriched.catalogue.push({ id: 'required', source: 'DEFINITION', title: 'Formation supplémentaire requise', domain: 'FOBA', metadata: { programmeRequirement: { required: true, justification: 'Nouvelle formation validée pour 2027', validFrom: '2027-01-01' } } });
  enriched.catalogue.push({ id: 'future-requirement', source: 'DEFINITION', title: 'Formation 2028', domain: 'FOBA', metadata: { programmeRequirement: { required: true, justification: 'À partir de 2028', validFrom: '2028-01-01' } } });
  enriched.steps = [1, 2].map((i) => ({ step_id: `step-${i}`, step_code: `M0${i}`, cohorte_id: 'cohort', cohorte_code: 'CI-DPS-2027', libelle: `Module ${i}`, ordre: i, logical_year: 1, usual_start_time: '19:30', usual_end_time: '21:30' }));
  enriched.dps = [{ oi_code: 'C1', metadata: { programmeActivities: [{ code: 'NEW', label: 'Formation nouvelle', instructionKind: 'section', month: 6, programmeRequirement: { required: true, justification: 'Instruction supplémentaire validée' } }] } }];
  enriched.futureDates = [{ future_date_id: 'known-new', target_year: 2027, date_debut: '2027-04-03', heure_debut: '10:00', heure_fin: '12:00', activite_label: 'Date nouvelle annoncée', domain: 'DAP', metadata: { cibleCode: 'Y1' } },
    { future_date_id: 'known-existing', target_year: 2027, date_debut: '2027-04-10', heure_debut: '10:00', heure_fin: '12:00', activite_label: decided.title, domain: 'DAP', metadata: { cibleCode: 'Y1' } }];
  const announcedBefore = copy(enriched.futureDates);
  const withSupplements = await createScopeQuoVadisService({ database: enriched }).generateProgramme();
  verifyPopulation(withSupplements);
  const ventilation = withSupplements.generation.consolidation;
  assert.deepStrictEqual([ventilation.historical, ventilation.catalogue, ventilation.dps, ventilation.cursus, ventilation.announcedDates, ventilation.humanDecisions], [28, 1, 1, 2, 1, 1]);
  assert.strictEqual(ventilation.total, 34);
  assert.strictEqual(ventilation.humanDecisionsPreserved, 3);
  assert.deepStrictEqual(enriched.proposals.find((p) => p.proposal_id === 'human-proposal'), humanProposal);
  assert.ok(withSupplements.proposals.some((p) => p.proposalId === 'duplicate-human' && p.status === 'RETENU'));
  assert.strictEqual(enriched.obligations.find((o) => o.obligation_id === decided.obligation_id).selected_proposal_id, 'human-proposal');
  assert.deepStrictEqual(enriched.obligations.find((o) => o.obligation_id === decided.obligation_id).metadata.arbitrage, { justification: 'Date validée MOA' });
  assert.strictEqual(enriched.obligations.find((o) => o.obligation_id === duplicateDecision.obligation_id).selected_proposal_id, 'duplicate-human');
  assert.ok(ventilation.activities.every((item) => item.justification), 'every active activity has a business justification');
  const historical = withSupplements.obligations.filter((row) => ['HISTORIQUE', 'CYCLIQUE', 'OPTIONNELLE'].includes(row.sourceType));
  for(const extra of withSupplements.obligations.filter((row) => !historical.includes(row))) assert.ok(!historical.some((row) => consolidation.equivalent(extra, row)), 'supplement is not a historical duplicate');
  assert.deepStrictEqual(enriched.futureDates.map(({ converted_obligation_id, ...row }) => row), announcedBefore);
  const again = await createScopeQuoVadisService({ database: enriched }).generateProgramme();
  assert.deepStrictEqual(snapshot(again), snapshot(withSupplements));

  const failing = new MemoryDatabase();
  const beforeFailure = copy({ obligations: failing.obligations, proposals: failing.proposals });
  failing.failAtFinish = true;
  await assert.rejects(createScopeQuoVadisService({ database: failing }).generateProgramme(), /simulated generation failure/);
  assert.deepStrictEqual({ obligations: failing.obligations, proposals: failing.proposals }, beforeFailure, 'failed reconciliation rolls back');
  assert.ok(!consolidation.equivalent({ domain: 'DPS', title: 'FEU', cibleCodes: ['C1'] }, { domain: 'DPS', title: 'FEU', cibleCodes: ['B1'] }), 'distinct sites remain distinct activities');
  assert.ok(!consolidation.equivalent({ domain: 'DPS', title: 'Module 1', sourceType: 'CURSUS', sourceRef: 'CI-DPS-2026:M01' }, { domain: 'DPS', title: 'Module 1', sourceType: 'CURSUS', sourceRef: 'CI-DPS-2027:M01' }), 'distinct cohorts remain distinct');
  assert.ok(!consolidation.equivalent({ domain: 'FOBA', title: 'Exercice FOBA 1' }, { domain: 'FOBA', title: 'Exercice FOBA 2' }), 'training levels are not session numbers');
  console.log('scope-quo-vadis-moa-consolidation-2-tests: PASS');
  console.log(JSON.stringify({ regression: { before: 98, after: 28, sourceLines: 129, totalSessions: exactResult.proposals.length, recoveryReportAdditionalSessions: report.sessions, obsolete: 70 }, supplements: { historical: ventilation.historical, catalogue: ventilation.catalogue, dps: ventilation.dps, cursus: ventilation.cursus, announcedDates: ventilation.announcedDates, humanDecisions: ventilation.humanDecisions, total: ventilation.total, duplicatesAvoided: ventilation.duplicatesAvoided, decisionsPreserved: ventilation.humanDecisionsPreserved }, idempotence: 'PASS', rollback: 'PASS' }, null, 2));
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

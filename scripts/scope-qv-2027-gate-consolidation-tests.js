'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const metrics = require('../docs/SCOPE_QV_2027_GATE_CONSOLIDATION_METRICS.json');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const check = (name, run) => { run(); console.log(`PASS ${name}`); };

async function main() {
  const source = readWorkbook(workbookPath);
  const fixture = createFixture(null);
  const qv = await fixture.service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows.filter((row) => !row.external);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const extract = (name) => fs.readFileSync(path.join(__dirname, `../docs/SCOPE_QV_2027_GATE_CONSOLIDATION_${name}.csv`), 'utf8');
  const detailCsv = extract('DETAIL_OCCURRENCES_OI');
  const summaryCsv = extract('SYNTHESE_OI');
  const reviewCsv = extract('HUMAN_REVIEW');

  check('classeur 2026 direct, 847 lignes datées, empreinte stable', () => {
    assert.equal(source.sha256, metrics.workbookSha256);
    assert.equal(source.rows.filter((row) => row.date.startsWith('2026-')).length, 847);
  });
  check('candidat courant 850 occurrences, gate historique figé à 856, aucune identité dupliquée', () => {
    assert.equal(metrics.programmePhysicalRows, 856);
    assert.equal(rows.length, 850);
    assert.equal(rows.filter((row) => row.startsAt).length, 850);
    assert.equal(new Set(rows.map((row) => row.id)).size, 850);
    assert.equal(new Set(rows.map((row) => row.sessionId)).size, 850);
    assert.equal(metrics.datedDuplicateKeys2027, 0);
  });
  check('OI: 178 événements physiques multi-OI pour 698 associations, 1244 associations au total', () => {
    assert.equal(metrics.multiOiPhysical2027, 178);
    assert.equal(metrics.multiOiAssociations2027, 698);
    assert.equal(metrics.oiAssociations2027, 1244);
    assert.equal(metrics.oiUndocumented2026, 355);
    assert.ok(metrics.oiUndocumented2027 > 0);
  });
  check('G1 section: lundi de Pâques théorique déplacé au mardi sans perte de code, OI ou public', () => {
    const row = byId.get('QV26-INSTR-SCT-KICK-OFF-5DBF1193:O8:S1');
    assert.ok(row);
    assert.deepEqual(row.calendarAdjustment, {
      rule: 'G1_LUNDI_FERIE_DEPLACE_MARDI', theoreticalDate: '2027-03-29',
      holiday: 'Lundi de Pâques', resultingDate: '2027-03-30'
    });
    assert.equal(row.startsAt, '2027-03-30T18:30');
    assert.equal(row.endsAt, '2027-03-30T21:30');
    assert.equal(row.code, '012G1.013');
    assert.equal(row.statCom, '012G1');
    assert.deepEqual(row.ois, ['G1']);
    assert.deepEqual(row.publics, ['N02']);
    assert.equal(row.historicalProposal.sourceLine, 204);
    assert.equal(rows.filter((item) => item.id === row.id).length, 1);
    assert.equal(rows.filter((item) => item.startsAt === row.startsAt && item.label === row.label
      && item.ois.includes('G1') && item.publics.includes('N02')).length, 1);
    assert.ok(detailCsv.split('\n').some((line) => line.includes(row.id)
      && line.includes('G1_LUNDI_FERIE_DEPLACE_MARDI')));
  });
  check('fériés, vacances, veilles et week-ends: exceptions visibles sans déplacement silencieux', () => {
    assert.equal(metrics.holidayDates2027.length, 9);
    assert.ok(metrics.vacationPeriods2027.some((row) => row.debut === '2027-07-03' && row.fin === '2027-08-22'));
    assert.ok(metrics.calendarReview2027.some((row) => row.date === '2027-03-27'
      && row.motif.includes('WEEKEND_FERIE_INSTR_SCT')));
    assert.ok(metrics.calendarReview2027.some((row) => row.date === '2027-05-15'
      && row.motif.includes('WEEKEND_FERIE_INSTR_DEMI_SCT')));
    assert.ok(metrics.calendarReview2027.some((row) => row.date === '2027-05-05'
      && row.motif.includes('VEILLE_FERIE')));
    assert.ok(detailCsv.split('\n').some((line) => line.includes('Instr demi-sct')
      && line.includes('VACANCES_SCOLAIRES') && line.includes('AUTORISABLE_VACANCES_INSTRUCTION')));
    assert.ok(metrics.calendarReview2027.some((row) => row.motif.includes('CTA_FENETRE_FERIEE')));
  });
  check('conduite DPS 56, deux par demi-section avec source; DAP 16', () => {
    const dps = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7');
    const dap = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '01522F7');
    assert.equal(dps.length, 56);
    assert.equal(dap.length, 16);
    assert.equal(rows.filter((row) => L.qvProgrammeFilterType(row) === 'Conduite').length, 72);
    for (const site of ['G1','C1','B1','B2']) for (const half of cta.operationalHalfSections(site)) {
      const pair = dps.filter((row) => row.ois[0] === site && row.publics[0] === half);
      assert.equal(pair.length, 2, `${site}/${half}`);
      for (const row of pair) assert.equal(row.startsAt, byId.get(row.conduiteEvidence.sourceId).endsAt);
    }
    for (const oi of ['Y1','Y2','Y3','Y4']) assert.equal(dap.filter((row) => row.ois[0] === oi).length, 4);
  });
  check('classifications et extraction: incertitude conservée, 433 décisions distinctes à examiner', () => {
    assert.equal(detailCsv.trim().split('\n').length - 1, metrics.detailOiRows);
    assert.equal(summaryCsv.trim().split('\n').length - 1, metrics.summaryRows);
    assert.equal(reviewCsv.trim().split('\n').length - 1, metrics.reviewPhysicalRows);
    assert.equal(metrics.reviewPhysicalRows, 433);
    assert.equal(metrics.classificationCounts['2027:HUMAN_REVIEW'], 212);
    assert.equal(metrics.classificationCounts['2026:HUMAN_REVIEW'], 136);
    assert.ok(summaryCsv.split('\n').some((line) => line.includes('JSP:') && line.includes('OI non coché')));
    const ids = reviewCsv.trim().split('\n').slice(1).map((line) => line.split(';').slice(0, 2).join(';'));
    assert.equal(new Set(ids).size, ids.length);
  });
  check('écritures limitées au fixture calendrier/cursus, aucun événement ou personnel modifié', () => {
    const writes = fixture.queries.filter((query) => /^(?:insert|update|delete|alter|drop)\b/i.test(query.sql.trim()));
    assert.ok(writes.length > 0);
    assert.ok(writes.every((query) => /^\s*(?:insert into|delete from) scope_quo_vadis_(?:calendar_days|cursus_programmes|cursus_step_programmes)\b/i.test(query.sql)));
    assert.ok(!writes.some((query) => /scope_evenements|scope_personnes/i.test(query.sql)));
  });
  console.log('QV-2027-GATE-CONSOLIDATION: 8/8 PASS');
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

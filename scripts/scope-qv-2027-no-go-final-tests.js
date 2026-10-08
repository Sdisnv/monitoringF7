'use strict';

const assert = require('node:assert/strict');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const { resolveStatComCode } = require('../netlify/lib/_scope-statcom-referential');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const { buildExtraction } = require('./scope-qv-2027-no-go-final-extraction');
const gate = require('../docs/SCOPE_QV_2027_GATE_CONSOLIDATION_METRICS.json');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const check = (name, fn) => { fn(); console.log(`PASS ${name}`); };

async function main() {
  const source = readWorkbook(workbookPath);
  const fixture = createFixture(null);
  const qv = await fixture.service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows.filter((row) => !row.external);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const byLine = new Map(source.rows.map((row) => [row.sourceLine, row]));
  const extraction = await buildExtraction();
  const decisionById = new Map(extraction.detail.map((row) => [row.Occurrence, row.Décision]));

  check('2026 direct et FOCA annulées, six occurrences retirées sans remplacement', () => {
    assert.equal(source.sha256, gate.workbookSha256);
    assert.equal(rows.length, 850);
    assert.equal(rows.filter((row) => !row.startsAt).length, 0);
    assert.equal(rows.filter((row) => row.label === 'Groupe de travail FOCA').length, 0);
  });
  check('Formation groupée 1.1 à 1.6 distinctes en 2026 et 2027', () => {
    const history = source.rows.filter((row) => /Formation groupée 1\.[0-6](?:\s|$)/.test(row.title));
    assert.deepEqual(history.map((row) => row.sourceLine), [309, 347, 350, 389, 421, 433]);
    assert.deepEqual(history.map((row) => row.title.match(/1\.[0-6]/)[0]), ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
    assert.ok(history.every((row) => row.statCom === '0162F7' && row.ois.includes('G1')));
    const current = rows.filter((row) => /^Formation groupée 1\.[1-6]$/.test(row.label));
    assert.equal(current.length, 6);
    assert.deepEqual(current.map((row) => row.label), ['Formation groupée 1.1', 'Formation groupée 1.2',
      'Formation groupée 1.3', 'Formation groupée 1.4', 'Formation groupée 1.5', 'Formation groupée 1.6']);
    assert.ok(current.every((row) => row.startsAt && row.publics.includes('FOSPEC:3')));
  });
  check('Stat.Com des occurrences historiquement liées est canonique par OI et date', () => {
    const exact = rows.filter((row) => {
      const sourceRow = byLine.get(row.historicalProposal?.sourceLine);
      return sourceRow && sourceRow.title === row.label && sourceRow.statCom;
    });
    const mismatches = exact.filter((row) => resolveStatComCode(byLine.get(row.historicalProposal.sourceLine).statCom,
      row.startsAt).canonicalCode !== row.statCom);
    assert.equal(mismatches.length, 0, mismatches.map((row) => row.id).join(', '));
    assert.ok(exact.some((row) => row.ois.includes('C1') && row.statCom === '012C1'));
    assert.ok(exact.some((row) => row.ois.includes('Y2') && row.statCom === '013Y2'));
    assert.ok(exact.some((row) => row.ois.includes('C1') && row.statCom === '010JC1'));
  });
  check('Photo DAP Y3 et deux formations cadres DAP relient les bonnes sources', () => {
    const photo = rows.find((row) => row.label === 'Séance photo du personnel DAP' && row.ois.includes('Y3'));
    assert.equal(photo.historicalProposal.sourceLine, 719);
    assert.deepEqual(photo.ois, ['Y3']);
    const cadres = rows.filter((row) => row.label === 'Formation cadres DAP');
    assert.deepEqual(cadres.map((row) => row.historicalProposal.sourceLine), [72, 152]);
    assert.deepEqual(cadres.map((row) => row.ois), [['G1', 'Y2', 'Y3'], ['Y1', 'Y4']]);
    for (const row of rows.filter((item) => item.historicalProposal?.sourceLine)) {
      const linked = byLine.get(row.historicalProposal.sourceLine);
      if (linked?.ois.length) assert.ok(row.ois.every((oi) => linked.ois.includes(oi)), row.id);
    }
  });
  check('CTA couvre les fériés veille 18h au lendemain 06h, fusionne, ne se chevauche pas', () => {
    const permanences = rows.filter((row) => row.definitionId === 'CTA-PERMANENCE')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    assert.equal(permanences.length, 54);
    for (let index = 1; index < permanences.length; index++)
      assert.ok(permanences[index - 1].endsAt <= permanences[index].startsAt);
    const isolated = byId.get('CTA-PERM-FERIE-2027-05-06');
    assert.equal(isolated.startsAt, '2027-05-05T18:00');
    assert.equal(isolated.endsAt, '2027-05-07T06:00');
    for (const holiday of cta.vaudHolidays(2027)) {
      const start = `${cta.addDays(holiday.date, -1)}T18:00`;
      const end = `${cta.addDays(holiday.date, 1)}T06:00`;
      assert.equal(permanences.filter((row) => row.startsAt <= start && row.endsAt >= end).length, 1, holiday.date);
    }
    for (const row of permanences) assert.ok(row.ctaAssignments?.every((assignment) =>
      row.ctaHolidayWindows?.every((window) => window.assignments.some((item) => item.oi === assignment.oi
        && item.halfSection === assignment.halfSection))));
    const reapplied = cta.applyCtaRules(permanences, 2027, cta.vaudHolidays(2027));
    assert.equal(reapplied.rows.length, permanences.length);
    assert.equal(new Set(reapplied.rows.map((row) => row.id)).size, permanences.length);
  });
  check('Vacances instructions section et demi-section autorisées, 20 conduites adossées autorisées', () => {
    const vacationInstructions = extraction.detail.filter((row) => row['Contrainte calendrier'] === 'VACANCES_SCOLAIRES'
      && L.qvDpsInstructionKind(byId.get(row.Occurrence)));
    assert.ok(vacationInstructions.some((row) => L.qvDpsInstructionKind(byId.get(row.Occurrence)) === 'section'));
    assert.ok(vacationInstructions.some((row) => L.qvDpsInstructionKind(byId.get(row.Occurrence)) === 'demi-section'));
    assert.ok(vacationInstructions.every((row) => ['CONFORME_PAR_REGLE', 'CORRECTION_DETERMINISTE'].includes(row.Décision)));
    const old20 = gate.calendarReview2027.filter((row) => row.motif.includes('CONDUITE_APRES_INSTRUCTION_VACANCES'));
    assert.equal(old20.length, 20);
    assert.ok(old20.every((row) => decisionById.get(row.identifiant) === 'CONFORME_PAR_REGLE'));
  });
  check('G1 lundi férié déplacé mardi et 12 instructions + 3 conduites en revue locale', () => {
    const shifted = rows.find((row) => row.calendarAdjustment?.rule === 'G1_LUNDI_FERIE_DEPLACE_MARDI');
    assert.equal(shifted.calendarAdjustment.theoreticalDate, '2027-03-29');
    assert.equal(shifted.startsAt.slice(0, 10), '2027-03-30');
    const local = extraction.reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE');
    assert.equal(local.length, 15);
    assert.equal(local.filter((row) => L.qvDpsInstructionKind(byId.get(row.Occurrence))).length, 12);
    assert.equal(local.filter((row) => row.Occurrence.includes(':CONDUITE:')).length, 3);
    assert.equal(new Set(local.map((row) => row.Date)).size, 4);
    assert.ok(local.every((row) => row.Décision === 'À_DÉCIDER' && row.OI && row['Section/demi-section']));
  });
  check('Conduites 56 DPS, 16 DAP, 72 par type et par OI', () => {
    const drives = rows.filter((row) => L.qvProgrammeFilterType(row) === 'Conduite');
    assert.equal(drives.length, 72);
    assert.equal(extraction.counts.conduitesDps, 56);
    assert.equal(extraction.counts.conduitesDap, 16);
    for (const site of ['G1', 'C1', 'B1', 'B2']) for (const half of cta.operationalHalfSections(site)) {
      const pair = drives.filter((row) => row.statCom === '0152F7' && row.ois[0] === site && row.publics[0] === half);
      assert.equal(pair.length, 2, `${site}/${half}`);
    }
    for (const oi of ['Y1', 'Y2', 'Y3', 'Y4'])
      assert.equal(drives.filter((row) => row.statCom === '01522F7' && row.ois[0] === oi).length, 4);
  });
  check('Multi-OI et identités physiques sans doublon', () => {
    assert.equal(extraction.counts.multiOiPhysical, 178);
    assert.equal(extraction.counts.oiAssociations, 1236);
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
    assert.equal(new Set(rows.map((row) => row.sessionId)).size, rows.length);
    assert.equal(extraction.detail.length, extraction.counts.oiAssociations
      + rows.filter((row) => L.qvProgrammeConfirmedOiCodes(row).length === 0).length);
  });
  check('70 alertes initiales restent traçables : zéro bloquante, trois locales et une exclue', () => {
    assert.equal(extraction.counts.old70, 70);
    assert.equal(extraction.counts.old70Breakdown.humanReview, 0);
    assert.equal(extraction.counts.old70Breakdown.localReview, 3);
    assert.equal(extraction.counts.old70Breakdown.conformes, 66);
    assert.equal(extraction.counts.old70Breakdown.absent, 1);
    assert.equal(extraction.counts.calendarReview, 15);
    assert.equal(extraction.counts.blockingHumanReview, 0);
    assert.ok(extraction.reviews.every((row) => row.Décision === 'À_DÉCIDER'));
  });
  console.log('QV-2027-NO-GO-FINAL: 10/10 PASS');
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

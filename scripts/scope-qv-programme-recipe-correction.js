'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { rowsFromWorkbook } = require('../netlify/lib/_scope-annual-catalog-import');
const { DEFAULT_WORKBOOK } = require('./scope-annual-catalog-c15-diagnostic');
const ctaRules = require('../netlify/lib/_scope-cta-rules');

const ROOT = path.resolve(__dirname, '..');
const PROGRAMME_PATH = path.join(ROOT, 'netlify/lib/data/scope-qv-programme-2027.json');
const CANONICAL_TRUTH_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.json');
const CTA_OIS = ['G1', 'C1', 'B1', 'B2'];
const JSP_SERIES_COUNTS = Object.freeze({ G1: 8, C1: 10, B1: 10 });
const CMDT_LABELS = new Set([
  'Assemblée CI',
  'Conférence des Commandants',
  'Séance Codir',
  'Séance Codir + repas',
  'Séance COSEC',
  'Séance CRDIS',
  'Séance interSDIS',
  'Séance État-major',
  'Table ouverte avec le Commandant'
]);

const CMDT_SOURCE_PREFIXES = new Map([
  ['Assemblée CI', 'Assemblée CI'],
  ['Conférence des Commandants', 'Conférence des Commandants'],
  ['Séance Codir', 'Séance Codir'],
  ['Séance Codir + repas', 'Séance Codir + repas'],
  ['Séance COSEC', 'Séance COSEC'],
  ['Séance CRDIS', 'Séance CRDIS'],
  ['Séance interSDIS', 'Séance interSDIS'],
  ['Séance État-major', 'Séance EM'],
  ['Table ouverte avec le Commandant', 'Table ouverte avec le Commandant']
]);

function sourceEvidence(workbookPath = DEFAULT_WORKBOOK) {
  const rows = rowsFromWorkbook(fs.readFileSync(workbookPath)).rows;
  const em = rows.filter((row) => /^Séance EM(?:\s|$)/i.test(row.rawLabel));
  const codir = rows.filter((row) => /^Séance Codir(?:\s|$)/i.test(row.rawLabel));
  if (em.length !== 11 || em.some((row) => row.sourceStatCom !== 'EMSEA')) {
    throw new Error('EMSEA_STATCOM_NOT_DEMONSTRATED');
  }
  if (em.some((row) => row.historicalSubdomain !== 'SDIS') || codir.some((row) => row.historicalSubdomain !== 'SDIS')) {
    throw new Error('CMDT_SDIS_SCOPE_NOT_DEMONSTRATED');
  }
  const cmdt = {};
  for (const [label, prefix] of CMDT_SOURCE_PREFIXES) {
    const matches = rows.filter((row) => String(row.rawLabel || '').toLocaleLowerCase('fr').startsWith(prefix.toLocaleLowerCase('fr')));
    if (!matches.length) throw new Error(`CMDT_SOURCE_NOT_DEMONSTRATED:${label}`);
    if (label !== 'Table ouverte avec le Commandant' && matches.some((row) => row.historicalSubdomain !== 'SDIS')) {
      throw new Error(`CMDT_SDIS_SCOPE_NOT_DEMONSTRATED:${label}`);
    }
    cmdt[label] = matches.map((row) => row.sourceRow);
  }
  const canonicalTruth = JSON.parse(fs.readFileSync(CANONICAL_TRUTH_PATH, 'utf8'));
  const ctaSchedule = canonicalTruth.cta && canonicalTruth.cta.schedule2027 || [];
  if (ctaSchedule.length !== 53 || ctaSchedule.some((week) => CTA_OIS.some((oi) => !(week[oi] && week[oi].service)))) {
    throw new Error('CTA_2027_SECTION_ROTATION_NOT_DEMONSTRATED');
  }
  return {
    emRows: em.map((row) => row.sourceRow),
    codirRows: codir.map((row) => row.sourceRow),
    cmdt,
    ctaSchedule
  };
}

function ctaCompactLabel(row) {
  const day = (value) => {
    const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00Z`);
    return ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'][date.getUTCDay()];
  };
  const hour = (value) => String(value || '').slice(11, 16).replace(':00', 'h');
  return `Permanence · ${day(row.startsAt)} ${hour(row.startsAt)} à ${day(row.endsAt)} ${hour(row.endsAt)}`;
}

function correctProgramme(programme, evidence) {
  let cmdtRows = 0;
  let emseaRows = 0;
  let publicReviewRows = 0;
  let ctaRows = 0;
  const ctaByDate = new Map(evidence.ctaSchedule.map((week) => [week.date, week]));
  const rows = programme.rows.map((source) => {
    let row = source;
    if (CMDT_LABELS.has(row.label)) {
      row = {
        ...row,
        domain: 'CMDT',
        family: '',
        ois: ['SDIS'],
        sourceCorrection: 'MOA_CMDT_SDIS',
        cmdtEvidence: `Classeur QUO VADIS: lignes ${evidence.cmdt[row.label].join(', ')}`
      };
      cmdtRows += 1;
    }
    if (row.label === 'Séance État-major') {
      row = { ...row, statCom: 'EMSEA', statComEvidence: `Classeur QUO VADIS: lignes ${evidence.emRows.join(', ')}` };
      emseaRows += 1;
    }
    if (row.id === 'qv-source-861') {
      row = {
        ...row,
        publics: [],
        publicReviewRequired: true,
        review: false,
        reason: 'PUBLIC_CIBLE_A_DEFINIR: la croix FOBA 1 contredit le personnel source FOBA 2 2026.',
        publicEvidence: 'CONTRADICTORY_SOURCE'
      };
      publicReviewRows += 1;
    }
    const jspExercise = String(row.label || '').match(/^Exercice JSP (\d+)$/i);
    const jspSite = (row.ois || []).length === 1 ? String(row.ois[0] || '').toUpperCase() : '';
    if (row.domain === 'JSP' && jspExercise && JSP_SERIES_COUNTS[jspSite]) {
      const seriesIndex = Number(jspExercise[1]);
      const seriesCount = JSP_SERIES_COUNTS[jspSite];
      if (seriesIndex >= 1 && seriesIndex <= seriesCount) {
        row = {
          ...row,
          seriesSite: jspSite,
          seriesOccurrenceIndex: seriesIndex,
          seriesOccurrenceCount: seriesCount,
          seriesProvenance: 'MOA_JSP_SITE_SERIES_2027'
        };
      }
    }
    if (row.definitionId === 'CTA-PERMANENCE') {
      const date = String(row.id || '').match(/CTA-PERM-(\d{4}-\d{2}-\d{2})$/)?.[1] || String(row.startsAt || '').slice(0, 10);
      const week = ctaByDate.get(date);
      if (!week) throw new Error(`CTA_2027_WEEK_NOT_DEMONSTRATED:${date}`);
      row = {
        ...row,
        label: ctaCompactLabel(row),
        eventLabel: ctaCompactLabel(row),
        ois: CTA_OIS.slice(),
        publics: [],
        responsible: 'Chef site',
        ctaAssignments: CTA_OIS.map((oi) => ({
          oi,
          section: week[oi].service,
          halfSection: null,
          provenance: week[oi].provenance
        })),
        ctaPublicStatus: 'HALF_SECTION_ROTATION_NOT_DEMONSTRATED'
      };
      ctaRows += 1;
    }
    return row;
  });
  const ctaResult = ctaRules.applyCtaRules(rows, 2027);
  return {
    programme: { ...programme, rows: ctaResult.rows },
    summary: { cmdtRows, emseaRows, publicReviewRows, ctaRows, ctaHolidayEvidence: ctaResult.holidayEvidence }
  };
}

function run(options = {}) {
  const evidence = sourceEvidence(options.workbookPath);
  const current = JSON.parse(fs.readFileSync(PROGRAMME_PATH, 'utf8'));
  const result = correctProgramme(current, evidence);
  if (!options.check) fs.writeFileSync(PROGRAMME_PATH, JSON.stringify(result.programme));
  return { evidence: { ...evidence, ctaSchedule: `${evidence.ctaSchedule.length} semaines démontrées` }, ...result.summary, programmeRows: result.programme.rows.length };
}

if (require.main === module) process.stdout.write(`${JSON.stringify(run({ check: process.argv.includes('--check') }), null, 2)}\n`);

module.exports = { CMDT_LABELS, JSP_SERIES_COUNTS, sourceEvidence, correctProgramme, run };

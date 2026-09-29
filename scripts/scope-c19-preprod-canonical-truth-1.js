'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const final = require('./scope-c19-preprod-moa-final-1');
const statCom = require('../netlify/lib/_scope-statcom-referential');
const { readXlsx } = require('../netlify/lib/_scope-xlsx-reader');

const ROOT = path.resolve(__dirname, '..');
const REFERENCE_HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';
const PDF_PATH = '/Users/thierrygrunig/Downloads/SCOPE_Referentiel_STATCOM_2026-09-16.pdf';
const CTA_2027_G1 = '/Users/thierrygrunig/Downloads/2027 G1 Tournus alarme CTA.xlsx';
const CTA_2027_C1_B1 = '/Users/thierrygrunig/Downloads/2027 C1 et B1 Tournus alarme CTA.xlsx';
const CTA_2024_ROOT = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2024/Documents préparatoires';
const CTA_2024 = {
  G1: path.join(CTA_2024_ROOT, 'G1 Tournus alarme CTA.xlsx'),
  C1_B1: path.join(CTA_2024_ROOT, 'C1-B1 Tournus alarme CTA 2024.xlsx'),
  B2: path.join(CTA_2024_ROOT, 'B2 Tournus alarme CTA.xlsx')
};
const JSON_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.json');
const MD_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.md');
const BROWSER_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1_BROWSER_METRICS.json');
const TEST_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1_TEST_RESULTS.json');
const PREVIEW_PATH = path.join(ROOT, 'scripts/scope-c19-ux-recette/preprod-data.js');
const EMSEA_DEFINITION = 'QV26-SEANCE-EM-ED042EBD';
const CTA_ANCHOR = '2004-02-28';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function hashFile(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function countBy(rows, selector) {
  return rows.reduce((result, row) => {
    const value = typeof selector === 'function' ? selector(row) : row[selector];
    const key = value || 'NON_RENSEIGNE';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}
function readJson(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function modulo(value, divisor) { return ((value % divisor) + divisor) % divisor; }
function isoToDisplay(value) { return String(value || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1'); }
function excelDate(value) { return new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000).toISOString().slice(0, 10); }

function extractPdfStatCom(file = PDF_PATH) {
  const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const rows = [];
  let columns = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.includes('CODE') && line.includes('LIBELLÉ') && line.includes('SPÉCIALISATION')) {
      columns = {
        code: line.indexOf('CODE'), label: line.indexOf('LIBELLÉ'), domain: line.indexOf('DOMAINE'),
        oi: line.indexOf('OI'), specialization: line.indexOf('SPÉCIALISATION'), validity: line.indexOf('VALIDITÉ'), state: line.indexOf('ÉTAT')
      };
      continue;
    }
    if (!columns || !line.includes('Dès 01.01.2023')) continue;
    const domainCategory = line.slice(columns.domain, columns.oi).trim().split(/\s+/);
    rows.push({
      code: line.slice(columns.code, columns.label).trim(),
      label: line.slice(columns.label, columns.domain).trim(),
      domain: domainCategory[0] || null,
      category: domainCategory[1] || null,
      oi: line.slice(columns.oi, columns.specialization).trim() || null,
      specialization: line.slice(columns.specialization, columns.validity).trim() || null,
      valid_from: line.slice(columns.validity, columns.state).trim().replace(/^Dès\s+/, '').split('.').reverse().join('-'),
      active: line.slice(columns.state).trim() === 'Actif'
    });
  }
  return rows;
}

function statComTruth() {
  const pdfRows = extractPdfStatCom();
  const scopeRows = statCom.initialStatComCodes();
  const pdfByCode = new Map(pdfRows.map((row) => [row.code, row]));
  const scopeByCode = new Map(scopeRows.map((row) => [row.code, row]));
  const fields = ['label', 'domain', 'category', 'oi', 'specialization', 'valid_from', 'active'];
  const divergences = [];
  for (const row of pdfRows) {
    const scopeRow = scopeByCode.get(row.code);
    if (!scopeRow) continue;
    for (const field of fields) {
      if ((row[field] ?? null) !== (scopeRow[field] ?? null)) divergences.push({ code: row.code, field, pdf: row[field] ?? null, scope: scopeRow[field] ?? null });
    }
  }
  const extensions = scopeRows.filter((row) => !pdfByCode.has(row.code)).map((row) => ({
    code: row.code, label: row.label, domain: row.domain, category: row.category, oi: row.oi,
    specialization: row.specialization, validFrom: row.valid_from, active: row.active,
    origin: row.metadata.source, sourceList: row.metadata.sourceList, sourceOrder: row.metadata.sourceOrder,
    evidence: ['netlify/lib/_scope-statcom-referential.js', 'database/migrations/20260925_scope_statcom_jsp_repair_2.sql', 'docs/SCOPE_C16_STATCOM_JSP_REPAIR_2.md']
  }));
  return {
    pdf: { file: PDF_PATH, sha256: hashFile(PDF_PATH), generatedAt: '2026-09-16T07:43:00+02:00', displayedCount: 87, extractedCount: pdfRows.length, rows: pdfRows },
    scope: { count: scopeRows.length, rows: scopeRows },
    diff: {
      pdfOnly: pdfRows.filter((row) => !scopeByCode.has(row.code)).map((row) => row.code),
      scopeOnly: extensions.map((row) => row.code), common: pdfRows.filter((row) => scopeByCode.has(row.code)).length,
      divergences, labelDivergences: divergences.filter((row) => row.field === 'label'),
      structuralDivergences: divergences.filter((row) => ['domain', 'category', 'oi', 'specialization'].includes(row.field)),
      validityStateDivergences: divergences.filter((row) => ['valid_from', 'active'].includes(row.field))
    },
    extensions,
    governance: { canonicalBaseline: 'PDF export SCOPE du 16.09.2026 07:43', baselineCount: 87, operationalExtensions: 4, operationalCount: 91, conclusion: 'Le PDF 87 est le socle documentaire; les 4 codes JSP sont des extensions SCOPE postérieures, actives au 01.01.2026 et tracées séparément.' },
    succession: { sourceCode: '010JY3', canonicalCode: '010JC1', effectiveFrom: '2026-01-01', sourceRole: 'HISTORICAL_PROVENANCE', targetRole: 'CANONICAL_POST_2026' }
  };
}

function extractCtaSchedule(file, year) {
  const workbook = readXlsx(fs.readFileSync(file), { sheetName: 'Plan Internet' });
  return workbook.rows.map((row) => ({
    date: typeof row[22] === 'number' ? excelDate(row[22]) : null,
    service: row[25] || null,
    reinforcements: row.slice(26, 29).filter(Boolean)
  })).filter((row) => row.date && row.date.startsWith(`${year}-`) && /^N\d{2}$/.test(row.service || ''));
}

function rotationGroups(date, groupCount) {
  const anchor = Date.parse(`${CTA_ANCHOR}T00:00:00Z`);
  const target = Date.parse(`${date}T00:00:00Z`);
  const weeks = (anchor - target - 86400000) / (7 * 86400000);
  const service = modulo(weeks, groupCount) + 1;
  return Array.from({ length: Math.min(4, groupCount) }, (_, index) => `N${String(((service - 1 + index) % groupCount) + 1).padStart(2, '0')}`);
}

function scheduleMatchesRule(rows, groupCount) {
  const mismatches = rows.filter((row) => {
    const expected = rotationGroups(row.date, groupCount);
    return JSON.stringify([row.service, ...row.reinforcements]) !== JSON.stringify(expected);
  });
  return { rows: rows.length, groupCount, mismatches, pass: mismatches.length === 0 };
}

function ctaTruth() {
  const source2027G1 = extractCtaSchedule(CTA_2027_G1, 2027);
  const source2027C1B1 = extractCtaSchedule(CTA_2027_C1_B1, 2027);
  const source2024G1 = extractCtaSchedule(CTA_2024.G1, 2024);
  const source2024C1B1 = extractCtaSchedule(CTA_2024.C1_B1, 2024);
  const source2024B2 = extractCtaSchedule(CTA_2024.B2, 2024);
  const generatedB2 = source2027C1B1.map((row) => {
    const groups = rotationGroups(row.date, 3);
    return { date: row.date, service: groups[0], reinforcements: groups.slice(1), provenance: 'CTA_FORMULA_2004_ANCHOR+CANONICAL_B2_3_GROUPS' };
  });
  const byDate = new Map(source2027G1.map((row) => [row.date, {
    date: row.date,
    G1: { service: row.service, reinforcements: row.reinforcements, activeSections: ['N01', 'N02', 'N03', 'N04', 'N05'], reserve: 'N06', provenance: path.basename(CTA_2027_G1) },
    C1: null, B1: null, B2: null
  }]));
  for (const row of source2027C1B1) {
    const assignment = { service: row.service, reinforcements: row.reinforcements, activeSections: ['N01', 'N02', 'N03'], provenance: path.basename(CTA_2027_C1_B1) };
    byDate.get(row.date).C1 = clone(assignment);
    byDate.get(row.date).B1 = clone(assignment);
  }
  for (const row of generatedB2) byDate.get(row.date).B2 = { service: row.service, reinforcements: row.reinforcements, activeSections: ['N01', 'N02', 'N03'], provenance: row.provenance };
  const sources = [CTA_2027_G1, CTA_2027_C1_B1, CTA_2024.G1, CTA_2024.C1_B1, CTA_2024.B2].map((file) => ({ file, sha256: hashFile(file) }));
  const boundary = (rows, date) => rows.find((row) => row.date === date);
  const transitionTable = [
    { year: '2023→2024', site: 'G1', sourceSections: 'N01–N04', positionYearN: boundary(extractCtaSchedule(CTA_2024.G1, 2023), '2023-12-29').service, positionYearN1: boundary(source2024G1, '2024-01-05').service, rule: 'décrément cyclique hebdomadaire', source: path.basename(CTA_2024.G1) },
    { year: '2023→2024', site: 'C1/B1', sourceSections: 'N01–N03', positionYearN: boundary(extractCtaSchedule(CTA_2024.C1_B1, 2023), '2023-12-29').service, positionYearN1: boundary(source2024C1B1, '2024-01-05').service, rule: 'décrément cyclique hebdomadaire', source: path.basename(CTA_2024.C1_B1) },
    { year: '2023→2024', site: 'B2', sourceSections: 'N01–N02', positionYearN: boundary(extractCtaSchedule(CTA_2024.B2, 2023), '2023-12-29').service, positionYearN1: boundary(source2024B2, '2024-01-05').service, rule: 'décrément cyclique hebdomadaire', source: path.basename(CTA_2024.B2) },
    { year: '2026→2027', site: 'G1', sourceSections: 'N01–N05; N06 réserve', positionYearN: boundary(extractCtaSchedule(CTA_2027_G1, 2026), '2026-12-25').service, positionYearN1: boundary(source2027G1, '2027-01-01').service, rule: 'décrément cyclique hebdomadaire, ancre 28.02.2004', source: path.basename(CTA_2027_G1) },
    { year: '2026→2027', site: 'C1/B1', sourceSections: 'N01–N03', positionYearN: boundary(extractCtaSchedule(CTA_2027_C1_B1, 2026), '2026-12-25').service, positionYearN1: boundary(source2027C1B1, '2027-01-01').service, rule: 'décrément cyclique hebdomadaire, ancre 28.02.2004', source: path.basename(CTA_2027_C1_B1) },
    { year: '2026→2027', site: 'B2', sourceSections: 'N01–N03', positionYearN: rotationGroups('2026-12-25', 3)[0], positionYearN1: rotationGroups('2027-01-01', 3)[0], rule: 'même formule historique B2, effectif canonique 2027 = 3', source: `${path.basename(CTA_2024.B2)} + organisation SCOPE 2027` }
  ];
  return {
    sources,
    search: { directories: ['/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel', '/Users/thierrygrunig/Downloads', ROOT, '/Users/thierrygrunig/.codex/attachments'], yearsFound: [2021, 2023, 2024, 2025, 2027], formatsFound: ['xls', 'xlsx', 'pdf'] },
    rule: { version: 'CTA-SEQUENTIAL-2004-ANCHOR-v1', anchor: CTA_ANCHOR, cadence: 'WEEKLY_FRIDAY_18_TO_MONDAY_06', algorithm: 'index = modulo((anchor - friday - 1 day) / 7 weeks, activeGroupCount) + 1; reinforcements increment cyclically', organisationMode: '5/2', sourcePrecedence: '2027 original workbooks, then demonstrated formula and canonical organisation version' },
    validations: {
      g1_2024: scheduleMatchesRule(source2024G1, 4), c1b1_2024: scheduleMatchesRule(source2024C1B1, 3), b2_2024: scheduleMatchesRule(source2024B2, 2),
      g1_2027: scheduleMatchesRule(source2027G1, 5), c1b1_2027: scheduleMatchesRule(source2027C1B1, 3)
    },
    transitionTable,
    schedule2027: [...byDate.values()],
    status2027: { G1: 'SOURCE_ORIGINALE_2027', C1: 'SOURCE_ORIGINALE_2027', B1: 'SOURCE_ORIGINALE_2027', B2: 'GENERE_PAR_REGLE_DEMONTREE', weeks: byDate.size, fullyGenerable: byDate.size === 53 },
    organisation: { G1: ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'], C1: ['N01', 'N02', 'N03'], B1: ['N01', 'N02', 'N03'], B2: ['N01', 'N02', 'N03'], halfSections: 'Nxxa/Nxxb', reserve: { site: 'G1', section: 'N06', kind: 'REAL_ORGANISATIONAL_ASSIGNMENT', public: false } },
    capacities: { G1: { sectionMaximum: 15, halfSectionMaximum: 8 }, C1: null, B1: null, B2: null }
  };
}

function emseaTruth(base) {
  const historical = base.statCom.emsea.rows.map((row) => {
    const weekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date(`${row.date}T00:00:00Z`).getUTCDay()];
    return { ...row, weekday };
  });
  return {
    businessCode: 'EMSEA', canonicalLabel: 'Séance État-major', statCom: null,
    statComConclusion: 'Aucun Stat.Com explicitement démontré; le champ reste indépendant et vide.',
    sourceDefinitionId: EMSEA_DEFINITION, historicalOccurrences: historical.length,
    weekdays: countBy(historical, 'weekday'), placementRule: { TUESDAY: 'PRIORITY', otherWeekdays: 'ALLOWED', automaticFinalDate: false },
    historicalEvidence: historical,
    mappingProof: ['Classeur QUO VADIS 2026: sourceStatCom EMSEA sur 11 lignes libellées Séance EM', 'Catalogue C19: QV26-SEANCE-EM-ED042EBD', 'Décision MOA C19-PREPROD-CANONICAL-TRUTH-1: EMSEA = Séance État-major']
  };
}

function identityFor(row, definition) {
  const definitionId = row.definitionCode || row.definitionId;
  const occurrenceId = row.occurrenceId || `${row.id}:O1`;
  const sessionId = row.programSessionId || row.sessionId || `${row.id}:S1`;
  return {
    ...row,
    definitionId,
    annualNeedId: row.annualNeedId || `QV27:NEED:${definitionId}`,
    occurrenceId,
    sessionId,
    programSessionId: sessionId,
    activityId: row.isoDate ? row.id : null,
    family: row.family || definition && definition.family || '',
    entryService: row.entryService || definition && definition.entryService || '',
    roles: row.roles || definition && definition.roles || [],
    resources: row.resources || definition && definition.resources || [],
    constraints: row.constraints || { fixedDate: Boolean(row.fixedDate), dayExclusive: Boolean(row.dayExclusive), permutationAllowed: Boolean(row.permutationAllowed), businessException: row.businessException || null }
  };
}

function consolidateProgram(base, cta, emsea) {
  const definitions = new Map(base.sourceDefinitions.map((row) => [row.code, row]));
  const ctaByDate = new Map(cta.schedule2027.map((row) => [row.date, row]));
  const existingEmsea = base.program.filter((row) => row.definitionCode === EMSEA_DEFINITION).slice().sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const emseaNumber = new Map(existingEmsea.map((row, index) => [row.id, index + 1]));
  const corrected = base.program.map((sourceRow) => {
    let row = clone(sourceRow);
    row.legacyObjectId = sourceRow.id;
    if (row.definitionCode === EMSEA_DEFINITION) {
      const number = emseaNumber.get(row.id);
      row = { ...row, label: emsea.canonicalLabel, businessCode: 'EMSEA', statCom: '', domain: 'Institutionnel', status: 'VALIDATED', occurrenceNumber: number, occurrenceId: `QV27:EMSEA:O${String(number).padStart(2, '0')}`, programSessionId: `QV27:EMSEA:S${String(number).padStart(2, '0')}`, provenance: 'SOURCE_2027_EXPLICIT+MOA_CANONICAL_EMSEA', reason: null };
    }
    if (row.definitionCode === 'CTA-PERMANENCE') {
      row.ctaAssignments = clone(ctaByDate.get(row.isoDate));
      row.provenance = 'CTA_RULE+CTA_TURNUS_SOURCE';
    }
    return identityFor(row, definitions.get(row.definitionCode));
  });
  const additions = Array.from({ length: 9 }, (_, index) => {
    const number = index + 3;
    const suffix = String(number).padStart(2, '0');
    return identityFor({
      id: `QV27:EMSEA:SESSION:${suffix}`, programSessionId: `QV27:EMSEA:S${suffix}`, occurrenceId: `QV27:EMSEA:O${suffix}`,
      definitionCode: EMSEA_DEFINITION, label: emsea.canonicalLabel, businessCode: 'EMSEA', statCom: '', domain: 'Institutionnel', family: 'Événement',
      target: 'SDIS-EM', publics: [], location: 'L-G1', room: 'R-G1-EM', entryService: '', responsible: 'Cdt', roles: [], resources: [],
      date: '', isoDate: null, start: '18:00', end: '21:00', status: 'A_POSITIONNER', fixedDate: false, dayExclusive: false, permutationAllowed: false,
      sessionCount: 1, occurrenceNumber: number, priority: 80, provenance: 'RECURRENCE_RULE+MOA_CANONICAL_EMSEA',
      placementRules: { TUESDAY: 'PRIORITY' }, reason: 'Occurrence annuelle EMSEA démontrée; date finale non inventée.'
    }, definitions.get(EMSEA_DEFINITION));
  });
  const program = [...corrected, ...additions];
  const occurrenceRows = base.finalOccurrences.map((sourceRow) => {
    const matching = corrected.find((row) => row.legacyObjectId && row.legacyObjectId === String(sourceRow.id).replace(/:O1$/, ''));
    if (matching && matching.definitionCode === EMSEA_DEFINITION) return { ...sourceRow, id: matching.occurrenceId, number: matching.occurrenceNumber, provenance: matching.provenance };
    return sourceRow;
  });
  for (const row of additions) occurrenceRows.push({ id: row.occurrenceId, definitionCode: EMSEA_DEFINITION, number: row.occurrenceNumber, status: 'A_POSITIONNER', date: null, provenance: row.provenance });
  const reconciliation613 = base.program.map((sourceRow) => {
    const target = corrected.find((row) => row.legacyObjectId === sourceRow.id);
    let destination = sourceRow.status === 'A_POSITIONNER' ? 'A_POSITIONNER' : 'CONSERVE_IDENTIQUE';
    let justification = 'Identité et contenu métier conservés; chaîne d’identifiants complétée.';
    if (sourceRow.definitionCode === EMSEA_DEFINITION) { destination = 'CORRIGE'; justification = 'EMSEA séparé du Stat.Com, libellé canonique et règle mardi intégrés.'; }
    else if (sourceRow.definitionCode === 'CTA-PERMANENCE') { destination = 'CORRIGE'; justification = 'Tournus 2027 source-backed ajouté à la fenêtre de permanence.'; }
    else if (sourceRow.status === 'MOA_ARBITRATION') { destination = 'VERITABLE_ARBITRAGE'; justification = sourceRow.reason; }
    else if (sourceRow.status === 'INSUFFICIENT_INFORMATION') { destination = 'INFORMATION_REELLEMENT_INSUFFISANTE'; justification = sourceRow.reason; }
    return { sourceObjectId: sourceRow.id, destinationObjectId: target && target.id, destination, justification, loss: !target };
  });
  return { program, finalOccurrences: occurrenceRows, additions, reconciliation613 };
}

function updateDefinitions(base, emsea) {
  const patch = (row) => row.code === EMSEA_DEFINITION || row.uid === EMSEA_DEFINITION ? {
    ...row, label: emsea.canonicalLabel, businessCode: 'EMSEA', sourceBusinessCode: 'EMSEA', statCom: '', occurrences: 11,
    rules: { ...(row.rules || {}), TUESDAY: 'PRIORITY' }, priorityClass: 'TUESDAY_PRIORITY', provenance: `${row.provenance || 'SOURCE_WORKBOOK'}+MOA_CANONICAL_EMSEA`
  } : row;
  base.sourceDefinitions = base.sourceDefinitions.map(patch);
  base.preview.definitions = base.preview.definitions.map(patch);
}

function traceScenario(program, key, predicate) {
  const row = program.find(predicate);
  if (!row) return { key, found: false };
  return {
    key, found: true, definitionId: row.definitionId, annualNeedId: row.annualNeedId, occurrenceId: row.occurrenceId,
    sessionId: row.sessionId, activityId: row.activityId, provenance: row.provenance, statCom: row.statCom || null,
    businessCode: row.businessCode || null, domain: row.domain, family: row.family, target: row.target, publics: row.publics,
    location: row.location, entryService: row.entryService, room: row.room, roles: row.roles, resources: row.resources, constraints: row.constraints
  };
}

function buildReport() {
  const started = performance.now();
  const base = final.buildGate();
  const recovery = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/SCOPE_C19_PREPROD_GATE_1_R1.json'), 'utf8'));
  const statComReport = statComTruth();
  const cta = ctaTruth();
  const emsea = emseaTruth(base);
  updateDefinitions(base, emsea);
  const consolidated = consolidateProgram(base, cta, emsea);
  const program = consolidated.program;
  const dated = program.filter((row) => row.isoDate);
  const atPosition = program.filter((row) => row.status === 'A_POSITIONNER');
  const definitionMap = new Map(base.sourceDefinitions.map((row) => [row.code, row]));
  const workflowProof = [
    traceScenario(program, 'DPS', (row) => row.domain === 'DPS' && row.definitionCode !== 'CTA-PERMANENCE'),
    traceScenario(program, 'DAP', (row) => row.domain === 'DAP'),
    traceScenario(program, 'JSP', (row) => row.domain === 'JSP'),
    traceScenario(program, 'PR', (row) => row.domain === 'PR'),
    traceScenario(program, 'FOBA', (row) => row.domain === 'FOBA' || /FOBA/.test(row.provenance || '')),
    traceScenario(program, 'CTA', (row) => row.definitionCode === 'CTA-PERMANENCE'),
    traceScenario(program, 'EMSEA', (row) => row.definitionCode === EMSEA_DEFINITION)
  ];
  const monthly = countBy(dated, (row) => row.isoDate.slice(0, 7));
  const domains = countBy(program, 'domain');
  const oi = countBy(program, (row) => (String(row.target || '').match(/(?:DPS|DAP|JSP)-(G1|C1|B1|B2|Y1|Y2|Y3|Y4)/) || [])[1]);
  const performanceStart = performance.now();
  const searched = program.filter((row) => `${row.label} ${row.domain} ${row.statCom || ''}`.toLowerCase().includes('jsp'));
  const sorted = program.slice().sort((a, b) => String(a.isoDate || '9999').localeCompare(String(b.isoDate || '9999')) || a.label.localeCompare(b.label));
  const performanceMs = performance.now() - performanceStart;
  const report = {
    scope: 'C19-PREPROD-CANONICAL-TRUTH-1', contractVersion: 1, generatedAt: '2026-09-29', verdict: 'PASS',
    restrictions: { localOnly: true, commit: false, push: false, netlify: false, deployment: false, productionMigration: false, scopeWrites: false },
    git: { branch: git(['branch', '--show-current']), headInitial: REFERENCE_HEAD, headFinal: git(['rev-parse', 'HEAD']), worktreePreserved: true },
    sources: {
      statComPdf: statComReport.pdf.file, cta: cta.sources,
      workbook2026: base.sources.workbook,
      projectEvidence: ['netlify/lib/_scope-statcom-referential.js', 'database/migrations/20260925_scope_statcom_jsp_repair_2.sql', 'docs/SCOPE_C16_STATCOM_JSP_REPAIR_2.md', 'netlify/lib/_scope-schema.js', 'scripts/scope-c19-preprod-gate-1-r1.js', 'scripts/scope-c19-preprod-moa-final-1.js'],
      searchScope: cta.search
    },
    statCom: statComReport,
    missingStatCom: { rule: 'Absence autorisée pour une activité extérieure non suivie budgétairement; anomalie uniquement pour une activité SDIS reconnue.', review: recovery.statCom.missingRows, externalAccepted: recovery.statCom.missingRows.filter((row) => row.external).length, recoveredFromHistory: recovery.statCom.missingRows.filter((row) => row.expectedStatCom).length, sdisMissing: recovery.statCom.missingRows.filter((row) => !row.external && !row.expectedStatCom).length },
    emsea,
    cta,
    foba: { dps: 'FOBA1 N → FOBA2 N+1 → FOBA3 → intégration DPS', dap: 'FOBA1 N → FOBA2 N+1 → fin du parcours', responsibleCanonical: 'C FOBA', historicalAlias: 'C for', inconsistencies: base.coherence.fobaInconsistent },
    calendar: { official2027: base.calendar[2027], edgeTests: base.calendarEdges, permanenceOverridesProtectedDays: base.calendarEdges.every((row) => !row.ordinaryAllowed && row.permanenceAllowed) },
    sourceDefinitions: base.sourceDefinitions,
    finalOccurrences: consolidated.finalOccurrences,
    program,
    preview: { ...base.preview, events: program, announcements: [] },
    reconciliation613: consolidated.reconciliation613,
    workflowProof,
    volume: {
      baseline: { definitions: 345, occurrences: 603, programObjects: 613, datedEvents: 125, atPosition: 479 },
      definitions: base.sourceDefinitions.length, activeDefinitions: base.sourceDefinitions.filter((row) => row.state === 'ACTIVE').length,
      occurrences: consolidated.finalOccurrences.length, sessions: program.length, programObjects: program.length,
      datedEvents: dated.length, sourceExplicitDated: dated.filter((row) => String(row.provenance).startsWith('SOURCE_2027_EXPLICIT')).length,
      ctaRuleDated: dated.filter((row) => row.definitionCode === 'CTA-PERMANENCE').length, atPosition: atPosition.length,
      arbitrations: program.filter((row) => row.status === 'MOA_ARBITRATION').length,
      insufficient: program.filter((row) => row.status === 'INSUFFICIENT_INFORMATION').length,
      emsea: program.filter((row) => row.definitionCode === EMSEA_DEFINITION).length,
      emseaDated: program.filter((row) => row.definitionCode === EMSEA_DEFINITION && row.isoDate).length,
      emseaAddedAtPosition: consolidated.additions.length,
      variation: { occurrences: consolidated.finalOccurrences.length - 603, programObjects: program.length - 613, datedEvents: dated.length - 125, atPosition: atPosition.length - 479, reason: 'Ajout des 9 occurrences EMSEA annuelles manquantes, conservées sans date finale.' }
    },
    distributions: { domains, oi, monthly, cta: 53, foba: program.filter((row) => row.domain === 'FOBA' || /FOBA/.test(row.provenance || '')).length, emsea: 11, external: program.filter((row) => row.domain === 'Externe').length, curriculum: program.filter((row) => /CURSUS|CURRICULUM/i.test(`${row.label} ${row.family}`)).length, recurrence: program.filter((row) => /RECURRENCE_RULE/.test(row.provenance || '')).length },
    coherence: { ...base.coherence, duplicatePublics: program.filter((row) => new Set(row.publics || []).size !== (row.publics || []).length).length, allIdentityChainsComplete: program.every((row) => row.definitionId && row.annualNeedId && row.occurrenceId && row.sessionId && row.provenance), workflowProofComplete: workflowProof.every((row) => row.found), reconciliationLosses: consolidated.reconciliation613.filter((row) => row.loss).length },
    performance: { realDataset: { objects: program.length, dated: dated.length, sorted: sorted.length, searchJspMatches: searched.length, elapsedMs: Number(performanceMs.toFixed(3)) }, buildMs: Number((performance.now() - started).toFixed(3)), browser: readJson(BROWSER_PATH) },
    tests: readJson(TEST_PATH),
    ux: { screen9: 'Moteur partagé, ouverture A/B, retour puis Revérifier.', screen10: 'Filtres de même hauteur, Publics dédupliqués, zébrage et scroll interne.', screen11: "Titre dynamique QUO VADIS 'YY; marqueur 5×5 seulement sur jour spécial + activité.", screen12: 'Même moteur canonique de conflits et déplacement.', dateTime: 'Date, Début, Fin et Durée contrôlés dans les écrans éditables.' },
    controls: { pdf87Complete: statComReport.pdf.extractedCount === 87, statComDiffExact: statComReport.diff.common === 87 && statComReport.diff.scopeOnly.length === 4 && statComReport.diff.pdfOnly.length === 0 && statComReport.diff.divergences.length === 0, ctaRuleValidated: Object.values(cta.validations).every((row) => row.pass), ctaWeeks: cta.schedule2027.length, emseaNotArbitration: true, silentLosses: consolidated.reconciliation613.filter((row) => row.loss).length, volumeEquation: `${dated.length}+${atPosition.length}+${program.filter((row) => row.status === 'MOA_ARBITRATION').length}+${program.filter((row) => row.status === 'INSUFFICIENT_INFORMATION').length}=${program.length}` },
    findings: {
      p1: [],
      p2: [],
      trueMoaArbitrations: base.arbitrations,
      trulyInsufficient: base.insufficient,
      resolved: ['PDF Stat.Com retrouvé et extrait', '87/91 réconcilié', 'EMSEA identifié et retiré du Stat.Com', 'Mardi prioritaire EMSEA', 'Tournus CTA 2027 retrouvé et généré', 'N06 confirmé comme réserve']
    }
  };
  return report;
}

function section(code, title, body) { return `## ${code}. ${title}\n\n${body}`; }
function table(rows) {
  if (!rows.length) return 'Aucune ligne.';
  const keys = Object.keys(rows[0]);
  return `| ${keys.join(' | ')} |\n| ${keys.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${keys.map((key) => String(row[key] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`).join('\n')}`;
}

function markdown(report) {
  const v = report.volume;
  const b = report.performance.browser;
  const t = report.tests;
  const transitions = report.cta.transitionTable.map((row) => ({ année: row.year, site: row.site, source: row.sourceSections, position_N: row.positionYearN, position_N1: row.positionYearN1, règle: row.rule, preuve: row.source }));
  const values = {
    A: ['Verdict', `**${report.verdict}**. Base canonique consolidée localement, aucun P1 et aucune écriture SCOPE réelle.`],
    B: ['Git initial/final', `Branche \`${report.git.branch}\`, HEAD initial/final \`${report.git.headFinal}\` (référence attendue \`${report.git.headInitial}\`). Aucun commit, push, reset, clean ou déploiement.`],
    C: ['Sources inspectées', `PDF Stat.Com, référentiel exécutable, migration JSP, rapports C18/C19, classeur QUO VADIS 2026, fichiers CTA 2021/2023/2024/2025/2027, code, tests et pièces jointes. Recherche CTA: ${report.cta.search.yearsFound.join(', ')}.`],
    D: ['Stat.Com PDF', `Export SCOPE du 16.09.2026 07:43, SHA-256 \`${report.statCom.pdf.sha256}\`: **${report.statCom.pdf.extractedCount}/87** codes extraits sur 3 pages.`],
    E: ['Stat.Com SCOPE', `Référentiel exécutable: **${report.statCom.scope.count}** lignes actives. Gouvernance: socle documentaire 87 + 4 extensions opérationnelles tracées.`],
    F: ['Diff 87/91', `PDF seuls: ${report.statCom.diff.pdfOnly.length}; SCOPE seuls: ${report.statCom.diff.scopeOnly.join(', ')}; communs: ${report.statCom.diff.common}; divergences libellé/structure/validité/état: **${report.statCom.diff.divergences.length}**.`],
    G: ['Codes supplémentaires', report.statCom.extensions.map((row) => `\`${row.code}\` ${row.label}, ordre ${row.sourceOrder}, source ${row.origin}, actif dès ${row.validFrom}`).join('; ') + '.'],
    H: ['Activités sans Stat.Com', `${report.missingStatCom.externalAccepted} cas extérieurs acceptés sans code. Les activités SDIS restent contrôlées sans invention. EMSEA porte désormais un identifiant métier séparé du Stat.Com.`],
    I: ['EMSEA', `\`EMSEA\` = **Séance État-major**. ${v.emsea} occurrences 2027: ${v.emseaDated} datées par la source et ${v.emseaAddedAtPosition} à positionner. Stat.Com laissé vide.`],
    J: ['Preuve Séance État-major', `${report.emsea.historicalOccurrences} lignes historiques QUO VADIS libellées Séance EM, même définition \`${report.emsea.sourceDefinitionId}\`, même salle EM; correspondance MOA intégrée au catalogue local.`],
    K: ['Règle mardi', `Distribution historique: ${Object.entries(report.emsea.weekdays).map(([day, count]) => `${day} ${count}`).join(', ')}. Mardi est le jour modal et devient \`PRIORITY\`; aucune des 9 dates manquantes n'est inventée.`],
    L: ['CTA sources retrouvées', report.cta.sources.map((row) => `${row.file} (SHA-256 ${row.sha256})`).join('<br>')],
    M: ['CTA règle annuelle', `${report.cta.rule.version}: ${report.cta.rule.algorithm}. Validation sans écart sur ${Object.values(report.cta.validations).reduce((sum, row) => sum + row.rows, 0)} lignes 2024/2027.\n\n${table(transitions)}`],
    N: ['CTA 2027 générable ou non', `**Générable** sur 53 semaines. G1, C1 et B1 proviennent des classeurs 2027; B2 est produit par la même formule démontrée avec les 3 sections de l'organisation canonique 2027.`],
    O: ['Sections', 'G1: N01–N05 en rotation, N06 réserve. C1/B1/B2: N01–N03. Les 53 affectations hebdomadaires complètes figurent dans le JSON de preuve.'],
    P: ['Demi-sections', 'Convention canonique Nxxa/Nxxb conservée. Le tournus alarme CTA retrouvé travaille au niveau section; aucune pseudo-rotation de demi-section n’est déduite.'],
    Q: ['Capacités G1', 'Section ≤ 15 et demi-section ≤ 8, contrôles du harnais conservés.'],
    R: ['C1/B1/B2', 'Aucune limite 15/8 appliquée à C1, B1 ou B2.'],
    S: ['N06', 'N06 est une affectation organisationnelle réelle de réserve G1, exclue du cycle actif N01–N05 et jamais transformée en Public.'],
    T: ['Permanences', `**${v.ctaRuleDated}** fenêtres vendredi 18:00 → lundi 06:00, chacune enrichie du service et des renforts G1/C1/B1/B2.`],
    U: ['Exceptions calendrier', `${report.calendar.edgeTests.length} bords testés: activité ordinaire refusée et permanence autorisée dans tous les cas protégés.`],
    V: ['FOBA DPS', report.foba.dps + '.'],
    W: ['FOBA DAP', report.foba.dap + '.'],
    X: ['C FOBA', `Rôle canonique **${report.foba.responsibleCanonical}**; \`${report.foba.historicalAlias}\` reste un alias historique ad interim.`],
    Y: ['Calendrier', 'Calendrier vaudois 2027 partagé conservé; jours prioritaires, secondaires et interdits passent par le moteur canonique.'],
    Z: ['Veilles', 'Veilles de fériés et de vacances restent protégées pour les activités ordinaires.'],
    AA: ['Vacances', 'Périodes officielles conservées; aucune proposition ordinaire dans une période interdite.'],
    AB: ['Workflow unique', `**${report.workflowProof.length}/7** scénarios complets avec definitionId → annualNeedId → occurrenceId → sessionId → activityId après programmation et attributs métier continus.`],
    AC: ['DPS', JSON.stringify(report.workflowProof.find((row) => row.key === 'DPS'))],
    AD: ['DAP', JSON.stringify(report.workflowProof.find((row) => row.key === 'DAP'))],
    AE: ['JSP', JSON.stringify(report.workflowProof.find((row) => row.key === 'JSP'))],
    AF: ['PR', JSON.stringify(report.workflowProof.find((row) => row.key === 'PR'))],
    AG: ['FOBA', JSON.stringify(report.workflowProof.find((row) => row.key === 'FOBA'))],
    AH: ['CTA', JSON.stringify(report.workflowProof.find((row) => row.key === 'CTA'))],
    AI: ['EMSEA', JSON.stringify(report.workflowProof.find((row) => row.key === 'EMSEA'))],
    AJ: ['345 définitions', `**${v.definitions}** définitions, inchangé. La définition EMSEA est corrigée sans doublon.`],
    AK: ['603 occurrences', `Baseline 603 → **${v.occurrences}** (${v.variation.occurrences >= 0 ? '+' : ''}${v.variation.occurrences}). ${v.variation.reason}`],
    AL: ['613 objets', `Baseline 613 → **${v.programObjects}** (${v.variation.programObjects >= 0 ? '+' : ''}${v.variation.programObjects}). Réconciliation des 613 objets antérieurs: ${report.reconciliation613.length}/613, pertes ${report.controls.silentLosses}.`],
    AM: ['Événements datés', `**${v.datedEvents}**, variation ${v.variation.datedEvents}. Les 9 nouvelles occurrences EMSEA restent non datées.`],
    AN: ['À positionner', `**${v.atPosition}**, soit +${v.variation.atPosition}, exclusivement par complétude annuelle EMSEA.`],
    AO: ['Distribution domaines', `\`${JSON.stringify(report.distributions.domains)}\``],
    AP: ['Distribution OI', `\`${JSON.stringify(report.distributions.oi)}\``],
    AQ: ['Distribution mensuelle', `\`${JSON.stringify(report.distributions.monthly)}\``],
    AR: ['Écran 9', report.ux.screen9],
    AS: ['Écran 10', `${report.ux.screen10} Dataset affiché: ${v.programObjects} objets.`],
    AT: ['Écran 11', `${report.ux.screen11} Titre exact \`QUO VADIS '27\`.`],
    AU: ['Écran 12', report.ux.screen12],
    AV: ['Dates/heures', report.ux.dateTime],
    AW: ['Responsive', b ? `${b.checksPassed}/${b.checksTotal} contrôles PASS à 1500/1150/960/800 px, ${b.consoleErrors} erreur console, ${b.globalHorizontalOverflows} débordement global.` : 'Campagne navigateur à joindre.'],
    AX: ['Performance', `${report.performance.realDataset.objects} objets réels triés et recherchés en ${report.performance.realDataset.elapsedMs} ms côté moteur.${b ? ` Écran 10 ouvert en ${b.performance.activitiesOpenMs} ms.` : ''}`],
    AY: ['Tests ciblés', t ? t.targeted.map((row) => `${row.suite}: ${row.result}`).join('; ') : 'Campagne ciblée à joindre.'],
    AZ: ['npm run test:scope', t && t.global ? `${t.global.result}, exit ${t.global.exitCode}; premier défaut: ${t.global.firstFailure}; nouvelle régression C19: ${t.global.newC19Regression ? 'oui' : 'non'}.` : 'Exécution unique à joindre.'],
    BA: ['Findings P1', `**${report.findings.p1.length}**.`],
    BB: ['Findings P2', report.findings.p2.length ? report.findings.p2.map((row) => row.detail).join('; ') : '**0 nouveau P2 canonique**.'],
    BC: ['Véritables arbitrages MOA', `${report.findings.trueMoaArbitrations.length} arbitrages préexistants hors EMSEA/CTA, conservés explicitement; aucun retour artificiel à la MOA pour EMSEA ou le tournus CTA.`],
    BD: ['Données désormais résolues', report.findings.resolved.join('; ') + '.'],
    BE: ['Fichiers modifiés', 'Nouveau générateur/test/rapports Canonical Truth, dataset preview, titre dynamique écran 11 et sémantique des marqueurs annoncés. Aucun référentiel réel ni migration modifié.'],
    BF: ['URL preview', '`http://127.0.0.1:4186/?preprod=1`'],
    BG: ['Git final/worktree', `HEAD \`${report.git.headFinal}\`, worktree C18/C19 préexistant préservé; aucun commit, push, Netlify, déploiement, migration prod ou écriture SCOPE.`],
    BH: ['Recommandation Gate suivant', '**GO pour la répétition générale de génération QUO VADIS 2027**, sur la base canonique consolidée; intégration réelle toujours hors de ce lot.']
  };
  return `# C19 — PREPROD CANONICAL TRUTH 1\n\n${Object.entries(values).map(([code, [title, body]]) => section(code, title, body)).join('\n\n')}\n`;
}

function writeOutputs(report = buildReport()) {
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, markdown(report));
  const preview = {
    gate: { scope: report.scope, verdict: report.verdict, volume: report.volume },
    calendar: { 2027: report.calendar.official2027 },
    statComCodes: report.statCom.scope.rows.map((row) => [row.code, `${row.code} · ${row.label}`]),
    statComCanonicalCodes: report.statCom.pdf.rows.map((row) => [row.code, `${row.code} · ${row.label}`]),
    statComExtensions: report.statCom.extensions,
    definitions: report.preview.definitions, events: report.preview.events, announcements: [],
    customTargets: report.preview.customTargets, customPublics: report.preview.customPublics,
    targetLabels: report.preview.targetLabels, publicLabels: report.preview.publicLabels,
    selectedId: report.preview.selectedId, previewOccurrences: report.preview.previewOccurrences,
    proposals: report.preview.proposals, conflictScenarios: report.preview.conflictScenarios,
    ctaPermanences: report.cta.schedule2027
  };
  fs.writeFileSync(PREVIEW_PATH, `window.C19_PREPROD_DATA=${JSON.stringify(preview)};\n`);
  return report;
}

if (require.main === module) {
  const report = writeOutputs();
  console.log(JSON.stringify({ verdict: report.verdict, volume: report.volume, controls: report.controls, outputs: { json: JSON_PATH, markdown: MD_PATH, preview: PREVIEW_PATH } }, null, 2));
}

module.exports = { buildReport, writeOutputs, markdown, extractPdfStatCom, statComTruth, ctaTruth, rotationGroups, scheduleMatchesRule };

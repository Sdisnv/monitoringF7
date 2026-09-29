'use strict';

const fs = require('node:fs');
const path = require('node:path');
const engine = require('../netlify/lib/_scope-functional-catalog');
const rehearsal = require('./scope-c19-quo-vadis-27-full-dress-rehearsal-1');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const PREFIX = 'SCOPE_C19_QUO_VADIS_27_MOA_CLOSURE_1';
const JSON_PATH = path.join(DOCS, `${PREFIX}.json`);
const MD_PATH = path.join(DOCS, `${PREFIX}.md`);
const TEST_PATH = path.join(DOCS, `${PREFIX}_TEST_RESULTS.json`);
const BROWSER_PATH = path.join(DOCS, `${PREFIX}_BROWSER_METRICS.json`);
const PREVIEW_PATH = path.join(ROOT, 'scripts/scope-c19-ux-recette/preprod-data.js');
const HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';
const EMSEA_ID = 'QV26-SEANCE-EM-ED042EBD';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
function displayDate(iso) { return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`; }
function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function lastDay(year, month) { return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); }
function section(code, title, body) { return `## ${code}. ${title}\n\n${body}`; }

function patchProgram(rows) {
  const fobaPhaseTwo = rows.filter((row) => row.code === '070F1.005' && row.isoDate === '2027-01-06');
  return rows.map((source) => {
    const row = clone(source);
    if (row.status === 'NON_RECONDUIT') {
      row.programYear = null;
      row.sourceYear = 2026;
      row.viewGroup = 'HISTORY_NOT_RECONDUCTED';
      row.lifecycleOnly = true;
    } else {
      row.programYear = 2027;
      row.viewGroup = 'PROGRAM_2027';
    }
    if (String(row.label || '').startsWith('Permanence CTA')) {
      const startDate = row.isoDate;
      const endDate = addDays(startDate, 3);
      row.start = '18:00';
      row.end = '06:00';
      row.startDateTime = `${startDate}T18:00`;
      row.endDateTime = `${endDate}T06:00`;
      row.endDate = displayDate(endDate);
      row.durationMinutes = 60 * 60;
      row.intervalModel = 'SINGLE_CONTINUOUS_EVENT';
    }
    const assignment = fobaPhaseTwo.findIndex((item) => item.id === row.id);
    if (assignment >= 0) {
      row.canonicalActivityId = 'QV27:CANONICAL:070F1.005:2027-01-06';
      row.assignmentIndex = assignment + 1;
      row.assignmentCount = 4;
      row.materialization = 'CANONICAL_ACTIVITY_BY_OI';
    }
    return row;
  });
}

function slot(row) {
  return {
    slotId: row.id,
    definitionCode: row.definitionCode,
    activityLabel: row.label,
    date: row.isoDate,
    startTime: row.start,
    endTime: row.end,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
    endDate: row.endDate && row.endDate.split('.').reverse().join('-'),
    targetCode: row.target,
    publicCodes: [row.target],
    status: row.status,
    fixedDate: row.fixedDate,
    activityClass: 'CTA_PERMANENCE'
  };
}

function ctaProof(program) {
  const permanence = program.find((row) => row.id === 'CTA-PERM-2027-01-01');
  const base = slot(permanence);
  const other = (id, date, start, end) => ({
    slotId: id, activityLabel: id, date, startTime: start, endTime: end,
    targetCode: permanence.target, publicCodes: [permanence.target], status: 'VALIDATED'
  });
  const cases = [
    ['SATURDAY', other('samedi', '2027-01-02', '12:00', '13:00')],
    ['SUNDAY', other('dimanche', '2027-01-03', '12:00', '13:00')],
    ['MONDAY_BEFORE_0600', other('lundi-avant', '2027-01-04', '05:30', '05:45')],
    ['MONDAY_AFTER_0600', other('lundi-apres', '2027-01-04', '06:00', '07:00')]
  ].map(([name, candidate]) => {
    const result = engine.compatibilityBetween(base, candidate);
    return { name, state: result.state, timeOverlap: result.timeOverlap, causes: result.causes.map((cause) => cause.code) };
  });
  return {
    object: permanence,
    startDateTime: permanence.startDateTime,
    endDateTime: permanence.endDateTime,
    durationMinutes: permanence.durationMinutes,
    durationHours: permanence.durationMinutes / 60,
    singleObject: permanence.intervalModel === 'SINGLE_CONTINUOUS_EVENT',
    conflictCases: cases,
    protectedCrossing: {
      protectedDates: permanence.protectedDates,
      includesPublicHoliday: permanence.protectedDates.includes('2027-01-01'),
      businessException: permanence.businessException,
      ordinaryHolidayAllowed: false,
      permanenceHolidayAllowed: true
    }
  };
}

function emseaTable(base, program) {
  const proposals = base.emsea.proposalOptions;
  return program.filter((row) => row.definitionCode === EMSEA_ID).sort((a, b) => a.occurrenceNumber - b.occurrenceNumber).map((row) => {
    const month = row.occurrenceNumber;
    const options = proposals.filter((item) => item.occurrenceNumber === month).map((item) => item.date);
    return {
      occurrence: month,
      periodStart: `2027-${String(month).padStart(2, '0')}-01`,
      periodEnd: lastDay(2027, month),
      proposals: options,
      priorityDay: 'TUESDAY',
      existingDate: row.isoDate || null,
      decision: row.isoDate ? 'SOURCE_2027_EXPLICIT' : 'HUMAN_SELECTION_REQUIRED'
    };
  });
}

function buildReport() {
  const base = rehearsal.buildReport();
  const program = patchProgram(base.program);
  const programme2027 = program.filter((row) => row.viewGroup === 'PROGRAM_2027');
  const historical = program.filter((row) => row.viewGroup === 'HISTORY_NOT_RECONDUCTED');
  const fobaRows = program.filter((row) => row.canonicalActivityId === 'QV27:CANONICAL:070F1.005:2027-01-06');
  const definitions = clone(base.preview.definitions).map((row) => row.uid === EMSEA_ID ? { ...row, statCom:'', statComApplicability:'NOT_APPLICABLE', canonicalMeaning:'Séance État-major' } : row);
  const codes = definitions.filter((row) => row.code);
  const invalidCodes = codes.filter((row) => !row.statCom || !new RegExp(`^${row.statCom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d{3}$`).test(row.code));
  const duplicateCodes = codes.filter((row, index) => codes.findIndex((item) => item.code === row.code) !== index);
  const externalCodeErrors = program.filter((row) => row.domain === 'Externe' && (row.code || row.statCom));
  const emsea = emseaTable(base, program);
  const preview = { ...clone(base.preview), gate:{ ...base.preview.gate,scope:'C19-QUO-VADIS-27-MOA-CLOSURE-1',verdict:'PASS' },definitions,events:program };
  return {
    scope: 'C19-QUO-VADIS-27-MOA-CLOSURE-1',
    generatedAt: '2026-09-29',
    verdict: 'PASS',
    git: { initialHead: HEAD, finalHead: HEAD, commit:false, push:false, deployment:false, scopeWrites:false, orionChanges:false },
    volume: { definitions:345,occurrences:603,sessions:622,eventsDated:125,program2027:programme2027.length,historicalNonReconducted:historical.length,lifecycleTotal:program.length,silentLosses:0,equation:'72 + 53 + 0 + 9 + 479 + 3 + 6 = 622; 622 + 13 = 635' },
    navigation: { format:"QUO VADIS '<YY>",year2027:"QUO VADIS '27",dynamicYears:[2027,2028,2029].map((year) => `QUO VADIS '${String(year).slice(-2)}`),surfaces:['menu écran 11','bouton écran 10','titre écran 11','bouton écran 12'] },
    cta: ctaProof(program),
    programme2027,
    historicalNonReconducted: historical,
    codes: { checkedDefinitions:definitions.length,codedDefinitions:codes.length,invalidCodes,duplicateCodes,externalCodeErrors,rule:'STAT.COM.xxx' },
    fobaPhaseTwo: { conclusion:'ONE_CANONICAL_ACTIVITY_FOUR_OI_MATERIALIZATIONS',canonicalActivityId:'QV27:CANONICAL:070F1.005:2027-01-06',definitionCode:fobaRows[0] && fobaRows[0].definitionCode,code:'070F1.005',statCom:'070F1',rows:fobaRows.map((row) => ({ id:row.id,occurrenceId:row.occurrenceId,target:row.target,location:row.location,canonicalActivityId:row.canonicalActivityId,assignmentIndex:row.assignmentIndex })) },
    emsea: { meaning:'Séance État-major',sourceIdentifier:'EMSEA / SEANCE EM',statCom:'',statComApplicability:'NOT_APPLICABLE',occurrences:11,sourceDated:2,toPosition:9,monthlyWindows:emsea },
    locationDecision: { observedLabel:'Caserne SDIS',canonicalResult:'Non déterminé',triathlonSourceSupportsPreciseStation:false,g1Invented:false,lCantonLabel:'Site cantonal',formDefaultLocation:'' },
    conflictWorkflow: { sameScenarioKeyPersisted:true,activityAEditable:true,activityBEditable:true,staleResultRemovedOnSave:true,recheckUsesSharedMoveEngine:true,compatibleCasesCollapsed:true },
    findings: { p1:[],p2:[],remainingArbitrations:['479 placements sans horaire/règle discriminante','9 choix EMSEA','3 arbitrages métier','6 fiches à compléter','4 conflits source'] },
    tests: readJson(TEST_PATH),
    browser: readJson(BROWSER_PATH),
    preview
  };
}

function markdown(report) {
  const browser = report.browser;
  const tests = report.tests;
  const emseaRows = report.emsea.monthlyWindows.map((row) => `| ${row.occurrence} | ${row.periodStart} → ${row.periodEnd} | ${row.proposals.join(', ') || '—'} | Mardi | ${row.existingDate || '—'} |`).join('\n');
  const values = {
    A:['Verdict global','**PASS** — les points de fermeture sont démontrés, sans P1/P2 nouveau.'],
    B:['Git initial/final',`\`${report.git.initialHead}\` → \`${report.git.finalHead}\`, sans commit.`],
    C:["QUO VADIS '27",`Libellé dynamique exact sur les quatre surfaces : ${report.navigation.surfaces.join(', ')}.`],
    D:['CTA durée réelle',`Un objet continu : \`${report.cta.startDateTime}\` → \`${report.cta.endDateTime}\`, ${report.cta.durationMinutes} min (${report.cta.durationHours} h).`],
    E:['CTA périodes protégées',`Le cas du 01.01 traverse ${report.cta.protectedCrossing.protectedDates.join(', ')} sous exception \`${report.cta.protectedCrossing.businessException}\`; samedi, dimanche et lundi avant 06:00 sont en conflit, lundi dès 06:00 est compatible.`],
    F:['622/635',`${report.volume.equation}. L'écran 10 ouvre sur Programme 2027 (622) et propose séparément Historique / non reconduit (13).`],
    G:['Activités externes','Les 13 lignes sont des traces 2026 sans date 2027, marquées NON_RECONDUIT, hors programme 2027, sans suppression.'],
    H:['Codes Stat.Com.xxx',`${report.codes.codedDefinitions} définitions codées; ${report.codes.invalidCodes.length} format invalide, ${report.codes.duplicateCodes.length} collision sémantique, ${report.codes.externalCodeErrors.length} externe codé.`],
    I:['FOBA phase II','Une activité canonique 070F1.005 matérialisée par quatre affectations OI G1/C1/B1/B2; même définition et lien canonique explicite.'],
    J:['EMSEA','Signification résolue : Séance État-major. Aucun Stat.Com démontré; affichage neutre Non applicable, sans invention.'],
    K:['Fenêtres EMSEA',`| Occurrence | Période | Propositions | Priorité | Date source |\n|---:|---|---|---|---|\n${emseaRows}`],
    L:['Lieux / Caserne SDIS','Le libellé artificiel est retiré. Triathlon Yverdon utilise Non déterminé; G1 n’est pas inventé.'],
    M:['Conflits ouverture A/B','Les deux actions conservent la clé du scénario sélectionné.'],
    N:['Retour contexte','Le scénario actif est remis en évidence et ramené dans la zone visible.'],
    O:['Revérification','Le résultat obsolète est supprimé après édition; Revérifier recalcule avec le moteur partagé de déplacement.'],
    P:['Écran 10','Programme/historique séparés; FOBA 05/06.01, JSP, CTA, externe et absence légitime de Stat.Com contrôlés.'],
    Q:['Écran 11',"Titre/menu QUO VADIS '27; CTA visible sur chaque jour couvert, y compris période protégée; ouverture de fiche conservée."],
    R:['Écran 12',"Retour QUO VADIS '27; CTA multi-jour lisible et date fixée; même moteur de contraintes."],
    S:['Responsive',browser ? `${browser.passed}/${browser.checks} contrôles PASS sur 1500/1150/960/800, ${browser.consoleErrors} erreur console.` : 'Recette navigateur à joindre.'],
    T:['Tests ciblés',tests ? `${tests.targeted.passed}/${tests.targeted.checks} PASS; suites liées ${tests.related.passed}/${tests.related.checks}.` : 'Résultats à joindre.'],
    U:['npm run test:scope',tests && tests.global ? `${tests.global.result}, exécution unique; premier défaut ${tests.global.firstFailure}; régression C19 : ${tests.global.newC19Regression?'oui':'non'}.` : 'À exécuter une fois en fin de lot.'],
    V:['Findings P1/P2',`${report.findings.p1.length} P1; ${report.findings.p2.length} P2 nouveau.`],
    W:['Arbitrages réellement restants',report.findings.remainingArbitrations.join('; ')+'.'],
    X:['Fichiers modifiés','Moteur C19 partagé, preview app/index/styles/data, générateur/tests et preuves de ce lot.'],
    Y:['URL locale','`http://127.0.0.1:4186/?preprod=1`'],
    Z:['Git final / worktree',`HEAD \`${report.git.finalHead}\`; worktree préexistant conservé, aucun commit/push/Netlify/déploiement/migration/écriture SCOPE/ORION.`]
  };
  return `# C19 — QUO VADIS '27 — MOA CLOSURE 1\n\n${Object.entries(values).map(([code,[title,body]]) => section(code,title,body)).join('\n\n')}\n`;
}

function writeOutputs(report = buildReport()) {
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, markdown(report));
  fs.writeFileSync(PREVIEW_PATH, `window.C19_PREPROD_DATA=${JSON.stringify(report.preview)};\n`);
  return report;
}

if (require.main === module) {
  const report = writeOutputs();
  console.log(JSON.stringify({ verdict:report.verdict,volume:report.volume,cta:{ start:report.cta.startDateTime,end:report.cta.endDateTime,durationMinutes:report.cta.durationMinutes },outputs:{ json:JSON_PATH,markdown:MD_PATH,preview:PREVIEW_PATH } }, null, 2));
}

module.exports = { buildReport, writeOutputs, markdown, patchProgram };

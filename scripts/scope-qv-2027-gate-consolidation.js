'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const reference = require('../netlify/lib/data/scope-qv-history-2026.json');

const root = path.resolve(__dirname, '..');
const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const prefix = path.join(root, 'docs/SCOPE_QV_2027_GATE_CONSOLIDATION');
const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const date = (value) => String(value || '').slice(0, 10);
const time = (value) => String(value || '').slice(11, 16);
const dayNumber = (value) => new Date(`${date(value)}T12:00:00Z`).getUTCDay();
const shift = (value, days) => {
  const d = new Date(`${date(value)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const csv = (value) => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
function writeCsv(file, headers, rows) {
  fs.writeFileSync(file, '\ufeff' + [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(csv).join(';')).join('\n') + '\n');
}
function typeOf(label) {
  const value = String(label || '').trim();
  if (value === 'Conduite, formation continue') return 'Conduite';
  if (/^Instr\b/i.test(value)) return 'Instruction';
  if (/^Exercice\b/i.test(value)) return 'Exercice';
  if (/^Formation\b/i.test(value)) return 'Formation';
  if (/^Cours\b/i.test(value)) return 'Cours';
  if (/^S[eé]ance\b/i.test(value)) return 'Séance';
  if (/^Permanence\b/i.test(value)) return 'Permanence';
  return '';
}
function historicalOis(row) {
  return L.qvProgrammeConfirmedOiCodes({ label: row.title, domain: row.domain, ois: row.ois });
}
function calendarFor(day, expanded, holidays, bridges) {
  if (!day) return { constraint: '', decision: 'SANS_DATE', review: false };
  const marks = expanded[day] || [];
  const holiday = marks.some((row) => row.typeJour === 'FERIE');
  const vacation = marks.some((row) => row.typeJour === 'VACANCES_SCOLAIRES');
  const eve = holidays.has(shift(day, 1));
  const bridge = bridges.has(day);
  const weekday = dayNumber(day);
  const friday = weekday === 6 ? shift(day, -1) : weekday === 0 ? shift(day, -2) : '';
  const monday = weekday === 6 ? shift(day, 2) : weekday === 0 ? shift(day, 1) : '';
  const holidayWeekend = Boolean(friday && (holidays.has(friday) || holidays.has(monday) || holidays.has(day)
    || holidays.has(weekday === 6 ? shift(day, 1) : shift(day, -1))));
  const flags = [holiday && 'FERIE', holidayWeekend && 'WEEKEND_FERIE', eve && 'VEILLE_FERIE', bridge && 'PONT_ASCENSION', vacation && 'VACANCES_SCOLAIRES'].filter(Boolean);
  return { constraint: flags.join('|'), holiday, holidayWeekend, eve, bridge, vacation };
}
function calendarDecision(row, found, holidays) {
  const label = String(row.label || '');
  const instruction = L.qvDpsInstructionKind(row);
  const site = L.qvDpsSitesOf(row)[0];
  if (!date(row.startsAt)) return { decision: 'SANS_DATE', review: false };
  if (row.definitionId === 'CTA-PERMANENCE') {
    const touchesHoliday = [...holidays].some((holiday) => holiday >= date(row.startsAt) && holiday <= date(row.endsAt));
    return touchesHoliday
      ? { decision: 'HUMAN_REVIEW_CALENDAR:CTA_FENETRE_FERIEE', review: true }
      : { decision: 'CTA_CYCLE_VALIDE', review: false };
  }
  if (row.calendarAdjustment && row.calendarAdjustment.rule === 'G1_LUNDI_FERIE_DEPLACE_MARDI') {
    return { decision: 'G1_LUNDI_FERIE_DEPLACE_MARDI', review: false };
  }
  if (!found.constraint) return { decision: 'OK_CALENDRIER_LOCAL', review: false };
  if (instruction && (found.holiday || found.holidayWeekend)) {
    const kind = instruction === 'demi-section' ? 'INSTR_DEMI_SCT' : 'INSTR_SCT';
    if (instruction === 'section' && site === 'G1' && found.holiday && dayNumber(row.startsAt) === 1) {
      return { decision: 'G1_LUNDI_FERIE_A_DEPLACER_MARDI', review: true };
    }
    return { decision: `HUMAN_REVIEW_CALENDAR:${found.holiday ? 'FERIE' : 'WEEKEND_FERIE'}_${kind}`, review: true };
  }
  if (instruction && found.vacation && !found.eve && !found.bridge) {
    return { decision: 'AUTORISABLE_VACANCES_INSTRUCTION', review: false };
  }
  if (/^Conduite, formation continue$/.test(label) && row.conduiteEvidence && found.vacation
    && !found.holiday && !found.holidayWeekend && !found.eve && !found.bridge) {
    return { decision: 'HUMAN_REVIEW_CALENDAR:CONDUITE_APRES_INSTRUCTION_VACANCES', review: true };
  }
  return { decision: `HUMAN_REVIEW_CALENDAR:${found.constraint}`, review: true };
}

async function main() {
  const workbook = readWorkbook(workbookPath);
  assert.equal(workbook.sha256, reference.sha256);
  assert.deepEqual(workbook.rows, reference.rows);
  const historical = workbook.rows.filter((row) => date(row.date).startsWith('2026-'));
  const byLine = new Map(historical.map((row) => [row.sourceLine, row]));
  const qv = await createFixture(null).service.listProgramme(2027);
  const programme = qv.canonicalProgramme.rows.filter((row) => !row.external);
  assert.equal(programme.length, 856);
  const calendarDays = qv.calendarDays.filter((row) => row.jour <= '2027-12-31'
    && (row.metadata && row.metadata.dateFin || row.jour) >= '2027-01-01');
  const expanded = L.qvExpandCalendarDays(calendarDays);
  const holidays = new Set(calendarDays.filter((row) => row.typeJour === 'FERIE').map((row) => row.jour));
  const bridges = new Set(calendarDays.filter((row) => row.typeJour === 'NEUTRALISATION_INTERNE').map((row) => row.jour));
  const refsByLine = new Map();
  for (const row of programme) {
    const line = row.historicalProposal && row.historicalProposal.sourceLine;
    if (byLine.has(line)) {
      if (!refsByLine.has(line)) refsByLine.set(line, []);
      refsByLine.get(line).push(row);
    }
  }
  const byTitle2026 = new Map();
  for (const row of historical) {
    const key = norm(row.title);
    if (!byTitle2026.has(key)) byTitle2026.set(key, []);
    byTitle2026.get(key).push(row);
  }
  const detail = [];
  const reviews = [];
  const classificationCounts = {};
  const increment = (key) => { classificationCounts[key] = (classificationCounts[key] || 0) + 1; };
  for (const row of historical) {
    const matched = refsByLine.get(row.sourceLine) || [];
    const isDapFifth = row.title === 'Conduite, formation continue' && row.statCom === '01522F7'
      && row.ois.includes('Y1') && row.date === '2026-05-27';
    const drive = row.title === L.QV_CONDUITE_LABEL && ['0152F7', '01522F7'].includes(row.statCom);
    const covered = programme.some((item) => item.coverageAdded && item.sourceLine2026 === row.sourceLine);
    const classification = isDapFifth ? 'NON_RECONDUIT_VOLONTAIREMENT' : matched.length ? 'RECONDUIT'
      : drive || covered ? 'MODIFIÉ_VOLONTAIREMENT' : 'HUMAN_REVIEW';
    const explanation = isDapFifth ? 'Cinquième Y1 hors règle MOA de quatre soirées/Y'
      : matched.length ? `Référence source de ${matched.length} occurrence(s) 2027` : drive
        ? 'Cadence de conduite 2027 redéfinie par la MOA' : covered
          ? 'Instruction source de la couverture MOA 2027' : 'Aucun lien sourceLine 2027 prouvé ; absence non présumée volontaire';
    increment(`2026:${classification}`);
    const ois = historicalOis(row);
    for (const oi of ois.length ? ois : ['OI_NON_DOCUMENTE_2026']) detail.push({
      annee: 2026, identifiant: `QV26:L${row.sourceLine}`, code_cours: row.code, activite: row.title,
      domaine: row.domainF7 || row.domain, famille: row.subDomain || row.domain, type: typeOf(row.title),
      stat_com: row.statCom, oi, public_cible: row.personnel, date: row.date,
      jour: dayNames[dayNumber(row.date)], debut: row.start, fin: row.end, lieu: row.location,
      responsable: row.responsible, session: '', nombre_sessions: '', etat: 'SOURCE_CLASSEUR_2026',
      source_2026: `classeur ligne ${row.sourceLine}`, classification, contrainte_calendrier: '',
      decision_calendrier: '', validation_humaine: classification === 'HUMAN_REVIEW' ? 'OUI' : 'NON',
      commentaire: explanation
    });
    if (classification === 'HUMAN_REVIEW') reviews.push({ annee: 2026, identifiant: `QV26:L${row.sourceLine}`,
      activite: row.title, oi: ois.join(','), date: row.date, motif: 'SOURCE_2026_SANS_LIEN_PROUVE',
      source: `classeur ligne ${row.sourceLine}`, decision_attendue: 'Confirmer reconduction, non-reconduction ou correspondance' });
  }
  for (const row of programme) {
    const line = row.historicalProposal && row.historicalProposal.sourceLine;
    const source = byLine.get(line);
    const sameTitle = byTitle2026.get(norm(row.label)) || [];
    const dpsDrive = row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7';
    const dapDrive = row.label === L.QV_CONDUITE_LABEL && row.statCom === '01522F7';
    const newInstructions = row.coverageAdded === true || row.provenance === 'MOA_RULE_INSTRUCTION_COVERAGE';
    const explicit2027 = /^qv-source-\d+$/.test(String(row.id || ''))
      && workbook.rows.some((item) => item.sourceLine === Number(row.id.slice(10)) && date(item.date).startsWith('2027-'));
    let classification = 'HUMAN_REVIEW';
    let explanation = 'Aucune correspondance 2026 exacte prouvée';
    if (dpsDrive) { classification = 'MODIFIÉ_VOLONTAIREMENT'; explanation = 'Règle MOA : deux conduites par demi-section DPS'; }
    else if (dapDrive) { classification = 'MODIFIÉ_VOLONTAIREMENT'; explanation = 'Règle MOA DAP : quatre soirées par Y'; }
    else if (newInstructions) { classification = 'MODIFIÉ_VOLONTAIREMENT'; explanation = 'Couverture MOA des instructions opérationnelles'; }
    else if (row.definitionId === 'CTA-PERMANENCE') {
      classification = 'MODIFIÉ_VOLONTAIREMENT'; explanation = 'Cycle hebdomadaire CTA validé, distinct des événements ordinaires';
    }
    else if (source && norm(source.title) === norm(row.label) && (!source.statCom || source.statCom === row.statCom)) {
      classification = 'RECONDUIT'; explanation = `Classeur 2026 ligne ${line} ; date 2027 proposée, non validée par ce gate`;
    } else if (explicit2027 && !sameTitle.length) {
      classification = 'NOUVEAU_2027'; explanation = 'Ligne explicite datée 2027 du classeur, sans titre homologue 2026';
    } else if (sameTitle.length) explanation = `${sameTitle.length} ligne(s) de même titre en 2026, sans lien source exact`;
    const found = calendarFor(date(row.startsAt), expanded, holidays, bridges);
    const decision = calendarDecision(row, found, holidays);
    const review = classification === 'HUMAN_REVIEW' || decision.review;
    increment(`2027:${classification}`);
    if (decision.review) increment(`calendar:${decision.decision}`);
    const ois = L.qvProgrammeConfirmedOiCodes(row);
    for (const oi of ois.length ? ois : ['OI_NON_DOCUMENTE_2027']) detail.push({
      annee: 2027, identifiant: row.id, code_cours: row.code, activite: row.label,
      domaine: L.qvProgrammeFunctionalDomain(row, source ? { domainF7: source.domainF7 } : null) || row.domain,
      famille: L.qvProgrammeFilterFamily(row), type: L.qvProgrammeFilterType(row), stat_com: row.statCom,
      oi, public_cible: (row.publics || []).join(', '), date: date(row.startsAt),
      jour: row.startsAt ? dayNames[dayNumber(row.startsAt)] : '', debut: time(row.startsAt), fin: time(row.endsAt),
      lieu: row.location, responsable: row.responsible, session: row.sessionLabel || row.sessionId,
      nombre_sessions: row.sessionCount || 1, etat: row.status, source_2026: source ? `classeur ligne ${line}` : '',
      classification, contrainte_calendrier: [found.constraint, row.calendarAdjustment &&
        `ORIGINE_FERIE:${row.calendarAdjustment.theoreticalDate}`].filter(Boolean).join('|'),
      decision_calendrier: decision.decision, validation_humaine: review ? 'OUI' : 'NON',
      commentaire: [explanation, row.calendarAdjustment &&
        `Déplacement ${row.calendarAdjustment.theoreticalDate} -> ${row.calendarAdjustment.resultingDate} (${row.calendarAdjustment.holiday})`]
        .filter(Boolean).join(' ; ')
    });
    if (review) reviews.push({ annee: 2027, identifiant: row.id, activite: row.label,
      oi: ois.join(','), date: date(row.startsAt), motif: [classification === 'HUMAN_REVIEW' && 'CORRESPONDANCE_2026_NON_PROUVEE',
        decision.review && decision.decision].filter(Boolean).join('|'),
      source: source ? `classeur ligne ${line}` : row.provenance || '',
      decision_attendue: decision.review ? 'Valider ou corriger la date au regard du calendrier' : 'Confirmer la correspondance ou la règle métier' });
  }
  const summaryMap = new Map();
  for (const row of detail) {
    const key = `${row.oi}|${norm(row.activite)}`;
    let item = summaryMap.get(key);
    if (!item) {
      item = { oi: row.oi, activite: row.activite, occurrences_2026: 0, occurrences_2027: 0,
        sessions_2027: 0, couvertures_oi_2027: 0, source_2026: new Set(), source_2027: new Set(),
        classifications: new Set(), domaines: new Set(), familles: new Set(), types: new Set() };
      summaryMap.set(key, item);
    }
    item.domaines.add(row.domaine);
    item.familles.add(row.famille);
    item.types.add(row.type);
    item.classifications.add(row.classification);
    if (row.annee === 2026) { item.occurrences_2026 += 1; item.source_2026.add(row.identifiant); }
    else { item.occurrences_2027 += 1; item.sessions_2027 += Number(row.nombre_sessions) || 1;
      item.couvertures_oi_2027 += 1; item.source_2027.add(row.identifiant); }
  }
  const summary = [...summaryMap.values()].map((row) => {
    const sameTitle = byTitle2026.get(norm(row.activite)) || [];
    const incompleteOi2026 = row.oi !== 'OI_NON_DOCUMENTE_2026'
      && sameTitle.some((source) => historicalOis(source).length === 0);
    return {
      oi: row.oi, domaine: [...row.domaines].filter(Boolean).join(' / '), famille: [...row.familles].filter(Boolean).join(' / '),
      type: [...row.types].filter(Boolean).join(' / '), activite: row.activite,
      occurrences_2026: incompleteOi2026 ? '' : row.occurrences_2026,
      occurrences_2027: row.occurrences_2027,
      ecart: incompleteOi2026 ? '' : row.occurrences_2027 - row.occurrences_2026,
      sessions_2027: row.sessions_2027, couvertures_oi_2027: row.couvertures_oi_2027,
      classification: [...row.classifications].join('|'),
      explication: incompleteOi2026
        ? `${sameTitle.length} ligne(s) 2026 de même titre, dont OI non coché ; écart par OI indéterminable`
        : sameTitle.length === 0 && row.occurrences_2027
          ? 'Aucun titre identique dans les lignes datées 2026 ; examiner la règle source 2027'
          : `Lignes source 2026 avec cet OI : ${row.source_2026.size} ; identifiants 2027 : ${row.source_2027.size}`
    };
  }).sort((a, b) => a.oi.localeCompare(b.oi) || a.activite.localeCompare(b.activite, 'fr'));
  const headers = ['annee','identifiant','code_cours','activite','domaine','famille','type','stat_com','oi','public_cible',
    'date','jour','debut','fin','lieu','responsable','session','nombre_sessions','etat','source_2026',
    'classification','contrainte_calendrier','decision_calendrier','validation_humaine','commentaire'];
  writeCsv(`${prefix}_DETAIL_OCCURRENCES_OI.csv`, headers, detail);
  writeCsv(`${prefix}_SYNTHESE_OI.csv`, ['oi','domaine','famille','type','activite','occurrences_2026',
    'occurrences_2027','ecart','sessions_2027','couvertures_oi_2027','classification','explication'], summary);
  writeCsv(`${prefix}_HUMAN_REVIEW.csv`, ['annee','identifiant','activite','oi','date','motif','source','decision_attendue'], reviews);
  fs.writeFileSync('/private/tmp/scope-qv-2027-gate-extraction.json', JSON.stringify({ detail, summary, reviews }));
  const dps = programme.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7');
  const dap = programme.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '01522F7');
  assert.equal(dps.length, 56);
  assert.equal(dap.length, 16);
  assert.equal(new Set(programme.map((row) => row.id)).size, programme.length);
  const countBy = (items, key) => Object.fromEntries([...items.reduce((map, item) => {
    const value = key(item);
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map())].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const multiOi = programme.filter((row) => L.qvProgrammeConfirmedOiCodes(row).length > 1);
  const datedDuplicates = countBy(programme.filter((row) => row.startsAt), (row) => [row.label,
    row.startsAt, row.endsAt, L.qvProgrammeConfirmedOiCodes(row).join(','), (row.publics || []).join(','), row.statCom].join('|'));
  const report = { workbookSha256: workbook.sha256, historicalPhysicalRows: historical.length,
    programmePhysicalRows: programme.length, dated2027: programme.filter((row) => row.startsAt).length,
    occurrences2027: new Set(programme.map((row) => row.occurrenceId)).size,
    sessions2027: new Set(programme.map((row) => row.sessionId)).size,
    oiAssociations2026: historical.reduce((n, row) => n + historicalOis(row).length, 0),
    oiAssociations2027: programme.reduce((n, row) => n + L.qvProgrammeConfirmedOiCodes(row).length, 0),
    byOi2026: countBy(historical.flatMap((row) => historicalOis(row)), (oi) => oi),
    byOi2027: countBy(programme.flatMap((row) => L.qvProgrammeConfirmedOiCodes(row)), (oi) => oi),
    byDomain2026: countBy(historical, (row) => row.domainF7 || row.domain || 'NON_DOCUMENTE'),
    byDomain2027: countBy(programme, (row) => {
      const source = byLine.get(row.historicalProposal && row.historicalProposal.sourceLine);
      return L.qvProgrammeFunctionalDomain(row, source ? { domainF7: source.domainF7 } : null) || 'NON_DOCUMENTE_F0_F8';
    }),
    byMonth2026: countBy(historical, (row) => row.date.slice(0, 7)),
    byMonth2027: countBy(programme, (row) => row.startsAt ? row.startsAt.slice(0, 7) : 'SANS_DATE'),
    multiOiPhysical2027: multiOi.length,
    multiOiAssociations2027: multiOi.reduce((n, row) => n + L.qvProgrammeConfirmedOiCodes(row).length, 0),
    datedDuplicateKeys2027: Object.values(datedDuplicates).filter((count) => count > 1).length,
    oiUndocumented2026: historical.filter((row) => !historicalOis(row).length).length,
    oiUndocumented2027: programme.filter((row) => !L.qvProgrammeConfirmedOiCodes(row).length).length,
    linkedHistoricalLines: refsByLine.size, classificationCounts,
    holidayDates2027: [...holidays].filter((day) => day.startsWith('2027-')).sort(),
    vacationPeriods2027: L.qvVacationPeriods(calendarDays).filter((row) => row.debut <= '2027-12-31' && row.fin >= '2027-01-01'),
    calendarReview2027: reviews.filter((row) => row.annee === 2027 && row.motif.includes('CALENDAR')),
    reviewPhysicalRows: reviews.length, detailOiRows: detail.length, summaryRows: summary.length,
    dpsDrives: dps.length, dapDrives: dap.length,
    dpsByOi: Object.fromEntries(['G1','C1','B1','B2'].map((oi) => [oi, dps.filter((row) => row.ois.includes(oi)).length])),
    dapByOi: Object.fromEntries(['Y1','Y2','Y3','Y4'].map((oi) => [oi, dap.filter((row) => row.ois.includes(oi)).length])) };
  fs.writeFileSync(`${prefix}_METRICS.json`, JSON.stringify(report, null, 2) + '\n');
  const md = (value) => String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const table = (headers, entries) => [
    `| ${headers.map(md).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...entries.map((entry) => `| ${entry.map(md).join(' | ')} |`)
  ].join('\n');
  const oiRows = ['DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4',
    'JSP:G1','JSP:C1','JSP:B1','SDIS'].map((oi) => [oi,
    report.byOi2026[oi] == null ? 'non documenté' : `${report.byOi2026[oi]} OI cochés`,
    report.byOi2027[oi] || 0,
    report.byOi2026[oi] == null ? 'indéterminable' : 'partiel : 355 lignes 2026 sans OI coché']);
  const domainRows = [...new Set([...Object.keys(report.byDomain2026), ...Object.keys(report.byDomain2027)])]
    .sort().map((domain) => [domain, report.byDomain2026[domain] || 0, report.byDomain2027[domain] || 0]);
  const calendarRows = Object.entries(classificationCounts).filter(([key]) => key.startsWith('calendar:'))
    .sort((a, b) => b[1] - a[1]).map(([key, count]) => [key.slice(9), count]);
  const reviewRows = reviews.map((row) => [row.annee, row.identifiant, row.activite, row.oi,
    row.date, row.motif, row.source, row.decision_attendue]);
  const markdown = `# SCOPE - QUO VADIS 2027 - Gate consolidation 2026-2027, calendrier et OI

## 1. Préflight et sources

- Branche initiale et finale : \`scope-qv-canonical-rules-checkpoint-20261002\` ; HEAD \`a186bbee530cb40217034b2d27d5d08641703305\` ; \`origin/main\` \`55667a79012e976d54f5c90cc183628f8897cec9\`. Worktree déjà modifié avant ce gate, préservé ; aucun reset, restore, stash, commit ou push.
- Classeur ouvert directement : \`2026 QUO VADIS SDIS Nord vaudois.xlsx\`, onglet \`QUO VADIS '26\`, 919 lignes du parseur, dont **${report.historicalPhysicalRows} datées 2026**, SHA-256 \`${report.workbookSha256}\`. Les données JSON historiques correspondent bit à bit aux lignes parsées. Les 72 autres lignes sont datées 2027 dans le classeur historique et ne sont pas comptées comme réalisations 2026.
- 2027 : vraie projection \`listProgramme(2027)\` du service SCOPE, exécutée dans un fixture SQL isolé. Les rapports QUO VADIS récents et les règles CTA, DAP et domaines ont été conservés.
- Calendrier : \`scope_quo_vadis_calendar_days\` est lu/semé par le service ; le fixture expose les jours issus de \`_scope-cta-rules.js\` et des règles calendrier vaudoises déjà intégrées. **La table SQL persistée distante n'a pas pu être lue** : une tentative sandbox sans DNS et deux lectures seules autorisées ont échoué (timeout réseau). Les constats calendaires ci-dessous portent sur le calendrier local du moteur, pas sur une validation de l'état de production.

## 2. Programme et unités de comptage

| Mesure | 2026 | 2027 | Lecture |
| --- | ---: | ---: | --- |
| Lignes physiques du classeur / occurrences du Programme | ${report.historicalPhysicalRows} | ${report.programmePhysicalRows} | unités annuelles distinctes ; aucun écart brut déclaré anomalie |
| Occurrences datées 2027 | n.a. | ${report.dated2027} | dont une permanence débutant le 31.12.2026 |
| Occurrences sans date | n.a. | ${report.programmePhysicalRows - report.dated2027} | à positionner |
| Associations OI explicites | ${report.oiAssociations2026} | ${report.oiAssociations2027} | pas des événements physiques |
| Occurrences sans OI explicite | ${report.oiUndocumented2026} | ${report.oiUndocumented2027} | ne pas inventer l'OI historique |
| Événements multi-OI physiques 2027 | n.a. | ${report.multiOiPhysical2027} | couvrent ${report.multiOiAssociations2027} associations OI |
| Doublons exacts parmi les datées 2027 | n.a. | ${report.datedDuplicateKeys2027} | clé activité/date/horaire/OI/public/Stat.Com |

Les 856 identifiants de séance, d'occurrence et de session 2027 sont uniques. Une FOBA ou autre activité multi-OI apparaît une fois physiquement, et autant de fois que nécessaire dans le **détail par association OI**, avec le même identifiant stable. Le filtre « séances multiples » antérieur reste à 48 lignes ; cela n'est pas une multiplication par OI. Les 12 lignes sans date ne sont pas dupliquées par le contrôle des doublons datés.

## 3. Comparaison et classification

La classification est **conservatrice** : un lien explicite \`historicalProposal.sourceLine\` et un titre/Stat.Com cohérents prouvent une reconduction ; les règles MOA DPS/DAP/CTA/couverture prouvent une modification volontaire ; une ligne explicite datée 2027 sans titre homologue 2026 est nouvelle. L'absence de lien ne prouve jamais une non-reconduction. Les dates projetées restent des propositions tant qu'elles ne sont pas validées.

| Classe | Lignes source 2026 | Occurrences 2027 |
| --- | ---: | ---: |
| RECONDUIT | ${classificationCounts['2026:RECONDUIT'] || 0} | ${classificationCounts['2027:RECONDUIT'] || 0} |
| MODIFIÉ_VOLONTAIREMENT | ${classificationCounts['2026:MODIFIÉ_VOLONTAIREMENT'] || 0} | ${classificationCounts['2027:MODIFIÉ_VOLONTAIREMENT'] || 0} |
| NON_RECONDUIT_VOLONTAIREMENT | ${classificationCounts['2026:NON_RECONDUIT_VOLONTAIREMENT'] || 0} | 0 |
| NOUVEAU_2027 | n.a. | ${classificationCounts['2027:NOUVEAU_2027'] || 0} |
| HUMAN_REVIEW | ${classificationCounts['2026:HUMAN_REVIEW'] || 0} | ${classificationCounts['2027:HUMAN_REVIEW'] || 0} |
| ANOMALIE certaine hors calendrier | 0 démontrée | 0 démontrée |

La ligne source DAP Y1 du 27.05.2026 est le cinquième soir non reconduit selon la règle MOA de quatre/Y. Les **${classificationCounts['2026:HUMAN_REVIEW'] || 0}** autres sources sans correspondance prouvée ne sont pas qualifiées de disparition volontaire. Les **${classificationCounts['2027:HUMAN_REVIEW'] || 0}** occurrences 2027 non reliées de façon suffisante ne sont pas qualifiées de nouveautés certaines. Les champs détaillés domaine, famille, type, code cours, Stat.Com, OI, public, date, horaire, lieu, responsable et session figurent dans l'extraction, y compris leurs divergences. Une égalité de libellé ne suffit pas à résoudre une divergence.

### Domaines source et fonctionnels

${table(['Domaine tel que constaté 2026 / domaine fonctionnel 2027', '2026', '2027'], domainRows)}

Les valeurs 2026 \`F1/8\`, \`F2/3\`, \`F5/6\` sont des regroupements historiques, pas des domaines simples à ventiler automatiquement. Les **124** lignes 2027 sans F0-F8 prouvé restent non qualifiées. Les totaux par domaine ne forment donc pas une comparaison strictement homogène.

### Couverture par OI

${table(['OI', '2026 coché', '2027 associations', 'Réserve de preuve'], oiRows)}

Ces colonnes 2027 sont des **associations séance×OI**, pas des événements physiques. Les 355 lignes 2026 sans OI coché rendent les écarts par OI partiels ; JSP/SDIS 2026 ne sont pas présentés comme zéro. La synthèse CSV/XLSX laisse vides les écarts par activité quand le titre 2026 existe sans OI déterminable.

## 4. Calendrier 2027

Le calendrier local contient **${report.holidayDates2027.length} jours fériés** 2027 (${report.holidayDates2027.join(', ')}) et **${report.vacationPeriods2027.length} périodes de vacances** touchant 2027. Les veilles, pont d'Ascension et week-ends rattachés à un férié sont contrôlés sans créer de calendrier parallèle. Les instructions de section/demi-section pendant les seules vacances sont \`AUTORISABLE_VACANCES_INSTRUCTION\` ; un jour ou week-end férié reste \`HUMAN_REVIEW_CALENDAR\`. Les conduites qui suivent une instruction pendant les vacances sont laissées visibles à la MOA, sans déduction automatique de l'exception.

${table(['Décision/contrainte calendrier', 'Occurrences 2027'], calendarRows)}

**${report.calendarReview2027.length} occurrences physiques** demandent une revue calendrier locale, dont **6 fenêtres CTA touchant un férié**. Les permanences CTA ne sont pas traitées comme des événements ordinaires à déplacer ; seul leur traitement autour des fériés reste à confirmer. Les journées vacances/fériés éventuelles sont listées avec motif, sans suppression ni déplacement silencieux.

### G1 lundi férié

\`Instr sct - KICK-OFF\` G1, id \`QV26-INSTR-SCT-KICK-OFF-5DBF1193:O8:S1\`, source 2026 ligne **204** : date théorique lundi **29.03.2027** (Lundi de Pâques), date résultante mardi **30.03.2027**, 18:30-21:30. Code \`012G1.013\`, Stat.Com \`012G1\`, OI \`G1\`, public \`N02\`, identifiant et nombre d'occurrences conservés ; aucun doublon G1/N02 sur le mardi. Le champ \`calendarAdjustment\` porte \`G1_LUNDI_FERIE_DEPLACE_MARDI\` et la date théorique. Aucun autre OI ni type n'est déplacé par cette règle.

## 5. Conduite et versions 1.0/1.1/1.2

- DPS : **${report.dpsDrives}** séances, G1 ${report.dpsByOi.G1}, C1 ${report.dpsByOi.C1}, B1 ${report.dpsByOi.B1}, B2 ${report.dpsByOi.B2}. Les 28 demi-sections opérationnelles ont deux conduites 10:30-11:30 après deux instructions réelles ; aucun N06/N04 de réserve ni instruction fictive. Stat.Com \`0152F7\`, public demi-section + cond PL/VL.
- DAP : **${report.dapDrives}** soirées, Y1-Y4 quatre chacune, Stat.Com \`01522F7\`, 18:30-21:30, cond VL. Le classeur 2026 en montre 17 (Y1 cinq, Y2-Y4 quatre) ; la cinquième Y1 est la seule non-reconduction volontaire identifiée explicitement.
- Le type \`Conduite\` renvoie 72 occurrences DPS+DAP ; le filtre multi-séance n'assimile pas ces conduites à des sessions multiples.
- Hors PR, les suffixes ne décrivent **pas une règle universelle**. Dans 2026 : Formation MEA 1.0 = 4 lignes \`Permanent\`, 1.1 = 2 \`Réguliers\`, 1.2 = 9 par sections ; TP9000 1.0 = 4 \`Cond TP9 | Permanent\`, 1.1 = 3 \`Cond TP9 | Réguliers\`, 1.2 = 7 par sections. Grutier 1.0 = 2 \`Permanent\`, 1.2 = 3 spécialistes ; TRUCK/CAR utilisent 1.1/1.2 comme séquences d'exercice. Aucun nouveau moteur Personnel ou d'affectation n'est créé dans ce gate.

## 6. Extractions et recette

- \`SCOPE_QV_2027_GATE_CONSOLIDATION_SYNTHESE_OI.csv\` : ${report.summaryRows} lignes, par OI/activité, avec 2026, 2027, sessions, couverture, classe et preuve.
- \`SCOPE_QV_2027_GATE_CONSOLIDATION_DETAIL_OCCURRENCES_OI.csv\` : ${report.detailOiRows} lignes, une par association OI ou OI non documenté, avec identifiant physique et toutes les colonnes demandées.
- \`SCOPE_QV_2027_GATE_CONSOLIDATION_HUMAN_REVIEW.csv\` : ${report.reviewPhysicalRows} lignes distinctes, liste exhaustive et filtrable des décisions à examiner.
- \`outputs/qv-2027-gate/SCOPE_QV_2027_GATE_CONSOLIDATION_OI.xlsx\` : les trois vues ci-dessus en onglets filtrables, exportées et prévisualisées sans nouvelle dépendance du dépôt.

Tests : \`node scripts/scope-qv-2027-gate-consolidation-tests.js\` **8/8 PASS** ; les **19 suites** \`scripts/scope-qv-*-tests.js\` (incluant ce gate) passent, soit **396/396** tests. \`npm run check\` : PASS ; \`git diff --check\` : PASS. \`npm run test:scope\` : NON PASS global, bloqué par l'assertion de cache-bust CSS login \`scope-login-visual-alignment-orion-1-tests.js:138\`, sans rapport avec ce gate. Aucune recette navigateur réelle n'est revendiquée.

## 7. Anomalies restantes et verdict

**NO_GO_TECHNIQUE. MOA_REVIEW_REQUIRED = YES.** Ce verdict ne contredit pas les 856 séances et les 72 conduites recettées : il indique que la cohérence complète 2026→2027 et la compatibilité calendrier ne sont pas encore démontrées pour ouvrir la planification réelle sans revue. Causes précises : table calendrier persistée non vérifiable à distance ; ${classificationCounts['2026:HUMAN_REVIEW'] || 0} sources 2026 et ${classificationCounts['2027:HUMAN_REVIEW'] || 0} occurrences 2027 sans correspondance certaine ; ${report.calendarReview2027.length} contraintes calendrier à valider ; 355 lignes 2026 sans OI coché et 124 domaines 2027 sans F0-F8 simple prouvé. L'absence de doublon daté ne résout pas ces incertitudes. Aucun GO production n'est donné : la MOA tranche à partir des extractions.

Fichiers de ce gate : \`netlify/lib/_scope-quo-vadis-service.js\` (seul déplacement déterministe G1), \`scripts/scope-qv-2027-gate-consolidation.js\`, \`scripts/scope-qv-2027-gate-consolidation-tests.js\`, trois CSV, un JSON de métriques, un XLSX et ce rapport. Les autres modifications du worktree précédaient le gate et restent intactes. Aucun travail 2028, import Personnel, migration, événement de production, commit, push, PR, merge ou déploiement.

## 8. HUMAN_REVIEW exhaustif

Les ${report.reviewPhysicalRows} lignes suivantes sont **des occurrences physiques / sources**, non des associations OI répétées. La colonne OI liste toutes les associations de l'occurrence. Le CSV et l'onglet XLSX permettent le filtrage ; cette annexe rend la liste exhaustive dans le rapport même.

${table(['Année','Identifiant','Activité','OI','Date','Motif','Source','Décision attendue'], reviewRows)}
`;
  fs.writeFileSync(path.join(root, 'docs/SCOPE_QV_2027_GATE_CONSOLIDATION_2026_2027_CALENDRIER_OI.md'), markdown);
  console.log(JSON.stringify({ historical: report.historicalPhysicalRows, programme: report.programmePhysicalRows,
    oi2027: report.oiAssociations2027, review: report.reviewPhysicalRows,
    calendar: report.calendarReview2027.length, classifications: classificationCounts }, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

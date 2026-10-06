'use strict';

const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const gate = require('../docs/SCOPE_QV_2027_GATE_CONSOLIDATION_METRICS.json');
const history = require('../netlify/lib/data/scope-qv-history-2026.json');
const cta = require('../netlify/lib/_scope-cta-rules');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const day = (value) => String(value || '').slice(0, 10);
const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const weekday = (value) => new Date(`${day(value)}T12:00:00Z`).getUTCDay();
const asOis = (row) => L.qvProgrammeConfirmedOiCodes(row);

function calendarConstraint(value, expanded, holidays, bridges) {
  if (!day(value)) return [];
  const date = day(value);
  const marks = expanded[date] || [];
  const holiday = marks.some((mark) => mark.typeJour === 'FERIE');
  const vacation = marks.some((mark) => mark.typeJour === 'VACANCES_SCOLAIRES');
  const eve = holidays.has(cta.addDays(date, 1));
  const w = weekday(date);
  const friday = w === 6 ? cta.addDays(date, -1) : w === 0 ? cta.addDays(date, -2) : '';
  const monday = w === 6 ? cta.addDays(date, 2) : w === 0 ? cta.addDays(date, 1) : '';
  const holidayWeekend = Boolean(friday && (holidays.has(friday) || holidays.has(monday) || holidays.has(date)
    || holidays.has(w === 6 ? cta.addDays(date, 1) : cta.addDays(date, -1))));
  return [holiday && 'FERIE', holidayWeekend && 'WEEKEND_FERIE', eve && 'VEILLE_FERIE',
    bridges.has(date) && 'PONT_ASCENSION', vacation && 'VACANCES_SCOLAIRES'].filter(Boolean);
}

function calendarVerdict(row, flags, byId) {
  if (!day(row.startsAt)) return { decision: 'SANS_DATE', cause: '', group: '' };
  if (row.definitionId === 'CTA-PERMANENCE') return { decision: 'CONFORME_PAR_REGLE', cause: 'CTA_FERIE_FUSION', group: '' };
  if (row.calendarAdjustment?.rule === 'G1_LUNDI_FERIE_DEPLACE_MARDI')
    return { decision: 'CORRECTION_DETERMINISTE', cause: 'G1_LUNDI_FERIE', group: '' };
  if (!flags.length) return { decision: 'CONFORME_PAR_REGLE', cause: '', group: '' };
  if (flags.every((flag) => flag === 'VACANCES_SCOLAIRES'))
    return { decision: 'CONFORME_PAR_REGLE', cause: 'VACANCES_INFORMATION', group: '' };
  const instruction = L.qvDpsInstructionKind(row);
  if (instruction) {
    if (flags.includes('FERIE') || flags.includes('WEEKEND_FERIE'))
      return { decision: 'HUMAN_REVIEW_REEL', cause: flags.join('|'), group: 'INSTRUCTION_LOCALE' };
    if (flags.every((flag) => flag === 'VACANCES_SCOLAIRES'))
      return { decision: 'CONFORME_PAR_REGLE', cause: 'INSTRUCTION_VACANCES', group: '' };
  }
  if (row.label === L.QV_CONDUITE_LABEL && row.conduiteEvidence) {
    const source = byId.get(row.conduiteEvidence.sourceId);
    if (source && source.endsAt === row.startsAt
      && source.ois.includes(row.ois[0])
      && source.publics.includes(row.conduiteEvidence.halfSection)) {
      const sourceVerdict = calendarVerdict(source, flags, byId);
      if (sourceVerdict.group === 'INSTRUCTION_LOCALE') return sourceVerdict;
    }
  }
  if (row.label === L.QV_CONDUITE_LABEL && row.conduiteEvidence && flags.every((flag) => flag === 'VACANCES_SCOLAIRES')) {
    const source = byId.get(row.conduiteEvidence.sourceId);
    if (source && L.qvDpsInstructionKind(source))
      return { decision: 'CONFORME_PAR_REGLE', cause: 'CONDUITE_ADOSSEE_INSTRUCTION_VACANCES', group: '' };
  }
  return { decision: 'HUMAN_REVIEW_REEL', cause: flags.join('|'), group: 'AUTRE_EXCEPTION' };
}

function type2026(label) {
  const name = String(label || '');
  if (name === L.QV_CONDUITE_LABEL) return 'Conduite';
  const prefix = name.match(/^(Instr|Exercice|Formation|Cours|S[eé]ance|Permanence)\b/i)?.[1] || '';
  return prefix === 'Instr' ? 'Instruction' : prefix;
}

async function buildExtraction() {
  const workbook = readWorkbook(workbookPath);
  if (workbook.sha256 !== history.sha256) throw new Error('Le classeur 2026 a changé depuis le gate');
  const historical = workbook.rows.filter((row) => day(row.date).startsWith('2026-'));
  const sourceByLine = new Map(historical.map((row) => [row.sourceLine, row]));
  const qv = await createFixture(null).service.listProgramme(2027);
  const programme = qv.canonicalProgramme.rows.filter((row) => !row.external);
  const byId = new Map(programme.map((row) => [row.id, row]));
  const calendar = qv.calendarDays.filter((row) => row.jour <= '2027-12-31'
    && (row.metadata?.dateFin || row.jour) >= '2027-01-01');
  const expanded = L.qvExpandCalendarDays(calendar);
  const holidays = new Set(calendar.filter((row) => row.typeJour === 'FERIE').map((row) => row.jour));
  const bridges = new Set(calendar.filter((row) => row.typeJour === 'NEUTRALISATION_INTERNE').map((row) => row.jour));
  const oldReviews = new Map(gate.calendarReview2027.map((row) => [row.identifiant, row]));
  const overview = new Map();
  const key = (oi, label) => `${oi}|${norm(label)}`;
  const addSummary = (oi, label, year, row, source) => {
    const id = key(oi, label);
    let item = overview.get(id);
    if (!item) {
      item = { OI: oi, Domaine: '', Famille: '', Type: '', Activité: label,
        'Occurrences 2026': 0, 'Occurrences 2027': 0, Écart: 0, Sessions: 0,
        'Stat.Com': '', Classification: '', Commentaire: '' };
      overview.set(id, item);
    }
    item[`Occurrences ${year}`] += 1;
    if (year === 2027 || !item.Domaine) {
      item.Domaine = year === 2027 ? (L.qvProgrammeFunctionalDomain(row, source || null) || row.domain || '')
        : row.domainF7 || row.domain || '';
      item.Famille = year === 2027 ? L.qvProgrammeFilterFamily(row) : row.subDomain || '';
      item.Type = year === 2027 ? L.qvProgrammeFilterType(row) : type2026(row.title);
      item['Stat.Com'] = row.statCom || '';
    }
    if (year === 2027) item.Sessions += 1;
  };
  for (const row of historical) for (const oi of asOis({ label: row.title, domain: row.domain, ois: row.ois }).length
    ? asOis({ label: row.title, domain: row.domain, ois: row.ois }) : ['OI_NON_DOCUMENTE_2026'])
    addSummary(oi, row.title, 2026, row);

  const detail = [];
  const reviews = [];
  const decisions = new Map();
  for (const row of programme) {
    const line = row.historicalProposal?.sourceLine;
    const source = sourceByLine.get(line);
    const flags = calendarConstraint(row.startsAt, expanded, holidays, bridges);
    const verdict = calendarVerdict(row, flags, byId);
    decisions.set(row.id, { flags, ...verdict });
    const ois = asOis(row);
    const classification = row.definitionId === 'CTA-PERMANENCE' ? 'RÈGLE MOA CTA'
      : row.label === L.QV_CONDUITE_LABEL ? 'RÈGLE MOA CONDUITE'
        : row.label === 'Formation groupée 1.1' && !row.startsAt ? 'STRUCTURE MOA À TRANCHER'
          : source && norm(source.title) === norm(row.label) ? 'SOURCE 2026 LIÉE'
            : line ? 'LIEN SOURCE À CONTRÔLER' : 'RÈGLE 2027 / NON APPARIÉ';
    for (const oi of ois.length ? ois : ['OI_NON_DOCUMENTE_2027']) {
      addSummary(oi, row.label, 2027, row, source);
      detail.push({ Occurrence: row.id, Activité: row.label, Domaine: L.qvProgrammeFunctionalDomain(row, source || null) || row.domain || '',
        Famille: L.qvProgrammeFilterFamily(row), Type: L.qvProgrammeFilterType(row), 'Stat.Com': row.statCom || '', OI: oi,
        Public: (row.publics || []).join(', '), Date: day(row.startsAt), Jour: row.startsAt ? days[weekday(row.startsAt)] : '',
        Horaire: row.startsAt ? `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt).slice(11, 16)}` : '',
        Lieu: row.location || '', Responsable: row.responsible || '', Sessions: row.sessionLabel || row.sessionId || '',
        État: row.status || '', 'Multi-OI': ois.length > 1 ? 'OUI' : 'NON',
        'Contrainte calendrier': flags.join('|'), Décision: verdict.decision,
        Commentaire: [classification, source && `2026 ligne ${line}`, verdict.cause].filter(Boolean).join(' ; ') });
    }
    if (verdict.decision === 'HUMAN_REVIEW_REEL') {
      const matchingHolidays = [...holidays].filter((date) => date === day(row.startsAt)
        || cta.addDays(date, -1) === day(row.startsAt) || (flags.includes('WEEKEND_FERIE')
          && Math.abs((new Date(date) - new Date(day(row.startsAt))) / 86400000) <= 2));
      reviews.push({ Groupe: verdict.group, Date: day(row.startsAt), Jour: days[weekday(row.startsAt)],
        Férié: matchingHolidays.map((date) => `${date} ${calendar.find((item) => item.jour === date)?.libelle || ''}`).join(', '),
        Site: ois.map((oi) => oi.split(':').pop()).join(', '), OI: ois.join(', '),
        'Section/demi-section': (row.publics || []).filter((value) => /^N\d\d[a-b]?$/.test(value)).join(', '),
        Activité: row.label, Horaire: row.startsAt ? `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt).slice(11, 16)}` : '',
        Conflit: verdict.cause, Décision: 'À_DÉCIDER', Occurrence: row.id,
        'Preuve 2026': source ? `ligne ${line}` : '' });
    }
  }
  const summary = [...overview.values()].map((row) => ({ ...row, Écart: row['Occurrences 2027'] - row['Occurrences 2026'],
    Classification: row['Occurrences 2026'] && row['Occurrences 2027'] ? 'TITRE PRÉSENT DEUX ANNÉES'
      : row['Occurrences 2027'] ? 'SANS TITRE IDENTIQUE 2026' : 'SANS TITRE IDENTIQUE 2027',
    Commentaire: 'Comparaison par titre et OI ; un écart ne prouve pas une disparition.' }))
    .sort((a, b) => a.OI.localeCompare(b.OI) || a.Activité.localeCompare(b.Activité));
  reviews.sort((a, b) => a.Groupe.localeCompare(b.Groupe) || a.Date.localeCompare(b.Date) || a.OI.localeCompare(b.OI));
  const old70 = gate.calendarReview2027.filter((row) => !row.motif.includes('CONDUITE_APRES_INSTRUCTION_VACANCES')
    && !row.motif.includes('CTA_FENETRE_FERIEE') && !row.motif.includes('_INSTR_'));
  const old70Breakdown = { conformes: 0, corrections: 0, exceptions: 0, humanReview: 0, localReview: 0, absent: 0 };
  for (const old of old70) {
    const verdict = decisions.get(old.identifiant);
    if (!verdict) old70Breakdown.absent++;
    else if (verdict.decision === 'CONFORME_PAR_REGLE') old70Breakdown.conformes++;
    else if (verdict.decision === 'CORRECTION_DETERMINISTE') old70Breakdown.corrections++;
    else if (verdict.decision === 'EXCEPTION_METIER_DEJA_DOCUMENTEE') old70Breakdown.exceptions++;
    else if (verdict.group === 'INSTRUCTION_LOCALE') old70Breakdown.localReview++;
    else old70Breakdown.humanReview++;
  }
  const multiOi = programme.filter((row) => asOis(row).length > 1);
  const data = { workbookSha256: workbook.sha256, counts: {
    programmeBefore: gate.programmePhysicalRows, programmeAfter: programme.length,
    undatedBefore: gate.programmePhysicalRows - gate.dated2027,
    undatedAfter: programme.filter((row) => !row.startsAt).length,
    focaRemoved: 6, oldCalendarAlerts: gate.calendarReview2027.length,
    old70: old70.length, old70Breakdown,
    calendarReview: reviews.length,
    instructionLocalReview: reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE'
      && L.qvDpsInstructionKind(byId.get(row.Occurrence))).length,
    localManualReview: reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE').length,
    blockingHumanReview: reviews.filter((row) => row.Groupe === 'AUTRE_EXCEPTION').length,
    ctaBefore: gate.calendarReview2027.filter((row) => row.motif.includes('CTA_FENETRE_FERIEE')).length,
    ctaAfter: programme.filter((row) => row.definitionId === 'CTA-PERMANENCE'
      && !Array.isArray(row.ctaHolidayWindows)).length,
    conduitesDps: programme.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7').length,
    conduitesDap: programme.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '01522F7').length,
    multiOiPhysical: multiOi.length, multiOiAssociations: multiOi.reduce((sum, row) => sum + asOis(row).length, 0),
    oiAssociations: programme.reduce((sum, row) => sum + asOis(row).length, 0)
  }, summary, detail, reviews, differences: [
    { Écart: 'FOCA', Avant: '6 occurrences sans date', Après: '0', Preuve: 'Décision MOA du présent lot' },
    { Écart: 'Formation groupée 1.x', Avant: '6 x 1.1 sans date', Après: '6 x 1.1 sans date', Preuve: 'Classeur 2026 lignes 309, 347, 350, 389, 421, 433 : 1.1 à 1.6 distinctes ; structure 2027 non prouvée' },
    { Écart: 'Stat.Com projeté', Avant: '80 divergences de titre brut', Après: '0 divergence canonique prouvée', Preuve: 'Résolution par Stat.Com source, date et OI ; deux écarts bruts expliqués séparément' },
    { Écart: 'Photo DAP Y3', Avant: 'source Y2 ligne 593', Après: 'source Y3 ligne 719', Preuve: 'Classeur 2026 ligne 719' },
    { Écart: 'Formation cadres DAP', Avant: 'sources exercice DAP 1/2 lignes 9/83', Après: 'sources exactes lignes 72/152', Preuve: 'Classeur 2026 lignes 72 et 152' },
    { Écart: 'CTA Ascension', Avant: 'pas de plage physique isolée', Après: '2027-05-05 18:00 au 2027-05-07 06:00', Preuve: 'Règle MOA veille 18h-lendemain 06h ; pas de chevauchement' },
    { Écart: 'Calendrier SQL', Avant: 'non certifié', Après: 'écart persisté constaté', Preuve: 'SELECT seul : vacances Ascension 2027-05-06 au 2027-05-09 absentes' }
  ] };
  return data;
}

if (require.main === module) buildExtraction().then((data) => {
  const output = path.resolve(__dirname, '../outputs/qv-2027-final');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'SCOPE_QV_2027_CONTROLE_MOA_PAR_OI.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(JSON.stringify(data.counts, null, 2));
}).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

module.exports = { buildExtraction, calendarConstraint, calendarVerdict };

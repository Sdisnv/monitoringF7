'use strict';
/** SCOPE-REPORT-1 — acquisition et normalisation. Aucun recalcul de taux. */

const { DOMAINES_MODEL_2, SOUS_DOMAINES } = require('./_scope-schema');
const { parsePeriod } = require('./_scope-period');
const { HttpError, round1 } = require('./_scope-rules');
const { KINDS } = require('./_scope-analytics');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { createScopeDashboardService } = require('./_scope-dashboard-service');
const { createScopeService } = require('./_scope-service');
const { ROOT_DOMAINES } = require('./_scope-graphs');
const { displayDomaineCode } = require('./_scope-model');
const { collectMultisessionReport } = require('./_scope-multisession-report');
const { createScopeJspReportingService, createScopeParticipationReportingService } = require('./_scope-jsp-reporting');
const { createScopeCycleService } = require('./_scope-cycle-service');
const MultiSessionV2 = require('./_scope-multisession-v2');
const PersonnelRefs = require('../../assets/js/scope-personnel-referentials');
const UiLogic = require('../../assets/js/scope-ui-logic');

const ENC_GROUP_ORDER = Object.freeze(['FORMATEUR', 'SURVEILLANT', 'MONITEUR', 'AUXILIAIRE']);
const DOMAIN_PERIOD_OI = Object.freeze({
  DPS: ['G1', 'C1', 'B1', 'B2'],
  DAP: ['Y1', 'Y2', 'Y3', 'Y4'],
  JSP: ['G1', 'C1', 'B1']
});

function reportGradeRank(grade){
  const code = PersonnelRefs.canonicalGradeCode(grade);
  const row = (PersonnelRefs.GRADES || []).find((item) => item.code === code);
  return row ? Number(row.rang) : -1;
}

function comparePersonName(a, b){
  return `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr', { sensitivity: 'base' });
}

function sortByGradeThenName(a, b){
  const gradeDelta = reportGradeRank(b.grade) - reportGradeRank(a.grade);
  if (gradeDelta) return gradeDelta;
  return comparePersonName(a, b);
}

function roleGroupRank(role){
  const idx = ENC_GROUP_ORDER.indexOf(String(role || '').toUpperCase());
  return idx >= 0 ? idx : 99;
}

function exerciseReportTitle(event){
  const libelle = String((event && event.libelle) || '').replace(/\s+/g, ' ').trim();
  const core = libelle || 'Exercice';
  return `RAPPORT — ${core.toLocaleUpperCase('fr-CH')}`;
}

const REPORT_KINDS = Object.freeze(['PERIOD', 'DOMAIN', 'TARGET', 'EVENT', 'PERSON', 'SESSION', 'JSP', 'PARTICIPATION', 'FORMATION', 'CYCLE']);

const STATUT_LABELS = Object.freeze({
  PRESENT: 'Présent',
  ABSENT_EXCUSE: 'Excusé',
  ABSENT_NON_EXCUSE: 'Non excusé',
  DISPENSE: 'Dispensé',
  PERMUTATION: 'Permutation',
  NON_RENSEIGNE: 'Non renseigné',
  NON_CONCERNE: 'Non concerné',
  PLANIFIE: 'Planifié',
  REALISE: 'Réalisé',
  REPORTE: 'Reporté',
  ANNULE: 'Annulé'
});

const MOTIF_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident / maladie',
  ACTIVITE_SCOLAIRE: 'Activité scolaire',
  ACTIVITE_EXTRA_SCOLAIRE: 'Activité extra-scolaire',
  OUBLI: 'Oubli',
  NON_JUSTIFIE: 'Non justifié',
  NON_PRECISE: 'Non précisé (historique)',
  MALADIE: 'Maladie (historique)',
  ACCIDENT: 'Accident (historique)',
  AUTRE: 'Autre (historique)',
  FORMATEUR_PR: 'Formateur PR',
  FORMATION_HORS_SDIS: 'Formation hors SDIS',
  JOKER: 'Joker',
  AUTO_RETRAIT: 'Auto-retrait',
  DEMISSION_EN_COURS: 'Démission en cours',
  NON_CONCERNE: 'Non concerné',
  PAS_CONCERNE: 'Non concerné'
});

const ROLE_LABELS = Object.freeze({
  FORMATEUR: 'Formateur',
  MONITEUR: 'Moniteur',
  SURVEILLANT: 'Surveillant',
  AUXILIAIRE: 'Auxiliaire',
  RENFORT: 'Renfort',
  REMPLACANT: 'Remplaçant'
});

const MODE_LABELS = Object.freeze({
  NOMINATIF: 'Nominatif',
  QUANTITATIF: 'Quantitatif',
  LEGACY: 'Historique agrégé (LEGACY)'
});

function normalizeKind(raw){
  const text = String(raw || '').toUpperCase();
  const map = {
    PERIOD: 'PERIOD', PERIODE: 'PERIOD', SDIS: 'PERIOD',
    DOMAIN: 'DOMAIN', DOMAINE: 'DOMAIN',
    TARGET: 'TARGET', CIBLE: 'TARGET', OI: 'TARGET',
    EVENT: 'EVENT', EVENEMENT: 'EVENT', EXERCICE: 'EVENT',
    PERSON: 'PERSON', PERSONNE: 'PERSON', FICHE: 'PERSON',
    SESSION: 'SESSION', MULTISESSION: 'SESSION',
    DETAIL: 'SESSION', EXERCISE_DETAIL: 'SESSION', RAPPORT_DETAILLE: 'SESSION',
    JSP: 'JSP', RAPPORT_JSP: 'JSP', JSP_REPORT: 'JSP',
    PARTICIPATION: 'PARTICIPATION', RAPPORT_PARTICIPATION: 'PARTICIPATION',
    FORMATION: 'FORMATION', RAPPORT_FORMATION: 'FORMATION',
    CYCLE: 'CYCLE', RAPPORT_CYCLE: 'CYCLE'
  };
  const kind = map[text];
  if(!kind) throw new HttpError(400, 'type_rapport_invalide', 'Type de rapport inconnu.');
  return kind;
}

function domaineLabel(code){
  const canon = displayDomaineCode(code);
  if(!canon) return '';
  if(canon === 'PR') return 'PR';
  const meta = DOMAINES_MODEL_2[canon] || DOMAINES_MODEL_2[code];
  if(!meta) return canon;
  const affiche = meta.libelleAffiche || meta.libelle || canon;
  return String(affiche).toUpperCase() === 'PAPR' ? 'PR' : affiche;
}

function perimeterTitle(kind, { domaine, cible, event }){
  if(kind === 'PERIOD') return 'SDIS régional du Nord vaudois';
  if(kind === 'EVENT' && event){
    const bits = [domaineLabel(event.domaine_code), ...(event.cibles || []).map((c) => c.niveau_code || c.niveauCode)];
    return [event.libelle, bits.filter(Boolean).join(' / ')].filter(Boolean).join(' — ');
  }
  if(domaine && DOMAINES_MODEL_2[domaine] && DOMAINES_MODEL_2[domaine].parentCode){
    return `${domaineLabel(DOMAINES_MODEL_2[domaine].parentCode)} / ${domaineLabel(domaine)}${cible ? ` / ${cible}` : ''}`;
  }
  return [domaineLabel(domaine), cible].filter(Boolean).join(' / ') || 'SCOPE';
}

function periodSlug(period){
  if(!period) return '';
  if(period.preset === 'YEAR') return String(period.from).slice(0, 4);
  if(period.preset === 'MONTH') return String(period.from).slice(0, 7);
  if(period.preset === 'QUARTER'){
    const m = Number(String(period.from).slice(5, 7));
    return `${String(period.from).slice(0, 4)}-T${Math.ceil(m / 3)}`;
  }
  return `${period.from}_${period.to}`;
}

function sanitizeFilename(name){
  const cleaned = String(name || 'SCOPE Rapport')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || 'SCOPE Rapport'}.pdf`;
}

function cleanFilenamePart(value, fallback){
  return String(value || fallback || '')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dateFilenamePrefix(date, fallbackYear){
  const d = String(date || '');
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[1]} ${m[3]}-${m[2]}`;
  const year = String(fallbackYear || d || '').slice(0, 4);
  return year || 'SCOPE';
}

function buildFilename(kind, ctx){
  const year = ctx.period ? periodSlug(ctx.period) : '';
  if(kind === 'PERIOD') return sanitizeFilename(`SCOPE_Rapport_SDIS_${year}.pdf`);
  if(kind === 'DOMAIN') return sanitizeFilename(`SCOPE_${ctx.domaine}_${year}.pdf`);
  if(kind === 'TARGET') return sanitizeFilename(`SCOPE_${ctx.domaine}_${ctx.cible}_${year}.pdf`);
  if(kind === 'PERSON') return sanitizeFilename(`SCOPE_Fiche_${ctx.nip || 'personne'}_${year}.pdf`);
  if(kind === 'SESSION'){
    if(ctx.eventDate || ctx.eventLabel){
      return sanitizeFilename(`${dateFilenamePrefix(ctx.eventDate, ctx.year)} - ${cleanFilenamePart(ctx.domaine, 'SCOPE')} - ${cleanFilenamePart(ctx.eventLabel || ctx.exerciseLabel, 'Événement')} - Rapport de présence.pdf`);
    }
    const year = String((ctx.period && ctx.period.from) || ctx.year || '').slice(0, 4);
    const slug = String(ctx.exerciseLabel || '').replace(/^PR\s+/i, '').replace(/\s+/g, '_');
    return sanitizeFilename(`SCOPE_Rapport_participation_${ctx.domaine || 'SCOPE'}_${slug}_${year}.pdf`);
  }
  if(kind === 'MULTI_SESSION_V2'){
    const y = String((ctx.period && ctx.period.from) || ctx.year || '').slice(0, 4);
    return sanitizeFilename(`${y || 'SCOPE'} - ${cleanFilenamePart(ctx.domaine, 'SCOPE')} - ${cleanFilenamePart(ctx.eventLabel, 'Multi-session')} - Rapport de présence Multi-session.pdf`);
  }
  if(kind === 'CYCLE'){
    const y = String((ctx.period && ctx.period.from) || ctx.year || '').slice(0, 4) || 'SCOPE';
    const suffix = ctx.engine === 'MULTI_SESSION_V2' ? 'Rapport Multi-session' : 'Rapport de cycle';
    return sanitizeFilename(`${y} - ${cleanFilenamePart(ctx.domaine, 'SCOPE')} - ${cleanFilenamePart(ctx.eventLabel || ctx.cycleLabel, 'Cycle')} - ${suffix}.pdf`);
  }
  const date = ctx.eventDate || '';
  const label = ctx.eventLabel || ctx.cible || 'Événement';
  return sanitizeFilename(`${dateFilenamePrefix(date, year)} - ${cleanFilenamePart(ctx.domaine, 'SCOPE')} - ${cleanFilenamePart(label, 'Événement')} - Rapport de présence.pdf`);
}

function domainPeriodOiRows(dash, domaine){
  const code = displayDomaineCode(domaine);
  const order = DOMAIN_PERIOD_OI[code] || [];
  const rows = (dash.cibles || [])
    .filter((row) => row && row.officiel)
    .filter((row) => !order.length || order.includes(String(row.niveauCode || row.niveau_code || '')))
    .map((row) => ({
      id: row.cibleId || row.cible_id || row.niveauCode,
      code: row.niveauCode || row.niveau_code || '',
      label: [code, row.niveauCode || row.niveau_code].filter(Boolean).join(' '),
      libelle: row.libelle || '',
      officiel: row.officiel
    }));
  if(!order.length) return rows;
  const byCode = new Map(rows.map((row) => [String(row.code), row]));
  return order.map((niveau) => byCode.get(niveau)).filter(Boolean);
}

function pickAlerts(alertsPayload){
  const items = (alertsPayload && alertsPayload.alerts) || [];
  const p0 = items.filter((a) => a.level === 'P0').slice(0, 8);
  const p1 = items.filter((a) => a.level === 'P1').slice(0, 6);
  return { p0, p1, p2: [] };
}

function nominativeRows(fiche){
  const { isValidSessionStatut } = require('./_scope-cycle-rules');
  const attendus = (fiche.attendus || []).filter((a) => a.inclus !== false);
  const parts = fiche.participations || [];
  const personnes = fiche.personnes || {};
  const cibles = fiche.cibles || [];
  const cibleById = Object.fromEntries(cibles.map((c) => [c.cible_id, c]));
  return attendus.map((a) => {
    const pid = a.personne_id;
    const person = personnes[pid] || {};
    const part = parts.find((p) => String(p.personne_id) === String(pid)) || {};
    const cible = cibleById[a.cible_id] || {};
    const statut = part.statut || 'NON_RENSEIGNE';
    const role = String(part.role || 'PARTICIPANT').toUpperCase();
    if(!isValidSessionStatut(statut)) return null;
    const catchupSource = UiLogic.permutationCatchupSourceLabel ? UiLogic.permutationCatchupSourceLabel(a) : '';
    const permutationInfo = statut === 'PERMUTATION' && UiLogic.informationMotifLabel
      ? UiLogic.informationMotifLabel(Object.assign({}, a, part, {
        motifInclusion: a.motif_inclusion || a.motifInclusion || null,
        motif_inclusion: a.motif_inclusion || a.motifInclusion || null
      }))
      : '';
    return {
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      nip: person.nip || '',
      oi: cible.niveau_code || '',
      cible: catchupSource ? 'Rattrapage' : (cible.libelle || cible.niveau_code || ''),
      statut,
      statutLabel: STATUT_LABELS[part.statut] || part.statut || 'Non renseigné',
      motif: part.motif_absence || null,
      motifLabel: catchupSource ? catchupSource : (permutationInfo || (part.motif_absence ? (MOTIF_LABELS[part.motif_absence] || part.motif_absence) : '')),
      motifInclusion: a.motif_inclusion || null,
      motif_inclusion: a.motif_inclusion || null,
      role,
      roleLabel: role !== 'PARTICIPANT' ? (ROLE_LABELS[role] || role) : '',
      permutation: part.statut === 'PERMUTATION'
    };
  }).filter(Boolean).sort(sortByGradeThenName);
}

function encadrementRows(fiche){
  const personnes = fiche.personnes || {};
  return (fiche.encadrement || []).map((p) => {
    const person = personnes[p.personne_id] || {};
    return {
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      nip: person.nip || '',
      role: p.role
    };
  }).sort((a, b) => {
    const roleDelta = roleGroupRank(a.role) - roleGroupRank(b.role);
    if (roleDelta) return roleDelta;
    return sortByGradeThenName(a, b);
  });
}

function multiSessionV2NominativeRows(fiche){
  const state = fiche.multiSessionV2 || {};
  const byPerson = state.byPersonneId || {};
  const personnes = fiche.personnes || {};
  const cibles = fiche.cibles || [];
  const cibleById = Object.fromEntries(cibles.map((c) => [c.cible_id, c]));
  return (fiche.attendus || [])
    .filter((row) => row && row.inclus !== false && byPerson[String(row.personne_id || row.personneId)])
    .map((row) => {
      const pid = String(row.personne_id || row.personneId || '');
      const person = personnes[pid] || {};
      const targetState = byPerson[pid] || {};
      const cible = cibleById[row.cible_id] || {};
      const statut = targetState.finalStatus || 'NON_RENSEIGNE';
      return {
        grade: person.grade || row.grade || '',
        nom: person.nom || row.nom || '',
        prenom: person.prenom || row.prenom || '',
        nip: person.nip || row.nip || '',
        oi: cible.niveau_code || row.cible || '',
        cible: cible.libelle || cible.niveau_code || row.cible || '',
        statut,
        statutLabel: STATUT_LABELS[statut] || statut,
        motif: targetState.countedMotif || null,
        motifLabel: targetState.finalMotif ? (MOTIF_LABELS[targetState.finalMotif] || targetState.finalMotif) : '',
        role: targetState.countedRole || 'PARTICIPANT',
        roleLabel: targetState.countedRole && targetState.countedRole !== 'PARTICIPANT' ? (ROLE_LABELS[targetState.countedRole] || targetState.countedRole) : '',
        finalEventId: targetState.finalEventId || targetState.countedEventId || null
      };
    })
    .sort(sortByGradeThenName);
}

function multiSessionV2SessionReportModel(fiche, includeNominatif){
  const state = fiche.multiSessionV2 || {};
  if(!state || state.engine !== MultiSessionV2.ENGINE.MULTI_SESSION_V2) return null;
  const event = fiche.evenement || {};
  const eventIdText = String(event.evenement_id || event.evenementId || event.id || '');
  const sessions = state.sessions || [];
  const index = Math.max(1, Number(state.currentSessionIndex || 0) || (sessions.findIndex((row) => String(row.evenement_id || row.event_id || '') === eventIdText) + 1));
  const count = Number(state.sessionCount || sessions.length || 1);
  const currentSession = sessions.find((row) => String(row.evenement_id || row.event_id || '') === eventIdText) || event;
  const allRows = nominativeRows(fiche).filter((row) => row && ['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'].includes(String(row.statut || '').toUpperCase()));
  const uniquePeople = new Set(allRows.map((row) => row.nip || `${row.nom}|${row.prenom}`).filter(Boolean));
  const encadrement = encadrementRows(fiche);
  const countStatus = (status) => allRows.filter((row) => String(row.statut || '').toUpperCase() === status).length;
  const presents = countStatus('PRESENT') + countStatus('PERMUTATION');
  const excuses = countStatus('ABSENT_EXCUSE');
  const nonExcuses = countStatus('ABSENT_NON_EXCUSE');
  const dispenses = countStatus('DISPENSE');
  const population = Number(state.statistics && state.statistics.population || state.kpis && state.kpis.population || 0);
  const nonRenseignes = Math.max(0, population - uniquePeople.size);
  const domaine = displayDomaineCode(event.domaine_code || event.domaine || state.multisession && state.multisession.domain);
  const label = event.libelle || currentSession.libelle || 'Session Multi-session';
  const sessionLabel = `Session ${index}/${count}`;
  const period = { from: event.date || currentSession.date, to: event.date || currentSession.date, preset: 'CUSTOM' };
  return {
    kind: 'SESSION',
    period,
    domaine,
    cible: null,
    title: `RAPPORT DE PRÉSENCE — ${String(label).toLocaleUpperCase('fr-CH')}`,
    subtitle: `Multi-session · ${sessionLabel}`,
    summaryLabel: 'Synthèse de présence',
    filename: buildFilename('SESSION', {
      period,
      domaine,
      eventLabel: label,
      eventDate: event.date || currentSession.date
    }),
    event: {
      id: eventIdText,
      date: event.date || currentSession.date,
      libelle: label,
      domaine,
      statut: event.statut,
      statutLabel: STATUT_LABELS[event.statut] || event.statut || '—',
      cibles: (fiche.cibles || []).map((c) => ({ code: c.niveau_code, libelle: c.libelle }))
    },
    multiSessionV2Session: true,
    multisessionLabel: state.label || state.multisession && state.multisession.label || 'Multi-session',
    sessionIndex: index,
    sessionCount: count,
    sessionLabel,
    population,
    sessionSummary: {
      presents,
      excuses,
      nonExcuses,
      dispenses,
      encadrement: encadrement.length,
      nonRenseignes
    },
    nominatif: includeNominatif ? allRows : [],
    encadrement: includeNominatif ? encadrement : [],
    officiel: {
      percentage: null,
      numerator: presents,
      denominator: null,
      volumes: { presents, excuses, nonExcuses, dispenses, nonRenseignes }
    },
    graphs: {},
    explain: null,
    quantitative: false,
    isLegacy: false,
    alerts: { p0: [], p1: [], p2: [] },
    events: []
  };
}

function multiSessionV2EventRows(state){
  return (state.sessions || []).map((session) => ({
    date: session.date,
    libelle: session.libelle,
    site: MultiSessionV2.sessionLabel(session),
    expected: state.kpis && state.kpis.population,
    present: '',
    excused: '',
    absent: '',
    dispensed: '',
    nonRenseigne: '',
    presenceRate: null
  }));
}

function multiSessionV2Graphs(state, nominatif){
  const totalAcquired = Math.max(1, Number(state.statistics && state.statistics.presents || 0));
  const acquiredByEvent = new Map();
  (nominatif || []).forEach((row) => {
    if(row.statut !== 'PRESENT' || !row.finalEventId) return;
    acquiredByEvent.set(String(row.finalEventId), (acquiredByEvent.get(String(row.finalEventId)) || 0) + 1);
  });
  const sessionPoints = (state.sessions || []).map((session, index) => {
    const count = acquiredByEvent.get(String(session.evenement_id || session.event_id || '')) || 0;
    const tokens = ['primary', 'secondary', 'warning', 'neutral'];
    return {
      label: MultiSessionV2.sessionLabel(session, `Session ${index + 1}`),
      token: tokens[index % tokens.length],
      value: Math.round((1000 * count) / totalAcquired) / 10,
      numerator: count,
      denominator: totalAcquired
    };
  });
  const stats = state.statistics || {};
  const repartitionPoints = [
    { label: 'Présents', value: Number(stats.presents || 0), token: 'primary' },
    { label: 'Excusés', value: Number(stats.excuses || 0), token: 'secondary' },
    { label: 'Absents', value: Number(stats.nonExcuses || 0), token: 'warning' },
    { label: 'Dispensés', value: Number(stats.dispenses || 0), token: 'neutral' }
  ].filter((row) => row.value > 0);
  const motifCounts = new Map();
  (nominatif || []).forEach((row) => {
    if(row.statut !== 'ABSENT_EXCUSE') return;
    const label = row.motifLabel || 'Non précisé';
    motifCounts.set(label, (motifCounts.get(label) || 0) + 1);
  });
  const motifPoints = [...motifCounts.entries()].map(([label, value]) => ({ label, value, token: 'warning' }));
  return {
    sessions: {
      type: 'bar',
      question: 'Répartition des participations acquises par session',
      series: [{ id: 'sessions', points: sessionPoints }]
    },
    repartition: {
      type: 'donut',
      question: 'Répartition des statuts finaux',
      series: [{ id: 'statuts', points: repartitionPoints }]
    },
    motifs: motifPoints.length ? {
      type: 'bar',
      question: 'Motifs des excuses',
      series: [{ id: 'motifs', points: motifPoints.map((row) => Object.assign({}, row, {
        value: Math.round((1000 * row.value) / Math.max(1, motifPoints.reduce((sum, item) => sum + item.value, 0))) / 10,
        numerator: row.value,
        denominator: motifPoints.reduce((sum, item) => sum + item.value, 0)
      })) }]
    } : null
  };
}

function cycleStatusLabel(code){
  const value = String(code || '').toUpperCase();
  if(value === 'TERMINE' || value === 'REALISE') return 'Terminé';
  if(value === 'A_FINALISER') return 'À finaliser';
  if(value === 'EN_COURS') return 'En cours';
  if(value === 'ANNULE') return 'Annulé';
  if(value === 'PLANIFIE') return 'Planifié';
  return value || '—';
}

function cycleTypeLabel(cycle){
  const type = String(cycle && cycle.type_cycle || '').toUpperCase();
  const domain = displayDomaineCode(cycle && cycle.domaine_code);
  if(type === 'MULTI_SESSION') return 'Formation Multi-session';
  if(domain === 'AUTO') return 'Cycle AUTO';
  if(domain === 'PR') return 'Cycle PR';
  return type ? `Cycle ${type}` : 'Cycle';
}

function cyclePilotageStateLabel(code){
  const value = String(code || '').toUpperCase();
  if(value === 'COMPLET') return 'Obligation satisfaite';
  if(value === 'INCOMPLET') return 'À traiter';
  if(value === 'DISPENSE') return 'Dispensé';
  if(value === 'EXCUSE') return 'Excusé';
  if(value === 'REALISE') return 'Réalisé';
  if(value === 'ABSENT') return 'Absent';
  if(value === 'A_RENSEIGNER') return 'À renseigner';
  if(value === 'ENCADREMENT') return 'Encadrement';
  if(value === 'HORS_POPULATION') return 'Hors population';
  if(value === 'NON_CONCERNE') return 'Non concerné';
  return value || '—';
}

function cycleRoleLabel(role){
  const code = String(role || '').toUpperCase();
  if(code === 'FORMATEUR') return 'Formateur';
  if(code === 'MONITEUR') return 'Moniteur';
  if(code === 'SURVEILLANT') return 'Surveillant';
  if(code === 'AUXILIAIRE') return 'Auxiliaire';
  if(code === 'PARTICIPANT') return 'Participant';
  return code || '—';
}

function cycleGraphs(detail){
  const kpis = (detail.pilotage && detail.pilotage.kpis) || {};
  const population = Math.max(1, Number(kpis.population || 0));
  const statePoints = [
    { label: 'Obligations satisfaites', count: Number(kpis.realised || 0), token: 'primary' },
    { label: 'Excusés', count: Number(kpis.excused || 0), token: 'secondary' },
    { label: 'Dispensés', count: Number(kpis.dispensed || 0), token: 'warning' },
    { label: 'À traiter', count: Number(kpis.resteATraiter || kpis.incomplete || 0), token: 'neutral' }
  ].filter((row) => row.count > 0);
  const sessions = (detail.evenements || []).map((event, index) => {
    const rows = ((detail.pilotage && detail.pilotage.individualRows) || []).filter((row) => row.isPopulation && String(row.primaryEventId || '') === String(event.evenement_id || event.event_id || ''));
    const tokens = ['primary', 'secondary', 'warning', 'neutral'];
    return {
      label: event.libelle || `Session ${index + 1}`,
      token: tokens[index % tokens.length],
      value: Math.round((1000 * rows.length) / population) / 10,
      numerator: rows.length,
      denominator: population
    };
  }).filter((row) => row.numerator > 0);
  return {
    repartition: statePoints.length ? {
      type: 'donut',
      question: 'Répartition des états consolidés',
      series: [{ id: 'etats', points: statePoints.map((row) => ({ label: row.label, value: row.count, token: row.token })) }]
    } : null,
    sessions: sessions.length ? {
      type: 'bar',
      question: 'Obligations satisfaites par session',
      series: [{ id: 'sessions', points: sessions }]
    } : null
  };
}

function cycleReportRows(rows){
  return (rows || []).slice().sort(sortByGradeThenName).map((row) => ({
    grade: row.grade || '',
    nom: row.nom || '',
    prenom: row.prenom || '',
    nip: row.nip || '',
    roles: (row.roles || []).map(cycleRoleLabel).join(', ') || '—',
    etat: cyclePilotageStateLabel(row.globalState),
    progression: row.progressionPct == null ? '—' : `${String(row.progressionPct).replace('.', ',')} %`,
    resultat: row.primaryResultLabel || '—',
    information: (row.obligations || [])
      .filter((cell) => cell && cell.status && cell.status !== 'NON_CONCERNE')
      .map((cell) => [cell.label, cyclePilotageStateLabel(cell.status), MOTIF_LABELS[cell.motif] || cell.motif].filter(Boolean).join(' · '))
      .join(' | ') || '—'
  }));
}

async function multiSessionV2ReportModel(repo, fiche, query, includeNominatif){
  const state = fiche.multiSessionV2;
  if(!state || state.engine !== MultiSessionV2.ENGINE.MULTI_SESSION_V2) return null;
  const multisession = state.multisession || {};
  if(String(multisession.status || '').toUpperCase() !== 'CLOTUREE'){
    throw new HttpError(422, 'rapport_multisession_v2_non_cloture', 'Le rapport consolidé sera disponible après clôture du Multi-session.');
  }
  const firstSession = (state.sessions || [])[0] || fiche.evenement;
  const lastSession = (state.sessions || [])[Math.max(0, (state.sessions || []).length - 1)] || fiche.evenement;
  const period = {
    from: firstSession.date || fiche.evenement.date,
    to: lastSession.date || fiche.evenement.date,
    preset: 'CUSTOM'
  };
  const stats = state.statistics || {};
  const cibles = fiche.cibles || [];
  const nominatif = multiSessionV2NominativeRows(fiche);
  const graphs = multiSessionV2Graphs(state, nominatif);
  const excuses = nominatif.filter((row) => row.statut === 'ABSENT_EXCUSE');
  const absents = nominatif.filter((row) => row.statut === 'ABSENT_NON_EXCUSE');
  const domaine = displayDomaineCode(multisession.domain || fiche.evenement.domaine_code);
  const { resolveObjective } = require('./_scope-objectives');
  const objectives = typeof repo.listObjectifs === 'function' ? await repo.listObjectifs({ actif: true }) : [];
  const objective = resolveObjective({
    date: lastSession.date || fiche.evenement.date,
    domaineCode: domaine,
    analysisGrain: 'DOMAINE',
    objectives
  });
  const objectiveThreshold = objective && Number.isFinite(Number(objective.thresholdPct)) ? Number(objective.thresholdPct) : null;
  const gapPct = objectiveThreshold == null || stats.percentage == null ? null : round1(Number(stats.percentage) - objectiveThreshold);
  return {
    kind: 'EVENT',
    period,
    domaine,
    cible: cibles[0] && cibles[0].niveau_code,
    title: `RAPPORT — ${String(state.label || multisession.label || 'MULTI-SESSION').toLocaleUpperCase('fr-CH')}`,
    subtitle: `Rapport Multi-session — ${String(period.from || '').slice(0, 4) || ''}`,
    filename: buildFilename('MULTI_SESSION_V2', {
      period,
      domaine,
      eventLabel: state.label || multisession.label || 'Multi-session'
    }),
    event: {
      id: state.multisessionId || multisession.multisession_id || fiche.evenement.evenement_id,
      date: period.from,
      libelle: state.label || multisession.label || 'Multi-session',
      domaine,
      sousDomaine: null,
      parentDomaine: null,
      specialization: '',
      cibles: cibles.map((c) => ({ code: c.niveau_code, libelle: c.libelle })),
      modeSuivi: 'NOMINATIF',
      statut: 'CLOTUREE',
      statutLabel: 'Clôturé',
      modeLabel: 'Nominatif · Multi-session',
      sectionEffectif: fiche.sectionEffectif == null ? null : fiche.sectionEffectif,
      rattrapages: { count: 0 }
    },
    officiel: {
      percentage: stats.percentage,
      numerator: stats.numerator,
      denominator: stats.denominator,
      presents: stats.presents,
      excuses: stats.excuses,
      nonExcuses: stats.nonExcuses,
      dispenses: stats.dispenses,
      officiel: true,
      kind: 'MULTI_SESSION_V2',
      volumes: {
        attendus: stats.population,
        presents: stats.presents,
        excuses: stats.excuses,
        nonExcuses: stats.nonExcuses,
        dispenses: stats.dispenses,
        nonRenseignes: 0,
        permutations: 0,
        rattrapagesRealises: 0,
        aRattraper: 0
      },
      objective: objectiveThreshold == null ? null : objective,
      objectiveContext: null,
      gapPct,
      analyticStatus: objectiveThreshold == null || stats.percentage == null ? 'NON_EVALUABLE' : (gapPct >= 0 ? 'ATTEINT' : 'SOUS_OBJECTIF')
    },
    legacy: null,
    graphs,
    explain: null,
    nominatif: includeNominatif ? nominatif : [],
    encadrement: includeNominatif ? encadrementRows(fiche) : [],
    sessions: state.sessions || [],
    exceptions: {
      excuses: includeNominatif ? excuses : [],
      absents: includeNominatif ? absents : []
    },
    tauxExplanation: [
      'Le taux de participation mesure la proportion du personnel soumis à l’obligation de formation ayant effectivement participé à au moins une des sessions proposées. Les personnes dispensées ne sont pas soumises à cette obligation et sont donc retirées de la population prise en compte pour le calcul. Une personne ayant participé à plusieurs sessions n’est comptabilisée qu’une seule fois.',
      `Les personnes excusées ou absentes restent comprises dans la population comptabilisable puisqu’elles étaient soumises à l’obligation de formation. Elles n’augmentent toutefois pas le nombre de participations réalisées.\nPopulation cible : ${stats.population || 0} personne(s). Dispensés : ${stats.dispenses || 0} personne(s). Population comptabilisable : ${stats.denominator || 0} personne(s). Participation acquise : ${stats.numerator || 0} personne(s).`,
      `Taux de participation : ${stats.numerator || 0} ÷ ${stats.denominator || 0} × 100 = ${stats.percentage == null ? 'non évaluable' : `${String(stats.percentage).replace('.', ',')} %`}.`
    ],
    quantitative: false,
    isLegacy: false,
    signatureRole: 'RESPONSABLE FORMATION',
    signaturePerson: null,
    signatureImage: null,
    signatureFunction: 'RESPONSABLE FORMATION',
    alerts: { p0: [], p1: [], p2: [] },
    events: multiSessionV2EventRows(state),
    domaines: ROOT_DOMAINES,
    multiSessionV2: true
  };
}

async function collectReport(repo, query, options){
  const kind = normalizeKind(query.kind || query.type);
  const includeNominatif = Boolean(options && options.includeNominatif);
  const analytics = createScopeAnalyticsService(repo);
  const dashboard = createScopeDashboardService(repo);
  const scope = createScopeService(repo);

  if(kind === 'PERSON'){
    const personneId = query.personneId || query.personne_id || query.id;
    if(!personneId) throw new HttpError(400, 'personne_requise', 'Le rapport individuel exige un identifiant de personne.');
    const { createScopePersonService } = require('./_scope-person-service');
    const display = require('../../assets/js/scope-personnel-display.js');
    const temporal = require('../../assets/js/scope-personnel-temporal.js');
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(personneId, query);
    const period = fiche.period;
    const consult = temporal.ficheConsultationDate(period, query.asOf || query.date);
    const assignments = ((fiche.historiqueRh && fiche.historiqueRh.affectations) || []).map((row) => ({
      id: row.affectationId,
      categorie: row.categorie,
      domaine: row.domaineCode,
      cible: row.niveauCode,
      roleDomaine: row.roleDomaine,
      dateActif: row.dateDebut,
      dateInactif: row.dateFin
    }));
    const identity = fiche.identite || {};
    const leave = fiche.identite && fiche.identite.conge;
    const sabbaticalRange = leave && String(leave.motif || '').toUpperCase() === 'CONGE_SABBATIQUE'
      ? [leave.dateDebut, leave.dateFin].filter(Boolean).map((d) => String(d).slice(0, 10)).join(' → ')
      : '';
    const officiel = {
      percentage: fiche.kpi && fiche.kpi.percentage,
      numerator: fiche.kpi && fiche.kpi.numerator,
      denominator: fiche.kpi && fiche.kpi.denominator,
      eventCount: fiche.kpi && fiche.kpi.eventCount,
      analyticStatus: fiche.kpi && fiche.kpi.analyticStatus,
      volumes: (fiche.kpi && fiche.kpi.volumes) || {},
      objective: fiche.objectif && fiche.objectif.objective,
      objectiveContext: fiche.objectif && fiche.objectif.objectiveContext,
      gapPct: fiche.objectif && fiche.objectif.gapPct
    };
    return {
      kind: 'PERSON',
      period,
      domaine: null,
      cible: null,
      title: 'Fiche individuelle SCOPE',
      subtitle: [identity.grade, identity.prenom, identity.nom].filter(Boolean).join(' '),
      summaryLabel: 'Synthèse de participation',
      filename: buildFilename('PERSON', { period, nip: identity.nip }),
      event: null,
      officiel,
      graphs: fiche.graphs || {},
      explain: fiche.explain,
      nominatif: [],
      encadrement: [],
      quantitative: false,
      isLegacy: false,
      alerts: { p0: [], p1: [], p2: [] },
      events: [],
      evenements: fiche.evenements || [],
      incorporations: display.ficheIncorporationRows(assignments, period, consult),
      specializations: display.ficheSpecializationView(assignments, consult).labels,
      personne: {
        grade: identity.grade,
        nom: identity.nom,
        prenom: identity.prenom,
        nip: identity.nip,
        statut: display.ficheIdentityView(identity, null, identity.conge && identity.conge.motif === 'CONGE_SABBATIQUE' ? {
          active: true,
          dateDebut: identity.conge.dateDebut,
          dateFin: identity.conge.dateFin
        } : null).statut,
        dateEntreeSdis: identity.dateEntreeSdis,
        dateInactivite: identity.dateInactif,
        sabbaticalRange: sabbaticalRange ? `Du ${sabbaticalRange.replace(' → ', ' au ')}` : '—'
      }
    };
  }

  if(kind === 'SESSION'){
    const evenementId = query.evenementId || query.evenement_id || query.id;
    if(!evenementId) throw new HttpError(400, 'evenement_requis', 'Le rapport de session exige un identifiant d’événement.');
    const fiche = await scope.lireEvenement(evenementId);
    const v2SessionModel = multiSessionV2SessionReportModel(fiche, includeNominatif);
    if(v2SessionModel) return v2SessionModel;
    let period = null;
    try {
      if(query.year || query.annee || query.from || query.to || query.preset){
        period = parsePeriod(query);
      }
    } catch (_err) {
      period = null;
    }
    const session = await collectMultisessionReport(repo, evenementId, { period });
    const year = session.period && session.period.from ? String(session.period.from).slice(0, 4) : '';
    const exerciseName = session.exerciseLabel || (session.event && session.event.libelle) || 'exercice';
    return {
      kind: 'SESSION',
      period: session.period,
      domaine: session.domaine,
      cible: null,
      title: `RAPPORT DE PARTICIPATION — EXERCICE ${exerciseName}`,
      subtitle: exerciseName,
      summaryLabel: 'Synthèse de participation',
      filename: buildFilename('SESSION', {
        period: session.period,
        domaine: session.domaine,
        exerciseLabel: session.exerciseLabel,
        year
      }),
      exerciseLabel: session.exerciseLabel,
      sessionDates: session.sessionDates,
      event: session.event,
      population: session.population,
      officiel: session.officiel,
      rates: session.rates,
      seances: session.seances,
      nonParticipants: includeNominatif ? session.nonParticipants : [],
      dispenses: includeNominatif ? (session.dispenses || []) : [],
      signatureRole: session.signatureRole,
      signaturePerson: session.signaturePerson,
      signatureImage: session.signatureImage,
      signatureFunction: session.signatureFunction,
      specialization: session.specialization,
      sessionCountLabel: session.sessionCountLabel,
      objective: session.objective,
      conclusion: session.conclusion,
      prSuspensionText: session.prSuspensionText,
      readingNotes: session.readingNotes,
      tauxExplanation: session.tauxExplanation,
      periodStrict: session.periodStrict,
      historyYears: session.historyYears,
      graphs: session.graphs,
      explain: null,
      nominatif: [],
      encadrement: [],
      quantitative: false,
      isLegacy: false,
      alerts: { p0: [], p1: [], p2: [] },
      events: [],
      sessionCount: session.sessionCount,
      isMultiSession: session.isMultiSession,
      parasiteNonRenseigne: session.parasiteNonRenseigne
    };
  }

  if(kind === 'JSP' || kind === 'PARTICIPATION'){
    const payload = kind === 'JSP' ? Object.assign({}, query, { domaine: 'JSP' }) : query;
    const jsp = kind === 'JSP'
      ? await createScopeJspReportingService(repo).report(payload)
      : await createScopeParticipationReportingService(repo).report(payload);
    const siteSlug = jsp.siteFilter === 'TOUS' ? 'GLOBAL' : jsp.siteFilter;
    return {
      kind: 'PARTICIPATION',
      period: jsp.period,
      domaine: jsp.domaine || 'JSP',
      sousDomaine: jsp.sousDomaine || null,
      cible: jsp.siteFilter === 'TOUS' ? null : jsp.siteFilter,
      title: jsp.title,
      subtitle: [jsp.domaine || 'JSP', jsp.sousDomaine, jsp.siteLabel || jsp.perimeterLabel].filter(Boolean).join(' — '),
      summaryLabel: 'Participation',
      filename: sanitizeFilename(kind === 'JSP'
        ? `SCOPE_Rapport_JSP_${siteSlug}_${periodSlug(jsp.period)}.pdf`
        : `SCOPE_Rapport_Participation_${jsp.domaine || 'JSP'}_${siteSlug}_${periodSlug(jsp.period)}.pdf`),
      event: null,
      officiel: {
        percentage: jsp.kpis.presenceRate,
        numerator: jsp.kpis.present,
        denominator: jsp.kpis.denominator,
        eventCount: jsp.kpis.exercises,
        volumes: {
          attendus: jsp.kpis.expected,
          presents: jsp.kpis.present,
          excuses: jsp.kpis.excused,
          nonExcuses: jsp.kpis.absent,
          dispenses: jsp.kpis.dispensed,
          nonRenseignes: jsp.kpis.nonRenseigne
        }
      },
      jsp,
      graphs: jsp.graphs,
      explain: null,
      nominatif: [],
      encadrement: [],
      quantitative: false,
      isLegacy: false,
      alerts: { p0: [], p1: [], p2: [] },
      events: jsp.exercises
    };
  }

  if(kind === 'FORMATION'){
    const formation = await createScopeParticipationReportingService(repo).formationReport(query);
    return {
      kind: 'FORMATION',
      period: formation.period,
      domaine: 'FORMATION',
      cible: null,
      title: formation.title,
      subtitle: formation.subtitle,
      summaryLabel: 'Pilotage Formation',
      filename: sanitizeFilename(`SCOPE_Rapport_Global_Formation_${periodSlug(formation.period)}.pdf`),
      event: null,
      officiel: {
        percentage: formation.kpis.presenceRate,
        numerator: formation.kpis.present,
        denominator: formation.kpis.denominator,
        eventCount: formation.kpis.exercises,
        volumes: {
          attendus: formation.kpis.expected,
          presents: formation.kpis.present,
          excuses: formation.kpis.excused,
          nonExcuses: formation.kpis.absent,
          dispenses: formation.kpis.dispensed,
          nonRenseignes: formation.kpis.nonRenseigne
        }
      },
      formation,
      graphs: formation.graphs,
      explain: null,
      nominatif: [],
      encadrement: [],
      quantitative: false,
      isLegacy: false,
      alerts: { p0: [], p1: [], p2: [] },
      events: formation.eventsToWatch || []
    };
  }

  if(kind === 'CYCLE'){
    const cycleId = query.cycleId || query.cycle_id || query.id;
    if(!cycleId) throw new HttpError(400, 'cycle_requis', 'Le rapport de cycle exige un identifiant de cycle.');
    const cycles = createScopeCycleService(repo);
    const detail = await cycles.getCycle(cycleId);
    const cycle = detail.cycle || {};
    const pilotage = detail.pilotage || {};
    const kpis = pilotage.kpis || {};
    const populationRows = (pilotage.individualRows || []).filter((row) => row && row.isPopulation);
    const encadrementRows = (pilotage.individualRows || []).filter((row) => row && row.isEncadrement);
    const remainingRows = populationRows.filter((row) => String(row.globalState || '').toUpperCase() === 'INCOMPLET');
    const eventCount = (detail.evenements || []).length;
    const realisedSessions = (detail.evenements || []).filter((row) => ['REALISE', 'CLOTUREE', 'CLOTURE'].includes(String(row.statut || row.status || '').toUpperCase())).length;
    const period = {
      from: cycle.date_debut || `${cycle.annee || new Date().getFullYear()}-01-01`,
      to: cycle.date_fin || `${cycle.annee || new Date().getFullYear()}-12-31`,
      preset: 'CUSTOM'
    };
    const domaine = displayDomaineCode(cycle.domaine_code);
    const engine = cycle.metadata && cycle.metadata.engine;
    const title = engine === MultiSessionV2.ENGINE.MULTI_SESSION_V2
      ? `Rapport Multi-session — ${cycle.libelle || 'Formation'}`
      : `Rapport de cycle — ${cycle.libelle || 'Cycle'}`;
    return {
      kind: 'CYCLE',
      period,
      domaine,
      cible: null,
      title,
      subtitle: `${cycleTypeLabel(cycle)} · ${cycleStatusLabel(cycle.statut)}`,
      summaryLabel: 'Pilotage consolidé',
      filename: buildFilename('CYCLE', {
        period,
        domaine,
        eventLabel: cycle.libelle,
        cycleLabel: cycle.libelle,
        engine
      }),
      event: null,
      officiel: {
        percentage: kpis.progression,
        numerator: kpis.complete,
        denominator: kpis.population,
        eventCount,
        volumes: {
          population: kpis.population,
          complete: kpis.complete,
          incomplete: kpis.resteATraiter ?? kpis.incomplete,
          realised: kpis.realised,
          excuses: kpis.excused,
          dispenses: kpis.dispensed,
          encadrement: kpis.encadrement
        }
      },
      cycleReport: {
        cycle,
        typeLabel: cycleTypeLabel(cycle),
        statusLabel: cycleStatusLabel(cycle.statut),
        sessionsRealised: realisedSessions,
        sessionCount: eventCount,
        kpis,
        remainingCount: remainingRows.length,
        engine
      },
      graphs: cycleGraphs(detail),
      explain: null,
      nominatif: includeNominatif ? cycleReportRows(populationRows) : [],
      encadrement: includeNominatif ? cycleReportRows(encadrementRows) : [],
      remainingRows: includeNominatif ? cycleReportRows(remainingRows) : [],
      quantitative: false,
      isLegacy: false,
      alerts: { p0: [], p1: [], p2: [] },
      events: detail.evenements || [],
      domaines: ROOT_DOMAINES
    };
  }

  if(kind === 'EVENT'){
    const evenementId = query.evenementId || query.evenement_id || query.id;
    if(!evenementId) throw new HttpError(400, 'evenement_requis', 'Le rapport événement exige un identifiant.');
    const fiche = await scope.lireEvenement(evenementId);
    const v2Model = await multiSessionV2ReportModel(repo, fiche, query, includeNominatif);
    if(v2Model) return v2Model;
    const date = fiche.evenement.date;
    const period = { from: date, to: date, preset: 'CUSTOM' };
    const evaluated = await analytics.evaluate({ evenementId, from: date, to: date });
    const explain = await analytics.explain({ evenementId, from: date, to: date });
    const series = await analytics.timeseries({ evenementId, from: date, to: date });
    const { buildScopeGraphs } = require('./_scope-graphs');
    const graphs = await buildScopeGraphs({
      analytics,
      repo,
      period,
      domaineCode: fiche.evenement.domaine_code,
      cibleRaw: null,
      evaluated,
      series,
      explain
    });
    const { signatureRoleForExercise } = require('./_scope-multisession-report');
    const domaineCode = displayDomaineCode(fiche.evenement.domaine_code);
    const signatureRole = signatureRoleForExercise({ domaineCode, libelle: fiche.evenement.libelle });
    let signaturePerson = null;
    if(domaineCode === 'PR' && typeof repo.getPersonneByNip === 'function'){
      const signer = await repo.getPersonneByNip('1506');
      signaturePerson = signer ? { grade: signer.grade || '', prenom: signer.prenom || '', nom: signer.nom || '', nip: signer.nip } : { grade: '', prenom: '', nom: '', nip: '1506' };
    }
    const isLegacy = fiche.evenement.origine === 'LEGACY_AGGREGATED' || fiche.modeSuivi === 'LEGACY';
    const cibles = fiche.cibles || [];
    const eventOfficial = isLegacy ? null : Object.assign({}, fiche.compteurs || {}, {
      officiel: fiche.evenement.statut === 'REALISE',
      kind: fiche.evenement.statut === 'REALISE' ? 'OFFICIEL' : 'PREVIEW',
      objective: evaluated.officiel && evaluated.officiel.objective,
      gapPct: evaluated.officiel && evaluated.officiel.gapPct,
      analyticStatus: evaluated.officiel && evaluated.officiel.analyticStatus,
      analyticStatusReason: evaluated.officiel && evaluated.officiel.analyticStatusReason,
      objectiveContext: evaluated.officiel && evaluated.officiel.objectiveContext,
      volumes: Object.assign({}, (fiche.compteurs || {}), fiche.permutationSummary || fiche.permutation_summary || {})
    });
    return {
      kind,
      period,
      domaine: displayDomaineCode(fiche.evenement.domaine_code),
      cible: cibles[0] && cibles[0].niveau_code,
      title: isLegacy ? 'Rapport d’exercice — historique agrégé' : exerciseReportTitle(fiche.evenement),
      subtitle: perimeterTitle(kind, { event: { ...fiche.evenement, cibles } }),
      filename: buildFilename(kind, {
        period,
        domaine: displayDomaineCode(fiche.evenement.domaine_code),
        cible: cibles[0] && cibles[0].niveau_code,
        eventDate: date,
        eventLabel: fiche.evenement.libelle
      }),
      event: {
        id: fiche.evenement.evenement_id,
        date,
        libelle: fiche.evenement.libelle,
        domaine: displayDomaineCode(fiche.evenement.domaine_code),
        sousDomaine: (DOMAINES_MODEL_2[fiche.evenement.domaine_code] || {}).parentCode ? fiche.evenement.domaine_code : null,
        parentDomaine: null,
        specialization: domaineCode === 'PR' ? 'PAPR' : '',
        cibles: cibles.map((c) => ({ code: c.niveau_code, libelle: c.libelle })),
        modeSuivi: fiche.modeSuivi,
        statut: fiche.evenement.statut,
        statutLabel: STATUT_LABELS[fiche.evenement.statut] || fiche.evenement.statut,
        modeLabel: MODE_LABELS[fiche.modeSuivi] || fiche.modeSuivi,
        sectionEffectif: fiche.sectionEffectif == null ? null : fiche.sectionEffectif,
        rattrapages: fiche.rattrapages || { count: 0 }
      },
      officiel: eventOfficial,
      legacy: isLegacy ? {
        kind: KINDS.LEGACY,
        presents: fiche.legacy && fiche.legacy.nb_presents,
        attendu: fiche.legacy && ((fiche.legacy.payload_v67 && fiche.legacy.payload_v67.total_attendu) || fiche.legacy.nb_convoques),
        tauxLegacy: evaluated.legacy && evaluated.legacy.points && evaluated.legacy.points[0]
          ? evaluated.legacy.points[0].tauxLegacy
          : null,
        banner: 'Historique agrégé — données non nominatives. Ce taux n’est pas le KPI officiel SCOPE.'
      } : (evaluated.legacy || null),
      graphs,
      explain,
      nominatif: includeNominatif && fiche.modeSuivi === 'NOMINATIF' && !isLegacy ? nominativeRows(fiche) : [],
      encadrement: includeNominatif && fiche.modeSuivi === 'NOMINATIF' && !isLegacy ? encadrementRows(fiche) : [],
      quantitative: fiche.modeSuivi === 'QUANTITATIF',
      isLegacy,
      signatureRole,
      signaturePerson,
      signatureImage: domaineCode === 'PR' ? 'MCE_Signature.png' : null,
      signatureFunction: domaineCode === 'PR' ? 'CHEF PROTECTION RESPIRATOIRE' : signatureRole,
      alerts: { p0: [], p1: [], p2: [] },
      events: [],
      domaines: ROOT_DOMAINES
    };
  }

  const period = parsePeriod(query);
  const domaine = query.domaineCode || query.domaine || null;
  const cible = query.cibleId || query.cible || null;
  if(kind === 'DOMAIN' && !domaine) throw new HttpError(400, 'domaine_requis', 'Le rapport domaine exige un code domaine.');
  if(kind === 'TARGET' && !domaine) throw new HttpError(400, 'cible_requise', 'Le rapport cible exige un domaine et une cible / un OI.');
  if(kind === 'PERIOD' && (domaine || cible)){
    /* ignore extra perimeter — PERIOD is SDIS */
  }
  const dashQuery = kind === 'PERIOD'
    ? { ...query, from: period.from, to: period.to, domaine: undefined, cible: undefined, domaineCode: undefined, cibleId: undefined }
    : { ...query, from: period.from, to: period.to, domaine: kind === 'PERIOD' ? undefined : domaine, cible: kind === 'TARGET' ? cible : undefined };
  const dash = await dashboard.dashboard(dashQuery);
  let cibleCode = kind === 'TARGET' ? cible : null;
  if(kind === 'TARGET' && cible && String(cible).length > 8){
    const all = typeof repo.listCibles === 'function' ? await repo.listCibles() : [];
    const row = all.find((c) => c.cible_id === cible);
    if(row) cibleCode = row.niveau_code;
  }
  const title = kind === 'PERIOD'
    ? 'Rapport de période — commandement'
    : (kind === 'DOMAIN' ? `Rapport de participation — ${domaineLabel(domaine) || domaine}` : `Rapport de cible / OI — ${perimeterTitle(kind, { domaine, cible: cibleCode })}`);
  const oiRows = kind === 'DOMAIN' ? domainPeriodOiRows(dash, domaine) : [];
  return {
    kind: kind === 'PERIOD' ? 'PERIOD' : kind,
    period: dash.period,
    domaine: kind === 'PERIOD' ? null : domaine,
    cible: kind === 'TARGET' ? cibleCode : null,
    title,
    subtitle: perimeterTitle(kind === 'PERIOD' ? 'PERIOD' : kind, { domaine: kind === 'PERIOD' ? null : domaine, cible: kind === 'TARGET' ? cibleCode : null }),
    filename: buildFilename(kind === 'PERIOD' ? 'PERIOD' : kind, {
      period: dash.period,
      domaine: kind === 'PERIOD' ? null : domaine,
      cible: kind === 'TARGET' ? cibleCode : null
    }),
    event: null,
    officiel: dash.officiel,
    legacy: dash.legacy,
    graphs: dash.graphs,
    explain: dash.explain,
    nominatif: [],
    encadrement: [],
    quantitative: false,
    isLegacy: false,
    alerts: pickAlerts(dash.alerts),
    events: dash.evenements || [],
    inboxCount: (dash.inbox || []).length,
    absencesNonExcusees: dash.absencesNonExcusees,
    domaines: kind === 'PERIOD' ? (dash.graphs.domaines.series[0] && dash.graphs.domaines.series[0].points) || [] : [],
    children: (dash.graphs.children && dash.graphs.children.series[0] && dash.graphs.children.series[0].points) || [],
    domainPeriod: kind === 'DOMAIN' ? {
      supported: Boolean(DOMAIN_PERIOD_OI[displayDomaineCode(domaine)]),
      oiRows,
      oiOrder: DOMAIN_PERIOD_OI[displayDomaineCode(domaine)] || [],
      eventCount: dash.officiel && dash.officiel.eventCount,
      source: 'dashboard.dashboard -> analytics.evaluate'
    } : null
  };
}

module.exports = {
  REPORT_KINDS,
  STATUT_LABELS,
  MOTIF_LABELS,
  MODE_LABELS,
  normalizeKind,
  domaineLabel,
  sanitizeFilename,
  buildFilename,
  periodSlug,
  domainPeriodOiRows,
  collectReport,
  nominativeRows,
  exerciseReportTitle,
  SOUS_DOMAINES
};

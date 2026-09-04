'use strict';
/** SCOPE-REPORT-1 — acquisition et normalisation. Aucun recalcul de taux. */

const { DOMAINES_MODEL_2, SOUS_DOMAINES } = require('./_scope-schema');
const { parsePeriod } = require('./_scope-period');
const { HttpError } = require('./_scope-rules');
const { KINDS } = require('./_scope-analytics');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { createScopeDashboardService } = require('./_scope-dashboard-service');
const { createScopeService } = require('./_scope-service');
const { ROOT_DOMAINES } = require('./_scope-graphs');
const { displayDomaineCode } = require('./_scope-model');
const { collectMultisessionReport } = require('./_scope-multisession-report');
const { createScopeJspReportingService, createScopeParticipationReportingService } = require('./_scope-jsp-reporting');
const PersonnelRefs = require('../../assets/js/scope-personnel-referentials');

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

const REPORT_KINDS = Object.freeze(['PERIOD', 'DOMAIN', 'TARGET', 'EVENT', 'PERSON', 'SESSION', 'JSP', 'PARTICIPATION']);

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
    SESSION: 'SESSION', MULTISESSION: 'SESSION', PARTICIPATION: 'SESSION',
    DETAIL: 'SESSION', EXERCISE_DETAIL: 'SESSION', RAPPORT_DETAILLE: 'SESSION',
    JSP: 'JSP', RAPPORT_JSP: 'JSP', JSP_REPORT: 'JSP',
    PARTICIPATION: 'PARTICIPATION', RAPPORT_PARTICIPATION: 'PARTICIPATION'
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
  return String(name || 'SCOPE_Rapport')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, 120) || 'SCOPE_Rapport';
}

function buildFilename(kind, ctx){
  const year = ctx.period ? periodSlug(ctx.period) : '';
  if(kind === 'PERIOD') return sanitizeFilename(`SCOPE_Rapport_SDIS_${year}.pdf`);
  if(kind === 'DOMAIN') return sanitizeFilename(`SCOPE_${ctx.domaine}_${year}.pdf`);
  if(kind === 'TARGET') return sanitizeFilename(`SCOPE_${ctx.domaine}_${ctx.cible}_${year}.pdf`);
  if(kind === 'PERSON') return sanitizeFilename(`SCOPE_Fiche_${ctx.nip || 'personne'}_${year}.pdf`);
  if(kind === 'SESSION'){
    const year = String((ctx.period && ctx.period.from) || ctx.year || '').slice(0, 4);
    const slug = String(ctx.exerciseLabel || '').replace(/^PR\s+/i, '').replace(/\s+/g, '_');
    return sanitizeFilename(`SCOPE_Rapport_participation_${ctx.domaine || 'SCOPE'}_${slug}_${year}.pdf`);
  }
  const date = ctx.eventDate || '';
  const oi = ctx.cible || 'GEN';
  return sanitizeFilename(`SCOPE_Exercice_${ctx.domaine || 'SCOPE'}_${oi}_${date}.pdf`);
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
    if(!isValidSessionStatut(statut)) return null;
    return {
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      nip: person.nip || '',
      oi: cible.niveau_code || '',
      cible: cible.libelle || cible.niveau_code || '',
      statut,
      statutLabel: STATUT_LABELS[part.statut] || part.statut || 'Non renseigné',
      motif: part.motif_absence || null,
      motifLabel: part.motif_absence ? (MOTIF_LABELS[part.motif_absence] || part.motif_absence) : '',
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
      cible: jsp.siteFilter === 'TOUS' ? null : jsp.siteFilter,
      title: jsp.title,
      subtitle: [jsp.domaine || 'JSP', jsp.siteLabel || jsp.perimeterLabel].filter(Boolean).join(' — '),
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

  if(kind === 'EVENT'){
    const evenementId = query.evenementId || query.evenement_id || query.id;
    if(!evenementId) throw new HttpError(400, 'evenement_requis', 'Le rapport événement exige un identifiant.');
    const fiche = await scope.lireEvenement(evenementId);
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
        eventDate: date
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
        modeLabel: MODE_LABELS[fiche.modeSuivi] || fiche.modeSuivi
      },
      officiel: isLegacy ? null : evaluated.officiel,
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

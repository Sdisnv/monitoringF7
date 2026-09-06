'use strict';
/**
 * SCOPE-ALERTS-1 — règles pures du moteur d’alertes.
 *
 * Déduplication P0 (un événement → une alerte, la plus actionnable) :
 *   1. SAISIE_NON_RENSEIGNE / QUANTITATIF_INCOMPLET  (données incomplètes)
 *   2. NOMINATIF_NON_FIGE                             (population à figer)
 *   3. CLOTURE_POSSIBLE                               (données complètes, échu)
 *   4. ECHU_PLANIFIE                                  (repli générique)
 * ECHU_PLANIFIE et CLOTURE_POSSIBLE ne coexistent jamais.
 *
 * J-7 : aucune urgence arbitraire. Échu = P0. Futur PLANIFIE (non figé /
 * saisie ouverte) = pas d’alerte P0 ; visible dans la liste Exercices.
 *
 * REPORTE : comme ANNULE — aucune alerte P0 (pas d’action de clôture).
 * LEGACY : jamais de P0 / P1 officiel.
 * P1 objectifs : uniquement gapPct < 0 issu d’analytics (pas de formule parallèle).
 * P1 absences non excusées : vigilance factuelle, sans seuil prédictif.
 */
const { isoDate } = require('./_scope-rules');
const { MODES, inferModeSuivi } = require('./_scope-analytics');
const { TIMEZONE, todayZurichIso, isEchu } = require('./_scope-calendar');

const LEVELS = Object.freeze({
  P0: { code: 'P0', label: 'Action requise' },
  P1: { code: 'P1', label: 'Vigilance métier' },
  P2: { code: 'P2', label: 'Information' }
});

const CODES = Object.freeze({
  ECHU_PLANIFIE: 'ECHU_PLANIFIE',
  NOMINATIF_NON_FIGE: 'NOMINATIF_NON_FIGE',
  SAISIE_NON_RENSEIGNE: 'SAISIE_NON_RENSEIGNE',
  QUANTITATIF_INCOMPLET: 'QUANTITATIF_INCOMPLET',
  CLOTURE_POSSIBLE: 'CLOTURE_POSSIBLE',
  CIBLE_SOUS_OBJECTIF: 'CIBLE_SOUS_OBJECTIF',
  DOMAINE_SOUS_OBJECTIF: 'DOMAINE_SOUS_OBJECTIF',
  OBJECTIF_ABSENT: 'OBJECTIF_ABSENT',
  ABSENCES_NON_EXCUSEES_REPETEES: 'ABSENCES_NON_EXCUSEES_REPETEES',
  PERSONNE_SOUS_OBJECTIF: 'PERSONNE_SOUS_OBJECTIF',
  PERSONNE_ABSENCE_NON_EXCUSEE: 'PERSONNE_ABSENCE_NON_EXCUSEE',
  CYCLE_INCOMPLET: 'CYCLE_INCOMPLET'
});

const ALERTS_CONFIG = Object.freeze({
  timezone: TIMEZONE,
  jMinusUnfrozen: null,
  repeatedUnexcusedAbsences: {
    enabled: true,
    threshold: null,
    reason: 'TOUTE_ABSENCE_NON_EXCUSEE_FACTUELLE'
  },
  personUnderObjective: {
    enabled: true,
    reason: 'OBJECTIFS_OFFICIELS_EXISTANTS'
  },
  predictive: { enabled: false }
});

function volumesComplete(saisie){
  if(!saisie) return false;
  const attendus = Number(saisie.nb_attendus);
  const presents = Number(saisie.nb_presents);
  const excuses = Number(saisie.nb_excuses);
  const nonExcuses = Number(saisie.nb_non_excuses);
  const dispenses = Number(saisie.nb_dispenses || 0);
  if(![attendus, presents, excuses, nonExcuses, dispenses].every((n) => Number.isInteger(n) && n >= 0)){
    return false;
  }
  return attendus === presents + excuses + nonExcuses + dispenses;
}

function volumesIncoherent(saisie){
  if(!saisie) return false;
  const attendus = Number(saisie.nb_attendus);
  const presents = Number(saisie.nb_presents);
  const excuses = Number(saisie.nb_excuses);
  const nonExcuses = Number(saisie.nb_non_excuses);
  const dispenses = Number(saisie.nb_dispenses || 0);
  const nums = [attendus, presents, excuses, nonExcuses, dispenses];
  if(!nums.every((n) => Number.isInteger(n) && n >= 0)) return true;
  return attendus !== presents + excuses + nonExcuses + dispenses;
}

function todayIso(value, now){
  return isoDate(value) || todayZurichIso(now);
}

function fingerprint(code, entityType, entityId){
  return `${code}|${entityType}|${entityId}`;
}

function ctaFor(code, evenementId){
  const href = `#/exercices/${evenementId}${code === 'SAISIE_NON_RENSEIGNE' || code === 'QUANTITATIF_INCOMPLET' ? '/saisie' : ''}`;
  if(code === 'QUANTITATIF_INCOMPLET') return { action: 'saisir-volumes', label: 'Saisir les présences', href };
  if(code === 'SAISIE_NON_RENSEIGNE') return { action: 'saisir', label: 'Compléter la saisie', href };
  if(code === 'NOMINATIF_NON_FIGE') return { action: 'figer', label: 'Figer la population', href: `#/exercices/${evenementId}` };
  if(code === 'ECHU_PLANIFIE') return { action: 'ouvrir', label: 'Ouvrir la fiche', href: `#/exercices/${evenementId}` };
  if(code === 'CLOTURE_POSSIBLE') return { action: 'cloturer', label: 'Clôturer', href: `#/exercices/${evenementId}` };
  return { action: 'ouvrir', label: 'Ouvrir', href: `#/exercices/${evenementId}` };
}

function packAlert(partial){
  const level = LEVELS[partial.level] ? partial.level : 'P2';
  const entityType = partial.entityType || 'EVENEMENT';
  const entityId = String(partial.entityId || '');
  const code = partial.code;
  const cta = partial.actionHref
    ? { action: partial.action, label: partial.actionLabel, href: partial.actionHref }
    : (partial.eventId ? ctaFor(code, partial.eventId) : { action: 'ouvrir', label: 'Ouvrir', href: '#/vue' });
  return {
    fingerprint: fingerprint(code, entityType, entityId),
    code,
    level,
    levelLabel: LEVELS[level].label,
    category: partial.category || 'OPERATIONNEL',
    title: partial.title,
    message: partial.message,
    reason: partial.reason,
    scope: partial.scope || entityType,
    entityType,
    entityId,
    domainCode: partial.domainCode || null,
    targetId: partial.targetId || null,
    eventId: partial.eventId || null,
    personId: partial.personId || null,
    eventDate: partial.eventDate || null,
    action: cta.action,
    actionLabel: cta.label,
    actionHref: cta.href,
    createdFrom: 'ALERTS-1',
    evaluable: partial.evaluable !== false,
    acknowledged: Boolean(partial.acknowledged),
    metadata: partial.metadata || {}
  };
}

function mapCibles(cibles){
  return (cibles || []).map((c) => ({
    cibleId: c.cible_id || c.cibleId,
    niveauCode: c.niveau_code || c.niveauCode,
    libelle: c.libelle
  }));
}

function classifyOperationalAlert(event, extras = {}){
  const evenement = event.evenement || event;
  if(!evenement) return null;
  const mode = inferModeSuivi(evenement);
  const date = isoDate(evenement.date);
  const today = todayIso(extras.today, extras.now);
  if(evenement.origine === 'LEGACY_AGGREGATED' || mode === MODES.LEGACY) return null;
  if(evenement.statut === 'ANNULE' || evenement.statut === 'REPORTE' || evenement.statut === 'REALISE') return null;
  if(evenement.statut !== 'PLANIFIE') return null;

  const saisie = extras.saisie || extras.saisieQuantitative || event.saisieQuantitative || null;
  const participations = extras.participations || [];
  const attendus = (extras.attendus || []).filter((a) => a.inclus !== false);
  const echu = isEchu(date, today);
  const cibles = mapCibles(extras.cibles || event.cibles || []);
  const libelle = evenement.libelle || 'Exercice';
  const eventId = evenement.evenement_id;
  const base = {
    category: 'OPERATIONNEL',
    title: libelle,
    domainCode: evenement.domaine_code,
    targetId: cibles[0] ? (cibles[0].cibleId || null) : null,
    eventId,
    entityType: 'EVENEMENT',
    entityId: eventId,
    eventDate: date,
    evaluable: true,
    metadata: {
      modeSuivi: mode,
      statut: evenement.statut,
      cibles,
      populationFigee: Boolean(evenement.population_figee)
    }
  };

  let chosen = null;

  if(mode === MODES.QUANTITATIF){
    const complete = volumesComplete(saisie);
    if(!complete){
      if(echu){
        chosen = {
          ...base,
          code: CODES.QUANTITATIF_INCOMPLET,
          level: 'P0',
          message: 'Saisie des volumes incomplète',
          reason: !saisie
            ? 'Aucune saisie quantitative exploitable.'
            : (volumesIncoherent(saisie)
              ? 'Les volumes saisis sont incohérents.'
              : 'Aucune saisie quantitative exploitable.'),
          metadata: { ...base.metadata, volumesOk: false, incoherent: volumesIncoherent(saisie) }
        };
      }
    } else if(echu){
      chosen = {
        ...base,
        code: CODES.CLOTURE_POSSIBLE,
        level: 'P0',
        message: 'Les présences sont complètes. Cet exercice peut être clôturé.',
        reason: 'Les présences sont complètes. Cet exercice peut être clôturé.',
        metadata: { ...base.metadata, volumesOk: true }
      };
    }
  } else if(!evenement.population_figee){
    if(echu){
      chosen = {
        ...base,
        code: CODES.NOMINATIF_NON_FIGE,
        level: 'P0',
        message: 'Population non figée',
        reason: 'L’exercice est échu. La liste des participants doit être figée avant la saisie.'
      };
    }
  } else {
    const open = attendus.filter((a) => {
      const p = participations.find((row) => String(row.personne_id) === String(a.personne_id));
      return !p || p.statut === 'NON_RENSEIGNE';
    });
    if(open.length){
      if(echu){
        chosen = {
          ...base,
          code: CODES.SAISIE_NON_RENSEIGNE,
          level: 'P0',
          message: 'Présences incomplètes',
          reason: open.length === 1
            ? '1 participant reste non renseigné.'
            : `${open.length} participants restent non renseignés.`,
          metadata: { ...base.metadata, openCount: open.length }
        };
      }
    } else if(echu){
      chosen = {
        ...base,
        code: CODES.CLOTURE_POSSIBLE,
        level: 'P0',
        message: 'Les présences sont complètes. Cet exercice peut être clôturé.',
        reason: 'Les présences sont complètes. Cet exercice peut être clôturé.',
        metadata: { ...base.metadata, openCount: 0 }
      };
    }
  }

  if(!chosen && echu){
    chosen = {
      ...base,
      code: CODES.ECHU_PLANIFIE,
      level: 'P0',
      message: 'Exercice échu non clôturé',
      reason: 'La date est passée et l’exercice reste planifié.'
    };
  }
  if(!chosen) return null;
  return packAlert(chosen);
}

function toInboxItem(alert){
  if(!alert || alert.level !== 'P0' || alert.entityType !== 'EVENEMENT') return null;
  const cibles = (alert.metadata && alert.metadata.cibles) || [];
  return {
    evenementId: alert.eventId,
    date: alert.eventDate,
    domaine: alert.domainCode,
    libelle: alert.title,
    modeSuivi: alert.metadata && alert.metadata.modeSuivi,
    statut: alert.metadata && alert.metadata.statut,
    cibles,
    reasonCode: alert.code,
    reason: alert.reason || alert.message,
    cta: {
      action: alert.action,
      label: alert.actionLabel,
      href: alert.actionHref
    }
  };
}

function isUnderObjective(officiel){
  if(!officiel) return false;
  if(officiel.analyticStatus === 'NON_EVALUABLE') return false;
  if(officiel.percentage == null || officiel.gapPct == null) return false;
  if(!officiel.objective) return false;
  const ctx = officiel.objectiveContext || {};
  if(ctx.homogeneous === false) return false;
  return Number(officiel.gapPct) < 0;
}

function formatPct(value){
  if(value == null || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toFixed(1).replace('.', ',')} %`;
}

function formatGapPts(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1).replace('.', ',')} pts`;
}

function packObjectiveAlert({ code, level, grain, officiel, domainCode, targetId, niveauCode, libelle }){
  const under = isUnderObjective(officiel);
  if(!under) return null;
  const isCible = code === CODES.CIBLE_SOUS_OBJECTIF;
  const href = isCible && domainCode && niveauCode
    ? `#/vue/${encodeURIComponent(domainCode)}/${encodeURIComponent(niveauCode)}`
    : (domainCode ? `#/vue/${encodeURIComponent(domainCode)}` : '#/vue');
  const title = libelle || domainCode || 'Périmètre';
  return packAlert({
    code,
    level: level || 'P1',
    category: 'OBJECTIF',
    title,
    message: isCible ? 'Cible sous objectif' : 'Domaine sous objectif',
    reason: `Taux ${formatPct(officiel.percentage)} pour un objectif de ${formatPct(officiel.objective.thresholdPct)} (écart ${formatGapPts(officiel.gapPct)}).`,
    scope: grain,
    entityType: isCible ? 'CIBLE' : 'DOMAINE',
    entityId: isCible ? String(targetId) : String(domainCode),
    domainCode: domainCode || null,
    targetId: targetId || null,
    action: isCible ? 'voir-cible' : 'voir-domaine',
    actionLabel: isCible ? 'Ouvrir la vue cible' : 'Ouvrir la vue domaine',
    actionHref: href,
    evaluable: true,
    metadata: {
      percentage: officiel.percentage,
      gapPct: officiel.gapPct,
      thresholdPct: officiel.objective.thresholdPct,
      analyticStatus: officiel.analyticStatus,
      niveauCode: niveauCode || null
    }
  });
}

function packObjectifAbsent(officiel, { grain, domainCode, targetId }){
  if(!officiel || officiel.percentage == null) return null;
  if(officiel.objective) return null;
  if(officiel.analyticStatus === 'NON_EVALUABLE') return null;
  const ctx = officiel.objectiveContext || {};
  if(ctx.homogeneous === false) return null;
  return packAlert({
    code: CODES.OBJECTIF_ABSENT,
    level: 'P2',
    category: 'PILOTAGE',
    title: 'Aucun objectif défini',
    message: 'Le taux officiel est calculé, mais aucun objectif unique ne permet l’évaluation.',
    reason: 'Un objectif applicable sur la période permettrait d’interpréter ce taux.',
    scope: grain || 'GLOBAL',
    entityType: targetId ? 'CIBLE' : (domainCode ? 'DOMAINE' : 'SDIS'),
    entityId: String(targetId || domainCode || 'SDIS'),
    domainCode: domainCode || null,
    targetId: targetId || null,
    action: 'voir-objectifs',
    actionLabel: 'Ouvrir les objectifs',
    actionHref: '#/reglages/objectifs',
    evaluable: true,
    metadata: { percentage: officiel.percentage, analyticStatus: officiel.analyticStatus }
  });
}

module.exports = {
  LEVELS,
  CODES,
  ALERTS_CONFIG,
  volumesComplete,
  todayIso,
  fingerprint,
  packAlert,
  classifyOperationalAlert,
  toInboxItem,
  isUnderObjective,
  packObjectiveAlert,
  packObjectifAbsent
};

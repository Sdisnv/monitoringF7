'use strict';
const { isoDate, round1 } = require('./_scope-rules');

const PORTEES = Object.freeze({ GLOBAL: 'GLOBAL', DOMAINE: 'DOMAINE', CIBLE: 'CIBLE' });
const GRAINS = Object.freeze({
  GLOBAL: 'GLOBAL',
  DOMAINE: 'DOMAINE',
  CIBLE: 'CIBLE',
  EVENEMENT: 'EVENEMENT'
});

function dateOnly(value){
  return isoDate(value);
}

function addDays(iso, n){
  const text = dateOnly(iso);
  if(!text) return null;
  const [y, m, d] = text.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(n)));
  return dt.toISOString().slice(0, 10);
}

function coversDate(row, date){
  const day = dateOnly(date);
  const debut = dateOnly(row.date_debut || row.dateDebut);
  const fin = dateOnly(row.date_fin || row.dateFin);
  if(!day || !debut) return false;
  if(day < debut) return false;
  if(fin && day > fin) return false;
  return true;
}

function isActif(row){
  return row && row.actif !== false;
}

function scopeKey(row){
  const portee = String(row.portee || row.scope || '').toUpperCase();
  if(portee === PORTEES.GLOBAL) return 'GLOBAL';
  if(portee === PORTEES.DOMAINE) return `DOMAINE:${row.domaine_code || row.domaineCode}`;
  if(portee === PORTEES.CIBLE) return `CIBLE:${row.cible_id || row.cibleId}`;
  return portee;
}

function periodsOverlap(a, b){
  const aStart = dateOnly(a.date_debut || a.dateDebut);
  const bStart = dateOnly(b.date_debut || b.dateDebut);
  const aEnd = dateOnly(a.date_fin || a.dateFin) || '9999-12-31';
  const bEnd = dateOnly(b.date_fin || b.dateFin) || '9999-12-31';
  if(!aStart || !bStart) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

function mapObjective(row){
  if(!row) return null;
  const portee = String(row.portee || row.scope || '').toUpperCase();
  return {
    objectifId: row.objectif_id || row.objectifId,
    scope: portee,
    thresholdPct: Number(row.seuil_pct != null ? row.seuil_pct : row.thresholdPct),
    dateDebut: dateOnly(row.date_debut || row.dateDebut),
    dateFin: dateOnly(row.date_fin || row.dateFin),
    source: portee,
    domaineCode: row.domaine_code || row.domaineCode || null,
    cibleId: row.cible_id || row.cibleId || null,
    commentaire: row.commentaire || null
  };
}

function inferAnalysisGrain(query = {}){
  if(query.analysisGrain) return String(query.analysisGrain).toUpperCase();
  if(query.evenementId || query.evenement_id) return GRAINS.EVENEMENT;
  if(query.cibleId || query.cible_id || query.cible) return GRAINS.CIBLE;
  if(query.domaineCode || query.domaine_code || query.domaine) return GRAINS.DOMAINE;
  return GRAINS.GLOBAL;
}

function covering(objectives, date, pred){
  return (objectives || []).find((row) => isActif(row) && coversDate(row, date) && pred(row));
}

function resolveObjective(query = {}){
  const objectives = query.objectives || [];
  const date = dateOnly(query.date);
  if(!date || !objectives.length) return null;
  const grain = inferAnalysisGrain(query);
  const domaine = query.domaineCode || query.domaine_code || query.domaine || null;
  const cibleId = query.cibleId || query.cible_id || null;

  const findGlobal = () => covering(objectives, date, (row) => String(row.portee).toUpperCase() === PORTEES.GLOBAL);
  const parentDomaine = (code) => {
    const c = String(code || '').toUpperCase();
    // Compatibilité UX FOSPEC / PR|AUTO — pas un 4e grain (PÉRIMÈTRE hors lot).
    return (c === 'PR' || c === 'AUTO') ? 'FOSPEC' : null;
  };
  const findDomaineFor = (code) => code
    ? covering(objectives, date, (row) => String(row.portee).toUpperCase() === PORTEES.DOMAINE && String(row.domaine_code) === String(code))
    : null;
  const findDomaine = () => {
    if(!domaine) return null;
    const own = findDomaineFor(domaine);
    if(own) return own;
    return findDomaineFor(parentDomaine(domaine));
  };
  const findCible = () => cibleId
    ? covering(objectives, date, (row) => String(row.portee).toUpperCase() === PORTEES.CIBLE && String(row.cible_id) === String(cibleId))
    : null;

  if(grain === GRAINS.GLOBAL){
    const row = findGlobal();
    return row ? mapObjective(row) : null;
  }
  if(grain === GRAINS.DOMAINE){
    const domaineRow = findDomaine();
    if(domaineRow) return mapObjective(domaineRow);
    const globalRow = findGlobal();
    return globalRow ? mapObjective(globalRow) : null;
  }
  const cibleRow = findCible();
  if(cibleRow) return mapObjective(cibleRow);
  const domaineRow = findDomaine();
  if(domaineRow) return mapObjective(domaineRow);
  const globalRow = findGlobal();
  return globalRow ? mapObjective(globalRow) : null;
}

function resolveEventObjective(event, { objectives, grain, queryCibleId } = {}){
  const date = dateOnly(event.date);
  const domaine = event.domaine_code || event.domaineCode;
  const cibleIds = event.cible_ids || event.cibleIds || [];
  const resolvedGrain = grain || GRAINS.GLOBAL;
  if(resolvedGrain === GRAINS.GLOBAL){
    return resolveObjective({ date, analysisGrain: GRAINS.GLOBAL, objectives });
  }
  if(resolvedGrain === GRAINS.DOMAINE){
    return resolveObjective({ date, domaineCode: domaine, analysisGrain: GRAINS.DOMAINE, objectives });
  }
  if(resolvedGrain === GRAINS.CIBLE){
    return resolveObjective({
      date,
      domaineCode: domaine,
      cibleId: queryCibleId || cibleIds[0] || null,
      analysisGrain: GRAINS.CIBLE,
      objectives
    });
  }
  if(cibleIds.length <= 1){
    return resolveObjective({
      date,
      domaineCode: domaine,
      cibleId: cibleIds[0] || null,
      analysisGrain: cibleIds[0] ? GRAINS.CIBLE : GRAINS.DOMAINE,
      objectives
    });
  }
  const list = cibleIds.map((cibleId) => resolveObjective({
    date,
    domaineCode: domaine,
    cibleId,
    analysisGrain: GRAINS.CIBLE,
    objectives
  }));
  const keys = [...new Set(list.map((item) => (item ? item.objectifId : '∅')))];
  if(keys.length === 1) return list[0];
  return null;
}

function collectObjectiveContext(resolvedList){
  const list = Array.isArray(resolvedList) ? resolvedList : [];
  if(!list.length){
    return {
      homogeneous: true,
      distinctObjectives: [],
      objective: null,
      reason: 'OBJECTIVE_NOT_FOUND'
    };
  }
  if(list.every((item) => !item)){
    return {
      homogeneous: true,
      distinctObjectives: [],
      objective: null,
      reason: 'OBJECTIVE_NOT_FOUND'
    };
  }
  const present = list.filter(Boolean);
  const unique = [];
  const seen = new Set();
  for(const item of present){
    if(seen.has(item.objectifId)) continue;
    seen.add(item.objectifId);
    unique.push(item);
  }
  if(unique.length === 1 && present.length === list.length){
    return {
      homogeneous: true,
      distinctObjectives: unique,
      objective: unique[0],
      reason: unique[0].source
    };
  }
  return {
    homogeneous: false,
    distinctObjectives: unique,
    objective: null,
    reason: 'OBJECTIVES_MULTIPLES'
  };
}

function gapAgainst(percentage, objective, context){
  if(context && context.homogeneous === false) return null;
  if(percentage == null || !objective || objective.thresholdPct == null) return null;
  const gap = Number(percentage) - Number(objective.thresholdPct);
  return Number.isFinite(gap) ? round1(gap) : null;
}

module.exports = {
  PORTEES,
  GRAINS,
  dateOnly,
  addDays,
  coversDate,
  periodsOverlap,
  scopeKey,
  mapObjective,
  inferAnalysisGrain,
  resolveObjective,
  resolveEventObjective,
  collectObjectiveContext,
  gapAgainst
};

/* SCOPE-PERSONNEL-TEMPORAL-UX-1 — période analysée, actif/inactif métier, MODEL-2. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelTemporal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function iso(value){
    const text = String(value == null ? '' : value).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  }

  function addDays(date, days){
    const day = iso(date);
    if(!day) return '';
    const dt = new Date(`${day}T00:00:00.000Z`);
    dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
    return dt.toISOString().slice(0, 10);
  }

  function dayBefore(date){
    return addDays(date, -1);
  }

  function lastDayOfMonth(year, month){
    const y = Number(year);
    const m = Number(month);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }

  function resolveAnalyzedPeriod(input){
    const src = input || {};
    const asOf = iso(src.asOf || src.situationAu);
    if(asOf) return { from: asOf, to: asOf, preset: 'AS_OF', year: asOf.slice(0, 4) };
    const fromHint = iso(src.from);
    const toHint = iso(src.to);
    if(fromHint && toHint && !src.preset){
      return { from: fromHint, to: toHint, preset: 'CUSTOM', year: fromHint.slice(0, 4) };
    }
    const preset = String(src.preset || src.mode || 'YEAR').toUpperCase();
    const year = String(src.year || (fromHint || '2026').slice(0, 4));
    if(preset === 'CUSTOM' || preset === 'PERSONNALISEE' || preset === 'PERSONNALISE' || (fromHint && toHint && preset !== 'YEAR' && preset !== 'MONTH' && preset !== 'QUARTER')){
      const from = fromHint || `${year}-01-01`;
      const to = toHint || `${year}-12-31`;
      return { from, to, preset: 'CUSTOM', year };
    }
    if(fromHint && toHint && String(src.preset || '').toUpperCase() === 'CUSTOM'){
      return { from: fromHint, to: toHint, preset: 'CUSTOM', year };
    }
    if(preset === 'MONTH'){
      const month = String(src.month || '1').padStart(2, '0');
      const from = `${year}-${month}-01`;
      return { from, to: lastDayOfMonth(year, month), preset: 'MONTH', year, month: String(Number(month)) };
    }
    if(preset === 'QUARTER'){
      const q = Math.min(4, Math.max(1, Number(src.quarter || 1)));
      const startMonth = String((q - 1) * 3 + 1).padStart(2, '0');
      const endMonth = q * 3;
      const from = `${year}-${startMonth}-01`;
      return { from, to: lastDayOfMonth(year, endMonth), preset: 'QUARTER', year, quarter: String(q) };
    }
    return { from: `${year}-01-01`, to: `${year}-12-31`, preset: 'YEAR', year };
  }

  function formatSwiss(date){
    const day = iso(date);
    if(!day) return '';
    return `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
  }

  function periodLabel(period){
    const p = resolveAnalyzedPeriod(period || {});
    return `${formatSwiss(p.from)} → ${formatSwiss(p.to)}`;
  }

  function rangesOverlap(aFrom, aTo, bFrom, bTo){
    const a1 = iso(aFrom);
    const a2 = iso(aTo) || '9999-12-31';
    const b1 = iso(bFrom);
    const b2 = iso(bTo) || '9999-12-31';
    if(!a1 || !b1) return false;
    return a1 <= b2 && a2 >= b1;
  }

  function assignmentBounds(assignment){
    if(!assignment || typeof assignment === 'string') return { from: '', to: '' };
    const from = iso(assignment.dateActif || assignment.date_actif || assignment.dateDebut || assignment.date_debut || assignment.date_actif);
    const to = iso(assignment.dateInactif || assignment.date_inactif || assignment.dateFin || assignment.date_fin);
    return { from, to };
  }

  function assignmentOverlapsPeriod(assignment, period){
    const p = resolveAnalyzedPeriod(period || {});
    const b = assignmentBounds(assignment);
    if(!b.from) return false;
    return rangesOverlap(b.from, b.to, p.from, p.to);
  }

  function assignmentCoversDate(assignment, date){
    const day = iso(date);
    const b = assignmentBounds(assignment);
    if(!day || !b.from) return false;
    if(b.from > day) return false;
    if(b.to && b.to < day) return false;
    return true;
  }

  function personActiveInPeriod(person, period){
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    if(assignments.some((row) => assignmentOverlapsPeriod(row, period))) return true;
    const periodes = (person && (person.periodes || [])) || [];
    return periodes.some((row) => {
      const type = String(row.type || '').toUpperCase();
      if(type !== 'ACTIF') return false;
      return rangesOverlap(row.date_debut || row.dateDebut, row.date_fin || row.dateFin, period.from, period.to);
    });
  }

  function personActiveAtDate(person, date){
    const day = iso(date);
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    if(assignments.some((row) => assignmentCoversDate(row, day))) return true;
    const periodes = (person && (person.periodes || [])) || [];
    const covering = periodes.filter((row) => rangesOverlap(row.date_debut || row.dateDebut, row.date_fin || row.dateFin, day, day));
    if(covering.some((row) => String(row.type || '').toUpperCase() === 'INDISPONIBLE')) return false;
    if(covering.some((row) => String(row.type || '').toUpperCase() === 'ACTIF')) return true;
    if(covering.some((row) => {
      const type = String(row.type || '').toUpperCase();
      return type === 'SORTI' || type === 'DEMISSIONNAIRE';
    })) return false;
    return false;
  }

  function activityWindow(person, period){
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    const overlapping = assignments.filter((row) => assignmentOverlapsPeriod(row, period));
    const source = overlapping.length ? overlapping : assignments;
    let from = '';
    let to = '';
    let open = false;
    source.forEach((row) => {
      const b = assignmentBounds(row);
      if(!b.from) return;
      if(!from || b.from < from) from = b.from;
      if(!b.to) open = true;
      else if(!to || b.to > to) to = b.to;
    });
    return { from, to: open ? '' : to };
  }

  function temporalStatus(person, period){
    return personActiveInPeriod(person, period) ? 'actif' : 'inactif';
  }

  function planInactivation(effectDate){
    const dateEffet = iso(effectDate);
    return {
      dateEffet,
      dernierJourActif: dayBefore(dateEffet),
      convention: 'MODEL-2'
    };
  }

  function appliesToFrozenEventPopulation(){
    return false;
  }

  return {
    iso,
    addDays,
    dayBefore,
    resolveAnalyzedPeriod,
    formatSwiss,
    periodLabel,
    rangesOverlap,
    assignmentOverlapsPeriod,
    assignmentCoversDate,
    personActiveInPeriod,
    personActiveAtDate,
    activityWindow,
    temporalStatus,
    planInactivation,
    appliesToFrozenEventPopulation,
    resolveAnalyzedPeriod: resolveAnalyzedPeriod,
    temporalStatus: temporalStatus,
    activityWindow: activityWindow,
    iso: iso,
    rangesOverlap: rangesOverlap
  };
});

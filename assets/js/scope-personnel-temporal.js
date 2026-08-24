/* SCOPE-PERSONNEL-TEMPORAL-UX-R1
   Source métier : scope_affectations.date_actif / date_inactif
   (périodes ACTIF en complément). Jamais created_at / imported_at.
   MODEL-2 : date_inactif = dernier jour actif inclus.
   Inactivité au 14.07 → dernier jour actif 13.07. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelTemporal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function iso(value){
    if(value == null || value === '') return '';
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      const utcMidnight = value.getUTCHours() === 0 && value.getUTCMinutes() === 0
        && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
      if(utcMidnight) return value.toISOString().slice(0, 10);
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if(isoMatch) return isoMatch[1];
    const swiss = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(swiss) return `${swiss[3]}-${swiss[2]}-${swiss[1]}`;
    return '';
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
    const fromHint = iso(src.from);
    const toHint = iso(src.to);
    const preset = String(src.preset || src.mode || 'YEAR').toUpperCase();
    const year = String(src.year || (fromHint || '2026').slice(0, 4));
    if(preset === 'CUSTOM' || preset === 'PERSONNALISEE' || preset === 'PERSONNALISE'){
      return {
        from: fromHint || `${year}-01-01`,
        to: toHint || `${year}-12-31`,
        preset: 'CUSTOM',
        year
      };
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
    const from = iso(assignment.dateActif || assignment.date_actif || assignment.dateDebut || assignment.date_debut);
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
    const p = resolveAnalyzedPeriod(period || {});
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    if(assignments.length){
      return assignments.some((row) => assignmentOverlapsPeriod(row, p));
    }
    const periodes = (person && (person.periodes || [])) || [];
    return periodes.some((row) => {
      const type = String(row.type || '').toUpperCase();
      if(type !== 'ACTIF') return false;
      return rangesOverlap(row.date_debut || row.dateDebut, row.date_fin || row.dateFin, p.from, p.to);
    });
  }

  function personRelevantInPeriod(person, period){
    return personActiveInPeriod(person, period);
  }

  function coveringPeriodes(person, day){
    const periodes = (person && (person.periodes || [])) || [];
    return periodes.filter((row) => rangesOverlap(row.date_debut || row.dateDebut, row.date_fin || row.dateFin, day, day));
  }

  function personActiveAtDate(person, date){
    const day = iso(date);
    if(!day) return false;
    const covering = coveringPeriodes(person, day);
    if(covering.some((row) => {
      const type = String(row.type || '').toUpperCase();
      return type === 'SORTI' || type === 'DEMISSIONNAIRE';
    })) return false;
    if(covering.some((row) => String(row.type || '').toUpperCase() === 'INDISPONIBLE')) return false;
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    if(assignments.length) return assignments.some((row) => assignmentCoversDate(row, day));
    if(covering.some((row) => String(row.type || '').toUpperCase() === 'ACTIF')) return true;
    return false;
  }

  function personRelevantAtDate(person, date){
    const day = iso(date);
    if(!day) return false;
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    if(assignments.length){
      return assignments.some((row) => {
        const b = assignmentBounds(row);
        return Boolean(b.from && b.from <= day);
      });
    }
    const periodes = (person && (person.periodes || [])) || [];
    return periodes.some((row) => {
      const start = iso(row.date_debut || row.dateDebut);
      return Boolean(start && start <= day);
    });
  }

  function activityWindow(person, period, asOf){
    const day = iso(asOf);
    const assignments = (person && (person.affectations || person.assignments || [])) || [];
    const source = day
      ? assignments.filter((row) => assignmentCoversDate(row, day))
      : assignments.filter((row) => assignmentOverlapsPeriod(row, period || {}));
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
    const p = resolveAnalyzedPeriod(period || {});
    return personActiveAtDate(person, p.to) ? 'actif' : 'inactif';
  }

  function evaluateStatus(person, period, asOf){
    const day = iso(asOf);
    if(day) return personActiveAtDate(person, day) ? 'actif' : 'inactif';
    return temporalStatus(person, period);
  }

  function planInactivation(effectDate){
    const dateEffet = iso(effectDate);
    return {
      dateEffet,
      dernierJourActif: dayBefore(dateEffet),
      convention: 'MODEL-2',
      storage: 'date_inactif = dernier jour actif inclus',
      businessInactiveDate: dateEffet
    };
  }

  function isOpenAssignment(assignment){
    const b = assignmentBounds(assignment);
    return Boolean(b.from) && !b.to;
  }

  function planAssignmentClosures(assignments, effectDate){
    const plan = planInactivation(effectDate);
    const open = (assignments || []).filter(isOpenAssignment);
    const close = [];
    const sameDay = [];
    const future = [];
    open.forEach((assignment) => {
      const start = assignmentBounds(assignment).from;
      if(plan.dernierJourActif && start <= plan.dernierJourActif){
        close.push({ assignment, dateInactif: plan.dernierJourActif, mode: 'close' });
      } else if(start === plan.dateEffet){
        sameDay.push({ assignment, dateInactif: start, mode: 'same-day' });
      } else {
        future.push({ assignment, mode: 'future' });
      }
    });
    return {
      plan,
      close,
      sameDay,
      future,
      canProceed: open.length === 0 || close.length + sameDay.length > 0
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
    personRelevantInPeriod,
    personActiveAtDate,
    personRelevantAtDate,
    activityWindow,
    temporalStatus,
    evaluateStatus,
    planInactivation,
    planAssignmentClosures,
    isOpenAssignment,
    appliesToFrozenEventPopulation,
    SOURCE_METIER: 'scope_affectations.date_actif/date_inactif'
  };
});

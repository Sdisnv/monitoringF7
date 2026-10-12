'use strict';

function date(value){
  if(value instanceof Date && !Number.isFinite(value.getTime())) return null;
  const text = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
    : String(value || '').slice(0,10);
  const parsed = new Date(`${text}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0,10) === text ? text : null;
}

function nextDay(value){
  const day = new Date(`${value}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0,10);
}

function resolveProgrammeCycle(year, metadata = {}, reports = []){
  const stored = metadata.programmeCycle || {};
  const matching = (cycleYear, reference) => {
    const candidates = reports.filter(report => report.closesCycleYear === cycleYear && date(report.actualDate));
    if(reference) return candidates.find(report => report.itemId === reference.itemId
      && (!reference.sourceType || report.sourceType === reference.sourceType)
      && (!reference.programmeYear || report.programmeYear === Number(reference.programmeYear))) || null;
    return candidates.length === 1 ? candidates[0] : null;
  };
  const openingReport = matching(year - 1,stored.openingReport);
  const closingReport = matching(year,stored.closingReport);
  const earliestStart = openingReport ? nextDay(openingReport.actualDate) : null;
  const declaredStart = date(stored.startDate);
  const startDate = earliestStart && (!declaredStart || declaredStart >= earliestStart) ? declaredStart || earliestStart : null;
  const endDate = closingReport ? date(closingReport.actualDate) : null;
  // The established 2027 programme already has its annual parameters. Future cycles require confirmation.
  const parametersDefined = typeof stored.parametersDefined === 'boolean' ? stored.parametersDefined : year === 2027;
  const missing = [];
  if(!startDate) missing.push('OPENING_REPORT');
  if(!endDate) missing.push('CLOSING_REPORT');
  if(!parametersDefined) missing.push('ANNUAL_PARAMETERS');
  if(startDate && endDate && endDate < startDate) missing.push('INVALID_BOUNDARIES');
  return {year,startDate,endDate,status:missing.length ? 'MOA_REQUIRED' : 'DEFINED',parametersDefined,
    generationAllowed:missing.length === 0,openingReport,closingReport,missing,
    reportOptions:reports.filter(report => date(report.actualDate)).map(report => ({...report,label:'Rapport annuel'})),
    statisticsBasis:'CIVIL_EVENT_DATE'};
}

function classifyProgrammeDate(cycle, actualDate){
  const day = date(actualDate);
  if(!day) return 'UNDATED';
  if(cycle.startDate && day < cycle.startDate || cycle.endDate && day > cycle.endDate) return 'OUTSIDE_CYCLE';
  if(!cycle.startDate || !cycle.endDate) return 'PENDING_CYCLE';
  return 'IN_CYCLE';
}

function occurrenceIdentity(row){
  const fields = row.metadata?.planningFields || row.metadata?.reconductedBusiness || {};
  const source = row.metadata?.manualSource || {};
  const sites = values => [...new Set((values || []).map(value => String(value)).filter(Boolean))].sort();
  const start = row.startsAt || row.imposed_start_at;
  const end = row.endsAt || row.imposed_end_at;
  const startText = start instanceof Date ? start.toISOString() : String(start || '');
  const endText = end instanceof Date ? end.toISOString() : String(end || '');
  return {
    definitionId:row.definitionId || source.definitionId || fields.sessionStructure?.definitionId || null,
    label:String(fields.activityLabel || row.activityLabel || row.eventDisplayLabel || row.label || row.title || '').trim(),
    statCom:String(fields.statCom ?? row.statCom ?? row.statcom_code ?? '').trim(),
    date:date(fields.date || start),
    startTime:fields.startTime || startText.slice(11,16),
    endTime:fields.endTime || endText.slice(11,16),
    sites:sites(fields.oiCodes || row.oiCodes || row.oiSelections || row.ois),
    sessionIndex:fields.sessionStructure?.sessionIndex || row.sessionIndex || source.sessionStructure?.sessionIndex || null
  };
}

function sameOccurrence(left, right){
  const a = occurrenceIdentity(left);
  const b = occurrenceIdentity(right);
  if(!a.date || a.date !== b.date || a.startTime !== b.startTime || a.endTime !== b.endTime) return false;
  if(a.definitionId && b.definitionId ? a.definitionId !== b.definitionId : a.label !== b.label) return false;
  if(a.statCom !== b.statCom || JSON.stringify(a.sites) !== JSON.stringify(b.sites)) return false;
  return !(a.sessionIndex && b.sessionIndex && a.sessionIndex !== b.sessionIndex);
}

module.exports = {date,nextDay,resolveProgrammeCycle,classifyProgrammeDate,occurrenceIdentity,sameOccurrence};

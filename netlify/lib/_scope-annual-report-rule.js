'use strict';

const DEFINITION_CODE = 'QV26-RAPPORT-ANNUEL-FF60DF89';
const STAT_COM = '071F3';
const APPROVED_RULE = Object.freeze({
  businessDomain:'F3',planningMode:'ANNUAL_DATE',priorityKind:'ABSOLUTE',
  blockStart:'12:00',blockEnd:'24:00'
});

function effectiveRule(metadata){
  const stored = metadata && metadata.canonicalRule || {};
  return { ...APPROVED_RULE,...stored };
}

function closesCycleYear(row,programmeYear){
  const explicit = row?.annualReportClosesCycleYear ?? row?.metadata?.annualReport?.closesCycleYear;
  if(Number.isInteger(Number(explicit)) && explicit != null) return Number(explicit);
  return row?.id === 'qv-source-923' && Number(programmeYear) === 2027 ? 2026 : null;
}

module.exports = { DEFINITION_CODE,STAT_COM,APPROVED_RULE,effectiveRule,closesCycleYear };

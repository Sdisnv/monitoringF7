'use strict';
const cycles = require('./_scope-programme-cycle');
const logic = require('../../assets/js/scope-ui-logic');
const cta = require('./_scope-cta-rules');
const coverage = require('./_scope-quo-vadis-coverage');

const text = value => String(value || '').replace(/[|\u00b7\u2013\u2014]/g,' ').replace(/\s+/g,' ').trim();
const values = array => [...new Set((array || []).map(text).filter(Boolean))].sort();
const equal = (left,right) => JSON.stringify(values(left)) === JSON.stringify(values(right));
function identity(row) {
  const ois = logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois || []).codes;
  return {...row,metadata:undefined,definitionId:null,
    label:text(row.eventDisplayLabel || row.activityLabel || row.eventLabel || row.label),activityLabel:undefined,eventDisplayLabel:undefined,
    oiSelections:ois,ois:ois};
}
function sameBusinessOccurrence(left,right) {
  const a=identity(left),b=identity(right);
  if(!a.ois.length || !b.ois.length || [...a.ois,...b.ois].some(code=>! /^(DPS|DAP|JSP):(G1|C1|B1|B2|Y[1-4])$/.test(code))) return false;
  return cycles.sameOccurrence(a,b);
}
function differences(left,right) {
  const result=[];
  for(const field of ['themes','publics','publicFreeLabels','qualificationCodes'])
    if(!equal(left[field],right[field])) result.push(field);
  if(JSON.stringify(left.responsibleSelections || []) !== JSON.stringify(right.responsibleSelections || []))
    result.push('responsibleSelections');
  if(left.validationWithdrawal || left.publicationRevision) result.push('existingWorkflowDecision');
  for(const field of ['responsible','location','room','cursus'])
    if(text(left[field]) !== text(right[field])) result.push(field);
  const a=logic.qvProgrammeParameters(left),b=logic.qvProgrammeParameters(right);
  for(const field of ['participationEvaluation','sold','ecawinExport','annualRecurrence','activityNature'])
    if(a[field] !== b[field]) result.push(field);
  if(text(left.ecawinActivityCode) !== text(right.ecawinActivityCode)) result.push('ecawinActivityCode');
  return result;
}
function reconcilePublishedOccurrences(rows) {
  const result=rows.map(row=>({...row})),entries=[],blocking=[];
  const published=result.filter(row=>row.publishedEventId && logic.qvProgrammeIsActive(row));
  const signature=row=>{
    const normalized=identity(row),value=cycles.occurrenceIdentity(normalized);
    if(!value.date || !value.startTime || !value.endTime || !normalized.ois.length
      || normalized.ois.some(code=>! /^(DPS|DAP|JSP):(G1|C1|B1|B2|Y[1-4])$/.test(code))) return null;
    return JSON.stringify([value.label,value.statCom,value.date,value.startTime,value.endTime,value.sites]);
  };
  const byIdentity=new Map();
  for(const row of published) {
    const key=signature(row);if(!key) continue;
    if(!byIdentity.has(key)) byIdentity.set(key,[]);byIdentity.get(key).push(row);
  }
  for(const row of result.filter(row=>!row.publishedEventId && logic.qvProgrammeIsActive(row) && row.status!=='ANNULE')) {
    const matches=(byIdentity.get(signature(row)) || []).filter(candidate=>candidate.publicationRevision?.status!=='PENDING'
      && candidate.publishedEventDate===cycles.date(candidate.startsAt)
      && String(candidate.publishedEventStart || '').slice(0,5)===String(candidate.startsAt || '').slice(11,16)
      && String(candidate.publishedEventEnd || '').slice(0,5)===String(candidate.endsAt || '').slice(11,16)
      && equal(candidate.publishedEventOiSelections,candidate.oiSelections)
      && sameBusinessOccurrence(row,candidate));
    if(!matches.length) continue;
    const eventIds=new Set(matches.map(candidate=>candidate.publishedEventId));
    const winner=matches[0],changed=differences(row,winner);
    if(eventIds.size!==1 || changed.length) {
      const entry={itemId:row.id,publishedItemIds:matches.map(candidate=>candidate.id),
        eventIds:[...eventIds],status:'MOA_REQUIRED',differences:changed,blocking:true};
      entries.push(entry);blocking.push(entry);continue;
    }
    row.programmeReconciliation={status:'LINKED_TO_PUBLISHED_OCCURRENCE',itemId:winner.id,eventId:winner.publishedEventId,
      rule:'QV-PUBLICATION-003',readOnly:true};
    entries.push({itemId:row.id,publishedItemIds:[winner.id],eventIds:[winner.publishedEventId],
      status:'LINKED_TO_PUBLISHED_OCCURRENCE',differences:[],blocking:false});
  }
  for(const peers of byIdentity.values()) for(let i=0;i<peers.length;i++) for(let j=i+1;j<peers.length;j++) {
    if(!sameBusinessOccurrence(peers[i],peers[j])) continue;
    const entry={itemId:peers[j].id,publishedItemIds:[peers[i].id,peers[j].id],
      eventIds:[...new Set([peers[i].publishedEventId,peers[j].publishedEventId])],
      status:'MULTIPLE_PUBLICATION_LINKS',blocking:true};
    entries.push(entry);blocking.push(entry);
  }
  return {rows:result,entries,blocking:blocking.length>0};
}

function restoreDapGroupedFormation(rows,historicalEvents,importedEvents,year=2027) {
  const result=rows.slice(),proposals=[];
  for(const session of [1,2]) {
    const label=`Formation groupée DAP 1.${session}`;
    const existing=result.filter(row=>!row.external && text(row.eventDisplayLabel || row.activityLabel || row.label)===label);
    if(existing.length) {proposals.push({label,status:'EXISTING_DECISION_PRESERVED',itemIds:existing.map(row=>row.id)});continue;}
    const events=historicalEvents.filter(row=>text(row.libelle)===label && cycles.date(row.date)?.startsWith('2026-'));
    const imports=importedEvents.filter(row=>text(row.template)===label && String(row.dateExercice).startsWith('2026-'));
    const dates=[...new Set([...events.map(row=>cycles.date(row.date)),...imports.map(row=>row.dateExercice)])];
    const id=`QV27:DAP-GROUP:1.${session}`;
    const sourceDate=dates.length===1?dates[0]:null;
    const proposedDate=sourceDate?logic.qvShiftHistoricalDate(sourceDate):null;
    const source=events.length===1?events[0]:null;
    const imported=imports.length===1?imports[0]:null;
    const statCom=source?.statcom_code || imported?.statCom || '';
    const start=source?.heure_debut || source?.heure_debut_prevue || '';
    const end=source?.heure_fin || source?.heure_fin_prevue || '';
    const legacyPublicTargets=source?.business_targets || [];
    const publicFreeLabels=values(legacyPublicTargets.map(target=>target.label));
    const holidays=cta.vaudHolidays(year).filter(row=>row.date===proposedDate);
    const evidence={rule:'QV-DAP-002',source:'EXISTING_2026_EVENT_AND_IMPORT',sourceEventIds:events.map(row=>row.evenement_id),
      sourceImportIds:imports.map(row=>row.id),sourceDate,proposedDate,shiftDays:364,
      legacyPublicTargets,
      status:holidays.length?'CONFLIT_CALENDRIER':'PROPOSITION_AUTOMATIQUE_A_CONFIRMER',calendarConflicts:holidays,
      missing:[...(!sourceDate?['Date source non univoque']:[]),
        ...(!start || !end?['Horaires']:[]),'Thème','Public cible','Responsable']};
    result.push({id,definitionId:'DAP-FORMATION-GROUPEE',occurrenceId:'QV27:DAP-GROUP:1',sessionId:id,
      sessionIndex:session,sessionCount:2,label,eventLabel:label,domain:'DAP',family:'Formation',
      statCom,code:'',businessCode:'',ois:['DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4'],publics:source?.public_codes || [],
      publicFreeLabels,themes:[],
      startsAt:proposedDate && start && end && !holidays.length?`${proposedDate}T${String(start).slice(0,5)}`:null,
      endsAt:proposedDate && start && end && !holidays.length?`${proposedDate}T${String(end).slice(0,5)}`:null,
      dapGroupedProposal:evidence,status:'A_POSITIONNER',provenance:'HISTORICAL_2026_DAP_IMPORT',
      reason:'Formation groupée DAP rétablie depuis les réalisations/imports 2026. Date proposée par la règle des 52 semaines ; horaires, thème, public et responsable à confirmer.',external:false});
    proposals.push({label,itemIds:[id],...evidence});
  }
  return {rows:result,proposals};
}
function proposeDapGroupedSecond(rows,{calendarRows,rulesByDomain}) {
  const second=rows.find(row=>row.id==='QV27:DAP-GROUP:1.2' && logic.qvProgrammeIsActive(row));
  const first=rows.find(row=>row.id==='QV27:DAP-GROUP:1.1' && logic.qvProgrammeIsActive(row));
  if(!second?.dapGroupedProposal || second.humanDecision || second.businessValidation || second.publishedEventId)
    return {rows,proposal:{status:'EXISTING_DECISION_PRESERVED'}};
  const initial=second.dapGroupedProposal.proposedDate;
  const anchor=String(first?.startsAt || first?.dapGroupedProposal?.proposedDate || '').slice(0,10);
  if(!initial || !anchor) return {rows,proposal:{status:'MOA_REQUIRED',reason:'Date de la premiere seance non demontree'}};
  const year=Number(initial.slice(0,4)),month=Number(initial.slice(5,7));
  const blocked=new Set(),occupied=[];
  for(const row of rows.filter(logic.qvProgrammeIsActive)) {
    if(row.id===second.id || row.status==='ANNULE' && !row.publishedEventId) continue;
    const ois=logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois || []).codes;
    const coversDap=ois.some(code=>/^DAP:Y[1-4]$/.test(code)) || (row.publics || []).includes('SDIS-ALL');
    if(!coversDap) continue;
    const dates=[...new Set([String(row.startsAt || '').slice(0,10),row.publishedEventDate].filter(Boolean))];
    for(const date of dates) if(date.startsWith(`${year}-${String(month).padStart(2,'0')}-`)) {
      blocked.add(date);occupied.push({date,itemId:row.id,label:row.label,ois,
        reason:'Horaire individuel inconnu : journee reservee par prudence pour les OI DAP'});
    }
  }
  for(let day=1;day<=31;day++) {
    const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if(date<initial || date<=anchor) blocked.add(date);
  }
  const candidates=[];
  for(let attempt=0;attempt<5;attempt++) {
    const candidate=coverage.pickProposalSlot({year,month,domain:'DAP',activity:second,calendarRows,rulesByDomain,
      preferredWeekday:coverage.weekdayName(initial),blockedDates:blocked});
    if(!candidate) break;candidates.push(candidate);blocked.add(candidate.date);
  }
  const rule=coverage.applicablePlanningRule('DAP',second,rulesByDomain,initial);
  const proposal={rule:'QV-DAP-003',source:'EXISTING_PICK_PROPOSAL_SLOT',initialDate:initial,firstSessionDate:anchor,
    candidates,occupied,proposedDate:candidates[0]?.date || null,
    initialClassification:coverage.classifyCandidateDate(initial,coverage.dayPolicyForActivity('DAP',second,rulesByDomain,initial),calendarRows),
    indicativeTimePolicy:rule?.timePolicy || {},
    status:candidates.length?'PROPOSITION_CALENDRIER_A_CONFIRMER':'NO_COMPLIANT_DATE',
    limitations:['Horaire individuel non confirme','Lieu et salle non confirmes','Theme et responsable non confirmes'],
    dateDecision:false,timeDecision:false,venueDecision:false};
  const evidence={...second.dapGroupedProposal,proposedDate:proposal.proposedDate,
    originalProposedDate:initial,replanning:proposal,status:proposal.status,calendarConflicts:[]};
  return {rows:rows.map(row=>row===second?{...row,dapGroupedProposal:evidence}:row),proposal};
}
module.exports={sameBusinessOccurrence,reconcilePublishedOccurrences,restoreDapGroupedFormation,proposeDapGroupedSecond};

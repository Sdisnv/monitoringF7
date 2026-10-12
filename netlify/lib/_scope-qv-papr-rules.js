'use strict';

const logic = require('../../assets/js/scope-ui-logic');
const coverage=require('./_scope-quo-vadis-coverage');
const firstPrSource=require('./data/scope-qv-programme-2027.json').rows
  .find(row=>row.label === 'Exercice PR 1.1' && Number(row.sessionIndex) === 1);

const DPS_OIS = ['DPS:G1','DPS:C1','DPS:B1','DPS:B2'];
const PAPR_PUBLICS = ['PR:CAND-PAPR','PR:FORMATEUR-PR'];
const isPrExercise=row=>/^Exercice PR(?:\s|$|-ABC)/.test(row.label || '')
  || /^QV26-EXERCICE-PR-/.test(row.sessionStructure?.definitionId || row.definitionId || '');
const isPrAbc=row=>row.label === 'Exercice PR-ABC'
  || /^QV26-EXERCICE-PR-ABC-/.test(row.sessionStructure?.definitionId || row.definitionId || '');
function moduleNumber(row){
  if(row.cursusCode === 'PAPR' && /^M0[1-7]$/.test(row.cursusStepCode || '')) return Number(row.cursusStepCode.slice(2));
  const definition=row.sessionStructure?.definitionId || row.definitionId;
  const technical=String(definition || '').match(/^QV26-PAPR-M0([2-7])$/);
  if(technical) return Number(technical[1]);
  if(definition === 'QV26-CURSUS-PAPR-MODULE-1-336731A0') return 1;
  const match = String(row.label || row.title || row.activityLabel || '').match(/^Cursus PAPR - module ([1-7])\b/);
  return match ? Number(match[1]) : null;
}

function preparatoryCycle(row,year){
  const number=moduleNumber(row.metadata?.manualSource || row);
  return Number(year) === 2027 && [1,2].includes(number)
    ? {year:2027,cursusCode:'PAPR',module:number,rule:'QV-PAPR-004'} : null;
}

function restorePaprModules(rows, history){
  const result = rows.slice();
  for(let number=1;number<=7;number++){
    const source = history.filter(row=>moduleNumber(row) === number);
    const existing = result.filter(row=>moduleNumber(row) === number && !row.external);
    if(existing.length || source.length !== 1) continue;
    const evidence = source[0];
    const [label,...themes] = evidence.title.split('|').map(value=>value.trim());
    const id = `QV27:PAPR:M0${number}`;
    result.push({id,definitionId:`QV26-PAPR-M0${number}`,occurrenceId:`${id}:O1`,sessionId:`${id}:S1`,
      label,eventLabel:label,activityKind:'CURSUS',cursusCode:'PAPR',cursusStepCode:`M0${number}`,
      domain:'PR',family:'Formation',statCom:evidence.statCom,code:'',sessionIndex:1,sessionCount:1,
      startsAt:null,endsAt:null,location:evidence.location,room:evidence.room || '',
      responsible:'C PR',ois:DPS_OIS.slice(),publics:PAPR_PUBLICS.slice(),themes,
      status:'A_POSITIONNER',provenance:'HISTORICAL_2026_TO_SCHEDULE',external:false,review:true,restoredModule:true,
      paprEvidence:{source:'QUO VADIS 2026',sourceLine:evidence.sourceLine,date:evidence.date,
        start:evidence.start,end:evidence.end,title:evidence.title},
      reason:'Module PAPR rétabli depuis QUO VADIS 2026 ; date annuelle à confirmer.'});
  }
  return result.map(row=>{
    if(row.external || row.humanDecision || row.businessValidation || row.publishedEventId) return row;
    const number = moduleNumber(row);
    if(number){
      const evidence = history.find(source=>moduleNumber(source) === number);
      const themes = evidence?.title.split('|').slice(1).map(value=>value.trim()).filter(Boolean);
      return {...row,ois:DPS_OIS.slice(),publics:PAPR_PUBLICS.slice(),responsible:'C PR',responsableFonctionCode:'C PR',
        qualificationCodes:['PAPR'],specialisation:'PAPR',cursus:'PAPR',
        ...(themes?.length ? {themes} : {}),paprModule:number};
    }
    if(isPrExercise(row)) return {...row,ois:isPrAbc(row) ? ['DPS:G1'] : DPS_OIS.slice()};
    return row;
  });
}

function annualPaprControl(rows){
  const active = rows.filter(row=>!row.external && row.status !== 'ANNULE');
  const issues = [];
  const modules = [];
  const equal = (a,b)=>JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
  for(let number=1;number<=7;number++){
    const peers = active.filter(row=>moduleNumber(row) === number);
    modules.push({number,ids:peers.map(row=>row.id)});
    if(peers.length !== 1){issues.push(`PAPR module ${number} : ${peers.length ? 'doublon' : 'absent'}.`);continue;}
    const row = peers[0];
    const ois = logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois || []).codes;
    if(!equal(ois,DPS_OIS)) issues.push(`PAPR module ${number} : les quatre OI DPS sont obligatoires.`);
    if(row.publishedEventId && !equal(row.publishedEventOiSelections || [],DPS_OIS))
      issues.push(`PAPR module ${number} : confirmation de révision OI de la publication requise.`);
    if(!PAPR_PUBLICS.every(code=>(row.publics || []).includes(code))) issues.push(`PAPR module ${number} : publics Candidats PAPR et Formateur PR requis.`);
    if(row.responsible !== 'C PR' && row.responsableFonctionCode !== 'C PR'
      && !(row.responsibleSelections || []).some(value=>value.kind === 'REFERENCE' && value.code === 'C PR'))
      issues.push(`PAPR module ${number} : responsable C PR requis.`);
    if(!(row.themes || []).some(value=>String(value).trim())) issues.push(`PAPR module ${number} : thème manquant.`);
    if(row.statCom !== '011PR') issues.push(`PAPR module ${number} : Stat.Com 011PR requis, valeur existante conservée.`);
    if(!(row.qualificationCodes || []).includes('PAPR') && row.specialisation !== 'PAPR')
      issues.push(`PAPR module ${number} : spécialisation PAPR requise.`);
    if(row.cursusCode !== 'PAPR' && row.cursus !== 'PAPR') issues.push(`PAPR module ${number} : cursus PAPR requis.`);
    if(!row.startsAt || !row.endsAt) issues.push(`PAPR module ${number} : date et horaires à confirmer.`);
  }
  const first = active.filter(row=>row.id === firstPrSource?.id
    || /^Exercice PR 1\.1$/.test(row.eventDisplayLabel || row.activityLabel || row.label || ''))
    .sort((a,b)=>String(a.startsAt || '').localeCompare(String(b.startsAt || '')))[0];
  if(!first?.startsAt) issues.push('Le début du premier exercice PR 1.1 doit être confirmé.');
  for(const number of [1,2]){
    const row = active.find(row=>moduleNumber(row) === number);
    if(!row?.endsAt || !first?.startsAt || String(row.endsAt) >= String(first.startsAt))
      issues.push(`PAPR module ${number} : doit se terminer avant le début de PR 1.1.`);
  }
  for(const row of active.filter(isPrExercise)){
    const expected = isPrAbc(row) ? ['DPS:G1'] : DPS_OIS;
    if(!equal(logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois || []).codes,expected))
      issues.push(`${row.eventDisplayLabel || row.label} : OI non conformes à la décision MOA.`);
  }
  return {rule:'QV-PAPR-001',blocking:issues.length>0,issues,modules,firstPrStart:first?.startsAt || null};
}

function proposePaprDates(rows,history,{year=2027,calendarRows=[],rulesByDomain={},cursus=[]}={}){
  const result=rows.slice();
  const proposals=[];
  const firstPr=rows.find(row=>row.id === firstPrSource?.id)
    || rows.find(row=>/^Exercice PR 1\.1$/.test(row.eventDisplayLabel || row.label || ''));
  const deadline=firstPr?.startsAt;
  let previousEnd=null;
  const day=value=>String(value || '').slice(0,10);
  const addDays=(value,delta)=>new Date(Date.parse(`${value}T12:00:00Z`)+delta*86400000).toISOString().slice(0,10);
  const actor=row=>row.responsableFonctionCode === 'C PR' || /(?:^|;)\s*(?:C PR|Chef PR)\s*(?:;|$)/.test(row.responsible || '')
    || (row.responsibleSelections || []).some(value=>value.kind === 'REFERENCE' && value.code === 'C PR');
  const overlaps=(a,b)=>a.startsAt && a.endsAt && b.startsAt && b.endsAt
    && String(a.startsAt).slice(0,16) < String(b.endsAt).slice(0,16)
    && String(b.startsAt).slice(0,16) < String(a.endsAt).slice(0,16);
  for(let number=1;number<=7;number++){
    const index=result.findIndex(row=>!row.external && moduleNumber(row) === number);
    if(index<0) continue;
    const row=result[index];
    const evidence=history.find(source=>moduleNumber(source) === number);
    const step=cursus.find(value=>value.code === 'PAPR' && value.stepCode === `M0${number}`);
    const protectedDate=Boolean(row.humanDecision || row.businessValidation || row.publishedEventId
      || row.preparation && row.startsAt || row.provenance === 'SOURCE_2027_EXPLICIT');
    const anchor=evidence && (day(evidence.date).startsWith(`${year}-`)
      ? day(evidence.date) : logic.qvProjectAnnualWeekday(evidence.date,year));
    const start=String(step?.usualStartTime || evidence?.start || '').slice(0,5);
    const end=String(step?.usualEndTime || evidence?.end || '').slice(0,5);
    const source={sourceLine:evidence?.sourceLine,date:evidence?.date,start:evidence?.start,end:evidence?.end,
      rule:'qvProjectAnnualWeekday + pickProposalSlot',anchor};
    let candidate=row;
    const rejected=[];
    if(!protectedDate && anchor && start && end){
      const nextProtected=result.filter(other=>moduleNumber(other)>number && (other.humanDecision || other.businessValidation || other.publishedEventId)
        && other.startsAt).map(other=>other.startsAt).sort()[0];
      const from=previousEnd ? addDays(day(previousEnd),1) : `${year}-01-01`;
      const to=number<=2 && deadline ? day(deadline) : nextProtected ? day(nextProtected) : `${year}-12-31`;
      const allDates=[];
      for(let date=from;date<=to && date<=`${year}-12-31`;date=addDays(date,1)) allDates.push(date);
      allDates.sort((a,b)=>(a.slice(0,7) === anchor.slice(0,7) ? 0 : 1)-(b.slice(0,7) === anchor.slice(0,7) ? 0 : 1)
        || Math.abs(Date.parse(a)-Date.parse(anchor))-Math.abs(Date.parse(b)-Date.parse(anchor)) || a.localeCompare(b));
      candidate=null;
      for(const date of allDates){
        const proposed={...row,startsAt:`${date}T${start}`,endsAt:`${date}T${end}`};
        if(number<=2 && (!deadline || proposed.endsAt >= deadline) || nextProtected && proposed.endsAt >= nextProtected) continue;
        const collisions=result.filter(other=>other.id !== row.id && !other.external && other.status !== 'ANNULE'
          && actor(other) && overlaps(proposed,other));
        if(collisions.length){if(date===anchor) rejected.push({date,reason:'RESPONSABLE_C_PR',ids:collisions.map(other=>other.id)});continue;}
        const month=Number(date.slice(5,7));
        const days=new Date(Date.UTC(year,month,0)).getUTCDate();
        const blockedDates=new Set(Array.from({length:days},(_,offset)=>`${year}-${String(month).padStart(2,'0')}-${String(offset+1).padStart(2,'0')}`).filter(value=>value!==date));
        const slot=coverage.pickProposalSlot({year,month,domain:'PR',activity:{cibleCodes:row.publics},calendarRows,rulesByDomain,
          requiredWeekday:step?.preferredDay || coverage.weekdayName(evidence.date),blockedDates});
        if(!slot){if(date===anchor) rejected.push({date,reason:'CALENDRIER_OU_JOUR_METIER'});continue;}
        candidate={...proposed,status:'PROPOSE',provenance:'AUTOMATIC_PAPR_2027',review:true,
          reason:'Proposition automatique PAPR : reconduction annuelle, calendrier et chronologie contrôlés.',
          qualificationCodes:['PAPR'],specialisation:'PAPR',cursus:'PAPR',...(step?.cursusId ? {cursusId:step.cursusId} : {})};
        break;
      }
    }
    const actual=candidate || (protectedDate ? row : {...row,startsAt:null,endsAt:null,status:'MOA_ARBITRATION'});
    const date=day(actual.startsAt),calendarYear=Number(date.slice(0,4)),calendarMonth=Number(date.slice(5,7));
    const calendarPass=Boolean(date && coverage.pickProposalSlot({year:calendarYear,month:calendarMonth,domain:'PR',
      activity:{cibleCodes:row.publics},calendarRows,rulesByDomain,
      blockedDates:new Set(Array.from({length:new Date(Date.UTC(calendarYear,calendarMonth,0)).getUTCDate()},(_,offset)=>
        `${calendarYear}-${String(calendarMonth).padStart(2,'0')}-${String(offset+1).padStart(2,'0')}`).filter(value=>value!==date))}));
    const constraints=[{name:'Sept modules distincts',pass:rows.filter(value=>moduleNumber(value)===number && !value.external).length===1},
      {name:'Calendrier 2027',pass:calendarPass && date.startsWith(`${year}-`)},
      {name:'Ordre du cursus',pass:Boolean(actual.startsAt && (!previousEnd || actual.startsAt>previousEnd))},
      ...(number<=2 ? [{name:'Fin avant PR 1.1',pass:Boolean(actual.endsAt && deadline && actual.endsAt<deadline)}] : []),
      {name:'Chevauchement C PR',pass:!result.some(other=>other.id!==actual.id && !other.external && other.status!=='ANNULE' && actor(other) && overlaps(actual,other))}];
    const calendarNotes=calendarRows.filter(value=>{
      const date=day(actual.startsAt),begin=day(value.jour || value.date);
      return date && begin<=date && date<=day(value.metadata?.dateFin || begin);
    }).map(value=>({label:value.libelle,neutralise:value.neutralise}));
    const conflicts=constraints.filter(value=>!value.pass).map(value=>value.name);
    if(!candidate) conflicts.push('Aucun créneau admissible avec les règles et horaires sourcés.');
    const proposal={module:number,itemId:row.id,date:day(actual.startsAt) || null,start:actual.startsAt?.slice(11,16) || null,
      end:actual.endsAt?.slice(11,16) || null,themes:actual.themes || [],source,constraints,calendarNotes,rejected,
      origin:protectedDate?'PROTECTED':'AUTOMATIC',status:conflicts.length?'CONFLIT':protectedDate?'DECISION_PRESERVEE':'PROPOSITION_AUTOMATIQUE',conflicts};
    result[index]={...actual,paprProposal:proposal,
      ...(row.publishedEventId && JSON.stringify((row.publishedEventOiSelections || row.oiSelections || []).slice().sort())!==JSON.stringify(DPS_OIS.slice().sort())
        ? {paprOiRevisionRequired:true} : {})};
    proposals.push(proposal);
    if(actual.endsAt) previousEnd=actual.endsAt;
  }
  return {rows:result,proposals};
}

module.exports = {DPS_OIS,PAPR_PUBLICS,moduleNumber,preparatoryCycle,restorePaprModules,annualPaprControl,proposePaprDates};

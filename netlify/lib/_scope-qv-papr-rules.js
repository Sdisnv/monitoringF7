'use strict';

const logic = require('../../assets/js/scope-ui-logic');
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
    if(!PAPR_PUBLICS.every(code=>(row.publics || []).includes(code))) issues.push(`PAPR module ${number} : publics Candidats PAPR et Formateur PR requis.`);
    if(row.responsible !== 'C PR' && row.responsableFonctionCode !== 'C PR'
      && !(row.responsibleSelections || []).some(value=>value.kind === 'REFERENCE' && value.code === 'C PR'))
      issues.push(`PAPR module ${number} : responsable C PR requis.`);
    if(!(row.themes || []).some(value=>String(value).trim())) issues.push(`PAPR module ${number} : thème manquant.`);
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

module.exports = {DPS_OIS,PAPR_PUBLICS,moduleNumber,restorePaprModules,annualPaprControl};

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {readXlsx} = require('../netlify/lib/_scope-xlsx-reader');
const {createFixture} = require('./scope-qv-local-fixture');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const {STATCOM_SUCCESSIONS} = require('../netlify/lib/_scope-statcom-referential');
const canonical = require('../netlify/lib/data/scope-qv-programme-2027.json');
const historical = require('../netlify/lib/data/scope-qv-history-2026.json');

function readWorkbook(source){
  const bytes=fs.readFileSync(source);
  const sheet=readXlsx(bytes,{sheetName:"QUO VADIS '26"});
  const text=value=>String(value==null?'':value).trim();
  const date=serial=>new Date(Date.UTC(1899,11,30)+Math.round(serial)*86400000).toISOString().slice(0,10);
  const time=serial=>{if(typeof serial!=='number')return text(serial);const minutes=Math.round(serial*1440)%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;};
  const oiColumns={G1:31,C1:32,B1:33,B2:34,Y1:38,Y2:39,Y3:40,Y4:41};
  const rows=sheet.rows.flatMap((row,index)=>index<4 || typeof row[4]!=='number' || !row[7] ? [] : [{
    sourceLine:index+1,date:date(row[4]),start:time(row[5]),end:time(row[6]),code:text(row[1]),title:text(row[7]),
    personnel:text(row[11]),location:text(row[9]),domain:text(row[14]),domainF7:text(row[12]),subDomain:text(row[13]),qui:text(row[14]),
    responsible:text(row[15]),room:text(row[16]),statCom:text(row[19]),ois:Object.entries(oiColumns).filter(([,column])=>text(row[column])).map(([oi])=>oi)
  }]);
  return {sourceWorkbook:path.basename(source),sourceSheet:sheet.sheetName,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),rows};
}

function attachRelations(snapshot){
  return snapshot.events.map(row=>({...row,business_targets:(snapshot.eventTargets || []).filter(target=>target.evenement_id===row.evenement_id)
    .map(target=>({domain:target.domaine_code,code:target.niveau_code,label:target.libelle})),
  public_codes:(snapshot.eventPublics || []).filter(target=>target.evenement_id===row.evenement_id).map(target=>target.public_code)}));
}

function counts(rows,key){return rows.reduce((result,row)=>(result[row[key]]=(result[row[key]] || 0)+1,result),{});}
const classifications=rows=>({CERTAIN:0,REGLE_GENERALISABLE:0,AMBIGU:0,...counts(rows,'classification')});
const civilDate=value=>value ? (typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))) : null;

async function audit(workbook,snapshot){
  if(snapshot.readOnly!==true) throw new Error('Snapshot must prove read-only collection');
  if(workbook.sha256!==historical.sha256 || JSON.stringify(workbook.rows)!==JSON.stringify(historical.rows)) throw new Error('Direct workbook and historical projection differ; stop and inspect');
  const events=attachRelations(snapshot);
  const qv=await createFixture(null,{events,references:snapshot}).service.listProgramme(2027);
  const businessContext={...qv,statComSuccessions:STATCOM_SUCCESSIONS};
  const scopeRows=events.filter(row=>row.date.startsWith('2026')).map(row=>({source:'SCOPE',sourceEventId:row.evenement_id,business:L.qvEnrichBusinessReference(row,businessContext)}));
  const excelRows=workbook.rows.map(row=>({source:'EXCEL',sourceLine:row.sourceLine,raw:row,business:L.qvEnrichBusinessReference(row,businessContext)}));
  const historyRows=scopeRows.concat(excelRows);
  const programmeRows=qv.canonicalProgramme.rows.filter(row=>!row.external);
  const oa=excelRows.map(row=>({status:row.business.oiQualification,codes:row.business.oiSelections}));
  const ob=scopeRows.map(row=>({status:row.business.oiQualification,codes:row.business.oiSelections}));
  const oc=programmeRows.map(row=>({status:row.oiQualification,codes:row.oiSelections}));
  const years=Object.fromEntries([2026,2027,2028].map(year=>{const value=cta.generateYear(year);return [year,{count:value.rows.length,
    nominalFridays:value.rows.filter(row=>row.id.slice(-10).startsWith(String(year))).length,first:value.rows[0],last:value.rows.at(-1),rows:value.rows}];}));
  const canonicalDivergences=canonical.rows.filter(row=>row.definitionId==='CTA-PERMANENCE').flatMap(row=>{
    const date=row.id.slice(-10);const expected=years[2027].rows.find(item=>item.id===row.id);const changes=[];
    for(const field of ['startsAt','endsAt']) if(row[field]!==expected[field]) changes.push({field,existing:row[field],computed:expected[field]});
    const original=(row.ctaAssignments || []).map(item=>({oi:item.oi,halfSection:item.halfSection}));
    const computed=cta.assignmentsForFriday(date).map(item=>({oi:item.oi,halfSection:item.halfSection}));
    if(JSON.stringify(original)!==JSON.stringify(computed)) changes.push({field:'ctaAssignments',existing:original,computed});
    return changes.length ? [{id:row.id,nominalFriday:date,changes}] : [];
  });
  const scopeDivergences=events.filter(row=>/permanence/i.test(row.libelle)).map(row=>{
    const expected=years[2027].rows.find(item=>item.id===`CTA-PERM-${row.date}`);const changes=[];
    const start=`${row.date}T${String(row.heure_debut || '').slice(0,5)}`;
    const end=`${civilDate(row.date_fin || row.date)}T${String(row.heure_fin || '').slice(0,5)}`;
    if(!expected) changes.push({field:'projection',existing:start,computed:null});
    else {
      if(start!==expected.startsAt) changes.push({field:'startsAt',existing:start,computed:expected.startsAt});
      if(end!==expected.endsAt) changes.push({field:'endsAt',existing:end,computed:expected.endsAt});
      if(JSON.stringify([...row.oi_codes].sort())!==JSON.stringify(['G1','C1','B1','B2'].sort())) changes.push({field:'ois',existing:row.oi_codes,computed:['G1','C1','B1','B2']});
      if((expected.ctaHolidayWindows || []).length) changes.push({field:'ctaHolidayWindows',existing:[],computed:expected.ctaHolidayWindows.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt,holidayLabel:item.holidayLabel}))});
    }
    return {eventId:row.evenement_id,nominalFriday:row.date,changes,storedPublicCodes:row.public_codes,halfSectionComparison:row.public_codes.length?'AVAILABLE':'NOT_DEMONSTRATED'};
  });
  return {source:{workbook:workbook.sourceWorkbook,sheet:workbook.sourceSheet,sha256:workbook.sha256,directWorkbookRead:true,scopeCapturedAt:snapshot.capturedAt,productionWrites:0},
    cta:{years,scope2026:scopeRows.filter(row=>/permanence/i.test(row.business.activityLabel)).length,scope2027:scopeDivergences.length,canonicalDivergences,scopeDivergences},
    history:{counts:classifications(historyRows.map(row=>row.business)),scopeCounts:classifications(scopeRows.map(row=>row.business)),excelCounts:classifications(excelRows.map(row=>row.business)),
      ruleEvidence:counts(historyRows.flatMap(row=>row.business.evidence),'rule'),missing:counts(historyRows.flatMap(row=>row.business.missing.map(reason=>({reason}))),'reason'),rows:historyRows},
    ois:{excel:counts(oa,'status'),scope2026:counts(ob,'status'),programme2027:counts(oc,'status'),emptySelections:{excel:oa.filter(row=>!row.codes.length).length,scope2026:ob.filter(row=>!row.codes.length).length,programme2027:oc.filter(row=>!row.codes.length).length}},
    programme:{total:programmeRows.length,dated:programmeRows.filter(row=>row.startsAt).length,historical:programmeRows.filter(row=>row.historicalProposal).length,undated:programmeRows.filter(row=>!row.startsAt).length}};
}

async function main(){
  const source=process.argv[2] || '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
  const workbook=readWorkbook(source);
  const snapshot=JSON.parse(fs.readFileSync(process.argv[3] || '/private/tmp/qv-consolidation-readonly-snapshot.json','utf8'));
  const result=await audit(workbook,snapshot);
  const output=path.join(__dirname,'../docs/scope-qv-business-audit.json');
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  const divergenceRows=result.cta.scopeDivergences.filter(row=>row.changes.length).map(row=>`| ${row.eventId} | ${row.nominalFriday} | ${row.changes.map(change=>`${change.field}: ${JSON.stringify(change.existing)} → ${JSON.stringify(change.computed)}`).join('<br>')} |`);
  fs.writeFileSync(path.join(__dirname,'../docs/scope-qv-cta-divergences.md'),[
    '# QUO VADIS - divergences CTA existantes','',`Collecte SCOPE en lecture seule : ${result.source.scopeCapturedAt}.`,'',
    'Aucune correction de production. Les demi-sections ne sont pas enregistrées sur les 53 occurrences SCOPE : leur comparaison n’est pas démontrable.','',
    `SCOPE 2026 : ${result.cta.scope2026} permanence. Programme canonique 2027 : ${result.cta.canonicalDivergences.length} divergence.`,'',
    '| Événement SCOPE | Vendredi nominal | Écarts démontrés |','| --- | --- | --- |',...divergenceRows,''].join('\n'));
  console.log(JSON.stringify({source:result.source,history:result.history.counts,scope:result.history.scopeCounts,excel:result.history.excelCounts,ois:result.ois,
    cta:Object.fromEntries(Object.entries(result.cta.years).map(([year,value])=>[year,{count:value.count,nominalFridays:value.nominalFridays,first:value.first.startsAt,last:value.last.startsAt}])),
    canonicalDivergences:result.cta.canonicalDivergences.length,scopeDivergences:result.cta.scopeDivergences.length,
    changedIntervals:result.cta.scopeDivergences.filter(row=>row.changes.some(change=>['startsAt','endsAt'].includes(change.field))),programme:result.programme,output},null,2));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={readWorkbook,attachRelations,audit};

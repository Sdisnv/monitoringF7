'use strict';
const {annualReport}=require('./data/scope-qv-moa-proposals-20261012.json');
const {DEFINITION_CODE}=require('./_scope-annual-report-rule');

function reportReference(){
  return {sourceType:'MOA_PROPOSAL',itemId:annualReport.key,programmeYear:annualReport.closesCycleYear,
    closesCycleYear:annualReport.closesCycleYear,actualDate:annualReport.date,provisional:true,
    approvalStatus:annualReport.status,approvalRequired:annualReport.approvalRequired,source:annualReport.source};
}

async function installAnnualReportProposal(client){
  const existing=(await client.query(`select future_date_id from scope_quo_vadis_future_dates
    where metadata->'annualReport'->>'closesCycleYear'=$1 order by created_at limit 1`,[String(annualReport.closesCycleYear)])).rows[0];
  const decided=(await client.query(`select obligation_id from scope_quo_vadis_obligations
    where metadata->'annualReport'->>'closesCycleYear'=$1 order by created_at limit 1`,[String(annualReport.closesCycleYear)])).rows[0];
  if(existing || decided) return {inserted:false,preservedDecision:true};
  const metadata={source:'MOA_PROPOSAL',proposalKey:annualReport.key,definitionId:DEFINITION_CODE,programmeDomain:'F3',
    annualReport:{closesCycleYear:annualReport.closesCycleYear,provisional:true,approvalStatus:'PROVISOIRE',
      approvalRequired:'CODIR',source:annualReport.source,proposedDate:annualReport.date}};
  await client.query(`insert into scope_quo_vadis_future_dates(target_year,date_debut,date_fin,activite_label,domain,remarque,metadata)
    values($1,$2,$2,'Rapport annuel','INSTITUTIONNEL',$3,$4::jsonb)`,
    [annualReport.closesCycleYear,annualReport.date,'PROVISOIRE - À VALIDER PAR LE CODIR',JSON.stringify(metadata)]);
  return {inserted:true,provisional:true};
}
module.exports={annualReport,reportReference,installAnnualReportProposal};

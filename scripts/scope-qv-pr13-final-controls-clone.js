'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const coverage=require('../netlify/lib/_scope-quo-vadis-coverage');
const logic=require('../assets/js/scope-ui-logic');
const {DATABASE,hashes,rowEvidence}=require('./scope-qv-pr13-complement-diagnostic');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-pr13-final-controls-20261013');
const snapshot=require('../docs/captures/qv-pr13-final-controls-20261013/production-business-snapshot.json');
const venues=require('../docs/captures/qv-pr13-final-controls-20261013/production-venues-readonly.json');
async function replay(query) {
  assert.equal(snapshot.readOnly,'on');assert.equal(snapshot.project.id,'bnfbqzqisdkysnoaeuej');
  const programme=(await query('select programme_id from scope_quo_vadis_programmes where annee=2027')).rows[0];
  assert.ok(snapshot.preparations.every(row=>row.programme_id===programme.programme_id));
  await query(`insert into scope_lieux(lieu_id,code,nom_court,nom_complet,oi_code,site_code,actif,metadata)
    select lieu_id,code,nom_court,nom_complet,oi_code,site_code,actif,metadata
    from jsonb_populate_recordset(null::scope_lieux,$1::jsonb) on conflict(lieu_id) do nothing`,[JSON.stringify(venues.lieux)]);
  await query(`insert into scope_salles_theorie(salle_id,code,libelle,lieu_id,parent_salle_id,actif,metadata)
    select salle_id,code,libelle,lieu_id,parent_salle_id,actif,metadata
    from jsonb_populate_recordset(null::scope_salles_theorie,$1::jsonb) on conflict(salle_id) do nothing`,[JSON.stringify(venues.salles)]);
  await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,statcom_code,
    imposed_start_at,imposed_end_at,lieu_id,salle_theorie_id,lieu_libre,responsable_fonction_code,cible_codes,statut,include_in_programme,metadata)
    select programme_id,source_type,source_ref,title,domain,statcom_code,imposed_start_at,imposed_end_at,lieu_id,salle_theorie_id,
      lieu_libre,responsable_fonction_code,cible_codes,statut,include_in_programme,metadata
    from jsonb_populate_recordset(null::scope_quo_vadis_obligations,$1::jsonb)
    on conflict(programme_id,source_type,(coalesce(source_ref,''))) do update set title=excluded.title,domain=excluded.domain,
      statcom_code=excluded.statcom_code,imposed_start_at=excluded.imposed_start_at,imposed_end_at=excluded.imposed_end_at,
      lieu_id=excluded.lieu_id,salle_theorie_id=excluded.salle_theorie_id,lieu_libre=excluded.lieu_libre,
      responsable_fonction_code=excluded.responsable_fonction_code,cible_codes=excluded.cible_codes,statut=excluded.statut,
      include_in_programme=excluded.include_in_programme,metadata=excluded.metadata`,[JSON.stringify(snapshot.preparations)]);
}
async function run() {
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  try {
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client.query.bind(client),tables);
    await client.query('BEGIN');open=true;
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve(),number=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{const name=`final_${++number}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    await replay(query);
    const main=await baselineService('2d70837773f86e457cfbd5f570f1cf647a1b8274')({database:adapter}).listProgramme(2027);
    const previous=await baselineService('0a4975b9c86f9fe3951dc4a31242de72cef0aa89')({database:adapter}).listProgramme(2027);
    const current=await createScopeQuoVadisService({database:adapter}).listProgramme(2027);
    const active=data=>data.canonicalProgramme.rows.filter(logic.qvProgrammeIsActive);
    const displayBefore=active(previous).filter(row=>row.cycleExtension && !row.publishedEventId && row.publishedEventDate
      && /^Séance (instruction|personnel) DAP$/.test(row.label));
    assert.equal(displayBefore.length,5);
    for(const row of displayBefore) {
      const fixed=active(current).find(item=>item.id===row.id);
      assert.equal(fixed.publishedEventDate,null);assert.equal(fixed.publishedEventStart,null);
      assert.equal(fixed.startsAt,row.startsAt);assert.ok(String(fixed.startsAt).startsWith('2028-'));
    }
    const cases=[];
    for(const id of ['qv-source-870','qv-source-888']) {
      const old=active(main).filter(row=>row.id===id),fixed=active(current).filter(row=>row.id===id);
      assert.equal(old.length,1);assert.equal(fixed.length,1);
      assert.equal(old[0].publishedEventId,fixed[0].publishedEventId);
      const duplicate=active(current).filter(row=>row.id!==id && row.startsAt===fixed[0].startsAt
        && row.endsAt===fixed[0].endsAt && row.statCom===fixed[0].statCom && JSON.stringify(row.oiSelections)===JSON.stringify(fixed[0].oiSelections));
      assert.equal(duplicate.length,0);
      cases.push({id,main:rowEvidence(old[0]),pr:rowEvidence(fixed[0]),classification:'ONE_PREPARATION_LINKED_TO_ONE_PUBLICATION_NO_DUPLICATE'});
    }
    const rows=active(current),dap=rows.find(row=>row.id==='QV27:DAP-GROUP:1.2');
    const dateRows=rows.filter(row=>String(row.startsAt || '').startsWith('2027-05-'));
    const blocked=new Set(dateRows.filter(row=>logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois).codes.some(code=>/^DAP:Y[1-4]$/.test(code)))
      .map(row=>String(row.startsAt).slice(0,10)));
    const candidates=[],excluded=[];
    const rulesByDomain={DAP:snapshot.rules.filter(row=>row.domain==='DAP' && row.active).map(row=>({
      dayPolicy:row.day_policy,timePolicy:row.time_policy,validFrom:row.valid_from,validTo:row.valid_to,createdAt:row.created_at}))};
    for(let day=1;day<6;day++) blocked.add(`2027-05-${String(day).padStart(2,'0')}`);
    for(let iteration=0;iteration<31;iteration++) {
      const candidate=coverage.pickProposalSlot({year:2027,month:5,domain:'DAP',activity:dap,calendarRows:snapshot.calendar,
        rulesByDomain,preferredWeekday:'THURSDAY',blockedDates:blocked});
      if(!candidate) break;candidates.push(candidate);blocked.add(candidate.date);
    }
    assert.equal(dap.dapGroupedProposal.proposedDate,candidates[0].date);
    assert.equal(dap.dapGroupedProposal.proposedDate,'2027-05-13');
    assert.equal(current.dapGroupedProposals.find(row=>row.itemIds?.includes(dap.id)).proposedDate,dap.dapGroupedProposal.proposedDate);
    assert.deepEqual(dap.dapGroupedProposal.replanning.candidates.slice(0,2).map(row=>row.date),['2027-05-13','2027-05-20']);
    assert.equal(dap.startsAt,null);assert.equal(dap.endsAt,null);
    const replanner=require('../netlify/lib/_scope-qv-programme-reconciliation').proposeDapGroupedSecond;
    const first=rows.find(row=>row.id==='QV27:DAP-GROUP:1.1');
    const decisions=rows.map(row=>row.id===dap.id?{...row,humanDecision:true,startsAt:'2027-05-20T18:30',endsAt:'2027-05-20T21:30'}:row);
    assert.deepEqual(replanner(decisions,{calendarRows:snapshot.calendar,rulesByDomain}).rows,decisions);
    const busy=Array.from({length:31},(_,index)=>({id:`fixture-busy-${index}`,label:'Occupation DAP de recette',
      startsAt:`2027-05-${String(index+1).padStart(2,'0')}T19:00`,ois:['DAP:Y1']}));
    const unavailable=replanner([first,{...dap,dapGroupedProposal:{...dap.dapGroupedProposal,proposedDate:'2027-05-06'}},...busy],
      {calendarRows:snapshot.calendar,rulesByDomain});
    assert.equal(unavailable.proposal.status,'NO_COMPLIANT_DATE');assert.equal(unavailable.proposal.occupied.length,31);
    for(const date of ['2027-05-06','2027-05-13','2027-05-20','2027-05-27']) {
      const conflicts=dateRows.filter(row=>String(row.startsAt).slice(0,10)===date
        && logic.qvNormalizeOiSelections(row,row.oiSelections || row.ois).codes.some(code=>/^DAP:Y[1-4]$/.test(code)));
      excluded.push({date,day:coverage.classifyCandidateDate(date,coverage.dayPolicyForActivity('DAP',dap,rulesByDomain,date),snapshot.calendar),
        activities:conflicts.map(rowEvidence)});
    }
    for(const row of previous.canonicalProgramme.rows) {
      const now=current.canonicalProgramme.rows.find(candidate=>candidate.id===row.id);assert.ok(now,row.id);
      for(const field of ['statCom','code','businessCode','definitionId','occurrenceId','sessionId','publishedEventId','publishedEventCode'])
        assert.deepEqual(now[field],row[field],row.id+':'+field);
    }
    const during=await hashes(query,tables);
    for(const table of ['scope_evenements','scope_qv_publication_links','scope_participations','scope_affectations','scope_journal_metier'])
      assert.deepEqual(during[table],before[table],table);
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const result={target:'CLONE_REPLAY_OF_AUTHORIZED_PRODUCTION_BUSINESS_READS',productionWrites:false,
      counts:{main:active(main).length,previousPr:active(previous).length,current:active(current).length},cases,
      dapCandidates:candidates.slice(0,10),excluded,statComCompared:previous.canonicalProgramme.rows.length,
      displayRegression:{before:displayBefore.map(rowEvidence),after:displayBefore.map(row=>rowEvidence(active(current).find(item=>item.id===row.id))),status:'FIXED'},
      dapReplanning:current.dapGroupedReplanning,humanDecisionPreserved:true,noAvailableDateCase:'PASS',
      statComIdentical:previous.canonicalProgramme.rows.length,rollback:{status:'PASS',tables:tables.length},before,after,status:'PASS'};
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'clone-final-controls.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({counts:result.counts,cases:cases.map(row=>({id:row.id,classification:row.classification})),
      candidates:result.dapCandidates,excluded:excluded.map(row=>({date:row.date,dayClass:row.day.dayClass,activities:row.activities.map(item=>item.label)})),rollback:result.rollback}));
  } finally {if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={replay};

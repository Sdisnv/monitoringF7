'use strict';

const assert = require('node:assert/strict');
const coverage = require('../netlify/lib/_scope-quo-vadis-coverage');
const cta = require('../netlify/lib/_scope-cta-rules');
const { createQvReferentialManagement } = require('../netlify/lib/_scope-qv-referential-management');
const { createFixture } = require('./scope-qv-local-fixture');
const { readWorkbook } = require('./scope-qv-business-audit');
const programme2027 = require('../netlify/lib/data/scope-qv-programme-2027.json');

async function main(){
  let passed = 0;
  const test = async (name,fn) => { await fn(); console.log(`PASS ${++passed} - ${name}`); };
  const workbook = readWorkbook('/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx');
  await test('classeur historique ouvert directement, empreinte et 919 lignes',()=>{
    assert.equal(workbook.sha256,'58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742');
    assert.equal(workbook.rows.length,919);
  });
  await test('ABC et PIONNIER restent G1 uniquement dans le programme 2027',()=>{
    const special=(programme2027.rows||[]).filter(row=>!row.external && /\bABC\b|\bPIO\b|PIONNIER/i.test(row.label||''));
    assert.ok(special.length > 0);
    for(const site of ['C1','B1','B2']) assert.equal(special.filter(row=>(row.ois||[]).includes(site)).length,0);
    assert.ok(special.some(row=>row.label==='Formation cadres ABC' && (row.ois||[]).includes('G1')));
    assert.equal(workbook.rows.find(row=>row.sourceLine===325).ois.join(','),'G1,C1,B1,B2');
  });
  await test('PIONNIER CSU-nvb suit les cinq sections explicites de la semaine precedente',()=>{
    const rows = workbook.rows.filter(row => row.date.startsWith('2026') && row.title === 'Instr sct - PIONNIER CSU-nvb');
    assert.equal(rows.length,5);
    for(const row of rows){
      const section = row.personnel.match(/Section\s+([1-5])/i);
      assert.ok(section);
      assert.equal(cta.instructionPublicForDate(row.date,'G1','section',true),`N0${section[1]}`);
      assert.notEqual(cta.instructionPublicForDate(row.date,'G1','section'),`N0${section[1]}`);
    }
  });
  await test('sections et demi-sections calculees par site, sans reserve',()=>{
    for(const date of ['2027-01-09','2027-01-16','2028-07-15']){
      for(const site of ['G1','C1','B1','B2']){
        const section = cta.instructionPublicForDate(date,site,'section');
        const half = cta.instructionPublicForDate(date,site,'demi-section');
        assert.match(section,/^N0[1-5]$/);
        assert.equal(half.slice(0,3),section);
        assert.match(half,/^N0[1-5][ab]$/);
        assert.notEqual(site === 'G1' ? section : 'N00','N06');
        if(site !== 'G1') assert.notEqual(section,'N04');
      }
    }
  });
  await test('instruction G1 lundi, C1 B1 B2 samedi matin',()=>{
    for(const site of ['G1','C1','B1','B2']){
      const expected = site === 'G1' ? 'MONDAY' : 'SATURDAY';
      const slot = coverage.pickProposalSlot({year:2028,month:3,domain:'DPS',activity:{oi:site,instructionKind:'section'},
        calendarRows:[],requiredWeekday:expected});
      assert.ok(slot);
      assert.equal(slot.weekday,expected);
    }
    assert.deepEqual(coverage.usualTime('DPS',{startsAt:'07:30',endsAt:'10:30'}),{start:'07:30',end:'10:30',minutes:180});
  });
  await test('public de section datee apparait dans la fiche activite, sans changer le site source',async()=>{
    const fixture=createFixture(null);
    fixture.preparations.push({obligation_id:'instruction-local',programme_id:'local-qv-2027',source_type:'DPS_RULE',
      source_ref:'G1:ABC:2027',title:'Instr. section — ABC',domain:'DPS',cible_codes:['G1'],statut:'PROPOSE',metadata:{}});
    fixture.proposals.push({proposal_id:'section-proposal',obligation_id:'instruction-local',starts_at:'2027-03-15T18:30',
      ends_at:'2027-03-15T21:30',day_class:'PREFERE',status:'PROPOSE',reasons:[],
      conflict_summary:{sectionPublic:'N03',sectionPublicOi:'G1',sectionPublicRule:'CTA_INSTRUCTION_WEEK'}});
    const qv=await fixture.service.listProgramme(2027);
    const activity=qv.activities.find(row=>row.activityId==='instruction-local');
    assert.deepEqual(activity.cibleCodes,['N03']);
    assert.equal(activity.sectionPublic,'N03');
    assert.deepEqual(fixture.preparations.find(row=>row.obligation_id==='instruction-local').cible_codes,['G1']);
  });
  await test('regle 2028 appliquee seulement a sa periode et horaire conserve',()=>{
    const rules={AUTO:[
      {validFrom:'2027-01-01',validTo:'2027-12-31',dayPolicy:{MONDAY:'PREFERE',TUESDAY:'INTERDIT',WEDNESDAY:'INTERDIT',THURSDAY:'INTERDIT',FRIDAY:'INTERDIT',SATURDAY:'INTERDIT',SUNDAY:'INTERDIT'},timePolicy:{usualStart:'08:00',usualEnd:'10:00'}},
      {validFrom:'2028-01-01',validTo:null,dayPolicy:{MONDAY:'INTERDIT',TUESDAY:'INTERDIT',WEDNESDAY:'INTERDIT',THURSDAY:'INTERDIT',FRIDAY:'INTERDIT',SATURDAY:'PREFERE',SUNDAY:'INTERDIT'},timePolicy:{usualStart:'09:00',usualEnd:'12:00'}}
    ]};
    assert.equal(coverage.applicablePlanningRule('AUTO',{},rules,'2027-06-01').timePolicy.usualStart,'08:00');
    assert.equal(coverage.applicablePlanningRule('AUTO',{},rules,'2028-06-01').timePolicy.usualStart,'09:00');
    assert.equal(coverage.pickProposalSlot({year:2027,month:6,domain:'AUTO',activity:{},calendarRows:[],rulesByDomain:rules}).weekday,'MONDAY');
    assert.equal(coverage.pickProposalSlot({year:2028,month:6,domain:'AUTO',activity:{},calendarRows:[],rulesByDomain:rules}).weekday,'SATURDAY');
  });
  await test('creation version 2028 ferme 2027 sans desactiver son historique',async()=>{
    const oldId='11111111-1111-4111-8111-111111111111';
    const calls=[];
    const database={
      async query(sql,params=[]){
        calls.push({sql,params});
        if(sql.includes('from scope_domaines')) return {rows:[{code:'DPS'}]};
        if(sql.includes('select rule_id,valid_from,valid_to')) return {rows:[{rule_id:oldId,valid_from:'2027-01-01',valid_to:null}]};
        if(sql.includes('returning rule_id')) return {rows:[{rule_id:'22222222-2222-4222-8222-222222222222'}]};
        return {rows:[]};
      },
      async transaction(fn){return fn(this);}
    };
    const dayPolicy=Object.fromEntries(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(day=>[day,'AUTORISE']));
    const result=await createQvReferentialManagement(database).createRule({domain:'DPS',dayPolicy,usualStart:'08:00',usualEnd:'11:00',validFrom:'2028-01-01',name:'Instruction DPS',priority:10});
    assert.equal(result.ok,true);
    assert.ok(calls.some(call=>call.sql.includes('set valid_to=$2') && call.params[0]===oldId && call.params[1]==='2027-12-31'));
    assert.ok(!calls.some(call=>call.sql.includes('set active=false') && call.params[0]===oldId));
  });
  await test('chevauchement refuse sans modifier les versions precedentes',async()=>{
    const calls=[];
    const database={
      async query(sql,params=[]){
        calls.push({sql,params});
        if(sql.includes('from scope_domaines')) return {rows:[{code:'DPS'}]};
        if(sql.includes('select rule_id,valid_from,valid_to')) return {rows:[
          {rule_id:'11111111-1111-4111-8111-111111111111',valid_from:'2027-01-01',valid_to:null},
          {rule_id:'22222222-2222-4222-8222-222222222222',valid_from:'2029-01-01',valid_to:null}
        ]};
        return {rows:[]};
      },
      async transaction(fn){return fn(this);}
    };
    const dayPolicy=Object.fromEntries(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(day=>[day,'AUTORISE']));
    const result=await createQvReferentialManagement(database).createRule({domain:'DPS',dayPolicy,usualStart:'08:00',usualEnd:'11:00',validFrom:'2028-01-01',validTo:'2029-12-31'});
    assert.equal(result.ok,false);
    assert.ok(!calls.some(call=>/^update scope_quo_vadis_planning_rules/.test(call.sql)));
  });
  await test('catalogue 2028 consulte les versions valables en 2028',async()=>{
    const fixture=createFixture(null);
    await fixture.service.listProgramme(2028);
    const query=fixture.queries.find(item=>item.sql.includes('from scope_event_definitions d'));
    assert.deepEqual(query.params,['2028-12-31','2028-01-01']);
  });
  await test('correction humaine FOBA 2 seule survit aux calculs 2028 et 2029',async()=>{
    const fixture=createFixture(null);
    const source=programme2027.rows.find(row=>row.label==='Exercice FOBA 2');
    assert.ok(source);
    await fixture.service.updateProgrammePreparation(source.id,{year:2027,activityLabel:source.label,statCom:'010FOBA',
      date:'2027-06-15',startTime:'18:30',endTime:'21:30',oiCodes:[],publicCodes:['FOBA:2'],validateBusiness:true});
    const first=await fixture.service.generateProgramme(2028);
    const child=first.canonicalProgramme.rows.find(row=>row.lineage && row.lineage.key===source.id);
    assert.deepEqual(child.publics,['FOBA:2']);
    assert.equal(child.statCom,'010FOBA');
    const again=await fixture.service.generateProgramme(2028);
    assert.equal(again.generation.newObligations,0);
    const next=await fixture.service.generateProgramme(2029);
    const grandchild=next.canonicalProgramme.rows.find(row=>row.lineage && row.lineage.key===source.id);
    assert.deepEqual(grandchild.publics,['FOBA:2']);
    assert.ok(!grandchild.publics.includes('AUTO:CAND-EA'));
  });
  console.log(`QV REPAIR 2: ${passed}/${passed} PASS`);
}

main().catch(error=>{console.error(error);process.exitCode=1;});

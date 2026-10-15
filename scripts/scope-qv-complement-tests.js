'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),base='e7672369e08727849e96ef56d4462840d9dfca0e';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const old=file=>execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:4000000});
const out=path.join(root,'docs/captures/qv-complement');

async function serverAvailability(){
  const sessions=require('../netlify/lib/_local-sessions'),original=sessions.requireSession;
  const names=['MONITORING_F7_AUTH_SECRET','MONITORING_F7_AUTH_METHODS'],environment=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  process.env.MONITORING_F7_AUTH_SECRET='targeted-auth-fixture-only-not-for-real-authentication';process.env.MONITORING_F7_AUTH_METHODS='local';
  const auth=require('../netlify/lib/_auth-utils'),token=auth.signToken({typ:'access',sub:'fixture',nip:'fixture',provider:'local',sid:'fixture'},600);
  const result=[];
  try{
    sessions.requireSession=async()=>{throw new Error('local_session_unavailable');};
    for(const file of ['netlify/functions/auth-me.js','netlify/functions/auth-refresh.js','netlify/functions/scope.js']){
      const statuses=[];
      for(const source of [old(file),read(file)]){
        const exports={},context={exports,module:{exports},require:require('node:module').createRequire(path.join(root,file)),process,Buffer,console,URL};
        vm.runInNewContext(source,context,{filename:file});
        const response=await exports.handler({httpMethod:file.includes('refresh')?'POST':'GET',headers:{authorization:`Bearer ${token}`},body:'{}',path:'/api/scope/quo-vadis/programmes/2027'});
        statuses.push(response.statusCode);
      }
      assert.deepEqual(statuses,[401,503]);result.push({file,before:statuses[0],after:statuses[1]});
    }
    assert.equal(auth.authFailureResponse(new Error('Token expiré.')).statusCode,401);
    assert.equal(auth.authFailureResponse(new Error('local_session_expired_or_revoked')).statusCode,401);
    return result;
  }finally{
    sessions.requireSession=original;
    for(const name of names) if(environment[name]===undefined) delete process.env[name];else process.env[name]=environment[name];
  }
}

async function authScenario(source,mode){
  let token='expired-access',unauthorized=0,refreshes=0,calls=0,cookie='valid-cookie';
  const sandbox={Response,URLSearchParams,Date,Promise,Error,TextEncoder,setInterval,clearInterval,
    window:{MonitoringApiClient:{getAccessToken:()=>token,setAccessToken:value=>{token=value;}}},
    fetch:async (url,options)=>{
      if(url==='/auth/refresh'){
        refreshes++;
        if(mode==='network') throw new TypeError('Load failed');
        const status=mode==='unavailable'?503:mode==='expired'?401:200;
        if(status===200) cookie='fresh-access';
        return new Response(JSON.stringify(status===200?{ok:true,accessToken:'fresh-access'}:{ok:false}),{status,headers:{'content-type':'application/json'}});
      }
      calls++;
      const status=mode==='forbidden'?403:(options.headers.Authorization===`Bearer ${cookie}`?200:401);
      return new Response(JSON.stringify(status===200?{user:{nip:'fixture'}}:{error:status===403?'forbidden':'unauthorized'}),{status,headers:{'content-type':'application/json'}});
    }};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);vm.runInContext(read('assets/js/scope-api.js'),sandbox);
  const client=sandbox.window.ScopeApi.createHttpClient({onUnauthorized:()=>unauthorized++});
  let status;
  try{await client.sessionMe();status=200;}catch(error){status=error.status;}
  return {status,unauthorized,refreshes,calls,token};
}

async function run(){
  const serverTransient=await serverAvailability();
  const before=await authScenario(old('assets/js/scope-auth-idle.js'),'valid');
  assert.equal(before.status,401);assert.equal(before.unauthorized,1);assert.equal(before.token,'expired-access');
  const after=await authScenario(read('assets/js/scope-auth-idle.js'),'valid');
  assert.equal(after.status,200);assert.equal(after.unauthorized,0);assert.equal(after.token,'fresh-access');
  const expired=await authScenario(read('assets/js/scope-auth-idle.js'),'expired');assert.equal(expired.status,401);assert.equal(expired.unauthorized,1);
  const forbidden=await authScenario(read('assets/js/scope-auth-idle.js'),'forbidden');assert.equal(forbidden.status,403);assert.equal(forbidden.refreshes,0);assert.equal(forbidden.unauthorized,0);
  const transient={};
  for(const mode of ['network','unavailable']){transient[mode]=await authScenario(read('assets/js/scope-auth-idle.js'),mode);assert.equal(transient[mode].unauthorized,0);assert.equal(transient[mode].status,0);}
  const idle=require('../assets/js/scope-auth-idle');let now=1000,expiredCount=0;
  const shared=new Map(),storage={getItem:key=>shared.get(key),setItem:(key,value)=>shared.set(key,value)};
  const first=idle.createIdleController({now:()=>now,storage,disableChannel:true,onExpire:()=>expiredCount++});
  const second=idle.createIdleController({now:()=>now,storage,disableChannel:true});
  now+=8*60000;second.recordHumanEvent({type:'input'});now+=60000;assert.equal(first.shouldExpire(),false);
  now+=10*60000;assert.equal(first.tick(),'expire');assert.equal(expiredCount,1);
  const catalogue=L.qvProgrammePublicCatalogue();
  for(const [group,anchor,code,label] of [['Commandement','C DAP','CMDT:CHEF-SECTION-DAP','Chef section DAP'],['AUTO','AUTO:3','AUTO:CAND-VL','Candidat cond VL']]){
    const items=catalogue.find(item=>item.group===group).items;
    assert.equal(items.findIndex(item=>item[0]===code),items.findIndex(item=>item[0]===anchor)+1);
    assert.equal(L.qvProgrammePublicReferenceCode(label),code);
  }
  for(const label of ['Resp matériel','Préposé matériel']) assert.ok(catalogue.find(g=>g.group==='Encadrement').items.some(item=>item[1]===label));
  const history=require('../netlify/lib/data/scope-qv-history-2026.json');
  const oldContext={module:{exports:{}},globalThis:{}};vm.runInNewContext(old('assets/js/scope-ui-logic.js'),oldContext);
  const previous=JSON.parse(JSON.stringify(oldContext.module.exports.qvApplyDapConduite([],history.rows,{year:2027}))).rows;
  const current=L.qvApplyDapConduite([],history.rows,{year:2027}).rows;assert.equal(current.length,16);
  const expected=[['18:30','19:30','18:30','19:00','19:00','19:30'],['19:00','20:00','19:30','20:00','19:00','19:30'],
    ['20:00','21:00','20:00','20:30','20:30','21:00'],['20:30','21:30','21:00','21:30','20:30','21:00']];
  for(const row of current){
    const previousRow=previous.find(item=>item.id===row.id);const {conduiteSlots:ignored,...fields}=row;
    const {conduiteSlots:oldSlots,...oldFields}=previousRow;assert.deepEqual(fields,oldFields);
    row.conduiteSlots.forEach((slot,i)=>{
      const keys=['startsAt','endsAt','conduiteStartsAt','conduiteEndsAt','connaissanceVehiculeStartsAt','connaissanceVehiculeEndsAt'];
      assert.deepEqual(keys.map(key=>slot[key].slice(11)),expected[i]);
      for(const [start,end,minutes] of [['startsAt','endsAt',60],['conduiteStartsAt','conduiteEndsAt',30],['connaissanceVehiculeStartsAt','connaissanceVehiculeEndsAt',30]])
        assert.equal((Date.parse(slot[end])-Date.parse(slot[start]))/60000,minutes);
    });
  }
  assert.deepEqual([...new Set(current.flatMap(row=>row.ois))].sort(),['Y1','Y2','Y3','Y4']);
  assert.deepEqual(L.qvDapConduiteSlots('2028-03-01').map(s=>[s.startsAt.slice(11),s.conduiteStartsAt.slice(11)]),expected.map(s=>[s[0],s[2]]));
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'targeted-results.json'),JSON.stringify({status:'PASS',base,
    checks:['A-G: 16 soirées Y1-Y4, seules places 1/3 corrigées, durées 60/30/30 et créneaux réutilisables en 2028',
      'H-N: bearer périmé reproduit avant et corrigé après renouvellement, 401 réel, 403 distinct, réseau/503 transitoires, activité inter-onglets et délai inchangé',
      'O-R: quatre références descriptives, codes/positions exacts, ancre Chef DAP réutilisant C DAP'],
    auth:{before,after,expired,forbidden,transient,serverTransient},dap:{rows:current.length,expectedSlots:expected},productionWrites:false},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',dapRows:current.length,authBefore:before.status,authAfter:after.status}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

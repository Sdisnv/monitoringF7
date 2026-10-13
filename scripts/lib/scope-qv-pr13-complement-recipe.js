'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const revisions=require('../../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'../..');
const BASELINE='66b38c6f81551075dccea6f00b27333d1b76db71';
function baselineService() {
  const cache=new Map();
  const load=relative=>{
    if(cache.has(relative)) return cache.get(relative).exports;
    const source=execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'});
    if(relative.endsWith('.json')) {const entry={exports:JSON.parse(source)};cache.set(relative,entry);return entry.exports;}
    const file=path.join(root,relative),entry=new Module(file,module);entry.filename=file;
    entry.paths=Module._nodeModulePaths(path.dirname(file));cache.set(relative,entry);const original=Module.createRequire(file);
    entry.require=request=>!request.startsWith('.')?original(request):load((()=>{
      const target=path.relative(root,path.resolve(path.dirname(file),request));return path.extname(target)?target:`${target}.js`;
    })());entry._compile(source,file);return entry.exports;
  };
  return load('netlify/lib/_scope-quo-vadis-service.js').createScopeQuoVadisService;
}
async function seedPublishedAliases(query,qv) {
  const ids=[];
  for(const sourceRef of ['qv-source-870','qv-source-888']) {
    const source=qv.canonicalProgramme.rows.find(row=>row.id===sourceRef);
    if(!source?.publishedEventId) throw new Error('Existing clone publication required');
    const id=`QV27:MANUAL:RECIPE-ALIAS-${sourceRef}`;
    const fields={...revisions.fieldsFromProgrammeRow(source,qv),locationLabel:source.location || '',roomLabel:source.room || ''};
    const metadata={source:'QV_PROGRAMME_PREPARATION',manualSource:{...source,id,publishedEventId:undefined,
      publishedEventCode:undefined,preparation:undefined,manualCreation:true},planningFields:fields,
      humanDecision:true,automatedSnapshot:false,planningStatus:'PLANIFIE'};
    await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,statcom_code,
      lieu_id,salle_theorie_id,metadata) values($1,'MANUAL',$2,$3,'DAP',$4,$5,$6,$7::jsonb)`,
      [qv.programme.programmeId,id,fields.activityLabel,fields.statCom,fields.lieuId,fields.salleTheorieId,JSON.stringify(metadata)]);
    ids.push(id);
  }
  return ids;
}
function migrate(query) {
  const file=path.join(root,'netlify/lib/_scope-schema.js'),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));const original=entry.require.bind(entry);
  entry.require=id=>id==='./_postgres'?{query,transaction:f=>f({query})}:original(id);
  entry._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports.recipeMigration=migrateQuoVadisFinalIncremental20261012;\n',file);
  return entry.exports.recipeMigration();
}
module.exports={BASELINE,baselineService,seedPublishedAliases,migrate};

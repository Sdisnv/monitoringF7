'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {execFileSync,spawnSync}=require('node:child_process');
async function run(){
  const root=path.resolve(__dirname,'..'),cli=fs.realpathSync(execFileSync('which',['netlify'],{encoding:'utf8'}).trim());
  const localRequire=createRequire(cli),toml=localRequire('@iarna/toml');
  const configFile=localRequire.resolve('@netlify/config');
  const {normalizeContextProps,mergeContext}=await import(path.join(path.dirname(configFile),'context.js'));
  const config=normalizeContextProps({config:toml.parse(fs.readFileSync(path.join(root,'netlify.toml'),'utf8')),origin:'config'});
  const branch='codex/scope-qv-post-recette-moa-20261014',cases=[];
  for(const [context,name,blocked] of [['deploy-preview',branch,true],['branch-deploy',branch,true],['production','main',false],['deploy-preview','unrelated-branch',false]]){
    const resolved=mergeContext({config,context,branch:name,logs:{}});
    assert.equal(resolved.build.ignore,blocked?'exit 0':undefined);
    if(blocked) assert.equal(spawnSync('bash',['-c',resolved.build.ignore]).status,0);
    assert.equal(resolved.build.command,'node scripts/build-scope-static.js');
    cases.push({context,branch:name,automaticDeployBlocked:blocked,buildCommand:resolved.build.command});
  }
  const dir=path.join(root,'docs/captures/qv-moa-20261014');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'delivery-gate.json'),JSON.stringify({status:'PASS',resolver:'Netlify official installed @netlify/config',
    settingsChangedRemotely:false,cases},null,2)+'\n');console.log(JSON.stringify({status:'PASS',cases}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

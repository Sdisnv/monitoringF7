'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname,'..');
const BASELINE = '9fde68077f35bede72ef08f3b3dc65ea5f93c224';

function loadModule(relative,source,database){
  const filename = path.join(root,relative);
  const loaded = new Module(filename,module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  if(database){
    const originalRequire = Module.createRequire(filename);
    loaded.require = name => name === './_postgres' ? database : originalRequire(name);
  }
  loaded._compile(source,filename);
  return loaded.exports;
}

function baselineService(){
  const relative = 'netlify/lib/_scope-quo-vadis-service.js';
  return loadModule(relative,execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'})
    + '\nmodule.exports.rawProgramme2027 = canonicalBusinessProgramme2027;\n');
}

function currentService(){
  const relative = 'netlify/lib/_scope-quo-vadis-service.js';
  return loadModule(relative,fs.readFileSync(path.join(root,relative),'utf8')
    + '\nmodule.exports.rawProgramme2027 = canonicalBusinessProgramme2027;\n');
}

function responsibleMigration(database){
  const relative = 'netlify/lib/_scope-schema.js';
  return loadModule(relative,fs.readFileSync(path.join(root,relative),'utf8')
    + '\nmodule.exports.moaResponsibleMigration = migrateQuoVadisMoaResponsible20261012;\n',database).moaResponsibleMigration;
}

function preservedFields(rows){
  return rows.map(row => Object.fromEntries(['id','code','businessCode','publishedEventId','publishedEventCode',
    'occurrenceId','sessionId','definitionId','statCom','domain','programmeDomain','persistenceDomain',
    'startsAt','endsAt','ois','publics','themes','status','humanDecision','businessValidation']
    .map(key => [key,row[key]]))).sort((a,b) => a.id.localeCompare(b.id));
}

function input(row,extra={}){
  return {year:2027,statCom:row.statCom,oiCodes:[],publicCodes:row.publics || [],
    date:'2027-06-15',startTime:'10:00',endTime:'11:00',saveAction:'SAVE',...extra};
}

module.exports = {BASELINE,baselineService,currentService,responsibleMigration,preservedFields,input};

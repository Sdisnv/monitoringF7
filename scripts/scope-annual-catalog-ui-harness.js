'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const logic = require('../assets/js/scope-ui-logic');

const ROOT = path.resolve(__dirname,'..');
const UI_SOURCE = fs.readFileSync(path.join(ROOT,'assets/js/scope-ui.js'),'utf8');

function makeNode(){
  return {
    value:'',checked:false,innerHTML:'',dataset:{},style:{},
    classList:{ toggle(){},add(){},remove(){} },
    addEventListener(){},querySelector(){ return null; },querySelectorAll(){ return []; },
    closest(){ return null; },getAttribute(){ return null; },setAttribute(){},removeAttribute(){},focus(){}
  };
}

function createCatalogUiHarness(){
  const root = makeNode();
  const permissions = ['references:manage'];
  const allowed = new Set(permissions);
  const location = { hash:'#/quo-vadis/catalogue-annuel',search:'',pathname:'/scope.html',hostname:'localhost' };
  const storage = { getItem(){ return null; },setItem(){},removeItem(){} };
  const document = {
    getElementById(id){ return id === 'scope-root' ? root : makeNode(); },
    querySelector(){ return null; },querySelectorAll(){ return []; },addEventListener(){},dispatchEvent(){},body:makeNode()
  };
  const context = {
    console,setTimeout,clearTimeout,encodeURIComponent,URLSearchParams,
    requestAnimationFrame(callback){ if(typeof callback === 'function') callback(); },
    Event:function Event(type){ this.type = type; },CSS:{ escape(value){ return String(value); } },
    location,localStorage:storage,sessionStorage:storage,document,
    window:{
      __SCOPE_UI_TEST_HOOKS__:true,ScopeUiLogic:logic,ScopeCharts:null,CurrentRoles:['ADMINISTRATEUR'],CurrentPermissions:permissions,
      MonitoringRBAC:{ has(permission){ return allowed.has(permission); } },location,history:{ replaceState(){} },
      addEventListener(){},scrollTo(){},document,localStorage:storage,sessionStorage:storage
    }
  };
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(UI_SOURCE,context,{ filename:'assets/js/scope-ui.js' });
  const hooks = context.window.ScopeUiTestHooks;
  hooks.state.annualCatalogFilters.year = 2027;
  return { hooks,root,context };
}

function catalogPayload(){
  const domains = ['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR','ZZZ'];
  return {
    readiness:{ status:'SCHEMA_READY' },year:2027,
    activities:domains.map((domain,index) => ({
      domain,code:index === 0 ? 'DPS-EXERCICE' : index === 1 ? 'DPS-INSTRUCTION-SECTION' : `${domain}-TECHNICAL-CODE`,
      label:index === 0 ? 'Exercice DPS' : index === 1 ? 'Exercice DAP' : `${domain} activité métier`,
      requiredOccurrences:index === 0 ? null : index === 8 ? 1 : null,
      windowStart:index === 8 ? '2027-01-01' : null,windowEnd:index === 8 ? '2027-12-31' : null,
      themedOccurrenceCount:index === 8 ? 1 : 0,unthemedOccurrenceCount:index === 8 ? 0 : null,
      preparedOccurrenceCount:0,status:index === 8 ? 'DRAFT' : 'A_DEFINIR'
    }))
  };
}

function activityPayload(options = {}){
  const requirement = Object.prototype.hasOwnProperty.call(options,'requirement') ? options.requirement : null;
  return {
    readiness:{ status:'SCHEMA_READY' },readyTransition:options.readyTransition || { allowed:false,message:null },
    activity:{ definitionId:'definition-dps',code:'DPS-INSTRUCTION-SECTION',label:'Instruction de section DPS',domain:'DPS',familyCode:'FOCO',activityType:'INSTRUCTION',version:{ versionCode:'V1',fingerprint:'f'.repeat(64),description:'Instruction opérationnelle de section.' } },
    annualRequirement:requirement,
    configuration:{
      publics:[{ public_label:'DPS général',public_code:'DPS-GEN' }],
      sessions:[{ label:'Instruction',duration_minutes:120 }],periodicity:{ periodicity_type:'ANNUAL' },
      qualifications:[],roles:[],locations:[],constraints:[],statCom:[],availableThemes:options.availableThemes || []
    },
    annualThemeAssignments:options.assignments || [],
    generation:{ occurrences:[],sessions:[],preparedOccurrenceCount:options.preparedOccurrenceCount || 0 }
  };
}

function draftRequirement(overrides = {}){
  return { annualRequirementId:'requirement-2027',year:2027,status:'DRAFT',requiredOccurrences:1,windowStart:'2027-03-01',windowEnd:'2027-03-31',variantCode:'DEFAULT',priority:100,...overrides };
}

function visibleText(html){
  return String(html || '').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&rsaquo;|&#8250;/g,'›').replace(/\s+/g,' ').trim();
}

module.exports = { createCatalogUiHarness,catalogPayload,activityPayload,draftRequirement,visibleText };

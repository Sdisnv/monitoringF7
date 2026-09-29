'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const functional = require('../netlify/lib/_scope-functional-catalog');
const { createCatalogUiHarness,activityPayload,draftRequirement } = require('./scope-annual-catalog-ui-harness');
const { shell } = require('./scope-annual-catalog-c13-preview');

const REFERENCES = Object.freeze({
  publics:[
    { code:'JSP-GEN',label:'Jeunes JSP',domain:'JSP' },
    { code:'DPS-G1',label:'DPS G1',domain:'DPS' },
    { code:'DPS-C1',label:'DPS C1',domain:'DPS' },
    { code:'PR-PAPR',label:'PR PAPR',domain:'PR' }
  ],
  sites:[
    { code:'G1',locationCode:'G1-CASERNE',label:'Caserne G1 – Yverdon-les-Bains' },
    { code:'C1',locationCode:'C1-CASERNE',label:'Caserne C1 – Grandson' },
    { code:'B1',locationCode:'B1-CASERNE',label:'Caserne B1 – Yvonand' },
    { code:'B2',locationCode:'B2-CASERNE',label:'Caserne B2 – Concise' },
    { code:'Y1',locationCode:'Y1-LOCAL',label:'Local Y1 – Chavannes-le-Chêne' },
    { code:'Y2',locationCode:'Y2-LOCAL',label:'Local Y2 – Belmont-sur-Yverdon' },
    { code:'Y3',locationCode:'Y3-LOCAL',label:'Local Y3 – Montagny-près-Yverdon' },
    { code:'Y4',locationCode:'Y4-LOCAL',label:'Local Y4 – Bonvillars' }
  ]
});

function write(directory,name,html){
  const file=path.join(directory,`${name}.html`);
  fs.writeFileSync(file,shell(html,name).replace('<title>C13 ','<title>C18 '));
  return file;
}

function jspPayload(){
  const schedule=functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:10,defaultSites:['G1','C1','B1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,label:'Séance unique',durationMinutes:120 }],publicCodes:['JSP-GEN','DPS-G1'],windowStart:'2027-01-11',startTime:'19:00',endTime:'21:00' });
  const payload=activityPayload({ requirement:draftRequirement({ annualRequirementId:'jsp-2027',status:'READY',requiredOccurrences:10,windowStart:'2027-01-11',windowEnd:'2027-12-15' }),
    readyTransition:{ allowed:true,message:null },configuration:{ functionalProfile:{ recurrence_kind:'RECURRENT',default_occurrences:10,default_sites:['G1','C1','B1'],rule_mode:'GENERAL' },
      publics:[{ public_label:'Jeunes JSP',public_code:'JSP-GEN' },{ public_label:'DPS G1',public_code:'DPS-G1' }],sessions:[{ code:'S1',sequence:1,label:'Séance unique',duration_minutes:120,mandatory:true }],periodicity:{ periodicity_type:'TIMES_PER_YEAR' },
      qualifications:[],roles:[],locations:[],constraints:[],statCom:[],availableThemes:[] } });
  payload.activity={ definitionId:'jsp-definition',code:'JSP-EXERCICE',label:'Exercice JSP',domain:'JSP',familyCode:null,activityType:'EXERCISE',active:true,
    version:{ versionCode:'C5-B-V1',fingerprint:'j'.repeat(64),description:'Exercice annuel JSP décliné par réalisation et par site.' } };
  payload.annualProgramEntry={ program_state:'ACTIVE',extraordinary:false,site_codes:['G1','C1','B1'],occurrence_override:null };
  payload.references=REFERENCES;
  payload.generation={ occurrences:Array.from({ length:10 },(_,index) => ({ occurrence_number:index+1 })),sessions:[],preparedOccurrenceCount:0 };
  payload.siteSlots=schedule.slots.map((slot) => ({ planned_site_slot_id:slot.slotId,site_code:slot.siteCode,preferred_date:slot.date,
    preferred_start_time:slot.startTime,preferred_end_time:slot.endTime,duration_minutes:slot.durationMinutes,
    location_label:(REFERENCES.sites.find((site) => site.code === slot.siteCode) || {}).label || '',
    label_complement:slot.occurrenceNumber === 1 ? 'Les bases' : '',
    final_label:functional.scheduledActivityLabel('Exercice JSP',slot.occurrenceNumber,1,1,slot.occurrenceNumber === 1 ? 'Les bases' : ''),
    occurrence_number:slot.occurrenceNumber,session_sequence:1,occurrence_session_count:1,session_code:slot.sessionCode,session_label:slot.sessionLabel,
    public_codes:['JSP-GEN','DPS-G1'],effective_public_codes:['JSP-GEN','DPS-G1'],public_source:'DEFINITION',status:slot.status }));
  return payload;
}

function jspMultiSessionPayload(){
  const payload=jspPayload();
  const schedule=functional.proposeAnnualSchedule({ definitionCode:'JSP-EXERCICE',activityLabel:'Exercice JSP',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:Array.from({ length:3 },(_,index) => ({ code:`S${index+1}`,sequence:index+1,label:`Séance ${index+1}`,durationMinutes:120,labelComplement:index === 0 ? 'Les bases' : '' })),
    publicCodes:['JSP-GEN','DPS-G1'],windowStart:'2027-02-10',startTime:'19:00',endTime:'21:00' });
  payload.configuration.sessions=Array.from({ length:3 },(_,index) => ({ code:`S${index+1}`,sequence:index+1,label:`Séance ${index+1}`,duration_minutes:120,mandatory:true }));
  payload.annualRequirement.requiredOccurrences=1;
  payload.generation={ occurrences:[{ occurrence_number:1 }],sessions:[],preparedOccurrenceCount:1 };
  payload.annualProgramEntry.site_codes=['G1'];
  payload.siteSlots=schedule.slots.map((slot) => ({ planned_site_slot_id:slot.slotId,site_code:slot.siteCode,preferred_date:slot.date,
    preferred_start_time:slot.startTime,preferred_end_time:slot.endTime,duration_minutes:slot.durationMinutes,location_label:'Caserne G1 – Yverdon-les-Bains',
    label_complement:slot.labelComplement,final_label:slot.finalLabel,occurrence_number:1,session_sequence:slot.sessionSequence,occurrence_session_count:3,
    session_code:slot.sessionCode,session_label:slot.sessionLabel,public_codes:slot.publicCodes,effective_public_codes:slot.publicCodes,public_source:'DEFINITION',status:slot.status }));
  return payload;
}

function formationGroupeePayload(){
  const payload=activityPayload({ requirement:draftRequirement({ annualRequirementId:'formation-groupee-2027',status:'DRAFT',requiredOccurrences:1 }),
    configuration:{ functionalProfile:{ recurrence_kind:'RECURRENT',default_occurrences:1,default_sites:['G1'],rule_mode:'GENERAL' },
      publics:[{ public_label:'DPS G1, C1, B1, B2 et OFSI',public_code:'DPS-G1' }],sessions:Array.from({ length:6 },(_,index) => ({ code:`1.${index+1}`,sequence:index+1,label:`Séance 1.${index+1}`,duration_minutes:120,mandatory:true })),
      periodicity:{ periodicity_type:'ANNUAL' },qualifications:[{ competence_code:'OFSI',binding_type:'PREREQUISITE',mandatory:true }],roles:[],locations:[],constraints:[],statCom:[{ statcom_code:'0162F7',mode:'FULL_DURATION',aggregation_rule:'PER_PARTICIPANT' }],availableThemes:[] } });
  payload.activity={ definitionId:'formation-groupee',code:'DPS-FORMATION-GROUPEE',label:'Formation groupée',domain:'DPS',familyCode:'FOCO',activityType:'TRAINING',active:true,
    version:{ versionCode:'C18-V1',fingerprint:'m'.repeat(64),description:'Formation permanente composée de six séances obligatoires.' } };
  payload.annualProgramEntry={ program_state:'ACTIVE',extraordinary:false,site_codes:['G1'] };
  payload.references=REFERENCES;
  payload.siteSlots=[];
  return payload;
}

function prPayload(){
  const payload=activityPayload({ requirement:draftRequirement({ annualRequirementId:'pr1-2027',status:'DRAFT',requiredOccurrences:1 }),
    configuration:{ functionalProfile:{ recurrence_kind:'RECURRENT',default_occurrences:1,default_sites:['G1'],rule_mode:'GENERAL' },
      publics:[{ public_label:'PR PAPR',public_code:'PR-PAPR' },{ public_label:'DPS général',public_code:'DPS-GEN' }],
      sessions:Array.from({ length:6 },(_,index) => ({ code:`S${index+1}`,sequence:index+1,label:`Séance ${index+1}`,duration_minutes:120,mandatory:true })),
      periodicity:{ periodicity_type:'ANNUAL' },qualifications:[{ competence_code:'PAPR',binding_type:'PREREQUISITE',mandatory:true }],
      roles:[],locations:[],constraints:[],statCom:[{ statcom_code:'011PR',mode:'FULL_DURATION',aggregation_rule:'PER_PARTICIPANT' }],availableThemes:[] } });
  payload.activity={ definitionId:'pr1-definition',code:'PR-EXERCICE-1',label:'Exercice PR',domain:'PR',familyCode:'PR',activityType:'EXERCISE',active:true,
    version:{ versionCode:'C18-V1',fingerprint:'p'.repeat(64),description:'Exercice PR composé de six séances obligatoires.' } };
  payload.annualProgramEntry={ program_state:'ACTIVE',extraordinary:false,site_codes:['G1'] };
  payload.references=REFERENCES;
  payload.siteSlots=Array.from({ length:6 },(_,index) => ({ planned_site_slot_id:`pr-slot-${index+1}`,site_code:'G1',preferred_date:`2027-03-${String(index+1).padStart(2,'0')}`,
    preferred_start_time:'19:00',preferred_end_time:'21:00',duration_minutes:120,location_label:'Caserne G1 – Yverdon-les-Bains',label_complement:'',
    final_label:`Exercice PR 1.${index+1}`,occurrence_number:1,session_sequence:index+1,occurrence_session_count:6,session_code:`S${index+1}`,
    session_label:`Séance ${index+1}`,public_codes:['PR-PAPR'],effective_public_codes:['PR-PAPR'],public_source:'DEFINITION',status:'PROPOSED' }));
  return payload;
}

function extraordinaryPayload(){
  const payload=activityPayload({ requirement:draftRequirement({ annualRequirementId:'extra-2027',status:'DRAFT',requiredOccurrences:1 }),
    configuration:{ functionalProfile:{ recurrence_kind:'NON_RECURRENT',default_occurrences:1,default_sites:['C1'],rule_mode:'GENERAL' },
      publics:[{ public_label:'DPS général',public_code:'DPS-GEN' }],sessions:[{ code:'S1',sequence:1,label:'Formation exceptionnelle',duration_minutes:180,mandatory:true }],
      periodicity:{ periodicity_type:'ONE_OFF' },qualifications:[],roles:[],locations:[],constraints:[],statCom:[],availableThemes:[] } });
  payload.activity={ definitionId:'extra-definition',code:'DPS-FORMATION-EXTRA-2027',label:'Formation exceptionnelle 2027',domain:'DPS',activityType:'TRAINING',active:true,
    version:{ versionCode:'C15-V1',fingerprint:'e'.repeat(64),description:'Activité ponctuelle ajoutée à la programmation 2027.' } };
  payload.annualProgramEntry={ program_state:'ACTIVE',extraordinary:true,site_codes:['C1'],occurrence_override:1 };
  payload.references=REFERENCES;
  payload.siteSlots=[];
  return payload;
}

function catalogPayload(){
  return { readiness:{ status:'SCHEMA_READY' },year:2027,references:REFERENCES,activities:[
    { domain:'JSP',code:'JSP-EXERCICE',label:'Exercice JSP',activityType:'EXERCISE',recurrenceKind:'RECURRENT',defaultOccurrences:10,defaultSites:['G1','C1','B1'],requiredOccurrences:10,siteCodes:['G1','C1','B1'],status:'READY',programState:'ACTIVE' },
    { domain:'DPS',code:'DPS-FORMATION-GROUPEE',label:'Formation groupée',activityType:'TRAINING',recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],requiredOccurrences:1,siteCodes:['G1'],status:'DRAFT',programState:'ACTIVE' },
    { domain:'PR',code:'PR-EXERCICE-1',label:'Exercice PR',activityType:'EXERCISE',recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1'],requiredOccurrences:1,siteCodes:['G1'],status:'DRAFT',programState:'ACTIVE' },
    { domain:'DPS',code:'DPS-FORMATION-EXTRA-2027',label:'Formation exceptionnelle 2027',activityType:'TRAINING',recurrenceKind:'NON_RECURRENT',defaultOccurrences:1,defaultSites:['C1'],requiredOccurrences:1,siteCodes:['C1'],status:'DRAFT',programState:'ACTIVE' }
  ] };
}

function buildPreview(outputDirectory = path.join(os.tmpdir(),'scope-c18-preview')){
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const { hooks }=createCatalogUiHarness();
  const jsp=jspPayload();
  const files={};
  files.catalogue=write(outputDirectory,'catalogue-regroupe',hooks.renderAnnualCatalogHtml(catalogPayload()));
  files.jsp=write(outputDirectory,'fiche-exercice-jsp',hooks.renderAnnualCatalogActivityHtml(jsp));
  files.programmeJsp=write(outputDirectory,'programmation-jsp-2027',hooks.renderAnnualCatalogActivityHtml(jsp));
  files.multiSession=write(outputDirectory,'fiche-multi-seances',hooks.renderAnnualCatalogActivityHtml(formationGroupeePayload()));
  files.jspMultiSession=write(outputDirectory,'fiche-jsp-multi-sessions',hooks.renderAnnualCatalogActivityHtml(jspMultiSessionPayload()));
  files.pr=write(outputDirectory,'fiche-exercice-pr-1',hooks.renderAnnualCatalogActivityHtml(prPayload()));
  files.extraordinary=write(outputDirectory,'activite-extraordinaire',hooks.renderAnnualCatalogActivityHtml(extraordinaryPayload()));
  hooks.state.annualCatalogConflicts=[{ activityA:'Exercice JSP',activityB:'Formation JSP',date:'2027-03-02',startTime:'19:30',endTime:'21:30',publicCodes:['JSP-GEN'] }];
  files.conflict=write(outputDirectory,'conflit-public',hooks.renderAnnualCatalogActivityHtml(jsp));
  hooks.state.annualCatalogConflicts=[];
  hooks.state.annualCatalogDefinitionEdit=true;
  files.edit=write(outputDirectory,'modification-definition',hooks.renderAnnualCatalogActivityHtml(jsp));
  return files;
}

if(require.main === module) process.stdout.write(`${JSON.stringify(buildPreview(process.argv[2]),null,2)}\n`);

module.exports={ buildPreview,jspPayload,jspMultiSessionPayload,formationGroupeePayload,prPayload,extraordinaryPayload,catalogPayload,REFERENCES };

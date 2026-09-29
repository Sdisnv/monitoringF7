'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const functional = require('../netlify/lib/_scope-functional-catalog');

test('C19 libellé canonique occurrence/session/complément',() => {
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,''),'Exercice JSP 1');
  assert.equal(functional.scheduledActivityLabel('Exercice JSP',1,1,1,'Les bases'),'Exercice JSP 1 · Les bases');
  assert.equal(functional.scheduledActivityLabel('Exercice PR',1,6,6,'Ventilation'),'Exercice PR 1.6 · Ventilation');
  assert.equal(functional.scheduledActivityLabel('Instruction de demi-section',3,1,1,''),'Instruction de demi-section 3');
});

test('C19 publics/sites structurés et durée calculée',() => {
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'DPS-INSTR-DEMI-SECTION',activityLabel:'Instruction de demi-section',year:2027,
    profile:{ recurrenceKind:'RECURRENT',defaultOccurrences:1,defaultSites:['G1','C1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,durationMinutes:150 }],publicCodes:['dps-g1','DPS-C1','DPS-G1'],windowStart:'2027-02-08',startTime:'19:00',endTime:'21:30' });
  assert.equal(schedule.slots.length,2);
  assert.deepEqual(schedule.slots[0].publicCodes,['DPS-C1','DPS-G1']);
  assert.equal(schedule.slots[0].durationMinutes,150);
  assert.equal(schedule.slots[0].durationLabel,'2 h 30');
});

test('C19 règles calendaires distinguent jours interdits et statuts multiples',() => {
  const result = functional.evaluateCalendarDate('2027-04-04',{
    forbiddenWeekdays:['SUNDAY'],
    dayStatuses:{ PUBLIC_HOLIDAY:'FORBIDDEN',SCHOOL_VACATION_EVE:'PENALTY' }
  },{ '2027-04-04':{ publicHoliday:true,schoolVacationEve:true } });
  assert.equal(result.allowed,false);
  assert.ok(result.dayStatuses.includes('PUBLIC_HOLIDAY'));
  assert.ok(result.dayStatuses.includes('SCHOOL_VACATION_EVE'));
  assert.ok(result.reasons.some((reason) => reason.includes('jour interdit')));
});

test('C19 date imposée ne bloque pas la journée lorsque les compatibilités sont réelles',() => {
  const triathlon = { activityLabel:'Triathlon Yverdon',definitionCode:'EXT-TRIATHLON',date:'2027-09-04',startTime:'07:00',endTime:'18:00',
    publicCodes:['PUBLIC-EXTERNE'],roleCodes:['ROLE-DPS-B1-LOG'],siteCode:'G1',fixedDate:true,priority:40 };
  const instruction = { activityLabel:'Instruction de demi-section',definitionCode:'DPS-INSTR-DEMI-SECTION',date:'2027-09-04',startTime:'10:00',endTime:'12:00',
    publicCodes:['DPS-C1'],roleCodes:['ROLE-DPS-C1'],siteCode:'C1',priority:100 };
  assert.equal(functional.compatibilityBetween(triathlon,instruction).state,'COMPATIBLE');
});

test('C19 exclusivité journée est une règle distincte de date imposée',() => {
  const allSdis = { activityLabel:'Tous SDIS',definitionCode:'DPS-TOUS-SDIS',date:'2027-05-08',startTime:'08:00',endTime:'17:00',
    publicCodes:['SDIS-ALL'],dayExclusive:true,priority:10 };
  const other = { activityLabel:'Formation FOBA',definitionCode:'FOBA-FORMATION',date:'2027-05-08',startTime:'19:00',endTime:'21:00',
    publicCodes:['FOBA-1'],priority:100 };
  const conflict = functional.compatibilityBetween(allSdis,other);
  assert.equal(conflict.state,'CONFLICT');
  assert.match(functional.explainConflict(conflict),/journée est réservée.*ensemble du SDIS/);
});

test('C19 conflits publics et rôles sont expliqués, avec priorité métier',() => {
  const dps = { activityLabel:'Exercice DPS B1',definitionCode:'DPS-B1',date:'2027-06-01',startTime:'19:00',endTime:'21:00',
    publicCodes:['DPS-B1'],roleCodes:['CHEF-SITE-B1'],priority:100 };
  const em = { activityLabel:'Séance État-major',definitionCode:'EM-SEANCE',date:'2027-06-01',startTime:'19:30',endTime:'21:30',
    publicCodes:['EM'],roleCodes:['CHEF-SITE-B1'],priority:20 };
  const conflict = functional.compatibilityBetween(dps,em);
  assert.equal(conflict.state,'CONFLICT');
  assert.equal(conflict.priorityWinner,'Séance État-major');
  const message = functional.explainConflict(conflict);
  assert.match(message,/Responsable indispensable déjà mobilisé/);
  assert.doesNotMatch(message,/CHEF-SITE-B1/);
});

test('C19 permutation explicite peut rendre PR compatible malgré public partagé',() => {
  const pr = { activityLabel:'Exercice PR 1.1',definitionCode:'PR-EXERCICE',date:'2027-06-03',startTime:'19:00',endTime:'21:00',
    publicCodes:['PR-PAPR'],sessionCount:6,sessionSequence:1,permutationAllowed:true,priority:100 };
  const em = { activityLabel:'Séance État-major',definitionCode:'EM-SEANCE',date:'2027-06-03',startTime:'19:30',endTime:'21:30',
    publicCodes:['PR-PAPR'],sessionCount:1,permutationAllowed:false,priority:20 };
  const result = functional.compatibilityBetween(pr,em);
  assert.equal(result.state,'COMPATIBLE');
  assert.equal(result.permutationApplied,true);
});

test('C19 propositions automatiques sont limitées à trois et évitent les conflits',() => {
  const proposals = functional.proposeBestDates({ definitionCode:'DPS-INSTR-SECTION',activityLabel:'Instruction de section',year:2027,
    windowStart:'2027-01-01',windowEnd:'2027-01-31',startTime:'19:00',endTime:'21:00',siteCode:'G1',publicCodes:['DPS-G1'],
    calendarRules:{ priorityWeekdays:['TUESDAY'],forbiddenWeekdays:['SUNDAY'] },
    occupiedSlots:[{ activityLabel:'Séance cadres',date:'2027-01-05',startTime:'19:00',endTime:'21:00',publicCodes:['DPS-G1'],siteCode:'G1' }] });
  assert.equal(proposals.length,3);
  assert.ok(!proposals.some((proposal) => proposal.date === '2027-01-05'));
  assert.equal(proposals[0].compatibility,'COMPATIBLE');
});

test('C19 validation visible QUO VADIS reste distincte des écritures opérationnelles',() => {
  const schedule = functional.proposeAnnualSchedule({ definitionCode:'EXT-TRIATHLON',activityLabel:'Triathlon Yverdon',year:2027,
    profile:{ recurrenceKind:'NON_RECURRENT',defaultOccurrences:1,defaultSites:['G1'],ruleMode:'GENERAL' },
    sessions:[{ code:'S1',sequence:1,durationMinutes:660 }],publicCodes:['PUBLIC-EXTERNE'],windowStart:'2027-09-04',startTime:'07:00',endTime:'18:00' });
  schedule.slots[0].status = 'VALIDATED';
  assert.equal(schedule.slots[0].finalLabel,'Triathlon Yverdon 1');
  assert.equal(schedule.operationalWrites,false);
  assert.equal(schedule.eventPublication,false);
});

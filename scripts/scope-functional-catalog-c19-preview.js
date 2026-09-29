'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const functional = require('../netlify/lib/_scope-functional-catalog');

function esc(value){ return String(value == null ? '' : value).replace(/[&<>"']/g,(char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]); }
function slot(label,date,start,end,publicCodes,extra = {}){ return { activityLabel:label,date,startTime:start,endTime:end,publicCodes,siteCode:extra.siteCode || 'G1',...extra }; }
function stateSquare(label,color){ return `<span class="state"><i style="background:${color}"></i>${esc(label)}</span>`; }

function buildModel(){
  const occupied = [
    slot('Séance État-major','2027-06-01','19:30','21:30',['EM'],{ definitionCode:'EM-SEANCE',roleCodes:['CHEF-SITE-B1'],priority:20 }),
    slot('Triathlon Yverdon','2027-09-04','07:00','18:00',['PUBLIC-EXTERNE'],{ definitionCode:'EXT-TRIATHLON',roleCodes:['ROLE-DPS-B1-LOG'],fixedDate:true,priority:40 })
  ];
  const sectionProposals = functional.proposeBestDates({ definitionCode:'DPS-INSTR-SECTION',activityLabel:'Instruction de section',year:2027,
    windowStart:'2027-01-01',windowEnd:'2027-01-31',startTime:'19:00',endTime:'21:00',siteCode:'G1',publicCodes:['DPS-G1'],
    calendarRules:{ priorityWeekdays:['TUESDAY'],secondaryWeekdays:['THURSDAY'],forbiddenWeekdays:['SUNDAY'],dayStatuses:{ PUBLIC_HOLIDAY:'FORBIDDEN',SCHOOL_VACATION_EVE:'PENALTY' } },
    calendar:{ '2027-01-01':{ publicHoliday:true },'2027-01-04':{ schoolVacationEve:true } },occupiedSlots:occupied });
  const prSlots = Array.from({ length:6 },(_,index) => slot(functional.scheduledActivityLabel('Exercice PR',1,index+1,6,''),`2027-03-${String(index+1).padStart(2,'0')}`,'19:00','21:00',['PR-PAPR'],{
    definitionCode:'PR-EXERCICE',sessionCount:6,sessionSequence:index+1,permutationAllowed:true,roleCodes:['FORMATEUR-PR'],priority:80
  }));
  const jsp = [1,2,3].map((number) => slot(functional.scheduledActivityLabel('Exercice JSP',number,1,1,number === 1 ? 'Les bases' : ''),`2027-04-${String(10 + number).padStart(2,'0')}`,'09:00','11:00',['JSP-GEN'],{ definitionCode:'JSP-EXERCICE',siteCode:'G1' }));
  const compatibleDay = [
    slot('Triathlon Yverdon','2027-09-04','07:00','18:00',['PUBLIC-EXTERNE'],{ definitionCode:'EXT-TRIATHLON',fixedDate:true,roleCodes:['ROLE-DPS-B1-LOG'],priority:40 }),
    slot('Instruction de demi-section','2027-09-04','10:00','12:00',['DPS-C1'],{ definitionCode:'DPS-DEMI-SECTION',roleCodes:['ROLE-DPS-C1'],siteCode:'C1',priority:100 })
  ];
  const roleConflict = functional.compatibilityBetween(slot('Exercice DPS B1','2027-06-01','19:00','21:00',['DPS-B1'],{ roleCodes:['CHEF-SITE-B1'],priority:100 }),occupied[0]);
  const prPermutation = functional.compatibilityBetween(prSlots[0],slot('Séance État-major','2027-03-01','19:30','21:30',['PR-PAPR'],{ priority:20 }));
  const exclusive = functional.compatibilityBetween(slot('Tous SDIS','2027-05-08','08:00','17:00',['SDIS-ALL'],{ dayExclusive:true,priority:10 }),slot('Formation FOBA','2027-05-08','19:00','21:00',['FOBA-1'],{ priority:100 }));
  return { sectionProposals,prSlots,jsp,compatibleDay,roleConflict,prPermutation,exclusive };
}

function html(model){
  const rows = [
    ['A','DPS / Instruction de section','Occurrence, site, public, horaire, règle calendrier et placement automatique',model.sectionProposals.map((p) => `${p.date} ${p.startTime}-${p.endTime} · ${p.siteCode} · ${p.reasons.join(', ')}`).join('<br>')],
    ['B','DPS / Instruction de demi-section','Deux activités compatibles le même jour',model.compatibleDay.map((p) => `${p.startTime}-${p.endTime} · ${p.activityLabel} · ${p.publicCodes.join(', ')}`).join('<br>')],
    ['C','PR','Six sessions, permutation et propositions',model.prSlots.map((p) => p.activityLabel).join('<br>')],
    ['D','JSP','Occurrences simples et complément',model.jsp.map((p) => p.activityLabel).join('<br>')],
    ['E','État-major','Conflit rôle indispensable partagé',`${stateSquare('À arbitrer','#c98412')} ${esc(functional.explainConflict(model.roleConflict))}`],
    ['F','PR + État-major','Compatibilité par permutation explicite',stateSquare(model.prPermutation.permutationApplied ? 'Compatible par permutation' : 'À arbitrer','#2f9e5a')],
    ['G','Événement externe','Date imposée sans exclusivité journée',stateSquare('Triathlon visible et compatible avec instruction C1','#4f84d6')],
    ['H','Tous SDIS','Exclusivité journée explicite',`${stateSquare('Conflit','#DE000A')} ${esc(functional.explainConflict(model.exclusive))}`]
  ];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SCOPE C19 Preview</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;color:#17202b;background:#f6f8fa}.wrap{max-width:1500px;margin:0 auto;padding:24px}header{border-left:4px solid #DE000A;padding-left:16px;margin-bottom:18px}h1{margin:0;font-size:28px}p{color:#4c5965}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.case{background:#fff;border:1px solid #d8e0e7;border-radius:4px;padding:14px}.case h2{font-size:16px;margin:0 0 8px}.meta{font-size:12px;text-transform:uppercase;font-weight:700;color:#596775}.content{font-size:14px;line-height:1.55}.state{display:inline-flex;align-items:center;gap:8px;color:#17202b}.state i{width:8px;height:8px;display:inline-block}@media(max-width:960px){.grid{grid-template-columns:1fr}.wrap{padding:16px}}</style></head>
  <body><main class="wrap"><header><h1>SCOPE C19 — preview recette MOA</h1><p>Preview locale interactive alimentée par le moteur C19 in-memory. Aucune écriture DB, aucun événement opérationnel, aucune publication.</p></header>
  <section class="grid">${rows.map(([code,title,desc,content]) => `<article class="case"><div class="meta">Cas ${code}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p><div class="content">${content}</div></article>`).join('')}</section></main></body></html>`;
}

function buildPreview(outputDirectory = path.join(os.tmpdir(),'scope-c19-preview')){
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const file = path.join(outputDirectory,'index.html');
  fs.writeFileSync(file,html(buildModel()));
  return { index:file,note:'Preview in-memory: aucune écriture DB/opérationnelle.' };
}

if(require.main === module) process.stdout.write(`${JSON.stringify(buildPreview(process.argv[2]),null,2)}\n`);

module.exports={ buildPreview,buildModel };

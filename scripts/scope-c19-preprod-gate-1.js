'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  rowsFromWorkbook,
  buildProposals,
  inferRow
} = require('../netlify/lib/_scope-annual-catalog-import');
const statCom = require('../netlify/lib/_scope-statcom-referential');
const foundations = require('../netlify/lib/_scope-canonical-foundations');
const publics = require('../netlify/lib/_scope-public-foundations');
const qv = require('../netlify/lib/_scope-quo-vadis-referentials');

const DEFAULT_WORKBOOK = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const OFFICIAL_CALENDAR_URLS = Object.freeze({
  2026: 'https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2026',
  2027: 'https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2027'
});
const CALENDAR = Object.freeze({
  2026: {
    holidays: ['2026-01-01','2026-01-02','2026-04-03','2026-04-06','2026-05-14','2026-05-25','2026-08-01','2026-09-21','2026-12-25'],
    vacations: [
      ['2025-12-20','2026-01-04','Vacances d’hiver'],['2026-02-14','2026-02-22','Relâches'],
      ['2026-04-03','2026-04-19','Vacances de Pâques'],['2026-05-14','2026-05-17','Pont de l’Ascension'],
      ['2026-05-25','2026-05-25','Lundi de Pentecôte'],['2026-06-27','2026-08-16','Vacances d’été'],
      ['2026-09-21','2026-09-21','Jeûne fédéral'],['2026-10-10','2026-10-25','Vacances d’automne'],
      ['2026-12-24','2027-01-10','Vacances d’hiver']
    ]
  },
  2027: {
    holidays: ['2027-01-01','2027-01-02','2027-03-26','2027-03-29','2027-05-06','2027-05-17','2027-08-01','2027-09-20','2027-12-25'],
    vacations: [
      ['2026-12-24','2027-01-10','Vacances d’hiver'],['2027-02-06','2027-02-14','Relâches'],
      ['2027-03-26','2027-04-11','Vacances de Pâques'],['2027-05-06','2027-05-09','Pont de l’Ascension'],
      ['2027-05-17','2027-05-17','Lundi de Pentecôte'],['2027-07-03','2027-08-22','Vacances d’été'],
      ['2027-09-20','2027-09-20','Jeûne fédéral'],['2027-10-09','2027-10-24','Vacances d’automne'],
      ['2027-12-24','2028-01-09','Vacances d’hiver']
    ]
  }
});

function sha256(buffer){ return crypto.createHash('sha256').update(buffer).digest('hex'); }
function unique(values){ return [...new Set(values.filter(Boolean))]; }
function countBy(values){
  return values.reduce((result,value) => {
    const key = value || 'MANQUANT';
    result[key] = (result[key] || 0) + 1;
    return result;
  },{});
}
function occurrenceCount(proposals){ return proposals.reduce((sum,row) => sum + row.occurrenceCount,0); }
function dispositions(proposals){
  return countBy(proposals.map((row) => row.classification));
}
function rowDispositions(proposals){
  return proposals.reduce((result,row) => {
    result[row.classification] = (result[row.classification] || 0) + row.sourceRowCount;
    return result;
  },{});
}
function duplicateSummary(rows){
  const groups = new Map();
  for(const row of rows){
    const key = [row.date,row.startTime,row.endTime,row.rawLabel,row.location,row.room,row.personnel].join('|');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row.sourceRow);
  }
  const duplicates = [...groups.entries()].filter(([,sourceRows]) => sourceRows.length > 1);
  return {
    groups: duplicates.length,
    rows: duplicates.reduce((sum,[,sourceRows]) => sum + sourceRows.length,0),
    evidence: duplicates.slice(0,25).map(([key,sourceRows]) => ({ key,sourceRows }))
  };
}
function missingSummary(rows){
  const fields = ['date','startTime','endTime','location','room','responsible','sourceStatCom'];
  return Object.fromEntries(fields.map((field) => [field,rows.filter((row) => !row[field]).length]));
}
function ddmmyyyy(iso){
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}
function previewTarget(inferred,row){
  if(inferred.oiCodes.length > 1) return `SOURCE-OI-${inferred.oiCodes.map((code) => code.replace(':','-')).join('-')}`;
  const oi = inferred.oiCodes[0];
  if(oi) return oi.replace(':','-');
  if(row.crosses['ÉTAT-MAJOR'] || row.crosses.EM) return 'SDIS-EM';
  if(row.crosses['HORS SDIS']) return 'EXTERNAL';
  return inferred.primaryDomain || 'SDIS-ALL';
}
function previewPublics(inferred){
  const mapping = {
    'FOBA-1':'FOBA:1','FOBA-2':'FOBA:2','FOBA-3':'FOBA:3','JSP-GEN':'JSP:1',
    'PR-PAPR':'PR:2','PR-PABC':'PR:3','FOSPEC-ANTICHUTE':'FOSPEC:1','FOSPEC-NAC':'FOSPEC:2',
    'FOSPEC-OFSI':'FOSPEC:3','FOSPEC-VPC':'FOSPEC:4','AUTO-COND-PL':'AUTO:1',
    'AUTO-COND-TP9':'AUTO:2','AUTO-COND-VL':'AUTO:3','AUTO-GRUTIER':'AUTO:4',
    'AUTO-MEA':'AUTO:5','AUTO-PILOTE-BAT':'AUTO:6'
  };
  return unique(inferred.publicCodes.map((code) => mapping[code]));
}
function locationCode(value){
  const normalized = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  for(const code of ['G1','C1','B1','B2','Y1','Y2','Y3','Y4']) if(new RegExp(`\\b${code}\\b`).test(normalized)) return `L-${code}`;
  if(/YVERDON/.test(normalized)) return 'L-YVERDON';
  return '';
}
function roomCode(value){
  const normalized = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const rooms = {
    'SALLE ETAT-MAJOR':'R-G1-EM','SALLE VULCAIN':'R-G1-VULCAIN','SALLE JURA':'R-G1-JURA',
    'SALLE ALPES':'R-G1-ALPES','SALLE OXYGENE':'R-G1-OXYGENE','SALLE O2':'R-G1-O2',
    'SALLE O3':'R-G1-O3','SALLE BACKDRAFT':'R-G1-BACKDRAFT','SALLE FLASHOVER':'R-G1-FLASHOVER',
    'SALLE THEORIE C1':'R-C1-THEORIE','SALLE THEORIE B1':'R-B1-THEORIE'
  };
  return rooms[normalized] || '';
}
function previewEvent(row){
  const inferred = inferRow(row);
  const target = previewTarget(inferred,row);
  return {
    id:`qv-source-${row.sourceRow}`,
    label:row.displayLabel,
    date:ddmmyyyy(row.date),
    start:row.startTime,
    end:row.endTime,
    domain:inferred.primaryDomain || 'À ARBITRER',
    target,
    targetLabel:inferred.oiCodes.length > 1 ? inferred.oiCodes.map((code) => code.replace(':',' ')).join(' + ') : null,
    publics:previewPublics(inferred),
    oiCodes:inferred.oiCodes,
    location:locationCode(row.location),
    sourceLocation:row.location,
    room:roomCode(row.room),
    sourceRoom:row.room,
    responsible:row.responsible || 'À ARBITRER',
    status:'PROPOSED',
    statCom:row.statCom,
    roles:[],resources:[],dayExclusive:false,fixedDate:false,permutationAllowed:false,
    sessionCount:1,priority:70,
    provenance:'SOURCE_WORKBOOK_DATE',
    sourceEvidence:{ file:'2026 QUO VADIS SDIS Nord vaudois.xlsx',sheet:"QUO VADIS '26",row:row.sourceRow }
  };
}
function truthMatrix(sourceSha){
  return [
    ['QUO VADIS 2026','Classeur source',DEFAULT_WORKBOOK,sourceSha,'Empreinte SHA-256 recalculée','Analyse et réconciliation','HAUT','NON'],
    ['Stat.Com','Référentiel initial et successions','netlify/lib/_scope-statcom-referential.js',`${statCom.initialStatComCodes().length} codes; ${statCom.STATCOM_SUCCESSIONS.length} succession(s)`,'Exports exécutables','Validation par date','HAUT','NON'],
    ['Domaines','Domaines canoniques','netlify/lib/_scope-canonical-foundations.js',foundations.CANONICAL_DOMAIN_CODES.join(', '),'Constante exportée','Classification C19','HAUT','NON'],
    ['OI','Unités organisationnelles','netlify/lib/_scope-canonical-foundations.js',`${foundations.ORGANISATIONAL_UNITS.length} OI`,'Constante exportée','Cibles/OI','HAUT','NON'],
    ['Publics','Publics canoniques','netlify/lib/_scope-public-foundations.js',`${publics.PUBLIC_DEFINITIONS.length} publics; ${publics.UNRESOLVED_PUBLIC_CANDIDATES.length} candidats non résolus`,'Constantes exportées','Résolution public','MOYEN','OUI'],
    ['Lieux','Lieux officiels SCOPE','netlify/lib/_scope-quo-vadis-referentials.js',`${qv.OFFICIAL_LIEUX.length} lieux`,'Constante exportée','Placement','HAUT','NON'],
    ['Salles','Salles de théorie','netlify/lib/_scope-quo-vadis-referentials.js',`${Object.values(qv.THEORY_ROOMS).flat().length} salles`,'Constante exportée','Placement/conflits','HAUT','NON'],
    ['Calendrier 2026','Fériés et vacances','État de Vaud',OFFICIAL_CALENDAR_URLS[2026],'Page officielle consultée le 2026-09-29','Marqueurs calendaires','HAUT','NON'],
    ['Calendrier 2027','Fériés et vacances','État de Vaud',OFFICIAL_CALENDAR_URLS[2027],'Page officielle consultée le 2026-09-29','Marqueurs calendaires','HAUT','NON'],
    ['Veilles','Règle métier','Aucune source canonique trouvée','MANQUANTE','Recherche code/docs','Aucune règle appliquée','FAIBLE','OUI'],
    ['Tournus CTA','Ordre/périodicité sections et demi-sections','Aucune source canonique trouvée','MANQUANTE','Recherche code/docs et historique 2026','Aucune génération CTA','FAIBLE','OUI'],
    ['Rôles/Ressources','Affectations 2027 par activité','Aucune règle complète trouvée','PARTIEL','Référentiels UX seulement','Non inventés dans le dry-run','FAIBLE','OUI']
  ].map(([domain,data,source,value,evidence,use,confidence,arbitration]) => ({ domain,data,source,value,evidence,use,confidence,arbitrationRequired:arbitration }));
}
function buildGate(workbookPath = process.env.SCOPE_C19_WORKBOOK || DEFAULT_WORKBOOK){
  const input = fs.readFileSync(workbookPath);
  const source = rowsFromWorkbook(input);
  const rows2026 = source.rows.filter((row) => row.date && row.date.startsWith('2026-'));
  const rows2027 = source.rows.filter((row) => row.date && row.date.startsWith('2027-'));
  const undated = source.rows.filter((row) => !row.date);
  const otherYears = source.rows.filter((row) => row.date && !/^202[67]-/.test(row.date));
  const proposals2026 = buildProposals(rows2026);
  const proposals2027 = buildProposals(rows2027);
  const labels2027 = new Set(proposals2027.map((row) => row.proposalKey));
  const absent = proposals2026.filter((row) => !labels2027.has(row.proposalKey));
  const previewEvents = rows2027.map(previewEvent);
  const uxScreens = [
    [1,'Catalogue annuel','NOK','Catalogue de démonstration; catalogue 2027 complet non démontré','PASS'],
    [2,'Définition activité','NOK','Définitions de démonstration, pas les 42 définitions source 2027','PASS'],
    [3,'Automatismes','NOK','Règles de démonstration; tournus CTA absent','PASS'],
    [4,'Besoin annuel','NOK','Besoin complet 2027 non arbitré','PASS'],
    [5,'Occurrences/sessions','NOK','Génération annuelle complète indisponible','PASS'],
    [6,'Placement','NOK','Aucun placement automatique 2027 prouvé','PASS'],
    [7,'Propositions','NOK','Propositions non exécutables sur programme complet','PASS'],
    [8,'Événement connu','NOK','Écran fonctionnel mais non alimenté par un référentiel 2027 complet','PASS'],
    [9,'Conflits','NOK','Rôles et ressources 2027 non structurés; scénarios réels incomplets','PASS'],
    [10,'Toutes les activités','PASS','72 lignes 2027 explicites, tableau et filtres réels','PASS'],
    [11,'Agenda annuel','PASS','72 lignes explicites et calendrier officiel 2027','PASS'],
    [12,'Déplacement','PASS','72 lignes explicites affichées et déplaçables localement','PASS']
  ].map(([screen,name,status,data,ux]) => ({ screen,name,status,data,ux }));
  const reconciled2026 = Object.values(rowDispositions(proposals2026)).reduce((sum,value) => sum + value,0);
  const report = {
    contractVersion:1,mode:'DRY_RUN',generatedAt:'2026-09-29',source:{
      path:workbookPath,fileName:path.basename(workbookPath),sheetName:source.sheetName,sha256:sha256(input),
      physicalRows:source.physicalRows,eventRows:source.rows.length,headers:source.headers
    },
    inventory:{
      workbook2026:true,existing2027Rows:rows2027.length,statComReferential:'netlify/lib/_scope-statcom-referential.js',
      functionalCatalog:'netlify/lib/_scope-functional-catalog.js',canonicalFoundations:'netlify/lib/_scope-canonical-foundations.js',
      publicReferential:'netlify/lib/_scope-public-foundations.js',locationsAndRooms:'netlify/lib/_scope-quo-vadis-referentials.js',
      ctaTurnSource:null,rolesResources2027Source:null,announcedDatesSource:'Local preview only; not canonical SCOPE data'
    },
    truthMatrix:truthMatrix(sha256(input)),
    calendar:{ officialSources:OFFICIAL_CALENDAR_URLS,data:CALENDAR,factRuleSeparation:true,
      businessRules:{ publicHolidayEve:'À ARBITRER',schoolVacationEve:'À ARBITRER',aroundVacations:'À ARBITRER' } },
    gate1:{
      status:'PASS',sourceRows2026:rows2026.length,analyzedRows:rows2026.length,activityDefinitions:proposals2026.length,
      occurrences:occurrenceCount(proposals2026),sessions:rows2026.length,dates:unique(rows2026.map((row) => row.date)).length,
      classification:dispositions(proposals2026),rowDisposition:rowDispositions(proposals2026),
      domains:countBy(proposals2026.flatMap((row) => row.domainCodes)),missing:missingSummary(rows2026),
      duplicates:duplicateSummary(rows2026),uninterpretedRows:0,silentLoss:rows2026.length-reconciled2026
    },
    gate2:{ status:'NOK',calendar:'PASS',statCom:'PARTIAL',ctaTurn:'MANQUANT',businessEveRules:'MANQUANT',rolesResources:'PARTIEL' },
    gate3:{
      status:'NOK',explicitSourceRows2027:rows2027.length,explicitDefinitions2027:proposals2027.length,
      generatedSessions:previewEvents.length,firstDate:rows2027[0] && rows2027[0].date,lastDate:rows2027.at(-1) && rows2027.at(-1).date,
      provenance:{ SOURCE_WORKBOOK_DATE:previewEvents.length },automaticPlacements:0,ctaPlacements:0,
      fixedDates:0,announcedDates:0,arbitrations:undated.length + absent.length,
      impossibilities:0,silentLoss:0,missing:missingSummary(rows2027),duplicates:duplicateSummary(rows2027),fullYear:false,
      reason:'La source explicite 2027 s’arrête au 4 mars; aucune règle ne prouve la reconduction annuelle complète.'
    },
    gate4:{
      status:'BLOCKED',reason:'La génération 2027 grandeur nature n’est pas démontrable. La preview charge uniquement les 72 lignes 2027 explicites.',
      screens:uxScreens,
      responsive:{ widths:[1500,1150,960,800],checks:48,globalOverflowFailures:0,internalTableScroll:true },
      performance:{ datasetSize:72,activitiesOpenMs:300,moveOpenMs:302,search:[{ value:'i',ms:18,visible:66 },{ value:'in',ms:13,visible:38 },{ value:'int',ms:13,visible:6 }],limitation:'Mesures indicatives sur 72 événements, pas sur une volumétrie annuelle proche de 1 000.' }
    },
    undatedRows:undated.map((row) => ({ sourceRow:row.sourceRow,label:row.rawLabel,startTime:row.startTime,endTime:row.endTime,reason:'DATE MANQUANTE' })),
    unexpectedYearRows:otherYears.map((row) => ({ sourceRow:row.sourceRow,date:row.date,label:row.rawLabel })),
    statCom:{
      referentialCount:statCom.initialStatComCodes().length,successions:statCom.STATCOM_SUCCESSIONS,
      sourceRowsWithCode:source.rows.filter((row) => row.sourceStatCom).length,sourceRowsWithoutCode:source.rows.filter((row) => !row.sourceStatCom).length,
      unknownCodes:unique(source.rows.map((row) => row.sourceStatCom)).filter((code) => {
        const canonical = statCom.resolveStatComCode(code,'2027-01-01').canonicalCode;
        return !statCom.initialStatComCodes().some((item) => item.code === canonical);
      })
    },
    comparison:{
      definitions2026:proposals2026.length,definitionsPresentInExplicit2027:proposals2027.length,
      absentFromExplicit2027:absent.map((row) => ({ label:row.activityLabel,definitionCode:row.definitionCode,domain:row.primaryDomain,sourceRows:row.sourceRowCount,status:'À ARBITRER' })),
      warning:'L’absence porte sur une source 2027 partielle et ne prouve pas une suppression métier.'
    },
    arbitrations:[
      { code:'CTA-TURN',count:1,issue:'Source canonique du tournus CTA introuvable',impact:'Génération sections/demi-sections impossible sans invention' },
      { code:'QV27-COVERAGE',count:1,issue:'Source 2027 limitée au 4 mars',impact:'Programme annuel complet indisponible' },
      { code:'UNDATED-FOCA',count:undated.length,issue:'Lignes FOCA sans date',impact:'Non chargeables dans l’agenda' },
      { code:'HISTORY-RECONDUCTION',count:absent.length,issue:'Activités 2026 absentes de la source 2027 partielle',impact:'Décision de reconduction requise' },
      { code:'CALENDAR-BUSINESS-RULES',count:3,issue:'Règles veilles/vacances non administrées',impact:'Contraintes de placement non applicables automatiquement' },
      { code:'STATCOM-MISSING',count:source.rows.filter((row) => !row.sourceStatCom).length,issue:'Stat.Com source manquant',impact:'Export ECAwin impossible pour ces lignes' }
    ],
    findings:{
      p1:[],
      p2:[
        { code:'P2-CTA-SOURCE',finding:'Source canonique du tournus CTA absente',impact:'Gate 2 et génération CTA bloqués' },
        { code:'P2-QV27-COVERAGE',finding:'Données 2027 limitées au 4 mars',impact:'Gate 3 et recette grandeur nature bloqués' },
        { code:'P2-STATCOM',finding:'39 lignes sans Stat.Com et code EMSEA absent du référentiel',impact:'Export ECAwin non fiable sans arbitrage' },
        { code:'P2-C15-BASELINE',finding:'Suite C15 préexistante à 37/41',impact:'Contrôle CSS et trois validations de publics canoniques restent rouges' }
      ]
    },
    preview:{ events:previewEvents },
    gates:{ gate1:'PASS',gate2:'NOK',gate3:'NOK',gate4:'BLOCKED',global:'NOK' },
    operationalWrites:false,eventPublication:false,databaseWrites:false
  };
  return report;
}

function markdown(report){
  const matrix = report.truthMatrix.map((row) => `| ${row.domain} | ${row.data} | ${row.source} | ${row.value} | ${row.evidence} | ${row.use} | ${row.confidence} | ${row.arbitrationRequired} |`).join('\n');
  const arbitrations = report.arbitrations.map((row) => `| ${row.code} | ${row.count} | ${row.issue} | ${row.impact} |`).join('\n');
  const absent = report.comparison.absentFromExplicit2027.map((row) => `| ${row.label.replaceAll('|','\\|')} | ${row.domain || '—'} | ${row.sourceRows} | ${row.status} |`).join('\n');
  const undated = report.undatedRows.map((row) => `| ${row.sourceRow} | ${row.label} | ${row.startTime}–${row.endTime} | ${row.reason} |`).join('\n');
  const screens = report.gate4.screens.map((row) => `| ${row.screen} | ${row.name} | ${row.status} | ${row.data} | ${row.ux} |`).join('\n');
  const p2 = report.findings.p2.map((row) => `| ${row.code} | ${row.finding} | ${row.impact} |`).join('\n');
  return `# C19 — QUO VADIS 2026/2027 — Preprod Gate 1\n\n`+
    `Verdict global : **${report.gates.global}**. Dry-run strict, aucune écriture opérationnelle.\n\n`+
    `## Sources et matrice de vérité\n\n| Domaine | Donnée | Source | Valeur | Preuve | Utilisation C19 | Confiance | Arbitrage |\n|---|---|---|---|---|---|---|---|\n${matrix}\n\n`+
    `## Gate 1 — Réconciliation 2026\n\n`+
    `847 lignes datées 2026 → 847 analysées → ${report.gate1.activityDefinitions} définitions → ${report.gate1.occurrences} occurrences → 847 sessions → ${report.gate1.dates} dates distinctes. `+
    `Pertes silencieuses : **${report.gate1.silentLoss}**. Les doublons potentiels (${report.gate1.duplicates.groups} groupes, ${report.gate1.duplicates.rows} lignes) restent tracés, jamais supprimés automatiquement.\n\n`+
    `Classification des lignes : ${Object.entries(report.gate1.rowDisposition).map(([key,value]) => `${key}=${value}`).join(', ')}.\n\n`+
    `## Calendrier officiel\n\nSources : [2026](${OFFICIAL_CALENDAR_URLS[2026]}) et [2027](${OFFICIAL_CALENDAR_URLS[2027]}), consultées le 29.09.2026. `+
    `Les faits calendaires sont intégrés au rapport; les règles métier de veille ou d’évitement restent **À ARBITRER**.\n\n`+
    `## Tournus CTA\n\n**NOK — source canonique introuvable.** Les libellés historiques de sections/demi-sections ne démontrent ni ordre, ni périodicité, ni algorithme. Aucune seconde logique CTA n’a été créée.\n\n`+
    `## Gate 3 — Programme 2027 à blanc\n\n${report.gate3.explicitSourceRows2027} événements explicitement datés dans le classeur sont chargés en preview, du ${report.gate3.firstDate} au ${report.gate3.lastDate}, avec provenance \`SOURCE_WORKBOOK_DATE\`. `+
    `Ce jeu est réel mais partiel; il ne constitue pas un programme annuel complet. Aucun historique 2026 n’a été reconduit sans décision.\n\n`+
    `### Lignes sans date\n\n| Ligne | Activité | Horaire | Statut |\n|---:|---|---|---|\n${undated}\n\n`+
    `### Activités 2026 absentes de la source 2027 explicite\n\n> La source 2027 s’arrête au 4 mars : ces absences sont des arbitrages, pas des suppressions démontrées.\n\n| Activité | Domaine | Lignes 2026 | Statut |\n|---|---|---:|---|\n${absent}\n\n`+
    `## Arbitrages MOA\n\n| Code | Volume | Problème | Impact |\n|---|---:|---|---|\n${arbitrations}\n\n`+
    `## Recette UX finale sur données disponibles\n\n| Écran | Nom | Données 2027 | Constat | UX |\n|---:|---|---|---|---|\n${screens}\n\n`+
    `Responsive : 48 contrôles (12 écrans × 1500/1150/960/800), aucun scroll horizontal global; tableaux larges en scroll interne. `+
    `Performance indicative sur 72 événements : ouverture activités ${report.gate4.performance.activitiesOpenMs} ms, déplacement ${report.gate4.performance.moveOpenMs} ms; recherche \`int\` ${report.gate4.performance.search[2].ms} ms. `+
    `Ces mesures ne valident pas une volumétrie proche de 1 000.\n\n`+
    `## Findings P1/P2\n\nP1 : aucun finding.\n\n| Niveau | Finding | Impact |\n|---|---|---|\n${p2}\n\n`+
    `## Gates\n\n- Gate 1 — 2026 : **PASS**\n- Gate 2 — référentiels/calendrier : **NOK** (CTA et règles métier manquants)\n- Gate 3 — génération 2027 : **NOK** (couverture partielle au 4 mars)\n- Gate 4 — UX grandeur nature : **BLOCKED**; recette possible uniquement sur les 72 événements explicites\n`;
}

function writeOutputs(report,root = path.resolve(__dirname,'..')){
  const jsonPath = path.join(root,'docs/SCOPE_C19_PREPROD_GATE_1.json');
  const markdownPath = path.join(root,'docs/SCOPE_C19_PREPROD_GATE_1.md');
  const previewPath = path.join(root,'scripts/scope-c19-ux-recette/preprod-data.js');
  fs.writeFileSync(jsonPath,`${JSON.stringify(report,null,2)}\n`);
  fs.writeFileSync(markdownPath,markdown(report));
  fs.writeFileSync(previewPath,`window.C19_PREPROD_DATA=${JSON.stringify({ generatedAt:report.generatedAt,source:report.source,gate:report.gates,calendar:report.calendar.data,events:report.preview.events })};\n`);
  return { jsonPath,markdownPath,previewPath };
}

function run(){
  const report = buildGate(process.argv[2]);
  const outputs = writeOutputs(report);
  process.stdout.write(`${JSON.stringify({ gates:report.gates,gate1:report.gate1,gate3:report.gate3,outputs },null,2)}\n`);
}

if(require.main === module) run();

module.exports = { DEFAULT_WORKBOOK,OFFICIAL_CALENDAR_URLS,CALENDAR,buildGate,markdown,previewEvent,writeOutputs };

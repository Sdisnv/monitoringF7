'use strict';

const crypto = require('node:crypto');
const { readXlsx } = require('./_scope-xlsx-reader');
const { clean,splitActivityThemeLabel,formatActivityThemeLabel } = require('../../assets/js/scope-activity-label');

const SHEET_NAME = "QUO VADIS '26";
const HEADER_ROW = 4;
const DOMAIN_ORDER = Object.freeze(['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']);
const CROSS_COLUMNS = Object.freeze([
  'HORS SDIS','F5/6','ÉTAT-MAJOR','DPS','DAP','FOBA','JSP','EM','DPS G1','DPS C1','DPS B1','DPS B2',
  'PAPR','AUTO PL','AUTO VL','DAP Y1','DAP Y2','DAP Y3','DAP Y4','FOBA 1','FOBA 2','FOBA 3','JSP G1','JSP C1','JSP B1'
]);
const REQUIRED_COLUMNS = Object.freeze([
  'ÉVÉNEMENT','LIEU','PERSONNEL CONCERNÉ','DOMAINE','SOUS-DOMAINE','QUI','RESPONSABLE','SALLE','COURS CADRES','CODE ACTIVITÉS','STAT.COM.',...CROSS_COLUMNS
]);
const PRIMARY_SUBDOMAINS = new Set(['DPS','DAP','JSP','FOBA','FOCA','FOSPEC','AUTO','PR']);
const PIPELINE_VERSION = 'C15-REPAIR-1';

function normalize(value){
  return clean(value).replace(/œ/gi,'oe').replace(/æ/gi,'ae').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’']/g,"'").replace(/[^a-z0-9]+/gi,' ').trim().toUpperCase();
}
function marked(value){ return /^(X|OUI|1|TRUE)$/i.test(clean(value)); }
function unique(values){ return [...new Set(values.filter(Boolean))]; }
function sortDomains(values){ return unique(values).sort((a,b) => {
  const left = DOMAIN_ORDER.indexOf(a); const right = DOMAIN_ORDER.indexOf(b);
  return (left < 0 ? DOMAIN_ORDER.length : left) - (right < 0 ? DOMAIN_ORDER.length : right) || a.localeCompare(b);
}); }
function sha(value){ return crypto.createHash('sha256').update(value).digest('hex'); }
function canonicalJson(value){
  const visit = (item) => Array.isArray(item) ? item.map(visit) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key,visit(item[key])])) : item;
  return JSON.stringify(visit(value));
}
function slug(value){
  return normalize(value).replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,52) || 'ACTIVITE';
}
function excelDate(value){
  if(!Number.isFinite(Number(value))) return clean(value) || null;
  const date = new Date(Date.UTC(1899,11,30) + Number(value) * 86400000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0,10);
}
function excelTime(value){
  if(!Number.isFinite(Number(value))) return clean(value) || null;
  const seconds = Math.round((Number(value) % 1) * 86400) % 86400;
  return `${String(Math.floor(seconds / 3600)).padStart(2,'0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2,'0')}`;
}

function headerName(value){ return clean(value).replace(/\s+/g,' ').toUpperCase(); }
function rowsFromWorkbook(input,options = {}){
  const workbook = readXlsx(input,{ sheetName: options.sheetName || SHEET_NAME });
  const header = workbook.rows[HEADER_ROW - 1] || [];
  const indexes = new Map(header.map((value,index) => [headerName(value),index]).filter(([name]) => name));
  const missingColumns = REQUIRED_COLUMNS.filter((name) => !indexes.has(headerName(name)));
  if(missingColumns.length) throw new Error(`XLSX_COLUMNS_MISSING: ${missingColumns.join(', ')}`);
  const value = (row,name) => row[indexes.get(headerName(name))];
  const rows = workbook.rows.slice(HEADER_ROW).map((row,index) => {
    const rawLabel = clean(value(row,'ÉVÉNEMENT'));
    if(!rawLabel) return null;
    const split = splitActivityThemeLabel(rawLabel);
    const crosses = Object.fromEntries(CROSS_COLUMNS.map((name) => [name,marked(value(row,name))]));
    return {
      sourceRow: index + HEADER_ROW + 1,rawLabel,activityLabel: split.activity,theme: split.theme,
      displayLabel: formatActivityThemeLabel(split.activity,split.theme),
      date: excelDate(value(row,'DATE')),startTime: excelTime(value(row,'DÉBUT')),endTime: excelTime(value(row,'FIN')),
      location: clean(value(row,'LIEU')) || null,address: clean(value(row,'ADRESSE CONVOCATION')) || null,
      personnel: clean(value(row,'PERSONNEL CONCERNÉ')) || null,historicalDomain: clean(value(row,'DOMAINE')) || null,
      historicalSubdomain: clean(value(row,'SOUS-DOMAINE')) || null,qui: clean(value(row,'QUI')) || null,
      responsible: clean(value(row,'RESPONSABLE')) || null,room: clean(value(row,'SALLE')) || null,
      cadreCourse: marked(value(row,'COURS CADRES')),activityCode: clean(value(row,'CODE ACTIVITÉS')) || null,
      statCom: clean(value(row,'STAT.COM.')) || null,inactive: marked(value(row,'INACTIF')),crosses
    };
  }).filter(Boolean);
  return { sheetName: workbook.sheetName,sheetNames: workbook.sheetNames,physicalRows: workbook.rows.length,usedColumns: indexes.size,headers: [...indexes.keys()],rows };
}

function inferActivityType(label){
  const value = normalize(label);
  if(/\bCURSUS\b/.test(value)) return 'CURRICULUM';
  if(/\bINSTR(?:UCTION)?\b/.test(value)) return 'INSTRUCTION';
  if(/\bEXERCICE\b/.test(value)) return 'EXERCISE';
  if(/\bTEST\b/.test(value)) return 'TEST';
  if(/\b(FORMATION|COURS|RECYCLAGE)\b/.test(value)) return 'TRAINING';
  return 'OTHER';
}

function inferSpecializations(row){
  const evidence = normalize([row.activityLabel,row.historicalSubdomain,row.qui,row.personnel].join(' '));
  const values = [];
  if(/\bANTICHUTE\b/.test(evidence)) values.push('ANTICHUTE');
  if(/\bNAC\b/.test(evidence)) values.push('NAC');
  if(/\bOFSI\b/.test(evidence)) values.push('OFSI');
  if(/\b(OP VPC|VPC)\b/.test(evidence)) values.push('VPC');
  if(row.crosses.PAPR || /\bPAPR\b/.test(evidence)) values.push('PAPR');
  if(/\b(PABC|PR ABC|ABC PR)\b/.test(evidence)) values.push('PABC','PAPR');
  if(row.crosses['AUTO PL'] || /\b(COND PL|PERMIS PL)\b/.test(evidence)) values.push('COND_PL');
  if(/\bTP9\b/.test(evidence)) values.push('COND_TP9');
  if(row.crosses['AUTO VL'] || /\b(COND VL|PERMIS VL)\b/.test(evidence)) values.push('COND_VL');
  if(/\bGRUTIER\b/.test(evidence)) values.push('GRUTIER');
  if(/\bMEA\b/.test(evidence)) values.push('MEA');
  if(/\bPILOTE BAT\b/.test(evidence)) values.push('PILOTE_BAT');
  return unique(values);
}

function inferRow(row){
  const subdomain = normalize(row.historicalSubdomain).replace(/ /g,'');
  const qui = normalize(row.qui).replace(/ /g,'');
  const label = normalize(row.activityLabel);
  const populationDomains = [];
  if(row.crosses.DPS) populationDomains.push('DPS');
  if(row.crosses.DAP) populationDomains.push('DAP');
  if(row.crosses.FOBA) populationDomains.push('FOBA');
  if(row.crosses.JSP) populationDomains.push('JSP');
  const inferredDomains = [];
  if(['DPS','DAP','JSP','FOBA','FOCA','FOSPEC','AUTO','PR'].includes(qui)) inferredDomains.push(qui);
  if(/\b(PAPR|PABC|PROTECTION RESPIRATOIRE|EXERCICE PR|CURSUS PR)\b/.test(label)) inferredDomains.push('PR');
  if(/\b(CONDUITE|TP9|GRUTIER|PILOTE BAT)\b/.test(label)) inferredDomains.push('AUTO');
  if(/\b(ANTICHUTE|NAC|OFSI|OP VPC)\b/.test(label)) inferredDomains.push('FOSPEC');
  if(/\bJSP\b/.test(label)) inferredDomains.push('JSP');
  if(/\bFOBA\b/.test(label)) inferredDomains.push('FOBA');
  const historicalFamily = ['FOCO','FOCA'].includes(subdomain) ? subdomain : null;
  const explicitDomain = PRIMARY_SUBDOMAINS.has(subdomain) && !historicalFamily ? subdomain : null;
  const domains = explicitDomain
    ? [explicitDomain]
    : unique([...inferredDomains,...populationDomains,...(!inferredDomains.length && !populationDomains.length && historicalFamily ? [historicalFamily] : [])]);
  if(!explicitDomain && /\bDPS[ -]DAP\b/.test(label)) domains.push('DPS','DAP');
  const domainCodes = sortDomains(domains);
  const oiCodes = [];
  for(const code of ['G1','C1','B1','B2']) if(row.crosses[`DPS ${code}`]) oiCodes.push(`DPS:${code}`);
  for(const code of ['Y1','Y2','Y3','Y4']) if(row.crosses[`DAP ${code}`]) oiCodes.push(`DAP:${code}`);
  for(const code of ['G1','C1','B1']) if(row.crosses[`JSP ${code}`]) oiCodes.push(`JSP:${code}`);
  const fobaLevels = ['1','2','3'].filter((code) => row.crosses[`FOBA ${code}`]);
  const publicCodes = [];
  const dps = oiCodes.filter((code) => code.startsWith('DPS:')).map((code) => code.slice(4));
  const dap = oiCodes.filter((code) => code.startsWith('DAP:')).map((code) => code.slice(4));
  if(dps.length) publicCodes.push(...dps.map((code) => `DPS-${code}`)); else if(row.crosses.DPS) publicCodes.push('DPS-GEN');
  if(dap.length) publicCodes.push(...dap.map((code) => `DAP-${code}`)); else if(row.crosses.DAP) publicCodes.push('DAP-GEN');
  if(row.crosses.JSP) publicCodes.push('JSP-GEN');
  publicCodes.push(...fobaLevels.map((code) => `FOBA-${code}`));
  const specializations = inferSpecializations(row);
  if(specializations.includes('PABC')) publicCodes.push('PR-PABC');
  else if(specializations.includes('PAPR')) publicCodes.push('PR-PAPR');
  for(const code of specializations.filter((code) => ['COND_PL','COND_TP9','COND_VL','GRUTIER','MEA','PILOTE_BAT'].includes(code))) publicCodes.push(`AUTO-${code.replaceAll('_','-')}`);
  for(const code of specializations.filter((code) => ['ANTICHUTE','NAC','OFSI','VPC'].includes(code))) publicCodes.push(`FOSPEC-${code.replaceAll('_','-')}`);
  const primaryDomain = explicitDomain || domainCodes[0] || null;
  const familyCode = historicalFamily && historicalFamily !== primaryDomain ? historicalFamily : null;
  return { domainCodes,primaryDomain,familyCode,oiCodes: unique(oiCodes),fobaLevels,
    publicCodes: unique(publicCodes),specializations,populationDomains:sortDomains(populationDomains),
    majorPopulations: ['DPS','DAP','FOBA','JSP','EM'].filter((code) => row.crosses[code]) };
}

function proposalClassification(proposal,existing = new Map()){
  if(proposal.inactiveRows === proposal.sourceRows.length) return { classification:'IGNORED',confidence:'HIGH',reason:'Toutes les lignes sources sont marquées inactives.' };
  if(!proposal.primaryDomain) return { classification:'UNRESOLVED',confidence:'LOW',reason:'Aucun domaine canonique n’est démontrable par les croix, QUI, le libellé ou le sous-domaine historique.' };
  if(proposal.collisions.length) return { classification:'REVIEW_REQUIRED',confidence:'MEDIUM',reason:'Des indices canoniques contradictoires nécessitent un arbitrage humain.' };
  const target = existing.get(normalize(proposal.activityLabel));
  if(target) return { classification:'MERGE',confidence:'HIGH',reason:'Une définition canonique ou un alias confirmé porte déjà ce libellé.',targetDefinitionCode:target };
  if(proposal.evidenceRows === 0) return { classification:'REVIEW_REQUIRED',confidence:'MEDIUM',reason:'Le classement repose uniquement sur un libellé historique sans croix de population.' };
  return { classification:'AUTO_IMPORT',confidence:'HIGH',reason:'Le domaine et les publics sont étayés par les croix du classeur.' };
}

function buildProposals(sourceRows,options = {}){
  const groups = new Map();
  for(const row of sourceRows){
    const inferred = inferRow(row);
    const key = normalize(row.activityLabel);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push({ ...row,inferred });
  }
  const existing = options.existing instanceof Map ? options.existing : new Map(Object.entries(options.existing || {}));
  return [...groups.entries()].map(([key,rows]) => {
    const explicitDomains = unique(rows.map((row) => row.inferred.primaryDomain).filter(Boolean));
    const domainCodes = sortDomains(rows.flatMap((row) => row.inferred.domainCodes));
    const explicitPrimary = unique(rows.map((row) => {
      const value = normalize(row.historicalSubdomain).replace(/ /g,'');
      return PRIMARY_SUBDOMAINS.has(value) && !['FOCO','FOCA'].includes(value) ? value : null;
    }));
    const collisions = [];
    if(explicitPrimary.length > 1 && !/\bDPS[ -]DAP\b/.test(key)) collisions.push('CONTRADICTORY_PRIMARY_DOMAIN');
    const activityLabels = unique(rows.map((row) => clean(row.activityLabel)));
    const label = activityLabels.sort((a,b) => a.localeCompare(b,'fr'))[0];
    const themes = unique(rows.map((row) => row.theme)).sort((a,b) => a.localeCompare(b,'fr'));
    const occurrences = new Set(rows.map((row) => [row.date,row.startTime,row.endTime,normalize(row.theme)].join('|')));
    const publicCodes = unique(rows.flatMap((row) => row.inferred.publicCodes)).sort();
    const proposal = {
      proposalKey: key,proposalId: sha(`C15|${key}`).slice(0,24),definitionCode: `QV26-${slug(label)}-${sha(key).slice(0,8).toUpperCase()}`,
      activityLabel: label,displayLabels: unique(rows.map((row) => row.displayLabel)).sort((a,b) => a.localeCompare(b,'fr')),
      rawLabels: unique(rows.map((row) => row.rawLabel)).sort((a,b) => a.localeCompare(b,'fr')),themes,
      sourceRows: rows.map((row) => row.sourceRow),sourceRowCount: rows.length,occurrenceCount: occurrences.size,
      domainCodes,primaryDomain: explicitDomains.length === 1 ? explicitDomains[0] : domainCodes[0] || null,
      familyCodes: unique(rows.map((row) => row.inferred.familyCode)).sort(),specializations: unique(rows.flatMap((row) => row.inferred.specializations)).sort(),
      publicCodes,oiCodes: unique(rows.flatMap((row) => row.inferred.oiCodes)).sort(),fobaLevels: unique(rows.flatMap((row) => row.inferred.fobaLevels)).sort(),
      sites: unique(rows.map((row) => row.location)).sort((a,b) => a.localeCompare(b,'fr')),
      historicalDomains: unique(rows.map((row) => row.historicalDomain).filter(Boolean)).sort(),
      historicalSubdomains: unique(rows.map((row) => row.historicalSubdomain).filter(Boolean)).sort(),
      qui: unique(rows.map((row) => row.qui).filter(Boolean)).sort(),statComCodes: unique(rows.map((row) => row.statCom).filter(Boolean)).sort(),
      activityCodes: unique(rows.map((row) => row.activityCode).filter(Boolean)).sort(),
      majorPopulations: unique(rows.flatMap((row) => row.inferred.majorPopulations)).sort(),
      activityType: inferActivityType(label),inactiveRows: rows.filter((row) => row.inactive).length,
      evidenceRows: rows.filter((row) => Object.values(row.crosses).some(Boolean)).length,collisions
    };
    return { ...proposal,...proposalClassification(proposal,existing) };
  }).sort((a,b) => DOMAIN_ORDER.indexOf(a.primaryDomain) - DOMAIN_ORDER.indexOf(b.primaryDomain) || a.activityLabel.localeCompare(b.activityLabel,'fr'));
}

function summarize(source,proposals){
  const counts = Object.fromEntries(['AUTO_IMPORT','MERGE','REVIEW_REQUIRED','UNRESOLVED','IGNORED'].map((key) => [key,proposals.filter((row) => row.classification === key).length]));
  const byDomain = Object.fromEntries(sortDomains(proposals.flatMap((row) => row.domainCodes)).map((domain) => [domain,proposals.filter((row) => row.domainCodes.includes(domain)).length]));
  const byPopulation = Object.fromEntries(['DPS','DAP','FOBA','JSP','EM'].map((code) => [code,source.rows.filter((row) => row.crosses[code]).length]));
  const rowDisposition = Object.fromEntries(Object.keys(counts).map((key) => [key,proposals.filter((row) => row.classification === key).reduce((sum,row) => sum + row.sourceRowCount,0)]));
  return {
    source:{ physicalRows:source.physicalRows,eventRows:source.rows.length,distinctRawLabels:new Set(source.rows.map((row) => row.rawLabel)).size,usedColumns:source.usedColumns },
    normalization:{ activityRoots:proposals.length,distinctThemes:new Set(source.rows.map((row) => normalize(row.theme)).filter(Boolean)).size,rowsWithTheme:source.rows.filter((row) => row.theme).length,rowsWithoutTheme:source.rows.filter((row) => !row.theme).length },
    grouping:{ groups:proposals.length,sourceRows:proposals.reduce((sum,row) => sum + row.sourceRowCount,0),largest:proposals.slice().sort((a,b) => b.sourceRowCount - a.sourceRowCount).slice(0,15).map((row) => ({ activityLabel:row.activityLabel,rows:row.sourceRowCount,occurrences:row.occurrenceCount })) },
    target:{ proposedActivities:proposals.length,byDomain,byPopulation,multiPopulationRows:source.rows.filter((row) => ['DPS','DAP','FOBA','JSP','EM'].filter((code) => row.crosses[code]).length >= 2).length,multiPopulationActivities:proposals.filter((row) => row.majorPopulations.length >= 2).length },
    decisions:{ ...counts,rowDisposition,collisions:proposals.filter((row) => row.collisions.length).length },
    reconciliation:{ sourceRows:source.rows.length,groupedRows:proposals.reduce((sum,row) => sum + row.sourceRowCount,0),proposalCount:proposals.length,classifiedProposals:Object.values(counts).reduce((sum,value) => sum + value,0),classifiedRows:Object.values(rowDisposition).reduce((sum,value) => sum + value,0) }
  };
}

function analyzeWorkbook(input,options = {}){
  const source = rowsFromWorkbook(input,options);
  const proposals = buildProposals(source.rows,options);
  const summary = summarize(source,proposals);
  const sourceSha256 = sha(Buffer.isBuffer(input) ? input : Buffer.from(input || []));
  const preview = { contractVersion:2,pipelineVersion:PIPELINE_VERSION,mode:'DRY_RUN',source:{ fileName:options.fileName || null,sheetName:source.sheetName,sha256:sourceSha256,headers:source.headers },summary,proposals,
    operationalWrites:false,eventPublication:false,databaseWrites:false };
  const stableProposals = proposals.map(({ classification,confidence,reason,targetDefinitionCode,humanDecision,...proposal }) => proposal);
  preview.previewFingerprint = sha(canonicalJson({ contractVersion:preview.contractVersion,pipelineVersion:PIPELINE_VERSION,sourceSha256,proposals:stableProposals }));
  return preview;
}

function importFingerprint(preview){
  const decisions = (preview.proposals || []).filter((proposal) => proposal.humanDecision).map((proposal) => ({
    proposalId:proposal.proposalId,
    action:proposal.humanDecision.action,
    targetDefinitionCode:proposal.humanDecision.targetDefinitionCode || null,
    comment:proposal.humanDecision.comment || null
  })).sort((left,right) => left.proposalId.localeCompare(right.proposalId));
  return sha(canonicalJson({ contractVersion:preview.contractVersion,pipelineVersion:preview.pipelineVersion || PIPELINE_VERSION,
    previewFingerprint:preview.previewFingerprint,decisions }));
}

function applyHumanDecisions(preview,decisions = []){
  const byId = new Map((decisions || []).map((row) => [row.proposalId,row]));
  const proposals = preview.proposals.map((proposal) => {
    const decision = byId.get(proposal.proposalId);
    if(!decision) return proposal;
    if(!['IMPORT','MERGE','IGNORE','REVIEW_REQUIRED'].includes(decision.action)) throw new Error(`INVALID_IMPORT_DECISION: ${decision.action}`);
    return { ...proposal,humanDecision:{ action:decision.action,targetDefinitionCode:clean(decision.targetDefinitionCode) || null,comment:clean(decision.comment) || null },
      classification:decision.action === 'IMPORT' ? 'AUTO_IMPORT' : decision.action === 'MERGE' ? 'MERGE' : decision.action === 'IGNORE' ? 'IGNORED' : 'REVIEW_REQUIRED',
      targetDefinitionCode:decision.action === 'MERGE' ? clean(decision.targetDefinitionCode) : proposal.targetDefinitionCode };
  });
  const keys = ['AUTO_IMPORT','MERGE','REVIEW_REQUIRED','UNRESOLVED','IGNORED'];
  const counts = Object.fromEntries(keys.map((key) => [key,proposals.filter((row) => row.classification === key).length]));
  const rowDisposition = Object.fromEntries(keys.map((key) => [key,proposals.filter((row) => row.classification === key).reduce((sum,row) => sum + row.sourceRowCount,0)]));
  return { ...preview,proposals,summary:{ ...preview.summary,decisions:{ ...preview.summary.decisions,...counts,rowDisposition },
    reconciliation:{ ...preview.summary.reconciliation,classifiedProposals:Object.values(counts).reduce((sum,value) => sum + value,0),classifiedRows:Object.values(rowDisposition).reduce((sum,value) => sum + value,0) } } };
}

module.exports = { SHEET_NAME,HEADER_ROW,DOMAIN_ORDER,CROSS_COLUMNS,REQUIRED_COLUMNS,PIPELINE_VERSION,normalize,rowsFromWorkbook,inferRow,buildProposals,summarize,analyzeWorkbook,applyHumanDecisions,importFingerprint };

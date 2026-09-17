'use strict';

const coverage = require('./_scope-quo-vadis-coverage');

const GENERATED_SOURCES = new Set(['HISTORIQUE', 'CYCLIQUE', 'OPTIONNELLE', 'DEFINITION', 'RECURRENT', 'DPS_RULE', 'CURSUS']);

function identity(row){
  const metadata = row.metadata || {};
  const domain = String(row.domain || '').toUpperCase();
  const targets = (row.cibleCodes || row.cible_codes || []).map((code) => String(code).toUpperCase()).sort();
  const normalized = coverage.normalizeInstructionTitle({ domain, title: row.title });
  // A session suffix is not a separate business activity; exercise numbers are.
  const title = coverage.normalizeTitle(normalized.title)
    .replace(/^(exercice [a-z]+) (\d+)$/, (match, base, number) => {
      if(['FOBA', 'FOCA', 'PR', 'AUTO'].includes(domain) || targets.includes(`Y${number}`) || targets.includes(number)) return match;
      return base;
    })
    .replace(/^exercice (?=(pr|auto|dap|jsp|dps)\b)/, '')
    .replace(/(\d+) (\d+)$/, (match, exercise) => /\d+\.\d+/.test(row.title || '') ? exercise : match);
  const source = row.sourceType || row.source_type;
  const cohort = metadata.cohorteCode || (source === 'CURSUS' ? String(row.sourceRef || row.source_ref || '').split(':')[0] : '');
  const ref = String(row.sourceRef || row.source_ref || '');
  const historicalKey = metadata.historicalActivityKey || (/^H\d{4}:/.test(ref) && ref.includes('|') ? ref.replace(/^H\d{4}:/, '') : '');
  return { domain, targets, title, cohort, historicalKey, key: JSON.stringify([domain, targets, title, cohort, historicalKey]) };
}

function equivalent(a, b){
  const left = identity(a);
  const right = identity(b);
  if(left.domain !== right.domain || left.title !== right.title) return false;
  if(left.historicalKey && right.historicalKey && left.historicalKey !== right.historicalKey) return false;
  if(left.cohort && right.cohort && left.cohort !== right.cohort) return false;
  if(left.targets.length && right.targets.length) return JSON.stringify(left.targets) === JSON.stringify(right.targets);
  // An untargeted catalogue template must not add a copy of a targeted activity.
  return !left.targets.length && !right.targets.length
    || ['DEFINITION', 'RECURRENT'].includes(a.sourceType || a.source_type)
    || ['DEFINITION', 'RECURRENT'].includes(b.sourceType || b.source_type);
}

function hasHumanDecision(row, proposals){
  const metadata = row.metadata || {};
  return Boolean(row.source_type === 'MANUAL' || row.scope_evenement_id || metadata.arbitrage || metadata.userSelection || metadata.manualDecision
    || (row.selected_proposal_id && metadata.autoPositioned !== true)
    || ((proposals || []).some((proposal) => ['RETENU', 'ECARTE'].includes(proposal.status)) && metadata.autoPositioned !== true));
}

function programmeRequirement(metadata, year){
  const requirement = metadata && metadata.programmeRequirement;
  if(!requirement || requirement.required !== true || !String(requirement.justification || '').trim()) return null;
  if(requirement.validFrom && String(requirement.validFrom).slice(0, 10) > `${year}-12-31`) return null;
  if(requirement.validTo && String(requirement.validTo).slice(0, 10) < `${year}-01-01`) return null;
  return requirement;
}

function activePopulation(obligations, proposals){
  const active = obligations.filter((row) => row.includeInProgramme !== false);
  const ids = new Set(active.map((row) => row.obligationId));
  const currentProposals = proposals.filter((row) => ids.has(row.obligationId) && row.conflictSummary.generatedObsolete !== true);
  return { obligations: active.map((row) => ({ ...row, proposalCount: currentProposals.filter((proposal) => proposal.obligationId === row.obligationId).length })), proposals: currentProposals };
}

module.exports = { GENERATED_SOURCES, identity, equivalent, hasHumanDecision, programmeRequirement, activePopulation };

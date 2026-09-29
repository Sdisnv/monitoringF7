'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildConvergenceMatrix } = require('../netlify/lib/_scope-functional-catalog');

const ROOT = path.resolve(__dirname,'..');
const PREVIEW = path.join(ROOT,'docs/SCOPE_C15_QUO_VADIS_2026_PREVIEW.json');

function markdown(matrix,summary){
  const rows = matrix.map((row) => `| ${row.source.join(' + ').replaceAll('|','\\|')} | ${row.proposedType} | ${row.targetDefinition || '—'} | ${row.sessions.join(', ') || '—'} | ${row.realizations == null ? '—' : row.realizations} | ${row.domains.join(', ') || '—'} | ${row.sites.join(', ').replaceAll('|','\\|') || '—'} | ${row.confidence} | ${row.action} |`).join('\n');
  return `# C18 — Matrice de convergence C15/C16\n\nCette matrice est calculée avant migration à partir du dry-run traçable QUO VADIS 2026. Une série numérique n'est jamais fusionnée sans preuves structurelles concordantes.\n\n- Propositions source : ${summary.sourceProposals}\n- Groupes de matrice : ${summary.matrixRows}\n- MERGE_SAFE : ${summary.actions.MERGE_SAFE}\n- KEEP_DISTINCT : ${summary.actions.KEEP_DISTINCT}\n- REVIEW_REQUIRED : ${summary.actions.REVIEW_REQUIRED}\n- Propositions couvertes exactement une fois : ${summary.coveredProposals}\n\n| Source | Type proposé | Définition cible | Séances | Réalisations | Domaines | Sites | Confiance | Action |\n|---|---|---|---|---:|---|---|---|---|\n${rows}\n`;
}

function run(outputDirectory = path.join(ROOT,'docs')){
  const preview = JSON.parse(fs.readFileSync(PREVIEW,'utf8'));
  const matrix = buildConvergenceMatrix(preview.proposals);
  const coveredProposals = matrix.reduce((sum,row) => sum + row.source.length,0);
  const actions = Object.fromEntries(['MERGE_SAFE','KEEP_DISTINCT','REVIEW_REQUIRED'].map((action) => [action,matrix.filter((row) => row.action === action).length]));
  const summary = { sourceProposals:preview.proposals.length,matrixRows:matrix.length,coveredProposals,actions,
    safeTargets:matrix.filter((row) => row.action === 'MERGE_SAFE').map((row) => ({ targetDefinition:row.targetDefinition,sourceCount:row.source.length,type:row.proposedType })) };
  if(coveredProposals !== preview.proposals.length) throw new Error(`Matrice incomplète: ${coveredProposals}/${preview.proposals.length}`);
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const jsonPath = path.join(outputDirectory,'SCOPE_C18_CONVERGENCE_MATRIX.json');
  const markdownPath = path.join(outputDirectory,'SCOPE_C18_CONVERGENCE_MATRIX.md');
  fs.writeFileSync(jsonPath,`${JSON.stringify({ source:preview.source,summary,matrix },null,2)}\n`);
  fs.writeFileSync(markdownPath,markdown(matrix,summary));
  return { summary,jsonPath,markdownPath };
}

if(require.main === module) process.stdout.write(`${JSON.stringify(run(),null,2)}\n`);

module.exports = { run,markdown };

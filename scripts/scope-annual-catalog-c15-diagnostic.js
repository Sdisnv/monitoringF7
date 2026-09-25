'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { analyzeWorkbook } = require('../netlify/lib/_scope-annual-catalog-import');

const DEFAULT_WORKBOOK = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';

function markdown(preview){
  const s = preview.summary;
  const domains = Object.entries(s.target.byDomain).map(([code,count]) => `| ${code} | ${count} |`).join('\n');
  const decisions = ['AUTO_IMPORT','MERGE','REVIEW_REQUIRED','UNRESOLVED','IGNORED'].map((key) => `| ${key} | ${s.decisions[key]} | ${s.decisions.rowDisposition[key]} |`).join('\n');
  const largest = s.grouping.largest.map((row) => `| ${row.activityLabel.replaceAll('|','\\|')} | ${row.rows} | ${row.occurrences} |`).join('\n');
  const proposals = preview.proposals.map((row) => `| ${row.activityLabel.replaceAll('|','\\|')} | ${row.primaryDomain || '—'} | ${row.sourceRowCount} | ${row.occurrenceCount} | ${(row.majorPopulations || []).join(', ') || '—'} | ${row.themes.length} | ${row.classification} |`).join('\n');
  return `# C15 — Preview QUO VADIS 2026\n\nDry-run déterministe. Aucune écriture DB ou opérationnelle.\n\n## Source\n\n- SHA-256 : \`${preview.source.sha256}\`\n- Empreinte preview : \`${preview.previewFingerprint}\`\n- Onglet : \`${preview.source.sheetName}\`\n- Lignes physiques : ${s.source.physicalRows}\n- Lignes événementielles : ${s.source.eventRows}\n- Colonnes métier : ${s.source.usedColumns}\n- Libellés bruts distincts : ${s.source.distinctRawLabels}\n\n## Normalisation\n\n- Activités racines : ${s.normalization.activityRoots}\n- Thèmes distincts : ${s.normalization.distinctThemes}\n- Lignes avec thème : ${s.normalization.rowsWithTheme}\n- Lignes sans thème : ${s.normalization.rowsWithoutTheme}\n- Lignes multi-populations : ${s.target.multiPopulationRows}\n\n## Réconciliation\n\n${s.reconciliation.sourceRows} lignes source → ${s.reconciliation.groupedRows} lignes regroupées → ${s.reconciliation.proposalCount} propositions → ${s.reconciliation.classifiedProposals} propositions classées.\n\n| Décision | Propositions | Lignes source |\n|---|---:|---:|\n${decisions}\n\n## Domaines proposés\n\nUne activité multi-domaine est comptée dans chaque domaine associé.\n\n| Domaine | Activités |\n|---|---:|\n${domains}\n\n## Principaux regroupements\n\n| Activité | Lignes | Occurrences |\n|---|---:|---:|\n${largest}\n\n## Propositions\n\n| Activité | Domaine | Lignes | Occurrences | Populations | Thèmes | Classe |\n|---|---|---:|---:|---|---:|---|\n${proposals}\n`;
}

function run(workbookPath = process.argv[2] || process.env.SCOPE_C15_WORKBOOK || DEFAULT_WORKBOOK,outputDirectory = process.argv[3] || path.resolve(__dirname,'../docs')){
  const preview = analyzeWorkbook(fs.readFileSync(workbookPath),{ fileName:path.basename(workbookPath) });
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const jsonPath = path.join(outputDirectory,'SCOPE_C15_QUO_VADIS_2026_PREVIEW.json');
  const markdownPath = path.join(outputDirectory,'SCOPE_C15_QUO_VADIS_2026_PREVIEW.md');
  fs.writeFileSync(jsonPath,`${JSON.stringify(preview,null,2)}\n`);
  fs.writeFileSync(markdownPath,markdown(preview));
  return { preview,jsonPath,markdownPath };
}

if(require.main === module){
  const result = run();
  process.stdout.write(`${JSON.stringify({ summary:result.preview.summary,previewFingerprint:result.preview.previewFingerprint,jsonPath:result.jsonPath,markdownPath:result.markdownPath },null,2)}\n`);
}

module.exports = { DEFAULT_WORKBOOK,markdown,run };

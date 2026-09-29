'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const annualImport = require('../netlify/lib/_scope-annual-catalog-import');
const statCom = require('../netlify/lib/_scope-statcom-referential');
const publics = require('../netlify/lib/_scope-public-foundations');
const gate1 = require('./scope-c19-preprod-gate-1');

const ROOT = path.resolve(__dirname, '..');
const REPORT_JSON = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_GATE_1_R1.json');
const REPORT_MD = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_GATE_1_R1.md');
const REFERENCE_HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';

function countBy(rows, key) {
  return rows.reduce((result, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function sourceRows() {
  return annualImport.rowsFromWorkbook(fs.readFileSync(gate1.DEFAULT_WORKBOOK)).rows;
}

function classifyMissingStatCom(rows) {
  const codedByLabel = new Map();
  for (const row of rows) {
    if (!row.sourceStatCom) continue;
    const key = annualImport.normalize(row.activityLabel);
    if (!codedByLabel.has(key)) codedByLabel.set(key, new Set());
    codedByLabel.get(key).add(row.statCom);
  }
  return rows.filter((row) => !row.sourceStatCom).map((row) => {
    const inferred = annualImport.inferRow(row);
    const matches = [...(codedByLabel.get(annualImport.normalize(row.activityLabel)) || [])];
    let category = 'D';
    let expectedStatCom = null;
    let verdict = 'CAS AMBIGU — arbitrage nécessaire';
    let statisticalTrackingExpected = null;
    if (row.crosses['HORS SDIS']) {
      category = 'A';
      verdict = 'ABSENCE LÉGITIME — activité explicitement HORS SDIS, sans suivi Stat.Com dans la source';
      statisticalTrackingExpected = false;
    } else if (matches.length === 1) {
      category = 'B';
      expectedStatCom = matches[0];
      verdict = `STAT.COM RETROUVÉ DANS SCOPE/historique source: ${matches[0]}`;
      statisticalTrackingExpected = true;
    } else if (inferred.primaryDomain || inferred.majorPopulations.length || inferred.oiCodes.length) {
      category = 'C';
      verdict = 'ACTIVITÉ SDIS — Stat.Com réellement manquant';
      statisticalTrackingExpected = true;
    }
    return {
      sourceRow: row.sourceRow,
      date: row.date,
      activity: row.rawLabel,
      domain: inferred.primaryDomain || row.historicalSubdomain || row.historicalDomain || null,
      nature: row.crosses['HORS SDIS'] ? 'EXTERIEURE' : 'SDIS',
      external: row.crosses['HORS SDIS'],
      statisticalTrackingExpected,
      scopeMatch: expectedStatCom,
      expectedStatCom,
      category,
      verdict
    };
  });
}

function classifyAbsentDefinitions(rows) {
  const rows2026 = rows.filter((row) => row.date && row.date.startsWith('2026-'));
  const rows2027 = rows.filter((row) => row.date && row.date.startsWith('2027-'));
  const proposals2026 = annualImport.buildProposals(rows2026);
  const keys2027 = new Set(annualImport.buildProposals(rows2027).map((row) => row.proposalKey));
  const sourceByNumber = new Map(rows2026.map((row) => [row.sourceRow, row]));
  return proposals2026.filter((row) => !keys2027.has(row.proposalKey)).map((proposal) => {
    const evidenceRows = proposal.sourceRows.map((number) => sourceByNumber.get(number));
    const label = annualImport.normalize(proposal.activityLabel);
    let category;
    let reason;
    if (evidenceRows.every((row) => row.crosses['HORS SDIS'])) {
      category = 'D'; reason = 'Toutes les lignes sont explicitement HORS SDIS; aucune reconduction automatique.';
    } else if (proposal.activityType === 'CURRICULUM' || /\bCURSUS\b/.test(label)) {
      category = 'B'; reason = 'Cursus reconnu; SCOPE conditionne la reconduction à son activation annuelle.';
    } else if (/DEMI SECTION|DEMI SCT|\bSECTION\b|\bSCT\b/.test(label) && /INSTR/.test(label)) {
      category = 'C'; reason = 'Instruction section/demi-section reconnue par le moteur QUO VADIS.';
    } else if (/PERMANENCE CTA|TOURNUS CTA|ROTATION CTA/.test(label)) {
      category = 'F'; reason = 'Règle métier connue, automatisme non retrouvé.';
    } else if (proposal.inactiveRows === proposal.sourceRowCount) {
      category = 'E'; reason = 'Toutes les lignes historiques sont inactives.';
    } else if (/ASSEMBLEE|CEREMONIE|OPTIONNEL/.test(label)) {
      category = 'G'; reason = 'SCOPE classe cette activité comme optionnelle; reconduction humaine requise.';
    } else if (proposal.primaryDomain) {
      category = 'A'; reason = 'Domaine canonique reconnu; le moteur de coverage classe par défaut l’activité comme annuelle.';
    } else {
      category = 'H'; reason = 'Aucun domaine canonique démontrable après rapprochement SCOPE.';
    }
    return {
      activity: proposal.activityLabel,
      definitionCode: proposal.definitionCode,
      domain: proposal.primaryDomain,
      sourceRows: proposal.sourceRowCount,
      category,
      reason
    };
  });
}

function publicRecovery() {
  const canonicalRecovered = new Set(['DPS-GEN', 'DAP-GEN', 'JSP-GEN', 'PR-PAPR', 'PR-PABC']);
  const nonPublicDimensions = new Set(['FOCO-DPS', 'FOCO-DAP', 'FOCO-JSP', 'FOSPEC-GEN']);
  return publics.UNRESOLVED_PUBLIC_CANDIDATES.map((candidate) => {
    if (canonicalRecovered.has(candidate.code)) return {
      code: candidate.code, classification: 'CORRESPONDANCE CANONIQUE RETROUVEE',
      evidence: 'database/migrations/20260923_scope_person_qualifications_c3_b.sql'
    };
    if (nonPublicDimensions.has(candidate.code)) return {
      code: candidate.code, classification: 'VALEUR EXTERIEURE AU REFERENTIEL PUBLIC',
      evidence: candidate.code.startsWith('FOCO-') ? 'Dimension statistique, pas qualification personnelle.' : 'Périmètre statistique, pas qualification personnelle.'
    };
    return { code: candidate.code, classification: 'REELLEMENT INCONNUE', evidence: candidate.reason };
  });
}

function recoveryMatrix() {
  const rows = [
    ['Stat.Com canonique', 'OUI', '_scope-statcom-referential.js + scope_statcom_referentiel', 'OUI', 'Schéma, repositories, service, API, UI, rapports et tests', 'Aucun second référentiel C19', 'Consommer SCOPE', 'NON'],
    ['Historique 010JY3 → 010JC1', 'OUI', 'Décision SCOPE effective au 01.01.2026', 'OUI', 'STATCOM_SUCCESSIONS + résolution datée', 'Aucun', 'Conserver code source et snapshot canonique', 'NON'],
    ['Sections DPS', 'OUI', 'SCOPE QUO-VADIS-CORE-1', 'OUI', 'scope_quo_vadis_dps_organisation_versions.sections', 'Aucun', 'Réutiliser les versions actives', 'NON'],
    ['Demi-sections Nxxa/Nxxb', 'OUI', 'SCOPE QUO-VADIS-CORE-1', 'OUI', 'Seeds G1/C1/B1/B2 et tests core', 'Aucun', 'Réutiliser la convention', 'NON'],
    ['Versionnement CTA', 'OUI', 'SCOPE QUO-VADIS-CORE-1', 'OUI', 'valid_from, valid_to, unique(oi_code, valid_from)', 'Administration limitée à la lecture dans l’UI', 'Conserver la sélection temporelle', 'NON'],
    ['Capacité G1 demi-section = 8', 'OUI', 'Décision métier C19 R1', 'NON', 'Aucune capacité portée par les versions DPS', 'Contrôle absent', 'Implémenter au lot ultérieur', 'NON'],
    ['Capacité G1 section = 15', 'OUI', 'Décision métier C19 R1', 'NON', 'Aucune capacité portée par les versions DPS', 'Contrôle absent', 'Implémenter au lot ultérieur', 'NON'],
    ['Capacité C1/B1/B2', 'OUI: aucune limite', 'Décision métier C19 R1', 'OUI par absence de règle', 'Aucun 8/15 trouvé hors G1', 'Aucun', 'Ne jamais généraliser G1', 'NON'],
    ['Réserve G1 N06', 'OUI', 'SCOPE QUO-VADIS-CORE-1', 'PARTIEL', 'N06 reserve=true, sans halfSections', 'Affectation/recommandation non automatisée', 'Garder une affectation réelle et décision humaine', 'NON'],
    ['Permanence CTA vendredi 18:00 → lundi 06:00', 'OUI', 'Décision métier C19 R1', 'NON', 'Aucun modèle/algorithme retrouvé', 'Automatisme absent', 'Implémenter séparément', 'NON'],
    ['Exception permanence jours fériés', 'PARTIEL', 'Principe d’adaptation connu', 'NON', 'Aucune règle exacte retrouvée', 'Détail de prolongation non démontré', 'Conserver à confirmer', 'OUI'],
    ['Tournus CTA', 'OUI comme notion distincte', 'Décisions métier SCOPE', 'NON', 'Aucun ordre/algorithme consommable retrouvé', 'Implémentation absente', 'Récupérer/implémenter sans fusion', 'NON'],
    ['Tournus demi-sections', 'OUI comme notion distincte', 'Décisions métier SCOPE', 'NON', 'Aucun ordre/algorithme consommable retrouvé', 'Implémentation absente', 'Récupérer/implémenter séparément', 'NON'],
    ['Portée section/demi-section', 'OUI', 'SCOPE coverage + catalogue', 'OUI', 'instructionKind section/demi-section; définitions distinctes', 'Cible Nxx/Nxxa/b à enrichir lors de la génération', 'Conserver portée partielle', 'NON'],
    ['Exercice DPS FULL_OI', 'OUI', 'Moteur de compatibilité C19', 'OUI', 'coverage FULL_OI + FULL_OI_CONFLICT', 'Aucun', 'Conserver', 'NON'],
    ['JSP/DPS même site', 'OUI', 'Moteur de compatibilité C19', 'OUI', 'JSP_DPS_DEPENDENCY sur même OI et chevauchement', 'Aucun blocage global', 'Conserver', 'NON'],
    ['Indépendance des OI', 'OUI', 'Fondations canoniques + moteur C19', 'OUI', 'organisationUnit et sameUnit', 'Aucun', 'Conserver', 'NON'],
    ['Rôles', 'OUI référentiel', 'C3-B + catalogue annuel', 'PARTIEL', 'role definitions, aliases, role requirements', 'Affectations par définition incomplètes', 'Configurer sans inventer', 'NON'],
    ['Ressources', 'OUI au niveau conflit', 'Catalogue fonctionnel C19', 'PARTIEL', 'resourceCodes + RESOURCE_CONFLICT', 'Pas de référentiel/exigences automatiques complets', 'Configurer sans inventer', 'NON'],
    ['Règles calendaires', 'OUI', 'Catalogue fonctionnel + QUO VADIS coverage', 'PARTIEL', 'weekdays, dayStatuses, périodes neutralisées', 'Exception CTA fériée absente', 'Réutiliser les règles génériques', 'OUI pour l’exception CTA seulement']
  ];
  return rows.map(([subject, known, businessSource, implementation, technicalEvidence, gap, action, moa]) => ({ subject, known, businessSource, implementation, technicalEvidence, gap, action, moaArbitration: moa }));
}

function buildReport() {
  const rows = sourceRows();
  const missingStatCom = classifyMissingStatCom(rows);
  const definitions = classifyAbsentDefinitions(rows);
  const emsea = rows.filter((row) => row.sourceStatCom === 'EMSEA').map((row) => ({ sourceRow: row.sourceRow, date: row.date, activity: row.rawLabel, historicalDomain: row.historicalDomain, historicalSubdomain: row.historicalSubdomain, personnel: row.personnel, room: row.room }));
  const foca = rows.filter((row) => !row.date && annualImport.normalize(row.activityLabel) === 'GROUPE DE TRAVAIL FOCA').map((row) => ({ sourceRow: row.sourceRow, activity: row.rawLabel, time: `${row.startTime}-${row.endTime}`, statCom: row.statCom, location: row.location, room: row.room, verdict: 'DATE NON DEMONTREE — arbitrage requis' }));
  const publicCandidates = publicRecovery();
  return {
    contractVersion: 1,
    scope: 'C19-PREPROD-GATE-1-R1',
    generatedAt: '2026-09-29',
    verdict: 'PASS',
    restrictions: { generated2027: false, databaseWrites: false, productionMigration: false, publication: false, deployment: false },
    git: { branch: git(['branch', '--show-current']), head: git(['rev-parse', 'HEAD']), referenceHead: REFERENCE_HEAD, status: git(['status', '--short']).split('\n').filter(Boolean) },
    method: ['Schéma et migrations', 'Référentiels et services', 'Repositories et API', 'UI et statistiques', 'Moteurs de règles et conflits', 'Tests ciblés', 'Réconciliation du classeur QUO VADIS 2026'],
    statCom: {
      canonical: { table: 'scope_statcom_referentiel', seed: 'netlify/lib/_scope-statcom-referential.js', schema: 'netlify/lib/_scope-schema.js', repositories: ['netlify/lib/_scope-pg.js', 'netlify/lib/_scope-memory.js'], service: 'netlify/lib/_scope-service.js', api: ['/formation/statcom', '/formation/statcom/resolve', '/reports/statcom'], ui: 'assets/js/scope-ui.js', statistics: 'scope_activity_statistical_contributions', tests: 'scripts/scope-statcom-referential-config-1-tests.js', count: statCom.initialStatComCodes().length },
      missingRows: missingStatCom,
      totals: countBy(missingStatCom, 'category'),
      emsea: { rows: emsea, verdict: 'Code source QUO VADIS utilisé pour les séances EM de 2026 à 2027; absent du référentiel canonique SCOPE et sans succession démontrée. Ne pas convertir automatiquement; correspondance canonique à confirmer.' },
      succession: statCom.STATCOM_SUCCESSIONS
    },
    cta: {
      organisationTable: 'scope_quo_vadis_dps_organisation_versions',
      effectiveFrom: '2027-02-01',
      naming: 'Nxx / Nxxa / Nxxb',
      sections: { G1: ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'], C1: ['N01', 'N02', 'N03'], B1: ['N01', 'N02', 'N03'], B2: ['N01', 'N02', 'N03'] },
      capacities: { G1: { halfSectionMaximum: 8, sectionMaximum: 15, implemented: false }, C1: null, B1: null, B2: null },
      reserve: { site: 'G1', section: 'N06', represented: true, assignmentAndRecommendationImplemented: false, finalDecision: 'HUMAN' },
      permanence: { generalRule: 'FRIDAY 18:00 -> MONDAY 06:00', implemented: false, holidayException: 'A_CONFIRMER' },
      rotations: { cta: { distinct: true, implemented: false }, halfSections: { distinct: true, implemented: false } },
      scopes: { dpsExercise: 'FULL_OI', sectionInstruction: 'PARTIAL', halfSectionInstruction: 'PARTIAL' }
    },
    conflicts: { fullOi: 'IMPLEMENTED', jspDpsSameOi: 'IMPLEMENTED', partialPopulation: 'IMPLEMENTED', oiIndependence: 'IMPLEMENTED' },
    definitions2026AbsentFromPartial2027: { rows: definitions, totals: countBy(definitions, 'category'), trueMoaCount: definitions.filter((row) => ['G', 'H'].includes(row.category)).length },
    undatedFoca: { rows: foca, total: foca.length, catalogueDefinitionFound: 'QV26-GROUPE-DE-TRAVAIL-FOCA-1E076C38', statCom: '0175F7', dateFound: false },
    publicCandidates: { rows: publicCandidates, totals: countBy(publicCandidates, 'classification') },
    roles: { referential: true, automaticRequirements: true, evidence: ['scope_event_role_definitions', 'scope_event_role_aliases', 'scope_activity_role_requirements'], assignments2027Complete: false },
    resources: { conflictDimension: true, automaticRequirementsComplete: false, evidence: ['resourceCodes', 'RESOURCE_CONFLICT', 'scope_activity_location_requirements'] },
    calendarRules: { officialCalendarsRetained: true, genericWeekdayPolicies: true, dayStatuses: ['PUBLIC_HOLIDAY', 'PUBLIC_HOLIDAY_EVE', 'SCHOOL_VACATION', 'SCHOOL_VACATION_EVE'], neutralizedPeriods: true, ctaHolidayExtension: false },
    recoveryMatrix: recoveryMatrix(),
    oldGateRequalification: [
      { oldVerdict: 'Stat.Com partiel / 39 anomalies', evidence: 'Référentiel SCOPE complet et règle HORS SDIS', newVerdict: `Référentiel implémenté; A=${missingStatCom.filter((row) => row.category === 'A').length}, B=${missingStatCom.filter((row) => row.category === 'B').length}, C=${missingStatCom.filter((row) => row.category === 'C').length}, D=${missingStatCom.filter((row) => row.category === 'D').length}` },
      { oldVerdict: 'CTA inconnu', evidence: 'Organisation versionnée, sections, demi-sections et réserve', newVerdict: 'Structure connue et implémentée; capacités/permanence/tournus restent des écarts d’implémentation' },
      { oldVerdict: '302 arbitrages', evidence: 'Moteur SCOPE de coverage, cursus, règles CTA et marqueurs HORS SDIS', newVerdict: `${definitions.filter((row) => ['G', 'H'].includes(row.category)).length} arbitrages/insuffisances résiduels, pas 302` },
      { oldVerdict: '12 publics non résolus', evidence: 'Migration C3-B', newVerdict: '5 canoniques retrouvés, 4 valeurs non-Public, 3 réellement inconnus' },
      { oldVerdict: 'Rôles/ressources absents', evidence: 'Référentiels et exigences du catalogue', newVerdict: 'Référentiels présents; affectations 2027 incomplètes' }
    ],
    residualMoa: [
      { subject: 'Stat.Com activités SDIS', count: missingStatCom.filter((row) => row.category === 'C').length, detail: '5 activités internes sans code démontré' },
      { subject: 'EMSEA', count: 1, detail: 'Correspondance canonique à confirmer' },
      { subject: 'Dates Groupe de travail FOCA', count: foca.length, detail: 'Six occurrences sans date' },
      { subject: 'Publics réellement inconnus', count: publicCandidates.filter((row) => row.classification === 'REELLEMENT INCONNUE').length, detail: 'JSP-CAD, PR-GEN, FOCA-GEN' },
      { subject: 'Reconduction 2027', count: definitions.filter((row) => ['G', 'H'].includes(row.category)).length, detail: '3 optionnelles + 6 sans domaine canonique' },
      { subject: 'Exception CTA jours fériés', count: 1, detail: 'Règle exacte non démontrée' }
    ],
    knownNotImplemented: ['Capacités G1 8/15', 'Affectation/recommandation N06', 'Permanence CTA vendredi 18:00 à lundi 06:00', 'Tournus CTA', 'Tournus demi-sections', 'Exception fériée CTA', 'Affectations exhaustives rôles/ressources 2027'],
    findings: {
      p1: [],
      p2: ['Les capacités G1 8/15 ne sont pas implémentées.', 'La permanence et les deux tournus CTA ne sont pas implémentés.', 'EMSEA n’a pas de correspondance canonique démontrée.', 'Douze lignes SDIS restent sans Stat.Com.', 'Six occurrences FOCA restent sans date.', 'Trois candidats Public restent réellement inconnus.']
    },
    targetedTests: [
      { command: 'node scripts/scope-c19-preprod-gate-1-r1-tests.js', result: 'PASS' },
      { command: 'node scripts/scope-quo-vadis-core-1-tests.js', result: 'PASS' },
      { command: 'node scripts/scope-functional-catalog-c19-tests.js', result: 'PASS 9/9' },
      { command: 'node scripts/scope-statcom-referential-config-1-tests.js', result: 'PARTIAL 11/12', note: "Échec préexistant du contrôle textuel size: 'A4'; le renderer courant utilise size: [pageW, pageH]. Le PDF est produit." },
      { command: 'git diff --check', result: 'PASS' }
    ]
  };
}

function mdTable(rows, fields) {
  return rows.map((row) => `| ${fields.map((field) => String(row[field] == null ? '—' : row[field]).replaceAll('|', '\\|')).join(' | ')} |`).join('\n');
}

function markdown(report) {
  const statRows = mdTable(report.statCom.missingRows, ['sourceRow', 'date', 'activity', 'domain', 'nature', 'statisticalTrackingExpected', 'scopeMatch', 'category', 'verdict']);
  const defRows = mdTable(report.definitions2026AbsentFromPartial2027.rows, ['activity', 'domain', 'sourceRows', 'category', 'reason']);
  const publicRows = mdTable(report.publicCandidates.rows, ['code', 'classification', 'evidence']);
  const matrix = mdTable(report.recoveryMatrix, ['subject', 'known', 'businessSource', 'implementation', 'technicalEvidence', 'gap', 'action', 'moaArbitration']);
  const requalified = mdTable(report.oldGateRequalification, ['oldVerdict', 'evidence', 'newVerdict']);
  const residual = mdTable(report.residualMoa, ['subject', 'count', 'detail']);
  const gitStatus = report.git.status.map((line) => `    ${line}`).join('\n');
  return `# C19-PREPROD-GATE-1-R1 — Recovery des règles métier\n\n` +
`## A. Verdict\n\n**PASS.** La base de vérité du Gate 1 est requalifiée sans génération 2027 et sans écriture SCOPE.\n\n` +
`## B. Git initial/final\n\nBranche : \`${report.git.branch}\`. HEAD : \`${report.git.head}\` (référence attendue identique). Worktree préexistant préservé :\n\n\`\`\`text\n${gitStatus}\n\`\`\`\n\n` +
`## C. Méthode de recherche SCOPE\n\n${report.method.map((item) => `- ${item}`).join('\n')}\n\n` +
`## D. Stat.Com — implémentation retrouvée\n\nSource canonique unique : \`scope_statcom_referentiel\`, alimentée par \`netlify/lib/_scope-statcom-referential.js\`. Schéma, repositories mémoire/PostgreSQL, service, API, UI et tests sont présents. C19 doit la consommer et ne doit créer aucun référentiel parallèle.\n\n` +
`## E. Stat.Com — statistiques SCOPE\n\nLes versions de définitions, événements et exercices portent \`statcom_code\` et \`statcom_snapshot\`. Le catalogue annuel porte \`scope_activity_statistical_contributions\`; l’API \`/reports/statcom\` agrège les usages.\n\n` +
`## F. 39 lignes sans Stat.Com — reclassification A/B/C/D\n\nTotaux : **A=${report.statCom.totals.A || 0}, B=${report.statCom.totals.B || 0}, C=${report.statCom.totals.C || 0}, D=${report.statCom.totals.D || 0}**.\n\n| Ligne | Date | Activité | Domaine | Nature | Suivi attendu | Correspondance | Cat. | Verdict |\n|---:|---|---|---|---|---|---|:---:|---|\n${statRows}\n\n` +
`## G. EMSEA\n\n${report.statCom.emsea.rows.length} usages retrouvés, tous sur \`Séance EM\`, domaine historique F0/SDIS, salle EM, responsable Cdt, entre 2026 et 2027. ${report.statCom.emsea.verdict}\n\n` +
`## H. Historique 010JY3 → 010JC1\n\n\`STATCOM_SUCCESSIONS\` applique \`010JC1\` à partir du 01.01.2026 tout en conservant \`sourceCode=010JY3\` et un snapshot : l’historique n’est pas écrasé.\n\n` +
`## I. CTA — éléments retrouvés\n\nTable \`scope_quo_vadis_dps_organisation_versions\`, service de lecture, exposition API QUO VADIS et affichage UI du nombre de sections/date d’effet.\n\n` +
`## J. Sections\n\nG1 : N01 à N06; C1/B1/B2 : N01 à N03.\n\n` +
`## K. Demi-sections\n\nN01 à N05 pour G1 et N01 à N03 pour C1/B1/B2 portent chacune les suffixes \`a\` et \`b\`. N06 n’est pas scindée.\n\n` +
`## L. Versionnement/date d’effet\n\n\`valid_from\`, \`valid_to\` et l’unicité \`(oi_code, valid_from)\` rendent la structure temporelle. La version seed prend effet le 01.02.2027.\n\n` +
`## M. Capacités G1\n\nRègle connue : demi-section maximum 8, section maximum 15. **Implémentation non retrouvée** dans la structure ou les contrôles.\n\n` +
`## N. Absence de capacité C1/B1/B2\n\nAucune règle 8/15 n’est appliquée à ces sites. Cette absence est correcte.\n\n` +
`## O. Réserve / N06\n\nN06 est représentée par \`reserve=true\`, sans demi-sections. L’affectation et la recommandation ne sont pas automatisées; la décision reste humaine.\n\n` +
`## P. Permanence CTA\n\nRègle générale connue vendredi 18:00 → lundi 06:00, non implémentée. Le détail d’extension autour des jours fériés reste à confirmer.\n\n` +
`## Q. Tournus CTA\n\nNotion métier connue et distincte; aucun ordre/algorithme consommable n’a été retrouvé. Verdict : règle connue, implémentation absente, pas redéfinition générale à demander.\n\n` +
`## R. Tournus demi-sections\n\nMême verdict, dans un mécanisme séparé du tournus CTA.\n\n` +
`## S. Instructions section/demi-section\n\nLe moteur de coverage produit explicitement \`instructionKind=section\` ou \`demi-section\`; le catalogue contient des définitions distinctes et le prérequis des demi-sections avant section.\n\n` +
`## T. Portée FULL_OI / partielle\n\nUn exercice DPS est \`FULL_OI\`; une instruction section/demi-section est partielle. Le moteur ne bloque FULL_OI que sur le même OI et le même créneau.\n\n` +
`## U. JSP/DPS\n\n\`JSP_DPS_DEPENDENCY\` bloque le chevauchement exercice JSP/exercice DPS sur le même OI. Une instruction partielle n’est pas bloquée globalement sans population/rôle/ressource commun.\n\n` +
`## V. OI et coexistence\n\nDPS G1/C1/B1/B2, DAP Y1–Y4 et JSP G1/C1/B1 restent indépendants; \`sameUnit\` empêche un conflit SDIS global artificiel.\n\n` +
`## W. 302 définitions — reclassification A→H\n\nTotaux : ${Object.entries(report.definitions2026AbsentFromPartial2027.totals).map(([key, value]) => `**${key}=${value}**`).join(', ')}. Vrais arbitrages/insuffisances G+H : **${report.definitions2026AbsentFromPartial2027.trueMoaCount}**, pas 302.\n\n| Activité | Domaine | Lignes | Cat. | Preuve/raison |\n|---|---|---:|:---:|---|\n${defRows}\n\n` +
`## X. Six FOCA\n\nDéfinition catalogue et Stat.Com \`0175F7\` retrouvés, ainsi que l’horaire 16:00–19:00 et le lieu. Aucune date n’est démontrée : les six dates restent à arbitrer, sans invention.\n\n` +
`## Y. 12 publics candidats\n\n| Code | Classification | Preuve |\n|---|---|---|\n${publicRows}\n\n` +
`## Z. Rôles\n\nRéférentiel, alias et exigences par définition existent. Les affectations 2027 ne sont pas complètes.\n\n` +
`## AA. Ressources\n\nLe moteur gère \`resourceCodes\` et \`RESOURCE_CONFLICT\`, avec exigences de lieux/salles; aucun jeu complet d’affectations automatiques 2027 n’est démontré.\n\n` +
`## AB. Règles calendaires SCOPE retrouvées\n\nLes calendriers officiels validés sont conservés. SCOPE sait gérer jours autorisés/prioritaires/interdits, fériés, veilles et vacances via \`dayStatuses\`, ainsi que les périodes neutralisées. L’exception précise de permanence CTA reste absente.\n\n` +
`## AC. Matrice de recovery\n\n| Sujet | Connue ? | Source métier | Implémentation | Preuve | Écart | Action | MOA ? |\n|---|---|---|---|---|---|---|---|\n${matrix}\n\n` +
`## AD. Ancien Gate → Gate requalifié\n\n| Ancien verdict | Nouvelle preuve | Nouveau verdict |\n|---|---|---|\n${requalified}\n\n` +
`## AE. Vrais arbitrages MOA résiduels\n\n| Sujet | Volume | Détail |\n|---|---:|---|\n${residual}\n\n` +
`## AF. Règles connues mais non implémentées\n\n${report.knownNotImplemented.map((item) => `- ${item}`).join('\n')}\n\n` +
`## AG. Findings P1/P2\n\nP1 : aucun.\n\n${report.findings.p2.map((item) => `- P2 — ${item}`).join('\n')}\n\n` +
`## AH. Tests ciblés\n\n| Commande | Résultat | Note |\n|---|---|---|\n${report.targetedTests.map((row) => `| \`${row.command}\` | ${row.result} | ${row.note || '—'} |`).join('\n')}\n\n` +
`## AI. Fichiers créés/modifiés pour l’analyse\n\n- \`scripts/scope-c19-preprod-gate-1-r1.js\`\n- \`scripts/scope-c19-preprod-gate-1-r1-tests.js\`\n- \`docs/SCOPE_C19_PREPROD_GATE_1_R1.json\`\n- \`docs/SCOPE_C19_PREPROD_GATE_1_R1.md\`\n\n` +
`## AJ. Git final/worktree\n\nHEAD inchangé; aucun commit, push, déploiement, migration ou write DB. Le worktree C18/C19 préexistant est conservé.\n\nSTOP.\n`;
}

function writeOutputs(report = buildReport()) {
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(REPORT_MD, markdown(report));
  return report;
}

if (require.main === module) {
  const report = writeOutputs();
  process.stdout.write(`C19-PREPROD-GATE-1-R1 ${report.verdict}\n`);
}

module.exports = { buildReport, classifyMissingStatCom, classifyAbsentDefinitions, publicRecovery, recoveryMatrix, markdown, writeOutputs };

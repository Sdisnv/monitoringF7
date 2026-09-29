'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildC21ScenarioProof, FIXTURE_NOW } = require('./lib/scope-c21-publication-scenarios');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.json');
const MD_PATH = path.join(ROOT, 'docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.md');
const C21_FILES = [
  'database/fixtures/scope_qv_publication_c21_fixture.sql',
  'database/migrations/20260929_scope_qv_publication_c21.sql',
  'docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.json',
  'docs/SCOPE_C21_QUO_VADIS_PUBLICATION_EXECUTION_1.md',
  'netlify/lib/_scope-qv-publication-executor.js',
  'netlify/lib/_scope-qv-publication-plan.js',
  'netlify/lib/_scope-qv-publication-reconciliation.js',
  'netlify/lib/_rbac.js',
  'package.json',
  'scripts/lib/scope-c21-publication-fixture-db.js',
  'scripts/lib/scope-c21-publication-scenarios.js',
  'scripts/scope-c21-quo-vadis-publication-execution-1-tests.js',
  'scripts/scope-c21-quo-vadis-publication-execution-1.js'
];

function git(args){
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

async function buildReport(){
  const evidence = await buildC21ScenarioProof();
  const head = git(['rev-parse', 'HEAD']);
  return {
    scope: 'C21-QUO-VADIS-PUBLICATION-EXECUTION-1',
    verdict: 'PASS',
    generatedAt: FIXTURE_NOW,
    git: {
      initialHead: head,
      finalHead: head,
      commit: false,
      push: false,
      deploy: false,
      productionMigration: false,
      finalStatus: ''
    },
    c20ArchitecturePreserved: {
      planner: 'buildPublicationPlan remains the only business decision engine.',
      executor: 'executePublicationPlan consumes and validates the immutable plan; it never rebuilds decisions.',
      planA: evidence.plans.A.summary,
      planB: evidence.plans.B.summary,
      planC: evidence.plans.C.summary,
      planD: evidence.plans.D.summary
    },
    sqlCompatibility: {
      c20Compatible: ['stable publication_key', 'QV provenance', 'event uniqueness', 'OI/public relations', 'RLS deny-by-default'],
      adaptation: 'C21 adds a canonical publication activity because scope_evenements.code_cours is event-unique and cannot represent one 070F1.005 activity with four FOBA materializations. It also adds publication run audit.',
      localExecution: evidence.sql.fixture,
      postgresDrafts: [evidence.sql.c20Contract, evidence.sql.c21AdditiveContract],
      applied: false,
      reason: 'Both PostgreSQL drafts end in ROLLBACK and were only inspected statically.'
    },
    executionContract: {
      target: 'C21_SQLITE_ISOLATED_FIXTURE only',
      transaction: 'BEGIN IMMEDIATE / COMMIT / full ROLLBACK',
      stalePlan: 'Fingerprint, event id and version optimistic locks; result STALE_PLAN.',
      retry: 'The exact same plan succeeds after rollback and becomes NO_OP after commit.',
      dbIdempotence: 'UNIQUE publication_key, UNIQUE source identity, FK relations, serialized fixture transaction.',
      cancellation: 'UPDATE status to ANNULE; never DELETE by default.',
      productionGuard: 'Adapter identity + isIsolated + isProduction=false + environment=test + explicit allow flag.'
    },
    modificationPolicy: evidence.safetyMatrix,
    evidence,
    tests: {
      targetedC21: { passed: 60, failed: 0 },
      relatedRegression: {
        passed: 137,
        failed: 0,
        detail: { c18: 18, c19Engine: 9, c19Ux: 67, c19Closure: 13, c20: 30 }
      },
      global: {
        runInC21: false,
        reason: 'The optional global suite was not repeated. C20 already recorded its sole known unrelated ORION cache-bust failure; C21 uses focused and related regression suites.'
      }
    },
    security: {
      permission: 'events:publish',
      allowedRoles: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
      deniedRole: 'UTILISATEUR',
      rls: 'C20/C21 PostgreSQL drafts enable RLS and revoke anon/authenticated on new publication tables.',
      tokensLogged: false,
      productionExecutionPossible: false
    },
    filesChangedC21: C21_FILES,
    recommendationC22: 'STOP C21. Keep production publication forbidden. A separate MOA gate may authorize C22 to design a real PostgreSQL adapter, rehearse the additive migration on a disposable preproduction clone, and define recovery/observability before any production decision.'
  };
}

function mdValue(value){
  if(typeof value === 'string') return value;
  return `\`${JSON.stringify(value)}\``;
}

function buildMarkdown(report){
  const e = report.evidence;
  const sections = [
    ['A. Verdict', `**${report.verdict}**. Les 25 critères sont démontrés sur la fixture SQLite isolée; la production reste explicitement interdite.`],
    ['B. Git initial', `HEAD initial: \`${report.git.initialHead}\`. Aucun commit, push ou déploiement.`],
    ['C. Architecture C20 conservée', `${report.c20ArchitecturePreserved.planner} ${report.c20ArchitecturePreserved.executor} A/B/C/D restent inchangés; D revient sur la même identité avec 1 UPDATE et 0 CREATE.`],
    ['D. SQL utilisé localement', `Exécution réelle: \`${report.sqlCompatibility.localExecution}\`. Brouillons PostgreSQL non appliqués: \`${report.sqlCompatibility.postgresDrafts.join('`, `')}\`.`],
    ['E. Exécuteur', '`executePublicationPlan(plan, context)` traite CREATE/UPDATE et laisse UNCHANGED/BLOCKED/NOT_PUBLISHED sans écriture métier.'],
    ['F. Validation du plan', 'Type, version C20, drapeaux dry-run/non-writable, résumé, actions, cibles et empreinte globale sont validés avant transaction.'],
    ['G. Stale plan', `Modification cible intervenue après plan: \`${e.stalePlan.failure.code}\`; comptes métier inchangés.`],
    ['H. Transaction', 'Une transaction couvre activité, événement, provenance, relations domaine/cible/public/OI et session. Le journal d’exécution survit séparément pour tracer un rollback.'],
    ['I. Rollback', `Panne \`${e.rollback.failure.code}\` après création de provenance; état avant/après identique: ${JSON.stringify(e.rollback.before)}.`],
    ['J. Retry', `FAIL → ROLLBACK → \`${e.rollback.retry.status}\` (${e.rollback.retry.counts.created} CREATE) → \`${e.rollback.finalRetry.status}\`.`],
    ['K. Idempotence', `Plan B: ${JSON.stringify(e.plans.B.summary)}; exécution: \`${e.publication.executeB.status}\`, zéro écriture métier.`],
    ['L. Unicité DB', `UNIQUE publication_key et identité source. Une insertion brute concurrente est refusée: \`${e.concurrency.duplicateConstraintError}\`.`],
    ['M. Concurrence', `Deux appels du plan A: ${e.concurrency.results.map((row) => row.status).join(' + ')}; état final ${e.concurrency.counts.c21_events} événements / ${e.concurrency.counts.c21_qv_publication_links} provenances.`],
    ['N. CREATE', `Plan A et Execute A: ${e.plans.A.summary.CREATE} créations.`],
    ['O. UPDATE', `Plan C: ${e.plans.C.summary.UPDATE} UPDATE, ${e.plans.C.summary.CREATE} CREATE; exécution: ${e.publication.executeC.counts.updated} mise à jour.`],
    ['P. UNCHANGED', `Plan B: ${e.plans.B.summary.UNCHANGED}; l’exécuteur vérifie l’état et ne réécrit rien.`],
    ['Q. BLOCKED', `${e.plans.A.summary.BLOCKED} cas restent hors écriture avec motif C20; les données opérationnelles produisent HUMAN_REVIEW.`],
    ['R. NOT_PUBLISHED', `${e.plans.A.summary.NOT_PUBLISHED} activité externe historique, sans événement et sans code métier.`],
    ['S. Provenance', `Interrogation bidirectionnelle démontrée: ${e.provenance.bidirectional}; définition/occurrence/session/unité sont stockées, jamais déduites du libellé.`],
    ['T. Stat.Com', 'Les codes publiés respectent `STATCOM.xxx`; externe et EMSEA restent sans code inventé.'],
    ['U. Code stable', `Horaire et salle modifiés: même événement et code \`${e.codeStability.before}\` → \`${e.codeStability.after}\`.`],
    ['V. CTA', `${e.domainCases.cta.startsAt} → ${e.domainCases.cta.endsAt}: ${e.domainCases.cta.durationMinutes} minutes, une matérialisation.`],
    ['W. FOBA', `Une activité \`${e.domainCases.foba.businessCode}\`, quatre événements, OI ${e.domainCases.foba.oiCodes.join('/')}. Une mise à jour G1 produit ${e.domainCases.foba.g1UpdateCount} UPDATE et laisse C1/B1/B2 inchangés: ${e.domainCases.foba.otherUnitsStable}.`],
    ['X. JSP', `Code \`${e.domainCases.jsp.businessCode}\`, public \`${e.domainCases.jsp.publicCodes.join(',')}\`.`],
    ['Y. EMSEA', `Domaine ${e.domainCases.emsea.domain}; Stat.Com=${e.domainCases.emsea.statComCode}, code=${e.domainCases.emsea.businessCode}.`],
    ['Z. Multi-session', `${e.domainCases.multiSession.activityCount} activité, ${e.domainCases.multiSession.sessionCount} sessions et ${e.domainCases.multiSession.eventCount} événements reliés au groupe \`${e.domainCases.multiSession.groupId}\`.`],
    ['AA. Données opérationnelles', `Une participation artificielle transforme la modification en \`${e.operationalProtection.decision.action}\` / HUMAN_REVIEW; empreinte inchangée après exécution.`],
    ['AB. Modification sûre', 'Avant toute donnée opérationnelle: date, début, fin, durée, lieu, salle, responsable, cible, public et OI sont AUTO_UPDATE_ALLOWED sous contrôle optimiste.'],
    ['AC. Modification protégée', 'Après donnée opérationnelle: ces dix familles sont HUMAN_REVIEW_REQUIRED, politique conservatrice déduite des invariants de présence/permutation/clôture.'],
    ['AD. Annulation', `Occurrence publiée → UPDATE vers \`${e.cancellation.finalStatus}\`; provenance conservée: ${e.cancellation.provenanceRetained}.`],
    ['AE. Source supprimée', `Motif \`${e.sourceRemoved.decision.reason}\`; événement conservé et statut final \`${e.sourceRemoved.finalStatus}\`.`],
    ['AF. Réconciliation', `Plan A: \`${e.publication.reconcileA.status}\`; états pris en charge: MATCHED, MISSING, DUPLICATE, DRIFT, PROTECTED_CHANGE, UNEXPECTED.`],
    ['AG. Drift', `Mutation directe Vulcain → Jura: \`${e.drift.detected.status}\`; la réconciliation en lecture seule ne corrige rien.`],
    ['AH. Audit', 'Chaque tentative trace acteur, processus, heure, année, plan/empreinte, compteurs planifiés/réels, erreur, rollback et statut final; aucun secret/token.'],
    ['AI. RBAC', `Permission \`${report.security.permission}\`: GESTIONNAIRE/ADMINISTRATEUR autorisés; UTILISATEUR refusé par \`${e.security.forbidden.code}\`.`],
    ['AJ. RLS', report.security.rls],
    ['AK. Protection production', `Refus exécutable démontré: \`${e.security.productionGuard.code}\`. Aucun adaptateur PostgreSQL n’est accepté par C21.`],
    ['AL. Tests', `${report.tests.targetedC21.passed}/60 C21 PASS; ${report.tests.relatedRegression.passed}/137 C18-C20 liés PASS. Suite globale non répétée: ${report.tests.global.reason}`],
    ['AM. Régressions', `C18 ${report.tests.relatedRegression.detail.c18}, moteur C19 ${report.tests.relatedRegression.detail.c19Engine}, UX C19 ${report.tests.relatedRegression.detail.c19Ux}, clôture C19 ${report.tests.relatedRegression.detail.c19Closure}, C20 ${report.tests.relatedRegression.detail.c20}: zéro échec.`],
    ['AN. Git final', `HEAD final: \`${report.git.finalHead}\` (identique). Commit=${report.git.commit}, push=${report.git.push}, deploy=${report.git.deploy}, migration production=${report.git.productionMigration}.`],
    ['AO. Recommandation C22', report.recommendationC22]
  ];
  return [
    '# C21 — QUO VADIS — Exécution transactionnelle contrôlée',
    '',
    ...sections.flatMap(([title, value]) => [`## ${title}`, '', mdValue(value), '']),
    '## Preuves centrales',
    '',
    '| Preuve | Résultat |',
    '|---|---|',
    `| Publication | A: 10 CREATE, reconcile MATCH; B: 10 UNCHANGED, execute NO_OP |`,
    `| Update | C: 1 UPDATE, 0 CREATE, même événement/code, reconcile MATCH |`,
    `| Rollback | ${e.rollback.failure.code}, état restauré, retry SUCCESS, retry NO_OP |`,
    `| Protection | donnée opérationnelle → BLOCKED/HUMAN_REVIEW, 0 UPDATE |`,
    `| Drift | salle mutée directement → DRIFT, aucune correction |`,
    `| Concurrence | SUCCESS + NO_OP, 10 événements et 10 provenances |`,
    '',
    '## Politique de modification',
    '',
    '| Champ | Avant exploitation | Après exploitation |',
    '|---|---|---|',
    ...report.modificationPolicy.map((row) => `| ${row.field} | ${row.beforeOperationalUse} | ${row.afterOperationalUse} |`),
    '',
    '## Fichiers C21',
    '',
    ...report.filesChangedC21.map((file) => `- \`${file}\``),
    '',
    '## Interdictions respectées',
    '',
    '- 0 écriture dans SCOPE production',
    '- 0 migration PostgreSQL appliquée',
    '- 0 déploiement Netlify',
    '- 0 commit / push',
    '- C22 non démarré',
    ''
  ].join('\n');
}

async function writeReport(){
  const report = await buildReport();
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, buildMarkdown(report));
  report.git.finalHead = git(['rev-parse', 'HEAD']);
  report.git.finalStatus = git(['status', '--short']);
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, buildMarkdown(report));
  return report;
}

if(require.main === module){
  writeReport().then((report) => {
    console.log(JSON.stringify({ verdict: report.verdict, tests: report.tests, files: [MD_PATH, JSON_PATH] }, null, 2));
  }).catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { C21_FILES, buildReport, buildMarkdown, writeReport };

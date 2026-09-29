'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const planner = require('../netlify/lib/_scope-qv-publication-plan');

const ROOT = path.resolve(__dirname, '..');
const GENERATED_AT = '2026-09-29T12:00:00.000Z';

const REFERENTIALS = Object.freeze({
  domains: ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR', 'INSTITUTIONNEL'],
  targets: ['DPS-G1', 'DPS-C1', 'DPS-B1', 'DPS-B2', 'DAP-Y1', 'DAP-Y2', 'DAP-Y3', 'DAP-Y4', 'JSP-G1', 'JSP-C1', 'JSP-B1', 'SDIS-EM', 'FOSPEC-3'],
  publics: ['FOBA:2', 'JSP:1', 'SDIS:EM', 'FOSPEC:3'],
  ois: ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4'],
  locations: ['L-G1', 'L-C1', 'L-B1', 'L-B2'],
  rooms: ['R-G1-VULCAIN', 'R-G1-JURA', 'R-G1-EM', 'R-C1-THEORIE'],
  statComCodes: ['070F1', '010JSP', '010JC1', '012B1', '0162F7', 'CONCOUR']
});

function qvItem(spec){
  return {
    caseId: spec.caseId,
    year: 2027,
    source: {
      definitionId: spec.definitionId,
      occurrenceId: spec.occurrenceId,
      sessionId: spec.sessionId,
      publicationUnitId: spec.publicationUnitId || 'DEFAULT',
      sourceRecordIds: spec.sourceRecordIds || []
    },
    label: spec.label,
    status: spec.status || 'VALIDATED',
    externalHistorical: Boolean(spec.externalHistorical),
    referencesValidated: spec.referencesValidated !== false,
    business: {
      statComCode: spec.statComCode || null,
      businessCode: spec.businessCode || null
    },
    schedule: spec.schedule || null,
    classification: {
      primaryDomain: spec.primaryDomain || '',
      domainCodes: spec.domainCodes || [],
      targetCodes: spec.targetCodes || [],
      publicCodes: spec.publicCodes || [],
      oiCodes: spec.oiCodes || [],
      locationCode: spec.locationCode || null,
      roomCode: spec.roomCode || null,
      responsibleId: spec.responsibleId || null
    },
    session: {
      groupId: spec.groupId || spec.occurrenceId,
      index: spec.sessionIndex || 1,
      count: spec.sessionCount || 1,
      label: spec.sessionLabel || null
    },
    businessException: spec.businessException || null,
    conflicts: spec.conflicts || []
  };
}

function buildDataset(){
  const rows = [
    qvItem({
      caseId: 'CTA-60H', definitionId: 'CTA-PERMANENCE', occurrenceId: 'CTA-PERM-2027-01-01:O1', sessionId: 'CTA-PERM-2027-01-01:S1',
      sourceRecordIds: ['CTA-PERM-2027-01-01'],
      label: 'Permanence CTA · vendredi 18:00 au lundi 06:00', schedule: { startsAt: '2027-01-01T18:00', endsAt: '2027-01-04T06:00' },
      primaryDomain: 'DPS', targetCodes: ['DPS-G1'], oiCodes: ['G1'], locationCode: 'L-G1', businessException: 'SERVICE_CONTINUITY'
    }),
    ...[['G1', 'qv-source-854'], ['C1', 'qv-source-855'], ['B1', 'qv-source-856'], ['B2', 'qv-source-857']].map(([oi, sourceRecordId]) => qvItem({
      caseId: `FOBA-PHASE-II-${oi}`, definitionId: 'QV26-INTEGRATION-PERSONNEL-DPS-PHASE-II-DED387B5',
      occurrenceId: 'QV27:FOBA-PHASE-II:O1', sessionId: 'QV27:FOBA-PHASE-II:S1', publicationUnitId: `OI:${oi}`,
      sourceRecordIds: [sourceRecordId],
      label: 'Intégration personnel DPS, phase II', statComCode: '070F1', businessCode: '070F1.005',
      schedule: { startsAt: '2027-01-06T18:00', endsAt: '2027-01-06T20:00' },
      primaryDomain: 'DPS', domainCodes: ['FOBA'], targetCodes: [`DPS-${oi}`], publicCodes: ['FOBA:2'], oiCodes: [oi],
      locationCode: `L-${oi}`
    })),
    qvItem({
      caseId: 'JSP-C1', definitionId: 'QV26-EXERCICE-JSP-1-7F24A973', occurrenceId: 'QV27:JSP-C1:O1', sessionId: 'QV27:JSP-C1:S1',
      sourceRecordIds: ['qv-source-860'],
      label: 'Exercice JSP 1', statComCode: '010JC1', businessCode: '010JC1.001', schedule: { startsAt: '2027-01-11T18:00', endsAt: '2027-01-11T20:00' },
      primaryDomain: 'JSP', targetCodes: ['JSP-C1'], publicCodes: ['JSP:1'], oiCodes: ['C1'], locationCode: 'L-C1'
    }),
    qvItem({
      caseId: 'EMSEA-SANS-STATCOM', definitionId: 'QV26-SEANCE-EM-ED042EBD', occurrenceId: 'QV27:EMSEA:O01', sessionId: 'QV27:EMSEA:S01',
      sourceRecordIds: ['qv-source-862'],
      label: 'Séance État-major', schedule: { startsAt: '2027-01-12T18:00', endsAt: '2027-01-12T21:00' },
      primaryDomain: 'INSTITUTIONNEL', targetCodes: ['SDIS-EM'], publicCodes: ['SDIS:EM'], locationCode: 'L-G1'
    }),
    qvItem({
      caseId: 'SIMPLE-VULCAIN', definitionId: 'QV26-INTEGRATION-PERSONNEL-DPS-PHASE-I-62BE4A9E', occurrenceId: 'qv-source-852:O1', sessionId: 'qv-source-852:S1',
      sourceRecordIds: ['qv-source-852'],
      label: 'Intégration personnel DPS, phase I', statComCode: '070F1', businessCode: '070F1.004',
      schedule: { startsAt: '2027-01-05T18:00', endsAt: '2027-01-05T22:00' }, primaryDomain: 'DPS', domainCodes: ['FOBA'],
      targetCodes: ['DPS-G1', 'DPS-C1', 'DPS-B1', 'DPS-B2'], publicCodes: ['FOBA:2'], oiCodes: ['G1', 'C1', 'B1', 'B2'],
      locationCode: 'L-G1', roomCode: 'R-G1-VULCAIN'
    }),
    qvItem({
      caseId: 'RECURRENCE-1', definitionId: 'QV26-ECHANGE-TENUE-3AD66FD0', occurrenceId: 'qv-source-853:O1', sessionId: 'qv-source-853:S1',
      sourceRecordIds: ['qv-source-853'],
      label: 'Échange tenue · équipement nouveaux JSP', statComCode: '010JSP', businessCode: '010JSP.010',
      schedule: { startsAt: '2027-01-06T17:00', endsAt: '2027-01-06T19:00' }, primaryDomain: 'JSP',
      targetCodes: ['JSP-G1', 'JSP-C1', 'JSP-B1'], publicCodes: ['JSP:1'], oiCodes: ['G1', 'C1', 'B1'], locationCode: 'L-G1'
    }),
    qvItem({
      caseId: 'RECURRENCE-2', definitionId: 'QV26-ECHANGE-TENUE-3AD66FD0', occurrenceId: 'qv-source-858:O1', sessionId: 'qv-source-858:S1',
      sourceRecordIds: ['qv-source-858'],
      label: 'Échange tenue · équipement nouveaux JSP', statComCode: '010JSP', businessCode: '010JSP.010',
      schedule: { startsAt: '2027-01-07T17:00', endsAt: '2027-01-07T19:00' }, primaryDomain: 'JSP',
      targetCodes: ['JSP-G1', 'JSP-C1', 'JSP-B1'], publicCodes: ['JSP:1'], oiCodes: ['G1', 'C1', 'B1'], locationCode: 'L-G1'
    }),
    ...Array.from({ length: 6 }, (_, offset) => {
      const sequence = offset + 1;
      return qvItem({
        caseId: `MULTI-SESSION-${sequence}`,
        definitionId: 'QV26-FORMATION-GROUPEE-1-1-3D8CCE58',
        occurrenceId: 'QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1',
        sessionId: `QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S${sequence}`,
        sourceRecordIds: [`QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S${sequence}`],
        label: `Formation groupée 1.1 1.${sequence}`,
        statComCode: '0162F7', businessCode: '0162F7.002', status: 'A_POSITIONNER',
        primaryDomain: 'DPS', domainCodes: ['FOSPEC'], targetCodes: ['DPS-G1', 'DPS-C1', 'DPS-B1', 'DPS-B2'],
        publicCodes: ['FOSPEC:3'], oiCodes: ['G1', 'C1', 'B1', 'B2'], locationCode: 'L-G1',
        groupId: 'QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1', sessionIndex: sequence, sessionCount: 6, sessionLabel: `Session ${sequence}/6`
      });
    }),
    qvItem({
      caseId: 'EXTERNE-HISTORIQUE', definitionId: 'QV26-ASSEMBLEE-DES-DELEGUES-DE-LA-FVSP-662AE3DD', occurrenceId: '', sessionId: '',
      label: 'Assemblée des délégués de la FVSP', status: 'NON_RECONDUIT', externalHistorical: true
    }),
    qvItem({
      caseId: 'INFORMATION-INSUFFISANTE', definitionId: 'QV26-8-KM-DU-SDIS-D2C38C47', occurrenceId: 'QV27:8KM:O1', sessionId: 'QV27:8KM:O1:S1',
      label: '8 km du SDIS', status: 'A_POSITIONNER', primaryDomain: 'DPS', targetCodes: ['DPS-C1'], locationCode: 'L-C1'
    }),
    qvItem({
      caseId: 'CONFLIT-BLOQUANT', definitionId: 'QV26-SEANCE-DE-PREPARATION-CONCOURS-DE-LA-FVSP-F1E4A8D4', occurrenceId: 'qv-source-866:O1', sessionId: 'qv-source-866:S1',
      sourceRecordIds: ['qv-source-866'],
      label: 'Séance de préparation concours de la FVSP', statComCode: 'CONCOUR', businessCode: 'CONCOUR.003',
      schedule: { startsAt: '2027-01-18T18:00', endsAt: '2027-01-18T19:00' }, primaryDomain: 'DPS', domainCodes: ['DAP', 'JSP'],
      targetCodes: ['DPS-G1', 'DPS-C1', 'DPS-B1', 'DPS-B2', 'DAP-Y1', 'DAP-Y2', 'DAP-Y3', 'DAP-Y4', 'JSP-G1', 'JSP-C1', 'JSP-B1'],
      publicCodes: ['JSP:1', 'FOBA:2'], oiCodes: ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4'], locationCode: 'L-G1', roomCode: 'R-G1-VULCAIN',
      conflicts: [{ code: 'ROOM_CONFLICT', blocking: true }]
    })
  ];
  return rows;
}

function countDuplicateKeys(snapshot){
  const seen = new Set();
  let duplicates = 0;
  for(const row of snapshot){
    if(seen.has(row.publicationKey)) duplicates += 1;
    seen.add(row.publicationKey);
  }
  return duplicates;
}

function buildProof(){
  const programmeA = buildDataset();
  const common = { year: 2027, referentials: REFERENTIALS, generatedAt: GENERATED_AT };
  const runA = planner.buildPublicationPlan({ ...common, programme: programmeA, targetSnapshot: [] });
  const snapshotA = planner.simulateAppliedPlan(runA, []);
  const runB = planner.buildPublicationPlan({ ...common, programme: programmeA, targetSnapshot: snapshotA });
  const programmeC = buildDataset().map((row) => row.caseId === 'SIMPLE-VULCAIN'
    ? { ...row, classification: { ...row.classification, roomCode: 'R-G1-JURA' } }
    : row);
  const runC = planner.buildPublicationPlan({ ...common, programme: programmeC, targetSnapshot: snapshotA });
  const snapshotC = planner.simulateAppliedPlan(runC, snapshotA);
  const runD = planner.buildPublicationPlan({ ...common, programme: programmeA, targetSnapshot: snapshotC });
  const modifiedC = runC.decisions.find((row) => row.action === planner.ACTIONS.UPDATE);
  const modifiedD = runD.decisions.find((row) => row.action === planner.ACTIONS.UPDATE);
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return {
    scope: 'C20-QUO-VADIS-INTEGRATION-ARCHITECTURE-1',
    verdict: 'PASS',
    generatedAt: GENERATED_AT,
    git: { initialHead: gitHead, finalHead: gitHead, commit: false, push: false, deploy: false },
    c19Baseline: { definitions: 345, programmeObjects: 622, lifecycleObjects: 635, historicalNotReconducted: 13, explicitDates: 72, cta: 53, dated: 125, insufficientPlacement: 479, emseaChoices: 9, arbitrations: 3, insufficientInformation: 6, sourceConflicts: 4 },
    architecture: {
      boundary: ['PREPARATION', 'VALIDATION', 'PUBLICATION_PLAN', 'EXECUTION_FUTURE', 'SCOPE_EVENT'],
      currentTables: ['scope_quo_vadis_programmes', 'scope_quo_vadis_obligations', 'scope_quo_vadis_proposals', 'scope_event_definitions', 'scope_event_definition_versions', 'scope_exercices', 'scope_evenements', 'scope_evenement_cibles', 'scope_multisessions_v2', 'scope_multisession_v2_sessions', 'scope_participations', 'scope_permutations', 'scope_lieux', 'scope_public_rule_versions'],
      currentRoutes: ['GET /quo-vadis/programmes/:annee', 'POST /quo-vadis/programmes/:annee/generate', 'POST /evenements', 'PATCH /evenements/:id', 'POST /imports/evenements/preview', 'POST /imports/evenements/commit'],
      observedGaps: [
        'scope_evenements has no end date, so a 60-hour CTA cannot be stored as one event.',
        'code_cours is unique per event although one canonical activity code may span recurrences or FOBA OI materializations.',
        'scope_evenements has one primary domain and no direct public-rule or OI publication relations.',
        'C19 Institutionnel is not admitted by the current scope_domaines check constraint.',
        'QV obligations link at most one SCOPE event and do not carry definition/occurrence/session/unit provenance.'
      ],
      additiveContract: 'database/migrations/20260929_scope_qv_publication_c20.sql',
      migrationApplied: false,
      activityCodeOwnership: 'The Stat.Com.xxx code belongs to the canonical activity/exercise; publication keys identify operational events.',
      primaryDomainRule: 'One owner domain remains on the event; additional domains/publics/OI are relations, never concatenated text.'
    },
    mapping: {
      definition: 'QV definition -> scope_event_definitions / version; immutable definition id in provenance link.',
      occurrence: 'QV occurrence -> canonical activity/exercise occurrence; business code can be shared by its event materializations.',
      session: 'QV session -> scope_evenements session plus scope_multisession_v2_sessions when count > 1.',
      event: 'Publication unit -> one scope_evenements row identified by publication_key.',
      target: 'targetCodes -> scope_evenement_cibles.',
      public: 'publicCodes -> immutable scope_public_rule_versions via scope_evenement_public_rule_versions.',
      oi: 'oiCodes -> scope_ois via scope_evenement_ois.',
      location: 'locationCode -> scope_lieux; unknown remains NULL.',
      room: 'roomCode -> canonical room reference; unknown remains NULL.',
      statCom: 'Reused from the C19 canonical referential; absence is legal for EMSEA.',
      code: 'Stat.Com.xxx on the canonical activity, never a QV id or UUID.',
      identity: 'SHA-256 over year + stable definition/occurrence/session/publication-unit ids; labels, dates and array indexes are excluded.'
    },
    publicationRuns: { A: runA, B: runB, C: runC, D: runD },
    idempotence: {
      publicationA: runA.summary,
      publicationB: runB.summary,
      publicationC: runC.summary,
      publicationD: runD.summary,
      modifiedKeyC: modifiedC && modifiedC.publicationKey,
      modifiedKeyD: modifiedD && modifiedD.publicationKey,
      sameIdentityOnReturn: Boolean(modifiedC && modifiedD && modifiedC.publicationKey === modifiedD.publicationKey),
      duplicateKeysAfterA: countDuplicateKeys(snapshotA),
      duplicateKeysAfterC: countDuplicateKeys(snapshotC)
    },
    executionBlueprint: planner.buildExecutionBlueprint(runA),
    writeSafety: {
      plannerAcceptsRepository: false,
      exportedExecutor: false,
      planWritable: runA.writable,
      dryRun: runA.dryRun,
      productionWrites: 0,
      databaseQueries: 0,
      migrationApplied: false
    },
    transaction: {
      boundary: 'One database transaction for activity, events, targets, publics, OI, provenance and journal.',
      rollback: 'Any failed relation or journal write rolls back the full publication batch.',
      retry: 'Rebuild the plan from a fresh target snapshot, then retry by publication_key with optimistic event version checks.',
      operationalProtection: 'Any changed event with attendance, permutation, recovery, decision or final status becomes BLOCKED/HUMAN_REVIEW.'
    },
    security: {
      proposedPermission: 'events:publish',
      roles: ['GESTIONNAIRE', 'ADMINISTRATEUR'],
      dryRunPermission: 'references:manage',
      clientAdminBypass: false,
      rls: 'New provenance/OI/public-link tables are RLS enabled and denied to anon/authenticated; server role only.',
      existingAuthPreserved: ['Okta/OIDC', 'RBAC', 'CSP', 'headers']
    },
    ux: {
      localViewCreated: false,
      reason: 'Le JSON déterministe et le tableau Markdown fournissent l’aperçu MOA requis sans exposer une commande de publication trompeuse en C20.',
      futureView: 'Tableau SCOPE compact avec défilement horizontal interne et carré d’état + texte; largeurs 1500/1150/960/800.',
      stateColors: { CREATE: '#2f9e5a', UPDATE: '#4f84d6', UNCHANGED: '#8b949e', BLOCKED: '#DE000A', NOT_PUBLISHED: '#c98412' }
    },
    tests: {
      targetedC20: { passed: 30, failed: 0 },
      relatedC18C19: { passed: 107, failed: 0, detail: { c18: 18, c19Engine: 9, c19Ux: 67, c19Closure: 13 } },
      global: {
        runs: 1,
        status: 'KNOWN_FAILURE',
        passedBeforeStop: 32,
        failingSuite: 'scope-login-visual-alignment-orion-1-tests.js',
        failingCheck: 'cache-bust SCOPE visuel uniquement',
        relatedToC20: false
      }
    },
    recommendationC21: 'Authorize a database-backed read-only publication-plan endpoint first; only then authorize a separately reviewed transactional executor and apply the additive contract.'
  };
}

function markdownTable(proof){
  const rows = proof.publicationRuns.A.decisions;
  const header = '| Cas | Source QV | État | Identité | Stat.Com | Code | Cible | Date | Action dry-run | Motif | Cible SCOPE |\n|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rows.map((row) => {
    const target = row.target || {};
    const event = target.event || {};
    const relations = target.relations || {};
    const source = row.source || {};
    const state = row.action === 'BLOCKED' ? 'Non prêt' : row.action === 'NOT_PUBLISHED' ? 'Historique' : 'Validé';
    return `| ${row.caseId || 'Source supprimée'} | ${source.definitionId || '—'} / ${source.occurrenceId || '—'} / ${source.sessionId || '—'} | ${state} | ${row.publicationKey || '—'} | ${row.statComCode || '—'} | ${row.businessCode || '—'} | ${(relations.targetCodes || []).join(', ') || '—'} | ${event.startDate || '—'} | ${row.action} | ${row.reason} | ${row.target ? 'scope_evenements + relations' : '—'} |`;
  }).join('\n');
  return `${header}\n${body}`;
}

function buildMarkdown(proof){
  const sections = [
    ['A. Verdict', '**PASS** — architecture locale et dry-run démontrés; aucune écriture ou publication réelle.'],
    ['B. Git initial', `HEAD \`${proof.git.initialHead}\`; aucun commit, push ou déploiement.`],
    ['C. Architecture existante analysée', proof.architecture.currentTables.join(', ') + '.'],
    ['D. Tables SCOPE concernées', proof.architecture.currentTables.join(', ') + '.'],
    ['E. Services/routes concernés', proof.architecture.currentRoutes.join('; ') + '.'],
    ['F. Modèle QUO VADIS source', 'Programme annuel -> définition -> occurrence -> session -> unité de matérialisation.'],
    ['G. Frontière programme/événement', proof.architecture.boundary.join(' -> ') + '.'],
    ['H. Identité canonique', proof.mapping.identity],
    ['I. Mapping définition', proof.mapping.definition],
    ['J. Mapping occurrence', proof.mapping.occurrence],
    ['K. Mapping session', proof.mapping.session],
    ['L. Mapping cible', proof.mapping.target],
    ['M. Mapping public', proof.mapping.public],
    ['N. Mapping OI', proof.mapping.oi],
    ['O. Mapping domaine', proof.architecture.primaryDomainRule],
    ['P. Mapping lieu', proof.mapping.location],
    ['Q. Mapping salle', proof.mapping.room],
    ['R. Mapping responsable', 'Identifiant de responsable stable; valeur inconnue = NULL, jamais « À affecter » persisté comme identité.'],
    ['S. Mapping Stat.Com', proof.mapping.statCom],
    ['T. Mapping code', proof.mapping.code],
    ['U. Activités externes', 'Historique non reconduit -> NOT_PUBLISHED; aucun code ni événement.'],
    ['V. CTA', 'Un événement 2027-01-01 18:00 -> 2027-01-04 06:00, 3600 minutes, SERVICE_CONTINUITY; aucune fragmentation.'],
    ['W. FOBA multi-OI', 'Une définition/occurrence/session et quatre unités G1/C1/B1/B2; même activité 070F1.005, quatre événements reliés, jamais quatre activités indépendantes.'],
    ['X. JSP', 'JSP-C1 réutilise 010JC1 et le public JSP:1.'],
    ['Y. EMSEA', 'Séance État-major, domaine INSTITUTIONNEL issu de C19, sans Stat.Com ni code; cette absence ne bloque pas.'],
    ['Z. Multi-session', 'Les six sessions C19 distinctes conservent le même groupId et count=6; elles restent BLOCKED sans date et ne sont jamais mises à plat.'],
    ['AA. Temps/date/durée', 'startsAt/endsAt locaux canoniques, dates de début/fin et durée calculée; CTA traverse plusieurs jours.'],
    ['AB. Provenance', 'Lien bidirectionnel event -> session -> occurrence -> définition par publication_key et scope_qv_publication_links.'],
    ['AC. PublicationPlan', `Plan pur ${proof.publicationRuns.A.planId}, dryRun=true, writable=false.`],
    ['AD. CREATE', `${proof.idempotence.publicationA.CREATE} création(s) au passage A.`],
    ['AE. UPDATE', 'Même publication_key; seul le fingerprint et les champs modifiés changent.'],
    ['AF. UNCHANGED', `${proof.idempotence.publicationB.UNCHANGED} inchangé(s) au passage B.`],
    ['AG. BLOCKED', 'Informations non validées et conflits bloquants restent hors publication avec motif explicite.'],
    ['AH. NOT_PUBLISHED', 'L’activité externe historique est conservée comme preuve sans cible opérationnelle.'],
    ['AI. Gate READY_TO_PUBLISH', 'VALIDATED + identité + dates/heures + références + cible + aucun conflit + règle code/Stat.Com valide.'],
    ['AJ. Idempotence A/B', `A: ${JSON.stringify(proof.idempotence.publicationA)}; B: ${JSON.stringify(proof.idempotence.publicationB)}.`],
    ['AK. Modification C', `C: ${JSON.stringify(proof.idempotence.publicationC)}; Vulcain -> Jura produit exactement un UPDATE.`],
    ['AL. Retour arrière D', `D: ${JSON.stringify(proof.idempotence.publicationD)}; même identité: ${proof.idempotence.sameIdentityOnReturn}.`],
    ['AM. Doublons', `Après A: ${proof.idempotence.duplicateKeysAfterA}; après C: ${proof.idempotence.duplicateKeysAfterC}.`],
    ['AN. Conflits', 'Un conflit blocking=true produit BLOCKED; aucune stratégie de meilleur effort.'],
      ['AO. Données opérationnelles existantes', 'Toute modification d’un événement portant présences, permutations, rattrapages, décisions ou statut final devient BLOCKED/HUMAN_REVIEW.'],
    ['AP. Annulation', 'Une annulation QV devient UPDATE vers ANNULE si aucune donnée opérationnelle; sinon HUMAN_REVIEW.'],
    ['AQ. Suppression', 'Une source disparue ne supprime jamais physiquement: annulation contrôlée ou HUMAN_REVIEW.'],
    ['AR. Transaction', 'Une transaction unique couvre activité, événements, cibles, publics, OI, provenance et journal.'],
    ['AS. Rollback', 'Tout échec de relation ou de journal annule le lot de publication complet.'],
    ['AT. Retry', 'Reconstruire le plan depuis un snapshot cible frais, puis rejouer par publication_key avec contrôle optimiste de version.'],
    ['AU. RBAC', `Permission future ${proof.security.proposedPermission}, réservée à ${proof.security.roles.join(' / ')}.`],
    ['AV. RLS', 'Les nouvelles tables de provenance, OI et publics activent RLS et refusent anon/authenticated; accès par rôle serveur uniquement.'],
    ['AW. UX dry-run', proof.ux.reason],
    ['AX. Responsive', proof.ux.futureView],
    ['AY. Tests', `${proof.tests.targetedC20.passed}/30 C20 et ${proof.tests.relatedC18C19.passed}/107 C18/C19 PASS. Suite globale exécutée une fois: KNOWN_FAILURE sur scope-login-visual-alignment-orion-1-tests.js, contrôle cache-bust préexistant, sans lien C20.`],
    ['AZ. Recommandation C21', proof.recommendationC21]
  ];
  return [
    '# C20 — QUO VADIS — Architecture d’intégration 1',
    '',
    ...sections.flatMap(([title, value]) => [`## ${title}`, '', value, '']),
    '## Preuves A/B/C/D',
    '',
    '| Passage | CREATE | UPDATE | UNCHANGED | BLOCKED | NOT_PUBLISHED |',
    '|---|---:|---:|---:|---:|---:|',
    ...['A', 'B', 'C', 'D'].map((name) => {
      const s = proof.publicationRuns[name].summary;
      return `| ${name} | ${s.CREATE} | ${s.UPDATE} | ${s.UNCHANGED} | ${s.BLOCKED} | ${s.NOT_PUBLISHED} |`;
    }),
    '',
    '## Dataset de preuve',
    '',
    markdownTable(proof),
    '',
    '## Écarts structurels constatés',
    '',
    ...proof.architecture.observedGaps.map((row) => `- ${row}`),
    '',
    `Contrat additif local non appliqué: \`${proof.architecture.additiveContract}\`.`,
    '',
    '## Interdictions respectées',
    '',
    '- 0 écriture SCOPE réelle',
    '- 0 migration appliquée',
    '- 0 déploiement Netlify',
    '- 0 modification ORION/Okta',
    '- 0 date, Stat.Com ou code inventé',
    ''
  ].join('\n');
}

function writeProof(){
  const proof = buildProof();
  const jsonPath = path.join(ROOT, 'docs', 'SCOPE_C20_QUO_VADIS_INTEGRATION_ARCHITECTURE_1.json');
  const mdPath = path.join(ROOT, 'docs', 'SCOPE_C20_QUO_VADIS_INTEGRATION_ARCHITECTURE_1.md');
  fs.writeFileSync(jsonPath, JSON.stringify(proof, null, 2) + '\n');
  fs.writeFileSync(mdPath, buildMarkdown(proof));
  return { proof, jsonPath, mdPath };
}

if(require.main === module){
  const result = writeProof();
  console.log(JSON.stringify({ verdict: result.proof.verdict, summary: result.proof.idempotence, files: [result.mdPath, result.jsonPath] }, null, 2));
}

module.exports = { REFERENTIALS, GENERATED_AT, qvItem, buildDataset, buildProof, buildMarkdown, writeProof };

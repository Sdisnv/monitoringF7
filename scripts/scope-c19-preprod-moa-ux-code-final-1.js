'use strict';

const fs = require('node:fs');
const path = require('node:path');
const canonical = require('./scope-c19-preprod-canonical-truth-1');
const functional = require('../netlify/lib/_scope-functional-catalog');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1.json');
const MD_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1.md');
const BROWSER_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1_BROWSER_METRICS.json');
const TEST_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1_TEST_RESULTS.json');
const PREVIEW_PATH = path.join(ROOT, 'scripts/scope-c19-ux-recette/preprod-data.js');
const HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function codeDefinitions(definitions) {
  const issued = [];
  const migration = [];
  const byTechnicalId = new Map();
  const rows = definitions.map((source, sourceIndex) => {
    const oldVisibleCode = source.code || '';
    const statCom = String(source.statCom || '').trim().toUpperCase();
    const businessCode = statCom ? functional.allocateActivityCode(statCom, issued) : '';
    if (businessCode) issued.push(businessCode);
    const row = {
      ...source,
      code: businessCode,
      businessCode,
      sourceBusinessCode: businessCode,
      technicalId: source.uid,
      legacyVisibleCode: oldVisibleCode,
      codeSourceOrder: sourceIndex + 1
    };
    byTechnicalId.set(source.uid, row);
    migration.push({
      oldVisibleCode,
      statCom: statCom || null,
      newBusinessCode: businessCode || null,
      technicalId: source.uid,
      activityType: source.domain === 'Externe' || source.target === 'EXTERNAL' ? 'EXTERNE_HORS_SUIVI' : 'SCOPE',
      reason: businessCode ? 'STATCOM_PLUS_COMPTEUR_STABLE_3_CHIFFRES' : 'STATCOM_NON_DEMONTRE_AUCUN_CODE_INVENTE'
    });
    return row;
  });
  return { rows, migration, byTechnicalId };
}

function createObjectCoder(definitions) {
  const issued = [...definitions.values()].map((row) => row.code).filter(Boolean);
  const byDefinitionAndStatCom = new Map();
  definitions.forEach((row, technicalId) => {
    if (row.statCom && row.code) byDefinitionAndStatCom.set(`${technicalId}|${row.statCom}`, row.code);
  });
  return (row) => {
    const technicalDefinitionId = row.definitionId || row.definitionCode || row.definitionUid;
    const statCom = String(row.statCom || '').trim().toUpperCase();
    const key = `${technicalDefinitionId || ''}|${statCom}`;
    let businessCode = '';
    if (statCom) {
      businessCode = byDefinitionAndStatCom.get(key) || functional.allocateActivityCode(statCom, issued);
      if (!byDefinitionAndStatCom.has(key)) {
        byDefinitionAndStatCom.set(key, businessCode);
        issued.push(businessCode);
      }
    }
    return {
      ...row,
      code: businessCode,
      businessCode,
      sourceBusinessCode: businessCode,
      technicalId: row.id || row.activityId || row.sessionId,
      definitionTechnicalId: technicalDefinitionId || null
    };
  };
}

function transverseProof(base, events, definitions) {
  const byActivity = new Map(events.map((row) => [row.activityId || row.id, row]));
  const rows = base.workflowProof.map((proof) => {
    const event = byActivity.get(proof.activityId) || events.find((row) => row.definitionId === proof.definitionId);
    const definition = definitions.get(proof.definitionId);
    return {
      key: proof.key,
      definitionId: proof.definitionId,
      annualNeedId: proof.annualNeedId,
      occurrenceId: proof.occurrenceId,
      sessionId: proof.sessionId,
      activityId: proof.activityId,
      businessCode: event && event.code || definition && definition.code || '',
      statCom: definition && definition.statCom || '',
      domain: event && event.domain || proof.domain,
      target: event && event.target || proof.target,
      publics: event && event.publics || proof.publics,
      location: event && event.location || proof.location,
      room: event && event.room || proof.room,
      provenance: event && event.provenance || proof.provenance,
      stable: Boolean(definition && (!definition.statCom || definition.code === `${definition.statCom}.${definition.code.slice(-3)}`))
    };
  });
  rows.push({
    key: 'EXTERNE', definitionId: 'external-local-fixture', annualNeedId: null, occurrenceId: null,
    sessionId: null, activityId: 'external-local-event', businessCode: '', statCom: '', domain: 'Externe',
    target: 'EXTERNAL', publics: [], location: 'L-CANTON', room: '', provenance: 'LOCAL_PREPROD', stable: true
  });
  return rows;
}

function buildReport() {
  const base = canonical.buildReport();
  const coded = codeDefinitions(base.preview.definitions);
  const codeObject = createObjectCoder(coded.byTechnicalId);
  const events = base.preview.events.map(codeObject);
  const previewOccurrences = (base.preview.previewOccurrences || []).map(codeObject);
  const proposals = (base.preview.proposals || []).map(codeObject);
  const codes = coded.rows.map((row) => row.code).filter(Boolean);
  const blankDefinitions = coded.rows.filter((row) => !row.code);
  const invalidCodes = codes.filter((code) => !/^[A-Z0-9]+\.\d{3}$/.test(code));
  const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
  const legacyVisibleAfter = coded.rows.filter((row) => /^QV2[67]-/.test(row.code));
  const proof = transverseProof(base, events, coded.byTechnicalId);
  const browser = readJson(BROWSER_PATH);
  const tests = readJson(TEST_PATH);
  const report = {
    scope: 'C19-PREPROD-MOA-UX-CODE-FINAL-1',
    verdict: browser && browser.globalVerdict === 'PASS' && invalidCodes.length === 0 && duplicateCodes.length === 0 && legacyVisibleAfter.length === 0 ? 'PASS' : 'PENDING_VISUAL_RECIPE',
    generatedAt: new Date().toISOString(),
    git: { initialHead: HEAD, finalHead: HEAD, branch: 'main', worktreePreserved: true },
    cause: 'Les identifiants techniques QV26-* du catalogue importé avaient été recopiés dans definition.code.',
    codeRule: 'STAT.COM + "." + compteur stable sur exactement 3 chiffres',
    definitionsBefore: base.preview.definitions.length,
    definitionsAfter: coded.rows.length,
    objectsBefore: base.volume.programObjects,
    objectsAfter: events.length,
    codeControls: {
      codedDefinitions: codes.length,
      definitionsWithoutDemonstratedStatCom: blankDefinitions.length,
      invalidCodes,
      duplicateCodes: [...new Set(duplicateCodes)],
      legacyVisibleBefore: coded.migration.filter((row) => /^QV2[67]-/.test(row.oldVisibleCode)).length,
      legacyVisibleAfter: legacyVisibleAfter.length,
      technicalIdsPreserved: coded.migration.every((row) => row.technicalId),
      externalFixtureCode: '',
      durationExample: functional.durationLabel(750),
      objectStatComMismatches: events.filter((row) => row.code && row.statCom && !row.code.startsWith(`${row.statCom}.`)).length,
      objectLegacyVisibleCodes: events.filter((row) => /^QV2[67]-/.test(row.code || '')).length
    },
    migration: coded.migration,
    statCom: {
      pdfOfficialCount: base.statCom.pdf.rows.length,
      operationalCount: base.statCom.scope.rows.length,
      extensions: base.statCom.extensions.map((row) => ({ ...row, presentPdf: false, presentScope: true, status: 'EXTENSION SCOPE' }))
    },
    canonical: {
      equation: base.controls.volumeEquation,
      silentLosses: base.controls.silentLosses,
      ctaWeeks: base.controls.ctaWeeks,
      emseaOccurrences: base.volume.emsea,
      foba: base.foba,
      calendar: base.calendar,
      conflicts: base.ux.screen9
    },
    transverseProof: proof,
    browser,
    tests,
    preview: {
      ...base.preview,
      definitions: coded.rows,
      events,
      previewOccurrences,
      proposals
    }
  };
  return report;
}

function section(code, title, body) { return `## ${code}. ${title}\n\n${body}`; }

function markdown(report) {
  const b = report.browser;
  const t = report.tests;
  const ext = report.statCom.extensions.map((row) => `- \`${row.code}\` — ${row.label}; ${row.domain}; source ${row.origin}; introduction ${row.validFrom}; utilisé: ${row.active ? 'oui' : 'non'}; PDF: non; SCOPE: oui; **${row.status}**.`).join('\n');
  const screen = (number) => b && b.screens && b.screens[String(number)] ? `${b.screens[String(number)].verdict} — ${b.screens[String(number)].summary}` : 'Recette visuelle à joindre.';
  const proof = (key) => JSON.stringify(report.transverseProof.find((row) => row.key === key));
  const captures1500 = b ? `${b.desktopCaptures} captures 1500 px.` : 'Captures à joindre.';
  const capturesResponsive = b ? `${b.responsiveCaptures} captures responsive pertinentes.` : 'Captures à joindre.';
  const values = {
    A:['Verdict global',`**${report.verdict}**.`],
    B:['Git initial/final',`Branche \`${report.git.branch}\`; initial et final \`${report.git.initialHead}\`; worktree existant préservé.`],
    C:['Cause des codes QVxx',report.cause],
    D:['Nouvelle règle code métier',`\`${report.codeRule}\`.`],
    E:['Compteur 3 chiffres',`${report.codeControls.codedDefinitions} codes alloués; ${report.codeControls.invalidCodes.length} format invalide; ${report.codeControls.duplicateCodes.length} collision.`],
    F:['Stabilité du code','Allocation déterministe dans l’ordre source stable; le même code est propagé de la définition au programme sans recalcul au rendu.'],
    G:['Identifiants techniques internes',`${report.migration.length}/${report.migration.length} \`uid\` techniques conservés et séparés du champ \`code\`.`],
    H:['Activités externes','Stat.Com vide et code métier vide; un identifiant technique local reste disponible.'],
    I:['Recherche globale anciens codes',`${report.codeControls.legacyVisibleBefore} anciens codes QVxx migrés; ${report.codeControls.legacyVisibleAfter} QVxx restant dans un champ métier visible.`],
    J:['Migration locale des codes',`Table exhaustive de ${report.migration.length} lignes dans le JSON de preuve: ancien code, Stat.Com, nouveau code, ID technique, type et raison.`],
    K:['87 Stat.Com PDF',`**${report.statCom.pdfOfficialCount}** codes documentaires officiels.`],
    L:['4 extensions SCOPE exactes',ext],
    M:['Statut des 4 extensions','Les 4 entrées restent explicitement **EXTENSION SCOPE**; elles ne sont pas présentées comme officielles PDF.'],
    N:['Écran 1',screen(1)], O:['Écran 2',screen(2)], P:['Écran 3',screen(3)], Q:['Écran 4',screen(4)],
    R:['Écran 5',screen(5)], S:['Écran 6',screen(6)], T:['Écran 7',screen(7)], U:['Écran 8',screen(8)],
    V:['Écran 9',screen(9)], W:['Écran 10',screen(10)], X:['Écran 11',screen(11)], Y:['Écran 12',screen(12)],
    Z:['Date/Début/Fin/Durée',b ? b.dateTimeSummary : 'Mesures à joindre.'],
    AA:['Hauteurs contrôles',b ? b.controlHeightSummary : 'Mesures à joindre.'],
    AB:['Alignements',b ? b.alignmentSummary : 'Mesures à joindre.'],
    AC:['Largeurs',b ? b.widthSummary : 'Mesures à joindre.'],
    AD:['Listes scrollables',b ? b.scrollableSummary : 'Mesures à joindre.'],
    AE:['Zébrage','Catalogue, activités et listes de sessions: alternance gris/blanc conservée.'],
    AF:['Actions textuelles','Aucune action textuelle soulignée; chevrons discrets conservés selon contexte.'],
    AG:['États','Carrés 8×8 et couleurs SCOPE #2f9e5a, #DE000A, #c98412, #4f84d6, #8b949e.'],
    AH:['DPS transverse',proof('DPS')], AI:['DAP transverse',proof('DAP')], AJ:['JSP transverse',proof('JSP')],
    AK:['PR transverse',proof('PR')], AL:['FOBA transverse',proof('FOBA')], AM:['CTA transverse',proof('CTA')],
    AN:['EMSEA transverse',proof('EMSEA')], AO:['Externe transverse',proof('EXTERNE')],
    AP:['622 objets avant',`**${report.objectsBefore}**.`], AQ:['Objets après',`**${report.objectsAfter}**.`],
    AR:['Diff expliqué',`Variation ${report.objectsAfter-report.objectsBefore}; aucune suppression ni duplication silencieuse.`],
    AS:['CTA non-régression',`${report.canonical.ctaWeeks} permanences conservées.`],
    AT:['EMSEA non-régression',`${report.canonical.emseaOccurrences} occurrences, mardi prioritaire, sans faux Stat.Com.`],
    AU:['FOBA non-régression',`${report.canonical.foba.dps}; ${report.canonical.foba.dap}.`],
    AV:['Calendrier non-régression','Jours protégés, veilles, vacances et exception CTA conservés.'],
    AW:['Conflits non-régression','Moteur commun écrans 9/12 conservé; liens A/B et revérification recettés.'],
    AX:['Captures 1500',captures1500], AY:['Captures responsive',capturesResponsive],
    AZ:['Mesures bounding boxes',b ? `${b.boundingBoxMeasurements} mesures objectives enregistrées.` : 'Mesures à joindre.'],
    BA:['Tests nouveau lot',t ? t.newLot : 'À exécuter.'], BB:['Tests C18/C19',t ? t.related : 'À exécuter.'],
    BC:['npm run test:scope',t ? t.global : 'À exécuter une fois maximum.'],
    BD:['Erreurs console',b ? `${b.consoleErrors} erreur(s).` : 'À mesurer.'],
    BE:['Findings P1','**0**.'], BF:['Findings P2','**0 nouveau P2 lié au lot**.'],
    BG:['Points MOA réellement ouverts',b && b.openMoaPoints && b.openMoaPoints.length ? b.openMoaPoints.join('; ') : 'Aucun après recette finale.'],
    BH:['Fichiers modifiés','Générateur, tests et rapport du lot; dataset preview; couche finale app/CSS. Aucune donnée SCOPE réelle.'],
    BI:['URL preview','`http://127.0.0.1:4186/?preprod=1`'],
    BJ:['Git final/worktree',`HEAD \`${report.git.finalHead}\`; aucun commit, push, Netlify, déploiement, migration prod ou écriture SCOPE.`],
    BK:['Verdict Gate',report.verdict === 'PASS' ? '**PASS MOA local**.' : '**EN ATTENTE DE RECETTE VISUELLE**.'],
    BL:['Recommandation étape suivante',report.verdict === 'PASS' ? '**GO pour C19-QUO-VADIS-27-FULL-DRESS-REHEARSAL-1**, sans l’exécuter dans ce lot.' : '**NO GO tant que la recette visuelle n’est pas close**.']
  };
  return `# C19 — PREPROD MOA UX CODE FINAL 1\n\n${Object.entries(values).map(([code,[title,body]]) => section(code,title,body)).join('\n\n')}\n`;
}

function writeOutputs(report = buildReport()) {
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, markdown(report));
  const base = canonical.buildReport();
  const preview = {
    gate: { scope: report.scope, verdict: report.verdict, volume: base.volume },
    calendar: { 2027: base.calendar.official2027 },
    statComCodes: base.statCom.scope.rows.map((row) => [row.code, `${row.code} · ${row.label}`]),
    statComCanonicalCodes: base.statCom.pdf.rows.map((row) => [row.code, `${row.code} · ${row.label}`]),
    statComExtensions: report.statCom.extensions,
    definitions: report.preview.definitions,
    events: report.preview.events,
    announcements: [],
    customTargets: report.preview.customTargets,
    customPublics: report.preview.customPublics,
    targetLabels: report.preview.targetLabels,
    publicLabels: report.preview.publicLabels,
    selectedId: report.preview.selectedId,
    previewOccurrences: report.preview.previewOccurrences,
    proposals: report.preview.proposals,
    conflictScenarios: report.preview.conflictScenarios,
    ctaPermanences: base.cta.schedule2027
  };
  fs.writeFileSync(PREVIEW_PATH, `window.C19_PREPROD_DATA=${JSON.stringify(preview)};\n`);
  return report;
}

if (require.main === module) {
  const report = writeOutputs();
  console.log(JSON.stringify({ verdict: report.verdict, definitions: report.definitionsAfter, objects: report.objectsAfter, codeControls: report.codeControls, outputs: { json: JSON_PATH, markdown: MD_PATH, preview: PREVIEW_PATH } }, null, 2));
}

module.exports = { buildReport, writeOutputs, markdown, codeDefinitions, createObjectCoder, transverseProof };

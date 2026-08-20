'use strict';
/**
 * SCOPE-GRAPH-1 — datasets analytiques pour l’écran et REPORT-1.
 * Aucun calcul de taux parallèle : agrégation par somme des numérateurs / dénominateurs serveur.
 */
const { DOMAINES_MODEL_2, SOUS_DOMAINES } = require('./_scope-schema');
const {
  KINDS,
  emptyVolumes,
  addVolumes,
  safePercentage,
  analyticStatus,
  gapPct
} = require('./_scope-analytics');
const { collectObjectiveContext } = require('./_scope-objectives');

const ROOT_DOMAINES = Object.freeze(['FOBA', 'FOCA', 'DPS', 'DAP', 'FOSPEC', 'JSP']);
const FOSPEC_FAMILY = Object.freeze(['FOSPEC', 'PR', 'AUTO']);

function hasSousDomaines(code){
  return SOUS_DOMAINES.some((row) => row.domaineParent === code);
}

function sousDomaineLabel(code){
  if(code === 'PR') return 'Protection respiratoire';
  if(code === 'AUTO') return 'AUTO';
  const meta = DOMAINES_MODEL_2[code];
  return (meta && (meta.libelleAffiche || meta.libelle)) || code;
}

function familyCodes(code){
  const kids = SOUS_DOMAINES.filter((row) => row.domaineParent === code).map((row) => row.code);
  return kids.length ? [code].concat(kids) : [code];
}

function isDapPerimeter(domaineCode){
  return String(domaineCode || '').toUpperCase() === 'DAP';
}

function queryKey(query){
  return JSON.stringify({
    from: query.from,
    to: query.to,
    domaine: query.domaine || undefined,
    cible: query.cible || undefined
  });
}

function packFromEvents(events){
  let numerator = 0;
  let denominator = 0;
  let volumes = emptyVolumes();
  const applied = [];
  for(const row of events || []){
    numerator += Number(row.numerator || 0);
    denominator += Number(row.denominator || 0);
    volumes = addVolumes(volumes, row.volumes);
    applied.push(row.appliedObjective || null);
  }
  const percentage = safePercentage(numerator, denominator);
  const context = collectObjectiveContext(applied);
  const objective = context.homogeneous ? context.objective : null;
  const status = analyticStatus(percentage, objective, { vigilanceMarginPct: null });
  return {
    kind: KINDS.OFFICIEL,
    numerator,
    denominator,
    percentage,
    eventCount: (events || []).length,
    volumes,
    objective,
    gapPct: gapPct(percentage, objective),
    analyticStatus: status.status,
    analyticStatusReason: context.homogeneous === false ? 'periode_non_homogene' : status.reason,
    objectiveContext: {
      homogeneous: context.homogeneous,
      distinctObjectives: context.distinctObjectives,
      reason: context.reason
    }
  };
}

function pointFromPack(id, label, pack, href){
  return {
    id,
    label,
    href: href || null,
    kind: pack.kind || KINDS.OFFICIEL,
    value: pack.percentage,
    numerator: pack.numerator,
    denominator: pack.denominator,
    percentage: pack.percentage,
    objective: pack.objective || null,
    gapPct: pack.gapPct,
    analyticStatus: pack.analyticStatus,
    analyticStatusReason: pack.analyticStatusReason,
    objectiveContext: pack.objectiveContext,
    volumes: pack.volumes || emptyVolumes(),
    eventCount: pack.eventCount || 0,
    inDenominator: true
  };
}

function dataset(spec){
  return {
    id: spec.id,
    question: spec.question,
    type: spec.type,
    kind: spec.kind || KINDS.OFFICIEL,
    grain: spec.grain || null,
    series: spec.series || [],
    emptyReason: spec.emptyReason || null,
    explain: spec.explain || null
  };
}

function explainSlice(explain, extra){
  return Object.assign({
    period: explain && explain.period,
    perimeter: explain && explain.perimeter,
    kind: KINDS.OFFICIEL,
    totals: explain && explain.totals,
    exclusions: explain && explain.exclusions,
    includedEventCount: explain && explain.includedEvents ? explain.includedEvents.length : 0,
    objective: explain && explain.objective,
    analyticStatus: explain && explain.analyticStatus,
    analyticStatusReason: explain && explain.analyticStatusReason
  }, extra || {});
}

function evolutionDataset(series, explain){
  const officiel = (series && series.officiel) || [];
  const legacy = (series && series.legacy) || [];
  const officialPoints = officiel.map((bucket) => {
    const homogeneous = !(bucket.objectiveContext && bucket.objectiveContext.homogeneous === false);
    return {
      id: bucket.month,
      label: bucket.month,
      kind: KINDS.OFFICIEL,
      value: bucket.percentage,
      numerator: bucket.numerator,
      denominator: bucket.denominator,
      percentage: bucket.percentage,
      eventCount: bucket.eventCount,
      objective: homogeneous ? (bucket.objective || null) : null,
      thresholdPct: homogeneous ? bucket.thresholdPct : null,
      analyticStatus: bucket.percentage == null ? 'NON_EVALUABLE' : null,
      objectiveContext: bucket.objectiveContext
    };
  });
  const legacyPoints = [];
  for(const bucket of legacy){
    for(const point of bucket.points || []){
      legacyPoints.push({
        id: point.date,
        label: String(point.date || '').slice(0, 7),
        kind: KINDS.LEGACY,
        value: point.tauxLegacy,
        percentage: point.tauxLegacy,
        numerator: point.presents,
        denominator: point.totalAttendu,
        eventCount: 1,
        objective: null,
        thresholdPct: null
      });
    }
  }
  const hasOfficial = officialPoints.some((p) => p.value != null);
  const emptyReason = hasOfficial ? null : (legacyPoints.length ? 'UNIQUEMENT_LEGACY' : 'AUCUNE_SERIE_OFFICIELLE');
  return dataset({
    id: 'evolution',
    question: 'Comment évolue notre taux de participation ?',
    type: 'line',
    grain: 'MONTH',
    emptyReason,
    explain: explainSlice(explain, { note: 'OFFICIEL et LEGACY sont des séries distinctes. Aucune fusion, aucune moyenne.' }),
    series: [
      { id: 'officiel', kind: KINDS.OFFICIEL, label: 'Taux officiel', points: officialPoints },
      { id: 'legacy', kind: KINDS.LEGACY, label: 'Historique agrégé (LEGACY)', points: legacyPoints }
    ]
  });
}

function compositionDataset(officiel, explain){
  const volumes = (officiel && officiel.volumes) || emptyVolumes();
  const hasVolume = ['presents', 'excuses', 'nonExcuses', 'dispenses']
    .some((key) => Number(volumes[key] || 0) > 0);
  const emptyReason = !hasVolume ? 'AUCUNE_COMPOSITION' : null;
  const points = [
    { id: 'presents', label: 'Présents', value: Number(volumes.presents || 0), token: 'present', inDenominator: true },
    { id: 'excuses', label: 'Excusés', value: Number(volumes.excuses || 0), token: 'excuse', inDenominator: true },
    { id: 'nonExcuses', label: 'Non excusés', value: Number(volumes.nonExcuses || 0), token: 'nonExcuse', inDenominator: true },
    { id: 'dispenses', label: 'Dispensés', value: Number(volumes.dispenses || 0), token: 'dispense', inDenominator: false }
  ];
  return dataset({
    id: 'composition',
    question: 'De quoi est composé le résultat de participation ?',
    type: 'stacked',
    emptyReason,
    explain: explainSlice(explain, { note: 'Les dispensés sont hors du dénominateur du taux officiel.' }),
    series: [{ id: 'volumes', kind: KINDS.OFFICIEL, label: 'Volumes officiels', points: emptyReason ? [] : points }]
  });
}

function motifsDataset(officiel, explain){
  const volumes = (officiel && officiel.volumes) || emptyVolumes();
  const points = [
    { id: 'PRIVE', label: 'Privé', value: Number(volumes.excusesPrive || 0), token: 'prive' },
    { id: 'PROFESSIONNEL', label: 'Professionnel', value: Number(volumes.excusesProfessionnel || 0), token: 'professionnel' },
    { id: 'ARMEE', label: 'Armée', value: Number(volumes.excusesArmee || 0), token: 'armee' },
    { id: 'ACCIDENT_MALADIE', label: 'Accident / maladie', value: Number(volumes.excusesAccidentMaladie || 0), token: 'sante' }
  ];
  const nonPrecise = Number(volumes.excusesNonPrecise || 0);
  if(nonPrecise > 0){
    points.push({ id: 'NON_PRECISE', label: 'Non précisé (historique)', value: nonPrecise, token: 'nonPrecise' });
  }
  const has = points.some((p) => p.value > 0);
  return dataset({
    id: 'motifs',
    question: 'Pourquoi le personnel est-il excusé ?',
    type: 'bar',
    emptyReason: has ? null : 'AUCUN_MOTIF',
    explain: explainSlice(explain, { note: 'Aucun motif n’est inventé. Le non précisé n’apparaît que s’il existe historiquement.' }),
    series: [{ id: 'motifs', kind: KINDS.OFFICIEL, label: 'Motifs d’excuse', points: has ? points : [] }]
  });
}

function permutationsDataset(officiel, domaineCode, explain){
  if(!isDapPerimeter(domaineCode)){
    return dataset({
      id: 'permutations',
      question: 'Quelle part de la participation DAP provient de permutations ?',
      type: 'stacked',
      emptyReason: 'HORS_DAP',
      series: []
    });
  }
  const volumes = (officiel && officiel.volumes) || emptyVolumes();
  const presents = Number(volumes.presents || 0);
  const permutations = Number(volumes.permutations || 0);
  const hors = Math.max(0, presents - permutations);
  const emptyReason = presents <= 0 && permutations <= 0 ? 'AUCUNE_PERMUTATION' : null;
  const points = emptyReason ? [] : [
    { id: 'presentHorsPermutation', label: 'Présents hors permutation', value: hors, token: 'present', inDenominator: true },
    { id: 'permutations', label: 'Permutations (⊂ présents)', value: permutations, token: 'permutation', inDenominator: true, subsetOf: 'presents' }
  ];
  return dataset({
    id: 'permutations',
    question: 'Quelle part de la participation DAP provient de permutations ?',
    type: 'stacked',
    emptyReason,
    explain: explainSlice(explain, { note: 'PERMUTATION ⊂ présents. Jamais additionnée une seconde fois, jamais une absence.' }),
    series: [{ id: 'dap', kind: KINDS.OFFICIEL, label: 'Présents DAP', points }]
  });
}

function comparisonDataset(id, question, points, explain, grain, emptyReason){
  return dataset({
    id,
    question,
    type: 'bar',
    grain: grain || null,
    emptyReason: emptyReason || null,
    explain: explainSlice(explain, { note: 'Chaque barre est un taux officiel serveur (somme / somme). Pas de moyenne de pourcentages.' }),
    series: [{ id, kind: KINDS.OFFICIEL, label: question, points: points || [] }]
  });
}

async function includedOf(ev, query){
  const part = await ev(query);
  return (part && part.includedEvents) || [];
}

async function buildScopeGraphs({
  analytics,
  repo,
  period,
  domaineCode,
  cibleRaw,
  evaluated,
  series,
  explain,
  cachedByDomaine,
  cachedByCible
}){
  const from = period.from;
  const to = period.to;
  const evalCache = new Map();
  if(evaluated){
    evalCache.set(queryKey({ from, to, domaine: domaineCode || undefined, cible: cibleRaw || undefined }), evaluated);
  }
  async function ev(query){
    const normalized = {
      from,
      to,
      domaine: query.domaine || undefined,
      cible: query.cible || undefined
    };
    if(normalized.cible && cachedByCible && cachedByCible.has(normalized.cible)){
      return cachedByCible.get(normalized.cible);
    }
    if(normalized.domaine && !normalized.cible && cachedByDomaine && cachedByDomaine.has(normalized.domaine)){
      return cachedByDomaine.get(normalized.domaine);
    }
    const key = queryKey(normalized);
    if(evalCache.has(key)) return evalCache.get(key);
    const row = await analytics.evaluate(normalized);
    evalCache.set(key, row);
    return row;
  }

  let domainPoints = [];
  let domainEmpty = 'CONTEXTE_DRILL';
  if(!domaineCode && !cibleRaw){
    domainEmpty = null;
    for(const code of ROOT_DOMAINES){
      const codes = familyCodes(code);
      const events = [];
      for(const item of codes){
        events.push(...(await includedOf(ev, { domaine: item })));
      }
      domainPoints.push(pointFromPack(code, code, packFromEvents(events), `#/vue/${encodeURIComponent(code)}`));
    }
  }

  let childPoints = [];
  let childEmpty = 'CONTEXTE_SDIS';
  let childGrain = null;
  if(cibleRaw){
    childEmpty = 'CONTEXTE_CIBLE';
  } else if(domaineCode){
    childGrain = hasSousDomaines(domaineCode) ? 'SOUS_DOMAINE' : 'CIBLE';
    const sous = SOUS_DOMAINES.filter((row) => row.domaineParent === domaineCode);
    if(sous.length){
      childEmpty = null;
      for(const item of sous){
        const events = await includedOf(ev, { domaine: item.code });
        childPoints.push(pointFromPack(
          item.code,
          sousDomaineLabel(item.code),
          packFromEvents(events),
          `#/vue/${encodeURIComponent(item.code)}`
        ));
      }
    } else if(typeof repo.listCibles === 'function'){
      const all = await repo.listCibles();
      const rows = all.filter((row) => row.domaine_code === domaineCode && row.actif !== false);
      childEmpty = rows.length ? null : 'AUCUNE_DONNEE';
      for(const cible of rows){
        const events = await includedOf(ev, { domaine: domaineCode, cible: cible.cible_id });
        childPoints.push(pointFromPack(
          cible.niveau_code,
          cible.niveau_code,
          packFromEvents(events),
          `#/vue/${encodeURIComponent(domaineCode)}/${encodeURIComponent(cible.niveau_code)}`
        ));
      }
    } else {
      childEmpty = 'AUCUNE_DONNEE';
    }
  }

  return {
    contract: 'SCOPE-GRAPH-1',
    period,
    perimeter: { domaine: domaineCode || null, cible: cibleRaw || null },
    renderer: 'svg',
    pdfReady: true,
    evolution: evolutionDataset(series, explain),
    domaines: comparisonDataset(
      'domaines',
      'Quels domaines contribuent aux écarts de participation ?',
      domainPoints,
      explain,
      'DOMAINE',
      domainEmpty
    ),
    children: comparisonDataset(
      'children',
      'Où se situent les différences à l’intérieur d’un domaine ?',
      childPoints,
      explain,
      childGrain,
      childEmpty
    ),
    composition: compositionDataset(evaluated && evaluated.officiel, explain),
    motifs: motifsDataset(evaluated && evaluated.officiel, explain),
    permutations: permutationsDataset(evaluated && evaluated.officiel, domaineCode, explain)
  };
}

function emptyGraphs(period){
  const volumes = emptyVolumes();
  const officiel = {
    volumes,
    percentage: null,
    numerator: 0,
    denominator: 0,
    eventCount: 0,
    analyticStatus: 'NON_EVALUABLE'
  };
  return {
    contract: 'SCOPE-GRAPH-1',
    period: period || null,
    perimeter: { domaine: null, cible: null },
    renderer: 'svg',
    pdfReady: true,
    evolution: evolutionDataset({ officiel: [], legacy: [] }, null),
    domaines: comparisonDataset(
      'domaines',
      'Quels domaines contribuent aux écarts de participation ?',
      ROOT_DOMAINES.map((code) => pointFromPack(code, code, packFromEvents([]), `#/vue/${encodeURIComponent(code)}`)),
      null,
      'DOMAINE',
      null
    ),
    children: comparisonDataset(
      'children',
      'Où se situent les différences à l’intérieur d’un domaine ?',
      [],
      null,
      null,
      'CONTEXTE_SDIS'
    ),
    composition: compositionDataset(officiel, null),
    motifs: motifsDataset(officiel, null),
    permutations: permutationsDataset(officiel, null, null)
  };
}

module.exports = {
  ROOT_DOMAINES,
  FOSPEC_FAMILY,
  familyCodes,
  hasSousDomaines,
  sousDomaineLabel,
  packFromEvents,
  pointFromPack,
  evolutionDataset,
  compositionDataset,
  motifsDataset,
  permutationsDataset,
  buildScopeGraphs,
  emptyGraphs
};

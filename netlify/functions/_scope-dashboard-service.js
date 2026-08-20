'use strict';
/** SCOPE-DASH-1 — agrégat d’accueil. Les KPI officiels viennent exclusivement d’analytics.evaluate.
 *  L’inbox « À traiter » est la projection P0 d’ALERTS-1 (pas de règles parallèles). */
const { DOMAINES } = require('./_scope-schema');
const { parsePeriod } = require('./_scope-period');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { createScopeAlertsService } = require('./_scope-alerts-service');
const { buildScopeGraphs } = require('./_scope-graphs');

function packOfficiel(evaluated){
  const o = evaluated.officiel || {};
  return {
    percentage: o.percentage,
    numerator: o.numerator,
    denominator: o.denominator,
    eventCount: o.eventCount,
    kind: o.kind,
    volumes: o.volumes,
    objective: o.objective,
    gapPct: o.gapPct,
    analyticStatus: o.analyticStatus,
    analyticStatusReason: o.analyticStatusReason,
    objectiveContext: o.objectiveContext
  };
}

function createScopeDashboardService(repo){
  const analytics = createScopeAnalyticsService(repo);
  const alertsService = createScopeAlertsService(repo);

  async function dashboard(query = {}){
    const resolved = Object.assign({}, query);
    const period = parsePeriod(resolved);
    const domaineCode = resolved.domaineCode || resolved.domaine || null;
    const cibleRaw = resolved.cibleId || resolved.cible || null;
    const sdisQuery = {
      from: period.from,
      to: period.to,
      domaine: domaineCode || undefined,
      cible: cibleRaw || undefined
    };
    const evaluated = await analytics.evaluate(sdisQuery);
    const series = await analytics.timeseries(sdisQuery);
    const explain = await analytics.explain(sdisQuery);
    const alertsPayload = await alertsService.listAlerts(resolved);

    const absences = {
      count: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.nonExcuses) || 0),
      events: (evaluated.includedEvents || [])
        .filter((row) => Number(row.volumes && row.volumes.nonExcuses) > 0)
        .map((row) => ({
          evenementId: row.evenementId,
          date: row.date,
          libelle: row.libelle,
          domaine: row.domaine,
          nonExcuses: row.volumes.nonExcuses
        }))
    };

    const domaines = [];
    const cibles = [];
    const cachedByDomaine = new Map();
    const cachedByCible = new Map();
    if(!domaineCode && !cibleRaw){
      for(const domaine of DOMAINES){
        const sub = await analytics.evaluate({ from: period.from, to: period.to, domaine: domaine.code });
        cachedByDomaine.set(domaine.code, sub);
        domaines.push({
          code: domaine.code,
          libelle: domaine.libelle,
          libelleAffiche: domaine.code === 'PR' ? 'PAPR' : domaine.code,
          officiel: packOfficiel(sub)
        });
      }
    } else if(domaineCode && !cibleRaw && typeof repo.listCibles === 'function'){
      const allCibles = await repo.listCibles();
      for(const cible of allCibles.filter((row) => row.domaine_code === domaineCode && row.actif !== false)){
        const sub = await analytics.evaluate({
          from: period.from,
          to: period.to,
          domaine: domaineCode,
          cible: cible.cible_id
        });
        cachedByCible.set(cible.cible_id, sub);
        cibles.push({
          cibleId: cible.cible_id,
          niveauCode: cible.niveau_code,
          libelle: cible.libelle,
          domaineCode: cible.domaine_code,
          officiel: packOfficiel(sub)
        });
      }
    }

    const graphs = await buildScopeGraphs({
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
    });

    const evenements = (evaluated.includedEvents || []).map((row) => ({
      evenementId: row.evenementId,
      date: row.date,
      libelle: row.libelle,
      domaine: row.domaine,
      modeSuivi: row.modeSuivi,
      percentage: row.percentage,
      numerator: row.numerator,
      denominator: row.denominator,
      kind: row.kind
    }));

    const legacyCount = evaluated.legacy ? evaluated.legacy.eventCount : 0;

    return {
      period,
      scope: evaluated.scope,
      analysisGrain: evaluated.analysisGrain,
      officiel: packOfficiel(evaluated),
      legacy: {
        kind: 'LEGACY',
        eventCount: legacyCount,
        points: (evaluated.legacy && evaluated.legacy.points) || [],
        globalKpi: null
      },
      absencesNonExcusees: absences,
      domaines,
      cibles,
      evenements,
      timeseries: {
        officiel: series.officiel,
        legacy: series.legacy
      },
      inbox: alertsPayload.inbox,
      alerts: {
        period: alertsPayload.period,
        today: alertsPayload.today,
        timezone: alertsPayload.timezone,
        counts: alertsPayload.counts,
        alerts: alertsPayload.alerts,
        config: alertsPayload.config
      },
      explain: {
        period: explain.period,
        perimeter: explain.perimeter,
        kind: explain.kind,
        totals: explain.totals,
        exclusions: explain.exclusions,
        includedEvents: explain.includedEvents,
        excludedEvents: explain.excludedEvents,
        objective: explain.objective || evaluated.officiel.objective,
        objectiveSelection: explain.objectiveSelection,
        objectiveContext: explain.objectiveContext,
        analyticStatus: explain.analyticStatus,
        analyticStatusReason: explain.analyticStatusReason,
        gapPct: explain.gapPct
      },
      graphs,
      vigilanceMarginPct: null
    };
  }

  async function graphs(query = {}){
    const dash = await dashboard(query);
    return dash.graphs;
  }

  return { dashboard, graphs };
}

module.exports = { createScopeDashboardService };

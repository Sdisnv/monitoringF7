'use strict';
/** SCOPE-DASH-1 — agrégat d’accueil. Les KPI officiels viennent exclusivement d’analytics.evaluate. */
const { DOMAINES } = require('./_scope-schema');
const { parsePeriod, inPeriod } = require('./_scope-period');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { classifyInboxItem, todayIso } = require('./_scope-inbox');

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

  async function inboxFor(query, period){
    const today = todayIso(query.today);
    const domaine = query.domaineCode || query.domaine || null;
    const cibleId = query.cibleId || null;
    const listed = await repo.listEvenements({
      statut: 'PLANIFIE',
      domaine: domaine || undefined
    });
    const fromYear = period.from.slice(0, 4);
    const toYear = period.to.slice(0, 4);
    const items = [];
    for(const evenement of listed){
      const overdueSameSpan = evenement.statut === 'PLANIFIE'
        && evenement.date < today
        && evenement.date >= `${fromYear}-01-01`
        && evenement.date <= `${toYear}-12-31`;
      if(!inPeriod(evenement.date, period) && !overdueSameSpan){
        continue;
      }
      if(domaine && evenement.domaine_code !== domaine) continue;
      const cibleIds = await repo.listEventCibleIds(evenement.evenement_id);
      if(cibleId && !cibleIds.includes(cibleId)) continue;
      const cibles = [];
      for(const id of cibleIds){
        const cible = await repo.getCible(id);
        if(cible) cibles.push(cible);
      }
      const classified = classifyInboxItem(
        { evenement, cibles },
        {
          today,
          attendus: await repo.listAttendus(evenement.evenement_id),
          participations: await repo.listParticipations(evenement.evenement_id),
          saisie: repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(evenement.evenement_id) : null
        }
      );
      if(classified) items.push(classified);
    }
    items.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.libelle).localeCompare(String(b.libelle)));
    return items;
  }

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
    if(!domaineCode && !cibleRaw){
      for(const domaine of DOMAINES){
        const sub = await analytics.evaluate({ from: period.from, to: period.to, domaine: domaine.code });
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
        cibles.push({
          cibleId: cible.cible_id,
          niveauCode: cible.niveau_code,
          libelle: cible.libelle,
          domaineCode: cible.domaine_code,
          officiel: packOfficiel(sub)
        });
      }
    }

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

    const inbox = await inboxFor(resolved, period);
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
      inbox,
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
      vigilanceMarginPct: null
    };
  }

  return { dashboard };
}

module.exports = { createScopeDashboardService };

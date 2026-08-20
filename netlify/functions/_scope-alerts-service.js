'use strict';
/** SCOPE-ALERTS-1 — orchestration. Source unique des alertes métier. */
const { parsePeriod, inPeriod } = require('./_scope-period');
const { DOMAINES } = require('./_scope-schema');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { HttpError } = require('./_scope-rules');
const {
  ALERTS_CONFIG,
  classifyOperationalAlert,
  toInboxItem,
  isUnderObjective,
  packObjectiveAlert,
  packObjectifAbsent,
  fingerprint,
  CODES
} = require('./_scope-alerts');
const { todayZurichIso } = require('./_scope-calendar');
const { inferAnalysisGrain } = require('./_scope-objectives');

function groupBy(rows, key){
  const map = {};
  for(const row of rows || []){
    const id = row && row[key];
    if(!id) continue;
    if(!map[id]) map[id] = [];
    map[id].push(row);
  }
  return map;
}

async function batchRows(repo, batchName, oneName, ids, mapOne){
  if(!ids.length) return [];
  if(typeof repo[batchName] === 'function') return repo[batchName](ids);
  const all = [];
  for(const id of ids){
    const rows = await repo[oneName](id);
    if(Array.isArray(rows)) all.push(...rows);
    else if(rows) all.push(mapOne ? mapOne(id, rows) : rows);
  }
  return all;
}

function looksLikeUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function resolveCible(repo, query){
  const resolved = Object.assign({}, query || {});
  const raw = resolved.cibleId || resolved.cible || resolved.target || null;
  if(!raw) return resolved;
  if(looksLikeUuid(raw)){
    resolved.cibleId = raw;
    return resolved;
  }
  const text = String(raw);
  const parts = text.split('/');
  if(parts.length === 2 && typeof repo.findCible === 'function'){
    const cible = await repo.findCible(parts[0], parts[1]);
    if(cible) resolved.cibleId = cible.cible_id;
    return resolved;
  }
  const domaine = resolved.domaineCode || resolved.domaine || resolved.domain || null;
  if(domaine && typeof repo.findCible === 'function'){
    const cible = await repo.findCible(domaine, text);
    if(cible) resolved.cibleId = cible.cible_id;
  }
  return resolved;
}

function packOfficiel(evaluated){
  const o = (evaluated && evaluated.officiel) || {};
  return {
    percentage: o.percentage,
    numerator: o.numerator,
    denominator: o.denominator,
    eventCount: o.eventCount,
    objective: o.objective,
    gapPct: o.gapPct,
    analyticStatus: o.analyticStatus,
    analyticStatusReason: o.analyticStatusReason,
    objectiveContext: o.objectiveContext
  };
}

function createScopeAlertsService(repo){
  const analytics = createScopeAnalyticsService(repo);

  async function operationalAlerts(query, period, today){
    const domaine = query.domaineCode || query.domaine || query.domain || null;
    const cibleId = query.cibleId || null;
    const listed = await repo.listEvenements({
      statut: 'PLANIFIE',
      domaine: domaine || undefined
    });
    const fromYear = period.from.slice(0, 4);
    const toYear = period.to.slice(0, 4);
    const candidates = [];
    for(const evenement of listed){
      const overdueSameSpan = evenement.date < today
        && evenement.date >= `${fromYear}-01-01`
        && evenement.date <= `${toYear}-12-31`;
      if(!inPeriod(evenement.date, period) && !overdueSameSpan) continue;
      if(domaine && evenement.domaine_code !== domaine) continue;
      candidates.push(evenement);
    }
    const ids = candidates.map((row) => row.evenement_id);
    const attendusAll = await batchRows(repo, 'listAttendusForEvents', 'listAttendus', ids);
    const participationsAll = await batchRows(repo, 'listParticipationsForEvents', 'listParticipations', ids);
    const saisieAll = await batchRows(repo, 'listQuantitatifSaisiesForEvents', 'getQuantitatifSaisie', ids, (id, row) => Object.assign({ evenement_id: id }, row));
    let ciblesAll = [];
    if(typeof repo.listEventCiblesForEvents === 'function'){
      ciblesAll = await repo.listEventCiblesForEvents(ids);
    } else {
      for(const evenement of candidates){
        const cibleIds = await repo.listEventCibleIds(evenement.evenement_id);
        for(const id of cibleIds){
          const cible = await repo.getCible(id);
          if(cible) ciblesAll.push(Object.assign({ evenement_id: evenement.evenement_id }, cible));
        }
      }
    }
    const attendusBy = groupBy(attendusAll, 'evenement_id');
    const participationsBy = groupBy(participationsAll, 'evenement_id');
    const saisieBy = {};
    for(const row of saisieAll){
      if(row && row.evenement_id) saisieBy[row.evenement_id] = row;
    }
    const ciblesBy = groupBy(ciblesAll, 'evenement_id');

    const alerts = [];
    for(const evenement of candidates){
      const cibles = ciblesBy[evenement.evenement_id] || [];
      if(cibleId && !cibles.some((c) => String(c.cible_id || c.cibleId) === String(cibleId))) continue;
      const alert = classifyOperationalAlert(
        { evenement, cibles },
        {
          today,
          attendus: attendusBy[evenement.evenement_id] || [],
          participations: participationsBy[evenement.evenement_id] || [],
          saisie: saisieBy[evenement.evenement_id] || null
        }
      );
      if(alert) alerts.push(alert);
    }
    return alerts;
  }

  async function objectiveAlerts(query, period){
    const domaineCode = query.domaineCode || query.domaine || query.domain || null;
    const cibleId = query.cibleId || null;
    const grain = inferAnalysisGrain({
      domaine: domaineCode,
      domaineCode,
      cible: query.cible,
      cibleId
    });
    const alerts = [];
    const sdisQuery = {
      from: period.from,
      to: period.to,
      domaine: domaineCode || undefined,
      cible: cibleId || query.cible || undefined
    };

    if(!domaineCode && !cibleId){
      for(const domaine of DOMAINES){
        const sub = await analytics.evaluate({ from: period.from, to: period.to, domaine: domaine.code });
        const officiel = packOfficiel(sub);
        const alert = packObjectiveAlert({
          code: CODES.DOMAINE_SOUS_OBJECTIF,
          grain: 'DOMAINE',
          officiel,
          domainCode: domaine.code,
          libelle: domaine.code === 'PR' ? 'PAPR' : domaine.libelle
        });
        if(alert) alerts.push(alert);
      }
      const globalEval = await analytics.evaluate({ from: period.from, to: period.to });
      const absent = packObjectifAbsent(packOfficiel(globalEval), { grain: 'GLOBAL' });
      if(absent) alerts.push(absent);
      return alerts;
    }

    if(domaineCode && !cibleId){
      const sub = await analytics.evaluate({ from: period.from, to: period.to, domaine: domaineCode });
      const officiel = packOfficiel(sub);
      const domaineMeta = DOMAINES.find((d) => d.code === domaineCode);
      const domainAlert = packObjectiveAlert({
        code: CODES.DOMAINE_SOUS_OBJECTIF,
        grain: 'DOMAINE',
        officiel,
        domainCode: domaineCode,
        libelle: domaineMeta ? (domaineCode === 'PR' ? 'PAPR' : domaineMeta.libelle) : domaineCode
      });
      if(domainAlert) alerts.push(domainAlert);
      const absent = packObjectifAbsent(officiel, { grain: 'DOMAINE', domainCode: domaineCode });
      if(absent) alerts.push(absent);
      if(typeof repo.listCibles === 'function'){
        const allCibles = await repo.listCibles();
        for(const cible of allCibles.filter((row) => row.domaine_code === domaineCode && row.actif !== false)){
          const evalCible = await analytics.evaluate({
            from: period.from,
            to: period.to,
            domaine: domaineCode,
            cible: cible.cible_id
          });
          const cibleAlert = packObjectiveAlert({
            code: CODES.CIBLE_SOUS_OBJECTIF,
            grain: 'CIBLE',
            officiel: packOfficiel(evalCible),
            domainCode: domaineCode,
            targetId: cible.cible_id,
            niveauCode: cible.niveau_code,
            libelle: cible.libelle || `${domaineCode} ${cible.niveau_code}`
          });
          if(cibleAlert) alerts.push(cibleAlert);
        }
      }
      return alerts;
    }

    const evalCible = await analytics.evaluate(sdisQuery);
    const officiel = packOfficiel(evalCible);
    let niveauCode = query.cible && !looksLikeUuid(query.cible) ? String(query.cible) : null;
    let libelle = null;
    if(cibleId && typeof repo.getCible === 'function'){
      const cible = await repo.getCible(cibleId);
      if(cible){
        niveauCode = cible.niveau_code;
        libelle = cible.libelle;
      }
    }
    const cibleAlert = packObjectiveAlert({
      code: CODES.CIBLE_SOUS_OBJECTIF,
      grain: 'CIBLE',
      officiel,
      domainCode: domaineCode,
      targetId: cibleId,
      niveauCode,
      libelle: libelle || (domaineCode && niveauCode ? `${domaineCode} ${niveauCode}` : 'Cible')
    });
    if(cibleAlert) alerts.push(cibleAlert);
    const absent = packObjectifAbsent(officiel, { grain: 'CIBLE', domainCode: domaineCode, targetId: cibleId });
    if(absent) alerts.push(absent);
    return alerts;
  }

  function applyAck(alerts, acks, includeAcknowledged){
    const ackSet = new Set((acks || []).map((row) => row.fingerprint));
    const out = [];
    for(const alert of alerts){
      const acknowledged = ackSet.has(alert.fingerprint);
      const next = Object.assign({}, alert, { acknowledged });
      if(acknowledged && alert.level !== 'P0' && !includeAcknowledged) continue;
      out.push(next);
    }
    return out;
  }

  async function listAlerts(query = {}, claims = null){
    const resolved = await resolveCible(repo, query);
    const period = parsePeriod(resolved);
    const today = resolved.today || todayZurichIso(resolved.now);
    const includeAcknowledged = ['1', 'true', 'oui', 'yes'].includes(String(resolved.includeAcknowledged || '').toLowerCase());
    const levelFilter = resolved.level ? String(resolved.level).toUpperCase() : null;
    const operational = await operationalAlerts(resolved, period, today);
    const objectives = await objectiveAlerts(resolved, period);
    let alerts = operational.concat(objectives);
    if(levelFilter) alerts = alerts.filter((a) => a.level === levelFilter);

    let acks = [];
    const userId = claims && (claims.sub || claims.userId);
    if(userId && typeof repo.listAcquittementsByUser === 'function'){
      acks = await repo.listAcquittementsByUser(userId);
    }
    alerts = applyAck(alerts, acks, includeAcknowledged);
    alerts.sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2 };
      const d = (order[a.level] ?? 9) - (order[b.level] ?? 9);
      if(d) return d;
      return String(a.eventDate || '').localeCompare(String(b.eventDate || ''))
        || String(a.title).localeCompare(String(b.title));
    });

    const counts = {
      total: alerts.length,
      p0: alerts.filter((a) => a.level === 'P0').length,
      p1: alerts.filter((a) => a.level === 'P1').length,
      p2: alerts.filter((a) => a.level === 'P2').length
    };
    return {
      period,
      today,
      timezone: ALERTS_CONFIG.timezone,
      counts,
      alerts,
      config: ALERTS_CONFIG,
      inbox: alerts.map(toInboxItem).filter(Boolean)
    };
  }

  async function acquitter(body, claims){
    const userId = claims && (claims.sub || claims.userId);
    if(!userId) throw new HttpError(401, 'unauthorized', 'Session requise pour acquitter une alerte.');
    const fp = String((body && body.fingerprint) || '').trim();
    if(!fp || fp.split('|').length < 3){
      throw new HttpError(400, 'fingerprint_invalide', 'Le fingerprint d’alerte est obligatoire.');
    }
    const [code, entityType, ...rest] = fp.split('|');
    const entityId = rest.join('|');
    if(typeof repo.upsertAcquittement !== 'function'){
      throw new HttpError(501, 'acquittement_indisponible', 'Le modèle d’acquittement n’est pas disponible.');
    }
    const row = await repo.upsertAcquittement({
      fingerprint: fp,
      code,
      entity_type: entityType,
      entity_id: entityId,
      utilisateur_id: userId,
      commentaire: body && body.commentaire ? String(body.commentaire).slice(0, 500) : null
    });
    return {
      acquittement: {
        fingerprint: row.fingerprint,
        utilisateurId: row.utilisateur_id,
        createdAt: row.created_at,
        commentaire: row.commentaire || null
      },
      hidesAlert: code !== 'ECHU_PLANIFIE'
        && code !== 'NOMINATIF_NON_FIGE'
        && code !== 'SAISIE_NON_RENSEIGNE'
        && code !== 'QUANTITATIF_INCOMPLET'
        && code !== 'CLOTURE_POSSIBLE',
      note: 'Un acquittement P0 n’efface pas l’alerte tant que la cause existe. La résolution est la correction métier.'
    };
  }

  return { listAlerts, acquitter, isUnderObjective, fingerprint };
}

module.exports = { createScopeAlertsService };

'use strict';
/** SCOPE-ALERTS-1 — orchestration. Source unique des alertes métier. */
const { parsePeriod, inPeriod } = require('./_scope-period');
const { DOMAINES } = require('./_scope-schema');
const { MODES, inferModeSuivi } = require('./_scope-analytics');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const { createScopeCycleService } = require('./_scope-cycle-service');
const { HttpError } = require('./_scope-rules');
const {
  ALERTS_CONFIG,
  classifyOperationalAlert,
  toInboxItem,
  isUnderObjective,
  packObjectiveAlert,
  packObjectifAbsent,
  packAlert,
  fingerprint,
  CODES
} = require('./_scope-alerts');
const { todayZurichIso } = require('./_scope-calendar');
const { inferAnalysisGrain } = require('./_scope-objectives');
const { isQualificationEvenement, wantsQualification } = require('./_scope-qualification');
const { filterAttendusEligibleAtDate } = require('./_scope-personnel');

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

function pct(value){
  if(value == null || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toFixed(1).replace('.', ',')} %`;
}

function gapPts(value){
  if(value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} pts`;
}

function personId(row){
  return String((row && (row.personne_id || row.personneId || row.id)) || '');
}

function personDisplay(row){
  return [row && row.grade, row && row.nom, row && row.prenom].filter(Boolean).join(' ') || 'Personne';
}

function personMeta(row){
  return {
    personId: personId(row) || null,
    nip: row && row.nip || null,
    grade: row && row.grade || null,
    nom: row && row.nom || null,
    prenom: row && row.prenom || null
  };
}

function personEligibleByDates(person, date){
  if(!person) return true;
  const day = String(date || '').slice(0, 10);
  const entree = String(person.date_entree || person.dateEntree || '').slice(0, 10);
  const sortie = String(person.date_sortie || person.dateSortie || '').slice(0, 10);
  if(entree && entree > day) return false;
  if(sortie && sortie < day) return false;
  return person.actif !== false || Boolean(entree) || Boolean(sortie);
}

function gradeRank(grade){
  const text = String(grade || '').toLowerCase();
  if(text.includes('cap')) return 10;
  if(text.includes('plt')) return 9;
  if(text.includes('lt')) return 8;
  if(text.includes('sgt chef')) return 7;
  if(text.includes('sgt')) return 6;
  if(text.includes('cpl')) return 5;
  if(text.includes('app')) return 4;
  if(text.includes('sap')) return 3;
  if(text.includes('sdt')) return 2;
  return 1;
}

function alertImpact(alert){
  const md = alert && alert.metadata || {};
  return Math.abs(Number(md.gapPct || 0)) || Number(md.absenceCount || 0) || Number(md.missingCount || 0) || Number(md.openCount || 0) || 0;
}

function createScopeAlertsService(repo){
  const analytics = createScopeAnalyticsService(repo);
  const cycles = createScopeCycleService(repo);

  async function operationalAlerts(query, period, today){
    const domaine = query.domaineCode || query.domaine || query.domain || null;
    const cibleId = query.cibleId || null;
    let listed = await repo.listEvenements({
      statut: 'PLANIFIE',
      domaine: domaine || undefined
    });
    if(!wantsQualification(query)){
      listed = listed.filter((row) => !isQualificationEvenement(row));
    }
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

  async function personUnderObjectiveAlerts(query, period){
    if(!ALERTS_CONFIG.personUnderObjective.enabled || typeof analytics.directoryRates !== 'function') return [];
    if(typeof repo.listPersonnes !== 'function') return [];
    const domainFilter = query.domaineCode || query.domaine || query.domain || null;
    const domains = domainFilter ? [domainFilter] : DOMAINES.map((row) => row.code);
    const people = new Map((await repo.listPersonnes({})).map((row) => [personId(row), row]));
    const alerts = [];
    for(const domainCode of domains){
      const payload = await analytics.directoryRates({
        from: period.from,
        to: period.to,
        domaine: domainCode,
        cible: query.cibleId || query.cible || undefined,
        includeQualification: query.includeQualification,
        include_qualification: query.include_qualification
      });
      for(const [pid, row] of Object.entries(payload.rates || {})){
        if(!row || row.denominator <= 0 || row.percentage == null) continue;
        if(row.volumes && Number(row.volumes.nonRenseignes || 0) > 0) continue;
        if(!row.objective || row.gapPct == null || Number(row.gapPct) >= 0) continue;
        if(row.objectiveContext && row.objectiveContext.homogeneous === false) continue;
        const person = people.get(pid) || { personne_id: pid };
        alerts.push(packAlert({
          code: CODES.PERSONNE_SOUS_OBJECTIF,
          level: 'P1',
          category: 'VIGILANCE_PERSONNE',
          title: personDisplay(person),
          message: 'Participation sous objectif',
          reason: `Participation ${pct(row.percentage)} pour un objectif de ${pct(row.objective.thresholdPct)} (écart ${gapPts(row.gapPct)}).`,
          scope: 'PERSONNE',
          entityType: 'PERSONNE',
          entityId: `${pid}:${domainCode}`,
          domainCode,
          personId: pid,
          action: 'voir-personne',
          actionLabel: 'Ouvrir la fiche',
          actionHref: `#/personnel/${encodeURIComponent(pid)}`,
          metadata: {
            ...personMeta(person),
            vigilanceType: 'SOUS_OBJECTIF',
            percentage: row.percentage,
            thresholdPct: row.objective.thresholdPct,
            gapPct: row.gapPct,
            numerator: row.numerator,
            denominator: row.denominator,
            eventCount: row.eventCount,
            objective: row.objective,
            objectiveContext: row.objectiveContext
          }
        }));
      }
    }
    return alerts;
  }

  async function unexcusedAbsenceAlerts(query, period){
    if(typeof repo.loadAnalyticsBundle !== 'function' || typeof repo.listPersonnes !== 'function') return [];
    const domainFilter = query.domaineCode || query.domaine || query.domain || null;
    const cibleId = query.cibleId || null;
    const bundle = await repo.loadAnalyticsBundle({
      from: period.from,
      to: period.to,
      domaineCode: domainFilter || null,
      cibleId
    });
    const periodes = typeof repo.listAllPeriodes === 'function' ? await repo.listAllPeriodes() : [];
    const periodesByPersonne = new Map();
    for(const row of periodes || []){
      const pid = personId(row);
      if(!periodesByPersonne.has(pid)) periodesByPersonne.set(pid, []);
      periodesByPersonne.get(pid).push(row);
    }
    const people = new Map((await repo.listPersonnes({})).map((row) => [personId(row), row]));
    const byPersonDomain = new Map();
    for(const event of bundle.events || []){
      if(!wantsQualification(query) && isQualificationEvenement(event)) continue;
      if(inferModeSuivi(event) !== MODES.NOMINATIF || event.statut !== 'REALISE') continue;
      if(event.pr_exercise_group_key || event.prExerciseGroupKey) continue;
      const attendus = filterAttendusEligibleAtDate(bundle.attendusByEvent[event.evenement_id] || [], periodesByPersonne, event.date)
        .filter((row) => row.inclus !== false && personEligibleByDates(people.get(personId(row)), event.date));
      const expected = new Set(attendus.map((row) => personId(row)));
      const cibles = bundle.cibleIdsByEvent[event.evenement_id] || event.cible_ids || [];
      for(const part of bundle.participationsByEvent[event.evenement_id] || []){
        if(String(part.role || 'PARTICIPANT').toUpperCase() !== 'PARTICIPANT') continue;
        if(String(part.statut || '').toUpperCase() !== 'ABSENT_NON_EXCUSE') continue;
        const pid = personId(part);
        if(!expected.has(pid)) continue;
        const key = `${pid}:${event.domaine_code}`;
        const row = byPersonDomain.get(key) || { personId: pid, domainCode: event.domaine_code, events: [], cibles: new Set() };
        row.events.push({
          eventId: event.evenement_id,
          date: event.date,
          libelle: event.libelle,
          domaine: event.domaine_code
        });
        for(const cible of cibles) row.cibles.add(String(cible));
        byPersonDomain.set(key, row);
      }
    }
    return [...byPersonDomain.values()].map((row) => {
      const person = people.get(row.personId) || { personne_id: row.personId };
      const count = row.events.length;
      return packAlert({
        code: CODES.PERSONNE_ABSENCE_NON_EXCUSEE,
        level: 'P1',
        category: 'VIGILANCE_PERSONNE',
        title: personDisplay(person),
        message: 'Absence non excusée',
        reason: count === 1 ? '1 absence non excusée constatée sur la période.' : `${count} absences non excusées constatées sur la période.`,
        scope: 'PERSONNE',
        entityType: 'PERSONNE',
        entityId: `${row.personId}:${row.domainCode}:ABSENCES`,
        domainCode: row.domainCode,
        personId: row.personId,
        eventDate: row.events[0] && row.events[0].date || null,
        action: 'voir-personne',
        actionLabel: 'Voir l’historique',
        actionHref: `#/personnel/${encodeURIComponent(row.personId)}`,
        metadata: {
          ...personMeta(person),
          vigilanceType: 'ABSENCE_NON_EXCUSEE',
          absenceCount: count,
          events: row.events,
          cibles: [...row.cibles]
        }
      });
    });
  }

  function cycleOverlapsPeriod(cycle, period){
    const start = String(cycle.date_debut || cycle.dateDebut || cycle.date_fin || cycle.dateFin || '').slice(0, 10);
    const end = String(cycle.date_fin || cycle.dateFin || cycle.date_debut || cycle.dateDebut || '').slice(0, 10);
    if(!start && !end) return !cycle.annee || String(cycle.annee) === period.from.slice(0, 4);
    return (!start || start <= period.to) && (!end || end >= period.from);
  }

  async function cycleIncompleteAlerts(query, period){
    if(typeof repo.listCycles !== 'function') return [];
    const domainFilter = query.domaineCode || query.domaine || query.domain || null;
    if(domainFilter && !['PR', 'PAPR', 'AUTO', 'FOSPEC'].includes(String(domainFilter).toUpperCase())) return [];
    const sameYear = period.from.slice(0, 4) === period.to.slice(0, 4);
    const list = await cycles.listCycles({
      annee: sameYear ? period.from.slice(0, 4) : undefined,
      domaine: domainFilter && String(domainFilter).toUpperCase() !== 'FOSPEC' ? domainFilter : undefined
    });
    const alerts = [];
    for(const cycle of list.cycles || []){
      if(!cycleOverlapsPeriod(cycle, period)) continue;
      const detail = await cycles.getCycle(cycle.cycle_id);
      const pilotage = detail && detail.pilotage || {};
      for(const row of pilotage.individualRows || []){
        if(!row.isPopulation || row.globalState !== 'INCOMPLET') continue;
        const missing = (row.obligations || []).filter((cell) => cell.expected && ['A_RENSEIGNER', 'ABSENT'].includes(cell.status));
        if(!missing.length) continue;
        alerts.push(packAlert({
          code: CODES.CYCLE_INCOMPLET,
          level: 'P1',
          category: 'VIGILANCE_PERSONNE',
          title: [row.grade, row.nom, row.prenom].filter(Boolean).join(' ') || row.nip || 'Personne',
          message: 'Cycle incomplet',
          reason: missing.map((cell) => `${cell.label} ${cell.status === 'ABSENT' ? 'absent' : 'à compléter'}`).join(', '),
          scope: 'CYCLE',
          entityType: 'CYCLE',
          entityId: `${cycle.cycle_id}:${row.personKey || row.personneId || row.nip}`,
          domainCode: cycle.domaine_code || null,
          personId: row.personneId || null,
          action: 'voir-cycle',
          actionLabel: 'Ouvrir le cycle',
          actionHref: `#/cycles/${encodeURIComponent(cycle.cycle_id)}`,
          metadata: {
            personId: row.personneId || null,
            nip: row.nip || null,
            grade: row.grade || null,
            nom: row.nom || null,
            prenom: row.prenom || null,
            vigilanceType: 'CYCLE_INCOMPLET',
            cycleId: cycle.cycle_id,
            cycleLabel: cycle.libelle,
            typeCycle: cycle.type_cycle || cycle.domaine_code,
            missingCount: missing.length,
            missing: missing.map((cell) => ({
              obligationKey: cell.obligationKey,
              label: cell.label,
              status: cell.status,
              eventId: cell.eventId || null
            }))
          }
        }));
      }
    }
    return alerts;
  }

  function markDataQuality(alerts){
    return (alerts || []).map((alert) => {
      if(alert.code !== CODES.SAISIE_NON_RENSEIGNE && alert.code !== CODES.QUANTITATIF_INCOMPLET) return alert;
      return Object.assign({}, alert, {
        category: 'VIGILANCE_DONNEE',
        message: 'Données à compléter',
        metadata: Object.assign({}, alert.metadata || {}, { vigilanceType: 'DONNEES_A_COMPLETER' })
      });
    });
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
    const operational = markDataQuality(await operationalAlerts(resolved, period, today));
    const objectives = await objectiveAlerts(resolved, period);
    const personUnder = await personUnderObjectiveAlerts(resolved, period);
    const absences = await unexcusedAbsenceAlerts(resolved, period);
    const cyclesIncomplete = await cycleIncompleteAlerts(resolved, period);
    let alerts = operational.concat(objectives, personUnder, absences, cyclesIncomplete);
    const typeFilter = resolved.type ? String(resolved.type).toUpperCase() : null;
    const categoryFilter = resolved.category ? String(resolved.category).toUpperCase() : null;
    if(levelFilter) alerts = alerts.filter((a) => a.level === levelFilter);
    if(typeFilter) alerts = alerts.filter((a) => String(a.metadata && a.metadata.vigilanceType || a.code).toUpperCase() === typeFilter);
    if(categoryFilter) alerts = alerts.filter((a) => String(a.category || '').toUpperCase() === categoryFilter);

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
      const impact = alertImpact(b) - alertImpact(a);
      if(impact) return impact;
      const grade = gradeRank((b.metadata || {}).grade) - gradeRank((a.metadata || {}).grade);
      if(grade) return grade;
      return String((a.metadata || {}).nom || a.title).localeCompare(String((b.metadata || {}).nom || b.title), 'fr')
        || String((a.metadata || {}).prenom || '').localeCompare(String((b.metadata || {}).prenom || ''), 'fr')
        || String(a.eventDate || '').localeCompare(String(b.eventDate || ''))
        || String(a.title).localeCompare(String(b.title));
    });

    const counts = {
      total: alerts.length,
      p0: alerts.filter((a) => a.level === 'P0').length,
      p1: alerts.filter((a) => a.level === 'P1').length,
      p2: alerts.filter((a) => a.level === 'P2').length,
      active: alerts.filter((a) => a.level === 'P0' || a.level === 'P1').length,
      people: alerts.filter((a) => a.category === 'VIGILANCE_PERSONNE').length,
      data: alerts.filter((a) => a.category === 'VIGILANCE_DONNEE').length
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

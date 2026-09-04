'use strict';

const { parsePeriod, inPeriod } = require('./_scope-period');
const { safePercentage } = require('./_scope-analytics');
const { filterAttendusEligibleAtDate } = require('./_scope-personnel');
const { resolveObjective, gapAgainst } = require('./_scope-objectives');
const display = require('../../assets/js/scope-personnel-display.js');
const refs = require('../../assets/js/scope-personnel-referentials.js');

const DEFAULT_SUBDIVISIONS = Object.freeze({
  DPS: ['G1', 'C1', 'B1', 'B2'],
  DAP: ['Y1', 'Y2', 'Y3', 'Y4'],
  JSP: ['G1', 'C1', 'B1'],
  PR: ['G1', 'C1', 'B1', 'B2'],
  FOBA: ['1', '2', '3'],
  FOSPEC: ['PR', 'AUTO']
});

const FORMATION_DOMAINES = Object.freeze(['DPS', 'DAP', 'JSP', 'PR', 'AUTO', 'FOBA', 'FOCA', 'FOSPEC']);

const JSP_SITES = Object.freeze([
  { code: 'G1', label: 'JSP G1' },
  { code: 'C1', label: 'JSP C1' },
  { code: 'B1', label: 'JSP B1' }
]);

const DEFAULT_BLOCKS = Object.freeze([
  'synthese', 'participation', 'presents', 'excuses', 'absents', 'dispenses',
  'motifs', 'nominatif', 'surveillance', 'regularite', 'sous_objectif',
  'alertes', 'evenements', 'comparaisons', 'evolution', 'graphiques', 'ecarts'
]);

const MOTIF_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident / maladie',
  ACTIVITE_SCOLAIRE: 'Activité scolaire',
  ACTIVITE_EXTRA_SCOLAIRE: 'Activité extra-scolaire',
  NON_JUSTIFIE: 'Non justifié',
  NON_PRECISE: 'Non précisé (historique)',
  MALADIE: 'Maladie (historique)',
  ACCIDENT: 'Accident (historique)',
  AUTRE: 'Autre (historique)'
});

function clean(value){
  return String(value == null ? '' : value).trim();
}

function pct(num, den){
  return safePercentage(Number(num || 0), Number(den || 0));
}

function emptyCounts(){
  return {
    jeunes: new Set(),
    participants: new Set(),
    eventIds: new Set(),
    expected: 0,
    present: 0,
    excused: 0,
    absent: 0,
    dispensed: 0,
    nonRenseigne: 0
  };
}

function finalizeCounts(row){
  const denominator = Number(row.present || 0) + Number(row.excused || 0) + Number(row.absent || 0);
  const unique = row.participants instanceof Set ? row.participants.size : Number(row.participants || row.jeunes || 0);
  return Object.assign({}, row, {
    participants: unique,
    jeunes: row.jeunes instanceof Set ? row.jeunes.size : Number(row.jeunes || unique || 0),
    exercises: row.eventIds instanceof Set ? row.eventIds.size : Number(row.exercises || 0),
    denominator,
    presenceRate: pct(row.present, denominator),
    excusedRate: pct(row.excused, denominator),
    absentRate: pct(row.absent, denominator)
  });
}

function normalizeSite(raw){
  const text = clean(raw).toUpperCase().replace(/^JSP\s+/, '');
  return JSP_SITES.some((row) => row.code === text) ? text : '';
}

function normalizeDomaine(raw){
  const text = clean(raw).toUpperCase();
  if(text === 'PAPR') return 'PR';
  return text || 'JSP';
}

function normalizePerimeter(raw){
  const text = clean(raw).toUpperCase().replace(/^JSP\s+/, '');
  return text === 'TOUS' || text === 'GLOBAL' ? '' : text;
}

function selectedBlocks(raw){
  if(raw == null || raw === '') return new Set(DEFAULT_BLOCKS);
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const chosen = list.map((item) => clean(item).toLowerCase()).filter(Boolean);
  return new Set(chosen.length ? chosen : DEFAULT_BLOCKS);
}

function statusBucket(statut){
  const code = clean(statut).toUpperCase();
  if(code === 'PRESENT' || code === 'PERMUTATION') return 'present';
  if(code === 'EXCUSE' || code === 'ABSENT_EXCUSE') return 'excused';
  if(code === 'ABSENT' || code === 'NON_EXCUSE' || code === 'ABSENT_NON_EXCUSE') return 'absent';
  if(code === 'DISPENSE') return 'dispensed';
  return 'nonRenseigne';
}

function motifLabel(motif){
  const key = clean(motif).toUpperCase();
  return MOTIF_LABELS[key] || clean(motif);
}

function periodLabel(period){
  if(!period) return '';
  if(period.preset === 'YEAR') return String(period.from || '').slice(0, 4);
  if(period.preset === 'SEMESTER'){
    const semester = String(period.from || '').slice(5, 7) === '07' ? 'S2' : 'S1';
    return `${semester} ${String(period.from || '').slice(0, 4)}`;
  }
  return [period.from, period.to].filter(Boolean).join(' - ');
}

function subdivisionForPersonAt(assignments, date, domaineCode){
  const rows = (assignments || []).filter((row) => {
    const domaine = clean(row.domaine || row.domaine_code || row.domaineCode).toUpperCase();
    if(domaine !== domaineCode) return false;
    const start = clean(row.date_actif || row.dateActif || row.date_debut || row.dateDebut);
    const end = clean(row.date_inactif || row.dateInactif || row.date_fin || row.dateFin);
    const day = clean(date).slice(0, 10);
    if(start && day && start.slice(0, 10) > day) return false;
    if(end && day && end.slice(0, 10) < day) return false;
    return true;
  });
  const hit = rows.find((row) => clean(row.cible || row.niveau_code || row.niveauCode));
  return hit ? clean(hit.cible || hit.niveau_code || hit.niveauCode).toUpperCase() : '';
}

function siteForPersonAt(assignments, date){
  const site = subdivisionForPersonAt(assignments, date, 'JSP');
  return normalizeSite(site);
}

function reportSubdivisionForPersonAt(assignments, date, domaineCode, fallbackSite){
  if(domaineCode === 'JSP') return siteForPersonAt(assignments, date) || normalizeSite(fallbackSite);
  if(domaineCode === 'PR') return subdivisionForPersonAt(assignments, date, 'DPS') || subdivisionForPersonAt(assignments, date, 'PR') || fallbackSite;
  return subdivisionForPersonAt(assignments, date, domaineCode) || fallbackSite;
}

function compareName(a, b){
  return `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr', { sensitivity: 'base', numeric: true });
}

function compareInstitutional(a, b){
  return refs.compareGrades(b.grade, a.grade) || compareName(a, b);
}

function displayPerson(person){
  return {
    personneId: person.personne_id || person.personneId,
    nip: person.nip || '',
    grade: person.grade || '',
    nom: person.nom || '',
    prenom: person.prenom || ''
  };
}

async function peopleById(repo){
  const rows = typeof repo.listPersonnes === 'function' ? await repo.listPersonnes({}) : [];
  return new Map((rows || []).map((row) => [String(row.personne_id || row.personneId), row]));
}

async function assignmentsByPerson(repo){
  const rows = typeof repo.listAffectations === 'function' ? await repo.listAffectations({}) : [];
  const byPerson = new Map();
  for(const row of rows || []){
    const pid = String(row.personne_id || row.personneId || '');
    if(!pid) continue;
    if(!byPerson.has(pid)) byPerson.set(pid, []);
    byPerson.get(pid).push(row);
  }
  return byPerson;
}

function eventSubdivision(event, cibles, domaineCode){
  if(domaineCode === 'FOSPEC'){
    const eventDomain = normalizeDomaine(event.domaine_code || event.domaineCode);
    if(eventDomain === 'PR' || eventDomain === 'AUTO') return eventDomain;
  }
  const hit = (cibles || []).find((row) => clean(row.domaine_code || row.domaineCode).toUpperCase() === domaineCode
    && clean(row.niveau_code || row.niveauCode || row.cible));
  return hit ? clean(hit.niveau_code || hit.niveauCode || hit.cible).toUpperCase() : '';
}

function graphPayload(siteRows, exercises, motifs){
  return {
    evolution: exercises.map((row) => ({
      label: row.date,
      value: row.presenceRate,
      date: row.date,
      exercise: row.libelle
    })),
    sites: siteRows.map((row) => ({
      label: row.site,
      presents: row.present,
      excuses: row.excused,
      absents: row.absent,
      taux: row.presenceRate
    })),
    motifs: motifs.map((row) => ({
      label: row.motif,
      value: row.count,
      percentage: row.share
    }))
  };
}

async function subdivisionsFor(repo, domaineCode){
  const cibles = typeof repo.listCibles === 'function' ? await repo.listCibles() : [];
  if(domaineCode === 'PR'){
    const rows = (cibles || [])
      .filter((row) => clean(row.domaine_code || row.domaineCode).toUpperCase() === 'DPS')
      .map((row) => ({
        code: clean(row.niveau_code || row.niveauCode).toUpperCase(),
        label: `DPS ${clean(row.niveau_code || row.niveauCode).toUpperCase()}`,
        cibleId: row.cible_id || row.cibleId
      }))
      .filter((row) => row.code && row.code !== 'GEN');
    const byCode = new Map(rows.map((row) => [row.code, row]));
    return DEFAULT_SUBDIVISIONS.PR.map((code) => byCode.get(code) || { code, label: `DPS ${code}`, cibleId: null });
  }
  if(domaineCode === 'FOSPEC'){
    return DEFAULT_SUBDIVISIONS.FOSPEC.map((code) => ({ code, label: code, cibleId: null }));
  }
  const rows = (cibles || [])
    .filter((row) => clean(row.domaine_code || row.domaineCode).toUpperCase() === domaineCode)
    .map((row) => ({
      code: clean(row.niveau_code || row.niveauCode).toUpperCase(),
      label: `${domaineCode} ${clean(row.niveau_code || row.niveauCode).toUpperCase()}`,
      cibleId: row.cible_id || row.cibleId
    }))
    .filter((row) => row.code && row.code !== 'GEN');
  const order = DEFAULT_SUBDIVISIONS[domaineCode] || [];
  if(order.length){
    const byCode = new Map(rows.map((row) => [row.code, row]));
    return order.map((code) => byCode.get(code) || { code, label: `${domaineCode} ${code}`, cibleId: null });
  }
  return rows;
}

function personKey(person, personneId){
  return String(person.nip || personneId);
}

function objectiveFor({ objectives, date, domaineCode, cibleId }){
  return resolveObjective({
    objectives,
    date,
    domaineCode,
    cibleId,
    analysisGrain: cibleId ? 'CIBLE' : 'DOMAINE'
  });
}

function eventDomainsFor(domaineCode){
  if(domaineCode === 'FOSPEC') return new Set(['FOSPEC', 'PR', 'AUTO']);
  return new Set([domaineCode]);
}

function domaineLabel(code){
  const canon = normalizeDomaine(code);
  if(canon === 'PR') return 'PR/PAPR';
  return canon;
}

function emptyReport({ domaineCode, period, blocks }){
  const kpis = finalizeCounts(Object.assign({ site: 'Tous', code: 'TOUS' }, emptyCounts()));
  return {
    kind: 'PARTICIPATION',
    title: 'RAPPORT DE PARTICIPATION',
    subtitle: `Participation — ${periodLabel(period)}`,
    period,
    domaine: domaineCode,
    perimeter: '',
    perimeterLabel: 'Global du domaine',
    siteFilter: 'TOUS',
    siteLabel: 'Global du domaine',
    blocks: [...blocks],
    kpis,
    siteRows: [],
    persons: [],
    watchlist: [],
    regulars: [],
    underObjective: [],
    alerts: [],
    exercises: [],
    motifs: [],
    details: [],
    graphs: graphPayload([], [], []),
    objective: null,
    objectiveLabel: 'Objectif non défini',
    exclusions: { annules: 0, nonRealises: 0, monitors: 0 },
    source: 'scope_evenements + scope_attendus + scope_participations + scope_affectations'
  };
}

function createScopeParticipationReportingService(repo){
  async function report(query = {}){
    const period = parsePeriod(query);
    const domaineCode = normalizeDomaine(query.domaine || query.domaineCode || 'JSP');
    const acceptedDomains = eventDomainsFor(domaineCode);
    const blocks = selectedBlocks(query.blocks);
    const wantedRaw = normalizePerimeter(query.site || query.perimeter || query.cible || query.niveau);
    const wantedPerimeter = domaineCode === 'JSP' ? normalizeSite(wantedRaw) : wantedRaw;
    const siteFilter = wantedPerimeter || 'TOUS';
    const [people, assignments, eventsRaw] = await Promise.all([
      peopleById(repo),
      assignmentsByPerson(repo),
      domaineCode === 'FOSPEC'
        ? repo.listEvenements({ from: period.from, to: period.to })
        : repo.listEvenements({ domaine: domaineCode, from: period.from, to: period.to })
    ]);
    const countableEvents = (eventsRaw || [])
      .filter((event) => acceptedDomains.has(normalizeDomaine(event.domaine_code || event.domaineCode)))
      .filter((event) => inPeriod(event.date, period))
      .filter((event) => clean(event.statut).toUpperCase() === 'REALISE');
    const ids = countableEvents.map((event) => event.evenement_id || event.evenementId).filter(Boolean);
    const [allCiblesRows, attendusRows, participationsRows, periodesRows, subdivisions, objectives] = await Promise.all([
      typeof repo.listEventCiblesForEvents === 'function' ? repo.listEventCiblesForEvents(ids) : [],
      repo.listAttendusForEvents(ids),
      repo.listParticipationsForEvents(ids),
      typeof repo.listAllPeriodes === 'function' ? repo.listAllPeriodes() : [],
      subdivisionsFor(repo, domaineCode),
      typeof repo.listObjectifs === 'function' ? repo.listObjectifs({ actif: true }) : []
    ]);
    const ciblesByEvent = new Map();
    for(const row of allCiblesRows || []){
      const eid = String(row.evenement_id || row.evenementId || '');
      if(!ciblesByEvent.has(eid)) ciblesByEvent.set(eid, []);
      ciblesByEvent.get(eid).push(row);
    }
    const attendusByEvent = new Map();
    for(const row of attendusRows || []){
      const eid = String(row.evenement_id || row.evenementId || '');
      if(!attendusByEvent.has(eid)) attendusByEvent.set(eid, []);
      attendusByEvent.get(eid).push(row);
    }
    const partsByEventPerson = new Map();
    for(const row of participationsRows || []){
      partsByEventPerson.set(`${row.evenement_id || row.evenementId}::${row.personne_id || row.personneId}`, row);
    }
    const periodesByPersonne = new Map();
    for(const row of periodesRows || []){
      const pid = String(row.personne_id || row.personneId || '');
      if(!periodesByPersonne.has(pid)) periodesByPersonne.set(pid, []);
      periodesByPersonne.get(pid).push(row);
    }

    const siteCounts = new Map(subdivisions.map((site) => [site.code, Object.assign({ site: site.label, code: site.code, cibleId: site.cibleId }, emptyCounts())]));
    const global = Object.assign({ site: 'Global du domaine', code: 'TOUS' }, emptyCounts());
    const personRows = new Map();
    const detailRows = [];
    const participationFacts = [];
    const motifCounts = new Map();
    const exerciseMap = new Map();
    let monitorRowsIgnored = 0;
    const objective = objectiveFor({
      objectives,
      date: period.to,
      domaineCode,
      cibleId: (subdivisions.find((row) => row.code === wantedPerimeter) || {}).cibleId || null
    });

    for(const event of countableEvents){
      const eventId = String(event.evenement_id || event.evenementId);
      const cibles = ciblesByEvent.get(eventId) || [];
      const fallbackSite = eventSubdivision(event, cibles, domaineCode);
      const rawAttendus = attendusByEvent.get(eventId) || [];
      const eligible = filterAttendusEligibleAtDate(rawAttendus, periodesByPersonne, event.date).filter((row) => row.inclus !== false);
      for(const attendu of eligible){
        const personneId = String(attendu.personne_id || attendu.personneId);
        const person = people.get(personneId);
        if(!person) continue;
        const personAssignments = assignments.get(personneId) || [];
        if(domaineCode === 'JSP'){
          const role = display.classifyJspRole(person, personAssignments, event.date);
          if(role !== 'JEUNE'){
            if(role === 'MONITEUR') monitorRowsIgnored += 1;
            continue;
          }
        }
        const subdivision = reportSubdivisionForPersonAt(personAssignments, event.date, domaineCode, fallbackSite);
        if(!subdivision) continue;
        if(wantedPerimeter && subdivision !== wantedPerimeter) continue;
        const part = partsByEventPerson.get(`${eventId}::${personneId}`) || {};
        const bucket = statusBucket(part.statut);
        const pKey = personKey(person, personneId);
        participationFacts.push({ key: `${eventId}::${pKey}`, eventId, pKey, bucket });
        const subInfo = subdivisions.find((row) => row.code === subdivision) || { code: subdivision, label: `${domaineCode} ${subdivision}`, cibleId: null };
        if(!siteCounts.has(subdivision)) siteCounts.set(subdivision, Object.assign({ site: subInfo.label, code: subInfo.code, cibleId: subInfo.cibleId }, emptyCounts()));
        if(!personRows.has(pKey)){
          personRows.set(pKey, Object.assign(displayPerson(person), {
            site: subInfo.label,
            perimeter: subInfo.label,
            cibleId: subInfo.cibleId,
            expected: 0,
            present: 0,
            excused: 0,
            absent: 0,
            dispensed: 0,
            nonRenseigne: 0
          }));
        }
        const row = personRows.get(pKey);
        row.expected += 1;
        row[bucket] += 1;
        row.site = row.site || subInfo.label;
        const siteRow = siteCounts.get(subdivision);
        siteRow.jeunes.add(pKey);
        siteRow.participants.add(pKey);
        siteRow.eventIds.add(eventId);
        siteRow.expected += 1;
        siteRow[bucket] += 1;
        global.jeunes.add(pKey);
        global.participants.add(pKey);
        global.eventIds.add(eventId);
        global.expected += 1;
        global[bucket] += 1;
        const exKey = `${eventId}::${subdivision}`;
        if(!exerciseMap.has(exKey)){
          exerciseMap.set(exKey, Object.assign({
            evenementId: eventId,
            date: event.date,
            libelle: event.libelle || `Exercice ${domaineCode}`,
            domaine: domaineCode,
            site: subInfo.label,
            perimeter: subInfo.label,
            cibleId: subInfo.cibleId
          }, emptyCounts()));
        }
        const ex = exerciseMap.get(exKey);
        ex.jeunes.add(pKey);
        ex.participants.add(pKey);
        ex.eventIds.add(eventId);
        ex.expected += 1;
        ex[bucket] += 1;
        if(bucket === 'excused' || bucket === 'absent'){
          const motif = bucket === 'excused' ? motifLabel(part.motif_absence) : 'Absence sans excuse enregistrée';
          detailRows.push(Object.assign(displayPerson(person), {
            date: event.date,
            evenementId: eventId,
            exercice: event.libelle || `Exercice ${domaineCode}`,
            site: subInfo.label,
            perimeter: subInfo.label,
            statut: bucket === 'excused' ? 'Excusé' : 'Absent',
            motif
          }));
          if(bucket === 'excused'){
            const key = motif || 'Non précisé';
            motifCounts.set(key, (motifCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    const siteRows = [...siteCounts.values()].map((row) => finalizeCounts(row));
    const kpis = finalizeCounts(global);
    const persons = [...personRows.values()].map((row) => {
      const done = finalizeCounts(Object.assign({ jeunes: 1, participants: 1, eventIds: new Set() }, row));
      const resolved = objectiveFor({ objectives, date: period.to, domaineCode, cibleId: done.cibleId || null });
      const gap = gapAgainst(done.presenceRate, resolved, { homogeneous: true });
      return Object.assign(done, {
        objective: resolved,
        objectivePct: resolved && resolved.thresholdPct != null ? resolved.thresholdPct : null,
        objectiveGap: gap,
        underObjective: gap != null ? gap < 0 : false
      });
    }).sort(compareInstitutional);
    const watchlist = persons.slice().sort((a, b) => {
      const absenceA = Number(a.excused || 0) + Number(a.absent || 0);
      const absenceB = Number(b.excused || 0) + Number(b.absent || 0);
      return Number(b.absent || 0) - Number(a.absent || 0)
        || Number(b.excused || 0) - Number(a.excused || 0)
        || Number(a.objectiveGap ?? 0) - Number(b.objectiveGap ?? 0)
        || compareInstitutional(a, b);
    }).map((row) => Object.assign({}, row, {
      totalAbsences: Number(row.excused || 0) + Number(row.absent || 0),
      absenceRate: pct(Number(row.excused || 0) + Number(row.absent || 0), row.expected)
    }));
    const regulars = persons.slice().sort((a, b) => {
      return Number(b.presenceRate || 0) - Number(a.presenceRate || 0)
        || Number(b.present || 0) - Number(a.present || 0)
        || Number(b.expected || 0) - Number(a.expected || 0)
        || compareInstitutional(a, b);
    });
    const underObjective = persons.filter((row) => row.underObjective);
    const alerts = watchlist.filter((row) => row.absent > 0 || row.underObjective).map((row) => ({
      personneId: row.personneId,
      nip: row.nip,
      grade: row.grade,
      nom: row.nom,
      prenom: row.prenom,
      perimeter: row.perimeter || row.site,
      cause: row.underObjective && row.absent > 0 ? 'Sous objectif et absences non excusées'
        : row.underObjective ? 'Sous objectif'
          : 'Absences non excusées',
      value: row.underObjective ? row.presenceRate : row.absent,
      objective: row.objectivePct,
      gap: row.objectiveGap
    }));
    const exercises = [...exerciseMap.values()].map((row) => {
      const done = finalizeCounts(row);
      const resolved = objectiveFor({ objectives, date: done.date || period.to, domaineCode, cibleId: done.cibleId || null });
      const objectiveGap = gapAgainst(done.presenceRate, resolved, { homogeneous: true });
      return Object.assign(done, {
        gap: Number(done.present || 0) - Number(done.expected || 0),
        objective: resolved,
        objectivePct: resolved && resolved.thresholdPct != null ? resolved.thresholdPct : null,
        objectiveGap,
        underObjective: objectiveGap != null ? objectiveGap < 0 : false
      });
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.site).localeCompare(String(b.site)));
    const eventsUnderObjective = exercises.filter((row) => row.underObjective);
    const excuseTotal = [...motifCounts.values()].reduce((sum, n) => sum + n, 0);
    const motifs = [...motifCounts.entries()].map(([motif, count]) => ({
      motif,
      count,
      share: pct(count, excuseTotal)
    })).sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || String(a.motif).localeCompare(String(b.motif), 'fr'));

    return {
      kind: 'PARTICIPATION',
      title: 'RAPPORT DE PARTICIPATION',
      subtitle: `Participation — ${periodLabel(period)}`,
      period,
      domaine: domaineCode,
      perimeter: wantedPerimeter || '',
      perimeterLabel: wantedPerimeter ? ((subdivisions.find((row) => row.code === wantedPerimeter) || {}).label || `${domaineCode} ${wantedPerimeter}`) : 'Global du domaine',
      siteFilter,
      siteLabel: wantedPerimeter ? ((subdivisions.find((row) => row.code === wantedPerimeter) || {}).label || `${domaineCode} ${wantedPerimeter}`) : (domaineCode === 'JSP' ? 'Tous les sites' : 'Global du domaine'),
      sites: subdivisions,
      blocks: [...blocks],
      kpis,
      siteRows,
      persons,
      watchlist,
      regulars,
      underObjective,
      alerts,
      eventsUnderObjective,
      exercises,
      motifs,
      details: detailRows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || compareName(a, b)),
      participationFacts,
      graphs: graphPayload(siteRows, exercises, motifs),
      objective,
      objectiveLabel: objective ? `${objective.thresholdPct} %` : 'Objectif non défini',
      exclusions: {
        annules: (eventsRaw || []).filter((event) => clean(event.statut).toUpperCase() === 'ANNULE').length,
        nonRealises: (eventsRaw || []).filter((event) => clean(event.statut).toUpperCase() !== 'REALISE' && clean(event.statut).toUpperCase() !== 'ANNULE').length,
        monitors: monitorRowsIgnored
      },
      source: 'scope_evenements + scope_attendus + scope_participations + scope_affectations'
    };
  }

  async function formationReport(query = {}){
    const period = parsePeriod(query);
    const blocks = selectedBlocks(query.blocks);
    const reports = [];
    for(const code of FORMATION_DOMAINES){
      const item = await report(Object.assign({}, query, { domaine: code, perimeter: '', site: '', blocks: [...blocks].join(',') }));
      if((item.kpis && (item.kpis.expected || item.kpis.exercises || item.kpis.participants)) || (item.siteRows || []).some((row) => row.expected)){
        reports.push(item);
      }
    }
    const global = emptyCounts();
    const eventIds = new Set();
    const people = new Set();
    const facts = new Map();
    const domainRows = reports.map((item) => {
      const k = item.kpis || {};
      for(const row of item.exercises || []) if(row.evenementId) eventIds.add(String(row.evenementId));
      for(const row of item.persons || []) if(row.nip || row.personneId) people.add(String(row.nip || row.personneId));
      for(const fact of item.participationFacts || []) if(fact && fact.key && !facts.has(fact.key)) facts.set(fact.key, fact);
      const gap = gapAgainst(k.presenceRate, item.objective, { homogeneous: true });
      return {
        domaine: item.domaine,
        label: domaineLabel(item.domaine),
        participants: k.participants || k.jeunes || 0,
        exercises: k.exercises || 0,
        expected: k.expected || 0,
        present: k.present || 0,
        excused: k.excused || 0,
        absent: k.absent || 0,
        presenceRate: k.presenceRate,
        objectivePct: item.objective && item.objective.thresholdPct != null ? item.objective.thresholdPct : null,
        objectiveGap: gap,
        underObjective: gap != null ? gap < 0 : false,
        status: gap == null ? 'Objectif non défini' : gap < 0 ? 'Sous objectif' : 'Objectif atteint'
      };
    });
    for(const fact of facts.values()){
      global.expected += 1;
      global[fact.bucket] += 1;
    }
    global.participants = people;
    global.jeunes = people;
    global.eventIds = eventIds;
    const kpis = finalizeCounts(global);
    const peopleToWatch = reports.flatMap((item) => (item.watchlist || []).filter((row) => row.absent > 0 || row.underObjective).slice(0, 12).map((row) => Object.assign({}, row, { domaine: item.domaine, domaineLabel: domaineLabel(item.domaine) })))
      .sort((a, b) => Number(b.absent || 0) - Number(a.absent || 0) || Number(a.objectiveGap ?? 0) - Number(b.objectiveGap ?? 0) || compareInstitutional(a, b));
    const eventsToWatch = reports.flatMap((item) => (item.eventsUnderObjective || []).map((row) => Object.assign({}, row, { domaine: item.domaine, domaineLabel: domaineLabel(item.domaine) })))
      .sort((a, b) => Number(a.objectiveGap ?? 0) - Number(b.objectiveGap ?? 0) || String(a.date).localeCompare(String(b.date)));
    const alerts = [
      ...domainRows.filter((row) => row.underObjective).map((row) => ({ type: 'Domaine sous objectif', label: row.label, value: row.presenceRate, objective: row.objectivePct, gap: row.objectiveGap })),
      ...eventsToWatch.slice(0, 12).map((row) => ({ type: 'Événement sous objectif', label: `${row.domaineLabel} · ${row.libelle}`, value: row.presenceRate, objective: row.objectivePct, gap: row.objectiveGap })),
      ...peopleToWatch.slice(0, 12).map((row) => ({ type: row.absent > 0 ? 'Absence non excusée' : 'Personne sous objectif', label: [row.domaineLabel, row.grade, row.prenom, row.nom].filter(Boolean).join(' · '), value: row.underObjective ? row.presenceRate : row.absent, objective: row.objectivePct, gap: row.objectiveGap }))
    ];
    const positiveDomains = domainRows.filter((row) => row.objectiveGap != null && row.objectiveGap >= 0);
    return {
      kind: 'FORMATION',
      title: 'RAPPORT GLOBAL FORMATION',
      subtitle: `Formation — ${periodLabel(period)}`,
      period,
      blocks: [...blocks],
      kpis: Object.assign(kpis, {
        domainsUnderObjective: domainRows.filter((row) => row.underObjective).length,
        eventsUnderObjective: eventsToWatch.length,
        peopleUnderObjective: peopleToWatch.filter((row) => row.underObjective).length
      }),
      domainRows,
      reports,
      alerts,
      peopleToWatch,
      eventsToWatch,
      positiveDomains,
      graphs: {
        evolution: reports.flatMap((item) => (item.graphs && item.graphs.evolution || []).map((point) => Object.assign({}, point, { domaine: item.domaine, label: `${domaineLabel(item.domaine)} ${point.label || point.date || ''}` }))),
        domains: domainRows.map((row) => ({ label: row.label, taux: row.presenceRate, objectif: row.objectivePct }))
      },
      source: 'moteur reporting participation SCOPE agrégé par domaine'
    };
  }

  return { report, formationReport };
}

function createScopeJspReportingService(repo){
  const service = createScopeParticipationReportingService(repo);
  return {
    report(query = {}){
      return service.report(Object.assign({}, query, { domaine: 'JSP' }));
    }
  };
}

module.exports = {
  JSP_SITES,
  DEFAULT_BLOCKS,
  FORMATION_DOMAINES,
  createScopeParticipationReportingService,
  createScopeJspReportingService
};
